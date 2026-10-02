import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { ASSIST_LEADER } from '@/ai/actions/assistLeader';
import { ENGAGE_THREAT } from '@/ai/actions/engageThreat';
import { ENGAGE_THREAT_VILLAGER } from '@/ai/actions/engageThreatVillager';
import type { Agent } from '@/ai/core/Agent';
import type { Action } from '@/ai/core/Reasoner';
import { enemyBeliefId, ensureBelief } from '@/ai/perception/Belief';
import { resolveEnemyKill, useEnemyStore, type EnemyData, type EnemyKind } from '../combat';
import { arenaState } from '../arena';
import { playerState } from '../playerState';
import { detonate, explodeBall } from '../siege';
import { useGameStore } from '../store/gameStore';
import type { CharacterConfig, ItemId, PlacedBuilding, Villager } from '../types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const OSRIC: Villager = { id: 'v1', name: 'Osric', job: 'defender', level: 1, xp: 60, loadout: 'sword_shield' };
const HOB: Villager = { id: 'v2', name: 'Hob', job: 'farmer' };
const game = () => useGameStore.getState();
const enemies = () => useEnemyStore.getState().enemies;
type Cause = Parameters<typeof resolveEnemyKill>[1];

/** every toast, with its `gold` argument exactly as it was passed */
let notes: [string, boolean | undefined][] = [];
const lines = () => notes.map(([text]) => text);

