'use client';
import { Suspense, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_HALF, POND } from '@/game/data/world';
import { landHalf, landSouthHalf } from '@/game/data/buildables';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { worldEnv, seasonOf } from '@/game/env';
import { SEASON_GRASS } from './seasonGrass';
import { DugWater, HomeMeadow, Stream } from './HomeMeadowWater';
import { TerrainRegions } from './TerrainRegions';

export default function Terrain() {
  const buildMode = useGameStore((s) => s.buildMode);
  const landTier = useGameStore((s) => s.landTier);
  const grassMat = useRef<THREE.MeshStandardMaterial>(null);
  const { gl } = useThree();
  const anisotropy = Math.min(useAppStore((s) => s.settings.anisotropy), gl.capabilities.getMaxAnisotropy());

  // the fence you have actually bought, not the maximum it could ever reach
  // (F19/F20) — and every tier is an 8N+8 size, so the grid always closes on
  // a corner instead of leaving a strip no piece fits
  //
  // Wave 17 #4 · asymmetric on Z: `half` is still shared by the north/east/
  // west sides, but south is the separate, fixed `landSouthHalf` (see
  // buildables.ts's LAND_TIERS note) — so the overlay's own centre has to be
  // derived from THIS tier's two numbers, not from BUILD_REGION (which is
  // built off MAX_LAND_TIER and would put the overlay in the wrong place for
  // every tier below the top one, the moment the two Z bounds stopped
  // matching each other one-for-one).
  const regionHalf = landHalf(landTier);
  const regionSouthHalf = landSouthHalf(landTier);
  const regionW = regionHalf * 2;
  const regionD = regionHalf + regionSouthHalf;
  const regionCx = 0;
  const regionCz = (regionSouthHalf - regionHalf) / 2;

  // the original draws water as a runtime plane using this greyscale
  // caustic-ripple sprite, tinted blue via material color rather than
  // painted — see scripts/prepare-assets.mjs and the sibling extraction
  // project's MapLoader.jsx, which this mirrors (tint 0x7fd0dd, RepeatWrapping,
  // anisotropy 8 so the ripple stays legible instead of mip-blurring to a
  // flat color at a shallow viewing angle)
  const waterTexture = useMemo(() => {
    const t = new THREE.TextureLoader().load('/assets/textures/water/spr199_256x256.png');
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    t.repeat.set(3, 3);
    return t;
  }, []);

  useFrame((_, dt) => {
    const m = grassMat.current;
    if (m) {
      const target = SEASON_GRASS[seasonOf(worldEnv.dayCount)];
      m.color.r += (target[0] - m.color.r) * Math.min(1, dt * 0.15);
      m.color.g += (target[1] - m.color.g) * Math.min(1, dt * 0.15);
      m.color.b += (target[2] - m.color.b) * Math.min(1, dt * 0.15);
    }
    waterTexture.offset.x += dt * 0.012;
    waterTexture.offset.y += dt * 0.005;
  });

  return (
    <group>
      {/* the Far Meadow bake as the home ground (Phase 20) — the old flat
          season-tinted plane survives only as the loading fallback so there
          is never a void under the player's feet while the GLB streams in */}
      <Suspense
        fallback={
          <mesh rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[WORLD_HALF * 2, WORLD_HALF * 2, 1, 1]} />
            <meshStandardMaterial ref={grassMat} color="#4d8138" roughness={1} />
          </mesh>
        }
      >
        <HomeMeadow />
      </Suspense>
      {/* Wave 12 · and the corners of it that are not flat (Wave 31: now a
          data-driven list, TERRAIN_REGIONS). Outside the Suspense above
          deliberately: it is generated, not loaded, so it is ready the
          instant Terrain mounts — and the player's floor reads it through a
          raycast, which would silently answer "flat" for as long as it was
          suspended. */}
      <TerrainRegions />
      <Stream />
      {/* homestead dirt patch — pinned at the homestead's true (fixed) centre,
          same reasoning as villagers.ts's HOME_X/HOME_Z: `regionCz` is the
          build-region overlay's own centre, which is genuinely tier-
          dependent now that the south fence no longer mirrors the other
          three sides, but this decorative mesh has no reason to drift north
          as the player buys land, so it does not read regionCz/regionCx. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[Math.min(regionW, regionD) * 0.2, 40]} />
        <meshStandardMaterial color="#7a6238" roughness={1} />
      </mesh>
      {/* pond: sand ring + water */}
      <mesh rotation-x={-Math.PI / 2} position={[POND.x, 0.02, POND.z]}>
        <circleGeometry args={[POND.radius + 1.6, 40]} />
        <meshStandardMaterial color="#c9b878" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[POND.x, 0.06, POND.z]}>
        <circleGeometry args={[POND.radius, 40]} />
        <meshStandardMaterial
          map={waterTexture} color="#7fd0dd" roughness={0.3} metalness={0.1} transparent opacity={0.92}
        />
      </mesh>
      {/* Wave 12 · and every waterway the player has cut for themselves */}
      <DugWater />
      {/* build region overlay (aerial mode only) */}
      {buildMode && (
        <group position={[regionCx, 0, regionCz]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
            <planeGeometry args={[regionW, regionD]} />
            <meshBasicMaterial color="#57d06a" transparent opacity={0.13} />
          </mesh>
          <gridHelper
            args={[Math.max(regionW, regionD), Math.max(regionW, regionD) / 2, '#d8c878', '#8aa86a']}
            position-y={0.05}
          />
        </group>
      )}
    </group>
  );
}
