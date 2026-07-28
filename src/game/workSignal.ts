// PHASE_2_NAVIGATION_AND_GATHERING.md §4 (phase 5, iteration 5.8a) — the AI's
// real presence, published for tickVillagers to trust instead of its own
// hand-rolled proximity heuristic. A standalone leaf module (no store
// import), per the carts.ts/difficulty.ts pattern — src/ai/actions/gather.ts
// and haul.ts (the writers) and gameStore.ts's villagerAtWork() (the reader)
// can both depend on it without a circular import either direction.
//
// `active` is deliberately narrower than "this agent currently has a work
// Activity running" — it's only true once the agent has actually ARRIVED
// (align/perform phase), never during travel. villagerAtWork()'s existing
// heuristic requires real proximity, not just "assigned"; a workSignal that
// went active the instant travel began would be a strictly WEAKER presence
// check than the one it's replacing, not an equivalent one.
export interface WorkSignal {
  active: boolean;
  targetId: string | null;
  kind: string | null;
}

export const workSignals: Record<string, WorkSignal> = {};

export function setWorkSignal(agentId: string, signal: WorkSignal): void {
  workSignals[agentId] = signal;
}

export function clearWorkSignal(agentId: string): void {
  delete workSignals[agentId];
}

/** Wired into newGame/loadFromSave alongside targetRegistry.clear() — same
 *  reasoning: a stale entry surviving a reset could, if an agent id were
 *  ever reused, mark a brand-new agent as "at work" on its very first tick. */
export function clearAllWorkSignals(): void {
  for (const k of Object.keys(workSignals)) delete workSignals[k];
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkwork = { workSignals, setWorkSignal, clearWorkSignal, clearAllWorkSignals };
}
