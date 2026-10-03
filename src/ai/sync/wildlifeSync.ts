'use client';
// Wave 53 (E1) — Agent lifecycle for the ambient wildlife population (a
// small ground-perching songbird flock — see AmbientWildlife.tsx for the
// asset/rendering argument). Same small-module shape as rosterSync.ts/
// courtSync.ts, but genuinely simpler than both:
// those reconcile their Agents against a LIVE, changing source (the
// villager roster, a quest-gated NPC list). This population is a
// fixed, authored list for the whole session — nothing ever adds or removes
// a songbird — so nobody is ever retired and there is no reconciliation
// cost: `syncWildlifeAgents()` only ever does real work exactly once per id,
// for the whole game.
//
// Placement (design question 3): anchored near the existing grazing-horse
// home spots Wildlife.tsx already established (home[-50,8]/[-42,20]/
// [-58,18]/[-46,-4]) rather than picked cold — each songbird sits a few
// metres off an already-proven-walkable horse anchor, home-meadow only
// (region: null — the homestead, the region a home villager's Agent has
// too). Despawn/respawn needs no bespoke logic at all: AgentManager's
// existing LOD tiering already coarse-steps an off-region agent via
// stepUnrenderedAgents (§8), exactly like a home villager the moment the
// player steps through a portal — see roam.ts's own header for why that
// sweep can actually drive this archetype, unlike wander's tier-D-only gate.
import { agentManager } from '../core/AgentManager';
import { AgentPopulation } from './population';

interface WildlifeSpawn { id: string; x: number; z: number }

export const WILDLIFE_POPULATION: WildlifeSpawn[] = [
  { id: 'songbird0', x: -46, z: 12 },
  { id: 'songbird1', x: -37, z: 17 },
  { id: 'songbird2', x: -55, z: 23 },
  { id: 'songbird3', x: -40, z: -2 },
];

const flock = new AgentPopulation(() => agentManager);
const songbird = (w: WildlifeSpawn) => agentManager.spawn(w.id, 'ambient', w.x, w.z, null);

/** Idempotent: safe to call every frame (AiRuntime.tsx does), cheap after
 *  the first real call since the population short-circuits every subsequent
 *  one straight past a songbird it has already spawned. Never retired: the
 *  flock is a fixed, authored list. */
export function syncWildlifeAgents(): void {
  for (const w of WILDLIFE_POPULATION) flock.admit(w, songbird);
}

/** newGame/loadFromSave reset — same reasoning as rosterSync.ts's own
 *  resetVillagerAgentSync: agentManager.clear() wipes the real registry, but
 *  this module's own population is separate state that would otherwise
 *  still think every songbird from the last session exists, and never
 *  re-spawn them for the new one. */
export function resetWildlifeAgentSync(): void {
  flock.clear();
}
