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
import { NPC_BY_ID } from '@/game/data/npcs';
import { audio } from '@/lib/audio';
import { playerState } from '@/game/playerState';
import { touchState } from '@/game/touchInput';
import { noteInputDevice, resolveInputDevice, interactLabel, clickHoldLabel } from '@/game/inputMode';
import { combatState, useEnemyStore, CLICK_HELD_TARGET_KINDS, damagePlayer, tryDodge, DODGE_SPEED } from '@/game/combat';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import { sweepWorld, tickWorldFrame, WORLD_SWEEP_S } from '@/game/worldTick';
import { ridingState, dismountHorse } from '@/game/riding';
import { fireCannon, ramCheck } from '@/game/siege';
import { cartState, cartLivePos } from '@/game/carts';
import { statsAccum } from '@/game/statsAccum';
import { onRoad, ROAD_SPEED_MULT } from '@/game/data/road';
import { homeGroundY } from '../world/TemplateWorld';
import { aimState, resolveAim } from '@/game/targeting';
import { KIND_LABEL, maxHpOf, MOUNT_SEAT_Y, type EnemyKind } from '@/game/combat';
import { crewEyeHeight, crewState, leaveEngine } from '@/game/crew';
import { commandWheel, steerWheel } from '@/game/commandWheel';
import { pointerLockActive, releaseGameLock, requestGameLock } from '@/game/pointerLock';
import { exposeDebug } from '@/lib/debugHooks';
import { findTarget } from '@/game/interaction/findTarget';
import { performAction } from '@/game/interaction/performAction';
import { floorUnder, _terrainOut } from '@/game/playerPhysics/floor';
import { collide } from '@/game/playerPhysics/collide';
import { fall } from '@/game/playerPhysics/vertical';


/** scratch for projecting the aim target's head to screen space */
const plateV = new THREE.Vector3();

// Requested 2026-07-31: real per-frame GC pressure — `findTarget()`'s
// `consider()` closure ran once per interact candidate (every resource node/
// NPC/horse in range) and allocated a fresh Vector3 each call (its two
// scratch vectors went with it to game/interaction/findTarget.ts); the
// third-person camera-follow math allocated several more every frame,
// unthrottled. Reused scratch objects instead, same convention `plateV`
// above already established. None of these are ever stored past the
// statement that reads them — safe given PlayerController is a singleton,
// the same precondition `plateV` already relies on.
const _camDirV = new THREE.Vector3();
const _rightV = new THREE.Vector3();
const _moveV = new THREE.Vector3();
const _dirV = new THREE.Vector3();
const _upV = new THREE.Vector3(0, 1, 0);
const _aimFwdV = new THREE.Vector3();
const _eyeV = new THREE.Vector3();
const _camLookDirV = new THREE.Vector3();
const _camPosV = new THREE.Vector3();
const _camEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _lookAtV = new THREE.Vector3();

const STICK_DEADZONE = 0.25;

