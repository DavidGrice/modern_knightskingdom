import { describe, expect, it } from 'vitest';
import { ambiencePool } from './ambience';

describe('the ambience pools', () => {
  it('draw what each biome played, by day and by night', () => {
    expect(ambiencePool('meadow', false)).toEqual(['bird1', 'bird2', 'bird3', 'wind1', 'wind2']);
    expect(ambiencePool('meadow', true)).toEqual(['owl', 'wind1', 'wind2', 'owl']);
    for (const night of [false, true]) {
      expect(ambiencePool('mountain', night)).toEqual(['wind1', 'wind2']);
      expect(ambiencePool('ruins', night)).toEqual(['owl', 'wind1', 'wind2']);
      expect(ambiencePool('silent', night)).toBeNull();
    }
  });
});
