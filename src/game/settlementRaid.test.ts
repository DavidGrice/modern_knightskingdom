import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  settlementRaidCooldownMs, settlementRaidState, startSettlementRaid, tickSettlementRaid,
  type SettlementRaidRun, type SettlementRaidTickStore,
} from './settlementRaid';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import { worldEnv } from './env';
import type { EnemyDeps, WaveEnemy } from './waveDefense';

const CAMP = 'template-04'; // The Siege Camp
const dest = WORLD_DESTINATION_BY_ID[CAMP];
const claim = { x: dest.origin.x + 5, z: dest.origin.z - 5, groundY: 0 };
const FOUNDED = 1_700_000_000_000;
const at = (dx: number, dz: number, world: string | null = CAMP): WaveEnemy => ({ world, mob: { x: claim.x + dx, z: claim.z + dz } });

/** the frame's store snapshot and the enemy store, stood in for: all the raid says, resolves, walks in and sweeps
 *  away goes to one record, in the order it happened */
function world(over: Partial<SettlementRaidTickStore> = {}, list: WaveEnemy[] = []) {
  const calls: unknown[][] = [];
  const st = {
    destination: CAMP, allegiance: 100,
    settlements: { [CAMP]: { since: FOUNDED, lastCollectedAt: FOUNDED } },
    claimedWorlds: { [CAMP]: claim },
    notify: (text: unknown, big: unknown) => { calls.push(big === undefined ? ['notify', text] : ['notify', text, big]); },
    resolveSettlementRaid: (id: unknown, won: unknown, frac: unknown) => { calls.push(['resolve', id, won, frac]); },
    ...over,
  } as unknown as SettlementRaidTickStore;
  const s = { list };
  const deps: EnemyDeps = {
    enemies: () => s.list,
    spawn: (...args) => { calls.push(['spawn', ...args]); s.list = [...s.list, { world: args[9] ?? null, mob: { x: args[1], z: args[2] } }]; },
    removeByWorld: (w) => { calls.push(['removeByWorld', w]); },
  };
  return { st, calls, deps, s };
}
/** the dice, loaded: each draw takes the next number, and a draw too many is an error */
function dice(...values: number[]) {
  const left = [...values];
  vi.spyOn(Math, 'random').mockImplementation(() => { if (!left.length) throw new Error('one Math.random too many'); return left.shift()!; });
  return left;
}
const fresh = (): SettlementRaidRun => ({ spawnTimer: 5, wasActive: false });

let wall: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  Object.assign(settlementRaidState, { active: false, destId: null, deadline: 0, plotHp: 120 });
  worldEnv.night = 0.9;
  vi.spyOn(performance, 'now').mockReturnValue(50_000);
  wall = vi.spyOn(Date, 'now').mockReturnValue(FOUNDED + 24 * 3_600_000); // a day after the founding
  dice();
});
afterEach(() => { vi.restoreAllMocks(); worldEnv.night = 0; });

