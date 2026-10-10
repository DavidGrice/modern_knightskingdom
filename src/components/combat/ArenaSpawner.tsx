'use client';
// Requested 2026-08-03: the endless mob arena's continuous spawn loop +
// milestone detection. Renders nothing — a sibling to AiRuntime.tsx's own
// "steps a system, mounts no mesh" shape. Mounted unconditionally in
// GameWorld.tsx (cheap: the tick's two early returns when not in the arena)
// rather than conditionally, matching PostProcessing.tsx's own reasoning for
// staying always-mounted.
//
// CLN-20 · the rules themselves (milestones, the champion, the bonus
// objective, the spawn check and its table) live in game/arena.ts now, as
// tickArena, beside the state they write. What stays here is what has to be a
// component's: the frame subscription at this mount site, the frame's one
// store snapshot, and the spawn-check countdown — a ref, so it lives exactly
// as long as this component does and is never reset between runs.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import { tickArena, type ArenaRun } from '@/game/arena';
import type { EnemyDeps } from '@/game/waveDefense';

/** CLN-20 · the enemy store as tickArena uses it. Built once; each member
 *  reads `useEnemyStore.getState()` when it is called, so the live count and
 *  the spawns see the store at the same points of the frame they always did
 *  (game/arena.ts cannot import the enemy store itself: the game store
 *  imports arena.ts). */
const DEPS: EnemyDeps = {
  enemies: () => useEnemyStore.getState().enemies,
  spawn: (...args) => useEnemyStore.getState().spawn(...args),
  removeByWorld: (world) => useEnemyStore.getState().removeByWorld(world),
};

export default function ArenaSpawner() {
  const run = useRef<ArenaRun>({ timer: 0 });

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    tickArena(run.current, st, dt, DEPS);
  });

  return null;
}
