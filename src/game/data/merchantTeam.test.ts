import { describe, expect, it } from 'vitest';
import {
  TEAM_BACK_HOOVES, TEAM_FRONT_HOOVES, TEAM_HALF_LENGTH, TEAM_HALF_WIDTH, TEAM_LEAD, TRAIL_KEEP,
  laidBehind, teamBehind, teamOn, teamPose, towTeam, type TeamHooves,
} from './merchantTeam';

type P = { x: number; z: number };
const FRONT_BACK = TEAM_LEAD + TEAM_HALF_LENGTH - TEAM_FRONT_HOOVES;
const HOOF_SPAN = TEAM_FRONT_HOOVES - TEAM_BACK_HOOVES;

/** where a point of the team's own frame (its own x across, z along: its horses face +z) stands in the world */
function worldOf(pose: P & { yaw: number }, lx: number, lz: number): P {
  const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
  return { x: pose.x + lx * c + lz * s, z: pose.z - lx * s + lz * c };
}
const noseOf = (team: TeamHooves) => worldOf(teamPose(team), 0, TEAM_HALF_LENGTH);
const cornersOf = (team: TeamHooves) => [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  .map(([a, b]) => worldOf(teamPose(team), a * TEAM_HALF_WIDTH, b * TEAM_HALF_LENGTH));
/** how far a point is from a polyline */
function offTrack(track: P[], p: P): number {
  let d = Infinity;
  for (let k = 1; k < track.length; k++) {
    const a = track[k - 1], b = track[k];
    const len2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
    const f = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / len2)) : 0;
    d = Math.min(d, Math.hypot(a.x + (b.x - a.x) * f - p.x, a.z + (b.z - a.z) * f - p.z));
  }
  return d;
}
/** how far a point stands inside the turn of a track that turns once, from +z towards +x — on the side the track
 *  turns to of every one of its stretches' lines (for a stretch along (ux, uz), the side along (uz, -ux)): its distance
 *  from the track; anywhere else, outside the turn, that distance less than nothing */
function insideOf(track: P[], p: P): number {
  const d = offTrack(track, p);
  for (let k = 1; k < track.length; k++) {
    const a = track[k - 1], b = track[k];
    if ((a.x !== b.x || a.z !== b.z) && (b.z - a.z) * (p.x - a.x) - (b.x - a.x) * (p.z - a.z) <= 0) return -d;
  }
  return d;
}
/** his track's length from where he stands back through `trail` */
function lengthBack(trail: P[], at: P): number {
  let len = 0, px = at.x, pz = at.z;
  for (let k = trail.length - 1; k >= 0; k--) { len += Math.hypot(trail[k].x - px, trail[k].z - pz); px = trail[k].x; pz = trail[k].z; }
  return len;
}
/** he walks a polyline from its first point in steps of `step` metres, towing `team`; each place and the team to `see` */
function walkAlong(way: P[], step: number, team: TeamHooves, see: (at: P, team: TeamHooves) => void) {
  for (let k = 1; k < way.length; k++) {
    const a = way[k - 1], b = way[k], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(len / step));
    for (let i = 1; i <= n; i++) {
      const at = { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n };
      towTeam(team, at.x, at.z);
      see(at, team);
    }
  }
}
/** a way with one turn: north 8 m, then `turn` degrees to the east, 8 m more; and the team set down behind its start */
function turning(turn: number) {
  const r = (turn * Math.PI) / 180;
  const way = [{ x: 0, z: 0 }, { x: 0, z: 8 }, { x: 8 * Math.sin(r), z: 8 + 8 * Math.cos(r) }];
  return { way, track: [{ x: 0, z: -20 }, ...way], team: teamOn(laidBehind(way, 1, way[0]), 0, 0) };
}

