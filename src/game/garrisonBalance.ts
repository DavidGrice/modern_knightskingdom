// G-08 · the garrison against the raids it meets: a pinned balance table (garrisonBalance.test.ts snapshots it), so that
// a change to a defender's numbers or a raid's shows up as a change to this table in review — and the one model of a
// fight between them that G-07's lost-raid resolver and G-24a's settlement garrisons read.
//
// HOW A DEFENDER'S BONUSES STACK (OPEN-051), said once here:
//   health (game/defenders.ts's defenderMaxHp) — 18, 6 a level, then flat on top: the Shieldwall trait 8, the plate's
//     tier (data/armor.ts: iron 6, forged 10, castle-crested 16), a helmet 3. Nothing multiplies it.
//   a blow (defenderStrike) — the loadout's base (fists 1, a bow 2, a sword or a halberd 3), his level, the Courage
//     attribute's floor((courage - 5) / 3) (-1 to +1), the Riposte trait 1 and the forge's tier (data/melee.ts's
//     meleeTierBonus, the player's own: a sword +0.5 / +1 / +1.5 forged / crested / legendary, a halberd +0.7 / +1.4 /
//     +2.25), all flat; then the garrison's courage multiplies the whole — the ONE multiplier, COURAGE_NEUTRAL (1.0)
//     until G-21's morale drives it. A swing every 1.1 s (a bow 1.6: Defenders.tsx).
//   a raider — his kind's health and blow (data/enemies.ts's KIND_HP, ATTACK_DMG, ATTACK_CD), both times
//     raidStrength() (difficulty.ts: 1 + 0.35 a threat tier, times the run's difficulty), his health rounded as
//     enemyStore's spawn rounds it.
//
// THE FIGHT the table settles (garrisonOutcome) is the garrison alone against the whole raid, every raider fighting
// (a thief struck on his way in turns fighter, game/enemyAi/step.ts) and the player away: each side strikes the first
// of the other still standing, every swing on its cooldown, until one side is down. Held — beaten off with every
// defender standing and more than half the garrison's health left; pressed — beaten off at a cost (a defender down, or
// half its health gone); lost — every defender down. A raid is the leader (Gilbert the Bad) and raidSize(worth)
// bandits (directors/raidTiming.ts); the casters and shieldbearers a filler slot may roll at tier 1 and 2 are left
// out, as are Cedric's own raids and the crown's knights.
//
// G-07 · the same fight settles a raid the player has fallen out of (game/raidResolver.ts), with two things the live
// fight has and the table leaves out (garrisonFight's `field`): a defender posted up on a tower or a keep's wall-walk,
// whom the raiders on the ground skip outright (enemyAi/targeting.ts's nearestGuard: DefenderState.elevated) — he is
// struck by none of them and fights on; a thief, who strips the stores rather than fight (G-06), so strikes no one and
// is struck only once every raider who fights is down; and a raider's broken morale (data/enemies.ts's breakPoint: a
// bandit at 2 health runs), out of the fight from then on. With none of them, the fight is the table's, step for step.
import { COURAGE_NEUTRAL, defenderMaxHp, defenderStrike } from './defenders';
import { raidStrengthAt } from './difficulty';
import { raidSize } from './directors/raidTiming';
import { ATTACK_CD, ATTACK_DMG, KIND_HP, type EnemyKind } from './data/enemies';
import type { MeleeTier } from './data/melee';
import type { DefenderLoadout, Villager } from './types';

export interface Fighter { hp: number; dmg: number; cd: number }
export type GarrisonOutcome = 'held' | 'pressed' | 'lost';

/** a defender's swing cooldown, melee and bow (Defenders.tsx's attack branch) */
const DEFENDER_CD = 1.1;
const DEFENDER_BOW_CD = 1.6;
/** the fight is stepped at this, and given up (as pressed) past FIGHT_CAP seconds — no table cell comes near it */
const FIGHT_STEP = 0.1;
const FIGHT_CAP = 600;

/** One defender as a fighter: his health and blow, by the same functions the fight in the world uses. */
export function defenderFighter(v: Villager, courage = COURAGE_NEUTRAL): Fighter {
  return { hp: defenderMaxHp(v), dmg: defenderStrike(v, courage), cd: v.loadout === 'bow' ? DEFENDER_BOW_CD : DEFENDER_CD };
}

/** A raid as fighters: the leader and `followers` bandits, at a snapshot of the threat (raidStrength's tier and
 *  difficulty multiplier) — the followers first, as they come at the garrison ahead of him. */
export function raidFighters(followers: number, threat: { tier: number; difficultyMult: number }, leader: EnemyKind = 'gilbert'): Fighter[] {
  const s = raidStrengthAt(threat);
  const one = (kind: EnemyKind): Fighter => ({ hp: Math.round(KIND_HP[kind] * s), dmg: ATTACK_DMG[kind] * s, cd: ATTACK_CD[kind] });
  return [...Array.from({ length: followers }, () => one('bandit')), one(leader)];
}

/** G-07 · what the live fight has beyond the table's (this file's head): which defenders stand posted up, which
 *  raiders are thieves, and the health at or below which each raider runs — each by its place in the garrison or the
 *  raid; absent, none (and every raider fights to the end) */
export interface FightField { up?: readonly boolean[]; thieves?: readonly boolean[]; breaksAt?: readonly number[] }
/** How a fight went: its outcome, the seconds it took (to the last raider down, or to the garrison's fall), every
 *  fighter's health at its end (0 or below: down), and when each raider was first struck (Infinity: never) */
