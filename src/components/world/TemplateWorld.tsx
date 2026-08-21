'use client';
// Renders the currently-visited template world: a merged bake of one of the
// nine original 2000-game diorama scenes (see game/data/worlds.ts), lazily
// mounted only while the player is actually there. Unlike individual catalog
// parts (see PropModel's doc comment), these whole-map bakes come out of a
// different exporter (export_textured.py, not the per-part pipeline). Scale
// uses a single fixed constant for the whole set rather than a per-instance
// target height, since these are baked multi-object scenes and
// height-matching would badly distort a naturally flat one (template-09's
// open field has almost no vertical extent at all).
//
// FLIPPED-BAKE FIX (2026-08-04): despite this file's earlier assumption that
// these bakes were "already right-side-up," a live user report ("green
// textures are underneath where we spawn") plus direct inspection of the
// shipped .glb files proved every away-destination bake (templates 01-08 AND
// all 6 challenge maps — checked 8 of the 14 directly) is Y-inverted at the
// source: each one's raw vertex bounding box hangs overwhelmingly BELOW y=0
// (e.g. template-01: y ∈ [-1913, +206] raw units — the opposite of a hill a
// castle "crowns," which should rise mostly ABOVE a y≈0 ground reference).
// Confirmed via `node -e` bbox dumps directly on the shipped GLBs, not
// guessed. Wherever this inversion enters the external export/convert
// pipeline (outside this repo, not traced further — see the project's own
// "scripts/ is gitignored local-only tooling" convention for why that
// pipeline isn't part of this codebase), the fix here is a targeted runtime
// correction: `normalizeTemplateBake`'s new `flipY` mirrors the bake across
// its own Y axis before recentring. Safe for prop/actor placement
// (TemplatePopulation.tsx's `Grounded` reads height from a LIVE raycast
// against whatever bake actually rendered, never the stored population Y) —
// only X/Z placement matters there, and a pure Y-mirror never touches those.
// template-09 (HomeMeadow, Terrain.tsx) is NOT flipped: it's a separate,
// already-verified call site, and its own bbox is near-flat (~±1 raw unit)
// where a flip would be visually meaningless anyway — left alone rather
// than risk its already-tuned 'origin' groundAnchor logic for zero benefit.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { BATTLE_DOME } from '@/game/data/world';
import { inDowns } from '@/game/data/downs';
import { arenaState } from '@/game/arena';
import DungeonScene from './DungeonScene';
import ArenaScene from './ArenaScene';

// The mounted template scene's root, for PlayerController to raycast against
// (terrain height varies a lot across these bakes — a hillside castle spans
// 12m+ of vertical relief — so a fixed eye height would bury the camera in
// a hillside; see sampleTemplateGroundY, used in place of floorHeightAt
// while st.destination is set).
const mountedRoot: { current: THREE.Object3D | null } = { current: null };
// which destination id mountedRoot currently holds — set alongside it, so a
// caller (navgrid.ts's height rasterization, iteration 2.5) can tell a real
// mount apart from "something else is mounted right now" before trusting the
// geometry. mountedRoot is a single global ref; only one destination is ever
// mounted at a time.
const mountedRegion: { current: string | null } = { current: null };
// Wave 12 · the homestead's own elevated ground (Terrain.tsx's HomesteadDowns)
// registers HERE rather than in mountedRoot, and the reason is structural, not
// tidiness: Terrain is mounted the ENTIRE time, destination visit included (see
// GameWorld.tsx — the home meadow is never unmounted when you travel), so the
// one-at-a-time slot above genuinely cannot hold both. Two roots, one probe:
// raycastGroundY below is the single implementation both go through, which is
// the whole point of putting the home terrain here instead of growing a second
// height query somewhere else.
const homeGroundRoot: { current: THREE.Object3D | null } = { current: null };
const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
// last real hit height, per destination — these bakes vary 12m+ in relief, so
// a hardcoded 0 fallback is very wrong almost everywhere on an elevated
// hillside; a raycast miss (sprinting past the edge of the actual mesh, which
// the destination's circular wander-radius doesn't perfectly match) should
// hold the last known ground height instead of dropping the player toward
// world-origin sea level, which read as falling through the bottom of the map.
let lastGroundY: number | null = null;

/** Drop a ray from well above (x, z) onto a mounted piece of ground and report
 *  where it lands — the one height probe in the project, shared by the
 *  destination sampler below and the homestead's own (Wave 12). Returns null on
 *  a miss rather than choosing a fallback, because the two callers want
 *  genuinely different answers to "nothing there": a destination holds the last
 *  height it knew (a hillside bake's own edge is not sea level), the homestead
 *  falls back to the flat meadow it actually has. */
function raycastGroundY(root: THREE.Object3D, x: number, z: number): number | null {
  rayOrigin.set(x, 400, z);
  raycaster.set(rayOrigin, DOWN);
  raycaster.far = 500;
  const hits = raycaster.intersectObject(root, true);
  return hits.length ? hits[0].point.y : null;
}

