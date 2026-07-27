'use client';
// Real per-piece collision volumes, derived from each model's OWN geometry.
//
// Answering "is there a way to ignore the bbox and simply have the raw OBJ be
// its own item for hit boxing?": yes, and this is the middle road between a
// per-frame trimesh raycast (accurate, far more than the movement code needs)
// and one bounding box (cheap, but a 4.3m arch became a solid wall you could
// see straight through and still not walk under).
//
// scripts/gen-collision.mjs voxelises each OBJ at asset-prep time and merges
// the result into a handful of axis-aligned boxes, in the piece's own
// UNROTATED local space with the origin on the ground at its centre. Runtime
// stays cheap AABB tests; the shape becomes real.
//
// Loaded once, asynchronously. Until it lands, `shapeFor` returns null and
// callers fall back to the authored boxes — so collision is never wrong,
// only coarser for the first moment.

export interface ShapeBox {
  cx: number; cy: number; cz: number;
  hx: number; hy: number; hz: number;
}

let shapes: Record<string, ShapeBox[]> | null = null;
let loading: Promise<void> | null = null;

export function loadCollisionShapes(): Promise<void> {
  if (!loading) {
    loading = fetch('/assets/collision.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => { shapes = j as Record<string, ShapeBox[]>; })
      .catch(() => { shapes = {}; });
  }
  return loading;
}

/** the piece's own volumes in local space, or null if it has none (solid
 *  enough that its bounding box is already the truth, or no source OBJ) */
export function shapeFor(type: string): ShapeBox[] | null {
  return shapes?.[type] ?? null;
}

if (typeof window !== 'undefined') {
  loadCollisionShapes();
  (window as unknown as Record<string, unknown>).__kkshapes = () => shapes;
}
