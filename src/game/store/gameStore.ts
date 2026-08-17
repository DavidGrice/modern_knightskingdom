'use client';
import { create } from 'zustand';
import type {
  ActiveSideQuest, Alliance, Blueprint, BlueprintPiece, BuildRect, BuildTool, CarrierTier, CharacterConfig, ChestplateTier, ClaimedPlot, CultivatedPlot, DefenderLoadout, ItemId,
  LifetimeStats, PlacedBuilding, Quest, ResourceNodeState, SaveGame, SkillId, Villager, VillagerJob,
  WaterFeature,
} from '../types';
import { isBuilt, isHomeBuilding } from '../types';
import type { InputDevice } from '../inputMode';
import { GROUNDS, groundAt, type RectSection } from '../data/grounds';
import { MAX_PLOT_STAGE, PLOT_BY_ID, plotNodeCount } from '../data/cultivatedPlots';
import { ROAD_HALF_WIDTH, ROAD_TILE, roadEntry, routeCells, vergeCells } from '../data/road';
import { SET_PLANS, locateStep, setStepCount } from '@/lib/setBuild';
import { arriveByRoad, villagerMobs } from '../villagerMobs';
import { npcMobs } from '../npcMobs';
import { KEEP_PART_BY_ID, KEEP_SIZE, KEEP_SOCKETS, SOCKET_BY_ID, keepComplete, maxHpForPart, type KeepState } from '../data/keep';
import { brickLabel } from '../data/brickResources';
import { LAND_TIERS, MAX_LAND_TIER } from '../data/buildables';
import { stabledHorses } from '../riding';
import { agentManager } from '@/ai/core/AgentManager';
import { resetVillagerAgentSync } from '@/ai/rosterSync';
import { resetNpcAgentSync } from '@/ai/npcSync';
import { resetCourtAmbientAgentSync } from '@/ai/courtAmbientSync';
import { targetRegistry } from '@/ai/core/TargetRegistry';
import { resetSounds } from '@/ai/perception/sounds';
import { workSignals, clearAllWorkSignals } from '../workSignal';
import { NPC_BY_ID, NPCS, poisForDestination, sideQuestBlocker, sideQuestGiverName, sideQuestsOf } from '../data/npcs';
import { SELL_PRICES } from '../data/trade';
import { DEEDS } from '../data/achievements';
import { CHALLENGES, challengeProgress } from '../data/challenges';
import { CREST_UNLOCKS, unlockCrest, crestLabel } from '../data/crestUnlocks';
import { CLASS_BY_ID } from '../data/classes';
import { attrsOf, tradeLevelOf, tradeXpOf, tripSpeedMult, SIDE_GOODS, type AttrId } from '../data/attributes';
import { PLAYER_ATTRS, attrPointsEarned, attrPointsSpent, respecCost } from '../data/playerAttributes';
import { bestStore, roomFor } from '../storage';
import { COMPANION_TRAIT_BY_ID, HAUL_TRAIT, SIDE_TRAIT, hasTrait, traitSlots, traitsOwnedInJob, tripTraitMult } from '../data/companionTraits';
import { GUILD_BY_ID, guildEligible, SWITCH_TITHE } from '../data/guilds';
import { TALENT_BY_ID, talentBuyable } from '../data/skillTree';
import { CARRIER_ITEM, CARRIERS, DEFENDER_LOADOUTS, isWorkingHours, JOB_BY_ID, JOB_NODE_KIND, LOADOUT_REQUIRES, MAX_VILLAGERS, settlementAnchor, VILLAGER_NAMES, villagerHomeSpot, villagerRequirement } from '../data/villagers';
import { QUESTS } from '../data/quests';
import { RECIPES } from '../data/recipes';
import { capOf, labDamagedForm } from '../data/labCapabilities';
import { ITEMS } from '../data/items';
import { CHESTPLATE_BY_TIER, CHESTPLATE_ITEM, chestplateTierOf } from '../data/armor';
import { DYE_ROW_BY_ID } from '../data/dyes';
import { PERKS } from '../data/perks';
import {
  activeBuildRegion, BUILDABLE_BY_ID, BUILD_REGION, MAX_STACK_HEIGHT, buildableForLabAsset,
  buildingsInRect, heightOf, labAssetId, maxHpFor, sizeFor,
} from '../data/buildables';
import { STARTER_BLUEPRINT_BY_ID } from '../data/blueprints';
import { wallSnap } from '../walls';
import { levelFromXp, perkSlotsEarned, rankFromTotalLevel, RANKS, SKILLS, totalSkillLevel, xpForLevel } from '../data/ranks';
import { audio } from '@/lib/audio';
import { worldEnv, seasonOf } from '../env';
import { playerState, resetPlayerState } from '../playerState';
import { aimState } from '../targeting';
import { ALLEGIANCE_MAX, ALLEGIANCE_MIN, allegianceTier } from '../data/allegiance';
import { POND, FISHING_DOCK, NPC_KING, SIGNPOST, STARTER_VILLAGE_CLEAR, WORLD_HALF } from '../data/world';
import { WORLD_DESTINATION_BY_ID, ARENA_ORIGIN } from '../data/worlds';
import { INTERIORS, enterSpawnFor, pocketFor } from '../data/interiors';
import { cartLivePos } from '../carts';
import {
  FILL_REFUND, MAX_WATERWORKS, digCost, setWaterworks, shapeConflict,
  snapDigRect, terrainConflict, waterAt, waterworks, waterworksInRect,
} from '../waterworks';
import { dungeonState, generateDungeonLayout, resetDungeon, DUNGEON_UNLOCK_QUEST } from '../dungeon';
import { resetArenaRun, endArenaRun, type ArenaEnvId } from '../arena';
import { buildChallengeState, BUILD_CHALLENGE_ID, BUILD_CHALLENGE_TARGET } from '../buildChallenge';

const ZERO_XP: Record<SkillId, number> = {
  woodcutting: 0, mining: 0, smithing: 0, fishing: 0, building: 0, combat: 0, farming: 0,
};

const ZERO_STATS: LifetimeStats = {
  playtimeSec: 0, resourcesGathered: 0, kills: 0, distanceMeters: 0, buildingsPlaced: 0,
  nodesHarvested: {}, buildingsByType: {}, killsByKind: {}, goldEarnedLifetime: 0,
  itemsCrafted: 0, dungeonsCleared: 0,
};

/** seconds of active play for a wheat crop to mature */
export const GROW_TIME = 200;

// Wave 9 · a full store refuses goods on every villager trip and every swing;
// one toast per this window is enough to be understood without becoming the
// notification feed. Module-level (not store state) for the same reason
// `notifSeq` is: it is presentation bookkeeping, never saved.
const FULL_STORE_NOTIFY_MS = 9000;
let lastFullStoreNotifyAt = 0;

/** real-time cooldown between keep tax collections (Phase 13) */
export const TAX_COOLDOWN_MS = 5 * 60 * 1000;

export interface Notification { id: number; text: string; gold?: boolean }

export type PanelId = 'none' | 'inventory' | 'crafting' | 'quests' | 'skills' | 'emotes' | 'dialogue' | 'shop' | 'villagers' | 'travel' | 'chronicle' | 'parley' | 'guild' | 'commands' | 'npcEquip' | 'stationMenu' | 'appearance' | 'bestiary' | 'keepSocket' | 'buildingMenu' | 'workshop';

export type CameraMode = 'fps' | 'third';

interface GameState {
  // persisted
  character: CharacterConfig | null;
  inventory: Partial<Record<ItemId, number>>;
  xp: Record<SkillId, number>;
  unlocks: string[];
  completedQuests: string[];
  questProgress: Record<string, Record<string, number>>;
  buildings: PlacedBuilding[];
  // runtime world
  nodes: ResourceNodeState[];
  // runtime ui
  panel: PanelId;
  paused: boolean;
  buildMode: boolean;
  photoMode: boolean;
  notifications: Notification[];
  prompt: string | null;
  /** Wave 15: live "what did the player's hands touch most recently" fact —
   *  NOT persisted (game/inputMode.ts owns the split vs Settings.inputMode,
   *  which IS persisted). Read by HUD.tsx/Panels.tsx via resolveInputDevice()
   *  whenever that setting is 'auto'. */
  activeInputDevice: InputDevice;
  actionProgress: number | null; // 0..1 while gathering
  nearStations: string[];
  buildSelection: string | null; // buildable id chosen in the aerial build bar
  blueprintSelection: string | null; // blueprint id chosen for multi-piece stamping
  movingBuilding: PlacedBuilding | null; // picked-up structure being repositioned
  /** Wave 9 · which build-mode tool the pointer is holding. 'build' is
   *  everything the build view could already do (place / move / right-click
   *  remove); 'demolish' swaps the left button for an area drag. Transient UI,
   *  never saved — the tool you were holding is not part of the homestead. */
  buildTool: BuildTool;
  /** Wave 9 · freeform placement: the ghost stops rounding to the piece's grid
   *  (and stops latching to wall ends), and R turns it in fine steps instead of
   *  quarter turns. Off by default and transient — the grid is still the way
   *  the game is meant to be built, this is for dressing a scene. */
  freeformBuild: boolean;
  /** Wave 9 · the area-demolish marquee once the drag has been released and is
   *  awaiting confirmation. Non-null = a rectangle is armed and BuildBar is
   *  showing what it would cost. Transient. */
  demolishRect: BuildRect | null;
  /** Wave 12 · the DIG marquee, the exact same arm-then-confirm shape as
   *  `demolishRect` above and separate from it on purpose: both tools can have
   *  a patch parked on the rail, and one confirm button firing the other tool's
   *  rectangle is the worst possible way to find out they were sharing a field.
   *  Already snapped to the dig lattice when it lands here. Transient. */
  digRect: BuildRect | null;
  cameraMode: CameraMode;
  targetKind: string | null;     // what the interact ray is aimed at (drives viewmodel tool)
  emote: { clip: string; seq: number } | null;
  npcGreetSeq: number;           // bumps when the player talks to an NPC
  npcGreetId: string | null;     // which NPC waved last
  npcGreetClip: string | null;   // override clip for the greet (defaults per-character if unset)
  ceremony: { rank: string } | null; // Knight/Paladin promotion cutscene in progress
  dialogueNpc: string | null;    // NPC shown in the dialogue panel
  equippingVillagerId: string | null; // villager shown in the NPC equip paperdoll (transient, never saved)
  activeStation: 'workbench' | 'forge' | 'campfire' | null; // station shown in the focused station quick-menu (transient, never saved)
  sideQuest: ActiveSideQuest | null;
  trackedQuest: 'main' | 'side'; // which one the HUD QuestTracker prefers to show (player-set); falls back to 'main' whenever no side errand is actually active
  deeds: string[];               // earned achievement ids
  challengeTiers: Record<string, number>; // highest CHALLENGES tier index notified per challenge id
  plots: Record<string, number>; // farm plots: remaining growth seconds (-1 = untilled)
  gateOpen: Record<string, boolean>; // gate buildings: absent/true = open (passable)
  buildingHp: Record<string, number>; // buildings under siege: absent = full HP (see maxHpFor)
  reputation: Record<string, number>; // per-NPC standing (see data/npcs repTitles), absent = 0
  destination: string | null;    // template-world id being visited; null = home
  visitedWorlds: string[];       // template-world ids visited (one-time loot already granted)
  /** Wave 14 · POI ids (resident NPC ids, see data/npcs.ts's
   *  poisForDestination) reached at least once via a waypoint travel —
   *  display-only, exactly like visitedWorlds; never gates travel itself. */
  discoveredPois: string[];
  loreSeen: string[];            // NPC ids whose one-time voiced lore intro has played
  defeatedCedric: boolean;       // Cedric the Bull's capstone boss fight has been won
  alliance: Alliance | null;     // Phase 19: who the player pledged to; null = unsworn
  /** the continuous standing between the houses, -100 (Cedric) .. +100 (Leo).
   *  The pledge above is a one-off act of will; this is what your DEEDS say,
   *  and the two are allowed to disagree. See data/allegiance.ts. */
  allegiance: number;
  /** every errand ever finished, so `requires` chains have something to read
   *  and a completed errand is not re-offered as though it were new */
  completedSideQuests: string[];
  /** how far the homestead's fence has been pushed out (data/buildables.ts's
   *  LAND_TIERS). Every tier is a size a wall run actually closes on. */
  landTier: number;
  /** J51 · the composed castle: its foundation and what stands in each
   *  socket. null until the player lays the foundation. */
  keep: KeepState | null;
  /** which keep socket the player is stood at, for the socket panel */
  keepSocket: string | null;
  /** L72 · which placed building the action menu is open on */
  menuBuilding: string | null;
  /** M · the set currently on the workshop bench, and how far it has got */
  workshop: { setNum: string; step: number } | null;
  /** M · sets built to completion, newest last */
  builtSets: string[];
  /** G27 · horses caught and walked home, and which defender rides which.
   *  Mirrored into riding.ts's leaf module on load, because the mounted
   *  patrol AI reads it every frame and must not go through the store. */
  stabled: string[];
  mounts: Record<string, string>;
  /** Wave 13 · the falcon companion (game/falcon.ts) has been tamed. See
   *  SaveGame.falconTamed for why this is one flag, not a roster like the
   *  horses above. */
  falconTamed: boolean;
  /** Wave 13 · turned on Cedric's own war council once already sworn to him
   *  (see betrayCedric). A permanent burnt bridge, not a cooldown: once
   *  true, `pledgeAlliance('cedric')` refuses forever — the one thing that
   *  keeps a one-time defection from becoming a free way to ping-pong
   *  between the two pledges. */
  betrayedCedric: boolean;
  buyLand: () => void;
  /** shift the axis and tell the player why it moved */
  shiftAllegiance: (delta: number, reason: string) => void;
  guild: string | null;          // Phase 21: primary guild id (data/guilds.ts); null = unaffiliated
  skillTree: string[];           // Phase 21: purchased talent ids (data/skillTree.ts)
  attrSpent: Partial<Record<AttrId, number>>; // player attribute points invested (playerAttributes.ts)
  dyes: string[];                // Wave 9: palette rows opened with a brewed dye (data/dyes.ts)
  durability: Partial<Record<ItemId, number>>; // 0-100 wear per degradable tool, absent = full
  perks: string[];               // skill-perk ids picked at rank-ups (see data/perks.ts)
  stats: LifetimeStats;          // lifetime counters shown on the Stats page
  claimedWorlds: Record<string, ClaimedPlot>; // template-world id -> claimed building plot, absent = unclaimed
  customBlueprints: Blueprint[]; // player-saved structures (see data/blueprints.ts for starter ones)
  lastTaxAt: number;              // epoch ms of last keep tax collection, 0 = never
  /** Empire arc, Wave 4: destination id -> founded settlement, absent = not
   *  yet earned. See SaveGame.settlements' own doc comment for how this
   *  differs from claimedWorlds. */
  settlements: Record<string, { since: number; lastCollectedAt: number }>;
  /** Empire arc, Wave 5: plot id -> the plot you actually broke and planted,
   *  absent = still wild grass. See SaveGame.cultivatedPlots. */
  cultivatedPlots: Record<string, CultivatedPlot>;
  /** Wave 12 · the waterways the player has cut (see WaterFeature). Mirrored
   *  into game/waterworks.ts's leaf module on every change, exactly as
   *  `stabled`/`mounts` are mirrored into riding.ts and for the same reason:
   *  nav rebuilds, per-frame collision and the water mesh all have to read this
   *  without importing the store. The store copy is what saves and what React
   *  re-renders on; the leaf module is what the frame loop reads. */
  waterworks: WaterFeature[];
  villagers: Villager[];
  villagerProgress: Record<string, number>; // villagerId -> seconds until next delivery
  /** the homestead Armory: spare gear held for the garrison, separate from
   *  the player's own Satchel — stocked by raids/dungeon clears (or donated
   *  from the Satchel) and drawn down when a villager equips a piece. */
  armory: Partial<Record<ItemId, number>>;
  /** the id of the PlacedBuilding whose interior the player is currently
   *  inside, null while outdoors — generalised 2026-07-30 from a plain
   *  boolean that only ever meant "in the Grand Keep" (see data/interiors.ts) */
  interior: string | null;
  enteredInteriorPos: [number, number] | null; // outdoor position to return to on exit
  treasureOpened: boolean;        // one-time reward already claimed from the keep's chest
  dragonSeen: boolean;            // witnessed the dragon's night flyover (drives its Deed)
  dragonSieges: number;           // dragonfire sieges weathered (Flame and Stone deed)
  dragonRouted: boolean;          // ever drove the beast off with bolts (Sting the Sky)
  cedricSieges: number;           // Cedric's homestead sieges weathered (The Bull at the Gate deed)
  cedricRouted: boolean;          // ever drove his war party off before the timer (Gore for Gore)
  timeOfDay: number;             // low-frequency mirror of worldEnv.time (HUD/saves)
  dayCount: number;               // low-frequency mirror of worldEnv.dayCount (HUD/saves)
  season: number;                 // low-frequency mirror of seasonOf(dayCount) (HUD/saves)
  dirty: boolean; // needs saving

  // lifecycle
  newGame: (c: CharacterConfig) => void;
  loadFromSave: (s: SaveGame) => void;
  toSave: () => SaveGame;
  seedNodes: () => void;

  // ui
  setPanel: (p: PanelId) => void;
  /** change how the character LOOKS mid-game (see AppearancePanel) — not
   *  their name or calling, which are identity and stay fixed */
  setCharacter: (c: CharacterConfig) => void;
  setPaused: (v: boolean) => void;
  setBuildMode: (v: boolean) => void;
  setPhotoMode: (v: boolean) => void;
  setPrompt: (p: string | null) => void;
  setActiveInputDevice: (d: InputDevice) => void;
  setActionProgress: (v: number | null) => void;
  setNearStations: (s: string[]) => void;
  setBuildSelection: (id: string | null) => void;
  setBlueprintSelection: (id: string | null) => void;
  claimWorld: (destId: string, x: number, z: number, groundY: number) => void;
  /** Empire arc, Wave 4: closes the settlement deed at a destination —
   *  claims the plot (a no-op if already claimed via the ordinary
   *  claimWorld/ClaimBanner path), records the settlement, and grants its
   *  first residents. x/z/groundY are the player's own position/sampled
   *  ground when they close the deed, same convention claimWorld already
   *  uses (see ClaimBanner.tsx). */
  foundSettlement: (destId: string, x: number, z: number, groundY: number) => void;
  /** Empire arc, Wave 4: wall-clock settlement income, mirroring
   *  collectTaxes' own cooldown-then-flat-amount shape exactly. */
  collectSettlementYield: (destId: string) => void;
  /** Empire arc, Wave 5: break and plant one of the hand-authored plots
   *  (data/cultivatedPlots.ts). Seeds a sparse stage-0 cluster. */
  cultivatePlot: (plotId: string) => void;
  /** Wave 5: pour a Pail of Water on a planted plot — one stage thicker, one
   *  pail spent. */
  waterPlot: (plotId: string) => void;
  captureBlueprint: (name: string, x: number, z: number) => boolean;
  deleteBlueprint: (id: string) => void;
  placeBlueprintAt: (blueprintId: string, x: number, z: number, rot: 0 | 1 | 2 | 3) => boolean;
  evalBlueprintPlacement: (
    blueprintId: string, x: number, z: number, rot: 0 | 1 | 2 | 3,
  ) => { pieces: { type: string; x: number; z: number; rot: 0 | 1 | 2 | 3; y: number; valid: boolean }[]; valid: boolean; cost: Partial<Record<ItemId, number>> };
  collectTaxes: () => void;
  setCameraMode: (m: CameraMode) => void;
  setTargetKind: (k: string | null) => void;
  playEmote: (clip: string) => void;
  pokeNpc: (id: string, clip?: string) => void;
  beginCeremony: (rank: 'Knight' | 'Paladin') => void;
  joustRichard: () => void;
  openDialogue: (npcId: string) => void;
  acceptSideQuest: (npcId: string, questId: string) => void;
  turnInSideQuest: () => void;
  abandonSideQuest: () => void;
  setTrackedQuest: (which: 'main' | 'side') => void;
  recordKill: (kind: string) => void;
  /** foes the player has SCANNED (aimed at and studied) — the collection
   *  book. Kills alone do not fill it in: you have to look. */
  bestiary: string[];
  scanTarget: () => void;
  /** external systems (combat.ts's duel resolution) credit errand progress
   *  through this rather than importing the module-private counter */
  bumpErrand: (kind: 'joust' | 'duel', target: string, amount: number) => void;
  sellItem: (item: ItemId, qty: number) => void;
  buyOffer: (item: ItemId, qty: number, price: number) => void;
  checkDeeds: () => void;
  /** Wave 13 · tame the falcon companion — a no-op once already tamed,
   *  mirroring markDragonSeen/openTreasureChest's own one-way guard. */
  tameFalcon: () => void;
  markDragonSeen: () => void;
  recordDragonSiege: (routed: boolean) => void;
  /** Cedric's Siege: a homestead siege ended — routed before the timer, or
   *  endured to its end. Mirrors recordDragonSiege exactly. */
  recordCedricSiege: (routed: boolean) => void;
  checkChallenges: () => void;
  plantPlot: (buildingId: string) => void;
  harvestPlot: (buildingId: string) => void;
  tickPlots: (dt: number) => void;
  toggleGate: (buildingId: string) => void;
  damageBuilding: (id: string, amount: number, cause?: string) => void;
  settleCart: (id: string) => void;
  addReputation: (npcId: string, amount: number) => void;
  /** Wave 14 · `poiId` optionally waypoints straight to a resident POI's own
   *  x/z/yaw (data/npcs.ts's poisForDestination) instead of the
   *  destination's generic `origin`. Absent = unchanged pre-Wave-14
   *  behavior. An unrecognized/unrevealed poiId is silently ignored and
   *  falls back to a plain destination-level travel. */
  travelTo: (id: string, poiId?: string) => void;
  returnHome: () => void;
  enterDungeon: () => void;
  enterArena: (envId: ArenaEnvId) => void;
  leaveArena: () => void;
  markLoreSeen: (npcId: string) => void;
  markCedricDefeated: () => void;
  pledgeAlliance: (side: Alliance) => void;
  /** Wave 13 · the one turncoat move this wave ships: a knight already
   *  sworn to Cedric can turn on his own camp and return to unsworn ground,
   *  free to pledge Leo properly afterwards. One-directional and permanent
   *  — see `betrayedCedric`'s own doc comment for why Leo->Cedric is NOT
   *  the mirror of this (the interact branch that greets a Leo-sworn knight
   *  at Cedric's camp is a duel, not a parley, so there is no symmetric
   *  "ask to defect" moment to hang this off without redesigning that
   *  branch — left out of scope, see ROADMAP). */
  betrayCedric: () => void;
  joinGuild: (guildId: string) => void;
  buyTalent: (talentId: string) => void;
  spendAttrPoint: (id: AttrId) => void;
  /** Wave 9 · hand every invested attribute point back for gold (cost from
   *  data/playerAttributes' respecCost). No-op when nothing is invested. */
  respecAttributes: () => void;
  chooseTrait: (villagerId: string, traitId: string) => void;
  useTool: (id: ItemId) => void;
  repairTool: (id: ItemId) => void;
  choosePerk: (id: string) => void;
  tickVillagers: (dt: number) => void;
  checkVillagerArrival: () => void;
  recruitVillageFolk: (npcId: 'farmer_alric' | 'miller_beda') => void;
  openVillagerEquip: (villagerId: string) => void;
  openStationMenu: (station: 'workbench' | 'forge' | 'campfire') => void;
  grantArmory: (item: ItemId, qty: number) => void;
  donateToArmory: (item: ItemId, qty: number) => void;
  equipVillagerGear: (villagerId: string, slot: 'helmet' | 'chestplate') => void;
  unequipVillagerGear: (villagerId: string, slot: 'helmet' | 'chestplate') => void;
  /** Wave 9 armor tiers — the tiered half of the chestplate slot. The pair
   *  above still works and still means the plain iron plate (they delegate
   *  here), so the Armory's drag-and-drop and every older caller are
   *  unchanged; this is what a tier button in the Roster calls. */
  equipVillagerChestplate: (villagerId: string, tier: ChestplateTier) => void;
  unequipVillagerChestplate: (villagerId: string) => void;
  /** Wave 9 dyes — spends one brewed dye to open its palette row for good */
  unlockDye: (rowId: string) => void;
  setVillagerLook: (villagerId: string, look: Partial<NonNullable<Villager['look']>>) => void;
  resetVillagerLook: (villagerId: string) => void;
  assignJob: (villagerId: string, job: VillagerJob) => void;
  /** the villager's owned bed if they have one, else claims the first free
   *  one (persisted on the building itself, see `PlacedBuilding.owner`),
   *  else their own fixed home spot if no bed is available at all */
  claimBed: (villagerId: string) => { x: number; z: number };
  setDefenderLoadout: (villagerId: string, loadout: DefenderLoadout) => void;
  unequipDefenderLoadout: (villagerId: string) => void;
  /** Wave 9 carriers — tiered, not boolean, so these mirror the loadout pair
   *  directly above (auto-refund on a swap) rather than equipVillagerGear. */
  equipVillagerCarrier: (villagerId: string, tier: CarrierTier) => void;
  unequipVillagerCarrier: (villagerId: string) => void;
  stationDefender: (villagerId: string, buildingId: string | null) => void;
  setDefenderShift: (villagerId: string, shift: 'day' | 'night') => void;
  gainDefenderXp: (villagerId: string, amount: number) => void;
  enterInterior: (buildingId: string) => void;
  exitInterior: () => void;
  openTreasureChest: () => void;
  setTimeOfDay: (t: number) => void;
  setDayCount: (n: number) => void;
  setSeason: (n: number) => void;
  sleep: () => void;
  markSaved: () => void;
  notify: (text: string, gold?: boolean) => void;
  flushStats: (delta: { distanceMeters: number; playtimeSec: number }) => void;
  recordDungeonClear: () => void;

