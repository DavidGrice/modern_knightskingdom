'use client';
// Requested 2026-08-03 — sibling to npcSync.ts, same lifecycle bookkeeping
// pattern (spawnedIds Set, no-op'd via reference/value comparison of the
// raw inputs). `npcSync.ts`'s scheduledCourtNpcs() only covers NPCs with
// `revealAfterQuest && !world` — a real day/night walk. With today's
// content that's the ONLY population that ever gets an Agent: King Leo, the
// Queen, Richard, John, Storm, and the starter farmers Alric/Beda get none
// (confirmed by PHASE_STATUS.md's own 3.4 entry — scheduledCourtNpcs()
// returns [] under all current content). That's the actual reason the
// court reads as inert, not a missing Action.
//
// This covers the REST of Npc.tsx's own rendered population — the exact
// same `revealed` filter that component's default export computes
// (isNpcRevealed && world-matches-destination && not-a-roster-villager) —
// with a 'court' archetype (archetypes.json): intrinsic ONLY idle_fidget/
// notice_player, deliberately narrower than 'villager' so a court NPC can
// never wander off post or flee a raid three regions away, regardless of
// what the reasoner scores. Villagers.tsx/Npc.tsx already check
// agentManager.get(id).intent for PLAY_ANIM/FACE unconditionally (Phase 3,
// 3.4/3.5/3.7) — giving these NPCs a real Agent is the ONLY change needed
// for the ambient/notice content to actually reach them.
import { agentManager } from './core/AgentManager';
import { npcMobs } from '@/game/npcMobs';
import { NPCS, isNpcRevealed, scheduledCourtNpcs, type NpcDef } from '@/game/data/npcs';

let lastCompletedQuests: string[] | null = null;
let lastDestination: string | null | undefined;
let lastVillagers: { id: string }[] | null = null;
const spawnedIds = new Set<string>();

export function syncCourtAmbientAgents(completedQuests: string[], destination: string | null, villagers: { id: string }[]) {
  if (completedQuests === lastCompletedQuests && destination === lastDestination && villagers === lastVillagers) return;
  lastCompletedQuests = completedQuests;
  lastDestination = destination;
  lastVillagers = villagers;

  // the exact set Npc.tsx's own default export renders
  const revealed = NPCS.filter((n) =>
    isNpcRevealed(n, completedQuests) && (n.world ?? null) === (destination ?? null)
    && !villagers.some((v) => v.id === n.id));
  // already covered, with the real 'villager' archetype — don't double-spawn
  const scheduled = new Set(scheduledCourtNpcs(completedQuests, destination, villagers).map((n) => n.id));
  const npcs: NpcDef[] = revealed.filter((n) => !scheduled.has(n.id));

  const liveIds = new Set<string>();
  for (const n of npcs) {
    liveIds.add(n.id);
    if (spawnedIds.has(n.id)) continue;
    const mob = npcMobs[n.id];
    agentManager.spawn(n.id, 'court', mob?.x ?? n.x, mob?.z ?? n.z, null);
    spawnedIds.add(n.id);
  }

  for (const id of spawnedIds) {
    if (liveIds.has(id)) continue;
    agentManager.despawn(id);
    spawnedIds.delete(id);
  }
}

/** mirrors npcSync.ts's own mirrorNpcPositions — keeps each agent's
 *  tracked position honest against its live rendered position every frame,
 *  for LOD tiering, not a Locomotion source of truth (none of these agents
 *  ever carry a MOVE_TO/MOVE_TO_ANCHOR intent — court's own narrow
 *  intrinsic list makes that impossible). */
export function mirrorCourtAmbientPositions() {
  for (const id of spawnedIds) {
    const mob = npcMobs[id];
    if (!mob) continue;
    const agent = agentManager.get(id);
    if (!agent) continue;
    agent.position.set(mob.x, 0, mob.z);
  }
}

/** newGame/loadFromSave reset — same reasoning as npcSync.ts's own
 *  resetNpcAgentSync. */
export function resetCourtAmbientAgentSync() {
  lastCompletedQuests = null;
  lastDestination = undefined;
  lastVillagers = null;
  spawnedIds.clear();
}
