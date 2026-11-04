import { afterEach, describe, expect, it, vi } from 'vitest';
import { persistSave } from './save';
import type { SaveGame } from '@/game/types';

const SAVE = { version: 1 } as unknown as SaveGame;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('writing the save (F-08a)', () => {
  const answer = (status: number, body: unknown = {}) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it("says the server's save went through", async () => {
    answer(200, { ok: true });
    expect(await persistSave(SAVE, false)).toEqual({ ok: true });
  });

  it('says why the server would not take it: a failure, too large, signed out, or not reached', async () => {
    answer(500, { error: 'The save could not be written.' });
    expect(await persistSave(SAVE, false)).toEqual({ ok: false, problem: 'the server answered 500' });
    answer(413, { error: 'Save too large.' });
    expect(await persistSave(SAVE, false)).toEqual({ ok: false, problem: 'the save is too large for the server to take' });
    answer(401, { error: 'Not signed in.' });
    expect(await persistSave(SAVE, false)).toEqual({ ok: false, problem: 'you are signed out — sign in again' });
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));
    expect(await persistSave(SAVE, false)).toEqual({ ok: false, problem: 'the server could not be reached' });
  });

  it("says a guest's browser storage is full, or would not open", async () => {
    const thrown = (name: string) => vi.stubGlobal('localStorage', {
      setItem: () => {
        throw Object.assign(new Error('nope'), { name });
      },
    });
    thrown('QuotaExceededError');
    expect(await persistSave(SAVE, true)).toEqual({ ok: false, problem: "this browser's storage is full" });
    thrown('NS_ERROR_DOM_QUOTA_REACHED');
    expect(await persistSave(SAVE, true)).toEqual({ ok: false, problem: "this browser's storage is full" });
    thrown('SecurityError');
    expect(await persistSave(SAVE, true)).toEqual({ ok: false, problem: 'this browser would not open its storage' });
  });

  it("writes a guest's save to the browser", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { setItem: (k: string, v: string) => store.set(k, v) });
    expect(await persistSave(SAVE, true)).toEqual({ ok: true });
    expect(store.get('kk_guest_save')).toBe(JSON.stringify(SAVE));
  });
});
