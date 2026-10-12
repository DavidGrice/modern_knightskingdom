import { describe, expect, it, vi } from 'vitest';

// The component called as a plain function: what it draws through is a name, so what it returns is plain data.
vi.mock('./PropModel', () => ({ default: 'PropModel' }));

import MerchantCamp from './MerchantCamp';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { MERCHANT_CAMP_WALLS, MERCHANT_SPOT } from '@/game/data/trade';

interface El { type: unknown; key: string | null; props: { children?: unknown; url?: string; height?: number; position?: number[]; yaw?: number; scale?: unknown } }
const drawn = (): El[] => {
  const walk = (el: unknown): El[] => (Array.isArray(el) ? el.flatMap(walk)
    : el && typeof el === 'object' && 'props' in el ? ((el as El).type === 'PropModel' ? [el as El] : walk((el as El).props.children)) : []);
  return walk((MerchantCamp as unknown as () => unknown)());
};

describe("the merchant's camp", () => {
  it('draws one wall piece per entry of the table, in its order, on the ground and facing as the table says', () => {
    const walls = drawn();
    expect(walls).toHaveLength(MERCHANT_CAMP_WALLS.length);
    expect(walls.length).toBeGreaterThan(0);
    walls.forEach((el, i) => {
      const w = MERCHANT_CAMP_WALLS[i];
      expect(el.props.position).toEqual([w.x, 0, w.z]);
      expect(el.props.yaw).toBe(w.yaw);
    });
    expect(new Set(walls.map((el) => el.key)).size).toBe(walls.length);
  });

  // each is the catalogue's own piece: its model, at the true height the catalogue gives it. PropModel caches by url
  // and height together, so a piece drawn at any other height would be a second copy of the mesh.
  it("draws each piece from the model of the wall the player can build, at that wall's height", () => {
    drawn().forEach((el, i) => {
      const piece = BUILDABLE_BY_ID[MERCHANT_CAMP_WALLS[i].model];
      expect(piece.category).toBe('walls');
      expect(el.props.url).toBe(piece.model);
      expect(el.props.height).toBe(piece.size[1]);
      expect(el.props.scale).toBeUndefined();
    });
  });

  // the shape, not the numbers: where exactly each piece stands is the table's to say (and its seams are still to tune)
  it('walls the merchant in on three sides and leaves the fourth open', () => {
    const STRAIGHT = 'mc005', CORNER = 'mc001';
    const across = (w: { x: number }) => Math.abs(w.x - MERCHANT_SPOT.x) < 3;
    const side = (w: { x: number }) => (across(w) ? 'middle' : w.x < MERCHANT_SPOT.x ? 'west' : 'east');
    const where = (model: string) => MERCHANT_CAMP_WALLS.filter((w) => w.model === model).map((w) => side(w) + (w.z < MERCHANT_SPOT.z ? ' back' : ' front')).sort();
    // a straight across the back, a straight wing on each side reaching forward past him, a corner joining each wing to the back
    expect(where(STRAIGHT)).toEqual(['east front', 'middle back', 'west front']);
    expect(where(CORNER)).toEqual(['east back', 'west back']);
    // ...and nothing across the front: that is the gate
    expect(MERCHANT_CAMP_WALLS.some((w) => across(w) && w.z > MERCHANT_SPOT.z)).toBe(false);
    // every piece is part of his yard, not somewhere else on the map
    for (const w of MERCHANT_CAMP_WALLS) expect(Math.hypot(w.x - MERCHANT_SPOT.x, w.z - MERCHANT_SPOT.z)).toBeLessThan(10);
  });
});
