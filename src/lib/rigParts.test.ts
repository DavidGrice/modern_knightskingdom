import { describe, expect, it, vi } from 'vitest';

// The chart the module fetches as it loads, stood in for: what the rig lab's part_roles.json charts for the merchant's
// team (oc6095b3: its back-right legs and tails as generated, wrong) and for a standalone horse (l7339200).
const CHART = vi.hoisted(() => ({
  oc6095b3: {
    rigClass: 'chest_team', status: 'verified', parts: {
      '035_shape13': 'horse_L_leg_FL_upper', '047_shape17': 'horse_L_leg_BL_upper', '050_shape19': 'horse_L_leg_BL_lower',
      '041_shape17': 'horse_L_leg_BR_lower', '044_shape19': 'horse_L_extra_0', '056_shape23': 'horse_L_leg_BR_upper',
      '089_shape36': 'horse_R_leg_BL_upper', '092_shape38': 'horse_R_leg_BL_lower',
      '083_shape36': 'horse_R_leg_BR_lower', '086_shape38': 'horse_R_extra_0', '098_shape40': 'horse_R_leg_BR_upper',
      '020_OC_6095B3_Link_bar': 'link',
    },
  },
  l7339200: { rigClass: 'horse', status: 'verified', parts: { '015_shape5': 'leg_upper', '042_shape15': 'tail' } },
}));
vi.hoisted(() => vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => CHART })));

import { loadPartRoles, partRolesFor } from './rigParts';

describe('partRolesFor', () => {
  it("puts the merchant's team's back-right legs and tails right, whatever the generated chart says of them", async () => {
    await loadPartRoles();
    const roles = partRolesFor('oc6095b3')!;
    expect({
      '056_shape23': roles['056_shape23'], '098_shape40': roles['098_shape40'],
      '041_shape17': roles['041_shape17'], '083_shape36': roles['083_shape36'],
      '044_shape19': roles['044_shape19'], '086_shape38': roles['086_shape38'],
    }).toEqual({
      '056_shape23': 'horse_L_tail', '098_shape40': 'horse_R_tail',
      '041_shape17': 'horse_L_leg_BR_upper', '083_shape36': 'horse_R_leg_BR_upper',
      '044_shape19': 'horse_L_leg_BR_lower', '086_shape38': 'horse_R_leg_BR_lower',
    });
    // one part to each role: no two now share one, as the tail and the leg it was taken for did not, either
    expect(new Set(Object.values(roles)).size).toBe(Object.keys(roles).length);
    // the rest of its chart as charted
    for (const part of ['035_shape13', '047_shape17', '050_shape19', '089_shape36', '092_shape38', '020_OC_6095B3_Link_bar']) {
      expect(roles[part]).toBe(CHART.oc6095b3.parts[part as keyof typeof CHART.oc6095b3.parts]);
    }
    // and the chart it was read from left alone, for whatever else reads it
    expect(CHART.oc6095b3.parts['056_shape23']).toBe('horse_L_leg_BR_upper');
  });

  it('gives any other asset its chart as charted, and nothing for one not charted', async () => {
    await loadPartRoles();
    expect(partRolesFor('l7339200')).toBe(CHART.l7339200.parts);
    expect(partRolesFor('zz-uncharted')).toBeNull();
    expect(partRolesFor(undefined)).toBeNull();
  });
});
