// CLN-20 · the hold-the-plot core that Defend the Plot (challengeModes.ts) and the settlement raid
// (settlementRaid.ts) each had written out, statement for statement but for the raid's two own touches (it may have
// no kinds to draw from, and it computes its live cap — both parameters here): count this ground's live hostiles, run
// the spawn timer down, walk at most one more in on the ring, let every hostile near the claim chip the plot, and say
// how the frame left it.
//
// ONLY the core. What comes before it (leaving the ground, a missing claim, a missing destId) and what a loss or a
// win does differ between the two — Defend's missing-claim branch does not clear the ground and the raid's does,
// leaving Defend is silent and leaving a raid is a loss, Defend pays gold 0 / xp 0 unconditionally while the raid
// pays through the store — so each caller keeps those, in its own order, and only asks this for the verdict.
//
// No store import: the game store reaches this module through settlementRaid.ts, and the enemy store imports the
// game store, so either would close a cycle. The enemy store comes in as `deps` (the shell component builds them),
// and is read at the points the frame loops read it.
import type { EnemyKind } from './data/enemies';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import { pick } from '@/lib/rng';
import { ringPoint } from './spawnUtil';

/** what the runner rules read of a hostile — structural, so this stays clear of the enemy store's own module */
export interface WaveEnemy {
  world: string | null;
  arena?: boolean;
  mob: { x: number; z: number };
}

/** The enemy store as the runner rules use it, handed in by the shell component. Each member calls
 *  `useEnemyStore.getState()` when IT is called, so a rule takes its snapshot where its frame loop did. (For `spawn`
 *  that is after the call's arguments have been evaluated, where the inline calls read the store before them; the
 *  arguments draw random numbers and read the arena's record, never the enemy store, so nothing can tell.) */
export interface EnemyDeps {
  /** the enemies array as it stands right now (a snapshot: `spawn` replaces the array, it does not grow this one) */
  enemies: () => readonly WaveEnemy[];
  /** the enemy store's own `spawn`, argument for argument */
  spawn: (
    kind: EnemyKind, x: number, z: number, raid?: boolean, dungeonRoom?: number,
    approaching?: boolean, finalStand?: boolean, extraScale?: number, arena?: boolean,
    worldOverride?: string | null,
  ) => void;
  removeByWorld: (world: string | null) => void;
}

/** what differs between the two users of the core */
export interface WaveDefenseParams {
  /** the kinds a wave is drawn from; null (the raid, once the player has drifted back to Unsworn) spawns nothing
   *  while the timer still runs down */
  kinds: readonly EnemyKind[] | null;
  /** no spawn while this many of the ground's hostiles are live (dying ones count: there is no state filter) */
  maxLive: number;
  /** seconds the timer is SET to after a spawn */
  intervalS: number;
  drainPerSec: number;
  /** a hostile closer to the claim than this chips the plot */
  proximityRadius: number;
}

export type WaveDefenseOutcome = 'lost' | 'won' | 'running';

/** One frame of holding a plot. `run.spawnTimer` belongs to the caller's shell component (it must die with the
 *  component); `rec` is the mechanic's own module record, mutated in place; `dt` is the RAW frame delta — no clamp, a
 *  long frame drains the plot and the timer by all of it; `now` is the frame's one clock read.
 *
 *  The order is the behaviour:
 *  - ONE enemies snapshot, taken before the spawn, serves both the live count and the drain — a hostile walked in
 *    this frame is not in it, so it cannot chip the plot on its spawn frame;
 *  - the timer is decremented before the spawn test and, on a spawn, ASSIGNED the interval (not incremented): it goes
 *    on falling below zero while the live cap blocks it, so a spawn fires on the first frame the count drops;
 *  - the kind is drawn before the angle;
 *  - every hostile within reach drains separately (they stack);
 *  - the plot falling is tested BEFORE the deadline: 0 HP on the last frame is a loss.
 *  The caller acts on the verdict; nothing here deactivates the record or clears the ground.
 *
 *  `destId` must have a record in WORLD_DESTINATION_BY_ID — every ground that can host either fight has one. There
 *  is no guard, as there never was: without a record the spawn throws. (The one known difference from the frame
 *  loops this came out of: they threw on the radius, after drawing the angle; this throws on the ring's arguments,
 *  before that draw.) */
export function tickWaveDefense(
  run: { spawnTimer: number },
  rec: { plotHp: number; deadline: number },
  destId: string,
  claim: { x: number; z: number },
  dt: number,
  now: number,
  p: WaveDefenseParams,
  deps: EnemyDeps,
): WaveDefenseOutcome {
  const enemies = deps.enemies();
  const live = enemies.filter((e) => e.world === destId).length;
  run.spawnTimer -= dt;
  if (p.kinds && run.spawnTimer <= 0 && live < p.maxLive) {
    run.spawnTimer = p.intervalS;
    const dest = WORLD_DESTINATION_BY_ID[destId];
    const kind = pick(p.kinds);
    const at = ringPoint(dest.origin.x, dest.origin.z, dest.radius * 0.85);
    deps.spawn(kind, at.x, at.z, false, undefined, false, false, 1, false, destId);
  }
  for (const e of enemies) {
    if (e.world !== destId) continue;
    if (Math.hypot(e.mob.x - claim.x, e.mob.z - claim.z) < p.proximityRadius) {
      rec.plotHp -= p.drainPerSec * dt;
    }
  }
  if (rec.plotHp <= 0) return 'lost';
  if (now >= rec.deadline) return 'won';
  return 'running';
}
