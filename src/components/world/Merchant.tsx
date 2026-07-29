'use client';
// The traveling merchant: visits by day with his cart, gone by night.
import { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiggedFigure from '../character/RiggedFigure';
import PropModel from './PropModel';
import { worldEnv } from '@/game/env';
import { navSteer } from '@/game/navgrid';
import { roadEntry } from '@/game/data/road';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import type { CharacterConfig } from '@/game/types';

const MERCHANT_CONFIG: CharacterConfig = {
  name: 'Merchant', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
  armColor: 30, handColor: 18, legColor: 34, hipColor: 30,
};

// O4 · minifiggenericgood00 has a VERIFIED rig map (part_roles.json) that
// includes a molded halberd, classified as a 'prop' and — when kept —
// parented to the BODY joint, not the hand. rehangArm then re-hangs the arm
// from its torso socket (K57's fix), but the prop stays exactly where it was
// baked relative to the torso, so it ends up floating away from wherever the
// (moved) hand actually landed. Alric and Beda already set keepProps: false
// for exactly this reason ("a farmer is not carrying the generic donor's
// molded halberd") — a merchant should not be brandishing one either.
const MERCHANT_KEEP_PROPS = false;

// O4 · the merchant used to stand at a fixed spot with an instant visibility
// toggle keyed off merchantPresent(time) — present one frame, gone the next.
// He now walks in from down the road and back out, same as any other actor
// using navSteer. The trading window (merchantPresent, read by
// PlayerController's interact check and Minimap's icon — see both files) is
// UNCHANGED and stays keyed to the fixed MERCHANT_SPOT constant, so nothing
// there needs to know this file changed: the walk happens entirely in a
// buffer just outside that window, and position is pinned to MERCHANT_SPOT
// for the whole time he is actually interactable, regardless of whether the
// walk-in has visually finished settling.
const WALK_BUFFER = 0.03; // ~21.6 game-seconds at the default 720s day
const WALK_SPEED = 1.2;

// The actual road's far entry point — the same spot every newcomer walks in
// from (villagerMobs.arriveByRoad) — not an arbitrary offset behind
// MERCHANT_SPOT. Found while investigating a reported rig bug: the old
// OFF_STAGE point (18m directly behind MERCHANT_SPOT) had nothing to do
// with where the road actually runs, so "walks in from down the road" was
// only true by coincidence of direction, not by following the road itself.
const OFF_STAGE = roadEntry();

type Stage = 'away' | 'arriving' | 'present' | 'leaving';

function stageFor(time: number): Stage {
  if (merchantPresent(time)) return 'present';
  if (time > 0.3 - WALK_BUFFER && time <= 0.3) return 'arriving';
  if (time >= 0.72 && time < 0.72 + WALK_BUFFER) return 'leaving';
  return 'away';
}

// the merchant's "cart": a yoked two-horse team hauling a shared tow-bar with
// a chest slung between them (oc6095b3) — same source model, normalized to
// the same height as a rideable horse (see RideHorse.tsx) so the pair reads
// at true horse scale. Parented under the same group as the merchant, so it
// travels with him for free — "along with the horses" needs no extra code.
function Cart() {
  return <PropModel url="/assets/props/oc6095b3.glb" height={1.7} position={[1.9, 0, -0.4]} yaw={0.4} />;
}

export default function Merchant() {
  const group = useRef<THREE.Group>(null);
  const [clip, setClip] = useState('anim_r_restpose');
  const state = useRef({ x: OFF_STAGE.x, z: OFF_STAGE.z, yaw: MERCHANT_SPOT.yaw, stage: 'away' as Stage });

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const stage = stageFor(worldEnv.time);

    // a stage change either end resets the walk cleanly, rather than
    // inheriting stale navSteer path state from the opposite direction
    if (stage !== s.stage) {
      if (stage === 'arriving') { s.x = OFF_STAGE.x; s.z = OFF_STAGE.z; }
      s.stage = stage;
    }

    if (stage === 'away') {
      g.visible = false;
      return;
    }
    g.visible = true;

    if (stage === 'present') {
      // pinned exactly on MERCHANT_SPOT — this is the contract
      // PlayerController/Minimap rely on (see the note above)
      s.x = MERCHANT_SPOT.x;
      s.z = MERCHANT_SPOT.z;
      s.yaw = MERCHANT_SPOT.yaw;
      g.position.set(s.x, 0, s.z);
      // RiggedFigure convention (see Villagers.tsx) — the same +Math.PI the
      // arriving/leaving branch below already applies; missing here meant
      // the merchant stood backwards (back to the player) the entire time
      // he's actually interactable, found investigating a reported rig bug.
      g.rotation.y = s.yaw + Math.PI;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      return;
    }

    // arriving or leaving: walk toward whichever end this stage is headed
    const [tx, tz] = stage === 'arriving' ? [MERCHANT_SPOT.x, MERCHANT_SPOT.z] : [OFF_STAGE.x, OFF_STAGE.z];
    const { nx, nz, dist } = navSteer(s, tx, tz, dt);
    if (dist > 0.5) {
      s.x += nx * WALK_SPEED * dt;
      s.z += nz * WALK_SPEED * dt;
      const desired = Math.atan2(-nx, -nz);
      let diff = desired - s.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.yaw += diff * Math.min(1, dt * 3);
      if (clip !== 'anim_c_walk') setClip('anim_c_walk');
    }
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.yaw + Math.PI; // RiggedFigure convention (see Villagers.tsx)
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <RiggedFigure config={MERCHANT_CONFIG} height={1.75} keepProps={MERCHANT_KEEP_PROPS} clip={clip} />
      </Suspense>
      <Cart />
    </group>
  );
}
