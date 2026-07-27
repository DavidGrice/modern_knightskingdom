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

// Rank climbs with the sum of all skill levels; the last two also need their quests.
export const RANKS: RankDef[] = [
  { name: 'Peasant', minTotalLevel: 0, title: 'a humble villager' },
  { name: 'Laborer', minTotalLevel: 3, title: 'a hard worker of the realm' },
  { name: 'Squire', minTotalLevel: 8, title: 'sworn to service' },
  { name: 'Knight', minTotalLevel: 16, title: 'defender of the kingdom' },
  { name: 'Paladin', minTotalLevel: 28, title: 'champion of the realm' },
];

export function rankFromTotalLevel(total: number, completedQuests: string[]): RankDef {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (total < r.minTotalLevel) break;
    // the last two ranks additionally require their milestone quests
    if (r.name === 'Knight' && !completedQuests.includes('knights_arms')) break;
    if (r.name === 'Paladin' && !completedQuests.includes('paladins_keep')) break;
    rank = r;
  }
  return rank;
}

export function totalSkillLevel(xp: Record<SkillId, number>): number {
  return SKILLS.reduce((t, s) => t + levelFromXp(xp[s.id]), 0);
}

// One perk slot per rank-up past Peasant (Laborer/Squire/Knight/Paladin —
// 4 chances), matching each rank's own index in RANKS.
export function perkSlotsEarned(xp: Record<SkillId, number>, completedQuests: string[]): number {
  const rank = rankFromTotalLevel(totalSkillLevel(xp), completedQuests);
  return RANKS.findIndex((r) => r.name === rank.name);
}
