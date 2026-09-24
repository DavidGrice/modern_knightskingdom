// Tiny zero-import RNG/hash helpers, importable from any layer (ai/,
// game/data/, game/store/, components/) without creating an import cycle.
// Every body is a VERBATIM port of the copy it replaced. Deterministic
// world/dungeon generation depends on these exact constants and on the ORDER
// of the calls made against a seeded stream, so do not change either.

/** Simple deterministic RNG so the world layout is stable across sessions.
 *  Returns a `() => number` in [0, 1); each call advances the stream. */
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** stable string hash — the seed every derived villager trait keys off */
export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** A uniformly random element, drawn from `Math.random()` (exactly one call,
 *  in the same expression shape the call sites always used — smoke scripts
 *  that stub `Math.random` depend on that). Never use this for seeded
 *  generation; that is `pickWith`. */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** `pick` against a caller-supplied stream (e.g. a `mulberry32`), for seeded
 *  generation. Consumes exactly one draw from `rnd`. */
export function pickWith<T>(rnd: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

/** A random integer in [min, max], both inclusive, from `Math.random()`. */
export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
