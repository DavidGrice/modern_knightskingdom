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

/** How a garrison fares against a raid alone (this file's head says how the fight is settled). */
export function garrisonOutcome(garrison: readonly Fighter[], raid: readonly Fighter[]): GarrisonOutcome {
  const g = garrison.map((f) => ({ ...f, t: 0 }));
  const r = raid.map((f) => ({ ...f, t: 0 }));
  const full = g.reduce((a, f) => a + f.hp, 0);
  const up = (side: typeof g) => side.find((f) => f.hp > 0);
  for (let time = 0; time < FIGHT_CAP; time += FIGHT_STEP) {
    // both sides' swings land together: whoever stood as the step began swings, at whom he stood against
    const gFoe = up(r), rFoe = up(g);
    if (!rFoe) return 'lost';
    if (!gFoe) return g.every((f) => f.hp > 0) && g.reduce((a, f) => a + f.hp, 0) > full / 2 ? 'held' : 'pressed';
    const gUp = g.map((f) => f.hp > 0), rUp = r.map((f) => f.hp > 0);
    g.forEach((f, i) => { if (gUp[i] && (f.t -= FIGHT_STEP) <= 0) { gFoe.hp -= f.dmg; f.t += f.cd; } });
    r.forEach((f, i) => { if (rUp[i] && (f.t -= FIGHT_STEP) <= 0) { rFoe.hp -= f.dmg; f.t += f.cd; } });
  }
  return 'pressed';
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
