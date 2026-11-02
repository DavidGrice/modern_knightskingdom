// The walls the world puts up itself, as solids for the code that asks what stops a walker — and what else stands in
// the world: the village's huts and the signpost, the trees and the rocks. Each list is asked for by region (null:
// the homestead), which is the key a world's own solids are found under.
//
// Everything a player builds is a PlacedBuilding in the store, and three readers turn those into obstacles with
// collisionBoxesFor: the player's own collision at home (game/playerPhysics/collide.ts), the navigation grid (nav/grid.ts's
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
//
// The huts and the signpost are no placed piece and stand turned, so they are turned boxes (drawnSolids), read by the
// same three; the trees and rocks are circles (standingSolids) that walkers steer round (nav/steering.ts's
// steerRound) and the grid does not hold — stamped there they would send the gatherers of half the trees and of all
// but one rock to a cell 1.9 to 3.3 m from it, and leave that one rock out of reach (ROADMAP.md, "Bugfix: the
// village's huts and the signpost stopped nobody"). The merchant's wide way keeps clear of both (nav/wideSolids.ts).
import { knownSolidOffsetRotated } from './data/buildables';
import { MERCHANT_CAMP_WALLS } from './data/trade';
import { SIGNPOST, SIGNPOST_HALF, SIGNPOST_TOP, VILLAGE_HUT_HALF, VILLAGE_HUT_HEIGHT, VILLAGE_HUTS } from './data/world';
import { useGameStore } from './store/gameStore';
import type { PlacedBuilding } from './types';

/** A turned rectangle standing `top` metres tall: its centre, half its sides along its own x and z, turned by `yaw` as
 *  three.js turns an object about +Y (its own +x lies along (cos yaw, -sin yaw) in the world). */
export type SolidBox = { kind: 'box'; x: number; z: number; hx: number; hz: number; yaw: number; top: number };
/** a circle about (x, z) of radius r, from the ground up */
export type SolidCircle = { kind: 'circle'; x: number; z: number; r: number };
/** either: what the merchant's wide way keeps clear of (nav/wideSolids.ts) */
export type WorldSolid = SolidBox | SolidCircle;

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

const DRAWN = new Map<string | null, SolidBox[]>([
  [null, [
    ...VILLAGE_HUTS.map((h): SolidBox => ({
      kind: 'box', x: h.x, z: h.z, hx: VILLAGE_HUT_HALF, hz: VILLAGE_HUT_HALF, yaw: h.yaw, top: VILLAGE_HUT_HEIGHT,
    })),
    { kind: 'box', x: SIGNPOST.x, z: SIGNPOST.z, hx: SIGNPOST_HALF.x, hz: SIGNPOST_HALF.z, yaw: 0, top: SIGNPOST_TOP },
  ]],
]);
const NO_BOXES: SolidBox[] = [];

/** What the world draws in `region` that is no placed piece, as the boxes it stands on — at home the village's two
 *  huts and the signpost (data/world.ts); nowhere else, any. The same list on every call. */
export function drawnSolids(region: string | null): SolidBox[] {
  return DRAWN.get(region) ?? NO_BOXES;
}

const NO_CIRCLES: SolidCircle[] = [];
let kept: { nodes: unknown; list: SolidCircle[] } | null = null;

/** The trees and rocks standing in `region` now, each a circle of the radius the player is stopped at
 *  (game/playerPhysics/collide.ts: 0.55 × its scale a tree, 1.1 × its scale a rock) — at home; nowhere else, any. The
 *  same list while what it holds is the same — the store makes its nodes afresh at every swing at a tree or a rock,
 *  and at every herb picked, which change nothing here — so that what keeps something made from it makes it again
 *  only when the trees and rocks standing at home change: one felled or grown back, a plot of them planted or
 *  watered, or the nodes seeded afresh (a deed bought, a game started or loaded). */
export function standingSolids(region: string | null): SolidCircle[] {
  if (region !== null) return NO_CIRCLES;
  const nodes = useGameStore.getState().nodes;
  if (kept && kept.nodes === nodes) return kept.list;
  const list: SolidCircle[] = [];
  for (const n of nodes) {
    if (n.world || n.respawnAt !== null || (n.kind !== 'tree' && n.kind !== 'rock')) continue;
    list.push({ kind: 'circle', x: n.x, z: n.z, r: (n.kind === 'tree' ? 0.55 : 1.1) * n.scale });
  }
  kept = { nodes, list: kept && sameCircles(kept.list, list) ? kept.list : list };
  return kept.list;
}

/** whether two lists hold the same circles, in the same order */
function sameCircles(a: SolidCircle[], b: SolidCircle[]): boolean {
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k++) {
    const p = a[k], q = b[k];
    if (p.x !== q.x || p.z !== q.z || p.r !== q.r) return false;
  }
  return true;
}
