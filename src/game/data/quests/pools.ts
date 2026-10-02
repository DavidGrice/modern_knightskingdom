// CLN-21 · the errand pools that belong to no NpcDef (Cedric's war council, the guild halls), moved verbatim
// out of data/npcs.ts.
import type { SideQuestDef } from '../cast/types';

// Cedric's war council (Phase 20 4b): rebellion errands offered only to his
// sworn bannermen at the camp beneath The Rival Castle (see ParleyPanel's
// war-council branch). He isn't an NpcDef — his camp/boss-fight life cycle
// is its own system — so his errands live here and every side-quest lookup
// goes through sideQuestsOf() instead of NPC_BY_ID directly.
export const CEDRIC_WAR_QUESTS: SideQuestDef[] = [
  {
    // Wave 34 (G6.8) · same bug as k_iron_levy (cast/court.ts) — iron_bar is a
    // craft-only recipe output, never raw-harvested, so a `gather`-kind
    // objective against it could never complete.
    id: 'ced_iron', kind: 'craft', target: 'iron_bar', need: 2,
    label: 'Smuggle 2 iron bars to the rebellion’s forges',
    xpSkill: 'smithing', xp: 45, rewardItems: { gold: 24 },
  },
  {
    id: 'ced_royals', kind: 'kill', target: 'royal', need: 3,
    label: 'Cull 3 of the King’s hounds when they raid your homestead',
    xpSkill: 'combat', xp: 130, rewardItems: { gold: 30 },
  },
  {
    id: 'ced_stone', kind: 'gather', target: 'stone', need: 8,
    label: 'Quarry 8 stone for the siege works',
    xpSkill: 'mining', xp: 40, rewardItems: { iron_ore: 3, gold: 20 },
  },
];

