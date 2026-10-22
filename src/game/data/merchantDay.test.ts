import { describe, expect, it } from 'vitest';
import {
  MERCHANT_TOP_SPEED, SCHEDULE_SLACK, TO_VILLAGE_BUFFER, TURN_REACH, VILLAGE_DWELL, VILLAGE_TO_SPOT_BUFFER, WALK_IN_HAND,
  WALK_STOP, firstStepOf, legOf, merchantGait, merchantSpeed, merchantStage, nearestOnWay, pointsWalked, putOnSchedule,
  scheduledPlace, secondsLeftAtPace, secondsLeftThrough, walkWay, walkWindow, wayThrough, type MerchantStage,
} from './merchantDay';

const WALK_SPEED = 1.2; // Merchant.tsx's own pace, off the road
const ROAD = 1.3; // road.ts's ROAD_SPEED_MULT
const offRoad = () => WALK_SPEED;

describe("the merchant's day", () => {
  it('keeps the stages it always kept (moved, not changed): its windows, and every bound a hair either side', () => {
    expect([TO_VILLAGE_BUFFER, VILLAGE_DWELL, VILLAGE_TO_SPOT_BUFFER]).toEqual([0.047, 0.021, 0.056]);
    // the bounds: 0.176, 0.223, 0.244 and 0.3 in the morning, 0.72, 0.776, 0.797 and 0.844 in the evening
    const at: [number, MerchantStage][] = [
      [0, 'away'], [0.1, 'away'], [0.17599, 'away'], [0.17601, 'to_village_am'], [0.22299, 'to_village_am'],
      [0.22301, 'village_am'], [0.24399, 'village_am'], [0.24401, 'arriving'], [0.3, 'arriving'], [0.30001, 'present'],
      [0.5, 'present'], [0.71999, 'present'], [0.72, 'leaving'], [0.77599, 'leaving'], [0.77601, 'village_pm'],
      [0.79699, 'village_pm'], [0.79701, 'to_offstage'], [0.84399, 'to_offstage'], [0.84401, 'away'], [0.99, 'away'],
    ];
    for (const [t, stage] of at) expect([t, merchantStage(t)]).toEqual([t, stage]);
  });

  it("gives each walk the window its stage keeps, and none to a stage that holds him or hides him", () => {
    for (const stage of ['to_village_am', 'arriving', 'leaving', 'to_offstage'] as MerchantStage[]) {
      const w = walkWindow(stage)!;
      const span = w.end - w.start;
      for (const f of [0.01, 0.25, 0.5, 0.75, 0.99]) expect(merchantStage(w.start + f * span)).toBe(stage);
      expect(merchantStage(w.start - 0.001)).not.toBe(stage);
      expect(merchantStage(w.end + 0.001)).not.toBe(stage);
    }
    for (const stage of ['away', 'village_am', 'present', 'village_pm'] as MerchantStage[]) expect(walkWindow(stage)).toBeNull();
  });
});

