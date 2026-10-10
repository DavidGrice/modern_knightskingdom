import { afterEach, describe, expect, it, vi } from 'vitest';
import { tickWaveDefense, type EnemyDeps, type WaveDefenseParams, type WaveEnemy } from './waveDefense';
import { WORLD_DESTINATION_BY_ID } from './data/worlds';

const GROUND = 'challenge-3';
const dest = WORLD_DESTINATION_BY_ID[GROUND];
const RING = dest.radius * 0.85;
const claim = { x: dest.origin.x + 3, z: dest.origin.z - 2 };
const foe = (dx: number, dz: number, world: string | null = GROUND): WaveEnemy => ({ world, mob: { x: claim.x + dx, z: claim.z + dz } });
const RULES: WaveDefenseParams = { kinds: ['skeleton', 'bandit'], maxLive: 4, intervalS: 4, drainPerSec: 5, proximityRadius: 7 };

/** the enemy store, stood in for: `list` is what `enemies()` hands out, and a spawn REPLACES it, as the store does */
function store(list: WaveEnemy[] = []) {
  const s = { list, calls: [] as unknown[][], snapshots: 0 };
  const deps: EnemyDeps = {
    enemies: () => { s.snapshots++; return s.list; },
    spawn: (...args) => { s.calls.push(['spawn', ...args]); s.list = [...s.list, { world: args[9] ?? null, mob: { x: args[1], z: args[2] } }]; },
    removeByWorld: (world) => { s.calls.push(['removeByWorld', world]); },
  };
  return { s, deps };
}
/** the dice, loaded: each draw takes the next number, and a draw too many is an error */
function dice(...values: number[]) {
  const left = [...values];
  vi.spyOn(Math, 'random').mockImplementation(() => { if (!left.length) throw new Error('one Math.random too many'); return left.shift()!; });
  return left;
}
const plot = (plotHp = 100, deadline = 1000) => ({ plotHp, deadline });

afterEach(() => { vi.restoreAllMocks(); });

describe('holding a plot — the wave', () => {
  it('runs its countdown down by the whole frame, and walks no one in before it is out', () => {
    const { s, deps } = store();
    const run = { spawnTimer: 1.5 };
    dice();
    expect(tickWaveDefense(run, plot(), GROUND, claim, 0.4, 0, RULES, deps)).toBe('running');
    expect(run.spawnTimer).toBeCloseTo(1.1, 12);
    expect(tickWaveDefense(run, plot(), GROUND, claim, 1.0, 0, RULES, deps)).toBe('running');
    expect(run.spawnTimer).toBeCloseTo(0.1, 12);
    expect(s.calls).toEqual([]);
    // a long frame is taken whole: there is no clamp
    const slow = { spawnTimer: 9 };
    tickWaveDefense(slow, plot(), GROUND, claim, 2.5, 0, RULES, deps);
    expect(slow.spawnTimer).toBeCloseTo(6.5, 12);
  });

  it('when it is out, walks ONE in — the kind drawn first, then the angle — on the ring at 0.85 of the ground, and is set to the interval', () => {
    const { s, deps } = store();
    const run = { spawnTimer: 0.1 };
    const left = dice(0.99, 0.25); // the second kind of two; a quarter turn
    tickWaveDefense(run, plot(), GROUND, claim, 0.3, 0, RULES, deps);
    expect(left).toEqual([]);
    expect(run.spawnTimer).toBe(4); // assigned, nothing carried over
    expect(s.calls).toHaveLength(1);
    const [name, kind, x, z, ...rest] = s.calls[0] as [string, string, number, number, ...unknown[]];
    expect([name, kind]).toEqual(['spawn', 'bandit']);
    expect(x).toBeCloseTo(dest.origin.x + RING, 9);
    expect(z).toBeCloseTo(dest.origin.z, 9);
    // the enemy store's own argument list, place for place: not a raider, no room, not approaching, no last stand,
    // full size, not the arena's, and this ground's own
    expect(rest).toEqual([false, undefined, false, false, 1, false, GROUND]);
  });

  it('holds the wave back while the ground is full — the countdown still falling — and sends it the first frame there is room', () => {
    const full = [foe(50, 0), foe(60, 0), foe(70, 0), foe(80, 0)];
    const { s, deps } = store(full);
    const run = { spawnTimer: 0.2 };
    dice();
    tickWaveDefense(run, plot(), GROUND, claim, 0.5, 0, RULES, deps);
    tickWaveDefense(run, plot(), GROUND, claim, 0.5, 0, RULES, deps);
    expect(s.calls).toEqual([]);
    expect(run.spawnTimer).toBeCloseTo(-0.8, 12);
    s.list = full.slice(1); // one of them falls
    dice(0, 0);
    tickWaveDefense(run, plot(), GROUND, claim, 0.01, 0, RULES, deps);
    expect(s.calls.map((c) => c[0])).toEqual(['spawn']);
    expect(run.spawnTimer).toBe(4);
  });

  it('counts only this ground\'s hostiles against the cap', () => {
    const { s, deps } = store([foe(50, 0, 'template-04'), foe(60, 0, null), foe(70, 0, 'arena'), foe(80, 0, 'challenge-6'), foe(90, 0)]);
    dice(0, 0);
    tickWaveDefense({ spawnTimer: 0 }, plot(), GROUND, claim, 0.1, 0, RULES, deps);
    expect(s.calls.map((c) => c[0])).toEqual(['spawn']);
  });

  it('with no kinds to draw from, walks no one in though the countdown is long out', () => {
    const { s, deps } = store();
    const run = { spawnTimer: -3 };
    dice();
    tickWaveDefense(run, plot(), GROUND, claim, 0.5, 0, { ...RULES, kinds: null }, deps);
    expect(s.calls).toEqual([]);
    expect(run.spawnTimer).toBeCloseTo(-3.5, 12);
  });
});

