import type { LifetimeStats, SkillId } from '../types';

// Wave 52 (D5): every tier now grants a real gold+XP reward (checkChallenges,
// gameStore.ts), indexed by tier position (0=I, 1=II, 2=III) rather than by
// each track's own raw threshold — the 9 tracks aren't on one comparable
// difficulty scale (400 trees vs. 20 dungeon clears vs. 10,000 gold), so
// tier I/II/III's own already-real difficulty curve is the fairer yardstick.
export const CHALLENGE_TIER_REWARD: { gold: number; xp: number }[] = [
  { gold: 15, xp: 40 },
  { gold: 35, xp: 80 },
  { gold: 80, xp: 160 },
];
// golden_fortune has no natural skill to pay XP into — doubled gold instead,
// same tier-indexed shape as the table above.
export const GOLDEN_FORTUNE_GOLD = [30, 70, 160];

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
  /** Wave 52 (D5): which skill a tier reward pays XP into (null for
   *  golden_fortune, which has none — see GOLDEN_FORTUNE_GOLD instead). */
  skill: SkillId | null;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'woodcutter', name: 'Woodcutter', icon: '🪓', unit: 'trees chopped',
    metric: (s) => s.nodesHarvested.tree ?? 0,
    skill: 'woodcutting',
    tiers: [
      { threshold: 25, label: 'Woodcutter I' },
      { threshold: 100, label: 'Woodcutter II' },
      { threshold: 400, label: 'Woodcutter III' },
    ],
  },
  {
    id: 'quarrier', name: 'Quarrier', icon: '⛏️', unit: 'rocks mined',
    metric: (s) => s.nodesHarvested.rock ?? 0,
    skill: 'mining',
    tiers: [
      { threshold: 25, label: 'Quarrier I' },
      { threshold: 100, label: 'Quarrier II' },
      { threshold: 400, label: 'Quarrier III' },
    ],
  },
  {
    id: 'angler', name: 'Angler', icon: '🎣', unit: 'fish caught',
    metric: (s) => s.nodesHarvested.fishing ?? 0,
    skill: 'fishing',
    tiers: [
      { threshold: 10, label: 'Angler I' },
      { threshold: 50, label: 'Angler II' },
      { threshold: 200, label: 'Angler III' },
    ],
  },
  {
    id: 'herbalist', name: 'Herbalist', icon: '🌿', unit: 'herbs foraged',
    metric: (s) => s.nodesHarvested.herb ?? 0,
    // matches harvestNode's own existing herb -> farming XP mapping (gameStore.ts)
    skill: 'farming',
    tiers: [
      { threshold: 10, label: 'Herbalist I' },
      { threshold: 50, label: 'Herbalist II' },
      { threshold: 200, label: 'Herbalist III' },
    ],
  },
  {
    id: 'architect', name: 'Architect', icon: '🏰', unit: 'pieces placed',
    metric: (s) => s.buildingsPlaced,
    skill: 'building',
    tiers: [
      { threshold: 10, label: 'Architect I' },
      { threshold: 50, label: 'Architect II' },
      { threshold: 200, label: 'Architect III' },
    ],
  },
  {
    id: 'monster_hunter', name: 'Monster Hunter', icon: '⚔️', unit: 'foes defeated',
    metric: (s) => s.kills,
    skill: 'combat',
    tiers: [
      { threshold: 10, label: 'Monster Hunter I' },
      { threshold: 50, label: 'Monster Hunter II' },
      { threshold: 200, label: 'Monster Hunter III' },
    ],
  },
  {
    id: 'dungeon_delver', name: 'Dungeon Delver', icon: '🗝️', unit: 'crypts cleared',
    metric: (s) => s.dungeonsCleared,
    skill: 'combat',
    tiers: [
      { threshold: 1, label: 'Dungeon Delver I' },
      { threshold: 5, label: 'Dungeon Delver II' },
      { threshold: 20, label: 'Dungeon Delver III' },
    ],
  },
  {
    id: 'golden_fortune', name: 'Golden Fortune', icon: '💰', unit: 'gold earned',
    metric: (s) => s.goldEarnedLifetime,
    skill: null,
    tiers: [
      { threshold: 100, label: 'Golden Fortune I' },
      { threshold: 1000, label: 'Golden Fortune II' },
      { threshold: 10000, label: 'Golden Fortune III' },
    ],
  },
  {
    id: 'artisan', name: 'Artisan', icon: '🔨', unit: 'items crafted',
    metric: (s) => s.itemsCrafted,
    skill: 'smithing',
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
