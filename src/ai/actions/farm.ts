// Wave 10 · tend_farmplot — the answer to PHASE_2_NAVIGATION_AND_GATHERING.md
// §1.1's open question, which `gather.ts` had been holding open behind
// `FARMPLOT_GATHER_ENABLED = false` ever since ("farmplots regrow on a timer,
// not a hit-count like trees/rocks — the existing GatherAtNodeActivity shape
// doesn't fit them as-is").
//
// THE DESIGN CALL: it doesn't fit, and it shouldn't be made to. A farmplot is
// not a node with a slow respawn — it is a `PlacedBuilding` whose state lives
// in a separate store field (`st.plots[id]`: absent = untilled, > 0 = seconds
// of growth left, 0 = ready) and moves through a real three-step PLANT ->
// WAIT -> HARVEST cycle that the player drives by hand. There is no
// `hitsLeft` to swing at, no `respawnAt` to wait on, and — the part that
// settles it — a farmplot has a state in which the correct behaviour is to
// PUT something in rather than take something out. `GatherAtNodeActivity` has
// no vocabulary for that: its first guard is `target.source !== 'node'`, so
// flipping the old flag would have generated job-matching candidates that
// FAILURE'd on their first tick, forever, with no `blockedTargets` entry to
// even slow the retry loop down. What was actually missing was an Activity
// shaped like the resource, so this is one — deliberately NOT a widening of
// gather's swing loop.
//
// What it reuses rather than reinvents: TargetRegistry's building targets and
// their existing 4-slot radial anchor rule (config/anchors.json already had a
// `farmplot` entry), the same reserve/travel/align/perform skeleton
// gather.ts and haul.ts share (workActivity.ts, since CLN-15), the same workSignal publication so
// `villagerAtWork()` trusts a real activity over its proximity heuristic, and
// the same rule that a yield goes into `bb.carrying` to be hauled — never
// straight into the inventory. That last one is the balance point: a farmer
// whose wheat appeared in the stores the instant they cut it would be the one
// trade paying no travel cost at all, which is exactly the cost 5.8b decided
// to charge everyone.
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { isWorkingHours } from '@/game/data/villagers';
import { targetRegistry, type Target, type TargetId } from '../core/TargetRegistry';
import type { Agent, Intent } from '../core/Agent';
import type { Action, ActivityStatus } from '../core/Reasoner';
import { BOOL_CURVE, NOT_THREATENED_CURVE, type Curve } from '../core/curves';
import { WorkActivity, proximityInput } from './workActivity';

const SLOT_KIND = 'farm';
// One sustained working beat rather than gather's repeated swings: sowing a
// bed or cutting it is a single act with a single outcome, not an accumulating
// one. Scaled by bb.tripSpeedMult like every other work duration in Wave 10,
// so a diligent, well-mastered farmer really does get through their beds
// faster.
const WORK_HOLD = 3;
/** what a cut bed yields — `st.plots` is a wheat field and nothing else today
 *  (gameStore's plantPlot/harvestPlot), so this is a fact about the mechanic,
 *  not a table waiting to grow */
const PLOT_ITEM = 'wheat' as const;

type PlotState = 'untilled' | 'growing' | 'ready' | 'gone';

/** The three-state machine, read in exactly one place so the consideration
 *  that decides whether to walk over and the Activity that acts on arrival can
 *  never disagree about what a plot is doing. `targetId` is a composite
 *  TargetId ('bldg:42'); `st.plots` is keyed by the bare building id. */
function plotStateOf(targetId: TargetId): PlotState {
  const target = targetRegistry.get(targetId);
  if (!target || target.source !== 'building' || target.kind !== 'farmplot' || !target.available) return 'gone';
  const left = useGameStore.getState().plots[targetId.slice(5)];
  if (left === undefined) return 'untilled';
  return left > 0 ? 'growing' : 'ready';
}

class TendFarmplotActivity extends WorkActivity {
  protected readonly slotKind = SLOT_KIND;
  protected readonly source = 'building';
  private holdTimer = 0;

  protected beginWork(): void {
    this.holdTimer = 0;
  }

  protected workIntent(): Intent {
    return { type: 'PLAY_ANIM', clip: 'anim_g_swordswish', loop: true, anchored: true };
  }

