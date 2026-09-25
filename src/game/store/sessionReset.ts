// CLN-04 · every leaf-module reset a fresh session needs, in one place.
//
// Imported ONLY by gameStore.ts (nothing here may import gameStore.ts — see the
// TDZ history in its homeGroundY comment). Modules that must reset but cannot be
// imported from here because they import gameStore.ts themselves register through
// ./sessionHooks instead (combat.ts — enemies, ram, ladder, player vitals — and
// cedricSiege.ts).
//
// None of this touches Zustand state. Everything here is module state that must
// forget the last session before a new one starts reading it. Resets that hand a
// component-held object (defenderState entry, villager combat record, ridingState)
// mutate IN PLACE — see each module's own doc for the mounted-component reasoning.
import type { Villager } from '../types';
import { resetPlayerState } from '../playerState';
import { agentManager } from '@/ai/core/AgentManager';
import { resetVillagerAgentSync } from '@/ai/rosterSync';
import { resetNpcAgentSync } from '@/ai/npcSync';
import { resetCourtAmbientAgentSync } from '@/ai/courtAmbientSync';
import { resetCompanionAgentSync } from '@/ai/companionSync';
import { resetWildlifeAgentSync } from '@/ai/wildlifeSync';
import { targetRegistry } from '@/ai/core/TargetRegistry';
import { resetSounds } from '@/ai/perception/sounds';
import { clearAllWorkSignals } from '../workSignal';
import { COMPANION_ID } from '../data/companion';
import { resetCompanionCombat } from '../companion';
import { resetDefenders } from '../defenders';
import { resetVillagerCombat } from '../villagerCombat';
import { resetRiding } from '../riding';
import { resetDragonAir } from '../dragonAir';
import { endArenaRun } from '../arena';
import { runSessionResetHooks } from './sessionHooks';

/** `next` is the roster the new session starts with ([] for a new game): a
 *  defenderState entry is kept (reset in place) only if its id is a defender
 *  there, so a mounted DefenderFigure keeps the object enemies look up. */
export function resetSessionModules(next: { villagers: readonly Villager[] }): void {
  resetPlayerState();
  // the AI registry is module state: a new session must not inherit the
  // last one's agents, clock, half-drained needs — or (clearHooks) the
  // per-agent steering/perception/combat bookkeeping keyed by villager id
  agentManager.clear();
  resetVillagerAgentSync();
  resetNpcAgentSync();
  resetCourtAmbientAgentSync();
  resetCompanionAgentSync();
  resetWildlifeAgentSync();
  // Tam's own combat state is keyed by a FIXED id (unlike a roster villager's)
  resetCompanionCombat(COMPANION_ID);
  targetRegistry.clear();
  resetSounds();
  clearAllWorkSignals();

  resetDefenders(new Set(next.villagers.filter((v) => v.job === 'defender').map((v) => v.id)));
  resetVillagerCombat();
  resetRiding();
  resetDragonAir();
  endArenaRun();
  // combat.ts (enemies + ram/ladder + player vitals), cedricSiege.ts
  runSessionResetHooks();
}
