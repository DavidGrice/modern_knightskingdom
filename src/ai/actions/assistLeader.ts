// Wave 25 — assist_leader: Tam, the companion squire's own answer to a
// believed hostile. It runs engage_threat's own approach/face/swing state
// machine (shared since CLN-15: src/ai/actions/meleeEngage.ts) — a
// companion is not an ordinary roster villager, so this reuses that file's
// original combat SHAPE (category 'combat', weight 3.0, interruptPriority 8
// — not the 'companion' category follow_leader claims, so this can actually
// preempt a follow in progress instead of tying with it) rather than
// engage_threat_villager's weaker one, while keeping its own fully separate
// gate/damage/config exactly like that file kept its own separate from
// engage_threat's:
//
//   - Gate is `agent.archetype === 'companion'` — NOT `bb.job === 'defender'`
//     (Tam is never a roster villager; his `bb.job` live-reads to `null`
//     every think tick, same as any agent with no matching Villager record —
//     see Blackboard.ts's own comment) and NOT engage_threat_villager's
//     courage/proximity/tier gates (see below for why those don't apply).
//   - Damage is a new `companionStrike()` (game/companion.ts) — a flat
//     constant of Tam's own, not `defenderStrike()`/`villagerStrike()`.
//   - Wave 54 (E2) update: a kill now grants `gainCompanionXp(15)` — the
//     exact hook this comment used to say didn't exist yet (since CLN-12 it
//     is the 'companion' cause of combat/kill.ts's resolveEnemyKill, which
//     `strike()` below calls). Still deliberately NOT `gainDefenderXp()`: Tam's
//     leveling record is `st.companion` (types.ts's `CompanionState`), not a
//     `Villager`, so it needs its own store action rather than reusing that
//     one's `st.villagers.map(...)` targeting.
//   - No `hasLineOfSight()` check. Checked, not assumed: neither
//     engage_threat nor engage_threat_villager — this action's own two
//     stated models — call it at all; LOS in this codebase gates RANGED
//     attacks only (Enemies.tsx's ranged mobs, Defenders.tsx's bow loadout,
//     combat.ts's bolts, perception's VisionSensor). assist_leader is melee
//     (reach 1.8m, identical to both models), so there is nothing at that
//     range for LOS to gate. If a later wave gives Tam a ranged option, that
//     is precisely where it must be threaded in — mirroring Defenders.tsx's
//     own bow-only conditional.
//   - No courage gate, no capableTierMax gate: both exist on
//     engage_threat_villager specifically to stop a whole ROSTER of flat,
//     unleveled villagers from mass-dogpiling into fights their stats can't
//     scale with as raidStrength() climbs. There is exactly one companion,
//     ever (falcon.ts's own "one always-on companion, not a fleet"
//     precedent) — that risk cannot occur for a single dedicated entity, so
//     omitting these is a reasoned call, not an oversight.
import { companionStrike, registerCompanionCombat } from '@/game/companion';
import { playerState } from '@/game/playerState';
import { COMBAT } from '../config';
import type { Action } from '../core/Reasoner';
import { BOOL_CURVE, type Curve } from '../core/curves';
import { MeleeEngageActivity, threatOf, type MeleeFighter } from './meleeEngage';

/** Tam's side of the fight: `companionStrike()`'s own flat damage instead of
 *  either defenderStrike() or villagerStrike(). Kill bookkeeping is
 *  resolveEnemyKill's 'companion' cause, which mirrors engage_threat's (kill
 *  recorded, loot dropped, player told) plus, as of Wave 54 (E2),
 *  `gainCompanionXp` — his own leveling record, not `gainDefenderXp` — see
 *  this file's own header. Same 15/kill `gainDefenderXp` already uses — no
 *  new tuning needed.
 *
 *  `config.leashDistance` (engageCompanion's alone) is what makes the state
 *  machine drop a chase that has carried him too far from the player; the
 *  `within_leash` consideration below is the half that stops it being picked
 *  straight back up. Tam's own HP/downed record (game/companion.ts) is owned
 *  by Enemies.tsx's damage path. */
const TAM: MeleeFighter = {
  config: COMBAT.engageCompanion,
  isDowned: (agent) => registerCompanionCombat(agent.id).state === 'downed',
  blow: () => ({ damage: companionStrike(), cause: { by: 'companion' } }),
};

/** Same straight-through ramp engage_threat/engage_threat_villager use: the
 *  bool gates already guarantee a real, near, undowned, dedicated combatant
 *  behind this number, so a little threat is just a little urgency. */
const threatCurve: Curve = { type: 'linear', m: 1, k: 1, b: 0, c: 0 };

export const ASSIST_LEADER: Action = {
  id: 'assist_leader',
  category: 'combat',
  weight: 3.0, // CATEGORY_WEIGHT.combat — engage_threat's own value, not follow_leader's 'companion' one
  interruptPriority: 8, // CATEGORY_INTERRUPT_PRIORITY.combat — clears follow_leader's 5 outright
  minDuration: 1.5, // engage_threat's own value: one swing's worth of commitment
  cooldown: 0,
  considerations: [
    {
      // The capability gate — Tam's own, distinct from both engage_threat's
      // `is_defender` and engage_threat_villager's courage/proximity/tier
      // set. See this file's own header for why none of those apply here.
      name: 'is_companion',
      input: (agent) => (agent.archetype === 'companion' ? 1 : 0),
      curve: BOOL_CURVE,
    },
    {
      name: 'not_downed',
      input: (agent) => (registerCompanionCombat(agent.id).state === 'downed' ? 0 : 1),
      curve: BOOL_CURVE,
    },
    { name: 'threat_present', input: (agent) => agent.bb.threatLevel, curve: threatCurve },
    {
      name: 'hostile_believed',
      input: (agent) => (threatOf(agent) ? 1 : 0),
      curve: BOOL_CURVE,
    },
    {
      // Verification fix — the REAL leash, as a scoring gate rather than a
      // one-off check inside the Activity's own update(). A bool return from
      // update() (SUCCESS/FAILURE) only ends THIS activity instance; it does
      // nothing to `assembleCandidates`' own next scoring pass, which reruns
      // every consideration fresh — so an update()-only check that returns
      // SUCCESS the instant Tam crosses leashDistance was confirmed live to
      // be no fix at all: `hostile_believed`/`threat_present` were both still
      // true a tick later (nothing about the belief changed), assist_leader
      // simply won again, and a brand-new Activity picked the chase right
      // back up — measured running Tam out to 43+ metres from the player, more
      // than double leashDistance, with the SUCCESS/restart cycle invisible
      // in play. Gating the ACTION itself is what actually sticks: past
      // leashDistance this scores the whole action to 0 (same bool-multiply
      // shape as `not_downed` above), so `follow_leader` (never gated by
      // this) wins the very next think tick and stays won — tier A/B/C think
      // at 10/5/2 Hz (lod.json), so the worst case is under half a second.
      name: 'within_leash',
      input: (agent) => (
        Math.hypot(playerState.x - agent.position.x, playerState.z - agent.position.z) <= COMBAT.engageCompanion.leashDistance ? 1 : 0
      ),
      curve: BOOL_CURVE,
    },
  ],
  createActivity: () => new MeleeEngageActivity(TAM),
};
