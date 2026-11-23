import { describe, expect, it } from 'vitest';
import {
  attackClip, avatarClip, enemyArms, heldSwing, instantSwing, loadoutArms, playerArms, runClip, stanceClip, swingSeconds,
  walkClip, CLIP_TIMING, SWING_TS_MAX, SWING_TS_MIN, type Arms,
} from './fightClips';
import { ATTACK_CD, type EnemyKind } from '../data/enemies';
import { DEFENDER_LOADOUTS } from '../data/villagers';
import { MELEE } from '../data/melee';
import { CLIP_FPS } from '@/lib/rig/clips';
import MANIFEST from '@/game/data/assetManifest.json';

// G-10 · golden tests, written on the base before the clip table: which clip each of the four sites picks, by what the
// figure holds — an enemy's kind (a bandit's ranged roll both ways), a defender's loadout (Tam's without the crossbow),
// the player's readied weapon with and without a shield. Changed on purpose by the table: every attack is the weapon's,
// a shield or a bow carried walks and runs so; bare hands and two-handed weapons walk as before, and the gather's swing
// is the work swing still.
const KINDS: EnemyKind[] = ['skeleton', 'bandit', 'gilbert', 'cedric', 'storm', 'royal', 'mountedRaider', 'caster', 'shieldedElite', 'siegeCrew'];
const clips = (a: Arms) => `${attackClip(a)} | ${walkClip(a)} | ${runClip(a)}`;

describe('the clip each figure plays (attack | walk | run)', () => {
  it('an enemy, by his kind', () => {
    expect(Object.fromEntries([
      ...KINDS.map((k) => [k, clips(enemyArms({ kind: k }))]),
      ['bandit (ranged)', clips(enemyArms({ kind: 'bandit', ranged: true }))],
    ])).toMatchInlineSnapshot(`
      {
        "bandit": "anim_g_halberdswipewithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "bandit (ranged)": "anim_g_crossbowshot | anim_g_walkwithbow | anim_g_runwithbow",
        "caster": "anim_g_crossbowshot | anim_c_walk | anim_c_run",
        "cedric": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "gilbert": "anim_g_halberdswipe | anim_c_walk | anim_c_run",
        "mountedRaider": "anim_g_spearstrikewithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "royal": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "shieldedElite": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "siegeCrew": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "skeleton": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "storm": "anim_g_swordswish | anim_c_walk | anim_c_run",
      }
    `);
  });

  it('a defender, by his loadout — and Tam, who has no crossbow drawn', () => {
    expect(Object.fromEntries([
      ...(['sword_shield', 'halberd', 'bow', undefined] as const).map((l) => [`defender ${l}`, clips(loadoutArms(l))]),
      ...(['sword_shield', 'halberd', 'bow'] as const).map((l) => [`Tam ${l}`, clips(loadoutArms(l, false))]),
    ])).toMatchInlineSnapshot(`
      {
        "Tam bow": "anim_g_swordswish | anim_c_walk | anim_c_run",
        "Tam halberd": "anim_g_halberdswipe | anim_c_walk | anim_c_run",
        "Tam sword_shield": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "defender bow": "anim_g_crossbowshot | anim_g_walkwithbow | anim_g_runwithbow",
        "defender halberd": "anim_g_halberdswipe | anim_c_walk | anim_c_run",
        "defender sword_shield": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "defender undefined": "anim_g_swordswish | anim_c_walk | anim_c_run",
      }
    `);
  });

  it('the player, by his readied weapon, with and without a shield', () => {
    const rows: [string, string][] = [];
    for (const shield of [false, true]) {
      for (const melee of ['sword', 'halberd', 'spear'] as const) rows.push([`${melee}${shield ? '+shield' : ''}`, clips(playerArms({ ranged: null, melee, shield }))]);
      for (const ranged of ['crossbow', 'longbow'] as const) rows.push([`${ranged}${shield ? '+shield' : ''}`, clips(playerArms({ ranged, melee: 'sword', shield }))]);
    }
    expect(Object.fromEntries(rows)).toMatchInlineSnapshot(`
      {
        "crossbow": "anim_g_crossbowshot | anim_g_walkwithbow | anim_g_runwithbow",
        "crossbow+shield": "anim_g_crossbowshotwithshield | anim_g_walkwithshieldandbow | anim_g_runwithshieldandbow",
        "halberd": "anim_g_halberdswipe | anim_c_walk | anim_c_run",
        "halberd+shield": "anim_g_halberdswipewithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "longbow": "anim_g_longbowshot | anim_g_walkwithbow | anim_g_runwithbow",
        "longbow+shield": "anim_g_longbowshot | anim_g_walkwithshieldandbow | anim_g_runwithshieldandbow",
        "spear": "anim_g_spearstrike | anim_c_walk | anim_c_run",
        "spear+shield": "anim_g_spearstrikewithshield | anim_g_walkwithshield | anim_g_runwithshield",
        "sword": "anim_g_swordswish | anim_c_walk | anim_c_run",
        "sword+shield": "anim_g_swordswishwithshield | anim_g_walkwithshield | anim_g_runwithshield",
      }
    `);
  });
});

