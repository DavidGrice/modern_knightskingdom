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

// One perk pick per rank-up (Laborer/Squire/Knight/Paladin/Marshal — 5
// chances as of Wave 52), against a pool of 12: a real choice, since no
// playthrough can take them all.
export const PERKS: PerkDef[] = [
  { id: 'iron_grip', name: 'Iron Grip', icon: '💪', desc: '+15 max stamina, permanently.' },
  { id: 'green_thumb', name: 'Green Thumb', icon: '🌱', desc: 'Crops grow 15% faster.' },
  { id: 'steady_hands', name: 'Steady Hands', icon: '🛠️', desc: 'Tools and weapons wear 30% slower.' },
  { id: 'quick_study', name: 'Quick Study', icon: '📖', desc: '+10% experience from every skill.' },
  { id: 'ironclad', name: 'Ironclad', icon: '🛡️', desc: '+5% passive damage reduction, stacking with armor.' },
  // Wave 52 (D2): two more plain, no-downside perks for the 5th (Marshal)
  // slot — reusing established vocabulary (trade prices, gather yield)
  // rather than inventing a new mechanic type.
  { id: 'honest_weight', name: 'Honest Weight', icon: '🪙', desc: '+8% better prices at every merchant and caravan — no strings attached.' },
  { id: 'foragers_fortune', name: "Forager's Fortune", icon: '🌰', desc: '10% chance any personal harvest yields one extra of its resource.' },
  // Trade-off perks (requested 2026-07-28): the same one pick per rank-up
  // and shared slot budget as the upside perks above — picking one just
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
  // Wave 52 (D2): two more trade-off perks — a 5th slot means more room for
  // builds to diverge, so this pool leans further into trade-offs (5 of 12,
  // up from 3 of 8) rather than staying strictly proportional.
  {
    id: 'iron_discipline', name: 'Iron Discipline', icon: '⚙️', tradeoff: true,
    desc: '+20 max stamina, but tools and weapons wear 25% faster.',
  },
  {
    id: 'quick_draw', name: 'Quick Draw', icon: '🏹', tradeoff: true,
    desc: '+20% bow and crossbow damage, but −15% max stamina.',
  },
];

export const PERK_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));
