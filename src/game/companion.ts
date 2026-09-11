'use client';
// Wave 25 — Tam's own combat state, mirroring game/villagerCombat.ts's shape
// deliberately (mutable, not zustand — this changes every frame during a
// fight and never needs to be persisted; only `SaveGame.companionRecruited`/
// `SaveGame.companion` survive a save, same split falcon.ts's own header
// argues for a tamed companion's live position).
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
//
// Wave 54 — independent leveling/gear (E2) extends this HP number, but the
// invariant above still has to hold: a fully-leveled, fully-geared Tam must
// still read as short of a real sworn defender's own floor, the same
// invariant Wave 51 (C5) had to preserve for an ordinary villager's own
// gear-derived HP bonus (`villagerGearHpBonus`, villagerCombat.ts — its
// underlying tier math is reused verbatim below, not reinvented). That
// wave's own numbers are the real precedent for how much headroom is safe:
// a gear-maxed villager (17 HP) was left 7 points (29%) under the unarmored
// level-1 defender's 24 HP floor. `COMPANION_HP_CEILING` below (20) leaves
// Tam a full 4 points (17%) under that same 24 HP floor — tighter than the
// villager's own margin precisely because a companion should read as MORE
// capable than a villager, while a real defender's own floor only climbs
// from there (+6 HP/level, uncapped, plus Shieldwall's +8 and full gear on
// top) — the gap can only widen over a real playthrough, never close.
//
// Post-launch fix (still Wave 54): the first cut of this formula summed a
// full, unshared +5-max level term and a full, unshared copy of
// `villagerGearHpBonus` (+9 max) and only clamped the *total* at
// COMPANION_HP_CEILING — so either axis alone (level 4+, ~54 kills, with no
// gear at all, OR any level with a Castle-Crested Plate) already saturated
// the ceiling on its own, leaving the *other* axis worth exactly zero HP.
// That silently broke the "gear-slot system" half of this wave's own
// deliverable for most of a real playthrough. Fixed by giving each axis its
// own small, capped share of the little headroom between `COMPANION_BASE_HP`
// and the ceiling (`COMPANION_LEVEL_HP_MAX` / `COMPANION_GEAR_HP_MAX`, 2 HP
// apiece) so neither one alone can reach the ceiling — only leveling AND
// gearing up together do. Gear's own share is scaled against `VILLAGER_GEAR_HP_MAX`
// (villagerCombat.ts's own real ceiling for the same tiers) rather than a
// second hard-coded "9", so the two systems can never drift apart silently.
//
// Damage stays flat (`COMPANION_STRIKE_DMG`, unchanged by leveling or gear)
// for the exact reason villagerCombat.ts's own `villagerStrike` comment
// gives for rejecting a gear-driven damage bump there: armor is a toughness
// stat in this codebase's taxonomy, never a damage input, and there is even
// less headroom here than the villager case already rejected — an ordinary
// villager needed a full +1 (100%) to tie the bare-defender floor of 2; a
// flat 1.5 needs only +0.5 (33%) to tie it.
import type { Villager } from './types';
import { villagerGearHpBonus, VILLAGER_GEAR_HP_MAX } from './villagerCombat';

export interface CompanionCombatState {
  hp: number;
  maxHp: number;
  state: 'ok' | 'downed';
  downedUntil: number; // Date.now() ms — same wall-clock convention DefenderState/VillagerCombatState use
}

/** Wave 25's own flat number, now the LEVEL-1/no-gear floor rather than a
 *  ceiling — see `companionMaxHp` below for what it grows into. */
export const COMPANION_BASE_HP = 16;
/** Levels above this stop growing HP further (a small, bounded term, not a
 *  mirror of a real defender's own uncapped `+level*6`) — `assistLeader.ts`'s
 *  own `floor(sqrt(xp/50))` curve reaches this at 1250 xp (~83 kills). */
export const COMPANION_LEVEL_CAP = 5;
/** Max HP a fully-leveled (level >= COMPANION_LEVEL_CAP) Tam gains from
 *  LEVEL ALONE, with no gear at all — deliberately less than the full gap
 *  to `COMPANION_HP_CEILING` so gearing up still means something even at
 *  max level. */
