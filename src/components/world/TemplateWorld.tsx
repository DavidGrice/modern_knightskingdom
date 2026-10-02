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
// template-09 (HomeMeadow, HomeMeadowWater.tsx) is NOT flipped: it's a separate,
// already-verified call site, and its own bbox is near-flat (~±1 raw unit)
// where a flip would be visually meaningless anyway — left alone rather
// than risk its already-tuned 'origin' groundAnchor logic for zero benefit.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useKtx2ExtendLoader } from '@/game/gltfKtx2';
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATION_BY_ID, type WorldDestination } from '@/game/data/worlds';
import { getLocalWalkableRects } from '@/game/data/templateWalkableFootprint';
import { arenaState } from '@/game/arena';
// Wave 31 hotfix · homeGroundY/registerHomeGroundRoot moved to their own leaf
// module (src/game/homeGround.ts) — see that file's header for why. Imported
// AND re-exported below (the `export { ... }` further down) so every existing
// `from './TemplateWorld'` call site (Defenders.tsx, Villagers.tsx, Weather.tsx,
// etc.) keeps working unchanged — only gameStore.ts's own import needed to move.
import { homeGroundY, registerHomeGroundRoot } from '@/game/homeGround';
import DungeonScene from './DungeonScene';
import ArenaScene from './ArenaScene';
import { exposeDebug } from '@/lib/debugHooks';
// CLN-14 · the ground probes and bake normalization live in two React-free leaf modules now (game/templateGround.ts,
// game/templateBake.ts) so game-layer code such as navgrid no longer has to import this component file. They are
// re-exported here so every existing `from './TemplateWorld'` call site keeps working unchanged.
import {
  bakeOffset, destinationGroundY, getBakeOffset, getMountedRegion, mountedRegion, mountedRoot,
  resetTemplateGroundFallback, sampleTemplateGroundY,
} from '@/game/templateGround';
import { normalizeTemplateBake, TEMPLATE_WORLD_SCALE } from '@/game/templateBake';

export { sampleTemplateGroundY, destinationGroundY, getMountedRoot, getMountedRegion, getBakeOffset } from '@/game/templateGround';
export { TEMPLATE_WORLD_SCALE, normalizeTemplateBake } from '@/game/templateBake';

export { homeGroundY, registerHomeGroundRoot };

function NormalizedTemplateScene({ url, scale, flipY, destId }: { url: string; scale?: number; flipY?: boolean; destId?: string }) {
  const extendKtx2 = useKtx2ExtendLoader();
  const { scene } = useGLTF(url, true, true, extendKtx2);
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

/** the ground-filler disc a template's real geometry sits on — not purely
 *  cosmetic (see this file's own header on `raycastGroundY`/mountedRoot):
 *  it is a real fallback floor the height-probe can hit past the edge of an
 *  irregular bake silhouette, so it stays a circle (any exact-union shape
 *  is overkill for something whose whole job is invisible in the common
 *  case) but is now SIZED from the real classified walkable rects
 *  (templateWalkableFootprint.ts) rather than the old `dest.radius + 4`
 *  circular bound. A circle circumscribing the rects' own bounding corners
 *  strictly covers every rect, same margin-of-safety the old radius-based
 *  sizing always had over the wander bound it filled under.
 *
 *  Reuses a single unit-radius `circleGeometry` and rescales it via
 *  `mesh.scale` every frame (the codebase's existing scratch-object-reuse
 *  convention — Grounded/Marker in TemplatePopulation.tsx do the same
 *  rather than allocate fresh geometry) instead of re-instantiating
 *  `circleGeometry` with a new radius: `getBakeOffset()` isn't final until
 *  the async GLB has actually loaded, so this has to keep re-deriving the
 *  radius the same way those two do, not compute it once. Coordinates stay
 *  GROUP-LOCAL throughout (no `dest.origin` added) — this mesh already
 *  renders inside `TemplateWorldRoot`'s own origin-offset `<group>`, so
 *  `getLocalWalkableRects`' raw un-recentred numbers only need
 *  `scaleCompensation` and the live `bakeOffset`, exactly like this file's
 *  own `normalizeTemplateBake` holder positions everything else in this
 *  same group. Falls back to `dest.radius + 4` (byte-for-byte the old
 *  sizing) whenever this destination has no classified rects yet. */
function TemplateGroundDisc({ dest }: { dest: WorldDestination }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const localRects = useMemo(() => getLocalWalkableRects(dest.id), [dest.id]);
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let radius = dest.radius + 4;
    // same mount guard as PlayerController.tsx's own clamp and Minimap.tsx's
    // own rect overlay (see the former's comment for the live-caught race):
    // getBakeOffset() holds a stale/zero value until THIS destination's own
    // async GLB has actually resolved, so sizing off real rects before that
    // is confirmed (mountedRegion.current === dest.id) would use the wrong
    // offset. Harmless in practice (this disc sits under geometry that
    // itself hasn't rendered yet either), but falling back to the plain
    // radius-based sizing for those few frames costs nothing and keeps this
    // consistent with the rest of the pass.
    if (localRects && localRects.length && getMountedRegion() === dest.id) {
      const off = getBakeOffset();
      const scaleCompensation = (dest.worldScale ?? TEMPLATE_WORLD_SCALE) / TEMPLATE_WORLD_SCALE;
      let maxD2 = 0;
      for (const r of localRects) {
        for (const cx of [r.minX, r.maxX]) {
          for (const cz of [r.minZ, r.maxZ]) {
            const gx = cx * scaleCompensation + off.x;
            const gz = cz * scaleCompensation + off.z;
            const d2 = gx * gx + gz * gz;
            if (d2 > maxD2) maxD2 = d2;
          }
        }
      }
      radius = Math.sqrt(maxD2) + 4;
    }
    mesh.scale.setScalar(radius);
  });
  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color="#4c7a3a" roughness={1} />
    </mesh>
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
      <TemplateGroundDisc dest={dest} />
      <NormalizedTemplateScene key={dest.id} url={dest.model} scale={dest.worldScale} flipY destId={dest.id} />
      {claim && <ClaimFlag x={claim.x - dest.origin.x} z={claim.z - dest.origin.z} groundY={claim.groundY} />}
    </group>
  );
}

// debug/test access only — lets a smoke test cross-check navgrid.ts's
// rasterized heightAt() against this module's already-trusted raycast
// sampler (iteration 2.5's own verification).
exposeDebug('__kkworld', {
  // Wave 12 adds homeGroundY, for the same reason: a smoke test can now
  // cross-check a raised region's real triangles against the field
  // game/data/terrainRegions.ts authored them from, without a build step.
  sampleTemplateGroundY, destinationGroundY, getMountedRegion, getBakeOffset, homeGroundY,
});

export default function TemplateWorld() {
  const destination = useGameStore((s) => s.destination);
  if (!destination) return null;
  return <TemplateWorldRoot destId={destination} />;
}
