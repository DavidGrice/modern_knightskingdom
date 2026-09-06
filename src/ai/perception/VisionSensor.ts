// NPC_AI_SPEC §6.1 — the vision sensor: broad phase, cone test, LOS, and a
// confidence ramp that is deliberately not instant.
//
// ONE DOCUMENTED DIVERGENCE FROM THE SPEC, and it is the same one phase 2
// already made for navigation. §6.1's narrow phase says "one raycast per
// candidate per tick, against a dedicated `losCollider` layer only". There is
// no `losCollider` layer in this project and building one would mean authoring
// a second set of collision geometry for every building in the game — the
// exact "adopt a whole new stack" trade phase 2 rejected when it extended
// `game/navgrid.ts` instead of adopting navcat (PHASE_STATUS.md, phase 2's
// header). The nav grid already answers the question a `losCollider` layer
// would have been built to answer, and answers it better for this purpose:
// its blocked cells are precisely the volumes that are solid between 0.55 m
// and 1.7 m (navgrid.ts's WALK_LOW/WALK_HIGH), i.e. solid at torso height —
// so a kerb you can step over does not hide a bandit, and a wall does. So the
// narrow phase here is a march over `NavGrid.isWalkable`, not a raycast.
//
// §6.1's OTHER budget rules are kept verbatim: broad phase is a squared
// distance test, mid phase is a dot product against the forward vector, and
// the narrow phase is capped at `losChecksPerTick` (4) candidates per agent
// per tick with the rest round-robined to the next tick.

import { useEnemyStore } from '@/game/combat';
import { getNavGrid, type NavGrid } from '@/game/navgrid';
import { playerState } from '@/game/playerState';
import { PERCEPTION, VISION_HALF_COS } from '../config';
import type { Agent } from '../core/Agent';
// Safe, already-proven edge: Senses.ts (this same folder) already imports
// `agentManager` directly from `../core/AgentManager` at top level with no
// incident — the real, previously-crashed cycle this project has hit lives on
// `Agent.ts` statically importing `src/ai/perception` (or `game/navgrid.ts`)
// back, which neither `agentManager` nor `Agent` (type-only below) does.
import { agentManager } from '../core/AgentManager';
import { recordSighting } from '../core/Memory';
import { ensureBelief, enemyBeliefId, neighborBeliefId, PLAYER_BELIEF_ID } from './Belief';
import type { PerceptionState } from './state';

// §0.4 — module-level scratch, reused by every agent's every tick. Nothing
// here is re-entrant (perception runs one agent at a time, from Agent.think).
const candIds: string[] = [];
const candX: number[] = [];
const candZ: number[] = [];
const candDist: number[] = [];
let candCount = 0;

/** `getNavGrid` throws for an unknown destination id and for the Crypt before
 *  a layout has generated (navgrid.ts) — neither should be reachable here
 *  (an agent's region only ever comes from `gameStore.destination`, and the
 *  player is standing in the Crypt if any agent is tiered into it), but a
 *  thrown error inside a think tick would take down the whole scheduler for
 *  every agent, not just this one. Failing OPEN (no grid = nothing known to
 *  block sight) is the right direction: perception is an enhancement over the
 *  pre-phase-6 behaviour of seeing nothing at all, so a missing grid should
 *  degrade to "sees through walls", never to "goes blind and throws". */
function losGridFor(region: string | null): NavGrid | null {
  try {
    return getNavGrid(region);
  } catch {
    return null;
  }
}

/** The narrow phase. Marches the segment between two points at half-cell
 *  steps and reports whether every intermediate sample is walkable.
 *
 *  Both ENDPOINTS are skipped on purpose. An agent can legitimately stand on
 *  a cell the nav grid calls blocked (obstacles are inflated by AGENT_RADIUS,
 *  so standing right against a wall reads as blocked), and a mob very much
 *  can — Enemies.tsx steers with its own collision rules, not the nav grid's.
 *  Testing the endpoints would make a raider pressed against your fence
 *  permanently invisible, which is the worst possible failure for a sensor
 *  whose whole job is noticing raiders. */
