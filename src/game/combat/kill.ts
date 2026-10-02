'use client';
// CLN-12 · the one place an enemy's death is settled: the fall itself, the tally, who learns from it, what changes
// hands and what the player is told. Eight call sites each carried their own copy of this, and the copies had
// drifted apart — so what differs between them is now a table (RULES) instead of eight code paths.
import type { ItemId, Villager } from '../types';
import { useGameStore } from '../store/gameStore';
import { ITEMS } from '../data/items';
import { rollBossLegendaryDrop } from '../bossEncounter';
import { arenaState } from '../arena';
import { KIND_LABEL, KIND_XP, KIND_XP_RANGED, type EnemyKind } from '../data/enemies';
import type { EnemyData } from './enemyStore';
import { lootFor } from './loot';

/** Who, or what, felled the enemy. */
type KillCause =
  /** the player's own blade (melee.ts's landMeleeHit) */
  | { by: 'melee' }
  /** the player's own bolt or arrow (projectiles.ts's stepBolt) */
  | { by: 'ranged' }
  /** a siege engine's shot bursting (siege.ts's explodeBall) */
  | { by: 'cannonball' }
  /** a placed charge going off (siege.ts's detonate) */
  | { by: 'charge' }
  /** Tam, the companion squire (the reasoner's assist_leader) */
  | { by: 'companion' }
  /** a sworn defender — Defenders.tsx's own cascade, or the reasoner's engage_threat */
  | { by: 'defender'; villager: Pick<Villager, 'id' | 'name'> }
  /** an ordinary villager fighting back (the reasoner's engage_threat_villager) */
  | { by: 'villager'; villager: Pick<Villager, 'name'> };

/** What a kill is worth and how it is announced. One row per cause. */
interface KillRules {
  /** counts toward a Battle Dome run's tally, when the enemy was an arena spawn */
  arena: boolean;
  /** combat XP for the player — null when the kill was not the player's own doing */
  xp: ((kind: EnemyKind) => number) | null;
  /** the enemy's purse (what it rolled when it spawned) is handed over */
  loot: boolean;
  /** the line the player reads, or null to say nothing. `haul` lists what was looted and is empty when nothing
   *  was; `who` is the ally's name. */
  line: ((kind: EnemyKind, haul: string, who: string) => string) | null;
  /** toasted in gold */
  gold?: true;
  /** ends Cedric's rebellion, when this was his sanctioned final stand */
  finalStand: boolean;
}

const RULES: Record<KillCause['by'], KillRules> = {
  melee: {
    arena: true, xp: (kind) => KIND_XP[kind], loot: true, finalStand: true,
    line: (kind, haul) => (haul ? `${KIND_LABEL[kind]} defeated! Looted ${haul}.` : `${KIND_LABEL[kind]} defeated!`),
  },
  // ranged kills have always paid a small bonus over melee (KIND_XP_RANGED). They dropped NOTHING before
  // 2026-07-20 — only the melee path ever granted loot, so bow/crossbow play quietly paid less.
  ranged: {
    arena: true, xp: (kind) => KIND_XP_RANGED[kind], loot: true, finalStand: true, gold: true,
    line: (kind, haul) => (haul ? `${KIND_LABEL[kind]} shot down! Looted ${haul}.` : `${KIND_LABEL[kind]} shot down!`),
  },
  // OPEN QUESTION (CLEANUP_PLAN.md, "Open questions") — the two blast rows are the pre-CLN-12 behaviour, kept
  // exactly rather than decided here. They know two kinds of enemy: a cannonball pays and names a skeleton as
  // KIND_XP and KIND_LABEL do, and everything else as a bandit (30 XP, "Bandit blasted!" — a Royal Knight and
  // Cedric included); a charge pays that same 30 for anything and says nothing. Neither hands over the purse,
  // counts toward the arena or credits Cedric's final stand. Bringing them in line with the two rows above is an
  // edit to these two rows and nothing else.
  cannonball: {
    arena: false, xp: (kind) => (kind === 'skeleton' ? 20 : 30), loot: false, finalStand: false, gold: true,
    line: (kind) => `${kind === 'skeleton' ? 'Skeleton' : 'Bandit'} blasted!`,
  },
  charge: { arena: false, xp: () => 30, loot: false, finalStand: false, line: null },
  // An ally's kill pays the player nothing but the purse. All three say "a raider" whatever the kind.
  companion: { arena: false, xp: null, loot: true, finalStand: false, gold: true, line: () => 'Tam defeats a raider!' },
  defender: {
    arena: false, xp: null, loot: true, finalStand: false, gold: true,
    line: (_kind, _haul, who) => `${who} defeats a raider!`,
  },
  // deliberately no XP for the villager either: `gainDefenderXp` is a defender-only leveling field on the Villager
  // record, and calling it on a farmer's id would start a stray level/xp on a non-defender for no defined reason
  villager: {
    arena: false, xp: null, loot: true, finalStand: false, gold: true,
    line: (_kind, _haul, who) => `${who} fights off a raider!`,
  },
};

