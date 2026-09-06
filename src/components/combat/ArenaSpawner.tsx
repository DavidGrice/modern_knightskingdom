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
import {
  ARENA_MILESTONES, arenaState, arenaSpawnScale, rollArenaMilestoneLoot,
  ARENA_ENV_BY_ID, rollNextArenaEnv, startArenaObjective,
} from '@/game/arena';
import { ARENA_ORIGIN, ARENA_RADIUS } from '@/game/data/worlds';

/** weighted over the same filler kinds a raid draws from — excludes
 *  cedric/storm, both tuned named-boss encounters (spawn()'s own existing
 *  exclusion reasoning, combat.ts). Wave 37 (A3 remainder) adds the caster
 *  and shielded elite at modest weights, same filler-tier footing as
 *  gilbert; siegeCrew is deliberately NOT included here — its own AI fires
 *  at `st.buildings`/`st.keep` (the player's real, un-instanced homestead),
 *  which would let an arena run batter the player's actual home from inside
 *  a different world entirely. It stays scoped to Cedric's War Party
 *  (CedricSiege.tsx), the one place that's guaranteed to be the same
 *  instance as the buildings it targets. */
const SPAWN_TABLE: { kind: EnemyKind; weight: number }[] = [
  { kind: 'skeleton', weight: 0.4 },
  { kind: 'bandit', weight: 0.3 },
  { kind: 'royal', weight: 0.12 },
  { kind: 'gilbert', weight: 0.08 },
  { kind: 'caster', weight: 0.06 },
  { kind: 'shieldedElite', weight: 0.04 },
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

      // Wave 43 (A5) · mini-boss — one champion-tier spawn per milestone,
      // credited/cleaned up exactly like every other arena mob (`arena: true`,
      // no new flag). shieldedElite/royal are both already filler-tier
      // arena spawns (SPAWN_TABLE above) at modest weight; here one is
      // guaranteed and scaled up, so a milestone always feels like a real
      // spike rather than just another loot roll.
      const bossKind: EnemyKind = Math.random() < 0.5 ? 'shieldedElite' : 'royal';
      const bossAngle = Math.random() * Math.PI * 2;
      const bossR = ARENA_RADIUS * 0.5;
      useEnemyStore.getState().spawn(
        bossKind,
        ARENA_ORIGIN.x + Math.sin(bossAngle) * bossR,
        ARENA_ORIGIN.z + Math.cos(bossAngle) * bossR,
        false, undefined, false, false,
        arenaSpawnScale() * 1.6, true,
      );
      st.notify('A champion enters the ring!', true);

      // bonus objective — (re)rolled at every milestone
      startArenaObjective();

      // mid-run mutator swap — every milestone EXCEPT the first respects
      // the player's own entry choice for their opening 50 kills, then
      // starts reshuffling the ring underneath them. ArenaScene.tsx polls
      // arenaState.env itself, so this swap is visible the moment it lands.
      if (m !== ARENA_MILESTONES[0]) {
        arenaState.env = rollNextArenaEnv(arenaState.env ?? 'earth');
        st.notify(`The ring shifts — welcome to ${ARENA_ENV_BY_ID[arenaState.env].name}!`, true);
      }
    }

    // bonus-objective resolution — outside the milestone loop since it must
    // keep ticking (and can expire) on frames no milestone is crossed
    const obj = arenaState.objective;
    if (obj) {
      if (arenaState.kills - obj.startKills >= obj.need) {
        arenaState.objective = null;
        const drop = rollArenaMilestoneLoot();
        st.addItems(drop, 'grant');
        st.notify('Bonus objective complete! The arena rewards you further.', true);
      } else if (performance.now() >= obj.deadline) {
        // a redo, not a punishment — same forgiving tone as a missed
        // milestone: it just quietly stops offering this bonus
        arenaState.objective = null;
      }
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