describe('his team, towed after him', () => {
  it('on a straight track: both pairs of hooves on it, the front pair a pole behind him, its noses TEAM_LEAD behind him, facing him', () => {
    const { way, team } = turning(0);
    let seen = 0;
    walkAlong([way[0], way[1]], 0.05, team, (at, t) => {
      expect([t.fx, t.bx]).toEqual([expect.closeTo(0, 9), expect.closeTo(0, 9)]);
      expect(at.z - t.fz).toBeCloseTo(FRONT_BACK, 9);
      expect(t.fz - t.bz).toBeCloseTo(HOOF_SPAN, 9);
      expect(at.z - noseOf(t).z).toBeCloseTo(TEAM_LEAD, 9);
      const pose = teamPose(t);
      expect([Math.sin(pose.yaw), Math.cos(pose.yaw)]).toEqual([expect.closeTo(0, 9), expect.closeTo(1, 9)]);
      seen++;
    });
    expect(seen).toBe(160);
  });

  it('round a turn of 45, 90, 127, 135 or 170 degrees: its noses never nearer him than TEAM_LEAD, and it never jumps', () => {
    for (const turn of [45, 90, 127, 135, 170]) {
      const { way, team } = turning(turn);
      let nearest = Infinity, jump = 0, last = teamPose(team);
      walkAlong(way, 0.05, team, (at, t) => {
        nearest = Math.min(nearest, Math.hypot(noseOf(t).x - at.x, noseOf(t).z - at.z));
        const pose = teamPose(t);
        jump = Math.max(jump, Math.hypot(pose.x - last.x, pose.z - last.z));
        last = pose;
      });
      // no nearer than its pole lets it (and no further, on the straight runs either side)
      expect([turn, nearest]).toEqual([turn, expect.closeTo(TEAM_LEAD, 9)]);
      // its centre moves no more than twice his step of 5 cm
      expect([turn, jump <= 0.1]).toEqual([turn, true]);
    }
  });

  it('round a turn of 45, 90, 127 or 135 degrees cuts inside his track as a cart does: its centre more than 0.4 m inside the turn and never 0.1 m outside it, its footprint within 1.55 m of the track', () => {
    let deepest = 0, centre = 0;
    for (const turn of [45, 90, 127, 135]) {
      const { way, track, team } = turning(turn);
      let inside = 0, outside = 0;
      walkAlong(way, 0.05, team, (_, t) => {
        for (const c of cornersOf(t)) deepest = Math.max(deepest, offTrack(track, c));
        centre = Math.max(centre, offTrack(track, teamPose(t)));
        inside = Math.max(inside, insideOf(track, teamPose(t)));
        outside = Math.max(outside, -insideOf(track, teamPose(t)));
      });
      // (round the two turns here sharper than a right angle he walks back past the leg he came along, and the pole
      // pushes the team 4 and 7 cm to its far side as it comes round; round 170 degrees, walked only in the test above,
      // it is pushed 0.42 m out and comes only 0.36 m in)
      expect([turn, inside > 0.4, outside < 0.1]).toEqual([turn, true, true]);
    }
    expect(deepest).toBeLessThan(1.55);
    expect(deepest).toBeGreaterThan(TEAM_HALF_WIDTH + 0.4);
    expect(centre).toBeLessThan(0.95);
  });

  it('walked at, is pushed back, its noses still TEAM_LEAD from him', () => {
    const { team } = turning(0);
    const before = { ...team };
    walkAlong([{ x: 0, z: 0 }, { x: 0, z: -2 }], 0.05, team, (at, t) => {
      expect(Math.hypot(noseOf(t).x - at.x, noseOf(t).z - at.z)).toBeCloseTo(TEAM_LEAD, 9);
    });
    expect(team.fz).toBeCloseTo(before.fz - 2, 9);
    expect(team.bz).toBeCloseTo(before.bz - 2, 9);
  });

  it('stays where it stands while he stands still, and with a pole of no length left as it was', () => {
    const { team } = turning(0);
    const before = { ...team };
    towTeam(team, 0, 0);
    expect(team).toEqual(before);
    // he on its front hooves: they stay; the back ones are drawn to them, a span off
    const odd: TeamHooves = { fx: 3, fz: 3, bx: 3, bz: 1 };
    towTeam(odd, 3, 3);
    expect(odd).toEqual({ fx: 3, fz: 3, bx: 3, bz: expect.closeTo(3 - HOOF_SPAN, 9) });
    // both pairs on one spot: the back ones left too
    const same: TeamHooves = { fx: 3, fz: 3, bx: 3, bz: 3 };
    towTeam(same, 3, 3);
    expect(same).toEqual({ fx: 3, fz: 3, bx: 3, bz: 3 });
  });
});

