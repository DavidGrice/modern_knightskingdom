// G-03 · where a raid comes at the homestead from. The raiders walk in by the road (raidDirector.ts spawns them at
// roadEntry()), and until now every one of them made for home's middle by the same way, so a raid arrived as one file
// off the road. Now each raid has sides — the road's, and one flank or both — drawn from a seed (the day's, so that what
// is to come can be known before it comes: G-19's informants), and each raider his own point on one of them, on a ring
// round home: he walks to it, then closes in from there (enemyAi/step.ts). The sides are kept in the directors' state
// (state.ts's raidPlan) for G-04's minimap arrow.
import { mulberry32 } from '@/lib/rng';
import { roadEntry } from '@/game/data/road';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { getNavGrid, navReachable } from '@/game/navgrid';

/** how far from home's middle a raider's approach point lies: inside the 26 m at which a raider notices the player, so
 *  that one who reaches his point finds a player at home within reach, and closes in */
export const APPROACH_RING = 22;
/** how far round from the road's bearing a flank lies */
const FLANK = (75 * Math.PI) / 180;
/** how far either way of his side's bearing a raider's own point may lie */
const STRAY = (15 * Math.PI) / 180;
/** how much further out a point is looked for again when the ring's is shut off from him (in a ring of walls) */
const RING_STEP = 6;

/** the bearing from home's middle (atan2 of z over x, radians) of a point */
export function bearingFromHome(x: number, z: number): number {
  return Math.atan2(z - HOME_Z, x - HOME_X);
}

/** a raid's seed, the day's: the same day draws the same sides */
export function raidSeedFor(day: number): number {
  return Math.floor(mulberry32(0x5eed + day * 7919)() * 4294967296);
}

/** The sides a raid with this seed comes at the homestead from, as bearings from home: the road's first, always (they
 *  walk in by it), then one flank of it, or both. */
export function raidSides(seed: number): number[] {
  const rnd = mulberry32(seed);
  const entry = roadEntry();
  const road = bearingFromHome(entry.x, entry.z);
  const flank = rnd() < 0.5 ? -FLANK : FLANK;
  return rnd() < 0.5 ? [road, road + flank] : [road, road + flank, road - flank];
}

/** The point the raid's `index`-th raider (id `id`, standing at `from`) walks in to: on the ring round home on side
 *  `index` of `sides` (taken in turn, so a raid of three covers two sides at the least), strayed by hash(id, seed) —
 *  the open cell nearest it (the grid's nearestWalkable) that he has a way to (navReachable); further out if the ring's
 *  is shut off from him, and null if none is (he then walks in to home's middle, as every raider used to). */
export function approachPoint(
  from: { x: number; z: number }, sides: number[], index: number, id: number, seed: number,
): { x: number; z: number } | null {
  if (!sides.length) return null;
  const rnd = mulberry32((seed ^ Math.imul(id, 0x9e3779b1)) >>> 0);
  const bearing = sides[index % sides.length] + (rnd() * 2 - 1) * STRAY;
  const grid = getNavGrid(null);
  for (let r = APPROACH_RING; r <= APPROACH_RING + 2 * RING_STEP; r += RING_STEP) {
    const at = grid.nearestWalkable(HOME_X + Math.cos(bearing) * r, HOME_Z + Math.sin(bearing) * r);
    if (at && navReachable(from.x, from.z, at.x, at.z)) return at;
  }
  return null;
}
