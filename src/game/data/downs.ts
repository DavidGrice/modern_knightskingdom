// Wave 12 · The North Downs — the homestead's one piece of REAL terrain.
//
// A PROTOTYPE, bounded to one quadrant on purpose. The homestead has been
// unconditionally flat since Phase 20, and not merely by convention: the
// player's own `floorHeightAt` (PlayerController.tsx) opened with a literal
// `let floor = 0` and only ever raised it from placed buildings; the home
// meadow bake registers itself as nothing gameplay can sample, and until this
// pass only a mounted DESTINATION did (TemplateWorld.tsx); `activeBuildRegion`
// hands out one scalar `groundY: 0` for the entire holding; and Villagers.tsx /
// Npc.tsx write `position.set(s.x, 0, s.z)` in twelve places between them.
// Making the whole map a height field means touching every one of those.
// This pass proves the mechanism on one deliberately EMPTY patch instead, and
// states in code exactly where the patch ends.
//
// WHERE IT IS, AND WHY EXACTLY THERE. Four hard numbers pick this box; none of
// them is taste:
//   · north of everything. grounds.ts's own header records the whole north
//     side as deliberately cleared — "reserved on purpose for the kingdom's
//     own future expansion" — and Pass A's road LEGS, all six GROUNDS, both
//     cultivated plots, the pond, the brook, the keep and the starter village
//     are every one of them at positive z. Nothing has to move for this.
//   · |z| > landHalf(MAX_LAND_TIER) = 32, so no deed ever widens the build
//     grid onto it and `evalPlacement`'s flat `groundY: 0` is never asked
//     about ground that is not flat.
//   · |z| > 32 + DIG_OUTSKIRT = 48, so Pass B's spade cannot reach it either —
//     a rectangle of nav-blocked water cut into a hillside is exactly the
//     interaction this prototype should not be asked to answer for yet.
//   · |z| > the home nav grid's own ±56m halfExtent (ai/config/navgrid.json),
//     which is the strong one: a walker outside the grid has no cells at all,
//     so no villager, carrier, defender or pathing raider can ROUTE onto the
//     hill. Their hardcoded y=0 is out of reach, not merely unlikely.
// The result is a 68m square whose nearest edge stands 4m clear of the nav
// grid and 86m north of SPAWN — a walk, deliberately, across empty meadow that
// belongs to no ground and no deed. It is drawn on the minimap (height bands,
// Minimap.tsx) because nothing else in the game points north, and a prototype
// nobody finds proves nothing.
//
// WHAT GAMEPLAY ACTUALLY READS. Not this file. The height below is the
// AUTHORING field: it builds the mesh (Terrain.tsx's HomesteadDowns) and
// nothing else. The player's floor, the camera and the raiders all read the
// mesh's own triangles through TemplateWorld.tsx's raycast sampler — the very
// same mechanism every destination bake already uses for actor Y. One source
// of truth, the geometry you can see, exactly as the destination worlds do it;
// a second analytic copy consulted at runtime is how the visible ground and
// the ground you stand on drift apart.

import navgridConfig from '../../ai/config/navgrid.json';
import { landHalf, MAX_LAND_TIER } from './buildables';
import { ROAD_TILE, routeCells } from './road';
import { GROUNDS } from './grounds';
import { DIG_OUTSKIRT } from '../waterworks';

/** The prototype's bounds — a square, and the only place at home where the
 *  ground is not y=0. Everything outside it is flat and stays flat. */
export const DOWNS = { x: 0, z: -94, half: 34 };

/** How far the whole knoll mesh is sunk into the meadow.
 *
 *  The home bake cannot be carved (one GLB, no runtime geometry surgery — the
 *  same wall Pass B's water hit), so a hill laid ON it would meet it in a
 *  coplanar seam that z-fights over the entire flat margin of the patch.
 *  Sinking the mesh instead makes the two surfaces cross TRANSVERSALLY: every
 *  part of the knoll lower than this is simply underneath the meadow and
 *  invisible, and the hill's visible foot is the line where it climbs out.
 *  0.9 rather than a few centimetres because the bake is flat only to within
 *  ~0.6m across its 2km field (see normalizeTemplateBake's own measurements) —
 *  a shallower sink would let the buried margin poke through wherever the
 *  meadow happens to sit low. */
