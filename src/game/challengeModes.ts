// Wave 43 (B6) — activates the 5 dormant challenge grounds (game/data/
// worlds.ts's CHALLENGE_DESTINATIONS) that buildChallenge.ts's own header
// left for later ("promote to a per-destination table... once a second one
// is worth building"). Rather than 5 literally unique mechanics — a much
// larger scope than any prior wave, and disproportionate to what this file's
// own precedent (arena.ts: 4 environments reused indefinitely) already
// established as the right shape — this ships 3 genuinely distinct mechanic
// TYPES, reused across the 5 remaining grounds:
//   challenge-1  Build Race   (existing, unchanged — buildChallenge.ts)
//   challenge-2  Gather Race
//   challenge-3  Defend the Plot
//   challenge-4  Joust Gauntlet
//   challenge-5  Gather Race   (reused)
//   challenge-6  Defend the Plot (reused)
//
// Three leaf modules in one file, same pattern as arena.ts/buildChallenge.ts/
// dungeonState/fishingState: run-local, unsaved state, no store import here
// (ChallengeRunner.tsx, the component that ticks these every frame, and
// ChallengePanels.tsx, the HUD that polls them, both import useGameStore
// themselves — mirrors ArenaSpawner.tsx's own split from arena.ts).
import { WORLD_DESTINATION_BY_ID } from './data/worlds';

export const GATHER_CHALLENGE_IDS: readonly string[] = ['challenge-2', 'challenge-5'];
export const DEFEND_CHALLENGE_IDS: readonly string[] = ['challenge-3', 'challenge-6'];
export const JOUST_CHALLENGE_ID = 'challenge-4';

export function isGatherChallenge(destId: string | null): boolean {
  return !!destId && GATHER_CHALLENGE_IDS.includes(destId);
}
export function isDefendChallenge(destId: string | null): boolean {
  return !!destId && DEFEND_CHALLENGE_IDS.includes(destId);
}
export function isJoustChallenge(destId: string | null): boolean {
  return destId === JOUST_CHALLENGE_ID;
}

// ---------------------------------------------------------------------------
// Gather Race — collect GATHER_TARGET_COUNT markers scattered around the
// ground's own origin/radius before the clock runs out. Failing (timeout, or
// walking away) is silent, no penalty — same forgiving tone as
// buildChallenge.ts's own tickBuildChallenge.
export const GATHER_TARGET_COUNT = 6;
export const GATHER_TIME_MS = 75_000;
export const GATHER_PICKUP_RADIUS = 2.5;

export interface GatherPoint { x: number; z: number; collected: boolean }
export interface GatherChallengeState {
  active: boolean;
  destId: string | null;
  deadline: number; // performance.now() timestamp
  points: GatherPoint[];
}
export const gatherChallengeState: GatherChallengeState = {
  active: false, destId: null, deadline: 0, points: [],
};

/** Pure geometry — an evenly-spaced ring at half the ground's own radius, the
 *  same "no real per-diorama floor data, so keep placement generic" call
 *  ArenaScene.tsx's own primitives-only design already made. Absolute world
 *  coordinates (dest.origin + offset), matching every other absolute-space
 *  system that touches a challenge ground (Enemies.tsx mob positions,
 *  ArenaSpawner's own ring spawns) — NOT local-to-origin the way
 *  DestinationScope.tsx's claimed-building children are, since this is read
 *  by flat, top-level components (ChallengeRunner.tsx), not ones nested
 *  inside that origin-offset <group>. */
export function gatherTargetOffsets(destId: string): { x: number; z: number }[] {
  const dest = WORLD_DESTINATION_BY_ID[destId];
  return Array.from({ length: GATHER_TARGET_COUNT }, (_, i) => {
    const a = (i / GATHER_TARGET_COUNT) * Math.PI * 2;
    return { x: dest.origin.x + Math.sin(a) * dest.radius * 0.5, z: dest.origin.z + Math.cos(a) * dest.radius * 0.5 };
  });
}

export function startGatherChallenge(destId: string) {
  gatherChallengeState.active = true;
  gatherChallengeState.destId = destId;
  gatherChallengeState.deadline = performance.now() + GATHER_TIME_MS;
  gatherChallengeState.points = gatherTargetOffsets(destId).map((p) => ({ ...p, collected: false }));
}

