import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ARENA_ENV_BY_ID, arenaSpawnScale, arenaState, resetArenaRun, tickArena, type ArenaRun, type ArenaTickStore,
} from './arena';
import { ARENA_ORIGIN, ARENA_RADIUS } from './data/worlds';
import type { EnemyDeps, WaveEnemy } from './waveDefense';

/** the frame's store snapshot, stood in for: what the arena says and pays is recorded in `calls` */
function snapshot(over: Partial<ArenaTickStore> = {}) {
  const calls: unknown[][] = [];
  const st = {
    destination: 'arena', paused: false,
    addItems: (items: unknown, why: unknown) => { calls.push(['addItems', items, why]); },
    notify: (text: unknown, big: unknown) => { calls.push(['notify', text, big]); },
    ...over,
  } as unknown as ArenaTickStore;
  return { st, calls };
}
/** the enemy store, stood in for: a spawn REPLACES the list, as the store does; its calls go to the same record */
function store(calls: unknown[][], list: WaveEnemy[] = []) {
  const s = { list };
  const deps: EnemyDeps = {
    enemies: () => s.list,
    spawn: (...args) => { calls.push(['spawn', ...args]); s.list = [...s.list, { world: args[9] ?? null, arena: !!args[8], mob: { x: args[1], z: args[2] } }]; },
    removeByWorld: (world) => { calls.push(['removeByWorld', world]); },
  };
  return { s, deps };
}
/** the dice, loaded: each draw takes the next number, and a draw too many is an error */
function dice(...values: number[]) {
  const left = [...values];
  vi.spyOn(Math, 'random').mockImplementation(() => { if (!left.length) throw new Error('one Math.random too many'); return left.shift()!; });
  return left;
}
const inTheRing = (n: number): WaveEnemy[] => Array.from({ length: n }, () => ({ world: 'arena', arena: true, mob: { x: 0, z: 0 } }));
/** the milestone loot's own draws for "gold only": gold's chance and amount, then the arrows and the bolts passed over */
const GOLD_ONLY = [0, 0.5, 0.9, 0.9];

let clock: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  resetArenaRun('earth');
  clock = vi.spyOn(performance, 'now').mockReturnValue(10_000);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the arena stands down', () => {
  it('when the player is not in it, when no run is on, and when the game is paused — the countdown untouched', () => {
    arenaState.kills = 500;
    for (const [over, active] of [[{ destination: 'template-04' }, true], [{ destination: null }, true], [{}, false], [{ paused: true }, true]] as const) {
      arenaState.active = active;
      const { st, calls } = snapshot(over as Partial<ArenaTickStore>);
      const run: ArenaRun = { timer: 0.3 };
      dice();
      tickArena(run, st, 0.5, store(calls).deps);
      expect(calls).toEqual([]);
      expect(run.timer).toBe(0.3);
      expect(arenaState.milestonesClaimed).toEqual([]);
    }
    expect(clock).not.toHaveBeenCalled();
  });
});

describe('a milestone', () => {
  it('pays its loot, brings a champion in — the kind drawn first, then the angle — and sets a bonus objective', () => {
    arenaState.kills = 50;
    const { st, calls } = snapshot();
    const { deps } = store(calls, inTheRing(3)); // the ring already full: no filler after it
    const left = dice(...GOLD_ONLY, 0.7, 0.25); // the champion: the second kind; a quarter turn
    tickArena({ timer: 0 }, st, 0.1, deps);
    expect(left).toEqual([]);
    expect(arenaState.milestonesClaimed).toEqual([50]);
    expect(calls.map((c) => c[0])).toEqual(['addItems', 'notify', 'spawn', 'notify']);
    expect(calls[0]).toEqual(['addItems', { gold: 14 }, 'grant']);
    expect(calls[1]).toEqual(['notify', '50 kills! The arena rewards you.', true]);
    const [, kind, x, z, ...rest] = calls[2] as [string, string, number, number, ...unknown[]];
    expect(kind).toBe('royal');
    expect(x).toBeCloseTo(ARENA_ORIGIN.x + ARENA_RADIUS * 0.5, 9); // half way out
    expect(z).toBeCloseTo(ARENA_ORIGIN.z, 9);
    // not a raider, no room, not approaching, no last stand; over half as big again as the run's own scale; the arena's
    expect(rest).toEqual([false, undefined, false, false, arenaSpawnScale() * 1.6, true]);
    expect(calls[3]).toEqual(['notify', 'A champion enters the ring!', true]);
    expect(arenaState.objective).toEqual({ startKills: 50, need: 10, deadline: 10_000 + 30_000 });
    expect(arenaState.env).toBe('earth'); // the first milestone leaves the ring the player chose
  });

  it('past the first, shifts the ring to another environment as well', () => {
    arenaState.kills = 100;
    arenaState.milestonesClaimed = [50];
    const { st, calls } = snapshot();
    dice(...GOLD_ONLY, 0.1, 0.5, 0); // …the champion, then the next environment
    tickArena({ timer: 0 }, st, 0.1, store(calls, inTheRing(8)).deps);
    expect(arenaState.milestonesClaimed).toEqual([50, 100]);
    expect(arenaState.env).not.toBe('earth');
    expect(calls.at(-1)).toEqual(['notify', `The ring shifts — welcome to ${ARENA_ENV_BY_ID[arenaState.env!].name}!`, true]);
  });

  it('is paid once, and two crossed on one frame are paid in order', () => {
    arenaState.kills = 100;
    const { st, calls } = snapshot();
    const { deps } = store(calls, inTheRing(8));
    dice(...GOLD_ONLY, 0.1, 0.5, ...GOLD_ONLY, 0.1, 0.5, 0);
    tickArena({ timer: 0 }, st, 0.1, deps);
    expect(arenaState.milestonesClaimed).toEqual([50, 100]);
    expect(calls.filter((c) => c[0] === 'notify').map((c) => c[1])).toEqual([
      '50 kills! The arena rewards you.', 'A champion enters the ring!',
      '100 kills! The arena rewards you.', 'A champion enters the ring!', expect.stringMatching(/^The ring shifts/),
    ]);
    calls.length = 0;
    dice();
    tickArena({ timer: 9 }, st, 0.1, deps);
    expect(calls).toEqual([]);
  });
});

