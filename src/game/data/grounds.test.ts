import { describe, expect, it } from 'vitest';
import { clearsHomestead, GROUNDS, sectionsOverlap } from './grounds';
import type { RectSection } from '../types';

const rect = (x: number, z: number, halfX: number, halfZ: number): RectSection =>
  ({ kind: 'tree', x, z, halfX, halfZ, count: 1 }) as RectSection;

describe('sectionsOverlap', () => {
  it('detects overlapping rectangles in either order', () => {
    expect(sectionsOverlap(rect(0, 0, 5, 5), rect(8, 0, 5, 5))).toBe(true);
    expect(sectionsOverlap(rect(8, 0, 5, 5), rect(0, 0, 5, 5))).toBe(true);
    expect(sectionsOverlap(rect(0, 0, 5, 5), rect(0, 20, 5, 5))).toBe(false);
  });
});

// grounds.ts only console.warns about these in development; as a test they fail loudly instead.
describe('GROUNDS data', () => {
  it('has unique ids', () => {
    expect(new Set(GROUNDS.map((g) => g.id)).size).toBe(GROUNDS.length);
  });

  it('never overlaps itself', () => {
    const clashes: string[] = [];
    for (let i = 0; i < GROUNDS.length; i++) {
      for (let j = i + 1; j < GROUNDS.length; j++) {
        if (sectionsOverlap(GROUNDS[i], GROUNDS[j])) clashes.push(`${GROUNDS[i].id} × ${GROUNDS[j].id}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('keeps every ground clear of the fully-bought homestead', () => {
    expect(GROUNDS.filter((g) => !clearsHomestead(g)).map((g) => g.id)).toEqual([]);
  });
});
