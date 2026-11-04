'use client';
// Save persistence: signed-in users save to the Node backend, guests to localStorage.
import type { SaveGame } from '@/game/types';
import { checkSave, parseSave } from './saveSchema';

const GUEST_KEY = 'kk_guest_save';

/** What writing the save came to (F-08a): written, or why not — `problem` reads after "not saved: ", the way
 *  fetchSave's does in the menu. Nothing is thrown away on a failure: the caller keeps the session and says so. */
export type SaveOutcome = { ok: true } | { ok: false; problem: string };

export async function persistSave(save: SaveGame, guest: boolean): Promise<SaveOutcome> {
  // outside the guest's try: a save that cannot be put into JSON is a failure of its own (the caller's), not the
  // browser's storage
  const text = JSON.stringify(save);
  if (guest) {
    try {
      localStorage.setItem(GUEST_KEY, text);
      return { ok: true };
    } catch (e) {
      // QuotaExceededError in Chrome and Safari, NS_ERROR_DOM_QUOTA_REACHED in Firefox
      const full = /quota/i.test((e as { name?: string } | null)?.name ?? '');
      return { ok: false, problem: full ? "this browser's storage is full" : 'this browser would not open its storage' };
    }
  }
  const res = await fetch('/api/save', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: text,
  }).catch(() => null);
  if (!res) return { ok: false, problem: 'the server could not be reached' };
  if (res.ok) return { ok: true };
  if (res.status === 401) return { ok: false, problem: 'you are signed out — sign in again' };
  if (res.status === 413) return { ok: false, problem: 'the save is too large for the server to take' };
  return { ok: false, problem: `the server answered ${res.status}` };
}

/** What reading the save came to (CLN-09) — kept apart, because each asks something different of the menu: a save to
 *  load (`restored` when the server fell back to the one before it, the latest being unreadable), none to load, a save
 *  that could not be fetched just now (try again; nothing was changed), or one that is there but cannot be read. */
export type SaveResult =
  | { status: 'ok'; save: SaveGame; restored: boolean }
  | { status: 'none' }
  | { status: 'error'; problem: string }
  | { status: 'corrupt'; problem: string };

/** `account` is the signed-in player's id (null for a guest): a shadow copy of theirs newer than the server's save is
 *  the one to load (F-08b, `reconcile`). */
export async function fetchSave(guest: boolean, account: string | null): Promise<SaveResult> {
  if (guest) {
    let raw: string | null;
    try {
      raw = localStorage.getItem(GUEST_KEY);
    } catch {
      return { status: 'error', problem: 'this browser would not open its storage' };
    }
    if (!raw) return { status: 'none' };
    const r = parseSave(raw);
    return r.ok ? { status: 'ok', save: r.save, restored: false } : { status: 'corrupt', problem: r.problem };
  }
  const r = await fetchServerSave();
  return account === null ? r : reconcile(r, account);
}

async function fetchServerSave(): Promise<SaveResult> {
  const res = await fetch('/api/save').catch(() => null);
  if (!res) return { status: 'error', problem: 'the server could not be reached' };
  if (res.status === 401) return { status: 'error', problem: 'you are signed out — sign in again' };
  if (!res.ok) {
    const why = await res.json().then((d) => d?.error).catch(() => null);
    return { status: 'error', problem: typeof why === 'string' ? why : `the server answered ${res.status}` };
  }
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') return { status: 'error', problem: 'the server sent back something unreadable' };
  if (typeof data.problem === 'string') return { status: 'corrupt', problem: data.problem };
  if (data.save == null) return { status: 'none' };
  const r = checkSave(data.save);
  return r.ok ? { status: 'ok', save: r.save, restored: data.restored === true } : { status: 'corrupt', problem: r.problem };
}

// F-08b · the tab-close flush, the shadow copy it leaves a signed-in player, and the recovery slot. Each is a key of
// its own in this browser — but a guest's flush, which is their save itself.

