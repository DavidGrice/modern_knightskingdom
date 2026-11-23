import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// G-08 · golden tests of the defenders' standing orders (Defenders.tsx's order branches), written on the base before
// the rally order joined them and kept unchanged after: patrol, attack, scout and follow each move and strike as they
// did. The component is called as a plain function on just enough of React to keep its refs and state between calls
// (a slot per hook; effects are not run), a store's hook selects from the state as it is, and the frame loop it hands
// useFrame is collected, so a test runs it.
type Frame = (state: unknown, dt: number) => void;
const H = vi.hoisted(() => ({
  inst: null as null | { slots: unknown[]; i: number; frames: Frame[] },
  player: { x: 10, y: 0, z: 10, yaw: 0, pitch: 0 },
  /** stands in for the real sightline where a test sets it (navgrid's hasLineOfSight) */
  los: null as null | ((fromX: number, fromY: number, fromZ: number) => boolean),
}));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  const slot = <T,>(make: () => T): [T, number] => {
    const c = H.inst!;
    const i = c.i++;
    if (!(i in c.slots)) c.slots[i] = make();
    return [c.slots[i] as T, i];
  };
  return {
    ...real,
    useState: (init: unknown) => {
      const c = H.inst!;
      const [value, i] = slot(() => init);
      return [value, (next: unknown) => { c.slots[i] = typeof next === 'function' ? (next as (v: unknown) => unknown)(c.slots[i]) : next; }];
    },
    useRef: (value: unknown) => slot(() => ({ current: value }))[0],
    useMemo: (make: () => unknown) => slot(make)[0],
    useEffect: () => {},
  };
});
vi.mock('zustand', async () => {
  const { createStore } = await import('zustand/vanilla');
  const bind = (init: never) => {
    const api = createStore(init);
    return Object.assign((select: (s: unknown) => unknown = (s) => s) => select(api.getState()), api);
  };
  return { create: (init?: never) => (init ? bind(init) : bind) };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (cb: Frame) => { H.inst!.frames.push(cb); }, createPortal: () => null }));
vi.mock('../character/RiggedFigure', () => ({ default: 'RiggedFigure' }));
vi.mock('../character/LoadoutGear', () => ({ default: 'LoadoutGear' }));
vi.mock('./RiggedProp', () => ({ default: 'RiggedProp', fireProp: () => {} }));
vi.mock('../fps/PlayerController', () => ({ default: 'PlayerController', playerState: H.player }));
vi.mock('@/game/playerState', async (original) => ({ ...(await original<object>()), playerState: H.player }));
vi.mock('./TemplateWorld', () => ({ homeGroundY: () => 0, destinationGroundY: () => 0 }));
vi.mock('@/game/navgrid', async (original) => {
  const real = await original<typeof import('@/game/navgrid')>();
  return {
    ...real,
    hasLineOfSight: (...a: Parameters<typeof real.hasLineOfSight>) => (H.los ? H.los(a[0], a[1], a[2]) : real.hasLineOfSight(...a)),
  };
});

import Defenders from './Defenders';
import { defenderOrders, defenderState, registerDefender, resetDefenders } from '@/game/defenders';
import { RALLY_HOLD } from '@/game/rally';
import { GROUND_LOS_Y, rebuildNav } from '@/game/navgrid';
import { keepSolids, pushOutOfBox } from '@/game/fixedSolids';
import { useEnemyStore, type EnemyData } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import type { Villager } from '@/game/types';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
interface El<P = Record<string, unknown>> { type: unknown; props: P }
let notes: string[] = [];

