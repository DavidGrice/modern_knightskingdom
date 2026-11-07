'use client';
// Tiny audio manager for the extracted Knights' Kingdom WAV bank.
// The original engine pitch-shifted its 8-bit samples for variety; we do the same.
import { playerState } from '@/game/playerState';
import { pick } from '@/lib/rng';
import { exposeDebug } from '@/lib/debugHooks';
import { SOUNDS, soundUrl, type SoundName, type VoiceName } from './audioCatalog';
import { ambiencePool, type AmbienceBiome } from './ambience';
export type { SoundName, VoiceName } from './audioCatalog';

/** how many sounds loaded on demand stay decoded (the least recently used goes first) */
const ON_DEMAND_KEEP = 16;
/** how many of the latest sounds started the play log keeps */
const PLAY_LOG = 100;

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  /** Wave 66 · the sounds loaded on demand (load()), least recently used first */
  private onDemand = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  /** Wave 66 · every sound started, oldest first (the latest PLAY_LOG) — for probes, through window.__kkaudio */
  played: { name: string; at: number }[] = [];
  private master: GainNode | null = null;
  private ambientTimer: ReturnType<typeof setTimeout> | null = null;
  volume = 0.8;
  sfxVolume = 0.9;

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

  async preload() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    await Promise.all(
      SOUNDS.map(async (name) => {
        if (this.buffers.has(name)) return;
        try {
          this.buffers.set(name, await this.fetchBuffer(ctx, name));
        } catch {}
      }),
    );
  }

  private async fetchBuffer(ctx: AudioContext, name: string): Promise<AudioBuffer> {
    const res = await fetch(soundUrl(name));
    if (!res.ok) throw new Error(`${res.status} ${name}`);
    return ctx.decodeAudioData(await res.arrayBuffer());
  }

  /** Wave 66 · a sound that is not preloaded — a voice line, a rare sample of the bank — fetched and decoded the first
   *  time it is asked for, and kept while it is among the last ON_DEMAND_KEEP used. Null when it cannot be had (no
   *  audio, or no such file: CI and a fresh worktree have no assets); it never throws. A preloaded sound comes back at
   *  once. */
  load(name: string): Promise<AudioBuffer | null> {
    const ctx = this.ensureCtx();
    if (!ctx) return Promise.resolve(null);
    const buf = this.loaded(name);
    if (buf) return Promise.resolve(buf);
    let p = this.loading.get(name);
    if (!p) {
      p = this.fetchBuffer(ctx, name).then(
        (b) => {
          this.loading.delete(name);
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
   *  so this also serves as the cross-instance mute). */
  playAt(name: SoundName, x: number, z: number, volume = 1) {
    const d = Math.hypot(x - playerState.x, z - playerState.z);
    const FULL = 14;
    const SILENT = 70;
    if (d >= SILENT) return;
    const fade = d <= FULL ? 1 : 1 - (d - FULL) / (SILENT - FULL);
    this.play(name, volume * fade);
  }

  // ---- exclusive voice channel (Phase 23) ----
  // Voiced NPC lines share one channel: starting a new line (or advancing
  // dialogue with Next) stops whatever line is still playing, so barks never
  // overlap each other. Wave 66: a line that is not preloaded (every lore line) is loaded first, and spoken only if
  // no later line or stop has come in meanwhile — a quick Next or close is never overtaken by a slow load.
  private voiceSrc: AudioBufferSourceNode | null = null;
  /** how many lines have been asked for or stopped: each takes its number */
  private voiceCalls = 0;

  playVoice(name: SoundName | VoiceName, volume = 1) {
    this.stopVoice();
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const buf = this.loaded(name);
    if (buf) {
      this.voiceSrc = this.start(ctx, name, buf, volume, false);
      return;
    }
    const call = this.voiceCalls;
    void this.load(name).then((b) => {
      if (b && call === this.voiceCalls) this.voiceSrc = this.start(ctx, name, b, volume, false);
    });
  }

  stopVoice() {
    this.voiceCalls++;
    try { this.voiceSrc?.stop(); } catch {}
    this.voiceSrc = null;
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
