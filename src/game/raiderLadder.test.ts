import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  climbPose, ladderFoot, raiderLadderState, resetRaiderLadder,
  CLIMB_PULL_UP, CLIMB_STAGE1_S, CLIMB_STAGE2_S, LADDER_RUNG_REACH, type ClimbPose,
} from './raiderLadder';
import { useGameStore } from './store/gameStore';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };

/** The climb as Enemies.tsx had it written out before it was moved here (main at 0bed81b): a raider at the ladder's
 *  own base — the middle of the prop — rising there, then hauled over onto the walk. */
function asItWas(climbT: number, groundY: number): [number, number, number, boolean] {
  const rl = raiderLadderState;
  const riseTopY = rl.topY - 1.4;
  if (climbT < 0) return [rl.baseX, groundY, rl.baseZ, false];
  if (climbT < 1.4) {
    const t = climbT / 1.4;
    return [rl.baseX, THREE.MathUtils.lerp(groundY, riseTopY, t), rl.baseZ, false];
  }
  if (climbT < 1.4 + 0.5) {
    const t = (climbT - 1.4) / 0.5;
    return [THREE.MathUtils.lerp(rl.baseX, rl.topX, t), THREE.MathUtils.lerp(riseTopY, rl.topY, t), THREE.MathUtils.lerp(rl.baseZ, rl.topZ, t), false];
  }
  return [rl.topX, rl.topY, rl.topZ, true];
}
const pose = (climbT: number, groundY: number, reach?: number): [number, number, number, boolean] => {
  const out: ClimbPose = { x: NaN, y: NaN, z: NaN, over: true };
  expect(climbPose(climbT, groundY, out, reach)).toBe(out);
  return [out.x, out.y, out.z, out.over];
};
/** a ladder planted 2.5 m outside a wall-walk: against the north wall of a keep at the origin unless told otherwise */
const plant = (over: Partial<typeof raiderLadderState> = {}) => Object.assign(raiderLadderState, {
  active: true, planted: true, wrecked: false, wreckT: 0, hp: 22, x: 0, z: -9.3, baseX: 0, baseZ: -9.3, baseYaw: Math.PI,
  topX: 0, topY: 3.6, topZ: -6.8, targetSocketId: 'n', climbers: [],
}, over);
/** every moment worth asking about: a sweep in sixty-fourths of a second (exact in binary; it passes through 0), and
 *  the two later stage boundaries with the moment just before each */
const MOMENTS = [...Array.from({ length: 250 }, (_, i) => -1.25 + i / 64), CLIMB_STAGE1_S, CLIMB_STAGE1_S + CLIMB_STAGE2_S, 1.3999999, 1.8999999];
/** three ladders: against a wall's walk (2.5 m off it, 3.6 m up), against a corner turret's (3.3 m off, 4.2 m up, and
 *  facing west), and one at an angle no keep has (facing its walk all the same: yaw 0 looks down -z) */
const POSES: Partial<typeof raiderLadderState>[] = [
  {},
  { baseX: 18.3, baseZ: 3, baseYaw: Math.PI / 2, topX: 15, topY: 4.2, topZ: 3 },
  { baseX: -4.25, baseZ: 11.75, baseYaw: Math.atan2(-(-2.6 - -4.25), -(9.8 - 11.75)), topX: -2.6, topY: 3.6, topZ: 9.8 },
];

beforeEach(() => { plant(); });

describe('the stages of the climb', () => {
  it('are a second and four tenths up the rungs and half a second over the top, the last 1.4 m of height in the second', () => {
    expect([CLIMB_STAGE1_S, CLIMB_STAGE2_S, CLIMB_PULL_UP]).toEqual([1.4, 0.5, 1.4]);
  });
});

describe('climbPose with no reach — a raider at the middle of the ladder', () => {
  it('is the climb as it was written out in the raiders\' own frame loop, to the last bit', () => {
    let asked = 0;
    for (const p of POSES) {
      plant(p);
      for (const groundY of [0, 0.37, -1.2]) for (const t of MOMENTS) {
        expect(pose(t, groundY, 0)).toEqual(asItWas(t, groundY));
        asked++;
      }
    }
    expect(asked).toBe(POSES.length * 3 * MOMENTS.length);
  });
});

