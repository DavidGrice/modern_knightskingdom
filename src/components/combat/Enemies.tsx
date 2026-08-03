'use client';
// Enemy spawning + AI + rendering. Skeletons rise at night and crumble at
// dawn; bandit raiding parties hit the homestead at dusk once it's worth
// raiding. Defeated minifigs pop apart into their parts, LEGO-style.
import { useEffect, useRef, useState } from 'react';
import { createPortal, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ArmShield, HeldCrossbow, HeldHalberd, HeldSword } from '../character/Equipment';
import { useEnemyStore, damagePlayer, resolveDuel, combatState, ATTACK_DMG, ATTACK_CD, type EnemyData } from '@/game/combat';
import type { SoundName } from '@/lib/audio';
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { playerState } from '../fps/PlayerController';
import RiggedFigure from '../character/RiggedFigure';
import { measureHitBoxes } from '@/lib/minifigRig';
import { registerHitbox, unregisterHitbox } from '@/game/hitbox';
import { findPath, rebuildNav } from '@/game/navgrid';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import HealthBillboard from './HealthBillboard';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { isHomeBuilding } from '@/game/types';
import type { CharacterConfig, ItemId } from '@/game/types';
import { ITEMS } from '@/game/data/items';
import { CEDRIC_CAMP, CEDRIC_REVEAL_QUEST, CEDRIC_WORLD, POND, WORLD_HALF } from '@/game/data/world';
import { sizeFor } from '@/game/data/buildables';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { roadEntry } from '@/game/data/road';
import { raiderRamState, resetRaiderRam } from '@/game/raiderRam';
import { defenderState } from '@/game/defenders';
import { dungeonState } from '@/game/dungeon';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import { destinationGroundY } from '../world/TemplateWorld';

const CONFIGS: Record<string, CharacterConfig> = {
  skeleton: {
    name: 'Skeleton', headDonor: 'minifigskeleton00', bodyDonor: 'minifigskeleton00',
    armColor: 150, handColor: 150, legColor: 150, hipColor: 150,
  },
  bandit: {
    name: 'Bandit', headDonor: 'minifigweezil00', bodyDonor: 'minifigweezil00',
    armColor: 38, handColor: 18, legColor: 38, hipColor: 24,
  },
  // Gilbert the Bad: the raid leader — his own donor carries the halberd
  // mold (see lib/weaponParts.ts), and he's stationed at Cedric's camp too.
  gilbert: {
    name: 'Gilbert the Bad', headDonor: 'minifiggilbertbad01', bodyDonor: 'minifiggilbertbad01',
    armColor: 38, handColor: 18, legColor: 38, hipColor: 24,
  },
  cedric: {
    name: 'Cedric the Bull', headDonor: 'minifigcedricbull00', bodyDonor: 'minifigcedricbull00',
    armColor: 34, handColor: 18, legColor: 38, hipColor: 34,
  },
  storm: {
    name: 'Princess Storm', headDonor: 'minifigprincessstorm00', bodyDonor: 'minifigprincessstorm00',
    armColor: 24, handColor: 18, legColor: 150, hipColor: 24,
  },
  // the crown's anonymous knights (Phase 19 alliance raids on a Cedric-sworn
  // player) — a Richard donor variant OTHER than 00 (the named NPC's own),
  // in King Leo's own royal blue/white/yellow, so the wave unmistakably
  // reads as "the King's men", not another bandit pack. Was '01' — found
  // investigating the Gilbert floating-hand report and checking every
  // CONFIGS donor's rig data fresh: '01' is a MOUNTED-COMBAT export (every
  // one of its part_roles.json entries is prefixed `rider_`/`horse_`,
  // meaning classifyByRigMap correctly refuses all of them as "not this
  // figure's own body" per its own mount-exclusion rule), so royal knights
  // silently fell back to the old spatial-guessing classifier the verified
  // rig maps exist specifically to replace — the exact failure mode behind
  // Gilbert's own bug, just from a donor mismatch instead of a kept prop.
  // '02' is a real standing-minifig rig (verified, no mount prefixes) and a
  // different face from Richard's own '00', so the "not Richard" intent
  // still holds.
  royal: {
    name: 'Royal Knight', headDonor: 'minifigrichardstrong02', bodyDonor: 'minifigrichardstrong02',
    armColor: 26, handColor: 18, legColor: 150, hipColor: 26,
  },
};

/** crossbow-armed bandits (`data.ranged`): hold at range and hit-scan
 *  instead of closing to melee, mirroring Defenders.tsx's own bow loadout
 *  (`target.hp -= dmg` applied directly at range-check time, no projectile) */
const RANGED_RANGE = 14;
const RANGED_ATTACK_CD = 1.8;
const RANGED_DMG = 1.2;
/** J51 follow-up: structural damage per hit against a keep piece — a
 *  different scale from ATTACK_DMG (tuned against the PLAYER's small HP
 *  pool), closer to what the player's own ram/cannon already deal it */
