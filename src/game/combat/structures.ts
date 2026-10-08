'use client';
// CLN-11 · split out of game/combat.ts: the raiders' ram and siege ladder as
// things the player can break. CLN-19 · the two were a copy of each other
// here, in the blade's reach test (melee.ts) and in the shaft's flight test
// (projectiles.ts); what differs between them is now one record each.
import { audio } from '@/lib/audio';
import type { ItemId } from '../types';
import { useGameStore } from '../store/gameStore';
import { damageRaiderProp, type RaiderPropState } from '../raiderProps';
import { raiderRamState, RAM_RADIUS } from '../raiderRam';
import { raiderLadderState, LADDER_RADIUS } from '../raiderLadder';

/** a raider siege prop as a thing the player can break */
export interface BreakableProp {
  state: RaiderPropState;
  /** how close a swing or a shaft has to come to count as a hit */
  radius: number;
  /** the height a shaft's flight is tested against */
  midY: number;
  /** what the wreck is worth stripping */
  salvage: Partial<Record<ItemId, number>>;
  xp: number;
  wreckedLine: string;
}

/** The raiders' props, in the order a blow is tested against them: the ram,
 *  then the ladder. */
export const RAIDER_PROPS: readonly BreakableProp[] = [
  {
    state: raiderRamState,
    radius: RAM_RADIUS,
    // a waist-high engine
    midY: 0.9,
    // the wreck is worth stripping — it is a cart full of timber and iron
    salvage: { wood: 4, plank: 2, iron_bar: 1 },
    xp: 60,
    wreckedLine: "The raiders' ram is wrecked! Salvaged 4× Wood Log, 2× Plank, 1× Iron Bar.",
  },
  {
    // Wave 58 (H4) · the siege ladder. Any raider still mid-climb or fighting
    // from the wall-walk it reached falls the instant
    // `raiderLadderState.wrecked` goes true (Enemies.tsx's own 'climbing'/
    // elevated live-recheck handles that, not anything here).
    state: raiderLadderState,
    radius: LADDER_RADIUS,
    // centred at half its own 3.2m height rather than the ram's low 0.9m:
    // this is a tall standing structure, not a waist-high engine
    midY: 1.6,
    // smaller salvage: a lighter, cheaper structure than the ram
    salvage: { wood: 3, plank: 2 },
    xp: 40,
    wreckedLine: "The raiders' siege ladder is wrecked! Salvaged 3× Wood Log, 2× Plank.",
  },
];

/** shared damage path for a raider prop: melee and ranged both land here so
 *  the kill notification, sound and salvage happen exactly once */
export function hitRaiderProp(prop: BreakableProp, amount: number) {
  const broke = damageRaiderProp(prop.state, amount);
  const st = useGameStore.getState();
  if (!broke) {
    audio.play('brick_collide', 0.5);
    return;
  }
  audio.play('explosion', 0.7);
  st.addItems(prop.salvage, 'grant');
  st.addXp('combat', prop.xp);
  st.notify(prop.wreckedLine, true);
}
