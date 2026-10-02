'use client';
// CLN-14 · path-following steering and local avoidance, moved verbatim out of game/navgrid.ts.
import navgridConfig from '../../ai/config/navgrid.json';
import { getNavGrid } from './registry';

/** per-agent routing state, stashed on the agent object itself so callers
 *  don't need a parallel registry */
export interface NavAgent {
  x: number;
  z: number;
  /** which NavGrid this agent paths against — matches src/ai/core/Agent's
   *  own `region` field. Absent (undefined) means home, same as null;
   *  existing callers that never set this keep working unchanged. */
  region?: string | null;
  /** Wave 42 (A7) — this agent's own id, so `applyLocalAvoidance` below can
   *  exclude it from its own neighbour scan (`liveAgents`) and give it a
   *  stable per-agent avoidance priority. Optional and additive: a caller
   *  that never sets this (Merchant.tsx — no real `Agent` exists for it yet,
   *  see this wave's own scope-down) simply never self-excludes and gets the
   *  hash-priority default (see `avoidPriority`'s own comment) — it still
   *  gets pushed around by everyone else's avoidance same as before this
   *  wave, just without being able to name itself out of the scan. */
  id?: string;
  nav?: { pts: { x: number; z: number }[]; i: number; t: number; tx: number; tz: number };
}

// ---------------------------------------------------------------------------
// Wave 42 (A7) — NPC_AI_SPEC §7.5's local-avoidance separation steering.
// Lives here, not in `src/ai/`, because navSteer (below) is the one real
// shared steering primitive every caller already routes through — extending
// it is this project's own established precedent (Phase 2's navmesh
// decision, VisionSensor's LOS-via-navgrid decision) over standing up a
// parallel avoidance stack that only the Agent-driven population would use.
// ---------------------------------------------------------------------------

/** The minimal per-agent shape `applyLocalAvoidance` needs to see everyone
 *  else in the scene — deliberately NOT the real `ai/core/Agent` class (this
 *  file must not import it: `Agent.ts` sits in the SAME `gameStore <-> ...
 *  <-> AgentManager <-> Agent` cycle `AgentManager.ts`'s own `WindowBounds`
 *  comment documents, and `game/navgrid.ts` is already deep in that graph
 *  from the other side — see this interface's own populate-once-a-frame
 *  contract below for how the real dependency direction stays safe). */
interface AgentSnapshot {
  id: string;
  position: { x: number; z: number };
  region: string | null;
}

/** Populated once a frame (`AiRuntime.tsx`), not per `navSteer` call — the
 *  same "pass data in, don't import across" shape `AgentManager.ts`'s own
 *  `WindowBounds` already uses for the identical reason. A plain module-level
 *  reference, not a copy: `AgentManager.agents` is a single stable array
 *  instance for the whole session (spawn/despawn `push`/`splice` it in
 *  place, confirmed by reading `AgentManager.ts`), so handing over the
 *  reference once and reading through it every `navSteer` call sees every
 *  later spawn/despawn for free, with no per-frame re-snapshot. */
let liveAgents: readonly AgentSnapshot[] = [];

export function setLiveAgents(agents: readonly AgentSnapshot[]): void {
  liveAgents = agents;
}

/** §7.5's "small per-agent priority", DERIVED rather than authored (zero new
 *  data to maintain): a cheap FNV-1a hash of the id, folded into 0..1 and
 *  memoized so it costs one pass over the string once per agent ever, not
 *  once per neighbour pair per frame. Two ids landing on the same rank is
 *  possible but harmless — a tie just means neither yields more than the
 *  other for that one pair, the same outcome as if no priority scheme
 *  existed at all, not a crash or a stuck deadlock. */
const avoidPriorityCache = new Map<string, number>();

function avoidPriority(id: string): number {
  let p = avoidPriorityCache.get(id);
  if (p !== undefined) return p;
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  p = ((h >>> 0) % 1000) / 1000;
  avoidPriorityCache.set(id, p);
  return p;
}

// Module-level scratch, reused by every `navSteer` call, so this per-frame
// neighbour scan (§0.4 — a real render-frame cost at 6-20 agents, unlike
// `Memory.ts`'s rare-event writes) adds no allocation of its OWN: the one
// object per `navSteer` call that already existed (its own final `return`,
// every call site's immediate-destructure target since iteration 2.2) is
// the only allocation, unchanged by this wave.
const _avoid = { nx: 0, nz: 0 };

/**
 * NPC_AI_SPEC §7.5 — the separation-steering math itself, exported as a real,
 * reusable function rather than a private closure specifically so a FUTURE
 * wave can wire this identical, already-tuned formula into `Enemies.tsx`/
 * `Defenders.tsx` without redesigning anything. Neither is covered by THIS
 * wave: both bypass `navSteer` entirely today (`Enemies.tsx` calls
 * `findPath`/`rebuildNav` directly and already runs its own ad hoc
 * pack-separation among enemies only; `Defenders.tsx` has no separation at
 * all) — migrating either onto this is real, separately-reviewable work this
 * bundle deliberately does not take on. See this wave's own plan for the
 * full reasoning.
 *
 * `nx, nz` is the base UNIT steering direction `navSteer` already computed
 * (toward the next waypoint, or straight at the goal with no route). This
 * perturbs that direction only — never the caller's `dist` (arrival), which
 * is measured before this runs and passed through untouched — matching
 * §7.5's "perturbs the path rather than replacing it" exactly.
 */
