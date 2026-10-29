// Which target a shooter looses at — a raider with a crossbow (game/enemyAi/targeting.ts), a guard with a bow
// (components/world/Defenders.tsx) — when the one its rules pick stands behind something. A shot lands only on a clear
// sightline (nav/lineOfSight.ts), and a shooter that stood in range of a target it could not see waited there for good:
// a crossbowman and a bowman with a wall between them stood off, and the raid with them (ROADMAP.md, "a crossbowman
// and a bowman with a wall between them stood off"). So a blocked shooter turns to another target it can see, and with
// none closes in on its own until it can.

/** The target a shooter takes: `chosen` — the one its rules pick — while it stands out of `range` or in sight; within
 *  range but out of sight, the nearest of `others` within range that it can see (`sees`); with none, `chosen` still,
 *  `blocked`, to close in on until it comes into sight. `dist` is how far a target is from the shooter. */
export function aimFor<T>(
  chosen: T, others: readonly T[], dist: (t: T) => number, range: number, sees: (t: T) => boolean,
): { target: T; blocked: boolean } {
  if (dist(chosen) > range || sees(chosen)) return { target: chosen, blocked: false };
  let best: T | null = null;
  let bestD = Infinity;
  for (const t of others) {
    if (t === chosen) continue;
    const d = dist(t);
    if (d <= range && d < bestD && sees(t)) { best = t; bestD = d; }
  }
  return best !== null ? { target: best, blocked: false } : { target: chosen, blocked: true };
}
