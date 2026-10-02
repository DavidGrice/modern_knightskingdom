'use client';
// CLN-14 · how a template bake is scaled, flipped and recentred, moved verbatim out of
// components/world/TemplateWorld.tsx (which re-exports it). React-free: three only.
import * as THREE from 'three';

// The source .glb already carries a baked-in ×0.1 from the extraction's
// obj2gltfHelper.mjs conversion (its MM_TO_WORLD_SCALE), on top of the raw
// mm-numeric export — this constant is chosen relative to the .glb's own
// units, not the raw mm figures, to land each scene at a human-navigable
// few-dozen-meters footprint alongside the rest of this human-scale world.
// A template minifig is ~54mm in the exporter's raw units (per the pipeline
// note in TemplateWorld.tsx's header); solving 54mm * 0.1 * SCALE = 1.75m (this game's human
// height) gives SCALE ≈ 0.32 — the old 0.06 undershot that by ~5.4×, which
// is why visiting a template made the player loom over dollhouse-sized
// castles instead of walking a human-scale landscape (see worlds.ts's
// radius values, bumped by the same ~5.33× to match).
export const TEMPLATE_WORLD_SCALE = 0.32;

// TREE-ORIENTATION FIX (2026-08-20): a player report of "some trees render
// upside-down" led to a live investigation of every away-destination .glb
// directly through GLTFLoader (Node, no browser) plus in-game raycasting
// against the actually-mounted scene. Two prior investigation attempts
// hadn't reached a confident visual read; this pass confirmed the cause
// with both a geometric signal AND a dramatic before/after screenshot:
// unlike the WHOLE-BAKE inversion `flipY` corrects (every away-dest
// .glb ships Y-inverted at the source, uniformly), a small number of
// individual submeshes are ALSO independently mis-oriented WITHIN an
// otherwise-correct bake — a defect baked into that one submesh's own raw
// vertex data, invisible to a whole-scene correction and only fixable by
// re-flipping that one mesh node back on its own.
//
// Confirmed live on template-03 (The River Landing): mesh nodes named
// `mesh_0_27` and `mesh_0_31` (the Nth `isMesh` node found by
// `scene.traverse`, 0-indexed, counting only within the GLTF scene itself
// — i.e. index 27 and 31 here) hold a decorative conifer/topiary row along
// the near riverbank. Every tree in it showed the tell of an inverted
// canopy: canopy mass bulging at the TOP tapering to a point at the
// ground, with a bare mounting stem poking up past the canopy into open
// air — the mirror image of a normal tree (wide base, tapering to a point
// overhead). Raycasting from the live camera through the on-screen
// canopies (not guessed from the raw file — the visible shape was clicked
// directly) resolved to exactly these two mesh nodes; mirroring each
// node's OWN local geometry 180° about its own bounding-box center turned
// every tree in the row into an ordinary right-side-up pine or ball
// topiary (screenshotted before/after — see PR). A per-mesh mirror, not a
// whole-object one, because these two mesh nodes hold ONLY this row (nothing
// else observed sharing their material in that scene) — confirmed via
// exhaustive raycasting from multiple angles before touching the geometry.
//
// The SAME visual defect (identical inverted-canopy silhouette, identical
// decorative row) was also seen via screenshot in three other destinations
// that reuse a near-identical asset — template-01, template-05,
// template-06 — but the equivalent live fix there had an unexplained side
// effect (the whole row went invisible rather than correcting) that wasn't
// root-caused within that first pass's budget. Deliberately left OUT of the
// map at the time rather than ship an unverified guess.
//
// FOLLOW-UP PASS (2026-08-26): finished the job above, one destination at a
// time, same live-raycast-first method — and, per that first pass's own
// admission, re-derived each index from scratch rather than trusting any
// number carried over from elsewhere (a carried-over guess for template-01
// was independently checked here and turned out wrong — see its own note
// below for what that guess actually was and why the live evidence
// overrides it).
//
// ROOT CAUSE of the earlier "went invisible" report, confirmed by directly
// reproducing it: an index derived from the WRONG traversal scope — e.g.
// counting `isMesh` nodes starting from `TemplateWorldRoot`'s outer
// `<group>` (which puts `TemplateGroundDisc`'s own mesh ahead of the real
// GLTF scene — exactly the trap this file's own `applyTreeMeshOrientationFix`
// doc comment already calls out) instead of `inner` alone — lands the fix
// on the wrong mesh entirely. That much was already suspected; what this
// pass adds is direct confirmation of what happens next. These bakes carry
// a handful of huge terrain/backdrop-scale meshes (one single mesh spanning
// 700+ world units was found live on template-05) alongside the small
// decorative rows. Their true rendered content is NOT centered in their own
// local bounding box — most of a backdrop panel's real geometry can sit
// hard against one face of its bbox, nowhere near the box's own center.
// `applyTreeMeshOrientationFix`'s mirror is a 180° rotation about that local
// bbox center: harmless (an in-place flip) for a small, roughly
// self-similar tree, but for one of these lopsided giants it relocates most
// of the mesh's triangles to the opposite side of its own (very large) box.
// Reproduced live twice this pass, on two different oversized meshes in two
// different destinations — one read as a flat panel erupting into tall
// diagonal spikes, the other warped the far background into jagged
// unrelated terrain — neither is literally "nothing rendered," but both are
// dramatic, camera-angle-dependent relocations of a large mass of geometry;
// depending on exactly where that mass lands relative to the camera and the
// rest of the scene (underground, in the sky, behind existing terrain), the
// same failure mode reads just as plausibly as "the row went invisible."
// Not a second bug — the wrong-mesh-mirror trap the function's doc comment
// already warned about, just not previously reproduced firsthand. The other
// two listed hypotheses were re-checked directly against these three
// destinations' own real row meshes and both stay ruled out exactly as they
// were for template-03: every one is genuine non-planar 3D geometry (a real
// extent on all three local axes, not a billboard), and
// `normalizeTemplateBake` already forces `THREE.DoubleSide` on every
// material before anything renders, so backface culling was never a factor.
//
// template-01 (The King's Approach): mesh node `mesh_0_60` — confirmed via
// the same raycast-the-actual-on-screen-defect method as template-03, on
// the decorative conifer/ball-topiary row along the procession road. NOTE:
// this does NOT match `[58, 59]`, the pair a prior draft of this fix
// proposed for this destination — those two were independently
// investigated here too (same live methodology) and turned out to be
// something else entirely: `mesh_0_58` is a striped bunting/pennant
// backdrop panel and `mesh_0_59` is the round ornament balls hanging on
// it — real decorative geometry, but not the tree row, and not
// mis-oriented (mirroring either produces no improvement; mirroring
// `mesh_0_58`/`_59` was never actually applied live for exactly this
// reason). `mesh_0_60`, by contrast, is a single mesh holding the ENTIRE
// tree row (confirmed by tinting it alone and watching the whole row light
// up) — mirroring it turned every canopy into an ordinary right-side-up
// pine, screenshotted before/after from an unmoved camera.
//
// template-05 (The Rival Castle): mesh nodes `mesh_0_41` and `mesh_0_49` —
// matches the earlier draft's own guess for this destination, but
// re-confirmed here from scratch rather than trusted on faith: raycasting
// the on-screen inverted canopies (both the ball ornaments and the conifer
// spikes in the same row) resolved to exactly these two mesh nodes, and
// mirroring both turned the whole row into ordinary pines/topiaries in one
// before/after pair (the castle behind the row, previously obscured by the
// inverted canopies, became visible once the fix was applied).
//
// template-06 (The Sister Keep): mesh nodes `mesh_0_78`, `mesh_0_79`,
// `mesh_0_80`, `mesh_0_81` — 4 indices, not 2, because this destination's
// row genuinely bakes as two backdrop-tile segments (a white one and a red
// one) sitting side by side, each contributing its own ball-topiary mesh
// and its own conifer mesh (a real structural difference from the other
// three, not an error). Confirmed incrementally from an unmoved camera:
// mirroring `mesh_0_79` alone fixed only the ball-topiary canopies, leaving
// the row's cone-shaped trees (and part of the backdrop panel itself)
// still visibly wrong; adding `mesh_0_80`/`_81` fixed the cones; adding
// `mesh_0_78` (a thin sliver of the backdrop panel) finished the job. A
// genuine "looks done after the first mesh but isn't" trap, caught by
// checking every visually-distinct shape in the row rather than stopping
// at the first improvement. All 4 together produce a complete right-side-up
// row across both tile segments. Two other backdrop tiles
// elsewhere in this same destination (`mesh_0_76`, `mesh_0_77`) carry a
// similar-looking arch/cone pattern but are a different asset at a
// different location, not part of the reported row — `mesh_0_76` was
// tried live and, consistent with the wrong-mesh trap above, erupted into
// spikes rather than correcting, confirming it does not belong in this fix.
const TREE_MESH_ORIENTATION_FIX: Record<string, number[]> = {
  'template-03': [27, 31],
  'template-01': [60],
  'template-05': [41, 49],
  'template-06': [78, 79, 80, 81],
};

