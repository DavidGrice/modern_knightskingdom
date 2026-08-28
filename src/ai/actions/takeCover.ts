// NPC_AI_SPEC §10's build-order item 7 (Combat + companion) / §5.1's
// `take_cover` — the first action in this system to treat `bb.threatLevel` as
// an OUTPUT rather than as something to be suppressed by.
//
// WHY THIS AND NOT A VILLAGER SWINGING BACK (at the time this was written —
// see the Wave 21 update below for what changed). Phase 6 shipped real
// perception and phase 6's own closing note flagged the missing half
// honestly: threat now correctly suppresses work through six
// `not_threatened` considerations, but nothing NEW fires on it. This was
// that outlet, and its shape was decided by what an ordinary villager in
// this game actually was, not by the spec's own wording. True when checked
// against the live code at the time:
//   - No villager could be damaged. `Enemies.tsx`'s target selection only
//     ever picked the player, a sworn defender (via `defenderState`), or a
//     keep piece — a farmer standing in a raid was untouchable.
//   - No villager could deal damage. `setDefenderLoadout` (gameStore.ts)
//     refused any villager whose job was not 'defender', and `rosterSync.ts`
//     structurally excluded defenders from having an `Agent` at all.
// So an ordinary villager who "fought back" would have been an invincible
// farmer killing raiders for free — a real balance regression in a tuned
// combat game, dressed up as an AI feature. Getting out of the way, behind
// something solid, while shouting about what they saw, was the only honest
// combat behaviour available to this population at the time, and it was
// genuinely new: nothing in this game reacted to a lone night skeleton
// wandering into the fields, because the only existing reaction
// (`flee_to_safety`) gates on the global `raid` flag.
//
// WAVE 21 UPDATE (2026-08-28): the premise above is no longer true. Ordinary
// villagers now DO have real HP (`game/villagerCombat.ts`) and a real, much
// weaker attack (`actions/engageThreatVillager.ts`, action id
// `engage_threat_villager`) — see that file's own header for the full design
// (courage/proximity/difficulty-tier gates, downed-not-dead recovery). This
// file itself is unchanged by that wave: `take_cover` is still what a
// villager who does NOT meet those gates (too timid, too far, world too
// dangerous, already downed) falls back to, and it still loses outright to
// `flee_to_safety` during an actual raid exactly as described below —
// villager combat only ever fires between raids.
//
// RELATIONSHIP TO flee_to_safety, which is untouched. That action is survival
// (weight 4.0, interruptPriority 10) and answers "a raid is on" by running to
// one fixed point (HOME_X/HOME_Z). This one is combat (3.0 / 8), loses to it
// outright, and answers a SPECIFIC believed hostile by putting a real standing
// structure between itself and that hostile's last known position. During a
// raid nothing changes: flee still wins. Between raids, this is the only thing
// in the game that reacts at all.

import { useEnemyStore, KIND_LABEL } from '@/game/combat';
import { heightOf, sizeFor } from '@/game/data/buildables';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { getNavGrid, type NavGrid } from '@/game/navgrid';
import { useGameStore } from '@/game/store/gameStore';
import { isBuilt } from '@/game/types';
import { COMBAT } from '../config';
import type { Agent } from '../core/Agent';
import type { Belief } from '../core/Blackboard';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';
import { nearestNoticedHostile } from '../perception/Belief';
import { emitSound } from '../perception/sounds';
import { claimAlarm, clearCombatState, combatStateFor, peekCombatState, type CombatState } from './combatState';

/** The action id, named once. `coverRun` below has to compare against
 *  `bb.currentActionId` and the Action literal is declared at the bottom of
 *  this file, so the string cannot come from there without a use-before-init. */
const ACTION_ID = 'take_cover';

/** The believed hostile this action is answering — always through
 *  `nearestNoticedHostile` (perception/Belief.ts), never a live mob transform:
 *  §3.3's rule, and the whole point of a belief carrying a position of its
 *  own. A raider who ducked behind the barn leaves a memory at the barn's near
 *  side, and this action retreats from THAT, which is what a villager who saw
 *  him go in would actually do. */
