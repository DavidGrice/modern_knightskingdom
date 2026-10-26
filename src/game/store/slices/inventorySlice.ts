// CLN-07 · the store's goods slice: the satchel and the stores (addItems, canAfford), crafting, a tool's wear and
// repair, buying and selling, and spending a brewed dye to open its palette row for the whole save (unlockDye).
import type { ItemId } from '../../types';
import { SELL_PRICES, marketPriceMultiplier, nudgeMarketLevel, MARKET_NUDGE_PER_UNIT } from '../../data/trade';
import { buyQuote, haggleOf, sellQuote } from '../../data/pricing';
import { ATTR_FX } from '../../data/effects';
import { wearPerUse } from '../../data/derivedStats';
import { roomFor } from '../../storage';
import { RECIPES, repairCostFor } from '../../data/recipes';
import { ITEMS } from '../../data/items';
import { DYE_ROW_BY_ID } from '../../data/dyes';
import { audio } from '@/lib/audio';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

// Wave 9 · a full store refuses goods on every villager trip and every swing;
// one toast per this window is enough to be understood without becoming the
// notification feed. Module-level (not store state) for the same reason
// `seq.notif` is (storeCounters.ts): it is presentation bookkeeping, never saved.
const FULL_STORE_NOTIFY_MS = 9000;
let lastFullStoreNotifyAt = 0;

export interface InventorySlice {
  sellItem: (item: ItemId, qty: number) => void;
  buyOffer: (item: ItemId, qty: number, price: number) => void;

  useTool: (id: ItemId) => void;
  repairTool: (id: ItemId) => void;

  /** Wave 9 dyes — spends one brewed dye to open its palette row for good */
  unlockDye: (rowId: string) => void;

  // systems
  /** returns what was actually accepted after the storage cap (game/storage.ts)
   *  — identical to `items` whenever there is room, which is the normal case */
  addItems: (items: Partial<Record<ItemId, number>>, source?: 'gather' | 'craft' | 'grant') => Partial<Record<ItemId, number>>;

  craft: (recipeId: string) => boolean;
  canAfford: (cost: Partial<Record<ItemId, number>>) => boolean;
}

