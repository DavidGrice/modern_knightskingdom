// CLN-29 · the sounds the game names, as lists: what audio.ts preloads, and what a SoundName may be. Apart from the
// audio manager, so that naming a sound does not need it. Wave 66 (G-01): what is on disk is src/game/data/
// assetManifest.json (its "eager" sounds are exactly SOUNDS, its lore lines exactly LORE_VOICES — assetManifest.test.ts);
// everything else in it, the rest of the bank and the challenge voice lines, loads only when first played.
export const SOUNDS = [
  'bird1', 'bird2', 'bird3', 'brick_link', 'brick_collide', 'brick_connect',
  'sword_swish', 'door_open', 'step', 'thud', 'flame', 'treasure', 'unlock',
  'wind1', 'wind2', 'owl', 'horn', 'greeting_king', 'villager',
  'rain', 'lightning', 'bat', 'falcon', 'whinny', 'graze',
  'skeleton', 'warcry', 'canter', 'cannon', 'explosion',
  'greeting_queen', 'greeting_richard', 'greeting_john', 'greeting_storm',
  'crossbow', 'drawbridge', 'portcullis', 'longbow',
  'greeting_gilbert', 'random_gilbert', 'greeting_weezil', 'random_weezil',
  'greeting_cedric', 'random_cedric', 'random_storm', 'collision_storm',
  // wave 66: snd060 Trebuchet Firing and snd084 Battering Ram — eager, since each plays the instant its blow lands
  'trebuchet', 'ram',
] as const;

export type SoundName = (typeof SOUNDS)[number];

/** the court's lore lines (sounds/lore): voice, so never preloaded — each is fetched the first time it is spoken */
export const LORE_VOICES = [
  'lore_richard_greet', 'lore_richard_reassure', 'lore_richard_friendsfoes',
  'lore_richard_cedric', 'lore_richard_farewell',
  'lore_leo_castle', 'lore_leo_cedric1', 'lore_leo_cedric2',
  'lore_queen_husband', 'lore_queen_self', 'lore_queen_daughter',
] as const;

export type VoiceName = (typeof LORE_VOICES)[number];

/** where a sound of the manifest is served: lore lines under sounds/lore, the challenge voice lines (c1s01t1a …)
 *  under sounds/voice, the bank under sounds */
export function soundUrl(name: string): string {
  const dir = name.startsWith('lore_') ? 'sounds/lore' : /^c\d+s\d+t\d+[a-z]$/.test(name) ? 'sounds/voice' : 'sounds';
  return `/assets/${dir}/${name}.wav`;
}
