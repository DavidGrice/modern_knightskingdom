import { beforeEach, describe, expect, it, vi } from 'vitest';
import { quintainHit, quintainSpins } from './quintain';
import { useGameStore } from './store/gameStore';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let sounds: unknown[][];
let lines: string[];

beforeEach(() => {
  vi.restoreAllMocks();
  sounds = [];
  vi.spyOn(audio, 'play').mockImplementation(((...a: unknown[]) => { sounds.push(a); return null; }) as never);
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  game().newGame(HERO as never);
  lines = [];
  useGameStore.setState({ notify: (text: string) => { lines.push(text); } });
  for (const id of Object.keys(quintainSpins)) delete quintainSpins[id];
});

describe('quintainHit', () => {
  it('sets the dummy spinning — two to four half-turns more with every hit — and trains', () => {
    const xp = game().xp.combat;
    quintainHit('q1', false);
    expect(quintainSpins).toEqual({ q1: Math.PI * 2.5 });
    quintainHit('q1', false);
    expect(quintainSpins.q1).toBe(Math.PI * 2.5 + Math.PI * 2.5);
    expect(game().xp.combat).toBe(xp + 16);
    expect(sounds).toEqual([['sword_swish', 0.8], ['thud', 0.5], ['sword_swish', 0.8], ['thud', 0.5]]);
    expect(lines).toEqual([]);
  });

  it('spins it from two half-turns up to four, by the roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    quintainHit('q1', false);
    expect(quintainSpins.q1).toBe(Math.PI * 2);
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    quintainHit('q2', false);
    expect(quintainSpins.q2).toBe(Math.PI * 3.5);
    vi.spyOn(Math, 'random').mockReturnValue(1 - 2 ** -52);
    quintainHit('q3', false);
    expect(quintainSpins.q3).toBeGreaterThan(Math.PI * 3.999);
    expect(quintainSpins.q3).toBeLessThan(Math.PI * 4);
  });

  it('pays double from the saddle, and says so', () => {
    const xp = game().xp.combat;
    quintainHit('q2', true);
    expect(game().xp.combat).toBe(xp + 16);
    expect(lines).toEqual(['Mounted strike! Double training XP.']);
  });

  it('keeps each quintain its own spin', () => {
    quintainHit('q1', false);
    quintainHit('q2', false);
    expect(Object.keys(quintainSpins).sort()).toEqual(['q1', 'q2']);
  });
});
