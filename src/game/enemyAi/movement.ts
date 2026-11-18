// CLN-13 · how an enemy moves: its speed (speedOf) and a skeleton's shamble-then-lunge (paceOf); a step along a route
// round what stands in its way (makePathStep) and the pack's flanking turn (flank); a raider's walk in from the road
// (walkIn, to his own point on his raid's side: G-03), a beaten one's flight (breaksAndRuns, flee) — G-06: a raider's
// at home by the road and off the map (escape) — an idle one's wander; and after it has moved, the pack shouldered apart (shoulderApart), the homestead's pond, water and edge kept
// to (keepToLand), and a shut gate's way barred (stopAtShutGates), and the keep's walls' (stopAtKeepWalls). And (G-03)
// how many routes the raiders at home may work out in one frame (newRouteFrame).
import * as THREE from 'three';
import { useEnemyStore, type EnemyData } from '@/game/combat';
import { useGameStore, type GameState } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { findPath, navReachable, steerRound, HOME_NAV_CELLS } from '@/game/navgrid';
import { keepSolids, pushOutOfBox } from '@/game/fixedSolids';
import { isBuilt, isDoorLike } from '@/game/types';
import { POND, WORLD_HALF } from '@/game/data/world';
import { sizeFor } from '@/game/data/buildables';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { roadEntry, roadEntryOut, roadSpeedMult } from '@/game/data/road';
import { pushOutOfWater } from '@/game/waterworks';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import { siegeWay } from './targeting';
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

/** G-03 · how many routes the raiders at home (makePathStep's `siege`) may work out in one frame between them. Each may
 *  search the whole grid (HOME_NAV_CELLS) — a long way round a ring of walls took 7-8 ms — and several raiders' timers
 *  running out on one frame stacked them; one over the count keeps his route and asks again the next frame. */
export const ROUTES_PER_FRAME = 2;
const routes = { left: Infinity };
/** A new frame's count of routes (Enemies.tsx's frame, once a frame); until a frame has given one, none is counted. */
export function newRouteFrame(count = ROUTES_PER_FRAME): void {
  routes.left = count;
}

/** A step along a path to (tx, tz), round structures and through real openings (game/navgrid.ts) — the chase of the
 *  player, a crossbow raider closing in on a mark he cannot see, and a raider's on a mark inside the keep's walls. The
 *  path is recomputed on a timer, and whenever the mark has moved far enough that the old one is stale; with no route,
 *  straight at it — unless `siege` (a raider at home) and the mark is shut off from him, in the keep or out of it, or
 *  behind the player's own walls: then the way to the piece he is to batter (targeting.ts's siegeWay), noted on the
 *  route. Shut off is the grid's to say (navReachable), not the search's: that gives up at its cap, and from far off
 *  the way round a standing ring to its open gate is longer than the cap — so a raider at home with a way searches for
 *  it to the end, the grid's whole count of cells (G-03: it was no cap at all), and no more than ROUTES_PER_FRAME of
 *  them in a frame. One per frame: the timer runs down by the frame's `dt` each time it is taken. */
