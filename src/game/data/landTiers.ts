// CLN-10 · the land tiers on their own: the table and its two lookups, with nothing imported but the generated
// data. Split out of buildables.ts so that reading how big the homestead is does not pull in the whole build
// catalogue; buildables.ts re-exports all four names.
import LAND_TIERS_DATA from './landTiers.generated.json';

// ---------------------------------------------------------------------------
// F19/F20 · The homestead's buildable ground, sized so a castle actually TILES.
//
// A straight wall is 8m and a corner is 4m, so one finished side is
// `corner + N×wall + corner` = 8N + 8 metres. The old region was a flat 60m
// across, which is not one of those numbers — a four-wall run plus corners
// came to 40 and left a ragged 20m of grid with no piece that fitted it.
// Every tier below is a real 8N+8, so a run always closes on a corner.
//
// The tiers are also the land you buy (F20): you start on a small holding and
// push the fence out, and each expansion brings whatever was standing on that
// ground — trees, ore — inside the fold.
// Wave 6 · entries edited live at /secret/worldeditor, source in
// landTiers.generated.json — see grounds.generated.json's own note in
// grounds.ts for why this moved off a hand-written literal.
//
// Wave 17 #4 · the fence stopped being a square. `half` is still the shared
// half-extent for THREE of the four sides (north/east/west — every one of
// them still equal to each other, so every existing `landHalf()` call site
// keeps meaning exactly what it always meant), but the south side no longer
// grows with the rest: the real east road's westmost plate sits with its own
// near edge only 19.2m off the homestead's own centre (Road.tsx's 12.8m
// plates, `[0, SZ-1]` — see road.ts's own LEGS comment), and a fence that
// kept growing at the old uniform `half` reached and then swallowed that
// plate outright at Freehold and up (Barony fully enclosed three tiles of
// real road — the "overlaps the east road" bug this pass closes). `southHalf`
// is a SEPARATE, constant field for exactly that one side: 12 at every tier
// (8m past the project's own HOMESTEAD_CLEARANCE precedent past the 19.2m
// road edge, rounded to the same multiple-of-4 grid every other tier number
// already uses), so the south fence can never again grow to meet the road no
// matter how the other three sides scale. See `landSouthHalf()` below.
export const LAND_TIERS = LAND_TIERS_DATA as unknown as
  { walls: number; half: number; southHalf: number; cost: number; name: string }[];

export const MAX_LAND_TIER = LAND_TIERS.length - 1;

/** half-extent of the homestead at a given tier, on the north/east/west
 *  sides — the three that still share one number. */
export function landHalf(tier: number): number {
  return LAND_TIERS[Math.max(0, Math.min(MAX_LAND_TIER, tier))].half;
}

/** half-extent on the SOUTH side alone — constant across every tier (see the
 *  module note above): the one side that stays clear of the real road for
 *  good, rather than eventually growing to meet it again. */
export function landSouthHalf(tier: number): number {
  return LAND_TIERS[Math.max(0, Math.min(MAX_LAND_TIER, tier))].southHalf;
}
