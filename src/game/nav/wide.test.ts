import { beforeEach, describe, expect, it } from 'vitest';
import { findPath, navSteer, rebuildNav } from '../navgrid';
import { WIDE_REACH, type NavAgent } from './steering';
import { getNavGrid } from './registry';
import { wideSolids } from './wideSolids';
import { useGameStore } from '../store/gameStore';
import { SIGNPOST, VILLAGE_HUT_HALF, VILLAGE_HUTS } from '../data/world';
import type { PlacedBuilding, ResourceNodeState } from '../types';

let n = 0;
const piece = (x: number, z: number): PlacedBuilding => ({ id: `w${++n}`, type: 'wall', x, z, rot: 0, built: 1 });
function build(buildings: PlacedBuilding[], nodes: ResourceNodeState[] = []) {
  useGameStore.setState({ buildings, nodes });
  rebuildNav(buildings);
}
const tree = (id: string, x: number, z: number, extra: Partial<ResourceNodeState> = {}): ResourceNodeState =>
  ({ id, kind: 'tree', x, z, scale: 1, yaw: 0, hitsLeft: 3, respawnAt: null, ...extra });

type P = { x: number; z: number };
/** the distance from a point to an axis-aligned box (centre, half sides) */
const toBox = (p: P, cx: number, cz: number, hx: number, hz: number) =>
  Math.hypot(Math.max(0, Math.abs(p.x - cx) - hx), Math.max(0, Math.abs(p.z - cz) - hz));
/** the distance from a point to a turned square of half side h (yaw as three.js turns an object) */
function toTurned(p: P, cx: number, cz: number, h: number, yaw: number) {
  const dx = p.x - cx, dz = p.z - cz, c = Math.cos(yaw), s = Math.sin(yaw);
  return Math.hypot(Math.max(0, Math.abs(dx * c - dz * s) - h), Math.max(0, Math.abs(dx * s + dz * c) - h));
}
/** the points of a way, every 5 cm along it */
function along(way: P[]): P[] {
  const out: P[] = [];
  for (let k = 1; k < way.length; k++) {
    const a = way[k - 1], b = way[k], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05));
    for (let i = 0; i <= steps; i++) out.push({ x: a.x + ((b.x - a.x) * i) / steps, z: a.z + ((b.z - a.z) * i) / steps });
  }
  return out;
}

beforeEach(() => build([]));

