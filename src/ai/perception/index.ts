// NPC_AI_SPEC §6 — the perception layer's registration point.
//
// Exactly the same shape as `src/ai/actions/index.ts`: this module calls
// `registerSenses()` at its own load, and is reached by a side-effect import
// from `AiRuntime.tsx`. `Agent.ts` never imports anything under this
// directory — see `core/Perception.ts`'s header for the real, previously-
// crashed circular import that rule exists to avoid.

import { registerSenses } from '../core/Perception';
import { updateSenses, reportAgentDamaged } from './Senses';
import { emitSound, resetSounds } from './sounds';
import { peekPerceptionState } from './state';

registerSenses(updateSenses);

export { updateSenses, reportAgentDamaged, emitSound, resetSounds, peekPerceptionState };

if (typeof window !== 'undefined') {
  // matches the project's existing AI smoke-test handles (__kkai, __kkreason,
  // __kkactions) — a live perception read is the only way to check a vision
  // cone against a real running scene
  (window as unknown as Record<string, unknown>).__kkperception = {
    updateSenses, reportAgentDamaged, emitSound, resetSounds, peekPerceptionState,
  };
}
