import { describe, expect, it } from 'vitest';
import { aimFor } from './sightline';

type T = { id: string; d: number; seen: boolean };
const dist = (t: T) => t.d;
const sees = (t: T) => t.seen;

describe('the target a shooter takes', () => {
  const chosen: T = { id: 'chosen', d: 10, seen: false };

  it('is the one its rules pick while that one is out of range, or in sight', () => {
    const far: T = { id: 'far', d: 20, seen: false };
    expect(aimFor(far, [chosen], dist, 14, sees)).toEqual({ target: far, blocked: false });
    const seen: T = { id: 'seen', d: 10, seen: true };
    expect(aimFor(seen, [chosen], dist, 14, sees)).toEqual({ target: seen, blocked: false });
  });

  it('within range and out of sight, turns to the nearest other target in range it can see', () => {
    const near: T = { id: 'near', d: 6, seen: true };
    const nearer: T = { id: 'nearer', d: 4, seen: true };
    const hidden: T = { id: 'hidden', d: 2, seen: false };
    const beyond: T = { id: 'beyond', d: 15, seen: true };
    expect(aimFor(chosen, [chosen, near, hidden, beyond, nearer], dist, 14, sees)).toEqual({ target: nearer, blocked: false });
  });

  it('with no other in range and in sight, keeps the one it picked, blocked, to close in on', () => {
    const hidden: T = { id: 'hidden', d: 5, seen: false };
    const beyond: T = { id: 'beyond', d: 15, seen: true };
    expect(aimFor(chosen, [chosen, hidden, beyond], dist, 14, sees)).toEqual({ target: chosen, blocked: true });
    expect(aimFor(chosen, [], dist, 14, sees)).toEqual({ target: chosen, blocked: true });
  });
});
