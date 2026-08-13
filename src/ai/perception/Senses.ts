// NPC_AI_SPEC §1's `perception/Senses.js` — "aggregates sensors, writes
// beliefs", plus §6.3's threat derivation.
//
// This is the whole of phase 6's per-agent tick, and it runs on TWO cadences
// on purpose, because the spec asks for two:
//
//   every THINK tick   belief decay (§3.3) and threat derivation (§6.3 is
//                      explicit: "derived once per think tick")
//   every PERCEIVE tick the sensors themselves (§6.1: "updateHz 4-6, NOT
//                      frame rate")
//
// The perceive rate is the agent's own `lod.json` `perceiveHz` — A 6 / B 4 /
// C 2 / D off — which already sits inside §6.1's 4-6 band for the tiers that
// matter. That field has existed since phase 1 and, until this phase, was
// read by nothing but the debug overlay's own text; this is its first real
// consumer. Reusing it rather than adding an `updateHz` to perception.json is
// deliberate: two numbers that have to agree by hand is exactly the shape of
// the tier-B window-radius gap this project already had to go back and fix
// (PHASE_STATUS.md §2, iteration 2.7).
//
// A tier-D agent (`perceiveHz` 0 — a different region entirely) skips both
// sensors but NOT decay or derivation. That matters: without it a villager
// who was mid-raid when the player stepped through a portal would keep a
// frozen threatLevel of 1.0 forever and never work again. Beliefs decay,
// threat follows them down, and the agent is calm within a dozen seconds of
// leaving the trouble behind — which is also §8's "tier D skips perception
// entirely" honoured exactly, without a second gate to keep in sync.

import { PERCEPTION } from '../config';
import type { Agent } from '../core/Agent';
import { agentManager } from '../core/AgentManager';
import { decayBeliefs, isHostileBeliefId } from './Belief';
import { updateHearing } from './HearingSensor';
import { updateVision } from './VisionSensor';
import { perceptionStateFor, type PerceptionState } from './state';
import { pumpPlayerFootsteps, setSoundClock } from './sounds';

/** The `SensesTick` registered into `core/Perception.ts`. Called from
 *  `Agent.think()`; `dt` is that agent's own elapsed-since-last-think. */
export function updateSenses(agent: Agent, now: number, dt: number): void {
  const st = perceptionStateFor(agent.id);
  setSoundClock(now);

  decayBeliefs(agent.bb, now, dt);

  if (agent.perceiveHz > 0) {
    const period = 1 / agent.perceiveHz;
    st.perceiveTimer += dt;
    if (st.perceiveTimer >= period) {
      // Same "never bank more than one pending tick" rule Scheduler.ts
      // applies to thinks, for the same reason: an agent returning from a
      // backgrounded tab must not fire a burst of catch-up sensor passes.
      st.perceiveTimer -= period;
      if (st.perceiveTimer > period) st.perceiveTimer = period;
      // Real seconds since the LAST perceive tick, not the nominal period:
      // the confidence ramp is authored in seconds (§6.1) and must not run
      // faster on a tier-A agent than on a tier-C one. `period` on the first
      // ever tick, because "however long this agent existed before it first
      // perceived" is not time spent looking at anything.
      const pdt = st.lastPerceiveAt < 0 ? period : now - st.lastPerceiveAt;
      st.lastPerceiveAt = now;

      // The one continuous sound source, pumped here rather than from a
      // per-frame caller — it is internally throttled, so N agents calling it
      // in the same tick still emit exactly one footstep (see sounds.ts).
      // Stamped with the region the PLAYER is in, which is what makes it
      // audible to agents in that region and inaudible everywhere else.
      pumpPlayerFootsteps(now, agentManager.activeRegion);
      updateVision(agent, st, now, pdt);
      // after vision on purpose — see updateHearing's own header
      updateHearing(agent, st, now);
    }
  }

  deriveThreat(agent, st, now, dt);
}

/** §6.3 — "`threatLevel` is derived once per think tick from beliefs, then
 *  smoothed (lerp toward the target by 0.3) so it doesn't spike and cause an
 *  action flip. Inputs: hostile belief count, nearest hostile distance, time
 *  since last damage."
 *
 *  All three inputs are implemented. The smoothing is the spec's 0.3 lerp
 *  re-expressed as a time constant — see perception.json's `threat._doc` for
 *  why (0.3 PER TICK would make an identical situation escalate 20x faster on
 *  a tier-A agent than a tier-D one, purely because of its LOD tier).
 *
 *  Distance is measured to `belief.lastKnownPosition`, never to the live
 *  entity — §3.3's rule, and the whole reason a belief carries a position at
 *  all. */
