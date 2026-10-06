import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './store/gameStore';
import { breathe, flammable, FLARE_SECONDS, MAX_BURNING, newDragonfire } from './dragonfire';
import { BLACK_DRAGON, GREEN_DRAGON } from './dragonSiegeConfig';
import { maxHpFor } from './data/buildables';
import { isBuilt, type PlacedBuilding } from './types';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const piece = (id: string, type: string, x: number, z: number): PlacedBuilding => ({ id, type, x, z, rot: 0, built: 1 });
/** every building as [id, 'standing' | 'ruin', the hit points on record for it] */
const town = () => game().buildings.map((b) => [b.id, isBuilt(b) ? 'standing' : 'ruin', game().buildingHp[b.id] ?? null]);
const alight = (fire: { burning: { id: string }[] }) => fire.burning.map((blaze) => blaze.id);

let lines: string[];
let flames: unknown[][];
let roll: number;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  flames = [];
  vi.spyOn(audio, 'playAt').mockImplementation(((...args: unknown[]) => { flames.push(args); return null; }) as never);
  roll = 0.1; // under the spread chance; picks the first of a short list
  vi.spyOn(Math, 'random').mockImplementation(() => roll);
  game().newGame(HERO as never);
  lines = [];
  useGameStore.setState({ notify: (text: string) => { lines.push(text); } });
});

const build = (...buildings: PlacedBuilding[]) => useGameStore.setState({ buildings, buildingHp: {} });
const said = (fragment: string) => lines.filter((l) => l.includes(fragment)).length;