/** one defender's figure, as Defenders draws it, with a real group behind its ref */
function guard(v: Partial<Villager> = {}, others: Villager[] = []) {
  const villager = { id: 'g1', name: 'Ada', job: 'defender', level: 1, loadout: 'sword_shield', world: null, ...v } as Villager;
  useGameStore.setState({ villagers: [villager, ...others] } as never);
  const root = (Defenders as unknown as () => El<{ children: El<{ villager: Villager }>[] }>)();
  const element = root.props.children[0];
  const inst = { slots: [] as unknown[], i: 0, frames: [] as Frame[] };
  const group = new THREE.Group();
  const render = () => {
    H.inst = inst;
    inst.i = 0;
    inst.frames = [];
    try {
      const out = (element.type as (p: unknown) => El<{ ref: { current: unknown } }>)(element.props);
      out.props.ref.current = group;
    } finally { H.inst = null; }
  };
  return {
    ds: () => defenderState[villager.id],
    /** `n` frames of 1/30 s, a render before each (as the enemies' store changes, React renders it again); where he
     *  stood every 15 frames, to the centimetre */
    run(n: number): string[] {
      const track: string[] = [];
      for (let f = 1; f <= n; f++) {
        render();
        inst.frames[0]({}, 1 / 30);
        if (f % 15 === 0) track.push(`${this.ds().x.toFixed(2)} ${this.ds().z.toFixed(2)}`);
      }
      return track;
    },
  };
}
function bandit(x: number, z: number): EnemyData {
  useEnemyStore.getState().spawn('bandit', x, z, false, undefined, false, false, 1, false, null);
  return useEnemyStore.getState().enemies.at(-1)!;
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
  vi.spyOn(Date, 'now').mockImplementation(() => 1_000_000);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  useGameStore.getState().newGame(HERO as never);
  notes = [];
  useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
  useEnemyStore.getState().clear();
  resetDefenders(new Set());
  Object.assign(H.player, { x: 10, y: 0, z: 10, yaw: 0, pitch: 0 });
  worldEnv.time = 0.95; // the night watch
});
afterEach(() => { vi.restoreAllMocks(); H.los = null; });

