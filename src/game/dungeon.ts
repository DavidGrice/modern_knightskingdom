// Procedural dungeon (Phase 17, redesigned 2026-07-27): a branching tree of
// variously-sized rooms connected by straight corridors, generated fresh on
// every descent — kept in a mutable leaf module (not the zustand store, and
// not persisted) since it's ephemeral generated-world state, exactly like
// `raiderRamState`/`cartState` — DungeonScene.tsx reads it to render,
// PlayerController.tsx reads it for wall collision, Enemies.tsx reads/writes
// room-cleared state as spawned enemies die.
//
// Redesigned from the original single-line-of-square-rooms version: that
// version's wall-segment spacing (a hardcoded 4m) didn't match the real
// `stonewall` buildable's actual ~8m width, so three overlapping segments
// per wall side spilled several metres past each room's boundary, deep into
// the room interior. Caught while building the Phase 2 nav grid for this
// destination (iteration 2.6) — `findPath` from the entry room to the boss
// room returned null on every attempt, because the "walls" were sealing the
// rooms shut, not just their edges. This version derives every tiling
// number from the real piece width instead of a second hand-copied
// constant, and replaces the linear chain with a branching tree so the
// layout is actually varied, not just re-rolled room count on a straight
// line.
import { sizeFor } from './data/buildables';
import type { EnemyKind } from './combat';

/** the real, authored width of one `stonewall` piece — every wall-tiling
 *  computation below derives from this, not a second hand-copied number, so
 *  a future re-scale of the model can never silently drift out of sync with
 *  the generator again (see the redesign note above). */
export const SEGMENT = sizeFor('stonewall', 0)[0]; // 8
const HALF_SEGMENT = SEGMENT / 2; // 4

export const CORRIDOR_LENGTH = 8;

/** room half-extent choices, always a whole number of segments so every
 *  side tiles flush (see segCount/slotOffset) — weighted toward the smaller
 *  sizes so a typical room reads similar in scale to the old fixed 12x12,
 *  with the occasional bigger hall or narrow room for real variety. */
const SIZE_CLASSES: { half: number; weight: number }[] = [
  { half: HALF_SEGMENT, weight: 0.4 },      // 8x8
  { half: HALF_SEGMENT * 2, weight: 0.4 },  // 16x16
  { half: HALF_SEGMENT * 3, weight: 0.2 },  // 24x24
];

function pickSize(rnd: () => number): number {
  const total = SIZE_CLASSES.reduce((s, c) => s + c.weight, 0);
  let r = rnd() * total;
  for (const c of SIZE_CLASSES) {
    if (r < c.weight) return c.half;
    r -= c.weight;
  }
  return SIZE_CLASSES[SIZE_CLASSES.length - 1].half;
}

/** minimum gap enforced between two rooms/corridors that are not directly
 *  connected by the placement being attempted — deliberately less than
 *  CORRIDOR_LENGTH, so a real connection is still visually distinguishable
 *  from "two rooms that just happen to be close." */
const MARGIN = 6;

/** hops-from-entry cap during parent selection — bounds worst-case reach
 *  and keeps the tree bushy rather than stringy. */
const MAX_TREE_DEPTH = 4;

const MAX_ATTEMPTS = 300;
const MAX_REGENERATIONS = 5;

/** hard cap on any room's farthest corner from DUNGEON_ORIGIN, enforced
 *  during placement (see placeChild's reach check below). data/worlds.ts's
 *  DUNGEON_DESTINATION.radius derives from this rather than a second
 *  hand-copied number — the exact bug pattern this redesign exists to
 *  kill. */
export const REACH_LIMIT = 96;

export interface DungeonWall {
  x: number;
  z: number;
  rot: 0 | 1; // 0 = runs east-west (wide along X), 1 = runs north-south
}

export interface DungeonRoom {
  index: number;
  cx: number;
  cz: number;
  halfX: number;
  halfZ: number;
  /** index of the room this branched from; null for the entry room (0) */
  parent: number | null;
  isEntry: boolean;
  isBoss: boolean;
  enemyKind: EnemyKind;
  enemyCount: number;
  spawned: boolean;
  cleared: boolean;
}

export interface DungeonCorridor {
  roomA: number;
  roomB: number;
  x0: number; x1: number;
  z0: number; z1: number;
}

