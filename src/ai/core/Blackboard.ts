// NPC_AI_SPEC §3.2 / §3.3 — the per-agent belief store.
//
// A plain object. No getters/setters, no zustand, no reactivity: it is written
// on the think tick and read by the debug overlay, and putting it in a store
// would re-render the React tree several times a second for data nothing in
// the UI actually binds to.

import * as THREE from 'three';
import { NEED_IDS, needProfile, type NeedId } from '../config';
import type { ItemId } from '@/game/types';

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

export interface Reservation {
  objectId: string;
  affordanceId: string;
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
  };
}
