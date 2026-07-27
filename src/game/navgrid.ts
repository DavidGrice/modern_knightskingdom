'use client';
// Navigation grid + A*, so nothing walks through a wall any more.
//
// Enemies and villagers both used to steer straight at their target and let
// the collision solver shove them sideways, which reads as walking through
// masonry whenever the shove happened to clear the far side. They now route
// around structures and, crucially, THROUGH real openings.
//
// The grid is derived from the same per-piece collision volumes the player
// is stopped by (`collisionBoxesFor`, backed by the OBJ-derived
// collision.json) rather than from a second hand-maintained obstacle list.
// That is the whole point: a hole in the geometry is automatically a hole in
// the navmesh, so a breached wall, an archway or an open gate is walkable
// without anyone remembering to say so.
import { collisionBoxesFor } from './data/buildables';
import { isBuilt, isHomeBuilding, type PlacedBuilding } from './types';
import { terrainBlocks, terrainExclusions } from './navTerrain';

/** metres per cell — fine enough to find a gate, coarse enough to stay cheap */
export const CELL = 1;
/** half-width of the square the grid covers, centred on the homestead */
const HALF = 56;
const DIM = (HALF * 2) / CELL;
/** how fat the walkers are; obstacles are inflated by this so a path never
 *  hugs a wall so tightly that the collision solver undoes it */
const AGENT_RADIUS = 0.55;
/** a box only blocks if it actually intersects the band a walker occupies */
const WALK_LOW = 0.55;   // matches PlayerController's STEP_UP: lower is a kerb
const WALK_HIGH = 1.7;   // above this it is an overhang you pass beneath

let blocked = new Uint8Array(DIM * DIM);
let builtFrom: PlacedBuilding[] | null = null;

const idx = (i: number, j: number) => i * DIM + j;
const toCell = (v: number) => Math.floor((v + HALF) / CELL);
const toWorld = (c: number) => (c + 0.5) * CELL - HALF;

export function navInBounds(x: number, z: number): boolean {
  return x > -HALF && x < HALF && z > -HALF && z < HALF;
}

export function navBlocked(x: number, z: number): boolean {
  if (!navInBounds(x, z)) return false;
  return blocked[idx(toCell(x), toCell(z))] === 1;
}

/**
 * Rebuild the obstacle grid from the current buildings. Cheap enough to call
 * whenever the building list changes identity; it is a no-op if the array is
 * the same one we last consumed.
 */
export function rebuildNav(buildings: PlacedBuilding[]) {
  if (builtFrom === buildings) return;
  builtFrom = buildings;
  blocked = new Uint8Array(DIM * DIM);

  for (const b of buildings) {
    // a construction-site ghost is not yet an obstacle, and a remote plot's
    // structures are nowhere near this grid
    if (!isBuilt(b) || !isHomeBuilding(b)) continue;
    for (const box of collisionBoxesFor(b.type, b.rot)) {
      const base = (b.y ?? 0) + box.yBase;
      const top = (b.y ?? 0) + box.yTop;
      // an overhang (a battlement walkway, an archway crown) is not an
      // obstacle at ground level — this is what lets a walker use a gateway
      if (top <= WALK_LOW || base >= WALK_HIGH) continue;
      const cx = b.x + (box.ox ?? 0);
      const cz = b.z + (box.oz ?? 0);
      const hx = box.hx + AGENT_RADIUS;
      const hz = box.hz + AGENT_RADIUS;
      const i0 = Math.max(0, toCell(cx - hx));
      const i1 = Math.min(DIM - 1, toCell(cx + hx));
      const j0 = Math.max(0, toCell(cz - hz));
      const j1 = Math.min(DIM - 1, toCell(cz + hz));
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) blocked[idx(i, j)] = 1;
      }
    }
  }

  // Phase 2, iteration 2.1 — stamp terrain exclusions (water) in AFTER
  // building obstacles, on top of them. Region is always null here; this is
  // the single home grid until region support (iteration 2.3) exists.
  // Bounded to each exclusion's own footprint rather than scanning all
  // DIM*DIM cells — cheap either way at this grid size, but there is no
  // reason not to bound it the same way the building loop above already does.
  for (const ex of terrainExclusions) {
    if (ex.traversal !== 'blocked' || ex.region !== null) continue;
    const [ex0, ex1, ez0, ez1] = ex.shape.kind === 'circle'
      ? [ex.shape.x - ex.shape.r, ex.shape.x + ex.shape.r, ex.shape.z - ex.shape.r, ex.shape.z + ex.shape.r]
      : [ex.shape.x - ex.shape.hx, ex.shape.x + ex.shape.hx, ex.shape.z - ex.shape.hz, ex.shape.z + ex.shape.hz];
    const i0 = Math.max(0, toCell(ex0));
    const i1 = Math.min(DIM - 1, toCell(ex1));
    const j0 = Math.max(0, toCell(ez0));
    const j1 = Math.min(DIM - 1, toCell(ez1));
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        if (terrainBlocks(toWorld(i), toWorld(j), null)) blocked[idx(i, j)] = 1;
      }
    }
  }
}