/** spawn one enemy carrying exactly `purse` and hand it back */
function spawn(kind: EnemyKind, purse: Partial<Record<ItemId, number>> = {}, opts: { arena?: boolean; finalStand?: boolean } = {}): EnemyData {
  useEnemyStore.getState().spawn(kind, 30, 30, false, undefined, false, opts.finalStand ?? false, 1, opts.arena ?? false);
  const e = enemies()[enemies().length - 1];
  e.inventory = purse;
  return e;
}
const held = (item: ItemId) => game().inventory[item] ?? 0;
/** the combat XP one kill pays, measured from zero so that no earlier level scales it */
function xpFor(e: EnemyData, cause: Cause): number {
  useGameStore.setState({ xp: { ...game().xp, combat: 0 } } as never);
  resolveEnemyKill(e, cause);
  return game().xp.combat;
}

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => 100_000);
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  notes = [];
  useGameStore.setState({ notify: (text: string, gold?: boolean) => { notes.push([text, gold]); }, villagers: [OSRIC, HOB] } as never);
  Object.assign(playerState, { x: 30, y: 0, z: 31, yaw: 0, pitch: 0 });
  arenaState.kills = 0;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('resolveEnemyKill', () => {
  it('starts the fall and records the kill, whatever the cause', () => {
    const causes: Cause[] = [
      { by: 'melee' }, { by: 'ranged' }, { by: 'cannonball' }, { by: 'charge' }, { by: 'companion' },
      { by: 'defender', villager: OSRIC }, { by: 'villager', villager: HOB },
    ];
    for (const cause of causes) {
      const e = spawn('bandit');
      e.mob.dieT = 9;
      resolveEnemyKill(e, cause);
      expect([cause.by, e.mob.state, e.mob.dieT]).toEqual([cause.by, 'dying', 0]);
    }
    expect(game().stats.kills).toBe(causes.length);
    expect(game().stats.killsByKind.bandit).toBe(causes.length);
  });

  it("the player's blade: the kind's own XP, the purse, the arena tally, and the haul in the line", () => {
    resolveEnemyKill(spawn('royal', { plank: 2, gold: 3 }, { arena: true }), { by: 'melee' });
    expect(game().xp.combat).toBe(40);
    expect([held('plank'), held('gold')]).toEqual([2, 3]);
    expect(arenaState.kills).toBe(1);
    expect(notes).toEqual([['Royal Knight defeated! Looted 2× Plank, 3× Gold Coin.', undefined]]);
  });

  it("the player's bolt: the ranged bonus, the same purse and tally, and a gold line", () => {
    resolveEnemyKill(spawn('royal', { plank: 2, gold: 3 }, { arena: true }), { by: 'ranged' });
    expect(game().xp.combat).toBe(45);
    expect([held('plank'), held('gold')]).toEqual([2, 3]);
    expect(arenaState.kills).toBe(1);
    expect(notes).toEqual([['Royal Knight shot down! Looted 2× Plank, 3× Gold Coin.', true]]);
  });

  it('an empty purse is not announced, and an enemy outside the arena is not tallied', () => {
    resolveEnemyKill(spawn('skeleton'), { by: 'melee' });
    resolveEnemyKill(spawn('skeleton', { gold: 0 }), { by: 'ranged' });
    expect(lines()).toEqual(['Skeleton defeated!', 'Skeleton shot down!']);
    expect(arenaState.kills).toBe(0);
  });

  it('an ally hands the player the purse and nothing else', () => {
    const allies: [Cause, string][] = [
      [{ by: 'companion' }, 'Tam defeats a raider!'],
      [{ by: 'defender', villager: OSRIC }, 'Osric defeats a raider!'],
      [{ by: 'villager', villager: HOB }, 'Hob fights off a raider!'],
    ];
    for (const [cause, line] of allies) {
      const before = held('gold');
      notes = [];
      // a skeleton is still "a raider" to all three
      resolveEnemyKill(spawn('skeleton', { gold: 4 }, { arena: true }), cause);
      expect(notes).toEqual([[line, true]]);
      expect(held('gold')).toBe(before + 4);
    }
    expect(game().xp.combat).toBe(0);
    expect(arenaState.kills).toBe(0);
  });

  it('teaches the defender or Tam who made the kill, and no other villager', () => {
    resolveEnemyKill(spawn('bandit'), { by: 'defender', villager: OSRIC });
    resolveEnemyKill(spawn('bandit'), { by: 'villager', villager: HOB });
    resolveEnemyKill(spawn('bandit'), { by: 'companion' });
    expect(game().villagers.map((v) => v.xp)).toEqual([75, undefined]);
    expect(game().companion.xp).toBe(15);
  });

  it("a defender's new level is announced before their kill, Tam's after his", () => {
    useGameStore.setState({ villagers: [{ ...OSRIC, xp: 190 }], companion: { ...game().companion, xp: 190, level: 1 } } as never);
    resolveEnemyKill(spawn('bandit'), { by: 'defender', villager: OSRIC });
    resolveEnemyKill(spawn('bandit'), { by: 'companion' });
    expect(lines()).toEqual([
      'Osric the Defender has grown stronger! (Lv 2)', 'Osric defeats a raider!',
      'Tam defeats a raider!', 'Tam has grown stronger! (Lv 2)',
    ]);
  });

  it("Cedric's final stand ends his rebellion, at the player's own hand only", () => {
    for (const cause of [{ by: 'companion' }, { by: 'defender', villager: OSRIC }, { by: 'villager', villager: HOB }, { by: 'cannonball' }, { by: 'charge' }] as Cause[]) {
      resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), cause);
    }
    expect([game().defeatedCedric, game().cedricCaptures]).toEqual([false, 0]);

    // not every Cedric is the final stand
    resolveEnemyKill(spawn('cedric'), { by: 'melee' });
    expect(game().defeatedCedric).toBe(false);

    resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), { by: 'ranged' });
    expect([game().defeatedCedric, game().cedricCaptures]).toEqual([true, 1]);
    expect(lines()).toContain("🔒 Cedric's rebellion ends here — the Bull is dragged in chains at last!");
  });

  it('his own halberd can turn up among his effects, on the first capture only', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.1); // under the capstone's 0.25: the roll succeeds
    resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), { by: 'melee' });
    expect(held('halberd_legendary')).toBe(1);

    useGameStore.setState({ defeatedCedric: false } as never); // a jailbreak
    resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), { by: 'melee' });
    expect([game().cedricCaptures, held('halberd_legendary')]).toEqual([2, 1]);
  });

  // CLEANUP_PLAN.md's open question. These are the blast rules as CLN-12 found them, pinned so that changing them is
  // a decision and not an accident: a bandit's 30 XP and a bandit's name for every kind but the skeleton, no purse,
  // no arena tally, and a charge that says nothing at all.
  it('blast kills are kept as they were found', () => {
    expect(xpFor(spawn('skeleton', { stone: 2 }, { arena: true }), { by: 'cannonball' })).toBe(20);
    expect(xpFor(spawn('mountedRaider', { gold: 9 }), { by: 'cannonball' })).toBe(30); // not KIND_XP's 55
    expect(notes).toEqual([['Skeleton blasted!', true], ['Bandit blasted!', true]]);

    notes = [];
    expect(xpFor(spawn('skeleton', { stone: 2 }, { arena: true }), { by: 'charge' })).toBe(30); // not even a skeleton's 20
    expect(xpFor(spawn('gilbert', { gold: 9 }), { by: 'charge' })).toBe(30);
    expect(notes).toEqual([]);

    expect([held('stone'), held('gold'), arenaState.kills]).toEqual([0, 0, 0]);
  });

  it('settles a death once', () => {
    const e = spawn('bandit', { gold: 5 });
    resolveEnemyKill(e, { by: 'melee' });
    e.mob.dieT = 0.4;
    resolveEnemyKill(e, { by: 'melee' });
    resolveEnemyKill(e, { by: 'defender', villager: OSRIC });
    expect([game().stats.kills, game().xp.combat, held('gold'), e.mob.dieT]).toEqual([1, 30, 5, 0.4]);
    expect(notes).toHaveLength(1);
  });
});

