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
  TURN_REACH, WALK_STOP, firstStepOf, legOf, merchantGait, merchantSpeed, merchantStage, nearestOnWay, putOnSchedule,
  scheduledPlace, secondsLeftAtPace, secondsLeftThrough, walkWindow, wayThrough, type MerchantStage,
} from '@/game/data/merchantDay';
import { laidBehind, teamBehind, teamOn, teamPose, towTeam, type TeamHooves } from '@/game/data/merchantTeam';
import { WIDE_REACH } from '@/game/nav/steering';
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

// Wave 53 (E4) · a real multi-stop day route, layered on the SAME
// OFF_STAGE<->MERCHANT_SPOT walk this file already tuned above. VILLAGE_STOP
// is Alric's own real corner
// (data/cast/village.ts: farmer_alric, x=-40, z=38), on the road's own leg 2 (road.ts:
// its westward trunk runs x:0 to x:-115.2 along z = `SZ * ROAD_TILE` = 3 * 12.8
// = 38.4, 2.88 m either side). The merchant's route ALREADY threads past this
// corner on both legs — a real "passing through the village" beat at a point
// his cart was already breezing past with zero acknowledgment, not an invented
// stop with its own new geometry. It stood on the road's centreline, 0.4 m from
// Alric's own spot, and his team, at his side there after his walk out, stood
// in Alric's hut through his evening dwell (ROADMAP.md, "the merchant's cart and
// team rode beside him"): it stands on the road's north half now, 2.6 m north of Alric,
// where his way (found wide enough for his team: NavGrid.findPath's `wide`)
// brings the team in clear of both huts.
const VILLAGE_STOP = { x: -40, z: 40.6 };

// Inside his camp's yard: his walk in brings him through the gate and down its west side (CAMP_WEST), then turns him
// due east (CAMP_TURN, west of his spot), so that he comes to his spot from the west with his team towed in behind him —
// at his right hand when he turns to face the gate to trade, rather than between him and whoever comes in through it
// (brought in straight from the gate, it stood there). Down the side and round by a right angle rather than one sharp
// turn, so that the team, cutting the turn as a towed cart does, parks less askew on the short stretch to his spot
// (measured: 31 degrees off it, its centre 1.66 m to his right and 0.58 m ahead of him; brought from the gate straight to
// the turn, 44 degrees, 1.58 m and 0.73 m). As far from the walls as his way keeps him (data/trade.ts's
// MERCHANT_CAMP_WALLS: the west wing's stone is 2.6 m off both). Both are points of the world, laid out round
// MERCHANT_SPOT and the camp's walls: move either, and these with it.
const CAMP_WEST = { x: -80.5, z: 20.5 };
const CAMP_TURN = { x: -80.5, z: 16 };

type Point = { x: number; z: number };

/** Each walking stage's stops: where it starts him, the points it turns him at on his way, and where it takes him. */
const WALK_STOPS: Partial<Record<MerchantStage, Point[]>> = {
  to_village_am: [OFF_STAGE, VILLAGE_STOP],
  arriving: [VILLAGE_STOP, CAMP_WEST, CAMP_TURN, MERCHANT_SPOT],
  leaving: [MERCHANT_SPOT, VILLAGE_STOP],
  to_offstage: [VILLAGE_STOP, OFF_STAGE],
};
/** the walk that brings him to each stage that holds him in place */
const WALK_INTO: Partial<Record<MerchantStage, MerchantStage>> = {
  village_am: 'to_village_am', present: 'arriving', village_pm: 'leaving',
};

/** His way from one point to another: the home grid's, found wide enough for his team (NavGrid.findPath's `wide`). */
function planOf(from: Point, to: Point): Point[] {
  return findPath(from.x, from.z, to.x, to.z, undefined, true) ?? [];
}

type MerchantState = NavAgent & {
  yaw: number; stage: MerchantStage; hurry: number; lastTime: number; leg: number; team: TeamHooves;
  beyond: { pts: unknown; seconds: number };
};

