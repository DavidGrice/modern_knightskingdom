import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { audio } from '@/lib/audio';
import { navBlocked, navReachable, rebuildNav } from './navgrid';
import { useEnemyStore, type EnemyData } from './combat';
import { worldEnv } from './env';
import { roadEntry } from './data/road';
import { HOME_X, HOME_Z } from './data/villagers';
import { APPROACH_RING, approachPoint, bearingFromHome, raidSeedFor, raidSides } from './directors/approach';
import { raidDirector } from './directors/raidDirector';
import { raidSize, stockpileValue } from './directors/raidTiming';
import { raidActive, raidCooldown, raidForce, raidLost, raidPlan } from './directors/state';
import { keepSolids, pushOutOfBox } from './fixedSolids';
import { keepInReach, siegeWay } from './enemyAi/targeting';
import { batterKeep } from './enemyAi/blows';
import { makePathStep, newRouteFrame, ROUTES_PER_FRAME } from './enemyAi/movement';
import { stepEnemy } from './enemyAi/step';
import type { Route } from './enemyAi/frame';
import { ramCheck } from './siege';
import { raiderRamState, ramSpawn, resetRaiderRam, rollRaiderRam } from './raiderRam';
import { raiderLadderState } from './raiderLadder';
import { KEEP_SITE_ID, siteById, siteCovers, siteSocketWorld } from './sites/sites';
import { playerState } from './playerState';
import { defenderState } from './defenders';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig, PlacedBuilding } from './types';

// Wave 70.1 (G-03) · raiders peel off to different sides, the ram comes by the road, the ladder goes up where they are;
// and a raider shut off from his mark batters a way through the player's own walls too — the keep's gatehouse first,
// then a gate of the player's, then the nearest wall — or out of the keep, shut in. With it, from wave 69's review:
// the walls' searches are bounded, and the walk in and the flight are stopped by the walls.

// how many ways the home grid is asked for, and the cap each was asked with
const H = vi.hoisted(() => ({ caps: [] as number[] }));
vi.mock('@/game/navgrid', async (original) => {
  const real = await original<typeof import('@/game/navgrid')>();
  return {
    ...real,
    findPath: (...a: Parameters<typeof real.findPath>) => { H.caps.push(a[4] ?? 4000); return real.findPath(...a); },
  };
});

const HERO: CharacterConfig = { name: 'Sides', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let notes: string[] = [];
let now = 5_000_000;
const was = { x: playerState.x, z: playerState.z };

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  vi.spyOn(audio, 'playAt').mockImplementation((() => null) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: (m: string) => { notes.push(m); }, nodes: [] } as never);
  game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
  useGameStore.setState({ unlocks: [...game().unlocks, 'keep', 'mining'] });
  useEnemyStore.getState().clear();
  notes = [];
  H.caps = [];
  now += 10_000;
  // the player far off, out of every raider's notice (a raider walking in stops for a player within 26 m)
  Object.assign(playerState, { x: 150, z: -150 });
});
afterEach(() => { vi.restoreAllMocks(); newRouteFrame(Infinity); Object.assign(playerState, was); });

/** raise and finish a piece on a socket */
const stand = (socketId: string, partId: string) => {
  game().raiseKeepPart(socketId, partId);
  game().workKeepPart(socketId, 1);
};
/** a keep at (kx, kz), its ring whole and walked all round (turreted corners, crenellated runs), the gatehouse on the
 *  north — shut unless `open` */
const ring = (kx = 0, kz = 0, open = false) => {
  game().foundKeep(kx, kz, 0);
  for (const s of ['nw', 'ne', 'se', 'sw']) stand(s, 'corner_turret');
  for (const s of ['e', 's', 'w']) stand(s, 'wall_crenel');
  stand('n', 'gatehouse');
  if (!open) game().toggleSiteGate('keep', 'n');
};
const grid = () => rebuildNav(game().buildings);
const piece = (id: string, type: string, x: number, z: number, rot: 0 | 1 = 0): PlacedBuilding => ({ id, type, x, z, y: 0, rot, built: 1, world: null });
/** a square ring of the player's palisades (4 m each) of half-side `h` round (cx, cz), with `south` in its south
 *  side just west of its middle (2 m west of it): another palisade, or a gate */