describe('what is left of a walk, in seconds at his own pace', () => {
  it('runs along the planned way from the next point he makes for, and on to where he stops, short of the end', () => {
    const nav = { pts: [{ x: 0, z: 0 }, { x: 3, z: 4 }, { x: 3, z: 10 }], i: 1 };
    // standing part way along the first leg, at (0.6, 0.8): 4 to (3, 4), 6 to (3, 10), then 2 toward (3, 12) less the
    // half metre short of it where he stops — the point behind him not counted: 11.5 m at 1.2 m/s
    expect(secondsLeftAtPace(0.6, 0.8, nav, 3, 12, offRoad)).toBeCloseTo((12 - WALK_STOP) / WALK_SPEED, 9);
  });

  it('is the straight line, less where he stops, when there is no plan or he is past its last point', () => {
    expect(secondsLeftAtPace(0, 0, undefined, 3, 4, offRoad)).toBeCloseTo((5 - WALK_STOP) / WALK_SPEED, 9);
    expect(secondsLeftAtPace(0, 0, { pts: [{ x: 1, z: 1 }], i: 1 }, 3, 4, offRoad)).toBeCloseTo((5 - WALK_STOP) / WALK_SPEED, 9);
    expect(secondsLeftAtPace(3, 3.8, undefined, 3, 4, offRoad)).toBe(0);
  });

  it('is nothing once he stands within where he stops, whatever the plan still holds', () => {
    // he stopped 0.48 m short of the end; the plan still runs on to a point past it
    const nav = { pts: [{ x: 0.9, z: 0.9 }], i: 0 };
    expect(secondsLeftAtPace(-0.48, 0, nav, 0, 0, offRoad)).toBe(0);
    expect(secondsLeftAtPace(-0.48, 0, { pts: [{ x: -0.48, z: 3 }, { x: 0.9, z: 0.9 }], i: 1 }, 0, 0, offRoad)).toBe(0);
    // ...and a step further out, the plan counts
    expect(secondsLeftAtPace(-0.52, 0, nav, 0, 0, offRoad)).toBeGreaterThan(0.5);
  });

  it("leaves out a plan's last point that is only the centre of the end's own cell, walked to by no one", () => {
    // he comes at the end (0, 0) from the west; the plan's last point, (0.5, 0.5), is the centre of the end's own cell:
    // 3 m to (-5, 0), then 4.5 m on to where he stops, at 1.2 m/s
    const nav = { pts: [{ x: -5, z: 0 }, { x: 0.5, z: 0.5 }], i: 0 };
    expect(secondsLeftAtPace(-8, 0, nav, 0, 0, offRoad)).toBeCloseTo(7.5 / WALK_SPEED, 9);
    // making for that last point, he is past the points he walks toward: the straight line
    expect(secondsLeftAtPace(-2, 0, { ...nav, i: 1 }, 0, 0, offRoad)).toBeCloseTo(1.5 / WALK_SPEED, 9);
  });

  it('takes each part at his pace there: quicker on the road', () => {
    // 10 m east along z 0, the road from x 4 on; he stops at x 9.5. Each step of the reckoning (a metre or less) is
    // taken at its pace in the middle, so a step across the road's edge counts all at one pace: within 0.05 s here
    const roadFrom4 = (x: number) => (x >= 4 ? WALK_SPEED * ROAD : WALK_SPEED);
    expect(secondsLeftAtPace(0, 0, undefined, 10, 0, roadFrom4)).toBeCloseTo(4 / WALK_SPEED + 5.5 / (WALK_SPEED * ROAD), 1);
  });

  it('gives the same answer from a plan whose seconds it keeps as from a fresh copy of it, as he walks it', () => {
    const roadFrom4 = (x: number) => (x >= 4 ? WALK_SPEED * ROAD : WALK_SPEED);
    const pts = [{ x: 0, z: 0 }, { x: 6, z: 0 }, { x: 6, z: 8 }];
    for (const [x, z, i] of [[0.5, 0, 1], [3, 0, 1], [6, 2, 2], [6, 7, 2]] as const) {
      const kept = secondsLeftAtPace(x, z, { pts, i }, 6, 12, roadFrom4);
      // the same reckoning on a copy of the plan, which has nothing kept with it
      const fresh = secondsLeftAtPace(x, z, { pts: pts.map((p) => ({ ...p })), i }, 6, 12, roadFrom4);
      expect(kept).toBeCloseTo(fresh, 9);
    }
  });

  it('reckons a plan afresh for another end, or at another pace, than the one its kept seconds were reckoned for', () => {
    const pts = [{ x: 0, z: 0 }, { x: 6, z: 0 }, { x: 6, z: 8 }];
    const copy = () => pts.map((p) => ({ ...p }));
    const quick = () => WALK_SPEED * 2;
    for (const [tx, tz, paceAt] of [[6, 20, offRoad], [9, 12, offRoad], [6, 12, quick]] as const) {
      secondsLeftAtPace(0.5, 0, { pts, i: 1 }, 6, 12, offRoad); // the plan's seconds kept for (6, 12) at his own pace
      const kept = secondsLeftAtPace(0.5, 0, { pts, i: 1 }, tx, tz, paceAt);
      expect([tx, tz, kept]).toEqual([tx, tz, secondsLeftAtPace(0.5, 0, { pts: copy(), i: 1 }, tx, tz, paceAt)]);
    }
  });
});

