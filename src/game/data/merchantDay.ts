// The travelling merchant's day: the windows his stages keep, as fractions of the day, the pace that keeps them at any
// length of day, and where his schedule puts him when the clock moves on without him. The windows and their stage
// function moved here unchanged from components/world/Merchant.tsx — the function and its type as merchantStage and
// MerchantStage, their notes repointed to where they now speak from — so that the schedule and the pace can be tested
// as plain functions; the merchant himself — his walk, his figure, his cart, OFF_STAGE and VILLAGE_STOP — stays there,
// and MERCHANT_SPOT and his trading window (merchantPresent) in data/trade.ts.
import { merchantPresent } from './trade';
import navgridConfig from '../../ai/config/navgrid.json';

// The walk becomes three legs each way instead of one: OFF_STAGE<->
// VILLAGE_STOP, a dwell AT VILLAGE_STOP, then VILLAGE_STOP<->MERCHANT_SPOT.
// Split against Merchant.tsx's own already-measured ~66.5s OFF_STAGE<-
// >MERCHANT_SPOT walk (Wave 46's own live sampling, in that file's note on
// WALK_SPEED) by real road distance along that same route: OFF_STAGE to the
// VILLAGE_STOP row is ~52.8m on-road (leg 3's own 25.6m N-S run down to the
// leg-2 junction, then 27.2m of leg 2's own E-W run west to x=-40);
// VILLAGE_STOP to MERCHANT_SPOT is the remaining ~49.6m on-road (leg 2's own
// last 36.8m west to the camp spur's junction, then 12.8m down the spur) plus
// the same ~9.6m off-road tail Wave 46 already measured into camp.
// VILLAGE_DWELL is new — not derived from the old walk, a real deliberate
// pause — and WALK_BUFFER widens to fit all three legs, the "widen the
// existing buffer to absorb the added dwell time" this wave's own research
// called for.
// LIVE-VERIFIED this wave (real headless Chrome — see this repo's own
// CLAUDE.md for the required launch flags — worldEnv.time scrubbed via the
// window.__kkenv debug handle across the new windows, merchant position
// sampled at each transition): he reaches VILLAGE_STOP and MERCHANT_SPOT
// with margin to spare at both boundaries, no teleport-pop at either seam.
// (At the default 720 s day only: the windows are fractions of the day, which
// the player sets — see merchantSpeed below.)
export const TO_VILLAGE_BUFFER = 0.047; // ~34s at the default 720s day
export const VILLAGE_DWELL = 0.021; // ~15s dwell at the village corner
export const VILLAGE_TO_SPOT_BUFFER = 0.056; // ~40s at the default 720s day
export const WALK_BUFFER = TO_VILLAGE_BUFFER + VILLAGE_DWELL + VILLAGE_TO_SPOT_BUFFER;

export type MerchantStage =
  | 'away' | 'to_village_am' | 'village_am' | 'arriving'
  | 'present' | 'leaving' | 'village_pm' | 'to_offstage';

export function merchantStage(time: number): MerchantStage {
  if (merchantPresent(time)) return 'present';
  // morning approach: OFF_STAGE -> VILLAGE_STOP -> (dwell) -> MERCHANT_SPOT,
  // counting the three sub-windows down to 0.3 (present's own start)
  const toVillageStart = 0.3 - WALK_BUFFER;
  const villageAmStart = 0.3 - VILLAGE_TO_SPOT_BUFFER - VILLAGE_DWELL;
  const arrivingStart = 0.3 - VILLAGE_TO_SPOT_BUFFER;
  if (time > toVillageStart && time <= villageAmStart) return 'to_village_am';
  if (time > villageAmStart && time <= arrivingStart) return 'village_am';
  if (time > arrivingStart && time <= 0.3) return 'arriving';
  // evening departure: MERCHANT_SPOT -> VILLAGE_STOP -> (dwell) -> OFF_STAGE,
  // the same three windows mirrored up from 0.72 (present's own end)
  const leavingEnd = 0.72 + VILLAGE_TO_SPOT_BUFFER;
  const villagePmEnd = leavingEnd + VILLAGE_DWELL;
  const toOffstageEnd = 0.72 + WALK_BUFFER;
  if (time >= 0.72 && time < leavingEnd) return 'leaving';
  if (time >= leavingEnd && time < villagePmEnd) return 'village_pm';
  if (time >= villagePmEnd && time < toOffstageEnd) return 'to_offstage';
  return 'away';
}

