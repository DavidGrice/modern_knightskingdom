// NPC_AI_SPEC §10's build-order item 7 / §5.1's `engage_threat` — closing on a
// believed hostile and striking it, as a real utility-reasoner action.
//
// WHICH POPULATION THIS IS FOR, stated plainly because it is the whole design
// decision of this file. Checked against the live code, not assumed:
//
//   - `setDefenderLoadout` (gameStore.ts) refuses any villager whose job is not
//     'defender', so "can fight" and "is a sworn defender" are the same
//     predicate in this game — there is no armed farmer and no way to make one.
//   - `rosterSync.ts` used to exclude `job === 'defender'` from getting an
//     `Agent` at all, because `Defenders.tsx` already owns a complete, tuned
//     combat AI for them (orders, engage radius, bow vs melee, mounts, tower
//     elevation, HP/downed/recovery, watch shifts). As of Wave 41 a defender
//     DOES get a real Agent — see the dated note below for why that still
//     changes nothing here.
//
// So this action's `is_defender` gate is the exact mirror image of that
// exclusion: it can only ever fire for an agent whose villager record says
// 'defender'.
//
// Updated 2026-09-05 (Wave 41): `rosterSync.ts` now DOES spawn a real Agent
// for a sworn defender — but under a dedicated 'defenderObserver' archetype
// whose `intrinsic` list is empty (config/archetypes.json), not under
// 'guard'. This gate stays permanently unreachable for a DIFFERENT reason
// now: `assembleCandidates` (core/Reasoner.ts) filters every action against
// the agent's own archetype's intrinsic set before this gate — or any other
// consideration — is ever evaluated, and `engage_threat` is not a member of
// defenderObserver's (empty) list. So `is_defender` scoring 1 for a real
// defenderObserver agent's `bb.job` is true and irrelevant: this Activity is
// never even assembled as a candidate for it, let alone scored or won. That
// is deliberate and it is not a stub — the Activity is complete (since CLN-15
// it is meleeEngage.ts's shared state machine, run with the defender's own
// numbers below), deals
// real damage through the same
// `EnemyData.hp` path `Defenders.tsx` uses, and shares its damage FORMULA
// rather than copying it (`defenderStrike`, game/defenders.ts). What it does
// not do is reverse rosterSync's exclusion, because that is a migration off a
// shipped, tuned combat AI onto an untested one — the single riskiest change
// this project's own docs have repeatedly flagged and deferred
// (PHASE_STATUS.md's closing section: "Enemies are the riskiest (combat is
// tuned and players notice)"; PROJECT_CONTEXT.md §8 item 6). It needs its own
// sign-off, its own session and its own live verification, not a side effect of
// the phase that happened to write the action.
//
// The value shipped here is that the reasoner side is real and complete: the
// `combat` category (weight 3.0 / interruptPriority 8, defined since phase 5,
// never used by an Action until this wave) now has a second real member, the
// dead `engage_threat` id in `archetypes.json`'s `guard` list has a registered
// Action behind it for the first time, and the one thing that migration would
// otherwise have had to write from scratch — under time pressure, next to a
// combat system players notice — already exists and is reviewable in isolation.
//
// It also gives `perception/Senses.ts`'s `reportAgentDamaged()` its intended
// caller shape: the moment a defender has an Agent, `Enemies.tsx`'s existing
// `defTarget.hp -= ...` site is the one line that makes §6.3's damage term
// live. Not wired here, because writing into a shipped combat file for a call
// that provably cannot resolve today (`agentManager.get(defenderId)` is always
// undefined) buys nothing and adds an import edge to `Enemies.tsx` that cannot
// be verified without running the game.
//
// Wired for real as of Wave 41: `agentManager.get(defenderId)` no longer
// resolves to `undefined` (a real `defenderObserver` agent exists), so
// `Enemies.tsx`'s `defTarget` branch now calls `reportAgentDamaged(defId,
// agentManager.now)` right beside the `defTarget.hp -=` line this paragraph
// describes — the same one-line addition the villagerTarget/companionTarget
// branches already made in Waves 21/25. That is the ENTIRE behavioral change
// this wave makes to a defender: a real `bb.lastDamageAt` for the reasoner's
// own §6.3 threat term. `engage_threat` itself, immediately above, remains
// exactly as inert as this whole header describes.

