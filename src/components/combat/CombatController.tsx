'use client';
// Player combat input + vitals: LMB melee swing, RMB block (with shield),
// stamina drain/regen, slow health regen, knock-out teleport handling.
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { combatState, playerAttack, fireBolt, fireArrow, FULL_DRAW_TIME, CLICK_HELD_TARGET_KINDS, MELEE, activeMelee } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { crewState } from '@/game/crew';

let attackCd = 0;
let rangedCd = 0;

export default function CombatController() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const onMouseDown = (e: MouseEvent) => {
      const st = useGameStore.getState();
      if (st.paused || st.buildMode || st.panel !== 'none') return;
      const bow = combatState.rangedWeapon === 'longbow';
      const ranged = combatState.weapon === 'ranged'
        && (bow ? (st.inventory.longbow ?? 0) > 0 : (st.inventory.crossbow ?? 0) > 0);
      if (e.button === 0) {
        // only swing when the pointer is locked (the first unlocked click locks it)
        if (document.pointerLockElement !== el && st.cameraMode === 'fps') return;
        combatState.lmbDown = true;
        // aiming at an unbuilt construction site, or a gatherable node: the
        // hold drives hammer/tool progress (PlayerController's hold-to-act
        // loop, keyed off lmbDown) instead of a normal attack swing — holding
        // LMB to build or gather, matching the same "click and hold" feel as
        // the aerial build-mode placement (requested 2026-07-30, "for
        // mechanical consistency" with the way attacking already works)
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
      } else if (e.button === 2) {
        if (ranged) combatState.aiming = true;
        else combatState.blocking = true;
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) combatState.lmbDown = false;
      if (e.button === 0 && combatState.drawStart > 0) {
        const power = Math.min(1, (performance.now() - combatState.drawStart) / (FULL_DRAW_TIME * 1000));
        combatState.drawStart = 0;
        if (rangedCd <= 0 && fireArrow(power)) rangedCd = 1.3;
      }
      if (e.button === 2) {
        combatState.blocking = false;
        combatState.aiming = false;
      }
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
  });

  return null;
}
