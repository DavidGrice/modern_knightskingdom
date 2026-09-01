'use client';
// Wave 31 hotfix · home-elevation ground height, pulled out of
// TemplateWorld.tsx into its own genuine leaf module.
//
// Why this file exists at all: gameStore.ts's evalPlacement needs a real
// home ground height (`homeGroundY`) instead of the flat 0 it used to assume,
// and the only existing implementation lived in TemplateWorld.tsx. But
// TemplateWorld.tsx transitively imports DungeonScene -> Buildings -> siege
// -> combat -> difficulty, and difficulty.ts calls
// `useGameStore.subscribe(refresh)` at ITS OWN module scope (not deferred).
// gameStore.ts importing TemplateWorld.tsx therefore closes a real cycle
// back onto itself — confirmed live as
// "ReferenceError: Cannot access 'useGameStore' before initialization" on
// the very first page load, in both `next dev` and a real production build.
// This is the exact class of bug src/ai/core/AgentManager.ts's own header
// documents hitting before (a different edge into the same
// DungeonScene->Buildings->siege->combat->difficulty chain) — fixed there,
// as here, by inverting the dependency rather than reasoning a new edge is
// safe. `regionAt` (terrainRegions.ts) and `three` are both genuine leaves
// (no path back to gameStore.ts), so this module cannot re-create the cycle
// no matter who imports it.
//
// TemplateWorld.tsx re-exports `homeGroundY` / `registerHomeGroundRoot` from
// here so every existing `from './TemplateWorld'` call site (Defenders.tsx,
// Villagers.tsx, Weather.tsx, etc.) keeps working unchanged — only
// gameStore.ts's own import needed to move.
import * as THREE from 'three';
import { regionAt } from './data/terrainRegions';

// Terrain.tsx hands its raised-terrain surface group over here on mount, and
// takes it back on unmount — same "register the geometry, then everyone
// raycasts it" contract TemplateWorld.tsx's own mountedRoot has always had.
const homeGroundRoot: { current: THREE.Object3D | null } = { current: null };
const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

/** Drop a ray from well above (x, z) onto the registered home-ground root.
 *  Deliberately a small duplicate of TemplateWorld.tsx's own
 *  raycastGroundY rather than an import of it — importing anything from
 *  TemplateWorld.tsx here would drag its whole DungeonScene chain back in
 *  and re-create the exact cycle this file exists to avoid. */
function raycastGroundY(root: THREE.Object3D, x: number, z: number): number | null {
  rayOrigin.set(x, 400, z);
  raycaster.set(rayOrigin, DOWN);
  raycaster.far = 500;
  const hits = raycaster.intersectObject(root, true);
  return hits.length ? hits[0].point.y : null;
}

export function registerHomeGroundRoot(root: THREE.Object3D | null): void {
  homeGroundRoot.current = root;
}

/**
 * Ground height on the HOMESTEAD, which is 0 everywhere except inside a
 * TERRAIN_REGIONS entry (game/data/terrainRegions.ts) — the patches of home
 * that are not flat. The bounds test comes FIRST and is the load-bearing
 * line: outside every region's box, home is flat, and this function says so
 * without consulting anything else.
 *
 * Sub-zero hits floor at 0 because every knoll mesh is deliberately sunk
 * into the meadow (DOWNS_SINK): below y=0 it is buried, and the bake above
 * it is the ground you would actually be standing on.
 */
export function homeGroundY(x: number, z: number): number {
  if (!regionAt(x, z, 1)) return 0;
  const root = homeGroundRoot.current;
  if (!root) return 0; // no knoll has mounted yet — flat meadow, correctly
  const y = raycastGroundY(root, x, z);
  return y === null || y < 0 ? 0 : y;
}
