// F-06 · crash-test hooks, so that a probe can see what a crash does on a production build (OD-14 keeps the
// `window.__kk*` handles there): `__kkcrash.panel = true` makes every panel opened throw as it renders
// (components/hud/Panels.tsx); `__kkcrash.frame = true` makes every frame of the world throw (FrameCrashTest, in
// GameScreen.tsx's Canvas). Each holds until it is set back: a throw only once would not do for a panel, since React
// renders again, once, a tree that threw before it hands the error to a boundary. Nothing in the game sets either.
import { exposeDebug } from '@/lib/debugHooks';

export const crashTest = { panel: false, frame: false };
exposeDebug('__kkcrash', crashTest);

/** throws the crash test's error for `where` while it is set */
export function crashIfArmed(where: 'panel' | 'frame'): void {
  if (!crashTest[where]) return;
  throw new Error(`crash test: a throw in ${where === 'panel' ? 'a panel' : 'a frame of the world'} (__kkcrash.${where})`);
}
