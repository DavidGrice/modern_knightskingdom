import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { useGameStore } from '../gameStore';
import { BUY_OFFERS, SELL_PRICES, marketPriceMultiplier } from '../../data/trade';
import { GUILDS } from '../../data/guilds';
import { buyQuote, haggleOf } from '../../data/pricing';
import type { CharacterConfig, ItemId } from '../../types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const NOW = 1_800_000_000_000;
const PURSE = 1e9;

/** every offer the merchant also buys back: his own stock and every guild's (a guild's purchase is a buyOffer) */
const resold = [...BUY_OFFERS, ...GUILDS.flatMap((g) => g.vendor)].filter((o) => SELL_PRICES[o.item]);

/** a purse and nothing else, this Wit and these perks, the item's market at `level` */
function stage(wit: number, perks: string[], wanderer: boolean, item: ItemId, level: number) {
  game().newGame({ ...HERO, classId: wanderer ? 'wanderer' : undefined });
  useGameStore.setState({
    attrSpent: { wit },
    perks,
    inventory: { gold: PURSE },
    marketState: level ? { [item]: { level, lastTradeAt: NOW } } : {},
  });
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockImplementation(() => NOW);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
});
afterEach(() => { vi.restoreAllMocks(); });

// F-16 (OD-07) · buying goods and selling them straight back at the same market never makes gold, at any Wit
describe('buy then sell at one market', () => {
  it('never pays: bought and sold back all at once or one by one, for every offer, haggle and market pressure', () => {
    let loops = 0, fell = 0;
    for (const o of resold) for (const wit of [0, 5, 10, 25, 60, 100, 1000, 1e6]) for (const k of [0, 1, 2, 3]) {
      const perks = [...(k & 1 ? ['silver_tongue'] : []), ...(k & 2 ? ['honest_weight'] : [])];
      for (const wanderer of [false, true]) for (const level of [-1, -0.5, 0, 0.5, 1]) for (const oneByOne of [false, true]) {
        stage(wit, perks, wanderer, o.item, level);
        // what the panels show for it (ShopPanel's and GuildPanel's tickets), before the purchase moves the market
        const ticket = buyQuote(o, marketPriceMultiplier(game().marketState[o.item], NOW), haggleOf(game()));
        game().buyOffer(o.item, o.qty, o.price);
        expect(PURSE - (game().inventory.gold ?? 0)).toBe(ticket);
        expect(game().inventory[o.item]).toBe(o.qty);
        if (oneByOne) for (let i = 0; i < o.qty; i++) game().sellItem(o.item, 1);
        else game().sellItem(o.item, o.qty);
        expect(game().inventory[o.item]).toBe(0);
        expect(game().inventory.gold).toBeLessThanOrEqual(PURSE);
        loops++;
        if ((game().inventory.gold ?? 0) < PURSE) fell++;
      }
    }
    expect(loops).toBe(resold.length * 8 * 4 * 2 * 5 * 2);
    expect(fell / loops).toBeGreaterThan(0.9);
  });

  // every unit bought lifts the market 1% for the sale after it: a flooded market bought up to its ceiling a lot at a
  // time, then sold all at once, sells everything at +25% that was bought on average near 0% — and the one sale floods
  // it again, ready for the next round
  it('never pays to buy a flooded market up to its ceiling a lot at a time, then sell it all back, round after round', () => {
    let rounds = 0;
    for (const o of resold) for (const wit of [0, 5, 8, 10, 25, 100, 1e6]) for (const k of [0, 3]) for (const wanderer of [false, true]) {
      stage(wit, k ? ['silver_tongue', 'honest_weight'] : [], wanderer, o.item, -1);
      let gold = PURSE;
      for (let round = 0; round < 3; round++) {
        while ((game().marketState[o.item]?.level ?? 0) < 1) game().buyOffer(o.item, o.qty, o.price);
        game().sellItem(o.item, game().inventory[o.item] ?? 0);
        expect(game().marketState[o.item]?.level).toBe(-1);
        expect(game().inventory.gold).toBeLessThan(gold);
        gold = game().inventory.gold ?? 0;
        rounds++;
      }
    }
    expect(rounds).toBe(resold.length * 7 * 2 * 2 * 3);
  });

  it('costs the Wit-25 player measured on main 3 gold on an iron bar, where it paid him 15', () => {
    stage(25, [], false, 'iron_bar', 0);
    game().buyOffer('iron_bar', 1, 14);
    expect(game().inventory.gold).toBe(PURSE - 19);
    game().sellItem('iron_bar', 1);
    expect(game().inventory.gold).toBe(PURSE - 3);
  });
});
