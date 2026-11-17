import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { useEnemyStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { rollDay } from '@/game/dayRollover';
import { dragonAir } from '@/game/dragonAir';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig, PlacedBuilding, Villager } from '@/game/types';
import { raidDirector } from './raidDirector';
import { sideName, sidesNamed } from './approach';
import { RAID_WARNING_SECONDS, RAIDS_PER_DAY, raidChance, raidDue, warningLeadTime } from './raidTiming';
import { raidActive, raidCooldown, raidForce, raidLost, raidPlan } from './state';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const HOURS = [...Array(24).keys()];
const wall = (id: string, x: number, o: Partial<PlacedBuilding> = {}): PlacedBuilding => ({ id, type: 'wall', x, z: 40, rot: 0, built: 1, ...o });
const established = (): PlacedBuilding[] => [0, 1, 2, 3].map((i) => wall('w' + i, 30 + i * 4));
const tower = (id: string, o: Partial<PlacedBuilding> = {}): PlacedBuilding => ({ id, type: 'tower', x: -30, z: -30, rot: 0, built: 1, ...o });
const defender = (id: string, stationId: string | null): Villager => ({ ...game().villagers[0], id, name: id, job: 'defender', stationId } as Villager);

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999); // no ram, no ladder, no Armory drop
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: () => {} } as never);
});
afterEach(() => { vi.restoreAllMocks(); dragonAir.busy = false; });

describe("the hour's odds of a raid", () => {
  it('any hour may bring one; dusk most, the night more than the day, and the curve averages at most about one a day', () => {
    const p = HOURS.map((h) => raidChance(h));
    expect(p.every((c) => c > 0)).toBe(true);
    expect(Math.max(...p)).toBe(raidChance(18));
    for (const night of [0, 2, 21, 23]) for (const day of [8, 10, 12, 14]) expect(raidChance(night)).toBeGreaterThan(raidChance(day));
    const perDay = p.reduce((a, c) => a + c, 0);
    expect(perDay).toBeCloseTo(RAIDS_PER_DAY, 6);
    expect(perDay).toBeLessThanOrEqual(1);
  });

  it("pressure scales the whole curve (G-15a's hideouts)", () => {
    for (const h of HOURS) expect(raidChance(h, 2)).toBeCloseTo(2 * raidChance(h), 9);
  });

  it("is the day's: the same day and hour answer the same, and days differ", () => {
    const draw = (day: number) => HOURS.map((h) => raidDue(day, h));
    expect(draw(5)).toEqual(draw(5));
    const days = [...Array(40).keys()].map((d) => draw(d).join());
    expect(new Set(days).size).toBeGreaterThan(5);
  });
});

describe("the watch's call", () => {
  it('names a side by the compass, north up the map (−z), each point once', () => {
    const deg = (d: number) => (d * Math.PI) / 180;
    expect([0, 90, 180, -90, 45, 135].map((d) => sideName(deg(d)))).toEqual(['east', 'south', 'west', 'north', 'south-east', 'south-west']);
    expect(sidesNamed([deg(101), deg(176), deg(26)])).toBe('the south, the west and the south-east');
    expect(sidesNamed([deg(90), deg(95)])).toBe('the south');
    expect(sidesNamed([deg(90), deg(180)])).toBe('the south and the west');
  });
});

