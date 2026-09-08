// Wave 47 (B5) — rival raids against a founded settlement. Mirrors
// challengeModes.ts's Defend-the-Plot shape exactly: run-local, unsaved
// state, no store import here (SettlementRaidRunner.tsx, the component that
// ticks this every frame, imports useGameStore/useEnemyStore itself —
// mirrors ChallengeRunner.tsx's own split from challengeModes.ts).
//
// Scope call (this wave's design pass, re-verified live rather than
// assumed): a settlement CHANGING HANDS — permanent ownership transfer to a
// rival raid — is deliberately NOT built. Two real reasons: (1) the
// instance-separation architecture only ticks home (`world===null`) enemies
// while the player is away (combat.ts's EnemyData.world doctrine), so a
// raid against a settlement can only ever be a LIVE fight the player is
// standing in — it cannot besiege a settlement left unattended, which
// undercuts the "at risk even when you're not looking" framing full
// ownership-loss would need to feel earned; (2) permanently deleting
// hand-founded content (named residents, real quest-chain prerequisites
// elsewhere) is a one-way commitment far bigger than "add rival raids"
// implies, and deserves its own dedicated design pass. What IS real and
// felt: a raid that can genuinely fail — costing a delayed yield collection
// (SETTLEMENT_RAID_YIELD_PENALTY_MS below), never a destroyed settlement.
//
// Also deliberately narrowed: no named-boss cameos (Cedric/Gilbert/Weezil)
// at a settlement raid — that flavor stays exclusive to his own home arc;
// a settlement raid reads as anonymous "rival pressure" from whichever
// house the player has NOT been leaning toward.
import { contestedPressure, leaningHouse } from './data/allegiance';

export const SETTLEMENT_RAID_BASE_COOLDOWN_MS = 15 * 60_000; // real minutes, no pressure
export const SETTLEMENT_RAID_MIN_COOLDOWN_MS = 6 * 60_000;   // floor at max contested pressure
export const SETTLEMENT_RAID_TIME_MS = 100_000;
export const SETTLEMENT_RAID_START_HP = 120;
export const SETTLEMENT_RAID_DRAIN_PER_SEC = 6;
export const SETTLEMENT_RAID_PROXIMITY_RADIUS = 9;
export const SETTLEMENT_RAID_SPAWN_INTERVAL_S = 5;
/** Wave 47 (B5) · the real, reversible loss consequence — a failed defense
 *  pushes the settlement's own `lastCollectedAt` forward this much, delaying
 *  (never voiding) the next yield collection. Same order of magnitude as
 *  TAX_COOLDOWN_MS (gameStore.ts), not a separate invented scale. */
export const SETTLEMENT_RAID_YIELD_PENALTY_MS = 5 * 60_000;

export interface SettlementRaidState {
  active: boolean;
  destId: string | null;
  deadline: number; // performance.now() timestamp
  plotHp: number;
}
export const settlementRaidState: SettlementRaidState = {
  active: false, destId: null, deadline: 0, plotHp: SETTLEMENT_RAID_START_HP,
};

/** Interpolates base -> min cooldown by contestedPressure — the more
 *  contested your standing, the more often a claim gets tested. */
export function settlementRaidCooldownMs(allegiance: number): number {
  const p = contestedPressure(allegiance);
  return SETTLEMENT_RAID_BASE_COOLDOWN_MS - (SETTLEMENT_RAID_BASE_COOLDOWN_MS - SETTLEMENT_RAID_MIN_COOLDOWN_MS) * p;
}

/** Which enemy kinds (game/combat.ts's EnemyKind — kept as plain strings
 *  here rather than importing that type, the same "leaf module stays clear
 *  of combat.ts" convention arena.ts/challengeModes.ts already established)
 *  make up a raid, or null when no raid is possible at all. Genuinely
 *  neutral standing (the -10..10 Unsworn band) means NEITHER house has
 *  reason to test your claims — staying unsworn is the safe choice, by
 *  design, not an oversight. */
export function settlementRaiderKinds(allegiance: number): string[] | null {
  const house = leaningHouse(allegiance);
  if (house === null) return null;
  // Cedric's own war party retaliates against a crown-leaning claim; the
  // crown's knights move on a traitor's claim the other way. 'mountedRaider'
  // is a plain reusable rigged-prop kind (see combat.ts's own EnemyData.
  // mountAsset — a generic asset id, not scoped to Cedric's camp), not a
  // lore-exclusive unit, so both sides fielding it is not a contradiction.
  return house === 'leo' ? ['bandit', 'mountedRaider'] : ['royal', 'mountedRaider'];
}

/** 3..5 live raiders at once, scaling with contestedPressure. */
export function settlementRaidMaxLive(allegiance: number): number {
  return Math.round(3 + contestedPressure(allegiance) * 2);
}

export function startSettlementRaid(destId: string) {
  settlementRaidState.active = true;
  settlementRaidState.destId = destId;
  settlementRaidState.deadline = performance.now() + SETTLEMENT_RAID_TIME_MS;
  settlementRaidState.plotHp = SETTLEMENT_RAID_START_HP;
}

if (typeof window !== 'undefined') {
  // mirrors challengeModes.ts's __kkchallenges — live verification doesn't
  // have to wait for real dusk + real allegiance extremity + a real cooldown
  (window as unknown as Record<string, unknown>).__kksettlementraid = {
    state: settlementRaidState,
    cooldownMs: settlementRaidCooldownMs,
    raiderKinds: settlementRaiderKinds,
    maxLive: settlementRaidMaxLive,
    start: startSettlementRaid,
  };
}
