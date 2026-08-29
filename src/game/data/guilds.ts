import type { ItemId, LifetimeStats } from '../types';
import { CHALLENGES, challengeProgress } from './challenges';
import { resolveDestPoint, WORLD_DESTINATION_BY_ID } from './worlds';

// Guilds (Phase 21): five orders of the realm, each headquartered in a
// different instance of the Kingdom (their halls are rendered by
// GuildHalls.tsx near each world's travel landing). Membership is earned —
// the door only opens once the matching Challenge track (the lifetime-stats
// milestones shipped in Phase 19) has reached tier I — and a player carries
// ONE primary guild at a time: joining is free, but changing banners later
// costs a transfer tithe, making the pick a real identity choice in the
// same spirit as the alliance branch.
/** Wave 22: one guild-exclusive stock row, gated on real membership (checked
 *  by `buyGuildOffer` in gameStore.ts) and, once past the join tier, on rank.
 *  `price` is the TOTAL for `qty` (same convention as data/trade.ts's
 *  BuyOffer) — buyGuildOffer delegates straight to the existing buyOffer
 *  action, so Silver Tongue's discount applies here exactly like it does at
 *  the Merchant's own cart. */
export interface GuildVendorOffer {
  item: ItemId;
  qty: number;
  price: number;
  /** rank index into this guild's own rankTitles (0-based); absent = free at join */
  minRank?: number;
}

export interface GuildDef {
  id: string;
  name: string;
  icon: string;
  world: string;          // destination id whose landing hosts the hall
  hallX: number;          // world-absolute hall marker position
  hallZ: number;
  challengeId: string;    // data/challenges.ts track that gates membership
  blurb: string;          // the guild's own voice, shown in the hall panel
  passiveLabel: string;
  passiveDesc: string;
  /** Wave 22: rank ladder within the guild — same shape/convention as
   *  NpcDef.repTitles (data/npcs.ts), read against gameStore's
   *  `guildRanks[id]` (a standing parallel to, but never merged with, the
   *  existing per-NPC `reputation` record or the continuous allegiance axis
   *  — see gameStore's addGuildRep). Index 0 is always `min: 0`, the title
   *  you carry the moment you join. */
  rankTitles: { min: number; title: string }[];
  /** Wave 22: guild-exclusive stock, gated on real membership + rank. */
  vendor: GuildVendorOffer[];
}

export const SWITCH_TITHE = 25; // gold to change banners after first joining

// 2026-08-21: hallX/hallZ for woodsmen/builders/miners/knights repositioned
// after DEST_WORLD_SCALE's research-spike halving (worlds.ts) moved the real
// walkable-ground rects (templateWalkableFootprint.ts) out from under the
// old hand-placed coordinates. anglers' hall (template-03) was unaffected —
// still 0 distance from the real walkable union at the new scale, left as
// originally placed.
//   knights (template-02): was (1312,884), 46 units outside the union ->
//     nearest-point-in-union + 3-unit inward nudge, live-verified.
//   miners (template-08): was (3112,902), 58 units outside (already 18
//     outside pre-halving — a pre-existing bug this pass also fixes) ->
//     same nearest-in-union nudge, live-verified.
//   woodsmen (template-07) and builders (template-04): the nearest-in-union
//   nudge for these two lands in a real but generic, distant corner of each
//   bake's one huge classified rect — technically valid ground but not a
//   sensible "near the lodge/siege works" spot. Hand-picked via a live
//   walk-around of each diorama instead (same approach worlds.ts's own
//   template-03 river-landing spawn used): woodsmen's new spot sits in a
//   clear, correctly-scaled stretch of the frozen pass with the snowy
//   mountain backdrop in view; builders' new spot is deep inside that
//   bake's only walkable rect, confirmed clean from all four cardinal
//   directions (this diorama's classification genuinely has just the one
//   rect — a separate, pre-existing classification gap, not something a
//   coordinate pick can fix, and already flagged as its own follow-up).
//
// 2026-08-25: every hallX/hallZ below (anglers' included — it broke too at
// the second halving) converted from a hand-typed world x/z to a durable
// LOCAL point resolved via `resolveDestPoint` (worlds.ts) — see that
// function's own 2026-08-25 comment for the scale-invariance proof. Each
// local value is this file's own PRE-halving (0.15-scale) literal above, run
// backward through the same invariant: `local = (worldPos - origin) / 0.15`.
// One exception: Miners' Brotherhood's local Z came out to -249.667 in the
// research spike that recommended this migration — re-derived directly here
// as `(962.65 - 1000) / 0.15 = -249` exactly, and -249 is what's used below.
const WOODSMEN_HALL = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-07'], 3666.667, 7053.333);
const MINERS_HALL = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-08'], 70.6, -249);
const ANGLERS_HALL = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-03'], -93.333, -733.333);
const BUILDERS_HALL = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-04'], 2663.733, 10942.8);
const KNIGHTS_HALL = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-02'], 66.867, -451.6);

