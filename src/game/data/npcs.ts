import type { Alliance, CharacterConfig, ItemId, SkillId } from '../types';
import { EXISTING_QUEST_ALLEGIANCE, EXTRA_SIDE_QUESTS } from './allegianceQuests';
import { allegianceGateHint, meetsAllegiance } from './allegiance';
import type { SoundName } from '@/lib/audio';
import { BATTLE_DOME } from './world';
import { SETTLEMENT_QUESTS } from './settlementQuests';
import { DELIVERY_QUESTS } from './deliveryQuests';

// The royal court, stationed around the realm. Each NPC greets with their
// original voice line and offers repeatable side quests from a themed pool.

export interface SideQuestDef {
  id: string;
  /** Which way finishing this errand moves your standing between the houses
   *  (data/allegiance.ts). Positive is toward the crown, negative toward the
   *  Bull, absent means it is honest work that neither house cares about —
   *  which is what makes a NEUTRAL path a real option rather than a gap. */
  allegiance?: number;
  /** errand ids that must already be done before this one is offered. Names
   *  its blocker in the UI rather than sitting greyed and silent. */
  requires?: string[];
  /** standing this errand demands before anyone will trust you with it.
   *  Positive = at least this far toward Leo, negative = toward Cedric. */
  needsAllegiance?: number;
  /** Wave 13 · unlike `needsAllegiance` (the continuous -100..100 score),
   *  this checks the one-way PLEDGE (gameStore's `alliance`) — a real
   *  "you must actually be sworn" gate, not just "you've been leaning this
   *  way." True alliance-exclusive content (a capstone errand/reward each
   *  house holds back for its own sworn knight) uses this instead. */
  needsAlliance?: Alliance;
  // 'joust' and 'duel' (Phase 20 step 4b) are location-bound by nature —
  // jousting only happens at Richard's Tourney Grounds, first-blood duels
  // only at Storm's Battle Dome — so errands using them can only be
  // advanced in their giver's own world. 'deliver' (Wave 13) is
  // location-bound the other way: it behaves exactly like 'gather' while
  // you carry it (see gameStore's bumpSideQuest, which treats a gather-kind
  // action bump as advancing a deliver-kind errand too) but can only be
  // turned in at `deliverTo`, not back with whoever handed it to you — see
  // that field's own doc comment.
  kind: 'gather' | 'craft' | 'build' | 'kill' | 'joust' | 'duel' | 'deliver';
  target: string;       // itemId / recipeId / buildableId / enemy kind or 'any' for kills
  need: number;
  label: string;
  xpSkill: SkillId;
  xp: number;
  rewardItems?: Partial<Record<ItemId, number>>;
  /** 'deliver' errands only: the destination id (data/worlds.ts) you must
   *  be physically standing in — not the giver's own location — before
   *  `turnInSideQuest` will accept it. The whole point is hauling goods
   *  across a `travelTo()`, so the giver and the turn-in place are
   *  deliberately different; DialoguePanel recognizes an active errand as
   *  "yours to turn in" at whichever NPC lives at `deliverTo`, even if that
   *  NPC didn't hand it to you (see its `mySideQuest` derivation). */
  deliverTo?: string;
}

export interface NpcDef {
  /** Keep the weapons/regalia molded into this donor?
   *
   *  True for the court — the crown, the goblet, Richard's spear are part of
   *  who those characters are. FALSE for the village folk: Alric and Beda
   *  share the generic donors, which carry a molded halberd and crossbow, and
   *  keeping those both mis-characterised a farmer and a miller AND fed a
   *  large held mesh into the arm cluster, which is what threw their heads
   *  and arms out of place while they stood at their posts. Defaults to true
   *  so every existing court entry is unchanged.
   */
  keepProps?: boolean;
  id: string;
  name: string;
  title: string;
  config: CharacterConfig;
  x: number;
  z: number;
  yaw: number;
  greetSound: SoundName;
  portrait: string;
  /** flavor lines, one picked at random per conversation */
  lines: string[];
  sideQuests: SideQuestDef[];
  /** one-time voiced introduction, played in order the first time you talk to
   *  them (see game/store gameStore's loreSeen) — genuine lines of theirs
   *  from the original game's 371-line challenge/tutorial voice-over bank */
  loreLines?: { text: string; sound: SoundName }[];
  /** standing with this NPC specifically (see gameStore's reputation/
   *  addReputation), ascending thresholds — only NPCs with repeatable
   *  errands (or, for Richard, jousting) build a personal standing; King
   *  Leo's relationship with the player is already the main quest/rank */
  repTitles?: { min: number; title: string }[];
  /** quest id that must be completed before this NPC appears in the world —
   *  absent means always present. The game starts as a small farm/village
   *  of ordinary folk; the royal court arrives in person as you prove
   *  yourself (see isNpcRevealed). */
  revealAfterQuest?: string;
  /** Phase 20 (Kingdom of Instances): destination id this NPC resides in —
   *  absent = the homestead. A resident NPC renders (and is interactable)
   *  only while the player is visiting their instance; their x/z are
   *  world-absolute coordinates near that destination's travel landing
   *  point, and their feet follow the bake's real terrain height. */
  world?: string;
}

