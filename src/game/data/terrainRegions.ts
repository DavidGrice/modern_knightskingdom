// Wave 12 · The North Downs — the homestead's first piece of REAL terrain.
// Wave 31 · generalized into TERRAIN_REGIONS and given a second member, West
// Fell, on the strength of the mechanism Wave 12 proved rather than a fresh
// one — see this file's own history below for why that generalization was
// safe to do in one pass while the rest of the map stays flat.
//
// A PROTOTYPE, bounded to two quadrants on purpose. The homestead has been
// unconditionally flat since Phase 20, and not merely by convention: the
// player's own `floorHeightAt` (PlayerController.tsx) opened with a literal
// `let floor = 0` and only ever raised it from placed buildings; the home
// meadow bake registers itself as nothing gameplay can sample, and until
// Wave 12 only a mounted DESTINATION did (TemplateWorld.tsx); `activeBuildRegion`
// hands out one scalar `groundY: 0` for the entire holding; and Villagers.tsx /
// Npc.tsx write `position.set(s.x, 0, s.z)` in a dozen places between them.
// Wave 31 touches every one of those (see gameStore.ts's evalPlacement,
// Villagers/Npc/Wildlife/RaiderRam/Merchant/Grounds/Defenders.tsx, and the
// InstancedProps choke point) — but the AUTHORED terrain itself stays two
// deliberately empty patches, not the whole map: a whole-map heightfield at
// today's vertex density would run roughly 34x today's triangle budget, an
// unmeasured cost real AI pathfinding height-awareness would also have to
// clear first (see navgrid.ts's own three structural blockers, named as
// explicit future work rather than attempted this wave).
//
// WHERE THEY ARE, AND WHY EXACTLY THERE. Three hard numbers pick a region's
// box; none of them is taste — this is The North Downs' own original
// reasoning, and it is a per-region test (a box test against ±n, not
// "north"), so it applies unchanged to every entry in TERRAIN_REGIONS below:
//   · north of everything. grounds.ts's own header records the whole north
//     side as deliberately cleared — "reserved on purpose for the kingdom's
//     own future expansion" — and Pass A's road LEGS, every GROUNDS entry,
//     both cultivated plots, the pond, the brook, the keep and the starter
//     village are every one of them at positive z. Nothing has to move for
//     either region.
//   · |z| > landHalf(MAX_LAND_TIER) = 40, so no deed ever widens the build
//     grid onto a region and evalPlacement's home branch (Wave 31: now
//     `homeGroundY(x, z)`, previously a flat `groundY: 0`) is never asked
//     about a buildable square that is not flat.
//   · |z| > 40 + DIG_OUTSKIRT = 56, so the spade cannot reach a region either —
//     a rectangle of nav-blocked water cut into a hillside is exactly the
//     interaction these two patches should not be asked to answer for yet.
// A fourth number used to belong on this list — the home nav grid's own
// halfExtent — back when it was ±56m and the Downs box's nearest edge, at 60,
// stood just outside it: a walker outside the grid has no cells at all, so
// living past the edge WAS the nav guarantee. Wave 17 #6 widened that grid to
// ±200m (ai/config/navgrid.json) so villagers can actually route to the real
// GROUNDS (grounds.generated.json scatters nodes up to ~197m out) instead of
// beelining the whole trip cross-country — which puts the Downs box 140m
// inside it, not past it. The guarantee this file's own dev check used to
// enforce ("outside the grid ⇒ unreachable") now lives in navTerrain.ts
// instead: a static 'blocked' exclusion per region, built directly from
// TERRAIN_REGIONS below, the same mechanism that already keeps the pond
// unpathable. Those exclusions cannot drift out of sync with a future resize
// here — they read each region's own x/z/half, not a copied number.
//
// West Fell (Wave 31) sits at x:-100, z:-94, half:34 — the Downs box
// translated 100m in x, at the identical z-depth and size. Every numeric
// safety margin the Downs box already proved (clear of the build fence,
// clear of digging reach — both z-only tests, so they transfer regardless of
// x — well inside the 200m nav grid with 66m of margin, clear of every
// GROUNDS entry/road/village, all of which sit at z >= 18) transfers
// automatically because it's the same z-range and box size, not new
// arithmetic. It sits 32m clear of the Downs box itself, reading as two
// distinct hills on the minimap rather than one blob. Its crown (r=28,
// h=5.6, peak slope 0.314) sits just under DOWNS_MAX_GRADIENT=0.34 with a
// margin comparable to Downs' own crown (0.335 — Downs runs closer to the
// ceiling than West Fell does); two off-center spurs at different radii from
// the Downs prototype's own spur give it a twin-shouldered "fell" silhouette,
// proving the bump-field technique generalizes to a different landform, not
// just a relocated copy of the same one. Both regions verified silent
// against the dev-mode self-check at the bottom of this file before shipping
// — see that check for what it actually covers.
//
// WHAT GAMEPLAY ACTUALLY READS. Not this file. The heights below are the
// AUTHORING field: they build the mesh (Terrain.tsx's TerrainRegions/
// TerrainKnollSurface) and nothing else. The player's floor, the camera and the
// raiders all read the mesh's own triangles through TemplateWorld.tsx's
// raycast sampler — the very same mechanism every destination bake already
// uses for actor Y. One source of truth, the geometry you can see, exactly
// as the destination worlds do it; a second analytic copy consulted at
// runtime is how the visible ground and the ground you stand on drift apart.