const palisadeRing = (cx: number, cz: number, h: number, south: 'palisade' | 'gate'): PlacedBuilding[] => {
  const out: PlacedBuilding[] = [];
  for (let a = -h + 2; a <= h - 2; a += 4) {
    out.push(piece(`n${a}`, 'palisade', cx + a, cz - h));
    out.push(piece(`w${a}`, 'palisade', cx - h, cz + a, 1), piece(`e${a}`, 'palisade', cx + h, cz + a, 1));
    out.push(a === -2 && south === 'gate' ? piece('gate', 'gate', cx + a, cz + h) : piece(`s${a}`, 'palisade', cx + a, cz + h));
  }
  return out;
};
/** four pieces of the player's own, far off: the homestead is established */
const established = (): PlacedBuilding[] => [0, 1, 2, 3].map((i) => piece('far' + i, 'palisade', 120 + i * 4, -120));
/** the raid director's ticks, as Enemies.tsx's 1 Hz frame runs them, at dusk, with the dice at `dice`: the roll forced
 *  (G-04), and on through the warning to the raiders' arrival */
const startRaid = (dice = 0.999) => {
  vi.spyOn(Math, 'random').mockImplementation(() => dice);
  raidActive.current = false;
  raidCooldown.current = 0;
  worldEnv.time = 0.71;
  raidForce.current = true;
  do raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
  while (raidPlan.incoming > 0);
  vi.mocked(Math.random).mockRestore();
};
const raiders = () => useEnemyStore.getState().enemies.filter((e) => e.raid);

type Mob = EnemyData['mob'];
const raider = (x: number, z: number, o: Partial<EnemyData> = {}, m: Partial<Mob> = {}): EnemyData =>
  ({ id: 7, kind: 'bandit', hp: 8, scale: 1, raid: true, world: null, ...o,
    mob: { x, z, yaw: 0, state: 'chase', attackCd: 1, wanderT: 1, homeX: x, homeZ: z, dieT: 0, ...m } } as EnemyData);
/** an enemy's frame (step.ts), at home */
const frameOf = (data: EnemyData) => ({
  data, group: { current: new THREE.Group() }, rigRef: { current: null }, scatter: { current: null },
  path: { current: { pts: [], i: 0, t: 0, tx: 0, tz: 0 } as Route }, clip: '', setClip: () => {},
  pace: { current: { x: 0, z: 0, v: 0 } }, setRidePace: () => {}, remove: () => {}, enemyAtHome: (data.world ?? null) === null, speed: 2.7,
});
/** inside a keep piece's box grown by `r` */
const inKeep = (x: number, z: number, r = 0) => keepSolids(null).some((s) => pushOutOfBox(s, x, z, r) !== null);
/** the smallest angle between two bearings */
const turn = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

