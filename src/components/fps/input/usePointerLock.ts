// CLN-26 · the pointer: while the game is in play a click on the world takes it; a pause, a panel or the build view
// lets it go, and the end of a pause or a panel asks for it back, once; while it is held the mouse turns the view (or
// steers the order wheel, while that is open). Moved from PlayerController.tsx as it was, but for the pitch clamp and
// the mouse's sensitivity, look.ts's now. Every request and release goes through game/pointerLock.ts, never
// requestPointerLock/exitPointerLock directly: under automation that module hands out a virtual lock, since the real
// one drags the OS cursor.
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { commandWheel, steerWheel } from '@/game/commandWheel';
import { pointerLockActive, releaseGameLock, requestGameLock } from '@/game/pointerLock';
import { clampPitch, lookSensitivity } from './look';

/** the pointer lock, and the mouse turning the player's view (`yaw`, `pitch`), on the canvas `gl` draws into */
export function usePointerLock(gl: THREE.WebGLRenderer, yaw: { current: number }, pitch: { current: number }): void {
  const locked = useRef(false);
  /** the pointer-lock request (tryLock), shared with the panel watcher below */
  const lockRef = useRef<(() => void) | null>(null);

  // ---- pointer lock + mouse look ----
  //
  // Losing the pointer used to mean losing mouse-look until you remembered to
  // click the world again: the lock was only ever requested from a click, so
  // every panel you closed, every pause you came back from, dropped you into a
  // dead camera. That is the immersion break — not the panel itself, but the
  // silence afterwards.
  //
  // The rule now is intent-based: whenever the game is in PLAY (not paused, no
  // panel, not in build view) the controller WANTS the lock — a click on the
  // world takes it, and the end of a pause or a panel asks for it once (the
  // panel watcher below). Two things can refuse that ask, and neither is
  // retried:
  //   · a browser refuses `requestPointerLock` for about a second after the
  //     user pressed Esc to leave it, and fails SILENTLY through
  //     `pointerlockerror` — so an immediate re-request after closing a panel
  //     with Esc is exactly the case that does not work;
  //   · the request needs the document focused, which it is not while an
  //     alert or a devtools pane has it.
  // Either way the next click on the world takes it (tryLock says why nothing
  // grabs it back unprompted).
  useEffect(() => {
    const el = gl.domElement;

    const wantsLock = () => {
      const st = useGameStore.getState();
      return !st.paused && !st.buildMode && st.panel === 'none';
    };
    const tryLock = () => {
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
    const onMove = (e: MouseEvent) => {
      if (!locked.current) return;
      // I41 · while the order radial is held open, the pointer steers the
      // WHEEL rather than the camera — which is the whole point: the lock is
      // never released, so giving an order does not punch a hole in
      // mouse-look the way opening a modal did.
      if (commandWheel.open) { steerWheel(e.movementX, e.movementY); return; }
      const sens = lookSensitivity();
      yaw.current -= e.movementX * sens;
      const dy = e.movementY * sens * (useAppStore.getState().settings.invertY ? -1 : 1);
      pitch.current = clampPitch(pitch.current - dy);
    };
    el.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMove);
    return () => {
      el.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMove);
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
}