describe('a way found for a wide walker', () => {
  it('keeps the centres of its cells a cell further from what stops a walker than an ordinary way does: 2.05 m or more', () => {
    // a block of wall (1 m pieces, the test catalogue's fallback box) between the start and the goal
    const block: PlacedBuilding[] = [];
    for (let x = -3; x <= 3; x++) for (let z = -1; z <= 1; z++) block.push(piece(x, z));
    build(block);
    const start = { x: 0, z: -8 };
    const ordinary = findPath(0, -8, 0, 8)!;
    const wide = findPath(0, -8, 0, 8, undefined, true)!;
    const near = (pts: P[]) => Math.min(...pts.map((p) => toBox(p, 0, 0, 3.5, 1.5)));
    // each corner the way turns at, and the end's own cell, is a cell's centre: the wide way's 2.05 m or more off
    expect(near(wide)).toBeGreaterThanOrEqual(2.05);
    // walked from the start, the ordinary way passes the block 1.05 m off or more (where a cell's centre can be), the
    // wide way a whole metre further off than it
    const ordinaryNear = near(along([start, ...ordinary]));
    const wideNear = near(along([start, ...wide]));
    expect(ordinaryNear).toBeGreaterThanOrEqual(1.05);
    expect(wideNear - ordinaryNear).toBeGreaterThanOrEqual(0.99);
    // the block turned the other way, and the way across it: round its ends along z
    const turned: PlacedBuilding[] = [];
    for (let x = -1; x <= 1; x++) for (let z = -3; z <= 3; z++) turned.push(piece(x, z));
    build(turned);
    const nearT = (pts: P[]) => Math.min(...pts.map((p) => toBox(p, 0, 0, 1.5, 3.5)));
    const ordinaryT = findPath(-8, 0, 8, 0)!;
    const wideT = findPath(-8, 0, 8, 0, undefined, true)!;
    expect(nearT(wideT)).toBeGreaterThanOrEqual(2.05);
    expect(nearT(along([{ x: -8, z: 0 }, ...wideT])) - nearT(along([{ x: -8, z: 0 }, ...ordinaryT]))).toBeGreaterThanOrEqual(0.99);
  });

  it('ends at the open cell nearest a goal that stands within its room of a wall, where an ordinary way ends on it', () => {
    // a wall along z = 0; the goal 2.5 m north of the wall's middle — a cell an ordinary walker may stand on, but not a
    // wide one: the wide way ends a cell further off
    const wall: PlacedBuilding[] = [];
    for (let x = -14; x <= 14; x++) wall.push(piece(x, 0));
    build(wall);
    const ordinary = findPath(0.5, 8, 0.5, 2.5)!;
    const wide = findPath(0.5, 8, 0.5, 2.5, undefined, true)!;
    expect(ordinary[ordinary.length - 1]).toEqual({ x: 0.5, z: 2.5 });
    // (the open cells nearest it are sought ring by ring, the first found taken: here the one west of north of it)
    const end = wide[wide.length - 1];
    expect(end.z).toBe(3.5);
    expect(Math.abs(end.x - 0.5)).toBeLessThanOrEqual(1);
  });

  it('does not take a gap only an ordinary walker has room for, and goes round', () => {
    // a wall along z = 0 from x = -14 to 14 with a gap of four pieces (x = -1 .. 2): one open cell for a walker
    const wall: PlacedBuilding[] = [];
    for (let x = -14; x <= 14; x++) if (x < -1 || x > 2) wall.push(piece(x, 0));
    build(wall);
    const crossAt = (way: P[], from: P) => {
      const line = [from, ...way];
      for (let k = 1; k < line.length; k++) {
        const p = line[k - 1], q = line[k];
        if ((p.z - 0) * (q.z - 0) < 0) return p.x + ((q.x - p.x) * (0 - p.z)) / (q.z - p.z);
      }
      return null;
    };
    const ordinary = findPath(0.5, -6, 0.5, 6)!;
    const wide = findPath(0.5, -6, 0.5, 6, undefined, true)!;
    expect(Math.abs(crossAt(ordinary, { x: 0.5, z: -6 })! - 0.5)).toBeLessThan(1);
    expect(Math.abs(crossAt(wide, { x: 0.5, z: -6 })!)).toBeGreaterThan(14);
  });

  it('is the ordinary way where there is no wide one', () => {
    // a closed ring of wall round (20, 20), half side 6, with a gap of four pieces in its south side
    const ring: PlacedBuilding[] = [];
    for (let k = -6; k <= 6; k++) {
      if (k < -1 || k > 2) ring.push(piece(20 + k, 14));
      ring.push(piece(20 + k, 26), piece(14, 20 + k), piece(26, 20 + k));
    }
    build(ring);
    const ordinary = findPath(20.5, 8, 20.5, 20);
    expect(ordinary).not.toBeNull();
    expect(findPath(20.5, 8, 20.5, 20, undefined, true)).toEqual(ordinary);
  });

  it("goes round the village's huts, the signpost and the standing trees and rocks at home, which an ordinary way walks through", () => {
    const [alric] = VILLAGE_HUTS;
    // across Alric's hut, west to east through its middle
    const ordinary = findPath(alric.x - 5, alric.z, alric.x + 5, alric.z)!;
    const wide = findPath(alric.x - 5, alric.z, alric.x + 5, alric.z, undefined, true)!;
    const offHut = (p: P) => toTurned(p, alric.x, alric.z, VILLAGE_HUT_HALF, alric.yaw);
    // (each way walked from its start: a way straight on is a single point, the end's own cell, and its corners alone
    // would say nothing of where it went)
    expect(Math.min(...along([{ x: alric.x - 5, z: alric.z }, ...ordinary]).map(offHut))).toBe(0);
    expect(wide).not.toEqual(ordinary);
    expect(Math.min(...wide.map(offHut))).toBeGreaterThan(1.8);
    expect(Math.min(...along([{ x: alric.x - 5, z: alric.z }, ...wide]).map(offHut))).toBeGreaterThan(1.3);
    // round Beda's hut, as it stands, turned by 1.3 pi: south of it, 2 m from its southmost corner, a cell no wide
    // walker may stand on, which an unturned square of its size would leave open; and south-west, 3 m from it, a cell
    // it leaves open, which its bounding square would block
    const grid = getNavGrid(null);
    expect([grid.isWalkable(-34.5, 40.5), grid.isWalkable(-34.5, 40.5, 0, true)]).toEqual([true, false]);
    expect([grid.isWalkable(-36.5, 40.5), grid.isWalkable(-36.5, 40.5, 0, true)]).toEqual([true, true]);
    // and across it, west to east through its middle, each way walked from its start: the ordinary one through it
    const beda = VILLAGE_HUTS[1];
    const bedaFrom = { x: beda.x - 5, z: beda.z };
    const offBeda = (p: P) => toTurned(p, beda.x, beda.z, VILLAGE_HUT_HALF, beda.yaw);
    const ordinaryBeda = findPath(bedaFrom.x, bedaFrom.z, beda.x + 5, beda.z)!;
    const wideBeda = findPath(bedaFrom.x, bedaFrom.z, beda.x + 5, beda.z, undefined, true)!;
    expect(wideBeda).not.toEqual(ordinaryBeda);
    expect(Math.min(...along([bedaFrom, ...ordinaryBeda]).map(offBeda))).toBe(0);
    expect(Math.min(...along([bedaFrom, ...wideBeda]).map(offBeda))).toBeGreaterThan(1.3);
    // past the signpost, south to north, each way walked from its start: the ordinary one through it
    const signFrom = { x: SIGNPOST.x, z: SIGNPOST.z - 5 };
    const ordinarySign = findPath(signFrom.x, signFrom.z, SIGNPOST.x, SIGNPOST.z + 5)!;
    const sign = findPath(signFrom.x, signFrom.z, SIGNPOST.x, SIGNPOST.z + 5, undefined, true)!;
    expect(sign).not.toEqual(ordinarySign);
    const offSign = (p: P) => toBox(p, SIGNPOST.x, SIGNPOST.z, 0.45, 0.15);
    expect(Math.min(...along([signFrom, ...ordinarySign]).map(offSign))).toBe(0);
    expect(Math.min(...along([signFrom, ...sign]).map(offSign))).toBeGreaterThan(1.3);
    // a tree and a rock standing in the way, a tree felled and a tree of another place not
    build([], [
      tree('t', 60, -60), tree('r', 70, -60, { kind: 'rock', scale: 1.2 }),
      tree('felled', 80, -60, { respawnAt: 1 }), tree('away', 90, -60, { world: 'template-01' }),
    ]);
    const past = (x: number) => findPath(x, -66, x, -54, undefined, true)!;
    const minOff = (way: P[], x: number, r: number) => Math.min(...way.map((p) => Math.hypot(p.x - x, p.z + 60) - r));
    // (the tree's circle and a walker's radius, 1.1 m, block the cells that come within it, and the cells next to them
    // are blocked as well: here, with the tree on the corner of four cells, its way passes 2.95 m off its circle)
    expect(minOff(along([{ x: 60, z: -66 }, ...past(60)]), 60, 0.55)).toBeGreaterThan(2.4);
    expect(minOff(along([{ x: 70, z: -66 }, ...past(70)]), 70, 1.32)).toBeGreaterThan(1.5);
    // the ordinary ways go through the tree and the rock (the grid does not hold them)
    expect(minOff(along([{ x: 60, z: -66 }, ...findPath(60, -66, 60, -54)!]), 60, 0.55)).toBeLessThan(0);
    expect(minOff(along([{ x: 70, z: -66 }, ...findPath(70, -66, 70, -54)!]), 70, 1.32)).toBeLessThan(0);
    expect(past(80)).toEqual(findPath(80, -66, 80, -54));
    expect(past(90)).toEqual(findPath(90, -66, 90, -54));
  });

  it('is made again once the grid has been rebuilt, or what it keeps clear of has changed', () => {
    build([]);
    const clear = findPath(0, -6, 0, 6, undefined, true);
    build([], [tree('t', 0, 0)]);
    const round = findPath(0, -6, 0, 6, undefined, true)!;
    expect(round).not.toEqual(clear);
    expect(Math.min(...round.map((p) => Math.hypot(p.x, p.z)))).toBeGreaterThan(2);
    // the tree felled: a straight way again
    useGameStore.setState({ nodes: [tree('t', 0, 0, { respawnAt: 1 })] });
    expect(findPath(0, -6, 0, 6, undefined, true)).toEqual(clear);
    // a wall built where the tree stood, the trees as they were: rebuilt, the wide way goes round it
    const wall = [piece(0, 0)];
    useGameStore.setState({ buildings: wall });
    rebuildNav(wall);
    expect(findPath(0, -6, 0, 6, undefined, true)).not.toEqual(clear);
  });
});

