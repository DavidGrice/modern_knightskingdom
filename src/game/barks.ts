// G-09 · the cast's barks: one table of who says what, when, and how often (BARKS), and the one gate every bark goes
// through (bark). Cedric taunts a raid he leads and a player who builds under it, and introduces himself at his camp;
// the raiders speak with the bank's GenB set and the defenders with its GenG set (the manifest names it "villager");
// the court mutters and protests (courtBarks.ts). Each line has a cooldown of its own and each speaker a gap, a raid
// never hears a line twice, and nothing fires on every frame or every blow. The 'mute barks' option silences all of it
// (audio.barksMuted), and a muted bark spends no cooldown. Only the five challenge lines the manifest gives to barks
// are used (audioCatalog's BARK_VOICES); every other one is the campaign's. A leaf: it imports the audio manager alone,
// and the game tells it what it needs (raidWatch) — the store's slices call it.
import { audio } from '@/lib/audio';
import type { BARK_VOICES, BarkLine } from '@/lib/audioCatalog';
import { exposeDebug } from '@/lib/debugHooks';

export type BarkEvent =
  | 'cedricRaid' | 'builtUnderRaid' | 'cedricCamp'
  | 'raidersCome' | 'raiderStruck' | 'raiderFalls'
  | 'orderHeard' | 'defenderDown'
  | 'courtIdle' | 'courtBump';

export interface BarkDef {
  /** the line, or the lines spoken in order as one sequence (none of them ever alone, but the first); empty where the
   *  caller gives it from its own data — a court member's randomSound or collisionSound, a kind's DEATH_BARK */
  lines: readonly BarkLine[];
  /** who says it (empty: the caller's — the court member's name, the kind that fell) */
  speaker: string;
  /** seconds before the same line is heard again (from this or any other event) */
  cooldown: number;
  /** how it is heard: on the voice channel (one line at a time, subtitled where it has words), where its speaker
   *  stands (it fades with distance), or at the player's ear */
  channel: 'voice' | 'at' | 'near';
  volume: number;
  /** always a raid's: never twice in one raid */
  raid?: boolean;
  /** a last word (a fall): no gap of its speaker's holds it back — Cedric falling just after a taunt still says his */
  last?: boolean;
}

/** Cedric's name, as his subtitles show it */
const CEDRIC = 'Cedric the Bull';

export const BARKS: Record<BarkEvent, BarkDef> = {
  // Cedric: in place of his wordless greeting as a raid he leads arrives; when the player builds while it is on; and
  // the first time the player comes up to his camp — his introduction, one sequence in the original
  cedricRaid: { lines: ['c2s01t2a'], speaker: CEDRIC, cooldown: 0, channel: 'voice', volume: 0.9, raid: true },
  builtUnderRaid: { lines: ['c2s02t4a'], speaker: CEDRIC, cooldown: 0, channel: 'voice', volume: 0.9, raid: true },
  cedricCamp: { lines: ['c1s03t1a', 'c1s03t1b', 'c1s03t1c'], speaker: CEDRIC, cooldown: 600, channel: 'voice', volume: 0.9 },
  // the raiders (GenB): the pack's hail as a raid comes, a thief's grunt as he is struck and runs with the goods, and
  // the fall of any raider of the rank and file (data/enemies.ts's DEATH_BARK)
  raidersCome: { lines: ['greeting_raider'], speaker: 'Raider', cooldown: 30, channel: 'near', volume: 0.6, raid: true },
  raiderStruck: { lines: ['collision_raider'], speaker: 'Raider', cooldown: 10, channel: 'at', volume: 0.85 },
  raiderFalls: { lines: ['random_raider'], speaker: 'Raider', cooldown: 8, channel: 'at', volume: 0.85, last: true },
  // the defenders (GenG): an order the player gives answered, and a defender knocked down
  orderHeard: { lines: ['greeting_villager'], speaker: 'Defender', cooldown: 8, channel: 'near', volume: 0.7 },
  defenderDown: { lines: ['collision_villager'], speaker: 'Defender', cooldown: 10, channel: 'at', volume: 0.85 },
  // the court: a line now and then while the player stands idle nearby, and a protest when he walks into one
  courtIdle: { lines: [], speaker: '', cooldown: 60, channel: 'voice', volume: 0.8 },
  courtBump: { lines: [], speaker: '', cooldown: 8, channel: 'voice', volume: 0.9 },
};

/** the words of the challenge lines given to barks, as the manifest has them, trimmed (barks.test.ts) — what their
 *  subtitles show */
export const BARK_LINES: Record<(typeof BARK_VOICES)[number], { speaker: string; text: string }> = {
  c1s03t1a: { speaker: CEDRIC, text: 'My name is Cedric the Bull!' },
  c1s03t1b: { speaker: CEDRIC, text: "Don't listen to what they say. I should be ruling the Knights' Kingdom!" },
  c1s03t1c: { speaker: CEDRIC, text: 'I’ll let you in on a secret but I don’t want Leo to hear.' },
  c2s01t2a: { speaker: CEDRIC, text: 'Haha!  Nobody can defy Cedric the Bull. Your defences are useless!' },
  c2s02t4a: { speaker: CEDRIC, text: 'Build all you want to! Nothing will stop me!' },
};