export function sampleTemplateGroundY(x: number, z: number, fallback = lastGroundY ?? 0): number {
  const root = mountedRoot.current;
  if (!root) return fallback;
  const y = raycastGroundY(root, x, z);
  if (y === null) return fallback;
  lastGroundY = y;
  return y;
}

/** Wave 12 · Terrain.tsx hands its North Downs mesh over here on mount, and
 *  takes it back on unmount. Same "register the geometry, then everyone
 *  raycasts it" contract TemplateWorldRoot has always had with mountedRoot. */
export function registerHomeGroundRoot(root: THREE.Object3D | null): void {
  homeGroundRoot.current = root;
}

/**
 * Wave 12 · Ground height on the HOMESTEAD, which is 0 everywhere except
 * inside the North Downs prototype (game/data/downs.ts) — the one patch of home
 * that is not flat.
 *
 * The bounds test comes FIRST and is the load-bearing line. It is what keeps
 * this affordable (a raycast against several thousand triangles, otherwise
 * paid by every actor every frame, everywhere in the world), and it is also the
 * prototype's contract stated in one place: outside the box, home is flat, and
 * this function says so without consulting anything.
 *
 * Sub-zero hits floor at 0 because the knoll mesh is deliberately sunk into the
 * meadow (DOWNS_SINK): below y=0 it is buried, and the bake above it is the
 * ground you would actually be standing on.
 */
export function homeGroundY(x: number, z: number): number {
  if (!inDowns(x, z, 1)) return 0;
  const root = homeGroundRoot.current;
  if (!root) return 0; // the knoll has not mounted yet — flat meadow, correctly
  const y = raycastGroundY(root, x, z);
  return y === null || y < 0 ? 0 : y;
}

/** reset the held-ground fallback whenever a fresh destination mounts, so a
 *  stale height from the previous template world never leaks into the next */
export function resetTemplateGroundFallback() {
  lastGroundY = null;
}

/** Phase 2, iteration 2.5 — the mounted template scene's root, exported so
 *  navgrid.ts can rasterize its real geometry into a destination grid's
 *  height field (§2.3: runtime rasterization, not an offline bake or a
 *  per-cell raycast). Previously private; `sampleTemplateGroundY` was the
 *  only reader. */
export function getMountedRoot(): THREE.Object3D | null {
  return mountedRoot.current;
}

/** Which destination id `getMountedRoot()` currently belongs to, or null if
 *  nothing is mounted. See `mountedRegion`'s own comment above for why this
 *  check exists. */
export function getMountedRegion(): string | null {
  return mountedRegion.current;
}

/** ground height for actors at a destination, treating the Battle Dome's
 *  flat arena floor as local ground truth: the dome renders one level plane
 *  at its center's sampled height, so anyone standing inside the ring on a
 *  sloped bake would otherwise sink beneath it (Storm was buried to the
 *  neck). Applies to the player, NPCs and duel enemies alike. */
export function destinationGroundY(x: number, z: number): number {
  const raw = sampleTemplateGroundY(x, z);
  const dx = x - BATTLE_DOME.x;
  const dz = z - BATTLE_DOME.z;
  if (dx * dx + dz * dz <= (BATTLE_DOME.radius + 1) ** 2) {
    return Math.max(raw, sampleTemplateGroundY(BATTLE_DOME.x, BATTLE_DOME.z) + 0.03);
  }
  return raw;
}

