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
import { exposeDebug } from '@/lib/debugHooks';
import { findPath, getNavGrid, navBlocked, rebuildNav } from './nav/registry';
import { hasLineOfSight } from './nav/lineOfSight';
import { applyLocalAvoidance, navSteer, setLiveAgents } from './nav/steering';

// CLN-14 · this file is now a barrel: the grid itself (obstacles, heights, A*) is nav/grid.ts, the per-region grid
// registry nav/registry.ts, the 3D line-of-sight check nav/lineOfSight.ts, and steering + local avoidance
// nav/steering.ts. Everything this module ever exported is re-exported below, so no importer changed.
export { NavGrid } from './nav/grid';
export { findPath, getNavGrid, getNavGridOrNull, navBlocked, rebuildNav } from './nav/registry';
export { GROUND_LOS_Y, hasLineOfSight } from './nav/lineOfSight';
export { navSteer, setLiveAgents } from './nav/steering';
export type { NavAgent } from './nav/steering';

exposeDebug('__kknav', {
  findPath, navBlocked, rebuildNav, getNavGrid, navSteer, hasLineOfSight,
  heightAt: (region: string | null, x: number, z: number) => getNavGrid(region).heightAt(x, z),
  // Wave 42 (A7) — exposed for the same reason every other debug handle in
  // this project is: a smoke test needs a way to drive avoidance without a
  // full running AgentManager to check the math in isolation.
  setLiveAgents, applyLocalAvoidance,
});
