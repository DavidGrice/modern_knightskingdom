import type { CarrierTier, ClaimedPlot, DefenderLoadout, ItemId, ResourceNodeState, VillagerJob } from '../types';
import { BUILD_REGION } from './buildables';
import { hashId } from './villagerLooks';
import { WORLD_DESTINATION_BY_ID } from './worlds';

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

// Phase 5, iteration 5.6 — extracted from Villagers.tsx's own raid-flee/
// night-bed-seek cascade branches so the reasoner's flee_to_safety/sleep
// Activities (src/ai/actions) can call the SAME target-selection logic
// rather than reinventing it (§5.6's own explicit instruction). Villagers.
// tsx's copies are deleted once both route through the reasoner — this is
// the one remaining source, not a duplicate.
export const HOME_X = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
export const HOME_Z = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;

/** Empire arc, Wave 3: the anchor a villager's labour/home-seeking logic
 *  should measure against — HOME_X/HOME_Z for the homestead (world absent/
 *  null), or a settlement's own claimed-plot position once one exists
 *  (Wave 4). Falls back to the destination's own bake `origin` if the
 *  world hasn't been claimed yet (shouldn't happen for a real resident,
 *  but a plain lookup miss is a safer failure than a crash). The single
 *  source every per-world anchor lookup should go through — this was
 *  previously five independent hand-copied `HOME_X`/`HOME_Z` definitions
 *  across gameStore.ts/villagers.ts/Villagers.tsx/Defenders.tsx/
 *  RaiderRam.tsx that could silently drift out of sync with each other or
 *  with BUILD_REGION; the latter two stay homestead-only call sites (raids
 *  and defense are not per-world yet) and now import HOME_X/HOME_Z here
 *  directly instead of re-deriving the same formula. */
export function settlementAnchor(
  world: string | null | undefined,
  claimedWorlds: Record<string, ClaimedPlot>,
): { x: number; z: number } {
  if (!world) return { x: HOME_X, z: HOME_Z };
  const claimed = claimedWorlds[world];
  if (claimed) return { x: claimed.x, z: claimed.z };
  const dest = WORLD_DESTINATION_BY_ID[world];
  return dest ? { x: dest.origin.x, z: dest.origin.z } : { x: HOME_X, z: HOME_Z };
}

/** A villager's own fixed home spot, deterministic from their id — the
 *  exact derivation Villagers.tsx's VillagerFigure already used for its
 *  own `home` (a ring around the villager's settlement anchor,
 *  radius/angle from hashId — HOME_X/HOME_Z for a homestead villager,
 *  unchanged from before Wave 3). */
export function villagerHomeSpot(
  id: string,
  world: string | null | undefined,
  claimedWorlds: Record<string, ClaimedPlot>,
): { x: number; z: number } {
  const h = hashId(id);
  const angle = (h % 360) * (Math.PI / 180);
  const anchor = settlementAnchor(world, claimedWorlds);
  return {
    x: anchor.x + Math.cos(angle) * (6 + (h % 5)),
    z: anchor.z + Math.sin(angle) * (6 + (h % 5)),
  };
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
  // Wave 10 · the two trades the world already had nodes for and nobody to
  // work them (game/types.ts's ResourceNodeState 'herb'/'fishing' — player-
  // harvest-only until now, which is exactly why gather.ts's job_match could
  // never claim either kind). tripSeconds sit either side of the miner's 55:
  // herbs are close, shallow work, a day on the water is not.
  { id: 'herbalist', label: 'Herbalist', icon: '🌿', produces: 'herb', perTrip: 2, tripSeconds: 50 },
  { id: 'fisherman', label: 'Fisherman', icon: '🎣', produces: 'fish', perTrip: 2, tripSeconds: 65 },
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
// loadout. As of Wave 7 the halberd IS craftable (a forge recipe, and a real
// player melee weapon), but that changes nothing here: crafting fills the
// Satchel, and arming a defender still spends Armory stock only — Sealed
// Crypt salvage, or a deliberate donation. The two pools never mix.
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

// Wave 9 · carriers. Same Armory-backed, mutually-exclusive shape as the
// loadouts directly above (one field on the villager, the old tier refunded
// when you switch), NOT the boolean helmet/chestplate shape — a villager
// wears a basket OR a cart, never both, so a straight upgrade must hand the
// basket back rather than quietly consuming it. Any job may wear one:
// carry capacity is a working stat, and a defender who also hauls is fine.
export const CARRIERS: { id: CarrierTier; label: string; icon: string; blurb: string }[] = [
  { id: 'basket', label: 'Basket', icon: '🧺', blurb: '+4 carried per trip' },
  { id: 'cart', label: 'Hand Cart', icon: '🛒', blurb: '+10 carried per trip' },
];

/** the Armory item each tier spends — 1:1 with the tier's own name by design
 *  (see ItemId's Wave 9 note), kept as a real table so the two vocabularies
 *  are joined in exactly one place. */
export const CARRIER_ITEM: Record<CarrierTier, ItemId> = { basket: 'basket', cart: 'cart' };

export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<VillagerJob, JobDef>;

/** Wave 10 · which `ResourceNodeState.kind` each node-working trade plies.
 *  ONE table, read by all three systems that used to hand-copy their own
 *  version of it — `gather.ts`'s `job_match` consideration (was a private
 *  `JOB_RESOURCE_MAP` literal), `villagerAtWork()`'s "are they standing at a
 *  workable node" check and `Villagers.tsx`'s Phase-24B worksite walk (both
 *  were inline `job === 'lumberjack' ? 'tree' : 'rock'` ternaries). Three
 *  copies was survivable while the answer was two jobs long; adding a third
 *  and fourth trade to three separate ternaries is exactly how the AI path
 *  and the legacy timer end up disagreeing about where a villager works.
 *  A job absent from this table is not a node-working trade at all (farmer
 *  works a farmplot BUILDING — see ai/actions/farm.ts; merchant a stall;
 *  builder a site). */
export const JOB_NODE_KIND: Partial<Record<VillagerJob, ResourceNodeState['kind']>> = {
  lumberjack: 'tree',
  miner: 'rock',
  herbalist: 'herb',
  fisherman: 'fishing',
};

/** requirements to attract the Nth villager (1-indexed) */
export function villagerRequirement(n: number): { beds: number; buildings: number } {
  return { beds: n, buildings: 3 + n * 2 };
}

export const MAX_VILLAGERS = 6;
