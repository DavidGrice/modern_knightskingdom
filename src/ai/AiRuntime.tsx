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
import { playerState } from '@/game/playerState';
import { getNavGrid } from '@/game/navgrid';
import { agentManager, type WindowBounds } from './core/AgentManager';
import { mirrorVillagerPositions, syncVillagerAgents } from './rosterSync';
import { mirrorNpcPositions, syncNpcAgents } from './npcSync';
// iteration 2.9 — side-effect import only: nothing here calls resolveAnchor
// yet (phase 5's gather/haul actions are the first real caller), but it
// needs to be in the client bundle for its own window.__kkanchor debug
// exposure to exist at all, and this file is the one guaranteed-loaded
// entry point for the whole AI system per this file's own header comment.
import './core/AnchorResolution';
import './core/Reasoner';

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
    // phase 3, iteration 3.1: every non-defender roster villager gets an
    // Agent, and each one's tracked position stays mirrored from its live
    // rendered position. Cheap when the roster hasn't changed (reference
    // check inside syncVillagerAgents); the position mirror is O(villagers),
    // not O(search).
    syncVillagerAgents(st.villagers);
    mirrorVillagerPositions();
    // phase 3, iteration 3.4: the same lifecycle for scheduled court NPCs
    // (Npc.tsx's own "schedule" concept — see data/npcs.ts's
    // scheduledCourtNpcs) — a genuinely different population from roster
    // villagers, previously spawned no Agent at all (found while building
    // this iteration's own Locomotion splice into Npc.tsx).
    syncNpcAgents(st.completedQuests, st.destination ?? null, st.villagers);
    mirrorNpcPositions();
    // Phase 2, iteration 2.4 — a window-mode destination grid follows the
    // player, not any individual agent (nothing spawns agents in a
    // destination yet; this keeps the grid correctly centred for whenever
    // something does). getNavGrid() lazily creates and caches the grid on
    // first call; recentre() itself is a cheap hysteresis check that no-ops
    // on almost every frame — see both methods' own comments in navgrid.ts.
    //
    // 'dungeon' is deliberately excluded: gameStore sets st.destination to
    // it when the player enters the Sealed Crypt (verified — see
    // gameStore.ts's enterDungeon()), and the Crypt's grid is fixed-mode
    // (iteration 2.6), not window mode — recentre() would just no-op there,
    // but getNavGrid('dungeon') still throws if no layout has generated yet
    // (dungeonState.layout null), so this call site skips it rather than
    // risk that on a frame where destination flips before the layout does.
    //
    // Phase 2, iteration 2.7 — a windowed grid's current bounds are also
    // read here and passed to agentManager.update() so Tier B can enforce
    // §8's correction (the "window edge" ceiling only applies to windowed
    // regions); null for a fixed region or when nothing is active.
    let windowBounds: WindowBounds | null = null;
    if (st.destination && st.destination !== 'dungeon') {
      const grid = getNavGrid(st.destination);
      grid.recentre(playerState.x, playerState.z);
      if (grid.mode === 'window') {
        windowBounds = { originX: grid.originX, originZ: grid.originZ, halfExtent: grid.halfExtent };
      }
    }
    agentManager.update(dt, camera, st.destination ?? null, windowBounds);
  });

  return null;
}
