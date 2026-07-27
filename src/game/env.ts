'use client';
// Shared mutable world-environment state, updated by the DayNight/Weather
// systems each frame and read by lighting, sky, wildlife, audio and gameplay
// (no store churn — these change every frame).

export const worldEnv = {
  /** 0..1 time of day: 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk */
  time: 0.3,
  /** seconds for a full day */
  dayLength: 720,
  /** 0 = full day, 1 = full night (smoothed) */
  night: 0,
  /** 0..1 rain amount (fades in/out) */
  rain: 0,
  /** true while a rain spell is active (target for the fade) */
  raining: false,
  /** 0..1 mist/fog weather amount (fades in/out, independent of rain) */
  mist: 0,
  /** true while a mist spell is active (target for the fade) */
  misting: false,
  /** transient lightning flash 0..1, decays fast */
  flash: 0,
  /** advance clock? (paused in menus) */
  running: true,
  /** performance.now() timestamp the Night-Vision Brew's effect ends, 0 = inactive */
  nightVisionUntil: 0,
  /** full in-game days elapsed (see DayNight.tsx), drives seasons */
  dayCount: 0,
};

/** Spring/Summer/Autumn/Winter, ~`DAYS_PER_SEASON` in-game days each — a
 *  full "year" is a session-scale arc (with the default 12-minute day, about
 *  2.4 real hours), not tied to any real-world calendar. */
export const SEASON_NAMES = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export const DAYS_PER_SEASON = 3;
export function seasonOf(dayCount: number): number {
  return Math.floor(dayCount / DAYS_PER_SEASON) % 4;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkenv = worldEnv;
}

export function nightFactor(time: number, winterBias = 0): number {
  // sun elevation: sin curve peaking at noon; night when below horizon
  const elev = Math.sin((time - 0.25) * Math.PI * 2);
  // smooth twilight band; winterBias nudges the whole curve up, widening
  // the night window (and narrowing the effective daylight one) rather than
  // reworking the fixed day-length clock itself for a seasonal variant
  return Math.min(1, Math.max(0, 0.5 - elev * 2.2 + winterBias));
}

export function clockLabel(time: number): string {
  const h = Math.floor(time * 24);
  const m = Math.floor((time * 24 - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** lerp between color/intensity stops keyed by time of day */
export interface EnvStop {
  t: number;
  sun: [number, number, number];
  sunI: number;
  amb: [number, number, number];
  ambI: number;
  fog: [number, number, number];
  sky: [number, number, number];
}

export const ENV_STOPS: EnvStop[] = [
  { t: 0.0,  sun: [0.35, 0.45, 0.8], sunI: 0.25, amb: [0.25, 0.3, 0.55], ambI: 0.28, fog: [0.04, 0.05, 0.1],  sky: [0.06, 0.07, 0.16] },
  { t: 0.22, sun: [0.35, 0.45, 0.8], sunI: 0.25, amb: [0.25, 0.3, 0.55], ambI: 0.3,  fog: [0.07, 0.07, 0.13], sky: [0.1, 0.09, 0.2] },
  { t: 0.28, sun: [1.0, 0.62, 0.36], sunI: 1.3,  amb: [0.8, 0.62, 0.5],  ambI: 0.55, fog: [0.75, 0.6, 0.5],   sky: [0.9, 0.65, 0.45] },
  { t: 0.35, sun: [1.0, 0.93, 0.82], sunI: 2.1,  amb: [0.87, 0.91, 1.0], ambI: 0.75, fog: [0.74, 0.84, 0.91], sky: [1, 1, 1] },
  { t: 0.65, sun: [1.0, 0.95, 0.85], sunI: 2.1,  amb: [0.87, 0.91, 1.0], ambI: 0.75, fog: [0.74, 0.84, 0.91], sky: [1, 1, 1] },
  { t: 0.72, sun: [1.0, 0.55, 0.3],  sunI: 1.2,  amb: [0.85, 0.6, 0.45], ambI: 0.5,  fog: [0.7, 0.5, 0.42],   sky: [0.95, 0.55, 0.4] },
  { t: 0.78, sun: [0.35, 0.45, 0.8], sunI: 0.25, amb: [0.25, 0.3, 0.55], ambI: 0.3,  fog: [0.07, 0.07, 0.13], sky: [0.1, 0.09, 0.2] },
  { t: 1.0,  sun: [0.35, 0.45, 0.8], sunI: 0.25, amb: [0.25, 0.3, 0.55], ambI: 0.28, fog: [0.04, 0.05, 0.1],  sky: [0.06, 0.07, 0.16] },
];

export function sampleEnv(time: number): EnvStop {
  let a = ENV_STOPS[0];
  let b = ENV_STOPS[ENV_STOPS.length - 1];
  for (let i = 0; i < ENV_STOPS.length - 1; i++) {
    if (time >= ENV_STOPS[i].t && time <= ENV_STOPS[i + 1].t) {
      a = ENV_STOPS[i];
      b = ENV_STOPS[i + 1];
      break;
    }
  }
  const f = b.t === a.t ? 0 : (time - a.t) / (b.t - a.t);
  const lerp3 = (u: [number, number, number], v: [number, number, number]): [number, number, number] =>
    [u[0] + (v[0] - u[0]) * f, u[1] + (v[1] - u[1]) * f, u[2] + (v[2] - u[2]) * f];
  return {
    t: time,
    sun: lerp3(a.sun, b.sun),
    sunI: a.sunI + (b.sunI - a.sunI) * f,
    amb: lerp3(a.amb, b.amb),
    ambI: a.ambI + (b.ambI - a.ambI) * f,
    fog: lerp3(a.fog, b.fog),
    sky: lerp3(a.sky, b.sky),
  };
}
