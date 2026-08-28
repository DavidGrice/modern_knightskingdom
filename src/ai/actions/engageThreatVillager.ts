// Wave 21 — engage_threat_villager: an ORDINARY (non-defender) villager's
// own, much weaker answer to a believed hostile. A distinct action id from
// `engage_threat` on purpose, kept fully separate so nothing here ever
// touches the defender-tuned path (see engageThreat.ts's own header for why
// that file needs its own sign-off) — the only piece of it this reuses is
// the live-target resolution helper (`liveTargetFor`, exported from there for
// exactly this), which is the one part of "resolve a belief id to a real
// entity to hit" that is not safe to fork.
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

import { lootFor } from '@/game/combat';
import { attrsOf } from '@/game/data/attributes';
import { difficultyState } from '@/game/difficulty';
import { useGameStore } from '@/game/store/gameStore';
import { registerVillagerCombat, villagerStrike } from '@/game/villagerCombat';
import { COMBAT } from '../config';
import type { Agent } from '../core/Agent';
import type { Belief } from '../core/Blackboard';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';
import { nearestNoticedHostile } from '../perception/Belief';
import { clearCombatState, combatStateFor } from './combatState';
import { liveTargetFor } from './engageThreat';

/** Same reserved reaction clip `engage_threat` uses — see that file's own
 *  comment on why it's kept out of `idle_fidget`'s pool. */
const SWING_CLIP = 'anim_g_swordswish';

function threatOf(agent: Agent): Belief | null {
  return nearestNoticedHostile(agent.bb, agent.position.x, agent.position.z);
}

/** The `close_quarters` gate's real test — see this file's header. */
function nearEnoughToFight(agent: Agent): boolean {
  const t = threatOf(agent);
  if (!t) return false;
  const d = Math.hypot(t.lastKnownPosition.x - agent.position.x, t.lastKnownPosition.z - agent.position.z);
  return d <= COMBAT.engageVillager.closeRange;
}

/** Structured exactly like `engageThreat.ts`'s own `EngageThreatActivity` —
 *  same approach/face/swing state machine, same live-target adjudication at
 *  the moment of the blow — just swinging for `villagerStrike()`'s flat,
 *  unleveled damage instead of `defenderStrike()`'s formula. */
class EngageThreatVillagerActivity implements Activity {
  private swingCd = 0;
  private aimedX = 0;
  private aimedZ = 0;
  private facingX = 0;
  private facingZ = 0;
  private closing = false;

  start(agent: Agent, _ctx: Context): void {
    this.swingCd = 0;
    const t = threatOf(agent);
    if (!t) return; // update() fails cleanly on the next tick
    const cs = combatStateFor(agent.id);
    cs.mode = 'engage';
    cs.hits = 0;
    this.approach(agent, t);
  }

  update(agent: Agent, dt: number, now: number): ActivityStatus {
    // A blow landed (Enemies.tsx) between this tick's scoring and this
    // Activity's own next think — `not_downed`'s gate only stops a NEW
    // engage from starting, it cannot reach back and cancel one already
    // mid-swing this same tick. SUCCESS, not RUNNING: ending cleanly here is
    // what makes the "gated running action loses its protection" rule
    // (documented in flee.ts/takeCover.ts) actually bite on the very next
    // pickAction instead of leaving one more strike() to land while downed.
    if (registerVillagerCombat(agent.id).state === 'downed') { clearCombatState(agent.id); return 'SUCCESS'; }
    if (this.swingCd > 0) this.swingCd -= dt;
    combatStateFor(agent.id).swingCd = this.swingCd;
    const t = threatOf(agent);
    if (!t) { clearCombatState(agent.id); return 'SUCCESS'; }

    const cfg = COMBAT.engageVillager;
    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    const dist = Math.hypot(tx - agent.position.x, tz - agent.position.z);

    if (dist > cfg.reach) {
      if (!this.closing || Math.hypot(tx - this.aimedX, tz - this.aimedZ) > 1) this.approach(agent, t);
      return 'RUNNING';
    }

    if (!t.isVisibleNow && now - t.lastSeenAt > cfg.loseTargetSec) {
      clearCombatState(agent.id);
      return 'SUCCESS';
    }

    this.closing = false;
    if (this.swingCd > 0) {
      if (this.swingCd <= cfg.swingSeconds * 0.5) this.face(agent, tx, tz);
      return 'RUNNING';
    }

    this.swingCd = cfg.swingSeconds;
    agent.intent = { type: 'PLAY_ANIM', clip: SWING_CLIP, loop: false, anchored: true };
    this.strike(agent, t);
    return 'RUNNING';
  }

