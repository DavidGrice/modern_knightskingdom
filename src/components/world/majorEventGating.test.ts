import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// G-04 · golden tests of the night events' gating, written on the base before the major-event arbiter
// (game/majorEvents.ts) took over their checks, and kept unchanged after: Cedric's siege (CedricSiege.tsx), the dragon
// sieges (DragonSiegeController.tsx, both configs) and the omen (DragonOmen.tsx) each roll when, and only when, they
// rolled before. The components are called as plain functions on just enough of React to keep their refs and state
// between calls (a slot per hook; effects are not run), a store's hook selects from the state as it is, and the frame
// loop each hands useFrame is collected, so a test runs it.
type Frame = (state: unknown, dt: number) => void;
const H = vi.hoisted(() => ({ inst: null as null | { slots: unknown[]; i: number; frames: Frame[] } }));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  const slot = <T,>(make: () => T): [T, number] => {
    const c = H.inst!;
    const i = c.i++;
    if (!(i in c.slots)) c.slots[i] = make();
    return [c.slots[i] as T, i];
  };
  return {
    ...real,
    useState: (init: unknown) => {
      const c = H.inst!;
      const [value, i] = slot(() => (typeof init === 'function' ? (init as () => unknown)() : init));
      return [value, (next: unknown) => { c.slots[i] = next; }];
    },
    useRef: (value: unknown) => slot(() => ({ current: value }))[0],
    useMemo: (make: () => unknown) => slot(make)[0],
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
vi.mock('@react-three/fiber', () => ({ useFrame: (cb: Frame) => { H.inst!.frames.push(cb); }, useThree: () => ({}) }));
vi.mock('./RiggedProp', () => ({ default: 'RiggedProp', fireProp: () => {} }));

import CedricSiege from './CedricSiege';
import DragonOmen from './DragonOmen';
import DragonSiegeController from './DragonSiegeController';
import { BLACK_DRAGON, GREEN_DRAGON, type DragonSiegeConfig } from '@/game/dragonSiegeConfig';
import { dragonAir, dragonAirBlack } from '@/game/dragonAir';
import { cedricWarState } from '@/game/cedricSiege';
import { CEDRIC_SIEGE_TIER, BLACK_DRAGON_TIER, difficultyState } from '@/game/difficulty';
import { CEDRIC_CAMP, CEDRIC_REVEAL_QUEST } from '@/game/data/world';
import { useEnemyStore } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let notes: string[] = [];

/** one instance of a component: `frame()` renders it (as React would, between frames) and runs a frame of its loop */
function instance<P>(component: (props: P) => unknown, props: P) {
  const inst = { slots: [] as unknown[], i: 0, frames: [] as Frame[] };
  return {
    frame: (dt = 1 / 60) => {
      H.inst = inst;
      inst.i = 0;
      inst.frames = [];
      try { component(props); } finally { H.inst = null; }
      inst.frames[0]({}, dt);
    },
  };
}
/** the threat tier (game/difficulty.ts refreshes it from the store on every change, so it is set just before a frame) */
function threat(tier: number): void {
  difficultyState.tier = tier;
  difficultyState.rangedReady = true;
}
/** deep night of day `day` (DayNight.tsx sets worldEnv.night from the clock; nothing runs it here) */
function night(day: number, depth = 0.9): void {
  worldEnv.dayCount = day;
  worldEnv.night = depth;
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => 0); // every roll comes up, unless a test says otherwise
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  notes = [];
  useGameStore.setState({
    notify: (text: string) => { notes.push(text); },
    completedQuests: [...game().completedQuests, CEDRIC_REVEAL_QUEST],
    dragonSeen: true,
    dragonRouted: true,
  } as never);
  useEnemyStore.getState().clear();
  dragonAir.busy = false;
  dragonAirBlack.busy = false;
  cedricWarState.active = false;
  cedricWarState.finalStandActive = false;
  night(1);
});
afterEach(() => { vi.restoreAllMocks(); });

