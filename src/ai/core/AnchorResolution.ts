// NPC_AI_SPEC §3.2 / PHASE_2_NAVIGATION_AND_GATHERING.md §3.2 — turn a
// Target's AnchorRule into a real point an agent can stand at. Blender-baked
// ANCHOR_ empties don't fit runtime-placed content (a player can put a
// workbench anywhere, at any rotation) — resolved at query time instead of
// authoring time.
//
// Phase-2 deliverable, not yet wired into anything real: phase 5's gather/
// haul actions are the first real caller.

import { getNavGrid } from '@/game/navgrid';
import type { Target } from './TargetRegistry';

export interface ResolvedAnchor {
  x: number;
  z: number;
  /** world convention, §3.2: Math.atan2(-(tx-x), -(tz-z)), facing the
   *  target's own centre for radial mode; a quantised direction for fixed
   *  mode (target.rot + the rule's own `facing`, both in quarter-turns).
   *  Rig offsets stay in the renderers (Villagers.tsx's own +Math.PI,
   *  Npc.tsx's none) — do not push them in here, this is per-renderer, not
   *  universal. */
  yaw: number;
}

const RADIAL_SAMPLES = 8;

function faceToward(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ));
}

/** Same quarter-turn rotation collisionBoxesFor already uses for building
 *  geometry (game/data/buildables.ts, the collisionBoxesFor shape-rotation
 *  loop) — a +90° three.js Y-rotation sends local (x, z) to world (z, -x).
 *  Reusing that exact formula here rather than re-deriving it is
 *  deliberate: that code's own comment documents a real bug this codebase
 *  already shipped once from getting the rotation direction backwards (a
 *  wall's solid stone ended up on the far side from where it was drawn). */
function rotateQuarter(x: number, z: number, quarter: number): [number, number] {
  let ox = x, oz = z;
  const q = ((quarter % 4) + 4) % 4;
  for (let i = 0; i < q; i++) {
    const nx = oz, nz = -ox;
    ox = nx; oz = nz;
  }
  return [ox, oz];
}

/**
 * Resolve `target`'s anchor rule into a real point, from the perspective of
 * an agent currently at (fromX, fromZ) — radial mode picks the walkable
 * sample nearest the AGENT, not the target, so two agents approaching a
 * stockpile from different sides don't both aim for the same slot.
 *
 * Returns null if the target's region has no nav grid yet (an unknown
 * region, or 'dungeon' before a layout has generated — getNavGrid throws
 * for both, caught here rather than left for the caller to guard every
 * time) or, for radial mode, if none of the sampled points nor the
 * nearestWalkable fallback found anything open.
 */
export function resolveAnchor(target: Target, fromX: number, fromZ: number): ResolvedAnchor | null {
  let grid;
  try {
    grid = getNavGrid(target.region);
  } catch {
    return null;
  }

  const rule = target.anchorRule;
  if (rule.mode === 'fixed') {
    const [ox, oz] = rotateQuarter(rule.offset[0], rule.offset[1], target.rot ?? 0);
    const yaw = (((target.rot ?? 0) + rule.facing) % 4) * (Math.PI / 2);
    return { x: target.x + ox, z: target.z + oz, yaw };
  }

  // radial: sample RADIAL_SAMPLES points on a circle of rule.radius,
  // discard non-walkable, pick the one nearest the agent
  let best: { x: number; z: number; d2: number } | null = null;
  for (let i = 0; i < RADIAL_SAMPLES; i++) {
    const angle = (i / RADIAL_SAMPLES) * Math.PI * 2;
    const px = target.x + Math.cos(angle) * rule.radius;
    const pz = target.z + Math.sin(angle) * rule.radius;
    if (!grid.isWalkable(px, pz)) continue;
    const dx = px - fromX, dz = pz - fromZ;
    const d2 = dx * dx + dz * dz;
    if (!best || d2 < best.d2) best = { x: px, z: pz, d2 };
  }
  if (best) return { x: best.x, z: best.z, yaw: faceToward(best.x, best.z, target.x, target.z) };

  // none of the samples were walkable — fall back to the nearest open cell
  // to the target itself. fallbackRadius is in world units; NavGrid's
  // nearestWalkable takes a cell count, so convert by the grid's own
  // cellSize rather than assuming they're numerically the same.
  const fallbackRadius = rule.fallbackRadius ?? rule.radius;
  const maxCells = Math.max(1, Math.ceil(fallbackRadius / grid.cellSize));
  const fb = grid.nearestWalkable(target.x, target.z, maxCells);
  if (!fb) return null;
  return { x: fb.x, z: fb.z, yaw: faceToward(fb.x, fb.z, target.x, target.z) };
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkanchor = { resolveAnchor };
}