describe('a raid comes from its own sides', () => {
  it('two sides or three — the road\'s always — and its raiders spread over two at the least, over 20 days', () => {
    grid();
    const entry = roadEntry();
    const road = bearingFromHome(entry.x, entry.z);
    const kinds = new Set<string>();
    for (let day = 0; day < 20; day++) {
      const seed = raidSeedFor(day);
      const sides = raidSides(seed);
      expect(sides[0]).toBeCloseTo(road, 9);
      expect([2, 3]).toContain(sides.length);
      kinds.add(`${sides.length}:${Math.sign(sides[1] - road)}`);
      const taken = new Set<number>();
      for (let i = 0; i < 3; i++) {
        const at = approachPoint(entry, sides, i, 100 + day * 3 + i, seed)!;
        expect(navBlocked(at.x, at.z)).toBe(false);
        expect(navReachable(entry.x, entry.z, at.x, at.z)).toBe(true);
        expect(Math.hypot(at.x - HOME_X, at.z - HOME_Z)).toBeGreaterThan(APPROACH_RING - 2);
        // the side it lies on: the nearest of the raid's (they lie 75 degrees apart; a point strays 15 and a cell)
        const b = bearingFromHome(at.x, at.z);
        const side = sides.reduce((k, s, j) => (turn(b, s) < turn(b, sides[k]) ? j : k), 0);
        expect(turn(b, sides[side])).toBeLessThan(0.4);
        taken.add(side);
      }
      expect(taken.size).toBeGreaterThanOrEqual(2);
    }
    // both flanks, and raids of two sides and of three, among the 20
    expect(kinds.size).toBe(4);
  });

  it('the day\'s seed draws the same sides; the director keeps them and gives each raider his own point', () => {
    useGameStore.setState({ buildings: established() });
    grid();
    worldEnv.dayCount = 5;
    startRaid();
    expect(raidPlan.seed).toBe(raidSeedFor(5));
    expect(raidPlan.sides).toEqual(raidSides(raidSeedFor(5)));
    const rs = raiders();
    // G-06 · as many as the stores are worth (this file's 1,180: the leader and three)
    expect(rs).toHaveLength(1 + raidSize(stockpileValue(game().inventory)));
    expect(rs).toHaveLength(4);
    rs.forEach((e, i) => {
      const at = approachPoint(e.mob, raidPlan.sides, i, e.id, raidPlan.seed)!;
      expect([e.mob.approachX, e.mob.approachZ, e.mob.approaching]).toEqual([at.x, at.z, true]);
    });
    expect(new Set(rs.map((e) => Math.round(bearingFromHome(e.mob.approachX!, e.mob.approachZ!) * 10))).size).toBeGreaterThan(1);
    expect(raidSides(raidSeedFor(5))).toEqual(raidSides(raidSeedFor(5)));
    expect(raidSeedFor(5)).not.toBe(raidSeedFor(6));
  });

  it('a point shut off from him, in a keep standing shut on the ring, is looked for further out', () => {
    const entry = roadEntry();
    const sides = [bearingFromHome(entry.x, entry.z)];
    // the keep with its middle where the road side's point on the ring would be
    ring(Math.cos(sides[0]) * APPROACH_RING, Math.sin(sides[0]) * APPROACH_RING);
    grid();
    const at = approachPoint(entry, sides, 0, 1, 0)!;
    expect(siteCovers(siteById(game(), KEEP_SITE_ID)!, at.x, at.z)).toBe(false);
    expect(navReachable(entry.x, entry.z, at.x, at.z)).toBe(true);
  });
});

