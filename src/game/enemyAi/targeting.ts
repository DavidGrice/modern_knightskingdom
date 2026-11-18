// CLN-13 · what an enemy has to fight, looked for every frame in this order (step.ts's chain then takes the first that
// holds): the player, a finished piece of the keep it is up against, the nearest sworn guard, Tam, the nearest
// villager who chose to fight, and — for a crossbow — which of them it has a clear shot at; up on a wall-walk, the
// guard posted to the same one. And (wave 69) for a raider with no way to his mark inside the keep's walls, the piece
// of them he makes for instead (siegeWay) — G-03: or out of them, or behind the player's own walls and gates. G-06 · a
// thief's mark is the homestead's nearest store (storeFor), ahead of every other — he comes to strip it, not to fight —
// and behind only a piece he has to batter through to it, as any raider's mark is.
import type { EnemyData } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { findPath, getNavGrid, hasLineOfSight, navBlocked, navReachable, GROUND_LOS_Y, HOME_NAV_CELLS } from '@/game/navgrid';
import { KEEP_PART_BY_ID } from '@/game/data/keep';
import { BUILDABLE_BY_ID, sizeFor } from '@/game/data/buildables';
import { isBuilt, isDoorLike, isHomeBuilding, type PlacedBuilding } from '@/game/types';
import { HOME_X, HOME_Z } from '@/game/data/villagers';
import { nearestStore } from '@/game/storage';
import { isRampart } from '@/game/walls';
import {
  KEEP_SITE_ID, siteById, siteCovers, siteGate, siteSocketGap, siteSocketOutside, siteSocketWorld, siteSockets, siteStands,
} from '@/game/sites/sites';
import { defenderState, type DefenderState } from '@/game/defenders';
import { villagerCombatState } from '@/game/villagerCombat';
import { companionCombatState } from '@/game/companion';
import { COMPANION_ID } from '@/game/data/companion';
import { villagerMobs } from '@/game/villagerMobs';
import { peekCombatState } from '@/ai/actions/combatState';
import { agentManager } from '@/ai/core/AgentManager';
import { aimFor } from '@/game/combat/sightline';
import { RANGED_RANGE } from './engage';
import type { Mob } from './frame';

export function distToPlayer(x: number, z: number) {
  return Math.hypot(playerState.x - x, playerState.z - z);
}

/** a piece within reach: its socket — a piece of the keep — or (G-03) its building's id, one of the player's own walls
 *  or gates; where it stands, and what it is called */
export interface KeepPiece { socketId?: string; buildingId?: string; x: number; z: number; name: string }
/** a guard found: his record (null: none), his villager id, and how far off he is (Infinity: none) */
export interface GuardFound { target: DefenderState | null; id: string; d: number }
/** which one an enemy goes for — markFor's pick (a crossbow's after its sightlines are weighed); G-06 · 'store', a
 *  thief's */
export type Mark = 'def' | 'companion' | 'villager' | 'player' | 'store';
/** G-06 · a store a thief makes for: where it stands, and how far off its footprint (or, with no store, home's middle)
 *  he is */
export interface StoreFound { x: number; z: number; d: number }

/** G-02 · how near the ground a keep piece covers a raider comes to batter it: up against it — he is put back out 0.5 m
 *  from its face (movement.ts's stopAtKeepWalls), and a siege way brings him to SIEGE_STAND from it — but not walking
 *  past it on a way round, which the grid keeps a metre and more off */
const KEEP_REACH = 0.8;
/** G-02 · how far from a keep piece's face a raider with no way in makes for, to batter it */
const SIEGE_STAND = 0.6;
/** G-02 · how many pieces a raider with no way to his mark tries a way to, each time he works out a route: the keep's
 *  shut gatehouse, then (G-03) a shut gate of the player's, then the nearest */
export const SIEGE_RETARGETS = 2;
/** G-03 · how far out from a face of one of the player's pieces the grid is asked whose side it is: past the cells it
 *  blocks round the piece (AGENT_RADIUS, and the cell that reaches) */
const SIDE_PROBE = 1.6;

/** G-03 · one of the player's own pieces a raider shut out batters: a wall (walls.ts's isRampart — tall enough to seal)
 *  or a gate standing shut, finished, at home — never a gate standing open, which is the way through */
function batterable(st: Pick<GameState, 'gateOpen'>, b: PlacedBuilding): boolean {
  return isHomeBuilding(b) && isBuilt(b) && isRampart(b.type) && !(isDoorLike(b.type) && (st.gateOpen[b.id] ?? true));
}

/** G-03 · the ground `gap` out from each face of one of the player's pieces (its footprint as sizeFor has it, turned
 *  by quarters only): east, west, south, north */
