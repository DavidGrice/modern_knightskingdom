import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyDownedGate, type Downable } from './actorDowned';

const record = (over: Partial<Downable> = {}): Downable => ({ hp: 3, maxHp: 24, state: 'ok', downedUntil: 0, ...over });

afterEach(() => { vi.restoreAllMocks(); });

describe('applyDownedGate', () => {
  it('lets someone on their feet through, shown, without a look at the clock', () => {
    const clock = vi.spyOn(Date, 'now');
    const who = record({ downedUntil: 5 }), figure = { visible: false };
    expect(applyDownedGate(who, figure)).toBe(false);
    expect([figure.visible, who]).toEqual([true, record({ downedUntil: 5 })]);
    expect(clock).not.toHaveBeenCalled();
  });

  it('holds a downed figure hidden, and touches nothing, until the recovery time', () => {
    vi.spyOn(Date, 'now').mockReturnValue(999);
    const who = record({ state: 'downed', hp: 0, downedUntil: 1000 }), figure = { visible: true };
    expect(applyDownedGate(who, figure)).toBe(true);
    expect([figure.visible, who]).toEqual([false, record({ state: 'downed', hp: 0, downedUntil: 1000 })]);
  });

  it('stands them up at full health the moment the time is reached, and lets that frame run', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const who = record({ state: 'downed', hp: 0, downedUntil: 1000 }), figure = { visible: false };
    expect(applyDownedGate(who, figure)).toBe(false);
    // the time stamp itself is left as it was
    expect([figure.visible, who]).toEqual([true, record({ state: 'ok', hp: 24, downedUntil: 1000 })]);
  });

  it('goes by the caller\'s reading of the clock when it is given one', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(5000);
    const early = record({ state: 'downed', hp: 0, downedUntil: 1000 }), late = record({ state: 'downed', hp: 0, downedUntil: 1000 });
    expect([applyDownedGate(early, { visible: true }, 999), applyDownedGate(late, { visible: true }, 1000)]).toEqual([true, false]);
    expect([early.state, late.state]).toEqual(['downed', 'ok']);
    expect(clock).not.toHaveBeenCalled();
  });

  it('carries whatever else the record holds untouched', () => {
    vi.spyOn(Date, 'now').mockReturnValue(2000);
    const defender = { ...record({ state: 'downed', hp: 0, downedUntil: 1500 }), x: 4, z: 5, attackCd: 0.3, hurtCd: 0.1 };
    expect(applyDownedGate(defender, { visible: false })).toBe(false);
    expect(defender).toEqual({ hp: 24, maxHp: 24, state: 'ok', downedUntil: 1500, x: 4, z: 5, attackCd: 0.3, hurtCd: 0.1 });
  });
});
