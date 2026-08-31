// Shared game types.
import type { RectSection } from './data/grounds';

export type ScreenName = 'auth' | 'menu' | 'options' | 'credits' | 'create' | 'game' | 'stats' | 'help';

export type SkillId = 'woodcutting' | 'mining' | 'smithing' | 'fishing' | 'building' | 'combat' | 'farming';

export type ItemId =
  | 'wood' | 'plank' | 'stone' | 'iron_ore' | 'iron_bar'
  | 'fish' | 'cooked_fish' | 'flowers'
  | 'axe' | 'pickaxe' | 'fishing_rod' | 'hammer'
  | 'sword' | 'shield' | 'crossbow' | 'bolt' | 'gold'
  | 'wheat' | 'bread' | 'longbow' | 'arrow'
  | 'helmet' | 'chestplate'
  // Wave 9 · the two chestplate tiers above the plain iron one. Deliberately
  // separate ItemIds rather than a `tier` field on `chestplate`: a crafted
  // plate lives in the Satchel/Armory as a COUNT, and the recipes below re-
  // forge the tier under them (a Forged plate costs an Iron one), which only
  // works if each tier is its own countable thing. `ChestplateTier` names the
  // same three in the vocabulary a worn slot uses — joined in data/armor.ts.
  | 'chestplate_forged' | 'chestplate_crested'
  // Wave 7 · the two polearms. Both were render-only before: the halberd was
  // an NPC-exclusive mold that only ever entered play as Armory stock
  // (Sealed Crypt salvage) for a defender's loadout, and the spear had no
  // ItemId at all — it existed solely as a WeaponId for the couched-lance
  // joust pose. Both are forge recipes now (data/recipes.ts) and real player
  // melee weapons (combat.ts's MELEE). The Armory stays a separate pool from
  // the Satchel, so a defender's halberd and the player's own never mix.
  | 'halberd' | 'spear'
  | 'herb' | 'potion_heal' | 'potion_stamina' | 'potion_nightvision'
  // Wave 9 · cooking past bread-and-fish. All three are campfire dishes made
  // from ingredients the world ALREADY yields (data/recipes.ts) — no new
  // gatherable, no new node kind — and all three are `EDIBLES` (data/items.ts)
  // on the same vigour ladder the first two dishes set.
  | 'pottage' | 'fish_stew' | 'blossom_tart'
  // Wave 9 · dyes. One per unlockable palette row (data/dyes.ts): brewed at
  // the campfire like the draughts beside them, then spent ONCE to open that
  // row of colours for the rest of the save. They are not worn and not
  // consumed per recolour — see `SaveGame.dyes`.
  | 'dye_woad' | 'dye_madder' | 'dye_tyrian' | 'dye_bark'
  // Wave 5: filled at the brook, poured on a cultivated plot. Not crafted —
  // the water IS the acquisition (see PlayerController's 'draw_water').
  | 'water_bucket'
  // Wave 9 · the two carrier tiers, finally acquirable. Deliberately spelled
  // the SAME as `CarrierTier`'s own two members so the item and the worn tier
  // are one vocabulary (see CARRIER_ITEM in data/villagers.ts) — a third tier
  // would be added in both places or in neither, never half.
  | 'basket' | 'cart';

export interface CharacterConfig {
  name: string;
  headDonor: string;   // minifig model whose head (face) is used
  bodyDonor: string;   // minifig model whose torso decal is used
  armColor: number;    // indices into the global runtime palette
  handColor: number;
  legColor: number;
  hipColor: number;
  /** calling picked at creation (data/classes.ts); absent on older saves */
  classId?: string;
}

