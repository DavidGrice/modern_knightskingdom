// NPC_AI_SPEC §9 / §0.5 — what phase 7's combat actions are actually doing,
// in a form the debug overlay and the scene gizmos can read.
//
// An `Activity` instance is private to the agent running it (Reasoner.ts
// constructs one per win and drops it on the next), so there is nowhere for a
// debug view to look. §0.5 is not optional here ("if the scores aren't visible
// on screen, the layer isn't done") and a combat action's real question —
// "which believed hostile is it answering, and is the barn it picked actually
// between the two of them" — is spatial: it cannot be answered from the score
// list alone.
//
// So: a module map keyed by agent id, exactly the shape `perception/state.ts`
// and `core/Locomotion.ts` already use for their own per-agent internals, with
// the same `despawnHooks` cleanup (without it, every villager reassigned to
// 'defender' and despawned by rosterSync leaks one entry for the session).
// Deliberately NOT on the Blackboard: §3.2's Blackboard is belief/need state
// the reasoner scores AGAINST, and none of this is scored against anything.

import { despawnHooks } from '../core/AgentManager';

export interface CombatState {
  /** which combat action last wrote here — `null` once it aborted */
  mode: 'cover' | 'engage' | null;
  /** the belief id being answered (`enemy:<id>` / `noise:<what>`), never an
   *  entity handle: §3.3's rule is that combat reads beliefs, and holding a
   *  live reference here would quietly make that false */
  targetBeliefId: string | null;
  /** the believed position that choice was made against — `lastKnownPosition`
   *  at decision time, so a stale cover point next to a moved raider reads as
   *  the correct behaviour it is rather than as a bug */
  threatX: number;
  threatZ: number;
  /** where this agent decided to stand, and what it is standing behind */
  coverX: number;
  coverZ: number;
  /** the buildable type of the piece being used as cover, or a short reason
   *  string when there is none (`open ground`) */
  coverLabel: string;
  /** cover only — when the CURRENT run to that point began (AI clock), reset
   *  every time the cover choice is re-aimed. Read by `take_cover`'s own
   *  considerations, not just by the debug view: a run is honoured for
   *  `cover.commitSec` whatever threat does in the meantime, and a
   *  consideration is a pure function of (agent, ctx) with no access to the
   *  Activity instance running it — Reasoner.ts constructs that per win and
   *  keeps it private — so the phase of the run has to be readable from here.
   *  That makes this the one field in this file the game's behaviour depends
   *  on; everything else is genuinely debug-only. */
  coverStartedAt: number;
  /** cover only — false while still travelling (the committed phase), true
   *  once stood down and watching (the hysteresis phase) */
  coverArrived: boolean;
  /** engage only — seconds until the next swing lands */
  swingCd: number;
  /** engage only — real blows landed this session, the one number that says
   *  whether the damage path is wired or merely reachable */
  hits: number;
}

const states = new Map<string, CombatState>();

export function combatStateFor(id: string): CombatState {
  let s = states.get(id);
  if (!s) {
    s = {
      mode: null, targetBeliefId: null,
      threatX: 0, threatZ: 0, coverX: 0, coverZ: 0, coverLabel: '',
      coverStartedAt: 0, coverArrived: false,
      swingCd: 0, hits: 0,
    };
    states.set(id, s);
  }
  return s;
}

/** Debug-only read (§9's overlay/gizmos) — never creates an entry, so opening
 *  the panel cannot change what an agent does. */
export function peekCombatState(id: string): CombatState | undefined {
  return states.get(id);
}

/** Mark this agent as no longer in a combat action.
 *
 *  Must be called on the SUCCESS/FAILURE return paths as well as from
 *  `abort()`, and that is not symmetry for its own sake: `runReasoner` only
 *  calls `abort()` when an activity is REPLACED, never when it ends by
 *  returning SUCCESS (Reasoner.ts's own lifecycle, and the same asymmetry that
 *  left a stale `agent.intent` behind in phase 5.9). Without this, a villager
 *  who calmly stopped hiding keeps a cover leg drawn on the gizmo layer and a
 *  COMBAT row in the panel for the rest of the session — a debug view that
 *  lies about the current state is worse than none. */
export function clearCombatState(id: string): void {
  const s = states.get(id);
  if (!s) return;
  s.mode = null;
  s.targetBeliefId = null;
}

despawnHooks.push((id) => {
  states.delete(id);
});

// --- the alarm throttle ------------------------------------------------------
// Keyed by HOSTILE, not by villager: three farmers spotting the same raider is
// one piece of news, and `scoutReported` (game/defenders.ts) already
// established that shape for a scouting defender calling out what he sees.
// A plain Map rather than a Set because this one expires — a raider who
// wandered off and came back an hour later is worth shouting about again.
const alarmedAt = new Map<string, number>();

/** True at most once per `cooldownSec` per belief id. `now` is the AI clock,
 *  which `agentManager.clear()` resets to 0 on a new game — an entry stamped
 *  in the last session would otherwise suppress that hostile's first shout in
 *  the new one forever, so a stamp in the FUTURE is treated as expired. */
export function claimAlarm(beliefId: string, now: number, cooldownSec: number): boolean {
  const last = alarmedAt.get(beliefId);
  if (last !== undefined && last <= now && now - last < cooldownSec) return false;
  alarmedAt.set(beliefId, now);
  return true;
}
