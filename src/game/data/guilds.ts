import type { LifetimeStats } from '../types';
import { CHALLENGES, challengeProgress } from './challenges';

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

export const GUILDS: GuildDef[] = [
  {
    id: 'woodsmen', name: "Woodsmen's Lodge", icon: '🪓',
    world: 'template-07', hallX: 2812, hallZ: 884,
    challengeId: 'woodcutter',
    blurb: 'Axe-folk of the high timber. The Lodge asks only that the forest already knows your name.',
    passiveLabel: 'Deep Grain',
    passiveDesc: 'Chopping trees has a 20% chance to yield an extra log.',
  },
  {
    id: 'miners', name: "Miners' Brotherhood", icon: '⛏️',
    world: 'template-08', hallX: 3112, hallZ: 902,
    challengeId: 'quarrier',
    blurb: 'Delvers of the Old Ruins. Stone remembers who splits it with respect.',
    passiveLabel: 'Ore Sense',
    passiveDesc: 'Ordinary boulders give up iron ore far more often.',
  },
  {
    id: 'anglers', name: "Anglers' Circle", icon: '🎣',
    world: 'template-03', hallX: 1586, hallZ: 890,
    challengeId: 'angler',
    blurb: 'Quiet company on the river bank. Patience, then the pull.',
    passiveLabel: 'Read the Water',
    passiveDesc: 'Fish bite noticeably sooner on your line.',
  },
  {
    id: 'builders', name: "Builders' Guild", icon: '🔨',
    world: 'template-04', hallX: 1912, hallZ: 862,
    challengeId: 'architect',
    blurb: 'Engineers of the siege works. Every wall in the realm knows our marks.',
    passiveLabel: 'Master Joinery',
    passiveDesc: 'Every hammer swing on a construction site counts 30% extra.',
  },
  {
    id: 'knights', name: "Knights' Order", icon: '⚔️',
    world: 'template-02', hallX: 1312, hallZ: 884,
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