describe("a walk's way", () => {
  it("runs from its start through the plan's points to its end, leaving out the centre of the end's own cell", () => {
    // the grid's plan to the village corner (-40, 38.4) from the west ends at the centre of the corner's own cell,
    // (-39.5, 38.5), half a metre past it; a last point further off than any point of that cell is a corner, kept
    const from = { x: -70, z: 38.4 };
    const to = { x: -40, z: 38.4 };
    const plan = [{ x: -60.5, z: 38.5 }, { x: -39.5, z: 38.5 }];
    expect(pointsWalked(plan, to.x, to.z)).toBe(1);
    expect(walkWay(from, plan, to)).toEqual([from, plan[0], to]);
    expect(pointsWalked([plan[0], { x: -39.5, z: 39.5 }], to.x, to.z)).toBe(2);
    expect(walkWay(from, [plan[0], { x: -39.5, z: 39.5 }], to)).toEqual([from, plan[0], { x: -39.5, z: 39.5 }, to]);
    expect(walkWay(from, [], to)).toEqual([from, to]);
  });
});

describe("a walk through stops: where it starts him, the points it turns him at, where it takes him", () => {
  // a walk in like his: from the village corner, round by a point in his yard, to his spot
  const stops = [{ x: 0, z: 0 }, { x: -6, z: -8 }, { x: -2, z: -8 }];
  // plans as the grid gives them: corners, then the centre of the goal's own cell
  const plan = (from: { x: number; z: number }, to: { x: number; z: number }) =>
    to.x === -6 ? [{ x: -0.5, z: -4.5 }, { x: -5.5, z: -7.5 }] : [{ x: -1.5, z: -7.5 }];

  it("runs through each stretch's way in turn, with the index of each stop in it", () => {
    const { way, at } = wayThrough(stops, plan);
    // the first stretch's corner, its end (the goal cell's centre left out), the second's end (likewise)
    expect(way).toEqual([stops[0], { x: -0.5, z: -4.5 }, stops[1], stops[2]]);
    expect(at).toEqual([0, 2, 3]);
    expect(wayThrough([stops[0], stops[2]], () => [])).toEqual({ way: [stops[0], stops[2]], at: [0, 1] });
  });

  it('makes for the stop beyond the point of its way he makes for: the turn, up to it; past it, the end', () => {
    const at = [0, 2, 3];
    expect([1, 2, 3].map((next) => legOf(at, next))).toEqual([1, 1, 2]);
    expect(legOf([0, 1], 1)).toBe(1);
    expect(legOf([0, 1], 5)).toBe(1);
  });

  it('is what is left of each stretch, to the turn short of it by the reach he turns at, and to the end short of it', () => {
    const straight = () => [];
    // from (-6, -3), making for the turn: 5 m to it less the half metre he turns short of it, then 4 m on less the half
    // metre short of the end where he stops
    expect(secondsLeftThrough(-6, -3, stops, 1, straight, offRoad)).toBeCloseTo((5 - TURN_REACH + 4 - WALK_STOP) / WALK_SPEED, 9);
    // past the turn: only the last stretch
    expect(secondsLeftThrough(-5, -8, stops, 2, straight, offRoad)).toBeCloseTo((3 - WALK_STOP) / WALK_SPEED, 9);
    // along a plan's corners
    const bent = (_from: unknown, to: { x: number; z: number }) => (to.x === -6 ? [{ x: -6, z: 0 }] : []);
    expect(secondsLeftThrough(0, 0, stops, 1, bent, offRoad)).toBeCloseTo((6 + 8 - TURN_REACH + 4 - WALK_STOP) / WALK_SPEED, 9);
    // a stretch's end turned short of by TURN_REACH, not WALK_STOP: the same where they are alike, as now
    expect(secondsLeftAtPace(0, 0, undefined, 0, 5, offRoad, TURN_REACH)).toBeCloseTo((5 - TURN_REACH) / WALK_SPEED, 9);
    expect(secondsLeftAtPace(0, 0, undefined, 0, 5, offRoad, 2)).toBeCloseTo(3 / WALK_SPEED, 9);
    expect(secondsLeftAtPace(0, 3.5, undefined, 0, 5, offRoad, 2)).toBe(0);
  });

  it("reckons a plan's kept seconds afresh for another reach than the one they were kept for", () => {
    const pts = [{ x: 0, z: 0 }, { x: 6, z: 0 }, { x: 6, z: 8 }];
    const atWalkStop = secondsLeftAtPace(0.5, 0, { pts, i: 1 }, 6, 12, offRoad);
    const atTwo = secondsLeftAtPace(0.5, 0, { pts, i: 1 }, 6, 12, offRoad, 2);
    expect(atWalkStop - atTwo).toBeCloseTo((2 - WALK_STOP) / WALK_SPEED, 9);
  });
});