import { landHalf, MAX_LAND_TIER } from './buildables';
import { ROAD_TILE, routeCells } from './road';
import { GROUNDS } from './grounds';
import { DIG_OUTSKIRT } from '../waterworks';

/** One raised-terrain patch: a square box (the only place inside it where the
 *  ground is not y=0) plus the raised-cosine hills authored inside it. See
 *  this file's header for the placement rules every entry has to satisfy. */
export interface TerrainRegion {
  id: string;
  name: string;
  x: number;
  z: number;
  half: number;
  bumps: { ox: number; oz: number; r: number; h: number }[];
}

/**
 * Wave 12 · The North Downs. Wave 31 · West Fell, the second region, proving
 * the mechanism generalizes rather than merely relocating it — see this
 * file's header for both regions' own placement reasoning. A third region is
 * meant to be a one-line append here: `homeGroundY`, Minimap.tsx's height
 * bands and navTerrain.ts's exclusion list all derive from this array, not
 * from either region by name.
 */
export const TERRAIN_REGIONS: TerrainRegion[] = [
  {
    id: 'downs', name: 'The North Downs', x: 0, z: -94, half: 34,
    bumps: [
      { ox: 0, oz: 0, r: 30, h: 6.4 },        // the crown
      { ox: -16.8, oz: 17, r: 13, h: 1.7 },   // a spur running off its south-west flank
    ],
  },
  {
    id: 'westfell', name: 'West Fell', x: -100, z: -94, half: 34,
    bumps: [
      { ox: 0, oz: 0, r: 28, h: 5.6 },         // the crown — a touch lower/gentler than the Downs'
      { ox: -15, oz: 15, r: 12, h: 1.5 },      // north-west shoulder
      { ox: 14, oz: -16, r: 10, h: 1.1 },      // south-east shoulder — the two give it a twin silhouette
    ],
  },
];

/** How far every knoll mesh is sunk into the meadow.
 *
 *  The home bake cannot be carved (one GLB, no runtime geometry surgery — the
 *  same wall the player's dug waterways hit), so a hill laid ON it would meet
 *  it in a coplanar seam that z-fights over the entire flat margin of the
 *  patch. Sinking the mesh instead makes the two surfaces cross
 *  TRANSVERSALLY: every part of the knoll lower than this is simply
 *  underneath the meadow and invisible, and the hill's visible foot is the
 *  line where it climbs out. 0.9 rather than a few centimetres because the
 *  bake is flat only to within ~0.6m across its 2km field (see
 *  normalizeTemplateBake's own measurements) — a shallower sink would let the
 *  buried margin poke through wherever the meadow happens to sit low. A
 *  shared constant across every region: this is a bake-flatness ceiling, not
 *  a per-hill authoring choice. */
export const DOWNS_SINK = 0.9;

