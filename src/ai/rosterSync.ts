'use client';
// Phase 3, iteration 3.1 — Agent lifecycle for the villager roster.
//
// Phase 1 never spawned an Agent per villager; only the probe existed.
// Verifying PHASE_3_4_5_ACTUATION_AND_REASONER.md against the real codebase
// found this as a missing prerequisite §3.0 there assumed already existed —
// "for any villager with an assigned Agent" had nothing to check against.
//
// Mirrors registerVillagerMob's own lifecycle convention: reconcile against
// the CURRENT roster, cheaply no-op'd via reference equality when nothing
// changed — the same pattern rebuildNav already uses for the buildings
// array.
//
// Defender-job villagers used to be excluded outright — Villagers.tsx's own
// renderer still draws its own version of that line
// (`villagers.filter(v => v.job !== 'defender')`) for RENDERING, and
// Defenders.tsx still owns 100% of a defender's actual combat AI, exactly as
// before (phases 3-5 explicitly don't touch combat — PHASE_STATUS.md's phase
// 5.9 note, still true for behaviour). Wave 41 changes only the AGENT side of
// that line: a defender now gets a real Agent too, under a dedicated
// 'defenderObserver' archetype (config/archetypes.json) whose `intrinsic`
// list is empty on purpose — see that file's own dated note for the full
// double-combat/wander reasoning. This file's job is narrower than it
// sounds: give that Agent real perception (so its Blackboard's beliefs/
// threat/lastDamageAt become genuinely populated) and keep its position
// mirrored from the real `defenderState` Defenders.tsx already owns, and
// touch nothing else — no new capability, no new candidate, no new intent
// can ever be actuated for it, by construction (see archetypes.json).

import { agentManager } from './core/AgentManager';
import { villagerMobs } from '@/game/villagerMobs';
import { defenderState } from '@/game/defenders';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import type { Villager } from '@/game/types';

let lastVillagers: Villager[] | null = null;
const spawnedIds = new Set<string>();
/** Phase 8 (§8) — ids whose Agent was last seen owning its own position
 *  because nothing was rendering it (tier D, `steering === 'teleport'`). Used
 *  by `mirrorVillagerPositions` below to spot the frame an agent comes BACK,
 *  which is the one frame the mirror has to run in the other direction. */
const unrendered = new Set<string>();

/** Every roster villager gets (or keeps) an Agent; anyone no longer on the
 *  roster loses theirs. Archetype is 'villager' for everyone except a sworn
 *  defender, who gets 'defenderObserver' instead (Wave 41) — see this file's
 *  own header and archetypes.json's dated note for why that split is safe.
 *
 *  A villager's job can cross the defender boundary in either direction
 *  mid-session (the Roster panel), and `Agent.archetype` is `readonly`
 *  (core/Agent.ts) — an existing Agent can never be handed a new archetype in
 *  place, so a job change that crosses the boundary below is a
 *  despawn-then-respawn, not an update. (The original phase-1 note this
 *  paragraph replaces — "job-specific selection isn't consumed by anything
 *  until phase 5's candidate assembly exists" — no longer holds now that an
 *  archetype choice does change behaviour: an empty intrinsic list versus a
 *  real one.)
 *
 *  Wave 26 bugfix · region is now `v.world ?? null`, not a hardcoded `null`
 *  for everyone. This was the exact landmine wander.ts's own "belt and
 *  braces" comment and Locomotion.ts's stepAgent/stepUnrenderedAgents
 *  comments already named — "a Wave-4 settlement resident... sits one config
 *  change away" — and Wave 26's Torvald residents (a lumberjack/miner who
 *  actually need a real, sustained walk to a distant node, unlike Fenwick's
 *  farmer/merchant/builder, whose worksites are buildings near their own
 *  anchor) are the first to make it a real, live-reproduced bug rather than
 *  a latent one: with `region` always `null`, a settlement resident visited
 *  in their OWN world was tiered D (AgentManager.refreshTiers: `agent.region
 *  !== activeRegion`) at the exact moment they were being rendered and
 *  watched — the one state the whole LOD design assumes can't happen — so
 *  Locomotion's tier-D coarse step validated every landing point against the
 *  HOME nav grid (`getNavGrid(agent.region)`) for coordinates thousands of
 *  units away in the destination, always failing, always reporting
 *  'blocked', permanently blacklisting every node gather_resource tried.
 *  Matching `TargetRegistry.ts`'s own Wave 26 fix (nodes now carry their own
 *  real `region` too — see that file's header) is required alongside this:
 *  either fix alone leaves `queryNearby`'s region filter and `agent.region`
 *  disagreeing, finding zero candidates. */