export interface QuestObjective {
  id: string;
  label: string;
  /** kind decides which store counter drives it — 'visit' (travelTo a
   *  destination id) and 'talk' (openDialogue with an npc id) are the
   *  Phase 20 travel beats that walk the main quest across the realm */
  kind: 'gather' | 'craft' | 'build' | 'rank' | 'visit' | 'talk';
  target: string; // itemId, recipeId, buildableId, rank name, destination id or npc id
  count: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewardText: string;
  xp?: Partial<Record<SkillId, number>>;
  unlocks?: string[]; // feature flags granted on completion
  grantItems?: Partial<Record<ItemId, number>>;
}

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  output: ItemId;
  outputCount: number;
  cost: Partial<Record<ItemId, number>>;
  station: 'hand' | 'workbench' | 'forge' | 'campfire';
  skill?: SkillId;
  skillXp?: number;
  requiresUnlock?: string;
}

export interface Buildable {
  id: string;
  name: string;
  icon?: string;      // emoji fallback
  thumb?: string;     // asset thumbnail url
  model?: string;     // glb url; procedural if absent
  category: 'essentials' | 'defense' | 'bricks' | 'decor' | 'castle' | 'walls' | 'prefab' | 'siege';
  size: [number, number, number]; // world meters (width, height, depth) at rotation 0
  snap: number;       // placement grid pitch in meters
  stackable: boolean; // may rest on top of other pieces / support pieces above
  cost: Partial<Record<ItemId, number>>;
  requiresUnlock?: string;
  station?: 'workbench' | 'forge' | 'campfire'; // marks placed object as a crafting station
  buildXp: number;
  /** Wave 29 · a hand-picked bill of real bricks.generated.json catalogue
   *  SKUs (each `qty` at that piece's own real cost) whose costs SUM EXACTLY
   *  to this buildable's own `cost` above — "2× Wall Section 2×5, 2× Tower
   *  Piece 2×2" instead of one generic family total. Display-only: `cost` is
   *  still the sole economy truth (canAfford/addItems/refunds/maxHpFor all
   *  read it unchanged), and only a handful of buildables have one so far —
   *  every ItemId a piece could ever cost by resource FAMILY has a real
   *  catalogue SKU (see brickResources.ts's BRICK_RESOURCES), but the
   *  catalogue itself never authored a SKU costed in `iron_bar`/`iron_ore`/
   *  `flowers`/`gold`, so a buildable priced in any of those has no exact
   *  bill and correctly falls back to the old one-canonical-brick-per-family
   *  display (see buildables.ts's `costBill`) rather than a guessed one. */
  pieces?: { id: string; qty: number }[];
}

/** Wave 9 · which tool the aerial build view's left button is holding.
 *  Wave 12 added 'dig' — the same drag-a-rectangle gesture as 'demolish', but
 *  it cuts a waterway instead of taking pieces down (see WaterFeature). */
export type BuildTool = 'build' | 'demolish' | 'dig';

/** Wave 9 · an axis-aligned patch of ground in world metres, dragged out in
 *  build mode. Used by the area-demolish marquee; deliberately plain data so
 *  the drag (BuildController) and the confirmation (BuildBar) can be in two
 *  different components without either owning the other. */
export interface BuildRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlacedBuilding {
  id: string;
  type: string;      // buildable id
  x: number;         // world position (grid-snapped)
  z: number;
  y?: number;        // base elevation (stacking); 0 / undefined = on the ground
  rot: 0 | 1 | 2 | 3; // quarter turns
  /** Wave 9 freeform mode: the piece's TRUE facing in radians, when it was set
   *  down off the quarter-turn lattice. Absent (every snapped piece, and every
   *  save written before Wave 9) means `rot * PI/2` exactly, so nothing older
   *  changes.
   *
   *  Deliberately a SECOND field rather than widening `rot` to a plain number:
   *  every footprint/overlap test in the game (evalPlacement's AABB check,
   *  sizeFor's width/depth swap, walls.ts's attach points, collisionShapes'
   *  boxes) is axis-aligned and only stays correct because rotation is a
   *  multiple of 90°. So `rot` remains the piece's collision truth — rounded to
   *  the nearest quarter turn — and `yaw` is what it LOOKS like. A piece turned
   *  35° therefore stops you along its nearest square footprint; that is the
   *  honest cost of freeform placement without an oriented-box collision
   *  system, and it is why freeform is off by default and aimed at decor. */
  yaw?: number;
  /** Phase 19 build-then-construct: 0..1 construction progress. Absent = 1
   *  (fully built), so every building from an older save just works. */
  built?: number;
  /** which instance this stands in — a claimed template-world plot's own
   *  destination id, or absent/null for the homestead. Every destination's
   *  real coordinates sit far apart in one shared space (see the
   *  instance-separation doctrine), so anything placed at a remote plot
   *  MUST carry this or it renders everywhere at once, including the sky
   *  above the homestead (buildings have no terrain to sit "inside" from a
   *  distant viewer's angle). Older saves (pre-field) implicitly mean home. */
  world?: string | null;
  /** Requested 2026-07-30: "beds... should be exclusively owned by one
   *  villager, no other npc can take their place." Meaningful only for
   *  `type: 'bed'` — the villager id who has claimed it (see
   *  `gameStore.claimBed`). Absent/null = unclaimed. Freed only by
   *  demolishing the bed; villagers are never removed from the roster once
   *  recruited, so that is the only real release path. */
  owner?: string | null;
}

