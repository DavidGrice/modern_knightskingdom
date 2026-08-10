// Wave 9 · ARMOR TIERS (iron → forged → castle-crested).
//
// ---------------------------------------------------------------------------
// What the backlog asked for vs. what this pipeline can actually do.
//
// The backlog words this as "torso decal variants", which does not map onto
// how figures are assembled here. A minifig's torso print is BAKED INTO its
// donor OBJ/MTL (lib/minifig.ts): there is no runtime decal-compositing layer
// to swap, and data/villagerLooks.ts records — in a comment written after real
// breakage — that head and torso MUST come from the same donor or the figure
// assembles wrong (floating shields, detached limb shards). Picking a
// different torso to change armor tier would change the wearer's face and
// pose with it. The numbered donor variants are no shortcut either: they
// differ by held weapon/pose, not by armor quality, and weaponParts.ts already
// consumes them as weapon geometry.
//
// So the tiers are rendered the way this game already renders a chestplate:
// PROCEDURALLY. `Chestplate()` (components/character/Equipment.tsx) has always
// been a hand-built plate — "procedural where the original has no equivalent",
// the same rule the axe, pickaxe, campfire, forge and bed follow — and each
// tier is now a distinct plate-and-emblem built from that same primitive. The
// decal is real geometry raised off the plate rather than a texture, which is
// both what the pipeline supports and what reads at minifig scale.
//
// ---------------------------------------------------------------------------
// Shape: ONE TIERED SLOT, not three independent ones. `Villager.gear
// .chestplate` keeps its single field and simply holds a tier now (with legacy
// `true` meaning 'iron' — see ChestplateTier's own comment), so the store
// action that sets it is `setDefenderLoadout`-shaped: upgrading hands the old
// plate back to the Armory instead of destroying it. That is deliberately the
// same shape as this wave's carriers, since it is the same problem.
import type { ChestplateTier, ItemId, Villager } from '../types';

export interface ChestplateDef {
  id: ChestplateTier;
  /** the countable Satchel/Armory item this tier is worn from */
  item: ItemId;
  label: string;
  icon: string;
  /** defender max-HP bonus (Defenders.tsx) */
  hp: number;
  /** player passive damage reduction (combat.ts's armorReduction, which still
   *  caps the whole pool at 0.45 so plate alone never makes you untouchable) */
  reduction: number;
  blurb: string;
}

/** worst first — every "best of what I own" scan below walks this backwards */
export const CHESTPLATES: ChestplateDef[] = [
  {
    id: 'iron', item: 'chestplate', label: 'Iron Plate', icon: '🦺',
    hp: 6, reduction: 0.2,
    blurb: 'Plain beaten iron with a single boss.',
  },
  {
    id: 'forged', item: 'chestplate_forged', label: 'Forged Plate', icon: '🔗',
    hp: 10, reduction: 0.28,
    blurb: 'Re-forged over the old plate, banded and riveted.',
  },
  {
    id: 'crested', item: 'chestplate_crested', label: 'Castle-Crested Plate', icon: '🏰',
    hp: 16, reduction: 0.36,
    blurb: 'Bright steel under gold trim, crowned with the castle crest.',
  },
];

export const CHESTPLATE_BY_TIER: Record<ChestplateTier, ChestplateDef> =
  Object.fromEntries(CHESTPLATES.map((c) => [c.id, c])) as Record<ChestplateTier, ChestplateDef>;

/** the Armory/Satchel item each tier is worn from — the one place the item
 *  vocabulary and the worn-tier vocabulary are joined, exactly like
 *  CARRIER_ITEM does for the carriers */
export const CHESTPLATE_ITEM: Record<ChestplateTier, ItemId> = {
  iron: 'chestplate', forged: 'chestplate_forged', crested: 'chestplate_crested',
};

/** Which tier a figure is actually wearing, or null for bare-chested. THE one
 *  reader of `gear.chestplate` — legacy saves store `true` for the original
 *  single tier, so nothing else in the codebase should ever switch on that
 *  field directly. (Plain truthiness tests still work everywhere: every tier
 *  name is a non-empty string.) */
export function chestplateTierOf(gear?: Villager['gear']): ChestplateTier | null {
  const c = gear?.chestplate;
  if (!c) return null;
  return c === true ? 'iron' : c;
}

/** defender max-HP bonus for a worn plate — 0 when bare-chested */
export function chestplateHp(gear?: Villager['gear']): number {
  const tier = chestplateTierOf(gear);
  return tier ? CHESTPLATE_BY_TIER[tier].hp : 0;
}

/** The best plate in a bag, or null. The player has no equip slot for armor —
 *  owning a piece IS wearing it (combat.ts's armorReduction, PlayerAvatar's
 *  paperdoll) — so "best owned" is the player's tier. */
export function bestChestplateOwned(
  inv: Partial<Record<ItemId, number>>,
): ChestplateDef | null {
  for (let i = CHESTPLATES.length - 1; i >= 0; i--) {
    if ((inv[CHESTPLATES[i].item] ?? 0) > 0) return CHESTPLATES[i];
  }
  return null;
}
