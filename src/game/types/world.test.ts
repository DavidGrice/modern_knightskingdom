import { describe, expect, it } from 'vitest';
import { isBuilt, isDoorLike, type PlacedBuilding } from './world';

const piece = (built?: number): PlacedBuilding => ({ id: 'b1', type: 'wall', x: 0, z: 0, rot: 0, built });

describe('isBuilt', () => {
  it('treats a missing `built` as finished (a pre-Phase-19 save)', () => {
    expect(isBuilt(piece(undefined))).toBe(true);
  });
  it('is true only once construction reaches 1', () => {
    expect(isBuilt(piece(0))).toBe(false);
    expect(isBuilt(piece(0.999))).toBe(false);
    expect(isBuilt(piece(1))).toBe(true);
  });
});

describe('isDoorLike', () => {
  it('covers exactly the pieces that seal when shut and open to pass', () => {
    for (const t of ['gate', 'door', 'window']) expect(isDoorLike(t)).toBe(true);
    for (const t of ['wall', 'tower', 'stockpile', '']) expect(isDoorLike(t)).toBe(false);
  });
});