describe('the standing orders, as they were before the rally order', () => {
  it('patrol: walks the rounds about his post with nothing to fight', () => {
    expect(guard().run(120)).toMatchInlineSnapshot(`
      [
        "5.36 0.07",
        "5.73 0.78",
        "6.07 1.51",
        "6.37 2.25",
        "6.62 3.01",
        "6.84 3.78",
        "7.00 4.56",
        "7.11 5.36",
      ]
    `);
  });

  it('patrol: spots a raider within 22 m, closes and strikes', () => {
    const g = guard();
    g.run(1);
    const e = bandit(g.ds().x + 12, g.ds().z);
    const track = g.run(150);
    expect({ track, hp: e.hp }).toMatchInlineSnapshot(`
      {
        "hp": 5,
        "track": [
          "6.14 -0.57",
          "7.29 -0.57",
          "8.44 -0.57",
          "9.59 -0.57",
          "10.74 -0.57",
          "11.89 -0.57",
          "13.04 -0.57",
          "14.19 -0.57",
          "15.26 -0.57",
          "15.26 -0.57",
        ],
      }
    `);
  });

  it('attack: converges on the raider nearest the player, from any distance', () => {
    const g = guard();
    g.run(1);
    defenderOrders.order = 'attack';
    const e = bandit(H.player.x + 1, H.player.z + 2);
    const near = bandit(g.ds().x + 4, g.ds().z); // nearer him, but not the player
    const track = g.run(150);
    expect({ track, hp: e.hp, nearHp: near.hp }).toMatchInlineSnapshot(`
      {
        "hp": 5,
        "nearHp": 8,
        "track": [
          "5.64 0.78",
          "6.28 2.14",
          "6.93 3.49",
          "7.58 4.84",
          "8.22 6.20",
          "8.87 7.55",
          "9.52 8.90",
          "10.17 10.26",
          "10.25 10.44",
          "10.25 10.44",
        ],
      }
    `);
  });

  it('scout: the wide sweep at a jog, and a raider sighted once by name', () => {
    const g = guard();
    g.run(1);
    defenderOrders.order = 'scout';
    const e = bandit(g.ds().x + 27, g.ds().z);
    const track = g.run(120);
    expect({ track, hp: e.hp, notes }).toMatchInlineSnapshot(`
      {
        "hp": 8,
        "notes": [
          "👁️ Ada sights a Bandit!",
        ],
        "track": [
          "6.14 -0.57",
          "7.29 -0.57",
          "8.44 -0.57",
          "9.59 -0.57",
          "10.74 -0.57",
          "11.89 -0.57",
          "13.04 -0.57",
          "14.19 -0.57",
        ],
      }
    `);
  });

  it('follow: forms up behind the player, and keeps on at it by day', () => {
    worldEnv.time = 0.5;
    const g = guard();
    defenderOrders.order = 'follow';
    expect(g.run(120)).toMatchInlineSnapshot(`
      [
        "5.97 0.75",
        "6.98 2.12",
        "8.00 3.48",
        "9.01 4.85",
        "10.02 6.22",
        "11.03 7.58",
        "11.91 8.77",
        "11.91 8.77",
      ]
    `);
  });

  it('off watch by day: patrol and attack stand down at his post', () => {
    worldEnv.time = 0.5;
    const g = guard();
    g.run(1);
    g.ds().x += 6;
    defenderOrders.order = 'attack';
    expect(g.run(90)).toMatchInlineSnapshot(`
      [
        "10.21 -0.62",
        "9.46 -0.62",
        "8.71 -0.62",
        "7.96 -0.62",
        "7.21 -0.62",
        "6.46 -0.62",
      ]
    `);
  });

  // (G-10 · changed on purpose: the first shot is loosed on its clip's release, 1.19 s on, so two land in these 4 s, not
  // three — the bow's cadence unchanged)
  it("a bow: shoots from range, and a roster override wins over the fleet's order", () => {
    const g = guard({ loadout: 'bow' });
    g.run(1);
    defenderOrders.overrides.g1 = 'scout';
    const e = bandit(g.ds().x + 10, g.ds().z + 2);
    const track = g.run(120);
    expect({ track, hp: e.hp }).toMatchInlineSnapshot(`
      {
        "hp": 4,
        "track": [
          "4.99 -0.57",
          "4.99 -0.57",
          "4.99 -0.57",
          "4.99 -0.57",
          "4.99 -0.57",
          "4.99 -0.57",
          "4.99 -0.57",
          "4.99 -0.57",
        ],
      }
    `);
  });
});

// G-10 · golden, written on the base: a bow guard's shots at a raider 10 m off, frame by frame — the frames on which
// the raider is struck. Changed on purpose: each shot is drawn as the cooldown runs out (frame 1, then every 48) and
// loosed on its clip's release 36 frames on (1.19 s), so the first lands on 37 and the cadence is the bow's 1.6 s still
describe("a bow's shots, frame by frame", () => {
  it('the frames on which the raider is struck', () => {
    const g = guard({ loadout: 'bow' });
    g.run(1);
    const e = bandit(g.ds().x + 10, g.ds().z + 2);
    const hits: number[] = [];
    for (let f = 1; f <= 150; f++) {
      const hp = e.hp;
      g.run(1);
      if (e.hp < hp) hits.push(f);
    }
    expect(hits).toMatchInlineSnapshot(`
      [
        37,
        85,
        133,
      ]
    `);
  });
});

