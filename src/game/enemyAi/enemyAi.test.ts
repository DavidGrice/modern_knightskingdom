import { beforeEach, describe, expect, it, vi } from 'vitest';

// The enemy's frame, taken apart (CLN-13): the pieces that can now be asked one at a time. The world outside a blow is
// a name each: whether a shot is clear (H.los), whose damage the AI's memory heard of, whose swing was stopped — and
// (G-10) which barks were called for, and the spells loosed.
const H = vi.hoisted(() => ({ los: true, damaged: [] as string[], cleared: [] as string[], barks: [] as string[], spells: 0 }));
vi.mock('@/game/barks', async (original) => ({ ...(await original<object>()), bark: (e: string) => { H.barks.push(e); return true; } }));
vi.mock('@/game/combat/projectiles', async (original) => ({ ...(await original<object>()), fireSpellBolt: () => { H.spells++; } }));
vi.mock('@/game/navgrid', async (original) => ({ ...(await original<object>()), hasLineOfSight: () => H.los }));
vi.mock('@/ai/perception/Senses', async (original) => ({ ...(await original<object>()), reportAgentDamaged: (id: string) => { H.damaged.push(id); } }));
vi.mock('@/ai/actions/combatState', async (original) => ({ ...(await original<object>()), clearCombatState: (id: string) => { H.cleared.push(id); } }));

import { closeIn, dropStaleDraw, engage, swingAt, swingOf, RANGED_ATTACK_CD, RANGED_DMG } from './engage';
import { blowAtGuard, blowAtTam, blowAtVillager } from './blows';
import { ATTACK_DMG } from '@/game/data/enemies';
import { FINISHER_STAGGER_S } from '@/game/data/melee';
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
import * as THREE from 'three';
import { stepEnemy, type EnemyFrame } from './step';
import { registerDefender, resetDefenders } from '@/game/defenders';
import { playerState } from '@/game/playerState';

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
  H.barks.length = 0;
  H.spells = 0;
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

// G-10 · golden, written on the base: a crossbow bandit 8 m from a sworn guard (the player far off), his frame run at
// 1/30 s — on which frames the guard is struck, and the clip asked for on each. Changed on purpose: the base struck on
// 13, 67, 121 with the sword's swish; the shot is now drawn on 13 (the arrival's 0.4 s) and loosed on its clip's
// release 41 frames on (1.34 s), then every 54 frames (1.8 s) as before, with the crossbow's clip.
const frameOf = (data: EnemyData): EnemyFrame => {
  const f: EnemyFrame = {
    data, group: { current: new THREE.Group() }, rigRef: { current: null }, scatter: { current: null },
    path: { current: { pts: [], i: 0, t: 0, tx: 0, tz: 0 } }, clip: 'anim_c_walk', setClip: (c) => { f.clip = c; },
    cue: { n: 0, held: false }, setCue: (c) => { f.cue = c; },
    pace: { current: { x: 0, z: 0, v: -1 } }, setRidePace: () => {}, remove: () => {}, enemyAtHome: true, speed: 2,
  };
  return f;
};
// G-10 · own check: arriving within reach, the 0.4 s closeIn holds his cooldown at; on the base of this wave's fix the
// attack clip showed at once, from the previous swing's cue (a blow's follow-through, a crossbow's kick, with nothing
// loosed)
describe('arriving within reach (stepEnemy)', () => {
  it('he squares up at rest until his first swing is begun, then plays his attack from its start', () => {
    resetDefenders(new Set());
    const g = registerDefender('g9', 8, 0, 0);
    Object.assign(g, { hp: 100, maxHp: 100 });
    Object.assign(playerState, { x: 200, y: 0, z: 200 });
    const f = frameOf(enemy({ ranged: true, raid: false }, { state: 'chase', attackCd: 0.4 }));
    const clips: string[] = [];
    for (let i = 1; i <= 14; i++) { stepEnemy(f, 1 / 30); clips.push(f.clip); }
    expect(new Set(clips.slice(0, 12))).toEqual(new Set(['anim_r_restpose'])); // the hold: frames 1-12
    expect(clips.slice(12)).toEqual(['anim_g_crossbowshot', 'anim_g_crossbowshot']); // drawn on 13
    expect(f.cue).toEqual({ n: 1, held: true });
    // drawn off and back again (a chase, the 0.4 s hold once more): at rest again till his next swing, not the last one's
    Object.assign(f.data.mob, { state: 'chase', attackCd: 0.4, draw: undefined });
    const again: string[] = [];
    for (let i = 1; i <= 13; i++) { stepEnemy(f, 1 / 30); again.push(f.clip); }
    expect(new Set(again.slice(0, 12))).toEqual(new Set(['anim_r_restpose']));
    expect(again[12]).toBe('anim_g_crossbowshot');
    expect(f.cue.n).toBe(2);
  });
});