/** whether an NPC has appeared yet — see revealAfterQuest above. */
export function isNpcRevealed(npc: NpcDef, completedQuests: string[]): boolean {
  return !npc.revealAfterQuest || completedQuests.includes(npc.revealAfterQuest);
}

/** Court NPCs that actually move under `navSteer` — `Npc.tsx`'s own
 *  "schedule" concept (`revealAfterQuest && !world`): a real day/night
 *  walk, not the static starter farmers or instance residents, who render
 *  (`Npc.tsx`'s own broader reveal filter, unchanged) but never reach a
 *  navSteer call site. Phase 3, iteration 3.4 — the population
 *  `src/ai/npcSync.ts` spawns an Agent per; an Agent for a static NPC
 *  would just sit unused. Mirrors the `revealed` filter `Npc.tsx`'s own
 *  default export already computes inline, plus the schedule condition —
 *  kept here, not duplicated, so the two can't drift apart. */
export function scheduledCourtNpcs(
  completedQuests: string[], destination: string | null, villagers: { id: string }[],
): NpcDef[] {
  return NPCS.filter((n) =>
    !!n.revealAfterQuest && !n.world
    && isNpcRevealed(n, completedQuests)
    && (n.world ?? null) === (destination ?? null)
    && !villagers.some((v) => v.id === n.id));
}

/** Wave 14 · a Point of Interest a traveler can waypoint straight to inside
 *  a destination, instead of only ever landing at that destination's generic
 *  `origin` (see gameStore's `travelTo`). v1 POI data is deliberately NOT a
 *  new hand-authored table — it's derived live from the resident court NPCs
 *  already defined above, each of which already has a real name/title/
 *  portrait and a world-absolute x/z/yaw, so a POI and its resident can
 *  never drift out of sync with each other. `mapPopulation.generated.json`
 *  (the Grok lab's set-dressing prop placement) was considered and rejected
 *  as a POI source for this wave: it's sparse (rows for only 7 of 9
 *  templates), and the `set`-kind rows that make up most of it carry only an
 *  opaque catalogue `assetRef` (e.g. "oc6095b3") with no human-readable name
 *  anywhere in the data — turning that into POIs would mean hand-authoring
 *  landmark labels destination by destination, well past this wave's
 *  "waypoint to something real" scope. A destination with no resident NPC
 *  (04/05/07/09, all 6 challenge grounds, the dungeon, the arena) simply has
 *  no POI in v1 — `travelTo(id)` alone still lands at `dest.origin` exactly
 *  as it always has. */
export interface Poi {
  /** the resident NPC's own id — also the `discoveredPois` save key */
  id: string;
  name: string;
  title: string;
  portrait: string;
  world: string;
  x: number;
  z: number;
  yaw: number;
}

/** Every POI inside one destination, in roster order. Gated by the SAME
 *  `isNpcRevealed` quest gate the resident already uses everywhere else (the
 *  Travel Map must not spoil a character before their reveal quest) — a
 *  stricter gate than a save's `discoveredPois`, which only tracks whether an
 *  already-revealed POI has actually been waypointed to yet. */
export function poisForDestination(destId: string, completedQuests: string[]): Poi[] {
  return NPCS
    .filter((n) => n.world === destId && isNpcRevealed(n, completedQuests))
    .map((n) => ({ id: n.id, name: n.name, title: n.title, portrait: n.portrait, world: n.world!, x: n.x, z: n.z, yaw: n.yaw }));
}