/** a piece counts as real (interactable, standable, functional) only once
 *  its construction finished — absent `built` means a pre-Phase-19 save */
export function isBuilt(b: PlacedBuilding): boolean {
  return (b.built ?? 1) >= 1;
}

/** Wave 8 · a piece that SEALS when shut and lets you through when open.
 *  The Castle Gate was the only one for a long time, so half a dozen systems
 *  (player collision, the nav grid, raider targeting, the battering ram, the
 *  fort ring check) each hardcoded `type === 'gate'`. The Portcullis
 *  (buildables.ts's `door` entry — named for what its mold actually is, a
 *  barred lattice, not a plain hollow doorway) is mechanically the same thing
 *  at a smaller size, and shares `gateOpen` rather than growing a parallel
 *  `doorOpen` record — one predicate here means a future piece of this same
 *  shape reaches all of them by being added once.
 *
 *  Wave 24 · that future piece arrived: `window` (buildables.ts, the
 *  windows_doors 14/16_l4532xx open/closed shutter pair). A closed window is
 *  now a solid obstacle box the same way a wall is — the shared
 *  `forEachObstacleBox` (navgrid.ts) skips it exactly like an open door/gate
 *  when it's open, so `hasLineOfSight` inherits the block-when-shut,
 *  see-through-when-open rule for free, and so does every other consumer
 *  listed above. Kept out of `isRampart` (walls.ts) on purpose by its own
 *  declared height, not by anything here — a window furnishing doesn't need
 *  to independently seal/breach the defense ring. */
export function isDoorLike(type: string): boolean {
  return type === 'gate' || type === 'door' || type === 'window';
}

/** true for a homestead building (world absent/null) — every homestead-only
 *  system (villager recruitment, taxes, raid triggers, the builder/merchant/
 *  bed-seek passes) should filter through this so a remote claimed-plot
 *  structure never counts toward or interferes with home-only mechanics. */
export function isHomeBuilding(b: PlacedBuilding): boolean {
  return (b.world ?? null) === null;
}

export interface ResourceNodeState {
  id: string;
  kind: 'tree' | 'rock' | 'fishing' | 'herb';
  variant?: 'iron'; // iron-vein boulders guarantee ore
  model?: string;
  x: number;
  z: number;
  scale: number;
  yaw: number;
  hitsLeft: number;
  respawnAt: number | null; // epoch ms when it comes back, null = alive
  /** J46 · the named ground this node seeded in (game/data/grounds.ts), or
   *  Wave 5's cultivated-plot id. Absent on saves from before grounds existed
   *  and on the open-water fishing spot, both of which are worked without a
   *  deed. A plot id is deliberately NOT in GROUND_BY_ID, so the deed lock in
   *  findTarget() never fires on something you planted yourself. */
  ground?: string;
  /** Empire arc, Wave 5: which instance this node stands in — a settlement's
   *  own destination id, or absent/null for the homestead. Mirrors
   *  `PlacedBuilding.world`/`Villager.world`'s instance-separation doctrine
   *  exactly; without it ResourceNodes.tsx drew (and instanced) every node in
   *  the world no matter where the player stood. */
  world?: string | null;
}

