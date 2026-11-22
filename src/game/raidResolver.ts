// G-07 · a raid the player has fallen out of, settled. Knocked out with raiders standing he used to wake to "the
// raiders had the field" whatever his garrison was doing (F-17's stopgap); now the garrison fights on without him, by
// the one model of that fight there is (garrisonBalance.ts's garrisonFight: G-08's pinned table, with the defenders
// posted up whom raiders on the ground cannot reach, and the thieves who strip the stores rather than fight), and what
// it costs is counted: held — beaten off whole; pressed — beaten off at a cost; lost — every defender down, and the
// raiders have the field (OD-02, the owner's harsh answer).
//
// What each costs:
//   theft — every thief takes a good each GRAB_EVERY seconds, the biggest pile first (plunder.ts's nextGrab), from when
//     he is at the stores until he is struck or carries RUN_HAUL, as one does in the fight in the world; one who
//     reaches RUN_HAUL, or runs, is gone with it, one cut down gives back what he carried; once the garrison has fallen,
//     nothing stops those still standing. So a raid beaten off quickly loses little, and one held up long loses more.
//   ruins — pressed: a share of the pieces raiders batter (a wall, a shut gate, a keep piece standing) as large as the
//     share of the garrison's health lost, one at most for each raider who came to fight; lost: one for each raider
//     standing at the garrison's fall (one who ran is gone).
//   razed — lost only: raidStrength() x the raiders standing x RAZE_SHARE pieces, one at the least, removed outright —
//     a keep piece down to its bare socket; never the keep's foundation, which is not offered.
//   Neither, in a raid lost once every raider who came to fight is down or has run: the thieves left strip the stores
//     and go, and none stays to tear the homestead down. (One shut out of the stores batters his way to them in the
//     world; the resolver leaves that out, as it does every raider's siege time — kinder, never harsher.)
// The pieces are taken nearest the raid's sides first (directors/approach.ts: raidPlan.sides), each strayed by the seed
// (the raid's own, raidSeedFor), so the same raid on the same homestead settles the same way. The resolver never goes
// harsher than the fight in the world can: a raider strikes as he would there, a thief takes no more than he could
// carry off, and no piece is touched in a raid held. Pure: what it is handed, it hands back settled; the game applies it
// (directors/raidSettle.ts).
import { mulberry32 } from '@/lib/rng';
import { garrisonFight, type Fighter, type GarrisonOutcome } from './garrisonBalance';
import { GRAB_EVERY, RUN_HAUL, addGoods, haulOf, nextGrab, type Goods } from './plunder';
import { bearingFromHome } from './directors/approach';

/** a defender in the fight: his villager id, his fight (live health), and whether he stands posted up */
export interface RaidDefender { id: string; fighter: Fighter; up: boolean }
/** a raider still standing: his fight (live health, his blow and cooldown as he strikes a guard: enemyAi/blows.ts), the
 *  health at or below which he runs (data/enemies.ts's breakPoint; Infinity, one running already), and, a thief, what
 *  he carries already and the seconds until he is at the stores */
export interface RaidRaider { fighter: Fighter; breaksAt: number; thief: boolean; carried: Goods; atStores: number }
/** a piece of the homestead the raid can wreck: `ref` (a building's id, or `keep:<socket>`), its name, where it stands,
 *  whether the raiders batter it (a wall, a shut gate, a keep piece standing) and whether it is a ruin already */
export interface RaidPiece { ref: string; name: string; x: number; z: number; batters: boolean; ruin: boolean }

export interface RaidField {
  garrison: RaidDefender[];
  raiders: RaidRaider[];
  /** raidStrength() as the raid is settled */
  strength: number;
  /** the raid's sides, bearings from home (raidPlan.sides) */
  sides: number[];
  seed: number;
  /** the homestead's stores */
  stores: Goods;
  pieces: RaidPiece[];
}

export interface RaidSettlement {
  outcome: GarrisonOutcome;
  /** the defenders the fight put down, by id */
  downed: string[];
  /** the goods the thieves took from the stores in the fight */
  taken: Goods;
  /** gone with the thieves (what they carried already and what they took) */
  stolen: Goods;
  /** dropped by the thieves cut down, back to the stores */
  recovered: Goods;
  ruined: RaidPiece[];
  razed: RaidPiece[];
}

/** pieces razed in a raid lost, for each raider standing at the garrison's fall, times raidStrength() */
export const RAZE_SHARE = 0.5;
/** how far the seed strays a piece's place in the order the raid wrecks them, against its bearing off the raid's
 *  nearest side (0 on it, 1 across from it) */
const WRECK_STRAY = 0.35;

/** how far off the raid's nearest side a piece lies: 0 on it, 1 straight across from it (0 with no sides) */
function offSides(p: RaidPiece, sides: number[]): number {
  if (!sides.length) return 0;
  const b = bearingFromHome(p.x, p.z);
  return Math.min(...sides.map((s) => Math.abs(Math.atan2(Math.sin(b - s), Math.cos(b - s))))) / Math.PI;
}

