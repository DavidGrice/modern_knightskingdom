'use client';
// Wave 7 · Where the couched-LANCE posture actually belongs.
//
// The tourney lance is not a weapon the player owns, crafts or equips: it is
// a prop for exactly one scripted duel — Richard's pass at the Tourney
// Grounds (PlayerController's 'joust' interaction → gameStore.joustRichard,
// a pure numeric outcome that never touches useEnemyStore). Viewmodel.tsx
// nonetheless used to swap to it on `ridingState.active && galloping` alone,
// so ANY mounted player holding Shift saw a couched lance while their sword,
// crossbow or longbow went on firing normally underneath — the pose lied
// about what the click would do, anywhere in the world, Richard or no
// Richard.
//
// Both the prompt and the pose read this module now, so the thing you are
// holding and the thing E offers you can no longer drift apart.
import { NPC_BY_ID, isNpcRevealed } from './data/npcs';
import { INTERACT_RANGE } from './data/world';
import { playerState } from './playerState';
import { ridingState } from './riding';
import { combatState } from './combat';

/** how close E can actually resolve the pass — PlayerController's own
 *  long-standing prompt range, moved here so the pose below can be defined
 *  relative to it instead of guessing at it */
export const JOUST_PROMPT_RANGE = INTERACT_RANGE + 2.5;

/** A charge is couched well BEFORE the pass connects — a rider levels the
 *  lance down the run-up, not on top of their opponent. Comfortably wider
 *  than the prompt range so the posture reads as a charge rather than
 *  snapping on at the last stride, but still short enough that it is
 *  unmistakably about Richard. */
const COUCH_RANGE = 16;

/** the slice of game state that decides whether Richard is standing in front
 *  of you at all — satisfied structurally by the store's own state, so both
 *  callers just hand over the state object they already have. */
export interface JoustContext {
  completedQuests: string[];
  /** template-world id being visited; null = the homestead */
  destination: string | null;
}

// `playerState` is only written near the END of PlayerController's frame,
// after its own prompt pass has already run — so the prompt passes its live
// `pos.current` in explicitly rather than reading a value one frame stale,
// which is exactly what the inline check it replaced did. Everyone else
// (the viewmodel's poll) has nothing better and takes the default.
function distToRichard(st: JoustContext, px: number, pz: number): number | null {
  const richard = NPC_BY_ID['richard'];
  // an unrevealed NPC is not standing anywhere yet — his listed coordinates
  // are where he WILL be, so distance to them means nothing until then
  if (!richard || !isNpcRevealed(richard, st.completedQuests)) return null;
  // …and a revealed one is only STANDING there while you are in his own
  // instance. Richard is a Phase-20 resident of The Tourney Grounds
  // (template-02); his x/z are world-absolute numbers that address a spot on
  // his field and nothing else, so distance to them is meaningless in the
  // homestead, the dungeon, the arena or any other template world. Without
  // this the prompt and the couched lance would both fire off bare
  // coordinates in a world where no Richard is rendered at all — the inline
  // check this module replaced had the same hole. Same residency test
  // PlayerController's own NPC loop and npcs.ts's `scheduledCourtNpcs`
  // already use (`(n.world ?? null) === (destination ?? null)`).
  if ((richard.world ?? null) !== (st.destination ?? null)) return null;
  return Math.hypot(richard.x - px, richard.z - pz);
}

/** in range for E to run the pass at Richard (the prompt's own gate) */
export function atJoustPass(st: JoustContext, px = playerState.x, pz = playerState.z): boolean {
  const d = distToRichard(st, px, pz);
  return d !== null && d < JOUST_PROMPT_RANGE;
}

/** the tourney-lance posture: charging Richard specifically, mounted and at a
 *  gallop. Everywhere else, a mounted player holds whatever they equipped. */
export function couchingTourneyLance(st: JoustContext, px = playerState.x, pz = playerState.z): boolean {
  if (!ridingState.active || !combatState.galloping) return false;
  const d = distToRichard(st, px, pz);
  return d !== null && d < COUCH_RANGE;
}
