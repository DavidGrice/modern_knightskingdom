// NPC_AI_SPEC §2 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §3.2 — resolves an
// Agent's current Intent into real movement. MOVE_TO/MOVE_TO_ANCHOR call
// navSteer and advance position; FACE lerps yaw toward a target without
// moving; IDLE (or no intent) holds. Writes bb.movement — arrival is a
// status flag Activities read (phase 5), never something they poll for by
// reading position directly: §0.1's transform-isolation rule cuts both ways.
//
// This is the actuator, so it is the one place allowed to write
// agent.position/agent.yaw directly — everything upstream of it (the
// reasoner) only ever writes agent.intent.
//
// Phase 8 (§8) makes it the one place that reads `agent.steering`, too. Until
// now that field was assigned per tier and consumed by nothing but the debug
// overlay's own text: a tier-D agent three regions away still paid a full
// navSteer (and, on a MOVE_TO_ANCHOR, an anchor resolve) on EVERY render
// frame, so the LOD system throttled thinking and not moving — the more
// expensive half for an agent that is actually walking somewhere. The three
// modes are now three real cadences, and tier D gets §8's own "jump along its
// path in coarse steps" because it has no renderer to step it at all.

import { getNavGrid, navSteer, type NavAgent } from '@/game/navgrid';
import { LOD, type Tier } from '../config';
import type { Agent } from './Agent';
import { targetRegistry } from './TargetRegistry';
import { resolveAnchor, type ResolvedAnchor } from './AnchorResolution';
import { agentManager, despawnHooks, tierChangeHooks } from './AgentManager';

const WALK_SPEED = 0.9; // m/s — matches Villagers.tsx's existing wander/work pace
const RUN_SPEED = 1.6; // m/s — matches Villagers.tsx's existing raid-flee pace

// Wave 25 verification fix — a companion's own speed cap, kept fully separate
// from WALK_SPEED/RUN_SPEED above. Those two are tuned against OTHER agents
// (a villager's own wander pace / raid-flee pace) and follow_leader/
// assist_leader wrongly inherited them by using the same 'walk'/'run' MOVE_TO
// vocabulary — but the thing a companion actually has to keep pace with is
// the PLAYER (PlayerController.tsx's own base walk 4 m/s / sprint 7 m/s), not
// a fellow NPC, and 1.6 m/s can never catch either: verified live, the follow
// gap grew without bound (5.4 -> 22.6 units over 8s) at exactly 4.0-1.6=2.4
// m/s of net separation. Set with real margin above the player's SPRINT (not
// just the walk), so a companion who falls behind — during combat, while
// downed, or just from a sprint burst — always has a real, bounded path back
// to formation instead of drifting further away every second forever.
const COMPANION_WALK_SPEED = 4.4; // m/s — a hair over the player's own 4 m/s base walk
const COMPANION_RUN_SPEED = 8.5; // m/s — clears the player's own 7 m/s sprint with real margin to close a gap
/** MOVE_TO_ANCHOR has no author-supplied stopDistance (unlike MOVE_TO) —
 *  anchor resolution already decided exactly where to stand, so "arrived"
 *  just needs to be "close enough," not a caller-tunable value. */
const ANCHOR_STOP_DISTANCE = 0.5;
const FACE_TURN_RATE = 8;

// per-agent navSteer path cache, keyed by agent id. navSteer lazily attaches
// its own `.nav` field to whatever object it's given and expects that SAME
// object back on the next call to reuse the cached path — Agent itself
// doesn't carry this, since it's an actuation-internal detail, not decision
// state the reasoner or Blackboard ever needs to see. Mirrors how
// TargetRegistry keeps its own reservations private rather than on the
// Target value objects.
//
// Phase 8 widens it by exactly one field. `banked` is the seconds of dt this
// agent has accumulated since its last steering pass — zero for tier A/B
// (which still steer every frame), the throttle for C and D. It lives on the
// same object as the nav cache rather than in a second Map because the two are
// always read and cleared together (a tier transition has to reset both, or an
// agent resumes a two-second-stale route at full speed).
interface SteerState extends NavAgent {
  banked: number;
}

