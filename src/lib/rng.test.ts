import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashId, mulberry32, pick, pickWith, randInt } from './rng';

describe('mulberry32', () => {
  // Pinned outputs. World and dungeon generation are seeded from this stream (the homestead uses seed 20260713),
  // so ANY change here silently moves every tree, rock and crypt room — this test is the tripwire.
  it('produces the pinned sequence for the world seed', () => {
    const r = mulberry32(20260713);
    expect([r(), r(), r(), r(), r()]).toEqual([
      0.3828057593200356, 0.14615820185281336, 0.8997327252291143, 0.8929723014589399, 0.5561047452501953,
    ]);
  });

  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 10_000; i++) {
      const x = a();
      expect(b()).toBe(x);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('pickWith consumes exactly one draw per call', () => {
    const items = ['a', 'b', 'c', 'd'] as const;
    const stream = mulberry32(99);
    const mirror = mulberry32(99);
    for (let i = 0; i < 50; i++) {
      expect(pickWith(stream, items)).toBe(items[Math.floor(mirror() * items.length)]);
    }
  });
});

describe('hashId', () => {
  it('is the pinned 31-multiplier string hash every derived villager trait keys off', () => {
    expect(hashId('')).toBe(0);
    expect(hashId('v1')).toBe(3707);
    expect(hashId('Ada')).toBe(65662);
    expect(hashId('villager-42')).toBe(4096454757);
  });
});

describe('pick / randInt', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('map Math.random() onto the full range, both ends inclusive for randInt', () => {
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValue(0);
    expect(pick(['x', 'y', 'z'])).toBe('x');
    expect(randInt(3, 5)).toBe(3);
    spy.mockReturnValue(0.9999999);
    expect(pick(['x', 'y', 'z'])).toBe('z');
    expect(randInt(3, 5)).toBe(5);
  });

  it('call Math.random() exactly once (smoke scripts that stub it depend on that)', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    pick([1, 2, 3]);
    randInt(1, 6);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
