// CLN-26 · the player's fall and landing: the frame's gravity chain, moved from PlayerController.tsx as it was —
// airborne, fall and land on the floor; grounded with the floor gone from under them (a ledge, not a slope), start to
// fall; otherwise follow the floor's height. `groundEye` is where their eye stands on the floor this frame.
// Wave 65.2 · and floorCarry, which tells a slope from a step by how the floor under them changed since last frame.
import type * as THREE from 'three';
import { STEP_UP } from './floor';

/** Wave 65.2 · the floor under the player last frame, for floorCarry. One per player (PlayerController's ref). */
export interface FloorTrack { x: number; z: number; y: number; grade: number | null; hx: number; hz: number }

export const newFloorTrack = (): FloorTrack => ({ x: 0, z: 0, y: 0, grade: null, hx: 0, hz: 0 });

/** the steepest grade (rise over run) floorCarry reads as a slope */
export const SLOPE_LIMIT = 1.5;
/** how far a slope's grade may turn from one frame to the next — a hillside's facets meet at a few tenths; a stair's
 *  riser is a grade of 1.4 or more out of a level tread, even at a sprint */
export const GRADE_TURN = 0.5;
/** the cosine of the sharpest turn of heading that keeps the grade: one plane's grade turns by up to 2·grade·sin(turn/2)
 *  along the new heading, within GRADE_TURN for a turn of up to 18° on a grade as steep as SLOPE_LIMIT */
const HEADING_KEEP = 0.95;
/** the longest step a frame takes (a dodge-roll at the 0.05 s frame cap is 0.75 m); anything farther was a relocation */
const MAX_STRIDE = 1;
/** under this (m) the player stood still, and the floor with them */
const STILL = 0.005;

/** Wave 65.2 · how far the floor rose under the player since last frame, when it is the same surface carried on — a
 *  slope, or level ground — and null where it broke: a step, a stair, a ledge, a relocation. A destination bake is one
 *  merged mesh, so no terrain-only height exists to ask (FEATURE_PLAN.md F-15); a hillside is told from a stair by
 *  its continuity instead. A slope keeps its grade frame to frame, at whatever speed and dt (the rise and the run of
 *  a frame scale together), where a stair is level treads and sudden risers and a ledge a drop. Anything more than
 *  STEP_UP in one frame is never a slope, so no misread can carry the player off a ledge; a misread smaller drop is
 *  one they could step back up. The first move from a standstill (or after a relocation, or a drop) has no grade to
 *  keep, and is a slope if it is no steeper than SLOPE_LIMIT; so has a sharp turn of heading. Updates `t` to this frame. */
export function floorCarry(t: FloorTrack, x: number, z: number, floorY: number): number | null {
  const run = Math.hypot(x - t.x, z - t.z);
  const rise = floorY - t.y;
  let carried: boolean;
  if (run > MAX_STRIDE || Math.abs(rise) > STEP_UP) {
    carried = false;
    t.grade = null;
  } else if (run < STILL) {
    carried = Math.abs(rise) < STILL;
    t.grade = null; // standing still: the next move may set off any way, up the slope or down it
  } else {
    const hx = (x - t.x) / run, hz = (z - t.z) / run;
    // turned sharply — the walk has no inertia, so a reversal is one frame: up a hill to down it, on the same plane,
    // is a turn of twice its grade. The grade kept was along the old heading; the new one may set off any way.
    if (hx * t.hx + hz * t.hz < HEADING_KEEP) t.grade = null;
    const grade = rise / run;
    carried = Math.abs(grade) <= SLOPE_LIMIT && (t.grade === null || Math.abs(grade - t.grade) <= GRADE_TURN);
    t.grade = grade;
    t.hx = hx;
    t.hz = hz;
  }
  t.x = x;
  t.z = z;
  t.y = floorY;
  return carried ? rise : null;
}

export function fall(p: THREE.Vector3, vel: { current: THREE.Vector3 }, grounded: { current: boolean }, dt: number, groundEye: number, slopeUnderfoot: boolean, floorRise = 0): void {
  // Wave 65.2 · grounded on a slope, the eye rides the floor's own rise or fall (floorCarry's): the follow-lerp below
  // alone trailed a climb by (climb rate / 12) — 0.13 m at a walk up a 0.48 grade, 0.23 m at a sprint — and floated
  // a descent as far above it. A step or a mount, which are not a slope, still ease at the lerp's rate.
  if (grounded.current) p.y += floorRise;
  if (!grounded.current) {
    vel.current.y -= 14 * dt;
    p.y += vel.current.y * dt;
    if (vel.current.y <= 0 && p.y <= groundEye) {
      p.y = groundEye;
      vel.current.y = 0;
      grounded.current = true;
    }
  } else if (p.y > groundEye + 0.08 && !slopeUnderfoot) {
    // walked off an edge — Wave 12: unless the GROUND is what dropped, and
    // it was ground last frame too. This is a LEDGE test, and terrain has
    // no ledges; it slopes. The follow-lerp below trails a descent by
    // roughly (vertical speed / 12), which is 0.11m at nothing more than a
    // walk down the North Downs — unqualified, the test fired on every
    // single frame of the descent and the player bounced down the hill in
    // a stutter of little falls instead of running down it. A slope now
    // falls through to that lerp and stays grounded. BOTH frames have to be
    // open ground: stepping down off a crate is a real step down (that
    // floor genuinely ended one frame ago) and a battlement must still drop
    // you. The one thing it also smooths is dismounting — same ground
    // before and after, only the eye height changed — which used to be a
    // short involuntary fall and is now the ease that mounting always was.
    grounded.current = false;
    vel.current.y = 0;
  } else if (Math.abs(p.y - groundEye) > 0.005) {
    p.y += (groundEye - p.y) * Math.min(1, dt * 12);
  }
}
