// Wave 15: standard-mapping Gamepad button indices used OUTSIDE
// PlayerController.tsx's own movement/look poll (pollGamepad there already
// owns axes 0-3 (sticks) and d-pad 12-15 — see that file's header comment for
// the full picture). Centralised here so CombatController's attack/block/
// swap reads, GamepadMenuController's panel/pause/confirm reads, and
// PlayerController's own jump/interact/sprint reads all share ONE source of
// truth instead of re-guessing the same magic numbers in three places.
//
// Wave 33: the first 8 actions below became user-rebindable (see
// appStore.ts's `gamepadButtons` field + OptionsStack.tsx's Gamepad sub-tab)
// — the same default-table + settings-store-override + merge-on-load pattern
// keybinds.ts/appStore.ts already use for the keyboard. At the time, jump/
// interact/sprint stayed out: PlayerController wired them via
// `pad[kb.<action>] = !!gp.buttons[<literal>]`, a literal index with no
// table entry at all, and this file's own header floated two fixes — making
// every keybind polymorphic (code-string OR button-index), or rewriting
// GameScreen.tsx's keydown-EVENT panel switch into a frame-polled one — both
// bigger than the gap actually needed.
//
// Wave 61 (H1): re-examined against the CURRENT pollGamepad, both of those
// options turned out to be solving the wrong layer. `pad` (the record
// pollGamepad/pollTouch/isDown all touch) is keyed by keyboard CODE STRING,
// but only as an arbitrary, consistently-resolved slot name — `pad[kb.jump]`
// is written and `isDown(kb.jump)` is read from the same `kb` object computed
// once per frame, so nothing about WHICH gamepad button triggers the write is
// coupled to that key. So jump/interact/sprint simply join this table as
// three more rebindable actions (a straight copy of the pattern
// CombatController's attack/block/swap/dodge already proved), and
// PlayerController reads `gpBtn.jump/interact/sprint` instead of 0/2/5 —
// zero changes to keybinds.ts, isDown, or the keyboard rebinding system.
// `confirm` also joins here in the same wave, for GamepadMenuController's new
// in-panel roving-focus system (see that file) — A confirms/activates
// whatever panel element focus is currently on, exactly like Enter does for
// a keyboard Tab-focused element.
//
// D-pad movement (and the left stick) stay hardcoded, on purpose: rebinding a
// 4-way spatial control one direction at a time destroys the only reason it
// exists, and the stick is already the primary, fully-analog movement input
// — the d-pad is a redundant fallback for it, not an independent action.
// RESERVED_GAMEPAD_BUTTONS below is exactly those still-untouchable indices,
// refused as a rebind target so a player can't accidentally steal the d-pad
// away from movement.
export type GamepadAction =
  | 'attack' | 'block' | 'swapWeapon' | 'dodge'
  | 'pause' | 'cancel' | 'menuInventory' | 'menuCrafting' | 'menuQuests'
  | 'jump' | 'interact' | 'sprint' | 'confirm';

export const DEFAULT_GAMEPAD_BUTTONS: Record<GamepadAction, number> = {
  // combat — mirrors the mouse's own double duty (LMB/RMB) 1:1, read by
  // CombatController.tsx exactly like touchState.attack/block already are
  attack: 7, // RT — hold to draw a bow, tap to fire a bolt/swing melee
  block: 6, // LT — aim a readied ranged weapon, else raise a shield
  swapWeapon: 3, // Y — mirrors keyboard Q (GameScreen.tsx's cycleWeapon())
  // Wave 40 (A6) · the only standard-mapping button left unclaimed by either
  // this table or PlayerController's own RESERVED_GAMEPAD_BUTTONS below.
  dodge: 11, // R-Stick Click

  // menu nav (GamepadMenuController.tsx) — open/close plus (Wave 61) a real
  // in-panel roving focus; see that file's header comment.
  pause: 9, // Start — mirrors Escape's close-panel/exit-build/pause cascade
  cancel: 1, // B — closes whatever panel is open
  menuInventory: 4, // LB
  menuCrafting: 8, // Back/Select
  menuQuests: 10, // Left stick click
  confirm: 0, // Wave 61 · A — activates whatever panel element has focus

  // Wave 61 (H1) · previously PlayerController's own hardcoded literals
  // (still the defaults here, so an un-rebound pad behaves identically).
  jump: 0, // A — same button as `confirm` by default, deliberately: jump is
  // disabled the instant a panel is open (PlayerController freezes while
  // `st.panel !== 'none'`), the only time `confirm` ever reads, so the two
  // never actually contend. Matches this table's own existing, unenforced
  // precedent for two actions sharing a button.
  interact: 2, // X (held, matches "Hold E")
  sprint: 5, // RB
} as const;

/** Still genuinely untouchable: the d-pad, wired unconditionally into
 *  PlayerController's movement poll (see that file's pollGamepad) and
 *  deliberately never made an independent, rebindable action (see this
 *  file's header comment for why). */
export const RESERVED_GAMEPAD_BUTTONS = new Set([12, 13, 14, 15]);

/** grouped for the Options > Keybinds > Gamepad sub-tab, same shape/ordering
 *  convention as keybinds.ts's KEYBIND_GROUPS */
export const GAMEPAD_ACTION_GROUPS: { label: string; actions: { id: GamepadAction; label: string }[] }[] = [
  {
    // Wave 61 (H1) · jump/interact/sprint join the rebind table for the first
    // time — movement (stick + d-pad) itself stays fixed, see this file's
    // header comment for why.
    label: 'Movement',
    actions: [
      { id: 'jump', label: 'Jump' },
      { id: 'interact', label: 'Interact / Hold to Gather' },
      { id: 'sprint', label: 'Sprint' },
    ],
  },
  {
    label: 'Combat',
    actions: [
      { id: 'attack', label: 'Attack / Draw Bow' },
      { id: 'block', label: 'Block / Aim' },
      { id: 'swapWeapon', label: 'Swap Weapon' },
      { id: 'dodge', label: 'Dodge Roll' },
    ],
  },
  {
    label: 'Menus',
    actions: [
      { id: 'pause', label: 'Pause / Back' },
      { id: 'cancel', label: 'Cancel / Close Panel' },
      { id: 'confirm', label: 'Confirm / Activate (in-panel)' },
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
