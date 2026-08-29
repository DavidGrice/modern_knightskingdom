// Wave 25 — assist_leader: Tam, the companion squire's own answer to a
// believed hostile. Structured almost verbatim on engage_threat's own
// approach/face/swing state machine (src/ai/actions/engageThreat.ts) — a
// companion is not an ordinary roster villager, so this reuses that file's
// original combat SHAPE (category 'combat', weight 3.0, interruptPriority 8
// — not the 'companion' category follow_leader claims, so this can actually
// preempt a follow in progress instead of tying with it) rather than
// engage_threat_villager's weaker one, while keeping its own fully separate
// gate/damage/config exactly like that file kept its own separate from
// engage_threat's:
//
//   - Gate is `agent.archetype === 'companion'` — NOT `bb.job === 'defender'`
//     (Tam is never a roster villager; his `bb.job` live-reads to `null`
//     every think tick, same as any agent with no matching Villager record —
//     see Blackboard.ts's own comment) and NOT engage_threat_villager's
//     courage/proximity/tier gates (see below for why those don't apply).
//   - Damage is a new `companionStrike()` (game/companion.ts) — a flat
//     constant of Tam's own, not `defenderStrike()`/`villagerStrike()`.
//   - No `gainDefenderXp()` call, for the exact reason
//     engage_threat_villager's own header already gives for skipping it:
//     there is no leveling record on this entity to grant XP into, and
//     inventing one is exactly the Wave-25b (independent leveling) scope this
//     wave defers.
//   - No `hasLineOfSight()` check. Checked, not assumed: neither
//     engage_threat nor engage_threat_villager — this action's own two
//     stated models — call it at all; LOS in this codebase gates RANGED
//     attacks only (Enemies.tsx's ranged mobs, Defenders.tsx's bow loadout,
//     combat.ts's bolts, perception's VisionSensor). assist_leader is melee
//     (reach 1.8m, identical to both models), so there is nothing at that
//     range for LOS to gate. If a later wave gives Tam a ranged option, that
//     is precisely where it must be threaded in — mirroring Defenders.tsx's
//     own bow-only conditional.
//   - No courage gate, no capableTierMax gate: both exist on
//     engage_threat_villager specifically to stop a whole ROSTER of flat,
//     unleveled villagers from mass-dogpiling into fights their stats can't
//     scale with as raidStrength() climbs. There is exactly one companion,
//     ever (falcon.ts's own "one always-on companion, not a fleet"
//     precedent) — that risk cannot occur for a single dedicated entity, so
//     omitting these is a reasoned call, not an oversight.
import { lootFor } from '@/game/combat';
import { companionStrike, registerCompanionCombat } from '@/game/companion';
import { playerState } from '@/game/playerState';
import { useGameStore } from '@/game/store/gameStore';
import { COMBAT } from '../config';
import type { Agent } from '../core/Agent';
import type { Belief } from '../core/Blackboard';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';
import { nearestNoticedHostile } from '../perception/Belief';
import { clearCombatState, combatStateFor } from './combatState';
import { liveTargetFor } from './engageThreat';

/** Same reserved reaction clip engage_threat/engage_threat_villager use —
 *  see engageThreat.ts's own comment on why it's kept out of idle_fidget's
 *  pool. */
const SWING_CLIP = 'anim_g_swordswish';

function threatOf(agent: Agent): Belief | null {
  return nearestNoticedHostile(agent.bb, agent.position.x, agent.position.z);
}

/** Structured exactly like EngageThreatActivity/EngageThreatVillagerActivity
 *  — same approach/face/swing state machine, same live-target adjudication at
 *  the moment of the blow — just swinging for `companionStrike()`'s own flat
 *  damage instead of either defenderStrike() or villagerStrike(). */
class AssistLeaderActivity implements Activity {
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
    // Same asymmetry engage_threat_villager documents: a blow can land
    // (Enemies.tsx's companionTarget branch) between this tick's scoring and
    // this Activity's own next think, and `not_downed`'s gate only stops a
    // NEW assist from starting. Ending cleanly here on the very next update
    // is what stops one more strike() landing while downed.
    if (registerCompanionCombat(agent.id).state === 'downed') { clearCombatState(agent.id); return 'SUCCESS'; }
    if (this.swingCd > 0) this.swingCd -= dt;
    combatStateFor(agent.id).swingCd = this.swingCd;
    const t = threatOf(agent);
    if (!t) { clearCombatState(agent.id); return 'SUCCESS'; }

    const cfg = COMBAT.engageCompanion;

    // Verification fix — the leash's per-frame half. `within_leash` below
    // (this Action's own considerations) is what stops assist_leader being
    // RE-SELECTED past leashDistance — confirmed live to be the part that
    // actually matters (see that consideration's own comment for why a bare
    // update()-time `return 'SUCCESS'` alone did nothing: the very next think
    // tick just won the same Action fresh and picked the chase back up,
    // measured running Tam out to 43+ m before this gate existed). This half
    // is the difference between that and instant: update() runs every
    // render frame, think only at the agent's tier cadence (10/5/2 Hz), so
    // without also clearing `agent.intent` here, Locomotion would keep
    // stepping the CURRENT stale MOVE_TO for up to another 0.5s (tier C)
    // after crossing the line, same as `not_downed`'s own per-frame check
    // stops one more strike from landing in the gap before its gate bites.
    if (Math.hypot(playerState.x - agent.position.x, playerState.z - agent.position.z) > cfg.leashDistance) {
      agent.intent = null;
      clearCombatState(agent.id);
      return 'SUCCESS';
    }

    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    const dist = Math.hypot(tx - agent.position.x, tz - agent.position.z);