// Standard-mapping gamepad -> the same action codes keyboard uses, written
// into a separate `pad` record (not `keys`) so a stick returning to neutral
// can't be confused with "the keyboard key was never pressed" — the two
// sources are OR'd together at read time (see `isDown` in the component).
//
// Wave 61 (H1) · jump/interact/sprint's button indices now come from
// `gpBtn` (the live, possibly-rebound settings.gamepadButtons table —
// data/gamepadInput.ts) instead of being literal 0/2/5 here, the same
// pattern CombatController.tsx's attack/block/swap/dodge reads already use.
// D-pad -> movement stays a literal index on purpose (see that file's header
// comment for why movement itself isn't part of the rebind table).
function pollGamepad(
  pad: Record<string, boolean>,
  kb: Record<string, string>,
  gpBtn: Record<string, number>,
  yaw: { current: number },
  pitch: { current: number },
  invertY: boolean,
  dt: number,
) {
  const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
  const gp = pads?.[0];
  if (!gp) {
    // Wave 15: a mid-session disconnect (or simply no pad ever connected)
    // must not leave whatever this SAME pad record wrote last frame stuck
    // "held" — pad[...] is OR'd with the keyboard at read time (isDown(),
    // below), so a stale true here would keep moving/jumping/sprinting the
    // player with no controller attached at all. Cleared explicitly every
    // frame there's no gamepad rather than relying solely on the
    // 'gamepaddisconnected' event (see the connect/disconnect effect below)
    // — this self-heals even if that event is ever delayed or missed.
    pad[kb.moveForward] = false;
    pad[kb.moveBack] = false;
    pad[kb.moveLeft] = false;
    pad[kb.moveRight] = false;
    pad[kb.jump] = false;
    pad[kb.interact] = false;
    pad[kb.sprint] = false;
    return;
  }
  const [lx, ly, rx, ry] = gp.axes;
  const dpadUp = gp.buttons[12]?.pressed;
  const dpadDown = gp.buttons[13]?.pressed;
  const dpadLeft = gp.buttons[14]?.pressed;
  const dpadRight = gp.buttons[15]?.pressed;

  // Wave 15: a gamepad merely being CONNECTED shouldn't flip the HUD into
  // gamepad prompts — only the player actually touching it should. Checked
  // against every button/axis (not just the ones this function itself
  // consumes) so CombatController's RT/LT/Y and GamepadMenuController's
  // Start/B/LB/Back/L-stick reads all count too, from this one place.
  const anyAxis = [lx, ly, rx, ry].some((v) => Math.abs(v ?? 0) > STICK_DEADZONE);
  const anyButton = gp.buttons.some((b) => b.pressed);
  if (anyAxis || anyButton) noteInputDevice('gamepad');

  pad[kb.moveForward] = (ly ?? 0) < -STICK_DEADZONE || !!dpadUp;
  pad[kb.moveBack] = (ly ?? 0) > STICK_DEADZONE || !!dpadDown;
  pad[kb.moveLeft] = (lx ?? 0) < -STICK_DEADZONE || !!dpadLeft;
  pad[kb.moveRight] = (lx ?? 0) > STICK_DEADZONE || !!dpadRight;
  pad[kb.jump] = !!gp.buttons[gpBtn.jump]?.pressed; // default A
  pad[kb.interact] = !!gp.buttons[gpBtn.interact]?.pressed; // default X (held, matches "Hold E")
  pad[kb.sprint] = !!gp.buttons[gpBtn.sprint]?.pressed; // default RB

  // right stick -> look, analog (unlike the digital arrow-key look)
  const turn = 2.4 * dt;
  if (Math.abs(rx ?? 0) > STICK_DEADZONE) yaw.current -= rx * turn;
  if (Math.abs(ry ?? 0) > STICK_DEADZONE) {
    const d = ry * turn * (invertY ? -1 : 1);
    pitch.current = THREE.MathUtils.clamp(pitch.current - d, -1.45, 1.45);
  }
}