describe("a crossbow's shot at a guard, frame by frame (stepEnemy)", () => {
  it('the frames on which the guard is struck, and the clip each', () => {
    resetDefenders(new Set());
    const g = registerDefender('g9', 8, 0, 0);
    Object.assign(g, { hp: 100, maxHp: 100 });
    Object.assign(playerState, { x: 200, y: 0, z: 200 });
    const f = frameOf(enemy({ ranged: true, raid: false }, { state: 'chase', attackCd: 0.4 }));
    const hits: string[] = [];
    for (let i = 1; i <= 150; i++) {
      const hp = g.hp;
      stepEnemy(f, 1 / 30);
      if (g.hp < hp) hits.push(`${i} ${f.clip}`);
    }
    expect(hits).toMatchInlineSnapshot(`
      [
        "54 anim_g_crossbowshot",
        "108 anim_g_crossbowshot",
      ]
    `);
  });
});

// G-10 · the draw: a shot held to its clip's release, and let go if its striker does not see it through
describe('a shot drawn (swingAt)', () => {
  const xbow = { mark: 'def:g1', release: 0.5 };
  it('begins as the cooldown runs out, cues the clip, and lands once, `release` on — the next cooldown taken from its start', () => {
    const m = mob({ attackCd: 0.1 });
    const blow = vi.fn(() => { m.attackCd = 1.8; });
    swingAt(m, 0.125, null, blow, xbow);
    expect([m.swings, m.draw?.t, blow.mock.calls.length]).toEqual([1, 0.5, 0]);
    for (let k = 0; k < 3; k++) swingAt(m, 0.125, null, blow, xbow);
    expect(blow).not.toHaveBeenCalled();
    swingAt(m, 0.125, null, blow, xbow); // 0.5 s drawn
    expect([blow.mock.calls.length, m.draw, m.swings]).toEqual([1, undefined, 1]);
    expect(m.attackCd).toBeCloseTo(1.8 - 0.5, 9); // the next draw 1.3 s on: shot follows shot every 1.8 s
  });
  it('a blow with no draw lands at once, as it always did, and is counted a swing', () => {
    const m = mob({ attackCd: 0.05 });
    const blow = vi.fn(() => { m.attackCd = 1.6; });
    swingAt(m, 0.1, null, blow);
    expect([blow.mock.calls.length, m.swings, m.draw]).toEqual([1, 1, undefined]);
  });
  it('is let go when he swings at another mark — and draws on the new one from its start', () => {
    const m = mob({ attackCd: 0 });
    const blow = vi.fn();
    swingAt(m, 0.1, null, blow, xbow);
    swingAt(m, 0.3, null, blow, xbow);
    swingAt(m, 0.1, null, blow, { mark: 'tam', release: 0.5 });
    expect([m.draw?.mark, m.draw?.t, m.swings]).toEqual(['tam', 0.5, 2]);
    swingAt(m, 0.3, null, blow, { mark: 'tam', release: 0.5 });
    expect(blow).not.toHaveBeenCalled();
  });
  it('is let go when he is staggered while drawing it — drawn again from its start once the stagger is out', () => {
    const m = mob({ attackCd: 0 });
    const blow = vi.fn(() => { m.attackCd = 1.8; });
    swingAt(m, 0.125, null, blow, xbow);
    swingAt(m, 0.125, null, blow, xbow);
    m.attackCd = Math.max(m.attackCd, FINISHER_STAGGER_S); // a finisher lands, 0.25 s into the draw
    swingAt(m, 0.125, null, blow, xbow);
    expect([m.draw, blow.mock.calls.length]).toEqual([undefined, 0]);
    for (let k = 0; k < 14; k++) swingAt(m, 0.125, null, blow, xbow); // the stagger runs out on the last of these
    expect([m.draw?.t, m.swings, blow.mock.calls.length]).toEqual([0.5, 2, 0]);
    for (let k = 0; k < 4; k++) swingAt(m, 0.125, null, blow, xbow);
    expect(blow).toHaveBeenCalledTimes(1);
  });
  it('is let go at the head of a frame he did not swing on at it (dropStaleDraw)', () => {
    const m = mob({ attackCd: 0 });
    swingAt(m, 0.1, null, () => {}, xbow);
    dropStaleDraw(m); // he swung on it last frame: kept
    expect(m.draw?.mark).toBe('def:g1');
    dropStaleDraw(m); // and not since: let go
    expect(m.draw).toBeUndefined();
  });
});

