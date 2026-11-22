import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { audio } from '@/lib/audio';
import { navReachable, rebuildNav } from './navgrid';
import { combatState, damagePlayer, resolveEnemyKill, useEnemyStore, type EnemyData } from './combat';
import { worldEnv } from './env';
import { roadEntry } from './data/road';
import { WORLD_HALF } from './data/world';
import { raidDirector } from './directors/raidDirector';
import { raidSize, stockpileValue, thiefSlot } from './directors/raidTiming';
import { raidActive, raidCooldown, raidForce, raidLost, raidPlan } from './directors/state';
import { markFor, siegeWay, storeFor } from './enemyAi/targeting';
import { newRouteFrame, roadExit } from './enemyAi/movement';
import { stepEnemy } from './enemyAi/step';
import { ladderPull } from './enemyAi/climb';
import { raiderLadderState } from './raiderLadder';
import type { Route } from './enemyAi/frame';
import { GRAB_EVERY, RUN_HAUL, goodsNamed, gotAway, nextGrab, raidHaul, resetRaidHaul } from './plunder';
import { storageCapacity } from './storage';
import { KEEP_SITE_ID, siteById, siteCovers } from './sites/sites';
import { playerState } from './playerState';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig, PlacedBuilding } from './types';

// Wave 71 (G-06) · raiders strip the stores and run for the road: a thief at a store takes a good every GRAB_EVERY
// seconds, the biggest pile first, with no cap, until he is struck or carries RUN_HAUL; he runs by a way to the road's
// entry and on off the map, gone only at its edge; a kill drops every good he carried, an escape goes into the saved
// ledger; the raid grows with the stores and its end names what was lost and taken back. With it, from ROADMAP's
// "Seen, not fixed": a raider fleeing inside a shut keep takes a way out, and a raider shut off from his mark for
// another reason no longer batters an unrelated pen's gate.

const HERO: CharacterConfig = { name: 'Thief', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let notes: string[] = [];
let now = 9_000_000;
const was = { x: playerState.x, z: playerState.z };
/** frames of 1/32 s — exact in binary, so that a grab every 0.5 s is every 16th frame */
const DT = 1 / 32;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  vi.spyOn(audio, 'playAt').mockImplementation((() => null) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: (m: string) => { notes.push(m); }, nodes: [], unlocks: [...game().unlocks, 'keep', 'mining'] } as never);
  useEnemyStore.getState().clear();
  resetRaidHaul();
  notes = [];
  now += 10_000;
  combatState.iframeUntil = 0;
  Object.assign(playerState, { x: 150, z: -150 }); // far off: out of every raider's notice
});
afterEach(() => { vi.restoreAllMocks(); newRouteFrame(Infinity); Object.assign(playerState, was); });

const piece = (id: string, type: string, x: number, z: number, rot: 0 | 1 = 0): PlacedBuilding => ({ id, type, x, z, y: 0, rot, built: 1, world: null });
/** a square ring of the player's palisades (4 m each) of half-side `h` round (cx, cz), a gate in its south side */
const pen = (cx: number, cz: number, h: number, tag = ''): PlacedBuilding[] => {
  const out: PlacedBuilding[] = [];
  for (let a = -h + 2; a <= h - 2; a += 4) {
    out.push(piece(`${tag}n${a}`, 'palisade', cx + a, cz - h));
    out.push(piece(`${tag}w${a}`, 'palisade', cx - h, cz + a, 1), piece(`${tag}e${a}`, 'palisade', cx + h, cz + a, 1));
    out.push(a === -2 ? piece(`${tag}gate`, 'gate', cx + a, cz + h) : piece(`${tag}s${a}`, 'palisade', cx + a, cz + h));
  }
  return out;
};
const stood = (bs: PlacedBuilding[], gateOpen: Record<string, boolean> = {}) => {
  useGameStore.setState({ buildings: bs, gateOpen });
  rebuildNav(game().buildings);
};
type Mob = EnemyData['mob'];
const raider = (x: number, z: number, o: Partial<EnemyData> = {}, m: Partial<Mob> = {}): EnemyData =>
  ({ id: 11, kind: 'bandit', hp: 8, maxHp: 8, scale: 1, raid: true, world: null, inventory: {}, ...o,
    mob: { x, z, yaw: 0, state: 'chase', attackCd: GRAB_EVERY, wanderT: 1, homeX: x, homeZ: z, dieT: 0, ...m } } as EnemyData);
