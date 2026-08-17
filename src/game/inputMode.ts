'use client';
// Wave 15: which input device the player is actually using RIGHT NOW, so the
// HUD can show "E"/"X"/a touch-appropriate label instead of always assuming
// a keyboard. Two deliberately separate things, same split as
// GraphicsQuality vs suggestGraphicsQuality():
//  - Settings.inputMode ('auto'|'keyboard'|'gamepad'|'touch', appStore.ts) —
//    PERSISTED, the player's own manual override. 'auto' by default.
//  - activeInputDevice (gameStore.ts) — NOT persisted, a live "what did the
//    player's hands touch most recently" fact. Only consulted when the
//    setting is 'auto'; updated below from real input events, not from mere
//    device presence (a gamepad sitting connected but untouched, or a touch
//    device whose player is using a paired keyboard, shouldn't flip this).
//
// Written from: PlayerController's keydown listener + pollGamepad (real
// button/axis motion) + CombatController's mousedown + TouchControls' own
// touchstart. Read by HUD.tsx's interact prompt and Panels.tsx's cheat
// sheet via resolveInputDevice().
import { useGameStore } from './store/gameStore';

export type InputDevice = 'keyboard' | 'touch' | 'gamepad';

// module-local mirror of gameStore's activeInputDevice, purely so callers on
// a hot path (pollGamepad, once a frame) can skip the getState()+set() round
// trip once the device hasn't actually changed, rather than relying on
// setActiveInputDevice's own dedupe alone.
let last: InputDevice = 'keyboard';

/** call from a real input event handler — a keydown, a mousedown, a
 *  touchstart, an actual pressed gamepad button/moved stick. */
export function noteInputDevice(d: InputDevice) {
  if (last === d) return;
  last = d;
  useGameStore.getState().setActiveInputDevice(d);
}

/** Settings.inputMode 'auto' resolves to whichever device last produced a
 *  real input event; any explicit choice always wins over that. */
export function resolveInputDevice(mode: 'auto' | InputDevice, active: InputDevice): InputDevice {
  return mode === 'auto' ? active : mode;
}

// the on-screen/physical control that actually drives "interact" for each
// device — X is PlayerController's pollGamepad button 2; keyboard's bound
// key and touch's own on-screen button both happen to already read "E"
// (TouchControls.tsx's Interact circle is literally labelled E), so there's
// only one real fork here.
export function interactLabel(device: InputDevice): string {
  return device === 'gamepad' ? 'X' : 'E';
}

// the hold-to-gather/build prompt: on keyboard/mouse this is a held LMB
// ("Click" — combat.ts's CLICK_HELD_TARGET_KINDS), but gamepad/touch were
// never given a separate hold-input for it (PlayerController.tsx's
// `heldInput` — search that name for why) — they still gather by holding
// their ordinary Interact button, so the prompt has to say THAT, not
// "Click", or it would point at a control that does nothing here.
export function clickHoldLabel(device: InputDevice): string {
  return device === 'keyboard' ? 'Click' : interactLabel(device);
}
