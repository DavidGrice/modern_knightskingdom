'use client';
// Wave 8 · Walls that know about each other.
//
// The rig lab has labelled every castle mesh with `traits.wall.canConnectAsWall`
// and a `wallRole` (corner / corner_connectable / straight / tower) since the
// capability pass, and until now NOTHING read either one: `labIsCorner` was
// consumed once, to hide a facing arrow on the placement ghost. Placing a wall
// run was pure grid arithmetic — every segment rounded to its own 2m pitch and
// hoped, which is why a run of two different-width pieces left a seam.
//
// This module is the one place that answers the two questions that data was
// collected for:
//   · where does this piece WANT to sit, given what is already standing?
//     (`wallSnap`, used by the build-mode ghost)
//   · which standing pieces are actually joined to which?
//     (`wallLinks`, used by the fort ring check in game/fort.ts)
//
// Both work off the pieces' own declared footprints rather than a stored
// adjacency list, which matters twice over: a save written before Wave 8 has
// the same graph as one written after it, and moving/removing a piece can
// never leave a stale link behind.
import { BUILDABLE_BY_ID, labAssetId, sizeFor } from './data/buildables';
import { labCanConnectAsWall } from './data/labCapabilities';
import { isBuilt, isDoorLike, type PlacedBuilding } from './types';

/** A piece that belongs to a tileable wall RUN — the eleven meshes the lab
 *  marked `canConnectAsWall`, reached through the buildable's model id so the
 *  data stays the single source of truth (`stonewall` is mc007, `tower` is
 *  mc003, and so on). */
export function isWallRun(type: string): boolean {
  return labCanConnectAsWall(labAssetId(type));
}

/** the shortest thing that can honestly be called a wall. A wall brick laid
 *  flat is knee-high; it is in the `walls` category and it seals nothing. */
const RAMPART_MIN_HEIGHT = 1.2;

/** A piece that SEALS ground: any wall-run mesh, anything the catalog files
 *  under `walls` (the wooden Palisade has no lab entry of its own — it is a
 *  fence mold doing a wall's job), and a gate or door — provided it is tall
 *  enough to actually stop someone. Whether a door is CURRENTLY sealing is a
 *  separate question, asked against `gateOpen` at each call site, so this stays
 *  a fact about the piece rather than about the moment. */
export function isRampart(type: string): boolean {
  const def = BUILDABLE_BY_ID[type];
  if (!def || def.size[1] < RAMPART_MIN_HEIGHT) return false;
  return isWallRun(type) || def.category === 'walls' || isDoorLike(type);
}

/** …and of those, the ones that snap: structure-scale pieces only. The
 *  stud-pitch brick tier (snap 0.35) is placed by eye a brick at a time, and a
 *  1.5m magnet on a 0.35m brick would fight the player rather than help. */
function snapsAsWall(type: string): boolean {
  return isRampart(type) && (BUILDABLE_BY_ID[type]?.snap ?? 0) >= 1;
}

/** where a piece would have to stand to sit flush against `b` */
function attachPoints(b: PlacedBuilding, msx: number, msz: number) {
  const [bsx, bsz] = sizeFor(b.type, b.rot);
  return [
    { x: b.x + (bsx + msx) / 2, z: b.z },
    { x: b.x - (bsx + msx) / 2, z: b.z },
    { x: b.x, z: b.z + (bsz + msz) / 2 },
    { x: b.x, z: b.z - (bsz + msz) / 2 },
  ];
}

/** how near the cursor has to be to an open end before the ghost jumps to it.
 *  Deliberately shorter than half the shallowest wall mesh (2.4m deep, so its
 *  side-face attach point sits 1.6m out for a door and 2.4m for another wall):
 *  hovering over the MIDDLE of a wall must still place a piece on top of it,
 *  or stacking a second course becomes impossible. The magnet only ever
 *  reaches out from a piece's open ends. */
const SNAP_REACH = 1.5;

export interface WallSnap {
  x: number;
  z: number;
  /** the piece this one latched onto — the ghost draws the joint */
  toId: string;
}

/**
 * Where a wall-run piece should actually land, given a cursor position and
 * what is already built. Returns null when the piece is not part of the wall
 * family, or when nothing standing is near enough to connect to — both of
 * which mean "fall back to the ordinary grid snap".
 */
export function wallSnap(
  type: string,
  rot: 0 | 1 | 2 | 3,
  px: number,
  pz: number,
  buildings: PlacedBuilding[],
  world: string | null,
): WallSnap | null {
  if (!snapsAsWall(type)) return null;
  const [msx, msz] = sizeFor(type, rot);
  let best: (WallSnap & { d: number }) | null = null;
  for (const b of buildings) {
    if ((b.world ?? null) !== (world ?? null)) continue;
    // an unfinished site is still a committed footprint — a run laid out ahead
    // of the hammer should line up exactly like one already standing
    if (!snapsAsWall(b.type)) continue;
    for (const c of attachPoints(b, msx, msz)) {
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d > SNAP_REACH) continue;
      if (!best || d < best.d) best = { x: c.x, z: c.z, toId: b.id, d };
    }
  }
  return best ? { x: best.x, z: best.z, toId: best.toId } : null;
}

/** two footprints share an edge (within a hand's width) rather than merely
 *  being near each other */
export function touching(a: PlacedBuilding, b: PlacedBuilding, slack = 0.35): boolean {
  const [asx, asz] = sizeFor(a.type, a.rot);
  const [bsx, bsz] = sizeFor(b.type, b.rot);
  const gapX = Math.abs(a.x - b.x) - (asx + bsx) / 2;
  const gapZ = Math.abs(a.z - b.z) - (asz + bsz) / 2;
  // touching means overlapping on one axis while flush (or nearly) on the
  // other — two pieces meeting only at a corner point are NOT a sealed joint
  return (gapX <= slack && gapZ <= -0.05) || (gapZ <= slack && gapX <= -0.05);
}

/** the connection graph the lab's `canConnectAsWall` was collected for:
 *  piece id -> the ids of the standing pieces it is joined to */
export function wallLinks(buildings: PlacedBuilding[], world: string | null): Map<string, string[]> {
  const segs = buildings.filter(
    (b) => (b.world ?? null) === (world ?? null) && isBuilt(b) && isRampart(b.type),
  );
  const links = new Map<string, string[]>();
  for (const s of segs) links.set(s.id, []);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (!touching(segs[i], segs[j])) continue;
      links.get(segs[i].id)!.push(segs[j].id);
      links.get(segs[j].id)!.push(segs[i].id);
    }
  }
  return links;
}