function threatOf(agent: Agent): Belief | null {
  return nearestNoticedHostile(agent.bb, agent.position.x, agent.position.z);
}

/** Same fail-open contract `VisionSensor.losGridFor` documents: `getNavGrid`
 *  throws for an unknown region and for the Crypt before a layout exists, and
 *  a throw inside a think tick takes down the scheduler for every agent, not
 *  just this one. No grid simply means "no walkability opinion" — the cover
 *  point is used unchecked, which degrades to the pre-phase-7 behaviour of
 *  walking wherever `navSteer` can get to, never to a crash. */
function gridFor(region: string | null): NavGrid | null {
  try {
    return getNavGrid(region);
  } catch {
    return null;
  }
}

interface CoverPick { x: number; z: number; label: string }

/** Pick somewhere to stand that puts a real standing piece between this agent
 *  and `(tx,tz)`.
 *
 *  Cover is chosen by the buildable's own authored HEIGHT (`heightOf`, i.e.
 *  `size[1]` from data/buildables.ts), not from a hand-listed set of
 *  "cover-ish" types — a list would be wrong the first time a new wall piece
 *  shipped, and a bed or a campfire correctly fails a height test without
 *  anyone having to remember to exclude it.
 *
 *  The stand point is offset from the piece's real FOOTPRINT edge, not its
 *  centre: `sizeFor` gives the rotated world-axis extents, and projecting the
 *  half-extents onto the retreat direction is the box's own support function —
 *  so an 8 m castle wall and a 2 m barrel both produce "tucked in just behind
 *  it" from the single `standoff` number.
 *
 *  That offset is then PROBED outward until it lands on walkable ground,
 *  because `sizeFor` and the nav grid do not agree about how big a building
 *  is: navgrid.ts inflates every collision box by AGENT_RADIUS 0.55 and stamps
 *  whole 1.0 m cells, and a piece's collision volume is not always its
 *  authored display size. A flat 1.2 m standoff therefore landed inside
 *  blocked ground for some pieces and not others — a `storehouse` was silently
 *  rejected and the villager ran 8 m into the open while a `market_stall` two
 *  metres away worked perfectly. Probing along the SAME retreat ray keeps
 *  every property the single offset had (the piece stays between villager and
 *  threat, and the retreat gain only grows), so the fix costs nothing but a
 *  handful of array-free grid lookups on a candidate that would otherwise have
 *  been thrown away. */
