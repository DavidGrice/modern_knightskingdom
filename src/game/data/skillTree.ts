import type { SkillId } from '../types';
import { totalSkillLevel, levelFromXp } from './ranks';
import { RESPEC_BASE_GOLD, RESPEC_GOLD_PER_POINT } from './playerAttributes';

// The Talent Tree (Phase 21): each of the seven skills carries a three-tier
// branch of permanent talents. Points are earned by playing — one per total
// skill level, the same derived-not-stored pattern as perk slots — and each
// tier gates on both the previous talent and a real level in that skill, so
// a branch deepens with the craft it belongs to. Node icons are the original
// game's own assets (chroma-keyed piece thumbnails, the castle-stone sprite,
// portraits), per the "original assets first" directive.
export interface TalentDef {
  id: string;
  skill: SkillId;
  tier: 1 | 2 | 3;
  name: string;
  desc: string;
  cost: number;      // talent points (tier number)
  reqLevel: number;  // minimum level in this talent's own skill
  icon: string;      // image path from the extraction's assets
}

const ICONS: Record<SkillId, string> = {
  woodcutting: '/assets/props/scenery/l243500.png',    // the pine tree mold
  mining: '/assets/textures/ui/spr187_256x256.png',    // the castle-stone sprite
  smithing: '/assets/props/windows_doors/06_l318500.png', // portcullis ironwork
  fishing: '/assets/textures/water/spr199_256x256.png',   // the water ripple
  building: '/assets/props/scenery/l301500.png',       // the workbench crate
  combat: '/assets/minifigs/minifigrichardstrong00.png',  // the Master-at-Arms
  farming: '/assets/props/scenery/l374100.png',        // the wildflowers mold
};

function branch(
  skill: SkillId,
  names: [string, string, string],
  descs: [string, string, string],
): TalentDef[] {
  return ([1, 2, 3] as const).map((tier) => ({
    id: `${skill}${tier}`,
    skill,
    tier,
    name: names[tier - 1],
    desc: descs[tier - 1],
    cost: tier,
    reqLevel: tier === 1 ? 2 : tier === 2 ? 5 : 8,
    icon: ICONS[skill],
  }));
}

export const TALENTS: TalentDef[] = [
  ...branch('woodcutting',
    ['Timber Sense', 'Deep Rings', 'Forest Bounty'],
    ['+10% Woodcutting XP.', '15% chance of an extra log per chop.', 'Trees yield flowers twice as often.']),
  ...branch('mining',
    ['Stone Sense', 'Ore Eye', 'Vein Splitter'],
    ['+10% Mining XP.', 'Ordinary boulders yield ore 15% more often.', 'Iron veins give bonus stone twice as often.']),
  ...branch('smithing',
    ['Forge Sense', 'Tempered Edges', 'Guild Rates'],
    ['+10% Smithing XP.', 'Tools and weapons wear 20% slower.', 'Workbench repairs cost half the materials.']),
  ...branch('fishing',
    ['Water Sense', 'Steady Line', 'Full Net'],
    ['+10% Fishing XP.', 'The bite window lasts 300ms longer.', '15% chance to land two fish at once.']),
  ...branch('building',
    ['Brick Sense', 'Sure Hammer', 'Raised Right'],
    ['+10% Building XP.', 'Construction swings count 15% extra.', 'Another +15% on construction swings.']),
  ...branch('combat',
    ['Battle Sense', 'Second Wind', 'Heavy Hand'],
    ['+10% Combat XP.', '+10 maximum stamina.', '+1 melee damage.']),
  ...branch('farming',
    ['Field Sense', 'Rich Soil', 'Heavy Sheaves'],
    ['+10% Farming XP.', 'Crops grow 12% faster.', 'Harvests yield +1 wheat.']),
];

export const TALENT_BY_ID = Object.fromEntries(TALENTS.map((t) => [t.id, t])) as Record<string, TalentDef>;

export function talentPointsEarned(xp: Record<SkillId, number>): number {
  return totalSkillLevel(xp);
}

export function talentPointsSpent(tree: string[]): number {
  return tree.reduce((sum, id) => sum + (TALENT_BY_ID[id]?.cost ?? 0), 0);
}

/** whether a talent can be bought right now (owned prerequisites, skill
 *  level, and unspent points are all checked) */
export function talentBuyable(
  t: TalentDef,
  tree: string[],
  xp: Record<SkillId, number>,
): { ok: boolean; why: string } {
  if (tree.includes(t.id)) return { ok: false, why: 'Already learned.' };
  if (t.tier > 1 && !tree.includes(`${t.skill}${t.tier - 1}`)) {
    return { ok: false, why: 'Learn the previous talent first.' };
  }
  if (levelFromXp(xp[t.skill] ?? 0) < t.reqLevel) {
    return { ok: false, why: `Needs ${t.skill} level ${t.reqLevel}.` };
  }
  const unspent = talentPointsEarned(xp) - talentPointsSpent(tree);
  if (unspent < t.cost) return { ok: false, why: `Needs ${t.cost} unspent point${t.cost > 1 ? 's' : ''}.` };
  return { ok: true, why: '' };
}

// --- respec (Wave 32) -------------------------------------------------------
// Attributes got a full-reset respec in Wave 9 (see playerAttributes.ts); the
// talent tree never got its mirror. Reusing RESPEC_BASE_GOLD/RESPEC_GOLD_PER_POINT
// verbatim rather than inventing talent-specific constants keeps exactly one
// respec-pricing model in the game — talent costs (1-3 per node) are the same
// rough magnitude as attribute points, so a second scale would be a distinction
// without a difference. Full reset only, and more apt here than for attributes:
// talents are tier/prerequisite-chained, so a partial refund would have to
// validate which nodes can be dropped without orphaning a child tier — a full
// wipe sidesteps that entirely.
export function talentRespecCost(pointsSpent: number): number {
  if (pointsSpent <= 0) return 0;
  return RESPEC_BASE_GOLD + RESPEC_GOLD_PER_POINT * pointsSpent;
}
