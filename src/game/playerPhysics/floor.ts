// CLN-26 · what the player stands on: the highest thing at (x, z) a person can stand on given where their feet are
// (floorHeightAt — terrain, placed pieces, the keep's wall walk), and the frame's floor under the player wherever they
// are (floorUnder: at a destination its bake's ground, mounted the home ground, on foot floorHeightAt). Moved from
// PlayerController.tsx as it was.
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { heightOf, labAssetId, sizeFor } from '@/game/data/buildables';
import {
  PLAYER_RADIUS,
} from '@/game/data/world';
import { isBuilt } from '@/game/types';
import { destinationGroundY, homeGroundY, getMountedRegion } from '@/components/world/TemplateWorld';
import { labCanStandOn } from '@/game/data/labCapabilities';
import { keepWalkwayAt } from '@/game/data/keep';

export const STEP_UP = 0.55; // max ledge height climbed without jumping

/** Wave 8 · a wall walk's own step allowance, deliberately larger than
 *  STEP_UP. The keep's ring is not one level: a Corner Turret's walk sits at
 *  4.2 and the Crenellated Wall it meets at 3.6 (data/keep.ts), a 0.6m lip
 *  that the ordinary 0.55 ledge rule would refuse — leaving a player who
 *  climbed onto the wall unable to walk round their own castle, which is the
 *  entire point of being up there. */
export const WALKWAY_STEP = 0.8;

/** Wave 12 · floorHeightAt's terrain out-param (see its signature). Same
 *  never-stored-past-the-statement-that-reads-it contract as PlayerController.tsx's
 *  scratch vectors, and safe for the same reason: PlayerController is a singleton.
 *  Exported: the frame reads it again after floorUnder (is the floor open ground?). */
export const _terrainOut = { y: 0 };

/** highest structure top at (x, z) that the player can stand on given their feet height */
export function floorHeightAt(
  st: ReturnType<typeof useGameStore.getState>,
  x: number,
  z: number,
  feetY: number,
  // Wave 12 · optional out-param for the bare-ground height this resolved
  // against, so the caller can tell "standing on the earth" from "standing on
  // something someone built" without paying for a second terrain probe. Same
  // shape as climbTargetFor's own `info` out-param, and for the same reason:
  // one extra fact for one caller, without changing the return type every
  // other call site would then have to unpack.
  terrain?: { y: number },
): number {
  // Wave 12 · the ground itself, at last. This used to be a literal `let
  // floor = 0` — the single line that made the homestead flat by construction
  // rather than by convention, since nothing below it ever looked at terrain.
  // `homeGroundY` is 0 everywhere except inside a TERRAIN_REGIONS entry
  // (game/data/terrainRegions.ts — Wave 31: the North Downs plus West Fell),
  // so this is exactly the old behaviour with those boxes carved out of it.
  //
  // Terrain is the BASELINE, not a candidate: a building top has to be within
  // STEP_UP to be climbed onto, but you cannot fail to step onto the earth.
  // Everything below still compares against `floor`, so a crate standing on
  // the hillside is measured from the hillside, and a crate at the bottom of
  // it is correctly ignored while you are on top.
  let floor = homeGroundY(x, z);
  if (terrain) terrain.y = floor;
  for (const b of st.buildings) {
    if (!isBuilt(b)) continue; // a construction-site ghost holds no one's weight
    // the rig lab checked, per asset, whether a minifig can actually stand on
    // a piece — a catapult's arm or a powder barrel is not a floor. Anything
    // the lab didn't chart keeps the old "everything is standable" default.
    if (!labCanStandOn(labAssetId(b.type), true)) continue;
    const [sx, sz] = sizeFor(b.type, b.rot);
    if (Math.abs(b.x - x) > sx / 2 + PLAYER_RADIUS * 0.6) continue;
    if (Math.abs(b.z - z) > sz / 2 + PLAYER_RADIUS * 0.6) continue;
    const top = (b.y ?? 0) + heightOf(b.type);
    if (top <= feetY + STEP_UP && top > floor) floor = top;
  }
  // Wave 8 · the keep's wall walk. Defenders have stood at `KeepPart.walkway`
  // for waves (Defenders.tsx posts them there), but the raised pieces are not
  // PlacedBuildings — they live only in `st.keep` — so the loop above cannot
  // see them and the player fell straight through to the courtyard. This is
  // the only reason the battlement was unreachable; with a floor up there,
  // gravity, walking off the edge and combat.ts's own onBattlement() bonus all
  // work with no further special-casing anywhere.
  const walk = keepWalkwayAt(st.keep, x, z);
  if (walk > floor && walk <= feetY + WALKWAY_STEP) floor = walk;
  return floor;
}

/** The floor under the player this frame — the frame's floor block, as it was: the eye height `eyeOff` above it is
 *  where the frame then stands or lands them. */
export function floorUnder(st: ReturnType<typeof useGameStore.getState>, p: THREE.Vector3, riding: boolean, eyeOff: number): number {
  let floorY: number;
  if (st.destination) {
    // SAME stale-mount race as the horizontal walkable-rect clamp (collide.ts)
    // (see its own comment for the full mechanism) — but live-caught as
    // its OWN, worse bug (2026-08-21): destinationGroundY ultimately
    // raycasts whatever `mountedRoot` currently holds with NO check that
    // it belongs to `st.destination`, unlike the horizontal clamp which
    // already gates on `getMountedRegion() === st.destination`. During
    // the handful of frames after travelTo() flips st.destination but
    // before the new bake's async GLB has actually mounted, this was
    // sampling the OLD, still-mounted destination's geometry at the NEW
    // destination's raw world coordinates — landing on top of whatever
    // happened to be there on the old bake (live-traced: up to 234.7
    // units into the air, template-04 -> template-05), which the smooth
    // ground-lerp (vertical.ts's fall) would then glide the player up to. Once the real
    // bake mounted a frame or two later, the real (much lower) floorY
    // dropped grounded.current back to false and the player free-fell
    // several real seconds back down to actual ground — self-healing,
    // but a jarring, broken-looking launch right at arrival. Guarded the
    // same way: for these few frames, hold floorY at the player's OWN
    // current eye-relative height instead of sampling anything — that
    // makes the frame's groundEye equal p.y, a no-op for every branch of the
    // gravity resolve (vertical.ts) until the real bake confirms and destinationGroundY
    // is trustworthy again. Exactly as safe as the horizontal guard's own
    // reasoning: pendingTeleport already placed p.y at a deliberately
    // chosen eye height for the new destination, and no real fall can
    // have accumulated in the handful of frames a same-scene mount takes.
    floorY = getMountedRegion() === st.destination ? destinationGroundY(p.x, p.z) : p.y - eyeOff;
  } else if (riding) {
    floorY = _terrainOut.y = homeGroundY(p.x, p.z);
  } else {
    floorY = floorHeightAt(st, p.x, p.z, p.y - eyeOff, _terrainOut);
  }
  return floorY;
}
