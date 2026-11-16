'use client';
// Visual + AI for the raiders' own battering ram (see game/raiderRam.ts):
// trundles toward the nearest shut gate (or the keep's gatehouse, shut), or the
// homestead's center if there isn't one — G-03: by a way round what stands
// (raiderRam.ts's rollRaiderRam), not straight at it — ramming whatever it
// reaches via the same ramCheck the player's pushed cart already uses.
//
// Rendered through RiggedProp rather than PropModel so its WHEELS TURN: the
// rig lab charted `wheel_0`/`wheel_1` on oc4806, and RiggedProp rotates any
// wheel role by distance travelled (not by a spin rate picked by eye), which
// is what makes it read as rolling instead of skating.
//
// It can be broken before it arrives — combat/structures.ts's hitRaiderProp
// takes melee swings and bolts (game/raiderProps.ts's damageRaiderProp), and
// a wrecked ram tips over and burns out instead of vanishing on the frame
// its HP hit zero.
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { ramCheck } from '@/game/siege';
import { raiderRamState, rollRaiderRam } from '@/game/raiderRam';
import { settleWreck } from '@/game/raiderProps';
import RiggedProp, { setPropTravel } from '../world/RiggedProp';
import { homeGroundY } from '../world/TemplateWorld';

/** id RiggedProp keys its per-instance animation state on */
const RAM_ID = 'raider_ram';

export default function RaiderRam() {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef(0);

  useFrame((_, rawDt) => {
    if (useGameStore.getState().paused) return;
    const g = group.current;
    if (!g) return;
    if (!raiderRamState.active) {
      g.visible = false;
      return;
    }
    const dt = Math.min(rawDt, 0.05);

    if (raiderRamState.wrecked) {
      // tipped on its axle, settling — then gone
      const tip = settleWreck(raiderRamState, dt);
      if (tip === null) {
        g.visible = false;
        return;
      }
      g.visible = true;
      // Wave 31 · homeGroundY — this is a home-only raid mechanic — with the
      // tip-and-settle sink (-0.15*tip) staying a relative offset on top.
      g.position.set(raiderRamState.x, homeGroundY(raiderRamState.x, raiderRamState.z) - 0.15 * tip, raiderRamState.z);
      g.rotation.set(0, yaw.current, tip * 0.5);
      return;
    }

    const heading = rollRaiderRam(useGameStore.getState(), dt);
    if (heading !== null) yaw.current = heading;
    setPropTravel(RAM_ID, raiderRamState.travel);
    ramCheck(RAM_ID, raiderRamState.x, raiderRamState.z);
    g.visible = true;
    g.position.set(raiderRamState.x, homeGroundY(raiderRamState.x, raiderRamState.z), raiderRamState.z);
    g.rotation.set(0, yaw.current, 0);
  });

  return (
    <group ref={group} visible={false}>
      <Suspense fallback={null}>
        <RiggedProp assetId="oc4806" height={1.8} buildingId={RAM_ID} />
      </Suspense>
    </group>
  );
}
