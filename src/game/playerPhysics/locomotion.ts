// CLN-26 · how the player moves, frame by frame, moved from PlayerController.tsx as it was: the relocations first
// (knocked out and carried back to camp; a teleport asked for), then one of three ways to move — photo mode's free
// flight (no collision, no gravity, along the view), planted at an engine the player crews (the look aims it, the
// attack button fires it), or a step on foot or on horseback (steering, the dodge-roll, speed and stamina, the arena's
// chip damage, collisions, a cart being pushed or towed, the floor, the jump and the fall, footsteps).
import * as THREE from 'three';
import type { useGameStore } from '@/game/store/gameStore';
import { EYE_HEIGHT } from '@/game/data/world';
import { audio } from '@/lib/audio';
import { playerState } from '@/game/playerState';
import { combatState, damagePlayer, tryDodge, DODGE_SPEED } from '@/game/combat';
import { arenaState, ARENA_ENV_BY_ID } from '@/game/arena';
import { ridingState, dismountHorse } from '@/game/riding';
import { fireCannon, ramCheck } from '@/game/siege';
import { cartState, cartLivePos } from '@/game/carts';
import { statsAccum } from '@/game/statsAccum';
import { onRoad, ROAD_SPEED_MULT } from '@/game/data/road';
import { crewEyeHeight, crewState, leaveEngine } from '@/game/crew';
import { floorUnder, _terrainOut } from './floor';
import { collide } from './collide';
import { fall } from './vertical';

// scratch for the movement maths (moved with it from PlayerController.tsx, where these first replaced per-frame
// allocations — the GC-pressure fix requested 2026-07-31): never kept past the statement that reads it — safe while there
// is one player, PlayerController's own singleton precondition
const _camDirV = new THREE.Vector3();
const _rightV = new THREE.Vector3();
const _moveV = new THREE.Vector3();
const _dirV = new THREE.Vector3();
const _upV = new THREE.Vector3(0, 1, 0);

/** knocked out -> carried back to camp (set by the combat system); a relocation asked for (keep enter/exit, etc.) */
export function relocate(pos: { current: THREE.Vector3 }, yaw: { current: number }): void {
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
}

/** photo mode: free flight along the view — no collision, no gravity */
export function flyPhoto(camera: THREE.Camera, pos: { current: THREE.Vector3 }, kb: Record<string, string>, keys: { current: Record<string, boolean> }, isDown: (code: string) => boolean, dt: number): void {
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
}

/** crewing an engine: planted at its rear, the look aiming it, the attack button firing it */
export function crewEngine(st: ReturnType<typeof useGameStore.getState>, pos: { current: THREE.Vector3 }, yaw: { current: number }, grounded: { current: boolean }, vel: { current: THREE.Vector3 }, crewCooldown: { current: number }, dt: number): void {
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
}

/** a step on foot or on horseback: where the controls point, a dodge-roll, how fast (sprint and gallop spending
 *  stamina; the road; the arena's own multipliers and chip damage), the stride clamped by every collision, a cart being
 *  pushed or towed, then the floor under it, the jump and the fall, and the footsteps or hoofbeats */
export function walk(st: ReturnType<typeof useGameStore.getState>, kb: Record<string, string>, isDown: (code: string) => boolean, pos: { current: THREE.Vector3 }, yaw: { current: number }, vel: { current: THREE.Vector3 }, grounded: { current: boolean }, wasOnOpenGround: { current: boolean }, arenaDamageTimer: { current: number }, stepTimer: { current: number }, dt: number): void {
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
  // of PlayerController's photo/crew/on-foot if/else (crewEngine runs
  // instead of walk), so only riding needs an explicit check here. No
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
}
