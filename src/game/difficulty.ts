'use client';
// Procedural difficulty — ONE threat tier that every spawner reads.
//
// Before this, each spawner invented its own gate. The dragon's was
// `!dragonSeen || builtBuildings < 2`, which two finished buildings clears in
// the first minutes of a game — long before a bow, a crossbow or a single
// arrow is craftable, so the first dragon was an unwinnable fight. Raising
// that number alone would only move the cliff; the real fault was that there
// was no curve to place it on.
//
// Leaf module, per the carts.ts / playerState.ts pattern: it reads the store
// one-directionally and nothing in the store imports it, so there is no cycle.
//
// EVERY INPUT IS MONOTONIC BY CONSTRUCTION. `stats.buildingsPlaced` is the
// lifetime counter, not the current building list — so razing your own walls,
// or a raider doing it for you, cannot walk the difficulty back down. Skill
// levels, lifetime kills and elapsed days only ever rise. That is what makes
// the tier persist across a save with no extra field and no high-water hack.

import { useGameStore } from './store/gameStore';
import { totalSkillLevel } from './data/ranks';

// gameStore does not export its state interface, and widening its API just to
// satisfy this module would be the wrong trade — derive the type instead.
type GameState = ReturnType<typeof useGameStore.getState>;

/** The tier at which the dragon is allowed to come at all (§O7). */
export const DRAGON_TIER = 3;

/** The tier at which Cedric's homestead siege is allowed to come at all —
 *  deliberately past the dragon's own gate, so his siege reads as a further
 *  escalation rather than a coincident threat (game/cedricSiege.ts). */
export const CEDRIC_SIEGE_TIER = 4;

/** Wave 36 (A8) · the tier at which Cedric's OWN black dragon (l7517401,
 *  BlackDragonSiege.tsx) is allowed to come at all — the curve's ceiling,
 *  same as blackDragonAllowed's own dragonRouted requirement below: this is
 *  what the realm sends once a player has both maxed the difficulty curve
 *  AND already proven they can beat a dragon, not a second copy of the
 *  first beast's own unlock. */
export const BLACK_DRAGON_TIER = 5;

/** Wave 36 (A3) · Cedric's own two chargers (l7339231/l7339232) enter his war
 *  party as mounted raiders only once the player has climbed to the same
 *  ceiling tier — an escalation layered ON TOP of the already-tuned tier-4
 *  war party (CEDRIC_SIEGE_TIER above), not part of its first unlock. */
export const MOUNTED_RAIDER_TIER = 5;

/** Wave 37 (A3 remainder) · the tier at which a caster can show up as an
 *  occasional raid-filler replacement (Enemies.tsx's rollBanditFiller) —
 *  deliberately low: it's a glass cannon (KIND_HP.caster = 6), not a
 *  late-game escalation like the mounted raider/black dragon above. */
export const CASTER_TIER = 1;

/** Wave 37 (A3 remainder) · the tier at which a shielded elite can replace a
 *  plain-bandit filler slot — a real defensive mechanic (frontal block)
 *  earns a slightly later unlock than the caster's glass-cannon ranged
 *  threat, though still well before the mid/late-game gates above. */
export const SHIELDED_ELITE_TIER = 2;

export interface TierRule {
  tier: number;
  /** lifetime structures raised */
  structures: number;
  /** summed level across every skill */
  skill: number;
  /** lifetime kills */
  kills: number;
  /** in-game days elapsed */
  days: number;
}

/** A tier is reached when EVERY minimum is met — deliberately an AND, not a
 *  score. A player who only ever builds should not be handed a war, and one
 *  who only ever fights should not be handed a siege of a homestead that
 *  isn't there yet. Tune these; they are the whole difficulty curve. */
export const TIER_RULES: TierRule[] = [
  { tier: 0, structures: 0, skill: 0, kills: 0, days: 0 },
  { tier: 1, structures: 2, skill: 4, kills: 3, days: 1 },
  { tier: 2, structures: 5, skill: 10, kills: 12, days: 3 },
  { tier: 3, structures: 9, skill: 18, kills: 30, days: 5 },
  { tier: 4, structures: 14, skill: 28, kills: 60, days: 8 },
  { tier: 5, structures: 20, skill: 40, kills: 100, days: 12 },
];