/** an enemy's frame (step.ts), at home; `gone` is set when it removes him */
const frameOf = (data: EnemyData) => {
  const f = {
    data, group: { current: new THREE.Group() }, rigRef: { current: null }, scatter: { current: null },
    path: { current: { pts: [], i: 0, t: 0, tx: 0, tz: 0 } as Route }, clip: '', setClip: () => {},
    pace: { current: { x: 0, z: 0, v: 0 } }, setRidePace: () => {}, remove: () => { f.gone = true; },
    enemyAtHome: (data.world ?? null) === null, speed: 2.7, gone: false,
  };
  return f;
};
/** the raid director's 1 Hz tick */
const tick = () => raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
/** the homestead established, the roll forced, and on through the warning to the raiders' arrival */
const startRaid = () => {
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  raidActive.current = false;
  raidCooldown.current = 0;
  worldEnv.time = 0.71;
  raidForce.current = true;
  do tick(); while (raidPlan.incoming > 0);
  vi.mocked(Math.random).mockRestore();
};
const raiders = () => useEnemyStore.getState().enemies.filter((e) => e.raid);
const bulk = () => ({ wood: game().inventory.wood ?? 0, stone: game().inventory.stone ?? 0, plank: game().inventory.plank ?? 0 });

describe('a thief at the store', () => {
  it('takes a good every GRAB_EVERY seconds, the biggest pile first, never gold — and with RUN_HAUL on him runs', () => {
    stood([piece('sp', 'stockpile', 20, -20)]);
    useGameStore.setState({ inventory: { wood: 30, stone: 25, gold: 100 } });
    // half a metre off the stockpile's east face (it is 1.4 m wide)
    const data = raider(20 + 0.7 + 0.5, -20, { thief: true });
    const f = frameOf(data);
    const at = (s: number) => { for (let i = 0; i < s / DT; i++) stepEnemy(f, DT); };
    at(5);
    // 30 → 25 from the wood, then turn about from the bigger pile, a tie going to the wood (the first in BULK_GOODS)
    expect(data.carried).toEqual({ wood: 8, stone: 2 });
    expect(bulk()).toEqual({ wood: 22, stone: 23, plank: 0 });
    expect(game().inventory.gold).toBe(100);
    expect(notes).toEqual(['A raider is stripping your stores!']);
    at(4.5);
    expect([data.mob.fleeing, Object.values(data.carried!).reduce((a, n) => a + n!, 0)]).toEqual([undefined, 19]);
    at(0.5);
    expect(data.mob.fleeing).toBe(true);
    expect(notes.at(-1)).toBe(`A raider runs for the road with ${RUN_HAUL} of your goods!`);
    expect(bulk().wood + bulk().stone + RUN_HAUL).toBe(55);
    at(2);
    expect(bulk().wood + bulk().stone).toBe(35); // running, he takes no more
  });

  it('with no cap: a second thief goes on where the first left off, down to the last good, then runs with what he has', () => {
    stood([piece('sp', 'stockpile', 20, -20)]);
    useGameStore.setState({ inventory: { wood: 28 } });
    const one = raider(21.2, -20, { id: 1, thief: true });
    const two = raider(18.8, -20, { id: 2, thief: true });
    const f1 = frameOf(one), f2 = frameOf(two);
    for (let i = 0; i < 20 / DT; i++) { stepEnemy(f1, DT); stepEnemy(f2, DT); }
    expect(game().inventory.wood).toBe(0);
    expect([one.carried!.wood! + two.carried!.wood!, one.mob.fleeing, two.mob.fleeing]).toEqual([28, true, true]);
    // nothing to take and nothing on him: he gives up thieving and fights
    const three = raider(21.2, -20, { id: 3, thief: true });
    stepEnemy(frameOf(three), 1); // dt held at 0.05; his cooldown is the grab's
    for (let i = 0; i < 20; i++) stepEnemy(frameOf(three), DT);
    expect([three.thief, three.mob.fleeing, three.carried]).toEqual([false, undefined, undefined]);
  });

  it('struck with goods on him, drops the store and runs; struck with none, fights like the rest', () => {
    stood([piece('sp', 'stockpile', 20, -20)]);
    useGameStore.setState({ inventory: { wood: 30 } });
    const loaded = raider(21.2, -20, { thief: true, carried: { wood: 5 } });
    loaded.hp = 7;
    stepEnemy(frameOf(loaded), DT);
    expect(loaded.mob.fleeing).toBe(true);
    const empty = raider(21.2, -20, { thief: true });
    empty.hp = 7;
    stepEnemy(frameOf(empty), DT);
    expect([empty.thief, empty.mob.fleeing]).toEqual([false, undefined]);
    expect(storeFor(empty, game(), true)).toBeNull();
    expect(game().inventory.wood).toBe(30);
  });

  it('makes for the nearest store standing at home, never a ruin; with none, home\'s middle', () => {
    const data = raider(30, 0, { thief: true });
    expect(storeFor(data, game(), true)).toMatchObject({ x: 0, z: 0 });
    const ruin = { ...piece('sh', 'storehouse', 26, 0), built: 0, ruin: true };
    useGameStore.setState({ buildings: [piece('sp', 'stockpile', -10, 0), ruin, { ...piece('far', 'storehouse', 31, 0), world: 'template-01' }] });
    expect(storeFor(data, game(), true)).toMatchObject({ x: -10, z: 0 });
    useGameStore.setState({ buildings: [...game().buildings, piece('sh2', 'storehouse', 40, 0)] });
    expect(storeFor(data, game(), true)).toMatchObject({ x: 40, z: 0, d: 10 - 1.5 });
    // his mark whoever stands nearer; none for a fighter, one at a destination or one running
    expect(markFor(data, 2, { target: null, id: '', d: Infinity }, { target: null, d: Infinity }, { target: null, d: Infinity }, storeFor(data, game(), true)).mark).toBe('store');
    expect(storeFor(raider(30, 0), game(), true)).toBeNull();
    expect(storeFor(data, game(), false)).toBeNull();
    expect(storeFor(raider(30, 0, { thief: true }, { fleeing: true }), game(), true)).toBeNull();
  });

  // (before merging wave 71) home's middle is a point, and the player builds there. Over a building (a stable, a
  // forge) a thief walks in to it as before, but a keep's wall or corner stops him half a metre off its face
  // (stopAtKeepWalls): with the keep's south run lying across the point, he stood 1.5 m from it, never in STORE_REACH,
  // and never gave up (the grid's word puts the point beside the run) — the raid, a major event, stood with him.
  it('with no store standing and a building — or a keep wall — over the middle of home, he still strips the goods', () => {
    const strips = (label: string) => {
      useGameStore.setState({ inventory: { wood: 30 } });
      const data = raider(12, 3, { thief: true });
      const f = frameOf(data);
      for (let i = 0; i < 30 / DT && !data.mob.fleeing; i++) { newRouteFrame(); stepEnemy(f, DT); }
      expect([label, data.carried?.wood ?? 0, data.thief, data.mob.fleeing]).toEqual([label, RUN_HAUL, true, true]);
      expect(game().inventory.wood).toBe(30 - RUN_HAUL);
    };
    for (const [type, x, z] of [['stable', 0, 0], ['forge', 0.5, -0.5]] as const) {
      stood([piece('mid', type, x, z)]);
      strips(type);
    }
    // the keep 7 m north of the point: its south run (8 m by 2.4, its middle 0.2 m north of the point) lies across it;
    // no other piece stands
    stood([]);
    game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
    expect(game().placeBuilding('keep', 0, -7, 0)).toBe(true);
    game().raiseKeepPart('s', 'wall_crenel');
    game().workKeepPart('s', 1);
    rebuildNav(game().buildings);
    strips('keep wall');
  });

  // (the check of the pre-merge fixes) the open ground the grid's scan finds first can lie inside a shut ring when as
  // near lies outside it: with the keep at (7, 0), its west run across home's middle and its gatehouse shut, he went
  // in through the gatehouse — battered to a ruin — for goods he could take from outside
  it('with no store standing and a shut keep over the middle of home, he takes from the ground he can get to, not battering in', () => {
    stood([]);
    game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
    expect(game().placeBuilding('keep', 7, 0, 0)).toBe(true);
    const parts = [['nw', 'corner_block'], ['ne', 'corner_block'], ['sw', 'corner_block'], ['se', 'corner_turret'],
      ['e', 'wall_crenel'], ['s', 'wall_crenel'], ['w', 'wall_low'], ['n', 'gatehouse']] as const;
    for (const [s, part] of parts) { game().raiseKeepPart(s, part); game().workKeepPart(s, 1); }
    game().toggleSiteGate('keep', 'n');
    expect(game().keep!.gateOpen?.n).toBe(false);
    rebuildNav(game().buildings);
    useGameStore.setState({ inventory: { wood: 30 } });
    const data = raider(-14, 2, { thief: true });
    const f = frameOf(data);
    for (let i = 0; i < 40 / DT && !data.mob.fleeing; i++) { newRouteFrame(); stepEnemy(f, DT); }
    expect([data.carried?.wood ?? 0, data.mob.fleeing]).toEqual([RUN_HAUL, true]);
    expect([game().keep!.hp?.n, game().keep!.ruined?.n ?? false]).toEqual([undefined, false]);
  });
});