/** nearest open cell to (i, j), searched outward — so a walker that has been
 *  shoved inside geometry can still find its way back out */
function nearestOpen(i: number, j: number): [number, number] | null {
  if (i >= 0 && j >= 0 && i < DIM && j < DIM && !blocked[idx(i, j)]) return [i, j];
  for (let r = 1; r <= 6; r++) {
    for (let di = -r; di <= r; di++) {
      for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di;
        const b = j + dj;
        if (a < 0 || b < 0 || a >= DIM || b >= DIM) continue;
        if (!blocked[idx(a, b)]) return [a, b];
      }
    }
  }
  return null;
}

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

// Phase 2, iteration 2.2 — search scratch state, allocated ONCE rather than
// per findPath call. §0.4 (zero allocation in per-frame code) applies here:
// navSteer calls findPath on every villager's staggered repath, up to 20
// agents doing it within the same few-second window, and each call used to
// allocate three DIM*DIM typed arrays (g, f, came) plus an `open` array that
// grew and shrank via splice(). At this grid size (12,544 cells) that is
// cheap in isolation but adds up to real GC churn exactly when it matters
// least — mid-raid, per PHASE_2_NAVIGATION_AND_GATHERING.md §0's argument for
// why rebuildNav's own cost matters. Search hygiene (§2.5): 200 consecutive
// findPath calls should show flat heap allocation — verified in
// scripts/smoke134.mjs.
//
// Lazy-clear via generation stamp instead of reallocating/filling per call:
// a cell is "fresh" for the current search iff stamp[i] !== searchId.
// Touching a cell for the first time in a search sets stamp[i] = searchId
// and initializes its g/f/came entries; "clearing" between searches is just
// searchId++, an O(1) reset instead of an O(DIM²) fill.
const DIM2 = DIM * DIM;
const gScore = new Float32Array(DIM2);
const fScore = new Float32Array(DIM2);
const cameFrom = new Int32Array(DIM2);
const stamp = new Uint32Array(DIM2);
let searchId = 0;

/** First touch of `i` in the current search: stamp it and give it fresh
 *  g/f/came/heapPos values. A no-op on every subsequent touch this search.
 *  heapPos = -1 means "not currently in the heap" — Int32Array defaults
 *  every entry to 0, which is a valid heap POSITION, so "not in the heap"
 *  needs its own explicit sentinel rather than relying on the zero-value
 *  default the way gScore/fScore can rely on Infinity-via-fresh-touch. */
function touch(i: number) {
  if (stamp[i] === searchId) return;
  stamp[i] = searchId;
  gScore[i] = Infinity;
  fScore[i] = Infinity;
  cameFrom[i] = -1;
  heapPos[i] = -1;
}

