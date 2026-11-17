import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// G-04 · the major-event arbiter: one big thing at the homestead at a time. What it changed (what it kept is
// components/world/majorEventGating.test.ts's, written before it). The night events' components are called as plain
// functions, as there: just enough of React to keep their refs and state between calls, a store's hook selecting from
// the state as it is, and the frame loop each hands useFrame collected. Effects run after the call when their deps
// change, and their cleanups at an unmount, as React runs them.
type Frame = (state: unknown, dt: number) => void;
type Effect = { deps?: unknown[]; cleanup?: void | (() => void) };
type Inst = { slots: unknown[]; i: number; frames: Frame[]; effects: number[]; pending: (() => void)[] };
const H = vi.hoisted(() => ({ inst: null as null | Inst }));
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
    useEffect: (run: () => void | (() => void), deps?: unknown[]) => {
      const c = H.inst!;
      const [effect, i] = slot<Effect>(() => ({}));
      if (!c.effects.includes(i)) c.effects.push(i);
      if (effect.deps && deps && deps.every((d, k) => Object.is(d, effect.deps![k]))) return;
      c.pending.push(() => { effect.cleanup?.(); effect.deps = deps; effect.cleanup = run(); });
    },
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
vi.mock('@/components/world/RiggedProp', () => ({ default: 'RiggedProp', fireProp: () => {} }));

import CedricSiege from '@/components/world/CedricSiege';
import DragonOmen from '@/components/world/DragonOmen';
import DragonSiegeController from '@/components/world/DragonSiegeController';
import { majorEventOn } from './majorEvents';
import { BLACK_DRAGON, GREEN_DRAGON, type DragonSiegeConfig } from './dragonSiegeConfig';
import { dragonAir, dragonAirBlack } from './dragonAir';
import { cedricWarState } from './cedricSiege';
import { settlementRaidState, tickSettlementRaid, type SettlementRaidTickStore } from './settlementRaid';
import { raidActive, raidCooldown, raidForce, raidLost, raidPlan, resetDirectors } from './directors/state';
import { raidDirector } from './directors/raidDirector';
import { BLACK_DRAGON_TIER, difficultyState } from './difficulty';
import { CEDRIC_REVEAL_QUEST } from './data/world';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import { useEnemyStore } from './combat';
import { useGameStore } from './store/gameStore';
import { worldEnv } from './env';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let notes: string[] = [];

/** one instance of a component: calling it renders it (as React would, between frames) and runs a frame of its loop;
 *  `unmount` runs its effects' cleanups, as React does when the game screen comes down */
function instance<P>(component: (props: P) => unknown, props: P) {
  const inst: Inst = { slots: [], i: 0, frames: [], effects: [], pending: [] };
  const frame = () => {
    H.inst = inst;
    inst.i = 0;
    inst.frames = [];
    try { component(props); } finally { H.inst = null; }
    for (const run of inst.pending.splice(0)) run();
    difficultyState.tier = BLACK_DRAGON_TIER; // game/difficulty.ts refreshes it from the store; every event allowed
    difficultyState.rangedReady = true;
    inst.frames[0]({}, 1 / 60);
  };
  return Object.assign(frame, { unmount: () => { for (const i of inst.effects) (inst.slots[i] as Effect).cleanup?.(); } });
}
const cedric = () => instance(CedricSiege as () => unknown, {});
const dragon = (cfg: DragonSiegeConfig) => instance(DragonSiegeController as (p: { config: DragonSiegeConfig }) => unknown, { config: cfg });
const omen = () => instance(DragonOmen as () => unknown, {});
const raidTick = () => raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
/** a raid's warning sounding at home: the homestead established, the roll forced, one tick */
function raidWarned(): void {
  useGameStore.setState({
    buildings: [0, 1, 2, 3].map((i) => ({ id: 'w' + i, type: 'wall' as const, x: 30 + i * 4, z: 40, rot: 0, built: 1 })),
    unlocks: [...game().unlocks, 'mining'],
  } as never);
  raidForce.current = true;
  raidTick();
}
/** every other event's flag, as each one sets it while it is on */
const OTHERS: [string, () => void][] = [
  ['dragon', () => { dragonAir.busy = true; }],
  ['blackDragon', () => { dragonAirBlack.busy = true; }],
  ['cedricSiege', () => { cedricWarState.active = true; }],
  ['cedricFinalStand', () => { cedricWarState.finalStandActive = true; }],
  ['settlementRaid', () => { settlementRaidState.active = true; }],
];
function clearAll(): void {
  dragonAir.busy = false;
  dragonAirBlack.busy = false;
  cedricWarState.active = false;
  cedricWarState.finalStandActive = false;
  settlementRaidState.active = false;
  resetDirectors();
  useEnemyStore.getState().clear();
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => 0.001); // every night roll comes up; no ram or ladder is 0.999's
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
  clearAll();
  worldEnv.time = 0.5;
  worldEnv.dayCount = 1;
  worldEnv.night = 0.9;
});
afterEach(() => { clearAll(); vi.restoreAllMocks(); });

