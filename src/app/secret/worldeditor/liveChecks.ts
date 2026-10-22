// Wave 6 / CLN-09 · the world editor's live checks: the tables it edits, and every check it runs against them while they
// are still unsaved — rectangle overlap, homestead clearance, the road, the world's edge, and the terrain regions'
// own — as one pass (liveChecks) that yields both the warnings list and the ids of the rows to mark. The page used to
// run the same checks twice, once for each, the terrain sweep (the one costly check) with them.
import type { RectSection } from '@/game/data/grounds';
import { distanceToRoad, ROAD_REACH, ROAD_TILE, roadGateFor, routeCells } from '@/game/data/road';
import { WORLD_HALF } from '@/game/data/world';
import type { TerrainRegion } from '@/game/data/terrainRegions';
import { DOWNS_MAX_GRADIENT, DOWNS_SINK, regionSurfaceY } from '@/game/data/terrainRegions';
import { DIG_OUTSKIRT } from '@/game/waterworks';
import { aabbOverlapCenterHalf } from '@/lib/geometry';

export type Kind = 'tree' | 'rock' | 'herb';

export interface GroundRow extends RectSection {
  id: string;
  name: string;
  tier: number;
  lockedHint: string;
}
export interface LandTierRow {
  walls: number;
  half: number;
  // Wave 17 #4 · the south fence no longer grows with the rest — `half`
  // stays shared by north/east/west (see landTiers.ts's LAND_TIERS note),
  // `southHalf` is this table's own separate, normally-constant south bound.
  southHalf: number;
  cost: number;
  name: string;
}
export interface PlotRow extends RectSection {
  id: string;
  name: string;
  plantHint: string;
  stage: number;
  plantedAt: number;
  lastWateredAt: number | null;
  world?: string | null;
}

export interface Tables {
  grounds: GroundRow[];
  landTiers: LandTierRow[];
  cultivatedPlots: PlotRow[];
  terrainRegions: TerrainRegion[];
}

// Mirrors grounds.ts's own HOMESTEAD_CLEARANCE constant exactly. Not
// imported from there: that file's clearsHomestead() reads the STATIC,
// already-saved LAND_TIERS, not whatever half-values are sitting unsaved in
// this page's own form state — the whole point of a live preview is
// checking the edit in progress, before it's written to disk.
const HOMESTEAD_CLEARANCE = 8;

// Wave 60 · the structural shape every one of these live checks actually
// needs (a box's own centre and half-extents) — narrowed down from
// `RectSection` so a TerrainRegion (which has `half`, not `halfX`/`halfZ`)
// can be checked by the SAME functions via a `{ x: r.x, z: r.z, halfX:
// r.half, halfZ: r.half }` view, instead of forking duplicate copies of this
// math for regions. Every existing call site already passes a variable that
// structurally satisfies this — TypeScript's excess-property check only
// applies to object LITERALS, not variables — so this is a safe, local
// widening, not a behaviour change.
interface Box { x: number; z: number; halfX: number; halfZ: number }

// Shared by clearsHomesteadLive and terrainRegionProblems's own fence check —
// was recomputed separately in each place before Wave 60.
function maxHalfOf(landTiers: LandTierRow[]): number {
  return landTiers.reduce((m, t) => Math.max(m, t.half), 0);
}
function clearsHomesteadLive(s: RectSection, landTiers: LandTierRow[]): boolean {
  const maxHalf = maxHalfOf(landTiers);
  // Wave 17 #4 · mirrors grounds.ts's own clearsHomestead(): the X bound is
  // still the shared `half` (north/east/west), but the Z bound depends on
  // which side of the homestead the section is actually on — `southHalf`
  // south of it, `half` north of it — now that those two numbers can differ.
  const maxSouthHalf = landTiers.reduce((m, t) => Math.max(m, t.southHalf), 0);
  const xHalf = maxHalf + HOMESTEAD_CLEARANCE;
  const zHalf = (s.z >= 0 ? maxSouthHalf : maxHalf) + HOMESTEAD_CLEARANCE;
  return Math.abs(s.x) - s.halfX >= xHalf || Math.abs(s.z) - s.halfZ >= zHalf;
}
function crossesRoad(s: Box): boolean {
  const half = ROAD_TILE / 2;
  return routeCells().some(([cx, cz]) => {
    const rx = cx * ROAD_TILE, rz = cz * ROAD_TILE;
    return Math.abs(s.x - rx) < s.halfX + half && Math.abs(s.z - rz) < s.halfZ + half;
  });
}
// Wave 12 · how far the ground you are dragging has ended up from the leg of
// road that was laid to serve it. `crossesRoad` above only says the road
// misses it — a ground dragged clean away from its own spur passes that check
// happily, leaving the leg pointing at empty grass. Returns the distance so
// the warning can say how far, since "move it back a bit" is the fix.
function offRoad(s: Box): number {
  const gate = roadGateFor(s);
  return distanceToRoad(gate.x, gate.z);
}

