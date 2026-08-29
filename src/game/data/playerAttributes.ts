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
  { id: 'wit', label: 'Wit', icon: '🧠', blurb: '+4%/pt better prices trading with merchants' },
];

export const ATTR_POINT_EVERY = 4; // total skill levels per point

export function attrPointsEarned(totalSkillLevel: number): number {
  return Math.floor(totalSkillLevel / ATTR_POINT_EVERY);
}

export function attrPointsSpent(spent: Partial<Record<AttrId, number>>): number {
  return Object.values(spent).reduce((a, b) => a + (b ?? 0), 0);
}

// --- respec (Wave 9) -------------------------------------------------------
// ROADMAP's own follow-up line ("attribute respec (gold)") never priced or
// shaped it, and the codebase had no undo of any kind to copy — the talent
// tree is equally one-way, and the only "pay to change a locked-in choice"
// precedent is guild-switching's flat SWITCH_TITHE, which REASSIGNS one
// categorical value rather than refunding an accumulated resource.
//
// Two calls made here, both deliberate:
//
// * FULL RESET, not per-point undo. Investing is already one point at a time,
//   so a per-point refund would just be the `+` button with a minus sign and
//   would let a player shave a single point off Might the moment before a
//   fight, put it back after, and pay almost nothing for it. A wholesale
//   "rethink your nature" is what "respec" means, is one `set()`, and makes
//   the cost meaningful because it always buys the WHOLE sheet back.
// * COST SCALES WITH WHAT'S UNDONE. Every other gate in this economy is flat
//   (guild tithe, land tiers, talents), so this is the codebase's first
//   scaling cost and is a judgment call: a flat fee would be trivial for a
//   late-game champion sitting on twenty invested points, and punishing for
//   an early one undoing two. Base + per-point keeps it modest when you
//   misread a blurb at level 8 and a real decision at level 60.
export const RESPEC_BASE_GOLD = 25;   // the same "a tithe is 25 gold" scale guilds use
export const RESPEC_GOLD_PER_POINT = 15;

/** gold to hand every invested point back. 0 when there is nothing to undo. */
export function respecCost(pointsSpent: number): number {
  if (pointsSpent <= 0) return 0;
  return RESPEC_BASE_GOLD + RESPEC_GOLD_PER_POINT * pointsSpent;
}