// Binary min-heap on fScore, with an index map (heapPos) for O(log n)
// decrease-key instead of the O(n) "scan open for the smallest f" the
// previous linear-array version did. heapPos validity rides on the SAME
// stamp as gScore/fScore/cameFrom — a stale heapPos from a previous search
// is never trusted, because a cell that hasn't been touched(...) this search
// cannot be "in the heap" this search, so there is nothing to reset between
// calls beyond bumping searchId. No explicit closed-set: a cell is only ever
// in the heap once (fresh push OR decrease-key, never both), and the
// existing `tentative >= gScore[n]` dominance check already rejects any
// worse re-relaxation of an already-finalized cell — the same guarantee a
// closed-set would provide, without a fourth array to maintain.
const heap = new Int32Array(DIM2);
const heapPos = new Int32Array(DIM2);

function heapSiftUp(i: number) {
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (fScore[heap[parent]] <= fScore[heap[i]]) return;
    const tmp = heap[parent]; heap[parent] = heap[i]; heap[i] = tmp;
    heapPos[heap[parent]] = parent;
    heapPos[heap[i]] = i;
    i = parent;
  }
}

function heapSiftDown(size: number, i: number) {
  for (;;) {
    const l = i * 2 + 1;
    const r = i * 2 + 2;
    let smallest = i;
    if (l < size && fScore[heap[l]] < fScore[heap[smallest]]) smallest = l;
    if (r < size && fScore[heap[r]] < fScore[heap[smallest]]) smallest = r;
    if (smallest === i) return;
    const tmp = heap[smallest]; heap[smallest] = heap[i]; heap[i] = tmp;
    heapPos[heap[smallest]] = smallest;
    heapPos[heap[i]] = i;
    i = smallest;
  }
}

/** Fresh push (cell not currently in the heap) — appends and sifts up. */
function heapPush(size: number, cell: number): number {
  heap[size] = cell;
  heapPos[cell] = size;
  heapSiftUp(size);
  return size + 1;
}

/**
 * A* from one world point to another. Returns waypoints in world space
 * (already string-pulled to drop collinear runs), or null when there is no
 * route — a caller that gets null should fall back to steering straight,
 * which is what the old behaviour was everywhere.
 */
export function findPath(
  sx: number, sz: number, tx: number, tz: number, maxNodes = 4000,
): { x: number; z: number }[] | null {
  if (!navInBounds(sx, sz) || !navInBounds(tx, tz)) return null;
  const start = nearestOpen(toCell(sx), toCell(sz));
  const goal = nearestOpen(toCell(tx), toCell(tz));
  if (!start || !goal) return null;
  const [si, sj] = start;
  const [gi, gj] = goal;
  if (si === gi && sj === gj) return [];

  searchId++;
  let heapSize = 0;
  const h = (i: number, j: number) => {
    const dx = Math.abs(i - gi);
    const dz = Math.abs(j - gj);
    return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); // octile
  };

  const s = idx(si, sj);
  const goalIdx = idx(gi, gj);
  touch(s);
  gScore[s] = 0;
  fScore[s] = h(si, sj);
  heapSize = heapPush(heapSize, s);
  let visited = 0;

  while (heapSize > 0) {
    const cur = heap[0];
    heapSize--;
    heapPos[cur] = -1;
    // when the heap has just emptied, heap[0] is still `cur` in memory —
    // skip touching it again so the -1 just written is not immediately
    // clobbered back to a stale 0
    if (heapSize > 0) {
      heap[0] = heap[heapSize];
      heapPos[heap[0]] = 0;
      heapSiftDown(heapSize, 0);
    }

    if (cur === goalIdx) {
      const cells: [number, number][] = [];
      for (let n = cur; n !== -1; n = cameFrom[n]) cells.push([Math.floor(n / DIM), n % DIM]);
      cells.reverse();
      // drop the interior of straight runs: the follower only needs corners
      const out: { x: number; z: number }[] = [];
      for (let k = 1; k < cells.length; k++) {
        const prev = cells[k - 1];
        const at = cells[k];
        const next = cells[k + 1];
        if (next && (at[0] - prev[0]) === (next[0] - at[0]) && (at[1] - prev[1]) === (next[1] - at[1])) continue;
        out.push({ x: toWorld(at[0]), z: toWorld(at[1]) });
      }
      return out;
    }
    if (++visited > maxNodes) return null;
    const ci = Math.floor(cur / DIM);
    const cj = cur % DIM;
    for (const [di, dj, cost] of NEIGHBOURS) {
      const ni = ci + di;
      const nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= DIM || nj >= DIM) continue;
      const n = idx(ni, nj);
      if (blocked[n]) continue;
      // no cutting a corner diagonally between two blocked cells
      if (di && dj && (blocked[idx(ci + di, cj)] || blocked[idx(ci, cj + dj)])) continue;
      touch(n);
      const tentative = gScore[cur] + cost;
      if (tentative >= gScore[n]) continue;
      cameFrom[n] = cur;
      gScore[n] = tentative;
      fScore[n] = tentative + h(ni, nj);
      if (heapPos[n] === -1) {
        heapSize = heapPush(heapSize, n);
      } else {
        // already in the heap this search — f just decreased, so it can
        // only need to move up, never down (decrease-key)
        heapSiftUp(heapPos[n]);
      }
    }
  }
  return null;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kknav = { findPath, navBlocked, rebuildNav };
}