describe('a kill drops exactly what he carried', () => {
  it('his haul and his own purse, past a full store, taken back for the raid', () => {
    useGameStore.setState({ inventory: { wood: storageCapacity([]), stone: 1 } });
    const data = raider(5, 5, { thief: true, carried: { wood: 7, stone: 2 }, inventory: { gold: 3 } });
    resolveEnemyKill(data, { by: 'melee' });
    expect(game().inventory).toMatchObject({ wood: storageCapacity([]) + 7, stone: 3, gold: 3 });
    expect(raidHaul.recovered).toEqual({ wood: 7, stone: 2 });
    expect(notes.at(-1)).toBe('Bandit defeated! Looted 3× Gold Coin, 7× Wood Log, 2× Stone.');
    // a fighter's purse alone, as before
    resolveEnemyKill(raider(5, 5, { id: 12, inventory: { gold: 2 } }), { by: 'defender', villager: { id: 'v1', name: 'Ada' } });
    expect(game().inventory.gold).toBe(5);
    expect(raidHaul.recovered).toEqual({ wood: 7, stone: 2 });
  });
});

describe('the escape', () => {
  it('runs by a way to the road\'s entry and on along it, and is gone only at the map\'s edge, into the ledger', () => {
    stood([]);
    const entry = roadEntry();
    const exit = roadExit();
    expect([exit.x, exit.z]).toEqual([entry.x, WORLD_HALF - 2]); // the road runs on south out of the map
    expect(navReachable(entry.x, entry.z, exit.x, exit.z)).toBe(true);
    const data = raider(10, -10, { thief: true, carried: { wood: 12, plank: 8 } }, { fleeing: true });
    const f = frameOf(data);
    let nearEntry = Infinity, worst = 0, last = { x: 0, z: 0 };
    for (let i = 0; i < 120 / DT && !f.gone; i++) {
      last = { x: data.mob.x, z: data.mob.z };
      stepEnemy(f, DT);
      nearEntry = Math.min(nearEntry, Math.hypot(data.mob.x - entry.x, data.mob.z - entry.z));
      worst = Math.max(worst, Math.hypot(data.mob.x - playerState.x, data.mob.z - playerState.z));
    }
    expect(f.gone).toBe(true);
    expect(nearEntry).toBeLessThan(2.5);
    expect(Math.max(Math.abs(last.x), Math.abs(last.z))).toBeGreaterThan(WORLD_HALF - 4 - 0.2);
    expect(Math.abs(last.x - entry.x)).toBeLessThan(3); // along the road
    expect(worst).toBeGreaterThan(200); // the player far off all the way: no longer gone at 44 m from him
    expect(game().plunder).toEqual({ wood: 12, plank: 8 });
    expect(raidHaul.lost).toEqual({ wood: 12, plank: 8 });
  });

  it('a broken raider with nothing of the player\'s takes the road too, and is gone 44 m from the player as before', () => {
    stood([]);
    Object.assign(playerState, { x: 0, z: 0 });
    const data = raider(5, 5, {}, { fleeing: true });
    const f = frameOf(data);
    let steps = 0;
    for (; steps < 60 / DT && !f.gone; steps++) stepEnemy(f, DT);
    expect(f.gone).toBe(true);
    const d = Math.hypot(data.mob.x, data.mob.z);
    expect(d).toBeGreaterThan(44);
    expect(d).toBeLessThan(45);
    // toward the road's entry, not straight away from the player
    const entry = roadEntry();
    expect(Math.hypot(data.mob.x - entry.x, data.mob.z - entry.z)).toBeLessThan(Math.hypot(entry.x, entry.z) - 40);
    expect(game().plunder).toEqual({});
  });

  it('a thief standing when the player is knocked out gets away with his haul; one already falling does not', () => {
    useGameStore.setState({ buildings: [0, 1, 2, 3].map((i) => piece('w' + i, 'wall', 120 + i * 4, -120)) });
    startRaid();
    const [lead, thief] = raiders();
    thief.carried = { stone: 6 };
    lead.carried = { plank: 1 };
    lead.mob.state = 'dying';
    damagePlayer(999);
    expect(game().plunder).toEqual({ stone: 6 });
    tick();
    expect(notes.find((n) => n.startsWith('The raiders had the field.'))).toBe(
      'The raiders had the field. They are gone by dawn, and they took and tore down what they could. They got away with 6× Stone.');
  });
});

