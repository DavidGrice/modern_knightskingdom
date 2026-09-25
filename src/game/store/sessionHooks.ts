// CLN-04 · the session-reset registration seam.
//
// A TRUE leaf: zero imports, so ANY module — including one that itself imports
// gameStore.ts (combat.ts, cedricSiege.ts) — can register here
// without adding an edge to the import graph. Same role and dependency direction
// as AgentManager.ts's `despawnHooks` (and the same reason: gameStore.ts cannot
// import those modules back without re-closing the cycle behind the historical
// "Cannot access 'useGameStore' before initialization" crash).
//
// A hook runs once per session start (newGame / startNewGamePlus / loadFromSave),
// from resetSessionModules, BEFORE the new state patch lands. It must only reset
// module state the registrant owns. A module that has not loaded yet has nothing
// stale to reset, so registration-at-module-scope is complete by construction.
const hooks: (() => void)[] = [];

export function onSessionReset(fn: () => void): void {
  hooks.push(fn);
}

export function runSessionResetHooks(): void {
  for (const fn of hooks) fn();
}
