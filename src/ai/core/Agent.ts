// NPC_AI_SPEC §1 — an agent owns its blackboard, its senses, its reasoner and
// its actuator. Phase 1 builds the shell and the think tick; the senses
// (phase 6), reasoner (phase 5) and actuator (phase 3) attach here later
// without changing what a think tick IS.
//
// §0.1: nothing in here may touch a transform, a mesh or a mixer. `position`
// is a value the ACTUATOR writes and the agent reads (for LOD and, later, for
// perception queries) — the decision side never assigns to it.

import * as THREE from 'three';
import {
  NEED_IDS,
  archetypeDef,
  needProfile,
  tierDef,
  type ArchetypeDef,
  type NeedId,
  type NeedTuning,
  type Tier,
} from '../config';
import { createBlackboard, type Blackboard } from './Blackboard';

export class Agent {
  readonly id: string;
  readonly archetype: string;
  readonly def: ArchetypeDef;
  readonly bb: Blackboard;

  /** world position, in the same coordinate space as playerState */
  readonly position = new THREE.Vector3();
  yaw = 0;

  /** which world this agent lives in; null = the home meadow, otherwise a
   *  destination id (see game/data/worlds.ts). §8's tier D is "different
   *  region". */
  region: string | null;

  // --- LOD (§8), assigned by AgentManager ---
  tier: Tier = 'A';
  thinkHz: number;
  perceiveHz: number;
  steering: 'full' | 'simplified' | 'teleport';

  // --- scheduling (§8), owned by Scheduler ---
  /** seconds of game time banked toward the next think */
  thinkTimer: number;
  /** game time of the previous think; -1 until the first one */
  lastThinkAt = -1;
  thinkCount = 0;

  // --- debug readout (§9) ---
  /** thinks per second actually achieved, averaged over a 1s window */
  measuredHz = 0;
  private hzWindowStart = 0;
  private hzCount = 0;

  private readonly needs: Record<NeedId, NeedTuning>;

  constructor(id: string, archetype: string, x: number, z: number, region: string | null) {
    this.id = id;
    this.archetype = archetype;
    this.def = archetypeDef(archetype);
    this.needs = needProfile(this.def.needProfile);
    this.bb = createBlackboard(id, this.def.needProfile, region);
    this.position.set(x, 0, z);
    this.region = region;

    const t = tierDef(this.tier);
    this.thinkHz = t.thinkHz;
    this.perceiveHz = t.perceiveHz;
    this.steering = t.steering;
    // §8: a random phase offset at spawn, so agents on the same tier don't
    // all come due on the same frame and starve the budget in lockstep.
    this.thinkTimer = Math.random() / this.thinkHz;
  }

  setTier(tier: Tier) {
    if (tier === this.tier) return;
    this.tier = tier;
    const t = tierDef(tier);
    this.thinkHz = t.thinkHz;
    this.perceiveHz = t.perceiveHz;
    this.steering = t.steering;
    // a tier drop must not leave more time banked than the new, slower period
    const period = 1 / this.thinkHz;
    if (this.thinkTimer > period) this.thinkTimer = period;
    // restart the rate measurement, or the overlay spends a second reporting
    // an average of the old tier and the new one (a 10 Hz agent that just
    // dropped to C reading "7.1/2 Hz" looks like a bug and is not one)
    this.hzWindowStart = this.lastThinkAt < 0 ? 0 : this.lastThinkAt;
    this.hzCount = 0;
  }

  /** One think tick. Called by the Scheduler at the tier's rate, never from
   *  the render loop (§0.3). `now` is AgentManager's game clock. */
  think(now: number) {
    // Needs decay by the time actually elapsed since the LAST think, not by a
    // fixed dt — which is what makes a tier-D agent thinking at 0.5 Hz end up
    // just as hungry as a tier-A one, with no separate statistical path.
    const elapsed = this.lastThinkAt < 0 ? 0 : now - this.lastThinkAt;
    this.lastThinkAt = now;
    this.thinkCount++;
    this.decayNeeds(elapsed);

    // phase 6: this.senses.update(now)
    // phase 5: this.reasoner.think(this, now) -> writes bb.lastScores and may
    //          swap the running Activity. Nothing decides anything yet.

    // rolling think-rate measurement for the overlay
    this.hzCount++;
    const span = now - this.hzWindowStart;
    if (span >= 1) {
      this.measuredHz = this.hzCount / span;
      this.hzCount = 0;
      this.hzWindowStart = now;
    }
  }

  private decayNeeds(dt: number) {
    if (dt <= 0) return;
    const n = this.bb.needs;
    for (let i = 0; i < NEED_IDS.length; i++) {
      const id = NEED_IDS[i];
      const v = n[id] - this.needs[id].decayPerSec * dt;
      n[id] = v < 0 ? 0 : v;
    }
  }

  /** Satisfy a need directly (§5.7 prorates an affordance's effects through
   *  this). Clamped, because an unclamped need is an unclamped consideration
   *  input and §5.2 is emphatic about where that ends up. */
  addNeed(id: NeedId, delta: number) {
    const v = this.bb.needs[id] + delta;
    this.bb.needs[id] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
}
