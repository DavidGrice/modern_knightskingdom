// CLN-15 · the reserve -> travel -> align -> perform skeleton behind the three
// work actions: `gather_resource`, `haul_to_deposit` and `tend_farmplot`. It
// was written for gather.ts (PHASE_2_NAVIGATION_AND_GATHERING.md §3.4-§3.5,
// mirroring GotoAndUse's shape from NPC_AI_SPEC.md §3) and then copied into
// the other two with "same reasoning as GatherAtNode" comments; what actually
// differs between them is the work itself.
//
// A subclass supplies that: which reservation bucket it claims, what kind of
// target it works at, the clip it holds once in place, and `perform()` — one
// tick of the job. Walking there, the stale-status tick, giving up on a blocked
// path, publishing the work signal, and releasing the slot on every way out are
// here, once.
import { setWorkSignal, clearWorkSignal } from '@/game/workSignal';
import { targetRegistry, type Target, type TargetId } from '../core/TargetRegistry';
import type { Agent, Intent } from '../core/Agent';
import type { Activity, ActivityStatus, Context } from '../core/Reasoner';

// Phase 5, 5.9 — how long a genuinely unreachable target (resolveAnchor/
// navSteer reports 'blocked') stays excluded from scoring after a failed
// attempt, via bb.blockedTargets (see that field's own comment in
// Blackboard.ts for the full story). Long enough that a villager doesn't
// immediately retry and re-fail every tick forever; short enough that a
// temporarily-blocked path (mid-raid rubble, say) clears on its own once
// the obstruction is gone, without needing an explicit unblock signal.
const BLOCKED_RETRY_COOLDOWN = 15;

const PROXIMITY_RANGE = 40; // matches assembleCandidates's own default queryRadius

/** The `proximity` consideration's input for all three work actions: how far
 *  the candidate target is, as a fraction of the query radius (0 = on top of
 *  it, 1 = at the edge of what was offered). Straight-line, not path-based —
 *  each action bends it through its own curve. */
export function proximityInput(agent: Agent, ctx: Context): number {
  if (!ctx.target) return 0;
  const dx = ctx.target.x - agent.position.x;
  const dz = ctx.target.z - agent.position.z;
  return Math.min(1, Math.hypot(dx, dz) / PROXIMITY_RANGE);
}

export abstract class WorkActivity implements Activity {
  private phase: 'travel' | 'align' | 'perform' = 'travel';
  private travelStepped = false;
  private targetId: TargetId | null = null;
  /** true once reserve() actually succeeded — start() can't return a status
   *  (the Activity interface's start() is void), so a failed reservation is
   *  flagged here and turned into a real FAILURE on the very next update()
   *  instead of silently proceeding as if the slot were held. Found during
   *  5.8a's own review: with only one agent ever gathering (5.7's own
   *  testing), a failed reserve() never happened, so this was invisible —
   *  the moment two agents can reach the same tree (2 slots), a third
   *  "winning" gather_resource for it would otherwise gather from a node
   *  whose slots are already full, bypassing the cap entirely. A farmplot's
   *  anchor rule allows 4, so several farmers really can work neighbouring
   *  beds, and the same holds there. */
  private reserved = false;

  /** the reservation bucket this work claims on its target (TargetRegistry) */
  protected abstract readonly slotKind: string;
  /** the only kind of target this work can be done at, or null for any */
  protected abstract readonly source: Target['source'] | null;
  /** The clip held from the moment the worker is in place. A fresh object on
   *  every call: `agent.intent`'s setter stamps a time on each assignment. */
  protected abstract workIntent(): Intent;
  /** Zero whatever `perform` counts with — called when the activity starts and
   *  again as the worker falls to it. */
  protected abstract beginWork(): void;
  /** One tick of the work itself, the worker in place and the clip already
   *  set. End it with `this.finish(agent, …)`, never a bare status. */
  protected abstract perform(agent: Agent, dt: number, target: Target): ActivityStatus;