export const GUILDS: GuildDef[] = [
  {
    id: 'woodsmen', name: "Woodsmen's Lodge", icon: '🪓',
    world: 'template-07', hallX: WOODSMEN_HALL.x, hallZ: WOODSMEN_HALL.z,
    challengeId: 'woodcutter',
    blurb: 'Axe-folk of the high timber. The Lodge asks only that the forest already knows your name.',
    passiveLabel: 'Deep Grain',
    passiveDesc: 'Chopping trees has a 20% chance to yield an extra log.',
    rankTitles: [
      { min: 0, title: 'Lodge Hand' },
      { min: 30, title: 'Journeyman Woodsman' },
      { min: 80, title: 'Lodge Ranger' },
      { min: 160, title: 'Warden of the Timberline' },
    ],
    vendor: [
      // the axe has no other acquisition path anywhere in the game (no
      // recipe, no starting kit — see classes.ts's own comment) — the Lodge
      // selling it is that long-orphaned item's first real purpose
      { item: 'axe', qty: 1, price: 18 },
      { item: 'plank', qty: 6, price: 14, minRank: 1 },
      { item: 'basket', qty: 1, price: 22, minRank: 2 },
    ],
  },
  {
    id: 'miners', name: "Miners' Brotherhood", icon: '⛏️',
    world: 'template-08', hallX: MINERS_HALL.x, hallZ: MINERS_HALL.z,
    challengeId: 'quarrier',
    blurb: 'Delvers of the Old Ruins. Stone remembers who splits it with respect.',
    passiveLabel: 'Ore Sense',
    passiveDesc: 'Ordinary boulders give up iron ore far more often.',
    rankTitles: [
      { min: 0, title: 'Brotherhood Hand' },
      { min: 30, title: 'Journeyman Miner' },
      { min: 80, title: 'Deep Delver' },
      { min: 160, title: 'Warden of the Old Ruins' },
    ],
    vendor: [
      { item: 'pickaxe', qty: 1, price: 18 },
      { item: 'iron_bar', qty: 3, price: 30, minRank: 1 },
      { item: 'cart', qty: 1, price: 52, minRank: 2 },
    ],
  },
  {
    id: 'anglers', name: "Anglers' Circle", icon: '🎣',
    world: 'template-03', hallX: ANGLERS_HALL.x, hallZ: ANGLERS_HALL.z,
    challengeId: 'angler',
    blurb: 'Quiet company on the river bank. Patience, then the pull.',
    passiveLabel: 'Read the Water',
    passiveDesc: 'Fish bite noticeably sooner on your line.',
    rankTitles: [
      { min: 0, title: 'Circle Hand' },
      { min: 30, title: 'Journeyman Angler' },
      { min: 80, title: 'Riverkeeper' },
      { min: 160, title: 'Master of the Circle' },
    ],
    vendor: [
      { item: 'fishing_rod', qty: 1, price: 15 },
      { item: 'cooked_fish', qty: 4, price: 16, minRank: 1 },
      { item: 'fish_stew', qty: 2, price: 20, minRank: 2 },
    ],
  },
  {
    id: 'builders', name: "Builders' Guild", icon: '🔨',
    world: 'template-04', hallX: BUILDERS_HALL.x, hallZ: BUILDERS_HALL.z,
    challengeId: 'architect',
    blurb: 'Engineers of the siege works. Every wall in the realm knows our marks.',
    passiveLabel: 'Master Joinery',
    passiveDesc: 'Every hammer swing on a construction site counts 30% extra.',
    rankTitles: [
      { min: 0, title: 'Guild Hand' },
      { min: 30, title: 'Journeyman Builder' },
      { min: 80, title: 'Master Joiner' },
      { min: 160, title: 'Warden of the Siege Works' },
    ],
    vendor: [
      { item: 'hammer', qty: 1, price: 18 },
      { item: 'stone', qty: 8, price: 14, minRank: 1 },
      { item: 'cart', qty: 1, price: 50, minRank: 2 },
    ],
  },
  {
    id: 'knights', name: "Knights' Order", icon: '⚔️',
    world: 'template-02', hallX: KNIGHTS_HALL.x, hallZ: KNIGHTS_HALL.z,
    challengeId: 'monster_hunter',
    blurb: 'Sworn blades of the tourney field. Strength proven, strength shared.',
    passiveLabel: 'Weight of the Order',
    passiveDesc: 'Your melee blows strike +1 harder.',
    rankTitles: [
      { min: 0, title: 'Order Squire' },
      { min: 30, title: 'Order Knight' },
      { min: 80, title: 'Blooded Knight' },
      { min: 160, title: 'Champion of the Order' },
    ],
    vendor: [
      { item: 'shield', qty: 1, price: 25 },
      { item: 'halberd', qty: 1, price: 45, minRank: 1 },
      { item: 'chestplate_crested', qty: 1, price: 90, minRank: 2 },
    ],
  },
];

export const GUILD_BY_ID = Object.fromEntries(GUILDS.map((g) => [g.id, g])) as Record<string, GuildDef>;
export const GUILD_BY_WORLD = Object.fromEntries(GUILDS.map((g) => [g.world, g])) as Record<string, GuildDef>;

/** membership gate: the matching Challenge track must have reached tier I */
export function guildEligible(guild: GuildDef, stats: LifetimeStats): boolean {
  const track = CHALLENGES.find((c) => c.id === guild.challengeId);
  if (!track) return false;
  return challengeProgress(track, stats).tierIndex >= 0;
}

// Wave 22: guild rank ladder. `rep` is gameStore's `guildRanks[guild.id] ??
// 0` — never the per-NPC `reputation` record and never the allegiance axis,
// see GuildDef.rankTitles' own doc comment for why those three stay separate.
export function guildRankIndex(guild: GuildDef, rep: number): number {
  let idx = 0;
  for (let i = 0; i < guild.rankTitles.length; i++) if (rep >= guild.rankTitles[i].min) idx = i;
  return idx;
}
export function guildMaxRank(guild: GuildDef): number {
  return guild.rankTitles.length - 1;
}
