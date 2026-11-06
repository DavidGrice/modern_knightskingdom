import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fall, floorCarry, newFloorTrack, GRADE_TURN, SLOPE_LIMIT, type FloorTrack } from './vertical';
import { STEP_UP } from './floor';
import { EYE_HEIGHT } from '@/game/data/world';

/** a frame clock that jitters between `lo` and `hi` seconds, the same every run */
const jitter = (lo: number, hi: number) => {
  let s = 12345;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return lo + (hi - lo) * (s / 2147483648);
  };
};

/** a floor along +x: a slope of `grade` from x = 0 (level before it) */
const slope = (grade: number) => (x: number) => 10 + grade * Math.max(0, x);
/** a staircase along +x from x = 0: `rise` a step (negative: down), every `tread` metres */
const stairs = (rise: number, tread: number) => (x: number) => 10 + rise * Math.max(0, Math.floor(x / tread + 1));
/** a level floor that drops `drop` metres at x = 0 (a battlement's edge) */
const ledge = (drop: number) => (x: number) => (x < 0 ? 10 + drop : 10);

/** walk the floor `floor` from x = `from` at `speed` m/s (or a speed by the time, negative back along -x) for `seconds`,
 *  on the frame clock `dt` — the vertical half of walk (locomotion.ts) at a destination: floorCarry, the two-frame
 *  slope test, then fall */
function stroll(floor: (x: number) => number, from: number, speed: number | ((time: number) => number), seconds: number, dt: () => number) {
  const t: FloorTrack = newFloorTrack();
  const p = new THREE.Vector3(from, floor(from) + EYE_HEIGHT, 0);
  const vel = { current: new THREE.Vector3() };
  const grounded = { current: true };
  let was = true;
  // a second stood still first, as on arrival
  for (let i = 0; i < 64; i++) {
    const rise = floorCarry(t, p.x, p.z, floor(p.x));
    fall(p, vel, grounded, 1 / 64, floor(p.x) + EYE_HEIGHT, rise !== null && was, rise ?? 0);
    was = rise !== null;
  }
  const rows: { x: number; eye: number; floor: number; grounded: boolean; carried: boolean }[] = [];
  for (let time = 0; time < seconds;) {
    const d = dt();
    time += d;
    p.x += (typeof speed === 'number' ? speed : speed(time)) * d;
    const floorY = floor(p.x);
    const rise = floorCarry(t, p.x, p.z, floorY);
    fall(p, vel, grounded, d, floorY + EYE_HEIGHT, rise !== null && was, rise ?? 0);
    was = rise !== null;
    rows.push({ x: p.x, eye: p.y, floor: floorY, grounded: grounded.current, carried: rise !== null });
  }
  return rows;
}

const SPEEDS = [4, 7, 11]; // a walk, a sprint, a gallop