const steerState = new Map<string, SteerState>();

function steerFor(agent: Agent): SteerState {
  let s = steerState.get(agent.id);
  if (!s) {
    s = { x: agent.position.x, z: agent.position.z, region: agent.region, banked: 0 };
    steerState.set(agent.id, s);
  }
  return s;
}

/** §8's steering column, as a real interval. `full` is 0 — every frame,
 *  byte-identical to every phase before this one. */
function steerIntervalFor(agent: Agent): number {
  if (agent.steering === 'simplified') return LOD.steering.simplifiedInterval;
  if (agent.steering === 'teleport') return LOD.steering.teleportInterval;
  return 0;
}

/** Same fail-open contract `AnchorResolution.resolveAnchor` and phase 7's
 *  `takeCover.gridFor` already document: `getNavGrid` throws for an unknown
 *  region and for the Crypt before a layout exists, and a throw in here would
 *  come out of a render frame or a think tick and take down far more than one
 *  agent. No grid means no walkability opinion — the coarse step is taken
 *  unchecked, which is the pre-phase-8 behaviour, never a crash. */
function gridOrNull(region: string | null) {
  try {
    return getNavGrid(region);
  } catch {
    return null;
  }
}

// Performance pass (2026-07-28): resolveAnchor() was being called every
// single RENDER FRAME for every agent walking to an anchor — 8 trig
// evaluations plus 8 nav-grid walkability samples, to re-derive a point that
// can't actually change mid-approach (the target is stationary; the only
// thing that could invalidate a resolved anchor is the nav grid itself
// changing, e.g. a wall going up). Cached per agent, keyed by targetId, with
// a short TTL rather than "forever" so a newly-obstructed anchor still
// self-heals within a bounded time instead of never re-checking. `age` is
// accumulated from `dt` rather than read off a clock, since Locomotion only
// ever receives a frame's dt, not a timestamp.
const ANCHOR_REFRESH_INTERVAL = 1.5; // seconds
interface AnchorCacheEntry { targetId: string; anchor: ResolvedAnchor; age: number }
const anchorCache = new Map<string, AnchorCacheEntry>();

function anchorFor(agent: Agent, targetId: string, dt: number): ResolvedAnchor | null {
  const entry = anchorCache.get(agent.id);
  if (entry && entry.targetId === targetId) {
    entry.age += dt;
    if (entry.age < ANCHOR_REFRESH_INTERVAL) return entry.anchor;
  }
  const target = targetRegistry.get(targetId);
  if (!target) { anchorCache.delete(agent.id); return null; }
  const anchor = resolveAnchor(target, agent.position.x, agent.position.z);
  if (!anchor) { anchorCache.delete(agent.id); return null; }
  anchorCache.set(agent.id, { targetId, anchor, age: 0 });
  return anchor;
}

/** Drop this agent's steering/anchor state. Without it, a villager who
 *  despawns and respawns repeatedly (e.g. reassigned to 'defender' and back,
 *  per AgentManager.despawn()'s own history) leaks one entry per departure
 *  into both Maps for the rest of the session; neither is otherwise bounded
 *  by anything but active agent count. Registered into AgentManager's own
 *  `despawnHooks` below rather than AgentManager.ts importing this file
 *  directly — that direction turned out to be a real cycle break, not a
 *  safe one (see despawnHooks' own comment in AgentManager.ts for the full
 *  story: confirmed live, a genuine "Cannot access before initialization"
 *  crash on every page load, not a hypothetical risk). This file already
 *  imports AgentManager.ts for `despawnHooks` itself, and Locomotion.ts is a
 *  leaf from gameStore.ts's side — nothing gameStore transitively imports
 *  ever imports this file back — so this direction can't re-close the loop. */
function clearLocomotionState(agentId: string): void {
  steerState.delete(agentId);
  anchorCache.delete(agentId);
}
despawnHooks.push(clearLocomotionState);