function facesOf(b: PlacedBuilding, gap: number): { x: number; z: number }[] {
  const [sx, sz] = sizeFor(b.type, b.rot);
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ux, uz]) => ({ x: b.x + ux * (sx / 2 + gap), z: b.z + uz * (sz / 2 + gap) }));
}

export function keepInReach(data: EnemyData, st: GameState, enemyAtHome: boolean): { target: KeepPiece | null; d: number } {
  const m = data.mob;
  // J51 follow-up: a raid mob that ends up next to a FINISHED keep piece
  // batters it instead of walking through as if it were not there —
  // proximity only (this is not a chase target the way a defender is — a
  // raider only ever notices one he has come right up against; siegeWay
  // below is how one with no way in comes up against one).
  // Ordinary night skeletons are not raiders and leave the castle alone.
  // Wave 69 (G-02): measured to the ground the piece covers, not to its
  // middle — the walls stop him now, and a run is 8 m long — and never a
  // gatehouse standing open, which is the way in, not a thing to batter.
  // And battered only by a raider shut out (step.ts: his route a siege
  // way): one with a way in, through the gate or a breach, takes it — the
  // walls stopping him, he brushed every one on his way round.
  let keepTarget: KeepPiece | null = null;
  let keepD = Infinity;
  const site = data.raid && enemyAtHome ? siteById(st, KEEP_SITE_ID) : null;
  if (site) {
    for (const sock of siteSockets(site)) {
      if (!siteStands(site, sock.id) || siteGate(site, sock.id) === 'open') continue;
      const dd = siteSocketGap(site, sock.id, m.x, m.z);
      if (dd < KEEP_REACH && dd < keepD) {
        const at = siteSocketWorld(site, sock.id)!;
        keepD = dd;
        keepTarget = { socketId: sock.id, x: at.x, z: at.z, name: KEEP_PART_BY_ID[site.parts[sock.id]]?.name ?? 'the castle' };
      }
    }
  }
  // G-03 · and the player's own walls and gates (siegeWay brings him up against one, behind which his mark stands),
  // measured to the ground each covers as the keep's pieces are
  if (data.raid && enemyAtHome) {
    for (const b of st.buildings) {
      if (!batterable(st, b)) continue;
      const [sx, sz] = sizeFor(b.type, b.rot);
      const dd = Math.hypot(Math.max(0, Math.abs(m.x - b.x) - sx / 2), Math.max(0, Math.abs(m.z - b.z) - sz / 2));
      if (dd < KEEP_REACH && dd < keepD) {
        keepD = dd;
        keepTarget = { buildingId: b.id, x: b.x, z: b.z, name: BUILDABLE_BY_ID[b.type]?.name ?? 'the wall' };
      }
    }
  }
  return { target: keepTarget, d: keepD };
}

/** G-06 · A thief's mark: the nearest store standing at home (storage.ts's nearestStore) — or, with none standing, home's
 *  middle, where the villagers carry their hauls when there is no store (Villagers.tsx) and the goods lie about the
 *  hearth (storage.ts's BASE_STORAGE_PER_GOOD) — the ground about it he takes from (hearthFor); measured to the ground
 *  the store covers. Null for any but a thief at home who has not yet run. */
export function storeFor(data: EnemyData, st: Pick<GameState, 'buildings'>, enemyAtHome: boolean): StoreFound | null {
  const m = data.mob;
  if (!data.thief || !data.raid || !enemyAtHome || m.fleeing) return null;
  const b = nearestStore(st.buildings, m.x, m.z, isHomeBuilding);
  if (!b) {
    const at = hearthFor(m.x, m.z);
    return { x: at.x, z: at.z, d: Math.hypot(m.x - at.x, m.z - at.z) };
  }
  const [sx, sz] = sizeFor(b.type, b.rot);
  return { x: b.x, z: b.z, d: Math.hypot(Math.max(0, Math.abs(m.x - b.x) - sx / 2), Math.max(0, Math.abs(m.z - b.z) - sz / 2)) };
}

/** the cells about home's middle (in cells, from it), nearest first — hearthFor's search */
const HEARTH_CELLS: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let i = -7; i <= 6; i++) for (let j = -7; j <= 6; j++) out.push([i + 0.5, j + 0.5]);
  return out.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
})();

