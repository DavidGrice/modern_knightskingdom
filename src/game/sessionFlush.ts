// F-08b · the tab-close flush and the crash recovery writer, for as long as a game is on the screen stack — not for as
// long as the game screen is mounted: the pause menu's Options and Stats and the Help key push a screen of their own in
// its place (App.tsx draws one screen at a time), and a tab closed from there must still be written. GameScreen starts
// it as it mounts (a start while it runs does nothing); it ends as the game leaves the stack (Save & Quit, Quit without
// saving) or the world fails (F-06's worldFailed, so a frozen world never writes over the last good save).
import { flushSave, writeRecoverySave } from '@/lib/save';
import { setRecoveryWriter } from '@/lib/recovery';
import { logError } from '@/lib/errorLog';
import { flushOnLeave } from './autosave';
import { useAppStore } from './store/appStore';
import { useGameStore } from './store/gameStore';

/** the signed-in player's id, or null for a guest: whose shadow copy and recovery slot (lib/save.ts) */
function account(): string | null {
  const app = useAppStore.getState();
  return app.guest ? null : app.user?.id ?? null;
}

// written at once, whatever has changed — the clock with it, which no longer marks the save dirty (OD-12). A guest's
// is the save itself; a signed-in player's a shadow copy and a beacon (lib/save.ts's flushSave)
function flush() {
  const st = useGameStore.getState();
  if (!st.character) return;
  try {
    const mark = st.saveMark();
    const guest = useAppStore.getState().guest;
    if (flushSave(st.toSave(), guest, account()).kept && guest) st.markSaved(mark);
  } catch (e) {
    logError(e, 'flush');
  }
}

// a crash a boundary catches leaves the game as it was in the recovery slot, which the menu offers back
function writeRecovery() {
  const st = useGameStore.getState();
  if (st.character) writeRecoverySave(st.toSave(), account());
}

let stop: (() => void) | null = null;

export function startSessionFlush(): void {
  if (stop) return;
  const stopFlush = flushOnLeave(flush);
  setRecoveryWriter(writeRecovery);
  const unsubscribe = useAppStore.subscribe((s) => {
    if (!s.screens.includes('game')) stopSessionFlush();
  });
  stop = () => {
    stopFlush();
    unsubscribe();
    setRecoveryWriter(() => {});
  };
}

export function stopSessionFlush(): void {
  stop?.();
  stop = null;
}
