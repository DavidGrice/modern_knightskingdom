'use client';
// Requested 2026-07-31: `Settings.showFps` already existed in appStore.ts
// with zero consumers anywhere — this is the other half of that setting.
// A mutable leaf module, same "written every frame by the R3F loop, polled
// on an interval by DOM HUD code" convention Vitals.tsx already documents
// for combatState/playerState (HUD.tsx is a DOM overlay, not inside the
// Canvas, so it can't subscribe to a useFrame value directly).
export const fpsMeter = { value: 0 };

/** exponential rolling average — smooths frame-to-frame jitter into a
 *  readable number without a full sample-window buffer */
export function sampleFrame(dt: number): void {
  if (dt <= 0) return;
  const instant = 1 / dt;
  fpsMeter.value = fpsMeter.value === 0 ? instant : fpsMeter.value + (instant - fpsMeter.value) * 0.1;
}