/** what a kill teaches the ally who made it: a defender's own level (`gainDefenderXp`), or Tam's
 *  (`gainCompanionXp`) — the same 15 for both */
const ALLY_KILL_XP = 15;

/**
 * Settle one enemy's death. The caller has dealt the blow and seen `hp` reach zero; everything that follows from
 * that happens here, in one order for every cause: the enemy starts to fall, the kill is recorded, then the arena
 * tally, the experience, the purse, the line the player reads, and last whatever the kill sets in motion.
 *
 * Not for Storm's duel — that is settled by `resolveDuel`, not by a death (see melee.ts's landMeleeHit) — and not
 * for an enemy that simply falls with nobody to credit (a raider whose wall comes down under it, skeletons at
 * dawn: Enemies.tsx sets `state = 'dying'` itself for those).
 */
export function resolveEnemyKill(e: EnemyData, cause: KillCause): void {
  if (e.mob.state === 'dying') return; // already settled — a death is only ever paid out once
  const st = useGameStore.getState();
  const rules = RULES[cause.by];
  e.mob.state = 'dying';
  e.mob.dieT = 0;
  st.recordKill(e.kind);
  if (rules.arena && e.arena) arenaState.kills++;
  if (rules.xp) st.addXp('combat', rules.xp(e.kind));
  if (cause.by === 'defender') st.gainDefenderXp(cause.villager.id, ALLY_KILL_XP);
  let haul = '';
  if (rules.loot) {
    // hand over what this individual was actually carrying (rolled at spawn)
    const drop = lootFor(e);
    st.addItems(drop, 'grant');
    haul = Object.entries(drop)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`)
      .join(', ');
  }
  if (rules.line) st.notify(rules.line(e.kind, haul, 'villager' in cause ? cause.villager.name : ''), rules.gold);
  // Cedric's Siege: only the sanctioned final stand ever permanently
  // defeats him — every other spawn of his kind flees well before 0 HP
  // (see Enemies.tsx's flee-guard), so reaching this branch with
  // finalStand unset should be effectively unreachable, but the gate stays
  // as the deliberate second line of defense against that assumption.
  // Wave 50 (C2): the legendary-halberd roll is computed HERE (this file
  // safely imports bossEncounter.ts) and merely passed in as a
  // value — gameStore.ts deliberately does not import bossEncounter.ts
  // (see markCedricDefeated's own comment there for the real import cycle
  // that would create). Only rolled on the one-shot capstone (cedricCaptures
  // === 0), never on a farmable rematch.
  if (rules.finalStand && e.kind === 'cedric' && e.finalStand) {
    st.markCedricDefeated(st.cedricCaptures === 0 ? rollBossLegendaryDrop('cedric') : null);
  }
  // Tam's lesson comes after the line, a defender's before the purse. That is the order each site already had:
  // "Tam defeats a raider!" is read before "Tam has grown stronger!", and a defender's two lines the other way round.
  if (cause.by === 'companion') st.gainCompanionXp(ALLY_KILL_XP);
}
