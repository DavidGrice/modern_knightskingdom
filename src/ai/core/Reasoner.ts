// NPC_AI_SPEC.md §5.1/§5.2/§5.4 / PHASE_3_4_5_ACTUATION_AND_REASONER.md
// §5.2 — the utility reasoner's scoring core. This iteration (5.2) ships
// the types and `scoreAction` only; category weights/commitment (5.3),
// candidate assembly (5.4) and real actions (5.6+) land on top in later
// iterations — nothing here decides anything yet.

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

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkreason = { scoreAction };
}
