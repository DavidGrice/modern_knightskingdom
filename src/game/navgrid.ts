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
/** half-width of the home grid, centred on the homestead */
const HOME_HALF = 56;
/** how fat the walkers are; obstacles are inflated by this so a path never
 *  hugs a wall so tightly that the collision solver undoes it */
const AGENT_RADIUS = 0.55;
/** a box only blocks if it actually intersects the band a walker occupies */
const WALK_LOW = 0.55;   // matches PlayerController's STEP_UP: lower is a kerb
const WALK_HIGH = 1.7;   // above this it is an overhang you pass beneath

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export interface NavGridOptions {
  /** null = home. Matches Agent.region (src/ai/core/Agent.ts) and
   *  PlacedBuilding.world — the same "null means home" convention used
   *  everywhere else in this codebase (isHomeBuilding, TemplateWorld, etc). */
  region: string | null;
  /** grid centre, in world space. Home is 0,0; a destination's own origin
   *  (game/data/worlds.ts) once iteration 2.4 adds destination grids. */
  originX: number;
  originZ: number;
  halfExtent: number;
  cellSize: number;
}

/**
 * Phase 2, iteration 2.3 — the module-level singleton this file used to be
 * is now an instantiable class. This iteration's own scope, stated in
 * PHASE_STATUS.md: "getNavGrid(null) returns the home grid, behaviourally
 * identical to today." It is NOT the iteration that adds window mode,
 * layers, or links — those are 2.4 onward, once this extraction is proven
 * safe. `layer` parameters below already exist in the method signatures
 * (matching NPC_AI_SPEC's layer-indexing note, §0.1) but everything today
 * only ever populates layer 0 — there is exactly one NavGrid instance
 * (home) and nothing yet calls with layer !== 0.
 *
 * Search scratch (gScore/fScore/cameFrom/stamp/heap/heapPos, iteration 2.2)
 * is now PER-INSTANCE rather than module-level, sized to this instance's own
 * cellCount. That is a forward-looking choice, not something 2.3's own
 * "behaviourally identical" scope strictly requires yet (only one instance
 * exists) — but it is the one piece of this refactor that would need doing
 * again at 2.4 if skipped now, since a destination grid's cell count differs
 * from home's, and a shared module-level array sized for one grid cannot
 * safely serve another.
 */
export class NavGrid {
  readonly region: string | null;
  readonly originX: number;
  readonly originZ: number;
  readonly halfExtent: number;
  readonly cellSize: number;
  readonly dim: number;

  private blocked: Uint8Array;
  private builtFrom: PlacedBuilding[] | null = null;

  // A* scratch, allocated once per instance — see iteration 2.2's own
  // comment (still accurate) on why this is not allocated per search.
  private gScore: Float32Array;
  private fScore: Float32Array;
  private cameFrom: Int32Array;
  private stamp: Uint32Array;
  private searchId = 0;
  private heap: Int32Array;
  private heapPos: Int32Array;

  constructor(opts: NavGridOptions) {
    this.region = opts.region;
    this.originX = opts.originX;
    this.originZ = opts.originZ;
    this.halfExtent = opts.halfExtent;
    this.cellSize = opts.cellSize;
    this.dim = Math.round((opts.halfExtent * 2) / opts.cellSize);

    const n = this.dim * this.dim;
    this.blocked = new Uint8Array(n);
    this.gScore = new Float32Array(n);
    this.fScore = new Float32Array(n);
    this.cameFrom = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.heap = new Int32Array(n);
    this.heapPos = new Int32Array(n);
  }

  get cellCount(): number {
    return this.dim * this.dim;
  }

  private idx(i: number, j: number): number {
    return i * this.dim + j;
  }

  private toCellX(x: number): number {
    return Math.floor((x - this.originX + this.halfExtent) / this.cellSize);
  }

  private toCellZ(z: number): number {
    return Math.floor((z - this.originZ + this.halfExtent) / this.cellSize);
  }

  private toWorldX(i: number): number {
    return this.originX + (i + 0.5) * this.cellSize - this.halfExtent;
  }

  private toWorldZ(j: number): number {
    return this.originZ + (j + 0.5) * this.cellSize - this.halfExtent;
  }

  inBounds(x: number, z: number): boolean {
    return x > this.originX - this.halfExtent && x < this.originX + this.halfExtent
      && z > this.originZ - this.halfExtent && z < this.originZ + this.halfExtent;
  }

