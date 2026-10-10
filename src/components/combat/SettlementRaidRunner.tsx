'use client';
// Wave 47 (B5) — ticks game/settlementRaid.ts's rival-raid mechanic: real
// hostiles spawn (worldOverride-scoped to the settlement, exactly like
// ChallengeRunner.tsx's own Defend the Plot per combat.ts's EnemyData.world
// doctrine) and close on the settlement's own claimed plot
// (claimedWorlds[destId]). "Defending" is the same proximity check Defend
// the Plot already proved out: any live raider within
// SETTLEMENT_RAID_PROXIMITY_RADIUS of the claim chips its HP pool, and the
// player's own melee/ranged combat against those raiders is what keeps it
// standing. Mounted unconditionally in GameWorld.tsx right after
// <ChallengeRunner />, same "cheap, early-returns" reasoning — renders
// nothing, and the tick returns early the instant no raid is
// possible/active.
//
// CLN-20 · the trigger and the fight are game/settlementRaid.ts's own
// tickSettlementRaid now. What stays here is what has to be a component's:
// the frame subscription at this mount site, the frame's one store snapshot,
// the paused return and the one clock read after it, and the two values that
// must die with the component (a ref): the wave countdown and the "was active
// last frame" edge detector.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import {
  tickSettlementRaid, SETTLEMENT_RAID_SPAWN_INTERVAL_S, type SettlementRaidRun,
} from '@/game/settlementRaid';
import type { EnemyDeps } from '@/game/waveDefense';

/** CLN-20 · the enemy store as tickSettlementRaid uses it. Built once; each
 *  member reads `useEnemyStore.getState()` when it is called
 *  (game/settlementRaid.ts cannot import the enemy store itself: the game
 *  store imports settlementRaid.ts). */
const DEPS: EnemyDeps = {
  enemies: () => useEnemyStore.getState().enemies,
  spawn: (...args) => useEnemyStore.getState().spawn(...args),
  removeByWorld: (world) => useEnemyStore.getState().removeByWorld(world),
};

export default function SettlementRaidRunner() {
  const run = useRef<SettlementRaidRun>({ spawnTimer: SETTLEMENT_RAID_SPAWN_INTERVAL_S, wasActive: false });

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    if (st.paused) return;
    const now = performance.now();
    tickSettlementRaid(run.current, st, dt, now, DEPS);
  });

  return null;
}
