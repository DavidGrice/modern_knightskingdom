// E18 · Errands that actually take a side.
//
// Every quest in the game used to be implicitly "good": do the thing, take
// the reward, nothing about you changed. These pools add the other two
// directions and, more importantly, the SHAPE that makes a direction mean
// something —
//
//   * a `allegiance` delta, so finishing an errand moves where you stand;
//   * `requires`, so a chain has to be walked in order (you cannot smuggle
//     for the rebellion before you have met anyone in it);
//   * `needsAllegiance`, so the deepest work on either side is only offered
//     to someone who has already committed — and the lock NAMES its reason
//     rather than sitting greyed and silent.
//
// The neutral pool matters as much as the other two. Alric and Beda ask for
// honest village work that neither house has an opinion about, which is what
// keeps "unsworn" a playable stance instead of a gap you pass through.
import type { SideQuestDef } from './npcs';

/** merged into each giver's own pool by `sideQuestsOf` */
export const EXTRA_SIDE_QUESTS: Record<string, SideQuestDef[]> = {

  // ---- NEUTRAL · the village. No house cares; the village does. ----------
  farmer_alric: [
    {
      id: 'al_fence', kind: 'build', target: 'fence', need: 4,
      label: 'Fence the top field — 4 sections',
      xpSkill: 'building', xp: 30, rewardItems: { wheat: 4, gold: 8 },
    },
    {
      id: 'al_scarecrow', kind: 'gather', target: 'wheat', need: 6,
      label: 'Bring in 6 sheaves before the weather turns',
      xpSkill: 'farming', xp: 35, rewardItems: { bread: 2, gold: 12 },
      requires: ['al_fence'],
    },
    {
      id: 'al_wolves', kind: 'kill', target: 'any', need: 4,
      label: 'Something is taking the lambs — drive off 4 of them',
      xpSkill: 'combat', xp: 55, rewardItems: { gold: 26, bread: 2 },
      requires: ['al_scarecrow'],
    },
  ],
  miller_beda: [
    {
      id: 'bd_timber', kind: 'gather', target: 'plank', need: 5,
      label: 'The mill wants 5 planks for a new sluice',
      xpSkill: 'building', xp: 28, rewardItems: { gold: 10, bread: 1 },
    },
    {
      id: 'bd_stone', kind: 'gather', target: 'stone', need: 8,
      label: 'Re-dress the millstone — 8 good stones',
      xpSkill: 'mining', xp: 40, rewardItems: { gold: 18 },
      requires: ['bd_timber'],
    },
    {
      id: 'bd_road', kind: 'build', target: 'torch', need: 3,
      label: 'Light the mill road — 3 torches along the way',
      xpSkill: 'building', xp: 34, rewardItems: { gold: 22, plank: 3 },
      requires: ['bd_stone'],
    },
  ],

  // ---- CROWN · Leo's side. Positive standing, deepening with rank. ------
  king: [
    {
      id: 'k_muster', kind: 'craft', target: 'sword', need: 1,
      label: 'Arm a levy — forge a sword for the crown’s muster',
      xpSkill: 'smithing', xp: 50, rewardItems: { gold: 30 },
      allegiance: 6,
    },
    {
      id: 'k_patrol', kind: 'kill', target: 'bandit', need: 4,
      label: 'The king’s roads are not safe — clear 4 bandits from them',
      xpSkill: 'combat', xp: 70, rewardItems: { gold: 40, iron_bar: 1 },
      allegiance: 10,
      requires: ['k_muster'],
    },
    {
      id: 'k_oath', kind: 'build', target: 'tower', need: 1,
      label: 'Raise a watchtower and hold this stretch of the realm for Leo',
      xpSkill: 'building', xp: 110, rewardItems: { gold: 80, chestplate: 1 },
      allegiance: 16,
      requires: ['k_patrol'],
      needsAllegiance: 25,
    },
  ],
  queen: [
    {
      id: 'q_relief', kind: 'gather', target: 'bread', need: 5,
      label: 'The winter stores are short — 5 loaves for the almshouse',
      xpSkill: 'farming', xp: 40, rewardItems: { gold: 24 },
      allegiance: 5,
    },
    {
      id: 'q_ledger', kind: 'gather', target: 'gold', need: 60,
      label: 'Fund the relief properly — 60 gold to the crown’s purse',
      xpSkill: 'building', xp: 60, rewardItems: { helmet: 1 },
      allegiance: 9,
      requires: ['q_relief'],
    },
  ],
  richard: [
    {
      id: 'r_drill', kind: 'kill', target: 'skeleton', need: 6,
      label: 'The dead walk the old field — put 6 of them back down',
      xpSkill: 'combat', xp: 60, rewardItems: { gold: 28, bolt: 8 },
      allegiance: 7,
    },
  ],

  // ---- THE BULL · Cedric's side. Negative standing, and it costs you. ---
  cedric: [
    {
      id: 'ced_road', kind: 'kill', target: 'royal', need: 3,
      label: 'The crown’s knights ride this wood — see that 3 do not ride home',
      xpSkill: 'combat', xp: 90, rewardItems: { gold: 55, iron_bar: 2 },
      allegiance: -14,
      requires: ['ced_iron'],
    },
    {
      id: 'ced_forge', kind: 'craft', target: 'crossbow', need: 1,
      label: 'The rebellion wants crossbows — build one and hand it over',
      xpSkill: 'smithing', xp: 75, rewardItems: { gold: 45, bolt: 12 },
      allegiance: -10,
      requires: ['ced_iron'],
    },
    {
      id: 'ced_banner', kind: 'build', target: 'banner', need: 2,
      label: 'Fly the Bull’s colours where the crown will see them — 2 banners',
      xpSkill: 'building', xp: 120, rewardItems: { gold: 90, halberd: 1 },
      allegiance: -20,
      requires: ['ced_road', 'ced_forge'],
      needsAllegiance: -25,
    },
  ],
};

/** Every errand id that exists anywhere, for validating `requires` chains. */
export function allExtraQuestIds(): Set<string> {
  const ids = new Set<string>();
  for (const list of Object.values(EXTRA_SIDE_QUESTS)) for (const q of list) ids.add(q.id);
  return ids;
}

/** Allegiance deltas for errands that already existed before this system.
 *  Kept here rather than edited into npcs.ts so the whole "which way does
 *  this pull me?" picture is readable in one place. */
export const EXISTING_QUEST_ALLEGIANCE: Record<string, number> = {
  // The crown's household work. Small numbers on purpose: fetching bread for
  // the royal table is a chore, not an oath, and a player should not be able
  // to become a Paladin by running errands they never thought about.
  k_iron_levy: 4,
  k_feast: 3,
  q_flowers: 3,
  q_decor: 2,
  q_barrels: 2,
  // Richard trains the crown's knights; clearing the roads serves it
  r_slay2: 3,
  r_slay4: 5,
  r_lists: 4,
  // Storm's duels are a courtesy of the court
  s_firstblood: 4,
  // John of Mayne keeps the river landing — his work is the realm's upkeep
  // rather than the crown's politics, so it stays genuinely neutral and is
  // deliberately absent from this table.

  // Cedric's existing three. The smuggling run is the doorway to his whole
  // chain; killing the crown's own knights costs the most, because it should.
  ced_iron: -8,
  ced_royals: -12,
  ced_stone: -6,
};