function chooseCover(agent: Agent, tx: number, tz: number): CoverPick {
  const cfg = COMBAT.cover;
  const ax = agent.position.x;
  const az = agent.position.z;
  const distNow = Math.hypot(ax - tx, az - tz);
  const grid = gridFor(agent.region);

  let best: CoverPick | null = null;
  let bestCost = Infinity;
  for (const b of useGameStore.getState().buildings) {
    if (!isBuilt(b) || (b.world ?? null) !== agent.region) continue;
    if (heightOf(b.type) < cfg.minPieceHeight) continue;
    const toAgentX = b.x - ax;
    const toAgentZ = b.z - az;
    if (toAgentX * toAgentX + toAgentZ * toAgentZ > cfg.searchRadius * cfg.searchRadius) continue;

    let awayX = b.x - tx;
    let awayZ = b.z - tz;
    const awayLen = Math.hypot(awayX, awayZ);
    if (awayLen < 1e-3) continue; // the raider is standing on the piece — it is not cover from itself
    awayX /= awayLen;
    awayZ /= awayLen;

    const [w, d] = sizeFor(b.type, b.rot);
    const support = (w / 2) * Math.abs(awayX) + (d / 2) * Math.abs(awayZ);

    let sx = 0;
    let sz = 0;
    let stood = false;
    const maxOffset = cfg.standoff + cfg.standoffProbe;
    for (let off = cfg.standoff; off <= maxOffset + 1e-6; off += cfg.standoffStep) {
      const px = b.x + awayX * (support + off);
      const pz = b.z + awayZ * (support + off);
      // the honesty check: a "cover" point that is no further from the raider
      // than where the villager already stands is just a different patch of
      // open ground, and one on the near side of the piece is running at them
      if (Math.hypot(px - tx, pz - tz) - distNow < cfg.minRetreatGain) continue;
      // a stand point inside another building (or inside this one, since the
      // nav grid's footprint is bigger than the authored one) would leave the
      // villager shoving at a wall for the rest of the raid. Step further out
      // behind the same piece rather than discarding it — see the header.
      if (grid && !grid.isWalkable(px, pz)) continue;
      sx = px;
      sz = pz;
      stood = true;
      break;
    }
    if (!stood) continue;

    const cost = Math.hypot(sx - ax, sz - az);
    if (cost >= bestCost) continue;
    bestCost = cost;
    best = { x: sx, z: sz, label: b.type };
  }
  if (best) return best;

  // Nothing solid within reach — back off in the open instead. Fanned bearings
  // rather than one straight line away: directly away is frequently into the
  // pond or a fence, and a villager who cannot resolve a retreat at all stands
  // there and takes it.
  let awayX = ax - tx;
  let awayZ = az - tz;
  const len = Math.hypot(awayX, awayZ);
  if (len < 1e-3) { awayX = 0; awayZ = 1; } else { awayX /= len; awayZ /= len; }
  const FAN = [0, 0.44, -0.44, 0.87, -0.87]; // 0°, ±25°, ±50°
  for (const scale of [1, 0.5]) {
    for (const t of FAN) {
      const cos = Math.cos(t);
      const sin = Math.sin(t);
      const rx = awayX * cos + awayZ * sin;
      const rz = -awayX * sin + awayZ * cos;
      const px = ax + rx * cfg.retreatDistance * scale;
      const pz = az + rz * cfg.retreatDistance * scale;
      if (!grid || grid.isWalkable(px, pz)) return { x: px, z: pz, label: 'open ground' };
    }
  }
  // Last resort, and only in the home meadow: the same point flee_to_safety
  // already runs to. In a destination region there is no equivalent anchor, so
  // the unchecked straight retreat is better than a hardcoded homestead
  // coordinate that means nothing there.
  return agent.region === null
    ? { x: HOME_X, z: HOME_Z, label: 'homestead' }
    : { x: ax + awayX * cfg.retreatDistance, z: az + awayZ * cfg.retreatDistance, label: 'open ground' };
}

/** `enemy:17` -> `17`. The belief id scheme (perception/Belief.ts) is the only
 *  thing that knows how to read this, and a `noise:` belief deliberately has no
 *  entity behind it to name. */
function enemyKindLabel(beliefId: string): string {
  if (!beliefId.startsWith('enemy:')) return 'trouble';
  const id = Number(beliefId.slice(6));
  // A LABEL lookup, and only a label. §3.3 forbids combat reading a target's
  // live transform, which this does not do — position comes from the belief
  // above and nowhere else. What the thing IS is not something a villager
  // needs a memory record to know once they have looked at it.
  const e = useEnemyStore.getState().enemies.find((x) => x.id === id);
  return e ? KIND_LABEL[e.kind] : 'trouble';
}

/** The cover run this agent is currently executing, or null if it is not in
 *  `take_cover` at all. Deliberately `peekCombatState` (never creates an
 *  entry): this is called from a Consideration, i.e. for every agent this
 *  action is offered to on every think tick, and the `currentActionId` test in
 *  front of it means the map is only ever touched for an agent already in
 *  cover. */
function coverRun(agent: Agent): CombatState | null {
  if (agent.bb.currentActionId !== ACTION_ID) return null;
  const cs = peekCombatState(agent.id);
  return cs && cs.mode === 'cover' ? cs : null;
}

/** Still running FOR the cover point, as opposed to standing behind it.
 *  `commitSec` is a backstop on a travel phase that normally ends by arriving
 *  (or by `bb.movement` reporting `blocked`, which counts). */
function isCommittedRun(cs: CombatState, now: number): boolean {
  return !cs.coverArrived && now - cs.coverStartedAt < COMBAT.cover.commitSec;
}

class TakeCoverActivity implements Activity {
  private facingX = 0;
  private facingZ = 0;
  private aimed = false;
  private travelStepped = false;

