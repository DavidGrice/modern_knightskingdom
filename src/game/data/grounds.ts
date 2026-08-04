// J46 · Resource grounds.
//
// Gathering used to happen wherever a node happened to seed: a boulder field
// "to the east" because that is where the loop scattered it, herbs at random
// bearings. Nothing about the land ladder (F20's tiers) changed what you could
// work, so buying the Manor bought you a wider fence and nothing else.
//
// A ground is a named, bounded piece of country that yields one thing and
// belongs to a deed. You can walk into a ground above your tier and see what
// is in it — that is the point — but you cannot work it until the deed covers
// it. Buying the Freehold hands you the quarry; the Manor, the iron seam.
import { LAND_TIERS } from './buildables';

export interface Ground {
  id: string;
  name: string;
  /** what seeds here */
  kind: 'tree' | 'rock' | 'herb';
  /** rock grounds can be plain stone or the iron variant */
  variant?: 'iron';
  /** centre, and half-extents — grounds are RECTANGULAR sections on the same
   *  grid the homestead builds on, not circles. A circle cannot be checked
   *  against a square build region without leaving slivers, and its edge cuts
   *  across build tiles so a node could seed on half a square. */
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  /** land tier (index into LAND_TIERS) the deed must reach to work it */
  tier: number;
  /** how many nodes seed inside it */
  count: number;
  /** shown on the boundary marker while it is beyond your deed */
  lockedHint: string;
}

// Requested 2026-07-30: four of the original six sat on the north side
// (-Z), confirmed two independent ways (`keep.ts`'s wall sockets,
// `Compass.tsx`'s own bearing math) — leaving the whole south half, where
// there was room for it, without a single ground and no clear sense of
// "which way the kingdom actually grows." South/southwest isn't empty
// ground, though: SPAWN, SIGNPOST, the starter village, the road's western
// leg and its own verge trees all live there (see world.ts/road.ts) — so
// the fix is a real redistribution, not just "flip the sign," and every new
// position below is checked against that whole cluster, not eyeballed.
// The Home Grove keeps its pond-side spot (its own flavour text is written
// around that walk); Northwood Stand and the Herb Meadow fill south-west
// and due south.
//
// Superseded 2026-08-03: Old Quarry/Iron Seam/Deepwood's own north-leaning
// spots (E/NE/N) got pulled south too — the whole north side is now
// reserved on purpose for the kingdom's own future expansion, not parceled
// out to resource grounds. Every "rock" ground (Old Quarry, Iron Seam) now
// sits south-east; every "tree" ground (Home Grove, Northwood Stand,
// Deepwood) sits south, from SE through SW. Net: every ground south of the
// equator, north completely clear.
export const GROUNDS: Ground[] = [
  {
    // east of the road and north of the pond (52, 42, r8) — the first wood
    // you meet, and the walk to it passes the water. Unchanged: this is not
    // one of the "clustered north" grounds, and the flavour text above
    // depends on the pond-side spot specifically.
    id: 'grove', name: 'The Home Grove', kind: 'tree',
    x: 30, z: 62, halfX: 16, halfZ: 10, tier: 0, count: 6,
    lockedHint: 'Yours from the first day',
  },
  {
    // moved from due west to south-west — the one direction the SW cluster
    // (signpost, starter village, road) left nothing standing in. Far enough
    // out on both axes to clear all three: west of the road's own western
    // end (x -38.4) and south of Beda's hut (z 44) with room either way.
    id: 'northwood', name: 'Northwood Stand', kind: 'tree',
    x: -70, z: 70, halfX: 18, halfZ: 16, tier: 0, count: 12,
    lockedHint: 'Yours from the first day',
  },
  {
    // moved from north-west to due south — the only direction with nothing
    // in it at all until now; well clear of the road's own southward branch
    // (out to z 64) and of the Home Grove's own south-east corner.
    id: 'herbmeadow', name: 'The Herb Meadow', kind: 'herb',
    x: -5, z: 90, halfX: 14, halfZ: 14, tier: 0, count: 7,
    lockedHint: 'Yours from the first day',
  },
  {
    // Requested 2026-08-03, then pushed further east the same day: the
    // first (85, 45) spot put its own box (x:[71,99], z:[29,61]) directly
    // across the brook's line from the pond to the spring (Terrain.tsx's
    // Stream, (58.5,45)->(140,68)) — the brook's z rises with x along that
    // whole span, and 71-99 sat right in the middle of it, so the fence and
    // any seeded boulders visibly crossed the water. Moved past the
    // spring's own endpoint (x=140) entirely, so the brook (which only
    // exists between those two x values) can't cross this box at all: at
    // this box's one sliver of shared x-range with the brook (136-140) the
    // brook's own z is 66.9-68, well above this box's z-max of 51. Also
    // clear of the Home Grove (dx 120 vs halfX sum 30) and the pond
    // (nearest point (136,42), 84 units off, nowhere close to its ~9.6
    // radius+sand-ring).
    id: 'quarry', name: 'The Old Quarry', kind: 'rock',
    x: 150, z: 35, halfX: 14, halfZ: 16, tier: 1, count: 8,
    lockedHint: 'Quarried under the Freehold deed',
  },
  {
    // Requested 2026-08-03, pushed east alongside the Old Quarry (see its
    // own comment) rather than left at (100, 90) — this box (x:[141,169])
    // only just clears Old Quarry's new one (x:[136,164]) on X (dx 5 <
    // halfX sum 28), so the real separation is on Z instead (dz 55 vs
    // halfZ sum 28, clears easily). Checked clear of the homestead (x 141 -
    // halfX 14 = 127, well past the 40 line) and stays inside seedNodes'
    // own WORLD_HALF-20 node-placement bound (outer edge ~166.8).
    id: 'ironseam', name: 'The Iron Seam', kind: 'rock', variant: 'iron',
    x: 155, z: 90, halfX: 14, halfZ: 12, tier: 2, count: 5,
    lockedHint: 'Dug under the Manor deed',
  },
  {
    // Requested 2026-08-03: moved from due north (0, -70) into the
    // south-west, further out past Northwood Stand — every "tree" ground
    // now sits south of the equator (Home Grove SE, Northwood Stand SW,
    // Deepwood further SW still), and the north side is kept completely
    // free for the kingdom's own future expansion rather than fenced off
    // by a resource ground. Checked clear of Northwood Stand (dx 40 vs
    // halfX sum 38) and of the homestead (x 110 - halfX 20 = 90).
    id: 'deepwood', name: 'The Deepwood', kind: 'tree',
    x: -110, z: 100, halfX: 20, halfZ: 12, tier: 3, count: 14,
    lockedHint: 'Felled under the Barony deed',
  },
];

