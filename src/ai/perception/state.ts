// NPC_AI_SPEC §6 — per-agent SENSOR bookkeeping, deliberately not on the
// Blackboard.
//
// `Blackboard` is belief/need state the reasoner scores against (its own
// header says so, and §3.2 agrees); a round-robin LOS cursor and a "which
// sound sequence have I already heard" watermark are neither — they are
// sensor internals with exactly one reader each. `Locomotion.ts` already set
// this precedent for the actuation side (its per-agent `steerState` /
// `anchorCache` maps live in the module, keyed by agent id, cleaned up
// through `AgentManager`'s `despawnHooks`) and this is the same shape for the
// perception side, cleaned up the same way — otherwise every villager
// reassigned to `defender` and despawned by `rosterSync` would leak one entry
// here for the rest of the session.
//
// None of it is persisted. Neither is the rest of the Blackboard (`SaveGame`
// has never carried an AI field — beliefs, needs, cooldowns and reservations
// are all rebuilt from scratch on load), so phase 6 adds no save field at
// all: a loaded villager simply perceives the world again over the next
// second or two, which is the correct behaviour anyway. Nothing about a
// save's shape changes, so nothing about backward compatibility can break.

import { PERCEPTION } from '../config';
import { despawnHooks } from '../core/AgentManager';
import { latestSoundSeq } from './sounds';

export interface PerceptionState {
  /** seconds banked toward the next perceive tick (§6.1's own update rate,
   *  slower than the think rate that drives it) */
  perceiveTimer: number;
  /** game time of the previous perceive tick; -1 until the first one, so the
   *  confidence ramp's first `dt` is the perceive PERIOD rather than however
   *  long this agent happened to exist before its first tick */
  lastPerceiveAt: number;
  /** §3.3's reaction delay, rolled once per agent from
   *  `belief.reactionMin/MaxSec` — randomised per agent precisely so a row of
   *  villagers does not all flinch on the same frame */
  reactionTime: number;
  /** §3.3's "when a belief first crosses the noticed threshold": belief id ->
   *  the game time it crossed. Cleared when it falls back below, so a target
   *  that ducks out of sight and returns pays the delay again. */
  noticedAt: Map<string, number>;
  /** §6.1's round-robin position through the candidate list, so a per-tick
   *  LOS budget defers checks rather than permanently starving the tail */
  losCursor: number;
  /** §6.2 — the newest sound sequence this agent has already consumed */
  lastSoundSeq: number;

  // --- §9 debug readouts, written every perceive tick ---
  losChecks: number;
  seenCount: number;
  heardCount: number;
  /** the raw, pre-smoothing §6.3 output — seeing this next to the smoothed
   *  `bb.threatLevel` is the only way to tell "the smoothing is slow" from
   *  "the derivation is wrong" (§9's own input-AND-output rule, applied to
   *  threat instead of to considerations) */
  threatTarget: number;
}

const states = new Map<string, PerceptionState>();

export function perceptionStateFor(id: string): PerceptionState {
  let s = states.get(id);
  if (!s) {
    const b = PERCEPTION.belief;
    s = {
      perceiveTimer: 0,
      lastPerceiveAt: -1,
      reactionTime: b.reactionMinSec + Math.random() * (b.reactionMaxSec - b.reactionMinSec),
      noticedAt: new Map(),
      losCursor: 0,
      // a freshly spawned agent is deaf to everything that happened before it
      // existed, rather than hearing the last two seconds of a fight it was
      // never present for
      lastSoundSeq: latestSoundSeq(),
      losChecks: 0,
      seenCount: 0,
      heardCount: 0,
      threatTarget: 0,
    };
    states.set(id, s);
  }
  return s;
}

/** Debug-only read (§9's gizmos/overlay) — never creates an entry, so opening
 *  the panel cannot change what the simulation does. */
export function peekPerceptionState(id: string): PerceptionState | undefined {
  return states.get(id);
}

// Registered at module load, exactly like Locomotion.ts's own cleanup hook —
// see `despawnHooks`' comment in AgentManager.ts for why the dependency runs
// this direction (perception imports AgentManager, never the reverse).
despawnHooks.push((id) => {
  states.delete(id);
});
