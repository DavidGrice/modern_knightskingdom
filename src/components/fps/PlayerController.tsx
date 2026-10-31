'use client';
// First-person controller: pointer-lock mouse look, WASD movement with
// collision against world props, and the hold-E interaction system.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import {
  EYE_HEIGHT, SPAWN,
} from '@/game/data/world';
import { audio } from '@/lib/audio';
import { playerState } from '@/game/playerState';
import { resolveInputDevice, interactLabel, clickHoldLabel } from '@/game/inputMode';
import { combatState, CLICK_HELD_TARGET_KINDS, damagePlayer, tryDodge, DODGE_SPEED } from '@/game/combat';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import { sweepWorld, tickWorldFrame, WORLD_SWEEP_S } from '@/game/worldTick';
import { ridingState, dismountHorse } from '@/game/riding';
import { fireCannon, ramCheck } from '@/game/siege';
import { cartState, cartLivePos } from '@/game/carts';
import { statsAccum } from '@/game/statsAccum';
import { onRoad, ROAD_SPEED_MULT } from '@/game/data/road';
import { crewEyeHeight, crewState, leaveEngine } from '@/game/crew';
import { exposeDebug } from '@/lib/debugHooks';
import { findTarget } from '@/game/interaction/findTarget';
import { performAction } from '@/game/interaction/performAction';
import { floorUnder, _terrainOut } from '@/game/playerPhysics/floor';
import { collide } from '@/game/playerPhysics/collide';
import { fall } from '@/game/playerPhysics/vertical';
import { usePointerLock } from './input/usePointerLock';
import { usePlayerInput } from './input/usePlayerInput';
import { pollPads } from './input/pads';
import { keyboardLook } from './input/look';
import { publishPlayerState } from './publishPlayerState';
import { readAim, pinNameplate } from './aimReadout';
import { useFovEase, placeCamera } from './cameraRig';


