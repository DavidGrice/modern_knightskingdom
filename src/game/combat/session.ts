'use client';
// CLN-11 · split out of game/combat.ts: what a new session must not inherit from the last one's fight.
import { onSessionReset } from '../store/sessionHooks';
import { raiderRamState } from '../raiderRam';
import { raiderLadderState } from '../raiderLadder';
import { useEnemyStore } from './enemyStore';
import { armVitalsRefill } from './vitals';

// CLN-04 · session start (newGame / new-game-plus / loadFromSave) — gameStore.ts
// cannot import these modules (see the subscriber comments in vitals.ts and enemyStore.ts), so it registers
// through the leaf seam instead. Everything here is a live raid/fight the new
// session must not inherit: the enemy store (a raider from the last game kept
// hunting the new one), the siege ram/ladder that belong to those raiders (left
// active with no raiders they were never cleared), and the player's own vitals
// (HP/stamina are not saved, so a fresh session starts at full — refilled by the
// vitals.ts subscriber once the new state's maxHp/maxStamina exist, see refillVitals there).
onSessionReset(() => {
  useEnemyStore.getState().clear();
  raiderRamState.active = false;
  raiderLadderState.active = false;
  raiderLadderState.climbers = [];
  armVitalsRefill();
});