describe('the team set down on his track behind him', () => {
  it('on a straight track: the front hooves a pole behind him, the back a span further, where towing keeps them', () => {
    const team = teamOn([{ x: 5, z: -10 }, { x: 5, z: 0 }], 5, 2);
    expect(team).toEqual({ fx: 5, fz: expect.closeTo(2 - FRONT_BACK, 9), bx: 5, bz: expect.closeTo(2 - FRONT_BACK - HOOF_SPAN, 9) });
    const towed = { ...team };
    towTeam(towed, 5, 2);
    for (const k of ['fx', 'fz', 'bx', 'bz'] as const) expect(towed[k]).toBeCloseTo(team[k], 9);
  });

  it('round a corner of his track: both pairs on it, the front a pole from him, the back a span from the front', () => {
    // he came north 6 m and turned east; he stands 0.8 m along the second leg
    const trail = [{ x: 0, z: 0 }, { x: 0, z: 6 }];
    const team = teamOn(trail, 0.8, 6);
    const track = [...trail, { x: 0.8, z: 6 }];
    expect(offTrack(track, { x: team.fx, z: team.fz })).toBeLessThan(1e-9);
    expect(offTrack(track, { x: team.bx, z: team.bz })).toBeLessThan(1e-9);
    expect(Math.hypot(team.fx - 0.8, team.fz - 6)).toBeCloseTo(FRONT_BACK, 9);
    expect(Math.hypot(team.fx - team.bx, team.fz - team.bz)).toBeCloseTo(HOOF_SPAN, 9);
  });

  it('with no track behind him, straight back along -z; past the oldest point, straight on along its last leg', () => {
    expect(teamOn([], 2, 2)).toEqual({ fx: 2, fz: expect.closeTo(2 - FRONT_BACK, 9), bx: 2, bz: expect.closeTo(2 - FRONT_BACK - HOOF_SPAN, 9) });
    // a track of one short leg west of him: on past it, still facing east
    const short = teamOn([{ x: 1.5, z: 0 }], 2, 0);
    expect(short).toEqual({ fx: expect.closeTo(2 - FRONT_BACK, 9), fz: 0, bx: expect.closeTo(2 - FRONT_BACK - HOOF_SPAN, 9), bz: 0 });
  });
});

describe('the team set down straight behind him as he will walk', () => {
  it('stands as towing holds it once he walks that way: its front hooves a pole back, the back a span further, facing his way', () => {
    // about to walk south-east, along (0.6, -0.8)
    const team = teamBehind(3, 4, 0.6, -0.8);
    expect(team).toEqual({
      fx: expect.closeTo(3 - 0.6 * FRONT_BACK, 9), fz: expect.closeTo(4 + 0.8 * FRONT_BACK, 9),
      bx: expect.closeTo(3 - 0.6 * (FRONT_BACK + HOOF_SPAN), 9), bz: expect.closeTo(4 + 0.8 * (FRONT_BACK + HOOF_SPAN), 9),
    });
    const pose = teamPose(team);
    expect([Math.sin(pose.yaw), Math.cos(pose.yaw)]).toEqual([expect.closeTo(0.6, 9), expect.closeTo(-0.8, 9)]);
    // he walks that way: towed, it stays straight behind him, its noses TEAM_LEAD back
    let seen = 0;
    walkAlong([{ x: 3, z: 4 }, { x: 3 + 0.6 * 5, z: 4 - 0.8 * 5 }], 0.05, team, (at, t) => {
      expect(offTrack([{ x: 3 - 0.6 * 9, z: 4 + 0.8 * 9 }, at], { x: t.bx, z: t.bz })).toBeLessThan(1e-9);
      expect(Math.hypot(noseOf(t).x - at.x, noseOf(t).z - at.z)).toBeCloseTo(TEAM_LEAD, 9);
      seen++;
    });
    expect(seen).toBe(100);
  });
});

