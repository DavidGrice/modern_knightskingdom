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

export type ArenaEnvId = 'earth' | 'water' | 'snow' | 'lava';

export interface ArenaEnv {
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

export const arenaState: {
  active: boolean;
  env: ArenaEnvId | null;
  kills: number;
  milestonesClaimed: number[];
} = { active: false, env: null, kills: 0, milestonesClaimed: [] };

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
    const n = Math.round((e.min + Math.floor(Math.random() * (e.max - e.min + 1))) * mult);
    if (n > 0) out[e.item] = (out[e.item] ?? 0) + n;
  }
  return out;
}

export function resetArenaRun(envId: ArenaEnvId) {
  arenaState.active = true;
  arenaState.env = envId;
  arenaState.kills = 0;
  arenaState.milestonesClaimed = [];
}

export function endArenaRun() {
  arenaState.active = false;
  arenaState.env = null;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkarena = arenaState;
}
