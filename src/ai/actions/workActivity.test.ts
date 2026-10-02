import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig } from '@/game/types';
import { workSignals } from '@/game/workSignal';
import type { Agent, Intent } from '../core/Agent';
import { createBlackboard } from '../core/Blackboard';
import type { ActivityStatus } from '../core/Reasoner';
import { targetRegistry, type Target } from '../core/TargetRegistry';
import { TEND_FARMPLOT } from './farm';
import { GATHER_RESOURCE } from './gather';
import { HAUL_TO_DEPOSIT } from './haul';
import { WorkActivity, proximityInput } from './workActivity';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const TREE = 'node:t1';
const STOCKPILE = 'bldg:s1';
const BED = 'bldg:f1';

/** an agent whose `intent` setter records every assignment — the real one stamps a time on each */
function standIn(id: string) {
  const issued: (Intent | null)[] = [];
  let intent: Intent | null = null;
  const agent = {
    id, archetype: 'villager', position: { x: 48, y: 0, z: 48 }, yaw: 0, region: null, bb: createBlackboard(id, 'villager', null),
    get intent() { return intent; },
    set intent(v: Intent | null) { intent = v; issued.push(v); },
  } as unknown as Agent;
  agent.bb.carryCapacity = 3;
  return { agent, issued, types: () => issued.splice(0).map((i) => i?.type ?? null) };
}
const ctx = (id: string) => ({ target: targetRegistry.get(id), now: 100 });
const moving = (agent: Agent, status: 'moving' | 'arrived' | 'blocked') => { agent.bb.movement = { status, distRemaining: status === 'arrived' ? 0 : 3 }; };
const held = (id: string) => targetRegistry.reservedCount(id);

/** the smallest possible job: three ticks of work at a tree, counted */
class CountingWork extends WorkActivity {
  protected readonly slotKind = 'count';
  protected readonly source = 'node';
  ticks = 0;
  begun = 0;
  protected beginWork(): void { this.begun++; this.ticks = 0; }
  protected workIntent(): Intent { return { type: 'PLAY_ANIM', clip: 'anim_g_swordswish', loop: true, anchored: true }; }
  protected perform(agent: Agent, _dt: number, _target: Target): ActivityStatus {
    return ++this.ticks >= 3 ? this.finish(agent, 'SUCCESS') : 'RUNNING';
  }
}
/** start, then tick until the worker is in place and has fallen to work */
function setTo(work: WorkActivity, agent: Agent, id: string): void {
  work.start(agent, ctx(id));
  work.update(agent, 0.1, 100.1);   // the first tick does not trust the stale status
  moving(agent, 'arrived');
  work.update(agent, 0.1, 100.2);   // arrived: face it
  work.update(agent, 0.1, 100.3);   // aligned: the work begins
}

beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  useGameStore.getState().newGame(HERO);
  useGameStore.setState({
    notify: () => undefined,
    villagers: [{ id: 'w1', name: 'Wat', job: 'lumberjack' }, { id: 'w2', name: 'Hob', job: 'farmer' }],
    nodes: [{ id: 't1', kind: 'tree', x: 50, z: 50, scale: 1, yaw: 0, hitsLeft: 5, respawnAt: null }],
    buildings: [
      { id: 's1', type: 'stockpile', x: 50, z: 60, rot: 0, built: 1 },
      { id: 'f1', type: 'farmplot', x: 54, z: 60, rot: 0, built: 1 },
    ],
    plots: {},
  } as never);
  targetRegistry.clear();
  for (const k of Object.keys(workSignals)) delete workSignals[k];
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the shared work skeleton', () => {
  it('claims a slot and sets off for the anchor', () => {
    const s = standIn('w1');
    new CountingWork().start(s.agent, ctx(TREE));
    expect(s.issued).toEqual([{ type: 'MOVE_TO_ANCHOR', targetId: TREE, anchorName: 'default', speed: 'walk' }]);
    expect([held(TREE), s.agent.bb.reservation]).toEqual([1, { targetId: TREE, slotKind: 'count' }]);
  });

  it("does not trust the movement status on its first tick, then walks, faces, and falls to work", () => {
    const s = standIn('w1');
    const work = new CountingWork();
    work.start(s.agent, ctx(TREE));
    s.types();
    moving(s.agent, 'arrived');   // left over from whatever this agent did last
    expect([work.update(s.agent, 0.1, 100.1), s.types(), workSignals.w1]).toEqual(['RUNNING', [], undefined]);

    moving(s.agent, 'moving');
    expect([work.update(s.agent, 0.1, 100.2), s.types()]).toEqual(['RUNNING', []]);
    moving(s.agent, 'arrived');
    expect([work.update(s.agent, 0.1, 100.3), s.issued.splice(0)]).toEqual(['RUNNING', [{ type: 'FACE', target: { x: 50, z: 50 } }]]);
    // in place: the work signal goes up with the clip, never during the walk
    expect([work.update(s.agent, 0.1, 100.4), s.types(), workSignals.w1]).toEqual(['RUNNING', ['PLAY_ANIM'], { active: true, targetId: TREE, kind: 'tree' }]);
    expect([work.begun, work.ticks]).toEqual([2, 0]);
  });

  it('re-issues the work clip on every working tick, and frees everything when the job is done', () => {
    const s = standIn('w1');
    const work = new CountingWork();
    setTo(work, s.agent, TREE);
    s.types();
    expect([work.update(s.agent, 0.5, 101), work.update(s.agent, 0.5, 101.5), s.types()]).toEqual(['RUNNING', 'RUNNING', ['PLAY_ANIM', 'PLAY_ANIM']]);
    expect(work.update(s.agent, 0.5, 102)).toBe('SUCCESS');
    expect([held(TREE), s.agent.bb.reservation, workSignals.w1]).toEqual([0, null, undefined]);
  });

  it('a blocked path rests the target for a while and frees the slot', () => {
    const s = standIn('w1');
    const work = new CountingWork();
    work.start(s.agent, ctx(TREE));
    work.update(s.agent, 0.1, 100.1);
    moving(s.agent, 'blocked');
    expect(work.update(s.agent, 0.1, 100.2)).toBe('FAILURE');
    expect([held(TREE), s.agent.bb.blockedTargets.get(TREE)]).toEqual([0, 100.2 + 15]);
  });

  it('a target that is gone, or is the wrong kind of thing, fails and frees the slot', () => {
    const a = standIn('w1');
    const gone = new CountingWork();
    gone.start(a.agent, ctx(TREE));
    useGameStore.setState({ nodes: [] } as never);
    expect([gone.update(a.agent, 0.1, 100.1), a.agent.bb.reservation]).toEqual(['FAILURE', null]);

    const b = standIn('w2');
    const wrong = new CountingWork();   // works at nodes only
    wrong.start(b.agent, ctx(STOCKPILE));
    expect(held(STOCKPILE)).toBe(1);
    expect([wrong.update(b.agent, 0.1, 100.1), held(STOCKPILE)]).toEqual(['FAILURE', 0]);
  });

  it('with no target, or no slot left, it fails without touching anyone else', () => {
    const none = standIn('w1');
    const idle = new CountingWork();
    idle.start(none.agent, { target: null, now: 100 });
    expect([idle.update(none.agent, 0.1, 100.1), none.issued]).toEqual(['FAILURE', []]);

    // a tree has two slots
    const a = standIn('a'), b = standIn('b'), c = standIn('c');
    new CountingWork().start(a.agent, ctx(TREE));
    new CountingWork().start(b.agent, ctx(TREE));
    const third = new CountingWork();
    third.start(c.agent, ctx(TREE));
    expect([c.issued, held(TREE)]).toEqual([[], 2]);
    expect([third.update(c.agent, 0.1, 100.1), held(TREE)]).toEqual(['FAILURE', 2]);
    third.abort(c.agent);
    expect(held(TREE)).toBe(2);
  });

  it('abort frees the slot and the signal, drops the intent and leaves the sack alone', () => {
    const s = standIn('w1');
    s.agent.bb.carrying = { resource: 'wood', amount: 2 };
    const work = new CountingWork();
    setTo(work, s.agent, TREE);
    work.abort(s.agent);
    expect([held(TREE), s.agent.bb.reservation, workSignals.w1, s.agent.intent, s.agent.bb.carrying])
      .toEqual([0, null, undefined, null, { resource: 'wood', amount: 2 }]);
  });

  it('proximity is the straight-line distance over the 40 m query radius, capped at 1', () => {
    const s = standIn('w1');
    expect(proximityInput(s.agent, { target: null, now: 0 })).toBe(0);
    expect(proximityInput(s.agent, ctx(STOCKPILE))).toBeCloseTo(Math.hypot(2, 12) / 40, 9);
    s.agent.position.x = 500;
    expect(proximityInput(s.agent, ctx(STOCKPILE))).toBe(1);
  });
});

// each real job, once through, on the same skeleton
describe('the three jobs on it', () => {
  it('gathering fills the sack a swing at a time', () => {
    const s = standIn('w1');
    const work = GATHER_RESOURCE.createActivity!() as WorkActivity;
    setTo(work, s.agent, TREE);
    let status: ActivityStatus = 'RUNNING';
    for (let i = 0; i < 20 && status === 'RUNNING'; i++) status = work.update(s.agent, 0.5, 101 + i);
    expect([status, s.agent.bb.carrying, held(TREE)]).toEqual(['SUCCESS', { resource: 'wood', amount: 3 }, 0]);
    expect(useGameStore.getState().nodes[0].hitsLeft).toBe(2);
  });

  it('hauling sets the load down at the stockpile', () => {
    const s = standIn('w1');
    s.agent.bb.carrying = { resource: 'wood', amount: 3 };
    const before = useGameStore.getState().inventory.wood ?? 0;
    const work = HAUL_TO_DEPOSIT.createActivity!() as WorkActivity;
    setTo(work, s.agent, STOCKPILE);
    let status: ActivityStatus = 'RUNNING';
    for (let i = 0; i < 20 && status === 'RUNNING'; i++) status = work.update(s.agent, 0.25, 101 + i);
    expect([status, s.agent.bb.carrying, (useGameStore.getState().inventory.wood ?? 0) - before, held(STOCKPILE)]).toEqual(['SUCCESS', null, 3, 0]);
  });

  it('farming sows an untilled bed', () => {
    const s = standIn('w2');
    const work = TEND_FARMPLOT.createActivity!() as WorkActivity;
    setTo(work, s.agent, BED);
    let status: ActivityStatus = 'RUNNING';
    for (let i = 0; i < 20 && status === 'RUNNING'; i++) status = work.update(s.agent, 0.5, 101 + i);
    expect([status, useGameStore.getState().plots.f1 > 0, held(BED)]).toEqual(['SUCCESS', true, 0]);
  });
});