describe('where the team stands', () => {
  it('is its centre TEAM_FRONT_HOOVES behind its front hooves, toward the back ones, facing from the back ones to the front', () => {
    const pose = teamPose({ fx: 10, fz: 0, bx: 10 - HOOF_SPAN, bz: 0 });
    expect(pose.x).toBeCloseTo(10 - TEAM_FRONT_HOOVES, 9);
    expect(pose.z).toBeCloseTo(0, 9);
    expect([Math.sin(pose.yaw), Math.cos(pose.yaw)]).toEqual([expect.closeTo(1, 9), expect.closeTo(0, 9)]);
    // the back hooves where the team's own frame puts them
    const back = worldOf(pose, 0, TEAM_BACK_HOOVES);
    expect([back.x, back.z]).toEqual([expect.closeTo(10 - HOOF_SPAN, 9), expect.closeTo(0, 9)]);
  });
});

describe('his track laid behind him as if he had walked his way there', () => {
  const way = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 10, z: 10 }];

  it('runs back from where he is through the points of the way before it, far enough for the team, his place last', () => {
    // put two metres along the way's second leg, making for its end (index 2)
    const at = { x: 2, z: 10 };
    const trail = laidBehind(way, 2, at);
    expect(trail[trail.length - 1]).toEqual(at);
    expect(trail[trail.length - 2]).toEqual({ x: 0, z: 10 });
    expect(lengthBack(trail.slice(0, -1), at)).toBeGreaterThanOrEqual(TRAIL_KEEP);
    // and the team set down on it stands on the way, round its corner
    const team = teamOn(trail, at.x, at.z);
    expect(offTrack(way, { x: team.fx, z: team.fz })).toBeLessThan(1e-9);
    expect(offTrack(way, { x: team.bx, z: team.bz })).toBeLessThan(1e-9);
  });

  it("at the way's end sets the team down on its last leg, as the walk brought it there", () => {
    const end = way[2];
    const team = teamOn(laidBehind(way, way.length - 1, end), end.x, end.z);
    const pose = teamPose(team);
    expect(Math.sin(pose.yaw)).toBeCloseTo(1, 9); // facing east, the way the last leg runs
    expect(pose.z).toBeCloseTo(10, 9);
    expect(end.x - noseOf(team).x).toBeCloseTo(TEAM_LEAD, 9);
  });

  it("runs on straight back past the way's start, along its first leg, when the way behind him is short", () => {
    const at = { x: 0, z: 0.5 };
    const trail = laidBehind(way, 1, at);
    expect(trail[0].x).toBeCloseTo(0, 9);
    expect(trail[0].z).toBeLessThan(0);
    expect(lengthBack(trail.slice(0, -1), at)).toBeGreaterThanOrEqual(TRAIL_KEEP);
    const pose = teamPose(teamOn(trail, at.x, at.z));
    expect(Math.cos(pose.yaw)).toBeCloseTo(1, 9); // facing north, up the way's first leg
    // a way of one point: straight back along -z
    const lone = laidBehind([{ x: 4, z: 4 }], 0, { x: 4, z: 4 });
    expect(lone[0].x).toBeCloseTo(4, 9);
    expect(lone[0].z).toBeLessThan(4);
  });

  it('once he walks on from it, the team towed from where it was set down, without a jump', () => {
    const at = { x: 2, z: 10 };
    const team = teamOn(laidBehind(way, 2, at), at.x, at.z);
    let last = teamPose(team), jump = 0;
    walkAlong([at, { x: 10, z: 10 }], 0.05, team, () => {
      const pose = teamPose(team);
      jump = Math.max(jump, Math.hypot(pose.x - last.x, pose.z - last.z));
      last = pose;
    });
    expect(jump).toBeLessThanOrEqual(0.1);
    // and in the end on the leg, facing along it
    expect(Math.sin(teamPose(team).yaw)).toBeCloseTo(1, 6);
    expect(team.fz).toBeCloseTo(10, 6);
  });
});