/** G-06 · Where a thief at (x, z) takes the goods from with no store standing: home's middle — or, with the player
 *  having built over it, the open ground about it nearest it that he can get to, and only with none such the open
 *  ground nearest it at all (where the grid's way to the point ends; he batters his way to it). A keep's wall or
 *  corner over the point stops him half a metre off its face, out of reach of the point itself, while the grid's way
 *  ends beside it and navReachable says yes — he stood there for good, and the raid with him; and the nearest open
 *  ground by the grid's scan could lie inside a shut ring when as near lay outside it, where he had no wall to batter.
 *  (Before merging wave 71.) */
function hearthFor(x: number, z: number): { x: number; z: number } {
  if (!navBlocked(HOME_X, HOME_Z)) return { x: HOME_X, z: HOME_Z };
  const grid = getNavGrid(null);
  for (const [i, j] of HEARTH_CELLS) {
    const at = grid.nearestWalkable(HOME_X + i * grid.cellSize, HOME_Z + j * grid.cellSize, 0);
    if (at && navReachable(x, z, at.x, at.z)) return at;
  }
  return grid.nearestWalkable(HOME_X, HOME_Z) ?? { x: HOME_X, z: HOME_Z };
}

/** G-02 · whether (x, z) stands inside the home keep's ring (on its plate), where a raider closes in on his mark by a
 *  way round its walls (makePathStep), never straight at it through them */
export function insideKeep(st: Pick<GameState, 'keep' | 'sites'>, x: number, z: number): boolean {
  const site = siteById(st, KEEP_SITE_ID);
  return !!site && siteCovers(site, x, z);
}

/** G-02 · the way a raider at (x, z) takes when he has none to his mark at (tx, tz) (the grid's word: navReachable):
 *  to the ground beside a piece he can batter through to it — the keep's gatehouse standing shut, if the keep's walls
 *  stand between them; else (G-03) a shut gate of the player's own; else the nearest piece that stands between them
 *  — a way to at most SIEGE_RETARGETS of them tried, in that order, of those he has a way to; with a way to none,
 *  straight at the nearest. There keepInReach has him batter it, and a breach, or the gate opened, gives him his way.
 *  Between them, for the keep: one of the two inside its ring and the other not — he shut out (on his side of each
 *  piece, outside it), or (G-03) shut in, the gatehouse shut behind him (inside it: siegeWay planned only inward, and
 *  one shut in stood pressed against the stone for good). For one of the player's pieces, the grid's word again: a face
 *  of it he has a way to, and one he has not, which his mark has; and after every such piece, one whose far face only
 *  he has no way to — the outer of two rings, his mark in the inner (a ring of the player's round the keep): G-06, its
 *  far side on the straight line between them, never a pen off to one side. Null when no piece stands in his way. */
/** G-06 · a point of open ground on the straight line from (ax, az) to (bx, bz) for each stretch of it between what
 *  stands across it (the grid's cells, every half metre): one in each part of the grid the line runs through */
function stretchesBetween(ax: number, az: number, bx: number, bz: number): { x: number; z: number }[] {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * 2));
  const out: { x: number; z: number }[] = [];
  let open = false;
  for (let k = 0; k <= n; k++) {
    const x = ax + ((bx - ax) * k) / n;
    const z = az + ((bz - az) * k) / n;
    const shut = navBlocked(x, z);
    if (!shut && !open) out.push({ x, z });
    open = !shut;
  }
  return out;
}

