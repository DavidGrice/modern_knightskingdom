// Requested 2026-08-03: the endless mob arena logged to ROADMAP.md
// (2026-07-28) — a sealed pit with continuous spawns, an open-ended kill
// counter, and escalating difficulty, entered from the Travel Map like the
// Sealed Crypt (game/dungeon.ts) and Storm's Battle Dome
// (components/world/BattleDome.tsx) are.
//
// Leaf module, same pattern as dungeonState/difficultyState/workSignal: this
// is run-local, unsaved state written every frame by the combat loop and
// read one-directionally by the renderer/HUD — not folded into gameStore's
// persisted Zustand state, and deliberately NOT modeled as a SideQuestDef
// (game/data/npcs.ts) — that type's `need: number` assumes a fixed target,
// and this counter is explicitly open-ended ("never complete in the normal
// sense", per the ROADMAP entry this implements).

import type { ItemId } from './types';
import type { EnemyKind } from './data/enemies';
import { ARENA_ORIGIN, ARENA_RADIUS } from './data/worlds';
import { pick, randInt } from '@/lib/rng';
import { exposeDebug } from '@/lib/debugHooks';
import { ringPoint } from './spawnUtil';
import type { EnemyDeps } from './waveDefense';

export type ArenaEnvId = 'earth' | 'water' | 'snow' | 'lava';

interface ArenaEnv {
  id: ArenaEnvId;
  name: string;
  blurb: string;
  floorColor: string;
  wallColor: string;
  fogColor: string;
  playerSpeedMult: number;
  enemySpeedMult: number;
  playerStaminaDrainMult: number;
  /** flat HP/s chip damage while inside — 0 everywhere but lava */
  ambientDamagePerSec: number;
  /** gold/xp bonus applied to arena loot, offsetting a harsher environment */
  lootMult: number;
}

export const ARENA_ENVS: ArenaEnv[] = [
  {
    id: 'earth', name: 'The Earthen Ring', blurb: 'The baseline pit — no gimmicks.',
    floorColor: '#6b5a3d', wallColor: '#6b6b72', fogColor: '#c9c2a8',
    playerSpeedMult: 1, enemySpeedMult: 1, playerStaminaDrainMult: 1, ambientDamagePerSec: 0, lootMult: 1,
  },
  {
    id: 'water', name: 'The Flooded Ring', blurb: 'Waterlogged footing slows everyone down.',
    floorColor: '#3d6b7a', wallColor: '#4a5a63', fogColor: '#9fc2cc',
    playerSpeedMult: 0.85, enemySpeedMult: 0.9, playerStaminaDrainMult: 1.15, ambientDamagePerSec: 0, lootMult: 1.05,
  },
  {
    id: 'snow', name: 'The Frozen Ring', blurb: 'Poor footing, and worse visibility for foes at range.',
    floorColor: '#dfe6ea', wallColor: '#7a828c', fogColor: '#e8eef2',
    playerSpeedMult: 0.9, enemySpeedMult: 1, playerStaminaDrainMult: 1, ambientDamagePerSec: 0, lootMult: 1.1,
  },
  {
    id: 'lava', name: 'The Burning Ring', blurb: 'The ground itself hurts. The purses are heavier for it.',
    floorColor: '#3a2018', wallColor: '#5c2c1a', fogColor: '#3a1c10',
    playerSpeedMult: 1, enemySpeedMult: 1, playerStaminaDrainMult: 1, ambientDamagePerSec: 0.4, lootMult: 1.25,
  },
];

export const ARENA_ENV_BY_ID: Record<ArenaEnvId, ArenaEnv> =
  Object.fromEntries(ARENA_ENVS.map((e) => [e.id, e])) as Record<ArenaEnvId, ArenaEnv>;

export const ARENA_MILESTONES = [50, 100, 200, 500];

/** Wave 43 (A5) — a discrete "kill N more in T seconds" bonus, (re)rolled at
 *  every milestone crossing (see tickArena, below). Failing it is a no-op,
 *  not a punishment — same forgiving tone as the endless mode's own open-
 *  ended kill counter: it just quietly stops offering the bonus loot until
 *  the next milestone rolls a fresh one. */
interface ArenaObjective {
  startKills: number;
  need: number;
  deadline: number; // performance.now() timestamp
}
const ARENA_OBJECTIVE_KILLS = 10;
const ARENA_OBJECTIVE_TIME_MS = 30_000;

export const arenaState: {
  active: boolean;
  env: ArenaEnvId | null;
  kills: number;
  milestonesClaimed: number[];
  objective: ArenaObjective | null;
} = { active: false, env: null, kills: 0, milestonesClaimed: [], objective: null };

export function startArenaObjective() {
  arenaState.objective = {
    startKills: arenaState.kills,
    need: ARENA_OBJECTIVE_KILLS,
    deadline: performance.now() + ARENA_OBJECTIVE_TIME_MS,
  };
}

