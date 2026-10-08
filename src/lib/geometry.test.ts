import { describe, expect, it } from 'vitest';
import { ringAngles } from './geometry';

/** the loop ArenaScene.tsx and BattleDome.tsx each carried, as it stood (their two constants put in) */
function asItStood(SEG_COUNT: number, GAP_HALF: number): number[] {
  const angles: number[] = [];
  for (let i = 0; i < SEG_COUNT; i++) {
    const angle = (i / SEG_COUNT) * Math.PI * 2;
    const distFromNorth = Math.min(angle, Math.PI * 2 - angle);
    if (distFromNorth < GAP_HALF) continue;
    angles.push(angle);
  }
  return angles;
}

describe('ringAngles', () => {
  it('gives the arena and the battle dome the rings they had, to the last bit', () => {
    expect(ringAngles(28, 0.4)).toEqual(asItStood(28, 0.4));
    expect(ringAngles(22, 0.35)).toEqual(asItStood(22, 0.35));
  });

  it('leaves three segments out at the north gate: the one on it and its two neighbours', () => {
    const arena = ringAngles(28, 0.4), dome = ringAngles(22, 0.35);
    expect([arena.length, dome.length]).toEqual([25, 19]);
    expect([arena[0], arena[24]]).toEqual([(2 / 28) * Math.PI * 2, (26 / 28) * Math.PI * 2]);
    expect([dome[0], dome[18]]).toEqual([(2 / 22) * Math.PI * 2, (20 / 22) * Math.PI * 2]);
  });

  it('keeps a segment standing exactly at the edge of the gap, and every one when there is no gap', () => {
    const quarter = Math.PI / 2; // 4 segments: 0, 90, 180, 270 degrees
    expect(ringAngles(4, quarter)).toEqual([quarter, Math.PI, 3 * quarter]);
    expect(ringAngles(4, quarter + 1e-9)).toEqual([Math.PI]);
    expect(ringAngles(4, 0)).toEqual([0, quarter, Math.PI, 3 * quarter]);
  });
});
