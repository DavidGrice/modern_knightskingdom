// CLN-13 · Cedric's camp guards at The Rival Castle: Gilbert and a bandit, kept at two on a cooldown while his camp
// is known, he is free, and the player is not sworn to him.
import type { EnemyData } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { CEDRIC_CAMP, CEDRIC_REVEAL_QUEST, CEDRIC_WORLD } from '@/game/data/world';
import type { Counter, Spawn } from './types';

export function campGuardDirector(st: GameState, list: EnemyData[], spawn: Spawn, campGuardTimer: Counter): void {
  // Cedric's camp guards (Phase 20: the camp sits at The Rival Castle now)
  // — spawned only while actually visiting his world, and never for an
  // ally of his banner
  if (st.destination === CEDRIC_WORLD
    && st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric && st.alliance !== 'cedric') {
    campGuardTimer.current -= 1;
    const guards = list.filter((e) =>
      !e.raid && e.mob.state !== 'dying' && (e.kind === 'gilbert' || e.kind === 'bandit')
      && Math.hypot(e.mob.homeX - CEDRIC_CAMP.x, e.mob.homeZ - CEDRIC_CAMP.z) < 8);
    if (guards.length < 2 && campGuardTimer.current <= 0) {
      campGuardTimer.current = 20 + Math.random() * 10;
      spawn('gilbert', CEDRIC_CAMP.x + 3, CEDRIC_CAMP.z + 2, false);
      spawn('bandit', CEDRIC_CAMP.x - 3, CEDRIC_CAMP.z - 2, false);
    }
  }
}
