import { beforeEach, describe, expect, it, vi } from 'vitest';
// FIRST on purpose: the records below are built at module scope from the two props' state objects, so this module
// must be loadable before anything else has been (a regression would show as a ReferenceError right here).
import { hitRaiderProp, RAIDER_PROPS } from './structures';
import { useGameStore } from '../store/gameStore';
import { raiderRamState, resetRaiderRam } from '../raiderRam';
import { raiderLadderState } from '../raiderLadder';
import { stepBolt, type Bolt } from './projectiles';
import { activeMelee, playerAttack } from './melee';
import { combatState } from './state';
import { MELEE } from '../data/melee';
import { playerState } from '../playerState';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const [RAM, LADDER] = RAIDER_PROPS;
let sounds: unknown[][];
let lines: [string, boolean][];

beforeEach(() => {
  vi.restoreAllMocks();
  sounds = [];
  vi.spyOn(audio, 'play').mockImplementation(((...a: unknown[]) => { sounds.push(a); return null; }) as never);
  game().newGame(HERO as never);
  lines = [];
  useGameStore.setState({ notify: (text: string, gold?: boolean) => { lines.push([text, !!gold]); } });
  resetRaiderRam(10, 10);
  Object.assign(raiderLadderState, { active: true, x: 20, z: 20, hp: 22, wrecked: false, wreckT: 0, planted: true });
});

const purse = () => { const inv = game().inventory; return [inv.wood ?? 0, inv.plank ?? 0, inv.iron_bar ?? 0]; };
/** the lines a wreck speaks (60 experience also takes a new hero up a combat level, which is the store's own line) */
const wreckLines = () => lines.filter(([text]) => text.includes('wrecked'));
const bolt = (x: number, y: number, z: number, vx: number): Bolt => ({ id: 1, kind: 'bolt', pos: { x, y, z }, vel: { x: vx, y: 0, z: 0 }, age: 0, damage: 4 }) as Bolt;

describe("the raiders' props as things the player can break", () => {
  it('are the ram and then the ladder, each over its own live state', () => {
    expect(RAIDER_PROPS.length).toBe(2);
    expect(RAM.state).toBe(raiderRamState);
    expect(LADDER.state).toBe(raiderLadderState);
    expect([RAM.radius, RAM.midY, RAM.xp, RAM.salvage]).toEqual([1.1, 0.9, 60, { wood: 4, plank: 2, iron_bar: 1 }]);
    expect([LADDER.radius, LADDER.midY, LADDER.xp, LADDER.salvage]).toEqual([1.1, 1.6, 40, { wood: 3, plank: 2 }]);
  });

  it('a blow that does not finish one only sounds', () => {
    const [before, xp] = [purse(), game().xp.combat];
    hitRaiderProp(RAM, 12);
    expect(sounds).toEqual([['brick_collide', 0.5]]);
    expect([raiderRamState.hp, raiderRamState.wrecked, purse(), game().xp.combat, lines]).toEqual([18, false, before, xp, []]);
  });

  it('the blow that wrecks the ram pays its salvage, its experience and its line — once', () => {
    const [before, xp] = [purse(), game().xp.combat];
    hitRaiderProp(RAM, 30);
    expect(sounds).toEqual([['explosion', 0.7]]);
    expect(purse()).toEqual([before[0] + 4, before[1] + 2, before[2] + 1]);
    expect(game().xp.combat).toBe(xp + 60);
    expect(wreckLines()).toEqual([["The raiders' ram is wrecked! Salvaged 4× Wood Log, 2× Plank, 1× Iron Bar.", true]]);
    // a wreck takes nothing more, and pays nothing more
    hitRaiderProp(RAM, 30);
    expect(sounds.slice(1)).toEqual([['brick_collide', 0.5]]);
    expect([purse(), game().xp.combat, wreckLines().length]).toEqual([[before[0] + 4, before[1] + 2, before[2] + 1], xp + 60, 1]);
  });

  it('the ladder is worth less, and wrecking one leaves the other standing', () => {
    const [before, xp] = [purse(), game().xp.combat];
    hitRaiderProp(LADDER, 22);
    expect(purse()).toEqual([before[0] + 3, before[1] + 2, before[2]]);
    expect(game().xp.combat).toBe(xp + 40);
    expect(wreckLines()).toEqual([["The raiders' siege ladder is wrecked! Salvaged 3× Wood Log, 2× Plank.", true]]);
    expect([raiderLadderState.wrecked, raiderRamState.wrecked, raiderRamState.hp]).toEqual([true, false, 30]);
  });

  it('the salvage on record is not used up by being paid out', () => {
    hitRaiderProp(RAM, 30);
    expect(RAM.salvage).toEqual({ wood: 4, plank: 2, iron_bar: 1 });
  });
});

