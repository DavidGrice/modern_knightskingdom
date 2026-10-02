import { describe, expect, it } from 'vitest';
import type { Agent, Intent } from '../core/Agent';
import { createBlackboard } from '../core/Blackboard';
import { WalkToPointActivity, type Walk } from './walkLoop';

/** an agent whose `intent` setter records every assignment — the real one stamps a time on each */
function standIn(id: string) {
  const issued: (Intent | null)[] = [];
  let intent: Intent | null = null;
  const agent = {
    id, archetype: 'ambient', position: { x: 0, y: 0, z: 0 }, yaw: 0, region: null, bb: createBlackboard(id, 'villager', null),
    get intent() { return intent; },
    set intent(v: Intent | null) { intent = v; issued.push(v); },
  } as unknown as Agent;
  return { agent, issued };
}
const moving = (agent: Agent, status: 'moving' | 'arrived' | 'blocked') => { agent.bb.movement = { status, distRemaining: status === 'arrived' ? 0 : 3 }; };
const walk = (over: Partial<Walk> = {}): Walk => ({ pick: () => ({ x: 4, z: 7 }), config: { stopDistance: 0.5, giveUpSec: 10 }, ...over });

describe('the shared walk loop', () => {
  it('walks to the point it was given and succeeds on arrival, dropping the intent', () => {
    const s = standIn('b1');
    const act = new WalkToPointActivity(walk());
    act.start(s.agent, { target: null, now: 0 });
    expect(s.issued.splice(0)).toEqual([{ type: 'MOVE_TO', position: { x: 4, z: 7 }, speed: 'walk', stopDistance: 0.5 }]);

    moving(s.agent, 'arrived');   // stale: left over from before this walk began
    expect(act.update(s.agent, 0.1, 0.1)).toBe('RUNNING');
    moving(s.agent, 'moving');
    expect(act.update(s.agent, 1, 1.1)).toBe('RUNNING');
    moving(s.agent, 'arrived');
    expect([act.update(s.agent, 1, 2.1), s.issued]).toEqual(['SUCCESS', [null]]);
  });

  it('with nowhere to go it holds no intent and fails at once', () => {
    const s = standIn('b2');
    const act = new WalkToPointActivity(walk({ pick: () => null }));
    act.start(s.agent, { target: null, now: 0 });
    expect([s.agent.intent, act.update(s.agent, 0.1, 0.1)]).toEqual([null, 'FAILURE']);
  });

  it('a blocked landing fails, and so does covering no ground for too long', () => {
    const a = standIn('b3');
    const blocked = new WalkToPointActivity(walk());
    blocked.start(a.agent, { target: null, now: 0 });
    blocked.update(a.agent, 0.1, 0.1);
    moving(a.agent, 'blocked');
    expect([blocked.update(a.agent, 0.1, 0.2), a.agent.intent]).toEqual(['FAILURE', null]);

    const b = standIn('b4');
    const stuck = new WalkToPointActivity(walk());
    stuck.start(b.agent, { target: null, now: 0 });
    moving(b.agent, 'moving');
    expect([stuck.update(b.agent, 4, 4), stuck.update(b.agent, 4, 8), stuck.update(b.agent, 4, 12), b.agent.intent]).toEqual(['RUNNING', 'RUNNING', 'FAILURE', null]);
  });

  it('abort drops the intent', () => {
    const s = standIn('b5');
    const act = new WalkToPointActivity(walk());
    act.start(s.agent, { target: null, now: 0 });
    act.abort(s.agent);
    expect(s.agent.intent).toBeNull();
  });
});
