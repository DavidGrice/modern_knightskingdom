'use client';
// CLN-11 · split out of game/combat.ts unchanged.
import { audio } from '@/lib/audio';
import { useGameStore } from '../store/gameStore';
import { useEnemyStore } from './enemyStore';

// ---- Princess Storm's Battle Dome: a duel-to-first-hit, not a fight to the
// death — whoever lands the first blow ends it (see resolveDuel below). ----
let lastDuelAt = 0;

/** whether enough time has passed since the last duel to challenge her again */
export function canChallengeStorm(): boolean {
  return performance.now() - lastDuelAt > 4000;
}

/** ends an active duel with Storm: reputation/reward on a win, just a
 *  consolation note on a loss — either way she's removed immediately rather
 *  than popping apart like a monster, since she's a recurring character. */
export function resolveDuel(won: boolean, mobId: number) {
  const st = useGameStore.getState();
  lastDuelAt = performance.now();
  useEnemyStore.getState().remove(mobId);
  audio.playVoice('collision_storm', 0.9);
  if (won) {
    st.addReputation('storm', 10);
    st.addXp('combat', 40);
    st.addItems({ gold: 20 }, 'grant');
    st.bumpErrand('duel', 'any', 1); // her first-blood errand counts wins
    audio.playVoice('random_storm', 0.8);
    st.notify('You land the first blow — Storm grins: "Not bad. Care to go again sometime?"', true);
  } else {
    st.notify('Storm’s blade finds you first! "Better luck next time."');
  }
}
