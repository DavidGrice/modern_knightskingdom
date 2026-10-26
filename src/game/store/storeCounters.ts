// CLN-07 · the module state the store's actions share across its slices, moved out of gameStore.ts (where each was a
// module-level `let`) so that every slice can reach it: the id counters, and the build view's undo stack and carried
// keep. Not store state: nothing renders from them, and a set() for an id bump would wake every subscriber.
//
// CLN-04 · session-scoped module state. beginSession() (slices/sessionSlice.ts) resets
// `placeHistory` and `carriedKeepExtra` on every session start. The id counters are
// recomputed from the save on a LOAD only and deliberately keep counting across a new
// game (see beginSession).

/** the next id of each kind: a notification's, a placed building's (`b…`), a villager's (`v…`), a captured
 *  blueprint's (`bp…`) and a dug waterway's (`w…`) */
export const seq = {
  notif: 1,
  build: 1,
  villager: 1,
  blueprint: 1,
  /** Wave 12 · dug-waterway ids, carried past a loaded save exactly like the
   *  three above. Two live features sharing an id would give React two identical
   *  keys and give `fillWater` two candidates to remove — cheap to prevent, not
   *  cheap to debug. */
  water: 1,
};

export const buildUndo: {
  /** buildings placed this session, newest last (undo stack). Wave 9 widened
   *  each entry from one id to a GROUP of ids so a row-fill drag — which lays a
   *  dozen wall segments in a single gesture — undoes as the one action it felt
   *  like. Ordinary single placements push a one-element group, and blueprint
   *  stamping still pushes one group per piece (a stamp is deliberately undone
   *  piece by piece, as it always was). */
  placeHistory: string[][];
  /** J51 · the keep's own parts/built/hp while its foundation is being carried
   *  (movingBuilding only has room for a plain PlacedBuilding's own fields) —
   *  set by pickupKeep, consumed by cancelMove/finishMove, always null
   *  otherwise. Ephemeral like movingBuilding itself: never persisted. */
  carriedKeepExtra: { parts: Record<string, string>; built: Record<string, number>; hp: Record<string, number> } | null;
} = { placeHistory: [], carriedKeepExtra: null };
