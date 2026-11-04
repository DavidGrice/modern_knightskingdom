// F-06 · how the scene's error boundary hears of a frame that throws. A throw in a useFrame callback is not React's:
// react-three-fiber runs them from its own requestAnimationFrame loop, so the error reaches only the window (the error
// log takes it there) — and a callback that throws every frame skips every callback after it and the render, every
// frame, and the world stands frozen with no word said. So the world's Canvas runs the watch's own two callbacks
// (GameScreen.tsx's FrameWatch): `begin` first of all its callbacks, `end` last of all, after the render; a frame that
// finds the watch still open follows one that failed. One failed frame is only logged — the next may well run — but
// FAILED_FRAMES_TO_STOP in a row stop the world.
//
// The watch is the world root's own, not the loop's: one loop runs every Canvas — the HUD's portrait, the panels'
// previews — so a throw in a panel's preview, after the world has drawn its frame, is that panel's trouble, not the
// world's.
export const FAILED_FRAMES_TO_STOP = 3;

// the two callbacks' useFrame priorities: first and last of the world root's. A priority above 0 takes the render into
// that callback's own hands — the world's is in PostProcessing's already (priority 1, always mounted), so `end` only
// runs after it and renders nothing.
export const WATCH_BEGIN_PRIORITY = -1e9;
export const WATCH_END_PRIORITY = 1e9;

export function makeFrameWatch() {
  let open = false;
  let failed = 0;
  return {
    /** a frame begins: how many frames have failed in a row before it */
    begin(): number {
      failed = open ? failed + 1 : 0;
      open = true;
      return failed;
    },
    /** the frame ran to its end */
    end(): void {
      open = false;
    },
  };
}