export interface ThreatSnapshot {
  tier: number;
  /** can the player actually shoot back — a weapon AND ammunition for it */
  rangedReady: boolean;
  /** the live inputs, so the overlay can show WHY a tier is what it is */
  structures: number;
  skill: number;
  kills: number;
  days: number;
  /** what the next tier is still waiting on; empty at max */
  blocking: string[];
}

/** Mutable mirror, refreshed on store change. Spawners read this every frame
 *  without recomputing (§0.4 of the AI spec: no per-frame allocation). */
export const difficultyState: ThreatSnapshot = {
  tier: 0,
  rangedReady: false,
  structures: 0,
  skill: 0,
  kills: 0,
  days: 0,
  blocking: [],
};

/** A weapon on its own is not a defence. The dragon gate specifically exists
 *  because players met it with no way to reach it, so this asks for the
 *  ammunition too. */
export function rangedReady(st: GameState): boolean {
  const inv = st.inventory;
  const bow = (inv.longbow ?? 0) > 0 && (inv.arrow ?? 0) > 0;
  const bolt = (inv.crossbow ?? 0) > 0 && (inv.bolt ?? 0) > 0;
  return bow || bolt;
}

export function computeThreat(st: GameState): ThreatSnapshot {
  const structures = st.stats.buildingsPlaced ?? 0;
  const skill = totalSkillLevel(st.xp);
  const kills = st.stats.kills ?? 0;
  const days = st.dayCount ?? 0;

  let tier = 0;
  for (let i = 0; i < TIER_RULES.length; i++) {
    const r = TIER_RULES[i];
    if (structures >= r.structures && skill >= r.skill && kills >= r.kills && days >= r.days) {
      tier = r.tier;
    } else {
      break; // tiers are ordered; the first unmet rule is the ceiling
    }
  }

  const next = TIER_RULES[tier + 1];
  const blocking: string[] = [];
  if (next) {
    if (structures < next.structures) blocking.push(`structures ${structures}/${next.structures}`);
    if (skill < next.skill) blocking.push(`skill ${skill}/${next.skill}`);
    if (kills < next.kills) blocking.push(`kills ${kills}/${next.kills}`);
    if (days < next.days) blocking.push(`days ${days}/${next.days}`);
  }

  return { tier, rangedReady: rangedReady(st), structures, skill, kills, days, blocking };
}

function refresh(st: GameState) {
  const s = computeThreat(st);
  difficultyState.tier = s.tier;
  difficultyState.rangedReady = s.rangedReady;
  difficultyState.structures = s.structures;
  difficultyState.skill = s.skill;
  difficultyState.kills = s.kills;
  difficultyState.days = s.days;
  difficultyState.blocking = s.blocking;
}

// Subscribe from the consumer side — the store never learns this file exists.
// Same technique combat.ts already uses to derive maxStamina from perks.
useGameStore.subscribe(refresh);
if (typeof window !== 'undefined') {
  refresh(useGameStore.getState());
  (window as unknown as Record<string, unknown>).__kkdiff = difficultyState;
}

/** May the dragon come at all? Tier gate AND a real means of fighting back.
 *  Both, deliberately: a tier-3 player with no bow is still a spectator. */
export function dragonAllowed(): boolean {
  return difficultyState.tier >= DRAGON_TIER && difficultyState.rangedReady;
}

/** Wave 36 (A8) · may the BLACK dragon come at all? The tier/rangedReady gate
 *  above, plus `dragonRouted` — the flag DragonSiege.tsx's own recordDragonSiege
 *  already sets, once, the first time a player drives the green dragon off
 *  with bolts. Reusing it (rather than a fresh "beaten N dragons" counter of
 *  its own) is the whole point: a harder beast only shows up once the player
 *  has already proven they can win this exact fight. */
export function blackDragonAllowed(st: GameState): boolean {
  return difficultyState.tier >= BLACK_DRAGON_TIER && difficultyState.rangedReady && !!st.dragonRouted;
}

/** Scales raid pressure off the same curve, so raiders and the dragon can no
 *  longer disagree about how far along the player is. */
export function raidStrength(): number {
  return 1 + difficultyState.tier * 0.35;
}
