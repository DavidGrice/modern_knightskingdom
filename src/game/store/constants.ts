// CLN-07 · the store's own tunables that other modules read, moved out of gameStore.ts so that a slice can import
// them without importing the store (gameStore.ts re-exports both).
/** seconds of active play for a wheat crop to mature */
export const GROW_TIME = 200;

/** real-time cooldown between keep tax collections (Phase 13) */
export const TAX_COOLDOWN_MS = 5 * 60 * 1000;