// ---------------------------------------------------------------------------
// Defend the Plot — real hostiles spawn (worldOverride-scoped to this ground,
// exactly like a dungeon room or Cedric's camp, per combat.ts's own EnemyData
// .world doctrine) and close on the destination's own claimed flag
// (claimedWorlds[destId], already rendered as <ClaimFlag>). Rather than real
// object-targeting combat AI against the flag (siegeCrew's own un-scoped
// building-attack AI is exactly the unsafe shortcut this avoids — see this
// wave's research), "defending" is our own proximity check against the
// flag's stored position: any live hostile within DEFEND_PROXIMITY_RADIUS
// chips the plot's own HP pool. The player's normal melee/ranged combat
// against those same hostiles is what actually keeps the plot standing.
export const DEFEND_TIME_MS = 90_000;
export const DEFEND_START_HP = 100;
export const DEFEND_DRAIN_PER_SEC = 5;
export const DEFEND_PROXIMITY_RADIUS = 7;
export const DEFEND_SPAWN_INTERVAL_S = 4;
export const DEFEND_MAX_LIVE = 4;

export interface DefendChallengeState {
  active: boolean;
  destId: string | null;
  deadline: number;
  plotHp: number;
}
export const defendChallengeState: DefendChallengeState = {
  active: false, destId: null, deadline: 0, plotHp: DEFEND_START_HP,
};

export function startDefendChallenge(destId: string) {
  defendChallengeState.active = true;
  defendChallengeState.destId = destId;
  defendChallengeState.deadline = performance.now() + DEFEND_TIME_MS;
  defendChallengeState.plotHp = DEFEND_START_HP;
}

// ---------------------------------------------------------------------------
// Joust Gauntlet — the one genuinely novel mechanic (no existing joust logic
// generalizes: gameStore.ts's joustRichard() is entirely bespoke to the
// scripted Richard duel — a mount, a gallop flag, and a one-shot distance
// roll, none of which exist as a reusable system). Ride/run through
// JOUST_RING_COUNT rings in sequence, each with its own short active window;
// hitting a ring while it's "hot" scores precision by how early the hit
// landed, generalizing joustRichard's own distance-based precision idea into
// a timing one (no lance/mount mechanic exists to reuse for the distance
// version). Only challenge-4 gets this — the most novel of the three, not
// worth duplicating onto a second ground per this wave's own scope call.
export const JOUST_RING_COUNT = 5;
export const JOUST_TIME_MS = 45_000;
export const JOUST_RING_RADIUS = 2.2;
export const JOUST_RING_ACTIVE_MS = 1200;

export interface JoustChallengeState {
  active: boolean;
  destId: string | null;
  deadline: number;
  ringIndex: number;
  ringActivatedAt: number; // performance.now() timestamp the CURRENT ring went hot
  hits: number;
  precisionSum: number;
}
export const joustChallengeState: JoustChallengeState = {
  active: false, destId: null, deadline: 0, ringIndex: 0, ringActivatedAt: 0, hits: 0, precisionSum: 0,
};

/** Same evenly-spaced-ring geometry as gatherTargetOffsets, a touch wider
 *  (0.55x radius vs 0.5x) so the two mechanics don't visually coincide on
 *  the rare "two grounds share a layout" coincidence — not that it would
 *  matter mechanically, since only one ground's mechanic is ever active
 *  under the player at a time. */
export function joustRingOffsets(destId: string): { x: number; z: number }[] {
  const dest = WORLD_DESTINATION_BY_ID[destId];
  return Array.from({ length: JOUST_RING_COUNT }, (_, i) => {
    const a = (i / JOUST_RING_COUNT) * Math.PI * 2;
    return { x: dest.origin.x + Math.sin(a) * dest.radius * 0.55, z: dest.origin.z + Math.cos(a) * dest.radius * 0.55 };
  });
}

export function startJoustChallenge(destId: string) {
  joustChallengeState.active = true;
  joustChallengeState.destId = destId;
  joustChallengeState.deadline = performance.now() + JOUST_TIME_MS;
  joustChallengeState.ringIndex = 0;
  joustChallengeState.ringActivatedAt = performance.now();
  joustChallengeState.hits = 0;
  joustChallengeState.precisionSum = 0;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkchallenges = {
    gather: gatherChallengeState, defend: defendChallengeState, joust: joustChallengeState,
  };
}
