'use client';
// What a wide walker steers clear of besides what stops every walker (nav/grid.ts's wide mask).
//
// The grid is made from what stops a walker — the player's buildings, the walls the world puts up itself
// (fixedSolids.ts), water and the terrain the walkers keep off — for a walker no fatter than its AGENT_RADIUS. The
// merchant is wider: he leads his cart and team, two horses abreast, 1.84 m across, along his own track
// (Merchant.tsx), and things stand along his road that the grid does not hold at all: the village's two huts and the
// signpost, drawn and solid for nobody, and the trees and rocks, solid for the player only (the trunk and boulder
// circles in game/playerPhysics/collide.ts). That the grid lets every walker through them is a fault of its own (ROADMAP.md, "the
// village's huts and the signpost stop nobody, and the trees and rocks stop only the player") — but a team must not be
// seen passing through a hut or a tree, so his way is planned round them, as well as wide.
import { SIGNPOST, SIGNPOST_HALF, VILLAGE_HUT_HALF, VILLAGE_HUTS } from '../data/world';
import { useGameStore } from '../store/gameStore';

/** A turned rectangle — its centre, half its sides along its own x and z, turned by `yaw` as three.js turns an object
 *  about +Y (its own +x lies along (cos yaw, -sin yaw) in the world) — or a circle. */
export type WideSolid =
  | { kind: 'box'; x: number; z: number; hx: number; hz: number; yaw: number }
  | { kind: 'circle'; x: number; z: number; r: number };

const DRAWN: WideSolid[] = [
  ...VILLAGE_HUTS.map((h): WideSolid => ({ kind: 'box', x: h.x, z: h.z, hx: VILLAGE_HUT_HALF, hz: VILLAGE_HUT_HALF, yaw: h.yaw })),
  { kind: 'box', x: SIGNPOST.x, z: SIGNPOST.z, hx: SIGNPOST_HALF.x, hz: SIGNPOST_HALF.z, yaw: 0 },
];
const NONE: WideSolid[] = [];
let kept: { nodes: unknown; list: WideSolid[] } | null = null;

/** The solids a wide walker keeps clear of in `region` (null: the homestead) besides what the grid holds — at home the
 *  village's huts and the signpost (data/world.ts), and the trees and rocks standing there now, each a circle of the
 *  radius the player is stopped at (game/playerPhysics/collide.ts: 0.55 × its scale a tree, 1.1 × its scale a rock); nowhere
 *  else, any. The same list while what it holds is the same — the store makes its nodes afresh at every swing at a
 *  tree or a rock, and at every herb picked, which change nothing here — so that what keeps a mask made from it makes
 *  it again only when the trees and rocks standing at home change: one felled or grown back, a plot of them planted
 *  or watered, or the nodes seeded afresh (a deed bought, a game started or loaded). */
export function wideSolids(region: string | null): WideSolid[] {
  if (region !== null) return NONE;
  const nodes = useGameStore.getState().nodes;
  if (kept && kept.nodes === nodes) return kept.list;
  const list = [...DRAWN];
  for (const n of nodes) {
    if (n.world || n.respawnAt !== null || (n.kind !== 'tree' && n.kind !== 'rock')) continue;
    list.push({ kind: 'circle', x: n.x, z: n.z, r: (n.kind === 'tree' ? 0.55 : 1.1) * n.scale });
  }
  kept = { nodes, list: kept && sameSolids(kept.list, list) ? kept.list : list };
  return kept.list;
}

/** whether two lists hold the same solids, in the same order (the drawn ones are the same objects in every list) */
function sameSolids(a: WideSolid[], b: WideSolid[]): boolean {
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k++) {
    const p = a[k], q = b[k];
    if (p === q) continue;
    if (p.kind !== 'circle' || q.kind !== 'circle' || p.x !== q.x || p.z !== q.z || p.r !== q.r) return false;
  }
  return true;
}