describe('the walk in', () => {
  it('ends at his own point, not 30 m from home; a raider with none walks in to home as before', () => {
    grid();
    const data = raider(-12.8, 64, {}, { approaching: true, approachX: 20, approachZ: 10 });
    const f = frameOf(data);
    for (let i = 0; i < 1200 && data.mob.approaching; i++) stepEnemy(f, 0.05);
    expect(data.mob.approaching).toBe(false);
    expect(Math.hypot(data.mob.x - 20, data.mob.z - 10)).toBeLessThan(3);
    // he turns on a player who meets him on his way, further out from home than his point — not on one further in
    const meet = raider(15, 25, {}, { approaching: true, approachX: 20, approachZ: 10 });
    Object.assign(playerState, { x: -5, z: 15 }); // 22.4 m off him, 15.8 from home; his point 22.4 from home
    stepEnemy(frameOf(meet), 0.05);
    expect(meet.mob.approaching).toBe(true);
    Object.assign(playerState, { x: 15, z: 35 }); // 10 m off him, 38 from home
    stepEnemy(frameOf(meet), 0.05);
    expect(meet.mob.approaching).toBe(false);
    Object.assign(playerState, { x: 150, z: -150 });
    const plain = raider(-12.8, 64, {}, { approaching: true });
    const g = frameOf(plain);
    for (let i = 0; i < 1200 && plain.mob.approaching; i++) stepEnemy(g, 0.05);
    expect(Math.hypot(plain.mob.x - HOME_X, plain.mob.z - HOME_Z)).toBeCloseTo(30, 0);
  });

  it('with his point shut off from him since (in a keep shut round it), walks in to home as one with none does', () => {
    ring();
    grid();
    const data = raider(0, 40, {}, { approaching: true, approachX: 2, approachZ: 2 });
    stepEnemy(frameOf(data), 0.05);
    expect([data.mob.approachX, data.mob.approachZ, data.mob.approaching]).toEqual([undefined, undefined, true]);
  });

  it('goes round a keep standing across his way, never through it, searched to the end', () => {
    // the keep's middle on the straight line from the road's entry to his point
    ring(-6.4, 42);
    grid();
    const data = raider(-12.8, 64, {}, { approaching: true, approachX: 0, approachZ: 20 });
    const f = frameOf(data);
    let inside = 0;
    for (let i = 0; i < 1200 && data.mob.approaching; i++) {
      stepEnemy(f, 0.05);
      if (inKeep(data.mob.x, data.mob.z)) inside++;
    }
    expect([data.mob.approaching, inside]).toEqual([false, 0]);
    expect(H.caps.length).toBeGreaterThan(0);
    for (const cap of H.caps) expect(Number.isFinite(cap)).toBe(true);
  });

  it.each([
    ['walking in', { approaching: true, approachX: 0, approachZ: 40 }],
    ['fleeing', { fleeing: true }],
  ])('is put back out of the keep\'s walls %s, and out of a shut gate of his own world only', (_, m) => {
    ring();
    grid();
    // the player 26-44 m off: out of a walking-in raider's notice, and not so far that a fleeing one is gone
    Object.assign(playerState, { x: 0, z: -30 });
    // 0.4 m inside the south run's outer face
    const data = raider(0, 7.6, {}, m as Partial<Mob>);
    stepEnemy(frameOf(data), 0.05);
    expect(inKeep(data.mob.x, data.mob.z)).toBe(false);
    // a shut gate of the player's at home, and an enemy at a destination standing on its coordinates
    useGameStore.setState({ buildings: [piece('g1', 'gate', 40, 40)], gateOpen: { g1: false } });
    Object.assign(playerState, { x: 40, z: 10 });
    const away = raider(40, 40.2, { world: 'template-01' }, m as Partial<Mob>);
    const home = raider(40, 40.2, {}, m as Partial<Mob>);
    stepEnemy(frameOf(away), 0.05);
    stepEnemy(frameOf(home), 0.05);
    expect(Math.abs(home.mob.z - 40)).toBeGreaterThanOrEqual(1.5);
    expect(Math.abs(away.mob.z - 40)).toBeLessThan(1.5);
  });
});

describe('the ram comes by the road', () => {
  it('starts back along the road past where the raiders step on, on open ground', () => {
    grid();
    const entry = roadEntry();
    const at = ramSpawn();
    expect(navBlocked(at.x, at.z)).toBe(false);
    expect(at.x).toBeCloseTo(entry.x, 0);
    expect(at.z - entry.z).toBeGreaterThan(6); // the road runs on south out of the map from its entry
    useGameStore.setState({ buildings: established() });
    startRaid(0.2); // a ram: < 0.4
    expect([raiderRamState.active, raiderRamState.x, raiderRamState.z]).toEqual([true, at.x, at.z]);
  });

  it('rolls a way round the keep to its shut gatehouse, clear of the walls, and bursts it open', () => {
    ring();
    grid();
    const at = ramSpawn();
    resetRaiderRam(at.x, at.z);
    let inside = 0;
    for (let i = 0; i < 4000 && !notes.includes('The ram bursts the gatehouse open!'); i++) {
      rollRaiderRam(game(), 0.05);
      now += 50;
      ramCheck('raider_ram', raiderRamState.x, raiderRamState.z);
      if (inKeep(raiderRamState.x, raiderRamState.z, 0.5)) inside++;
    }
    expect(notes).toContain('The ram bursts the gatehouse open!');
    expect(inside).toBe(0);
    expect(raiderRamState.z).toBeLessThan(-8); // at the gatehouse, on the far side of the keep from the road
  });
});

