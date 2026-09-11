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
const WALK_SPEED = 1.2;

// The actual road's far entry point — the same spot every newcomer walks in
// from (villagerMobs.arriveByRoad) — not an arbitrary offset behind
// MERCHANT_SPOT. Found while investigating a reported rig bug: the old
// OFF_STAGE point (18m directly behind MERCHANT_SPOT) had nothing to do
// with where the road actually runs, so "walks in from down the road" was
// only true by coincidence of direction, not by following the road itself.
const OFF_STAGE = roadEntry();

// Wave 53 (E4) · a real multi-stop day route, layered entirely on the SAME
// OFF_STAGE<->MERCHANT_SPOT walk this file already tuned above — no new
// coordinates invented anywhere. VILLAGE_STOP is Alric's own real corner
// (data/npcs.ts: farmer_alric, x=-40, z=38), snapped onto the road's own
// leg-2 centreline z (road.ts: `SZ * ROAD_TILE` = 3 * 12.8 = 38.4 — leg 2's
// westward trunk runs x:0 to x:-115.2 along exactly that row). The
// merchant's existing route ALREADY threads directly through this row on
// both legs today — this is 0.4m off Alric's own spot and ~4m off Beda's
// (x=-35, z=42) — so this is a real "passing through the village" beat at a
// point his cart was already breezing past with zero acknowledgment, not an
// invented stop with its own new geometry.
const VILLAGE_STOP = { x: -40, z: 38.4 };

// The walk becomes three legs each way instead of one: OFF_STAGE<->
// VILLAGE_STOP, a dwell AT VILLAGE_STOP, then VILLAGE_STOP<->MERCHANT_SPOT.
// Split against this file's own already-measured ~66.5s OFF_STAGE<-
// >MERCHANT_SPOT walk (Wave 46's own live sampling above) by real road
// distance along that same route: OFF_STAGE to the VILLAGE_STOP row is
// ~52.8m on-road (leg 3's own 25.6m N-S run down to the leg-2 junction, then
// 27.2m of leg 2's own E-W run west to x=-40); VILLAGE_STOP to MERCHANT_SPOT
// is the remaining ~49.6m on-road (leg 2's own last 36.8m west to the camp
// spur's junction, then 12.8m down the spur) plus the same ~9.6m off-road
// tail Wave 46 already measured into camp. VILLAGE_DWELL is new — not
// derived from the old walk, a real deliberate pause — and WALK_BUFFER
// widens to fit all three legs, the "widen the existing buffer to absorb the
// added dwell time" this wave's own research called for.
// LIVE-VERIFIED this wave (real headless Chrome — see this repo's own
// CLAUDE.md for the required launch flags — worldEnv.time scrubbed via the
// window.__kkenv debug handle across the new windows, merchant position
// sampled at each transition): he reaches VILLAGE_STOP and MERCHANT_SPOT
// with margin to spare at both boundaries, no teleport-pop at either seam.
const TO_VILLAGE_BUFFER = 0.047; // ~34s at the default 720s day
const VILLAGE_DWELL = 0.021; // ~15s dwell at the village corner
const VILLAGE_TO_SPOT_BUFFER = 0.056; // ~40s at the default 720s day
const WALK_BUFFER = TO_VILLAGE_BUFFER + VILLAGE_DWELL + VILLAGE_TO_SPOT_BUFFER;

type Stage =
  | 'away' | 'to_village_am' | 'village_am' | 'arriving'
  | 'present' | 'leaving' | 'village_pm' | 'to_offstage';

function stageFor(time: number): Stage {
  if (merchantPresent(time)) return 'present';
  // morning approach: OFF_STAGE -> VILLAGE_STOP -> (dwell) -> MERCHANT_SPOT,
  // counting the three sub-windows down to 0.3 (present's own start)
  const toVillageStart = 0.3 - WALK_BUFFER;
  const villageAmStart = 0.3 - VILLAGE_TO_SPOT_BUFFER - VILLAGE_DWELL;
  const arrivingStart = 0.3 - VILLAGE_TO_SPOT_BUFFER;
  if (time > toVillageStart && time <= villageAmStart) return 'to_village_am';
  if (time > villageAmStart && time <= arrivingStart) return 'village_am';
  if (time > arrivingStart && time <= 0.3) return 'arriving';
  // evening departure: MERCHANT_SPOT -> VILLAGE_STOP -> (dwell) -> OFF_STAGE,
  // the same three windows mirrored up from 0.72 (present's own end)
  const leavingEnd = 0.72 + VILLAGE_TO_SPOT_BUFFER;
  const villagePmEnd = leavingEnd + VILLAGE_DWELL;
  const toOffstageEnd = 0.72 + WALK_BUFFER;
  if (time >= 0.72 && time < leavingEnd) return 'leaving';
  if (time >= leavingEnd && time < villagePmEnd) return 'village_pm';
  if (time >= villagePmEnd && time < toOffstageEnd) return 'to_offstage';
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
  // Wave 53 (E4) · debug/test only, same convention as this project's other
  // __kk* handles (AgentManager's __kkai, Locomotion's __kkloco, road.ts's
  // own __kkroadEntry/__kkonRoad) — lets a live smoke test read the
  // merchant's real stage/position without adding a UI element, which is
  // how this wave's own multi-stop timing was actually verified (real
  // headless Chrome, worldEnv.time scrubbed via __kkenv, sampled against
  // this handle at each stage transition).
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__kkmerchant = state.current;
  }

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const stage = stageFor(worldEnv.time);

    // a stage change either end resets the walk cleanly, rather than
    // inheriting stale navSteer path state from the opposite direction.
    // Only entering `to_village_am` (from `away`) needs an explicit
    // position reset — every other transition already starts exactly where
    // the PREVIOUS stage left him (present pins MERCHANT_SPOT, village_am/
    // village_pm pin VILLAGE_STOP), so there is nothing stale to clear.
    if (stage !== s.stage) {
      if (stage === 'to_village_am') { s.x = OFF_STAGE.x; s.z = OFF_STAGE.z; }
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
      // walking branch below already applies; missing here meant
      // the merchant stood backwards (back to the player) the entire time
      // he's actually interactable, found investigating a reported rig bug.
      g.rotation.y = s.yaw + Math.PI;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      if (gaitSpeed !== 0) setGaitSpeed(0);
      return;
    }

    if (stage === 'village_am' || stage === 'village_pm') {
      // Wave 53 (E4) · a real "passing through the village" beat — pinned
      // exactly on VILLAGE_STOP, same restpose/gaitSpeed-0 treatment as
      // `present` above, just without overriding yaw: he keeps facing
      // whichever way the walk that got him here already turned him
      // (west on the way out, east on the way back), rather than snapping
      // to a second authored facing the way MERCHANT_SPOT's own yaw does.
      s.x = VILLAGE_STOP.x;
      s.z = VILLAGE_STOP.z;
      g.position.set(s.x, homeGroundY(s.x, s.z), s.z);
      g.rotation.y = s.yaw + Math.PI;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      if (gaitSpeed !== 0) setGaitSpeed(0);
      return;
    }

    // to_village_am / arriving / leaving / to_offstage: walk toward
    // whichever end this leg is headed
    const [tx, tz] = stage === 'to_village_am' ? [VILLAGE_STOP.x, VILLAGE_STOP.z]
      : stage === 'arriving' ? [MERCHANT_SPOT.x, MERCHANT_SPOT.z]
      : stage === 'leaving' ? [VILLAGE_STOP.x, VILLAGE_STOP.z]
      : [OFF_STAGE.x, OFF_STAGE.z]; // to_offstage
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
