'use client';
// The traveling merchant: visits by day with his cart, gone by night.
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiggedFigure from '../character/RiggedFigure';
import PropModel from './PropModel';
import { worldEnv } from '@/game/env';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import type { CharacterConfig } from '@/game/types';

const MERCHANT_CONFIG: CharacterConfig = {
  name: 'Merchant', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
  armColor: 30, handColor: 18, legColor: 34, hipColor: 30,
};

// the merchant's "cart": a yoked two-horse team hauling a shared tow-bar with
// a chest slung between them (oc6095b3) — same source model, normalized to
// the same height as a rideable horse (see RideHorse.tsx) so the pair reads
// at true horse scale.
function Cart() {
  return <PropModel url="/assets/props/oc6095b3.glb" height={1.7} position={[1.9, 0, -0.4]} yaw={0.4} />;
}

export default function Merchant() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) group.current.visible = merchantPresent(worldEnv.time);
  });

  return (
    <group ref={group} position={[MERCHANT_SPOT.x, 0, MERCHANT_SPOT.z]} rotation-y={MERCHANT_SPOT.yaw}>
      <Suspense fallback={null}>
        <RiggedFigure config={MERCHANT_CONFIG} height={1.75} keepProps clip="anim_r_restpose" />
      </Suspense>
      <Cart />
    </group>
  );
}