describe('a save taken mid-raid (from the review of wave 71)', () => {
  it('counts the goods on every thief still on his feet into the saved ledger, and leaves the live raid as it is', () => {
    game().recordPlunder({ stone: 2 });
    useEnemyStore.setState({ enemies: [
      raider(5, 5, { id: 1, thief: true, carried: { wood: 7 } }),
      raider(6, 6, { id: 2, thief: true, carried: { wood: 3, plank: 1 } }),
      raider(7, 7, { id: 3 }),
      raider(8, 8, { id: 4, thief: true, carried: { stone: 9 } }, { state: 'dying' }), // dropped already (kill.ts)
    ] });
    // (the goods were gone from the stores and, loaded, on no thief and in no ledger)
    expect(game().toSave().plunder).toEqual({ stone: 2, wood: 10, plank: 1 });
    expect(game().plunder).toEqual({ stone: 2 });
    useEnemyStore.getState().clear();
    expect(game().toSave().plunder).toEqual({ stone: 2 });
  });
});

describe('the raid', () => {
  it('grows with what the stores are worth, every other one behind the leader a thief', () => {
    expect([0, 499, 500, 1499, 1500, 2999, 3000, 1e6].map(raidSize)).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
    // each bulk good at the merchant's price (a herb, which he does not buy, at 1); gold and gear count for nothing
    expect(stockpileValue({ wood: 10, stone: 5, iron_bar: 1, herb: 3, gold: 1000, sword: 2 })).toBe(10 + 10 + 8 + 3);
    expect([1, 2, 3, 4, 5].map(thiefSlot)).toEqual([true, false, true, false, true]);
    useGameStore.setState({ buildings: [0, 1, 2, 3].map((i) => piece('w' + i, 'wall', 120 + i * 4, -120)) });
    useGameStore.setState({ inventory: { wood: 40 } });
    startRaid();
    expect(raiders().map((e) => [e.kind === 'gilbert', !!e.thief])).toEqual([[true, false], [false, true], [false, false]]);
    useEnemyStore.getState().clear();
    useGameStore.setState({ inventory: { stone: 1000, iron_bar: 125 } }); // 3,000
    startRaid();
    expect(raiders().map((e) => !!e.thief)).toEqual([false, true, false, true, false, true]);
  });

  it('ends only once its last thief is gone, and names the goods lost and those taken back', () => {
    useGameStore.setState({ buildings: [0, 1, 2, 3].map((i) => piece('w' + i, 'wall', 120 + i * 4, -120)) });
    startRaid();
    const [, thief] = raiders();
    for (const e of raiders()) if (e !== thief) useEnemyStore.getState().remove(e.id);
    thief.carried = { wood: 5 };
    resolveEnemyKill(thief, { by: 'melee' });
    gotAway(game(), { stone: 3, plank: 2 });
    gotAway(game(), { stone: 1 });
    tick();
    expect(raidActive.current).toBe(true); // he is still falling apart
    useEnemyStore.getState().remove(thief.id);
    tick();
    expect(notes.find((n) => n.startsWith('The raid is beaten back!'))).toBe(
      'The raid is beaten back! The bandits dropped their spoils. They got away with 4× Stone, 2× Plank. Taken back from the fallen: 5× Wood Log.');
    expect([raidHaul.lost, raidHaul.recovered]).toEqual([{}, {}]);
    expect(game().plunder).toEqual({ stone: 4, plank: 2 });
    expect(goodsNamed({})).toBe('');
    expect(nextGrab({ gold: 9 })).toBeNull();
  });
});

