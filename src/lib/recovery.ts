// F-06 · the recovery writer the error boundaries call when they catch a crash: a no-op until F-08b (FEATURE_PLAN.md,
// wave 63.3) sets one that writes a snapshot of the game to a recovery slot of its own. Whatever it writes, it must
// never write the main save (lib/save.ts's keys): a crash's state is offered back, never loaded in its place.
let writer: () => void = () => {};

export function setRecoveryWriter(w: () => void): void {
  writer = w;
}

/** called by a boundary as it catches; a writer that throws is passed over (the crash is already being handled) */
export function writeRecovery(): void {
  try {
    writer();
  } catch {
    // nothing to do: the boundary's own fallback stands
  }
}
