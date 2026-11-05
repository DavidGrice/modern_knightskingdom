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
import { resolveDuel } from './duel';
import type { EnemyData } from './enemyStore';
import { lootFor } from './loot';

/** Who, or what, felled the enemy. */
export type KillCause =
  /** the player's own blade (melee.ts's landMeleeHit) */
  | { by: 'melee' }
  /** the player's own bolt or arrow (projectiles.ts's stepBolt) */
  | { by: 'ranged' }
  /** a siege engine's shot the player loosed, crewing it or by hand, bursting (siege.ts's explodeBall) */
  | { by: 'cannonball' }
  /** an engine's shot bursting that it loosed on its own, a defender posted to it or not (Emplacements.tsx) */
  | { by: 'emplacement' }
  /** a placed charge going off (siege.ts's detonate) — the player's, whatever set it off */
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

/** the line for a blast kill, of any of the three kinds */
const blasted = (kind: EnemyKind, haul: string) =>
  (haul ? `${KIND_LABEL[kind]} blasted! Looted ${haul}.` : `${KIND_LABEL[kind]} blasted!`);

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
  // Blast kills are paid by who fired (the owner's decision OD-04, wave 64.3). A shot the player looses and every
  // charge (only the player places one) pay as his blade does: the kind's own XP, the purse and Cedric's final
  // stand. An engine firing on its own hands over the purse at the lower rate blasts always paid (a skeleton's 20,
  // 30 for anything else). All three name what fell — until then everything but a skeleton was "Bandit blasted!",
  // no blast handed over a purse, and a charge said nothing. None counts toward the arena, which cannot be claimed,
  // so no engine or charge can stand there.
  cannonball: { arena: false, xp: (kind) => KIND_XP[kind], loot: true, finalStand: true, gold: true, line: blasted },
  emplacement: {
    arena: false, xp: (kind) => (kind === 'skeleton' ? 20 : 30), loot: true, finalStand: false, gold: true,
    line: blasted,
  },
  charge: { arena: false, xp: (kind) => KIND_XP[kind], loot: true, finalStand: true, gold: true, line: blasted },
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
 * Princess Storm is the one enemy this never kills: see the first lines of the body. And it is not for an enemy that
 * simply falls with nobody to credit (a raider whose wall comes down under it, skeletons at dawn: game/enemyAi/ and
 * game/directors/nightSkeletons.ts set `state = 'dying'` themselves for those).
 */
export function resolveEnemyKill(e: EnemyData, cause: KillCause): void {
  if (e.mob.state === 'dying') return; // already settled — a death is only ever paid out once
  // Princess Storm is never killed. Her duel is first blood between her and the player, so the player's own blade
  // wins it (`resolveDuel`, which removes her rather than felling her) and nothing else can end it. Nothing else
  // should reach her in the first place — allies do not see her as a hostile (VisionSensor.ts), and bolts and
  // blasts pass her by (stepBolt, siege.ts) — so for every cause but the blade this is the second line of defence:
  // before it, Tam's blow ended the duel as "Tam defeats a raider!" and nobody won.
  if (e.kind === 'storm') {
    if (cause.by === 'melee') resolveDuel(true, e.id);
    return;
  }
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
  // (see game/enemyAi/movement.ts's flee-guard), so reaching this branch with
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
