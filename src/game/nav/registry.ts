'use client';
// CLN-14 · which NavGrid serves which region (home, each destination's window grid, the Crypt), moved verbatim out
// of game/navgrid.ts.
import type { PlacedBuilding } from '../types';
import { WORLD_DESTINATION_BY_ID } from '../data/worlds';
import { dungeonState, type DungeonLayout } from '../dungeon';
import navgridConfig from '../../ai/config/navgrid.json';
import { CELL, HOME_HALF, NavGrid } from './grid';

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
export let dungeonWallBuildings: PlacedBuilding[] = [];

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
export function ensureDungeonGrid(): NavGrid | null {
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

  // The Crypt's walls are real wall pieces (DungeonScene.tsx renders them
  // with the same models the build menu uses) placed directly by generation
  // rather than through the player's build economy, so there is no
  // PlacedBuilding for rebuild() to read. Synthesize minimal ones —
  // collisionBoxesFor(layout.wallStyle, rot) and DungeonWall.rot use the
  // exact same quarter-turn convention (DungeonScene.tsx's own `w.rot === 1
  // ? Math.PI / 2 : 0` yaw confirms it), so rebuild()'s existing per-piece
  // collision logic needs no changes at all to consume them correctly.
  // Wave 13 · `type` now follows the layout's own rolled wallStyle instead
  // of a hardcoded 'stonewall' — both WALL_STYLES entries (dungeon.ts) share
  // an identical WALL_CORE collision entry (data/buildables.ts), so this is
  // a correctness fix (the synthesized box now matches whichever mesh
  // actually rendered), not a behavior change for the pre-existing style.
  dungeonWallBuildings = layout.walls.map((w, i) => ({
    id: `crypt-wall-${i}`, type: layout.wallStyle, x: w.x, z: w.z, rot: w.rot, world: 'dungeon',
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

/** `getNavGrid`, failing OPEN: null instead of a throw for an unknown region, or for the Crypt before a layout has
 *  generated. Every AI caller wants exactly this — a throw inside a think tick or a render frame takes down the
 *  scheduler for every agent, not just the one asking — and "no grid" has a sensible meaning at each call site (no
 *  walkability opinion, nothing known to block sight, no anchor). CLN-14 · replaces six hand-copied try/catch
 *  wrappers (AnchorResolution, Locomotion, VisionSensor, takeCover, wander, roam). */
export function getNavGridOrNull(region: string | null): NavGrid | null {
  try {
    return getNavGrid(region);
  } catch {
    return null;
  }
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
