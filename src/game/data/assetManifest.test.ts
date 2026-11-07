import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LORE_VOICES, SOUNDS, soundUrl } from '@/lib/audioCatalog';
import MANIFEST from './assetManifest.json';

// Wave 66 (G-01) · the tracked list of what the local copy script (scripts/prepare-assets.mjs, gitignored) takes out of
// the original game's extraction. Its own consistency, and its agreement with the code that names its sounds, are
// checked always; whether public/assets holds what it lists only where public/assets exists (never in CI).

type Voice = { id: string; src: string; use: string; owner: string; text: string | null };
const voices: Voice[] = MANIFEST.voices;
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

/** the lines FEATURE_PLAN.md's G-09 barks with; every other line is the campaign's, by challenge */
const BARKS = ['c1s03t1a', 'c1s03t1b', 'c1s03t1c', 'c2s01t2a', 'c2s02t4a'];
const CAMPAIGN: Record<string, string> = { 1: 'G-12a', 2: 'G-12b', 3: 'G-12b', 4: 'G-13', 5: 'G-14a', 6: 'G-14b' };

describe('the asset manifest', () => {
  it('names every sound, voice line, lore line, clip and module once', () => {
    // sounds, voice lines and lore lines share one namespace: lib/audio.ts loads each by its name alone
    expect(dupes([...ids(MANIFEST.sounds), ...ids(voices), ...ids(MANIFEST.lore)])).toEqual([]);
    expect(dupes(MANIFEST.anims)).toEqual([]);
    expect(dupes(ids(MANIFEST.objrig))).toEqual([]);
    expect(dupes(MANIFEST.sounds.map((s) => s.src))).toEqual([]);
    expect(dupes(voices.map((v) => v.src))).toEqual([]);
  });

  it('holds the whole original bank: 92 sounds, 92 clips, the 196 challenge voice lines', () => {
    expect([MANIFEST.sounds.length, MANIFEST.anims.length, voices.length]).toEqual([92, 92, 196]);
    expect(MANIFEST.sounds.map((s) => s.src.match(/^sounds\/snd(\d{3})_/)?.[1])).toEqual(
      Array.from({ length: 92 }, (_, i) => String(i).padStart(3, '0')),
    );
  });

  it('gives every lore line a voice line of its own', () => {
    const voiceIds = new Set(ids(voices));
    for (const l of MANIFEST.lore) expect(voiceIds.has(l.voice), l.id).toBe(true);
    expect(dupes(MANIFEST.lore.map((l) => l.voice))).toEqual([]);
  });

  it('preloads exactly the sounds the code names, and never a voice line', () => {
    const eager = MANIFEST.sounds.filter((s) => s.load === 'eager').map((s) => s.id);
    expect([...eager].sort()).toEqual([...SOUNDS].sort());
    expect(MANIFEST.sounds.every((s) => s.load === 'eager' || s.load === 'on-demand')).toBe(true);
    expect(ids(MANIFEST.lore).sort()).toEqual([...LORE_VOICES].sort());
    // where the copy script puts each kind is where the game looks for it
    for (const s of MANIFEST.sounds) expect(soundUrl(s.id)).toBe(`/assets/sounds/${s.id}.wav`);
    for (const v of voices) expect(soundUrl(v.id)).toBe(`/assets/sounds/voice/${v.id}.wav`);
    for (const l of MANIFEST.lore) expect(soundUrl(l.id)).toBe(`/assets/sounds/lore/${l.id}.wav`);
  });

  it('says who wires each voice line: the barks are G-09\'s, the rest the campaign\'s, by challenge', () => {
    for (const v of voices) {
      const challenge = v.src.match(/challenges\/sounds\/challenge(\d)\//)![1];
      expect(v.id.startsWith(`c${challenge}s`), v.id).toBe(true);
      const owner = BARKS.includes(v.id) ? 'G-09'
        : v.id === 'c5s04t3b' || v.id === 'c5s04t4b' ? 'G-14b' // challenge 5's closing lines, which Challenge VI plays (G-14b)
        : CAMPAIGN[challenge];
      expect([v.owner, v.use], v.id).toEqual([owner, owner === 'G-09' ? 'bark' : 'campaign']);
    }
    expect(voices.filter((v) => v.use === 'bark').map((v) => v.id)).toEqual(BARKS);
  });

  it('keeps a transcript for every line the pak has one for', () => {
    expect(voices.filter((v) => v.text === null).map((v) => v.id)).toEqual(['c1s03t2c', 'c4s02t1b']);
  });
});

const ASSETS = fileURLToPath(new URL('../../../public/assets', import.meta.url));

describe.skipIf(!fs.existsSync(ASSETS))('public/assets against the manifest (this machine only)', () => {
  it('holds every file the manifest lists', () => {
    const want = [
      ...MANIFEST.sounds.map((s) => `sounds/${s.id}.wav`),
      ...voices.map((v) => `sounds/voice/${v.id}.wav`),
      ...MANIFEST.lore.map((l) => `sounds/lore/${l.id}.wav`),
      ...MANIFEST.anims.map((a) => `anims/${a}.json`),
      ...MANIFEST.objrig.flatMap((o) => [`props/objrig/${o.id}.obj`, `props/objrig/${o.id}.mtl`]),
    ];
    expect(want.filter((f) => !fs.existsSync(`${ASSETS}/${f}`))).toEqual([]);
  });

  it('serves each lore line as a copy of the voice line it names', () => {
    for (const l of MANIFEST.lore) {
      expect(fs.readFileSync(`${ASSETS}/sounds/lore/${l.id}.wav`).equals(fs.readFileSync(`${ASSETS}/sounds/voice/${l.voice}.wav`)), l.id).toBe(true);
    }
  });
});
