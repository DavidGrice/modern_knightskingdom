// CLN-11 · split out of game/combat.ts unchanged: the melee ladder — each weapon's reach, arc and damage, its
// forged tiers and enchantment, what the player owns of it — and the tuning numbers for dodge, parry and the
// combo chain. Pure data and pure functions of an inventory.
import type { ItemId } from '../types';
import { WEAPON_SLOTS, type MeleeWeaponId, type WeaponSlot } from './weapons';

interface MeleeStats {
  /** damage at full condition, and once fully worn */
  dmg: number;
  wornDmg: number;
  /** metres of reach, and the MINIMUM facing dot a target must be within —
   *  1 = dead ahead, 0 = anywhere in the 180° frontal arc */
  reach: number;
  cone: number;
  /** seconds between swings (CombatController's own cooldown) and stamina spent */
  cd: number;
  stamina: number;
  /** true = the swing lands on EVERY foe in the arc, not just the nearest */
  sweep: boolean;
  /** damage multiplier for a couched charge — only ever applied while mounted
   *  AND galloping. 1 = this weapon has no charge. */
  charge: number;
}

/**
 * Wave 7 · the player's melee weapons in one table, instead of the sword's
 * numbers inlined in playerAttack(). The `sword` row is EXACTLY what the game
 * already did (3 / 1.5 worn / 2.5m / 0.55s / 8 stamina / dot > 0.3), so
 * nothing about swinging a sword changed; the other two are deliberate steps
 * off it rather than invented numbers:
 *
 *   halberd — slower and costlier per swing, and its single-target DPS
 *             (4.5/0.95 ≈ 4.7) is deliberately BELOW the sword's (3/0.55 ≈
 *             5.5). What it buys instead is reach and a sweep across the
 *             whole frontal arc, which is what makes it worth carrying into
 *             a raid and pointless in a duel.
 *   spear   — the longest reach in the game and a quicker jab than the
 *             halberd, paid for with the narrowest cone (you must actually be
 *             pointed at what you are stabbing) and less per hit. Its `charge`
 *             is the mounted twin of the ranged weapons' existing battlement
 *             bonus (see onBattlement): momentum earning a real mechanical
 *             edge, not just a posture — a couched lance at a gallop is the
 *             hardest single melee blow in the game, and the only one you
 *             cannot land on foot.
 *
 * Stamina is derived, not guessed: each weapon's cost/cd lands within a
 * whisker of the 14/s regen rate (8/0.55, 14/0.95, 10/0.7 ≈ 14.5, 14.7,
 * 14.3), so no polearm is quietly cheaper to spam than the sword already is.
 */
export const MELEE: Record<MeleeWeaponId, MeleeStats> = {
  sword: { dmg: 3, wornDmg: 1.5, reach: 2.5, cone: 0.3, cd: 0.55, stamina: 8, sweep: false, charge: 1 },
  halberd: { dmg: 4.5, wornDmg: 2.2, reach: 3.3, cone: 0, cd: 0.95, stamina: 14, sweep: true, charge: 1 },
  spear: { dmg: 3.5, wornDmg: 1.8, reach: 3.9, cone: 0.6, cd: 0.7, stamina: 10, sweep: false, charge: 2.2 },
};

/**
 * Wave 49 (C1) · multi-tier sword and halberd, reusing data/armor.ts's own
 * "one tiered slot, re-forge the tier below" shape (a Forged Sword's recipe
 * consumes a base Sword, exactly like a Forged Plate consumes an Iron one).
 *
 * The one real difference from armor: MELEE above is a deliberate TYPE-vs-
 * TYPE tradeoff table (this table's own header comment — halberd trades
 * single-target DPS for reach+sweep), not a strictly-better ladder. A tier
 * therefore only ever scales `dmg`/`wornDmg` — every other MeleeStats field
 * (reach/cone/cd/stamina/sweep/charge) stays exactly what MELEE[kind] already
 * says at every tier, which is what keeps the halberd/sword DPS ratio (and so
 * the whole tradeoff) intact all the way up the ladder: sword single-target
 * DPS runs 5.45/6.36/7.27 across the three tiers, halberd 4.74/5.47/6.21 —
 * the ratio between them stays 0.870/0.860/0.854, a near-invariant, not a
 * strictly-better weapon making the sword-vs-halberd choice moot.
 *
 * Spear is deliberately NOT in this table — it stays untiered this wave (see
 * data/recipes.ts's own header comment on the new recipes) — so
 * `meleeStatsFor('spear', ...)` always falls through to the flat MELEE.spear
 * row below, unchanged.
 *
 * Wave 50 (C2) · a 4th rung, 'legendary', continues the exact same arithmetic
 * sequence one step further: Wave 49's own three tiers are base/forged/
 * crested x(6/6, 7/6, 8/6) of MELEE[kind]'s flat dmg — legendary is x(9/6) =
 * 1.5. Single-target DPS across all four tiers: sword 5.45/6.36/7.27/8.18,
 * halberd 4.74/5.47/6.21/7.11 — ratio 0.870/0.860/0.854/0.869, still the same
 * near-invariant Wave 49 established, so the sword-vs-halberd tradeoff
 * survives at the new top rung too. UNLIKE the forged/crested tiers,
 * legendary has NO recipe (see data/recipes.ts) — it drops only, from
 * bossEncounter.ts's BOSS_LEGENDARY_DROP.
 */
