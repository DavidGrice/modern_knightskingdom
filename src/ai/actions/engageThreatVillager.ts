// Wave 21 — engage_threat_villager: an ORDINARY (non-defender) villager's
// own, much weaker answer to a believed hostile. A distinct action id from
// `engage_threat` on purpose, kept fully separate so nothing here ever
// touches the defender-tuned path (see engageThreat.ts's own header for why
// that file needs its own sign-off). What the two do share is the
// approach/face/swing state machine itself (meleeEngage.ts, CLN-15), which
// neither tunes: every gate and every number below is this action's own.
//
// WHO THIS FIRES FOR, and why each gate exists (Wave 21 investigation —
// checked against the live reasoner math in Reasoner.ts, not assumed):
//
//   - close_quarters: only scores nonzero for a believed hostile already
//     within COMBAT.engageVillager.closeRange (~3.5m, engage.reach+
//     approachStop plus a small margin). Without this, EVERY villager who
//     merely perceived a distant raider would converge on it the instant it
//     was noticed — this is the actual implementation of "only villagers
//     already near the threat when it appears join in", not just a comment
//     saying that's the intent.
//   - brave_enough: courage >= courageThreshold (6) — data/attributes.ts's
//     existing, already-universal 1-10 courage roll, using 5 (the baseline
//     `defenderStrike()` already treats as "no bonus") as the natural zero
//     point. Not every villager wades in; only the above-average-brave ones
//     (~47% of the roster) do.
//   - world_not_too_dangerous: difficultyState.tier <= capableTierMax (1).
//     A villager's numbers are flat and unleveled — unlike a defender, there
//     is no gainDefenderXp-style growth to keep pace with raidStrength()'s
//     own scaling, so past tier 1 this wave's own DPS/TTK simulation shows a
//     villager-vs-skeleton fight turning into a mathematically certain
//     beating, not a fair one.
//   - not_downed: a villager already knocked out by a previous blow must not
//     keep swinging while invisible waiting to recover. Villagers.tsx's own
//     downed early-return freezes their RENDERED position, but does not by
//     itself stop this reasoner from still trying to act for them — this
//     gate is what actually does that.
//
// interruptPriority is 8 — tied with take_cover, and UNCHANGED from a raid's
// perspective: flee_to_safety (survival, 10) still wins outright during a
// real raid and nothing here touches that. This wave's investigation explored
// giving this action raid-priority instead (one above survival) and rejected
// it: real raiders approach gradually (Enemies.tsx's own road walk-in), so the
// one window that override would need — a villager already adjacent to a
// raider inside flee's own 2s minDuration — essentially never occurs, for real
// architectural risk (the first-ever priority above the survival ceiling).
// The real, RELIABLE new content this action adds is entirely the
// between-raid case — a lone night skeleton wandering into the fields, the
// one hostile this game ever spawns at home with `raid: false` — exactly the
// niche take_cover already proved out. (Checked, not assumed: Empire-arc
// settlement residents at a claimed destination — game/store/gameStore.ts's
// `foundSettlement` — DO get a real Agent same as any other non-defender
// villager, but no spawner in this codebase ever raises a hostile in a
// settlement's own world, so this action is exercised in practice only by
// the home roster.)
//
// weight is 3.1, a deliberate hair above take_cover's 3.0: once every gate
// above has already vetted "this specific villager should fight this specific
// hostile right now", the tie should break toward fighting rather than array
// order — the same small, already-precedented category-default deviation
// this codebase uses for haul_to_deposit (1.4 vs work's 1.2).

import { attrsOf } from '@/game/data/attributes';
import { difficultyState } from '@/game/difficulty';
import { useGameStore } from '@/game/store/gameStore';
import { registerVillagerCombat, villagerStrike } from '@/game/villagerCombat';
import { COMBAT } from '../config';
import type { Agent } from '../core/Agent';
import type { Action } from '../core/Reasoner';
import { BOOL_CURVE, type Curve } from '../core/curves';
import { MeleeEngageActivity, threatOf, type MeleeFighter } from './meleeEngage';

/** The `close_quarters` gate's real test — see this file's header. */
function nearEnoughToFight(agent: Agent): boolean {
  const t = threatOf(agent);
  if (!t) return false;
  const d = Math.hypot(t.lastKnownPosition.x - agent.position.x, t.lastKnownPosition.z - agent.position.z);
  return d <= COMBAT.engageVillager.closeRange;
}

/** An ordinary villager's side of the fight: `villagerStrike()`'s flat,
 *  unleveled damage instead of `defenderStrike()`'s formula. Kill bookkeeping
 *  is resolveEnemyKill's 'villager' cause, which mirrors `engage_threat`'s
 *  (kill recorded, loot dropped, player told) but deliberately WITHOUT
 *  `gainDefenderXp` — that is a defender-only leveling field on the
 *  Villager record, and calling it on a farmer's id would start populating
 *  a stray level/xp on a non-defender record for no defined reason.
 *
 *  `isDowned` is the same test the `not_downed` gate below makes, repeated by
 *  the state machine on every update (see meleeEngage.ts for why the gate
 *  alone is not enough). This villager's own HP/downed record
 *  (game/villagerCombat.ts) is owned by Enemies.tsx's damage path. */
const VILLAGER: MeleeFighter = {
  config: COMBAT.engageVillager,
  isDowned: (agent) => registerVillagerCombat(agent.id).state === 'downed',
  blow: (agent) => {
    const villager = useGameStore.getState().villagers.find((v) => v.id === agent.id);
    return villager ? { damage: villagerStrike(), cause: { by: 'villager', villager } } : null;
  },
};

/** Same straight-through ramp `engage_threat` uses: the bool gates above
 *  already guarantee a real, near, capable, brave, undowned villager behind
 *  this number, so a little threat is just a little urgency. */
const threatCurve: Curve = { type: 'linear', m: 1, k: 1, b: 0, c: 0 };

export const ENGAGE_THREAT_VILLAGER: Action = {
  id: 'engage_threat_villager',
  category: 'combat',
  weight: 3.1, // a hair above take_cover's 3.0 — see this file's header
  // Tied with take_cover's 8, deliberately NOT above survival's 10 — see
  // this file's header for the real arithmetic behind that call.
  interruptPriority: 8,
  // engage_threat's own value: a fight is re-decided more often than a
  // retreat, one swing's worth of commitment.
  minDuration: 1.5,
  cooldown: 0,
  considerations: [
    {
      name: 'not_downed',
      input: (agent) => (registerVillagerCombat(agent.id).state === 'downed' ? 0 : 1),
      curve: BOOL_CURVE,
    },
    {
      name: 'brave_enough',
      input: (agent) => (attrsOf(agent.id).courage >= COMBAT.engageVillager.courageThreshold ? 1 : 0),
      curve: BOOL_CURVE,
    },
    {
      name: 'world_not_too_dangerous',
      input: () => (difficultyState.tier <= COMBAT.engageVillager.capableTierMax ? 1 : 0),
      curve: BOOL_CURVE,
    },
    {
      name: 'close_quarters',
      input: (agent) => (nearEnoughToFight(agent) ? 1 : 0),
      curve: BOOL_CURVE,
    },
    { name: 'threat_present', input: (agent) => agent.bb.threatLevel, curve: threatCurve },
    {
      name: 'hostile_believed',
      input: (agent) => (threatOf(agent) ? 1 : 0),
      curve: BOOL_CURVE,
    },
  ],
  createActivity: () => new MeleeEngageActivity(VILLAGER),
};
