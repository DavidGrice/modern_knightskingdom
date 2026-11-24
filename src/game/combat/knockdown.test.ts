import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { CLIP_FPS } from '@/lib/rig/clips';
import MANIFEST from '@/game/data/assetManifest.json';
import { combatState, playerAttack, useEnemyStore, type EnemyData, type EnemyKind } from '../combat';
import { FINISHER_STAGGER_S } from '../data/melee';
import { arenaState } from '../arena';
import { homeRaiders, raidField } from '../directors/raidSettle';
import { raidDirector } from '../directors/raidDirector';
import { raidActive, raidCooldown, raidLost } from '../directors/state';
import { playerState } from '../playerState';
import { detonate, explodeBall, ramCheck } from '../siege';
import { useGameStore } from '../store/gameStore';
import type { CharacterConfig, PlacedBuilding } from '../types';
import {
  isKnocked, knockClip, knockClips, knockDown, knockLift, knockPlay, stillDown, BLAST_ARC, BLAST_THROW, KNOCK_FALL_S,
  KNOCK_GUARD_S, KNOCK_HOLD_S, KNOCK_S,
} from './knockdown';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const enemies = () => useEnemyStore.getState().enemies;
let clock = 0;

function spawn(kind: EnemyKind, x: number, z: number): EnemyData {
  useEnemyStore.getState().spawn(kind, x, z);
  const e = enemies()[enemies().length - 1];
  e.mob.yaw = 0; // facing -z
  return e;
}
const at = (e: EnemyData) => [+e.mob.x.toFixed(3), +e.mob.z.toFixed(3)];
/** a ram's head run on to (x, z): a check a few centimetres short of it (toward the player at the origin), then there a
 *  frame (16 ms) on — a ram knocks a man flat only moving (3 m/s here) */
function runRam(id: string, x: number, z: number) {
  const d = Math.hypot(x, z) || 1;
  ramCheck(id, x * (1 - 0.05 / d), z * (1 - 0.05 / d));
  clock += 16;
  ramCheck(id, x, z);
}

beforeEach(() => {
  clock += 100_000; // on from the last test's: the ram's cooldowns are the module's own
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: () => {} } as never);
  useEnemyStore.getState().clear();
  Object.assign(combatState, { comboCount: 0, comboWindowUntil: 0, weapon: 'melee', meleeWeapon: 'sword', iframeUntil: 0 });
  Object.assign(playerState, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }); // yaw 0 faces -z
});
afterEach(() => { vi.restoreAllMocks(); });

// G-11 · golden, written and run on the base before the knockdowns: what a finisher, a blast and a ram did to an enemy.
// Changed on purpose: the finisher's blow leaves his cooldown at 2.4 s (the base: its 1.8 s stagger) — he is knocked
// down, KNOCK_S 2 s and KNOCK_HOLD_S 0.4 s, the stagger running on inside it; a blast's damage and whom it passes by
// are as they were, and one it leaves standing is knocked down (cooldown 2.4 s; the base 0); the player's ram run into
// an enemy knocks him down and shoves him 1.2 m on (the base: passed him by). The raiders' ram passes him by as ever.
describe('golden: what a hit did to an enemy', () => {
  it("a sword's chain: each blow's knockback, and the stagger the finisher leaves", () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    const e = spawn('cedric', 0, -1.4);
    const seen: [number, number, string][] = [];
    for (let i = 0; i < 3; i++) {
      combatState.stamina = combatState.maxStamina;
      e.mob.x = 0; e.mob.z = -1.4;
      playerAttack();
      seen.push([+(-1.4 - e.mob.z).toFixed(3), e.mob.attackCd, e.mob.knock?.how ?? '']);
      clock += 300;
    }
    expect(seen).toEqual([[0.9, 0, ''], [0.9, 0, ''], [1.8, 2.4, 'forward']]); // the base: [1.8, 1.8], not down (struck from behind: on his face)
  });

  it("a cannonball's and a charge's damage, and whom they pass by", () => {
    const near = spawn('cedric', 3, 0), edge = spawn('cedric', 4.6, 0), storm = spawn('storm', 1, 0);
    const dying = spawn('cedric', 1, 0);
    dying.mob.state = 'dying';
    const full = near.hp;
    explodeBall({ id: 1, pos: { x: 0, y: 0.2, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true });
    expect([near.hp, edge.hp, storm.hp, dying.hp]).toEqual([full - 6, full, 1, full]);
    expect([at(near), at(edge), near.mob.state, near.mob.attackCd, near.mob.knock?.how, edge.mob.knock])
      .toEqual([[3, 0], [4.6, 0], 'wander', 2.4, 'flyingbackward', undefined]); // the base: cooldown 0, not down (side on: as from the front)
    const far = spawn('cedric', 6.6, 0);
    const charge = { id: 'c1', type: 'gate', x: 0, z: 0, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [charge] } as never);
    Object.assign(playerState, { x: 60, z: 60 });
    detonate(charge);
    expect([near.hp, edge.hp, far.hp, storm.hp]).toEqual([full - 20, full - 14, full, 1]);
    expect([at(near), at(edge), near.mob.state]).toEqual([[3, 0], [4.6, 0], 'wander']);
  });

  it("the raiders' ram passes an enemy by; the player's knocks him down and shoves him on", () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram] } as never);
    const e = spawn('cedric', 0, -2.8);
    const full = e.hp;
    runRam('raider_ram', 0, -1.8);
    expect([e.hp, at(e), e.mob.state, e.mob.attackCd, e.mob.knock]).toEqual([full, [0, -2.8], 'wander', 0, undefined]);
    clock += 1000;
    runRam('ram1', 0, -1.8);
    // the base: [full, [0, -2.8], 'wander', 0], not down
    expect([e.hp, at(e), e.mob.state, e.mob.attackCd, e.mob.knock?.how]).toEqual([full, [0, -4], 'wander', 2.4, 'forward']);
  });
});