  /** True if (x, z) is walkable — in bounds and not blocked. `layer` is
   *  accepted now (spec §0.1) but unused until multi-layer grids exist. */
  isWalkable(x: number, z: number, _layer = 0): boolean {
    if (!this.inBounds(x, z)) return false;
    return this.blocked[this.idx(this.toCellX(x), this.toCellZ(z))] === 0;
  }

  /**
   * Rebuild the obstacle grid from the current buildings. Cheap enough to
   * call whenever the building list changes identity; a no-op if the array
   * is the same one last consumed.
   */
  rebuild(buildings: PlacedBuilding[]): void {
    if (this.builtFrom === buildings) return;
    this.builtFrom = buildings;
    this.blocked = new Uint8Array(this.dim * this.dim);

    for (const b of buildings) {
      // a construction-site ghost is not yet an obstacle; a building outside
      // this grid's own region is nowhere near it
      if (!isBuilt(b)) continue;
      const buildingRegion = isHomeBuilding(b) ? null : (b.world ?? null);
      if (buildingRegion !== this.region) continue;
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
        const i0 = Math.max(0, this.toCellX(cx - hx));
        const i1 = Math.min(this.dim - 1, this.toCellX(cx + hx));
        const j0 = Math.max(0, this.toCellZ(cz - hz));
        const j1 = Math.min(this.dim - 1, this.toCellZ(cz + hz));
        for (let i = i0; i <= i1; i++) {
          for (let j = j0; j <= j1; j++) this.blocked[this.idx(i, j)] = 1;
        }
      }
    }

