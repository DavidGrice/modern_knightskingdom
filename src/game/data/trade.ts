import type { ItemId } from '../types';

// The traveling merchant's ledger. He buys your surplus at these prices and
// sells a small stock at a healthy markup — a proper medieval margin.

// just outside BUILD_REGION's east edge (±30), on the walking route between
// the homestead and the pond — the old spot (14, 20) parked the cart square
// in the middle of the player's own build plot (Phase 10 #9, folded into
// Phase 20's homestead re-site as planned)
// L68 · the merchant stood at (36, 16) — four metres off the east edge of a
// fully-bought holding, right where the last deed's build squares land, so
// finishing the homestead meant building around a shopkeeper. Then moved to
// (8, 44) — outside every land tier's footprint, but still not the "two
// south guard posts" the roadmap actually asked for, since the props those
// referred to hadn't been identified yet.
//
// L68 (resolved, superseded) · the two guard posts WERE the mc001 ("Wall
// Corner (Small)") huts in StarterVillage.tsx — the same props already
// carrying Alric's and Beda's houses. The merchant used to stand between
// them, sharing their corner rather than having a camp of his own — the
// "shares a corner" gap this wave's own item closed.
//
// Wave 46 (B4) · a real walled camp of his own, down a short spur off
// road.ts's westward trunk (leg 6) rather than borrowing Alric's/Beda's
// corner. See MerchantCamp.tsx for the mc001/mc005 enclosure and
// Defenders.tsx for the guard posted here via MERCHANT_CAMP_STATION (the
// same fixed-point stationId sentinel `keep:<socketId>` already pioneered —
// a second sentinel, not new machinery). Clear of Alric/Beda (~35m), clear
// of Northwood Stand's fenced rectangle (~35m), and well outside
// BUILD_REGION on the x-axis alone (checked against grounds.generated.json
// and buildables.ts's own BUILD_REGION). Facing the yard's north-facing
// gate, back toward the spur.
export const MERCHANT_SPOT = { x: -76.8, z: 16, yaw: Math.PI };

/** The sentinel stationId a defender is given to stand guard at the
 *  merchant's camp — the same shape as J51's own `keep:<socketId>` sentinel
 *  (Defenders.tsx/VillagersPanel.tsx), a second fixed point rather than a
 *  real PlacedBuilding id. `stationDefender()` (gameStore.ts) does zero
 *  validation of the id it is given, so this needs no store changes. */
export const MERCHANT_CAMP_STATION = 'merchant_camp';

export const SELL_PRICES: Partial<Record<ItemId, number>> = {
  wood: 1,
  plank: 2,
  stone: 2,
  flowers: 2,
  fish: 3,
  cooked_fish: 5,
  iron_ore: 4,
  iron_bar: 8,
  wheat: 2,
  bread: 6,
  // Wave 9 · the cooked dishes. Priced a little above what their ingredients
  // would have fetched raw (bread and cooked fish each clear +2 that way), a
  // touch better for the fiddlier ones — so cooking for the merchant is a
  // modest trade and eating them is still the point.
  pottage: 6,
  fish_stew: 11,
  blossom_tart: 14,
};

export interface BuyOffer {
  item: ItemId;
  qty: number;
  price: number;
}

export const BUY_OFFERS: BuyOffer[] = [
  { item: 'plank', qty: 2, price: 7 },
  { item: 'stone', qty: 2, price: 7 },
  { item: 'iron_bar', qty: 1, price: 14 },
  { item: 'bolt', qty: 4, price: 6 },
  { item: 'flowers', qty: 1, price: 4 },
  { item: 'crossbow', qty: 1, price: 60 },
];

/** the merchant keeps daylight hours */
export function merchantPresent(time: number): boolean {
  return time > 0.3 && time < 0.72;
}

// ---------------------------------------------------------------------------
// Wave 49 (C3) · a dynamic market. One signed "pressure" level per item drives
// BOTH directions of its price: selling nudges it toward -1 (you flooded the
// market — it's now cheap in both directions), buying nudges it toward +1
// (scarcity — pricier in both directions). A single coherent lever, not two.
//
// Read lazily, the same "stamp a time, decay-on-read" convention this
// codebase already uses for `lastTaxAt`/`lastCollectedAt` (gameStore.ts) and
// `settlementRaidCooldownMs`'s own pressure-interpolated cooldown
// (settlementRaid.ts) — generalized here from a binary gate/interpolated
// bound to a continuous value that decays linearly back to its 0 baseline.
//
// Numbers justified against real feel: one unit moves the price ~1%
// (MARKET_NUDGE_PER_UNIT × MARKET_SENSITIVITY) — imperceptible, so a single
// sale never "feels broken." A Sell All of ~25 units of one good swings it to
// the floor (-25%) — a real, earned "you crashed that market" moment. 20
// minutes to fully recover sits deliberately above the 5-minute tax gate and
// the 6-15-minute raid-pressure band (settlementRaidCooldownMs's own floor/
// ceiling) because a market swing should span "go do something else and come
// back," not "wait through one loading screen." The ±25% cap keeps the price
// bounded on both ends — never free, never worthless — compounding safely
// with the 1g floor gameStore.ts's buyOffer already clamps to.
export interface MarketEntry {
  /** signed supply/demand pressure, clamped to [-1, 1]; 0 = baseline */
  level: number;
  /** epoch ms of the last trade that moved this item's level */
  lastTradeAt: number;
}

/** price swing per unit bought(+)/sold(-), before MARKET_SENSITIVITY scales
 *  it into an actual percentage — see this section's header for the math. */
export const MARKET_NUDGE_PER_UNIT = 0.04;
/** level === ±1 means the price is ±25% off baseline */
export const MARKET_SENSITIVITY = 0.25;
/** real minutes for a full ±1 swing to linearly decay back to 0 */
export const MARKET_RECOVERY_MS = 20 * 60_000;

/** `entry.level`, decayed linearly toward 0 for the real time elapsed since
 *  `lastTradeAt` — a fresh entry (or none at all) is baseline (0). */
export function decayedMarketLevel(entry: MarketEntry | undefined, now: number): number {
  if (!entry) return 0;
  const elapsed = now - entry.lastTradeAt;
  const remaining = Math.max(0, 1 - elapsed / MARKET_RECOVERY_MS);
  return entry.level * remaining;
}

/** decay-then-nudge-then-clamp — the one write path every trade goes
 *  through. `delta` is signed: positive for a purchase (scarcity), negative
 *  for a sale (oversupply). */
export function nudgeMarketLevel(entry: MarketEntry | undefined, delta: number, now: number): MarketEntry {
  const level = Math.max(-1, Math.min(1, decayedMarketLevel(entry, now) + delta));
  return { level, lastTradeAt: now };
}

/** the live, signed price-swing fraction this item's current pressure
 *  implies — e.g. +0.25 means 25% pricier (scarce), -0.25 means 25% cheaper
 *  (oversupplied). Applied identically to both the sell price and the buy
 *  price for the same item (see this section's header note — one lever). */
export function marketPriceMultiplier(entry: MarketEntry | undefined, now: number): number {
  return decayedMarketLevel(entry, now) * MARKET_SENSITIVITY;
}
