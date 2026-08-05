import type { ItemId } from '../types';

export interface ItemDef {
  id: ItemId;
  name: string;
  icon: string; // emoji icon for UI
}

export const ITEMS: Record<ItemId, ItemDef> = {
  wood: { id: 'wood', name: 'Wood Log', icon: '🪵' },
  plank: { id: 'plank', name: 'Plank', icon: '🟫' },
  stone: { id: 'stone', name: 'Stone', icon: '🪨' },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', icon: '⛏️' },
  iron_bar: { id: 'iron_bar', name: 'Iron Bar', icon: '🔩' },
  fish: { id: 'fish', name: 'Raw Fish', icon: '🐟' },
  cooked_fish: { id: 'cooked_fish', name: 'Cooked Fish', icon: '🍖' },
  flowers: { id: 'flowers', name: 'Wildflowers', icon: '🌼' },
  axe: { id: 'axe', name: 'Woodcutter Axe', icon: '🪓' },
  pickaxe: { id: 'pickaxe', name: 'Pickaxe', icon: '⚒️' },
  fishing_rod: { id: 'fishing_rod', name: 'Fishing Rod', icon: '🎣' },
  hammer: { id: 'hammer', name: 'Builder Hammer', icon: '🔨' },
  sword: { id: 'sword', name: 'Knight Sword', icon: '⚔️' },
  shield: { id: 'shield', name: 'Kingdom Shield', icon: '🛡️' },
  crossbow: { id: 'crossbow', name: 'Crossbow', icon: '🏹' },
  bolt: { id: 'bolt', name: 'Crossbow Bolt', icon: '➶' },
  longbow: { id: 'longbow', name: 'Longbow', icon: '🏹' },
  arrow: { id: 'arrow', name: 'Arrow', icon: '➶' },
  gold: { id: 'gold', name: 'Gold Coin', icon: '🪙' },
  wheat: { id: 'wheat', name: 'Wheat', icon: '🌾' },
  bread: { id: 'bread', name: 'Fresh Bread', icon: '🍞' },
  helmet: { id: 'helmet', name: 'Iron Helm', icon: '🪖' },
  chestplate: { id: 'chestplate', name: 'Iron Chestplate', icon: '🦺' },
  halberd: { id: 'halberd', name: 'Halberd', icon: '🔱' },
  herb: { id: 'herb', name: 'Wild Herb', icon: '🌿' },
  potion_heal: { id: 'potion_heal', name: 'Healing Draught', icon: '🧪' },
  potion_stamina: { id: 'potion_stamina', name: 'Stamina Draught', icon: '⚡' },
  potion_nightvision: { id: 'potion_nightvision', name: 'Night-Vision Brew', icon: '🌙' },
  // Wave 5: carried, not crafted — a tool-like item in the spirit of the axe,
  // filled at the brook and spent watering a cultivated plot
  water_bucket: { id: 'water_bucket', name: 'Pail of Water', icon: '🪣' },
};

/** foods that can be eaten from the satchel, and the vigour they restore.
 *  (Vitals are one bar with a numeric readout — there are no hearts.) */
export const EDIBLES: Partial<Record<ItemId, number>> = {
  fish: 1,
  cooked_fish: 3,
  bread: 4,
  potion_heal: 5,
};

/** potions with a non-heal effect, usable straight from the satchel like food */
export const UTILITY_POTIONS: ItemId[] = ['potion_stamina', 'potion_nightvision'];