describe('the major-event arbiter', () => {
  it('names the event under way: each of them, and none when the homestead is quiet', () => {
    expect(majorEventOn()).toBeNull();
    for (const [id, on] of OTHERS) {
      on();
      expect(majorEventOn()).toBe(id);
      clearAll();
    }
    raidWarned();
    expect(majorEventOn()).toBe('raid');
    for (let s = 0; s < 30; s++) raidTick();
    expect([raidPlan.incoming, raidActive.current, majorEventOn()]).toEqual([0, true, 'raid']);
    useEnemyStore.getState().clear();
    raidTick();
    expect(majorEventOn()).toBeNull();
  });

  it('a raid waits on every other major event, and its warning sounds once the homestead is quiet again', () => {
    for (const [id, on] of OTHERS) {
      on();
      raidWarned();
      expect([id, raidPlan.incoming]).toEqual([id, 0]);
      clearAll();
      raidWarned();
      expect([id, raidPlan.incoming]).toEqual([id, 30]);
      clearAll();
    }
  });

  it("Cedric's siege, either dragon and the omen wait on a raid's warning, and on the raid", () => {
    raidWarned();
    const frames = [cedric(), dragon(GREEN_DRAGON), dragon(BLACK_DRAGON), omen()];
    for (const f of frames) f();
    expect([cedricWarState.active, dragonAir.busy, dragonAirBlack.busy]).toEqual([false, false, false]);
    for (let s = 0; s < 30; s++) raidTick();
    useEnemyStore.getState().enemies.forEach((e) => { e.raid = false; }); // the raiders' own check aside: the raid is on
    for (const f of frames) f();
    expect([cedricWarState.active, dragonAir.busy, dragonAirBlack.busy]).toEqual([false, false, false]);
  });

  it("no dragon comes down on Cedric's siege, and Cedric does not come under the black dragon", () => {
    cedricWarState.active = true;
    dragon(GREEN_DRAGON)();
    dragon(BLACK_DRAGON)();
    omen()();
    expect([dragonAir.busy, dragonAirBlack.busy]).toEqual([false, false]);
    cedricWarState.active = false;
    dragonAirBlack.busy = true;
    cedric()();
    expect(cedricWarState.active).toBe(false);
  });

  it("a settlement raid waits on a raid at home (still on while the player is away), and the home raid's warning on it", () => {
    const CAMP = 'template-04';
    const dest = WORLD_DESTINATION_BY_ID[CAMP];
    const st = {
      destination: CAMP, allegiance: 100,
      settlements: { [CAMP]: { since: 0, lastCollectedAt: 0 } },
      claimedWorlds: { [CAMP]: { x: dest.origin.x, z: dest.origin.z, groundY: 0 } },
      notify: () => {}, resolveSettlementRaid: () => {},
    } as unknown as SettlementRaidTickStore;
    const deps = { enemies: () => [], spawn: () => {}, removeByWorld: () => {} };
    raidWarned();
    tickSettlementRaid({ spawnTimer: 5, wasActive: false }, st, 0.1, 0, deps);
    expect(settlementRaidState.active).toBe(false);
    clearAll();
    tickSettlementRaid({ spawnTimer: 5, wasActive: false }, st, 0.1, 0, deps);
    expect(settlementRaidState.active).toBe(true);
    raidWarned();
    expect(raidPlan.incoming).toBe(0);
  });

  // the pause menu's Options and Stats take the whole game screen down (App.tsx draws one screen at a time), and with
  // it each event's runner: its end() never runs, so a flag it left set would hold off every major event — raids
  // included — for the rest of the session
  it('an event whose runner unmounts mid-way is over: the game screen coming down does not leave the homestead held', () => {
    const runners: [string, ReturnType<typeof instance>, (typeof dragonAir)?][] = [
      ['cedricSiege', cedric()], ['dragon', dragon(GREEN_DRAGON), dragonAir], ['blackDragon', dragon(BLACK_DRAGON), dragonAirBlack],
      ['omen', omen()],
    ];
    for (const [id, run, air] of runners) {
      clearAll();
      run();
      run(); // rendered again, as React would after the roll's setActive(true)
      if (air) air.hostile = true; // as its flight (SiegeFlight) sets it once the dragon is circling
      expect([id, majorEventOn()]).toEqual([id, id === 'omen' ? 'dragon' : id]);
      run.unmount();
      expect([id, majorEventOn(), dragonAir.hostile, dragonAirBlack.hostile]).toEqual([id, null, false, false]);
      raidWarned();
      expect([id, raidPlan.incoming]).toEqual([id, 30]);
    }
  });
});