export const COMPANION_LEVEL_HP_MAX = 2;
/** Max HP a fully-geared (Castle-Crested Plate + helmet) Tam gains from
 *  GEAR ALONE, at level 0 — deliberately less than the full gap to
 *  `COMPANION_HP_CEILING` so leveling up still means something even in
 *  bare skin. Scaled against `villagerGearHpBonus`'s own real ceiling
 *  (`VILLAGER_GEAR_HP_MAX`), not a second hard-coded copy of it. */
export const COMPANION_GEAR_HP_MAX = 2;
/** The real invariant (see this file's own header): no combination of
 *  level + gear may push Tam's max HP past this, regardless of how high
 *  either input climbs. Equals BASE + LEVEL_MAX + GEAR_MAX, so the ceiling
 *  is only ever actually reached by maxing BOTH axes at once — see the
 *  "Post-launch fix" header note above for why that equality matters. */
export const COMPANION_HP_CEILING = COMPANION_BASE_HP + COMPANION_LEVEL_HP_MAX + COMPANION_GEAR_HP_MAX;

/** Tam's own share of level HP: linearly interpolated up to
 *  `COMPANION_LEVEL_HP_MAX` at `COMPANION_LEVEL_CAP`, so partial levels
 *  (e.g. level 3 of 5) grant a partial, proportional bonus rather than
 *  jumping straight to the cap. */
function companionLevelHpBonus(level: number): number {
  const clamped = Math.min(Math.max(level, 0), COMPANION_LEVEL_CAP);
  return Math.round((clamped / COMPANION_LEVEL_CAP) * COMPANION_LEVEL_HP_MAX);
}

/** Tam's own share of gear HP: `villagerGearHpBonus` (villagerCombat.ts,
 *  reused verbatim for the underlying per-tier HP values — not a second
 *  gear-HP formula) rescaled from ITS OWN real ceiling (`VILLAGER_GEAR_HP_MAX`)
 *  down to Tam's much smaller `COMPANION_GEAR_HP_MAX` share, so an
 *  intermediate tier (e.g. Forged Plate alone) still lands proportionally
 *  between bare and Castle-Crested-plus-helmet rather than either flooring
 *  or ceiling out early. */
function companionGearHpBonus(gear?: Villager['gear']): number {
  return Math.round((villagerGearHpBonus(gear) / VILLAGER_GEAR_HP_MAX) * COMPANION_GEAR_HP_MAX);
}

/** Tam's real max HP for his current level/gear — see the two helpers above
 *  for how each axis earns its own small, capped share of the headroom
 *  between `COMPANION_BASE_HP` and `COMPANION_HP_CEILING`. The `Math.min`
 *  is a belt-and-suspenders hard cap (the two shares already sum to exactly
 *  the ceiling at their own individual maximums) rather than the load-bearing
 *  guard it used to be. */
export function companionMaxHp(level: number, gear?: Villager['gear']): number {
  return Math.min(
    COMPANION_HP_CEILING,
    COMPANION_BASE_HP + companionLevelHpBonus(level) + companionGearHpBonus(gear),
  );
}

/** Deliberately NOT `defenderStrike()` nor `villagerStrike()` — a flat
 *  constant of Tam's own, same reasoning villagerCombat.ts's own comment
 *  gives for not reusing a bare-fisted defenderStrike(): this number has to
 *  stay put regardless of how either of those formulas gets retuned later.
 *  Also deliberately untouched by Wave 54's leveling/gear system — see this
 *  file's own header for why armor stays HP-only, never a damage input. */
const COMPANION_STRIKE_DMG = 1.5;

export function companionStrike(): number {
  return COMPANION_STRIKE_DMG;
}

export const companionCombatState: Record<string, CompanionCombatState> = {};

/** `maxHp` defaults to the level-1/no-gear floor so every pre-existing call
 *  site (followLeader.ts/assistLeader.ts's `not_downed` gates, which only
 *  need `state`) keeps working unchanged; Companion.tsx — the one place
 *  that actually knows Tam's live level/gear — passes the real
 *  `companionMaxHp(...)` result explicitly and re-applies it every frame
 *  (this only seeds the record on first creation, same as
 *  registerVillagerCombat's own lazy-create contract). */
export function registerCompanionCombat(id: string, maxHp = COMPANION_BASE_HP): CompanionCombatState {
  if (!companionCombatState[id]) {
    companionCombatState[id] = { hp: maxHp, maxHp, state: 'ok', downedUntil: 0 };
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
