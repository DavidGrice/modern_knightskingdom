import { beforeEach, describe, expect, it, vi } from 'vitest';

// The enemy's frame, taken apart (CLN-13): the pieces that can now be asked one at a time. The world outside a blow is
// a name each: whether a shot is clear (H.los), whose damage the AI's memory heard of, whose swing was stopped.
const H = vi.hoisted(() => ({ los: true, damaged: [] as string[], cleared: [] as string[] }));
vi.mock('@/game/navgrid', async (original) => ({ ...(await original<object>()), hasLineOfSight: () => H.los }));
vi.mock('@/ai/perception/Senses', async (original) => ({ ...(await original<object>()), reportAgentDamaged: (id: string) => { H.damaged.push(id); } }));
vi.mock('@/ai/actions/combatState', async (original) => ({ ...(await original<object>()), clearCombatState: (id: string) => { H.cleared.push(id); } }));

import { closeIn, engage, swingAt, RANGED_ATTACK_CD } from './engage';
import { blowAtGuard, blowAtTam, blowAtVillager, RANGED_DMG } from './blows';
import { ATTACK_DMG } from '@/game/data/enemies';
import { walkwayStands } from './climb';
import { flank, paceOf, speedOf } from './movement';
import type { EnemyData } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import type { DefenderState } from '@/game/defenders';
import { companionCombatState } from '@/game/companion';
import { villagerCombatState } from '@/game/villagerCombat';
import { COMPANION_ID } from '@/game/data/companion';
import { KEEP_PART_BY_ID } from '@/game/data/keep';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import { useGameStore } from '@/game/store/gameStore';

type Mob = EnemyData['mob'];
const mob = (o: Partial<Mob> = {}): Mob => ({ x: 0, z: 0, yaw: 0, state: 'wander', attackCd: 1, wanderT: 1, ...o } as Mob);
const enemy = (o: Partial<EnemyData> = {}, m: Partial<Mob> = {}): EnemyData =>
  ({ id: 7, kind: 'bandit', hp: 8, scale: 1, raid: true, world: null, ...o, mob: mob(m) } as EnemyData);
const notes: string[] = [];
const st = { villagers: [{ id: 'g1', name: 'Bert' }, { id: 'v1', name: 'Alma' }], notify: (t: string) => { notes.push(t); } } as unknown as GameState;
const guard = (hp: number): DefenderState => ({ x: 3, z: 0, postX: 0, postY: 0, postZ: 0, elevated: false, hp, maxHp: 24, state: 'ok', downedUntil: 0, attackCd: 0, hurtCd: 0 });

beforeEach(() => {
  H.los = true;
  H.damaged.length = 0;
  H.cleared.length = 0;
  notes.length = 0;
});

describe('the swing (swingAt)', () => {
  it('takes the attack stance and runs the cooldown down, turning to its mark only when asked', () => {
    const m = mob({ yaw: 1, attackCd: 1 });
    const blow = vi.fn();
    swingAt(m, 0.25, null, blow);
    expect([m.state, m.attackCd, m.yaw]).toEqual(['attack', 0.75, 1]);
    swingAt(m, 0.25, { x: 0, z: -5 }, blow);
    expect(m.yaw).toBe(Math.atan2(-0, 5)); // facing (-sin, -cos): straight down -z
    expect(blow).not.toHaveBeenCalled();
  });
  it('lands the blow once the cooldown is out — and the blow, not the swing, sets the next one', () => {
    const m = mob({ attackCd: 0.1 });
    swingAt(m, 0.25, null, () => { m.attackCd = 1.6; });
    expect(m.attackCd).toBe(1.6);
  });
});

describe('the closing in (closeIn)', () => {
  it('takes the chase stance, holds the cooldown at 0.4 s, and steps its way at its pace, facing where it goes', () => {
    const m = mob({ attackCd: 0.3 });
    closeIn(m, 0.5, () => ({ nx: 0, nz: 1 }), 2);
    expect([m.state, m.attackCd, m.x, m.z, m.yaw]).toEqual(['chase', 0.4, 0, 1, Math.atan2(-0, -1)]);
  });
  it('works its way out after it has taken the stance (a route may be worked out on the way)', () => {
    const m = mob({ state: 'attack', attackCd: 2 });
    closeIn(m, 0.5, () => { expect([m.state, m.attackCd]).toEqual(['chase', 1.5]); return { nx: 1, nz: 0 }; }, 1);
  });
});

describe('engage', () => {
  it('swings when in reach, closes in when not', () => {
    const near = mob(), far = mob();
    const e = { face: null, blow: () => {}, way: () => ({ nx: 1, nz: 0 }), pace: 1 };
    engage(near, 0.1, { ...e, inReach: true });
    engage(far, 0.1, { ...e, inReach: false });
    expect([near.state, far.state]).toEqual(['attack', 'chase']);
  });
});

