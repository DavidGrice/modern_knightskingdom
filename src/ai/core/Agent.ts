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
import type { TargetId } from './TargetRegistry';
import type { Activity } from './Reasoner';
// AgentManager.ts imports Agent (this file) at its own top level to
// construct instances in spawn() — a real cycle, referenced here only
// inside the `intent` setter body below, never at this module's own
// top-level scope. See that setter's own comment for why this is safe.
import { agentManager } from './AgentManager';
// A second, longer cycle for the same reason: gameStore.ts imports
// rosterSync.ts/npcSync.ts (for resetVillagerAgentSync/resetNpcAgentSync),
// which import agentManager from AgentManager.ts above, which imports this
// file — so gameStore.ts -> ... -> Agent.ts -> gameStore.ts. Only ever
// dereferenced inside think()'s body below, never at this module's
// top-level scope, same rule, verified the same way (a real production
// build, not just tsc).
import { useGameStore } from '@/game/store/gameStore';
import { carryCapacityOf } from '@/game/data/attributes';

/** NPC_AI_SPEC §3.1 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §3.1 — the
 *  output crossing the decision→actuation boundary. Written by the
 *  reasoner (phase 5), read by Locomotion/AnimationController (iteration
 *  3.3+) — never the reverse. Does not belong on Blackboard: Blackboard is
 *  belief/need state the reasoner scores AGAINST, Intent is what it
 *  produces, a different thing. ATTACK is deferred — combat is out of
 *  scope through phase 5 (§5.9). */
export type Intent =
  | { type: 'MOVE_TO'; position: { x: number; z: number }; speed: 'walk' | 'run'; stopDistance: number }
  | { type: 'MOVE_TO_ANCHOR'; targetId: TargetId; anchorName: string; speed: 'walk' | 'run' }
  | { type: 'PLAY_ANIM'; clip: string; loop: boolean; anchored: boolean }
  | { type: 'FACE'; target: { x: number; z: number } }
  | { type: 'IDLE' };

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

  // --- actuation (phase 3), iteration 3.2 — a plain mutable field, same
  // shape as position/yaw above: the reasoner (phase 5) writes it,
  // Locomotion/AnimationController (3.3+) read it. null until something
  // assigns one; every agent starts here.
  //
  // Backed by a private field + accessor (iteration 3.6) purely so
  // `intentSetAt` can be stamped automatically on every assignment, for
  // §9's overlay "elapsed since this intent started" readout — every
  // existing call site (`agent.intent = {...}`) is unchanged, an accessor
  // is transparent to assignment syntax.
  private _intent: Intent | null = null;
  /** AgentManager.now (the AI clock, not wall time — see AgentManager.ts's
   *  own header on why: it must freeze with the game, and this project's dt
   *  clamp already makes wall time diverge from it) at the last `intent`
   *  assignment. Reads `agentManager` lazily inside the setter body only —
   *  a real AgentManager<->Agent import cycle (AgentManager.ts imports
   *  Agent at its top level to construct instances), but confined to a
   *  function body the same way this module graph's other cycles already
   *  are (gameStore<->TargetRegistry, navgrid->gameStore), verified safe by
   *  a production build each time. */
  intentSetAt = 0;

  get intent(): Intent | null {
    return this._intent;
  }

  set intent(v: Intent | null) {
    this._intent = v;
    this.intentSetAt = agentManager.now;
  }

  // --- reasoner (phase 5), iteration 5.4 — a real home for the winning
  // action's actual behavior. Distinct from `bb.currentActionId`/
  // `currentActionStartedAt` (phase 1's debug-visible mirror of "what's
  // running" — a plain string/timestamp, cheap for the overlay to read)
  // and from `intent` above (what an Activity EMITS toward actuation, not
  // the Activity itself): this is the live object whose `update(agent,dt)`
  // the reasoner calls each think tick, and whose `abort(agent)` must run
  // before anything replaces it. Nothing constructs one yet — 5.6's
  // FleeToSafety/Sleep are the first real implementors.
  currentActivity: Activity | null = null;

  // --- LOD (§8), assigned by AgentManager ---
  tier: Tier = 'A';
  thinkHz: number;
  perceiveHz: number;
  steering: 'full' | 'simplified' | 'teleport';
  /** iteration 2.7 — true when the current tier was forced to C by a
   *  windowed region's nav-window bound, distinct from "out of frustum" (the
   *  other way to land on C). §9's debug overlay reads this alongside tier
   *  so "why C" is visible without guessing; also the only reliable way to
   *  test the bound in isolation from frustum/camera state (see
   *  scripts/smoke140.mjs). Set on every refresh, not just tier changes —
   *  setTier() itself no-ops when the tier doesn't change, but the REASON
   *  can still be worth re-confirming. */
  boundCapped = false;

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

    // §4.1/§4.2 — job and carryCapacity are LIVE reads, every think tick,
    // never a stored copy assigned once at spawn (Blackboard.ts's own
    // comment has the full reasoning). Looked up by id against the actual
    // roster each time, not cached on this Agent instance — a villager
    // reassigned via the roster panel, leveled up, or newly equipped with a
    // carrier mid-session is correct again within one think tick. No match
    // (the phase-1 probe, a court NPC, a despawned villager mid-frame)
    // means there is no live economy record to read, so both reset to
    // their "nothing to report" value rather than going stale.
    const villager = useGameStore.getState().villagers.find((v) => v.id === this.id);
    if (villager) {
      this.bb.job = villager.job;
      this.bb.carryCapacity = carryCapacityOf(villager, villager.job);
    } else {
      this.bb.job = null;
      this.bb.carryCapacity = 0;
    }

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
