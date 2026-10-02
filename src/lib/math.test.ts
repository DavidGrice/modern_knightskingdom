import { describe, expect, it } from 'vitest';
import { clamp, clamp01, wrapAngle } from './math';

describe('clamp / clamp01', () => {
  it('limits to the bounds and passes values inside them through', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(7)).toBe(1);
  });

  // math.ts documents both of these as the reason it is a ternary, not Math.max/Math.min
  it('keeps -0 as -0 and lets NaN through', () => {
    expect(Object.is(clamp(-0, -1, 1), -0)).toBe(true);
    expect(Object.is(clamp01(-0), -0)).toBe(true);
    expect(Number.isNaN(clamp(NaN, 0, 1))).toBe(true);
    expect(Number.isNaN(clamp01(NaN))).toBe(true);
  });
});

describe('wrapAngle', () => {
  it('leaves angles already in [-PI, PI] untouched, including the end points', () => {
    for (const a of [0, 1, -1, Math.PI, -Math.PI, 3, -3]) expect(wrapAngle(a)).toBe(a);
  });

  it('folds any angle into [-PI, PI] without changing its direction', () => {
    for (let a = -40; a <= 40; a += 0.37) {
      const w = wrapAngle(a);
      expect(w).toBeGreaterThanOrEqual(-Math.PI);
      expect(w).toBeLessThanOrEqual(Math.PI);
      expect(Math.cos(w)).toBeCloseTo(Math.cos(a), 9);
      expect(Math.sin(w)).toBeCloseTo(Math.sin(a), 9);
    }
  });

  it('unwinds multiple whole turns', () => {
    expect(wrapAngle(0.5 + 10 * 2 * Math.PI)).toBeCloseTo(0.5, 9);
    expect(wrapAngle(-0.5 - 7 * 2 * Math.PI)).toBeCloseTo(-0.5, 9);
  });
});
