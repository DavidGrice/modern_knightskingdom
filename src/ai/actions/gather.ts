// PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.7 / PHASE_2_NAVIGATION_AND_GATHERING.md
// §3.4-§3.5 — gather_resource: reserve -> resolve anchor -> face -> a real
// swing loop, the first Activity in this project with an internal multi-
// phase state machine (flee/sleep's own Activities are a single MOVE_TO,
// nothing to sequence). Mirrors GotoAndUse's shape from NPC_AI_SPEC.md §3.
// CLN-15: that skeleton is shared now (workActivity.ts) with the two
// Activities that copied it, haul.ts and farm.ts; the swing loop is what is
// left here.
//
// Registered live as of 5.8a — §4's workSignal now lets tickVillagers trust
// this Activity's real presence instead of its own proximity heuristic, so
// running alongside Villagers.tsx's "Phase 24B" worksite cascade and
// tickVillagers' own per-trip timer is safe (see workSignal.ts's own header
// and villagerAtWork()'s new early-return in gameStore.ts). `carrying`'s
// economic effect (HaulToDeposit's addItems() call) stays gated off until
// 5.8b — see haul.ts's own CARRYING_ENABLED flag.
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { isWorkingHours, JOB_NODE_KIND } from '@/game/data/villagers';
import { GROUND_BY_ID, groundOpen } from '@/game/data/grounds';
import type { ItemId } from '@/game/types';
import { targetRegistry, type Target } from '../core/TargetRegistry';
import type { Agent, Intent } from '../core/Agent';
import type { Action, ActivityStatus } from '../core/Reasoner';
import { BOOL_CURVE, NOT_THREATENED_CURVE, type Curve } from '../core/curves';
import { WorkActivity, proximityInput } from './workActivity';

const SLOT_KIND = 'gather';
const SWING_INTERVAL = 1.2; // seconds per swing — no player-side reference left to match (harvestNode now empties a node in one action); chosen for a readable cadence against anim_g_swordswish

// Which trade claims which node kind. Wave 10 · this was a private
// JOB_RESOURCE_MAP literal here holding only lumberjack->tree/miner->rock,
// with herb/fishing documented as "permanently gated to 0 via job_match until
// a job claims them" — two jobs now do (herbalist/fisherman, data/
// villagers.ts), so the table moved next to JOBS itself as JOB_NODE_KIND and
// is shared with villagerAtWork()/Villagers.tsx's worksite walk rather than
// hand-copied into each. Nothing about this Activity needed changing for the
// two new kinds: gatherSwing's own item ternary and NODE_ITEM below already
// covered 'herb'/'fishing' from the start — the gap really was only ever at
// the job-definition layer.
const NODE_ITEM: Record<string, ItemId> = { tree: 'wood', rock: 'stone', herb: 'herb', fishing: 'fish' };

// Node kinds only — 'farmplot' is deliberately NOT here. Wave 10 resolved
// PHASE_2 §1.1's open question by looking at what a farmplot actually is: a
// PlacedBuilding whose readiness lives in `st.plots` as a countdown, worked
// through a plant -> wait -> harvest cycle, with no hitsLeft to swing at and
// no respawnAt to wait on. Forcing it through this Activity was never one
// flag away — `target.source !== 'node'` fails it on the first tick, every
// tick. It has its own Activity now (ai/actions/farm.ts, `tend_farmplot`),
// which is the shape a timer-based resource actually wants; the old
// FARMPLOT_GATHER_ENABLED flag is gone with the question it was holding open.
const TARGET_KINDS = ['tree', 'rock', 'herb', 'fishing'];

class GatherAtNodeActivity extends WorkActivity {
  protected readonly slotKind = SLOT_KIND;
  protected readonly source = 'node';
  private swingTimer = 0;

  protected beginWork(): void {
    this.swingTimer = 0;
  }

  protected workIntent(): Intent {
    return { type: 'PLAY_ANIM', clip: 'anim_g_swordswish', loop: true, anchored: true };
  }

