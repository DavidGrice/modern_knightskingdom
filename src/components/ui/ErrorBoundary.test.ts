import { beforeEach, describe, expect, it, vi } from 'vitest';

// localStorage stood in for by a map, to see every key anything writes
const H = vi.hoisted(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return { store };
});
import ErrorBoundary from './ErrorBoundary';
import { errorLog } from '@/lib/errorLog';
import { setRecoveryWriter } from '@/lib/recovery';

beforeEach(() => {
  errorLog.length = 0;
  H.store.clear();
  H.store.set('kk_guest_save', '{"the":"main save"}');
});

// the boundary driven the way React drives it: render, the error turned into state, then the catch
function crash(props: Partial<ConstructorParameters<typeof ErrorBoundary>[0]> = {}) {
  const b = new ErrorBoundary({ name: 'scene', fallback: 'the card', children: 'the world', ...props });
  const before = b.render();
  b.state = { ...b.state, ...ErrorBoundary.getDerivedStateFromError() };
  b.componentDidCatch(new Error('a frame threw'), { componentStack: '\n    at GameWorld' });
  return { before, after: b.render() };
}

describe('the error boundary', () => {
  it('shows its children, then its fallback once one has thrown', () => {
    const { before, after } = crash();
    expect(before).toBe('the world');
    expect(after).toBe('the card');
  });

  it('logs the error with its stack and the component stack, under its own name', () => {
    crash({ name: 'panel' });
    expect(errorLog).toHaveLength(1);
    expect(errorLog[0]).toMatchObject({ kind: 'panel', message: 'Error: a frame threw' });
    expect(errorLog[0].stack).toContain('at GameWorld');
  });

  it('calls the recovery writer and then its own onError, and never touches the main save', () => {
    const calls: string[] = [];
    setRecoveryWriter(() => calls.push('recovery'));
    crash({ onError: () => calls.push('onError') });
    expect(calls).toEqual(['recovery', 'onError']);
    expect(H.store.get('kk_guest_save')).toBe('{"the":"main save"}');
    expect([...H.store.keys()].sort()).toEqual(['kk_errors', 'kk_guest_save']);
  });

  it('passes over a recovery writer that throws, and still calls onError', () => {
    const onError = vi.fn();
    setRecoveryWriter(() => { throw new Error('no room'); });
    const { after } = crash({ onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(after).toBe('the card');
    setRecoveryWriter(() => {});
  });
});