describe('a raid on a settlement begins', () => {
  it('when the player stands at one he has founded, after dusk, sworn to a house, the cooldown past — and it is the OTHER house that comes', () => {
    const w = world();
    tickSettlementRaid(fresh(), w.st, 0.1, 50_000, w.deps);
    expect(settlementRaidState).toEqual({ active: true, destId: CAMP, deadline: 50_000 + 100_000, plotHp: 120 });
    expect(w.calls).toEqual([['notify', "Cedric the Bull's riders test your claim at The Siege Camp!", true]]);
    expect(wall).toHaveBeenCalledTimes(1);

    Object.assign(settlementRaidState, { active: false, destId: null });
    const bull = world({ allegiance: -100 });
    tickSettlementRaid(fresh(), bull.st, 0.1, 50_000, bull.deps);
    expect(bull.calls).toEqual([['notify', "King Leo's riders test your claim at The Siege Camp!", true]]);
  });

  it('not away from a settlement, not by day, not against the unsworn — and the wall clock is read for none of those', () => {
    for (const over of [{ destination: null }, { destination: 'template-09' }, { settlements: {} }, { allegiance: 10 }, { allegiance: -10 }, { allegiance: 0 }] as Partial<SettlementRaidTickStore>[]) {
      const w = world(over);
      tickSettlementRaid(fresh(), w.st, 0.1, 50_000, w.deps);
      expect(settlementRaidState.active).toBe(false);
      expect(w.calls).toEqual([]);
    }
    worldEnv.night = 0.62; // dusk must be PAST 0.62
    const w = world();
    tickSettlementRaid(fresh(), w.st, 0.1, 50_000, w.deps);
    expect(settlementRaidState.active).toBe(false);
    expect(wall).not.toHaveBeenCalled();
  });

  it('not within the cooldown, which runs from the last raid — or from the founding, if there has been none', () => {
    const cooldown = settlementRaidCooldownMs(100);
    expect(cooldown).toBe(6 * 60_000); // at the far end of the axis: the shortest
    expect(settlementRaidCooldownMs(11)).toBeCloseTo(15 * 60_000 - 9 * 60_000 / 90, 6); // barely sworn: nearly the longest

    wall.mockReturnValue(FOUNDED + cooldown - 1);
    let w = world();
    tickSettlementRaid(fresh(), w.st, 0.1, 50_000, w.deps);
    expect(settlementRaidState.active).toBe(false);
    wall.mockReturnValue(FOUNDED + cooldown);
    tickSettlementRaid(fresh(), w.st, 0.1, 50_000, w.deps);
    expect(settlementRaidState.active).toBe(true);

    Object.assign(settlementRaidState, { active: false, destId: null });
    w = world({ settlements: { [CAMP]: { since: FOUNDED, lastCollectedAt: FOUNDED, lastRaidAt: FOUNDED + 1_000_000 } } } as never);
    wall.mockReturnValue(FOUNDED + 1_000_000 + cooldown - 1);
    tickSettlementRaid(fresh(), w.st, 0.1, 50_000, w.deps);
    expect(settlementRaidState.active).toBe(false);
  });

  it('and brings its first wave 1.5 s after the frame FOLLOWING the one it began on', () => {
    const w = world();
    const run = fresh();
    tickSettlementRaid(run, w.st, 0.1, 50_000, w.deps); // begins: this frame still saw no raid
    expect(run).toEqual({ spawnTimer: 5, wasActive: false });
    tickSettlementRaid(run, w.st, 0.25, 50_100, w.deps);
    expect(run).toEqual({ spawnTimer: 1.25, wasActive: true });
    tickSettlementRaid(run, w.st, 0.25, 50_200, w.deps);
    expect(run.spawnTimer).toBe(1);
  });

  it('a countdown that starts afresh while a raid is on — the component mounted again — is taken for a raid just begun', () => {
    startSettlementRaid(CAMP);
    const w = world();
    const afresh = fresh();
    tickSettlementRaid(afresh, w.st, 0.1, 50_000, w.deps);
    expect(afresh.spawnTimer).toBeCloseTo(1.4, 12);
  });
});