/** Keeps him to his schedule on the walk the clock finds him on, once it has moved on without him: if putOnSchedule
 *  (data/merchantDay.ts) says so — always out of hiding, and otherwise only when he has fallen behind it — he is put
 *  where his schedule puts him on the walk (scheduledPlace, along his way through the walk's stops: wayThrough),
 *  facing along it, to make a fresh plan from there. Either way the stop he makes for is set (`leg`): where he is put,
 *  the next on from there; where he is left, the next on from the point of the walk's way he is nearest — but on the
 *  walk he was already on, never back before a point it has turned him at (just past a turn, the leg he has left can
 *  be the nearer). Whether he was put. */
function keepToSchedule(s: MerchantState, stage: MerchantStage, outOfHiding: boolean): boolean {
  const win = walkWindow(stage);
  const stops = WALK_STOPS[stage];
  if (!win || !stops) return false; // a stage that holds him in place or hides him
  const { way, at } = wayThrough(stops, planOf);
  const here = legOf(at, nearestOnWay(way, s.x, s.z).next);
  const share = Math.max(0, (worldEnv.time - win.start) / (win.end - win.start));
  const place = scheduledPlace(way, share * (win.end - win.start) * worldEnv.dayLength, share, paceAt);
  const there = legOf(at, place.next);
  s.leg = s.stage === stage ? Math.max(s.leg, here) : here;
  const leftHere = secondsLeftThrough(s.x, s.z, stops, s.leg, planOf, paceAt);
  const leftThere = secondsLeftThrough(place.x, place.z, stops, there, planOf, paceAt);
  if (!putOnSchedule(outOfHiding, leftHere, leftThere)) return false;
  s.x = place.x;
  s.z = place.z;
  s.leg = there;
  if (place.dx !== 0 || place.dz !== 0) s.yaw = Math.atan2(-place.dx, -place.dz);
  s.nav = undefined;
  return true;
}

/** How far from his way he may stand where the clock has moved on without him and still be set down as having walked
 *  it (layTeam): further, and he has not — a sleep early on his walk out leaves him on his walk in, 7 m from its way. */
const OFF_WAY = 1;

/** Sets his team down behind him (`team`) as if he had walked the way that brings him where he is, towing it
 *  (merchantTeam.ts's laidBehind and teamOn): on a walk, its way up to the point of it he is nearest; at a stage that
 *  holds him in place, the whole way of the walk that brought him there. With `turn` — where keepToSchedule did not
 *  put him, and so did not face him along his way — it turns him to face away from his team, as that way leaves him:
 *  he comes out of hiding at a stop facing however he was. Left more than OFF_WAY off his way, he has not walked it
 *  there (the clock moved on can leave him on a walk going the other way to the one he was on), and laid on it his
 *  team would stand off to one side of where he goes next: it is set down straight behind him as he will walk from
 *  there instead, toward the point of his plan he steers for first (merchantDay.ts's firstStepOf, merchantTeam.ts's
 *  teamBehind), and he is faced that way, on a fresh plan. */
function layTeam(s: MerchantState, stage: MerchantStage, turn: boolean) {
  const walk = WALK_STOPS[stage] ? stage : WALK_INTO[stage];
  const stops = walk ? WALK_STOPS[walk] : undefined;
  if (!stops) return; // hidden
  const { way } = wayThrough(stops, planOf);
  const at = walk === stage ? { x: s.x, z: s.z } : way[way.length - 1];
  const near = walk === stage ? nearestOnWay(way, at.x, at.z) : null;
  if (turn && near && Math.hypot(near.x - at.x, near.z - at.z) > OFF_WAY) {
    const stop = stops[s.leg];
    const to = firstStepOf(at, planOf(at, stop), stop, WIDE_REACH);
    const d = Math.hypot(to.x - at.x, to.z - at.z);
    if (d > 0) {
      s.team = teamBehind(at.x, at.z, (to.x - at.x) / d, (to.z - at.z) / d);
      s.yaw = Math.atan2(-(to.x - at.x), -(to.z - at.z));
      s.nav = undefined;
      return;
    }
  }
  s.team = teamOn(laidBehind(way, near ? near.next : way.length - 1, at), at.x, at.z);
  const dx = at.x - s.team.fx, dz = at.z - s.team.fz;
  if (turn && (dx !== 0 || dz !== 0)) s.yaw = Math.atan2(-dx, -dz);
}