describe('shut off from the store, a thief batters his way to it (from the review of wave 70.1)', () => {
  // (the check of the pre-merge fixes) his give-up read the grid fresh against a route worked out while the gate stood
  // open: the next frame after the gate shut and the grid was rebuilt, he left the store — a loaded thief for the map's
  // edge with his goods — before his route could become the siege way to the gate. It is the route's own word now.
  it('a gate shut in front of him on his way in: he works out the way to batter it, and does not give up', () => {
    for (const carried of [undefined, { wood: 5 }]) {
      stood([piece('sp', 'stockpile', 40, -40), ...pen(40, -40, 8)]);
      useGameStore.setState({ inventory: { wood: 50 }, buildingHp: {} });
      const data = raider(40, -20, { thief: true, ...(carried ? { carried: { ...carried } } : {}) });
      const f = frameOf(data);
      const gate = () => game().buildings.find((b) => b.id === 'gate')!;
      for (let i = 0; i < 64; i++) { newRouteFrame(); stepEnemy(f, DT); }
      expect(f.path.current.siege ?? false).toBe(false); // on his way in by the open gate
      useGameStore.setState({ gateOpen: { gate: false }, buildings: [...game().buildings] });
      rebuildNav(game().buildings);
      let rebuilt = false;
      for (let i = 0; i < 60 / DT && (game().inventory.wood ?? 0) === 50; i++) {
        newRouteFrame();
        stepEnemy(f, DT);
        // never off before he is at the goods: not turned fighter, not running
        expect([carried ?? 'empty', data.thief, data.mob.fleeing ?? false]).toEqual([carried ?? 'empty', true, false]);
        // the grid made again once the gate is down, as the game's 1 Hz tick does (directors/navMaintenance.ts)
        if (!rebuilt && gate().built === 0) { rebuildNav(game().buildings); rebuilt = true; }
      }
      expect([gate().built, gate().ruin]).toEqual([0, true]);
      expect(game().inventory.wood).toBeLessThan(50);
    }
  });

  it('a store inside a walled pen: he batters its shut gate, then strips the store', () => {
    stood([...pen(40, -40, 8), piece('sp', 'stockpile', 40, -40)], { gate: false });
    useGameStore.setState({ inventory: { wood: 50 } });
    expect(siegeWay(game(), 40, -20, 40, -40)!.at(-1)).toEqual({ x: 38, z: -40 + 8 + 1 + 0.6 });
    const data = raider(40, -20, { thief: true });
    const f = frameOf(data);
    const gate = () => game().buildings.find((b) => b.id === 'gate')!;
    let rebuilt = false;
    for (let i = 0; i < 90 / DT && (game().inventory.wood ?? 0) === 50; i++) {
      stepEnemy(f, DT);
      // the grid made again once the gate is down, as the game's 1 Hz tick does (directors/navMaintenance.ts)
      if (!rebuilt && gate().built === 0) { rebuildNav(game().buildings); rebuilt = true; }
    }
    expect([gate().built, gate().ruin]).toEqual([0, true]);
    expect(game().inventory.wood).toBeLessThan(50);
  });

  it('batters the pen\'s gate with the player standing nearer him than it (from the evidence pass of wave 71)', () => {
    stood([...pen(40, -40, 8), piece('sp', 'stockpile', 40, -40)], { gate: false });
    useGameStore.setState({ inventory: { wood: 50 } });
    Object.assign(playerState, { x: 38, z: -30.2 }); // at his elbow: his store, not the player, is what the gate is weighed against
    const data = raider(38, -30.4, { thief: true });
    const f = frameOf(data);
    for (let i = 0; i < 5 / DT && game().buildingHp.gate === undefined; i++) stepEnemy(f, DT);
    // (weighed against the player's distance, he stood at the gate and never struck it)
    expect(game().buildingHp.gate).toBeDefined();
  });

  it('a thief is never drawn to the siege ladder; a fighter is (from the evidence pass of wave 71)', () => {
    Object.assign(raiderLadderState, { active: true, planted: true, wrecked: false, climbers: [], baseX: 10, baseZ: 10, baseYaw: 0 });
    try {
      expect(ladderPull(raider(12, 12, { thief: true }), true).eligible).toBe(false);
      expect(ladderPull(raider(12, 12), true).eligible).toBe(true);
    } finally {
      Object.assign(raiderLadderState, { active: false, planted: false });
    }
  });

  it('a store beside an unrelated pen, shut off from him by barrels: the pen is left alone and he gives up thieving', () => {
    // the store ringed by barrels (not a wall to batter: shut off for another reason), the player's pen beside it
    const barrels: PlacedBuilding[] = [];
    for (let a = -5; a <= 5; a++) barrels.push(piece(`bn${a}`, 'barrel', 60 + a, -45), piece(`bs${a}`, 'barrel', 60 + a, -35));
    for (let a = -4; a <= 4; a++) barrels.push(piece(`bw${a}`, 'barrel', 55, -40 + a), piece(`be${a}`, 'barrel', 65, -40 + a));
    stood([...barrels, piece('sp', 'stockpile', 60, -40), ...pen(40, -40, 8)], { gate: false });
    useGameStore.setState({ inventory: { wood: 50 } });
    expect(navReachable(60, -25, 60, -40)).toBe(false);
    expect(navReachable(60, -25, 40, -40)).toBe(false);
    // (his mark out of reach for another reason, he went off and battered the pen's gate)
    expect(siegeWay(game(), 60, -25, 60, -40)).toBeNull();
    const data = raider(60, -25, { thief: true });
    const f = frameOf(data);
    for (let i = 0; i < 64 && data.thief; i++) stepEnemy(f, DT);
    expect(data.thief).toBe(false);
    for (let i = 0; i < 10 / DT; i++) stepEnemy(f, DT);
    expect(game().buildings.find((b) => b.id === 'gate')!.built).toBe(1);
    expect(game().inventory.wood).toBe(50);
    // (before merging wave 71) one who has already taken goods elsewhere runs for the road with them instead: still a
    // thief, so his load stays on his back (EnemyFigure) — he had turned fighter with it, out of sight
    const loaded = raider(60, -25, { id: 12, thief: true, carried: { wood: 6 } });
    const g = frameOf(loaded);
    for (let i = 0; i < 64 && !loaded.mob.fleeing; i++) stepEnemy(g, DT);
    expect([loaded.thief, loaded.mob.fleeing, loaded.carried]).toEqual([true, true, { wood: 6 }]);
    expect(notes.at(-1)).toBe('A raider runs for the road with 6 of your goods!');
  });

  it('the outer of two rings round his mark is still battered: its far side lies between them', () => {
    stood([...pen(40, -40, 16, 'o'), ...pen(40, -40, 8)], { ogate: false, gate: false });
    expect(siegeWay(game(), 40, -10, 40, -40)!.at(-1)).toEqual({ x: 38, z: -40 + 16 + 1 + 0.6 });
  });
});