export type MeleeTier = 'base' | 'forged' | 'crested' | 'legendary';

interface MeleeTierDmg { dmg: number; wornDmg: number }

const MELEE_TIERS: Partial<Record<MeleeWeaponId, Record<MeleeTier, MeleeTierDmg>>> = {
  sword: {
    base: { dmg: 3, wornDmg: 1.5 },
    forged: { dmg: 3.5, wornDmg: 1.75 },
    crested: { dmg: 4, wornDmg: 2 },
    legendary: { dmg: 4.5, wornDmg: 2.25 },
  },
  halberd: {
    base: { dmg: 4.5, wornDmg: 2.2 },
    forged: { dmg: 5.2, wornDmg: 2.5 },
    crested: { dmg: 5.9, wornDmg: 2.9 },
    legendary: { dmg: 6.75, wornDmg: 3.3 },
  },
};

/** worst first, mirroring data/armor.ts's CHESTPLATES ordering exactly — the
 *  Satchel item each (weapon, tier) pair is worn from. Spear has no entry
 *  here on purpose (untiered), so `bestMeleeTierOwned` falls through to a
 *  plain single-ItemId ownership check for it. */
const MELEE_TIER_ITEMS: Partial<Record<MeleeWeaponId, { tier: MeleeTier; item: ItemId }[]>> = {
  sword: [
    { tier: 'base', item: 'sword' },
    { tier: 'forged', item: 'sword_forged' },
    { tier: 'crested', item: 'sword_crested' },
    { tier: 'legendary', item: 'sword_legendary' },
  ],
  halberd: [
    { tier: 'base', item: 'halberd' },
    { tier: 'forged', item: 'halberd_forged' },
    { tier: 'crested', item: 'halberd_crested' },
    { tier: 'legendary', item: 'halberd_legendary' },
  ],
};

/** The best tier of `kind` currently owned, or null (nothing owned — bare
 *  fists for a sword, no polearm in hand for the other two). Mirrors
 *  `bestChestplateOwned`'s own "best of what I own, worst-first scan"
 *  exactly. Spear has no ladder: 'base' whenever a spear is owned, matching
 *  its pre-Wave-49 single-tier behavior byte for byte. */
export function bestMeleeTierOwned(kind: MeleeWeaponId, inv: Partial<Record<ItemId, number>>): MeleeTier | null {
  const ladder = MELEE_TIER_ITEMS[kind];
  if (!ladder) return (inv[kind] ?? 0) > 0 ? 'base' : null;
  for (let i = ladder.length - 1; i >= 0; i--) {
    if ((inv[ladder[i].item] ?? 0) > 0) return ladder[i].tier;
  }
  return null;
}

/** Owns ANY tier of `kind` — the real fix for two bugs a naive tier add would
 *  otherwise ship: forging a tier consumes the item below it (chestplate-
 *  chain style), so a flat `(inv[kind]??0)>0` check reads 0 the moment a
 *  Forged/Crested tier is made, wrongly scoring a real weapon in hand as
 *  bare-fisted. Used by `playerAttack`'s `held` gate, `activeMelee`'s own
 *  ownership check and `cycleWeapon`'s `ownsSlot`, replacing three ad hoc
 *  single-item checks that only ever worked before tiers existed. */
export function ownsMeleeSlot(kind: MeleeWeaponId, inv: Partial<Record<ItemId, number>>): boolean {
  return bestMeleeTierOwned(kind, inv) !== null;
}

/** Wave 51 (C5) · the reverse of the tier tables above — given a raw Satchel
 *  item id, which `WeaponSlot` (if any) it belongs to. A tiered item
 *  (`sword_forged`, `halberd_crested`, …) resolves back to its BASE slot
 *  (`sword`, `halberd`) exactly like `bestMeleeTierOwned` already walks the
 *  ladder the other way — so a Satchel drag of any tier lands on the same
 *  `onWeaponDrop` (Panels.tsx) the plain-item weapon tiles already use,
 *  with no change to that handler at all. `crossbow`/`longbow`/`spear` have
 *  no ladder (see MELEE_TIER_ITEMS' own header) and are already WeaponSlot
 *  ids verbatim, so those just match themselves. Returns null for anything
 *  that isn't a weapon-family item (food, bricks, chestplates, …) — the
 *  Satchel grid uses this to decide which tiles are drag sources at all. */
