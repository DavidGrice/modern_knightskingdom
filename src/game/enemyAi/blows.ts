// CLN-13 · the blows an enemy's swing (engage.ts) lands, each its mark's own: at one of the player's side — a sworn
// guard, Tam, a villager who chose to fight — at the player, at a piece of the keep, and a siege crew's shot from its
// engine. Each sets the enemy's next cooldown first, as it always did.
import { damagePlayer, resolveDuel, fireSpellBolt, ATTACK_DMG, ATTACK_CD, type EnemyData } from '@/game/combat';
import { useGameStore, type GameState } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { hasLineOfSight, GROUND_LOS_Y } from '@/game/navgrid';
import { isBuilt, isHomeBuilding } from '@/game/types';
import { KEEP_SOCKETS } from '@/game/data/keep';
import { RAID_SIEGE_DMG, KIND_FIGURE } from '@/game/data/enemies';
import { PERK_FX } from '@/game/data/effects';
import { labCanFire } from '@/game/data/labCapabilities';
import { COMPANION_ID } from '@/game/data/companion';
import { DOWNED_RECOVER_MS, type DefenderState } from '@/game/defenders';
import { villagerCombatState } from '@/game/villagerCombat';
import { companionCombatState } from '@/game/companion';
import { clearCombatState } from '@/ai/actions/combatState';
import { reportAgentDamaged } from '@/ai/perception/Senses';
import { agentManager } from '@/ai/core/AgentManager';
import { fireProp } from '@/components/world/RiggedProp';
import { audio } from '@/lib/audio';
import { pick } from '@/lib/rng';
import { RANGED_ATTACK_CD, type RangedProfile } from './engage';
import type { KeepPiece } from './targeting';

/** a crossbow bandit's hit-scan damage (its range and cooldown are engage.ts's) */
export const RANGED_DMG = 1.2;
/** a caster's spell bolt's damage (its range and cooldown are engage.ts's) */
export const CASTER_SPELL_DMG = 1.3;
/** Wave 37 (A3 remainder) · a siege crew's own manned-engine reload — much
 *  slower than any personal attack cooldown (this is a catapult, not a
 *  sword), and distinct from RAID_SIEGE_DMG.siegeCrew (game/data/enemies.ts:
 *  its own opportunistic melee-vs-keep value if it ends up standing next to a
 *  finished keep piece, same as any other raider). */
const SIEGE_CREW_ENGINE_DMG = 20;
const SIEGE_CREW_ENGINE_CD = 7;

/** The blow at one of the player's side: the next cooldown, then the damage — a crossbow's only with a clear shot
 *  (`shot`, asked of a crossbow alone) — handed to `hurt`. */
function blowAtAlly(data: EnemyData, shot: () => boolean, hurt: (dmg: number) => void): void {
  data.mob.attackCd = data.ranged ? RANGED_ATTACK_CD : ATTACK_CD[data.kind];
  if (!data.ranged || shot()) hurt((data.ranged ? RANGED_DMG : ATTACK_DMG[data.kind]) * data.scale);
}

/** A sworn guard: on the ground (Wave 20 · a ranged bandit needs a real unobstructed sightline on the defender it is
 *  shooting at; melee's own 1.7m contact range needs no check), or on the battlements beside a raider who climbed to
 *  them (`onWall`), the shot then taken from where each of them stands. His knock-down is looked at whether or not
 *  the shot was clear. */
