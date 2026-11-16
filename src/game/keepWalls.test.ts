import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { audio } from '@/lib/audio';
import { findPath, hasLineOfSight, navBlocked, navReachable, rebuildNav } from './navgrid';
import { collide } from './playerPhysics/collide';
import { keepFloorTrack, photoReturn } from './playerPhysics/locomotion';
import { newFloorTrack } from './playerPhysics/vertical';
import { keepInReach, siegeWay, SIEGE_RETARGETS } from './enemyAi/targeting';
import { makePathStep, stopAtKeepWalls } from './enemyAi/movement';
import { stepEnemy } from './enemyAi/step';
import type { Route } from './enemyAi/frame';
import { ramCheck } from './siege';
import { raiderRamGate } from './raiderRam';
import { fortState, refreshFort } from './fort';
import { findTarget } from './interaction/findTarget';
import { performAction } from './interaction/performAction';
import { wideSolids } from './nav/wideSolids';
import { playerState } from './playerState';
import { PLAYER_RADIUS } from './data/world';
import { useGameStore } from './store/gameStore';
import type { EnemyData } from './combat';
import type { CharacterConfig, PlacedBuilding } from './types';

// Wave 69 (G-02) · the keep's walls stop people. A finished Grand Keep's pieces were no obstacle to anything — the player
// walked through them, the raiders' ways ran through them, an arrow flew through — and now each piece standing is a
// solid (fixedSolids.ts's keepSolids) to the player, the grid, line of sight and the raiders, but a ruin (a breach) and
// a gatehouse standing open; the gatehouse opens and shuts, and a ram bursts it; a raider with no way to his mark inside
// the ring makes for the shut gatehouse, else the nearest piece. And Photo Mode, whose flight went through any wall,
// puts the player back where it found him.
//
// The keep is laid at (0, 0) in each test: corners at (±6, ±6), 4 m square; the runs 8 m by 2.4, the north one's middle
// at (0, -6.8) — its outer face at z = -8, the south run's at z = 8.

// how many ways the home grid is asked for, and (H.noWay) none found
const H = vi.hoisted(() => ({ noWay: false, ways: 0 }));
vi.mock('@/game/navgrid', async (original) => {
  const real = await original<typeof import('@/game/navgrid')>();
  return {
    ...real,
    findPath: (...a: Parameters<typeof real.findPath>) => { H.ways++; return H.noWay ? null : real.findPath(...a); },
  };
});

const HERO: CharacterConfig = { name: 'Walls', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let sounds: string[] = [];
let notes: string[] = [];
let now = 2_000_000;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation(((name: string) => { sounds.push(name); return null; }) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: (m: string) => { notes.push(m); }, nodes: [] } as never);
  game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
  useGameStore.setState({ unlocks: [...game().unlocks, 'keep', 'mining'] });
  sounds = [];
  notes = [];
  H.noWay = false;
  H.ways = 0;
  now += 10_000; // past any ram cooldown
});
afterEach(() => { vi.restoreAllMocks(); });

/** raise and finish a piece on a socket */
const stand = (socketId: string, partId: string) => {
  game().raiseKeepPart(socketId, partId);
  game().workKeepPart(socketId, 1);
};
/** the keep at (0, 0) with its ring whole: four corners (the south-east a turret, its walk 0.6 m above a run's), the east
 *  and south runs crenellated, the west a low run, and on the north `north`: the gatehouse, or a crenellated run */
const ring = (north: 'gatehouse' | 'wall_crenel' = 'gatehouse') => {
  expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
  for (const s of ['nw', 'ne', 'sw']) stand(s, 'corner_block');
  stand('se', 'corner_turret');
  stand('e', 'wall_crenel');
  stand('s', 'wall_crenel');
  stand('w', 'wall_low');
  stand('n', north);
  sounds = [];
  notes = [];
};
const gateOpen = () => game().keep!.gateOpen?.n ?? 'absent';
const shut = () => game().toggleSiteGate('keep', 'n');
/** the player's step to (x, z) on foot, his feet at feetY */
const step = (x: number, z: number, feetY = 0) => collide(game(), false, feetY, x, z);
const grid = () => rebuildNav(game().buildings);

