'use client';
// Save persistence: signed-in users save to the Node backend, guests to localStorage.
import type { SaveGame } from '@/game/types';

const GUEST_KEY = 'kk_guest_save';

export async function persistSave(save: SaveGame, guest: boolean): Promise<boolean> {
  if (guest) {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  }
  const res = await fetch('/api/save', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(save),
  }).catch(() => null);
  return !!res?.ok;
}

export async function fetchSave(guest: boolean): Promise<SaveGame | null> {
  if (guest) {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      return raw ? (JSON.parse(raw) as SaveGame) : null;
    } catch {
      return null;
    }
  }
  const res = await fetch('/api/save').catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  return (data?.save as SaveGame) ?? null;
}

export function hasGuestSave(): boolean {
  try {
    return !!localStorage.getItem(GUEST_KEY);
  } catch {
    return false;
  }
}
