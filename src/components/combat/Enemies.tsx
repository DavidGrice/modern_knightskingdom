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
import { findPath, rebuildNav, getNavGrid, hasLineOfSight, GROUND_LOS_Y, navBlocked } from '@/game/navgrid';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import HealthBillboard from './HealthBillboard';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { isDoorLike, isHomeBuilding } from '@/game/types';
import type { CharacterConfig, ItemId } from '@/game/types';
import { ITEMS } from '@/game/data/items';
import { CEDRIC_CAMP, CEDRIC_REVEAL_QUEST, CEDRIC_WORLD, POND, WORLD_HALF } from '@/game/data/world';
import { sizeFor } from '@/game/data/buildables';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { roadEntry, roadSpeedMult } from '@/game/data/road';
import { pushOutOfWater } from '@/game/waterworks';
import { raiderRamState, resetRaiderRam } from '@/game/raiderRam';
import { defenderState, DOWNED_RECOVER_MS } from '@/game/defenders';
import { villagerCombatState } from '@/game/villagerCombat';
import { companionCombatState } from '@/game/companion';
import { COMPANION_ID } from '@/game/data/companion';
import { villagerMobs } from '@/game/villagerMobs';
import { peekCombatState, clearCombatState } from '@/ai/actions/combatState';
import { reportAgentDamaged } from '@/ai/perception/Senses';
import { agentManager } from '@/ai/core/AgentManager';
import { insideWalls } from '@/game/fort';
import { dungeonState } from '@/game/dungeon';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import { destinationGroundY, homeGroundY } from '../world/TemplateWorld';

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
  // Wave 18 #5 bugfix: THIS enemy's own home-ness, not the player's current
  // `st.destination` — Enemies() now keeps home enemies mounted even while
  // the player is elsewhere (see its own comment), so every branch below
  // that used to read the player's global destination as a stand-in for
  // "is this mob at home" has to ask about the mob instead, or a home
  // raider ticking while the player is away would wrongly read itself as
  // being at whatever destination the player happens to be visiting.
  const enemyAtHome = (data.world ?? null) === null;

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
          // Wave 34 (G6.6) · a raider walking in from roadEntry() is exactly
          // the "on the road" case ROAD_SPEED_MULT was made for — the
          // player already gets this boost on the same road, so a raider
          // shouldn't be slower on it just because nobody wired it. The
          // general combat-chase `speed` further below is deliberately left
          // alone: chasing the player off the road isn't a road-preference
          // scenario.
          const approachSpeed = speed * roadSpeedMult(m.x, m.z);
          m.x += nx * approachSpeed * dt;
          m.z += nz * approachSpeed * dt;
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
          g.position.set(m.x, enemyAtHome ? homeGroundY(m.x, m.z) : destinationGroundY(m.x, m.z), m.z);
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
        g.position.set(m.x, enemyAtHome ? homeGroundY(m.x, m.z) : destinationGroundY(m.x, m.z), m.z);
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
      if (data.raid && enemyAtHome && st.keep) {
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
      if (enemyAtHome && data.kind !== 'storm') {
        for (const [vid, dsd] of Object.entries(defenderState)) {
          if (dsd.state === 'downed' || dsd.elevated) continue;
          const dd = Math.hypot(dsd.x - m.x, dsd.z - m.z);
          if (dd < 16 && dd < defD) { defD = dd; defTarget = dsd; defId = vid; }
        }
      }

      // Wave 25: Tam, the companion squire, is a real, always-postured
      // combat target — a rung below a sworn defender but a real target
      // BEFORE an incidental villager (placed between defTarget and
      // villagerTarget below), matching the plan's own capability ordering.
      // Unlike villagerTarget's stricter "only once already fighting" rule,
      // this uses defTarget's own "always valid while not downed" one — Tam
      // is combat-postured at all times (assist_leader's own `is_companion`
      // gate has no courage/proximity check to wait on), not an incidental
      // farmer who happened to pick a fight. Deliberately NOT gated on
      // enemyAtHome (Tam follows the player everywhere,
      // ai/companionSync.ts) — gated instead on this mob's own world
      // matching Tam's own current region, the same per-instance isolation
      // `data.world` already enforces for every other check in this file.
      let companionTarget: { x: number; z: number } | null = null;
      let companionD = Infinity;
      if (data.kind !== 'storm') {
        const tam = agentManager.get(COMPANION_ID);
        const ccs = companionCombatState[COMPANION_ID];
        if (tam && ccs && ccs.state !== 'downed' && (data.world ?? null) === (tam.region ?? null)) {
          const dd = Math.hypot(tam.position.x - m.x, tam.position.z - m.z);
          if (dd < 16) { companionD = dd; companionTarget = { x: tam.position.x, z: tam.position.z }; }
        }
      }

      // Wave 21: an ORDINARY villager who has already chosen (via the AI
      // reasoner's own `engage_threat_villager`) to fight becomes a valid
      // raider target too — one rung below a sworn defender, same shape as
      // the defTarget loop just above. `peekCombatState(...).mode === 'engage'`
      // is the gate that matters: someone merely fleeing/working/hiding
      // stays untouchable exactly as before this wave, and the check is a
      // read-only peek (never creates an entry) so scanning every villager
      // here on every enemy's frame cannot itself populate that map.
      // Position comes from `villagerMobs` (the same live x/z Villagers.tsx
      // itself writes every frame), since villagerCombatState only tracks
      // HP/downed, not where the villager actually stands.
      let villagerTarget: { id: string; x: number; z: number } | null = null;
      let villagerD = Infinity;
      if (enemyAtHome && data.kind !== 'storm') {
        for (const [vid, vcs] of Object.entries(villagerCombatState)) {
          if (vcs.state === 'downed' || peekCombatState(vid)?.mode !== 'engage') continue;
          const vm = villagerMobs[vid];
          if (!vm) continue;
          const dd = Math.hypot(vm.x - m.x, vm.z - m.z);
          if (dd < 16 && dd < villagerD) { villagerD = dd; villagerTarget = { id: vid, x: vm.x, z: vm.z }; }
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
            // Wave 20 · a ranged bandit needs a real unobstructed sightline
            // on the defender it is shooting at; melee's own 1.7m contact
            // range needs no check.
            if (!data.ranged || hasLineOfSight(m.x, GROUND_LOS_Y, m.z, defTarget.x, GROUND_LOS_Y, defTarget.z, data.world ?? null)) {
              defTarget.hp -= (data.ranged ? RANGED_DMG : ATTACK_DMG[data.kind]) * data.scale;
            }
            if (defTarget.hp <= 0 && defTarget.state === 'ok') {
              defTarget.state = 'downed';
              defTarget.downedUntil = Date.now() + DOWNED_RECOVER_MS;
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
      } else if (companionTarget && companionD < d) {
        // Wave 25: same shape as the defTarget branch above, one rung
        // weaker — Tam gets fought back at exactly like a sworn defender
        // does.
        if (companionD < (data.ranged ? RANGED_RANGE : 1.7)) {
          m.state = 'attack';
          m.attackCd -= dt;
          const ndx = companionTarget.x - m.x;
          const ndz = companionTarget.z - m.z;
          m.yaw = Math.atan2(-ndx, -ndz);
          if (m.attackCd <= 0) {
            m.attackCd = data.ranged ? RANGED_ATTACK_CD : ATTACK_CD[data.kind];
            // Wave 20 parity: a ranged bandit needs a real sightline on Tam
            // too, same as on a defender or a villager.
            if (!data.ranged || hasLineOfSight(m.x, GROUND_LOS_Y, m.z, companionTarget.x, GROUND_LOS_Y, companionTarget.z, data.world ?? null)) {
              const ccs = companionCombatState[COMPANION_ID];
              if (ccs) {
                ccs.hp -= (data.ranged ? RANGED_DMG : ATTACK_DMG[data.kind]) * data.scale;
                // §6.3's damage-memory term (Senses.ts) — same AI-clock call
                // every other damage path into this system already makes.
                reportAgentDamaged(COMPANION_ID, agentManager.now);
                if (ccs.hp <= 0 && ccs.state === 'ok') {
                  ccs.state = 'downed';
                  ccs.downedUntil = Date.now() + DOWNED_RECOVER_MS;
                  clearCombatState(COMPANION_ID); // stop a now-stale swing/approach
                  st.notify('Tam is knocked down defending you!');
                }
              }
            }
          }
        } else {
          m.state = 'chase';
          m.attackCd = Math.max(0.4, m.attackCd - dt);
          const nx = (companionTarget.x - m.x) / companionD;
          const nz = (companionTarget.z - m.z) / companionD;
          const sp = data.kind === 'skeleton' ? (companionD > 8 ? speed * 0.7 : speed * 1.5) : speed;
          m.x += nx * sp * dt;
          m.z += nz * sp * dt;
          m.yaw = Math.atan2(-nx, -nz);
        }
      } else if (villagerTarget && villagerD < d) {
        // Wave 21: the same shape as the defTarget branch above, one rung
        // weaker — a villager who chose to fight gets fought back at.
        if (villagerD < (data.ranged ? RANGED_RANGE : 1.7)) {
          m.state = 'attack';
          m.attackCd -= dt;
          const ndx = villagerTarget.x - m.x;
          const ndz = villagerTarget.z - m.z;
          m.yaw = Math.atan2(-ndx, -ndz);
          if (m.attackCd <= 0) {
            m.attackCd = data.ranged ? RANGED_ATTACK_CD : ATTACK_CD[data.kind];
            // Wave 20 parity: a ranged bandit needs a real sightline on the
            // villager it is shooting at, same as it needs one on a defender.
            if (!data.ranged || hasLineOfSight(m.x, GROUND_LOS_Y, m.z, villagerTarget.x, GROUND_LOS_Y, villagerTarget.z, data.world ?? null)) {
              const vcs = villagerCombatState[villagerTarget.id];
              if (vcs) {
                vcs.hp -= (data.ranged ? RANGED_DMG : ATTACK_DMG[data.kind]) * data.scale;
                // §6.3's damage-memory term (Senses.ts) needs the AI clock
                // (`agentManager.now`), NOT `Date.now()` — `downedUntil`
                // just below is the one field on this record that stays on
                // wall-clock time, compared against `Date.now()` elsewhere.
                reportAgentDamaged(villagerTarget.id, agentManager.now);
                if (vcs.hp <= 0 && vcs.state === 'ok') {
                  vcs.state = 'downed';
                  vcs.downedUntil = Date.now() + DOWNED_RECOVER_MS;
                  clearCombatState(villagerTarget.id); // stop a now-stale swing/approach
                  const name = st.villagers.find((v) => v.id === villagerTarget!.id)?.name ?? 'A villager';
                  st.notify(`${name} is knocked down defending the homestead!`);
                }
              }
            }
          }
        } else {
          m.state = 'chase';
          m.attackCd = Math.max(0.4, m.attackCd - dt);
          const nx = (villagerTarget.x - m.x) / villagerD;
          const nz = (villagerTarget.z - m.z) / villagerD;
          const sp = data.kind === 'skeleton' ? (villagerD > 8 ? speed * 0.7 : speed * 1.5) : speed;
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
          if (data.ranged) {
            // Wave 20 · real target height here (not GROUND_LOS_Y): the
            // player genuinely has elevation (a battlement, a tower), and
            // testing against their actual y is what lets an archer shoot
            // over a wall's own footprint at a player standing on it.
            if (hasLineOfSight(m.x, GROUND_LOS_Y, m.z, playerState.x, playerState.y, playerState.z, data.world ?? null)) {
              damagePlayer(RANGED_DMG * data.scale);
            }
          } else if (data.kind === 'storm') resolveDuel(false, data.id);
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
      // enemyAtHome guard the keepTarget/defTarget checks above already use
      // (Wave 18 #5: was `!st.destination`, the player's own location, until
      // home enemies started staying mounted while the player travels away —
      // see this mob's own `enemyAtHome` for why that stopped being the
      // right question to ask). Found and fixed while building the arena
      // (requested 2026-08-03): both this pond check and the WORLD_HALF
      // clamp below were previously unconditional, so an enemy spawned
      // thousands of units away at a real destination's own origin got
      // yanked back inside the home world's tiny ±200 bound every single
      // frame. A genuine pre-existing latent bug for the Sealed Crypt too
      // (DUNGEON_ORIGIN is (4200,4200)) — it just never surfaced there,
      // since a room fight is short and its own walls mask a mob's position
      // snapping around.
      if (enemyAtHome) {
        const pd = Math.hypot(m.x - POND.x, m.z - POND.z);
        if (pd < POND.radius + 1) {
          m.x = POND.x + ((m.x - POND.x) / pd) * (POND.radius + 1);
          m.z = POND.z + ((m.z - POND.z) / pd) * (POND.radius + 1);
        }
        // Wave 12 · and out of the player's own waterways, inside the same
        // home-only guard for the same reason. This is what makes a moat a
        // moat: raiders walk in by the road (roadEntry) and a cut across their
        // approach genuinely turns them, rather than being scenery they wade.
        const out = pushOutOfWater(m.x, m.z, 0.6);
        m.x = out.x;
        m.z = out.z;
        m.x = THREE.MathUtils.clamp(m.x, -WORLD_HALF + 2, WORLD_HALF - 2);
        m.z = THREE.MathUtils.clamp(m.z, -WORLD_HALF + 2, WORLD_HALF - 2);
      }
      // a shut gate blocks raiders like a wall (the one building type enemies
      // collide with) — Wave 8: a barred door does the same
      for (const b of st.buildings) {
        if (!isDoorLike(b.type) || (st.gateOpen[b.id] ?? true)) continue;
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
    //
    // Wave 12 · and the home branch is no longer a literal 0. This was the
    // FIRST NPC-side site the elevation prototype touched, and for a reason
    // specific to raiders: they chase whatever is within 26m of them, so a
    // player who pulls a raid and runs north takes the whole pack up the
    // hill with them, while Villagers/court NPCs/defenders stayed anchored
    // ~90m short of any terrain region and outside the (then ±56m) nav grid
    // entirely — their own hardcoded 0 was out of reach rather than merely
    // unlikely. Wave 31 converted those other sites too (Villagers.tsx,
    // Npc.tsx, Defenders.tsx, RaiderRam.tsx, Merchant.tsx, Wildlife.tsx),
    // closing the gap this comment used to describe rather than leaving it
    // — see terrainRegions.ts for the now data-driven region list.
    g.position.set(m.x, enemyAtHome ? homeGroundY(m.x, m.z) : destinationGroundY(m.x, m.z), m.z);
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
  const allEnemies = useEnemyStore((s) => s.enemies);
  const destination = useGameStore((s) => s.destination);
  // instance-separation doctrine (Phase 23), Stage 0a: an enemy belongs to
  // wherever it was spawned (EnemyData.world, absent/null = home) — same
  // filter Buildings/ResourceNodes/Villagers/Npc already apply. Without it a
  // home raid kept rendering (and being fought) at whatever destination the
  // player travelled to mid-fight, and a dungeon/arena/Cedric-camp spawn
  // bled into every other world too.
  //
  // Wave 18 #5 bugfix: home-world enemies (world null) are ALWAYS included
  // here now, regardless of `destination` — not just when destination is
  // also null. A raid's own combatants are the one thing that must keep
  // moving/fighting/dying while the player is away (PROJECT_CONTEXT.md's
  // "Instance separation" note; RaiderRam/Emplacements already stay
  // unconditionally mounted for the identical reason). This is safe the
  // same way those two are: home sits near the origin while every
  // destination sits thousands of units away in the same shared coordinate
  // space, so a mounted home raider is never actually in view once the
  // player has travelled elsewhere — nothing extra to hide. Only home gets
  // this treatment; a DIFFERENT destination's own enemies (dungeon rooms,
  // the arena, Cedric's camp) still unmount and pause the instant the
  // player leaves THAT world, which is what they're supposed to do.
  const enemies = allEnemies.filter((e) => {
    const w = e.world ?? null;
    return w === null || w === (destination ?? null);
  });
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
    const buildingsForNav = useGameStore.getState().buildings;
    rebuildNav(buildingsForNav);
    const st = useGameStore.getState();
    // Post-Wave-33 verify-pass fix: getNavGrid(region) lazily creates a
    // window-mode grid for whatever destination is mounted (TemplateWorld.tsx
    // -> Villagers.tsx's navSteer, settlement residents; the reasoner/Agent
    // path too), but nothing ever called ITS rebuild() the way homeGrid gets
    // above — so a destination grid's `blocked` array stayed all-zero
    // forever and every building there was invisible to findPath, no matter
    // how correct the grid/region resolution itself was. Piggyback on the
    // exact same 1Hz cadence and buildings array homeGrid already uses;
    // rebuild() itself is a no-op unless the array identity (or waterworks
    // rev) changed, so this costs nothing extra on the common case. The
    // Sealed Crypt is excluded — its own synthesized-wall grid is rebuilt
    // once on generation by ensureDungeonGrid() and never needs the real
    // `buildings` array at all.
    if (st.destination && st.destination !== 'dungeon') {
      getNavGrid(st.destination).rebuild(buildingsForNav);
    }
    if (st.paused || !st.character) return;
    const { enemies: list } = useEnemyStore.getState();

    // the Sealed Crypt (Phase 17) is its own curated encounter space — spawn
    // each room's enemies once on arrival and watch for a full clear
    if (st.destination === 'dungeon' && dungeonState.layout) {
      const layout = dungeonState.layout;
      let allCleared = true;
      for (const room of layout.rooms) {
        if (room.objective === 'none') continue;
        // Wave 13 · 'retrieve' rooms have no enemies at all — they're
        // cleared by PlayerController's relic pickup instead, so this
        // spawn/watch block only applies to 'combat' rooms. Their state
        // still folds into the allCleared check below either way.
        if (room.objective === 'combat') {
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

    // skeletons rise at night NEAR THE PLAYER, crumble at dawn — spawn
    // position is anchored to playerState.x/z itself (see below), which is
    // only meaningful while the player is actually standing at the
    // homestead to have them rise beside them, so this part alone stays
    // gated on `st.destination` (a real "player must be home" case, unlike
    // the raid logic right below it — see that block's own comment for why
    // IT no longer early-returns here). Wave 18 #5 bugfix: this used to be a
    // single `if (st.destination) return;` that also swallowed the raid
    // cooldown/resolve/trigger logic below every frame the player was away —
    // now it only wraps what actually needs the player's own position.
    if (!st.destination) {
      const skeletons = list.filter((e) => e.kind === 'skeleton' && e.mob.state !== 'dying');
      if (worldEnv.night > 0.62) {
        skelTimer.current -= 1;
        if (skeletons.length < 3 && skelTimer.current <= 0) {
          skelTimer.current = 14 + Math.random() * 14;
          // Wave 20 · a ring point can land inside a fully walled-in
          // homestead (insideWalls, game/fort.ts — the same cheap cached
          // flood-fill Sound Walls already reads), which used to rise a
          // skeleton on the wrong side of your own fence. A few re-rolls are
          // enough given the ring sits 26-38m out and a typical wall
          // footprint is small against that; if every try still lands
          // inside, fall back to the same road-entry treatment dusk raiders
          // already get rather than spawning somewhere unchecked.
          // Wave 34 (G6.3) · insideWalls only floods the outer wall
          // boundary, so it stayed blind to a BUILDING placed inside that
          // yard — a ring point could still land inside a house/workshop's
          // own footprint. navBlocked (navgrid.ts) already rebuilds from
          // every placed building's real collision boxes, not just walls,
          // and is already this cheap (one grid lookup), so it's a one-line
          // addition to the same reroll rather than a new pass.
          let sx = 0, sz = 0, placed = false;
          for (let tries = 0; tries < 6; tries++) {
            const a = Math.random() * Math.PI * 2;
            const r = 26 + Math.random() * 12;
            const cx = playerState.x + Math.cos(a) * r;
            const cz = playerState.z + Math.sin(a) * r;
            if (!insideWalls(cx, cz) && !navBlocked(cx, cz)) { sx = cx; sz = cz; placed = true; break; }
          }
          if (!placed) {
            const entry = roadEntry();
            sx = entry.x;
            sz = entry.z;
          }
          // approaching is independent of raid — a fallback skeleton walks in
          // via the nav grid like a raider does, without being counted as one
          spawn('skeleton', sx, sz, false, undefined, !placed);
          audio.playAt('skeleton', sx, sz, 0.7);
          st.notify('Bones rattle in the dark…');
        }
      } else {
        for (const e of skeletons) {
          e.mob.state = 'dying';
          e.mob.dieT = 0;
        }
      }
    }

    // bandit raids at dusk once the homestead is established. Wave 18 #5
    // bugfix: deliberately NOT gated on `st.destination` (unlike the
    // skeleton rise above) — every position this block touches is anchored
    // to roadEntry()/HOME_X/HOME_Z or the ram's own fixed ring, never the
    // player's own live position, so a raid can genuinely start, be fought
    // (by defenders and the keep, both of which already read all of
    // useEnemyStore rather than a world-filtered subset — see Defenders.tsx/
    // damageKeepPart), and resolve while the player is away visiting a
    // destination. This is what makes PROJECT_CONTEXT.md's "Instance
    // separation" claim — that raids deliberately keep resolving in real
    // time while the player is elsewhere — actually true; previously this
    // whole section was unreachable whenever `st.destination` was set, so an
    // already-in-progress raid could never even conclude: raidActive/
    // raidCooldown just hung until the player came home. The loud one-shot
    // stingers below (warcry/horn/voice barks) stay `!st.destination`-gated
    // on their own — ROADMAP.md's own TODO already called out that a raid
    // resolving while away should notify, not blare, and `st.notify` itself
    // (never gated) is what delivers that notification regardless of where
    // the player is.
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
      if (!st.destination) audio.play('horn', 0.8);
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
      if (!st.destination) { audio.play('warcry', 0.9); audio.play('horn', 0.9); }
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
      // Wave 18 #5 bugfix: every spawn() call below now passes `null` as the
      // explicit 10th `worldOverride` arg — this block can now fire while
      // `st.destination` is set (see this block's own comment), and spawn()
      // otherwise stamps a new enemy's `world` from whatever destination the
      // player currently happens to be standing in. Without the override, a
      // raid triggered while away would tag its own raiders with the
      // player's CURRENT destination instead of home, so they'd never render
      // there (positioned at home's coordinates, thousands of units off) and
      // would vanish from view for good the moment the player came home
      // (home is destination null, no longer a `world` match).
      if (st.alliance === 'cedric') {
        // Phase 19 alliance branch: pledge to Cedric and it's the CROWN that
        // comes for your homestead — a wave of royal knights, never Cedric's
        // own people (your allies now), and no Weezil bark in the pack
        st.notify('⚔ The crown brands you a traitor — royal knights raid your homestead!', true);
        for (let i = 0; i < 3; i++) {
          const [sx, sz] = roadSpawnPos(i);
          spawn('royal', sx, sz, true, undefined, true, false, 1, false, null);
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
          if (!st.destination) audio.playVoice('greeting_cedric', 0.9);
          st.notify('⚔ Cedric the Bull himself leads the raid on your homestead!', true);
          const [sx, sz] = roadSpawnPos(0);
          spawn('cedric', sx, sz, true, undefined, true, false, 1, false, null);
        } else {
          // Gilbert the Bad leads the raid, with Weezil somewhere in the pack —
          // their own real voice lines instead of an anonymous mob (see combat.ts)
          if (!st.destination) audio.playVoice('greeting_gilbert', 0.85);
          st.notify('⚔ Gilbert the Bad leads a raid on your homestead!', true);
          const [sx, sz] = roadSpawnPos(0);
          spawn('gilbert', sx, sz, true, undefined, true, false, 1, false, null);
        }
        if (!st.destination) audio.playVoice('greeting_weezil', 0.6);
        for (let i = 1; i < 3; i++) {
          const [sx, sz] = roadSpawnPos(i);
          spawn('bandit', sx, sz, true, undefined, true, false, 1, false, null);
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