// G-10 · a bow's shot drawn and not seen through is let go: it never lands
describe("a bow's shot let go", () => {
  it('when he is knocked down while drawing it', () => {
    const g = guard({ loadout: 'bow' });
    g.run(1);
    const e = bandit(g.ds().x + 10, g.ds().z + 2);
    const hits: number[] = [];
    for (let f = 1; f <= 150; f++) {
      // drawn on frame 1, to be loosed on 37; downed on 11 (the clock stands still here: he lies there till let up),
      // back on his feet on 41 — the draw let go while he lay there, his cooldown (1.6 s from the first draw) stood
      // still too: the next drawn on 79, loosed on 115
      if (f === 11) Object.assign(g.ds(), { state: 'downed', downedUntil: Date.now() + 60_000 });
      if (f === 41) g.ds().downedUntil = 0;
      const hp = e.hp;
      g.run(1);
      if (e.hp < hp) hits.push(f);
    }
    expect([g.ds().state, hits]).toEqual(['ok', [115]]);
  });

  it('when the raider he drew on falls to another: none lands on the next, who is drawn on from the start', () => {
    const g = guard({ loadout: 'bow' });
    g.run(1);
    const a = bandit(g.ds().x + 10, g.ds().z + 2);
    const b = bandit(g.ds().x + 12, g.ds().z - 2);
    g.run(10); // drawn at the nearer, a
    a.mob.state = 'dying';
    let hit = 0;
    for (let f = 11; f <= 100 && !hit; f++) {
      g.run(1);
      if (b.hp < 8) hit = f;
    }
    expect([a.hp, hit]).toEqual([8, 85]); // b drawn on as the cooldown allows (frame 49), loosed 36 frames on
  });
});