describe('floorCarry, a slope told from a step by the floor under the player', () => {
  it("carries a slope's own rise every frame, up or down, at any speed and a jittering frame clock", () => {
    for (const grade of [0.1, 0.23, 0.48, 0.9, 1.4]) for (const sign of [1, -1]) for (const speed of [...SPEEDS, 15]) {
      // a frame of the longest dt (0.05 s) rising more than STEP_UP is refused, rightly: those are left out
      if (grade * speed * 0.05 > STEP_UP) continue;
      const t = newFloorTrack();
      const tick = jitter(1 / 144, 0.05);
      // level ground first, then onto the slope: a turn onto a grade steeper than GRADE_TURN is not carried for its
      // first frame or two
      let x = -2, prev = 10, nulls = 0, frames = 0;
      floorCarry(t, x, 0, prev);
      while (x < 6) {
        x += speed * tick();
        const y = 10 + sign * grade * Math.max(0, x);
        const rise = floorCarry(t, x, 0, y);
        if (rise === null) nulls++;
        else expect(rise).toBeCloseTo(y - prev, 9);
        prev = y;
        frames++;
      }
      expect(nulls, `grade ${sign * grade} at ${speed} m/s`).toBeLessThanOrEqual(grade > GRADE_TURN ? 2 : 0);
      expect(frames).toBeGreaterThan(8);
    }
  });

  it("never carries a stair's riser at frame rates from 45 to 144 a second, up or down, at a walk or a sprint", () => {
    for (const rise of [0.15, 0.2, 0.3, -0.15, -0.2, -0.3]) for (const speed of [4, 7]) {
      const floor = stairs(rise, 0.28), t = newFloorTrack(), tick = jitter(1 / 144, 1 / 45);
      let x = -1, prev = floor(x), risers = 0;
      floorCarry(t, x, 0, prev);
      while (x < 4) {
        x += speed * tick();
        const y = floor(x);
        const carried = floorCarry(t, x, 0, y);
        if (Math.abs(y - prev) > 0.1) {
          risers++;
          expect(carried, `riser ${rise} at ${speed} m/s, x ${x.toFixed(3)}`).toBeNull();
        }
        prev = y;
      }
      expect(risers).toBeGreaterThan(10);
    }
  });

  it('never carries a drop or a rise of more than STEP_UP in a frame, whatever the stride or the grade before it', () => {
    for (const jump of [STEP_UP + 0.01, 1, 3, 8]) for (const sign of [1, -1]) for (const stride of [0.02, 0.07, 0.4, 0.75]) {
      const t = newFloorTrack();
      // a steady slope as steep as the stride allows, so only the size of the jump can refuse it
      let x = 0, y = 10;
      floorCarry(t, x, 0, y);
      for (let i = 0; i < 5; i++) { x += stride; y += sign * 0.5 * stride; floorCarry(t, x, 0, y); }
      expect(floorCarry(t, x + stride, 0, y + sign * jump)).toBeNull();
    }
  });

  it('never reads a grade steeper than SLOPE_LIMIT as a slope, however gently it steepens', () => {
    const t = newFloorTrack();
    let x = 0, y = 0;
    floorCarry(t, x, 0, y);
    for (let i = 0; i <= 30; i++) {
      const grade = i / 10;
      x += 0.05;
      y -= grade * 0.05;
      const rise = floorCarry(t, x, 0, y);
      if (Math.abs(grade - SLOPE_LIMIT) > 0.01) expect(rise === null, `grade ${grade}`).toBe(grade > SLOPE_LIMIT);
    }
  });

  it('keeps carrying a hillside when the heading turns sharply on it: a reversal, a turn across it', () => {
    for (const grade of [0.48, 0.9, 1.2]) for (const step of [4 / 64, 7 / 64, 7 / 30]) {
      if (grade * step > STEP_UP) continue;
      // the plane y = grade·x: up it along +x, straight back down it, then across it along +z
      const t = newFloorTrack();
      let x = 0, z = 0;
      floorCarry(t, x, z, 0);
      for (let i = 0; i < 6; i++) { x += step; floorCarry(t, x, z, grade * x); }
      x -= step;
      expect(floorCarry(t, x, z, grade * x), `reversed on ${grade} by ${step}`).toBeCloseTo(-grade * step, 9);
      x -= step;
      expect(floorCarry(t, x, z, grade * x)).toBeCloseTo(-grade * step, 9);
      z += step;
      expect(floorCarry(t, x, z, grade * x), `turned across ${grade} by ${step}`).toBe(0);
    }
  });

  it('holds still ground as level, and reads a relocation as a break even onto ground at the same height', () => {
    const t = newFloorTrack();
    floorCarry(t, 5, 5, 3);
    expect(floorCarry(t, 5, 5, 3)).toBe(0);
    expect(floorCarry(t, 5, 5, 3)).toBe(0);
    expect(floorCarry(t, 300, 5, 3)).toBeNull();
    expect(floorCarry(t, 300.06, 5, 3)).toBe(0);
  });

  it('sets off from a standstill on a slope any way, up it or down it, at a walk or a sprint', () => {
    for (const grade of [0.48, 1.2]) for (const step of [4 / 64, 7 / 64]) {
      const t = newFloorTrack();
      // up the slope, a stop, then back down it
      for (let i = 0; i <= 16; i++) floorCarry(t, i * step, 0, grade * i * step);
      expect(floorCarry(t, 16 * step, 0, grade * 16 * step)).toBe(0);
      expect(floorCarry(t, 15 * step, 0, grade * 15 * step)).toBeCloseTo(-grade * step, 9);
      expect(floorCarry(t, 14 * step, 0, grade * 14 * step)).toBeCloseTo(-grade * step, 9);
    }
  });
});


