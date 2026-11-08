// Wave 68 (G-05) · Ruins and repair.
//
// Siege damage used to end one way: a piece at 0 HP came down for half its materials. Under the owner's harsh raids
// (OD-02) a piece battered in a fight is left standing as a RUIN instead — a breach (OD-01) the builders raise again —
// and anything damaged but standing can be repaired, for a share of its cost as large as the share of its HP it has
// lost. What is left here is the arithmetic both kinds of piece share: what a damaged building was before the damage
// phases overwrote its type, the form it shows at a given HP, and what a repair costs.
//
// Leaf module: data only (no store import), so the store's slices can use it.
import type { ItemId, PlacedBuilding } from './types';
import { buildableForLabAsset, labAssetId } from './data/buildables';
import { ITEMS } from './data/items';
import { labDamagedForm, labIntactForm } from './data/labCapabilities';

/** what a building stands for — the piece placed — whatever damaged form it shows now. Its own `baseType` where the
 *  damage wrote one; on a save from before that field, a wall the damage turned into a broken phase (an HP entry or
 *  a ruin says it was damaged) is the chain's intact phase 1 — and a broken phase placed as it is, never damaged, is
 *  itself. */
export function buildingBase(b: PlacedBuilding, hp: number | undefined): string {
  if (b.baseType) return b.baseType;
  if (hp === undefined && !b.ruin) return b.type;
  const intact = labIntactForm(labAssetId(b.type));
  return (intact && buildableForLabAsset(intact)) || b.type;
}

/** the form a piece shows at `hpFrac` of its HP: the lab's damaged phase for its base where it charts one (a castle
 *  wall breached below 2/3, ruined below 1/3 and at 0), else the base itself */
export function formAt(base: string, hpFrac: number): string {
  const phase = labDamagedForm(labAssetId(base), hpFrac);
  return (phase && buildableForLabAsset(phase)) || base;
}

/** What it costs to make good `missing` of a piece's `max` HP: each of its materials in that proportion, rounded up
 *  (a scratch still takes a stone), materials that come to nothing left out. The one place a balance pass tunes. */
export function repairCost(cost: Partial<Record<ItemId, number>>, missing: number, max: number): Partial<Record<ItemId, number>> {
  const out: Partial<Record<ItemId, number>> = {};
  if (missing <= 0 || max <= 0) return out;
  const share = Math.min(1, missing / max);
  for (const [itemId, n] of Object.entries(cost)) {
    const due = Math.ceil((n as number) * share - 1e-9);
    if (due > 0) out[itemId as ItemId] = due;
  }
  return out;
}

/** a bill as a prompt reads it: "5 Stone, 1 Iron Bar" */
export function billText(cost: Partial<Record<ItemId, number>>): string {
  return Object.entries(cost).map(([k, n]) => `${n} ${ITEMS[k as ItemId]?.name ?? k}`).join(', ');
}
