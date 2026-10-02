// CLN-10 · split out of buildables.ts unchanged: turning a piece's cost into the lines a panel prints.
import type { ItemId } from '../../types';
import { brickFor, brickLabel } from '../brickResources';
import { ITEMS } from '../items';
import { BUILDABLE_BY_ID } from './catalog';

/** one line of a rendered cost bill — see costBill() below */
interface CostBillLine {
  key: string;
  thumb: string | null;
  icon?: string;
  label: string;
  qty: number;
}

/** CLN-31 · costBill()'s param, widened structurally so KeepSocketPanel's
 *  KeepPart (game/data/keep.ts — same `cost: Partial<Record<ItemId,number>>`
 *  shape, no `pieces` field at all) can call it too instead of re-deriving
 *  its own copy of the fallback branch below. A KeepPart can never take the
 *  `.pieces` branch — it has no such field — so it is structurally, not just
 *  today, always the fallback-bricks branch. `Buildable` and `KeepPart` both
 *  satisfy this interface as-is; no change needed at either. */
interface CostBillSource {
  cost: Partial<Record<ItemId, number>>;
  pieces?: { id: string; qty: number }[];
}

/**
 * Wave 29 · the cost as an actual bill of distinct catalogue pieces when a
 * buildable hand-authors one (`Buildable.pieces` — see that field's own doc
 * comment in types.ts), falling back to J45's original one-canonical-brick-
 * per-family display (`brickFor`) for every buildable that hasn't been given
 * a bill yet — identical output to what the two render sites (BuildBar.tsx,
 * BuildingMenuPanel.tsx) used to compute inline. Purely a render helper:
 * canAfford/addItems/refunds/maxHpFor all keep reading `def.cost`, the real
 * family totals, unchanged — this never changes what a piece costs, only how
 * the cost READS.
 */
export function costBill(def: CostBillSource): CostBillLine[] {
  if (def.pieces && def.pieces.length) {
    return def.pieces.map((p) => {
      const piece = BUILDABLE_BY_ID[p.id];
      return { key: p.id, thumb: piece?.thumb ?? null, label: piece?.name ?? p.id, qty: p.qty };
    });
  }
  return Object.entries(def.cost).map(([id, n]) => {
    const brick = brickFor(id as ItemId);
    return {
      key: id,
      thumb: brick?.thumb ?? null,
      icon: brick ? undefined : (ITEMS[id as ItemId]?.icon ?? id),
      label: brickLabel(id as ItemId, ITEMS[id as ItemId]?.name ?? id),
      qty: n ?? 0,
    };
  });
}