// Mobile-friendly pass (2026-07-20): TouchControls.tsx (a 2D HUD overlay, a
// separate React tree from this Canvas-side component) writes into
// game/touchInput.ts's leaf module every touch event; this reads it back
// each frame exactly like pollGamepad reads a real Gamepad — same `pad`
// record, same yaw/pitch refs, so every downstream isDown()/movement/look
// check already works with zero further changes.
function pollTouch(
  pad: Record<string, boolean>,
  kb: Record<string, string>,
  yaw: { current: number },
  pitch: { current: number },
  invertY: boolean,
) {
  if (!touchState.active) return;
  const dz = 0.3; // virtual-stick deadzone — thumbs drift more than a real analog stick
  // OR-merge, not overwrite: pollGamepad already ran this frame, and on a
  // hybrid device (touch + a connected gamepad) a `false` touch channel must
  // not clear a `true` the gamepad just set for the same action.
  pad[kb.moveForward] = pad[kb.moveForward] || touchState.moveY < -dz;
  pad[kb.moveBack] = pad[kb.moveBack] || touchState.moveY > dz;
  pad[kb.moveLeft] = pad[kb.moveLeft] || touchState.moveX < -dz;
  pad[kb.moveRight] = pad[kb.moveRight] || touchState.moveX > dz;
  pad[kb.jump] = pad[kb.jump] || touchState.jump;
  pad[kb.interact] = pad[kb.interact] || touchState.interact;
  pad[kb.sprint] = pad[kb.sprint] || touchState.sprint;

  // look-drag deltas are per-event accumulations since last frame (mirrors
  // mouse movementX/Y) — apply with the same sensitivity formula the mouse
  // path uses, then consume (zero) them so they don't compound next frame
  if (touchState.lookDX !== 0 || touchState.lookDY !== 0) {
    const sens = 0.0022 * useAppStore.getState().settings.mouseSensitivity * 2;
    yaw.current -= touchState.lookDX * sens;
    const dy = touchState.lookDY * sens * (invertY ? -1 : 1);
    pitch.current = THREE.MathUtils.clamp(pitch.current - dy, -1.45, 1.45);
    touchState.lookDX = 0;
    touchState.lookDY = 0;
  }
}

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
  const keys = useRef<Record<string, boolean>>({});
  const pad = useRef<Record<string, boolean>>({});
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
  const locked = useRef(false);
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
  /** the retrying pointer-lock request, shared with the panel watcher below */
  const lockRef = useRef<(() => void) | null>(null);
  const lockCleanup = useRef<(() => void) | null>(null);

  // ---- pointer lock + mouse look ----
  //
  // Losing the pointer used to mean losing mouse-look until you remembered to
  // click the world again: the lock was only ever requested from a click, so
  // every panel you closed, every pause you came back from, dropped you into a
  // dead camera. That is the immersion break — not the panel itself, but the
  // silence afterwards.
  //
  // The rule now is intent-based: whenever the game is in PLAY (not paused, no
  // panel, not in build view) the controller WANTS the lock, and it keeps
  // asking until it has it. Two things make that non-trivial, and both are
  // handled below rather than hoped about:
  //   · a browser refuses `requestPointerLock` for about a second after the
  //     user pressed Esc to leave it, and fails SILENTLY through
  //     `pointerlockerror` — so an immediate re-request after closing a panel
  //     with Esc is exactly the case that does not work;
  //   · the request needs the document focused, which it is not while an
  //     alert or a devtools pane has it.
  // So a failed attempt schedules another rather than giving up.
  useEffect(() => {
    const el = gl.domElement;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const wantsLock = () => {
      const st = useGameStore.getState();
      return !st.paused && !st.buildMode && st.panel === 'none';
    };
    const tryLock = () => {
      if (retry) { clearTimeout(retry); retry = null; }
      if (!wantsLock() || pointerLockActive(el)) return;
      // NEVER take the pointer while the player is somewhere else. The first
      // cut of this retried on a timer, on pointerlockerror and on window
      // focus, which meant clicking into another window — a browser tab, a
      // chat — handed the pointer straight back to the game and trapped it
      // there. Wanting the lock is not the same as being entitled to it.
      if (!document.hasFocus()) return;
      // (game/pointerLock.ts: a browser under automation gets a virtual lock, never the real one)
      try {
        requestGameLock(el);
      } catch { /* the next click will do it */ }
    };
    lockRef.current = tryLock;

    const onClick = () => tryLock();
    const onLockChange = () => {
      locked.current = pointerLockActive(el);
      // deliberately nothing here. Losing the pointer is often the player
      // LEAVING — alt-tab, a click into another window — and grabbing it
      // back is the behaviour that made the game feel like it would not let
      // go. A click on the world takes it again, which is the gesture the
      // player already knows.
    };
    lockCleanup.current = () => { if (retry) clearTimeout(retry); };
    const onMove = (e: MouseEvent) => {
      if (!locked.current) return;
      // I41 · while the order radial is held open, the pointer steers the
      // WHEEL rather than the camera — which is the whole point: the lock is
      // never released, so giving an order does not punch a hole in
      // mouse-look the way opening a modal did.
      if (commandWheel.open) { steerWheel(e.movementX, e.movementY); return; }
      const sens = 0.0022 * useAppStore.getState().settings.mouseSensitivity * 2;
      yaw.current -= e.movementX * sens;
      const dy = e.movementY * sens * (useAppStore.getState().settings.invertY ? -1 : 1);
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy, -1.45, 1.45);
    };
    el.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMove);
      lockCleanup.current?.();
      if (pointerLockActive(el)) releaseGameLock();
    };
  }, [gl]);

  // Release the pointer when something genuinely needs the cursor — and TAKE
  // IT BACK the moment that thing is done. The retaking is the half that was
  // missing: closing a panel used to leave the camera dead until you clicked.
  useEffect(() => {
    let blocked = false;
    const unsub = useGameStore.subscribe((st) => {
      const nowBlocked = st.paused || st.panel !== 'none' || st.buildMode;
      if (nowBlocked) releaseGameLock();
      if (blocked && !nowBlocked) {
        // Closing a panel is the one transition the game itself drives, so it
        // is the one place worth asking unprompted — once, and only if the
        // window still has focus. If the browser refuses (its post-Esc
        // cooldown), a click takes it back.
        setTimeout(() => lockRef.current?.(), 120);
      }
      blocked = nowBlocked;
    });
    return unsub;
  }, []);

  // ---- keyboard ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; noteInputDevice('keyboard'); };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ---- gamepad connect/disconnect ----
  // Wave 15: navigator.getGamepads() is polled cold every frame elsewhere
  // (pollGamepad above, and CombatController/GamepadMenuController's own
  // reads) rather than cached from these events, so nothing here is load-
  // bearing for correctness — pollGamepad's own `!gp` branch already self-
  // heals a stale hold the frame after a disconnect regardless of whether
  // this event ever fires. What these two listeners buy: a visible cue that
  // a controller was recognised at all (nothing else in the UI shows
  // connection state), and clearing `pad` immediately on disconnect instead
  // of waiting up to one frame for the poll loop to notice.
  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      useGameStore.getState().notify(`🎮 Controller connected: ${e.gamepad.id}`);
    };
    const onDisconnect = (e: GamepadEvent) => {
      pad.current = {};
      useGameStore.getState().notify(`🎮 Controller disconnected: ${e.gamepad.id}`);
    };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  // fov: settings value, squeezed while aiming the crossbow
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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGameStore.getState();
    const frozen = st.paused || st.buildMode || st.panel !== 'none' || !!st.ceremony;
    const kb = useAppStore.getState().settings.keybinds;
    const isDown = (code: string) => keys.current[code] || pad.current[code];
    if (!frozen) {
      pollGamepad(pad.current, kb, useAppStore.getState().settings.gamepadButtons, yaw, pitch, useAppStore.getState().settings.invertY, dt);
      pollTouch(pad.current, kb, yaw, pitch, useAppStore.getState().settings.invertY);
    } else pad.current = {};

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
      // keyboard camera turning (arrow keys), in addition to mouse look
      const turn = 2.0 * dt;
      if (keys.current[kb.lookLeft]) yaw.current += turn;
      if (keys.current[kb.lookRight]) yaw.current -= turn;
      if (keys.current[kb.lookUp]) pitch.current = THREE.MathUtils.clamp(pitch.current + turn, -1.45, 1.45);
      if (keys.current[kb.lookDown]) pitch.current = THREE.MathUtils.clamp(pitch.current - turn, -1.45, 1.45);
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

    // publish transform for the avatar / viewmodel
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

    // what the crosshair is on — one resolve feeding the aim readout, the
    // crosshair's colour and the collection-book scan, so all three always
    // agree. Throttled: the ray is cheap but there is no reason to redo it
    // every frame for a DOM overlay that repaints far slower.
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

    // Pin the nameplate over the target's head. Projected EVERY frame, not on
    // the 10 Hz aim throttle, so the plate tracks the figure smoothly while
    // you turn rather than swimming after them.
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

    // camera: first person at the eyes, third person orbiting behind.
    // Mounted always forces first person regardless of the general on-foot
    // preference — MountedHorse.tsx positions the horse's body/neck
    // BODY_FORWARD units ahead of the camera specifically so a first-person
    // view looks out over its mane; a third-person chase cam here would
    // just show the rider from behind, defeating that entirely.
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
  });

  return null;
}