  start(agent: Agent, ctx: Context): void {
    const t = threatOf(agent);
    if (!t) return; // update() retries once and then fails cleanly
    this.aim(agent, t, ctx.now);
    this.shout(agent, t, ctx.now);
  }

  update(agent: Agent, _dt: number, now: number): ActivityStatus {
    const t = threatOf(agent);

    // start() found nothing to answer — the belief it was scored against
    // decayed between scoring and starting. One retry (a fresh sighting is
    // entirely possible in the intervening tick), then fail cleanly. Tracked
    // on an explicit flag rather than inferred from `agent.intent`, which the
    // PREVIOUS activity's abort() may or may not have cleared.
    if (!this.aimed) {
      if (!t) { clearCombatState(agent.id); return 'FAILURE'; }
      this.aim(agent, t, now);
      this.shout(agent, t, now);
      return 'RUNNING';
    }

    const cs = combatStateFor(agent.id);
    const committed = isCommittedRun(cs, now);

    if (!t) {
      // Every hostile belief has decayed past the noticed threshold.
      //
      // Once STOOD DOWN behind the piece there is nothing left to hide from,
      // so this ends — SUCCESS rather than RUNNING because the reasoner's own
      // threat gate lags behind by the §6.3 smoothing (~0.28 s), and standing
      // in the lee of a barn for a third of a second after the danger has
      // passed is a fine place to end.
      //
      // Mid-run it is NOT a reason to stop, and that asymmetry is the whole
      // point: a villager sprinting for the barn does not stop dead halfway
      // because they can no longer picture exactly where the raider was. The
      // memory fades fastest precisely BECAUSE they turned their back and ran,
      // so ending here would punish the action for working.
      if (!committed) { clearCombatState(agent.id); return 'SUCCESS'; }
    } else if (
      Math.hypot(t.lastKnownPosition.x - cs.threatX, t.lastKnownPosition.z - cs.threatZ)
      > COMBAT.cover.repathDistance
    ) {
      // Re-choose only when the believed position has genuinely moved.
      // Re-picking every tick would make a villager dither in the open while a
      // raider walks a straight line at them, which is the one outcome this
      // action exists to prevent. `repathDistance` is deliberately several
      // metres, not a metre.
      this.aim(agent, t, now);
      return 'RUNNING';
    }

    // Same staleness guard seekDeposit.ts documents at length: runReasoner
    // calls start() and update() on the SAME tick, before any stepLocomotion
    // has run against the intent just issued, so bb.movement still holds
    // whatever the previous activity left behind.
    if (!this.travelStepped) { this.travelStepped = true; return 'RUNNING'; }

    if (!cs.coverArrived && agent.bb.movement.status !== 'moving') {
      // 'blocked' counts as arrived on purpose. A MOVE_TO walk only reports
      // blocked when there is genuinely no way through, and the right answer
      // then is to turn and watch from where you are — not to fail the action
      // and hand a cornered villager back to the wander cascade. It also ends
      // the committed phase, so a villager who cannot reach the point they
      // picked is released by the ordinary hysteresis rather than pinned for
      // the whole of `commitSec`.
      cs.coverArrived = true;
    }
    if (cs.coverArrived && t) this.face(agent, t);
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
    clearCombatState(agent.id);
    // Nothing else to unwind: this activity holds no reservation and no work
    // signal, and never touches bb.carrying — a villager who runs for the barn
    // keeps the load on their back, exactly as flee_to_safety leaves it.
  }

  /** (Re)decide where to stand and start walking there. Restarts the
   *  commitment window: the run being committed to is THIS one, and a raider
   *  who has moved far enough to force a re-pick is a fresh reason to run. */
  private aim(agent: Agent, t: Belief, now: number): void {
    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    this.aimed = true;
    this.travelStepped = false;
    const cover = chooseCover(agent, tx, tz);
    agent.intent = {
      type: 'MOVE_TO',
      position: { x: cover.x, z: cover.z },
      speed: 'run',
      stopDistance: COMBAT.cover.stopDistance,
    };
    const cs = combatStateFor(agent.id);
    cs.mode = 'cover';
    cs.targetBeliefId = t.entityId;
    cs.threatX = tx;
    cs.threatZ = tz;
    cs.coverX = cover.x;
    cs.coverZ = cover.z;
    cs.coverLabel = cover.label;
    cs.coverStartedAt = now;
    cs.coverArrived = false;
  }