/** apply `TREE_MESH_ORIENTATION_FIX`'s per-mesh correction to a freshly
 *  cloned GLTF scene (BEFORE the outer scale/flipY/recentring below, since
 *  this mutates each targeted mesh's own LOCAL geometry — a mirror through
 *  its own bounding-box center, independent of and unaffected by whatever
 *  outer transform gets applied afterward). Counts `isMesh` nodes in
 *  traversal order scoped to `scene` alone (matching how the fix's own
 *  indexes were derived and confirmed — see the constant's comment) so
 *  this must run on the GLTF scene itself, not a wrapper that adds sibling
 *  meshes (e.g. TemplateWorldRoot's ground-circle) ahead of it. */
function applyTreeMeshOrientationFix(scene: THREE.Object3D, destId?: string): void {
  if (!destId) return;
  const targets = TREE_MESH_ORIENTATION_FIX[destId];
  if (!targets || targets.length === 0) return;
  let i = 0;
  scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const idx = i++;
    if (!targets.includes(idx)) return;
    const mesh = obj as THREE.Mesh;
    const geom = mesh.geometry;
    geom.computeBoundingBox();
    const box = geom.boundingBox!;
    const cx = (box.min.x + box.max.x) / 2;
    const cy = (box.min.y + box.max.y) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    const m = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeTranslation(cx, cy, cz))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI))
      .multiply(new THREE.Matrix4().makeTranslation(-cx, -cy, -cz));
    geom.applyMatrix4(m);
    geom.computeVertexNormals();
  });
}