describe("the sites' own choices", () => {
  it("an enemy's clip by his stance", () => {
    const a = enemyArms({ kind: 'royal' });
    expect(['attack', 'chase', 'wander', 'climbing'].map((s) => stanceClip(s, a))).toMatchInlineSnapshot(`
      [
        "anim_g_swordswishwithshield",
        "anim_g_runwithshield",
        "anim_g_walkwithshield",
        "anim_g_walkwithshield",
      ]
    `);
    // in the attack stance before a swing is begun in it, he squares up at rest
    expect(stanceClip('attack', a, false)).toBe('anim_r_restpose');
  });

  it("the player's third-person clip", () => {
    const arms = playerArms({ ranged: null, melee: 'spear', shield: true });
    const at = (o: Partial<Parameters<typeof avatarClip>[0]>) => avatarClip({ acting: false, attacking: false, drawing: false, speed: 0, arms, ...o });
    expect({
      gathering: at({ acting: true }),
      attacking: at({ attacking: true }),
      drawing: at({ drawing: true, arms: playerArms({ ranged: 'longbow', melee: 'sword', shield: false }) }),
      running: at({ speed: 6 }),
      walking: at({ speed: 2 }),
      standing: at({}),
    }).toMatchInlineSnapshot(`
      {
        "attacking": "anim_g_spearstrikewithshield",
        "drawing": "anim_g_longbowshot",
        "gathering": "anim_g_swordswish",
        "running": "anim_g_runwithshield",
        "standing": "anim_r_restpose",
        "walking": "anim_g_walkwithshield",
      }
    `);
  });
});

// Every figure that fights — each enemy kind (a bandit both ways), each defender loadout and none, Tam's, the player's
// every weapon with and without a shield — as arms.
const ALL_ARMS: [string, Arms][] = [
  ...KINDS.map((k): [string, Arms] => [k, enemyArms({ kind: k })]),
  ['bandit (ranged)', enemyArms({ kind: 'bandit', ranged: true })],
  ...[...DEFENDER_LOADOUTS.map((l) => l.id), undefined].map((l): [string, Arms] => [`defender ${l}`, loadoutArms(l)]),
  ...DEFENDER_LOADOUTS.map((l): [string, Arms] => [`Tam ${l.id}`, loadoutArms(l.id, false)]),
  ...[false, true].flatMap((shield) => [
    ...(['sword', 'halberd', 'spear'] as const).map((melee): [string, Arms] => [`${melee} ${shield}`, playerArms({ ranged: null, melee, shield })]),
    ...(['crossbow', 'longbow'] as const).map((ranged): [string, Arms] => [`${ranged} ${shield}`, playerArms({ ranged, melee: 'sword', shield })]),
  ]),
];

describe('the clip table', () => {
  it("every figure's attack, walk and run is a clip in the manifest (never a file on disk: CI has none), and every attack has its timing", () => {
    const anims = new Set(MANIFEST.anims);
    for (const [who, a] of ALL_ARMS) {
      for (const clip of [attackClip(a), walkClip(a), runClip(a)]) expect(anims.has(clip), `${who}: ${clip}`).toBe(true);
      expect(CLIP_TIMING[attackClip(a)], who).toBeDefined();
    }
    for (const clip of Object.keys(CLIP_TIMING)) expect(anims.has(clip), clip).toBe(true);
  });

  it("each clip's hit comes inside its motion", () => {
    for (const [clip, t] of Object.entries(CLIP_TIMING)) expect(0 < t.hit && t.hit < t.end, clip).toBe(true);
  });
});