export const DOWNS_SINK = 0.9;

/** Raised-cosine hills: zero slope at the centre AND at the rim, which is what
 *  lets them join the meadow (and each other) without a crease, and what keeps
 *  the gradient bounded — peak slope is exactly h·π/2r, and the movement
 *  resolver has a real ceiling on what it will stay grounded through (see
 *  DOWNS_MAX_GRADIENT). `ox`/`oz` are offsets from DOWNS' own centre.
 *
 *  The shoulder is set far enough out that its own steepest ring (at r/2) sits
 *  BEYOND the crown's foot: inside the crown the two slopes oppose and cancel,
 *  outside it the crown contributes nothing, so the sum never exceeds either
 *  one alone. Sliding it inward is what a naive placement does, and it stacks
 *  two slopes into a bank too steep to walk down without the floor dropping
 *  out from under you.
 *
 *  Nothing clips the sum, deliberately. Flattening the crown with a min() to
 *  widen the top costs a crease — a slope discontinuity — and the mesh built
 *  from this field then misses it by 8.5cm at 48 segments, which is the player
 *  standing visibly proud of their own hilltop. A raised cosine is already
 *  level at its centre; the rounded crown that gives is worth more than a
 *  wider flat one that the geometry cannot actually represent. */
const BUMPS = [
  { ox: 0, oz: 0, r: 30, h: 6.4 },        // the crown
  { ox: -16.8, oz: 17, r: 13, h: 1.7 },   // a spur running off its south-west flank
];

/** The steepest ground the player's own movement resolver stays glued to.
 *  PlayerController leaves `grounded` (and starts falling) the moment the floor
 *  drops more than 0.08m below its feet in a single frame; sprinting at 7 m/s
 *  that is a gradient of 0.69 at 60fps but only 0.34 at 30. The authored field
 *  is held under the 30fps figure, so running downhill is a run and not a
 *  series of small involuntary hops on a machine having a bad second. */
export const DOWNS_MAX_GRADIENT = 0.34;

/** Is (x, z) inside the prototype's box? `pad` widens it — the raycast sampler
 *  passes a little so a body standing on the very rim still probes the mesh. */
export function inDowns(x: number, z: number, pad = 0): boolean {
  return Math.abs(x - DOWNS.x) <= DOWNS.half + pad && Math.abs(z - DOWNS.z) <= DOWNS.half + pad;
}

/** The knoll mesh's surface at (x, z), in world y — NEGATIVE across the whole
 *  outer margin, which is the point (see DOWNS_SINK). Authoring only: this is
 *  what Terrain.tsx displaces its plane by. Read heights through
 *  `homeGroundY()` instead. */
export function downsSurfaceY(x: number, z: number): number {
  let h = 0;
  for (const b of BUMPS) {
    const t = Math.hypot(x - DOWNS.x - b.ox, z - DOWNS.z - b.oz) / b.r;
    if (t >= 1) continue;
    h += b.h * (0.5 + 0.5 * Math.cos(Math.PI * t));
  }
  return h - DOWNS_SINK;
}

/** Height of the crown above the meadow. Derived by asking the field rather
 *  than written down beside it: the crown IS the maximum by construction (a
 *  raised cosine peaks at its own centre and the spur reaches nowhere near),
 *  and a second hand-kept number is one re-authoring away from being a lie.
 *  Read by the minimap's height bands and by documentation; nothing
 *  gameplay-critical depends on it. */
export const DOWNS_PEAK = downsSurfaceY(DOWNS.x, DOWNS.z);