  /** Arrived: turn and watch. Re-issued only when the thing being watched has
   *  actually moved — `agent.intent`'s setter stamps `intentSetAt` on every
   *  assignment (Agent.ts), so reassigning an identical FACE each tick would
   *  peg the overlay's intent age at 0.0 s and hide exactly the information
   *  that row exists to give. */
  private face(agent: Agent, t: Belief): void {
    const tx = t.lastKnownPosition.x;
    const tz = t.lastKnownPosition.z;
    if (agent.intent?.type === 'FACE' && Math.hypot(tx - this.facingX, tz - this.facingZ) < 0.5) return;
    this.facingX = tx;
    this.facingZ = tz;
    agent.intent = { type: 'FACE', target: { x: tx, z: tz } };
  }

  /** §6.2 from the AI side for the first time: a villager breaking for cover
   *  shouts, and the shout is a real world sound carrying the SIGHTED
   *  hostile's own belief id — so a neighbour who hears it gains a
   *  low-confidence belief about that same raider at a fuzzed position, just as
   *  if they had heard the fight themselves. One villager's panic spreads as
   *  information, not as a broadcast.
   *
   *  Two guards, either of which alone would be enough:
   *  1. Only for a belief with `isVisibleNow`. The vision sensor is the only
   *     writer of that flag, so a sound-derived belief is never visible and a
   *     shout can therefore never cause a shout — loop-freedom by construction,
   *     independent of any tuning value.
   *  2. `claimAlarm` throttles per HOSTILE (not per villager), so three farmers
   *     spotting the same raider is one piece of news — the same shape
   *     `scoutReported` (game/defenders.ts) already uses for a scouting
   *     defender. It gates the sound as well as the notice, which also bounds
   *     the emit rate no matter how the action's own commitment behaves. */
  private shout(agent: Agent, t: Belief, now: number): void {
    if (!t.isVisibleNow) return;
    const cfg = COMBAT.alarm;
    if (!claimAlarm(t.entityId, now, cfg.cooldownSec)) return;
    emitSound(t.lastKnownPosition.x, t.lastKnownPosition.z, cfg.loudness, 'combat', t.entityId, agent.region);
    const st = useGameStore.getState();
    const name = st.villagers.find((v) => v.id === agent.id)?.name ?? 'A villager';
    st.notify(`👀 ${name} spots a ${enemyKindLabel(t.entityId)}!`, true);
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
/** §5.2 — a linear ramp that reaches 0 exactly AT `cover.minThreat`, so a
 *  threat below the floor gates the whole action out (scoreAction stops on a
 *  zero) rather than scoring it a little bit. Derived from the authored number
 *  at module load, not written out twice: the two must agree by construction. */
const threatCurve: Curve = {
  type: 'linear',
  m: 1 / (1 - COMBAT.cover.minThreat),
  k: 1,
  b: 0,
  c: COMBAT.cover.minThreat,
};

/** What `threat_high` actually asks, which is NOT simply "what is
 *  `bb.threatLevel` right now". A single threshold on the live number was the
 *  first version and it never once got a villager to the cover it picked
 *  (verified live, 4 scenarios out of 4): retreating turns the agent's back on
 *  the raider, which takes the 114.6° vision cone with it, so the belief stops
 *  being refreshed and decays at 0.25/s — and threat is confidence × proximity,
 *  with proximity falling for the same reason at the same time. Threat is back
 *  under 0.4 within ~3 s of losing sight, which is shorter than most cover
 *  runs, so the action gated out mid-flight and left the villager standing in
 *  the open. Around the boundary it flickered against `idle_fidget` twice in
 *  under two seconds, re-picking a different destination each time.
 *
 *  So there are three regimes, not one, and `bb.threatLevel` is the honest
 *  input for exactly one of them:
 *
 *  1. NOT RUNNING — the live number against `minThreat` (0.4). Unchanged: it
 *     still takes a hostile the villager can SEE, inside about 9.6 m.
 *  2. RUNNING, still travelling — a flat `commitThreat`, for up to
 *     `commitSec`. A decision, once taken, is worth seeing through; the memory
 *     decays fastest precisely BECAUSE the villager turned and ran, so
 *     re-litigating it every tick punishes the action for working. Ends by
 *     arriving, not by the timer. `minDuration` (2 s) only protects an action
 *     that is not gated, so without this the reasoner's own commitment
 *     machinery could not help either. FLAT, and deliberately not the live
 *     number saturated to 1: at 1 this action's score would sit at its 3.0
 *     ceiling and put the switch threshold above `flee_to_safety`'s flat 4.0,
 *     silently making a villager who should be running home stay behind the
 *     barn instead. See combat.json's `cover._doc` for that arithmetic — it is
 *     the number's whole justification.
 *  3. RUNNING, stood down behind the piece — hysteresis: release at
 *     `sustainThreat` (0.15), not at the 0.4 it took to start. The live number
 *     is renormalised onto the curve's own [minThreat, 1] domain so the two
 *     regimes share one curve and the score still falls off smoothly as the
 *     danger fades, instead of being a second hidden step. */
function coverThreatInput(agent: Agent, now: number): number {
  const cfg = COMBAT.cover;
  const live = agent.bb.threatLevel;
  const run = coverRun(agent);
  if (!run) return live;
  if (isCommittedRun(run, now)) return cfg.commitThreat;
  if (live <= cfg.sustainThreat) return 0;
  return cfg.minThreat + ((live - cfg.sustainThreat) * (1 - cfg.minThreat)) / (1 - cfg.sustainThreat);
}

export const TAKE_COVER: Action = {
  id: ACTION_ID,
  category: 'combat',
  weight: 3.0, // CATEGORY_WEIGHT.combat — the first real action in this category
  // CATEGORY_INTERRUPT_PRIORITY.combat. §5.6's own worked example is "combat
  // interrupts smithing": above work (1), needs (1) and sleep's overridden 3,
  // below survival's 10 — so a raid-flee still preempts this mid-run, and this
  // still hauls a sleeping villager out of bed when something walks up to it.
  interruptPriority: 8,
  // flee_to_safety's own value. Same job: long enough that a villager commits
  // to the run instead of re-deciding every tick as the raider's believed
  // position jitters, short enough to release the moment the danger passes.
  minDuration: 2,
  // No cooldown, deliberately, and for flee_to_safety's exact reason: this
  // action ends by being GATED (threat fell below the release floor), not by
  // succeeding, and a cooldown would then be a window in which a villager who
  // has just been re-noticed cannot react. The anti-flicker job a cooldown
  // would otherwise be doing is done properly by the hysteresis and commitment
  // in `coverThreatInput` above — a cooldown damps re-entry by making the
  // right behaviour impossible for N seconds, which is not the same thing.
  cooldown: 0,
  considerations: [
    // O(1) and gates almost every agent on almost every tick before the belief
    // scan below is ever reached — scoreAction short-circuits on a zero.
    { name: 'threat_high', input: (agent, ctx) => coverThreatInput(agent, ctx.now), curve: threatCurve },
    {
      // Threat alone is not enough to act on: §6.3 keeps a decaying tail after
      // the last belief is pruned, and running from a memory of a memory is
      // how a villager ends up cowering behind a barn with nothing on screen.
      //
      // Committed to a run, this holds for the same reason `threat_high` does:
      // a belief that has decayed below `noticedAt` mid-sprint must not strand
      // the villager in the open. The Activity itself still ends the run the
      // moment that commitment expires with nothing left to hide from.
      name: 'hostile_believed',
      input: (agent, ctx) => {
        const run = coverRun(agent);
        if (run && isCommittedRun(run, ctx.now)) return 1;
        return threatOf(agent) ? 1 : 0;
      },
      curve: boolCurve,
    },
  ],
  createActivity: () => new TakeCoverActivity(),
};
