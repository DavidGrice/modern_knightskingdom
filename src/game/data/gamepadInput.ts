// Wave 15: standard-mapping Gamepad button indices used OUTSIDE
// PlayerController.tsx's own movement/look poll (pollGamepad there already
// owns buttons 0 (A/jump), 2 (X/interact), 5 (RB/sprint), 12-15 (d-pad) and
// axes 0-3 (sticks) — see that file's header comment for the full picture).
// Centralised here so CombatController's attack/block/swap reads and
// GamepadMenuController's panel/pause reads share ONE source of truth
// instead of two files re-guessing the same magic numbers.
//
// Wave 33: these 8 actions are now user-rebindable (see appStore.ts's
// `gamepadButtons` field + OptionsStack.tsx's Gamepad sub-tab) — the same
// default-table + settings-store-override + merge-on-load pattern
// keybinds.ts/appStore.ts already use for the keyboard. What's still NOT
// rebindable, and stays a deliberate v1 scope cut, is PlayerController's own
// jump/interact/sprint/d-pad-movement: those are wired via `pad[kb.<action>]`
// keyed off whatever CODE keybinds.ts currently maps an action to, not a
// button-index table at all. Folding them in would mean either making every
// keybind polymorphic (code-string OR button-index) or rewriting
// GameScreen.tsx's keydown-EVENT panel switch into a frame-polled one with
// hand-rolled edge detection for all 14 panel actions — a real, separate
// project, not attempted here. RESERVED_GAMEPAD_BUTTONS below is exactly
// those untouchable indices, refused as a rebind target so a player can't
// accidentally steal e.g. "A" away from jump.
export type GamepadAction =
  | 'attack' | 'block' | 'swapWeapon'
  | 'pause' | 'cancel' | 'menuInventory' | 'menuCrafting' | 'menuQuests';

export const DEFAULT_GAMEPAD_BUTTONS: Record<GamepadAction, number> = {
  // combat — mirrors the mouse's own double duty (LMB/RMB) 1:1, read by
  // CombatController.tsx exactly like touchState.attack/block already are
  attack: 7, // RT — hold to draw a bow, tap to fire a bolt/swing melee
  block: 6, // LT — aim a readied ranged weapon, else raise a shield
  swapWeapon: 3, // Y — mirrors keyboard Q (GameScreen.tsx's cycleWeapon())

  // menu nav (GamepadMenuController.tsx) — v1 is OPEN/CLOSE only, no
  // in-panel cursor. See that file's header comment for why.
  pause: 9, // Start — mirrors Escape's close-panel/exit-build/pause cascade
  cancel: 1, // B — closes whatever panel is open
  menuInventory: 4, // LB
  menuCrafting: 8, // Back/Select
  menuQuests: 10, // Left stick click
} as const;

/** PlayerController's own hardcoded indices (jump/interact/sprint/d-pad) —
 *  genuinely wired off a different table (keybinds.ts codes, not this one),
 *  so remapping one of the 8 actions above onto any of these would silently
 *  double-bind a button PlayerController already owns unconditionally. */
export const RESERVED_GAMEPAD_BUTTONS = new Set([0, 2, 5, 12, 13, 14, 15]);

/** grouped for the Options > Keybinds > Gamepad sub-tab, same shape/ordering
 *  convention as keybinds.ts's KEYBIND_GROUPS */
export const GAMEPAD_ACTION_GROUPS: { label: string; actions: { id: GamepadAction; label: string }[] }[] = [
  {
    label: 'Combat',
    actions: [
      { id: 'attack', label: 'Attack / Draw Bow' },
      { id: 'block', label: 'Block / Aim' },
      { id: 'swapWeapon', label: 'Swap Weapon' },
    ],
  },
  {
    label: 'Menus',
    actions: [
      { id: 'pause', label: 'Pause / Back' },
      { id: 'cancel', label: 'Cancel / Close Panel' },
      { id: 'menuInventory', label: 'Equipment & Satchel' },
      { id: 'menuCrafting', label: 'Crafting' },
      { id: 'menuQuests', label: 'Quest Log' },
    ],
  },
];

/** a short, readable label for a standard-mapping button index, for the
 *  rebind UI — mirrors keybinds.ts's codeLabel() role for KeyboardEvent.code */
const BUTTON_LABELS: Record<number, string> = {
  0: 'A', 1: 'B', 2: 'X', 3: 'Y',
  4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
  8: 'Back', 9: 'Start',
  10: 'L-Stick Click', 11: 'R-Stick Click',
  12: 'D-Pad Up', 13: 'D-Pad Down', 14: 'D-Pad Left', 15: 'D-Pad Right',
  16: 'Guide',
};
export function gamepadButtonLabel(index: number): string {
  return BUTTON_LABELS[index] ?? `Button ${index}`;
}
