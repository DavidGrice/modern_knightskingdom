// Villager attributes (Phase 24A): five innate stats per villager, rolled
// DETERMINISTICALLY from the villager id — the same villager always has the
// same nature, so nothing needs storing or migrating (old saves just work).
// What IS stored is tradeXp (Villager.tradeXp): mutable per-trade mastery
// earned by actually working, kept per job so a veteran lumberjack switched
// to mining starts that trade green but keeps their axe mastery.
import type { CarrierTier, ItemId, PlacedBuilding, Villager, VillagerJob } from '../types';
import { isBuilt } from '../types';

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

/** Craft side-goods: what a skilled hand brings home besides the main haul.
 *  Keyed by the good actually being carried, not by the job — Wave 10's AI
 *  haul path (ai/actions/haul.ts) rolls this against the sack's real contents,
 *  which is the honest question for a villager whose job was switched
 *  mid-trip; `tickVillagers` keys it off `jobDef.produces`, which for every
 *  entry here is the same answer.
 *
 *  Wave 10 adds the two new trades' rows. Both reuse goods that already exist
 *  and already have a real use (flowers -> blossom_tart, herb -> pottage and
 *  the potion line), rather than inventing a bonus item: wildflowers grow
 *  among the herbs, and watercress grows at the shallows a line goes out
 *  from. */
export const SIDE_GOODS: Partial<Record<ItemId, ItemId>> = {
  wood: 'flowers',
  stone: 'iron_ore',
  wheat: 'herb',
  herb: 'flowers',
  fish: 'herb',
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
 *  a cart roughly doubles a maxed-out veteran's capacity. Wave 9 built the
 *  acquisition half (ItemId + workbench recipe + Armory stock + the Roster's
 *  carrier row) — these numbers are unchanged, they were always real. */
const CARRIER_BONUS: Record<CarrierTier, number> = { basket: 4, cart: 10 };

export function carrierBonus(carrier?: CarrierTier): number {
  return carrier ? CARRIER_BONUS[carrier] : 0;
}

// --- building-conferred bonuses (Wave 9) -----------------------------------
// ROADMAP.md's "Building-conferred villager attribute bonuses (RTS-style)",
// finally real. The trigger building is the Wave 9 Storehouse
// (data/buildables.ts) rather than the plain Stockpile, so the two stay
// distinct: a Stockpile is where goods GO, a Storehouse is an investment that
// changes how your people work.
//
// DESIGN CALL — ownership, not proximity. The obvious version ("within X
// metres of a Storehouse") was written and rejected: carry capacity is only
// ever consulted where the villager is FILLING their sack, i.e. out at a tree
// or an ore vein, which is precisely where they are furthest from any store.
// A radius check would therefore have paid out only during the deposit itself
// — visible in a debug readout, invisible in play — and would have flickered
// on and off as they walked. Counting the Storehouses standing in the
// villager's OWN settlement (matching the `world` instance-separation
// doctrine every other per-world system uses) is stable, legible, and makes
// the piece an economic upgrade instead of a placement puzzle.
export const STOREHOUSE_CARRY_BONUS = 3;
/** two Storehouses' worth. Capped so this can't be stacked into a homestead
 *  where hauling stops mattering — the point is to soften Phase 5's real
 *  haul-travel cost, not to delete it. */
export const STOREHOUSE_BONUS_CAP = 6;

/** Passive carry bonus a villager gets from what their settlement has built.
 *  `buildings` omitted (every UI/preview caller that has no store handy)
 *  answers 0 rather than guessing — this module stays pure data, it never
 *  reaches into the store itself. */
export function externalCapacityBonus(v: Villager, buildings?: PlacedBuilding[]): number {
  if (!buildings?.length) return 0;
  const world = v.world ?? null;
  let n = 0;
  for (const b of buildings) {
    if (b.type !== 'storehouse') continue;
    if ((b.world ?? null) !== world) continue;
    if (!isBuilt(b)) continue;
    n++;
    if (n * STOREHOUSE_CARRY_BONUS >= STOREHOUSE_BONUS_CAP) break;
  }
  return Math.min(STOREHOUSE_BONUS_CAP, n * STOREHOUSE_CARRY_BONUS);
}

/** How much `job` can carry before a haul trip is forced (phase 5's
 *  GatherAtNode/HaulToDeposit). Same job/villager split as `tradeLevelOf` —
 *  job passed separately rather than always reading `v.job`, so a
 *  hypothetical "what would this be for a different job" query is possible
 *  without a throwaway villager copy. `buildings` is optional for the same
 *  reason `externalCapacityBonus` takes it optionally: the one hot caller
 *  (Agent.ts's think tick) already holds the live store state, everything
 *  else is a roster readout that can honestly answer without it. */
export function carryCapacityOf(v: Villager, job: VillagerJob, buildings?: PlacedBuilding[]): number {
  const level = Math.min(tradeLevelOf(v, job), CARRY_LEVEL_CAP);
  return CARRY_BASE_CAPACITY
    + CARRY_LEVEL_BONUS_PER_LEVEL * level
    + carrierBonus(v.gear?.carrier)
    + externalCapacityBonus(v, buildings);
}