export function syncVillagerAgents(villagers: Villager[]) {
  if (villagers === lastVillagers) return;
  lastVillagers = villagers;

  const liveIds = new Set<string>();
  for (const v of villagers) {
    liveIds.add(v.id);
    const archetype = v.job === 'defender' ? 'defenderObserver' : 'villager';
    const existing = agentManager.get(v.id);
    if (existing && existing.archetype !== archetype) {
      // The job crossed the defender boundary since this Agent was spawned.
      // `archetype` is readonly (core/Agent.ts), so there is no in-place
      // update — despawn it here and fall through to the spawn below, which
      // `spawnedIds.has(v.id)` would otherwise short-circuit past. Same
      // despawn() the "no longer on the roster" branch below already calls,
      // so this gets the same reservation/steering-cache cleanup a real
      // departure gets (AgentManager.despawn's own comment).
      agentManager.despawn(v.id);
      spawnedIds.delete(v.id);
      unrendered.delete(v.id);
    }
    if (spawnedIds.has(v.id)) continue;
    if (archetype === 'defenderObserver') {
      // A brand-new defender's `defenderState` entry may not exist yet on
      // this exact frame — Defenders.tsx's own `registerDefender` runs from
      // ITS render, which may not have happened yet the first frame a
      // villager becomes a defender. HOME_X/HOME_Z is a harmless placeholder
      // for that one frame: `mirrorVillagerPositions` below self-corrects the
      // moment `defenderState[v.id]` exists, the same lazy-registration shape
      // `registerCompanionCombat` (game/companion.ts) already uses for Tam.
      const ds = defenderState[v.id];
      agentManager.spawn(v.id, archetype, ds?.x ?? HOME_X, ds?.z ?? HOME_Z, null);
    } else {
      const mob = villagerMobs[v.id];
      agentManager.spawn(v.id, archetype, mob?.x ?? 0, mob?.z ?? 0, v.world ?? null);
    }
    spawnedIds.add(v.id);
  }

  for (const id of spawnedIds) {
    if (liveIds.has(id)) continue;
    // Wave 41: a villager reassigned to/from 'defender' no longer reaches
    // this branch at all — they stay in `liveIds` throughout, and the
    // archetype-change branch above despawns+respawns them in place. What
    // still lands here is a villager actually leaving the roster (id no
    // longer present in `villagers` at all), same unbounded-leak reasoning
    // as Locomotion's own despawn cleanup for that case.
    agentManager.despawn(id);
    spawnedIds.delete(id);
    unrendered.delete(id);
  }
}

