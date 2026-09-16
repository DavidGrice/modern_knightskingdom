'use client';
// Visual + AI for the raiders' own siege ladder (see game/raiderLadder.ts):
// trundles in from outside the target keep wall-walk and plants itself
// there, then holds — Enemies.tsx's own 'climbing' EnemyMob state is what
// actually sends raiders up it; this component only owns the ladder PROP
// itself, mirroring RaiderRam.tsx's own split (that file owns the ram prop,
// Enemies.tsx's raider AI does the actual fighting).
//
// Rendered through RiggedProp for the same reason every other siege prop in
// this file's own family is (RaiderRam.tsx), though `oc6096-5` (Siege Stair)
// has no wheel/throw/fire role of its own for the rig lab to drive — it's a
// straight walk-in and a static plant, not a rolling approach.
//
// It can be broken before or during a climb — game/combat.ts routes melee
// swings and bolts into damageRaiderLadder, and a wrecked ladder tips over
// and burns out instead of vanishing on the frame its HP hit zero, same as
// the ram. Enemies.tsx's own 'climbing' handler drops any raider still on it
// the instant `wrecked` goes true (or the wall itself comes down under it) —
// see that handler's own comment.
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { raiderLadderState } from '@/game/raiderLadder';
import RiggedProp from '../world/RiggedProp';
import { homeGroundY } from '../world/TemplateWorld';

// a touch slower than the ram (RAM_SPEED=1.3) — a ladder crew manhandling a
// stone-and-timber stair moves more deliberately than a ram team rolling
// their engine on its own wheels
const LADDER_SPEED = 1.1;
/** how long the wreck lies there before the field is cleared — same as the ram */
const WRECK_SECONDS = 6;

export default function RaiderLadder() {
  const group = useRef<THREE.Group>(null);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    if (!raiderLadderState.active) {
      g.visible = false;
      return;
    }
    const dt = Math.min(rawDt, 0.05);

    if (raiderLadderState.wrecked) {
      // tipped over, settling — then gone (same shape as RaiderRam.tsx)
      raiderLadderState.wreckT += dt;
      if (raiderLadderState.wreckT > WRECK_SECONDS) {
        raiderLadderState.active = false;
        g.visible = false;
        return;
      }
      const tip = Math.min(1, raiderLadderState.wreckT / 0.9);
      g.visible = true;
      g.position.set(
        raiderLadderState.x,
        homeGroundY(raiderLadderState.x, raiderLadderState.z) - 0.15 * tip,
        raiderLadderState.z,
      );
      g.rotation.set(0, raiderLadderState.baseYaw, tip * 0.6);
      return;
    }

    if (!raiderLadderState.planted) {
      const dx = raiderLadderState.baseX - raiderLadderState.x;
      const dz = raiderLadderState.baseZ - raiderLadderState.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.3) {
        const step = Math.min(d, LADDER_SPEED * dt);
        raiderLadderState.x += (dx / d) * step;
        raiderLadderState.z += (dz / d) * step;
      } else {
        raiderLadderState.x = raiderLadderState.baseX;
        raiderLadderState.z = raiderLadderState.baseZ;
        raiderLadderState.planted = true;
      }
    }
    g.visible = true;
    // Wave 31 · homeGroundY — this is a home-only raid mechanic, same as the
    // ram just above.
    g.position.set(raiderLadderState.x, homeGroundY(raiderLadderState.x, raiderLadderState.z), raiderLadderState.z);
    g.rotation.set(0, raiderLadderState.baseYaw, 0);
  });

  return (
    <group ref={group} visible={false}>
      <Suspense fallback={null}>
        <RiggedProp assetId="oc6096-5" height={3.2} />
      </Suspense>
    </group>
  );
}