function faceToward(agent: Agent, tx: number, tz: number, dt: number): void {
  // yaw -> facing is (-sin, -cos) by this codebase's convention
  // (PlayerController.tsx/combat.ts/Villagers.tsx's own wander branch)
  const desired = Math.atan2(-(tx - agent.position.x), -(tz - agent.position.z));
  let diff = desired - agent.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  agent.yaw += diff * Math.min(1, dt * FACE_TURN_RATE);
}

// Performance pass: this ran up to 4x every frame per moving agent
// (`agent.bb.movement = {status, distRemaining}`) — a fresh object every
// call, for every agent, at full render rate. bb.movement is a stable
// shape (Blackboard.ts) that nothing holds a reference to across a write,
// so mutating its two fields in place is behaviorally identical and
// allocates nothing.
function setMovement(agent: Agent, status: 'moving' | 'arrived' | 'blocked', distRemaining: number): void {
  agent.bb.movement.status = status;
  agent.bb.movement.distRemaining = distRemaining;
}

/** §8's tier-D step: advance `budget` metres ALONG THE CACHED PATH rather than
 *  by integrating the steering direction, and write the result into
 *  agent.position only if it lands somewhere walkable.
 *
 *  Following the polyline matters at this cadence and only at this cadence. A
 *  2 s jump is 1.8-3.2 m, and navSteer's own corner logic advances its
 *  waypoint index once the agent is within 1.1 m of one — so integrating a
 *  direction vector for that long would sail straight past the corner the path
 *  existed to route around and cut through the wall. At tier A/B the same
 *  integration covers 1.5-2.7 CENTIMETRES per frame and the question never
 *  arises, which is why only this branch pays for it.
 *
 *  Returns the metres actually travelled — 0 when the landing point was
 *  blocked and no walkable cell was near enough, which is the honest outcome
 *  for an agent whose route was built over since it was last simulated. */
function jumpAlongPath(agent: Agent, steer: SteerState, nx: number, nz: number, budget: number): number {
  const fromX = agent.position.x;
  const fromZ = agent.position.z;
  let x = fromX;
  let z = fromZ;
  let left = budget;

  const nav = steer.nav;
  if (nav && nav.i < nav.pts.length) {
    let i = nav.i;
    while (left > 0 && i < nav.pts.length) {
      const p = nav.pts[i];
      const d = Math.hypot(p.x - x, p.z - z);
      if (d <= 1e-4) { i++; continue; }
      if (d <= left) { x = p.x; z = p.z; left -= d; i++; continue; }
      const t = left / d;
      x += (p.x - x) * t;
      z += (p.z - z) * t;
      left = 0;
    }
    // The path is consumed from wherever we ended up, so the next jump starts
    // at the right waypoint instead of re-walking the ones already passed.
    nav.i = i;
  }
  // No route at all (navSteer falls back to straight-line steering when
  // findPath returns nothing), or path exhausted with budget to spare: spend
  // the remainder on the raw steering direction, exactly what every other tier
  // does with all of it.
  if (left > 0) { x += nx * left; z += nz * left; }

  const grid = gridOrNull(agent.region);
  if (grid && !grid.isWalkable(x, z)) {
    const open = grid.nearestWalkable(x, z, LOD.steering.reentrySnapCells);
    if (!open) return 0;
    x = open.x;
    z = open.z;
  }
  agent.position.x = x;
  agent.position.z = z;
  return Math.hypot(x - fromX, z - fromZ);
}

/** Advance `agent` one frame per its current Intent. Mutates
 *  agent.position/agent.yaw directly and writes agent.bb.movement; callers
 *  (Villagers.tsx/Npc.tsx, iteration 3.3+) read those back afterward to
 *  mirror their own mob registry entry and Object3D transform — Locomotion
 *  itself knows nothing about either, only the Agent.
 *
 *  Phase 8: stamps `agent.actuatedAt`, which is how `stepUnrenderedAgents`
 *  below tells "nobody is drawing this agent" from "a renderer has it". */
export function stepLocomotion(agent: Agent, dt: number): void {
  agent.actuatedAt = agentManager.now;
  stepAgent(agent, dt);
}

