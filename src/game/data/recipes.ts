import type { Recipe } from '../types';

export const RECIPES: Recipe[] = [
  // ---- by hand ----
  {
    id: 'plank', name: 'Plank', icon: '🟫', output: 'plank', outputCount: 2,
    cost: { wood: 1 }, station: 'hand', skill: 'woodcutting', skillXp: 4,
  },
  // ---- workbench ----
  {
    id: 'pickaxe', name: 'Pickaxe', icon: '⚒️', output: 'pickaxe', outputCount: 1,
    cost: { plank: 3, wood: 2 }, station: 'workbench', skill: 'building', skillXp: 15,
  },
  {
    id: 'fishing_rod', name: 'Fishing Rod', icon: '🎣', output: 'fishing_rod', outputCount: 1,
    cost: { plank: 2, wood: 1 }, station: 'workbench', skill: 'building', skillXp: 12,
    requiresUnlock: 'fishing',
  },
  {
    id: 'hammer', name: 'Builder Hammer', icon: '🔨', output: 'hammer', outputCount: 1,
    cost: { plank: 2, stone: 1 }, station: 'workbench', skill: 'building', skillXp: 12,
    requiresUnlock: 'mining',
  },
  {
    id: 'crossbow', name: 'Crossbow', icon: '🏹', output: 'crossbow', outputCount: 1,
    cost: { plank: 3, iron_bar: 1 }, station: 'workbench', skill: 'building', skillXp: 30,
    requiresUnlock: 'smithing',
  },
  {
    id: 'bolt', name: 'Bolts', icon: '➶', output: 'bolt', outputCount: 4,
    cost: { wood: 1, stone: 1 }, station: 'workbench', skill: 'building', skillXp: 6,
    requiresUnlock: 'smithing',
  },
  // Wave 9 · the two carriers. Both are woodwork, so both sit at the
  // Workbench rather than the Forge — the Cart is here too even though it
  // needs iron bands, exactly like the Crossbow/Longbow above (workbench
  // station, 'building' skill, gated on the `smithing` flag because you must
  // be able to make the ironwork before you can hang it on a frame). Priced
  // against the capacity they buy (attributes.ts's CARRIER_BONUS, +4 vs +10):
  // a basket is an afternoon's weaving, a cart is a real commitment of plank
  // and bar and reads as the tier above.
  {
    id: 'basket', name: 'Woven Basket', icon: '🧺', output: 'basket', outputCount: 1,
    cost: { plank: 3, wood: 2 }, station: 'workbench', skill: 'building', skillXp: 16,
  },
  {
    id: 'cart', name: 'Hand Cart', icon: '🛒', output: 'cart', outputCount: 1,
    cost: { plank: 6, wood: 4, iron_bar: 2 }, station: 'workbench', skill: 'building', skillXp: 42,
    requiresUnlock: 'smithing',
  },
  {
    id: 'longbow', name: 'Longbow', icon: '🏹', output: 'longbow', outputCount: 1,
    cost: { plank: 4, wood: 2 }, station: 'workbench', skill: 'building', skillXp: 32,
    requiresUnlock: 'smithing',
  },
  {
    id: 'arrow', name: 'Arrows', icon: '➶', output: 'arrow', outputCount: 4,
    cost: { wood: 2 }, station: 'workbench', skill: 'building', skillXp: 6,
    requiresUnlock: 'smithing',
  },
  // ---- forge ----
  {
    // NOTE: unlocked by Mining, not Smithing — the Forge Ahead quest asks you
    // to smelt bars BEFORE it rewards the 'smithing' flag (weapon recipes).
    id: 'iron_bar', name: 'Smelt Iron Bar', icon: '🔩', output: 'iron_bar', outputCount: 1,
    cost: { iron_ore: 2, wood: 1 }, station: 'forge', skill: 'smithing', skillXp: 18,
    requiresUnlock: 'mining',
  },
  {
    id: 'sword', name: 'Knight Sword', icon: '⚔️', output: 'sword', outputCount: 1,
    cost: { iron_bar: 3, plank: 1 }, station: 'forge', skill: 'smithing', skillXp: 40,
    requiresUnlock: 'smithing',
  },
  // Wave 7 · the two polearms, priced against the sword above (3 bar / 1
  // plank): a halberd is more head and more haft, a spear is mostly haft with
  // a point on it — so one costs more iron than the sword and the other less,
  // and both cost more timber. Same forge station and same 'smithing' gate as
  // every other weapon, so neither jumps the quest line.
  {
    id: 'halberd', name: 'Halberd', icon: '🔱', output: 'halberd', outputCount: 1,
    cost: { iron_bar: 4, plank: 3 }, station: 'forge', skill: 'smithing', skillXp: 55,
    requiresUnlock: 'smithing',
  },
  {
    id: 'spear', name: 'Spear', icon: '🗡️', output: 'spear', outputCount: 1,
    cost: { iron_bar: 2, plank: 3 }, station: 'forge', skill: 'smithing', skillXp: 35,
    requiresUnlock: 'smithing',
  },
  {
    id: 'shield', name: 'Kingdom Shield', icon: '🛡️', output: 'shield', outputCount: 1,
    cost: { iron_bar: 2, plank: 2 }, station: 'forge', skill: 'smithing', skillXp: 35,
    requiresUnlock: 'smithing',
  },
  {
    id: 'helmet', name: 'Iron Helm', icon: '🪖', output: 'helmet', outputCount: 1,
    cost: { iron_bar: 2, plank: 1 }, station: 'forge', skill: 'smithing', skillXp: 30,
    requiresUnlock: 'smithing',
  },
  {
    id: 'chestplate', name: 'Iron Chestplate', icon: '🦺', output: 'chestplate', outputCount: 1,
    cost: { iron_bar: 4, plank: 1 }, station: 'forge', skill: 'smithing', skillXp: 45,
    requiresUnlock: 'smithing',
  },
  // Wave 9 · the two plate tiers above it. Each RE-FORGES the tier below
  // rather than starting from bare bar: the ladder then reads as one plate you
  // keep improving (and the Armory can never end up holding a Castle-Crested
  // plate by someone who never made an iron one), which is also why the costs
  // look small next to what they're worth — 8 bar and 2 plank all-in for the
  // Forged, 14 and 4 for the Crested. Same forge station and `smithing` gate
  // as every other armor piece, so neither jumps the quest line.
  {
    id: 'chestplate_forged', name: 'Forged Plate', icon: '🔗', output: 'chestplate_forged', outputCount: 1,
    cost: { chestplate: 1, iron_bar: 4, plank: 1 }, station: 'forge', skill: 'smithing', skillXp: 70,
    requiresUnlock: 'smithing',
  },
  {
    id: 'chestplate_crested', name: 'Castle-Crested Plate', icon: '🏰', output: 'chestplate_crested', outputCount: 1,
    cost: { chestplate_forged: 1, iron_bar: 6, plank: 2 }, station: 'forge', skill: 'smithing', skillXp: 100,
    requiresUnlock: 'smithing',
  },
  // ---- campfire ----
  {
    id: 'cooked_fish', name: 'Cook Fish', icon: '🍖', output: 'cooked_fish', outputCount: 1,
    cost: { fish: 1 }, station: 'campfire', skill: 'fishing', skillXp: 8,
    requiresUnlock: 'fishing',
  },
  {
    id: 'bread', name: 'Bake Bread', icon: '🍞', output: 'bread', outputCount: 1,
    cost: { wheat: 2 }, station: 'campfire', skill: 'farming', skillXp: 10,
  },
  // Wave 9 · cooking depth. Three dishes above bread and cooked fish, built
  // ENTIRELY from ingredients the world already yields: wheat off a farm plot,
  // fish off the pond, herb and flowers off a node or a craft side-good
  // (attributes.ts's SIDE_GOODS). Deliberately no new gatherable — a new
  // resource-node kind would touch ResourceNodeState's own type union and the
  // gather/render path, which is a mechanic, not the content this asked for.
  //
  // Flowers in particular had never had a food use at all (only the two
  // draughts), and the tart is the answer: petals in a tart is exactly what a
  // medieval kitchen did with them. The stew takes RAW fish rather than
  // cooked, so it competes with Cook Fish for the same catch instead of
  // stacking on top of it. Ladder of restore values lives in items.ts EDIBLES.
  {
    id: 'pottage', name: 'Simmer Herb Pottage', icon: '🥣', output: 'pottage', outputCount: 1,
    cost: { herb: 2, wheat: 1 }, station: 'campfire', skill: 'farming', skillXp: 12,
  },
  {
    id: 'fish_stew', name: "Fisherman's Stew", icon: '🍲', output: 'fish_stew', outputCount: 1,
    cost: { fish: 2, herb: 1, wheat: 1 }, station: 'campfire', skill: 'fishing', skillXp: 22,
    requiresUnlock: 'fishing',
  },
  {
    id: 'blossom_tart', name: 'Bake Blossom Tart', icon: '🥧', output: 'blossom_tart', outputCount: 1,
    cost: { wheat: 3, flowers: 2, herb: 1 }, station: 'campfire', skill: 'farming', skillXp: 30,
  },
  // ---- alchemy (campfire) ----
  {
    id: 'potion_heal', name: 'Brew Healing Draught', icon: '🧪', output: 'potion_heal', outputCount: 1,
    cost: { herb: 2, flowers: 1 }, station: 'campfire', skill: 'farming', skillXp: 14,
  },
  {
    id: 'potion_stamina', name: 'Brew Stamina Draught', icon: '⚡', output: 'potion_stamina', outputCount: 1,
    cost: { herb: 2 }, station: 'campfire', skill: 'farming', skillXp: 14,
  },
  {
    id: 'potion_nightvision', name: 'Brew Night-Vision', icon: '🌙', output: 'potion_nightvision', outputCount: 1,
    cost: { herb: 3, flowers: 1 }, station: 'campfire', skill: 'farming', skillXp: 18,
  },
  // ---- dyes (campfire) ----
  // Wave 9. Same station and same `farming` skill as the draughts directly
  // above, for the same reason: a dye vat is a pot of plants over a fire, and
  // this game has no other "boil something" station. Each is spent ONCE to
  // open a palette row for the rest of the save (data/dyes.ts explains why
  // once rather than per-recolour). Priced by how hard the colour is to get
  // hold of, not by how it looks: woad is a common flower, madder wants ore
  // for its rust, bark wants timber and a long boil, and Tyrian purple is the
  // dearest dye in the realm and costs like it. No `requiresUnlock` — the
  // ingredients gate them honestly (madder can't be brewed before you're
  // mining ore) and no quest line has ever mentioned dye.
  {
    id: 'dye_woad', name: 'Steep Woad Dye', icon: '🔵', output: 'dye_woad', outputCount: 1,
    cost: { flowers: 3, herb: 1 }, station: 'campfire', skill: 'farming', skillXp: 16,
  },
  {
    id: 'dye_madder', name: 'Steep Madder Dye', icon: '🟠', output: 'dye_madder', outputCount: 1,
    cost: { flowers: 2, iron_ore: 2 }, station: 'campfire', skill: 'farming', skillXp: 20,
  },
  {
    id: 'dye_bark', name: 'Boil Bark Dye', icon: '🟤', output: 'dye_bark', outputCount: 1,
    cost: { wood: 4, herb: 1 }, station: 'campfire', skill: 'farming', skillXp: 16,
  },
  {
    id: 'dye_tyrian', name: 'Steep Tyrian Dye', icon: '🟣', output: 'dye_tyrian', outputCount: 1,
    cost: { flowers: 5, herb: 3 }, station: 'campfire', skill: 'farming', skillXp: 28,
  },
];

export const STATION_LABELS: Record<Recipe['station'], string> = {
  hand: 'By hand',
  workbench: 'Workbench',
  forge: 'Forge',
  campfire: 'Campfire',
};

export const STATION_TABS: { id: Recipe['station']; label: string; icon: string }[] = [
  { id: 'hand', label: 'By Hand', icon: '✋' },
  { id: 'workbench', label: 'Workbench', icon: '🔨' },
  { id: 'forge', label: 'Forge', icon: '🏭' },
  { id: 'campfire', label: 'Campfire', icon: '🔥' },
];

// shown next to a locked recipe — which quest-line unlock it's actually
// waiting on, shared between the full Crafting book and the focused
// per-station quick-menu (StationMenuPanel.tsx)
export const UNLOCK_HINTS: Record<string, string> = {
  mining: 'learn Mining (quest line)',
  smithing: 'learn Smithing (quest line)',
  fishing: 'learn Fishing (quest line)',
  building2: 'progress the quest line',
};