describe('the foot of the rungs', () => {
  it('is a pace and a quarter out from the middle of the ladder, on the side away from the wall', () => {
    expect(LADDER_RUNG_REACH).toBe(1.25);
    // against the north wall: the wall is to the south (+z) of the ladder, so the rungs are to its north
    const north = ladderFoot({ x: NaN, z: NaN });
    expect(north.x).toBeCloseTo(0, 12);
    expect(north.z).toBeCloseTo(-9.3 - 1.25, 12);
    // against the east wall (the ladder faces west, towards -x): the rungs are to its east
    plant({ baseX: 10.5, baseZ: 0, baseYaw: Math.PI / 2, topX: 8, topZ: 0 });
    const east = ladderFoot({ x: NaN, z: NaN });
    expect(east.x).toBeCloseTo(10.5 + 1.25, 12);
    expect(east.z).toBeCloseTo(0, 12);
  });

  it('lies on the line from the wall-walk through the ladder, that much further out — wherever the game plants one', () => {
    const st = useGameStore.getState();
    st.newGame(HERO as never);
    useGameStore.getState().foundKeep(40, -20, 0.5);
    const keep = useGameStore.getState().keep!;
    for (const socket of ['n', 'e', 's', 'w', 'nw', 'ne', 'se', 'sw']) {
      useGameStore.setState({ keep: { ...keep, parts: { [socket]: socket.length === 1 ? 'wall_crenel' : 'corner_turret' }, built: { [socket]: 1 } } });
      raiderLadderState.active = false;
      resetRaiderLadder(socket);
      expect(raiderLadderState.active).toBe(true);
      const l = raiderLadderState;
      const foot = ladderFoot({ x: NaN, z: NaN });
      const fromWalk = Math.hypot(l.baseX - l.topX, l.baseZ - l.topZ);
      // the same direction from the walk, 1.25 m further
      expect(Math.hypot(foot.x - l.topX, foot.z - l.topZ)).toBeCloseTo(fromWalk + 1.25, 9);
      expect((foot.x - l.topX) / (fromWalk + 1.25)).toBeCloseTo((l.baseX - l.topX) / fromWalk, 9);
      expect((foot.z - l.topZ) / (fromWalk + 1.25)).toBeCloseTo((l.baseZ - l.topZ) / fromWalk, 9);
    }
  });
});

describe('climbPose — a raider at the rungs', () => {
  it('waits his turn at the foot of the rungs, on the ground', () => {
    const [x, y, z, over] = pose(-0.6, 0.37);
    expect([y, over]).toEqual([0.37, false]);
    expect(x).toBeCloseTo(0, 12);
    expect(z).toBeCloseTo(-10.55, 12);
  });

  it('goes up there: only his height changes, to 1.4 m short of the walk', () => {
    for (const t of [0, 0.35, 0.7, 1.05, 1.3999999]) {
      const [x, , z, over] = pose(t, 0);
      expect(x).toBeCloseTo(0, 12);
      expect(z).toBeCloseTo(-10.55, 12);
      expect(over).toBe(false);
    }
    expect(pose(0, 0)[1]).toBe(0);
    expect(pose(0.7, 0)[1]).toBeCloseTo(1.1, 12); // half way up the 2.2 m
    expect(pose(1.3999999, 0)[1]).toBeCloseTo(2.2, 5);
  });

  it('is hauled from the rungs onto the walk in the last half second, and is then over the top', () => {
    const start = pose(CLIMB_STAGE1_S, 0);
    expect(start[1]).toBeCloseTo(2.2, 12);
    expect(start[2]).toBeCloseTo(-10.55, 12);
    expect(start[3]).toBe(false);
    const half = pose(CLIMB_STAGE1_S + CLIMB_STAGE2_S / 2, 0);
    expect(half[1]).toBeCloseTo(2.9, 12);
    expect(half[2]).toBeCloseTo((-10.55 + -6.8) / 2, 12); // half way from the rungs to the middle of the walk
    expect(half[3]).toBe(false);
    expect(pose(1.8999999, 0)[3]).toBe(false);
    expect(pose(CLIMB_STAGE1_S + CLIMB_STAGE2_S, 0)).toEqual([0, 3.6, -6.8, true]);
    expect(pose(60, 0)).toEqual([0, 3.6, -6.8, true]);
  });

  it('keeps the heights and the timing of the climb as it was: where he stands on the ground is all that moved', () => {
    for (const p of POSES) {
      plant(p);
      for (const t of MOMENTS) {
        const was = asItWas(t, 0.37), now = pose(t, 0.37);
        expect([now[1], now[3]]).toEqual([was[1], was[3]]);
      }
    }
  });
});
