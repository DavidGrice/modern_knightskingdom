// CLN-15 · the pick-a-point / walk there / give up loop behind `wander` (a
// roster villager nobody is rendering) and `roam` (wildlife). Written for
// wander.ts and copied into roam.ts; the two differ in how the point is picked
// and in their numbers, both of which arrive here as a `Walk`.
//
// The two ACTIONS stay as separate as roam.ts's header says they must: their
// gates are opposites, and neither may ever win for the other's population.
// Only the walking is shared.
import type { Agent } from '../core/Agent';
import type { Activity, ActivityStatus, Context } from '../core/Reasoner';

/** What differs between the two walks. */
export interface Walk {
  /** where to go, or null when this agent has nowhere sensible to go */
  pick: (agent: Agent) => { x: number; z: number } | null;
  /** the walk's own block of config/ambient.json: how close counts as there,
   *  and how long to keep trying */
  config: { stopDistance: number; giveUpSec: number };
}

export class WalkToPointActivity implements Activity {
  private elapsed = 0;
  private stepped = false;

  constructor(private readonly walk: Walk) {}

  start(agent: Agent, _ctx: Context): void {
    this.elapsed = 0;
    this.stepped = false;
    const point = this.walk.pick(agent);
    // No intent at all, deliberately: update() reads that back as FAILURE on
    // the very next line of the same tick. Emitting nothing is what makes a
    // failed pick cost one scoreAction rather than a held intent.
    if (!point) { agent.intent = null; return; }
    agent.intent = {
      type: 'MOVE_TO', position: point, speed: 'walk', stopDistance: this.walk.config.stopDistance,
    };
  }

  update(agent: Agent, dt: number, _now: number): ActivityStatus {
    if (!agent.intent) return 'FAILURE';
    this.elapsed += dt;

    // workActivity.ts's `travelStepped` rule, for the same reason: bb.movement
    // holds whatever the LAST stepLocomotion call left it as, and start() runs
    // in the same tick as this first update() — before anything has stepped
    // the intent just issued. Its resting default is 'arrived', so trusting it
    // here would complete every walk instantly, on the spot, forever.
    if (!this.stepped) { this.stepped = true; return 'RUNNING'; }

    const status = agent.bb.movement.status;
    if (status === 'arrived') { agent.intent = null; return 'SUCCESS'; }
    // Real, and new in phase 8: the coarse-step branch reports 'blocked' when a
    // jump's landing point has no walkable cell near it (Locomotion's
    // `jumpAlongPath`), which is the one thing waiting cannot fix — the ground
    // was built over while this agent was away. Ending now re-picks a fresh
    // point after the pause instead of grinding at it until giveUpSec.
    if (status === 'blocked') { agent.intent = null; return 'FAILURE'; }
    // The other stall has no status of its own to report: with no path,
    // navSteer falls back to straight-line steering, so an agent pressed
    // against a corner keeps reporting 'moving' while covering no ground. A
    // clock is the only thing that ends that.
    if (this.elapsed >= this.walk.config.giveUpSec) { agent.intent = null; return 'FAILURE'; }
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}
