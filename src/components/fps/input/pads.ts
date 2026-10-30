// CLN-26 · the gamepad and the touch controls, read once a frame: what each holds goes into the player's `pad`
// record under the same action codes the keyboard's `keys` use (PlayerController.tsx's isDown() ORs the two), and
// the right stick and a look-drag turn the view. Moved from PlayerController.tsx as they were, but for the pitch
// clamp and the drag's sensitivity, look.ts's now.
import { useAppStore } from '@/game/store/appStore';
import { touchState } from '@/game/touchInput';
import { noteInputDevice } from '@/game/inputMode';
import { clampPitch, lookSensitivity } from './look';

const STICK_DEADZONE = 0.25;

// Standard-mapping gamepad -> the same action codes keyboard uses, written
// into a separate `pad` record (not `keys`) so a stick returning to neutral
// can't be confused with "the keyboard key was never pressed" — the two
// sources are OR'd together at read time (see `isDown` in PlayerController.tsx's frame).
//
// Wave 61 (H1) · jump/interact/sprint's button indices now come from
// `gpBtn` (the live, possibly-rebound settings.gamepadButtons table —
// data/gamepadInput.ts) instead of being literal 0/2/5 here, the same
// pattern CombatController.tsx's attack/block/swap/dodge reads already use.
// D-pad -> movement stays a literal index on purpose (see that file's header
// comment for why movement itself isn't part of the rebind table).
function pollGamepad(
  pad: Record<string, boolean>,
  kb: Record<string, string>,
  gpBtn: Record<string, number>,
  yaw: { current: number },
  pitch: { current: number },
  invertY: boolean,
  dt: number,
) {
  const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
  const gp = pads?.[0];
  if (!gp) {
    // Wave 15: a mid-session disconnect (or simply no pad ever connected)
    // must not leave whatever this SAME pad record wrote last frame stuck
    // "held" — pad[...] is OR'd with the keyboard at read time (isDown(),
    // in PlayerController.tsx's frame), so a stale true here would keep moving/jumping/sprinting the
    // player with no controller attached at all. Cleared explicitly every
    // frame there's no gamepad rather than relying solely on the
    // 'gamepaddisconnected' event (see usePlayerInput.ts's connect/disconnect effect)
    // — this self-heals even if that event is ever delayed or missed.
    pad[kb.moveForward] = false;
    pad[kb.moveBack] = false;
    pad[kb.moveLeft] = false;
    pad[kb.moveRight] = false;
    pad[kb.jump] = false;
    pad[kb.interact] = false;
    pad[kb.sprint] = false;
    return;
  }
  const [lx, ly, rx, ry] = gp.axes;
  const dpadUp = gp.buttons[12]?.pressed;
  const dpadDown = gp.buttons[13]?.pressed;
  const dpadLeft = gp.buttons[14]?.pressed;
  const dpadRight = gp.buttons[15]?.pressed;

  // Wave 15: a gamepad merely being CONNECTED shouldn't flip the HUD into
  // gamepad prompts — only the player actually touching it should. Checked
  // against every button/axis (not just the ones this function itself
  // consumes) so CombatController's RT/LT/Y and GamepadMenuController's
  // Start/B/LB/Back/L-stick reads all count too, from this one place.
  const anyAxis = [lx, ly, rx, ry].some((v) => Math.abs(v ?? 0) > STICK_DEADZONE);
  const anyButton = gp.buttons.some((b) => b.pressed);
  if (anyAxis || anyButton) noteInputDevice('gamepad');

  pad[kb.moveForward] = (ly ?? 0) < -STICK_DEADZONE || !!dpadUp;
  pad[kb.moveBack] = (ly ?? 0) > STICK_DEADZONE || !!dpadDown;
  pad[kb.moveLeft] = (lx ?? 0) < -STICK_DEADZONE || !!dpadLeft;
  pad[kb.moveRight] = (lx ?? 0) > STICK_DEADZONE || !!dpadRight;
  pad[kb.jump] = !!gp.buttons[gpBtn.jump]?.pressed; // default A
  pad[kb.interact] = !!gp.buttons[gpBtn.interact]?.pressed; // default X (held, matches "Hold E")
  pad[kb.sprint] = !!gp.buttons[gpBtn.sprint]?.pressed; // default RB

  // right stick -> look, analog (unlike the digital arrow-key look)
  const turn = 2.4 * dt;
  if (Math.abs(rx ?? 0) > STICK_DEADZONE) yaw.current -= rx * turn;
  if (Math.abs(ry ?? 0) > STICK_DEADZONE) {
    const d = ry * turn * (invertY ? -1 : 1);
    pitch.current = clampPitch(pitch.current - d);
  }
}

// Mobile-friendly pass (2026-07-20): TouchControls.tsx (a 2D HUD overlay, a
// separate React tree from the Canvas-side PlayerController) writes into
// game/touchInput.ts's leaf module every touch event; this reads it back
// each frame exactly like pollGamepad reads a real Gamepad — same `pad`
// record, same yaw/pitch refs, so every downstream isDown()/movement/look
// check already works with zero further changes.
function pollTouch(
  pad: Record<string, boolean>,
  kb: Record<string, string>,
  yaw: { current: number },
  pitch: { current: number },
  invertY: boolean,
) {
  if (!touchState.active) return;
  const dz = 0.3; // virtual-stick deadzone — thumbs drift more than a real analog stick
  // OR-merge, not overwrite: pollGamepad already ran this frame, and on a
  // hybrid device (touch + a connected gamepad) a `false` touch channel must
  // not clear a `true` the gamepad just set for the same action.
  pad[kb.moveForward] = pad[kb.moveForward] || touchState.moveY < -dz;
  pad[kb.moveBack] = pad[kb.moveBack] || touchState.moveY > dz;
  pad[kb.moveLeft] = pad[kb.moveLeft] || touchState.moveX < -dz;
  pad[kb.moveRight] = pad[kb.moveRight] || touchState.moveX > dz;
  pad[kb.jump] = pad[kb.jump] || touchState.jump;
  pad[kb.interact] = pad[kb.interact] || touchState.interact;
  pad[kb.sprint] = pad[kb.sprint] || touchState.sprint;

  // look-drag deltas are per-event accumulations since last frame (mirrors
  // mouse movementX/Y) — apply with the same sensitivity formula the mouse
  // path uses, then consume (zero) them so they don't compound next frame
  if (touchState.lookDX !== 0 || touchState.lookDY !== 0) {
    const sens = lookSensitivity();
    yaw.current -= touchState.lookDX * sens;
    const dy = touchState.lookDY * sens * (invertY ? -1 : 1);
    pitch.current = clampPitch(pitch.current - dy);
    touchState.lookDX = 0;
    touchState.lookDY = 0;
  }
}

/** this frame's gamepad and touch into `pad` — or, while the game is frozen (paused, a panel, the build view, a
 *  ceremony), nothing held at all */
export function pollPads(frozen: boolean, pad: { current: Record<string, boolean> }, kb: Record<string, string>, yaw: { current: number }, pitch: { current: number }, dt: number): void {
  if (!frozen) {
    pollGamepad(pad.current, kb, useAppStore.getState().settings.gamepadButtons, yaw, pitch, useAppStore.getState().settings.invertY, dt);
    pollTouch(pad.current, kb, yaw, pitch, useAppStore.getState().settings.invertY);
  } else pad.current = {};
}