import { defenderStrike } from '@/game/defenders';
import { useGameStore } from '@/game/store/gameStore';
import { COMBAT } from '../config';
import type { Action } from '../core/Reasoner';
import { BOOL_CURVE, type Curve } from '../core/curves';
import { MeleeEngageActivity, threatOf, type MeleeFighter } from './meleeEngage';

/** A sworn defender's side of the fight. The swing is `Defenders.tsx`'s own
 *  formula (`defenderStrike`, game/defenders.ts) rather than a copy of it, and
 *  the kill is its own bookkeeping, reached through the same call rather than
 *  reimplemented (resolveEnemyKill's 'defender' cause): the kill is recorded,
 *  the defender earns their XP, the loot the raider was carrying drops, and the
 *  player is told. No `isDowned`: a defender's `defenderState` HP is owned by
 *  Defenders.tsx and is not this layer's to read. */
const DEFENDER: MeleeFighter = {
  config: COMBAT.engage,
  blow: (agent) => {
    const villager = useGameStore.getState().villagers.find((v) => v.id === agent.id);
    return villager ? { damage: defenderStrike(villager), cause: { by: 'defender', villager } } : null;
  },
};

/** Straight through: unlike `take_cover`'s floor-shifted ramp, there is no
 *  threshold below which an armed defender should decline to fight — a little
 *  threat is a little urgency, and the two bool gates below already ensure
 *  there is a real hostile behind the number. */
const threatCurve: Curve = { type: 'linear', m: 1, k: 1, b: 0, c: 0 };

export const ENGAGE_THREAT: Action = {
  id: 'engage_threat',
  category: 'combat',
  weight: 3.0, // CATEGORY_WEIGHT.combat
  // CATEGORY_INTERRUPT_PRIORITY.combat, equal to take_cover's on purpose:
  // neither should be able to preempt the other mid-minDuration, since they
  // are two answers to the SAME situation and the score is what should decide
  // between them (an armed defender fights, an unarmed one gets behind a wall).
  // Same reasoning seek_deposit documents for matching haul_to_deposit's.
  interruptPriority: 8,
  // Shorter than take_cover's 2 s: a fight is re-decided more often than a
  // retreat — one swing's worth of commitment, so a defender whose target dies
  // mid-swing can pick the next one up without waiting out a stale window.
  minDuration: 1.5,
  // Ends by SUCCESS (target gone) or by gating, never by failing repeatedly —
  // a cooldown here would leave a defender standing idle between raiders.
  cooldown: 0,
  considerations: [
    {
      // The capability gate, and the exact mirror of rosterSync.ts's own
      // defender exclusion — see this file's header. `bb.job` is already a
      // live read refreshed every think tick from the real roster record
      // (Agent.think), so this costs nothing beyond a comparison; asking the
      // store for `loadout` here would mean a second O(villagers) scan per
      // think for a question `bb.job` already answers. Being sworn is the
      // capability; the WEAPON only sets the damage tier (defenderStrike
      // gives a bare-handed defender the weaker fists number).
      name: 'is_defender',
      input: (agent) => (agent.bb.job === 'defender' ? 1 : 0),
      curve: BOOL_CURVE,
    },
    { name: 'threat_present', input: (agent) => agent.bb.threatLevel, curve: threatCurve },
    {
      name: 'hostile_believed',
      input: (agent) => (threatOf(agent) ? 1 : 0),
      curve: BOOL_CURVE,
    },
  ],
  createActivity: () => new MeleeEngageActivity(DEFENDER),
};