/** the most a save sent as the tab closes may run to, in bytes: sendBeacon takes 64 KiB in flight at most — and fetch's
 *  keepalive shares that quota, so it is no way round it — less a little for the rest of the request */
export const BEACON_MAX_BYTES = 60 * 1024;

const shadowKey = (account: string) => `kk_shadow_${account}`;
const recoveryKey = (account: string | null) => `kk_recovery_${account ?? 'guest'}`;

/** a save kept in this browser under `key`, if it is there and can be loaded */
function readKept(key: string): SaveGame | null {
  try {
    const raw = localStorage.getItem(key);
    const r = raw ? parseSave(raw) : null;
    return r?.ok ? r.save : null;
  } catch {
    return null;
  }
}

function keep(key: string, text: string): boolean {
  try {
    localStorage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

function drop(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // nothing to do: what is left is passed over again next time
  }
}

const stamp = (save: SaveGame) => (typeof save.savedAt === 'number' ? save.savedAt : 0);

/** What the flush wrote: the save kept in this browser (a guest's own key, or a signed-in player's shadow copy), and a
 *  beacon queued for the server. */
export type FlushOutcome = { kept: boolean; beacon: boolean };

/** The flush as the tab closes or goes out of sight — synchronous, since the page may be gone once it returns. A
 *  guest's save is written to its own key, as any save of theirs is. A signed-in player's goes to a shadow copy in this
 *  browser, one per account, and — while it fits the beacon — to the server too (POST /api/save); a larger one has
 *  only the shadow, which fetchSave takes up next time. */
export function flushSave(save: SaveGame, guest: boolean, account: string | null): FlushOutcome {
  const text = JSON.stringify(save);
  if (guest) return { kept: keep(GUEST_KEY, text), beacon: false };
  const kept = account !== null && keep(shadowKey(account), text);
  const beacon = new TextEncoder().encode(text).length <= BEACON_MAX_BYTES && navigator.sendBeacon('/api/save', text);
  return { kept, beacon };
}

/** A shadow copy newer than the save the server sent — its beacon was too large, or never arrived — is the one to load,
 *  and is sent on to the server; one no newer (by `savedAt`), or one that cannot be read, never is. Only a save the
 *  server answered for: one that could not be fetched says nothing of how old it is. */
async function reconcile(r: SaveResult, account: string): Promise<SaveResult> {
  if (r.status !== 'ok' && r.status !== 'none') return r;
  const shadow = readKept(shadowKey(account));
  if (!shadow || stamp(shadow) <= (r.status === 'ok' ? stamp(r.save) : 0)) {
    if (r.status === 'ok') drop(shadowKey(account)); // spent: no newer than the server's, or unreadable
    return r;
  }
  if ((await persistSave(shadow, false)).ok) drop(shadowKey(account));
  return { status: 'ok', save: shadow, restored: false };
}

/** The recovery slot (`account` null for a guest): the game as it was when a boundary caught a crash
 *  (lib/recovery.ts). Never the main save's key — the menu offers it back, and never loads it in the save's place. A
 *  throw (storage full or closed) is the caller's: writeRecovery passes it over. */
export function writeRecoverySave(save: SaveGame, account: string | null): void {
  localStorage.setItem(recoveryKey(account), JSON.stringify(save));
}

/** the recovery slot's save, if there is one that can be loaded */
export function readRecoverySave(account: string | null): SaveGame | null {
  return readKept(recoveryKey(account));
}

export function dropRecoverySave(account: string | null): void {
  drop(recoveryKey(account));
}

/** a signed-in player's shadow copy is in this browser — a save the server may not have heard of yet */
export function hasShadowSave(account: string | null): boolean {
  try {
    return account !== null && !!localStorage.getItem(shadowKey(account));
  } catch {
    return false;
  }
}

export function hasGuestSave(): boolean {
  try {
    return !!localStorage.getItem(GUEST_KEY);
  } catch {
    return false;
  }
}
