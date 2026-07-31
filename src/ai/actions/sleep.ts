// PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.6 / PHASE_2_NAVIGATION_AND_GATHERING.md
// §3.4 — sleep: a utility-gated wrapper around the SAME night-bed-seek
// behavior Villagers.tsx already had. Bed/target selection is not
// reinvented (`gameStore.claimBed` — a persisted per-bed claim, requested
// 2026-07-30 to replace the old roster-rank assignment this cascade branch
// used to compute inline) — only the DECISION of when to sleep moves from a
// hardcoded "if night" check into the reasoner.
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { setWorkSignal, clearWorkSignal } from '@/game/workSignal';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';

// matches Villagers.tsx's own former night-bed-seek arrival threshold exactly
const STOP_DISTANCE = 0.6;

class SleepActivity implements Activity {
  start(agent: Agent, _ctx: Context): void {
    const spot = useGameStore.getState().claimBed(agent.id);
    agent.intent = { type: 'MOVE_TO', position: spot, speed: 'walk', stopDistance: STOP_DISTANCE };
    // Reported 2026-07-30: gameStore.ts's legacy tickVillagers timer kept
    // crediting completed hauls (and firing the "hauled supplies" notify)
    // for villagers actually asleep in bed — it only ever trusted
    // workSignals for an ACTIVE gather/haul, never learned this reasoner
    // put someone to bed, so its own proximity fallback just saw "near
    // home" and assumed working. Same signal channel gather.ts/haul.ts
    // already publish through, so villagerAtWork() has one place to check
    // rather than a second parallel "is asleep" query.
    setWorkSignal(agent.id, { active: true, targetId: null, kind: 'sleep' });
  }

  update(_agent: Agent, _dt: number, _now: number): ActivityStatus {
    // Same reasoning as FleeToSafetyActivity: stays RUNNING for as long as
    // it keeps winning. `is_night` gates the action's own score to 0 at
    // dawn, and pickAction's gated-running-action rule (5.6) means
    // minDuration stops protecting it the instant that happens, so
    // something else wins the very next tick — this Activity doesn't
    // decide "morning," the reasoner does.
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
    clearWorkSignal(agent.id);
  }
}

const boolCurve = { type: 'bool' as const, m: 0, k: 0, b: 0, c: 0 };
// tiredness modulates HOW STRONGLY sleep is wanted once it's night — a
// quadratic curve, not a bool: needs.energy rarely sits at exactly 1.0
// except right at spawn, so a hard gate here would make sleep score zero
// almost all the time. is_night is the hard on/off switch; this is not.
const tirednessCurve = { type: 'quadratic' as const, m: 1, k: 0.5, b: 0, c: 0 };

export const SLEEP: Action = {
  id: 'sleep',
  category: 'needs',
  weight: 1.0, // CATEGORY_WEIGHT.needs
  interruptPriority: 3, // §5.6's own explicit override of needs' CATEGORY_INTERRUPT_PRIORITY default (1) — high enough to override casual work, well below flee_to_safety's 10
  minDuration: 2,
  cooldown: 0,
  considerations: [
    { name: 'is_night', input: () => (worldEnv.night > 0.6 ? 1 : 0), curve: boolCurve },
    { name: 'tired', input: (agent) => 1 - agent.bb.needs.energy, curve: tirednessCurve },
  ],
  createActivity: () => new SleepActivity(),
};