/** per-agent routing state, stashed on the agent object itself so callers
 *  don't need a parallel registry */
export interface NavAgent {
  x: number;
  z: number;
  nav?: { pts: { x: number; z: number }[]; i: number; t: number; tx: number; tz: number };
}

/**
 * Steering direction from `agent` toward (tx, tz), routed via the grid.
 *
 * Returns a UNIT vector plus the straight-line distance to the real goal, so
 * a caller keeps its existing "am I there yet?" checks unchanged and only
 * swaps which way it steps. Falls back to steering straight when there is no
 * route, which is exactly what every caller did before.
 */
export function navSteer(
  agent: NavAgent, tx: number, tz: number, dt: number,
): { nx: number; nz: number; dist: number } {
  const gdx = tx - agent.x;
  const gdz = tz - agent.z;
  // Guard the DIVISOR only. This used to be `Math.hypot(...) || 1`, which
  // reported a distance of 1 for an agent standing exactly on its target —
  // so every caller's arrival check (`d < 0.4`, `d < 0.6`, `d < 1.2`) failed,
  // they took the keep-walking branch with a zero-length direction vector,
  // and never re-rolled the target because arrival never happened. That is
  // the "walks on the spot forever" bug: a villager whose spawn position
  // equals its first wander target could never leave the degenerate point,
  // and only a raid (which physically displaces them) broke the deadlock.
  const dist = Math.hypot(gdx, gdz);
  const inv = dist || 1;

  const n = agent.nav ?? (agent.nav = { pts: [], i: 0, t: 0, tx: 0, tz: 0 });
  n.t -= dt;
  if (n.t <= 0 || Math.hypot(tx - n.tx, tz - n.tz) > 3) {
    // stagger recomputes so a whole village does not solve on the same frame
    n.t = 1.1 + Math.random() * 0.8;
    n.tx = tx;
    n.tz = tz;
    n.pts = findPath(agent.x, agent.z, tx, tz) ?? [];
    n.i = 0;
  }
  while (n.i < n.pts.length
    && Math.hypot(n.pts[n.i].x - agent.x, n.pts[n.i].z - agent.z) < 1.1) n.i++;

  if (n.i >= n.pts.length) return { nx: gdx / inv, nz: gdz / inv, dist };
  const w = n.pts[n.i];
  const wd = Math.hypot(w.x - agent.x, w.z - agent.z) || 1;
  return { nx: (w.x - agent.x) / wd, nz: (w.z - agent.z) / wd, dist };
}