function deriveThreat(agent: Agent, st: PerceptionState, now: number, dt: number): void {
  const t = PERCEPTION.threat;
  const noticedAt = PERCEPTION.belief.noticedAt;
  const bb = agent.bb;
  const ax = agent.position.x;
  const az = agent.position.z;

  let nearest = 0;
  let noticed = 0;

  for (const b of bb.beliefs.values()) {
    if (!isHostileBeliefId(b.entityId)) continue;

    if (b.confidence < noticedAt) {
      // dropped back below the threshold (decayed, or only ever heard) — the
      // reaction delay is paid again next time it crosses, which is correct:
      // re-spotting someone who ducked away is a fresh double-take, not a
      // continuation of the first one
      st.noticedAt.delete(b.entityId);
      continue;
    }

    // §3.3's reaction delay. The belief exists and is confident; the agent
    // simply has not processed it yet. 200-600 ms, rolled per agent
    // (state.ts), so a row of villagers never flinches on the same frame.
    let stamp = st.noticedAt.get(b.entityId);
    if (stamp === undefined) {
      stamp = now;
      st.noticedAt.set(b.entityId, stamp);
    }
    if (now - stamp < st.reactionTime) continue;

    noticed++;
    const dx = b.lastKnownPosition.x - ax;
    const dz = b.lastKnownPosition.z - az;
    const d = Math.hypot(dx, dz);
    const prox = d <= t.closeDistance ? 1
      : d >= t.falloffDistance ? 0
      : 1 - (d - t.closeDistance) / (t.falloffDistance - t.closeDistance);
    const w = b.confidence * prox;
    if (w > nearest) nearest = w;
  }

  // Stale reaction stamps for beliefs that have since been pruned entirely
  // (Belief.ts's prune floor deletes the belief, and nothing else would ever
  // remove its stamp) — a small map, checked only when it is non-empty.
  if (st.noticedAt.size > 0) {
    for (const id of st.noticedAt.keys()) {
      if (!bb.beliefs.has(id)) st.noticedAt.delete(id);
    }
  }

  // nearest hostile (the dominant term) + a count term: three raiders at the
  // fence are worse than one, but a second hostile never matters as much as
  // the first one getting closer.
  let target = nearest;
  if (noticed > 1) target += t.extraPerHostile * (noticed - 1);

  // §6.3's third input. `bb.lastDamageAt` has no producer in this game today
  // and that is not an oversight — see perception.json's `threat._doc` and
  // `reportAgentDamaged` below.
  if (bb.lastDamageAt >= 0) {
    const since = now - bb.lastDamageAt;
    if (since < t.damageMemorySec) target += t.damageWeight * (1 - since / t.damageMemorySec);
  }

  if (target > 1) target = 1;
  st.threatTarget = target;

  const alpha = 1 - Math.exp(-dt / t.smoothingTau);
  bb.threatLevel += (target - bb.threatLevel) * alpha;
  // Exponential smoothing never actually reaches its target. Snapping the
  // last sliver matters here specifically because `not_threatened` is
  // `1 - threatLevel` through a quadratic curve in six already-shipped
  // actions (gather / haul / farm / seek_deposit / notice / ambient): a
  // permanent residue of 0.004 would leave every one of them very slightly
  // and permanently discounted after the first raid of the session, forever,
  // for no reason a player or a debug panel could ever explain.
  if (target === 0 && bb.threatLevel < 0.005) bb.threatLevel = 0;
}

/** §6.3's "time since last damage" input, as a real entry point.
 *
 *  Nothing calls it yet, and that is a fact about the GAME rather than a gap
 *  in this phase: an ordinary villager cannot be damaged at all today.
 *  `Enemies.tsx`'s target selection only ever picks the player, a sworn
 *  defender (via `defenderState`), or a keep piece — and `rosterSync.ts`
 *  deliberately excludes defenders from having an `Agent` in the first place,
 *  so no agent in this system is reachable by any damage path that exists.
 *
 *  Implemented and inert rather than omitted: phase 7 (combat + companion) is
 *  the phase that introduces something with an agent AND a health bar, and
 *  when it does, this is the one line it needs — not a re-derivation of the
 *  threat formula. */
export function reportAgentDamaged(agentId: string, now: number): void {
  const agent = agentManager.get(agentId);
  if (agent) agent.bb.lastDamageAt = now;
}
