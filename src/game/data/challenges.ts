import type { LifetimeStats } from '../types';

// Challenges: unlike Deeds (one-shot, may reference state that can un-become
// true), every metric here is a monotonically-increasing lifetime counter —
// the current tier is always derivable straight from `stats`, no separate
// "earned" flag needs persisting. Only the *highest tier already notified*
// (gameStore's `challengeTiers`) needs remembering, so a milestone doesn't
// re-announce itself every time checkChallenges() runs.
export interface ChallengeTier {
  threshold: number;
  label: string;
}

export interface ChallengeDef {
  id: string;
  name: string;
  icon: string;
  unit: string;
  metric: (s: LifetimeStats) => number;
  tiers: ChallengeTier[]; // ascending thresholds
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'woodcutter', name: 'Woodcutter', icon: '🪓', unit: 'trees chopped',
    metric: (s) => s.nodesHarvested.tree ?? 0,
    tiers: [
      { threshold: 25, label: 'Woodcutter I' },
      { threshold: 100, label: 'Woodcutter II' },
      { threshold: 400, label: 'Woodcutter III' },
    ],
  },
  {
    id: 'quarrier', name: 'Quarrier', icon: '⛏️', unit: 'rocks mined',
    metric: (s) => s.nodesHarvested.rock ?? 0,
    tiers: [
      { threshold: 25, label: 'Quarrier I' },
      { threshold: 100, label: 'Quarrier II' },
      { threshold: 400, label: 'Quarrier III' },
    ],
  },
  {
    id: 'angler', name: 'Angler', icon: '🎣', unit: 'fish caught',
    metric: (s) => s.nodesHarvested.fishing ?? 0,
    tiers: [
      { threshold: 10, label: 'Angler I' },
      { threshold: 50, label: 'Angler II' },
      { threshold: 200, label: 'Angler III' },
    ],
  },
  {
    id: 'herbalist', name: 'Herbalist', icon: '🌿', unit: 'herbs foraged',
    metric: (s) => s.nodesHarvested.herb ?? 0,
    tiers: [
      { threshold: 10, label: 'Herbalist I' },
      { threshold: 50, label: 'Herbalist II' },
      { threshold: 200, label: 'Herbalist III' },
    ],
  },
  {
    id: 'architect', name: 'Architect', icon: '🏰', unit: 'pieces placed',
    metric: (s) => s.buildingsPlaced,
    tiers: [
      { threshold: 10, label: 'Architect I' },
      { threshold: 50, label: 'Architect II' },
      { threshold: 200, label: 'Architect III' },
    ],
  },
  {
    id: 'monster_hunter', name: 'Monster Hunter', icon: '⚔️', unit: 'foes defeated',
    metric: (s) => s.kills,
    tiers: [
      { threshold: 10, label: 'Monster Hunter I' },
      { threshold: 50, label: 'Monster Hunter II' },
      { threshold: 200, label: 'Monster Hunter III' },
    ],
  },
  {
    id: 'dungeon_delver', name: 'Dungeon Delver', icon: '🗝️', unit: 'crypts cleared',
    metric: (s) => s.dungeonsCleared,
    tiers: [
      { threshold: 1, label: 'Dungeon Delver I' },
      { threshold: 5, label: 'Dungeon Delver II' },
      { threshold: 20, label: 'Dungeon Delver III' },
    ],
  },
  {
    id: 'golden_fortune', name: 'Golden Fortune', icon: '💰', unit: 'gold earned',
    metric: (s) => s.goldEarnedLifetime,
    tiers: [
      { threshold: 100, label: 'Golden Fortune I' },
      { threshold: 1000, label: 'Golden Fortune II' },
      { threshold: 10000, label: 'Golden Fortune III' },
    ],
  },
  {
    id: 'artisan', name: 'Artisan', icon: '🔨', unit: 'items crafted',
    metric: (s) => s.itemsCrafted,
    tiers: [
      { threshold: 10, label: 'Artisan I' },
      { threshold: 50, label: 'Artisan II' },
      { threshold: 200, label: 'Artisan III' },
    ],
  },
];

/** index of the highest tier reached (-1 if none), and progress toward the next */
export function challengeProgress(def: ChallengeDef, stats: LifetimeStats) {
  const value = def.metric(stats);
  let tierIndex = -1;
  for (let i = 0; i < def.tiers.length; i++) {
    if (value >= def.tiers[i].threshold) tierIndex = i;
  }
  const next = def.tiers[tierIndex + 1] ?? null;
  const prevThreshold = tierIndex >= 0 ? def.tiers[tierIndex].threshold : 0;
  return { value, tierIndex, next, prevThreshold };
}
