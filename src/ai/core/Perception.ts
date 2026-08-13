// NPC_AI_SPEC §6 — the seam `Agent.think()` calls perception through.
//
// This file deliberately contains no sensor logic at all. It exists for one
// reason: `Agent.ts` must not statically import anything that reaches
// `game/navgrid.ts`, and the real vision sensor does (its line-of-sight test
// marches the nav grid — see perception/VisionSensor.ts).
//
// That is not a hypothetical worry. `AgentManager.ts`'s own header documents
// the identical break, confirmed live rather than guessed at: importing
// `Locomotion.ts` (which imports `navgrid.ts`) from a module inside the
// `gameStore -> ... -> AgentManager -> Agent` cycle produced a real
// "Cannot access 'useGameStore' before initialization" crash on every page
// load, because navgrid pulls a chain ending at `difficulty.ts`'s
// module-scope `useGameStore.subscribe(...)`. `next build` compiled it fine;
// only a real load caught it. `Reasoner.ts`'s `registerActions`/`tickReasoner`
// pair solved the same problem for `src/ai/actions` the same way.
//
// So: `Agent.ts` imports THIS module (which imports nothing at runtime — the
// `Agent` import below is type-only and erased), and `src/ai/perception/`
// registers the real implementation at its own module load, reached via
// `AiRuntime.tsx`'s side-effect import. Until that happens `tickSenses` is a
// no-op, which is exactly the behaviour every phase before this one had.

import type { Agent } from './Agent';

/** `now` is AgentManager's game clock; `dt` is the time since this agent's
 *  own previous think (`Agent.think`'s `elapsed`), not a fixed step — belief
 *  decay depends on real elapsed time the same way needs decay does. */
export type SensesTick = (agent: Agent, now: number, dt: number) => void;

let registered: SensesTick | null = null;

/** Called once, at `src/ai/perception/index.ts`'s own module load. */
export function registerSenses(fn: SensesTick): void {
  registered = fn;
}

/** The call `Agent.think()` makes every tick. Inert until registration —
 *  perception throttles ITSELF to the agent's `perceiveHz` internally rather
 *  than making the caller own a second timer, because §6.3's threat
 *  derivation is explicitly "once per THINK tick" while the sensors run at
 *  the slower perceive rate: the two cadences live in one place. */
export function tickSenses(agent: Agent, now: number, dt: number): void {
  registered?.(agent, now, dt);
}
