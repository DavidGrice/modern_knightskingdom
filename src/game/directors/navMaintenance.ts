// CLN-13 · the navigation grids kept in step with what has been built — the whole game's, not only the enemies':
// Enemies.tsx's 1 Hz tick is the one caller, as it always was (and so the path a gate toggled at home relies on).
import { useGameStore } from '@/game/store/gameStore';
import { getNavGrid, rebuildNav } from '@/game/navgrid';

export function maintainNav(): void {
  // keep the navigation grid in step with what has been built; this is a
  // no-op unless the buildings array identity actually changed
  const buildingsForNav = useGameStore.getState().buildings;
  rebuildNav(buildingsForNav);
  const st = useGameStore.getState();
  // Post-Wave-33 verify-pass fix: getNavGrid(region) lazily creates a
  // window-mode grid for whatever destination is mounted (TemplateWorld.tsx
  // -> Villagers.tsx's navSteer, settlement residents; the reasoner/Agent
  // path too), but nothing ever called ITS rebuild() the way homeGrid gets
  // above — so a destination grid's `blocked` array stayed all-zero
  // forever and every building there was invisible to findPath, no matter
  // how correct the grid/region resolution itself was. Piggyback on the
  // exact same 1Hz cadence and buildings array homeGrid already uses;
  // rebuild() itself is a no-op unless the array identity (or waterworks
  // rev) changed, so this costs nothing extra on the common case. The
  // Sealed Crypt is excluded — its own synthesized-wall grid is rebuilt
  // once on generation by ensureDungeonGrid() and never needs the real
  // `buildings` array at all.
  if (st.destination && st.destination !== 'dungeon') {
    getNavGrid(st.destination).rebuild(buildingsForNav);
  }
}
