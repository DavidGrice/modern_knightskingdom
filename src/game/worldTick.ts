// CLN-20 · the world's own ticks that the player controller drives: the fishing bite cycle and the build challenge's
// countdown every unfrozen frame, and the half-second sweep (nearby stations, the wall ring, respawns, plots,
// villagers). The statements are PlayerController.tsx's, moved here unchanged — but for the station scan, which
// since 2026-10-10 is game/stations.ts and passes over a piece that is not built.
//
// Why a pair of functions called from the controller, and not a component of its own with its own frame loop (which
// is what CLEANUP_PLAN.md's CLN-20 first asked for): the "block" is three pieces at two points of the controller's
// frame — the per-frame ticks sit BEFORE interaction targeting and performAction, which read and write the very
// state they advance, and the sweep sits AFTER them — and a second frame callback runs wholly before or wholly after
// the controller's, so it cannot be on both sides. In the controller's frames both pieces work on its frame-start
// store snapshot and its post-movement position; in WorldTicker's (build mode, a panel) on that frame's snapshot and
// the published playerState.
//
// Wave 65.1 (F-14, the owner's OD-08) · the world runs in build mode and behind a panel too, and stops only while the
// game is paused or a ceremony plays. The controller cannot run it there — build mode unmounts it, a panel holds it
// still — so WorldTicker (components/world/WorldTicker.tsx, always mounted) runs the ticks then, from the player's
// published position; there is no targeting or performAction for them to come before. `worldTickOwner` says whose
// frame it is, and `claimWorldTicks` lets the ticks run once a frame whoever asks. The sweep's countdown is module
// state, so a trip to build mode neither restarts it nor credits a free half second on the way back.
import { onSessionReset } from './store/sessionHooks';
import { fishingState, tickFishing } from './fishing';
import { tickBuildChallenge } from './buildChallenge';
import { refreshFort } from './fort';
import { stationsInReach } from './stations';

type Store = ReturnType<typeof import('./store/gameStore').useGameStore.getState>;

/** Seconds between sweeps, and — as a literal, on purpose — the time each sweep credits to plots and villagers.
 *  `sweepDue` ASSIGNS its countdown this value when a sweep fires (no remainder is carried). */
export const WORLD_SWEEP_S = 0.5;

/** Who runs the world's ticks this frame (OD-08): the controller while it drives the player, WorldTicker while build
 *  mode or a panel holds the controller still, and no one while the game is paused or a ceremony plays. */
export function worldTickOwner(st: Pick<Store, 'paused' | 'ceremony' | 'buildMode' | 'panel'>): 'player' | 'ticker' | null {
  if (st.paused || st.ceremony) return null;
  return st.buildMode || st.panel !== 'none' ? 'ticker' : 'player';
}

/** The frame the world is on, the frame its ticks last ran in, and the sweep's countdown (0: due at once). */
const worldClock = { frame: 0, ranIn: -1, sweepIn: 0 };

/** Opens a frame. WorldTicker calls it first in every frame — its frame callback runs before every other. */
export function beginWorldFrame() {
  worldClock.frame += 1;
}

/** True for the first owner to ask in a frame, false for any after it: a frame whose store changes hands between the
 *  two callbacks (a panel opened by the controller's own performAction, say) never runs the ticks twice. */
export function claimWorldTicks(): boolean {
  if (worldClock.ranIn === worldClock.frame) return false;
  worldClock.ranIn = worldClock.frame;
  return true;
}

/** Runs the sweep's countdown down by the frame's clamped `dt`: true when the sweep is due. */
export function sweepDue(dt: number): boolean {
  worldClock.sweepIn -= dt;
  if (worldClock.sweepIn > 0) return false;
  worldClock.sweepIn = WORLD_SWEEP_S;
  return true;
}

// a session start sweeps at once, as a freshly mounted controller always did
onSessionReset(() => { worldClock.sweepIn = 0; });

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

/** The world's ticks of a frame in which build mode or a panel holds the controller still — WorldTicker's, from where
 *  the player was last published to stand. The build challenge's countdown, then the sweep when it is due; NOT the
 *  fishing bite cycle: a bite is the player's own test of reflex, which no one in build mode or behind a panel can
 *  answer, so run there it would only say "The fish got away!" every few seconds. A cast line waits, as it always
 *  has, and bites on the first frame back if its wait is over. */
export function tickWorldHeld(
  st: Pick<Store, 'destination' | 'notify'> & Parameters<typeof sweepWorld>[0],
  px: number,
  pz: number,
  dt: number,
) {
  tickBuildChallenge(st.destination, st.notify);
  if (sweepDue(dt)) sweepWorld(st, px, pz);
}

/** The half-second sweep, run when its countdown runs out — by the controller after performAction, before the
 *  player's transform is published, or by WorldTicker (tickWorldHeld). The order is the behaviour: tickVillagers can finish a building, and
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
