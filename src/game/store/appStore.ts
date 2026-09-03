'use client';
import { create } from 'zustand';
import type { ScreenName } from '../types';
import { DEFAULT_KEYBINDS } from '../data/keybinds';
import { DEFAULT_GAMEPAD_BUTTONS, type GamepadAction } from '../data/gamepadInput';
import { suggestGraphicsQuality } from '../deviceProfile';
import type { AaMode } from '../aaModes';
import type { InputDevice } from '../inputMode';

export interface SessionUser {
  id: string;
  username: string;
}

// Requested 2026-07-31: a real Performance <-> Ultra spectrum (see
// graphicsProfiles.ts for what each tier actually controls), replacing the
// old low/medium/high tiers that only ever scaled Canvas `dpr`.
export type GraphicsQuality = 'performance' | 'balanced' | 'ultra';

/** The four approved surface treatments from the UI handoff pack ("lanes").
 *  Same metrics throughout — only the surface changes — so swapping one never
 *  reflows a panel. `glass` is the core theme: the world renders BRIGHT
 *  (saturated green terrain, pale sky), and an opaque near-black panel reads
 *  as a hole punched in it, which is exactly what Aero Glass is for. */
export type UiTheme = 'metal' | 'chrome' | 'glass' | 'leather';

export const UI_THEMES: { id: UiTheme; label: string; blurb: string }[] = [
  { id: 'glass', label: 'Aero Glass Realm', blurb: 'Blurred slab, lit top edge — reads best over the bright world.' },
  { id: 'metal', label: 'Metalheart Forge', blurb: 'Clipped steel plate, zero radii, an accent hairline.' },
  { id: 'chrome', label: 'Millennium Chrome', blurb: 'Translucent plastic, hard bevel, a gloss cap.' },
  { id: 'leather', label: 'Guild Leather', blurb: 'Tooled hide, saddle stitch, brass and parchment.' },
];

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  fov: number;
  shadows: boolean;
  showFps: boolean;
  dayLengthMin: number;
  graphicsQuality: GraphicsQuality;
  /** Requested 2026-07-31: real anti-aliasing, orthogonal to the quality
   *  preset — see aaModes.ts and PostProcessing.tsx. */
  aaMode: AaMode;
  /** 1/2/4/8/16 — capped against the real device's own max at the point it's
   *  applied (Terrain.tsx/KeepAssembly.tsx), so a value beyond hardware
   *  support harmlessly clamps rather than erroring. */
  anisotropy: number;
  /** fog/shadow-reach multiplier read by DayNight.tsx, 1 = today's exact
   *  values (base fog 150/460, shadow far 440) */
  viewDistance: number;
  colorblindMode: boolean;
  /** which size the minimap STARTS at each session — the in-game M-key
   *  toggle (Minimap.tsx) still switches live within a session, unchanged */
  minimapDefaultSize: 'small' | 'large';
  uiTheme: UiTheme;
  keybinds: Record<string, string>;
  /** Wave 33: the 8 GAMEPAD_BUTTONS actions (gamepadInput.ts), now
   *  rebindable via Options > Keybinds > Gamepad — same table-of-indices
   *  shape as `keybinds` above, just button indices instead of KeyboardEvent
   *  codes. PlayerController's own jump/interact/sprint/d-pad stay out of
   *  this table entirely (see gamepadInput.ts's header). */
  gamepadButtons: Record<string, number>;
  /** Wave 15: which device's prompt text/glyphs the HUD should show.
   *  'auto' (default) follows whichever device actually produced the last
   *  real input event (game/inputMode.ts's live, NOT persisted, tracker) —
   *  this field only exists for a player who wants to pin it manually (e.g.
   *  a gamepad plugged in but mostly used for combat while they still read
   *  keyboard prompts). Same persistence convention as every field above. */
  inputMode: 'auto' | InputDevice;
}

const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.9,
  mouseSensitivity: 0.5,
  invertY: false,
  fov: 75,
  shadows: true,
  showFps: false,
  dayLengthMin: 12,
  // 'balanced' is deliberately calibrated to match the game's live behavior
  // before the 2026-07-31 quality-tier pass (see graphicsProfiles.ts) — a
  // safe, no-regression anchor for the vast majority of returning players,
  // who are about to be migrated onto it from the old default (see
  // loadSettings()'s legacy remap below).
  graphicsQuality: 'balanced',
  // 'off' — a genuinely optional upgrade. Must not change any existing
  // player's rendering or frame rate the moment this ships.
  aaMode: 'off',
  // matches the most common hardcoded value already in use (Terrain.tsx) —
  // no visible change for anyone until they actually open this setting
  anisotropy: 8,
  viewDistance: 1,
  colorblindMode: false,
  minimapDefaultSize: 'small',
  uiTheme: 'glass',
  keybinds: DEFAULT_KEYBINDS,
  gamepadButtons: DEFAULT_GAMEPAD_BUTTONS,
  inputMode: 'auto',
};

