// PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.6 / PHASE_2_NAVIGATION_AND_GATHERING.md
// §3.4 — flee_to_safety: a utility-gated wrapper around the SAME raid-flee
// behavior Villagers.tsx already had. Target selection is not reinvented
// (HOME_X/HOME_Z, game/data/villagers.ts — the exact point the old cascade
// branch already fled to) — only the DECISION of when to flee moves from a
// hardcoded "if raid" check into the reasoner.
import { useEnemyStore } from '@/game/combat';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';

// matches Villagers.tsx's own former raid-flee arrival threshold exactly
const STOP_DISTANCE = 0.6;

class FleeToSafetyActivity implements Activity {
  start(agent: Agent, _ctx: Context): void {
    agent.intent = { type: 'MOVE_TO', position: { x: HOME_X, z: HOME_Z }, speed: 'run', stopDistance: STOP_DISTANCE };
  }

  update(_agent: Agent, _dt: number, _now: number): ActivityStatus {
    // Stays RUNNING for as long as it keeps winning — this Activity does
    // not decide "the raid is over," the reasoner does: `raid_active`
    // below gates the action's own score to 0 the instant the raid ends,
    // and pickAction's gated-running-action rule (5.6) means minDuration
    // no longer protects it once that happens, so something else wins on
    // the very next tick. Arriving home doesn't end it either — holding
    // position near home for the rest of the raid is the same behavior
    // the old cascade already had (it stopped moving once close enough,
    // it didn't stop reacting to the raid).
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}

const boolCurve = { type: 'bool' as const, m: 0, k: 0, b: 0, c: 0 };

export const FLEE_TO_SAFETY: Action = {
  id: 'flee_to_safety',
  category: 'survival',
  weight: 4.0, // CATEGORY_WEIGHT.survival
  interruptPriority: 10, // CATEGORY_INTERRUPT_PRIORITY.survival — nothing else in this table can preempt it
  minDuration: 2,
  cooldown: 0,
  considerations: [
    {
      name: 'raid_active',
      input: () => (useEnemyStore.getState().enemies.some((e) => e.raid) ? 1 : 0),
      curve: boolCurve,
    },
  ],
  createActivity: () => new FleeToSafetyActivity(),
};
