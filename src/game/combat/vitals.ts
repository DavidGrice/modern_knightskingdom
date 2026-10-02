'use client';
// CLN-11 · split out of game/combat.ts: the vitals' ceilings follow the store (levels, perks, talents, attributes).
import { useGameStore } from '../store/gameStore';
import { SKILLS, levelFromXp } from '../data/ranks';
import { combatState } from './state';

// CLN-04 · set by the session-reset hook (combat/session.ts, through armVitalsRefill), consumed by the FIRST
// store notification after it — the one beginSession's set() fires: the ceilings are
// re-derived from the state that just landed, then the vitals are filled to them.
let refillVitals = false;

/** CLN-11 · the session-reset hook lives in another module now, and a module cannot assign another module's
 *  `let` — so the flag is armed through this instead of written directly. */
export function armVitalsRefill(): void {
  refillVitals = true;
}

// the Iron Grip perk raises the stamina ceiling permanently — react to the
// store rather than gameStore importing combatState (which would create a
// cycle, since the combat modules already import useGameStore the other way)
useGameStore.subscribe((s) => {
  // I44 · levelling up should be FELT, not just unlock things. Every general
  // level adds a little to both vitals — a point of vigour every three
  // levels, and a steady trickle of stamina — on top of the perk/talent/
  // attribute bonuses that were already here. (Vigour is one bar with a
  // numeric readout since the UI pack's HUD work; there are no hearts.)
  const total = SKILLS.reduce((t, sk) => t + levelFromXp(s.xp[sk.id] ?? 0), 0);
  combatState.maxStamina = Math.round((100
    + Math.round(total * 1.5)                     // general levels
    + (s.perks.includes('iron_grip') ? 15 : 0)
    + (s.perks.includes('iron_discipline') ? 20 : 0) // Iron Discipline trade-off (Wave 52)
    + (s.skillTree.includes('combat2') ? 10 : 0)  // Second Wind talent
    + (s.attrSpent.courage ?? 0) * 5)             // Courage attribute
    * (s.perks.includes('berserker') ? 0.8 : 1)   // Berserker trade-off: −20%
    * (s.perks.includes('quick_draw') ? 0.85 : 1)); // Quick Draw trade-off: −15% (Wave 52)
  // the trade-off perks above are the first thing in this subscriber that
  // can ever make maxStamina go DOWN (every other term here only adds) — a
  // stamina value left above the new lower ceiling from a stale render would
  // read as a free bonus the perk description didn't promise
  combatState.stamina = Math.min(combatState.stamina, combatState.maxStamina);

  const hpBefore = combatState.maxHp;
  combatState.maxHp = 10 + Math.floor(total / 3);
  // new vigour arrives FULL — earning capacity and finding it empty reads as
  // a dilution of the health you had, which is the opposite of a reward
  if (combatState.maxHp > hpBefore) combatState.hp += combatState.maxHp - hpBefore;
  if (refillVitals) {
    refillVitals = false;
    combatState.hp = combatState.maxHp;
    combatState.stamina = combatState.maxStamina;
  }
});
