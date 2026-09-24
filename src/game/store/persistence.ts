// CLN-03 · the single source of truth for every field the game SAVES.
//
// Adding a persisted field is now: (1) add it to `SaveGame` (types/save.ts,
// with its doc comment), (2) add ONE row to PERSISTED_FIELDS below, in the
// position you want it on the wire. `tsc` fails until both exist; nothing in
// gameStore.ts needs to change (GameState inherits the field from
// PersistedState, and the initial state, newGame/new-game-plus, loadFromSave
// and toSave are all derived from this table).
//
// Leaf module: imports only types and MAX_LAND_TIER (the two zero-tables live
// here) — nothing here may ever import gameStore.ts (see the TDZ history in
// gameStore.ts's homeGroundY comment).
//
// What deliberately stays OUT of the table (still hand-written in gameStore.ts):
// the transient reset literals (their `dirty`/`season` differ between a fresh
// game and a load), resetSessionModules, the leaf-module writes (stabledHorses,
// setWaterworks, worldEnv), the id sequence counters, and NG+'s xp/skillTree
// overlay — all order-sensitive side effects or session lifecycle, not state
// that is saved.
import type { CharacterConfig, DifficultyId, LifetimeStats, SaveGame, SkillId, WaterFeature } from '../types';
import type { KeepState } from '../data/keep';
import { MAX_LAND_TIER } from '../data/buildables';

export const ZERO_XP: Record<SkillId, number> = {
  woodcutting: 0, mining: 0, smithing: 0, fishing: 0, building: 0, combat: 0, farming: 0,
};

export const ZERO_STATS: LifetimeStats = {
  playtimeSec: 0, resourcesGathered: 0, kills: 0, distanceMeters: 0, buildingsPlaced: 0,
  nodesHarvested: {}, buildingsByType: {}, killsByKind: {}, goldEarnedLifetime: 0,
  itemsCrafted: 0, dungeonsCleared: 0,
};

/** SaveGame keys that intentionally have NO same-named persisted store field.
 *  `version` is the literal 1 buildSave stamps first (never read back);
 *  `playerPos` is legacy — never written by any toSave, never read by any
 *  load (see playerState.ts). Kept on SaveGame, optional, for old saves. */
export const UNPERSISTED_SAVE_KEYS = ['version', 'playerPos'] as const satisfies readonly (keyof SaveGame)[];
type UnpersistedKey = (typeof UNPERSISTED_SAVE_KEYS)[number];

/** Every SaveGame key that has a same-named live store field (66 today). */
export type PersistedKey = Exclude<keyof SaveGame, UnpersistedKey>;

/** The live (in-store) type of every persisted field: SaveGame's, minus the
 *  optionality — the store always holds a value (loadFromSave/fresh defaults
 *  guarantee it). `character` is null until a game starts. GameState extends
 *  this, so a field can never exist in the save but not in the store. */
export type PersistedState =
  Required<Omit<SaveGame, UnpersistedKey | 'character' | 'keep'>>
  & { character: CharacterConfig | null; keep: KeepState | null };

/** Live values that are NOT read from the store when saving — their truth is a
 *  per-frame leaf module (kept out of zustand on purpose). gameStore.toSave
 *  gathers them; this file stays free of those imports. */
export interface SaveLeaves {
  /** worldEnv.time */
  timeOfDay: number;
  /** worldEnv.dayCount */
  dayCount: number;
  /** stabledHorses.ids / .assigned (riding.ts) */
  stabledIds: readonly string[];
  stabledAssigned: Readonly<Record<string, string>>;
  /** waterworks.list (waterworks.ts) */
  waterworks: readonly WaterFeature[];
}

interface FieldSpec<K extends PersistedKey> {
  /** The fresh-game / initial-store value. A FACTORY on purpose: every call
   *  must hand out new containers (a shared `{}`/`[]` would leak state between
   *  games). Shallow-copy tables (`{ ...ZERO_STATS }`) keep main's exact
   *  semantics, nested refs included. */
  fresh: () => PersistedState[K];
  /** How a loaded save populates it. Omitted = `save[k] ?? legacy ?? fresh()`
   *  (null and undefined both count as absent, exactly like the old `??`).
   *  'raw'   = pass the save's value through untouched, no default — the
   *            required SaveGame fields (a missing one stays undefined, as before).
   *  'merge' = `{ ...fresh(), ...(save[k] ?? {}) }` so a partial record from an
   *            older save still gets every new counter.
   *  'fresh' = ignore the save; always take the fresh value (destination). */
  load?: 'raw' | 'merge' | 'fresh';
  /** How toSave serialises it. Omitted = the store's own value. */
  save?: (state: PersistedState, leaves: SaveLeaves) => SaveGame[K];
}

