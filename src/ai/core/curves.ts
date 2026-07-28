// NPC_AI_SPEC.md §5.3 / PHASE_3_4_5_ACTUATION_AND_REASONER.md §5.1 — the
// utility reasoner's response curves. Pure math, engine-agnostic, a
// faithful port of the spec's own formulas with the one correction §5.1
// already flags: `logit` needs an explicit NaN guard `clamp01` alone
// doesn't provide. `±Infinity` self-heals through `clamp01`; `NaN` does
// not — `Math.max`/`Math.min` both propagate it, silently poisoning
// `scoreAction`'s running product for good (5.2), not just for one tick.

export type CurveType = 'linear' | 'quadratic' | 'logistic' | 'logit' | 'bool';

/** `m` slope, `k` exponent, `b` vertical shift, `c` horizontal shift —
 *  Dave Mark's IAUS parameterization (NPC_AI_SPEC.md §5.3). Every curve
 *  instance authors all four fields, even ones a given type ignores
 *  (`bool` reads none of them), so a Consideration's curve data has one
 *  uniform shape wherever it's authored, not a type-dependent variant. */
export interface Curve {
  type: CurveType;
  m: number;
  k: number;
  b: number;
  c: number;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** `x` is clamped to [0,1] before the curve runs, and every branch's own
 *  result is clamped again on the way out — an input or a curve authored
 *  outside 0..1 must never propagate an out-of-range score into
 *  `scoreAction`'s product (5.2's own reasoning for why clamping isn't
 *  optional here). */
export function evalCurve(c: Curve, x: number): number {
  const xc = clamp01(x);
  switch (c.type) {
    case 'linear':
      return clamp01(c.m * (xc - c.c) + c.b);
    case 'quadratic':
      return clamp01(c.m * Math.pow(xc - c.c, c.k) + c.b);
    case 'logistic':
      return clamp01(c.m / (1 + Math.exp(-10 * c.k * (xc - 0.5 - c.c))) + c.b);
    case 'logit': {
      const t = xc - c.c;
      // NaN guard: Math.log of a non-positive or >=1 ratio is NaN, not
      // ±Infinity — ±Infinity would self-heal through clamp01 below, NaN
      // does not, so it must never reach that clamp.
      if (t <= 0 || t >= 1) return 0;
      return clamp01((c.m * Math.log(t / (1 - t))) / 5 + 0.5 + c.b);
    }
    case 'bool':
      return xc > 0.5 ? 1 : 0;
  }
}