describe('the blows at the player\'s side', () => {
  it('set the next cooldown first: a crossbow\'s, or the kind\'s own', () => {
    const xbow = enemy({ ranged: true }), axe = enemy({ ranged: false });
    blowAtGuard(xbow, st, guard(10), 'g1', false);
    blowAtGuard(axe, st, guard(10), 'g1', false);
    expect([xbow.mob.attackCd, axe.mob.attackCd]).toEqual([RANGED_ATTACK_CD, 1.6]);
  });
  it('a crossbow hurts only with a clear shot; a melee blow always lands', () => {
    const g = guard(10);
    H.los = false;
    blowAtGuard(enemy({ ranged: true }), st, g, 'g1', false);
    expect([g.hp, H.damaged]).toEqual([10, []]);
    H.los = true;
    blowAtGuard(enemy({ ranged: true, scale: 2 }), st, g, 'g1', false);
    expect([g.hp, H.damaged]).toEqual([10 - RANGED_DMG * 2, ['g1']]);
    const m = guard(10);
    H.los = false; // a melee blow asks for no sightline: it lands anyway
    blowAtGuard(enemy({ kind: 'gilbert', ranged: false }), st, m, 'g1', false);
    expect(m.hp).toBe(10 - ATTACK_DMG.gilbert);
  });
  // The one difference between the three, kept as it always was: a guard's knock-down is looked at after every swing,
  // so one already beaten (by something else) goes down even when the crossbow's shot is blocked; Tam's and a
  // villager's knock-down is part of the hit, so a blocked shot leaves them as they are.
  it('a beaten guard goes down even when the shot at him is blocked — Tam and a villager do not', () => {
    H.los = false;
    const g = guard(-1);
    blowAtGuard(enemy({ ranged: true }), st, g, 'g1', true);
    expect(g.state).toBe('downed');
    expect(notes).toEqual(['Bert is knocked down defending the battlements!']);
    companionCombatState[COMPANION_ID] = { hp: -1, maxHp: 14, state: 'ok', downedUntil: 0 } as never;
    villagerCombatState.v1 = { hp: -1, maxHp: 12, state: 'ok', downedUntil: 0 } as never;
    blowAtTam(enemy({ ranged: true }), st, { x: 3, z: 0 });
    blowAtVillager(enemy({ ranged: true }), st, { id: 'v1', x: 3, z: 0 });
    expect([companionCombatState[COMPANION_ID].state, villagerCombatState.v1.state, notes.length]).toEqual(['ok', 'ok', 1]);
  });
  it('Tam and a villager, hit down, are knocked down and their swing stopped', () => {
    companionCombatState[COMPANION_ID] = { hp: 1, maxHp: 14, state: 'ok', downedUntil: 0 } as never;
    villagerCombatState.v1 = { hp: 1, maxHp: 12, state: 'ok', downedUntil: 0 } as never;
    blowAtTam(enemy({ kind: 'gilbert' }), st, { x: 3, z: 0 });
    blowAtVillager(enemy({ kind: 'gilbert' }), st, { id: 'v1', x: 3, z: 0 });
    expect([companionCombatState[COMPANION_ID].state, villagerCombatState.v1.state]).toEqual(['downed', 'downed']);
    expect(H.cleared).toEqual([COMPANION_ID, 'v1']);
    expect(notes).toEqual(['Tam is knocked down defending you!', 'Alma is knocked down defending the homestead!']);
  });
});

describe('walkwayStands', () => {
  const walk = Object.keys(KEEP_PART_BY_ID).find((p) => KEEP_PART_BY_ID[p].walkway)!;
  const bare = Object.keys(KEEP_PART_BY_ID).find((p) => !KEEP_PART_BY_ID[p].walkway)!;
  const keep = (part: string | undefined, built?: number) => ({ keep: { x: 0, z: 0, parts: { n: part }, built: built === undefined ? {} : { n: built } } }) as unknown as GameState;
  it('is true only for a finished piece of the keep that carries a walk', () => {
    expect(walkwayStands(keep(walk, 1), 'n')).toBe(true);
    expect([
      walkwayStands({ keep: null } as unknown as GameState, 'n'),
      walkwayStands(keep(walk, 1), undefined), walkwayStands(keep(walk, 1), ''), walkwayStands(keep(walk, 1), 's'),
      walkwayStands(keep(walk, 0.5), 'n'), walkwayStands(keep(walk), 'n'),
      walkwayStands(keep(bare, 1), 'n'), walkwayStands(keep('', 1), 'n'), walkwayStands(keep('no_such_part', 1), 'n'),
    ]).toEqual([false, false, false, false, false, false, false, false, false]);
  });
});

describe('how an enemy moves', () => {
  it('a skeleton shambles beyond 8 m and lunges inside it; every other kind keeps its speed', () => {
    expect([paceOf(enemy({ kind: 'skeleton' }), 2, 9), paceOf(enemy({ kind: 'skeleton' }), 2, 8), paceOf(enemy(), 2, 9)]).toEqual([2 * 0.7, 2 * 1.5, 2]);
  });
  it('flanks on its own shoulder at a distance, and comes straight on inside 5 m', () => {
    const way = { nx: 0, nz: 1 };
    expect(flank(way, 1, 5)).toEqual(way);
    expect(flank(way, 3, 30)).toEqual(way); // the pack's middle (id % 7 = 3) comes straight on
    const turned = flank(way, 0, 30);
    expect(Math.hypot(turned.nx, turned.nz)).toBeCloseTo(1, 12);
    expect(Math.atan2(turned.nx, turned.nz)).toBeCloseTo(0.8, 12); // id 0's flank, (0/6 - 0.5) * 1.6 = -0.8 rad, turns (0, 1) to bearing 0.8
  });
  it("its speed: the kind's own, Storm's climbing with her reputation, an arena's multiplier", () => {
    arenaState.env = 'earth';
    useGameStore.setState({ reputation: { storm: 50 } as never });
    expect([speedOf(enemy({ kind: 'skeleton' })), speedOf(enemy({ kind: 'storm' })), speedOf(enemy({ kind: 'mountedRaider' })), speedOf(enemy())])
      .toEqual([2.1, 2.6 + 0.5, 2.7 * 1.9, 2.7]);
    const env = Object.keys(ARENA_ENV_BY_ID).find((k) => ARENA_ENV_BY_ID[k as keyof typeof ARENA_ENV_BY_ID].enemySpeedMult !== 1)!;
    arenaState.env = env as never;
    expect(speedOf(enemy({ arena: true }))).toBe(2.7 * ARENA_ENV_BY_ID[env as keyof typeof ARENA_ENV_BY_ID].enemySpeedMult);
  });
});
