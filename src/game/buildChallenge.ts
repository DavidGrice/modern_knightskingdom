// Wave 13 · Timed Build Challenge — a real timer+objective+score mechanic
// against ONE of the six `challenge-N` diorama destinations (game/data/
// worlds.ts's CHALLENGE_DESTINATIONS), which existed purely as travelable,
// decorative dioramas before this (see ROADMAP.md). Scoped to Challenge
// Ground I only, on purpose — see this file's own header note below and
// ROADMAP.md for exactly what extending this to the other five needs.
//
// Ephemeral run state, a leaf module exactly like dungeonState/cartState/
// fishingState/arenaState: PlayerController.tsx ticks it every frame,
// gameStore.ts's constructBuilding credits a finished piece toward it, and
// BuildChallengePanel.tsx (HUD) polls it to render the countdown. Never
// persisted — an attempt does not survive a reload, the same as a fishing
// cast or a joust pass (neither of those persist either; see joustRichard's
// module-private `lastJoustAt`).
//
// Building itself needed NO new plumbing at all: a challenge ground is an
// ordinary WorldDestination (worlds.ts), so ClaimBanner.tsx already offers
// "Claim this Land for your Kingdom" there (it excludes only 'dungeon' and
// 'arena'), and once claimed, placeBuilding/constructBuilding/evalPlacement
// already work there exactly as they do at any of the nine templates. This
// module only adds the timer + the win/lose resolution on top of that
// already-real build economy.
import { CHALLENGE_DESTINATIONS } from './data/worlds';

/** Which of the six challenge grounds actually has the mechanic. Picked
 *  arbitrarily (the first) — nothing about challenge-1's own diorama shapes
 *  this objective, which is exactly why extending it to the other five is
 *  cheap (see the module doc): swap this constant, or promote it to a
 *  per-destination table, once a second one is worth building. */
export const BUILD_CHALLENGE_ID = CHALLENGE_DESTINATIONS[0].id;

/** fully-constructed pieces needed to win. Deliberately "any buildable" —
 *  not one specific structure/set — so the player can pick their fastest
 *  cheap piece (a farm plot's 4-swing build is the obvious speedrun choice)
 *  rather than being forced through a slower one; see ROADMAP.md for why a
 *  specific-structure objective is the natural harder follow-up, not this
 *  first slice. */
export const BUILD_CHALLENGE_TARGET = 6;
export const BUILD_CHALLENGE_TIME_MS = 90_000;

export interface BuildChallengeState {
  active: boolean;
  deadline: number; // performance.now() timestamp the run fails at
  built: number;
}

export const buildChallengeState: BuildChallengeState = { active: false, deadline: 0, built: 0 };

export function startBuildChallenge() {
  buildChallengeState.active = true;
  buildChallengeState.deadline = performance.now() + BUILD_CHALLENGE_TIME_MS;
  buildChallengeState.built = 0;
}

/** Called every frame from PlayerController's frame loop (mirrors
 *  game/fishing.ts's tickFishing exactly: pure state + a notify callback,
 *  no store import needed here). Resolves a loss on timeout, and quietly
 *  abandons (no toast — the player made an active choice to leave) if the
 *  player travels away from the challenge ground mid-run. A WIN is resolved
 *  from gameStore.ts's constructBuilding instead, the one place that
 *  already knows a piece just finished and already has addItems/addXp/audio
 *  in hand — this function never sees "built" cross the target itself. */
export function tickBuildChallenge(destination: string | null, notify: (text: string) => void) {
  if (!buildChallengeState.active) return;
  if (destination !== BUILD_CHALLENGE_ID) {
    buildChallengeState.active = false;
    return;
  }
  if (performance.now() >= buildChallengeState.deadline) {
    buildChallengeState.active = false;
    notify(`Time's up! You raised ${buildChallengeState.built}/${BUILD_CHALLENGE_TARGET} — the bell resets whenever you're ready to try again.`);
  }
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkbuildchallenge = buildChallengeState;
}
