// G-04 · the day turning over. Nothing said so before: DayNight.tsx bumped worldEnv.dayCount when the clock wrapped
// past midnight, and a bed (worldSlice's sleep) or a knock-out (combat/playerDamage.ts) set the clock to dawn without
// counting a day at all — sleeping at 21:00 woke you that same morning, the day it already was. Now the clock passing
// midnight, by the frame or by a night's sleep, goes through rollDay(), which counts the day and tells whoever asked
// (onDayRollover) — the outlaws' hideouts (G-15a), new settlers (G-23) and the garrisons (G-24a) — once a day.
//
// A leaf, as sessionHooks.ts is: a module on either side of the game store can register here.
import { worldEnv } from './env';

/** the clock's dawn, where a night's sleep (or a knock-out) wakes you: just before sunrise */
export const DAWN = 0.27;

const hooks: ((day: number) => void)[] = [];

/** call `fn` with the new day's count each time a day turns over; returns the way to stop */
export function onDayRollover(fn: (day: number) => void): () => void {
  hooks.push(fn);
  return () => { const i = hooks.indexOf(fn); if (i >= 0) hooks.splice(i, 1); };
}

/** a day has turned over: count it, and say so */
export function rollDay(): void {
  worldEnv.dayCount += 1;
  for (const fn of [...hooks]) fn(worldEnv.dayCount);
}

/** the clock on to the next dawn — a new day when it passes midnight to get there (it is not yet dawn after it) */
export function wakeAtDawn(): void {
  if (worldEnv.time > DAWN) rollDay();
  worldEnv.time = DAWN;
}