/**
 * L70 · Every ground must clear the homestead, and each other. The first
 * layout put the Home Grove eleven metres from ground the deed ladder
 * eventually covers, so a fully-bought holding had a forest inside its fence.
 * This is asserted rather than eyeballed because BUILD_REGION grows with the
 * land tiers and would silently swallow a ground again.
 */
const HOMESTEAD_CLEARANCE = 8;
if (process.env.NODE_ENV !== 'production') {
  const half = LAND_TIERS[LAND_TIERS.length - 1].half + HOMESTEAD_CLEARANCE;
  for (const g of GROUNDS) {
    if (Math.abs(g.x) - g.halfX < half && Math.abs(g.z) - g.halfZ < half) {
      // eslint-disable-next-line no-console
      console.warn(`[grounds] ${g.id} overlaps the fully-bought homestead`);
    }
    for (const o of GROUNDS) {
      if (o.id === g.id) continue;
      if (Math.abs(g.x - o.x) < g.halfX + o.halfX && Math.abs(g.z - o.z) < g.halfZ + o.halfZ) {
        // eslint-disable-next-line no-console
        console.warn(`[grounds] ${g.id} overlaps ${o.id}`);
      }
    }
  }
}

export const GROUND_BY_ID: Record<string, Ground> = Object.fromEntries(
  GROUNDS.map((g) => [g.id, g]),
);

/** which ground a point falls in, if any */
export function groundAt(x: number, z: number): Ground | null {
  for (const g of GROUNDS) {
    if (Math.abs(x - g.x) <= g.halfX && Math.abs(z - g.z) <= g.halfZ) return g;
  }
  return null;
}

/** may a holder of this deed work that ground? */
export function groundOpen(g: Ground, landTier: number): boolean {
  return landTier >= g.tier;
}

/** the deed a ground waits on, for the prompt that explains the refusal */
export function deedName(tier: number): string {
  return LAND_TIERS[Math.min(tier, LAND_TIERS.length - 1)]?.name ?? 'a greater deed';
}
