// NPC_AI_SPEC §10's build-order item 7 / §5.1's `engage_threat` — closing on a
// believed hostile and striking it, as a real utility-reasoner action.
//
// WHICH POPULATION THIS IS FOR, stated plainly because it is the whole design
// decision of this file. Checked against the live code, not assumed:
//
//   - `setDefenderLoadout` (gameStore.ts) refuses any villager whose job is not
//     'defender', so "can fight" and "is a sworn defender" are the same
//     predicate in this game — there is no armed farmer and no way to make one.
//   - `rosterSync.ts` deliberately excludes `job === 'defender'` from getting an
//     `Agent` at all, because `Defenders.tsx` already owns a complete, tuned
//     combat AI for them (orders, engage radius, bow vs melee, mounts, tower
//     elevation, HP/downed/recovery, watch shifts).
//
// So this action's `is_defender` gate is the exact mirror image of that
// exclusion: it can only ever fire for an agent whose villager record says
// 'defender', and no such agent exists today. That is deliberate and it is not
// a stub — the Activity below is complete, deals real damage through the same
// `EnemyData.hp` path `Defenders.tsx` uses, and shares its damage FORMULA
// rather than copying it (`defenderStrike`, game/defenders.ts). What it does
// not do is reverse rosterSync's exclusion, because that is a migration off a
// shipped, tuned combat AI onto an untested one — the single riskiest change
// this project's own docs have repeatedly flagged and deferred
// (PHASE_STATUS.md's closing section: "Enemies are the riskiest (combat is
// tuned and players notice)"; PROJECT_CONTEXT.md §8 item 6). It needs its own
// sign-off, its own session and its own live verification, not a side effect of
// the phase that happened to write the action.
//
// The value shipped here is that the reasoner side is real and complete: the
// `combat` category (weight 3.0 / interruptPriority 8, defined since phase 5,
// never used by an Action until this wave) now has a second real member, the
// dead `engage_threat` id in `archetypes.json`'s `guard` list has a registered
// Action behind it for the first time, and the one thing that migration would
// otherwise have had to write from scratch — under time pressure, next to a
// combat system players notice — already exists and is reviewable in isolation.
//
// It also gives `perception/Senses.ts`'s `reportAgentDamaged()` its intended
// caller shape: the moment a defender has an Agent, `Enemies.tsx`'s existing
// `defTarget.hp -= ...` site is the one line that makes §6.3's damage term
// live. Not wired here, because writing into a shipped combat file for a call
// that provably cannot resolve today (`agentManager.get(defenderId)` is always
// undefined) buys nothing and adds an import edge to `Enemies.tsx` that cannot
// be verified without running the game.

import { lootFor, useEnemyStore, type EnemyData } from '@/game/combat';
import { defenderStrike } from '@/game/defenders';
import { useGameStore } from '@/game/store/gameStore';
import { COMBAT } from '../config';
import type { Agent } from '../core/Agent';
import type { Belief } from '../core/Blackboard';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';
import { nearestNoticedHostile } from '../perception/Belief';
import { clearCombatState, combatStateFor } from './combatState';

/** Reaction clips deliberately reserved OUT of `idle_fidget`'s pool (see
 *  ambient.ts's own comment on why it excludes the combat-flavoured ones) —
 *  this is what they were being kept for. */
const SWING_CLIP = 'anim_g_swordswish';

function threatOf(agent: Agent): Belief | null {
  return nearestNoticedHostile(agent.bb, agent.position.x, agent.position.z);
}

/** `enemy:17` -> the live `EnemyData`, or null for a `noise:` belief (nothing
 *  to hit — an unattributed sound has no entity behind it) and for one whose
 *  mob has already died.
 *
 *  This is the ONE place this action touches a live entity, and only to resolve
 *  a blow that is already being thrown. §3.3's rule — "combat and search
 *  behavior must read `lastKnownPosition`, never the live transform" — governs
 *  where the agent GOES and what it faces, and every one of those reads goes
 *  through the belief above. Whether a swing actually connects cannot be
 *  answered from a memory: the world adjudicates that, exactly as
 *  `Defenders.tsx`'s own `inRange` test does.
 *
 *  Exported (Wave 21) so `engageThreatVillager.ts` can reuse this exact
 *  resolution instead of forking it — live-target resolution is the one
 *  piece of this file safe (and worth) sharing with that action; everything
 *  else (the damage formula, the gates, the tuning) stays fully separate. */
