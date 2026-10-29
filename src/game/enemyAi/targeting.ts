// CLN-13 · what an enemy has to fight, looked for every frame in this order (step.ts's chain then takes the first that
// holds): the player, a finished piece of the keep it is up against, the nearest sworn guard, Tam, the nearest
// villager who chose to fight, and — for a crossbow — which of them it has a clear shot at; up on a wall-walk, the
// guard posted to the same one.
import type { EnemyData } from '@/game/combat';
import type { GameState } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { hasLineOfSight, GROUND_LOS_Y } from '@/game/navgrid';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
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

/** a piece of the keep within reach: its socket, where it stands, and what it is called */
export interface KeepPiece { socketId: string; x: number; z: number; name: string }
/** a guard found: his record (null: none), his villager id, and how far off he is (Infinity: none) */
export interface GuardFound { target: DefenderState | null; id: string; d: number }
/** which one an enemy goes for — markFor's pick (a crossbow's after its sightlines are weighed) */
export type Mark = 'def' | 'companion' | 'villager' | 'player';

export function keepInReach(data: EnemyData, st: GameState, enemyAtHome: boolean): { target: KeepPiece | null; d: number } {
  const m = data.mob;
  // J51 follow-up: a raid mob that ends up next to a FINISHED keep piece
  // batters it instead of walking through as if it were not there —
  // proximity only (the keep has no collision volumes of its own yet, so
  // this is not a chase target the way a defender is — a raider only
  // ever notices one it has already wandered/chased right up against).
  // Ordinary night skeletons are not raiders and leave the castle alone.
  let keepTarget: KeepPiece | null = null;
  let keepD = Infinity;
  if (data.raid && enemyAtHome && st.keep) {
    for (const sock of KEEP_SOCKETS) {
      const partId = st.keep.parts[sock.id];
      if (!partId || (st.keep.built[sock.id] ?? 0) < 1) continue;
      const wx = st.keep.x + sock.x;
      const wz = st.keep.z + sock.z;
      const dd = Math.hypot(wx - m.x, wz - m.z);
      if (dd < 3.4 && dd < keepD) {
        keepD = dd;
        keepTarget = { socketId: sock.id, x: wx, z: wz, name: KEEP_PART_BY_ID[partId]?.name ?? 'the castle' };
      }
    }
  }
  return { target: keepTarget, d: keepD };
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

/** The mark: the first of a guard, Tam and a villager — in that order, not the nearest of them — who stands closer
 *  than the player, else the player (`d`); and, for a crossbow, whether its shot is blocked. A
 *  crossbow bolt lands only on a clear sightline. A raider whose mark — a guard, Tam, a villager or the player, as the
 *  chain picks — stands in range behind something turns to the nearest of them in range he can see, and with none
 *  closes in on his mark by a path round what stands between them, until he can see it; he used to stand there for
 *  good, and a guard with a bow behind a wall from him did the same (game/combat/sightline.ts). */
export function markFor(
  data: EnemyData, d: number,
  guard: GuardFound,
  tam: { target: { x: number; z: number } | null; d: number },
  fighter: { target: { id: string; x: number; z: number } | null; d: number },
): { mark: Mark; blocked: boolean } {
  const m = data.mob;
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