export interface DungeonLayout {
  seed: number;
  origin: { x: number; z: number };
  rooms: DungeonRoom[];
  walls: DungeonWall[];
  corridors: DungeonCorridor[];
  entryPos: { x: number; z: number };
  rewarded: boolean;
}

export const dungeonState: { layout: DungeonLayout | null } = { layout: null };

/** gates entry to the Sealed Crypt — a mid/late-game system, not something a
 *  fresh Peasant should stumble into (Knight's Arms = Knight rank) */
export const DUNGEON_UNLOCK_QUEST = 'knights_arms';

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkdungeon = dungeonState;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** hard-code the dungeon origin far from anything else (see data/worlds.ts's
 *  'dungeon' WorldDestination entry, which reuses this for its own bound) */
export const DUNGEON_ORIGIN = { x: 4200, z: 4200 };

// ---------------------------------------------------------------------------
// Side / slot tiling model — every room side is tiled by whole SEGMENT-wide
// wall pieces, flush with the room's true edge (zero gap, zero overlap by
// construction). This is the direct fix for the original overlap bug.
// ---------------------------------------------------------------------------

type Side = 'N' | 'S' | 'E' | 'W';
const SIDES: Record<Side, { nx: number; nz: number }> = {
  N: { nx: 0, nz: -1 }, S: { nx: 0, nz: 1 }, E: { nx: 1, nz: 0 }, W: { nx: -1, nz: 0 },
};
const OPPOSITE: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' };

interface RoomShape { cx: number; cz: number; halfX: number; halfZ: number }

function segCount(half: number): number {
  return Math.round(half / HALF_SEGMENT);
}

/** offset from the room's centre, along the wall-run axis, for segment k of
 *  n. Verified by hand: n=1 -> [0] (one piece spans the whole 8m side,
 *  centred). n=2 -> [-4,4] (two pieces span [-8,0] and [0,8], covering a
 *  16m side exactly). n=3 -> [-8,0,8] (spans [-12,-4],[-4,4],[4,12],
 *  covering 24m exactly). No case leaves a gap or overlap. */
function slotOffset(k: number, n: number): number {
  return -HALF_SEGMENT * (n - 1) + SEGMENT * k;
}

function segCountOnSide(room: RoomShape, side: Side): number {
  return SIDES[side].nx === 0 ? segCount(room.halfX) : segCount(room.halfZ);
}

/** world position + rotation of wall slot k on a room's side */
function slotPos(room: RoomShape, side: Side, k: number): DungeonWall {
  const { nx, nz } = SIDES[side];
  if (nx === 0) {
    return { x: room.cx + slotOffset(k, segCount(room.halfX)), z: room.cz + nz * room.halfZ, rot: 0 };
  }
  return { x: room.cx + nx * room.halfX, z: room.cz + slotOffset(k, segCount(room.halfZ)), rot: 1 };
}

// ---------------------------------------------------------------------------
// AABB helpers for overlap rejection during placement
// ---------------------------------------------------------------------------

interface AABB { x0: number; x1: number; z0: number; z1: number }

function roomAABB(room: RoomShape, margin = 0): AABB {
  return {
    x0: room.cx - room.halfX - margin, x1: room.cx + room.halfX + margin,
    z0: room.cz - room.halfZ - margin, z1: room.cz + room.halfZ + margin,
  };
}

function overlaps(a: AABB, b: AABB): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
}

// ---------------------------------------------------------------------------
// Placement: attach one new room to an existing one via a straight corridor
// ---------------------------------------------------------------------------

interface Placement { cx: number; cz: number; corridor: AABB; kC: number }

/** Solve the child room's position so its own entry slot (on the side
 *  opposite `side`) lines up exactly with the parent's exit slot, connected
 *  by a straight CORRIDOR_LENGTH corridor exactly one SEGMENT wide. Traced
 *  by hand for both an along-X-cross-axis side (N) and an
 *  along-Z-cross-axis side (E) before trusting this — see the redesign PR
 *  description for the full derivation; the two axes are handled by the
 *  same formula via `crossIsX`, not four hand-duplicated blocks (which is
 *  exactly the shape of bug the original linear-chain code had). */
