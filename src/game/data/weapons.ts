// CLN-11 · split out of game/combat.ts unchanged: the weapon slots the player can ready, melee and ranged.

/** Wave 7 · melee is no longer just "the sword or your fists". Mirrors the
 *  existing `rangedWeapon` sub-selector's shape exactly rather than inventing
 *  a second convention for the same job. */
export type MeleeWeaponId = 'sword' | 'halberd' | 'spear';

/** Every weapon the player can ready, melee and ranged in ONE list, in the
 *  order Q cycles them. Both switch points (the equip panel's tile row and
 *  GameScreen's swapWeapon) walk this, so a future weapon reaches both by
 *  being added here once instead of by editing two hardcoded arrays that
 *  already drifted apart before. */
export const WEAPON_SLOTS = ['sword', 'halberd', 'spear', 'crossbow', 'longbow'] as const;

export type WeaponSlot = (typeof WEAPON_SLOTS)[number];

/** which sub-selector a slot writes: `meleeWeapon` or `rangedWeapon` */
export function isMeleeSlot(k: WeaponSlot): k is MeleeWeaponId {
  return k === 'sword' || k === 'halberd' || k === 'spear';
}