const DT = 1 / 64;
/** his knockdown run on, frame by frame, for `seconds`: the frames he is down, and the clip each */
function runDown(e: EnemyData, seconds: number, shield = false) {
  const clips: string[] = [];
  let down = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (stillDown(e.mob, DT)) { down++; clips.push(knockClip(e.mob.knock!, { weapon: 'halberd', shield })); }
  }
  return { down, clips };
}
/** an enemy at (x, z) facing (0, 0) */
function facing(x: number, z: number, kind: EnemyKind = 'bandit'): EnemyData {
  const e = spawn(kind, x, z);
  e.mob.yaw = Math.atan2(x, z); // his facing (-sin, -cos) points at the origin
  return e;
}

describe('each hit knocks him down', () => {
  it('a finisher: the third landed blow of a chain, and only it', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    const e = facing(0, -1.4, 'cedric');
    const seen: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      combatState.stamina = combatState.maxStamina;
      e.mob.x = 0; e.mob.z = -1.4;
      playerAttack();
      seen.push(isKnocked(e));
      clock += 300;
    }
    expect([seen, e.mob.knock?.how, e.mob.knocks]).toEqual([[false, false, true], 'backward', 1]);
  });
  it('a cannonball and a charge, each throwing him through the air away from it', () => {
    const a = facing(2, 0, 'cedric'), b = facing(-3, 0, 'cedric');
    b.mob.yaw += Math.PI; // his back to the blast
    explodeBall({ id: 1, pos: { x: 0, y: 0.2, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: false });
    expect([a.mob.knock?.how, b.mob.knock?.how]).toEqual(['flyingbackward', 'flyingforward']);
    const c = facing(5, 0, 'cedric');
    const charge = { id: 'c1', type: 'gate', x: 0, z: 0, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [charge] } as never);
    Object.assign(playerState, { x: 60, z: 60 });
    detonate(charge);
    expect(c.mob.knock?.how).toBe('flyingbackward');
    // thrown away from the blast, BLAST_THROW through his flight, on an arc BLAST_ARC high at its top
    const lifts: number[] = [];
    for (let i = 0; i < Math.round(KNOCK_FALL_S / DT); i++) { stillDown(c.mob, DT); lifts.push(knockLift(c.mob.knock!)); }
    expect(c.mob.x).toBeCloseTo(5 + BLAST_THROW, 9);
    expect(c.mob.z).toBeCloseTo(0, 9);
    expect(Math.max(...lifts)).toBeCloseTo(BLAST_ARC, 2);
    const landed = c.mob.x;
    stillDown(c.mob, DT);
    expect([knockLift(c.mob.knock!), c.mob.x]).toEqual([0, landed]); // landed: no lift, and no more throw
  });
  it("a siege engineer takes a blast's damage at his engine, neither thrown nor lifted (it is drawn in his group)", () => {
    const e = facing(2, 0, 'siegeCrew');
    const hp = e.hp;
    explodeBall({ id: 1, pos: { x: 0, y: 0.2, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true });
    expect([e.hp, isKnocked(e), at(e)]).toEqual([hp - 6, false, [2, 0]]);
  });
  it("the player's ram, on the enemy its head runs into — not one past its reach, nor one up on a wall-walk", () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram] } as never);
    const hit = facing(0.5, -3), far = facing(0, -3.4), up = facing(0, -2.2);
    up.mob.elevated = true;
    runRam('ram1', 0, -1.8);
    expect([isKnocked(hit), isKnocked(far), isKnocked(up), hit.mob.knock?.how, hit.hp]).toEqual([true, false, false, 'backward', hit.maxHp]);
    expect(Math.hypot(hit.mob.x, hit.mob.z)).toBeCloseTo(Math.hypot(0.5, 3) + 1.2, 9); // shoved 1.2 m on, from the player
    // its cooldown is its own: a second man run into within 0.9 s is not knocked down, one after it is
    const next = facing(0, -2.5);
    clock += 500;
    runRam('ram1', 0, -1.8);
    expect(isKnocked(next)).toBe(false);
    clock += 400;
    runRam('ram1', 0, -1.8);
    expect(isKnocked(next)).toBe(true);
  });
  it('a ram parked in his path knocks nobody down: only run (or swung) into him', () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram] } as never);
    const e = facing(0, -3);
    // the player stands, holding it — its head creeping his way a millimetre a frame (0.06 m/s: a nudge, not a run)
    for (let i = 0; i < 6; i++) { ramCheck('ram1', 0, -1.8 - i * 0.001); clock += 16; }
    expect(isKnocked(e)).toBe(false);
    ramCheck('ram1', 0, -1.85); // and pushes on
    expect(isKnocked(e)).toBe(true);
  });
  it('taken up again elsewhere, it knocks nobody on the grab: its last head, long since, is none', () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram] } as never);
    ramCheck('ram1', 10, 10); // set down there
    clock += 60_000;
    const e = facing(0, -3);
    ramCheck('ram1', 0, -1.8); // taken up here, the player standing
    expect(isKnocked(e)).toBe(false);
  });
  it('a slow push runs into him too: its speed counts, not its step per frame (at 144 fps)', () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram] } as never);
    const e = facing(0, -3.2);
    let z = -1.5;
    for (let i = 0; i < 200 && !isKnocked(e); i++) { ramCheck('ram1', 0, z); clock += 7; z -= 0.0024; } // 0.34 m/s
    expect(isKnocked(e)).toBe(true);
  });
  it('backed away from him, it knocks him nobody: only run or swung his way', () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram] } as never);
    const e = facing(0, -3);
    ramCheck('ram1', 0, -1.85);
    clock += 16;
    ramCheck('ram1', 0, -1.8); // the head comes back toward the player, away from him
    expect(isKnocked(e)).toBe(false);
  });
  it("its cooldown is its own: a ram that has just struck a wall still knocks down a man it runs into", () => {
    const ram = { id: 'ram1', type: 'oc4806', x: 0, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    const wall = { id: 'w1', type: 'palisade', x: 3, z: -1.8, rot: 0, built: 1 } as PlacedBuilding;
    useGameStore.setState({ buildings: [ram, wall] } as never);
    const e = facing(0, -3.5);
    runRam('ram1', 2, -1.8); // the wall struck (its 0.9 s cooldown begun), the man out of reach
    expect([vi.mocked(audio.play).mock.calls.some((c) => c[0] === 'ram'), isKnocked(e)]).toEqual([true, false]);
    clock += 300;
    runRam('ram1', 0, -2.6); // run into him 0.3 s on
    expect(isKnocked(e)).toBe(true);
  });
  it("the raiders' ram knocks down none of its own raiders", () => {
    useEnemyStore.getState().spawn('bandit', 0, -2.5, true, undefined, false, false, 1, false, null);
    const raider = enemies()[0];
    for (let i = 0; i < 5; i++) { runRam('raider_ram', 0, -1.8); clock += 1000; }
    expect([isKnocked(raider), at(raider)]).toEqual([false, [0, -2.5]]);
  });
  it('none: Storm, the dead or dying, a man on a ladder, in the saddle or at a siege engine, one already down', () => {
    const none = [
      facing(1, 0, 'storm'), facing(1, 0), facing(1, 0), facing(1, 0), facing(1, 0, 'mountedRaider'), facing(1, 0, 'siegeCrew'),
    ];
    none[1].hp = 0;
    none[2].mob.state = 'dying';
    none[3].mob.state = 'climbing';
    expect(none.map((e) => knockDown(e, 0, 0))).toEqual([false, false, false, false, false, false]);
    const e = facing(1, 0);
    expect([knockDown(e, 0, 0), knockDown(e, 0, 0, true), e.mob.knock?.how, e.mob.knocks]).toEqual([true, false, 'backward', 1]);
    // a state beside his stance, never a value of it
    expect(e.mob.state).toBe('wander');
  });
  it('a hit square to his side, or a hair past it, counts as from the front: the same fall either way', () => {
    const a = facing(0, 1), b = facing(0, 1); // at (0, 1), facing -z: a hit from (1, 1) comes square to his side
    a.mob.yaw = 0.01; // a sliver behind square
    b.mob.yaw = -0.01; // a sliver in front of it
    expect([knockDown(a, 1, 1), knockDown(b, 1, 1), a.mob.knock?.how, b.mob.knock?.how]).toEqual([true, true, 'backward', 'backward']);
    const c = facing(0, 1);
    c.mob.yaw = 0; // facing -z, the hit from behind him (0, 3)
    knockDown(c, 0, 3);
    expect(c.mob.knock?.how).toBe('forward');
  });
  it('a blast on a man up on a wall-walk knocks him flat where he stands: no throw, no flight, no lift', () => {
    const e = facing(2, 0);
    e.mob.elevated = true;
    knockDown(e, 0, 0, true);
    expect([e.mob.knock?.how, e.mob.knock?.vx, e.mob.knock?.vz]).toEqual(['backward', 0, 0]);
    const lifts: number[] = [];
    for (let i = 0; i < 40; i++) { stillDown(e.mob, DT); if (e.mob.knock) lifts.push(knockLift(e.mob.knock)); }
    expect([Math.max(...lifts), at(e)]).toEqual([0, [2, 0]]);
  });
});

