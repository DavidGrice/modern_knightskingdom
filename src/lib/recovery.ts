// F-06 · the recovery writer the error boundaries call when they catch a crash: a no-op but while a game is on the
// screen stack, which sets one (F-08b, game/sessionFlush.ts) that writes a snapshot of the game to the recovery slot
// (lib/save.ts's writeRecoverySave).
// Whatever it writes, it must never write the main save: a crash's state is offered back, never loaded in its place.
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
