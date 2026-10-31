// CLN-26 · what the crosshair is on, and its nameplate: the frame's aim readout (the aim ray resolved against foes,
// people and villagers, ten times a second) and the target's head projected to the screen (every frame), moved from
// PlayerController.tsx as they were. Both write game/targeting.ts's aimState, which the HUD reads.
import * as THREE from 'three';
import type { useGameStore } from '@/game/store/gameStore';
import { NPC_BY_ID } from '@/game/data/npcs';
import { useEnemyStore, KIND_LABEL, maxHpOf, MOUNT_SEAT_Y, type EnemyKind } from '@/game/combat';
import { aimState, resolveAim } from '@/game/targeting';

/** scratch for projecting the aim target's head to screen space */
const plateV = new THREE.Vector3();
/** scratch for the aim ray's direction — like plateV, never kept past the statement that reads it */
const _aimFwdV = new THREE.Vector3();

/** what the crosshair is on — one resolve feeding the aim readout, the crosshair's colour and the collection-book
 *  scan, so all three always agree. Throttled by `aimTimer`: the ray is cheap but there is no reason to redo it every
 *  frame for a DOM overlay that repaints far slower. */
export function readAim(st: ReturnType<typeof useGameStore.getState>, camera: THREE.Camera, aimTimer: { current: number }, frozen: boolean, dt: number): void {
  aimTimer.current -= dt;
  if (aimTimer.current <= 0) {
    aimTimer.current = 0.1;
    if (frozen) {
      aimState.target = null;
    } else {
      camera.getWorldDirection(_aimFwdV);
      aimState.target = resolveAim(
        camera.position.x, camera.position.y, camera.position.z,
        _aimFwdV.x, _aimFwdV.y, _aimFwdV.z,
        useEnemyStore.getState().enemies,
        (k) => KIND_LABEL[k as EnemyKind] ?? k,
        (k) => maxHpOf(k as EnemyKind),
        (id) => NPC_BY_ID[id]?.name ?? 'Stranger',
        (id) => st.villagers.find((v) => v.id === id)?.name ?? 'Villager',
        (k) => st.bestiary.includes(k),
        st.villagers.map((v) => ({ id: v.id, isDefender: v.job === 'defender' })),
        // Wave 36 (A3): a mounted raider's rig sits a saddle-height off the
        // ground — see resolveAim's own comment on this param
        (k) => (k === 'mountedRaider' ? MOUNT_SEAT_Y : 0),
      );
    }
  }
}

/** Pin the nameplate over the target's head. Projected EVERY frame, not on the 10 Hz aim throttle, so the plate
 *  tracks the figure smoothly while you turn rather than swimming after them. */
export function pinNameplate(camera: THREE.Camera, gl: THREE.WebGLRenderer): void {
  const aimed = aimState.target;
  if (aimed) {
    plateV.set(aimed.x, aimed.height + 0.45, aimed.z).project(camera);
    const el = gl.domElement;
    aimState.screen.x = (plateV.x * 0.5 + 0.5) * el.clientWidth;
    aimState.screen.y = (-plateV.y * 0.5 + 0.5) * el.clientHeight;
    aimState.screen.vis = plateV.z < 1;
  } else {
    aimState.screen.vis = false;
  }
}