type Mob = EnemyData['mob'];
const raider = (x: number, z: number, o: Partial<EnemyData> = {}, m: Partial<Mob> = {}): EnemyData =>
  ({ id: 7, kind: 'bandit', hp: 8, scale: 1, raid: true, world: null, ...o,
    mob: { x, z, yaw: 0, state: 'chase', attackCd: 1, wanderT: 1, ...m } } as EnemyData);

describe('a finished keep stops walkers (the home grid)', () => {
  it('blocks the cells under its standing pieces and leaves the bailey open; a shut gatehouse seals the ring', () => {
    ring();
    shut();
    grid();
    expect([navBlocked(0, 6.8), navBlocked(6, 6), navBlocked(-6.8, 0), navBlocked(0, -6.8)]).toEqual([true, true, true, true]);
    expect(navBlocked(2, 2)).toBe(false); // the bailey (the hall's socket is bare)
    expect(findPath(0, 20, 2, 2)).toBeNull();
  });

  it('walks through the gatehouse standing open, and through a ruin — a breach — with it shut', () => {
    ring();
    grid();
    expect(gateOpen()).toBe('absent'); // a gatehouse is open until it is shut: no old keep is shut
    expect(navBlocked(0, -6.8)).toBe(false);
    expect(findPath(0, 20, 2, 2)).not.toBeNull();
    shut();
    game().damageKeepPart('e', 999, 'was battered');
    expect(game().keep!.ruined).toEqual({ e: true });
    grid();
    expect([navBlocked(0, -6.8), navBlocked(6.8, 0)]).toEqual([true, false]);
    expect(findPath(0, 20, 2, 2)).not.toBeNull();
  });

  it('leaves a piece still going up open, and stamps it once it is finished', () => {
    expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
    game().raiseKeepPart('s', 'wall_crenel');
    grid();
    expect(navBlocked(0, 6.8)).toBe(false);
    game().workKeepPart('s', 1);
    grid();
    expect(navBlocked(0, 6.8)).toBe(true);
  });

  it('is kept clear of by the merchant\'s wide way too: its solids are a new list whenever the keep changes', () => {
    ring();
    const open = wideSolids(null);
    shut();
    const closed = wideSolids(null);
    expect(closed).not.toBe(open);
    expect(closed.length).toBe(open.length + 1);
    expect(wideSolids(null)).toBe(closed);
  });
});

describe('the player at the keep\'s walls (collide)', () => {
  it('is put back out of a wall at its face, from either side', () => {
    ring();
    const out = step(0, 7.9); // 0.1 m inside the south run's outer face
    expect(out.nx).toBeCloseTo(0, 9);
    expect(out.nz).toBeCloseTo(8 + PLAYER_RADIUS, 9);
    expect(step(0, 5.7).nz).toBeCloseTo(5.6 - PLAYER_RADIUS, 9); // and at its inner face, from the bailey
    expect(step(-6.4, -7.9).nz).toBeCloseTo(-8 - PLAYER_RADIUS, 9); // a corner's
  });

  it('walks the wall walks: on the run\'s, and up the 0.6 m onto the turret\'s; never through the low run', () => {
    ring();
    expect(step(0, 7.9, 3.6)).toEqual({ nx: 0, nz: 7.9 });
    expect(step(4.3, 6.8, 3.6)).toEqual({ nx: 4.3, nz: 6.8 }); // into the south-east turret, from the run's walk
    expect(step(-6.5, 0.5, 2.5)).not.toEqual({ nx: -6.5, nz: 0.5 }); // the low run (3.4 m, no walk), feet at 2.5
  });

  it('passes the gatehouse standing open, is stopped by it shut, and passes a ruin', () => {
    ring();
    expect(step(0, -7.9)).toEqual({ nx: 0, nz: -7.9 });
    shut();
    expect(step(0, -7.9).nz).toBeCloseTo(-8 - PLAYER_RADIUS, 9);
    game().damageKeepPart('n', 999, 'was battered');
    expect(step(0, -7.9)).toEqual({ nx: 0, nz: -7.9 });
  });
});

describe('a sightline at the keep\'s walls', () => {
  it('is stopped by a wall, passes over it from its walk, and through the gatehouse only while it stands open', () => {
    ring();
    expect(hasLineOfSight(0, 1.2, 15, 0, 1.2, 2)).toBe(false);
    expect(hasLineOfSight(0, 3.6 + 1.2, 6.8, 0, 1.2, 20)).toBe(true); // a guard on the south run's walk
    expect(hasLineOfSight(0, 1.2, -15, 0, 1.2, 0)).toBe(true);
    shut();
    expect(hasLineOfSight(0, 1.2, -15, 0, 1.2, 0)).toBe(false);
  });
});

