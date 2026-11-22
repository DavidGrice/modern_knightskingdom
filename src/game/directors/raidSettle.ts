// G-07 · a home raid the player has fallen out of, settled on the homestead: the live garrison and the raiders still
// standing handed to the resolver (game/raidResolver.ts), and what it settles applied — the goods taken and given back
// (and the ledger), the pieces left ruins and those razed, the defenders it put down — with the report the player
// reads when he is next at home. Two ways in: knocked out while a home raid runs, at home or away (combat/playerDamage.ts:
// the clear that follows takes the home raid either way), and, away, the garrison fallen with raiders on the field
// (raidDirector.ts) — a raid fought while he is away goes on live (Defenders and Enemies stay mounted wherever he is),
// but with no defender standing nothing would ever end it.
import { useGameStore, type GameState } from '@/game/store/gameStore';
import { useEnemyStore, type EnemyData } from '@/game/combat/enemyStore';
import { isHomeBuilding, type ItemId, type Villager } from '@/game/types';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { ATTACK_CD, ATTACK_DMG, breakPoint } from '@/game/data/enemies';
import { KEEP_PART_BY_ID } from '@/game/data/keep';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { MERCHANT_CAMP_STATION } from '@/game/data/trade';
import { DOWNED_RECOVER_MS, defenderMaxHp, defenderState } from '@/game/defenders';
import { defenderFighter } from '@/game/garrisonBalance';
import { raidStrength } from '@/game/difficulty';
import { worldEnv } from '@/game/env';
import { buildingBase } from '@/game/repair';
import { nearestStore } from '@/game/storage';
import { KEEP_SITE_ID, siteById, siteGate, siteSocketWorld, siteSockets, siteStands } from '@/game/sites/sites';
import { addGoods, gotAway, haulOf, raidHaul, type Goods } from '@/game/plunder';
import { resolveRaid, type RaidField, type RaidPiece, type RaidReport, type RaidSettlement } from '@/game/raidResolver';
import { exposeDebug } from '@/lib/debugHooks';
import { RANGED_ATTACK_CD, RANGED_DMG } from '@/game/enemyAi/engage';
import { batterable } from '@/game/enemyAi/targeting';
import { raidSeedFor } from './approach';
import { raidActive, raidDowned, raidLost, raidPlan } from './state';

/** a bandit's pace on foot (enemyAi/movement.ts's speedOf): how soon a thief walking in is at the stores */
const THIEF_PACE = 2.7;

/** the home raid's raiders still on their feet */
export function homeRaiders(): EnemyData[] {
  return useEnemyStore.getState().enemies.filter((e) => e.raid && (e.world ?? null) === null && e.mob.state !== 'dying');
}

/** a sworn defender of the homestead: every one but the guard posted at the merchant's camp, 78 m off, who walks his
 *  rounds in its yard and fights only what comes within 22 m of him (Defenders.tsx) — the homestead's raiders never */
export function homeGuard(v: Villager): boolean {
  return v.job === 'defender' && v.stationId !== MERCHANT_CAMP_STATION;
}

/** whether a home defender stands — none downed (game/actorDowned.ts) and none registered count as fallen */
export function garrisonStands(st: Pick<GameState, 'villagers'>): boolean {
  return st.villagers.some((v) => homeGuard(v) && defenderState[v.id] && defenderState[v.id].state !== 'downed');
}

/** The raid as the resolver reads it, from the live game: every home defender not downed at his live health (a figure
 *  not yet drawn, at his full), posted up or not; every raider standing at his, striking a guard as blows.ts does and
 *  breaking as breaksAndRuns has him (one running already out of the fight); a raider carrying goods counted a thief,
 *  and one already running for the road taking no more; the homestead's pieces (never the keep's foundation) and its
 *  stores. */
export function raidField(st: GameState, raiders: EnemyData[]): RaidField {
  const garrison = st.villagers.filter((v) => homeGuard(v) && defenderState[v.id]?.state !== 'downed').map((v) => {
    const ds = defenderState[v.id];
    return { id: v.id, fighter: { ...defenderFighter(v), hp: ds && ds.maxHp > 1 ? ds.hp : defenderMaxHp(v) }, up: !!ds?.elevated };
  }).filter((d) => d.fighter.hp > 0);
  const homeStore = (x: number, z: number) => nearestStore(st.buildings, x, z, isHomeBuilding) ?? { x: HOME_X, z: HOME_Z };
  const field: RaidField['raiders'] = raiders.map((e) => {
    const thief = !!e.thief || haulOf(e.carried) > 0;
    const at = homeStore(e.mob.x, e.mob.z);
    return {
      fighter: {
        hp: e.hp, dmg: (e.ranged ? RANGED_DMG : ATTACK_DMG[e.kind]) * e.scale, cd: e.ranged ? RANGED_ATTACK_CD : ATTACK_CD[e.kind],
      },
      breaksAt: e.mob.fleeing ? Infinity : breakPoint(e.kind, e.finalStand),
      thief, carried: { ...e.carried },
      atStores: e.mob.fleeing ? Infinity : Math.hypot(at.x - e.mob.x, at.z - e.mob.z) / THIEF_PACE,
    };
  });
  // the thieves after every raider who fights, as the garrison comes to them
  const order = field.map((_, i) => i).sort((a, b) => Number(field[a].thief) - Number(field[b].thief) || a - b);
  return {
    garrison,
    raiders: order.map((i) => field[i]),
    strength: raidStrength(),
    sides: raidPlan.sides,
    seed: raidPlan.seed || raidSeedFor(worldEnv.dayCount),
    stores: { ...st.inventory },
    pieces: homePieces(st),
  };
}

