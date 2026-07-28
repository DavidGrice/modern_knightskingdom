'use client';
// Phase 3, iteration 3.4 — Agent lifecycle for scheduled court NPCs.
//
// Npc.tsx's CourtNpc component calls navSteer for exactly one population:
// NPCs where `revealAfterQuest && !world` ("schedule" in that file's own
// terms) — a real day/night walk, not the static starter farmers or
// instance residents. Nothing spawned an Agent for ANY court NPC before
// this iteration (grep confirms: only AiRuntime's phase-1 probe and
// rosterSync.ts's roster villagers ever call agentManager.spawn) — the
// same missing-prerequisite class of gap §3.0 found and fixed for roster
// villagers (iteration 3.1), found here while building 3.4's own splice
// into Npc.tsx.
//
// Mirrors rosterSync.ts's own lifecycle convention: reconcile against the
// current scheduled list, cheaply no-op'd when nothing has changed. Unlike
// rosterSync.ts, the source list here (scheduledCourtNpcs) is recomputed
// fresh every call rather than being a single stable store array — so the
// no-op check compares its three real INPUTS by reference/value instead
// of the (always-fresh) filtered output.

import { agentManager } from './core/AgentManager';
import { npcMobs } from '@/game/npcMobs';
import { scheduledCourtNpcs, type NpcDef } from '@/game/data/npcs';

let lastCompletedQuests: string[] | null = null;
let lastDestination: string | null | undefined;
let lastVillagers: { id: string }[] | null = null;
const spawnedIds = new Set<string>();

/** Every scheduled court NPC gets (or keeps) an Agent; anyone no longer
 *  scheduled (quest not yet done, visiting a different destination,
 *  recruited onto the villager roster) loses theirs. Archetype is
 *  'villager' for all of them, same reasoning as rosterSync.ts's own:
 *  nothing consumes archetype selection before phase 5's candidate
 *  assembly, so there is nothing to gain by choosing more precisely now. */
export function syncNpcAgents(completedQuests: string[], destination: string | null, villagers: { id: string }[]) {
  if (completedQuests === lastCompletedQuests && destination === lastDestination && villagers === lastVillagers) return;
  lastCompletedQuests = completedQuests;
  lastDestination = destination;
  lastVillagers = villagers;

  const npcs: NpcDef[] = scheduledCourtNpcs(completedQuests, destination, villagers);
  const liveIds = new Set<string>();
  for (const n of npcs) {
    liveIds.add(n.id);
    if (spawnedIds.has(n.id)) continue;
    const mob = npcMobs[n.id];
    agentManager.spawn(n.id, 'villager', mob?.x ?? n.x, mob?.z ?? n.z, null);
    spawnedIds.add(n.id);
  }

  for (const id of spawnedIds) {
    if (liveIds.has(id)) continue;
    agentManager.despawn(id);
    spawnedIds.delete(id);
  }
}

/** Keep each scheduled NPC's Agent position honest against its live
 *  rendered position every frame — same purpose and same one-render-frame
 *  caveat as rosterSync.ts's mirrorVillagerPositions (see that function's
 *  own comment): correct for LOD tiering, not a source of truth Locomotion
 *  should read mid-step. Locomotion (this same iteration) is the other
 *  direction of this, for whichever scheduled NPC currently has an active
 *  MOVE_TO/MOVE_TO_ANCHOR intent. */
export function mirrorNpcPositions() {
  for (const id of spawnedIds) {
    const mob = npcMobs[id];
    if (!mob) continue;
    const agent = agentManager.get(id);
    if (!agent) continue;
    agent.position.set(mob.x, 0, mob.z);
  }
}

/** newGame/loadFromSave already call agentManager.clear() (see
 *  gameStore.ts); without this, this module's own spawnedIds/last* would
 *  still think every agent from the last game exists, and never re-spawn
 *  them for the new one — same reasoning as rosterSync.ts's own
 *  resetVillagerAgentSync. */
export function resetNpcAgentSync() {
  lastCompletedQuests = null;
  lastDestination = undefined;
  lastVillagers = null;
  spawnedIds.clear();
}
