import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/save', () => ({
  flushSave: vi.fn(() => ({ kept: true, beacon: false })),
  writeRecoverySave: vi.fn(),
}));

import { flushSave, writeRecoverySave } from '@/lib/save';
import { writeRecovery } from '@/lib/recovery';
import { startSessionFlush, stopSessionFlush } from './sessionFlush';
import { useAppStore } from './store/appStore';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig } from './types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };

function page() {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const win = new EventTarget();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  return { close: () => win.dispatchEvent(new Event('pagehide')) };
}

beforeEach(() => {
  vi.mocked(flushSave).mockClear();
  vi.mocked(writeRecoverySave).mockClear();
  useGameStore.getState().newGame(HERO);
  useAppStore.setState({ screens: ['menu', 'game'], guest: true });
});
afterEach(() => {
  stopSessionFlush();
  vi.unstubAllGlobals();
});

describe('the tab-close flush and the recovery writer, for the session (F-08b)', () => {
  it('outlast a screen pushed over the game (Options, Stats, Help), and end as the game leaves the stack', () => {
    const p = page();
    startSessionFlush();
    useAppStore.getState().push('options'); // the game screen unmounts
    p.close();
    expect(flushSave).toHaveBeenCalledTimes(1);
    writeRecovery();
    expect(writeRecoverySave).toHaveBeenCalledTimes(1);

    useAppStore.getState().pop();
    startSessionFlush(); // the game screen mounts again: still the one flush
    p.close();
    expect(flushSave).toHaveBeenCalledTimes(2);

    useAppStore.getState().resetTo('menu'); // Save & Quit, or Quit without saving
    p.close();
    writeRecovery();
    expect(flushSave).toHaveBeenCalledTimes(2);
    expect(writeRecoverySave).toHaveBeenCalledTimes(1);
  });

  it('end when the world fails', () => {
    const p = page();
    startSessionFlush();
    stopSessionFlush();
    p.close();
    expect(flushSave).not.toHaveBeenCalled();
  });
});
