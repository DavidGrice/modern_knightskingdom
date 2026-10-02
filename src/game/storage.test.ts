import { describe, expect, it } from 'vitest';
import { storageCapacity } from './storage';
import type { PlacedBuilding } from './types';

let n = 0;
const b = (type: string, built?: number): PlacedBuilding => ({ id: `b${++n}`, type, x: 0, z: 0, rot: 0, built });

describe('storageCapacity', () => {
  it('is the base 80 per good with nothing built', () => {
    expect(storageCapacity([])).toBe(80);
  });

  it('adds each finished deposit point at its own size, from every world', () => {
    expect(storageCapacity([b('stockpile')])).toBe(140);
    expect(storageCapacity([b('barrel'), b('storehouse')])).toBe(252);
    expect(storageCapacity([{ ...b('stockpile'), world: 'template-08' }])).toBe(140);
  });

  it('ignores unfinished deposit points and buildings that store nothing', () => {
    expect(storageCapacity([b('stockpile', 0.5), b('wall'), b('workbench')])).toBe(80);
  });
});
