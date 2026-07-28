// NPC_AI_SPEC.md §5.1 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.6/§5.7 —
// the real content registry. Reached via `AiRuntime.tsx`'s side-effect
// import (deliberately NOT imported by `Agent.ts` directly — that path
// broke the app with a real circular-import TDZ error, see `Reasoner.ts`'s
// `tickReasoner`/`registerActions` for the full story). `gather_resource`/
// `haul_to_deposit` (5.7) still need to be added here once they exist.
import { registerActions, type Action } from '../core/Reasoner';
import { FLEE_TO_SAFETY } from './flee';
import { SLEEP } from './sleep';

export const ACTIONS: Action[] = [FLEE_TO_SAFETY, SLEEP];
registerActions(ACTIONS);