describe("the point of a way nearest where he stands", () => {
  const way = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }];
  it('is on the leg nearest him, with the point of the way he makes for from there', () => {
    expect(nearestOnWay(way, 4, 2)).toEqual({ x: 4, z: 0, next: 1 });
    expect(nearestOnWay(way, 12, 6)).toEqual({ x: 10, z: 6, next: 2 });
    // off the start, the start; off the end, the end (its last point, as scheduledPlace gives it there)
    expect(nearestOnWay(way, -3, -1)).toEqual({ x: 0, z: 0, next: 1 });
    expect(nearestOnWay(way, 11, 14)).toEqual({ x: 10, z: 10, next: 2 });
  });

  it('is the earliest of points as near, and makes for the corner standing on it', () => {
    // as near the first leg as the second: the first
    expect(nearestOnWay(way, 12, -2).next).toBe(1);
    expect(nearestOnWay(way, 10, 0)).toEqual({ x: 10, z: 0, next: 1 });
    expect(nearestOnWay([{ x: 2, z: 2 }], 0, 0)).toEqual({ x: 2, z: 2, next: 0 });
  });
});

describe('where he steers first, standing with a plan before him', () => {
  const at = { x: 0, z: 0 };
  const plan = [{ x: 0.3, z: 0 }, { x: 2.5, z: 0.5 }, { x: 2.5, z: 6.5 }];
  const end = { x: 9, z: 9 };

  it('is the first point of his plan a reach or more from him: nearer ones he counts as reached', () => {
    expect(firstStepOf(at, plan, end, TURN_REACH)).toEqual(plan[1]);
    expect(firstStepOf(at, plan, end, 0.2)).toEqual(plan[0]);
    // reached, a point stays passed even where a later one comes nearer again
    expect(firstStepOf(at, [{ x: 0.3, z: 0 }, { x: 3, z: 0 }, { x: 0.1, z: 0.1 }], end, TURN_REACH)).toEqual({ x: 3, z: 0 });
  });

  it("past them all, or with no plan, is the end itself; a last point that is only the centre of the end's own cell is left out", () => {
    expect(firstStepOf(at, [], end, TURN_REACH)).toEqual(end);
    expect(firstStepOf(at, [plan[0]], end, TURN_REACH)).toEqual(end);
    // the grid's plan to (3.2, 0.2) ends at the centre of its cell, (3.5, 0.5): he steers for the end itself
    expect(firstStepOf(at, [{ x: 3.5, z: 0.5 }], { x: 3.2, z: 0.2 }, TURN_REACH)).toEqual({ x: 3.2, z: 0.2 });
  });
});

