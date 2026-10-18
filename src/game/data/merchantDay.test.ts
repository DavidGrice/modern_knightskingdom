import { describe, expect, it } from 'vitest';
import {
  MERCHANT_TOP_SPEED, SCHEDULE_SLACK, TO_VILLAGE_BUFFER, VILLAGE_DWELL, VILLAGE_TO_SPOT_BUFFER, WALK_IN_HAND, WALK_STOP,
  merchantGait, merchantSpeed, merchantStage, pointsWalked, putOnSchedule, scheduledPlace, secondsLeftAtPace, walkWay,
  walkWindow, type MerchantStage,
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

describe('where his schedule puts him on a walk the clock has moved on without him', () => {
  const way = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 20 }];
  it('is the start at the window\'s opening, and the end once the walk is due to be over, facing along the way', () => {
    expect(scheduledPlace(way, 0, 0, offRoad)).toEqual({ x: 0, z: 0, dx: 1, dz: 0 });
    expect(scheduledPlace(way, 1000, 0.9, offRoad)).toEqual({ x: 10, z: 20, dx: 0, dz: 1 });
  });

  it('faces along the leg he is put on, passing over a leg of no length, and nowhere on a way of no length', () => {
    const doubled = [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 20 }];
    expect(scheduledPlace(doubled, 0, 0, offRoad)).toEqual({ x: 0, z: 0, dx: 1, dz: 0 });
    const p = scheduledPlace(doubled, 12 / WALK_SPEED, 0, offRoad);
    expect([p.x, p.z, p.dx, p.dz]).toEqual([10, expect.closeTo(2, 9), 0, 1]);
    expect(scheduledPlace([{ x: 3, z: 3 }, { x: 3, z: 3 }], 5, 0.5, offRoad)).toEqual({ x: 3, z: 3, dx: 0, dz: 0 });
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

// Each walk as long, at his own pace, as it was measured to take on main at a 30-minute day, when he never hurried
// (merchant_day_probe.mjs, the timing fix's second evidence pass, 2026-10-17: out/merchanttime/ev2/day_main_30min.txt),
// counted to where he stops: laid out here as a straight walk with its first seven tenths on the road (where his own
// pace is 1.3 times quicker) and the rest off it.
const WALKS: { stage: MerchantStage; ownSeconds: number }[] = [
  { stage: 'to_village_am', ownSeconds: 29.45 },
  { stage: 'arriving', ownSeconds: 34.98 },
  { stage: 'leaving', ownSeconds: 38.42 },
  { stage: 'to_offstage', ownSeconds: 29.63 },
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

describe('at every length of day the Options offer (4 to 30 minutes)', () => {
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
    // at 12 minutes that is three of the four, as these walks' lengths give them: the walk out, round the camp's east
    // wing, is the one that hurries (in play the evening walk, which comes within a second of its tenth, may be
    // quickened as well, by a hundredth for a moment)
    const hurried = WALKS.filter(({ stage, ownSeconds }) => walk(stage, ownSeconds, 12).quickened > 1).map((w) => w.stage);
    expect(hurried).toEqual(['leaving']);
  });

  it('a walk entered part-way — the walk in after a night\'s sleep, at 0.27 of the day — ends inside its window, and at the default day unhurried', () => {
    const w = walkWindow('arriving')!;
    const share = (0.27 - w.start) / (w.end - w.start);
    for (let minutes = 4; minutes <= 30; minutes++) {
      const r = walk('arriving', WALKS[1].ownSeconds, minutes, share);
      expect([minutes, r.arrived]).toEqual([minutes, true]);
      expect(r.spareSeconds).toBeGreaterThan(0.09 * r.windowSeconds);
      if (minutes >= 12) expect([minutes, r.quickened]).toEqual([minutes, 1]);
    }
  });
});