describe('the ladder goes up where they are', () => {
  it('against the wall-walk nearest the middle of the raiders\' points', () => {
    ring(0, 0, true);
    useGameStore.setState({ buildings: established() });
    grid();
    for (const day of [0, 1, 2, 3]) {
      useEnemyStore.getState().clear();
      raiderLadderState.active = false;
      worldEnv.dayCount = day;
      startRaid(0.2); // a ladder: < 0.25 at the first tier
      const rs = raiders();
      const mean = {
        x: rs.reduce((a, e) => a + e.mob.approachX!, 0) / rs.length,
        z: rs.reduce((a, e) => a + e.mob.approachZ!, 0) / rs.length,
      };
      const site = siteById(game(), KEEP_SITE_ID)!;
      const away = (id: string) => { const w = siteSocketWorld(site, id)!; return Math.hypot(w.x - mean.x, w.z - mean.z); };
      const walks = ['nw', 'ne', 'se', 'sw', 'e', 's', 'w'];
      expect(raiderLadderState.active).toBe(true);
      expect(raiderLadderState.targetSocketId).toBe(walks.reduce((a, b) => (away(b) < away(a) ? b : a)));
      // the raiders come from the road's side, the south: so does the ladder
      expect(['s', 'se', 'sw']).toContain(raiderLadderState.targetSocketId);
    }
  });
});

