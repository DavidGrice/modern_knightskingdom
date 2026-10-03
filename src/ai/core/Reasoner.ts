// NPC_AI_SPEC.md §5.1/§5.2/§5.4/§5.6/§5.7 / PHASE_3_4_5_ACTUATION_AND_REASONER.md
// §5.2/§5.3/§5.4 — the utility reasoner (history below; since CLN-16 most of
// what it describes lives in scoring.ts/commitment.ts — see the note after it). 5.2 shipped the
// types and `scoreAction`; 5.3 added category reference tables and
// commitment (momentum, minDuration interrupt override, switch threshold,
// cooldowns); this iteration (5.4) adds candidate assembly and the
// `Activity` type Agent needs a real home for. Real actions (5.6+) land on
// top in a later iteration — nothing here decides anything against real
// game content yet, only synthetic actions used for verification.
//
// CLN-16 · the pure scoring core (types, scoreAction, category tables) now lives in scoring.ts and the
// commitment decision (pickAction/startCooldown) in commitment.ts; this file keeps only the parts that
// genuinely need TargetRegistry/Agent/Memory — candidate assembly, the per-tick loop and the registry.
// The public types are re-exported below so every `from '../core/Reasoner'` import is unchanged.

import type { Agent } from './Agent';
import { targetRegistry } from './TargetRegistry';
import { archetypeDef } from '../config';
import { recordActivitySuccess } from './Memory';
import { exposeDebug } from '@/lib/debugHooks';
import { scoreAction, CATEGORY_WEIGHT, CATEGORY_INTERRUPT_PRIORITY, type Action, type Context } from './scoring';
import { pickAction, startCooldown, type Candidate } from './commitment';

export type { Action, Activity, ActivityStatus, Context } from './scoring';

// --- 5.4: candidate assembly ------------------------------------------------

/** §5.4 — every think tick's full candidate list, from two sources:
 *
 *  1. Intrinsic — `action.id` present in the agent's own archetype
 *     `intrinsic` list (archetypes.json) and no `targetKinds`: scored once,
 *     `ctx.target = null` (nothing to bind — `idle`, `wander`).
 *  2. Per-target expanded — `action.id` present in `intrinsic` AND
 *     `targetKinds` set: `TargetRegistry.queryNearby` finds nearby targets
 *     of those kinds, and ONE candidate is created PER TARGET, each scored
 *     independently with its own `ctx.target` bound — `gather_resource@
 *     node:17` and `gather_resource@node:22` never share a score.
 *     Scoring the action once against an arbitrarily-chosen target is the
 *     named failure mode here (§5.4) — this function exists specifically
 *     so no caller has to get that right by hand.
 *
 *  `allActions` is passed in rather than pulled from some global registry:
 *  this iteration has no real actions to register yet (5.6/5.7's job) —
 *  passing the set explicitly keeps this function honest about having zero
 *  content-authoring opinions of its own, and lets 5.5's synthetic
 *  verification exercise it with two trivial actions before anything real
 *  exists. An action whose id isn't in the archetype's `intrinsic` list is
 *  skipped entirely — including its `TargetRegistry` query — so an
 *  archetype that was never offered `gather_resource` (a `companion`, say)
 *  never even looks for a target to bind it to. */
// Performance pass (2026-07-28): `new Set(archetypeDef(...).intrinsic)`
// used to run fresh every single think tick, for every agent — but an
// archetype's intrinsic list is static config data (archetypes.json),
// never mutated at runtime, so the same Set can be built once per
// archetype and reused forever. Module-level cache, same pattern as
// AnchorRule's own fishing-radius memoization in config/index.ts.
const intrinsicSetCache = new Map<string, Set<string>>();
function intrinsicSetFor(archetype: string): Set<string> {
  let s = intrinsicSetCache.get(archetype);
  if (!s) {
    s = new Set(archetypeDef(archetype).intrinsic);
    intrinsicSetCache.set(archetype, s);
  }
  return s;
}

