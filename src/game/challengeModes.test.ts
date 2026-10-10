import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defendChallengeState, gatherChallengeState, joustChallengeState, joustRingOffsets,
  startDefendChallenge, startGatherChallenge, startJoustChallenge,
  tickDefend, tickGather, tickJoust, type ChallengeDeps, type DefendRun,
} from './challengeModes';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';
import type { WaveEnemy } from './waveDefense';

const GATHER = 'challenge-2', DEFEND = 'challenge-3', JOUST = 'challenge-4';
type Snapshot = Parameters<typeof tickDefend>[1] & Parameters<typeof tickJoust>[0];

/** the frame's store snapshot and everything else the ticks are handed, stood in for: all they say, pay, play, walk
 *  in and sweep away goes to one record, in the order it happened */
function world(over: Partial<Snapshot> = {}, list: WaveEnemy[] = []) {
  const calls: unknown[][] = [];
  const st = {
    destination: null, claimedWorlds: {},
    notify: (text: unknown, big: unknown) => { calls.push(big === undefined ? ['notify', text] : ['notify', text, big]); },
    addItems: (items: unknown, why: unknown) => { calls.push(['addItems', items, why]); },
    addXp: (skill: unknown, n: unknown) => { calls.push(['addXp', skill, n]); },
    ...over,
  } as unknown as Snapshot;
  const s = { list };
  const player = { x: 9999, z: 9999 };
  const deps: ChallengeDeps = {
    enemies: () => s.list,
    spawn: (...args) => { calls.push(['spawn', ...args]); s.list = [...s.list, { world: args[9] ?? null, mob: { x: args[1], z: args[2] } }]; },
    removeByWorld: (w) => { calls.push(['removeByWorld', w]); },
    player,
    play: (name, volume) => { calls.push(['play', name, volume]); },
  };
  return { st, calls, deps, player, s };
}
/** the dice, loaded: each draw takes the next number, and a draw too many is an error */
function dice(...values: number[]) {
  const left = [...values];
  vi.spyOn(Math, 'random').mockImplementation(() => { if (!left.length) throw new Error('one Math.random too many'); return left.shift()!; });
  return left;
}

beforeEach(() => {
  vi.spyOn(performance, 'now').mockReturnValue(1000);
  Object.assign(gatherChallengeState, { active: false, destId: null, deadline: 0, points: [] });
  Object.assign(defendChallengeState, { active: false, destId: null, deadline: 0, plotHp: 100 });
  Object.assign(joustChallengeState, { active: false, destId: null, deadline: 0, ringIndex: 0, ringActivatedAt: 0, hits: 0, precisionSum: 0 });
  dice();
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the Gather Race', () => {
  it('does nothing when no race is on', () => {
    const w = world({ destination: GATHER });
    tickGather(w.st, 5000, w.deps);
    expect(w.calls).toEqual([]);
  });

  it('ends without a word when the player has left the ground', () => {
    startGatherChallenge(GATHER);
    const w = world({ destination: 'template-04' });
    tickGather(w.st, 1001, w.deps);
    expect(gatherChallengeState.active).toBe(false);
    expect(w.calls).toEqual([]);
  });

  it('picks up a marker the player comes within 2.5 m of, with a chime — and not one further off', () => {
    startGatherChallenge(GATHER);
    const g = gatherChallengeState;
    const w = world({ destination: GATHER });
    w.player.x = g.points[2].x + 2.6; w.player.z = g.points[2].z;
    tickGather(w.st, 1001, w.deps);
    expect(g.points.map((p) => p.collected)).toEqual([false, false, false, false, false, false]);
    w.player.x = g.points[2].x + 2.4;
    tickGather(w.st, 1002, w.deps);
    expect(g.points.map((p) => p.collected)).toEqual([false, false, true, false, false, false]);
    expect(w.calls).toEqual([['play', 'treasure', 0.7]]);
    expect(g.active).toBe(true);
  });

  it('is won on the frame AFTER the last marker is picked up', () => {
    startGatherChallenge(GATHER);
    const g = gatherChallengeState;
    g.points.slice(1).forEach((p) => { p.collected = true; });
    const w = world({ destination: GATHER });
    w.player.x = g.points[0].x; w.player.z = g.points[0].z;
    tickGather(w.st, 1001, w.deps);
    expect(g.active).toBe(true);
    expect(w.calls).toEqual([['play', 'treasure', 0.7]]);
    tickGather(w.st, 1002, w.deps);
    expect(g.active).toBe(false);
    expect(w.calls.slice(1)).toEqual([
      ['addItems', { gold: 25, herb: 4 }, 'grant'],
      ['notify', 'Gather race complete! A forager’s haul awaits.', true],
    ]);
  });

  it('tests the clock first: at the deadline it ends with the count, and a marker underfoot is not picked up', () => {
    startGatherChallenge(GATHER);
    const g = gatherChallengeState;
    g.points[0].collected = true; g.points[1].collected = true;
    const w = world({ destination: GATHER });
    w.player.x = g.points[4].x; w.player.z = g.points[4].z;
    tickGather(w.st, g.deadline - 1, world({ destination: GATHER }).deps); // not yet: and nobody near a marker
    expect(g.active).toBe(true);
    tickGather(w.st, g.deadline, w.deps);
    expect(g.active).toBe(false);
    expect(g.points[4].collected).toBe(false);
    expect(w.calls).toEqual([['notify', "Time's up! You gathered 2/6 — try again whenever you're ready."]]);
  });
});

