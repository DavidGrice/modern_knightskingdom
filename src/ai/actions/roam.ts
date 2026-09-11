// Wave 53 (E1) — a genuinely NEW Action for the `ambient` archetype's
// wildlife population (wildlifeSync.ts), modeled on `wander.ts`'s own
// pick-a-point/walk/pause state machine but deliberately NOT that action
// reused, and NOT an edit to it either. Both were considered and rejected —
// see the reasoning below, verified live this session against the real
// wander.ts/config/archetypes.json rather than assumed.
//
// WHY `wander` CANNOT DRIVE THIS. Read live, `wander.ts`'s own considerations:
//   - `no_renderer` (`agent.steering === 'teleport' ? 1 : 0`) is a bool gate
//     true ONLY at LOD tier D — off-region, nothing rendering the agent. A
//     home-meadow songbird the player is meant to actually SEE roaming is,
//     by definition, tier A/B/C while the player is home. This gate is 0 for
//     it always, so `wander` can never win for a visible bird.
//   - `roster_villager` (`agent.bb.job !== null ? 1 : 0`) reads `bb.job`,
//     which `Agent.think` live-sets from `gs.villagers.find(v => v.id ===
//     this.id)` — no wildlife id will ever be in that array, so this gate is
//     ALSO 0, even off-screen.
//   - Even bypassing both gates, `wander.ts`'s own `chooseWanderPoint` does
//     `gs.villagers.find(v => v.id === agent.id)` and returns `null` (no
//     candidate point at all) for anyone not on the roster.
// So spawning a songbird under 'ambient' with wander.ts unmodified produces a
// permanently stationary agent — confirmed by reading every gate, not
// assumed from the archetype's name.
//
// WHY NOT EDIT `wander.ts` INSTEAD. Its own header is explicit that both
// gates are load-bearing for the real, shipped `villager`/`guard`
// archetypes it already serves: widening `no_renderer` would win the MOVE_TO
// splice at the top of Villagers.tsx's cascade and starve four shipped
// branches of the frames they run in (newcomer arrival, worksite
// performance, construction, market/campfire rituals — see that file's own
// comment). Wildlife has no competing renderer cascade to protect it from —
// `AmbientWildlife.tsx` is Agent-driven from the ground up, with nothing
// else ever touching a songbird's transform — so it doesn't NEED wander's
// restrictions, but villagers' own wander usage still does. A brand new,
// narrowly-scoped Action is the same shape of fix Wave 11 made for
// `villager` (wander.ts itself), applied here to a different archetype
// instead of widening an existing, tuned gate for an entity it was never
// written to cover.
//
// ANCHOR: not `villagerHomeSpot`/`gs.villagers` (wander.ts's own anchor) —
// no roster entry exists for a wildlife id. Anchored on the agent's OWN
// spawn position instead, captured once per id the first time this Activity
// starts for it (wildlifeSync.ts always spawns with a fixed, authored x/z,
// so "spawn position" and "home perch" are the same point for the whole
// session). A plain module-local Map, the same "small mutable leaf state"
// shape Locomotion.ts's own `steerState`/`anchorCache` already use.
import { getNavGrid, type NavGrid } from '@/game/navgrid';
import { AMBIENT } from '../config';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

/** Same fail-open contract wander.ts's own `gridFor` documents (a third
 *  copy, matching that file's own precedent rather than a shared export —
 *  see its header). */
function gridFor(region: string | null): NavGrid | null {
  try {
    return getNavGrid(region);
  } catch {
    return null;
  }
}

// No despawn cleanup, unlike Locomotion.ts's own per-agent steerState/
// anchorCache: a wildlife id is a small, fixed, authored string that never
// changes across sessions (wildlifeSync.ts's own WILDLIFE_POPULATION) and
// these agents are never despawned once spawned — so this Map holds at most
// one entry per songbird for the tab's whole lifetime, and a stale entry
// from an earlier session is never actually wrong: it was captured from the
// exact same authored spawn point the next session spawns at again.
const homeSpots = new Map<string, { x: number; z: number }>();

