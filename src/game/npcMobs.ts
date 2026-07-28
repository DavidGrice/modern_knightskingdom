'use client';
// Live court-NPC world positions, mutated in place by Npc.tsx's CourtNpc
// (mirrors villagerMobs.ts) — lets PlayerController's "Talk to X" interact
// check use wherever an NPC actually is right now instead of their static
// data/npcs.ts spot, which used to leave a stale prompt floating at their
// old daytime post after Phase 15's night schedule moved them elsewhere.

export interface NpcMob {
  x: number;
  z: number;
  /** Mirrors CourtNpc's own `clip` state, written every frame — debug/test
   *  visibility only, same as VillagerMob.clip (iteration 3.5). */
  clip?: string;
}

export const npcMobs: Record<string, NpcMob> = {};

export function registerNpcMob(id: string, x: number, z: number): NpcMob {
  if (!npcMobs[id]) npcMobs[id] = { x, z };
  return npcMobs[id];
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kknpcs = npcMobs;
}