/** A walking stage's window, as fractions of the day, on the same bounds merchantStage keeps; null for a stage that
 *  holds him in place or hides him. */
export function walkWindow(stage: MerchantStage): { start: number; end: number } | null {
  switch (stage) {
    case 'to_village_am': return { start: 0.3 - WALK_BUFFER, end: 0.3 - VILLAGE_TO_SPOT_BUFFER - VILLAGE_DWELL };
    case 'arriving': return { start: 0.3 - VILLAGE_TO_SPOT_BUFFER, end: 0.3 };
    case 'leaving': return { start: 0.72, end: 0.72 + VILLAGE_TO_SPOT_BUFFER };
    case 'to_offstage': return { start: 0.72 + VILLAGE_TO_SPOT_BUFFER + VILLAGE_DWELL, end: 0.72 + WALK_BUFFER };
    default: return null;
  }
}

type Pace = (x: number, z: number) => number;
type Point = { x: number; z: number };

/** He ends a walk within this much of its end (Merchant.tsx's arrival rule: he walks on while further than this). */
export const WALK_STOP = 0.5;

/** The centre of the cell a point lies in is no further than this from it: half the diagonal of the home grid's cells
 *  (navgrid.json's cellSize across), and a hair over for rounding. */
const OWN_CELL_REACH = (navgridConfig.home.cellSize * Math.SQRT2) / 2 + 1e-9;

/** How many of a plan's points he walks toward: all of them but a last that is only the centre of the walk's end's
 *  own cell. The grid's plan to a point ends there (nav/grid.ts's findPath gives the corners of its way and then the
 *  goal's cell), and on some walks that centre lies beyond the end as he comes to it, where he never goes: navSteer
 *  steers on past a point once within 1.1 m of it, and he stops within WALK_STOP of the end. Counted, it made the walk
 *  out and the evening walk, whose ends' cell centres lie so, a metre longer than he walks them, and turned him back
 *  the way he came when he was put at their ends. */
export function pointsWalked(pts: Point[], tx: number, tz: number): number {
  const n = pts.length;
  return n > 0 && Math.hypot(pts[n - 1].x - tx, pts[n - 1].z - tz) <= OWN_CELL_REACH ? n - 1 : n;
}

/** A walk's way: its start (`from`), the points of a plan for it (`plan`) that he walks toward (pointsWalked), and its
 *  end (`to`). */
export function walkWay(from: Point, plan: Point[], to: Point): Point[] {
  return [from, ...plan.slice(0, pointsWalked(plan, to.x, to.z)), to];
}

/** The seconds a straight leg takes at his own pace, a metre or less at a time at his pace there (`paceAt`:
 *  Merchant.tsx's WALK_SPEED, quicker on the road), leaving out `short` metres at its far end. */
function legSeconds(ax: number, az: number, bx: number, bz: number, paceAt: Pace, short = 0): number {
  const full = Math.hypot(bx - ax, bz - az);
  const len = full - short;
  if (len <= 0) return 0;
  const steps = Math.ceil(len);
  let seconds = 0;
  for (let k = 0; k < steps; k++) {
    const f = (((k + 0.5) / steps) * len) / full;
    seconds += len / steps / paceAt(ax + (bx - ax) * f, az + (bz - az) * f);
  }
  return seconds;
}