    // Phase 2, iteration 2.1 — stamp terrain exclusions (water) in AFTER
    // building obstacles, on top of them.
    for (const ex of terrainExclusions) {
      if (ex.traversal !== 'blocked' || ex.region !== this.region) continue;
      const [ex0, ex1, ez0, ez1] = ex.shape.kind === 'circle'
        ? [ex.shape.x - ex.shape.r, ex.shape.x + ex.shape.r, ex.shape.z - ex.shape.r, ex.shape.z + ex.shape.r]
        : [ex.shape.x - ex.shape.hx, ex.shape.x + ex.shape.hx, ex.shape.z - ex.shape.hz, ex.shape.z + ex.shape.hz];
      const i0 = Math.max(0, this.toCellX(ex0));
      const i1 = Math.min(this.dim - 1, this.toCellX(ex1));
      const j0 = Math.max(0, this.toCellZ(ez0));
      const j1 = Math.min(this.dim - 1, this.toCellZ(ez1));
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          if (terrainBlocks(this.toWorldX(i), this.toWorldZ(j), this.region)) this.blocked[this.idx(i, j)] = 1;
        }
      }
    }
  }

  /** Nearest open cell to (i, j), searched outward to `maxRadius` cells — so
   *  a walker that has been shoved inside geometry can still find its way
   *  back out. `findPath` uses the default (matches the original module's
   *  hardcoded r<=6); `nearestWalkable` exposes the radius to its caller. */
  private nearestOpenCell(i: number, j: number, maxRadius = 6): [number, number] | null {
    if (i >= 0 && j >= 0 && i < this.dim && j < this.dim && !this.blocked[this.idx(i, j)]) return [i, j];
    for (let r = 1; r <= maxRadius; r++) {
      for (let di = -r; di <= r; di++) {
        for (let dj = -r; dj <= r; dj++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const a = i + di;
          const b = j + dj;
          if (a < 0 || b < 0 || a >= this.dim || b >= this.dim) continue;
          if (!this.blocked[this.idx(a, b)]) return [a, b];
        }
      }
    }
    return null;
  }

  /** Nearest walkable world point to (x, z), searched outward cell by cell
   *  up to `maxRadius` cells, or null if nothing within range is open. Not
   *  wired up anywhere yet — iteration 2.9 (anchor resolution) is the first
   *  real caller; exposed now since it is a direct rename/expose of the
   *  private search this class already needed for `findPath` itself. */
  nearestWalkable(x: number, z: number, maxRadius = 6, _layer = 0): { x: number; z: number } | null {
    const found = this.nearestOpenCell(this.toCellX(x), this.toCellZ(z), maxRadius);
    return found ? { x: this.toWorldX(found[0]), z: this.toWorldZ(found[1]) } : null;
  }

  /** First touch of `i` in the current search: stamp it and give it fresh
   *  g/f/came/heapPos values. A no-op on every subsequent touch this search.
   *  heapPos = -1 means "not currently in the heap" — Int32Array defaults
   *  every entry to 0, which is a valid heap POSITION, so "not in the heap"
   *  needs its own explicit sentinel rather than relying on the zero-value
   *  default the way gScore/fScore can rely on Infinity-via-fresh-touch. */
  private touch(i: number): void {
    if (this.stamp[i] === this.searchId) return;
    this.stamp[i] = this.searchId;
    this.gScore[i] = Infinity;
    this.fScore[i] = Infinity;
    this.cameFrom[i] = -1;
    this.heapPos[i] = -1;
  }

  // Binary min-heap on fScore, with an index map (heapPos) for O(log n)
  // decrease-key. No explicit closed-set: a cell is only ever in the heap
  // once (fresh push OR decrease-key, never both), and the existing
  // `tentative >= gScore[n]` dominance check already rejects any worse
  // re-relaxation of an already-finalized cell — the same guarantee a
  // closed-set would provide, without a fourth array to maintain.
  private heapSiftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.fScore[this.heap[parent]] <= this.fScore[this.heap[i]]) return;
      const tmp = this.heap[parent]; this.heap[parent] = this.heap[i]; this.heap[i] = tmp;
      this.heapPos[this.heap[parent]] = parent;
      this.heapPos[this.heap[i]] = i;
      i = parent;
    }
  }

  private heapSiftDown(size: number, i: number): void {
    for (;;) {
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      let smallest = i;
      if (l < size && this.fScore[this.heap[l]] < this.fScore[this.heap[smallest]]) smallest = l;
      if (r < size && this.fScore[this.heap[r]] < this.fScore[this.heap[smallest]]) smallest = r;
      if (smallest === i) return;
      const tmp = this.heap[smallest]; this.heap[smallest] = this.heap[i]; this.heap[i] = tmp;
      this.heapPos[this.heap[smallest]] = smallest;
      this.heapPos[this.heap[i]] = i;
      i = smallest;
    }
  }

  /** Fresh push (cell not currently in the heap) — appends and sifts up. */
  private heapPush(size: number, cell: number): number {
    this.heap[size] = cell;
    this.heapPos[cell] = size;
    this.heapSiftUp(size);
    return size + 1;
  }

  /**
   * A* from one world point to another. Returns waypoints in world space
   * (already string-pulled to drop collinear runs), or null when there is no
   * route — a caller that gets null should fall back to steering straight,
   * which is what the old behaviour was everywhere.
   */
  findPath(
    sx: number, sz: number, tx: number, tz: number, maxNodes = 4000, _layer = 0,
  ): { x: number; z: number }[] | null {
    if (!this.inBounds(sx, sz) || !this.inBounds(tx, tz)) return null;
    const start = this.nearestOpenCell(this.toCellX(sx), this.toCellZ(sz));
    const goal = this.nearestOpenCell(this.toCellX(tx), this.toCellZ(tz));
    if (!start || !goal) return null;
    const [si, sj] = start;
    const [gi, gj] = goal;
    if (si === gi && sj === gj) return [];

    this.searchId++;
    let heapSize = 0;
    const h = (i: number, j: number) => {
      const dx = Math.abs(i - gi);
      const dz = Math.abs(j - gj);
      return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); // octile
    };

    const s = this.idx(si, sj);
    const goalIdx = this.idx(gi, gj);
    this.touch(s);
    this.gScore[s] = 0;
    this.fScore[s] = h(si, sj);
    heapSize = this.heapPush(heapSize, s);
    let visited = 0;

    while (heapSize > 0) {
      const cur = this.heap[0];
      heapSize--;
      this.heapPos[cur] = -1;
      // when the heap has just emptied, heap[0] is still `cur` in memory —
      // skip touching it again so the -1 just written is not immediately
      // clobbered back to a stale 0
      if (heapSize > 0) {
        this.heap[0] = this.heap[heapSize];
        this.heapPos[this.heap[0]] = 0;
        this.heapSiftDown(heapSize, 0);
      }

      if (cur === goalIdx) {
        const cells: [number, number][] = [];
        for (let n = cur; n !== -1; n = this.cameFrom[n]) cells.push([Math.floor(n / this.dim), n % this.dim]);
        cells.reverse();
        // drop the interior of straight runs: the follower only needs corners
        const out: { x: number; z: number }[] = [];
        for (let k = 1; k < cells.length; k++) {
          const prev = cells[k - 1];
          const at = cells[k];
          const next = cells[k + 1];
          if (next && (at[0] - prev[0]) === (next[0] - at[0]) && (at[1] - prev[1]) === (next[1] - at[1])) continue;
          out.push({ x: this.toWorldX(at[0]), z: this.toWorldZ(at[1]) });
        }
        return out;
      }
      if (++visited > maxNodes) return null;
      const ci = Math.floor(cur / this.dim);
      const cj = cur % this.dim;
      for (const [di, dj, cost] of NEIGHBOURS) {
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= this.dim || nj >= this.dim) continue;
        const n = this.idx(ni, nj);
        if (this.blocked[n]) continue;
        // no cutting a corner diagonally between two blocked cells
        if (di && dj && (this.blocked[this.idx(ci + di, cj)] || this.blocked[this.idx(ci, cj + dj)])) continue;
        this.touch(n);
        const tentative = this.gScore[cur] + cost;
        if (tentative >= this.gScore[n]) continue;
        this.cameFrom[n] = cur;
        this.gScore[n] = tentative;
        this.fScore[n] = tentative + h(ni, nj);
        if (this.heapPos[n] === -1) {
          heapSize = this.heapPush(heapSize, n);
        } else {
          // already in the heap this search — f just decreased, so it can
          // only need to move up, never down (decrease-key)
          this.heapSiftUp(this.heapPos[n]);
        }
      }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Registry + backward-compatible top-level API. Iteration 2.3's own stated
