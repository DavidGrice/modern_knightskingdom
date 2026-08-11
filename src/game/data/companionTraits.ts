// Companion trait trees (AI-wave-2 batch): every villager job has a small
// trait pool — the NPC's own mini skill tree. A villager unlocks one trait
// SLOT per 2 mastery levels in their current trade (defenders use their
// combat level), chosen by the player in the Roster. Chosen traits persist
// on the Villager record (Villager.traits) and stack with the innate
// attributes (attributes.ts) and trade mastery.
import type { Villager, VillagerJob } from '../types';
import { levelFromXp } from './ranks';
import { tradeLevelOf } from './attributes';

export interface CompanionTraitDef {
  id: string;
  job: VillagerJob;
  name: string;
  icon: string;
  desc: string;
}

export const COMPANION_TRAITS: CompanionTraitDef[] = [
  // defender — the sworn shield
  { id: 'def_shieldwall', job: 'defender', name: 'Shieldwall', icon: '🛡️', desc: '+8 max health' },
  { id: 'def_riposte', job: 'defender', name: 'Riposte', icon: '⚔️', desc: '+1 strike damage' },
  { id: 'def_longshot', job: 'defender', name: 'Longshot', icon: '🏹', desc: '+6 bow range' },
  // lumberjack
  { id: 'lum_deepcut', job: 'lumberjack', name: 'Deep Cut', icon: '🪓', desc: '+1 wood every trip' },
  { id: 'lum_forager', job: 'lumberjack', name: 'Forager', icon: '🌸', desc: 'double side-goods chance' },
  { id: 'lum_swift', job: 'lumberjack', name: 'Swift Return', icon: '💨', desc: 'trips 12% faster' },
  // miner
  { id: 'min_deepvein', job: 'miner', name: 'Deep Vein', icon: '⛏️', desc: '+1 stone every trip' },
  { id: 'min_orenose', job: 'miner', name: 'Ore Nose', icon: '🧲', desc: 'double side-goods chance' },
  { id: 'min_swift', job: 'miner', name: 'Swift Return', icon: '💨', desc: 'trips 12% faster' },
  // farmer
  { id: 'far_goldwheat', job: 'farmer', name: 'Golden Wheat', icon: '🌾', desc: '+1 wheat every trip' },
  { id: 'far_herbalist', job: 'farmer', name: 'Herbalist', icon: '🌿', desc: 'double side-goods chance' },
  { id: 'far_swift', job: 'farmer', name: 'Swift Return', icon: '💨', desc: 'trips 12% faster' },
  // herbalist / fisherman (Wave 10) — same three-slot shape every other
  // gathering trade already has (a +1 haul trait, a side-goods trait, a Swift
  // Return). Without these the two new jobs would render no trait row at all
  // in the Roster (VillagersPanel bails on an empty pool), which reads as a
  // half-built job rather than a deliberate one.
  { id: 'her_deeproots', job: 'herbalist', name: 'Deep Roots', icon: '🌿', desc: '+1 herb every trip' },
  { id: 'her_bloomeye', job: 'herbalist', name: "Bloom Eye", icon: '🌼', desc: 'double side-goods chance' },
  { id: 'her_swift', job: 'herbalist', name: 'Swift Return', icon: '💨', desc: 'trips 12% faster' },
  { id: 'fis_deepwater', job: 'fisherman', name: 'Deep Water', icon: '🎣', desc: '+1 fish every trip' },
  { id: 'fis_netcast', job: 'fisherman', name: 'Net Cast', icon: '🕸️', desc: 'double side-goods chance' },
  { id: 'fis_swift', job: 'fisherman', name: 'Swift Return', icon: '💨', desc: 'trips 12% faster' },
  // merchant
  { id: 'mer_silver', job: 'merchant', name: 'Silver Tongue', icon: '🪙', desc: '+2 gold every stall trip' },
  { id: 'mer_swift', job: 'merchant', name: 'Quick Deals', icon: '💨', desc: 'trips 12% faster' },
  // builder
  { id: 'bui_steady', job: 'builder', name: 'Steady Hands', icon: '👷', desc: 'builds 25% faster' },
];

export const COMPANION_TRAIT_BY_ID: Record<string, CompanionTraitDef> =
  Object.fromEntries(COMPANION_TRAITS.map((t) => [t.id, t]));

export function traitsForJob(job: VillagerJob): CompanionTraitDef[] {
  return COMPANION_TRAITS.filter((t) => t.job === job);
}

/** trait slots available in the CURRENT job: one per 2 mastery levels
 *  (defenders use their combat level), capped at the job's pool size */
export function traitSlots(v: Villager): number {
  const lvl = v.job === 'defender' ? levelFromXp(v.xp ?? 0) : tradeLevelOf(v, v.job);
  return Math.min(traitsForJob(v.job).length, Math.floor(lvl / 2));
}

export function traitsOwnedInJob(v: Villager): number {
  return (v.traits ?? []).filter((t) => COMPANION_TRAIT_BY_ID[t]?.job === v.job).length;
}

export function hasTrait(v: Villager, id: string): boolean {
  return (v.traits ?? []).includes(id);
}

/** which trait adds +1 to the main haul / doubles side-goods, per job */
export const HAUL_TRAIT: Partial<Record<VillagerJob, string>> = {
  lumberjack: 'lum_deepcut', miner: 'min_deepvein', farmer: 'far_goldwheat',
  herbalist: 'her_deeproots', fisherman: 'fis_deepwater',
};
export const SIDE_TRAIT: Partial<Record<VillagerJob, string>> = {
  lumberjack: 'lum_forager', miner: 'min_orenose', farmer: 'far_herbalist',
  herbalist: 'her_bloomeye', fisherman: 'fis_netcast',
};

/** trip-duration multiplier from traits (job-matched Swift traits only) */
export function tripTraitMult(v: Villager): number {
  const swift = (v.traits ?? []).some((t) => {
    const def = COMPANION_TRAIT_BY_ID[t];
    return def?.job === v.job && t.endsWith('_swift');
  });
  return swift ? 0.88 : 1;
}
