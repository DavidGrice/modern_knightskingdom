// Requested 2026-07-31: real anti-aliasing options, orthogonal to the
// Performance/Balanced/Ultra quality tiers (graphicsProfiles.ts) — a player
// picks a quality preset AND an AA mode independently, same as this codebase
// already lets Shadows be independently toggled after a preset is chosen.
//
// WebGL has no equivalent of a desktop game's MSAA sample-count picker (no
// "2x/4x/8x/16x") — the browser decides hardware multisampling internally
// when `gl.antialias: true`, with zero application control over the sample
// count. These four modes are the real, honest alternative for a real-time
// WebGL game: two post-process shader techniques (cheap, well-suited to a
// moving camera) and one true supersample tier, deliberately capped at 2x —
// see PostProcessing.tsx's own header comment for why 4x/16x are not
// realistic options here (the cost is quadratic, and even 2x already means
// ~4x the pixel-shading work every frame).
export type AaMode = 'off' | 'fxaa' | 'smaa' | 'supersample2x';

export interface AaModeInfo {
  id: AaMode;
  label: string;
  blurb: string;
}

export const AA_MODES: AaModeInfo[] = [
  { id: 'off', label: 'Off', blurb: "Today's rendering, unchanged. No extra GPU cost." },
  { id: 'fxaa', label: 'FXAA', blurb: 'Fast edge-smoothing shader. Cheapest option, softens fine detail slightly.' },
  { id: 'smaa', label: 'SMAA', blurb: 'Sharper edge-smoothing than FXAA for a similar cost. A good default upgrade.' },
  { id: 'supersample2x', label: 'Supersample 2x', blurb: 'Renders at double resolution internally for the cleanest edges. Roughly 4x the pixel cost — best on Balanced/Ultra with a strong GPU.' },
];

export const AA_MODE_BY_ID: Record<AaMode, AaModeInfo> = Object.fromEntries(
  AA_MODES.map((m) => [m.id, m]),
) as Record<AaMode, AaModeInfo>;
