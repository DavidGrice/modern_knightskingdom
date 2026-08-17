// Wave 15: standard-mapping Gamepad button indices used OUTSIDE
// PlayerController.tsx's own movement/look poll (pollGamepad there already
// owns buttons 0 (A/jump), 2 (X/interact), 5 (RB/sprint), 12-15 (d-pad) and
// axes 0-3 (sticks) — see that file's header comment for the full picture).
// Centralised here so CombatController's attack/block/swap reads and
// GamepadMenuController's panel/pause reads share ONE source of truth
// instead of two files re-guessing the same magic numbers.
//
// NOT user-rebindable (a deliberate v1 scope cut, not an oversight):
// keybinds.ts's DEFAULT_KEYBINDS values are literally KeyboardEvent.code
// strings, consumed by both a keydown-EVENT switch (GameScreen.tsx) and a
// held-state poll (isDown()/pollGamepad writing into the same `pad` record).
// Folding gamepad buttons into that one table would mean either making every
// bind polymorphic (code-string OR button-index) or rewriting the panel
// switch into a frame-polled one with hand-rolled edge detection for all 14
// panel actions — a real, separate project. A hardcoded table is the honest
// v1 here; rebinding it is a fair future [TODO].
export const GAMEPAD_BUTTONS = {
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
