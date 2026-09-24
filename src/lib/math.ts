// Tiny zero-import math helpers, importable from any layer (ai/, game/data/,
// components/) without creating an import cycle. Every body here is a VERBATIM
// port of the copy it replaced — same operations, same order — so results are
// bit-identical to the inline code, including for multi-turn angles and values
// exactly at ±PI.

/** `v` limited to [lo, hi]. Ternary form (not Math.max/Math.min): a NaN `v`
 *  propagates, and a `-0` `v` stays `-0`. Do not "simplify" this into
 *  `Math.max(lo, Math.min(hi, v))` — that one differs for `-0`, and for
 *  inverted bounds (lo > hi). */
export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** `clamp(x, 0, 1)`. NaN propagates (see ai/core/curves.ts's own NaN guard). */
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** An angle difference folded into [-PI, PI]. Deliberately the two `while`
 *  loops the call sites always pasted, NOT a modulo/atan2 formulation: the
 *  loops subtract/add exactly `Math.PI * 2` step by step, which is the
 *  floating-point behaviour every turn-toward-heading site was tuned against. */
export function wrapAngle(a: number): number {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
