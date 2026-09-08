// Empire arc, Wave 4 — the settlement prototype at template-08 ("The Old
// Ruins", chosen per the design pass behind this wave: the only one of the
// 8 real away-destinations with no resident named NPC or guild-hall NPC
// already living there, so a new settlement doesn't compete with existing
// content). Two real errands, offered/tracked/turned in through the exact
// same DialoguePanel flow every other NPC's `sideQuests` already uses —
// spread directly into Fenwick's own `NpcDef.sideQuests` (npcs.ts), not
// merged in via `sideQuestsOf()` the way `allegianceQuests.ts`'s pool is.
// That merge path is real but DialoguePanel.tsx's own offer/accept logic
// reads `npc.sideQuests` directly, never `sideQuestsOf(npc.id)` — confirmed
// by reading it, not assumed — so an EXTRA_SIDE_QUESTS-style pool would
// never actually be offerable through the normal "talk to them" flow (the
// same reason `farmer_alric`/`miller_beda`'s own allegiance-file errands
// are dead code today, a separate pre-existing gap logged in ROADMAP.md,
// not fixed here). Keeping this pool as its own file for the same
// organizational reason `allegianceQuests.ts` is separate from `npcs.ts` —
// the settlement-earning story reads in one place — while still being
// spread into the real `sideQuests` array so it actually works.
import type { ItemId, ResourceNodeState, VillagerJob } from '../types';
import type { SideQuestDef } from './npcs';

