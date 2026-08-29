'use client';
// Wave 25 — Agent lifecycle for Tam, the companion squire. One entity, not a
// roster: falcon.ts's own precedent ("a single always-on companion, not a
// fleet") applies here too, so this is a single spawn/despawn toggle on
// `st.companionRecruited`, not rosterSync.ts's per-id reconciliation loop.
//
// Also the piece that makes "follows across a travelTo()" actually work.
// AgentManager.refreshTiers computes `a.region !== this.activeRegion` every
// tick to decide tier D (AgentManager.ts) — without keeping `agent.region`
// synced to `st.destination`, Tam would drop to tier D (teleport-stepped,
// unrendered) the instant the player travels anywhere: a stale `region:
// null` would never match a real destination id again, and he would be left
// behind at the homestead forever. The position snap on the same frame is
// necessary too: the player's own travel is an instant `pendingTeleport`
// (game/playerState.ts), not a walk, and a destination's coordinate space is
// unrelated to the one Tam was just standing in — pathing "toward" a
// leftover MOVE_TO in a coordinate space that no longer describes the world
// he's in would be nonsensical, so this snaps him instead, exactly matching
// how `pendingTeleport` handles the player's own instant relocation.
// Locomotion.ts's existing `navSteer` try/catch fallback already degrades
// gracefully to straight-line steering for a region with no grid yet (the
// dungeon before its layout generates), so no special-casing is needed here
// for that.
import { agentManager } from './core/AgentManager';
import { playerState } from '@/game/playerState';
import { COMPANION_ID } from '@/game/data/companion';

let spawned = false;
let lastDestination: string | null = null;

export function syncCompanionAgent(recruited: boolean, destination: string | null): void {
  if (recruited && !spawned) {
    // spawned a metre and a bit off the player's own spot rather than
    // exactly on it — same reasoning mountHorse/npcSync's own spawn points
    // use, so Tam doesn't render inside the player's own collision volume
    // for the one frame before follow_leader's first think tick moves him.
    agentManager.spawn(COMPANION_ID, 'companion', playerState.x + 1.2, playerState.z + 1.2, destination);
    spawned = true;
    lastDestination = destination;
  } else if (!recruited && spawned) {
    agentManager.despawn(COMPANION_ID);
    spawned = false;
  }
  if (!spawned) return;

  if (destination !== lastDestination) {
    lastDestination = destination;
    const agent = agentManager.get(COMPANION_ID);
    if (agent) {
      agent.region = destination;
      agent.position.set(playerState.x + 1.2, 0, playerState.z + 1.2);
      // Drop whatever MOVE_TO/FACE he was last holding — it names a point in
      // the world he just left, which means nothing in the one he just
      // arrived in. follow_leader's own next think tick (well within a
      // second at every LOD tier) issues a fresh one against his new,
      // correct surroundings.
      agent.intent = null;
    }
  }
}

/** newGame/loadFromSave reset — same reasoning rosterSync.ts's own
 *  resetVillagerAgentSync documents: this module's `spawned`/
 *  `lastDestination` are memory of a call already made, and
 *  `agentManager.clear()` alone would leave this thinking Tam's Agent still
 *  exists when the registry that held it has just been wiped. */
export function resetCompanionAgentSync(): void {
  spawned = false;
  lastDestination = null;
}
