'use client';
import { Suspense, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { WORLD_HALF, POND } from '@/game/data/world';
import { BUILD_REGION, landHalf } from '@/game/data/buildables';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { worldEnv, sampleEnv, seasonOf } from '@/game/env';
import { normalizeTemplateBake } from './TemplateWorld';

/** Spring/Summer/Autumn/Winter grass tints — winter reads pale/frost-dusted
 *  rather than switching to a wholly separate snow-covered ground state. */
const SEASON_GRASS: [number, number, number][] = [
  [0.302, 0.506, 0.220], // spring — today's original #4d8138
  [0.353, 0.580, 0.251], // summer — a touch richer/lighter
  [0.541, 0.478, 0.227], // autumn — olive/brown
  [0.788, 0.831, 0.784], // winter — pale, frost-dusted
];

/** Star dome, fading in at night (hidden by rain clouds). */
function Stars() {
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const { camera } = useThree();
  const positions = useMemo(() => {
    const n = 420;
    const arr = new Float32Array(n * 3);
    const r = WORLD_HALF * 1.2;
    for (let i = 0; i < n; i++) {
      const az = Math.random() * Math.PI * 2;
      const el = Math.asin(Math.random() * 0.92 + 0.06);
      arr[i * 3] = Math.cos(az) * Math.cos(el) * r;
      arr[i * 3 + 1] = Math.sin(el) * r;
      arr[i * 3 + 2] = Math.sin(az) * Math.cos(el) * r;
    }
    return arr;
  }, []);
  useFrame(() => {
    if (mat.current) {
      mat.current.opacity = Math.max(0, worldEnv.night - 0.35) * 1.4 * (1 - worldEnv.rain);
    }
    if (points.current) {
      points.current.position.x = camera.position.x;
      points.current.position.z = camera.position.z;
    }
  });
  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} color="#eef2ff" size={0.55} transparent opacity={0} fog={false} sizeAttenuation={false} />
    </points>
  );
}

/** Where the land/sky boundary sits in the sky bake, as a fraction up from the
 *  bottom of each side texture. Measured off the four faces themselves — the
 *  lowest hills meet sky at 0.221–0.246, and the tallest peaks reach 0.33. */
const HORIZON_V = 0.235;

/** Skybox built from the original game's extracted sky sprites, tinted by time of day. */
export function GameSky() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const load = (n: string) => {
      const t = loader.load(`/assets/sky/grass/${n}.png`);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    // box faces order: +x -x +y -y +z -z
    return {
      px: load('right'), nx: load('left'), py: load('top'),
      pz: load('front'), nz: load('back'),
    };
  }, []);
  const size = WORLD_HALF * 2.6;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // re-center on the camera's x/z each frame so the sky reads as infinitely
    // far away wherever the player wanders — including out at a template
    // world, far outside the home map this box was originally sized for
    mesh.position.x = camera.position.x;
    mesh.position.z = camera.position.z;
    // K60 · and on the camera's HEIGHT, offset so the painted horizon lands
    // on the viewer's eye. The box used to sit at a fixed y = size/2 - 40,
    // which put that line ~80m above the player: the bake's mountains reared
    // up over the whole sky instead of standing off at the world's edge.
    mesh.position.y = camera.position.y + size * (0.5 - HORIZON_V);
    const env = sampleEnv(worldEnv.time);
    const dim = 1 - worldEnv.rain * 0.55;
    const f = worldEnv.flash * 0.5;
    for (const m of mesh.material as THREE.MeshBasicMaterial[]) {
      m.color.setRGB(
        Math.min(1, env.sky[0] * dim + f),
        Math.min(1, env.sky[1] * dim + f),
        Math.min(1, env.sky[2] * dim + f),
      );
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={[0, size * (0.5 - HORIZON_V), 0]}>
        <boxGeometry args={[size, size, size]} />
        <meshBasicMaterial attach="material-0" map={textures.px} side={THREE.BackSide} fog={false} />
        <meshBasicMaterial attach="material-1" map={textures.nx} side={THREE.BackSide} fog={false} />
        <meshBasicMaterial attach="material-2" map={textures.py} side={THREE.BackSide} fog={false} />
        <meshBasicMaterial attach="material-3" color="#3d6b2f" side={THREE.BackSide} fog={false} />
        <meshBasicMaterial attach="material-4" map={textures.pz} side={THREE.BackSide} fog={false} />
        <meshBasicMaterial attach="material-5" map={textures.nz} side={THREE.BackSide} fog={false} />
      </mesh>
      <Stars />
    </>
  );
}