export function makePathStep(path: Route, m: Mob, dt: number, siege = false) {
  return (tx: number, tz: number) => {
    path.t -= dt;
    const targetMoved = Math.hypot(tx - path.tx, tz - path.tz) > 3;
    if ((path.t <= 0 || targetMoved) && (!siege || routes.left-- > 0)) {
      path.t = 0.7 + Math.random() * 0.4;   // desync the herd
      path.tx = tx;
      path.tz = tz;
      const noWay = siege && !navReachable(m.x, m.z, tx, tz);
      const found = noWay ? null : findPath(m.x, m.z, tx, tz, siege ? HOME_NAV_CELLS : undefined);
      const shutOut = noWay ? siegeWay(useGameStore.getState(), m.x, m.z, tx, tz) : null;
      path.pts = found ?? shutOut ?? [];
      path.siege = !!shutOut;
      path.noWay = noWay && !shutOut;
      path.i = 0;
    }
    // aim at the next corner if we have one, otherwise straight at the mark — but a siege route's last point, the
    // ground he batters from, is walked to, never passed: shut in the bailey, his mark is behind him, and aiming at it
    // from 1.1 m short turned him back from the gatehouse every time (G-03)
    let aimX = tx;
    let aimZ = tz;
    const pts = path.pts;
    const end = path.siege ? pts.length - 1 : pts.length;
    while (path.i < end
      && Math.hypot(pts[path.i].x - m.x, pts[path.i].z - m.z) < 1.1) {
      path.i++;
    }
    if (path.i < pts.length) {
      aimX = pts[path.i].x;
      aimZ = pts[path.i].z;
    }
    const ad = Math.hypot(aimX - m.x, aimZ - m.z) || 1;
    // round the trees and rocks on the way, which the path does not know (nav/steering.ts)
    const { nx, nz } = steerRound(null, m.x, m.z, (aimX - m.x) / ad, (aimZ - m.z) / ad, tx, tz);
    return { nx, nz };
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
 *  chase uses. G-03 · to his own point on his raid's side of home (`approachX/Z`, directors/approach.ts), or with none
 *  to home's middle; and by makePathStep's way, a raider's (`besieger`) searched to the end: a raider whose way in was
 *  longer than the search's cap walked straight on, and since wave 69 the keep's walls stop him. */
export function walkIn(m: Mob, path: Route, dt: number, speed: number, besieger: boolean): void {
  m.state = 'chase';
  const { nx, nz } = makePathStep(path, m, dt, besieger)(m.approachX ?? HOME_X, m.approachZ ?? HOME_Z);
  // his point shut off from him since it was given (a gate shut round it): he walks in as a raider with none does,
  // rather than batter his way to a spot on the grass
  if (path.siege && m.approachX !== undefined) m.approachX = m.approachZ = undefined;
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

/** G-03 · how near his own approach point a raider walking in has to come to have walked in */
const APPROACH_REACHED = 2.5;
/** Whether an enemy walking in has done (walkIn), the player `d` off: at his own approach point (G-03), or the player
 *  within the 26 m he notices him at and further out from home's middle than that point — so that a raider makes for
 *  his side of home past a player waiting in the middle of it, but turns on one who meets him on his way; with no
 *  point, the player within 26 m or he within 30 m of home's middle, as every raider's walk in used to end. */
export function walkedIn(m: Mob, d: number): boolean {
  if (m.approachX === undefined || m.approachZ === undefined) return d < 26 || Math.hypot(m.x - HOME_X, m.z - HOME_Z) < 30;
  if (Math.hypot(m.x - m.approachX, m.z - m.approachZ) < APPROACH_REACHED) return true;
  return d < 26 && Math.hypot(playerState.x - HOME_X, playerState.z - HOME_Z) > Math.hypot(m.approachX - HOME_X, m.approachZ - HOME_Z);
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

/** how fast a beaten enemy runs */
const FLEE_SPEED = 3.0;
/** how far past the player a fleeing enemy with nothing of the player's on him is gone (flee; step.ts) */
export const FLEE_GONE = 44;

/** The flight: away from the player at a run. Returns how far off the player was — past FLEE_GONE, the enemy is gone. */
export function flee(m: Mob, dt: number): number {
  m.state = 'chase'; // run animation
  const away = Math.hypot(m.x - playerState.x, m.z - playerState.z) || 1;
  const nx = (m.x - playerState.x) / away;
  const nz = (m.z - playerState.z) / away;
  m.x += nx * FLEE_SPEED * dt;
  m.z += nz * FLEE_SPEED * dt;
  m.yaw = Math.atan2(-nx, -nz);
  return away;
}

/** G-06 · how far in from the world's edge (WORLD_HALF) a raider running off the map is gone; he runs for a point a
 *  little further out (roadExit), so that he always crosses it */
const EDGE_GONE = 4;
const EXIT_IN = 2;

/** G-06 · where the road runs off the map: on from its entry (roadEntry) the way it leaves (roadEntryOut) to the
 *  world's edge */
export function roadExit(): { x: number; z: number } {
  const e = roadEntry();
  const o = roadEntryOut();
  const edge = WORLD_HALF - EXIT_IN;
  const to = (p: number, u: number) => (u === 0 ? Infinity : ((u > 0 ? edge : -edge) - p) / u);
  const t = Math.min(to(e.x, o.x), to(e.z, o.z));
  return { x: e.x + o.x * t, z: e.z + o.z * t };
}

/** G-06 · A raider's flight at home: by a way (makePathStep's, a raider's — shut in, a siege way out to batter: the
 *  frame does the battering) to the road's entry, and on along the road off the map (roadExit) — never straight away
 *  from the player, which ran one shut in the keep against its wall for good, and never gone by the player's distance
 *  alone, so that a thief can always be run down. The way out is worked out first, every frame of the flight, and
 *  `out` says whether the route he holds is it: a raider who breaks while battering his way IN still holds that siege
 *  way until his way out is worked out (his route's own target, ROUTES_PER_FRAME spent), and battering on it, he broke
 *  the gate open as he fled. Then `run` takes the step, and says whether he has reached the world's edge, where he is
 *  gone. */
export function escape(m: Mob, path: Route, dt: number): { out: boolean; run: () => boolean } {
  m.state = 'chase'; // run animation
  const entry = roadEntry();
  if (!m.pastEntry && Math.hypot(m.x - entry.x, m.z - entry.z) < APPROACH_REACHED) m.pastEntry = true;
  const to = m.pastEntry ? roadExit() : entry;
  const { nx, nz } = makePathStep(path, m, dt, true)(to.x, to.z);
  return {
    out: path.tx === to.x && path.tz === to.z,
    run: () => {
      m.x += nx * FLEE_SPEED * dt;
      m.z += nz * FLEE_SPEED * dt;
      m.yaw = Math.atan2(-nx, -nz);
      return Math.max(Math.abs(m.x), Math.abs(m.z)) >= WORLD_HALF - EDGE_GONE;
    },
  };
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

/** G-02 · the keep's walls stop an enemy at home as they stop the player (fixedSolids.ts's keepSolids): put back out of
 *  each piece standing by half a metre, as from a shut gate — except one up on a wall-walk, who stands on it */
export function stopAtKeepWalls(m: Mob): void {
  if (m.elevated) return;
  for (const s of keepSolids(null)) {
    const out = pushOutOfBox(s, m.x, m.z, 0.5);
    if (!out) continue;
    m.x = out.x;
    m.z = out.z;
  }
}

/** a shut gate blocks raiders like a wall (the one building type enemies
 *  collide with) — Wave 8: a barred door does the same. G-03 · a gate in the
 *  enemy's own world (`world`): every world's were read, so an enemy at a
 *  destination was stopped by a home gate at the same coordinates; and a
 *  finished one only, as the player and the nav grid have it — a gate
 *  battered to a ruin keeps its shut gateOpen, and held the raiders out of
 *  the breach they had made */
export function stopAtShutGates(m: Mob, st: GameState, world: string | null): void {
  for (const b of st.buildings) {
    if (!isDoorLike(b.type) || !isBuilt(b) || (st.gateOpen[b.id] ?? true) || (b.world ?? null) !== world) continue;
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