// the cooldowns each attack clip is played against: an enemy's by his kind (a crossbow's 1.8 s, a caster's 2.6 s held),
// a defender's (a blade 1.1 s, a bow 1.6 s — at a dragon, 2.6 s apart, his bow's own swing), Tam's half of 1.2 s, the
// player's weapon's (a bolt 1.1 s, an arrow 1.3 s)
const SITES: { who: string; clip: string; cd: number; held: boolean }[] = [
  ...KINDS.map((k) => ({ who: k, clip: attackClip(enemyArms({ kind: k })), cd: k === 'caster' ? 2.6 : ATTACK_CD[k], held: k === 'caster' })),
  { who: 'bandit (ranged)', clip: attackClip(enemyArms({ kind: 'bandit', ranged: true })), cd: 1.8, held: true },
  ...(['sword_shield', 'halberd', undefined] as const).map((l) => ({ who: `defender ${l}`, clip: attackClip(loadoutArms(l)), cd: 1.1, held: false })),
  { who: 'defender bow', clip: attackClip(loadoutArms('bow')), cd: 1.6, held: true },
  ...DEFENDER_LOADOUTS.map((l) => ({ who: `Tam ${l.id}`, clip: attackClip(loadoutArms(l.id, false)), cd: 0.6, held: false })),
  ...(['sword', 'halberd', 'spear'] as const).flatMap((melee) => [false, true].map((shield) => ({
    who: `player ${melee} ${shield}`, clip: attackClip(playerArms({ ranged: null, melee, shield })), cd: MELEE[melee].cd, held: false,
  }))),
  ...([['crossbow', 1.1], ['longbow', 1.3]] as const).flatMap(([ranged, cd]) => [false, true].map((shield) => ({
    who: `player ${ranged} ${shield}`, clip: attackClip(playerArms({ ranged, melee: 'sword', shield })), cd, held: false,
  }))),
];