describe('the warning a raid gives', () => {
  const st = (o: Partial<Parameters<typeof warningLeadTime>[0]>) => ({ buildings: [], villagers: [], keep: null, sites: [], ...o });

  it('thirty seconds, with no watch kept', () => {
    expect(warningLeadTime(st({}))).toBe(RAID_WARNING_SECONDS);
    expect(RAID_WARNING_SECONDS).toBeGreaterThanOrEqual(30);
  });

  it('longer for a finished Watch Tower with a defender posted on it — not one going up, empty, or kept from elsewhere', () => {
    expect(warningLeadTime(st({ buildings: [tower('t')], villagers: [defender('d', 't')] }))).toBe(45);
    expect(warningLeadTime(st({ buildings: [tower('t', { built: 0.5 })], villagers: [defender('d', 't')] }))).toBe(30);
    expect(warningLeadTime(st({ buildings: [tower('t')], villagers: [defender('d', null)] }))).toBe(30);
    expect(warningLeadTime(st({ buildings: [tower('t')], villagers: [{ ...defender('d', 't'), job: 'farmer' } as Villager] }))).toBe(30);
    expect(warningLeadTime(st({ buildings: [tower('t', { world: 'template-04' })], villagers: [defender('d', 't')] }))).toBe(30);
    expect(warningLeadTime(st({ buildings: [tower('t', { world: 'template-04' })], villagers: [defender('d', 't')] }), 'template-04')).toBe(45);
  });

  it("and for a keep's Corner Turret with a defender on it; a minute at the most", () => {
    const keep = { x: 0, z: 0, parts: { nw: 'corner_turret', ne: 'corner_block', se: 'corner_turret' }, built: { nw: 1, ne: 1, se: 0.4 } } as never;
    expect(warningLeadTime(st({ keep, villagers: [defender('a', 'keep:nw')] }))).toBe(45);
    expect(warningLeadTime(st({ keep, villagers: [defender('a', 'keep:ne'), defender('b', 'keep:se')] }))).toBe(30);
    const three = [tower('t1'), tower('t2')];
    expect(warningLeadTime(st({ keep, buildings: three, villagers: [defender('a', 'keep:nw'), defender('b', 't1'), defender('c', 't2')] }))).toBe(60);
  });
});

/** Ten days of the raid director at 1 Hz, as Enemies.tsx's frame runs it, on the default 12-minute day from midnight
 *  of day 0: the clock turned with it (rollDay at midnight, as DayNight.tsx does), each raid's raiders cleared a minute
 *  after they come (the raid then beaten back), and `busy(t)` a major event of another's under way at second `t`. */
function sweep(busy: (t: number) => boolean = () => false, setup: () => void = () => {}) {
  game().newGame(HERO);
  useGameStore.setState({ buildings: established(), unlocks: [...game().unlocks, 'mining'], notify: () => {} } as never);
  setup();
  worldEnv.dayLength = 720;
  worldEnv.dayCount = 0;
  worldEnv.time = 0;
  const warned: { t: number; day: number; hour: number; time: number; lead: number; cooldownBefore: number }[] = [];
  const came: number[] = [];
  const sidesAfterEnd: number[][] = [];
  let clearAt = -1;
  for (let t = 0; t < 10 * 720; t++) {
    dragonAir.busy = busy(t);
    const cooldownBefore = raidCooldown.current;
    const [wasIncoming, wasActive] = [raidPlan.incoming, raidActive.current];
    raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
    if (!wasIncoming && raidPlan.incoming > 0) {
      warned.push({ t, day: worldEnv.dayCount, hour: Math.floor(worldEnv.time * 24), time: worldEnv.time, lead: raidPlan.incoming, cooldownBefore });
    }
    if (!wasActive && raidActive.current) { came.push(t); clearAt = t + 60; }
    if (wasActive && !raidActive.current) sidesAfterEnd.push([...raidPlan.sides]);
    if (t === clearAt) useEnemyStore.getState().clear();
    const next = (worldEnv.time + 1 / worldEnv.dayLength) % 1;
    if (next < worldEnv.time) rollDay();
    worldEnv.time = next;
  }
  dragonAir.busy = false;
  return { warned, came, sidesAfterEnd };
}

