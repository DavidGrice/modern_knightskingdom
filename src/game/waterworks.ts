// Wave 12 · player-dug water: ponds, canals and moats.
//
// The homestead had exactly one body of water before this — `POND`, a hand-
// authored circle in data/world.ts wired by hand into nine different systems —
// and no terrain-modification mechanic of any kind. This is the second one, and
// the first that is DATA: a list the player grows with a tool, saved with the
// game, and read back by nav, collision, placement and the node scatter.
//
// Leaf module, deliberately, exactly like road.ts and navTerrain.ts: the store
// owns the list and every consumer reads it from here, so nothing that needs to
// know where the water is has to import the store (navTerrain must not, and
// PlayerController/Enemies read it every frame). `waterworks.list` is the live
// truth while playing and the store keeps it in step through `setWaterworks` —
// the same "leaf module is what the frame loop reads" arrangement riding.ts's
// `stabledHorses` already uses for the mounted-patrol AI.
//
// WHAT THIS DELIBERATELY IS NOT: a carve. The home terrain is one GLB bake
// (Terrain.tsx's HomeMeadow, template-09) with no runtime geometry surgery, so
// the water is drawn as an overlay on flat ground — the same way the static
// POND has always been drawn, generalised from one hardcoded circle to a list.
// Everything about a dug pond is mechanically real (it blocks pathing, it stops
// the player and mobs, it refuses buildings, it costs money and it persists);
// what it is not is a visible hole in the ground. That needs the terrain-height
// work the elevation pass is scoped around, and is the honest follow-up here.
//
// One other thing it deliberately is NOT: a push-back for homestead defenders.
// Defenders.tsx steps them straight at a post or a target with no nav grid and
// no water check at all — they can walk into the natural POND today — so dug
// water is left at exactly that parity rather than growing a special case only
// half the water in the world obeys. See the ROADMAP entry.
import { GRID, landHalf, landSouthHalf } from './data/buildables';
import { ROAD_TILE, routeCells } from './data/road';
import {
  FISHING_DOCK, KEEP_INTERIOR, POND, SIGNPOST, STARTER_VILLAGE_CLEAR, WORLD_HALF,
} from './data/world';
import type { BuildRect, WaterFeature } from './types';

/** Dug rectangles snap to the same 2m lattice structures are placed on, so a
 *  wall laid along a moat's edge lines up with the water instead of hanging a
 *  metre over it. */
export const DIG_SNAP = GRID;

/** Smallest cut worth calling a waterway — 3 cells a side. Below this a "pond"
 *  is a puddle whose nav-blocked footprint is smaller than the walkers it is
 *  supposed to stop, which reads as a bug rather than as water. */
export const MIN_DIG_SIDE = DIG_SNAP * 3;   // 6m
/** Longest single cut — sized so ONE side of a moat round the widest fence
 *  (Barony, 64m across) is one drag rather than a job of work. A moat is
 *  therefore four cuts, one per side, which is also what leaves the causeway:
 *  the corners stay dry unless you deliberately go back and cut them. */
export const MAX_DIG_SIDE = 72;
/** and the most ground one cut may take, so a 72×72 drag can't swallow the
 *  homestead in one gesture (a 72m moat side 6m wide is 432, well inside it) */
export const MAX_DIG_AREA = 600;
/** how many separate waterways one homestead may hold. Every consumer below is
 *  a plain linear scan (nav rebuild, per-frame push-back, node scatter), which
 *  is the right shape for a list this short and the wrong shape for an
 *  unbounded one — this is the number that keeps that true. */
export const MAX_WATERWORKS = 24;

/** How far past your own fence you may dig — on the north/east/west sides,
 *  where the fence still grows with the land tiers. A moat that cannot sit
 *  OUTSIDE the wall it protects is not a moat, so this is not zero — and it
 *  is not unbounded either, for a reason that is mechanical rather than
 *  thematic: nav-blocking only exists on the home grid, which is ±56m
 *  (src/ai/config/navgrid.json). A cut beyond that would still stop the player
 *  and still refuse buildings, but villagers would path straight across it.
 *  The widest north/east/west fence is 40m (Wave 17 #4's `landHalf`, up from
 *  32 — see buildables.ts's LAND_TIERS note), so 40 + 16 = 56 lands EXACTLY
 *  on the nav grid's own edge rather than comfortably inside it as this used
 *  to read: no margin left on those three sides, though still not past it.
 *
 *  The south side does NOT use this constant at all any more — see
 *  `terrainConflict`'s own south-side bound, which is deliberately tighter
 *  (the whole point of Wave 17 #4 was pinning the south fence well clear of
 *  the real road, and 16m of outskirt on top of it would reach right back
 *  into the gap this pass exists to keep clear). */
