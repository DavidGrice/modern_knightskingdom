// The one gate for every pointer-lock call in the game.
//
// Chrome implements pointer lock by warping the OS cursor to the window centre and, on release, back
// to where it was. On Windows that happens even for a headless (`--headless=new`) or off-screen
// window, so any Playwright/Puppeteer/Selenium run that clicks the canvas or opens and closes a panel
// drags the developer's REAL mouse pointer around the desktop, whatever launch flags it used.
//
// A browser judged to be automated therefore never takes the real lock. It gets a virtual one instead
// that flips the same state gameplay reads (mouse-look, and the "first click locks, later clicks
// swing" attack gate) and fires the same `pointerlockchange`, so scripted play behaves as it always
// did but the OS cursor is never touched. A normal player's path below is the original code, unchanged.
//
// "Automated" means, in order: an explicit `?pointerlock=virtual|real` URL flag (remembered for the tab
// in sessionStorage) wins; otherwise `navigator.webdriver === true` or a `HeadlessChrome` user agent.
// The flag exists because `webdriver` is NOT universal: a harness launched with
// `--disable-blink-features=AutomationControlled` (Playwright's own CLI / MCP browser does this), a
// stealth plugin, or a manually started Chrome attached over CDP reports it false — those runs must
// append `?pointerlock=virtual`. `?pointerlock=real` gives a human hand-playing in an automated window
// real mouse-look back.
//
// Imports only the zero-import lib/debugHooks: a leaf, safe to use from anywhere.

import { exposeDebug } from '@/lib/debugHooks';

type Mode = 'virtual' | 'real';
const STORAGE_KEY = 'kk:pointerlock';

let mode: Mode | null = null;
let virtualLocked = false;

function resolveMode(): Mode {
  try {
    const q = new URLSearchParams(window.location.search).get('pointerlock');
    if (q === 'virtual' || q === 'real') {
      try { window.sessionStorage.setItem(STORAGE_KEY, q); } catch { /* storage blocked: the URL flag still applies now */ }
      return q;
    }
    const s = window.sessionStorage.getItem(STORAGE_KEY);
    if (s === 'virtual' || s === 'real') return s;
  } catch { /* URL or storage unavailable: fall through to detection */ }
  return navigator.webdriver === true || /HeadlessChrome/i.test(navigator.userAgent) ? 'virtual' : 'real';
}

/** Is the game under automation, i.e. must it avoid the real pointer lock? */
export function isAutomated(): boolean {
  if (typeof window === 'undefined') return false;
  if (mode === null) mode = resolveMode();
  return mode === 'virtual';
}

/** Does the game currently hold the pointer? (the real lock for a player, the virtual one under automation) */
export function pointerLockActive(el: Element): boolean {
  return isAutomated() ? virtualLocked : document.pointerLockElement === el;
}

// Bubbles like the real event. Note the virtual one is dispatched synchronously, inside the caller,
// where the real one arrives a task later — the only listener today just writes a ref, so it is harmless.
const changed = () => document.dispatchEvent(new Event('pointerlockchange', { bubbles: true }));

/** Ask for the pointer. Under automation this only flips the virtual lock. */
export function requestGameLock(el: HTMLElement): void {
  if (isAutomated()) {
    if (!virtualLocked) {
      virtualLocked = true;
      changed();
    }
    return;
  }
  const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
  // a rejection is the browser's post-Esc cooldown; let it go rather than hammering
  if (r && typeof r.catch === 'function') r.catch(() => {});
}

/** Give the pointer back (a no-op when the game does not hold it). */
export function releaseGameLock(): void {
  if (isAutomated()) {
    if (virtualLocked) {
      virtualLocked = false;
      changed();
    }
    return;
  }
  if (document.pointerLockElement) document.exitPointerLock();
}

// Test handle: `active` is what scripts should assert on — `document.pointerLockElement` is always null
// under automation because the lock is virtual there.
exposeDebug('__kkpointerlock', {
  get automated() { return isAutomated(); },
  get active() { return isAutomated() ? virtualLocked : document.pointerLockElement != null; },
});
