// G-04 · when a raid sets out, and how long the homestead has to ready itself once the horn sounds. The raid came at
// dusk and only at dusk (the clock between 0.70 and 0.78), so a player could set a watch by it. Now any hour may bring
// one, by a chance per hour weighted to dusk and the night (raidChance: the one curve a balance pass tunes, and G-15a's
// hideouts feed through `pressure`), drawn per day from its count (raidDue), so a day's raids are the same however it
// is played — still behind the cooldown, the homestead's own gates and any other major event (raidDirector.ts). And
// none comes unannounced: a horn, a banner and the minimap's arrow toward its sides give at least
// RAID_WARNING_SECONDS, longer for each watch post a defender keeps (warningLeadTime, which G-25's dispatches and
// G-26's watchtowers read too). G-06 · and how many come: a richer homestead draws a hungrier raid (raidSize, by what
// its stores are worth), and every other raider behind the leader comes to strip them (thiefSlot).
import { mulberry32 } from '@/lib/rng';
import { isBuilt, type ItemId, type PlacedBuilding, type Villager } from '@/game/types';
import { BULK_GOODS } from '@/game/storage';
import { SELL_PRICES } from '@/game/data/trade';
import { KEEP_SITE_ID, sitesIn, type SocketSite } from '@/game/sites/sites';
import type { KeepState } from '@/game/data/keep';
import { raidSeedFor } from './approach';

/** How much likelier a raid is to set out in each hour of the day (0 = midnight; the clock's hour, worldEnv.time × 24)
 *  than in another: seldom by day, most at dusk (17-19, where every raid used to come), and on through the night. */
const RAID_HOUR_WEIGHT = [
  5, 5, 5, 5, 4, 2, // 00-05 the small hours
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 06-15 the day
  3, 10, 10, 10, // 16-19 the afternoon's end, and dusk
  7, 7, 6, 6, // 20-23 the night
];
const WEIGHT_SUM = RAID_HOUR_WEIGHT.reduce((a, w) => a + w, 0);
/** the raids a day the curve averages, before the cooldown (a day and a half, raidDirector.ts), the homestead's gates
 *  and the other major events thin it — what the owner's "at most about one a day" (OD-06) is measured against */
export const RAIDS_PER_DAY = 0.9;

/** The chance a raid sets out in `hour` (0-23) of a day; `pressure` scales the whole curve (G-15a's hideouts: 1 none). */
export function raidChance(hour: number, pressure = 1): number {
  return Math.min(1, (RAIDS_PER_DAY * pressure * RAID_HOUR_WEIGHT[hour]) / WEIGHT_SUM);
}

/** Does a raid set out in `hour` of day `day`? The day's seed (approach.ts's raidSeedFor, which draws its sides too)
 *  decides it, hour by hour: the same day and hour answer the same however often they are asked. */
export function raidDue(day: number, hour: number, pressure = 1): boolean {
  return mulberry32((raidSeedFor(day) ^ Math.imul(hour + 1, 0x85ebca6b)) >>> 0)() < raidChance(hour, pressure);
}

/** G-06 · what the homestead's stores are worth: each bulk good held (storage.ts's BULK_GOODS — what a thief takes) at
 *  the merchant's price for it (data/trade.ts's SELL_PRICES; 1 for one he does not buy) */
export function stockpileValue(inventory: Partial<Record<ItemId, number>>): number {
  let v = 0;
  for (const id of BULK_GOODS) v += (inventory[id] ?? 0) * (SELL_PRICES[id] ?? 1);
  return v;
}

/** G-06 · how many raiders follow the leader, by what the stores are worth (stockpileValue): a step up at each of these
 *  values — the one table a balance pass tunes beside raidChance. Two below the first, as every raid had. */
const RAID_SIZE_STEPS = [500, 1500, 3000];
const RAID_BASE_FOLLOWERS = 2;

/** The raiders behind their leader for stores worth `value`: 2, then 3 from 500, 4 from 1,500 and 5 from 3,000. */
export function raidSize(value: number): number {
  return RAID_BASE_FOLLOWERS + RAID_SIZE_STEPS.filter((at) => value >= at).length;
}

/** G-06 · whether the follower in slot `i` (1 the first) is a thief, who strips the stores (game/plunder.ts) rather
 *  than fights: every other one, from the first — at least one a raid, never the leader, and as many left to hold the
 *  field with the leader, so that a player must choose between the fight and the chase */
export function thiefSlot(i: number): boolean {
  return i % 2 === 1;
}

/** the warning a raid always gives: the horn to the raiders' arrival (OD-06: 30-60 s) */
export const RAID_WARNING_SECONDS = 30;
/** what each watch post with a defender on it adds: he sees them further off */
const WATCH_POST_SECONDS = 15;
const MAX_WARNING_SECONDS = 60;
/** the keep's pieces a defender keeps a watch from */
const WATCH_PARTS = new Set(['corner_turret']);

interface WatchHolder {
  buildings: PlacedBuilding[];
  villagers: Villager[];
  keep: KeepState | null;
  sites: SocketSite[];
}

/** The seconds between the horn and the raiders at a site — `world`'s (null: the homestead): RAID_WARNING_SECONDS, and
 *  WATCH_POST_SECONDS more for each finished Watch Tower (buildables catalog's 'tower') or keep Corner Turret there
 *  with a defender posted on it (his stationId: the tower's id, or "keep:<socket>"), up to a minute. */
export function warningLeadTime(st: WatchHolder, world: string | null = null): number {
  const posted = new Set(st.villagers.filter((v) => v.job === 'defender' && v.stationId).map((v) => v.stationId!));
  let posts = st.buildings.filter((b) => b.type === 'tower' && (b.world ?? null) === world && isBuilt(b) && posted.has(b.id)).length;
  for (const site of sitesIn(st, world)) {
    if (site.id !== KEEP_SITE_ID) continue; // the keep's sockets are the only ones a defender is posted to yet
    for (const [socket, part] of Object.entries(site.parts)) {
      if (part && WATCH_PARTS.has(part) && (site.built[socket] ?? 0) >= 1 && posted.has(`keep:${socket}`)) posts++;
    }
  }
  return Math.min(MAX_WARNING_SECONDS, RAID_WARNING_SECONDS + posts * WATCH_POST_SECONDS);
}
