// CLN-11 · split out of game/combat.ts unchanged: rolling what an enemy carries, and what a fallen one hands over.
import type { ItemId } from '../types';
import { randInt } from '@/lib/rng';
import { LOOT_TABLES, type EnemyKind } from '../data/enemies';
import type { EnemyData } from './enemyStore';

/** roll one enemy's carried inventory from its kind's table */
export function rollLoot(kind: EnemyKind): Partial<Record<ItemId, number>> {
  const out: Partial<Record<ItemId, number>> = {};
  for (const e of LOOT_TABLES[kind] ?? []) {
    if (Math.random() >= e.chance) continue;
    const n = randInt(e.min, e.max);
    if (n > 0) out[e.item] = (out[e.item] ?? 0) + n;
  }
  return out;
}

/** what a fallen enemy actually hands over: its own rolled inventory, falling
 *  back to a fresh roll for anything spawned before inventories existed */
export function lootFor(kindOrData: EnemyKind | EnemyData): Partial<Record<ItemId, number>> {
  if (typeof kindOrData === 'string') return rollLoot(kindOrData);
  return kindOrData.inventory ?? rollLoot(kindOrData.kind);
}
