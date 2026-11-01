// F-01 · the directors' own state: the 1 Hz tick's countdown, the camp guards' and the skeletons' timers, and the
// raid's flag, cooldown and outcome. Module cells, not the Enemies component's refs as they were: the pause menu's
// Options and Stats replace the game screen (App.tsx draws one screen at a time), which unmounted Enemies and, with it,
// a raid under way — back in the game, its raiders were still in the enemy store but nothing resolved them, and back
// within dusk a second raid started on top (ROADMAP.md, BUG-8726). They now start afresh at a session start, as the
// enemy store does (combat/session.ts), and never at a remount.
import { onSessionReset } from '@/game/store/sessionHooks';
import { exposeDebug } from '@/lib/debugHooks';
import type { Counter, Flag } from './types';

export const directorTick: Counter = { current: 0 };
export const campGuardTimer: Counter = { current: 6 };
export const skelTimer: Counter = { current: 6 };
export const raidCooldown: Counter = { current: 0 };
export const raidActive: Flag = { current: false };
/** F-17 · the raid was called off with its raiders still standing — the player knocked out (combat/playerDamage.ts) —
 *  so when raidDirector next finds no raiders it is a raid lost, not one beaten back, and pays nothing */
export const raidLost: Flag = { current: false };

export function resetDirectors(): void {
  directorTick.current = 0;
  campGuardTimer.current = 6;
  skelTimer.current = 6;
  raidCooldown.current = 0;
  raidActive.current = false;
  raidLost.current = false;
}

onSessionReset(resetDirectors);

// test hook (window.__kkdirectors): the directors' own timers and the raid's flags — the cells themselves, so a probe
// reads (and can set) what the next tick will see
exposeDebug('__kkdirectors', { skelTimer, raidCooldown, raidActive, campGuardTimer, raidLost });
