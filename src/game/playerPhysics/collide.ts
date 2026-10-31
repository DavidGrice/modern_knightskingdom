// CLN-26 · where the player's step may take them this frame: the frame's collision block, moved from
// PlayerController.tsx as it was — inside a building its own room's walls (and the keep's furniture); at a
// destination its walkable ground and placed pieces; at home placed pieces (stepped onto or walked under when they
// can be), trees and rocks, the pond and water, the world's edge. It takes the step (nx, nz) and hands it back.
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { CLAIM_RADIUS, sizeFor, collisionBoxesFor } from '@/game/data/buildables';
import {
  FISHING_DOCK, KEEP_CHEST_POS, KEEP_INTERIOR, PLAYER_RADIUS,
  POND, WORLD_HALF,
} from '@/game/data/world';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { INTERIORS, pocketFor } from '@/game/data/interiors';
import { dungeonState } from '@/game/dungeon';
import { isBuilt, isDoorLike } from '@/game/types';
import { pushOutOfWater } from '@/game/waterworks';
import { getBakeOffset, getMountedRegion, TEMPLATE_WORLD_SCALE } from '@/components/world/TemplateWorld';
import { resolveWorldWalkableRects } from '@/game/data/templateWalkableFootprint';
import { fixedSolids } from '@/game/fixedSolids';
import { STEP_UP } from './floor';

