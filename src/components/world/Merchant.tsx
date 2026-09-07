'use client';
// The traveling merchant: visits by day with his cart, gone by night.
import { Suspense, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiggedFigure from '../character/RiggedFigure';
import RiggedProp from './RiggedProp';
import { worldEnv } from '@/game/env';
import { navSteer } from '@/game/navgrid';
import { roadEntry, roadSpeedMult } from '@/game/data/road';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import { homeGroundY } from './TemplateWorld';
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
// Wave 46 (B4) · MERCHANT_SPOT moved from the old shared starter-village
// corner (34.4m from OFF_STAGE, entirely along the printed road at the
// ROAD_SPEED_MULT-boosted 1.56 effective speed — 34.4/1.56 = 22.05s, which
// is what the old 0.03 (21.6s) was tuned against) into his own walled camp
// down road.ts's new leg 6 spur. New distance hypot(64, 48) = 80: ~74.6m of
// that is along the road (roadSpeedMult applies, effective 1.56) and the
// remaining ~9.6m is the open walk from the spur's dead end into the camp's
// gate at plain WALK_SPEED — the straight-line estimate (74.6/1.56 + 9.6/1.2
// ≈ 55.8s) undershot the real walk badly: navSteer's A*-routed path is
// longer than that split assumes, and the original 0.09 (64.8s @ the
// default 720s day) — itself only a padded guess, never actually measured —
// left the merchant still ~2-3.7m short of MERCHANT_SPOT when the trading
// window opened, producing a real, visible teleport-pop instead of a clean
// arrival. Live-measured (real Chrome, dayLength=720, sampled every 3s
// across the buffer window): at 63.32s in he had covered ~77.6m and still
// had 3.738m left at his final off-road pace (~1.19 m/s, i.e. plain
// WALK_SPEED, confirming that shortfall lands in the off-road tail, not the
// road leg) — call it ~66.5s to fully close the gap. 0.1 (72s) leaves ~5.5s
// of margin over that measurement rather than trimming it to the wire.
const WALK_BUFFER = 0.1;
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
// the same height as a rideable horse (see MountedHorse.tsx) so the pair reads
// at true horse scale. Parented under the same group as the merchant, so it
// travels with him for free — "along with the horses" needs no extra code.
// Reported 2026-07-28: the team stood frozen mid-stride while walking. The
// rig lab DID chart a full four-leg walk cycle per horse (verified,
// part_roles.json) — it just never got wired to a renderer: PropModel only
// ever plays the static GLB path. RiggedProp already has a complete
// diagonal-trot animator (built for Wildlife.tsx's standalone horses); it
// just didn't recognise this asset's own per-horse leg names
// (horse_L_leg_FL_upper, …) until this same investigation added that case.
function Cart({ gaitSpeed }: { gaitSpeed: number }) {
  return (
    <RiggedProp
      assetId="oc6095b3"
      height={1.7}
      position={[1.9, 0, -0.4]}
      yaw={0.4}
      gaitSpeed={gaitSpeed}
    />
  );
}

export default function Merchant() {
  const group = useRef<THREE.Group>(null);
  const [clip, setClip] = useState('anim_r_restpose');
  const [gaitSpeed, setGaitSpeed] = useState(0);
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
      g.position.set(s.x, homeGroundY(s.x, s.z), s.z);
      // RiggedFigure convention (see Villagers.tsx) — the same +Math.PI the
      // arriving/leaving branch below already applies; missing here meant
      // the merchant stood backwards (back to the player) the entire time
      // he's actually interactable, found investigating a reported rig bug.
      g.rotation.y = s.yaw + Math.PI;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      if (gaitSpeed !== 0) setGaitSpeed(0);
      return;
    }

    // arriving or leaving: walk toward whichever end this stage is headed
    const [tx, tz] = stage === 'arriving' ? [MERCHANT_SPOT.x, MERCHANT_SPOT.z] : [OFF_STAGE.x, OFF_STAGE.z];
    const { nx, nz, dist } = navSteer(s, tx, tz, dt);
    if (dist > 0.5) {
      // Wave 34 (G6.6) · the merchant's whole walk is along the printed
      // road by design (his timing is tuned against the roadEntry() ->
      // MERCHANT_SPOT distance), so this is a real target for the road
      // speed perk, not just a mechanical extension — flagged for a live
      // check against that tuned arrival timing.
      const speed = WALK_SPEED * roadSpeedMult(s.x, s.z);
      s.x += nx * speed * dt;
      s.z += nz * speed * dt;
      const desired = Math.atan2(-nx, -nz);
      let diff = desired - s.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      s.yaw += diff * Math.min(1, dt * 3);
      if (clip !== 'anim_c_walk') setClip('anim_c_walk');
      if (gaitSpeed !== speed) setGaitSpeed(speed);
    } else if (gaitSpeed !== 0) {
      setGaitSpeed(0);
    }
    g.position.set(s.x, homeGroundY(s.x, s.z), s.z);
    g.rotation.y = s.yaw + Math.PI; // RiggedFigure convention (see Villagers.tsx)
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <RiggedFigure config={MERCHANT_CONFIG} height={1.75} keepProps={MERCHANT_KEEP_PROPS} clip={clip} />
      </Suspense>
      <Cart gaitSpeed={gaitSpeed} />
    </group>
  );
}
