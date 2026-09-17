// Wave 61 (H1) · shared keyboard-activation for the onClick-bearing <div>s
// scattered across the panel components (skill-tree nodes, perk-choice rows,
// equip tiles, emote icons, quest-region toggles) that predate this wave's
// panel-navigation pass. A native <button> already fires its onClick on
// Enter/Space once focused; a plain <div onClick=...> does not, so it stayed
// invisible to Tab-focus and completely unreachable by a gamepad (which
// synthesizes no DOM event of its own — GamepadMenuController.tsx's roving
// focus instead calls the real DOM `.click()` on whatever's focused, which
// DOES fire onClick, so the gamepad half needs no extra wiring here).
//
// Pairs with tabIndex={0} on the same element, so it joins
// `.game-panel`'s `button:not(:disabled), [tabindex]:not([tabindex="-1"])`
// roving-focus set. Pass the exact same handler the element's onClick
// already uses — this never duplicates that handler's own gating logic
// (owned/afford/locked checks stay wherever they already lived).
import type { KeyboardEvent } from 'react';

export function onKeyActivate(onActivate: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    onActivate();
  };
}
