import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixedSolids, quarterTurnOf } from './fixedSolids';
import { CAMP_GUARD_RADIUS, MERCHANT_CAMP_WALLS, MERCHANT_SPOT } from './data/trade';
import { hasLineOfSight, navBlocked, rebuildNav } from './navgrid';

describe("the merchant camp's walls, as solids", () => {
  it('are its five pieces, at home and nowhere else', () => {
    const solids = fixedSolids(null);
    expect(solids.map((b) => b.type)).toEqual(MERCHANT_CAMP_WALLS.map((w) => w.model));
    expect(new Set(solids.map((b) => b.id)).size).toBe(solids.length);
    for (const b of solids) expect([b.world, b.y, b.built]).toEqual([null, 0, undefined]);
    for (const region of ['template-01', 'template-02', 'dungeon', 'arena']) expect(fixedSolids(region)).toEqual([]);
  });

  it("take the quarter turn a placed piece is drawn at for each of the table's facings", () => {
    expect([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, -Math.PI / 2, 2 * Math.PI].map(quarterTurnOf)).toEqual([0, 1, 2, 3, 3, 0]);
    // the table holds whole quarter turns only (collision is axis-aligned)
    for (const w of MERCHANT_CAMP_WALLS) expect(Math.abs(w.yaw - quarterTurnOf(w.yaw) * (Math.PI / 2))).toBeLessThan(1e-9);
    expect(fixedSolids(null).map((b) => b.rot)).toEqual(MERCHANT_CAMP_WALLS.map((w) => quarterTurnOf(w.yaw)));
  });

  it("stand at the table's points until the collision shapes file has been read, made afresh each time", () => {
    // in node the shapes never load (collisionShapes.ts fetches them in the browser only)
    const a = fixedSolids(null), b = fixedSolids(null);
    expect(a.map((s) => [s.x, s.z])).toEqual(MERCHANT_CAMP_WALLS.map((w) => [w.x, w.z]));
    expect(a).not.toBe(b);
  });
});

describe('once the collision shapes file has been read', () => {
  afterEach(() => { vi.doUnmock('./collisionShapes'); vi.resetModules(); });

  it('put their boxes back on the stone that is drawn, and keep one list', async () => {
    // a straight whose stone is a slab off its centre (as mc005's is), and a square corner
    const SHAPES: Record<string, { cx: number; cy: number; cz: number; hx: number; hy: number; hz: number }[]> = {
      mc005: [{ cx: 0, cy: 1.9, cz: -0.77, hx: 4, hy: 1.9, hz: 0.43 }, { cx: 0, cy: 3.7, cz: 0.4, hx: 4, hy: 0.12, hz: 0.8 }],
      mc001: [{ cx: 0.01, cy: 1.9, cz: 0, hx: 1.78, hy: 1.9, hz: 1.78 }],
    };
    vi.resetModules();
    vi.doMock('./collisionShapes', () => ({ shapeFor: (type: string) => SHAPES[type] ?? null, shapesLoaded: () => true }));
    const { fixedSolids: solidsOf } = await import('./fixedSolids');
    const { collisionBoxesFor } = await import('./data/buildables');
    const solids = solidsOf(null);
    solids.forEach((b, i) => {
      const w = MERCHANT_CAMP_WALLS[i];
      // where each voxel box is in the drawn mesh's own frame: the piece's local box, turned as the mesh turns
      // (a quarter turn sends local (x, z) to (z, -x)), laid on the table's point
      const drawn = SHAPES[w.model].map((s) => {
        let x = s.cx, z = s.cz;
        for (let q = 0; q < b.rot; q++) { const nx = z; z = -x; x = nx; }
        return [w.x + x, w.z + z];
      });
      const boxes = collisionBoxesFor(b.type, b.rot).map((box) => [b.x + (box.ox ?? 0), b.z + (box.oz ?? 0)]);
      boxes.forEach(([x, z], k) => {
        expect(x).toBeCloseTo(drawn[k][0], 9);
        expect(z).toBeCloseTo(drawn[k][1], 9);
      });
    });
    // the straights stand off the table's points by their solid offset; known now, so the list is kept
    expect(Math.hypot(solids[0].x - MERCHANT_CAMP_WALLS[0].x, solids[0].z - MERCHANT_CAMP_WALLS[0].z)).toBeGreaterThan(0.1);
    expect(solidsOf(null)).toBe(solids);
  });

  it("keep one list at the table's points when the file has no shape for them, or could not be read", async () => {
    vi.resetModules();
    // read, and nothing in it for mc001 or mc005 (collisionShapes.ts takes a failed fetch as an empty file)
    vi.doMock('./collisionShapes', () => ({ shapeFor: () => null, shapesLoaded: () => true }));
    const { fixedSolids: solidsOf } = await import('./fixedSolids');
    const solids = solidsOf(null);
    expect(solids.map((s) => [s.x, s.z])).toEqual(MERCHANT_CAMP_WALLS.map((w) => [w.x, w.z]));
    // the fallback boxes are for good now: one list, so the grid and line of sight make the camp once
    expect(solidsOf(null)).toBe(solids);
  });
});