function hasLineOfSight(grid: NavGrid, ax: number, az: number, bx: number, bz: number): boolean {
  const step = PERCEPTION.vision.losSampleStep;
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz);
  if (dist <= step) return true;
  const steps = Math.floor(dist / step);
  const ix = dx / dist * step;
  const iz = dz / dist * step;
  for (let i = 1; i < steps; i++) {
    if (!grid.isWalkable(ax + ix * i, az + iz * i)) return false;
  }
  return true;
}

/** §6.1's broad phase, over the three populations that matter.
 *
 *  Fellow AGENTS were deliberately not perceived through phase 7, despite
 *  §6.1's "squared distance check against agent list": nothing consumed a
 *  belief about a neighbouring villager, and populating a map with 20
 *  beliefs per agent that nothing read was cost with no consumer.
 *
 *  WAVE 42 UPDATE (E3) — that changed: `Senses.ts`'s `deriveThreat` now reads
 *  a `neighbor:` belief's OWNER's own `threatLevel`/`lastDamageAt` as a
 *  contagion term, so a villager who has not personally noticed a hostile
 *  can still back off the six already-shipped `not_threatened`-gated actions
 *  purely from seeing a neighbour panic. This reuses the exact same broad/
 *  mid/narrow/ramp pipeline below rather than standing up a second, parallel
 *  one — a fellow-agent candidate is added in the loop below with its own
 *  `neighborBeliefId`, and everything downstream (cone test, LOS march,
 *  confidence ramp) treats it identically to a hostile or the player
 *  candidate; only `isHostileBeliefId`'s own prefix check (`Belief.ts`) is
 *  what keeps a `neighbor:` belief out of threat/`nearestNoticedHostile` on
 *  its own account. `follow_leader`/`assist_leader` remain the actions that
 *  would want a DIFFERENT thing (tracking a specific leader, not "some
 *  nearby agent") and this is not that — see those actions' own files. */
function collectCandidates(agent: Agent, range2: number): void {
  candCount = 0;
  const ax = agent.position.x;
  const az = agent.position.z;

  const pdx = playerState.x - ax;
  const pdz = playerState.z - az;
  const pd2 = pdx * pdx + pdz * pdz;
  if (pd2 <= range2) {
    candIds[candCount] = PLAYER_BELIEF_ID;
    candX[candCount] = playerState.x;
    candZ[candCount] = playerState.z;
    candDist[candCount] = Math.sqrt(pd2);
    candCount++;
  }

  // `useEnemyStore.getState()` is the same one-directional read `flee.ts`
  // already makes every think tick. Mobs live in whichever region the player
  // is in; an agent in a different region is tier D and never reaches this
  // function at all (Senses.ts gates on `perceiveHz`), so no region filter is
  // needed here beyond that.
  const enemies = useEnemyStore.getState().enemies;
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    // a corpse mid-death-animation is not a threat and should stop being one
    // the instant it starts falling, not 12 seconds later when its belief
    // finally decays out
    if (e.mob.state === 'dying') continue;
    const dx = e.mob.x - ax;
    const dz = e.mob.z - az;
    const d2 = dx * dx + dz * dz;
    if (d2 > range2) continue;
    candIds[candCount] = enemyBeliefId(e.id);
    candX[candCount] = e.mob.x;
    candZ[candCount] = e.mob.z;
    candDist[candCount] = Math.sqrt(d2);
    candCount++;
  }

  // Wave 42 (E3) — fellow agents, region-matched and self-excluded, same
  // O(n) scan A7's navgrid.ts avoidance uses at this project's own stated
  // 6-20 agent scale (a naive loop is the right cost here, not a spatial
  // index). `agentManager.agents` is the single live registry array
  // (AgentManager.ts pushes/splices it in place), so this never allocates.
  const agents = agentManager.agents;
  for (let i = 0; i < agents.length; i++) {
    const other = agents[i];
    if (other === agent || (other.region ?? null) !== (agent.region ?? null)) continue;
    const dx = other.position.x - ax;
    const dz = other.position.z - az;
    const d2 = dx * dx + dz * dz;
    if (d2 > range2) continue;
    candIds[candCount] = neighborBeliefId(other.id);
    candX[candCount] = other.position.x;
    candZ[candCount] = other.position.z;
    candDist[candCount] = Math.sqrt(d2);
    candCount++;
  }
}

