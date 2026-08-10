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
import * as THREE from 'three';
import { collisionBoxesFor } from './data/buildables';
import { isBuilt, isDoorLike, isHomeBuilding, type PlacedBuilding } from './types';
import { terrainBlocks, terrainExclusions } from './navTerrain';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import { getMountedRoot, getMountedRegion } from '../components/world/TemplateWorld';
import { dungeonState, type DungeonLayout } from './dungeon';
import { useGameStore } from './store/gameStore';
import { onRoad } from './data/road';
import navgridConfig from '../ai/config/navgrid.json';

// Phase 2, iteration 2.5 — scratch vectors for height rasterization, reused
// across every triangle of every rasterize call rather than allocated per
// triangle. Rasterization is infrequent (grid build / recentre), not
// per-frame, so this is hygiene more than a hard requirement — but the
// codebase's own convention (TemplateWorld.tsx's rayOrigin/DOWN) is to reuse
// scratch objects for exactly this kind of geometry math, so match it.
const scratchV0 = new THREE.Vector3();
const scratchV1 = new THREE.Vector3();
const scratchV2 = new THREE.Vector3();

// Phase 2, iteration 2.4 — grid geometry now lives in one place,
// src/ai/config/navgrid.json, rather than as a hardcoded constant here plus
// a second copy in that JSON for iteration 2.7's LOD tier-B fix to read.
// `CELL` stays exported (unused externally today, but was already a public
// export before this iteration and nothing requires removing it).
/** metres per cell — fine enough to find a gate, coarse enough to stay cheap */
export const CELL = navgridConfig.home.cellSize;
/** half-width of the home grid, centred on the homestead */
const HOME_HALF = navgridConfig.home.halfExtent;
/** how fat the walkers are; obstacles are inflated by this so a path never
 *  hugs a wall so tightly that the collision solver undoes it */
const AGENT_RADIUS = 0.55;
/** a box only blocks if it actually intersects the band a walker occupies */
const WALK_LOW = 0.55;   // matches PlayerController's STEP_UP: lower is a kerb
const WALK_HIGH = 1.7;   // above this it is an overhang you pass beneath
/** Requested 2026-07-30: A* prefers a road cell over open ground by this
 *  fraction of its ordinary step cost — real enough to route someone onto
 *  the carriageway for a route that already runs near it, not so cheap a
 *  route detours far out of the way to touch one. */
