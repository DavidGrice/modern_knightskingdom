'use client';
// Recruited villagers wander the homestead grounds. Assigned workers are
// cosmetic wanderers while the store ticks their production on a timer
// (see gameStore.tickVillagers) — this component just brings them to life.
import { useMemo, useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import RiggedFigure from '../character/RiggedFigure';
import { HeldHelmet, Chestplate } from '../character/Equipment';
import { hashId, villagerConfig } from '@/game/data/villagerLooks';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { BUILD_REGION } from '@/game/data/buildables';
import { JOB_BY_ID } from '@/game/data/villagers';
import { tripSpeedMult } from '@/game/data/attributes';
import { registerVillagerMob } from '@/game/villagerMobs';
import { navSteer } from '@/game/navgrid';
import { agentManager } from '@/ai/core/AgentManager';
import { stepLocomotion } from '@/ai/core/Locomotion';
import { isBuilt, isHomeBuilding } from '@/game/types';
import type { CharacterConfig, Villager } from '@/game/types';

const HOME_X = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
const HOME_Z = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;
const WANDER_RADIUS = 14;

// hashId now lives with the appearance data it seeds (data/villagerLooks.ts);
// re-exported here because Defenders.tsx and the roster panels already import
// it from this module for their own per-villager jitter
export { hashId };

function VillagerFigure({ villager }: { villager: Villager }) {
  const group = useRef<THREE.Group>(null);
  const [clip, setClip] = useState('anim_r_restpose');
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const h = hashId(villager.id);

  // derived-by-id look plus any player edits (data/villagerLooks.ts) — no
  // more single hardcoded face for the whole settlement
  const config: CharacterConfig = useMemo(
    () => villagerConfig(villager),
    [villager],
  );

  const homeAngle = (h % 360) * (Math.PI / 180);
  const home = useMemo(
    () => [
      HOME_X + Math.cos(homeAngle) * (6 + (h % 5)),
      HOME_Z + Math.sin(homeAngle) * (6 + (h % 5)),
    ] as [number, number],
    [h, homeAngle],
  );

  const state = useRef({
    x: home[0], z: home[1], tx: home[0], tz: home[1],
    yaw: homeAngle, pause: (h % 7),
  });
  const mob = useMemo(() => registerVillagerMob(villager.id, home[0], home[1]), [villager.id, home]);

  useFrame((_, dt) => {
    const s = state.current;
    const g = group.current;
    if (!g) return;

    // Phase 3, iteration 3.3 — an Agent with an active MOVE_TO/MOVE_TO_ANCHOR
    // Intent takes over movement entirely, checked FIRST before all seven
    // existing branches below. Per PHASE_3_4_5_ACTUATION_AND_REASONER.md
    // §3.0's verified splice point: this is a new branch inserted first, not
    // a source swap — Villagers.tsx has seven separate navSteer call sites,
    // one per behavioural branch, with no single point that "supplies the
    // target" to redirect. Nothing issues a real Intent yet (phase 5's
    // reasoner is the first real writer), so this is inert today — every
    // villager falls straight through to the existing cascade unchanged.
    const agent = agentManager.get(villager.id);
    const intent = agent?.intent;
    if (agent && intent && (intent.type === 'MOVE_TO' || intent.type === 'MOVE_TO_ANCHOR')) {
      // resync from wherever Agent-driven movement last left the villager —
      // the same drift guard the ARRIVING branch below already applies in
      // the other direction (mob -> s), so control can hand off cleanly
      // either way without a visible teleport
      if (Math.hypot(s.x - agent.position.x, s.z - agent.position.z) > 6) {
        s.x = agent.position.x;
        s.z = agent.position.z;
      }
      stepLocomotion(agent, dt);
      s.x = agent.position.x;
      s.z = agent.position.z;
      s.yaw = agent.yaw;
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.yaw + Math.PI;
      mob.x = s.x;
      mob.z = s.z;
      const moving = agent.bb.movement.status === 'moving';
      const wantClip = moving ? (intent.speed === 'run' ? 'anim_c_run' : 'anim_c_walk') : 'anim_r_restpose';
      if (clip !== wantClip) setClip(wantClip);
      return;
    }

    // ARRIVING: a newcomer walks the road in rather than appearing on the
    // doorstep. They come up it under their own steam — navSteer takes them
    // round anything in the way — and only join the ordinary routine once
    // they have actually reached the holding. Nothing else runs until then,
    // because someone still on the road has no worksite and no bed to seek.
    if (mob.arriving) {
      // seed the walk state from wherever the arrival put them
      if (Math.hypot(s.x - mob.x, s.z - mob.z) > 6) { s.x = mob.x; s.z = mob.z; }
      const { nx, nz, dist: d } = navSteer(s, home[0], home[1], dt);
      if (d < 1.2) {
        mob.arriving = false;
      } else {
        const speed = 1.25;
        s.x += nx * speed * dt;
        s.z += nz * speed * dt;
        const desired = Math.atan2(-nx, -nz);
        let diff = desired - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * Math.min(1, dt * 3);
        if (clip !== 'anim_c_walk') setClip('anim_c_walk');
      }
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.yaw + Math.PI;
      mob.x = s.x;
      mob.z = s.z;
      return;
    }

    // a raid in progress sends everyone scurrying home instead of obliviously
    // wandering the danger zone — even this minimal reaction sells the stakes
    // of an undefended homestead
    if (useEnemyStore.getState().enemies.some((e) => e.raid)) {
      const { nx, nz, dist: d } = navSteer(s, HOME_X, HOME_Z, dt);
      if (d < 0.6) {
        if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      } else {
        const speed = 1.6; // fleeing, faster than the normal wander pace
        s.x += nx * speed * dt;
        s.z += nz * speed * dt;
        const desired = Math.atan2(-nx, -nz);
        let diff = desired - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * Math.min(1, dt * 3);
        if (clip !== 'anim_c_run') setClip('anim_c_run');
      }
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.yaw + Math.PI;
      mob.x = s.x;
      mob.z = s.z;
      return;
    }

    // day/night schedule (Phase 15, reworked Phase 22): at night each
    // villager claims their OWN finished bed — one sleeper per bed by stable
    // rank, never "everyone seeks the bed nearest home", which piled the
    // whole village onto a single mattress. Anyone without a bed of their
    // own (including before any beds are built at all) turns in at their
    // home spot instead of joining the pile.
    if (worldEnv.night > 0.6) {
      const st = useGameStore.getState();
      // homestead sleepers only ever claim a HOME bed — a bed built on a
      // remote claimed plot belongs to that outpost, not the village roster
      const beds = st.buildings.filter((b) => b.type === 'bed' && isBuilt(b) && isHomeBuilding(b));
      const sleepers = st.villagers.filter((v) => v.job !== 'defender');
      const rank = sleepers.findIndex((v) => v.id === villager.id);
      const bed = rank >= 0 && rank < beds.length ? beds[rank] : null;
      const bx = bed ? bed.x : home[0];
      const bz = bed ? bed.z : home[1];
      const { nx, nz, dist: d } = navSteer(s, bx, bz, dt);
      if (d < 0.6) {
        if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
      } else {
        const speed = 0.85;
        s.x += nx * speed * dt;
        s.z += nz * speed * dt;
        const desired = Math.atan2(-nx, -nz);
        let diff = desired - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * Math.min(1, dt * 3);
        if (clip !== 'anim_c_walk') setClip('anim_c_walk');
      }
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.yaw + Math.PI;
      mob.x = s.x;
      mob.z = s.z;
      return;
    }

    // Phase 24B — real labor: production villagers physically walk out to
    // their worksite, work it, and haul the goods home. The trip timer
    // (tickVillagers) stays the economic source of truth; this is the
    // synchronized in-world performance, phased off the same
    // villagerProgress fraction: first ~70% out at the worksite, last ~30%
    // hauling back to the Stockpile (or homestead center without one).
    if (villager.job === 'lumberjack' || villager.job === 'miner' || villager.job === 'farmer' || villager.job === 'merchant') {
      const st = useGameStore.getState();
      const jobDef = JOB_BY_ID[villager.job];
      const trip = jobDef.tripSeconds * tripSpeedMult(villager);
      const leftS = st.villagerProgress[villager.id] ?? trip;
      const frac = 1 - leftS / Math.max(1, trip);
      // the trade's worksite
      let wx: number | null = null;
      let wz: number | null = null;
      if (villager.job === 'lumberjack' || villager.job === 'miner') {
        const want = villager.job === 'lumberjack' ? 'tree' : 'rock';
        let best = Infinity;
        for (const n of st.nodes) {
          if (n.kind !== want || n.respawnAt) continue;
          const d = Math.hypot(n.x - home[0], n.z - home[1]);
          if (d < best) { best = d; wx = n.x; wz = n.z; }
        }
      } else if (villager.job === 'farmer') {
        // a bare .find() grabs array order, not distance — without the home
        // filter, a farmplot built earlier at a remote claimed plot would
        // silently become this farmer's worksite, sending them off toward
        // another realm's coordinates
        const plot = st.buildings.find((b) => b.type === 'farmplot' && isBuilt(b) && isHomeBuilding(b));
        if (plot) { wx = plot.x; wz = plot.z; }
      } else {
        const stall = st.buildings.find((b) => b.type === 'market_stall' && isBuilt(b) && isHomeBuilding(b));
        if (stall) { wx = stall.x; wz = stall.z; }
      }
      if (wx !== null && wz !== null) {
        const store = st.buildings.find((b) => b.type === 'stockpile' && isBuilt(b) && isHomeBuilding(b));
        const hx = store ? store.x : HOME_X;
        const hz = store ? store.z : HOME_Z;
        // merchants tend the stall the whole trip; laborers split out/back
        const hauling = villager.job !== 'merchant' && frac >= 0.7;
        const tx = hauling ? hx : wx;
        const tz = hauling ? hz : wz;
        const { nx, nz, dist: d } = navSteer(s, tx, tz, dt);
        if (d < 1.7) {
          const desired = Math.atan2(-nx, -nz);
          let diff = desired - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * Math.min(1, dt * 3);
          // swing at the worksite, set the load down at the stockpile
          const wanted = hauling ? 'anim_r_restpose' : 'anim_g_swordswish';
          if (clip !== wanted) setClip(wanted);
        } else {
          const speed = hauling ? 0.95 : 1.1; // a full sack slows the stride
          s.x += nx * speed * dt;
          s.z += nz * speed * dt;
          const desired = Math.atan2(-nx, -nz);
          let diff = desired - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * Math.min(1, dt * 3);
          if (clip !== 'anim_c_walk') setClip('anim_c_walk');
        }
        g.position.set(s.x, 0, s.z);
        g.rotation.y = s.yaw + Math.PI;
        mob.x = s.x;
        mob.z = s.z;
        return;
      }
      // no worksite found (all trees felled, no plot/stall) → wander below
    }

    // builders head for the oldest construction site and hammer away — the
    // actual progress lands in tickVillagers' builder pass; this is just the
    // matching in-world performance (same seek-and-act shape as the raid
    // flee and night bed-seek branches above)
    if (villager.job === 'builder') {
      const site = useGameStore.getState().buildings.find((b) => !isBuilt(b));
      if (site) {
        const { nx, nz, dist: d } = navSteer(s, site.x, site.z, dt);
        if (d < 1.8) {
          const desired = Math.atan2(-nx, -nz);
          let diff = desired - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * Math.min(1, dt * 3);
          if (clip !== 'anim_g_swordswish') setClip('anim_g_swordswish');
        } else {
          const speed = 1.1;
          s.x += nx * speed * dt;
          s.z += nz * speed * dt;
          const desired = Math.atan2(-nx, -nz);
          let diff = desired - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * Math.min(1, dt * 3);
          if (clip !== 'anim_c_walk') setClip('anim_c_walk');
        }
        g.position.set(s.x, 0, s.z);
        g.rotation.y = s.yaw + Math.PI;
        mob.x = s.x;
        mob.z = s.z;
        return;
      }
    }

    // daily rituals (AI wave 2): unassigned villagers browse the market
    // stall at midday and gather round the campfire in the evening — small
    // routines that make the homestead read alive between jobs. Each takes
    // their own spot in a loose ring, offset by their id hash.
    if (villager.job === 'idle') {
      const t = worldEnv.time;
      const st = useGameStore.getState();
      let rx: number | null = null;
      let rz: number | null = null;
      if (t > 0.44 && t < 0.56) {
        const stall = st.buildings.find((b) => b.type === 'market_stall' && isBuilt(b) && isHomeBuilding(b));
        if (stall) { rx = stall.x; rz = stall.z; }
      } else if (t > 0.72 && t < 0.9) {
        const fire = st.buildings.find((b) => b.type === 'campfire' && isBuilt(b) && isHomeBuilding(b));
        if (fire) { rx = fire.x; rz = fire.z; }
      }
      if (rx !== null && rz !== null) {
        const tx = rx + Math.cos(homeAngle) * 1.8;
        const tz = rz + Math.sin(homeAngle) * 1.8;
        const { nx, nz, dist: d } = navSteer(s, tx, tz, dt);
        if (d < 0.5) {
          // face the gathering point and settle in
          const desired = Math.atan2(-(rx - s.x), -(rz - s.z));
          let diff = desired - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * Math.min(1, dt * 2);
          if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
        } else {
          const speed = 0.9;
          s.x += nx * speed * dt;
          s.z += nz * speed * dt;
          const desired = Math.atan2(-nx, -nz);
          let diff = desired - s.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          s.yaw += diff * Math.min(1, dt * 3);
          if (clip !== 'anim_c_walk') setClip('anim_c_walk');
        }
        g.position.set(s.x, 0, s.z);
        g.rotation.y = s.yaw + Math.PI;
        mob.x = s.x;
        mob.z = s.z;
        return;
      }
    }

    if (s.pause > 0) {
      s.pause -= dt;
      if (clip !== 'anim_r_restpose') setClip('anim_r_restpose');
    } else {
      const { nx, nz, dist: d } = navSteer(s, s.tx, s.tz, dt);
      if (d < 0.4) {
        s.pause = 5 + Math.random() * 9;
        const a = Math.random() * Math.PI * 2;
        const r = 2 + Math.random() * (WANDER_RADIUS - 2);
        s.tx = THREE.MathUtils.clamp(home[0] + Math.cos(a) * r, BUILD_REGION.minX + 2, BUILD_REGION.maxX - 2);
        s.tz = THREE.MathUtils.clamp(home[1] + Math.sin(a) * r, BUILD_REGION.minZ + 2, BUILD_REGION.maxZ - 2);
      } else {
        const speed = 0.85;
        s.x += nx * speed * dt;
        s.z += nz * speed * dt;
        // yaw -> facing is (-sin, -cos) by this codebase's convention
        // (PlayerController/combat.ts), so recovering yaw from a movement
        // direction needs the negated atan2 — the un-negated version had
        // villagers walking backwards the same way Enemies.tsx's mobs did.
        const desired = Math.atan2(-nx, -nz);
        let diff = desired - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * Math.min(1, dt * 3);
        if (clip !== 'anim_c_walk') setClip('anim_c_walk');
      }
    }
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.yaw + Math.PI;
    mob.x = s.x;
    mob.z = s.z;
  });

  return (
    <group ref={group}>
      <RiggedFigure config={config} height={1.7} clip={clip} timeScale={0.9} onReady={setRig} />
      {rig && villager.gear?.helmet && createPortal(<HeldHelmet />, rig.joints.head)}
      {rig && villager.gear?.chestplate && createPortal(<Chestplate />, rig.joints.body)}
    </group>
  );
}

export default function Villagers() {
  // defender-job villagers are rendered/driven by Defenders.tsx instead —
  // they have their own combat AI, not the generic wander/flee/bed-seek loop
  const villagers = useGameStore((s) => s.villagers).filter((v) => v.job !== 'defender');
  return (
    <>
      {villagers.map((v) => <VillagerFigure key={v.id} villager={v} />)}
    </>
  );
}
