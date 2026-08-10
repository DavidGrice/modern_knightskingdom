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
// L68 (resolved) · the two guard posts ARE the mc001 ("Wall Corner (Small)")
// huts in StarterVillage.tsx — the same props already carrying Alric's and
// Beda's houses, at (-41.5, 36.5) and (-34, 44). The merchant now stands
// between them, on the road's own westward run (road.ts's route passes
// right through this corner), clear of both huts' and both NPCs'
// STARTER_VILLAGE_CLEAR radii (world.ts) and well outside BUILD_REGION —
// no overlap with either the homestead or any GROUNDS section (checked
// against grounds.ts's own dev-time overlap assertions). Facing back down
// the road toward the homestead.
export const MERCHANT_SPOT = { x: -37.5, z: 40, yaw: -1.21 };

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