export const SETTLEMENT_QUESTS: Record<string, SideQuestDef[]> = {
  fenwick: [
    {
      id: 'settle_scout', kind: 'gather', target: 'stone', need: 20,
      label: 'Shore up the old foundations — bring 20 stone',
      xpSkill: 'building', xp: 60, rewardItems: { gold: 15 },
    },
    {
      id: 'settle_clear', kind: 'kill', target: 'any', need: 6,
      label: "Clear out whatever's been nesting in these ruins — defeat 6 hostiles",
      xpSkill: 'combat', xp: 80, rewardItems: { gold: 20 },
      requires: ['settle_scout'],
    },
    // Wave 27 · the Trade Caravan's own delivery deepening — `requires`
    // names the OTHER settlement's own closing quest id, which works with
    // zero new gating code: sideQuestBlocker's `requires` check is just
    // `completed.includes(r)` against the flat `completedSideQuests` array,
    // indifferent to which NPC originally owned that id (confirmed live).
    {
      id: 'ruins_want_ore', kind: 'deliver', target: 'iron_ore', need: 8, deliverTo: 'template-08',
      label: 'The Frozen Pass digs good ore from that mountain — bring 8 iron ore to the Old Ruins',
      xpSkill: 'mining', xp: 60, rewardItems: { gold: 25 },
      requires: ['settle_clear', 'frostpass_clear'],
    },
    // Wave 47 (B5/B7) · a real settlement raid (game/settlementRaid.ts),
    // not flavor text — this errand only closes when resolveSettlementRaid
    // (gameStore.ts) calls bumpSideQuest('defend', destId, 1) on a WIN.
    {
      id: 'ruins_hold_the_line', kind: 'defend', target: 'template-08', need: 1,
      label: "Rival riders test any claim that's picked a side — hold Fenwick when they come for it.",
      xpSkill: 'combat', xp: 70, rewardItems: { gold: 30 },
      requires: ['ruins_want_ore'],
    },
    // The chain's first real "growth" milestone — gated on having actually
    // defended the place, paid off through collectSettlementYield's own
    // per-growthTier bonus (gameStore.ts).
    {
      id: 'ruins_expand', kind: 'gather', target: 'stone', need: 30,
      label: "Fenwick's earned room to grow — bring 30 stone to raise a real granary.",
      xpSkill: 'building', xp: 90, rewardItems: { gold: 35 },
      requires: ['ruins_hold_the_line'],
    },
  ],
  // Wave 26: the empire arc's second site, The Frozen Pass (template-07) —
  // Torvald's own two errands, same depth/shape as Fenwick's pool above
  // (a gather errand opening a kill errand that closes the chain).
  torvald: [
    {
      id: 'frostpass_shelter', kind: 'gather', target: 'stone', need: 20,
      label: 'Shore up a shelter against the mountain wind — bring 20 stone',
      xpSkill: 'mining', xp: 60, rewardItems: { gold: 15 },
    },
    {
      id: 'frostpass_clear', kind: 'kill', target: 'any', need: 6,
      label: 'Clear the wildlife off the high trail before the deed is filed — defeat 6 hostiles',
      xpSkill: 'combat', xp: 80, rewardItems: { gold: 20 },
      requires: ['frostpass_shelter'],
    },
    // Wave 27 · same reciprocal-delivery shape as ruins_want_ore above, the
    // other direction.
    {
      id: 'pass_want_grain', kind: 'deliver', target: 'wheat', need: 10, deliverTo: 'template-07',
      label: 'Nothing grows on this mountain — bring 10 wheat up from the Old Ruins',
      xpSkill: 'farming', xp: 60, rewardItems: { gold: 25 },
      requires: ['frostpass_clear', 'settle_clear'],
    },
    // The caravan mechanic's own quest — advanced by a real collectCaravan()
    // call (gameStore.ts), not by carrying anything yourself (see the new
    // 'caravan' SideQuestDef.kind, npcs.ts).
    {
      id: 'first_caravan', kind: 'caravan', target: 'any', need: 1,
      label: 'Run a trade caravan between your two settlements — the road will pay for itself',
      xpSkill: 'building', xp: 40, rewardItems: { gold: 20 },
      requires: ['settle_clear', 'frostpass_clear'],
    },
    // Wave 44 · the empire arc's third site, The Siege Camp (template-04),
    // wants stone rather than ore or grain — closes the loop the OTHER
    // direction from garrick's own pass_want_stone-mirrored errand below.
    // Routed to Frozen Pass rather than Old Ruins on purpose: Old Ruins
    // already imports iron_ore FROM Frozen Pass (ruins_want_ore above), so
    // having an ore-exporter also import ore back would read backwards;
    // stone fits both a mountain pass that already once wanted stone itself
    // (frostpass_shelter, same chain) and a ruined siege camp that has
    // masonry to spare.
    {
      id: 'pass_want_stone', kind: 'deliver', target: 'stone', need: 15, deliverTo: 'template-07',
      label: "Good masonry's rare up this high — haul 15 stone from the Siege Camp's own ruined walls",
      xpSkill: 'mining', xp: 60, rewardItems: { gold: 25 },
      requires: ['frostpass_clear', 'camp_clear'],
    },
    // Wave 47 (B5/B7) · same real-raid-defense shape as ruins_hold_the_line
    // above — see that entry's own comment.
    {
      id: 'frostpass_hold_the_line', kind: 'defend', target: 'template-07', need: 1,
      label: "A claim on a mountain pass draws its own kind of rival — hold Torvald's ground when they come testing it.",
      xpSkill: 'combat', xp: 70, rewardItems: { gold: 30 },
      requires: ['pass_want_stone'],
    },
    {
      id: 'frostpass_expand', kind: 'gather', target: 'iron_ore', need: 15,
      label: "The vein runs deeper than first thought — bring 15 iron ore to sink a real shaft.",
      xpSkill: 'mining', xp: 90, rewardItems: { gold: 35 },
      requires: ['frostpass_hold_the_line'],
    },
  ],
  // Wave 44: the empire arc's third site, The Siege Camp (template-04) --
  // Garrick's own two-errand chain (same gather-then-kill shape as
  // fenwick/torvald above) plus a reciprocal delivery quest the other
  // direction (see torvald's own pass_want_stone above for its pair).
  // Deliberately targets `wood`, a raw `kind:'gather'`-harvestable
  // good, not a crafted good like `iron_bar` -- bumpSideQuest's matchesKind
  // (gameStore.ts) only ever cross-matches `kind:'deliver'` with
  // `kind:'gather'` bumps, never `kind:'craft'` (the exact bug class Wave 34
  // fixed at five other real sites -- see GUILD_QUESTS' own header comment
  // just below in npcs.ts) -- an iron_bar-deliver quest here would have been
  // silently unfinishable.
  garrick: [
    {
      id: 'camp_shore', kind: 'gather', target: 'stone', need: 20,
      label: "Shore up what's left of the palisade — bring 20 stone",
      xpSkill: 'building', xp: 60, rewardItems: { gold: 15 },
    },
    {
      id: 'camp_clear', kind: 'kill', target: 'any', need: 6,
      label: "Clear out whatever's nesting round the old engine — defeat 6 hostiles",
      xpSkill: 'combat', xp: 80, rewardItems: { gold: 20 },
      requires: ['camp_shore'],
    },
    {
      id: 'camp_want_lumber', kind: 'deliver', target: 'wood', need: 10, deliverTo: 'template-04',
      label: 'Timber for the palisade — the Lodge folk have plenty; bring 10 wood to the Siege Camp',
      xpSkill: 'woodcutting', xp: 60, rewardItems: { gold: 25 },
      requires: ['camp_clear', 'frostpass_clear'],
    },
    // Wave 47 (B5/B7) · same real-raid-defense shape as ruins_hold_the_line
    // above — see that entry's own comment.
    {
      id: 'camp_hold_the_line', kind: 'defend', target: 'template-04', need: 1,
      label: "An old siege camp draws its own kind of trouble — hold this ground when rivals come testing it.",
      xpSkill: 'combat', xp: 70, rewardItems: { gold: 30 },
      requires: ['camp_want_lumber'],
    },
    {
      id: 'camp_expand', kind: 'gather', target: 'wood', need: 25,
      label: "The palisade's held — bring 25 wood to raise a proper watchtower over it.",
      xpSkill: 'woodcutting', xp: 90, rewardItems: { gold: 35 },
      requires: ['camp_hold_the_line'],
    },
  ],
};

