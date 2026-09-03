'use client';
// Player combat input + vitals: LMB melee swing, RMB block (with shield),
// stamina drain/regen, slow health regen, knock-out teleport handling.
//
// Wave 15 (2026-08-17): touch combat. The four branch bodies below (attack
// down/up, block down/up) are pulled out into standalone functions so a
// touch press can call the SAME code a mouse click does — CombatController
// stays the one place that owns attackCd/rangedCd and knows how to turn a
// "press" into a swing/bolt/draw. touchState.attack/block (touchInput.ts)
// are plain held booleans, same convention as jump/interact/sprint; there is
// no native "touch down" event once that's all that's left of the gesture,
// so the down/up edge is hand-rolled here, once a frame, same as a gamepad
// button would need to be. Deliberately does NOT gate on
// document.pointerLockElement the way the mouse path's LMB branch does —
// touch devices generally never acquire pointer lock (no click-driven lock
// cycle, iOS Safari doesn't implement it at all), so reusing that gate would
// silently no-op touch attacks in the default fps camera mode. Touch look
// drag (onLookMove in TouchControls.tsx) already proves camera control works
// on this project with zero pointer-lock dependency — that's the precedent
// this follows, not the mouse gate.
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { combatState, playerAttack, fireBolt, fireArrow, FULL_DRAW_TIME, CLICK_HELD_TARGET_KINDS, MELEE, activeMelee, cycleWeapon } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { crewState } from '@/game/crew';
import { touchState } from '@/game/touchInput';
import { useAppStore } from '@/game/store/appStore';
import { noteInputDevice } from '@/game/inputMode';

let attackCd = 0;
let rangedCd = 0;
let touchAttackPrev = false;
let touchBlockPrev = false;
let padAttackPrev = false;
let padBlockPrev = false;
let padSwapPrev = false;

type GameState = ReturnType<typeof useGameStore.getState>;

/** true when a ranged weapon is readied AND the player actually owns ammo/the
 *  weapon for it — shared by both the attack and block branches, exactly the
 *  way the original inline mousedown handler computed it once and reused it
 *  for both button branches. */
function rangedReady(st: GameState): boolean {
  const bow = combatState.rangedWeapon === 'longbow';
  return combatState.weapon === 'ranged'
    && (bow ? (st.inventory.longbow ?? 0) > 0 : (st.inventory.crossbow ?? 0) > 0);
}

/** LMB-down / touch-attack-down. */
function startAttack(st: GameState) {
  const bow = combatState.rangedWeapon === 'longbow';
  const ranged = rangedReady(st);
  combatState.lmbDown = true;
  // aiming at an unbuilt construction site, or a gatherable node: the
  // hold drives hammer/tool progress (PlayerController's hold-to-act
  // loop, keyed off lmbDown) instead of a normal attack swing — holding
  // the attack input to build or gather, matching the same "click and
  // hold" feel as the aerial build-mode placement (requested 2026-07-30,
  // "for mechanical consistency" with the way attacking already works)
  if (CLICK_HELD_TARGET_KINDS.has(st.targetKind ?? '')) return;
  // crewing a siege engine: the attack button looses the ENGINE, not
  // your sword (PlayerController's crew block reads lmbDown)
  if (crewState.engineId) return;
  if (ranged && bow) {
    combatState.drawStart = performance.now();
  } else if (ranged) {
    if (rangedCd <= 0 && fireBolt()) rangedCd = 1.1;
  } else if (attackCd <= 0 && playerAttack()) {
    // Wave 7 · the swing cadence is the WEAPON's, not a constant — a
    // halberd is slower than a sword and a spear sits between them
    // (combat.ts's MELEE). Read after the swing lands so a swap
    // mid-cooldown can't shorten the swing already paid for.
    attackCd = MELEE[activeMelee()].cd;
  }
}

/** LMB-up / touch-attack-up. */
function releaseAttack() {
  combatState.lmbDown = false;
  if (combatState.drawStart > 0) {
    const power = Math.min(1, (performance.now() - combatState.drawStart) / (FULL_DRAW_TIME * 1000));
    combatState.drawStart = 0;
    if (rangedCd <= 0 && fireArrow(power)) rangedCd = 1.3;
  }
}

/** RMB-down / touch-block-down. */
function startBlock(st: GameState) {
  if (rangedReady(st)) combatState.aiming = true;
  else combatState.blocking = true;
}

/** RMB-up / touch-block-up. */
function endBlock() {
  combatState.blocking = false;
  combatState.aiming = false;
}

