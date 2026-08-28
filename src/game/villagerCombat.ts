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

/** What a flat-footed villager's swing takes off a raider. Deliberately NOT
 *  `defenderStrike()` (game/defenders.ts): that formula's own bare-fisted
 *  floor (loadout undefined, level defaulted to 1) already evaluates to ~2
 *  damage for an ordinary villager — the exact number a fresh, UNARMED
 *  DEFENDER hits for — which fails "clearly below a defender" on the one
 *  population this number has to stay below. A dedicated flat constant, with
 *  no courage/attribute scaling of any kind, is what keeps even a
 *  high-courage villager from ever matching a real defender's floor. */
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
