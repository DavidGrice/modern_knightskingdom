// Shared game types.

export type ScreenName = 'auth' | 'menu' | 'options' | 'credits' | 'create' | 'game' | 'stats' | 'help';

export type SkillId = 'woodcutting' | 'mining' | 'smithing' | 'fishing' | 'building' | 'combat' | 'farming';

export type ItemId =
  | 'wood' | 'plank' | 'stone' | 'iron_ore' | 'iron_bar'
  | 'fish' | 'cooked_fish' | 'flowers'
  | 'axe' | 'pickaxe' | 'fishing_rod' | 'hammer'
  | 'sword' | 'shield' | 'crossbow' | 'bolt' | 'gold'
  | 'wheat' | 'bread' | 'longbow' | 'arrow'
  | 'helmet' | 'chestplate'
  // the halberd is an NPC-exclusive visual mold with no crafting recipe of
  // its own (see data/villagers.ts's DEFENDER_LOADOUTS) — it only ever enters
  // play as Armory stock, salvaged from a Sealed Crypt clear, never into the
  // player's own Satchel
  | 'halberd'
  | 'herb' | 'potion_heal' | 'potion_stamina' | 'potion_nightvision';

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
}

export interface PlacedBuilding {
  id: string;
  type: string;      // buildable id
  x: number;         // world position (grid-snapped)
  z: number;
  y?: number;        // base elevation (stacking); 0 / undefined = on the ground
  rot: 0 | 1 | 2 | 3; // quarter turns
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
}

/** a piece counts as real (interactable, standable, functional) only once
 *  its construction finished — absent `built` means a pre-Phase-19 save */
export function isBuilt(b: PlacedBuilding): boolean {
  return (b.built ?? 1) >= 1;
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
  /** J46 · the named ground this node seeded in (game/data/grounds.ts).
   *  Absent on saves from before grounds existed and on the open-water
   *  fishing spot, both of which are worked without a deed. */
  ground?: string;
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
  } | null;
  /** M · the set on the workshop bench, and the sets already built */
  workshop?: { setNum: string; step: number } | null;
  builtSets?: string[];
  /** caught-and-stabled horse ids, and villagerId -> horseId assignments */
  stabled?: string[];
  mounts?: Record<string, string>;
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
  /** NPC ids whose one-time voiced lore introduction has already played */
  loreSeen?: string[];
  /** Cedric the Bull's capstone boss fight has been won (see CedricCamp.tsx) */
  defeatedCedric?: boolean;
  /** Phase 19 alliance branch: who the player pledged to; null/absent = unsworn */
  alliance?: Alliance | null;
  /** Phase 21 guilds: primary guild id (data/guilds.ts); null/absent = unaffiliated */
  guild?: string | null;
  /** Phase 21 talent tree: purchased talent ids (data/skillTree.ts) */
  skillTree?: string[];
  /** player attribute points invested (data/playerAttributes.ts) */
  attrSpent?: Partial<Record<'might' | 'diligence' | 'craft' | 'courage' | 'wit', number>>;
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

export type VillagerJob = 'idle' | 'lumberjack' | 'miner' | 'farmer' | 'merchant' | 'defender' | 'builder';

/** Phase 19 alliance branch: pledge to the crown or to Cedric's rebellion —
 *  whichever side you DIDN'T choose raids the homestead from then on. */
export type Alliance = 'leo' | 'cedric';

export type DefenderLoadout = 'bow' | 'sword_shield' | 'halberd';

/** A worn item that raises `carryCapacityOf()`'s result (game/data/
 *  attributes.ts) — basket first, cart a larger tier above it. Acquisition
 *  (crafting recipe, Armory stock, roster equip UI, a visual mesh) is
 *  deliberately NOT built yet — see ROADMAP.md's "Carrier item content"
 *  entry. This type exists now so the capacity formula and Villager.gear
 *  shape are real and testable ahead of that. */
export type CarrierTier = 'basket' | 'cart';

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
  /** worn armor, drawn from the homestead Armory (any job can wear these —
   *  defenders additionally get a small combat bonus per piece, see
   *  Defenders.tsx). Absent/false = bare-headed/chested. `carrier` raises
   *  carry capacity (game/data/attributes.ts's carryCapacityOf) — absent =
   *  no bonus. Unlike helmet/chestplate it isn't Armory-backed yet; see
   *  CarrierTier's own comment. */
  gear?: { helmet?: boolean; chestplate?: boolean; carrier?: CarrierTier };
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
}