const ROAD_STEP_MULT = 0.6;

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export interface NavGridOptions {
  /** null = home. Matches Agent.region (src/ai/core/Agent.ts) and
   *  PlacedBuilding.world — the same "null means home" convention used
   *  everywhere else in this codebase (isHomeBuilding, TemplateWorld, etc). */
  region: string | null;
  /** grid centre, in world space. Home is always 0,0; a destination's
   *  starting centre is its declared teleport origin (game/data/worlds.ts),
   *  corrected to the player's exact position by the first recentre() call. */
  originX: number;
  originZ: number;
  halfExtent: number;
  cellSize: number;
  /** 'fixed' (default) never moves — home, and the Crypt from iteration 2.6.
   *  'window' follows a moving centre (recentre()) and lets findPath route
   *  toward an out-of-bounds target instead of rejecting it outright — see
   *  the "path-chaining" note on findPath below. */
  mode?: 'fixed' | 'window';
  /** window mode only: recentre once the tracked point has moved this far
   *  from the grid's current centre — the "quarter window" hysteresis
   *  PHASE_2_NAVIGATION_AND_GATHERING.md §2.0 specifies, so the grid does not
   *  rebuild every frame the player merely shifts a metre. */
  recentreAt?: number;
  /** window mode only (§2.3): the largest per-cell height step a walker can
   *  climb. A neighbour pair whose rasterized `|Δy|` exceeds this is
   *  unlinked during search, same as a blocked cell. Deliberately just above
   *  PlayerController's own ~0.55 m step height, so agent traversal matches
   *  what the player can climb. Unset (fixed/home grids) means no height
   *  field is ever built and this check never fires. */
  maxStep?: number;
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
  // NOT readonly — a window-mode grid's centre moves under recentre().
  originX: number;
  originZ: number;
  readonly halfExtent: number;
  readonly cellSize: number;
  readonly dim: number;
  readonly mode: 'fixed' | 'window';
  private readonly recentreAt: number;

  private blocked: Uint8Array;
  private builtFrom: PlacedBuilding[] | null = null;

  // Phase 2, iteration 2.5 — ground-height field, window-mode grids only.
  // null means "no height data yet" (nothing mounted, or nothing mounted
  // for THIS region) or "mounted but zero triangles found" — both cases
  // mean the maxStep check below never fires, matching §2.3's "no terrain
  // mesh found → flat, skip step checks entirely."
  private heights: Float32Array | null = null;
  private heightsStale = true;
  private readonly maxStep: number;

  // Requested 2026-07-30: NPCs should prefer the road over cutting across
  // grass. The route is fixed for the whole run and only meaningful on the
  // home grid (road.ts's SIGNPOST-anchored route is a home-world concept —
  // a destination/dungeon grid's own coordinates could coincidentally fall
  // in the same numeric range without this meaning anything there), so it is
  // built once, lazily, rather than per rebuild() call like the (building-
  // dependent) obstacle grid above it.
  private roadMask: Uint8Array | null = null;

  private ensureRoadMask(): void {
    if (this.roadMask || this.region !== null) return;
    const n = this.dim * this.dim;
    const mask = new Uint8Array(n);
    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        if (onRoad(this.toWorldX(i), this.toWorldZ(j))) mask[this.idx(i, j)] = 1;
      }
    }
    this.roadMask = mask;
  }

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
    this.mode = opts.mode ?? 'fixed';
    this.recentreAt = opts.recentreAt ?? Infinity;
    this.maxStep = opts.maxStep ?? Infinity;
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

  /** Clamp a point into this grid's bounds, `margin` cells shy of the true
   *  edge (so the clamped result never sits exactly on the boundary, which
   *  could otherwise land in a half-covered edge cell). Used by findPath's
   *  path-chaining for a window-mode grid — see the note there. */
  private clampToBounds(x: number, z: number, margin = 1): { x: number; z: number } {
    const lo = -this.halfExtent + margin;
    const hi = this.halfExtent - margin;
    return {
      x: this.originX + Math.max(lo, Math.min(hi, x - this.originX)),
      z: this.originZ + Math.max(lo, Math.min(hi, z - this.originZ)),
    };
  }

  /**
   * Window mode only (a no-op otherwise): recentre on (x, z) — typically the
   * player's live position — if it has moved more than `recentreAt` from the
   * grid's current centre. This is the "quarter window" hysteresis §2.0
   * specifies: cheap to call every frame, since most calls just measure the
   * distance and return.
   *
   * Recentring invalidates `builtFrom` rather than rebuilding immediately —
   * the SAME array indices now address different world cells (the origin
   * moved), so the existing obstacle data is stale regardless of whether the
   * building list itself changed. The next `rebuild(buildings)` call (from
   * wherever already calls it) picks this up: `builtFrom === buildings`
   * would otherwise wrongly no-op, since the buildings array's own identity
   * has not changed, only this grid's relationship to world space has.
   */
  recentre(x: number, z: number): void {
    if (this.mode !== 'window') return;
    if (Math.hypot(x - this.originX, z - this.originZ) <= this.recentreAt) return;
    this.originX = x;
    this.originZ = z;
    this.builtFrom = null;
    // the height field is keyed by the same indices as `blocked`, so it is
    // exactly as stale as the obstacle grid the moment the origin moves —
    // same reasoning as builtFrom = null just above.
    this.heightsStale = true;
  }

  /** Rasterized ground height at (x, z), or null if this grid has no height
   *  field right now (fixed/home grids, a window grid whose terrain has not
   *  mounted yet, or one whose mounted bake had zero triangles). Public so
   *  callers besides `findPath` — a future foot-placement actuator, or a
   *  smoke test — can read real per-cell heights without reaching into
   *  private state. */
  heightAt(x: number, z: number): number | null {
    this.ensureHeights();
    if (!this.heights || !this.inBounds(x, z)) return null;
    return this.heights[this.idx(this.toCellX(x), this.toCellZ(z))];
  }

  private ensureHeights(): void {
    if (this.mode !== 'window' || !this.heightsStale) return;
    this.rasterizeHeights();
  }

  /**
   * Phase 2, iteration 2.5 — populate the per-cell ground-height field from
   * the mounted template bake's real geometry. PHASE_2_NAVIGATION_AND_GATHERING.md
   * §2.3: runtime rasterization over the mounted mesh's own triangles, not an
   * offline bake (would have to replicate normalizeTemplateBake's scale and
   * recentre and could drift) and not a per-cell raycast (thousands of
   * scene-graph traversals per recentre at this cell count).
   *
   * Guards against painting the WRONG region's geometry: `mountedRoot` is a
   * single global ref — only one destination is ever mounted at a time — so
   * a stale cached grid for a region the player has since left must not
   * rasterize from whatever happens to be mounted right now. When the
   * mounted region does not match this grid's own, `heightsStale` is left
   * true so a later call retries once this grid's region is the one
   * actually mounted, rather than being marked done on a false read.
   */
  private rasterizeHeights(): void {
    if (getMountedRegion() !== this.region) return;
    this.heightsStale = false;

    const root = getMountedRoot();
    if (!root) { this.heights = null; return; }

    const n = this.dim * this.dim;
    const heights = new Float32Array(n);
    const touched = new Uint8Array(n);
    let any = false;

    root.updateWorldMatrix(true, true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.attributes.position;
      if (!pos) return;
      const index = mesh.geometry.index;
      const triCount = (index ? index.count : pos.count) / 3;

      for (let t = 0; t < triCount; t++) {
        const a = index ? index.getX(t * 3) : t * 3;
        const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
        const c = index ? index.getX(t * 3 + 2) : t * 3 + 2;
        scratchV0.fromBufferAttribute(pos, a).applyMatrix4(mesh.matrixWorld);
        scratchV1.fromBufferAttribute(pos, b).applyMatrix4(mesh.matrixWorld);
        scratchV2.fromBufferAttribute(pos, c).applyMatrix4(mesh.matrixWorld);

        const minX = Math.min(scratchV0.x, scratchV1.x, scratchV2.x);
        const maxX = Math.max(scratchV0.x, scratchV1.x, scratchV2.x);
        const minZ = Math.min(scratchV0.z, scratchV1.z, scratchV2.z);
        const maxZ = Math.max(scratchV0.z, scratchV1.z, scratchV2.z);
        if (maxX < this.originX - this.halfExtent || minX > this.originX + this.halfExtent) continue;
        if (maxZ < this.originZ - this.halfExtent || minZ > this.originZ + this.halfExtent) continue;

        // barycentric denominator in the XZ plane; near-zero means the
        // triangle is degenerate (or near edge-on) when projected flat
        const denom = (scratchV1.z - scratchV2.z) * (scratchV0.x - scratchV2.x)
          + (scratchV2.x - scratchV1.x) * (scratchV0.z - scratchV2.z);
        if (Math.abs(denom) < 1e-8) continue;

        const i0 = Math.max(0, this.toCellX(minX));
        const i1 = Math.min(this.dim - 1, this.toCellX(maxX));
        const j0 = Math.max(0, this.toCellZ(minZ));
        const j1 = Math.min(this.dim - 1, this.toCellZ(maxZ));
        for (let i = i0; i <= i1; i++) {
          const px = this.toWorldX(i);
          for (let j = j0; j <= j1; j++) {
            const pz = this.toWorldZ(j);
            const wa = ((scratchV1.z - scratchV2.z) * (px - scratchV2.x)
              + (scratchV2.x - scratchV1.x) * (pz - scratchV2.z)) / denom;
            const wb = ((scratchV2.z - scratchV0.z) * (px - scratchV2.x)
              + (scratchV0.x - scratchV2.x) * (pz - scratchV2.z)) / denom;
            const wc = 1 - wa - wb;
            if (wa < -1e-3 || wb < -1e-3 || wc < -1e-3) continue; // outside the triangle
            const y = wa * scratchV0.y + wb * scratchV1.y + wc * scratchV2.y;
            const idx = this.idx(i, j);
            if (!touched[idx] || y > heights[idx]) { heights[idx] = y; touched[idx] = 1; }
            any = true;
          }
        }
      }
    });

    if (!any) { this.heights = null; return; }

    // Cells no triangle touched hold the last sampled value, in the same
    // row-major order `idx()` already uses — matching sampleTemplateGroundY's
    // own hold-last-known-height behaviour on a raycast miss. Ground sits at
    // y=0 after normalizeTemplateBake (TemplateWorld.tsx), so that is the
    // correct seed before the first touched cell, not an arbitrary guess.
    let last = 0;
    for (let i = 0; i < n; i++) {
      if (touched[i]) last = heights[i]; else heights[i] = last;
    }
    this.heights = heights;
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
      // iteration 2.10 — an open gate has zero collision, matching
      // PlayerController.tsx's own player-collision loop exactly
      // (`b.type === 'gate' && (gateOpen[b.id] ?? true) => passable`).
      // Found while verifying §2.5's "gate vs wall" checklist item: this
      // check was simply absent before, so every gate — open or closed —
      // was permanently solid to findPath/navSteer regardless of state,
      // while the player could already walk straight through an open one.
      // Wave 8 · an opened door is as walkable as a raised gate — the two are
      // one rule now (isDoorLike), so a villager routes through the door you
      // left open instead of walking round your whole yard
      if (isDoorLike(b.type) && (useGameStore.getState().gateOpen[b.id] ?? true)) continue;
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
   *
   * Path-chaining (window mode only): §2.0 specifies picking the window-edge
   * cell that minimises `travelled + straightLineRemainder` — evaluating
   * every boundary cell with its own search. That is roughly 4×halfExtent
   * separate A* runs per chained request, which is not a cost this function
   * should pay. Clamping the target into the window (leaving the target's
   * DIRECTION from the start point intact, just capped at the edge) reaches
   * the same practical outcome — a path that uses the window's full extent,
   * heading the right way, re-requested as the window recentres — for the
   * cost of the one search this function already runs. A fixed-mode grid
   * keeps the original behaviour exactly: an out-of-bounds target is simply
   * unreachable, same as before this iteration.
   */
  findPath(
    sx: number, sz: number, tx: number, tz: number, maxNodes = 4000, _layer = 0,
  ): { x: number; z: number }[] | null {
    this.ensureHeights();
    this.ensureRoadMask();
    if (!this.inBounds(sx, sz)) return null;
    let gx = tx, gz = tz;
    if (!this.inBounds(tx, tz)) {
      if (this.mode !== 'window') return null;
      const clamped = this.clampToBounds(tx, tz);
      gx = clamped.x;
      gz = clamped.z;
    }
    const start = this.nearestOpenCell(this.toCellX(sx), this.toCellZ(sz));
    const goal = this.nearestOpenCell(this.toCellX(gx), this.toCellZ(gz));
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
        // §2.3 maxStep: unlink a neighbour pair whose rasterized heights
        // differ by more than a walker can climb. this.heights is null for
        // fixed/home grids and for a window grid with no height data yet, so
        // this never fires there — exactly "skip step checks entirely."
        if (this.heights && Math.abs(this.heights[n] - this.heights[cur]) > this.maxStep) continue;
        this.touch(n);
        // Requested 2026-07-30: "use roads first, then grass" — a road cell
        // costs less to step onto, so a route that runs alongside or through
        // one is preferred over an equally-short line across open ground,
        // without being SO cheap that a walker detours far out of their way
        // chasing it. This makes the heuristic below mildly inadmissible
        // (h() assumes unit cost) in road-heavy stretches — accepted, same
        // as every other "good enough, not provably optimal" tradeoff this
        // search already makes (maxNodes cutoff, octile approximation).
        const stepCost = this.roadMask && this.roadMask[n] ? cost * ROAD_STEP_MULT : cost;
        const tentative = this.gScore[cur] + stepCost;
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
// Registry + backward-compatible top-level API.
// ---------------------------------------------------------------------------

const homeGrid = new NavGrid({ region: null, originX: 0, originZ: 0, halfExtent: HOME_HALF, cellSize: CELL });

// Phase 2, iteration 2.4 — destination window grids, lazily created and
// cached per region so revisiting a template reuses its previous grid
// (and whatever position it last recentred to) rather than starting fresh.
// Keyed by region id, matching WORLD_DESTINATIONS' own `id` field.
const destinationGrids = new Map<string, NavGrid>();

// Phase 2, iteration 2.6 — the Sealed Crypt's own grid, cached separately
// from destinationGrids since it is fixed-mode (never recentres) and, per
// its own blurb ("no two descents are the same"), a FRESH layout with a
// different branching shape (5-8 total rooms, see dungeon.ts) generates on
// every entry. The cache below is keyed by `layout.seed`, not just "has a
// grid been built once" — a stale grid from a previous descent must not
// survive into a new one with a different shape.
let dungeonGrid: NavGrid | null = null;
let dungeonGridSeed: number | null = null;
// kept across rebuild() calls with the SAME layout so rebuild()'s own
// `builtFrom === buildings` reference check actually no-ops on repeat calls
// instead of recomputing every time — see rebuild()'s own comment.
let dungeonWallBuildings: PlacedBuilding[] = [];

/** AABB over every room and corridor footprint in a generated layout, with a
 *  margin so a wall right at the edge is not clipped. The layout (redesigned
 *  2026-07-27, see dungeon.ts's own module doc) is a branching tree of
 *  variously-sized rooms, not a straight corridor, so a square grid centred
 *  on this AABB can waste real cells when the tree happens to grow lopsided
 *  — accepted rather than giving NavGrid rectangular bounds, which no other
 *  caller needs and which would touch toCellX/toCellZ/inBounds/
 *  clampToBounds/idx together. A few hundred KB of scratch arrays for one
 *  Crypt grid, rebuilt only on descent, is not a real cost. Rooms and
 *  corridors alone fully bound every wall too — a wall is always placed on
 *  its owning room's own face, never past it. */
function dungeonLayoutBounds(layout: DungeonLayout): { originX: number; originZ: number; halfExtent: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const r of layout.rooms) {
    minX = Math.min(minX, r.cx - r.halfX);
    maxX = Math.max(maxX, r.cx + r.halfX);
    minZ = Math.min(minZ, r.cz - r.halfZ);
    maxZ = Math.max(maxZ, r.cz + r.halfZ);
  }
  for (const c of layout.corridors) {
    minX = Math.min(minX, c.x0);
    maxX = Math.max(maxX, c.x1);
    minZ = Math.min(minZ, c.z0);
    maxZ = Math.max(maxZ, c.z1);
  }
  const margin = 4;
  return {
    originX: (minX + maxX) / 2,
    originZ: (minZ + maxZ) / 2,
    halfExtent: Math.max(maxX - minX, maxZ - minZ) / 2 + margin,
  };
}

