'use client';
// First-person controller: pointer-lock mouse look, WASD movement with
// collision against world props, and the hold-E interaction system.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore, TAX_COOLDOWN_MS } from '@/game/store/gameStore';
import { LAND_TIERS, BUILDABLE_BY_ID, heightOf, labAssetId, sizeFor, collisionBoxesFor } from '@/game/data/buildables';
import {
  CEDRIC_CAMP, CEDRIC_INTERACT_RANGE, CEDRIC_REVEAL_QUEST, CEDRIC_WORLD,
  EYE_HEIGHT, FISHING_DOCK, INTERACT_RANGE, KEEP_CHEST_POS, KEEP_ENTER_RANGE, KEEP_INTERIOR, KEEP_THRONE_POS,
  POND, SIGNPOST, SPAWN, STATION_RANGE, WORLD_HALF,
} from '@/game/data/world';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { NPCS, NPC_BY_ID, isNpcRevealed } from '@/game/data/npcs';
import { audio } from '@/lib/audio';
import { worldEnv } from '@/game/env';
import { playerState } from '@/game/playerState';
import { touchState } from '@/game/touchInput';
import { combatState, useEnemyStore } from '@/game/combat';
import { fishingState, startFishing, tickFishing } from '@/game/fishing';
import { ridingState, horses, mountHorse, dismountHorse, stableHorse, stabledHorses } from '@/game/riding';
import { detonate, fireCannon, quintainHit, ramCheck } from '@/game/siege';
import { cartState, cartLivePos } from '@/game/carts';
import { statsAccum } from '@/game/statsAccum';
import { dungeonState } from '@/game/dungeon';
import { npcMobs } from '@/game/npcMobs';
import { isBuilt, isHomeBuilding } from '@/game/types';
import { GUILD_BY_WORLD } from '@/game/data/guilds';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import { destinationGroundY } from '../world/TemplateWorld';
import { labCanFire, labCanOccupy, labCanStandOn, labIsExplosive, labOccupyMode } from '@/game/data/labCapabilities';
import { aimState, resolveAim } from '@/game/targeting';
import { GROUNDS, GROUND_BY_ID, deedName, groundOpen } from '@/game/data/grounds';
import { KEEP_PART_BY_ID, KEEP_SOCKETS } from '@/game/data/keep';
import { SET_PLANS, setStepCount } from '@/lib/setBuild';
import { KIND_LABEL, maxHpOf, type EnemyKind } from '@/game/combat';
import { crewEyeHeight, crewState, leaveEngine, manEngine } from '@/game/crew';
import { commandWheel, steerWheel } from '@/game/commandWheel';

interface Target {
  id: string;
  label: string;
  actionable: boolean;
  duration: number; // seconds of holding E; 0 = instant
  kind: 'tree' | 'rock' | 'fishing' | 'herb' | 'npc' | 'station' | 'bed' | 'horse' | 'dismount' | 'quintain' | 'cannon' | 'merchant' | 'plot' | 'keep_enter' | 'keep_exit' | 'chest' | 'collect_taxes' | 'gate' | 'travel_board' | 'travel_return' | 'joust' | 'push_cart' | 'hitch_cart' | 'challenge_cedric' | 'construct' | 'guild_hall' | 'detonate' | 'man_engine' | 'leave_engine' | 'keep_socket' | 'keep_work' | 'buy_ground' | 'workshop' | 'set_part';
  station?: string;
}

/** scratch for projecting the aim target's head to screen space */
const plateV = new THREE.Vector3();

/** J49 · the most hammer swings any one piece can ask for. At the hold
 *  duration below that is a bit over half a minute for the Grand Keep, and
 *  five or six seconds for a barrel. */
const CONSTRUCT_MAX_SWINGS = 26;

const PLAYER_RADIUS = 0.45;
const STEP_UP = 0.55; // max ledge height climbed without jumping
const STICK_DEADZONE = 0.25;

