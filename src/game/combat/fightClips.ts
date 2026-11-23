// G-10 · what an armed figure plays: the clip table, keyed by what the figure holds (its arms — an enemy's kind, a
// defender's or Tam's loadout, the player's readied weapon), for its attack and its walk and run; and when in its attack
// clip the blow comes (CLIP_TIMING), the timeScale that fits the clip to its cooldown, and the frame it is played from.
// The rig drives 7 joints (lib/rig/joints.ts): a clip's hand, foot and weapon tracks drop.
import { CLIP_FPS } from '@/lib/rig/clips';
import type { EnemyKind } from '../data/enemies';
import type { MeleeWeaponId } from '../data/weapons';
import type { DefenderLoadout } from '../types';

/** what a figure fights with: 'fists' for none (a defender the Armory has not armed, Storm), 'spell' for a caster's
 *  bare casting hand */
export type FightWeapon = MeleeWeaponId | 'crossbow' | 'longbow' | 'spell' | 'fists';
export interface Arms { weapon: FightWeapon; shield: boolean }

/** An enemy's arms — what EnemyFigure.tsx puts in his hands: a ranged bandit's crossbow, a bandit's halberd and shield,
 *  Gilbert's halberd, a sword and shield for the crown's knights, Cedric, skeletons, shieldbearers and siege crews, a
 *  mounted raider's spear and shield, a caster's spell; Storm none. */
export function enemyArms(e: { kind: EnemyKind; ranged?: boolean }): Arms {
  switch (e.kind) {
    case 'bandit': return e.ranged ? { weapon: 'crossbow', shield: false } : { weapon: 'halberd', shield: true };
    case 'gilbert': return { weapon: 'halberd', shield: false };
    case 'mountedRaider': return { weapon: 'spear', shield: true };
    case 'caster': return { weapon: 'spell', shield: false };
    case 'storm': return { weapon: 'fists', shield: false };
    default: return { weapon: 'sword', shield: true };
  }
}

/** A defender's loadout (data/villagers.ts) — or Tam's, who is never drawn with the bow loadout's crossbow (`crossbow`
 *  false: LoadoutGear's own flag) — as arms. The bow loadout holds a crossbow (LOADOUT_REQUIRES spends one, LoadoutGear
 *  draws one). */
export function loadoutArms(loadout: DefenderLoadout | undefined, crossbow = true): Arms {
  if (loadout === 'sword_shield') return { weapon: 'sword', shield: true };
  if (loadout === 'halberd') return { weapon: 'halberd', shield: false };
  if (loadout === 'bow' && crossbow) return { weapon: 'crossbow', shield: false };
  return { weapon: 'fists', shield: false };
}

/** The player's arms: the ranged weapon readied (with ammo), or else the melee one (combat/melee.ts's activeMelee:
 *  'sword' doubles as bare hands), and the shield on his arm if he owns one. */
export function playerArms(p: { ranged: 'crossbow' | 'longbow' | null; melee: MeleeWeaponId; shield: boolean }): Arms {
  return { weapon: p.ranged ?? p.melee, shield: p.shield };
}

/** the attack clip for each weapon, bare and with a shield on the other arm: a bow takes both hands, so has none; a
 *  caster raises his hand, holds it and looses as a crossbowman does; bare hands swing as a sword does */
const ATTACK: Record<FightWeapon, readonly [string, string]> = {
  sword: ['anim_g_swordswish', 'anim_g_swordswishwithshield'],
  halberd: ['anim_g_halberdswipe', 'anim_g_halberdswipewithshield'],
  spear: ['anim_g_spearstrike', 'anim_g_spearstrikewithshield'],
  crossbow: ['anim_g_crossbowshot', 'anim_g_crossbowshotwithshield'],
  longbow: ['anim_g_longbowshot', 'anim_g_longbowshot'],
  spell: ['anim_g_crossbowshot', 'anim_g_crossbowshot'],
  fists: ['anim_g_swordswish', 'anim_g_swordswishwithshield'],
};
const bowIn = (a: Arms) => a.weapon === 'crossbow' || a.weapon === 'longbow';

/** the clip an attack plays */
export function attackClip(a: Arms): string {
  return ATTACK[a.weapon][a.shield ? 1 : 0];
}

/** the clip a walk plays: with a shield up, a bow carried, or both; anything else walks as it always has */
export function walkClip(a: Arms): string {
  return bowIn(a) ? (a.shield ? 'anim_g_walkwithshieldandbow' : 'anim_g_walkwithbow')
    : a.shield ? 'anim_g_walkwithshield' : 'anim_c_walk';
}

