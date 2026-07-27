'use client';
import { create } from 'zustand';
import type { ScreenName } from '../types';
import { DEFAULT_KEYBINDS } from '../data/keybinds';

export interface SessionUser {
  id: string;
  username: string;
}

export type GraphicsQuality = 'low' | 'medium' | 'high';

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
  colorblindMode: boolean;
  uiTheme: UiTheme;
  keybinds: Record<string, string>;
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
  graphicsQuality: 'high',
  colorblindMode: false,
  uiTheme: 'glass',
  keybinds: DEFAULT_KEYBINDS,
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = JSON.parse(localStorage.getItem('kk_settings') || '{}');
    // merge keybinds by action so a save from before a new action existed
    // (or before rebinding shipped at all) still has every key bound
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      keybinds: { ...DEFAULT_KEYBINDS, ...(saved.keybinds ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
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
}));

export const currentScreen = (s: AppState) => s.screens[s.screens.length - 1];