/** normalize a whole-map template bake: fixed scale, centered on X/Z, ground
 *  at y=0, shadows + normals + double-sided materials. Shared by destination
 *  rendering below and the home world's own Far Meadow terrain (Phase 20 —
 *  template-09 IS the homestead now, mounted at the world origin). Returns
 *  the applied recentring offset alongside the group (requested 2026-08-03,
 *  TemplatePopulation.tsx) — the grok map-layout data's own positions are
 *  expressed relative to the bake's un-recentred local origin, so anything
 *  placing content against that data needs the SAME real offset this
 *  function computed, not a second guess at what centered the bake.
 *
 *  `groundAnchor` (default `'bboxMin'`, unchanged behavior for every
 *  existing caller): the vertical recentring reference. Added 2026-08-03
 *  for `HomeMeadow` alone, after a live regression — template-09 spans
 *  6400×6400 world units (a genuinely huge "Far Meadow"), but the home
 *  world's own playable core (`WORLD_HALF`=200, everything in `road.ts`/
 *  `world.ts`) occupies only a small patch near its origin. Measured live:
 *  the mesh's real local height AT that origin is 0.320 — its near-MAXIMUM
 *  — while `box.min.y` (-0.288) comes from some distant low point ~3200
 *  units away. Anchoring to the global min floated the whole playable field
 *  ~0.6 units above every fixed-height decoration (`Road.tsx`'s tiles at a
 *  hardcoded y=0.02), burying the roads entirely. `'origin'` anchors to a
 *  real raycast at world-space (0,0) instead — the mesh's OWN lowest point
 *  elsewhere on a 6400-unit field is irrelevant to what sits at y=0 for a
 *  ±200-unit playable core. Every other destination raycasts the live mesh
 *  for player/prop height (`sampleTemplateGroundY`) regardless of where
 *  bbox-min recentring puts it, so they were never at risk from this.
 *
 *  `flipY` (default `false`, unchanged behavior for every existing caller
 *  except the away-destination path below): mirrors the bake across its own
 *  Y axis before recentring — see TemplateWorld.tsx's header comment for the direct
 *  bbox evidence that every away-destination .glb ships Y-inverted at the
 *  source. A pure mirror, X/Z untouched; three.js's normal matrix corrects
 *  lighting automatically under the resulting negative-determinant
 *  transform, and `mesh.material.side = DoubleSide` (below) already masks
 *  any backface/winding artifact regardless.
 *
 *  `destId` (default `undefined`): looks up `TREE_MESH_ORIENTATION_FIX`
 *  below for a per-mesh correction — see that constant's own comment for
 *  why a handful of individual submeshes need a SECOND, targeted fix on
 *  top of the whole-bake `flipY` above. */
export function normalizeTemplateBake(scene: THREE.Object3D, scale: number = TEMPLATE_WORLD_SCALE, groundAnchor: 'bboxMin' | 'origin' = 'bboxMin', flipY: boolean = false, destId?: string): { group: THREE.Group; offset: THREE.Vector3 } {
  const inner = scene.clone(true);
  applyTreeMeshOrientationFix(inner, destId);
  const holder = new THREE.Group();
  holder.add(inner);
  holder.scale.set(scale, flipY ? -scale : scale, scale);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const center = box.getCenter(new THREE.Vector3());
  let groundY = box.min.y;
  if (groundAnchor === 'origin') {
    const rc = new THREE.Raycaster();
    rc.set(new THREE.Vector3(center.x, box.max.y + 50, center.z), new THREE.Vector3(0, -1, 0));
    rc.far = box.max.y - box.min.y + 100;
    const hit = rc.intersectObject(holder, true)[0];
    if (hit) groundY = hit.point.y;
  }
  const offset = new THREE.Vector3(-center.x, -groundY, -center.z);
  holder.position.copy(offset);
  const wrapper = new THREE.Group();
  wrapper.add(holder);
  wrapper.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const mesh = c as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) (m as THREE.Material).side = THREE.DoubleSide;
    }
  });
  return { group: wrapper, offset };
}