/** Build (or reuse) the Crypt's NavGrid for the CURRENTLY generated layout.
 *  Returns null if no layout has been generated yet (dungeonState.layout is
 *  null — the player has not entered, or the last descent's layout was
 *  cleared by resetDungeon() and a new one has not generated yet). */
function ensureDungeonGrid(): NavGrid | null {
  const layout = dungeonState.layout;
  if (!layout) { dungeonGrid = null; dungeonGridSeed = null; return null; }
  if (dungeonGrid && dungeonGridSeed === layout.seed) return dungeonGrid;

  const bounds = dungeonLayoutBounds(layout);
  dungeonGrid = new NavGrid({
    region: 'dungeon',
    originX: bounds.originX,
    originZ: bounds.originZ,
    halfExtent: bounds.halfExtent,
    cellSize: navgridConfig.crypt.cellSize,
    mode: 'fixed',
  });
  dungeonGridSeed = layout.seed;

  // The Crypt's walls are real `stonewall` pieces (DungeonScene.tsx renders
  // them with the same model the build menu uses) placed directly by
  // generation rather than through the player's build economy, so there is
  // no PlacedBuilding for rebuild() to read. Synthesize minimal ones —
  // collisionBoxesFor('stonewall', rot) and DungeonWall.rot use the exact
  // same quarter-turn convention (DungeonScene.tsx's own `w.rot === 1 ?
  // Math.PI / 2 : 0` yaw confirms it), so rebuild()'s existing per-piece
  // collision logic needs no changes at all to consume them correctly.
  dungeonWallBuildings = layout.walls.map((w, i) => ({
    id: `crypt-wall-${i}`, type: 'stonewall', x: w.x, z: w.z, rot: w.rot, world: 'dungeon',
  }));
  dungeonGrid.rebuild(dungeonWallBuildings);
  return dungeonGrid;
}

