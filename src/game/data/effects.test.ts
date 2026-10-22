import { describe, expect, it } from 'vitest';
import { ATTR_FX, BASE_FX, CALLING_FX, PERK_FX, TALENT_FX } from './effects';
import { PERKS } from './perks';
import { TALENTS, TALENT_BY_ID } from './skillTree';
import { CLASSES } from './classes';
import { HAGGLE_PER_WIT, HONEST_WEIGHT_HAGGLE, SILVER_TONGUE_HAGGLE, WANDERER_HAGGLE } from './pricing';

/** a fraction as the whole percent a description says */
const pct = (x: number) => `${Math.round(x * 100)}%`;
const perkDesc = (id: string) => PERKS.find((p) => p.id === id)!.desc;
const talentDesc = (id: string) => TALENT_BY_ID[id].desc;

describe('the effects table', () => {
  it('has an entry for every perk, and its talents, callings and attributes are ones the game has', () => {
    expect(Object.keys(PERK_FX).sort()).toEqual(PERKS.map((p) => p.id).sort());
    for (const id of Object.keys(TALENT_FX).filter((k) => k !== 'firstTierXpTimes')) expect(TALENT_BY_ID[id]).toBeDefined();
    const signatures = CLASSES.map((c) => c.signature).filter(Boolean);
    for (const k of Object.keys(CALLING_FX).filter((k) => k !== 'signatureXpTimes' && k !== 'wanderer')) expect(signatures).toContain(k);
    expect(Object.keys(ATTR_FX).sort()).toEqual(['courage', 'craft', 'diligence', 'might', 'wit']);
  });

  it('names the haggle by the same numbers the prices are worked out by', () => {
    expect([PERK_FX.silver_tongue.hagglePlus, PERK_FX.honest_weight.hagglePlus, CALLING_FX.wanderer.hagglePlus, ATTR_FX.wit.hagglePlus])
      .toEqual([SILVER_TONGUE_HAGGLE, HONEST_WEIGHT_HAGGLE, WANDERER_HAGGLE, HAGGLE_PER_WIT]);
  });
});

describe("each perk's description says what its numbers do", () => {
  it('the plain perks', () => {
    expect(perkDesc('iron_grip')).toContain(`+${PERK_FX.iron_grip.staminaPlus} max stamina`);
    expect(perkDesc('green_thumb')).toContain(`grow ${pct(1 - PERK_FX.green_thumb.growTimeTimes)} faster`);
    expect(perkDesc('steady_hands')).toContain(`wear ${pct(1 - PERK_FX.steady_hands.wearTimes)} slower`);
    expect(perkDesc('quick_study')).toContain(`+${pct(PERK_FX.quick_study.xpTimes - 1)} experience`);
    expect(perkDesc('ironclad')).toContain(`+${pct(PERK_FX.ironclad.damageReductionPlus)} passive damage reduction`);
    expect(perkDesc('honest_weight')).toContain(`+${pct(PERK_FX.honest_weight.hagglePlus)} better prices`);
    expect(perkDesc('foragers_fortune')).toContain(`${pct(PERK_FX.foragers_fortune.extraYieldChance)} chance`);
  });

  it('the trade-offs, both halves', () => {
    expect(perkDesc('berserker')).toContain(`+${pct(PERK_FX.berserker.meleeTimes - 1)} damage with a melee weapon in hand`);
    expect(perkDesc('berserker')).toContain(`−${pct(1 - PERK_FX.berserker.staminaTimes)} max stamina`);
    expect(PERK_FX.hermit.gatherTimes).toBe(2);
    expect(perkDesc('hermit')).toContain('double from every node');
    expect(perkDesc('hermit')).toContain(`villagers work ${pct(PERK_FX.hermit.villagerTripTimes - 1)} slower`);
    expect(perkDesc('silver_tongue')).toContain(`+${pct(PERK_FX.silver_tongue.hagglePlus)} better trade prices`);
    expect(perkDesc('silver_tongue')).toContain('Storm strikes faster');
    expect(perkDesc('iron_discipline')).toContain(`+${PERK_FX.iron_discipline.staminaPlus} max stamina`);
    expect(perkDesc('iron_discipline')).toContain(`wear ${pct(PERK_FX.iron_discipline.wearTimes - 1)} faster`);
    expect(perkDesc('quick_draw')).toContain(`+${pct(PERK_FX.quick_draw.rangedTimes - 1)} bow and crossbow damage`);
    expect(perkDesc('quick_draw')).toContain(`−${pct(1 - PERK_FX.quick_draw.staminaTimes)} max stamina`);
  });
});

