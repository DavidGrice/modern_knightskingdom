// The aerial build camera's current look-at point (Phase 13's "capture
// nearby buildings as a blueprint" reads this from BuildBar.tsx, a sibling
// HUD component with no direct ref to BuildController's own camera state).
//
// Wave 9 added `azimuth` — the view's own quarter turn around that point, in
// radians, eased between stops. Blueprint capture deliberately does NOT read
// it: capture is a radius around the focus point, which is the same set of
// buildings whichever way the camera happens to be facing.
export const buildCamState = { x: 0, z: 0, azimuth: 0 };

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkbuildcam = buildCamState;
}
