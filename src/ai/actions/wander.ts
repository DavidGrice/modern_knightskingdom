// NPC_AI_SPEC §10's build-order item 8 (LOD tiers + ambient) — the ambient
// half — and §5.1's `wander`, the one intrinsic id every archetype list in
// archetypes.json has offered since phase 1 with no Action behind it (that
// file's own `_doc` said so in as many words).
//
// WHAT WAS ACTUALLY MISSING, which is NOT "villagers don't wander". They do,
// and have since long before this system existed: Villagers.tsx's pre-AI
// cascade ends in a real 14 m ring wander (its 8th and last branch). What that
// cascade cannot do is run for a villager it isn't mounting — `VillagerFigure`
// only renders `(v.world ?? null) === destination` — so the moment the player
// steps through a portal, every home villager loses the one thing that was
// moving them and freezes mid-stride until the player comes back. Phase 8's
// `stepUnrenderedAgents` (core/Locomotion.ts) is now there to step them; this
// is the action that gives it something to step. `idle_fidget` (ambient.ts)
// could not be that thing however it was bridged: its Activity emits
// PLAY_ANIM and only PLAY_ANIM — standing-still fidgeting, never locomotion.
//
// WHY IT IS GATED TO TIER D, which is a scope decision and not timidity. An
// intent this action emits is only ever ACTUATED for a `steering ===
// 'teleport'` agent: `stepUnrenderedAgents` sweeps exactly that set, and every
// other tier is by definition in the player's own region, where a renderer is
// mounted. Emitting a MOVE_TO for anyone else would either hand a frozen
// intent to an agent nothing steps, or — worse — win the MOVE_TO splice at the
// TOP of Villagers.tsx's cascade (its own first branch, iteration 3.3) and
// starve the four shipped branches below it of the frames they run in: the
// newcomer walking the road in (`mob.arriving`, a flag that never clears if
// its branch never runs), the Wave 9/10 worksite performance, the builder's
// construction site, and the midday-market/evening-campfire rituals. At
// `ambient` 0.3 this wins whenever nothing else scores — which for a `builder`,
// who has no work Action in this reasoner at all, is essentially always. So
// the set of agents this can safely move IS the set nothing else is moving.
//
// The second gate is `roster_villager`. npcSync.ts spawns scheduled court NPCs
// under the SAME 'villager' archetype (its own comment: nothing consumed
// archetype selection when it was written), and `mirrorNpcPositions` pins
// their `agent.position` to their mob every frame unconditionally — a wander
// intent there would be overwritten as fast as it was stepped, and a quest
// giver who has left their post is a bug even when nobody is looking.
// `bb.job` is non-null only for a real roster villager (Agent.think live-reads
// it from `gs.villagers`, and `scheduledCourtNpcs` excludes anyone recruited
// onto that roster), so it is the exact discriminator, already read every
// tick, with no second list to keep in sync.
import { BUILD_REGION } from '@/game/data/buildables';
import { villagerHomeSpot } from '@/game/data/villagers';
import { getNavGrid, type NavGrid } from '@/game/navgrid';
import { useGameStore } from '@/game/store/gameStore';
import { AMBIENT } from '../config';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

/** Same fail-open contract `AnchorResolution.resolveAnchor`, phase 7's
 *  `takeCover.gridFor` and phase 8's `Locomotion.gridOrNull` all already
 *  document (a third copy rather than a shared export, matching the two that
 *  exist): `getNavGrid` throws for an unknown region, and a throw in here comes
 *  out of a think tick. No grid means no walkability opinion, so the candidate
 *  point is accepted unchecked — which is exactly what the cascade this ring
 *  came from does, since it never consulted the grid at all. */