// Wave 22: each guild's own repeatable errand pool, offered only to members
// (the membership check lives in gameStore's acceptSideQuest — see its own
// comment). A guild id is not an NpcDef, so this mirrors CEDRIC_WAR_QUESTS'
// shape (a separate pool keyed to a non-NpcDef id) rather than
// EXTRA_SIDE_QUESTS' shape (merged into an existing NPC's own pool) — there
// is no NpcDef to merge into. Chains use `requires` exactly like every other
// pool; every errand targeting a crafted good (plank/iron_bar/cooked_fish)
// deliberately uses `kind: 'craft'` with `target` = the recipe id, NEVER
// `kind: 'gather'` — bumpSideQuest's matchesKind (gameStore.ts) never
// cross-matches craft<->gather, so a gather-kind errand aimed at a craft-only
// item can never have its counter incremented. Wave 34 (G6.8) fixed the five
// real instances this had already shipped with: bd_timber/q_relief
// (allegianceQuests.ts, target plank/bread), k_iron_levy/k_feast (the
// king's own sideQuests, cast/court.ts), and ced_iron (CEDRIC_WAR_QUESTS,
// just above this comment, target iron_bar). This comment used to say
// "q_feast", which was never a real id — the actual one is k_feast.
export const GUILD_QUESTS: Record<string, SideQuestDef[]> = {
  woodsmen: [
    {
      id: 'wm_haul', kind: 'gather', target: 'wood', need: 10,
      label: 'Haul 10 logs down from the high stands',
      xpSkill: 'woodcutting', xp: 35, rewardItems: { plank: 3, gold: 14 },
    },
    {
      id: 'wm_planks', kind: 'craft', target: 'plank', need: 6,
      label: 'Mill 6 planks for the Lodge stores',
      xpSkill: 'woodcutting', xp: 45, rewardItems: { flowers: 2, gold: 20 },
      requires: ['wm_haul'],
    },
    {
      id: 'wm_thin', kind: 'kill', target: 'any', need: 3,
      label: 'Thin what has been stalking the tree line — 3 kills',
      xpSkill: 'combat', xp: 55, rewardItems: { gold: 30 },
      requires: ['wm_planks'],
    },
    // Wave 55 (F2) · "The Long Cut" — a 5-quest narrative arc past the
    // Lodge's original 3, chained off wm_thin exactly like those 3 chain off
    // each other. See GUILD_ARC_REP below for why these (and no other guild
    // quest) grant more than the flat +15 rep every other guild errand does.
    {
      id: 'wm_scout', kind: 'gather', target: 'wood', need: 18,
      label: 'A blight creeps down from the high stands — log 18 before it spreads further',
      xpSkill: 'woodcutting', xp: 70, rewardItems: { gold: 28 },
      requires: ['wm_thin'],
    },
    {
      id: 'wm_firebreak', kind: 'build', target: 'fence', need: 6,
      label: 'Cut a firebreak round the sick grove — 6 sections',
      xpSkill: 'building', xp: 80, rewardItems: { plank: 4, gold: 34 },
      requires: ['wm_scout'],
    },
    {
      id: 'wm_cull', kind: 'kill', target: 'any', need: 5,
      label: "Whatever's rotting the grove draws worse — put down 5",
      xpSkill: 'combat', xp: 95, rewardItems: { gold: 42 },
      requires: ['wm_firebreak'],
    },
    {
      id: 'wm_rebuild', kind: 'craft', target: 'plank', need: 14,
      label: 'Mill 14 planks to rebuild what the blight took',
      xpSkill: 'woodcutting', xp: 110, rewardItems: { gold: 50 },
      requires: ['wm_cull'],
    },
    {
      id: 'wm_warden', kind: 'build', target: 'tower', need: 1,
      label: "Raise a lookout over the healed grove — stand as the Lodge's own Warden of the Timberline",
      xpSkill: 'building', xp: 150, rewardItems: { gold: 80, spear: 1 },
      requires: ['wm_rebuild'],
    },
  ],
  miners: [
    {
      id: 'mn_haul', kind: 'gather', target: 'stone', need: 10,
      label: 'Haul 10 stone up from the deep cuts',
      xpSkill: 'mining', xp: 35, rewardItems: { iron_ore: 2, gold: 14 },
    },
    {
      id: 'mn_ore', kind: 'gather', target: 'iron_ore', need: 6,
      label: 'Bring up 6 iron ore for the Brotherhood',
      xpSkill: 'mining', xp: 50, rewardItems: { stone: 3, gold: 22 },
      requires: ['mn_haul'],
    },
    {
      id: 'mn_bars', kind: 'craft', target: 'iron_bar', need: 3,
      label: 'Smelt 3 bars at the forge for the Brotherhood',
      xpSkill: 'smithing', xp: 60, rewardItems: { gold: 34 },
      requires: ['mn_ore'],
    },
    // Wave 55 (F2) · "Down the Old Shaft" — see wm_scout's comment above.
    {
      id: 'mn_seal', kind: 'gather', target: 'stone', need: 18,
      label: 'Shore the old sealed shaft before you break it open',
      xpSkill: 'mining', xp: 70, rewardItems: { gold: 28 },
      requires: ['mn_bars'],
    },
    {
      id: 'mn_break', kind: 'craft', target: 'iron_bar', need: 5,
      label: 'Forge the tools to break the seal — 5 bars',
      xpSkill: 'smithing', xp: 85, rewardItems: { iron_ore: 3, gold: 35 },
      requires: ['mn_seal'],
    },
    {
      id: 'mn_delve', kind: 'kill', target: 'any', need: 5,
      label: "Something's nested in the dark below — clear 5",
      xpSkill: 'combat', xp: 95, rewardItems: { gold: 42 },
      requires: ['mn_break'],
    },
    {
      id: 'mn_vein', kind: 'gather', target: 'iron_ore', need: 16,
      label: 'The old vein runs deeper than the Brotherhood ever dug',
      xpSkill: 'mining', xp: 115, rewardItems: { gold: 55 },
      requires: ['mn_delve'],
    },
    {
      id: 'mn_warden', kind: 'craft', target: 'iron_bar', need: 8,
      label: 'Smelt 8 bars from the old vein — claim Warden of the Old Ruins',
      xpSkill: 'smithing', xp: 150, rewardItems: { gold: 80, chestplate_forged: 1 },
      requires: ['mn_vein'],
    },
  ],
  anglers: [
    {
      id: 'an_catch', kind: 'gather', target: 'fish', need: 6,
      label: "Land 6 fish for the Circle's smokehouse",
      xpSkill: 'fishing', xp: 35, rewardItems: { gold: 14 },
    },
    {
      id: 'an_smoke', kind: 'craft', target: 'cooked_fish', need: 4,
      label: 'Smoke 4 fish over the Circle fire',
      xpSkill: 'fishing', xp: 45, rewardItems: { gold: 22 },
      requires: ['an_catch'],
    },
    {
      id: 'an_stew', kind: 'craft', target: 'fish_stew', need: 2,
      label: 'Simmer 2 pots of stew for the riverbank table',
      xpSkill: 'fishing', xp: 55, rewardItems: { gold: 32 },
      requires: ['an_smoke'],
    },
    // Wave 55 (F2) · "The Long Wait" — see wm_scout's comment above.
    {
      id: 'an_mentor', kind: 'gather', target: 'fish', need: 14,
      label: "Newer hands are showing up — land 14 to prove there's plenty to teach",
      xpSkill: 'fishing', xp: 70, rewardItems: { gold: 28 },
      requires: ['an_stew'],
    },
    {
      id: 'an_teach', kind: 'craft', target: 'cooked_fish', need: 8,
      label: "Smoke a proper batch for the Circle's newest hands",
      xpSkill: 'fishing', xp: 85, rewardItems: { gold: 35 },
      requires: ['an_mentor'],
    },
    {
      id: 'an_storm', kind: 'kill', target: 'any', need: 4,
      label: "Something's been spooking the shoals — drive off 4",
      xpSkill: 'combat', xp: 90, rewardItems: { gold: 40 },
      requires: ['an_teach'],
    },
    {
      id: 'an_bigcatch', kind: 'gather', target: 'fish', need: 20,
      label: 'The old-timers swear a legend swims this river — land 20 more first',
      xpSkill: 'fishing', xp: 110, rewardItems: { gold: 50 },
      requires: ['an_storm'],
    },
    {
      id: 'an_legend', kind: 'craft', target: 'fish_stew', need: 5,
      label: 'Simmer a stew worthy of the whole Circle — take your place as Master of the Circle',
      xpSkill: 'fishing', xp: 150, rewardItems: { gold: 80, potion_stamina: 1 },
      requires: ['an_bigcatch'],
    },
  ],
  builders: [
    {
      id: 'bg_haul', kind: 'gather', target: 'stone', need: 10,
      label: 'Haul 10 stone to the siege camp',
      xpSkill: 'mining', xp: 35, rewardItems: { plank: 3, gold: 14 },
    },
    {
      id: 'bg_fences', kind: 'build', target: 'fence', need: 4,
      label: 'Raise 4 fence sections around the camp',
      xpSkill: 'building', xp: 45, rewardItems: { stone: 3, gold: 22 },
      requires: ['bg_haul'],
    },
    {
      id: 'bg_tower', kind: 'build', target: 'tower', need: 1,
      label: 'Raise a watch tower for the Guild',
      xpSkill: 'building', xp: 90, rewardItems: { iron_bar: 2, gold: 50 },
      requires: ['bg_fences'],
    },
    // Wave 55 (F2) · "Raise the Works" — see wm_scout's comment above.
    {
      id: 'bg_survey', kind: 'gather', target: 'stone', need: 18,
      label: 'The siege works want more than one tower — survey and haul 18 stone',
      xpSkill: 'mining', xp: 70, rewardItems: { gold: 28 },
      requires: ['bg_tower'],
    },
    {
      id: 'bg_walls', kind: 'build', target: 'fence', need: 8,
      label: 'Wall off the new works — 8 more sections',
      xpSkill: 'building', xp: 85, rewardItems: { stone: 4, gold: 35 },
      requires: ['bg_survey'],
    },
    {
      id: 'bg_clear', kind: 'kill', target: 'any', need: 5,
      label: "Clear the site of what's moved in since the last siege",
      xpSkill: 'combat', xp: 90, rewardItems: { gold: 40 },
      requires: ['bg_walls'],
    },
    {
      id: 'bg_second_tower', kind: 'build', target: 'tower', need: 1,
      label: "Raise a second tower — the Guild's mark should stand twice over",
      xpSkill: 'building', xp: 120, rewardItems: { iron_bar: 2, gold: 55 },
      requires: ['bg_clear'],
    },
    {
      id: 'bg_joiner', kind: 'gather', target: 'stone', need: 30,
      label: "Finish the Guild's own keep-in-miniature — the final course, and the title Warden of the Siege Works",
      xpSkill: 'building', xp: 150, rewardItems: { gold: 80, halberd_forged: 1 },
      requires: ['bg_second_tower'],
    },
  ],
  knights: [
    {
      id: 'kn_patrol', kind: 'kill', target: 'any', need: 3,
      label: "Ride patrol — put down 3 of the Order's foes",
      xpSkill: 'combat', xp: 50, rewardItems: { gold: 20 },
    },
    {
      id: 'kn_bandits', kind: 'kill', target: 'bandit', need: 4,
      label: 'Clear 4 bandits off the tourney road',
      xpSkill: 'combat', xp: 80, rewardItems: { iron_bar: 1, gold: 32 },
      requires: ['kn_patrol'],
    },
    {
      id: 'kn_hard', kind: 'kill', target: 'skeleton', need: 5,
      label: 'Put 5 skeletons back in the ground',
      xpSkill: 'combat', xp: 110, rewardItems: { gold: 50 },
      requires: ['kn_bandits'],
    },
    // Wave 55 (F2) · "The Muster" — see wm_scout's comment above.
    // kn_drill/kn_champion reuse 'joust'/'duel', already proven decoupled
    // from a specific giver (Richard's joustRichard() and Storm's
    // resolveDuel() both call bumpErrand/bumpSideQuest against whatever
    // errand is active, same as r_lists/s_firstblood) — no new mechanic.
    {
      id: 'kn_muster', kind: 'kill', target: 'bandit', need: 5,
      label: 'The Order musters for real trouble — 5 more bandits',
      xpSkill: 'combat', xp: 90, rewardItems: { gold: 35 },
      requires: ['kn_hard'],
    },
    {
      id: 'kn_drill', kind: 'joust', target: 'any', need: 3,
      label: 'Command starts at the lists — land 3 more solid passes',
      xpSkill: 'combat', xp: 95, rewardItems: { gold: 38 },
      requires: ['kn_muster'],
    },
    {
      id: 'kn_hunt', kind: 'kill', target: 'skeleton', need: 6,
      label: 'The dead rise heavier this season — 6 more back down',
      xpSkill: 'combat', xp: 105, rewardItems: { gold: 45 },
      requires: ['kn_drill'],
    },
    {
      id: 'kn_command', kind: 'kill', target: 'any', need: 8,
      label: "Lead a real muster against whatever the King's roads throw at you",
      xpSkill: 'combat', xp: 125, rewardItems: { gold: 60 },
      requires: ['kn_hunt'],
    },
    {
      id: 'kn_champion', kind: 'duel', target: 'any', need: 2,
      label: "Answer the Order's own challenge in the ring — be named Champion of the Order",
      xpSkill: 'combat', xp: 150, rewardItems: { gold: 80, sword_crested: 1 },
      requires: ['kn_command'],
    },
  ],
};

