// PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.7 / PHASE_2_NAVIGATION_AND_GATHERING.md
// §3.4-§3.5 — gather_resource: reserve -> resolve anchor -> face -> a real
// swing loop, the first Activity in this project with an internal multi-
// phase state machine (flee/sleep's own Activities are a single MOVE_TO,
// nothing to sequence). Mirrors GotoAndUse's shape from NPC_AI_SPEC.md §3.
//
// Deliberately NOT added to src/ai/actions/index.ts's live ACTIONS list —
// see that file's own comment for why: registering this now, before 5.8a's
// workSignal reconciliation exists, would let a job-holding villager's real
// movement fight Villagers.tsx's still-active "Phase 24B" worksite cascade,
// and would let HaulToDeposit's addItems() call double-grant on top of
// tickVillagers' own still-running per-trip yield. Exported and exposed on
// window.__kkactions for direct, isolated testing in the meantime (same
// approach 5.1-5.5 used before real content existed to register).
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { isWorkingHours } from '@/game/data/villagers';
import type { ItemId, VillagerJob } from '@/game/types';
import { targetRegistry, type TargetId } from '../core/TargetRegistry';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

const SLOT_KIND = 'gather';
const SWING_INTERVAL = 1.2; // seconds per swing — no player-side reference left to match (harvestNode now empties a node in one action); chosen for a readable cadence against anim_g_swordswish
const PROXIMITY_RANGE = 40; // matches assembleCandidates's own default queryRadius

// Only kinds with an obvious 1:1 job AND a real ResourceNodeState kind today
// (game/types.ts: 'tree'|'rock'|'fishing'|'herb', no 'farmplot' — that's a
// building, farmer's own case, excluded below per §1.1). herb/fishing have
// no job that claims them yet (no herbalist/fisherman job exists in JOBS,
// game/data/villagers.ts) — present in TARGET_KINDS so real candidates get
// generated, permanently gated to 0 via job_match until a job claims them,
// same "content gap found, not invented" shape this project has hit before.
const JOB_RESOURCE_MAP: Partial<Record<VillagerJob, string>> = {
  lumberjack: 'tree',
  miner: 'rock',
};

const NODE_ITEM: Record<string, ItemId> = { tree: 'wood', rock: 'stone', herb: 'herb', fishing: 'fish' };

// farmplot stays behind this flag pending §1.1's open question (does it even
// yield a carryable resource, or is farming maintenance-only) — PHASE_2's
// own explicit instruction, not an oversight.
const FARMPLOT_GATHER_ENABLED = false;
const TARGET_KINDS = FARMPLOT_GATHER_ENABLED
  ? ['tree', 'rock', 'herb', 'fishing', 'farmplot']
  : ['tree', 'rock', 'herb', 'fishing'];

class GatherAtNodeActivity implements Activity {
  private phase: 'travel' | 'align' | 'perform' = 'travel';
  private travelStepped = false;
  private swingTimer = 0;
  private targetId: TargetId | null = null;

  start(agent: Agent, ctx: Context): void {
    if (!ctx.target) return;
    this.targetId = ctx.target.id;
    this.phase = 'travel';
    this.travelStepped = false;
    this.swingTimer = 0;
    targetRegistry.reserve(ctx.target.id, SLOT_KIND, agent.id);
    agent.bb.reservation = { targetId: ctx.target.id, slotKind: SLOT_KIND };
    agent.intent = { type: 'MOVE_TO_ANCHOR', targetId: ctx.target.id, anchorName: 'default', speed: 'walk' };
  }

  update(agent: Agent, dt: number): ActivityStatus {
    if (!this.targetId) return 'FAILURE';
    const target = targetRegistry.get(this.targetId);
    if (!target || target.source !== 'node') return this.finish(agent, 'FAILURE');

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
      if (agent.bb.movement.status === 'blocked') return this.finish(agent, 'FAILURE');
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
      // the honest choice, not a shortcut: the swing anim starts a couple
      // of frames before the turn visually settles, which reads fine.
      this.phase = 'perform';
      agent.intent = { type: 'PLAY_ANIM', clip: 'anim_g_swordswish', loop: true, anchored: true };
      return 'RUNNING';
    }