export const NPCS: NpcDef[] = [
  {
    id: 'king',
    name: 'King Leo',
    title: 'Sovereign of the Realm',
    config: {
      name: 'King Leo', headDonor: 'minifigkingleo00', bodyDonor: 'minifigkingleo00',
      armColor: 26, handColor: 18, legColor: 38, hipColor: 38,
    },
    // Phase 20: the King holds court at his own castle — The King's Approach
    // (template-01). The travel landing (~1000, 888) is a steep hillside;
    // the court stands on the flat ground past it (terrain-probed y≈5), so
    // the walk up really is the king's approach.
    x: 1000, z: 962, yaw: Math.PI,
    world: 'template-01',
    greetSound: 'greeting_king',
    portrait: '/assets/minifigs/minifigkingleo00.png',
    lines: [
      'Serve the realm well and you shall be knighted! Your quest log (J) marks the path.',
      'A kingdom is built one brick at a time. Yours is coming along nicely.',
      'The night grows dangerous of late. Walls, torches and a strong arm will see you through.',
    ],
    loreLines: [
      { text: 'I am King Leo. Do you like my castle? Richard tells me you want to become a knight.', sound: 'lore_leo_castle' },
      { text: "My land is a wonderful place, but for Cedric and his gang. He's always trying to get his hands on my Kingdom... and his bottom on my throne!", sound: 'lore_leo_cedric1' },
      { text: 'For now though, Cedric still lives in the woods!', sound: 'lore_leo_cedric2' },
      { text: 'Did you keep up alright? Good! Right! I want to introduce you to the evil Cedric the Bull.', sound: 'lore_richard_cedric' },
    ],
    revealAfterQuest: 'knights_arms',
    // kingdom-scale levies, befitting the crown's own seat (Phase 20 4b)
    sideQuests: [
      {
        id: 'k_iron_levy', kind: 'gather', target: 'iron_bar', need: 3,
        label: 'The crown levies 3 iron bars for the armory',
        xpSkill: 'smithing', xp: 40, rewardItems: { gold: 22 },
      },
      {
        id: 'k_feast', kind: 'gather', target: 'bread', need: 3,
        label: 'Provision the royal table with 3 loaves',
        xpSkill: 'farming', xp: 30, rewardItems: { gold: 16 },
      },
    ],
  },
  {
    id: 'queen',
    name: 'Queen Leonora',
    title: 'Patron of the Homestead',
    config: {
      name: 'Queen Leonora', headDonor: 'minifigqueenleonora00', bodyDonor: 'minifigqueenleonora00',
      armColor: 24, handColor: 18, legColor: 150, hipColor: 24,
    },
    // beside the King at the royal castle (Phase 20)
    x: 1005, z: 963, yaw: Math.PI,
    world: 'template-01',
    greetSound: 'greeting_queen',
    portrait: '/assets/minifigs/minifigqueenleonora00.png',
    lines: [
      'A homestead should be beautiful as well as strong, don’t you agree?',
      'Fresh flowers brighten even the darkest keep.',
    ],
    loreLines: [
      { text: "You've met my husband. He can be a bit pompous you know! A fine king though!", sound: 'lore_queen_husband' },
      { text: 'I am Queen Leonora and I advise Leo on tactics.', sound: 'lore_queen_self' },
      { text: 'Have you met my daughter Princess Storm? Maybe later. Few can match her skills with a sword.', sound: 'lore_queen_daughter' },
    ],
    repTitles: [
      { min: 0, title: 'Patron of the Homestead' },
      { min: 30, title: 'Friend of the Court' },
      { min: 80, title: 'Trusted of the Queen' },
      { min: 160, title: 'Confidante of the Crown' },
    ],
    revealAfterQuest: 'squires_errand',
    sideQuests: [
      {
        id: 'q_flowers', kind: 'gather', target: 'flowers', need: 2,
        label: 'Gather 2 bundles of wildflowers for the court',
        xpSkill: 'woodcutting', xp: 30, rewardItems: { plank: 4, gold: 8 },
      },
      {
        id: 'q_decor', kind: 'build', target: 'flowerbed', need: 2,
        label: 'Plant 2 flower beds around the homestead',
        xpSkill: 'building', xp: 45, rewardItems: { stone: 4, gold: 16 },
      },
      {
        id: 'q_barrels', kind: 'build', target: 'barrel', need: 2,
        label: 'Set out 2 storage barrels for the pantry',
        xpSkill: 'building', xp: 40, rewardItems: { flowers: 2, gold: 14 },
      },
    ],
  },
  {
    id: 'richard',
    name: 'Richard the Strong',
    title: 'Master-at-Arms',
    config: {
      name: 'Richard', headDonor: 'minifigrichardstrong00', bodyDonor: 'minifigrichardstrong00',
      armColor: 34, handColor: 18, legColor: 38, hipColor: 34,
    },
    // Phase 20: Richard keeps the lists at The Tourney Grounds (template-02,
    // lands at ~(1300, 877.5)) — jousting happens on his own field now
    x: 1300, z: 888, yaw: Math.PI,
    world: 'template-02',
    greetSound: 'greeting_richard',
    portrait: '/assets/minifigs/minifigrichardstrong00.png',
    lines: [
      'A knight trains every day. The quintain never complains!',
      'Skeletons fear a ready blade. Be that blade.',
    ],
    loreLines: [
      { text: "Greetings! I am Richard the Strong, and I welcome you to LEGO Creator Knights' Kingdom.", sound: 'lore_richard_greet' },
      { text: "Don't worry. I'll be here to help you throughout.", sound: 'lore_richard_reassure' },
      { text: "I'll introduce you to some friends and foes along the way!", sound: 'lore_richard_friendsfoes' },
      // I42 · the line that used to sit here — "Did you keep up alright? …
      // the evil Cedric the Bull" — is KING LEO's voice, not Richard's. It
      // was playing in Richard's run with his portrait over it. Moved to Leo,
      // where the recording actually belongs.
      { text: 'Farewell, my good Knight!', sound: 'lore_richard_farewell' },
    ],
    repTitles: [
      { min: 0, title: 'Master-at-Arms' },
      { min: 30, title: 'Sparring Partner' },
      { min: 80, title: 'Richard’s Trusted Blade' },
      { min: 160, title: 'Champion of the Yard' },
    ],
    revealAfterQuest: 'forge_ahead',
    sideQuests: [
      {
        id: 'r_slay2', kind: 'kill', target: 'any', need: 2,
        label: 'Defeat 2 of the creatures that stalk the night',
        xpSkill: 'combat', xp: 60, rewardItems: { iron_bar: 1, gold: 14 },
      },
      {
        id: 'r_slay4', kind: 'kill', target: 'any', need: 4,
        label: 'Drive back 4 raiders or skeletons',
        xpSkill: 'combat', xp: 120, rewardItems: { iron_bar: 2, gold: 24 },
      },
      // location-bound (Phase 20 4b): landing a joust pass is only possible
      // here at his own Tourney Grounds
      {
        id: 'r_lists', kind: 'joust', target: 'any', need: 3,
        label: 'Land 3 solid passes at the lists',
        xpSkill: 'combat', xp: 90, rewardItems: { gold: 18 },
      },
    ],
  },
  {
    id: 'john',
    name: 'John of Mayne',
    title: 'Quartermaster',
    config: {
      name: 'John', headDonor: 'minifigjohnmayne00', bodyDonor: 'minifigjohnmayne00',
      armColor: 30, handColor: 18, legColor: 38, hipColor: 38,
    },
    // Phase 20: John runs the stores from The River Landing (template-03,
    // lands at ~(1600, 885.5)) — the realm's trade flows through his dock
    x: 1600, z: 896, yaw: Math.PI,
    world: 'template-03',
    greetSound: 'greeting_john',
    portrait: '/assets/minifigs/minifigjohnmayne00.png',
    lines: [
      'The stores always want for more. Wood, stone, fish — bring what you can.',
      'An army marches on its stomach, and a kingdom builds on its warehouse.',
    ],
    repTitles: [
      { min: 0, title: 'Quartermaster' },
      { min: 30, title: 'Reliable Supplier' },
      { min: 80, title: "John's Right Hand" },
      { min: 160, title: 'Warden of the Stores' },
    ],
    revealAfterQuest: 'cozy_beginnings',
    sideQuests: [
      {
        id: 'j_wood', kind: 'gather', target: 'wood', need: 6,
        label: 'Deliver 6 wood logs to the stores',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { stone: 3, gold: 10 },
      },
      {
        id: 'j_fish', kind: 'gather', target: 'fish', need: 3,
        label: 'Catch 3 fish for the kitchens',
        xpSkill: 'fishing', xp: 50, rewardItems: { plank: 5, gold: 14 },
      },
      {
        id: 'j_planks', kind: 'craft', target: 'plank', need: 6,
        label: 'Mill 6 planks for the carpenters',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { flowers: 1, gold: 12 },
      },
    ],
  },
  {
    id: 'storm',
    name: 'Princess Storm',
    title: 'Blade of the Battle Dome',
    config: {
      name: 'Princess Storm', headDonor: 'minifigprincessstorm00', bodyDonor: 'minifigprincessstorm00',
      armColor: 24, handColor: 18, legColor: 150, hipColor: 24,
    },
    // stationed at her own small arena — grounded in Queen Leonora's own
    // line: "Have you met my daughter Princess Storm? ... Few can match her
    // skills with a sword." (c1s04t4c.txt) — see BattleDome.tsx. Phase 20:
    // the dome (and she) reside at The Sister Keep now.
    x: BATTLE_DOME.x, z: BATTLE_DOME.z + BATTLE_DOME.radius - 2, yaw: Math.PI,
    world: 'template-06',
    greetSound: 'greeting_storm',
    portrait: '/assets/minifigs/minifigprincessstorm00.png',
    lines: [
      "My mother talks up my swordplay to every traveler who'll listen. Care to see for yourself?",
      'First blood wins here — no grudges, win or lose.',
      'Richard trains knights for the battlefield. I train them for the single, decisive moment.',
    ],
    repTitles: [
      { min: 0, title: 'Blade of the Battle Dome' },
      { min: 10, title: 'Worthy Opponent' },
      { min: 40, title: "Storm's Rival" },
      { min: 100, title: "Storm's Equal" },
    ],
    // no first-person lines survive for her in the 371-line challenge bank
    // (unlike Leo/Leonora/Richard) — only her mother's line above exists —
    // so she keeps flavor-line-only dialogue, same as John of Mayne.
    revealAfterQuest: 'squires_errand',
    // location-bound (Phase 20 4b): first-blood duels only happen in her
    // own ring at The Sister Keep
    sideQuests: [
      {
        id: 's_firstblood', kind: 'duel', target: 'any', need: 2,
        label: 'Take first blood off her twice in the ring',
        xpSkill: 'combat', xp: 110, rewardItems: { gold: 20 },
      },
    ],
  },
  // Always-present village folk: the game opens as a small farm/village, not
  // a royal court — these two are just flavor (a greeting, no errands), so
  // the world doesn't feel empty before any quest has revealed the nobles.
  {
    id: 'farmer_alric',
    name: 'Alric',
    title: 'Village Farmer',
    config: {
      name: 'Alric', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 22, handColor: 18, legColor: 34, hipColor: 34,
    },
    // Tucked in a quiet corner well outside the homestead build area (see
    // StarterVillage.tsx for the two hut props marking their homes) — the
    // build grid needs to stay clear of standing NPCs.
    x: -40, z: 38, yaw: Math.PI * 0.35,
    // a farmer is not carrying the generic donor's molded halberd
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Mornin'! Small farm we've got here, but it's honest work.",
      "The King and his court? Keep to the castle, mostly. Folk like us tend the land.",
      'Chop, gather, build — a homestead grows one day at a time.',
    ],
    // Wave 13: his one delivery errand, out to Fenwick's new settlement —
    // see deliveryQuests.ts's own header for why it lives in its own file.
    sideQuests: DELIVERY_QUESTS.farmer_alric,
  },
  {
    id: 'miller_beda',
    name: 'Beda',
    title: 'Village Miller',
    config: {
      // K57 · head and body MUST come from the same donor. Beda had her head
      // from the good generic and her torso from the bad one — two different
      // body types — so the arms the rig re-hangs belong to a torso she is
      // not wearing, and they sit wrong however well they are classified.
      // (Audited the whole roster: she was the only mismatch.)
      name: 'Beda', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 30, handColor: 18, legColor: 38, hipColor: 24,
    },
    x: -35, z: 42, yaw: Math.PI * 1.1,
    // nor is a miller carrying the bad-guy donor's crossbow
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Bring us wood and stone and I'll not say no.",
      "Prove yourself and word travels — even to the castle, they say.",
    ],
    // Wave 13: her one delivery errand, out to Fenwick's new settlement.
    sideQuests: DELIVERY_QUESTS.miller_beda,
  },
  // Empire arc, Wave 4: the settlement prototype's own quest-giver, living
  // among The Old Ruins (template-08) — the one real away-destination with
  // no resident NPC or guild-hall figure already there (see
  // settlementQuests.ts's own header for why this one was picked). Reuses
  // the same generic villager donor + greetSound + portrait Alric/Beda
  // already use — zero new asset dependency, same "village folk, not
  // court" visual register.
  {
    id: 'fenwick',
    name: 'Fenwick',
    title: 'Ruins Scavenger',
    config: {
      name: 'Fenwick', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 90, handColor: 18, legColor: 38, hipColor: 90,
    },
    // near the template-08 travel landing (origin {x:3100,z:1000}) — ground
    // height is sampled live by Npc.tsx for any world-resident NPC
    // (destinationGroundY), same as every other court/village resident.
    x: 3100, z: 970, yaw: Math.PI,
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Been picking through these old foundations for years now. Nobody else wants them.",
      "You look like you could actually DO something with this place.",
      "Bring me stone enough to shore the walls, and clear out whatever's nesting in the cellars — the deed's yours after that.",
    ],
    sideQuests: SETTLEMENT_QUESTS.fenwick,
    world: 'template-08',
  },
];

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]));

