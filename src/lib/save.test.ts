import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BEACON_MAX_BYTES, dropRecoverySave, fetchSave, flushSave, persistSave, readRecoverySave, writeRecoverySave,
} from './save';
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

  it('throws a save that cannot be put into JSON back to the caller, not as a storage problem (F-08b)', async () => {
    vi.stubGlobal('localStorage', { setItem: () => {} });
    const unmade = { version: 1, n: BigInt(1) } as unknown as SaveGame;
    await expect(persistSave(unmade, true)).rejects.toThrow(TypeError);
    await expect(persistSave(unmade, false)).rejects.toThrow(TypeError);
  });

  it("writes a guest's save to the browser", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { setItem: (k: string, v: string) => store.set(k, v) });
    expect(await persistSave(SAVE, true)).toEqual({ ok: true });
    expect(store.get('kk_guest_save')).toBe(JSON.stringify(SAVE));
  });
});

// a save the schema passes (lib/saveSchema.ts), taken at `savedAt`
const at = (savedAt: number | undefined, more: object = {}) => ({
  version: 1, savedAt, character: {}, inventory: {}, unlocks: [], completedQuests: [], questProgress: {}, buildings: [], ...more,
}) as unknown as SaveGame;

function browser(keys: Record<string, string> = {}) {
  const store = new Map(Object.entries(keys));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  const beacons: string[] = [];
  vi.stubGlobal('navigator', { sendBeacon: (url: string, body: string) => (beacons.push(`${url} ${body.length}`), true) });
  return { store, beacons };
}

describe('the tab-close flush (F-08b)', () => {
  it("writes a guest's save to its own key, and sends no beacon", () => {
    const b = browser();
    expect(flushSave(at(5), true, null)).toEqual({ kept: true, beacon: false });
    expect([...b.store.keys()]).toEqual(['kk_guest_save']);
    expect(b.beacons).toEqual([]);
  });

  it("keeps a signed-in player's shadow copy, and beacons it to the server while it fits", () => {
    const b = browser();
    const small = at(5);
    expect(flushSave(small, false, 'u1')).toEqual({ kept: true, beacon: true });
    expect([...b.store.keys()]).toEqual(['kk_shadow_u1']);
    expect(b.beacons).toEqual([`/api/save ${JSON.stringify(small).length}`]);

    const large = at(6, { buildings: [{ id: 'b1', type: 'x'.repeat(BEACON_MAX_BYTES) }] });
    expect(flushSave(large, false, 'u1')).toEqual({ kept: true, beacon: false });
    expect(b.store.get('kk_shadow_u1')).toBe(JSON.stringify(large));
    expect(b.beacons).toHaveLength(1);
  });
});

describe("reading a signed-in player's save, with a shadow copy beside it (F-08b)", () => {
  const server = (save: SaveGame | null) => {
    const puts: SaveGame[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        puts.push(JSON.parse(String(init.body)));
        return new Response('{"ok":true}', { status: 200 });
      }
      return new Response(JSON.stringify({ save }), { status: 200 });
    }));
    return puts;
  };
  const shadow = (save: object) => ({ kk_shadow_u1: JSON.stringify(save) });

  it('takes up a newer shadow, sends it on to the server and lets it go', async () => {
    const b = browser(shadow(at(200, { dayCount: 7 })));
    const puts = server(at(100));
    expect(await fetchSave(false, 'u1')).toEqual({ status: 'ok', save: at(200, { dayCount: 7 }), restored: false });
    expect(puts.map((p) => p.savedAt)).toEqual([200]);
    expect(b.store.has('kk_shadow_u1')).toBe(false);
  });

  it('takes up a shadow when the server has no save yet', async () => {
    browser(shadow(at(200)));
    server(null);
    expect(await fetchSave(false, 'u1')).toEqual({ status: 'ok', save: at(200), restored: false });
  });

  it('never an older or as old a shadow, one with no time, or one that cannot be loaded', async () => {
    for (const s of [at(50), at(100), at(undefined), { ...at(300), buildings: null }]) {
      const b = browser(shadow(s));
      const puts = server(at(100));
      expect(await fetchSave(false, 'u1')).toEqual({ status: 'ok', save: at(100), restored: false });
      expect(puts).toEqual([]);
      expect(b.store.has('kk_shadow_u1')).toBe(false); // spent: the server's is the one
    }
  });

  it("leaves the shadow alone when the server's save could not be fetched, and reads none for a guest", async () => {
    const b = browser(shadow(at(200)));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"down"}', { status: 503 })));
    expect(await fetchSave(false, 'u1')).toEqual({ status: 'error', problem: 'down' });
    expect(b.store.has('kk_shadow_u1')).toBe(true);
    expect(await fetchSave(true, null)).toEqual({ status: 'none' });
  });
});

describe('the recovery slot (F-08b)', () => {
  it("is a key of its own per player, never the main save's", () => {
    const b = browser({ kk_guest_save: '{"the":"main save"}' });
    writeRecoverySave(at(300), null);
    writeRecoverySave(at(301), 'u1');
    expect(b.store.get('kk_guest_save')).toBe('{"the":"main save"}');
    expect([...b.store.keys()].sort()).toEqual(['kk_guest_save', 'kk_recovery_guest', 'kk_recovery_u1']);
    expect(readRecoverySave(null)).toEqual(at(300));
    expect(readRecoverySave('u1')).toEqual(at(301));
    dropRecoverySave(null);
    expect(readRecoverySave(null)).toBeNull();
  });

  it('offers back only a save that can be loaded', () => {
    browser({ kk_recovery_guest: JSON.stringify({ ...at(300), inventory: null }), kk_recovery_u1: '{"broken' });
    expect(readRecoverySave(null)).toBeNull();
    expect(readRecoverySave('u1')).toBeNull();
  });
});
