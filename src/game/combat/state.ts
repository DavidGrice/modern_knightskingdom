'use client';
// CLN-11 · split out of game/combat.ts unchanged: the player's own combat state — one always-on mutable object the
// HUD polls and every combat system reads and writes.
import { playerState } from '../playerState';
import { EYE_HEIGHT } from '../data/world';
import type { MeleeWeaponId } from '../data/weapons';

/** true while standing on a wall/tower top rather than the ground — height
 *  earns a real mechanical edge for ranged combat, not just a viewpoint. */
export function onBattlement(): boolean {
  return playerState.y > EYE_HEIGHT + 0.15;
}

/** `Target.kind` values (PlayerController.tsx) driven by holding the attack
 *  button (`combatState.lmbDown`) instead of firing a normal swing/shot —
 *  construction sites originally, gathering ('tree'/'rock'/'fishing'/'herb')
 *  added 2026-07-30 for mechanical consistency with how attacking already
 *  works. The single source both `CombatController`'s mousedown guard (don't
 *  ALSO swing/fire when the hold is meant for the tool in hand) and
 *  `PlayerController`'s own prompt/held-input logic read from. */
export const CLICK_HELD_TARGET_KINDS = new Set(['construct', 'tree', 'rock', 'fishing', 'herb']);

export const combatState = {
  hp: 10,
  maxHp: 10,
  stamina: 100,
  maxStamina: 100,
  blocking: false,
  galloping: false,
  /** on-foot sprinting (Shift + moving) — spends stamina the same way galloping does */
  sprinting: false,
  /** LMB currently held (2026-07-20) — set by CombatController's own mousedown/
   *  mouseup listeners, read by PlayerController's hold-to-act loop so
   *  construction can be driven by holding the attack button instead of E */
  lmbDown: false,
  weapon: 'melee' as 'melee' | 'ranged',
  /** which ranged weapon is readied when weapon === 'ranged' */
  rangedWeapon: 'crossbow' as 'crossbow' | 'longbow',
  /** which melee weapon is readied when weapon === 'melee'. 'sword' doubles
   *  as the bare-fisted default (see activeMelee) — nothing is ever guaranteed
   *  to be owned, so this is a PREFERENCE, not a claim of ownership. */
  meleeWeapon: 'sword' as MeleeWeaponId,
  /** performance.now() the longbow draw started, 0 = not drawing */
  drawStart: 0,
  aiming: false,
  /** seconds of remaining hurt-vignette */
  flash: 0,
  /** performance.now() of the last attack swing (viewmodel animation) */
  attackAt: 0,
  /** set by damage logic; PlayerController teleports and clears it */
  teleportTo: null as [number, number] | null,

  // ---- Wave 40 (A6) · real melee depth: dodge-roll, parry timing, i-frames,
  // combo chain. Plain fields on this same always-on mutable object — no
  // parallel store, matching every field above.
  /** performance.now() of block's rising edge — lets damagePlayer tell a
   *  just-pressed parry from a long-held block (see tryDodge's sibling
   *  reasoning in melee.ts and damagePlayer's parry branch). Stamped by
   *  CombatController's startBlock(), which only ever runs on a true
   *  press-edge across mouse/touch/gamepad. */
  blockPressedAt: 0,
  /** set by CombatController's input dispatch (keydown/touch/gamepad edge),
   *  consumed once by PlayerController's on-foot movement branch */
  dodgeQueued: false,
  /** world-space unit vector, captured at trigger time by tryDodge() */
  dodgeDir: { x: 0, z: -1 },
  /** performance.now() the active dodge burst ends */
  dodgeUntil: 0,
  /** performance.now() cooldown gate — tryDodge refuses a new roll before this */
  dodgeReadyAt: 0,
  /** shared invincibility gate — both dodge and a successful parry write this;
   *  damagePlayer's very first line is an early-return while now < this */
  iframeUntil: 0,
  /** consecutive landed melee swings within COMBO_WINDOW_MS of each other */
  comboCount: 0,
  /** performance.now() the current combo chain lapses if no swing lands first */
  comboWindowUntil: 0,
};