export default function CombatController() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const onMouseDown = (e: MouseEvent) => {
      noteInputDevice('keyboard'); // mouse is a desktop signal same as keydown — see game/inputMode.ts
      const st = useGameStore.getState();
      if (st.paused || st.buildMode || st.panel !== 'none') return;
      if (e.button === 0) {
        // only swing when the pointer is locked (the first unlocked click locks it)
        if (document.pointerLockElement !== el && st.cameraMode === 'fps') return;
        startAttack(st);
      } else if (e.button === 2) {
        startBlock(st);
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) releaseAttack();
      if (e.button === 2) endBlock();
    };
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useGameStore.getState();
    if (st.paused) return;
    attackCd = Math.max(0, attackCd - dt);
    rangedCd = Math.max(0, rangedCd - dt);
    combatState.flash = Math.max(0, combatState.flash - dt);
    // stamina: blocking, galloping and sprinting hold regen; otherwise recover
    if (!combatState.blocking && !combatState.galloping && !combatState.sprinting) {
      combatState.stamina = Math.min(combatState.maxStamina, combatState.stamina + 14 * dt);
    }
    // slow health regen
    if (combatState.hp < combatState.maxHp) {
      combatState.hp = Math.min(combatState.maxHp, combatState.hp + dt * 0.12);
    }

    // Wave 15 touch combat: edge-detect touchState.attack/block against last
    // frame and funnel into the same start/release helpers the mouse
    // listeners use above. Guarded the same way onMouseDown was (buildMode/
    // panel open) — st.paused is already covered by the early return above.
    // No pointer-lock check (see file header). The "up" edges run
    // unconditionally, same as onMouseUp never guarded either, so a
    // block/draw that started before a panel opened still releases cleanly
    // instead of leaving combatState.blocking/aiming/lmbDown stuck true.
    if (touchState.active) {
      const guarded = st.buildMode || st.panel !== 'none';
      if (touchState.attack && !touchAttackPrev && !guarded) startAttack(st);
      if (!touchState.attack && touchAttackPrev) releaseAttack();
      if (touchState.block && !touchBlockPrev && !guarded) startBlock(st);
      if (!touchState.block && touchBlockPrev) endBlock();
      touchAttackPrev = touchState.attack;
      touchBlockPrev = touchState.block;
    }

    // Wave 15 gamepad combat: same edge-detect-and-funnel pattern as the
    // touch block above — RT/LT (attack/block) mirror the mouse's LMB/RMB
    // double duty exactly (see startAttack/startBlock), and Y mirrors
    // keyboard Q via the same cycleWeapon() GameScreen.tsx's switch now
    // calls too. See game/data/gamepadInput.ts for why these three indices
    // (the defaults; Wave 33 made them rebindable — see the settings read
    // below).
    // No document.pointerLockElement check here either, for the same reason
    // the touch block skips it — a controller's right stick already drives
    // the camera with zero pointer-lock dependency (PlayerController's
    // pollGamepad), so gating the fire button on mouse lock would silently
    // no-op gamepad combat in the default fps camera mode.
    // getGamepads() is read cold (never cached) so a mid-session disconnect
    // self-heals within one frame: gp becomes null/undefined,
    // gp?.buttons[i]?.pressed reads false, and the "up" edge below fires and
    // releases whatever was held — the same self-healing PlayerController's
    // own pollGamepad relies on for movement.
    {
      const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
      const gp = pads?.[0];
      // Wave 33: read the live (possibly rebound) button indices from the
      // settings store each frame, not the frozen DEFAULT_GAMEPAD_BUTTONS
      // constant — a rebind takes effect the very next frame, no reload.
      const gpBtn = useAppStore.getState().settings.gamepadButtons;
      const attackDown = !!gp?.buttons[gpBtn.attack]?.pressed;
      const blockDown = !!gp?.buttons[gpBtn.block]?.pressed;
      const swapDown = !!gp?.buttons[gpBtn.swapWeapon]?.pressed;
      const guarded = st.buildMode || st.panel !== 'none';
      if (attackDown && !padAttackPrev && !guarded) startAttack(st);
      if (!attackDown && padAttackPrev) releaseAttack();
      if (blockDown && !padBlockPrev && !guarded) startBlock(st);
      if (!blockDown && padBlockPrev) endBlock();
      if (swapDown && !padSwapPrev && !guarded) cycleWeapon();
      padAttackPrev = attackDown;
      padBlockPrev = blockDown;
      padSwapPrev = swapDown;
    }
  });

  return null;
}
