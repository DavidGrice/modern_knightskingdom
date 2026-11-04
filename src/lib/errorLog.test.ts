import { beforeEach, describe, expect, it, vi } from 'vitest';

// localStorage stood in for by a map, there before the module reads it as it loads
const H = vi.hoisted(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return { store };
});
import { ERROR_LOG_SIZE, errorLog, installErrorLog, logError } from './errorLog';

beforeEach(() => {
  errorLog.length = 0;
  H.store.clear();
});

describe('the error log', () => {
  it('keeps the last 20 errors, newest last, in the page and in localStorage', () => {
    for (let i = 0; i < 25; i++) logError(new Error(`boom ${i}`), 'error');
    expect(ERROR_LOG_SIZE).toBe(20);
    expect(errorLog).toHaveLength(20);
    expect(errorLog[0].message).toBe('Error: boom 5');
    expect(errorLog[19].message).toBe('Error: boom 24');
    const kept = JSON.parse(H.store.get('kk_errors')!);
    expect(kept).toHaveLength(20);
    expect(kept[19].message).toBe('Error: boom 24');
  });

  it('keeps the stack, with the component stack a boundary adds', () => {
    const e = new Error('panel broke');
    logError(e, 'panel', '\n    at InventoryPanel');
    expect(errorLog[0]).toMatchObject({ kind: 'panel', message: 'Error: panel broke', count: 1 });
    expect(errorLog[0].stack).toContain('panel broke');
    expect(errorLog[0].stack).toContain('at InventoryPanel');
  });

  it('counts the same error met back to back on one entry', () => {
    const e = new Error('every frame');
    for (let i = 0; i < 60; i++) logError(e, 'error');
    logError(new Error('another'), 'error');
    logError(e, 'error');
    expect(errorLog.map((x) => [x.message, x.count])).toEqual([
      ['Error: every frame', 60], ['Error: another', 1], ['Error: every frame', 1],
    ]);
  });

  it('takes what reaches the window: an uncaught error and an unhandled rejection', () => {
    const win = new EventTarget();
    vi.stubGlobal('window', win);
    installErrorLog();
    win.dispatchEvent(Object.assign(new Event('error'), { error: new Error('in a frame'), message: 'Uncaught Error: in a frame' }));
    win.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: 'no answer' }));
    expect(errorLog.map((x) => [x.kind, x.message])).toEqual([['error', 'Error: in a frame'], ['rejection', 'no answer']]);
    vi.unstubAllGlobals();
  });
});
