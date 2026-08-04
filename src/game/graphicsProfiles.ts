// Requested 2026-07-31: a real Performance <-> Ultra quality spectrum,
// replacing the old low/medium/high tiers that only ever scaled `dpr`. Every
// render-cost lever this pass touches (Canvas dpr/gl settings, shadow map
// size/frustum, an Ultra-only fill light, panel blur, character
// render-distance, asset preload scope) reads from ONE table here instead of
// each consumer hand-rolling its own tier switch — the same "config table,
// not a scattered switch" shape `src/ai/config/lod.json` already uses for
// the AI system's own distance tiers.
//
// `balanced` is deliberately calibrated to match the game's live behavior
// before this pass (2048 shadow map, static +/-140 frustum, no fill light,
// eager preload) — a safe anchor with zero regression for the median player,
// who never touched the setting and is about to be migrated onto it (see
// appStore.ts's `loadSettings()`). `performance` is a genuinely more
// aggressive floor than the old `low` (lower dpr ceiling, no antialiasing, a
// `low-power` GPU hint, a hard character render-distance cutoff); `ultra` is
// a genuine new ceiling above the old `high` (a sharper shadow map that
// stays tight around the player instead of a fixed huge box, an extra fill
// light, a higher dpr ceiling) — not just a relabel of what already existed.
import type { GraphicsQuality } from './store/appStore';

export interface GraphicsProfile {
  id: GraphicsQuality;
  label: string;
  blurb: string;
  /** R3F <Canvas dpr> range */
  dpr: [number, number];
  gl: { antialias: boolean; powerPreference: 'low-power' | 'high-performance' };
  /** Options' "Quality preset" button also force-sets the independent
   *  Shadows switch to this — same click-sets-both UX the old tiers had,
   *  still independently toggleable afterward. */
  shadowsDefault: boolean;
  shadowMapSize: number;
  /** half-extent of the sun's orthographic shadow frustum, world units */
  shadowFrustumHalf: number;
  /** true: the shadow frustum's own target re-centers on the player every
   *  frame instead of staying pinned to the world origin — what makes a
   *  smaller (sharper) frustum still cover wherever the player actually is */
  shadowRecenter: boolean;
  shadowBias: number;
  /** an extra soft secondary directional light, Ultra only */
  fillLight: boolean;
  /** world units beyond which a rigged character (villager/NPC/enemy) is
   *  hidden outright — a hard visibility cutoff, not a fade or a reduced-poly
   *  swap (see RiggedFigure.tsx). null = no cutoff, always render. */
  characterLodDistance: number | null;
  /** whether preloadCommonAssets() eagerly warms enemy donors + the dragon
   *  rig on top of the (always-eager, every tier) buildable GLTFs */
  preloadEnemyDonors: boolean;
  /** Requested 2026-08-04 ("streamline for all devices"): multiplies
   *  Weather.tsx's rain/snow particle count — that system previously ran
   *  the same fixed 900-point field at every quality tier, the one real
   *  render-cost lever this table didn't already touch. Applied via
   *  `THREE.BufferGeometry.setDrawRange`, not a buffer reallocation, so
   *  switching tiers mid-session is instant. */
  particleDensity: number;
  /** Options' "Quality preset" button also force-sets the independent View
   *  Distance slider to this — same click-sets-both UX `shadowsDefault`
   *  already has, still independently adjustable afterward (0.7-1.3 range,
   *  see OptionsStack.tsx's own Slider bounds). */
  viewDistanceDefault: number;
  /** Requested 2026-08-04: the screen-space "wet look" rain post-process
   *  (PostProcessing.tsx) — one extra full-screen shader pass, active only
   *  while it's actually raining (its own uniform reads worldEnv.rain each
   *  frame). Cheap on hardware that can run Balanced/Ultra at all; skipped
   *  entirely on Performance rather than made cheaper, since "skip it" is
   *  strictly cheaper than any version of "do it more cheaply." */
  wetPostProcess: boolean;
}

export const GRAPHICS_PROFILES: Record<GraphicsQuality, GraphicsProfile> = {
  performance: {
    id: 'performance',
    label: 'Performance',
    blurb: 'Lower resolution, shadows off by default, distant villagers and enemies fade out, panel blur off. Best for laptops, tablets and phones.',
    dpr: [0.5, 0.75],
    gl: { antialias: false, powerPreference: 'low-power' },
    shadowsDefault: false,
    shadowMapSize: 1024,
    shadowFrustumHalf: 140,
    shadowRecenter: false,
    shadowBias: -0.0006,
    fillLight: false,
    characterLodDistance: 60,
    preloadEnemyDonors: false,
    particleDensity: 0.3,
    viewDistanceDefault: 0.75,
    wetPostProcess: false,
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    blurb: "Today's default look — full shadows, no distance cutoff, panel blur on. A good match for most desktops.",
    dpr: [0.85, 1.25],
    gl: { antialias: true, powerPreference: 'high-performance' },
    shadowsDefault: true,
    shadowMapSize: 2048,
    shadowFrustumHalf: 140,
    shadowRecenter: false,
    shadowBias: -0.0004,
    fillLight: false,
    characterLodDistance: null,
    preloadEnemyDonors: true,
    particleDensity: 1,
    viewDistanceDefault: 1,
    wetPostProcess: true,
  },
  ultra: {
    id: 'ultra',
    label: 'Ultra',
    blurb: 'Sharper shadows that stay tight around you as you move, an extra fill light, higher-resolution rendering. For a strong dedicated GPU.',
    dpr: [1, 2.5],
    gl: { antialias: true, powerPreference: 'high-performance' },
    shadowsDefault: true,
    shadowMapSize: 4096,
    shadowFrustumHalf: 70,
    shadowRecenter: true,
    shadowBias: -0.0002,
    fillLight: true,
    characterLodDistance: null,
    preloadEnemyDonors: true,
    particleDensity: 1.3,
    viewDistanceDefault: 1.15,
    wetPostProcess: true,
  },
};

export const GRAPHICS_QUALITY_LIST: GraphicsProfile[] = [
  GRAPHICS_PROFILES.performance,
  GRAPHICS_PROFILES.balanced,
  GRAPHICS_PROFILES.ultra,
];
