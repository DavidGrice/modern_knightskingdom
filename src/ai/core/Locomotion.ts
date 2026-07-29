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

import { navSteer, type NavAgent } from '@/game/navgrid';
import type { Agent } from './Agent';
import { targetRegistry } from './TargetRegistry';
import { resolveAnchor, type ResolvedAnchor } from './AnchorResolution';
import { despawnHooks } from './AgentManager';

const WALK_SPEED = 0.9; // m/s — matches Villagers.tsx's existing wander/work pace
const RUN_SPEED = 1.6; // m/s — matches Villagers.tsx's existing raid-flee pace
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
const steerState = new Map<string, NavAgent>();

function steerFor(agent: Agent): NavAgent {
  let s = steerState.get(agent.id);
  if (!s) {
    s = { x: agent.position.x, z: agent.position.z, region: agent.region };
    steerState.set(agent.id, s);
  }
  return s;
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

/** Advance `agent` one frame per its current Intent. Mutates
 *  agent.position/agent.yaw directly and writes agent.bb.movement; callers
 *  (Villagers.tsx/Npc.tsx, iteration 3.3+) read those back afterward to
 *  mirror their own mob registry entry and Object3D transform — Locomotion
 *  itself knows nothing about either, only the Agent. */
export function stepLocomotion(agent: Agent, dt: number): void {
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

  // MOVE_TO / MOVE_TO_ANCHOR
  let tx: number, tz: number, stopDistance: number;
  if (intent.type === 'MOVE_TO') {
    tx = intent.position.x; tz = intent.position.z; stopDistance = intent.stopDistance;
  } else {
    const anchor = anchorFor(agent, intent.targetId, dt);
    if (!anchor) {
      setMovement(agent, 'blocked', Infinity);
      return;
    }
    tx = anchor.x; tz = anchor.z; stopDistance = ANCHOR_STOP_DISTANCE;
  }

  const steer = steerFor(agent);
  steer.x = agent.position.x; steer.z = agent.position.z; steer.region = agent.region;
  const { nx, nz, dist } = navSteer(steer, tx, tz, dt);

  if (dist < stopDistance) {
    setMovement(agent, 'arrived', dist);
    return;
  }

  const speed = intent.speed === 'run' ? RUN_SPEED : WALK_SPEED;
  agent.position.x += nx * speed * dt;
  agent.position.z += nz * speed * dt;
  // face the steering direction, not the target itself — the same
  // (-nx, -nz) formula every branch in Villagers.tsx's own cascade already
  // uses, so a mid-detour agent turns to face where it is actually walking
  let diff = Math.atan2(-nx, -nz) - agent.yaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  agent.yaw += diff * Math.min(1, dt * FACE_TURN_RATE);
  setMovement(agent, 'moving', dist);
}

if (typeof window !== 'undefined') {
  // debug/test only — FACE isn't routed through any renderer's splice yet
  // (iteration 3.3 only diverts MOVE_TO/MOVE_TO_ANCHOR; see Villagers.tsx's
  // own comment on why), so this is the only way to exercise it directly
  // against a real Agent right now.
  (window as unknown as Record<string, unknown>).__kkloco = { stepLocomotion };
}
