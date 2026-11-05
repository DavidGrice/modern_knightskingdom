// Which crafting stations are within reach of a point. One answer for all who ask: the world's half-second sweep
// (game/worldTick.ts — the player controller's, or WorldTicker's in build mode and behind a panel), and the game
// store, which looks again at the moment a crafting panel opens and whenever the buildings change while one is up —
// so what a panel shows is right as it opens, and stays right as the buildings change under it, without waiting for
// the next sweep. A leaf on purpose (data and types only): the
// store imports it.
import { BUILDABLE_BY_ID } from './data/buildables';
import { STATION_RANGE } from './data/world';
import { isBuilt, type PlacedBuilding } from './types';

/** The kinds of station (`workbench`, `forge`, `campfire`) with a BUILT piece closer than STATION_RANGE to
 *  (`px`, `pz`) — each once, sorted.
 *
 *  A station that is not built is no station yet: placing it only marks out the site, and a ruin is a site again.
 *  (Until 2026-10-10 the scan named both, and the Crafting panel worked beside a forge that was still an outline —
 *  ROADMAP.md, "a crafting station counted as "in reach" before it was built". The controller's own targeting
 *  already offered a site nothing but the hammer.) A piece from a save older than sites, with no `built` at all, is
 *  built. */
export function stationsInReach(buildings: readonly PlacedBuilding[], px: number, pz: number): string[] {
  const near: string[] = [];
  for (const b of buildings) {
    const def = BUILDABLE_BY_ID[b.type];
    if (!def?.station || !isBuilt(b)) continue;
    if (Math.hypot(px - b.x, pz - b.z) < STATION_RANGE && !near.includes(def.station)) {
      near.push(def.station);
    }
  }
  return near.sort();
}