export function liveTargetFor(beliefId: string): EnemyData | null {
  if (!beliefId.startsWith('enemy:')) return null;
  const id = Number(beliefId.slice(6));
  const e = useEnemyStore.getState().enemies.find((x) => x.id === id);
  return e && e.mob.state !== 'dying' ? e : null;
}

class EngageThreatActivity implements Activity {
  private swingCd = 0;
  private aimedX = 0;
  private aimedZ = 0;
  private facingX = 0;
  private facingZ = 0;
  private closing = false;

  start(agent: Agent, _ctx: Context): void {
    this.swingCd = 0;
    const t = threatOf(agent);
    if (!t) return; // update() fails cleanly on the next tick
    const cs = combatStateFor(agent.id);
    cs.mode = 'engage';
    cs.hits = 0;
    this.approach(agent, t);
  }

  update(agent: Agent, dt: number, now: number): ActivityStatus {
    if (this.swingCd > 0) this.swingCd -= dt;
    combatStateFor(agent.id).swingCd = this.swingCd; // §9's readout, see combatState.ts
    const t = threatOf(agent);
    // Nothing believed hostile is left above the noticed threshold — the fight
    // is over or the memory has faded. SUCCESS, not FAILURE: giving up on a
    // target that stopped existing is the action working, not failing.
    if (!t) { clearCombatState(agent.id); return 'SUCCESS'; }

    const cfg = COMBAT.engage;
    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    const dist = Math.hypot(tx - agent.position.x, tz - agent.position.z);

    if (dist > cfg.reach) {
      // §3.3 again: the walk is toward where this agent BELIEVES the hostile
      // is. Re-aimed when that belief moves, not every tick — re-issuing an
      // identical MOVE_TO would re-stamp `intentSetAt` (Agent.ts's setter) and
      // hide the intent's real age from the overlay.
      if (!this.closing || Math.hypot(tx - this.aimedX, tz - this.aimedZ) > 1) this.approach(agent, t);
      return 'RUNNING';
    }

    // Standing where the hostile was last known to be, and it is not here: the
    // belief is stale rather than wrong. Search is a phase of its own that this
    // game has no content for, so the honest end is to stop rather than to
    // stand over the spot indefinitely with a swing animation playing.
    if (!t.isVisibleNow && now - t.lastSeenAt > cfg.loseTargetSec) {
      clearCombatState(agent.id);
      return 'SUCCESS';
    }

    this.closing = false;
    if (this.swingCd > 0) {
      // The swing clip gets the FIRST half of the cooldown to itself, then the
      // guard comes back up. Without that split the PLAY_ANIM would be replaced
      // by a FACE on the very next think tick — 0.1 s of `anim_g_swordswish` at
      // tier A, which every renderer's own splice would faithfully show as a
      // twitch (haul.ts's one-shot deposit clip documents the same "no real
      // onEnd signal reaches this layer" constraint, and solves it the same
      // way: a held interval, not a callback).
      if (this.swingCd <= cfg.swingSeconds * 0.5) this.face(agent, tx, tz);
      return 'RUNNING';
    }

    this.swingCd = cfg.swingSeconds;
    agent.intent = { type: 'PLAY_ANIM', clip: SWING_CLIP, loop: false, anchored: true };
    this.strike(agent, t);
    return 'RUNNING';
  }

  /** Hold the guard facing what is being fought. Re-issued only when that has
   *  actually moved — `agent.intent`'s setter stamps `intentSetAt` on every
   *  assignment (Agent.ts), so reassigning an identical FACE each tick would
   *  peg the overlay's intent age at 0.0 s. */
  private face(agent: Agent, tx: number, tz: number): void {
    if (agent.intent?.type === 'FACE' && Math.hypot(tx - this.facingX, tz - this.facingZ) < 0.5) return;
    this.facingX = tx;
    this.facingZ = tz;
    agent.intent = { type: 'FACE', target: { x: tx, z: tz } };
  }

  abort(agent: Agent): void {
    agent.intent = null;
    clearCombatState(agent.id);
    // No reservation, no work signal, no carried load touched — same as
    // flee_to_safety/take_cover. A defender's own `defenderState` HP is owned
    // by Defenders.tsx and is not this activity's to unwind.
  }

