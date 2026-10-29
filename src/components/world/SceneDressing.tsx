'use client';
// CLN-25 · the pieces the destinations' set dressing is built from: a group that rides the bake's terrain at its own
// spot (Grounded), and a pennant on its pole (Pennant). The court's dressing (CourtDressing.tsx) and the guild halls
// (GuildHalls.tsx) both build with them; they lived in CourtDressing.tsx, which GuildHalls imported only for these.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sampleTemplateGroundY } from './TemplateWorld';

// origin-offset for a piece rendered inside DestinationScope.tsx's own
// group (already translated by dest.origin) — a call site that is not in
// one (GuildHalls.tsx's) passes nothing and keeps its absolute position.
export const ZERO_OFFSET = { x: 0, z: 0 };

/** a child group that rides the bake terrain at its own spot, per frame
 *  (the bake streams in async, so a one-shot sample would race the load).
 *  `sampleTemplateGroundY(x, z)` stays the full absolute value regardless of
 *  `originOffset` — a raycast against mountedRoot is nesting-agnostic (see
 *  TemplateWorld.tsx); only the final position write below is local. */
export function Grounded({ x, z, lift = 0, originOffset = ZERO_OFFSET, children }: { x: number; z: number; lift?: number; originOffset?: { x: number; z: number }; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.position.y = sampleTemplateGroundY(x, z) + lift;
  });
  return <group ref={group} position={[x - originOffset.x, 0, z - originOffset.z]}>{children}</group>;
}

/** pennant pole — the same simple procedural flag treatment as ClaimFlag,
 *  in tourney colors */
export function Pennant({ color }: { color: string }) {
  return (
    <group>
      <mesh position-y={1.5} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 3, 6]} />
        <meshStandardMaterial color="#6b4a2a" roughness={1} />
      </mesh>
      <mesh position={[0.4, 2.6, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
