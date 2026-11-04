import { describe, expect, it } from 'vitest';
import { checkSave, MAX_SAVE_LENGTH, migrateSave, parseSave, REQUIRED_SAVE_FIELDS, SAVE_MIGRATIONS, SAVE_VERSION } from './saveSchema';
import { PERSISTED_FIELDS, PERSISTED_KEYS } from '@/game/store/persistence';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig, SaveGame } from '@/game/types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };

function realSave(): SaveGame {
  useGameStore.getState().newGame(HERO);
  return useGameStore.getState().toSave();
}

describe('the save check', () => {
  it('requires exactly the fields loadFromSave takes with no default, each of the kind a fresh game gives it', () => {
    const raw = PERSISTED_KEYS.filter((k) => (PERSISTED_FIELDS[k] as { load?: string }).load === 'raw');
    expect(Object.keys(REQUIRED_SAVE_FIELDS).sort()).toEqual([...raw].sort());
    for (const k of raw) {
      if (k === 'character') continue; // a fresh store has none yet; every save has one
      const fresh = (PERSISTED_FIELDS[k] as { fresh: () => unknown }).fresh();
      expect(REQUIRED_SAVE_FIELDS[k as keyof typeof REQUIRED_SAVE_FIELDS]).toBe(Array.isArray(fresh) ? 'list' : 'record');
    }
  });

  it('passes a save the game wrote, as an object and as its JSON', () => {
    const save = realSave();
    expect(save.version).toBe(SAVE_VERSION);
    expect(checkSave(save)).toEqual({ ok: true, save });
    expect(parseSave(JSON.stringify(save))).toEqual({ ok: true, save: JSON.parse(JSON.stringify(save)) });
    const { version: _v, ...unversioned } = save;
    expect(checkSave(unversioned).ok).toBe(true); // every save this game wrote has one; none is taken as the first
  });

  it('refuses what cannot be loaded, saying why', () => {
    const save = realSave() as unknown as Record<string, unknown>;
    expect(parseSave('{"version":1,"charac')).toEqual({ ok: false, problem: 'it is not valid JSON' });
    expect(parseSave('[]')).toEqual({ ok: false, problem: 'it is not a save at all' });
    expect(parseSave('null')).toEqual({ ok: false, problem: 'it is not a save at all' });
    expect(parseSave(' '.repeat(MAX_SAVE_LENGTH + 1))).toEqual({ ok: false, problem: 'it is far too large' });
    expect(checkSave({ ...save, version: '1' })).toEqual({ ok: false, problem: 'its version is not a number' });
    // the fraction and the zero first: before the fix they pass the check, so the test fails there rather than hanging
    // on the -1e300 its migration loop never left
    for (const version of [0.5, 0, -1, -1e300]) {
      expect(parseSave(JSON.stringify({ ...save, version })))
        .toEqual({ ok: false, problem: `its version is not one the game ever wrote (${version})` });
    }
    expect(checkSave({ ...save, version: -Infinity }).ok).toBe(false);
    expect(checkSave({ ...save, version: SAVE_VERSION + 1 }))
      .toEqual({ ok: false, problem: `it was made by a newer version of the game (save version ${SAVE_VERSION + 1})`, newer: true });
    for (const [k, kind] of Object.entries(REQUIRED_SAVE_FIELDS)) {
      const { [k]: _gone, ...without } = save;
      expect(checkSave(without)).toEqual({ ok: false, problem: `its ${k} is missing or damaged` });
      expect(checkSave({ ...save, [k]: null })).toEqual({ ok: false, problem: `its ${k} is missing or damaged` });
      expect(checkSave({ ...save, [k]: kind === 'list' ? {} : [] })).toEqual({ ok: false, problem: `its ${k} is missing or damaged` });
    }
  });
});

describe('the migrations (F-09)', () => {
  it('bring an older save up a step at a time, in order, and leave one already there as it is', () => {
    const steps = {
      1: (s: Record<string, unknown>) => ({ ...s, trail: [...(s.trail as number[]), 1] }),
      2: (s: Record<string, unknown>) => ({ ...s, trail: [...(s.trail as number[]), 2] }),
      3: (s: Record<string, unknown>) => ({ ...s, trail: [...(s.trail as number[]), 3] }),
    };
    expect(migrateSave({ version: 1, trail: [] }, steps, 4)).toEqual({ version: 4, trail: [1, 2, 3] });
    expect(migrateSave({ version: 2, trail: [] }, steps, 4)).toEqual({ version: 4, trail: [2, 3] });
    expect(migrateSave({ trail: [] }, steps, 3)).toEqual({ version: 3, trail: [1, 2] }); // no version: the first
    const current = { version: 4, trail: [] };
    expect(migrateSave(current, steps, 4)).toBe(current);
  });

  it('are none yet, and the save check runs them: what it hands on is at SAVE_VERSION', () => {
    expect(SAVE_MIGRATIONS).toEqual({});
    const save = realSave();
    const { version: _v, ...unversioned } = save; // the oldest a save can be: the first, which has no step yet
    expect(parseSave(JSON.stringify(unversioned))).toEqual({ ok: true, save: JSON.parse(JSON.stringify(save)) });
  });
});
