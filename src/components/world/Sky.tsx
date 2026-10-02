'use client';
// CLN-24 · the skybox and its star dome, moved out of Terrain.tsx. Unlike the rest of that file this is not
// home-only: GameWorld mounts it everywhere and picks the variant from the destination.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_HALF } from '@/game/data/world';
import { worldEnv, sampleEnv } from '@/game/env';

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

/** Sky bake variants (`public/assets/sky/<id>/{right,left,top,front,back}.png`,
 *  copied by prepare-assets.mjs from the extraction's own
 *  `warehouse/worlds/skyboxes/<id>/`). `horizonV` is each variant's own
 *  land/sky boundary, as a fraction up from the bottom of its side textures.
 *
 *  `grass`: measured off the four faces themselves — the lowest hills meet
 *  sky at 0.221–0.246, and the tallest peaks reach 0.33; 0.235 sits near the
 *  low end so the common case reads correctly at eye level.
 *
 *  `mountains`: requested 2026-08-04 ("skybox images we've not even used for
 *  the snowy maps") — this variant shipped in the extraction but had no
 *  copy step, no destination ever referenced it, and `GameSky` had no way to
 *  select a variant at all (one hardcoded `grass` path, used everywhere,
 *  including an icy mountain-pass destination). Measured the same way via a
 *  `sharp` row-scan of the four raw PNGs (not guessed): its peaks are much
 *  taller and far more uneven across faces than grass's (back face's peak
 *  reaches roughly halfway up the frame vs. front's ~1/5) — 0.20 is picked
 *  near the shorter faces' own horizon so the common view reads correctly at
 *  eye level, same reasoning as grass's own low-end pick, accepting that the
 *  tallest peaks tower dramatically overhead rather than sitting at the
 *  world's edge (a reasonable look for "the exposed rock" of a mountain
 *  pass, not obviously wrong the way the grass mismatch was). */
const SKY_VARIANTS: Record<string, { horizonV: number }> = {
  grass: { horizonV: 0.235 },
  mountains: { horizonV: 0.20 },
};

/** Skybox built from the original game's extracted sky sprites, tinted by
 *  time of day. `variant` picks which of `SKY_VARIANTS` to load — callers
 *  that don't care (the homestead) get the original `grass` default. */
export function GameSky({ variant = 'grass' }: { variant?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const { horizonV } = SKY_VARIANTS[variant] ?? SKY_VARIANTS.grass;
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const load = (n: string) => {
      const t = loader.load(`/assets/sky/${variant}/${n}.png`);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    // box faces order: +x -x +y -y +z -z
    return {
      px: load('right'), nx: load('left'), py: load('top'),
      pz: load('front'), nz: load('back'),
    };
  }, [variant]);
  // CLN-24 · loaded by hand, so released by hand: the faces reach the materials as `map` props, which
  // react-three-fiber never disposes. Every flip between a grass and a mountain destination used to leave the previous
  // five on the GPU until the garbage collector happened to find them.
  useEffect(() => () => { for (const t of Object.values(textures)) t.dispose(); }, [textures]);
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
    mesh.position.y = camera.position.y + size * (0.5 - horizonV);
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
      <mesh ref={meshRef} position={[0, size * (0.5 - horizonV), 0]}>
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
