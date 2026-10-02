import { describe, expect, it } from 'vitest';
import { evalCurve, type Curve, type CurveType } from './curves';
import { mulberry32 } from '../../lib/rng';

const curve = (type: CurveType, m = 1, k = 1, b = 0, c = 0): Curve => ({ type, m, k, b, c });

describe('evalCurve', () => {
  it('linear is m*(x-c)+b', () => {
    expect(evalCurve(curve('linear'), 0.25)).toBe(0.25);
    expect(evalCurve(curve('linear', -1, 1, 1, 0), 0.25)).toBe(0.75);
  });

  it('quadratic is m*(x-c)^k+b', () => {
    expect(evalCurve(curve('quadratic', 1, 2), 0.5)).toBe(0.25);
    expect(evalCurve(curve('quadratic', 1, 3), 0.5)).toBe(0.125);
  });

  it('logistic is centred on x = 0.5 + c', () => {
    expect(evalCurve(curve('logistic'), 0.5)).toBeCloseTo(0.5, 12);
    expect(evalCurve(curve('logistic'), 1)).toBeGreaterThan(0.99);
    expect(evalCurve(curve('logistic'), 0)).toBeLessThan(0.01);
  });

  it('logit is 0.5 at the midpoint and 0 (not NaN) at and beyond its asymptotes', () => {
    expect(evalCurve(curve('logit'), 0.5)).toBeCloseTo(0.5, 12);
    expect(evalCurve(curve('logit'), 0)).toBe(0);
    expect(evalCurve(curve('logit'), 1)).toBe(0);
    expect(evalCurve(curve('logit', 1, 1, 0, 0.9), 0.5)).toBe(0);
  });

  it('bool is a hard step at 0.5', () => {
    expect(evalCurve(curve('bool'), 0.5)).toBe(0);
    expect(evalCurve(curve('bool'), 0.500001)).toBe(1);
  });

  it('clamps the input to [0, 1] first', () => {
    expect(evalCurve(curve('linear'), -3)).toBe(0);
    expect(evalCurve(curve('linear'), 3)).toBe(1);
  });

  // scoreAction multiplies these together, so one out-of-range or NaN output would poison every score
  it('always returns a finite value in [0, 1] whatever the authored parameters', () => {
    const r = mulberry32(2026);
    const types: CurveType[] = ['linear', 'quadratic', 'logistic', 'logit', 'bool'];
    for (let i = 0; i < 20_000; i++) {
      const c = curve(types[i % types.length], r() * 20 - 10, r() * 4, r() * 4 - 2, r() * 2 - 1);
      const y = evalCurve(c, r() * 3 - 1);
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });
});