describe('shut off from his mark, a raider batters a way through: the keep\'s gatehouse, a gate of the player\'s, a wall', () => {
  it('behind the player\'s ring, makes for its shut gate; with none, the nearest wall; with the gate open, has a way', () => {
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'gate'), gateOpen: { gate: false } });
    grid();
    expect(navReachable(60, -40, 60, -60)).toBe(false);
    const way = siegeWay(game(), 60, -40, 60, -60)!;
    expect(way.at(-1)).toEqual({ x: 58, z: -60 + 8 + 1 + 0.6 }); // the gate's outer face (2 m deep)
    expect(way.length).toBeGreaterThan(1);
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'palisade') });
    grid();
    expect(siegeWay(game(), 64, -40, 60, -60)!.at(-1)).toEqual({ x: 62, z: -60 + 8 + 0.25 + 0.6 });
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'gate'), gateOpen: { gate: true } });
    grid();
    expect(navReachable(60, -40, 60, -60)).toBe(true);
    expect(siegeWay(game(), 60, -40, 60, -60)).toBeNull();
  });

  it('the keep\'s gatehouse before a gate of the player\'s; and through the player\'s ring round the keep first', () => {
    ring();
    useGameStore.setState({ buildings: palisadeRing(40, 0, 8, 'gate'), gateOpen: { gate: false } });
    grid();
    expect(siegeWay(game(), 0, 30, 2, 2)!.at(-1)!.z).toBeCloseTo(-8.6, 9);
    // the player's ring round the keep, its gate shut: the keep's own faces lie inside it, out of his reach
    useGameStore.setState({ buildings: palisadeRing(0, 0, 16, 'gate'), gateOpen: { gate: false } });
    grid();
    expect(siegeWay(game(), 0, 30, 2, 2)!.at(-1)).toEqual({ x: -2, z: 16 + 1 + 0.6 });
  });

  it('batters the player\'s gate he stands against down to a ruin to rebuild, never to rubble', () => {
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'gate'), gateOpen: { gate: false } });
    const data = raider(58, -60 + 8 + 1 + 0.5);
    const hit = keepInReach(data, game(), true).target!;
    expect(hit.buildingId).toBe('gate');
    for (let i = 0; i < 40 && game().buildings.find((b) => b.id === 'gate')!.built !== 0; i++) batterKeep(data, game(), hit);
    const gate = game().buildings.find((b) => b.id === 'gate')!;
    expect([gate.built, gate.ruin]).toEqual([0, true]);
    // standing open, a gate is the way through, not a thing to batter
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'gate'), gateOpen: { gate: true } });
    expect(keepInReach(data, game(), true).target).toBeNull();
  });

  it('shut in the bailey as the gatehouse shuts, makes for its inner face — else the nearest piece\'s — and batters out', () => {
    ring();
    grid();
    const way = siegeWay(game(), 2, 2, 0, 30)!;
    expect(way.at(-1)!.x).toBeCloseTo(0, 9);
    expect(way.at(-1)!.z).toBeCloseTo(-6.8 + 1.2 + 0.6, 9);
    const route: Route = { pts: [], i: 0, t: 0, tx: 0, tz: 0 };
    makePathStep(route, raider(2, 2).mob, 0.1, true)(0, 30);
    expect([route.pts.at(-1), route.siege]).toEqual([way.at(-1), true]);
    expect(keepInReach(raider(0, -5.1), game(), true).target?.socketId).toBe('n');
    // no gatehouse: the inner face of the piece nearest him, the east run
    useGameStore.setState({ keep: { ...game().keep!, parts: { ...game().keep!.parts, n: 'wall_crenel' } } });
    grid();
    const out = siegeWay(game(), 4.5, 0, 0, 30)!.at(-1)!;
    expect([out.x, out.z]).toEqual([expect.closeTo(6.8 - 1.2 - 0.6, 9), expect.closeTo(0, 9)]);
  });

  it('shut in, walks right up to the gatehouse and lands his blows on it, the player behind him outside', () => {
    ring();
    grid();
    Object.assign(playerState, { x: 0, z: 20 }); // south of the keep, 18 m off him: his mark, behind him
    const data = raider(2, 2);
    const f = frameOf(data);
    for (let i = 0; i < 400 && game().keep!.hp?.n === undefined; i++) stepEnemy(f, 0.05);
    // (he turned back toward the player 1.1 m short of the ground he batters from, and never landed one)
    expect(game().keep!.hp?.n).toBeDefined();
    expect(data.mob.z).toBeLessThan(-4);
  });

  it('once he has battered the player\'s shut gate to a ruin, walks in through it', () => {
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'gate'), gateOpen: { gate: false } });
    const hitter = raider(58, -60 + 8 + 1 + 0.5);
    for (let i = 0; i < 40 && game().buildings.find((b) => b.id === 'gate')!.built !== 0; i++) {
      batterKeep(hitter, game(), keepInReach(hitter, game(), true).target!);
    }
    grid();
    expect(game().gateOpen.gate).toBe(false); // a ruin keeps its gate's record, shut
    Object.assign(playerState, { x: 60, z: -60 });
    const data = raider(58, -60 + 8 + 4);
    const f = frameOf(data);
    let inside = false;
    for (let i = 0; i < 200 && !inside; i++) {
      stepEnemy(f, 0.05);
      inside = Math.abs(data.mob.x - 60) < 7 && Math.abs(data.mob.z + 60) < 7;
    }
    // (the ruin's shut record held him at its outer face for good, though the grid had it open)
    expect(inside).toBe(true);
  });

  it('walking in to a home ringed past every approach point, batters its shut gate rather than stand at it', () => {
    // the ring's 40 m half-side takes in every point of the approach ring: he walks in with none, to home's middle
    useGameStore.setState({ buildings: palisadeRing(0, 0, 40, 'gate'), gateOpen: { gate: false } });
    grid();
    Object.assign(playerState, { x: 0, z: 0 }); // inside, 40 m and more from him: out of his notice
    const from = roadEntry();
    expect(approachPoint(from, raidSides(raidSeedFor(0)), 0, 7, raidSeedFor(0))).toBeNull();
    const data = raider(from.x, from.z, {}, { approaching: true });
    const f = frameOf(data);
    const gate = () => game().buildings.find((b) => b.id === 'gate')!;
    for (let i = 0; i < 1200 && gate().built === 1; i++) stepEnemy(f, 0.05);
    // (walking in still, his route a siege way, he stood on the ground he batters from for good: the raid never ended)
    expect(data.mob.approaching).toBe(false);
    expect(gate().built).toBeLessThan(1);
  });

  it('closing in on a guard behind the player\'s shut gate, batters the gate, never walking through the palisades', () => {
    useGameStore.setState({ buildings: palisadeRing(60, -60, 8, 'gate'), gateOpen: { gate: false } });
    grid();
    Object.assign(playerState, { x: 58, z: -64 }); // inside too, further off him than the guard: the guard is his mark
    defenderState.w701 = { x: 63, z: -57, postX: 63, postY: 0, postZ: -57, elevated: false, hp: 10, maxHp: 10, state: 'ok', downedUntil: 0, attackCd: 0, hurtCd: 0 };
    try {
      const data = raider(66, -44); // the palisades, not the gate, on the straight line to the guard
      const f = frameOf(data);
      const gate = () => game().buildings.find((b) => b.id === 'gate')!;
      let inside = 0;
      for (let i = 0; i < 400 && gate().built === 1; i++) {
        stepEnemy(f, 0.05);
        if (Math.abs(data.mob.x - 60) < 7.5 && Math.abs(data.mob.z + 60) < 7.5) inside++;
      }
      // (straight at a guard outside the keep, he walked through the player's palisades to him)
      expect([inside, (gate().built ?? 1) < 1]).toEqual([0, true]);
    } finally {
      delete defenderState.w701;
    }
  });
});

