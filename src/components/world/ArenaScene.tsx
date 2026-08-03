'use client';
// The Endless Arena's own shell (requested 2026-08-03) — a sealed ring with
// a gap left open as the entrance, reskinned per ArenaEnv (game/arena.ts).
// Built from the exact same primitives-only pattern BattleDome.tsx already
// uses for Storm's duel ring (a floor circle + a gapped ring of colored box
// "wall" segments + a few corner towers) rather than a baked Template
// world — the 9 template dioramas are fixed outdoor scenes (castle/field/
// river) that can't be cheaply recolored into "lava"/"snow"/"water", and
// none of the flat-recolor work below needs a bake in the first place.
//
// Unlike BattleDome (which rides a host Template's own terrain height and
// outdoor fill light), this is a standalone destination — TemplateWorld.tsx
// mounts it in place of a baked scene, so it supplies its own lighting and
// fog entirely, the same way DungeonScene.tsx supplies its own dim mood for
// the other non-baked destination, the Sealed Crypt.
import { useMemo } from 'react';
import { ARENA_ENV_BY_ID, type ArenaEnvId } from '@/game/arena';
import { ARENA_RADIUS } from '@/game/data/worlds';

const SEG_COUNT = 28;
const GAP_HALF = 0.4; // radians left open on the north side as the entrance

function useRingAngles() {
  return useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < SEG_COUNT; i++) {
      const angle = (i / SEG_COUNT) * Math.PI * 2;
      const distFromNorth = Math.min(angle, Math.PI * 2 - angle);
      if (distFromNorth < GAP_HALF) continue;
      angles.push(angle);
    }
    return angles;
  }, []);
}

/** a few static emissive floor patches — lava's own cheap "pool" read, no
 *  shader work, just a handful of fixed placements inside the ring */
function LavaPools() {
  const spots = useMemo(() => {
    const out: { x: number; z: number; r: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      const d = ARENA_RADIUS * 0.5;
      out.push({ x: Math.sin(a) * d, z: Math.cos(a) * d, r: 3 + (i % 2) });
    }
    return out;
  }, []);
  return (
    <>
      {spots.map((s, i) => (
        <mesh key={i} position={[s.x, 0.03, s.z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[s.r, 16]} />
          <meshBasicMaterial color="#ff5a1f" toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

export default function ArenaScene({ envId }: { envId: ArenaEnvId | null }) {
  const env = ARENA_ENV_BY_ID[envId ?? 'earth'];
  const angles = useRingAngles();
  const R = ARENA_RADIUS;

  return (
    <group>
      <fog attach="fog" args={[env.fogColor, R * 0.6, R * 3]} />
      <hemisphereLight args={['#dfe8ff', '#3d3527', 3.2]} />
      <ambientLight intensity={2.4} />
      <directionalLight position={[R * 0.6, R, R * 0.3]} intensity={1.4} castShadow />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[R, 40]} />
        <meshStandardMaterial color={env.floorColor} roughness={1} />
      </mesh>
      {env.id === 'lava' && <LavaPools />}

      {angles.map((angle, i) => (
        <mesh
          key={i}
          position={[Math.sin(angle) * R, 1.4, Math.cos(angle) * R]}
          rotation-y={angle}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.6, 2.8, 0.5]} />
          <meshStandardMaterial color={env.wallColor} roughness={1} />
        </mesh>
      ))}

      {/* corner towers — plain cylinders, same "no mismatched real prop
          reads better than a primitive" reasoning KeepInteriorRoom.tsx and
          BattleDome.tsx already use for their own enclosed/ring walls */}
      {[0.5, Math.PI / 2, Math.PI, Math.PI * 1.5 - 0.5].map((angle, i) => (
        <mesh key={`tower${i}`} position={[Math.sin(angle) * R, 2, Math.cos(angle) * R]} castShadow receiveShadow>
          <cylinderGeometry args={[1.6, 1.9, 4, 10]} />
          <meshStandardMaterial color={env.wallColor} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
