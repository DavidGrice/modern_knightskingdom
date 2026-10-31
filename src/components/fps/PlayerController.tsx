'use client';
// The player's controller: the refs that hold the player between frames (where they are, which way they look, what
// they are holding or waiting on), and one frame loop that runs the player's systems in order — the gamepad and touch
// (input/), relocation (game/playerPhysics/), the arrow keys' look (input/), movement (game/playerPhysics/), the
// world's per-frame ticks (game/worldTick.ts), what the player is looking at and acting on (game/interaction/), the
// world's half-second sweep — then what the frame publishes: playerState, the aim readout, the camera
// (publishPlayerState.ts, aimReadout.ts, cameraRig.ts). The pointer lock, mouse look and the keyboard are input/'s
// hooks, the field of view cameraRig.ts's.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import {
  EYE_HEIGHT, SPAWN,
} from '@/game/data/world';
import { playerState } from '@/game/playerState';
import { sweepWorld, tickWorldFrame, WORLD_SWEEP_S } from '@/game/worldTick';
import { crewState } from '@/game/crew';
import { exposeDebug } from '@/lib/debugHooks';
import { usePointerLock } from './input/usePointerLock';
import { usePlayerInput } from './input/usePlayerInput';
import { pollPads } from './input/pads';
import { keyboardLook } from './input/look';
import { publishPlayerState } from './publishPlayerState';
import { readAim, pinNameplate } from './aimReadout';
import { useFovEase, placeCamera } from './cameraRig';
import { relocate, flyPhoto, crewEngine, walk } from '@/game/playerPhysics/locomotion';
import { holdToAct, dropHold } from '@/game/interaction/holdToAct';


export { playerState };


export default function PlayerController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  // debug handle, same as the other __kk leaves: lets a smoke test walk the
  // live scene graph (which is how the sky-box offset in K60 was found)
  useEffect(() => {
    exposeDebug('__kkscene', scene);
    exposeDebug('__kkcam', camera);
  }, [scene, camera]);
  const settings = useAppStore((s) => s.settings);

  // Resume from wherever the player actually is, not from SPAWN.
  // GameWorld swaps this component out for BuildController while build mode
  // is open (`{buildMode ? <BuildController/> : <PlayerController/>}`), so
  // every trip into the build menu UNMOUNTS this component and re-creates
  // these refs — which used to dump the player back at the spawn point,
  // south of the homestead, on every exit. `playerState` is the live mirror
  // this same loop writes each frame, so it is the right resume point; it
  // is reset to SPAWN by newGame/loadFromSave for a genuinely fresh start.
  const pos = useRef(new THREE.Vector3(
    playerState.x || SPAWN[0],
    (playerState.y || 0) + EYE_HEIGHT,
    playerState.z || SPAWN[2],
  ));
  const vel = useRef(new THREE.Vector3());
  const yaw = useRef(playerState.yaw);   // yaw 0 faces the homestead (-Z from spawn)
  const pitch = useRef(playerState.pitch);
  const grounded = useRef(true);
  // Wave 12 · was the player standing on bare ground last frame, rather than on
  // something built? The ledge test (fall, game/playerPhysics/vertical.ts,
  // fed by walk in locomotion.ts) needs the PREVIOUS answer, not just this
  // one — see it for why.
  const wasOnOpenGround = useRef(true);
  // requested 2026-08-03: the lava arena's own ambient chip damage — a
  // once-per-second tick through the normal damagePlayer() path (so armor/
  // block still apply), not a per-frame call, which would spam the hit
  // sound/screen-flash 60x/sec
  const arenaDamageTimer = useRef(1);
  const holdTime = useRef(0);
  const crewCooldown = useRef(0);
  const aimTimer = useRef(0);
  const holdTarget = useRef<string | null>(null);
  // a completed hold-to-act (e.g. the last hammer swing on a construction
  // site) can reveal a brand-new, DIFFERENT-KIND instant target at the exact
  // same spot this same held key-press (a finished building's own "Use X"
  // station prompt) — remembered here so that transition is blocked until E
  // is actually released and pressed again, without touching the ordinary
  // continuous-hold-to-repeat rhythm multi-swing construction/training rely
  // on (same id + same kind next frame just keeps firing normally)
  const holdJustCompletedId = useRef<string | null>(null);
  const holdJustCompletedKind = useRef<string | null>(null);
  const stepTimer = useRef(0);
  const stationTimer = useRef(0);
  const talkCooldown = useRef(0);

  // the pointer lock with mouse look, then the keyboard and the gamepad (CLN-26: input/usePointerLock.ts,
  // input/usePlayerInput.ts) — their effects in the order they always ran
  usePointerLock(gl, yaw, pitch);
  const { keys, pad } = usePlayerInput();

  // fov: settings value, squeezed while aiming a ranged weapon (CLN-26: cameraRig.ts)
  useFovEase(camera, settings);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGameStore.getState();
    const frozen = st.paused || st.buildMode || st.panel !== 'none' || !!st.ceremony;
    const kb = useAppStore.getState().settings.keybinds;
    const isDown = (code: string) => keys.current[code] || pad.current[code];
    pollPads(frozen, pad, kb, yaw, pitch, dt);

    // knocked out and carried back to camp, or asked to be somewhere else: put there first (CLN-26:
    // game/playerPhysics/locomotion.ts, as is each way of moving below)
    relocate(pos, yaw);

    // camera orientation
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);

    if (!frozen) {
      keyboardLook(keys, kb, yaw, pitch, dt);
      camera.rotation.set(pitch.current, yaw.current, 0);
      if (st.photoMode) {
        flyPhoto(camera, pos, kb, keys, isDown, dt);
      } else if (crewState.engineId) {
        crewEngine(st, pos, yaw, grounded, vel, crewCooldown, dt);
      } else {
        walk(st, kb, isDown, pos, yaw, vel, grounded, wasOnOpenGround, arenaDamageTimer, stepTimer, dt);
      }

      // CLN-20 · the world's per-frame ticks (the fishing bite cycle, the
      // build challenge's countdown) — game/worldTick.ts, called from here
      // because they must run after this frame's movement and BEFORE the
      // targeting and performAction below, which read what they write
      tickWorldFrame(st, pos.current.x, pos.current.z);

      // what the player is looking at, its prompt, and acting on it — at once or held (CLN-26:
      // game/interaction/holdToAct.ts)
      holdToAct({ camera, pos, kb, isDown, pad, talkCooldown, holdTarget, holdTime, holdJustCompletedId, holdJustCompletedKind, grounded, vel, yaw }, st, dt);

      // CLN-20 · the world's half-second sweep (nearby stations, the wall
      // ring, respawns, plots, villagers) — game/worldTick.ts. The countdown
      // stays this component's own ref: it restarts at 0 with every mount, so
      // the first unfrozen frame after build mode sweeps at once.
      stationTimer.current -= dt;
      if (stationTimer.current <= 0) {
        stationTimer.current = WORLD_SWEEP_S;
        sweepWorld(st, pos.current.x, pos.current.z);
      }
    } else {
      dropHold(st, holdTarget);
    }

    // publish the player, read the aim and pin its nameplate, place the camera (CLN-26: publishPlayerState.ts,
    // aimReadout.ts, cameraRig.ts)
    publishPlayerState(st, frozen, kb, isDown, pos, yaw, pitch, grounded);
    readAim(st, camera, aimTimer, frozen, dt);
    pinNameplate(camera, gl);
    placeCamera(st, camera, pos, yaw, pitch);
  });

  return null;
}
