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
// Written from: the player's keydown listener and pollGamepad
// (components/fps/input/usePlayerInput.ts, pads.ts — real button/axis
// motion) + CombatController's mousedown + TouchControls' own
// touchstart. Read by HUD.tsx's interact prompt and Panels.tsx's cheat
// sheet via resolveInputDevice().
import { useGameStore } from './store/gameStore';
import { codeLabel } from './data/keybinds';
import { gamepadButtonLabel } from './data/gamepadInput';

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

/** the two rebind tables a label is read from — Settings (appStore.ts) is one */
export interface Bindings {
  keybinds: Record<string, string>;
  gamepadButtons: Record<string, number>;
}

// the on-screen/physical control that actually drives "interact" for each
// device. F-10a · keyboard and gamepad name the player's own binding (both
// are rebindable — Options > Keybinds); touch's on-screen Interact circle is
// literally labelled E (TouchControls.tsx), whatever the keyboard says.
export function interactLabel(device: InputDevice, b: Bindings): string {
  if (device === 'gamepad') return gamepadButtonLabel(b.gamepadButtons.interact);
  return device === 'touch' ? 'E' : codeLabel(b.keybinds.interact);
}

// the hold-to-gather/build prompt: on keyboard/mouse this is a held LMB
// ("Click" — combat.ts's CLICK_HELD_TARGET_KINDS), but gamepad/touch were
// never given a separate hold-input for it (game/interaction/holdToAct.ts's
// `heldInput` — search that name for why) — they still gather by holding
// their ordinary Interact button, so the prompt has to say THAT, not
// "Click", or it would point at a control that does nothing here.
export function clickHoldLabel(device: InputDevice, b: Bindings): string {
  return device === 'keyboard' ? 'Click' : interactLabel(device, b);
}

// F-10a · attack/draw and block/aim: the mouse buttons on keyboard/mouse (not
// rebindable), the player's pad buttons, or the touch buttons' own glyphs
export function attackLabel(device: InputDevice, b: Bindings): string {
  if (device === 'gamepad') return gamepadButtonLabel(b.gamepadButtons.attack);
  return device === 'touch' ? '⚔' : 'LMB';
}
export function blockLabel(device: InputDevice, b: Bindings): string {
  if (device === 'gamepad') return gamepadButtonLabel(b.gamepadButtons.block);
  return device === 'touch' ? '🛡' : 'RMB';
}

// F-10a · a key label is one word, or two for codeLabel's 'Up Arrow'/'Caps
// Lock' and a pad's 'L-Stick Click'
const PROMPT_KEY = String.raw`\S+(?: (?:Arrow|Lock|Click))?`;
const HOLD_PROMPT = new RegExp(String.raw`^Hold\s+(${PROMPT_KEY})\s+—?\s*(.*)$`, 'i');
const TAP_PROMPT = new RegExp(String.raw`^(${PROMPT_KEY})\s+—\s+(.*)$`);

/** HUD.tsx's prompt chip, read back from the text holdToAct.ts writes: "Hold
 *  <key> — <verb>" is held, "<key> — <verb>" a tap, anything else a bare verb
 *  with no key */
export function splitPrompt(prompt: string): { held: boolean; key: string | null; verb: string } {
  const hold = prompt.match(HOLD_PROMPT);
  if (hold) return { held: true, key: hold[1], verb: hold[2] };
  const tap = prompt.match(TAP_PROMPT);
  return tap ? { held: false, key: tap[1], verb: tap[2] } : { held: false, key: null, verb: prompt };
}
