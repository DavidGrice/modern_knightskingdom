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
//
// Wave 69 (G-02) · and the Grand Keep's finished pieces. They are no placed piece either (they live in st.keep, the home
// keep's socket site), and the three readers skipped them, so a finished keep stopped nobody: the player walked through
// its walls, the raiders' ways ran through them, an arrow flew through. Now each piece standing on a socket — a wall
// run, a corner, a gatehouse shut — is a turned box on its socket's footprint (sites/sites.ts's siteSocketWorld), drawn
// with the huts (drawnSolids), so the player, the grid and line of sight take it as they take a hut; the raiders, who
// no grid stops, are put back out of it themselves (enemyAi/movement.ts). Left open, each a way in: a bare socket, a
// piece still going up, a ruin (a breach, OD-01), a gatehouse standing open, and the bailey's hall, which stands in the
// middle of the ring and walls nothing in.
import { knownSolidOffsetRotated } from './data/buildables';
import { MERCHANT_CAMP_WALLS } from './data/trade';
import { SIGNPOST, SIGNPOST_HALF, SIGNPOST_TOP, VILLAGE_HUT_HALF, VILLAGE_HUT_HEIGHT, VILLAGE_HUTS } from './data/world';
import { KEEP_PART_BY_ID, type KeepState } from './data/keep';
import { KEEP_SITE_ID, siteById, siteGate, siteSocketWorld, siteSockets, siteStands } from './sites/sites';
import { useGameStore } from './store/gameStore';
import type { PlacedBuilding } from './types';

/** A turned rectangle standing `top` metres tall: its centre, half its sides along its own x and z, turned by `yaw` as
 *  three.js turns an object about +Y (its own +x lies along (cos yaw, -sin yaw) in the world). `walk`: its top is a wall
 *  walk, which someone up to playerPhysics/floor.ts's WALKWAY_STEP below it steps onto (a keep piece's). */
export type SolidBox = { kind: 'box'; x: number; z: number; hx: number; hz: number; yaw: number; top: number; walk?: boolean };
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

let keptKeep: { keep: KeepState | null; list: SolidBox[] } | null = null;

/** G-02 · the home keep's pieces standing in `region` (home only), as the boxes they stand on: every finished piece on
 *  a wall or corner socket but a gatehouse standing open, as tall as its wall walk (or, with none, itself) above the
 *  foundation. Looked at again whenever the keep's record changes, and the same list while its boxes are the same, so
 *  that what keeps something made from it (the grid and its regions, line of sight, the merchant's wide mask) makes it
 *  again only when a piece is finished, ruined or rebuilt, the gatehouse opened or shut, the foundation moved — G-03:
 *  not at every blow of a siege or hammer stroke on a piece going up, which change the record and no box, and re-stamped
 *  the home grid each time (ROADMAP.md, "the walls' path and grid work is unbounded per frame"). */
export function keepSolids(region: string | null): SolidBox[] {
  if (region !== null) return NO_BOXES;
  const keep = useGameStore.getState().keep;
  if (keptKeep && keptKeep.keep === keep) return keptKeep.list;
  const list: SolidBox[] = [];
  const site = keep && siteById({ keep, sites: [] }, KEEP_SITE_ID);
  if (site) {
    for (const sock of siteSockets(site)) {
      if (sock.kind === 'centre' || !siteStands(site, sock.id) || siteGate(site, sock.id) === 'open') continue;
      const part = KEEP_PART_BY_ID[site.parts[sock.id]];
      if (!part) continue;
      const at = siteSocketWorld(site, sock.id)!;
      list.push({
        kind: 'box', x: at.x, z: at.z, hx: at.along, hz: at.across, yaw: at.yaw,
        top: (site.y ?? 0) + (part.walkway ?? part.height), ...(part.walkway ? { walk: true } : {}),
      });
    }
  }
  const kept = keptKeep?.list ?? NO_BOXES;
  keptKeep = { keep, list: !list.length ? NO_BOXES : sameBoxes(kept, list) ? kept : list };
  return keptKeep.list;
}

/** whether two lists hold the same boxes, in the same order */
function sameBoxes(a: SolidBox[], b: SolidBox[]): boolean {
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k++) {
    const p = a[k], q = b[k];
    if (p.x !== q.x || p.z !== q.z || p.hx !== q.hx || p.hz !== q.hz || p.yaw !== q.yaw || p.top !== q.top || p.walk !== q.walk) return false;
  }
  return true;
}

let keptDrawn: { keep: SolidBox[]; list: SolidBox[] } | null = null;

/** What the world draws in `region` that is no placed piece, as the boxes it stands on — at home the village's two
 *  huts and the signpost (data/world.ts) and the keep's pieces standing (keepSolids); nowhere else, any. The same list
 *  while the keep's pieces are. */
export function drawnSolids(region: string | null): SolidBox[] {
  const drawn = DRAWN.get(region) ?? NO_BOXES;
  const keep = keepSolids(region);
  if (keep === NO_BOXES) return drawn;
  if (!keptDrawn || keptDrawn.keep !== keep) keptDrawn = { keep, list: [...drawn, ...keep] };
  return keptDrawn.list;
}

/** (x, z) put back out of a turned box grown by `r`, along its own nearer side — or null when it is not inside it */
export function pushOutOfBox(s: SolidBox, x: number, z: number, r: number): { x: number; z: number } | null {
  const cos = Math.cos(s.yaw);
  const sin = Math.sin(s.yaw);
  const dx = x - s.x;
  const dz = z - s.z;
  // its own frame: +x along (cos, -sin), +z along (sin, cos)
  let u = dx * cos - dz * sin;
  let v = dx * sin + dz * cos;
  const hx = s.hx + r;
  const hz = s.hz + r;
  if (Math.abs(u) >= hx || Math.abs(v) >= hz) return null;
  if (hx - Math.abs(u) < hz - Math.abs(v)) u = Math.sign(u || 1) * hx;
  else v = Math.sign(v || 1) * hz;
  return { x: s.x + u * cos + v * sin, z: s.z - u * sin + v * cos };
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
