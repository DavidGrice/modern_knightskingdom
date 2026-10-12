// Wave 46 (B8) · per-settlement road/path geometry, so navgrid.ts's
// road-preference mask (ROAD_STEP_MULT) can apply somewhere other than home.
//
// road.ts's own LEGS are home-coordinate-space and anchored to SIGNPOST —
// meaningless at a destination (navgrid.ts's own doc comment on this said so
// explicitly before this wave: "a destination/dungeon grid's own coordinates
// could coincidentally fall in the same numeric range without this meaning
// anything there"). This file is the destination-side equivalent: real,
// already-resolved world coordinates (via worlds.ts's resolveDestPoint
// invariant — the same durable storage every NPC/guild-hall/boss-camp
// coordinate already uses), not a second hand-typed table that could drift
// from the source of truth.
//
// Each settlement's path connects the places someone would actually walk
// between — the arrival spawn to its resident's stand-point and its guild
// hall — the same practical reasoning road.ts's own home network already
// uses for which grounds get a leg.
//
// CLN-22 · WHICH legs a settlement has is its own record's `roadsTo`
// (data/settlements.ts) — this file used to name the three givers by hand,
// one more place a new settlement had to be written into. It still owns the
// geometry: where each leg's two ends are, and what counts as on it.
import { TEMPLATE_ARRIVAL_SPAWN } from './worlds';
import { GUILD_BY_WORLD } from './guilds';
import { NPC_BY_ID } from './npcs';
import { ROAD_HALF_WIDTH } from './road';
import { SETTLEMENTS, type SettlementDef, type SettlementRoadEnd } from './settlements';

interface Point { x: number; z: number }
interface Segment { x0: number; z0: number; x1: number; z1: number }

const seg = (a: Point, b: Point): Segment => ({ x0: a.x, z0: a.z, x1: b.x, z1: b.z });

/** where one leg of a settlement's road runs out to */
function roadEnd(destId: string, site: SettlementDef, end: SettlementRoadEnd): Point {
  if (end === 'giver') return NPC_BY_ID[site.giver];
  const hall = GUILD_BY_WORLD[destId];
  return { x: hall.hallX, z: hall.hallZ };
}

function buildPaths(): Record<string, Segment[]> {
  const built: Record<string, Segment[]> = {};
  for (const [destId, site] of Object.entries(SETTLEMENTS)) {
    // a settlement with no leg gets no entry at all, not an empty one: hasSettlementRoad answers by key
    if (site.roadsTo.length === 0) continue;
    built[destId] = site.roadsTo.map((end) => seg(TEMPLATE_ARRIVAL_SPAWN[destId], roadEnd(destId, site, end)));
  }
  return built;
}

// built lazily (not at module scope) so this file's own import of
// worlds.ts/guilds.ts/npcs.ts never forces their evaluation order relative
// to whatever else imports this module first.
let cache: Record<string, Segment[]> | null = null;
const paths = (): Record<string, Segment[]> => cache ?? (cache = buildPaths());

/** Does this destination region have any authored road/path at all? Lets
 *  navgrid.ts's region-null gate generalize to "no data for this region"
 *  instead of "any non-home region" without importing this file's shape. */
export function hasSettlementRoad(region: string): boolean {
  return region in paths();
}

/** True within ROAD_HALF_WIDTH of one of this settlement's path segments —
 *  the same printed-carriageway-width convention road.ts's own onRoad()
 *  uses at home. */
export function onSettlementRoad(region: string, x: number, z: number): boolean {
  const segs = paths()[region];
  if (!segs) return false;
  for (const s of segs) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - s.x0) * dx + (z - s.z0) * dz) / len2)) : 0;
    if (Math.hypot(x - (s.x0 + t * dx), z - (s.z0 + t * dz)) <= ROAD_HALF_WIDTH) return true;
  }
  return false;
}
