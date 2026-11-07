import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from './audio';
import { LORE_VOICES, SOUNDS, soundUrl } from './audioCatalog';

// Wave 66 (G-01) · the audio manager against a stand-in Web Audio: what it preloads, and the on-demand loader voice
// lines and rare samples go through. The manager is one instance for the whole file, so each test names its own sounds.

/** every buffer source started, by the sound its buffer was decoded from */
let started: string[] = [];
/** every URL fetched; a URL in `missing` answers 404, one in `held` waits until the test lets it come back */
let fetched: string[] = [];
const missing = new Set<string>();
const held = new Map<string, () => void>();

class FakeBuffer { constructor(readonly url: string) {} }
class FakeContext {
  state = 'running';
  destination = {};
  resume() { return Promise.resolve(); }
  createGain() { return { gain: { value: 1 }, connect: (n: unknown) => n }; }
  createBufferSource() {
    const src = {
      buffer: null as FakeBuffer | null, loop: false, playbackRate: { value: 1 },
      connect: (n: unknown) => n,
      start: () => { started.push(src.buffer!.url); },
      stop: () => {},
    };
    return src;
  }
  decodeAudioData(ab: { url: string }) { return Promise.resolve(new FakeBuffer(ab.url)); }
}

const settle = async () => { for (let k = 0; k < 10; k++) await Promise.resolve(); };
const comeBack = async (url: string) => { held.get(url)!(); held.delete(url); await settle(); };
const nameOf = (url: string) => url.split('/').pop()!.replace('.wav', '');

beforeEach(() => {
  started = [];
  fetched = [];
  missing.clear();
  vi.stubGlobal('window', {});
  vi.stubGlobal('AudioContext', FakeContext);
  vi.stubGlobal('fetch', (url: string) => {
    fetched.push(url);
    const res = { ok: !missing.has(url), status: missing.has(url) ? 404 : 200, arrayBuffer: () => Promise.resolve({ url }) };
    if (!url.includes('/held_') && !url.includes('/lore/')) return Promise.resolve(res);
    return new Promise((resolve) => held.set(url, () => resolve(res)));
  });
});
afterEach(() => { vi.unstubAllGlobals(); held.clear(); });

describe('the audio manager', () => {
  it('preloads the bank it names and no voice line', async () => {
    await audio.preload();
    expect(fetched.sort()).toEqual(SOUNDS.map(soundUrl).sort());
    expect(fetched.some((u) => /\/sounds\/(lore|voice)\//.test(u))).toBe(false);
    expect(fetched).toContain('/assets/sounds/trebuchet.wav');
    expect(fetched).toContain('/assets/sounds/ram.wav');
    // a preloaded sound plays at once, and the play log names it
    audio.play('ram');
    expect(started).toEqual(['/assets/sounds/ram.wav']);
    expect(audio.played.at(-1)?.name).toBe('ram');
  });

  it('serves each kind of sound from its own folder', () => {
    expect(soundUrl('trebuchet')).toBe('/assets/sounds/trebuchet.wav');
    expect(soundUrl('lore_leo_castle')).toBe('/assets/sounds/lore/lore_leo_castle.wav');
    expect(soundUrl('c4s02t2a')).toBe('/assets/sounds/voice/c4s02t2a.wav');
  });

  it('loads a sound that is not preloaded when it is first played, once', async () => {
    audio.playOnDemand('mug_empty');
    audio.playOnDemand('mug_empty');
    await settle();
    expect(fetched).toEqual(['/assets/sounds/mug_empty.wav']);
    expect(started).toEqual(['/assets/sounds/mug_empty.wav', '/assets/sounds/mug_empty.wav']);
  });

  it('shrugs off a sound that is not there: no throw, nothing played, and a later try fetches again', async () => {
    missing.add('/assets/sounds/no_such.wav');
    await expect(audio.load('no_such')).resolves.toBeNull();
    audio.playOnDemand('no_such');
    await settle();
    expect(started).toEqual([]);
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(audio.load('offline')).resolves.toBeNull();
    missing.clear();
    vi.stubGlobal('fetch', (url: string) => { fetched.push(url); return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve({ url }) }); });
    expect(await audio.load('no_such')).toBeInstanceOf(FakeBuffer);
  });

  it('keeps the 16 sounds used last, and lets the least recently used go', async () => {
    const names = Array.from({ length: 17 }, (_, i) => `lru_${i}`);
    for (const n of names.slice(0, 16)) await audio.load(n);
    await audio.load('lru_0'); // used again: lru_1 is now the oldest
    await audio.load('lru_16');
    fetched = [];
    for (const n of ['lru_0', 'lru_2', 'lru_16']) await audio.load(n);
    expect(fetched).toEqual([]);
    await audio.load('lru_1');
    expect(fetched).toEqual(['/assets/sounds/lru_1.wav']);
  });

  it('speaks a lore line once it is loaded, unless a later line or a stop came first', async () => {
    const [a, b, c] = LORE_VOICES;
    audio.playVoice(a);
    audio.playVoice(b); // Next, before the first line's load is in
    await comeBack(soundUrl(b));
    await comeBack(soundUrl(a));
    expect(started.map(nameOf)).toEqual([b]);
    audio.playVoice(c);
    audio.stopVoice(); // the panel closed
    await comeBack(soundUrl(c));
    expect(started.map(nameOf)).toEqual([b]);
    // once loaded, a line is spoken at once
    audio.playVoice(a);
    expect(started.map(nameOf)).toEqual([b, a]);
  });
});
