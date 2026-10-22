import { describe, expect, it } from 'vitest';
import { cropGrowTime, harvestSheaves, wearPerUse } from './derivedStats';
import { CLASSES } from './classes';

// the formulas as the store wrote them out before CLN-23, term for term
const sig = (classId: string | undefined, skill: string) => CLASSES.find((c) => c.id === classId)?.signature === skill;
type P = { perks: string[]; skillTree: string[]; character: { classId?: string } | null };
const old = {
  growTime: (base: number, st: P) => {
    let t = st.perks.includes('green_thumb') ? base * 0.85 : base;
    if (st.skillTree.includes('farming2')) t *= 0.88;
    if (sig(st.character?.classId, 'farming')) t *= 0.96;
    return t;
  },
  sheaves: (st: P) => (st.skillTree.includes('farming4') ? 2 : st.skillTree.includes('farming3') ? 1 : 0),
  wear: (st: P) => {
    let wear = 2;
    if (st.perks.includes('steady_hands')) wear *= 0.7;
    if (st.perks.includes('iron_discipline')) wear *= 1.25;
    if (st.skillTree.includes('smithing2')) wear *= 0.8;
    if (sig(st.character?.classId, 'smithing')) wear *= 0.92;
    return wear;
  },
};

/** every combination of the perks and talents these read, under every calling and none */
function players(): P[] {
  const perks = ['green_thumb', 'steady_hands', 'iron_discipline'];
  const talents = ['farming2', 'farming3', 'farming4', 'smithing2'];
  const out: P[] = [];
  for (let a = 0; a < 1 << perks.length; a++) for (let b = 0; b < 1 << talents.length; b++) {
    for (const classId of [undefined, ...CLASSES.map((c) => c.id)]) {
      out.push({ perks: perks.filter((_, k) => a & (1 << k)), skillTree: talents.filter((_, k) => b & (1 << k)), character: classId ? { classId } : null });
    }
  }
  return out;
}

describe('the stats several places worked out for themselves', () => {
  it('come out to the last bit as the store worked them out, for every combination', () => {
    const all = players();
    expect(all.length).toBe(8 * 16 * (CLASSES.length + 1));
    for (const p of all) {
      for (const base of [200, 137.5]) expect(cropGrowTime(base, p)).toBe(old.growTime(base, p));
      expect(harvestSheaves(p)).toBe(old.sheaves(p));
      expect(wearPerUse(p)).toBe(old.wear(p));
    }
  });
});
