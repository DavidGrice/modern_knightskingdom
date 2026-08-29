'use client';
// Wave 25 — Tam's own combat state, mirroring game/villagerCombat.ts's shape
// deliberately (mutable, not zustand — this changes every frame during a
// fight and never needs to be persisted; only `SaveGame.companionRecruited`
// survives a save, same split falcon.ts's own header argues for a tamed
// companion's live position).
//
// HP/damage reasoning (Q5), against the two real reference points this
// session already established:
//   Villager (Wave 21, game/villagerCombat.ts): 8 HP, 1 dmg / 1.3s (DPS 0.77)
//   Companion (this wave):                     16 HP, 1.5 dmg / 1.2s (DPS 1.25)
//   Unarmored lvl-1 defender (game/defenders.ts): 24 HP, 2 dmg / 1.1s (DPS 1.82)
// 16 HP is exactly 2x the villager floor and exactly 2/3 of the defender
// floor — meaningfully above one population, clearly short of the other, not
// a coin-flip rounding. 1.5 damage and a 1.2s swing both land at the exact
// numeric midpoint between the villager and defender values, deliberately
// avoiding an accidental tie with either (a dedicated, recruited ally should
// read as more capable than an ordinary villager, without simply matching a
// sworn defender's own floor).
export interface CompanionCombatState {
  hp: number;
  maxHp: number;
  state: 'ok' | 'downed';
  downedUntil: number; // Date.now() ms — same wall-clock convention DefenderState/VillagerCombatState use
}

export const COMPANION_MAX_HP = 16;

/** Deliberately NOT `defenderStrike()` nor `villagerStrike()` — a flat
 *  constant of Tam's own, same reasoning villagerCombat.ts's own comment
 *  gives for not reusing a bare-fisted defenderStrike(): this number has to
 *  stay put regardless of how either of those formulas gets retuned later. */
const COMPANION_STRIKE_DMG = 1.5;

export function companionStrike(): number {
  return COMPANION_STRIKE_DMG;
}

export const companionCombatState: Record<string, CompanionCombatState> = {};

export function registerCompanionCombat(id: string): CompanionCombatState {
  if (!companionCombatState[id]) {
    companionCombatState[id] = { hp: COMPANION_MAX_HP, maxHp: COMPANION_MAX_HP, state: 'ok', downedUntil: 0 };
  }
  return companionCombatState[id];
}

/** newGame/loadFromSave reset. Unlike a roster villager's combat state (keyed
 *  by a fresh 'v<n>' id every game, so a stale entry from a prior session is
 *  simply never looked up again) Tam's id is a FIXED literal — without this,
 *  a new game or a freshly loaded save would silently inherit whatever HP he
 *  was left at when the last session ended. */
export function resetCompanionCombat(id: string): void {
  delete companionCombatState[id];
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkcompanioncombat = companionCombatState;
}
