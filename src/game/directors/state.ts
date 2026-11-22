// F-01 · the directors' own state: the 1 Hz tick's countdown, the camp guards' and the skeletons' timers, and the
// raid's flag, cooldown and outcome (and, G-03, its plan; G-04, its warning). Module cells, not the Enemies component's refs as they were: the pause menu's
// Options and Stats replace the game screen (App.tsx draws one screen at a time), which unmounted Enemies and, with it,
// a raid under way — back in the game, its raiders were still in the enemy store but nothing resolved them, and back
// within dusk a second raid started on top (ROADMAP.md, BUG-8726). They now start afresh at a session start, as the
// enemy store does (combat/session.ts), and never at a remount.
import { onSessionReset } from '@/game/store/sessionHooks';
import { exposeDebug } from '@/lib/debugHooks';
import { registerMajorEvent } from '@/game/majorEvents';
import type { Counter, Flag } from './types';

export const directorTick: Counter = { current: 0 };
export const campGuardTimer: Counter = { current: 6 };
export const skelTimer: Counter = { current: 6 };
export const raidCooldown: Counter = { current: 0 };
export const raidActive: Flag = { current: false };
/** F-17 · the raid was called off with its raiders still standing — the player knocked out (combat/playerDamage.ts) —
 *  so when raidDirector next finds no raiders it is a raid lost, not one beaten back, and pays nothing */
export const raidLost: Flag = { current: false };
/** G-03 · the raid's own plan, made as its warning sounds (directors/approach.ts): the seed its approach was drawn from
 *  (the day's: approach.ts's raidSeedFor) and the sides it comes at the homestead from, each a bearing in radians from
 *  home (atan2 of z over x) — what the minimap's arrow (G-04) and G-19's informants read; and, G-04, the seconds until
 *  its raiders come (the director's 1 Hz ticks: above 0 while the warning runs, 0 once they have come). No sides: no
 *  raid is coming or on — the sides go when the raid ends, won or lost, and at a session start. */
export const raidPlan: { seed: number; sides: number[]; incoming: number } = { seed: 0, sides: [], incoming: 0 };
/** G-07 · the defenders the home raid's raiders have knocked down so far (enemyAi/blows.ts), by villager id: the raid
 *  report names them beside those its settling puts down (raidSettle.ts) — a garrison fallen away from home is settled
 *  only once none stands, so the settling itself finds no one left to put down. Emptied as each raid comes. */
export const raidDowned = new Set<string>();
/** G-04 · test hook: the next roll for a raid comes up whatever the hour's odds (raidTiming.ts) — still behind the
 *  cooldown, the homestead's gates and any other major event; spent when the warning sounds */
export const raidForce: Flag = { current: false };

export function resetDirectors(): void {
  directorTick.current = 0;
  campGuardTimer.current = 6;
  skelTimer.current = 6;
  raidCooldown.current = 0;
  raidActive.current = false;
  raidLost.current = false;
  raidPlan.seed = 0;
  raidPlan.sides = [];
  raidPlan.incoming = 0;
  raidForce.current = false;
  raidDowned.clear();
}

onSessionReset(resetDirectors);
// G-04 · a raid is a major event (game/majorEvents.ts) from its warning until it ends
registerMajorEvent('raid', () => raidActive.current || raidPlan.incoming > 0);

// test hook (window.__kkdirectors): the directors' own timers and the raid's flags — the cells themselves, so a probe
// reads (and can set) what the next tick will see
exposeDebug('__kkdirectors', { skelTimer, raidCooldown, raidActive, campGuardTimer, raidLost, raidPlan, raidForce });
