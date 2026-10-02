// CLN-16 · §5.3's commitment decision, split out of Reasoner.ts: given scored candidates and whatever is
// already running, which one wins this think tick (cooldowns, minDuration interrupts, momentum + switch
// threshold). Type-only imports — pure given a Blackboard and a Candidate list.

import type { Agent } from './Agent';
import type { Blackboard, ScoredAction } from './Blackboard';
import type { Action, Context } from './scoring';

// --- 5.3: commitment -------------------------------------------------------
const MOMENTUM = 1.25;
const SWITCH_THRESHOLD = 1.15;

/** An Action paired with its own freshly-computed score — 5.4's candidate
 *  assembly produces a list of these each think tick. Kept together
 *  (rather than `pickAction` taking bare `ScoredAction[]` plus a separate
 *  id->Action lookup) because `pickAction` needs `interruptPriority`/
 *  `minDuration`/`cooldown`, none of which `ScoredAction` itself carries —
 *  and every caller already has both halves at hand from `scoreAction`. */
export interface Candidate {
  action: Action;
  scored: ScoredAction;
  /** The exact Context this candidate was scored against — carries the
   *  bound `target` (§5.4's per-target expansion) through to `Activity.
   *  start()` when this candidate wins. `ScoredAction` alone can't carry
   *  this (it's a plain id/score/considerations summary, phase 1's own
   *  shape, unchanged since — deliberately not widened just for this). */
  ctx: Context;
}

/** §5.3/§5.6 (NPC_AI_SPEC) — the full commitment decision: which candidate
 *  actually wins this think tick, given whichever action (if any) is
 *  already running. Three independent mechanisms, all required per the
 *  spec's own wording:
 *
 *  1. Cooldowns — a candidate still on cooldown scores 0 regardless of its
 *     raw `scoreAction` result; it just completed and does not get to win
 *     again immediately.
 *  2. minDuration — while the running action's elapsed time is under its
 *     own `minDuration`, only a challenger with STRICTLY HIGHER
 *     `interruptPriority` can replace it (an emergency override — "combat
 *     interrupts smithing" — bypasses the switch threshold entirely, since
 *     requiring an urgent override to also out-score a momentum-boosted
 *     incumbent by 15% would risk it failing to interrupt when it most
 *     needs to). No other candidate can win during this window, no matter
 *     how high its own score is.
 *  3. Momentum + switch threshold — once minDuration has elapsed, the
 *     running action's score is boosted ×1.25 before comparison, and a
 *     challenger only replaces it by clearing that boosted score × 1.15 —
 *     the standard anti-flip-flop pair, independent of interruptPriority.
 *
 *  With nothing currently running, the highest-scoring eligible candidate
 *  wins outright — no momentum or threshold applies to a cold start. */
export function pickAction(candidates: Candidate[], agent: Agent, now: number): Candidate | null {
  const bb: Blackboard = agent.bb;
  // Performance pass (2026-07-28): with no cooldowns active at all — the
  // common case, most agents most of the time — this map() was allocating
  // a whole new array (and a new candidate object per cooling-down entry)
  // every think tick for no reason: bb.cooldowns.get(anything) can only
  // ever return undefined when the Map is empty, so the transform below is
  // the identity function in that case. Skipping straight to `candidates`
  // is behaviorally identical and allocates nothing.
  const eligible = bb.cooldowns.size === 0 ? candidates : candidates.map((c) => {
    const readyAt = bb.cooldowns.get(c.action.id);
    if (readyAt !== undefined && readyAt > now) {
      return { action: c.action, scored: { ...c.scored, score: 0 }, ctx: c.ctx };
    }
    return c;
  });
  // A zero (gated, cooling down, or genuinely undesired) score must never
  // win, however it arose — a cold start where every candidate ties at
  // zero (the fallback `!best` in the reduce below would otherwise just
  // take whichever came first in the array), or a running action that
  // just got gated with nothing positive-scoring around to replace it
  // (found live wiring up 5.6's real content: without this, flee_to_safety
  // kept "running" — Activity.update() still called every tick — long
  // after the raid it was fleeing from had already ended, because nothing
  // else had a positive score to beat its now-zero one with). `pickAction`
  // finding no acceptable candidate is a real, expected outcome, not an
  // edge case to special-case away.
  const result = pickRaw(eligible, bb, now);
  return result && result.scored.score > 0 ? result : null;
}

