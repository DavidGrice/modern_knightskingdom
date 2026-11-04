import { describe, expect, it } from 'vitest';
import { showTouchControls } from './touchInput';

describe('showTouchControls', () => {
  it('follows touch detection on Auto', () => {
    expect(showTouchControls('auto', true, true)).toBe(true);
    expect(showTouchControls('auto', true, false)).toBe(true);
    expect(showTouchControls('auto', false, true)).toBe(false);
  });

  it('is forced on by a pinned Touch, even where no touch is detected', () => {
    expect(showTouchControls('touch', false, true)).toBe(true);
    expect(showTouchControls('touch', true, false)).toBe(true);
  });

  it('is off when pinned to Keyboard or Gamepad where a mouse is there instead (a hybrid laptop)', () => {
    expect(showTouchControls('keyboard', true, true)).toBe(false);
    expect(showTouchControls('gamepad', true, true)).toBe(false);
  });

  it('never leaves a touch-only device without its controls, whatever is pinned', () => {
    expect(showTouchControls('keyboard', true, false)).toBe(true);
    expect(showTouchControls('gamepad', true, false)).toBe(true);
  });
});
