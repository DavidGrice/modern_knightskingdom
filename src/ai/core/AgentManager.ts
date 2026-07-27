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
   *  rate; the thinks it dispatches are rate-limited per §8. */
  update(dt: number, camera: THREE.Camera, activeRegion: string | null) {
    // same clamp the rest of the project uses, so one long frame cannot jump
    // every need and cooldown forward by seconds at once
    if (dt > 0.05) dt = 0.05;
    this.now += dt;
    this.activeRegion = activeRegion;

    this.tierTimer += dt;
    const tierPeriod = 1 / LOD.tierRefreshHz;
    if (this.tierTimer >= tierPeriod) {
      this.tierTimer = 0;
      this.refreshTiers(camera);
    }

    this.scheduler.update(dt, this.now, this.agents);
  }

  /** §8's tier table. Deliberately cheap and deliberately NOT per frame — a
   *  tier is a coarse budget decision, and re-deciding it 60 times a second
   *  would cost more than the thinks it is trying to save. */
  private refreshTiers(camera: THREE.Camera) {
    _viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_viewProj);
    const near2 = LOD.nearDistance * LOD.nearDistance;
    const radius = LOD.agentRadius;
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      let tier: Tier;
      if (a.region !== this.activeRegion) {
        tier = 'D';
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