/** A plan's own seconds, from each of the points he walks toward (pointsWalked) to where he will stop, kept with the
 *  plan (navSteer makes a fresh array for each plan it makes), so that each frame reckons only the leg from where he
 *  stands to the point he makes for. */
const planSeconds = new WeakMap<object, { tx: number; tz: number; paceAt: Pace; fromPoint: number[] }>();
function secondsFromEachPoint(pts: Point[], tx: number, tz: number, paceAt: Pace): number[] {
  const kept = planSeconds.get(pts);
  if (kept && kept.tx === tx && kept.tz === tz && kept.paceAt === paceAt) return kept.fromPoint;
  const walked = pointsWalked(pts, tx, tz);
  const fromPoint = new Array<number>(walked);
  if (walked > 0) {
    const last = pts[walked - 1];
    let after = legSeconds(last.x, last.z, tx, tz, paceAt, WALK_STOP);
    fromPoint[walked - 1] = after;
    for (let k = walked - 2; k >= 0; k--) {
      after += legSeconds(pts[k].x, pts[k].z, pts[k + 1].x, pts[k + 1].z, paceAt);
      fromPoint[k] = after;
    }
  }
  planSeconds.set(pts, { tx, tz, paceAt, fromPoint });
  return fromPoint;
}

/** What is left of a walk, in seconds at his own pace: along the way navSteer planned for it (nav/steering.ts keeps the
 *  plan on the walker: the path's points, `i` the next one he makes for) from where he stands, and on to where he will
 *  stop, WALK_STOP short of the walk's end — a metre or less at a time at his pace there (`paceAt`: Merchant.tsx's
 *  WALK_SPEED, quicker on the road). With no plan, or past the last point he walks toward (pointsWalked), the straight
 *  line. Within WALK_STOP of the end, nothing: he has stopped, whatever a plan still holds. */
export function secondsLeftAtPace(
  x: number, z: number,
  nav: { pts: Point[]; i: number } | undefined,
  tx: number, tz: number,
  paceAt: Pace,
): number {
  if (Math.hypot(tx - x, tz - z) <= WALK_STOP) return 0;
  if (!nav || nav.i >= pointsWalked(nav.pts, tx, tz)) return legSeconds(x, z, tx, tz, paceAt, WALK_STOP);
  const next = nav.pts[nav.i];
  return legSeconds(x, z, next.x, next.z, paceAt) + secondsFromEachPoint(nav.pts, tx, tz, paceAt)[nav.i];
}

/** Where his schedule puts him on a walk the clock has moved on without him — a night's sleep and a knock-out (but in
 *  the arena, which only brings the player home) both set it to 0.27, inside his walk in; a game loaded; a return home,
 *  which mounts him afresh; a frame over 1.1 s long: along the walk's way (`way`: walkWay's) as far as the further of
 *  the time since its window opened (`elapsedSeconds`), walked at his own pace, and the window's share gone (`share`)
 *  of the whole walk at his own pace — the share is what keeps him to a short day (in play he runs a little ahead of
 *  it, to keep a tenth of the window in hand) — and no further than its end; with the way the walk runs there (`dx`,
 *  `dz`: a unit vector along the leg he is put on, at the end its last leg of any length; nothing for a way of no
 *  length). */
export function scheduledPlace(
  way: Point[], elapsedSeconds: number, share: number, paceAt: Pace,
): Point & { dx: number; dz: number } {
  let total = 0;
  for (let k = 1; k < way.length; k++) total += legSeconds(way[k - 1].x, way[k - 1].z, way[k].x, way[k].z, paceAt);
  let todo = Math.min(total, Math.max(0, elapsedSeconds, share * total));
  let dx = 0;
  let dz = 0;
  for (let k = 1; k < way.length; k++) {
    const a = way[k - 1];
    const b = way[k];
    const full = Math.hypot(b.x - a.x, b.z - a.z);
    if (full === 0) continue;
    dx = (b.x - a.x) / full;
    dz = (b.z - a.z) / full;
    const steps = Math.ceil(full);
    for (let s = 0; s < steps; s++) {
      const mid = (s + 0.5) / steps;
      const step = full / steps / paceAt(a.x + (b.x - a.x) * mid, a.z + (b.z - a.z) * mid);
      if (todo <= step) {
        const f = (s + todo / step) / steps;
        return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, dx, dz };
      }
      todo -= step;
    }
  }
  const end = way[way.length - 1];
  return { x: end.x, z: end.z, dx, dz };
}