function placeChild(
  parent: RoomShape, side: Side, kP: number, halfXc: number, halfZc: number, rnd: () => number,
): Placement {
  const exit = slotPos(parent, side, kP);
  const crossIsX = SIDES[side].nx === 0; // N/S: cross-axis is X. E/W: cross-axis is Z.
  const segChildEntry = crossIsX ? segCount(halfXc) : segCount(halfZc);
  const kC = Math.floor(rnd() * segChildEntry);
  const childEntryOffset = slotOffset(kC, segChildEntry);

  const exitCross = crossIsX ? exit.x : exit.z;
  const childCross = exitCross - childEntryOffset;

  const dirSign = crossIsX ? SIDES[side].nz : SIDES[side].nx;
  const parentAlong = crossIsX ? parent.cz : parent.cx;
  const parentHalfAlong = crossIsX ? parent.halfZ : parent.halfX;
  const childHalfAlong = crossIsX ? halfZc : halfXc;

  const parentFace = parentAlong + dirSign * parentHalfAlong;
  const childFace = parentFace + dirSign * CORRIDOR_LENGTH;
  const childAlong = childFace + dirSign * childHalfAlong;

  const cx = crossIsX ? childCross : childAlong;
  const cz = crossIsX ? childAlong : childCross;

  const corridor: AABB = crossIsX
    ? {
        x0: exitCross - HALF_SEGMENT, x1: exitCross + HALF_SEGMENT,
        z0: Math.min(parentFace, childFace), z1: Math.max(parentFace, childFace),
      }
    : {
        x0: Math.min(parentFace, childFace), x1: Math.max(parentFace, childFace),
        z0: exitCross - HALF_SEGMENT, z1: exitCross + HALF_SEGMENT,
      };

  return { cx, cz, corridor, kC };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

interface GenRoom {
  index: number; cx: number; cz: number; halfX: number; halfZ: number;
  parent: number | null; depth: number;
}
interface GenEdge { parent: number; child: number; corridor: AABB }

/** Fisher-Yates, so "which side of a room has a free slot" isn't biased
 *  toward always trying N first. */
function shuffledSides(rnd: () => number): Side[] {
  const a: Side[] = ['N', 'S', 'E', 'W'];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tryGenerate(rnd: () => number, seed: number): DungeonLayout | null {
  const totalRooms = 5 + Math.floor(rnd() * 4); // 5..8

  const rooms: GenRoom[] = [{
    index: 0, cx: DUNGEON_ORIGIN.x, cz: DUNGEON_ORIGIN.z,
    halfX: pickSize(rnd), halfZ: pickSize(rnd), parent: null, depth: 0,
  }];
  const edges: GenEdge[] = [];
  // "side:slotIndex" strings used on a room, keyed by room index
  const usedSlots = new Map<number, Set<string>>([[0, new Set()]]);

  let attempts = 0;
  while (rooms.length < totalRooms && attempts < MAX_ATTEMPTS) {
    attempts++;
    // uniform over ALL rooms so far, not just the most recent -> a real
    // random recursive tree, not a disguised chain (see module doc)
    const parent = rooms[Math.floor(rnd() * rooms.length)];
    if (parent.depth >= MAX_TREE_DEPTH) continue;

    let side: Side | null = null;
    let kP = -1;
    for (const s of shuffledSides(rnd)) {
      const n = segCountOnSide(parent, s);
      const used = usedSlots.get(parent.index)!;
      const free: number[] = [];
      for (let k = 0; k < n; k++) if (!used.has(`${s}:${k}`)) free.push(k);
      if (free.length > 0) { side = s; kP = free[Math.floor(rnd() * free.length)]; break; }
    }
    if (side === null) continue; // parent has no free side/slot left

    const halfXc = pickSize(rnd);
    const halfZc = pickSize(rnd);
    const placement = placeChild(parent, side, kP, halfXc, halfZc, rnd);

    const reach = Math.hypot(
      Math.abs(placement.cx - DUNGEON_ORIGIN.x) + halfXc,
      Math.abs(placement.cz - DUNGEON_ORIGIN.z) + halfZc,
    );
    if (reach > REACH_LIMIT) continue;

    const childShape: RoomShape = { cx: placement.cx, cz: placement.cz, halfX: halfXc, halfZ: halfZc };
    const childAABB = roomAABB(childShape, MARGIN);

    // the corridor legitimately touches the parent's own wall face by
    // construction, so it (and the child room) are only checked against
    // every OTHER room/corridor, never the parent being branched from
    let rejected = false;
    for (const r of rooms) {
      if (r.index === parent.index) continue;
      const rAABB = roomAABB(r);
      if (overlaps(childAABB, rAABB) || overlaps(placement.corridor, rAABB)) { rejected = true; break; }
    }
    if (!rejected) {
      for (const e of edges) {
        if (overlaps(childAABB, e.corridor) || overlaps(placement.corridor, e.corridor)) { rejected = true; break; }
      }
    }
    if (rejected) continue;

    usedSlots.get(parent.index)!.add(`${side}:${kP}`);
    const childIndex = rooms.length;
    usedSlots.set(childIndex, new Set([`${OPPOSITE[side]}:${placement.kC}`]));
    rooms.push({
      index: childIndex, cx: placement.cx, cz: placement.cz, halfX: halfXc, halfZ: halfZc,
      parent: parent.index, depth: parent.depth + 1,
    });
    edges.push({ parent: parent.index, child: childIndex, corridor: placement.corridor });
  }

  if (rooms.length < totalRooms) return null; // this seed didn't pack — caller retries fresh

  // boss selection: farthest LEAF from entry by hop count, tie-broken by
  // cumulative path length, deterministic given the seed. Room 0 can never
  // be a leaf: the very first placement attempt always has rooms.length===1,
  // so it always picks room 0 as parent, guaranteeing it at least one child.
  const childrenOf = new Map<number, number[]>();
  for (const e of edges) {
    if (!childrenOf.has(e.parent)) childrenOf.set(e.parent, []);
    childrenOf.get(e.parent)!.push(e.child);
  }
  const isLeaf = (i: number) => !childrenOf.has(i) || childrenOf.get(i)!.length === 0;
  const hops = new Array<number>(rooms.length).fill(0);
  const pathLen = new Array<number>(rooms.length).fill(0);
  for (let i = 1; i < rooms.length; i++) {
    const p = rooms[i].parent!;
    hops[i] = hops[p] + 1;
    pathLen[i] = pathLen[p] + Math.hypot(rooms[i].cx - rooms[p].cx, rooms[i].cz - rooms[p].cz);
  }
  let bossIdx = 0;
  for (let i = 1; i < rooms.length; i++) {
    if (!isLeaf(i)) continue;
    const bestIsLeaf = isLeaf(bossIdx);
    if (!bestIsLeaf || hops[i] > hops[bossIdx] || (hops[i] === hops[bossIdx] && pathLen[i] > pathLen[bossIdx])) {
      bossIdx = i;
    }
  }

  const finalRooms: DungeonRoom[] = rooms.map((r) => {
    const isEntry = r.index === 0;
    const isBoss = r.index === bossIdx;
    let enemyKind: EnemyKind = 'skeleton';
    let enemyCount = 0;
    if (isEntry) {
      enemyCount = 0; // a safe room to get your bearings
    } else if (isBoss) {
      enemyKind = 'gilbert';
      enemyCount = 1;
    } else {
      enemyKind = rnd() < 0.55 ? 'skeleton' : 'bandit';
      enemyCount = 1 + Math.floor(rnd() * 2);
    }
    return {
      index: r.index, cx: r.cx, cz: r.cz, halfX: r.halfX, halfZ: r.halfZ, parent: r.parent,
      isEntry, isBoss, enemyKind, enemyCount, spawned: false, cleared: enemyCount === 0,
    };
  });

  const walls: DungeonWall[] = [];
  for (const room of finalRooms) {
    const used = usedSlots.get(room.index)!;
    for (const side of ['N', 'S', 'E', 'W'] as Side[]) {
      const n = segCountOnSide(room, side);
      for (let k = 0; k < n; k++) {
        if (used.has(`${side}:${k}`)) continue; // corridor mouth — leave open
        walls.push(slotPos(room, side, k));
      }
    }
  }

  const corridors: DungeonCorridor[] = edges.map((e) => ({
    roomA: e.parent, roomB: e.child,
    x0: e.corridor.x0, x1: e.corridor.x1, z0: e.corridor.z0, z1: e.corridor.z1,
  }));

  return {
    seed, origin: { ...DUNGEON_ORIGIN }, rooms: finalRooms, walls, corridors,
    entryPos: { x: finalRooms[0].cx, z: finalRooms[0].cz }, rewarded: false,
  };
}

/** Guaranteed-safe fallback if MAX_REGENERATIONS worth of attempts all fail
 *  to pack totalRooms — a straight 5-room chain built from the exact same
 *  slotPos/segCount tiling helpers as the real generator, so it can never
 *  reintroduce the overlap bug even in this degenerate path. Real rejection
 *  storms for 5-8 rooms with REACH_LIMIT=96 and MARGIN=6 in an open plane
 *  should be extremely rare; this exists so enterDungeon() can never
 *  throw/softlock, not because failure is expected. */
function generateFallbackLayout(): DungeonLayout {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const rnd = mulberry32(seed);
  const totalRooms = 5;
  const half = HALF_SEGMENT * 2; // 16x16 rooms — comfortably tiles with the fixed spacing below
  const spacing = half * 2 + CORRIDOR_LENGTH;

  const rooms: GenRoom[] = [];
  const usedSlots = new Map<number, Set<string>>();
  for (let i = 0; i < totalRooms; i++) {
    rooms.push({
      index: i, cx: DUNGEON_ORIGIN.x + i * spacing, cz: DUNGEON_ORIGIN.z,
      halfX: half, halfZ: half, parent: i === 0 ? null : i - 1, depth: i,
    });
    usedSlots.set(i, new Set());
  }

  const edges: GenEdge[] = [];
  for (let i = 0; i < totalRooms - 1; i++) {
    const parent = rooms[i];
    const child = rooms[i + 1];
    const n = segCountOnSide(parent, 'E');
    const kMid = Math.floor((n - 1) / 2);
    usedSlots.get(i)!.add(`E:${kMid}`);
    usedSlots.get(i + 1)!.add(`W:${kMid}`);
    const exit = slotPos(parent, 'E', kMid);
    const entry = slotPos(child, 'W', kMid);
    edges.push({
      parent: i, child: i + 1,
      corridor: { x0: exit.x, x1: entry.x, z0: exit.z - HALF_SEGMENT, z1: exit.z + HALF_SEGMENT },
    });
  }

  const finalRooms: DungeonRoom[] = rooms.map((r) => {
    const isEntry = r.index === 0;
    const isBoss = r.index === totalRooms - 1;
    let enemyKind: EnemyKind = 'skeleton';
    let enemyCount = 0;
    if (isEntry) {
      enemyCount = 0;
    } else if (isBoss) {
      enemyKind = 'gilbert';
      enemyCount = 1;
    } else {
      enemyKind = rnd() < 0.55 ? 'skeleton' : 'bandit';
      enemyCount = 1 + Math.floor(rnd() * 2);
    }
    return {
      index: r.index, cx: r.cx, cz: r.cz, halfX: r.halfX, halfZ: r.halfZ, parent: r.parent,
      isEntry, isBoss, enemyKind, enemyCount, spawned: false, cleared: enemyCount === 0,
    };
  });

  const walls: DungeonWall[] = [];
  for (const room of finalRooms) {
    const used = usedSlots.get(room.index)!;
    for (const side of ['N', 'S', 'E', 'W'] as Side[]) {
      const n = segCountOnSide(room, side);
      for (let k = 0; k < n; k++) {
        if (used.has(`${side}:${k}`)) continue;
        walls.push(slotPos(room, side, k));
      }
    }
  }

  const corridors: DungeonCorridor[] = edges.map((e) => ({
    roomA: e.parent, roomB: e.child,
    x0: e.corridor.x0, x1: e.corridor.x1, z0: e.corridor.z0, z1: e.corridor.z1,
  }));

  return {
    seed, origin: { ...DUNGEON_ORIGIN }, rooms: finalRooms, walls, corridors,
    entryPos: { x: finalRooms[0].cx, z: finalRooms[0].cz }, rewarded: false,
  };
}

export function generateDungeonLayout(): DungeonLayout {
  for (let regen = 0; regen < MAX_REGENERATIONS; regen++) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const rnd = mulberry32(seed);
    const result = tryGenerate(rnd, seed);
    if (result) return result;
  }
  return generateFallbackLayout();
}

export function resetDungeon() {
  dungeonState.layout = null;
}
