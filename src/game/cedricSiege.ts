'use client';
// Cedric's Siege: the gates that decide when Cedric's homestead siege can
// roll, when the existing camp-duel trigger has earned the right to become
// his real final stand instead of one more fight he walks away from (see
// combat.ts's `finalStand` flag and Enemies.tsx's flee-guard), and — Wave 38
// (A1) — when a jailed Cedric has served enough time to break free for a
// scaling rematch (`cedricJailbreakAllowed` below; see gameStore.ts's
// freeCedric/markCedricDefeated for what "jailed" now actually means).
//
// Leaf module, same role as raiderRam.ts / difficulty.ts's own consumers:
// reads the store one-directionally, nothing in the store imports this, so
// there is no cycle.
import { useGameStore } from './store/gameStore';
import { useEnemyStore } from './combat';
import { CEDRIC_CAMP, CEDRIC_REVEAL_QUEST } from './data/world';
import { CEDRIC_SIEGE_TIER, difficultyState } from './difficulty';

// gameStore does not export its state interface — derive the type instead,
// the same trade difficulty.ts itself already made for the same reason.
type GameState = ReturnType<typeof useGameStore.getState>;

/** camp revealed, currently at large (not jailed — see freeCedric below for
 *  how he gets back out), and not his own sworn ally — the shared condition
 *  every Cedric-arc gate below builds on */
export function cedricArcEligible(st: GameState): boolean {
  return st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric && st.alliance !== 'cedric';
}

/** may tonight's roll bring his war party down on the homestead at all? */
export function cedricSiegeAllowed(st: GameState): boolean {
  return cedricArcEligible(st) && difficultyState.tier >= CEDRIC_SIEGE_TIER;
}

/** Wave 38 (A1): once jailed, how many in-game days must pass before he can
 *  break free for a rematch — long enough that recapture reads as a real
 *  event, not something rolled for again the very next night. */
export const CEDRIC_JAILBREAK_COOLDOWN_DAYS = 3;

/** may tonight's roll spring him from his cell? Requires him currently being
 *  IN custody (`defeatedCedric`, which Wave 38 repurposes from "permanently
 *  dead" to "currently jailed" — see gameStore.ts's freeCedric/
 *  markCedricDefeated) and the cooldown since his capture having elapsed. */
export function cedricJailbreakAllowed(st: GameState): boolean {
  return st.defeatedCedric && st.dayCount - st.cedricCapturedAtDay >= CEDRIC_JAILBREAK_COOLDOWN_DAYS;
}

/** cross-component signalling, same pattern as dragonAir/raiderRamState */
export const cedricWarState = {
  active: false,        // the homestead siege is running
  finalStandActive: false, // the final stand is running
  reinforced: false,    // final stand's one-time wave-2 already spawned
};

/** may the camp duel become the real final stand? Requires having survived
 *  at least one homestead siege first — the direct expression of "vanquished
 *  here is not his final stand; that comes on his own map" — and that no
 *  homestead siege is currently in progress (never two active Cedric
 *  encounters at once). `cedricSieges` is a lifetime counter, so a jailbreak
 *  rematch does not re-require weathering another siege — Wave 38's own
 *  disclosed simplification versus his original one-time pacing. */
export function cedricFinalStandReady(st: GameState): boolean {
  return cedricArcEligible(st) && st.cedricSieges >= 1 && !cedricWarState.active;
}

/** Spawn Cedric for the camp duel — the ordinary skirmish he still walks
 *  away from, or (once cedricFinalStandReady) the real final stand with its
 *  own escort. Shared by both places that trigger the duel (PlayerController's
 *  direct-spawn branch, Panels.tsx's ParleyPanel) so they can't drift apart.
 *  Returns whether this spawn was the final stand, for the caller's own
 *  flavor text. */
export function startCedricDuel(st: GameState): boolean {
  const finalStand = cedricFinalStandReady(st);
  useEnemyStore.getState().spawn('cedric', CEDRIC_CAMP.x, CEDRIC_CAMP.z + 1.5, false, undefined, false, finalStand);
  if (finalStand) {
    cedricWarState.finalStandActive = true;
    cedricWarState.reinforced = false;
    useEnemyStore.getState().spawn('gilbert', CEDRIC_CAMP.x + 2, CEDRIC_CAMP.z - 1, false);
    useEnemyStore.getState().spawn('bandit', CEDRIC_CAMP.x - 2, CEDRIC_CAMP.z - 1.5, false);
  }
  return finalStand;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkCedricWar = cedricWarState;
}