describe('a shaft against them', () => {
  it('strikes the ram at waist height and drops', () => {
    expect(stepBolt(bolt(8, 0.9, 10, 60), 1 / 20)).toBe(true); // flies from x 8 to x 11, through the ram at 10
    expect(raiderRamState.hp).toBe(26);
    expect(sounds).toEqual([['brick_collide', 0.5], ['thud', 0.7]]);
  });

  it('passes over the ram where it would still strike the taller ladder', () => {
    expect(stepBolt(bolt(8, 2.3, 10, 60), 1 / 20)).toBe(false); // 1.4 above the ram's 0.9: clear of its 1.1
    expect(raiderRamState.hp).toBe(30);
    expect(stepBolt(bolt(18, 2.3, 20, 60), 1 / 20)).toBe(true); // 0.7 above the ladder's 1.6
    expect(raiderLadderState.hp).toBe(18);
  });

  it('meets the ram first when both stand in its way', () => {
    Object.assign(raiderLadderState, { x: 10.2, z: 10 });
    expect(stepBolt(bolt(8, 1.2, 10, 60), 1 / 20)).toBe(true);
    expect([raiderRamState.hp, raiderLadderState.hp]).toEqual([26, 22]);
  });

  it('flies through where a wreck lies', () => {
    Object.assign(raiderRamState, { wrecked: true, hp: 0 });
    expect(stepBolt(bolt(8, 0.9, 10, 60), 1 / 20)).toBe(false);
    expect(sounds).toEqual([]);
  });
});

describe('a blade against them, when nothing living is in reach', () => {
  /** stand `south` metres south of (x, z), looking north at it (yaw 0 looks down -Z) — or the other way */
  const stand = (x: number, z: number, south: number, facing: 'north' | 'south' = 'north') => {
    Object.assign(playerState, { x, y: 0, z: z + south, yaw: facing === 'north' ? 0 : Math.PI, pitch: 0 });
    combatState.stamina = combatState.maxStamina;
  };
  const reach = () => MELEE[activeMelee()].reach;

  it("lands on the ram in front of the player, at arm's length plus the ram's own girth", () => {
    stand(10, 10, reach() + 1.0); // the blade alone would fall a metre short; the ram is 1.1 wide
    expect(playerAttack()).toBe(true);
    expect(raiderRamState.hp).toBeLessThan(30);
    expect(sounds).toContainEqual(['brick_collide', 0.5]);
    const after = raiderRamState.hp;
    stand(10, 10, reach() + 1.2); // out of that, too
    playerAttack();
    expect(raiderRamState.hp).toBe(after);
  });

  it('not on one behind the player or off to the side, and not on a wreck', () => {
    stand(10, 10, 1.5, 'south');
    playerAttack();
    expect(raiderRamState.hp).toBe(30);
    // abreast of it, a step and a half to its east, still looking north: outside the swing's arc
    Object.assign(playerState, { x: 11.5, z: 10, yaw: 0 });
    combatState.stamina = combatState.maxStamina;
    playerAttack();
    expect(raiderRamState.hp).toBe(30);
    Object.assign(raiderRamState, { wrecked: true, hp: 0 });
    stand(10, 10, 1.5);
    playerAttack();
    expect([raiderRamState.hp, sounds.filter(([name]) => name === 'brick_collide' || name === 'explosion')]).toEqual([0, []]);
  });

  it('on both when both are in the arc — the ram does not shield the ladder', () => {
    Object.assign(raiderLadderState, { x: 10.3, z: 10 });
    stand(10, 10, 1.5);
    playerAttack();
    expect(raiderRamState.hp).toBeLessThan(30);
    expect(raiderLadderState.hp).toBeLessThan(22);
  });

  it('on the ladder alone when the ram is out of play', () => {
    raiderRamState.active = false;
    stand(20, 20, 1.5);
    playerAttack();
    expect([raiderRamState.hp, raiderLadderState.hp < 22]).toEqual([30, true]);
  });
});

describe('a shaft with the ram out of play', () => {
  it('still strikes the ladder', () => {
    raiderRamState.active = false;
    expect(stepBolt(bolt(18, 1.6, 20, 60), 1 / 20)).toBe(true);
    expect(raiderLadderState.hp).toBe(18);
  });
});
