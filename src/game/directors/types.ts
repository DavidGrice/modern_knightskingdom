// CLN-13 · what the directors (game/directors/*.ts) are handed by Enemies.tsx's 1 Hz tick: the enemy store's own
// spawn, and its timers and flags — the module cells of directors/state.ts, so that each keeps its value from one tick
// to the next, and from one mount of the game scene to the next.
import type { useEnemyStore } from '@/game/combat';

export type Spawn = ReturnType<typeof useEnemyStore.getState>['spawn'];
export interface Counter { current: number }
export interface Flag { current: boolean }