describe('fleeing from inside a shut keep (wave 70.1\'s "Seen, not fixed")', () => {
  it('one who breaks while battering a shut gate from outside leaves it and runs for the road (from the review of wave 71)', () => {
    stood(pen(40, -40, 8), { gate: false });
    Object.assign(playerState, { x: 40, z: -40 }); // in the pen: the raider's way to him a siege way, to its gate
    const data = raider(40, -20);
    const f = frameOf(data);
    const gateHp = () => game().buildingHp.gate;
    for (let i = 0; i < 60 / DT && gateHp() === undefined; i++) stepEnemy(f, DT);
    expect(gateHp()).toBeDefined(); // he is battering it
    data.hp = 2; // breaksAndRuns: he flees
    const struck = gateHp();
    const at = { x: data.mob.x, z: data.mob.z };
    for (let i = 0; i < 4 / DT; i++) stepEnemy(f, DT);
    expect(data.mob.fleeing).toBe(true);
    // (on the siege way in he held when he broke, he battered the gate on until it was a ruin)
    expect(gateHp()).toBe(struck);
    expect(game().buildings.find((b) => b.id === 'gate')!.built).toBe(1);
    expect(Math.hypot(data.mob.x - at.x, data.mob.z - at.z)).toBeGreaterThan(8);
  });

  it('batters his way out through the gatehouse and runs for the road, never pressed against the wall away from the player', () => {
    game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 }); // what the keep is raised with
    game().foundKeep(0, 0, 0);
    for (const [s, p] of [['nw', 'corner_turret'], ['ne', 'corner_turret'], ['se', 'corner_turret'], ['sw', 'corner_turret'],
      ['e', 'wall_crenel'], ['s', 'wall_crenel'], ['w', 'wall_crenel'], ['n', 'gatehouse']]) {
      game().raiseKeepPart(s, p);
      game().workKeepPart(s, 1);
    }
    game().toggleSiteGate('keep', 'n');
    rebuildNav(game().buildings);
    Object.assign(playerState, { x: 0, z: 20 }); // south of the keep, outside: away from him is the north wall
    const data = raider(2, 2, {}, { fleeing: true });
    const f = frameOf(data);
    const site = () => siteById(game(), KEEP_SITE_ID)!;
    let i = 0;
    for (; i < 120 / DT && siteCovers(site(), data.mob.x, data.mob.z) && !f.gone; i++) {
      stepEnemy(f, DT);
    }
    // (straight away from the player, he ran at the north wall and stayed there, sliding along it)
    expect(game().keep!.hp?.n !== undefined || game().keep!.built.n < 1).toBe(true);
    expect(siteCovers(site(), data.mob.x, data.mob.z)).toBe(false);
    for (; i < 240 / DT && !f.gone; i++) stepEnemy(f, DT);
    expect(f.gone).toBe(true);
  });
});
