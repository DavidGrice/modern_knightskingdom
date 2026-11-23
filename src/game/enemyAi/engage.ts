// CLN-13 · how an enemy fights the mark it has picked: in reach, it swings on its cooldown (swingAt); out of reach, it
// closes in (closeIn). engage() is the two together — the one shape of the five marks that have both, each of which
// Enemies.tsx wrote out on its own: a guard on the battlements, a guard, Tam, a villager, and the player up on a wall.
// The player on the ground, a piece of the keep and a siege crew's engine take the swing alone; the foot of the siege
// ladder and the chase of the player, the closing in alone. The blows themselves are blows.ts's.
// G-10 · a crossbow's shot and a caster's spell are drawn first: the blow waits for the release of its clip (`draw`).
import type { EnemyData } from '@/game/combat';
import { ATTACK_CD } from '@/game/data/enemies';
import { attackClip, enemyArms, heldSwing, instantSwing, type Swing } from '@/game/combat/fightClips';
import type { Mob } from './frame';

/** crossbow-armed bandits (`data.ranged`): hold at range and hit-scan
 *  instead of closing to melee, mirroring Defenders.tsx's own bow loadout
 *  (`target.hp -= dmg` applied directly at range-check time, no projectile —
 *  the damage is RANGED_DMG, below) */
export const RANGED_RANGE = 14;
export const RANGED_ATTACK_CD = 1.8;
/** a crossbow bandit's hit-scan damage (moved from blows.ts, G-07: the lost-raid resolver reads it, and blows.ts's
 *  imports would close a cycle through the knock-out) */
export const RANGED_DMG = 1.2;
/** Wave 37 (A3 remainder) · a caster's own ranged profile — a real, visible
 *  spell bolt (fireSpellBolt) rather than another silent hit-scan, but the
 *  same range/no-kiting AI SHAPE as a ranged bandit (see rangedProfileOf
 *  below): point-blank is fine, and nothing here invents new movement AI.
 *  The bolt's damage is blows.ts's CASTER_SPELL_DMG. */
export const CASTER_RANGE = 16;
export const CASTER_ATTACK_CD = 2.6;

/** how far a crossbow or a caster fights from, and its own cooldown — null for a melee fighter */
export type RangedProfile = { range: number; cd: number } | null;

/** Wave 37 (A3 remainder) · a caster fights the PLAYER at range the
 *  same SHAPE a ranged bandit already does (point-blank is fine, no
 *  kiting) — see the frame's attack on the player, the one place this is
 *  read. Deliberately NOT generalized through the three priority
 *  branches above it (a guard, Tam, a villager): a caster still falls
 *  back to its own melee stats (ATTACK_DMG.caster/ATTACK_CD.caster)
 *  against those targets — a real, named scope cut, not an oversight. */
export function rangedProfileOf(data: EnemyData): RangedProfile {
  return data.ranged ? { range: RANGED_RANGE, cd: RANGED_ATTACK_CD }
    : data.kind === 'caster' ? { range: CASTER_RANGE, cd: CASTER_ATTACK_CD }
    : null;
}

/** G-10 · An enemy's swing, as his figure plays it (game/combat/fightClips.ts): a crossbow's shot and a caster's spell
 *  held to the clip's release, fitted to their own cooldown (rangedProfileOf's) — against the player; at one of the
 *  player's side a caster fights hand to hand, his blow at once — every other blow at once, fitted to his kind's. */
export function swingOf(data: EnemyData): Swing {
  const clip = attackClip(enemyArms(data));
  const ranged = rangedProfileOf(data);
  return ranged ? heldSwing(clip, ranged.cd) : instantSwing(clip, ATTACK_CD[data.kind]);
}

/** G-10 · a shot drawn: the mark it is drawn at (its kind and id: 'def:g1', 'player') and the seconds until it is
 *  loosed (swingOf's hit) */
export interface Draw { mark: string; release: number }

