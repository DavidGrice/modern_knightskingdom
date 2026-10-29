// CLN-13 · how an enemy moves: its speed (speedOf) and a skeleton's shamble-then-lunge (paceOf); a step along a route
// round what stands in its way (makePathStep) and the pack's flanking turn (flank); a raider's walk in from the road
// (walkIn), a beaten one's flight (breaksAndRuns, flee), an idle one's wander; and after it has moved, the pack
// shouldered apart (shoulderApart), the homestead's pond, water and edge kept to (keepToLand), and a shut gate's way
// barred (stopAtShutGates).
import * as THREE from 'three';
import { useEnemyStore, type EnemyData } from '@/game/combat';
import { useGameStore, type GameState } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { findPath } from '@/game/navgrid';
import { isDoorLike } from '@/game/types';
import { POND, WORLD_HALF } from '@/game/data/world';
import { sizeFor } from '@/game/data/buildables';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { roadSpeedMult } from '@/game/data/road';
import { pushOutOfWater } from '@/game/waterworks';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import type { Mob, Route } from './frame';

/** Cedric's Siege: he breaks and flees at ~20% of his unscaled 45 HP in
 *  every appearance except his own sanctioned final stand — a real fight
 *  first, then he bails, same shape as the bandit morale-break (breaksAndRuns) */
const CEDRIC_FLEE_HP = 9;

/** An enemy's speed, worked out when its figure renders. */
export function speedOf(data: EnemyData): number {
  const baseSpeed =
    data.kind === 'skeleton' ? 2.1
      : data.kind === 'cedric' ? 2.3
      // armored and disciplined — a shade slower than a scrambling bandit
      : data.kind === 'royal' ? 2.4
      // Storm's approach speed climbs with reputation — escalating rematches
      // are about how hard she is to out-time, not extra hit points.
      : data.kind === 'storm' ? 2.6 + Math.min(1.2, (useGameStore.getState().reputation['storm'] ?? 0) * 0.01)
      // Wave 36 (A3): a real horse's pace, not a cosmetic mount — the same
      // 1.9x a mounted DEFENDER already gets over its own on-foot speed
      // (Defenders.tsx), applied to the plain bandit base this donor's
      // war-party slot would otherwise use
      : data.kind === 'mountedRaider' ? 2.7 * 1.9
      : 2.7;
  // requested 2026-08-03: the active arena environment's own enemySpeedMult
  // (game/arena.ts) — read whenever the figure renders, like baseSpeed
  // itself; the environment is fixed for a whole arena run
  return data.arena ? baseSpeed * ARENA_ENV_BY_ID[arenaState.env ?? 'earth'].enemySpeedMult : baseSpeed;
}

/** undead pacing (advanced AI): skeletons shamble at a distance, then
 *  lunge horribly once they're close (`dist`: to whatever they close on) */
export function paceOf(data: EnemyData, speed: number, dist: number): number {
  return data.kind === 'skeleton' ? (dist > 8 ? speed * 0.7 : speed * 1.5) : speed;
}

/** A step along a path to (tx, tz), round structures and through real openings (game/navgrid.ts) — the chase of the
 *  player, and a crossbow raider closing in on a mark he cannot see. The path is recomputed on a timer, and whenever
 *  the mark has moved far enough that the old one is stale; with no route, straight at it. One per frame: the timer
 *  runs down by the frame's `dt` each time it is taken. */
export function makePathStep(path: Route, m: Mob, dt: number) {
  return (tx: number, tz: number) => {
    path.t -= dt;
    const targetMoved = Math.hypot(tx - path.tx, tz - path.tz) > 3;
    if (path.t <= 0 || targetMoved) {
      path.t = 0.7 + Math.random() * 0.4;   // desync the herd
      path.tx = tx;
      path.tz = tz;
      path.pts = findPath(m.x, m.z, tx, tz) ?? [];
      path.i = 0;
    }
    // aim at the next corner if we have one, otherwise straight at the mark
    let aimX = tx;
    let aimZ = tz;
    const pts = path.pts;
    while (path.i < pts.length
      && Math.hypot(pts[path.i].x - m.x, pts[path.i].z - m.z) < 1.1) {
      path.i++;
    }
    if (path.i < pts.length) {
      aimX = pts[path.i].x;
      aimZ = pts[path.i].z;
    }
    const ad = Math.hypot(aimX - m.x, aimZ - m.z) || 1;
    return { nx: (aimX - m.x) / ad, nz: (aimZ - m.z) / ad };
  };
}

