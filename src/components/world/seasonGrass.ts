// CLN-24 · the seasonal grass tint table, on its own because three siblings read it: the home meadow bake
// (HomeMeadowWater.tsx), the raised terrain regions (TerrainRegions.tsx) and Terrain.tsx's loading fallback.

/** Spring/Summer/Autumn/Winter grass tints — winter reads pale/frost-dusted
 *  rather than switching to a wholly separate snow-covered ground state. */
export const SEASON_GRASS: [number, number, number][] = [
  [0.302, 0.506, 0.220], // spring — today's original #4d8138
  [0.353, 0.580, 0.251], // summer — a touch richer/lighter
  [0.541, 0.478, 0.227], // autumn — olive/brown
  [0.788, 0.831, 0.784], // winter — pale, frost-dusted
];
