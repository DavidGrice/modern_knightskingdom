'use client';
// Requested 2026-08-03: the endless mob arena's continuous spawn loop +
// milestone detection. Renders nothing — a sibling to AiRuntime.tsx's own
// "steps a system, mounts no mesh" shape. Mounted unconditionally in
// GameWorld.tsx (cheap: two early-returns when not in the arena) rather than
// conditionally, matching PostProcessing.tsx's own reasoning for staying
// always-mounted.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore, type EnemyKind } from '@/game/combat';
import { ARENA_MILESTONES, arenaState, arenaSpawnScale, rollArenaMilestoneLoot } from '@/game/arena';
import { ARENA_ORIGIN, ARENA_RADIUS } from '@/game/data/worlds';

/** weighted over the same filler kinds a raid draws from — excludes
 *  cedric/storm, both tuned named-boss encounters (spawn()'s own existing
 *  exclusion reasoning, combat.ts) */
const SPAWN_TABLE: { kind: EnemyKind; weight: number }[] = [
  { kind: 'skeleton', weight: 0.4 },
  { kind: 'bandit', weight: 0.35 },
  { kind: 'royal', weight: 0.15 },
  { kind: 'gilbert', weight: 0.1 },
];

function rollKind(): EnemyKind {
  const total = SPAWN_TABLE.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of SPAWN_TABLE) {
    if (r < e.weight) return e.kind;
    r -= e.weight;
  }
  return SPAWN_TABLE[0].kind;
}

const SPAWN_CHECK_INTERVAL = 1.2;
const BASE_TARGET = 3;
const MAX_TARGET = 8;

export default function ArenaSpawner() {
  const timer = useRef(0);

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    const inArena = st.destination === 'arena' && arenaState.active;
    if (!inArena) return;
    if (st.paused) return;

    // milestone check — every frame while in the arena, cheap (4-entry
    // array, only ever grants once per threshold via milestonesClaimed)
    for (const m of ARENA_MILESTONES) {
      if (arenaState.kills < m || arenaState.milestonesClaimed.includes(m)) continue;
      arenaState.milestonesClaimed.push(m);
      const drop = rollArenaMilestoneLoot();
      st.addItems(drop, 'grant');
      st.notify(`${m} kills! The arena rewards you.`, true);
    }

    timer.current -= dt;
    if (timer.current > 0) return;
    timer.current = SPAWN_CHECK_INTERVAL;

    const target = Math.min(BASE_TARGET + Math.floor(arenaState.milestonesClaimed.length / 2), MAX_TARGET);
    const live = useEnemyStore.getState().enemies.filter((e) => e.arena).length;
    if (live >= target) return;

    const angle = Math.random() * Math.PI * 2;
    const r = ARENA_RADIUS * 0.85;
    const x = ARENA_ORIGIN.x + Math.sin(angle) * r;
    const z = ARENA_ORIGIN.z + Math.cos(angle) * r;
    useEnemyStore.getState().spawn(rollKind(), x, z, false, undefined, false, false, arenaSpawnScale(), true);
  });

  return null;
}