/** Empire arc, Wave 5 · a piece of ground you cleared and planted yourself.
 *  Same rectangle as a resource ground (RectSection), but earned by work
 *  rather than by a deed: it starts nearly bare and thickens a stage at a
 *  time as it is watered, seeding ordinary ResourceNodeState entries that
 *  chop/mine/forage through the existing harvest path unchanged.
 *  `stage`/`plantedAt`/`lastWateredAt` are LIVE state and only mean anything
 *  on a record inside `cultivatedPlots` — the hand-authored table in
 *  data/cultivatedPlots.ts carries placeholders for them. */
export interface CultivatedPlot extends RectSection {
  id: string;
  /** absent/null = the homestead, same convention as PlacedBuilding.world */
  world?: string | null;
  /** 0 = just cleared and planted, climbing toward MAX_PLOT_STAGE */
  stage: number;
  plantedAt: number;      // epoch ms
  lastWateredAt: number | null;
}

export interface SaveGame {
  version: 1;
  character: CharacterConfig;
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
  /** which one the HUD tracker prefers to show, absent = 'main' */
  trackedQuest?: 'main' | 'side';
  deeds?: string[];
  /** foes scanned into the collection book (not merely killed) */
  bestiary?: string[];
  /** standing between the houses, -100 (Cedric) .. +100 (Leo) */
  allegiance?: number;
  /** ids of every side errand finished, for precursor chains */
  completedSideQuests?: string[];
  /** how far the homestead fence has been bought out (LAND_TIERS index) */
  landTier?: number;
  /** J51 · the composed castle (game/data/keep.ts). Absent on saves from
   *  before the keep could be assembled. */
  keep?: {
    x: number; z: number;
    parts: Record<string, string>;
    built: Record<string, number>;
    /** socket id -> siege HP; absent = full (see data/keep's maxHpForPart) */
    hp?: Record<string, number>;
  } | null;
  /** M · the set on the workshop bench, and the sets already built */
  workshop?: { setNum: string; step: number } | null;
  builtSets?: string[];
  /** caught-and-stabled horse ids, and villagerId -> horseId assignments */
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
  /** Wave 13 · turned on Cedric's own camp after already pledging to him
   *  (gameStore's betrayCedric) — permanent, so `pledgeAlliance('cedric')`
   *  can refuse a known turncoat forever. Absent/false = never happened. */
  betrayedCedric?: boolean;
  /** highest CHALLENGES tier index already notified, per challenge id */
  challengeTiers?: Record<string, number>;
  /** farm plot growth: buildingId -> seconds of growth remaining (-1 = untilled) */
  plots?: Record<string, number>;
  villagers?: Villager[];
  /** the homestead Armory's spare gear, separate from the player's own inventory */
  armory?: Partial<Record<ItemId, number>>;
  treasureOpened?: boolean;
  /** the dragon's night flyover has been witnessed (drives its Deed) */
  dragonSeen?: boolean;
  /** dragonfire sieges weathered / ever driven off with bolts (Deeds) */
  dragonSieges?: number;
  dragonRouted?: boolean;
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
  /** Cedric the Bull's capstone boss fight has been won (see CedricCamp.tsx) */
  defeatedCedric?: boolean;
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
   *  one of these. `since`/`lastCollectedAt` are both epoch ms;
   *  `lastCollectedAt` starts equal to `since` (no backlog owed on day one). */
  settlements?: Record<string, { since: number; lastCollectedAt: number }>;
  /** Empire arc, Wave 5: plot id -> the plot you actually planted, absent =
   *  never broken. The nodes themselves are NOT saved (st.nodes is runtime
   *  only, regenerated by seedNodes on every load and every land purchase) —
   *  this record is the real state, and the cluster is re-derived from its
   *  `stage` each time. */
  cultivatedPlots?: Record<string, CultivatedPlot>;
  /** Wave 12: waterways the player dug themselves (see WaterFeature). Absent
   *  on every save written before digging existed, which reads identically to
   *  an empty list — the static POND is not in here and never will be, it
   *  stays a hand-authored `terrainExclusions` entry. */
  waterworks?: WaterFeature[];
  /** Wave 27: in-flight Trade Caravan runs, keyed by caravanRouteKey(from,to)
   *  (data/caravan.ts) — absent = none in flight. See CaravanRun's own doc
   *  comment for the shape. */
  caravans?: Record<string, CaravanRun>;
}