/** what a raid can wreck at home: every placed building but the keep's foundation, and every piece on the keep's
 *  sockets, standing or in ruins */
function homePieces(st: GameState): RaidPiece[] {
  const out: RaidPiece[] = [];
  for (const b of st.buildings) {
    if (!isHomeBuilding(b) || b.type === 'keep') continue;
    const name = BUILDABLE_BY_ID[buildingBase(b, st.buildingHp[b.id])]?.name ?? b.type;
    out.push({ ref: b.id, name, x: b.x, z: b.z, batters: batterable(st, b), ruin: !!b.ruin });
  }
  const site = siteById(st, KEEP_SITE_ID);
  if (site) {
    for (const sock of siteSockets(site)) {
      const partId = site.parts[sock.id];
      if (!partId) continue;
      const at = siteSocketWorld(site, sock.id)!;
      out.push({
        ref: `keep:${sock.id}`, name: KEEP_PART_BY_ID[partId]?.name ?? 'Keep piece', x: at.x, z: at.z,
        batters: siteStands(site, sock.id) && siteGate(site, sock.id) !== 'open', ruin: !!site.ruined?.[sock.id],
      });
    }
  }
  return out;
}

/** The home raid settled now, if one runs with raiders standing (null if not): resolved, applied, its raiders gone from
 *  the field and its report set for the player — `away`, settled because the garrison fell while he was away. The raid
 *  director's next tick then ends it: beaten back, with its spoils (held or pressed), or lost (raidLost). */
export function settleRaid(st: GameState, away = false): RaidSettlement | null {
  const raiders = homeRaiders();
  if (!raidActive.current || !raiders.length) return null;
  const s = resolveRaid(raidField(st, raiders));
  // the stores: what the thieves took in the fight out, what the fallen dropped back in (kill.ts's way)
  const out: Goods = {};
  for (const [id, n] of Object.entries(s.taken)) out[id as ItemId] = -(n ?? 0);
  if (haulOf(s.taken)) st.addItems(out);
  if (haulOf(s.recovered)) { st.addItems(s.recovered, 'grant'); addGoods(raidHaul.recovered, s.recovered); }
  gotAway(st, s.stolen);
  if (s.ruined.length || s.razed.length) st.wreckPieces(s.ruined.map((p) => p.ref), s.razed.map((p) => p.ref));
  for (const id of s.downed) {
    const ds = defenderState[id];
    if (ds) Object.assign(ds, { hp: 0, state: 'downed', downedUntil: Date.now() + DOWNED_RECOVER_MS });
  }
  raidLost.current = s.outcome === 'lost';
  const gone = new Set(raiders);
  useEnemyStore.setState({ enemies: useEnemyStore.getState().enemies.filter((e) => !gone.has(e)) });
  // the defenders downed, in the roster's order: those the raiders knocked down in the fight so far (down still or up
  // again) and those the settling put down — away it is settled only once none stands: the first are all who fought
  const downed = st.villagers.filter((v) => homeGuard(v) && (raidDowned.has(v.id) || s.downed.includes(v.id))).map((v) => v.name);
  useGameStore.getState().setRaidReport({
    outcome: s.outcome, lost: { ...raidHaul.lost }, recovered: { ...raidHaul.recovered },
    ruined: s.ruined.map((p) => p.name), razed: s.razed.map((p) => p.name), downed, away, shown: false,
  });
  return s;
}

/** the raid report, opened once the player is at home with nothing else up — at once after a knock-out, which carries
 *  him home; on his return, for a raid settled while he was away (or on loading a save that kept it unread) */
useGameStore.subscribe((s) => {
  const r: RaidReport | null = s.raidReport;
  if (r && !r.shown && s.destination == null && s.panel === 'none' && !s.paused) s.showRaidReport();
});

// test hook (window.__kkraidsettle): what the home raid would settle to now, unapplied — the probes set it beside the
// same fight played out live
exposeDebug('__kkraidsettle', { forecast: () => resolveRaid(raidField(useGameStore.getState(), homeRaiders())) });
