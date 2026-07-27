'use client';
// Live player transform, shared across systems without store churn.
// Written by PlayerController every frame; read by the avatar, viewmodel,
// combat, wildlife, minimap and riding systems.

import { SPAWN } from './data/world';

export const playerState = {
  x: 0, y: 0, z: 26, yaw: 0, pitch: 0,
  speed: 0, grounded: true, acting: false, riding: false,
  /** set by systems that need to relocate the player (e.g. keep enter/exit);
   * PlayerController applies it once per frame and clears it. */
  pendingTeleport: null as { x: number; z: number; yaw?: number } | null,
};

/** Put the player back at the spawn point. PlayerController resumes from
 *  this module on mount (it is unmounted and remounted every time build mode
 *  opens), so starting or loading a game must clear it explicitly — nothing
 *  else does, and `SaveGame.playerPos` has never actually been written. */
export function resetPlayerState() {
  playerState.x = SPAWN[0];
  playerState.y = 0;
  playerState.z = SPAWN[2];
  playerState.yaw = 0;
  playerState.pitch = 0;
  playerState.speed = 0;
  playerState.grounded = true;
  playerState.acting = false;
  playerState.riding = false;
  playerState.pendingTeleport = null;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkp = playerState;
}