// Phase 20 step 1: the home terrain IS template-09 ("The Far Meadow") — the
// one genuinely empty, flat template bake — mounted at the world origin so
// every existing coordinate (SPAWN, BUILD_REGION, POND, NPCs, saved
// buildings) stays valid. The mesh comes to the world, not the world to the
// mesh. Its ground sits at y=0 after normalizeTemplateBake, and the field is
// flat (near-zero vertical extent, per TemplateWorld's own notes), so the
// flat-ground movement/collision assumptions hold unchanged. Seasonal grass
// tinting carries over by multiplying each baked material's own color by the
// current season's ratio-to-spring, so the meadow pales in winter the same
// way the old procedural plane did.
function HomeMeadow() {
  const { scene } = useGLTF('/assets/worlds/template-09.glb');
  const { gl } = useThree();
  const { group, tintables } = useMemo(() => {
    const g = normalizeTemplateBake(scene);
    // Requested 2026-07-31: a real Options setting (Settings.anisotropy,
    // default 8 — this file's own original hardcoded value, so a Balanced-
    // equivalent player sees no change) instead of a bare literal. A plain
    // imperative read, not a subscribed hook value — like AA mode and the
    // quality tiers' own antialias/powerPreference, this takes effect on
    // already-loaded textures only at next load, not live mid-session.
    const anisotropy = Math.min(useAppStore.getState().settings.anisotropy, gl.capabilities.getMaxAnisotropy());
    // clone materials so seasonal tinting never mutates drei's shared GLTF
    // cache (a destination visit to another bake must not inherit our tint)
    const tintables: { mat: THREE.MeshStandardMaterial; orig: THREE.Color }[] = [];
    g.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const clone = (m as THREE.Material).clone() as THREE.MeshStandardMaterial;
          // the baked stud-plate texture bands badly at the grazing angles a
          // ground plane is always seen from — anisotropy keeps it legible
          if (clone.map) clone.map.anisotropy = anisotropy;
          if (clone.color) tintables.push({ mat: clone, orig: clone.color.clone() });
          return clone;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      }
    });
    return { group: g, tintables };
  }, [scene, gl]);

  useFrame((_, dt) => {
    const s = seasonOf(worldEnv.dayCount);
    const base = SEASON_GRASS[0];
    const target = SEASON_GRASS[s];
    const k = Math.min(1, dt * 0.15);
    for (const { mat, orig } of tintables) {
      mat.color.r += (Math.min(1, orig.r * (target[0] / base[0])) - mat.color.r) * k;
      mat.color.g += (Math.min(1, orig.g * (target[1] / base[1])) - mat.color.g) * k;
      mat.color.b += (Math.min(1, orig.b * (target[2] / base[2])) - mat.color.b) * k;
    }
  });

  return <primitive object={group} />;
}

// A brook running from a rocky spring northeast of the pond down into it.
// The brook surface reuses the pond's spr199 ripple (it reads as flat water);
// spr203 — the cascade strip copied for exactly this in the water-texture
// pass — dresses the spring itself as a small waterfall face pouring out of
// the rocks, which is what that sprite actually depicts. Purely cosmetic:
// shallow enough to splash through, no collision. Routed pond-edge →
// (140, 68), clear of the Keep's footprint, the fishing dock (southwest
// bank) and the build region.
function Stream() {
  const { gl } = useThree();
  const anisotropy = Math.min(useAppStore((s) => s.settings.anisotropy), gl.capabilities.getMaxAnisotropy());
  const brookTexture = useMemo(() => {
    const t = new THREE.TextureLoader().load('/assets/textures/water/spr199_256x256.png');
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fallTexture = useMemo(() => {
    const t = new THREE.TextureLoader().load('/assets/textures/water/spr203_64x128.png');
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // from the pond's northeast edge out to the spring mound
  const ax = POND.x + 6.5, az = POND.z + 3;   // pond-edge end
  const bx = 140, bz = 68;                     // spring end
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  // plane length runs along local -Z once laid flat; the group yaw that
  // points -Z along (dx,dz) is this codebase's usual atan2(-dx,-dz)
  const yawAngle = Math.atan2(-dx, -dz);
  brookTexture.repeat.set(1, Math.round(len / 4));
  useFrame((_, dt) => {
    // visible pattern motion is OPPOSITE the offset drift: increasing
    // offset.y slides the sampled window up, so the image appears to move
    // down (-V). Brook -V points at the pond; the cascade face's +V is up.
    brookTexture.offset.y += dt * 0.12; // pattern drifts toward the pond
    fallTexture.offset.y += dt * 0.55;  // pattern pours DOWN the face
  });
  return (
    <group>
      <group position={[(ax + bx) / 2, 0.045, (az + bz) / 2]} rotation-y={yawAngle}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.4, len]} />
          <meshStandardMaterial
            map={brookTexture} color="#7fd0dd" roughness={0.35} metalness={0.1} transparent opacity={0.85}
          />
        </mesh>
      </group>
      {/* the spring: a rock cluster with a small spr203 cascade face */}
      <group position={[bx, 0, bz]} rotation-y={yawAngle}>
        {[[0, 0.45, -0.6], [0.9, 0.3, 0.1], [-0.85, 0.32, 0], [0.15, 0.28, 0.7]].map(([px, s, pz], i) => (
          <mesh key={i} position={[px as number, (s as number) * 0.7, pz as number]} castShadow>
            <dodecahedronGeometry args={[(s as number) * 2, 0]} />
            <meshStandardMaterial color="#8b8b90" roughness={1} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.42, 0.55]} rotation-x={-0.35}>
          <planeGeometry args={[1.3, 0.9]} />
          <meshStandardMaterial
            map={fallTexture} color="#9fdce8" roughness={0.3} transparent opacity={0.9} side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

export default function Terrain() {
  const buildMode = useGameStore((s) => s.buildMode);
  const landTier = useGameStore((s) => s.landTier);
  const grassMat = useRef<THREE.MeshStandardMaterial>(null);
  const { gl } = useThree();
  const anisotropy = Math.min(useAppStore((s) => s.settings.anisotropy), gl.capabilities.getMaxAnisotropy());

  // the fence you have actually bought, not the maximum it could ever reach
  // (F19/F20) — and every tier is an 8N+8 size, so the grid always closes on
  // a corner instead of leaving a strip no piece fits
  const regionHalf = landHalf(landTier);
  const regionW = regionHalf * 2;
  const regionD = regionHalf * 2;
  const regionCx = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
  const regionCz = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Stream />
      {/* homestead dirt patch */}
      <mesh rotation-x={-Math.PI / 2} position={[regionCx, 0.01, regionCz]} receiveShadow>
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
