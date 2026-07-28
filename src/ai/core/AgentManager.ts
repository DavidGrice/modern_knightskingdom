// NPC_AI_SPEC §1 / §8 — registry + scheduler + LOD tiering.
//
// One instance for the whole game (exported below). It owns the AI clock:
// every timestamp in the system — belief decay, cooldowns, action durations —
// is measured against `now`, which advances by the frame's dt rather than by
// performance.now(). That matters twice over here: the game pauses (the clock
// must stop with it), and this project's frame dt is clamped to 0.05 s, so
// wall-clock and simulated time genuinely diverge under a slow renderer.

import * as THREE from 'three';
import { LOD, type Tier } from '../config';
import { Agent } from './Agent';
import { Scheduler } from './Scheduler';

// §0.4 — scratch objects reused every LOD refresh, never reallocated
const _viewProj = new THREE.Matrix4();
const _frustum = new THREE.Frustum();
const _sphere = new THREE.Sphere();

/** Phase 2, iteration 2.7 — the active region's nav-window bound, for
 *  Tier B's §8 correction ("window edge" only applies to windowed regions;
 *  fixed regions like home/the Crypt stay unbounded). Deliberately a plain
 *  data shape, not a `NavGrid` import: `AgentManager` sits under `ai/core`
 *  and `game/navgrid.ts` transitively imports `game/store/gameStore.ts`
 *  (via `TemplateWorld.tsx`), which already imports `agentManager` — an
 *  `AgentManager -> navgrid -> ... -> gameStore -> AgentManager` cycle, not
 *  hypothetical, confirmed via the real import edges. `AiRuntime.tsx`
 *  already talks to both `getNavGrid` and `agentManager` every frame, so it
 *  computes this and passes it in, keeping AgentManager itself free of any
 *  navigation-module dependency. */
export interface WindowBounds { originX: number; originZ: number; halfExtent: number }

function inWindowBounds(p: THREE.Vector3, b: WindowBounds): boolean {
  return p.x > b.originX - b.halfExtent && p.x < b.originX + b.halfExtent
    && p.z > b.originZ - b.halfExtent && p.z < b.originZ + b.halfExtent;
}

export class AgentManager {
  readonly agents: Agent[] = [];
  private readonly byId = new Map<string, Agent>();
  private readonly scheduler = new Scheduler(LOD.thinkBudgetPerFrame);

  /** game-time seconds since the runtime mounted */
  now = 0;
  /** the region the camera is in; agents elsewhere drop to tier D */
  activeRegion: string | null = null;

  private tierTimer = 0;

  spawn(id: string, archetype: string, x: number, z: number, region: string | null = null): Agent {
    const existing = this.byId.get(id);
    if (existing) return existing;
    const agent = new Agent(id, archetype, x, z, region);
    this.agents.push(agent);
    this.byId.set(id, agent);
    return agent;
  }

  despawn(id: string) {
    const agent = this.byId.get(id);
    if (!agent) return;
    // Phase 5, iteration 5.9 — a real, previously-undiscovered bug found
    // building this iteration's own test: without this, a despawning agent
    // mid-GatherAtNode/HaulToDeposit (e.g. a villager reassigned to
    // 'defender' — rosterSync.ts's syncVillagerAgents excludes that job and
    // despawns them) never releases its TargetRegistry reservation.
    // Reasoner.ts's own runReasoner only calls abort() when an activity is
    // REPLACED by a new winner on the SAME agent, never when the agent
    // itself goes away — despawn() is a second, real place an activity's
    // lifecycle can end, and it needs the same cleanup. A tree has only 2
    // gather slots; one leaked reservation is a real, permanent, silent
    // capacity loss for the rest of the session, not a cosmetic gap.
    agent.currentActivity?.abort(agent);
    this.byId.delete(id);
    const i = this.agents.indexOf(agent);
    if (i >= 0) this.agents.splice(i, 1);
  }

  get(id: string): Agent | undefined {
    return this.byId.get(id);
  }

  clear() {
    this.agents.length = 0;
    this.byId.clear();
    this.now = 0;
  }

  /** Called once per frame from AiRuntime. Only the SCHEDULER runs at frame
   *  rate; the thinks it dispatches are rate-limited per §8. `windowBounds`
   *  is non-null only when `activeRegion` is a windowed (destination) grid —
   *  null for home/the Crypt (fixed, unbounded) and for `null` region. */
  update(dt: number, camera: THREE.Camera, activeRegion: string | null, windowBounds: WindowBounds | null = null) {
    // same clamp the rest of the project uses, so one long frame cannot jump
    // every need and cooldown forward by seconds at once
    if (dt > 0.05) dt = 0.05;
    this.now += dt;
    this.activeRegion = activeRegion;

    this.tierTimer += dt;
    const tierPeriod = 1 / LOD.tierRefreshHz;
    if (this.tierTimer >= tierPeriod) {
      this.tierTimer = 0;
      this.refreshTiers(camera, windowBounds);
    }

    this.scheduler.update(dt, this.now, this.agents);
  }

  /** §8's tier table. Deliberately cheap and deliberately NOT per frame — a
   *  tier is a coarse budget decision, and re-deciding it 60 times a second
   *  would cost more than the thinks it is trying to save. */
  private refreshTiers(camera: THREE.Camera, windowBounds: WindowBounds | null) {
    _viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_viewProj);
    const near2 = LOD.nearDistance * LOD.nearDistance;
    const radius = LOD.agentRadius;
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      let tier: Tier;
      a.boundCapped = false;
      if (a.region !== this.activeRegion) {
        tier = 'D';
      } else if (windowBounds && !inWindowBounds(a.position, windowBounds)) {
        // §8's correction: in a windowed region, past the nav grid's own
        // covered bubble is Tier C regardless of frustum — the agent is
        // standing outside the very grid its "full steering" depends on.
        tier = 'C';
        a.boundCapped = true;
      } else {
        // a sphere, not the feet point: an agent standing just below the
        // bottom of the frame is still visible from the waist up
        _sphere.set(a.position, radius);
        if (!_frustum.intersectsSphere(_sphere)) tier = 'C';
        else tier = camera.position.distanceToSquared(a.position) < near2 ? 'A' : 'B';
      }
      a.setTier(tier);
    }
  }

  // --- debug readouts (§9) ---
  get thinksLastFrame(): number {
    return this.scheduler.lastSpent;
  }

  get deferredLastFrame(): number {
    return this.scheduler.lastDeferred;
  }

  /** thinks dispatched per second, averaged over the last second */
  get thinksPerSec(): number {
    return this.scheduler.thinksPerSec;
  }

  /** worst single frame in the last second — this is the number that says
   *  whether thinkBudgetPerFrame is saturated */
  get peakThinksPerFrame(): number {
    return this.scheduler.peakPerFrame;
  }

  get thinkBudget(): number {
    return this.scheduler.budget;
  }
}

/** The single registry. §0.2's "one arbiter" is about the reasoner, but the
 *  same argument applies to the registry: two of these and the think budget
 *  means nothing. */
export const agentManager = new AgentManager();

if (typeof window !== 'undefined') {
  // matches the project's existing smoke-test handles (__kk, __kkp, __kke)
  (window as unknown as Record<string, unknown>).__kkai = agentManager;
}
