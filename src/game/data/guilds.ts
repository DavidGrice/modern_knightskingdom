import type { LifetimeStats } from '../types';
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
  },
  {
    id: 'miners', name: "Miners' Brotherhood", icon: '⛏️',
    world: 'template-08', hallX: MINERS_HALL.x, hallZ: MINERS_HALL.z,
    challengeId: 'quarrier',
    blurb: 'Delvers of the Old Ruins. Stone remembers who splits it with respect.',
    passiveLabel: 'Ore Sense',
    passiveDesc: 'Ordinary boulders give up iron ore far more often.',
  },
  {
    id: 'anglers', name: "Anglers' Circle", icon: '🎣',
    world: 'template-03', hallX: ANGLERS_HALL.x, hallZ: ANGLERS_HALL.z,
    challengeId: 'angler',
    blurb: 'Quiet company on the river bank. Patience, then the pull.',
    passiveLabel: 'Read the Water',
    passiveDesc: 'Fish bite noticeably sooner on your line.',
  },
  {
    id: 'builders', name: "Builders' Guild", icon: '🔨',
    world: 'template-04', hallX: BUILDERS_HALL.x, hallZ: BUILDERS_HALL.z,
    challengeId: 'architect',
    blurb: 'Engineers of the siege works. Every wall in the realm knows our marks.',
    passiveLabel: 'Master Joinery',
    passiveDesc: 'Every hammer swing on a construction site counts 30% extra.',
  },
  {
    id: 'knights', name: "Knights' Order", icon: '⚔️',
    world: 'template-02', hallX: KNIGHTS_HALL.x, hallZ: KNIGHTS_HALL.z,
    challengeId: 'monster_hunter',
    blurb: 'Sworn blades of the tourney field. Strength proven, strength shared.',
    passiveLabel: 'Weight of the Order',
    passiveDesc: 'Your melee blows strike +1 harder.',
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
