import { describe, expect, it } from 'vitest';
import {
  BALANCE_GEAR, BALANCE_TIERS, BALANCE_WORTHS, balanceDefender, defenderFighter, garrisonBalance, garrisonOutcome, raidFighters,
  type BalanceGear,
} from './garrisonBalance';
import { COURAGE_NEUTRAL, defenderMaxHp, defenderStrike } from './defenders';
import { attrsOf } from './data/attributes';
import { raidSize } from './directors/raidTiming';
import { difficultyState, raidStrength, raidStrengthAt } from './difficulty';
import type { Villager } from './types';

// G-08 · the garrison's balance table, pinned: a change to a defender's numbers, a raid's, or the fight between them
// shows here as a changed snapshot, to be read and re-pinned on purpose (G-21's morale re-pins it).

/** one letter a cell: Held, Pressed, Lost */
const letters = (o: string[][]) => o.map((tier) => tier.map((c) => c[0].toUpperCase()).join('')).join(' ');

describe('the stacking rule, by the same functions the fight uses', () => {
  it("the table's defender has a Courage that adds nothing", () => {
    const c = attrsOf(balanceDefender('base').id).courage;
    expect(Math.floor((c - 5) / 3)).toBe(0);
  });

  it('health and blow by level, weapon and kit', () => {
    const rows: string[] = [];
    for (const level of [1, 5]) {
      for (const kit of ['none', 'veteran'] as const) {
        const weapons: [string, Villager][] = [
          ...(['unarmed', 'base', 'forged', 'crested', 'legendary'] as BalanceGear[]).map((g): [string, Villager] => [`sword ${g}`, balanceDefender(g, level, kit)]),
          ['halberd legendary', balanceDefender('legendary', level, kit, 'halberd')],
          ['bow', balanceDefender('base', level, kit, 'bow')],
        ];
        for (const [label, v] of weapons) rows.push(`L${level} ${kit} ${label}: hp ${defenderMaxHp(v)} blow ${defenderStrike(v)}`);
      }
    }
    expect(rows).toMatchInlineSnapshot(`
      [
        "L1 none sword unarmed: hp 24 blow 2",
        "L1 none sword base: hp 24 blow 4",
        "L1 none sword forged: hp 24 blow 4.5",
        "L1 none sword crested: hp 24 blow 5",
        "L1 none sword legendary: hp 24 blow 5.5",
        "L1 none halberd legendary: hp 24 blow 6.25",
        "L1 none bow: hp 24 blow 3",
        "L1 veteran sword unarmed: hp 51 blow 3",
        "L1 veteran sword base: hp 51 blow 5",
        "L1 veteran sword forged: hp 51 blow 5.5",
        "L1 veteran sword crested: hp 51 blow 6",
        "L1 veteran sword legendary: hp 51 blow 6.5",
        "L1 veteran halberd legendary: hp 51 blow 7.25",
        "L1 veteran bow: hp 51 blow 4",
        "L5 none sword unarmed: hp 48 blow 6",
        "L5 none sword base: hp 48 blow 8",
        "L5 none sword forged: hp 48 blow 8.5",
        "L5 none sword crested: hp 48 blow 9",
        "L5 none sword legendary: hp 48 blow 9.5",
        "L5 none halberd legendary: hp 48 blow 10.25",
        "L5 none bow: hp 48 blow 7",
        "L5 veteran sword unarmed: hp 75 blow 7",
        "L5 veteran sword base: hp 75 blow 9",
        "L5 veteran sword forged: hp 75 blow 9.5",
        "L5 veteran sword crested: hp 75 blow 10",
        "L5 veteran sword legendary: hp 75 blow 10.5",
        "L5 veteran halberd legendary: hp 75 blow 11.25",
        "L5 veteran bow: hp 75 blow 8",
      ]
    `);
  });

  it('courage multiplies the whole blow, and is neutral until G-21 drives it', () => {
    const v = balanceDefender('legendary', 3, 'veteran');
    expect(COURAGE_NEUTRAL).toBe(1);
    expect(defenderStrike(v)).toBe(defenderStrike(v, 1));
    expect(defenderStrike(v, 1.5)).toBeCloseTo(defenderStrike(v) * 1.5, 9);
    expect(defenderFighter(v, 1.5).dmg).toBeCloseTo(defenderStrike(v) * 1.5, 9);
  });
});

describe('the raid it meets', () => {
  it('reads raidStrength at a snapshot of the threat, as the live curve does', () => {
    const was = { ...difficultyState };
    Object.assign(difficultyState, { tier: 3, difficultyMult: 1.3 });
    expect(raidStrengthAt({ tier: 3, difficultyMult: 1.3 })).toBe(raidStrength());
    Object.assign(difficultyState, was);
  });

  it("is the leader and raidSize's followers, scaled", () => {
    expect(BALANCE_WORTHS.map((w) => raidSize(w))).toEqual([2, 3, 4, 5]);
    expect(raidFighters(2, { tier: 0, difficultyMult: 1 })).toEqual([
      { hp: 8, dmg: 1.5, cd: 1.6 }, { hp: 8, dmg: 1.5, cd: 1.6 }, { hp: 14, dmg: 2, cd: 1.5 },
    ]);
    expect(raidFighters(5, { tier: 5, difficultyMult: 1 }).map((f) => f.hp)).toEqual([22, 22, 22, 22, 22, 39]);
  });
});

