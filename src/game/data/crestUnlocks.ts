// Unlockable crests: account-level cosmetics earned by deeds and by fully
// clearing the Sealed Crypt. Stored in localStorage (like kk_settings), NOT
// in the character save — jail Cedric once on any save and the Bull Sigil is
// yours in the creator for every hero you ever forge after. Crests not listed
// here are free from the start; being cosmetic-only, none of this touches
// rank/progression (see minifigs.ts header).
import { CREST_OPTIONS } from './minifigs';

export interface CrestUnlockDef {
  crestId: string;
  deedId?: string;        // unlocks when this Deed is earned…
  dungeonClears?: number; // …or when lifetime Sealed Crypt full-clears reach this
  hint: string;           // shown on the locked tile in the creator
}

export const CREST_UNLOCKS: CrestUnlockDef[] = [
  { crestId: 'minifigkingleo00', deedId: 'paladin', hint: 'Complete every royal quest' },
  { crestId: 'minifigcedricbull00', deedId: 'cedric_jailed', hint: 'Defeat Cedric the Bull at his forest camp' },
  { crestId: 'minifigprincessstorm00', deedId: 'storm_first_win', hint: 'Best Princess Storm in a duel' },
  { crestId: 'minifiggilbertbad00', dungeonClears: 1, hint: 'Clear every chamber of the Sealed Crypt' },
  { crestId: 'minifigweezil00', dungeonClears: 2, hint: 'Clear the Sealed Crypt twice over' },
];

const KEY = 'kk_crests';

export function unlockedCrests(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function crestLocked(crestId: string): boolean {
  if (!CREST_UNLOCKS.some((u) => u.crestId === crestId)) return false;
  return !unlockedCrests().includes(crestId);
}

export function crestLockHint(crestId: string): string | undefined {
  return CREST_UNLOCKS.find((u) => u.crestId === crestId)?.hint;
}

/** Returns true only when this call newly unlocked the crest. */
export function unlockCrest(crestId: string): boolean {
  const have = unlockedCrests();
  if (have.includes(crestId)) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify([...have, crestId]));
  } catch {}
  return true;
}

export function crestLabel(crestId: string): string {
  return CREST_OPTIONS.find((c) => c.id === crestId)?.label ?? crestId;
}