function stepAgent(agent: Agent, dt: number): void {
  const intent = agent.intent;

  if (!intent || intent.type === 'IDLE') {
    setMovement(agent, 'arrived', 0);
    return;
  }

  if (intent.type === 'FACE') {
    faceToward(agent, intent.target.x, intent.target.z, dt);
    setMovement(agent, 'arrived', 0);
    return;
  }

  if (intent.type === 'PLAY_ANIM') {
    // AnimationController's job (iteration 3.5) — Locomotion doesn't touch
    // clips or move the agent for this intent, and leaves movement status
    // as whatever it already was
    return;
  }

  // MOVE_TO / MOVE_TO_ANCHOR — the only expensive branch, and so the only one
  // §8's steering budget applies to. FACE/PLAY_ANIM/IDLE above are a yaw lerp
  // and two field writes; throttling those would buy nothing and would make a
  // distant agent's turn visibly step.
  const steer = steerFor(agent);
  const interval = steerIntervalFor(agent);
  // `step` is the dt this pass actually integrates over — the whole banked
  // amount, not the frame's. That is what keeps average speed identical across
  // all three modes: a tier-C agent covers the same ground per second as a
  // tier-A one, it just gets there in ~7 hops a second instead of 60.
  let step = dt;
  if (interval > 0) {
    steer.banked += dt;
    if (steer.banked < interval) return;
    step = steer.banked;
    steer.banked = 0;
  }

  let tx: number, tz: number, stopDistance: number;
  if (intent.type === 'MOVE_TO') {
    tx = intent.position.x; tz = intent.position.z; stopDistance = intent.stopDistance;
  } else {
    // `step`, not `dt`: the anchor cache's TTL is a real-seconds self-heal
    // window, so it has to age by the time that actually passed since this
    // agent was last steered, not by one frame of it.
    const anchor = anchorFor(agent, intent.targetId, step);
    if (!anchor) {
      setMovement(agent, 'blocked', Infinity);
      return;
    }
    tx = anchor.x; tz = anchor.z; stopDistance = ANCHOR_STOP_DISTANCE;
  }

  steer.x = agent.position.x; steer.z = agent.position.z; steer.region = agent.region;
  // Wave 11 verification · `navSteer` (game/navgrid.ts) calls `getNavGrid`
  // internally and unguarded, which throws for an unknown region and for the
  // Crypt before a layout exists — every sibling grid lookup in this file
  // (`gridOrNull`, used by takeCover.ts/wander.ts too) already fails open for
  // exactly this reason. Unreachable today (every `agentManager.spawn` site
  // hardcodes `region: null`), but the first spawn with a real region — a
  // Wave-4 settlement resident, which wander.ts's own header already
  // anticipates — would throw here every frame inside AiRuntime's useFrame
  // and take the whole scheduler down with it, not just that one agent.
  // Falls back to navSteer's own documented no-route behavior (steer
  // straight at the target) rather than a bare early return, so a caller
  // still gets a real direction and doesn't stall in place.
  let nx: number, nz: number, dist: number;
  try {
    ({ nx, nz, dist } = navSteer(steer, tx, tz, step));
  } catch {
    const gdx = tx - steer.x, gdz = tz - steer.z;
    dist = Math.hypot(gdx, gdz);
    const inv = dist || 1;
    nx = gdx / inv; nz = gdz / inv;
  }

  if (dist < stopDistance) {
    setMovement(agent, 'arrived', dist);
    return;
  }

  // Wave 10 · a WALK is a work trip's travel leg, so it scales with the same
  // trip-duration multiplier the pre-AI flat timer already used (bb.
  // tripSpeedMult, live-read in Agent.think from tripSpeedMult()/
  // tripTraitMult()). Divided, not multiplied: that value is a DURATION
  // multiplier (0.55 = "this trip takes 55% as long"), so the speed it implies
  // is its reciprocal.
  //
  // A RUN is deliberately left alone. RUN_SPEED only ever carries a flee
  // (flee.ts is the sole 'run' intent in the codebase), and Diligence/trade
  // mastery are work stats — a diligent villager works faster, they do not
  // panic faster. The walk is also capped AT the run pace: the theoretical
  // best multiplier (0.55 × 0.88 = 0.484) would otherwise put a walking
  // villager at 1.86 m/s, above the run, which reads as skating rather than
  // as brisk. The cap only binds for a near-maxed veteran; every ordinary
  // villager lands well under it.
  const mult = agent.bb.tripSpeedMult > 0 ? agent.bb.tripSpeedMult : 1;
  // Wave 25 verification fix — the companion archetype gets its own, much
  // higher cap (see this file's own comment on COMPANION_RUN_SPEED above)
  // instead of the villager-tuned WALK_SPEED/RUN_SPEED pair. tripSpeedMult is
  // a villager work-trip mechanic (Agent.think's own live read) that never
  // applies to a companion, so it's simply skipped on this branch rather than
  // folded in for a value that can never be anything but 1.
  const speed = agent.archetype === 'companion'
    ? (intent.speed === 'run' ? COMPANION_RUN_SPEED : COMPANION_WALK_SPEED)
    : intent.speed === 'run' ? RUN_SPEED : Math.min(WALK_SPEED / mult, RUN_SPEED);

  if (agent.steering === 'teleport') {
    // §8, verbatim: "jump along their path in coarse steps". Capped so a long
    // banked dt — a backgrounded tab, a tier flip, a paused game — can never
    // become one enormous hop; the honest worst case (RUN_SPEED for a whole
    // teleportInterval) sits comfortably under the cap, so it only ever bites
    // on the pathological frame it exists for.
    // Also clamped to the straight-line distance remaining, which is what
    // makes a coarse step unable to OVERSHOOT: a real path is never shorter
    // than the straight line, so `dist` metres along it always lands at or
    // before the goal. Without this an agent 1 m out with 3 m of budget would
    // sail past, turn round on the next jump, and oscillate about its target
    // forever — the failure mode that only appears once a step is metres
    // rather than centimetres.
    const cap = LOD.steering.teleportMaxStep;
    let budget = speed * step;
    if (budget > cap) budget = cap;
    if (budget > dist) budget = dist;
    const moved = jumpAlongPath(agent, steer, nx, nz, budget);
    // No turn rate: there is nobody watching a tier-D agent turn, and lerping
    // a yaw at 0.5 Hz would leave it facing its previous heading for two full
    // seconds after a corner — visible for exactly one frame on re-entry,
    // which is the one frame that matters.
    if (moved > 0) agent.yaw = Math.atan2(-nx, -nz);
    // recomputed, not `dist` — that was measured before the jump, and at this
    // step size the difference is metres, which is exactly the scale an
    // Activity's own arrival logic reads
    setMovement(
      agent,
      moved > 0 ? 'moving' : 'blocked',
      Math.hypot(tx - agent.position.x, tz - agent.position.z),
    );
    return;
  }

  agent.position.x += nx * speed * step;
  agent.position.z += nz * speed * step;
  // face the steering direction, not the target itself — the same
  // (-nx, -nz) formula every branch in Villagers.tsx's own cascade already
  // uses, so a mid-detour agent turns to face where it is actually walking
  let diff = Math.atan2(-nx, -nz) - agent.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  agent.yaw += diff * Math.min(1, step * FACE_TURN_RATE);
  setMovement(agent, 'moving', dist);
}