function assembleCandidates(
  allActions: Action[], agent: Agent, now: number, queryRadius = 40,
): Candidate[] {
  const intrinsicIds = intrinsicSetFor(agent.archetype);
  const out: Candidate[] = [];
  for (const action of allActions) {
    if (!intrinsicIds.has(action.id)) continue;
    if (action.targetKinds && action.targetKinds.length > 0) {
      const targets = targetRegistry.queryNearby(
        agent.position.x, agent.position.z, queryRadius, action.targetKinds, agent.region,
      );
      for (const target of targets) {
        const ctx: Context = { target, now };
        out.push({ action, scored: scoreAction(action, agent, ctx), ctx });
      }
    } else {
      const ctx: Context = { target: null, now };
      out.push({ action, scored: scoreAction(action, agent, ctx), ctx });
    }
  }
  return out;
}

// --- 5.5/5.6: the full per-tick loop, now with real Activity lifecycle -----

/** §5.0/§5.5/§5.6 — the real per-think-tick entry point: assemble this
 *  tick's candidates, score them, let commitment decide the winner, and
 *  run its Activity. Writes `bb.lastScores` (§9's overlay already renders
 *  this — built in phase 1, waiting ever since for something to populate
 *  it) and `bb.currentActionId`/`currentActionStartedAt`.
 *
 *  Activity lifecycle (new in 5.6 — 5.5 deliberately left this out, no
 *  real Activity existed yet to orchestrate):
 *  - No winner at all (every candidate gated/cooling, or the candidate
 *    list is empty): abort whatever was running, if anything, and clear
 *    both `currentActivity` and `currentActionId`.
 *  - Winner changed from what was running: abort the old Activity (if
 *    any), construct and `start()` the new one via `action.
 *    createActivity()` (absent means a real no-op — the action "wins" but
 *    nothing happens beyond bookkeeping, same as every 5.1-5.5 synthetic
 *    test action).
 *  - Every tick the same Activity keeps winning: call its `update(agent,
 *    dt)`. `SUCCESS`/`FAILURE` ends it — clears `currentActivity`/
 *    `currentActionId` and starts its cooldown (`action.cooldown`,
 *    `startCooldown`) so it doesn't win again immediately; `RUNNING` does
 *    nothing further this tick.
 *
 *  `actions` is passed in, same reasoning as `assembleCandidates` — this
 *  function has no content-authoring opinions of its own. `Agent.think()`
 *  calls this with the real, permanent registry (`src/ai/actions`) and its
 *  own `elapsed` as `dt`. */
function runReasoner(agent: Agent, actions: Action[], now: number, dt: number): void {
  const candidates = assembleCandidates(actions, agent, now);
  agent.bb.lastScores = candidates.map((c) => c.scored);
  const winner = pickAction(candidates, agent, now);

  if (!winner) {
    if (agent.currentActivity) {
      agent.currentActivity.abort(agent);
      agent.currentActivity = null;
    }
    agent.bb.currentActionId = null;
    // Found in the final validation pass (5.9), not by any single-agent
    // test: a natural SUCCESS (not abort/interrupt) never touches
    // agent.intent — only abort() does, and finish() (both gather.ts and
    // haul.ts) deliberately doesn't, since it has no opinion on movement.
    // SUCCESS's own handling further down this function already sets
    // agent.currentActivity = null before this branch can ever run again,
    // so the `if (agent.currentActivity)` guard above is false and abort()
    // is never reached — leaving whatever intent the Activity last emitted
    // (commonly a PLAY_ANIM swing/deposit animation) stuck forever. Every
    // renderer's own cascade (Villagers.tsx, Npc.tsx) treats ANY non-null
    // intent as authoritative and holds position for it unconditionally,
    // with no way to tell "still running" from "reasoner moved on" —
    // so a genuinely-idle agent (nothing left to do: sack full, no
    // reachable stockpile, no raid, daytime) visibly froze in place
    // forever instead of falling through to the old cascade's own
    // fallback behavior. "No winner" is the one place that can
    // authoritatively state nothing is running, so it must always leave a
    // clean signal behind, not just when this tick happened to inherit a
    // still-live activity to abort.
    agent.intent = null;
    return;
  }

  if (winner.action.id !== agent.bb.currentActionId) {
    if (agent.currentActivity) agent.currentActivity.abort(agent);
    agent.bb.currentActionId = winner.action.id;
    agent.bb.currentActionStartedAt = now;
    agent.currentActivity = winner.action.createActivity?.() ?? null;
    agent.currentActivity?.start(agent, winner.ctx);
  }

  if (agent.currentActivity) {
    const status = agent.currentActivity.update(agent, dt, now);
    if (status === 'SUCCESS' || status === 'FAILURE') {
      // Wave 42 (E6) — §11.2's "completed activities append to a
      // memoryStream", SUCCESS only: a FAILURE (a blocked target, a decayed
      // belief) is not something that actually happened, so it earns no
      // record. `recordActivitySuccess` itself filters further, down to the
      // small set of notable action ids (core/Memory.ts's own header).
      if (status === 'SUCCESS') recordActivitySuccess(agent.bb, winner.action.id, now);
      startCooldown(agent.bb, winner.action.id, winner.action.cooldown, now);
      agent.currentActivity = null;
      agent.bb.currentActionId = null;
    }
  }
}

