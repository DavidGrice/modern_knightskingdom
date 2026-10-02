import { describe, expect, it } from 'vitest';
import { validateGameData } from './validate';
import { GUILD_QUESTS } from './npcs';
import type { SideQuestDef } from './cast/types';

// These errands are deliberately WRONG, which SideQuestDef's per-kind target types would refuse to compile — hence
// the cast. The validator is the backstop for exactly such data.
const errand = (over: Record<string, unknown>): SideQuestDef => ({
  id: 'zz_test', kind: 'gather', target: 'wood', need: 3, label: 'test errand', xpSkill: 'woodcutting', xp: 10, ...over,
}) as unknown as SideQuestDef;

/** adds errands to a real pool for one check, then takes them out again */
function withErrands(defs: SideQuestDef[], check: (violations: string[]) => void) {
  const pool = GUILD_QUESTS.woodsmen;
  pool.push(...defs);
  try { check(validateGameData()); } finally { pool.splice(pool.length - defs.length, defs.length); }
}

describe('validateGameData', () => {
  it('finds nothing wrong with the shipped quest and cast data', () => {
    expect(validateGameData()).toEqual([]);
  });

  // each rule below is shown able to fire, so a clean run above means something
  it('rejects a gather errand aimed at a crafted item (the Wave 34 bug)', () => {
    withErrands([errand({ target: 'plank' })], (v) => {
      expect(v).toHaveLength(1);
      expect(v[0]).toContain("gather target 'plank' is a recipe output");
    });
  });

  it('rejects targets that are not real items, recipes, buildables or enemy kinds', () => {
    withErrands([
      errand({ id: 'zz_a', kind: 'gather', target: 'unobtainium' }),
      errand({ id: 'zz_b', kind: 'craft', target: 'not_a_recipe' }),
      errand({ id: 'zz_c', kind: 'build', target: 'not_a_buildable' }),
      errand({ id: 'zz_d', kind: 'kill', target: 'dragonfly' }),
      errand({ id: 'zz_e', kind: 'duel', target: 'storm' }),
      errand({ id: 'zz_f', kind: 'deliver', target: 'wood' }),
    ], (v) => {
      expect(v.map((line) => line.slice(0, line.indexOf(' (')))).toEqual(
        ["quest 'zz_a'", "quest 'zz_b'", "quest 'zz_c'", "quest 'zz_d'", "quest 'zz_e'", "quest 'zz_f'"],
      );
    });
  });

  it('rejects duplicate ids, missing prerequisites and prerequisite cycles', () => {
    withErrands([errand({ id: 'wm_scout' })], (v) => expect(v.some((l) => l.includes("'wm_scout': duplicate id"))).toBe(true));
    withErrands([errand({ requires: ['never_written'] })], (v) => expect(v).toEqual(["quest 'zz_test': requires 'never_written', which does not exist"]));
    withErrands([errand({ id: 'zz_1', requires: ['zz_2'] }), errand({ id: 'zz_2', requires: ['zz_1'] })], (v) => {
      expect(v).toHaveLength(1);
      expect(v[0]).toContain('requires-cycle');
    });
  });
});

describe('validateGameData · main quest line', () => {
  it('rejects an objective that can never be advanced', async () => {
    const { QUESTS } = await import('./quests');
    QUESTS.push({
      id: 'zz_main', name: 'test', description: 'test',
      objectives: [
        { id: 'a', label: 'gather planks', kind: 'gather', target: 'plank', count: 2 },
        { id: 'b', label: 'visit nowhere', kind: 'visit', target: 'template-99', count: 1 },
        { id: 'b', label: 'talk to nobody', kind: 'talk', target: 'nobody', count: 1 },
      ],
    } as (typeof QUESTS)[number]);
    try {
      const v = validateGameData();
      expect(v).toHaveLength(4);
      expect(v[0]).toContain("gather target 'plank' is a recipe output");
      expect(v[1]).toContain("visit target 'template-99' is not a destination");
      expect(v[2]).toContain('duplicate objective id');
      expect(v[3]).toContain("talk target 'nobody' is not an NPC");
    } finally { QUESTS.pop(); }
  });
});
