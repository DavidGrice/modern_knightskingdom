// CLN-16 · the pure half of the utility reasoner, split out of Reasoner.ts: the Action/Consideration/
// Context/Activity types, IAUS scoring (`scoreAction`) and §5.3's category reference tables. Its only
// runtime import is curves.ts — no TargetRegistry/gameStore pull — so it can be imported standalone.
// History and spec references for everything below are in each declaration's own comment.

import { evalCurve, type Curve } from './curves';
import type { Agent } from './Agent';
import type { Target } from './TargetRegistry';
import type { ScoredAction, ScoredConsideration } from './Blackboard';

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
interface Consideration {
  name: string;
  input: (agent: Agent, ctx: Context) => number;
  curve: Curve;
}

/** §5.3's weight table — category is what selects the weight, not a
 *  per-action override, so two `work` actions can't quietly disagree about
 *  how important "work" is. */
type Category = 'survival' | 'combat' | 'companion' | 'work' | 'needs' | 'social' | 'ambient';

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
  /** §5.6 — the real behavior this action runs when it wins. Optional:
   *  5.1–5.5's synthetic verification actions never needed one (only
   *  scoring/assembly/commitment were under test), but every real action
   *  from 5.6 on has one. Absent means winning does nothing beyond
   *  recording `bb.currentActionId` — a deliberate no-op, not an error. */
  createActivity?: () => Activity;
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

/** §5.4 — the winning action's actual behavior. A small state object,
 *  not a class hierarchy — this repo's scale doesn't need one (NPC_AI_SPEC
 *  §5.7's own reasoning). `start`/`update` emit Intent (never touch
 *  position/transform directly — §0.1's rule), `abort` MUST release
 *  whatever `bb.reservation` it holds; nothing here implements this yet,
 *  it's a real home for 5.6's `FleeToSafety`/`Sleep` and 5.7's
 *  `GatherAtNode`/`HaulToDeposit` to land in. */
export type ActivityStatus = 'RUNNING' | 'SUCCESS' | 'FAILURE';
export interface Activity {
  start(agent: Agent, ctx: Context): void;
  /** `now` is the SAME clock `runReasoner`'s own `now` parameter carries —
   *  added in phase 5, iteration 5.9, when `GatherAtNode`/`HaulToDeposit`
   *  needed a real timestamp for `bb.blockedTargets` (Blackboard.ts) and
   *  `agentManager.now` turned out to be the wrong one to reach for: it
   *  freezes while the game is paused (by design — the AI clock must stop
   *  with it), but every direct-call test in this whole suite drives
   *  `runReasoner` with its own hand-rolled, still-advancing `now` while
   *  paused (the established pattern for fast, accelerated-time tests) —
   *  the two clocks only coincide in real gameplay, where `Agent.think()`
   *  is the sole caller and both derive from the same scheduler. Threading
   *  the actual value through here, rather than an Activity reaching for
   *  some ambient clock of its own, is correct under both callers. */
  update(agent: Agent, dt: number, now: number): ActivityStatus;
  abort(agent: Agent): void;
}
