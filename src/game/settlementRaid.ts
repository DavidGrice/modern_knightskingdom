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
//
// CLN-20 · the raid's per-frame RULES — the trigger and the fight — live here
// too now (tickSettlementRaid, at the foot of the file), moved out of
// SettlementRaidRunner.tsx's frame loop. Still no store import, and none of
// the enemy store: the game store imports this module, so the frame's store
// snapshot is an argument and the enemy store comes in as `deps`.
import type { EnemyKind } from './data/enemies';
import { HOUSE_NAME, contestedPressure, leaningHouse } from './data/allegiance';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import { worldEnv } from './env';
import { exposeDebug } from '@/lib/debugHooks';
import { tickWaveDefense, type EnemyDeps } from './waveDefense';

const SETTLEMENT_RAID_BASE_COOLDOWN_MS = 15 * 60_000; // real minutes, no pressure
const SETTLEMENT_RAID_MIN_COOLDOWN_MS = 6 * 60_000;   // floor at max contested pressure
const SETTLEMENT_RAID_TIME_MS = 100_000;
export const SETTLEMENT_RAID_START_HP = 120;
export const SETTLEMENT_RAID_DRAIN_PER_SEC = 6;
export const SETTLEMENT_RAID_PROXIMITY_RADIUS = 9;
export const SETTLEMENT_RAID_SPAWN_INTERVAL_S = 5;
/** Wave 47 (B5) · the real, reversible loss consequence — a failed defense
 *  pushes the settlement's own `lastCollectedAt` forward this much, delaying
 *  (never voiding) the next yield collection. Same order of magnitude as
 *  TAX_COOLDOWN_MS (gameStore.ts), not a separate invented scale. */
export const SETTLEMENT_RAID_YIELD_PENALTY_MS = 5 * 60_000;

interface SettlementRaidState {
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

type Store = ReturnType<typeof import('./store/gameStore').useGameStore.getState>;
/** what a frame of the raid reads of the game store: ONE snapshot, taken by the component at the top of its frame */
export type SettlementRaidTickStore = Pick<
  Store,
  'destination' | 'settlements' | 'allegiance' | 'claimedWorlds' | 'notify' | 'resolveSettlementRaid'
>;
/** CLN-20 · the two values of a raid that belong to SettlementRaidRunner (one ref, for the component's lifetime) and
 *  NOT to settlementRaidState: the wave countdown (initial SETTLEMENT_RAID_SPAWN_INTERVAL_S) and whether a raid was
 *  active on the last unpaused frame (initial false). A remount while a raid is on therefore reads as a rising edge
 *  and forces the countdown to 1.5 on its first frame. */
export interface SettlementRaidRun { spawnTimer: number; wasActive: boolean }

/** CLN-20 · one unpaused frame of the settlement raid: SettlementRaidRunner's frame loop from the edge test on (the
 *  component keeps the paused return and the clock read ahead of it — while paused neither the edge nor the
 *  countdown moves, though the wall-clock deadline does). `dt` is the RAW frame delta, `now` the frame's one
 *  `performance.now()`; the trigger's cooldown reads `Date.now()` for itself, and `startSettlementRaid` its own
 *  `performance.now()`.
 *
 *  The edge is tested, and `active` recorded, before anything else: a raid the trigger starts on this frame is
 *  recorded as active only on the NEXT one, which is when its countdown is set to 1.5. The fight's core is
 *  game/waveDefense.ts; what surrounds it is the raid's own — no destId stops the raid, leaving is a loss at the HP
 *  the plot was left with, a missing claim stops the raid AND clears the ground, the kinds and the live cap are
 *  re-read from the player's standing every frame (Unsworn mid-raid: no kinds, nothing spawns, the countdown still
 *  runs down), and a loss notifies AFTER the store has resolved it. */
export function tickSettlementRaid(
  run: SettlementRaidRun,
  st: SettlementRaidTickStore,
  dt: number,
  now: number,
  deps: EnemyDeps,
) {
  const r = settlementRaidState;

  if (r.active && !run.wasActive) run.spawnTimer = 1.5; // first wave arrives quickly
  run.wasActive = r.active;

  // ---------------------------------------------------------------------
  // Trigger — only while standing at a founded settlement, at real dusk+,
  // with a real contested standing, past the settlement's own cooldown.
  if (!r.active) {
    const destId = st.destination;
    const settlement = destId ? st.settlements[destId] : undefined;
    if (!destId || !settlement) return;
    if (worldEnv.night <= 0.62) return;
    const kinds = settlementRaiderKinds(st.allegiance);
    if (!kinds) return; // genuinely Unsworn — no raid is possible, by design
    const cooldownMs = settlementRaidCooldownMs(st.allegiance);
    if (Date.now() - (settlement.lastRaidAt ?? settlement.since) < cooldownMs) return;
    startSettlementRaid(destId);
    // whichever house you have NOT been leaning toward is the one testing
    // this claim — Cedric's men retaliate against a crown-leaning player,
    // the crown's knights move on a traitor's
    const attacker = leaningHouse(st.allegiance) === 'leo' ? 'cedric' : 'leo';
    const destName = WORLD_DESTINATION_BY_ID[destId]?.name ?? 'your settlement';
    st.notify(`${HOUSE_NAME[attacker]}'s riders test your claim at ${destName}!`, true);
    return;
  }

  // ---------------------------------------------------------------------
  // Active raid
  const destId = r.destId;
  if (!destId) { r.active = false; return; }
  if (st.destination !== destId) {
    // left mid-fight — clean up its hostiles immediately and count it a
    // loss at whatever HP the plot was left at, same "can retry on the
    // same ground without destination ever changing" reasoning
    // challengeModes.ts's own Defend branch documents.
    r.active = false;
    deps.removeByWorld(destId);
    st.resolveSettlementRaid(destId, false, r.plotHp / SETTLEMENT_RAID_START_HP);
    return;
  }
  const claim = st.claimedWorlds[destId];
  if (!claim) { r.active = false; deps.removeByWorld(destId); return; }

  const kinds = settlementRaiderKinds(st.allegiance);
  const outcome = tickWaveDefense(run, r, destId, claim, dt, now, {
    kinds: kinds as EnemyKind[] | null,
    maxLive: settlementRaidMaxLive(st.allegiance),
    intervalS: SETTLEMENT_RAID_SPAWN_INTERVAL_S,
    drainPerSec: SETTLEMENT_RAID_DRAIN_PER_SEC,
    proximityRadius: SETTLEMENT_RAID_PROXIMITY_RADIUS,
  }, deps);
  if (outcome === 'lost') {
    r.plotHp = 0;
    r.active = false;
    deps.removeByWorld(destId);
    st.resolveSettlementRaid(destId, false, 0);
    st.notify(`The raid overwhelms the watch — ${WORLD_DESTINATION_BY_ID[destId]?.name ?? 'the settlement'}'s next yield will be late.`);
  } else if (outcome === 'won') {
    r.active = false;
    deps.removeByWorld(destId);
    st.resolveSettlementRaid(destId, true, r.plotHp / SETTLEMENT_RAID_START_HP);
  }
}

// mirrors challengeModes.ts's __kkchallenges — live verification doesn't
// have to wait for real dusk + real allegiance extremity + a real cooldown
exposeDebug('__kksettlementraid', {
  state: settlementRaidState,
  cooldownMs: settlementRaidCooldownMs,
  raiderKinds: settlementRaiderKinds,
  maxLive: settlementRaidMaxLive,
  start: startSettlementRaid,
});