export function blowAtGuard(data: EnemyData, st: GameState, guard: DefenderState, id: string, onWall: boolean): void {
  const m = data.mob;
  blowAtAlly(data,
    () => (onWall
      // addendum #6: both combatants are confirmed already standing
      // on the SAME real wall-walk (targeting.ts's guardOnMyWall) — a
      // much smaller, already-adjacent space than open ground.
      // hasLineOfSight is reused unchanged for consistency with
      // every other ranged shot here; this exact
      // elevated-vs-elevated pairing has not been live-fire
      // verified (addendum #6's own open item) — if it's ever found
      // to behave badly, the addendum's own pre-approved fix is to
      // skip this check entirely for this one case instead of
      // generalizing GROUND_LOS_Y itself.
      ? hasLineOfSight(m.x, (m.postY ?? 0) + GROUND_LOS_Y, m.z, guard.x, (guard.postY ?? 0) + GROUND_LOS_Y, guard.z, data.world ?? null)
      : hasLineOfSight(m.x, GROUND_LOS_Y, m.z, guard.x, GROUND_LOS_Y, guard.z, data.world ?? null)),
    (dmg) => {
      guard.hp -= dmg;
      // Wave 41 · §6.3's damage-memory term (Senses.ts), same AI-clock
      // call the Tam and villager blows below already make — a sworn
      // defender finally has a real Agent (archetype defenderObserver,
      // rosterSync.ts) for this to reach.
      reportAgentDamaged(id, agentManager.now);
    });
  if (guard.hp <= 0 && guard.state === 'ok') {
    guard.state = 'downed';
    guard.downedUntil = Date.now() + DOWNED_RECOVER_MS;
    const name = st.villagers.find((v) => v.id === id)?.name ?? 'A defender';
    st.notify(`${name} is knocked down defending ${onWall ? 'the battlements' : 'the homestead'}!`);
  }
}

/** Tam (Wave 25: fought back at exactly like a sworn defender; Wave 20 parity: a ranged bandit needs a real sightline
 *  on him too, same as on a defender or a villager), standing at `at`. */
