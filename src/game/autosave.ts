// F-08a · the autosave's timing, and Save & Quit's one decision. A save that fails is never silent: the autosave says
// so (GameScreen.tsx hands the problem to the HUD's save chip) and tries again sooner, backing off while it keeps
// failing so a server that is down is not hammered; Save & Quit leaves for the menu only once the save is written.
//
// ONE timer, re-armed when each try has finished — never an interval: a try that hangs on a slow server can never
// have the next one stacked behind it, and stopping the autosave (unmount, or the world failing — F-06's
// worldFailed, so a frozen world never writes over the last good save) is one clearTimeout plus a flag that keeps a
// try still in flight from arming another.
import type { SaveOutcome } from '@/lib/save';
import { logError } from '@/lib/errorLog';

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

/** Starts the autosave. `save` writes the save if there is anything to write, or answers null when there is not;
 *  `onProblem` hears each change of state — why the save failed, then null once one goes through. */
export function startAutosave(save: () => Promise<SaveOutcome | null>, onProblem: (problem: string | null) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let failures = 0;
  let problem: string | null = null;
  const arm = () => {
    timer = setTimeout(run, autosaveDelay(failures));
  };
  async function run() {
    timer = null;
    let r: SaveOutcome | null;
    try {
      r = await save();
    } catch (e) {
      // the save itself could not be made (toSave threw): logged, and tried again like any other failure
      logError(e, 'autosave');
      r = { ok: false, problem: 'the game could not put it together' };
    }
    if (stopped) return;
    if (r) {
      failures = r.ok ? 0 : failures + 1;
      const now = r.ok ? null : r.problem;
      if (now !== problem) onProblem((problem = now));
    }
    arm();
  }
  arm();
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

/** Save & Quit: `leave` only once `write` has saved. Answers why it did not, for the dialog that offers Retry or
 *  Quit without saving, or null when it left. */
export async function saveAndLeave(write: () => Promise<SaveOutcome>, leave: () => void): Promise<string | null> {
  const r = await write();
  if (!r.ok) return r.problem;
  leave();
  return null;
}
