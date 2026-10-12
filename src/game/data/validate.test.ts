import { describe, expect, it } from 'vitest';
import { validateGameData } from './validate';
import { GUILD_QUESTS } from './npcs';
import { CARAVAN_ROUTES } from './caravan';
import { SETTLEMENTS, type SettlementDef } from './settlements';
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

describe('validateGameData · settlements', () => {
  const ruins = SETTLEMENTS['template-08'];
  /** changes one settlement's record for one check, then puts it back as it was */
  function withSite(destId: string, change: Partial<SettlementDef>, check: (violations: string[]) => void) {
    const site = SETTLEMENTS[destId], before = { ...site };
    Object.assign(site, change);
    try { check(validateGameData()); } finally {
      for (const key of Object.keys(site) as (keyof SettlementDef)[]) if (!(key in before)) delete site[key];
      Object.assign(site, before);
    }
  }
  /** adds a settlement at another destination for one check, then takes it out again */
  function withNewSite(destId: string, site: SettlementDef, check: (violations: string[]) => void) {
    SETTLEMENTS[destId] = site;
    try { check(validateGameData()); } finally { delete SETTLEMENTS[destId]; }
  }

  it('rejects a giver who is nobody, who lives somewhere else, or who hands out other errands', () => {
    withSite('template-08', { giver: 'nobody' }, (v) => expect(v).toEqual(["settlement 'template-08': giver 'nobody' is not an NPC"]));
    // Torvald lives at the Frozen Pass, and the errands he hands out are the Pass's
    withSite('template-08', { giver: 'torvald' }, (v) => expect(v).toEqual([
      "settlement 'template-08': giver 'torvald' lives in 'template-07', not here",
      "settlement 'template-08': giver 'torvald' does not hand out this settlement's errands",
    ]));
    withSite('template-08', { giver: 'farmer_alric' }, (v) => expect(v[0]).toBe("settlement 'template-08': giver 'farmer_alric' lives in 'the homestead', not here"));
    // the same errands in a list of their own: no longer the list Fenwick offers
    withSite('template-08', { quests: [...ruins.quests] }, (v) => expect(v).toEqual([
      "settlement 'template-08': giver 'fenwick' does not hand out this settlement's errands",
    ]));
  });

  it('rejects a deed, or a growth, that waits on an errand the settlement does not hand out', () => {
    withSite('template-08', { founding: { ...ruins.founding, requiredQuestId: 'frostpass_clear' } }, (v) => expect(v).toEqual([
      "settlement 'template-08': the deed waits on 'frostpass_clear', which is not one of its errands",
    ]));
    withSite('template-07', { growthQuestId: 'ruins_expand' }, (v) => expect(v).toEqual([
      "settlement 'template-07': grows on 'ruins_expand', which is not one of its errands",
    ]));
  });

  it('rejects a deed priced in something that is not an item, and a resident named twice', () => {
    withSite('template-08', { founding: { ...ruins.founding, cost: { gold: 60, unobtainium: 1 } as SettlementDef['founding']['cost'] } }, (v) => expect(v).toEqual([
      "settlement 'template-08': deed cost 'unobtainium' is not an item",
    ]));
    // Bram already lives at the Old Ruins
    const camp = SETTLEMENTS['template-04'].founding;
    withSite('template-04', { founding: { ...camp, residents: [...camp.residents.slice(0, 2), { id: 'settler_bram', name: 'Bram', job: 'farmer' }] } }, (v) => expect(v).toEqual([
      "settlement 'template-04': resident 'settler_bram' is named twice, so only one of them ever moves in",
    ]));
  });

  it('rejects a settlement that is no destination, and a road to a guild hall where no guild is housed', () => {
    withNewSite('template-99', { ...ruins, founding: { ...ruins.founding, residents: [] } }, (v) => {
      expect(v).toContain("settlement 'template-99': is not a destination");
    });
    // no guild keeps a hall on The King's Approach
    withNewSite('template-01', { ...ruins, founding: { ...ruins.founding, residents: [] }, roadsTo: ['giver', 'guildHall'] }, (v) => {
      expect(v).toEqual([
        "settlement 'template-01': giver 'fenwick' lives in 'template-08', not here",
        "settlement 'template-01': a road to a guild hall, but no guild is housed here",
      ]);
    });
    // ...while the Old Ruins, where the Miners keep theirs, may have one
    expect(ruins.roadsTo).toContain('guildHall');
  });

  it('rejects a road at a destination with no arrival point to start it from', () => {
    // The Far Meadow is a destination, but a traveller there is put down by rule, not at a recorded point
    withNewSite('template-09', { ...ruins, founding: { ...ruins.founding, residents: [] }, roadsTo: ['giver'] }, (v) => {
      expect(v).toEqual([
        "settlement 'template-09': giver 'fenwick' lives in 'template-08', not here",
        "settlement 'template-09': a road, but no arrival point to start it from",
      ]);
    });
    // with no road asked for, there is nothing to start
    withNewSite('template-09', { ...ruins, founding: { ...ruins.founding, residents: [] }, roadsTo: [] }, (v) => {
      expect(v).toEqual(["settlement 'template-09': giver 'fenwick' lives in 'template-08', not here"]);
    });
  });

  it('puts a changed record back exactly, even a field it did not have', () => {
    expect('nodes' in ruins).toBe(false);
    withSite('template-08', { nodes: [] }, () => expect('nodes' in ruins).toBe(true));
    expect('nodes' in ruins).toBe(false);
  });

  it('rejects a defend errand aimed at a destination that is no settlement', () => {
    withErrands([errand({ kind: 'defend', target: 'template-01', need: 1 })], (v) => expect(v).toEqual([
      "quest 'zz_test' (woodsmen): defend target 'template-01' is not a settlement",
    ]));
    withErrands([errand({ kind: 'defend', target: 'template-04', need: 1 })], (v) => expect(v).toEqual([]));
  });
});

describe('validateGameData · caravan roads', () => {
  /** adds a road for one check, then takes it out again */
  function withRoad(key: string, check: (violations: string[]) => void) {
    CARAVAN_ROUTES[key] = { etaMs: 60_000, riskPct: 0 };
    try { check(validateGameData()); } finally { delete CARAVAN_ROUTES[key]; }
  }

  it('rejects a road that does not join two different settlements', () => {
    for (const key of ['template-01|template-08', 'template-08|template-08', 'template-08', 'template-04|template-07|template-08']) {
      withRoad(key, (v) => expect(v).toEqual([`caravan road '${key}': must join two different settlements`]));
    }
  });

  it('rejects a road filed under a key it is never looked up by', () => {
    withRoad('template-08|template-07', (v) => expect(v).toEqual([
      "caravan road 'template-08|template-07': is looked up as 'template-07|template-08', so this entry is never found",
    ]));
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