/** Keep each villager Agent's tracked position honest against its live
 *  rendered position every frame — cheap (a copy, not a search), and it is
 *  what keeps LOD tiering (AgentManager.refreshTiers, phase 1) correct for
 *  every villager agent instead of frozen at spawn time. Locomotion
 *  (iteration 3.3) becomes the other direction of this once it exists; for
 *  now this is read-only with respect to rendering — nothing here writes
 *  back to villagerMobs or a transform.
 *
 *  Measured (scripts/smoke132.mjs): this can lag by up to one render frame,
 *  not always zero. VillagerFigure's and AiRuntime's useFrame callbacks are
 *  both inline closures, so React/R3F resubscribes them on every re-render
 *  (e.g. VillagerFigure's setClip firing when movement starts), which can
 *  reorder their relative execution within a tick — a pre-existing R3F
 *  scheduling fragility, not something this file causes. A ~0.1m lag against
 *  a 15m LOD tier threshold is inconsequential for what this mirror is for;
 *  forcing strict same-tick ordering would mean taking over R3F's frame
 *  scheduling (`useFrame`'s priority argument disables its auto-render),
 *  which is not a trade worth making for a purpose that doesn't need
 *  sub-frame precision. Revisit only if something downstream actually needs
 *  tighter-than-one-frame position accuracy.
 *
 *  Phase 8 (§8) — the mirror stops for a tier-D agent, and hands back once on
 *  the way out. A `steering === 'teleport'` agent is off-region, so
 *  `VillagerFigure` is not mounted for it (that component's own filter is
 *  `(v.world ?? null) === (destination ?? null)`) and its `villagerMobs` entry
 *  is frozen at wherever it last stood. Copying that frozen value into
 *  `agent.position` every frame would pin the agent in place and quietly undo
 *  §8's whole coarse-stepping path, so while an agent is unrendered it owns
 *  its own position instead.
 *
 *  The mob is deliberately left stale for the whole time rather than tracked
 *  live: `gameStore.villagerAtWork()` reads `villagerMobs[id]` positions to
 *  decide whether a villager's production timer keeps ticking, so a live
 *  mirror here would change a shipped Wave 9/10 economy path as a side effect
 *  of an LOD change. Freezing it is precisely today's behaviour. The single
 *  write on the way back is §8's own "resume normally" — and by the time it
 *  runs, Locomotion's re-entry hook has already snapped the agent onto
 *  walkable ground.
 *
 *  Wave 41 — a `defenderObserver` agent gets a DIFFERENT mirror, one-directional
 *  and unconditional, checked first (before the `villagerMobs` lookup below,
 *  which has no entry for a defender-job villager — Villagers.tsx's own
 *  VillagerFigure filter is `v.job !== 'defender'`, so `registerVillagerMob`
 *  never runs for one). No tier-D/`unrendered` handling is needed here the way
 *  the villager branch below needs it: `stepUnrenderedAgents` (Locomotion.ts)
 *  skips any agent whose `.intent` is null, and a `defenderObserver` agent's
 *  `.intent` is ALWAYS null — its archetype's intrinsic list is empty, so
 *  `runReasoner` never has a winner and its own "no winner" branch
 *  unconditionally clears `intent` every think tick (Reasoner.ts). There is
 *  nothing here for that sweep to coarse-step even while the agent is tier D
 *  off-region, so copying `defenderState`'s real position in every frame,
 *  unconditionally, cannot fight it the way it would for a real wandering
 *  villager. */
export function mirrorVillagerPositions() {
  for (const id of spawnedIds) {
    const agent = agentManager.get(id);
    if (!agent) continue;
    if (agent.archetype === 'defenderObserver') {
      const ds = defenderState[id];
      if (ds) agent.position.set(ds.x, 0, ds.z);
      continue;
    }
    const mob = villagerMobs[id];
    if (!mob) continue;
    if (agent.steering === 'teleport') {
      unrendered.add(id);
      continue;
    }
    if (unrendered.delete(id)) {
      mob.x = agent.position.x;
      mob.z = agent.position.z;
      continue;
    }
    agent.position.set(mob.x, 0, mob.z);
  }
}

/** newGame/loadFromSave already call agentManager.clear() (see
 *  gameStore.ts); without this, this module's own spawnedIds/lastVillagers
 *  would still think every agent from the last game exists, and never
 *  re-spawn them for the new one. */
export function resetVillagerAgentSync() {
  lastVillagers = null;
  spawnedIds.clear();
  // otherwise a villager who happened to be off-region when the player loaded
  // a different save would, on their id's first frame in the new game, have
  // their brand-new Agent's spawn position written over the fresh mob instead
  // of the other way round
  unrendered.clear();
}
