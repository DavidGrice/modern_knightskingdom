import { describe, expect, it } from 'vitest';
import { damageRaiderProp, settleWreck, WRECK_SECONDS, type RaiderPropState } from './raiderProps';

const prop = (over: Partial<RaiderPropState> = {}): RaiderPropState => ({ active: true, x: 3, z: 4, hp: 30, wrecked: false, wreckT: 0, ...over });

describe('damageRaiderProp', () => {
  it('takes a blow off the hit points and says the prop still stands', () => {
    const ram = prop();
    expect(damageRaiderProp(ram, 12)).toBe(false);
    expect(ram).toEqual(prop({ hp: 18 }));
  });

  it('wrecks it on the blow that takes the last of them, never below zero', () => {
    const ram = prop({ hp: 5, wreckT: 3 });
    expect(damageRaiderProp(ram, 12)).toBe(true);
    expect(ram).toEqual(prop({ hp: 0, wrecked: true, wreckT: 0 }));
    // exactly the last hit point is enough
    expect(damageRaiderProp(prop({ hp: 12 }), 12)).toBe(true);
  });

  it('leaves a wreck, and a prop that is not in play, alone', () => {
    const wreck = prop({ hp: 0, wrecked: true, wreckT: 2.5 });
    expect(damageRaiderProp(wreck, 12)).toBe(false);
    expect(wreck).toEqual(prop({ hp: 0, wrecked: true, wreckT: 2.5 }));
    const idle = prop({ active: false });
    expect(damageRaiderProp(idle, 99)).toBe(false);
    expect(idle).toEqual(prop({ active: false }));
  });
});

describe('settleWreck', () => {
  it('tips the wreck over in its first 0.9 seconds and then lets it lie', () => {
    const wreck = prop({ hp: 0, wrecked: true });
    expect(settleWreck(wreck, 0.45)).toBeCloseTo(0.5, 12);
    expect(settleWreck(wreck, 0.45)).toBe(1);
    expect(settleWreck(wreck, 3)).toBe(1);
    expect([wreck.wreckT, wreck.active]).toEqual([3.9, true]);
  });

  it('clears it away once its six seconds are over — not at six, after', () => {
    expect(WRECK_SECONDS).toBe(6);
    const wreck = prop({ hp: 0, wrecked: true, wreckT: 5 });
    expect(settleWreck(wreck, 1)).toBe(1);
    expect(wreck.active).toBe(true);
    expect(settleWreck(wreck, 0.001)).toBeNull();
    // gone from play; the rest of the record is as it lay
    expect(wreck).toEqual(prop({ active: false, hp: 0, wrecked: true, wreckT: 6.001 }));
  });
});
