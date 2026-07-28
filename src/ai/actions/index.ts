// NPC_AI_SPEC.md §5.1 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.6/§5.7 —
// the real content registry. Reached via `AiRuntime.tsx`'s side-effect
// import (deliberately NOT imported by `Agent.ts` directly — that path
// broke the app with a real circular-import TDZ error, see `Reasoner.ts`'s
// `tickReasoner`/`registerActions` for the full story).
//
// `gather_resource`/`haul_to_deposit` (5.7, gather.ts/haul.ts) are built and
// correct but deliberately NOT in ACTIONS below — PHASE_2_NAVIGATION_AND_
// GATHERING.md §4's economy split (5.8a/5.8b) is what makes registering them
// safe. Villagers.tsx's "Phase 24B" worksite cascade and tickVillagers' own
// villagerAtWork()/per-trip timer are both still the live source of truth
// for job-holding villagers; registering these now would let a real
// GatherAtNode/HaulToDeposit run alongside them for the same villager, with
// two independent systems steering movement and HaulToDeposit's addItems()
// double-granting on top of tickVillagers' own yield. 5.8a wires workSignal
// so tickVillagers can trust AI presence instead of its own hand-rolled
// check (and is where these two actually join ACTIONS); 5.8b enables
// `carrying` for real. Until then, exercised only via direct runReasoner()
// calls against window.__kkactions below — same isolated-testing approach
// 5.1-5.5 used before real content existed to register.
import { registerActions, type Action } from '../core/Reasoner';
import { FLEE_TO_SAFETY } from './flee';
import { SLEEP } from './sleep';
import { GATHER_RESOURCE } from './gather';
import { HAUL_TO_DEPOSIT } from './haul';

export const ACTIONS: Action[] = [FLEE_TO_SAFETY, SLEEP];
registerActions(ACTIONS);

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkactions = {
    FLEE_TO_SAFETY, SLEEP, GATHER_RESOURCE, HAUL_TO_DEPOSIT,
  };
}