  start(agent: Agent, ctx: Context): void {
    if (!ctx.target) return;
    this.targetId = ctx.target.id;
    this.phase = 'travel';
    this.travelStepped = false;
    this.beginWork();
    this.reserved = targetRegistry.reserve(ctx.target.id, this.slotKind, agent.id);
    if (!this.reserved) return; // update() fails cleanly on the next tick
    agent.bb.reservation = { targetId: ctx.target.id, slotKind: this.slotKind };
    agent.intent = { type: 'MOVE_TO_ANCHOR', targetId: ctx.target.id, anchorName: 'default', speed: 'walk' };
  }

  update(agent: Agent, dt: number, now: number): ActivityStatus {
    if (!this.targetId) return 'FAILURE';
    if (!this.reserved) return 'FAILURE'; // nothing to release — never held a slot
    const target = targetRegistry.get(this.targetId);
    if (!target || (this.source !== null && target.source !== this.source)) return this.finish(agent, 'FAILURE');

    if (this.phase === 'travel') {
      // bb.movement reflects whatever the LAST stepLocomotion call left it
      // as — on the very first update() after start() (called the same
      // tick, before any stepLocomotion has run against the intent just
      // issued), that is stale leftover state from before this activity
      // even began, often 'arrived' (the resting default). §0.1 forbids
      // writing bb.movement here to invalidate it, so this tick doesn't
      // trust it at all instead — one tick later, a real stepLocomotion
      // call has had a chance to run against the actual MOVE_TO_ANCHOR
      // intent, and the status is trustworthy again.
      if (!this.travelStepped) { this.travelStepped = true; return 'RUNNING'; }
      if (agent.bb.movement.status === 'blocked') {
        // a genuinely unreachable target — without recording this, its raw
        // score (proximity is straight-line, not path-based) could easily
        // keep winning every subsequent tick, failing the exact same way
        // forever; see BLOCKED_RETRY_COOLDOWN's own comment
        agent.bb.blockedTargets.set(this.targetId, now + BLOCKED_RETRY_COOLDOWN);
        return this.finish(agent, 'FAILURE');
      }
      if (agent.bb.movement.status === 'arrived') {
        this.phase = 'align';
        agent.intent = { type: 'FACE', target: { x: target.x, z: target.z } };
      }
      return 'RUNNING';
    }

    if (this.phase === 'align') {
      // stepLocomotion reports 'arrived' for FACE the instant it's issued —
      // the yaw lerp itself settles over a few more frames on its own
      // (Locomotion.ts's own comment), and there is no separate "turn
      // finished" signal to wait on without reading yaw directly here,
      // which §0.1's transform-isolation rule forbids. A one-tick align is
      // the honest choice, not a shortcut: the work clip starts a couple
      // of frames before the turn visually settles, which reads fine.
      this.phase = 'perform';
      this.beginWork();
      // §4: active from align onward, matching villagerAtWork()'s old
      // heuristic (arrived = at work) — never during travel, which would be
      // a strictly weaker presence check than the one it replaces
      setWorkSignal(agent.id, { active: true, targetId: this.targetId, kind: target.kind });
      agent.intent = this.workIntent();
      return 'RUNNING';
    }

    agent.intent = this.workIntent();
    return this.perform(agent, dt, target);
  }

  /** Every terminal path (SUCCESS/FAILURE) releases the reservation itself —
   *  runReasoner only calls abort() when an activity is REPLACED, never on
   *  its own clean SUCCESS/FAILURE (Reasoner.ts's own runReasoner just nulls
   *  currentActivity/currentActionId then). Without this, a completed
   *  gather would hold its slot on the node forever, and — since a tree
   *  only has 2 slots — the second completion would permanently block every
   *  future reservation on it. */
  protected finish(agent: Agent, status: ActivityStatus): ActivityStatus {
    if (this.targetId && this.reserved) targetRegistry.release(this.targetId, this.slotKind, agent.id);
    agent.bb.reservation = null;
    clearWorkSignal(agent.id);
    return status;
  }

  abort(agent: Agent): void {
    if (this.targetId && this.reserved) targetRegistry.release(this.targetId, this.slotKind, agent.id);
    agent.bb.reservation = null;
    clearWorkSignal(agent.id);
    agent.intent = null;
    // §3.5: abort does NOT clear carrying — whatever was already banked survives
  }
}