/**
 * THE TABLE. Row order IS the on-the-wire key order of toSave()'s JSON
 * (`version` first, then these) — it is deliberately NOT SaveGame's declaration
 * order. Do not sort or regroup it; a byte-identical save is part of the contract.
 * `satisfies` makes tsc reject a missing row, an unknown row, or a wrong type.
 */
export const PERSISTED_FIELDS = {
  character:           { fresh: () => null, load: 'raw', save: (st) => st.character as CharacterConfig },
  // Wave 39 (A4): absent = 'normal' on load — every save written before
  // difficulty existed picks up the mult:1.0 tier, zero behavior change. (A
  // fresh game overrides `fresh` with the chosen tier: see freshPersisted.)
  difficulty:          { fresh: () => 'normal' },
  // bare-handed start (2026-07-20): no starting axe, no calling kit —
  // harvestNode/useTool never actually gate on OWNING a tool, only on its
  // condition (durability defaults to 100 whether you own zero or one), so
  // gathering bare-handed already works mechanically. Every calling's kit is
  // empty by design now (see data/classes.ts) — the signature skill's +10%
  // XP is the only thing it actually grants.
  inventory:           { fresh: () => ({}), load: 'raw' },
  xp:                  { fresh: () => ({ ...ZERO_XP }), load: 'merge' },
  unlocks:             { fresh: () => [], load: 'raw' },
  completedQuests:     { fresh: () => [], load: 'raw' },
  questProgress:       { fresh: () => ({}), load: 'raw' },
  buildings:           { fresh: () => [], load: 'raw' },
  // the store copies of timeOfDay/dayCount are low-frequency mirrors of worldEnv;
  // the save reads worldEnv itself
  timeOfDay:           { fresh: () => 0.3, save: (_st, l) => l.timeOfDay },
  dayCount:            { fresh: () => 0, save: (_st, l) => l.dayCount },
  sideQuest:           { fresh: () => null },
  trackedQuest:        { fresh: () => 'main' },
  deeds:               { fresh: () => [] },
  bestiary:            { fresh: () => [] },
  challengeTiers:      { fresh: () => ({}) },
  plots:               { fresh: () => ({}) },
  gateOpen:            { fresh: () => ({}) },
  buildingHp:          { fresh: () => ({}) },
  reputation:          { fresh: () => ({}) },
  // always saved null and always loaded as null: you reload at home
  destination:         { fresh: () => null, load: 'fresh', save: () => null },
  visitedWorlds:       { fresh: () => [] },
  discoveredPois:      { fresh: () => [] },
  loreSeen:            { fresh: () => [] },
  defeatedCedric:      { fresh: () => false },
  cedricCaptures:      { fresh: () => 0 },          // legacy load differs — see LEGACY_LOAD_OVERRIDES
  cedricCapturedAtDay: { fresh: () => -999 },       // legacy load differs
  alliance:            { fresh: () => null },
  allegiance:          { fresh: () => 0 },
  completedSideQuests: { fresh: () => [] },
  landTier:            { fresh: () => 0 },          // legacy load differs
  keep:                { fresh: () => null },
  workshop:            { fresh: () => null },
  builtSets:           { fresh: () => [] },
  // stabled/mounts: the riding.ts leaf module is the live truth while playing
  // (the patrol AI reads/writes it every frame); the store copies are set on
  // load only and are never read (dead) — kept so the shape stays identical.
  stabled:             { fresh: () => [], save: (_st, l) => [...l.stabledIds] },
  mounts:              { fresh: () => ({}), save: (_st, l) => ({ ...l.stabledAssigned }) },
  falconTamed:         { fresh: () => false },
  companionRecruited:  { fresh: () => false },
  // Wave 54 (E2) · always present in live state (unlike the optional save
  // field): a fresh game AND a load both default it to { xp: 0, level: 0 } so
  // every reader can assume it exists
  companion:           { fresh: () => ({ xp: 0, level: 0 }) },
  betrayedCedric:      { fresh: () => false },
  betrayedLeo:         { fresh: () => false },
  guild:               { fresh: () => null },
  guildRanks:          { fresh: () => ({}) },
  skillTree:           { fresh: () => [] },
  attrSpent:           { fresh: () => ({}) },
  dyes:                { fresh: () => [] },
  durability:          { fresh: () => ({}) },
  marketState:         { fresh: () => ({}) },
  perks:               { fresh: () => [] },
  stats:               { fresh: () => ({ ...ZERO_STATS }), load: 'merge' },
  claimedWorlds:       { fresh: () => ({}) },
  settlements:         { fresh: () => ({}) },
  caravans:            { fresh: () => ({}) },
  cultivatedPlots:     { fresh: () => ({}) },
  // saved from the waterworks.ts leaf list (the copy every consumer reads)
  waterworks:          { fresh: () => [], save: (_st, l) => [...l.waterworks] },
  customBlueprints:    { fresh: () => [] },
  lastTaxAt:           { fresh: () => 0 },
  villagers:           { fresh: () => [] },
  armory:              { fresh: () => ({}) },
  treasureOpened:      { fresh: () => false },
  dragonSeen:          { fresh: () => false },
  dragonSieges:        { fresh: () => 0 },
  dragonRouted:        { fresh: () => false },
  blackDragonSieges:   { fresh: () => 0 },
  blackDragonRouted:   { fresh: () => false },
  cedricSieges:        { fresh: () => 0 },
  cedricRouted:        { fresh: () => false },
} satisfies { [K in PersistedKey]: FieldSpec<K> };

