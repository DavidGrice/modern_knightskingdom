'use client';
// Agent lifecycle for the court NPCs — Npc.tsx's whole rendered population
// (King Leo, the Queen, Richard, John, Storm, the starter farmers Alric and
// Beda, the settlement and guild residents): every NPC that is revealed, in
// the destination the player is in, and not recruited onto the villager
// roster. CLN-17 merged the two files that kept them — npcSync.ts and
// courtAmbientSync.ts — which watched the same three inputs and differed only
// in which NPCs went to which archetype.
//
// TWO POPULATIONS, by what an NPC is allowed to do:
//
//   - The scheduled walkers (Phase 3, iteration 3.4): `scheduledCourtNpcs` —
//     an NPC with `revealAfterQuest && !world`, which Npc.tsx's CourtNpc walks
//     on a real day/night route through navSteer. They get the 'villager'
//     archetype: nothing consumed archetype selection before phase 5's
//     candidate assembly, so there was nothing to gain by choosing more
//     precisely. NO CURRENT NPC IS ONE — every NPC with a reveal quest also has
//     a world (verified for CLN-17) — so this population is always empty. Kept
//     as it was: whether the scheduled gathering was shelved or never finished
//     is CLEANUP_PLAN.md's open question, not this file's to answer.
//
//   - Everyone else (requested 2026-08-03): the 'court' archetype
//     (archetypes.json), intrinsic ONLY idle_fidget/notice_player —
//     deliberately narrower than 'villager' so a court NPC can never wander off
//     post or flee a raid three regions away, whatever the reasoner scores.
//     Villagers.tsx/Npc.tsx already check agentManager.get(id).intent for
//     PLAY_ANIM/FACE unconditionally (Phase 3, 3.4/3.5/3.7), so giving these
//     NPCs a real Agent is the ONLY change needed for the ambient/notice
//     content to reach them. This was the actual reason the court read as
//     inert, not a missing Action.
//
// Cheaply no-op'd like rosterSync.ts: the NPC list is recomputed from three
// inputs every call, so the check compares those INPUTS by reference/value
// instead of the (always fresh) filtered output.

import { agentManager } from '../core/AgentManager';
import { npcMobs } from '@/game/npcMobs';
import { NPCS, isNpcRevealed, scheduledCourtNpcs, type NpcDef } from '@/game/data/npcs';
import { AgentPopulation } from './population';

let lastCompletedQuests: string[] | null = null;
let lastDestination: string | null | undefined;
let lastVillagers: { id: string }[] | null = null;
const walkers = new AgentPopulation(() => agentManager);
const court = new AgentPopulation(() => agentManager);

const spawnAs = (archetype: string) => (n: NpcDef) => {
  const mob = npcMobs[n.id];
  return agentManager.spawn(n.id, archetype, mob?.x ?? n.x, mob?.z ?? n.z, null);
};
const walker = spawnAs('villager');
const courtier = spawnAs('court');

/** Every court NPC Npc.tsx renders gets (or keeps) an Agent of the right
 *  kind; anyone no longer rendered (quest not yet done, visiting a different
 *  destination, recruited onto the villager roster) loses theirs. */
export function syncCourtAgents(completedQuests: string[], destination: string | null, villagers: { id: string }[]) {
  if (completedQuests === lastCompletedQuests && destination === lastDestination && villagers === lastVillagers) return;
  lastCompletedQuests = completedQuests;
  lastDestination = destination;
  lastVillagers = villagers;

  const scheduled = scheduledCourtNpcs(completedQuests, destination, villagers);
  // the exact set Npc.tsx's own default export renders, less the walkers
  const rest = NPCS.filter((n) =>
    isNpcRevealed(n, completedQuests) && (n.world ?? null) === (destination ?? null)
    && !villagers.some((v) => v.id === n.id) && !scheduled.some((s) => s.id === n.id));

  // An NPC who moves from one population to the other (unreachable today — the
  // walkers are always empty) gets a fresh Agent of the new archetype either
  // way round: a population takes an id over outright (population.ts).
  walkers.reconcile(scheduled, walker);
  court.reconcile(rest, courtier);
}

/** Keep each court Agent's tracked position honest against its live rendered
 *  position every frame — same purpose and same one-render-frame caveat as
 *  rosterSync.ts's mirrorVillagerPositions: correct for LOD tiering, not a
 *  source of truth Locomotion should read mid-step. Locomotion is the other
 *  direction of this for a walker with an active MOVE_TO/MOVE_TO_ANCHOR
 *  intent; a 'court' Agent never carries one (its intrinsic list makes that
 *  impossible). */
export function mirrorCourtPositions() {
  walkers.mirror(npcMobs);
  court.mirror(npcMobs);
}

/** newGame/loadFromSave already call agentManager.clear() (see
 *  gameStore.ts); without this, this module's own populations and last*
 *  would still think every agent from the last game exists, and never
 *  re-spawn them for the new one — same reasoning as rosterSync.ts's own
 *  resetVillagerAgentSync. */
export function resetCourtAgentSync() {
  lastCompletedQuests = null;
  lastDestination = undefined;
  lastVillagers = null;
  walkers.clear();
  court.clear();
}
