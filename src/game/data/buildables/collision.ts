// CLN-10 · split out of buildables.ts unchanged: a placed piece's geometry — its footprint and height, which
// pieces fall inside a rectangle, and the collision boxes the player, the nav grid and line of sight all read.
import type { BuildRect, PlacedBuilding } from '../../types';
import { shapeFor } from '../../collisionShapes';
import { BUILDABLE_BY_ID } from './catalog';

// Wave 29 · a hand-authored buildable that reuses a GENERATED_BUILDABLES
// (catalog.ts) mesh under its OWN id (a fresh promotion, not the generic `gen_` entry)
// still needs the SAME real voxelized collision that generic entry already
// has — scripts/gen-collision.mjs (local-only, gitignored — see the repo's
// own asset-pipeline note in .gitignore) keys its output by buildable id,
// and only ever ran against the ids present in buildables.ts/
// bricks.generated.json at the time it was last run, which does not include
// ids invented in this pass. Hand-duplicating the entry into
// public/assets/collision.json isn't durable either — that file is itself
// gitignored/regenerated, so a hand edit would be silently lost on the next
// asset-pipeline run on any machine. Aliasing the LOOKUP back to the real
// `gen_` id the geometry is actually voxelized under is: real data, still
// git-tracked (this table lives in source), and survives a pipeline rerun.
const COLLISION_ALIAS: Record<string, string> = {
  gatehouse_arch: 'gen_16_l302721',
  garden_arch: 'gen_14_l302720',
  signal_cannon: 'gen_12_l3207401',
  // Wave 35 (G4) · same pattern — real voxelized collision exists (only for
  // this one of the four corners) under the generic `gen_` id.
  'oc6098-5': 'gen_oc6098-5',
};

function shapeForBuildable(type: string) {
  return shapeFor(COLLISION_ALIAS[type] ?? type);
}

/** footprint (x, z) in meters after rotation */
export function sizeFor(type: string, rot: number): [number, number] {
  const b = BUILDABLE_BY_ID[type];
  if (!b) return [1, 1];
  return rot % 2 === 1 ? [b.size[2], b.size[0]] : [b.size[0], b.size[2]];
}

export function heightOf(type: string): number {
  return BUILDABLE_BY_ID[type]?.size[1] ?? 1;
}

/**
 * Wave 9 · which standing pieces a dragged-out patch of ground actually takes.
 * Footprint OVERLAP, not centre-inside: a marquee that clips the end of an 8m
 * wall obviously means that wall, and asking the player to lasso an exact
 * centre point is a precision game nobody wants to play.
 *
 * Lives here, next to `sizeFor`, because it is pure footprint geometry — and
 * because the area-demolish tool has to ask it twice from two places (the
 * live marquee in BuildController, the armed confirmation in the store) and
 * those two must never disagree about what is inside the box.
 *
 * The Grand Keep's foundation is always excluded: its parts/progress/HP live
 * outside PlacedBuilding and only `pickupKeep` knows how to carry them, so a
 * castle is taken down deliberately or not at all.
 */
export function buildingsInRect(
  buildings: PlacedBuilding[],
  world: string | null,
  rect: BuildRect,
): PlacedBuilding[] {
  return buildings.filter((b) => {
    if ((b.world ?? null) !== (world ?? null)) return false;
    if (b.type === 'keep') return false;
    const [bsx, bsz] = sizeFor(b.type, b.rot);
    return b.x + bsx / 2 > rect.minX && b.x - bsx / 2 < rect.maxX
      && b.z + bsz / 2 > rect.minZ && b.z - bsz / 2 < rect.maxZ;
  });
}