  /** one sustained beat, then a single tendPlot() call. Carrying survives an
   *  abort, same rule as GatherAtNode. */
  protected perform(agent: Agent, dt: number, target: Target): ActivityStatus {
    this.holdTimer += dt;
    if (this.holdTimer < WORK_HOLD * (agent.bb.tripSpeedMult > 0 ? agent.bb.tripSpeedMult : 1)) return 'RUNNING';

    // Re-read the plot state HERE, not just at scoring time: this beat took
    // real seconds, and the player may have planted or cut this very bed by
    // hand meanwhile. Checked BEFORE calling tendPlot because the harvest
    // branch is destructive — tendPlot clears the plot and hands the wheat
    // back, so discovering afterwards that there is nowhere to put it would
    // destroy a real crop.
    const state = plotStateOf(target.id);
    if (state === 'gone' || state === 'growing') return this.finish(agent, 'FAILURE');
    if (state === 'ready' && !this.canTakeCrop(agent)) return this.finish(agent, 'SUCCESS');

    const result = useGameStore.getState().tendPlot(target.id.slice(5));
    if (!result) return this.finish(agent, 'FAILURE'); // state changed between the check above and the call
    if (result === 'planted') return this.finish(agent, 'SUCCESS'); // a sown bed is a finished job; the wait is the reasoner's problem, not this Activity's
    const cap = agent.bb.carryCapacity;
    const amount = Math.min(cap, (agent.bb.carrying?.amount ?? 0) + result.amount);
    agent.bb.carrying = { resource: result.item, amount };
    return this.finish(agent, 'SUCCESS');
  }

  /** somewhere to put a cut crop: a sack that isn't full and isn't already
   *  holding a different trade's goods (same "don't mix or discard" rule
   *  GatherAtNode applies to a job reassigned mid-gather) */
  private canTakeCrop(agent: Agent): boolean {
    const cap = agent.bb.carryCapacity;
    if (cap <= 0) return false;
    const load = agent.bb.carrying;
    if (!load) return true;
    return load.resource === PLOT_ITEM && load.amount < cap;
  }
}

const proximityCurve: Curve = { type: 'linear', m: -1, k: 0, b: 1, c: 0 };
const energyCurve: Curve = { type: 'quadratic', m: 1, k: 0.5, b: 0, c: 0 };

export const TEND_FARMPLOT: Action = {
  id: 'tend_farmplot',
  category: 'work',
  weight: 1.2, // CATEGORY_WEIGHT.work — the same standing as gather_resource, which is what this is the farmer's version of; haul_to_deposit's 1.4 still wins once a sack fills
  interruptPriority: 1, // CATEGORY_INTERRUPT_PRIORITY.work
  minDuration: 3,
  cooldown: 0,
  targetKinds: ['farmplot'],
  considerations: [
    {
      // 'farmer' is already a real VillagerJob (unlike Wave 10's new
      // herbalist/fisherman, which needed defining first) — this Action is the
      // farmer's whole reason for existing in the AI economy, since no
      // ResourceNodeState kind produces wheat.
      name: 'job_match',
      input: (agent, ctx) =>
        ctx.target && ctx.target.source === 'building' && ctx.target.kind === 'farmplot' && agent.bb.job === 'farmer' ? 1 : 0,
      curve: BOOL_CURVE,
    },
    {
      // The whole timer-vs-hit-count difference, expressed as one gate. A
      // growing bed is the case a node simply doesn't have: the target is
      // real, built, reachable and job-matched, and there is still nothing
      // whatsoever to do at it for the next few minutes. Scoring 0 (rather
      // than low) means the farmer walks away and finds another bed or another
      // job instead of standing over the seedlings — and re-scores it for free
      // every think tick, so the moment it ripens they head back with no timer,
      // no event and no invalidation anywhere.
      //
      // A ready bed additionally needs somewhere for the crop to GO: a full or
      // mismatched sack gates this off so haul_to_deposit wins instead, which
      // is the same ordering gather_resource's has_capacity enforces. Sowing
      // needs no room at all, so an untilled bed is workable regardless — a
      // farmer with a full sack can still put the next crop in the ground on
      // the way past.
      name: 'plot_workable',
      input: (agent, ctx) => {
        if (!ctx.target?.available) return 0;
        const blockedUntil = agent.bb.blockedTargets.get(ctx.target.id);
        if (blockedUntil !== undefined) {
          if (blockedUntil > ctx.now) return 0;
          agent.bb.blockedTargets.delete(ctx.target.id); // same opportunistic cleanup gather.ts/haul.ts do
        }
        const state = plotStateOf(ctx.target.id);
        if (state === 'untilled') return 1;
        if (state !== 'ready') return 0;
        const cap = agent.bb.carryCapacity;
        if (cap <= 0) return 0;
        const load = agent.bb.carrying;
        if (!load) return 1;
        return load.resource === PLOT_ITEM && load.amount < cap ? 1 : 0;
      },
      curve: BOOL_CURVE,
    },
    { name: 'is_work_hours', input: () => (isWorkingHours(worldEnv.time) ? 1 : 0), curve: BOOL_CURVE },
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: NOT_THREATENED_CURVE },
    { name: 'proximity', input: (agent, ctx) => proximityInput(agent, ctx), curve: proximityCurve },
    { name: 'energy', input: (agent) => agent.bb.needs.energy, curve: energyCurve },
  ],
  createActivity: () => new TendFarmplotActivity(),
};
