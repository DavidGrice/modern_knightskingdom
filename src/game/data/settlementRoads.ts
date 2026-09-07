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
import { TEMPLATE_ARRIVAL_SPAWN } from './worlds';
import { GUILD_BY_WORLD } from './guilds';
import { NPC_BY_ID } from './npcs';
import { ROAD_HALF_WIDTH } from './road';

interface Point { x: number; z: number }
interface Segment { x0: number; z0: number; x1: number; z1: number }

const seg = (a: Point, b: Point): Segment => ({ x0: a.x, z0: a.z, x1: b.x, z1: b.z });

function buildPaths(): Record<string, Segment[]> {
  return {
    // template-04's arrival IS BUILDERS_HALL (within rounding — see
    // worlds.ts's own TEMPLATE_ARRIVAL_SPAWN comment), so its one real
    // connection is out to Garrick.
    'template-04': [seg(TEMPLATE_ARRIVAL_SPAWN['template-04'], NPC_BY_ID['garrick'])],
    // same pattern: template-07's arrival is WOODSMEN_HALL itself (guilds.ts).
    'template-07': [seg(TEMPLATE_ARRIVAL_SPAWN['template-07'], NPC_BY_ID['torvald'])],
    // template-08 is the one genuinely 3-distinct-point settlement: arrival,
    // the Miners' hall, and Fenwick are all a few metres apart, not the same
    // point — two real legs.
    'template-08': [
      seg(TEMPLATE_ARRIVAL_SPAWN['template-08'], NPC_BY_ID['fenwick']),
      seg(TEMPLATE_ARRIVAL_SPAWN['template-08'], { x: GUILD_BY_WORLD['template-08'].hallX, z: GUILD_BY_WORLD['template-08'].hallZ }),
    ],
  };
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
