// CLN-23 · what each perk, talent, calling and attribute point does, as numbers, in one place. Each used to be written
// in where it acts — `st.perks.includes('berserker') ? 1.3 : 1` in combat, `growTime *= 0.88` twice in the store — while
// what the player reads is the prose in data/perks.ts, data/skillTree.ts and data/classes.ts, which nothing held to them:
// Berserker's said "+30% sword damage" of a bonus every melee weapon has, and Ore Eye's "ore 15% more often" of fifteen
// points more chance. The places that act read these tables now, and effects.test.ts holds each perk's and talent's
// description to its numbers. Names: `…Times` multiplies, `…Plus` adds, `…Chance` is a probability.
// The haggle's terms live in data/pricing.ts, the one place that prices a trade; they are named here too.
import { HAGGLE_PER_WIT, HONEST_WEIGHT_HAGGLE, SILVER_TONGUE_HAGGLE, WANDERER_HAGGLE } from './pricing';

/** The twelve perks (data/perks.ts), by id. */
export const PERK_FX = {
  iron_grip: { staminaPlus: 15 },
  green_thumb: { growTimeTimes: 0.85 },
  steady_hands: { wearTimes: 0.7 },
  quick_study: { xpTimes: 1.1 },
  ironclad: { damageReductionPlus: 0.05 },
  honest_weight: { hagglePlus: HONEST_WEIGHT_HAGGLE },
  foragers_fortune: { extraYieldChance: 0.1 },
  // trade-offs
  berserker: { meleeTimes: 1.3, staminaTimes: 0.8 },
  hermit: { gatherTimes: 2, villagerTripTimes: 1.25 },
  silver_tongue: { hagglePlus: SILVER_TONGUE_HAGGLE, stormCooldownCut: 0.15 },
  iron_discipline: { staminaPlus: 20, wearTimes: 1.25 },
  quick_draw: { rangedTimes: 1.2, staminaTimes: 0.85 },
} as const;

/** The talents (data/skillTree.ts) that do something by a number, by id: every tier-1 talent's XP in its own skill, and
 *  the tiers beyond. A tier that replaces the one below names the whole of its effect (Bountiful Harvest's 2 sheaves,
 *  not 1 more). */
export const TALENT_FX = {
  /** each skill's first talent (`<skill>1`): this much more XP in that skill */
  firstTierXpTimes: 1.1,
  woodcutting2: { extraLogChance: 0.15 },
  woodcutting3: { flowerChance: 0.36 },
  woodcutting4: { flowerChance: 1 },
  mining2: { oreChancePlus: 0.15 },
  mining3: { veinStoneChance: 0.6 },
  mining4: { veinStoneChance: 1 },
  smithing2: { wearTimes: 0.8 },
  smithing3: { repairShare: 0.15 },
  smithing4: { repairShare: 0.05 },
  fishing2: { biteWindowPlusMs: 300 },
  fishing3: { twoFishChance: 0.15 },
  fishing4: { twoFishChance: 0.3 },
  building2: { swingPlus: 0.15 },
  building3: { swingPlus: 0.15 },
  building4: { swingPlus: 0.2 },
  combat2: { staminaPlus: 10 },
  combat3: { meleePlus: 1 },
  combat4: { meleePlus: 1 },
  farming2: { growTimeTimes: 0.88 },
  farming3: { sheaves: 1 },
  farming4: { sheaves: 2 },
} as const;

/** What a talent-less, perk-less player gets, where a talent above replaces it rather than adds to it. */
export const BASE_FX = {
  flowerChance: 0.18,
  veinStoneChance: 0.3,
  repairShare: 0.3,
} as const;

/** The callings' small passives (data/classes.ts; Wave 32), by the skill each is the signature of — their descriptions
 *  say "a little", and these are how much. */
export const CALLING_FX = {
  /** XP in the calling's own signature skill */
  signatureXpTimes: 1.1,
  woodcutting: { extraLogChance: 0.05 },
  mining: { oreChancePlus: 0.05 },
  fishing: { biteWindowPlusMs: 100 },
  farming: { growTimeTimes: 0.96 },
  building: { swingPlus: 0.05 },
  smithing: { wearTimes: 0.92 },
  combat: { swingStaminaCut: 1 },
  /** the Wanderer, who has no signature skill: a small haggle */
  wanderer: { hagglePlus: WANDERER_HAGGLE },
} as const;

/** Each point the player spends on an attribute (data/playerAttributes.ts). */
export const ATTR_FX = {
  wit: { hagglePlus: HAGGLE_PER_WIT },
  /** one more melee damage for every two points */
  might: { meleePlusPerTwo: 1 },
  courage: { staminaPlus: 5 },
  /** a chance at an extra log, and at bonus stone from an iron vein */
  diligence: { yieldChance: 0.04 },
  /** a chance that crafting turns out a double batch */
  craft: { doubleBatchChance: 0.04 },
} as const;
