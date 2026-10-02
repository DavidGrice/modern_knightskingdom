// CLN-10 · this file is a barrel. What used to be one 1117-line module is, in dependency order:
//   landTiers.ts             the land tiers and their lookups (nothing imported but the generated table)
//   buildables/region.ts     the build grid, and the region a piece may be placed in
//   buildables/catalog.ts    every piece the player can place, and the lookups that are pure functions of it
//   buildables/costBill.ts   a piece's cost as the lines a panel prints
//   buildables/collision.ts  footprints, heights and the collision boxes
// Everything this module ever exported is re-exported below, so no importer changed.
import { exposeDebug } from '@/lib/debugHooks';
import { collisionBoxesFor } from './buildables/collision';

export { LAND_TIERS, MAX_LAND_TIER, landHalf, landSouthHalf } from './landTiers';
export { GRID, BUILD_REGION, MAX_STACK_HEIGHT, CLAIM_RADIUS, activeBuildRegion } from './buildables/region';
export {
  BUILDABLES, BUILDABLE_BY_ID, BUILD_CATEGORIES, labAssetId, buildableForLabAsset, maxHpFor,
} from './buildables/catalog';
export { costBill } from './buildables/costBill';
export { sizeFor, heightOf, buildingsInRect, solidOffsetRotated, collisionBoxesFor } from './buildables/collision';
export type { CollisionBox } from './buildables/collision';

// The dev-only "no fixed world prop inside BUILD_REGION" guard that used to
// live here moved to world.ts (2026-08-25) — it needs FIXED_WORLD_PROPS
// (world.ts) AND BUILD_REGION (here), and world.ts needing worlds.ts (for
// the new durable-storage resolveDestPoint calls) would otherwise complete a
// real import cycle: worlds.ts -> dungeon.ts -> buildables.ts -> world.ts ->
// worlds.ts. Keeping the check here and having world.ts import BUILD_REGION
// FROM here (below, unchanged) breaks that cycle instead of completing it —
// see world.ts's own comment at the relocated check for the assertion
// itself.

// debug handle: lets a smoke test compare the collision volumes against the
// mesh that is actually drawn (see scripts/smoke123.mjs)
exposeDebug('__kkcollideFor', (type: string, rot: number) =>
  collisionBoxesFor(type, rot));