describe('down and up again', () => {
  it('down KNOCK_S: the fall for KNOCK_FALL_S, then the stand; up into his stance at rest, his next blow KNOCK_HOLD_S on', () => {
    const e = facing(0, -2);
    e.mob.state = 'attack';
    e.mob.swings = 4;
    e.mob.draw = { mark: 'player', t: 0.3, held: true };
    knockDown(e, 0, 0);
    expect([e.mob.draw, e.mob.stanceSwings, e.mob.attackCd]).toEqual([undefined, 4, KNOCK_S + KNOCK_HOLD_S]);
    expect([KNOCK_S, KNOCK_FALL_S, KNOCK_HOLD_S]).toEqual([2, 0.7, 0.4]);
    const { down, clips } = runDown(e, 3, true);
    expect(down).toBe(KNOCK_S / DT - 1); // up on the frame that brings him to KNOCK_S
    expect([...new Set(clips)]).toEqual(['anim_g_fallbackwardwithshield', 'anim_g_standfromfallbackwardwithshield']);
    expect(clips.indexOf('anim_g_standfromfallbackwardwithshield')).toBe(Math.ceil(KNOCK_FALL_S / DT) - 1);
    // up: still in the attack stance, at rest till a swing is begun in it; the cooldown run down as he lay, to the hold
    expect([e.mob.knock, e.mob.state]).toEqual([undefined, 'attack']);
    expect(e.mob.attackCd).toBeCloseTo(KNOCK_HOLD_S, 9);
  });
  it("his cooldown runs on beneath it: a finisher's stagger landed as he lies outlasts his getting up", () => {
    const e = facing(0, -2);
    knockDown(e, 0, 0);
    runDown(e, 1.5);
    e.mob.attackCd = Math.max(e.mob.attackCd, FINISHER_STAGGER_S); // a second finisher, 1.5 s down
    expect(knockDown(e, 0, 0)).toBe(false);
    runDown(e, 1);
    expect(e.mob.knock).toBeUndefined();
    expect(e.mob.attackCd).toBeCloseTo(FINISHER_STAGGER_S - 0.5, 9); // 1.3 s of it left as he gets up, 0.5 s on
  });
  it('guarded KNOCK_GUARD_S once up: no second knockdown till then — a finisher then staggers him alone', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    const e = facing(0, -1.4, 'cedric');
    knockDown(e, 0, 0);
    runDown(e, KNOCK_S);
    expect([isKnocked(e), e.mob.knockGuardT]).toEqual([false, KNOCK_GUARD_S]);
    runDown(e, KNOCK_GUARD_S - 0.5);
    for (let i = 0; i < 3; i++) {
      combatState.stamina = combatState.maxStamina;
      e.mob.x = 0; e.mob.z = -1.4;
      playerAttack();
      clock += 300;
    }
    expect([isKnocked(e), e.mob.attackCd]).toEqual([false, FINISHER_STAGGER_S]);
    runDown(e, 0.5);
    expect([e.mob.knockGuardT, knockDown(e, 0, 0)]).toEqual([0, true]);
  });
});