// the merchant's "cart": a yoked two-horse team hauling a shared tow-bar with
// a chest slung between them (oc6095b3) — same source model, normalized to
// the same height as a rideable horse (see MountedHorse.tsx) so the pair reads
// at true horse scale. It used to be parented under the merchant's own group,
// 1.9 m to one side of him and turned with him, sweeping over whatever he
// passed close by on that side (ROADMAP.md, "the merchant's cart and team rode
// beside him"); it has a group of its own now, towed after him each frame
// (data/merchantTeam.ts's towTeam and teamPose), so RiggedProp stands it at
// that group's origin, unturned.
// Reported 2026-07-28: the team stood frozen mid-stride while walking. The
// rig lab DID chart a full four-leg walk cycle per horse (verified,
// part_roles.json) — it just never got wired to a renderer: PropModel only
// ever plays the static GLB path. RiggedProp already has a complete
// diagonal-trot animator (built for Wildlife.tsx's standalone horses); it
// just didn't recognise this asset's own per-horse leg names
// (horse_L_leg_FL_upper, …) until this same investigation added that case.
function Cart({ gaitSpeed }: { gaitSpeed: number }) {
  return <RiggedProp assetId="oc6095b3" height={1.7} gaitSpeed={gaitSpeed} />;
}

// for the live probes: the way of a walk through its stops, as his own planning finds it (the stops' indices in `at`)
exposeDebug('__kkmerchantWay', (stage: MerchantStage) => {
  const stops = WALK_STOPS[stage];
  return stops ? wayThrough(stops, planOf) : null;
});

