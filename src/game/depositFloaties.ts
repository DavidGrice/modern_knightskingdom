// Wave 23 · a tiny, cosmetic confirmation when a hauling villager deposits
// goods — no floaty-text mechanism existed anywhere before this. Mutable
// array leaf module, same shape as commandWheel/workSignal: this changes
// every frame while a floaty is alive and never needs to be persisted.
import type { ItemId } from './types';

export interface DepositFloaty {
  id: number;
  x: number; y: number; z: number;
  itemId: ItemId;
  amount: number;
  bornAt: number; // Date.now() ms
}

export const depositFloaties: DepositFloaty[] = [];
let nextId = 1;

export function spawnDepositFloaty(x: number, y: number, z: number, itemId: ItemId, amount: number) {
  if (amount <= 0) return;
  depositFloaties.push({ id: nextId++, x, y, z, itemId, amount, bornAt: Date.now() });
  // hard cap, oldest first — a hauling frenzy should never grow this unbounded
  if (depositFloaties.length > 24) depositFloaties.shift();
}
