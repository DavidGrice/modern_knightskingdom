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

/** One step up the save's history: a save of version `v` (its key) rewritten as one of `v + 1`. The first change to the
 *  save's shape that an older game could not load as it is raises SAVE_VERSION and adds its step here; none has yet. */
export type SaveMigration = (save: Record<string, unknown>) => Record<string, unknown>;
export const SAVE_MIGRATIONS: Readonly<Record<number, SaveMigration>> = {};

/** `save` brought up to version `to`, a step at a time and in order (a save with no version is taken as the first, and
 *  stamped; a version with no step only re-stamped). A save already there is handed back as it is. Its version must be
 *  a whole number from 1 — checkSave refuses any other before it gets here. */
export function migrateSave(
  save: Record<string, unknown>, migrations: Readonly<Record<number, SaveMigration>> = SAVE_MIGRATIONS, to = SAVE_VERSION,
): Record<string, unknown> {
  let out = save;
  for (let v = typeof save.version === 'number' ? save.version : 1; v < to; v++) out = { ...(migrations[v]?.(out) ?? out), version: v + 1 };
  return out.version === undefined ? { ...out, version: to } : out;
}

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

export function checkSave(raw: unknown): SaveCheck {
  if (!isRecord(raw)) return { ok: false, problem: 'it is not a save at all' };
  // a save with no version at all is taken as the first: every one this game has written carries it
  if (raw.version !== undefined && typeof raw.version !== 'number') return { ok: false, problem: 'its version is not a number' };
  // and one no game ever wrote is refused before migrateSave counts up from it: from -1e300 its v++ never moves (a
  // request that stalls the server for every player), and from 0.5 it lands on a 1.5 that every later load refuses
  if (typeof raw.version === 'number' && !(Number.isInteger(raw.version) && raw.version >= 1)) {
    return { ok: false, problem: `its version is not one the game ever wrote (${raw.version})` };
  }
  if (typeof raw.version === 'number' && raw.version > SAVE_VERSION) {
    return { ok: false, problem: `it was made by a newer version of the game (save version ${raw.version})`, newer: true };
  }
  // an older save is checked as this game will load it
  const v = migrateSave(raw);
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