describe('what a wide walker keeps clear of besides what stops every walker', () => {
  it("is, at home, the village's two huts and the signpost, and the trees and rocks standing there now; nowhere else, anything", () => {
    build([], [tree('t', 1, 2, { scale: 2 }), tree('r', 3, 4, { kind: 'rock' }), tree('felled', 5, 6, { respawnAt: 9 }),
      tree('away', 7, 8, { world: 'template-02' }), tree('h', 9, 10, { kind: 'herb' }), tree('f', 11, 12, { kind: 'fishing' })]);
    const list = wideSolids(null);
    expect(list.filter((s) => s.kind === 'box')).toEqual([
      ...VILLAGE_HUTS.map((h) => ({ kind: 'box', x: h.x, z: h.z, hx: VILLAGE_HUT_HALF, hz: VILLAGE_HUT_HALF, yaw: h.yaw })),
      { kind: 'box', x: SIGNPOST.x, z: SIGNPOST.z, hx: 0.45, hz: 0.15, yaw: 0 },
    ]);
    expect(list.filter((s) => s.kind === 'circle')).toEqual([
      { kind: 'circle', x: 1, z: 2, r: 1.1 }, { kind: 'circle', x: 3, z: 4, r: 1.1 },
    ]);
    for (const region of ['template-01', 'dungeon']) expect(wideSolids(region)).toEqual([]);
  });

  it('is the same list while what it holds is the same, and a fresh one when a tree or a rock falls or comes back', () => {
    build([], [tree('t', 1, 2), tree('h', 3, 4, { kind: 'herb' })]);
    const a = wideSolids(null);
    expect(wideSolids(null)).toBe(a);
    // the store's nodes made afresh by a swing at the tree, and a herb picked: nothing here changes
    useGameStore.setState({ nodes: [tree('t', 1, 2, { hitsLeft: 2 }), tree('h', 3, 4, { kind: 'herb', respawnAt: 5 })] });
    expect(wideSolids(null)).toBe(a);
    // the tree felled, and back
    useGameStore.setState({ nodes: [tree('t', 1, 2, { respawnAt: 9 })] });
    const b = wideSolids(null);
    expect(b).not.toBe(a);
    expect(b.filter((s) => s.kind === 'circle')).toEqual([]);
    useGameStore.setState({ nodes: [tree('t', 1, 2)] });
    expect(wideSolids(null)).not.toBe(b);
    expect(wideSolids(null)).toEqual(a);
    // a tree of another size where it stood: another list
    const c = wideSolids(null);
    useGameStore.setState({ nodes: [tree('t', 1, 2, { scale: 1.5 })] });
    expect(wideSolids(null)).not.toBe(c);
  });

  it("draws the huts the size they stand on: mc001's 3.2 m square at its 3.84 m, scaled to the huts' 2.6 m", () => {
    expect(VILLAGE_HUT_HALF * 2).toBeCloseTo(3.2 * (2.6 / 3.84), 9);
    expect(getNavGrid(null).cellSize).toBe(1);
  });
});