/** the clip a run plays, as walkClip */
export function runClip(a: Arms): string {
  return bowIn(a) ? (a.shield ? 'anim_g_runwithshieldandbow' : 'anim_g_runwithbow')
    : a.shield ? 'anim_g_runwithshield' : 'anim_c_run';
}

/** Each attack clip's hit — the frame its blow lands or its shot is loosed — and the frame its motion ends (after it the
 *  figure stands as at rest), read off the clips' tracks (public/assets/anims, 2026-11-22: the frame the right arm moves
 *  fastest; for a bow, the left arm and body's jolt). Frame counts in brackets. */
export const CLIP_TIMING: Record<string, { hit: number; end: number }> = {
  anim_g_swordswish: { hit: 28, end: 44 }, // [46] wound up 0-24, the cut 25-30, back 36-44
  anim_g_swordswishwithshield: { hit: 28, end: 44 }, // [45]
  anim_g_halberdswipe: { hit: 29, end: 48 }, // [49] raised 0-10, the sweep 26-32, back 38-48
  anim_g_halberdswipewithshield: { hit: 29, end: 48 }, // [49]
  anim_g_spearstrike: { hit: 29, end: 50 }, // [51] drawn back 0-19, the thrust 20-30, back 40-50
  anim_g_spearstrikewithshield: { hit: 29, end: 50 }, // [51]
  anim_g_crossbowshot: { hit: 41, end: 55 }, // [57] raised 0-10, aimed 10-40, the kick at 41, lowered 44-56
  anim_g_crossbowshotwithshield: { hit: 41, end: 55 }, // [57]
  anim_g_longbowshot: { hit: 41, end: 55 }, // [96] drawn 0-10, held 10-40, loosed 41-43, lowered by 55, then still
};

/** the timeScale range an attack clip is played in: the clips run 46-96 frames (3-6.4 s at 1) against cooldowns of
 *  0.55-2.6 s; faster than 2.5 a swing is a blur, and none is slowed below its own pace */
export const SWING_TS_MIN = 1;
export const SWING_TS_MAX = 2.5;

/** A swing: its clip, the timeScale it plays at, the frame it is started from, and the seconds from then to its hit. */
export interface Swing { clip: string; timeScale: number; from: number; hit: number }

/** the timeScale that fits `frames` of a clip into `cd` seconds, clamped to SWING_TS_MIN-SWING_TS_MAX */
function fit(frames: number, cd: number): number {
  return Math.min(SWING_TS_MAX, Math.max(SWING_TS_MIN, frames / CLIP_FPS / cd));
}

/** A swing whose blow waits for the clip's hit: a hitscan shot (an enemy's crossbow, a defender's bow) or a projectile
 *  loosed on its release frame (a caster's spell). It plays from its first frame, its motion fitted into the cooldown
 *  `cd`; its `hit` is the delay the blow is held for. */
export function heldSwing(clip: string, cd: number): Swing {
  const t = CLIP_TIMING[clip];
  const timeScale = fit(t.end, cd);
  return { clip, timeScale, from: 0, hit: t.hit / CLIP_FPS / timeScale };
}

/** A swing whose blow lands at once (a melee blow the frame its cooldown runs out, the player's click — his bolt or
 *  arrow loosed then): it plays from its hit, so the clip's hit is the blow's frame, the rest of its motion fitted into
 *  `cd`. */
export function instantSwing(clip: string, cd: number): Swing {
  const t = CLIP_TIMING[clip];
  return { clip, timeScale: fit(t.end - t.hit, cd), from: t.hit, hit: 0 };
}

/** how long a swing's clip moves for, from the frame it is played from to its motion's end, in seconds */
export function swingSeconds(s: Swing): number {
  return (CLIP_TIMING[s.clip].end - s.from) / CLIP_FPS / s.timeScale;
}

/** An enemy's clip by its stance (step.ts's last line): its attack once a swing is begun in it (`swung`; till then, as
 *  he squares up, at rest), its run in a chase, its walk otherwise. */
export function stanceClip(state: string, a: Arms, swung = true): string {
  return state === 'attack' ? (swung ? attackClip(a) : 'anim_r_restpose') : state === 'chase' ? runClip(a) : walkClip(a);
}

/** The player's third-person clip (PlayerAvatar.tsx): a held-E gather's swing (a tool's, not a weapon's), a longbow
 *  being drawn or an attack (his weapon's), else his gait by his speed. */
export function avatarClip(p: { acting: boolean; attacking: boolean; drawing: boolean; speed: number; arms: Arms }): string {
  return p.acting ? 'anim_g_swordswish'
    : p.drawing || p.attacking ? attackClip(p.arms)
    : p.speed > 5 ? runClip(p.arms)
    : p.speed > 0 ? walkClip(p.arms)
    : 'anim_r_restpose';
}
