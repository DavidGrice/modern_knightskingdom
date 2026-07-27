'use client';
// Per-part hit volumes for rigged characters.
//
// Ranged combat used to test one 0.55m sphere parked at a fixed chest height
// — so a bolt through the skull and a bolt through the shin were the same
// event, and a shot that visibly passed beside a figure still connected.
// These boxes come from the ASSEMBLED RIG itself: each joint group
// (head / body / hips / arms / legs, see lib/minifigRig.ts) is measured in
// the figure's own local frame the moment it finishes loading, so the
// volumes match whatever donor that character actually uses instead of an
// invented set of proportions.
//
// A mutable leaf module for the usual reason: the boxes are produced inside
// the R3F tree and consumed by combat code the store also touches, so a
// zustand store here would create a cycle and churn.
import type { RigJoint } from '@/lib/minifigRig';

/** an axis-aligned box in the figure's LOCAL frame: origin at the feet,
 *  +Y up, -Z forward (this codebase's yaw=0 convention) */
export interface PartBox {
  part: RigJoint;
  cx: number; cy: number; cz: number;   // centre
  hx: number; hy: number; hz: number;   // half-extents
}

/** live per-character boxes, keyed by the owner's id (enemy id, villager id…) */
export const hitboxes: Record<string, PartBox[]> = {};

export function registerHitbox(id: string, boxes: PartBox[]) {
  hitboxes[id] = boxes;
}

export function unregisterHitbox(id: string) {
  delete hitboxes[id];
}

/** Where a shot landed matters: a head shot should be worth taking the
 *  harder shot for, and a limb hit should not read the same as a chest hit. */
export const PART_DAMAGE: Record<RigJoint, number> = {
  head: 2.0,
  body: 1.0,
  hips: 0.9,
  leftarm: 0.65,
  rightarm: 0.65,
  leftleg: 0.6,
  rightleg: 0.6,
};

export const PART_LABEL: Record<RigJoint, string> = {
  head: 'Head', body: 'Chest', hips: 'Body',
  leftarm: 'Arm', rightarm: 'Arm', leftleg: 'Leg', rightleg: 'Leg',
};

export interface PartHit {
  part: RigJoint;
  /** 0..1 along the tested segment */
  t: number;
  /** impact point in the figure's LOCAL frame, so a stuck projectile can
   *  ride the character without re-solving anything per frame */
  local: { x: number; y: number; z: number };
}

/** slab test: segment (in local space) against one axis-aligned box */
function slab(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  b: PartBox,
): number | null {
  let tmin = 0;
  let tmax = 1;
  const axes: [number, number, number, number][] = [
    [ox, dx, b.cx, b.hx],
    [oy, dy, b.cy, b.hy],
    [oz, dz, b.cz, b.hz],
  ];
  for (const [o, d, c, h] of axes) {
    const lo = c - h;
    const hi = c + h;
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return null;   // parallel and outside
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  return tmin;
}

/**
 * Test a world-space segment against one character's registered boxes.
 * `x`/`z`/`yaw` are the character's own transform; yaw follows this
 * codebase's convention (0 faces -Z), so the segment is rotated by -yaw to
 * enter the figure's local frame.
 * Returns the NEAREST part hit along the segment, or null.
 */
export function hitTestCharacter(
  id: string,
  x: number, z: number, yaw: number, groundY: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): PartHit | null {
  const boxes = hitboxes[id];
  if (!boxes || !boxes.length) return null;

  const c = Math.cos(-yaw);
  const s = Math.sin(-yaw);
  const toLocal = (wx: number, wy: number, wz: number) => {
    const rx = wx - x;
    const rz = wz - z;
    return { x: rx * c - rz * s, y: wy - groundY, z: rx * s + rz * c };
  };
  const o = toLocal(ax, ay, az);
  const e = toLocal(bx, by, bz);
  const dx = e.x - o.x;
  const dy = e.y - o.y;
  const dz = e.z - o.z;

  let best: PartHit | null = null;
  for (const b of boxes) {
    const t = slab(o.x, o.y, o.z, dx, dy, dz, b);
    if (t === null || t < 0 || t > 1) continue;
    if (best && t >= best.t) continue;
    best = {
      part: b.part,
      t,
      local: { x: o.x + dx * t, y: o.y + dy * t, z: o.z + dz * t },
    };
  }
  return best;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkhitbox = hitboxes;
}
