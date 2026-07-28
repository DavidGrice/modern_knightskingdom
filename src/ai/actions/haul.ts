// PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.7 / PHASE_2_NAVIGATION_AND_GATHERING.md
// §3.4-§3.5 — haul_to_deposit: reserve -> resolve anchor -> face -> deposit.
// Candidate assembly already picks the nearest usable stockpile/barrel via
// per-target expansion + the proximity/target_usable considerations, so this
// Activity doesn't hunt for one itself — it just acts on whichever target
// won (ctx.target).
//
// Registered live as of 5.8a (src/ai/actions/index.ts) — see workSignal.ts's
// own header for why that's now safe. §4's own two-step plan kept
// `carrying`'s economic effect gated off through 5.8a (CARRYING_ENABLED was
// false); 5.8b flips it here for real, §4's own "deliberate economy change"
// — net daily income now drops by real haul travel time, accepted as a
// real cost rather than compensated (confirmed with the user during phase-5
// validation, before any of this was built). A real completed deposit also
// grants trade-mastery xp via awardTradeXp() (gameStore.ts), the same flat
// +10 tickVillagers grants per completed timer-trip — extracted into its
// own reusable store action specifically so an AI-migrated villager doesn't
// silently stop leveling once tickVillagers stops granting it for them
// (gameStore.ts's own workSignal-active skip, added alongside this). The
// Might/Craft/Wit trip-bonus rolls tickVillagers still has are deliberately
// NOT ported here — see ROADMAP.md.
import { useGameStore } from '@/game/store/gameStore';
import { setWorkSignal, clearWorkSignal } from '@/game/workSignal';
import { targetRegistry, type TargetId } from '../core/TargetRegistry';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

const SLOT_KIND = 'haul';
const PROXIMITY_RANGE = 40; // matches assembleCandidates's own default queryRadius
// how long anim_c_pleased holds before the deposit actually lands — without
// this the Activity would enter 'perform' and complete on the very same
// tick, so the clip would never render even one frame
const PERFORM_HOLD = 0.6;
// flipped true in 5.8b — see this file's own header
const CARRYING_ENABLED = true;

class HaulToDepositActivity implements Activity {
  private phase: 'travel' | 'align' | 'perform' = 'travel';
  private travelStepped = false;
  private holdTimer = 0;
  private targetId: TargetId | null = null;
  /** same reasoning as GatherAtNodeActivity's own `reserved` field — see
   *  that Activity's comment */
  private reserved = false;

  start(agent: Agent, ctx: Context): void {
    if (!ctx.target) return;
    this.targetId = ctx.target.id;
    this.phase = 'travel';
    this.travelStepped = false;
    this.holdTimer = 0;
    this.reserved = targetRegistry.reserve(ctx.target.id, SLOT_KIND, agent.id);
    if (!this.reserved) return; // update() fails cleanly on the next tick
    agent.bb.reservation = { targetId: ctx.target.id, slotKind: SLOT_KIND };
    agent.intent = { type: 'MOVE_TO_ANCHOR', targetId: ctx.target.id, anchorName: 'default', speed: 'walk' };
  }