describe('where his schedule puts him on a walk the clock has moved on without him', () => {
  const way = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 20 }];
  it('is the start at the window\'s opening, and the end once the walk is due to be over, facing along the way', () => {
    expect(scheduledPlace(way, 0, 0, offRoad)).toEqual({ x: 0, z: 0, dx: 1, dz: 0, next: 1 });
    expect(scheduledPlace(way, 1000, 0.9, offRoad)).toEqual({ x: 10, z: 20, dx: 0, dz: 1, next: 2 });
  });

  it('faces along the leg he is put on, passing over a leg of no length, and nowhere on a way of no length', () => {
    const doubled = [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 20 }];
    expect(scheduledPlace(doubled, 0, 0, offRoad)).toEqual({ x: 0, z: 0, dx: 1, dz: 0, next: 2 });
    const p = scheduledPlace(doubled, 12 / WALK_SPEED, 0, offRoad);
    expect([p.x, p.z, p.dx, p.dz]).toEqual([10, expect.closeTo(2, 9), 0, 1]);
    expect(scheduledPlace([{ x: 3, z: 3 }, { x: 3, z: 3 }], 5, 0.5, offRoad)).toEqual({ x: 3, z: 3, dx: 0, dz: 0, next: 1 });
  });

  it("faces on the way he was going at the end of a walk whose plan ran past it", () => {
    // the walk out comes at the village corner from the west: put at its end, he faces east, not back west
    const way = walkWay({ x: -70, z: 38.4 }, [{ x: -60.5, z: 38.5 }, { x: -39.5, z: 38.5 }], { x: -40, z: 38.4 });
    const at = scheduledPlace(way, 1000, 1, offRoad);
    expect([at.x, at.z]).toEqual([-40, 38.4]);
    expect(at.dx).toBeGreaterThan(0.99);
  });

  it('is as far as his own pace since the window opened, or the window\'s share of the walk, whichever is further', () => {
    // a 30 m walk, 25 s at his own pace: 6 s gone of a window of which a tenth has gone — his own pace wins (7.2 m)
    const p = scheduledPlace(way, 6, 0.1, offRoad);
    expect(p.x).toBeCloseTo(7.2, 9);
    expect(p.z).toBeCloseTo(0, 9);
    // 6 s gone of a short day's window of which half has gone — the share wins (15 m: 5 m up the second leg)
    const q = scheduledPlace(way, 6, 0.5, offRoad);
    expect(q.x).toBeCloseTo(10, 9);
    expect(q.z).toBeCloseTo(5, 9);
    // and the point of the way he makes for from each: the first leg's end, then the second's
    expect([p.next, q.next]).toEqual([1, 2]);
  });

  it('reckons the way at his pace on it: quicker on the road', () => {
    // the road along the whole second leg: 10 m off it (8.33 s), then the road at 1.56 m/s
    const roadUp = (x: number) => (x >= 10 ? WALK_SPEED * ROAD : WALK_SPEED);
    const p = scheduledPlace(way, 10 / WALK_SPEED + 2, 0, roadUp);
    expect(p.x).toBeCloseTo(10, 9);
    expect(p.z).toBeCloseTo(2 * WALK_SPEED * ROAD, 6);
  });
});

describe('his gait', () => {
  it('takes up a run above 2.2 times his pace and leaves it below 1.8, not flicking between the two near twice', () => {
    expect(merchantGait(2.1, false).running).toBe(false);
    expect(merchantGait(2.3, false).running).toBe(true);
    expect(merchantGait(1.9, true).running).toBe(true);
    expect(merchantGait(1.7, true).running).toBe(false);
  });

  it("quickens the walk's cadence with his hurry, and the run's at half of it", () => {
    expect(merchantGait(1, false)).toEqual({ running: false, cadence: 1 });
    expect(merchantGait(1.6, false)).toEqual({ running: false, cadence: 1.6 });
    expect(merchantGait(3, true)).toEqual({ running: true, cadence: 1.5 });
  });
});