// Requested 2026-07-31: the old low/medium/high tiers are gone (see
// GraphicsQuality above) — an existing save's `graphicsQuality` string needs
// remapping onto the new names rather than surfacing as an invalid value.
// `high -> 'balanced'`, deliberately NOT 'ultra': 'high' was also the OLD
// default, so nearly every returning player's save carries it whether or not
// they ever touched the setting — auto-upgrading everyone into a strictly
// heavier tier on their next launch would be exactly the kind of silent
// override a returning player didn't ask for, and 'balanced' is calibrated
// to match their actual live behavior before this pass anyway, so the remap
// is a real no-op for the common case.
const LEGACY_QUALITY_MAP: Record<string, GraphicsQuality> = {
  low: 'performance',
  medium: 'balanced',
  high: 'balanced',
};
function migrateGraphicsQuality(v: unknown): GraphicsQuality | undefined {
  if (typeof v !== 'string') return undefined;
  if (v === 'performance' || v === 'balanced' || v === 'ultra') return undefined;
  return LEGACY_QUALITY_MAP[v];
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem('kk_settings');
  // genuinely no save at all yet — the ONLY time a device-capability
  // suggestion is allowed to pick the default; never re-suggested on a later
  // load, never overrides anything a returning player already has saved
  const freshInstall = raw === null;
  try {
    const saved = JSON.parse(raw || '{}');
    const migrated = migrateGraphicsQuality(saved.graphicsQuality);
    // merge keybinds by action so a save from before a new action existed
    // (or before rebinding shipped at all) still has every key bound
    return {
      ...DEFAULT_SETTINGS,
      ...(freshInstall ? { graphicsQuality: suggestGraphicsQuality() } : {}),
      ...saved,
      ...(migrated ? { graphicsQuality: migrated } : {}),
      keybinds: { ...DEFAULT_KEYBINDS, ...(saved.keybinds ?? {}) },
      // same merge-by-action reasoning as keybinds above — a save from
      // before gamepad rebinding shipped (or before a given action existed)
      // still has every button bound
      gamepadButtons: { ...DEFAULT_GAMEPAD_BUTTONS, ...(saved.gamepadButtons ?? {}) },
    };
  } catch {
    return {
      ...DEFAULT_SETTINGS,
      ...(freshInstall ? { graphicsQuality: suggestGraphicsQuality() } : {}),
    };
  }
}

interface AppState {
  /** Navigation is a stack of screens: push to open, pop to go back. */
  screens: ScreenName[];
  user: SessionUser | null;
  guest: boolean;
  hasSave: boolean;
  settings: Settings;

  push: (s: ScreenName) => void;
  pop: () => void;
  resetTo: (s: ScreenName) => void;
  setUser: (u: SessionUser | null, hasSave?: boolean) => void;
  setGuest: (g: boolean) => void;
  setHasSave: (v: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setKeybind: (action: string, code: string) => void;
  resetKeybinds: () => void;
  setGamepadButton: (action: GamepadAction, index: number) => void;
  resetGamepadButtons: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  screens: ['auth'],
  user: null,
  guest: false,
  hasSave: false,
  settings: loadSettings(),

  push: (s) => set({ screens: [...get().screens, s] }),
  pop: () => {
    const st = get().screens;
    if (st.length > 1) set({ screens: st.slice(0, -1) });
  },
  resetTo: (s) => set({ screens: [s] }),
  setUser: (user, hasSave = false) => set({ user, hasSave, guest: false }),
  setGuest: (guest) => set({ guest }),
  setHasSave: (hasSave) => set({ hasSave }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    try {
      localStorage.setItem('kk_settings', JSON.stringify(settings));
    } catch {}
  },
  setKeybind: (action, code) => {
    get().updateSettings({ keybinds: { ...get().settings.keybinds, [action]: code } });
  },
  resetKeybinds: () => get().updateSettings({ keybinds: { ...DEFAULT_KEYBINDS } }),
  setGamepadButton: (action, index) => {
    get().updateSettings({ gamepadButtons: { ...get().settings.gamepadButtons, [action]: index } });
  },
  resetGamepadButtons: () => get().updateSettings({ gamepadButtons: { ...DEFAULT_GAMEPAD_BUTTONS } }),
}));

export const currentScreen = (s: AppState) => s.screens[s.screens.length - 1];

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkapp = useAppStore;
}
