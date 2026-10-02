// CLN-21 · the settlement and guild-hall residents, moved verbatim out of data/npcs.ts's NPCS array.
import { resolveDestPoint, WORLD_DESTINATION_BY_ID } from '../worlds';
import { SETTLEMENT_QUESTS } from '../settlementQuests';
import type { NpcDef } from './types';

export const SETTLEMENT_NPCS: NpcDef[] = [
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
    // 2026-08-25: converted to a durable LOCAL point via resolveDestPoint —
    // local (0, -200), derived from the pre-halving world position
    // (3100, 970).
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-08'], 0, -200), yaw: Math.PI,
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
  // Wave 26: the empire arc's second settlement site, living at The Frozen
  // Pass (template-07) — distinct from both Fenwick (ruins/salvage framing)
  // and the Woodsmen already stationed at this same destination's guild
  // hall (they ply an existing trade; he wants to found something new here).
  // Reuses the same generic villager donor + greetSound + portrait
  // convention as Alric/Beda/Fenwick — zero new asset dependency.
  {
    id: 'torvald',
    name: 'Torvald',
    title: 'Frozen Pass Prospector',
    config: {
      name: 'Torvald', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 70, handColor: 18, legColor: 70, hipColor: 24,
    },
    // 22m east of the arrival spawn/Woodsmen's Lodge hall/claim banner
    // (all three share that one point — see guilds.ts's WOODSMEN_HALL and
    // worlds.ts's TEMPLATE_ARRIVAL_SPAWN) — live-verified clear of every
    // one of their interact ranges, so a player arriving doesn't get three
    // overlapping prompts stacked on top of each other. Local point captured
    // live via a teleport survey and resolveDestPoint's durable convention,
    // same as Fenwick's own NpcDef above; yaw faces back toward the hall.
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-07'], 3960, 7053.333), yaw: Math.PI / 2,
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Wind cuts hard through this pass, but look at what it's cut INTO — timber on one side, good ore-bearing rock on the other.",
      "The Lodge folk work the trees, and rightly, but nobody's put down real roots here yet.",
      'Shore up a shelter against this wind and clear the trail of what prowls it, and I\'ll see about a proper deed.',
    ],
    sideQuests: SETTLEMENT_QUESTS.torvald,
    world: 'template-07',
  },
  // Wave 44: the empire arc's third settlement site, The Siege Camp
  // (template-04) — reads as a war-camp survivor, not a generic builder,
  // even though he sits by the Builders' Guild's own hall (BUILDERS_HALL,
  // data/guilds.ts): the destination's real theme (worlds.ts blurb/loot —
  // "a war machine still stands aimed at a keep it never breached", +iron
  // ore fittings) is a siege engine and its salvage, not construction.
  // He "doubles" as the Guild's missing quest-giver narratively only — his
  // own `sideQuests` carries just the new settlement chain below; the
  // Guild's own errand pool (GUILD_QUESTS.builders) is offered by the hall
  // itself (Panels.tsx's GuildErrands, walking within its interact range)
  // and needed zero NPC to begin with — confirmed live, see this wave's
  // research notes.
  {
    id: 'garrick',
    name: 'Garrick',
    title: 'Siege Camp Smith',
    config: {
      name: 'Garrick', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 44, handColor: 18, legColor: 46, hipColor: 47,
    },
    // ~20m east of BUILDERS_HALL — which is also (within 0.02/0.007 local
    // units) the template-04 arrival spawn/claim-banner point, per
    // worlds.ts's own TEMPLATE_ARRIVAL_SPAWN comment — a reasoned starting
    // candidate mirroring Torvald's own east-of-hall placement at The
    // Frozen Pass. Live-verified during this wave's own verify pass (a real
    // teleport + interact): reachable on real walkable ground, with a clean
    // "Talk to Garrick" prompt showing no overlap with the hall's own.
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-04'], 2930.73, 10942.8), yaw: Math.PI / 2,
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "That old war machine's stood aimed at the same keep since before I was born — still cocked, never loosed. There's good iron left in her bones, if a man's not afraid to pry.",
      "The Guild keeps a board of real work up at the hall there — mind you take a look. But I've a different kind of work in mind, if you're the sort who finishes what others walked away from.",
      "Shore up what's left of this camp and clear it of what's moved in since, and I'll see the deed's yours. A siege camp makes a fine start for a keep of your own.",
    ],
    sideQuests: SETTLEMENT_QUESTS.garrick,
    world: 'template-04',
  },
  // Wave 45 (B2): the Anglers' Circle's own hall (ANGLERS_HALL, data/
  // guilds.ts) has real membership content (GUILD_QUESTS.anglers, offered by
  // the hall itself — no NPC needed for that) but template-03 itself had no
  // resident at all, unlike every other settlement-shaped destination. Wyeth
  // is deliberately NOT a settlement quest-giver (no SETTLEMENT_QUESTS/
  // SETTLEMENT_FOUNDING involved) — the court's own template-01/02/06
  // pattern (Richard/John/Queen: a plain, independent `sideQuests` pool) is
  // the real structural template here, scoped smaller than Fenwick/Torvald/
  // Garrick on purpose. Themed to the destination's own real identity
  // (worlds.ts: "a loading dock, cart tracks, and a hint of trade") rather
  // than duplicating the guild's fishing errands — his own lines point the
  // player at the Circle's board instead of re-offering its content.
  {
    id: 'wyeth',
    name: 'Wyeth',
    title: 'River Landing Ferryman',
    config: {
      name: 'Wyeth', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 23, handColor: 18, legColor: 23, hipColor: 25,
    },
    // ~21m east of ANGLERS_HALL (guilds.ts) — same local-offset placement
    // method Garrick (+267 local units east of BUILDERS_HALL, Wave 44) and
    // Torvald (east of WOODSMEN_HALL) already used. Cross-checked against
    // templateWalkableFootprint.generated.json's own template-03 union rects
    // this wave: the resolved world point (1614, 945) falls inside all three
    // overlapping walkable rects on record for this destination, not just
    // the one big one — a real, if not fully live-rendered, confirmation.
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-03'], 186.667, -733.333), yaw: Math.PI / 2,
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Boats and barges used to line this landing three deep. These days it's mostly cart tracks and quiet water — for now.",
      "The Circle keeps their board up past the hall, if fishing's more your trade. Me, I mind the dock and what crosses it.",
      "Bring me wood and stone enough and I'll see the old landing holds together a while longer.",
    ],
    // verify-fix (Wave 45): the plan's own cited template — Richard/John/
    // Queen (./court.ts), the exact three other plain-`sideQuests` NPCs his own
    // header comment above points to — all carry repTitles at the same
    // 0/30/80/160 breakpoints; Wyeth was missing his, which left
    // addReputation() (gameStore.ts) a silent no-op for him (it bails out
    // whenever `!npc?.repTitles`) and his Standing block permanently absent
    // from DialoguePanel/QuestLogPanel. Titles themed to his own line above
    // ("mind the dock and what crosses it") rather than reused fishing/
    // guild flavor.
    repTitles: [
      { min: 0, title: 'River Landing Ferryman' },
      { min: 30, title: 'Trusted of the Landing' },
      { min: 80, title: "Wyeth's Right Hand" },
      { min: 160, title: 'Warden of the Crossing' },
    ],
    sideQuests: [
      {
        id: 'wy_dockrepair', kind: 'craft', target: 'plank', need: 6,
        label: 'Mill 6 planks to shore up the loading dock',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { stone: 3, gold: 14 },
      },
      {
        id: 'wy_towpath', kind: 'gather', target: 'stone', need: 8,
        label: 'Haul 8 stone to firm up the towpath',
        xpSkill: 'mining', xp: 45, rewardItems: { plank: 3, gold: 16 },
      },
      {
        id: 'wy_cartgoods', kind: 'gather', target: 'wood', need: 10,
        label: 'Bring 10 logs down to the landing for the carts',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { gold: 18 },
      },
    ],
    world: 'template-03',
  },
];