  /** the swing loop: one unit a swing, until the sack is full or the node is spent */
  protected perform(agent: Agent, dt: number, target: Target): ActivityStatus {
    const cap = agent.bb.carryCapacity;
    if (cap <= 0) return this.finish(agent, 'SUCCESS');
    const expectedItem = NODE_ITEM[target.kind];
    if (!expectedItem) return this.finish(agent, 'FAILURE');
    // a mismatched sack (job reassigned mid-gather) can't take this node's
    // resource — bank what's already there and stop, don't mix or discard
    if (agent.bb.carrying && agent.bb.carrying.resource !== expectedItem) return this.finish(agent, 'SUCCESS');

    // Wave 10 · the WORKING leg of a trip scales with the same trip-duration
    // multiplier Locomotion now applies to the walking leg (bb.tripSpeedMult
    // — Diligence, trade mastery, a Swift Return trait). This matters more
    // than the walk for a veteran, not less: carryCapacityOf already rewards
    // trade mastery with a bigger sack (up to ~30), and at a flat 1.2s a swing
    // that is 36 straight seconds of standing still swinging — the single
    // largest block in the 150-200s worst case ROADMAP.md flagged. Scaling
    // both legs by one number keeps "a gifted veteran works nearly twice as
    // fast" (attributes.ts's own words) true of the whole trip rather than of
    // a timer that no longer exists for AI-driven villagers.
    const swingInterval = SWING_INTERVAL * (agent.bb.tripSpeedMult > 0 ? agent.bb.tripSpeedMult : 1);
    this.swingTimer += dt;
    if (this.swingTimer < swingInterval) return 'RUNNING';
    this.swingTimer -= swingInterval;

    const result = useGameStore.getState().gatherSwing(target.id.slice(5));
    if (!result) return this.finish(agent, 'SUCCESS'); // depleted/vanished exactly on this swing
    const amount = Math.min(cap, (agent.bb.carrying?.amount ?? 0) + result.amount);
    agent.bb.carrying = { resource: result.item, amount };
    if (amount >= cap) return this.finish(agent, 'SUCCESS'); // capacity — §3.5's first SUCCESS case

    // §3.5's second SUCCESS case: hitsLeft<=0 or respawnAt!==null (a
    // partial load), re-checked fresh after the swing that may have caused it
    const after = targetRegistry.get(target.id);
    if (!after || !after.available) return this.finish(agent, 'SUCCESS');
    return 'RUNNING';
  }
}

const identityCurve: Curve = { type: 'linear', m: 1, k: 0, b: 0, c: 0 };
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
      // §1.1/2.8's own confirmed id-space collision: 'tree' is BOTH a real
      // node kind AND a real buildable id ("Garden Tree"). TargetRegistry.
      // queryNearby matches by bare kind string across both sources, so a
      // player's decorative Garden Tree co-located with a real tree node
      // would otherwise generate an equally job_match=1, target_usable=1
      // candidate — winning the scoring contest sometimes, only for
      // GatherAtNodeActivity's own `target.source !== 'node'` guard to fail
      // it every single tick with nothing to stop the SAME building
      // candidate winning again next tick (cooldown is 0). Gating the
      // WHOLE action to 0 here, at the source, is the real fix — the
      // Activity's own guard stays as defense in depth, not the only line.
      name: 'job_match',
      input: (agent, ctx) =>
        ctx.target && ctx.target.source === 'node' && agent.bb.job && JOB_NODE_KIND[agent.bb.job] === ctx.target.kind ? 1 : 0,
      curve: BOOL_CURVE,
    },
    {
      // Reported 2026-07-30: AI villagers were harvesting nodes on grounds
      // the player hadn't unlocked yet — this Action never checked deed
      // ownership at all, unlike PlayerController's own interact prompt
      // (`groundOpen(gr, st.landTier)`), the exact "player-side gate never
      // ported to the AI path" shape already flagged elsewhere in this
      // project. A node with no `ground` (starter area, open-water fishing,
      // road-verge trees) stays ungated, matching the player's own rule.
      name: 'target_usable',
      input: (agent, ctx) => {
        if (!ctx.target?.available) return 0;
        if (ctx.target.ground) {
          const gr = GROUND_BY_ID[ctx.target.ground];
          if (gr && !groundOpen(gr, useGameStore.getState().landTier)) return 0;
        }
        const blockedUntil = agent.bb.blockedTargets.get(ctx.target.id);
        if (blockedUntil === undefined) return 1;
        if (blockedUntil > ctx.now) return 0;
        // Performance pass (2026-07-28): expired entries were never
        // removed, only ever ignored once past their timestamp — unlike
        // bb.cooldowns (keyed by the small, fixed set of action ids, so
        // inherently bounded), this map is keyed by TARGET id, and every
        // node/building an agent ever failed to reach over a whole session
        // stayed in it forever. Opportunistic: cleaned up the next time
        // this exact target is actually re-evaluated, not on a timer.
        agent.bb.blockedTargets.delete(ctx.target.id);
        return 1;
      },
      curve: BOOL_CURVE,
    },
    { name: 'is_work_hours', input: () => (isWorkingHours(worldEnv.time) ? 1 : 0), curve: BOOL_CURVE },
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: NOT_THREATENED_CURVE },
    { name: 'proximity', input: (agent, ctx) => proximityInput(agent, ctx), curve: proximityCurve },
    { name: 'energy', input: (agent) => agent.bb.needs.energy, curve: energyCurve },
  ],
  createActivity: () => new GatherAtNodeActivity(),
};
