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
  // Wave 24 · the first four generalised interiors that AREN'T the two the
  // system launched with. `forge` and `market_stall` were the plan's own
  // first picks and both turned out unsafe on inspection: the forge's
  // station consider() sits right after this same block in
  // PlayerController's if/continue chain, so an interior entry would
  // permanently shadow "Use the Forge" (dead code, not a tie); the market
  // stall's own trade prompt is a separate consider() call that would lose
  // the tie against this block's earlier registration every frame. Picked
  // these four instead because each is verified to have ZERO existing
  // interact of any kind (grepped PlayerController.tsx/gameStore.ts/
  // Enemies.tsx/Defenders.tsx/Emplacements.tsx) — nothing here contests a
  // slot with anything else.
  //
  // enterRange bug (post-ship verify pass) · the first cut of these four sat
  // near each building's declared `size` half-extent, but PlayerController's
  // consider() compares straight-line distance to the building's own centre
  // against enterRange, and the player is stopped well short of that centre
  // by REAL collision — `collisionBoxesFor` (buildables.ts), not the
  // declared size. Two of these four (`oc6094-2`, `oc6098b3`) have no entry
  // in the generated public/assets/collision.json at all, so they fall back
  // to the FULL declared bounding box (half sx/2, half sz/2), and `tower`'s
  // real voxelised shape is a hollow ring whose ground-level walls are
  // flush with that same bounding box — in every case bigger than the old
  // enterRange once the player's own PLAYER_RADIUS (0.45, PlayerController)
  // is added on top, so the door prompt could never appear from a real
  // walk-up. Each value below is now `max(halfX, halfZ) + PLAYER_RADIUS`
  // over the ACTUAL collision footprint (not the interior room's halfX/
  // halfZ above, which only size the room you teleport into), plus a
  // ~0.35m margin so all 4 cardinal approaches — and both rotations, since
  // storehouse/oc6098b3 aren't square — clear it with room to spare. Live-
  // verified from all 4 cardinal directions after the change (see Wave 24
  // verify-fix notes).
  storehouse: {
    buildingType: 'storehouse', name: 'the storehouse', doorLabel: 'the Storehouse',
    halfX: 2.2, halfZ: 2.8, height: 2.6,
    // real footprint (no collision.json entry, falls back to declared size
    // [3, 2.4, 4]): half-extents 1.5/2.0 + 0.45 radius = 1.95/2.45 max
    enterRange: 2.8,
  },
  'oc6094-2': {
    buildingType: 'oc6094-2', name: 'a cramped cell', doorLabel: 'the Jail Cell',
    halfX: 1.6, halfZ: 1.8, height: 2.4,
    // real footprint (no collision.json entry, falls back to declared size
    // [3.2, 6.4, 3.6]): half-extents 1.6/1.8 + 0.45 radius = 2.05/2.25 max
    enterRange: 2.6,
  },
  tower: {
    buildingType: 'tower', name: "the watch tower's guard room", doorLabel: 'the Watch Tower',
    halfX: 1.6, halfZ: 1.6, height: 3,
    // real footprint: collision.json's voxelised ring is flush with the
    // declared [4, 8.16, 4] footprint at ground level (no doorway gap) —
    // outer wall face ~1.78 + 0.45 radius = ~2.23
    enterRange: 2.6,
  },
  oc6098b3: {
    buildingType: 'oc6098b3', name: 'the small treasure vault', doorLabel: 'the Jewel Tower',
    halfX: 1.6, halfZ: 1.6, height: 3,
    // real footprint (no collision.json entry, falls back to declared size
    // [2.42, 12, 3.03]): half-extents 1.21/1.515 + 0.45 radius = 1.66/1.97 max
    enterRange: 2.3,
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
