'use client';
// The traveling merchant: visits by day with his cart, gone by night.
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiggedFigure from '../character/RiggedFigure';
import RiggedProp from './RiggedProp';
import { worldEnv } from '@/game/env';
import { findPath, navSteer, type NavAgent } from '@/game/navgrid';
import { roadEntry, roadSpeedMult } from '@/game/data/road';
import { MERCHANT_SPOT } from '@/game/data/trade';
import {
  WALK_STOP, merchantGait, merchantSpeed, merchantStage, putOnSchedule, scheduledPlace, secondsLeftAtPace, walkWay,
  walkWindow, type MerchantStage,
} from '@/game/data/merchantDay';
import { homeGroundY } from './TemplateWorld';
import type { CharacterConfig } from '@/game/types';
import { preloadClip, type RiggedMinifig } from '@/lib/minifigRig';
import { wrapAngle } from '@/lib/math';
import { exposeDebug } from '@/lib/debugHooks';

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
/** his own pace at a point of his road: WALK_SPEED, quicker on the road itself (what keeping time reckons with) */
const paceAt = (x: number, z: number) => WALK_SPEED * roadSpeedMult(x, z);

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

/** each walk's two ends, where its stage starts him and where it takes him (only the walking stages ask) */
function walkEnds(stage: MerchantStage): [{ x: number; z: number }, { x: number; z: number }] {
  switch (stage) {
    case 'to_village_am': return [OFF_STAGE, VILLAGE_STOP];
    case 'arriving': return [VILLAGE_STOP, MERCHANT_SPOT];
    case 'leaving': return [MERCHANT_SPOT, VILLAGE_STOP];
    default: return [VILLAGE_STOP, OFF_STAGE]; // to_offstage
  }
}

/** What is left of his walk to `to` from (x, z), in seconds at his own pace, along a fresh plan from there. */
function secondsLeftFrom(x: number, z: number, to: { x: number; z: number }): number {
  return secondsLeftAtPace(x, z, { pts: findPath(x, z, to.x, to.z) ?? [], i: 0 }, to.x, to.z, paceAt);
}

/** Keeps him to his schedule on the walk the clock finds him on, once it has moved on without him: if putOnSchedule
 *  (data/merchantDay.ts) says so — always out of hiding, and otherwise only when he has fallen behind it — he is put
 *  where his schedule puts him on the walk (scheduledPlace, along a plan of the whole walk: walkWay), facing along it,
 *  to make a fresh plan from there. */