describe('whether keeping to his schedule puts him where it says', () => {
  it('does, out of hiding, wherever he stood', () => {
    expect(putOnSchedule(true, 40, 10)).toBe(true);
    expect(putOnSchedule(true, 0, 10)).toBe(true); // stood at the walk's end, ahead of it
  });

  it('does when he has fallen behind it by more than the slack, and never puts him back', () => {
    expect(putOnSchedule(false, 40, 10)).toBe(true);
    expect(putOnSchedule(false, 10 + SCHEDULE_SLACK + 0.01, 10)).toBe(true);
    expect(putOnSchedule(false, 10 + SCHEDULE_SLACK, 10)).toBe(false);
    expect(putOnSchedule(false, 10.2, 10)).toBe(false);
    expect(putOnSchedule(false, 10, 10)).toBe(false);
    expect(putOnSchedule(false, 0, 10)).toBe(false); // at the walk's end, ahead of it: a knock-out while he trades
  });
});

describe('how fast he walks', () => {
  it('is his own pace where he is while the walk, at his own pace, fits its window with a tenth in hand', () => {
    expect(merchantSpeed(WALK_SPEED, 30, 40, 40)).toBe(WALK_SPEED);
    expect(merchantSpeed(WALK_SPEED * ROAD, 36, 40, 40)).toBe(WALK_SPEED * ROAD);
  });

  it('is his own pace quickened just enough to keep that tenth in hand when it would not', () => {
    // 45 s of walk at his own pace in 40 s less 4 in hand: 1.25 times his pace, on the road or off it
    expect(merchantSpeed(WALK_SPEED, 45, 40, 40)).toBeCloseTo(WALK_SPEED * (45 / (40 - WALK_IN_HAND * 40)), 9);
    expect(merchantSpeed(WALK_SPEED * ROAD, 45, 40, 40)).toBeCloseTo(WALK_SPEED * ROAD * 1.25, 9);
  });

  it('is at most a run, and a run once the tenth in hand is spent with the walk not over', () => {
    expect(merchantSpeed(WALK_SPEED, 100, 10, 40)).toBe(MERCHANT_TOP_SPEED);
    // 3 s left of a 40 s window that he meant to end with 4 in hand
    expect(merchantSpeed(WALK_SPEED, 5, 3, 40)).toBe(MERCHANT_TOP_SPEED);
    expect(merchantSpeed(WALK_SPEED, 5, 4, 40)).toBe(MERCHANT_TOP_SPEED);
  });
});

// Each walk as long, at his own pace, as it was measured to take at a 30-minute day, when he never hurried, along the
// ways the cart fix finds for him — wide enough for his team, his walk in brought round his yard (merchant_day_probe.mjs,
// in the cart fix's trial under next dev, 2026-10-20: out/cart/try/day30_dev3.txt), counted to where he stops: laid out
// here as a straight walk with its first seven tenths on the road (where his own pace is 1.3 times quicker) and the
// rest off it. (On main, before the cart fix, they were 29.45, 34.98, 38.42 and 29.63 s: the timing fix's second
// evidence pass, 2026-10-17.)
const WALKS: { stage: MerchantStage; ownSeconds: number }[] = [
  { stage: 'to_village_am', ownSeconds: 30.18 },
  { stage: 'arriving', ownSeconds: 40.28 },
  { stage: 'leaving', ownSeconds: 38.93 },
  { stage: 'to_offstage', ownSeconds: 31.93 },
];
const ON_ROAD = 0.7;

/** a walk stepped as Merchant.tsx steps it (frames of a sixtieth of a second, ending within WALK_STOP of its end), at a
 *  day length, entered at `share` of its window (0: at its opening) and put where scheduledPlace puts him */