describe('the clips', () => {
  it('by the way he went down and whether he bears a shield — the flights have none', () => {
    const table: Record<string, [string, string]> = {};
    for (const how of ['backward', 'forward', 'flyingbackward', 'flyingforward'] as const) {
      for (const shield of [false, true]) {
        const k = { how, t: 0, vx: 0, vz: 0 };
        table[`${how}${shield ? ' +shield' : ''}`] = [knockClip(k, { weapon: 'sword', shield }), knockClip({ ...k, t: KNOCK_FALL_S }, { weapon: 'sword', shield })];
      }
    }
    expect(table).toMatchInlineSnapshot(`
      {
        "backward": [
          "anim_g_fallbackward",
          "anim_g_standfromfallbackward",
        ],
        "backward +shield": [
          "anim_g_fallbackwardwithshield",
          "anim_g_standfromfallbackwardwithshield",
        ],
        "flyingbackward": [
          "anim_g_flyingbackward",
          "anim_g_standfromfallbackward",
        ],
        "flyingbackward +shield": [
          "anim_g_flyingbackward",
          "anim_g_standfromfallbackwardwithshield",
        ],
        "flyingforward": [
          "anim_g_flyingforward",
          "anim_g_standfromfallforward",
        ],
        "flyingforward +shield": [
          "anim_g_flyingforward",
          "anim_g_standfromfallforwardwithshield",
        ],
        "forward": [
          "anim_g_fallforward",
          "anim_g_standfromfallforward",
        ],
        "forward +shield": [
          "anim_g_fallforwardwithshield",
          "anim_g_standfromfallforwardwithshield",
        ],
      }
    `);
  });
  it('every one is in the manifest, each played once from its motion, fitted to its part of KNOCK_S', () => {
    const all = [...new Set([...knockClips(false), ...knockClips(true)])];
    expect(all).toHaveLength(10);
    for (const c of all) expect(MANIFEST.anims, c).toContain(c);
    const fall = KNOCK_FALL_S, stand = KNOCK_S - KNOCK_FALL_S;
    expect(knockPlay('anim_g_fallbackward')).toEqual({ from: 0, timeScale: 45 / CLIP_FPS / fall });
    expect(knockPlay('anim_g_fallforwardwithshield')).toEqual({ from: 0, timeScale: 36 / CLIP_FPS / fall });
    expect(knockPlay('anim_g_flyingforward')).toEqual({ from: 0, timeScale: 20 / CLIP_FPS / fall });
    expect(knockPlay('anim_g_standfromfallbackwardwithshield')).toEqual({ from: 60, timeScale: 33 / CLIP_FPS / stand });
    expect(knockPlay('anim_g_standfromfallforward')).toEqual({ from: 0, timeScale: 78 / CLIP_FPS / stand });
    expect([knockPlay('anim_g_halberdswipe'), knockPlay('anim_r_restpose')]).toEqual([undefined, undefined]);
  });
});