/** Wave 47 (B7) · which settlement's own `growthTier` (gameStore.ts's
 *  `settlements` record) advances when the given side-quest id turns in —
 *  read by turnInSideQuest right after the ordinary reward grant, the same
 *  narrow hand-named-side-effect precedent as 'r_squire' recruiting Tam. A
 *  real, permanent yield-tier bump, gated on real completed content
 *  (the defense link each one `requires`), not a second disconnected system. */
export const SETTLEMENT_GROWTH_QUEST_DEST: Record<string, string> = {
  ruins_expand: 'template-08',
  frostpass_expand: 'template-07',
  camp_expand: 'template-04',
};

/** Wave 26 · generalizes `foundSettlement()`/DialoguePanel's settlement UI
 *  (previously hardcoded to Fenwick/template-08 alone — see gameStore.ts's
 *  and DialoguePanel.tsx's own Wave 26 comments) to any destination: the
 *  gold cost, the closing side-quest id that unlocks the deed, and the
 *  named residents who move in once it's filed. template-08's entry is
 *  byte-identical to the values `foundSettlement()` used to hardcode.
 *  template-07's three residents are lumberjack/miner/merchant rather than
 *  Fenwick's farmer/merchant/builder — see SETTLEMENT_NODES just below for
 *  why this site actually has ore/timber for the first two to work. */
export interface SettlementFoundingDef {
  cost: Partial<Record<ItemId, number>>;
  requiredQuestId: string;
  residents: { id: string; name: string; job: VillagerJob }[];
}

export const SETTLEMENT_FOUNDING: Record<string, SettlementFoundingDef> = {
  'template-08': {
    cost: { gold: 60 },
    requiredQuestId: 'settle_clear',
    residents: [
      { id: 'settler_bram', name: 'Bram', job: 'farmer' },
      { id: 'settler_ida', name: 'Ida', job: 'merchant' },
      { id: 'settler_tolan', name: 'Tolan', job: 'builder' },
    ],
  },
  'template-07': {
    cost: { gold: 60 },
    requiredQuestId: 'frostpass_clear',
    residents: [
      { id: 'settler_kolgrim', name: 'Kolgrim', job: 'lumberjack' },
      { id: 'settler_sigrun', name: 'Sigrun', job: 'miner' },
      { id: 'settler_brenna', name: 'Brenna', job: 'merchant' },
    ],
  },
  // Wave 44: the empire arc's third site, The Siege Camp (template-04) — no
  // SETTLEMENT_NODES entry below (see that table's own comment), so
  // residents are farmer/merchant/builder-shaped like template-08's, not
  // node-working like template-07's. `miner` (not `farmer`) fills the
  // node-kind slot: Siege Camp's own travel blurb/loot has zero food/farm
  // subtext, while it at least names "iron" once (a one-time salvage prop,
  // not a promise of a rich vein — see this wave's research notes for why
  // that's not enough to earn real ore nodes on its own). Either way the
  // job falls straight through to villagerAtWork's own "nothing to work —
  // do not stall the economy" fallback (gameStore.ts) with zero matching
  // nodes in this world, identical to Bram's `farmer` at template-08.
  'template-04': {
    cost: { gold: 60 },
    requiredQuestId: 'camp_clear',
    residents: [
      { id: 'settler_rurik', name: 'Rurik', job: 'miner' },
      { id: 'settler_petra', name: 'Petra', job: 'merchant' },
      { id: 'settler_dunstan', name: 'Dunstan', job: 'builder' },
    ],
  },
};

