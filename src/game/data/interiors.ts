// Generalised interiors (2026-07-30): KeepInteriorRoom.tsx was a one-off,
// hand-placed room built specifically for the Grand Keep's great hall. This
// is the reusable version of that same pattern — sealed room, teleport in
// and out (no walk-through door, so it can never be stumbled into from
// outside), one door prompt — so any buildable type can offer an enterable
// interior by adding one entry here instead of a bespoke component.
import { KEEP_INTERIOR, KEEP_ENTER_RANGE } from './world';

export interface InteriorDef {
  /** matches PlacedBuilding.type */
  buildingType: string;
  /** the long form: "You step into {name}." */
  name: string;
  /** the short form: "Enter {doorLabel}" / "Leave {doorLabel}" */
  doorLabel: string;
  halfX: number;
  halfZ: number;
  height: number;
  /** how close to the building's own world position the door prompt reaches —
   *  the Keep's own footprint is large, so its existing KEEP_ENTER_RANGE stays
   *  generous; smaller buildings use the ordinary interact range instead */
  enterRange: number;
}

export const INTERIORS: Record<string, InteriorDef> = {
  keep: {
    buildingType: 'keep', name: 'the great hall of your keep', doorLabel: 'the Keep',
    halfX: KEEP_INTERIOR.halfX, halfZ: KEEP_INTERIOR.halfZ, height: 5,
    enterRange: KEEP_ENTER_RANGE,
  },
  stable: {
    buildingType: 'stable', name: 'the stable', doorLabel: 'the Stable',
    halfX: 3, halfZ: 3.6, height: 3,
    enterRange: 3,
  },
};

// a tiny deterministic hash — same spirit as Villagers.tsx's own hashId(),
// kept local rather than importing a component into game data
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const POCKET_BASE_X = 85;
const POCKET_BASE_Z = 140;
const POCKET_SPACING = 20;
const POCKET_SLOTS = 20;

/** Where this interior's own sealed room actually lives in world space. The
 *  Keep keeps its long-established fixed spot (KEEP_INTERIOR, world.ts) —
 *  there is only ever one. Every other building gets a deterministic slot
 *  along the same "empty corner of the map" strip instead: harmless even if
 *  two different buildings hash to the same slot, since only the ONE
 *  currently-entered interior ever renders its room — an idle pocket is
 *  just more empty field, indistinguishable from any other. */
export function pocketFor(buildingType: string, buildingId: string): { x: number; z: number } {
  if (buildingType === 'keep') return { x: KEEP_INTERIOR.x, z: KEEP_INTERIOR.z };
  const slot = hashId(buildingId) % POCKET_SLOTS;
  return { x: POCKET_BASE_X + (slot + 1) * POCKET_SPACING, z: POCKET_BASE_Z };
}

/** just inside the door, facing further into the room — the same shape as
 *  the Keep's own KEEP_ENTER_SPAWN (world.ts) */
export function enterSpawnFor(def: InteriorDef, pocket: { x: number; z: number }) {
  return { x: pocket.x, z: pocket.z - (def.halfZ - 2), yaw: Math.PI };
}