// Requested 2026-07-31: real per-frame GC pressure — `findTarget()`'s
// `consider()` closure ran once per interact candidate (every resource node/
// NPC/horse in range) and allocated a fresh Vector3 each call (its two
// scratch vectors went with it to game/interaction/findTarget.ts); the
// third-person camera-follow math allocated several more every frame,
// unthrottled. Reused scratch objects instead, the convention `plateV`
// (aimReadout.ts's now) had established; the camera-follow ones went to
// cameraRig.ts with the camera. None of these are ever stored past the
// statement that reads them — safe given PlayerController is a singleton,
// the same precondition `plateV` relies on.
const _camDirV = new THREE.Vector3();
const _rightV = new THREE.Vector3();
const _moveV = new THREE.Vector3();
const _dirV = new THREE.Vector3();
const _upV = new THREE.Vector3(0, 1, 0);

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
  // something built? The ledge test in the frame loop needs the PREVIOUS
  // answer, not just this one — see it for why.
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

    // knocked out -> carried back to camp (set by the combat system)
    if (combatState.teleportTo) {
      pos.current.set(combatState.teleportTo[0], EYE_HEIGHT, combatState.teleportTo[1]);
      combatState.teleportTo = null;
      if (ridingState.active) dismountHorse(pos.current.x + 2, pos.current.z, yaw.current);
    }

    // relocate the player on request (keep enter/exit, etc.)
    if (playerState.pendingTeleport) {
      const tp = playerState.pendingTeleport;
      pos.current.set(tp.x, EYE_HEIGHT, tp.z);
      if (tp.yaw !== undefined) yaw.current = tp.yaw;
      playerState.pendingTeleport = null;
    }

    // camera orientation
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);

    if (!frozen) {
      keyboardLook(keys, kb, yaw, pitch, dt);
      camera.rotation.set(pitch.current, yaw.current, 0);
      if (st.photoMode) {
        // Wave 40 (A6) · a dodge queued while free-flying (photo mode has no
        // combat) would otherwise sit stale and fire as a surprise roll the
        // moment the player exits it — discarded here instead, since only
        // the on-foot branch below ever consumes the flag.
        combatState.dodgeQueued = false;
        // free-fly: no collision, no gravity, moves along the view
        // direction (including vertically) rather than the ground plane
        const flySpeed = isDown(kb.sprint) ? 16 : 8;
        camera.getWorldDirection(_camDirV);
        _rightV.crossVectors(_camDirV, _upV).normalize();
        _moveV.set(0, 0, 0);
        if (isDown(kb.moveForward)) _moveV.add(_camDirV);
        if (isDown(kb.moveBack)) _moveV.sub(_camDirV);
        if (isDown(kb.moveRight)) _moveV.add(_rightV);
        if (isDown(kb.moveLeft)) _moveV.sub(_rightV);
        if (isDown(kb.jump)) _moveV.y += 1;
        if (keys.current['ControlLeft']) _moveV.y -= 1;
        if (_moveV.lengthSq() > 0) pos.current.addScaledVector(_moveV.normalize(), flySpeed * dt);
      } else if (crewState.engineId) {
        // Crewing an engine (rig lab: `traits.vehicle.canOccupy`). You're
        // planted in the crew position — no walking — and your look drives
        // the engine's aim, so a manned engine shoots where you're looking
        // instead of along the quarter-turn it was placed at. The attack
        // button looses a shot; E steps down.
        const eng = st.buildings.find((b) => b.id === crewState.engineId);
        if (!eng) leaveEngine();
        else {
          crewState.x = eng.x;
          crewState.z = eng.z;
          crewState.yaw = yaw.current;
          // stand at the engine's rear, behind the aim, so the camera isn't
          // buried inside the frame (yaw 0 looks -Z, so back is +Z)
          pos.current.set(
            eng.x + Math.sin(yaw.current) * crewState.back,
            (eng.y ?? 0) + crewEyeHeight(crewState.mode),
            eng.z + Math.cos(yaw.current) * crewState.back,
          );
          grounded.current = true;
          vel.current.y = 0;
          combatState.sprinting = false;
          combatState.galloping = false;
          crewCooldown.current -= dt;
          if (combatState.lmbDown && crewCooldown.current <= 0) {
            crewCooldown.current = 1.2;
            fireCannon(eng, yaw.current);
          }
        }
      } else {
      _dirV.set(
        (isDown(kb.moveRight) ? 1 : 0) - (isDown(kb.moveLeft) ? 1 : 0),
        0,
        (isDown(kb.moveBack) ? 1 : 0) - (isDown(kb.moveForward) ? 1 : 0),
      );
      const isMoving = _dirV.lengthSq() > 0;
      if (isMoving) {
        _dirV.normalize().applyAxisAngle(_upV, yaw.current);
      }
      // Wave 40 (A6) · dodge-roll: consume a queued press from
      // CombatController's input dispatch (keydown/touch/gamepad edge).
      // Mounted/crewing has no roll — crewing is already a different branch
      // of this if/else, so only riding needs an explicit check here. No
      // direction held = a back-step, so the button always does SOMETHING.
      if (combatState.dodgeQueued) {
        combatState.dodgeQueued = false;
        if (!ridingState.active && !crewState.engineId) {
          const backX = Math.sin(yaw.current), backZ = Math.cos(yaw.current);
          tryDodge(isMoving ? _dirV.x : backX, isMoving ? _dirV.z : backZ);
        }
      }
      // active burst: overrides steering AND speed below, but still feeds
      // the SAME collision-clamped nx/nz code every ordinary step already
      // resolves through — a bigger step, not a teleport through a wall.
      const dodging = performance.now() < combatState.dodgeUntil;
      if (dodging) _dirV.set(combatState.dodgeDir.x, 0, combatState.dodgeDir.z);
      // movement (mounted: faster, with a stamina-limited gallop; on foot:
      // sprinting spends stamina too, the same way a sword swing does,
      // rather than being a free speed boost)
      // requested 2026-08-03: the active arena environment's own
      // playerSpeedMult/playerStaminaDrainMult/ambientDamagePerSec
      // (game/arena.ts) — null outside the arena, so every multiplier below
      // defaults to 1 (no behavior change anywhere else in the game)
      const arenaEnv = st.destination === 'arena' && arenaState.env ? ARENA_ENV_BY_ID[arenaState.env] : null;
      const riding = ridingState.active;
      const sprintKey = isDown(kb.sprint);
      const galloping = riding && sprintKey && combatState.stamina > 5;
      combatState.galloping = galloping;
      if (galloping) combatState.stamina = Math.max(0, combatState.stamina - 11 * dt * (arenaEnv?.playerStaminaDrainMult ?? 1));
      const running = !riding && sprintKey && isMoving && combatState.stamina > 5;
      combatState.sprinting = running;
      if (running) combatState.stamina = Math.max(0, combatState.stamina - 8 * dt * (arenaEnv?.playerStaminaDrainMult ?? 1));
      const sprint = riding ? galloping : running;
      // Requested 2026-07-30, "part of our advanced building mechanics":
      // the road is home-only (road.ts's route is anchored off the
      // homestead's own SIGNPOST) and only real out in the open, not inside
      // a building's interior pocket.
      const onRoadNow = !st.destination && !st.interior && onRoad(pos.current.x, pos.current.z);
      // Wave 40 (A6) · a dodge burst is a flat speed override — no road/arena
      // multiplier stacking on top of it, same as it ignores sprint/gallop.
      const speed = dodging ? DODGE_SPEED
        : (riding ? (galloping ? 11 : 6) : sprint ? 7 : 4) * (onRoadNow ? ROAD_SPEED_MULT : 1) * (arenaEnv?.playerSpeedMult ?? 1);
      if (arenaEnv && arenaEnv.ambientDamagePerSec > 0) {
        arenaDamageTimer.current -= dt;
        if (arenaDamageTimer.current <= 0) {
          arenaDamageTimer.current = 1;
          damagePlayer(arenaEnv.ambientDamagePerSec);
        }
      } else {
        arenaDamageTimer.current = 1;
      }
      if (isMoving) statsAccum.distanceMeters += speed * dt;
      const p = pos.current;
      let nx = p.x + _dirV.x * speed * dt;
      let nz = p.z + _dirV.z * speed * dt;

      // collisions (game/playerPhysics/collide.ts): placed pieces, trees and
      // rocks, the pond and water, the world's edge — or an interior's walls
      const eyeOff = riding ? EYE_HEIGHT + 0.85 : EYE_HEIGHT;
      const feetY = p.y - eyeOff;
      ({ nx, nz } = collide(st, riding, feetY, nx, nz));
      p.x = nx;
      p.z = nz;

      // a pushed ram is glued in front of the player, a hitched cart trails
      // behind — both just live-position overrides until let go (settleCart)
      if (cartState.pushingId || cartState.hitchedId) {
        const fx = -Math.sin(yaw.current);
        const fz = -Math.cos(yaw.current);
        if (cartState.pushingId) {
          const cx = p.x + fx * 1.8;
          const cz = p.z + fz * 1.8;
          cartLivePos[cartState.pushingId] = { x: cx, z: cz };
          ramCheck(cartState.pushingId, cx, cz);
        }
        if (cartState.hitchedId) {
          cartLivePos[cartState.hitchedId] = { x: p.x - fx * 2.4, z: p.z - fz * 2.4 };
        }
      }

      // gravity / jump, standing on whatever structure is underfoot
      // Wave 12 · the mounted branch reads the ground too. A rider is
      // deliberately NOT put through floorHeightAt (a horse does not step onto
      // a barrel), but "no structures" is not "no terrain" — leaving this at 0
      // would have ridden the player straight through the hillside.
      const floorY = floorUnder(st, p, riding, eyeOff);
      const groundEye = floorY + eyeOff;
      // Wave 12 · is the thing holding us up the GROUND, or something standing
      // on it? Only the ledge test below cares, and only at home — a
      // destination bake is all terrain and keeps its existing behaviour
      // untouched. Two frames of it, because the answer alone is not enough:
      // see where it is read.
      const onOpenGround = !st.destination && floorY <= _terrainOut.y + 1e-6;
      const slopeUnderfoot = onOpenGround && wasOnOpenGround.current;
      wasOnOpenGround.current = onOpenGround;
      if (grounded.current && isDown(kb.jump) && !riding) {
        vel.current.y = 5;
        grounded.current = false;
      }
      fall(p, vel, grounded, dt, groundEye, slopeUnderfoot);

      // footsteps / hoofbeats
      if (riding) {
        audio.setLoop('canter', _dirV.lengthSq() > 0 ? (galloping ? 0.5 : 0.22) : 0);
      } else {
        audio.setLoop('canter', 0);
        if (_dirV.lengthSq() > 0 && grounded.current) {
          stepTimer.current -= dt;
          if (stepTimer.current <= 0) {
            audio.play('step', 0.25);
            stepTimer.current = sprint ? 0.32 : 0.46;
          }
        }
      }
      } // end photoMode / normal-movement branch

      // CLN-20 · the world's per-frame ticks (the fishing bite cycle, the
      // build challenge's countdown) — game/worldTick.ts, called from here
      // because they must run after this frame's movement and BEFORE the
      // targeting and performAction below, which read what they write
      tickWorldFrame(st, pos.current.x, pos.current.z);

      // interaction targeting + hold-E (construction sites AND gathering —
      // 'tree'/'rock'/'fishing'/'herb', requested 2026-07-30 "for mechanical
      // consistency" — are held via LMB/combatState.lmbDown instead, so
      // building and gathering both use the same click-and-hold feel as the
      // aerial build-mode placement and the ordinary attack button, not a
      // separate E prompt)
      const target = findTarget({ camera, pos }, st);
      st.setTargetKind(target ? (target.kind === 'rock' ? 'rock' : target.kind === 'fishing' ? 'fishing' : target.kind) : null);
      const isClickHeld = !!target && CLICK_HELD_TARGET_KINDS.has(target.kind);
      // Wave 15: the prompt has to name the control that ACTUALLY performs
      // it on whatever device the player is currently on — see
      // game/inputMode.ts's header for why "Click" is keyboard/mouse-only
      // (gamepad/touch never got a separate hold-input for gathering; they
      // still hold their ordinary Interact button, same as heldInput below
      // reads). HUD.tsx's kk-prompt regex only needs a single \S+ token
      // here, so any of these labels round-trips through it unchanged.
      const promptDevice = resolveInputDevice(useAppStore.getState().settings.inputMode, st.activeInputDevice);
      const eLabel = interactLabel(promptDevice);
      st.setPrompt(
        target
          ? target.duration > 0
            ? target.actionable ? `Hold ${isClickHeld ? clickHoldLabel(promptDevice) : eLabel} — ${target.label}` : target.label
            : `${eLabel} — ${target.label}`
          : null,
      );
      talkCooldown.current = Math.max(0, talkCooldown.current - dt);
      // keyboard's E no longer drives construction/gathering (that's now the
      // attack button's job, matching the aerial build-mode's click-and-hold
      // feel) — but gamepad/touch have no separate "hold to build/gather"
      // input mapped, so their interact button (pad.current, NOT the real
      // keyboard key) still works for it, same as always
      const heldInput = isClickHeld ? (combatState.lmbDown || pad.current[kb.interact]) : isDown(kb.interact);
      if (!heldInput) {
        holdJustCompletedId.current = null;
        holdJustCompletedKind.current = null;
      }
      const blockedTransition = !!target
        && holdJustCompletedId.current === target.id
        && holdJustCompletedKind.current !== target.kind;
      if (target && target.actionable && heldInput && !blockedTransition) {
        if (target.duration === 0) {
          if (talkCooldown.current <= 0) {
            performAction({ grounded, pos, talkCooldown, vel, yaw }, target, st);
            talkCooldown.current = 0.6;
          }
        } else {
          if (holdTarget.current !== target.id) {
            holdTarget.current = target.id;
            holdTime.current = 0;
          }
          holdTime.current += dt;
          st.setActionProgress(Math.min(1, holdTime.current / target.duration));
          if (holdTime.current >= target.duration) {
            performAction({ grounded, pos, talkCooldown, vel, yaw }, target, st);
            holdTime.current = 0;
            holdJustCompletedId.current = target.id;
            holdJustCompletedKind.current = target.kind;
          }
        }
      } else {
        if (holdTarget.current) {
          holdTarget.current = null;
          st.setActionProgress(null);
        }
      }

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
      if (st.prompt) st.setPrompt(null);
      if (st.actionProgress !== null) st.setActionProgress(null);
      holdTarget.current = null;
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