/** The raid settled (this file's head says how). */
export function resolveRaid(field: RaidField): RaidSettlement {
  const fight = garrisonFight(field.garrison.map((d) => d.fighter), field.raiders.map((r) => r.fighter), {
    up: field.garrison.map((d) => d.up),
    thieves: field.raiders.map((r) => r.thief),
    breaksAt: field.raiders.map((r) => r.breaksAt),
  });
  /** a raider who ran (broken, or running already), gone off the field with whatever he carried */
  const ran = field.raiders.map((r, i) => fight.raid[i] > 0 && fight.raid[i] <= r.breaksAt);
  const lost = fight.outcome === 'lost';

  // the theft: each thief's grabs, in the order they fall, out of the one store
  const stores: Goods = { ...field.stores };
  const taken: Goods = {}, stolen: Goods = {}, recovered: Goods = {};
  const hauls = field.raiders.map((r) => ({ ...r.carried }));
  // a thief stops taking when he is struck — once the garrison has fallen, one still standing never is; one who ran
  // without a blow (running already) takes nothing more
  const stopsAt = field.raiders.map((_, i) => (ran[i] ? (Number.isFinite(fight.struck[i]) ? fight.struck[i] : 0)
    : lost && fight.raid[i] > 0 ? Infinity : fight.struck[i]));
  const grabs: { t: number; i: number }[] = [];
  field.raiders.forEach((r, i) => {
    if (!r.thief) return;
    for (let k = 1; k <= RUN_HAUL - haulOf(r.carried); k++) {
      const t = r.atStores + k * GRAB_EVERY;
      if (t >= stopsAt[i]) break;
      grabs.push({ t, i });
    }
  });
  grabs.sort((a, b) => a.t - b.t || a.i - b.i);
  for (const { i } of grabs) {
    const id = nextGrab(stores);
    if (!id || haulOf(hauls[i]) >= RUN_HAUL) continue;
    stores[id] = (stores[id] ?? 0) - 1;
    taken[id] = (taken[id] ?? 0) + 1;
    hauls[i][id] = (hauls[i][id] ?? 0) + 1;
  }
  field.raiders.forEach((r, i) => {
    if (!r.thief) return;
    // gone with his haul: full before he was struck, run, or standing when the garrison fell; else cut down with it
    if (haulOf(hauls[i]) >= RUN_HAUL || ran[i] || (lost && fight.raid[i] > 0)) addGoods(stolen, hauls[i]);
    else addGoods(recovered, hauls[i]);
  });

  // the pieces wrecked, nearest the raid's sides first, each strayed by the seed
  const rnd = mulberry32(field.seed);
  const order = field.pieces.map((p) => ({ p, at: offSides(p, field.sides) + rnd() * WRECK_STRAY }))
    .sort((a, b) => a.at - b.at).map((o) => o.p);
  const standing = fight.raid.filter((hp, i) => hp > 0 && !ran[i]).length;
  /** of them, the raiders who came to fight — with none, nothing is wrecked (this file's head) */
  const fighting = fight.raid.filter((hp, i) => hp > 0 && !ran[i] && !field.raiders[i].thief).length;
  let razeCount = 0, ruinCount = 0;
  if (lost && fighting) {
    razeCount = Math.max(1, Math.round(standing * field.strength * RAZE_SHARE));
    ruinCount = standing;
  } else if (fight.outcome === 'pressed') {
    const full = field.garrison.reduce((a, d) => a + d.fighter.hp, 0);
    const left = fight.garrison.reduce((a, hp) => a + Math.max(0, hp), 0);
    const fighters = field.raiders.filter((r) => !r.thief).length;
    ruinCount = Math.min(fighters, Math.round((1 - left / full) * fighters));
  }
  const razed = order.slice(0, razeCount);
  const ruined = order.filter((p) => p.batters && !p.ruin && !razed.includes(p)).slice(0, ruinCount);
  return {
    outcome: fight.outcome,
    downed: field.garrison.filter((_, i) => fight.garrison[i] <= 0).map((d) => d.id),
    taken, stolen, recovered, ruined, razed,
  };
}

/** G-07 · what the raid-report panel shows of a raid the player fell out of (RaidReportPanel.tsx): set as it is settled
 *  (directors/raidSettle.ts), shown once he is home and nothing else is up */
export interface RaidReport {
  outcome: GarrisonOutcome;
  /** the raid's goods in all — what got away and what was taken back (plunder.ts's raidHaul) */
  lost: Goods;
  recovered: Goods;
  ruined: string[];
  razed: string[];
  downed: string[];
  /** settled while the player was away, when the garrison fell (no knock-out) */
  away: boolean;
  /** the panel has been opened on it */
  shown: boolean;
}
