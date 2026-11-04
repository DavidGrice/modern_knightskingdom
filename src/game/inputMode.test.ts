import { describe, expect, it } from 'vitest';
import { attackLabel, blockLabel, clickHoldLabel, interactLabel, splitPrompt } from './inputMode';
import { DEFAULT_KEYBINDS } from './data/keybinds';
import { DEFAULT_GAMEPAD_BUTTONS } from './data/gamepadInput';

const DEFAULTS = { keybinds: DEFAULT_KEYBINDS, gamepadButtons: DEFAULT_GAMEPAD_BUTTONS };
const REBOUND = { keybinds: { ...DEFAULT_KEYBINDS, interact: 'KeyZ' }, gamepadButtons: { ...DEFAULT_GAMEPAD_BUTTONS, interact: 1, attack: 5, block: 4 } };

describe('interactLabel', () => {
  it('names the default binding on each device', () => {
    expect(interactLabel('keyboard', DEFAULTS)).toBe('E');
    expect(interactLabel('gamepad', DEFAULTS)).toBe('X');
    expect(interactLabel('touch', DEFAULTS)).toBe('E');
  });

  it('follows a rebind on keyboard and gamepad; touch\'s on-screen button is always E', () => {
    expect(interactLabel('keyboard', REBOUND)).toBe('Z');
    expect(interactLabel('gamepad', REBOUND)).toBe('B');
    expect(interactLabel('touch', REBOUND)).toBe('E');
  });
});

describe('clickHoldLabel', () => {
  it('is a held click on keyboard/mouse, else the device\'s interact control', () => {
    expect(clickHoldLabel('keyboard', REBOUND)).toBe('Click');
    expect(clickHoldLabel('gamepad', REBOUND)).toBe('B');
    expect(clickHoldLabel('touch', REBOUND)).toBe('E');
  });
});

describe('attackLabel / blockLabel', () => {
  it('name the mouse buttons, the pad\'s own bindings, or the touch glyphs', () => {
    expect([attackLabel('keyboard', REBOUND), blockLabel('keyboard', REBOUND)]).toEqual(['LMB', 'RMB']);
    expect([attackLabel('gamepad', DEFAULTS), blockLabel('gamepad', DEFAULTS)]).toEqual(['RT', 'LT']);
    expect([attackLabel('gamepad', REBOUND), blockLabel('gamepad', REBOUND)]).toEqual(['RB', 'LB']);
    expect([attackLabel('touch', REBOUND), blockLabel('touch', REBOUND)]).toEqual(['⚔', '🛡']);
  });
});

describe('splitPrompt', () => {
  it('reads a held and a tap prompt back into key and verb', () => {
    expect(splitPrompt('Hold Click — Chop the oak')).toEqual({ held: true, key: 'Click', verb: 'Chop the oak' });
    expect(splitPrompt('Z — Talk to King Leo')).toEqual({ held: false, key: 'Z', verb: 'Talk to King Leo' });
  });

  it('keeps a two-word key whole', () => {
    expect(splitPrompt('Hold L-Stick Click — Chop the oak')).toEqual({ held: true, key: 'L-Stick Click', verb: 'Chop the oak' });
    expect(splitPrompt('Up Arrow — Talk to King Leo')).toEqual({ held: false, key: 'Up Arrow', verb: 'Talk to King Leo' });
    expect(splitPrompt('Caps Lock — Open the gate')).toEqual({ held: false, key: 'Caps Lock', verb: 'Open the gate' });
  });

  it('gives a prompt with no key as a bare verb', () => {
    expect(splitPrompt('Oak grove — needs the Woodsman deed')).toEqual({ held: false, key: null, verb: 'Oak grove — needs the Woodsman deed' });
    expect(splitPrompt('')).toEqual({ held: false, key: null, verb: '' });
  });
});
