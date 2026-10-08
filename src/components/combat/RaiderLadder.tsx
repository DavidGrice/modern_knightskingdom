'use client';
// Visual + AI for the raiders' own siege ladder (see game/raiderLadder.ts):
// trundles in from outside the target keep wall-walk and plants itself
// there, then holds — Enemies.tsx's own 'climbing' EnemyMob state is what
// actually sends raiders up it; this component only owns the ladder PROP
// itself, mirroring RaiderRam.tsx's own split (that file owns the ram prop,
// Enemies.tsx's raider AI does the actual fighting).
//
// Drawn from the Siege Stair's own GLB through PropModel: the very piece the
// player can place (`oc6096-5`, data/buildables), drawn the way Buildings.tsx
// draws one. NOT through RiggedProp, as the ram is — the stair has no wheel,
// arm or flag for the rig lab to drive, the lab charted no parts for it, and
// RiggedProp draws nothing at all for an asset without a parts chart. That is
// how this ladder was invisible until 2026-10-08: it walked in, planted, was
// climbed and was broken unseen (ROADMAP.md, "the raiders' siege ladder was
// invisible"). The model carries its wooden rungs on its +Z face and
// `baseYaw` turns its -Z face to the wall, so the rungs face the raiders
// coming up to it.
//
// It can be broken before or during a climb — combat/structures.ts's
// hitRaiderProp takes melee swings and bolts (game/raiderProps.ts's
// damageRaiderProp), and a wrecked ladder tips over and burns out instead of
// vanishing on the frame its HP hit zero, same as the ram. Enemies.tsx's own
// 'climbing' handler drops any raider still on it the instant `wrecked` goes
// true (or the wall itself comes down under it) — see that handler's own
// comment.
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { raiderLadderState } from '@/game/raiderLadder';
import { settleWreck } from '@/game/raiderProps';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import PropModel from '../world/PropModel';
import { homeGroundY } from '../world/TemplateWorld';

// a touch slower than the ram (RAM_SPEED=1.3) — a ladder crew manhandling a
// stone-and-timber stair moves more deliberately than a ram team rolling
// their engine on its own wheels
const LADDER_SPEED = 1.1;
/** what the raiders bring is the player's own Siege Stair: its model, and its
 *  height (3.2 m — combat/structures.ts tests a shaft at half of it) */
const STAIR = BUILDABLE_BY_ID['oc6096-5'];

export default function RaiderLadder() {
  const group = useRef<THREE.Group>(null);

  useFrame((_, rawDt) => {
    if (useGameStore.getState().paused) return;
    const g = group.current;
    if (!g) return;
    if (!raiderLadderState.active) {
      g.visible = false;
      return;
    }
    const dt = Math.min(rawDt, 0.05);

    if (raiderLadderState.wrecked) {
      // tipped over, settling — then gone (the ram's wreck, a little further over)
      const tip = settleWreck(raiderLadderState, dt);
      if (tip === null) {
        g.visible = false;
        return;
      }
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
        <PropModel url={STAIR.model!} height={STAIR.size[1]} />
      </Suspense>
    </group>
  );
}