describe('a raider at the keep\'s walls', () => {
  it('is put back out of a wall, half a metre off its face — but not up on its walk', () => {
    ring();
    const m = raider(0, 7.9).mob;
    stopAtKeepWalls(m);
    expect(m.z).toBeCloseTo(8.5, 9);
    const up = raider(0, 7.9, {}, { elevated: true }).mob;
    stopAtKeepWalls(up);
    expect(up.z).toBe(7.9);
  });

  it('batters the piece he is up against anywhere along it — never a gatehouse standing open', () => {
    ring();
    // 0.4 m off the south run's face, 3.5 m along it: 3.8 m from its middle; and not a metre off, on a way past it
    expect(keepInReach(raider(3.5, 8.4), game(), true).target?.socketId).toBe('s');
    expect(keepInReach(raider(0, 9.1), game(), true).target).toBeNull();
    expect(keepInReach(raider(0, -8.4), game(), true).target).toBeNull();
    shut();
    expect(keepInReach(raider(0, -8.4), game(), true).target?.socketId).toBe('n');
    expect(keepInReach(raider(0, -8.4, { raid: false, kind: 'skeleton' }), game(), true).target).toBeNull();
  });

  it('with no way to his mark inside the ring, makes for the shut gatehouse — round the walls, to its face', () => {
    ring();
    shut();
    grid();
    const way = siegeWay(game(), 0, 20, 2, 2)!;
    expect(way.at(-1)!.x).toBeCloseTo(0, 9);
    expect(way.at(-1)!.z).toBeCloseTo(-8.6, 9);
    expect(way.length).toBeGreaterThan(2); // a way round, not a beeline through the south run
    // and so does his chase of the player: makePathStep falls back to it (a raider at home), and notes him shut out —
    // what lets him batter the piece he comes up against (step.ts)
    const route: Route = { pts: [], i: 0, t: 0, tx: 0, tz: 0 };
    makePathStep(route, raider(0, 20).mob, 0.1, true)(2, 2);
    expect([route.pts.at(-1), route.siege]).toEqual([way.at(-1), true]);
    const straight: Route = { pts: [], i: 0, t: 0, tx: 0, tz: 0 };
    makePathStep(straight, raider(0, 20).mob, 0.1)(2, 2);
    expect([straight.pts, straight.siege]).toEqual([[], false]);
    // the gatehouse opened: his way in, through it, and no longer shut out
    shut();
    grid();
    makePathStep(route, raider(0, 20).mob, 2, true)(2, 2); // past its timer
    expect(route.siege).toBe(false);
    expect(route.pts.at(-1)).toEqual({ x: 2.5, z: 2.5 });
  });

  it('far off with the gatehouse open is not shut out — the search gives up at its cap, the way is there — and gets it', () => {
    ring();
    grid();
    // 60 m south of a ring whose gate is on the north: the way round is past the search's cap, which is not no way
    expect(findPath(0, 60, 2, 2)).toBeNull();
    expect(navReachable(0, 60, 2, 2)).toBe(true);
    const route: Route = { pts: [], i: 0, t: 0, tx: 0, tz: 0 };
    makePathStep(route, raider(0, 60).mob, 0.1, true)(2, 2);
    expect(route.siege).toBe(false);
    expect(route.pts.at(-1)).toEqual({ x: 2.5, z: 2.5 });
    // shut, there is none — from far off or from beside it — and he is shut out
    shut();
    grid();
    expect([navReachable(0, 60, 2, 2), navReachable(0, 20, 2, 2), navReachable(0, 60, 30, 30)]).toEqual([false, false, true]);
    makePathStep(route, raider(0, 60).mob, 2, true)(2, 2); // past its timer
    expect(route.siege).toBe(true);
    // and a breach is a way in again
    game().damageKeepPart('e', 999, 'was battered');
    grid();
    expect(navReachable(0, 60, 2, 2)).toBe(true);
  });

  it.each(['the gatehouse opened', 'the east run ruined'])('battering a piece, works out his way again on its timer — %s, he leaves off', (opening) => {
    const was = { x: playerState.x, z: playerState.z };
    playerState.x = 2;
    playerState.z = 2; // the player in the bailey
    try {
      ring();
      shut();
      grid();
      // shut out, he has come up against the south run (0.4 m off its face) and swings at it
      const data = raider(0, 8.4);
      const path = { current: { pts: [], i: 0, t: 0.5, tx: 2, tz: 2, siege: true } as Route };
      const f = { data, group: { current: new THREE.Group() }, rigRef: { current: null }, scatter: { current: null }, path,
        clip: '', setClip: () => {}, pace: { current: { x: 0, z: 0, v: 0 } }, setRidePace: () => {}, remove: () => {},
        enemyAtHome: true, speed: 2.7 };
      const frames = (n: number) => { for (let i = 0; i < n; i++) stepEnemy(f, 0.05); };
      frames(30); // past his route's timer: still shut out, so still at it
      expect([data.mob.state, path.current.siege]).toEqual(['attack', true]);
      expect(game().keep!.hp?.s).toBeDefined();
      if (opening === 'the gatehouse opened') shut();
      else game().damageKeepPart('e', 999, 'was battered');
      grid();
      const hp = game().keep!.hp?.s;
      frames(30);
      expect([data.mob.state, path.current.siege, game().keep!.hp?.s]).toEqual(['chase', false, hp]);
    } finally {
      Object.assign(playerState, was);
    }
  });

  it('with no gatehouse, makes for the nearest piece; with no mark inside, or nothing standing, keeps his own way', () => {
    ring('wall_crenel');
    grid();
    const way = siegeWay(game(), 0, 20, 2, 2)!;
    expect(way.at(-1)!.z).toBeCloseTo(8.6, 9); // outside the south run, the nearest
    expect(siegeWay(game(), 0, 20, 30, 30)).toBeNull();
    useGameStore.setState({ keep: { ...game().keep!, parts: {}, built: {} } });
    expect(siegeWay(game(), 0, 20, 2, 2)).toBeNull();
  });

  it('tries a way to at most SIEGE_RETARGETS pieces, the gatehouse first; with none, goes straight at the nearest', () => {
    ring();
    shut();
    H.noWay = true;
    H.ways = 0;
    const way = siegeWay(game(), 3, 20, 2, 2)!;
    expect(H.ways).toBe(SIEGE_RETARGETS);
    expect(way).toHaveLength(1);
    expect(way[0].x).toBeCloseTo(0, 9);
    expect(way[0].z).toBeCloseTo(8.6, 9); // the south run, nearest him
  });
});

