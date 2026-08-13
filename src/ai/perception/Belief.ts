// NPC_AI_SPEC §3.3 — the decaying knowledge record's own operations.
//
// The `Belief` TYPE itself already lives on `core/Blackboard.ts` (written in
// phase 1, alongside `bb.beliefs`/`bb.threatLevel`, and matching §3.3 field
// for field) — nothing about it needed changing for this phase, so it is not
// re-declared here. What was missing was any code that ever wrote one:
// grepping the tree before this phase, `bb.beliefs.set(...)` had exactly zero
// call sites and every `not_threatened` consideration in `src/ai/actions`
// (gather / haul / farm / seek_deposit / notice / ambient) was reading a
// `threatLevel` that was structurally pinned at 0 forever.
//
// This file owns three things: the entity-id scheme, upsert, and decay.

import * as THREE from 'three';
import { PERCEPTION } from '../config';
import type { Belief, Blackboard } from '../core/Blackboard';

/** §3.3 gives beliefs an `entityId` but no scheme for it. This is that
 *  scheme, and the PREFIX is load-bearing rather than decorative: threat
 *  derivation (§6.3) has to answer "is this belief about something hostile"
 *  from the belief alone, and `Belief` has no `hostile` field to read (phase 1
 *  authored that interface straight from the spec and it is not this phase's
 *  place to widen it — everything below works without doing so).
 *
 *    `enemy:<mob id>`  a real hostile from `useEnemyStore` (game/combat.ts)
 *    `noise:<what>`    an unattributed hostile sound — a fight heard, not seen
 *    `player`          the player. NOT hostile: a villager who stopped
 *                      farming every time you walked past would be a
 *                      regression, not perception, and every `not_threatened`
 *                      consideration already shipped would feel it.
 */
export function enemyBeliefId(mobId: number): string {
  return `enemy:${mobId}`;
}
export const PLAYER_BELIEF_ID = 'player';
export function noiseBeliefId(what: string): string {
  return `noise:${what}`;
}

/** True for the belief ids that feed `threatLevel`. See the id scheme above
 *  for why the player is deliberately excluded. */
export function isHostileBeliefId(id: string): boolean {
  return id.startsWith('enemy:') || id.startsWith('noise:');
}

/** Phase 7 — the nearest hostile this agent has actually NOTICED, by
 *  `lastKnownPosition`. Added here rather than in `src/ai/actions` because
 *  §3.3 is emphatic that "combat and search behavior must read
 *  `lastKnownPosition`, never the live transform of the target": this is the
 *  sanctioned reader, so it belongs beside the record it reads, and both
 *  combat actions (`take_cover`, `engage_threat`) share it instead of each
 *  re-deriving "which one am I answering" with its own subtly different rule.
 *
 *  `noticedAt` is the exact threshold §6.3's threat derivation counts a belief
 *  from, so this can never disagree with a `threatLevel`-driven consideration
 *  about whether there is anything to react to. Returns the live `Belief`
 *  object rather than a copy — every caller reads it within the same think
 *  tick, and allocating a summary object per agent per tick is the §0.4 waste
 *  this system keeps having to go back and remove. */
export function nearestNoticedHostile(bb: Blackboard, x: number, z: number): Belief | null {
  const min = PERCEPTION.belief.noticedAt;
  let best: Belief | null = null;
  let bestD2 = Infinity;
  for (const b of bb.beliefs.values()) {
    if (b.confidence < min || !isHostileBeliefId(b.entityId)) continue;
    const dx = b.lastKnownPosition.x - x;
    const dz = b.lastKnownPosition.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 >= bestD2) continue;
    bestD2 = d2;
    best = b;
  }
  return best;
}

/** Find or create the belief for `entityId`, without allocating on the
 *  (overwhelmingly common) refresh path. A fresh belief starts at confidence
 *  0 and climbs via the caller's own ramp — §6.1's "certainty ramps with time
 *  in view, not instantly" is the whole reason this doesn't take a confidence
 *  argument. */
export function ensureBelief(bb: Blackboard, entityId: string, now: number): Belief {
  let b = bb.beliefs.get(entityId);
  if (!b) {
    b = {
      entityId,
      lastKnownPosition: new THREE.Vector3(),
      lastSeenAt: now,
      confidence: 0,
      isVisibleNow: false,
      firstSeenAt: now,
    };
    bb.beliefs.set(entityId, b);
  }
  return b;
}

/** §3.3's decay, run once per THINK tick (not per perceive tick) against the
 *  real time elapsed since this agent's own last think — the same
 *  elapsed-time rule phase 1 established for needs, and the reason a tier-D
 *  agent thinking at 0.5 Hz forgets at exactly the same rate as a tier-A one
 *  at 10 Hz instead of 20x slower.
 *
 *  Decay applies to EVERY belief including currently-visible ones; the
 *  vision sensor's own ramp (≥0.67/s worst case) comfortably outruns it
 *  (0.25/s), so a target still in view keeps climbing. Doing it that way
 *  rather than exempting visible beliefs means there is one decay site, not a
 *  decay site plus a "was it refreshed this tick" bookkeeping flag.
 *
 *  This is also where `isVisibleNow` expires. The vision sensor only ever
 *  RAISES that flag; clearing it there instead would have to distinguish
 *  "this target left the cone" from "this target's LOS check was deferred by
 *  the per-tick budget" (§6.1's round robin), and getting that wrong makes a
 *  target standing in plain sight flicker in and out purely because a raid
 *  put eleven mobs in range. A staleness test — nothing has refreshed
 *  `lastSeenAt` for `visibleGraceSec` — cannot get it wrong, because a
 *  deferred check lands within a tick or two and refreshes it.
 *
 *  Returns how many beliefs were pruned, purely so the debug overlay can show
 *  churn (§9). */
export function decayBeliefs(bb: Blackboard, now: number, dt: number): number {
  if (dt <= 0 || bb.beliefs.size === 0) return 0;
  const cfg = PERCEPTION.belief;
  const factor = Math.exp(-cfg.decayPerSec * dt);
  let pruned = 0;
  for (const [id, b] of bb.beliefs) {
    b.confidence *= factor;
    if (b.isVisibleNow && now - b.lastSeenAt > cfg.visibleGraceSec) b.isVisibleNow = false;
    if (b.confidence < cfg.pruneBelow) {
      bb.beliefs.delete(id);
      pruned++;
    }
  }
  return pruned;
}
