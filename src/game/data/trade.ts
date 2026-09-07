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
