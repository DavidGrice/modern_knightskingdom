// CLN-20 · where on a ring a hostile walks in — the one piece of arithmetic that four spawns in three frame loops
// (the arena's champion and its filler, Defend the Plot, the settlement raid) each had written out. Three call sites
// now: game/arena.ts twice, and game/waveDefense.ts for the other two. No imports, so any layer can take it.
//
// It is a POINT helper on purpose, not a "spawn on a ring" helper: the four sites do not agree on whether the kind is
// rolled before the angle or after it (the arena's filler draws the angle FIRST, the other three the kind first), and
// `Math.random` is one stream — a helper that took the kind as an argument would swap two draws at one of them. Each
// caller therefore keeps its own kind draw where it always was and calls this where its angle line stood.
//
// NOT for the rings in Enemies.tsx / CedricSiege.tsx: those put the cosine on x and the sine on z, so routing them
// through here would move every such spawn to a different point.

/** A uniformly random point on the circle of radius `r` about (`ox`, `oz`): sine on x, cosine on z.
 *
 *  Consumes exactly ONE `Math.random()`, for the angle. `r` is the ALREADY-MULTIPLIED radius (`dest.radius * 0.85`,
 *  `ARENA_RADIUS * 0.5`): the offset is `Math.sin(angle) * r`, never `Math.sin(angle) * radius * 0.85`, which
 *  associates the other way round and can differ in the last bit. */
export function ringPoint(ox: number, oz: number, r: number): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  return { x: ox + Math.sin(angle) * r, z: oz + Math.cos(angle) * r };
}
