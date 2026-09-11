'use client';
// Wave 21 — ordinary (non-defender) villager combat state. Mirrors
// game/defenders.ts's DefenderState/registerDefender pattern deliberately
// (mutable, not zustand — this changes every frame during a fight and never
// needs to be persisted; only the Villager record's job/etc. survives a
// save), including the identical downed/downedUntil recovery shape, so a
// villager who loses a skirmish is knocked out, exactly like a defender, and
// never permanently dies to what is meant to be a modest new capability.
//
// A separate file rather than folded into defenders.ts on purpose: a plain
// villager's numbers are a single hard-authored constant, not a
// level/loadout/trait-derived formula the way a defender's are, and keeping
// the two apart is what stops a future defender retune from silently
// touching the population this wave is tuning to sit clearly BELOW that
// floor (see `villagerStrike`'s own comment).
//
// Wave 51 (C5) — armor a villager already owns/wears (helmet/chestplate,
// Wave 9) now feeds a real, bounded HP edge here — see `villagerGearHpBonus`
// below, applied by Villagers.tsx. Damage stays flat (see `villagerStrike`'s
// own comment for why that was investigated and deliberately left alone).

import type { Villager } from './types';
import { chestplateHp, CHESTPLATE_BY_TIER } from './data/armor';

export interface VillagerCombatState {
  hp: number;
  maxHp: number;
  state: 'ok' | 'downed';
  downedUntil: number; // Date.now() ms — real time, same clock DefenderState uses for this field
}

/** A plain villager's whole health pool (Wave 21 investigation). ~33% of an
 *  unarmored level-1 defender's own floor (24 = `18 + level*6`,
 *  game/defenders.ts) — a bit above a lone night skeleton's own 5 HP, so a
 *  person can outlast a shambling skeleton in a fair fight, but nowhere near
 *  a sworn defender's own toughness. Flat for every villager: unlike a
 *  defender, an ordinary villager has no level/loadout/trait system to scale
 *  this off of, and inventing one is real content scope this wave doesn't
 *  need. */
export const VILLAGER_MAX_HP = 8;

/** Wave 51 (C5) · worn armor's contribution to `VILLAGER_MAX_HP`, on top of
 *  the flat floor above — HALF a defender's own bonus for the same plate
 *  (`chestplateHp`, data/armor.ts) and +1 (not Defenders.tsx's +3) for a
 *  helmet, so gearing up an ordinary villager can never close the gap on an
 *  equivalent defender, only narrow it: bare 8 -> iron+helmet 12 ->
 *  forged+helmet 14 -> crested+helmet 17, all still clearly under an
 *  unarmored level-1 defender's own 24 HP floor (`18 + level*6`,
 *  game/defenders.ts). Fully generic over `Villager['gear']` — no new item
 *  types or gear slots, reading the exact fields Defenders.tsx already
 *  reads for its own defenders. */
export function villagerGearHpBonus(gear?: Villager['gear']): number {
  return Math.floor(chestplateHp(gear) / 2) + (gear?.helmet ? 1 : 0);
}

/** `villagerGearHpBonus`'s own ceiling (crested plate + helmet), computed
 *  rather than hard-coded so it can never silently drift from
 *  `CHESTPLATE_BY_TIER` if a tier's `hp` is ever retuned. Wave 54 (E2)
 *  reads this to scale Tam's own, smaller gear-HP share against the exact
 *  same real max, rather than hard-coding a second copy of "9". */
export const VILLAGER_GEAR_HP_MAX = Math.floor(CHESTPLATE_BY_TIER.crested.hp / 2) + 1;

/** What a flat-footed villager's swing takes off a raider. Deliberately NOT
 *  `defenderStrike()` (game/defenders.ts): that formula's own bare-fisted
 *  floor (loadout undefined, level defaulted to 1) already evaluates to ~2
 *  damage for an ordinary villager — the exact number a fresh, UNARMED
 *  DEFENDER hits for — which fails "clearly below a defender" on the one
 *  population this number has to stay below. A dedicated flat constant, with
 *  no courage/attribute scaling of any kind, is what keeps even a
 *  high-courage villager from ever matching a real defender's floor.
 *
 *  Wave 51 (C5) investigated extending this the same way `villagerGearHpBonus`
 *  above extends HP, and deliberately rejected it: `defenderStrike()` itself
 *  never reads gear either (only loadout/level/courage/trait feed a
 *  defender's own damage) — in this codebase's taxonomy, armor is a
 *  toughness stat, never a damage input. The only headroom for a flat +1
 *  bump (-> 2) would TIE, not stay under, the exact bare-defender floor this
 *  constant's own header above says must never be matched. Left flat on
 *  purpose — this is not an oversight for a future pass to "fix". */
const VILLAGER_STRIKE_DMG = 1;

export function villagerStrike(): number {
  return VILLAGER_STRIKE_DMG;
}

export const villagerCombatState: Record<string, VillagerCombatState> = {};

export function registerVillagerCombat(id: string): VillagerCombatState {
  if (!villagerCombatState[id]) {
    villagerCombatState[id] = { hp: VILLAGER_MAX_HP, maxHp: VILLAGER_MAX_HP, state: 'ok', downedUntil: 0 };
  }
  return villagerCombatState[id];
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkvillagercombat = villagerCombatState;
}