  // systems
  /** returns what was actually accepted after the storage cap (game/storage.ts)
   *  — identical to `items` whenever there is room, which is the normal case */
  addItems: (items: Partial<Record<ItemId, number>>, source?: 'gather' | 'craft' | 'grant') => Partial<Record<ItemId, number>>;
  addXp: (skill: SkillId, amount: number) => void;
  harvestNode: (nodeId: string) => void;
  /** AI-only, single-swing harvest for `GatherAtNode` (PHASE_2_NAVIGATION_
   *  AND_GATHERING.md §3.5/§4) — distinct from `harvestNode`, the player's
   *  own action, which empties a whole node in one go with skill/guild bonus
   *  rolls that make no sense applied against the player's own state for a
   *  background villager. Yields exactly one base resource per call and
   *  decrements `hitsLeft` by one. Returns null if the node doesn't exist or
   *  is already unavailable. Never calls `addItems` — the yield goes into
   *  the calling Activity's own `bb.carrying`, not the shared inventory
   *  (§4: that only happens on `HaulToDeposit`'s deposit, via `addItems`). */
  gatherSwing: (nodeId: string) => { item: ItemId; amount: number } | null;
  /** Wave 10 · AI-only, the villager farmer's half of the farmplot cycle —
   *  `gatherSwing`'s counterpart for a TIMER-based resource. `plantPlot`/
   *  `harvestPlot` stay exactly as the player's own hands use them (a notify,
   *  farming skill XP, straight into the satchel); this one moves the same
   *  `st.plots` state machine but hands the yield BACK to the caller so it
   *  lands in the hauler's sack and is walked to the stores like every other
   *  trade's load, instead of teleporting into the inventory out at the plot.
   *  One call per arrival, not a swing loop: `'planted'` when an untilled plot
   *  was sown, a yield when a ready one was cut, `null` when the plot is still
   *  growing or gone (the caller has nothing to do there). */
  tendPlot: (buildingId: string) => 'planted' | { item: ItemId; amount: number } | null;
  /** Phase 5, iteration 5.8b — the trade-mastery half of a completed trip,
   *  extracted out of tickVillagers' own inline block (it was hardcoded
   *  there, flagged during phase-5 validation as a real continuity risk)
   *  so `HaulToDeposit`'s real deposit (haul.ts) can grant the same +10
   *  per completed haul that tickVillagers grants per completed timer-trip
   *  — an AI-migrated villager must not silently stop leveling just
   *  because their yield now comes from a real haul instead of the old
   *  timer. No-ops for a villager with no matching record or job 'idle'. */
  awardTradeXp: (villagerId: string, amount: number) => void;
  tickRespawns: () => void;
  craft: (recipeId: string) => boolean;
  canAfford: (cost: Partial<Record<ItemId, number>>) => boolean;
  placeBuilding: (type: string, x: number, z: number, rot: 0 | 1 | 2 | 3, yaw?: number) => boolean;
  /** Wave 9 · lay a whole run of one wall-family piece in a single action.
   *  `cells` are the already-stepped centres BuildController's row drag drew,
   *  in order from the anchor outward; each is re-offered to walls.ts's
   *  `wallSnap` as it goes so a run genuinely latches onto whatever is standing
   *  (including the segment laid a moment earlier), and the run STOPS at the
   *  first cell that will not take — out of materials, off the region, blocked.
   *  Returns how many actually went down. One undo entry for the lot. */
  placeRow: (type: string, cells: { x: number; z: number }[], rot: 0 | 1 | 2 | 3) => number;
  constructBuilding: (id: string, amount: number) => void;
  /** J51 · lay the castle foundation at (x, z) — sockets open once it exists */
  foundKeep: (x: number, z: number) => void;
  /** open the socket panel for one named socket */
  openKeepSocket: (socketId: string) => void;
  /** L72 · open the action menu for a placed building */
  openBuildingMenu: (id: string) => void;
  /** L72 · mount an explosive charge on a wall piece */
  mountCharge: (buildingId: string, chargeType: string) => void;
  /** M · put a set on the bench (or swap the one that is there) */
  startSet: (setNum: string) => void;
  /** M · set the next piece; returns false if it could not be paid for */
  placeSetPart: () => boolean;
  /** M · clear the bench without finishing */
  clearBench: () => void;
  /** commit a part to one socket, paying its bill of pieces */
  raiseKeepPart: (socketId: string, partId: string) => void;
  /** one hammer swing's worth of work on a socket's piece */
  workKeepPart: (socketId: string, amount: number) => void;
  /** J51 · a raised piece takes siege damage — knocked down (socket cleared,
   *  half materials refunded) at 0 HP, same shape as damageBuilding */
  damageKeepPart: (socketId: string, amount: number, cause?: string) => void;
  /** `quiet` (Wave 9) folds the per-piece toast + crash sound into the caller's
   *  own single report — for area demolition, where twenty of each at once is
   *  noise rather than feedback. */
  removeBuilding: (id: string, consumed?: boolean, quiet?: boolean) => void;
  /** resolve stacking elevation + validity for a ghost at (x, z) */
  evalPlacement: (type: string, x: number, z: number, rot: 0 | 1 | 2 | 3, ignoreId?: string) => { y: number; valid: boolean };
  pickupBuilding: (id: string) => void;
  /** J51 · pick the whole foundation up — every socket's part/progress/HP
   *  travels with it, ready to set down again via the same movingBuilding
   *  ghost flow an ordinary building uses */
  pickupKeep: () => void;
  cancelMove: () => void;
  finishMove: (x: number, z: number, rot: 0 | 1 | 2 | 3, yaw?: number) => boolean;
  undoLast: () => void;
  /** Wave 9 · build-view tool/mode switches (all transient, never saved) */
  setBuildTool: (tool: BuildTool) => void;
  setFreeformBuild: (on: boolean) => void;
  /** arm (or clear, with null) the area-demolish marquee */
  setDemolishRect: (rect: BuildRect | null) => void;
  /** what the armed marquee currently covers: the pieces it would take and the
   *  materials they would hand back. Pure read — BuildBar shows it before the
   *  player commits, which is the whole safety net for an action that can level
   *  a wall run in one click. */
  demolishPreview: () => { ids: string[]; refund: Partial<Record<ItemId, number>> };
  /** tear down everything the armed marquee covers, piece by piece through the
   *  ordinary removeBuilding path, then clear the marquee */
  demolishArea: () => void;

  // ---- Wave 12 · digging ---------------------------------------------
  /** arm (or clear, with null) the dig marquee. Snaps the rectangle to the dig
   *  lattice on the way in, so nothing downstream has to remember to. */
  setDigRect: (rect: BuildRect | null) => void;
  /**
   * What the armed dig marquee would actually do, without doing it. One call
   * answers BOTH of the tool's jobs, because which one it is doing is a fact
   * about the ground rather than a mode the player picks: a patch that covers
   * water FILLS it in, a patch of dry ground is a CUT. (A separate fill tool
   * would need its own button, its own key and its own marquee to say the one
   * thing the rectangle already says.)
   *
   * `problem` is the refusal sentence, or null when the patch is good — the
   * rail shows it live so a 40m drag never ends in a bare "you can't do that".
   *
   * Takes an OPTIONAL rectangle, defaulting to the armed `digRect`, so the
   * ghost still being dragged is judged by exactly the code that will judge it
   * on release. The alternative — a cheap "looks fine" test for the drag and
   * the real one for the confirm — is precisely how a marquee ends up green
   * right up to the moment it refuses.
   */
  digPreview: (rect?: BuildRect | null) => {
    mode: 'dig' | 'fill';
    /** gold it costs to cut (mode 'dig') */
    cost: number;
    /** gold handed back for filling in (mode 'fill') */
    refund: number;
    /** the waterways a fill would remove */
    fills: WaterFeature[];
    area: number;
    problem: string | null;
  };
  /** cut the armed patch (or fill in the water it covers), then clear it */
  digArea: () => void;
}

/**
 * M · what one workshop step costs. Priced off the part's own measured volume
 * so a base plate is a real outlay and a stud is not — but kept small, because
 * a 204-step castle would otherwise cost more than the homestead.
 */
function partCost(vol: number): Partial<Record<ItemId, number>> {
  const n = Math.max(1, Math.min(4, Math.round(vol * 26)));
  return vol > 0.06 ? { stone: n } : { plank: n };
}

/** L66 · how close a worker has to be for the work to count */
const WORK_RANGE = 6;

/**
 * Is this villager actually somewhere their trade can be plied? Their walk
 * (Villagers.tsx) already sends them out to a worksite and back to the
 * stores; this asks whether they have arrived at either end. A worker with no
 * worksite at all (every tree felled) counts as working so the economy does
 * not silently stall on a respawn window.
 */
function villagerAtWork(
  v: Villager,
  st: GameState,
  worldBuildings: PlacedBuilding[],
): boolean {
  // §4 (phase 5, 5.8a): a real GatherAtNode/HaulToDeposit activity in its
  // align/perform phase is a FACT ("reserved on node:17, actively working
  // it"), not an inference from proximity — trust it ahead of the heuristic
  // below rather than running both. Wave 10 widened who can set it: the two
  // new node trades (herbalist/fisherman) via gather_resource's job_match, and
  // the farmer via the new tend_farmplot Activity (ai/actions/farm.ts), on top
  // of the original lumberjack/miner. Merchant and builder still fall straight
  // through to the unchanged heuristic below, exactly as before 5.8a — as does
  // anyone whose signal is absent or inactive (outside work hours, no
  // reachable node, threatened, mid-travel, or walking a stranded load home
  // under seek_deposit, which is travel and deliberately publishes nothing).
  if (workSignals[v.id]?.active) return true;
  const m = villagerMobs[v.id];
  if (!m) return true; // not spawned in the world yet — nothing to be far from
  const near = (x: number, z: number) => Math.hypot(m.x - x, m.z - z) <= WORK_RANGE;
  // the stores end of the round trip counts for every trade (Wave 9: a
  // Storehouse is the stores too, and outranks a Stockpile — see bestStore)
  const store = bestStore(worldBuildings);
  if (store && near(store.x, store.z)) return true;
  // Empire arc, Wave 3: was a hardcoded HOME_X/HOME_Z check — now the
  // villager's own settlement anchor (still HOME_X/HOME_Z for every
  // villager today, since none carries a `world` yet; see settlementAnchor's
  // own doc comment).
  const anchor = settlementAnchor(v.world, st.claimedWorlds);
  if (near(anchor.x, anchor.z)) return true;
  // Wave 10 · was an inline lumberjack/miner ternary; now the shared
  // JOB_NODE_KIND table (data/villagers.ts), so the two new node-working
  // trades are held to the SAME standing-at-a-node requirement rather than
  // falling through to the blanket `return true` at the bottom of this
  // function — which would have granted an herbalist or fisherman their whole
  // per-trip yield on the timer alone, from anywhere on the map. That is the
  // exact "felling a hundred metres from the nearest tree" bug L66 fixed for
  // the original two trades, and adding a job without adding its case here is
  // how it would have come straight back.
  const nodeKind = JOB_NODE_KIND[v.job];
  if (nodeKind) {
    const any = st.nodes.some((n) => n.kind === nodeKind && !n.respawnAt);
    if (!any) return true; // nothing to work — do not stall the economy
    return st.nodes.some((n) => n.kind === nodeKind && !n.respawnAt && near(n.x, n.z));
  }
  if (v.job === 'farmer') {
    const plot = worldBuildings.find((b) => b.type === 'farmplot' && isBuilt(b));
    return !plot || near(plot.x, plot.z);
  }
  if (v.job === 'merchant') {
    const stall = worldBuildings.find((b) => b.type === 'market_stall' && isBuilt(b));
    return !stall || near(stall.x, stall.z);
  }
  return true;
}

let notifSeq = 1;
let buildSeq = 1;
let villagerSeq = 1;
let blueprintSeq = 1;
/** Wave 12 · dug-waterway ids, carried past a loaded save exactly like the
 *  three above. Two live features sharing an id would give React two identical
 *  keys and give `fillWater` two candidates to remove — cheap to prevent, not
 *  cheap to debug. */
let waterSeq = 1;
let lastJoustAt = 0;
/** buildings placed this session, newest last (undo stack). Wave 9 widened
 *  each entry from one id to a GROUP of ids so a row-fill drag — which lays a
 *  dozen wall segments in a single gesture — undoes as the one action it felt
 *  like. Ordinary single placements push a one-element group, and blueprint
 *  stamping still pushes one group per piece (a stamp is deliberately undone
 *  piece by piece, as it always was). */
let placeHistory: string[][] = [];
/** J51 · the keep's own parts/built/hp while its foundation is being carried
 *  (movingBuilding only has room for a plain PlacedBuilding's own fields) —
 *  set by pickupKeep, consumed by cancelMove/finishMove, always null
 *  otherwise. Ephemeral like movingBuilding itself: never persisted. */
let carriedKeepExtra: { parts: Record<string, string>; built: Record<string, number>; hp: Record<string, number> } | null = null;

/** Simple deterministic RNG so the world layout is stable across sessions. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TREE_MODELS = ['/assets/props/scenery/l243500.glb', '/assets/props/scenery/l347100.glb'];

// NOTHING but pieces the player places may stand inside the build grid
// (2026-07-20) — a small margin keeps trunks and foliage from overhanging the
// edge tiles too.
const NODE_BUILD_CLEAR = 3;
const inBuildRegion = (x: number, z: number) =>
  x > BUILD_REGION.minX - NODE_BUILD_CLEAR && x < BUILD_REGION.maxX + NODE_BUILD_CLEAR
  && z > BUILD_REGION.minZ - NODE_BUILD_CLEAR && z < BUILD_REGION.maxZ + NODE_BUILD_CLEAR;
// O3 · neither scatter pass knew Alric/Beda's home corner existed — it sits
// outside BUILD_REGION and outside every GROUNDS section, so a tree could
// (and did) land inside Beda's hut. Both passes reject against the same fixed
// clear-zones a footprint-collision test would have asked for from the start.
const inStarterVillage = (x: number, z: number) =>
  STARTER_VILLAGE_CLEAR.some((c) => Math.hypot(x - c.x, z - c.z) < c.r);

/** a section id, hashed to a stable seed — a cultivated plot has no place in
 *  seedNodes' one shared 20260713 stream (it is scattered on demand, from
 *  cultivatePlot, long after that stream has been consumed), but its layout
 *  still has to come out the same every time it is re-derived */
function sectionSeed(id: string): number {
  let h = 20260805;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h;
}

/**
 * Empire arc, Wave 5 · scatter a rectangular section's nodes.
 *
 * Lifted verbatim out of seedNodes' per-ground loop so grounds and cultivated
 * plots share ONE implementation — the gates below (world edge, pond shore,
 * build region, starter village, separation) are the accumulated result of
 * several real bugs and must not exist in two copies that can drift.
 *
 * `existingNodes` is everything already standing: candidates keep clear of it
 * the same way the road's verge pass already does. A no-op for the six
 * grounds (their boxes sit far enough apart that no two node clouds can come
 * within 3m once the edge inset is applied) — it earns its keep for plots,
 * which are scattered late, into a world that already has nodes in it.
 *
 * `rnd` is threaded IN rather than seeded here: seedNodes runs every ground
 * off one shared 20260713 stream, and re-seeding per section would change
 * every existing layout.
 */
export function scatterNodesInRect(
  section: RectSection & { id: string },
  world: string | null,
  existingNodes: ResourceNodeState[],
  rnd: () => number = mulberry32(sectionSeed(section.id)),
): ResourceNodeState[] {
  const out: ResourceNodeState[] = [];
  const placed: [number, number][] = [];
  // min separation inside a section, by kind — trees may crowd, boulders need
  // room to walk between, herb patches must not stack
  const sep = section.kind === 'tree' ? 3.2 : section.kind === 'rock' ? 4.5 : 7;
  let tries = 0;
  while (placed.length < section.count && tries < section.count * 60) {
    tries++;
    // sections are rectangular pieces on the build grid, so the scatter is a
    // plain uniform roll inside the rectangle, held one node-radius clear of
    // its own edge — a boulder half over the boundary would sit on a build
    // square the section does not own
    const inset = section.kind === 'rock' ? 2.2 : 1.6;
    const x = section.x + (rnd() * 2 - 1) * Math.max(0, section.halfX - inset);
    const z = section.z + (rnd() * 2 - 1) * Math.max(0, section.halfZ - inset);
    // stay well clear of the literal world edge (WORLD_HALF, ±200), not a
    // fixed 95 — that bound predated the 2026-08-03 ground repositioning
    // (Iron Seam/Deepwood moved out to ~±100-130) and silently zeroed out
    // their node seeding, since every single candidate kept failing this
    // check and the retry budget just ran out
    if (Math.abs(x) > WORLD_HALF - 20 || Math.abs(z) > WORLD_HALF - 20) continue;
    // pond shore stays clear — a real distance check against POND's own
    // position, not the blanket "x > 30 && z > 20" half-plane this used to
    // be. That crude rule happened to work while every SE-quadrant ground sat
    // near the pond, but the 2026-08-04 repositioning moved Old Quarry/Iron
    // Seam out to (150,35)/(155,90) — nowhere near its shore — and the
    // half-plane rejected every one of their candidates anyway (silently
    // zeroing out node seeding again). `pondShore` sections are exempt: the
    // Home Grove is deliberately pond-adjacent by design.
    if (!section.pondShore && Math.hypot(x - POND.x, z - POND.z) < POND.radius + 20) continue;
    // Wave 12 · and out of any water the player has cut. Nothing re-scatters
    // on its own, but `buyLand` re-runs seedNodes over the widened holding, so
    // without this a deed bought after digging could stand a fresh boulder in
    // the middle of your own moat. `waterAt` is home-only by construction, so
    // a destination section is never affected.
    if (!world && waterAt(x, z, 1.2)) continue;
    if (inBuildRegion(x, z)) continue;
    if (inStarterVillage(x, z)) continue;
    if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < sep)) continue;
    if (existingNodes.some((n) => Math.hypot(n.x - x, n.z - z) < 3)) continue;
    placed.push([x, z]);
    const i = placed.length - 1;
    if (section.kind === 'tree') {
      out.push({
        id: `${section.id}_t${i}`, kind: 'tree', model: TREE_MODELS[i % 2], ground: section.id, world,
        x, z, scale: 0.85 + rnd() * 0.5, yaw: rnd() * Math.PI * 2,
        hitsLeft: 3, respawnAt: null,
      });
    } else if (section.kind === 'rock') {
      out.push({
        id: `${section.id}_r${i}`, kind: 'rock', variant: section.variant, ground: section.id, world,
        x, z, scale: 0.8 + rnd() * 0.9, yaw: rnd() * Math.PI * 2,
        hitsLeft: 4, respawnAt: null,
      });
    } else {
      // a patch carries an RNG yield of 1-10 picks, and reads bigger the
      // richer it is
      const yieldN = 1 + Math.floor(rnd() * 10);
      out.push({
        id: `${section.id}_h${i}`, kind: 'herb', ground: section.id, world,
        x, z, scale: 0.7 + yieldN * 0.05 + rnd() * 0.15,
        yaw: rnd() * Math.PI * 2, hitsLeft: yieldN, respawnAt: null,
      });
    }
  }
  return out;
}

const topOf = (b: PlacedBuilding) => (b.y ?? 0) + heightOf(b.type);

export function activeQuestOf(completed: string[]): Quest | null {
  return QUESTS.find((q) => !completed.includes(q.id)) ?? null;
}

export const useGameStore = createGameStore();

// debug/testing handle
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kk = useGameStore;
}

