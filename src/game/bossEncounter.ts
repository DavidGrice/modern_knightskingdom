'use client';
// Wave 38 (A1) · the shared shape the three tier-scaling bosses (the green
// dragon, Cedric's own black dragon, Cedric's final stand) read from, so
// scaling lives in one place instead of three copies — see
// BlackDragonSiege.tsx's own now-retired local formula. Storm's Battle Dome
// deliberately has no BossId here: she's a 1-HP "first hit ends it" duel
// with no tier gate at all, and her own reputation-driven reaction-speed
// curve (Enemies.tsx) is already her real "gets harder" answer — force-
// fitting her would break the mechanic, not generalize it.
//
// Leaf module, same role as cedricSiege.ts/raiderRam.ts: reads difficulty.ts
// one-directionally; nothing the store imports touches this, so
// combat.ts -> bossEncounter.ts -> difficulty.ts -> gameStore.ts stays a
// one-way chain with no cycle.
import { DRAGON_TIER, BLACK_DRAGON_TIER, CEDRIC_SIEGE_TIER, difficultyState } from './difficulty';
import type { ItemId } from './types';

export type BossId = 'dragon' | 'blackDragon' | 'cedric';

export interface BossEncounter {
  unlockTier: number;
  /** seconds in before a reinforcement/escalation phase, if still standing —
   *  undefined = a flat single-phase fight (both dragons today) */
  reinforceAt?: number;
}

export const BOSS_ENCOUNTERS: Record<BossId, BossEncounter> = {
  dragon: { unlockTier: DRAGON_TIER },
  blackDragon: { unlockTier: BLACK_DRAGON_TIER },
  cedric: { unlockTier: CEDRIC_SIEGE_TIER, reinforceAt: 20 }, // was CedricSiege.tsx's own FINAL_STAND_REINFORCE_AT
};

const BOSS_TIER_STEP = 0.15; // tunable: %/tier climbed past the fight's own unlock

/** Multiplier for that fight's own base hits-to-rout/HP. Relative to the
 *  FIGHT'S OWN unlock tier, not tier 0, so a player who just cleared the
 *  gate meets it exactly as tuned; only climbing further makes it harder.
 *  (Black dragon's own numbers won't move under today's TIER_RULES, since
 *  BLACK_DRAGON_TIER already sits at the curve's ceiling — same as before,
 *  just no longer a duplicated formula.) */
export function bossTierScale(id: BossId): number {
  return 1 + Math.max(0, difficultyState.tier - BOSS_ENCOUNTERS[id].unlockTier) * BOSS_TIER_STEP;
}

export interface BossReward { items: Partial<Record<ItemId, number>>; xp: number }

/** A real reward for winning outright — separate from each siege's own
 *  "weathered it" consolation (left inline, unchanged, per fight). */
export const BOSS_VICTORY_REWARD: Record<BossId, BossReward> = {
  dragon: { items: { gold: 25, iron_bar: 1, plank: 3 }, xp: 30 },       // NEW — was nothing
  blackDragon: { items: { gold: 50, iron_bar: 3, plank: 4 }, xp: 60 }, // moved verbatim, unchanged
  cedric: { items: { gold: 70, iron_bar: 4, plank: 6, stone: 6 }, xp: 90 }, // NEW: rematch-only reward
};
