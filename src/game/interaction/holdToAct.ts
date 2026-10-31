// CLN-26 · what the player is looking at, and acting on it: the frame's interaction targeting (findTarget), the prompt
// naming it and the control that does it on the device in hand, and the act — an instant one (talk, mount, use) at
// once, and again every 0.6 s (the talk cooldown) while the control stays held; a held one (build, gather, train) with its progress, and a completed hold that
// reveals a different kind of target in the same spot kept from firing until the control is pressed again. Moved from
// PlayerController.tsx as it was.
import type * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';
import type { useGameStore } from '@/game/store/gameStore';
import { resolveInputDevice, interactLabel, clickHoldLabel } from '@/game/inputMode';
import { combatState, CLICK_HELD_TARGET_KINDS } from '@/game/combat';
import { findTarget } from './findTarget';
import { performAction } from './performAction';

/** What holdToAct reads from PlayerController: what findTarget aims from (the camera, the player's position), the
 *  controls, the refs it keeps between frames (the talk cooldown, the hold and its time, the hold last completed),
 *  and the player's own refs an act may change (performAction's). */
export interface HoldCtx {
  camera: THREE.Camera;
  pos: { current: THREE.Vector3 };
  kb: Record<string, string>;
  isDown: (code: string) => boolean;
  pad: { current: Record<string, boolean> };
  talkCooldown: { current: number };
  holdTarget: { current: string | null };
  holdTime: { current: number };
  holdJustCompletedId: { current: string | null };
  holdJustCompletedKind: { current: string | null };
  grounded: { current: boolean };
  vel: { current: THREE.Vector3 };
  yaw: { current: number };
}

/** interaction targeting + hold-E (construction sites AND gathering — 'tree'/'rock'/'fishing'/'herb', requested
 *  2026-07-30 "for mechanical consistency" — are held via LMB/combatState.lmbDown instead, so building and gathering
 *  both use the same click-and-hold feel as the aerial build-mode placement and the ordinary attack button, not a
 *  separate E prompt) */
export function holdToAct(ctx: HoldCtx, st: ReturnType<typeof useGameStore.getState>, dt: number): void {
  const { camera, pos, kb, isDown, pad, talkCooldown, holdTarget, holdTime, holdJustCompletedId, holdJustCompletedKind, grounded, vel, yaw } = ctx;
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
}

/** frozen (paused, a panel, the build view, a ceremony): no prompt, no progress, and no hold carried across */
export function dropHold(st: ReturnType<typeof useGameStore.getState>, holdTarget: { current: string | null }): void {
  if (st.prompt) st.setPrompt(null);
  if (st.actionProgress !== null) st.setActionProgress(null);
  holdTarget.current = null;
}
