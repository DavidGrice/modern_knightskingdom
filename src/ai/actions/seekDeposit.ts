// Wave 10 · seek_deposit — the AI-native answer to ROADMAP.md's "Stranded
// carrying".
//
// THE REAL SHAPE OF THE BUG, having read the live code rather than the
// backlog entry. `haul_to_deposit`'s targets come from `assembleCandidates`,
// which re-runs `targetRegistry.queryNearby(agent.position, 40, ...)` FRESH
// on every single think tick — so the backlog's own suggested fix ("a wider
// query radius or a periodic capacity-triggered re-query") was half already
// built: the re-query has always been there, tracking the agent's live
// position, and widening the radius alone would only move the cliff further
// out while making every hauler score twelve distant candidates every tick.
// The actual gap is that when nothing of a deposit kind is within 40m,
// queryNearby returns an EMPTY LIST — not a low-scoring candidate, no
// candidate object at all — and no other Action in the live registry
// (actions/index.ts) can move a carrying villager anywhere: gather_resource
// is hard-gated by has_capacity once the sack is full, idle_fidget has no
// locomotion, and the `wander`/`idle` ids archetypes.json lists for villagers
// have never had a real Action behind them. So the reasoner finds no winner,
// nulls the intent, and the villager falls through to Villagers.tsx's legacy
// "Phase 24B" cascade — whose own walk is driven by the OLD flat trip timer
// (`st.villagerProgress`), knows nothing about `bb.carrying`, and only heads
// for the stores once its unrelated timer passes 70%. That accidental rescue
// exists only for the four jobs that cascade happens to name, and while it
// runs the old timer keeps crediting `perTrip` for a villager whose real load
// is still sitting on their back. Leaning on it was never a design.
//
// This Action closes it inside the AI system: no targetKinds (so it is never
// bound by the same 40m query it exists to escape), a direct unbounded scan
// for the nearest real deposit point, and a plain MOVE_TO toward it — flee.ts's
// exact pattern, for the same reason (a computed destination that is not a
// TargetRegistry target). Once inside 40m it gates ITSELF off and hands over:
// haul_to_deposit's own candidate assembly picks the store up normally on the
// next tick, with its anchor resolution, reservation and partial-accept
// handling all unchanged. Nothing here deposits anything.
import { useGameStore } from '@/game/store/gameStore';
import { roomFor } from '@/game/storage';
import { isBuilt, type PlacedBuilding } from '@/game/types';
import { DEPOSIT_KINDS } from './haul';
import type { TargetId } from '../core/TargetRegistry';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

/** the radius haul_to_deposit's own candidate assembly can see (gather.ts/
 *  haul.ts's PROXIMITY_RANGE, = assembleCandidates' default queryRadius) —
 *  this Action's whole job is to get inside it, so it is also exactly where
 *  this Action stops wanting to run */
const HANDOFF_RANGE = 40;
/** close enough to be well inside HANDOFF_RANGE with margin; in practice the
 *  gate above ends this walk long before it is reached, and it only really
 *  matters if the destination somehow stays un-haulable the whole way in */
const STOP_DISTANCE = 2;

const DEPOSIT_KIND_SET = new Set(DEPOSIT_KINDS);

// `out_of_haul_range` below runs on EVERY think tick for every carrying
// villager, not only for stranded ones (a consideration can't know in advance
// that it is about to score 0), so the O(buildings) filter is memoised on the
// ARRAY IDENTITY — zustand replaces `st.buildings` wholesale on every
// placement/demolition/construction tick, so a matching reference provably
// means an unchanged building set. Exactly the pattern storageCapacity()
// (game/storage.ts) already uses for the same reason. What is left to scan
// per call is the handful of deposit points actually standing.
let depositCacheKey: PlacedBuilding[] | null = null;
let depositCacheVal: PlacedBuilding[] = [];
function depositPoints(buildings: PlacedBuilding[]): PlacedBuilding[] {
  if (buildings === depositCacheKey) return depositCacheVal;
  depositCacheKey = buildings;
  depositCacheVal = buildings.filter((b) => DEPOSIT_KIND_SET.has(b.type) && isBuilt(b));
  return depositCacheVal;
}

