'use client';
// Wave 53 (E1) — Agent lifecycle for the ambient wildlife population (a
// small ground-perching songbird flock — see AmbientWildlife.tsx for the
// asset/rendering argument). Same small-module shape as rosterSync.ts/
// npcSync.ts/courtAmbientSync.ts, but genuinely simpler than all three:
// those reconcile a Set of Agent ids against a LIVE, changing source (the
// villager roster, a quest-gated NPC list) every frame. This population is a
// fixed, authored list for the whole session — nothing ever adds or removes
// a songbird — so there is no despawn branch and no per-frame reconciliation
// cost: `syncWildlifeAgents()` only ever does real work exactly once per id,
// for the whole game.
//
// Placement (design question 3): anchored near the existing grazing-horse
// home spots Wildlife.tsx already established (home[-50,8]/[-42,20]/
// [-58,18]/[-46,-4]) rather than picked cold — each songbird sits a few
// metres off an already-proven-walkable horse anchor, home-meadow only
// (region: null, matching every other ambient/roster spawn in this codebase
// — see rosterSync.ts's own header on why `null` is the universal choice
// today). Despawn/respawn needs no bespoke logic at all: AgentManager's
// existing LOD tiering already coarse-steps an off-region agent via
// stepUnrenderedAgents (§8), exactly like a home villager the moment the
// player steps through a portal — see roam.ts's own header for why that
// sweep can actually drive this archetype, unlike wander's tier-D-only gate.
import { agentManager } from './core/AgentManager';

export interface WildlifeSpawn { id: string; x: number; z: number }

export const WILDLIFE_POPULATION: WildlifeSpawn[] = [
  { id: 'songbird0', x: -46, z: 12 },
  { id: 'songbird1', x: -37, z: 17 },
  { id: 'songbird2', x: -55, z: 23 },
  { id: 'songbird3', x: -40, z: -2 },
];

const spawnedIds = new Set<string>();

/** Idempotent: safe to call every frame (AiRuntime.tsx does), cheap after
 *  the first real call since `spawnedIds` short-circuits every subsequent
 *  one straight past `agentManager.spawn`, which is itself a no-op for an
 *  id already registered (AgentManager.spawn's own `existing` check). */
export function syncWildlifeAgents(): void {
  for (const w of WILDLIFE_POPULATION) {
    if (spawnedIds.has(w.id)) continue;
    agentManager.spawn(w.id, 'ambient', w.x, w.z, null);
    spawnedIds.add(w.id);
  }
}

/** newGame/loadFromSave reset — same reasoning as rosterSync.ts's own
 *  resetVillagerAgentSync: agentManager.clear() wipes the real registry, but
 *  this module's own spawnedIds Set is separate state that would otherwise
 *  still think every songbird from the last session exists, and never
 *  re-spawn them for the new one. */
export function resetWildlifeAgentSync(): void {
  spawnedIds.clear();
}