describe('Defend the Plot', () => {
  const claim = { x: WORLD_DESTINATION_BY_ID[DEFEND].origin.x + 2, z: WORLD_DESTINATION_BY_ID[DEFEND].origin.z + 2, groundY: 0 };
  const holding = (list: WaveEnemy[] = []) => world({ destination: DEFEND, claimedWorlds: { [DEFEND]: claim } } as never, list);
  const at = (dx: number, dz: number): WaveEnemy => ({ world: DEFEND, mob: { x: claim.x + dx, z: claim.z + dz } });

  it('sets a run just begun to bring its first wave in 1.5 s, once', () => {
    startDefendChallenge(DEFEND);
    const w = holding();
    const run: DefendRun = { spawnTimer: 4, wasActive: false };
    tickDefend(run, w.st, 0.25, 1001, w.deps);
    expect(run).toEqual({ spawnTimer: 1.25, wasActive: true });
    tickDefend(run, w.st, 0.25, 1002, w.deps);
    expect(run.spawnTimer).toBe(1);
  });

  it('takes a countdown that starts afresh while the run is on — the component mounted again — for a run just begun', () => {
    startDefendChallenge(DEFEND);
    const w = holding();
    tickDefend({ spawnTimer: 0.2, wasActive: true }, w.st, 0.1, 1001, w.deps);
    const afresh: DefendRun = { spawnTimer: 4, wasActive: false };
    tickDefend(afresh, w.st, 0.1, 1002, w.deps);
    expect(afresh.spawnTimer).toBeCloseTo(1.4, 12);
  });

  it('remembers what the run was BEFORE the frame\'s rules: one ended and begun again between two frames keeps its countdown', () => {
    startDefendChallenge(DEFEND);
    const w = world({ destination: 'template-04' }); // he has left: this frame ends the run
    const run: DefendRun = { spawnTimer: 3, wasActive: true };
    tickDefend(run, w.st, 0.1, 1001, w.deps);
    expect(defendChallengeState.active).toBe(false);
    expect(run.wasActive).toBe(true);
    startDefendChallenge(DEFEND);
    const back = holding();
    tickDefend(run, back.st, 0.5, 1002, back.deps);
    expect(run.spawnTimer).toBeCloseTo(2.5, 12); // no edge seen, so not 1.5
  });

  it('ends without a word when the player leaves the ground, and clears the ground of its hostiles', () => {
    startDefendChallenge(DEFEND);
    const w = world({ destination: null, claimedWorlds: { [DEFEND]: claim } } as never);
    tickDefend({ spawnTimer: 4, wasActive: true }, w.st, 0.1, 1001, w.deps);
    expect(defendChallengeState.active).toBe(false);
    expect(w.calls).toEqual([['removeByWorld', DEFEND]]);
  });

  it('just stops when the claim is gone: the ground is NOT cleared, and nothing is said', () => {
    startDefendChallenge(DEFEND);
    const w = world({ destination: DEFEND });
    const run: DefendRun = { spawnTimer: 0, wasActive: true };
    tickDefend(run, w.st, 0.1, 1001, w.deps);
    expect(defendChallengeState.active).toBe(false);
    expect(w.calls).toEqual([]);
    expect(run.spawnTimer).toBe(0); // the wave was never reached
  });

  it('does nothing at all to a run that names no ground', () => {
    Object.assign(defendChallengeState, { active: true, destId: null, deadline: 0, plotHp: 0 });
    const w = holding();
    tickDefend({ spawnTimer: 0, wasActive: true }, w.st, 0.1, 99_999, w.deps);
    expect(defendChallengeState).toEqual({ active: true, destId: null, deadline: 0, plotHp: 0 });
    expect(w.calls).toEqual([]);
  });

  it('sends skeletons and bandits, four at most, one every 4 s, and loses 5 a second for each within 7 m', () => {
    startDefendChallenge(DEFEND);
    const w = holding([at(1, 0), at(6.9, 0), at(7.1, 0)]);
    const run: DefendRun = { spawnTimer: 0, wasActive: true };
    dice(0.6, 0.5);
    tickDefend(run, w.st, 0.5, 1001, w.deps);
    expect(w.calls.map((c) => [c[0], c[1]])).toEqual([['spawn', 'bandit']]);
    expect(run.spawnTimer).toBe(4);
    expect(defendChallengeState.plotHp).toBe(100 - 2 * 5 * 0.5);
    run.spawnTimer = 0;
    dice(); // four on the ground now: no fifth
    tickDefend(run, w.st, 0.1, 1002, w.deps);
    expect(w.calls).toHaveLength(1);
  });

  it('is lost when the plot is down: nought, over, the ground cleared, and then the word', () => {
    startDefendChallenge(DEFEND);
    defendChallengeState.plotHp = 1;
    const w = holding([at(0, 0)]);
    tickDefend({ spawnTimer: 9, wasActive: true }, w.st, 0.5, 1001, w.deps);
    expect(defendChallengeState).toMatchObject({ active: false, plotHp: 0 });
    expect(w.calls).toEqual([['removeByWorld', DEFEND], ['notify', 'The banner falls — the plot could not be held.']]);
  });

  it('is won at the deadline: the ground cleared, gold and experience by what is left of the plot — paid even when that is nothing', () => {
    startDefendChallenge(DEFEND);
    defendChallengeState.plotHp = 55;
    let w = holding();
    tickDefend({ spawnTimer: 9, wasActive: true }, w.st, 0.1, defendChallengeState.deadline, w.deps);
    expect(defendChallengeState.active).toBe(false);
    expect(w.calls).toEqual([
      ['removeByWorld', DEFEND], ['addItems', { gold: 17 }, 'grant'], ['addXp', 'combat', 28],
      ['notify', 'The banner holds! +17 gold for your defense.', true],
    ]);
    startDefendChallenge(DEFEND);
    defendChallengeState.plotHp = 0.5;
    w = holding();
    tickDefend({ spawnTimer: 9, wasActive: true }, w.st, 0.1, defendChallengeState.deadline, w.deps);
    expect(w.calls).toEqual([
      ['removeByWorld', DEFEND], ['addItems', { gold: 0 }, 'grant'], ['addXp', 'combat', 0],
      ['notify', 'The banner holds! +0 gold for your defense.', true],
    ]);
  });
});

