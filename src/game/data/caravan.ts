// Wave 27 · Trade Caravan — a repeatable, player-triggered, wall-clock
// arbitrage run between two OWNED settlements. Named `caravan.ts` (distinct
// from the existing `game/carts.ts`, which is the warcart/bladecart siege
// props — a battering ram and a blade cart, both `category: 'defense'` in
// buildables.ts, dragged around by hand via PlayerController's push_cart/
// hitch_cart — confirmed live to have nothing to do with trade, same
// conclusion deliveryQuests.ts's own header already reached independently).
//
// This DOES give Villager.gear.carrier (data/villagers.ts's CARRIERS) a new
// purpose: dispatching a caravan from a settlement requires at least one
// resident there actually wearing a Hand Cart. That stat is NOT the inert,
// unwired flavor item this wave's own research pass first assumed — a live
// check of Agent.ts/haul.ts found `carryCapacityOf()` (data/attributes.ts)
// really does add `carrierBonus(gear.carrier)` into `bb.carryCapacity`,
// which `haul.ts`/`gather.ts`/`farm.ts` all read for the real AI trip cap.
// Reusing 'cart' as the caravan's own capacity gate is therefore reusing a
// stat that already means something in this codebase, not inventing a new
// meaning for a dead one.
//
// Q2's reasoned call (this wave's design pass, re-verified live rather than
// assumed): no entity survives a `travelTo()` scene-swap — that action only
// sets `destination`/`visitedWorlds` and queues `pendingTeleport` (gameStore
// .ts), nothing else — and `Agent`/`TargetRegistry` are spawned per-world by
// rosterSync.ts, so there is no mechanism for a villager to exist mid-transit
// between two instances that are not even the same coordinate space (Wave 18's
// scene-isolation rearchitecture is real and current). `road.ts`'s route
// network also does not reach destinations at all — it only gets ordinary
// home villagers from the homestead to six home-map resource grounds: no real
// inter-destination geography exists to route over (worlds.ts's destination
// `origin.x/z` are non-overlapping render-space bake slots, not real relative
// positions). So this is built the same wall-clock way foundSettlement/
// collectSettlementYield already prove out — real epoch-ms timestamps, a
// deliberate player action, works whether or not you're standing there — not
// a physically-simulated journey neither the AI nor the instance model
// supports without a far larger, out-of-scope rearchitecture.
import type { ItemId } from '../types';
import { SELL_PRICES } from './trade';
import { contestedPressure } from './allegiance';

export const CARAVAN_CAP_PER_CART = 10;      // matches CARRIERS' own "cart" = +10/trip
export const CARAVAN_MAX_CARTS = 3;          // a settlement only ever has 3 residents
export const CARAVAN_MARKUP = 1.6;           // premium over the flat merchant SELL_PRICES rate
export const CARAVAN_INSURANCE_RATE = 0.2;   // escort fee, gold, guarantees zero loss
export const CARAVAN_LOSS_SURVIVE_FRACTION = 0.5; // an uninsured bad roll never wipes the load

// Wave 47 (B5) · a route's own riskPct used to be a flat, static number,
// deaf to the real allegiance scalar even though the whole route runs
// between two settlements a war between two houses is actively contesting.
// The more either house's cause you've thrown in with, the more the OTHER
// house's raiders have reason to watch your roads — genuinely neutral
// standing (contestedPressure === 0) leaves the base riskPct untouched.
export const CARAVAN_ALLEGIANCE_RISK_MAX = 0.15;
export function effectiveCaravanRisk(baseRiskPct: number, allegiance: number): number {
  return Math.min(0.9, baseRiskPct + contestedPressure(allegiance) * CARAVAN_ALLEGIANCE_RISK_MAX);
}

export interface CaravanRouteDef {
  etaMs: number;
  riskPct: number;
}

/** Keyed by a sorted "a|b" pair (`caravanRouteKey`) so a third settlement is
 *  a data-only addition later — only one entry populated in v1. Home is
 *  deliberately excluded: the player's `inventory` is already one flat,
 *  global field shared by every world (see `tickVillagers`), so a home<->
 *  settlement caravan would move goods that already cost nothing to have
 *  everywhere — mechanically inert, not a real decision. Settlement<->
 *  settlement is the one pair where "arbitrage between two distinct places"
 *  is actually meaningful, and home has no resident NPC to host the
 *  dispatch/collect UI besides. */
export const CARAVAN_ROUTES: Record<string, CaravanRouteDef> = {
  'template-07|template-08': { etaMs: 8 * 60_000, riskPct: 0.10 },
  // Wave 44: The Siege Camp (template-04) joins as a third settlement,
  // paired with EACH existing one — a data-only addition, per this file's
  // own header comment above. Same eta/risk as the original pair: these
  // `origin.x/z` values are non-overlapping bake slots (worlds.ts), not
  // real relative distances, so there's no real basis to differentiate.
  'template-04|template-07': { etaMs: 8 * 60_000, riskPct: 0.10 },
  'template-04|template-08': { etaMs: 8 * 60_000, riskPct: 0.10 },
};

export function caravanRouteKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

/** Every OTHER endpoint `world` has a caravan route with — zero, one, or
 *  (as of Wave 44's third settlement) two. Wave 44 correction: this used to
 *  return a single `string | null` (the first matching route key), which
 *  quietly worked while exactly one route existed but silently strands
 *  every route past the first once a hub world (template-04, routed to
 *  BOTH other settlements) exists — `Object.keys()` iteration order would
 *  pick one partner and DialoguePanel would never even try to render the
 *  other, the same "reads as done, isn't reachable" trap this wave's own
 *  research flagged for craft-vs-gather delivery quests. DialoguePanel now
 *  renders one caravan block per partner returned here instead of assuming
 *  a single partner. */
export function caravanPartnersOf(world: string): string[] {
  const partners: string[] = [];
  for (const key of Object.keys(CARAVAN_ROUTES)) {
    const [a, b] = key.split('|');
    if (a === world) partners.push(b);
    else if (b === world) partners.push(a);
  }
  return partners;
}

/** What's actually worth carting: the existing merchant ledger (SELL_PRICES)
 *  IS the "what's tradeable" list, intersected with what the player actually
 *  holds — not a second, hand-picked table that could drift from it. */
export function caravanTradeableItems(inventory: Partial<Record<ItemId, number>>): ItemId[] {
  return (Object.keys(SELL_PRICES) as ItemId[]).filter((id) => (inventory[id] ?? 0) > 0);
}

/** The exact same Wit/Silver-Tongue haggle formula `sellItem()` already uses
 *  (gameStore.ts: `1 + wit*0.04 + (silverTongue ? 0.15 : 0)`), run through
 *  the caravan's own markup instead of the flat merchant rate — no new
 *  pricing table invented, one rounding at the end same as sellItem(). */
export function caravanQuoteGold(item: ItemId, qty: number, wit: number, silverTongue: boolean): number {
  const price = SELL_PRICES[item] ?? 0;
  return Math.round(price * qty * CARAVAN_MARKUP * (1 + wit * 0.04 + (silverTongue ? 0.15 : 0)));
}