describe('holding a plot — the drain', () => {
  it('chips the plot once for every hostile of this ground within reach, by the whole frame', () => {
    const { deps } = store([foe(1, 1), foe(-6.9, 0), foe(7, 0), foe(0, 30), foe(0.5, 0.5, 'challenge-6'), foe(0, 0, null)]);
    const rec = plot(100);
    dice();
    tickWaveDefense({ spawnTimer: 9 }, rec, GROUND, claim, 0.5, 0, RULES, deps);
    expect(rec.plotHp).toBeCloseTo(100 - 2 * 5 * 0.5, 12); // two within 7 m; the one AT 7 m is not
  });

  it('takes one look at the enemies a frame, before the wave: a hostile walked in this frame does not chip the plot on it', () => {
    const { s, deps } = store();
    // the claim planted on the ring, just where a quarter-turn spawn lands
    const onRing = { x: dest.origin.x + RING, z: dest.origin.z };
    const rec = plot(100);
    dice(0, 0.25);
    tickWaveDefense({ spawnTimer: 0 }, rec, GROUND, onRing, 1, 0, RULES, deps);
    expect(s.calls.map((c) => c[0])).toEqual(['spawn']);
    expect(s.snapshots).toBe(1);
    expect(rec.plotHp).toBe(100);
    dice();
    tickWaveDefense({ spawnTimer: 9 }, rec, GROUND, onRing, 1, 0, RULES, deps);
    expect(rec.plotHp).toBe(95); // he is in the next frame's look
  });
});

describe('holding a plot — the verdict', () => {
  it('is "running" while the plot stands and the clock has not run out, and "won" from the deadline on', () => {
    const { deps } = store();
    dice();
    expect(tickWaveDefense({ spawnTimer: 9 }, plot(40, 1000), GROUND, claim, 0.1, 999.9, RULES, deps)).toBe('running');
    expect(tickWaveDefense({ spawnTimer: 9 }, plot(40, 1000), GROUND, claim, 0.1, 1000, RULES, deps)).toBe('won');
    expect(tickWaveDefense({ spawnTimer: 9 }, plot(0.001, 1000), GROUND, claim, 0.1, 5000, RULES, deps)).toBe('won');
  });

  it('is "lost" when the plot is down — tested before the deadline, so a plot that falls on the last frame is lost', () => {
    const { s, deps } = store([foe(0, 0)]);
    const rec = plot(1, 1000);
    dice();
    expect(tickWaveDefense({ spawnTimer: 9 }, rec, GROUND, claim, 0.5, 2000, RULES, deps)).toBe('lost');
    expect(rec.plotHp).toBeCloseTo(-1.5, 12); // the verdict only: setting it to nought is the caller's to do
    expect(s.calls).toEqual([]); // and so is clearing the ground
    // nought itself is down — with no one near, so that nothing takes it below
    expect(tickWaveDefense({ spawnTimer: 9 }, plot(0, 1000), GROUND, claim, 0.1, 0, RULES, store().deps)).toBe('lost');
  });
});
