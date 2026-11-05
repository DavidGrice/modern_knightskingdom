import { describe, expect, it } from 'vitest';
import { buyQuote, haggleOf, sellQuote, type Haggler } from './pricing';
import { caravanQuoteGold } from './caravan';
import { BUY_OFFERS, MARKET_SENSITIVITY, SELL_PRICES } from './trade';
import { GUILDS } from './guilds';
import type { ItemId } from '../types';

// the formulas as each place wrote them out before CLN-23, term for term
const old = {
  sellItem: (price: number, n: number, m: number, h: Haggler) => Math.round(price * n * (1 + m + h.wit * 0.04
    + (h.silverTongue ? 0.15 : 0) + (h.honestWeight ? 0.08 : 0) + (h.wanderer ? 0.02 : 0))),
  buyOffer: (price: number, m: number, h: Haggler) => Math.max(1, Math.round(price * (1 + m - h.wit * 0.04
    - (h.silverTongue ? 0.15 : 0) - (h.honestWeight ? 0.08 : 0) - (h.wanderer ? 0.02 : 0)))),
  shopSellTicket: (price: number, m: number, h: Haggler) => Math.round(price * (1 + m + h.wit * 0.04
    + (h.silverTongue ? 0.15 : 0) + (h.honestWeight ? 0.08 : 0))),
  shopBuyTicket: (price: number, m: number, h: Haggler) => Math.max(1, Math.round(price * (1 + m - h.wit * 0.04
    - (h.silverTongue ? 0.15 : 0) - (h.honestWeight ? 0.08 : 0)))),
  guildTicket: (price: number, h: Haggler) => Math.max(1, Math.round(price * (1 - h.wit * 0.04
    - (h.silverTongue ? 0.15 : 0) - (h.honestWeight ? 0.08 : 0)))),
  caravan: (price: number, qty: number, h: Haggler) => Math.round(price * qty * 1.6 * (1 + h.wit * 0.04
    + (h.silverTongue ? 0.15 : 0) + (h.honestWeight ? 0.08 : 0))),
};

/** every haggler from no Wit to ten, with and without each perk, Wanderer or not */
const hagglers: Haggler[] = [];
for (let wit = 0; wit <= 10; wit++) {
  for (let k = 0; k < 8; k++) hagglers.push({ wit, silverTongue: !!(k & 1), honestWeight: !!(k & 2), wanderer: !!(k & 4) });
}
const markets = [-0.35, -0.1, 0, 0.12, 0.3];
const prices = [1, 2, 7, 13, 40, 95];
/** an offer of one of something the merchant never buys back (a bolt), so that F-16's floor leaves its price alone */
const unsold = (price: number) => ({ item: 'bolt' as ItemId, qty: 1, price });

