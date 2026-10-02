import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { useEnemyStore, type EnemyData, type EnemyKind } from '@/game/combat';
import { playerState } from '@/game/playerState';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig } from '@/game/types';
import type { Agent, Intent } from '../core/Agent';
import { createBlackboard } from '../core/Blackboard';
import { enemyBeliefId, ensureBelief } from '../perception/Belief';
import { peekCombatState } from './combatState';
import { MeleeEngageActivity, type MeleeFighter } from './meleeEngage';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const CONFIG = { reach: 1.8, approachStop: 1.4, swingSeconds: 1, loseTargetSec: 3 };

/** an agent whose `intent` setter records every assignment — the real one stamps a time on each */
function standIn(id: string, x: number, z: number) {
  const issued: (Intent | null)[] = [];
  let intent: Intent | null = null;
  const agent = {
    id, archetype: 'villager', position: { x, y: 0, z }, yaw: 0, region: null, bb: createBlackboard(id, 'villager', null),
    get intent() { return intent; },
    set intent(v: Intent | null) { intent = v; issued.push(v); },
  } as unknown as Agent;
  return { agent, issued, types: () => issued.splice(0).map((i) => i?.type ?? null) };
}
function spawn(kind: EnemyKind, x: number, z: number, hp?: number): EnemyData {
  useEnemyStore.getState().spawn(kind, x, z);
  const all = useEnemyStore.getState().enemies;
  const e = all[all.length - 1];
  if (hp !== undefined) e.hp = hp;
  e.inventory = {};
  return e;
}
function believe(agent: Agent, e: EnemyData, now = 100) {
  const b = ensureBelief(agent.bb, enemyBeliefId(e.id), now);
  Object.assign(b, { confidence: 1, isVisibleNow: true, lastSeenAt: now });
  b.lastKnownPosition.set(e.mob.x, 0, e.mob.z);
  return b;
}
/** a fighter who hits for 2 and is credited as an ordinary villager */
const fighter = (over: Partial<MeleeFighter> = {}): MeleeFighter => ({
  config: CONFIG,
  blow: () => ({ damage: 2, cause: { by: 'villager', villager: { name: 'Hob' } } }),
  ...over,
});

