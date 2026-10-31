// CLN-26 · the camera: its field of view (eased toward the settings' value — squeezed while aiming a readied crossbow
// or longbow, widened a little in a dodge) and where it stands each frame (at the eyes, or orbiting behind in third person —
// never while mounted), moved from PlayerController.tsx as they were.
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { useAppStore } from '@/game/store/appStore';
import type { useGameStore } from '@/game/store/gameStore';
import { combatState } from '@/game/combat';
import { ridingState } from '@/game/riding';
import { homeGroundY } from '@/components/world/TemplateWorld';

// scratch for the chase camera's maths (moved with it from PlayerController.tsx: never kept past the statement that
// reads it — safe while there is one player, PlayerController's own singleton precondition)
const _eyeV = new THREE.Vector3();
const _camLookDirV = new THREE.Vector3();
const _camPosV = new THREE.Vector3();
const _camEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _lookAtV = new THREE.Vector3();

/** fov: settings value, squeezed while aiming a ranged weapon (combatState.aiming) — the component's own frame
 *  subscription, called where it stood */
export function useFovEase(camera: THREE.Camera, settings: ReturnType<typeof useAppStore.getState>['settings']): void {
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    // Wave 40 (A6) · a small FOV punch while a dodge burst is active, reusing
    // this exact smoother rather than a new one — the same "reuse the FOV
    // ease" precedent this ternary already set for aiming.
    const dodgingNow = performance.now() < combatState.dodgeUntil;
    const target = combatState.aiming ? settings.fov * 0.62 : dodgingNow ? settings.fov * 1.07 : settings.fov;
    if (Math.abs(cam.fov - target) > 0.1) {
      cam.fov += (target - cam.fov) * Math.min(1, dt * 10);
      cam.updateProjectionMatrix();
    }
  });
}

/** camera: first person at the eyes, third person orbiting behind. Mounted always forces first person regardless
 *  of the general on-foot preference — MountedHorse.tsx positions the horse's body/neck BODY_FORWARD units ahead of
 *  the camera specifically so a first-person view looks out over its mane; a third-person chase cam here would just
 *  show the rider from behind, defeating that entirely. */
export function placeCamera(st: ReturnType<typeof useGameStore.getState>, camera: THREE.Camera, pos: { current: THREE.Vector3 }, yaw: { current: number }, pitch: { current: number }): void {
  if (st.cameraMode === 'third' && !ridingState.active) {
    _eyeV.set(pos.current.x, pos.current.y - 0.2, pos.current.z);
    _camEuler.set(pitch.current, yaw.current, 0, 'YXZ');
    _camLookDirV.set(0, 0, -1).applyEuler(_camEuler);
    _camPosV.copy(_eyeV).addScaledVector(_camLookDirV, -4.6);
    _camPosV.y += 0.9;
    // Wave 12 · the chase camera's own "don't sink into the floor" clamp was
    // a bare 0.35 — a flat-world assumption, and a visible one the moment
    // there is a hill: looking down the slope swings the camera behind and
    // BELOW the player, and 0.35 above sea level is several metres inside the
    // North Downs. Clamped against the ground under the CAMERA rather than
    // under the player, which is where it is actually trying not to be.
    const camFloor = homeGroundY(_camPosV.x, _camPosV.z) + 0.35;
    if (_camPosV.y < camFloor) _camPosV.y = camFloor;
    camera.position.copy(_camPosV);
    _lookAtV.copy(_eyeV).addScaledVector(_camLookDirV, 2.5);
    camera.lookAt(_lookAtV);
  } else {
    camera.position.copy(pos.current);
  }
}