/** The steepest ground the player's own movement resolver stays glued to.
 *  PlayerController leaves `grounded` (and starts falling) the moment the floor
 *  drops more than 0.08m below its feet in a single frame; sprinting at 7 m/s
 *  that is a gradient of 0.69 at 60fps but only 0.34 at 30. Every region's
 *  authored field is held under the 30fps figure, so running downhill is a
 *  run and not a series of small involuntary hops on a machine having a bad
 *  second. Shared across every region — this is the movement resolver's own
 *  ceiling, not a per-hill number. */
export const DOWNS_MAX_GRADIENT = 0.34;

/** Which region, if any, contains (x, z) — a plain box test, looped over the
 *  short hand-authored list above (not the place for a spatial index).
 *  `pad` widens each box — the raycast sampler passes a little so a body
 *  standing on the very rim still probes the mesh. */
export function regionAt(x: number, z: number, pad = 0): TerrainRegion | null {
  for (const r of TERRAIN_REGIONS) {
    if (Math.abs(x - r.x) <= r.half + pad && Math.abs(z - r.z) <= r.half + pad) return r;
  }
  return null;
}

/** A region's knoll mesh's surface at (x, z), in world y — NEGATIVE across
 *  the whole outer margin, which is the point (see DOWNS_SINK). Authoring
 *  only: this is what Terrain.tsx displaces its plane by, region-relative
 *  (raised-cosine hills: zero slope at the centre AND at the rim, which is
 *  what lets them join the meadow — and each other — without a crease, and
 *  what keeps the gradient bounded; peak slope is exactly h·π/2r, checked
 *  against DOWNS_MAX_GRADIENT by this file's own dev assertion below).
 *  `ox`/`oz` are offsets from the region's own centre. Read heights through
 *  `homeGroundY()` instead. */
export function regionSurfaceY(region: TerrainRegion, x: number, z: number): number {
  let h = 0;
  for (const b of region.bumps) {
    const t = Math.hypot(x - region.x - b.ox, z - region.z - b.oz) / b.r;
    if (t >= 1) continue;
    h += b.h * (0.5 + 0.5 * Math.cos(Math.PI * t));
  }
  return h - DOWNS_SINK;
}

/** Height of each region's own crown above the meadow, keyed by id. Derived
 *  by asking the field rather than written down beside it: the crown IS the
 *  maximum by construction (a raised cosine peaks at its own centre and every
 *  shoulder/spur is placed to reach nowhere near it), and a second hand-kept
 *  number is one re-authoring away from being a lie. Read by the minimap's
 *  height bands and by documentation; nothing gameplay-critical depends on
 *  it. */
export const REGION_PEAK: Record<string, number> = Object.fromEntries(
  TERRAIN_REGIONS.map((r) => [r.id, regionSurfaceY(r, r.x, r.z)]),
);

