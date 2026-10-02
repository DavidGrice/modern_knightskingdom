// CLN-15 · the approach / face / swing state machine behind the three melee
// combat actions: `engage_threat` (a sworn defender), `engage_threat_villager`
// (an ordinary villager fighting back) and `assist_leader` (Tam). It was
// written once, in engageThreat.ts, and then copied twice "structured exactly
// like" it — three classes of ~88 lines that differed in seven.
//
// What stays in each action's own file is everything that makes it a different
// ACTION: its considerations (who may fight, and when), its weight and
// priorities, its own block of config/combat.json, how hard it hits and who is
// credited with the kill. Those arrive here as a `MeleeFighter`; nothing below
// knows which of the three it is running for.
import { resolveEnemyKill, useEnemyStore, type EnemyData, type KillCause } from '@/game/combat';
import { playerState } from '@/game/playerState';
import type { EngageConfig } from '../config/types';
import type { Agent } from '../core/Agent';
import type { Belief } from '../core/Blackboard';
import type { Activity, ActivityStatus, Context } from '../core/Reasoner';
import { nearestNoticedHostile } from '../perception/Belief';
import { clearCombatState, combatStateFor } from './combatState';

/** Reaction clips deliberately reserved OUT of `idle_fidget`'s pool (see
 *  ambient.ts's own comment on why it excludes the combat-flavoured ones) —
 *  this is what they were being kept for. */
const SWING_CLIP = 'anim_g_swordswish';

/** The hostile this agent is answering: the nearest one it has actually
 *  noticed. Exported because each action's own `hostile_believed` gate asks
 *  the same question the Activity does, and must get the same answer. */
export function threatOf(agent: Agent): Belief | null {
  return nearestNoticedHostile(agent.bb, agent.position.x, agent.position.z);
}

/** `enemy:17` -> the live `EnemyData`, or null for a `noise:` belief (nothing
 *  to hit — an unattributed sound has no entity behind it) and for one whose
 *  mob has already died.
 *
 *  This is the ONE place the state machine touches a live entity, and only to
 *  resolve a blow that is already being thrown. §3.3's rule — "combat and search
 *  behavior must read `lastKnownPosition`, never the live transform" — governs
 *  where the agent GOES and what it faces, and every one of those reads goes
 *  through the belief above. Whether a swing actually connects cannot be
 *  answered from a memory: the world adjudicates that, exactly as
 *  `Defenders.tsx`'s own `inRange` test does. */
function liveTargetFor(beliefId: string): EnemyData | null {
  if (!beliefId.startsWith('enemy:')) return null;
  const id = Number(beliefId.slice(6));
  const e = useEnemyStore.getState().enemies.find((x) => x.id === id);
  return e && e.mob.state !== 'dying' ? e : null;
}

/** What differs between the three fighters. */
export interface MeleeFighter {
  /** This fighter's own block of config/combat.json — reach, approach stop,
   *  swing rhythm, how long a lost target is remembered. `leashDistance` is
   *  Tam's alone (`engageCompanion`): how far from the PLAYER he may fight. */
  config: EngageConfig & { leashDistance?: number };
  /** Whether the fighter has been struck down, for the two whose HP this layer
   *  can see (a villager's villagerCombat record, Tam's companion one). Left
   *  out for a sworn defender: `defenderState` is Defenders.tsx's own. */
  isDowned?: (agent: Agent) => boolean;
  /** One blow's worth: how hard this agent hits, and who the kill is credited
   *  to if it lands one — or null when the agent cannot strike at all (it has
   *  left the roster since the action was chosen). The damage formula is the
   *  one thing that must never be shared between the three. */
  blow: (agent: Agent) => { damage: number; cause: KillCause } | null;
}

export class MeleeEngageActivity implements Activity {
  private swingCd = 0;
  private aimedX = 0;
  private aimedZ = 0;
  private facingX = 0;
  private facingZ = 0;
  private closing = false;

  constructor(private readonly fighter: MeleeFighter) {}

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
    const cfg = this.fighter.config;
    // A blow landed (Enemies.tsx) between this tick's scoring and this
    // Activity's own next think — each action's `not_downed` gate only stops a
    // NEW engage from starting, it cannot reach back and cancel one already
    // mid-swing this same tick. SUCCESS, not RUNNING: ending cleanly here is
    // what makes the "gated running action loses its protection" rule
    // (documented in flee.ts/takeCover.ts) actually bite on the very next
    // pickAction instead of leaving one more strike() to land while downed.
    if (this.fighter.isDowned?.(agent)) { clearCombatState(agent.id); return 'SUCCESS'; }
    if (this.swingCd > 0) this.swingCd -= dt;
    combatStateFor(agent.id).swingCd = this.swingCd; // §9's readout, see combatState.ts
    const t = threatOf(agent);
    // Nothing believed hostile is left above the noticed threshold — the fight
    // is over or the memory has faded. SUCCESS, not FAILURE: giving up on a
    // target that stopped existing is the action working, not failing.
    if (!t) { clearCombatState(agent.id); return 'SUCCESS'; }

    // Tam's leash, the per-frame half. `assist_leader`'s own `within_leash`
    // consideration is what stops the action being RE-SELECTED past
    // leashDistance — confirmed live to be the part that actually matters (see
    // that consideration's own comment for why a bare update()-time
    // `return 'SUCCESS'` alone did nothing: the very next think tick just won
    // the same Action fresh and picked the chase back up, measured running Tam
    // out to 43+ m before that gate existed). This half is the difference
    // between that and instant: update() runs every render frame, think only
    // at the agent's tier cadence (10/5/2 Hz), so without also clearing
    // `agent.intent` here, Locomotion would keep stepping the CURRENT stale
    // MOVE_TO for up to another 0.5s (tier C) after crossing the line, same as
    // the downed check above stops one more strike from landing in the gap
    // before its gate bites.
    if (cfg.leashDistance !== undefined
      && Math.hypot(playerState.x - agent.position.x, playerState.z - agent.position.z) > cfg.leashDistance) {
      agent.intent = null;
      clearCombatState(agent.id);
      return 'SUCCESS';
    }

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
    // flee_to_safety/take_cover. The fighter's own HP record (defenderState,
    // villagerCombat, companion) is owned by whoever damages it — Defenders.tsx
    // and Enemies.tsx — and is not this activity's to unwind.
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
      stopDistance: this.fighter.config.approachStop,
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

  /** One blow. What a kill then sets in motion is resolveEnemyKill's, under
   *  the cause the fighter names — the same call Defenders.tsx's own cascade
   *  makes. */
  private strike(agent: Agent, t: Belief): void {
    const blow = this.fighter.blow(agent);
    if (!blow) return;
    const target = liveTargetFor(t.entityId);
    if (!target) return;
    // the live adjudication: a swing thrown at a remembered position misses if
    // the raider has already stepped out of reach, which is exactly what makes
    // reading beliefs rather than transforms cost something
    if (Math.hypot(target.mob.x - agent.position.x, target.mob.z - agent.position.z) > this.fighter.config.reach) return;

    target.hp -= blow.damage;
    combatStateFor(agent.id).hits++;
    if (target.hp > 0 || target.mob.state === 'dying') return;
    resolveEnemyKill(target, blow.cause);
  }
}
