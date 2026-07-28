// Villager attributes (Phase 24A): five innate stats per villager, rolled
// DETERMINISTICALLY from the villager id — the same villager always has the
// same nature, so nothing needs storing or migrating (old saves just work).
// What IS stored is tradeXp (Villager.tradeXp): mutable per-trade mastery
// earned by actually working, kept per job so a veteran lumberjack switched
// to mining starts that trade green but keeps their axe mastery.
import type { CarrierTier, ItemId, Villager, VillagerJob } from '../types';

export type AttrId = 'might' | 'diligence' | 'craft' | 'courage' | 'wit';

export const ATTRS: { id: AttrId; label: string; icon: string; blurb: string }[] = [
  { id: 'might', label: 'Might', icon: '💪', blurb: 'chance to haul a double load' },
  { id: 'diligence', label: 'Diligence', icon: '⏳', blurb: 'works trips faster' },
  { id: 'craft', label: 'Craft', icon: '✋', blurb: 'chance of bonus side-goods' },
  { id: 'courage', label: 'Courage', icon: '🦁', blurb: 'defender strike weight' },
  { id: 'wit', label: 'Wit', icon: '🧠', blurb: 'merchant haggling, scout eyes' },
];

function hash(s: string, salt: number): number {
  let h = salt >>> 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 1–10, stable per villager id. ~8% of rolls are "gifted" (9–10). */
export function attrsOf(id: string): Record<AttrId, number> {
  const out = {} as Record<AttrId, number>;
  ATTRS.forEach((a, i) => {
    const h = hash(id + a.id, 977 + i * 131);
    out[a.id] = h % 100 < 8 ? 9 + (h % 2) : 2 + (h % 7);
  });
  return out;
}

export function tradeXpOf(v: Villager, job: VillagerJob): number {
  return v.tradeXp?.[job] ?? 0;
}

/** 25 xp → Lv1, 100 → Lv2, 225 → Lv3… (+10 xp per completed trip) */
export function tradeLevelOf(v: Villager, job: VillagerJob): number {
  return Math.floor(Math.sqrt(tradeXpOf(v, job) / 25));
}

/** Trip-duration multiplier: Diligence ±2.5%/point around 5, trade mastery
 *  −2%/level, floored at 0.55× — a gifted veteran works nearly twice as fast. */
export function tripSpeedMult(v: Villager): number {
  const a = attrsOf(v.id);
  const lvl = v.job === 'idle' ? 0 : tradeLevelOf(v, v.job);
  return Math.max(0.55, 1 - 0.025 * (a.diligence - 5) - 0.02 * lvl);
}

/** Craft side-goods: what a skilled hand brings home besides the main haul. */
export const SIDE_GOODS: Partial<Record<ItemId, ItemId>> = {
  wood: 'flowers',
  stone: 'iron_ore',
  wheat: 'herb',
};

// --- carry capacity (Phase 4, §4.1/§4.3) -----------------------------------
// §4.3's own instruction was to flag the default rather than pick one
// silently — these three constants are that flagged decision, confirmed
// 2026-07-28: a fresh recruit isn't crippled (4), trade mastery keeps
// paying off for a long haul (+1/level) without becoming absurd (capped at
// +10, matching tradeLevelOf's already-slow sqrt curve — reaching level 10
// takes 250 completed trips at +10 tradeXp each).
const CARRY_BASE_CAPACITY = 4;
const CARRY_LEVEL_BONUS_PER_LEVEL = 1;
const CARRY_LEVEL_CAP = 10;

/** Confirmed alongside the base numbers above: a basket is a modest boost,
 *  a cart roughly doubles a maxed-out veteran's capacity. Acquisition for
 *  either doesn't exist yet (ROADMAP.md's "Carrier item content" entry) —
 *  this table is real and load-bearing the moment `villager.gear.carrier`
 *  is set by any means, including a debug/test assignment. */
const CARRIER_BONUS: Record<CarrierTier, number> = { basket: 4, cart: 10 };

export function carrierBonus(carrier?: CarrierTier): number {
  return carrier ? CARRIER_BONUS[carrier] : 0;
}

/** Stub for the (unbuilt) RTS-style mechanic where a placed building
 *  passively grants villager bonuses just by existing on the grid —
 *  ROADMAP.md's "Building-conferred villager attribute bonuses" entry.
 *  Always 0 until that system exists; kept as a real function (not inlined
 *  into `carryCapacityOf`) so wiring it in later is a one-line change here,
 *  not a formula rework. */
export function externalCapacityBonus(_v: Villager): number {
  return 0;
}

/** How much `job` can carry before a haul trip is forced (phase 5's
 *  GatherAtNode/HaulToDeposit). Same job/villager split as `tradeLevelOf` —
 *  job passed separately rather than always reading `v.job`, so a
 *  hypothetical "what would this be for a different job" query is possible
 *  without a throwaway villager copy. */
export function carryCapacityOf(v: Villager, job: VillagerJob): number {
  const level = Math.min(tradeLevelOf(v, job), CARRY_LEVEL_CAP);
  return CARRY_BASE_CAPACITY
    + CARRY_LEVEL_BONUS_PER_LEVEL * level
    + carrierBonus(v.gear?.carrier)
    + externalCapacityBonus(v);
}