/** Rolls a different environment than the one currently active, so a
 *  mid-run mutator swap (tickArena, every milestone past the first)
 *  always actually changes something rather than sometimes re-rolling the
 *  same ring by chance. */
export function rollNextArenaEnv(exclude: ArenaEnvId): ArenaEnvId {
  const choices = ARENA_ENVS.filter((e) => e.id !== exclude);
  return pick(choices).id;
}

/** raidStrength() (the game's one already-tuned overall-progress curve)
 *  times a run-local escalation that climbs smoothly every 25 kills within
 *  this run, capped so a very long run stays winnable rather than becoming
 *  a wall. Multiplies EnemyData.scale at spawn (combat.ts), which already
 *  drives both max HP and attack damage together — see spawn()'s own
 *  scale computation. */
export function arenaSpawnScale(): number {
  const step = Math.floor(arenaState.kills / 25) * 0.12;
  return Math.min(1 + step, 3.0);
}

/** Milestone reward table — deliberately separate from combat.ts's own
 *  LOOT_TABLES (a per-enemy-kind table) so this never leaks into the normal
 *  overworld drop table, per the ROADMAP entry's own explicit ask. Skewed
 *  toward ammo and gold, not crafting materials — this is a combat-only
 *  destination, not a gathering one. */
interface ArenaLootEntry { item: ItemId; min: number; max: number; chance: number }
const ARENA_MILESTONE_LOOT: ArenaLootEntry[] = [
  { item: 'gold', min: 8, max: 20, chance: 1 },
  { item: 'arrow', min: 4, max: 10, chance: 0.6 },
  { item: 'bolt', min: 4, max: 10, chance: 0.6 },
];

/** Rolled once per milestone crossed, scaled by the active environment's
 *  own lootMult (higher for the harsher environments, offsetting their
 *  buffs/nerfs against the player). */
export function rollArenaMilestoneLoot(): Partial<Record<ItemId, number>> {
  const mult = ARENA_ENV_BY_ID[arenaState.env ?? 'earth'].lootMult;
  const out: Partial<Record<ItemId, number>> = {};
  for (const e of ARENA_MILESTONE_LOOT) {
    if (Math.random() >= e.chance) continue;
    const n = Math.round(randInt(e.min, e.max) * mult);
    if (n > 0) out[e.item] = (out[e.item] ?? 0) + n;
  }
  return out;
}

export function resetArenaRun(envId: ArenaEnvId) {
  arenaState.active = true;
  arenaState.env = envId;
  arenaState.kills = 0;
  arenaState.milestonesClaimed = [];
  arenaState.objective = null;
}

export function endArenaRun() {
  arenaState.active = false;
  arenaState.env = null;
  arenaState.objective = null;
}

// ---------------------------------------------------------------------------
// CLN-20 · the run's own rules — the continuous spawn loop and the milestone
// detection — moved here from ArenaSpawner.tsx's frame loop, beside the state
// they write. Still no store import (the game store imports this module): the
// frame's store snapshot and the enemy store are handed in by the component.

/** weighted over the same filler kinds a raid draws from — excludes
 *  cedric/storm, both tuned named-boss encounters (spawn()'s own existing
 *  exclusion reasoning, combat.ts). Wave 37 (A3 remainder) adds the caster
 *  and shielded elite at modest weights, same filler-tier footing as
 *  gilbert; siegeCrew is deliberately NOT included here — its own AI fires
 *  at `st.buildings`/`st.keep` (the player's real, un-instanced homestead),
 *  which would let an arena run batter the player's actual home from inside
 *  a different world entirely. It stays scoped to Cedric's War Party
 *  (CedricSiege.tsx), the one place that's guaranteed to be the same
 *  instance as the buildings it targets. */
const SPAWN_TABLE: { kind: EnemyKind; weight: number }[] = [
  { kind: 'skeleton', weight: 0.4 },
  { kind: 'bandit', weight: 0.3 },
  { kind: 'royal', weight: 0.12 },
  { kind: 'gilbert', weight: 0.08 },
  { kind: 'caster', weight: 0.06 },
  { kind: 'shieldedElite', weight: 0.04 },
];

function rollKind(): EnemyKind {
  const total = SPAWN_TABLE.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of SPAWN_TABLE) {
    if (r < e.weight) return e.kind;
    r -= e.weight;
  }
  return SPAWN_TABLE[0].kind;
}

const SPAWN_CHECK_INTERVAL = 1.2;
const BASE_TARGET = 3;
const MAX_TARGET = 8;

