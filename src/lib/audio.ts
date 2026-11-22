'use client';
// Tiny audio manager for the extracted Knights' Kingdom WAV bank.
// The original engine pitch-shifted its 8-bit samples for variety; we do the same.
import { playerState } from '@/game/playerState';
import { pick } from '@/lib/rng';
import { exposeDebug } from '@/lib/debugHooks';
import { SOUNDS, isBark, soundUrl, type BarkLine, type SoundName, type VoiceName } from './audioCatalog';
import { ambiencePool, type AmbienceBiome } from './ambience';
export type { BarkLine, SoundName, VoiceName } from './audioCatalog';

/** how many sounds loaded on demand stay decoded (the least recently used goes first) */
const ON_DEMAND_KEEP = 16;
/** how many of the latest sounds started the play log keeps */
const PLAY_LOG = 100;
/** the sounds preload() fetches, which stay decoded for good */
const EAGER: ReadonlySet<string> = new Set(SOUNDS);
/** metres from the player at which a sound played where it happens (playAt) has faded to nothing */
const AT_SILENT = 70;

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  /** Wave 66 · the sounds loaded on demand (load()), least recently used first */
  private onDemand = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  /** G-09 · the sounds the server has said are not there (404): asked for once a session, not on every play */
  private missing = new Set<string>();
  /** Wave 66 · every sound started, oldest first (the latest PLAY_LOG) — for probes, through window.__kkaudio */
  played: { name: string; at: number }[] = [];
  private master: GainNode | null = null;
  private ambientTimer: ReturnType<typeof setTimeout> | null = null;
  volume = 0.8;
  sfxVolume = 0.9;
  /** G-09 · the 'mute barks' option (Options > Sound): the ambient barks (audioCatalog's isBark) are not played */
  barksMuted = false;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** G-09 · through load(), so that a preloaded sound asked for before its preload is in waits for that fetch rather
   *  than making its own (ROADMAP.md, "a preloaded voice line asked for before the preload ends is fetched twice") */
  async preload() {
    if (!this.ensureCtx()) return;
    await Promise.all(SOUNDS.map((name) => this.load(name)));
  }

  private async fetchBuffer(ctx: AudioContext, name: string): Promise<AudioBuffer> {
    const res = await fetch(soundUrl(name));
    if (res.status === 404) this.missing.add(name);
    if (!res.ok) throw new Error(`${res.status} ${name}`);
    return ctx.decodeAudioData(await res.arrayBuffer());
  }

  /** Wave 66 · a sound that is not preloaded — a voice line, a rare sample of the bank — fetched and decoded the first
   *  time it is asked for, and kept while it is among the last ON_DEMAND_KEEP used. Null when it cannot be had (no
   *  audio, or no such file: CI and a fresh worktree have no assets); it never throws. A preloaded sound comes back at
   *  once. G-09 · a preloaded sound it fetches is kept with the preloaded (preload() goes through here too); a sound
   *  the server said is not there is not asked for again (a failed fetch is: it may come back). */
  load(name: string): Promise<AudioBuffer | null> {
    const ctx = this.ensureCtx();
    if (!ctx || this.missing.has(name)) return Promise.resolve(null);
    const buf = this.loaded(name);
    if (buf) return Promise.resolve(buf);
    let p = this.loading.get(name);
    if (!p) {
      p = this.fetchBuffer(ctx, name).then(
        (b) => {
          this.loading.delete(name);
          if (EAGER.has(name)) {
            this.buffers.set(name, b);
            return b;
          }
          this.onDemand.set(name, b);
          if (this.onDemand.size > ON_DEMAND_KEEP) this.onDemand.delete(this.onDemand.keys().next().value!);
          return b;
        },
        () => {
          this.loading.delete(name);
          return null;
        },
      );
      this.loading.set(name, p);
    }
    return p;
  }

  /** a sound already decoded — preloaded, or loaded on demand, which then counts as the latest used */
  private loaded(name: string): AudioBuffer | undefined {
    const buf = this.onDemand.get(name);
    if (!buf) return this.buffers.get(name);
    this.onDemand.delete(name);
    this.onDemand.set(name, buf);
    return buf;
  }

  setVolumes(master: number, sfx: number) {
    this.volume = master;
    this.sfxVolume = sfx;
    if (this.master) this.master.gain.value = master;
  }

  play(name: SoundName, volume = 1, detune = true): AudioBufferSourceNode | null {
    const ctx = this.ensureCtx();
    if (!ctx) return null;
    const buf = this.buffers.get(name);
    return buf ? this.start(ctx, name, buf, volume, detune) : null;
  }

  /** Wave 66 · plays a sound that is not preloaded once load() has it (at once if it already has); nothing if it
   *  cannot be had */
  playOnDemand(name: string, volume = 1) {
    if (this.barksMuted && isBark(name)) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const buf = this.loaded(name);
    if (buf) {
      this.start(ctx, name, buf, volume, true);
      return;
    }
    void this.load(name).then((b) => {
      if (b) this.start(ctx, name, b, volume, true);
    });
  }

  private start(ctx: AudioContext, name: string, buf: AudioBuffer, volume: number, detune: boolean) {
    if (!this.master) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (detune) src.playbackRate.value = 0.92 + Math.random() * 0.16;
    const gain = ctx.createGain();
    gain.gain.value = volume * this.sfxVolume;
    src.connect(gain).connect(this.master);
    src.start();
    this.logPlayed(name);
    return src;
  }

  private logPlayed(name: string) {
    this.played.push({ name, at: performance.now() });
    if (this.played.length > PLAY_LOG) this.played.shift();
  }

  /** Positional one-shot (Phase 23): full volume within 14 units of the
   *  player, fading to silence by 70 — a mob dying at the homestead is
   *  inaudible from another realm (instances sit thousands of units apart,
   *  so this also serves as the cross-instance mute). G-09 · a voice of the bank that is not preloaded (a raider's,
   *  a defender's) is loaded first; an ambient bark is silent under 'mute barks'. */
  playAt(name: SoundName | BarkLine, x: number, z: number, volume = 1) {
    if (this.barksMuted && isBark(name)) return;
    const d = Math.hypot(x - playerState.x, z - playerState.z);
    const FULL = 14;
    if (d >= AT_SILENT) return;
    const fade = d <= FULL ? 1 : 1 - (d - FULL) / (AT_SILENT - FULL);
    if (EAGER.has(name)) this.play(name as SoundName, volume * fade);
    else this.playOnDemand(name, volume * fade);
  }

  /** G-09 · whether a sound played at (x, z) would be heard at all (playAt's reach): a bark out of hearing spends
   *  nothing (barks.ts) */
  audible(x: number, z: number): boolean {
    return Math.hypot(x - playerState.x, z - playerState.z) < AT_SILENT;
  }

  // ---- exclusive voice channel (Phase 23) ----
  // Voiced NPC lines share one channel: starting a new line (or advancing
  // dialogue with Next) stops whatever line is still playing, so barks never
  // overlap each other. Wave 66: a line that is not preloaded (every lore line) is loaded first, and spoken only if
  // no later line or stop has come in meanwhile — a quick Next or close is never overtaken by a slow load.
  // G-09: an ambient bark (audioCatalog's isBark) under 'mute barks' is not asked for at all, and stops nothing.
  private voiceSrc: AudioBufferSourceNode | null = null;
  /** how many lines have been asked for or stopped: each takes its number */
  private voiceCalls = 0;
  /** G-09 · the number of the line being loaded to be spoken (-1: none) — it counts as speaking meanwhile */
  private voiceLoading = -1;
  /** G-09 · the name of the line last asked for on the voice channel (voiceLine) */
  private voiceName: string | null = null;
  /** G-09 · told of each line the voice channel starts (its name and length in seconds) and of each stop (null) —
   *  the subtitles (game/subtitles.ts) */
  voiceListener: ((line: { name: string; seconds: number } | null) => void) | null = null;

  /** G-09 · `onEnd` is called once the line has been spoken to its end — not when a later line or a stop cuts it, nor
   *  when it cannot be had: what a sequence (barks.ts's camp introduction) goes on from; `onStart` once it begins to
   *  be spoken (what barks.ts's record of the lines heard waits for) */
  playVoice(name: SoundName | VoiceName | BarkLine, volume = 1, onEnd?: () => void, onStart?: () => void) {
    if (this.barksMuted && isBark(name)) return;
    this.stopVoice();
    this.voiceName = name;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const buf = this.loaded(name);
    if (buf) {
      this.speak(ctx, name, buf, volume, onEnd, onStart);
      return;
    }
    const call = this.voiceCalls;
    this.voiceLoading = call;
    void this.load(name).then((b) => {
      if (this.voiceLoading === call) this.voiceLoading = -1;
      if (b && call === this.voiceCalls) this.speak(ctx, name, b, volume, onEnd, onStart);
    });
  }

  private speak(ctx: AudioContext, name: string, buf: AudioBuffer, volume: number, onEnd?: () => void, onStart?: () => void) {
    const src = this.start(ctx, name, buf, volume, false);
    this.voiceSrc = src;
    if (!src) return;
    src.onended = () => {
      if (this.voiceSrc !== src) return;
      this.voiceSrc = null;
      onEnd?.();
    };
    onStart?.();
    this.voiceListener?.({ name, seconds: buf.duration });
  }

  /** G-09 · whether a voice line is being spoken now, or loaded to be spoken (no later line or stop has come since):
   *  what a court mutter waits on (courtBarks.ts) */
  get speaking(): boolean {
    return !!this.voiceSrc || this.voiceLoading === this.voiceCalls;
  }

  /** G-09 · the line the voice channel is speaking, or loading to speak (null while it is quiet): whose it is, for a
   *  last word that cuts its speaker's own (barks.ts) */
  get voiceLine(): string | null {
    return this.speaking ? this.voiceName : null;
  }

  stopVoice() {
    this.voiceCalls++;
    try { this.voiceSrc?.stop(); } catch {}
    this.voiceSrc = null;
    this.voiceListener?.(null);
  }

  /** day: birds and breezes · night: owls and wind */
  nightMode = false;

  /** Wave 29 · the biome the ambience loop plays for (ambience.ts's ambiencePool says what each one draws). Re-read
   *  fresh each loop iteration, same live pattern as `nightMode` above (set once per frame by DayNight.tsx off
   *  `st.destination`, not baked in when the loop started) — a destination change mid-ambience picks up the new pool
   *  on its very next beat rather than waiting for a restart. */
  ambienceBiome: AmbienceBiome = 'meadow';

  startAmbience() {
    this.stopAmbience();
    const loop = () => {
      const pool = ambiencePool(this.ambienceBiome, this.nightMode);
      if (pool) this.play(pick(pool), 0.35);
      this.ambientTimer = setTimeout(loop, 4000 + Math.random() * 7000);
    };
    this.ambientTimer = setTimeout(loop, 1500);
  }

  // ---- persistent loops (rain etc.) ----
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();

  setLoop(name: SoundName, volume: number) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const existing = this.loops.get(name);
    if (volume <= 0.001) {
      if (existing) {
        existing.src.stop();
        this.loops.delete(name);
      }
      return;
    }
    if (existing) {
      existing.gain.gain.value = volume * this.sfxVolume;
      return;
    }
    const buf = this.buffers.get(name);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume * this.sfxVolume;
    src.connect(gain).connect(this.master);
    src.start();
    this.logPlayed(name);
    this.loops.set(name, { src, gain });
  }

  stopAllLoops() {
    for (const [, l] of this.loops) l.src.stop();
    this.loops.clear();
  }

  stopAmbience() {
    if (this.ambientTimer) clearTimeout(this.ambientTimer);
    this.ambientTimer = null;
  }
}

export const audio = new AudioManager();
// test hook, same convention as window.__kk / __kkp / __kkenv
exposeDebug('__kkaudio', audio);
