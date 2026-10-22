// The merchant's cart and team, towed behind him: where they stand as he leads them, as plain functions, for
// components/world/Merchant.tsx to place them by and for the tests to measure. He leads them by the bridle; the
// team — two horses abreast, yoked to a chest slung between them (oc6095b3) — follows him as a towed cart does,
// rather than riding beside him as it used to, turned with him, over whatever he passed close by on that side
// (ROADMAP.md, "the merchant's cart and team rode beside him").
//
// Towed as a cart is towed: its front hooves are drawn after him on a pole of fixed length and its back hooves after
// them on another (towTeam) — on a straight track both pairs come down on his track, and round a turn they cut inside
// it a little, as a cart's wheels do. A pole, not a rope, and its own length, not a length along his track: placed by
// distance along his track, the team bunched up at a sharp turn, its noses into him, and placed by the first point of
// his track at a distance from him it jumped forward round one (both tried on the way to this, at his yard's turn).
type Point = { x: number; z: number };

/** Half the team's breadth and half its length as drawn — oc6095b3 at its 1.7 m: RiggedProp stands it on the centre of
 *  its footprint, its horses facing its own +z, its noses at +TEAM_HALF_LENGTH. */
export const TEAM_HALF_WIDTH = 0.92;
export const TEAM_HALF_LENGTH = 1.07;
/** Where its two pairs of hooves come down along its own z: the front pair, under the horses' chests, and the back
 *  pair, under their quarters — the two points of it that are towed. */
export const TEAM_FRONT_HOOVES = 0.395;
export const TEAM_BACK_HOOVES = -0.639;
/** How far behind him the horses' noses come: never nearer (the pole), and just so far on a straight track. */
export const TEAM_LEAD = 0.7;
/** the poles: from him to the front hooves, and from the front hooves to the back ones */
const FRONT_BACK = TEAM_LEAD + TEAM_HALF_LENGTH - TEAM_FRONT_HOOVES;
const HOOF_SPAN = TEAM_FRONT_HOOVES - TEAM_BACK_HOOVES;
/** How far back laidBehind lays his track: past both pairs of hooves, and a metre more. */
export const TRAIL_KEEP = FRONT_BACK + HOOF_SPAN + 1;

/** The team on the ground: where its front pair of hooves stands (fx, fz) and where its back pair does (bx, bz). */
export type TeamHooves = { fx: number; fz: number; bx: number; bz: number };

/** Tows the team after him as he comes to stand at (x, z): its front hooves drawn straight toward him until they stand
 *  FRONT_BACK from him, its back hooves drawn straight toward the front ones until they stand HOOF_SPAN from them — a
 *  pole each, so that walking at it he pushes it back as well, and its noses never come nearer him than TEAM_LEAD. A
 *  pole with its two ends on one spot points nowhere: it is left as it is. */
export function towTeam(team: TeamHooves, x: number, z: number): void {
  const dx = x - team.fx, dz = z - team.fz;
  const d = Math.hypot(dx, dz);
  if (d > 0) {
    team.fx = x - (dx / d) * FRONT_BACK;
    team.fz = z - (dz / d) * FRONT_BACK;
  }
  const ex = team.fx - team.bx, ez = team.fz - team.bz;
  const e = Math.hypot(ex, ez);
  if (e > 0) {
    team.bx = team.fx - (ex / e) * HOOF_SPAN;
    team.bz = team.fz - (ez / e) * HOOF_SPAN;
  }
}

/** His track from where he stands (x, z) back: that point, then `trail`'s from its newest to its oldest, less any that
 *  would make a leg of no length; and the way it runs on past its oldest point — along its last leg, or with no leg of
 *  any length, along -z. */
function trackBack(trail: Point[], x: number, z: number): { pts: Point[]; on: Point } {
  const pts: Point[] = [{ x, z }];
  for (let k = trail.length - 1; k >= 0; k--) {
    const last = pts[pts.length - 1];
    if (trail[k].x !== last.x || trail[k].z !== last.z) pts.push(trail[k]);
  }
  const n = pts.length;
  if (n < 2) return { pts, on: { x: 0, z: -1 } };
  const len = Math.hypot(pts[n - 1].x - pts[n - 2].x, pts[n - 1].z - pts[n - 2].z);
  return { pts, on: { x: (pts[n - 1].x - pts[n - 2].x) / len, z: (pts[n - 1].z - pts[n - 2].z) / len } };
}

/** The team set down on his track behind him as he stands at (x, z) (`trail`: his track, oldest point first, as
 *  laidBehind lays it): its front hooves where the track, walked back from him, first comes FRONT_BACK from him as the
 *  crow flies, and its back hooves where it first comes HOOF_SPAN from them, further back — where towTeam's poles hold
 *  them on a straight track. Past the oldest point of his track, the track runs straight on (trackBack). */