describe('when the real collision shapes arrive after the grid and line of sight were made', () => {
  afterEach(() => { vi.doUnmock('./collisionShapes'); vi.resetModules(); });

  it('both take the real boxes on their next look, though the buildings are the same, and then make them no more', async () => {
    let shapes: Record<string, { cx: number; cy: number; cz: number; hx: number; hy: number; hz: number }[]> | null = null;
    let asked = 0;
    vi.resetModules();
    vi.doMock('./collisionShapes', () => ({
      shapeFor: (type: string) => { asked++; return shapes?.[type] ?? null; },
      shapesLoaded: () => shapes !== null,
    }));
    const nav = await import('./navgrid');
    const buildings: never[] = [];
    // before: the coarse fallback boxes, centred on the table's points — the back wall's reaches z 12.84
    nav.rebuildNav(buildings);
    expect(nav.navBlocked(-76.8, 13.2)).toBe(true);
    expect(nav.hasLineOfSight(-79, 1.2, 12.6, -74.6, 1.2, 12.6)).toBe(false);
    // the shapes land: the straight's stone is a slab at its -z side, as mc005's is
    shapes = {
      mc005: [{ cx: 0, cy: 1.9, cz: -0.77, hx: 4, hy: 1.9, hz: 0.43 }],
      mc001: [{ cx: 0, cy: 1.9, cz: 0, hx: 1.78, hy: 1.9, hz: 1.78 }],
    };
    // the same buildings array: what is new is the camp's own list
    nav.rebuildNav(buildings);
    expect(nav.navBlocked(-76.8, 13.2)).toBe(false);
    expect(nav.navBlocked(-76.8, 11.2)).toBe(true);
    expect(nav.hasLineOfSight(-79, 1.2, 12.6, -74.6, 1.2, 12.6)).toBe(true);
    expect(nav.hasLineOfSight(-76.8, 1.2, 16, -76.8, 1.2, 6)).toBe(false);
    // the camp's list is kept from now on, so neither makes the boxes again: the grid's next rebuild and the next
    // sightline ask nothing of the shapes
    const before = asked;
    nav.rebuildNav(buildings);
    expect(nav.hasLineOfSight(-79, 1.2, 12.6, -74.6, 1.2, 12.6)).toBe(true);
    expect(asked).toBe(before);
  });
});

describe("the camp's walls stop what finds its way and what is seen", () => {
  it("are stamped into the home grid, leaving the yard and its gate open", () => {
    rebuildNav([]);
    // the back wall, and each wing (in node, the coarser fallback boxes centred on the table's points)
    expect(navBlocked(-76.8, 12)).toBe(true);
    expect(navBlocked(-82.8, 18)).toBe(true);
    expect(navBlocked(-70.8, 18)).toBe(true);
    // the merchant's spot, and the open front the road's spur walks in through
    expect(navBlocked(MERCHANT_SPOT.x, MERCHANT_SPOT.z)).toBe(false);
    expect(navBlocked(-76.8, 24)).toBe(false);
  });

  it('stop a sightline through the back wall, and not one out of the gate', () => {
    expect(hasLineOfSight(-76.8, 1.2, 16, -76.8, 1.2, 6)).toBe(false);
    expect(hasLineOfSight(-76.8, 1.2, 16, -76.8, 1.2, 28)).toBe(true);
  });
});

describe("the camp guard's rounds", () => {
  it('stay inside the yard, clear of the stone', () => {
    // the stone nearest the yard at walker height, measured on the drawn walls (rays at y 0.6, 1 and 1.5 m,
    // 2026-10-15): the back wall at z 11.6, the west wing at x -83.2, the east wing's pilasters at x -71.85.
    // BODY is an allowance for the half of his body either side of his centre
    const BODY = 0.4;
    expect(MERCHANT_SPOT.z - CAMP_GUARD_RADIUS).toBeGreaterThan(11.6 + BODY);
    expect(MERCHANT_SPOT.x - CAMP_GUARD_RADIUS).toBeGreaterThan(-83.2 + BODY);
    expect(MERCHANT_SPOT.x + CAMP_GUARD_RADIUS).toBeLessThan(-71.85 - BODY);
  });
});
