import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// DayNight.tsx called as a plain function, on just enough of React to keep its refs between calls (a slot per hook;
// effects are not run; its lights' refs stay empty, so a frame only turns the clock), a store's hook selecting from the
// state as it is, and the frame loop it hands useFrame collected, so a test runs it.
type Frame = (state: unknown, dt: number) => void;
const H = vi.hoisted(() => ({ inst: null as null | { slots: unknown[]; i: number; frames: Frame[] } }));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  return {
    ...real,
    useRef: (value: unknown) => {
      const c = H.inst!;
      const i = c.i++;
      if (!(i in c.slots)) c.slots[i] = { current: value };
      return c.slots[i];
    },
    useEffect: () => {},
  };
});
vi.mock('zustand', async () => {
  const { createStore } = await import('zustand/vanilla');
  const bind = (init: never) => {
    const api = createStore(init);
    return Object.assign((select: (s: unknown) => unknown = (s) => s) => select(api.getState()), api);
  };
  return { create: (init?: never) => (init ? bind(init) : bind) };
});
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: Frame) => { H.inst!.frames.push(cb); },
  useThree: (select: (s: unknown) => unknown) => select({ scene: { fog: null } }),
}));

import DayNight from '@/components/world/DayNight';
import { DAWN, onDayRollover } from './dayRollover';
import { nightFactor, worldEnv } from './env';
import * as THREE from 'three';
import { findTarget } from './interaction/findTarget';
import { useGameStore } from './store/gameStore';
import { useAppStore } from './store/appStore';
import { damagePlayer, combatState } from './combat';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();

/** DayNight's frame: `secs` of the clock at the 12-minute day, one second a frame */
function dayNight() {
  const inst = { slots: [] as unknown[], i: 0, frames: [] as Frame[] };
  return (secs: number) => {
    for (let s = 0; s < secs; s++) {
      H.inst = inst;
      inst.i = 0;
      inst.frames = [];
      try { (DayNight as () => unknown)(); } finally { H.inst = null; }
      inst.frames[0]({}, 1);
    }
  };
}

let days: number[] = [];
let stop = () => {};
beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: () => {} } as never);
  useAppStore.setState({ settings: { ...useAppStore.getState().settings, dayLengthMin: 12 } });
  worldEnv.running = true;
  worldEnv.dayCount = 3;
  days = [];
  stop = onDayRollover((day) => { days.push(day); });
});
afterEach(() => { stop(); vi.restoreAllMocks(); });

describe('the day turning over', () => {
  it('the clock passing midnight counts the day and says so, once', () => {
    const frame = dayNight();
    worldEnv.time = 1 - 5 / 720;
    frame(4);
    expect(days).toEqual([]);
    frame(2);
    expect(days).toEqual([4]);
    expect(worldEnv.dayCount).toBe(4);
    frame(720 - 10);
    expect(days).toEqual([4]);
    frame(10);
    expect(days).toEqual([4, 5]);
  });

  it('a sleep begun before midnight wakes at dawn of the next day — said once, and the clock does not say it again', () => {
    const frame = dayNight();
    worldEnv.time = 0.9;
    game().sleep();
    expect([worldEnv.time, worldEnv.dayCount, game().dayCount, game().timeOfDay]).toEqual([DAWN, 4, 4, DAWN]);
    expect(days).toEqual([4]);
    frame(Math.floor((1 - DAWN) * 720) - 2); // to just before the next midnight
    expect(days).toEqual([4]);
    frame(4);
    expect(days).toEqual([4, 5]);
  });

  it('a sleep begun after midnight wakes that dawn: the clock already counted the day', () => {
    const frame = dayNight();
    worldEnv.time = 1 - 2 / 720;
    frame(4);
    expect(days).toEqual([4]);
    game().sleep();
    expect([worldEnv.time, worldEnv.dayCount]).toEqual([DAWN, 4]);
    expect(days).toEqual([4]);
  });

  it('ten days of sleeping at night and waking at dawn, from both sources, count ten days and say each once', () => {
    const frame = dayNight();
    worldEnv.time = DAWN;
    for (let d = 0; d < 10; d++) {
      frame(Math.round((0.92 - DAWN) * 720)); // the day, into the evening
      if (d % 2) game().sleep(); // every other night in a bed, before midnight
      else frame(Math.round((1 - 0.92 + DAWN) * 720)); // and the others awake, through midnight to dawn
    }
    expect(days).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(worldEnv.dayCount).toBe(13);
  });

  // wakeAtDawn counts a day for any clock past dawn, so what keeps a bed from counting one a press is the bed's own
  // hours: findTarget offers it only while the night is deep (worldEnv.night > 0.45, about 17:55 to 06:05 in summer
  // and a little longer in winter), and a sleep wakes you at DAWN (06:29), where it is not offered — so a second press
  // on waking, or one in the morning, cannot pump the day count (wave 70.2 review).
  it('the bed is not offered at the dawn it wakes you to, in any season — a second press cannot count another day', () => {
    const camera = new THREE.PerspectiveCamera();
    useGameStore.setState({ buildings: [{ id: 'bed1', type: 'bed', x: 150, z: 150, y: 0, rot: 0, built: 1, world: null }] as never });
    camera.position.set(150, 1.6, 151.5);
    camera.lookAt(150, 0.4, 150);
    camera.updateMatrixWorld(true);
    const bed = () => {
      const t = findTarget({ camera, pos: { current: camera.position.clone() } }, game());
      return t && [t.kind, t.actionable];
    };
    for (const winter of [0, 0.12]) {
      worldEnv.night = nightFactor(0.9, winter);
      expect(bed()).toEqual(['bed', true]);
      worldEnv.night = nightFactor(DAWN, winter);
      expect(bed()).toEqual(['bed', false]);
      worldEnv.night = nightFactor(0.35, winter);
      expect(bed()).toEqual(['bed', false]);
    }
  });

  it('a knock-out wakes at the next dawn too', () => {
    worldEnv.time = 0.8;
    combatState.iframeUntil = 0;
    damagePlayer(9999);
    expect([worldEnv.time, worldEnv.dayCount]).toEqual([DAWN, 4]);
    expect(days).toEqual([4]);
  });
});