/** Nearest built deposit point in this agent's OWN world, unbounded by
 *  radius — the one thing TargetRegistry.queryNearby cannot answer. Mirrors
 *  bestStore()'s instance filter (game/storage.ts) but not its type
 *  preference: bestStore deliberately excludes barrels from "the stores", and
 *  is deliberately preference-ordered rather than distance-ordered, neither of
 *  which is what a stranded villager needs. They need the nearest thing
 *  haul_to_deposit will recognise when they get there, which is DEPOSIT_KINDS
 *  exactly.
 *
 *  Wave 10 verification · a deposit point this agent has already FAILED to
 *  reach is skipped, exactly as haul.ts's own `target_usable` skips it. Nearest
 *  by straight-line distance says nothing about reachability, and marching a
 *  stranded villager at a store they provably cannot path to is the one
 *  outcome this Action exists to prevent — it hands them to haul_to_deposit at
 *  the 40m line, haul fails 'blocked', and the pair loop until the load is
 *  abandoned. Skipping it walks them to the NEXT-nearest store instead, which
 *  is the whole point of an unbounded scan. Uses the same shared
 *  bb.blockedTargets map (and the same opportunistic expiry cleanup) so the
 *  two Actions can never disagree about which stores are reachable. */
function nearestDeposit(agent: Agent, now: number): { id: TargetId; x: number; z: number; dist: number } | null {
  let best: { id: TargetId; x: number; z: number; dist: number } | null = null;
  for (const b of depositPoints(useGameStore.getState().buildings)) {
    if ((b.world ?? null) !== agent.region) continue;
    // TargetRegistry keys a building target by its raw buildable id — keep
    // this in step with buildingTarget() (core/TargetRegistry.ts)
    const id: TargetId = `bldg:${b.id}`;
    const blockedUntil = agent.bb.blockedTargets.get(id);
    if (blockedUntil !== undefined) {
      if (blockedUntil > now) continue;
      agent.bb.blockedTargets.delete(id);
    }
    const dist = Math.hypot(b.x - agent.position.x, b.z - agent.position.z);
    if (!best || dist < best.dist) best = { id, x: b.x, z: b.z, dist };
  }
  return best;
}

class SeekDepositActivity implements Activity {
  private travelStepped = false;

  start(agent: Agent, ctx: Context): void {
    this.travelStepped = false;
    const dest = nearestDeposit(agent, ctx.now);
    if (!dest) return; // update() fails cleanly next tick — same shape as a failed reserve()
    agent.intent = { type: 'MOVE_TO', position: { x: dest.x, z: dest.z }, speed: 'walk', stopDistance: STOP_DISTANCE };
  }

