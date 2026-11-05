// CLN-23 · the one haggle the game prices by. Selling to the merchant (gameStore's sellItem), buying from him or from a
// guild's store (buyOffer, which a guild's buyGuildOffer goes through), the tickets those panels show
// (hud/ShopPanel.tsx, hud/GuildPanel.tsx), and a caravan's quote (data/caravan.ts) each used to write the formula out
// for itself, and they had drifted apart: the merchant's tickets left out the Wanderer's cut, so a Wanderer was shown
// one price and charged another; and a guild's ticket left out the market's pressure as well, which its purchase went
// through all the same.

import type { ItemId } from '../types';
import { MARKET_SENSITIVITY, SELL_PRICES } from './trade';

/** What the player brings to a bargain: his Wit (attribute points spent on it), and whether he has the Silver Tongue
 *  and Honest Weight perks and is a Wanderer. */
export type Haggler = { wit: number; silverTongue: boolean; honestWeight: boolean; wanderer: boolean };

/** Each point of Wit haggles this much (Wave 23). */
export const HAGGLE_PER_WIT = 0.04;
/** The Silver Tongue trade-off perk (its downside: Storm strikes faster — game/enemyAi/blows.ts's fireAtPlayer). */
export const SILVER_TONGUE_HAGGLE = 0.15;
/** The Honest Weight perk (Wave 52): the same in both directions, with no downside. */
export const HONEST_WEIGHT_HAGGLE = 0.08;
/** The Wanderer's Fair Dealer passive (Wave 32): a small haggle, his class having no signature skill to hang one on. */
export const WANDERER_HAGGLE = 0.02;

/** The player's haggle, as the store holds what it is made of. */
export function haggleOf(s: { attrSpent: { wit?: number }; perks: readonly string[]; character: { classId?: string } | null }): Haggler {
  return {
    wit: s.attrSpent.wit ?? 0,
    silverTongue: s.perks.includes('silver_tongue'),
    honestWeight: s.perks.includes('honest_weight'),
    wanderer: s.character?.classId === 'wanderer',
  };
}

/** What `qty` of an item worth `price` each fetch when sold, with the market's pressure on it (`market`: data/trade.ts's
 *  marketPriceMultiplier) and the player's haggle added on — one rounding, at the end. The terms are summed in the order
 *  sellItem always summed them, so that its sums come out to the last bit as they did. */
export function sellQuote(price: number, qty: number, market: number, h: Haggler): number {
  return Math.round(price * qty * (1 + market + h.wit * HAGGLE_PER_WIT
    + (h.silverTongue ? SILVER_TONGUE_HAGGLE : 0)
    + (h.honestWeight ? HONEST_WEIGHT_HAGGLE : 0)
    + (h.wanderer ? WANDERER_HAGGLE : 0)));
}

/** What an offer of `qty` of an item, priced `price` for the lot, costs to buy: the market's pressure added and the
 *  player's haggle taken off — never less than 1 gold, so that a maxed haggler is not handed goods for nothing. Summed
 *  in buyOffer's own order.
 *
 *  F-16 (OD-07) · and never at or below what the same market pays back for them at the same haggle: if the merchant
 *  buys the item (SELL_PRICES), the lot costs at least a gold a unit more than sellQuote gives for it at the market's
 *  ceiling (+MARKET_SENSITIVITY). Wit is uncapped and takes as much off a purchase as it adds to a sale, so without this
 *  a high-Wit player bought and sold the same goods at a profit (Wit 25: an iron bar for 1 gold, sold back for 16).
 *  The ceiling, not the pressure of the moment, because every unit bought lifts the market for the sale after it: a
 *  flooded market bought up a lot at a time and sold back at once sold everything at +25% that was bought nearer 0%.
 *  Against the ceiling no run of purchases and sales, in lots of any size, comes out ahead (the gold a unit outweighs
 *  the roundings; store/slices/inventorySlice.test.ts runs the loops through the store). Cross-market profit is meant
 *  (OD-07): this is the floor of one market. */
export function buyQuote(offer: { item: ItemId; qty: number; price: number }, market: number, h: Haggler): number {
  const cost = Math.max(1, Math.round(offer.price * (1 + market - h.wit * HAGGLE_PER_WIT
    - (h.silverTongue ? SILVER_TONGUE_HAGGLE : 0)
    - (h.honestWeight ? HONEST_WEIGHT_HAGGLE : 0)
    - (h.wanderer ? WANDERER_HAGGLE : 0))));
  const resale = SELL_PRICES[offer.item];
  return resale ? Math.max(cost, sellQuote(resale, offer.qty, MARKET_SENSITIVITY, h) + offer.qty) : cost;
}