export const DIG_OUTSKIRT = 16;

/** Gold per square metre of cut ground — you are paying diggers, not spending
 *  materials, which is why this is priced in the one currency the game already
 *  charges land in (`buyLand`) rather than inventing a spoil/soil item. A 20×20
 *  pond is 200g against a 120g Freehold deed; a moat round a mid-size holding
 *  runs to roughly one deed tier. */
export const DIG_GOLD_PER_M2 = 0.5;
export const MIN_DIG_GOLD = 20;
/** filling one back in returns this share of what was actually paid for it
 *  (`WaterFeature.paid`, not a re-derived price — the same "refund what the
 *  player really spent" rule removeBuilding's half-materials follows) */
export const FILL_REFUND = 0.5;

/** the dug earth apron around the water, matching POND's own sand ring */
export const WATER_BANK = 1.4;
/** y of the bank and of the water surface — both sit just above the flat
 *  meadow, exactly like POND's two discs (Terrain.tsx), because there is no
 *  hole to sink them into. See this module's header. */
export const BANK_Y = 0.02;
export const WATER_Y = 0.06;

/** The live list, and a revision that ticks on every change. The revision is
 *  what lets NavGrid.rebuild() notice a fresh cut: its own early-out compares
 *  the `buildings` array by IDENTITY, and digging changes no buildings at all,
 *  so without a second input to check the 1Hz rebuild poll would keep handing
 *  back a grid that has never heard of the water. (`toggleGate` solves the same
 *  problem by re-spreading `buildings` to force a reference change; that works,
 *  but it is a side channel — a second real input deserves a second real
 *  check.) */
export const waterworks: { list: WaterFeature[]; rev: number } = { list: [], rev: 0 };

export function setWaterworks(list: WaterFeature[]): void {
  waterworks.list = list;
  waterworks.rev++;
}

// ---------------------------------------------------------------------------
// geometry
// ---------------------------------------------------------------------------

/** Grow a dragged rectangle OUT to the nearest grid lines. Out, not to-nearest:
 *  the patch you swept is the least you meant to dig, and rounding a boundary
 *  inward would quietly leave a strip of land inside a moat. */
export function snapDigRect(r: BuildRect): BuildRect {
  return {
    minX: Math.floor(r.minX / DIG_SNAP) * DIG_SNAP,
    maxX: Math.ceil(r.maxX / DIG_SNAP) * DIG_SNAP,
    minZ: Math.floor(r.minZ / DIG_SNAP) * DIG_SNAP,
    maxZ: Math.ceil(r.maxZ / DIG_SNAP) * DIG_SNAP,
  };
}

export function digArea(r: BuildRect): number {
  return Math.max(0, r.maxX - r.minX) * Math.max(0, r.maxZ - r.minZ);
}

export function digCost(r: BuildRect): number {
  return Math.max(MIN_DIG_GOLD, Math.round(digArea(r) * DIG_GOLD_PER_M2));
}

export function featureRect(w: WaterFeature): BuildRect {
  return { minX: w.x - w.halfX, maxX: w.x + w.halfX, minZ: w.z - w.halfZ, maxZ: w.z + w.halfZ };
}

function rectsOverlap(a: BuildRect, b: BuildRect, pad = 0): boolean {
  return a.maxX + pad > b.minX && a.minX - pad < b.maxX
    && a.maxZ + pad > b.minZ && a.minZ - pad < b.maxZ;
}

/** every already-dug waterway the rectangle touches — what "fill this in"
 *  operates on, and what stops two cuts overlapping into one double-priced
 *  patch of water */
export function waterworksInRect(r: BuildRect): WaterFeature[] {
  return waterworks.list.filter((w) => rectsOverlap(r, featureRect(w)));
}

/** the waterway (x, z) stands in, or null. `margin` widens every rectangle —
 *  callers pushing a body out of the water pass their own radius. */
export function waterAt(x: number, z: number, margin = 0): WaterFeature | null {
  for (const w of waterworks.list) {
    if (Math.abs(x - w.x) < w.halfX + margin && Math.abs(z - w.z) < w.halfZ + margin) return w;
  }
  return null;
}

