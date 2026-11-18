// G-06 · what a raid takes from the homestead's stores (OD-02, the owner's harsh answer: no cap). A thief at a store
// (enemyAi/blows.ts's takeFromStore) carries off one bulk good every GRAB_EVERY seconds out of the one global
// inventory, the biggest pile first, until he is struck or his haul passes RUN_HAUL; then he runs for the road
// (enemyAi/movement.ts's escape). Cut down, he drops all of it (combat/loot.ts's lootFor, through combat/kill.ts:
// `recovered`); off the map's edge, or still on the field when the player is knocked out (combat/playerDamage.ts), he
// has got away with it (`gotAway`: `lost`, and the saved plunder ledger G-16a pays a share of back). The raid's
// resolve names both, good by good (raidDirector.ts's haulReport).
import type { ItemId } from './types';
import type { GameState } from './store/gameStore';
import { BULK_GOODS } from './storage';
import { ITEMS } from './data/items';
import { onSessionReset } from './store/sessionHooks';

/** goods by kind and count */
export type Goods = Partial<Record<ItemId, number>>;

/** seconds between one good a thief takes and the next */
export const GRAB_EVERY = 0.5;
/** past this many goods carried, a thief stops taking and runs for the road */
export const RUN_HAUL = 20;

/** how many goods `goods` holds in all */
export function haulOf(goods: Goods | undefined): number {
  let n = 0;
  for (const v of Object.values(goods ?? {})) n += v ?? 0;
  return n;
}

/** The good a thief takes next: of the bulk goods (storage.ts's BULK_GOODS), the one held most of — the biggest pile,
 *  the earlier in that list on a tie — or null with none of them left. */
export function nextGrab(inventory: Goods): ItemId | null {
  let best: ItemId | null = null;
  for (const id of BULK_GOODS) if ((inventory[id] ?? 0) > (best ? inventory[best] ?? 0 : 0)) best = id;
  return best;
}

/** `goods` counted into `into` (changed in place, and handed back) */
export function addGoods(into: Goods, goods: Goods | undefined): Goods {
  for (const [id, n] of Object.entries(goods ?? {})) if (n) into[id as ItemId] = (into[id as ItemId] ?? 0) + n;
  return into;
}

/** "12× Wood, 8× Stone" — the most first, as a kill's haul reads (combat/kill.ts) */
export function goodsNamed(goods: Goods): string {
  return (Object.entries(goods) as [ItemId, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${n}× ${ITEMS[id]?.name ?? id}`)
    .join(', ');
}

/** this raid's goods so far: what got away with its thieves, and what was taken back from the fallen — emptied when
 *  the raid resolves (raidDirector.ts) and at a session start */
export const raidHaul: { lost: Goods; recovered: Goods } = { lost: {}, recovered: {} };

export function resetRaidHaul(): void {
  raidHaul.lost = {};
  raidHaul.recovered = {};
}
onSessionReset(resetRaidHaul);

/** The goods on every thief still on his feet, by kind — read as a save is built (store/slices/sessionSlice.ts's
 *  toSave: SaveLeaves.carriedPlunder), which counts them into the saved ledger: enemies are not saved and a load forgets
 *  the raid, so a save taken mid-raid kept the goods gone from the stores and nowhere else. Only the save's copy: the
 *  live raid goes on, and a thief cut down after it gives his haul back to the stores. Set by the enemy store
 *  (combat/enemyStore.ts), which this module cannot import (it imports gameStore.ts); none until it loads. */
export const standingHauls = { read: (): Goods => ({}) };

/** A thief gone with what he carried: counted lost to this raid, and into the saved ledger (st.recordPlunder). */
export function gotAway(st: Pick<GameState, 'recordPlunder'>, carried: Goods | undefined): void {
  if (!haulOf(carried)) return;
  addGoods(raidHaul.lost, carried);
  st.recordPlunder(carried!);
}