// The player's blade and bolts are driven end to end in game/combat.test.ts. These are the other sites: each must
// reach the resolver with its own cause.
describe('the sites that call it', () => {
  it('a cannonball', () => {
    const near = spawn('royal');
    near.hp = 6;
    const far = spawn('royal');
    far.hp = 6; far.mob.x = 40;
    explodeBall({ id: 1, pos: { x: 30, y: 0.2, z: 30 }, vel: { x: 0, y: 0, z: 0 } });
    expect([near.mob.state, far.mob.state, far.hp]).toEqual(['dying', 'wander', 6]);
    expect(notes).toEqual([['Bandit blasted!', true]]);
    expect(game().xp.combat).toBe(30 + 5); // the kill, and the 5 any shot that hits something earns
  });

  it('a placed charge', () => {
    const charge = { id: 'c1', type: 'gate', x: 30, z: 30, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [charge] } as never);
    Object.assign(playerState, { x: 60, z: 60 });
    const e = spawn('bandit');
    detonate(charge);
    expect([e.mob.state, game().stats.kills, game().xp.combat]).toEqual(['dying', 1, 30]);
    expect(lines()).toEqual(['💥 The charge goes off!']);
  });

  /** one blow from an ally standing next to `e`, through the reasoner's own activity */
  function strike(action: Action, id: string, archetype: string, e: EnemyData): void {
    const agent = { id, archetype, position: { x: 30.5, y: 0, z: 30 }, intent: null, bb: { beliefs: new Map(), threatLevel: 1 }, region: null } as unknown as Agent;
    const belief = ensureBelief(agent.bb, enemyBeliefId(e.id), 100);
    Object.assign(belief, { confidence: 1, isVisibleNow: true });
    belief.lastKnownPosition.set(e.mob.x, 0, e.mob.z);
    const activity = action.createActivity!();
    activity.start(agent, {} as never);
    activity.update(agent, 0.1, 100);
  }

  it('Tam, a sworn defender and a villager', () => {
    const allies: [Action, string, string, string][] = [
      [ASSIST_LEADER, 'tam', 'companion', 'Tam defeats a raider!'],
      [ENGAGE_THREAT, OSRIC.id, 'guard', 'Osric defeats a raider!'],
      [ENGAGE_THREAT_VILLAGER, HOB.id, 'villager', 'Hob fights off a raider!'],
    ];
    for (const [action, id, archetype, line] of allies) {
      notes = [];
      const e = spawn('bandit', { gold: 2 });
      e.hp = 0.5;
      strike(action, id, archetype, e);
      expect([id, e.mob.state, lines()]).toEqual([id, 'dying', [line]]);
    }
    expect([game().stats.kills, held('gold'), game().companion.xp, game().villagers[0].xp]).toEqual([3, 6, 15, 75]);
  });

  it('an ally whose blow does not kill settles nothing', () => {
    const e = spawn('cedric');
    strike(ENGAGE_THREAT, OSRIC.id, 'guard', e);
    expect(e.hp).toBeLessThan(45);
    expect([e.mob.state, game().stats.kills, notes.length]).toEqual(['wander', 0, 0]);
  });
});
