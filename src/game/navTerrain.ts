// Phase 2, iteration 2.1 — terrain traversal exclusions.
//
// `navgrid.ts` derives every obstacle from `collisionBoxesFor(b.type, b.rot)`
// over buildings. The pond is terrain (`Terrain.tsx` / `POND`), never a
// building, so it never entered the obstacle set — any path could (and did)
// route straight across water. This closes that gap.
//
// Deliberately a SECOND obstacle source, and worth being honest about the
// tension with navgrid's own "one source of truth" argument against navcat
// (PHASE_2_NAVIGATION_AND_GATHERING.md §0): navcat's second source would
// have been the entire continuously-mutating building set, duplicating
// collisionBoxesFor's job. This is a handful of static declarative entries
// covering a category collision genuinely does not model — traversal
// PERMISSION versus physical collision. The player wades into the pond and
// fishes from it by design; a villager should not path through it. Different
// questions, correctly different answers, and the list stays small and
// hand-authored on purpose — it is not trying to become a second geometry
// pipeline.
//
// Leaf module: imports nothing from the store or from src/ai, matching the
// convention road.ts/carts.ts already use for exactly this reason.

import { POND } from './data/world';
import { DOWNS } from './data/downs';
import { waterworks } from './waterworks';

export interface TerrainExclusion {
  id: string;
  /** null = home. No destination/crypt exclusions exist yet — nothing to
   *  add one for until phase 2's later iterations give those regions a grid
   *  at all. */
  region: string | null;
  shape:
    | { kind: 'circle'; x: number; z: number; r: number }
    | { kind: 'aabb'; x: number; z: number; hx: number; hz: number };
  /** phase 2 implements 'blocked' only; 'costly' exists so shallows/mud can
   *  be added later without a schema change — see costMultiplier. */
  traversal: 'blocked' | 'costly';
  costMultiplier?: number;
}

export const terrainExclusions: TerrainExclusion[] = [
  { id: 'pond', region: null, shape: { kind: 'circle', x: POND.x, z: POND.z, r: POND.radius }, traversal: 'blocked' },
  // Wave 17 #6 · the home nav grid widened from ±56m to ±200m (see
  // navgrid.json's own note) so villagers can actually route to the real
  // GROUNDS (up to ~197m out) instead of beelining the whole trip. The Downs
  // (data/downs.ts) sit at z:[-128,-60] — well inside ±200m now — but every
  // home-world walker still draws at a hardcoded y=0 (Villagers.tsx/Npc.tsx);
  // that prototype was kept walkable-proof by living OUTSIDE the grid, not by
  // any terrain check, so widening the grid alone would let a walker route
  // straight onto a hillside it cannot climb. This entry is the replacement
  // guarantee — see the dev-mode assertion below that checks it is actually
  // there, and data/downs.ts's own header for the full history.
  {
    id: 'downs', region: null,
    shape: { kind: 'aabb', x: DOWNS.x, z: DOWNS.z, hx: DOWNS.half, hz: DOWNS.half },
    traversal: 'blocked',
  },
];

if (process.env.NODE_ENV !== 'production' && terrainExclusions.length === 0) {
  // eslint-disable-next-line no-console
  console.warn('[navTerrain] terrainExclusions is empty — water (and any other traversal-only feature) will be pathable.');
}

/**
 * Wave 12 · the static table above PLUS whatever the player has dug
 * (game/waterworks.ts). This is the "runtime-growable exclusion list" a
 * player-diggable waterway needs, and it is deliberately a DERIVED view rather
 * than pushes into `terrainExclusions` itself: that array is hand-authored
 * world geography, it must survive a save being loaded over the top of another
 * one, and a `.push()` on load with no matching removal is exactly how a list
 * like this ends up holding the last three characters' moats.
 *
 * Memoised on `waterworks.rev` because `terrainBlocks` below is called once per
 * candidate cell of a nav rebuild — thousands of times in a burst — and
 * rebuilding a merged array inside that loop would be the one genuinely hot
 * allocation in the whole feature.
 */
let mergedCache: TerrainExclusion[] = terrainExclusions;
let mergedRev = -1;
export function activeTerrainExclusions(): TerrainExclusion[] {
  if (mergedRev === waterworks.rev) return mergedCache;
  mergedRev = waterworks.rev;
  mergedCache = waterworks.list.length === 0 ? terrainExclusions : [
    ...terrainExclusions,
    ...waterworks.list.map((w): TerrainExclusion => ({
      // `dug:` prefixed so an id can never collide with a hand-authored entry
      id: `dug:${w.id}`,
      region: null, // home only — see WaterFeature's own note on why
      shape: { kind: 'aabb', x: w.x, z: w.z, hx: w.halfX, hz: w.halfZ },
      traversal: 'blocked',
    })),
  ];
  return mergedCache;
}

/** True if (x, z) falls inside a 'blocked' exclusion for `region`. Grid
 *  construction stamps this in after building obstacles (navgrid.ts). Not
 *  hot-path-critical today (called once per obstacle cell during a rebuild,
 *  not per frame), so a plain loop over a short list is fine — this is not
 *  the place to reach for a spatial index. */
export function terrainBlocks(x: number, z: number, region: string | null): boolean {
  for (const ex of activeTerrainExclusions()) {
    if (ex.traversal !== 'blocked' || ex.region !== region) continue;
    if (ex.shape.kind === 'circle') {
      const dx = x - ex.shape.x;
      const dz = z - ex.shape.z;
      if (dx * dx + dz * dz <= ex.shape.r * ex.shape.r) return true;
    } else {
      if (Math.abs(x - ex.shape.x) <= ex.shape.hx && Math.abs(z - ex.shape.z) <= ex.shape.hz) return true;
    }
  }
  return false;
}

// Wave 17 #6 · downs.ts used to prove "villagers can't stand on the hill" by
// asserting its own box sat outside the (then ±56m) home nav grid entirely —
// a walker outside the grid has no cells at all. Widening that grid to ±200m
// (navgrid.json) so hauls can reach the real GROUNDS put the box 140m inside
// it instead, so that proof moved here: this IS the entry that now keeps it
// unreachable, so checking its own centre resolves 'blocked' is the same
// "asserted rather than remembered" guard downs.ts used to run itself, aimed
// at the one way this could actually go stale — the 'downs' entry above being
// deleted or its region/traversal edited, not DOWNS.x/z/half drifting (this
// file reads those live, so drift there re-derives correctly on its own).
if (process.env.NODE_ENV !== 'production' && !terrainBlocks(DOWNS.x, DOWNS.z, null)) {
  // eslint-disable-next-line no-console
  console.warn('[navTerrain] DOWNS is not covered by a \'blocked\' exclusion — the home nav grid '
    + 'reaches ±200m now (Wave 17 #6) and would let a walker route straight onto the hillside that '
    + 'Villagers.tsx/Npc.tsx still draw every one of them at a hardcoded y=0.');
}
