import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYBINDS, KEYBIND_GROUPS, keybindConflicts, mergeStoredKeybinds, movementLabel } from './keybinds';

// the map every settings change stored before F-10a: the whole table, the Collection Book on the emote wheel's key
const SHIPPED = { ...DEFAULT_KEYBINDS, bestiary: 'KeyG' };

describe('DEFAULT_KEYBINDS', () => {
  // the hotkey switch (GameScreen.tsx) obeys the first action bound to a code, so a shared default is a dead key
  it('gives every play-mode action a code of its own', () => {
    const codes = Object.values(DEFAULT_KEYBINDS);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('binds every action the Options screen lists, and nothing else', () => {
    expect(KEYBIND_GROUPS.flatMap((g) => g.actions.map((a) => a.id)).sort()).toEqual(Object.keys(DEFAULT_KEYBINDS).sort());
  });
});

describe('mergeStoredKeybinds', () => {
  it('fills a missing or partial map from the defaults', () => {
    expect(mergeStoredKeybinds(undefined)).toEqual(DEFAULT_KEYBINDS);
    expect(mergeStoredKeybinds({ interact: 'KeyZ' })).toEqual({ ...DEFAULT_KEYBINDS, interact: 'KeyZ' });
  });

  it('splits the shipped collision: the Collection Book takes its new default, the emote wheel keeps G', () => {
    const kb = mergeStoredKeybinds(SHIPPED);
    expect(kb.emotes).toBe('KeyG');
    expect(kb.bestiary).toBe(DEFAULT_KEYBINDS.bestiary);
    expect(kb).toEqual(DEFAULT_KEYBINDS);
  });

  it('splits it the same with the player\'s other rebinds kept', () => {
    expect(mergeStoredKeybinds({ ...SHIPPED, interact: 'KeyZ', lore: 'KeyY' })).toEqual({ ...DEFAULT_KEYBINDS, interact: 'KeyZ', lore: 'KeyY' });
  });

  it('keeps a deliberate rebind of either action', () => {
    // the emote wheel moved off G: the Collection Book works on G and stays there
    expect(mergeStoredKeybinds({ ...SHIPPED, emotes: 'KeyX' })).toEqual({ ...SHIPPED, emotes: 'KeyX' });
    // the Collection Book moved off G by hand
    expect(mergeStoredKeybinds({ ...SHIPPED, bestiary: 'KeyM' })).toEqual({ ...SHIPPED, bestiary: 'KeyM' });
  });

  it('leaves the collision alone when the new default is already some other action\'s key', () => {
    const taken = { ...SHIPPED, lore: DEFAULT_KEYBINDS.bestiary };
    expect(mergeStoredKeybinds(taken)).toEqual(taken);
  });
});

describe('keybindConflicts', () => {
  it('names the other actions on the same code, and nothing for a key of its own', () => {
    expect(keybindConflicts(SHIPPED, 'bestiary')).toEqual(['Emote Wheel']);
    expect(keybindConflicts(SHIPPED, 'emotes')).toEqual(['Collection Book']);
    expect(keybindConflicts(DEFAULT_KEYBINDS, 'bestiary')).toEqual([]);
    expect(keybindConflicts({ ...DEFAULT_KEYBINDS, interact: 'KeyQ' }, 'interact')).toEqual(['Swap Weapon']);
  });
});

describe('movementLabel', () => {
  it('reads WASD, or the keys one by one once one is longer than a letter', () => {
    expect(movementLabel(DEFAULT_KEYBINDS)).toBe('WASD');
    expect(movementLabel({ ...DEFAULT_KEYBINDS, moveForward: 'ArrowUp' })).toBe('Up Arrow/A/S/D');
  });
});