function gridFor(region: string | null): NavGrid | null {
  try {
    return getNavGrid(region);
  } catch {
    return null;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** A walkable point on Villagers.tsx's own wander ring, or null if this agent
 *  has nowhere sensible to go.
 *
 *  Centred on the villager's HOME SPOT, not on wherever they currently stand —
 *  the same choice the cascade makes, and load-bearing here in a way it isn't
 *  there. A ring re-centred on each new position is a random walk, and an
 *  unrendered agent can wander for the entire length of a dungeon visit with
 *  nobody to notice it drifting; anchoring every hop to `villagerHomeSpot`
 *  bounds the whole excursion to one radius no matter how long it runs. */
function chooseWanderPoint(agent: Agent): { x: number; z: number } | null {
  const cfg = AMBIENT.wander;
  const gs = useGameStore.getState();
  const villager = gs.villagers.find((v) => v.id === agent.id);
  // `roster_villager` below gates on bb.job, which Agent.think live-reads from
  // this same array — so a miss here means the roster changed between that
  // read and this one, not that the gate let the wrong agent through.
  if (!villager) return null;
  // Belt and braces for a case that cannot happen today but sits one config
  // change away. `rosterSync` spawns EVERY villager Agent with `region: null`
  // regardless of that villager's own `world` (its own header says so), while
  // `VillagerFigure` mounts on `(v.world ?? null) === destination` — so a Wave
  // 4 settlement resident, visited in their own world, would be rendered AND
  // tiered D at the same time, and `no_renderer` would be reading a tier that
  // had quietly stopped meaning what it says. The renderer's mount predicate
  // is the actual truth, so consult it rather than trusting the tier to imply
  // it. Only reachable at tier D (that gate ran first), which is only ever
  // entered with a non-null destination — so this can never decline a villager
  // standing in the home meadow.
  if ((villager.world ?? null) === (gs.destination ?? null)) return null;

  const home = villagerHomeSpot(villager.id, villager.world, gs.claimedWorlds);
  // The cascade clamps its ring to BUILD_REGION unconditionally, but that
  // bound is the HOME meadow's. Applied only for a home-world villager here:
  // a Wave 4 settlement resident's home spot is another world's anchor
  // entirely, and clamping it into the home region would drag every target
  // they pick to the meadow's edge. No such villager exists today (every
  // `world` is still null — Villagers.tsx's own filter comment says so), which
  // is precisely why it costs one line now rather than a bug later.
  const atHome = (villager.world ?? null) === null;
  const grid = gridFor(agent.region);

  for (let i = 0; i < cfg.samples; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = cfg.minRadius + Math.random() * (cfg.radius - cfg.minRadius);
    let x = home.x + Math.cos(a) * r;
    let z = home.z + Math.sin(a) * r;
    if (atHome) {
      x = clamp(x, BUILD_REGION.minX + 2, BUILD_REGION.maxX - 2);
      z = clamp(z, BUILD_REGION.minZ + 2, BUILD_REGION.maxZ - 2);
    }
    if (!grid || grid.isWalkable(x, z)) return { x, z };
  }
  // Every sample landed on blocked ground — a villager whose whole ring has
  // been built over. Returning null (rather than handing back the last sample
  // anyway) lets the Activity fail immediately and the cooldown hold them
  // still, instead of coarse-stepping them into a wall for `giveUpSec`.
  return null;
}

class WanderActivity implements Activity {
  private elapsed = 0;
  private stepped = false;

  start(agent: Agent, _ctx: Context): void {
    this.elapsed = 0;
    this.stepped = false;
    const point = chooseWanderPoint(agent);
    // No intent at all, deliberately: update() reads that back as FAILURE on
    // the very next line of the same tick. Emitting nothing is what makes a
    // failed pick cost one scoreAction rather than a held intent.
    if (!point) { agent.intent = null; return; }
    agent.intent = {
      type: 'MOVE_TO', position: point, speed: 'walk', stopDistance: AMBIENT.wander.stopDistance,
    };
  }

  update(agent: Agent, dt: number, _now: number): ActivityStatus {
    if (!agent.intent) return 'FAILURE';
    this.elapsed += dt;

    // gather.ts's `travelStepped` rule, for the same reason and worth
    // repeating rather than sharing: bb.movement holds whatever the LAST
    // stepLocomotion call left it as, and start() runs in the same tick as
    // this first update() — before anything has stepped the intent just
    // issued. Its resting default is 'arrived', so trusting it here would
    // complete every wander instantly, on the spot, forever.
    if (!this.stepped) { this.stepped = true; return 'RUNNING'; }

    const status = agent.bb.movement.status;
    if (status === 'arrived') { agent.intent = null; return 'SUCCESS'; }
    // Real, and new in phase 8: the coarse-step branch reports 'blocked' when a
    // jump's landing point has no walkable cell near it (Locomotion's
    // `jumpAlongPath`), which is the one thing waiting cannot fix — the ground
    // was built over while this agent was away. Ending now re-picks a fresh
    // point after the pause instead of grinding at it until giveUpSec.
    if (status === 'blocked') { agent.intent = null; return 'FAILURE'; }
    // The other stall has no status of its own to report: with no path,
    // navSteer falls back to straight-line steering, so an agent pressed
    // against a corner keeps reporting 'moving' while covering no ground. A
    // clock is the only thing that ends that.
    if (this.elapsed >= AMBIENT.wander.giveUpSec) { agent.intent = null; return 'FAILURE'; }
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
// the identical shape the other six `not_threatened` considerations use
const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };

export const WANDER: Action = {
  id: 'wander',
  category: 'ambient',
  weight: 0.3, // CATEGORY_WEIGHT.ambient
  interruptPriority: 0, // CATEGORY_INTERRUPT_PRIORITY.ambient — anything preempts it
  minDuration: 1,
  // The pause between strolls, and the reason this reads as ambient life
  // rather than as pacing: a completed wander goes on cooldown, during which
  // `idle_fidget` (ambient too, cooldown 8) is the only thing left that can
  // win. The loop that falls out — walk somewhere, stand and fidget, walk
  // somewhere else — is the cascade's own `pause = 5 + random*9` behaviour
  // reached by composing two existing actions instead of by adding a timer.
  cooldown: AMBIENT.wander.pauseSec,
  considerations: [
    {
      // §8's tier D, read off the steering mode rather than `tier` itself:
      // `steering` is the field that decides whether anything actuates this
      // intent at all (Locomotion's `stepUnrenderedAgents` sweeps exactly
      // `'teleport'`), so gating on the tier letter would be a second copy of
      // that mapping to keep in agreement with lod.json by hand.
      name: 'no_renderer',
      input: (agent) => (agent.steering === 'teleport' ? 1 : 0),
      curve: boolCurve,
    },
    {
      name: 'roster_villager',
      input: (agent) => (agent.bb.job !== null ? 1 : 0),
      curve: boolCurve,
    },
    {
      // Still meaningful with the sensors off (§8): tier D skips perception
      // but not decay or derivation, so a villager who was looking at a raider
      // when the player left keeps still for the few seconds it takes their
      // threat to fall, rather than ambling off the instant they stop seeing.
      name: 'not_threatened',
      input: (agent) => 1 - agent.bb.threatLevel,
      curve: notThreatenedCurve,
    },
  ],
  createActivity: () => new WanderActivity(),
};
