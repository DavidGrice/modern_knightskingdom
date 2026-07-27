'use client';
// Princess Storm's Battle Dome: a small, dedicated duel arena, distinct from
// Richard's open jousting field. Storm herself is a regular NpcDef (see
// data/npcs.ts) and renders via Npc.tsx — this is just the static ring of
// walls that makes the spot read as its own arena rather than open field.
import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BATTLE_DOME, STORM_WORLD } from '@/game/data/world';
import { useGameStore } from '@/game/store/gameStore';
import { sampleTemplateGroundY } from './TemplateWorld';
import PropModel from './PropModel';

const CYL = '/assets/props/cylindrical';

const SEG_COUNT = 22;
const GAP_HALF = 0.35; // radians left open on the north side as the entrance

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

export default function BattleDome() {
  const angles = useRingAngles();
  const R = BATTLE_DOME.radius;
  // Phase 20: the dome lives at The Sister Keep — mounted only while
  // visiting, riding the bake's real terrain height (sampled per frame via
  // a ref rather than once at mount, since the bake streams in async and
  // an early single sample would land before mountedRoot exists)
  const destination = useGameStore((s) => s.destination);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) {
      group.current.position.y = sampleTemplateGroundY(BATTLE_DOME.x, BATTLE_DOME.z);
    }
  });
  if (destination !== STORM_WORLD) return null;

  return (
    <group ref={group} position={[BATTLE_DOME.x, 0, BATTLE_DOME.z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
        <circleGeometry args={[R + 0.4, 40]} />
        <meshStandardMaterial color="#c9b878" roughness={1} />
      </mesh>
      {/* stone ring wall — the extraction's "wall section" models are all
          crenellation toppers, not flat panels (see prepare-assets.mjs's
          castle folder), so a plain stone-colored box reads far better here
          than a real mismatched piece; same technique KeepInteriorRoom.tsx
          already uses for its own enclosed walls */}
      {angles.map((angle, i) => (
        <mesh
          key={i}
          position={[Math.sin(angle) * R, 0.9, Math.cos(angle) * R]}
          rotation-y={angle}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.3, 1.8, 0.4]} />
          <meshStandardMaterial color="#6b6b72" roughness={1} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        {[0.35, Math.PI / 2, Math.PI, Math.PI * 1.5 - 0.35].map((angle, i) => (
          <PropModel
            key={`tower${i}`}
            url={`${CYL}/00_l306200.glb`}
            height={2.4}
            position={[Math.sin(angle) * R, 0, Math.cos(angle) * R]}
          />
        ))}
      </Suspense>
    </group>
  );
}