// --- §8: the agents nobody is drawing ---------------------------------------

/** How many agents the last sweep actually coarse-stepped (§9's overlay). A
 *  module-level counter rather than a return value: `AiRuntime`'s useFrame has
 *  no use for it and the overlay is not on the call path. */
export let coarseSteppedLastFrame = 0;

/** Phase 8 — step every agent that has an Intent and no renderer to act on it.
 *
 *  This is the piece §8 needs that nothing else could supply. Locomotion runs
 *  from `Villagers.tsx`/`Npc.tsx`, which only mount a figure for the world the
 *  player is actually in — so the moment the player steps through a portal,
 *  every home villager becomes tier D AND loses the only thing that was
 *  calling `stepLocomotion` for them. Before this, they simply froze: a
 *  villager caught mid-`haul_to_deposit` held that MOVE_TO, unmoving, for as
 *  long as the trip lasted, and resumed it on return as if no time had passed.
 *  §8's "advance along their path in coarse steps" is the fix, and it needs a
 *  caller that isn't a renderer. `AiRuntime`'s single useFrame is it.
 *
 *  Restricted to `teleport` (tier D) on purpose: every other tier is, by
 *  definition, in the player's own region, where a renderer IS mounted. The
 *  `actuatedAt` guard is belt and braces on top of that — `rosterSync` spawns
 *  every villager Agent with `region: null` regardless of the villager's own
 *  `world`, so a Wave-4 settlement resident can be rendered in their own world
 *  and tiered D at the same time. A timestamp check is robust against that
 *  (and against R3F's callback ordering, which rosterSync's own header
 *  documents as genuinely not fixed) in a way that reasoning from the tier
 *  alone is not: if anything drove this agent in the last `rendererStaleSec`,
 *  it is not this sweep's problem. */
