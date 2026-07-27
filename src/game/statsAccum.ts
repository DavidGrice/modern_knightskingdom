// High-frequency lifetime-stat accumulation (distance walked, seconds played).
// Written every frame/tick from PlayerController/GameScreen without touching
// the zustand store (which would re-render subscribers every frame); flushed
// into gameStore's persisted `stats` on the same ~4s cadence as checkDeeds.
export const statsAccum = { distanceMeters: 0, playtimeSec: 0 };