    if (dist > cfg.reach) {
      if (!this.closing || Math.hypot(tx - this.aimedX, tz - this.aimedZ) > 1) this.approach(agent, t);
      return 'RUNNING';
    }

    if (!t.isVisibleNow && now - t.lastSeenAt > cfg.loseTargetSec) {
      clearCombatState(agent.id);
      return 'SUCCESS';
    }

    this.closing = false;
    if (this.swingCd > 0) {
      if (this.swingCd <= cfg.swingSeconds * 0.5) this.face(agent, tx, tz);
      return 'RUNNING';
    }

    this.swingCd = cfg.swingSeconds;
    agent.intent = { type: 'PLAY_ANIM', clip: SWING_CLIP, loop: false, anchored: true };
    this.strike(agent, t);
    return 'RUNNING';
  }

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
    // every other combat activity. Tam's own HP/downed record
    // (game/companion.ts) is owned by Enemies.tsx's damage path, not this
    // activity's to unwind.
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
      stopDistance: COMBAT.engageCompanion.approachStop,
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

  /** One blow, at Tam's own dedicated tier. Kill bookkeeping mirrors
   *  engage_threat's (kill recorded, loot dropped, player told) but
   *  deliberately WITHOUT `gainDefenderXp` — see this file's own header. */
  private strike(agent: Agent, t: Belief): void {
    const gs = useGameStore.getState();
    const target = liveTargetFor(t.entityId);
    if (!target) return;
    // live adjudication, exactly as engage_threat's/engage_threat_villager's
    // own strike() does: a swing thrown at a remembered position misses if
    // the raider has already stepped out of reach
    if (Math.hypot(target.mob.x - agent.position.x, target.mob.z - agent.position.z) > COMBAT.engageCompanion.reach) return;

    target.hp -= companionStrike();
    combatStateFor(agent.id).hits++;
    if (target.hp > 0 || target.mob.state === 'dying') return;
    target.mob.state = 'dying';
    target.mob.dieT = 0;
    gs.recordKill(target.kind);
    gs.addItems(lootFor(target), 'grant');
    gs.notify('Tam defeats a raider!', true);
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
/** Same straight-through ramp engage_threat/engage_threat_villager use: the
 *  bool gates already guarantee a real, near, undowned, dedicated combatant
 *  behind this number, so a little threat is just a little urgency. */
const threatCurve: Curve = { type: 'linear', m: 1, k: 1, b: 0, c: 0 };

export const ASSIST_LEADER: Action = {
  id: 'assist_leader',
  category: 'combat',
  weight: 3.0, // CATEGORY_WEIGHT.combat — engage_threat's own value, not follow_leader's 'companion' one
  interruptPriority: 8, // CATEGORY_INTERRUPT_PRIORITY.combat — clears follow_leader's 5 outright
  minDuration: 1.5, // engage_threat's own value: one swing's worth of commitment
  cooldown: 0,
  considerations: [
    {
      // The capability gate — Tam's own, distinct from both engage_threat's
      // `is_defender` and engage_threat_villager's courage/proximity/tier
      // set. See this file's own header for why none of those apply here.
      name: 'is_companion',
      input: (agent) => (agent.archetype === 'companion' ? 1 : 0),
      curve: boolCurve,
    },
    {
      name: 'not_downed',
      input: (agent) => (registerCompanionCombat(agent.id).state === 'downed' ? 0 : 1),
      curve: boolCurve,
    },
    { name: 'threat_present', input: (agent) => agent.bb.threatLevel, curve: threatCurve },
    {
      name: 'hostile_believed',
      input: (agent) => (threatOf(agent) ? 1 : 0),
      curve: boolCurve,
    },
    {
      // Verification fix — the REAL leash, as a scoring gate rather than a
      // one-off check inside the Activity's own update(). A bool return from
      // update() (SUCCESS/FAILURE) only ends THIS activity instance; it does
      // nothing to `assembleCandidates`' own next scoring pass, which reruns
      // every consideration fresh — so an update()-only check that returns
      // SUCCESS the instant Tam crosses leashDistance was confirmed live to
      // be no fix at all: `hostile_believed`/`threat_present` were both still
      // true a tick later (nothing about the belief changed), assist_leader
      // simply won again, and a brand-new Activity picked the chase right
      // back up — measured running Tam out to 43+ metres from the player, more
      // than double leashDistance, with the SUCCESS/restart cycle invisible
      // in play. Gating the ACTION itself is what actually sticks: past
      // leashDistance this scores the whole action to 0 (same bool-multiply
      // shape as `not_downed` above), so `follow_leader` (never gated by
      // this) wins the very next think tick and stays won — tier A/B/C think
      // at 10/5/2 Hz (lod.json), so the worst case is under half a second.
      name: 'within_leash',
      input: (agent) => (
        Math.hypot(playerState.x - agent.position.x, playerState.z - agent.position.z) <= COMBAT.engageCompanion.leashDistance ? 1 : 0
      ),
      curve: boolCurve,
    },
  ],
  createActivity: () => new AssistLeaderActivity(),
};
