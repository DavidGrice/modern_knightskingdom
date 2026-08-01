// Requested 2026-07-31: suggest a sensible default quality tier for a
// brand-new install, instead of always defaulting to the heaviest tier
// regardless of device. A one-shot heuristic, not a benchmark — called
// exactly once, only when `appStore.ts`'s `loadSettings()` finds no saved
// settings at all, and never re-run or used to override a returning player's
// own choice.
//
// Deliberately reuses `detectTouch()` (touchInput.ts) rather than a second
// `matchMedia('(pointer:coarse)')` check — one signal, one place. No
// WebGL-renderer-string sniff (WEBGL_debug_renderer_info): many browsers
// restrict or spoof it for fingerprinting reasons, and it costs a throwaway
// canvas just for marginal signal on a suggestion that's only ever shown
// once and immediately overridable in Options.
import { detectTouch } from './touchInput';
import type { GraphicsQuality } from './store/appStore';

export function suggestGraphicsQuality(): GraphicsQuality {
  if (typeof window === 'undefined') return 'balanced';
  const touch = detectTouch();
  const cores = navigator.hardwareConcurrency ?? 4;
  // deviceMemory (GB) is Chrome/Edge-only — undefined elsewhere is "no
  // signal", never treated as "weak"
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const weakCores = cores <= 4;
  const weakMem = mem !== undefined && mem <= 4;
  if (weakCores && weakMem) return 'performance';
  if (touch && (weakCores || weakMem)) return 'performance';
  if (touch || weakCores || weakMem) return 'balanced';
  return 'ultra';
}
