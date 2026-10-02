import { describe, expect, it } from 'vitest';
import {
  BUILDABLES, BUILDABLE_BY_ID, BUILD_CATEGORIES, BUILD_REGION, CLAIM_RADIUS, LAND_TIERS, MAX_LAND_TIER,
  activeBuildRegion, buildableForLabAsset, buildingsInRect, collisionBoxesFor, costBill, heightOf, labAssetId,
  landHalf, landSouthHalf, maxHpFor, sizeFor,
} from './buildables';
import { ITEMS } from './items';
import type { PlacedBuilding } from '../types';

describe('land tiers', () => {
  it('every tier is a side a wall run closes on: corner + N walls + corner = 8N + 8 metres', () => {
    for (const t of LAND_TIERS) expect(t.half * 2, t.name).toBe(8 * t.walls + 8);
  });

  it('grows outward tier by tier, costs more each time, and starts free', () => {
    expect(LAND_TIERS[0].cost).toBe(0);
    for (let i = 1; i < LAND_TIERS.length; i++) {
      expect(LAND_TIERS[i].half, LAND_TIERS[i].name).toBeGreaterThan(LAND_TIERS[i - 1].half);
      expect(LAND_TIERS[i].cost, LAND_TIERS[i].name).toBeGreaterThan(LAND_TIERS[i - 1].cost);
    }
  });

  it('keeps the south fence where it is at every tier (it must never reach the road)', () => {
    expect(new Set(LAND_TIERS.map((t) => t.southHalf)).size).toBe(1);
  });

  it('clamps a tier outside the table instead of throwing', () => {
    expect(landHalf(-3)).toBe(LAND_TIERS[0].half);
    expect(landHalf(99)).toBe(LAND_TIERS[MAX_LAND_TIER].half);
    expect(landSouthHalf(99)).toBe(LAND_TIERS[MAX_LAND_TIER].southHalf);
  });

  it('BUILD_REGION is the widest tier, and a claimed plot is a square of CLAIM_RADIUS round the claim', () => {
    expect(BUILD_REGION).toEqual(expect.objectContaining({ minX: -landHalf(MAX_LAND_TIER), maxX: landHalf(MAX_LAND_TIER) }));
    expect(activeBuildRegion(null, 0)).toEqual({ minX: -landHalf(0), maxX: landHalf(0), minZ: -landHalf(0), maxZ: landSouthHalf(0), groundY: 0 });
    expect(activeBuildRegion({ x: 100, z: -40, groundY: 7 } as never))
      .toEqual({ minX: 100 - CLAIM_RADIUS, maxX: 100 + CLAIM_RADIUS, minZ: -40 - CLAIM_RADIUS, maxZ: -40 + CLAIM_RADIUS, groundY: 7 });
  });
});

describe('the build catalogue', () => {
  it('has unique ids, and the lookup table is exactly the list', () => {
    const ids = BUILDABLES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(BUILDABLE_BY_ID).sort()).toEqual([...ids].sort());
  });

  it('gives every piece a known category, a real footprint and a cost in real items', () => {
    const categories = new Set(BUILD_CATEGORIES.map((c) => c.id));
    for (const b of BUILDABLES) {
      expect(categories.has(b.category), `${b.id} category ${b.category}`).toBe(true);
      expect(b.size.length, b.id).toBe(3);
      for (const n of b.size) expect(Number.isFinite(n) && n > 0, `${b.id} size ${b.size}`).toBe(true);
      for (const [item, n] of Object.entries(b.cost)) {
        expect(item in ITEMS, `${b.id} costs unknown item ${item}`).toBe(true);
        expect(Number.isInteger(n) && (n as number) > 0, `${b.id} costs ${n} ${item}`).toBe(true);
      }
    }
  });

  it('maps a piece to its lab asset and back to a piece of that asset', () => {
    for (const b of BUILDABLES) {
      const back = buildableForLabAsset(labAssetId(b.id));
      if (back !== null) expect(labAssetId(back), b.id).toBe(labAssetId(b.id));
    }
    expect(labAssetId('no-such-piece')).toBe('no-such-piece');
  });

  it('prices a bill line for every cost entry, and derives hit points from cost', () => {
    for (const b of BUILDABLES) {
      expect(costBill(b).length, b.id).toBeGreaterThanOrEqual(Object.keys(b.cost).length > 0 ? 1 : 0);
      expect(maxHpFor(b.id), b.id).toBeGreaterThanOrEqual(15);
    }
    expect(maxHpFor('no-such-piece')).toBe(20);
  });
});

describe('footprints and collision', () => {
  it('a quarter turn swaps width and depth, and rotation wraps at four', () => {
    for (const b of BUILDABLES) {
      const [w, d] = sizeFor(b.id, 0);
      expect(sizeFor(b.id, 1), b.id).toEqual([d, w]);
      expect(sizeFor(b.id, 2), b.id).toEqual([w, d]);
      expect(sizeFor(b.id, 5), b.id).toEqual(sizeFor(b.id, 1));
    }
  });

  it('collision boxes are real volumes that never rise above the piece', () => {
    for (const b of BUILDABLES) {
      for (const rot of [0, 1, 2, 3]) {
        for (const box of collisionBoxesFor(b.id, rot)) {
          expect(box.hx > 0 && box.hz > 0, `${b.id} rot ${rot}`).toBe(true);
          expect(box.yTop, `${b.id} rot ${rot}`).toBeGreaterThan(box.yBase);
          expect(box.yTop, `${b.id} rot ${rot}`).toBeLessThanOrEqual(heightOf(b.id) + 1e-9);
        }
      }
    }
  });

  it('a rectangle takes the pieces whose footprint overlaps it, in that world only', () => {
    const wall = BUILDABLES.find((b) => b.id === 'wall') ?? BUILDABLES[0];
    const piece = (id: string, x: number, z: number, world?: string): PlacedBuilding =>
      ({ id, type: wall.id, x, z, rot: 0, built: 1, ...(world ? { world } : {}) } as PlacedBuilding);
    const placed = [piece('near', 0, 0), piece('far', 60, 60), piece('away', 0, 0, 'template-08')];
    const rect = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
    expect(buildingsInRect(placed, null, rect as never).map((p) => p.id)).toEqual(['near']);
    expect(buildingsInRect(placed, 'template-08', rect as never).map((p) => p.id)).toEqual(['away']);
  });
});
