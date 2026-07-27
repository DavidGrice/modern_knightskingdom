'use client';
// Visual + AI for the raiders' own battering ram (see game/raiderRam.ts):
// trundles toward the nearest shut gate, or the homestead's center if there
// isn't one, ramming whatever it reaches via the same ramCheck the player's
// pushed cart already uses.
//
// Rendered through RiggedProp rather than PropModel so its WHEELS TURN: the
// rig lab charted `wheel_0`/`wheel_1` on oc4806, and RiggedProp rotates any
// wheel role by distance travelled (not by a spin rate picked by eye), which
// is what makes it read as rolling instead of skating.
//
// It can be broken before it arrives — combat.ts routes melee swings and
// bolts into damageRaiderRam, and a wrecked ram tips over and burns out
// instead of vanishing on the frame its HP hit zero.
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { ramCheck } from '@/game/siege';
import { raiderRamState } from '@/game/raiderRam';
import { BUILD_REGION } from '@/game/data/buildables';
import RiggedProp, { setPropTravel } from '../world/RiggedProp';

const HOME_X = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
const HOME_Z = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;
const RAM_SPEED = 1.3; // roughly a slow determined trudge, matching the player's own push pace
/** id RiggedProp keys its per-instance animation state on */
const RAM_ID = 'raider_ram';
/** how long the wreck lies there before the field is cleared */
const WRECK_SECONDS = 6;

export default function RaiderRam() {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef(0);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    if (!raiderRamState.active) {
      g.visible = false;
      return;
    }
    const dt = Math.min(rawDt, 0.05);

    if (raiderRamState.wrecked) {
      // tipped on its axle, settling — then gone
      raiderRamState.wreckT += dt;
      if (raiderRamState.wreckT > WRECK_SECONDS) {
        raiderRamState.active = false;
        g.visible = false;
        return;
      }
      const tip = Math.min(1, raiderRamState.wreckT / 0.9);
      g.visible = true;
      g.position.set(raiderRamState.x, -0.15 * tip, raiderRamState.z);
      g.rotation.set(0, yaw.current, tip * 0.5);
      return;
    }

    const st = useGameStore.getState();
    const gate = st.buildings.find((b) => b.type === 'gate' && !(st.gateOpen[b.id] ?? true));
    const tx = gate ? gate.x : HOME_X;
    const tz = gate ? gate.z : HOME_Z;
    const dx = tx - raiderRamState.x;
    const dz = tz - raiderRamState.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.3) {
      const step = RAM_SPEED * dt;
      raiderRamState.x += (dx / d) * step;
      raiderRamState.z += (dz / d) * step;
      raiderRamState.travel += step;
      yaw.current = Math.atan2(-dx, -dz);
    }
    setPropTravel(RAM_ID, raiderRamState.travel);
    ramCheck(RAM_ID, raiderRamState.x, raiderRamState.z);
    g.visible = true;
    g.position.set(raiderRamState.x, 0, raiderRamState.z);
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
