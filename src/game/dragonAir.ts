'use client';
// Wave 57 (F5) · dragonAir/dragonAirBlack, extracted out of DragonOmen.tsx
// into their own zero-dependency leaf module — mirrors game/defenders.ts's
// own `defenderState` pattern (a plain mutable singleton, no store, no
// component). Needed so a plain reasoner Action (ai/actions/flee.ts) can
// read the dragon's live hostile/position state without importing a .tsx
// component file into the AI action graph: gameStore.ts already imports
// ai/core/AgentManager -> Agent.ts -> Reasoner.ts -> this action registry
// (a documented, tolerated cycle — see navgrid.ts's own AgentSnapshot
// comment), and flee.ts -> DragonOmen.tsx -> useGameStore would have
// extended that cycle into a component file, against this codebase's own
// demonstrated grain (that same comment keeps ai/core/Agent OUT of
// navgrid.ts for exactly this reason).
//
// DragonOmen.tsx re-exports both from here unchanged, so nothing about its
// own public surface changes.

/** One dragon in the air at a time — the omen and the siege both check this.
 *  G26 · the siege also publishes WHERE it is each frame, so defenders on the
 *  ground can look up and shoot at it instead of ignoring a target simply
 *  because it is not standing on the floor. */
export const dragonAir = {
  busy: false,
  /** true while the siege dragon is circling and can be shot at */
  hostile: false,
  x: 0, y: 0, z: 0,
  /** the siege owns the hit count; this is how anything else lands one */
  hit: null as null | ((source: string) => void),
};
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkdragonAir = dragonAir;

/** Wave 36 (A8) · the black dragon's own mirror of dragonAir — Cedric's own
 *  beast (BlackDragonSiege.tsx) fights entirely independently of the green
 *  dragon above, so ground defenders/the coordination guard each need a
 *  second copy of the same "where is it, can it be hit" state rather than
 *  the two beasts fighting over one. */
export const dragonAirBlack = {
  busy: false,
  hostile: false,
  x: 0, y: 0, z: 0,
  hit: null as null | ((source: string) => void),
};
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkdragonAirBlack = dragonAirBlack;