describe('a wide walker steering along its way', () => {
  /** a walker standing at (x, z), its plan to (tx, tz) made already: `pts`, the next point `i` */
  const walker = (x: number, z: number, pts: P[], wide: boolean, tx: number, tz: number, i = 0): NavAgent =>
    ({ x, z, wide, nav: { pts, i, t: 10, tx, tz } });

  it('makes for a corner of its way until within WIDE_REACH of it, where another walker steers on from 1.1 m', () => {
    // a corner at (0, 10), the way then running east to (10, 10)
    const pts = [{ x: 0, z: 10 }, { x: 10, z: 10 }];
    for (const [d, wide, onTo] of [[0.8, true, false], [0.8, false, true], [WIDE_REACH - 0.01, true, true]] as const) {
      const w = walker(0, 10 - d, pts.map((p) => ({ ...p })), wide, 10, 10);
      const { nx, nz } = navSteer(w, 10, 10, 0);
      // making for the corner: straight up; steering on: toward (10, 10)
      expect([d, wide, onTo ? nx > 0.5 : nz > 0.99]).toEqual([d, wide, true]);
    }
    expect(WIDE_REACH).toBe(0.5);
  });

  it('plans its way wide, where another walker plans it ordinary', () => {
    const block: PlacedBuilding[] = [];
    for (let x = -3; x <= 3; x++) for (let z = -1; z <= 1; z++) block.push(piece(x, z));
    build(block);
    const wide: NavAgent = { x: 0, z: -8, wide: true };
    const ordinary: NavAgent = { x: 0, z: -8 };
    navSteer(wide, 0, 8, 0);
    navSteer(ordinary, 0, 8, 0);
    expect(wide.nav!.pts).toEqual(findPath(0, -8, 0, 8, undefined, true));
    expect(ordinary.nav!.pts).toEqual(findPath(0, -8, 0, 8));
    expect(wide.nav!.pts).not.toEqual(ordinary.nav!.pts);
  });

  it("steers for the target itself from the corner before a last point that is only the centre of the target's own cell", () => {
    // past the corner at (-6, 0.5), making for the plan's last point, (0.5, 0.5): the centre of the target (0.2, 0.9)'s
    // own cell, to one side of it
    const pts = [{ x: -6, z: 0.5 }, { x: 0.5, z: 0.5 }];
    const wide = walker(-3, 0.5, pts.map((p) => ({ ...p })), true, 0.2, 0.9, 1);
    const ordinary = walker(-3, 0.5, pts.map((p) => ({ ...p })), false, 0.2, 0.9, 1);
    const toTarget = Math.atan2(0.9 - 0.5, 0.2 + 3);
    const w = navSteer(wide, 0.2, 0.9, 0), o = navSteer(ordinary, 0.2, 0.9, 0);
    expect(Math.atan2(w.nz, w.nx)).toBeCloseTo(toTarget, 9);
    expect(Math.atan2(o.nz, o.nx)).toBeCloseTo(0, 9); // the ordinary walker makes for the cell's centre, due east
    // a last point further off than that is a corner, made for by both
    const corner = walker(-3, 0.5, [{ x: 3, z: 0.5 }], true, 3, 3);
    expect(navSteer(corner, 3, 3, 0).nx).toBeCloseTo(1, 9);
  });
});