// The knocked state is beside mob.state, not a value of it: every reader of that takes him for alive and in the fight.
describe('a man down is not a man defeated', () => {
  it('the raid does not end while its raiders are only down, and its settling counts each at his health', () => {
    for (const x of [1, 2]) useEnemyStore.getState().spawn('bandit', x, 0, true, undefined, false, false, 1, false, null);
    for (const e of enemies()) knockDown(e, 0, 0, true);
    raidActive.current = true;
    raidDirector(game(), enemies(), useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
    expect([raidActive.current, homeRaiders().length, enemies().every(isKnocked)]).toEqual([true, 2, true]);
    expect(raidField(game(), homeRaiders()).raiders.map((r) => r.fighter.hp)).toEqual(enemies().map((e) => e.hp));
    useEnemyStore.getState().clear();
    raidDirector(game(), enemies(), useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
    expect(raidActive.current).toBe(false);
  });
  it('the arena counts no kill for a man knocked down, and one killed as he lies once', () => {
    useGameStore.setState({ inventory: { ...game().inventory, sword: 1 } } as never);
    arenaState.kills = 0;
    useEnemyStore.getState().spawn('skeleton', 0, -1.4, false, undefined, false, false, 1, true);
    const e = enemies()[0];
    e.hp = e.maxHp = 100;
    for (let i = 0; i < 3; i++) { combatState.stamina = combatState.maxStamina; Object.assign(e.mob, { x: 0, z: -1.4 }); playerAttack(); clock += 300; }
    expect([isKnocked(e), e.mob.state, arenaState.kills]).toEqual([true, 'wander', 0]);
    e.hp = 1;
    for (let i = 0; i < 2; i++) { combatState.stamina = combatState.maxStamina; Object.assign(e.mob, { x: 0, z: -1.4 }); playerAttack(); clock += 300; }
    expect([e.mob.state, arenaState.kills]).toEqual(['dying', 1]);
  });
});
