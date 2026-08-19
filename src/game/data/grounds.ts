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
import { LAND_TIERS, landHalf, landSouthHalf, MAX_LAND_TIER } from './buildables';
import GROUNDS_DATA from './grounds.generated.json';

/**
 * Empire arc, Wave 5 · the rectangle a resource cluster seeds inside, split
 * out of `Ground` so a cultivated plot (types.ts's CultivatedPlot) is the same
 * shape without inheriting the deed ladder — a plot is worked because you
 * planted it, not because a tier bought it. Everything that reasons about the
 * rectangle (the scatter in gameStore's scatterNodesInRect, the overlap
 * assertions below, Grounds.tsx's fence run) takes one of these, so grounds
 * and plots can never drift apart on geometry.
 */
export interface RectSection {
  /** what seeds here */
  kind: 'tree' | 'rock' | 'herb';
  /** rock sections can be plain stone or the iron variant */
  variant?: 'iron';
  /** centre, and half-extents — sections are RECTANGULAR pieces on the same
   *  grid the homestead builds on, not circles. A circle cannot be checked
   *  against a square build region without leaving slivers, and its edge cuts
   *  across build tiles so a node could seed on half a square. */
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  /** how many nodes seed inside it */
  count: number;
  /** may seed inside the pond's shore ring. Only the Home Grove sets this:
   *  it is deliberately pond-adjacent (its own flavour text is written around
   *  that walk) and some of its candidates genuinely fall in the ring the
   *  scatter otherwise keeps clear. Was a literal `g.id !== 'grove'` test
   *  inside seedNodes before the scatter became section-driven. */
  pondShore?: boolean;
}

export interface Ground extends RectSection {
  id: string;
  name: string;
  /** land tier (index into LAND_TIERS) the deed must reach to work it */
  tier: number;
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
// Wave 6 · the entries themselves (position/size/count per ground) now live
// in grounds.generated.json, editable live at /secret/worldeditor instead of
// by hand — every per-entry siting rationale quoted in this comment block
// up to 2026-08-05 is preserved in git history (this file's own log) rather
// than carried forward into JSON, which has no comment syntax. The editor's
// own live overlap/clearance/road-crossing checks (the same sectionsOverlap/
// clearsHomestead below, plus Grounds.tsx's road-tile check) are the
// replacement for "read the siting comment before moving anything."
export const GROUNDS = GROUNDS_DATA as unknown as Ground[];

/**
 * L70 · Every ground must clear the homestead, and each other. The first
 * layout put the Home Grove eleven metres from ground the deed ladder
 * eventually covers, so a fully-bought holding had a forest inside its fence.
 * This is asserted rather than eyeballed because BUILD_REGION grows with the
 * land tiers and would silently swallow a ground again.
 */
const HOMESTEAD_CLEARANCE = 8;

/** plain AABB test between two sections — exported so Wave 5's cultivated
 *  plots are held to the identical check rather than a second copy of it */
export function sectionsOverlap(a: RectSection, b: RectSection): boolean {
  return Math.abs(a.x - b.x) < a.halfX + b.halfX && Math.abs(a.z - b.z) < a.halfZ + b.halfZ;
}

/** does a section sit clear of the homestead at its widest bought extent?
 *
 *  Wave 17 #4 · the fence is no longer one shared number on every side (see
 *  buildables.ts's LAND_TIERS note): north/east/west still share `half`, but
 *  south is the separate, fixed `southHalf`. The X check stays against
 *  `half` (both east and west really do still share it), but the Z check now
 *  picks the bound for the side the section is actually ON — `southHalf` for
 *  a section south of the homestead (the real case: every one of GROUNDS
 *  sits south, per this file's own header), `half` for one to the north.
 *  Every real ground clears by a huge margin on the X axis regardless (this
 *  was checking the wrong number for six years and it never mattered), but a
 *  future ground sited close to the now much tighter south edge needs the
 *  real bound, not the north one, standing guard. */
export function clearsHomestead(s: RectSection): boolean {
  const xHalf = landHalf(MAX_LAND_TIER) + HOMESTEAD_CLEARANCE;
  const zHalf = (s.z >= 0 ? landSouthHalf(MAX_LAND_TIER) : landHalf(MAX_LAND_TIER)) + HOMESTEAD_CLEARANCE;
  return Math.abs(s.x) - s.halfX >= xHalf || Math.abs(s.z) - s.halfZ >= zHalf;
}

if (process.env.NODE_ENV !== 'production') {
  for (const g of GROUNDS) {
    if (!clearsHomestead(g)) {
      // eslint-disable-next-line no-console
      console.warn(`[grounds] ${g.id} overlaps the fully-bought homestead`);
    }
    for (const o of GROUNDS) {
      if (o.id === g.id) continue;
      if (sectionsOverlap(g, o)) {
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