describe("each talent's description says what its numbers do", () => {
  it('every first talent: more XP in its own skill', () => {
    for (const t of TALENTS.filter((t) => t.tier === 1)) expect(t.desc).toMatch(new RegExp(`^\\+${Math.round((TALENT_FX.firstTierXpTimes - 1) * 100)}% \\w+ XP\\.$`));
  });

  it('woodcutting and mining', () => {
    expect(talentDesc('woodcutting2')).toContain(`${pct(TALENT_FX.woodcutting2.extraLogChance)} chance of an extra log`);
    expect(TALENT_FX.woodcutting3.flowerChance / BASE_FX.flowerChance).toBe(2);
    expect(talentDesc('woodcutting3')).toContain('twice as often');
    expect(TALENT_FX.woodcutting4.flowerChance).toBe(1);
    expect(talentDesc('woodcutting4')).toContain('always');
    expect(talentDesc('mining2')).toContain(`+${pct(TALENT_FX.mining2.oreChancePlus)} chance of ore`);
    expect(TALENT_FX.mining3.veinStoneChance / BASE_FX.veinStoneChance).toBe(2);
    expect(talentDesc('mining3')).toContain('twice as often');
    expect(TALENT_FX.mining4.veinStoneChance).toBe(1);
    expect(talentDesc('mining4')).toContain('always');
  });

  it('smithing, fishing and building', () => {
    expect(talentDesc('smithing2')).toContain(`wear ${pct(1 - TALENT_FX.smithing2.wearTimes)} slower`);
    expect(TALENT_FX.smithing3.repairShare / BASE_FX.repairShare).toBe(0.5);
    expect(talentDesc('smithing3')).toContain('half the materials');
    expect(TALENT_FX.smithing4.repairShare).toBe(1 / 20);
    expect(talentDesc('smithing4')).toContain('a twentieth of the materials');
    expect(talentDesc('fishing2')).toContain(`${TALENT_FX.fishing2.biteWindowPlusMs}ms longer`);
    expect(talentDesc('fishing3')).toContain(`${pct(TALENT_FX.fishing3.twoFishChance)} chance to land two fish`);
    expect(talentDesc('fishing4')).toContain(`${pct(TALENT_FX.fishing4.twoFishChance)} chance to land two fish`);
    expect(talentDesc('building2')).toContain(`count ${pct(TALENT_FX.building2.swingPlus)} extra`);
    expect(talentDesc('building3')).toContain(`+${pct(TALENT_FX.building3.swingPlus)}`);
    expect(talentDesc('building4')).toContain(`+${pct(TALENT_FX.building4.swingPlus)}`);
  });

  it('combat and farming', () => {
    expect(talentDesc('combat2')).toContain(`+${TALENT_FX.combat2.staminaPlus} maximum stamina`);
    expect(talentDesc('combat3')).toContain(`+${TALENT_FX.combat3.meleePlus} melee damage`);
    expect(talentDesc('combat4')).toContain(`+${TALENT_FX.combat4.meleePlus} more melee damage`);
    expect(talentDesc('farming2')).toContain(`grow ${pct(1 - TALENT_FX.farming2.growTimeTimes)} faster`);
    expect(talentDesc('farming3')).toContain(`+${TALENT_FX.farming3.sheaves} wheat`);
    expect(talentDesc('farming4')).toContain(`+${TALENT_FX.farming4.sheaves} wheat instead of +${TALENT_FX.farming3.sheaves}`);
  });
});