/** How far behind his schedule, in seconds at his own pace, he may stand when the clock moves on without him and stay
 *  where he is: about what two plans' own reckonings differ by from one start to the next, and little enough for his
 *  step (merchantSpeed) to make up. */
export const SCHEDULE_SLACK = 0.5;

/** Whether keeping to his schedule, when the clock has moved on without him, puts him where it says: out of hiding
 *  (`outOfHiding`: where he stood while hidden is nothing to his day) always, and otherwise only when he has fallen
 *  behind it by more than SCHEDULE_SLACK — what is left of his walk from where he stands (`secondsLeftHere`) against
 *  what is left of it from where his schedule puts him (`secondsLeftThere`), each in seconds at his own pace — so that
 *  he is never put back. */
export function putOnSchedule(outOfHiding: boolean, secondsLeftHere: number, secondsLeftThere: number): boolean {
  return outOfHiding || secondsLeftHere - secondsLeftThere > SCHEDULE_SLACK;
}

/** The share of a walk's window the merchant keeps in hand: he makes to end each walk with a tenth of it still to run. */
export const WALK_IN_HAND = 0.1;
/** The fastest he goes to keep time, in metres a second: a run. */
export const MERCHANT_TOP_SPEED = 6;

/** How fast the merchant walks, in metres a second: his own pace where he is (`pace`: Merchant.tsx's WALK_SPEED,
 *  quicker on the road), unless what is left of the walk at his own pace (`ownSecondsLeft`) would not fit what is left
 *  of its window (`secondsLeft`) less a tenth of the window (`windowSeconds`) kept in hand — then his own pace quickened
 *  everywhere, on the road and off it, just enough that it would, at most MERCHANT_TOP_SPEED. His windows are fractions
 *  of the day, and the day's length is the player's to set (Options, 4 to 30 minutes): at the default 12 minutes he
 *  keeps his own pace on every walk that has a tenth of its window to spare, and at a shorter day he steps out faster
 *  in the same measure — but for a moment at the end of a walk he must hurry, where the tenth he aims to keep in hand
 *  and what is left of the walk run out together, and a reckoning a little long (the plan's corners, which he cuts)
 *  asks a quicker stride of him for the last few metres — so that he ends each walk inside its window,
 *  rather than being set down at its end by the stage that follows (ROADMAP.md: "the merchant's walks were timed by
 *  the day and stepped by the second"). With the tenth already spent and the walk not over, he runs. */
export function merchantSpeed(pace: number, ownSecondsLeft: number, secondsLeft: number, windowSeconds: number): number {
  const inHand = secondsLeft - WALK_IN_HAND * windowSeconds;
  const hurry = inHand > 0 ? Math.max(1, ownSecondsLeft / inHand) : Infinity;
  return Math.min(MERCHANT_TOP_SPEED, pace * hurry);
}

/** His gait at a hurry (`rate`: his speed over his own pace where he is): a run is taken up above 2.2 times his pace
 *  and left below 1.8 (`wasRunning`: the gait he has), so that a hurry near twice his pace does not flick between the
 *  two; and his steps' cadence — the walk's own quickened as he hurries, the run's at half that, so that the run plays
 *  at its own speed at twice his pace. */
export function merchantGait(rate: number, wasRunning: boolean): { running: boolean; cadence: number } {
  const running = wasRunning ? rate > 1.8 : rate > 2.2;
  return { running, cadence: running ? rate / 2 : rate };
}
