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
/** every buffer source started, to end one as the browser would (its onended) */
let sources: { onended: null | (() => void) }[] = [];
const held = new Map<string, () => void>();

class FakeBuffer { duration = 2; constructor(readonly url: string) {} }
class FakeContext {
  state = 'running';
  destination = {};
  resume() { return Promise.resolve(); }
  createGain() { return { gain: { value: 1 }, connect: (n: unknown) => n }; }
  createBufferSource() {
    const src = {
      buffer: null as FakeBuffer | null, loop: false, playbackRate: { value: 1 }, onended: null as null | (() => void),
      connect: (n: unknown) => n,
      start: () => { started.push(src.buffer!.url); sources.push(src); },
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
  sources = [];
  fetched = [];
  audio.barksMuted = false;
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

  // G-09 changed this on purpose: a sound the server says is not there (404) is remembered for the session, not
  // fetched again on every play (it was: "and a later try fetches again"); a fetch that failed is tried again
  it('shrugs off a sound that is not there: no throw, nothing played, and it is asked for once; a failed fetch is tried again', async () => {
    missing.add('/assets/sounds/no_such.wav');
    await expect(audio.load('no_such')).resolves.toBeNull();
    audio.playOnDemand('no_such');
    await settle();
    expect(started).toEqual([]);
    expect(fetched).toEqual(['/assets/sounds/no_such.wav']);
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(audio.load('offline')).resolves.toBeNull();
    missing.clear();
    vi.stubGlobal('fetch', (url: string) => { fetched.push(url); return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve({ url }) }); });
    expect(await audio.load('offline')).toBeInstanceOf(FakeBuffer);
    await expect(audio.load('no_such')).resolves.toBeNull();
    expect(fetched).toEqual(['/assets/sounds/no_such.wav', '/assets/sounds/offline.wav']);
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

// G-09 · golden, run on the unchanged base before the fold-in: the duel's collision line, with no file there
describe('golden: the duel\'s collision line', () => {
  // changed on purpose: the preload's 404 is remembered, so no duel asks again (base: each duel that ended fetched it,
  // 2 after the preload's 1)
  it('each duel that ends asks for collision_storm, and with no file there it is fetched once, by the preload', async () => {
    // a manager of its own, as a fresh page has: its preload finds no collision_storm (CI and a fresh worktree)
    vi.resetModules();
    const { audio: fresh } = await import('./audio');
    const { resolveDuel } = await import('@/game/combat/duel');
    missing.add('/assets/sounds/collision_storm.wav');
    await fresh.preload();
    expect(fetched.filter((u) => u.endsWith('/collision_storm.wav'))).toHaveLength(1);
    fetched = [];
    resolveDuel(false, -1);
    await settle();
    resolveDuel(false, -2);
    await settle();
    expect(fetched.filter((u) => u.endsWith('/collision_storm.wav'))).toHaveLength(0);
    expect(started).toEqual([]);
  });
});

describe('G-09 · the audio manager', () => {
  /** a manager of its own, as a fresh page has, with every fetch held until the test lets it come back */
  async function freshHeld() {
    vi.resetModules();
    const { audio: fresh } = await import('./audio');
    vi.stubGlobal('fetch', (url: string) => {
      fetched.push(url);
      const res = { ok: !missing.has(url), status: missing.has(url) ? 404 : 200, arrayBuffer: () => Promise.resolve({ url }) };
      return new Promise((resolve) => held.set(url, () => resolve(res)));
    });
    return fresh;
  }

  it('a preloaded line asked for before the preload is in waits for the preload\'s fetch, and is spoken when it comes', async () => {
    const fresh = await freshHeld();
    void fresh.preload();
    fresh.playVoice('greeting_king');
    expect(fetched.filter((u) => u.endsWith('/greeting_king.wav'))).toHaveLength(1);
    await comeBack('/assets/sounds/greeting_king.wav');
    expect(started).toEqual(['/assets/sounds/greeting_king.wav']);
    // and it is kept with the preloaded: a plain play has it
    fresh.play('greeting_king');
    expect(started).toHaveLength(2);
  });

  it('a preloaded sound asked for before the preload began is kept with the preloaded, and fetched once', async () => {
    const fresh = await freshHeld();
    fresh.playVoice('greeting_queen');
    void fresh.preload();
    await comeBack('/assets/sounds/greeting_queen.wav');
    expect(fetched.filter((u) => u.endsWith('/greeting_queen.wav'))).toHaveLength(1);
    vi.stubGlobal('fetch', (url: string) => Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve({ url }) }));
    for (let i = 0; i < 20; i++) await fresh.load(`lru_${i}`); // past what the loader keeps on demand
    fresh.play('greeting_queen');
    expect(started.filter((u) => u.endsWith('/greeting_queen.wav'))).toHaveLength(2);
  });

  it('mute barks: no greeting, random or collision line, no taunt — and a lore line still speaks', async () => {
    await audio.load('greeting_richard');
    await audio.load('greeting_raider');
    await audio.load('random_gilbert'); // preloaded: played where its speaker stands without a load
    audio.barksMuted = true;
    audio.playVoice('greeting_richard');
    audio.playVoice('c2s01t2a');
    audio.playOnDemand('greeting_raider');
    audio.playAt('random_raider', 0, 0);
    audio.playAt('random_gilbert', 0, 0);
    await settle();
    expect(started).toEqual([]);
    expect(fetched.some((u) => /c2s01t2a|random_raider/.test(u))).toBe(false);
    const lore = LORE_VOICES[3];
    audio.playVoice(lore);
    await comeBack(soundUrl(lore));
    expect(started.map(nameOf)).toEqual([lore]);
    // a muted bark asked for meanwhile does not cut it off
    audio.playVoice('greeting_richard');
    expect(audio.speaking).toBe(true);
  });

  it('a line loaded to be spoken counts as speaking until it is spoken, cut or found missing; onStart only once it begins', async () => {
    audio.stopVoice();
    const starts: string[] = [];
    const [a, b, c] = [LORE_VOICES[5], LORE_VOICES[6], LORE_VOICES[7]];
    audio.playVoice(a, 1, undefined, () => starts.push(a));
    expect([audio.speaking, starts]).toEqual([true, []]); // loading
    await comeBack(soundUrl(a));
    expect([audio.speaking, starts]).toEqual([true, [a]]); // spoken
    sources.at(-1)!.onended!();
    expect(audio.speaking).toBe(false);
    audio.playVoice(b, 1, undefined, () => starts.push(b));
    audio.stopVoice(); // cut while it loads
    expect(audio.speaking).toBe(false);
    await comeBack(soundUrl(b));
    expect([audio.speaking, starts]).toEqual([false, [a]]);
    missing.add(soundUrl(c));
    audio.playVoice(c, 1, undefined, () => starts.push(c));
    expect(audio.speaking).toBe(true);
    await comeBack(soundUrl(c)); // not there
    expect([audio.speaking, starts]).toEqual([false, [a]]);
  });

  it('a voice of the bank that is not preloaded plays where its speaker stands, loaded first', async () => {
    audio.playAt('collision_raider', 0, 0);
    await settle();
    expect(started).toEqual(['/assets/sounds/collision_raider.wav']);
    audio.playAt('collision_raider', 500, 500); // out of hearing
    await settle();
    expect(started).toHaveLength(1);
  });

  it('tells its listener each line it starts and each stop, and calls onEnd only for a line spoken to its end', async () => {
    const heard: unknown[] = [];
    audio.voiceListener = (v) => heard.push(v);
    let ended = 0;
    await audio.load('greeting_storm');
    audio.playVoice('greeting_storm', 1, () => ended++);
    expect(heard).toEqual([null, { name: 'greeting_storm', seconds: 2 }]);
    sources.at(-1)!.onended!();
    expect([ended, audio.speaking]).toEqual([1, false]);
    audio.playVoice('greeting_storm', 1, () => ended++);
    const cut = sources.at(-1)!;
    audio.stopVoice();
    cut.onended!();
    expect([ended, heard.at(-1)]).toEqual([1, null]);
    audio.voiceListener = null;
  });
});
