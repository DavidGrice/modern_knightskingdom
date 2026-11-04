'use client';

import { exposeDebug } from '@/lib/debugHooks';

// Touch input (mobile-friendly pass, 2026-07-20): a mutable leaf module,
// same convention as playerState/combatState/worldEnv — TouchControls.tsx
// (a 2D HUD overlay) writes into this every frame from touch events;
// PlayerController.tsx (a 3D/R3F component, a separate React tree) reads it
// each frame (pollTouch, in its input/pads.ts) exactly like it already reads a
// real Gamepad in pollGamepad,
// feeding the same `pad` record and the same yaw/pitch refs. Neither side
// imports the other — this module is the bridge, avoiding any cross-tree
// prop-drilling between the Canvas and the HUD.
export const touchState = {
  active: false,       // the on-screen controls are showing (TouchControls, showTouchControls below)
  moveX: 0, moveY: 0,  // virtual joystick, both -1..1 (moveY: -1 = forward, matching stick-up)
  // look deltas are PER-EVENT drag amounts accumulated since the last frame
  // consumed them (mirrors mouse movementX/Y) — pollTouch (PlayerController's
  // input/pads.ts) applies them with the mouse's own sensitivity (look.ts's
  // lookSensitivity), then zeroes them itself.
  lookDX: 0, lookDY: 0,
  jump: false,
  interact: false,
  sprint: false,
  // Wave 15 touch combat: held-state booleans, same convention as
  // jump/interact/sprint above (TouchControls just flips these on
  // touchstart/touchend, no edge logic here). CombatController.tsx is the
  // one place that turns a held boolean into a discrete swing/block/draw —
  // it hand-rolls the down/up edge itself (there's no native "touch down"
  // event once this boolean is all that's left of the gesture), the same
  // way a gamepad button has to be edge-detected against last frame.
  attack: false,
  block: false,
};

export function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** whether a mouse (or another fine pointer) is there to use — a hybrid laptop has one, a phone or tablet does not */
export function detectMouse(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(any-pointer: fine)').matches;
}

/** F-10a · whether the on-screen controls show: Options > Interface's
 *  "Prompt style" pinned to Touch forces them (a hybrid laptop, a touch
 *  screen the browser does not report); pinned to Keyboard or Gamepad hides
 *  them where a mouse is there instead (a hybrid laptop's full-screen look
 *  surface would cover it) — but never on a touch-only device, which has no
 *  other way to move or to reach the pause menu; Auto leaves it to
 *  detectTouch() as before. */
export function showTouchControls(
  inputMode: 'auto' | 'keyboard' | 'gamepad' | 'touch', touchCapable: boolean, hasMouse: boolean,
): boolean {
  if (inputMode === 'touch') return true;
  if (inputMode === 'auto') return touchCapable;
  return touchCapable && !hasMouse;
}

/** panels/pause/build-mode interrupting a drag orphans its touchend — call
 *  on unmount so a stuck joystick can't leave the player still "moving"
 *  once touch controls remount. */
export function resetTouchState() {
  touchState.moveX = 0;
  touchState.moveY = 0;
  touchState.lookDX = 0;
  touchState.lookDY = 0;
  touchState.jump = false;
  touchState.interact = false;
  touchState.sprint = false;
  touchState.attack = false;
  touchState.block = false;
}

exposeDebug('__kktouch', touchState);