describe('the gatehouse opens and shuts', () => {
  it('shuts and opens on its own action, a standing gatehouse only', () => {
    ring();
    shut();
    expect(gateOpen()).toBe(false);
    expect(notes).toEqual(['The gatehouse grinds shut.']);
    expect(sounds).toEqual(['portcullis']);
    shut();
    expect(gateOpen()).toBe(true);
    game().toggleSiteGate('keep', 's'); // a wall run is no gate
    expect(game().keep!.gateOpen).toEqual({ n: true });
    game().damageKeepPart('n', 999, 'was battered');
    shut(); // nor is a ruin
    expect(gateOpen()).toBe(true);
  });

  it('is burst open by a ram when shut, and passed by when open', () => {
    ring();
    shut();
    notes = [];
    sounds = [];
    ramCheck('raider_ram', 0, -8.5);
    expect(gateOpen()).toBe(true);
    expect(game().keep!.hp).toBeUndefined();
    expect(notes).toContain('The ram bursts the gatehouse open!');
    expect(sounds).toContain('ram');
    now += 1000;
    sounds = [];
    ramCheck('raider_ram', 0, -8.5);
    expect(sounds).toEqual([]);
    expect(game().keep!.hp).toBeUndefined();
  });

  it('is what the raiders\' ram makes for when shut, after any shut gate of the player\'s own', () => {
    ring();
    expect(raiderRamGate(game().buildings, game().gateOpen, game().keep)).toBeUndefined();
    shut();
    const at = raiderRamGate(game().buildings, game().gateOpen, game().keep)!;
    expect(at.id).toBe('keep:n');
    expect(at.x).toBeCloseTo(0, 9);
    expect(at.z).toBeCloseTo(-6.8, 9);
    const gate: PlacedBuilding = { id: 'g1', type: 'gate', x: 20, z: 20, y: 0, rot: 0, built: 1, world: null };
    expect(raiderRamGate([gate], { g1: false }, game().keep)?.id).toBe('g1');
  });

  it('offers its Open / Close at its own height, and a battered one\'s repair beside it, at its foot', () => {
    ring();
    const camera = new THREE.PerspectiveCamera();
    const aimed = (lx: number, ly: number, lz: number) => {
      camera.position.set(0, 1.6, -9.6);
      camera.lookAt(lx, ly, lz);
      camera.updateMatrixWorld(true);
      return findTarget({ camera, pos: { current: camera.position.clone() } }, game());
    };
    const offered = (lx: number, ly: number, lz: number) => {
      const t = aimed(lx, ly, lz);
      return t && [t.kind, t.site, t.label];
    };
    expect(offered(0, 1.6, -6.8)).toEqual(['gate', 'keep', 'Close the Gatehouse']);
    // taken up, it shuts the gatehouse (performAction's gate branch, by the target's site)
    const ctx = { grounded: { current: true }, pos: { current: new THREE.Vector3() }, talkCooldown: { current: 0 },
      vel: { current: new THREE.Vector3() }, yaw: { current: 0 } };
    performAction(ctx, aimed(0, 1.6, -6.8)!, game());
    expect(gateOpen()).toBe(false);
    game().damageKeepPart('n', 10, 'was battered');
    expect(offered(0, 1.6, -6.8)).toEqual(['gate', 'keep', 'Open the Gatehouse']);
    expect(offered(0, 0, -6.8)).toEqual(['repair', 'keep', expect.stringMatching(/^Repair Gatehouse \(26\/36\)/)]);
  });

  it('is a hole in the fort\'s seal standing open, as a raised gate is, and closes it shut', () => {
    ring();
    useGameStore.setState({ buildings: [...game().buildings, { id: 'w9', type: 'stonewall', x: 20, z: -20, rot: 0, built: 1, world: null }] });
    refreshFort(true);
    expect(fortState.enclosed).toBe(false);
    shut();
    refreshFort(true);
    expect(fortState.enclosed).toBe(true);
  });
});

