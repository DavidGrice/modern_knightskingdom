import { describe, expect, it } from 'vitest';
import { helpSteps } from './HelpStack';
import { DEFAULT_KEYBINDS } from '@/game/data/keybinds';
import { DEFAULT_GAMEPAD_BUTTONS } from '@/game/data/gamepadInput';

const text = (...a: Parameters<typeof helpSteps>) => helpSteps(...a).map((s) => s.body).join('\n');
const DEFAULTS = { keybinds: DEFAULT_KEYBINDS, gamepadButtons: DEFAULT_GAMEPAD_BUTTONS };

describe('helpSteps', () => {
  it('gathers with a held left-click on keyboard, not E', () => {
    const t = text(DEFAULTS, 'keyboard');
    expect(t).toContain('herb patch and hold left-click');
    expect(t).not.toMatch(/hold E\b/);
    expect(t).toContain('press E near them to talk');
    expect(t).toContain('WASD walks');
    expect(t).toContain('shield to block (RMB); Q cycles');
  });

  it('names the player\'s rebinds', () => {
    const t = text({ ...DEFAULTS, keybinds: { ...DEFAULT_KEYBINDS, interact: 'KeyZ', craft: 'KeyY', swapWeapon: 'Tab' } }, 'keyboard');
    expect(t).toContain('press Z near them to talk');
    expect(t).toContain('Press Y to open Crafting');
    expect(t).toContain('Tab cycles');
  });

  it('names the pad\'s controls on a gamepad and the on-screen ones on touch', () => {
    const pad = text({ ...DEFAULTS, gamepadButtons: { ...DEFAULT_GAMEPAD_BUTTONS, interact: 1 } }, 'gamepad');
    expect(pad).toContain('herb patch and hold B');
    expect(pad).toContain('press B near them to talk');
    expect(pad).toContain('shield to block (LT)');
    const touch = text(DEFAULTS, 'touch');
    expect(touch).toContain('herb patch and hold E');
    expect(touch).toContain('shield to block (🛡)');
  });
});