const RAID_SIEGE_DMG: Record<string, number> = { bandit: 9, gilbert: 12, cedric: 18, royal: 12 };
/** Cedric's Siege: he breaks and flees at ~20% of his unscaled 45 HP in
 *  every appearance except his own sanctioned final stand — a real fight
 *  first, then he bails, same shape as the bandit morale-break below */
const CEDRIC_FLEE_HP = 9;
/** a distinct voice bark on defeat, where the original bank has one (Deed-worthy antagonists only) */
const DEATH_BARK: Partial<Record<string, SoundName>> = {
  bandit: 'random_weezil', gilbert: 'random_gilbert', cedric: 'random_cedric',
};

function distToPlayer(x: number, z: number) {
  return Math.hypot(playerState.x - x, playerState.z - z);
}

function Enemy({ data }: { data: EnemyData }) {
  const group = useRef<THREE.Group>(null);
  const rigRef = useRef<RiggedMinifig | null>(null);
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const scatter = useRef<Map<string, THREE.Vector3> | null>(null);
  // this mob's current route: waypoints, which one we are heading for, when
  // to recompute, and where the target was when we last did
  const path = useRef({ pts: [] as { x: number; z: number }[], i: 0, t: 0, tx: 0, tz: 0 });
  const [clip, setClip] = useState('anim_c_walk');
  const remove = useEnemyStore((s) => s.remove);

  // drop this mob's hit volumes when it leaves the field, or a dead id keeps
  // soaking bolts fired through the empty space where it used to stand
  useEffect(() => () => unregisterHitbox(String(data.id)), [data.id]);
  const baseSpeed =
    data.kind === 'skeleton' ? 2.1
      : data.kind === 'cedric' ? 2.3
      // armored and disciplined — a shade slower than a scrambling bandit
      : data.kind === 'royal' ? 2.4
      // Storm's approach speed climbs with reputation — escalating rematches
      // are about how hard she is to out-time, not extra hit points.
      : data.kind === 'storm' ? 2.6 + Math.min(1.2, (useGameStore.getState().reputation['storm'] ?? 0) * 0.01)
      : 2.7;
  // requested 2026-08-03: the active arena environment's own enemySpeedMult
  // (game/arena.ts) — read once at mount like baseSpeed itself, since the
  // environment is fixed for a whole arena run
  const speed = data.arena ? baseSpeed * ARENA_ENV_BY_ID[arenaState.env ?? 'earth'].enemySpeedMult : baseSpeed;

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGameStore.getState();
    const g = group.current;
    if (!g) return;
    const m = data.mob;
    if (st.paused) return;

    if (m.state === 'dying') {
      // LEGO pop-apart: fling the rig's joints outward, then despawn
      m.dieT += dt;
      const rig = rigRef.current;
      if (rig) {
        if (!scatter.current) {
          scatter.current = new Map();
          for (const [name, joint] of Object.entries(rig.joints)) {
            scatter.current.set(name, new THREE.Vector3(
              (Math.random() - 0.5) * 4,
              2.5 + Math.random() * 2.5,
              (Math.random() - 0.5) * 4,
            ));
            void joint;
          }
          // positional (Phase 23): a mob dying across the homestead is faint,
          // and one dying in another instance entirely is silent — defenders
          // now cull night skeletons while the player is away, which used to
          // rattle bones at full volume on whatever map the player stood on
          audio.playAt(data.kind === 'skeleton' ? 'skeleton' : 'brick_collide', m.x, m.z, 0.8);
          const bark = DEATH_BARK[data.kind];
          if (bark) audio.playAt(bark, m.x, m.z, 0.85);
        }
        for (const [name, joint] of Object.entries(rig.joints)) {
          const v = scatter.current.get(name)!;
          v.y -= 9 * dt;
          joint.position.addScaledVector(v, dt);
          joint.rotation.x += dt * 5;
          joint.rotation.z += dt * 4;
        }
      }
      if (m.dieT > 1.1) remove(data.id);
      return;
    }

    if (!st.buildMode) {
      const d = distToPlayer(m.x, m.z);
      // N79 (requested 2026-07-28): a raider spawned at the road's entry
      // point (the raid trigger below) walks in toward the homestead first,
      // routed via the same nav-grid pathing the ordinary chase branch uses
      // below, just aimed at HOME_X/HOME_Z instead of the player — until
      // close enough to the homestead, or the player is already near, at
      // which point approaching clears and the normal wander/chase/attack
      // FSM below takes over on the next frame. Mirrors the 'fleeing'
      // branch just below: sets its own position/rotation/clip and returns
      // early rather than falling through to the shared tail.
      if (m.approaching) {
        const homeD = Math.hypot(m.x - HOME_X, m.z - HOME_Z);
        if (d < 26 || homeD < 30) {
          m.approaching = false; // close enough — the FSM below takes over next frame
        } else {
          m.state = 'chase';
          path.current.t -= dt;
          if (path.current.t <= 0) {
            path.current.t = 0.7 + Math.random() * 0.4;
            path.current.pts = findPath(m.x, m.z, HOME_X, HOME_Z) ?? [];
            path.current.i = 0;
          }
          let aimX = HOME_X, aimZ = HOME_Z;
          const pts = path.current.pts;
          while (path.current.i < pts.length
            && Math.hypot(pts[path.current.i].x - m.x, pts[path.current.i].z - m.z) < 1.1) {
            path.current.i++;
          }
          if (path.current.i < pts.length) { aimX = pts[path.current.i].x; aimZ = pts[path.current.i].z; }
          const ad = Math.hypot(aimX - m.x, aimZ - m.z) || 1;
          const nx = (aimX - m.x) / ad;
          const nz = (aimZ - m.z) / ad;
          m.x += nx * speed * dt;
          m.z += nz * speed * dt;
          m.yaw = Math.atan2(-nx, -nz);
          // same pack-separation nudge the shared tail applies to chase/
          // attack — duplicated rather than shared since this branch
          // returns early below
          for (const o of useEnemyStore.getState().enemies) {
            if (o.id === data.id || o.mob.state === 'dying') continue;
            const sx = m.x - o.mob.x;
            const sz = m.z - o.mob.z;
            const sd = Math.hypot(sx, sz);
            if (sd > 0.001 && sd < 1.1) {
              m.x += (sx / sd) * (1.1 - sd) * 0.5;
              m.z += (sz / sd) * (1.1 - sd) * 0.5;
            }
          }
          g.position.set(m.x, st.destination ? destinationGroundY(m.x, m.z) : 0, m.z);
          g.rotation.y = m.yaw + Math.PI;
          if (clip !== 'anim_c_run') setClip('anim_c_run');
          return;
        }
      }
      // broken morale (advanced AI): a badly wounded bandit loses heart and
      // breaks for the treeline instead of trading blows to the end — no
      // kill credit, no loot, they just live to raid another day.
      // Cedric's Siege: the same escape valve is what keeps every Cedric
      // appearance OTHER than his sanctioned final stand from being able to
      // permanently kill him — he trades blows for real, then bails, same as
      // a bandit, rather than needing a bespoke "can't die here" mechanic of
      // his own. `finalStand` spawns (the camp duel once cedricFinalStandReady)
      // are excluded — that is the one fight he does not walk away from.
      if (
        (data.kind === 'bandit' && data.hp <= 2
          || (data.kind === 'cedric' && !data.finalStand && data.hp <= CEDRIC_FLEE_HP))
        && !m.fleeing
      ) {
        m.fleeing = true;
        st.notify(data.kind === 'cedric' ? 'Cedric the Bull breaks off, sounding the retreat!' : 'A bandit loses heart and flees!');
      }
      if (m.fleeing) {
        m.state = 'chase'; // run animation
        const away = Math.hypot(m.x - playerState.x, m.z - playerState.z) || 1;
        const nx = (m.x - playerState.x) / away;
        const nz = (m.z - playerState.z) / away;
        m.x += nx * 3.0 * dt;
        m.z += nz * 3.0 * dt;
        m.yaw = Math.atan2(-nx, -nz);
        if (away > 44) { remove(data.id); return; }
        g.position.set(m.x, st.destination ? destinationGroundY(m.x, m.z) : 0, m.z);
        g.rotation.y = m.yaw + Math.PI;
        if (clip !== 'anim_c_run') setClip('anim_c_run');
        return;
      }
      if (m.alertT) m.alertT = Math.max(0, m.alertT - dt);

      // J51 follow-up: a raid mob that ends up next to a FINISHED keep piece
      // batters it instead of walking through as if it were not there —
      // proximity only (the keep has no collision volumes of its own yet, so
      // this is not a chase target the way a defender is — a raider only
      // ever notices one it has already wandered/chased right up against).
      // Ordinary night skeletons are not raiders and leave the castle alone.
      let keepTarget: { socketId: string; x: number; z: number; name: string } | null = null;
      let keepD = Infinity;
      if (data.raid && !st.destination && st.keep) {
        for (const sock of KEEP_SOCKETS) {
          const partId = st.keep.parts[sock.id];
          if (!partId || (st.keep.built[sock.id] ?? 0) < 1) continue;
          const wx = st.keep.x + sock.x;
          const wz = st.keep.z + sock.z;
          const dd = Math.hypot(wx - m.x, wz - m.z);
          if (dd < 3.4 && dd < keepD) {
            keepD = dd;
            keepTarget = { socketId: sock.id, x: wx, z: wz, name: KEEP_PART_BY_ID[partId]?.name ?? 'the castle' };
          }
        }
      }

      // homestead skirmish lines (AI wave 2): if a sworn defender stands
      // closer than the player, fight THEM — raids and night hunts become
      // real defender-vs-mob battles instead of everything beelining the
      // player. Tower-elevated defenders are out of ground reach (that's the
      // point of the tower) and Storm duels stay strictly player-vs-Storm.
      let defTarget: (typeof defenderState)[string] | null = null;
      let defId = '';
      let defD = Infinity;
      if (!st.destination && data.kind !== 'storm') {
        for (const [vid, dsd] of Object.entries(defenderState)) {
          if (dsd.state === 'downed' || dsd.elevated) continue;
          const dd = Math.hypot(dsd.x - m.x, dsd.z - m.z);
          if (dd < 16 && dd < defD) { defD = dd; defTarget = dsd; defId = vid; }
        }
      }
      if (keepTarget && keepD < d && keepD < defD) {
        m.state = 'attack';
        m.attackCd -= dt;
        const ndx = keepTarget.x - m.x;
        const ndz = keepTarget.z - m.z;
        m.yaw = Math.atan2(-ndx, -ndz);
        if (m.attackCd <= 0) {
          m.attackCd = ATTACK_CD[data.kind];
          st.damageKeepPart(keepTarget.socketId, RAID_SIEGE_DMG[data.kind] ?? 8, `was battered by ${CONFIGS[data.kind].name}`);
        }
      } else if (defTarget && defD < d) {
        if (defD < (data.ranged ? RANGED_RANGE : 1.7)) {
          m.state = 'attack';
          m.attackCd -= dt;
          const ndx = defTarget.x - m.x;
          const ndz = defTarget.z - m.z;
          m.yaw = Math.atan2(-ndx, -ndz);
          if (m.attackCd <= 0) {
            m.attackCd = data.ranged ? RANGED_ATTACK_CD : ATTACK_CD[data.kind];
            defTarget.hp -= (data.ranged ? RANGED_DMG : ATTACK_DMG[data.kind]) * data.scale;
            if (defTarget.hp <= 0 && defTarget.state === 'ok') {
              defTarget.state = 'downed';
              defTarget.downedUntil = Date.now() + 45000;
              const name = st.villagers.find((v) => v.id === defId)?.name ?? 'A defender';
              st.notify(`${name} is knocked down defending the homestead!`);
            }
          }
        } else {
          m.state = 'chase';
          m.attackCd = Math.max(0.4, m.attackCd - dt);
          const nx = (defTarget.x - m.x) / defD;
          const nz = (defTarget.z - m.z) / defD;
          const sp = data.kind === 'skeleton' ? (defD > 8 ? speed * 0.7 : speed * 1.5) : speed;
          m.x += nx * sp * dt;
          m.z += nz * sp * dt;
          m.yaw = Math.atan2(-nx, -nz);
        }
      } else if (d < (data.ranged ? RANGED_RANGE : 1.8)) {
        m.state = 'attack';
        m.attackCd -= dt;
        // held at range rather than closing the last few metres (see the
        // chase branch below), so — unlike melee, which already arrives
        // facing its target — a crossbow bandit needs its own aim-turn here
        if (data.ranged) m.yaw = Math.atan2(-(playerState.x - m.x), -(playerState.z - m.z));
        if (m.attackCd <= 0) {
          m.attackCd = data.ranged ? RANGED_ATTACK_CD : data.kind === 'storm'
            // Silver Tongue trade-off perk: its own upside is trade prices
            // (gameStore.ts's sellItem/buyOffer) — the cost is Storm striking
            // faster here, the same direction reputation already pushes this
            // cooldown, so a Silver Tongue holder meets a permanently
            // "further into the escalation" Storm rather than a new curve
            ? Math.max(0.55, ATTACK_CD.storm - (useGameStore.getState().reputation['storm'] ?? 0) * 0.006
              - (useGameStore.getState().perks.includes('silver_tongue') ? 0.15 : 0))
            : ATTACK_CD[data.kind];
          // a duel with Storm ends the instant either side lands a blow —
          // no lingering damage, just resolution (see combat.ts's resolveDuel)
          if (data.ranged) damagePlayer(RANGED_DMG * data.scale);
          else if (data.kind === 'storm') resolveDuel(false, data.id);
          else damagePlayer(ATTACK_DMG[data.kind] * data.scale);
        }
      } else if (d < 26 || (m.alertT ?? 0) > 0) {
        m.state = 'chase';
        m.attackCd = Math.max(0.4, m.attackCd - dt);

        // Route AROUND structures and THROUGH real openings (game/navgrid.ts)
        // instead of steering straight at the player and letting the
        // collision solver shove us sideways — which is what used to read as
        // walking through a wall. The path is recomputed on a timer, and
        // whenever the player has moved far enough that the old one is stale.
        path.current.t -= dt;
        const targetMoved = Math.hypot(playerState.x - path.current.tx, playerState.z - path.current.tz) > 3;
        if (path.current.t <= 0 || targetMoved) {
          path.current.t = 0.7 + Math.random() * 0.4;   // desync the herd
          path.current.tx = playerState.x;
          path.current.tz = playerState.z;
          path.current.pts = findPath(m.x, m.z, playerState.x, playerState.z) ?? [];
          path.current.i = 0;
        }
        // aim at the next corner if we have one, otherwise straight at the
        // player (open ground, or no route — the old behaviour)
        let aimX = playerState.x;
        let aimZ = playerState.z;
        const pts = path.current.pts;
        while (path.current.i < pts.length
          && Math.hypot(pts[path.current.i].x - m.x, pts[path.current.i].z - m.z) < 1.1) {
          path.current.i++;
        }
        if (path.current.i < pts.length) {
          aimX = pts[path.current.i].x;
          aimZ = pts[path.current.i].z;
        }
        const ad = Math.hypot(aimX - m.x, aimZ - m.z) || 1;
        let nx = (aimX - m.x) / ad;
        let nz = (aimZ - m.z) / ad;
        // pack flanking (advanced AI): each enemy closes on its own shoulder
        // of the target — a fixed per-id flank angle that fades to a direct
        // line inside ~5m, so a group arrives SURROUNDING you instead of
        // stacking into single file behind the same straight approach
        const flankA = ((data.id % 7) / 6 - 0.5) * 1.6 * THREE.MathUtils.clamp((d - 5) / 12, 0, 1);
        if (flankA !== 0) {
          const ca = Math.cos(flankA);
          const sa = Math.sin(flankA);
          const fx = nx * ca - nz * sa;
          nz = nx * sa + nz * ca;
          nx = fx;
        }
        // undead pacing (advanced AI): skeletons shamble at a distance, then
        // lunge horribly once they're close
        const sp = data.kind === 'skeleton' ? (d > 8 ? speed * 0.7 : speed * 1.5) : speed;
        m.x += nx * sp * dt;
        m.z += nz * sp * dt;
        // yaw -> facing direction is (-sin, -cos) everywhere else in this
        // codebase (see PlayerController/combat.ts), so recovering yaw from
        // a movement direction needs the negated atan2, not a bare one.
        m.yaw = Math.atan2(-nx, -nz);
      } else {
        m.state = 'wander';
        m.wanderT -= dt;
        if (m.wanderT <= 0) {
          m.wanderT = 2 + Math.random() * 4;
          m.yaw = Math.random() * Math.PI * 2;
        }
        m.x += -Math.sin(m.yaw) * 0.7 * dt;
        m.z += -Math.cos(m.yaw) * 0.7 * dt;
      }
      // pack separation (AI wave 2): shoulder apart from packmates so a
      // group closes as a line, not a single stacked column
      if (m.state === 'chase' || m.state === 'attack') {
        for (const o of useEnemyStore.getState().enemies) {
          if (o.id === data.id || o.mob.state === 'dying') continue;
          const sx = m.x - o.mob.x;
          const sz = m.z - o.mob.z;
          const sd = Math.hypot(sx, sz);
          if (sd > 0.001 && sd < 1.1) {
            m.x += (sx / sd) * (1.1 - sd) * 0.5;
            m.z += (sz / sd) * (1.1 - sd) * 0.5;
          }
        }
      }
      // Keep out of the pond and the world edge — home-only geography, same
      // !st.destination guard the keepTarget/defTarget checks above already
      // use. Found and fixed while building the arena (requested 2026-08-03):
      // both this pond check and the WORLD_HALF clamp below were previously
      // unconditional, so an enemy spawned thousands of units away at a real
      // destination's own origin got yanked back inside the home world's
      // tiny ±200 bound every single frame. A genuine pre-existing latent
      // bug for the Sealed Crypt too (DUNGEON_ORIGIN is (4200,4200)) — it
      // just never surfaced there, since a room fight is short and its own
      // walls mask a mob's position snapping around.
      if (!st.destination) {
        const pd = Math.hypot(m.x - POND.x, m.z - POND.z);
        if (pd < POND.radius + 1) {
          m.x = POND.x + ((m.x - POND.x) / pd) * (POND.radius + 1);
          m.z = POND.z + ((m.z - POND.z) / pd) * (POND.radius + 1);
        }
        m.x = THREE.MathUtils.clamp(m.x, -WORLD_HALF + 2, WORLD_HALF - 2);
        m.z = THREE.MathUtils.clamp(m.z, -WORLD_HALF + 2, WORLD_HALF - 2);
      }
      // a shut gate blocks raiders like a wall (the one building type enemies collide with)
      for (const b of st.buildings) {
        if (b.type !== 'gate' || (st.gateOpen[b.id] ?? true)) continue;
        const [sx, sz] = sizeFor(b.type, b.rot);
        const hx = sx / 2 + 0.5;
        const hz = sz / 2 + 0.5;
        const dx = m.x - b.x;
        const dz = m.z - b.z;
        if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
          const px = hx - Math.abs(dx);
          const pz = hz - Math.abs(dz);
          if (px < pz) m.x = b.x + Math.sign(dx || 1) * hx;
          else m.z = b.z + Math.sign(dz || 1) * hz;
        }
      }
    }

    // Phase 20: away from the flat homestead, enemies stand on the bake's
    // real terrain (Storm's Sister Keep duel ring, Cedric's Rival Castle
    // camp, the dungeon's own floor all raycast against the mounted root)
    g.position.set(m.x, st.destination ? destinationGroundY(m.x, m.z) : 0, m.z);
    g.rotation.y = m.yaw + Math.PI;

    const want =
      m.state === 'attack' ? 'anim_g_swordswish'
        : m.state === 'chase' ? 'anim_c_run'
        : 'anim_c_walk';
    if (want !== clip) setClip(want);
  });

  return (
    <group ref={group} position={[data.mob.x, 0, data.mob.z]}>
      <RiggedFigure
        config={CONFIGS[data.kind]}
        height={1.72}
        // Reported 2026-07-28: Gilbert spawned with a hand floating away from
        // his body. Root cause — his donor's own molded axe+shield are
        // "prop"-kind parts (verified, part_roles.json): kept (per the old
        // `keepProps` here) means they're parented straight to the body
        // joint at their ORIGINAL baked position, never re-hung alongside
        // the arm the way the hand riding it is (see rehangArm) — so once
        // the arm moves to its neutral hanging pose, the axe stays exactly
        // where it was baked, adrift from wherever the hand ended up. It was
        // also pure redundancy: bandits/Gilbert/royal knights already carry
        // a REAL separately-portalled weapon below, and neither Cedric's
        // horn+helmet nor Storm's visor are "prop" kind at all (they're
        // "accessory", which is always kept regardless of this flag) — so
        // no enemy in the roster actually needs their own donor's molded
        // weapon kept. Confirmed with a fresh read of every CONFIGS entry's
        // rig data, not assumed.
        keepProps={false}
        clip={clip}
        timeScale={clip === 'anim_g_swordswish' ? 1.8 : 1.15}
        onReady={(r) => {
          rigRef.current = r;
          setRig(r);
          // publish this donor's REAL per-part volumes for ranged combat
          registerHitbox(String(data.id), measureHitBoxes(r));
        }}
      />
      {/* bandits: a raiding party mixes melee and ranged rather than every
          raider carrying the same halberd (requested 2026-07-30) — the
          `ranged` roll happens once at spawn (combat.ts), so it's stable for
          the mob's whole life, and Enemies.tsx's own AI branches above
          already read the same flag to hold-and-hit-scan at range instead of
          closing to melee. Gilbert, their leader, always fights melee. */}
      {rig && data.kind === 'bandit' && data.ranged
        && createPortal(<HeldCrossbow side={-1} />, rig.joints.rightarm)}
      {rig && ((data.kind === 'bandit' && !data.ranged) || data.kind === 'gilbert')
        && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
      {/* the crown's knights — and Cedric, their equal and opposite — fight
          sword-and-shield, like the player's own kit. */}
      {rig && (data.kind === 'royal' || data.kind === 'cedric' || data.kind === 'skeleton')
        && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
      {/* shields (requested 2026-07-30): every melee kind now carries one —
          a crossbow bandit's off-hand stays empty (it's a two-handed weapon,
          same as Gilbert's halberd), and skeletons pick up the shield they
          were the one melee kind still missing. */}
      {rig && (data.kind === 'royal' || data.kind === 'cedric' || data.kind === 'skeleton'
        || (data.kind === 'bandit' && !data.ranged))
        && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
    </group>
  );
}

export default function Enemies() {
  const enemies = useEnemyStore((s) => s.enemies);
  const spawn = useEnemyStore((s) => s.spawn);
  const tick = useRef(0);
  const skelTimer = useRef(6);
  const raidCooldown = useRef(0);
  const raidActive = useRef(false);
  const campGuardTimer = useRef(6);

  useFrame((_, dt) => {
    tick.current -= dt;
    if (tick.current > 0) return;
    tick.current = 1; // 1 Hz is plenty for spawning decisions
    // keep the navigation grid in step with what has been built; this is a
    // no-op unless the buildings array identity actually changed
    rebuildNav(useGameStore.getState().buildings);
    const st = useGameStore.getState();
    if (st.paused || !st.character) return;
    const { enemies: list } = useEnemyStore.getState();

    // the Sealed Crypt (Phase 17) is its own curated encounter space — spawn
    // each room's enemies once on arrival and watch for a full clear
    if (st.destination === 'dungeon' && dungeonState.layout) {
      const layout = dungeonState.layout;
      let allCleared = true;
      for (const room of layout.rooms) {
        if (room.enemyCount === 0) continue;
        if (!room.spawned) {
          room.spawned = true;
          for (let i = 0; i < room.enemyCount; i++) {
            const a = (i / room.enemyCount) * Math.PI * 2;
            useEnemyStore.getState().spawn(
              room.enemyKind, room.cx + Math.cos(a) * 2.5, room.cz + Math.sin(a) * 2.5, false, room.index,
            );
          }
        }
        if (!room.cleared) {
          const alive = useEnemyStore.getState().enemies.some(
            (e) => e.dungeonRoom === room.index && e.mob.state !== 'dying',
          );
          if (!alive) {
            room.cleared = true;
            st.notify(room.isBoss ? 'The crypt falls silent — the guardian is defeated!' : 'The chamber is cleared.');
          }
        }
        if (!room.cleared) allCleared = false;
      }
      if (allCleared && !layout.rewarded) {
        layout.rewarded = true;
        const rooms = layout.rooms.length;
        const gold = 20 + rooms * 8;
        st.addItems({ gold, iron_ore: 2 + rooms, stone: 4 + rooms * 2 }, 'grant');
        st.addXp('combat', 30 + rooms * 10);
        st.recordDungeonClear();
        // a full clear salvages real gear off the fallen for the garrison
        // back home (the Armory) — never the player's own Satchel. The
        // halberd specifically has no craft recipe at all, so a Crypt clear
        // is the ONLY way one ever reaches the Armory.
        st.grantArmory('helmet', 1);
        st.grantArmory('chestplate', 1);
        st.grantArmory('halberd', 1);
        st.notify(`The Sealed Crypt is cleared! +${gold} gold, salvaged materials, and a helmet + chestplate + halberd for the Armory.`, true);
        audio.play('treasure', 0.85);
      }
      return; // skip the homestead-only spawn systems below entirely while inside
    }

    // Cedric's camp guards (Phase 20: the camp sits at The Rival Castle now)
    // — spawned only while actually visiting his world, and never for an
    // ally of his banner
    if (st.destination === CEDRIC_WORLD
      && st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric && st.alliance !== 'cedric') {
      campGuardTimer.current -= 1;
      const guards = list.filter((e) =>
        !e.raid && e.mob.state !== 'dying' && (e.kind === 'gilbert' || e.kind === 'bandit')
        && Math.hypot(e.mob.homeX - CEDRIC_CAMP.x, e.mob.homeZ - CEDRIC_CAMP.z) < 8);
      if (guards.length < 2 && campGuardTimer.current <= 0) {
        campGuardTimer.current = 20 + Math.random() * 10;
        spawn('gilbert', CEDRIC_CAMP.x + 3, CEDRIC_CAMP.z + 2, false);
        spawn('bandit', CEDRIC_CAMP.x - 3, CEDRIC_CAMP.z - 2, false);
      }
    }

    // skeletons rise at night near the player, crumble at dawn — homestead
    // only: suppressed while away (template worlds or the dungeon above)
    if (st.destination) return;
    const skeletons = list.filter((e) => e.kind === 'skeleton' && e.mob.state !== 'dying');
    if (worldEnv.night > 0.62) {
      skelTimer.current -= 1;
      if (skeletons.length < 3 && skelTimer.current <= 0) {
        skelTimer.current = 14 + Math.random() * 14;
        const a = Math.random() * Math.PI * 2;
        const r = 26 + Math.random() * 12;
        const sx = playerState.x + Math.cos(a) * r;
        const sz = playerState.z + Math.sin(a) * r;
        spawn('skeleton', sx, sz);
        audio.playAt('skeleton', sx, sz, 0.7);
        st.notify('Bones rattle in the dark…');
      }
    } else {
      for (const e of skeletons) {
        e.mob.state = 'dying';
        e.mob.dieT = 0;
      }
    }

    // bandit raids at dusk once the homestead is established
    raidCooldown.current = Math.max(0, raidCooldown.current - 1);
    const raiders = list.filter((e) => e.raid);
    if (raidActive.current && raiders.length === 0) {
      raidActive.current = false;
      raiderRamState.active = false;
      st.notify('The raid is beaten back! The bandits dropped their spoils.', true);
      st.addItems({ plank: 4, stone: 4, iron_ore: 2 }, 'grant');
      st.addXp('combat', 60);
      // a driven-off raider sometimes leaves gear behind — straight into the
      // Armory, ready to outfit the garrison that just held the line (real
      // weapons now drop here too, not just armor, since the Armory arms
      // defenders' loadouts as well as their helmet/chestplate)
      if (Math.random() < 0.4) {
        const drops: ItemId[] = ['helmet', 'chestplate', 'sword', 'shield', 'crossbow'];
        const piece = drops[Math.floor(Math.random() * drops.length)];
        st.grantArmory(piece, 1);
        st.notify(`A fallen raider's ${ITEMS[piece].name.toLowerCase()} is added to the Armory.`, true);
      }
      audio.play('horn', 0.8);
    }
    if (
      !raidActive.current &&
      raidCooldown.current <= 0 &&
      worldEnv.time > 0.7 && worldEnv.time < 0.78 &&
      st.buildings.filter(isHomeBuilding).length >= 4 &&
      st.unlocks.includes('mining')
    ) {
      raidActive.current = true;
      raidCooldown.current = Math.max(240, worldEnv.dayLength * 1.5);
      audio.play('warcry', 0.9);
      audio.play('horn', 0.9);
      const a0 = Math.random() * Math.PI * 2;
      // N79 (requested 2026-07-28): raiders arrive by the road instead of
      // popping into existence on a ring around the homestead — spawned
      // loosely clustered around the same road entry point newcomers and
      // the merchant already walk in from (roadEntry()), each individually
      // routed home via Enemies.tsx's own approaching walk (see the
      // per-frame block above). a0 (below) still picks the ram's own spot —
      // see that call's own comment for why it's unchanged.
      const entry = roadEntry();
      function roadSpawnPos(i: number): [number, number] {
        const a = (i / 3) * Math.PI * 2;
        return [entry.x + Math.cos(a) * 3, entry.z + Math.sin(a) * 3];
      }
      if (st.alliance === 'cedric') {
        // Phase 19 alliance branch: pledge to Cedric and it's the CROWN that
        // comes for your homestead — a wave of royal knights, never Cedric's
        // own people (your allies now), and no Weezil bark in the pack
        st.notify('⚔ The crown brands you a traitor — royal knights raid your homestead!', true);
        for (let i = 0; i < 3; i++) {
          const [sx, sz] = roadSpawnPos(i);
          spawn('royal', sx, sz, true, undefined, true);
        }
      } else {
        // unsworn or crown-sworn: the bandit threat, exactly as before
        // once his camp is known and he's still at large, Cedric himself
        // occasionally leads the raid in person — a bigger, named wave
        // instead of another anonymous bandit party (his own real war cry,
        // snd053, already plays above; his greeting bark makes it unmistakable)
        const cedricEligible = st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric;
        const cedricLed = cedricEligible && Math.random() < 0.35;
        if (cedricLed) {
          audio.playVoice('greeting_cedric', 0.9);
          st.notify('⚔ Cedric the Bull himself leads the raid on your homestead!', true);
          const [sx, sz] = roadSpawnPos(0);
          spawn('cedric', sx, sz, true, undefined, true);
        } else {
          // Gilbert the Bad leads the raid, with Weezil somewhere in the pack —
          // their own real voice lines instead of an anonymous mob (see combat.ts)
          audio.playVoice('greeting_gilbert', 0.85);
          st.notify('⚔ Gilbert the Bad leads a raid on your homestead!', true);
          const [sx, sz] = roadSpawnPos(0);
          spawn('gilbert', sx, sz, true, undefined, true);
        }
        audio.playVoice('greeting_weezil', 0.6);
        for (let i = 1; i < 3; i++) {
          const [sx, sz] = roadSpawnPos(i);
          spawn('bandit', sx, sz, true, undefined, true);
        }
      }
      // raiders occasionally bring their own ram — the same threat the
      // player's siege tools already pose, now aimed at the player's gate.
      // Has no walk-in of its own (raiderRamState is a separate system, not
      // an EnemyData/mob), so it still starts on the old 34m ring rather
      // than at the road entry — a rework of its own, out of scope here.
      if (Math.random() < 0.4) {
        // full reset, not just `active = true` — a ram that was broken last
        // raid must not roll back in already wrecked and on 0 HP
        resetRaiderRam(Math.cos(a0) * 34, Math.sin(a0) * 34);
      }
    }

    // Cedric's forest-camp guards: Gilbert and a bandit (Weezil) stand watch
    // once the camp is revealed, respawning on a cooldown like skeletons —
    // until Cedric himself is defeated, after which the camp is cleared.
  });

  return (
    <>
      {enemies.map((e) => <Enemy key={e.id} data={e} />)}
      {/* I39 · at-a-glance health, in the world above each wounded foe */}
      {enemies.map((e) => <HealthBillboard key={`hb${e.id}`} data={e} />)}
    </>
  );
}