describe('ten days of raids, seeded from the days', () => {
  it('come at other hours than dusk, after a warning of at least thirty seconds, never inside the cooldown, about one a day at most', () => {
    const { warned, came, sidesAfterEnd } = sweep();
    expect(warned.length).toBeGreaterThanOrEqual(3);
    expect(warned.length).toBeLessThanOrEqual(10);
    // the old window was 0.70-0.78 and nothing else
    expect(warned.some((w) => w.time < 0.7 || w.time > 0.78)).toBe(true);
    for (const w of warned) expect(w.cooldownBefore).toBe(0);
    expect(came).toHaveLength(warned.length);
    came.forEach((t, i) => {
      expect(warned[i].lead).toBeGreaterThanOrEqual(RAID_WARNING_SECONDS);
      expect(t - warned[i].t).toBeGreaterThanOrEqual(RAID_WARNING_SECONDS);
      expect(t - warned[i].t).toBe(warned[i].lead);
    });
    // a raid that is over leaves no sides for the minimap's arrow
    expect(sidesAfterEnd).toHaveLength(warned.length);
    for (const s of sidesAfterEnd) expect(s).toEqual([]);
    if (process.env.KK_SWEEP) console.log(JSON.stringify(warned.map((w) => ({ day: w.day, hour: w.hour, time: Math.round(w.time * 1000) / 1000 }))));
  });

  it('none sets out while another major event is on: with the dragon over each of those raids, they wait or do not come', () => {
    const free = sweep().warned;
    const windows = free.map((w) => [w.t - 40, w.t + 40]);
    const busy = (t: number) => windows.some(([a, b]) => t >= a && t <= b);
    const held = sweep(busy).warned;
    for (const w of held) expect(busy(w.t)).toBe(false);
    expect(held.map((w) => w.t)).not.toEqual(free.map((w) => w.t));
  });

  it('a manned tower lengthens every warning', () => {
    const { warned, came } = sweep(undefined, () => useGameStore.setState({
      buildings: [...established(), tower('t')], villagers: [defender('d', 't')],
    } as never));
    expect(warned.length).toBeGreaterThan(0);
    came.forEach((t, i) => expect(t - warned[i].t).toBe(45));
  });
});

describe('a raid, warned of', () => {
  it('at home the horn sounds and the raiders come after the warning; away it is a word from home, no horn — and it comes all the same', () => {
    const notes: string[] = [];
    for (const destination of [null, 'template-04']) {
      game().newGame(HERO);
      useGameStore.setState({ buildings: established(), unlocks: [...game().unlocks, 'mining'], destination, notify: (n: string) => { notes.push(n); } } as never);
      vi.mocked(audio.play).mockClear();
      worldEnv.time = 0.5;
      raidForce.current = true;
      const tick = () => raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
      tick();
      expect(raidPlan.incoming).toBe(RAID_WARNING_SECONDS);
      expect(raidPlan.sides.length).toBeGreaterThanOrEqual(2);
      expect(vi.mocked(audio.play).mock.calls.filter(([n]) => n === 'horn')).toHaveLength(destination ? 0 : 1);
      for (let s = 1; s < RAID_WARNING_SECONDS; s++) tick();
      expect(useEnemyStore.getState().enemies.filter((e) => e.raid)).toHaveLength(0);
      tick();
      expect(useEnemyStore.getState().enemies.filter((e) => e.raid)).toHaveLength(3);
    }
    expect(notes.filter((n) => n.startsWith('📯 The horn!'))).toHaveLength(1);
    expect(notes.filter((n) => n.startsWith('📯 Word from home'))).toHaveLength(1);
  });

  it('not while the homestead is not yet worth raiding, nor in the cooldown, forced or not', () => {
    const tick = () => raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
    raidForce.current = true;
    tick();
    expect(raidPlan.incoming).toBe(0);
    useGameStore.setState({ buildings: established(), unlocks: [...game().unlocks, 'mining'] } as never);
    raidCooldown.current = 100;
    tick();
    expect(raidPlan.incoming).toBe(0);
    raidCooldown.current = 1;
    tick();
    expect(raidPlan.incoming).toBe(RAID_WARNING_SECONDS);
  });
});