/**
 * Wave 12 · a body of water the PLAYER cut into the homestead — a pond, a
 * stretch of river, or one side of a moat. Persisted; the static POND is not
 * one of these (it is world geography, declared in data/world.ts).
 *
 * An axis-aligned rectangle, not a circle, and that is the load-bearing
 * decision of the whole feature. `TerrainExclusion` already supports both
 * shapes at no schema cost, and the one water body in the game before this was
 * a circle — but a circle can only ever be a pond. A rectangle is all three
 * things the request asked for: one is a pond, a long thin one is a river or a
 * canal, and four round a keep are a moat. One drag gesture, one shape, and
 * the shape composes, which is what makes freeform unnecessary here rather
 * than merely out of budget.
 *
 * Home only today (there is no `world` field on purpose): the homestead is the
 * one region whose ground is genuinely flat at y=0, and a flat basin cut into
 * a template bake's real slope would hang in the air at one end. The refusal
 * lives in the store's `digPreview`, alongside the rest of the checks that need
 * to know which world you are standing in; `terrainConflict`
 * (game/waterworks.ts) holds the ones that are pure geometry.
 */
export interface WaterFeature {
  id: string;
  /** centre, world metres — always on the build grid (GRID = 2) */
  x: number;
  z: number;
  /** half-extents, world metres — always a whole number of grid cells */
  halfX: number;
  halfZ: number;
  /** gold paid to cut it, kept so filling it in can hand half of that back
   *  without re-deriving a price that may since have been rebalanced */
  paid: number;
}

/**
 * Wave 27 · one in-flight Trade Caravan run between two owned settlements
 * (see data/caravan.ts's own header for why this is a wall-clock
 * abstraction, not a physically-simulated journey — no entity survives a
 * travelTo() scene-swap). `from`/`to` are destination ids (data/worlds.ts);
 * the caravan runs `from` -> `to`, but can be collected from either
 * settlement's own resident once `etaMs` has elapsed since `departedAt`.
 * Keyed in `SaveGame.caravans` by `caravanRouteKey(from, to)` (a sorted
 * pair), so only one run can ever be in flight per route at a time,
 * regardless of which direction it was dispatched.
 */
export interface CaravanRun {
  from: string;
  to: string;
  item: ItemId;
  amount: number;
  /** escort fee paid up front (CARAVAN_INSURANCE_RATE) — guarantees no loss
   *  from the risk roll on collection. */
  insured: boolean;
  departedAt: number;
  etaMs: number;
}

/** a claimed template-world building plot: centered wherever the player
 *  stood when they claimed it, leveled to that one sampled ground height */
export interface ClaimedPlot {
  x: number;
  z: number;
  groundY: number;
}

export interface BlueprintPiece {
  type: string;
  dx: number;
  dz: number;
  rot: 0 | 1 | 2 | 3;
}

export interface Blueprint {
  id: string;
  name: string;
  pieces: BlueprintPiece[];
  starter?: boolean;
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

export interface ActiveSideQuest {
  npcId: string;
  questId: string;
  have: number;
}

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

export interface Villager {
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

/** true for a homestead villager (world absent/null) — mirrors
 *  `isHomeBuilding()` above exactly; every per-world labour system
 *  (`tickVillagers`, `villagerAtWork`) should filter through this or a
 *  settlement resident's production ticks against the homestead's own
 *  buildings/anchor instead of their own settlement's. */
export function isHomeVillager(v: Villager): boolean {
  return (v.world ?? null) === null;
}
