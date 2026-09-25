// The persisted save shape and its supporting record types. Split out of
// the former monolithic game/types.ts (CLN-08).
import type { CharacterConfig, DifficultyId, ItemId, SkillId } from './core';
import type {
  Blueprint, CaravanRun, ClaimedPlot, CultivatedPlot, MarketEntry, PlacedBuilding, Settlement, WaterFeature,
} from './world';
import type { Alliance, CompanionState, Villager } from './villagers';
import type { KeepState } from '../data/keep';

export interface ActiveSideQuest {
  npcId: string;
  questId: string;
  have: number;
}

export interface LifetimeStats {
  playtimeSec: number;
  resourcesGathered: number;
  kills: number;
  distanceMeters: number;
  buildingsPlaced: number;
  // per-kind breakdowns added for Phase 19's expanded stats/challenges layer —
  // the scalar totals above stay for back-compat with older saves.
  nodesHarvested: Partial<Record<'tree' | 'rock' | 'fishing' | 'herb', number>>;
  buildingsByType: Partial<Record<string, number>>;
  killsByKind: Partial<Record<string, number>>;
  goldEarnedLifetime: number;
  itemsCrafted: number;
  dungeonsCleared: number;
}

/**
 * The persisted save shape. CLN-03 · this interface is the DOCUMENTED type home
 * of every saved field, and store/persistence.ts's PERSISTED_FIELDS table is
 * the single behavioural one (fresh-game default, load rule, save rule): the
 * store's `GameState` inherits every field here (minus `version`/`playerPos`)
 * from it, so adding a persisted field is (1) a line here and (2) a row there.
 * Everything after `buildings` stays optional so an old save still loads.
 */
