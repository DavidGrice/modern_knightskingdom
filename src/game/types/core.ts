// Shared game types: screen/skill/item vocabulary, character creation, and
// the quest/recipe shapes built from it. Split out of the former monolithic
// game/types.ts (CLN-08) — this file holds the leaf vocabulary every other
// types/*.ts file (and most of the rest of the codebase) builds on; nothing
// in here imports from a sibling types/*.ts file, by design.

export type ScreenName = 'auth' | 'menu' | 'options' | 'credits' | 'create' | 'game' | 'stats' | 'help';

export type SkillId = 'woodcutting' | 'mining' | 'smithing' | 'fishing' | 'building' | 'combat' | 'farming';

/** Wave 39 (A4) · a manual pressure multiplier picked once at run creation
 *  (CharacterCreator.tsx), layered on top of difficulty.ts's own tier curve
 *  — see game/difficulty.ts's DIFFICULTIES table for the actual numbers.
 *  A plain string union (not an object) because every other per-run pick in
 *  this file — SkillId, ItemId — is one too, and this is a leaf type with no
 *  runtime dependents. */
export type DifficultyId = 'normal' | 'hard' | 'grueling';

export type ItemId =
  | 'wood' | 'plank' | 'stone' | 'iron_ore' | 'iron_bar'
  | 'fish' | 'cooked_fish' | 'flowers'
  | 'axe' | 'pickaxe' | 'fishing_rod' | 'hammer'
  | 'sword' | 'shield' | 'crossbow' | 'bolt' | 'gold'
  | 'wheat' | 'bread' | 'longbow' | 'arrow'
  | 'helmet' | 'chestplate'
  // Wave 9 · the two chestplate tiers above the plain iron one. Deliberately
  // separate ItemIds rather than a `tier` field on `chestplate`: a crafted
  // plate lives in the Satchel/Armory as a COUNT, and the recipes below re-
  // forge the tier under them (a Forged plate costs an Iron one), which only
  // works if each tier is its own countable thing. `ChestplateTier` names the
  // same three in the vocabulary a worn slot uses — joined in data/armor.ts.
  | 'chestplate_forged' | 'chestplate_crested'
  // Wave 7 · the two polearms. Both were render-only before: the halberd was
  // an NPC-exclusive mold that only ever entered play as Armory stock
  // (Sealed Crypt salvage) for a defender's loadout, and the spear had no
  // ItemId at all — it existed solely as a WeaponId for the couched-lance
  // joust pose. Both are forge recipes now (data/recipes.ts) and real player
  // melee weapons (combat.ts's MELEE). The Armory stays a separate pool from
  // the Satchel, so a defender's halberd and the player's own never mix.
  | 'halberd' | 'spear'
  | 'herb' | 'potion_heal' | 'potion_stamina' | 'potion_nightvision'
  // Wave 9 · cooking past bread-and-fish. All three are campfire dishes made
  // from ingredients the world ALREADY yields (data/recipes.ts) — no new
  // gatherable, no new node kind — and all three are `EDIBLES` (data/items.ts)
  // on the same vigour ladder the first two dishes set.
  | 'pottage' | 'fish_stew' | 'blossom_tart'
  // Wave 9 · dyes. One per unlockable palette row (data/dyes.ts): brewed at
  // the campfire like the draughts beside them, then spent ONCE to open that
  // row of colours for the rest of the save. They are not worn and not
  // consumed per recolour — see `SaveGame.dyes`.
  | 'dye_woad' | 'dye_madder' | 'dye_tyrian' | 'dye_bark'
  // Wave 5: filled at the brook, poured on a cultivated plot. Not crafted —
  // the water IS the acquisition (see PlayerController's 'draw_water').
  | 'water_bucket'
  // Wave 9 · the two carrier tiers, finally acquirable. Deliberately spelled
  // the SAME as `CarrierTier`'s own two members so the item and the worn tier
  // are one vocabulary (see CARRIER_ITEM in data/villagers.ts) — a third tier
  // would be added in both places or in neither, never half.
  | 'basket' | 'cart'
  // Wave 49 (C1) · the sword and halberd tiers above the plain base item,
  // the same "each tier RE-FORGES the one below" shape the chestplate chain
  // pioneered (data/recipes.ts's own header comment on that chain explains
  // why: a countable ItemId per tier is what lets the Forge consume tier N
  // to make tier N+1). Spear is deliberately NOT tiered this wave — see
  // combat.ts's own MELEE_TIERS header comment for why scoping it out keeps
  // the type-vs-type tradeoff table honest under time pressure.
  | 'sword_forged' | 'sword_crested' | 'halberd_forged' | 'halberd_crested'
  // Wave 50 (C2) · a 4th, drop-only rung above 'crested' — no recipe, ever
  // (see data/recipes.ts's own header note by the tier chain above): these
  // are rolled by bossEncounter.ts's BOSS_LEGENDARY_DROP off the three real
  // Satchel-bound boss-victory moments (both dragon routs, Cedric's one-shot
  // capstone), never crafted. Still just another rung on combat.ts's own
  // MELEE_TIER_ITEMS ladder, so nothing about how a tiered ItemId is worn/
  // read/displayed had to change to add it.
  | 'sword_legendary' | 'halberd_legendary'
  // Wave 50 (C4) · a one-way, permanent enchantment marker per weapon line —
  // a plain flat ItemId sitting in inventory forever (dyes.ts's "spend once,
  // opens a row for the rest of the save" shape, adapted: see combat.ts's own
  // ENCHANT_ITEM comment for why a marker ItemId rather than a dyes-style
  // `SaveGame` string array). Read by `meleeStatsFor` as a flat +10% post-
  // multiply on top of whichever tier (base..legendary) is currently worn.
  | 'sword_rune' | 'halberd_rune';

export interface CharacterConfig {
  name: string;
  headDonor: string;   // minifig model whose head (face) is used
  bodyDonor: string;   // minifig model whose torso decal is used
  armColor: number;    // indices into the global runtime palette
  handColor: number;
  legColor: number;
  hipColor: number;
  /** calling picked at creation (data/classes.ts); absent on older saves */
  classId?: string;
}

export interface QuestObjective {
  id: string;
  label: string;
  /** kind decides which store counter drives it — 'visit' (travelTo a
   *  destination id) and 'talk' (openDialogue with an npc id) are the
   *  Phase 20 travel beats that walk the main quest across the realm */
  kind: 'gather' | 'craft' | 'build' | 'rank' | 'visit' | 'talk';
  target: string; // itemId, recipeId, buildableId, rank name, destination id or npc id
  count: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewardText: string;
  xp?: Partial<Record<SkillId, number>>;
  unlocks?: string[]; // feature flags granted on completion
  grantItems?: Partial<Record<ItemId, number>>;
}

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  output: ItemId;
  outputCount: number;
  cost: Partial<Record<ItemId, number>>;
  station: 'hand' | 'workbench' | 'forge' | 'campfire';
  skill?: SkillId;
  skillXp?: number;
  requiresUnlock?: string;
}