describe('the bonus objective', () => {
  it('pays out when ten more have fallen — and the clock is not read for it', () => {
    arenaState.kills = 30;
    arenaState.objective = { startKills: 20, need: 10, deadline: 5 }; // long past its time, and it does not matter
    const { st, calls } = snapshot();
    dice(...GOLD_ONLY);
    tickArena({ timer: 9 }, st, 0.1, store(calls).deps);
    expect(arenaState.objective).toBeNull();
    expect(calls).toEqual([['addItems', { gold: 14 }, 'grant'], ['notify', 'Bonus objective complete! The arena rewards you further.', true]]);
    expect(clock).not.toHaveBeenCalled();
  });

  it('lapses without a word when its time is up, the clock read once', () => {
    arenaState.kills = 29;
    arenaState.objective = { startKills: 20, need: 10, deadline: 10_000 };
    const { st, calls } = snapshot();
    dice();
    tickArena({ timer: 9 }, st, 0.1, store(calls).deps);
    expect(arenaState.objective).toBeNull();
    expect(calls).toEqual([]);
    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('stands while neither has come', () => {
    arenaState.kills = 29;
    arenaState.objective = { startKills: 20, need: 10, deadline: 10_001 };
    const { st, calls } = snapshot();
    dice();
    tickArena({ timer: 9 }, st, 0.1, store(calls).deps);
    expect(arenaState.objective).not.toBeNull();
    expect(calls).toEqual([]);
  });
});

describe('the spawn check', () => {
  it('comes when the countdown is out, which is then SET to 1.2 s; until then nothing', () => {
    const { st, calls } = snapshot();
    const { deps } = store(calls, inTheRing(3));
    const run: ArenaRun = { timer: 0.5 };
    dice();
    tickArena(run, st, 0.4, deps);
    expect(run.timer).toBeCloseTo(0.1, 12);
    tickArena(run, st, 0.6, deps); // half a second over: none of it is carried
    expect(run.timer).toBe(1.2);
    tickArena(run, st, 3, deps); // a long frame is taken whole: there is no clamp
    expect(run.timer).toBe(1.2);
    const even: ArenaRun = { timer: 0.5 };
    tickArena(even, st, 0.5, deps); // run down to exactly nought: that is out
    expect(even.timer).toBe(1.2);
    expect(calls).toEqual([]);
  });

  it('walks one filler in under the cap — the ANGLE drawn first, the kind after it — on the ring at 0.85 of the arena', () => {
    const { st, calls } = snapshot();
    const { deps } = store(calls, inTheRing(2));
    const left = dice(0.5, 0.45); // half a turn; then the second kind of the table (skeleton to 0.4, bandit to 0.7)
    tickArena({ timer: 0 }, st, 0.1, deps);
    expect(left).toEqual([]);
    expect(calls).toHaveLength(1);
    const [, kind, x, z, ...rest] = calls[0] as [string, string, number, number, ...unknown[]];
    expect(kind).toBe('bandit');
    expect(x).toBeCloseTo(ARENA_ORIGIN.x, 9);
    expect(z).toBeCloseTo(ARENA_ORIGIN.z - ARENA_RADIUS * 0.85, 9);
    expect(rest).toEqual([false, undefined, false, false, arenaSpawnScale(), true]);
  });

  it('keeps three in the ring at first and one more for every two milestones, eight at most — only the arena\'s own counted', () => {
    const { st, calls } = snapshot();
    const strangers: WaveEnemy[] = [{ world: null, mob: { x: 0, z: 0 } }, { world: 'template-04', arena: false, mob: { x: 0, z: 0 } }];
    for (const [claimed, cap] of [[[], 3], [[50], 3], [[50, 100], 4], [[50, 100, 200, 500], 5], [Array.from({ length: 20 }, (_, i) => i), 8]] as const) {
      arenaState.milestonesClaimed = [...claimed];
      arenaState.kills = 0;
      calls.length = 0;
      dice();
      tickArena({ timer: 0 }, st, 0.1, store(calls, [...strangers, ...inTheRing(cap)]).deps);
      expect(calls).toEqual([]);
      dice(0, 0);
      tickArena({ timer: 0 }, st, 0.1, store(calls, [...strangers, ...inTheRing(cap - 1)]).deps);
      expect(calls.map((c) => c[0])).toEqual(['spawn']);
    }
  });

  it('counts the ring after the milestones: a champion walked in on this frame counts toward the cap', () => {
    arenaState.kills = 50;
    const { st, calls } = snapshot();
    dice(...GOLD_ONLY, 0.1, 0.5); // no filler's draws: with two in the ring and the champion, it is full
    tickArena({ timer: 0 }, st, 0.1, store(calls, inTheRing(2)).deps);
    expect(calls.filter((c) => c[0] === 'spawn')).toHaveLength(1);
  });

  it('has a countdown that is the caller\'s own: a new run does not start it afresh', () => {
    const { st, calls } = snapshot();
    const run: ArenaRun = { timer: 0.9 };
    resetArenaRun('snow');
    dice();
    tickArena(run, st, 0.1, store(calls, inTheRing(3)).deps);
    expect(run.timer).toBeCloseTo(0.8, 12);
  });
});