// Cedric's war council (Phase 20 4b): rebellion errands offered only to his
// sworn bannermen at the camp beneath The Rival Castle (see ParleyPanel's
// war-council branch). He isn't an NpcDef — his camp/boss-fight life cycle
// is its own system — so his errands live here and every side-quest lookup
// goes through sideQuestsOf() instead of NPC_BY_ID directly.
export const CEDRIC_WAR_QUESTS: SideQuestDef[] = [
  {
    id: 'ced_iron', kind: 'gather', target: 'iron_bar', need: 2,
    label: 'Smuggle 2 iron bars to the rebellion’s forges',
    xpSkill: 'smithing', xp: 45, rewardItems: { gold: 24 },
  },
  {
    id: 'ced_royals', kind: 'kill', target: 'royal', need: 3,
    label: 'Cull 3 of the King’s hounds when they raid your homestead',
    xpSkill: 'combat', xp: 130, rewardItems: { gold: 30 },
  },
  {
    id: 'ced_stone', kind: 'gather', target: 'stone', need: 8,
    label: 'Quarry 8 stone for the siege works',
    xpSkill: 'mining', xp: 40, rewardItems: { iron_ore: 3, gold: 20 },
  },
];

export function sideQuestsOf(npcId: string): SideQuestDef[] {
  const base = npcId === 'cedric' ? CEDRIC_WAR_QUESTS : (NPC_BY_ID[npcId]?.sideQuests ?? []);
  // errands that take a side live in their own module (data/allegianceQuests)
  // so the whole "which way does this pull me?" picture reads in one place;
  // the pre-existing ones get their delta stamped on here for the same reason
  const extra = EXTRA_SIDE_QUESTS[npcId] ?? [];
  return [...base, ...extra].map((q) => (
    q.allegiance === undefined && EXISTING_QUEST_ALLEGIANCE[q.id] !== undefined
      ? { ...q, allegiance: EXISTING_QUEST_ALLEGIANCE[q.id] }
      : q
  ));
}

