import { beforeEach, describe, expect, it, vi } from 'vitest';

// the actuator itself is Locomotion's own business; here it is enough to see who is stepped
vi.mock('./Locomotion', () => ({ stepLocomotion: vi.fn() }));

import { stepLocomotion } from './Locomotion';
import { driveIntent, gaitClip, MOVE_CLIPS, strollClip } from './intentDrive';
import type { Agent, Intent } from './Agent';

const agentWith = (intent: Intent | null, status = 'idle') => ({ intent, bb: { movement: { status } } }) as unknown as Agent;
const MOVE: Intent = { type: 'MOVE_TO', position: { x: 1, z: 2 }, speed: 'walk', stopDistance: 0.5 };
const RUN: Intent = { type: 'MOVE_TO', position: { x: 1, z: 2 }, speed: 'run', stopDistance: 0.5 };
const ANCHOR: Intent = { type: 'MOVE_TO_ANCHOR', targetId: 'tree_1' as never, anchorName: 'use', speed: 'run' };
const ANIM: Intent = { type: 'PLAY_ANIM', clip: 'anim_g_swordswish', loop: false, anchored: true };
const FACE: Intent = { type: 'FACE', target: { x: 0, z: 0 } };
const IDLE: Intent = { type: 'IDLE' };
const stepped = () => vi.mocked(stepLocomotion).mock.calls;

beforeEach(() => { vi.mocked(stepLocomotion).mockClear(); });

describe('driveIntent', () => {
  it('a move and a turn step the Agent and take the frame', () => {
    for (const intent of [MOVE, RUN, ANCHOR, FACE]) {
      vi.mocked(stepLocomotion).mockClear();
      const agent = agentWith(intent);
      expect(driveIntent(agent, 0.25)).toBe(intent);
      expect(stepped()).toEqual([[agent, 0.25]]);
    }
  });

  it('a held animation takes the frame without stepping anyone', () => {
    expect(driveIntent(agentWith(ANIM), 0.25)).toBe(ANIM);
    expect(stepped()).toEqual([]);
  });

  it('with no Agent, no intent, or nothing to do, the frame is the renderer\'s own', () => {
    expect([driveIntent(undefined, 0.25), driveIntent(agentWith(null), 0.25), driveIntent(agentWith(IDLE), 0.25)]).toEqual([null, null, null]);
    expect(stepped()).toEqual([]);
  });

  it('Tam does not follow a MOVE_TO_ANCHOR, and is not stepped under one', () => {
    expect(driveIntent(agentWith(ANCHOR), 0.25, false)).toBeNull();
    expect(stepped()).toEqual([]);
    // everything else is as for anyone
    expect([MOVE, FACE, ANIM].map((intent) => driveIntent(agentWith(intent), 0.25, false))).toEqual([MOVE, FACE, ANIM]);
    expect(stepped().length).toBe(2);
  });
});

describe('the clip an intent asks for', () => {
  it('walking and standing are what a figure\'s own movement may replace', () => {
    expect([...MOVE_CLIPS].sort()).toEqual(['anim_c_walk', 'anim_r_restpose']);
  });

  it('a villager: the named clip, standing to turn, and its gait on the move', () => {
    expect(gaitClip(ANIM as never, agentWith(ANIM, 'moving'))).toBe('anim_g_swordswish');
    expect(gaitClip(FACE as never, agentWith(FACE, 'moving'))).toBe('anim_r_restpose');
    expect([MOVE, RUN, ANCHOR].map((intent) => gaitClip(intent as never, agentWith(intent, 'moving')))).toEqual(['anim_c_walk', 'anim_c_run', 'anim_c_run']);
    // not moving — arrived, blocked, not started — is standing, at either pace
    expect(['arrived', 'blocked', 'idle'].map((status) => gaitClip(RUN as never, agentWith(RUN, status)))).toEqual(['anim_r_restpose', 'anim_r_restpose', 'anim_r_restpose']);
  });

  it('a court figure or Tam: the named clip, standing to turn, and a walk — never a run — on the move', () => {
    expect(strollClip(ANIM as never, agentWith(ANIM), 'anim_r_greet1')).toBe('anim_g_swordswish');
    expect(strollClip(FACE as never, agentWith(FACE), 'anim_r_greet1')).toBe('anim_r_restpose');
    expect([MOVE, RUN, ANCHOR].map((intent) => strollClip(intent as never, agentWith(intent, 'moving'), 'anim_r_restpose'))).toEqual(['anim_c_walk', 'anim_c_walk', 'anim_c_walk']);
    expect(['arrived', 'blocked', 'idle'].map((status) => strollClip(MOVE as never, agentWith(MOVE, status), 'anim_c_walk'))).toEqual(['anim_r_restpose', 'anim_r_restpose', 'anim_r_restpose']);
  });

  it('a wave in progress plays out: a move leaves any clip but walking and standing alone', () => {
    expect(strollClip(MOVE as never, agentWith(MOVE, 'moving'), 'anim_r_greet1')).toBe('anim_r_greet1');
    expect(strollClip(MOVE as never, agentWith(MOVE, 'arrived'), 'anim_r_regalwave')).toBe('anim_r_regalwave');
    // a villager's is replaced whatever it was (gaitClip is not told what is playing)
    expect(gaitClip(MOVE as never, agentWith(MOVE, 'moving'))).toBe('anim_c_walk');
  });
});