// --- 5.6: the real registry, reached WITHOUT Agent.ts ever importing
// src/ai/actions directly --------------------------------------------------

let registeredActions: Action[] = [];

/** §5.6 — how real content reaches `Agent.think()` without `Agent.ts`
 *  itself ever statically importing `src/ai/actions`. That seems like an
 *  odd thing to avoid, and it would have been fine as a plain `import {
 *  ACTIONS } from '../actions'` — except it genuinely broke the app the
 *  first time it was tried, with a real `Cannot access 'useGameStore'
 *  before initialization` error, not a hypothetical one. Root cause:
 *  `Agent.ts` already sits deep in a cycle `gameStore.ts` itself is part
 *  of (via `sync/rosterSync.ts`/`sync/courtSync.ts` → `AgentManager.ts` → `Agent.ts`,
 *  already safe — confirmed by a real production build back in 4.1,
 *  confined to a function body). Once `flee.ts`/`sleep.ts` (5.6's first
 *  real actions) needed `useGameStore`/`useEnemyStore`/`worldEnv` of their
 *  own, importing them via `Agent.ts → actions/index.ts → flee.ts →
 *  gameStore.ts` added a SECOND, independent edge into that same cycle —
 *  and two edges into one target from a module already this deep in a
 *  cycle was what actually broke module evaluation order, not the mere
 *  existence of a cycle (5.1-5.5 each added their own without incident).
 *
 *  Fixed by moving the registry OUT of Agent.ts's own import graph
 *  entirely: `actions/index.ts` calls `registerActions()` at its own
 *  module load, reached via a side-effect import from `AiRuntime.tsx`
 *  (the same pattern `AnchorResolution.ts` and this file's own §5.2
 *  addition already use) — a leaf consumer nothing else imports back, so
 *  it can safely sit downstream of `gameStore.ts` without closing any
 *  loop through `Agent.ts` at all. `Agent.think()` calls `tickReasoner`
 *  below, never touching `src/ai/actions` directly. */
export function registerActions(actions: Action[]): void {
  registeredActions = actions;
}

/** The real per-think-tick call `Agent.think()` makes — `runReasoner`
 *  against whatever `registerActions()` last set, defaulting to `[]`
 *  (fully inert) until `src/ai/actions` has loaded and registered itself. */
export function tickReasoner(agent: Agent, now: number, dt: number): void {
  runReasoner(agent, registeredActions, now, dt);
}

exposeDebug('__kkreason', {
  scoreAction, pickAction, startCooldown, assembleCandidates, runReasoner,
  registerActions, tickReasoner, CATEGORY_WEIGHT, CATEGORY_INTERRUPT_PRIORITY,
});
