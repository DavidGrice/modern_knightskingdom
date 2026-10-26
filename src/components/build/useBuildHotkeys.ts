// CLN-27 · the build view's keyboard, out of BuildController.tsx: the one keydown/keyup pair for the life of the view
// — the held keys the camera pans by (`keys`), R/[/] for the piece in hand, U to undo, Q/E to turn the view, F for
// freeform, X and G for the wrecking tool and the spade.
import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';

// Wave 9 · freeform's fine rotation step. 24 taps of R walks a full circle,
// which is enough to angle a bench toward a fire without becoming a job.
const FINE_YAW_STEP = Math.PI / 12;        // 15°
// Wave 51 (C6) · freeform's per-instance scale, [ / ] (an unclaimed key pair
// — grep across the whole codebase found neither bound anywhere). A pair
// rather than one key: unlike rotation, scale is not cyclic and genuinely
// needs both directions. Hold-shift-for-a-bigger-step directly mirrors R's
// own Shift-for-a-full-quarter-turn convention above.
const SCALE_STEP = 0.1;
const SCALE_SHIFT_STEP = 0.5;
// 0.5-2.0: collision never scales (see PlacedBuilding.scale's own comment),
// so a wider range would only widen the visible gap between what a piece
// looks like and what it actually blocks/occupies — the honesty this
// feature already accepts, not something worth stretching further. 2.0 and
// 0.5 are exact reciprocals, so scaling up then back down returns to
// exactly 1.0 with no rounding drift.
const SCALE_MIN = 0.5;
const SCALE_MAX = 2.0;

type Quarter = 0 | 1 | 2 | 3;

export function useBuildHotkeys({ keys, rotRef, freeYawRef, setRot, setFreeYaw, setFreeScale, setAzQuarter, undoLast }: {
  keys: MutableRefObject<Record<string, boolean>>;
  rotRef: MutableRefObject<Quarter>;
  freeYawRef: MutableRefObject<number>;
  setRot: Dispatch<SetStateAction<Quarter>>;
  setFreeYaw: Dispatch<SetStateAction<number>>;
  setFreeScale: Dispatch<SetStateAction<number>>;
  setAzQuarter: Dispatch<SetStateAction<number>>;
  undoLast: () => void;
}) {
  // keyboard: pan + rotate piece + undo, plus Wave 9's view rotation and mode
  // toggles. Hardcoded key codes, matching this file's own convention (the
  // remappable keybinds.ts table covers the on-foot player, whose controller is
  // fully unmounted while this one exists — GameWorld.tsx picks one or the
  // other — so Q/E/F/X cannot collide with anything it binds).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      // the build rail carries text fields (blueprint name, piece search) —
      // typing "undo" into one must not undo four placements. Only the
      // one-shot actions below are guarded; the held pan keys above are
      // recorded regardless so releasing one always clears it.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      // every action below is a one-shot: auto-repeat from a leaned-on key
      // would spin the ghost, the view, or the undo stack
      if (e.repeat) return;
      if (e.code === 'KeyR') {
        // in freeform R turns the piece by the mode's own granularity; hold
        // shift for the honest quarter turn when you want to get back square
        if (useGameStore.getState().freeformBuild) {
          // wrapped at a full turn so a piece spun right round records no
          // `yaw` at all rather than a cosmetically-identical 6.283
          setFreeYaw((y) => (y + (e.shiftKey ? Math.PI / 2 : FINE_YAW_STEP)) % (Math.PI * 2));
        } else {
          setRot((r) => (((r + 1) % 4) as 0 | 1 | 2 | 3));
        }
      }
      // Wave 51 (C6) · [ / ] resize, freeform only — gated the same way R's
      // MEANING changes between modes above, rather than firing (and silently
      // doing nothing useful) while on the grid, where every placement is
      // always exactly 1x.
      if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
        if (!useGameStore.getState().freeformBuild) return;
        const step = e.shiftKey ? SCALE_SHIFT_STEP : SCALE_STEP;
        const dir = e.code === 'BracketRight' ? 1 : -1;
        setFreeScale((s) => THREE.MathUtils.clamp(
          Math.round((s + dir * step) * 100) / 100, SCALE_MIN, SCALE_MAX,
        ));
      }
      if (e.code === 'KeyU') undoLast();
      if (e.code === 'KeyQ') setAzQuarter((q) => q - 1);
      if (e.code === 'KeyE') setAzQuarter((q) => q + 1);
      if (e.code === 'KeyF') {
        const st = useGameStore.getState();
        const on = !st.freeformBuild;
        // carry the facing across the switch in both directions, so the ghost
        // you are looking at never jumps when the mode changes
        if (on) setFreeYaw((rotRef.current * Math.PI) / 2);
        else setRot(((((Math.round(freeYawRef.current / (Math.PI / 2)) % 4) + 4) % 4)) as 0 | 1 | 2 | 3);
        st.setFreeformBuild(on);
        st.notify(on
          ? 'Freeform placement — off the grid. R turns in small steps, [ and ] resize.'
          : 'Back on the grid.');
      }
      if (e.code === 'KeyX') {
        const st = useGameStore.getState();
        st.setBuildTool(st.buildTool === 'demolish' ? 'build' : 'demolish');
      }
      // Wave 12 · the spade. Its own key rather than a third stop on X's
      // cycle: X has meant "wrecking tool on/off" since Wave 9, and turning it
      // into a three-way rotation would make the muscle memory for putting the
      // wrecking tool away start digging instead.
      if (e.code === 'KeyG') {
        const st = useGameStore.getState();
        st.setBuildTool(st.buildTool === 'dig' ? 'build' : 'dig');
      }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [keys, rotRef, freeYawRef, setRot, setFreeYaw, setFreeScale, setAzQuarter, undoLast]);
}
