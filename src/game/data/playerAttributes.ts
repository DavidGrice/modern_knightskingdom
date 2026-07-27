// Player attributes (AI-wave-2 batch): the champion's own attribute layer on
// top of skills/talents/perks. Points are EARNED by total skill level (one
// per 4 levels) and invested permanently in the Abilities panel — the
// "additional increase of skills" layer: each attribute amplifies a family
// of skill outcomes rather than granting new abilities.
import type { AttrId } from './attributes';

export const PLAYER_ATTRS: { id: AttrId; label: string; icon: string; blurb: string }[] = [
  { id: 'might', label: 'Might', icon: '💪', blurb: '+1 melee damage per 2 points' },
  { id: 'diligence', label: 'Diligence', icon: '⏳', blurb: '+4%/pt chance of bonus yield from trees and iron veins' },
  { id: 'craft', label: 'Craft', icon: '✋', blurb: '+4%/pt chance a craft turns out a double batch' },
  { id: 'courage', label: 'Courage', icon: '🦁', blurb: '+5 max stamina per point' },
  { id: 'wit', label: 'Wit', icon: '🧠', blurb: '+4%/pt better prices selling to merchants' },
];

export const ATTR_POINT_EVERY = 4; // total skill levels per point

export function attrPointsEarned(totalSkillLevel: number): number {
  return Math.floor(totalSkillLevel / ATTR_POINT_EVERY);
}

export function attrPointsSpent(spent: Partial<Record<AttrId, number>>): number {
  return Object.values(spent).reduce((a, b) => a + (b ?? 0), 0);
}