function chooseRoamPoint(agent: Agent): { x: number; z: number } | null {
  const cfg = AMBIENT.roam;
  let home = homeSpots.get(agent.id);
  if (!home) {
    home = { x: agent.position.x, z: agent.position.z };
    homeSpots.set(agent.id, home);
  }
  const grid = gridFor(agent.region);
  for (let i = 0; i < cfg.samples; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = cfg.minRadius + Math.random() * (cfg.radius - cfg.minRadius);
    const x = home.x + Math.cos(a) * r;
    const z = home.z + Math.sin(a) * r;
    // Deliberately no BUILD_REGION clamp (unlike wander.ts's own atHome
    // branch): that clamp exists there to match Villagers.tsx's legacy
    // cascade, which confines a ROSTER villager's wander to the home build
    // area. Wildlife has no such legacy cascade and no reason to be
    // confined to it — wildlifeSync.ts's own authored spawn points already
    // sit outside the build area on purpose, same as Wildlife.tsx's own
    // grazing horses.
    if (!grid || grid.isWalkable(x, z)) return { x, z };
  }
  // Every sample landed on blocked ground — hold still and let the cooldown
  // try again next time, same honest "no candidate" contract wander.ts uses
  // rather than coarse-stepping into a wall.
  return null;
}

class RoamActivity implements Activity {
  private elapsed = 0;
  private stepped = false;

  start(agent: Agent, _ctx: Context): void {
    this.elapsed = 0;
    this.stepped = false;
    const point = chooseRoamPoint(agent);
    if (!point) { agent.intent = null; return; }
    agent.intent = {
      type: 'MOVE_TO', position: point, speed: 'walk', stopDistance: AMBIENT.roam.stopDistance,
    };
  }

  update(agent: Agent, dt: number, _now: number): ActivityStatus {
    if (!agent.intent) return 'FAILURE';
    this.elapsed += dt;
    // wander.ts's own `travelStepped` rule, for the same reason (repeated,
    // not shared — see that file's comment): bb.movement holds whatever the
    // LAST stepLocomotion call left it as, and start() runs in the same tick
    // as this first update(), before anything has stepped the fresh intent.
    if (!this.stepped) { this.stepped = true; return 'RUNNING'; }

    const status = agent.bb.movement.status;
    if (status === 'arrived') { agent.intent = null; return 'SUCCESS'; }
    if (status === 'blocked') { agent.intent = null; return 'FAILURE'; }
    if (this.elapsed >= AMBIENT.roam.giveUpSec) { agent.intent = null; return 'FAILURE'; }
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };

export const ROAM: Action = {
  id: 'roam',
  category: 'ambient',
  weight: 0.3, // CATEGORY_WEIGHT.ambient
  interruptPriority: 0, // CATEGORY_INTERRUPT_PRIORITY.ambient
  minDuration: 1,
  cooldown: AMBIENT.roam.pauseSec,
  considerations: [
    // The inverse of wander.ts's `roster_villager` gate, deliberately: a
    // cheap safety inversion so `roam` can never accidentally win for a real
    // roster villager even if some future archetype edit mislists it —
    // rather than no gate at all, which would rely purely on archetype
    // list membership to keep the two separated.
    {
      name: 'no_job',
      input: (agent) => (agent.bb.job === null ? 1 : 0),
      curve: boolCurve,
    },
    // Real and free: Perception (core/Perception.ts) runs unconditionally
    // for every agent regardless of archetype, so `bb.threatLevel` is
    // genuinely populated here too, not a dead read.
    {
      name: 'not_threatened',
      input: (agent) => 1 - agent.bb.threatLevel,
      curve: notThreatenedCurve,
    },
  ],
  createActivity: () => new RoamActivity(),
};
