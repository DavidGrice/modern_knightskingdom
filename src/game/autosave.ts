// F-08a · the autosave's timing, and Save & Quit's one decision. A save that fails is never silent: the autosave says
// so (GameScreen.tsx hands the problem to the HUD's save chip) and tries again sooner, backing off while it keeps
// failing so a server that is down is not hammered; Save & Quit leaves for the menu only once the save is written.
//
// ONE timer, re-armed when each try has finished — never an interval: a try that hangs on a slow server can never
// have the next one stacked behind it, and stopping the autosave (unmount, or the world failing — F-06's
// worldFailed, so a frozen world never writes over the last good save) is one clearTimeout plus a flag that keeps a
// try still in flight from arming another.
//
// F-08b · how many tries in a row have failed, and why the last did, are module state — not the game screen's, which
// the pause menu's Options and Help replace (App.tsx draws one screen at a time): back in the game, the chip is still
// up and the backoff goes on where it was. A session start forgets both, as it does the raid directors' (wave 62.1).
import type { SaveOutcome } from '@/lib/save';
import { logError } from '@/lib/errorLog';
import { onSessionReset } from './store/sessionHooks';

/** how often the autosave looks for anything to save */
export const AUTOSAVE_MS = 20_000;
/** the first try again after a failure, doubled after each failure in a row... */
export const RETRY_FIRST_MS = 5_000;
/** ...up to this */
export const RETRY_MAX_MS = 160_000;

/** how long the autosave waits after `failures` failures in a row (0: none, its usual round) */
export function autosaveDelay(failures: number): number {
  return failures === 0 ? AUTOSAVE_MS : Math.min(RETRY_FIRST_MS * 2 ** (failures - 1), RETRY_MAX_MS);
}

/** why a save failed when the game could not put it together (toSave or its JSON threw) */
export const UNMADE = 'the game could not put it together';

/** the autosave's failures in a row, and why the last one failed (null once one goes through) */
export const autosaveState: { failures: number; problem: string | null } = { failures: 0, problem: null };

export function resetAutosave(): void {
  autosaveState.failures = 0;
  autosaveState.problem = null;
}

onSessionReset(resetAutosave);

/** Starts the autosave. `save` writes the save if there is anything to write, or answers null when there is not;
 *  `onProblem` hears each change of state — why the save failed, then null once one goes through — and, at the start,
 *  a failure still standing from before the game screen was left. */
export function startAutosave(save: () => Promise<SaveOutcome | null>, onProblem: (problem: string | null) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const at = autosaveState;
  const arm = () => {
    timer = setTimeout(run, autosaveDelay(at.failures));
  };
  async function run() {
    timer = null;
    let r: SaveOutcome | null;
    try {
      r = await save();
    } catch (e) {
      // the save itself could not be made (toSave threw): logged, and tried again like any other failure
      logError(e, 'autosave');
      r = { ok: false, problem: UNMADE };
    }
    if (stopped) return;
    if (r) {
      at.failures = r.ok ? 0 : at.failures + 1;
      const now = r.ok ? null : r.problem;
      if (now !== at.problem) onProblem((at.problem = now));
    }
    arm();
  }
  if (at.problem !== null) onProblem(at.problem);
  arm();
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

/** F-08b · calls `flush` as the tab goes out of sight — a phone's app switcher closes a tab from there, with no
 *  pagehide after — or, if it did not go out of sight first, as the page goes (pagehide). Answers the call that stops
 *  listening. */
export function flushOnLeave(flush: () => void): () => void {
  let flushed = false;
  const onVisibility = () => {
    flushed = document.visibilityState === 'hidden';
    if (flushed) flush();
  };
  const onPageHide = () => {
    if (!flushed) flush();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };
}

/** Save & Quit: `leave` only once `write` has saved. Answers why it did not, for the dialog that offers Retry or
 *  Quit without saving, or null when it left. */
export async function saveAndLeave(write: () => Promise<SaveOutcome>, leave: () => void): Promise<string | null> {
  let r: SaveOutcome;
  try {
    r = await write();
  } catch (e) {
    // a save that cannot be put together is a failed save, with its own reason — not a button stuck on "Saving…"
    logError(e, 'save & quit');
    r = { ok: false, problem: UNMADE };
  }
  if (!r.ok) return r.problem;
  leave();
  return null;
}
