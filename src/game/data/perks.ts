export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** costs something in exchange — shown as its own row, separate from the
   *  plain upside five, so the trade is legible before it's picked rather
   *  than reading like every other strictly-additive gift */
  tradeoff?: boolean;
}

// One perk pick per rank-up (Laborer/Squire/Knight/Paladin — 4 chances),
// against a pool of 5: a real choice, since no playthrough can take them all.
export const PERKS: PerkDef[] = [
  { id: 'iron_grip', name: 'Iron Grip', icon: '💪', desc: '+15 max stamina, permanently.' },
  { id: 'green_thumb', name: 'Green Thumb', icon: '🌱', desc: 'Crops grow 15% faster.' },
  { id: 'steady_hands', name: 'Steady Hands', icon: '🛠️', desc: 'Tools and weapons wear 30% slower.' },
  { id: 'quick_study', name: 'Quick Study', icon: '📖', desc: '+10% experience from every skill.' },
  { id: 'ironclad', name: 'Ironclad', icon: '🛡️', desc: '+5% passive damage reduction, stacking with armor.' },
  // Trade-off perks (requested 2026-07-28): the same one pick per rank-up
  // and shared 4-slot budget as the upside five above — picking one just
  // means picking fewer of those — but each costs something real, so builds
  // become distinct instead of strictly additive.
  {
    id: 'berserker', name: 'Berserker', icon: '🪓', tradeoff: true,
    desc: '+30% sword damage, but −20% max stamina.',
  },
  {
    id: 'hermit', name: 'Hermit', icon: '🏚️', tradeoff: true,
    desc: 'You gather double from every node, but your villagers work 25% slower.',
  },
  {
    id: 'silver_tongue', name: 'Silver Tongue', icon: '🗣️', tradeoff: true,
    desc: '+15% better trade prices, but Storm strikes faster in a duel.',
  },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));
