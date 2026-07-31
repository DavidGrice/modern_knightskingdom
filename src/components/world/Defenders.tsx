'use client';
// Homestead defense patrols (Phase 19): recruited villagers assigned the
// 'defender' job actively fight raiders instead of fleeing home like every
// other villager. Rendered/driven entirely separately from Villagers.tsx
// (which explicitly filters defenders out) since their behavior is a real
// combat AI, not a wander/flee/bed-seek loop.
import { Suspense, useMemo, useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore, lootFor, KIND_LABEL, type EnemyData } from '@/game/combat';
import { registerDefender, defenderOrders, scoutReported } from '@/game/defenders';
import { attrsOf } from '@/game/data/attributes';
import { hasTrait } from '@/game/data/companionTraits';
import { playerState } from '../fps/PlayerController';
import RiggedFigure from '../character/RiggedFigure';
import { HeldSword, ArmShield, HeldHalberd, HeldCrossbow, HeldHelmet, Chestplate } from '../character/Equipment';
import { villagerConfig } from '@/game/data/villagerLooks';
import { isWatchHours } from '@/game/data/villagers';
import { worldEnv } from '@/game/env';
import { dragonAir } from './DragonOmen';
import { horses, mountOf } from '@/game/riding';
import RiggedProp from './RiggedProp';
import { BUILD_REGION, heightOf } from '@/game/data/buildables';
import { KEEP_PART_BY_ID, SOCKET_BY_ID } from '@/game/data/keep';
import { hashId } from './Villagers';
import { isBuilt, isHomeBuilding } from '@/game/types';
import type { RiggedMinifig } from '@/lib/minifigRig';
import type { CharacterConfig, Villager } from '@/game/types';

/** how far an archer can reach a circling dragon — generous, because the
 *  beast is large and the shot is a volley rather than a marksman's */
const AIR_RANGE = 34;
/** how high the saddle sits — the rider is lifted by this when mounted */
const SADDLE_Y = 1.15;
const HOME_X = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
const HOME_Z = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;
const ENGAGE_RADIUS = 22; // how far from themselves a patrolling defender spots a hostile
const SCOUT_EYES = 30;    // scout order: base sighting range (Wit adds to it)
const MELEE_RANGE = 1.8;
const BOW_RANGE = 16;
const RECOVER_MS = 45000; // real time knocked out before returning to the fight

