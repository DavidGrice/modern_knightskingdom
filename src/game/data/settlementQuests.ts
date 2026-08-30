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
  ],
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
