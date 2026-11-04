import { describe, expect, it } from 'vitest';
import { FAILED_FRAMES_TO_STOP, WATCH_BEGIN_PRIORITY, WATCH_END_PRIORITY, makeFrameWatch } from './frameWatch';

describe('the frame watch', () => {
  it('counts the frames in a row that never reached their end', () => {
    const w = makeFrameWatch();
    // three good frames
    for (let i = 0; i < 3; i++) {
      expect(w.begin()).toBe(0);
      w.end();
    }
    // frames that throw: each begins without the one before having ended
    expect(w.begin()).toBe(0);
    expect(w.begin()).toBe(1);
    expect(w.begin()).toBe(2);
    expect(w.begin()).toBe(FAILED_FRAMES_TO_STOP);
  });

  it('starts again from nothing after a frame that ran to its end', () => {
    const w = makeFrameWatch();
    w.begin();
    w.begin(); // the first failed
    expect(w.begin()).toBe(2);
    w.end(); // this one ran through
    expect(w.begin()).toBe(0);
  });
});

// react-three-fiber's loop as @react-three/fiber 9's `loop`/`update` run it: one loop for every Canvas, in the order
// they were made; each root's useFrame callbacks sorted by priority, then its render unless a callback above 0 has
// taken it; a throw anywhere ends the whole tick (the window gets the error)
type Sub = { priority: number; run: () => void };
function tick(roots: Sub[][]) {
  try {
    for (const subs of roots) for (const s of [...subs].sort((a, b) => a.priority - b.priority)) s.run();
  } catch {
    // the window's error
  }
}

describe("the frame watch on the world's Canvas", () => {
  function setUp() {
    const w = makeFrameWatch();
    let worstRun = 0;
    const broken = { world: false, render: false, preview: false };
    const fail = (where: keyof typeof broken) => () => {
      if (broken[where]) throw new Error(where);
    };
    const world: Sub[] = [
      { priority: 0, run: fail('world') }, // a game callback
      { priority: 1, run: fail('render') }, // PostProcessing's render
      { priority: WATCH_BEGIN_PRIORITY, run: () => (worstRun = Math.max(worstRun, w.begin())) },
      { priority: WATCH_END_PRIORITY, run: () => w.end() },
    ];
    const preview: Sub[] = [{ priority: 0, run: fail('preview') }]; // a panel's RotatablePreview, made after the world
    const run = (frames: number) => {
      for (let i = 0; i < frames; i++) tick([world, preview]);
      return worstRun;
    };
    return { broken, run };
  }

  it("is not tripped by another Canvas's frame that throws after the world has drawn", () => {
    const { broken, run } = setUp();
    broken.preview = true;
    expect(run(10)).toBe(0);
  });

  it('is tripped by a world callback that throws every frame', () => {
    const { broken, run } = setUp();
    broken.world = true;
    expect(run(FAILED_FRAMES_TO_STOP)).toBeLessThan(FAILED_FRAMES_TO_STOP);
    expect(run(1)).toBe(FAILED_FRAMES_TO_STOP);
  });

  it("is tripped by the world's own render throwing (the end comes after it)", () => {
    const { broken, run } = setUp();
    broken.render = true;
    expect(run(FAILED_FRAMES_TO_STOP + 1)).toBe(FAILED_FRAMES_TO_STOP);
  });
});
