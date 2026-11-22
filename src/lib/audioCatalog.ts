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

/** G-09 · the challenge lines the manifest gives to barks (use 'bark', owner G-09): Cedric introducing himself at his
 *  camp (c1s03t1a-c, one sequence), his taunt as his raid comes (c2s01t2a) and as the player builds under it (c2s02t4a).
 *  Every other challenge line is the campaign's (G-12a on). */
export const BARK_VOICES = ['c1s03t1a', 'c1s03t1b', 'c1s03t1c', 'c2s01t2a', 'c2s02t4a'] as const;

/** G-09 · the bank's voices the barks play that are not preloaded: the court's random and collision lines, the
 *  raiders' set (snd070-072, the bank's GenB) and the villagers' (snd073-074, GenG), which the defenders speak with */
export const BANK_VOICES = [
  'collision_john', 'collision_queen', 'collision_richard', 'collision_king',
  'random_john', 'random_queen', 'random_richard', 'random_king',
  'collision_raider', 'greeting_raider', 'random_raider', 'collision_villager', 'greeting_villager',
] as const;

/** a line the barks may say: one of the bank's voices (preloaded or not) or a challenge line given to barks */
export type BarkLine = SoundName | (typeof BANK_VOICES)[number] | (typeof BARK_VOICES)[number];

/** G-09 · an ambient bark — a greeting (every figure's as a dialogue opens, DialoguePanel's playVoice: `villager` is
 *  the greetSound of the village's, the settlements' and the interiors' people), a random or collision line, a taunt —
 *  which the 'mute barks' option silences; never a lore line, which the player asks for, nor Cedric's war cry
 *  (`warcry`, snd053), which sounds with the horn as a raid's alarm (a plain play(), as the `villager` grunts that
 *  answer the player's own actions are) */
export function isBark(name: string): boolean {
  return /^(greeting|random|collision)_/.test(name) || name === 'villager' || (BARK_VOICES as readonly string[]).includes(name);
}

/** where a sound of the manifest is served: lore lines under sounds/lore, the challenge voice lines (c1s01t1a …)
 *  under sounds/voice, the bank under sounds */
export function soundUrl(name: string): string {
  const dir = name.startsWith('lore_') ? 'sounds/lore' : /^c\d+s\d+t\d+[a-z]$/.test(name) ? 'sounds/voice' : 'sounds';
  return `/assets/${dir}/${name}.wav`;
}
