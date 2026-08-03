// Requested 2026-08-03 (ROADMAP.md's "Comprehensive AI/animation rig" —
// reactive behaviors): an agent turning to acknowledge the player simply
// walking up, distinct from the existing dialogue greet wave
// (gameStore.pokeNpc() bumps npcGreetSeq, Npc.tsx:58-62), which only fires
// once the player actually initiates a conversation. Nothing reacted to
// mere presence before this.
//
// Deliberately NOT built on full §6 Perception (vision cones/hearing/belief
// decay, NPC_AI_SPEC.md) — that system assumes a navcat-based navmesh stack
// this project never adopted (Phase 2 extended navgrid.ts instead, a
// documented divergence, PHASE_STATUS.md), and nothing here needs line-of-
// sight or memory: a plain squared-distance check against playerState is
// the same one-directional read every other AI/combat file already uses
// (see combat.ts/Enemies.tsx's own distToPlayer), not a new sensor.
import { playerState } from '@/game/playerState';
import type { Agent } from '../core/Agent';
import type { Action, Activity, ActivityStatus, Context } from '../core/Reasoner';
import type { Curve } from '../core/curves';

const NOTICE_RANGE = 5;
const HOLD = 1.8;
// deliberately NOT anim_r_greet1/regalwave — those are reserved for the
// dialogue greet (see this file's own header), so a passive notice reads
// distinctly from an actual conversation
const REACTION_CLIPS = ['anim_c_attention', 'anim_c_confused'];

class NoticePlayerActivity implements Activity {
  private phase: 'face' | 'react' = 'face';
  private holdTimer = 0;

  start(agent: Agent, _ctx: Context): void {
    this.phase = 'face';
    this.holdTimer = 0;
    agent.intent = { type: 'FACE', target: { x: playerState.x, z: playerState.z } };
  }

  update(agent: Agent, dt: number): ActivityStatus {
    if (this.phase === 'face') {
      // one tick to issue the turn, then straight into the reaction clip —
      // same "no turn-finished signal to wait on" reasoning gather.ts/
      // haul.ts's own align phase already documents
      this.phase = 'react';
      const clip = REACTION_CLIPS[Math.floor(Math.random() * REACTION_CLIPS.length)];
      agent.intent = { type: 'PLAY_ANIM', clip, loop: false, anchored: true };
      return 'RUNNING';
    }
    this.holdTimer += dt;
    return this.holdTimer < HOLD ? 'RUNNING' : 'SUCCESS';
  }

  abort(agent: Agent): void {
    agent.intent = null;
  }
}

function distToPlayer(agent: Agent): number {
  return Math.hypot(playerState.x - agent.position.x, playerState.z - agent.position.z);
}

const boolCurve: Curve = { type: 'bool', m: 0, k: 0, b: 0, c: 0 };
const notThreatenedCurve: Curve = { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 };

export const NOTICE_PLAYER: Action = {
  id: 'notice_player',
  category: 'social',
  weight: 0.8, // CATEGORY_WEIGHT.social
  interruptPriority: 1, // CATEGORY_INTERRUPT_PRIORITY.social
  minDuration: 1,
  // a per-agent cooldown so standing near an NPC doesn't re-trigger every
  // think tick — long enough to read as "already said hello", short enough
  // that leaving and coming back later gets a fresh reaction
  cooldown: 20,
  considerations: [
    { name: 'player_close', input: (agent) => (distToPlayer(agent) < NOTICE_RANGE ? 1 : 0), curve: boolCurve },
    { name: 'not_threatened', input: (agent) => 1 - agent.bb.threatLevel, curve: notThreatenedCurve },
  ],
  createActivity: () => new NoticePlayerActivity(),
};