// G-08 · the rally order, beside them
describe('the rally order', () => {
  const from = (x: number, z: number, p: { x: number; z: number }) => Math.hypot(x - p.x, z - p.z);

  it('walks to the point fighting nothing, then holds within 2 m of it while he fights what comes in reach', () => {
    const g = guard();
    g.run(1);
    const P = { x: g.ds().x + 14, z: g.ds().z };
    Object.assign(defenderOrders, { order: 'rally', rally: P });
    const passed = bandit(g.ds().x + 6, g.ds().z + 1.5); // on his way there, 8 m short of it
    const near = bandit(P.x + 3.5, P.z); // within his blade's reach of the hold
    const far = bandit(P.x - 6, P.z); // not
    let arrived = -1, widest = 0;
    for (let f = 0; f < 300; f++) {
      g.run(1);
      const d = from(g.ds().x, g.ds().z, P);
      if (arrived < 0 && d <= RALLY_HOLD) arrived = f;
      if (arrived >= 0) widest = Math.max(widest, d);
    }
    expect(arrived).toBeGreaterThan(0);
    expect(widest).toBeLessThanOrEqual(RALLY_HOLD + 1e-9);
    expect(passed.hp).toBe(8);
    expect(near.hp).toBeLessThanOrEqual(0);
    expect(far.hp).toBe(8);
    expect(g.ds().elevated).toBe(false);
  });

  it('a shieldmate beside him pushes him no further out than its edge', () => {
    // Ada stands to strike 1.8 m out from the point, Bran (no figure drawn here: he stands where he is put) 0.8 m
    // inside her: the push apart would take her 0.6 m further out
    const g = guard({}, [{ id: 'g2', name: 'Bran', job: 'defender', level: 1, loadout: 'sword_shield', world: null } as Villager]);
    g.run(1);
    const P = { x: g.ds().x - 1.8, z: g.ds().z };
    registerDefender('g2', P.x + 1, 0, P.z);
    Object.assign(defenderOrders, { order: 'rally', rally: P });
    const b = bandit(P.x + 3.6, P.z);
    let widest = 0;
    for (let f = 0; f < 120; f++) {
      g.run(1);
      Object.assign(defenderState.g2, { x: P.x + 1, z: P.z });
      if (b.hp > 0) widest = Math.max(widest, from(g.ds().x, g.ds().z, P));
    }
    expect(b.hp).toBeLessThan(8);
    expect(widest).toBeGreaterThan(1.5);
    expect(widest).toBeLessThanOrEqual(RALLY_HOLD + 1e-9);
  });

  it('with nothing in reach, stands by the point at any hour, and the order wants a planted point', () => {
    worldEnv.time = 0.5; // off watch
    const g = guard();
    g.run(1);
    const P = { x: g.ds().x + 4, z: g.ds().z + 3 };
    Object.assign(defenderOrders, { order: 'rally', rally: P });
    g.run(150);
    expect(from(g.ds().x, g.ds().z, P)).toBeLessThanOrEqual(1.3);
    // no point planted: he keeps the shift as on patrol
    Object.assign(defenderOrders, { rally: null });
    const at = { x: g.ds().x, z: g.ds().z };
    g.run(30);
    expect(from(g.ds().x, g.ds().z, at)).toBeGreaterThan(0.5);
  });

  it('a guard posted on a tower comes down to it, and is on the ground to the raiders while he holds it', () => {
    useGameStore.setState({ buildings: [{ id: 't1', type: 'tower', x: 20, z: 0, rot: 0, built: 1 }] } as never);
    const g = guard({ stationId: 't1' });
    g.run(2);
    expect(g.ds().elevated).toBe(true);
    Object.assign(defenderOrders, { order: 'rally', rally: { x: 12, z: 0 } });
    g.run(1);
    expect(g.ds().elevated).toBe(false);
    Object.assign(defenderOrders, { order: 'patrol', rally: null });
    g.run(1);
    expect(g.ds().elevated).toBe(true);
  });

  it('a bow guard rallied down off his tower sights raiders from the ground, not from up there', () => {
    useGameStore.setState({ buildings: [{ id: 't1', type: 'tower', x: 20, z: 0, rot: 0, built: 1 }] } as never);
    const g = guard({ loadout: 'bow', stationId: 't1' });
    g.run(2);
    const P = { x: 12, z: 0 };
    Object.assign(defenderOrders, { order: 'rally', rally: P });
    for (let f = 0; f < 300 && from(g.ds().x, g.ds().z, P) > RALLY_HOLD; f++) g.run(1);
    // a wall between them that only a man up the tower could see over
    const eyes: number[] = [];
    H.los = (_x, fromY) => { eyes.push(fromY); return fromY > GROUND_LOS_Y + 0.5; };
    const e = bandit(P.x - 10, P.z);
    g.run(90);
    expect(eyes.length).toBeGreaterThan(0);
    expect(Math.max(...eyes)).toBeCloseTo(GROUND_LOS_Y, 9);
    expect(e.hp).toBe(8);
  });

  it("goes round a keep's walls to a point in the bailey, by the gatehouse, never into a standing piece", () => {
    useGameStore.getState().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
    useGameStore.setState({ unlocks: [...useGameStore.getState().unlocks, 'keep', 'mining'] });
    expect(useGameStore.getState().placeBuilding('keep', 0, 0, 0)).toBe(true);
    for (const [s, p] of [['nw', 'corner_block'], ['ne', 'corner_block'], ['sw', 'corner_block'], ['se', 'corner_turret'],
      ['e', 'wall_crenel'], ['s', 'wall_crenel'], ['w', 'wall_low'], ['n', 'gatehouse']]) {
      useGameStore.getState().raiseKeepPart(s, p);
      useGameStore.getState().workKeepPart(s, 1);
    }
    rebuildNav(useGameStore.getState().buildings);
    const g = guard();
    g.run(1);
    Object.assign(g.ds(), { x: 0, z: 16 });
    const P = { x: 1, z: 1 };
    Object.assign(defenderOrders, { order: 'rally', rally: P });
    let through = 0;
    for (let f = 0; f < 900 && from(g.ds().x, g.ds().z, P) > RALLY_HOLD; f++) {
      g.run(1);
      if (keepSolids(null).some((b) => pushOutOfBox(b, g.ds().x, g.ds().z, 0))) through++;
    }
    expect(from(g.ds().x, g.ds().z, P)).toBeLessThanOrEqual(RALLY_HOLD);
    expect(through).toBe(0);
  });
});