export default function Merchant() {
  const group = useRef<THREE.Group>(null);
  // his cart and team's own group, set on his track behind him each frame
  const team = useRef<THREE.Group>(null);
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
  // `lastTime`: the clock as the last frame found it; `leg`: which of his walk's stops he makes for (WALK_STOPS);
  // `team`: where his team's hooves stand, towed after him (data/merchantTeam.ts; set down by layTeam before it is
  // first drawn); `wide`: his way is found wide enough for his team (nav/steering.ts); `beyond`: what is left of his
  // walk past the stop he makes for, in seconds at his own pace, and the plan of his it was reckoned with
  const state = useRef<MerchantState>({
    x: OFF_STAGE.x, z: OFF_STAGE.z, yaw: MERCHANT_SPOT.yaw, stage: 'away', hurry: 1, lastTime: worldEnv.time,
    leg: 1, team: { fx: OFF_STAGE.x, fz: OFF_STAGE.z, bx: OFF_STAGE.x, bz: OFF_STAGE.z }, wide: true,
    beyond: { pts: null, seconds: 0 },
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
  // ...and his team's group, whose frame is the team's own (its horses facing its +z), so that a probe can lay its
  // outline down where it is drawn
  exposeDebug('__kkmerchantTeam', team);

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
    // and a knock-out while he trades leaves him on his spot. His team is set down behind him (layTeam) — as if he had
    // walked his way there, or, left off it, as he will walk on — whenever that is not where it stands: out of hiding,
    // when he is put somewhere, and when the clock moved on into another stage — his walk can turn back on itself then
    // (a sleep early on his walk out finds him on his walk in).
    const jumped = moved > dt + 1;
    if (stage !== s.stage || jumped) {
      const outOfHiding = s.stage === 'away';
      const put = keepToSchedule(s, stage, outOfHiding);
      if (outOfHiding || put || (stage !== s.stage && jumped)) layTeam(s, stage, !put);
      s.stage = stage;
    }

    const t = team.current;
    if (stage === 'away') {
      g.visible = false;
      if (t) t.visible = false;
      return;
    }
    g.visible = true;

    if (stage === 'present') {
      // pinned exactly on MERCHANT_SPOT — this is the contract
      // PlayerController/Minimap rely on (see the note above)
      s.x = MERCHANT_SPOT.x;
      s.z = MERCHANT_SPOT.z;
      s.yaw = MERCHANT_SPOT.yaw;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      if (gaitSpeed !== 0) setGaitSpeed(0);
    } else if (stage === 'village_am' || stage === 'village_pm') {
      // Wave 53 (E4) · a real "passing through the village" beat — pinned
      // exactly on VILLAGE_STOP, same restpose/gaitSpeed-0 treatment as
      // `present` above, just without overriding yaw: he keeps facing
      // whichever way the walk that got him here already turned him
      // (west on the way out, east on the way back), rather than snapping
      // to a second authored facing the way MERCHANT_SPOT's own yaw does.
      s.x = VILLAGE_STOP.x;
      s.z = VILLAGE_STOP.z;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      if (gaitSpeed !== 0) setGaitSpeed(0);
    } else {
      // to_village_am / arriving / leaving / to_offstage: walk toward the
      // stop this walk makes for — past a point it turns him at once within
      // TURN_REACH of it, then the next (WALK_STOPS)
      const stops = WALK_STOPS[stage]!;
      while (s.leg < stops.length - 1 && Math.hypot(stops[s.leg].x - s.x, stops[s.leg].z - s.z) <= TURN_REACH) {
        s.leg++;
        s.nav = undefined; // a fresh plan, to the next
      }
      const end = stops[s.leg];
      const last = s.leg === stops.length - 1;
      const { nx, nz, dist } = navSteer(s, end.x, end.z, dt);
      if (!last || dist > WALK_STOP) {
        // Wave 34 (G6.6) · the merchant's whole walk is along the printed
        // road by design (his timing is tuned against the roadEntry() ->
        // MERCHANT_SPOT distance), so this is a real target for the road
        // speed perk, not just a mechanical extension — flagged for a live
        // check against that tuned arrival timing.
        const pace = paceAt(s.x, s.z);
        // ...and he keeps time: his walk's window is a fraction of the day, whose length the player sets, so when what
        // is left of the walk — to the stop he makes for, and on through the rest — would not fit what is left of the
        // window he steps out faster (data/merchantDay.ts)
        const win = walkWindow(stage)!;
        // (the stretches beyond the stop he makes for, from one fixed stop to the next, reckoned again with each fresh
        // plan of his — navSteer makes one every 1.1 to 1.9 s, and at each turn — rather than every frame)
        if (!last && s.beyond.pts !== s.nav?.pts) {
          s.beyond = { pts: s.nav?.pts, seconds: secondsLeftThrough(end.x, end.z, stops, s.leg + 1, planOf, paceAt) };
        }
        const ownSecondsLeft = secondsLeftAtPace(s.x, s.z, s.nav, end.x, end.z, paceAt, last ? WALK_STOP : TURN_REACH)
          + (last ? 0 : s.beyond.seconds);
        const speed = merchantSpeed(
          pace,
          ownSecondsLeft,
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
    }
    g.position.set(s.x, homeGroundY(s.x, s.z), s.z);
    // RiggedFigure convention (see Villagers.tsx) — missing once from the
    // present branch, it stood the merchant backwards (back to the player) the
    // entire time he's actually interactable, found investigating a reported
    // rig bug.
    g.rotation.y = s.yaw + Math.PI;

    // his cart and team: towed after him (data/merchantTeam.ts), on the ground where they stand
    towTeam(s.team, s.x, s.z);
    if (t) {
      const pose = teamPose(s.team);
      t.position.set(pose.x, homeGroundY(pose.x, pose.z), pose.z);
      t.rotation.y = pose.yaw;
      t.visible = true;
    }
  });

  return (
    <>
      <group ref={group}>
        <Suspense fallback={null}>
          <RiggedFigure config={MERCHANT_CONFIG} height={1.75} keepProps={MERCHANT_KEEP_PROPS} clip={clip} onReady={(r) => { rig.current = r; }} />
        </Suspense>
      </group>
      <group ref={team}>
        <Cart gaitSpeed={gaitSpeed} />
      </group>
    </>
  );
}
