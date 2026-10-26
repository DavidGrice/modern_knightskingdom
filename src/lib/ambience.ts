// CLN-29 · which sounds the ambience loop draws from — the choice audio.ts's startAmbience made inline each beat, as a
// pure function of the biome and the time of day.
import type { SoundName } from './audioCatalog';

export type AmbienceBiome = 'meadow' | 'mountain' | 'ruins' | 'silent';

/**
 * Wave 29 · per-destination ambience audit. `startAmbience()` used to play one hardcoded pool everywhere — the same
 * birdsong at an icy mountain pass, the same owl at a sealed dungeon door, forever.
 *  - 'meadow'   (default/unset): the original day/night pools, unchanged.
 *  - 'mountain': wind only, day and night — no birdsong at altitude.
 *  - 'ruins':    an owl by day too, no bird1/2/3 — eerie, abandoned,
 *                distinct from meadow without inventing a new sample.
 *  - 'silent':   no loop at all (a sealed dungeon, the arena pit) — null.
 * Every pool is built from sounds already in SOUNDS (audioCatalog.ts) — no new audio assets needed for this pass.
 */
export function ambiencePool(biome: AmbienceBiome, night: boolean): SoundName[] | null {
  if (biome === 'silent') return null;
  return biome === 'mountain'
    ? ['wind1', 'wind2']
    : biome === 'ruins'
      ? ['owl', 'wind1', 'wind2']
      : night
        ? ['owl', 'wind1', 'wind2', 'owl']
        : ['bird1', 'bird2', 'bird3', 'wind1', 'wind2'];
}
