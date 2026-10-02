'use client';
// CLN-31 · the shared rAF-throttle-poll shape ArenaHud/DungeonStatus/
// BuildChallengePanel/ChallengePanels/FortStatus/OrderStatus each hand-rolled
// (useRef(0) + useEffect + a tick(now) that re-schedules itself, gates on
// now-last.current<intervalMs, and cancels on unmount) — every one of the 6
// reads a plain mutable leaf module (arenaState/dungeonState/etc, not store/
// React state), so they can't just useGameStore a selector. Only the proven-
// identical wrapper is extracted here; each component's own derivation (set a
// derived string, bump a tick counter, run a side effect first) stays exactly
// where it already lives, at its own interval.
import { useEffect, useRef } from 'react';

/** Runs `onTick` at most once every `intervalMs`, driven by
 *  requestAnimationFrame. One rAF loop starts on mount and is cancelled on
 *  unmount; `onTick` itself is left entirely to the caller. `onTick` is read
 *  through a ref updated every render so callers never need useCallback and
 *  can pass a fresh closure each render, same as they do today. */
export function useRafPoll(intervalMs: number, onTick: () => void): void {
  const cb = useRef(onTick);
  cb.current = onTick;
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last.current < intervalMs) return;
      last.current = now;
      cb.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [intervalMs]);
}