export function teamOn(trail: Point[], x: number, z: number): TeamHooves {
  const { pts, on } = trackBack(trail, x, z);
  // the leg from point k: to the next, or on past the last for good
  const leg = (k: number) => {
    const a = pts[k];
    if (k + 1 < pts.length) {
      const len = Math.hypot(pts[k + 1].x - a.x, pts[k + 1].z - a.z);
      return { ux: (pts[k + 1].x - a.x) / len, uz: (pts[k + 1].z - a.z) / len, len };
    }
    return { ux: on.x, uz: on.z, len: Infinity };
  };
  // walking back along the track from `a`, `used` along leg k: the first point `chord` from `from` as the crow flies —
  // on each leg from a point nearer than that, where |a + u t - from| = chord, the root past it — with its leg and how
  // far along it
  const crossing = (from: Point, chord: number, k: number, a: Point, used: number) => {
    for (;;) {
      const l = leg(k);
      const ax = a.x - from.x, az = a.z - from.z;
      const p = ax * l.ux + az * l.uz;
      const q = ax * ax + az * az - chord * chord;
      if (q >= 0) return { at: a, k, used };
      const t = -p + Math.sqrt(p * p - q);
      if (t <= l.len - used) return { at: { x: a.x + l.ux * t, z: a.z + l.uz * t }, k, used: used + t };
      k++;
      a = pts[k];
      used = 0;
    }
  };
  const front = crossing({ x, z }, FRONT_BACK, 0, pts[0], 0);
  const back = crossing(front.at, HOOF_SPAN, front.k, front.at, front.used);
  return { fx: front.at.x, fz: front.at.z, bx: back.at.x, bz: back.at.z };
}

/** The team set down straight behind him as he stands at (x, z) about to walk along (ux, uz), a unit vector: its front
 *  hooves FRONT_BACK back along it, its back hooves HOOF_SPAN further — where towTeam's poles hold them once he has
 *  walked that way a while. For where he stands with no track of his behind him (Merchant.tsx's layTeam). */
export function teamBehind(x: number, z: number, ux: number, uz: number): TeamHooves {
  return {
    fx: x - ux * FRONT_BACK, fz: z - uz * FRONT_BACK,
    bx: x - ux * (FRONT_BACK + HOOF_SPAN), bz: z - uz * (FRONT_BACK + HOOF_SPAN),
  };
}

/** Where the team stands: its centre — the point RiggedProp stands it on, TEAM_FRONT_HOOVES behind its front hooves —
 *  and its turn about +y, as three.js turns an object: its horses face from its back hooves to its front ones, along
 *  (sin yaw, cos yaw). */
export function teamPose(team: TeamHooves): Point & { yaw: number } {
  const fx = team.fx - team.bx, fz = team.fz - team.bz;
  const d = Math.hypot(fx, fz) || 1;
  const ux = fx / d, uz = fz / d;
  return { x: team.fx - ux * TEAM_FRONT_HOOVES, z: team.fz - uz * TEAM_FRONT_HOOVES, yaw: Math.atan2(ux, uz) };
}

/** His track as if he had walked `way` to `at` (`next`: the index of the point of the way he is making for from there,
 *  as data/merchantDay.ts's scheduledPlace gives it, or the way's last to stand at its end): from `at` back through the
 *  points of the way before it as far as TRAIL_KEEP, and on straight back past its start along its first leg of any
 *  length (the way he has come before it — at the road's end, the road beyond) — its oldest point first, `at` last. */
export function laidBehind(way: Point[], next: number, at: Point): Point[] {
  const out: Point[] = [{ x: at.x, z: at.z }];
  let back = 0;
  let px = at.x, pz = at.z;
  for (let k = Math.min(next, way.length) - 1; k >= 0 && back < TRAIL_KEEP; k--) {
    const d = Math.hypot(way[k].x - px, way[k].z - pz);
    if (d === 0) continue;
    back += d;
    px = way[k].x;
    pz = way[k].z;
    out.unshift({ x: px, z: pz });
  }
  if (back < TRAIL_KEEP) {
    // straight on back past the start, along the way's first leg of any length; with none, along -z
    let dx = 0, dz = -1;
    for (let k = 1; k < way.length; k++) {
      const len = Math.hypot(way[k].x - way[0].x, way[k].z - way[0].z);
      if (len > 0) { dx = (way[0].x - way[k].x) / len; dz = (way[0].z - way[k].z) / len; break; }
    }
    const more = TRAIL_KEEP - back + 0.1;
    out.unshift({ x: px + dx * more, z: pz + dz * more });
  }
  return out;
}
