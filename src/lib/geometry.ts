// Tiny zero-import AABB helpers, importable from any layer (game/data/,
// game/, components/) without creating an import cycle. Every body is a
// VERBATIM port of the copy it replaced. Both tests are STRICT: rectangles that
// merely touch along an edge do NOT overlap.

/** an axis-aligned box on the XZ plane, given by its centre and half-extents */
export interface CenterHalfBox { x: number; z: number; halfX: number; halfZ: number }

/** an axis-aligned rectangle on the XZ plane, given by its min/max corners */
export interface MinMaxRect { minX: number; maxX: number; minZ: number; maxZ: number }

/** strict overlap of two centre + half-extent boxes */
export function aabbOverlapCenterHalf(a: CenterHalfBox, b: CenterHalfBox): boolean {
  return Math.abs(a.x - b.x) < a.halfX + b.halfX && Math.abs(a.z - b.z) < a.halfZ + b.halfZ;
}

/** strict overlap of two min/max rectangles; `pad` (default 0) fattens `a` by
 *  that much on every side before the test */
export function aabbOverlapMinMax(a: MinMaxRect, b: MinMaxRect, pad = 0): boolean {
  return a.maxX + pad > b.minX && a.minX - pad < b.maxX
    && a.maxZ + pad > b.minZ && a.minZ - pad < b.maxZ;
}