describe('the swing timing', () => {
  it("a held swing plays from the first frame and holds its blow to the clip's hit: hit frames / 15 / timeScale", () => {
    const s = heldSwing('anim_g_crossbowshot', 1.8);
    expect(s.from).toBe(0);
    expect(s.timeScale).toBeCloseTo(55 / CLIP_FPS / 1.8, 9);
    expect(s.hit).toBeCloseTo(41 / CLIP_FPS / s.timeScale, 9);
    expect(s.hit).toBeCloseTo(1.342, 3); // a crossbow bandit's shot lands 1.34 s after he raises it
  });

  it("an instant swing plays from its hit: the player's bolt and arrow are loosed on the clip's release frame", () => {
    for (const clip of ['anim_g_crossbowshot', 'anim_g_crossbowshotwithshield', 'anim_g_longbowshot']) {
      const s = instantSwing(clip, 1.1);
      expect([s.from, s.hit], clip).toEqual([CLIP_TIMING[clip].hit, 0]);
    }
    expect(swingSeconds(instantSwing('anim_g_spearstrike', 0.7))).toBeCloseTo(0.7, 9); // the thrust's rest, in its cooldown
  });

  it("a cooldown too short for its clip is played at the ceiling, never faster; one too long at the clip's own pace", () => {
    expect([heldSwing('anim_g_longbowshot', 0.5).timeScale, instantSwing('anim_g_swordswish', 0.1).timeScale]).toEqual([SWING_TS_MAX, SWING_TS_MAX]);
    expect(heldSwing('anim_g_crossbowshot', 10).timeScale).toBe(SWING_TS_MIN);
  });

  it('the timeScale clamp holds for every clip at every site; unclamped, the motion fits the cooldown — and a held blow lands inside it', () => {
    const rows: string[] = [];
    for (const { who, clip, cd, held } of SITES) {
      const s = held ? heldSwing(clip, cd) : instantSwing(clip, cd);
      expect(s.timeScale, who).toBeGreaterThanOrEqual(SWING_TS_MIN);
      expect(s.timeScale, who).toBeLessThanOrEqual(SWING_TS_MAX);
      if (s.timeScale > SWING_TS_MIN && s.timeScale < SWING_TS_MAX) expect(swingSeconds(s), who).toBeCloseTo(cd, 9);
      if (s.timeScale === SWING_TS_MIN) expect(swingSeconds(s), who).toBeLessThanOrEqual(cd);
      if (held) expect(s.hit, who).toBeLessThan(cd);
      rows.push(`${who}: ${clip} x${s.timeScale.toFixed(2)} from ${s.from}, moves ${swingSeconds(s).toFixed(2)} s of ${cd}${held ? `, lands ${s.hit.toFixed(2)} s in` : ''}`);
    }
    // the numbers, said once
    expect(rows).toMatchInlineSnapshot(`
      [
        "skeleton: anim_g_swordswishwithshield x1.00 from 28, moves 1.07 s of 1.6",
        "bandit: anim_g_halberdswipewithshield x1.00 from 29, moves 1.27 s of 1.6",
        "gilbert: anim_g_halberdswipe x1.00 from 29, moves 1.27 s of 1.5",
        "cedric: anim_g_swordswishwithshield x1.00 from 28, moves 1.07 s of 1.3",
        "storm: anim_g_swordswish x1.00 from 28, moves 1.07 s of 1.1",
        "royal: anim_g_swordswishwithshield x1.00 from 28, moves 1.07 s of 1.4",
        "mountedRaider: anim_g_spearstrikewithshield x1.08 from 29, moves 1.30 s of 1.3",
        "caster: anim_g_crossbowshot x1.41 from 0, moves 2.60 s of 2.6, lands 1.94 s in",
        "shieldedElite: anim_g_swordswishwithshield x1.00 from 28, moves 1.07 s of 1.5",
        "siegeCrew: anim_g_swordswishwithshield x1.00 from 28, moves 1.07 s of 1.6",
        "bandit (ranged): anim_g_crossbowshot x2.04 from 0, moves 1.80 s of 1.8, lands 1.34 s in",
        "defender sword_shield: anim_g_swordswishwithshield x1.00 from 28, moves 1.07 s of 1.1",
        "defender halberd: anim_g_halberdswipe x1.15 from 29, moves 1.10 s of 1.1",
        "defender undefined: anim_g_swordswish x1.00 from 28, moves 1.07 s of 1.1",
        "defender bow: anim_g_crossbowshot x2.29 from 0, moves 1.60 s of 1.6, lands 1.19 s in",
        "Tam sword_shield: anim_g_swordswishwithshield x1.78 from 28, moves 0.60 s of 0.6",
        "Tam halberd: anim_g_halberdswipe x2.11 from 29, moves 0.60 s of 0.6",
        "Tam bow: anim_g_swordswish x1.78 from 28, moves 0.60 s of 0.6",
        "player sword false: anim_g_swordswish x1.94 from 28, moves 0.55 s of 0.55",
        "player sword true: anim_g_swordswishwithshield x1.94 from 28, moves 0.55 s of 0.55",
        "player halberd false: anim_g_halberdswipe x1.33 from 29, moves 0.95 s of 0.95",
        "player halberd true: anim_g_halberdswipewithshield x1.33 from 29, moves 0.95 s of 0.95",
        "player spear false: anim_g_spearstrike x2.00 from 29, moves 0.70 s of 0.7",
        "player spear true: anim_g_spearstrikewithshield x2.00 from 29, moves 0.70 s of 0.7",
        "player crossbow false: anim_g_crossbowshot x1.00 from 41, moves 0.93 s of 1.1",
        "player crossbow true: anim_g_crossbowshotwithshield x1.00 from 41, moves 0.93 s of 1.1",
        "player longbow false: anim_g_longbowshot x1.00 from 41, moves 0.93 s of 1.3",
        "player longbow true: anim_g_longbowshot x1.00 from 41, moves 0.93 s of 1.3",
      ]
    `);
  });
});
