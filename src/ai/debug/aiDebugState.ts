// NPC_AI_SPEC §9 — the toggle shared between the DOM panel and the scene
// gizmos.
//
// A plain mutable module, for the same reason `Blackboard` is one (that
// file's own header): the gizmo layer reads this inside `useFrame`, and a
// zustand flag would re-render the React tree on a value only a render loop
// polls. `AIDebugOverlay` owns the keyboard handler (it is mounted whether
// the panel is open or not), so the gizmos can be turned on without the panel
// being up — useful precisely when you want to WATCH an NPC rather than read
// its numbers.

export const aiDebugState = {
  /** §9's "scene gizmos (toggle individually)" — phase 6 ships the two this
   *  phase is responsible for (vision cones + belief markers) behind one
   *  switch. The rest of §9's list (navmesh wireframe, path corners, anchor
   *  axes, reservation lines) belongs to phases 2/4, which shipped without
   *  them; adding a per-gizmo toggle UI for gizmos that do not exist yet
   *  would be scaffolding, not a debug view. */
  gizmos: false,
};

export function toggleAiGizmos(): boolean {
  aiDebugState.gizmos = !aiDebugState.gizmos;
  return aiDebugState.gizmos;
}
