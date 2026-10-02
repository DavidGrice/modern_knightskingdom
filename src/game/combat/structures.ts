'use client';
// CLN-11 · split out of game/combat.ts unchanged: the raiders' ram and siege ladder as things the player can break.
import { audio } from '@/lib/audio';
import type { ItemId } from '../types';
import { useGameStore } from '../store/gameStore';
import { damageRaiderRam } from '../raiderRam';
import { damageRaiderLadder } from '../raiderLadder';

/** shared damage path for the ram: melee and ranged both land here so the
 *  kill notification, sound and salvage happen exactly once */
export function hitRaiderRam(amount: number) {
  const broke = damageRaiderRam(amount);
  const st = useGameStore.getState();
  if (!broke) {
    audio.play('brick_collide', 0.5);
    return;
  }
  audio.play('explosion', 0.7);
  // the wreck is worth stripping — it is a cart full of timber and iron
  const salvage = { wood: 4, plank: 2, iron_bar: 1 } as Partial<Record<ItemId, number>>;
  st.addItems(salvage, 'grant');
  st.addXp('combat', 60);
  st.notify("The raiders' ram is wrecked! Salvaged 4× Wood Log, 2× Plank, 1× Iron Bar.", true);
}

/** Wave 58 (H4) · the ladder's own version of hitRaiderRam just above — same
 *  shared shape (melee and ranged both land here once), smaller salvage
 *  since it's a lighter, cheaper structure than the ram. Any raider still
 *  mid-climb or fighting from the wall-walk this ladder reached falls the
 *  instant `raiderLadderState.wrecked` goes true (Enemies.tsx's own
 *  'climbing'/elevated live-recheck handles that, not this function). */
export function hitRaiderLadder(amount: number) {
  const broke = damageRaiderLadder(amount);
  const st = useGameStore.getState();
  if (!broke) {
    audio.play('brick_collide', 0.5);
    return;
  }
  audio.play('explosion', 0.7);
  const salvage = { wood: 3, plank: 2 } as Partial<Record<ItemId, number>>;
  st.addItems(salvage, 'grant');
  st.addXp('combat', 40);
  st.notify("The raiders' siege ladder is wrecked! Salvaged 3× Wood Log, 2× Plank.", true);
}
