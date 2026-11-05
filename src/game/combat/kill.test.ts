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
import { detonate, explodeBall, fireCannon, useSiegeStore } from '../siege';
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
      { by: 'melee' }, { by: 'ranged' }, { by: 'cannonball' }, { by: 'emplacement' }, { by: 'charge' }, { by: 'companion' },
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
    for (const cause of [{ by: 'companion' }, { by: 'defender', villager: OSRIC }, { by: 'villager', villager: HOB }, { by: 'emplacement' }] as Cause[]) {
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

  // The owner's decision OD-04 (wave 64.3): a blast pays by who fired. Before it every blast paid as CLN-12 found it —
  // a bandit's 30 XP and a bandit's name for every kind but the skeleton, no purse, no final stand, and a charge that
  // said nothing at all.
  it("a shot the player looses and a charge: the kind's own XP and the purse, and what fell is named", () => {
    for (const by of ['cannonball', 'charge'] as const) {
      notes = [];
      expect(xpFor(spawn('cedric', { gold: 7 }), { by })).toBe(150);
      expect(xpFor(spawn('royal', { plank: 2 }), { by })).toBe(40);
      expect(xpFor(spawn('skeleton', {}, { arena: true }), { by })).toBe(20);
      // (Cedric's 150 also announces a combat level)
      expect(notes.filter(([text]) => text.includes('blasted'))).toEqual([
        ['Cedric the Bull blasted! Looted 7× Gold Coin.', true], ['Royal Knight blasted! Looted 2× Plank.', true], ['Skeleton blasted!', true],
      ]);
    }
    expect([held('gold'), held('plank'), arenaState.kills]).toEqual([14, 4, 0]);
  });

  it('an engine firing on its own: the purse and the right name, at the lower rate', () => {
    expect(xpFor(spawn('cedric', { gold: 7 }), { by: 'emplacement' })).toBe(30); // not KIND_XP's 150
    expect(xpFor(spawn('royal', { plank: 2 }), { by: 'emplacement' })).toBe(30);
    expect(xpFor(spawn('skeleton', {}, { arena: true }), { by: 'emplacement' })).toBe(20);
    expect(notes).toEqual([
      ['Cedric the Bull blasted! Looted 7× Gold Coin.', true], ['Royal Knight blasted! Looted 2× Plank.', true], ['Skeleton blasted!', true],
    ]);
    expect([held('gold'), held('plank'), arenaState.kills]).toEqual([7, 2, 0]);
  });

  it("Cedric's final stand is ended by a shot the player looses and by a charge, not by an engine on its own", () => {
    resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), { by: 'emplacement' });
    expect([game().defeatedCedric, game().cedricCaptures]).toEqual([false, 0]);
    resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), { by: 'cannonball' });
    expect([game().defeatedCedric, game().cedricCaptures]).toEqual([true, 1]);
    useGameStore.setState({ defeatedCedric: false } as never); // a jailbreak
    resolveEnemyKill(spawn('cedric', {}, { finalStand: true }), { by: 'charge' });
    expect([game().defeatedCedric, game().cedricCaptures]).toEqual([true, 2]);
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
  it('a cannonball, paid by who loosed it', () => {
    for (const [byPlayer, xp] of [[true, 40], [false, 30]] as const) {
      notes = [];
      useGameStore.setState({ xp: { ...game().xp, combat: 0 } } as never);
      const near = spawn('royal', { gold: 3 });
      near.hp = 6;
      const far = spawn('royal');
      far.hp = 6; far.mob.x = 40;
      explodeBall({ id: 1, pos: { x: 30, y: 0.2, z: 30 }, vel: { x: 0, y: 0, z: 0 }, byPlayer });
      expect([near.mob.state, far.mob.state, far.hp]).toEqual(['dying', 'wander', 6]);
      expect(notes).toEqual([['Royal Knight blasted! Looted 3× Gold Coin.', true]]);
      expect([byPlayer, game().xp.combat]).toEqual([byPlayer, xp + 5]); // the kill, and the 5 any shot that hits something earns
    }
    expect(held('gold')).toBe(6);
  });

  it('a shot carries who loosed it to where it bursts', () => {
    const cannon = { id: 'k1', type: 'cannon', x: 0, z: 0, rot: 0, built: 1 } as PlacedBuilding;
    game().addItems({ stone: 2 });
    fireCannon(cannon, true, 0);
    fireCannon(cannon, false, 0);
    expect(useSiegeStore.getState().balls.slice(-2).map((b) => b.byPlayer)).toEqual([true, false]);
  });

  it('a placed charge', () => {
    const charge = { id: 'c1', type: 'gate', x: 30, z: 30, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [charge] } as never);
    Object.assign(playerState, { x: 60, z: 60 });
    const e = spawn('royal', { gold: 3 });
    detonate(charge);
    expect([e.mob.state, game().stats.kills, game().xp.combat, held('gold')]).toEqual(['dying', 1, 40, 3]);
    expect(lines()).toEqual(['💥 The charge goes off!', 'Royal Knight blasted! Looted 3× Gold Coin.']);
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

  // A duel with Storm is first blood between her and the player. Tam used to charge her and end it as "Tam defeats a
  // raider!" — nobody won, and the princess died a monster's death.
  describe("Storm's duel", () => {
    const storm = () => enemies().find((e) => e.kind === 'storm');

    it("is won by the player's blade, and she is removed rather than killed", () => {
      resolveEnemyKill(spawn('storm'), { by: 'melee' });
      expect(storm()).toBeUndefined();
      expect([game().reputation.storm, game().stats.kills]).toEqual([10, 0]);
      expect(held('gold')).toBeGreaterThanOrEqual(20); // the duel's purse (her regard brings a little more)
      expect(lines()).toContain('You land the first blow — Storm grins: "Not bad. Care to go again sometime?"');
    });

    it('is ended by nothing else, whatever brings her to zero', () => {
      const others: Cause[] = [
        { by: 'ranged' }, { by: 'cannonball' }, { by: 'charge' }, { by: 'companion' },
        { by: 'defender', villager: OSRIC }, { by: 'villager', villager: HOB },
      ];
      const e = spawn('storm', { gold: 5 });
      e.hp = -1;
      for (const cause of others) resolveEnemyKill(e, cause);
      expect([storm()?.mob.state, game().stats.kills, game().xp.combat, held('gold'), notes.length, game().companion.xp])
        .toEqual(['wander', 0, 0, 0, 0, 0]);
      expect(game().reputation.storm ?? 0).toBe(0);
    });

    it('a cannonball and a charge pass her by', () => {
      const e = spawn('storm');
      explodeBall({ id: 1, pos: { x: 30, y: 0.2, z: 30 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true });
      const charge = { id: 'c1', type: 'gate', x: 30, z: 30, rot: 0, built: 1 } as PlacedBuilding;
      useGameStore.setState({ buildings: [charge] } as never);
      Object.assign(playerState, { x: 60, z: 60 });
      detonate(charge);
      // untouched, and a shot that found only her did not count as a hit
      expect([e.hp, e.mob.state, game().xp.combat]).toEqual([1, 'wander', 0]);
    });

    it("an ally's blow cannot end it, even one thrown at her", () => {
      const e = spawn('storm');
      for (const [action, id, archetype] of [[ASSIST_LEADER, 'tam', 'companion'], [ENGAGE_THREAT, OSRIC.id, 'guard'], [ENGAGE_THREAT_VILLAGER, HOB.id, 'villager']] as [Action, string, string][]) {
        strike(action, id, archetype, e);
      }
      expect([storm()?.mob.state, game().stats.kills, notes.length]).toEqual(['wander', 0, 0]);
    });
  });
});