describe('a raid under way', () => {
  const under = (over: Partial<SettlementRaidTickStore> = {}, list: WaveEnemy[] = []) => { startSettlementRaid(CAMP); return world(over, list); };
  const going = (): SettlementRaidRun => ({ spawnTimer: 9, wasActive: true });

  it('that names no ground simply stops', () => {
    const w = under();
    settlementRaidState.destId = null;
    tickSettlementRaid(going(), w.st, 0.1, 50_001, w.deps);
    expect(settlementRaidState.active).toBe(false);
    expect(w.calls).toEqual([]);
  });

  it('is lost when the player leaves — the ground cleared, and the plot counted as it stood', () => {
    const w = under({ destination: null });
    settlementRaidState.plotHp = 30;
    tickSettlementRaid(going(), w.st, 0.1, 50_001, w.deps);
    expect(settlementRaidState.active).toBe(false);
    expect(w.calls).toEqual([['removeByWorld', CAMP], ['resolve', CAMP, false, 0.25]]);
  });

  it('stops when the claim is gone, and DOES clear the ground; nothing is resolved', () => {
    const w = under({ claimedWorlds: {} });
    const run = going();
    tickSettlementRaid(run, w.st, 0.1, 50_001, w.deps);
    expect(settlementRaidState.active).toBe(false);
    expect(w.calls).toEqual([['removeByWorld', CAMP]]);
    expect(run.spawnTimer).toBe(9); // the wave was never reached
  });

  it('sends the other house\'s riders — bandits against the crown\'s man, knights against the Bull\'s — one every 5 s', () => {
    for (const [allegiance, kinds] of [[100, ['bandit', 'mountedRaider']], [-100, ['royal', 'mountedRaider']]] as const) {
      const w = under({ allegiance });
      const run: SettlementRaidRun = { spawnTimer: 0, wasActive: true };
      dice(0, 0.5);
      tickSettlementRaid(run, w.st, 0.1, 50_001, w.deps);
      dice(0.99, 0.5);
      run.spawnTimer = 0;
      tickSettlementRaid(run, w.st, 0.1, 50_002, w.deps);
      expect(w.calls.map((c) => c[1])).toEqual(kinds);
      expect(run.spawnTimer).toBe(5);
      expect(w.calls[0].slice(4)).toEqual([false, undefined, false, false, 1, false, CAMP]);
    }
  });

  it('keeps three to five of them on the ground, by how hard the standing is pressed', () => {
    for (const [allegiance, cap] of [[11, 3], [-55, 4], [100, 5]] as const) {
      const full = under({ allegiance }, Array.from({ length: cap }, () => at(50, 0)));
      dice();
      tickSettlementRaid({ spawnTimer: 0, wasActive: true }, full.st, 0.1, 50_001, full.deps);
      expect(full.calls).toEqual([]);
      const room = under({ allegiance }, Array.from({ length: cap - 1 }, () => at(50, 0)));
      dice(0, 0);
      tickSettlementRaid({ spawnTimer: 0, wasActive: true }, room.st, 0.1, 50_001, room.deps);
      expect(room.calls.map((c) => c[0])).toEqual(['spawn']);
    }
  });

  it('sends no one while the player stands unsworn again, though its countdown runs on', () => {
    const w = under({ allegiance: 0 });
    const run: SettlementRaidRun = { spawnTimer: 0, wasActive: true };
    tickSettlementRaid(run, w.st, 0.5, 50_001, w.deps);
    expect(w.calls).toEqual([]);
    expect(run.spawnTimer).toBe(-0.5);
    expect(settlementRaidState.active).toBe(true);
  });

  it('loses 6 a second for each rider within 9 m of the claim', () => {
    const w = under({}, [at(8.9, 0), at(0, -3), at(9.1, 0), at(0, 0, 'template-09')]);
    tickSettlementRaid(going(), w.st, 0.5, 50_001, w.deps);
    expect(settlementRaidState.plotHp).toBe(120 - 2 * 6 * 0.5);
  });

  it('is lost when the plot is down: the ground cleared, the loss resolved at nought, and only then the word', () => {
    const w = under({}, [at(0, 0)]);
    settlementRaidState.plotHp = 1;
    tickSettlementRaid(going(), w.st, 0.5, 50_001, w.deps);
    expect(settlementRaidState).toMatchObject({ active: false, plotHp: 0 });
    expect(w.calls).toEqual([
      ['removeByWorld', CAMP], ['resolve', CAMP, false, 0],
      ['notify', "The raid overwhelms the watch — The Siege Camp's next yield will be late."],
    ]);
  });

  it('is won at its deadline: the ground cleared and the win resolved by what is left of the plot — the store says the rest', () => {
    const w = under();
    settlementRaidState.plotHp = 90;
    tickSettlementRaid(going(), w.st, 0.1, settlementRaidState.deadline - 1, w.deps);
    expect(settlementRaidState.active).toBe(true);
    tickSettlementRaid(going(), w.st, 0.1, settlementRaidState.deadline, w.deps);
    expect(settlementRaidState.active).toBe(false);
    expect(w.calls).toEqual([['removeByWorld', CAMP], ['resolve', CAMP, true, 0.75]]);
  });
});