let notes: string[] = [];
beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  useGameStore.getState().newGame(HERO);
  notes = [];
  useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
  Object.assign(playerState, { x: 30, y: 0, z: 30 });
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the shared melee engage', () => {
  it('runs at where the hostile is believed to be, and re-aims only when that moves by more than a metre', () => {
    const s = standIn('m1', 30, 30);
    const b = believe(s.agent, spawn('gilbert', 40, 30));
    const act = new MeleeEngageActivity(fighter());
    act.start(s.agent, { target: null, now: 100 });
    expect(s.issued).toEqual([{ type: 'MOVE_TO', position: { x: 40, z: 30 }, speed: 'run', stopDistance: 1.4 }]);
    s.issued.length = 0;

    expect(act.update(s.agent, 0.1, 100.1)).toBe('RUNNING');
    b.lastKnownPosition.set(40.9, 0, 30);
    act.update(s.agent, 0.1, 100.2);
    expect(s.issued).toEqual([]); // an identical or barely different aim is not re-issued

    b.lastKnownPosition.set(42, 0, 30);
    act.update(s.agent, 0.1, 100.3);
    expect(s.issued).toEqual([{ type: 'MOVE_TO', position: { x: 42, z: 30 }, speed: 'run', stopDistance: 1.4 }]);
    expect(peekCombatState('m1')).toMatchObject({ mode: 'engage', threatX: 42, threatZ: 30 });
  });

  it('in reach: swings, holds the clip for the first half of the cooldown, then raises its guard, then swings again', () => {
    const s = standIn('m2', 30, 30);
    const e = spawn('cedric', 31, 30);
    const b = believe(s.agent, e);
    const act = new MeleeEngageActivity(fighter());
    act.start(s.agent, { target: null, now: 100 });
    s.types();

    act.update(s.agent, 0.1, 100.1);
    expect([s.types(), e.hp]).toEqual([['PLAY_ANIM'], 43]);
    act.update(s.agent, 0.3, 100.4);      // 0.7 left: the swing still has the clip
    expect(s.types()).toEqual([]);
    act.update(s.agent, 0.3, 100.7);      // 0.4 left: under half
    expect(s.types()).toEqual(['FACE']);
    act.update(s.agent, 0.1, 100.8);      // an unmoved target is not re-faced
    expect(s.types()).toEqual([]);
    b.lastKnownPosition.set(31.7, 0, 30);
    act.update(s.agent, 0.05, 100.85);    // one that has shifted more than half a metre is
    expect(s.issued.splice(0)).toEqual([{ type: 'FACE', target: { x: 31.7, z: 30 } }]);
    act.update(s.agent, 0.4, 101.25);     // the cooldown is spent
    expect([s.types(), e.hp, peekCombatState('m2')?.hits]).toEqual([['PLAY_ANIM'], 41, 2]);
  });

  it('a blow thrown at a remembered position misses a target that has stepped away', () => {
    const s = standIn('m3', 30, 30);
    const e = spawn('cedric', 31, 30);
    believe(s.agent, e);
    e.mob.x = 36; // the belief still says 31
    const act = new MeleeEngageActivity(fighter());
    act.start(s.agent, { target: null, now: 100 });
    act.update(s.agent, 0.1, 100.1);
    expect([e.hp, peekCombatState('m3')?.hits]).toEqual([45, 0]);
  });

  it("a kill is settled under the fighter's own cause", () => {
    const s = standIn('m4', 30, 30);
    const e = spawn('bandit', 31, 30, 1);
    believe(s.agent, e);
    const act = new MeleeEngageActivity(fighter({ blow: () => ({ damage: 2, cause: { by: 'companion' } }) }));
    act.start(s.agent, { target: null, now: 100 });
    act.update(s.agent, 0.1, 100.1);
    expect([e.mob.state, notes, useGameStore.getState().companion.xp]).toEqual(['dying', ['Tam defeats a raider!'], 15]);
  });

  it('a fighter who cannot strike still swings, and lands nothing', () => {
    const s = standIn('m5', 30, 30);
    const e = spawn('bandit', 31, 30);
    believe(s.agent, e);
    const act = new MeleeEngageActivity(fighter({ blow: () => null }));
    act.start(s.agent, { target: null, now: 100 });
    s.types();
    expect(act.update(s.agent, 0.1, 100.1)).toBe('RUNNING');
    expect([s.types(), e.hp, peekCombatState('m5')?.hits]).toEqual([['PLAY_ANIM'], 8, 0]);
  });

  it('ends cleanly when there is nothing left to fight', () => {
    // nothing believed
    const a = standIn('m6', 30, 30);
    const act = new MeleeEngageActivity(fighter());
    act.start(a.agent, { target: null, now: 100 });
    expect([act.update(a.agent, 0.1, 100.1), a.issued, peekCombatState('m6')?.mode]).toEqual(['SUCCESS', [], null]);

    // standing where it was last seen, long after losing sight of it
    const b = standIn('m7', 30, 30);
    const belief = believe(b.agent, spawn('bandit', 31, 30));
    Object.assign(belief, { isVisibleNow: false, lastSeenAt: 90 });
    const act2 = new MeleeEngageActivity(fighter());
    act2.start(b.agent, { target: null, now: 100 });
    expect(act2.update(b.agent, 0.1, 100.1)).toBe('SUCCESS');
  });

  it('a downed fighter stops before another blow, and a leashed one drops the chase', () => {
    let down = false;
    const s = standIn('m8', 30, 30);
    const e = spawn('cedric', 31, 30);
    believe(s.agent, e);
    const act = new MeleeEngageActivity(fighter({ isDowned: () => down, config: { ...CONFIG, leashDistance: 20 } }));
    act.start(s.agent, { target: null, now: 100 });
    act.update(s.agent, 0.1, 100.1);
    expect(e.hp).toBe(43);

    down = true;
    expect([act.update(s.agent, 5, 105.1), e.hp]).toEqual(['SUCCESS', 43]);

    down = false;
    Object.assign(playerState, { x: 300, z: 300 });
    s.types();
    expect([act.update(s.agent, 5, 110.1), s.issued, e.hp]).toEqual(['SUCCESS', [null], 43]);
  });

  it('a fresh engagement starts its hit count again', () => {
    const s = standIn('m10', 30, 30);
    believe(s.agent, spawn('cedric', 31, 30));
    const first = new MeleeEngageActivity(fighter());
    first.start(s.agent, { target: null, now: 100 });
    first.update(s.agent, 0.1, 100.1);
    expect(peekCombatState('m10')?.hits).toBe(1);
    new MeleeEngageActivity(fighter()).start(s.agent, { target: null, now: 101 });
    expect(peekCombatState('m10')?.hits).toBe(0);
  });

  it('abort drops the intent and the combat readout', () => {
    const s = standIn('m9', 30, 30);
    believe(s.agent, spawn('bandit', 40, 30));
    const act = new MeleeEngageActivity(fighter());
    act.start(s.agent, { target: null, now: 100 });
    act.abort(s.agent);
    expect([s.agent.intent, peekCombatState('m9')?.mode]).toEqual([null, null]);
  });
});