describe('the fight', () => {
  it('held, pressed and lost', () => {
    const raider = { hp: 10, dmg: 5, cd: 1 };
    expect(garrisonOutcome([{ hp: 30, dmg: 10, cd: 1 }], [raider])).toBe('held');
    expect(garrisonOutcome([{ hp: 40, dmg: 5, cd: 1 }], [raider, raider])).toBe('pressed'); // 30 of his 40 gone
    expect(garrisonOutcome([{ hp: 4, dmg: 1, cd: 1 }, { hp: 30, dmg: 10, cd: 1 }], [raider])).toBe('pressed'); // one down
    expect(garrisonOutcome([{ hp: 10, dmg: 1, cd: 1 }], [raider])).toBe('lost');
  });

  it('more defenders, a better weapon or a smaller raid never fares worse', () => {
    const rank = { held: 0, pressed: 1, lost: 2 };
    const table = garrisonBalance();
    const at = (gear: BalanceGear, n: number) => table.find((r) => r.gear === gear && r.n === n)!.outcome;
    for (const row of table) {
      for (const t of BALANCE_TIERS) {
        for (let w = 0; w < BALANCE_WORTHS.length; w++) {
          const o = rank[row.outcome[t][w]];
          if (row.n < 4) expect(rank[at(row.gear, row.n + 1)[t][w]]).toBeLessThanOrEqual(o);
          const better = BALANCE_GEAR[BALANCE_GEAR.indexOf(row.gear) + 1];
          if (better) expect(rank[at(better, row.n)[t][w]]).toBeLessThanOrEqual(o);
          if (w > 0) expect(rank[row.outcome[t][w - 1]]).toBeLessThanOrEqual(o);
          if (t > 0) expect(rank[row.outcome[t - 1][w]]).toBeLessThanOrEqual(o);
        }
      }
    }
  });
});

describe('the pinned table', () => {
  it('a level-1 garrison of 1-4, by gear: each threat tier 0-5, the stores worth 0 / 500 / 1,500 / 3,000 (2-5 followers)', () => {
    expect(garrisonBalance().map((r) => `${r.gear.padEnd(9)} x${r.n}: ${letters(r.outcome)}`)).toMatchInlineSnapshot(`
      [
        "unarmed   x1: LLLL LLLL LLLL LLLL LLLL LLLL",
        "unarmed   x2: HPLL PLLL LLLL LLLL LLLL LLLL",
        "unarmed   x3: HPPP PPPL PLLL LLLL LLLL LLLL",
        "unarmed   x4: HHHP HPPP PPPL PPLL PLLL LLLL",
        "base      x1: PLLL LLLL LLLL LLLL LLLL LLLL",
        "base      x2: HHHP HPLL PLLL LLLL LLLL LLLL",
        "base      x3: HHHP HHPP HPLL PPLL PLLL PLLL",
        "base      x4: HHHH HHPP HHPP HPPP PPLL PPLL",
        "forged    x1: PLLL LLLL LLLL LLLL LLLL LLLL",
        "forged    x2: HHHP HPLL PLLL LLLL LLLL LLLL",
        "forged    x3: HHHP HHPP HPLL PPLL PLLL PLLL",
        "forged    x4: HHHH HHPP HHPP HPPP PPLL PPLL",
        "crested   x1: PLLL LLLL LLLL LLLL LLLL LLLL",
        "crested   x2: HHHP HPLL PLLL PLLL LLLL LLLL",
        "crested   x3: HHHH HHPP HHPP PPLL PPLL PLLL",
        "crested   x4: HHHH HHPP HHPP HPPP HPPL PPLL",
        "legendary x1: PLLL LLLL LLLL LLLL LLLL LLLL",
        "legendary x2: HHHP HHPP PLLL PLLL LLLL LLLL",
        "legendary x3: HHHH HHPP HHPP HPPL PPLL PLLL",
        "legendary x4: HHHH HHPP HHPP HPPP HPPL PPPL",
      ]
    `);
  });

  it('and a level-3 veteran garrison (helmet, crested plate, Shieldwall, Riposte)', () => {
    const rows = (['unarmed', 'forged', 'legendary'] as BalanceGear[]).flatMap((gear) => [1, 2, 3, 4].map((n) => {
      const g = Array.from({ length: n }, () => defenderFighter(balanceDefender(gear, 3, 'veteran')));
      const o = BALANCE_TIERS.map((tier) => BALANCE_WORTHS.map((w) => garrisonOutcome(g, raidFighters(raidSize(w), { tier, difficultyMult: 1 }))));
      return `${gear.padEnd(9)} x${n}: ${letters(o)}`;
    }));
    expect(rows).toMatchInlineSnapshot(`
      [
        "unarmed   x1: HHPP HPLL PLLL LLLL LLLL LLLL",
        "unarmed   x2: HHHH HHHP HHHP HHPL HHPL PLLL",
        "unarmed   x3: HHHH HHHH HHHH HHPP HHPP HPPL",
        "unarmed   x4: HHHH HHHH HHHH HHHH HHHH HPPP",
        "forged    x1: HHPP HPPL HPLL PLLL PLLL LLLL",
        "forged    x2: HHHH HHHH HHHH HHPP HHPL HPPL",
        "forged    x3: HHHH HHHH HHHH HHHH HHHH HHHP",
        "forged    x4: HHHH HHHH HHHH HHHH HHHH HHHP",
        "legendary x1: HHHH HPPL HPPL PPLL PLLL LLLL",
        "legendary x2: HHHH HHHH HHHH HHHH HHPL HPPL",
        "legendary x3: HHHH HHHH HHHH HHHH HHHH HHHP",
        "legendary x4: HHHH HHHH HHHH HHHH HHHH HHHP",
      ]
    `);
  });
});
