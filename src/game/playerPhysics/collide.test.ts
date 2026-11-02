import { afterEach, describe, expect, it } from 'vitest';
import { collide } from './collide';
import { useGameStore } from '@/game/store/gameStore';
import { cartState } from '@/game/carts';
import { PLAYER_RADIUS, SIGNPOST, VILLAGE_HUT_HALF, VILLAGE_HUTS } from '@/game/data/world';
import type { PlacedBuilding } from '@/game/types';

const st = () => useGameStore.getState();
/** a step to (x, z) on foot, the feet on the ground */
const step = (x: number, z: number, feetY = 0) => collide(st(), false, feetY, x, z);
/** (x, z) in a turned box's own frame: +x along (cos yaw, -sin yaw), +z along (sin yaw, cos yaw) */
const local = (x: number, z: number, b: { x: number; z: number; yaw: number }) => {
  const dx = x - b.x, dz = z - b.z, c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return { u: dx * c - dz * s, v: dx * s + dz * c };
};

afterEach(() => {
  cartState.pushingId = null;
  cartState.hitchedId = null;
  useGameStore.setState({ buildings: [], nodes: [] });
});

describe("the player's step into the village's huts and the signpost", () => {
  it('is put back out of a turned hut along its own nearer side, by his radius', () => {
    useGameStore.setState({ buildings: [], nodes: [] });
    for (const hut of VILLAGE_HUTS) {
      // 0.4 m in from its own +x side, 0.3 m along it
      const u = VILLAGE_HUT_HALF - 0.4, v = 0.3, c = Math.cos(hut.yaw), s = Math.sin(hut.yaw);
      const { nx, nz } = step(hut.x + u * c + v * s, hut.z - u * s + v * c);
      const out = local(nx, nz, hut);
      expect(out.u).toBeCloseTo(VILLAGE_HUT_HALF + PLAYER_RADIUS, 9);
      expect(out.v).toBeCloseTo(v, 9);
    }
  });

  it("is put back out of the signpost's board, and not when he is above it", () => {
    useGameStore.setState({ buildings: [], nodes: [] });
    const { nx, nz } = step(SIGNPOST.x + 0.1, SIGNPOST.z - 0.05);
    expect([nx, nz]).toEqual([SIGNPOST.x + 0.1, SIGNPOST.z - 0.15 - PLAYER_RADIUS]);
    expect(step(SIGNPOST.x + 0.1, SIGNPOST.z - 0.05, 1.9)).toEqual({ nx: SIGNPOST.x + 0.1, nz: SIGNPOST.z - 0.05 });
  });
});

describe('the player walking at a cart he has taken up', () => {
  const cart = (type: string): PlacedBuilding => ({ id: 'c1', type, x: 12, z: 41.6, y: 0, rot: 0, world: null });

  it('is not stopped by where it stood: he drives it, wherever it is now', () => {
    for (const [type, key] of [['warcart', 'pushingId'], ['bladecart', 'hitchedId']] as const) {
      useGameStore.setState({ buildings: [cart(type)], nodes: [] });
      // a step into its stored box: put back out while it stands there ...
      expect(step(12, 41.8)).not.toEqual({ nx: 12, nz: 41.8 });
      // ... and taken while it is pushed or hitched
      cartState[key] = 'c1';
      expect(step(12, 41.8)).toEqual({ nx: 12, nz: 41.8 });
      cartState[key] = null;
    }
  });

  it('is still stopped by another cart standing', () => {
    useGameStore.setState({ buildings: [cart('warcart'), { ...cart('bladecart'), id: 'c2', x: 20 }], nodes: [] });
    cartState.pushingId = 'c1';
    expect(step(20, 41.8)).not.toEqual({ nx: 20, nz: 41.8 });
  });
});