// collisions: buildings (AABB, unless we can step onto or walk under
// them), trees & rocks (circles), pond, world bounds — or, inside a
// generalised interior (data/interiors.ts), that room's own walls
// (and, specifically inside the Keep, its bespoke furniture) instead
export function collide(st: ReturnType<typeof useGameStore.getState>, riding: boolean, feetY: number, nx: number, nz: number): { nx: number; nz: number } {
  if (st.interior) {
    const insideBuilding = st.buildings.find((b) => b.id === st.interior);
    const def = insideBuilding ? INTERIORS[insideBuilding.type] : null;
    if (def && insideBuilding) {
      const pocket = pocketFor(insideBuilding.type, insideBuilding.id);
      const ix = def.halfX - 0.6;
      const iz = def.halfZ - 0.6;
      nx = THREE.MathUtils.clamp(nx, pocket.x - ix, pocket.x + ix);
      nz = THREE.MathUtils.clamp(nz, pocket.z - iz, pocket.z + iz);
      // the Keep's own bespoke obstacles: the throne (back wall) and the
      // treasure chest (corner) — both fixed at KEEP_INTERIOR's own
      // world position, since that pocket never moves
      if (insideBuilding.type === 'keep') {
        for (const [ox, oz, r] of [
          [KEEP_INTERIOR.x, KEEP_INTERIOR.z + KEEP_INTERIOR.halfZ - 1.2, 1.1],
          [KEEP_CHEST_POS.x, KEEP_CHEST_POS.z, 0.7],
        ] as const) {
          const dx = nx - ox;
          const dz = nz - oz;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            nx = ox + (dx / d) * r;
            nz = oz + (dz / d) * r;
          }
        }
      }
    }
  } else if (st.destination) {
    // template worlds: no fine per-object collision against the merged
    // bake, just a bound on where the player can wander to. Real
    // terrain boundaries (2026-08-21): clamps against the actual
    // classified walkable ground (templateWalkableFootprint.ts) when
    // this destination has any, nearest-point-in-the-rects'-union — see
    // that module's own header for the coordinate transform. A
    // destination with no classified rects yet (challenges, dungeon,
    // arena, any future template) falls all the way back to the
    // original circular bound around dest.origin, byte-for-byte
    // unchanged from before this pass.
    //
    // GATED ON A CONFIRMED MOUNT (getMountedRegion() === st.destination,
    // the same guard Minimap.tsx's own raster already uses): live-tested
    // and caught a real race otherwise — `st.destination` flips the
    // instant travelTo() calls set(), but TemplateWorldRoot's async GLB
    // (NormalizedTemplateScene's useGLTF, suspended) can take several
    // frames longer to resolve, and getBakeOffset() holds a STALE
    // previous-destination offset (or (0,0,0) pre-first-load) the whole
    // time. Clamping against rects built from that wrong offset landed
    // the player hundreds of units from the real intended spot on the
    // very first frame, then never self-corrected once the real offset
    // arrived — the wrongly-clamped point usually already sat inside
    // the NOW-correctly-offset rects too, so the per-frame "already
    // inside, no-op" fast path silently locked in the wrong answer
    // forever. Skipping the clamp entirely for those first few
    // pre-mount frames is safe: pendingTeleport (applied by relocate at the top of
    // PlayerController.tsx's frame, before walk reads `p = pos.current`) already placed the player at a deliberately-chosen valid
    // point, and no real player input can have accumulated in the
    // handful of frames a same-scene mount takes.
    const dest = WORLD_DESTINATION_BY_ID[st.destination];
    if (dest && getMountedRegion() === st.destination) {
      const scaleCompensation = (dest.worldScale ?? TEMPLATE_WORLD_SCALE) / TEMPLATE_WORLD_SCALE;
      const rects = resolveWorldWalkableRects(dest, getBakeOffset(), scaleCompensation);
      // a player's OWN claimed plot (claimWorld/foundSettlement) is
      // centered wherever they were STANDING at claim time — see
      // activeBuildRegion's own doc comment — which the classification
      // pass had no way to know about in advance, unlike the resident
      // NPCs' fixed hand-authored positions this same pass re-verified
      // directly. A claim landing in the same near-origin gap the
      // NPCs did (worlds.ts's TEMPLATE_ARRIVAL_SPAWN comment already
      // documents dest.origin sits far outside every classified union)
      // would otherwise get fenced away from the player's own building
      // on their very next visit — so the claim's own CLAIM_RADIUS
      // footprint (buildables.ts, the same square its build region
      // already uses) is always unioned in here too, not just the
      // classified rects. Cheap: at most one extra rect, one destination
      // can have at most one claim. Gated on `rects` already being
      // non-null (real classified data exists for this destination) —
      // a destination with NO classified rects at all (a challenge
      // ground; the generation script only ever covers template-01..09)
      // must keep falling all the way through to the untouched circular
      // fallback below, not collapse down to a bare 28-unit claim-only
      // box that would be a big step DOWN from the old full-radius
      // wander bound for anyone who claimed one of those.
      const claim = st.claimedWorlds[st.destination];
      const allRects = rects && claim
        ? [...rects, { minX: claim.x - CLAIM_RADIUS, maxX: claim.x + CLAIM_RADIUS, minZ: claim.z - CLAIM_RADIUS, maxZ: claim.z + CLAIM_RADIUS }]
        : rects;
      if (allRects && allRects.length) {
        // nearest point in the union: per-axis clamp to one rect's own
        // bounds IS that rect's nearest point (0 distance when (nx,nz)
        // already sits inside it) — so a position already on walkable
        // ground comes back completely unchanged (its containing rect
        // wins the reduction with d2=0), and the winner is always
        // inside SOME rect, so the player can never be pushed outside
        // the union. The generation script pads every rect by a small
        // epsilon so two meant-to-be-adjacent rects overlap rather than
        // leave a sub-precision gap — crossing that seam never clamps
        // at all, full walking speed straight through.
        let bestX = nx, bestZ = nz, bestD2 = Infinity;
        for (const r of allRects) {
          const cx = THREE.MathUtils.clamp(nx, r.minX, r.maxX);
          const cz = THREE.MathUtils.clamp(nz, r.minZ, r.maxZ);
          const ddx = nx - cx;
          const ddz = nz - cz;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < bestD2) { bestD2 = d2; bestX = cx; bestZ = cz; }
        }
        nx = bestX;
        nz = bestZ;
      } else {
        const dx = nx - dest.origin.x;
        const dz = nz - dest.origin.z;
        const d = Math.hypot(dx, dz);
        if (d > dest.radius) {
          nx = dest.origin.x + (dx / d) * dest.radius;
          nz = dest.origin.z + (dz / d) * dest.radius;
        }
      }
    }
    // the Sealed Crypt (Phase 17) is the one destination with real walls
    // to actually bump into — a generated maze should feel like one
    if (st.destination === 'dungeon' && dungeonState.layout) {
      const layout = dungeonState.layout;
      for (const w of layout.walls) {
        // Wave 13 · a layout can roll a second wall mesh (wallStyle) —
        // both real WALL_STYLES entries share the same 8m-wide/2.x-deep
        // footprint family, so this stays correct for either.
        const [sx, sz] = sizeFor(layout.wallStyle, w.rot);
        const hx = sx / 2 + PLAYER_RADIUS;
        const hz = sz / 2 + PLAYER_RADIUS;
        const dx2 = nx - w.x;
        const dz2 = nz - w.z;
        if (Math.abs(dx2) < hx && Math.abs(dz2) < hz) {
          const px = hx - Math.abs(dx2);
          const pz = hz - Math.abs(dz2);
          if (px < pz) nx = w.x + Math.sign(dx2 || 1) * hx;
          else nz = w.z + Math.sign(dz2 || 1) * hz;
        }
      }
    }
  } else {
    // the player's buildings, and the walls the world puts up itself (the
    // merchant's camp — game/fixedSolids.ts): the same boxes, the same push
    for (const list of [st.buildings, fixedSolids(null)]) for (const b of list) {
      if (!isBuilt(b)) continue; // walk freely through a ghost outline
      // raised gate / opened door — passable (Wave 8: one predicate, see
      // isDoorLike; the nav grid and the raiders read the same rule)
      if (isDoorLike(b.type) && (st.gateOpen[b.id] ?? true)) continue;
      // the Keep's own PlacedBuilding entry exists purely for interact-
      // detection (foundKeep, gameStore.ts) — its real footprint is a
      // flat courtyard plate (KeepAssembly.tsx) with no collision of its
      // own; the individual raised pieces don't have real collision yet
      // either (a separate, already-flagged gap — "J51 has no damage or
      // move behaviour" — not something to half-fake here)
      if (b.type === 'keep') continue;
      const base = b.y ?? 0;
      const dx = nx - b.x;
      const dz = nz - b.z;
      // real wall collision: pieces in WALL_CORE split into a narrow
      // "core" box (where a walking player's own body actually is) plus
      // a full-footprint box for whatever's above it — the mc-series
      // prefabs' projecting galleries/corbelled ledges no longer stop
      // the player at the widest point anywhere on the piece. Everything
      // else gets exactly one box spanning its full height, unchanged.
      for (const box of collisionBoxesFor(b.type, b.rot)) {
        // a box may sit off the building's own centre (a breached wall's
        // core is two pillars flanking the gap) — test against ITS centre
        const cx = b.x + (box.ox ?? 0);
        const cz = b.z + (box.oz ?? 0);
        const bdx = nx - cx;
        const bdz = nz - cz;
        const hx = box.hx + PLAYER_RADIUS;
        const hz = box.hz + PLAYER_RADIUS;
        if (Math.abs(bdx) >= hx || Math.abs(bdz) >= hz) continue;
        const boxBase = base + box.yBase;
        const boxTop = base + box.yTop;
        const canStepOnto = !riding && boxTop <= feetY + STEP_UP;
        const passesOverhead = boxBase >= feetY + 1.8;
        if (canStepOnto || passesOverhead) continue;
        const px = hx - Math.abs(bdx);
        const pz = hz - Math.abs(bdz);
        if (px < pz) nx = cx + Math.sign(bdx || 1) * hx;
        else nz = cz + Math.sign(bdz || 1) * hz;
        break; // one blocking box is enough; re-derive dx/dz next building
      }
    }
    for (const n of st.nodes) {
      // herbs are a 0.35m ground prop (ResourceNodes.tsx's HerbGroup) —
      // walkable like fishing spots, not a physical obstacle. Reported
      // 2026-07-28 as an invisible wall around every herb patch: this
      // loop gave them the SAME 1.1-radius block as a boulder (the
      // `: 1.1` fallback below was meant for rocks, not "everything
      // that isn't a tree").
      if (n.respawnAt !== null || n.kind === 'fishing' || n.kind === 'herb') continue;
      const r = (n.kind === 'tree' ? 0.55 : 1.1) * n.scale + PLAYER_RADIUS;
      const dx = nx - n.x;
      const dz = nz - n.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        nx = n.x + (dx / d) * r;
        nz = n.z + (dz / d) * r;
      }
    }
    {
      // the fishing dock is allowed to run out over the water — skip the
      // pond push-back for anyone standing in its narrow corridor
      const ddx = FISHING_DOCK.endX - FISHING_DOCK.startX;
      const ddz = FISHING_DOCK.endZ - FISHING_DOCK.startZ;
      const dockLen2 = ddx * ddx + ddz * ddz;
      const t = THREE.MathUtils.clamp(
        ((nx - FISHING_DOCK.startX) * ddx + (nz - FISHING_DOCK.startZ) * ddz) / dockLen2,
        0, 1,
      );
      const nearestX = FISHING_DOCK.startX + ddx * t;
      const nearestZ = FISHING_DOCK.startZ + ddz * t;
      const onDock = Math.hypot(nx - nearestX, nz - nearestZ) < FISHING_DOCK.halfWidth;
      if (!onDock) {
        const dx = nx - POND.x;
        const dz = nz - POND.z;
        const r = POND.radius - 0.4;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          nx = POND.x + (dx / d) * r;
          nz = POND.z + (dz / d) * r;
        }
      }
    }
    {
      // Wave 12 · and out of any waterway you have had cut. Direct
      // rectangle math in the movement resolver, deliberately alongside
      // the pond's circle above rather than routed through navBlocked():
      // the player is not a nav-grid walker, and the pond has always
      // stopped them here, so the water they dug themselves must stop them
      // in exactly the same place and in exactly the same way.
      const out = pushOutOfWater(nx, nz, PLAYER_RADIUS);
      nx = out.x;
      nz = out.z;
    }
    {
      // the keep's great hall is a permanent sealed fixture — bump into
      // it from outside like any other solid structure (no walk-in door)
      const hx = KEEP_INTERIOR.halfX + 0.4 + PLAYER_RADIUS;
      const hz = KEEP_INTERIOR.halfZ + 0.4 + PLAYER_RADIUS;
      const dx = nx - KEEP_INTERIOR.x;
      const dz = nz - KEEP_INTERIOR.z;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        const px = hx - Math.abs(dx);
        const pz = hz - Math.abs(dz);
        if (px < pz) nx = KEEP_INTERIOR.x + Math.sign(dx || 1) * hx;
        else nz = KEEP_INTERIOR.z + Math.sign(dz || 1) * hz;
      }
    }
    nx = THREE.MathUtils.clamp(nx, -WORLD_HALF + 2, WORLD_HALF - 2);
    nz = THREE.MathUtils.clamp(nz, -WORLD_HALF + 2, WORLD_HALF - 2);
  }
  return { nx, nz };
}
