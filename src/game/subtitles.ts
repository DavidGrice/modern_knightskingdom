// G-09 · the subtitles: driven by the voice channel (audio.voiceListener) — a line it starts that has words shows
// its speaker and its words, for as long as it is spoken and HOLD seconds more to finish reading, until a later line
// or a stop takes it down. The words are the manifest's transcripts: the five challenge lines given to barks
// (barks.ts's BARK_LINES) and the court's lore lines (their cast entries' text, checked against the transcripts by
// loreTranscripts.test.ts). A sound with no words — a greeting, a grunt, a random or collision line — shows nothing:
// no subtitle is made up for it. Drawn by components/hud/Subtitles.tsx.
import { create } from 'zustand';
import { audio } from '@/lib/audio';
import { NPCS } from './data/npcs';
import { BARK_LINES } from './barks';

export interface Subtitle {
  speaker: string;
  text: string;
}

/** seconds a subtitle stays up after its line has been spoken */
export const HOLD = 0.8;

const SUBTITLES = new Map<string, Subtitle>([
  ...Object.entries(BARK_LINES),
  ...NPCS.flatMap((n) => (n.loreLines ?? []).map((l): [string, Subtitle] => [l.sound, { speaker: n.name, text: l.text }])),
]);

/** the subtitle a voice line shows, or null for a sound with no words */
export function subtitleOf(name: string): Subtitle | null {
  return SUBTITLES.get(name) ?? null;
}

export const useSubtitle = create<{ line: Subtitle | null }>(() => ({ line: null }));

let down: ReturnType<typeof setTimeout> | null = null;

/** a line the voice channel started (its name and length), or a stop (null) */
export function showVoice(v: { name: string; seconds: number } | null): void {
  if (down) clearTimeout(down);
  down = null;
  const line = v ? subtitleOf(v.name) : null;
  useSubtitle.setState({ line });
  if (v && line) down = setTimeout(() => useSubtitle.setState({ line: null }), (v.seconds + HOLD) * 1000);
}

audio.voiceListener = showVoice;
