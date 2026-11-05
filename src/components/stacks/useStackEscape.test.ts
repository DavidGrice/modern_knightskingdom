import { describe, expect, it, vi } from 'vitest';
import { stackEscapeHandler } from './useStackEscape';
import { holdRebindListening } from '@/game/data/keybinds';

const key = (code: string, more: { repeat?: boolean; defaultPrevented?: boolean } = {}) =>
  ({ code, repeat: false, defaultPrevented: false, ...more });

describe('stackEscapeHandler', () => {
  it('pops on Escape', () => {
    const pop = vi.fn();
    stackEscapeHandler(pop)(key('Escape'));
    expect(pop).toHaveBeenCalledTimes(1);
  });

  it('ignores every other key', () => {
    const pop = vi.fn();
    for (const code of ['Enter', 'Backspace', 'KeyQ', 'KeyH']) stackEscapeHandler(pop)(key(code));
    expect(pop).not.toHaveBeenCalled();
  });

  it('does not pop while a key or pad rebind is listening: that Escape cancels the rebind', () => {
    const pop = vi.fn();
    const release = holdRebindListening();
    stackEscapeHandler(pop)(key('Escape'));
    expect(pop).not.toHaveBeenCalled();
    release();
    stackEscapeHandler(pop)(key('Escape'));
    expect(pop).toHaveBeenCalledTimes(1);
  });

  // a click on a second row's cap is not a keydown, so two rows can listen at once
  it('does not pop while a second row still listens after the first stops', () => {
    const pop = vi.fn();
    const releaseForward = holdRebindListening();
    const releaseBack = holdRebindListening();
    releaseForward();
    releaseForward(); // a cleanup run twice still counts once
    stackEscapeHandler(pop)(key('Escape'));
    expect(pop).not.toHaveBeenCalled();
    releaseBack();
    stackEscapeHandler(pop)(key('Escape'));
    expect(pop).toHaveBeenCalledTimes(1);
  });

  it('does not pop on an Escape a rebind row has already taken, nor on a held key\'s repeats', () => {
    const pop = vi.fn();
    stackEscapeHandler(pop)(key('Escape', { defaultPrevented: true }));
    stackEscapeHandler(pop)(key('Escape', { repeat: true }));
    expect(pop).not.toHaveBeenCalled();
  });
});
