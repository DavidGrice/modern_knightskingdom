import { beforeEach, describe, expect, it, vi } from 'vitest';

// The gamepad and the touch controls (CLN-26: input/pads.ts), read the way the frame reads them, once a frame through
// pollPads: the gamepads are what navigator.getGamepads() hands back, the settings one object the test sets, and the
// device the HUD is told about a list of what was noted.
const H = vi.hoisted(() => ({
  pads: [] as (object | null)[],
  noted: [] as string[],
  settings: { gamepadButtons: { jump: 0, interact: 2, sprint: 5 } as Record<string, number>, invertY: false, mouseSensitivity: 1 },
}));
vi.mock('@/game/store/appStore', () => ({ useAppStore: { getState: () => ({ settings: H.settings }) } }));
vi.mock('@/game/inputMode', () => ({ noteInputDevice: (device: string) => { H.noted.push(device); } }));
vi.stubGlobal('navigator', { getGamepads: () => H.pads });

import { pollPads } from './pads';
import { touchState } from '@/game/touchInput';

const kb = { moveForward: 'KeyW', moveBack: 'KeyS', moveLeft: 'KeyA', moveRight: 'KeyD', jump: 'Space', interact: 'KeyE', sprint: 'ShiftLeft' };
/** a standard-mapping pad: its four axes (left x, y, right x, y), and which of its 17 buttons are down */
const gamepad = (axes: number[], down: number[] = []) => ({ axes, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i) })) });
/** one frame's poll, 0.1 s long */
const frame = ({ frozen = false, held = {} as Record<string, boolean>, pitch = 0 } = {}) => {
  const pad = { current: held }, yaw = { current: 0 }, p = { current: pitch };
  pollPads(frozen, pad, kb, yaw, p, 0.1);
  return { pad: pad.current, yaw: yaw.current, pitch: p.current };
};
const anyHeld = (pad: Record<string, boolean>) => Object.values(pad).some(Boolean);
/** every one of the seven action codes, held */
const allHeld = () => Object.fromEntries(Object.values(kb).map((code) => [code, true]));

beforeEach(() => {
  H.pads = [];
  H.noted = [];
  H.settings = { gamepadButtons: { jump: 0, interact: 2, sprint: 5 }, invertY: false, mouseSensitivity: 1 };
  Object.assign(touchState, { active: false, moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, jump: false, interact: false, sprint: false });
});

describe('pollPads', () => {
  it("a gamepad's left stick and its (rebound) buttons hold the keyboard's action codes, and its right stick turns the view", () => {
    H.settings.gamepadButtons = { jump: 3, interact: 2, sprint: 4 };
    H.pads = [gamepad([0, -1, 0.5, 0], [3, 4])];
    const f = frame();
    expect(f.pad).toEqual({ KeyW: true, KeyS: false, KeyA: false, KeyD: false, Space: true, KeyE: false, ShiftLeft: true });
    expect(f.yaw).toBeCloseTo(-0.5 * 2.4 * 0.1, 12);
    expect(H.noted).toEqual(['gamepad']);
  });

  it('a stick resting inside its deadzone holds nothing and turns nothing, and a pad merely connected does not take the HUD', () => {
    H.pads = [gamepad([0.2, -0.2, 0.1, 0.2])];
    const f = frame();
    expect(anyHeld(f.pad)).toBe(false);
    expect(f.yaw).toBe(0);
    expect(f.pitch).toBe(0);
    expect(H.noted).toEqual([]);
  });

  it('with no gamepad, whatever the pad held last frame is let go', () => {
    H.pads = [null];
    expect(anyHeld(frame({ held: allHeld() }).pad)).toBe(false);
  });

  it('touch and a gamepad together: one at rest never lets go of what the other holds (an OR, not an overwrite)', () => {
    touchState.active = true;
    // the gamepad holding all seven (the stick forward-left, the D-pad back and right, A, X, RB), the touch stick at rest
    H.pads = [gamepad([-1, -1, 0, 0], [0, 2, 5, 13, 15])];
    expect(frame().pad).toEqual(allHeld());
    H.pads = [gamepad([0, 0, 0, 0])]; // the touch stick forward, the gamepad at rest
    touchState.moveY = -1;
    expect(frame().pad.KeyW).toBe(true);
  });

  it("a look-drag turns the view by the pointer's sensitivity, and only once", () => {
    H.settings.mouseSensitivity = 1.5;
    touchState.active = true;
    touchState.lookDX = 100;
    expect(frame().yaw).toBeCloseTo(-100 * 0.0022 * 1.5 * 2, 12);
    expect(touchState.lookDX).toBe(0);
    expect(frame().yaw).toBe(0);
  });

  it('the view tilts no further than its limit, down or up', () => {
    H.pads = [gamepad([0, 0, 0, 1])];
    expect(frame({ pitch: -1.44 }).pitch).toBe(-1.45);
    H.pads = [gamepad([0, 0, 0, -1])];
    expect(frame({ pitch: 1.44 }).pitch).toBe(1.45);
  });

  it('frozen (a panel, a pause): nothing is held at all', () => {
    H.pads = [gamepad([0, -1, 0, 0], [0])];
    expect(frame({ frozen: true, held: { KeyW: true } }).pad).toEqual({});
  });
});
