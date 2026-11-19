'use client';
// Live per-defender combat state, mirroring the raiderRam/carts leaf-module
// pattern (mutable, not zustand — this changes every frame during a raid and
// never needs to be persisted; only a defender's level/xp/loadout/station on
// the Villager record itself survives a save).
import { attrsOf } from './data/attributes';
import { hasTrait } from './data/companionTraits';
import { chestplateHp } from './data/armor';
import { meleeTierBonus } from './data/melee';
import { LOADOUT_WEAPON } from './data/villagers';
import type { Villager } from './types';
import { exposeDebug } from '@/lib/debugHooks';

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

/** Real time knocked out before returning to the fight. Shared by a downed
 *  defender (this file, via game/enemyAi/blows.ts's own `guard.downedUntil` write)
 *  and, as of Wave 21, a downed ordinary villager (game/villagerCombat.ts) —
 *  one number instead of two duplicated literals. Extracted from
 *  Defenders.tsx's own local `RECOVER_MS`, which turned out to be dead code
 *  (never referenced — `Enemies.tsx`'s `defTarget.downedUntil = Date.now() +
 *  45000` was always the one place this actually mattered) found and folded
 *  in while building this wave. */
export const DOWNED_RECOVER_MS = 45000;

// Phase 24C — the captain's standing order, applied to ALL defenders at once.
// Wave 23 — per-defender overrides on top (`overrides`): the fleet order
// stays the default every defender answers to, but any one of them can be
// dedicated to their own standing order via the roster (VillagersPanel),
// which wins for that defender until cleared. Session-tactical state, not
// persisted: a reload rallies everyone back to their normal patrol.
// G-08 · 'rally': hold the point the player planted (`rally`, game/rally.ts) and fight what comes within reach of it.
export type DefenderOrder = 'patrol' | 'follow' | 'attack' | 'scout' | 'rally';
export const defenderOrders: {
  order: DefenderOrder; targetId: string | null; overrides: Record<string, DefenderOrder>;
  /** the rally point, planted at the player's look point with the order (data/defenderOrders.ts); null until then */
  rally: { x: number; z: number } | null;
} = {
  order: 'patrol',
  targetId: null,
  overrides: {},
  rally: null,
};

/** The order this specific defender actually obeys: their own roster
 *  override if one is set, else the fleet's standing (radial) order. The
 *  one place both Defenders.tsx and the HUD chip should read from — reading
 *  `defenderOrders.order` directly would skip a defender's override. */
export function orderFor(villagerId: string): DefenderOrder {
  return defenderOrders.overrides[villagerId] ?? defenderOrders.order;
}
// scout reports: enemy ids already called out, so each hostile is announced once
export const scoutReported = new Set<number>();

/** G-08 · the courage of the garrison, scaling every defender's blow: neutral (1.0) until G-21's morale drives it */
export const COURAGE_NEUTRAL = 1;

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
 *  either importing a React component.
 *
 *  G-08 · a forged, crested or legendary weapon adds what that tier adds to the player's own blow (data/melee.ts's
 *  meleeTierBonus: a Forged Sword +0.5, a Legendary Halberd +2.25), and the garrison's `courage` (COURAGE_NEUTRAL
 *  until G-21) scales the whole blow. How every term stacks is said once, at garrisonBalance.ts's head. */
export function defenderStrike(v: Villager, courage = COURAGE_NEUTRAL): number {
  const level = v.level ?? 1;
  const meleeBase = v.loadout ? 3 : 1;
  const weapon = v.loadout ? LOADOUT_WEAPON[v.loadout] : undefined;
  return ((v.loadout === 'bow' ? 2 : meleeBase) + level
    + Math.floor((attrsOf(v.id).courage - 5) / 3)
    + (hasTrait(v, 'def_riposte') ? 1 : 0)
    + (weapon ? meleeTierBonus(weapon, v.loadoutTier ?? 'base') : 0)) * courage;
}

/** G-08 · a defender's full health (moved from Defenders.tsx unchanged, for garrisonBalance.ts to read the same
 *  number): 18, 6 a level, and flat on top of it the Shieldwall trait's 8, the plate's tier (data/armor.ts: iron 6,
 *  forged 10, castle-crested 16; a legacy `true` is iron) and a helmet's 3. */
export function defenderMaxHp(v: Villager): number {
  return 18 + (v.level ?? 1) * 6 + (hasTrait(v, 'def_shieldwall') ? 8 : 0)
    + chestplateHp(v.gear) + (v.gear?.helmet ? 3 : 0);
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

/** CLN-04 · session start (newGame / new-game-plus / loadFromSave). `defenderState`
 *  is never garbage-collected and the enemies' AI (game/enemyAi/targeting.ts) targets EVERY entry in it, so a
 *  defender left over from the last game kept absorbing raiders as an invisible
 *  ghost, and a reused id came back wounded/downed at its old position.
 *
 *  Lifecycle: DefenderFigure registers its entry in a useMemo keyed on the
 *  villager id and keeps mutating that same object for as long as it stays
 *  mounted — so an entry whose id is still a defender in the NEW roster
 *  (`keepIds`) is reset IN PLACE and kept in the registry (deleting it would
 *  orphan the mounted figure's object and enemies would stop seeing that
 *  defender). Every other entry has no figure that will ever be mounted for it,
 *  so it is deleted. The fleet order, per-defender overrides and scout callouts
 *  are session-tactical ("a reload rallies everyone back to their normal patrol",
 *  per the note on defenderOrders above) and reset with it. */
export function resetDefenders(keepIds: ReadonlySet<string>): void {
  for (const id of Object.keys(defenderState)) {
    if (!keepIds.has(id)) { delete defenderState[id]; continue; }
    const d = defenderState[id];
    d.x = d.postX; d.z = d.postZ;
    // hp goes back to the FRESH-REGISTRATION value (registerDefender: hp 1), NOT
    // to `d.maxHp`. That maxHp is derived from the id's level / gear / traits in
    // the LAST session, and the save being loaded can give the same id different
    // ones (a level-up, a swapped plate), so it is a stale ceiling: refilling to
    // it left a reused id above (30/24) or below (24/36) its real maxHp until it
    // was next hit. DefenderFigure recomputes `ds.maxHp` from the current villager
    // on every render and does `if (ds.hp <= 1) ds.hp = ds.maxHp` — the same
    // refill a brand-new entry relies on, so this only holds if the figure renders
    // after the reset. It does: one mounting later runs its body on mount, and a
    // mounted one re-renders because a loaded save deserialises to fresh villager
    // objects and, even for a same-reference load, the enemy store's clear() (this
    // same reset) swaps in a new `enemies` array that every figure subscribes to.
    // Keep clear() replacing that array (or compute maxHp here instead).
    d.hp = 1; d.state = 'ok'; d.downedUntil = 0;
    d.attackCd = 0; d.hurtCd = 0;
  }
  defenderOrders.order = 'patrol';
  defenderOrders.targetId = null;
  defenderOrders.rally = null;
  for (const id of Object.keys(defenderOrders.overrides)) delete defenderOrders.overrides[id];
  scoutReported.clear();
}

exposeDebug('__kkdefenders', defenderState);
exposeDebug('__kkorders', defenderOrders);
