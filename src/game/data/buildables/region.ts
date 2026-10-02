// CLN-10 · split out of buildables.ts unchanged: the build grid and the region a piece may be placed in — the
// homestead at its current land tier, or a claimed plot at a destination.
import type { ClaimedPlot } from '../../types';
import { LAND_TIERS, MAX_LAND_TIER, landHalf, landSouthHalf } from '../landTiers';

// Grid pitches in meters: big structures snap to GRID, brick-scale pieces to STUD.
export const GRID = 2;
export const STUD = 0.35;

// The widest the homestead ever gets. Anything that needs a fixed outer bound
// (the nav grid, the "is this prop inside the build area" guard) uses this,
// and it is deliberately LARGER than the old flat 60m so no existing save can
// have a building stranded outside its own region by this change.
//
// Asymmetric on Z since Wave 17 #4: `maxZ` is the (small, fixed) south bound,
// not a mirror of `minZ` — see the LAND_TIERS note (landTiers.ts).
export const BUILD_REGION = {
  minX: -LAND_TIERS[MAX_LAND_TIER].half, maxX: LAND_TIERS[MAX_LAND_TIER].half,
  minZ: -LAND_TIERS[MAX_LAND_TIER].half, maxZ: LAND_TIERS[MAX_LAND_TIER].southHalf,
};

export const MAX_STACK_HEIGHT = 14;

// A claimed template-world plot (Phase 13): smaller than the home region — a
// modest outpost, not a second full homestead — centered wherever the player
// stood when they claimed it, leveled to that one sampled ground height
// rather than following the bake's real slope (a deliberate simplification;
// see ROADMAP.md's Phase 13 notes).
export const CLAIM_RADIUS = 14;

/** the active build region + ground level: the home plot, or a claimed
 *  template-world plot while visiting one (falls back to the home region if
 *  the current destination hasn't been claimed, so evalPlacement always has
 *  *some* bounds to check even before build mode becomes reachable there) */
export function activeBuildRegion(claim: ClaimedPlot | undefined | null, landTier = MAX_LAND_TIER) {
  if (!claim) {
    const h = landHalf(landTier);
    const s = landSouthHalf(landTier);
    return { minX: -h, maxX: h, minZ: -h, maxZ: s, groundY: 0 };
  }
  return {
    minX: claim.x - CLAIM_RADIUS, maxX: claim.x + CLAIM_RADIUS,
    minZ: claim.z - CLAIM_RADIUS, maxZ: claim.z + CLAIM_RADIUS,
    groundY: claim.groundY,
  };
}
