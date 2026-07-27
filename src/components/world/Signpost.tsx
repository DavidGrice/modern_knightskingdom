'use client';
// A travel marker near spawn: the original standard-pole model (l395700,
// also used for the Torch) topped with a signboard — the board is the one
// procedural piece here, since no discrete sign/board model exists in the
// extraction; the pole itself is real.
import { Suspense } from 'react';
import PropModel from './PropModel';
import { SIGNPOST } from '@/game/data/world';

export default function Signpost() {
  return (
    <group position={[SIGNPOST.x, 0, SIGNPOST.z]}>
      <Suspense
        fallback={
          <mesh position-y={0.8} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 1.6, 7]} />
            <meshStandardMaterial color="#5d3d20" roughness={1} />
          </mesh>
        }
      >
        <PropModel url="/assets/props/castle_accessories/04_l395700.glb" height={1.7} />
      </Suspense>
      <mesh position-y={1.55} castShadow>
        <boxGeometry args={[0.9, 0.62, 0.06]} />
        <meshStandardMaterial color="#6b4526" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0.034]}>
        <planeGeometry args={[0.74, 0.46]} />
        <meshStandardMaterial color="#e8d9ad" roughness={0.95} />
      </mesh>
    </group>
  );
}