function keepToSchedule(s: NavAgent & { yaw: number }, stage: MerchantStage, outOfHiding: boolean) {
  const win = walkWindow(stage);
  if (!win) return; // a stage that holds him in place or hides him
  const [from, to] = walkEnds(stage);
  const share = Math.max(0, (worldEnv.time - win.start) / (win.end - win.start));
  const way = walkWay(from, findPath(from.x, from.z, to.x, to.z) ?? [], to);
  const at = scheduledPlace(way, share * (win.end - win.start) * worldEnv.dayLength, share, paceAt);
  if (!putOnSchedule(outOfHiding, secondsLeftFrom(s.x, s.z, to), secondsLeftFrom(at.x, at.z, to))) return;
  s.x = at.x;
  s.z = at.z;
  if (at.dx !== 0 || at.dz !== 0) s.yaw = Math.atan2(-at.dx, -at.dz);
  s.nav = undefined;
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
  // his rig, once assembled: his steps' cadence is set on its animator as his pace changes (RiggedFigure's own
  // timeScale is taken only when its clip changes)
  const rig = useRef<RiggedMinifig | null>(null);
  // the clips his walks ask for, loaded ahead: the animator's play() awaits a clip's load, so a run first asked for in
  // a walk's last strides (a short day hurries him most there) could come back after the rest pose that followed it,
  // and win — he would run on the spot through his trading window
  useEffect(() => {
    preloadClip('anim_c_walk');
    preloadClip('anim_c_run');
  }, []);
  // `hurry`: how much he is quickening his own pace this frame to keep time (1: not at all) — read by the live probes;
  // `lastTime`: the clock as the last frame found it
  const state = useRef<NavAgent & { yaw: number; stage: MerchantStage; hurry: number; lastTime: number }>({
    x: OFF_STAGE.x, z: OFF_STAGE.z, yaw: MERCHANT_SPOT.yaw, stage: 'away', hurry: 1, lastTime: worldEnv.time,
  });
  // Wave 53 (E4) · debug/test only, same convention as this project's other
  // __kk* handles (AgentManager's __kkai, Locomotion's __kkloco, road.ts's
  // own __kkroadEntry/__kkonRoad) — lets a live smoke test read the
  // merchant's real stage/position without adding a UI element, which is
  // how this wave's own multi-stop timing was actually verified (real
  // headless Chrome, worldEnv.time scrubbed via __kkenv, sampled against
  // this handle at each stage transition).
  exposeDebug('__kkmerchant', state.current);
  // ...and his rig, so that a probe can read what his figure plays: the animator's clip (`current`) and the cadence it
  // plays it at (`timeScale`)
  exposeDebug('__kkmerchantRig', rig);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    // his step, a tenth of a second's at most: a frame over 1.1 s long (a tab brought back) is not walked in one
    // stride, straight on past the point he makes for — the clock it ran on is kept to below, along his way — and a
    // shorter hitch only quickens his step to make the time up
    const dt = Math.min(rawDt, 0.1);
    const stage = merchantStage(worldEnv.time);
    s.hurry = 1;
    // the seconds of play the clock ran since the last frame (a clock set back reads as one run on round the day)
    const moved = ((((worldEnv.time - s.lastTime) % 1) + 1) % 1) * worldEnv.dayLength;
    s.lastTime = worldEnv.time;

    // Whenever the clock moves on without him — at a change of stage, and when it has run more than a second beyond
    // his step: a night's sleep and a knock-out (but in the arena, which only brings the player home) both set it to
    // 0.27, inside his walk in; a game loaded; a frame over 1.1 s long — he keeps to his schedule on the walk it finds
    // him on (keepToSchedule). Out of hiding — the stage before was 'away', or he has just been mounted (this component
    // is mounted at home only, so a return home mounts him afresh) — he is put where it says: the morning's walk finds
    // him at the road's end, a night's sleep as far along his walk in as the time since it set out allows (on a long
    // day, at its end). Otherwise he is put forward to it only if he has fallen behind it, never back: a walk's start
    // finds him where the stage before left him (present pins MERCHANT_SPOT, village_am/village_pm pin VILLAGE_STOP),
    // and a knock-out while he trades leaves him on his spot.
    if (stage !== s.stage || moved > dt + 1) {
      keepToSchedule(s, stage, s.stage === 'away');
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
    const [, end] = walkEnds(stage);
    const tx = end.x;
    const tz = end.z;
    const { nx, nz, dist } = navSteer(s, tx, tz, dt);
    if (dist > WALK_STOP) {
      // Wave 34 (G6.6) · the merchant's whole walk is along the printed
      // road by design (his timing is tuned against the roadEntry() ->
      // MERCHANT_SPOT distance), so this is a real target for the road
      // speed perk, not just a mechanical extension — flagged for a live
      // check against that tuned arrival timing.
      const pace = paceAt(s.x, s.z);
      // ...and he keeps time: his walk's window is a fraction of the day, whose length the player sets, so when what
      // is left of the walk would not fit what is left of the window he steps out faster (data/merchantDay.ts)
      const win = walkWindow(stage)!;
      const speed = merchantSpeed(
        pace,
        secondsLeftAtPace(s.x, s.z, s.nav, tx, tz, paceAt),
        (win.end - worldEnv.time) * worldEnv.dayLength,
        (win.end - win.start) * worldEnv.dayLength,
      );
      s.x += nx * speed * dt;
      s.z += nz * speed * dt;
      const desired = Math.atan2(-nx, -nz);
      const diff = wrapAngle(desired - s.yaw);
      s.yaw += diff * Math.min(1, dt * 3);
      // his steps keep up with him (data/merchantDay.ts's merchantGait): the walk's own cadence, quickened as he
      // hurries, and a run past about twice his pace
      const rate = speed / pace;
      s.hurry = rate;
      const { running, cadence } = merchantGait(rate, clip === 'anim_c_run');
      const want = running ? 'anim_c_run' : 'anim_c_walk';
      if (clip !== want) setClip(want);
      if (rig.current) rig.current.animator.timeScale = cadence;
      // the team's trot follows his speed, in tenths of a metre a second (a state: not set every frame)
      const gait = Math.round(speed * 10) / 10;
      if (gaitSpeed !== gait) setGaitSpeed(gait);
    } else {
      // there: he stands at rest until the next stage, rather than walking — or, hurried, running — on the spot (the
      // rest pose's own play() puts his cadence back to 1)
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      if (gaitSpeed !== 0) setGaitSpeed(0);
    }
    g.position.set(s.x, homeGroundY(s.x, s.z), s.z);
    g.rotation.y = s.yaw + Math.PI; // RiggedFigure convention (see Villagers.tsx)
  });

  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <RiggedFigure config={MERCHANT_CONFIG} height={1.75} keepProps={MERCHANT_KEEP_PROPS} clip={clip} onReady={(r) => { rig.current = r; }} />
      </Suspense>
      <Cart gaitSpeed={gaitSpeed} />
    </group>
  );
}
