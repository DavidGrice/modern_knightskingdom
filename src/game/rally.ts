// G-08 · the rally order (game/defenders.ts's 'rally'): where the player plants it, and how a defender holds it. Pure:
// the ground, what blocks, and the raiders are handed in, so the order is planted (data/defenderOrders.ts) and held
// (Defenders.tsx) by the same few lines a test reads.

/** how far from the rally point a defender stands his ground: he never steps out of it mid-fight */
export const RALLY_HOLD = 2;
/** the farthest the player's look plants a rally point */
export const RALLY_REACH = 40;
/** how far from the point each defender's own place by it stands, so that a garrison gathers rather than stacks */
const RALLY_SPREAD = 1;
/** the step the look is walked out along to find the ground */
const LOOK_STEP = 0.25;

/** Where the player's look meets the ground: walked out from his eye along the camera's facing (the yaw/pitch of
 *  game/playerState.ts, -Z at yaw 0, as components/fps/cameraRig.ts places it) to the first point at or below
 *  `ground`; a look that meets nothing within RALLY_REACH (the sky, the horizon) plants at its far end. */
export function lookPoint(
  eye: { x: number; y: number; z: number }, yaw: number, pitch: number, ground: (x: number, z: number) => number,
): { x: number; z: number } {
  const c = Math.cos(pitch);
  const dx = -Math.sin(yaw) * c, dy = Math.sin(pitch), dz = -Math.cos(yaw) * c;
  let x = eye.x, z = eye.z, above = eye.y - ground(x, z);
  for (let t = LOOK_STEP; t <= RALLY_REACH; t += LOOK_STEP) {
    const nx = eye.x + dx * t, nz = eye.z + dz * t;
    const next = eye.y + dy * t - ground(nx, nz);
    if (next <= 0) {
      // between the last step above the ground and this one below it, where the look crosses it
      const k = above / (above - next || 1);
      return { x: x + (nx - x) * k, z: z + (nz - z) * k };
    }
    x = nx; z = nz; above = next;
  }
  return { x, z };
}

/** The raider a defender holding `point` fights: of those he can reach (`reach`: his blade's, or his bow's) from
 *  somewhere within RALLY_HOLD of it, the one nearest the point — what comes at the rally is met first; one farther
 *  off is left alone, however near the defender himself stands to him. */
export function rallyFoe<T>(
  point: { x: number; z: number }, foes: readonly T[], at: (f: T) => { x: number; z: number }, reach: number,
): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const f of foes) {
    const p = at(f);
    const d = Math.hypot(p.x - point.x, p.z - point.z);
    if (d <= RALLY_HOLD + reach && d < bestD) { best = f; bestD = d; }
  }
  return best;
}

/** (x, z) held within RALLY_HOLD of `point`: a step that would take him out of it stops at its edge — a hair inside
 *  it, so that the rounding of the step back never leaves him past RALLY_HOLD (Defenders.tsx's walk to the point
 *  would take him out of the fight for a frame, every frame he is pressed against the edge) */
export function holdWithin(point: { x: number; z: number }, x: number, z: number): { x: number; z: number } {
  const dx = x - point.x, dz = z - point.z;
  const d = Math.hypot(dx, dz);
  if (d <= RALLY_HOLD) return { x, z };
  const k = (RALLY_HOLD - 1e-9) / d;
  return { x: point.x + dx * k, z: point.z + dz * k };
}

/** A defender's own place by the rally point while nothing is in reach: RALLY_SPREAD from it at his own bearing (`h`,
 *  his id's hash), or the point itself where that place is `blocked` (a wall, a building). */
export function rallySpot(
  point: { x: number; z: number }, h: number, blocked: (x: number, z: number) => boolean,
): { x: number; z: number } {
  const x = point.x + Math.cos(h) * RALLY_SPREAD, z = point.z + Math.sin(h) * RALLY_SPREAD;
  return blocked(x, z) ? { x: point.x, z: point.z } : { x, z };
}