// ---------------------------------------------------------------------------
// The box is only safe because of four numbers and a lot of other people's
// geometry, and every one of those moves independently of this file: land
// tiers are generated, DIG_OUTSKIRT is Pass B's, the nav grid's extent is JSON
// the AI work tunes, the road's LEGS are hand-written, and the grounds are
// dragged around live at /secret/worldeditor. "Nothing is up there" is exactly
// the kind of claim that is true when written and quietly false a wave later,
// so it is asserted rather than remembered — the same treatment
// FIXED_WORLD_PROPS gets in buildables.ts.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const warn = (msg: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[downs] ${msg}`);
  };
  const box = {
    minX: DOWNS.x - DOWNS.half, maxX: DOWNS.x + DOWNS.half,
    minZ: DOWNS.z - DOWNS.half, maxZ: DOWNS.z + DOWNS.half,
  };
  const overlaps = (r: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
    r.maxX > box.minX && r.minX < box.maxX && r.maxZ > box.minZ && r.minZ < box.maxZ;

  // 1. the field itself: walkable everywhere, and back to fully buried before
  //    the rim (a bump reaching the box edge would end in a metre-high cliff)
  let maxGrad = 0;
  let rimHigh = -Infinity;
  for (let x = box.minX; x <= box.maxX; x += 0.5) {
    for (let z = box.minZ; z <= box.maxZ; z += 0.5) {
      const gx = (downsSurfaceY(x + 0.05, z) - downsSurfaceY(x - 0.05, z)) / 0.1;
      const gz = (downsSurfaceY(x, z + 0.05) - downsSurfaceY(x, z - 0.05)) / 0.1;
      maxGrad = Math.max(maxGrad, Math.hypot(gx, gz));
      if (Math.abs(Math.abs(x - DOWNS.x) - DOWNS.half) < 2
        || Math.abs(Math.abs(z - DOWNS.z) - DOWNS.half) < 2) {
        rimHigh = Math.max(rimHigh, downsSurfaceY(x, z));
      }
    }
  }
  if (maxGrad > DOWNS_MAX_GRADIENT) {
    warn(`the field reaches a gradient of ${maxGrad.toFixed(3)} — over ${DOWNS_MAX_GRADIENT}, `
      + 'the player falls rather than runs down it (see DOWNS_MAX_GRADIENT)');
  }
  if (rimHigh > -DOWNS_SINK + 1e-6) {
    warn(`a bump reaches ${rimHigh.toFixed(2)} within 2m of the box edge — it will end in a `
      + 'cliff where the mesh stops instead of sinking away under the meadow');
  }

  // 2. the four bounds the box was chosen for (see this file's header). Every
  //    one is a "keep OUT of the square ±n" test, not a distance: the box could
  //    in principle be moved to any quadrant, and a check that only understood
  //    "north" would stop being a check the moment it was.
  const fence = landHalf(MAX_LAND_TIER);
  const outside = (n: number) => box.maxZ < -n || box.minZ > n || box.maxX < -n || box.minX > n;
  if (!outside(fence)) {
    warn(`the box overlaps the widest fence (±${fence}) — buildings would be placed on it, and `
      + 'evalPlacement hands out one flat groundY: 0 for the whole holding');
  }
  if (!outside(fence + DIG_OUTSKIRT)) {
    warn(`the box is within digging reach (±${fence + DIG_OUTSKIRT}) — a waterway could be cut into `
      + 'the hillside, which this prototype does not answer for');
  }
  if (!outside(navgridConfig.home.halfExtent)) {
    warn(`the box is inside the ±${navgridConfig.home.halfExtent}m home nav grid — villagers and `
      + 'raiders can now ROUTE onto it, and Villagers.tsx/Npc.tsx still draw every one of them at a '
      + 'hardcoded y=0');
  }

  // 3. …and clear of everything already standing in the world
  const half = ROAD_TILE / 2;
  for (const [cx, cz] of routeCells()) {
    const rx = cx * ROAD_TILE;
    const rz = cz * ROAD_TILE;
    if (overlaps({ minX: rx - half, maxX: rx + half, minZ: rz - half, maxZ: rz + half })) {
      warn(`the road runs over the downs at tile ${cx},${cz} — road plates are drawn flat at y=0.02`);
    }
  }
  for (const g of GROUNDS) {
    if (overlaps({ minX: g.x - g.halfX, maxX: g.x + g.halfX, minZ: g.z - g.halfZ, maxZ: g.z + g.halfZ })) {
      warn(`${g.id} now lies on the downs — its fence, boundary stone and scattered nodes are all `
        + 'placed at y=0');
    }
  }
}
