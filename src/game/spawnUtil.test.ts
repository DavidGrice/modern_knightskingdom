import { afterEach, describe, expect, it, vi } from 'vitest';
import { ringPoint } from './spawnUtil';

afterEach(() => { vi.restoreAllMocks(); });

describe('ringPoint', () => {
  it('draws one number, for the angle, and puts the sine on x and the cosine on z', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25); // a quarter turn
    const p = ringPoint(10, -4, 6);
    expect(random).toHaveBeenCalledTimes(1);
    expect(p.x).toBeCloseTo(16, 12);
    expect(p.z).toBeCloseTo(-4, 12);
  });

  it('is the arithmetic the four spawn sites had written out, to the last bit', () => {
    for (const v of [0, 0.1234567, 0.5, 0.875, 0.999999]) {
      for (const [ox, oz, radius, frac] of [[4200, 4200, 28, 0.85], [-312.5, 77.25, 31.7, 0.85], [0.1, 0.2, 28, 0.5]]) {
        vi.spyOn(Math, 'random').mockReturnValue(v);
        // as it stood at each site: the angle, the radius multiplied BEFORE the trigonometry, then the two offsets
        const angle = Math.random() * Math.PI * 2;
        const r = radius * frac;
        expect(ringPoint(ox, oz, r)).toEqual({ x: ox + Math.sin(angle) * r, z: oz + Math.cos(angle) * r });
      }
    }
  });
});
