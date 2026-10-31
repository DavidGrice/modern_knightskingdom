// CLN-26 · the frame's last word on the player: where they are, which way they face, how fast they go and what they
// are doing, written into game/playerState.ts for the avatar, the viewmodel and everything else that reads the player
// without holding the component. Moved from PlayerController.tsx as it was.
import type * as THREE from 'three';
import type { useGameStore } from '@/game/store/gameStore';
import { EYE_HEIGHT } from '@/game/data/world';
import { playerState } from '@/game/playerState';
import { combatState } from '@/game/combat';
import { ridingState } from '@/game/riding';

/** publish transform for the avatar / viewmodel */
export function publishPlayerState(st: ReturnType<typeof useGameStore.getState>, frozen: boolean, kb: Record<string, string>, isDown: (code: string) => boolean | undefined, pos: { current: THREE.Vector3 }, yaw: { current: number }, pitch: { current: number }, grounded: { current: boolean }): void {
  const moving =
    !frozen &&
    ((isDown(kb.moveForward) || isDown(kb.moveLeft) || isDown(kb.moveBack) || isDown(kb.moveRight)) ?? false);
  playerState.x = pos.current.x;
  playerState.y = pos.current.y - (ridingState.active ? EYE_HEIGHT + 0.85 : EYE_HEIGHT);
  playerState.z = pos.current.z;
  playerState.yaw = yaw.current;
  playerState.pitch = pitch.current;
  // Wave 40 (A6) · a forced speed scalar during a dodge burst — the
  // existing run-cycle clip selector (playerState.speed > 5 in
  // PlayerAvatar.tsx) and the viewmodel's speed-driven bob/sway
  // (Viewmodel.tsx) both react to this for free, no fabricated clip.
  playerState.speed = performance.now() < combatState.dodgeUntil ? 14 : moving ? (isDown(kb.sprint) ? 7 : 4) : 0;
  playerState.grounded = grounded.current;
  playerState.acting = st.actionProgress !== null;
  playerState.riding = ridingState.active;
}