export function applyLocalAvoidance(agent: NavAgent, nx: number, nz: number): { nx: number; nz: number } {
  _avoid.nx = nx;
  _avoid.nz = nz;
  const n = liveAgents.length;
  if (n === 0) return _avoid;

  const cfg = navgridConfig.avoidance;
  const radius2 = cfg.radius * cfg.radius;
  const myRegion = agent.region ?? null;
  const myPriority = agent.id ? avoidPriority(agent.id) : 0.5;
  let rx = 0;
  let rz = 0;

  for (let i = 0; i < n; i++) {
    const other = liveAgents[i];
    if (agent.id && other.id === agent.id) continue;
    if ((other.region ?? null) !== myRegion) continue;
    const dx = agent.x - other.position.x;
    const dz = agent.z - other.position.z;
    const d2 = dx * dx + dz * dz;
    // d2 < 1e-6 guards the same degenerate divide-by-zero navSteer's own
    // `dist || 1` comment above already worries about — two agents occupying
    // the exact same point have no well-defined "away" direction to push
    // along, so this pair is simply skipped rather than producing a NaN.
    if (d2 >= radius2 || d2 < 1e-6) continue;
    const d = Math.sqrt(d2);
    // Each neighbour's own raw inverse-distance push (1/d) is capped to
    // maxPush INDIVIDUALLY, before the priority scaling below, not only on
    // the final summed vector — see navgrid.json's `avoidance._doc` for why
    // this two-stage clamp is required, not decorative: within the entire
    // 1.2 m radius, 1/d alone is already >= 0.83, above maxPush at every
    // distance in range, so a single-stage sum-then-clamp made the
    // higher-priority agent's REDUCED push and the lower-priority agent's
    // FULL push both saturate to the identical maxPush for any lone
    // neighbour — silently erasing the doorway-standoff asymmetry this
    // exists for. Capping first, then scaling by yieldMul, keeps the two
    // priority tiers visibly distinct for that common case.
    const yieldMul = myPriority > avoidPriority(other.id) ? cfg.yieldPush : 1;
    const w = Math.min(1 / d, cfg.maxPush) * yieldMul; // inverse-distance weighted, per §7.5
    rx += (dx / d) * w;
    rz += (dz / d) * w;
  }
  if (rx === 0 && rz === 0) return _avoid;

  // Second clamp stage, over the SUMMED vector: with a single neighbour this
  // never fires (each per-neighbour term above is already <= maxPush), but
  // with several neighbours in range at once their already-capped
  // contributions can still add up past maxPush — this is what keeps the
  // crowd case bounded (verified live: deflection plateaus rather than
  // growing unboundedly as more agents crowd in).
  const rlen = Math.hypot(rx, rz);
  if (rlen > cfg.maxPush) {
    const s = cfg.maxPush / rlen;
    rx *= s;
    rz *= s;
  }

  const fx = nx + rx;
  const fz = nz + rz;
  const flen = Math.hypot(fx, fz) || 1;
  _avoid.nx = fx / flen;
  _avoid.nz = fz / flen;
  return _avoid;
}

/**
 * Steering direction from `agent` toward (tx, tz), routed via the grid.
 *
 * Returns a UNIT vector plus the straight-line distance to the real goal, so
 * a caller keeps its existing "am I there yet?" checks unchanged and only
 * swaps which way it steps. Falls back to steering straight when there is no
 * route, which is exactly what every caller did before.
 */
export function navSteer(
  agent: NavAgent, tx: number, tz: number, dt: number,
): { nx: number; nz: number; dist: number } {
  const gdx = tx - agent.x;
  const gdz = tz - agent.z;
  // Guard the DIVISOR only. This used to be `Math.hypot(...) || 1`, which
  // reported a distance of 1 for an agent standing exactly on its target —
  // so every caller's arrival check (`d < 0.4`, `d < 0.6`, `d < 1.2`) failed,
  // they took the keep-walking branch with a zero-length direction vector,
  // and never re-rolled the target because arrival never happened. That is
  // the "walks on the spot forever" bug: a villager whose spawn position
  // equals its first wander target could never leave the degenerate point,
  // and only a raid (which physically displaces them) broke the deadlock.
  const dist = Math.hypot(gdx, gdz);
  const inv = dist || 1;

  const grid = getNavGrid(agent.region ?? null);
  const n = agent.nav ?? (agent.nav = { pts: [], i: 0, t: 0, tx: 0, tz: 0 });
  n.t -= dt;
  if (n.t <= 0 || Math.hypot(tx - n.tx, tz - n.tz) > 3) {
    // stagger recomputes so a whole village does not solve on the same frame
    n.t = 1.1 + Math.random() * 0.8;
    n.tx = tx;
    n.tz = tz;
    n.pts = grid.findPath(agent.x, agent.z, tx, tz) ?? [];
    n.i = 0;
  }
  while (n.i < n.pts.length
    && Math.hypot(n.pts[n.i].x - agent.x, n.pts[n.i].z - agent.z) < 1.1) n.i++;

  let baseNx: number, baseNz: number;
  if (n.i >= n.pts.length) {
    baseNx = gdx / inv;
    baseNz = gdz / inv;
  } else {
    const w = n.pts[n.i];
    const wd = Math.hypot(w.x - agent.x, w.z - agent.z) || 1;
    baseNx = (w.x - agent.x) / wd;
    baseNz = (w.z - agent.z) / wd;
  }
  // Wave 42 (A7) — §7.5's separation steering, perturbing the DIRECTION only.
  // `dist` above is the real, unperturbed straight-line distance to the
  // actual goal, computed before this runs, so every caller's own "am I
  // there yet?" check is exactly as accurate as it was before this wave.
  const avoided = applyLocalAvoidance(agent, baseNx, baseNz);
  return { nx: avoided.nx, nz: avoided.nz, dist };
}
