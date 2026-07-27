'use client';
// Tiny audio manager for the extracted Knights' Kingdom WAV bank.
// The original engine pitch-shifted its 8-bit samples for variety; we do the same.
import { playerState } from '@/game/playerState';

const SOUNDS = [
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

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
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
          const dir = name.startsWith('lore_') ? 'sounds/lore' : 'sounds';
          const res = await fetch(`/assets/${dir}/${name}.wav`);
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          this.buffers.set(name, buf);
        } catch {}
      }),
    );
  }

  setVolumes(master: number, sfx: number) {
    this.volume = master;
    this.sfxVolume = sfx;
    if (this.master) this.master.gain.value = master;
  }

  play(name: SoundName, volume = 1, detune = true): AudioBufferSourceNode | null {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return null;
    const buf = this.buffers.get(name);
    if (!buf) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (detune) src.playbackRate.value = 0.92 + Math.random() * 0.16;
    const gain = ctx.createGain();
    gain.gain.value = volume * this.sfxVolume;
    src.connect(gain).connect(this.master);
    src.start();
    return src;
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
  // overlap each other.
  private voiceSrc: AudioBufferSourceNode | null = null;

  playVoice(name: SoundName, volume = 1) {
    this.stopVoice();
    this.voiceSrc = this.play(name, volume, false);
  }

  stopVoice() {
    try { this.voiceSrc?.stop(); } catch {}
    this.voiceSrc = null;
  }

  /** day: birds and breezes · night: owls and wind */
  nightMode = false;

  startAmbience() {
    this.stopAmbience();
    const loop = () => {
      const pool: SoundName[] = this.nightMode
        ? ['owl', 'wind1', 'wind2', 'owl']
        : ['bird1', 'bird2', 'bird3', 'wind1', 'wind2'];
      this.play(pool[Math.floor(Math.random() * pool.length)], 0.35);
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
if (typeof window !== 'undefined') (window as unknown as { __kkaudio: AudioManager }).__kkaudio = audio;