/** Why this errand is not on offer yet, or null when it is available.
 *  Never disable without naming the blocker (UI handoff pack §2).
 *  `alliance` is optional only so call sites written before Wave 13's
 *  `needsAlliance` gate keep compiling untouched — every real caller now
 *  passes it (see gameStore's acceptSideQuest, QuestLogPanel, DialoguePanel,
 *  ParleyPanel). */
export function sideQuestBlocker(
  q: SideQuestDef, completed: string[], allegiance: number, alliance?: Alliance | null,
): string | null {
  if (q.requires?.length) {
    const missing = q.requires.filter((r) => !completed.includes(r));
    if (missing.length) {
      const names = missing.map((id) => questLabelById(id) ?? id);
      return `First: ${names.join(', ')}`;
    }
  }
  if (q.needsAllegiance !== undefined && !meetsAllegiance(allegiance, q.needsAllegiance)) {
    return allegianceGateHint(q.needsAllegiance);
  }
  if (q.needsAlliance && alliance !== q.needsAlliance) {
    return q.needsAlliance === 'leo'
      ? 'Only for a knight sworn to the crown'
      : "Only for one sworn to Cedric's rebellion";
  }
  return null;
}

/** an errand's own label, wherever it lives */
export function questLabelById(id: string): string | null {
  for (const n of NPCS) {
    const hit = n.sideQuests.find((q) => q.id === id);
    if (hit) return hit.label;
  }
  const ced = CEDRIC_WAR_QUESTS.find((q) => q.id === id);
  if (ced) return ced.label;
  for (const list of Object.values(EXTRA_SIDE_QUESTS)) {
    const hit = list.find((q) => q.id === id);
    if (hit) return hit.label;
  }
  return null;
}

export function sideQuestGiverName(npcId: string): string {
  if (npcId === 'cedric') return 'Cedric the Bull';
  return NPC_BY_ID[npcId]?.name ?? 'someone';
}
