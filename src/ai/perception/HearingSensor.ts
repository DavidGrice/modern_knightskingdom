// NPC_AI_SPEC §6.2 — hearing. Event-driven, not polled: the sensor drains
// whatever `perception/sounds.ts` has collected since this agent last looked,
// rather than scanning the world for things that might be making noise.
//
// Two spec details that are easy to skip and both matter:
//
// 1. "Sounds create LOW-confidence beliefs" — capped at `hearing.confidence`
//    (0.35), above `belief.noticedAt` (0.2). That pair of numbers is the
//    whole character of this sense: a heard fight DOES register and does raise
//    threat, but only to ~0.35 at point-blank range, against the 1.0 a
//    confirmed sighting ramps to. Sound raises an eyebrow; sight makes you
//    run. (Set the cap under the threshold instead and the entire sensor
//    becomes decorative — §6.3's "hostile belief count" input would only ever
//    see things already in plain view.)
//
//    The SIZE of that gap is what makes a ONE-SHOT sound register at all: the
//    cap is applied once and then decays, so the belief only counts toward
//    threat for ln(0.35/0.2)/0.25 = 2.24s, and §3.3's per-agent reaction delay
//    (up to 0.6s) is spent inside that window. It was originally a 0.62s
//    window against the same delay, which made a single distant noise a
//    coin flip decided by the agent's spawn-time reaction roll — see
//    perception.json's `belief._doc` for the two live runs that showed it.
// 2. "with a FUZZED position (offset by a few metres) so NPCs investigate an
//    area rather than walking to the exact source" — the offset is applied
//    once, when the belief is created from sound, not re-rolled on every
//    refresh; a bearing that jitters every half second is not an area, it is
//    a wobble.

import { PERCEPTION } from '../config';
import type { Agent } from '../core/Agent';
import { ensureBelief } from './Belief';
import { forEachSoundSince, latestSoundSeq, type SoundEvent } from './sounds';
import type { PerceptionState } from './state';

/** One perceive tick's hearing pass. Runs after vision on purpose: a target
 *  the agent can actually SEE has already had its belief refreshed to full
 *  confidence at its true position this tick, and `applySound` below will not
 *  drag either back down. */
export function updateHearing(agent: Agent, st: PerceptionState, now: number): void {
  st.heardCount = 0;
  const h = PERCEPTION.hearing;
  const ax = agent.position.x;
  const az = agent.position.z;

  forEachSoundSince(st.lastSoundSeq, now, (e: SoundEvent) => {
    if (e.region !== agent.region) return;
    const radius = e.loudness * h.radiusPerLoudness;
    const dx = e.x - ax;
    const dz = e.z - az;
    if (dx * dx + dz * dz > radius * radius) return;
    applySound(agent, e, now, h.confidence, h.fuzzRadius);
    st.heardCount++;
  });

  // Consume up to the current watermark, not just up to the loudest event
  // actually heard: an event this agent was too far away for is CONSUMED, not
  // pending. Otherwise a distant clash would be re-evaluated on every tick
  // until its TTL ran out.
  st.lastSoundSeq = latestSoundSeq();
}

function applySound(agent: Agent, e: SoundEvent, now: number, cap: number, fuzz: number): void {
  const existing = agent.bb.beliefs.get(e.sourceId);
  const b = existing ?? ensureBelief(agent.bb, e.sourceId, now);

  if (!existing || !b.isVisibleNow) {
    // §6.2's fuzz — a bearing, not a fix. Only applied when the agent is not
    // currently LOOKING at the source: hearing your neighbour's footsteps
    // while watching him should not teleport your idea of where he is three
    // metres sideways.
    const ang = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * fuzz; // sqrt = uniform over the disc
    b.lastKnownPosition.set(e.x + Math.cos(ang) * r, 0, e.z + Math.sin(ang) * r);
    // §3.3 has one timestamp for "when did I last have evidence of this", and
    // for a sound-only belief that is what `lastSeenAt` means. Widening the
    // Belief interface with a second field would change a type phase 1
    // authored straight from the spec, for a distinction only the debug
    // panel would ever read — and it already prints `isVisibleNow` beside it,
    // which is exactly the distinction.
    b.lastSeenAt = now;
  }

  // A ceiling, not an assignment: sound can bring a belief UP to its low cap
  // (or hold a decaying one there while the noise continues), and can never
  // pull a confidently-seen target back down to 0.35.
  if (b.confidence < cap) b.confidence = cap;
}