export function weaponSlotOfItem(item: ItemId): WeaponSlot | null {
  if ((WEAPON_SLOTS as readonly string[]).includes(item)) return item as WeaponSlot;
  for (const kind of Object.keys(MELEE_TIER_ITEMS) as MeleeWeaponId[]) {
    if (MELEE_TIER_ITEMS[kind]?.some((t) => t.item === item)) return kind;
  }
  return null;
}

/**
 * Wave 50 (C4) · enchanting. A permanent, one-way +10% dmg/wornDmg post-
 * multiply, orthogonal to (applied AFTER) the tier lookup above — it stacks
 * with whichever tier is currently best-owned, including C2's new
 * 'legendary', with zero extra wiring. The rune is a plain marker `ItemId`
 * sitting in the SAME `inv` this function already receives (never a new
 * `SaveGame` field, never a signature change at this function's one call
 * site — see playerAttack) — dyes.ts's "consumable spent once, permanent
 * save-scoped effect" shape, adapted: a flat ItemId rather than a
 * `SaveGame`-level string array, because `gameStore.ts` could not import
 * `MeleeWeaponId` when this was written: the type lived in combat.ts, which
 * imports gameStore.ts, not the reverse — the same cycle dyes' own loosened
 * `string[]` type sidesteps. (CLN-11 moved the type to data/weapons.ts, a
 * leaf, so that constraint is gone; the flat ItemId shape stays.)
 * Spear has no entry: it was never brought into the tier system either.
 */
const ENCHANT_ITEM: Partial<Record<MeleeWeaponId, ItemId>> = {
  sword: 'sword_rune',
  halberd: 'halberd_rune',
};

const ENCHANT_MULT = 1.1;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** `MELEE[kind]` with `dmg`/`wornDmg` swapped for whichever tier is actually
 *  owned — every other field is left exactly as MELEE[kind] already has it
 *  (see this table's own header comment for why that's load-bearing). Falls
 *  back to the flat MELEE[kind] numbers when nothing is owned yet — bare-
 *  fisted 'sword' still resolves through here; it's `playerAttack`'s own
 *  `held` gate (not this function) that turns an unowned sword into flat 1
 *  damage regardless of what this returns. A permanent enchantment rune (see
 *  ENCHANT_ITEM above), once owned, then multiplies whatever dmg/wornDmg the
 *  tier lookup produced. */
export function meleeStatsFor(kind: MeleeWeaponId, inv: Partial<Record<ItemId, number>>): MeleeStats {
  const base = MELEE[kind];
  const tier = bestMeleeTierOwned(kind, inv);
  const over = tier ? MELEE_TIERS[kind]?.[tier] : undefined;
  const stats = over ? { ...base, dmg: over.dmg, wornDmg: over.wornDmg } : base;
  const rune = ENCHANT_ITEM[kind];
  if (rune && (inv[rune] ?? 0) > 0) {
    return { ...stats, dmg: round2(stats.dmg * ENCHANT_MULT), wornDmg: round2(stats.wornDmg * ENCHANT_MULT) };
  }
  return stats;
}

// ---- Wave 40 (A6) · real melee depth: dodge-roll, parry timing, i-frames,
// combo chain. This codebase's whole extraction has ~15 animation clips
// total and none of them are a roll/parry-flourish/finisher — see the
// dodge's own header comment on `tryDodge` for the honest, non-fabricated
// stand-in this uses instead of a bespoke clip reference.

/** stamina cost of one dodge-roll */
export const DODGE_STAMINA_COST = 25;

/** cooldown before another roll can start */
export const DODGE_COOLDOWN_MS = 650;

/** how long the burst itself lasts */
export const DODGE_DURATION_MS = 220;

/** the WHOLE burst is invincible — no animation means no separate "recovery
 *  frames" to model honestly, so this equals DODGE_DURATION_MS rather than
 *  some shorter, invented fraction of it */
export const DODGE_IFRAME_MS = 220;

/** ~3.3m over the burst (DODGE_SPEED * DODGE_DURATION_MS/1000) — a real
 *  repositioning tool given weapon reach tops out at 3.9m (the spear) */
export const DODGE_SPEED = 15;

/** generous: no windup animation telegraphs an enemy's swing, so a tight
 *  reflex window would be unfair, not skillful */
export const PARRY_WINDOW_MS = 300;

/** vs. 14 for a normal held block — precision is cheaper than endurance */
export const PARRY_STAMINA_COST = 4;

/** shorter than the dodge's 220ms — there's no roll happening, just a clash */
export const PARRY_IFRAME_MS = 150;

/** how long a parried attacker's own next swing is delayed */
export const PARRY_STAGGER_S = 2.2;

export const PARRY_KNOCKBACK = 1.3;

/** comfortably covers two halberd swings (0.95s cd each) with reaction time */
export const COMBO_WINDOW_MS = 2000;

export const COMBO_CHAIN_LENGTH = 3;

export const COMBO_FINISHER_MULT = 1.6;

export const FINISHER_STAGGER_S = 1.8;
