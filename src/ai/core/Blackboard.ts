// NPC_AI_SPEC §3.2 / §3.3 — the per-agent belief store.
//
// A plain object. No getters/setters, no zustand, no reactivity: it is written
// on the think tick and read by the debug overlay, and putting it in a store
// would re-render the React tree several times a second for data nothing in
// the UI actually binds to.

import * as THREE from 'three';
import { NEED_IDS, needProfile, type NeedId } from '../config';
import type { ItemId, VillagerJob } from '@/game/types';
import type { TargetId } from './TargetRegistry';

/** §3.3 — what this agent believes about another entity. NPCs are not
 *  omniscient: combat and search read `lastKnownPosition`, never the live
 *  transform of the target. Written by the sensors in phase 6. */
export interface Belief {
  entityId: string;
  lastKnownPosition: THREE.Vector3;
  lastSeenAt: number;
  /** 1.0 on sight, decays exponentially when unseen; pruned below 0.05 */
  confidence: number;
  isVisibleNow: boolean;
  firstSeenAt: number;
}

/** §5.2 — one consideration's input and its post-curve output, kept so the
 *  overlay can show BOTH (§9: without that you cannot tell a bad curve from a
 *  bad input). Filled by the reasoner in phase 5. */
export interface ScoredConsideration {
  name: string;
  input: number;
  output: number;
}

export interface ScoredAction {
  actionId: string;
  score: number;
  considerations: ScoredConsideration[];
  /** true when a bool consideration multiplied the whole action out to zero */
  gated: boolean;
}

/** Phase 5 validation (found before 5.1) — this was originally
 *  `{ objectId: string; affordanceId: string }`, a phase-1 speculative
 *  guess written before `TargetRegistry` existed. The real reservation
 *  model (2.8) is `reserve(id: TargetId, slotKind: string, agentId: string)`
 *  — corrected here to match it exactly, since an Activity's `abort()` must
 *  call `targetRegistry.release(targetId, slotKind, agent.id)` with real
 *  values, not ones that were never going to match anything. */
export interface Reservation {
  targetId: TargetId;
  slotKind: string;
}

/** PHASE_3_4_5_ACTUATION_AND_REASONER.md §3.2 — written by Locomotion
 *  (iteration 3.3+) every frame it runs, read by Activities (phase 5) —
 *  never the reverse. Arrival is this status flag, not something an
 *  Activity polls for by reading the agent's live position: §0.1's
 *  transform-isolation rule cuts both ways. */
export interface Movement {
  status: 'moving' | 'arrived' | 'blocked';
  distRemaining: number;
}

export interface Blackboard {
  id: string;

  /** §3.2 drives — 0..1 satisfaction, decayed per second (see needs.json) */
  needs: Record<NeedId, number>;

  // perception output (phase 6)
  beliefs: Map<string, Belief>;
  /** 0..1, derived from beliefs once per think and smoothed (§6.3) */
  threatLevel: number;
  lastDamageAt: number;

  // social / role
  leaderId: string | null;
  homeRegion: string | null;

  // execution state (phases 4-5)
  currentActionId: string | null;
  currentActionStartedAt: number;
  cooldowns: Map<string, number>;
  reservation: Reservation | null;

  /** §9 — written every think, read by the overlay. Empty until phase 5. */
  lastScores: ScoredAction[];

  /** §3.2 — the Actuator's current movement state, see Movement's own doc */
  movement: Movement;

  /** §4.1 — set for real by phase 5's GatherAtNode/HaulToDeposit activities;
   *  null here means "not carrying anything." Following the same
   *  build-the-field-before-the-behaviour precedent as `reservation`/
   *  `currentActionId` above: AnimationController (3.5) already needs
   *  something to gate the carried-item prop on, so the field lands now,
   *  always null, with the actual write-side logic (capacity, gather/haul
   *  wiring) staying phase 4/5's job. */
  carrying: { resource: ItemId; amount: number } | null;

  /** §4.1/§4.2 — a LIVE READ of the villager's actual `job`, refreshed every
   *  think tick from the real roster record (Agent.think(), via
   *  game/data/attributes.ts's carryCapacityOf and the villager lookup
   *  there) — never a stored copy assigned once at spawn. This project has
   *  hit the two-sources-of-truth bug enough times already (node ids,
   *  ground height, work-hours gating) that a snapshotted `job` here would
   *  be a foreseeable repeat the moment a player reassigns someone via the
   *  roster panel mid-session. `null` for any agent with no matching
   *  villager record (the phase-1 probe, a court NPC, a despawned villager
   *  mid-frame). */
  job: VillagerJob | null;

  /** §4.1/§4.3 — how much this agent can carry before a haul trip is
   *  forced, from `carryCapacityOf()` (base + trade-level scaling + carrier
   *  item + a stubbed building-bonus hook — see that function's own
   *  comment and ROADMAP.md's "Building-conferred villager attribute
   *  bonuses" entry). Refreshed every think tick alongside `job`, same
   *  live-read rule — a villager who levels up or equips a basket mid-
   *  session must not need a respawn to see the new number. */
  carryCapacity: number;
}

export function createBlackboard(
  id: string,
  needProfileId: string,
  homeRegion: string | null,
): Blackboard {
  const profile = needProfile(needProfileId);
  const needs = {} as Record<NeedId, number>;
  for (let i = 0; i < NEED_IDS.length; i++) {
    const need = NEED_IDS[i];
    needs[need] = profile[need].start;
  }
  return {
    id,
    needs,
    beliefs: new Map(),
    threatLevel: 0,
    lastDamageAt: -1,
    leaderId: null,
    homeRegion,
    currentActionId: null,
    currentActionStartedAt: 0,
    cooldowns: new Map(),
    reservation: null,
    lastScores: [],
    // 'arrived' at spawn, not 'moving' — a fresh agent has no destination
    // yet, and IDLE (no intent) resolves to the same "arrived, nowhere in
    // particular" state Locomotion writes for it every frame anyway.
    movement: { status: 'arrived', distRemaining: 0 },
    carrying: null,
    // job/carryCapacity are overwritten on the very first think() tick for
    // any agent with a real villager record; these are just sane pre-first-
    // think defaults (an idle agent, base capacity, nothing derived yet)
    job: null,
    carryCapacity: 0,
  };
}
