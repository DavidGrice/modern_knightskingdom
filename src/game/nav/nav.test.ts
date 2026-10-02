import { describe, expect, it } from 'vitest';
import { findPath, getNavGrid, getNavGridOrNull, hasLineOfSight, navBlocked, rebuildNav } from '../navgrid';
import { useGameStore } from '../store/gameStore';
import type { PlacedBuilding } from '../types';

let n = 0;
const piece = (type: string, x: number, z: number, extra: Partial<PlacedBuilding> = {}): PlacedBuilding =>
  ({ id: `t${++n}`, type, x, z, rot: 0, built: 1, ...extra });

/** a wall line along z = 8 from x = -12 to 12, with one gap three pieces wide around x = 0 */
function wallWithGap(): PlacedBuilding[] {
  const out: PlacedBuilding[] = [];
  for (let x = -12; x <= 12; x += 2) if (Math.abs(x) > 2) out.push(piece('wall', x, 8));
  return out;
}
function build(buildings: PlacedBuilding[]) {
  useGameStore.setState({ buildings });
  rebuildNav(buildings);
}

describe('home nav grid', () => {
  it('routes through the gap in a wall rather than through the masonry', () => {
    build(wallWithGap());
    expect(navBlocked(-6, 8)).toBe(true);
    expect(navBlocked(0, 8)).toBe(false);
    const path = findPath(-6, 2, -6, 14);
    expect(path).not.toBeNull();
    // findPath returns corners only (straight runs are dropped), so walk the polyline from the start point:
    // every step of it is on open ground, and where it crosses the wall line it is inside the gap
    const line = [{ x: -6, z: 2 }, ...path!];
    let crossX: number | null = null;
    for (let k = 1; k < line.length; k++) {
      const p = line[k - 1], q = line[k];
      const steps = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.z - p.z) * 4));
      for (let s = 1; s <= steps; s++) {
        const x = p.x + ((q.x - p.x) * s) / steps, z = p.z + ((q.z - p.z) * s) / steps;
        expect(navBlocked(x, z)).toBe(false);
      }
      if ((p.z - 8) * (q.z - 8) < 0) crossX = p.x + ((q.x - p.x) * (8 - p.z)) / (q.z - p.z);
    }
    expect(crossX).not.toBeNull();
    expect(Math.abs(crossX!)).toBeLessThan(3);
  });

  it('ignores a piece that is still under construction', () => {
    build([piece('wall', 4, 4, { built: 0.4 })]);
    expect(navBlocked(4, 4)).toBe(false);
    build([piece('wall', 4, 4)]);
    expect(navBlocked(4, 4)).toBe(true);
  });

  it('gives a route between two open points and none to a point far off the grid', () => {
    build([]);
    expect(findPath(0, 0, 20, 20)).not.toBeNull();
    expect(findPath(0, 0, 5000, 5000)).toBeNull();
    expect(hasLineOfSight(0, 1.2, 0, 20, 1.2, 20)).toBe(true);
  });
});

describe('getNavGrid / getNavGridOrNull', () => {
  it('home is the fixed grid and a destination gets its own cached window grid', () => {
    const home = getNavGrid(null);
    expect(home.mode).toBe('fixed');
    const dest = getNavGrid('template-01');
    expect(dest.mode).toBe('window');
    expect(getNavGrid('template-01')).toBe(dest);
    expect(getNavGridOrNull('template-01')).toBe(dest);
  });

  it('throws for a region that does not exist, and the OrNull form fails open instead', () => {
    expect(() => getNavGrid('no-such-place')).toThrow(/not a known destination/);
    expect(getNavGridOrNull('no-such-place')).toBeNull();
  });
});