// Real wall collision (2026-07-20): the mc-series prefab walls/towers were
// colliding as one solid box spanning their full declared footprint at every
// height, so a player could never get closer than the WIDEST point anywhere
// on the piece — usually a corbelled ledge or a tower's projecting upper
// gallery — even though the actual wall/tower SHAFT a player walks up to is
// much narrower. Verified against the real GLBs (Y-sliced vertex sampling,
// scripts/yslice one-off): mc006's core shaft is roughly half its declared
// depth; mc003 (Wall Tower)'s base shaft is ~80% of its declared width/depth,
// with a genuine projecting gallery starting around 2 world units up — right
// where a standing player's own overhead-pass threshold already kicks in
// below. So each entry here is just a NARROWER "core" box for the lower
// portion (where a walking player's body actually is); above `coreHeight`,
// collision falls back to the existing single-box passesOverhead escape
// hatch, which already lets you walk under anything whose base clears you —
// no second box needed up there. Pieces absent from this table keep the
// original single full-footprint box exactly as before (zero risk elsewhere).
interface WallCoreBox {
  coreHeight: number; // world units — collision uses the narrow core up to here
  depthFrac: number;  // fraction of the piece's own declared depth (sz), centered
  widthFrac: number;  // fraction of the piece's own declared width (sx), centered
}

const WALL_CORE: Record<string, WallCoreBox> = {
  mc006: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc007: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  // this entry was dead until Wave 34 (G6.1) promoted mc008 to a real
  // Buildable id — no collision.json voxel data exists for mc008, so this is
  // (correctly) the collision shape it now actually gets.
  mc008: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc009: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc010: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc001: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  // Wave 34 (G6.1) · mc002 is byte-identical raw geometry to mc001 (same
  // corner-piece shaft), so it gets the same core box rather than falling to
  // the full-footprint default every previously-unlisted piece used.
  mc002: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  mc004: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  mc005: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  mc003: { coreHeight: 2.0, depthFrac: 0.8, widthFrac: 0.8 },
};

/** Wall pieces the rig lab flags `traits.wall.hasHole` — a breach you can see
 *  straight through, so you should be able to walk through it too. mc009 is
 *  destruction phase 2/3 (holed), mc010 phase 3/3 (ruined). Their lower core
 *  becomes two side pillars with an opening between, instead of one solid
 *  slab that stops you at an invisible edge in the middle of a visible gap. */
const WALL_HOLE = new Set(['mc009', 'mc010']);

/** fraction of the piece's length left open at the breach */
const HOLE_FRAC = 0.44;

export interface CollisionBox {
  hx: number; hz: number; yBase: number; yTop: number;
  /** centre offset from the building origin, in already-rotated world axes */
  ox?: number; oz?: number;
}

/** the stack of collision sub-boxes for a building type at a given base Y
 *  (relative, i.e. yBase/yTop are offsets ABOVE the building's own `b.y`) —
 *  one box spanning the full height for anything not in WALL_CORE (identical
 *  to the old single-box behavior), or two stacked boxes (narrow core below,
 *  full declared footprint above) for a piece with an override. */
/**
 * L65 · Where a piece's SOLID mass sits inside its declared footprint.
 *
 * A crenellated wall is a 0.86m slab of stone at the back of a 2.8m footprint
 * with the battlement overhanging forward. Both the mesh and the footprint are
 * centred on the cell, so the stone itself sits at the back of the cell at one
 * facing and at the front when you turn the piece around — the wall face
 * jumped a metre and a half and no longer met its neighbour on the grid line.
 *
 * This is the offset that re-centres the STONE on the cell, letting the
 * decorative overhang hang outside the footprint where it belongs. It is
 * measured from the piece's own collision volumes, so it costs no new data and
 * cannot drift from the geometry.
 */
const solidOffsetCache: Record<string, [number, number]> = {};

function solidOffset(type: string): [number, number] {
  const cached = solidOffsetCache[type];
  if (cached) return cached;
  const shape = shapeForBuildable(type);
  let out: [number, number] = [0, 0];
  if (shape && shape.length) {
    let vol = 0; let cx = 0; let cz = 0;
    for (const b of shape) {
      const v = b.hx * b.hy * b.hz;
      vol += v; cx += b.cx * v; cz += b.cz * v;
    }
    if (vol > 0) out = [cx / vol, cz / vol];
  }
  solidOffsetCache[type] = out;
  return out;
}