describe('the one haggle', () => {
  it("charges the store's sale and purchase exactly as sellItem and buyOffer did, for every haggler, market and price", () => {
    let n = 0;
    for (const h of hagglers) for (const m of markets) for (const p of prices) {
      for (const q of [1, 3, 12]) { expect(sellQuote(p, q, m, h)).toBe(old.sellItem(p, q, m, h)); n++; }
      expect(buyQuote(unsold(p), m, h)).toBe(old.buyOffer(p, m, h));
    }
    expect(n).toBe(hagglers.length * markets.length * prices.length * 3);
  });

  it("prices the merchant's tickets as he charges: the same as before for all but a Wanderer, who was shown his cut left out", () => {
    let changed = 0, same = 0;
    for (const h of hagglers) for (const m of markets) for (const p of prices) {
      const sell = sellQuote(p, 1, m, h), buy = buyQuote(unsold(p), m, h);
      if (h.wanderer) {
        if (sell !== old.shopSellTicket(p, m, h) || buy !== old.shopBuyTicket(p, m, h)) changed++;
      } else {
        expect([sell, buy]).toEqual([old.shopSellTicket(p, m, h), old.shopBuyTicket(p, m, h)]);
        same++;
      }
    }
    expect(same).toBeGreaterThan(0);
    expect(changed).toBeGreaterThan(0);
  });

  it("prices a guild's ticket with the market's pressure and the Wanderer's cut, as its purchase charges; on a market at rest, no Wanderer, as before", () => {
    for (const h of hagglers) for (const p of prices) {
      if (!h.wanderer) expect(buyQuote(unsold(p), 0, h)).toBe(old.guildTicket(p, h));
      for (const m of markets) expect(buyQuote(unsold(p), m, h)).toBe(old.buyOffer(p, m, h));
    }
    // a scarce item: the ticket used to show the price at rest
    expect(buyQuote(unsold(40), 0.3, hagglers[0])).toBe(52);
    expect(old.guildTicket(40, hagglers[0])).toBe(40);
  });

  it("leaves a caravan's quote as it was: no market, no Wanderer's cut", () => {
    for (const id of Object.keys(SELL_PRICES) as ItemId[]) for (const h of hagglers) for (const q of [1, 5, 20]) {
      expect(caravanQuoteGold(id, q, h.wit, h.silverTongue, h.honestWeight)).toBe(old.caravan(SELL_PRICES[id] ?? 0, q, h));
    }
  });

  it("reads the player's haggle from the store's own fields", () => {
    expect(haggleOf({ attrSpent: {}, perks: [], character: null })).toEqual({ wit: 0, silverTongue: false, honestWeight: false, wanderer: false });
    expect(haggleOf({ attrSpent: { wit: 4 }, perks: ['honest_weight', 'silver_tongue'], character: { classId: 'wanderer' } }))
      .toEqual({ wit: 4, silverTongue: true, honestWeight: true, wanderer: true });
  });
});

// F-16 (OD-07) · the same-market floor. Wit is uncapped, so the haggle runs from none to far past anything a player
// earns; the markets run from a flooded one to a scarce one (data/trade.ts caps the pressure at ±25%).
const resold = [...BUY_OFFERS, ...GUILDS.flatMap((g) => g.vendor)].filter((o) => SELL_PRICES[o.item]);
const wits = [...Array.from({ length: 61 }, (_, i) => i), 75, 100, 250, 1000, 1e4, 1e6];
const anyHaggler: Haggler[] = wits.flatMap((wit) => Array.from({ length: 8 }, (_, k) => ({ wit, silverTongue: !!(k & 1), honestWeight: !!(k & 2), wanderer: !!(k & 4) })));
const anyMarket = Array.from({ length: 11 }, (_, i) => -0.25 + i * 0.05);

describe('the same-market floor', () => {
  // at any pressure, above what the market pays for one even at its ceiling: a purchase lifts the market for the sale
  // after it, so the pressure the goods were bought at is not the one they sell at
  it('prices every unit of every offer the market buys back above what it pays for one at its dearest, at every haggle and pressure', () => {
    expect(resold.map((o) => o.item)).toEqual(expect.arrayContaining(['plank', 'stone', 'iron_bar', 'flowers', 'cooked_fish', 'fish_stew']));
    for (const o of resold) for (const h of anyHaggler) for (const m of anyMarket) {
      expect(buyQuote(o, m, h) / o.qty).toBeGreaterThan(sellQuote(SELL_PRICES[o.item]!, 1, MARKET_SENSITIVITY, h));
    }
  });

  it('is the floor and no more: an offer whose haggled price clears it, or that the market never buys back, costs what it did', () => {
    let kept = 0, raised = 0;
    for (const o of [...BUY_OFFERS, ...GUILDS.flatMap((g) => g.vendor)]) for (const h of anyHaggler) for (const m of anyMarket) {
      const was = old.buyOffer(o.price, m, h), resale = SELL_PRICES[o.item];
      const floor = resale ? sellQuote(resale, o.qty, MARKET_SENSITIVITY, h) + o.qty : 0;
      expect(buyQuote(o, m, h)).toBe(Math.max(was, floor));
      if (was >= floor) kept++; else raised++;
    }
    expect(kept).toBeGreaterThan(0);
    expect(raised).toBeGreaterThan(0);
    // the merchant's own stock at no Wit, on a market at rest: as before
    expect(BUY_OFFERS.map((o) => buyQuote(o, 0, hagglers[0]))).toEqual([7, 7, 14, 6, 4, 60]);
  });
});
