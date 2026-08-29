// Wave 25 — follow_leader: the first real Action behind the `companion`
// archetype's own intrinsic list (archetypes.json), which has listed this id
// since phase 5 with nothing registered for it (this game had no follower
// entity for it to be about — see PHASE_STATUS.md's phase 7 section). Also
// the first real WRITER, anywhere in this codebase, of `Blackboard.leaderId`
// — a field that has sat unwritten since phase 1 (Blackboard.ts's own
// createBlackboard initializes it to null and nothing else ever touches it).
//
// THE WRITE IS A DOCUMENTED SIDE EFFECT, NOT THE GATE — a deliberate
// correction of the plan's own phrasing. The plan describes this action as
// "writing bb.leaderId", which read as though that write were what gates the
// action's own scoring. That is circular: `assembleCandidates` (Reasoner.ts)
// scores every candidate BEFORE `Activity.start()` ever runs, so a
// consideration reading `bb.leaderId` to decide whether to fire would read
// `null` forever on an agent whose only writer is this same Action's own
// `start()`. The real gate is `agent.archetype === 'companion'` — the exact
// belt-and-braces role `is_defender` plays for `engage_threat` (redundant
// with archetypes.json's own intrinsic-list filtering today, future-proofed
// the same way). `bb.leaderId` itself is written as a real fact about who
// this agent is following — v1 has exactly one possible leader (the player),
// which is why the value written is the literal sentinel `'player'` rather
// than a lookup into a leader registry that doesn't exist yet. See
// game/falcon.ts's own header for the "how tightly should a v1 companion
// scope" precedent this mirrors.
import { playerState } from '@/game/playerState';
import { COMPANION } from '../config';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';
import { registerCompanionCombat } from '@/game/companion';

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };

class FollowLeaderActivity implements Activity {
  private aimedX = 0;
  private aimedZ = 0;
  private hasAim = false;

  start(agent: Agent, _ctx: Context): void {
    agent.bb.leaderId = 'player';
    this.hasAim = false;
  }

  update(agent: Agent, _dt: number, _now: number): ActivityStatus {
    // a documented side effect, re-affirmed every tick — see this file's own
    // header for why this is not the gate
    agent.bb.leaderId = 'player';
    const dist = Math.hypot(playerState.x - agent.position.x, playerState.z - agent.position.z);
    const cfg = COMPANION.follow;
    if (dist <= cfg.stopDistance) {
      // Close enough: stand and face the player, same "hold position, keep
      // eyes on it" shape take_cover/engage_threat use once arrived — a
      // companion who keeps closing the last half-metre every tick reads as
      // jittery, not attentive.
      agent.intent = { type: 'FACE', target: { x: playerState.x, z: playerState.z } };
      this.hasAim = false;
      return 'RUNNING';
    }
    // Re-aimed only when the player has actually moved far enough —
    // re-issuing a near-identical MOVE_TO every tick would re-stamp
    // Agent.intentSetAt (Agent.ts's own setter) and hide the intent's real
    // age from the debug overlay, the same reasoning engage_threat's own
    // `approach()` re-aim guard documents.
    if (!this.hasAim || Math.hypot(playerState.x - this.aimedX, playerState.z - this.aimedZ) > cfg.repathDistance) {
      this.aimedX = playerState.x;
      this.aimedZ = playerState.z;
      this.hasAim = true;
      agent.intent = {
        type: 'MOVE_TO',
        position: { x: playerState.x, z: playerState.z },
        speed: dist > cfg.runDistance ? 'run' : 'walk',
        stopDistance: cfg.stopDistance,
      };
    }
    return 'RUNNING';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}

export const FOLLOW_LEADER: Action = {
  id: 'follow_leader',
  category: 'companion',
  weight: 2.0, // CATEGORY_WEIGHT.companion
  interruptPriority: 5, // CATEGORY_INTERRUPT_PRIORITY.companion
  // Long enough that a momentary path hiccup doesn't flap the action off and
  // back on; short enough that assist_leader (combat, interruptPriority 8)
  // still preempts it the instant a real threat needs answering, since 8 > 5
  // clears the interrupt-override test regardless of minDuration.
  minDuration: 1,
  cooldown: 0,
  considerations: [
    {
      name: 'is_companion',
      input: (agent) => (agent.archetype === 'companion' ? 1 : 0),
      curve: boolCurve,
    },
    {
      // Wave 25 companion-vulnerability wiring's own gate: while downed
      // (Enemies.tsx's companionTarget branch), Tam neither follows nor
      // fights — he lies still and auto-recovers, the same
      // `not_downed`-gates-everything shape engage_threat_villager already
      // documents. registerCompanionCombat lazily creates the record on
      // first read, same as engage_threat_villager's own
      // registerVillagerCombat call.
      name: 'not_downed',
      input: (agent) => (registerCompanionCombat(agent.id).state === 'downed' ? 0 : 1),
      curve: boolCurve,
    },
  ],
  createActivity: () => new FollowLeaderActivity(),
};
