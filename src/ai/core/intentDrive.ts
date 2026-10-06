// CLN-18 · what an Agent's intent means for the figure that renders it.
// Villagers.tsx, Npc.tsx and Companion.tsx each spelled it out three times
// over — one branch per kind of intent, each with its own copy of the lines
// that put the figure where the Agent is. Which intents take a figure's
// frame, which of them step the Agent, and which clip each asks for are
// here; a renderer keeps what is its own: where it writes the position, how
// its rig is turned, what ground it stands on.
import type { Agent, Intent } from './Agent';
import { stepLocomotion } from './Locomotion';

/** an intent that takes a figure's frame from its renderer's own cascade */
export type DrivingIntent = Exclude<Intent, { type: 'IDLE' }>;

/**
 * Give this frame to the Agent's intent, if it has one that drives a figure.
 * A move and a turn step the Agent (Locomotion.ts: its position and yaw
 * advance); a PLAY_ANIM holds it where it stands. Returns that intent — the
 * caller then puts its figure at `agent.position` / `agent.yaw` and plays
 * the clip the intent asks for — or null when the frame is the renderer's
 * own (no Agent, no intent, IDLE).
 *
 * `anchors: false` is Tam's. Companion.tsx has never followed a
 * MOVE_TO_ANCHOR — nothing hands him one — and under one he holds still.
 */
export function driveIntent(agent: Agent | undefined, dt: number, anchors = true): DrivingIntent | null {
  const intent = agent?.intent;
  if (!agent || !intent) return null;
  if (intent.type === 'PLAY_ANIM') return intent;
  if (intent.type === 'MOVE_TO' || intent.type === 'FACE' || (intent.type === 'MOVE_TO_ANCHOR' && anchors)) {
    stepLocomotion(agent, dt);
    return intent;
  }
  return null;
}

/** The clips a figure's own walking may replace. Anything else — a greet
 *  wave, a one-shot — plays out. */
export const MOVE_CLIPS: ReadonlySet<string> = new Set(['anim_c_walk', 'anim_r_restpose']);

/** A villager's clip under an intent: the one a PLAY_ANIM names; standing,
 *  to turn; and on a move its gait — run or walk, standing once it has
 *  stopped — whatever was playing before. */
export function gaitClip(intent: DrivingIntent, agent: Agent): string {
  if (intent.type === 'PLAY_ANIM') return intent.clip;
  if (intent.type === 'FACE') return 'anim_r_restpose';
  if (agent.bb.movement.status !== 'moving') return 'anim_r_restpose';
  return intent.speed === 'run' ? 'anim_c_run' : 'anim_c_walk';
}

/** A court figure's clip under an intent, and Tam's: the one a PLAY_ANIM
 *  names; standing, to turn; and on a move walking or standing — they have
 *  no run — but only in place of walking or standing: while anything else
 *  plays, `current` comes back and the clip is left alone. */
export function strollClip(intent: DrivingIntent, agent: Agent, current: string): string {
  if (intent.type === 'PLAY_ANIM') return intent.clip;
  if (intent.type === 'FACE') return 'anim_r_restpose';
  if (!MOVE_CLIPS.has(current)) return current;
  return agent.bb.movement.status === 'moving' ? 'anim_c_walk' : 'anim_r_restpose';
}
