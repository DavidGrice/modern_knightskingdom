// The road's route, as data.
//
// Kept out of the component so the node seeder and the ground layout can both
// reason about where the road runs without pulling three.js into the store.
//
// Wave 12 · this went from one lane with a stub branch to a NETWORK reaching
// all six resource grounds. It is worth being clear that the road was never
// decoration even before that: `onRoad()` below feeds the player's
// ROAD_SPEED_MULT (PlayerController) and navgrid.ts discounts road cells for
// A* (ROAD_STEP_MULT), so laying a leg toward a ground makes walking to that
// ground genuinely faster and makes NPCs genuinely prefer it — no new pathing
// concept was needed for the extension, only new cells.
import { SIGNPOST } from './world';

/** 256mm at the wall family's unified k=0.05 */
export const ROAD_TILE = 12.8;


/** direction bits, in the order N, E, S, W */
const N = 1, E = 2, So = 4, W = 8;

/**
 * Which ways each piece runs when it is not rotated.
 *
 * The prints were SAMPLED rather than eyeballed — for each texture, what
 * fraction of the middle third of each edge is road-coloured:
 *
 *   spr162 (T)        top YES  bottom YES  left YES  right no
 *   spr163 (corner)   top no   bottom YES  left YES  right no
 *   spr164 (straight) top YES  bottom YES  left no   right no
 *   spr165 (cross)    all four YES
 *
 * Mapping image space to world: the plate's UVs put `u` along +x and `v` along
 * +z, and `PropModel` stands the model up with `rotation.x = π`, which negates
 * z — so image-left is WEST and image-top is NORTH.
 *
 * NOTE, and it needs another look: by that derivation the corner should join
 * SOUTH and WEST, but laid out that way its bends visibly turned the wrong
 * way in play, and SOUTH|EAST is what reads correctly. The T is back to the
 * derived SOUTH|WEST branch after its own report. The two therefore disagree
 * about the same plate family, which means the derivation is missing
 * something — most likely which FACE of the plate we end up looking at once
 * it is flipped, since these are two-sided and only 1.6mm thick. Both values
 * below are set to what LOOKS right, not to what the derivation says.
 */
export const PIECES: { id: string; mask: number }[] = [
  { id: 'l4109612', mask: N | So },        // straight
  { id: 'l4109611', mask: N | W },         // corner
  { id: 'l4109610', mask: N | So | W },    // T-junction
  { id: 'l4109613', mask: N | E | So | W },// crossroad
];

export { N, E, So, W };

/** how much of a plate's width the printed road takes — sampled off spr164,
 *  whose sand runs from 27% to 72% across the tile.
 *
 *  Worth knowing, because it surprises anyone who measures it: two fixed props
 *  stand INSIDE this width and therefore report `onRoad()` true — SIGNPOST
 *  (-16, 36) at 2.40m off the centreline and MERCHANT_SPOT (-37.5, 40) at
 *  1.60m, against a half width of 2.88. Both predate Wave 12's network: the
 *  old seven-cell route already laid the same plates under them (verified
 *  against git HEAD, identical distances). Left alone deliberately — a
 *  roadside sign and a pedlar's cart parked on the road are where those two
 *  belong, SIGNPOST is what the whole network is anchored to (moving it slides
 *  every leg), and Merchant.tsx's walk-in timing is tuned to the distance from
 *  `roadEntry()` to MERCHANT_SPOT. The one real consequence is that standing
 *  at either grants ROAD_SPEED_MULT, and that a dig over the signpost is
 *  refused as road rather than as signpost (see waterworks.ts). */
export const ROAD_HALF_WIDTH = ROAD_TILE * 0.45 / 2;

/**
 * Yaw +90° about Y sends a piece's local north to world west (rotate (0,-1)
 * by +90° and you land on (-1,0)), so one quarter turn moves every bit one
 * place BACK around the compass.
 */
export function rotMask(mask: number, quarters: number): number {
  let m = mask;
  for (let i = 0; i < ((quarters % 4) + 4) % 4; i++) {
    m = ((m >> 1) | (m << 3)) & 0b1111;
  }
  return m;
}

/** The signpost's own tile. Every leg below is anchored to it, so moving
 *  SIGNPOST slides the whole network as one piece instead of tearing a leg
 *  off the junction. Where a leg ENDS is a separate question: those cells are
 *  chosen against the resource grounds, which do not move with the signpost —
 *  Grounds.tsx asserts that pairing rather than trusting it. */
const SX = Math.round(SIGNPOST.x / ROAD_TILE); // -1
const SZ = Math.round(SIGNPOST.z / ROAD_TILE); //  3

