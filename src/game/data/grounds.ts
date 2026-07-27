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

export const GROUNDS: Ground[] = [
  {
    // east of the road and north of the pond (52, 42, r8) — the first wood
    // you meet, and the walk to it passes the water
    id: 'grove', name: 'The Home Grove', kind: 'tree',
    x: 30, z: 62, halfX: 16, halfZ: 10, tier: 0, count: 6,
    lockedHint: 'Yours from the first day',
  },
  {
    // well west of the road's western end (x -44.8) and clear of its northern
    // branch, so a full stand of timber never grows across the highway
    id: 'northwood', name: 'Northwood Stand', kind: 'tree',
    x: -72, z: 8, halfX: 18, halfZ: 16, tier: 0, count: 12,
    lockedHint: 'Yours from the first day',
  },
  {
    id: 'herbmeadow', name: 'The Herb Meadow', kind: 'herb',
    x: -62, z: -46, halfX: 14, halfZ: 14, tier: 0, count: 7,
    lockedHint: 'Yours from the first day',
  },
  {
    id: 'quarry', name: 'The Old Quarry', kind: 'rock',
    x: 62, z: -6, halfX: 14, halfZ: 16, tier: 1, count: 8,
    lockedHint: 'Quarried under the Freehold deed',
  },
  {
    id: 'ironseam', name: 'The Iron Seam', kind: 'rock', variant: 'iron',
    x: 62, z: -48, halfX: 14, halfZ: 12, tier: 2, count: 5,
    lockedHint: 'Dug under the Manor deed',
  },
  {
    id: 'deepwood', name: 'The Deepwood', kind: 'tree',
    x: 0, z: -64, halfX: 20, halfZ: 12, tier: 3, count: 14,
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