/** Wave 55 (F2) · the only guild quests that grant more than the flat +15
 *  rep every one of the original 15 guild errands earns (turnInSideQuest,
 *  gameStore.ts). Sized so each guild's 5-quest arc — 20+24+26+32+38 = 140,
 *  plus the pre-existing 3×15 = 45 — totals 185, clearing rank 3's 160
 *  threshold with real margin: before this arc shipped, 45 was the maximum
 *  achievable guild rep in the whole game (turnInSideQuest is the ONLY
 *  rep-granting call site, each of the original 3 quests turns in once),
 *  meaning ranks 2 and 3 — and Wave 52/D4's max-rank vendor rows — were
 *  mathematically unreachable. Every original quest id is deliberately
 *  absent here so it keeps its exact live +15 via the `?? 15` fallback. */
export const GUILD_ARC_REP: Record<string, number> = {
  wm_scout: 20, wm_firebreak: 24, wm_cull: 26, wm_rebuild: 32, wm_warden: 38,
  mn_seal: 20, mn_break: 24, mn_delve: 26, mn_vein: 32, mn_warden: 38,
  an_mentor: 20, an_teach: 24, an_storm: 26, an_bigcatch: 32, an_legend: 38,
  bg_survey: 20, bg_walls: 24, bg_clear: 26, bg_second_tower: 32, bg_joiner: 38,
  kn_muster: 20, kn_drill: 24, kn_hunt: 26, kn_command: 32, kn_champion: 38,
};
