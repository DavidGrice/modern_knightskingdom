// Named-action keybind table: every remappable key in the game, pulled out
// of GameScreen.tsx/PlayerController.tsx's hardcoded switch/keys.current
// checks into one place a Settings screen can rebind (see OptionsStack.tsx).
// Escape (pause/back) stays hardcoded — it's universal, not a gameplay bind.

export interface KeybindGroup {
  label: string;
  actions: { id: string; label: string }[];
}

export const KEYBIND_GROUPS: KeybindGroup[] = [
  {
    label: 'Movement',
    actions: [
      { id: 'moveForward', label: 'Move Forward' },
      { id: 'moveBack', label: 'Move Back' },
      { id: 'moveLeft', label: 'Move Left' },
      { id: 'moveRight', label: 'Move Right' },
      { id: 'sprint', label: 'Sprint' },
      { id: 'jump', label: 'Jump' },
      { id: 'lookLeft', label: 'Look Left' },
      { id: 'lookRight', label: 'Look Right' },
      { id: 'lookUp', label: 'Look Up' },
      { id: 'lookDown', label: 'Look Down' },
    ],
  },
  {
    label: 'Actions',
    actions: [
      { id: 'interact', label: 'Interact / Hold to Gather' },
      { id: 'swapWeapon', label: 'Swap Weapon' },
    ],
  },
  {
    label: 'Panels',
    actions: [
      { id: 'inventory', label: 'Equipment & Satchel' },
      { id: 'craft', label: 'Crafting' },
      { id: 'quests', label: 'Quest Log' },
      { id: 'skills', label: 'Abilities' },
      { id: 'build', label: 'Build Mode' },
      { id: 'camera', label: 'Toggle Camera' },
      { id: 'emotes', label: 'Emote Wheel' },
      { id: 'roster', label: 'Homestead Roster' },
      { id: 'tactics', label: 'Defender Orders' },
      { id: 'lore', label: 'The Chronicle' },
      { id: 'bestiary', label: 'Collection Book' },
      { id: 'scan', label: 'Record Target' },
      { id: 'photoMode', label: 'Photo Mode' },
      { id: 'help', label: 'How to Play' },
    ],
  },
];

export const DEFAULT_KEYBINDS: Record<string, string> = {
  moveForward: 'KeyW',
  moveBack: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  sprint: 'ShiftLeft',
  jump: 'Space',
  lookLeft: 'ArrowLeft',
  lookRight: 'ArrowRight',
  lookUp: 'ArrowUp',
  lookDown: 'ArrowDown',
  interact: 'KeyE',
  swapWeapon: 'KeyQ',
  inventory: 'KeyI',
  craft: 'KeyC',
  quests: 'KeyJ',
  skills: 'KeyK',
  build: 'KeyB',
  camera: 'KeyV',
  emotes: 'KeyG',
  roster: 'KeyN',
  tactics: 'KeyT',
  lore: 'KeyL',
  bestiary: 'KeyG',
  scan: 'KeyF',
  photoMode: 'KeyP',
  help: 'KeyH',
};

// While the Options screen is capturing the next keypress for a rebind, the
// game's own global hotkey listener (GameScreen.tsx) must ignore that same
// keystroke — otherwise rebinding "Interact" to E would also open/close
// whatever E used to do, the instant you press it.
export const rebindState = { listening: false };
export function isRebindListening(): boolean {
  return rebindState.listening;
}

/** a short, readable label for a KeyboardEvent.code, for the rebind UI */
export function codeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return `${code.slice(5)} Arrow`;
  const named: Record<string, string> = {
    Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift',
    ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', AltRight: 'R-Alt',
    Tab: 'Tab', CapsLock: 'Caps Lock',
  };
  return named[code] ?? code;
}