describe('Photo Mode puts the player back', () => {
  const at = (x: number, y: number, z: number) => ({ current: new THREE.Vector3(x, y, z) });

  it('where it found him, on the ground or not, wherever its flight took him', () => {
    const pos = at(1, 1.6, 2), grounded = { current: true }, vel = { current: new THREE.Vector3(0, -3, 0) };
    photoReturn(true, false, pos, grounded, vel);
    pos.current.set(1, 5, -10); // flown over the wall, into the bailey
    grounded.current = false;
    photoReturn(true, false, pos, grounded, vel);
    photoReturn(false, false, pos, grounded, vel);
    expect([pos.current.toArray(), grounded.current, vel.current.toArray()]).toEqual([[1, 1.6, 2], true, [0, 0, 0]]);
    expect(playerState.photoFrom).toBeNull();
    pos.current.set(4, 1.6, 4);
    photoReturn(false, false, pos, grounded, vel); // and leaves him be after
    expect(pos.current.toArray()).toEqual([4, 1.6, 4]);
  });

  it('keeps a relocation made while it is on (knocked out, carried to camp)', () => {
    const pos = at(1, 1.6, 2), grounded = { current: true }, vel = { current: new THREE.Vector3() };
    photoReturn(true, false, pos, grounded, vel);
    pos.current.set(30, 1.6, 30);
    photoReturn(true, true, pos, grounded, vel);
    pos.current.set(31, 4, 30);
    photoReturn(false, false, pos, grounded, vel);
    expect(pos.current.toArray()).toEqual([30, 1.6, 30]);
  });

  it('and walk\'s floor track is begun afresh after a frame walk did not run (Photo Mode, an engine), kept otherwise', () => {
    const track = { current: { ...newFloorTrack(), x: 5, z: 5, y: 0.4, grade: 0.2 } };
    const walked = { current: true };
    const held = track.current;
    keepFloorTrack(true, walked, track);
    expect(track.current).toBe(held);
    keepFloorTrack(false, walked, track); // a frame of flight
    expect([track.current, walked.current]).toEqual([held, false]);
    keepFloorTrack(true, walked, track);
    expect(track.current).toEqual(newFloorTrack());
    expect(walked.current).toBe(true);
  });
});