/**
 * Wave 12 · the road as LEGS — one polyline of waypoints per run of road,
 * where this was a single flat waypoint list through Wave 11.
 *
 * A flat list can only describe an unbranched walk, so a branch had to be
 * written as an out-and-back detour, and the waypoints that walk BACK to the
 * junction are real entries both consumers below then have to absorb
 * (`routeCells()` de-duplicates the repeat; `roadSegments()` emits a harmless
 * overlapping duplicate). With one lane and one branch that was a footnote.
 * With six resource grounds to reach, half the array would have been retrace.
 *
 * Nothing declares "this is a T": a leg that starts on a cell another leg
 * already lays IS the junction, because Road.tsx works every piece out from
 * whatever neighbours a cell turns out to have.
 *
 * Each leg stops at the closest cell to its ground that does not put a 12.8m
 * plate across the ground's own fenced rectangle — Grounds.tsx checks both
 * halves of that (no crossing, and still within ROAD_REACH of the gate),
 * because the grounds are edited live at /secret/worldeditor while these legs
 * are hand-written here, which is exactly the pairing that comes silently
 * apart.
 *
 * Worth knowing about the outer legs: the AI's road preference is a mask on
 * the HOME nav grid (src/ai/config/navgrid.json). Wave 17 #6 widened that
 * grid from ±56m to ±200m specifically so it would cover these outer legs —
 * before that, only the run past the signpost got any NPC path preference at
 * all, and a villager walking to the quarry or the deepwood beelined the
 * entire trip with zero obstacle avoidance the moment the grid ran out. Every
 * leg below now sits inside the grid, so A* genuinely prefers the printed
 * road for the whole walk (ROAD_STEP_MULT's ~40% discount comfortably beats
 * the road's own detour over a beeline) — and, since Wave 34 (G6.6),
 * `roadSpeedMult()` below wires the player's own ROAD_SPEED_MULT into the
 * villager/merchant/raider movement code too, so the win is a villager that
 * both follows the road AND actually moves faster while on it, not just one
 * that dodges obstacles along the way.
 */
const LEGS: [number, number][][] = [
  // 1 · the run out of the homestead, past the signpost.
  [[0, SZ - 1], [0, SZ]],

  // 2 · the signpost's own row, running west past the starter village, under
  // Northwood Stand's southern fence (its gate is 9.2m off the pavement — a
  // plate one cell further north would sit ON the stand), then turning at
  // x-cell -9 up to the Deepwood's gate. ONE trunk for both tree grounds
  // rather than two independent spurs: they lie in the same direction and
  // the Deepwood's own leg has to pass Northwood to get there anyway. The
  // turn is at -9 and not -8 so the northward run stays 27m clear of
  // Northwood's west fence — at -8 that fence, not the southern one the
  // trunk already serves, would have been the nearest road to it, and the
  // boundary stone would have jumped to the far side of the stand.
  [[0, SZ], [SX - 8, SZ], [SX - 8, SZ + 3]],

  // 3 · the short branch off the junction to the Herb Meadow's gate. Kept
  // exactly as long as it was (it already ended within reach of the meadow),
  // and still the cell every newcomer walks in from — see ENTRY_CELL.
  [[SX, SZ], [SX, SZ + 2]],

  // 4 · the east road: along the homestead's southern edge, past the pond's
  // south shore, then north past the Old Quarry to the Iron Seam. Both rock
  // grounds hang off one trunk rather than getting ~150m of road each.
  //
  // This row is the ONLY eastward corridor there is. The pond (52,42 r8 — a
  // nav-blocking terrain exclusion, not just scenery) and the Home Grove's
  // fenced rectangle together wall off every row from z-cell 3 to z-cell 6,
  // and a plate at (3,3) would put its east edge inside the pond's own sand
  // ring. The price is its first three cells lying inside BUILD_REGION's
  // widest (Barony) extent: accepted, because road plates are scenery and not
  // `buildings` — they occupy no build square and refuse no placement — and
  // the road already ran to (0, 25.6) before this.
  [[0, SZ - 1], [10, SZ - 1], [10, SZ + 4]],

  // 5 · the Home Grove's turn-off, one plate north off the east road. Dead
  // ends (Road.tsx lays a straight through it) pointing at the grove's gate.
  [[2, SZ - 1], [2, SZ]],
];

