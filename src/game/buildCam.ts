// The aerial build camera's current look-at point (Phase 13's "capture
// nearby buildings as a blueprint" reads this from BuildBar.tsx, a sibling
// HUD component with no direct ref to BuildController's own camera state).
export const buildCamState = { x: 0, z: 0 };

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkbuildcam = buildCamState;
}
