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