// scope: "getNavGrid(null) returns the home grid, behaviourally identical to
// today." Destination/crypt grids do not exist yet (iterations 2.4/2.6) — a
// non-null region here is a clear, deliberate error rather than a silent
// wrong-grid fallback, since nothing in phases 1-3 calls this with one yet.
// ---------------------------------------------------------------------------

const homeGrid = new NavGrid({ region: null, originX: 0, originZ: 0, halfExtent: HOME_HALF, cellSize: CELL });

export function getNavGrid(region: string | null): NavGrid {
  if (region === null) return homeGrid;
  throw new Error(`getNavGrid: no grid for region "${region}" yet — destination/crypt grids land in iterations 2.4/2.6.`);
}

export function navInBounds(x: number, z: number): boolean {
  return homeGrid.inBounds(x, z);
}

export function navBlocked(x: number, z: number): boolean {
  if (!homeGrid.inBounds(x, z)) return false;
  return !homeGrid.isWalkable(x, z);
}

export function rebuildNav(buildings: PlacedBuilding[]): void {
  homeGrid.rebuild(buildings);
}

export function findPath(
  sx: number, sz: number, tx: number, tz: number, maxNodes = 4000,
): { x: number; z: number }[] | null {
  return homeGrid.findPath(sx, sz, tx, tz, maxNodes);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kknav = { findPath, navBlocked, rebuildNav, getNavGrid };
}

/** per-agent routing state, stashed on the agent object itself so callers
 *  don't need a parallel registry */
export interface NavAgent {
  x: number;
  z: number;
  /** which NavGrid this agent paths against — matches src/ai/core/Agent's
   *  own `region` field. Absent (undefined) means home, same as null;
   *  existing callers that never set this keep working unchanged. */
  region?: string | null;
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

  const grid = getNavGrid(agent.region ?? null);
  const n = agent.nav ?? (agent.nav = { pts: [], i: 0, t: 0, tx: 0, tz: 0 });
  n.t -= dt;
  if (n.t <= 0 || Math.hypot(tx - n.tx, tz - n.tz) > 3) {
    // stagger recomputes so a whole village does not solve on the same frame
    n.t = 1.1 + Math.random() * 0.8;
    n.tx = tx;
    n.tz = tz;
    n.pts = grid.findPath(agent.x, agent.z, tx, tz) ?? [];
    n.i = 0;
  }
  while (n.i < n.pts.length
    && Math.hypot(n.pts[n.i].x - agent.x, n.pts[n.i].z - agent.z) < 1.1) n.i++;

  if (n.i >= n.pts.length) return { nx: gdx / inv, nz: gdz / inv, dist };
  const w = n.pts[n.i];
  const wd = Math.hypot(w.x - agent.x, w.z - agent.z) || 1;
  return { nx: (w.x - agent.x) / wd, nz: (w.z - agent.z) / wd, dist };
}
