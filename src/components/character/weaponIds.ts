// Which real WeaponId each melee tier renders (Wave 49, C1). Shared by the first-person viewmodel
// (fps/Viewmodel.tsx) and the third-person held gear (character/gear/held.tsx), which each carried a
// byte-identical copy of these two tables before CLN-28. A caller that passes no tier gets 'base' — the
// mold both always rendered. (G-08 · a defender's own tier now comes through LoadoutGear: Defenders.tsx and
// NpcEquipPanel.tsx's preview pass the villager's loadoutTier.)
import type { WeaponId } from '@/lib/weaponParts';
import type { MeleeTier } from '@/game/combat';

export const SWORD_WEAPON_ID: Record<MeleeTier, WeaponId> = {
  base: 'sword', forged: 'sword_forged', crested: 'sword_crested', legendary: 'sword_legendary',
};
export const HALBERD_WEAPON_ID: Record<MeleeTier, WeaponId> = {
  base: 'halberd', forged: 'halberd_forged', crested: 'halberd_crested', legendary: 'halberd_legendary',
};
