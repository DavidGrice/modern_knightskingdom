import type { SkillId } from '../types';

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  unlockFlag?: string; // feature flag that gates the skill
}

export const SKILLS: SkillDef[] = [
  { id: 'woodcutting', name: 'Woodcutting', icon: '🪓' },
  { id: 'building', name: 'Building', icon: '🔨' },
  { id: 'combat', name: 'Combat', icon: '⚔️' },
  { id: 'farming', name: 'Farming', icon: '🌾' },
  { id: 'mining', name: 'Mining', icon: '⛏️', unlockFlag: 'mining' },
  { id: 'smithing', name: 'Smithing', icon: '🔥', unlockFlag: 'smithing' },
  { id: 'fishing', name: 'Fishing', icon: '🎣', unlockFlag: 'fishing' },
];

/** xp needed to reach a given level (quadratic curve). */
export function xpForLevel(level: number): number {
  return 50 * level * level;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50));
}

export interface RankDef {
  name: string;
  minTotalLevel: number;
  title: string;
}

// Rank climbs with the sum of all skill levels; the last three also need a
// real gate stacked on top of the level floor (a milestone quest for
// Knight/Paladin, a lifetime boss-capture count for Marshal — see below).
export const RANKS: RankDef[] = [
  { name: 'Peasant', minTotalLevel: 0, title: 'a humble villager' },
  { name: 'Laborer', minTotalLevel: 3, title: 'a hard worker of the realm' },
  { name: 'Squire', minTotalLevel: 8, title: 'sworn to service' },
  { name: 'Knight', minTotalLevel: 16, title: 'defender of the kingdom' },
  { name: 'Paladin', minTotalLevel: 28, title: 'champion of the realm' },
  // Wave 52 (D1): the rank above Paladin. Gated on cedricCaptures >= 1
  // (gameStore.ts) rather than a new quest or the black dragon's own ambient
  // RNG roll — Cedric's Final Stand is player-initiated on demand once
  // unlocked, deterministic to win once attempted, and already the game's
  // own narrative climax for the main antagonist arc. minTotalLevel
  // continues the existing 3/5/8 step-diff sequence's own +1 second-order
  // pattern (12 + 5 = 17) rather than a round-number guess. Two real,
  // already-mechanized consequences ride on this rank existing at all: a 5th
  // perk slot (perkSlotsEarned's index-into-RANKS below) and NG+ eligibility
  // itself moving to require it (MainMenu.tsx's TOP_RANK, by design).
  { name: 'Marshal', minTotalLevel: 45, title: "the King's own right hand" },
];

export function rankFromTotalLevel(total: number, completedQuests: string[], cedricCaptures = 0): RankDef {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (total < r.minTotalLevel) break;
    // the last three ranks additionally require their own real gate
    if (r.name === 'Knight' && !completedQuests.includes('knights_arms')) break;
    if (r.name === 'Paladin' && !completedQuests.includes('paladins_keep')) break;
    if (r.name === 'Marshal' && cedricCaptures < 1) break;
    rank = r;
  }
  return rank;
}

export function totalSkillLevel(xp: Record<SkillId, number>): number {
  return SKILLS.reduce((t, s) => t + levelFromXp(xp[s.id]), 0);
}

// One perk slot per rank-up past Peasant (Laborer/Squire/Knight/Paladin/
// Marshal — 5 chances as of Wave 52), matching each rank's own index in
// RANKS — adding Marshal above made this a 5th slot for free, no change to
// this function itself needed.
export function perkSlotsEarned(xp: Record<SkillId, number>, completedQuests: string[], cedricCaptures = 0): number {
  const rank = rankFromTotalLevel(totalSkillLevel(xp), completedQuests, cedricCaptures);
  return RANKS.findIndex((r) => r.name === rank.name);
}
