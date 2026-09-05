'use client';
// Wave 39 (A4) · transient staging for "Begin New Game+" — same
// module-singleton convention as arena.ts's arenaState / difficulty.ts's
// difficultyState / riding.ts's stabledHorses: this is UI-flow scratch state
// that lives for exactly the hop from MainMenu.tsx to CharacterCreator.tsx,
// never persisted and never read by anything else, so it has no business
// inside Zustand or SaveGame.
//
// MainMenu.tsx stages the carry the instant the player confirms starting
// NG+ (after the same overwrite-confirm guard startNew() already uses), then
// pushes 'create'. CharacterCreator.tsx consumes (and clears) it exactly
// once, via a lazy useState initializer on mount — so a stray back-
// navigation into 'create' without going through that button can never
// resurrect stale data and silently carry it into an ordinary new run.
import type { SkillId } from './types';

export interface NgPlusCarry {
  xp: Record<SkillId, number>;
  skillTree: string[];
}

let pending: NgPlusCarry | null = null;

export function stageNewGamePlus(carry: NgPlusCarry) {
  pending = carry;
}

export function consumeNewGamePlus(): NgPlusCarry | null {
  const p = pending;
  pending = null;
  return p;
}