function DefenderFigure({ villager }: { villager: Villager }) {
  const buildings = useGameStore((s) => s.buildings);
  const keep = useGameStore((s) => s.keep);
  const enemies = useEnemyStore((s) => s.enemies);
  const gainDefenderXp = useGameStore((s) => s.gainDefenderXp);
  const recordKill = useGameStore((s) => s.recordKill);
  const addItems = useGameStore((s) => s.addItems);
  const notify = useGameStore((s) => s.notify);

  const h = hashId(villager.id);
  // bare-handed by default (2026-07-20 Armory rework) — a defender only
  // fights properly once the player has spent real Armory stock arming
  // them (see setDefenderLoadout); `undefined` means fists only, no weapon
  // portal rendered below, at the weaker "unarmed" damage tier
  const loadout = villager.loadout;
  const level = villager.level ?? 1;

  // shared derived-plus-override look, same as every other homestead figure
  const config: CharacterConfig = useMemo(() => villagerConfig(villager), [villager]);

  // J51 (rest) · a keep-wall station is stored as `stationId = "keep:<socketId>"`
  // rather than a building id, since KeepPart pieces live in `st.keep`, not
  // `st.buildings` — reads `KeepPart.walkway` (keep.ts) the same way a tower
  // station already reads `heightOf('tower')` below.
  const keepSocketId = villager.stationId?.startsWith('keep:') ? villager.stationId.slice(5) : null;
  const keepSocket = keepSocketId ? SOCKET_BY_ID[keepSocketId] : null;
  const keepPart = keep && keepSocketId ? KEEP_PART_BY_ID[keep.parts[keepSocketId] ?? ''] : null;
  // an unraised or unfinished piece is just a marker course — no walkway to stand on
  const keepBuilt = !!(keep && keepSocketId && (keep.built[keepSocketId] ?? 0) >= 1);

  const station = keepSocketId ? null
    : villager.stationId ? buildings.find((b) => b.id === villager.stationId) ?? null : null;
  // an unfinished tower is just a ghost outline — no battlement to stand on
  const elevated = keepSocket && keep
    ? keepBuilt && !!keepPart?.walkway
    : station?.type === 'tower' && !!station && isBuilt(station);
  const postX = keepSocket && keep ? keep.x + keepSocket.x : station ? station.x : HOME_X + Math.cos(h) * 5;
  const postZ = keepSocket && keep ? keep.z + keepSocket.z : station ? station.z : HOME_Z + Math.sin(h) * 5;
  const postY = keepSocket && keep
    ? (elevated ? keepPart!.walkway! : 0)
    : elevated ? (station!.y ?? 0) + heightOf('tower') : 0;

  const ds = useMemo(() => registerDefender(villager.id, postX, postY, postZ), [villager.id]); // eslint-disable-line react-hooks/exhaustive-deps
  ds.postX = postX; ds.postY = postY; ds.postZ = postZ; ds.elevated = elevated;
  // Shieldwall companion trait: +8 max health; worn armor adds its own
  // smaller bonus on top (chestplate guards the body, helmet the head)
  ds.maxHp = 18 + level * 6 + (hasTrait(villager, 'def_shieldwall') ? 8 : 0)
    + (villager.gear?.chestplate ? 6 : 0) + (villager.gear?.helmet ? 3 : 0);
  if (ds.hp <= 1) ds.hp = ds.maxHp; // first mount

  const group = useRef<THREE.Group>(null);
  const [clip, setClip] = useState('anim_r_restpose');
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const yaw = useRef(0);
  // patrol phase seeded from the id so multiple defenders spread around the
  // circuit instead of marching in a stack
  const patrolA = useRef((h % 628) / 100);
  // K54 · how fast this defender is actually travelling, fed to the mount's
  // walk cycle. Measured from displacement rather than read off any one
  // behaviour branch, because patrol, charge, scout and retreat each move
  // them by their own rules and all of them should make the horse walk.
  const [ridePace, setRidePace] = useState(0);
  const pace = useRef({ x: 0, z: 0, v: -1 });

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const now = Date.now();

    const pc = pace.current;
    const moved = Math.hypot(ds.x - pc.x, ds.z - pc.z) / Math.max(dt, 1 / 240);
    pc.x = ds.x; pc.z = ds.z;
    const want = moved > 0.4 ? Math.min(moved, 4.2) : 0;
    if (Math.abs(want - pc.v) > 0.55) { pc.v = want; setRidePace(want); }

    if (ds.state === 'downed') {
      if (now >= ds.downedUntil) { ds.state = 'ok'; ds.hp = ds.maxHp; }
      else { g.visible = false; return; }
    }
    g.visible = true;

    ds.attackCd = Math.max(0, ds.attackCd - dt);
    ds.hurtCd = Math.max(0, ds.hurtCd - dt);

    // Phase 24C: the captain's standing order shapes everything below. A
    // player off in another realm gets patrol behavior regardless — the
    // defenders answer to the homestead, not a distant summons.
    const order = useGameStore.getState().destination ? 'patrol' : defenderOrders.order;

    // target selection by order: Attack converges on the threat nearest the
    // PLAYER from any distance; Follow watches the player's back; Scout sees
    // wider; Patrol spots hostiles from wherever the circuit has them (24C/22)
    let target: EnemyData | null = null;
    if (order === 'attack') {
      let bestD = Infinity;
      for (const e of enemies) {
        if (e.mob.state === 'dying') continue;
        const d = Math.hypot(e.mob.x - playerState.x, e.mob.z - playerState.z);
        if (d < bestD) { bestD = d; target = e; }
      }
    } else {
      const cx = order === 'follow' ? playerState.x : ds.x;
      const cz = order === 'follow' ? playerState.z : ds.z;
      let bestD = order === 'scout' ? SCOUT_EYES : ENGAGE_RADIUS;
      for (const e of enemies) {
        if (e.mob.state === 'dying') continue;
        const d = Math.hypot(e.mob.x - cx, e.mob.z - cz);
        if (d < bestD) { bestD = d; target = e; }
      }
    }

    // a scout calls out every hostile they lay eyes on, once each — Wit
    // (Phase 24A) sharpens how far those eyes reach
    if (order === 'scout') {
      const eyes = SCOUT_EYES + attrsOf(villager.id).wit;
      for (const e of enemies) {
        if (e.mob.state === 'dying' || scoutReported.has(e.id)) continue;
        if (Math.hypot(e.mob.x - ds.x, e.mob.z - ds.z) < eyes) {
          scoutReported.add(e.id);
          notify(`👁️ ${villager.name} sights a ${KIND_LABEL[e.kind]}!`, true);
        }
      }
    }

    if (!target) {
      // OFF WATCH (2026-07-20): defenders keep the opposite shift to the
      // working folk — the watch stands at night, when skeletons rise and
      // raiders come, and stands down by day. Only applies with nothing to
      // fight AND no IMMEDIATE order.
      //
      // G28 · `scout` used to be lumped in with attack/follow as "an explicit
      // order, obeyed at any hour", which meant a scouting defender never
      // stood down and simply never slept. But scout is a STANDING sweep, the
      // same kind of open-ended duty as patrol — it is attack and follow that
      // are immediate commands worth breaking the watch for. Scout now keeps
      // the shift.
      //
      // The target check above already ran, so a daylight threat still gets
      // answered either way. Each defender claims their own bed — a real
      // persisted ownership (`gameStore.claimBed`, requested 2026-07-30 to
      // replace this and Villagers.tsx's `assignedSleepSpot` own independent
      // rank computations, which had no way to notice if they'd picked the
      // same bed) — sharing the SAME claim pool day-sleepers use, so the two
      // shifts can no longer double-book a mattress. Falls back to the
      // guard's own post, not a bed, when none is available to claim — a
      // defender's own resting spot, distinct from a plain villager's.
      // L67 · every standing order keeps the shift, not just patrol and
      // scout. `attack` with nothing left to attack used to fall through to
      // the circuit below, so a guard told to charge went on walking rounds
      // in broad daylight for the rest of the day. `follow` is the one
      // exception: escorting the player is a thing the player can see and
      // called for directly.
      if (!isWatchHours(worldEnv.time) && order !== 'follow') {
        const st = useGameStore.getState();
        const hasClaimableBed = st.buildings.some((b) => b.type === 'bed' && isBuilt(b) && isHomeBuilding(b)
          && (b.owner === villager.id || !b.owner));
        const rest = hasClaimableBed ? st.claimBed(villager.id) : { x: ds.postX, z: ds.postZ };
        const rx = rest.x;
        const rz = rest.z;
        const dxR = rx - ds.x;
        const dzR = rz - ds.z;
        const dR = Math.hypot(dxR, dzR);
        if (dR > 0.7) {
          const step = Math.min(dR, 1.5 * dt);
          ds.x += (dxR / dR) * step;
          ds.z += (dzR / dR) * step;
          const desired = Math.atan2(-dxR, -dzR);
          let diff = desired - yaw.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          yaw.current += diff * Math.min(1, dt * 3);
          if (clip !== 'anim_c_walk') setClip('anim_c_walk');
        } else if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
        g.position.set(ds.x, hasClaimableBed ? 0 : ds.postY, ds.z);
        g.rotation.y = yaw.current + Math.PI;
        return;
      }
      if (order === 'follow') {
        // form up behind the player, spread by each defender's own hash
        const fx = playerState.x + Math.cos(h) * 2.6;
        const fz = playerState.z + Math.sin(h) * 2.6;
        const dxF = fx - ds.x;
        const dzF = fz - ds.z;
        const dF = Math.hypot(dxF, dzF);
        if (dF > 1.2) {
          const step = Math.min(dF, 3.4 * dt); // hustle to keep pace
          ds.x += (dxF / dF) * step;
          ds.z += (dzF / dF) * step;
          const desired = Math.atan2(-dxF, -dzF);
          let diff = desired - yaw.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          yaw.current += diff * Math.min(1, dt * 4);
          if (clip !== 'anim_c_run') setClip('anim_c_run');
        } else if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
        g.position.set(ds.x, 0, ds.z);
        g.rotation.y = yaw.current + Math.PI;
        return;
      }
      if (elevated && order !== 'scout') {
        // tower watch: hold the battlement — being out of ground reach IS
        // the point of stationing up top, so no ground circuit
        ds.x += (ds.postX - ds.x) * Math.min(1, dt * 1.5);
        ds.z += (ds.postZ - ds.z) * Math.min(1, dt * 1.5);
        if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
        g.position.set(ds.x, ds.postY, ds.z);
        g.rotation.y = yaw.current + Math.PI;
        return;
      }
      // active circuit (Phase 22): steady rounds — wide sweeps free-roaming,
      // tight loops when stationed; Scout doubles the sweep at a jog
      const radius = order === 'scout' ? 30 : station ? 6 : 15;
      const pace = order === 'scout' ? 2.1 : 1.3;
      patrolA.current += (pace / radius) * dt;
      const txP = ds.postX + Math.cos(patrolA.current) * radius;
      const tzP = ds.postZ + Math.sin(patrolA.current) * radius;
      const dxP = txP - ds.x;
      const dzP = tzP - ds.z;
      const dP = Math.hypot(dxP, dzP) || 1;
      const step = Math.min(dP, (pace + 0.3) * dt);
      ds.x += (dxP / dP) * step;
      ds.z += (dzP / dP) * step;
      const desired = Math.atan2(-dxP, -dzP);
      let diff = desired - yaw.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw.current += diff * Math.min(1, dt * 3);
      const wantClip = order === 'scout' ? 'anim_c_run' : 'anim_c_walk';
      if (clip !== wantClip) setClip(wantClip);
      g.position.set(ds.x, order === 'scout' ? 0 : ds.postY, ds.z);
      g.rotation.y = yaw.current + Math.PI;
      return;
    }

    // G26 · an archer looks UP. A dragon circling the homestead used to be
    // ignored outright because nothing on the ground had an air branch — the
    // beast burned the place down while armed defenders stood underneath it.
    // Bows only: a halberd is no answer to something at fifteen metres.
    if (loadout === 'bow' && dragonAir.hostile && dragonAir.hit) {
      const dxD = dragonAir.x - ds.x;
      const dzD = dragonAir.z - ds.z;
      const slant = Math.hypot(dxD, dzD, dragonAir.y - ds.postY);
      if (slant <= AIR_RANGE) {
        const desired = Math.atan2(-dxD, -dzD);
        let diff = desired - yaw.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        yaw.current += diff * Math.min(1, dt * 4);
        if (clip !== 'anim_g_swordswish') setClip('anim_g_swordswish');
        if (ds.attackCd <= 0) {
          // slower than a ground shot: it is a hard, high, moving target
          ds.attackCd = 2.6;
          dragonAir.hit(`${villager.name}'s arrow`);
        }
        g.position.set(ds.x, ds.postY, ds.z);
        g.rotation.y = yaw.current + Math.PI;
        return;
      }
    }

    // Longshot companion trait: +6 bow range
    const range = loadout === 'bow' ? BOW_RANGE + (hasTrait(villager, 'def_longshot') ? 6 : 0) : MELEE_RANGE;
    const dxT = target.mob.x - ds.x;
    const dzT = target.mob.z - ds.z;
    const dT = Math.hypot(dxT, dzT) || 1;
    const inRange = dT <= range;

    if (!inRange && loadout !== 'bow') {
      // G27 · a defender with a stabled horse assigned rides it, which is
      // what makes catching one worth the trouble: mounted patrols cover the
      // ground far faster and reach a raid before it reaches the walls
      const mounted = !!mountOf(villager.id);
      const speed = (order === 'attack' ? 3.0 : 2.3) * (mounted ? 1.9 : 1);
      ds.x += (dxT / dT) * speed * dt;
      ds.z += (dzT / dT) * speed * dt;
      const desired = Math.atan2(-dxT, -dzT);
      let diff = desired - yaw.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw.current += diff * Math.min(1, dt * 3);
      if (clip !== 'anim_c_run') setClip('anim_c_run');
    } else {
      const desired = Math.atan2(-dxT, -dzT);
      let diff = desired - yaw.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw.current += diff * Math.min(1, dt * 4);
      if (clip !== 'anim_g_swordswish') setClip('anim_g_swordswish');
      if (ds.attackCd <= 0) {
        ds.attackCd = loadout === 'bow' ? 1.6 : 1.1;
        // Courage (Phase 24A) weights the swing; Riposte trait adds steel;
        // a bare-fisted defender (no Armory weapon spent on them yet) hits
        // noticeably softer than one armed with sword/halberd — real reason
        // to spend that stock rather than leaving the roster unarmed
        const meleeBase = loadout ? 3 : 1;
        const dmg = (loadout === 'bow' ? 2 : meleeBase) + level + Math.floor((attrsOf(villager.id).courage - 5) / 3)
          + (hasTrait(villager, 'def_riposte') ? 1 : 0);
        target.hp -= dmg;
        if (target.hp <= 0 && target.mob.state !== 'dying') {
          target.mob.state = 'dying';
          target.mob.dieT = 0;
          recordKill(target.kind);
          gainDefenderXp(villager.id, 15);
          addItems(lootFor(target), 'grant');
          notify(`${villager.name} defeats a raider!`, true);
        }
      }
    }

    // (AI wave 2) enemies now genuinely target and strike defenders from
    // their own AI (Enemies.tsx) — the old passive "retaliation tax" that
    // approximated being hit back is gone; tower elevation still protects,
    // because ground enemies skip elevated defenders entirely

    g.position.set(ds.x, ds.postY, ds.z);
    g.rotation.y = yaw.current + Math.PI;
  });

  // K54 · G27 gave a mounted defender the speed and the assignment but never
  // the horse — they simply moved faster with nothing under them. The mount
  // is rendered here, and the rider lifted onto its back.
  const mountId = mountOf(villager.id);
  const mountUrl = mountId ? horses[mountId]?.url : null;
  const mountAsset = mountUrl ? mountUrl.split('/').pop()!.replace(/\.glb$/i, '') : null;

  return (
    <group ref={group}>
      {mountAsset && (
        <Suspense fallback={null}>
          {/* the horse's own walk cycle runs off the rider's pace */}
          <RiggedProp assetId={mountAsset} height={1.7} gaitSpeed={ridePace} />
        </Suspense>
      )}
      <group position-y={mountAsset ? SADDLE_Y : 0}>
      <RiggedFigure config={config} height={1.7} clip={clip} timeScale={clip === 'anim_g_swordswish' ? 1.6 : 1} onReady={setRig} onClipEnd={() => setClip('anim_r_restpose')} />
      {rig && loadout === 'sword_shield' && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
      {rig && loadout === 'sword_shield' && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
      {rig && loadout === 'halberd' && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
      {rig && loadout === 'bow' && createPortal(<HeldCrossbow side={-1} />, rig.joints.rightarm)}
      {rig && villager.gear?.helmet && createPortal(<HeldHelmet />, rig.joints.head)}
      {rig && villager.gear?.chestplate && createPortal(<Chestplate />, rig.joints.body)}
      </group>
    </group>
  );
}

export default function Defenders() {
  const villagers = useGameStore((s) => s.villagers).filter((v) => v.job === 'defender');
  return (
    <>
      {villagers.map((v) => <DefenderFigure key={v.id} villager={v} />)}
    </>
  );
}
