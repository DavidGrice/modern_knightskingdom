// CLN-09 · what makes a save loadable, checked the same way wherever a save crosses a boundary: the server before it
// writes one to disk and when it reads one back (api/save, lib/server/db.ts), and the browser when it takes one up
// (lib/save.ts). A save that fails is reported as unreadable rather than loaded: loadFromSave takes the fields below as
// they are, with no default (persistence.ts's 'raw' rows), so a save without one threw after the store had already
// taken the rest — and the menu, told only "no save", sent Continue on to character creation, whose first autosave
// wrote a new game over it.
import type { SaveGame } from '@/game/types';

/** The version toSave() stamps (persistence.ts's buildSave). A save from a newer game is refused rather than loaded by
 *  an older one and written back without whatever it did not know. */
export const SAVE_VERSION = 1;

/** The longest a save's JSON may run, in characters: far past any real holdfast's, short of filling the server's
 *  disk from one request. */
export const MAX_SAVE_LENGTH = 4 * 1024 * 1024;

/** The fields loadFromSave takes with no default (persistence.ts's `load: 'raw'` rows), and the kind of value each must
 *  be. saveSchema.test.ts holds this list to that table. */
export const REQUIRED_SAVE_FIELDS = {
  character: 'record',
  inventory: 'record',
  unlocks: 'list',
  completedQuests: 'list',
  questProgress: 'record',
  buildings: 'list',
} as const;

/** A save that can be loaded, or why it cannot — `problem` reads after "could not be read: "; `newer` marks one that is
 *  whole but from a newer game, which nothing may fall back past, or overwrite without keeping. */
export type SaveCheck = { ok: true; save: SaveGame } | { ok: false; problem: string; newer?: true };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function checkSave(v: unknown): SaveCheck {
  if (!isRecord(v)) return { ok: false, problem: 'it is not a save at all' };
  // a save with no version at all is taken as the first: every one this game has written carries it
  if (v.version !== undefined && typeof v.version !== 'number') return { ok: false, problem: 'its version is not a number' };
  if (typeof v.version === 'number' && v.version > SAVE_VERSION) {
    return { ok: false, problem: `it was made by a newer version of the game (save version ${v.version})`, newer: true };
  }
  for (const [k, kind] of Object.entries(REQUIRED_SAVE_FIELDS)) {
    if (kind === 'list' ? !Array.isArray(v[k]) : !isRecord(v[k])) return { ok: false, problem: `its ${k} is missing or damaged` };
  }
  return { ok: true, save: v as unknown as SaveGame };
}

/** A save's JSON text, parsed and checked. */
export function parseSave(text: string): SaveCheck {
  if (text.length > MAX_SAVE_LENGTH) return { ok: false, problem: 'it is far too large' };
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'it is not valid JSON' };
  }
  return checkSave(v);
}