function pickRaw(eligible: Candidate[], bb: Blackboard, now: number): Candidate | null {
  if (eligible.length === 0) return null;

  const runningId = bb.currentActionId;
  // A target-bound action (gather_resource, haul_to_deposit) expands into
  // one candidate PER NEARBY TARGET sharing the same action.id (§5.4's own
  // per-target rule). Matching "the running candidate" by action.id alone
  // would grab an ARBITRARY same-action candidate — whichever sorts first
  // in this tick's fresh queryNearby order, which can shift tick to tick as
  // distances change — not necessarily the specific target this agent is
  // actually committed to. bb.reservation.targetId (set by the Activity's
  // own start()) is the real source of truth for that; found live running
  // a real agent through a dense grove for 60+ seconds (5.9) — the
  // arbitrary match would occasionally land on a DIFFERENT nearby tree that
  // happened to be gated for its own unrelated reasons that tick, making a
  // perfectly valid, still-reserved gather spuriously score 0 and drop the
  // winner to null. Actions with no targetKinds (flee_to_safety, sleep)
  // never set a reservation, so this falls back to matching by action.id
  // alone for them, unchanged from before this fix.
  const running = runningId
    ? eligible.find((c) => c.action.id === runningId
        && (!bb.reservation || !c.ctx.target || c.ctx.target.id === bb.reservation.targetId)) ?? null
    : null;

  if (!running) {
    return eligible.reduce<Candidate | null>(
      (best, c) => (!best || c.scored.score > best.scored.score ? c : best),
      null,
    );
  }

  const boostedScore = running.scored.score * MOMENTUM;
  const elapsed = now - bb.currentActionStartedAt;
  // A running action whose OWN fresh candidate this tick is hard-gated
  // (its precondition just became false — e.g. flee_to_safety's raid
  // ended, 5.6) is not "committed to, temporarily scoring low" — it is
  // genuinely invalid right now, and minDuration exists to protect a good
  // choice from a marginally-better distraction, not to keep running
  // something that can no longer run at all. Found wiring up real content
  // in 5.6; nothing in 5.1-5.5's synthetic verification ever hit this path
  // since none of those test actions were ever gated while running.
  const protectedByMinDuration = !running.scored.gated && elapsed < running.action.minDuration;
  const runningAsBest: Candidate = { action: running.action, scored: { ...running.scored, score: boostedScore }, ctx: running.ctx };

  if (protectedByMinDuration) {
    // An interrupt override is absolute, not a score contest against the
    // running action — "combat interrupts smithing" regardless of how high
    // smithing's own (momentum-boosted) score is. Eligible challengers are
    // only compared AGAINST EACH OTHER (the highest-priority-clearing score
    // wins among them); the running action is the fallback only when none
    // qualify at all, never a baseline those challengers must also clear.
    let bestInterrupt: Candidate | null = null;
    for (const c of eligible) {
      // exclude ONLY the specific running candidate (same action AND same
      // target), not every candidate sharing its action.id — a different
      // nearby target with the same action.id is a real, distinct
      // alternative, not a duplicate of the one currently held
      if (c === running) continue;
      if (c.action.interruptPriority <= running.action.interruptPriority || c.scored.score <= 0) continue;
      if (!bestInterrupt || c.scored.score > bestInterrupt.scored.score) bestInterrupt = c;
    }
    return bestInterrupt ?? runningAsBest;
  }

  let best = runningAsBest;
  for (const c of eligible) {
    if (c === running) continue;
    if (c.scored.score > boostedScore * SWITCH_THRESHOLD && c.scored.score > best.scored.score) {
      best = c;
    }
  }
  return best;
}

/** §5.3 — call when an Activity completes (SUCCESS), not on every think
 *  tick: writes the cooldown `pickAction` above checks. A zero/negative
 *  `cooldownSeconds` (the common case — most actions don't have one) is a
 *  deliberate no-op rather than writing a cooldown that immediately reads
 *  as expired anyway. */
export function startCooldown(bb: Blackboard, actionId: string, cooldownSeconds: number, now: number): void {
  if (cooldownSeconds <= 0) return;
  bb.cooldowns.set(actionId, now + cooldownSeconds);
}
