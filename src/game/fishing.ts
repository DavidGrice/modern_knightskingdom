'use client';
// The real fishing bite minigame: cast, wait out a random delay, then react
// to a short "Bite!" window — miss it and the fish gets away. Replaces the
// old rain-boosted hold-duration shortcut with an actual timing skill check.
// Mutable module (like combatState/playerState) so PlayerController's frame
// loop can drive it without store churn; HUD polls it for the bite meter.
import { audio } from '@/lib/audio';
import { atGuildMaxRank, useGameStore } from './store/gameStore';
import { callingSignature } from './data/classes';

const BITE_WINDOW = 900; // base ms to react once a fish bites

/** the live reaction window — the Steady Line talent stretches it 300ms, the
 *  Angler calling's small River Instinct passive (Wave 32) another 100ms —
 *  a third of the talent's own bonus, matching the "smaller than the real
 *  investment" rule every calling passive follows. */
export function biteWindowMs(): number {
  const gs = useGameStore.getState();
  const talent = gs.skillTree.includes('fishing2') ? 300 : 0;
  const calling = callingSignature(gs.character?.classId, 'fishing') ? 100 : 0;
  return BITE_WINDOW + talent + calling;
}
const MAX_RANGE = 6; // wander this far from the cast spot and the line resets

export const fishingState = {
  nodeId: null as string | null,
  phase: 'idle' as 'idle' | 'waiting' | 'biting',
  nextEventAt: 0,   // performance.now() when 'waiting' flips to 'biting'
  biteDeadline: 0,  // performance.now() when the 'biting' window closes (miss)
};

/** begin a fishing session at a node (a no-op if already fishing there) */
export function startFishing(nodeId: string, rainBoosted: boolean) {
  if (fishingState.nodeId === nodeId) return;
  fishingState.nodeId = nodeId;
  fishingState.phase = 'waiting';
  const base = rainBoosted ? 1200 : 2500;
  const spread = rainBoosted ? 1800 : 3500;
  // Anglers' Circle passive (Phase 21): Read the Water — bites come sooner.
  // Wave 22: Master of the Circle (max guild rank) sharpens the base
  // passive itself, ×0.7 -> ×0.6.
  const gs = useGameStore.getState();
  const guildCut = gs.guild === 'anglers' ? (atGuildMaxRank(gs.guild, gs.guildRanks, 'anglers') ? 0.6 : 0.7) : 1;
  fishingState.nextEventAt = performance.now() + (base + Math.random() * spread) * guildCut;
}

export function resetFishing() {
  fishingState.nodeId = null;
  fishingState.phase = 'idle';
}

/** advance the wait/bite cycle; call every frame from PlayerController with
 *  the live node (or undefined if it no longer exists/has respawned) and the
 *  player's distance to it. */
export function tickFishing(
  node: { respawnAt: number | null } | undefined,
  dist: number,
  notify: (text: string) => void,
) {
  if (!fishingState.nodeId) return;
  if (!node || node.respawnAt !== null || dist > MAX_RANGE) {
    resetFishing();
    return;
  }
  const now = performance.now();
  if (fishingState.phase === 'waiting' && now >= fishingState.nextEventAt) {
    fishingState.phase = 'biting';
    fishingState.biteDeadline = now + biteWindowMs();
    audio.play('unlock', 0.7);
  } else if (fishingState.phase === 'biting' && now >= fishingState.biteDeadline) {
    fishingState.phase = 'waiting';
    fishingState.nextEventAt = now + 2000 + Math.random() * 3000;
    notify('The fish got away!');
  }
}

if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkfish = fishingState;
