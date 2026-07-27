import type { ItemId } from '../types';

// The traveling merchant's ledger. He buys your surplus at these prices and
// sells a small stock at a healthy markup — a proper medieval margin.

// just outside BUILD_REGION's east edge (±30), on the walking route between
// the homestead and the pond — the old spot (14, 20) parked the cart square
// in the middle of the player's own build plot (Phase 10 #9, folded into
// Phase 20's homestead re-site as planned)
// L68 · the merchant stood at (36, 16) — four metres off the east edge of a
// fully-bought holding, right where the last deed's build squares land, so
// finishing the homestead meant building around a shopkeeper. Moved south to
// the road, outside every tier's footprint, where the traffic is anyway.
export const MERCHANT_SPOT = { x: 8, z: 44, yaw: Math.PI * 0.9 };

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