  private face(agent: Agent, tx: number, tz: number): void {
    if (agent.intent?.type === 'FACE' && Math.hypot(tx - this.facingX, tz - this.facingZ) < 0.5) return;
    this.facingX = tx;
    this.facingZ = tz;
    agent.intent = { type: 'FACE', target: { x: tx, z: tz } };
  }

  abort(agent: Agent): void {
    agent.intent = null;
    clearCombatState(agent.id);
    // No reservation, no work signal, no carried load touched — same as
    // every other combat activity. This villager's own HP/downed record
    // (game/villagerCombat.ts) is owned by Enemies.tsx's damage path, not
    // this activity's to unwind.
  }

  private approach(agent: Agent, t: Belief): void {
    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    this.aimedX = tx;
    this.aimedZ = tz;
    this.closing = true;
    agent.intent = {
      type: 'MOVE_TO',
      position: { x: tx, z: tz },
      speed: 'run',
      stopDistance: COMBAT.engageVillager.approachStop,
    };
    const cs = combatStateFor(agent.id);
    cs.mode = 'engage';
    cs.targetBeliefId = t.entityId;
    cs.threatX = tx;
    cs.threatZ = tz;
    cs.coverX = tx;
    cs.coverZ = tz;
    cs.coverLabel = 'engaging';
  }

  /** One blow, at a villager's own much weaker tier. Kill bookkeeping mirrors
   *  `engage_threat`'s (kill recorded, loot dropped, player told) but
   *  deliberately WITHOUT `gainDefenderXp` — that is a defender-only leveling
   *  field on the Villager record, and calling it on a farmer's id would
   *  start populating a stray level/xp on a non-defender record for no
   *  defined reason. */
  private strike(agent: Agent, t: Belief): void {
    const gs = useGameStore.getState();
    const villager = gs.villagers.find((v) => v.id === agent.id);
    if (!villager) return;
    const target = liveTargetFor(t.entityId);
    if (!target) return;
    // live adjudication, exactly as engage_threat's own strike() does: a
    // swing thrown at a remembered position misses if the raider has already
    // stepped out of reach
    if (Math.hypot(target.mob.x - agent.position.x, target.mob.z - agent.position.z) > COMBAT.engageVillager.reach) return;

    target.hp -= villagerStrike();
    combatStateFor(agent.id).hits++;
    if (target.hp > 0 || target.mob.state === 'dying') return;
    target.mob.state = 'dying';
    target.mob.dieT = 0;
    gs.recordKill(target.kind);
    gs.addItems(lootFor(target), 'grant');
    gs.notify(`${villager.name} fights off a raider!`, true);
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
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
      curve: boolCurve,
    },
    {
      name: 'brave_enough',
      input: (agent) => (attrsOf(agent.id).courage >= COMBAT.engageVillager.courageThreshold ? 1 : 0),
      curve: boolCurve,
    },
    {
      name: 'world_not_too_dangerous',
      input: () => (difficultyState.tier <= COMBAT.engageVillager.capableTierMax ? 1 : 0),
      curve: boolCurve,
    },
    {
      name: 'close_quarters',
      input: (agent) => (nearEnoughToFight(agent) ? 1 : 0),
      curve: boolCurve,
    },
    { name: 'threat_present', input: (agent) => agent.bb.threatLevel, curve: threatCurve },
    {
      name: 'hostile_believed',
      input: (agent) => (threatOf(agent) ? 1 : 0),
      curve: boolCurve,
    },
  ],
  createActivity: () => new EngageThreatVillagerActivity(),
};
