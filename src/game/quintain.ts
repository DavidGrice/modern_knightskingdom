'use client';
// CLN-19 · the quintain, out of game/siege.ts. A training dummy is not a
// siege engine, and Buildings.tsx — which only swings the dummy's arm — had
// to import the cannon, the charges and the ram to read one record.
import { audio } from '@/lib/audio';
import { useGameStore } from './store/gameStore';

/** quintain spin impulses, keyed by building id (renderer animates toward it) */
export const quintainSpins: Record<string, number> = {};

export function quintainHit(buildingId: string, mounted: boolean) {
  const st = useGameStore.getState();
  quintainSpins[buildingId] = (quintainSpins[buildingId] ?? 0) + Math.PI * (2 + Math.random() * 2);
  st.addXp('combat', mounted ? 16 : 8);
  audio.play('sword_swish', 0.8);
  audio.play('thud', 0.5);
  if (mounted) st.notify('Mounted strike! Double training XP.');
}