export interface FightResult { outcome: GarrisonOutcome; time: number; garrison: number[]; raid: number[]; struck: number[] }

/** How a garrison fares against a raid alone (this file's head says how the fight is settled). */
export function garrisonOutcome(garrison: readonly Fighter[], raid: readonly Fighter[]): GarrisonOutcome {
  return garrisonFight(garrison, raid).outcome;
}

/** The fight itself, stepped as this file's head says, on the `field` the live one has (G-07): what garrisonOutcome
 *  reads, and the lost-raid resolver with it. */
export function garrisonFight(garrison: readonly Fighter[], raid: readonly Fighter[], field: FightField = {}): FightResult {
  const g = garrison.map((f, i) => ({ ...f, t: 0, up: !!field.up?.[i] }));
  const r = raid.map((f, i) => ({ ...f, t: 0, thief: !!field.thieves?.[i], struck: Infinity, breaks: field.breaksAt?.[i] ?? 0 }));
  /** a raider still in the fight: on his feet, and not run */
  const fights = (f: (typeof r)[number]) => f.hp > 0 && f.hp > f.breaks;
  const full = g.reduce((a, f) => a + f.hp, 0);
  const result = (outcome: GarrisonOutcome, time: number): FightResult =>
    ({ outcome, time, garrison: g.map((f) => f.hp), raid: r.map((f) => f.hp), struck: r.map((f) => f.struck) });
  for (let time = 0; time < FIGHT_CAP; time += FIGHT_STEP) {
    // both sides' swings land together: whoever stood as the step began swings, at whom he stood against — the
    // garrison at the first raider standing who fights (a thief once none does), the raiders at the first defender
    // standing on the ground
    const gFoe = r.find((f) => fights(f) && !f.thief) ?? r.find(fights), rFoe = g.find((f) => f.hp > 0 && !f.up);
    if (!g.some((f) => f.hp > 0)) return result('lost', time);
    if (!gFoe) return result(g.every((f) => f.hp > 0) && g.reduce((a, f) => a + f.hp, 0) > full / 2 ? 'held' : 'pressed', time);
    const gUp = g.map((f) => f.hp > 0), rUp = r.map((f) => fights(f) && !f.thief);
    g.forEach((f, i) => {
      if (gUp[i] && (f.t -= FIGHT_STEP) <= 0) { gFoe.hp -= f.dmg; gFoe.struck = Math.min(gFoe.struck, time); f.t += f.cd; }
    });
    if (rFoe) r.forEach((f, i) => { if (rUp[i] && (f.t -= FIGHT_STEP) <= 0) { rFoe.hp -= f.dmg; f.t += f.cd; } });
  }
  return result('pressed', FIGHT_CAP);
}

/** what the table arms its garrison with: bare hands, or a sword and shield of a tier */
export type BalanceGear = 'unarmed' | MeleeTier;
export const BALANCE_GEAR: readonly BalanceGear[] = ['unarmed', 'base', 'forged', 'crested', 'legendary'];
/** the threat tiers raidStrength() is read at (difficulty.ts's TIER_RULES), and stores worth one at each step of
 *  raidSize (2 to 5 followers) */
export const BALANCE_TIERS = [0, 1, 2, 3, 4, 5];
export const BALANCE_WORTHS = [0, 500, 1500, 3000];
/** an id whose Courage attribute adds nothing (data/attributes.ts's attrsOf: 5-7), so the table reads level and gear */
const TABLE_ID = 'garrison';

/** The table's defender: level `level`, sword and shield at a tier (or bare-handed), in `kit` — none, or a veteran's
 *  (helmet, castle-crested plate, Shieldwall and Riposte). */
export function balanceDefender(gear: BalanceGear, level = 1, kit: 'none' | 'veteran' = 'none', loadout: DefenderLoadout = 'sword_shield'): Villager {
  return {
    id: TABLE_ID, name: 'Garrison', job: 'defender', level,
    loadout: gear === 'unarmed' ? undefined : loadout,
    loadoutTier: gear === 'unarmed' || gear === 'base' ? undefined : gear,
    ...(kit === 'veteran' ? { gear: { helmet: true, chestplate: 'crested' }, traits: ['def_shieldwall', 'def_riposte'] } : {}),
  } as Villager;
}

/** How `n` of one defender fare at each threat tier against the raid stores worth each of BALANCE_WORTHS draw:
 *  `outcome[tier][worthIndex]`. */
export function garrisonRow(v: Villager, n: number, difficultyMult = 1, courage = COURAGE_NEUTRAL): GarrisonOutcome[][] {
  const garrison = Array.from({ length: n }, () => defenderFighter(v, courage));
  return BALANCE_TIERS.map((tier) => BALANCE_WORTHS.map((worth) =>
    garrisonOutcome(garrison, raidFighters(raidSize(worth), { tier, difficultyMult }))));
}

/** The pinned table: for each gear and a garrison of 1-4 level-1 defenders, the outcome at every threat tier and
 *  stores' worth, at Normal difficulty and neutral courage. */
export function garrisonBalance(level = 1, difficultyMult = 1): { gear: BalanceGear; n: number; outcome: GarrisonOutcome[][] }[] {
  return BALANCE_GEAR.flatMap((gear) => [1, 2, 3, 4].map((n) => ({
    gear, n, outcome: garrisonRow(balanceDefender(gear, level), n, difficultyMult),
  })));
}
