// Wave 9 · DYES. Colour on a minifig has always been free and instant: both
// pickers (the creator, the mid-game Appearance panel, the villager editor)
// read `PALETTE_SWATCHES` — 30 curated indices into the runtime palette — and
// every one of them is always clickable. There was no dye system to fill gaps
// in; this file IS the system.
//
// ---------------------------------------------------------------------------
// The two design calls this file is:
//
// 1. DYES ADD ROWS, THEY NEVER GATE THE ONES YOU HAVE. The obvious reading of
//    "dye recipes for the palette rows" is to lock some of today's 30 swatches
//    behind a recipe. That is wrong twice over. It would take colours away
//    from every existing save, and — worse — the character creator runs BEFORE
//    a save exists, so a locked row would be free at Forge Your Hero and
//    then cost herbs to pick again an hour later. So the free 30 stay exactly
//    as free as they are, and each dye opens a row of colours the game has
//    never offered at all. Every index below is a real, distinct entry in
//    /public/assets/palette.json that `PALETTE_SWATCHES` does not use — the
//    oranges, purples and browns in particular have no representative in the
//    free set at all, so a dyed row is visibly a new thing to wear, not a
//    slightly different blue.
//
// 2. UNLOCK ONCE, KEEP FOR THE SAVE — not consumed per recolour. Recolouring
//    is fiddling: you try a leg colour, hate it, try another. Charging a
//    brewed item per click would make experimenting expensive and turn the
//    picker into a shop. Spending the dye once opens the row for good, which
//    is the same shape the game's one existing cosmetic gate already uses
//    (data/crestUnlocks.ts's locked-tile-plus-hint), just persisted in the
//    SAVE rather than in localStorage — a dye is brewed from this character's
//    own herbs, so it is this character's, whereas a crest is a deed the
//    player earned once and keeps across every hero.
//
// The recipes themselves (data/recipes.ts) sit at the CAMPFIRE with the
// draughts, on the `farming` skill, because that is already this game's
// "boil plants in a pot" station and dye is the same gesture as a brew.
// There is no separate dye station and no new gatherable: woad and madder and
// bark are the flowers, herbs, ore and timber already coming home.
import type { ItemId } from '../types';
import { PALETTE_SWATCHES } from './minifigs';

export interface DyeRow {
  /** stable id, stored in `SaveGame.dyes` — never renumber these */
  id: string;
  label: string;
  /** the brewed item spent to open the row */
  item: ItemId;
  icon: string;
  /** palette indices this row adds, light to dark */
  swatches: number[];
  blurb: string;
}

export const DYE_ROWS: DyeRow[] = [
  {
    id: 'woad', label: 'Woad Blues', item: 'dye_woad', icon: '🔵',
    swatches: [116, 117, 118, 119],
    blurb: 'The pale heraldic sky-blues — lighter than anything the free swatches hold.',
  },
  {
    id: 'madder', label: 'Ember Oranges', item: 'dye_madder', icon: '🟠',
    swatches: [76, 77, 78, 79],
    blurb: 'Rust and flame. The palette has reds and golds but no orange at all until this.',
  },
  {
    id: 'tyrian', label: 'Royal Purples', item: 'dye_tyrian', icon: '🟣',
    swatches: [80, 81, 82, 83],
    blurb: 'The dearest dye in the realm, and the only purple in it.',
  },
  {
    id: 'bark', label: 'Tanned Browns', item: 'dye_bark', icon: '🟤',
    swatches: [226, 72, 73, 75],
    blurb: 'Leather and loam, from pale tan down to bog-oak.',
  },
];

export const DYE_ROW_BY_ID: Record<string, DyeRow> = Object.fromEntries(
  DYE_ROWS.map((r) => [r.id, r]),
);

/** Every swatch this save may pick from: the free 30, then each opened row in
 *  catalogue order so the picker's layout never reshuffles under the player —
 *  a new row is appended, nothing above it moves. Callers pass `st.dyes`
 *  (absent on a pre-Wave-9 save, which simply yields today's 30). */
export function swatchIndices(dyes: string[] | undefined): number[] {
  if (!dyes || dyes.length === 0) return PALETTE_SWATCHES;
  const out = [...PALETTE_SWATCHES];
  for (const row of DYE_ROWS) if (dyes.includes(row.id)) out.push(...row.swatches);
  return out;
}

/** rows still to be opened, in catalogue order */
export function lockedDyeRows(dyes: string[] | undefined): DyeRow[] {
  return DYE_ROWS.filter((r) => !dyes?.includes(r.id));
}
