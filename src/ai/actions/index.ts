// NPC_AI_SPEC.md §5.1 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.6/§5.7/§5.8a —
// the real content registry. Reached via `AiRuntime.tsx`'s side-effect
// import (deliberately NOT imported by `Agent.ts` directly — that path
// broke the app with a real circular-import TDZ error, see `Reasoner.ts`'s
// `tickReasoner`/`registerActions` for the full story).
//
// `gather_resource`/`haul_to_deposit` (5.7, gather.ts/haul.ts) join the live
// registry as of 5.8a — safe now that `workSignal.ts` lets `tickVillagers`
// trust the AI's real presence instead of its own proximity heuristic
// (`villagerAtWork()`, `gameStore.ts`), so Villagers.tsx's "Phase 24B"
// worksite cascade and this Activity can coexist for the same villager
// without fighting over movement. `HaulToDeposit`'s real yield transfer is
// still gated off (`CARRYING_ENABLED` in haul.ts) until 5.8b.
import { registerActions, type Action } from '../core/Reasoner';
import { FLEE_TO_SAFETY } from './flee';
import { SLEEP } from './sleep';
import { GATHER_RESOURCE } from './gather';
import { HAUL_TO_DEPOSIT } from './haul';

export const ACTIONS: Action[] = [FLEE_TO_SAFETY, SLEEP, GATHER_RESOURCE, HAUL_TO_DEPOSIT];
registerActions(ACTIONS);

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkactions = {
    FLEE_TO_SAFETY, SLEEP, GATHER_RESOURCE, HAUL_TO_DEPOSIT,
  };
}
