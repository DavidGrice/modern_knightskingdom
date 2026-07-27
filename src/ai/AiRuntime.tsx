'use client';
// NPC_AI_SPEC §2 — the one place the AI is stepped.
//
// Exactly one useFrame drives the whole system, and all it does is advance the
// clock and let the Scheduler dispatch a capped number of thinks (§0.3, §8).
// It renders nothing: an agent has no body until the Actuator lands in phase
// 3, which is the point — the decision side and the render side are separate
// and stay that way.

import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { agentManager } from './core/AgentManager';

/** Phase 1's one NPC: it ticks, decays its needs, and prints. Parked a few
 *  metres forward-right of SPAWN (0, 26) so it starts inside the view frustum
 *  — turning away from it is the quickest way to watch the LOD tier fall from
 *  A to C in the overlay. It has no mesh and no behaviour by design. */
const PROBE = { id: 'probe_01', archetype: 'villager', x: 4, z: 22 };

export default function AiRuntime() {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    // idempotent: GameScreen unmounts and remounts whenever another screen is
    // pushed (Options, Stats), and the registry is module state that outlives
    // it — same convention as villagerMobs/stabledHorses. A real reset is
    // gameStore's newGame/loadFromSave calling agentManager.clear().
    agentManager.spawn(PROBE.id, PROBE.archetype, PROBE.x, PROBE.z, null);
  }, []);

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    // the AI clock stops with the game — needs must not drain behind a menu
    if (st.paused) return;
    agentManager.update(dt, camera, st.destination ?? null);
  });

  return null;
}
