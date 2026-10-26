// CLN-07 · the store's empire slice: claimed worlds, settlements and their yield, the keep's taxes, caravans, and the
// outcome of a rival's raid.
import type { CaravanRun, ItemId, Villager } from '../../types';
import { isHomeBuilding } from '../../types';
import { SETTLEMENT_FOUNDING } from '../../data/settlements';
import {
  CARAVAN_CAP_PER_CART, CARAVAN_INSURANCE_RATE, CARAVAN_LOSS_SURVIVE_FRACTION, CARAVAN_MAX_CARTS, CARAVAN_ROUTES,
  caravanQuoteGold, caravanRouteKey, effectiveCaravanRisk,
} from '../../data/caravan';
import { SETTLEMENT_RAID_YIELD_PENALTY_MS } from '../../settlementRaid';
import { ITEMS } from '../../data/items';
import { audio } from '@/lib/audio';
import { WORLD_DESTINATION_BY_ID } from '../../data/worlds';
import { TAX_COOLDOWN_MS } from '../constants';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

export interface EmpireSlice {
  claimWorld: (destId: string, x: number, z: number, groundY: number) => void;
  /** Empire arc, Wave 4: closes the settlement deed at a destination —
   *  claims the plot (a no-op if already claimed via the ordinary
   *  claimWorld/ClaimBanner path), records the settlement, and grants its
   *  first residents. x/z/groundY are the player's own position/sampled
   *  ground when they close the deed, same convention claimWorld already
   *  uses (see ClaimBanner.tsx). */
  foundSettlement: (destId: string, x: number, z: number, groundY: number) => void;
  /** Empire arc, Wave 4: wall-clock settlement income, mirroring
   *  collectTaxes' own cooldown-then-flat-amount shape exactly. */
  collectSettlementYield: (destId: string) => void;
  /** Wave 27: load cargo at `from` and dispatch it toward `to` — see
   *  data/caravan.ts's own header for why this is a wall-clock abstraction,
   *  not a physically-simulated journey. Debits the goods (and the
   *  insurance fee, if taken) from inventory immediately; requires at least
   *  one resident at `from` wearing a Hand Cart (gear.carrier === 'cart'). */
  dispatchCaravan: (from: string, to: string, item: ItemId, amount: number, insured: boolean) => void;
  /** Wave 27: collect a caravan run once its ETA has elapsed — pays out gold
   *  via the same Wit/Silver-Tongue formula sellItem() uses, rolling a real
   *  (mitigable, never total) loss chance unless insured. */
  collectCaravan: (from: string, to: string) => void;
  /** Wave 47 (B5) · settles the outcome of a rival raid against a founded
   *  settlement (game/settlementRaid.ts + SettlementRaidRunner.tsx), the
   *  only place `st.settlements[destId]` mutates for a raid. A WIN pays a
   *  gold/xp bonus scaled by `hpFrac` and bumps that settlement's own
   *  `kind:'defend'` errand (see data/settlements.ts). A LOSS never
   *  destroys anything — the real, reversible consequence is
   *  `lastCollectedAt` pushed forward by SETTLEMENT_RAID_YIELD_PENALTY_MS,
   *  delaying (never voiding) the next yield collection. Either way
   *  `lastRaidAt` is stamped so the next raid respects its own cooldown. */
  resolveSettlementRaid: (destId: string, won: boolean, hpFrac?: number) => void;

  collectTaxes: () => void;
}