function walk(stage: MerchantStage, ownSeconds: number, dayMinutes: number, share = 0) {
  const metres = WALK_STOP + ownSeconds / (ON_ROAD / (WALK_SPEED * ROAD) + (1 - ON_ROAD) / WALK_SPEED);
  const paceAt = (pos: number) => (pos < ON_ROAD * metres ? WALK_SPEED * ROAD : WALK_SPEED);
  const day = dayMinutes * 60;
  const w = walkWindow(stage)!;
  const windowSeconds = (w.end - w.start) * day;
  let t = w.start + share * (w.end - w.start);
  let pos = share > 0 ? scheduledPlace([{ x: 0, z: 0 }, { x: metres, z: 0 }], share * windowSeconds, share, (x) => paceAt(x)).x : 0;
  let fastest = 0;
  let quickened = 1; // no quicker than his own pace, until a step says otherwise
  const dt = 1 / 60;
  while (metres - pos > WALK_STOP && t < w.end) {
    const ownLeft = secondsLeftAtPace(pos, 0, undefined, metres, 0, (x) => paceAt(x));
    const speed = merchantSpeed(paceAt(pos), ownLeft, (w.end - t) * day, windowSeconds);
    fastest = Math.max(fastest, speed);
    quickened = Math.max(quickened, speed / paceAt(pos));
    pos += speed * dt;
    t += dt / day;
  }
  return { arrived: metres - pos <= WALK_STOP, spareSeconds: (w.end - t) * day, windowSeconds, fastest, quickened };
}

/** his walk in as the cart fix lays it — through the two points in his yard it turns him at, down its west side and
 *  then east to his spot — stepped as Merchant.tsx steps it: making for each turn until within TURN_REACH of it, then
 *  for the next stop; what is left reckoned to the stop he makes for and on through the rest (secondsLeftAtPace,
 *  secondsLeftThrough); the yard's two stretches (4.5 m and 3.7 m, Merchant.tsx's CAMP_WEST to CAMP_TURN to his spot)
 *  off the road, each at right angles to the one before, and the rest straight, its first seven tenths on the road */
function walkThroughYard(ownSeconds: number, dayMinutes: number) {
  const side = 4.5, east = 3.7;
  const stretch = (ownSeconds - (side + east - WALK_STOP) / WALK_SPEED) / (ON_ROAD / (WALK_SPEED * ROAD) + (1 - ON_ROAD) / WALK_SPEED);
  const stops = [{ x: 0, z: 0 }, { x: stretch, z: 0 }, { x: stretch, z: side }, { x: stretch + east, z: side }];
  const paceAt = (x: number, z: number) => (z === 0 && x < ON_ROAD * stretch ? WALK_SPEED * ROAD : WALK_SPEED);
  const straight = () => [];
  const day = dayMinutes * 60;
  const w = walkWindow('arriving')!;
  const windowSeconds = (w.end - w.start) * day;
  let t = w.start;
  let x = 0, z = 0, leg = 1, quickened = 1;
  const turnedAt: number[] = [];
  const dt = 1 / 60;
  for (;;) {
    while (leg < stops.length - 1 && Math.hypot(stops[leg].x - x, stops[leg].z - z) <= TURN_REACH) {
      turnedAt.push(Math.hypot(stops[leg].x - x, stops[leg].z - z));
      leg++;
    }
    const end = stops[leg];
    const last = leg === stops.length - 1;
    const dist = Math.hypot(end.x - x, end.z - z);
    if ((last && dist <= WALK_STOP) || t >= w.end) break;
    const own = secondsLeftAtPace(x, z, undefined, end.x, end.z, paceAt, last ? WALK_STOP : TURN_REACH)
      + (last ? 0 : secondsLeftThrough(end.x, end.z, stops, leg + 1, straight, paceAt));
    const speed = merchantSpeed(paceAt(x, z), own, (w.end - t) * day, windowSeconds);
    quickened = Math.max(quickened, speed / paceAt(x, z));
    const step = Math.min(speed * dt, dist);
    x += ((end.x - x) / dist) * step;
    z += ((end.z - z) / dist) * step;
    t += dt / day;
  }
  const atSpot = Math.hypot(stops[3].x - x, stops[3].z - z);
  return { arrived: atSpot <= WALK_STOP, spareSeconds: (w.end - t) * day, windowSeconds, quickened, turnedAt };
}

