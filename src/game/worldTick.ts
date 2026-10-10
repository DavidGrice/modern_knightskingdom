// CLN-20 · the world's own ticks that the player controller drives: the fishing bite cycle and the build challenge's
// countdown every unfrozen frame, and the half-second sweep (nearby stations, the wall ring, respawns, plots,
// villagers). The statements are PlayerController.tsx's, moved here unchanged — but for the station scan, which
// since 2026-10-10 is game/stations.ts and passes over a piece that is not built.
//
// Why a pair of functions called from the controller, and not a component of its own with its own frame loop (which
// is what CLEANUP_PLAN.md's CLN-20 first asked for): the "block" is three pieces at two points of the controller's
// frame — the per-frame ticks sit BEFORE interaction targeting and performAction, which read and write the very
// state they advance, and the sweep sits AFTER them — and a second frame callback runs wholly before or wholly after
// the controller's, so it cannot be on both sides. Both pieces also work on the controller's frame-start store
// snapshot and its post-movement position, and the sweep's countdown is a ref of the controller that restarts at 0
// on every remount (every exit from build mode sweeps at once and credits a full half second); the controller keeps
// that countdown, its clamped-dt decrement and its reset by assignment.
//
// Whether the world SHOULD go on ticking while the player is in build mode (today it stalls: the controller is
// unmounted there, and frozen besides) is an open owner question — CLEANUP_PLAN.md, "Open questions". This move
// preserves today's behaviour either way.
import { fishingState, tickFishing } from './fishing';
import { tickBuildChallenge } from './buildChallenge';
import { refreshFort } from './fort';
import { stationsInReach } from './stations';

type Store = ReturnType<typeof import('./store/gameStore').useGameStore.getState>;

/** Seconds between sweeps, and — as a literal, on purpose — the time each sweep credits to plots and villagers.
 *  The controller ASSIGNS its countdown this value when a sweep fires (no remainder is carried). */
export const WORLD_SWEEP_S = 0.5;

/** Every unfrozen frame, after the player has moved and before interaction targeting: the fishing bite cycle, then
 *  the build challenge's countdown. `st` is the controller's frame-start snapshot; (`px`, `pz`) is where the player
 *  stands after this frame's movement. */
export function tickWorldFrame(st: Pick<Store, 'nodes' | 'notify' | 'destination'>, px: number, pz: number) {
  // fishing bite minigame: advance the wait/bite cycle regardless of
  // where the player is currently looking (only proximity matters once
  // a line is cast, not framing the pond dead-on every frame)
  if (fishingState.nodeId) {
    const fishNode = st.nodes.find((n) => n.id === fishingState.nodeId);
    const dist = fishNode ? Math.hypot(fishNode.x - px, fishNode.z - pz) : Infinity;
    tickFishing(fishNode, dist, st.notify);
  }
  // Wave 13 · Timed Build Challenge countdown (game/buildChallenge.ts) —
  // the loss/abandon path only; a WIN is resolved from gameStore.ts's
  // constructBuilding, the moment a piece actually finishes.
  tickBuildChallenge(st.destination, st.notify);
}

/** The half-second sweep, run by the controller when its countdown runs out (after performAction, before the
 *  player's transform is published). The order is the behaviour: tickVillagers can finish a building, and
 *  checkVillagerArrival then judges the buildings as that left them, in the same sweep. The station scan
 *  (game/stations.ts) is handed `st.buildings` — the FRAME-START snapshot, so a station the player's own hammer
 *  finishes on this very frame is named at the next sweep — while the store actions read the store as it stands.
 *  (No panel waits for that: the store looks for the stations in reach again whenever a crafting panel opens.) */
export function sweepWorld(
  st: Pick<Store, 'buildings' | 'setNearStations' | 'tickRespawns' | 'tickPlots' | 'tickVillagers' | 'checkVillagerArrival'>,
  px: number,
  pz: number,
) {
  // nearby crafting stations (drives the crafting panel), respawns
  st.setNearStations(stationsInReach(st.buildings, px, pz));
  // Wave 8 · the wall ring. A no-op unless the buildings/gates/keep/land
  // tier actually changed identity since the last look (game/fort.ts),
  // so this rides the existing half-second sweep for free.
  refreshFort();
  st.tickRespawns();
  st.tickPlots(WORLD_SWEEP_S);
  st.tickVillagers(WORLD_SWEEP_S);
  st.checkVillagerArrival();
}