  update(agent: Agent, _dt: number, _now: number): ActivityStatus {
    if (!agent.intent || agent.intent.type !== 'MOVE_TO') return 'FAILURE'; // start() found nowhere to go
    // same staleness reasoning gather.ts's own 'travel' phase documents at
    // length: runReasoner calls start() and update() on the SAME tick, before
    // any stepLocomotion has run against the intent just issued, so
    // bb.movement is still whatever the PREVIOUS activity left behind —
    // frequently 'blocked', which would fail this walk before it began.
    if (!this.travelStepped) { this.travelStepped = true; return 'RUNNING'; }
    // Deliberately does NOT write bb.blockedTargets on this path, unlike
    // GatherAtNode/HaulToDeposit. Locomotion only ever raises 'blocked' from
    // its MOVE_TO_ANCHOR branch (a null resolveAnchor); a MOVE_TO walk like
    // this one resolves to 'moving'/'arrived' every frame, so reaching here at
    // all means a stale flag survived the guard above rather than that this
    // store was proven unreachable — and recording an unreachability this
    // Activity cannot actually observe would suppress haul_to_deposit's own
    // access to a store that may be perfectly fine. Discovering that is haul's
    // job (it is the one that resolves anchors); respecting what haul found is
    // this Action's, and that half happens in nearestDeposit() above.
    if (agent.bb.movement.status === 'blocked') return 'FAILURE'; // the 4s cooldown keeps it from re-failing every tick
    // Deliberately does NOT end itself on arrival, and does not re-aim at a
    // closer store mid-walk. Both are the reasoner's job, not this Activity's:
    // `out_of_haul_range` below gates the whole action to 0 the moment the
    // agent is close enough for haul_to_deposit to see a target, and
    // pickAction's gated-running-action rule then stops minDuration protecting
    // it, so haul takes over on the very next tick. Same division of labour
    // flee.ts and sleep.ts already document for "the Activity does not decide
    // when it is done."
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
    // Nothing else to unwind: unlike gather/haul this Activity holds no
    // reservation, no work signal and no remembered destination — the walk
    // target is re-derived from nearestDeposit() on every start(), so there is
    // no per-instance state that could go stale across an abort.
    // carrying survives, same rule as gather/haul — this Action never touches it
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };

export const SEEK_DEPOSIT: Action = {
  id: 'seek_deposit',
  category: 'work',
  // A deliberate UNDERCUT of CATEGORY_WEIGHT.work (1.2), the mirror image of
  // haul_to_deposit's deliberate overcut to 1.4: this must lose to both real
  // work actions in every case where either has a real candidate, so it only
  // ever wins on a tick where gather_resource is capacity-gated AND
  // haul_to_deposit produced no candidate at all. It still comfortably clears
  // idle_fidget (0.3), which is the only other thing left to beat by then.
  weight: 0.6,
  interruptPriority: 1, // CATEGORY_INTERRUPT_PRIORITY.work — equal to haul's, so neither can preempt the other mid-minDuration; the score gate below is what hands over
  minDuration: 2,
  // only ever reached on a FAILURE (nowhere to go, or a blocked path) — a
  // normal handoff ends this action by gating, which starts no cooldown.
  // Short: long enough not to re-fail every tick, short enough that a path
  // blocked by a passing raid clears on its own.
  cooldown: 4,
  // Ordered cheapest-gate-first on purpose: scoreAction short-circuits the
  // moment a consideration returns 0, so the only one that touches the
  // building list sits last, behind three O(1) gates that reject most agents
  // on most ticks before it is ever reached.
  considerations: [
    { name: 'is_carrying', input: (agent) => (agent.bb.carrying ? 1 : 0), curve: boolCurve },
    {
      // Wave 9's "hold your load and wait" rule, applied to the walk as well
      // as to the deposit: if the stores have no room for what they are
      // carrying, crossing the map to be turned away is worse than standing
      // still. Spending or selling that good re-opens this on the next think
      // tick, no invalidation needed — same as haul.ts's own target_usable.
      name: 'stores_have_room',
      input: (agent) => {
        const load = agent.bb.carrying;
        if (!load) return 0;
        const st = useGameStore.getState();
        return roomFor(load.resource, st.inventory[load.resource] ?? 0, st.buildings) > 0 ? 1 : 0;
      },
      curve: boolCurve,
    },
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: notThreatenedCurve },
    {
      // the handoff, and the whole reason this Action can share a category
      // with haul_to_deposit without fighting it: inside haul's own query
      // radius there is nothing left for this to do.
      name: 'out_of_haul_range',
      input: (agent, ctx) => {
        const dest = nearestDeposit(agent, ctx.now);
        // nowhere to walk to at all (no stockpile/storehouse/barrel standing
        // in this world, or every one of them currently marked unreachable)
        // is a real, expected state early on — score 0 and let the legacy
        // cascade have them, rather than marching them at the settlement
        // centre where no deposit target exists either
        if (!dest) return 0;
        return dest.dist > HANDOFF_RANGE ? 1 : 0;
      },
      curve: boolCurve,
    },
  ],
  createActivity: () => new SeekDepositActivity(),
};