/** seconds a speaker keeps quiet after any bark of his, whatever the line */
export const SPEAKER_GAP = 4;

/** when each line may be heard again, and each speaker speak again (seconds, the bark clock) */
const lineFree = new Map<string, number>();
const speakerFree = new Map<string, number>();
/** the lines heard in the raid under way (newRaid empties it) */
const raidHeard = new Set<string>();
/** every line heard this session, in the order first heard — one on the voice channel once it begins to be spoken (cut
 *  while it loads, or not there, it was not heard), any other once it is played (nothing cuts those) — what the campaign
 *  runner (G-12a) reads to leave out a line the player has already heard (wasBarked) */
export const barked = new Set<string>();

/** what the game tells the barks: whether Cedric stands in a raid on the homestead now (raidDirector.ts sets it) */
export const raidWatch = { cedricUp: (): boolean => false };

export function wasBarked(line: string): boolean {
  return barked.has(line);
}

/** a raid has come (raidDirector's raidArrives, Cedric's war party): no line has been heard in it yet */
export function newRaid(): void {
  raidHeard.clear();
}

/** The one gate: the event's bark, unless barks are muted, it would be heard where its speaker stands and he is out of
 *  hearing, its speaker spoke less than SPEAKER_GAP ago (but for a last word), one of its lines is still cooling down,
 *  or (a raid's) one was heard in this raid — none of which spends anything. Returns whether it was barked. `line` and
 *  `speaker` stand in for the table's (for the court and a fallen kind), `at` is where a bark heard where its speaker
 *  stands comes from, and `now` (seconds) is for the tests. */
export function bark(event: BarkEvent, o: { line?: BarkLine; speaker?: string; at?: { x: number; z: number }; raid?: boolean; now?: number } = {}): boolean {
  const def = BARKS[event];
  const lines = o.line ? [o.line] : def.lines;
  const speaker = o.speaker ?? def.speaker;
  const raid = o.raid ?? !!def.raid;
  const now = o.now ?? performance.now() / 1000;
  if (!lines.length || audio.barksMuted) return false;
  // a raider falling far off: no one hears it, and the raid's one line of his kind waits for one who does
  if (def.channel === 'at' && o.at && !audio.audible(o.at.x, o.at.z)) return false;
  if (!def.last && now < (speakerFree.get(speaker) ?? 0)) return false;
  if (lines.some((l) => now < (lineFree.get(l) ?? 0) || (raid && raidHeard.has(l)))) return false;
  // a last word cuts its speaker's own line still being said (Cedric falling mid-taunt), rather than talk over it
  const said = def.last ? audio.voiceLine : null;
  if (said && said in BARK_LINES && BARK_LINES[said as keyof typeof BARK_LINES].speaker === speaker) audio.stopVoice();
  speakerFree.set(speaker, now + SPEAKER_GAP);
  for (const l of lines) {
    lineFree.set(l, now + def.cooldown);
    if (raid) raidHeard.add(l);
  }
  if (def.channel === 'voice') {
    // a sequence goes on only from a line spoken to its end: cut short, or not there, the rest is not said — and each
    // line goes in the session's record only once it begins to be spoken
    const say = (i: number): void =>
      audio.playVoice(lines[i], def.volume, i + 1 < lines.length ? () => say(i + 1) : undefined, () => { barked.add(lines[i]); });
    say(0);
  } else {
    barked.add(lines[0]);
    if (def.channel === 'at' && o.at) audio.playAt(lines[0], o.at.x, o.at.z, def.volume);
    else audio.playOnDemand(lines[0], def.volume);
  }
  return true;
}

/** G-09 · a line said outside the gate (the two Storm says as her duel ends, duel.ts): its cooldown is spent as the
 *  event's would be, so the court does not say it again straight after */
export function spent(event: BarkEvent, line: BarkLine, now = performance.now() / 1000): void {
  lineFree.set(line, Math.max(lineFree.get(line) ?? 0, now + BARKS[event].cooldown));
}

/** G-09 · the player built while a raid Cedric leads is on at home (buildSlice's placements): his taunt, once a raid */
export function builtUnderRaid(): void {
  if (raidWatch.cedricUp()) bark('builtUnderRaid');
}

/** G-09 · metres from Cedric's camp at which he hails a player coming up to it (CedricCamp.tsx) */
export const CAMP_HAIL = 14;

/** CedricCamp.tsx's frame: the player is within CAMP_HAIL of the camp with Cedric standing there (`inside`) — on
 *  coming up to it (not every frame he stays), Cedric's introduction; its long cooldown keeps it to once in a while */
export function nearCamp(was: { current: boolean }, inside: boolean, now?: number): void {
  if (inside && !was.current) bark('cedricCamp', { now });
  was.current = inside;
}

/** test hook: the cooldowns and the per-raid record start afresh */
export function resetBarks(): void {
  lineFree.clear();
  speakerFree.clear();
  raidHeard.clear();
  barked.clear();
}

// test hook (window.__kkbarks): the session's record of lines barked, and the table
exposeDebug('__kkbarks', { barked, BARKS });