  update(agent: Agent, dt: number): ActivityStatus {
    if (!this.targetId) return 'FAILURE';
    if (!this.reserved) return 'FAILURE'; // nothing to release — never held a slot
    const target = targetRegistry.get(this.targetId);
    if (!target) return this.finish(agent, 'FAILURE');

    if (this.phase === 'travel') {
      // same staleness reasoning as GatherAtNode's own 'travel' phase — see
      // that Activity's comment
      if (!this.travelStepped) { this.travelStepped = true; return 'RUNNING'; }
      if (agent.bb.movement.status === 'blocked') return this.finish(agent, 'FAILURE');
      if (agent.bb.movement.status === 'arrived') {
        this.phase = 'align';
        agent.intent = { type: 'FACE', target: { x: target.x, z: target.z } };
      }
      return 'RUNNING';
    }

    if (this.phase === 'align') {
      // same one-tick align as GatherAtNode — see that Activity's own
      // comment for why there is no "turn finished" signal to wait on
      this.phase = 'perform';
      this.holdTimer = 0;
      setWorkSignal(agent.id, { active: true, targetId: this.targetId, kind: target.kind });
      agent.intent = { type: 'PLAY_ANIM', clip: 'anim_c_pleased', loop: false, anchored: true };
      return 'RUNNING';
    }

    // perform — a one-shot deposit, no swing loop
    agent.intent = { type: 'PLAY_ANIM', clip: 'anim_c_pleased', loop: false, anchored: true };
    this.holdTimer += dt;
    if (this.holdTimer < PERFORM_HOLD) return 'RUNNING';
    if (!agent.bb.carrying) return this.finish(agent, 'SUCCESS'); // nothing to deposit — is_carrying gates this, shouldn't happen
    if (CARRYING_ENABLED) {
      // §3.5/§4: transfer via addItems(), never a direct inventory write —
      // addItems also feeds lifetime stats, mastery and deeds
      useGameStore.getState().addItems({ [agent.bb.carrying.resource]: agent.bb.carrying.amount }, 'gather');
      // one completed haul stands in for tickVillagers' own "one completed
      // trip" for trade-mastery purposes — see this file's own header
      useGameStore.getState().awardTradeXp(agent.id, 10);
    }
    agent.bb.carrying = null;
    return this.finish(agent, 'SUCCESS');
  }

  /** Same reasoning as GatherAtNodeActivity's own finish() — every terminal
   *  path releases the reservation itself, since runReasoner's own cleanup
   *  on a clean SUCCESS/FAILURE never calls abort(). */
  private finish(agent: Agent, status: ActivityStatus): ActivityStatus {
    if (this.targetId && this.reserved) targetRegistry.release(this.targetId, SLOT_KIND, agent.id);
    agent.bb.reservation = null;
    clearWorkSignal(agent.id);
    return status;
  }

  abort(agent: Agent): void {
    if (this.targetId && this.reserved) targetRegistry.release(this.targetId, SLOT_KIND, agent.id);
    agent.bb.reservation = null;
    clearWorkSignal(agent.id);
    agent.intent = null;
    // carrying survives an aborted haul too, same rule as GatherAtNode
  }
}

function proximityInput(agent: Agent, ctx: Context): number {
  if (!ctx.target) return 0;
  const dx = ctx.target.x - agent.position.x;
  const dz = ctx.target.z - agent.position.z;
  return Math.min(1, Math.hypot(dx, dz) / PROXIMITY_RANGE);
}

function loadFraction(agent: Agent): number {
  const cap = agent.bb.carryCapacity;
  if (cap <= 0 || !agent.bb.carrying) return 0;
  return Math.min(1, agent.bb.carrying.amount / cap);
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
const loadFractionCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };
const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };
// m=-0.6, not gather's -1 — a full villager should cross the map to deposit
// rather than idle beside an unusable tree (PHASE_2 §3.4's own reasoning)
const proximityCurve: Curve = { type: 'linear', m: -0.6, k: 0, b: 1, c: 0 };

export const HAUL_TO_DEPOSIT: Action = {
  id: 'haul_to_deposit',
  category: 'work',
  weight: 1.4, // explicit override of CATEGORY_WEIGHT.work (1.2) — the load-bearing gap PHASE_2 §3.4 calls out; must cross gather_resource's score once a sack fills
  interruptPriority: 1, // CATEGORY_INTERRUPT_PRIORITY.work
  minDuration: 2,
  cooldown: 0,
  targetKinds: ['stockpile', 'barrel'],
  considerations: [
    { name: 'is_carrying', input: (agent) => (agent.bb.carrying ? 1 : 0), curve: boolCurve },
    { name: 'load_fraction', input: (agent) => loadFraction(agent), curve: loadFractionCurve },
    { name: 'target_usable', input: (_agent, ctx) => (ctx.target?.available ? 1 : 0), curve: boolCurve },
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: notThreatenedCurve },
    { name: 'proximity', input: (agent, ctx) => proximityInput(agent, ctx), curve: proximityCurve },
  ],
  createActivity: () => new HaulToDepositActivity(),
};