/** de-duplicated, and filled in so a jump of more than one cell still joins up */
export function routeCells(): [number, number][] {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const push = (x: number, z: number) => {
    const k = `${x},${z}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push([x, z]);
  };
  for (const leg of LEGS) {
    // `prev` is the previous WAYPOINT, not `out`'s last entry: where a leg
    // starts on cells an earlier leg already laid, every fill step and the
    // waypoint itself de-duplicate away, and `out`'s tail is then some
    // unrelated cell a whole leg away — which the fill would happily draw a
    // line to. (Latent before Wave 12 only because there was one leg.)
    let prev: [number, number] | null = null;
    for (const [x, z] of leg) {
      if (prev && (prev[0] !== x || prev[1] !== z)) {
        // walk in a straight line from the last waypoint to this one, x first
        let cx: number = prev[0];
        let cz: number = prev[1];
        while (cx !== x) { cx += Math.sign(x - cx); push(cx, cz); }
        while (cz !== z) { cz += Math.sign(z - cz); push(cx, cz); }
      }
      push(x, z);
      prev = [x, z];
    }
  }
  return out;
}

/**
 * Where someone coming to the homestead steps onto the map. Newcomers walk in
 * from here (see villagerMobs.arriveByRoad) rather than appearing on the
 * doorstep.
 *
 * PINNED to the herb-meadow branch's own end rather than "whatever cell
 * `routeCells()` happens to return last", which is what this was through Wave
 * 11. The road is a network now, so there is no single far end, and array
 * order would have quietly relocated every arrival the moment a leg was
 * appended — the villager walk-in, Merchant.tsx's OFF_STAGE (its whole
 * walk-in/walk-out timing is tuned against the distance from here to
 * MERCHANT_SPOT) and CedricSiege.tsx's muster all read this. This is the
 * exact cell all three were tuned around.
 */
const ENTRY_CELL: [number, number] = [SX, SZ + 2];
export function roadEntry(): { x: number; z: number } {
  return { x: ENTRY_CELL[0] * ROAD_TILE, z: ENTRY_CELL[1] * ROAD_TILE };
}

/** How close a ground's gate has to be to the carriageway to count as
 *  "the road reaches it" — a plate's own half width plus one plate of grass,
 *  i.e. a field gate you can see the road from. Asserted in Grounds.tsx. */
export const ROAD_REACH = ROAD_TILE * 1.5;

/**
 * Where the road meets a fenced section (a Ground, a cultivated plot): the
 * point on the section's own boundary nearest the road, which is where its
 * boundary stone belongs — the road arriving at one edge and the stone
 * standing on another is the whole "does this road go anywhere" question
 * answered wrong.
 *
 * Takes the rectangle structurally rather than importing grounds.ts, for the
 * same reason this file exists at all: the store's seedNodes has to be able
 * to pull the road in without dragging the ground tables (or React) behind
 * it, and this way a cultivated plot works too without inheriting the deed.
 *
 * Ties break toward the section's centre. The east road passes the Old
 * Quarry's west fence at two cells that are both exactly 8m off it; the one
 * level with the quarry reads as its gate, the corner one as an accident.
 */
export function roadGateFor(s: { x: number; z: number; halfX: number; halfZ: number }): { x: number; z: number } {
  let best = { x: s.x, z: s.z - s.halfZ };
  let bestD = Infinity;
  let bestToCentre = Infinity;
  for (const [cx, cz] of routeCells()) {
    const px = cx * ROAD_TILE, pz = cz * ROAD_TILE;
    // no plate ever lies inside a section (Grounds.tsx asserts it), so
    // clamping the plate's centre onto the rectangle IS the nearest point of
    // its boundary
    const qx = Math.max(s.x - s.halfX, Math.min(s.x + s.halfX, px));
    const qz = Math.max(s.z - s.halfZ, Math.min(s.z + s.halfZ, pz));
    const d = Math.hypot(px - qx, pz - qz);
    const toCentre = Math.hypot(px - s.x, pz - s.z);
    if (d < bestD - 1e-6 || (d < bestD + 1e-6 && toCentre < bestToCentre)) {
      bestD = d;
      bestToCentre = toCentre;
      best = { x: qx, z: qz };
    }
  }
  return best;
}

/** How far out the road's verge trees are planted (see gameStore's seedNodes).
 *  The verge pass was written when the road was seven plates by the homestead;
 *  run over the whole Wave 12 network it would line 128m of the east road and
 *  the trunk out to the Deepwood with free, deedless timber — hundreds of
 *  metres from anything a deed gates, which is the opposite of what the
 *  grounds are for. Trees line the homestead's own lane; the roads out to the
 *  grounds run through open country, as roads out to somewhere do. */
export const ROAD_VERGE_RANGE = 68;
export function vergeCells(): [number, number][] {
  return routeCells().filter(([cx, cz]) => Math.hypot(cx * ROAD_TILE, cz * ROAD_TILE) <= ROAD_VERGE_RANGE);
}

/** Requested 2026-07-30: "NPCs should use roads first, then grass" plus a
 *  speed bonus for actually walking one. Both need the same real geometry —
 *  the printed carriageway's own centreline, not just "which 12.8m tile is
 *  this" (a tile's grassy verge is not the road, see the tree-scatter avoidance
 *  in gameStore.ts just above this file's own routeCells()).
 *
 *  NOT built from `routeCells()`'s own return value: that array is
 *  DEDUPLICATED (`seen`, above) — where one leg starts on cells another leg
 *  already laid, `routeCells()` silently drops the repeats, so two of its
 *  "consecutive" entries can land a long jump apart (confirmed live even
 *  before Wave 12's legs: (-3,3)→(-1,4), not a shared edge). Segments built
 *  from consecutive pairs of THAT array would insert phantom diagonal
 *  shortcuts across open grass. This walks the same raw `LEGS` waypoints with
 *  the identical x-then-z gap-fill `routeCells()` uses, but emits one true
 *  unit-step segment per step instead of collapsing into a deduplicated point
 *  list — a revisited cell just means an overlapping (harmless) duplicate
 *  segment, not a dropped one.
 *
 *  `prev` resets PER LEG for the same reason it does in `routeCells()`:
 *  carrying it across the seam would draw one long segment from wherever the
 *  last leg ended to wherever the next one starts, straight across country. */
let segmentsCache: { x0: number; z0: number; x1: number; z1: number }[] | null = null;
function roadSegments() {
  if (!segmentsCache) {
    const segs: { x0: number; z0: number; x1: number; z1: number }[] = [];
    for (const leg of LEGS) {
      let prev: [number, number] | null = null;
      for (const [x, z] of leg) {
        if (prev) {
          let cx: number = prev[0];
          let cz: number = prev[1];
          while (cx !== x) {
            const nx: number = cx + Math.sign(x - cx);
            segs.push({ x0: cx * ROAD_TILE, z0: cz * ROAD_TILE, x1: nx * ROAD_TILE, z1: cz * ROAD_TILE });
            cx = nx;
          }
          while (cz !== z) {
            const nz: number = cz + Math.sign(z - cz);
            segs.push({ x0: cx * ROAD_TILE, z0: cz * ROAD_TILE, x1: cx * ROAD_TILE, z1: nz * ROAD_TILE });
            cz = nz;
          }
        }
        prev = [x, z];
      }
    }
    segmentsCache = segs;
  }
  return segmentsCache;
}

/** Perpendicular distance from (x, z) to the nearest point on the road's
 *  printed centreline (clamped to each segment's own span). */
export function distanceToRoad(x: number, z: number): number {
  let best = Infinity;
  for (const s of roadSegments()) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - s.x0) * dx + (z - s.z0) * dz) / len2)) : 0;
    const d = Math.hypot(x - (s.x0 + t * dx), z - (s.z0 + t * dz));
    if (d < best) best = d;
  }
  return best;
}

/** True within the printed carriageway width, not the whole 12.8m tile. */
export function onRoad(x: number, z: number): boolean {
  return distanceToRoad(x, z) <= ROAD_HALF_WIDTH;
}

/** Movement speed multiplier while standing on the road — the "advanced
 *  building mechanics for attribute points" ask from the same request: today
 *  the road is the one fixed, pre-authored route (there is no player-placed
 *  road piece yet, see this file's own module doc), so this reads as a
 *  homestead-road perk rather than a per-placement bonus; `attributes.ts`'s
 *  `externalCapacityBonus()` stub (currently always 0, reserved for "a placed
 *  building passively grants a bonus just by existing on the grid") is the
 *  natural home for a future per-tile version of this same mechanic. */
export const ROAD_SPEED_MULT = 1.3;

/** Wave 34 (G6.6) · the same road-speed perk above, as a plain multiplier
 *  rather than an if/else at every call site. This file's own module doc
 *  already flagged the gap this closes: AI agents got the A* road-cost
 *  PATHING preference (navgrid.ts's ROAD_STEP_MULT) but never the player's
 *  own SPEED boost while actually standing on the road — a villager/
 *  merchant/raider that visibly followed the road without ever moving any
 *  faster on it. Callers outside the home world must gate this themselves
 *  (this function has no region awareness — the road network is fixed
 *  homestead-coordinate geometry, so calling it against an unrelated
 *  world's coordinates would be a false read, not a fast/slow judgment
 *  call). */
export function roadSpeedMult(x: number, z: number): number {
  return onRoad(x, z) ? ROAD_SPEED_MULT : 1;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkroadEntry = roadEntry;
  (window as unknown as Record<string, unknown>).__kkonRoad = onRoad;
}
