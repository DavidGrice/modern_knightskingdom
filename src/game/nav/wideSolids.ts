'use client';
// What a wide walker steers clear of besides what stops every walker (nav/grid.ts's wide mask).
//
// The grid is made from what stops a walker — the player's buildings, the walls the world puts up itself and the
// village's huts and signpost (fixedSolids.ts), water and the terrain the walkers keep off — for a walker no fatter
// than its AGENT_RADIUS. The merchant is wider: he leads his cart and team, two horses abreast, 1.84 m across, along
// his own track (Merchant.tsx), and the trees and rocks stand along his road, which the grid does not hold (every other
// walker steers round them: nav/steering.ts) — but a team must not be seen passing through a tree, so his way is
// planned round them, as well as wide. The huts and the signpost are in the list too, as they were before the grid
// held them: stamped again, by the grid's own rule, they change nothing in his mask.
import { drawnSolids, standingSolids, type WorldSolid } from '../fixedSolids';

const NONE: WorldSolid[] = [];
let kept: { standing: WorldSolid[]; list: WorldSolid[] } | null = null;

/** The solids a wide walker keeps clear of in `region` (null: the homestead) besides what the grid holds — at home the
 *  village's huts and the signpost, and the trees and rocks standing there now (fixedSolids.ts's drawnSolids and
 *  standingSolids); nowhere else, any. The same list while what it holds is the same, so that what keeps a mask made
 *  from it makes it again only when the trees and rocks standing at home change. */
export function wideSolids(region: string | null): WorldSolid[] {
  if (region !== null) return NONE;
  const standing = standingSolids(region);
  if (!kept || kept.standing !== standing) kept = { standing, list: [...drawnSolids(region), ...standing] };
  return kept.list;
}
