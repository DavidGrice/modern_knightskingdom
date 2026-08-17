'use client';
// Touch input (mobile-friendly pass, 2026-07-20): a mutable leaf module,
// same convention as playerState/combatState/worldEnv — TouchControls.tsx
// (a 2D HUD overlay) writes into this every frame from touch events;
// PlayerController.tsx (a 3D/R3F component, a separate React tree) reads it
// each frame exactly like it already reads a real Gamepad in pollGamepad,
// feeding the same `pad` record and the same yaw/pitch refs. Neither side
// imports the other — this module is the bridge, avoiding any cross-tree
// prop-drilling between the Canvas and the HUD.
export const touchState = {
  active: false,       // a touch-capable device — detected once, drives whether TouchControls renders at all
  moveX: 0, moveY: 0,  // virtual joystick, both -1..1 (moveY: -1 = forward, matching stick-up)
  // look deltas are PER-EVENT drag amounts accumulated since the last frame
  // consumed them (mirrors mouse movementX/Y) — PlayerController zeroes
  // these out itself after applying them, same as it does for the mouse.
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

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kktouch = touchState;
}
