'use client';
// Live villager world positions, mutated in place by the Villagers renderer
// and read by the minimap (mirrors the pattern in riding.ts for horses).

export interface VillagerMob {
  x: number;
  z: number;
  /** Newcomers WALK IN. Someone who joins the homestead arrives along the
   *  road from the south rather than appearing on the doorstep — the road is
   *  the way in, and seeing them come up it is what makes them arrive rather
   *  than spawn. Cleared by Villagers.tsx once they reach the holding. */
  arriving?: boolean;
}

export const villagerMobs: Record<string, VillagerMob> = {};

export function registerVillagerMob(id: string, x: number, z: number): VillagerMob {
  if (!villagerMobs[id]) villagerMobs[id] = { x, z };
  return villagerMobs[id];
}

/** Put a newcomer on the road, at the far end, and set them walking. */
export function arriveByRoad(id: string, x: number, z: number) {
  const m = villagerMobs[id] ?? (villagerMobs[id] = { x, z });
  m.x = x;
  m.z = z;
  m.arriving = true;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkvillagers = villagerMobs;
}