describe('at every length of day the Options offer (4 to 30 minutes)', () => {
  it("his walk in, round his yard, ends inside its window, and unhurried at any day it fits with a tenth to spare", () => {
    const own = WALKS[1].ownSeconds;
    for (let minutes = 4; minutes <= 30; minutes++) {
      const r = walkThroughYard(own, minutes);
      expect([minutes, r.arrived]).toEqual([minutes, true]);
      expect(r.spareSeconds).toBeGreaterThan(0.09 * r.windowSeconds);
      // he turned at both, each a step or less within TURN_REACH of it (a step: at most a sixtieth of a second at
      // MERCHANT_TOP_SPEED, a tenth of a metre)
      expect(r.turnedAt.length).toBe(2);
      for (const d of r.turnedAt) expect(d).toBeLessThanOrEqual(TURN_REACH);
      for (const d of r.turnedAt) expect(d).toBeGreaterThan(TURN_REACH - 0.11);
      if (own <= (1 - WALK_IN_HAND) * r.windowSeconds) expect([minutes, r.quickened]).toEqual([minutes, 1]);
    }
  });

  it('he ends every walk inside its window, keeping time rather than being set down at its end', () => {
    for (let minutes = 4; minutes <= 30; minutes++) {
      for (const { stage, ownSeconds } of WALKS) {
        const r = walk(stage, ownSeconds, minutes);
        expect([minutes, stage, r.arrived]).toEqual([minutes, stage, true]);
        // with most of the tenth he keeps in hand still to run
        expect(r.spareSeconds).toBeGreaterThan(0.09 * r.windowSeconds);
        expect(r.fastest).toBeLessThanOrEqual(MERCHANT_TOP_SPEED);
      }
    }
  });

  it('at the default 12 minutes and longer he keeps his own pace throughout every walk that fits with a tenth to spare', () => {
    for (let minutes = 12; minutes <= 30; minutes++) {
      for (const { stage, ownSeconds } of WALKS) {
        const r = walk(stage, ownSeconds, minutes);
        if (ownSeconds <= (1 - WALK_IN_HAND) * r.windowSeconds) expect([minutes, stage, r.quickened]).toEqual([minutes, stage, 1]);
      }
    }
    // at 12 minutes that is one of the four, as these walks' lengths give them: the morning walk, which comes within
    // three tenths of a second of its tenth (in play it may be quickened, by a hundredth for a moment); the walk in,
    // brought round his yard, the walk out and the evening walk, wide enough for his team, are quickened — by about a
    // tenth at most (on main, before the cart fix, only the walk out was, by 1.11 in play)
    const hurried = WALKS.filter(({ stage, ownSeconds }) => walk(stage, ownSeconds, 12).quickened > 1).map((w) => w.stage);
    expect(hurried).toEqual(['arriving', 'leaving', 'to_offstage']);
    expect(Math.max(...WALKS.map(({ stage, ownSeconds }) => walk(stage, ownSeconds, 12).quickened))).toBeLessThan(1.13);
  });

  it('a walk entered part-way — the walk in after a night\'s sleep, at 0.27 of the day — ends inside its window, and unhurried at any day it fits with a tenth to spare', () => {
    const w = walkWindow('arriving')!;
    const share = (0.27 - w.start) / (w.end - w.start);
    let unhurried = 0;
    for (let minutes = 4; minutes <= 30; minutes++) {
      const r = walk('arriving', WALKS[1].ownSeconds, minutes, share);
      expect([minutes, r.arrived]).toEqual([minutes, true]);
      expect(r.spareSeconds).toBeGreaterThan(0.09 * r.windowSeconds);
      if (WALKS[1].ownSeconds <= (1 - WALK_IN_HAND) * r.windowSeconds) {
        expect([minutes, r.quickened]).toEqual([minutes, 1]);
        unhurried++;
      }
    }
    // from 14 minutes on: the walk in, brought round his yard, fits its window with a tenth to spare from 13.32
    expect(unhurried).toBe(17);
  });
});