// Standard-mapping gamepad -> the same action codes keyboard uses, written
// into a separate `pad` record (not `keys`) so a stick returning to neutral
// can't be confused with "the keyboard key was never pressed" — the two
// sources are OR'd together at read time (see `isDown` in the component).
function pollGamepad(
  pad: Record<string, boolean>,
  kb: Record<string, string>,
  yaw: { current: number },
  pitch: { current: number },
  invertY: boolean,
  dt: number,
) {
  const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
  const gp = pads?.[0];
  if (!gp) return;
  const [lx, ly, rx, ry] = gp.axes;
  const dpadUp = gp.buttons[12]?.pressed;
  const dpadDown = gp.buttons[13]?.pressed;
  const dpadLeft = gp.buttons[14]?.pressed;
  const dpadRight = gp.buttons[15]?.pressed;

  pad[kb.moveForward] = (ly ?? 0) < -STICK_DEADZONE || !!dpadUp;
  pad[kb.moveBack] = (ly ?? 0) > STICK_DEADZONE || !!dpadDown;
  pad[kb.moveLeft] = (lx ?? 0) < -STICK_DEADZONE || !!dpadLeft;
  pad[kb.moveRight] = (lx ?? 0) > STICK_DEADZONE || !!dpadRight;
  pad[kb.jump] = !!gp.buttons[0]?.pressed; // A
  pad[kb.interact] = !!gp.buttons[2]?.pressed; // X (held, matches "Hold E")
  pad[kb.sprint] = !!gp.buttons[5]?.pressed; // RB

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
  pad[kb.moveForward] = touchState.moveY < -dz;
  pad[kb.moveBack] = touchState.moveY > dz;
  pad[kb.moveLeft] = touchState.moveX < -dz;
  pad[kb.moveRight] = touchState.moveX > dz;
  pad[kb.jump] = touchState.jump;
  pad[kb.interact] = touchState.interact;
  pad[kb.sprint] = touchState.sprint;

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

/** highest structure top at (x, z) that the player can stand on given their feet height */
function floorHeightAt(
  st: ReturnType<typeof useGameStore.getState>,
  x: number,
  z: number,
  feetY: number,
): number {
  let floor = 0;
  for (const b of st.buildings) {
    if (!isBuilt(b)) continue; // a construction-site ghost holds no one's weight
    // the rig lab checked, per asset, whether a minifig can actually stand on
    // a piece — a catapult's arm or a powder barrel is not a floor. Anything
    // the lab didn't chart keeps the old "everything is standable" default.
    if (!labCanStandOn(labAssetId(b.type), true)) continue;
    const [sx, sz] = sizeFor(b.type, b.rot);
    if (Math.abs(b.x - x) > sx / 2 + PLAYER_RADIUS * 0.6) continue;
    if (Math.abs(b.z - z) > sz / 2 + PLAYER_RADIUS * 0.6) continue;
    const top = (b.y ?? 0) + heightOf(b.type);
    if (top <= feetY + STEP_UP && top > floor) floor = top;
  }
  return floor;
}

export default function PlayerController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  // debug handle, same as the other __kk leaves: lets a smoke test walk the
  // live scene graph (which is how the sky-box offset in K60 was found)
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__kkscene = scene;
    w.__kkcam = camera;
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
      if (!wantsLock() || document.pointerLockElement === el) return;
      // NEVER take the pointer while the player is somewhere else. The first
      // cut of this retried on a timer, on pointerlockerror and on window
      // focus, which meant clicking into another window — a browser tab, a
      // chat — handed the pointer straight back to the game and trapped it
      // there. Wanting the lock is not the same as being entitled to it.
      if (!document.hasFocus()) return;
      try {
        const r = el.requestPointerLock() as unknown as Promise<void> | undefined;
        // a rejection is the browser's post-Esc cooldown; let it go rather
        // than hammering, the next click will do it
        if (r && typeof r.catch === 'function') r.catch(() => {});
      } catch { /* the next click will do it */ }
    };
    lockRef.current = tryLock;

    const onClick = () => tryLock();
    const onLockChange = () => {
      locked.current = document.pointerLockElement === el;
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
      if (document.pointerLockElement === el) document.exitPointerLock();
    };
  }, [gl]);

  // Release the pointer when something genuinely needs the cursor — and TAKE
  // IT BACK the moment that thing is done. The retaking is the half that was
  // missing: closing a panel used to leave the camera dead until you clicked.
  useEffect(() => {
    let blocked = false;
    const unsub = useGameStore.subscribe((st) => {
      const nowBlocked = st.paused || st.panel !== 'none' || st.buildMode;
      if (nowBlocked && document.pointerLockElement) document.exitPointerLock();
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
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // fov: settings value, squeezed while aiming the crossbow
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const target = combatState.aiming ? settings.fov * 0.62 : settings.fov;
    if (Math.abs(cam.fov - target) > 0.1) {
      cam.fov += (target - cam.fov) * Math.min(1, dt * 10);
      cam.updateProjectionMatrix();
    }
  });

  // ---- find what the player is looking at ----
  function findTarget(st: ReturnType<typeof useGameStore.getState>): Target | null {
    // inside the keep: E opens the chest or collects taxes at the throne when close, otherwise leaves
    if (st.interior) {
      const toChest = Math.hypot(KEEP_CHEST_POS.x - pos.current.x, KEEP_CHEST_POS.z - pos.current.z);
      if (toChest < INTERACT_RANGE) {
        return {
          id: 'keep_chest', kind: 'chest', duration: 0.8, actionable: true,
          label: st.treasureOpened ? 'Open the empty chest' : 'Open the Royal Treasure Chest',
        };
      }
      const toThrone = Math.hypot(KEEP_THRONE_POS.x - pos.current.x, KEEP_THRONE_POS.z - pos.current.z);
      if (toThrone < INTERACT_RANGE) {
        const ready = Date.now() - st.lastTaxAt >= TAX_COOLDOWN_MS && st.villagers.length > 0;
        return {
          id: 'keep_throne', kind: 'collect_taxes', duration: 1.2, actionable: ready,
          label: ready ? 'Collect Taxes from the Kingdom' : "The Treasury Isn't Ready Yet",
        };
      }
      return { id: 'keep_exit', kind: 'keep_exit', duration: 0, actionable: true, label: 'Leave the Keep' };
    }
    // mounted: E trains at a nearby quintain, jousts Richard at a gallop,
    // otherwise dismounts. Checked BEFORE the destination branch (Phase 20:
    // Richard's jousting field IS a destination now — the Tourney Grounds)
    if (ridingState.active) {
      const richard = NPC_BY_ID['richard'];
      if (richard && isNpcRevealed(richard, st.completedQuests)
        && Math.hypot(richard.x - pos.current.x, richard.z - pos.current.z) < INTERACT_RANGE + 2.5) {
        return {
          id: 'richard', kind: 'joust', duration: 0.8, actionable: combatState.galloping,
          label: combatState.galloping ? 'Couch your lance!' : 'Gallop (Shift) to charge Richard',
        };
      }
      for (const b of st.buildings) {
        if (b.type !== 'quintain') continue;
        if (Math.hypot(b.x - pos.current.x, b.z - pos.current.z) < INTERACT_RANGE + 1.2) {
          return { id: b.id, kind: 'quintain', duration: 0.9, actionable: true, label: 'Mounted training!' };
        }
      }
      return { id: 'dismount', kind: 'dismount', label: 'Dismount', duration: 0, actionable: true };
    }
    // away visiting a template world: residents (Phase 20 — the court, their
    // horses, Cedric's camp all live out here now) take priority when within
    // reach; anywhere else in the instance, E returns home exactly as before
    if (st.destination) {
      for (const n of NPCS) {
        if (n.world !== st.destination) continue;
        if (!isNpcRevealed(n, st.completedQuests)) continue;
        const mob = npcMobs[n.id];
        const nx = mob?.x ?? n.x;
        const nz = mob?.z ?? n.z;
        if (Math.hypot(nx - pos.current.x, nz - pos.current.z) < INTERACT_RANGE) {
          return { id: n.id, kind: 'npc', duration: 0, actionable: true, label: `Talk to ${n.name}` };
        }
      }
      for (const h of Object.values(horses)) {
        if (h.mounted) continue;
        if (Math.hypot(h.x - pos.current.x, h.z - pos.current.z) < INTERACT_RANGE) {
          return { id: h.id, kind: 'horse', duration: 0, actionable: true, label: 'Ride Horse' };
        }
      }
      // Cedric's camp at The Rival Castle: unsworn parleys, crown-sworn
      // fights — and his own bannermen sit the WAR COUNCIL for rebellion
      // errands (Phase 20 4b) instead of raising a hand against him
      if (
        st.destination === CEDRIC_WORLD
        && st.completedQuests.includes(CEDRIC_REVEAL_QUEST) && !st.defeatedCedric
        && !useEnemyStore.getState().enemies.some((e) => e.kind === 'cedric')
        && Math.hypot(CEDRIC_CAMP.x - pos.current.x, CEDRIC_CAMP.z - pos.current.z) < CEDRIC_INTERACT_RANGE
      ) {
        return {
          id: 'cedric', kind: 'challenge_cedric', duration: 0, actionable: true,
          label: st.alliance === 'cedric' ? 'Sit the War Council'
            : st.alliance === 'leo' ? 'Challenge Cedric the Bull'
            : 'Approach Cedric the Bull',
        };
      }
      // guild halls (Phase 21): each guild's hall sits near its world's landing
      const hall = GUILD_BY_WORLD[st.destination];
      if (hall && Math.hypot(hall.hallX - pos.current.x, hall.hallZ - pos.current.z) < INTERACT_RANGE + 1) {
        return {
          id: hall.id, kind: 'guild_hall', duration: 0, actionable: true,
          label: st.guild === hall.id ? `${hall.name} (your banner)` : `Enter the ${hall.name}`,
        };
      }
      return { id: 'travel_return', kind: 'travel_return', duration: 0, actionable: true, label: 'Return Home' };
    }
    // already pushing/hitched: E always lets go, regardless of which way
    // you're currently facing (the cart follows you, so "look at it" isn't
    // a meaningful requirement the way it is for a stationary target)
    // crewing an engine: E always steps down (firing is the attack button,
    // see the crew block in the frame loop), so nothing else competes for it
    if (crewState.engineId) {
      const eb = st.buildings.find((x) => x.id === crewState.engineId);
      return {
        id: crewState.engineId, kind: 'leave_engine', duration: 0, actionable: true,
        label: `Step down from the ${eb ? BUILDABLE_BY_ID[eb.type]?.name ?? 'engine' : 'engine'}`,
      };
    }
    if (cartState.pushingId) {
      return { id: cartState.pushingId, kind: 'push_cart', duration: 0, actionable: true, label: 'Let go of the Ram' };
    }
    if (cartState.hitchedId) {
      return { id: cartState.hitchedId, kind: 'hitch_cart', duration: 0, actionable: true, label: 'Unhitch the Cart' };
    }
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const p = pos.current;
    let best: { t: Target; score: number } | null = null;

    const consider = (x: number, z: number, y: number, t: Target, range = INTERACT_RANGE) => {
      const to = new THREE.Vector3(x - p.x, y - p.y, z - p.z);
      const dist = Math.hypot(to.x, to.z);
      if (dist > range) return;
      to.normalize();
      const dot = to.dot(forward);
      if (dot < 0.45) return;
      const score = dot - dist * 0.05;
      if (!best || score > best.score) best = { t, score };
    };

    // a worn-out tool (durability hit 0) still works, just slower — a nudge
    // toward the workbench rather than a hard block on gathering
    const wornPenalty = (id: 'axe' | 'pickaxe' | 'fishing_rod') => ((st.durability[id] ?? 100) <= 0 ? 1.4 : 1);

    for (const n of st.nodes) {
      if (n.respawnAt !== null) continue;
      // J46 · a node in a ground beyond your deed can be walked up to and
      // read, but not worked — that is what makes buying the next deed an
      // acquisition rather than a wider fence
      const gr = n.ground ? GROUND_BY_ID[n.ground] : null;
      const beyondDeed = !!gr && !groundOpen(gr, st.landTier);
      if (beyondDeed) {
        consider(n.x, n.z, n.kind === 'tree' ? 1.2 : 0.8, {
          id: n.id, kind: n.kind, duration: 1, actionable: false,
          label: `${gr!.name} — needs the ${deedName(gr!.tier)} deed`,
        });
        continue;
      }
      if (n.kind === 'tree') {
        consider(n.x, n.z, 1.2, {
          id: n.id, kind: 'tree', duration: 1.6 * wornPenalty('axe'), actionable: true, label: 'Chop Tree',
        });
      } else if (n.kind === 'herb') {
        consider(n.x, n.z, 0.7, {
          id: n.id, kind: 'herb', duration: 1.0, actionable: true, label: 'Forage Herbs',
        });
      } else if (n.kind === 'rock') {
        const hasPick = (st.inventory.pickaxe ?? 0) > 0;
        if (n.variant === 'iron') {
          const mining = st.unlocks.includes('mining');
          consider(n.x, n.z, 0.8, {
            id: n.id, kind: 'rock', duration: 2.2 * wornPenalty('pickaxe'), actionable: hasPick && mining,
            label: !mining ? 'A strange dark rock… (learn Mining)'
              : hasPick ? 'Mine Iron Vein' : 'You need a Pickaxe',
          });
        } else {
          consider(n.x, n.z, 0.8, {
            id: n.id, kind: 'rock', duration: 1.9 * wornPenalty('pickaxe'), actionable: hasPick,
            label: hasPick ? 'Mine Boulder' : 'You need a Pickaxe',
          });
        }
      } else if (n.kind === 'fishing') {
        const hasRod = (st.inventory.fishing_rod ?? 0) > 0;
        const unlocked = st.unlocks.includes('fishing');
        if (!unlocked || !hasRod) {
          consider(n.x, n.z, 0.9, {
            id: n.id, kind: 'fishing', duration: 1, actionable: false,
            label: !unlocked ? 'The fish ignore you… (locked)' : 'You need a Fishing Rod',
          });
        } else if (fishingState.nodeId !== n.id) {
          consider(n.x, n.z, 0.9, {
            id: n.id, kind: 'fishing', duration: 0.8 * wornPenalty('fishing_rod'), actionable: true, label: 'Cast your line',
          });
        } else if (fishingState.phase === 'waiting') {
          consider(n.x, n.z, 0.9, {
            id: n.id, kind: 'fishing', duration: 1, actionable: false, label: 'Watching the water…',
          });
        } else {
          consider(n.x, n.z, 0.9, {
            id: n.id, kind: 'fishing', duration: 0.06, actionable: true, label: 'Bite!',
          });
        }
      }
    }
    // wild horses can be ridden
    for (const h of Object.values(horses)) {
      if (h.mounted) continue;
      consider(h.x, h.z, 1.1, {
        id: h.id, kind: 'horse', duration: 0, actionable: true, label: 'Ride Horse',
      });
    }
    // L69 · the deed ladder used to live entirely in a build-menu button, so
    // the only way to learn that a ground could be bought was to find that
    // button. Every ground's boundary stone is now an interaction: walk up to
    // it and it either tells you what the deed costs or takes your gold.
    for (const g of GROUNDS) {
      const sx = g.x;
      const sz = g.z + (g.z > 0 ? -g.halfZ : g.halfZ);
      if (groundOpen(g, st.landTier)) {
        consider(sx, sz, 2.4, {
          id: g.id, kind: 'buy_ground', duration: 0, actionable: false,
          label: `${g.name} — yours to work`,
        });
      } else {
        // the next deed up the ladder is the one that buys this ground
        const need = LAND_TIERS[Math.min(g.tier, LAND_TIERS.length - 1)];
        const canBuyNow = st.landTier + 1 >= g.tier;
        const nextCost = LAND_TIERS[Math.min(st.landTier + 1, LAND_TIERS.length - 1)]?.cost ?? 0;
        const gold = st.inventory.gold ?? 0;
        consider(sx, sz, 2.4, {
          id: g.id, kind: 'buy_ground', duration: 0, actionable: canBuyNow && gold >= nextCost,
          label: canBuyNow
            ? (gold >= nextCost
              ? `Buy the ${LAND_TIERS[st.landTier + 1].name} deed · ${nextCost}g — opens ${g.name}`
              : `${g.name} needs the ${LAND_TIERS[st.landTier + 1].name} deed · ${nextCost}g (you have ${gold})`)
            : `${g.name} — held under the ${need.name} deed, still ${g.tier - st.landTier} deeds away`,
        });
      }
    }

    // M · the workshop. A workbench with nothing on it opens the set list;
    // one with a set laid out takes the work, a piece per hold.
    for (const b of st.buildings) {
      if (b.type !== 'workbench' || !isBuilt(b) || !isHomeBuilding(b)) continue;
      const w = st.workshop;
      if (w) {
        const total = setStepCount(w.setNum);
        consider(b.x, b.z, 2.6, {
          id: b.id, kind: 'set_part', duration: 0.55, actionable: true,
          label: `Set the next piece — ${SET_PLANS[w.setNum]?.name} (${w.step}/${total})`,
        });
      } else {
        consider(b.x, b.z, 2.6, {
          id: b.id, kind: 'workshop', duration: 0, actionable: true,
          label: 'Open the workshop',
        });
      }
    }

    // J51 · the castle foundation. Each socket is its own place to stand:
    // an empty one offers what can be raised there, a staked-out one takes
    // hammer work like any other construction site.
    if (st.keep) {
      for (const sock of KEEP_SOCKETS) {
        const sx = st.keep.x + sock.x;
        const sz = st.keep.z + sock.z;
        const partId = st.keep.parts[sock.id];
        const done = (st.keep.built[sock.id] ?? 0) >= 1;
        if (!partId) {
          consider(sx, sz, 2.6, {
            id: sock.id, kind: 'keep_socket', duration: 0, actionable: true,
            label: `${sock.name} — choose what to raise`,
          });
        } else if (!done) {
          const part = KEEP_PART_BY_ID[partId];
          consider(sx, sz, 2.6, {
            id: sock.id, kind: 'keep_work', duration: 0.9, actionable: true,
            label: `Build ${part?.name ?? 'piece'} (${Math.round((st.keep.built[sock.id] ?? 0) * 100)}%)`,
          });
        }
      }
    }

    // stations open their crafting menu; beds let you sleep through the night
    for (const b of st.buildings) {
      const def = BUILDABLE_BY_ID[b.type];
      // build-then-construct (Phase 19): an unbuilt site's only interaction
      // is swinging the hammer at it — nothing else it "is" exists yet
      if (!isBuilt(b)) {
        consider(b.x, b.z, 1.4, {
          id: b.id, kind: 'construct', duration: 0.9, actionable: true,
          label: `Build ${def?.name ?? 'structure'} (${Math.round((b.built ?? 0) * 100)}%)`,
        });
        continue;
      }
      if (b.type === 'quintain') {
        consider(b.x, b.z, 1.2, {
          id: b.id, kind: 'quintain', duration: 0.9, actionable: true,
          label: ridingState.active ? 'Mounted training!' : 'Train Combat',
        });
        continue;
      }
      // anything the rig lab marked as able to shoot works like the cannon —
      // the nine siege engines from `traits.vehicle.canFire` all light up here
      // without needing a per-piece branch (2026-07-20 lab integration)
      if (b.type === 'cannon' || labCanFire(labAssetId(b.type))) {
        const hasStone = (st.inventory.stone ?? 0) >= 1;
        const label = def?.name ?? 'Cannon';
        // engines the lab found a crew position on are MANNED first — you
        // step aboard, then aim and shoot from where the crew stands. The
        // ones with no crew position (oc1289) stay fire-in-place.
        if (labCanOccupy(labAssetId(b.type))) {
          consider(b.x, b.z, 1.0, {
            id: b.id, kind: 'man_engine', duration: 0, actionable: true,
            label: `Man the ${label}`,
          });
        } else {
          consider(b.x, b.z, 1.0, {
            id: b.id, kind: 'cannon', duration: 0, actionable: hasStone,
            label: hasStone ? `Fire ${label} (1 stone)` : `${label} needs a stone ball`,
          });
        }
        continue;
      }
      // charges from `traits.explosive` — hold to light the fuse
      if (labIsExplosive(labAssetId(b.type))) {
        consider(b.x, b.z, 1.0, {
          id: b.id, kind: 'detonate', duration: 1.0, actionable: true,
          label: `Light the ${def?.name ?? 'charge'}`,
        });
        continue;
      }
      if (b.type === 'farmplot') {
        const growth = st.plots[b.id];
        const label =
          growth === undefined ? 'Plant wheat'
            : growth > 0 ? `Wheat growing… ${Math.ceil((growth / 200) * 100)}%`
            : 'Harvest wheat';
        consider(b.x, b.z, 0.5, {
          id: b.id, kind: 'plot', duration: growth === 0 ? 1.0 : 0,
          actionable: growth === undefined || growth === 0,
          label,
        });
        continue;
      }
      if (b.type === 'gate') {
        const open = st.gateOpen[b.id] ?? true;
        consider(b.x, b.z, 1.6, {
          id: b.id, kind: 'gate', duration: 1.2, actionable: true,
          label: open ? 'Close the Gate' : 'Open the Gate',
        });
        continue;
      }
      // already-engaged carts are handled as an early return above (letting
      // go / unhitching shouldn't depend on which way you happen to be
      // facing) — here we only need to offer starting one
      if (b.type === 'warcart') {
        if (cartState.pushingId !== b.id) {
          consider(b.x, b.z, 1.6, { id: b.id, kind: 'push_cart', duration: 0, actionable: true, label: 'Push the Battering Ram' });
        }
        continue;
      }
      if (b.type === 'bladecart') {
        if (cartState.hitchedId !== b.id) {
          consider(b.x, b.z, 1.6, { id: b.id, kind: 'hitch_cart', duration: 0, actionable: true, label: 'Hitch the Cart' });
        }
        continue;
      }
      if (b.type === 'keep') {
        consider(b.x, b.z, 2.0, {
          id: b.id, kind: 'keep_enter', duration: 0, actionable: true, label: 'Enter the Keep',
        }, KEEP_ENTER_RANGE);
        continue;
      }
      if (b.type === 'bed') {
        const night = worldEnv.night > 0.45;
        consider(b.x, b.z, 0.6, {
          id: b.id, kind: 'bed', duration: 1.2,
          actionable: night,
          label: night ? 'Sleep until dawn' : 'Too early to sleep',
        });
        continue;
      }
      if (!def?.station) continue;
      consider(b.x, b.z, 1.0, {
        id: b.id, kind: 'station', station: def.station, duration: 0,
        actionable: true, label: `Use ${def.name}`,
      });
    }
    for (const n of NPCS) {
      if (!isNpcRevealed(n, st.completedQuests)) continue;
      // Alric & Beda (2026-07-20): once recruited onto the roster they're a
      // real villager, not a standalone NPC — Npc.tsx already stops
      // rendering them, so interaction must skip them too or "Talk to
      // Alric" keeps offering at his old post after he's joined
      if (st.villagers.some((v) => v.id === n.id)) continue;
      // their day/night schedule (Phase 15) can move them well away from
      // this static spot — talk to wherever they actually are right now,
      // or the prompt lingers at their old post after they've left it
      const mob = npcMobs[n.id];
      consider(mob?.x ?? n.x, mob?.z ?? n.z, 1.3, {
        id: n.id, kind: 'npc', duration: 0, actionable: true, label: `Talk to ${n.name}`,
      });
    }
    if (merchantPresent(worldEnv.time)) {
      consider(MERCHANT_SPOT.x, MERCHANT_SPOT.z, 1.2, {
        id: 'merchant', kind: 'merchant', duration: 0, actionable: true, label: 'Trade with the Merchant',
      });
    }
    const stall = st.buildings.find((b) => b.type === 'market_stall');
    if (stall) {
      const staffed = st.villagers.some((v) => v.job === 'merchant');
      consider(stall.x, stall.z, 1.6, {
        id: 'market_stall', kind: 'merchant', duration: 0, actionable: staffed,
        label: staffed ? 'Trade at the Market Stall' : 'Market Stall (assign a Merchant in the Roster)',
      });
    }
    consider(SIGNPOST.x, SIGNPOST.z, 1.4, {
      id: 'signpost', kind: 'travel_board', duration: 0, actionable: true, label: 'Consult the Travel Map',
    });
    // (Cedric's camp interaction moved into the destination branch above —
    // Phase 20 relocated his camp to The Rival Castle, template-05)
    return best ? (best as { t: Target }).t : null;
  }

  function performAction(t: Target, st: ReturnType<typeof useGameStore.getState>) {
    if (t.kind === 'npc') {
      // DialoguePanel decides which single bark to play (the one-time voiced
      // lore line vs. this greetSound) so the two never overlap — see its
      // own effect for the branch.
      st.openDialogue(t.id);
    } else if (t.kind === 'merchant') {
      audio.play('villager', 0.8, false);
      st.setPanel('shop');
    } else if (t.kind === 'station') {
      st.openStationMenu(t.station as 'workbench' | 'forge' | 'campfire');
    } else if (t.kind === 'bed') {
      st.sleep();
    } else if (t.kind === 'horse') {
      mountHorse(t.id);
      audio.play('whinny', 0.7);
      st.setCameraMode('third');
      st.notify('You mount the horse. Hold Shift to gallop!');
    } else if (t.kind === 'dismount') {
      const fx = -Math.sin(yaw.current);
      const fz = -Math.cos(yaw.current);
      // G27 · dismounting AT a built stable stables the horse: it stops
      // wandering the meadow and becomes homestead property, assignable to a
      // defender who then patrols mounted. Catching one is the ride itself —
      // you have to find it, get on it, and walk it home.
      const ridden = ridingState.horseId;
      const stable = st.buildings.find((b) => b.type === 'stable' && isBuilt(b)
        && Math.hypot(b.x - pos.current.x, b.z - pos.current.z) < 6);
      dismountHorse(pos.current.x - fx * 1.2, pos.current.z - fz * 1.2, yaw.current);
      if (ridden && stable && !stabledHorses.ids.includes(ridden)) {
        stableHorse(ridden);
        st.notify('The horse is stabled — assign it to a defender in the Roster (N).', true);
      }
      audio.play('graze', 0.5);
    } else if (t.kind === 'quintain') {
      quintainHit(t.id, ridingState.active);
    } else if (t.kind === 'joust') {
      st.joustRichard();
    } else if (t.kind === 'push_cart') {
      if (cartState.pushingId === t.id) {
        cartState.pushingId = null;
        st.settleCart(t.id);
        st.notify('You set the ram down.');
      } else {
        cartState.pushingId = t.id;
        cartState.hitchedId = null;
        st.notify('Pushing the battering ram — walk it into a gate!');
      }
    } else if (t.kind === 'hitch_cart') {
      if (cartState.hitchedId === t.id) {
        cartState.hitchedId = null;
        st.settleCart(t.id);
        st.notify('You unhitch the cart.');
      } else {
        cartState.hitchedId = t.id;
        cartState.pushingId = null;
        st.notify('Cart hitched — it will follow you.');
      }
    } else if (t.kind === 'plot') {
      const growth = st.plots[t.id];
      if (growth === undefined) st.plantPlot(t.id);
      else if (growth === 0) st.harvestPlot(t.id);
    } else if (t.kind === 'man_engine') {
      const b = st.buildings.find((x) => x.id === t.id);
      if (b) {
        if (ridingState.active) dismountHorse(pos.current.x + 1.4, pos.current.z, yaw.current);
        manEngine(
          b, labOccupyMode(labAssetId(b.type)), yaw.current,
          BUILDABLE_BY_ID[b.type]?.size?.[2] ?? 2, BUILDABLE_BY_ID[b.type]?.size?.[1] ?? 2,
        );
        st.notify('You take the crew position — aim with your look, click to loose.');
      }
    } else if (t.kind === 'leave_engine') {
      leaveEngine();
      st.notify('You step down.');
    } else if (t.kind === 'cannon') {
      const b = st.buildings.find((x) => x.id === t.id);
      if (b) fireCannon(b);
    } else if (t.kind === 'detonate') {
      const b = st.buildings.find((x) => x.id === t.id);
      if (b) detonate(b);
    } else if (t.kind === 'keep_enter') {
      const b = st.buildings.find((x) => x.id === t.id);
      if (b) st.enterKeep(b.x, b.z);
    } else if (t.kind === 'keep_exit') {
      st.exitKeep();
    } else if (t.kind === 'chest') {
      st.openTreasureChest();
    } else if (t.kind === 'collect_taxes') {
      st.collectTaxes();
    } else if (t.kind === 'gate') {
      st.toggleGate(t.id);
    } else if (t.kind === 'travel_board') {
      st.setPanel('travel');
    } else if (t.kind === 'travel_return') {
      st.returnHome();
    } else if (t.kind === 'construct') {
      // J49 · one hammer swing's worth of progress. It used to top out at 8
      // swings, so a keep went up in about seven seconds — the ceiling was
      // there because the only feedback was a grey box inflating, and nobody
      // wants to watch that for long. Now the real piece rises out of the
      // ground course by course (J48), so the work can take the time the work
      // should take: a barrel is still a handful of swings, a keep is a job.
      const b = st.buildings.find((x) => x.id === t.id);
      const def = b ? BUILDABLE_BY_ID[b.type] : null;
      const swings = def ? Math.min(CONSTRUCT_MAX_SWINGS, Math.max(4, Math.round(def.buildXp / 2.5))) : 5;
      st.constructBuilding(t.id, 1 / swings);
    } else if (t.kind === 'workshop') {
      st.setPanel('workshop');
    } else if (t.kind === 'set_part') {
      st.placeSetPart();
    } else if (t.kind === 'buy_ground') {
      st.buyLand();
    } else if (t.kind === 'keep_socket') {
      st.openKeepSocket(t.id);
    } else if (t.kind === 'keep_work') {
      // the same work a building site asks for, scaled by the piece
      const partId = st.keep?.parts[t.id];
      const part = partId ? KEEP_PART_BY_ID[partId] : null;
      const swings = part ? Math.min(CONSTRUCT_MAX_SWINGS, Math.max(4, Math.round(part.buildXp / 2.5))) : 8;
      st.workKeepPart(t.id, 1 / swings);
    } else if (t.kind === 'guild_hall') {
      st.setPanel('guild');
    } else if (t.kind === 'challenge_cedric') {
      if (!st.alliance || st.alliance === 'cedric') {
        // unsworn: Cedric makes his offer first (Phase 19 alliance branch) —
        // the fight is one of the parley's choices, not the only outcome.
        // His sworn bannermen get the war council instead (ParleyPanel
        // branches on alliance) — rebellion errands, never a fight.
        st.setPanel('parley');
        audio.playVoice('greeting_cedric', 0.85);
        return;
      }
      useEnemyStore.getState().spawn('cedric', CEDRIC_CAMP.x, CEDRIC_CAMP.z + 1.5, false);
      audio.play('warcry', 0.9);
      audio.playVoice('greeting_cedric', 0.85);
      st.notify('Cedric the Bull sneers: "Come to lose your head, have you?"', true);
    } else if (t.kind === 'fishing') {
      if (fishingState.nodeId !== t.id) {
        startFishing(t.id, worldEnv.rain > 0.4);
      } else if (fishingState.phase === 'biting') {
        st.harvestNode(t.id); // grants the fish + Fishing XP + its own catch sound
        fishingState.phase = 'waiting';
        fishingState.nextEventAt = performance.now() + 2000 + Math.random() * 3000;
      }
    } else {
      st.harvestNode(t.id);
      if (t.kind === 'tree') audio.play('sword_swish', 0.5);
    }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGameStore.getState();
    const frozen = st.paused || st.buildMode || st.panel !== 'none' || !!st.ceremony;
    const kb = useAppStore.getState().settings.keybinds;
    const isDown = (code: string) => keys.current[code] || pad.current[code];
    if (!frozen) {
      pollGamepad(pad.current, kb, yaw, pitch, useAppStore.getState().settings.invertY, dt);
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
        // free-fly: no collision, no gravity, moves along the view
        // direction (including vertically) rather than the ground plane
        const flySpeed = isDown(kb.sprint) ? 16 : 8;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
        const move = new THREE.Vector3();
        if (isDown(kb.moveForward)) move.add(camDir);
        if (isDown(kb.moveBack)) move.sub(camDir);
        if (isDown(kb.moveRight)) move.add(right);
        if (isDown(kb.moveLeft)) move.sub(right);
        if (isDown(kb.jump)) move.y += 1;
        if (keys.current['ControlLeft']) move.y -= 1;
        if (move.lengthSq() > 0) pos.current.addScaledVector(move.normalize(), flySpeed * dt);
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
      const dir = new THREE.Vector3(
        (isDown(kb.moveRight) ? 1 : 0) - (isDown(kb.moveLeft) ? 1 : 0),
        0,
        (isDown(kb.moveBack) ? 1 : 0) - (isDown(kb.moveForward) ? 1 : 0),
      );
      const isMoving = dir.lengthSq() > 0;
      if (isMoving) {
        dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      }
      // movement (mounted: faster, with a stamina-limited gallop; on foot:
      // sprinting spends stamina too, the same way a sword swing does,
      // rather than being a free speed boost)
      const riding = ridingState.active;
      const sprintKey = isDown(kb.sprint);
      const galloping = riding && sprintKey && combatState.stamina > 5;
      combatState.galloping = galloping;
      if (galloping) combatState.stamina = Math.max(0, combatState.stamina - 11 * dt);
      const running = !riding && sprintKey && isMoving && combatState.stamina > 5;
      combatState.sprinting = running;
      if (running) combatState.stamina = Math.max(0, combatState.stamina - 8 * dt);
      const sprint = riding ? galloping : running;
      const speed = riding ? (galloping ? 11 : 6) : sprint ? 7 : 4;
      if (isMoving) statsAccum.distanceMeters += speed * dt;
      const p = pos.current;
      let nx = p.x + dir.x * speed * dt;
      let nz = p.z + dir.z * speed * dt;

      // collisions: buildings (AABB, unless we can step onto or walk under
      // them), trees & rocks (circles), pond, world bounds — or, inside the
      // keep's great hall, the room's own walls and furniture instead
      const eyeOff = riding ? EYE_HEIGHT + 0.85 : EYE_HEIGHT;
      const feetY = p.y - eyeOff;
      if (st.interior) {
        const ix = KEEP_INTERIOR.halfX - 0.6;
        const iz = KEEP_INTERIOR.halfZ - 0.6;
        nx = THREE.MathUtils.clamp(nx, KEEP_INTERIOR.x - ix, KEEP_INTERIOR.x + ix);
        nz = THREE.MathUtils.clamp(nz, KEEP_INTERIOR.z - iz, KEEP_INTERIOR.z + iz);
        // simple obstacles: the throne (back wall) and the treasure chest (corner)
        for (const [ox, oz, r] of [
          [KEEP_INTERIOR.x, KEEP_INTERIOR.z + KEEP_INTERIOR.halfZ - 1.2, 1.1],
          [KEEP_CHEST_POS.x, KEEP_CHEST_POS.z, 0.7],
        ] as const) {
          const dx = nx - ox;
          const dz = nz - oz;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            nx = ox + (dx / d) * r;
            nz = oz + (dz / d) * r;
          }
        }
      } else if (st.destination) {
        // template worlds are lightweight destinations: no fine per-object
        // collision against the merged bake, just a simple circular bound
        // around its own origin (see game/data/worlds.ts)
        const dest = WORLD_DESTINATION_BY_ID[st.destination];
        if (dest) {
          const dx = nx - dest.origin.x;
          const dz = nz - dest.origin.z;
          const d = Math.hypot(dx, dz);
          if (d > dest.radius) {
            nx = dest.origin.x + (dx / d) * dest.radius;
            nz = dest.origin.z + (dz / d) * dest.radius;
          }
        }
        // the Sealed Crypt (Phase 17) is the one destination with real walls
        // to actually bump into — a generated maze should feel like one
        if (st.destination === 'dungeon' && dungeonState.layout) {
          for (const w of dungeonState.layout.walls) {
            const [sx, sz] = sizeFor('stonewall', w.rot);
            const hx = sx / 2 + PLAYER_RADIUS;
            const hz = sz / 2 + PLAYER_RADIUS;
            const dx2 = nx - w.x;
            const dz2 = nz - w.z;
            if (Math.abs(dx2) < hx && Math.abs(dz2) < hz) {
              const px = hx - Math.abs(dx2);
              const pz = hz - Math.abs(dz2);
              if (px < pz) nx = w.x + Math.sign(dx2 || 1) * hx;
              else nz = w.z + Math.sign(dz2 || 1) * hz;
            }
          }
        }
      } else {
        for (const b of st.buildings) {
          if (!isBuilt(b)) continue; // walk freely through a ghost outline
          if (b.type === 'gate' && (st.gateOpen[b.id] ?? true)) continue; // raised — passable
          const base = b.y ?? 0;
          const dx = nx - b.x;
          const dz = nz - b.z;
          // real wall collision: pieces in WALL_CORE split into a narrow
          // "core" box (where a walking player's own body actually is) plus
          // a full-footprint box for whatever's above it — the mc-series
          // prefabs' projecting galleries/corbelled ledges no longer stop
          // the player at the widest point anywhere on the piece. Everything
          // else gets exactly one box spanning its full height, unchanged.
          for (const box of collisionBoxesFor(b.type, b.rot)) {
            // a box may sit off the building's own centre (a breached wall's
            // core is two pillars flanking the gap) — test against ITS centre
            const cx = b.x + (box.ox ?? 0);
            const cz = b.z + (box.oz ?? 0);
            const bdx = nx - cx;
            const bdz = nz - cz;
            const hx = box.hx + PLAYER_RADIUS;
            const hz = box.hz + PLAYER_RADIUS;
            if (Math.abs(bdx) >= hx || Math.abs(bdz) >= hz) continue;
            const boxBase = base + box.yBase;
            const boxTop = base + box.yTop;
            const canStepOnto = !riding && boxTop <= feetY + STEP_UP;
            const passesOverhead = boxBase >= feetY + 1.8;
            if (canStepOnto || passesOverhead) continue;
            const px = hx - Math.abs(bdx);
            const pz = hz - Math.abs(bdz);
            if (px < pz) nx = cx + Math.sign(bdx || 1) * hx;
            else nz = cz + Math.sign(bdz || 1) * hz;
            break; // one blocking box is enough; re-derive dx/dz next building
          }
        }
        for (const n of st.nodes) {
          if (n.respawnAt !== null || n.kind === 'fishing') continue;
          const r = (n.kind === 'tree' ? 0.55 : 1.1) * n.scale + PLAYER_RADIUS;
          const dx = nx - n.x;
          const dz = nz - n.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            nx = n.x + (dx / d) * r;
            nz = n.z + (dz / d) * r;
          }
        }
        {
          // the fishing dock is allowed to run out over the water — skip the
          // pond push-back for anyone standing in its narrow corridor
          const ddx = FISHING_DOCK.endX - FISHING_DOCK.startX;
          const ddz = FISHING_DOCK.endZ - FISHING_DOCK.startZ;
          const dockLen2 = ddx * ddx + ddz * ddz;
          const t = THREE.MathUtils.clamp(
            ((nx - FISHING_DOCK.startX) * ddx + (nz - FISHING_DOCK.startZ) * ddz) / dockLen2,
            0, 1,
          );
          const nearestX = FISHING_DOCK.startX + ddx * t;
          const nearestZ = FISHING_DOCK.startZ + ddz * t;
          const onDock = Math.hypot(nx - nearestX, nz - nearestZ) < FISHING_DOCK.halfWidth;
          if (!onDock) {
            const dx = nx - POND.x;
            const dz = nz - POND.z;
            const r = POND.radius - 0.4;
            const d2 = dx * dx + dz * dz;
            if (d2 < r * r && d2 > 1e-6) {
              const d = Math.sqrt(d2);
              nx = POND.x + (dx / d) * r;
              nz = POND.z + (dz / d) * r;
            }
          }
        }
        {
          // the keep's great hall is a permanent sealed fixture — bump into
          // it from outside like any other solid structure (no walk-in door)
          const hx = KEEP_INTERIOR.halfX + 0.4 + PLAYER_RADIUS;
          const hz = KEEP_INTERIOR.halfZ + 0.4 + PLAYER_RADIUS;
          const dx = nx - KEEP_INTERIOR.x;
          const dz = nz - KEEP_INTERIOR.z;
          if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
            const px = hx - Math.abs(dx);
            const pz = hz - Math.abs(dz);
            if (px < pz) nx = KEEP_INTERIOR.x + Math.sign(dx || 1) * hx;
            else nz = KEEP_INTERIOR.z + Math.sign(dz || 1) * hz;
          }
        }
        nx = THREE.MathUtils.clamp(nx, -WORLD_HALF + 2, WORLD_HALF - 2);
        nz = THREE.MathUtils.clamp(nz, -WORLD_HALF + 2, WORLD_HALF - 2);
      }
      p.x = nx;
      p.z = nz;

      // a pushed ram is glued in front of the player, a hitched cart trails
      // behind — both just live-position overrides until let go (settleCart)
      if (cartState.pushingId || cartState.hitchedId) {
        const fx = -Math.sin(yaw.current);
        const fz = -Math.cos(yaw.current);
        // crewing an engine: E always steps down (firing is the attack button,
    // see the crew block in the frame loop), so nothing else competes for it
    if (crewState.engineId) {
      const eb = st.buildings.find((x) => x.id === crewState.engineId);
      return {
        id: crewState.engineId, kind: 'leave_engine', duration: 0, actionable: true,
        label: `Step down from the ${eb ? BUILDABLE_BY_ID[eb.type]?.name ?? 'engine' : 'engine'}`,
      };
    }
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
      const floorY = riding
        ? (st.destination ? destinationGroundY(p.x, p.z) : 0)
        : st.destination ? destinationGroundY(p.x, p.z)
        : floorHeightAt(st, p.x, p.z, p.y - eyeOff);
      const groundEye = floorY + eyeOff;
      if (grounded.current && isDown(kb.jump) && !riding) {
        vel.current.y = 5;
        grounded.current = false;
      }
      if (!grounded.current) {
        vel.current.y -= 14 * dt;
        p.y += vel.current.y * dt;
        if (vel.current.y <= 0 && p.y <= groundEye) {
          p.y = groundEye;
          vel.current.y = 0;
          grounded.current = true;
        }
      } else if (p.y > groundEye + 0.08) {
        // walked off an edge
        grounded.current = false;
        vel.current.y = 0;
      } else if (Math.abs(p.y - groundEye) > 0.005) {
        p.y += (groundEye - p.y) * Math.min(1, dt * 12);
      }

      // footsteps / hoofbeats
      if (riding) {
        audio.setLoop('canter', dir.lengthSq() > 0 ? (galloping ? 0.5 : 0.22) : 0);
      } else {
        audio.setLoop('canter', 0);
        if (dir.lengthSq() > 0 && grounded.current) {
          stepTimer.current -= dt;
          if (stepTimer.current <= 0) {
            audio.play('step', 0.25);
            stepTimer.current = sprint ? 0.32 : 0.46;
          }
        }
      }
      } // end photoMode / normal-movement branch

      // fishing bite minigame: advance the wait/bite cycle regardless of
      // where the player is currently looking (only proximity matters once
      // a line is cast, not framing the pond dead-on every frame)
      if (fishingState.nodeId) {
        const fishNode = st.nodes.find((n) => n.id === fishingState.nodeId);
        const dist = fishNode ? Math.hypot(fishNode.x - pos.current.x, fishNode.z - pos.current.z) : Infinity;
        tickFishing(fishNode, dist, st.notify);
      }

      // interaction targeting + hold-E (construction sites are the one
      // exception — held via LMB/combatState.lmbDown instead, so "building"
      // uses the same click-and-hold feel as the aerial build-mode
      // placement and the ordinary attack button, not a separate E prompt)
      const target = findTarget(st);
      st.setTargetKind(target ? (target.kind === 'rock' ? 'rock' : target.kind === 'fishing' ? 'fishing' : target.kind) : null);
      const isConstruct = target?.kind === 'construct';
      st.setPrompt(
        target
          ? target.duration > 0
            ? target.actionable ? `${isConstruct ? 'Hold Click' : 'Hold E'} — ${target.label}` : target.label
            : `E — ${target.label}`
          : null,
      );
      talkCooldown.current = Math.max(0, talkCooldown.current - dt);
      // keyboard's E no longer drives construction (that's now the attack
      // button's job, matching the aerial build-mode's click-and-hold feel)
      // — but gamepad/touch have no separate "hold to build" input mapped,
      // so their interact button (pad.current, NOT the real keyboard key)
      // still works for it, same as always
      const heldInput = isConstruct ? (combatState.lmbDown || pad.current[kb.interact]) : isDown(kb.interact);
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
            performAction(target, st);
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
            performAction(target, st);
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

      // nearby crafting stations (drives the crafting panel), respawns
      stationTimer.current -= dt;
      if (stationTimer.current <= 0) {
        stationTimer.current = 0.5;
        const near: string[] = [];
        for (const b of st.buildings) {
          const def = BUILDABLE_BY_ID[b.type];
          if (!def?.station) continue;
          if (Math.hypot(pos.current.x - b.x, pos.current.z - b.z) < STATION_RANGE && !near.includes(def.station)) {
            near.push(def.station);
          }
        }
        st.setNearStations(near.sort());
        st.tickRespawns();
        st.tickPlots(0.5);
        st.tickVillagers(0.5);
        st.checkVillagerArrival();
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
    playerState.speed = moving ? (isDown(kb.sprint) ? 7 : 4) : 0;
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
        const fwd = new THREE.Vector3();
        camera.getWorldDirection(fwd);
        aimState.target = resolveAim(
          camera.position.x, camera.position.y, camera.position.z,
          fwd.x, fwd.y, fwd.z,
          useEnemyStore.getState().enemies,
          (k) => KIND_LABEL[k as EnemyKind] ?? k,
          (k) => maxHpOf(k as EnemyKind),
          (id) => NPC_BY_ID[id]?.name ?? 'Stranger',
          (id) => st.villagers.find((v) => v.id === id)?.name ?? 'Villager',
          (k) => st.bestiary.includes(k),
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

    // camera: first person at the eyes, third person orbiting behind
    if (st.cameraMode === 'third') {
      const eye = new THREE.Vector3(pos.current.x, pos.current.y - 0.2, pos.current.z);
      const dir = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
      const camPos = eye.clone().addScaledVector(dir, -4.6).add(new THREE.Vector3(0, 0.9, 0));
      if (camPos.y < 0.35) camPos.y = 0.35;
      camera.position.copy(camPos);
      camera.lookAt(eye.clone().addScaledVector(dir, 2.5));
    } else {
      camera.position.copy(pos.current);
    }
  });

  return null;
}
