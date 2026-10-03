// CLN-17 · one population of reasoner agents kept in step with the game's own
// list of who should have one: an Agent spawned for each newcomer, despawned
// for each departure, positions mirrored from wherever the game renders them,
// and forgotten wholesale for a new session. Three syncs kept this by hand —
// rosterSync.ts and the two court syncs each had a `spawnedIds` Set and the
// same pair of loops, and the two court syncs the same mirror and reset
// besides — so it lives here once. What to spawn, as what, and where, stays
// with each sync.
//
// A population remembers the Agent OBJECT it spawned for an id, not just the
// id, and letting an id go only ever despawns that object. Ids are shared
// between populations on purpose — Alric and Beda keep their NPC ids when they
// join the roster — and before this the court sync, retiring Alric the moment
// he joined, despawned the villager Agent the roster sync had just given him
// in the same frame: a recruited starter villager never had an Agent again.
//
// The other half of sharing an id is taking one over, and admit() does that
// outright: whatever Agent holds a newcomer's id is despawned and a fresh one
// spawned. The registry's spawn hands back an Agent that already exists
// instead of making one, so without that two populations could end up holding
// ONE object, and the first to let go would despawn it for both.
//
// THIS FILE IMPORTS NOTHING AT RUNTIME, and has to stay that way. The syncs
// build their populations at module scope, and they sit in the import cycle
// that runs through core/AgentManager.ts and gameStore.ts. Were this file in
// that cycle too (it was, while it imported agentManager itself), loading it
// first would run a sync's `new AgentPopulation()` before the class below
// existed. So the registry is handed in — as a function, read on each use,
// because at the moment a sync's module scope runs agentManager itself may
// not have been initialised yet either.
import type { Agent } from '../core/Agent';

/** The part of the agent registry (core/AgentManager.ts) a population works on. */
export interface AgentRegistry {
  get(id: string): Agent | undefined;
  despawn(id: string): void;
}

export class AgentPopulation {
  /** id -> the Agent this population spawned for it */
  private readonly owned = new Map<string, Agent>();
  private readonly registry: () => AgentRegistry;

  constructor(registry: () => AgentRegistry) {
    this.registry = registry;
  }

  /** This population's Agents that are still the ones registered under their
   *  id — not one whose id another population has since taken over, and none
   *  at all once a new session has wiped the registry. */
  *agents(): IterableIterator<Agent> {
    const registry = this.registry();
    for (const [id, agent] of this.owned) {
      if (registry.get(id) === agent) yield agent;
    }
  }

  /** Spawn an Agent for the item unless this population already has one for
   *  its id: `spawn` is called for a newcomer only, and returns what the
   *  registry's spawn returned. Whatever held a newcomer's id until now is
   *  despawned first (see this file's header). */
  admit<T extends { id: string }>(item: T, spawn: (item: T) => Agent): void {
    if (this.owned.has(item.id)) return;
    this.registry().despawn(item.id);
    this.owned.set(item.id, spawn(item));
  }

  /** Let go of every id no longer in `live`; `onGone` runs after each. */
  retire(live: ReadonlySet<string>, onGone?: (id: string) => void): void {
    for (const id of this.owned.keys()) {
      if (live.has(id)) continue;
      this.forget(id);
      onGone?.(id);
    }
  }

  /** Every item gets (or keeps) an Agent, in the items' own order, and
   *  everyone else loses theirs — newcomers first, departures second, the
   *  order every sync used. */
  reconcile<T extends { id: string }>(items: readonly T[], spawn: (item: T) => Agent, onGone?: (id: string) => void): void {
    for (const item of items) this.admit(item, spawn);
    this.retire(new Set(items.map((item) => item.id)), onGone);
  }

  /** Let go of one id: its Agent is despawned if it is still the one this
   *  population spawned, and the next admit that lists the id spawns a fresh
   *  one — how the roster re-spawns a villager whose job has crossed an
   *  archetype boundary (an Agent's archetype is readonly). */
  forget(id: string): void {
    const agent = this.owned.get(id);
    const registry = this.registry();
    if (agent && registry.get(id) === agent) registry.despawn(id);
    this.owned.delete(id);
  }

  /** Keep each Agent's tracked position honest against where the game renders
   *  it, every frame: correct for LOD tiering, not a source of truth
   *  Locomotion should read mid-step (rosterSync.ts's mirrorVillagerPositions
   *  says why it can lag by a frame). An id with no rendered figure yet keeps
   *  its spawn position. */
  mirror(rendered: Readonly<Record<string, { x: number; z: number } | undefined>>): void {
    for (const agent of this.agents()) {
      const mob = rendered[agent.id];
      if (mob) agent.position.set(mob.x, 0, mob.z);
    }
  }

  /** A new session: the registry's own clear() has already wiped every Agent,
   *  so this only drops the memory of having spawned them — despawning here
   *  would run cleanup against a registry that no longer has them. */
  clear(): void {
    this.owned.clear();
  }
}
