import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// The raiders' components called as plain functions, on just enough of React to keep a component's refs and state
// between calls (a slot per hook and per instance; effects are not run — nothing tested here hangs on one). A
// store's hook selects from the state as it is, without React; a frame loop is collected instead of subscribed; and
// whatever a raider is drawn through is a name. What a component returns is then plain data to read.
type Frame = (state: unknown, dt: number) => void;
const H = vi.hoisted(() => ({
  inst: null as null | { slots: unknown[]; i: number; frames: Frame[] },
  /** far from everything: no raider below has anyone to fight */
  player: { x: 400, y: 0, z: 400 },
  /** the homestead's ground: a slope, so that no two spots a raider stands on are at one height */
  ground: (x: number, z: number) => 0.5 + 0.01 * x + 0.02 * z,
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
      return [value, (next: unknown) => { c.slots[i] = next; }];
    },
    useRef: (value: unknown) => slot(() => ({ current: value }))[0],
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
vi.mock('../character/Equipment', () => ({
  ArmShield: 'ArmShield', HeldCrossbow: 'HeldCrossbow', HeldHalberd: 'HeldHalberd', HeldSpear: 'HeldSpear', HeldSword: 'HeldSword', SpellHandGlow: 'SpellHandGlow',
}));
vi.mock('../character/RiggedFigure', () => ({ default: 'RiggedFigure' }));
vi.mock('../world/RiggedProp', () => ({ default: 'RiggedProp', fireProp: () => {} }));
vi.mock('./HealthBillboard', () => ({ default: 'HealthBillboard' }));
vi.mock('../fps/PlayerController', () => ({ default: 'PlayerController', playerState: H.player }));
vi.mock('../world/TemplateWorld', () => ({ homeGroundY: H.ground, destinationGroundY: () => 7 }));

import Enemies from './Enemies';
import { useEnemyStore, type EnemyData } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { climbPose, ladderFoot, raiderLadderState, resetRaiderLadder, type ClimbPose } from '@/game/raiderLadder';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };

interface El<P = Record<string, unknown>> { type: unknown; props: P }
type RaiderEl = El<{ ref: { current: THREE.Group | null }; position: number[] }>;

/** one instance of a component: `render()` calls it (again); `frame(dt)` runs the frame loop it last handed over */
function instance<P, R>(component: (props: P) => R, props: P) {
  const inst = { slots: [] as unknown[], i: 0, frames: [] as Frame[] };
  return {
    render: (): R => {
      H.inst = inst;
      inst.i = 0;
      inst.frames = [];
      try { return component(props); } finally { H.inst = null; }
    },
    frame: (dt = 1 / 64) => inst.frames[0]({}, dt),
  };
}

/** A raider of the game's own spawning and his component, with a real group behind its ref. `render()` does with the
 *  place the component hands over what react-three-fiber does: it is applied when the group is made, and after that
 *  only on a render that hands over an array differing, element by element, from the last render's (its
 *  `diffProps`). */
function raider(x: number, z: number) {
  useEnemyStore.getState().spawn('bandit', x, z, true);
  const data = useEnemyStore.getState().enemies.at(-1)!;
  // the parent draws one <Enemy> for each: that element's type is the component
  const parent = instance(Enemies as unknown as (p: object) => El<{ children: El<{ data: EnemyData }>[][] }>, {});
  const element = parent.render().props.children[0].find((c) => c.props.data === data)!;
  const one = instance(element.type as (p: { data: EnemyData }) => RaiderEl, { data });
  const group = new THREE.Group();
  let last: number[] | null = null;
  const render = () => {
    const root = one.render();
    root.props.ref.current = group;
    const next = root.props.position;
    if (!last || next.length !== last.length || next.some((v, i) => v !== last![i])) group.position.fromArray(next);
    last = next;
    return root;
  };
  return { data, mob: data.mob, group, render, frame: one.frame, at: () => group.position.toArray() };
}

/** a keep whose north wall-walk is finished, and the raiders' ladder planted against it by the game itself */
function plantLadder() {
  useGameStore.getState().foundKeep(40, -20, 0.5);
  const keep = useGameStore.getState().keep!;
  useGameStore.setState({ keep: { ...keep, parts: { n: 'wall_crenel' }, built: { n: 1 } } });
  resetRaiderLadder('n');
  Object.assign(raiderLadderState, { planted: true, x: raiderLadderState.baseX, z: raiderLadderState.baseZ });
  return raiderLadderState;
}
/** where a raider is, `climbT` seconds into his climb: game/raiderLadder.ts's own path, from the ground under the
 *  foot of the rungs */
function onLadder(climbT: number): number[] {
  const foot = ladderFoot({ x: NaN, z: NaN });
  const pose = climbPose(climbT, H.ground(foot.x, foot.z), { x: NaN, y: NaN, z: NaN, over: false } as ClimbPose);
  return [pose.x, pose.y, pose.z];
}
/** he has taken his place on the ladder and is `climbT` seconds into the climb */
function climbing(r: ReturnType<typeof raider>, climbT: number) {
  Object.assign(r.mob, { state: 'climbing', ladderSocketId: 'n', climbT });
  raiderLadderState.climbers = [String(r.data.id)];
}

beforeEach(() => {
  useGameStore.getState().newGame(HERO as never);
  useEnemyStore.getState().clear();
  Object.assign(raiderLadderState, { active: false, planted: false, wrecked: false, climbers: [] });
});

describe("a raider's place, as his component hands it to the renderer", () => {
  it('is one and the same array on every render — where he stood when his figure was mounted — however far he has gone since', () => {
    const r = raider(3, -4);
    const first = r.render();
    expect(first.type).toBe('group');
    expect(first.props.position).toEqual([3, 0, -4]);
    expect(r.at()).toEqual([3, 0, -4]);
    r.mob.x = 20;
    r.mob.z = 11;
    const second = r.render();
    // the very same array: there is nothing for the renderer to apply a second time
    expect(second.props.position).toBe(first.props.position);
    expect(second.props.position).toEqual([3, 0, -4]);
  });
});

describe('when the game is paused — every raider is rendered again, and his frame loop stands down', () => {
  it('a raider who has just stepped onto a wall-walk is still drawn on it', () => {
    const l = plantLadder();
    const r = raider(l.baseX + 3, l.baseZ - 9);
    r.render();
    climbing(r, 1.9);
    r.frame();
    expect(r.mob.elevated).toBe(true);
    expect(r.at()).toEqual([l.topX, l.topY, l.topZ]);
    expect(l.topY).toBeCloseTo(4.1, 12); // the keep's own level, and the walk's 3.6 m above it
    // the next frame is the ordinary loop's: with no one up there to fight he holds the battlement
    r.frame();
    expect(r.mob.state).toBe('wander');
    expect(r.at()).toEqual([l.topX, l.topY, l.topZ]);

    useGameStore.setState({ paused: true });
    r.render();
    r.frame();
    expect(r.at()).toEqual([l.topX, l.topY, l.topZ]);
  });

  it('a raider who is being hauled over is still drawn in the haul', () => {
    plantLadder();
    const r = raider(raiderLadderState.baseX - 2, raiderLadderState.baseZ - 7);
    r.render();
    climbing(r, 1.6);
    r.frame(1 / 64);
    const drawn = onLadder(1.6 + 1 / 64);
    expect(r.at()).toEqual(drawn);
    expect(drawn[1]).toBeGreaterThan(3);

    useGameStore.setState({ paused: true });
    r.render();
    r.frame();
    expect(r.at()).toEqual(drawn);
  });

  it('a raider on a hillside is still drawn on the hill', () => {
    const r = raider(120, 90);
    r.render();
    // he has come a long way since he was last rendered, and the frame loop draws him where he is
    r.mob.x = 150;
    r.mob.z = 130;
    r.frame();
    const [x, y, z] = r.at();
    expect(y).toBe(H.ground(x, z));
    expect(y).toBeGreaterThan(4);

    useGameStore.setState({ paused: true });
    r.render();
    r.frame();
    expect(r.at()).toEqual([x, y, z]);
  });
});

describe('a raider who is dying — flying apart where he fell, and no longer placed by his frame loop', () => {
  it('is not dropped to height 0 by a render', () => {
    const r = raider(120, 90);
    r.render();
    r.mob.x = 150;
    r.mob.z = 130;
    r.frame();
    const [x, y, z] = r.at();
    expect(y).toBe(H.ground(x, z));
    expect(y).toBeGreaterThan(4);

    // he is felled; the coming or going of any other raider renders every one of them again
    Object.assign(r.mob, { state: 'dying', dieT: 0 });
    r.render();
    r.frame(1 / 64);
    expect(r.mob.dieT).toBe(1 / 64);
    expect(r.at()).toEqual([x, y, z]);
  });
});

describe('while the player builds — the raiders stand still', () => {
  it('a raider waiting his turn, on the rungs or in the haul stays at the height his climb has reached', () => {
    for (const t of [-0.3, 0.7, 1.6]) {
      useEnemyStore.getState().clear();
      plantLadder();
      const r = raider(raiderLadderState.baseX + 1, raiderLadderState.baseZ - 6);
      r.render();
      climbing(r, t);
      r.frame(1 / 64);
      const clock = t + 1 / 64;
      expect(r.mob.climbT).toBe(clock);
      const drawn = onLadder(clock);
      expect(r.at()).toEqual(drawn);

      useGameStore.setState({ buildMode: true });
      r.render();
      r.frame();
      r.frame();
      // his climb's clock stands still, and he stays where it has brought him
      expect(r.mob.climbT).toBe(clock);
      expect(r.mob.state).toBe('climbing');
      expect(r.at()).toEqual(drawn);

      useGameStore.setState({ buildMode: false });
      r.render();
      r.frame(1 / 64);
      expect(r.mob.climbT).toBe(clock + 1 / 64);
      expect(r.at()).toEqual(onLadder(clock + 1 / 64));
    }
  });

  it('a raider on the ground stays on the ground under him, and one on a wall-walk on the walk', () => {
    const l = plantLadder();
    const walker = raider(60, 35);
    walker.render();
    const onWalk = raider(l.topX, l.topZ);
    onWalk.render();
    Object.assign(onWalk.mob, { elevated: true, postY: l.topY, ladderSocketId: 'n' });

    useGameStore.setState({ buildMode: true });
    walker.frame();
    onWalk.frame();
    expect(walker.at()).toEqual([60, H.ground(60, 35), 35]);
    expect(onWalk.at()).toEqual([l.topX, l.topY, l.topZ]);
  });
});