export function siegeWay(
  st: Pick<GameState, 'keep' | 'sites' | 'buildings' | 'gateOpen'>, x: number, z: number, tx: number, tz: number,
): { x: number; z: number }[] | null {
  const away = (at: { x: number; z: number }) => Math.hypot(at.x - x, at.z - z);
  // each piece he could batter through: `to`, his mark is on its far side; `rank`, 0 the keep's gatehouse shut, 1 a gate
  // of the player's shut, 2 the rest; `at`, the ground he batters it from
  const pieces: { to: boolean; rank: number; at: { x: number; z: number } }[] = [];
  const site = siteById(st, KEEP_SITE_ID);
  const shutIn = !!site && siteCovers(site, x, z);
  if (site && shutIn !== siteCovers(site, tx, tz)) {
    for (const sock of siteSockets(site)) {
      if (sock.kind === 'centre' || !siteStands(site, sock.id) || siteGate(site, sock.id) === 'open') continue;
      pieces.push({ to: true, rank: siteGate(site, sock.id) === 'shut' ? 0 : 2, at: siteSocketOutside(site, sock.id, SIEGE_STAND, shutIn)! });
    }
  }
  // G-06 · the ground between his mark and him, a point for each stretch of it (made when first asked for)
  let between: { x: number; z: number }[] | null = null;
  for (const b of st.buildings) {
    if (!batterable(st, b)) continue;
    const probes = facesOf(b, SIDE_PROBE);
    const mine = probes.map((p) => !navBlocked(p.x, p.z) && navReachable(x, z, p.x, p.z));
    const far = probes.filter((p, k) => !mine[k] && !navBlocked(p.x, p.z));
    if (!mine.includes(true) || !far.length) continue;
    const to = far.some((p) => navReachable(tx, tz, p.x, p.z));
    // G-06 · and its far side his mark's, or on the way from his mark to him (the outer of two rings round it): a pen
    // of the player's off to one side was battered by a raider whose mark was out of reach for another reason
    if (!to) {
      between ??= stretchesBetween(tx, tz, x, z);
      if (!far.some((p) => between!.some((q) => navReachable(q.x, q.z, p.x, p.z)))) continue;
    }
    pieces.push({
      to,
      rank: isDoorLike(b.type) ? 1 : 2,
      at: facesOf(b, SIEGE_STAND).filter((_, k) => mine[k]).reduce((p, q) => (away(q) < away(p) ? q : p)),
    });
  }
  if (!pieces.length) return null;
  const tried = pieces.filter((p) => navReachable(x, z, p.at.x, p.at.z))
    .sort((a, b) => Number(b.to) - Number(a.to) || a.rank - b.rank || away(a.at) - away(b.at));
  for (const { at } of tried.slice(0, SIEGE_RETARGETS)) {
    const way = findPath(x, z, at.x, at.z, HOME_NAV_CELLS);
    if (way) return [...way, at];
  }
  const toward = pieces.some((p) => p.to) ? pieces.filter((p) => p.to) : pieces;
  return [toward.reduce((a, b) => (away(b.at) < away(a.at) ? b : a)).at];
}

export function nearestGuard(data: EnemyData, enemyAtHome: boolean): GuardFound {
  const m = data.mob;
  // homestead skirmish lines (AI wave 2): if a sworn defender stands
  // closer than the player, fight THEM — raids and night hunts become
  // real defender-vs-mob battles instead of everything beelining the
  // player. Tower-elevated defenders are out of ground reach (that's the
  // point of the tower) and Storm duels stay strictly player-vs-Storm.
  let defTarget: DefenderState | null = null;
  let defId = '';
  let defD = Infinity;
  if (enemyAtHome && data.kind !== 'storm') {
    for (const [vid, dsd] of Object.entries(defenderState)) {
      if (dsd.state === 'downed' || dsd.elevated) continue;
      const dd = Math.hypot(dsd.x - m.x, dsd.z - m.z);
      if (dd < 16 && dd < defD) { defD = dd; defTarget = dsd; defId = vid; }
    }
  }
  return { target: defTarget, id: defId, d: defD };
}

export function tamInReach(data: EnemyData): { target: { x: number; z: number } | null; d: number } {
  const m = data.mob;
  // Wave 25: Tam, the companion squire, is a real, always-postured
  // combat target — a rung below a sworn defender but a real target
  // BEFORE an incidental villager (placed between defTarget and
  // villagerTarget below), matching the plan's own capability ordering.
  // Unlike villagerTarget's stricter "only once already fighting" rule,
  // this uses defTarget's own "always valid while not downed" one — Tam
  // is combat-postured at all times (assist_leader's own `is_companion`
  // gate has no courage/proximity check to wait on), not an incidental
  // farmer who happened to pick a fight. Deliberately NOT gated on
  // enemyAtHome (Tam follows the player everywhere,
  // ai/sync/companionSync.ts) — gated instead on this mob's own world
  // matching Tam's own current region, the same per-instance isolation
  // `data.world` already enforces for every other check in this file.
  let companionTarget: { x: number; z: number } | null = null;
  let companionD = Infinity;
  if (data.kind !== 'storm') {
    const tam = agentManager.get(COMPANION_ID);
    const ccs = companionCombatState[COMPANION_ID];
    if (tam && ccs && ccs.state !== 'downed' && (data.world ?? null) === (tam.region ?? null)) {
      const dd = Math.hypot(tam.position.x - m.x, tam.position.z - m.z);
      if (dd < 16) { companionD = dd; companionTarget = { x: tam.position.x, z: tam.position.z }; }
    }
  }
  return { target: companionTarget, d: companionD };
}

