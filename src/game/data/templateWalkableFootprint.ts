// Real terrain-derived walkable footprints for template destinations
// (2026-08-21) — replaces the artificial circular wander clamp
// PlayerController.tsx used to enforce (dest.radius) with the actual
// walkable ground a dedicated classification pass found in each bake's own
// terrain geometry. See scripts/generate-walkable-footprint.mjs (gitignored
// — see that script's own header) for the generation pipeline; this module
// only reads its committed output, templateWalkableFootprint.generated.json.
//
// A LEAF MODULE, deliberately: imports only the generated JSON and
// WorldDestination's type from worlds.ts — never anything under
// components/world/*. TemplateWorld.tsx needs to consume this (the ground
// filler disc) while PlayerController.tsx/Minimap.tsx also need it directly,
// so importing back from TemplateWorld.tsx here would create a cycle for the
// exact reason DestinationScope.tsx's own header comment already flags for
// the same shape of problem.
//
// Coordinate convention — matches mapPopulation.generated.json's own
// "bake-local, un-recentred" space exactly (prepare-assets.mjs's header
// comment has the transform derivation): worldX = lab_x * 320,
// worldZ = lab_y * 320 (LAB_METERS_TO_WORLD; the lab's own up axis plays no
// part in a 2D footprint and isn't stored here). A rect still needs THREE
// things applied at READ time before it means anything in live world space
// — dest.origin, a destination's own scaleCompensation
// (TemplatePopulation.tsx computes this exactly the same way), and the
// live, async getBakeOffset() (TemplateWorld.tsx) — see
// resolveWorldWalkableRects below. Never baked in ahead of time, for the
// same reason TemplatePopulation.tsx's own PopulationInstance re-derives
// world position every render rather than trusting a one-shot value: a
// destination can override worldScale, and the bake's real recentring
// offset isn't final until the GLB has actually loaded.
import type { WorldDestination } from './worlds';
import footprintData from './templateWalkableFootprint.generated.json';

export interface WalkableRect {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

const FOOTPRINTS = footprintData as Record<string, WalkableRect[]>;

/** raw, un-transformed rects for a destination — bake-local space, exactly
 *  as the generation script wrote them. Returns null (never an empty array)
 *  when this destination has no classified data — every real consumer
 *  treats null as "fall back to the old radius-circle behavior", so a
 *  genuinely-empty classification and "not classified at all" must stay
 *  distinguishable; the generation script itself never writes an empty
 *  array for the same reason (it omits the key instead). */
export function getLocalWalkableRects(destId: string): WalkableRect[] | null {
  return FOOTPRINTS[destId] ?? null;
}

/** the same rects, resolved into live world space for one destination's
 *  CURRENTLY MOUNTED bake — see this file's own header for why the extra
 *  parameters can't be folded into the generated data itself. `bakeOffset`
 *  takes a plain `{x, z}` rather than THREE.Vector3 so this module never
 *  needs to import 'three' — every real call site already holds a
 *  THREE.Vector3 (getBakeOffset()'s return type), which satisfies this
 *  structurally with no cast needed. */
export function resolveWorldWalkableRects(
  dest: WorldDestination,
  bakeOffset: { x: number; z: number },
  scaleCompensation: number,
): WalkableRect[] | null {
  const local = getLocalWalkableRects(dest.id);
  if (!local) return null;
  return local.map((r) => ({
    minX: dest.origin.x + r.minX * scaleCompensation + bakeOffset.x,
    maxX: dest.origin.x + r.maxX * scaleCompensation + bakeOffset.x,
    minZ: dest.origin.z + r.minZ * scaleCompensation + bakeOffset.z,
    maxZ: dest.origin.z + r.maxZ * scaleCompensation + bakeOffset.z,
  }));
}