export function blowAtTam(data: EnemyData, st: GameState, at: { x: number; z: number }): void {
  const m = data.mob;
  blowAtAlly(data,
    () => hasLineOfSight(m.x, GROUND_LOS_Y, m.z, at.x, GROUND_LOS_Y, at.z, data.world ?? null),
    (dmg) => {
      const ccs = companionCombatState[COMPANION_ID];
      if (ccs) {
        ccs.hp -= dmg;
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
    });
}

/** A villager who chose to fight (Wave 21: fought back at; Wave 20 parity: a ranged bandit needs a real sightline on
 *  the villager it is shooting at, same as it needs one on a defender). */
export function blowAtVillager(data: EnemyData, st: GameState, villager: { id: string; x: number; z: number }): void {
  const m = data.mob;
  blowAtAlly(data,
    () => hasLineOfSight(m.x, GROUND_LOS_Y, m.z, villager.x, GROUND_LOS_Y, villager.z, data.world ?? null),
    (dmg) => {
      const vcs = villagerCombatState[villager.id];
      if (vcs) {
        vcs.hp -= dmg;
        // §6.3's damage-memory term (Senses.ts) needs the AI clock
        // (`agentManager.now`), NOT `Date.now()` — `downedUntil`
        // just below is the one field on this record that stays on
        // wall-clock time, compared against `Date.now()` elsewhere.
        reportAgentDamaged(villager.id, agentManager.now);
        if (vcs.hp <= 0 && vcs.state === 'ok') {
          vcs.state = 'downed';
          vcs.downedUntil = Date.now() + DOWNED_RECOVER_MS;
          clearCombatState(villager.id); // stop a now-stale swing/approach
          const name = st.villagers.find((v) => v.id === villager.id)?.name ?? 'A villager';
          st.notify(`${name} is knocked down defending the homestead!`);
        }
      }
    });
}

/** The blow at the player, from a raider standing at height `feetY` — 0 on the ground; on a wall-walk (Wave 58, H4),
 *  the walk's own height, since hasLineOfSight needs to reason about a shot fired FROM up there, not from the ground
 *  the mob's own x/z alone would otherwise imply. It was written out twice in Enemies.tsx — the ground's attack branch
 *  and Wave 58's copy of it for a raider up a ladder, kept apart then so that wave could not regress the first; with
 *  feetY 0 this is the ground's, expression for expression. */
export function fireAtPlayer(data: EnemyData, rangedProfile: RangedProfile, feetY: number) {
  const m = data.mob;
  const st = useGameStore.getState();
  m.attackCd = rangedProfile ? rangedProfile.cd : data.kind === 'storm'
    // Silver Tongue trade-off perk: its own upside is trade prices
    // (the store's sellItem/buyOffer) — the cost is Storm striking
    // faster here, the same direction reputation already pushes this
    // cooldown, so a Silver Tongue holder meets a permanently
    // "further into the escalation" Storm rather than a new curve
    ? Math.max(0.55, ATTACK_CD.storm - (st.reputation['storm'] ?? 0) * 0.006
      - (st.perks.includes('silver_tongue') ? PERK_FX.silver_tongue.stormCooldownCut : 0))
    : ATTACK_CD[data.kind];
  const originY = feetY + GROUND_LOS_Y;
  // a duel with Storm ends the instant either side lands a blow —
  // no lingering damage, just resolution (see combat.ts's resolveDuel)
  if (data.ranged) {
    // Wave 20 · real target height here (not GROUND_LOS_Y): the
    // player genuinely has elevation (a battlement, a tower), and
    // testing against their actual y is what lets an archer shoot
    // over a wall's own footprint at a player standing on it.
    if (hasLineOfSight(m.x, originY, m.z, playerState.x, playerState.y, playerState.z, data.world ?? null)) {
      damagePlayer(RANGED_DMG * data.scale);
    }
  } else if (data.kind === 'caster') {
    // Wave 37 · a REAL travelling spell bolt, not another silent
    // hit-scan — same LOS gate the ranged bandit uses above, so a
    // caster behind full cover doesn't loose one at a wall.
    if (hasLineOfSight(m.x, originY, m.z, playerState.x, playerState.y, playerState.z, data.world ?? null)) {
      fireSpellBolt(data, CASTER_SPELL_DMG * data.scale);
    }
  } else if (data.kind === 'storm') resolveDuel(false, data.id);
  // Wave 40 (A6) · the one and only enemy-melee-vs-player path — opts
  // in to parry timing (damagePlayer's own parry branch checks
  // opts.melee before it does anything, and stamps opts.attacker's
  // cooldown/position on a successful parry). Every other
  // damagePlayer call site (the ranged bandit above, the caster's bolt,
  // the arena tick, siege splash) stays untouched and defaults
  // `opts` to undefined — parry is deliberately melee-only.
  else damagePlayer(ATTACK_DMG[data.kind] * data.scale, { melee: true, attacker: data });
}

/** A finished piece of the keep a raider stands against (targeting.ts's keepInReach), battered with its kind's own
 *  siege damage. */
export function batterKeep(data: EnemyData, st: GameState, piece: KeepPiece): void {
  data.mob.attackCd = ATTACK_CD[data.kind];
  st.damageKeepPart(piece.socketId, RAID_SIEGE_DMG[data.kind] ?? 8, `was battered by ${KIND_FIGURE[data.kind].name}`);
}

/** Wave 37 (A3 remainder) · a siege crew's shot, when its engine can fire: a real, additive AI behaviour — it never
 *  chases and never idly wanders off its post, it works its manned engine instead, on a slow reload, independently of
 *  wherever the player is on the field (the frame's ordinary attack on the player still fires first and wins if the
 *  player walks right up, so it is genuinely killable, not a decoy). Target selection mirrors CedricSiege.tsx's own
 *  WarParty engine loop (a random finished home building or keep socket). */
export function fireEngine(data: EnemyData, st: GameState): void {
  const m = data.mob;
  if (!labCanFire(data.siegeAsset)) return;
  m.attackCd = SIEGE_CREW_ENGINE_CD + Math.random() * 3;
  const targets: { keep: boolean; id: string; x: number; z: number }[] = [
    ...st.buildings.filter((b) => isBuilt(b) && isHomeBuilding(b) && b.type !== 'keep')
      .map((b) => ({ keep: false, id: b.id, x: b.x, z: b.z })),
    ...(st.keep
      ? KEEP_SOCKETS.filter((s) => st.keep!.parts[s.id] && (st.keep!.built[s.id] ?? 0) >= 1)
        .map((s) => ({ keep: true, id: s.id, x: st.keep!.x + s.x, z: st.keep!.z + s.z }))
      : []),
  ];
  if (targets.length) {
    const target = pick(targets);
    m.yaw = Math.atan2(-(target.x - m.x), -(target.z - m.z));
    fireProp(`siegeCrew_${data.id}`);
    audio.playAt('explosion', target.x, target.z, 0.7);
    if (target.keep) st.damageKeepPart(target.id, SIEGE_CREW_ENGINE_DMG, 'was battered by a Siege Engineer');
    else st.damageBuilding(target.id, SIEGE_CREW_ENGINE_DMG, 'was battered by a Siege Engineer');
  }
}