/** pack flanking (advanced AI): each enemy closes on its own shoulder
 *  of the target — a fixed per-id flank angle that fades to a direct
 *  line inside ~5m (`d`: to the target), so a group arrives SURROUNDING you
 *  instead of stacking into single file behind the same straight approach */
export function flank(way: { nx: number; nz: number }, id: number, d: number): { nx: number; nz: number } {
  let { nx, nz } = way;
  const flankA = ((id % 7) / 6 - 0.5) * 1.6 * THREE.MathUtils.clamp((d - 5) / 12, 0, 1);
  if (flankA !== 0) {
    const ca = Math.cos(flankA);
    const sa = Math.sin(flankA);
    const fx = nx * ca - nz * sa;
    nz = nx * sa + nz * ca;
    nx = fx;
  }
  return { nx, nz };
}

/** N79 (requested 2026-07-28): a raider spawned at the road's entry point (the raid trigger,
 *  game/directors/raidDirector.ts) walks in toward the homestead first, routed via the same nav-grid pathing the
 *  chase uses, just aimed at HOME_X/HOME_Z instead of the player. Its own route timer, and no re-route on a moving
 *  mark (home does not move) — not makePathStep. */
export function walkIn(m: Mob, path: Route, dt: number, speed: number): void {
  m.state = 'chase';
  path.t -= dt;
  if (path.t <= 0) {
    path.t = 0.7 + Math.random() * 0.4;
    path.pts = findPath(m.x, m.z, HOME_X, HOME_Z) ?? [];
    path.i = 0;
  }
  let aimX = HOME_X, aimZ = HOME_Z;
  const pts = path.pts;
  while (path.i < pts.length
    && Math.hypot(pts[path.i].x - m.x, pts[path.i].z - m.z) < 1.1) {
    path.i++;
  }
  if (path.i < pts.length) { aimX = pts[path.i].x; aimZ = pts[path.i].z; }
  const ad = Math.hypot(aimX - m.x, aimZ - m.z) || 1;
  const nx = (aimX - m.x) / ad;
  const nz = (aimZ - m.z) / ad;
  // Wave 34 (G6.6) · a raider walking in from roadEntry() is exactly
  // the "on the road" case ROAD_SPEED_MULT was made for — the
  // player already gets this boost on the same road, so a raider
  // shouldn't be slower on it just because nobody wired it. The
  // general combat-chase `speed` is deliberately left
  // alone: chasing the player off the road isn't a road-preference
  // scenario.
  const approachSpeed = speed * roadSpeedMult(m.x, m.z);
  m.x += nx * approachSpeed * dt;
  m.z += nz * approachSpeed * dt;
  m.yaw = Math.atan2(-nx, -nz);
}

/** broken morale (advanced AI): a badly wounded bandit loses heart and
 *  breaks for the treeline instead of trading blows to the end — no
 *  kill credit, no loot, they just live to raid another day.
 *  Cedric's Siege: the same escape valve is what keeps every Cedric
 *  appearance OTHER than his sanctioned final stand from being able to
 *  permanently kill him — he trades blows for real, then bails, same as
 *  a bandit, rather than needing a bespoke "can't die here" mechanic of
 *  his own. `finalStand` spawns (the camp duel once cedricFinalStandReady)
 *  are excluded — that is the one fight he does not walk away from. */