describe('the Joust Gauntlet', () => {
  const riding = () => world({ destination: JOUST });
  const onRing = (w: ReturnType<typeof world>, i: number, off = 0) => { const ring = joustRingOffsets(JOUST)[i]; w.player.x = ring.x + off; w.player.z = ring.z; };

  it('ends without a word when the player has left the ground', () => {
    startJoustChallenge(JOUST);
    const w = world({ destination: null });
    tickJoust(w.st, 1001, w.deps);
    expect(joustChallengeState.active).toBe(false);
    expect(w.calls).toEqual([]);
  });

  it('scores a ring struck by how soon it was struck, with a thud, and lights the next from that moment', () => {
    startJoustChallenge(JOUST); // the first ring is hot from 1000
    const w = riding();
    onRing(w, 0, 2.3);
    tickJoust(w.st, 1100, w.deps); // outside the ring's 2.2 m: not struck
    expect(joustChallengeState.hits).toBe(0);
    onRing(w, 0, 2.1);
    tickJoust(w.st, 1300, w.deps);
    expect(joustChallengeState).toMatchObject({ hits: 1, precisionSum: 0.75, ringIndex: 1, ringActivatedAt: 1300, active: true });
    expect(w.calls).toEqual([['play', 'thud', 0.7]]);
  });

  it('passes a ring not struck within 1.2 s, at nought', () => {
    startJoustChallenge(JOUST);
    const w = riding();
    tickJoust(w.st, 2199, w.deps);
    expect(joustChallengeState.ringIndex).toBe(0);
    tickJoust(w.st, 2200, w.deps);
    expect(joustChallengeState).toMatchObject({ hits: 0, precisionSum: 0, ringIndex: 1, ringActivatedAt: 2200 });
    expect(w.calls).toEqual([]);
  });

  it('is over with the fifth ring: gold and experience by the average over all five, rings never reached counting as nought', () => {
    startJoustChallenge(JOUST);
    Object.assign(joustChallengeState, { ringIndex: 4, hits: 2, precisionSum: 1.25, ringActivatedAt: 1000 });
    const w = riding();
    onRing(w, 4);
    tickJoust(w.st, 1300, w.deps); // 0.75 more: 2.0 over five rings is 0.4
    expect(joustChallengeState.active).toBe(false);
    expect(w.calls).toEqual([
      ['play', 'thud', 0.7], ['addItems', { gold: 24 }, 'grant'], ['addXp', 'combat', 28],
      ['notify', 'Gauntlet complete! 3/5 rings struck — +24 gold.', true],
    ]);
  });

  it('is over at its deadline too, and pays nothing — but says so — when nothing was struck', () => {
    startJoustChallenge(JOUST);
    const w = riding();
    onRing(w, 0); // on the hot ring, and too late: the clock is tested first
    tickJoust(w.st, joustChallengeState.deadline, w.deps);
    expect(joustChallengeState).toMatchObject({ active: false, hits: 0 });
    expect(w.calls).toEqual([['notify', 'Gauntlet complete! 0/5 rings struck — +0 gold.', true]]);
  });
});
