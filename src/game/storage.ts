// Wave 9 · REAL storage capacity. Until now `addItems()` wrote into one flat,
// uncapped `st.inventory` with no notion of where the goods physically went,
// which made a Stockpile pure decoration: villagers walked to it, said so in
// the delivery notification, and nothing about it mattered.
//
// ---------------------------------------------------------------------------
// The two design calls this file IS (ROADMAP.md's own "needs its own design
// pass: a flat cap vs. one that scales per stockpile built, and what happens
// when storage is full"):
//
// 1. PER-GOOD, NOT PER-TOTAL. The cap below is "how much of ONE kind you may
//    hold", not "how much stuff in total". A single shared total sounds more
//    like a warehouse, but it fails badly in play: hoarding 400 stone would
//    silently block the fish you need to eat and the wheat your farmer is
//    walking home, and the player has no way to see *which* thing caused it.
//    Per-kind keeps both halves legible — the message names the good ("your
//    Wood stores are full"), and so does the fix (spend that good, or build
//    more storage). It also matches how the deposit AI thinks: a hauler
//    carries exactly one resource, so "is there room for what I'm holding" is
//    a real, answerable question rather than a global mood.
//
// 2. IT SCALES WITH WHAT YOU BUILT, and refuses the overflow out loud. Every
//    deposit-point piece contributes (see STORAGE_PER_BUILDING) so "build
//    more storage" does the intuitive thing. Excess is REFUSED, never
//    silently swallowed and never destroyed: `addItems` takes what fits,
//    reports the rest, and — importantly — never *shrinks* a stock that is
//    already over cap (an old save, or a Stockpile you just demolished). A
//    cap that could delete goods you already own would read as data loss, not
//    as a squeeze.
//
// Deliberately NOT capped: gold (it is inside ItemId but it is money, not
// goods — capping it breaks every quest reward, sale and tithe), tools,
// weapons, armor, carriers, potions and the water pail. Those are possessions
// you carry, not bulk hauled to a store, and none of them arrives by the
// cartload. See BULK_GOODS for the exact list.
//
// Also deliberately not capped: anything that isn't `source: 'gather'`. A
// quest reward, crypt loot or the royal chest arrives once and can never be
// re-earned, so refusing one destroys content rather than squeezing an
// economy; and `craft` writes its output straight to the inventory because
// its ingredients are already spent. The cap governs what the world YIELDS
// you — see addItems' own comment in the store for the full rule.
import type { ItemId, PlacedBuilding } from './types';
import { isBuilt } from './types';

/** Everything a gather/haul trip can actually deliver by the armful — the
 *  raw materials, their refined forms, and the food made from them. An item
 *  NOT in this list is uncapped, on purpose (see this file's header). */
export const BULK_GOODS: readonly ItemId[] = [
  'wood', 'plank', 'stone', 'iron_ore', 'iron_bar',
  'fish', 'cooked_fish', 'flowers', 'wheat', 'bread', 'herb',
  // Wave 9's cooked dishes belong with bread and cooked fish for the same
  // reason those two are here: stored food is stored goods. In practice the
  // ceiling never bites them (nothing GATHERS a tart, and `craft` writes past
  // the cap on purpose) — listing them keeps the Satchel's own readout honest
  // about what the stores hold rather than silently exempting three foods.
  'pottage', 'fish_stew', 'blossom_tart',
];

const BULK_SET = new Set<ItemId>(BULK_GOODS);

export function isBulkGood(id: ItemId): boolean {
  return BULK_SET.has(id);
}

/** What you can keep of one good with nothing built at all — the sacks and
 *  crates already around the hearth. Chosen generous enough that an early
 *  game never touches it (a starting player has nowhere near 80 of anything)
 *  and the first time the ceiling is felt is well after the first Stockpile
 *  could have been raised. */
export const BASE_STORAGE_PER_GOOD = 80;

/** Per-good capacity each built deposit point adds — every kind the hauling
 *  AI targets (`haul.ts`'s `targetKinds`) counts, at honest relative sizes:
 *  a barrel is 2 planks of overflow, a Stockpile is the real store, and the
 *  Wave 9 Storehouse is the dedicated upgrade that also confers the villager
 *  carry bonus (data/attributes.ts). Keep this table and `targetKinds` in
 *  step — a deposit point that holds nothing is a wasted walk. */
export const STORAGE_PER_BUILDING: Record<string, number> = {
  barrel: 12,
  stockpile: 60,
  storehouse: 160,
};

// The capacity read happens per think tick per hauling agent (haul.ts's
// target_usable) as well as on every addItems, so the O(buildings) scan is
// memoised on the ARRAY IDENTITY: zustand replaces `st.buildings` wholesale on
// every placement/demolition/construction tick, so a matching reference
// provably means an unchanged building set. Nothing else needs invalidating.
let capCacheKey: PlacedBuilding[] | null = null;
let capCacheVal = BASE_STORAGE_PER_GOOD;

/** How much of any ONE bulk good the player may hold, given what's standing.
 *  Counts every world's deposit points, not just the homestead's: the
 *  inventory it caps is itself one global bag shared across every instance,
 *  so filtering to `isHomeBuilding` here would cap goods a settlement's own
 *  stores are holding. */
export function storageCapacity(buildings: PlacedBuilding[]): number {
  if (buildings === capCacheKey) return capCacheVal;
  let cap = BASE_STORAGE_PER_GOOD;
  for (const b of buildings) {
    const per = STORAGE_PER_BUILDING[b.type];
    if (per && isBuilt(b)) cap += per;
  }
  capCacheKey = buildings;
  capCacheVal = cap;
  return cap;
}

/** The real stores a villager walks a load to, BIGGEST FIRST. Barrels are
 *  deliberately absent: they add capacity and `haul.ts` will happily deposit
 *  into one that's already the nearest target, but they must never become the
 *  homestead's notional "stores" — a decorative barrel by the fence would
 *  otherwise pull the whole roster's walk-to point across the yard. */
export const STORE_TYPES: readonly string[] = ['storehouse', 'stockpile'];

/** The best store standing, or null for "haul to the settlement centre" (the
 *  fallback every caller already had). `extra` filters by instance/ownership
 *  without forcing the caller to allocate a filtered array per frame. */
export function bestStore(
  buildings: PlacedBuilding[],
  extra?: (b: PlacedBuilding) => boolean,
): PlacedBuilding | null {
  for (const type of STORE_TYPES) {
    for (const b of buildings) {
      if (b.type !== type || !isBuilt(b)) continue;
      if (extra && !extra(b)) continue;
      return b;
    }
  }
  return null;
}

/** Room left for `id` — 0 for a full store, Infinity for anything uncapped.
 *  Never negative, so an over-cap stock reads as "no room", not as a debt. */
export function roomFor(id: ItemId, held: number, buildings: PlacedBuilding[]): number {
  if (!isBulkGood(id)) return Infinity;
  return Math.max(0, storageCapacity(buildings) - held);
}
