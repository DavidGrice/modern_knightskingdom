// F-06 · the error log: the last 20 errors the page met, with their stacks, kept in localStorage so that they outlive
// the tab that met them, and live on `window.__kkerrors` (newest last) for the probes. It takes what reaches the window
// uncaught (`error`: a throw in a frame of the world lands here, from requestAnimationFrame; `unhandledrejection`) and
// what the error boundaries catch (components/ui/ErrorBoundary.tsx, app/error.tsx), which never reaches the window.
// The same error again, back to back (a frame that throws every frame), is counted on its entry instead of filling the
// log. Store-free, like debugHooks: anything may log into it.
import { exposeDebug } from './debugHooks';

export interface ErrorEntry {
  /** when it was last met (ISO) */
  at: string;
  /** where it was met: 'error' / 'rejection' (the window's listeners), or the boundary that caught it */
  kind: string;
  message: string;
  stack: string;
  /** how many times it was met back to back */
  count: number;
}

const KEY = 'kk_errors';
export const ERROR_LOG_SIZE = 20;
const STACK_LENGTH = 2000;

function stored(): ErrorEntry[] {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(-ERROR_LOG_SIZE) : [];
  } catch {
    return [];
  }
}

/** the log itself, newest last (the live array: `__kkerrors`) */
export const errorLog: ErrorEntry[] = stored();
exposeDebug('__kkerrors', errorLog);

export function logError(error: unknown, kind: string, extraStack = ''): void {
  const e = error instanceof Error ? error : null;
  const message = e ? `${e.name}: ${e.message}` : String(error);
  const stack = ((e?.stack ?? '') + extraStack).slice(0, STACK_LENGTH);
  const last = errorLog[errorLog.length - 1];
  const at = new Date().toISOString();
  if (last && last.kind === kind && last.message === message && last.stack === stack) {
    last.count++;
    last.at = at;
  } else {
    errorLog.push({ at, kind, message, stack, count: 1 });
    if (errorLog.length > ERROR_LOG_SIZE) errorLog.splice(0, errorLog.length - ERROR_LOG_SIZE);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(errorLog));
  } catch {
    // no storage (private mode, full): the log lives on in the page
  }
}

let installed = false;

/** listen for what reaches the window uncaught — once a page, from App */
export function installErrorLog(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (ev) => logError(ev.error ?? ev.message, 'error'));
  window.addEventListener('unhandledrejection', (ev) => logError(ev.reason, 'rejection'));
}
