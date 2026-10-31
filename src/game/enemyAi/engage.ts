// CLN-13 · how an enemy fights the mark it has picked: in reach, it swings on its cooldown (swingAt); out of reach, it
// closes in (closeIn). engage() is the two together — the one shape of the five marks that have both, each of which
// Enemies.tsx wrote out on its own: a guard on the battlements, a guard, Tam, a villager, and the player up on a wall.
// The player on the ground, a piece of the keep and a siege crew's engine take the swing alone; the foot of the siege
// ladder and the chase of the player, the closing in alone. The blows themselves are blows.ts's.
import type { EnemyData } from '@/game/combat';
import type { Mob } from './frame';

/** crossbow-armed bandits (`data.ranged`): hold at range and hit-scan
 *  instead of closing to melee, mirroring Defenders.tsx's own bow loadout
 *  (`target.hp -= dmg` applied directly at range-check time, no projectile —
 *  the damage is blows.ts's RANGED_DMG) */
export const RANGED_RANGE = 14;
export const RANGED_ATTACK_CD = 1.8;
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

/** The swing: the attack stance, the cooldown running down, the turn to face the mark (`face`; null for one that needs
 *  none — a melee attacker arrives facing its target already), and once the cooldown is out, the blow — which sets the
 *  next cooldown itself. */
export function swingAt(m: Mob, dt: number, face: { x: number; z: number } | null, blow: () => void): void {
  m.state = 'attack';
  m.attackCd -= dt;
  if (face) m.yaw = Math.atan2(-(face.x - m.x), -(face.z - m.z));
  if (m.attackCd <= 0) blow();
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
 *  way to close in and the pace to close in at. */
export interface Engagement {
  inReach: boolean;
  face: { x: number; z: number } | null;
  blow: () => void;
  way: () => { nx: number; nz: number };
  pace: number;
}

export function engage(m: Mob, dt: number, e: Engagement): void {
  if (e.inReach) swingAt(m, dt, e.face, e.blow);
  else closeIn(m, dt, e.way, e.pace);
}