// ---------------------------------------------------------------------------
// Every region's box is only safe because of a few numbers and a lot of other
// people's geometry, and every one of those moves independently of this
// file: land tiers are generated, DIG_OUTSKIRT is the waterworks module's,
// the road's LEGS are hand-written, and the grounds are dragged around live
// at /secret/worldeditor. "Nothing is up there" is exactly the kind of claim
// that is true when written and quietly false a wave later, so it is
// asserted rather than remembered — the same treatment FIXED_WORLD_PROPS
// gets in buildables.ts, generalized here to loop over TERRAIN_REGIONS so a
// future third region gets the identical safety net for free. The
// nav-reachability guarantee used to be checked here too (a box sitting
// outside the grid); Wave 17 #6 moved that check to navTerrain.ts, the
// module that now actually owns it — see that file's own dev-mode assertion
// next to its per-region exclusion entries.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const warn = (msg: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[terrainRegions] ${msg}`);
  };
  const overlaps = (
    a: { minX: number; maxX: number; minZ: number; maxZ: number },
    b: { minX: number; maxX: number; minZ: number; maxZ: number },
  ) => a.maxX > b.minX && a.minX < b.maxX && a.maxZ > b.minZ && a.minZ < b.maxZ;

  const boxes = TERRAIN_REGIONS.map((r) => ({
    r,
    box: { minX: r.x - r.half, maxX: r.x + r.half, minZ: r.z - r.half, maxZ: r.z + r.half },
  }));

  // 0. no two regions overlap each other
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i].box, boxes[j].box)) {
        warn(`${boxes[i].r.id} and ${boxes[j].r.id} overlap — two regions can never share ground`);
      }
    }
  }

  for (const { r, box } of boxes) {
    // 1. the field itself: walkable everywhere, and back to fully buried
    //    before the rim (a bump reaching the box edge would end in a
    //    metre-high cliff)
    let maxGrad = 0;
    let rimHigh = -Infinity;
    for (let x = box.minX; x <= box.maxX; x += 0.5) {
      for (let z = box.minZ; z <= box.maxZ; z += 0.5) {
        const gx = (regionSurfaceY(r, x + 0.05, z) - regionSurfaceY(r, x - 0.05, z)) / 0.1;
        const gz = (regionSurfaceY(r, x, z + 0.05) - regionSurfaceY(r, x, z - 0.05)) / 0.1;
        maxGrad = Math.max(maxGrad, Math.hypot(gx, gz));
        if (Math.abs(Math.abs(x - r.x) - r.half) < 2 || Math.abs(Math.abs(z - r.z) - r.half) < 2) {
          rimHigh = Math.max(rimHigh, regionSurfaceY(r, x, z));
        }
      }
    }
    if (maxGrad > DOWNS_MAX_GRADIENT) {
      warn(`${r.id}'s field reaches a gradient of ${maxGrad.toFixed(3)} — over ${DOWNS_MAX_GRADIENT}, `
        + 'the player falls rather than runs down it (see DOWNS_MAX_GRADIENT)');
    }
    if (rimHigh > -DOWNS_SINK + 1e-6) {
      warn(`${r.id} has a bump reaching ${rimHigh.toFixed(2)} within 2m of the box edge — it will end `
        + 'in a cliff where the mesh stops instead of sinking away under the meadow');
    }

    // 2. the two bounds every region's box is chosen against (see this
    //    file's header). Both are a "keep OUT of the square ±n" test, not a
    //    distance: a box could in principle sit in any quadrant, and a check
    //    that only understood "north" would stop being a check the moment
    //    one didn't. The home nav grid's own extent used to be a third bound
    //    checked here — a box living outside it WAS the nav-reachability
    //    guarantee. Wave 17 #6 widened that grid to ±200m so hauls can reach
    //    the real GROUNDS, which puts the Downs box 140m inside it; the
    //    guarantee now lives in navTerrain.ts's per-region exclusions
    //    instead (and that file runs its own dev-mode check that every
    //    region is actually covered).
    const fence = landHalf(MAX_LAND_TIER);
    const outside = (n: number) => box.maxZ < -n || box.minZ > n || box.maxX < -n || box.minX > n;
    if (!outside(fence)) {
      warn(`${r.id} overlaps the widest fence (±${fence}) — buildings would be placed on it, and `
        + 'evalPlacement would be asked about a buildable square this field never expected');
    }
    if (!outside(fence + DIG_OUTSKIRT)) {
      warn(`${r.id} is within digging reach (±${fence + DIG_OUTSKIRT}) — a waterway could be cut into `
        + 'the hillside, which these regions do not answer for');
    }

    // 3. …and clear of everything already standing in the world
    const half = ROAD_TILE / 2;
    for (const [cx, cz] of routeCells()) {
      const rx = cx * ROAD_TILE;
      const rz = cz * ROAD_TILE;
      if (overlaps({ minX: rx - half, maxX: rx + half, minZ: rz - half, maxZ: rz + half }, box)) {
        warn(`the road runs over ${r.id} at tile ${cx},${cz} — road plates sample homeGroundY now, `
          + 'but check the tile actually belongs on this hillside');
      }
    }
    for (const g of GROUNDS) {
      if (overlaps({ minX: g.x - g.halfX, maxX: g.x + g.halfX, minZ: g.z - g.halfZ, maxZ: g.z + g.halfZ }, box)) {
        warn(`${g.id} now lies on ${r.id} — its fence, boundary stone and scattered nodes assume flat `
          + 'ground');
      }
    }
  }
}
