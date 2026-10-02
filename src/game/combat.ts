'use client';
// Combat state: player vitals as a mutable module (HUD polls at low frequency),
// enemies in a small zustand store (list changes re-render; positions are
// mutated in place by each enemy's frame loop).
//
// CLN-11 · this file is a barrel. What used to be one 1684-line module is:
//   data/enemies.ts, data/weapons.ts, data/melee.ts   the tables: enemy kinds, weapon slots, the melee ladder
//   combat/state.ts          combatState
//   combat/vitals.ts         the vitals' ceilings, kept in step with the store
//   combat/enemyStore.ts     useEnemyStore, and dropping a world's enemies when the player leaves it
//   combat/loot.ts           what an enemy carries and hands over
//   combat/kill.ts           settling an enemy's death, whoever dealt it (CLN-12)
//   combat/playerDamage.ts   damagePlayer
//   combat/duel.ts           the first-blow duel with Storm
//   combat/shield.ts         the shielded elite's frontal block (melee and ranged share it)
//   combat/structures.ts     breaking the raiders' ram and ladder
//   combat/melee.ts          the swing, the dodge-roll, weapon cycling
//   combat/projectiles.ts    bolts, arrows, the spell bolt, stepBolt
//   combat/session.ts        what a new session resets
//   combat/debugHooks.ts     the window.__kk* handles
// Everything this module exported then is re-exported below, so no importer changed. (CLN-12 has since taken one
// name back out: `lootFor`, whose outside callers were the hand-rolled kill bookkeeping `resolveEnemyKill` replaced.)
//
// The three side-effect imports come first and in this order on purpose: it is the order the single file ran them
// in — the vitals subscriber before the enemy store's own, the session hook once the store exists.
import './combat/vitals';
import './combat/session';
import './combat/debugHooks';

export { CLICK_HELD_TARGET_KINDS, combatState } from './combat/state';
export { isMeleeSlot } from './data/weapons';
export type { MeleeWeaponId, WeaponSlot } from './data/weapons';
export { ATTACK_CD, ATTACK_DMG, KIND_LABEL, LOOT_TABLES, MOUNT_SEAT_Y, maxHpOf } from './data/enemies';
export type { EnemyKind } from './data/enemies';
export { DODGE_SPEED, MELEE, bestMeleeTierOwned, ownsMeleeSlot, weaponSlotOfItem } from './data/melee';
export type { MeleeTier } from './data/melee';
export { useEnemyStore } from './combat/enemyStore';
export type { EnemyData } from './combat/enemyStore';
export { damagePlayer } from './combat/playerDamage';
export { canChallengeStorm, resolveDuel } from './combat/duel';
export { resolveEnemyKill } from './combat/kill';
export { activeMelee, cycleWeapon, playerAttack, tryDodge } from './combat/melee';
export {
  FULL_DRAW_TIME, MIN_DRAW, fireArrow, fireBolt, fireSpellBolt, stepBolt, useBoltStore,
} from './combat/projectiles';
export type { Bolt } from './combat/projectiles';
