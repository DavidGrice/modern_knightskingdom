// Minifig donors: extracted OBJ models whose object names carry body-part labels.
// Heads (faces) and torso decals are picked per donor; limbs are recolored via the
// global runtime palette (the "glit0NN" materials index that palette — FORMAT_SPEC §7).
//
// The face/crest picker below is cosmetic only — picking "King Leo"'s face or
// crest doesn't grant any rank; Peasant→Paladin is entirely a function of
// skill XP + quests (see data/ranks.ts) and never reads headDonor/bodyDonor.
// Some crests are earned rather than free: see data/crestUnlocks.ts for the
// account-level (localStorage) unlock rules tied to Deeds and crypt clears.

export type Gender = 'male' | 'female';

interface FaceOption {
  id: string;        // donor id (also used as the assembled headDonor)
  label: string;      // anonymous style name — no title/rank implied
  gender: Gender;
  thumb: string;       // /assets/creator/faces/{id}.png
}

interface CrestOption {
  id: string;        // donor id (also used as the assembled bodyDonor)
  label: string;
  gender: Gender;
  thumb: string;       // /assets/creator/crests/{id}.png
}

// Extracted face/crest decals (scripts/prepare-assets.mjs), one flat texture
// per donor — see that script's texForObject for how the source .obj/.mtl
// map to these specific sprite files. Labels here describe the *design*
// (beard style, expression…), not the donor's in-game identity/rank.
const CREST_BASE = '/assets/creator/crests/';
const FACE_BASE = '/assets/creator/faces/';

export const FACE_OPTIONS: FaceOption[] = [
  { id: 'minifigrichardstrong00', label: 'Square-Jawed', gender: 'male', thumb: `${FACE_BASE}minifigrichardstrong00.png` },
  { id: 'minifigjohnmayne00', label: 'Weathered', gender: 'male', thumb: `${FACE_BASE}minifigjohnmayne00.png` },
  { id: 'minifigkingleo00', label: 'Grey Beard', gender: 'male', thumb: `${FACE_BASE}minifigkingleo00.png` },
  { id: 'minifigcedricbull00', label: 'Scarred', gender: 'male', thumb: `${FACE_BASE}minifigcedricbull00.png` },
  { id: 'minifiggilbertbad00', label: 'Sly Grin', gender: 'male', thumb: `${FACE_BASE}minifiggilbertbad00.png` },
  { id: 'minifigweezil00', label: 'Stubbled', gender: 'male', thumb: `${FACE_BASE}minifigweezil00.png` },
  { id: 'minifigqueenleonora00', label: 'Warm Smile', gender: 'female', thumb: `${FACE_BASE}minifigqueenleonora00.png` },
  { id: 'minifigprincessstorm00', label: 'Fierce', gender: 'female', thumb: `${FACE_BASE}minifigprincessstorm00.png` },
];

/** Where a donor's face picture actually lives.
 *
 *  The cropped `/assets/creator/faces/` sprites only exist for the eight
 *  donors the CREATOR offers (FACE_OPTIONS above) — prepare-assets.mjs never
 *  cut one for `minifiggenericgood00`/`minifiggenericbad00`, and never will:
 *  they aren't creator faces, they're the two generic villager bodies. Any UI
 *  that draws a face for an ARBITRARY donor (the roster's villager appearance
 *  editor, whose pool is VILLAGER_LOOKS and therefore includes both generics)
 *  must ask here rather than string-building the creator path, which 404s on
 *  every render for those two. The fallback is the donor's full-figure
 *  catalogue thumbnail under /assets/minifigs — a file that exists for every
 *  donor in the extraction. */
export function faceThumbFor(donorId: string): string {
  const face = FACE_OPTIONS.find((f) => f.id === donorId);
  return face ? face.thumb : `/assets/minifigs/${donorId}.png`;
}

export const CREST_OPTIONS: CrestOption[] = [
  { id: 'minifigrichardstrong00', label: 'Iron Chevron', gender: 'male', thumb: `${CREST_BASE}minifigrichardstrong00.png` },
  { id: 'minifigjohnmayne00', label: "Quartermaster's Sash", gender: 'male', thumb: `${CREST_BASE}minifigjohnmayne00.png` },
  { id: 'minifigkingleo00', label: 'Rampant Lion', gender: 'male', thumb: `${CREST_BASE}minifigkingleo00.png` },
  { id: 'minifigcedricbull00', label: 'Bull Sigil', gender: 'male', thumb: `${CREST_BASE}minifigcedricbull00.png` },
  { id: 'minifiggilbertbad00', label: 'Broken Axe', gender: 'male', thumb: `${CREST_BASE}minifiggilbertbad00.png` },
  { id: 'minifigweezil00', label: 'Horned Sigil', gender: 'male', thumb: `${CREST_BASE}minifigweezil00.png` },
  { id: 'minifigqueenleonora00', label: 'Rose Crest', gender: 'female', thumb: `${CREST_BASE}minifigqueenleonora00.png` },
  { id: 'minifigprincessstorm00', label: 'Storm Sigil', gender: 'female', thumb: `${CREST_BASE}minifigprincessstorm00.png` },
];

// Curated swatches from the global runtime palette (index -> classic LEGO color).
// Index 18 = LEGO yellow, 26 = royal blue, 34 = grey, 38 = near-black, 150 = white
// (anchors verified in FORMAT_SPEC.md §7).
export const PALETTE_SWATCHES: number[] = [
  18, 19, 20, 21,      // yellows/golds
  22, 23, 24, 25,      // reds
  26, 27, 28, 29,      // blues
  30, 31, 32, 33,      // greens
  34, 35, 36, 37, 38,  // greys to black
  150,                 // white
  40, 44, 48, 52, 56, 60, 64, 68,
];

