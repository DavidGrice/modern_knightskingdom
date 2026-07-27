'use client';
// Live per-defender combat state, mirroring the raiderRam/carts leaf-module
// pattern (mutable, not zustand — this changes every frame during a raid and
// never needs to be persisted; only a defender's level/xp/loadout/station on
// the Villager record itself survives a save).
export interface DefenderState {
  x: number; z: number;
  postX: number; postY: number; postZ: number;
  elevated: boolean;
  hp: number; maxHp: number;
  state: 'ok' | 'downed';
  downedUntil: number; // Date.now() ms
  attackCd: number;
  hurtCd: number; // separate cooldown for taking retaliation damage
}

export const defenderState: Record<string, DefenderState> = {};

// Phase 24C — the captain's standing order, applied to ALL defenders at once
// (per-defender orders are a later refinement). Session-tactical state, not
// persisted: a reload rallies everyone back to their normal patrol.
export type DefenderOrder = 'patrol' | 'follow' | 'attack' | 'scout';
export const defenderOrders: { order: DefenderOrder; targetId: string | null } = {
  order: 'patrol',
  targetId: null,
};
// scout reports: enemy ids already called out, so each hostile is announced once
export const scoutReported = new Set<number>();

export function registerDefender(id: string, postX: number, postY: number, postZ: number): DefenderState {
  if (!defenderState[id]) {
    defenderState[id] = {
      x: postX, z: postZ, postX, postY, postZ, elevated: false,
      hp: 1, maxHp: 1, state: 'ok', downedUntil: 0, attackCd: 0, hurtCd: 0,
    };
  }
  return defenderState[id];
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkdefenders = defenderState;
  (window as unknown as Record<string, unknown>).__kkorders = defenderOrders;
}