    // perform
    agent.intent = { type: 'PLAY_ANIM', clip: 'anim_g_swordswish', loop: true, anchored: true };
    const cap = agent.bb.carryCapacity;
    if (cap <= 0) return this.finish(agent, 'SUCCESS');
    const expectedItem = NODE_ITEM[target.kind];
    if (!expectedItem) return this.finish(agent, 'FAILURE');
    // a mismatched sack (job reassigned mid-gather) can't take this node's
    // resource — bank what's already there and stop, don't mix or discard
    if (agent.bb.carrying && agent.bb.carrying.resource !== expectedItem) return this.finish(agent, 'SUCCESS');

    this.swingTimer += dt;
    if (this.swingTimer < SWING_INTERVAL) return 'RUNNING';
    this.swingTimer -= SWING_INTERVAL;

    const result = useGameStore.getState().gatherSwing(this.targetId.slice(5));
    if (!result) return this.finish(agent, 'SUCCESS'); // depleted/vanished exactly on this swing
    const amount = Math.min(cap, (agent.bb.carrying?.amount ?? 0) + result.amount);
    agent.bb.carrying = { resource: result.item, amount };
    if (amount >= cap) return this.finish(agent, 'SUCCESS'); // capacity — §3.5's first SUCCESS case

    // §3.5's second SUCCESS case: hitsLeft<=0 or respawnAt!==null (a
    // partial load), re-checked fresh after the swing that may have caused it
    const after = targetRegistry.get(this.targetId);
    if (!after || !after.available) return this.finish(agent, 'SUCCESS');
    return 'RUNNING';
  }

  /** Every terminal path (SUCCESS/FAILURE) releases the reservation itself —
   *  runReasoner only calls abort() when an activity is REPLACED, never on
   *  its own clean SUCCESS/FAILURE (Reasoner.ts's own runReasoner just nulls
   *  currentActivity/currentActionId then). Without this, a completed
   *  gather would hold its slot on the node forever, and — since a tree
   *  only has 2 slots — the second completion would permanently block every
   *  future reservation on it. */
  private finish(agent: Agent, status: ActivityStatus): ActivityStatus {
    if (this.targetId) targetRegistry.release(this.targetId, SLOT_KIND, agent.id);
    agent.bb.reservation = null;
    return status;
  }

  abort(agent: Agent): void {
    if (this.targetId) targetRegistry.release(this.targetId, SLOT_KIND, agent.id);
    agent.bb.reservation = null;
    agent.intent = null;
    // §3.5: abort does NOT clear carrying — whatever was already banked survives
  }
}

function proximityInput(agent: Agent, ctx: Context): number {
  if (!ctx.target) return 0;
  const dx = ctx.target.x - agent.position.x;
  const dz = ctx.target.z - agent.position.z;
  return Math.min(1, Math.hypot(dx, dz) / PROXIMITY_RANGE);
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
const identityCurve: Curve = { type: 'linear', m: 1, k: 0, b: 0, c: 0 };
const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };
const proximityCurve: Curve = { type: 'linear', m: -1, k: 0, b: 1, c: 0 };
const energyCurve: Curve = { type: 'quadratic', m: 1, k: 0.5, b: 0, c: 0 };

export const GATHER_RESOURCE: Action = {
  id: 'gather_resource',
  category: 'work',
  weight: 1.2, // CATEGORY_WEIGHT.work
  interruptPriority: 1, // CATEGORY_INTERRUPT_PRIORITY.work
  minDuration: 3,
  cooldown: 0,
  targetKinds: TARGET_KINDS,
  considerations: [
    {
      name: 'has_capacity',
      input: (agent) => {
        if (agent.bb.carryCapacity <= 0) return 0;
        return Math.max(0, 1 - (agent.bb.carrying?.amount ?? 0) / agent.bb.carryCapacity);
      },
      curve: identityCurve,
    },
    {
      name: 'job_match',
      input: (agent, ctx) =>
        ctx.target && agent.bb.job && JOB_RESOURCE_MAP[agent.bb.job] === ctx.target.kind ? 1 : 0,
      curve: boolCurve,
    },
    { name: 'target_usable', input: (_agent, ctx) => (ctx.target?.available ? 1 : 0), curve: boolCurve },
    { name: 'is_work_hours', input: () => (isWorkingHours(worldEnv.time) ? 1 : 0), curve: boolCurve },
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: notThreatenedCurve },
    { name: 'proximity', input: (agent, ctx) => proximityInput(agent, ctx), curve: proximityCurve },
    { name: 'energy', input: (agent) => agent.bb.needs.energy, curve: energyCurve },
  ],
  createActivity: () => new GatherAtNodeActivity(),
};
