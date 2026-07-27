export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

// One perk pick per rank-up (Laborer/Squire/Knight/Paladin — 4 chances),
// against a pool of 5: a real choice, since no playthrough can take them all.
export const PERKS: PerkDef[] = [
  { id: 'iron_grip', name: 'Iron Grip', icon: '💪', desc: '+15 max stamina, permanently.' },
  { id: 'green_thumb', name: 'Green Thumb', icon: '🌱', desc: 'Crops grow 15% faster.' },
  { id: 'steady_hands', name: 'Steady Hands', icon: '🛠️', desc: 'Tools and weapons wear 30% slower.' },
  { id: 'quick_study', name: 'Quick Study', icon: '📖', desc: '+10% experience from every skill.' },
  { id: 'ironclad', name: 'Ironclad', icon: '🛡️', desc: '+5% passive damage reduction, stacking with armor.' },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));