export function getNavGrid(region: string | null): NavGrid {
  if (region === null) return homeGrid;

  if (region === 'dungeon') {
    const grid = ensureDungeonGrid();
    if (!grid) {
      throw new Error('getNavGrid: no Crypt layout generated yet (dungeonState.layout is null) — enter the Sealed Crypt first.');
    }
    return grid;
  }

  const cached = destinationGrids.get(region);
  if (cached) return cached;

  const dest = WORLD_DESTINATION_BY_ID[region];
  if (!dest) {
    throw new Error(`getNavGrid: "${region}" is not a known destination (checked WORLD_DESTINATION_BY_ID).`);
  }

  // Start centred on the destination's own declared teleport origin — a
  // reasonable first approximation of "where the player is," corrected to
  // their exact position by the first recentre() call after they actually
  // arrive (see recentre()'s own comment).
  const cfg = navgridConfig.destination;
  const grid = new NavGrid({
    region,
    originX: dest.origin.x,
    originZ: dest.origin.z,
    halfExtent: cfg.halfExtent,
    cellSize: cfg.cellSize,
    mode: 'window',
    recentreAt: cfg.recentreAt,
    maxStep: cfg.maxStep,
  });
  destinationGrids.set(region, grid);
  return grid;
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
  (window as unknown as Record<string, unknown>).__kknav = {
    findPath, navBlocked, rebuildNav, getNavGrid, navSteer,
    heightAt: (region: string | null, x: number, z: number) => getNavGrid(region).heightAt(x, z),
  };
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