// Wave 60 · ports terrainRegions.ts's own five dev-mode assertion checks
// (region overlap, field gradient/rim-buried, homestead fence, dig reach,
// road/grounds clash) into a LIVE, unsaved-form-state version — the same
// "check the edit in progress, not what's on disk" reasoning
// clearsHomesteadLive/crossesRoad above already apply to grounds/plots.
// `regionSurfaceY`/DOWNS_MAX_GRADIENT/DOWNS_SINK/DIG_OUTSKIRT are imported,
// not re-derived, so the surface math and every threshold stay the single
// copy terrainRegions.ts/waterworks.ts already own. Returns both the
// human-readable messages (for the warnings list) and the offending ids (for
// problemIds) from one pass, since the per-region sweep below is the one
// genuinely non-trivial cost in this file's live checks (see this wave's own
// report: ~18.7k grid points x 4 regionSurfaceY calls per region today).
function terrainRegionProblems(
  regions: TerrainRegion[],
  landTiers: LandTierRow[],
  grounds: GroundRow[],
): { messages: string[]; ids: Set<string> } {
  const messages: string[] = [];
  const ids = new Set<string>();
  const boxes = regions.map((r) => ({ r, box: { x: r.x, z: r.z, halfX: r.half, halfZ: r.half } }));

  // 0. no two regions overlap each other
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (aabbOverlapCenterHalf(boxes[i].box, boxes[j].box)) {
        messages.push(`${boxes[i].r.name} and ${boxes[j].r.name} overlap — two regions can never share ground`);
        ids.add(boxes[i].r.id);
        ids.add(boxes[j].r.id);
      }
    }
  }

  const fence = maxHalfOf(landTiers);
  // Mirrors terrainRegions.ts's own `outside()`: a "keep OUT of the square
  // ±n" test, not a distance — the SYMMETRIC test that file actually uses,
  // not clearsHomesteadLive's asymmetric north/south homestead test (a region
  // is a hillside a build fence must stay clear of on every side, not a
  // section the homestead's own south/north split applies to).
  const outside = (box: Box, n: number) =>
    box.z + box.halfZ < -n || box.z - box.halfZ > n || box.x + box.halfX < -n || box.x - box.halfX > n;

  for (const { r, box } of boxes) {
    // 1. the field itself: walkable everywhere, and back to fully buried
    //    before the rim — identical 0.5m sweep/central-difference gradient/
    //    thresholds to terrainRegions.ts's own dev check, run here against
    //    live (unsaved) field values instead of the file on disk.
    let maxGrad = 0;
    let rimHigh = -Infinity;
    for (let x = r.x - r.half; x <= r.x + r.half; x += 0.5) {
      for (let z = r.z - r.half; z <= r.z + r.half; z += 0.5) {
        const gx = (regionSurfaceY(r, x + 0.05, z) - regionSurfaceY(r, x - 0.05, z)) / 0.1;
        const gz = (regionSurfaceY(r, x, z + 0.05) - regionSurfaceY(r, x, z - 0.05)) / 0.1;
        maxGrad = Math.max(maxGrad, Math.hypot(gx, gz));
        if (Math.abs(Math.abs(x - r.x) - r.half) < 2 || Math.abs(Math.abs(z - r.z) - r.half) < 2) {
          rimHigh = Math.max(rimHigh, regionSurfaceY(r, x, z));
        }
      }
    }
    if (maxGrad > DOWNS_MAX_GRADIENT) {
      messages.push(`${r.name}'s field reaches a gradient of ${maxGrad.toFixed(3)} — over ${DOWNS_MAX_GRADIENT}, `
        + 'the player falls rather than runs down it');
      ids.add(r.id);
    }
    if (rimHigh > -DOWNS_SINK + 1e-6) {
      messages.push(`${r.name} has a bump reaching ${rimHigh.toFixed(2)} within 2m of the box edge — it will `
        + 'end in a cliff instead of sinking away under the meadow');
      ids.add(r.id);
    }

    // 2. the two bounds every region's box must be chosen against
    if (!outside(box, fence)) {
      messages.push(`${r.name} overlaps the widest fence (±${fence}) — buildings would be placed on it`);
      ids.add(r.id);
    }
    if (!outside(box, fence + DIG_OUTSKIRT)) {
      messages.push(`${r.name} is within digging reach (±${fence + DIG_OUTSKIRT}) of the homestead`);
      ids.add(r.id);
    }

    // 3. …and clear of everything already standing in the world
    if (crossesRoad(box)) {
      messages.push(`the road runs over ${r.name} — check the tile actually belongs on this hillside`);
      ids.add(r.id);
    }
    for (const g of grounds) {
      if (aabbOverlapCenterHalf(box, g)) {
        messages.push(`${g.name} now lies on ${r.name} — its fence, boundary stone and scattered nodes assume `
          + 'flat ground');
        ids.add(r.id);
        ids.add(g.id);
      }
    }
  }

  return { messages, ids };
}