// The source .glb already carries a baked-in ×0.1 from the extraction's
// obj2gltfHelper.mjs conversion (its MM_TO_WORLD_SCALE), on top of the raw
// mm-numeric export — this constant is chosen relative to the .glb's own
// units, not the raw mm figures, to land each scene at a human-navigable
// few-dozen-meters footprint alongside the rest of this human-scale world.
// A template minifig is ~54mm in the exporter's raw units (per the pipeline
// comment above); solving 54mm * 0.1 * SCALE = 1.75m (this game's human
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
// unlike the WHOLE-BAKE inversion `flipY` corrects above (every away-dest
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
// root-caused within a reasonable investigation budget. Deliberately left
// OUT of the map below rather than ship an unverified guess; a real fix
// for those three needs a fresh pass (start from live raycast + before/after
// screenshot exactly as done here, don't assume the template-03 mesh
// indexes transfer).
const TREE_MESH_ORIENTATION_FIX: Record<string, number[]> = {
  'template-03': [27, 31],
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
 *  Y axis before recentring — see this file's header comment for the direct
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

/** the currently-mounted bake's own recentring offset (see normalizeTemplateBake's
 *  doc comment) — same one-at-a-time module-ref convention as mountedRoot/
 *  mountedRegion above, since only one destination bake is ever mounted. */
const bakeOffset = new THREE.Vector3();
export function getBakeOffset(): THREE.Vector3 {
  return bakeOffset;
}

function NormalizedTemplateScene({ url, scale, flipY, destId }: { url: string; scale?: number; flipY?: boolean; destId?: string }) {
  const { scene } = useGLTF(url);
  const { group, offset } = useMemo(() => normalizeTemplateBake(scene, scale, 'bboxMin', flipY, destId), [scene, scale, flipY, destId]);
  useEffect(() => {
    bakeOffset.copy(offset);
    return () => { bakeOffset.set(0, 0, 0); };
  }, [offset]);
  return <primitive object={group} />;
}

// planted at a claimed plot's exact position (Phase 13) — a plain
// procedural pole + pennant, the same "no dedicated model, keep it simple"
// treatment as the fishing dock's shore sign
function ClaimFlag({ x, z, groundY }: { x: number; z: number; groundY: number }) {
  return (
    <group position={[x, groundY, z]}>
      <mesh position-y={1.1} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 2.2, 6]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh position={[0.32, 1.9, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color="#e8c141" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function TemplateWorldRoot({ destId }: { destId: string }) {
  const dest = WORLD_DESTINATION_BY_ID[destId];
  const groupRef = useRef<THREE.Group>(null);
  const claim = useGameStore((s) => s.claimedWorlds[destId]);
  useEffect(() => {
    mountedRoot.current = groupRef.current;
    mountedRegion.current = destId;
    resetTemplateGroundFallback();
    return () => {
      mountedRoot.current = null;
      mountedRegion.current = null;
      // Stage 0b (2026-08-19): release this destination's cached GLTF bake
      // when leaving it, so a session that visits many destinations doesn't
      // pin every one of them in drei's module-level cache forever. Confirmed
      // live (Mesh.prototype.copy, three/src/objects/Mesh.js): the scene
      // NormalizedTemplateScene renders is `scene.clone(true)`'d off the
      // cached original (normalizeTemplateBake), and three's default clone
      // shares geometry/material BY REFERENCE — it never deep-clones them —
      // so the cache's original and every mounted clone point at the exact
      // same geometry/material/texture objects. By the time this cleanup
      // runs, mountedRoot above has just been dropped and the keyed
      // <NormalizedTemplateScene> (key={dest.id}, below) has unmounted too,
      // so nothing in the app still references this destination's scene
      // graph. useGLTF.clear() (confirmed in
      // node_modules/@react-three/fiber's useLoader.clear, which delegates
      // to suspend-react's `clear`) only splices the entry out of that
      // module-level Suspense cache array — it does not itself call
      // .dispose() on anything — so this is what lets the whole graph
      // finally become unreachable and GC-eligible instead of staying
      // resident for the rest of the session. dungeon/arena have no real
      // bake (model: ''); guarded off since there's nothing to clear and
      // NormalizedTemplateScene is never rendered for them.
      if (dest?.model) useGLTF.clear(dest.model);
    };
  }, [destId]);
  if (!dest) return null;
  if (dest.id === 'dungeon') {
    // a generated interior, not a real bake — its own dim torch-lit mood
    // instead of the outdoor fill light every real diorama needs, and no
    // claimable-plot flag (see Phase 13) since it regenerates every entry
    return (
      <group ref={groupRef} position={[dest.origin.x, 0, dest.origin.z]}>
        <DungeonScene />
      </group>
    );
  }
  if (dest.id === 'arena') {
    // requested 2026-08-03: same non-baked treatment as the Crypt above —
    // ArenaScene supplies its own lighting/fog per the active environment
    // (game/arena.ts), reskinned rather than regenerated
    return (
      <group ref={groupRef} position={[dest.origin.x, 0, dest.origin.z]}>
        <ArenaScene envId={arenaState.env} />
      </group>
    );
  }
  return (
    <group ref={groupRef} position={[dest.origin.x, 0, dest.origin.z]}>
      {/* the home world's sun is a fixed direction tuned for its own terrain;
          out here, with arbitrary hill orientations and no matching shadow
          camera coverage, that leaves slopes facing away from it essentially
          unlit — a generous fill light keeps the bake readable from every
          angle regardless of which way its terrain happens to face */}
      <hemisphereLight args={['#dfe8ff', '#3d6b2f', 4]} />
      <ambientLight intensity={3} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[dest.radius + 4, 24]} />
        <meshStandardMaterial color="#4c7a3a" roughness={1} />
      </mesh>
      <NormalizedTemplateScene key={dest.id} url={dest.model} scale={dest.worldScale} flipY destId={dest.id} />
      {claim && <ClaimFlag x={claim.x - dest.origin.x} z={claim.z - dest.origin.z} groundY={claim.groundY} />}
    </group>
  );
}

if (typeof window !== 'undefined') {
  // debug/test access only — lets a smoke test cross-check navgrid.ts's
  // rasterized heightAt() against this module's already-trusted raycast
  // sampler (iteration 2.5's own verification).
  (window as unknown as Record<string, unknown>).__kkworld = {
    // Wave 12 adds homeGroundY, for the same reason: a smoke test can now
    // cross-check the North Downs mesh's real triangles against the field
    // game/data/downs.ts authored them from, without a build step.
    sampleTemplateGroundY, destinationGroundY, getMountedRegion, getBakeOffset, homeGroundY,
  };
}

export default function TemplateWorld() {
  const destination = useGameStore((s) => s.destination);
  if (!destination) return null;
  return <TemplateWorldRoot destId={destination} />;
}