  private approach(agent: Agent, t: Belief): void {
    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    this.aimedX = tx;
    this.aimedZ = tz;
    this.closing = true;
    agent.intent = {
      type: 'MOVE_TO',
      position: { x: tx, z: tz },
      speed: 'run',
      stopDistance: COMBAT.engage.approachStop,
    };
    const cs = combatStateFor(agent.id);
    cs.mode = 'engage';
    cs.targetBeliefId = t.entityId;
    cs.threatX = tx;
    cs.threatZ = tz;
    cs.coverX = tx;
    cs.coverZ = tz;
    cs.coverLabel = 'engaging';
  }

  /** One blow. Everything after the range check is `Defenders.tsx`'s own kill
   *  bookkeeping, reached through the same store actions rather than
   *  reimplemented: the kill is recorded, the defender earns their XP, the loot
   *  the raider was carrying drops, and the player is told. */
  private strike(agent: Agent, t: Belief): void {
    const gs = useGameStore.getState();
    const villager = gs.villagers.find((v) => v.id === agent.id);
    if (!villager) return;
    const target = liveTargetFor(t.entityId);
    if (!target) return;
    // the live adjudication: a swing thrown at a remembered position misses if
    // the raider has already stepped out of reach, which is exactly what makes
    // reading beliefs rather than transforms cost something
    if (Math.hypot(target.mob.x - agent.position.x, target.mob.z - agent.position.z) > COMBAT.engage.reach) return;

    target.hp -= defenderStrike(villager);
    combatStateFor(agent.id).hits++;
    if (target.hp > 0 || target.mob.state === 'dying') return;
    target.mob.state = 'dying';
    target.mob.dieT = 0;
    gs.recordKill(target.kind);
    gs.gainDefenderXp(villager.id, 15);
    gs.addItems(lootFor(target), 'grant');
    gs.notify(`${villager.name} defeats a raider!`, true);
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
/** Straight through: unlike `take_cover`'s floor-shifted ramp, there is no
 *  threshold below which an armed defender should decline to fight — a little
 *  threat is a little urgency, and the two bool gates below already ensure
 *  there is a real hostile behind the number. */
const threatCurve: Curve = { type: 'linear', m: 1, k: 1, b: 0, c: 0 };

export const ENGAGE_THREAT: Action = {
  id: 'engage_threat',
  category: 'combat',
  weight: 3.0, // CATEGORY_WEIGHT.combat
  // CATEGORY_INTERRUPT_PRIORITY.combat, equal to take_cover's on purpose:
  // neither should be able to preempt the other mid-minDuration, since they
  // are two answers to the SAME situation and the score is what should decide
  // between them (an armed defender fights, an unarmed one gets behind a wall).
  // Same reasoning seek_deposit documents for matching haul_to_deposit's.
  interruptPriority: 8,
  // Shorter than take_cover's 2 s: a fight is re-decided more often than a
  // retreat — one swing's worth of commitment, so a defender whose target dies
  // mid-swing can pick the next one up without waiting out a stale window.
  minDuration: 1.5,
  // Ends by SUCCESS (target gone) or by gating, never by failing repeatedly —
  // a cooldown here would leave a defender standing idle between raiders.
  cooldown: 0,
  considerations: [
    {
      // The capability gate, and the exact mirror of rosterSync.ts's own
      // defender exclusion — see this file's header. `bb.job` is already a
      // live read refreshed every think tick from the real roster record
      // (Agent.think), so this costs nothing beyond a comparison; asking the
      // store for `loadout` here would mean a second O(villagers) scan per
      // think for a question `bb.job` already answers. Being sworn is the
      // capability; the WEAPON only sets the damage tier (defenderStrike
      // gives a bare-handed defender the weaker fists number).
      name: 'is_defender',
      input: (agent) => (agent.bb.job === 'defender' ? 1 : 0),
      curve: boolCurve,
    },
    { name: 'threat_present', input: (agent) => agent.bb.threatLevel, curve: threatCurve },
    {
      name: 'hostile_believed',
      input: (agent) => (threatOf(agent) ? 1 : 0),
      curve: boolCurve,
    },
  ],
  createActivity: () => new EngageThreatActivity(),
};
