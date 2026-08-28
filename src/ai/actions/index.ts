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
//
// Wave 10 adds two: `tend_farmplot` (farm.ts — the farmer's own timer-based
// resource, which `gather_resource` was never shaped to handle) and
// `seek_deposit` (seekDeposit.ts — the AI-native escape from "sack full,
// nothing within haul's query radius", which until now was rescued only by
// accident, by Villagers.tsx's unrelated legacy cascade). Both are also added
// to the villager archetype's `intrinsic` list (config/archetypes.json) —
// `assembleCandidates` silently skips any registered action an archetype was
// never offered, so registering alone would have made both permanently inert.
//
// Wave 11 / phase 7 adds the first two `combat`-category actions this registry
// has ever held — `take_cover` (takeCover.ts) and `engage_threat`
// (engageThreat.ts). Both category values (`CATEGORY_WEIGHT.combat` 3.0,
// `CATEGORY_INTERRUPT_PRIORITY.combat` 8) have been defined in `Reasoner.ts`
// since phase 5 and used by nothing until now. `take_cover` is also added to
// the villager archetype's `intrinsic` list (config/archetypes.json) —
// `assembleCandidates` silently skips any registered action an archetype was
// never offered, so registering alone would have made it permanently inert.
// `engage_threat` is deliberately NOT added to `villager`: it is already listed
// for `guard`, and its own capability gate can never pass for a villager (see
// that file's header for the full population argument).
//
// Wave 11 / phase 8 adds `wander` (wander.ts) — the last of the three ids
// archetypes.json's own `_doc` has been calling aspirational since phase 1
// (`wander`/`socialize`/`idle`) to get a real Action, and the only registry
// entry here that needs NO archetypes.json edit to take effect: `wander` has
// been first in the villager list since that file was written. It carries its
// own capability gate instead (tier D / roster villager), for the reasons its
// header sets out — registering it is what makes §8's coarse stepping have
// something to step for an agent no renderer is mounting.
//
// Wave 21 adds `engage_threat_villager` (engageThreatVillager.ts) — a real,
// tuned, WEAKER combat action for the ordinary (non-defender) roster, fully
// separate from `engage_threat` above (which stays exactly as inert as the
// Wave 11 note above already describes). Also added to the villager
// archetype's `intrinsic` list (config/archetypes.json) for the same reason
// every other action here needs that: `assembleCandidates` silently skips a
// registered action its archetype was never offered.
import { registerActions, type Action } from '../core/Reasoner';
import { FLEE_TO_SAFETY } from './flee';
import { SLEEP } from './sleep';
import { GATHER_RESOURCE } from './gather';
import { HAUL_TO_DEPOSIT } from './haul';
import { SEEK_DEPOSIT } from './seekDeposit';
import { TEND_FARMPLOT } from './farm';
import { IDLE_FIDGET } from './ambient';
import { NOTICE_PLAYER } from './notice';
import { TAKE_COVER } from './takeCover';
import { ENGAGE_THREAT } from './engageThreat';
import { ENGAGE_THREAT_VILLAGER } from './engageThreatVillager';
import { WANDER } from './wander';

export const ACTIONS: Action[] = [
  FLEE_TO_SAFETY, SLEEP, GATHER_RESOURCE, HAUL_TO_DEPOSIT, SEEK_DEPOSIT, TEND_FARMPLOT,
  IDLE_FIDGET, NOTICE_PLAYER, TAKE_COVER, ENGAGE_THREAT, ENGAGE_THREAT_VILLAGER, WANDER,
];
registerActions(ACTIONS);

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkactions = {
    FLEE_TO_SAFETY, SLEEP, GATHER_RESOURCE, HAUL_TO_DEPOSIT, SEEK_DEPOSIT, TEND_FARMPLOT,
    IDLE_FIDGET, NOTICE_PLAYER, TAKE_COVER, ENGAGE_THREAT, ENGAGE_THREAT_VILLAGER, WANDER,
  };
}
