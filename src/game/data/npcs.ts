import type { CharacterConfig, ItemId, SkillId } from '../types';
import { EXISTING_QUEST_ALLEGIANCE, EXTRA_SIDE_QUESTS } from './allegianceQuests';
import { allegianceGateHint, meetsAllegiance } from './allegiance';
import type { SoundName } from '@/lib/audio';
import { BATTLE_DOME } from './world';

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
  // 'joust' and 'duel' (Phase 20 step 4b) are location-bound by nature —
  // jousting only happens at Richard's Tourney Grounds, first-blood duels
  // only at Storm's Battle Dome — so errands using them can only be
  // advanced in their giver's own world.
  kind: 'gather' | 'craft' | 'build' | 'kill' | 'joust' | 'duel';
  target: string;       // itemId / recipeId / buildableId / enemy kind or 'any' for kills
  need: number;
  label: string;
  xpSkill: SkillId;
  xp: number;
  rewardItems?: Partial<Record<ItemId, number>>;
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
        xpSkill: 'woodcutting', xp: 30, rewardItems: { plank: 4 },
      },
      {
        id: 'q_decor', kind: 'build', target: 'flowerbed', need: 2,
        label: 'Plant 2 flower beds around the homestead',
        xpSkill: 'building', xp: 45, rewardItems: { stone: 4 },
      },
      {
        id: 'q_barrels', kind: 'build', target: 'barrel', need: 2,
        label: 'Set out 2 storage barrels for the pantry',
        xpSkill: 'building', xp: 40, rewardItems: { flowers: 2 },
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
        xpSkill: 'combat', xp: 60, rewardItems: { iron_bar: 1 },
      },
      {
        id: 'r_slay4', kind: 'kill', target: 'any', need: 4,
        label: 'Drive back 4 raiders or skeletons',
        xpSkill: 'combat', xp: 120, rewardItems: { iron_bar: 2 },
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
        xpSkill: 'woodcutting', xp: 40, rewardItems: { stone: 3 },
      },
      {
        id: 'j_fish', kind: 'gather', target: 'fish', need: 3,
        label: 'Catch 3 fish for the kitchens',
        xpSkill: 'fishing', xp: 50, rewardItems: { plank: 5 },
      },
      {
        id: 'j_planks', kind: 'craft', target: 'plank', need: 6,
        label: 'Mill 6 planks for the carpenters',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { flowers: 1 },
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
    sideQuests: [],
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
    sideQuests: [],
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
    xpSkill: 'mining', xp: 40, rewardItems: { iron_ore: 3 },
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
 *  Never disable without naming the blocker (UI handoff pack §2). */
export function sideQuestBlocker(
  q: SideQuestDef, completed: string[], allegiance: number,
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
