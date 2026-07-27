// J45 · Bricks ARE the resources.
//
// You mined a rock and received "stone": a number that existed nowhere in the
// world, spent on a building whose cost was another number. The catalogue
// already holds 160 real pieces out of the extraction, and those are what a
// LEGO homestead is actually made of — so every gathered resource is now a
// SPECIFIC piece, with the piece's own name, its rendered thumbnail and its
// model.
//
// The mapping is deliberately laid over the existing item ids rather than
// replacing them. That is what lets an old save convert instead of losing its
// inventory: the save still holds `stone: 12`, and twelve grey 2×2 bricks is
// what that has always meant — the game simply never showed it.
import type { ItemId } from '../types';
import catalogue from './bricks.generated.json';

export interface CatalogueBrick {
  id: string;
  name: string;
  cat: string;
  model: string;
  thumb: string;
  size: number[];
}

export const BRICK_CATALOGUE = catalogue as unknown as CatalogueBrick[];
const BY_ID: Record<string, CatalogueBrick> = Object.fromEntries(
  BRICK_CATALOGUE.map((b) => [b.id, b]),
);

export interface BrickResource {
  /** the catalogue piece this resource IS */
  brick: string;
  /** what the piece is called in the satchel — the piece, then the stuff */
  label: string;
  /** the family it files under in the parts bin */
  bin: 'timber' | 'stone' | 'metal' | 'fittings' | 'stores';
}

/**
 * Which piece each gathered resource is. Chosen so the shape reads as the
 * material: timber is the long 1×4 brick you frame with, stone the solid
 * 2×2, iron the small dense 1×1, planks the flat tile you floor with.
 */
export const BRICK_RESOURCES: Partial<Record<ItemId, BrickResource>> = {
  wood: { brick: 'gen_12_l301000', label: 'Timber Brick 1×4', bin: 'timber' },
  plank: { brick: 'gen_18_l300800', label: 'Plank 1×8', bin: 'timber' },
  stone: { brick: 'gen_26_l300300', label: 'Stone Brick 2×2', bin: 'stone' },
  iron_ore: { brick: 'gen_00_l300500', label: 'Ore Brick 1×1', bin: 'metal' },
  iron_bar: { brick: 'gen_04_l300400', label: 'Iron Bar 1×2', bin: 'metal' },
};

/** the catalogue entry backing a resource, if it has one */
export function brickFor(id: ItemId): CatalogueBrick | null {
  const r = BRICK_RESOURCES[id];
  return r ? BY_ID[r.brick] ?? null : null;
}

/** the piece name to show for a resource, falling back to the item's own */
export function brickLabel(id: ItemId, fallback: string): string {
  return BRICK_RESOURCES[id]?.label ?? fallback;
}

/** which bin of the parts drawer a resource files under */
export function brickBin(id: ItemId): BrickResource['bin'] | null {
  return BRICK_RESOURCES[id]?.bin ?? null;
}

export const BIN_LABEL: Record<BrickResource['bin'], string> = {
  timber: 'Timber',
  stone: 'Stone',
  metal: 'Metal',
  fittings: 'Fittings',
  stores: 'Stores',
};