/** Every persisted key, in wire order (derived — never hand-listed). */
export const PERSISTED_KEYS = Object.keys(PERSISTED_FIELDS) as PersistedKey[];

/**
 * The load-time defaults that are DELIBERATELY different from a fresh game's.
 * Consulted only when the save's own value is null/undefined. A key belongs
 * here only when "absent from an old save" must NOT mean "what a brand-new
 * game starts with" — do not fold these into `fresh`.
 */
export const LEGACY_LOAD_OVERRIDES = {
  // a save from before land tiers existed was built on the old flat 60m
  // region, so it inherits the LARGEST tier — anything else would strand
  // buildings outside their own fence (a fresh game starts at tier 0)
  landTier: () => MAX_LAND_TIER,
  // Wave 38 (A1) migration: a save from before this existed has no capture
  // count — infer 1 if he was already marked defeated (the old permanent
  // meaning), else 0. Same reasoning for the day stamp: a pre-Wave-38 defeated
  // save has no recorded capture day, so seed it from the save's own dayCount
  // (a jailbreak roll on the very next check will correctly treat "now" as the
  // moment of capture) rather than -999, which would let him break out
  // immediately on load. NOTE: reads the RAW save (s.defeatedCedric/s.dayCount).
  cedricCaptures: (s) => (s.defeatedCedric ? 1 : 0),
  cedricCapturedAtDay: (s) => (s.defeatedCedric ? (s.dayCount ?? 0) : -999),
} satisfies { [K in PersistedKey]?: (s: SaveGame) => PersistedState[K] };

/** Fresh-game values for every persisted field (initial store state uses
 *  `freshPersisted(null, 'normal')`; newGame / new-game-plus pass the real ones). */
export function freshPersisted(character: CharacterConfig | null, difficulty: DifficultyId): PersistedState {
  const out: Record<string, unknown> = {};
  for (const k of PERSISTED_KEYS) out[k] = (PERSISTED_FIELDS[k] as FieldSpec<PersistedKey>).fresh();
  out.character = character;
  out.difficulty = difficulty;
  return out as PersistedState;
}

function loadField<K extends PersistedKey>(k: K, s: SaveGame): PersistedState[K] {
  const spec = PERSISTED_FIELDS[k] as FieldSpec<K>;
  const raw = s[k] as PersistedState[K] | null | undefined;
  switch (spec.load) {
    case 'raw': return raw as PersistedState[K];
    case 'fresh': return spec.fresh();
    case 'merge': return { ...(spec.fresh() as object), ...((raw ?? {}) as object) } as PersistedState[K];
    default: {
      if (raw != null) return raw;
      const legacy = (LEGACY_LOAD_OVERRIDES as Partial<Record<PersistedKey, (s: SaveGame) => unknown>>)[k];
      return (legacy ? legacy(s) : spec.fresh()) as PersistedState[K];
    }
  }
}

/** The persisted half of loadFromSave's state patch. Pure: reads only `s`. Only
 *  table keys are read, so unknown/extra keys on a save are ignored, as before. */
export function applySave(s: SaveGame): PersistedState {
  const out: Record<string, unknown> = {};
  for (const k of PERSISTED_KEYS) out[k] = loadField(k, s);
  return out as PersistedState;
}

/** toSave(): `version` first, then every table row in order. */
export function buildSave(state: PersistedState, leaves: SaveLeaves): SaveGame {
  const out: Record<string, unknown> = { version: 1 };
  for (const k of PERSISTED_KEYS) {
    const spec = PERSISTED_FIELDS[k] as FieldSpec<PersistedKey>;
    out[k] = spec.save ? spec.save(state, leaves) : state[k];
  }
  return out as unknown as SaveGame;
}
