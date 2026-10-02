'use client';
// CLN-28 · the player's real minifig arm in the viewmodel, moved verbatim out of Viewmodel.tsx.
import { useMemo } from 'react';
import * as THREE from 'three';
import type { FpsArm } from '@/lib/rigExtract';
import { ARM_DIR, ARM_SCALE, UP } from './mounts';

/**
 * The player's real minifig arm.
 *
 * Rather than hand-tuning a pitch (which only works for one donor's
 * proportions), the arm is PINNED BY ITS HAND: the inner group translates so
 * the measured wrist point lands on this group's origin — which is the same
 * point the held tool mounts at — and the outer rotation is solved from the
 * arm's own hang direction to ARM_DIR. Any donor's arm therefore arrives
 * with its hand exactly where the sword is, whatever its mold looks like.
 */
export function RigArm({ arm, side }: { arm: FpsArm; side: 1 | -1 }) {
  const instance = useMemo(() => arm.group.clone(true), [arm]);
  const { quat, offset } = useMemo(() => {
    const dir = ARM_DIR.clone();
    if (side > 0) dir.x = -dir.x;               // mirror for the other arm
    const q = new THREE.Quaternion().setFromUnitVectors(arm.hand.clone().normalize(), dir);
    // roll so the elbow bows outward rather than through the view
    q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, side * 0.25));
    return {
      quat: q,
      offset: arm.hand.clone().multiplyScalar(-ARM_SCALE),
    };
  }, [arm, side]);
  return (
    <group quaternion={quat}>
      <group position={offset} scale={ARM_SCALE}>
        <primitive object={instance} />
      </group>
    </group>
  );
}