export function breaksAndRuns(data: EnemyData, st: GameState): void {
  const m = data.mob;
  if (
    (data.kind === 'bandit' && data.hp <= 2
      || (data.kind === 'cedric' && !data.finalStand && data.hp <= CEDRIC_FLEE_HP))
    && !m.fleeing && !m.elevated
    // Wave 58 (H4): an elevated raider never breaks for the treeline —
    // the flight (step.ts) stands him on the ground under him,
    // which would snap a fleeing wall-top raider straight back to
    // ground height. Simplest correct fix: a raider up a ladder
    // fights it out or dies, it does not flee back down one.
  ) {
    m.fleeing = true;
    st.notify(data.kind === 'cedric' ? 'Cedric the Bull breaks off, sounding the retreat!' : 'A bandit loses heart and flees!');
  }
}

/** The flight: away from the player at a run. Returns how far off the player was — past 44 m, the enemy is gone. */
export function flee(m: Mob, dt: number): number {
  m.state = 'chase'; // run animation
  const away = Math.hypot(m.x - playerState.x, m.z - playerState.z) || 1;
  const nx = (m.x - playerState.x) / away;
  const nz = (m.z - playerState.z) / away;
  m.x += nx * 3.0 * dt;
  m.z += nz * 3.0 * dt;
  m.yaw = Math.atan2(-nx, -nz);
  return away;
}

/** nothing to fight: a slow amble, a new heading every 2–6 s */
export function wander(m: Mob, dt: number): void {
  m.state = 'wander';
  m.wanderT -= dt;
  if (m.wanderT <= 0) {
    m.wanderT = 2 + Math.random() * 4;
    m.yaw = Math.random() * Math.PI * 2;
  }
  m.x += -Math.sin(m.yaw) * 0.7 * dt;
  m.z += -Math.cos(m.yaw) * 0.7 * dt;
}

/** pack separation (AI wave 2): shoulder apart from packmates so a
 *  group closes as a line, not a single stacked column */
export function shoulderApart(data: EnemyData): void {
  const m = data.mob;
  for (const o of useEnemyStore.getState().enemies) {
    if (o.id === data.id || o.mob.state === 'dying') continue;
    const sx = m.x - o.mob.x;
    const sz = m.z - o.mob.z;
    const sd = Math.hypot(sx, sz);
    if (sd > 0.001 && sd < 1.1) {
      m.x += (sx / sd) * (1.1 - sd) * 0.5;
      m.z += (sz / sd) * (1.1 - sd) * 0.5;
    }
  }
}

/** Out of the pond and the player's own waterways, and inside the world's edge — home-only geography (the frame
 *  asks this only of an enemy at home). */
export function keepToLand(m: Mob): void {
  const pd = Math.hypot(m.x - POND.x, m.z - POND.z);
  if (pd < POND.radius + 1) {
    m.x = POND.x + ((m.x - POND.x) / pd) * (POND.radius + 1);
    m.z = POND.z + ((m.z - POND.z) / pd) * (POND.radius + 1);
  }
  // Wave 12 · and out of the player's own waterways, inside the same
  // home-only guard for the same reason. This is what makes a moat a
  // moat: raiders walk in by the road (roadEntry) and a cut across their
  // approach genuinely turns them, rather than being scenery they wade.
  const out = pushOutOfWater(m.x, m.z, 0.6);
  m.x = out.x;
  m.z = out.z;
  m.x = THREE.MathUtils.clamp(m.x, -WORLD_HALF + 2, WORLD_HALF - 2);
  m.z = THREE.MathUtils.clamp(m.z, -WORLD_HALF + 2, WORLD_HALF - 2);
}

/** a shut gate blocks raiders like a wall (the one building type enemies
 *  collide with) — Wave 8: a barred door does the same */
export function stopAtShutGates(m: Mob, st: GameState): void {
  for (const b of st.buildings) {
    if (!isDoorLike(b.type) || (st.gateOpen[b.id] ?? true)) continue;
    const [sx, sz] = sizeFor(b.type, b.rot);
    const hx = sx / 2 + 0.5;
    const hz = sz / 2 + 0.5;
    const dx = m.x - b.x;
    const dz = m.z - b.z;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const px = hx - Math.abs(dx);
      const pz = hz - Math.abs(dz);
      if (px < pz) m.x = b.x + Math.sign(dx || 1) * hx;
      else m.z = b.z + Math.sign(dz || 1) * hz;
    }
  }
}
