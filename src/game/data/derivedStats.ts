// CLN-23 · the stats more than one place worked out for itself from the player's perks, talents and calling — now worked
// out once, from data/effects.ts's numbers. Each multiplies its terms in the order the store did, so that every result
// comes out to the last bit as it did (derivedStats.test.ts).
import { CALLING_FX, PERK_FX, TALENT_FX } from './effects';
import { callingSignature } from './classes';

type Player = { perks: readonly string[]; skillTree: readonly string[]; character: { classId?: string } | null };

/** How long wheat takes to grow from `base` seconds (gameStore's GROW_TIME): Green Thumb, Rich Soil and the Farmhand's
 *  Green-Fingered each shorten it — the player's own plot and a farmer villager's alike (the farm's soil is the farm's
 *  soil, whoever sows it). */
export function cropGrowTime(base: number, p: Player): number {
  let t = p.perks.includes('green_thumb') ? base * PERK_FX.green_thumb.growTimeTimes : base;
  if (p.skillTree.includes('farming2')) t *= TALENT_FX.farming2.growTimeTimes;
  if (callingSignature(p.character?.classId, 'farming')) t *= CALLING_FX.farming.growTimeTimes;
  return t;
}

/** The wheat a harvest yields beyond its own: Heavy Sheaves' one, or Bountiful Harvest's two in its place — the player's
 *  harvest and a farmer villager's alike. */
export function harvestSheaves(p: Pick<Player, 'skillTree'>): number {
  return p.skillTree.includes('farming4') ? TALENT_FX.farming4.sheaves
    : p.skillTree.includes('farming3') ? TALENT_FX.farming3.sheaves : 0;
}

/** How much durability a tool or weapon loses to one use: 2, with Steady Hands', Iron Discipline's, Tempered Edges' and
 *  the Smith's Prentice's terms multiplied in (Wave 52 made it a chain, so that a trade-off that speeds wear stacks
 *  against one that slows it). */
export function wearPerUse(p: Player): number {
  let wear = 2;
  if (p.perks.includes('steady_hands')) wear *= PERK_FX.steady_hands.wearTimes;
  if (p.perks.includes('iron_discipline')) wear *= PERK_FX.iron_discipline.wearTimes;
  if (p.skillTree.includes('smithing2')) wear *= TALENT_FX.smithing2.wearTimes;
  if (callingSignature(p.character?.classId, 'smithing')) wear *= CALLING_FX.smithing.wearTimes;
  return wear;
}
