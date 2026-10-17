// The walls the world puts up itself, as solids for the code that asks what stops a walker.
//
// Everything a player builds is a PlacedBuilding in the store, and three readers turn those into obstacles with
// collisionBoxesFor: the player's own collision at home (PlayerController.tsx), the navigation grid (nav/grid.ts's
// rebuild) and line of sight (nav/lineOfSight.ts). The merchant's camp is not built by the player — its five pieces of
// castle wall are a table, MERCHANT_CAMP_WALLS (data/trade.ts), drawn by MerchantCamp.tsx — and none of the three
// read it, so the walls stopped nobody: a player walked straight through any of them, the grid had none of their
// cells, and an arrow flew through (ROADMAP.md, "Bugfix: the walls of the merchant's camp stopped nobody").
//
// Here they are made into PlacedBuilding-shaped entries those readers can take next to the store's own list — never
// INTO it, where they would be saved, demolished, sieged, counted and offered for interaction like the player's own
// (the Crypt's walls are made the same way: nav/registry.ts's dungeonWallBuildings).
//
// A placed piece's mesh is drawn shifted by its solid offset and its collision boxes are re-centred by the same
// amount (Buildings.tsx, collision.ts); the camp draws each piece at the table's point, unshifted. So each entry
// stands at the table's point PLUS the solid offset, which puts the boxes back on the stone that is drawn. The offset
// is known only once the voxel shapes have loaded (collisionShapes.ts, which fetches them as soon as the title
// screen's code loads): until then the entries stand at the table's points and collisionBoxesFor answers with its
// fallback boxes, centred there — for these pieces, cores short of each piece's ends, which leaves the camp's seams
// open, and as much as 1.24 m off the stone's faces — and a fresh list is made on each call, so that what remembers a
// list by its identity (the grid, line of sight) takes the real boxes as soon as they come. Once the file has been
// read the list is made once and kept — also when it has no shape for a piece or could not be fetched, which leave
// the fallback boxes for good: a list made afresh on every call would have line of sight remake every building's
// boxes on every query.
import { knownSolidOffsetRotated } from './data/buildables';
import { MERCHANT_CAMP_WALLS } from './data/trade';
import type { PlacedBuilding } from './types';

const NONE: PlacedBuilding[] = [];
let known: PlacedBuilding[] | null = null;

/** a table yaw as the quarter turn a placed piece uses (Buildings.tsx draws rot r at yaw r·π/2) */
export function quarterTurnOf(yaw: number): 0 | 1 | 2 | 3 {
  return (((Math.round(yaw / (Math.PI / 2)) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

/** The fixed solids standing in `region` (null: the homestead) — today the merchant camp's walls, at home only. */
export function fixedSolids(region: string | null): PlacedBuilding[] {
  if (region !== null) return NONE;
  if (known) return known;
  let allKnown = true;
  const list = MERCHANT_CAMP_WALLS.map((w, i): PlacedBuilding => {
    const rot = quarterTurnOf(w.yaw);
    const off = knownSolidOffsetRotated(w.model, rot);
    if (!off) allKnown = false;
    const [ox, oz] = off ?? [0, 0];
    return { id: `merchant-camp-wall-${i}`, type: w.model, x: w.x + ox, z: w.z + oz, y: 0, rot, world: null };
  });
  if (allKnown) known = list;
  return list;
}