describe("Cedric's siege, as it was gated before the arbiter", () => {
  const siege = () => {
    const c = instance(CedricSiege as () => unknown, {});
    return { frame: (tier = CEDRIC_SIEGE_TIER) => { threat(tier); c.frame(); } };
  };
  const started = () => cedricWarState.active;

  it('rolls deep in the night once his camp is known and the tier allows it', () => {
    const s = siege();
    s.frame();
    expect(started()).toBe(true);
    expect(notes.some((n) => n.includes("CEDRIC'S WAR PARTY"))).toBe(true);
  });

  it('not before deep night, not away from home, and not below his tier', () => {
    const s = siege();
    night(1, 0.8);
    s.frame();
    useGameStore.setState({ destination: 'kings_approach' } as never);
    night(1);
    s.frame();
    useGameStore.setState({ destination: null } as never);
    s.frame(CEDRIC_SIEGE_TIER - 1);
    expect(started()).toBe(false);
    // none of these spent the night's roll
    s.frame();
    expect(started()).toBe(true);
  });

  it('never while the dragon is in the air, and rolls that same night once it has gone', () => {
    const s = siege();
    dragonAir.busy = true;
    s.frame();
    expect(started()).toBe(false);
    dragonAir.busy = false;
    s.frame();
    expect(started()).toBe(true);
  });

  it('never on top of a siege already running', () => {
    const s = siege();
    cedricWarState.active = true;
    s.frame();
    expect(notes).toEqual([]);
    expect(useEnemyStore.getState().enemies).toEqual([]);
  });

  it('never during his final stand', () => {
    const s = siege();
    useEnemyStore.getState().spawn('cedric', CEDRIC_CAMP.x, CEDRIC_CAMP.z, false);
    cedricWarState.finalStandActive = true;
    s.frame();
    expect(started()).toBe(false);
  });

  it("never on top of a raid's raiders, and that same night once they are gone", () => {
    const s = siege();
    useEnemyStore.getState().spawn('bandit', 30, 30, true);
    s.frame();
    expect(started()).toBe(false);
    useEnemyStore.getState().clear();
    s.frame();
    expect(started()).toBe(true);
  });

  it('one roll a night: a roll that fails waits for the next night', () => {
    const s = siege();
    vi.mocked(Math.random).mockImplementation(() => 0.99);
    s.frame();
    vi.mocked(Math.random).mockImplementation(() => 0);
    s.frame();
    expect(started()).toBe(false);
    night(2);
    s.frame();
    expect(started()).toBe(true);
  });

  it('not for a player sworn to him, nor while he is jailed', () => {
    const s = siege();
    useGameStore.setState({ alliance: 'cedric' } as never);
    s.frame();
    useGameStore.setState({ alliance: null, defeatedCedric: true } as never);
    s.frame();
    expect(started()).toBe(false);
  });
});

describe('the dragon sieges, as they were gated before the arbiter', () => {
  const siege = (cfg: DragonSiegeConfig) => {
    const c = instance(DragonSiegeController as (p: { config: DragonSiegeConfig }) => unknown, { config: cfg });
    return { frame: (tier = BLACK_DRAGON_TIER) => { threat(tier); c.frame(); } };
  };

  for (const [cfg, other] of [[GREEN_DRAGON, BLACK_DRAGON], [BLACK_DRAGON, GREEN_DRAGON]] as const) {
    describe(cfg.boss, () => {
      it('comes down deep in the night when allowed', () => {
        siege(cfg).frame();
        expect(cfg.air.busy).toBe(true);
        expect(notes).toContain(cfg.lines.descends);
      });

      it('never while it or the other dragon is in the air, and rolls that same night once the sky is clear', () => {
        const s = siege(cfg);
        other.air.busy = true;
        s.frame();
        expect(notes).toEqual([]);
        other.air.busy = false;
        cfg.air.busy = true;
        s.frame();
        expect(notes).toEqual([]);
        cfg.air.busy = false;
        s.frame();
        expect(cfg.air.busy).toBe(true);
      });

      it('not before deep night, not away, not when not allowed — none of which spends the roll', () => {
        const s = siege(cfg);
        night(1, 0.8);
        s.frame();
        useGameStore.setState({ destination: 'kings_approach' } as never);
        night(1);
        s.frame();
        useGameStore.setState({ destination: null } as never);
        s.frame(0);
        expect(cfg.air.busy).toBe(false);
        s.frame();
        expect(cfg.air.busy).toBe(true);
      });

      it('one roll a night', () => {
        const s = siege(cfg);
        vi.mocked(Math.random).mockImplementation(() => 0.99);
        s.frame();
        vi.mocked(Math.random).mockImplementation(() => 0);
        s.frame();
        expect(cfg.air.busy).toBe(false);
        night(2);
        s.frame();
        expect(cfg.air.busy).toBe(true);
      });
    });
  }
});

describe('the omen, as it was gated before the arbiter', () => {
  const omen = () => {
    const c = instance(DragonOmen as () => unknown, {});
    return { frame: (tier = 1) => { threat(tier); c.frame(); } };
  };

  it('crosses the moon deep in the night from tier 1, and holds the sky while it does', () => {
    const o = omen();
    night(1, 0.9);
    o.frame();
    expect(dragonAir.busy).toBe(true);
    expect(notes.some((n) => n.includes('A vast shadow crosses the moon'))).toBe(true);
  });

  it('not before 0.85, not below tier 1, not away, never while the dragon is in the air', () => {
    const o = omen();
    night(1, 0.85);
    o.frame();
    night(1);
    o.frame(0);
    useGameStore.setState({ destination: 'kings_approach' } as never);
    o.frame();
    useGameStore.setState({ destination: null } as never);
    dragonAir.busy = true;
    o.frame();
    expect(notes).toEqual([]);
    dragonAir.busy = false;
    o.frame();
    expect(dragonAir.busy).toBe(true);
  });

  it('one roll a night', () => {
    const o = omen();
    vi.mocked(Math.random).mockImplementation(() => 0.5);
    o.frame();
    vi.mocked(Math.random).mockImplementation(() => 0);
    o.frame();
    expect(dragonAir.busy).toBe(false);
    night(2);
    o.frame();
    expect(dragonAir.busy).toBe(true);
  });
});
