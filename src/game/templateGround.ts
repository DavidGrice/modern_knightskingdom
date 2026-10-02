'use client';
// CLN-14 · the visited destination's ground probes, moved verbatim out of components/world/TemplateWorld.tsx into a
// leaf module — the same move Wave 31 made for the homestead half (game/homeGround.ts), and for the same reason:
// TemplateWorld.tsx is a React component whose imports reach DungeonScene -> Buildings -> siege -> combat, and
// game/navgrid.ts needs the mounted bake's root to rasterize heights. Importing the component from navgrid closed
// an import cycle (combat -> navgrid -> TemplateWorld -> ... -> combat). This file imports only three and a data
// table, so nothing that reads it can be pulled into that loop. TemplateWorld.tsx still owns WRITING the state
// (it sets mountedRoot/mountedRegion/bakeOffset as its scene mounts) and re-exports the readers.
import * as THREE from 'three';
import { BATTLE_DOME } from './data/world';

// The mounted template scene's root, for PlayerController to raycast against
// (terrain height varies a lot across these bakes — a hillside castle spans
// 12m+ of vertical relief — so a fixed eye height would bury the camera in
// a hillside; see sampleTemplateGroundY, used in place of floorHeightAt
// while st.destination is set).
export const mountedRoot: { current: THREE.Object3D | null } = { current: null };

// which destination id mountedRoot currently holds — set alongside it, so a
// caller (navgrid.ts's height rasterization, iteration 2.5) can tell a real
// mount apart from "something else is mounted right now" before trusting the
// geometry. mountedRoot is a single global ref; only one destination is ever
// mounted at a time.
export const mountedRegion: { current: string | null } = { current: null };

// Wave 12 · the homestead's own elevated ground height (Terrain.tsx's
// TerrainRegions) used to register and raycast HERE too, sharing this file's
// raycastGroundY. Wave 31 hotfix moved that half out to src/game/homeGround.ts
// (a genuine leaf module, so gameStore.ts can read it without closing a
// circular import back onto itself — see that file's header). This module keeps
// the destination-only half (mountedRoot/sampleTemplateGroundY below) and the
// raycast itself, which homeGround.ts now imports from here.
const raycaster = new THREE.Raycaster();

const rayOrigin = new THREE.Vector3();

const DOWN = new THREE.Vector3(0, -1, 0);

// last real hit height, per destination — these bakes vary 12m+ in relief, so
// a hardcoded 0 fallback is very wrong almost everywhere on an elevated
// hillside; a raycast miss (sprinting past the edge of the actual mesh, which
// the destination's circular wander-radius doesn't perfectly match) should
// hold the last known ground height instead of dropping the player toward
// world-origin sea level, which read as falling through the bottom of the map.
let lastGroundY: number | null = null;

/** Drop a ray from well above (x, z) onto a mounted piece of ground and report
 *  where it lands — the one height probe in the project, shared by the
 *  destination sampler below and the homestead's own (Wave 12). Returns null on
 *  a miss rather than choosing a fallback, because the two callers want
 *  genuinely different answers to "nothing there": a destination holds the last
 *  height it knew (a hillside bake's own edge is not sea level), the homestead
 *  falls back to the flat meadow it actually has. */
export function raycastGroundY(root: THREE.Object3D, x: number, z: number): number | null {
  rayOrigin.set(x, 400, z);
  raycaster.set(rayOrigin, DOWN);
  raycaster.far = 500;
  const hits = raycaster.intersectObject(root, true);
  return hits.length ? hits[0].point.y : null;
}

export function sampleTemplateGroundY(x: number, z: number, fallback = lastGroundY ?? 0): number {
  const root = mountedRoot.current;
  if (!root) return fallback;
  const y = raycastGroundY(root, x, z);
  if (y === null) return fallback;
  lastGroundY = y;
  return y;
}

/** reset the held-ground fallback whenever a fresh destination mounts, so a
 *  stale height from the previous template world never leaks into the next */
export function resetTemplateGroundFallback() {
  lastGroundY = null;
}

/** Phase 2, iteration 2.5 — the mounted template scene's root, exported so
 *  navgrid.ts can rasterize its real geometry into a destination grid's
 *  height field (§2.3: runtime rasterization, not an offline bake or a
 *  per-cell raycast). Previously private; `sampleTemplateGroundY` was the
 *  only reader. */
export function getMountedRoot(): THREE.Object3D | null {
  return mountedRoot.current;
}

/** Which destination id `getMountedRoot()` currently belongs to, or null if
 *  nothing is mounted. See `mountedRegion`'s own comment above for why this
 *  check exists. */
export function getMountedRegion(): string | null {
  return mountedRegion.current;
}

/** ground height for actors at a destination, treating the Battle Dome's
 *  flat arena floor as local ground truth: the dome renders one level plane
 *  at its center's sampled height, so anyone standing inside the ring on a
 *  sloped bake would otherwise sink beneath it (Storm was buried to the
 *  neck). Applies to the player, NPCs and duel enemies alike. */
export function destinationGroundY(x: number, z: number): number {
  const raw = sampleTemplateGroundY(x, z);
  const dx = x - BATTLE_DOME.x;
  const dz = z - BATTLE_DOME.z;
  if (dx * dx + dz * dz <= (BATTLE_DOME.radius + 1) ** 2) {
    return Math.max(raw, sampleTemplateGroundY(BATTLE_DOME.x, BATTLE_DOME.z) + 0.03);
  }
  return raw;
}

/** the currently-mounted bake's own recentring offset (see normalizeTemplateBake's
 *  doc comment) — same one-at-a-time module-ref convention as mountedRoot/
 *  mountedRegion above, since only one destination bake is ever mounted. */
export const bakeOffset = new THREE.Vector3();

export function getBakeOffset(): THREE.Vector3 {
  return bakeOffset;
}