export const createInventorySlice: SliceCreator<InventorySlice> = (set, get) => {
  const { bumpQuestCounters } = sharedActions(set, get);

  return {
    // wear per use is deliberately gentle — ~50 uses before a tool is fully
    // worn, and being worn slows the tool down rather than disabling it, so
    // durability is a reason to visit the workbench, not a punishment.
    useTool: (id) => {
      const st = get();
      const before = st.durability[id] ?? 100;
      if (before <= 0) return;
      // Wave 52 (D2): refactored to a multiplicative chain so Iron Discipline
      // (a trade-off that speeds wear) can stack against Steady Hands (which
      // slows it) instead of the two being mutually exclusive flat values.
      // Verified this reproduces Steady Hands' old 1.4 exactly: 2 * 0.7 = 1.4.
      // Steady Hands, Iron Discipline, Tempered Edges and the Smith's
      // Prentice's Forge-Scarred, in that order (data/derivedStats.ts)
      const wear = wearPerUse(st);
      const after = Math.max(0, before - wear);
      set({ durability: { ...st.durability, [id]: after }, dirty: true });
      if (after <= 0) st.notify(`Your ${ITEMS[id].name} is worn out — repair it at the workbench.`);
    },

    repairTool: (id) => {
      const st = get();
      const cost = repairCostFor(id, st.skillTree);
      if (Object.keys(cost).length === 0) return;
      if (!st.canAfford(cost)) { st.notify('Not enough materials to repair that.'); return; }
      const inv = { ...st.inventory };
      for (const [k, n] of Object.entries(cost)) inv[k as ItemId] = (inv[k as ItemId] ?? 0) - (n as number);
      set({ inventory: inv, durability: { ...st.durability, [id]: 100 }, dirty: true });
      audio.play('brick_connect', 0.7);
      st.notify(`${ITEMS[id].name} repaired!`, true);
    },

    sellItem: (item, qty) => {
      const st = get();
      const price = SELL_PRICES[item];
      if (!price) return;
      const held = st.inventory[item] ?? 0;
      const n = Math.min(qty, held);
      if (n <= 0) return;
      const inv = { ...st.inventory };
      inv[item] = held - n;
      const now = Date.now();
      // Wave 49 (C3) · this item's live supply/demand pressure, folded in as
      // one more additive haggle term right alongside Wit/Silver Tongue/
      // Wanderer below — a market you've flooded pays less, a scarce one
      // pays more, in BOTH directions (see data/trade.ts's own header note:
      // one signed lever drives both the sell and buy price).
      const marketMul = marketPriceMultiplier(st.marketState[item], now);
      // ...and the player's haggle on top: Wit, Silver Tongue, Honest Weight
      // and the Wanderer's Fair Dealer (data/pricing.ts, the one formula the
      // tickets and the caravan's quote share)
      const take = sellQuote(price, n, marketMul, haggleOf(st));
      inv.gold = (inv.gold ?? 0) + take;
      set({
        inventory: inv,
        // selling floods the market — nudge this item's pressure toward
        // oversupply (-1), decaying back to baseline over real time (see
        // nudgeMarketLevel's own decay-then-nudge-then-clamp shape)
        marketState: { ...st.marketState, [item]: nudgeMarketLevel(st.marketState[item], -n * MARKET_NUDGE_PER_UNIT, now) },
        stats: { ...st.stats, goldEarnedLifetime: st.stats.goldEarnedLifetime + take },
        dirty: true,
      });
      audio.play('treasure', 0.5);
    },

    buyOffer: (item, qty, price) => {
      const st = get();
      const now = Date.now();
      // Wave 49 (C3) · the same live market pressure sellItem() reads,
      // applied the other direction: a scarce item (positive pressure) costs
      // MORE to buy, exactly as it also pays more to sell into.
      const marketMul = marketPriceMultiplier(st.marketState[item], now);
      // Wave 23 · the same haggle sellItem() gives when selling, spent the
      // other way here (data/pricing.ts) — clamped to 1g so a maxed haggler
      // is never handed goods for free.
      const cost = buyQuote(price, marketMul, haggleOf(st));
      if ((st.inventory.gold ?? 0) < cost) {
        st.notify('Not enough gold!');
        return;
      }
      const inv = { ...st.inventory };
      inv.gold = (inv.gold ?? 0) - cost;
      inv[item] = (inv[item] ?? 0) + qty;
      set({
        inventory: inv,
        // buying drains stock — nudge this item's pressure toward scarcity (+1)
        marketState: { ...st.marketState, [item]: nudgeMarketLevel(st.marketState[item], qty * MARKET_NUDGE_PER_UNIT, now) },
        dirty: true,
      });
      audio.play('brick_connect', 0.6);
    },

    // Wave 9 dyes · spend one brewed dye to open its palette row for the rest
    // of the save (data/dyes.ts argues once-not-per-recolour). Deliberately
    // additive: nothing here can ever REMOVE a colour, and a save with no
    // `dyes` at all simply keeps the free swatches it always had.
    unlockDye: (rowId) => {
      const st = get();
      const row = DYE_ROW_BY_ID[rowId];
      if (!row || st.dyes.includes(rowId)) return;
      if ((st.inventory[row.item] ?? 0) <= 0) {
        st.notify(`You have no ${ITEMS[row.item]?.name ?? 'dye'} — steep one at a campfire.`);
        return;
      }
      st.addItems({ [row.item]: -1 });
      set({ dyes: [...st.dyes, rowId], dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${row.label} unlocked — the vat takes, and the colour is yours for good.`, true);
    },

    // Wave 9 · the one inventory-mutation entry point in the game, and so the
    // only place storage capacity has to be enforced (game/storage.ts holds
    // the design reasoning). Returns what was ACTUALLY accepted, so a caller
    // that announces its haul ("You got 3× Wood Log!") can announce the truth
    // instead of what it hoped for. Every pre-Wave-9 call site ignores the
    // return value and behaves exactly as before.
    //
    // The cap binds `source: 'gather'` ONLY — the player's own harvest, a
    // villager's delivery, and the AI's HaulToDeposit. A 'grant' (quest
    // reward, dungeon/crypt loot, the royal chest, a sale's gold) is a gift
    // that arrives once and cannot be re-earned, so turning one away would be
    // destroying content, not squeezing an economy. Same principle the craft
    // action follows for its own direct write: the cap governs what the world
    // YIELDS you, not what you are given or what your own hands convert.
    addItems: (items, source = 'grant') => {
      const st = get();
      const inv = { ...st.inventory };
      const capped = source === 'gather';
      const accepted: Partial<Record<ItemId, number>> = {};
      const refused: Partial<Record<ItemId, number>> = {};
      for (const [rawId, rawN] of Object.entries(items)) {
        const id = rawId as ItemId;
        const n = rawN as number;
        const have = inv[id] ?? 0;
        // spending is never blocked, and an uncapped item (gold, tools,
        // weapons, potions) short-circuits to the old unconditional path
        const take = capped && n > 0 ? Math.min(n, roomFor(id, have, st.buildings)) : n;
        if (take < n) refused[id] = n - take;
        if (take !== 0) {
          inv[id] = have + take;
          accepted[id] = take;
        }
      }
      const goldGained = accepted.gold ?? 0;
      let gathered = 0;
      if (source === 'gather') {
        for (const n of Object.values(accepted)) gathered += n as number;
      }
      // Bugfix (2026-08-14, found by Wave 13's verify pass): commit THIS
      // call's own inventory/stats BEFORE bumping quest counters below, not
      // after. bumpQuestCounters can synchronously complete a main quest —
      // every main quest carries grantItems now — and completeQuest() makes
      // its own NESTED st.addItems(grantItems, 'grant') call for the gold
      // reward. That nested call reads a fresh get().inventory and commits
      // its own set() immediately. If OUR set() ran after (as it used to),
      // our snapshot taken before the nested call would overwrite the
      // store's inventory right back over what the nested call just
      // committed — silently discarding the quest's gold every time the
      // LAST objective a gather completed was itself the quest's final
      // objective (guaranteed on first_steps, the game's first quest).
      // Setting first means the nested call always layers its own grant on
      // top of what we just wrote, instead of racing it.
      set({
        inventory: inv,
        stats: {
          ...st.stats,
          resourcesGathered: st.stats.resourcesGathered + gathered,
          goldEarnedLifetime: st.stats.goldEarnedLifetime + goldGained,
        },
        dirty: true,
      });
      if (source === 'gather') {
        for (const [id, n] of Object.entries(accepted)) {
          // quest counters track what reached the stores, not what was
          // swung at — an objective must not tick on a log that was turned
          // away at a full storehouse
          bumpQuestCounters('gather', id, n as number);
        }
      }
      // Refusal is LOUD (silently eating a haul is indistinguishable from a
      // bug) but throttled — a full store refuses on every villager trip and
      // every axe swing, and five identical toasts is its own kind of noise.
      const refusedIds = Object.keys(refused) as ItemId[];
      if (refusedIds.length) {
        const nowMs = Date.now();
        if (nowMs - lastFullStoreNotifyAt > FULL_STORE_NOTIFY_MS) {
          lastFullStoreNotifyAt = nowMs;
          const names = refusedIds.map((id) => ITEMS[id]?.name ?? id).join(', ');
          st.notify(`📦 Your stores are full — ${names} turned away. Build a Stockpile or Storehouse, or spend what you have.`);
        }
      }
      return accepted;
    },

    canAfford: (cost) => {
      const inv = get().inventory;
      return Object.entries(cost).every(([id, n]) => (inv[id as ItemId] ?? 0) >= (n as number));
    },

    craft: (recipeId) => {
      const st = get();
      const recipe = RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return false;
      if (recipe.requiresUnlock && !st.unlocks.includes(recipe.requiresUnlock)) return false;
      if (!st.canAfford(recipe.cost)) return false;
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(recipe.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      // Craft attribute: +4% per point that the work turns out a double batch
      const doubled = Math.random() < (st.attrSpent.craft ?? 0) * ATTR_FX.craft.doubleBatchChance;
      const made = recipe.outputCount * (doubled ? 2 : 1);
      // Wave 9 · this writes `inv` directly rather than through addItems, so
      // it deliberately bypasses the storage cap — do NOT "fix" that. The
      // ingredients are already spent two lines above, so a refused output
      // would destroy them outright; and a craft is a CONVERSION of goods you
      // already stored, not a new haul off the land, so it can only ever nudge
      // one good over the line while pulling others down. The cap governs what
      // the world yields you, not what your own hands turn it into.
      inv[recipe.output] = (inv[recipe.output] ?? 0) + made;
      set({
        inventory: inv,
        stats: { ...st.stats, itemsCrafted: st.stats.itemsCrafted + made },
        dirty: true,
      });
      if (recipe.skill && recipe.skillXp) st.addXp(recipe.skill, recipe.skillXp);
      audio.play(recipe.station === 'forge' ? 'flame' : 'brick_connect', 0.7);
      st.notify(doubled ? `Crafted ${recipe.name} — a double batch, masterwork hands!` : `Crafted ${recipe.name}`);
      bumpQuestCounters('craft', recipe.id, recipe.outputCount);
      return true;
    },
  };
};
