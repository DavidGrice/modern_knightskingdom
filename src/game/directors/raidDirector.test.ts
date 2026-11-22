import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { combatState, damagePlayer, useEnemyStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { raiderLadderState } from '@/game/raiderLadder';
import { raiderRamState } from '@/game/raiderRam';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig, PlacedBuilding } from '@/game/types';
import { raidDirector } from './raidDirector';
import { bark, newRaid, resetBarks } from '@/game/barks';
import { blowAtGuard } from '@/game/enemyAi/blows';
import { registerDefender } from '@/game/defenders';
import { giveDefenderOrder } from '@/game/data/defenderOrders';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { raidActive, raidCooldown, raidForce, raidLost, raidPlan } from './state';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const raiders = () => useEnemyStore.getState().enemies.filter((e) => e.raid);
let notes: string[] = [];

/** one tick of the raid director, as Enemies.tsx's 1 Hz frame runs it: on the module cells */
function tick(): void {
  const st = game();
  raidDirector(st, useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
}
/** the homestead established (four pieces, mining unlocked), dusk, the roll forced (G-04), and the ticks that sound the
 *  horn and bring the raid */
function startRaid(): void {
  const walls: PlacedBuilding[] = [0, 1, 2, 3].map((i) => ({ id: 'w' + i, type: 'wall', x: 30 + i * 4, z: 30, rot: 0, built: 1 }));
  useGameStore.setState({ buildings: walls, unlocks: [...game().unlocks, 'mining'] });
  worldEnv.time = 0.71;
  raidForce.current = true;
  do tick(); while (raidPlan.incoming > 0);
  raiderRamState.active = true; // as though the raid had brought its ram and its ladder
  raiderLadderState.active = true;
}
const spoils = () => [game().inventory.plank ?? 0, game().inventory.stone ?? 0, game().inventory.iron_ore ?? 0, game().xp.combat];

beforeEach(() => {
  // 0.999: no ram, no ladder, no Armory drop of the dice's own — the test says which it has
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  notes = [];
  useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
  combatState.iframeUntil = 0;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the raid director', () => {
  it('a raid whose raiders are gone is beaten back once, with its spoils, and the cooldown keeps a second off', () => {
    startRaid();
    expect([raidActive.current, raiders().length]).toEqual([true, 3]);
    useEnemyStore.getState().clear();
    tick();
    tick();
    expect(notes.filter((n) => n.startsWith('The raid is beaten back!'))).toHaveLength(1);
    expect(spoils()).toEqual([4, 4, 2, 60]);
    expect([raidActive.current, raiderRamState.active, raiderLadderState.active, raiders().length]).toEqual([false, false, false, 0]);
    expect(raidCooldown.current).toBeGreaterThan(0);
  });

  it('a session start ends a raid under way without paying for it (a new game here; a load runs the same reset hook)', () => {
    startRaid();
    raidLost.current = true;
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    expect([raidActive.current, raidCooldown.current, raidLost.current]).toEqual([false, 0, false]);
    worldEnv.time = 0.3;
    tick();
    expect(spoils()).toEqual([0, 0, 0, 0]);
    expect(notes.filter((n) => /raid is beaten back|had the field/.test(n))).toEqual([]);
  });

  it('a knock-out mid-raid is a raid lost: no spoils, and it ends as a raid does, its cooldown running on', () => {
    startRaid();
    vi.mocked(Math.random).mockImplementation(() => 0.2); // a raid beaten back now would leave gear in the Armory
    const cooldown = raidCooldown.current, armory = { ...game().armory };
    damagePlayer(999);
    expect(raidLost.current).toBe(true);
    tick();
    expect(spoils()).toEqual([0, 0, 0, 0]);
    expect(game().armory).toEqual(armory);
    expect(notes.filter((n) => n.startsWith('The raiders had the field.'))).toHaveLength(1);
    expect(notes.filter((n) => n.startsWith('The raid is beaten back!'))).toEqual([]);
    expect([raidActive.current, raidLost.current, raiderRamState.active, raiderLadderState.active]).toEqual([false, false, false, false]);
    expect(raidCooldown.current).toBe(cooldown - 1);
  });

  it('a knock-out once every raider is already falling leaves a raid beaten back', () => {
    startRaid();
    for (const e of raiders()) e.mob.state = 'dying';
    damagePlayer(999);
    tick();
    expect(raidLost.current).toBe(false);
    expect(spoils()).toEqual([4, 4, 2, 60]);
  });
});

// G-09 · golden, written and run on the unchanged base (wave 73's merge) before the cast found its voice: what a raid's
// arrival plays, by who leads it. What G-09 changed in it on purpose is said where it changed: on the base, every raid
// came with Cedric's war cry (snd053) and Weezil's greeting, and Weezil's, asked for on the voice channel straight
// after the leader's, cut the leader's off as it began.
describe('golden: the raid\'s arrival voices', () => {
  beforeEach(() => {
    resetBarks();
    vi.spyOn(audio, 'playOnDemand').mockImplementation((() => undefined) as never);
  });
  /** the plain sounds, the voice lines and the one-shots beside the voice channel the arrival tick (the warning's last
   *  second) starts */
  function arrival(setup: () => void, rnd = 0.999): { sounds: unknown[][]; voices: unknown[][]; beside: unknown[][] } {
    useGameStore.setState({ buildings: [0, 1, 2, 3].map((i) => ({ id: 'w' + i, type: 'wall', x: 30 + i * 4, z: 30, rot: 0, built: 1 })), unlocks: [...game().unlocks, 'mining'] });
    setup();
    worldEnv.time = 0.71;
    raidForce.current = true;
    do tick(); while (raidPlan.incoming > 1);
    vi.mocked(audio.play).mockClear();
    vi.mocked(audio.playVoice).mockClear();
    vi.mocked(Math.random).mockImplementation(() => rnd);
    tick();
    return { sounds: vi.mocked(audio.play).mock.calls, voices: vi.mocked(audio.playVoice).mock.calls, beside: vi.mocked(audio.playOnDemand).mock.calls };
  }

  // changed: the horn, then his own war cry; his taunt in place of his greeting; no Weezil (base: warcry and horn,
  // greeting_cedric then greeting_weezil)
  it('Cedric leads: the horn, his war cry and his taunt', () => {
    const a = arrival(() => useGameStore.setState({ completedQuests: ['knights_arms'] }), 0.2);
    expect(raiders().map((e) => e.kind)[0]).toBe('cedric');
    expect(a.sounds).toEqual([['horn', 0.9], ['warcry', 0.9]]);
    expect(a.voices).toEqual([['c2s01t2a', 0.9, undefined, expect.any(Function)]]); // (its start goes in the barks' record)
    expect(a.beside).toEqual([]);
  });

  // changed: no war cry of Cedric's, and the pack's hail in the raiders' voice, beside the voice channel (base:
  // warcry and horn, greeting_gilbert then greeting_weezil on the voice channel)
  it('Gilbert leads: the horn, Gilbert\'s greeting, and the pack\'s hail in the raiders\' voice', () => {
    const a = arrival(() => {});
    expect(raiders().map((e) => e.kind)[0]).toBe('gilbert');
    expect(a.sounds).toEqual([['horn', 0.9]]);
    expect(a.voices).toEqual([['greeting_gilbert', 0.85]]);
    expect(a.beside).toEqual([['greeting_raider', 0.6]]);
  });

  // changed: no war cry of Cedric's (base: warcry and horn)
  it('the crown\'s knights: the horn, and no voice', () => {
    const a = arrival(() => useGameStore.setState({ alliance: 'cedric' }));
    expect(raiders().every((e) => e.kind === 'royal')).toBe(true);
    expect(a.sounds).toEqual([['horn', 0.9]]);
    expect(a.voices).toEqual([]);
    expect(a.beside).toEqual([]);
  });

  it('away: nothing plays', () => {
    const a = arrival(() => useGameStore.setState({ completedQuests: ['knights_arms'], destination: 'template-02' }), 0.2);
    expect(a.sounds).toEqual([]);
    expect(a.voices).toEqual([]);
    expect(a.beside).toEqual([]);
  });

  it('a raid never hears the same line twice: a second Gilbert raid\'s hail is heard, the first\'s is not again', () => {
    expect(arrival(() => {}).beside).toEqual([['greeting_raider', 0.6]]);
    expect(bark('raidersCome', { now: 1e9 })).toBe(false); // the same raid, long after its cooldown
    newRaid();
    expect(bark('raidersCome', { now: 1e9 })).toBe(true);
  });
});

describe('G-09 · the raid\'s voices', () => {
  /** `n` spots about home where a barrel may stand */
  const freeSpots = (n: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let x = -40; x <= 40 && out.length < n; x += 4) for (let z = -40; z <= 40 && out.length < n; z += 4) if (game().evalPlacement('barrel', x, z, 0).valid) out.push([x, z]);
    return out;
  };
  beforeEach(() => {
    resetBarks();
    vi.spyOn(audio, 'playOnDemand').mockImplementation((() => undefined) as never);
    vi.spyOn(audio, 'playAt').mockImplementation((() => undefined) as never);
  });

  it('the next raid hails again, past the line\'s cooldown: its arrival starts the raid\'s record afresh', () => {
    startRaid();
    const now = performance.now();
    useEnemyStore.getState().clear();
    tick(); // the raid beaten back
    raidCooldown.current = 0;
    vi.spyOn(performance, 'now').mockReturnValue(now + 1e6);
    raidForce.current = true;
    do tick(); while (raidPlan.incoming > 0);
    expect(vi.mocked(audio.playOnDemand).mock.calls.filter((c) => c[0] === 'greeting_raider')).toHaveLength(2);
  });

  it('building while Cedric\'s raid is on: his taunt once, for any number of pieces', () => {
    useGameStore.setState({ completedQuests: ['knights_arms'] });
    vi.mocked(Math.random).mockImplementation(() => 0.2);
    startRaid();
    expect(raiders()[0].kind).toBe('cedric');
    game().addItems({ plank: 20 }, 'grant');
    const spots = freeSpots(3);
    expect(spots).toHaveLength(3);
    // within his gap after the arrival's taunt, a piece built hears nothing (and spends nothing); past it, the taunt
    expect(game().placeBuilding('barrel', ...spots[0], 0)).toBe(true);
    expect(vi.mocked(audio.playVoice).mock.calls.filter((c) => c[0] === 'c2s02t4a')).toHaveLength(0);
    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 5000);
    for (const [x, z] of spots.slice(1)) expect(game().placeBuilding('barrel', x, z, 0)).toBe(true);
    expect(vi.mocked(audio.playVoice).mock.calls.filter((c) => c[0] === 'c2s02t4a')).toHaveLength(1);
  });

  it('every way of building under Cedric\'s raid taunts, once a raid: the keep\'s foundation, a part staked on it, a row', () => {
    useGameStore.setState({ completedQuests: ['knights_arms'] });
    vi.mocked(Math.random).mockImplementation(() => 0.2);
    startRaid();
    expect(raiders()[0].kind).toBe('cedric');
    useGameStore.setState({ unlocks: [...game().unlocks, 'keep'] });
    game().addItems({ plank: 100, stone: 400, wood: 100 }, 'grant');
    const taunts = () => vi.mocked(audio.playVoice).mock.calls.filter((c) => c[0] === 'c2s02t4a').length;
    let t = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => t);
    /** a raid's slot afresh, past his gap */
    const later = () => { newRaid(); t += 5000; };
    later();
    let keepAt: [number, number] | null = null;
    for (let x = -60; x <= 60 && !keepAt; x += 6) for (let z = -60; z <= 60 && !keepAt; z += 6) if (game().evalPlacement('keep', x, z, 0).valid) keepAt = [x, z];
    expect(keepAt).not.toBeNull();
    expect(game().placeBuilding('keep', keepAt![0], keepAt![1], 0)).toBe(true);
    expect(taunts()).toBe(1);
    game().raiseKeepPart('nw', 'corner_turret');
    expect(taunts()).toBe(1); // once a raid
    later();
    game().raiseKeepPart('ne', 'corner_turret');
    expect(game().keep!.parts.ne).toBe('corner_turret');
    expect(taunts()).toBe(2);
    later();
    expect(game().placeRow('barrel', freeSpots(2).map(([x, z]) => ({ x, z })), 0)).toBeGreaterThan(0);
    expect(taunts()).toBe(3);
    // a blueprint stamped (its pieces' own unlocks granted)
    later();
    const needs = ['tower', 'stonewall'].map((t) => BUILDABLE_BY_ID[t].requiresUnlock).filter((u): u is NonNullable<typeof u> => !!u);
    useGameStore.setState({ unlocks: [...game().unlocks, ...needs] });
    let bpAt: [number, number] | null = null;
    for (let x = -60; x <= 60 && !bpAt; x += 4) for (let z = -60; z <= 60 && !bpAt; z += 4) if (game().evalBlueprintPlacement('bp_watch_corner', x, z, 0).valid) bpAt = [x, z];
    expect(bpAt).not.toBeNull();
    game().addItems(game().evalBlueprintPlacement('bp_watch_corner', bpAt![0], bpAt![1], 0).cost, 'grant');
    expect(game().placeBlueprintAt('bp_watch_corner', bpAt![0], bpAt![1], 0)).toBe(true);
    expect(taunts()).toBe(4);
    // a charge mounted on a wall (a real Palisade Wall: the raid's own fixture walls are a type the catalog lacks)
    later();
    useGameStore.setState({ buildings: [...game().buildings, { id: 'wc', type: 'palisade', x: -50, z: -50, y: 0, rot: 0, built: 1, world: null }] });
    game().addItems(BUILDABLE_BY_ID.l394101.cost, 'grant');
    const before = game().buildings.length;
    game().mountCharge('wc', 'l394101');
    expect(game().buildings.length).toBe(before + 1);
    expect(taunts()).toBe(5);
  });

  it('building while Gilbert\'s raid is on: no taunt of Cedric\'s', () => {
    startRaid();
    game().addItems({ plank: 20 }, 'grant');
    const [[x, z]] = freeSpots(1);
    expect(game().placeBuilding('barrel', x, z, 0)).toBe(true);
    expect(vi.mocked(audio.playVoice).mock.calls.filter((c) => c[0] === 'c2s02t4a')).toHaveLength(0);
  });

  it('a defender knocked down cries out in the defenders\' voice, once in the raid', () => {
    startRaid();
    useGameStore.setState({ villagers: [{ id: 'd0', name: 'Guard', job: 'defender' }, { id: 'd1', name: 'Guard 2', job: 'defender' }] } as never);
    const gilbert = raiders().find((e) => e.kind === 'gilbert')!;
    for (const id of ['d0', 'd1']) {
      const ds = registerDefender(id, gilbert.mob.x + 1, gilbert.mob.z, 20);
      ds.hp = 0.1;
      vi.spyOn(performance, 'now').mockReturnValue(performance.now() + 1e5); // past every cooldown
      blowAtGuard(gilbert, game(), ds, id, false);
      expect(ds.state).toBe('downed');
    }
    expect(vi.mocked(audio.playAt).mock.calls.map((c) => c[0])).toEqual(['collision_villager']);
  });

  it('an order given is answered in the defenders\' voice — when there is a defender to answer', () => {
    giveDefenderOrder(0);
    expect(vi.mocked(audio.playOnDemand).mock.calls).toEqual([]);
    useGameStore.setState({ villagers: [{ id: 'd0', name: 'Guard', job: 'defender' }] } as never);
    giveDefenderOrder(0);
    expect(vi.mocked(audio.playOnDemand).mock.calls.map((c) => c[0])).toEqual(['greeting_villager']);
  });
});
