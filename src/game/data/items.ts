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
  // Wave 7 · the halberd's opposite number: less weight behind it, more haft
  // in front of it. Deliberately NOT '🔱' too — the two sit side by side in
  // the Satchel and the equip row, so they must be tellable apart at a glance.
  spear: { id: 'spear', name: 'Spear', icon: '🗡️' },
  herb: { id: 'herb', name: 'Wild Herb', icon: '🌿' },
  potion_heal: { id: 'potion_heal', name: 'Healing Draught', icon: '🧪' },
  potion_stamina: { id: 'potion_stamina', name: 'Stamina Draught', icon: '⚡' },
  potion_nightvision: { id: 'potion_nightvision', name: 'Night-Vision Brew', icon: '🌙' },
  // Wave 5: carried, not crafted — a tool-like item in the spirit of the axe,
  // filled at the brook and spent watering a cultivated plot
  water_bucket: { id: 'water_bucket', name: 'Pail of Water', icon: '🪣' },
  // Wave 9 · the carrier tiers. Crafted into the Satchel like any other gear,
  // then donated to the Armory and worn by a villager (never by the player —
  // there is no player carry-capacity mechanic to raise). Distinct icons on
  // purpose: they sit side by side in the Armory's Carriers row.
  basket: { id: 'basket', name: 'Woven Basket', icon: '🧺' },
  cart: { id: 'cart', name: 'Hand Cart', icon: '🛒' },
  // Wave 9 · the two plate tiers above plain iron. Icons chosen to be tellable
  // apart at a glance in the Armory row, same rule the halberd/spear pair
  // above follows: riveted bands for the forged plate, the castle itself for
  // the crested one.
  chestplate_forged: { id: 'chestplate_forged', name: 'Forged Plate', icon: '🔗' },
  chestplate_crested: { id: 'chestplate_crested', name: 'Castle-Crested Plate', icon: '🏰' },
  // Wave 9 · cooking depth. Three campfire dishes made from things already
  // gatherable — the pottage is the everyday pot, the stew the fisherman's
  // supper, the tart the one thing wildflowers have ever been good for
  // besides a draught.
  pottage: { id: 'pottage', name: 'Herb Pottage', icon: '🥣' },
  fish_stew: { id: 'fish_stew', name: "Fisherman's Stew", icon: '🍲' },
  blossom_tart: { id: 'blossom_tart', name: 'Blossom Tart', icon: '🥧' },
  // Wave 9 · dyes. Brewed, then spent once to open a palette row for good
  // (data/dyes.ts) — never worn, never eaten.
  dye_woad: { id: 'dye_woad', name: 'Woad Dye', icon: '🔵' },
  dye_madder: { id: 'dye_madder', name: 'Madder Dye', icon: '🟠' },
  dye_tyrian: { id: 'dye_tyrian', name: 'Tyrian Dye', icon: '🟣' },
  dye_bark: { id: 'dye_bark', name: 'Bark Dye', icon: '🟤' },
  // Wave 49 (C1) · the sword/halberd tiers above the base weapon, the same
  // re-forge-the-tier-below chain the chestplate above already established.
  // Icons reused across both lines (🔗 for "forged", 👑 for "crested") the
  // same way 🏹 is already shared by crossbow/longbow — the weapon-select row
  // and the Satchel both show the item's NAME alongside the icon, so context
  // (not a unique glyph) is what tells a Forged Sword from a Forged Halberd.
  sword_forged: { id: 'sword_forged', name: 'Forged Sword', icon: '🔗' },
  sword_crested: { id: 'sword_crested', name: 'Crested Sword', icon: '👑' },
  halberd_forged: { id: 'halberd_forged', name: 'Forged Halberd', icon: '🔗' },
  halberd_crested: { id: 'halberd_crested', name: 'Crested Halberd', icon: '👑' },
  // Wave 50 (C2) · the drop-only rung above Crested — never forged, so no
  // icon collision with the re-forge chain above matters; ✨ marks "this came
  // from a boss, not the workbench" at a glance in the Satchel.
  sword_legendary: { id: 'sword_legendary', name: 'Legendary Sword', icon: '✨' },
  halberd_legendary: { id: 'halberd_legendary', name: 'Legendary Halberd', icon: '✨' },
  // Wave 50 (C4) · the permanent enchantment marker for each weapon line —
  // 🔮 distinct from every tier icon above (🔗/👑/✨) so a glance at the
  // Satchel tells "which tier" apart from "is it enchanted".
  sword_rune: { id: 'sword_rune', name: 'Sword Enchantment', icon: '🔮' },
  halberd_rune: { id: 'halberd_rune', name: 'Halberd Enchantment', icon: '🔮' },
};

/** foods that can be eaten from the satchel, and the vigour they restore.
 *  (Vitals are one bar with a numeric readout — there are no hearts.) */
export const EDIBLES: Partial<Record<ItemId, number>> = {
  fish: 1,
  cooked_fish: 3,
  bread: 4,
  potion_heal: 5,
  // Wave 9 · the cooked ladder continues above the draught rather than
  // alongside it, and each rung costs a rung's worth more work: pottage is one
  // pot of herbs, the stew adds the catch, the tart is three grains and the
  // flowers on top. The Healing Draught stays the cheap emergency top-up (two
  // herbs, drinkable mid-fight); these are a meal you cooked ahead.
  pottage: 6,
  fish_stew: 9,
  blossom_tart: 13,
};

/** potions with a non-heal effect, usable straight from the satchel like food */
export const UTILITY_POTIONS: ItemId[] = ['potion_stamina', 'potion_nightvision'];

/** Which verb the UI should use for a consumable. `EDIBLES` holds draughts
 *  AND dishes (the Healing Draught restores vigour exactly the way food does),
 *  so the verb can't be inferred from which map an item came out of — every
 *  edible read as "click to drink", which was merely odd for bread and plainly
 *  wrong once Wave 9 added a pottage, a stew and a tart. Keyed off the id
 *  prefix because that IS the naming rule for a brewed item here (potion_heal,
 *  potion_stamina, potion_nightvision); anything else is chewed. */
export function consumeVerb(id: ItemId): 'drink' | 'eat' {
  return id.startsWith('potion_') ? 'drink' : 'eat';
}
