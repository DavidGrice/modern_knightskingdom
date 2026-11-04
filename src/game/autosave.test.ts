import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOSAVE_MS, RETRY_FIRST_MS, RETRY_MAX_MS, UNMADE, autosaveDelay, flushOnLeave, resetAutosave, saveAndLeave, startAutosave,
} from './autosave';
import { runSessionResetHooks } from './store/sessionHooks';
import type { SaveOutcome } from '@/lib/save';

const OK: SaveOutcome = { ok: true };
const DOWN: SaveOutcome = { ok: false, problem: 'the server answered 500' };

beforeEach(() => {
  vi.useFakeTimers();
  resetAutosave();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the autosave (F-08a)', () => {
  it('backs off while saves keep failing, doubling up to a cap', () => {
    expect(autosaveDelay(0)).toBe(AUTOSAVE_MS);
    expect([1, 2, 3, 4, 5, 6, 7, 20].map(autosaveDelay)).toEqual([5_000, 10_000, 20_000, 40_000, 80_000, 160_000, 160_000, 160_000]);
    expect(autosaveDelay(1)).toBe(RETRY_FIRST_MS);
    expect(autosaveDelay(50)).toBe(RETRY_MAX_MS);
  });

  it('shows the problem, tries again on the backoff, and clears it once a save goes through', async () => {
    let answer: SaveOutcome = DOWN;
    const tries: number[] = [];
    const problems: (string | null)[] = [];
    const save = vi.fn(async () => {
      tries.push(Date.now());
      return answer;
    });
    const start = Date.now();
    startAutosave(save, (p) => problems.push(p));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + 5_000 + 10_000 + 20_000);
    expect(tries.map((t) => t - start)).toEqual([20_000, 25_000, 35_000, 55_000]);
    expect(problems).toEqual(['the server answered 500']); // told once, not at every failure
    answer = OK;
    await vi.advanceTimersByTimeAsync(40_000);
    expect(problems).toEqual(['the server answered 500', null]);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    expect(tries.map((t) => t - start)).toEqual([20_000, 25_000, 35_000, 55_000, 95_000, 115_000]);
  });

  it('never stacks timers: a try still waiting on the server holds back the next', async () => {
    let finish: (r: SaveOutcome) => void = () => {};
    const save = vi.fn(() => new Promise<SaveOutcome | null>((res) => (finish = res)));
    startAutosave(save, () => {});
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    expect(save).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10 * AUTOSAVE_MS); // a server that hangs for minutes
    expect(save).toHaveBeenCalledTimes(1);
    finish(DOWN);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('nothing to save is neither a failure nor a success', async () => {
    const problems: (string | null)[] = [];
    const save = vi.fn(async () => null);
    startAutosave(save, (p) => problems.push(p));
    await vi.advanceTimersByTimeAsync(3 * AUTOSAVE_MS);
    expect(save).toHaveBeenCalledTimes(3);
    expect(problems).toEqual([]);
  });

  it('stops for good, even with a try in flight (F-06: a failed world never writes over the last good save)', async () => {
    let finish: (r: SaveOutcome) => void = () => {};
    const save = vi.fn(() => new Promise<SaveOutcome | null>((res) => (finish = res)));
    const a = startAutosave(save, () => {});
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
    a.stop();
    finish(DOWN);
    await vi.advanceTimersByTimeAsync(10 * RETRY_MAX_MS);
    expect(save).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    const b = startAutosave(save, () => {});
    b.stop();
    await vi.advanceTimersByTimeAsync(10 * RETRY_MAX_MS);
    expect(save).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the autosave past the game screen (F-08b)', () => {
  it('keeps the chip and the backoff when the game screen comes back (Options, Help), and forgets both at a session start', async () => {
    const save = vi.fn(async () => DOWN);
    const before: (string | null)[] = [];
    const a = startAutosave(save, (p) => before.push(p));
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS + RETRY_FIRST_MS);
    expect(save).toHaveBeenCalledTimes(2);
    a.stop(); // the pause menu's Options replaces the game screen

    const after: (string | null)[] = [];
    const start = Date.now();
    const b = startAutosave(save, (p) => after.push(p));
    expect(after).toEqual(['the server answered 500']); // the chip is back at once
    await vi.advanceTimersByTimeAsync(2 * RETRY_FIRST_MS);
    expect(save).toHaveBeenCalledTimes(3); // two failures in: the next try 10 s on, not a full 20
    expect(Date.now() - start).toBe(2 * RETRY_FIRST_MS);
    b.stop();

    runSessionResetHooks(); // a load, a new game
    const fresh: (string | null)[] = [];
    startAutosave(save, (p) => fresh.push(p)).stop();
    expect(fresh).toEqual([]);
  });
});

describe('the tab-close flush (F-08b)', () => {
  function page() {
    const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
    const win = new EventTarget();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', win);
    const show = (state: 'visible' | 'hidden') => {
      doc.visibilityState = state;
      doc.dispatchEvent(new Event('visibilitychange'));
    };
    return { show, close: () => win.dispatchEvent(new Event('pagehide')) };
  }

  it('flushes as the tab goes out of sight, or as the page goes, once — and not after it stops', () => {
    const p = page();
    const flush = vi.fn();
    const stop = flushOnLeave(flush);
    p.close(); // a reload, from a page in sight
    expect(flush).toHaveBeenCalledTimes(1);
    p.show('hidden'); // another tab, the app switcher
    expect(flush).toHaveBeenCalledTimes(2);
    p.close(); // closed from there: flushed already
    expect(flush).toHaveBeenCalledTimes(2);
    p.show('visible');
    expect(flush).toHaveBeenCalledTimes(2);
    p.close();
    expect(flush).toHaveBeenCalledTimes(3);
    stop();
    p.show('hidden');
    p.close();
    expect(flush).toHaveBeenCalledTimes(3);
  });
});

describe('Save & Quit (F-08a)', () => {
  it('leaves only once the save is written, and otherwise says why', async () => {
    const leave = vi.fn();
    expect(await saveAndLeave(async () => DOWN, leave)).toBe('the server answered 500');
    expect(leave).not.toHaveBeenCalled();
    expect(await saveAndLeave(async () => OK, leave)).toBeNull();
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('a save that cannot be put together is a failed save with its own reason, not a hang (F-08b)', async () => {
    const leave = vi.fn();
    expect(await saveAndLeave(() => {
      throw new Error('toSave threw');
    }, leave)).toBe(UNMADE);
    expect(await saveAndLeave(async () => {
      throw new TypeError('Do not know how to serialize a BigInt');
    }, leave)).toBe(UNMADE);
    expect(leave).not.toHaveBeenCalled();
  });
});