export function nearestFighter(data: EnemyData, enemyAtHome: boolean): { target: { id: string; x: number; z: number } | null; d: number } {
  const m = data.mob;
  // Wave 21: an ORDINARY villager who has already chosen (via the AI
  // reasoner's own `engage_threat_villager`) to fight becomes a valid
  // raider target too — one rung below a sworn defender, same shape as
  // the defTarget loop just above. `peekCombatState(...).mode === 'engage'`
  // is the gate that matters: someone merely fleeing/working/hiding
  // stays untouchable exactly as before this wave, and the check is a
  // read-only peek (never creates an entry) so scanning every villager
  // here on every enemy's frame cannot itself populate that map.
  // Position comes from `villagerMobs` (the same live x/z Villagers.tsx
  // itself writes every frame), since villagerCombatState only tracks
  // HP/downed, not where the villager actually stands.
  let villagerTarget: { id: string; x: number; z: number } | null = null;
  let villagerD = Infinity;
  if (enemyAtHome && data.kind !== 'storm') {
    for (const [vid, vcs] of Object.entries(villagerCombatState)) {
      if (vcs.state === 'downed' || peekCombatState(vid)?.mode !== 'engage') continue;
      const vm = villagerMobs[vid];
      if (!vm) continue;
      const dd = Math.hypot(vm.x - m.x, vm.z - m.z);
      if (dd < 16 && dd < villagerD) { villagerD = dd; villagerTarget = { id: vid, x: vm.x, z: vm.z }; }
    }
  }
  return { target: villagerTarget, d: villagerD };
}

/** The mark: for a thief, his store (G-06: storeFor); else the first of a guard, Tam and a villager — in that order, not
 *  the nearest of them — who stands closer than the player, else the player (`d`); and, for a crossbow, whether its
 *  shot is blocked. A
 *  crossbow bolt lands only on a clear sightline. A raider whose mark — a guard, Tam, a villager or the player, as the
 *  chain picks — stands in range behind something turns to the nearest of them in range he can see, and with none
 *  closes in on his mark by a path round what stands between them, until he can see it; he used to stand there for
 *  good, and a guard with a bow behind a wall from him did the same (game/combat/sightline.ts). */
export function markFor(
  data: EnemyData, d: number,
  guard: GuardFound,
  tam: { target: { x: number; z: number } | null; d: number },
  fighter: { target: { id: string; x: number; z: number } | null; d: number },
  store: StoreFound | null = null,
): { mark: Mark; blocked: boolean } {
  const m = data.mob;
  // G-06 · a thief makes for the stores, whoever stands nearer — struck, he runs (step.ts)
  if (store) return { mark: 'store', blocked: false };
  let mark: Mark = guard.target && guard.d < d ? 'def'
    : tam.target && tam.d < d ? 'companion'
    : fighter.target && fighter.d < d ? 'villager' : 'player';
  let blocked = false;
  if (data.ranged) {
    const at = { def: guard.target, companion: tam.target, villager: fighter.target, player: null };
    const away = { def: guard.d, companion: tam.d, villager: fighter.d, player: d };
    ({ target: mark, blocked } = aimFor(
      mark, (['def', 'companion', 'villager', 'player'] as const).filter((k) => k === 'player' || at[k]),
      (k) => away[k], RANGED_RANGE,
      (k) => {
        const p = at[k];
        return p ? hasLineOfSight(m.x, GROUND_LOS_Y, m.z, p.x, GROUND_LOS_Y, p.z, data.world ?? null)
          : hasLineOfSight(m.x, GROUND_LOS_Y, m.z, playerState.x, playerState.y, playerState.z, data.world ?? null);
      },
    ));
  }
  return { mark, blocked };
}

export function guardOnMyWall(m: Mob, st: GameState): GuardFound {
  // Wave 58 (H4) addendum #2: the elevated-raider targeting carve-out —
  // resolved fresh every frame from the SAME derivation Defenders.tsx
  // itself uses for a keep-wall station (`stationId === "keep:<id>"`,
  // confirmed Defenders.tsx ~line 96), matched to the SAME socket this
  // raider actually climbed (m.ladderSocketId) — never every
  // `elevated: true` entry in defenderState, which could be a totally
  // different, unreachable wall. This is a filter at the point an
  // elevated raider selects its own target, NOT a change to the
  // ground-raider guard exclusion (nearestGuard, above), which stays
  // byte-for-byte unchanged.
  let wallDefTarget: DefenderState | null = null;
  let wallDefId = '';
  let wallDefD = Infinity;
  if (m.elevated && m.ladderSocketId) {
    const wantStation = 'keep:' + m.ladderSocketId;
    for (const v of st.villagers) {
      if (v.stationId !== wantStation) continue;
      const dsd = defenderState[v.id];
      if (!dsd || dsd.state === 'downed') continue;
      const dd = Math.hypot(dsd.x - m.x, dsd.z - m.z);
      if (dd < wallDefD) { wallDefD = dd; wallDefTarget = dsd; wallDefId = v.id; }
    }
  }
  return { target: wallDefTarget, id: wallDefId, d: wallDefD };
}
