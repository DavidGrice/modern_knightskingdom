'use client';
// Renders the currently-visited template world: a merged bake of one of the
// nine original 2000-game diorama scenes (see game/data/worlds.ts), lazily
// mounted only while the player is actually there. Unlike individual catalog
// parts (see PropModel's doc comment), these whole-map bakes come out of a
// different exporter (export_textured.py, not the per-part pipeline) and are
// already right-side-up — no upright flip here. Scale uses a single fixed
// constant for the whole set rather than a per-instance target height, since
// these are baked multi-object scenes and height-matching would badly
// distort a naturally flat one (template-09's open field has almost no
// vertical extent at all).
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { BATTLE_DOME } from '@/game/data/world';
import DungeonScene from './DungeonScene';

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

export function sampleTemplateGroundY(x: number, z: number, fallback = lastGroundY ?? 0): number {
  const root = mountedRoot.current;
  if (!root) return fallback;
  rayOrigin.set(x, 400, z);
  raycaster.set(rayOrigin, DOWN);
  raycaster.far = 500;
  const hits = raycaster.intersectObject(root, true);
  if (hits.length) {
    lastGroundY = hits[0].point.y;
    return lastGroundY;
  }
  return fallback;
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

/** normalize a whole-map template bake: fixed scale, centered on X/Z, ground
 *  at y=0, shadows + normals + double-sided materials. Shared by destination
 *  rendering below and the home world's own Far Meadow terrain (Phase 20 —
 *  template-09 IS the homestead now, mounted at the world origin). */
export function normalizeTemplateBake(scene: THREE.Object3D): THREE.Group {
  const inner = scene.clone(true);
  const holder = new THREE.Group();
  holder.add(inner);
  holder.scale.setScalar(TEMPLATE_WORLD_SCALE);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const center = box.getCenter(new THREE.Vector3());
  holder.position.set(-center.x, -box.min.y, -center.z);
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
  return wrapper;
}

function NormalizedTemplateScene({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const group = useMemo(() => normalizeTemplateBake(scene), [scene]);
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
    return () => { mountedRoot.current = null; mountedRegion.current = null; };
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
      <NormalizedTemplateScene key={dest.id} url={dest.model} />
      {claim && <ClaimFlag x={claim.x - dest.origin.x} z={claim.z - dest.origin.z} groundY={claim.groundY} />}
    </group>
  );
}

if (typeof window !== 'undefined') {
  // debug/test access only — lets a smoke test cross-check navgrid.ts's
  // rasterized heightAt() against this module's already-trusted raycast
  // sampler (iteration 2.5's own verification).
  (window as unknown as Record<string, unknown>).__kkworld = {
    sampleTemplateGroundY, destinationGroundY, getMountedRegion,
  };
}

export default function TemplateWorld() {
  const destination = useGameStore((s) => s.destination);
  if (!destination) return null;
  return <TemplateWorldRoot destId={destination} />;
}