/** Shove a point out of any waterway it has ended up inside, along whichever
 *  edge it is nearest — the same minimum-penetration rect resolve
 *  PlayerController already uses for the keep's great hall, rather than the
 *  radial push POND needs for being a circle.
 *
 *  Returns a SHARED scratch object: read `.x`/`.z` immediately, never keep the
 *  reference. This runs once per frame for the player and once per frame per
 *  mob, which is exactly the pattern this file's neighbours (TemplateWorld's
 *  rayOrigin, navgrid's scratchV0) reuse an object for. */
const pushScratch = { x: 0, z: 0, moved: false };
export function pushOutOfWater(x: number, z: number, margin = 0): { x: number; z: number; moved: boolean } {
  let nx = x;
  let nz = z;
  let moved = false;
  for (const w of waterworks.list) {
    const hx = w.halfX + margin;
    const hz = w.halfZ + margin;
    const dx = nx - w.x;
    const dz = nz - w.z;
    if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
    const px = hx - Math.abs(dx);
    const pz = hz - Math.abs(dz);
    if (px < pz) nx = w.x + Math.sign(dx || 1) * hx;
    else nz = w.z + Math.sign(dz || 1) * hz;
    moved = true;
  }
  pushScratch.x = nx;
  pushScratch.z = nz;
  pushScratch.moved = moved;
  return pushScratch;
}

// ---------------------------------------------------------------------------
// where a cut is allowed
// ---------------------------------------------------------------------------

/** Fixed world geography a cut may never take. Everything here is static data
 *  (world.ts, road.ts), so it lives with the geometry rather than in the store
 *  — the store's own check adds the things only it knows about: standing
 *  buildings, resource nodes, gold, and which world you are in.
 *
 *  Returns the reason as a sentence, or null if the ground is clear. A sentence
 *  rather than a boolean because every one of these refusals needs to say WHICH
 *  thing is in the way — "you can't dig there" over a 40m drag is useless.
 *
 *  WHICH OF THESE A PLAYER CAN ACTUALLY MEET, measured rather than assumed:
 *  every legal rectangle on the 2m lattice was enumerated at all five land
 *  tiers (418,981 shapes at Barony) and the first refusal each one hits
 *  recorded — against the OLD symmetric holding bound, before Wave 17 #4 (see
 *  below) pinned the south side. At that time only THREE ever fired: the
 *  holding bound, the road, and — from Estate up, when the fence finally
 *  reached toward it — the pond. The other four were shadowed, each by a
 *  check above it:
 *    · the dock      — its own padded rectangle lies inside the pond's 9.4m
 *                      exclusion on the water side and behind the east road's
 *                      z-cell-2 plate row on the land side
 *    · the keep      — (85,85), far outside the widest bound (was ±48; the
 *                      north/east/west bound alone, ±56, still clears it easily)
 *    · the signpost  — it stands ON the printed carriageway (2.40m off the
 *                      centreline against ROAD_HALF_WIDTH 2.88, true since
 *                      long before Wave 12), so its plate refused first
 *    · the village   — the huts' clearance circles reach exactly z=32, the
 *                      south edge of that same plate row
 *  They are kept, not deleted, for the reason the world-edge check above is
 *  kept: every number that shadows them (DIG_OUTSKIRT, the land tiers, a road
 *  leg, POND) is a number that moves, and the day one does, an unguarded
 *  landmark is a moat through the keep. What this note buys is that nobody
 *  goes hunting for a message the game cannot currently print.
 *
 *  Wave 17 #4 · the south holding bound is now `landSouthHalf` alone — fixed
 *  at 12 for every tier, no DIG_OUTSKIRT added (see that constant's own
 *  updated note) — rather than `landHalf(tier) + DIG_OUTSKIRT`. That bound is
 *  now so much tighter on that one side that the pond (z=42, r=8) and the
 *  signpost (z=36) both sit well past it at EVERY tier: the holding-bound
 *  refusal now fires for both before their own specific checks are ever
 *  reached, on the south side, which the old enumeration above did not (and
 *  could not) anticipate. Not re-run in full for the new asymmetric shape —
 *  the reasoning above is what would need re-checking if this list drifts. */
