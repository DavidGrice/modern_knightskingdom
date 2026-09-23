// Villager/defender/companion vocabulary and the Villager record itself.
// Split out of the former monolithic game/types.ts (CLN-08).
import type { WorldScoped } from './world';

/** Wave 10 · `herbalist`/`fisherman` join the trades. Both node kinds
 *  (`ResourceNodeState.kind` already has 'herb'/'fishing') existed from the
 *  start but were player-harvest-only — no job claimed either, which is why
 *  `gather.ts`'s job_match scored every herb/fishing candidate 0 forever.
 *  Widening this union is save-safe in both directions: `job` is stored as a
 *  plain string, every consumer looks it up through `JOB_BY_ID`/a `Partial`
 *  record rather than an exhaustive switch, and an old save simply has no
 *  villager holding either value yet. */
export type VillagerJob =
  | 'idle' | 'lumberjack' | 'miner' | 'farmer' | 'herbalist' | 'fisherman'
  | 'merchant' | 'defender' | 'builder';

/** Phase 19 alliance branch: pledge to the crown or to Cedric's rebellion —
 *  whichever side you DIDN'T choose raids the homestead from then on. */
export type Alliance = 'leo' | 'cedric';

export type DefenderLoadout = 'bow' | 'sword_shield' | 'halberd';

/** A worn item that raises `carryCapacityOf()`'s result (game/data/
 *  attributes.ts) — basket first, cart a larger tier above it. Wave 9 built
 *  the acquisition half this type was waiting on: both are real `ItemId`s
 *  with recipes, they stock the shared Armory like helmet/chestplate, and the
 *  Roster equips them. Mutually exclusive (one field, not two booleans), so
 *  the store action that sets it is modelled on `setDefenderLoadout`'s
 *  auto-refund swap rather than on `equipVillagerGear`'s boolean toggle. */
export type CarrierTier = 'basket' | 'cart';

/** Wave 9 · armor tiers. The plate a figure wears, best last. `true` on an
 *  older save (and on anything that still equips the plain `chestplate` item)
 *  means 'iron' — the original single tier — which is why `gear.chestplate`
 *  stays assignable from a boolean instead of being migrated: every read goes
 *  through `chestplateTierOf()` (data/armor.ts), so no save has to be
 *  rewritten and every truthiness test already in the codebase still means
 *  "wearing a plate". The tiers are mutually exclusive on ONE field, so the
 *  store action that sets it is `setDefenderLoadout`-shaped (the old plate
 *  goes back to the Armory when you upgrade), exactly like CarrierTier. */
export type ChestplateTier = 'iron' | 'forged' | 'crested';

export interface Villager extends WorldScoped {
  id: string;
  name: string;
  job: VillagerJob;
  /** per-trade mastery XP (Phase 24A) — earned by working, kept per job.
   *  Innate attributes are NOT stored: they derive from the id (attributes.ts). */
  tradeXp?: Partial<Record<VillagerJob, number>>;
  /** companion traits chosen at mastery milestones (data/companionTraits.ts) */
  traits?: string[];
  // defender-only fields, absent/undefined for every other job
  level?: number;
  xp?: number;
  loadout?: DefenderLoadout;
  /** a placed building's id to guard (ideally a tower), null/absent = patrol near home */
  stationId?: string | null;
  /** N80 (requested, "if raids can come by day the watch cannot all sleep by
   *  day"): which half of the clock this defender stands watch for — absent
   *  means 'night', the original single blanket shift every defender used
   *  to keep (Defenders.tsx's isWatchHours()), so existing saves/defenders
   *  are unaffected by this field's addition. */
  shift?: 'day' | 'night';
  /** worn armor, drawn from the homestead Armory (any job can wear these —
   *  defenders additionally get a small combat bonus per piece, see
   *  Defenders.tsx). Absent/false = bare-headed/chested. `carrier` raises
   *  carry capacity (game/data/attributes.ts's carryCapacityOf) — absent =
   *  no bonus. As of Wave 9 it is Armory-backed exactly like the other two,
   *  just tiered instead of boolean (see CarrierTier).
   *  `chestplate` is tiered too as of Wave 9 and keeps accepting the old
   *  `true` (= iron) so no save needs migrating — read it through
   *  `chestplateTierOf()` in data/armor.ts rather than switching on it here. */
  gear?: { helmet?: boolean; chestplate?: boolean | ChestplateTier; carrier?: CarrierTier };
  /** player-edited appearance overrides (data/villagerLooks.ts). Only the
   *  fields actually changed are stored; anything absent keeps tracking the
   *  id-derived default, so untouched villagers need no migration. */
  look?: {
    headDonor?: string;
    bodyDonor?: string;
    armColor?: number;
    handColor?: number;
    legColor?: number;
    hipColor?: number;
  };
  /** Empire arc, Wave 3 (per-world labour mechanism): which instance this
   *  villager lives and works in — a settlement's own destination id, or
   *  absent/null for the homestead. Mirrors `PlacedBuilding.world`'s own
   *  instance-separation doctrine exactly (see that field's comment above)
   *  — a settlement resident MUST carry this or their labour ticks against
   *  the wrong anchor. Older saves (pre-field) implicitly mean home. As of
   *  Wave 3 nothing yet SETS this to a non-null value — the mechanism is
   *  generalized here so Wave 4's settlement prototype has real per-world
   *  labour to plug residents into, not because any villager is
   *  settlement-based yet. */
  world?: string | null;
}

/** Wave 54 · Tam's own independent progression record — save-persisted,
 *  but deliberately NOT a `Villager` and NOT pushed into `villagers`
 *  (see `SaveGame.companionRecruited`'s own comment for the exhaustive
 *  `st.villagers` consumer audit that ruled that out: `assignJob`/
 *  `tickVillagers` both index `JOB_BY_ID[v.job]`, which would crash for a
 *  job value with no `JobDef`, and `rosterSync.ts` would double-spawn an
 *  Agent for an id `companionSync.ts` already spawns separately). Lives at
 *  `SaveGame.companion`/`GameState.companion`; absent = never touched this
 *  system (level 0, no gear — not a corrupt Tam, just an untouched one).
 *  `gear` reuses `Villager['gear']`'s exact shape (helmet/chestplate draw
 *  from the same Armory pool and tier vocabulary) — `carrier` is part of
 *  that shape but never surfaced in the UI for Tam, since he never hauls
 *  goods. `loadout` excludes 'bow': `assist_leader`
 *  (ai/actions/assistLeader.ts) is melee-only today with no LOS check at
 *  all — see that file's own header for why a ranged branch is real new
 *  work, not a reuse, and is deferred to a future wave. */
export interface CompanionState {
  xp: number;
  level: number;
  loadout?: Exclude<DefenderLoadout, 'bow'>;
  gear?: Villager['gear'];
}
