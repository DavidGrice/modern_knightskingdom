'use client';
// CLN-14 · the shared 3D line-of-sight check for ranged combat and perception, moved verbatim out of game/navgrid.ts.
import type { PlacedBuilding } from '../types';
import { useGameStore } from '../store/gameStore';
import { forEachObstacleBox } from './grid';
import { dungeonWallBuildings, ensureDungeonGrid } from './registry';

/** Wave 20 · approximate shot-release height for a ground-standing defender
 *  or enemy — neither has a per-frame draw height of its own the way the
 *  player's muzzleHeight() (combat.ts) does, so hasLineOfSight callers that
 *  represent a ground combatant share this one fixed value rather than each
 *  inventing a slightly different height that could drift. Sits inside the
 *  walker band (WALK_LOW..WALK_HIGH, nav/grid.ts) since that is exactly the body
 *  height a ground-standing figure already occupies. */
export const GROUND_LOS_Y = 1.2;

// ---------------------------------------------------------------------------
// Wave 20 · line of sight for ranged combat.
//
// Deliberately NOT built on the flattened 2D `blocked` grid (nav/grid.ts): that grid
// throws away height (`isWalkable` has no y-parameter), which would falsely
// block a shot fired from atop a wall or tower — onBattlement()'s elevated-
// archery bonus (combat.ts) puts a standing player's muzzle right over their
// own wall's footprint. Instead this reuses the same SOURCE data the grid
// itself is built from (forEachObstacleBox → collisionBoxesFor) via a real
// segment-vs-AABB test against each box's actual yBase/yTop, which has no
// such blind spot and reads more literally as "raycast vs the obstacle
// boxes" besides.
// ---------------------------------------------------------------------------

interface LosBox { cx: number; cz: number; hx: number; hz: number; yBase: number; yTop: number; }

interface LosCache { builtFrom: PlacedBuilding[]; boxes: LosBox[]; }

// One cache per region, each memoized on its own source array's identity —
// exactly the way NavGrid.rebuild() memoizes on `builtFrom === buildings`.
// Keyed by String(region) (null -> "null"), which can never collide with a
// real region id (WORLD_DESTINATION_BY_ID/dungeon ids are code-defined,
// non-empty, and never the literal string "null").
const losCaches = new Map<string, LosCache>();

function losSource(region: string | null): PlacedBuilding[] {
  // Crypt walls are synthesized locally (see dungeonWallBuildings, nav/registry.ts) and
  // never enter the global buildings list, so the dungeon needs its own
  // source — and a fresh descent replaces `dungeonWallBuildings` with a new
  // array, so the identity check below picks up a re-descent for free, same
  // as ensureDungeonGrid()'s own rebuild() call already relies on.
  if (region === 'dungeon') {
    ensureDungeonGrid();
    return dungeonWallBuildings;
  }
  return useGameStore.getState().buildings;
}

function losBoxes(region: string | null): LosBox[] {
  const key = String(region);
  const source = losSource(region);
  const cached = losCaches.get(key);
  if (cached && cached.builtFrom === source) return cached.boxes;

  const boxes: LosBox[] = [];
  forEachObstacleBox(source, region, (b, box) => {
    boxes.push({
      cx: b.x + (box.ox ?? 0),
      cz: b.z + (box.oz ?? 0),
      hx: box.hx,
      hz: box.hz,
      yBase: (b.y ?? 0) + box.yBase,
      yTop: (b.y ?? 0) + box.yTop,
    });
  });
  losCaches.set(key, { builtFrom: source, boxes });
  return boxes;
}

/** Segment (ox,oy,oz) + t·(dx,dy,dz), t∈[0,1], vs an axis-aligned box — the
 *  standard slab method. No AGENT_RADIUS padding: that is walker fatness,
 *  wrong for a thin arrow/bolt/sightline. */
function segmentHitsBox(
  ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, box: LosBox,
): boolean {
  let tMin = 0, tMax = 1;
  const axes: [number, number, number, number][] = [
    [ox, dx, box.cx - box.hx, box.cx + box.hx],
    [oz, dz, box.cz - box.hz, box.cz + box.hz],
    [oy, dy, box.yBase, box.yTop],
  ];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let t0 = (lo - o) / d;
    let t1 = (hi - o) / d;
    if (t0 > t1) { const tmp = t0; t0 = t1; t1 = tmp; }
    tMin = Math.max(tMin, t0);
    tMax = Math.min(tMax, t1);
    if (tMin > tMax) return false;
  }
  return true;
}

/**
 * True if a straight segment from (fromX,fromY,fromZ) to (toX,toY,toZ) is
 * NOT interrupted by any built obstacle in `region` — a real 3D check
 * against the same collision volumes findPath routes around (see game/navgrid.ts's
 * header), not the flattened 2D nav grid, so an elevated shot over a
 * wall's own footprint reads correctly. `region` follows the same "null
 * means home" convention as everywhere else in the nav module (NavGridOptions.
 * region, Agent.region, PlacedBuilding.world) — Defenders.tsx and Enemies.
 * tsx's own home-only call sites can simply omit it.
 *
 * The one shared LOS check for ranged combat: Defenders.tsx, Enemies.tsx and
 * combat.ts's stepBolt() all call this rather than each rolling its own,
 * and any future ranged-combat caller should reach for it too rather than
 * inventing a fourth ad hoc version that could drift from the rest.
 */
export function hasLineOfSight(
  fromX: number, fromY: number, fromZ: number,
  toX: number, toY: number, toZ: number,
  region: string | null = null,
): boolean {
  const dx = toX - fromX, dy = toY - fromY, dz = toZ - fromZ;
  for (const box of losBoxes(region)) {
    if (segmentHitsBox(fromX, fromY, fromZ, dx, dy, dz, box)) return false;
  }
  return true;
}
