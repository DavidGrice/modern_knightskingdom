'use client';
import { useEffect } from 'react';
import { isRebindListening } from '@/game/data/keybinds';

/** F-10b · Escape closes a stack screen (Options, Credits, How to Play), as Back does. Not while a rebind row is
 *  listening — its own Escape cancels the rebind, and calls preventDefault, which also covers a row whose listener
 *  ran first and has already stopped listening — and not on a held key's repeats, so a held Escape closes one screen,
 *  not one and then the next. (Back in the game, GameScreen's own Escape still toggles pause on every repeat: ROADMAP
 *  logs it.) */
export function stackEscapeHandler(pop: () => void) {
  return (e: Pick<KeyboardEvent, 'code' | 'repeat' | 'defaultPrevented'>) => {
    if (e.code !== 'Escape' || e.repeat || e.defaultPrevented || isRebindListening()) return;
    pop();
  };
}

export function useStackEscape(pop: () => void) {
  useEffect(() => {
    const onKey = stackEscapeHandler(pop);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pop]);
}