/** Wave 26 · The Frozen Pass gets real hand-placed resource nodes from day
 *  one — unlike template-08 (zero `ResourceNodeState` entries, so Fenwick's
 *  residents are farmer/merchant/builder only), this site's own guild
 *  passive (Woodsmen's Lodge, "Deep Grain") and travel blurb/loot text
 *  ("the exposed rock looks promising for ore") already promise timber and
 *  ore twice over — see this wave's research notes for the full reasoning.
 *  `x`/`z` are destination-LOCAL points (resolveDestPoint's convention, same
 *  as every other hand-placed fixture in npcs.ts/guilds.ts/world.ts as of
 *  2026-08-25) captured live via a teleport survey clear of the Woodsmen's
 *  Lodge hall and the claim banner (both sit at the arrival spawn) — NOT
 *  world-absolute coordinates. gameStore's `seedNodes()` resolves and stamps
 *  `world`/`id`/`respawnAt` itself; `scatterNodesInRect` can't place these
 *  (its `WORLD_HALF` bound rejects every destination coordinate outright —
 *  see that function's own header). Tree `model` is assigned by seedNodes
 *  from the same `TREE_MODELS` rotation scatterNodesInRect uses, not stored
 *  here. 4 trees (a stand worth chopping) + 3 rocks, one flagged `iron`.
 *  14-16m from Torvald's own spot (a settlement's claimed-plot anchor sits
 *  wherever the player stood when filing the deed — realistically right by
 *  him): a live labor-progress watch during this wave's own verification
 *  found a first placement 30-50m out from the settlement anchor left a
 *  lumberjack's trip timer never advancing — reachable "by inspection" per
 *  villagerAtWork's pure-distance logic, but the AI/legacy locomotion that
 *  actually walks a resident there treats a trip this size as more ambient
 *  wander than a committed worksite trip (the same short-local-hops-only
 *  locomotion gap this wave's research flagged, not something to fix here —
 *  see gameStore.ts's villagerAtWork comment). This distance is a real,
 *  live-confirmed fix for that, not a guess — including the iron rock's
 *  own exact spot, nudged a few more metres after the same live watch
 *  found the settlement's actual miner resident settling into a fixed
 *  ambient "home" standing spot just outside every rock's WORK_RANGE (the
 *  lumberjack's equivalent spot happened to land close enough to a tree by
 *  luck; the miner's did not, so this one is placed on purpose instead of
 *  trusting the same luck twice). */
export interface SettlementNodeDef {
  kind: ResourceNodeState['kind'];
  variant?: 'iron';
  x: number;
  z: number;
  scale: number;
  yaw: number;
  hitsLeft: number;
}

export const SETTLEMENT_NODES: Record<string, SettlementNodeDef[]> = {
  'template-07': [
    { kind: 'tree', x: 4060, z: 6880.128, scale: 1.05, yaw: 0.4, hitsLeft: 3 },
    { kind: 'tree', x: 4123.83, z: 6938.618, scale: 0.95, yaw: 2.1, hitsLeft: 3 },
    { kind: 'tree', x: 4156.962, z: 7018.604, scale: 1.15, yaw: 4.0, hitsLeft: 3 },
    { kind: 'tree', x: 4140.306, z: 7101.646, scale: 1, yaw: 5.4, hitsLeft: 3 },
    { kind: 'rock', variant: 'iron', x: 4060, z: 7153.333, scale: 1.1, yaw: 1.2, hitsLeft: 4 },
    { kind: 'rock', x: 4050.159, z: 7246.679, scale: 0.9, yaw: 3.3, hitsLeft: 4 },
    { kind: 'rock', x: 3977.431, z: 7252.572, scale: 1.2, yaw: 5.8, hitsLeft: 4 },
  ],
};
