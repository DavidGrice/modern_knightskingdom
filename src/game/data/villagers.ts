import type { DefenderLoadout, ItemId, VillagerJob } from '../types';

// Villager recruitment: once your homestead has enough beds and buildings,
// generic villagers (the extraction's unnamed good/bad minifig variants)
// wander in and can be assigned a job for slow passive production.

// Alric and Beda are excluded — those names belong to the recruitable
// farmer_alric/miller_beda NPCs (see recruitVillageFolk), so the automatic
// arrival pool must never coincidentally mint a generic duplicate.
export const VILLAGER_NAMES = [
  'Cuthbert', 'Edda', 'Godwin', 'Hilda', 'Osric', 'Wynn',
];

// Working hours (shipped 2026-07-20): a workaday folk hour, not a night
// shift — villagers down tools once dusk properly sets in and pick back up
// at dawn instead of laboring around the clock. Defenders are exempt (their
// job IS the night watch, driven separately by Defenders.tsx).
export const WORK_START = 5 / 24;
export const WORK_END = 20 / 24;
export function isWorkingHours(time: number): boolean {
  return time >= WORK_START && time <= WORK_END;
}

// Defenders keep the OPPOSITE shift to the working folk (2026-07-20): the
// skeletons rise and the raiders come at night, so that's when the watch
// stands. By day they stand down and rest. Note this window WRAPS midnight,
// which is exactly why it can't just reuse isWorkingHours' inverted range.
export function isWatchHours(time: number): boolean {
  return time >= WORK_END || time <= WORK_START;
}

export interface JobDef {
  id: VillagerJob;
  label: string;
  icon: string;
  produces: ItemId;
  perTrip: number;
  tripSeconds: number; // real seconds of game time per delivery
}

export const JOBS: JobDef[] = [
  { id: 'idle', label: 'Unassigned', icon: '🧍', produces: 'wood', perTrip: 0, tripSeconds: 0 },
  { id: 'lumberjack', label: 'Lumberjack', icon: '🪓', produces: 'wood', perTrip: 2, tripSeconds: 45 },
  { id: 'miner', label: 'Miner', icon: '⛏️', produces: 'stone', perTrip: 2, tripSeconds: 55 },
  { id: 'farmer', label: 'Farmer', icon: '🌾', produces: 'wheat', perTrip: 2, tripSeconds: 60 },
  // only actually produces once a Market Stall is built (see tickVillagers) —
  // represents the stall's stock quietly selling to passersby while you're
  // off adventuring, same passive-delivery shape as every other job
  { id: 'merchant', label: 'Merchant', icon: '🪙', produces: 'gold', perTrip: 6, tripSeconds: 70 },
  // no passive delivery at all (see tickVillagers, which skips this job
  // outright) — a defender's "production" is fighting off raiders instead,
  // driven by Defenders.tsx
  { id: 'defender', label: 'Defender', icon: '🛡️', produces: 'wood', perTrip: 0, tripSeconds: 0 },
  // no delivery either — builders advance the oldest under-construction
  // piece a little every tick instead (see tickVillagers' builder pass)
  { id: 'builder', label: 'Builder', icon: '👷', produces: 'wood', perTrip: 0, tripSeconds: 0 },
];

// Weapons are drawn from the shared homestead Armory (2026-07-20 rework), the
// same pool that already stocks helmets/chestplates — never straight from the
// player's own Satchel. A defender starts bare-handed (no loadout at all) and
// only fights properly once you've spent real Armory stock arming them; the
// weapon returns to the Armory if you unequip or switch them to another
// loadout. "Halberd" still isn't a craftable player item (no recipe exists
// for it) — it only enters the Armory as Sealed Crypt salvage.
export const DEFENDER_LOADOUTS: { id: DefenderLoadout; label: string; icon: string }[] = [
  { id: 'sword_shield', label: 'Sword & Shield', icon: '🗡️' },
  { id: 'halberd', label: 'Halberd', icon: '🔱' },
  { id: 'bow', label: 'Bow', icon: '🏹' },
];

/** Armory stock a loadout spends when equipped, refunded when unequipped or switched away from. */
export const LOADOUT_REQUIRES: Record<DefenderLoadout, Partial<Record<ItemId, number>>> = {
  sword_shield: { sword: 1, shield: 1 },
  halberd: { halberd: 1 },
  bow: { crossbow: 1 },
};

export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<VillagerJob, JobDef>;

/** requirements to attract the Nth villager (1-indexed) */
export function villagerRequirement(n: number): { beds: number; buildings: number } {
  return { beds: n, buildings: 3 + n * 2 };
}

export const MAX_VILLAGERS = 6;