/** the same offset, turned to face the way the piece is placed */
export function solidOffsetRotated(type: string, rot: number): [number, number] {
  const [ox, oz] = solidOffset(type);
  let x = ox; let z = oz;
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) {
    const nx = z; const nz = -x;
    x = nx; z = nz;
  }
  return [x, z];
}

export function collisionBoxesFor(type: string, rot: number): CollisionBox[] {
  const [sx, sz] = sizeFor(type, rot);
  const fullTop = heightOf(type);

  // Real geometry first: scripts/gen-collision.mjs emits per-piece boxes
  // voxelised from the source OBJ, which is the only way an arch gets an
  // actual hole instead of being a solid slab you cannot walk under. The
  // boxes are authored in the piece's UNROTATED local frame, so a quarter
  // turn swaps the axes exactly the way sizeFor already swaps the footprint.
  const shape = shapeForBuildable(type);
  if (shape && shape.length) {
    const quarter = ((rot % 4) + 4) % 4;
    // re-centre on the solid (L65) before turning, so the volumes move with
    // the mesh — Buildings.tsx applies the same shift when it draws
    const [sox, soz] = solidOffset(type);
    return shape.map((b) => {
      // L63 · rotate the centre offset and the half-extents together, THE
      // SAME WAY THE MESH TURNS. This turned the other way: a three.js yaw of
      // +90° sends a local (x, z) to world (z, -x) — its Y-rotation matrix is
      // [cos 0 sin / 0 1 0 / -sin 0 cos] — while this loop was computing
      // (-z, x), which is -90°. At 180° the two agree, which is why the error
      // hid; at a quarter turn the solid stone of a wall ended up on the far
      // side from where it was drawn, so you were stopped under the overhang
      // and walked through the stone.
      let ox = b.cx - sox; let oz = b.cz - soz; let hx = b.hx; let hz = b.hz;
      for (let i = 0; i < quarter; i++) {
        const nx = oz; const nz = -ox;
        ox = nx; oz = nz;
        const th = hx; hx = hz; hz = th;
      }
      return { hx, hz, ox, oz, yBase: b.cy - b.hy, yTop: b.cy + b.hy };
    });
  }

  const core = WALL_CORE[type];
  if (!core) return [{ hx: sx / 2, hz: sz / 2, yBase: 0, yTop: fullTop }];
  // widthFrac/depthFrac are authored against the UNROTATED size; sizeFor
  // already swapped sx/sz for a 90°/270° rotation, so swap the fractions too
  const [wFrac, dFrac] = rot % 2 === 1 ? [core.depthFrac, core.widthFrac] : [core.widthFrac, core.depthFrac];
  const coreTop = Math.min(core.coreHeight, fullTop);
  const coreHx = (sx * wFrac) / 2;
  const coreHz = (sz * dFrac) / 2;
  const boxes: CollisionBox[] = [];

  if (WALL_HOLE.has(type)) {
    // breached: two pillars flanking an opening. The length axis is X for an
    // unrotated piece and Z once turned 90°, matching sizeFor's own swap.
    const alongX = rot % 2 === 0;
    const halfLen = alongX ? coreHx : coreHz;
    const gapHalf = (alongX ? sx : sz) * HOLE_FRAC / 2;
    const pillar = (halfLen - gapHalf) / 2;
    if (pillar > 0.05) {
      const centre = gapHalf + pillar;
      for (const sign of [-1, 1]) {
        boxes.push(alongX
          ? { hx: pillar, hz: coreHz, yBase: 0, yTop: coreTop, ox: sign * centre }
          : { hx: coreHx, hz: pillar, yBase: 0, yTop: coreTop, oz: sign * centre });
      }
    }
    // no `else`: a breach wider than the core leaves the base fully open
  } else {
    boxes.push({ hx: coreHx, hz: coreHz, yBase: 0, yTop: coreTop });
  }

  if (coreTop < fullTop) boxes.push({ hx: sx / 2, hz: sz / 2, yBase: coreTop, yTop: fullTop });
  return boxes;
}