export const createEmpireSlice: SliceCreator<EmpireSlice> = (set, get) => {
  const { bumpSideQuest } = sharedActions(set, get);

  return {
    collectTaxes: () => {
      const st = get();
      // taxes are a homestead-only mechanic (the Grand Keep's treasury) — a
      // remote outpost's own buildings shouldn't count toward the Keep
      const homeBuildings = st.buildings.filter(isHomeBuilding);
      const hasKeep = homeBuildings.some((b) => b.type === 'keep');
      if (!hasKeep || st.villagers.length === 0) {
        st.notify('Taxation requires a Grand Keep and at least one villager.');
        return;
      }
      const now = Date.now();
      if (now - st.lastTaxAt < TAX_COOLDOWN_MS) {
        const remainMin = Math.ceil((TAX_COOLDOWN_MS - (now - st.lastTaxAt)) / 60000);
        st.notify(`The treasury isn't ready yet — check back in ${remainMin}m.`);
        return;
      }
      const amount = 8 + st.villagers.length * 4 + Math.min(20, Math.floor(homeBuildings.length / 3));
      set({ lastTaxAt: now, dirty: true });
      st.addItems({ gold: amount }, 'grant');
      audio.play('treasure', 0.7);
      st.notify(`Collected ${amount} gold in taxes from your kingdom!`, true);
    },

    claimWorld: (destId, x, z, groundY) => {
      const st = get();
      if (st.claimedWorlds[destId]) return;
      set({ claimedWorlds: { ...st.claimedWorlds, [destId]: { x, z, groundY } }, dirty: true });
      st.notify('Land claimed! The aerial build menu (B) now works here too.', true);
    },

    // Empire arc, Wave 4 — see this action's own interface doc comment.
    // Wave 26: generalized off the single hardcoded Fenwick/template-08
    // literal to a lookup into SETTLEMENT_FOUNDING (data/settlements.ts)
    // — template-08's entry there holds these exact old values, so this is
    // byte-identical behavior for Fenwick and real support for any other
    // destId with a table entry (The Frozen Pass, as of this wave).
    foundSettlement: (destId, x, z, groundY) => {
      const st = get();
      if (st.settlements[destId]) return;
      const founding = SETTLEMENT_FOUNDING[destId];
      if (!founding) return;
      // re-validated here, not just in the UI's disabled state — same
      // "a stale panel can never hand out work you have not earned"
      // discipline acceptSideQuest already applies to its own blockers
      if (!st.completedSideQuests.includes(founding.requiredQuestId)) return;
      if (!st.canAfford(founding.cost)) {
        const costText = Object.entries(founding.cost).map(([id, n]) => `${n} ${id}`).join(', ');
        st.notify(`Not enough to file the deed — ${costText} needed.`);
        return;
      }
      // claims the plot too if the player never used the ordinary
      // ClaimBanner for this destination — a harmless no-op if they did
      // (claimWorld's own guard short-circuits on an existing claim)
      st.claimWorld(destId, x, z, groundY);
      st.addItems(
        Object.fromEntries(Object.entries(founding.cost).map(([id, n]) => [id, -(n as number)])),
      );
      const now = Date.now();
      const settlerDefs: Villager[] = founding.residents.map((r) => ({ ...r, world: destId }));
      const residents = settlerDefs.filter((r) => !st.villagers.some((v) => v.id === r.id));
      set({
        settlements: { ...st.settlements, [destId]: { since: now, lastCollectedAt: now } },
        villagers: [...st.villagers, ...residents],
        dirty: true,
      });
      audio.play('treasure', 0.9);
      const names = founding.residents.map((r) => r.name);
      const nameList = names.length > 1
        ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
        : names[0];
      st.notify(`The deed is filed — ${nameList} take up residence!`, true);
    },

    collectSettlementYield: (destId) => {
      const st = get();
      const settlement = st.settlements[destId];
      if (!settlement) return;
      const now = Date.now();
      if (now - settlement.lastCollectedAt < TAX_COOLDOWN_MS) {
        const remainMin = Math.ceil((TAX_COOLDOWN_MS - (now - settlement.lastCollectedAt)) / 60000);
        st.notify(`Nothing new to collect yet — check back in ${remainMin}m.`);
        return;
      }
      const residentCount = st.villagers.filter((v) => v.world === destId).length;
      // Wave 47 (B7) · growthTier is the first-ever real "growth" this system
      // has had — each tier earned by closing that settlement's own
      // defend->expand quest link (SETTLEMENT_GROWTH_QUEST_DEST, in
      // questSlice.ts's turnInSideQuest), a permanent yield bump paid off every collection.
      const amount = 6 + residentCount * 5 + (settlement.growthTier ?? 0) * 10;
      set({ settlements: { ...st.settlements, [destId]: { ...settlement, lastCollectedAt: now } }, dirty: true });
      st.addItems({ gold: amount }, 'grant');
      audio.play('treasure', 0.7);
      st.notify(`Collected ${amount} gold from the settlement!`, true);
    },

    // Wave 27 · Trade Caravan — see data/caravan.ts's own header for why
    // this is a wall-clock abstraction rather than a real AI-driven journey
    // between instances. Re-validated here, not just in DialoguePanel's own
    // disabled state, matching acceptSideQuest/foundSettlement's own "the
    // store, not just the panel, enforces it" discipline.
    dispatchCaravan: (from, to, item, amount, insured) => {
      const st = get();
      if (from === to) return;
      if (!st.settlements[from] || !st.settlements[to]) return;
      const key = caravanRouteKey(from, to);
      const route = CARAVAN_ROUTES[key];
      if (!route) return;
      if (st.caravans[key]) {
        st.notify('A caravan is already on that road.');
        return;
      }
      // capacity is real residents actually wearing a Hand Cart at the
      // ORIGIN — the same gear.carrier stat carryCapacityOf() already reads
      // for real AI haul trips (attributes.ts), reused here for a new
      // purpose rather than invented fresh.
      const carts = Math.min(
        CARAVAN_MAX_CARTS,
        st.villagers.filter((v) => (v.world ?? null) === from && v.gear?.carrier === 'cart').length,
      );
      if (carts <= 0) {
        st.notify('No one here is equipped with a Hand Cart.');
        return;
      }
      const cap = carts * CARAVAN_CAP_PER_CART;
      const held = st.inventory[item] ?? 0;
      const n = Math.min(amount, cap, held);
      if (n <= 0) return;
      const insuranceCost = insured
        ? Math.ceil(caravanQuoteGold(item, n, st.attrSpent.wit ?? 0, st.perks.includes('silver_tongue'), st.perks.includes('honest_weight')) * CARAVAN_INSURANCE_RATE)
        : 0;
      if (insured && (st.inventory.gold ?? 0) < insuranceCost) {
        st.notify(`Not enough gold to insure the run — ${insuranceCost} needed.`);
        return;
      }
      const inv = { ...st.inventory };
      inv[item] = held - n;
      if (insured) inv.gold = (inv.gold ?? 0) - insuranceCost;
      const run: CaravanRun = { from, to, item, amount: n, insured, departedAt: Date.now(), etaMs: route.etaMs };
      set({ inventory: inv, caravans: { ...st.caravans, [key]: run }, dirty: true });
      audio.play('canter', 0.7);
      const etaMin = Math.round(route.etaMs / 60000);
      st.notify(`Caravan dispatched with ${n}× ${ITEMS[item]?.name ?? item} — back in about ${etaMin}m.`, true);
    },

    collectCaravan: (from, to) => {
      const st = get();
      const key = caravanRouteKey(from, to);
      const run = st.caravans[key];
      if (!run) return;
      const now = Date.now();
      if (now - run.departedAt < run.etaMs) {
        const remainMin = Math.ceil((run.etaMs - (now - run.departedAt)) / 60000);
        st.notify(`Nothing to collect yet — check back in ${remainMin}m.`);
        return;
      }
      // an uninsured run rolls the route's own risk — a bad roll is always a
      // PARTIAL loss (mirrors HAUL_TO_DEPOSIT's "the cap must never destroy
      // the difference" philosophy), never a total wipe, and only ever
      // blocks the quest tick, never the gold itself.
      let amount = run.amount;
      let damaged = false;
      // Wave 47 (B5) · the route's own flat riskPct is no longer the whole
      // story — the more contested the player's own standing, the more the
      // OTHER house has reason to watch this road (effectiveCaravanRisk,
      // data/caravan.ts). Genuinely neutral standing leaves it untouched.
      const risk = effectiveCaravanRisk(CARAVAN_ROUTES[key]?.riskPct ?? 0, st.allegiance);
      if (!run.insured && Math.random() < risk) {
        amount = Math.max(1, Math.round(amount * CARAVAN_LOSS_SURVIVE_FRACTION));
        damaged = true;
      }
      const payout = caravanQuoteGold(run.item, amount, st.attrSpent.wit ?? 0, st.perks.includes('silver_tongue'), st.perks.includes('honest_weight'));
      const caravans = { ...st.caravans };
      delete caravans[key];
      set({ caravans, dirty: true });
      st.addItems({ gold: payout }, 'grant');
      audio.play('treasure', 0.8);
      const itemName = ITEMS[run.item]?.name ?? run.item;
      st.notify(
        damaged
          ? `Bandits hit the road — the caravan limps in with only ${amount}× ${itemName}: ${payout} gold.`
          : `Caravan arrived — ${payout} gold for ${amount}× ${itemName}.`,
        true,
      );
      // a real caravan collection is the unit that counts, not the dispatch
      // (mirrors rollTripBonus's "a trip = one completed deposit" reasoning)
      // — and only an undamaged delivery advances the quest, since a bandit
      // hit is not the clean run the errand is asking for.
      if (!damaged) bumpSideQuest('caravan', 'any', 1);
    },

    // Wave 47 (B5) · the only place `st.settlements[destId]` mutates for a
    // rival raid (SettlementRaidRunner.tsx ticks the fight itself, this
    // settles the outcome once it's over). A WIN pays a gold/xp bonus scaled
    // by how much of the plot's HP survived and bumps that settlement's own
    // `kind:'defend'` errand (B7's "Hold the Line" quests). A LOSS never
    // destroys anything real — `lastCollectedAt` is pushed forward by
    // SETTLEMENT_RAID_YIELD_PENALTY_MS, a delayed (never voided) yield
    // collection, exactly the "real, reversible consequence" this wave's
    // design pass settled on over permanent settlement loss.
    resolveSettlementRaid: (destId, won, hpFrac = 0) => {
      const st = get();
      const settlement = st.settlements[destId];
      if (!settlement) return;
      const now = Date.now();
      const destName = WORLD_DESTINATION_BY_ID[destId]?.name ?? 'the settlement';
      if (won) {
        const bonus = Math.round(30 * hpFrac);
        const xp = Math.round(50 * hpFrac);
        set({ settlements: { ...st.settlements, [destId]: { ...settlement, lastRaidAt: now } }, dirty: true });
        if (bonus > 0) st.addItems({ gold: bonus }, 'grant');
        if (xp > 0) st.addXp('combat', xp);
        audio.play('treasure', 0.8);
        st.notify(`The raid is repelled — ${destName} holds! +${bonus} gold.`, true);
        bumpSideQuest('defend', destId, 1);
      } else {
        set({
          settlements: {
            ...st.settlements,
            [destId]: { ...settlement, lastRaidAt: now, lastCollectedAt: settlement.lastCollectedAt + SETTLEMENT_RAID_YIELD_PENALTY_MS },
          },
          dirty: true,
        });
      }
    },
  };
};