/** One perceive tick's vision pass. `dt` is time since this agent's own
 *  previous PERCEIVE tick (not think tick) — the confidence ramp is expressed
 *  in seconds and must not run faster on a tier-A agent than a tier-C one. */
export function updateVision(agent: Agent, st: PerceptionState, now: number, dt: number): void {
  const v = PERCEPTION.vision;
  collectCandidates(agent, v.range * v.range);
  st.losChecks = 0;
  st.seenCount = 0;
  if (candCount === 0) return;

  // forward vector for the cone test. Locomotion.ts writes yaw as
  // `atan2(-nx, -nz)` over the direction of travel, so forward is
  // (-sin yaw, -cos yaw) — the same convention Villagers.tsx and Enemies.tsx
  // both use; getting this backwards would give every NPC eyes in the back of
  // its head and no way to tell from the numbers alone.
  const fx = -Math.sin(agent.yaw);
  const fz = -Math.cos(agent.yaw);
  const grid = losGridFor(agent.region);

  // §6.1's round-robin: the cursor persists across ticks on the agent's own
  // perception state, so with more candidates than the per-tick LOS budget
  // every one of them still gets checked, just over several ticks — the same
  // "deferred, not dropped" guarantee Scheduler.ts gives think ticks.
  const start = candCount > 0 ? st.losCursor % candCount : 0;
  for (let n = 0; n < candCount; n++) {
    const i = (start + n) % candCount;
    const dist = candDist[i];
    const id = candIds[i];

    // mid phase — inside peripheralRange the cone does not apply at all
    // (§6.1's "shorter, wider" band: something at your shoulder registers
    // whichever way you are facing)
    let inCone = dist <= v.peripheralRange;
    if (!inCone && dist > 1e-4) {
      const dot = ((candX[i] - agent.position.x) * fx + (candZ[i] - agent.position.z) * fz) / dist;
      inCone = dot >= VISION_HALF_COS;
    }
    if (!inCone) continue;

    // narrow phase, budgeted. A candidate that runs out of budget this tick
    // is simply not refreshed; `isVisibleNow` expires on a staleness test in
    // decayBeliefs rather than being cleared here, so a deferred check reads
    // as "still visible, not re-confirmed yet" instead of making a target in
    // plain sight flicker because a raid put eleven mobs in range.
    //
    // A belief that FAILS the LOS check is likewise just left to decay: it
    // keeps the position it was last actually seen at (§3.3's "combat and
    // search behavior must read lastKnownPosition, never the live transform"),
    // so a bandit ducking behind the barn leaves a fading memory at the barn's
    // near side rather than a tracker that follows him through the wall.
    if (grid) {
      if (st.losChecks >= v.losChecksPerTick) continue;
      st.losChecks++;
      st.losCursor = i + 1;
      if (!hasLineOfSight(grid, agent.position.x, agent.position.z, candX[i], candZ[i])) continue;
    }

    // §6.1's deliberate degradation. Ramp length lerps from rampSecondsNear
    // at zero distance to rampSecondsFar at the edge of range — so the spec's
    // "~1.5 s at the edge of the cone at max range" holds exactly, and
    // something at arm's length is recognised in well under half a second.
    const frac = dist / v.range;
    const ramp = v.rampSecondsNear + (v.rampSecondsFar - v.rampSecondsNear) * (frac > 1 ? 1 : frac);
    const b = ensureBelief(agent.bb, id, now);
    // Wave 42 (E6) — `firstSeenAt === now` is only ever true on the tick
    // `ensureBelief` just created this exact belief (it stamps that field on
    // creation and never touches it again), so this fires once per belief's
    // lifetime, not once per perceive tick a target stays in view.
    if (b.firstSeenAt === now) recordSighting(agent.bb, id, now, false);
    b.confidence = Math.min(1, b.confidence + dt / ramp);
    b.lastKnownPosition.set(candX[i], 0, candZ[i]);
    b.lastSeenAt = now;
    b.isVisibleNow = true;
    st.seenCount++;
  }
}