// G-10 · the draw in the frame: a crossbow bandit and the guard he shoots at, 8 m apart, frame by frame at 1/30 s; the
// shot is drawn on the first frame (cooldown 0) and lands 41 frames on, on frame 42 (swingOf's 1.34 s: 40.3 frames)
describe('a drawn shot in the frame (stepEnemy)', () => {
  const setUp = (hp = 100, o: Partial<EnemyData> = {}) => {
    resetDefenders(new Set());
    const g = registerDefender('g1', 8, 0, 0);
    Object.assign(g, { hp, maxHp: 100 });
    Object.assign(playerState, { x: 200, y: 0, z: 200 });
    const data = enemy({ ranged: true, raid: false, ...o }, { state: 'attack', attackCd: 0 });
    return { g, data, f: frameOf(data) };
  };
  const run = (f: EnemyFrame, n: number, each?: (i: number) => void) => {
    for (let i = 1; i <= n; i++) { stepEnemy(f, 1 / 30); each?.(i); }
  };
  it('lands on the clip\'s release: the guard struck on frame 42, his clip cued once and drawn from its first frame', () => {
    const { g, f } = setUp();
    expect(swingOf(f.data).hit * 30).toBeCloseTo(40.3, 1);
    let at = 0, cue = f.cue;
    run(f, 50, (i) => { if (!at && g.hp < 100) { at = i; cue = f.cue; } });
    expect([at, f.clip, cue]).toEqual([42, 'anim_g_crossbowshot', { n: 1, held: true }]);
  });
  it('a guard it fells cries out once, on the frame it lands', () => {
    const { g, f } = setUp(RANGED_DMG);
    run(f, 41);
    expect([g.state, H.barks]).toEqual(['ok', []]);
    run(f, 1);
    expect([g.state, H.barks]).toEqual(['downed', ['defenderDown']]);
    run(f, 120);
    expect(H.barks).toEqual(['defenderDown']);
  });
  it('never lands once its striker falls: he flies apart, the guard untouched and silent', () => {
    const { g, data, f } = setUp(RANGED_DMG);
    run(f, 20);
    expect(data.mob.draw?.mark).toBe('def:g1');
    Object.assign(data.mob, { state: 'dying', dieT: 0 });
    run(f, 60);
    expect([g.hp, g.state, H.barks]).toEqual([RANGED_DMG, 'ok', []]);
  });
  it('never lands once he runs (a thief struck with goods on him, his morale broken)', () => {
    const { g, data, f } = setUp(RANGED_DMG, { thief: true, carried: { wood: 2 }, maxHp: 8 });
    run(f, 20);
    expect(data.mob.draw?.mark).toBe('def:g1');
    data.hp = 6; // struck: he runs with what he has
    run(f, 60);
    expect([data.mob.fleeing, g.hp, H.barks]).toEqual([true, RANGED_DMG, ['raiderStruck']]);
  });
  it('never lands at a guard downed (by another) before it is loosed, nor at one who has stepped out of his reach', () => {
    const a = setUp(RANGED_DMG);
    run(a.f, 20);
    expect(a.data.mob.draw?.mark).toBe('def:g1');
    Object.assign(a.g, { state: 'downed', downedUntil: Date.now() + 60_000 });
    run(a.f, 40);
    expect([a.g.hp, H.barks]).toEqual([RANGED_DMG, []]);
    const b = setUp(RANGED_DMG);
    run(b.f, 20);
    b.g.x = 20; // 20 m off: past his 14 m
    run(b.f, 1);
    b.g.x = 8; // back, the next frame (22): the shot was let go, and is drawn again from its start, to land on 63
    run(b.f, 40);
    expect(b.g.hp).toBe(RANGED_DMG);
    run(b.f, 2);
    expect(b.g.state).toBe('downed');
  });
  it("a finisher landed mid-draw staggers him as it always did: the shot let go, and drawn again once the 1.8 s are out", () => {
    const { g, data, f } = setUp();
    run(f, 20);
    data.mob.attackCd = Math.max(data.mob.attackCd, FINISHER_STAGGER_S); // as combat/melee.ts's finisher does
    let at = 0;
    run(f, 120, (i) => { if (!at && g.hp < 100) at = 20 + i; });
    expect(at).toBe(20 + 54 + 41); // the stagger out on frame 74, the shot drawn on it and loosed 41 frames on, on 115
  });
  it("a caster's spell is loosed on its clip's release, not as he raises his hand", () => {
    resetDefenders(new Set());
    Object.assign(playerState, { x: 8, y: 0, z: 0 });
    const f = frameOf(enemy({ kind: 'caster', raid: false }, { state: 'attack', attackCd: 0 }));
    const at = 1 + Math.ceil(swingOf(f.data).hit * 30); // drawn on frame 1
    run(f, at - 1);
    expect(H.spells).toBe(0);
    run(f, 1);
    expect([H.spells, f.clip]).toEqual([1, 'anim_g_crossbowshot']);
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