/** Every live check over the tables as they stand: the warnings, in the order the page lists them, and the ids of the
 *  rows (and map boxes) to mark red. Being near the world's edge and sharing an id are warned of but mark nothing. */
export function liveChecks(tables: Tables): { messages: string[]; ids: Set<string> } {
  const messages: string[] = [];
  const ids = new Set<string>();
  const sections: (RectSection & { id: string; name: string })[] = [...tables.grounds, ...tables.cultivatedPlots];
  for (const s of sections) {
    if (!clearsHomesteadLive(s, tables.landTiers)) {
      messages.push(`${s.name} overlaps the fully-bought homestead`);
      ids.add(s.id);
    }
    if (crossesRoad(s)) {
      messages.push(`${s.name} lies across the road`);
      ids.add(s.id);
    }
    if (Math.abs(s.x) > WORLD_HALF - 20 || Math.abs(s.z) > WORLD_HALF - 20) {
      messages.push(`${s.name} sits within 20m of the world edge — node seeding will silently starve here`);
    }
  }
  // grounds only: a cultivated plot is ground you broke yourself, not
  // somewhere the kingdom built a road to
  for (const g of tables.grounds) {
    const d = offRoad(g);
    if (d > ROAD_REACH) {
      messages.push(`${g.name} is ${d.toFixed(0)}m off the carriageway — no leg of the road reaches its gate (road.ts's LEGS)`);
      ids.add(g.id);
    }
  }
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      if (aabbOverlapCenterHalf(sections[i], sections[j])) {
        messages.push(`${sections[i].name} overlaps ${sections[j].name}`);
        ids.add(sections[i].id);
        ids.add(sections[j].id);
      }
    }
  }
  const idCount = new Map<string, number>();
  for (const s of sections) idCount.set(s.id, (idCount.get(s.id) ?? 0) + 1);
  for (const [id, n] of idCount) if (n > 1) messages.push(`id "${id}" is used by ${n} entries — ids must be unique`);
  const regions = terrainRegionProblems(tables.terrainRegions, tables.landTiers, tables.grounds);
  messages.push(...regions.messages);
  for (const id of regions.ids) ids.add(id);
  return { messages, ids };
}