describe('dragonfire', () => {
  it('wood burns, stone holds', () => {
    expect([flammable('stockpile'), flammable('storehouse'), flammable('tower'), flammable('no_such_piece')])
      .toEqual([true, true, false, false]);
    expect([maxHpFor('stockpile'), maxHpFor('storehouse')]).toEqual([18, 48]); // what the tests below count in
  });

  it('the first breath sets one wooden building alight and leaves stone alone', () => {
    build(piece('tower', 'tower', 0, 0), piece('pile', 'stockpile', 3, 0));
    const fire = newDragonfire();
    breathe(fire, GREEN_DRAGON);
    expect([alight(fire), town()]).toEqual([['pile'], [['tower', 'standing', null], ['pile', 'standing', 4]]]);
    expect(flames).toEqual([['flame', 3, 0, 0.9]]);
    expect(fire.burning[0].fireT).toBe(FLARE_SECONDS);
  });

  it('with nothing wooden standing it says so, once a siege', () => {
    build(piece('tower', 'tower', 0, 0));
    const fire = newDragonfire();
    breathe(fire, GREEN_DRAGON);
    breathe(fire, GREEN_DRAGON);
    expect([lines, alight(fire), town()]).toEqual([[GREEN_DRAGON.lines.stoneHolds], [], [['tower', 'standing', null]]]);
  });

  it('what is alight takes every breath until it falls, and is dropped as it does', () => {
    build(piece('hall', 'storehouse', 0, 0));
    const fire = newDragonfire();
    const hp: unknown[] = [];
    for (let breath = 0; breath < 4; breath++) {
      fire.burning.forEach((blaze) => { blaze.fireT = 0; }); // the flare of the last breath has died down
      breathe(fire, GREEN_DRAGON);
      hp.push(game().buildingHp.hall ?? null);
      if (fire.burning.length) expect(fire.burning[0].fireT).toBe(FLARE_SECONDS);
    }
    expect(hp).toEqual([34, 20, 6, null]);
    expect(flames).toEqual([0, 1, 2, 3].map(() => ['flame', 0, 0, 0.9]));
    expect([alight(fire), town(), said('to a smoking ruin')]).toEqual([[], [['hall', 'ruin', null]], 1]);
    expect(game().buildings[0].ruin).toBe(true);
  });

  it('the fire leaps to a wooden neighbour within reach, never to more than three at once', () => {
    // stone and a ruin stand nearest, and first in the list: neither may catch
    build(
      piece('tower', 'tower', 2, 2), { ...piece('rubble', 'storehouse', 1, 1), built: 0, ruin: true },
      piece('a', 'storehouse', 0, 0), piece('b', 'storehouse', 5, 0), piece('c', 'storehouse', 0, 5),
      piece('d', 'storehouse', 5, 5), piece('far', 'workbench', 40, 40),
    );
    const fire = newDragonfire();
    const seen: string[][] = [];
    for (let breath = 0; breath < 5; breath++) {
      breathe(fire, GREEN_DRAGON);
      seen.push(alight(fire));
      expect(fire.burning.map((blaze) => blaze.fireT)).toEqual(fire.burning.map(() => FLARE_SECONDS));
    }
    // a is lit; it spreads to b, then to c; three alight is the cap; a falls on its fourth breath and d catches
    expect(seen).toEqual([['a'], ['a', 'b'], ['a', 'b', 'c'], ['b', 'c', 'd'], ['b', 'c', 'd']]);
    expect(Math.max(...seen.map((s) => s.length))).toBe(MAX_BURNING);
    expect(said('The fire leaps')).toBe(3);
    expect(flames.filter((f) => f[3] === 0.8)).toEqual([['flame', 5, 0, 0.8], ['flame', 0, 5, 0.8], ['flame', 5, 5, 0.8]]);
    const untouched = town().filter(([id]) => id === 'far' || id === 'tower' || id === 'rubble');
    expect(untouched).toEqual([['tower', 'standing', null], ['rubble', 'ruin', null], ['far', 'standing', null]]);
  });

  it('a neighbour eight metres off catches, one a little further does not', () => {
    build(piece('a', 'storehouse', 0, 0), piece('edge', 'storehouse', 8, 0), piece('beyond', 'storehouse', 0, 8.01));
    const fire = newDragonfire();
    for (let breath = 0; breath < 3; breath++) breathe(fire, GREEN_DRAGON);
    expect(alight(fire)).toEqual(['a', 'edge']);
  });

  it('the fire stays where it is when the roll fails — 0.18 itself is a failure', () => {
    build(piece('a', 'storehouse', 0, 0), piece('b', 'storehouse', 5, 0));
    const fire = newDragonfire();
    breathe(fire, GREEN_DRAGON);
    roll = 0.18;
    breathe(fire, GREEN_DRAGON);
    expect([alight(fire), said('The fire leaps')]).toEqual([['a'], 0]);
    roll = 0.1799;
    breathe(fire, GREEN_DRAGON);
    expect([alight(fire), said('The fire leaps')]).toEqual([['a', 'b'], 1]);
  });

  it('a building the breath that lit it has ruined is not scorched again', () => {
    // the black dragon's breath (18) ruins a stockpile (18) in one go
    build(piece('pile', 'stockpile', 0, 0), piece('hall', 'storehouse', 30, 0));
    const fire = newDragonfire();
    breathe(fire, BLACK_DRAGON);
    expect([town(), said('to a smoking ruin')]).toEqual([[['pile', 'ruin', null], ['hall', 'standing', null]], 1]);
    // it flares until the next breath...
    expect(alight(fire)).toEqual(['pile']);
    // ...by which time a builder has put a quarter of it back
    useGameStore.setState({ buildings: game().buildings.map((b) => (b.id === 'pile' ? { ...b, built: 0.25 } : b)) });
    breathe(fire, BLACK_DRAGON);
    // the breath goes to a building that is standing: no second ruin line, the rebuilding kept
    expect([alight(fire), said('to a smoking ruin')]).toEqual([['hall'], 1]);
    expect(game().buildings.map((b) => [b.id, b.built ?? 1, game().buildingHp[b.id] ?? null]))
      .toEqual([['pile', 0.25, null], ['hall', 1, 30]]);
  });

  it('nor is a sturdier one that was already down to its last hit points', () => {
    build(piece('hall', 'storehouse', 0, 0));
    useGameStore.setState({ buildingHp: { hall: 10 } });
    const fire = newDragonfire();
    breathe(fire, GREEN_DRAGON);
    expect(town()).toEqual([['hall', 'ruin', null]]);
    breathe(fire, GREEN_DRAGON);
    // nothing written onto the ruin for the rebuilt hall to come back with; nothing left to burn
    expect([town(), alight(fire), said(GREEN_DRAGON.lines.stoneHolds)]).toEqual([[['hall', 'ruin', null]], [], 1]);
    expect(flames.length).toBe(1);
  });

  it('a ruin that is rebuilt comes back whole, whatever was on record for it', () => {
    // what the old second breath left behind in a save: a ruin with hit points
    build({ ...piece('hall', 'storehouse', 0, 0), built: 0, ruin: true }, piece('shed', 'storehouse', 30, 0));
    useGameStore.setState({ buildingHp: { hall: 34, shed: 20 } });
    game().constructBuilding('hall', 0.5);
    expect([town(), game().buildings[0].ruin]).toEqual([[['hall', 'ruin', 34], ['shed', 'standing', 20]], true]); // still a ruin
    game().constructBuilding('hall', 1);
    // rebuilt: the flag and the stale hit points go together; nobody else's are touched
    expect([town(), game().buildings[0].ruin]).toEqual([[['hall', 'standing', null], ['shed', 'standing', 20]], false]);
    expect(said('rebuilt from the ashes')).toBe(1);
  });

  it('a building alight that is gone by the next breath is forgotten before it', () => {
    build(piece('a', 'storehouse', 0, 0), piece('b', 'storehouse', 30, 0));
    const fire = newDragonfire();
    breathe(fire, GREEN_DRAGON);
    expect(alight(fire)).toEqual(['a']);
    useGameStore.setState({ buildings: game().buildings.filter((b) => b.id !== 'a') }); // pulled down meanwhile
    breathe(fire, GREEN_DRAGON);
    expect([alight(fire), town()]).toEqual([['b'], [['b', 'standing', 34]]]);
  });
});