/** The swing: the attack stance, the cooldown running down, the turn to face the mark (`face`; null for one that needs
 *  none — a melee attacker arrives facing its target already), and once the cooldown is out, the blow — which sets the
 *  next cooldown itself. Each swing begun is counted (`m.swings`: his figure plays its clip again on it). G-10 · a shot
 *  (`draw`) is drawn first: begun as the cooldown runs out, it lands `release` seconds on, if he swings at the same
 *  mark every frame until then (any other frame lets it go: dropStaleDraw) and is not staggered meanwhile, and the next
 *  cooldown is taken from the draw's start, so shot follows shot every cooldown as before. */
export function swingAt(m: Mob, dt: number, face: { x: number; z: number } | null, blow: () => void, draw?: Draw): void {
  if (m.state !== 'attack') m.stanceSwings = m.swings ?? 0;
  m.state = 'attack';
  m.attackCd -= dt;
  if (face) m.yaw = Math.atan2(-(face.x - m.x), -(face.z - m.z));
  if (m.draw && m.draw.mark === draw?.mark && m.attackCd <= 0) {
    m.draw.held = true;
    if ((m.draw.t -= dt) > 0) return;
    const since = draw.release - m.draw.t; // the draw's start, this frame
    m.draw = undefined;
    blow();
    m.attackCd -= since;
    return;
  }
  // drawn at another mark, or staggered while drawing (a finisher or a parry forces the cooldown up — a draw begins at
  // 0 and only runs it down): let go, and drawn again from its start once the stagger is out
  m.draw = undefined;
  if (m.attackCd > 0) return;
  m.swings = (m.swings ?? 0) + 1;
  if (draw) m.draw = { mark: draw.mark, t: draw.release, held: true };
  else blow();
}

/** G-10 · whether he has begun a swing since he last came into the attack stance: till then — his next swing, at the
 *  least closeIn's 0.4 s hold on arriving, at most the rest of his cooldown — his figure squares up at rest, rather than
 *  show a blow that has not come (step.ts's clip). A stagger leaves him in the stance: his last clip holds. */
export function swungInStance(m: Mob): boolean {
  return (m.swings ?? 0) > (m.stanceSwings ?? 0);
}

/** G-10 · A shot drawn and not swung on again the next frame — its striker fell or was felled, ran, closed in, lost his
 *  sight of it or turned to another mark, or the player went to build — is let go, and never lands. Called at the head
 *  of every frame (step.ts); swingAt marks the draw it carries on. */
export function dropStaleDraw(m: Mob): void {
  if (!m.draw) return;
  if (m.draw.held) m.draw.held = false;
  else m.draw = undefined;
}

/** The closing in: the chase stance, the cooldown run down but held at 0.4 s (so the first blow on arrival is not
 *  instant), then a step the way `way` gives (worked out after those two) at `pace`, facing where it goes. */
export function closeIn(m: Mob, dt: number, way: () => { nx: number; nz: number }, pace: number): void {
  m.state = 'chase';
  m.attackCd = Math.max(0.4, m.attackCd - dt);
  const { nx, nz } = way();
  m.x += nx * pace * dt;
  m.z += nz * pace * dt;
  // yaw -> facing direction is (-sin, -cos) everywhere else in this
  // codebase (see game/playerPhysics/locomotion.ts, game/combat/melee.ts), so recovering yaw from
  // a movement direction needs the negated atan2, not a bare one.
  m.yaw = Math.atan2(-nx, -nz);
}

/** A mark to fight: whether it is in reach (and, for a crossbow, in sight), what to face while swinging, the blow, the
 *  way to close in and the pace to close in at — and a crossbow's draw. */
export interface Engagement {
  inReach: boolean;
  face: { x: number; z: number } | null;
  blow: () => void;
  way: () => { nx: number; nz: number };
  pace: number;
  /** G-10 · a crossbow's shot, drawn before it lands (swingAt) */
  draw?: Draw;
}

export function engage(m: Mob, dt: number, e: Engagement): void {
  if (e.inReach) swingAt(m, dt, e.face, e.blow, e.draw);
  else closeIn(m, dt, e.way, e.pace);
}
