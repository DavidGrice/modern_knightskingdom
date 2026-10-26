// CLN-29 · every sound the game has — the extracted WAV bank, with the lore lines under sounds/lore — as a list: what
// audio.ts preloads, and what a SoundName may be. Apart from the audio manager, so that naming a sound does not need it.
export const SOUNDS = [
  'bird1', 'bird2', 'bird3', 'brick_link', 'brick_collide', 'brick_connect',
  'sword_swish', 'door_open', 'step', 'thud', 'flame', 'treasure', 'unlock',
  'wind1', 'wind2', 'owl', 'horn', 'greeting_king', 'villager',
  'rain', 'lightning', 'bat', 'falcon', 'whinny', 'graze',
  'skeleton', 'warcry', 'canter', 'cannon', 'explosion',
  'greeting_queen', 'greeting_richard', 'greeting_john', 'greeting_storm',
  'crossbow', 'drawbridge', 'portcullis', 'longbow',
  'lore_richard_greet', 'lore_richard_reassure', 'lore_richard_friendsfoes',
  'lore_richard_cedric', 'lore_richard_farewell',
  'lore_leo_castle', 'lore_leo_cedric1', 'lore_leo_cedric2',
  'lore_queen_husband', 'lore_queen_self', 'lore_queen_daughter',
  'greeting_gilbert', 'random_gilbert', 'greeting_weezil', 'random_weezil',
  'greeting_cedric', 'random_cedric', 'random_storm', 'collision_storm',
] as const;

export type SoundName = (typeof SOUNDS)[number];
