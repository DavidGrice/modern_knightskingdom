// The allegiance axis: where you stand between the two houses.
//
// The game already had `alliance` — a one-way PLEDGE to Leo or Cedric, made
// once and never revisited. That is a switch, not a standing: nothing you did
// afterwards moved it, and every quest in the game was implicitly "good".
// This is the continuous axis underneath that switch. Errands, kills,
// bargains and betrayals all nudge it, and it gates what people will offer
// you.
//
//   -100 ............... 0 ............... +100
//   Cedric's cause     unsworn        Leo's crown
//
// The pledge stays a separate, deliberate act (see gameStore.swearTo) — this
// tracks what your DEEDS say, which is not always the same thing, and that
// tension is the point.

export type House = 'leo' | 'cedric';

export const ALLEGIANCE_MIN = -100;
export const ALLEGIANCE_MAX = 100;

/** the named bands, from Cedric's end to Leo's */
export interface AllegianceTier {
  /** inclusive lower bound of the band */
  min: number;
  title: string;
  /** whose side this band belongs to, or null for the neutral middle */
  house: House | null;
  blurb: string;
}

export const ALLEGIANCE_TIERS: AllegianceTier[] = [
  { min: -100, house: 'cedric', title: "Cedric's Right Hand", blurb: 'The Bull counts you among his own. The crown counts you an outlaw.' },
  { min: -60, house: 'cedric', title: 'Sworn to the Bull', blurb: "You ride under Cedric's banner and the roads know it." },
  { min: -25, house: 'cedric', title: 'Bull-Leaning', blurb: 'You have done the Bull favours. Word travels.' },
  { min: -10, house: null, title: 'Unsworn', blurb: 'Neither house has your word. Both are still asking.' },
  { min: 11, house: 'leo', title: 'Crown-Leaning', blurb: 'The court has noticed you, and approves.' },
  { min: 26, house: 'leo', title: "Leo's Vassal", blurb: 'You keep the crown’s peace, and the crown keeps you.' },
  { min: 61, house: 'leo', title: "Paladin of the Crown", blurb: 'King Leo names you among the realm’s finest.' },
];

/** House colours, straight off the two banners — Leo's blue/gold/white, the
 *  Bull's red/black/brown. Used by the allegiance meter and anything else
 *  that wants to read as belonging to one side. */
export const HOUSE_COLORS: Record<House, { primary: string; secondary: string; accent: string }> = {
  leo: { primary: '#2f5fb8', secondary: '#e8c141', accent: '#f2f5fb' },
  cedric: { primary: '#8f1f1f', secondary: '#1a1210', accent: '#6b4a2a' },
};

export const HOUSE_NAME: Record<House, string> = {
  leo: 'King Leo', cedric: 'Cedric the Bull',
};

export function allegianceTier(value: number): AllegianceTier {
  let out = ALLEGIANCE_TIERS[0];
  for (const t of ALLEGIANCE_TIERS) if (value >= t.min) out = t;
  return out;
}

/** which house a standing leans toward, or null in the unsworn middle */
export function leaningHouse(value: number): House | null {
  return allegianceTier(value).house;
}

/** 0..1 across the whole axis, for a meter fill */
export function allegianceFrac(value: number): number {
  return (Math.max(ALLEGIANCE_MIN, Math.min(ALLEGIANCE_MAX, value)) - ALLEGIANCE_MIN)
    / (ALLEGIANCE_MAX - ALLEGIANCE_MIN);
}

/** Does a standing of `value` satisfy a requirement?
 *  A positive `need` means "at least this far toward Leo", a negative one
 *  "at least this far toward Cedric". */
export function meetsAllegiance(value: number, need: number): boolean {
  return need >= 0 ? value >= need : value <= need;
}

/** human-readable reason a gate is shut — never disable without naming the
 *  blocker (UI handoff §2) */
export function allegianceGateHint(need: number): string {
  const tier = allegianceTier(need);
  return need >= 0
    ? `Requires standing with the crown (${tier.title})`
    : `Requires standing with the Bull (${tier.title})`;
}