export function stepUnrenderedAgents(dt: number): void {
  // the same clamp AgentManager.update applies to its own clock, so banked dt
  // and the AI clock can't drift apart across one long frame
  if (dt > 0.05) dt = 0.05;
  const agents = agentManager.agents;
  const now = agentManager.now;
  const stale = LOD.steering.rendererStaleSec;
  let stepped = 0;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.steering !== 'teleport') continue;
    if (a.actuatedAt >= 0 && now - a.actuatedAt < stale) continue;
    if (!a.intent) continue;
    stepAgent(a, dt);
    stepped++;
  }
  coarseSteppedLastFrame = stepped;
}

/** §8: "When a tier-D agent re-enters view, snap it to the nearest valid
 *  navmesh point and resume normally."
 *
 *  Both halves are real. The snap covers the one case coarse stepping cannot
 *  prevent — the player builds a wall across the meadow while an off-region
 *  villager is standing where it now goes, so the position that was walkable
 *  when it was written no longer is. Resuming normally is the second half and
 *  is the one that would actually be noticed: the cached route is up to
 *  `teleportInterval` old and was solved for a 0.5 Hz walker, so handing it
 *  straight to full 60 Hz steering makes the agent sprint the stale leg before
 *  navSteer's own repath timer gets round to it. Dropping the cache costs one
 *  findPath on the next frame and removes the whole class of problem.
 *
 *  Registered at module scope, exactly like `clearLocomotionState` below and
 *  for the same dependency-direction reason (see `tierChangeHooks` in
 *  AgentManager.ts). */
function onTierChange(agent: Agent, from: Tier, to: Tier): void {
  const state = steerState.get(agent.id);
  // Any tier change invalidates banked dt: it was accumulated against the old
  // cadence, and carrying it across (say) D -> A would spend two seconds of
  // travel on the first frame at the new tier.
  if (state) state.banked = 0;
  if (from !== 'D' || to === 'D') return;

  if (state) state.nav = undefined;
  anchorCache.delete(agent.id);

  const grid = gridOrNull(agent.region);
  if (!grid || grid.isWalkable(agent.position.x, agent.position.z)) return;
  const open = grid.nearestWalkable(agent.position.x, agent.position.z, LOD.steering.reentrySnapCells);
  if (!open) return;
  agent.position.x = open.x;
  agent.position.z = open.z;
}
tierChangeHooks.push(onTierChange);

if (typeof window !== 'undefined') {
  // debug/test only — FACE isn't routed through any renderer's splice yet
  // (iteration 3.3 only diverts MOVE_TO/MOVE_TO_ANCHOR; see Villagers.tsx's
  // own comment on why), so this is the only way to exercise it directly
  // against a real Agent right now.
  (window as unknown as Record<string, unknown>).__kkloco = { stepLocomotion };
}
