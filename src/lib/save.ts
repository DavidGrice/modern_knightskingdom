'use client';
// Save persistence: signed-in users save to the Node backend, guests to localStorage.
import type { SaveGame } from '@/game/types';
import { checkSave, parseSave } from './saveSchema';

const GUEST_KEY = 'kk_guest_save';

/** What writing the save came to (F-08a): written, or why not — `problem` reads after "not saved: ", the way
 *  fetchSave's does in the menu. Nothing is thrown away on a failure: the caller keeps the session and says so. */
export type SaveOutcome = { ok: true } | { ok: false; problem: string };

export async function persistSave(save: SaveGame, guest: boolean): Promise<SaveOutcome> {
  if (guest) {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(save));
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
    body: JSON.stringify(save),
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

export async function fetchSave(guest: boolean): Promise<SaveResult> {
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

export function hasGuestSave(): boolean {
  try {
    return !!localStorage.getItem(GUEST_KEY);
  } catch {
    return false;
  }
}
