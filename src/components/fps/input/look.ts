// CLN-26 · the view's look, whichever device turns it: how far it may tilt (clampPitch), how far a pointer's travel
// turns it (lookSensitivity — the mouse's movementX/Y and a touch drag's deltas alike), and the arrow keys
// (keyboardLook). The mouse (usePointerLock.ts), the right stick and a look-drag (pads.ts) tilt through clampPitch
// too: the limit and the sensitivity are written here once, where each device's code used to carry its own copy.
import * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';

/** how far the view tilts up or down, at most (radians) */
const PITCH_LIMIT = 1.45;

/** a pitch, kept to what the view may tilt */
export function clampPitch(pitch: number): number {
  return THREE.MathUtils.clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
}

/** radians of turn per pixel of a pointer's travel — the mouse's movementX/Y and a touch drag's deltas alike */
export function lookSensitivity(): number {
  return 0.0022 * useAppStore.getState().settings.mouseSensitivity * 2;
}

/** keyboard camera turning (arrow keys), in addition to mouse look */
export function keyboardLook(keys: { current: Record<string, boolean> }, kb: Record<string, string>, yaw: { current: number }, pitch: { current: number }, dt: number): void {
  const turn = 2.0 * dt;
  if (keys.current[kb.lookLeft]) yaw.current += turn;
  if (keys.current[kb.lookRight]) yaw.current -= turn;
  if (keys.current[kb.lookUp]) pitch.current = clampPitch(pitch.current + turn);
  if (keys.current[kb.lookDown]) pitch.current = clampPitch(pitch.current - turn);
}