function createGameStore() {
  return create<GameState>((set, get) => {
  // ---- internal helpers (closure-scoped, operate through set/get) ----

  function bumpSideQuest(kind: 'gather' | 'craft' | 'build' | 'kill' | 'joust' | 'duel', target: string, amount: number) {
    const sq = get().sideQuest;
    if (!sq) return;
    const def = sideQuestsOf(sq.npcId).find((q) => q.id === sq.questId);
    if (!def) return;
    // Wave 13 · a 'deliver' errand is gathered exactly like a 'gather' one —
    // the only thing that makes it a delivery is WHERE it gets turned in
    // (see turnInSideQuest's deliverTo check below) — so a gather-kind
    // action bump also advances a deliver-kind errand's progress.
    const matchesKind = def.kind === kind || (def.kind === 'deliver' && kind === 'gather');
    if (!matchesKind) return;
    if (def.target !== 'any' && def.target !== target) return;
    if (sq.have >= def.need) return;
    const have = Math.min(def.need, sq.have + amount);
    set({ sideQuest: { ...sq, have }, dirty: true });
    if (have >= def.need) {
      const msg = def.kind === 'deliver'
        ? `Loaded up — now carry it to ${WORLD_DESTINATION_BY_ID[def.deliverTo ?? '']?.name ?? 'its destination'}.`
        : `Errand ready to turn in: see ${sideQuestGiverName(sq.npcId)}!`;
      get().notify(msg, true);
    }
  }

  function bumpQuestCounters(kind: 'gather' | 'craft' | 'build' | 'visit' | 'talk', target: string, amount: number) {
    // 'visit'/'talk' are main-quest travel beats (Phase 20) — side-quest
    // errands have no such kinds, so only the shared trio forwards there
    if (kind === 'gather' || kind === 'craft' || kind === 'build') bumpSideQuest(kind, target, amount);
    const { completedQuests, questProgress } = get();
    const quest = activeQuestOf(completedQuests);
    if (!quest) return;
    let changed = false;
    const qp = { ...(questProgress[quest.id] ?? {}) };
    for (const obj of quest.objectives) {
      if (obj.kind !== kind) continue;
      // L64 · "any wall" used to mean the two pieces that existed when the
      // quest was written, so building a plain mc006 wall section — which is
      // filed under `walls`, sits on the wall grid and looks like a wall —
      // advanced nothing. It now asks the CATALOGUE what a wall is, so every
      // piece in the family counts and any wall added later counts too.
      const matches =
        obj.target === target ||
        (obj.target === 'anywall' && BUILDABLE_BY_ID[target]?.category === 'walls');
      if (!matches) continue;
      const cur = qp[obj.id] ?? 0;
      if (cur >= obj.count) continue;
      qp[obj.id] = Math.min(obj.count, cur + amount);
      changed = true;
    }
    if (!changed) return;
    set({ questProgress: { ...get().questProgress, [quest.id]: qp }, dirty: true });
    // completed?
    const done = quest.objectives.every((o) => (qp[o.id] ?? 0) >= o.count);
    if (done) completeQuest(quest);
  }

  function completeQuest(quest: Quest) {
    const st = get();
    const notify = st.notify;
    set({ completedQuests: [...st.completedQuests, quest.id], dirty: true });
    if (quest.xp) {
      for (const [skill, amt] of Object.entries(quest.xp)) {
        st.addXp(skill as SkillId, amt as number);
      }
    }
    if (quest.grantItems) st.addItems(quest.grantItems, 'grant');
    if (quest.unlocks?.length) {
      set({ unlocks: [...new Set([...get().unlocks, ...quest.unlocks])] });
      for (const u of quest.unlocks) {
        const skill = SKILLS.find((s) => s.unlockFlag === u);
        if (skill) notify(`New ability unlocked: ${skill.name}!`, true);
      }
    }
    audio.play('horn', 0.7);
    notify(`Quest complete: ${quest.name}`, true);
    // Phase 20 step 4: the court lives across the realm's instances now — a
    // quest that reveals someone must say WHERE they hold court, or the
    // player has no idea a new face is waiting a Travel-Map ride away
    for (const n of NPCS) {
      if (n.revealAfterQuest !== quest.id) continue;
      if (n.world) {
        const w = WORLD_DESTINATION_BY_ID[n.world];
        notify(`📜 Word arrives: ${n.name} will receive you at ${w?.name ?? n.world}. Consult the Travel Map.`, true);
      } else {
        notify(`📜 ${n.name} has arrived at the homestead.`, true);
      }
    }
    const next = activeQuestOf(get().completedQuests);
    if (next) notify(`New quest: ${next.name}`);
  }

  return {
    character: null,
    inventory: {},
    xp: { ...ZERO_XP },
    unlocks: [],
    completedQuests: [],
    questProgress: {},
    buildings: [],
    nodes: [],
    panel: 'none',
    paused: false,
    buildMode: false,
    photoMode: false,
    notifications: [],
    prompt: null,
    activeInputDevice: 'keyboard',
    actionProgress: null,
    nearStations: [],
    buildSelection: null,
    blueprintSelection: null,
    movingBuilding: null,
    buildTool: 'build',
    freeformBuild: false,
    demolishRect: null,
    digRect: null,
    cameraMode: 'fps',
    targetKind: null,
    emote: null,
    npcGreetSeq: 0,
    npcGreetId: null,
    npcGreetClip: null,
    ceremony: null,
    dialogueNpc: null,
    equippingVillagerId: null,
    activeStation: null,
    sideQuest: null,
    trackedQuest: 'main',
    deeds: [],
    bestiary: [],
    challengeTiers: {},
    plots: {},
    gateOpen: {},
    buildingHp: {},
    reputation: {},
    destination: null,
    visitedWorlds: [],
    discoveredPois: [],
    loreSeen: [],
    defeatedCedric: false,
    alliance: null,
    allegiance: 0,
    completedSideQuests: [],
    landTier: 0,
    keep: null,
    keepSocket: null,
    menuBuilding: null,
    workshop: null,
    builtSets: [],
    stabled: [],
    mounts: {},
    falconTamed: false,
    betrayedCedric: false,
    guild: null,
    skillTree: [],
    attrSpent: {},
    dyes: [],
    durability: {},
    perks: [],
    stats: { ...ZERO_STATS },
    claimedWorlds: {},
    settlements: {},
    cultivatedPlots: {},
    waterworks: [],
    customBlueprints: [],
    lastTaxAt: 0,
    villagers: [],
    villagerProgress: {},
    armory: {},
    interior: null,
    enteredInteriorPos: null,
    treasureOpened: false,
    dragonSeen: false,
    dragonSieges: 0,
    dragonRouted: false,
    cedricSieges: 0,
    cedricRouted: false,
    timeOfDay: 0.3,
    dayCount: 0,
    season: 0,
    dirty: false,

    newGame: (character) => {
      resetPlayerState();
      stabledHorses.ids = [];
      stabledHorses.assigned = {};
      // Wave 12 · module state, same class of thing as the stable above: a new
      // character must not inherit the last one's moat. Bumping the revision is
      // also what makes the next nav rebuild forget the old water.
      setWaterworks([]);
      // the AI registry is module state, like the two above: a new character
      // must not inherit the last one's agents, clock or half-drained needs
      agentManager.clear();
      resetVillagerAgentSync();
      resetNpcAgentSync();
      resetCourtAmbientAgentSync();
      targetRegistry.clear();
      // §6.2 — the AI's world-sound ring is module state too: a fresh session
      // must not have two seconds of the last one's combat still audible.
      resetSounds();
      clearAllWorkSignals();
      set({
        character,
        // bare-handed start (2026-07-20): no starting axe, no calling kit —
        // harvestNode/useTool never actually gate on OWNING a tool, only on
        // its condition (durability defaults to 100 whether you own zero or
        // one), so gathering bare-handed already works mechanically. Every
        // calling's kit is empty by design now (see data/classes.ts) — the
        // signature skill's +10% XP is the only thing it actually grants.
        inventory: {},
        xp: { ...ZERO_XP },
        unlocks: [],
        completedQuests: [],
        questProgress: {},
        buildings: [],
        panel: 'none', paused: false, buildMode: false,
        notifications: [], prompt: null, actionProgress: null, dirty: true,
        timeOfDay: 0.3, dayCount: 0, season: 0, sideQuest: null, trackedQuest: 'main', dialogueNpc: null, equippingVillagerId: null, activeStation: null, deeds: [], bestiary: [], challengeTiers: {}, plots: {},
        gateOpen: {}, buildingHp: {}, reputation: {},
        destination: null, visitedWorlds: [], discoveredPois: [], loreSeen: [], defeatedCedric: false, alliance: null, allegiance: 0, completedSideQuests: [], landTier: 0, keep: null, workshop: null, builtSets: [], stabled: [], mounts: {}, falconTamed: false, betrayedCedric: false, guild: null, skillTree: [], attrSpent: {}, dyes: [],
        durability: {}, perks: [], stats: { ...ZERO_STATS },
        claimedWorlds: {}, settlements: {}, cultivatedPlots: {}, waterworks: [], customBlueprints: [], lastTaxAt: 0,
        villagers: [], villagerProgress: {}, armory: {},
        interior: null, enteredInteriorPos: null, treasureOpened: false, dragonSeen: false, dragonSieges: 0, dragonRouted: false,
        cedricSieges: 0, cedricRouted: false,
      });
      worldEnv.time = 0.3;
      worldEnv.dayCount = 0;
      get().seedNodes();
    },

    loadFromSave: (s) => {
      resetPlayerState();
      agentManager.clear();
      resetVillagerAgentSync();
      resetNpcAgentSync();
      resetCourtAmbientAgentSync();
      targetRegistry.clear();
      // §6.2 — the AI's world-sound ring is module state too: a fresh session
      // must not have two seconds of the last one's combat still audible.
      resetSounds();
      clearAllWorkSignals();
      // the mounted-patrol AI reads these every frame from the leaf module
      stabledHorses.ids = [...(s.stabled ?? [])];
      stabledHorses.assigned = { ...(s.mounts ?? {}) };
      // Wave 12 · same treatment for the player's waterways: nav, collision and
      // the water mesh read the leaf module, so loading a save that has none
      // must CLEAR it rather than leave the previous session's water standing.
      const loadedWater = s.waterworks ?? [];
      setWaterworks(loadedWater);
      set({
        character: s.character,
        inventory: s.inventory,
        xp: { ...ZERO_XP, ...s.xp },
        unlocks: s.unlocks,
        completedQuests: s.completedQuests,
        questProgress: s.questProgress,
        buildings: s.buildings,
        panel: 'none', paused: false, buildMode: false,
        notifications: [], prompt: null, actionProgress: null, dirty: false,
        timeOfDay: s.timeOfDay ?? 0.3, dayCount: s.dayCount ?? 0, season: seasonOf(s.dayCount ?? 0),
        sideQuest: s.sideQuest ?? null, trackedQuest: s.trackedQuest ?? 'main', dialogueNpc: null, equippingVillagerId: null, activeStation: null,
        deeds: s.deeds ?? [],
        bestiary: s.bestiary ?? [],
        challengeTiers: s.challengeTiers ?? {},
        plots: s.plots ?? {},
        gateOpen: s.gateOpen ?? {},
        buildingHp: s.buildingHp ?? {},
        reputation: s.reputation ?? {},
        destination: null, visitedWorlds: s.visitedWorlds ?? [], discoveredPois: s.discoveredPois ?? [], loreSeen: s.loreSeen ?? [],
        defeatedCedric: s.defeatedCedric ?? false,
        alliance: s.alliance ?? null,
        allegiance: s.allegiance ?? 0,
        // a save from before land tiers existed was built on the old flat
        // 60m region, so it inherits the LARGEST tier — anything else would
        // strand buildings outside their own fence
        completedSideQuests: s.completedSideQuests ?? [],
        landTier: s.landTier ?? MAX_LAND_TIER,
        keep: s.keep ?? null,
        workshop: s.workshop ?? null,
        builtSets: s.builtSets ?? [],
        stabled: s.stabled ?? [],
        mounts: s.mounts ?? {},
        falconTamed: s.falconTamed ?? false,
        betrayedCedric: s.betrayedCedric ?? false,
        guild: s.guild ?? null,
        skillTree: s.skillTree ?? [],
        attrSpent: s.attrSpent ?? {},
        dyes: s.dyes ?? [],
        durability: s.durability ?? {}, perks: s.perks ?? [],
        stats: { ...ZERO_STATS, ...(s.stats ?? {}) },
        claimedWorlds: s.claimedWorlds ?? {}, settlements: s.settlements ?? {}, cultivatedPlots: s.cultivatedPlots ?? {},
        waterworks: loadedWater,
        customBlueprints: s.customBlueprints ?? [],
        lastTaxAt: s.lastTaxAt ?? 0,
        villagers: s.villagers ?? [],
        villagerProgress: {},
        armory: s.armory ?? {},
        interior: null, enteredInteriorPos: null, treasureOpened: s.treasureOpened ?? false, dragonSeen: s.dragonSeen ?? false,
        dragonSieges: s.dragonSieges ?? 0, dragonRouted: s.dragonRouted ?? false,
        cedricSieges: s.cedricSieges ?? 0, cedricRouted: s.cedricRouted ?? false,
      });
      worldEnv.time = s.timeOfDay ?? 0.3;
      worldEnv.dayCount = s.dayCount ?? 0;
      buildSeq = s.buildings.reduce((m, b) => Math.max(m, parseInt(b.id.slice(1)) + 1 || m), 1);
      villagerSeq = (s.villagers ?? []).reduce((m, v) => Math.max(m, parseInt(v.id.slice(1)) + 1 || m), 1);
      blueprintSeq = (s.customBlueprints ?? []).reduce((m, b) => Math.max(m, parseInt(b.id.slice(2)) + 1 || m), 1);
      waterSeq = loadedWater.reduce((m, w) => Math.max(m, parseInt(w.id.slice(1)) + 1 || m), 1);
      get().seedNodes();
    },

    toSave: () => {
      const s = get();
      return {
        version: 1,
        character: s.character!,
        inventory: s.inventory,
        xp: s.xp,
        unlocks: s.unlocks,
        completedQuests: s.completedQuests,
        questProgress: s.questProgress,
        buildings: s.buildings,
        timeOfDay: worldEnv.time,
        dayCount: worldEnv.dayCount,
        sideQuest: s.sideQuest,
        trackedQuest: s.trackedQuest,
        deeds: s.deeds,
        bestiary: s.bestiary,
        challengeTiers: s.challengeTiers,
        plots: s.plots,
        gateOpen: s.gateOpen,
        buildingHp: s.buildingHp,
        reputation: s.reputation,
        destination: null, visitedWorlds: s.visitedWorlds, discoveredPois: s.discoveredPois, loreSeen: s.loreSeen,
        defeatedCedric: s.defeatedCedric,
        alliance: s.alliance,
        allegiance: s.allegiance,
        completedSideQuests: s.completedSideQuests,
        landTier: s.landTier,
        keep: s.keep,
        workshop: s.workshop,
        builtSets: s.builtSets,
        // the leaf module is the live truth while playing (the patrol AI
        // writes and reads it every frame), so save from THERE, not from a
        // store mirror that only updates on load
        stabled: [...stabledHorses.ids],
        mounts: { ...stabledHorses.assigned },
        falconTamed: s.falconTamed,
        betrayedCedric: s.betrayedCedric,
        guild: s.guild,
        skillTree: s.skillTree,
        attrSpent: s.attrSpent,
        dyes: s.dyes,
        durability: s.durability, perks: s.perks,
        stats: s.stats,
        claimedWorlds: s.claimedWorlds, settlements: s.settlements, cultivatedPlots: s.cultivatedPlots,
        // saved from the leaf module for the same reason `stabled` is: it is
        // the copy every consumer actually reads, so it is the one that can
        // never be a stale mirror
        waterworks: [...waterworks.list],
        customBlueprints: s.customBlueprints,
        lastTaxAt: s.lastTaxAt,
        villagers: s.villagers,
        armory: s.armory,
        treasureOpened: s.treasureOpened,
        dragonSeen: s.dragonSeen,
        dragonSieges: s.dragonSieges,
        dragonRouted: s.dragonRouted,
        cedricSieges: s.cedricSieges,
        cedricRouted: s.cedricRouted,
      };
    },

    seedNodes: () => {
      const rnd = mulberry32(20260713);
      const nodes: ResourceNodeState[] = [];

      // J46 · every node now belongs to a NAMED GROUND (game/data/grounds.ts)
      // rather than seeding wherever a scatter loop happened to drop it. The
      // ground carries the deed that opens it, so the land ladder finally
      // buys you something to work rather than a wider fence.
      // Wave 5: the loop body itself now lives in scatterNodesInRect, shared
      // with cultivatePlot — one scatter, two callers.
      for (const g of GROUNDS) {
        nodes.push(...scatterNodesInRect(g, null, nodes, rnd));
      }


      // Trees along the VERGES of the road — the green margin of each plate,
      // never the printed path. A road through open grass reads as a scar;
      // lined with timber it reads as a road. They are ordinary tree nodes,
      // so they can be felled like any other, but they belong to no ground
      // and so need no deed.
      //
      // Wave 12 · planted along `vergeCells()`, the homestead's own lane,
      // rather than the whole road — see ROAD_VERGE_RANGE for why a network
      // reaching six grounds must not line every leg with deedless timber.
      // The neighbour lookup still uses the FULL route: which way the road
      // runs through a cell, and whether it is a junction, is a fact about
      // the road, not about which cells happen to be planted.
      {
        const onRoad = new Set(routeCells().map(([cx, cz]) => `${cx},${cz}`));
        let vi = 0;
        for (const [cx, cz] of vergeCells()) {
          // which way does the road run through this cell? A cell with a
          // neighbour north or south runs N-S; otherwise E-W. Junction cells
          // are skipped entirely — every side of them is carriageway.
          const ns = onRoad.has(`${cx},${cz - 1}`) || onRoad.has(`${cx},${cz + 1}`);
          const ew = onRoad.has(`${cx - 1},${cz}`) || onRoad.has(`${cx + 1},${cz}`);
          if (ns && ew) continue;
          const rx = cx * ROAD_TILE;
          const rz = cz * ROAD_TILE;
          for (const side of [-1, 1]) {
            // out past the printed edge, with room for the trunk
            const off = ROAD_HALF_WIDTH + 1.5 + rnd() * 1.6;
            // and jittered along the road so they do not march in lockstep
            const along = (rnd() - 0.5) * ROAD_TILE * 0.7;
            const x = ns ? rx + side * off : rx + along;
            const z = ns ? rz + along : rz + side * off;
            if (inBuildRegion(x, z)) continue;
            if (inStarterVillage(x, z)) continue;     // O3 · see above
            if (groundAt(x, z)) continue;            // a ground grows its own
            if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 2) continue;
            // never on another plate's carriageway
            const ncx = Math.round(x / ROAD_TILE);
            const ncz = Math.round(z / ROAD_TILE);
            if (onRoad.has(`${ncx},${ncz}`)) {
              const dx = Math.abs(x - ncx * ROAD_TILE);
              const dz = Math.abs(z - ncz * ROAD_TILE);
              if (dx < ROAD_HALF_WIDTH + 1 && dz < ROAD_HALF_WIDTH + 1) continue;
            }
            if (nodes.some((n) => Math.hypot(n.x - x, n.z - z) < 3)) continue;
            nodes.push({
              id: `verge${vi++}`, kind: 'tree', model: TREE_MODELS[vi % 2],
              x, z, scale: 0.8 + rnd() * 0.45, yaw: rnd() * Math.PI * 2,
              hitsLeft: 3, respawnAt: null,
            });
          }
        }
      }

      // fishing spot at the far end of the dock, out over the water (see
      // FISHING_DOCK / ResourceNodes.tsx's FishingSpot). Open water belongs
      // to no deed.
      nodes.push({ id: 'fishspot', kind: 'fishing', x: FISHING_DOCK.endX, z: FISHING_DOCK.endZ, scale: 1, yaw: 0, hitsLeft: 999, respawnAt: null });

      // Wave 5 · a plot you planted is RE-DERIVED here, never restored:
      // st.nodes is runtime-only and this runs on every load and every land
      // purchase, so the persisted `stage` is the one source of truth for how
      // thick the cluster stands. Last, so it sees the same "everything else
      // already standing" set cultivatePlot/waterPlot pass in and the two can
      // never place differently.
      for (const live of Object.values(get().cultivatedPlots)) {
        const def = PLOT_BY_ID[live.id];
        if (!def) continue; // a plot id retired from the table
        nodes.push(...scatterNodesInRect(
          { ...def, count: plotNodeCount(def, live.stage) },
          live.world ?? null,
          nodes,
        ));
      }
      set({ nodes });
    },

    setPanel: (panel) => set({ panel }),
    setCharacter: (character) => set({ character, dirty: true }),

    buyLand: () => {
      const st = get();
      if (st.landTier >= MAX_LAND_TIER) {
        st.notify('Your holding already runs to the horizon.');
        return;
      }
      const next = LAND_TIERS[st.landTier + 1];
      if ((st.inventory.gold ?? 0) < next.cost) {
        st.notify(`The deed to a ${next.name} costs ${next.cost} gold.`);
        return;
      }
      st.addItems({ gold: -next.cost });
      set({ landTier: st.landTier + 1, dirty: true });
      audio.play('treasure', 0.8);
      st.notify(`Land bought — your holding is now a ${next.name}, ${next.walls} walls to a side.`, true);
      // whatever was standing on the new ground is now yours to work
      st.seedNodes();
    },

    shiftAllegiance: (delta, reason) => {
      if (!delta) return;
      const st = get();
      const before = st.allegiance;
      const after = Math.max(ALLEGIANCE_MIN, Math.min(ALLEGIANCE_MAX, before + delta));
      if (after === before) return;
      set({ allegiance: after, dirty: true });
      const toward = delta > 0 ? 'the crown' : 'the Bull';
      st.notify(`${reason} — your name carries further with ${toward}.`);
      // crossing into a new band is worth saying out loud; it changes what
      // people will offer you
      const wasTier = allegianceTier(before);
      const nowTier = allegianceTier(after);
      if (wasTier.title !== nowTier.title) {
        st.notify(`You are now known as: ${nowTier.title}.`, true);
      }
    },
    setPaused: (paused) => set({ paused }),
    setBuildMode: (buildMode) => {
      if (!buildMode) get().cancelMove();
      // Wave 9 · leaving the build view puts the tools down: an armed demolish
      // marquee must never survive to fire on the next visit, and coming back
      // in holding the wrecking tool by surprise is the same class of mistake.
      // Freeform is a mode you chose, so it rides along with the tool reset for
      // the same reason — the grid is the default the view opens in.
      set({ buildMode, panel: 'none', buildSelection: null, buildTool: 'build', demolishRect: null, digRect: null, freeformBuild: false });
    },
    setBuildSelection: (buildSelection) => set({
      buildSelection,
      // picking a piece is unambiguously "I want to build" — it puts the
      // wrecking tool down rather than leaving a selected piece that the left
      // button would not actually place
      ...(buildSelection ? { buildTool: 'build' as BuildTool, demolishRect: null, digRect: null } : {}),
    }),
    setBlueprintSelection: (blueprintSelection) => set({
      blueprintSelection,
      ...(blueprintSelection ? { buildTool: 'build' as BuildTool, demolishRect: null, digRect: null } : {}),
    }),

    // ---- Wave 9 · build-view tools ------------------------------------
    setBuildTool: (buildTool) => set({
      buildTool,
      demolishRect: null,
      digRect: null,
      // the wrecking tool owns the left button, so a piece still selected
      // underneath it would only be a lie about what a click does — and Wave
      // 12's spade owns it exactly the same way
      ...(buildTool !== 'build' ? { buildSelection: null, blueprintSelection: null } : {}),
    }),
    setFreeformBuild: (freeformBuild) => set({ freeformBuild }),
    setDemolishRect: (demolishRect) => set({ demolishRect }),

    demolishPreview: () => {
      const st = get();
      const r = st.demolishRect;
      const refund: Partial<Record<ItemId, number>> = {};
      if (!r) return { ids: [], refund };
      const hit = buildingsInRect(st.buildings, st.destination ?? null, r);
      for (const b of hit) {
        for (const [itemId, n] of Object.entries(BUILDABLE_BY_ID[b.type]?.cost ?? {})) {
          // the same half-of-cost removeBuilding actually pays back, so the
          // number shown before the click is the number that arrives after it
          const back = Math.floor((n as number) / 2);
          if (back > 0) refund[itemId as ItemId] = (refund[itemId as ItemId] ?? 0) + back;
        }
      }
      return { ids: hit.map((b) => b.id), refund };
    },

    demolishArea: () => {
      const st = get();
      const { ids } = st.demolishPreview();
      if (ids.length === 0) {
        set({ demolishRect: null });
        st.notify('Nothing inside that patch to pull down.');
        return;
      }
      // one piece at a time through the ordinary teardown, so the half-material
      // refund is whatever removeBuilding already does — an area tool that
      // reimplemented removal would drift out of step with it the first time
      // removal grew a rule. `quiet` only suppresses the per-piece toast and
      // crash: twenty of each at once is noise, not feedback.
      for (const id of ids) get().removeBuilding(id, false, true);
      set({ demolishRect: null });
      audio.play('brick_collide', 0.7);
      st.notify(`Cleared ${ids.length} ${ids.length === 1 ? 'piece' : 'pieces'} (half materials refunded)`, true);
    },

    // ---- Wave 12 · digging --------------------------------------------
    setDigRect: (rect) => set({ digRect: rect ? snapDigRect(rect) : null }),

    digPreview: (rect) => {
      const st = get();
      const r = rect === undefined ? st.digRect : rect;
      const none = { mode: 'dig' as const, cost: 0, refund: 0, fills: [] as WaterFeature[], area: 0, problem: null };
      if (!r) return none;
      const area = (r.maxX - r.minX) * (r.maxZ - r.minZ);
      // home only, and checked before anything else so the refusal is the real
      // reason rather than whatever the homestead's own geography says about a
      // rectangle two thousand metres away. Away from home the ground is a
      // template bake's real sloped geometry, and a flat basin cut into it
      // would hang in the air at one end — see WaterFeature's own note.
      const away = st.destination ? 'Your diggers work your homestead, not this place.' : null;
      const fills = waterworksInRect(r);
      // FILL, whenever the patch touches water at all. The alternative reading
      // — "dig the dry part of it too" — would have one gesture both cut and
      // fill, and there is no honest way to price or explain that.
      if (fills.length > 0) {
        const refund = Math.round(fills.reduce((n, w) => n + w.paid, 0) * FILL_REFUND);
        return { mode: 'fill' as const, cost: 0, refund, fills, area, problem: away };
      }
      const cost = digCost(r);
      // shape first: "keep dragging, it is not a waterway yet" has to win over
      // "there is a tree in the way", or the very first pixel of every drag
      // reports the wrong problem
      let problem = shapeConflict(r) ?? away;
      if (!problem) problem = terrainConflict(r, st.landTier);
      if (!problem && st.waterworks.length >= MAX_WATERWORKS) {
        problem = `You already keep ${MAX_WATERWORKS} waterways — fill one in before cutting another.`;
      }
      if (!problem && buildingsInRect(st.buildings, null, r).length > 0) {
        problem = 'Something of yours stands there — pull it down first.';
      }
      if (!problem && st.keep
        && Math.abs(st.keep.x - (r.minX + r.maxX) / 2) < KEEP_SIZE / 2 + (r.maxX - r.minX) / 2
        && Math.abs(st.keep.z - (r.minZ + r.maxZ) / 2) < KEEP_SIZE / 2 + (r.maxZ - r.minZ) / 2) {
        // checked separately because `buildingsInRect` deliberately skips the
        // keep (it is picked up whole, never area-demolished) — and a moat is
        // exactly the thing a player will try to draw round their castle, so
        // "over the foundation" is the likeliest mistake there is here
        problem = 'Your keep stands on that ground — draw the moat around it.';
      }
      if (!problem) {
        // Resource nodes hold their spot for the life of the world — a felled
        // one is not gone, it is `respawnAt`, and it comes back exactly where
        // it stood. So this ignores respawn state on purpose: cutting over a
        // stump would put a tree back in the middle of the water a minute
        // later, standing on it, harvestable. Refusing costs the player one
        // more swing of the axe and a walk to somewhere else.
        //
        // This is also, at today's numbers, the ONLY thing standing between a
        // cut and the fenced sections: every GROUND and both CULTIVATED_PLOTS
        // lie beyond the widest legal reach (Barony's 32 + DIG_OUTSKIRT = 48;
        // the nearest, the orchard, starts at z=56), so their own rectangles
        // need no check here — but their nodes would be caught by this one if
        // the bound ever moved out to them.
        const node = st.nodes.find((n) => (n.world ?? null) === null
          && n.x > r.minX - 0.8 && n.x < r.maxX + 0.8 && n.z > r.minZ - 0.8 && n.z < r.maxZ + 0.8);
        if (node) problem = 'Clear the trees and rocks off that ground first.';
      }
      if (!problem && (st.inventory.gold ?? 0) < cost) {
        problem = `Your diggers want ${cost} gold for that — you have ${st.inventory.gold ?? 0}.`;
      }
      return { mode: 'dig' as const, cost, refund: 0, fills, area, problem };
    },

    digArea: () => {
      const st = get();
      const r = st.digRect;
      if (!r) return;
      const pre = st.digPreview();
      if (pre.problem) {
        st.notify(pre.problem);
        audio.play('brick_collide', 0.5);
        return;
      }
      if (pre.mode === 'fill') {
        const gone = new Set(pre.fills.map((w) => w.id));
        const list = st.waterworks.filter((w) => !gone.has(w.id));
        setWaterworks(list);
        set({ waterworks: list, digRect: null, dirty: true });
        if (pre.refund > 0) st.addItems({ gold: pre.refund });
        st.notify(
          `Filled in ${pre.fills.length} ${pre.fills.length === 1 ? 'waterway' : 'waterways'}`
          + (pre.refund > 0 ? ` — ${pre.refund} gold back from the spoil.` : '.'),
          true,
        );
        return;
      }
      const w: WaterFeature = {
        id: `w${waterSeq++}`,
        x: (r.minX + r.maxX) / 2,
        z: (r.minZ + r.maxZ) / 2,
        halfX: (r.maxX - r.minX) / 2,
        halfZ: (r.maxZ - r.minZ) / 2,
        paid: pre.cost,
      };
      const list = [...st.waterworks, w];
      setWaterworks(list);
      set({ waterworks: list, digRect: null, dirty: true });
      st.addItems({ gold: -pre.cost });
      // no nav call here on purpose: NavGrid.rebuild() is polled at 1Hz from
      // Enemies.tsx and now watches `waterworks.rev` as a second input beside
      // the buildings array's identity, so the water is in the grid within the
      // second without this action reaching into the pathfinder.
      audio.play('treasure', 0.55);
      st.notify(`Dug ${Math.round(pre.area)}m² of waterway for ${pre.cost} gold.`, true);
    },

    collectTaxes: () => {
      const st = get();
      // taxes are a homestead-only mechanic (the Grand Keep's treasury) — a
      // remote outpost's own buildings shouldn't count toward the Keep
      const homeBuildings = st.buildings.filter(isHomeBuilding);
      const hasKeep = homeBuildings.some((b) => b.type === 'keep');
      if (!hasKeep || st.villagers.length === 0) {
        st.notify('Taxation requires a Grand Keep and at least one villager.');
        return;
      }
      const now = Date.now();
      if (now - st.lastTaxAt < TAX_COOLDOWN_MS) {
        const remainMin = Math.ceil((TAX_COOLDOWN_MS - (now - st.lastTaxAt)) / 60000);
        st.notify(`The treasury isn't ready yet — check back in ${remainMin}m.`);
        return;
      }
      const amount = 8 + st.villagers.length * 4 + Math.min(20, Math.floor(homeBuildings.length / 3));
      set({ lastTaxAt: now, dirty: true });
      st.addItems({ gold: amount }, 'grant');
      audio.play('treasure', 0.7);
      st.notify(`Collected ${amount} gold in taxes from your kingdom!`, true);
    },

    claimWorld: (destId, x, z, groundY) => {
      const st = get();
      if (st.claimedWorlds[destId]) return;
      set({ claimedWorlds: { ...st.claimedWorlds, [destId]: { x, z, groundY } }, dirty: true });
      st.notify('Land claimed! The aerial build menu (B) now works here too.', true);
    },

    // Empire arc, Wave 4 — see this action's own interface doc comment.
    foundSettlement: (destId, x, z, groundY) => {
      const st = get();
      if (st.settlements[destId]) return;
      // re-validated here, not just in the UI's disabled state — same
      // "a stale panel can never hand out work you have not earned"
      // discipline acceptSideQuest already applies to its own blockers
      if (!st.completedSideQuests.includes('settle_clear')) return;
      const cost = { gold: 60 };
      if (!st.canAfford(cost)) {
        st.notify('Not enough gold to file the deed — 60 gold needed.');
        return;
      }
      // claims the plot too if the player never used the ordinary
      // ClaimBanner for this destination — a harmless no-op if they did
      // (claimWorld's own guard short-circuits on an existing claim)
      st.claimWorld(destId, x, z, groundY);
      const inv = { ...st.inventory };
      inv.gold = (inv.gold ?? 0) - cost.gold;
      const now = Date.now();
      // farmer/merchant/builder only — lumberjack/miner are excluded on
      // purpose: this destination has no ResourceNodeState entries yet
      // (Wave 3's own scoping note) and villagerAtWork's tree/rock branch
      // has no per-world node awareness, so a lumberjack/miner resident
      // here would just stall forever with nothing to report
      const settlerDefs: Villager[] = [
        { id: 'settler_bram', name: 'Bram', job: 'farmer', world: destId },
        { id: 'settler_ida', name: 'Ida', job: 'merchant', world: destId },
        { id: 'settler_tolan', name: 'Tolan', job: 'builder', world: destId },
      ];
      const residents = settlerDefs.filter((r) => !st.villagers.some((v) => v.id === r.id));
      set({
        inventory: inv,
        settlements: { ...st.settlements, [destId]: { since: now, lastCollectedAt: now } },
        villagers: [...st.villagers, ...residents],
        dirty: true,
      });
      audio.play('treasure', 0.9);
      st.notify('The deed is filed — Bram, Ida and Tolan take up residence!', true);
    },

    collectSettlementYield: (destId) => {
      const st = get();
      const settlement = st.settlements[destId];
      if (!settlement) return;
      const now = Date.now();
      if (now - settlement.lastCollectedAt < TAX_COOLDOWN_MS) {
        const remainMin = Math.ceil((TAX_COOLDOWN_MS - (now - settlement.lastCollectedAt)) / 60000);
        st.notify(`Nothing new to collect yet — check back in ${remainMin}m.`);
        return;
      }
      const residentCount = st.villagers.filter((v) => v.world === destId).length;
      const amount = 6 + residentCount * 5;
      set({ settlements: { ...st.settlements, [destId]: { ...settlement, lastCollectedAt: now } }, dirty: true });
      st.addItems({ gold: amount }, 'grant');
      audio.play('treasure', 0.7);
      st.notify(`Collected ${amount} gold from the settlement!`, true);
    },

    // Empire arc, Wave 5 — plots. `plantedAt`/`lastWateredAt` are epoch ms,
    // the wall-clock convention foundSettlement/collectSettlementYield use,
    // NOT tickPlots' frame-accumulated countdown: a plot has to survive being
    // reloaded, and the countdown only advances while you stand in the world.
    // Nothing reads those timestamps YET — watering advances a stage
    // immediately, with no real-time growth or cooldown. Growth-rate and
    // cooldown timing are explicitly out of scope for this wave; the fields
    // are here so the balance pass has real data to work from.
    cultivatePlot: (plotId) => {
      const st = get();
      const def = PLOT_BY_ID[plotId];
      if (!def || st.cultivatedPlots[plotId]) return;
      // field by field, not a spread of `def`: the definition's own display
      // strings have no business in a save file, and the record's geometry is
      // only ever read back through PLOT_BY_ID anyway
      const plot: CultivatedPlot = {
        id: def.id, kind: def.kind, variant: def.variant,
        x: def.x, z: def.z, halfX: def.halfX, halfZ: def.halfZ, count: def.count,
        world: def.world ?? null,
        stage: 0, plantedAt: Date.now(), lastWateredAt: null,
      };
      // stage 0 is nearly bare on purpose — the cluster is the reward for
      // carrying water to it, not for breaking the ground once
      const fresh = scatterNodesInRect(
        { ...def, count: plotNodeCount(def, 0) }, def.world ?? null, st.nodes,
      );
      set({
        cultivatedPlots: { ...st.cultivatedPlots, [plotId]: plot },
        nodes: [...st.nodes, ...fresh],
        dirty: true,
      });
      audio.play('graze', 0.5);
      st.notify(`${def.name} is broken and planted — water it to bring it on.`, true);
    },

    waterPlot: (plotId) => {
      const st = get();
      const def = PLOT_BY_ID[plotId];
      const plot = st.cultivatedPlots[plotId];
      if (!def || !plot) return;
      if (plot.stage >= MAX_PLOT_STAGE) {
        st.notify(`${def.name} has come in full — there is nothing more to draw up.`);
        return;
      }
      if ((st.inventory.water_bucket ?? 0) <= 0) {
        st.notify('You need a Pail of Water — fill one at the brook.');
        return;
      }
      const stage = plot.stage + 1;
      // the whole cluster is re-scattered from the plot's own fixed seed
      // rather than appended to: a fixed seed places the same candidates in
      // the same order regardless of the target count, so a higher stage is
      // strictly the same nodes PLUS new ones — and it is byte-identical to
      // what seedNodes re-derives after a reload, which an append could never
      // promise (see scatterNodesInRect's own note on the shared stream).
      const kept = st.nodes.filter((n) => n.ground !== def.id);
      // ...and a node that survives that re-scatter keeps the state it was
      // already in — otherwise watering would heal every stump and half-mined
      // boulder in the plot, i.e. a whole respawn for the price of one pail.
      const was = new Map(st.nodes.filter((n) => n.ground === def.id).map((n) => [n.id, n]));
      const grown = scatterNodesInRect(
        { ...def, count: plotNodeCount(def, stage) }, plot.world ?? null, kept,
      ).map((n) => {
        const before = was.get(n.id);
        return before ? { ...n, hitsLeft: before.hitsLeft, respawnAt: before.respawnAt } : n;
      });
      const inv = { ...st.inventory };
      inv.water_bucket = (inv.water_bucket ?? 0) - 1;
      set({
        inventory: inv,
        cultivatedPlots: {
          ...st.cultivatedPlots,
          [plotId]: { ...plot, stage, lastWateredAt: Date.now() },
        },
        nodes: [...kept, ...grown],
        dirty: true,
      });
      st.addXp('farming', 10);
      audio.play('graze', 0.6);
      st.notify(
        stage >= MAX_PLOT_STAGE
          ? `${def.name} has come in full.`
          : `You water ${def.name} — it thickens (${stage}/${MAX_PLOT_STAGE}).`,
        stage >= MAX_PLOT_STAGE,
      );
    },

    captureBlueprint: (name, x, z) => {
      const st = get();
      const RADIUS = 9;
      const MAX_PIECES = 24;
      const nearby = st.buildings.filter((b) => Math.hypot(b.x - x, b.z - z) <= RADIUS);
      if (nearby.length === 0) {
        st.notify('No buildings found near the build camera to capture.');
        return false;
      }
      if (nearby.length > MAX_PIECES) {
        st.notify(`Too many pieces nearby (${nearby.length}, max ${MAX_PIECES}) — capture a smaller cluster.`);
        return false;
      }
      const anchorX = nearby.reduce((sum, b) => sum + b.x, 0) / nearby.length;
      const anchorZ = nearby.reduce((sum, b) => sum + b.z, 0) / nearby.length;
      const pieces: BlueprintPiece[] = nearby.map((b) => ({
        type: b.type,
        dx: Math.round((b.x - anchorX) * 100) / 100,
        dz: Math.round((b.z - anchorZ) * 100) / 100,
        rot: b.rot,
      }));
      const bp: Blueprint = { id: `bp${blueprintSeq++}`, name: name.trim() || 'Unnamed Blueprint', pieces };
      set({ customBlueprints: [...st.customBlueprints, bp], dirty: true });
      st.notify(`Blueprint "${bp.name}" saved (${pieces.length} pieces)!`, true);
      return true;
    },

    deleteBlueprint: (id) => {
      const st = get();
      set({ customBlueprints: st.customBlueprints.filter((b) => b.id !== id) });
    },

    evalBlueprintPlacement: (blueprintId, x, z, rot) => {
      const st = get();
      const bp = STARTER_BLUEPRINT_BY_ID[blueprintId] ?? st.customBlueprints.find((b) => b.id === blueprintId);
      if (!bp) return { pieces: [], valid: false, cost: {} };
      const cos = Math.cos((rot * Math.PI) / 2);
      const sin = Math.sin((rot * Math.PI) / 2);
      const cost: Partial<Record<ItemId, number>> = {};
      let valid = true;
      const pieces = bp.pieces.map((p) => {
        const px = x + (p.dx * cos - p.dz * sin);
        const pz = z + (p.dx * sin + p.dz * cos);
        const pieceRot = ((p.rot + rot) % 4) as 0 | 1 | 2 | 3;
        const def = BUILDABLE_BY_ID[p.type];
        let pieceValid = !!def;
        if (def?.requiresUnlock && !st.unlocks.includes(def.requiresUnlock)) pieceValid = false;
        const ev = pieceValid ? st.evalPlacement(p.type, px, pz, pieceRot) : { y: 0, valid: false };
        pieceValid = pieceValid && ev.valid;
        if (!pieceValid) valid = false;
        if (def) {
          for (const [id, n] of Object.entries(def.cost)) {
            cost[id as ItemId] = (cost[id as ItemId] ?? 0) + (n as number);
          }
        }
        return { type: p.type, x: px, z: pz, rot: pieceRot, y: ev.y, valid: pieceValid };
      });
      return { pieces, valid, cost };
    },

    placeBlueprintAt: (blueprintId, x, z, rot) => {
      const st = get();
      const ev = st.evalBlueprintPlacement(blueprintId, x, z, rot);
      if (!ev.valid || ev.pieces.length === 0) return false;
      if (!st.canAfford(ev.cost)) {
        st.notify('Not enough materials for this blueprint!');
        audio.play('brick_collide', 0.5);
        return false;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(ev.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      const placed: PlacedBuilding[] = ev.pieces.map((p) => {
        // build-then-construct: blueprint pieces are construction sites too —
        // XP/quest credit lands per-piece as each finishes (constructBuilding)
        const pb: PlacedBuilding = { id: `b${buildSeq++}`, type: p.type, x: p.x, z: p.z, y: p.y, rot: p.rot, built: 0, world: st.destination ?? null };
        placeHistory = [...placeHistory.slice(-24), [pb.id]];
        return pb;
      });
      set({ inventory: inv, buildings: [...st.buildings, ...placed], dirty: true });
      audio.play('brick_link', 0.7);
      st.notify(`Blueprint staked out: ${ev.pieces.length} sites marked — now build them!`, true);
      return true;
    },
    setPhotoMode: (photoMode) => set({ photoMode }),
    setCameraMode: (cameraMode) => set({ cameraMode }),
    setTargetKind: (k) => {
      if (get().targetKind !== k) set({ targetKind: k });
    },
    playEmote: (clip) => {
      // emotes show in third person; switch so the player sees themselves
      set({
        emote: { clip, seq: (get().emote?.seq ?? 0) + 1 },
        cameraMode: 'third',
        panel: 'none',
      });
      audio.play('villager', 0.6);
    },
    pokeNpc: (id, clip) => set({ npcGreetSeq: get().npcGreetSeq + 1, npcGreetId: id, npcGreetClip: clip ?? null }),

    beginCeremony: (rank) => {
      const st = get();
      if (st.ceremony) return;
      // Phase 20: the court resides at the royal castle — a knighting is a
      // summons TO The King's Approach, not a house call. travelTo no-ops if
      // the player is somehow already standing there; our teleport below
      // overrides its default landing spot to put them before the throne.
      if (st.destination !== 'template-01') st.travelTo('template-01');
      set({ ceremony: { rank }, panel: 'none', cameraMode: 'third' });
      playerState.pendingTeleport = { x: NPC_KING.x, z: NPC_KING.z - 2.4, yaw: Math.PI };
      audio.play('horn', 0.9);
      setTimeout(() => get().pokeNpc('king', 'anim_r_gesturepullsword'), 600);
      setTimeout(() => get().pokeNpc('king', 'anim_r_congratulate'), 2600);
      setTimeout(() => get().playEmote('anim_r_regalwave'), 2700);
      setTimeout(() => {
        const rankDef = RANKS.find((r) => r.name === rank);
        set({ ceremony: null });
        get().notify(`You are now a ${rank}${rankDef ? ` — ${rankDef.title}` : ''}!`, true);
      }, 5200);
    },

    openDialogue: (npcId) => {
      set({ dialogueNpc: npcId, panel: 'dialogue' });
      get().pokeNpc(npcId);
      // main-quest audience beats complete on actually meeting the person
      bumpQuestCounters('talk', npcId, 1);
    },

    joustRichard: () => {
      const st = get();
      const now = performance.now();
      if (now - lastJoustAt < 3000) return; // a beat to recover the lance between passes
      lastJoustAt = now;
      const richard = NPC_BY_ID['richard'];
      const d = Math.hypot(richard.x - playerState.x, richard.z - playerState.z);
      // a real lance has a sweet-spot reach (~2.2m) — too close or too far
      // scuffs the hit, same "timing" skill as a real pass down the list
      const precision = Math.max(0, 1 - Math.abs(d - 2.2) / 1.4) * (0.75 + Math.random() * 0.25);
      audio.play('thud', 0.8);
      if (precision < 0.25) {
        st.notify('Your lance goes wide — no hit!');
        st.addXp('combat', 8);
        return;
      }
      st.pokeNpc('richard', 'anim_g_fallbackward');
      if (precision < 0.55) {
        st.notify('A glancing blow!', true);
        st.addItems({ gold: 5 }, 'grant');
        st.addXp('combat', 25);
        st.addReputation('richard', 4);
      } else if (precision < 0.85) {
        st.notify('A solid hit! Richard salutes the pass.', true);
        st.addItems({ gold: 15 }, 'grant');
        st.addXp('combat', 55);
        st.addReputation('richard', 8);
        bumpSideQuest('joust', 'any', 1); // his lists errand counts solid+ passes
      } else {
        audio.play('horn', 0.7);
        st.notify('A perfect strike! Richard yields the pass.', true);
        st.addItems({ gold: 30 }, 'grant');
        st.addXp('combat', 90);
        st.addReputation('richard', 14);
        bumpSideQuest('joust', 'any', 1);
      }
    },

    markLoreSeen: (npcId) => {
      const st = get();
      if (st.loreSeen.includes(npcId)) return;
      set({ loreSeen: [...st.loreSeen, npcId], dirty: true });
    },

    // wear per use is deliberately gentle — ~50 uses before a tool is fully
    // worn, and being worn slows the tool down rather than disabling it, so
    // durability is a reason to visit the workbench, not a punishment.
    useTool: (id) => {
      const st = get();
      const before = st.durability[id] ?? 100;
      if (before <= 0) return;
      let wear = st.perks.includes('steady_hands') ? 1.4 : 2;
      if (st.skillTree.includes('smithing2')) wear *= 0.8; // Tempered Edges talent
      const after = Math.max(0, before - wear);
      set({ durability: { ...st.durability, [id]: after }, dirty: true });
      if (after <= 0) st.notify(`Your ${ITEMS[id].name} is worn out — repair it at the workbench.`);
    },

    repairTool: (id) => {
      const st = get();
      const recipe = RECIPES.find((r) => r.output === id);
      // the axe is a starting tool with no recipe of its own (never crafted),
      // so it has no cost to take 30% of — give it a flat, thematic fallback
      const baseCost = recipe?.cost ?? (id === 'axe' ? { wood: 3 } : null);
      if (!baseCost) return;
      const cost: Partial<Record<ItemId, number>> = {};
      // Guild Rates talent (smithing3): repairs at half the usual fraction
      const frac = st.skillTree.includes('smithing3') ? 0.15 : 0.3;
      for (const [k, n] of Object.entries(baseCost)) cost[k as ItemId] = Math.max(1, Math.round((n as number) * frac));
      if (!st.canAfford(cost)) { st.notify('Not enough materials to repair that.'); return; }
      const inv = { ...st.inventory };
      for (const [k, n] of Object.entries(cost)) inv[k as ItemId] = (inv[k as ItemId] ?? 0) - (n as number);
      set({ inventory: inv, durability: { ...st.durability, [id]: 100 }, dirty: true });
      audio.play('brick_connect', 0.7);
      st.notify(`${ITEMS[id].name} repaired!`, true);
    },

    choosePerk: (id) => {
      const st = get();
      if (st.perks.includes(id) || !PERKS.some((p) => p.id === id)) return;
      if (st.perks.length >= perkSlotsEarned(st.xp, st.completedQuests)) return;
      set({ perks: [...st.perks, id], dirty: true });
      audio.play('treasure', 0.8);
      const def = PERKS.find((p) => p.id === id)!;
      st.notify(`Perk gained: ${def.name} — ${def.desc}`, true);
    },

    // called from combat.ts alongside the generic kill notify/XP (see
    // KIND_XP.cedric there) — this adds the one-time capstone material
    // reward, flags the camp cleared, and gives the "safely behind bars"
    // story beat its own line.
    markCedricDefeated: () => {
      const st = get();
      if (st.defeatedCedric) return;
      set({ defeatedCedric: true, dirty: true });
      // Cedric's Siege: the capstone payout for the real, permanent final
      // stand — bigger than the old flat reward this used to pay for ANY
      // duel win, since reaching this now means finishing the whole arc
      // (a weathered homestead siege first, then this)
      st.addItems({ gold: 250, iron_bar: 10, stone: 20 }, 'grant');
      st.grantArmory('halberd', 1);
      st.grantArmory('chestplate', 1);
      st.shiftAllegiance(35, "You ended Cedric's rebellion at his own camp");
      audio.play('treasure', 0.9);
      audio.play('horn', 1);
      st.notify("🔒 Cedric's rebellion ends here — the Bull is dragged in chains at last!", true);
    },

    // Phase 21 talent tree: spend derived points (one earned per total skill
    // level) down a skill's branch — talentBuyable re-checks prerequisites,
    // the skill-level gate and the unspent balance at purchase time
    buyTalent: (talentId) => {
      const st = get();
      const def = TALENT_BY_ID[talentId];
      if (!def) return;
      const check = talentBuyable(def, st.skillTree, st.xp);
      if (!check.ok) {
        st.notify(check.why);
        return;
      }
      set({ skillTree: [...st.skillTree, talentId], dirty: true });
      audio.play('treasure', 0.7);
      st.notify(`✦ Talent learned: ${def.name} — ${def.desc}`, true);
    },

    // companion traits (AI-wave-2 batch): a villager's own mini skill tree —
    // one slot per 2 mastery levels in their current trade, chosen here
    chooseTrait: (villagerId, traitId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      const def = COMPANION_TRAIT_BY_ID[traitId];
      if (!v || !def) return;
      if (def.job !== v.job) return;
      if (hasTrait(v, traitId)) return;
      if (traitsOwnedInJob(v) >= traitSlots(v)) {
        st.notify(`${v.name} must master their trade further before learning another trait.`);
        return;
      }
      const villagers = st.villagers.map((x) =>
        x.id === villagerId ? { ...x, traits: [...(x.traits ?? []), traitId] } : x);
      set({ villagers, dirty: true });
      audio.play('treasure', 0.7);
      st.notify(`${def.icon} ${v.name} learns ${def.name} — ${def.desc}!`, true);
    },

    // player attributes (AI-wave-2 batch): points earned by total skill
    // level (one per ATTR_POINT_EVERY), invested permanently — the champion's
    // own layer of the same five-attribute system villagers carry
    spendAttrPoint: (id) => {
      const st = get();
      const earned = attrPointsEarned(totalSkillLevel(st.xp));
      if (attrPointsSpent(st.attrSpent) >= earned) {
        st.notify('No attribute points to spend — raise your skills further.');
        return;
      }
      const attrSpent = { ...st.attrSpent, [id]: (st.attrSpent[id] ?? 0) + 1 };
      set({ attrSpent, dirty: true });
      audio.play('unlock', 0.7);
      const def = PLAYER_ATTRS.find((a) => a.id === id)!;
      st.notify(`${def.icon} ${def.label} rises to ${attrSpent[id]} — ${def.blurb}.`, true);
    },

    // Wave 9 · the respec ROADMAP has listed as a follow-up since the
    // attribute layer shipped. Wholesale reset for a scaling gold fee — see
    // data/playerAttributes' respecCost for why full-reset and why scaling.
    // Nothing here needs a migration: `attrSpent` is an ordinary save field
    // already, and emptying it is just another value it could always have
    // held. Every consumer (combat.ts's stamina/melee, sale price, yield and
    // craft rolls) reads it live with a `?? 0`, so they all correct
    // themselves on the next read with no invalidation step.
    respecAttributes: () => {
      const st = get();
      const spent = attrPointsSpent(st.attrSpent);
      if (spent <= 0) {
        st.notify('You have invested nothing to take back.');
        return;
      }
      const cost = respecCost(spent);
      if ((st.inventory.gold ?? 0) < cost) {
        st.notify(`Rethinking your nature costs ${cost} gold.`);
        return;
      }
      st.addItems({ gold: -cost });
      set({ attrSpent: {}, dirty: true });
      audio.play('unlock', 0.7);
      st.notify(`↺ ${spent} attribute point${spent > 1 ? 's' : ''} returned to you for ${cost} gold — spend them anew.`, true);
    },

    // Phase 21 guilds: join free the first time (if the matching Challenge
    // tier is earned — the hall panel gates the button, this re-checks),
    // change banners later for a gold tithe. One primary guild at a time.
    joinGuild: (guildId) => {
      const st = get();
      if (st.guild === guildId) return;
      const def = GUILD_BY_ID[guildId];
      if (!def) return;
      if (!guildEligible(def, st.stats)) {
        st.notify('The guild door stays shut — prove yourself on their challenge first.');
        return;
      }
      if (st.guild) {
        if ((st.inventory.gold ?? 0) < SWITCH_TITHE) {
          st.notify(`Changing banners costs a ${SWITCH_TITHE} gold tithe.`);
          return;
        }
        st.addItems({ gold: -SWITCH_TITHE });
      }
      set({ guild: guildId, dirty: true });
      audio.play('horn', 0.8);
      st.notify(`🏛 You now carry the banner of the ${def.name}!`, true);
    },

    // Phase 19 alliance branch: a one-way pledge — no CASUAL re-swearing
    // (Wave 13 adds exactly one deliberate exception: betrayCedric below).
    // The raid system reads this to decide WHO attacks the homestead:
    // pledge to Cedric and the crown's knights come for you; pledge to Leo
    // (or stay unsworn) and the bandit/Cedric raids continue as before.
    pledgeAlliance: (side) => {
      const st = get();
      if (st.alliance) return;
      // Wave 13 · a knight who already turned on Cedric once (betrayCedric)
      // can never clasp arms with him again — otherwise defecting would be
      // a free way to ping-pong between both pledges' exclusive rewards.
      if (side === 'cedric' && st.betrayedCedric) {
        st.notify("Cedric's camp wants nothing to do with a known turncoat.");
        return;
      }
      set({ alliance: side, panel: 'none', dirty: true });
      audio.play('horn', 0.9);
      if (side === 'leo') {
        st.notify('👑 You kneel before King Leo. Your sword belongs to the crown!', true);
      } else {
        audio.playVoice('greeting_cedric', 0.85);
        st.notify('🐂 You clasp arms with Cedric the Bull. The crown will name you traitor!', true);
        // Wave 13 alliance follow-up: pledging Cedric used to cost nothing
        // against the OTHER side — the raid AI flips (a strict benefit) but
        // Richard and the Queen's opinion of you never moved, even though
        // you just swore to the man raiding their kingdom. A real dip, not
        // a cosmetic one — see addReputation's own tier-crossing guard for
        // why a negative amount is safe to pass here.
        st.addReputation('richard', -20);
        st.addReputation('queen', -20);
        st.notify("Word reaches Richard and the Queen — your standing with the crown's household has soured.");
      }
    },

    // Wave 13 · the one turncoat move this wave ships — see this action's
    // own interface doc comment for why it is one-directional. Only ever
    // reachable from ParleyPanel's War Council branch, which only renders
    // at Cedric's own camp with alliance === 'cedric' already true, so no
    // extra location/state guard is needed here beyond the alliance check.
    betrayCedric: () => {
      const st = get();
      if (st.alliance !== 'cedric') return;
      set({
        alliance: null, betrayedCedric: true, panel: 'none', dirty: true,
        // burn the rebellion errand you were carrying too, if any — you
        // don't get to finish a job for a war council you just turned on
        sideQuest: st.sideQuest?.npcId === 'cedric' ? null : st.sideQuest,
      });
      audio.play('horn', 0.9);
      st.notify("🗡 You turn on Cedric's rebellion — the Bull will never trust you again, but the crown might.", true);
      st.shiftAllegiance(20, "You turned your blade on the Bull's own camp");
    },

    acceptSideQuest: (npcId, questId) => {
      const st = get();
      const def = sideQuestsOf(npcId).find((q) => q.id === questId);
      if (!def || st.sideQuest) return;
      // precursor chains and allegiance/alliance gates are enforced HERE as
      // well as in the UI, so a stale panel can never hand out work you have
      // not earned
      const blocked = sideQuestBlocker(def, st.completedSideQuests, st.allegiance, st.alliance);
      if (blocked) { st.notify(blocked); return; }
      set({ sideQuest: { npcId, questId, have: 0 }, dirty: true });
      st.notify(`Errand accepted: ${def.label}`);
    },

    turnInSideQuest: () => {
      const st = get();
      const sq = st.sideQuest;
      if (!sq) return;
      const def = sideQuestsOf(sq.npcId).find((q) => q.id === sq.questId);
      if (!def || sq.have < def.need) return;
      // Wave 13 · a delivery errand is only "done" once you're standing
      // where the goods were asked for — not back with whoever handed it to
      // you (see npcs.ts's own doc comment on `deliverTo`)
      if (def.kind === 'deliver' && st.destination !== def.deliverTo) {
        const distName = WORLD_DESTINATION_BY_ID[def.deliverTo ?? '']?.name ?? 'its destination';
        st.notify(`Not delivered yet — carry it to ${distName} first.`);
        return;
      }
      // gather AND deliver errands hand the physical goods over
      if (def.kind === 'gather' || def.kind === 'deliver') {
        const inv = { ...st.inventory };
        const held = inv[def.target as ItemId] ?? 0;
        if (held < def.need) {
          st.notify(`You no longer carry ${def.need} of those…`);
          return;
        }
        inv[def.target as ItemId] = held - def.need;
        set({ inventory: inv });
      }
      set({ sideQuest: null, dirty: true });
      st.addXp(def.xpSkill, def.xp);
      if (def.rewardItems) st.addItems(def.rewardItems, 'grant');
      audio.play('treasure', 0.8);
      // a delivery hands off to whoever's actually standing here, not the
      // (physically absent) giver back home
      st.notify(def.kind === 'deliver'
        ? 'The load is handed over — word of it will get back to ' + sideQuestGiverName(sq.npcId) + '.'
        : `${sideQuestGiverName(sq.npcId)} thanks you for your service!`, true);
      st.addReputation(sq.npcId, 15);
      // remember it, so chains can require it and it never re-offers as new
      if (!st.completedSideQuests.includes(def.id)) {
        set({ completedSideQuests: [...st.completedSideQuests, def.id] });
      }
      // and let it move where you stand — neutral village work has no delta,
      // which is what keeps 'unsworn' a real stance rather than a gap
      if (def.allegiance) {
        st.shiftAllegiance(def.allegiance, `You served ${sideQuestGiverName(sq.npcId)}`);
      }
    },

    abandonSideQuest: () => set({ sideQuest: null, dirty: true }),

    setTrackedQuest: (which) => set({ trackedQuest: which, dirty: true }),

    bumpErrand: (kind, target, amount) => bumpSideQuest(kind, target, amount),

    scanTarget: () => {
      const t = aimState.target;
      const st = get();
      if (!t || t.standing !== 'hostile') return;
      if (st.bestiary.includes(t.kind)) return;
      set({ bestiary: [...st.bestiary, t.kind], dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${t.name} recorded in your collection book.`, true);
      st.addXp('combat', 10);
    },

    recordKill: (kind) => {
      // errands can name a specific enemy kind (Cedric's "cull the King's
      // hounds" targets 'royal'); 'any'-target errands still match wildcard
      bumpSideQuest('kill', kind, 1);
      const st = get();
      set({
        stats: {
          ...st.stats,
          kills: st.stats.kills + 1,
          killsByKind: { ...st.stats.killsByKind, [kind]: (st.stats.killsByKind[kind] ?? 0) + 1 },
        },
      });
    },

    sellItem: (item, qty) => {
      const st = get();
      const price = SELL_PRICES[item];
      if (!price) return;
      const held = st.inventory[item] ?? 0;
      const n = Math.min(qty, held);
      if (n <= 0) return;
      const inv = { ...st.inventory };
      inv[item] = held - n;
      // Wit attribute: a sharper tongue haggles +4% per point. Silver Tongue
      // trade-off perk: a flat +15% on top (its own downside lives in
      // Storm's own duel cooldown — see Enemies.tsx's 'storm' branch).
      const take = Math.round(price * n * (1 + (st.attrSpent.wit ?? 0) * 0.04
        + (st.perks.includes('silver_tongue') ? 0.15 : 0)));
      inv.gold = (inv.gold ?? 0) + take;
      set({
        inventory: inv,
        stats: { ...st.stats, goldEarnedLifetime: st.stats.goldEarnedLifetime + take },
        dirty: true,
      });
      audio.play('treasure', 0.5);
    },

    buyOffer: (item, qty, price) => {
      const st = get();
      // Silver Tongue trade-off perk: the same +15% haggle sellItem() gives,
      // spent the other direction — a flat discount on what the merchant asks
      const cost = st.perks.includes('silver_tongue') ? Math.round(price * 0.85) : price;
      if ((st.inventory.gold ?? 0) < cost) {
        st.notify('Not enough gold!');
        return;
      }
      const inv = { ...st.inventory };
      inv.gold = (inv.gold ?? 0) - cost;
      inv[item] = (inv[item] ?? 0) + qty;
      set({ inventory: inv, dirty: true });
      audio.play('brick_connect', 0.6);
    },

    plantPlot: (buildingId) => {
      const st = get();
      if ((st.plots[buildingId] ?? -1) >= 0) return;
      let growTime = st.perks.includes('green_thumb') ? GROW_TIME * 0.85 : GROW_TIME;
      if (st.skillTree.includes('farming2')) growTime *= 0.88; // Rich Soil talent
      set({ plots: { ...st.plots, [buildingId]: growTime }, dirty: true });
      audio.play('graze', 0.5);
      st.notify('Wheat planted. Give it time and sunshine.');
    },

    harvestPlot: (buildingId) => {
      const st = get();
      const left = st.plots[buildingId];
      if (left === undefined || left > 0) return;
      const plots = { ...st.plots };
      delete plots[buildingId]; // back to untilled
      set({ plots, dirty: true });
      // Heavy Sheaves talent (farming3): +1 wheat every harvest
      const sheaves = st.skillTree.includes('farming3') ? 1 : 0;
      st.addItems({ wheat: 2 + sheaves + (Math.random() < 0.35 ? 1 : 0) }, 'gather');
      st.addXp('farming', 12);
      audio.play('treasure', 0.5);
    },

    toggleGate: (buildingId) => {
      const st = get();
      const wasOpen = st.gateOpen[buildingId] ?? true;
      // buildings is also re-spread (its own entries are unchanged) so the
      // 1Hz `rebuildNav(useGameStore.getState().buildings)` poll in
      // Enemies.tsx — which only re-stamps on a reference change — actually
      // notices a gate toggle. gateOpen is a separate field from
      // PlacedBuilding itself, so without this the nav grid would keep
      // treating a just-opened/closed gate as whatever it was before,
      // sometimes indefinitely (found while verifying §2.5's "gate vs
      // wall" checklist item alongside NavGrid.rebuild()'s own missing
      // gateOpen check — the same bug had two different-shaped halves).
      set({ gateOpen: { ...st.gateOpen, [buildingId]: !wasOpen }, buildings: [...st.buildings], dirty: true });
      // Wave 8 · doors share this record and this action (see isDoorLike), so
      // they share the reference-bump above for free — what differs is only
      // what it sounds and reads like. A door has a real `door_open` sample in
      // the bank that nothing was using; a portcullis grinds.
      const isDoor = st.buildings.find((b) => b.id === buildingId)?.type === 'door';
      if (isDoor) audio.play('door_open', 0.75);
      else audio.play(wasOpen ? 'portcullis' : 'drawbridge', 0.8);
      st.notify(
        isDoor
          ? (wasOpen ? 'You pull the door to.' : 'The door swings open.')
          : (wasOpen ? 'The gate grinds shut.' : 'The gate creaks open.'),
      );
    },

    damageBuilding: (id, amount, cause) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b) return;
      const max = maxHpFor(b.type);
      const hp = (st.buildingHp[id] ?? max) - amount;
      if (hp > 0) {
        // labeled destruction phases, now read from the rig lab's own
        // `destructionPhase`/`destructionPhaseCount` instead of a hardcoded
        // mc006→mc009→mc010 ladder (2026-07-20). Every straight wall degrades
        // through its real damage-state molds now — the old hardcode only
        // covered mc006, so mc007 (the main Castle Wall) and mc008 could be
        // sieged forever without ever showing a scratch. Scars persist.
        const damagedLabId = labDamagedForm(labAssetId(b.type), hp / max);
        const phase = (damagedLabId && buildableForLabAsset(damagedLabId)) || b.type;
        if (phase !== b.type) {
          const ruined = !!capOf(labAssetId(phase))?.traits.wall?.isRuined;
          set({
            buildings: st.buildings.map((x) => (x.id === id ? { ...x, type: phase } : x)),
            buildingHp: { ...st.buildingHp, [id]: hp },
            dirty: true,
          });
          st.notify(ruined ? '🔥 The breached wall crumbles to a ruin!' : '🔥 The castle wall is breached!', true);
        } else {
          set({ buildingHp: { ...st.buildingHp, [id]: hp }, dirty: true });
        }
        audio.play('brick_collide', 0.6);
        return;
      }
      // destroyed: rubble refund, same half-materials-back rate as demolishing by hand
      const def = BUILDABLE_BY_ID[b.type];
      const inv = { ...st.inventory };
      // a placed piece can outlive its catalog entry (a save from before a
      // buildable was renamed/removed) — refund nothing rather than throwing
      for (const [itemId, n] of Object.entries(def?.cost ?? {})) {
        const refund = Math.floor((n as number) / 2);
        if (refund > 0) inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + refund;
      }
      const hpRest = { ...st.buildingHp };
      delete hpRest[id];
      set({
        buildings: st.buildings.filter((x) => x.id !== id),
        buildingHp: hpRest,
        inventory: inv,
        dirty: true,
      });
      audio.play('brick_collide', 0.8);
      st.notify(`${def.name} ${cause ?? 'was smashed'} to rubble! Half materials recovered.`, true);
    },

    settleCart: (id) => {
      const st = get();
      const live = cartLivePos[id];
      delete cartLivePos[id];
      if (!live) return;
      const b = st.buildings.find((x) => x.id === id);
      if (!b) return;
      set({
        buildings: st.buildings.map((bld) => (bld.id === id ? { ...bld, x: live.x, z: live.z } : bld)),
        dirty: true,
      });
    },

    addReputation: (npcId, amount) => {
      const st = get();
      const npc = NPC_BY_ID[npcId];
      if (!npc?.repTitles) return;
      const before = st.reputation[npcId] ?? 0;
      const after = before + amount;
      set({ reputation: { ...st.reputation, [npcId]: after }, dirty: true });
      const tierAt = (rep: number) => [...npc.repTitles!].reverse().find((t) => rep >= t.min);
      const tierBefore = tierAt(before);
      const tierAfter = tierAt(after);
      // Wave 13 · only a genuine step UP is an "achievement" worth a cheer
      // and a purse. Every call site before this wave only ever passed a
      // positive amount, so this guard was never exercised — but the
      // alliance reputation fallout (pledgeAlliance) is the first caller to
      // pass a negative one, and without the `.min` comparison a downward
      // dip that still lands on a real (lower) tier boundary would fire the
      // same "now sees you as" toast and hand out gold for LOSING standing.
      if (tierAfter && (!tierBefore || tierAfter.min > tierBefore.min)) {
        audio.play('villager', 0.7);
        st.notify(`${npc.name} now sees you as: ${tierAfter.title}!`, true);
        st.addItems({ gold: 10 }, 'grant');
      }
    },

    travelTo: (id, poiId) => {
      const st = get();
      const dest = WORLD_DESTINATION_BY_ID[id];
      if (!dest) return;
      // Wave 14 · an unrecognized/unrevealed poiId (stale save, a POI hidden
      // behind a reveal quest not yet done) just falls back to a plain
      // destination-level travel rather than silently no-op'ing the whole
      // call — see poisForDestination's own isNpcRevealed gate.
      const poi = poiId ? poisForDestination(id, st.completedQuests).find((p) => p.id === poiId) : undefined;
      // Re-clicking the same destination with no waypoint target stays a
      // no-op, unchanged from before poiId existed. A waypoint always
      // re-teleports even to a destination you're already standing in —
      // "jump straight to this resident" is the whole point of a waypoint.
      if (st.destination === id && !poi) return;
      const firstVisit = !st.visitedWorlds.includes(id);
      const firstPoiVisit = !!poi && !st.discoveredPois.includes(poi.id);
      set({
        destination: id,
        visitedWorlds: firstVisit ? [...st.visitedWorlds, id] : st.visitedWorlds,
        discoveredPois: firstPoiVisit ? [...st.discoveredPois, poi!.id] : st.discoveredPois,
        panel: 'none',
        dirty: true,
      });
      // a waypoint lands right in front of its resident (same -2.4 offset
      // beginCeremony already uses to stand the player before the King)
      // rather than the destination's generic origin landing spot.
      playerState.pendingTeleport = poi
        ? { x: poi.x, z: poi.z - 2.4, yaw: poi.yaw }
        : { x: dest.origin.x, z: dest.origin.z - dest.radius * 0.5, yaw: Math.PI };
      audio.play('canter', 0.8);
      if (firstVisit && dest.loot) {
        st.addItems(dest.loot, 'grant');
        st.notify(dest.lootText ?? 'You find something of value.', true);
      }
      st.notify(poi ? `You travel to ${poi.name} at ${dest.name}.` : `You travel to ${dest.name}.`);
      // main-quest travel beats credit the journey itself
      bumpQuestCounters('visit', id, 1);
    },

    returnHome: () => {
      const st = get();
      if (!st.destination) return;
      set({ destination: null, dirty: true });
      resetDungeon();
      playerState.pendingTeleport = { x: SIGNPOST.x, z: SIGNPOST.z + 3, yaw: 0 };
      audio.play('horn', 0.7);
      st.notify('You return home.');
    },

    enterDungeon: () => {
      const st = get();
      if (st.destination) return;
      if (!st.completedQuests.includes(DUNGEON_UNLOCK_QUEST)) {
        st.notify('The Sealed Crypt only opens to a proven Knight.');
        return;
      }
      const layout = generateDungeonLayout();
      dungeonState.layout = layout;
      set({ destination: 'dungeon', panel: 'none', dirty: true });
      playerState.pendingTeleport = { x: layout.entryPos.x, z: layout.entryPos.z, yaw: 0 };
      audio.play('canter', 0.8);
      st.notify('You descend into the Sealed Crypt…', true);
    },

    // requested 2026-08-03: the endless mob arena, entered from the Travel
    // Map exactly like the Sealed Crypt above — same unlock gate for a
    // first cut (no new quest content needed), same pendingTeleport
    // mechanism. See game/arena.ts for the run-local kill counter/scaling
    // this resets.
    enterArena: (envId) => {
      const st = get();
      if (st.destination) return;
      if (!st.completedQuests.includes(DUNGEON_UNLOCK_QUEST)) {
        st.notify('The Arena only opens to a proven Knight.');
        return;
      }
      resetArenaRun(envId);
      set({ destination: 'arena', panel: 'none', dirty: true });
      playerState.pendingTeleport = { x: ARENA_ORIGIN.x, z: ARENA_ORIGIN.z, yaw: 0 };
      audio.play('canter', 0.8);
      st.notify('You enter the arena…', true);
    },

    // the voluntary-exit path — banks whatever milestone rewards were
    // already granted mid-run (those were handed out the moment each
    // threshold was crossed, not held back for a "complete" state that
    // this open-ended mode never reaches). damagePlayer()'s own arena
    // branch (combat.ts) is the other, involuntary way out.
    leaveArena: () => {
      const st = get();
      if (st.destination !== 'arena') return;
      endArenaRun();
      set({ destination: null, dirty: true });
      playerState.pendingTeleport = { x: SIGNPOST.x, z: SIGNPOST.z + 3, yaw: 0 };
      audio.play('horn', 0.7);
      st.notify('You leave the arena.');
    },

    tickPlots: (dt) => {
      const st = get();
      let changed = false;
      let ready = false;
      const plots = { ...st.plots };
      const growthRate = st.season === 3 ? 0.55 : 1; // winter: crops grow slower
      for (const [id, left] of Object.entries(plots)) {
        if (left <= 0) continue;
        const next = Math.max(0, left - dt * growthRate);
        if (next !== left) {
          plots[id] = next;
          changed = true;
          if (next === 0) ready = true;
        }
      }
      if (changed) set({ plots });
      if (ready) st.notify('🌾 A crop is ready to harvest!', true);
    },

    // Alric & Beda (2026-07-20): the two always-present starter villagers
    // used to be pure decoration — a greeting and nothing else. They now have
    // a real path onto the roster, bypassing the usual bed/building gate
    // entirely (they already live in their own huts, see StarterVillage.tsx)
    // — a quest-flavored, one-time recruitment instead. Once joined they
    // stop rendering as a standalone NpcDef (see Npc.tsx's filter) and
    // become an ordinary roster villager, managed from the Roster panel like
    // any other recruit.
    //
    // Used to pre-assign job:'farmer'/'miner' with a tradeXp head start
    // ("an already-established trade rather than a green newcomer's") — a
    // real bug in practice, not just a design choice worth revisiting: a
    // brand-new homestead usually has no farmplot built yet, and job:
    // 'farmer' has no fallback worksite (`Villagers.tsx`'s own cascade), so
    // Alric fell straight through to the generic wander loop and looked
    // permanently broken — pre-employed on paper, aimlessly pacing in
    // practice. They now join `idle`/unassigned with no tradeXp, exactly
    // like every other newcomer from `checkVillagerArrival` — the player
    // assigns a real job (with real infrastructure already in place) from
    // the Roster panel same as anyone else.
    recruitVillageFolk: (npcId) => {
      const st = get();
      if (st.villagers.some((v) => v.id === npcId)) return; // already joined
      if (st.villagers.length >= MAX_VILLAGERS) {
        st.notify('Your homestead roster is full — no room to take them on.');
        return;
      }
      const isAlric = npcId === 'farmer_alric';
      const cost: Partial<Record<ItemId, number>> = isAlric ? { wood: 6 } : { stone: 6 };
      if (!st.canAfford(cost)) {
        const need = Object.entries(cost).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(', ');
        st.notify(`Not enough materials — ${need} needed.`);
        return;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(cost)) inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      const name = isAlric ? 'Alric' : 'Beda';
      const villager: Villager = { id: npcId, name, job: 'idle' };
      // They walk the road in like every other newcomer. This used to read
      // `const m = villagerMobs[npcId]; if (m) m.arriving = true;` on the
      // theory that they should set off from wherever they already stood —
      // but `villagerMobs[npcId]` does not exist yet at this point
      // (registerVillagerMob runs in VillagerFigure's useMemo, which only
      // mounts once they ARE a villager), so `m` was always undefined and the
      // whole thing was a silent no-op. They spawned on the doorstep instead.
      // arriveByRoad creates the entry as well as setting the flag.
      const entry = roadEntry();
      arriveByRoad(npcId, entry.x, entry.z);
      // Npc.tsx's CourtNpc registers into `npcMobs` on mount but never
      // cleans up on unmount (same gap villagerMobs's own comment above
      // already found and fixed for arrival) — once `villagers` excludes
      // this id, Npc.tsx stops rendering him and PlayerController's own
      // interact check already skips him too, but `npcMobs[npcId]` was left
      // behind at his static post forever. targeting.ts's `resolveAim` has
      // no concept of "already recruited" (it's a leaf module fed raw
      // `npcMobs` entries) and kept raycasting a friendly cylinder there,
      // so the crosshair nameplate ("Alric · FRIENDLY · 1m") kept appearing
      // at his old spot with no figure behind it. Deleting the stale entry
      // here — the one place that knows for certain this id just stopped
      // being a static NPC — fixes it at the source instead of teaching
      // every consumer to filter it out independently.
      delete npcMobs[npcId];
      set({
        inventory: inv,
        villagers: [...st.villagers, villager],
        dirty: true,
      });
      audio.play('treasure', 0.7);
      st.notify(`${name} joins your homestead! Assign them a job from the Roster panel.`, true);
    },

    checkVillagerArrival: () => {
      const st = get();
      if (st.villagers.length >= MAX_VILLAGERS) return;
      const req = villagerRequirement(st.villagers.length + 1);
      // newcomers judge the HOMESTEAD, not a remote outpost — a claimed
      // template-world plot's structures shouldn't hasten arrivals at home
      // …and they judge FINISHED structures. Both counts used to include
      // construction sites, so placing a bed ghost was enough to summon its
      // occupant — a villager turning up before there was anything to sleep
      // on. `Villagers.tsx`'s night routine already claims only built beds
      // (`isBuilt`), so an early arrival had nowhere to go and slept on the
      // spot. Arrival now uses the same standard the bed claim does.
      const homeBuildings = st.buildings.filter((b) => isHomeBuilding(b) && isBuilt(b));
      const beds = homeBuildings.filter((b) => b.type === 'bed').length;
      if (beds < req.beds || homeBuildings.length < req.buildings) return;
      const taken = new Set(st.villagers.map((v) => v.name));
      const name = VILLAGER_NAMES.find((n) => !taken.has(n)) ?? `Villager ${st.villagers.length + 1}`;
      const villager: Villager = { id: `v${villagerSeq++}`, name, job: 'idle' };
      // they walk in along the road rather than appearing at the hearth
      const entry = roadEntry();
      arriveByRoad(villager.id, entry.x, entry.z);
      set({ villagers: [...st.villagers, villager], dirty: true });
      audio.playVoice('greeting_king', 0.5);
      st.notify(`${name} has come to join your homestead!`, true);
    },

    // the Armory (equipment system): a shared homestead pool of spare gear,
    // separate from the player's own Satchel. Stocked by raid/dungeon loot
    // (see Enemies.tsx) or donated here from the Satchel; drawn down when a
    // villager equips a piece, refunded on unequip — so the same 3 helmets
    // just move between "in the armory" and "on someone's head".
    openVillagerEquip: (villagerId) => {
      set({ equippingVillagerId: villagerId, panel: 'npcEquip' });
    },

    // walking up to a specific station and pressing E should offer only
    // THAT station's own recipes, not the whole tabbed Crafting book — see
    // StationMenuPanel.tsx, which links back to the full book if the player
    // wants to browse everything anyway
    openStationMenu: (station) => {
      set({ activeStation: station, panel: 'stationMenu' });
    },

    // raid/dungeon loot lands directly in the Armory (never the player's own
    // Satchel) — it's garrison plunder, not personal treasure
    grantArmory: (item, qty) => {
      const st = get();
      set({ armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + qty }, dirty: true });
    },

    donateToArmory: (item, qty) => {
      const st = get();
      const held = st.inventory[item] ?? 0;
      const n = Math.min(qty, held);
      if (n <= 0) return;
      set({
        inventory: { ...st.inventory, [item]: held - n },
        armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + n },
        dirty: true,
      });
      audio.play('brick_link', 0.5);
      st.notify(`${n}× ${ITEMS[item]?.name ?? item} sent to the Armory.`);
    },

    // Wave 9 · the chestplate half of this pair now DELEGATES to the tiered
    // actions below, so there is exactly one code path putting a plate on a
    // villager. Nothing about the boolean callers changed: dropping the plain
    // `chestplate` item on the paperdoll still equips the iron tier, and
    // taking it off still returns whichever tier they were actually wearing.
    equipVillagerGear: (villagerId, slot) => {
      const st = get();
      if (slot === 'chestplate') { st.equipVillagerChestplate(villagerId, 'iron'); return; }
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v) return;
      const item: ItemId = 'helmet';
      const stock = st.armory[item] ?? 0;
      if (v.gear?.[slot]) return; // already wearing one
      if (stock <= 0) {
        st.notify('The Armory has no spare helmets.');
        return;
      }
      const villagers = st.villagers.map((x) =>
        x.id === villagerId ? { ...x, gear: { ...x.gear, [slot]: true } } : x);
      set({ villagers, armory: { ...st.armory, [item]: stock - 1 }, dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${v.name} dons a helmet from the Armory.`);
    },

    unequipVillagerGear: (villagerId, slot) => {
      const st = get();
      if (slot === 'chestplate') { st.unequipVillagerChestplate(villagerId); return; }
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v?.gear?.[slot]) return;
      const item: ItemId = 'helmet';
      const villagers = st.villagers.map((x) =>
        x.id === villagerId ? { ...x, gear: { ...x.gear, [slot]: false } } : x);
      set({ villagers, armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 }, dirty: true });
      audio.play('brick_collide', 0.5);
      st.notify(`${v.name} returns the helmet to the Armory.`);
    },

    // Wave 9 armor tiers — the carrier/loadout shape, for the same reason:
    // `gear.chestplate` is ONE field holding a tier, so upgrading iron to
    // forged must hand the iron plate back to the Armory in the same action
    // or the swap would quietly destroy it. Note the tier a villager wears is
    // read through `chestplateTierOf` rather than off the field, so a legacy
    // `true` (the old single tier) unequips as an Iron Plate rather than
    // falling through and returning nothing.
    equipVillagerChestplate: (villagerId, tier) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v) return;
      const worn = chestplateTierOf(v.gear);
      if (worn === tier) return;
      const def = CHESTPLATE_BY_TIER[tier];
      if ((st.armory[def.item] ?? 0) <= 0) {
        st.notify(`The Armory has no spare ${def.label.toLowerCase()}.`);
        return;
      }
      const armory = { ...st.armory };
      if (worn) {
        const old = CHESTPLATE_ITEM[worn];
        armory[old] = (armory[old] ?? 0) + 1;
      }
      armory[def.item] = (armory[def.item] ?? 0) - 1;
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, chestplate: tier } } : x));
      set({ villagers, armory, dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${v.name} buckles on the ${def.label} — ${def.blurb}`);
    },

    unequipVillagerChestplate: (villagerId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      const worn = chestplateTierOf(v?.gear);
      if (!v || !worn) return;
      const item = CHESTPLATE_ITEM[worn];
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, chestplate: false } } : x));
      set({ villagers, armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 }, dirty: true });
      audio.play('brick_collide', 0.5);
      st.notify(`${v.name} returns the ${CHESTPLATE_BY_TIER[worn].label.toLowerCase()} to the Armory.`);
    },

    // Wave 9 dyes · spend one brewed dye to open its palette row for the rest
    // of the save (data/dyes.ts argues once-not-per-recolour). Deliberately
    // additive: nothing here can ever REMOVE a colour, and a save with no
    // `dyes` at all simply keeps the free swatches it always had.
    unlockDye: (rowId) => {
      const st = get();
      const row = DYE_ROW_BY_ID[rowId];
      if (!row || st.dyes.includes(rowId)) return;
      if ((st.inventory[row.item] ?? 0) <= 0) {
        st.notify(`You have no ${ITEMS[row.item]?.name ?? 'dye'} — steep one at a campfire.`);
        return;
      }
      st.addItems({ [row.item]: -1 });
      set({ dyes: [...st.dyes, rowId], dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${row.label} unlocked — the vat takes, and the colour is yours for good.`, true);
    },

    // appearance editing (2026-07-20): only the fields the player actually
    // changed are stored, so anything untouched keeps tracking the id-derived
    // default in data/villagerLooks.ts
    setVillagerLook: (villagerId, look) => {
      const st = get();
      const villagers = st.villagers.map((v) =>
        (v.id === villagerId ? { ...v, look: { ...(v.look ?? {}), ...look } } : v));
      set({ villagers, dirty: true });
    },

    resetVillagerLook: (villagerId) => {
      const st = get();
      const villagers = st.villagers.map((v) => {
        if (v.id !== villagerId) return v;
        const { look: _drop, ...rest } = v;
        return rest;
      });
      set({ villagers, dirty: true });
    },

    assignJob: (villagerId, job) => {
      const st = get();
      const villagers = st.villagers.map((v) => (v.id === villagerId ? { ...v, job } : v));
      const jobDef = JOB_BY_ID[job];
      const villagerProgress = { ...st.villagerProgress, [villagerId]: jobDef.tripSeconds };
      set({ villagers, villagerProgress, dirty: true });
      const name = st.villagers.find((v) => v.id === villagerId)?.name ?? 'Villager';
      st.notify(job === 'idle' ? `${name} is now unassigned.` : `${name} is now your ${jobDef.label.toLowerCase()}.`);
    },

    // Requested 2026-07-30: "beds... should be exclusively owned by one
    // villager, no other npc can take their place." The old assignment
    // (both `villagers.ts`'s own `assignedSleepSpot` helper, now removed,
    // AND Defenders.tsx's own separate rank math for resting guards) was
    // recomputed fresh from ROSTER RANK on every call — not a stored
    // relationship, so a job
    // switch, a new recruit, or a demolished bed could silently reshuffle
    // who slept where, and the two independent rank computations had no way
    // to notice if they picked the same bed. A bed is now claimed ONCE,
    // permanently, the first time a villager needs one — freed only by
    // demolishing the bed itself (villagers are never removed from the
    // roster once recruited, so that is the only real release path). One
    // shared claim pool for both day-sleepers and resting defenders, so the
    // two can no longer double-book the same bed.
    claimBed: (villagerId) => {
      const st = get();
      const beds = st.buildings.filter((b) => b.type === 'bed' && isBuilt(b) && isHomeBuilding(b));
      const mine = beds.find((b) => b.owner === villagerId);
      if (mine) return { x: mine.x, z: mine.z };
      const free = beds.find((b) => !b.owner);
      if (free) {
        set({
          buildings: st.buildings.map((b) => (b.id === free.id ? { ...b, owner: villagerId } : b)),
          dirty: true,
        });
        return { x: free.x, z: free.z };
      }
      const v = st.villagers.find((x) => x.id === villagerId);
      return villagerHomeSpot(villagerId, v?.world ?? null, st.claimedWorlds);
    },

    // weapons are drawn from the shared Armory (2026-07-20 rework), same as
    // helmet/chestplate — a defender starts bare-handed and stays that way
    // until real stock is spent arming them. Switching loadouts refunds
    // whatever they were carrying back to the Armory before spending the new
    // requirement, so the same pieces just move between "in the Armory" and
    // "on a defender."
    setDefenderLoadout: (villagerId, loadout) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || v.job !== 'defender' || v.loadout === loadout) return;
      const need = LOADOUT_REQUIRES[loadout];
      for (const [id, n] of Object.entries(need)) {
        if ((st.armory[id as ItemId] ?? 0) < (n as number)) {
          st.notify(`Not enough in the Armory to arm ${v.name} that way.`);
          return;
        }
      }
      const armory = { ...st.armory };
      if (v.loadout) {
        for (const [id, n] of Object.entries(LOADOUT_REQUIRES[v.loadout])) {
          armory[id as ItemId] = (armory[id as ItemId] ?? 0) + (n as number);
        }
      }
      for (const [id, n] of Object.entries(need)) {
        armory[id as ItemId] = (armory[id as ItemId] ?? 0) - (n as number);
      }
      const villagers = st.villagers.map((x) => (x.id === villagerId ? { ...x, loadout } : x));
      set({ villagers, armory, dirty: true });
      const label = DEFENDER_LOADOUTS.find((d) => d.id === loadout)?.label ?? loadout;
      st.notify(`${v.name} is armed with ${label} from the Armory.`);
    },

    unequipDefenderLoadout: (villagerId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || !v.loadout) return;
      const armory = { ...st.armory };
      for (const [id, n] of Object.entries(LOADOUT_REQUIRES[v.loadout])) {
        armory[id as ItemId] = (armory[id as ItemId] ?? 0) + (n as number);
      }
      const villagers = st.villagers.map((x) => (x.id === villagerId ? { ...x, loadout: undefined } : x));
      set({ villagers, armory, dirty: true });
      st.notify(`${v.name} returns their weapon to the Armory — bare-handed for now.`);
    },

    // Wave 9 carriers — deliberately the loadout pair's shape, not
    // equipVillagerGear's: `gear.carrier` is ONE field holding a tier, so
    // going basket -> cart must hand the basket back to the Armory in the
    // same breath it takes the cart, or the upgrade would quietly destroy it.
    // Any job may wear one (carry capacity is a working stat, and a defender
    // who also hauls is perfectly reasonable).
    equipVillagerCarrier: (villagerId, tier) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || v.gear?.carrier === tier) return;
      const item = CARRIER_ITEM[tier];
      if ((st.armory[item] ?? 0) <= 0) {
        st.notify(`The Armory has no spare ${ITEMS[item]?.name.toLowerCase() ?? tier}.`);
        return;
      }
      const armory = { ...st.armory };
      if (v.gear?.carrier) {
        const old = CARRIER_ITEM[v.gear.carrier];
        armory[old] = (armory[old] ?? 0) + 1;
      }
      armory[item] = (armory[item] ?? 0) - 1;
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, carrier: tier } } : x));
      set({ villagers, armory, dirty: true });
      audio.play('brick_connect', 0.6);
      const def = CARRIERS.find((c) => c.id === tier);
      st.notify(`${v.name} takes up a ${def?.label ?? tier} — ${def?.blurb ?? 'they carry more'}.`);
    },

    unequipVillagerCarrier: (villagerId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v?.gear?.carrier) return;
      const item = CARRIER_ITEM[v.gear.carrier];
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, carrier: undefined } } : x));
      set({ villagers, armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 }, dirty: true });
      audio.play('brick_collide', 0.5);
      st.notify(`${v.name} returns the ${ITEMS[item]?.name.toLowerCase() ?? 'carrier'} to the Armory.`);
    },

    stationDefender: (villagerId, buildingId) => {
      const st = get();
      const villagers = st.villagers.map((v) => (v.id === villagerId ? { ...v, stationId: buildingId } : v));
      set({ villagers, dirty: true });
      const name = st.villagers.find((v) => v.id === villagerId)?.name ?? 'Villager';
      st.notify(buildingId ? `${name} takes up their post.` : `${name} patrols near the homestead.`);
    },

    // N80 · a per-defender day/night watch — see Villager.shift's own doc
    // comment for why absent means 'night' (the original blanket shift).
    setDefenderShift: (villagerId, shift) => {
      const st = get();
      const villagers = st.villagers.map((v) => (v.id === villagerId ? { ...v, shift } : v));
      set({ villagers, dirty: true });
      const name = st.villagers.find((v) => v.id === villagerId)?.name ?? 'Villager';
      st.notify(`${name} now stands the ${shift === 'day' ? 'day' : 'night'} watch.`);
    },

    gainDefenderXp: (villagerId, amount) => {
      const st = get();
      let leveledUp = false;
      let name = 'Villager';
      const villagers = st.villagers.map((v) => {
        if (v.id !== villagerId) return v;
        name = v.name;
        const xp = (v.xp ?? 0) + amount;
        const levelBefore = levelFromXp(v.xp ?? 0);
        const levelAfter = levelFromXp(xp);
        if (levelAfter > levelBefore) leveledUp = true;
        return { ...v, xp, level: levelAfter };
      });
      set({ villagers, dirty: true });
      if (leveledUp) st.notify(`${name} the Defender has grown stronger! (Lv ${levelFromXp(villagers.find((v) => v.id === villagerId)!.xp!)})`, true);
    },

    tickVillagers: (dt) => {
      const st = get();
      if (st.villagers.length === 0) return;
      // folk keep workaday hours (5 AM - 8 PM), not a 24/7 shift — labor and
      // construction simply pause overnight and resume at dawn from wherever
      // progress was left off. Defenders are unaffected (see the per-job
      // `continue` below; the night watch IS their job).
      if (!isWorkingHours(worldEnv.time)) return;
      const progress = { ...st.villagerProgress };
      const gains: Partial<Record<ItemId, number>> = {};
      let changed = false;
      const delivered: string[] = [];
      // Empire arc, Wave 3 (per-world labour): each distinct world present
      // in the roster gets its own buildings/stall/builder pass, scoped to
      // that world's own structures and residents — homestead-only in
      // effect today (every villager's `world` is still absent/null, so
      // this loop runs exactly once over `[null]`, byte-identical to the
      // old single flat pass), but the mechanism no longer assumes one
      // settlement. `checkVillagerArrival`'s generic-newcomer system stays
      // homestead-only on purpose — a settlement's own residents come from
      // its quest chain (Wave 4), not this arrival mechanic.
      const worlds = new Set(st.villagers.map((v) => v.world ?? null));
      for (const world of worlds) {
        const worldBuildings = st.buildings.filter((b) => (b.world ?? null) === world);
        const roster = st.villagers.filter((v) => (v.world ?? null) === world);
        const hasStall = worldBuildings.some((b) => b.type === 'market_stall' && isBuilt(b));
        // builder pass (Phase 19 build-then-construct): every assigned builder
        // chips away at the oldest construction site, ~25s per piece per builder
        // Steady Hands companion trait: that builder counts for 1.25
        const builderWeight = roster.reduce(
          (t, v) => (v.job === 'builder' ? t + (hasTrait(v, 'bui_steady') ? 1.25 : 1) : t), 0);
        if (builderWeight > 0) {
          const site = worldBuildings.find((b) => !isBuilt(b));
          // L66 · only builders STANDING AT the site do any building. The pass
          // used to credit every assigned builder wherever they happened to be,
          // so a villager still walking across the map — or parked at a
          // worksite a hundred metres off — raised the walls all the same.
          if (site) {
            const atSite = roster.reduce((t, v) => {
              if (v.job !== 'builder') return t;
              const m = villagerMobs[v.id];
              if (!m || Math.hypot(m.x - site.x, m.z - site.z) > WORK_RANGE) return t;
              return t + (hasTrait(v, 'bui_steady') ? 1.25 : 1);
            }, 0);
            if (atSite > 0) st.constructBuilding(site.id, dt * 0.04 * atSite);
          }
        }
        for (const v of roster) {
          if (v.job === 'idle') continue;
          if (v.job === 'defender') continue; // no passive delivery — Defenders.tsx drives them instead
          if (v.job === 'builder') continue;  // no delivery either — see the builder pass above
          if (v.job === 'merchant' && !hasStall) continue; // no stall, nothing to sell
          // §4/5.8b — once carrying is enabled (haul.ts's CARRYING_ENABLED),
          // an AI-driven villager's real yield comes from HaulToDeposit's own
          // addItems()+awardTradeXp() call instead; granting it again here on
          // the old per-trip timer would double-count. The old timer's own
          // progress simply freezes while workSignal is active, resuming
          // exactly where it left off once the AI stops driving this villager
          // (dusk, no reachable node, reassigned) — Phase 24B's own fallback
          // then picks the same villager back up seamlessly, unaffected.
          if (workSignals[v.id]?.active) continue;
          const jobDef = JOB_BY_ID[v.job];
          // Phase 24A: Diligence + trade mastery shorten the trip; Swift-family
          // companion traits shave another 12%. Hermit trade-off perk: +25% on
          // top — its own upside is the player's own gathering, doubled, in
          // harvestNode() above.
          const trip = jobDef.tripSeconds * tripSpeedMult(v) * tripTraitMult(v)
            * (st.perks.includes('hermit') ? 1.25 : 1);
          // L66 · the trip only runs down while they are actually somewhere
          // that counts: at their worksite, or back at the stores hauling. A
          // villager stuck on the far side of the map used to fill their sack
          // on the timer alone, which is why felling went on hundreds of metres
          // from the nearest tree.
          if (!villagerAtWork(v, st, worldBuildings)) continue;
          const left = (progress[v.id] ?? trip) - dt;
          if (left > 0) {
            progress[v.id] = left;
            changed = true;
            continue;
          }
          progress[v.id] = trip;
          // Phase 24A: Might rolls a double load, Wit pads a merchant's take,
          // Craft brings home side-goods (mirrors the player's own talents);
          // companion traits stack on top of all of it
          const attrs = attrsOf(v.id);
          let haul = jobDef.perTrip;
          if (Math.random() * 20 < attrs.might) haul *= 2;
          if (v.job === 'merchant') haul += Math.round(attrs.wit / 3) + (hasTrait(v, 'mer_silver') ? 2 : 0);
          const haulTrait = HAUL_TRAIT[v.job];
          if (haulTrait && hasTrait(v, haulTrait)) haul += 1;
          gains[jobDef.produces] = (gains[jobDef.produces] ?? 0) + haul;
          const side = SIDE_GOODS[jobDef.produces];
          const sideTrait = SIDE_TRAIT[v.job];
          const sideChance = attrs.craft * (sideTrait && hasTrait(v, sideTrait) ? 2 : 1);
          if (side && Math.random() * 25 < sideChance) gains[side] = (gains[side] ?? 0) + 1;
          // trade mastery: +10 xp per completed trip, kept per job — via the
          // same awardTradeXp() HaulToDeposit's own real completion calls
          // (5.8b), not a second, separately-maintained copy of this logic
          st.awardTradeXp(v.id, 10);
          delivered.push(v.name);
          changed = true;
        }
      }
      if (changed) set({ villagerProgress: progress, dirty: true });
      if (delivered.length) {
        const took = st.addItems(gains, 'gather');
        // cosmetic phrasing only, still homestead-specific by design (every
        // delivery is a home delivery today) — see this pass's own note on
        // `checkVillagerArrival` staying homestead-only for why a mixed
        // multi-world delivery batch isn't a real case yet.
        // Wave 9: stay quiet when a full store took none of it — addItems
        // has already said why, and "hauled supplies" over a refused load
        // would flatly contradict it.
        if (Object.keys(took).length) {
          const store = bestStore(st.buildings, isHomeBuilding);
          st.notify(`${delivered.join(', ')} hauled supplies to the ${store ? (BUILDABLE_BY_ID[store.type]?.name ?? 'stores').toLowerCase() : 'stores'}.`);
        }
      }
    },

    checkDeeds: () => {
      const st = get();
      const snapshot = {
        inventory: st.inventory as Partial<Record<string, number>>,
        xp: st.xp,
        completedQuests: st.completedQuests,
        buildings: st.buildings,
        treasureOpened: st.treasureOpened,
        dragonSeen: st.dragonSeen,
        dragonSieges: st.dragonSieges,
        dragonRouted: st.dragonRouted,
        cedricSieges: st.cedricSieges,
        cedricRouted: st.cedricRouted,
        defeatedCedric: st.defeatedCedric,
        reputation: st.reputation,
      };
      let earned = st.deeds;
      for (const d of DEEDS) {
        if (earned.includes(d.id)) continue;
        if (!d.check(snapshot)) continue;
        earned = [...earned, d.id];
        st.notify(`${d.icon} Deed accomplished: ${d.name}!`, true);
        audio.play('treasure', 0.7);
      }
      if (earned !== st.deeds) set({ deeds: earned, dirty: true });
      // account-level crest unlocks: derived from earned deeds + lifetime
      // crypt clears, so saves from before this shipped back-fill on the
      // first deed check. unlockCrest() is true only when newly won.
      for (const u of CREST_UNLOCKS) {
        const met = u.deedId
          ? earned.includes(u.deedId)
          : st.stats.dungeonsCleared >= (u.dungeonClears ?? 1);
        if (met && unlockCrest(u.crestId)) {
          st.notify(`🛡️ Crest unlocked: ${crestLabel(u.crestId)} — yours in the creator, for every hero to come!`, true);
          audio.play('treasure', 0.7);
        }
      }
    },

    tameFalcon: () => {
      const st = get();
      if (st.falconTamed) return;
      set({ falconTamed: true, dirty: true });
      audio.play('falcon', 0.8);
      st.notify('The falcon lands and stays — it will watch the land for you now.', true);
    },

    markDragonSeen: () => {
      if (get().dragonSeen) return;
      set({ dragonSeen: true, dirty: true });
    },

    recordDragonSiege: (routed) => {
      const st = get();
      set({
        dragonSieges: st.dragonSieges + 1,
        dragonRouted: st.dragonRouted || routed,
        dirty: true,
      });
      get().checkDeeds();
    },

    recordCedricSiege: (routed) => {
      const st = get();
      set({
        cedricSieges: st.cedricSieges + 1,
        cedricRouted: st.cedricRouted || routed,
        dirty: true,
      });
      get().checkDeeds();
    },

    checkChallenges: () => {
      const st = get();
      let tiers = st.challengeTiers;
      for (const c of CHALLENGES) {
        const { tierIndex } = challengeProgress(c, st.stats);
        const known = tiers[c.id] ?? -1;
        if (tierIndex <= known) continue;
        // notify once per tier crossed in case several were skipped between checks
        for (let i = known + 1; i <= tierIndex; i++) {
          st.notify(`${c.icon} Challenge: ${c.tiers[i].label}!`, true);
        }
        tiers = { ...tiers, [c.id]: tierIndex };
        audio.play('treasure', 0.7);
      }
      if (tiers !== st.challengeTiers) set({ challengeTiers: tiers, dirty: true });
    },

    enterInterior: (buildingId) => {
      const st = get();
      if (st.interior) return;
      const b = st.buildings.find((bb) => bb.id === buildingId);
      const def = b ? INTERIORS[b.type] : null;
      if (!b || !def) return;
      set({ interior: buildingId, enteredInteriorPos: [b.x, b.z], panel: 'none' });
      playerState.pendingTeleport = enterSpawnFor(def, pocketFor(b.type, b.id));
      audio.play('door_open', 0.7);
      st.notify(`You step into ${def.name}.`, true);
    },

    exitInterior: () => {
      const st = get();
      if (!st.interior) return;
      const pos = st.enteredInteriorPos ?? [0, 20];
      set({ interior: null, enteredInteriorPos: null });
      playerState.pendingTeleport = { x: pos[0], z: pos[1] + 6, yaw: 0 };
      audio.play('door_open', 0.7);
    },

    openTreasureChest: () => {
      const st = get();
      if (st.treasureOpened) {
        audio.play('treasure', 0.6);
        st.notify('The chest sits empty — you already claimed its prize.');
        return;
      }
      set({ treasureOpened: true, dirty: true });
      st.addItems({ gold: 30 }, 'grant');
      audio.play('treasure', 0.9);
      st.notify('You found 30 gold in the royal treasure chest!', true);
    },

    setTimeOfDay: (timeOfDay) => set({ timeOfDay, dirty: true }),
    setDayCount: (dayCount) => set({ dayCount, dirty: true }),
    setSeason: (season) => set({ season }),
    sleep: () => {
      worldEnv.time = 0.27; // just before sunrise
      set({ timeOfDay: 0.27, dirty: true });
      audio.play('bird1', 0.5);
      get().notify('You sleep soundly and wake at dawn.', true);
    },
    markSaved: () => set({ dirty: false }),
    setPrompt: (prompt) => {
      if (get().prompt !== prompt) set({ prompt });
    },
    setActiveInputDevice: (activeInputDevice) => {
      if (get().activeInputDevice !== activeInputDevice) set({ activeInputDevice });
    },
    setActionProgress: (actionProgress) => set({ actionProgress }),
    setNearStations: (s) => {
      const cur = get().nearStations;
      if (cur.length !== s.length || cur.some((v, i) => v !== s[i])) set({ nearStations: s });
    },

    notify: (text, gold) => {
      const id = notifSeq++;
      set({ notifications: [...get().notifications, { id, text, gold }].slice(-5) });
      setTimeout(() => {
        set({ notifications: get().notifications.filter((n) => n.id !== id) });
      }, 4200);
    },

    // Wave 9 · the one inventory-mutation entry point in the game, and so the
    // only place storage capacity has to be enforced (game/storage.ts holds
    // the design reasoning). Returns what was ACTUALLY accepted, so a caller
    // that announces its haul ("You got 3× Wood Log!") can announce the truth
    // instead of what it hoped for. Every pre-Wave-9 call site ignores the
    // return value and behaves exactly as before.
    //
    // The cap binds `source: 'gather'` ONLY — the player's own harvest, a
    // villager's delivery, and the AI's HaulToDeposit. A 'grant' (quest
    // reward, dungeon/crypt loot, the royal chest, a sale's gold) is a gift
    // that arrives once and cannot be re-earned, so turning one away would be
    // destroying content, not squeezing an economy. Same principle the craft
    // action follows for its own direct write: the cap governs what the world
    // YIELDS you, not what you are given or what your own hands convert.
    addItems: (items, source = 'grant') => {
      const st = get();
      const inv = { ...st.inventory };
      const capped = source === 'gather';
      const accepted: Partial<Record<ItemId, number>> = {};
      const refused: Partial<Record<ItemId, number>> = {};
      for (const [rawId, rawN] of Object.entries(items)) {
        const id = rawId as ItemId;
        const n = rawN as number;
        const have = inv[id] ?? 0;
        // spending is never blocked, and an uncapped item (gold, tools,
        // weapons, potions) short-circuits to the old unconditional path
        const take = capped && n > 0 ? Math.min(n, roomFor(id, have, st.buildings)) : n;
        if (take < n) refused[id] = n - take;
        if (take !== 0) {
          inv[id] = have + take;
          accepted[id] = take;
        }
      }
      const goldGained = accepted.gold ?? 0;
      let gathered = 0;
      if (source === 'gather') {
        for (const n of Object.values(accepted)) gathered += n as number;
      }
      // Bugfix (2026-08-14, found by Wave 13's verify pass): commit THIS
      // call's own inventory/stats BEFORE bumping quest counters below, not
      // after. bumpQuestCounters can synchronously complete a main quest —
      // every main quest carries grantItems now — and completeQuest() makes
      // its own NESTED st.addItems(grantItems, 'grant') call for the gold
      // reward. That nested call reads a fresh get().inventory and commits
      // its own set() immediately. If OUR set() ran after (as it used to),
      // our snapshot taken before the nested call would overwrite the
      // store's inventory right back over what the nested call just
      // committed — silently discarding the quest's gold every time the
      // LAST objective a gather completed was itself the quest's final
      // objective (guaranteed on first_steps, the game's first quest).
      // Setting first means the nested call always layers its own grant on
      // top of what we just wrote, instead of racing it.
      set({
        inventory: inv,
        stats: {
          ...st.stats,
          resourcesGathered: st.stats.resourcesGathered + gathered,
          goldEarnedLifetime: st.stats.goldEarnedLifetime + goldGained,
        },
        dirty: true,
      });
      if (source === 'gather') {
        for (const [id, n] of Object.entries(accepted)) {
          // quest counters track what reached the stores, not what was
          // swung at — an objective must not tick on a log that was turned
          // away at a full storehouse
          bumpQuestCounters('gather', id, n as number);
        }
      }
      // Refusal is LOUD (silently eating a haul is indistinguishable from a
      // bug) but throttled — a full store refuses on every villager trip and
      // every axe swing, and five identical toasts is its own kind of noise.
      const refusedIds = Object.keys(refused) as ItemId[];
      if (refusedIds.length) {
        const nowMs = Date.now();
        if (nowMs - lastFullStoreNotifyAt > FULL_STORE_NOTIFY_MS) {
          lastFullStoreNotifyAt = nowMs;
          const names = refusedIds.map((id) => ITEMS[id]?.name ?? id).join(', ');
          st.notify(`📦 Your stores are full — ${names} turned away. Build a Stockpile or Storehouse, or spend what you have.`);
        }
      }
      return accepted;
    },

    flushStats: (delta) => {
      const st = get();
      set({
        stats: {
          ...st.stats,
          distanceMeters: st.stats.distanceMeters + delta.distanceMeters,
          playtimeSec: st.stats.playtimeSec + delta.playtimeSec,
        },
        dirty: true,
      });
    },

    recordDungeonClear: () => {
      const st = get();
      set({ stats: { ...st.stats, dungeonsCleared: st.stats.dungeonsCleared + 1 }, dirty: true });
      get().checkDeeds(); // crest loot rides on lifetime clears
    },

    addXp: (skill, amount) => {
      const st = get();
      let scaled = st.perks.includes('quick_study') ? Math.round(amount * 1.1) : amount;
      // tier-1 talents (Phase 21): +10% XP in that talent's own skill
      if (st.skillTree.includes(`${skill}1`)) scaled = Math.round(scaled * 1.1);
      // calling signature skill (Phase 22): the trade you were raised in
      if (CLASS_BY_ID[st.character?.classId ?? '']?.signature === skill) scaled = Math.round(scaled * 1.1);
      const before = st.xp[skill];
      // I43 · XP scaling. Awards were FLAT — a skeleton paid 20 combat XP at
      // level 1 and at level 20 — while the curve is quadratic (50·L²), so
      // the gap between levels grows by 50(2L+1) every level. Constant
      // awards against a widening gap is what made early levels fly past and
      // later ones stall out.
      //
      // Scaling the award linearly with the skill's own level matches the
      // shape of the curve exactly, so a level costs roughly the same NUMBER
      // OF ACTIONS all the way up. This deliberately does not touch
      // xpForLevel/levelFromXp: changing the curve would re-rank every
      // existing save overnight.
      scaled = Math.round(scaled * (1 + levelFromXp(before) * 0.12));
      const xp = { ...st.xp, [skill]: before + scaled };
      const totalBefore = totalSkillLevel(st.xp);
      set({ xp, dirty: true });
      const lvBefore = levelFromXp(before);
      const lvAfter = levelFromXp(before + scaled);
      if (lvAfter > lvBefore) {
        st.notify(`${skill.charAt(0).toUpperCase() + skill.slice(1)} level ${lvAfter}!`, true);
        const totalAfter = totalSkillLevel(xp);
        const rBefore = rankFromTotalLevel(totalBefore, st.completedQuests);
        const rAfter = rankFromTotalLevel(totalAfter, st.completedQuests);
        if (rAfter.name !== rBefore.name) {
          // a perk pick awaits whenever earned slots outrun taken perks —
          // surfaced in the Abilities panel (K) rather than a forced modal,
          // so the player can defer it instead of choosing on the spot
          const offerPerk = () => {
            if (get().perks.length < perkSlotsEarned(get().xp, get().completedQuests)) {
              st.notify('A new strength awaits — check your Abilities (K).', true);
            }
          };
          if (rAfter.name === 'Knight' || rAfter.name === 'Paladin') {
            st.beginCeremony(rAfter.name);
            setTimeout(offerPerk, 5300); // after the ceremony's own sequence finishes
          } else {
            audio.play('horn', 0.8);
            st.notify(`You are now a ${rAfter.name} — ${rAfter.title}!`, true);
            offerPerk();
          }
        }
      }
    },

    harvestNode: (nodeId) => {
      const st = get();
      const node = st.nodes.find((n) => n.id === nodeId);
      if (!node || node.respawnAt) return;
      if (node.kind === 'fishing') {
        // one bite, one fish — already a single chunky action, unaffected
        // by the multi-hit drip fix below
        let fish = st.skillTree.includes('fishing3') && Math.random() < 0.15 ? 2 : 1;
        if (st.perks.includes('hermit')) fish *= 2; // Hermit trade-off perk
        // Wave 9 · report what the stores actually took, not what was on the
        // hook — a "You got 2 fish!" over a full store is indistinguishable
        // from a bug. addItems raises its own "stores are full" toast.
        const got = st.addItems({ fish }, 'gather').fish ?? 0;
        st.addXp('fishing', 14);
        st.useTool('fishing_rod');
        audio.play('treasure', 0.6);
        if (got > 0) st.notify(`🐟 You got ${got} fish!`);
      } else {
        // one harvest action now empties the WHOLE node at once — rolls the
        // exact same per-hit odds/bonuses as before, `node.hitsLeft` times,
        // but batches them into a single grant + a single "you got X" notify
        // instead of requiring several separate E-holds each with their own
        // tiny +1 pickup ("spamming multiple items", per user report)
        const hits = node.hitsLeft;
        const totals: Partial<Record<ItemId, number>> = {};
        let xpTotal = 0;
        let xpSkill: SkillId = 'woodcutting';
        for (let i = 0; i < hits; i++) {
          if (node.kind === 'tree') {
            xpSkill = 'woodcutting';
            // Woodsmen's Lodge passive + Deep Rings talent: each an
            // independent extra-log chance; Forest Bounty doubles flowers
            const extraChance = (st.guild === 'woodsmen' ? 0.2 : 0) + (st.skillTree.includes('woodcutting2') ? 0.15 : 0)
              + (st.attrSpent.diligence ?? 0) * 0.04; // Diligence attribute
            totals.wood = (totals.wood ?? 0) + (Math.random() < extraChance ? 2 : 1);
            const flowerChance = st.skillTree.includes('woodcutting3') ? 0.36 : 0.18;
            if (Math.random() < flowerChance) totals.flowers = (totals.flowers ?? 0) + 1;
            xpTotal += 10;
            st.useTool('axe');
          } else if (node.kind === 'rock') {
            xpSkill = 'mining';
            if (node.variant === 'iron') {
              // Vein Splitter talent: bonus stone from veins twice as often
              const veinBonus = (st.skillTree.includes('mining3') ? 0.6 : 0.3) + (st.attrSpent.diligence ?? 0) * 0.04;
              totals.iron_ore = (totals.iron_ore ?? 0) + 1;
              if (Math.random() < veinBonus) totals.stone = (totals.stone ?? 0) + 1;
              xpTotal += 16;
            } else {
              const mining = st.unlocks.includes('mining');
              // Miners' Brotherhood passive + Ore Eye talent stack additively
              const oreChance = (st.guild === 'miners' ? 0.65 : 0.4) + (st.skillTree.includes('mining2') ? 0.15 : 0);
              totals.stone = (totals.stone ?? 0) + 1;
              if (mining && Math.random() < oreChance) totals.iron_ore = (totals.iron_ore ?? 0) + 1;
              xpTotal += 12;
            }
            st.useTool('pickaxe');
          } else if (node.kind === 'herb') {
            xpSkill = 'farming';
            totals.herb = (totals.herb ?? 0) + 1;
            xpTotal += 8;
          }
        }
        // Hermit trade-off perk: everything the player personally gathers
        // is doubled (its own downside lives in tickVillagers' own trip
        // duration below) — after the per-kind rolls above, not baked into
        // any one of them, so it applies uniformly across tree/rock/herb
        if (st.perks.includes('hermit')) {
          for (const k of Object.keys(totals) as ItemId[]) totals[k] = (totals[k] ?? 0) * 2;
        }
        // Wave 9 · the node is still fully spent (the swing happened either
        // way — the wasted yield IS the cost of letting your stores overflow),
        // but the notification below reports what the stores took, not what
        // the tree held. addItems raises its own "stores are full" toast.
        const got = st.addItems(totals, 'gather');
        st.addXp(xpSkill, xpTotal);
        audio.play(node.kind === 'tree' ? 'thud' : node.kind === 'rock' ? 'brick_collide' : 'villager', node.kind === 'herb' ? 0.4 : 0.8);
        // J45 · what you pick up is a PIECE, and it is named as one — you
        // did not gather "3 stone", you gathered three 2x2 stone bricks
        const label = Object.entries(got)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([id, n]) => `${n}× ${brickLabel(id as ItemId, ITEMS[id as ItemId]?.name ?? id)}`)
          .join(', ');
        if (label) st.notify(`You got ${label}!`);
      }
      // read stats fresh (not the `st` snapshot from the top of this action) —
      // the addItems() call above already wrote its own stats update via its
      // own set(), so merging from the stale `st.stats` here would clobber it
      const freshStats = get().stats;
      const harvested = { ...freshStats.nodesHarvested };
      harvested[node.kind] = (harvested[node.kind] ?? 0) + 1;
      const patch: Partial<GameState> = { stats: { ...freshStats, nodesHarvested: harvested } };
      if (node.kind !== 'fishing') {
        // the node is always fully spent in one action now — no partial
        // hitsLeft state to carry between harvests
        patch.nodes = st.nodes.map((n) =>
          n.id === nodeId ? { ...n, hitsLeft: 0, respawnAt: Date.now() + 35000 } : n,
        );
      }
      set(patch);
    },

    gatherSwing: (nodeId) => {
      const st = get();
      const node = st.nodes.find((n) => n.id === nodeId);
      if (!node || node.respawnAt !== null || node.hitsLeft <= 0) return null;
      const item: ItemId =
        node.kind === 'tree' ? 'wood' : node.kind === 'rock' ? 'stone' : node.kind === 'herb' ? 'herb' : 'fish';
      const hitsLeft = node.hitsLeft - 1;
      // fishing spots never deplete (harvestNode's own fishing branch skips
      // this too — "one bite, one fish", the node stays available)
      const depleted = hitsLeft <= 0 && node.kind !== 'fishing';
      set({
        nodes: st.nodes.map((n) =>
          n.id === nodeId ? { ...n, hitsLeft, respawnAt: depleted ? Date.now() + 35000 : n.respawnAt } : n,
        ),
      });
      return { item, amount: 1 };
    },

    tendPlot: (buildingId) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === buildingId);
      if (!b || b.type !== 'farmplot' || !isBuilt(b)) return null;
      const left = st.plots[buildingId];
      if (left === undefined) {
        // untilled -> sown. Same growth timer the player's own plantPlot
        // computes (perk + Rich Soil talent): the farm's soil is the farm's
        // soil, whoever pushed the seed into it. Deliberately quiet — no
        // notify, no sound: a villager doing their job all day should not
        // narrate every furrow, unlike the player's own deliberate action.
        let growTime = st.perks.includes('green_thumb') ? GROW_TIME * 0.85 : GROW_TIME;
        if (st.skillTree.includes('farming2')) growTime *= 0.88;
        set({ plots: { ...st.plots, [buildingId]: growTime }, dirty: true });
        return 'planted';
      }
      if (left > 0) return null; // still growing — nothing a farmer can do but wait
      const plots = { ...st.plots };
      delete plots[buildingId]; // back to untilled, exactly as harvestPlot leaves it
      set({ plots, dirty: true });
      // same yield as the player's own harvest (Heavy Sheaves included) — but
      // NOT addXp('farming'): that is the player's own skill, and a villager
      // swinging the sickle must not level it. Their equivalent, trade
      // mastery, is granted by the completed HAUL (awardTradeXp in haul.ts),
      // which is where every other trade earns it too.
      const sheaves = st.skillTree.includes('farming3') ? 1 : 0;
      return { item: 'wheat' as ItemId, amount: 2 + sheaves + (Math.random() < 0.35 ? 1 : 0) };
    },

    awardTradeXp: (villagerId, amount) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || v.job === 'idle') return;
      const lvlBefore = tradeLevelOf(v, v.job);
      const nv: Villager = { ...v, tradeXp: { ...(v.tradeXp ?? {}), [v.job]: tradeXpOf(v, v.job) + amount } };
      set({ villagers: st.villagers.map((x) => (x.id === villagerId ? nv : x)), dirty: true });
      if (tradeLevelOf(nv, v.job) > lvlBefore) {
        const jobDef = JOB_BY_ID[v.job];
        st.notify(`⭐ ${v.name} the ${jobDef.label} (Lv ${tradeLevelOf(nv, v.job)}) has mastered more of their trade!`, true);
      }
    },

    tickRespawns: () => {
      const now = Date.now();
      const st = get();
      if (!st.nodes.some((n) => n.respawnAt && n.respawnAt < now)) return;
      set({
        nodes: st.nodes.map((n) =>
          n.respawnAt && n.respawnAt < now
            ? { ...n, respawnAt: null, hitsLeft: n.kind === 'tree' ? 3 : n.kind === 'herb' ? 1 + Math.floor(Math.random() * 10) : 4 }
            : n,
        ),
      });
    },

    canAfford: (cost) => {
      const inv = get().inventory;
      return Object.entries(cost).every(([id, n]) => (inv[id as ItemId] ?? 0) >= (n as number));
    },

    craft: (recipeId) => {
      const st = get();
      const recipe = RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return false;
      if (recipe.requiresUnlock && !st.unlocks.includes(recipe.requiresUnlock)) return false;
      if (!st.canAfford(recipe.cost)) return false;
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(recipe.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      // Craft attribute: +4% per point that the work turns out a double batch
      const doubled = Math.random() < (st.attrSpent.craft ?? 0) * 0.04;
      const made = recipe.outputCount * (doubled ? 2 : 1);
      // Wave 9 · this writes `inv` directly rather than through addItems, so
      // it deliberately bypasses the storage cap — do NOT "fix" that. The
      // ingredients are already spent two lines above, so a refused output
      // would destroy them outright; and a craft is a CONVERSION of goods you
      // already stored, not a new haul off the land, so it can only ever nudge
      // one good over the line while pulling others down. The cap governs what
      // the world yields you, not what your own hands turn it into.
      inv[recipe.output] = (inv[recipe.output] ?? 0) + made;
      set({
        inventory: inv,
        stats: { ...st.stats, itemsCrafted: st.stats.itemsCrafted + made },
        dirty: true,
      });
      if (recipe.skill && recipe.skillXp) st.addXp(recipe.skill, recipe.skillXp);
      audio.play(recipe.station === 'forge' ? 'flame' : 'brick_connect', 0.7);
      st.notify(doubled ? `Crafted ${recipe.name} — a double batch, masterwork hands!` : `Crafted ${recipe.name}`);
      bumpQuestCounters('craft', recipe.id, recipe.outputCount);
      return true;
    },

    evalPlacement: (type, x, z, rot, ignoreId) => {
      const st = get();
      const def = BUILDABLE_BY_ID[type];
      if (!def) return { y: 0, valid: false };
      const [sx, sz] = sizeFor(type, rot);
      const hx = sx / 2;
      const hz = sz / 2;
      const h = def.size[1];
      const invalid = { y: 0, valid: false };
      const region = activeBuildRegion(st.destination ? st.claimedWorlds[st.destination] : null, st.landTier);
      if (x - hx < region.minX || x + hx > region.maxX) return invalid;
      if (z - hz < region.minZ || z + hz > region.maxZ) return invalid;
      // Wave 12 · nothing stands in the player's own water. A plain footprint
      // test rather than a nav-grid question: placement is asked about this one
      // rectangle, live, long before the 1Hz rebuild has seen a fresh cut. Home
      // only, because that is the only place a waterway can be cut at all.
      // (A bridge piece that could legitimately span one is the obvious
      // follow-up; there isn't one yet, which is also why terrainConflict
      // refuses to cut the road.)
      if (!st.destination && waterworksInRect({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz }).length > 0) {
        return invalid;
      }

      const overlapsXZ = (b: PlacedBuilding) => {
        const [bsx, bsz] = sizeFor(b.type, b.rot);
        return Math.abs(b.x - x) < hx + bsx / 2 - 0.02 && Math.abs(b.z - z) < hz + bsz / 2 - 0.02;
      };

      // stacking: rest on the tallest overlapped piece (stackable pieces only) —
      // starts from the plot's leveled ground height away from home, instead
      // of always assuming a flat y=0 base
      let y = region.groundY;
      if (def.stackable) {
        for (const b of st.buildings) {
          if (b.id === ignoreId) continue;
          if (!isBuilt(b)) continue; // can't stack on a construction-site ghost
          if (!BUILDABLE_BY_ID[b.type]?.stackable) continue;
          if (overlapsXZ(b)) y = Math.max(y, topOf(b));
        }
      }
      if (y - region.groundY + h > MAX_STACK_HEIGHT) return invalid;

      // 3D overlap check against everything
      for (const b of st.buildings) {
        if (b.id === ignoreId) continue;
        if (!overlapsXZ(b)) continue;
        const by = b.y ?? 0;
        if (y < topOf(b) - 0.02 && y + h > by + 0.02) return invalid;
      }
      // ground pieces keep clear of resource nodes near the region edge
      if (y < region.groundY + 0.5) {
        for (const n of st.nodes) {
          if (n.kind === 'fishing') continue;
          if (Math.abs(n.x - x) < hx + 1.2 && Math.abs(n.z - z) < hz + 1.2) return invalid;
        }
      }
      return { y, valid: true };
    },

    placeBuilding: (type, x, z, rot, yaw) => {
      const st = get();
      const b = BUILDABLE_BY_ID[type];
      if (!b) return false;
      if (b.requiresUnlock && !st.unlocks.includes(b.requiresUnlock)) return false;
      if (!st.canAfford(b.cost)) {
        st.notify('Not enough materials!');
        audio.play('brick_collide', 0.5);
        return false;
      }
      const { y, valid } = st.evalPlacement(type, x, z, rot);
      if (!valid) {
        audio.play('brick_collide', 0.5);
        return false;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(b.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      // J51 · the Grand Keep is no longer a mesh you drop. Placing it lays
      // the FOUNDATION, and the castle on top of it is composed socket by
      // socket (game/data/keep.ts) — so this one buildable branches out of
      // the ordinary placement path here.
      if (type === 'keep') {
        if (st.keep) {
          st.notify('You have already laid a foundation.');
          return false;
        }
        set({ inventory: inv });
        get().foundKeep(x, z);
        return true;
      }
      // Phase 19 build-then-construct: placement marks the site (materials
      // delivered, ghost outline shown) — XP/stats/quest credit move to
      // constructBuilding's completion, when the thing actually stands.
      const placed: PlacedBuilding = { id: `b${buildSeq++}`, type, x, z, y, rot, built: 0, world: st.destination ?? null };
      // Wave 9 freeform: only carry a `yaw` when it is genuinely off the
      // lattice, so a snapped piece's record is byte-for-byte what it always
      // was and no save grows a field it does not need
      if (yaw !== undefined && Math.abs(yaw - (rot * Math.PI) / 2) > 1e-4) placed.yaw = yaw;
      placeHistory = [...placeHistory.slice(-24), [placed.id]];
      set({ inventory: inv, buildings: [...st.buildings, placed], dirty: true });
      audio.play('brick_link', 0.6);
      return true;
    },

    placeRow: (type, cells, rot) => {
      const st = get();
      const def = BUILDABLE_BY_ID[type];
      if (!def || cells.length === 0) return 0;
      // the Grand Keep branches out of the ordinary placement path entirely
      // (foundKeep lays a foundation, not a mesh) and there is only ever one —
      // a "run" of them is not a thing that can exist
      if (type === 'keep') return 0;
      if (def.requiresUnlock && !st.unlocks.includes(def.requiresUnlock)) return 0;
      const inv = { ...st.inventory };
      const placed: PlacedBuilding[] = [];
      const world = st.destination ?? null;
      const afford = () => Object.entries(def.cost).every(
        ([id, n]) => (inv[id as ItemId] ?? 0) >= (n as number),
      );
      for (const cell of cells) {
        if (!afford()) break;
        // re-offer every step to the wall-connect magnet against the CURRENT
        // run (the pieces this loop already laid included), so filling a gap
        // between two standing walls lands flush on both ends instead of
        // marching off the stepped ideal by whatever the neighbours' widths
        // did not divide into
        const standing = [...st.buildings, ...placed];
        const link = wallSnap(type, rot, cell.x, cell.z, standing, world);
        const x = link ? link.x : cell.x;
        const z = link ? link.z : cell.z;
        // evalPlacement only knows the committed store, so the run's own
        // freshly-laid segments have to be checked here by hand — otherwise
        // every step after the first would happily place on top of the last
        const [sx, sz] = sizeFor(type, rot);
        const clashes = placed.some((p) => {
          const [psx, psz] = sizeFor(p.type, p.rot);
          return Math.abs(p.x - x) < sx / 2 + psx / 2 - 0.02 && Math.abs(p.z - z) < sz / 2 + psz / 2 - 0.02;
        });
        if (clashes) break;
        const ev = st.evalPlacement(type, x, z, rot);
        if (!ev.valid) break;
        for (const [id, n] of Object.entries(def.cost)) {
          inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
        }
        placed.push({ id: `b${buildSeq++}`, type, x, z, y: ev.y, rot, built: 0, world });
      }
      if (placed.length === 0) {
        audio.play('brick_collide', 0.5);
        // Wave 9 fix (2026-08-10, live verification) · a run that lays
        // NOTHING used to be silent — only the partial/full cases below ever
        // called notify(). The most common real cause (confirmed live) is the
        // first cell overlapping a piece from a run laid moments earlier that
        // hasn't finished construction yet: evalPlacement correctly refuses to
        // stack on an unbuilt piece, but with no words that reads as the tool
        // being broken rather than the rule doing its job.
        st.notify('Nothing to lay there — out of reach, blocked, or not enough materials.');
        return 0;
      }
      // ONE undo entry for the whole run — a gesture that laid twelve walls in
      // one drag should come back up the same way (see placeHistory above)
      placeHistory = [...placeHistory.slice(-24), placed.map((p) => p.id)];
      set({ inventory: inv, buildings: [...st.buildings, ...placed], dirty: true });
      audio.play('brick_link', 0.7);
      if (placed.length < cells.length) {
        st.notify(`Run laid: ${placed.length} of ${cells.length} — the rest would not fit or was not paid for.`);
      } else {
        st.notify(`Run laid: ${placed.length} × ${def.name}`);
      }
      return placed.length;
    },

    // ---- J51 · the composed keep -------------------------------------
    openKeepSocket: (socketId) => set({ keepSocket: socketId, panel: 'keepSocket' }),

    openBuildingMenu: (id) => set({ menuBuilding: id, panel: 'buildingMenu' }),

    // ---- M · the assembly workshop ------------------------------------
    startSet: (setNum) => {
      const st = get();
      if (!SET_PLANS[setNum]) return;
      if (st.builtSets.includes(setNum)) {
        st.notify(`You have already built the ${SET_PLANS[setNum].name}.`);
        return;
      }
      set({ workshop: { setNum, step: 0 }, panel: 'none', dirty: true });
      audio.play('brick_link', 0.7);
      st.notify(`${SET_PLANS[setNum].name} laid out on the bench — set the first piece.`, true);
    },

    clearBench: () => set({ workshop: null, dirty: true }),

    placeSetPart: () => {
      const st = get();
      const w = st.workshop;
      if (!w) return false;
      const total = setStepCount(w.setNum);
      if (w.step >= total) return false;
      const at = locateStep(w.setNum, w.step);
      const plan = SET_PLANS[w.setNum];
      const part = at ? plan.modules[at.module].steps[at.step] : null;
      // a step costs bricks out of the parts bin, priced off the part's own
      // size — a base plate is a handful, a stud is one
      const cost = partCost(part?.vol ?? 0.02);
      if (!st.canAfford(cost)) {
        st.notify(`That piece needs ${Object.entries(cost).map(([k, n]) => `${n} ${ITEMS[k as ItemId]?.name ?? k}`).join(', ')}.`);
        audio.play('brick_collide', 0.4);
        return false;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(cost)) inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      const step = w.step + 1;
      const done = step >= total;
      set({
        inventory: inv,
        workshop: done ? null : { setNum: w.setNum, step },
        builtSets: done ? [...st.builtSets, w.setNum] : st.builtSets,
        dirty: true,
      });
      audio.play('brick_link', 0.5);
      st.addXp('building', 4);
      if (done) {
        audio.play('treasure', 0.9);
        st.notify(`${plan.name} complete — the set is yours, and its pieces are unlocked in the build menu.`, true);
      } else if (step % 10 === 0) {
        st.notify(`${plan.name}: ${step} of ${total} pieces set.`);
      }
      return true;
    },

    // L72 · a charge mounted ON a wall piece. It is placed as a real building
    // sitting on top of the wall — which means the proximity-armed
    // Emplacements pass already knows what to do with it, and the wall it
    // stands on is what it takes with it when it goes.
    mountCharge: (buildingId, chargeType) => {
      const st = get();
      const wall = st.buildings.find((b) => b.id === buildingId);
      const def = BUILDABLE_BY_ID[chargeType];
      if (!wall || !def) return;
      if (BUILDABLE_BY_ID[wall.type]?.category !== 'walls') {
        st.notify('A charge needs a wall to sit on.');
        return;
      }
      if (!st.canAfford(def.cost)) {
        st.notify(`Not enough materials for a ${def.name}.`);
        audio.play('brick_collide', 0.5);
        return;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(def.cost)) {
        inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      }
      const charge: PlacedBuilding = {
        id: `b${buildSeq++}`,
        type: chargeType,
        x: wall.x, z: wall.z,
        y: (wall.y ?? 0) + heightOf(wall.type),
        rot: wall.rot, built: 1,
        world: st.destination ?? null,
      };
      set({ inventory: inv, buildings: [...st.buildings, charge], panel: 'none', menuBuilding: null, dirty: true });
      audio.play('brick_link', 0.8);
      st.notify(`${def.name} mounted on the wall — it arms itself when a raider comes close.`, true);
    },

    foundKeep: (x, z) => {
      const st = get();
      if (st.keep) { st.notify('Your foundation is already laid.'); return; }
      // a real PlacedBuilding, `type: 'keep'`, alongside the socket-tracking
      // `st.keep` state — a genuinely pre-existing gap found generalising the
      // interior system: nothing ever added one, so the interact-detection
      // loop's own `b.type === 'keep'` check (PlayerController.tsx) could
      // never actually match anything, and "Enter the Keep" was unreachable
      // regardless of this refactor. Built immediately — the FOUNDATION reads
      // as already laid the moment it's placed; the individual socket pieces
      // on top keep their own separate construction time (workKeepPart).
      const placed: PlacedBuilding = { id: `b${buildSeq++}`, type: 'keep', x, z, y: 0, rot: 0, built: 1, world: null };
      set({ keep: { x, z, parts: {}, built: {} }, buildings: [...st.buildings, placed], dirty: true });
      audio.play('brick_link', 0.8);
      st.notify('Foundation laid. Choose a corner and raise something on it.', true);
    },

    raiseKeepPart: (socketId, partId) => {
      const st = get();
      const keep = st.keep;
      const socket = SOCKET_BY_ID[socketId];
      const part = KEEP_PART_BY_ID[partId];
      if (!keep || !socket || !part) return;
      if (!part.fits.includes(socket.kind)) {
        st.notify(`A ${part.name.toLowerCase()} will not stand on ${socket.name.toLowerCase()}.`);
        return;
      }
      if (keep.parts[socketId]) { st.notify(`${socket.name} is already taken.`); return; }
      // the bill of pieces has to be in the parts bin, same as any build
      for (const [item, n] of Object.entries(part.cost)) {
        if ((st.inventory[item as ItemId] ?? 0) < (n ?? 0)) {
          st.notify(`Not enough ${ITEMS[item as ItemId]?.name ?? item} for a ${part.name}.`);
          return;
        }
      }
      const inv = { ...st.inventory };
      for (const [item, n] of Object.entries(part.cost)) {
        inv[item as ItemId] = (inv[item as ItemId] ?? 0) - (n ?? 0);
      }
      set({
        inventory: inv,
        keep: { ...keep, parts: { ...keep.parts, [socketId]: partId }, built: { ...keep.built, [socketId]: 0 } },
        dirty: true,
      });
      audio.play('brick_link', 0.7);
      st.notify(`${part.name} staked out on ${socket.name} — now build it.`, true);
    },

    workKeepPart: (socketId, amount) => {
      const st = get();
      const keep = st.keep;
      if (!keep || !keep.parts[socketId]) return;
      const before = keep.built[socketId] ?? 0;
      if (before >= 1) return;
      const after = Math.min(1, before + amount);
      const next: KeepState = { ...keep, built: { ...keep.built, [socketId]: after } };
      set({ keep: next, dirty: true });
      if (after >= 1) {
        const part = KEEP_PART_BY_ID[keep.parts[socketId]];
        st.addXp('building', part?.buildXp ?? 30);
        audio.play('brick_link', 0.9);
        st.notify(`${part?.name ?? 'Piece'} raised. ${KEEP_SOCKETS.length - Object.values(next.built).filter((v) => v >= 1).length} to go.`, true);
        if (keepComplete(next)) {
          st.notify('Your castle stands complete.', true);
          audio.play('treasure', 0.9);
        }
      }
    },

    damageKeepPart: (socketId, amount, cause) => {
      const st = get();
      const keep = st.keep;
      if (!keep) return;
      const partId = keep.parts[socketId];
      const part = partId ? KEEP_PART_BY_ID[partId] : null;
      // only a finished piece can be sieged — a bare socket or a construction
      // ghost has nothing standing on it yet to knock down
      if (!part || (keep.built[socketId] ?? 0) < 1) return;
      const max = maxHpForPart(part);
      const hp = (keep.hp?.[socketId] ?? max) - amount;
      if (hp > 0) {
        set({ keep: { ...keep, hp: { ...keep.hp, [socketId]: hp } }, dirty: true });
        audio.play('brick_collide', 0.6);
        return;
      }
      // knocked down: back to a bare socket, half its materials recovered —
      // same rubble rate damageBuilding uses for an ordinary structure
      const parts = { ...keep.parts };
      delete parts[socketId];
      const built = { ...keep.built };
      delete built[socketId];
      const hpRest = { ...keep.hp };
      delete hpRest[socketId];
      const inv = { ...st.inventory };
      for (const [itemId, n] of Object.entries(part.cost)) {
        const refund = Math.floor((n as number) / 2);
        if (refund > 0) inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + refund;
      }
      set({ keep: { ...keep, parts, built, hp: hpRest }, inventory: inv, dirty: true });
      audio.play('brick_collide', 0.8);
      st.notify(`${part.name} ${cause ?? 'was battered down'}! Half materials recovered.`, true);
    },

    constructBuilding: (id, amount) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b || isBuilt(b)) return;
      const def = BUILDABLE_BY_ID[b.type];
      if (!def) return;
      // Builders' Guild passive + Sure Hammer/Raised Right talents — every
      // swing bonus stacks additively (player's and builder villagers' alike)
      const swingBonus = (st.guild === 'builders' ? 0.3 : 0)
        + (st.skillTree.includes('building2') ? 0.15 : 0)
        + (st.skillTree.includes('building3') ? 0.15 : 0);
      const swing = amount * (1 + swingBonus);
      const before = b.built ?? 0;
      const after = Math.min(1, before + swing);
      set({
        buildings: st.buildings.map((x) => (x.id === id ? { ...x, built: after } : x)),
        dirty: true,
      });
      if (after >= 1) {
        // the real "built" moment — everything placement used to award
        set({
          stats: {
            ...get().stats,
            buildingsPlaced: get().stats.buildingsPlaced + 1,
            buildingsByType: { ...get().stats.buildingsByType, [b.type]: (get().stats.buildingsByType[b.type] ?? 0) + 1 },
          },
        });
        st.addXp('building', def.buildXp);
        audio.play('brick_connect', 0.85);
        bumpQuestCounters('build', b.type, 1);
        st.notify(`${def.name} construction complete!`);
        // Wave 13 · Timed Build Challenge (see game/buildChallenge.ts) — a
        // finished piece raised at the challenge ground, while a run is
        // live, counts toward it. `b.world` is the tag placeBuilding stamped
        // at placement time (st.destination then), so this can only ever
        // fire for a piece actually standing at BUILD_CHALLENGE_ID — the
        // homestead-villager auto-build pass (below, this same file) never
        // touches a building tagged that way, since no villager is ever
        // assigned to a challenge ground.
        if (b.world === BUILD_CHALLENGE_ID && buildChallengeState.active) {
          buildChallengeState.built += 1;
          if (buildChallengeState.built >= BUILD_CHALLENGE_TARGET) {
            buildChallengeState.active = false;
            const bonus = 40;
            st.addItems({ gold: bonus }, 'grant');
            st.addXp('building', 60);
            st.notify(`Challenge complete! ${BUILD_CHALLENGE_TARGET} pieces raised before the bell — +${bonus} gold.`, true);
            audio.play('treasure', 0.85);
          }
        }
      } else {
        audio.play('thud', 0.6);
      }
    },

    pickupBuilding: (id) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b || st.movingBuilding) return;
      // anything resting on top stays floating visually until re-placed; keep it simple
      set({
        buildings: st.buildings.filter((x) => x.id !== id),
        movingBuilding: b,
        buildSelection: null,
        dirty: true,
      });
      audio.play('brick_collide', 0.5);
    },

    pickupKeep: () => {
      const st = get();
      const keep = st.keep;
      const b = st.buildings.find((x) => x.type === 'keep');
      if (!keep || !b || st.movingBuilding) return;
      // every socket's part/progress/HP travels with the foundation, lossless
      // — carried outside movingBuilding (a plain PlacedBuilding has nowhere
      // to hold that) and restored by cancelMove/finishMove below
      carriedKeepExtra = { parts: keep.parts, built: keep.built, hp: keep.hp ?? {} };
      set({
        keep: null,
        buildings: st.buildings.filter((x) => x.id !== b.id),
        movingBuilding: b,
        buildSelection: null,
        dirty: true,
      });
      audio.play('brick_collide', 0.5);
    },

    cancelMove: () => {
      const st = get();
      const mv = st.movingBuilding;
      if (!mv) return;
      const restoredKeep = mv.type === 'keep' && carriedKeepExtra
        ? { x: mv.x, z: mv.z, ...carriedKeepExtra }
        : null;
      carriedKeepExtra = null;
      set({
        buildings: [...st.buildings, mv],
        movingBuilding: null,
        ...(restoredKeep ? { keep: restoredKeep } : {}),
      });
    },

    finishMove: (x, z, rot, yaw) => {
      const st = get();
      const mv = st.movingBuilding;
      if (!mv) return false;
      // the keep's socket layout has no rotation of its own (KeepAssembly.tsx
      // renders it unrotated regardless of PlacedBuilding.rot) — force 0 so a
      // rotated ghost during placement can never leave the synthetic entry
      // and the real KeepState disagreeing about which way it faces
      const placeRot = mv.type === 'keep' ? 0 : rot;
      const { y, valid } = st.evalPlacement(mv.type, x, z, placeRot, mv.id);
      if (!valid) {
        audio.play('brick_collide', 0.5);
        return false;
      }
      const restoredKeep = mv.type === 'keep' && carriedKeepExtra
        ? { x, z, ...carriedKeepExtra }
        : null;
      carriedKeepExtra = null;
      // Wave 9 · a piece set down in freeform keeps its true facing; set down
      // back on the grid (or as the keep, which has no facing of its own) it
      // sheds any it was carrying, so the record stays exactly as clean as it
      // would have been had freeform never been touched
      const freeYaw = mv.type !== 'keep' && yaw !== undefined && Math.abs(yaw - (placeRot * Math.PI) / 2) > 1e-4
        ? yaw : undefined;
      set({
        // world stamped to wherever it's actually being set down — covers the
        // edge case of a pickup→travel→place happening in one build session
        buildings: [...st.buildings, { ...mv, x, z, y, rot: placeRot, yaw: freeYaw, world: st.destination ?? null }],
        movingBuilding: null,
        ...(restoredKeep ? { keep: restoredKeep } : {}),
        dirty: true,
      });
      audio.play('brick_link', 0.7);
      return true;
    },

    undoLast: () => {
      const st = get();
      while (placeHistory.length) {
        const group = placeHistory.pop()!;
        // a group is one gesture; anything in it already torn down by hand is
        // simply skipped, and a group emptied that way is not an undo at all
        const gone = group.filter((id) => st.buildings.some((x) => x.id === id));
        if (gone.length === 0) continue;
        const inv = { ...st.inventory };
        for (const id of gone) {
          const b = st.buildings.find((x) => x.id === id)!;
          for (const [itemId, n] of Object.entries(BUILDABLE_BY_ID[b.type].cost)) {
            inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + (n as number);
          }
        }
        const def = BUILDABLE_BY_ID[st.buildings.find((x) => x.id === gone[0])!.type];
        set({ buildings: st.buildings.filter((x) => !gone.includes(x.id)), inventory: inv, dirty: true });
        audio.play('brick_collide', 0.6);
        st.notify(gone.length > 1
          ? `Undid ${gone.length} × ${def.name} (materials returned)`
          : `Undid ${def.name} (materials returned)`);
        return;
      }
      st.notify('Nothing to undo.');
    },

    removeBuilding: (id, consumed = false, quiet = false) => {
      const st = get();
      const b = st.buildings.find((x) => x.id === id);
      if (!b) return;
      const def = BUILDABLE_BY_ID[b.type];
      const inv = { ...st.inventory };
      // `consumed` = the piece destroyed itself (a detonated charge), so
      // there's nothing left to salvage — only a deliberate teardown refunds
      for (const [itemId, n] of Object.entries(consumed ? {} : def.cost)) {
        const refund = Math.floor((n as number) / 2);
        if (refund > 0) inv[itemId as ItemId] = (inv[itemId as ItemId] ?? 0) + refund;
      }
      set({ buildings: st.buildings.filter((x) => x.id !== id), inventory: inv, dirty: true });
      if (!quiet) audio.play('brick_collide', 0.6);
      // a consumed piece (a charge that went off) left nothing to salvage —
      // don't claim a refund that didn't happen
      if (!consumed && !quiet) st.notify(`${def.name} removed (half materials refunded)`);
    },
  };
  });
}
