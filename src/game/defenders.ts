'use client';
// Live per-defender combat state, mirroring the raiderRam/carts leaf-module
// pattern (mutable, not zustand — this changes every frame during a raid and
// never needs to be persisted; only a defender's level/xp/loadout/station on
// the Villager record itself survives a save).
import { attrsOf } from './data/attributes';
import { hasTrait } from './data/companionTraits';
import type { Villager } from './types';

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

/** What one swing from this defender takes off a raider.
 *
 *  Extracted here (Wave 11, phase 7) from the inline expression that lived in
 *  `Defenders.tsx`'s own attack branch, unchanged term for term — the AI
 *  reasoner's `engage_threat` action (`src/ai/actions/engageThreat.ts`) needs
 *  the SAME number, and NPC_AI_SPEC §0.2's "one arbiter" argument applies to a
 *  damage formula as much as to a decision: two copies of this would drift the
 *  first time Courage or a trait was retuned, and the divergence would show up
 *  as "defenders hit differently depending on which system happens to be
 *  driving them", which is close to unfindable.
 *
 *  A bare-handed defender (`loadout` undefined — the Armory rework's default)
 *  hits at the weaker fists tier on purpose; Courage (data/attributes.ts) and
 *  the Riposte companion trait each add their own steel. Lives in this leaf
 *  module rather than in `Defenders.tsx` so both callers can reach it without
 *  either importing a React component. */
export function defenderStrike(v: Villager): number {
  const level = v.level ?? 1;
  const meleeBase = v.loadout ? 3 : 1;
  return (v.loadout === 'bow' ? 2 : meleeBase) + level
    + Math.floor((attrsOf(v.id).courage - 5) / 3)
    + (hasTrait(v, 'def_riposte') ? 1 : 0);
}

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