describe('the walls\' path and grid work is bounded', () => {
  it('no more than ROUTES_PER_FRAME raiders\' routes a frame; the rest keep theirs and ask the next frame', () => {
    grid();
    const routes = [0, 1, 2].map((): Route => ({ pts: [], i: 0, t: 0, tx: 0, tz: 0 }));
    newRouteFrame();
    routes.forEach((r) => makePathStep(r, raider(0, 30).mob, 0.016, true)(5, 5));
    expect(routes.map((r) => r.tx)).toEqual([5, 5, 0].map((v, k) => (k < ROUTES_PER_FRAME ? v : 0)));
    newRouteFrame();
    makePathStep(routes[2], raider(0, 30).mob, 0.016, true)(5, 5);
    expect(routes[2].tx).toBe(5);
    // and a chase that is not a raider's at home is not counted
    newRouteFrame(0);
    const chase: Route = { pts: [], i: 0, t: 0, tx: 0, tz: 0 };
    makePathStep(chase, raider(0, 30).mob, 0.016)(5, 5);
    expect(chase.tx).toBe(5);
  });

  it('keeps the keep\'s solids list through a siege\'s blows, and makes a new one when a piece goes down', () => {
    ring();
    const whole = keepSolids(null);
    game().damageKeepPart('s', 5, 'was battered');
    expect(game().keep!.hp?.s).toBeDefined();
    expect(keepSolids(null)).toBe(whole);
    game().damageKeepPart('s', 9999, 'was battered');
    expect(keepSolids(null)).not.toBe(whole);
    expect(keepSolids(null)).toHaveLength(whole.length - 1);
  });
});