type Store = ReturnType<typeof import('./store/gameStore').useGameStore.getState>;
/** what a frame of the arena reads of the game store: ONE snapshot, taken by the component at the top of its frame */
export type ArenaTickStore = Pick<Store, 'destination' | 'paused' | 'addItems' | 'notify'>;
/** The spawn-check countdown. It belongs to ArenaSpawner (a ref, for the component's lifetime), NOT to arenaState:
 *  it starts at 0, is written only by `-= dt` and `= SPAWN_CHECK_INTERVAL`, and is never reset between runs — so
 *  a second run's first spawn comes wherever the last run left the countdown, and a remount checks at once. */
export interface ArenaRun { timer: number }

/** CLN-20 · one frame of the arena: ArenaSpawner's whole frame loop, gating included (not in the arena, or paused:
 *  nothing). `dt` is the RAW frame delta. The clock is read inline at the objective's expiry test, and only there
 *  (`startArenaObjective` reads it again for itself).
 *
 *  Order of `Math.random` draws, which a seeded stream sees: per milestone crossed — the loot roll, the champion's
 *  kind, the champion's angle, the spawn's own draws, then the next environment (every milestone but the first);
 *  then the objective's loot roll if it completes; then, at a spawn check under the cap, the filler's ANGLE and only
 *  after it the filler's kind (the reverse of the champion). The live count is read AFTER the milestone loop, so a
 *  champion walked in this frame counts toward the cap. */
export function tickArena(run: ArenaRun, st: ArenaTickStore, dt: number, deps: EnemyDeps) {
  const inArena = st.destination === 'arena' && arenaState.active;
  if (!inArena) return;
  if (st.paused) return;

  // milestone check — every frame while in the arena, cheap (4-entry
  // array, only ever grants once per threshold via milestonesClaimed)
  for (const m of ARENA_MILESTONES) {
    if (arenaState.kills < m || arenaState.milestonesClaimed.includes(m)) continue;
    arenaState.milestonesClaimed.push(m);
    const drop = rollArenaMilestoneLoot();
    st.addItems(drop, 'grant');
    st.notify(`${m} kills! The arena rewards you.`, true);

    // Wave 43 (A5) · mini-boss — one champion-tier spawn per milestone,
    // credited/cleaned up exactly like every other arena mob (`arena: true`,
    // no new flag). shieldedElite/royal are both already filler-tier
    // arena spawns (SPAWN_TABLE above) at modest weight; here one is
    // guaranteed and scaled up, so a milestone always feels like a real
    // spike rather than just another loot roll.
    const bossKind: EnemyKind = Math.random() < 0.5 ? 'shieldedElite' : 'royal';
    const bossAt = ringPoint(ARENA_ORIGIN.x, ARENA_ORIGIN.z, ARENA_RADIUS * 0.5);
    deps.spawn(
      bossKind,
      bossAt.x,
      bossAt.z,
      false, undefined, false, false,
      arenaSpawnScale() * 1.6, true,
    );
    st.notify('A champion enters the ring!', true);

    // bonus objective — (re)rolled at every milestone
    startArenaObjective();

    // mid-run mutator swap — every milestone EXCEPT the first respects
    // the player's own entry choice for their opening 50 kills, then
    // starts reshuffling the ring underneath them. ArenaScene.tsx polls
    // arenaState.env itself, so this swap is visible the moment it lands.
    if (m !== ARENA_MILESTONES[0]) {
      arenaState.env = rollNextArenaEnv(arenaState.env ?? 'earth');
      st.notify(`The ring shifts — welcome to ${ARENA_ENV_BY_ID[arenaState.env].name}!`, true);
    }
  }

  // bonus-objective resolution — outside the milestone loop since it must
  // keep ticking (and can expire) on frames no milestone is crossed
  const obj = arenaState.objective;
  if (obj) {
    if (arenaState.kills - obj.startKills >= obj.need) {
      arenaState.objective = null;
      const drop = rollArenaMilestoneLoot();
      st.addItems(drop, 'grant');
      st.notify('Bonus objective complete! The arena rewards you further.', true);
    } else if (performance.now() >= obj.deadline) {
      // a redo, not a punishment — same forgiving tone as a missed
      // milestone: it just quietly stops offering this bonus
      arenaState.objective = null;
    }
  }

  run.timer -= dt;
  if (run.timer > 0) return;
  run.timer = SPAWN_CHECK_INTERVAL;

  const target = Math.min(BASE_TARGET + Math.floor(arenaState.milestonesClaimed.length / 2), MAX_TARGET);
  const live = deps.enemies().filter((e) => e.arena).length;
  if (live >= target) return;

  // the angle first, the kind after it: rollKind() is evaluated as the spawn
  // call's own argument, after the point is known — as it always was
  const at = ringPoint(ARENA_ORIGIN.x, ARENA_ORIGIN.z, ARENA_RADIUS * 0.85);
  deps.spawn(rollKind(), at.x, at.z, false, undefined, false, false, arenaSpawnScale(), true);
}

exposeDebug('__kkarena', arenaState);
