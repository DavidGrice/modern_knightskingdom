'use client';
// Phase 3, iteration 3.1 — Agent lifecycle for the villager roster.
//
// Phase 1 never spawned an Agent per villager; only the probe existed.
// Verifying PHASE_3_4_5_ACTUATION_AND_REASONER.md against the real codebase
// found this as a missing prerequisite §3.0 there assumed already existed —
// "for any villager with an assigned Agent" had nothing to check against.
//
// Mirrors registerVillagerMob's own lifecycle convention: reconcile against
// the CURRENT roster, cheaply no-op'd via reference equality when nothing
// changed — the same pattern rebuildNav already uses for the buildings
// array.
//
// Defender-job villagers are excluded. Villagers.tsx's own renderer already
// draws that line (`villagers.filter(v => v.job !== 'defender')`) —
// Defenders.tsx owns their combat AI, and phases 3-5 explicitly don't touch
// combat (PHASE_STATUS.md's phase 5.9 note).

import { agentManager } from './core/AgentManager';
import { villagerMobs } from '@/game/villagerMobs';
import type { Villager } from '@/game/types';

let lastVillagers: Villager[] | null = null;
const spawnedIds = new Set<string>();

/** Every non-defender roster villager gets (or keeps) an Agent; anyone no
 *  longer on the roster loses theirs. Archetype is 'villager' for all of
 *  them for now — job-specific archetype selection isn't consumed by
 *  anything until phase 5's candidate assembly exists, so there is nothing
 *  to gain by making that call before it matters. */
export function syncVillagerAgents(villagers: Villager[]) {
  if (villagers === lastVillagers) return;
  lastVillagers = villagers;

  const liveIds = new Set<string>();
  for (const v of villagers) {
    if (v.job === 'defender') continue;
    liveIds.add(v.id);
    if (spawnedIds.has(v.id)) continue;
    const mob = villagerMobs[v.id];
    agentManager.spawn(v.id, 'villager', mob?.x ?? 0, mob?.z ?? 0, null);
    spawnedIds.add(v.id);
  }

  for (const id of spawnedIds) {
    if (liveIds.has(id)) continue;
    agentManager.despawn(id);
    spawnedIds.delete(id);
  }
}

/** Keep each villager Agent's tracked position honest against its live
 *  rendered position every frame — cheap (a copy, not a search), and it is
 *  what keeps LOD tiering (AgentManager.refreshTiers, phase 1) correct for
 *  every villager agent instead of frozen at spawn time. Locomotion
 *  (iteration 3.3) becomes the other direction of this once it exists; for
 *  now this is read-only with respect to rendering — nothing here writes
 *  back to villagerMobs or a transform.
 *
 *  Measured (scripts/smoke132.mjs): this can lag by up to one render frame,
 *  not always zero. VillagerFigure's and AiRuntime's useFrame callbacks are
 *  both inline closures, so React/R3F resubscribes them on every re-render
 *  (e.g. VillagerFigure's setClip firing when movement starts), which can
 *  reorder their relative execution within a tick — a pre-existing R3F
 *  scheduling fragility, not something this file causes. A ~0.1m lag against
 *  a 15m LOD tier threshold is inconsequential for what this mirror is for;
 *  forcing strict same-tick ordering would mean taking over R3F's frame
 *  scheduling (`useFrame`'s priority argument disables its auto-render),
 *  which is not a trade worth making for a purpose that doesn't need
 *  sub-frame precision. Revisit only if something downstream actually needs
 *  tighter-than-one-frame position accuracy. */
export function mirrorVillagerPositions() {
  for (const id of spawnedIds) {
    const mob = villagerMobs[id];
    if (!mob) continue;
    const agent = agentManager.get(id);
    if (!agent) continue;
    agent.position.set(mob.x, 0, mob.z);
  }
}

/** newGame/loadFromSave already call agentManager.clear() (see
 *  gameStore.ts); without this, this module's own spawnedIds/lastVillagers
 *  would still think every agent from the last game exists, and never
 *  re-spawn them for the new one. */
export function resetVillagerAgentSync() {
  lastVillagers = null;
  spawnedIds.clear();
}