export function terrainConflict(r: BuildRect, landTier: number): string | null {
  const half = landHalf(landTier) + DIG_OUTSKIRT;
  // south does NOT get DIG_OUTSKIRT's usual allowance — that fence is fixed
  // deliberately clear of the real road (19.2m; landSouthHalf is 12), and
  // 16m more of outskirt on top would reach right back into the gap this
  // whole pass exists to keep clear. See DIG_OUTSKIRT's own note.
  const southBound = landSouthHalf(landTier);
  if (r.minX < -half || r.maxX > half || r.minZ < -half || r.maxZ > southBound) {
    return 'Your diggers work your own holding and a short way past its fence — buy more land to cut further out.';
  }
  // belt and braces: the land-tier bound above is always the tighter one, but
  // it is a number that moves and this one is the literal edge of the world
  if (Math.abs(r.minX) > WORLD_HALF - 8 || Math.abs(r.maxX) > WORLD_HALF - 8
    || Math.abs(r.minZ) > WORLD_HALF - 8 || Math.abs(r.maxZ) > WORLD_HALF - 8) {
    return 'That is off the edge of the map.';
  }

  // the road. Whole PLATE, not just the printed carriageway: a 12.8m road plate
  // is drawn as one mesh, so water taking half of it would read as the road
  // hanging over the water rather than as a ford. Wave 12's own road network is
  // the thing that just made every ground reachable — cutting it without a
  // bridge piece to put back (there isn't one) would undo that.
  const rt = ROAD_TILE / 2;
  for (const [cx, cz] of routeCells()) {
    const px = cx * ROAD_TILE;
    const pz = cz * ROAD_TILE;
    if (rectsOverlap(r, { minX: px - rt, maxX: px + rt, minZ: pz - rt, maxZ: pz + rt })) {
      return 'The road runs through there — you have no bridge to put back over it.';
    }
  }

  // the natural pond and its sand ring (circle vs rectangle: nearest point on
  // the rectangle to the centre)
  const qx = Math.max(r.minX, Math.min(r.maxX, POND.x));
  const qz = Math.max(r.minZ, Math.min(r.maxZ, POND.z));
  if (Math.hypot(qx - POND.x, qz - POND.z) < POND.radius + WATER_BANK) {
    return 'That is the old pond — it is already water.';
  }
  const dockPad = FISHING_DOCK.halfWidth + 1;
  if (rectsOverlap(r, {
    minX: Math.min(FISHING_DOCK.startX, FISHING_DOCK.endX) - dockPad,
    maxX: Math.max(FISHING_DOCK.startX, FISHING_DOCK.endX) + dockPad,
    minZ: Math.min(FISHING_DOCK.startZ, FISHING_DOCK.endZ) - dockPad,
    maxZ: Math.max(FISHING_DOCK.startZ, FISHING_DOCK.endZ) + dockPad,
  })) {
    return 'The fishing dock stands there.';
  }

  if (rectsOverlap(r, {
    minX: KEEP_INTERIOR.x - KEEP_INTERIOR.halfX, maxX: KEEP_INTERIOR.x + KEEP_INTERIOR.halfX,
    minZ: KEEP_INTERIOR.z - KEEP_INTERIOR.halfZ, maxZ: KEEP_INTERIOR.z + KEEP_INTERIOR.halfZ,
  }, 2)) {
    return 'The Grand Keep stands there.';
  }
  if (SIGNPOST.x > r.minX && SIGNPOST.x < r.maxX && SIGNPOST.z > r.minZ && SIGNPOST.z < r.maxZ) {
    return 'The travel signpost stands there.';
  }
  for (const c of STARTER_VILLAGE_CLEAR) {
    const sx = Math.max(r.minX, Math.min(r.maxX, c.x));
    const sz = Math.max(r.minZ, Math.min(r.maxZ, c.z));
    if (Math.hypot(sx - c.x, sz - c.z) < c.r) return 'That is your neighbours’ doorstep.';
  }
  return null;
}

/** Size/shape refusals, separated from `terrainConflict` so the marquee can
 *  tell "too small yet, keep dragging" apart from "not there". */
export function shapeConflict(r: BuildRect): string | null {
  const w = r.maxX - r.minX;
  const d = r.maxZ - r.minZ;
  if (w < MIN_DIG_SIDE || d < MIN_DIG_SIDE) {
    return `A waterway is at least ${MIN_DIG_SIDE}m across — drag a wider patch.`;
  }
  if (w > MAX_DIG_SIDE || d > MAX_DIG_SIDE) {
    return `No single cut runs more than ${MAX_DIG_SIDE}m — dig a moat one side at a time.`;
  }
  if (w * d > MAX_DIG_AREA) {
    return `That is more ground than one cut takes (${MAX_DIG_AREA}m²) — dig it in stretches.`;
  }
  return null;
}
