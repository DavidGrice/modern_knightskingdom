// NPC_AI_SPEC.md §5.1/§5.2/§5.4/§5.6 / PHASE_3_4_5_ACTUATION_AND_REASONER.md
// §5.2/§5.3 — the utility reasoner's scoring core. 5.2 shipped the types
// and `scoreAction`; this iteration (5.3) adds category weight/
// interruptPriority reference tables and commitment (momentum, minDuration
// interrupt override, switch threshold, cooldowns). Candidate assembly
// (5.4) and real actions (5.6+) land on top in later iterations — nothing
// here decides anything against real game content yet.

import { evalCurve, type Curve } from './curves';
import type { Agent } from './Agent';
import type { Target } from './TargetRegistry';
import type { Blackboard, ScoredAction, ScoredConsideration } from './Blackboard';

/** §5.4 (PHASE_3_4_5) / §5.1 (NPC_AI_SPEC) — passed to every Consideration's
 *  `input()` and to `scoreAction` itself. `target` is set for a per-target
 *  expanded candidate (5.4's "one candidate per target" rule) and `null`
 *  for a pure intrinsic action (idle, wander) that isn't bound to anything.
 *  `now` is `AgentManager.now` (the AI clock), not wall time — matching
 *  every other timestamp already used across this system (`Agent.
 *  intentSetAt`, `bb.currentActionStartedAt`, cooldowns). */
export interface Context {
  target: Target | null;
  now: number;
}

/** §5.2 — one normalized input passed through a response curve. `input`
 *  MUST return 0..1; `evalCurve` clamps again defensively, but a
 *  consideration author should never rely on that clamp doing real work. */
export interface Consideration {
  name: string;
  input: (agent: Agent, ctx: Context) => number;
  curve: Curve;
}

/** §5.3's weight table — category is what selects the weight, not a
 *  per-action override, so two `work` actions can't quietly disagree about
 *  how important "work" is. */
export type Category = 'survival' | 'combat' | 'companion' | 'work' | 'needs' | 'social' | 'ambient';

/** §5.3/§5.4 — a scoreable candidate. `targetKinds` present means 5.4's
 *  candidate assembly expands this into one candidate per nearby target of
 *  those kinds (`gather_resource`, `haul_to_deposit`); absent means a pure
 *  intrinsic with no target to bind (`idle`, `wander`, `flee_to_safety`,
 *  `sleep`). `minDuration`/`cooldown` are seconds of game time, read
 *  against `bb.currentActionStartedAt`/`bb.cooldowns` (5.3). */
export interface Action {
  id: string;
  category: Category;
  weight: number;
  interruptPriority: number;
  minDuration: number;
  cooldown: number;
  considerations: Consideration[];
  targetKinds?: string[];
}

/** §5.2 — the IAUS compensation factor: without it, an action with more
 *  considerations is unfairly penalized purely for having more of them to
 *  multiply together. A consideration that evaluates to exactly 0 is a
 *  hard gate — stop immediately (matching the reference algorithm's own
 *  early-out; considerations after the gate are never evaluated, so
 *  `ScoredAction.considerations` only ever contains what actually ran, not
 *  a fabricated full list). Verbatim from `NPC_AI_SPEC.md` §5.4 /
 *  `PHASE_3_4_5_ACTUATION_AND_REASONER.md` §5.2, written against this
 *  repo's real `Curve`/`ScoredAction` types instead of the spec's untyped
 *  JS — with one defensive addition neither spec version has: a
 *  zero-consideration action would divide by zero computing `modFactor`
 *  (`1 - 1/0 = -Infinity`) in the literal pseudocode; guarded here since an
 *  action with no considerations is a legitimate (if unusual) always-on
 *  candidate, not something that should silently poison its own score. */
export function scoreAction(action: Action, agent: Agent, ctx: Context): ScoredAction {
  const n = action.considerations.length;
  const modFactor = n > 0 ? 1 - 1 / n : 1;
  let score = 1;
  const scored: ScoredConsideration[] = [];
  let gated = false;
  for (const c of action.considerations) {
    const x = c.input(agent, ctx);
    const y = evalCurve(c.curve, x);
    scored.push({ name: c.name, input: x, output: y });
    if (y === 0) {
      gated = true;
      score = 0;
      break;
    }
    score *= y + (1 - y) * modFactor * y;
  }
  return { actionId: action.id, score: score * action.weight, considerations: scored, gated };
}

// --- 5.3: category reference tables --------------------------------------
// §5.3's own weight table, plus interruptPriority's proposed starting
// values. These are REFERENCE defaults for content authors, not something
// scoreAction/pickAction derive automatically — Action.weight/
// interruptPriority stay real per-action fields (5.2), since a real action
// can deliberately deviate from its category's default (haul_to_deposit's
// weight is 1.4, not work's 1.2 — PHASE_2_NAVIGATION_AND_GATHERING.md
// §3.4 calls that gap load-bearing; sleep's interruptPriority is 3, not
// needs' default 1 — §5.6). Exported so a future action-authoring pass
// (5.6+) has a named constant to start from instead of a magic number.
export const CATEGORY_WEIGHT: Record<Category, number> = {
  survival: 4.0, combat: 3.0, companion: 2.0, work: 1.2, needs: 1.0, social: 0.8, ambient: 0.3,
};
export const CATEGORY_INTERRUPT_PRIORITY: Record<Category, number> = {
  survival: 10, combat: 8, companion: 5, work: 1, needs: 1, social: 1, ambient: 0,
};

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
  const eligible = candidates.map((c) => {
    const readyAt = bb.cooldowns.get(c.action.id);
    if (readyAt !== undefined && readyAt > now) {
      return { action: c.action, scored: { ...c.scored, score: 0 } };
    }
    return c;
  });
  if (eligible.length === 0) return null;

  const runningId = bb.currentActionId;
  const running = runningId ? eligible.find((c) => c.action.id === runningId) ?? null : null;

  if (!running) {
    return eligible.reduce<Candidate | null>(
      (best, c) => (!best || c.scored.score > best.scored.score ? c : best),
      null,
    );
  }

  const boostedScore = running.scored.score * MOMENTUM;
  const elapsed = now - bb.currentActionStartedAt;
  const protectedByMinDuration = elapsed < running.action.minDuration;
  const runningAsBest: Candidate = { action: running.action, scored: { ...running.scored, score: boostedScore } };

  if (protectedByMinDuration) {
    // An interrupt override is absolute, not a score contest against the
    // running action — "combat interrupts smithing" regardless of how high
    // smithing's own (momentum-boosted) score is. Eligible challengers are
    // only compared AGAINST EACH OTHER (the highest-priority-clearing score
    // wins among them); the running action is the fallback only when none
    // qualify at all, never a baseline those challengers must also clear.
    let bestInterrupt: Candidate | null = null;
    for (const c of eligible) {
      if (c.action.id === runningId) continue;
      if (c.action.interruptPriority <= running.action.interruptPriority || c.scored.score <= 0) continue;
      if (!bestInterrupt || c.scored.score > bestInterrupt.scored.score) bestInterrupt = c;
    }
    return bestInterrupt ?? runningAsBest;
  }

  let best = runningAsBest;
  for (const c of eligible) {
    if (c.action.id === runningId) continue;
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

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkreason = {
    scoreAction, pickAction, startCooldown, CATEGORY_WEIGHT, CATEGORY_INTERRUPT_PRIORITY,
  };
}
