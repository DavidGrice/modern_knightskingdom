// NPC_AI_SPEC.md §5.1 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.6/§5.7 —
// the real, permanent action registry `runReasoner()` (core/Reasoner.ts)
// reads every think tick, wired into `Agent.think()` (5.5). Empty until
// 5.6/5.7 register real actions (`flee_to_safety`, `sleep`,
// `gather_resource`, `haul_to_deposit`) — an empty registry is a safe,
// fully inert default: `assembleCandidates` finds nothing, `pickAction`
// returns null, no agent's behavior changes from today's pre-reasoner
// cascade. 5.5's own synthetic verification deliberately does NOT push
// test actions in here — it calls `runReasoner` directly with its own
// throwaway action list instead, so this registry never needs cleanup
// after a smoke test runs.
import type { Action } from '../core/Reasoner';

export const ACTIONS: Action[] = [];