export interface SaveGame {
  version: 1;
  character: CharacterConfig;
  /** Wave 39 (A4) · chosen once at newGame()/startNewGamePlus() time, never
   *  toggled mid-run. Absent = 'normal' (every save written before this
   *  existed), which is the mult:1.0 tier — zero behavior change for it. */
  difficulty?: DifficultyId;
  inventory: Partial<Record<ItemId, number>>;
  xp: Record<SkillId, number>;
  unlocks: string[];
  completedQuests: string[];
  questProgress: Record<string, Record<string, number>>;
  buildings: PlacedBuilding[];
  playerPos?: [number, number, number];
  timeOfDay?: number;
  /** full in-game days elapsed (Phase 15 seasons), absent = 0 */
  dayCount?: number;
  sideQuest?: ActiveSideQuest | null;
  /** which one the HUD tracker prefers to show (player-set), absent = 'main'.
   *  The tracker falls back to 'main' whenever no side errand is actually active. */
  trackedQuest?: 'main' | 'side';
  deeds?: string[];
  /** foes scanned into the collection book (not merely killed) */
  bestiary?: string[];
  /** the continuous standing between the houses, -100 (Cedric) .. +100 (Leo).
   *  The pledge (`alliance`) is a one-off act of will; this is what your DEEDS
   *  say, and the two are allowed to disagree. See data/allegiance.ts. */
  allegiance?: number;
  /** ids of every side errand finished, so `requires` chains have something to
   *  read and a completed errand is not re-offered as though it were new */
  completedSideQuests?: string[];
  /** how far the homestead fence has been bought out (LAND_TIERS index — every
   *  tier is a size a wall run actually closes on). A save that predates land
   *  tiers is inherited at the LARGEST tier on load, not 0 (see persistence.ts's
   *  LEGACY_LOAD_OVERRIDES). */
  landTier?: number;
  /** J51 · the composed castle (game/data/keep.ts). Absent on saves from
   *  before the keep could be assembled. */
  keep?: KeepState | null;
  /** M · the set on the workshop bench, and the sets already built */
  workshop?: { setNum: string; step: number } | null;
  builtSets?: string[];
  /** G27 · caught-and-stabled horse ids, and villagerId -> horseId assignments.
   *  On load these are mirrored into riding.ts's leaf module, because the
   *  mounted patrol AI reads it every frame and must not go through the store;
   *  toSave therefore saves from THAT module, not from the store's own (dead)
   *  copy. */
  stabled?: string[];
  mounts?: Record<string, string>;
  /** Wave 13 · the falcon companion has been tamed (see game/falcon.ts and
   *  PlayerController's 'call_falcon' interact). Unlike a horse this is a
   *  single always-on companion, not a roster, so one boolean is the whole
   *  of its saved state. Absent/false = still the wild, decorative bird. */
  falconTamed?: boolean;
  /** Wave 25 · Tam, the companion squire (game/data/companion.ts and
   *  PlayerController's 'talk_companion' interact), has been recruited via
   *  Richard's own 'r_squire' side quest. Same single-boolean shape as
   *  falconTamed above, for the same reason: one always-on companion, not a
   *  roster — Tam is never pushed into `villagers` (see gameStore's
   *  recruitCompanion). Absent/false = not recruited yet. */
  companionRecruited?: boolean;
  /** Wave 54 · Tam's independent progression — XP/level off real combat
   *  kills (assistLeader.ts's strike()) and an Armory-backed gear/loadout
   *  choice, entirely separate from `companionRecruited` above (that flag
   *  stays a pure boolean gate for its 7 existing consumers, untouched).
   *  Absent = a recruited-but-never-touched-this-system Tam: level 0, no
   *  gear, renders exactly as he always has (see game/companion.ts's
   *  `companionMaxHp`/Companion.tsx's `loadout ?? 'sword_shield'`
   *  fallback). See `CompanionState`'s own doc comment above for why this
   *  is a separate top-level field rather than literal `villagers`
   *  membership. */
  companion?: CompanionState;
  /** Wave 13 · turned on Cedric's own camp after already pledging to him
   *  (gameStore's betrayCedric) — permanent, so `pledgeAlliance('cedric')`
   *  can refuse a known turncoat forever. Absent/false = never happened. */
  betrayedCedric?: boolean;
  /** Wave 56 (F4) · the mirror of betrayedCedric: turned on the crown after
   *  already being sworn to Leo (gameStore's betrayLeo) — permanent, so
   *  `pledgeAlliance('leo')` can refuse a known turncoat forever. Absent/
   *  false = never happened. */
  betrayedLeo?: boolean;
  /** highest CHALLENGES tier index already notified, per challenge id */
  challengeTiers?: Record<string, number>;
  /** farm plot growth: buildingId -> seconds of growth remaining (-1 = untilled) */
  plots?: Record<string, number>;
  villagers?: Villager[];
  /** the homestead Armory's spare gear, separate from the player's own inventory */
  armory?: Partial<Record<ItemId, number>>;
  /** the one-time reward in the keep's chest has already been claimed */
  treasureOpened?: boolean;
  /** the dragon's night flyover has been witnessed (drives its Deed) */
  dragonSeen?: boolean;
  /** dragonfire sieges weathered / ever driven off with bolts (Deeds) */
  dragonSieges?: number;
  dragonRouted?: boolean;
  /** Wave 36 (A8) · the black dragon's own siege count / rout flag —
   *  mirrors dragonSieges/dragonRouted exactly, one level up the escalation */
  blackDragonSieges?: number;
  blackDragonRouted?: boolean;
  /** Cedric's homestead sieges weathered / ever driven off before the timer (Deeds) */
  cedricSieges?: number;
  cedricRouted?: boolean;
  /** gate buildings: absent/true = open (passable), false = closed */
  gateOpen?: Record<string, boolean>;
  /** buildings under siege damage: absent = full HP (see data/buildables maxHpFor) */
  buildingHp?: Record<string, number>;
  /** per-NPC standing (see data/npcs repTitles), absent = 0 */
  reputation?: Record<string, number>;
  /** template-world id the player is currently visiting; null/absent = home */
  destination?: string | null;
  /** template-world ids visited at least once (one-time loot already granted) */
  visitedWorlds?: string[];
  /** Wave 14 · POI ids (a resident NPC's own id — see data/npcs.ts's
   *  `poisForDestination`) reached at least once via a waypoint travel. Only
   *  gates what the Travel Map SHOWS (name/portrait vs a "???" placeholder)
   *  — never gates travel itself, exactly like `visitedWorlds` above. Absent
   *  = nothing discovered yet, same optional-array convention as every other
   *  "seen it before" field on this interface. */
  discoveredPois?: string[];
  /** NPC ids whose one-time voiced lore introduction has already played */
  loreSeen?: string[];
  /** Cedric the Bull is currently in custody (see CedricCamp.tsx) — Wave 38
   *  (A1) repurposed this from a permanent one-time flag to "at large vs.
   *  jailed": true right after his capstone win, and a jailbreak
   *  (gameStore.ts's freeCedric) can flip it back to false for a scaling
   *  rematch. Every existing Cedric-arc gate (cedricSiege.ts's
   *  cedricArcEligible, CedricCamp.tsx, the challenge_cedric interact target,
   *  Enemies.tsx's camp guards) already reads this reactively, so flipping it
   *  back re-shows all of them with no further changes. */
  defeatedCedric?: boolean;
  /** Wave 38 (A1) · lifetime times he's been captured — 0 before the first
   *  capstone win, incremented on every recapture thereafter. Distinguishes
   *  the one-time capstone payout (markCedricDefeated's `first` branch) from
   *  every later rematch's own, smaller reward. */
  cedricCaptures?: number;
  /** Wave 38 (A1) · `dayCount` at his most recent capture — what
   *  cedricJailbreakAllowed measures the jailbreak cooldown against. */
  cedricCapturedAtDay?: number;
  /** Phase 19 alliance branch: who the player pledged to; null/absent = unsworn */
  alliance?: Alliance | null;
  /** Phase 21 guilds: primary guild id (data/guilds.ts); null/absent = unaffiliated */
  guild?: string | null;
  /** Wave 22: standing accrued within a guild — guild id -> accrued rank
   *  points, absent = 0. Parallel to `reputation` (per-NPC) and `allegiance`
   *  (the house axis); deliberately never merged with either — see
   *  data/guilds.ts's GuildDef.rankTitles doc comment. */
  guildRanks?: Record<string, number>;
  /** Phase 21 talent tree: purchased talent ids (data/skillTree.ts) */
  skillTree?: string[];
  /** player attribute points invested (data/playerAttributes.ts) */
  attrSpent?: Partial<Record<'might' | 'diligence' | 'craft' | 'courage' | 'wit', number>>;
  /** Wave 9 · palette rows opened with a brewed dye (data/dyes.ts row ids);
   *  absent/empty = only the free swatches, i.e. exactly how every pre-Wave-9
   *  save already looked. Saved with the CHARACTER, not in localStorage like
   *  the crest unlocks: a dye is brewed from this save's own herbs and
   *  flowers, so it belongs to this save, whereas a crest is a deed earned
   *  once by the player themselves. */
  dyes?: string[];
  /** 0-100 wear per degradable tool (axe/pickaxe/fishing_rod/sword); absent = full (100) */
  durability?: Partial<Record<ItemId, number>>;
  /** ids of skill perks picked at rank-ups (see data/perks.ts) */
  perks?: string[];
  /** lifetime counters shown on the Stats page, absent = all zero */
  stats?: LifetimeStats;
  /** template-world id -> claimed building plot (Phase 13), absent = unclaimed */
  claimedWorlds?: Record<string, ClaimedPlot>;
  /** player-saved blueprints (see data/blueprints.ts for the starter ones) */
  customBlueprints?: Blueprint[];
  /** epoch ms of the last keep tax collection (Phase 13), absent = never collected */
  lastTaxAt?: number;
  /** Empire arc, Wave 4: a destination earned as a full settlement (quest
   *  chain + deed), distinct from `claimedWorlds`' bare build-plot claim —
   *  any of the 8 templates can have a claimed plot without ever becoming
   *  one of these. See `Settlement`'s own doc comment for its fields. */
  settlements?: Record<string, Settlement>;
  /** Empire arc, Wave 5: plot id -> the plot you actually planted, absent =
   *  never broken. The nodes themselves are NOT saved (st.nodes is runtime
   *  only, regenerated by seedNodes on every load and every land purchase) —
   *  this record is the real state, and the cluster is re-derived from its
   *  `stage` each time. */
  cultivatedPlots?: Record<string, CultivatedPlot>;
  /** Wave 12: waterways the player dug themselves (see WaterFeature). Absent
   *  on every save written before digging existed, which reads identically to
   *  an empty list — the static POND is not in here and never will be, it
   *  stays a hand-authored `terrainExclusions` entry. Mirrored into
   *  game/waterworks.ts's leaf module (exactly as `stabled`/`mounts` are, for
   *  the same reason): nav rebuilds, per-frame collision and the water mesh all
   *  read that list without importing the store, so toSave saves from it too. */
  waterworks?: WaterFeature[];
  /** Wave 27: in-flight Trade Caravan runs, keyed by caravanRouteKey(from,to)
   *  (data/caravan.ts) — absent = none in flight. See CaravanRun's own doc
   *  comment for the shape. */
  caravans?: Record<string, CaravanRun>;
  /** Wave 49 (C3) · the traveling merchant's live supply/demand pressure per
   *  item, absent = every item still sits at its flat SELL_PRICES/BUY_OFFERS
   *  baseline (every save written before this existed). See data/trade.ts's
   *  own header comment for the decay-on-read formula this drives. */
  marketState?: Partial<Record<ItemId, MarketEntry>>;
}
