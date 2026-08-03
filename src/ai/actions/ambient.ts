// Requested 2026-08-03 (ROADMAP.md's "Comprehensive AI/animation rig" —
// idle variety): a real `ambient`-category action, filling a slot
// `Reasoner.ts` already reserved (`CATEGORY_WEIGHT.ambient = 0.3`,
// `CATEGORY_INTERRUPT_PRIORITY.ambient = 0`, both defined since phase 5 but
// never used by a real Action until this one). An idle character today
// plays `anim_r_restpose` forever (Villagers.tsx/Npc.tsx) — there is no
// dedicated ambient breathing-loop clip in the extraction (only 15 clips
// exist total, `public/assets/anims/`), but there ARE unused one-shot
// reaction clips, previously reachable only through the player's own Emotes
// wheel. This repurposes a curated subset of them as background fidgets for
// anyone with nothing better to do.
//
// Lowest weight/interruptPriority of any category by construction, so this
// only ever wins when every other candidate (needs, work, social, combat)
// scores zero — i.e. genuine idle time, with no separate "how long has this
// agent been idle" timer needed on top.
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

// Deliberately excludes combat-flavored clips (anim_c_angry,
// anim_c_surprisejump, anim_g_*) and the dialogue-only greet waves
// (anim_r_greet1/anim_r_regalwave — reserved for gameStore.pokeNpc's own
// click-triggered greeting, and for notice.ts's passive reaction) — this
// pool is background life only.
const FIDGET_CLIPS = ['anim_c_think', 'anim_c_confused', 'anim_c_attention', 'anim_c_pleased', 'anim_r_congratulate'];

// No real per-clip duration reaches this module (that's rig/animator-side
// data, lazily loaded by RiggedFigure/MinifigAnimator) — same "fixed hold,
// not a real onEnd signal" approach haul.ts's own one-shot deposit clip
// already uses for exactly this reason.
const HOLD = 2.2;

class IdleFidgetActivity implements Activity {
  private holdTimer = 0;

  start(agent: Agent, _ctx: Context): void {
    this.holdTimer = 0;
    const clip = FIDGET_CLIPS[Math.floor(Math.random() * FIDGET_CLIPS.length)];
    agent.intent = { type: 'PLAY_ANIM', clip, loop: false, anchored: true };
  }

  update(_agent: Agent, dt: number): ActivityStatus {
    this.holdTimer += dt;
    return this.holdTimer < HOLD ? 'RUNNING' : 'SUCCESS';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}

const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };

export const IDLE_FIDGET: Action = {
  id: 'idle_fidget',
  category: 'ambient',
  weight: 0.3, // CATEGORY_WEIGHT.ambient
  interruptPriority: 0, // CATEGORY_INTERRUPT_PRIORITY.ambient — anything can interrupt it
  minDuration: 1,
  cooldown: 8,
  considerations: [
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: notThreatenedCurve },
  ],
  createActivity: () => new IdleFidgetActivity(),
};