describe("the player's eye on a slope, a step and a ledge (fall, with floorCarry)", () => {
  it('runs down a 0.48 grade without leaving the ground, the eye on its place and never rising', () => {
    for (const speed of SPEEDS) for (const tick of [() => 1 / 64, jitter(1 / 144, 0.05)]) {
      const rows = stroll(slope(-0.48), -0.5, speed, 2, tick);
      expect(rows.every((r) => r.grounded), `${speed} m/s`).toBe(true);
      for (let i = 1; i < rows.length; i++) expect(rows[i].eye).toBeLessThanOrEqual(rows[i - 1].eye + 1e-9);
      // after its first two frames on the slope, the eye stands where it belongs
      const onSlope = rows.filter((r) => r.x > 0.8);
      expect(Math.max(...onSlope.map((r) => Math.abs(r.eye - r.floor - EYE_HEIGHT)))).toBeLessThan(0.02);
    }
  });

  it('sets off down a 1.2 grade from a standstill on it, at a walk and a sprint, without leaving the ground', () => {
    for (const speed of [4, 7]) {
      const rows = stroll(slope(-1.2), 1, speed, 1, () => 1 / 64);
      expect(rows.every((r) => r.grounded), `${speed} m/s`).toBe(true);
      expect(Math.max(...rows.map((r) => Math.abs(r.eye - r.floor - EYE_HEIGHT)))).toBeLessThan(0.01);
    }
  });

  it('turns back down a hill mid-climb, at a walk and a sprint, without leaving the ground', () => {
    for (const grade of [0.48, 1.2]) for (const speed of [4, 7]) for (const tick of [() => 1 / 64, () => 1 / 30]) {
      if (grade * speed * tick() > STEP_UP) continue;
      // up the hill for half a second, then the back key: the walk turns about in a single frame
      const rows = stroll(slope(grade), 1, (time) => (time < 0.5 ? speed : -speed), 0.9, tick);
      expect(rows.every((r) => r.grounded), `${grade} at ${speed} m/s, dt ${tick().toFixed(3)}`).toBe(true);
      expect(Math.max(...rows.map((r) => Math.abs(r.eye - r.floor - EYE_HEIGHT)))).toBeLessThan(0.01);
    }
  });

  it('climbs a 0.48 grade with the eye where it belongs, not trailing by the climb rate', () => {
    for (const speed of SPEEDS) for (const tick of [() => 1 / 64, jitter(1 / 144, 0.05)]) {
      const rows = stroll(slope(0.48), -0.5, speed, 2, tick).filter((r) => r.x > 0.8);
      expect(rows.every((r) => r.grounded)).toBe(true);
      expect(Math.max(...rows.map((r) => r.floor + EYE_HEIGHT - r.eye)), `${speed} m/s`).toBeLessThan(0.02);
    }
  });

  it('eases up a 0.5 m step as it always did: never above its place, the lag only shrinking, gone in a third of a second', () => {
    for (const speed of [4, 7]) {
      const floor = (x: number) => (x < 0 ? 10 : 10.5);
      const rows = stroll(floor, -0.3, speed, 1, () => 1 / 64).filter((r) => r.x >= 0);
      const lag = rows.map((r) => r.floor + EYE_HEIGHT - r.eye);
      expect(lag[0]).toBeGreaterThan(0.3); // eased, not popped up the step
      for (let i = 1; i < lag.length; i++) expect(lag[i]).toBeLessThanOrEqual(lag[i - 1] + 1e-9);
      expect(Math.min(...lag)).toBeGreaterThanOrEqual(-1e-9);
      expect(lag[Math.round(0.33 * 64)]).toBeLessThan(0.01);
    }
  });

  it('drops off a battlement at once, at a walk, a sprint and a gallop, and falls under gravity rather than gliding', () => {
    for (const drop of [0.6, 3]) for (const speed of SPEEDS) for (const tick of [() => 1 / 64, jitter(1 / 144, 0.05)]) {
      // up to the edge along a slope, the worst case: the frames before were carried
      const floor = (x: number) => (x < 0 ? 10 + drop - 0.3 * x : 10);
      const rows = stroll(floor, -1, speed, 1, tick);
      const edge = rows.findIndex((r) => r.x >= 0);
      expect(rows[edge].grounded, `${drop} m at ${speed} m/s`).toBe(false);
      // nothing stood the player in the air above the floor while grounded
      expect(rows.every((r) => !r.grounded || r.eye - r.floor - EYE_HEIGHT < 0.08)).toBe(true);
    }
  });

  it('drops down a stair a step at a time, as before, at a walk and a sprint', () => {
    for (const speed of [4, 7]) {
      const rows = stroll(stairs(-0.25, 0.28), -0.5, speed, 3, jitter(1 / 144, 1 / 45));
      let risers = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i - 1].floor - rows[i].floor < 0.2) continue;
        expect(rows[i].carried, `${speed} m/s, x ${rows[i].x.toFixed(3)}`).toBe(false);
        // stepped off from standing on a tread (not still falling from the last one): a short fall
        if (rows[i - 1].grounded) {
          risers++;
          expect(rows[i].grounded, `${speed} m/s, x ${rows[i].x.toFixed(3)}`).toBe(false);
        }
      }
      expect(risers).toBeGreaterThan(2);
    }
  });
});
