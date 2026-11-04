import { describe, expect, it } from 'vitest';
import { useGameStore } from '../gameStore';
import { stabledHorses } from '../../riding';
import type { CharacterConfig } from '../../types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();

function saved() {
  game().newGame(HERO);
  game().markSaved(game().saveMark());
  expect(game().dirty).toBe(false);
}

describe('what marks the save dirty (F-08b)', () => {
  it("the clock's mirror does not (OD-12); a new day still does", () => {
    saved();
    game().setTimeOfDay(0.61);
    expect(game().timeOfDay).toBe(0.61);
    expect(game().dirty).toBe(false);
    game().setDayCount(3);
    expect(game().dirty).toBe(true);
  });

  it('nor does the playtime and distance tally, handed over every 4 s', () => {
    saved();
    game().flushStats({ distanceMeters: 12, playtimeSec: 4 });
    expect(game().stats.playtimeSec).toBe(4);
    expect(game().stats.distanceMeters).toBe(12);
    expect(game().dirty).toBe(false);
  });

  it('stabling a horse and mounting a defender do — the save holds both, outside the store', () => {
    saved();
    game().stableHorse('herd_1');
    expect(stabledHorses.ids).toContain('herd_1');
    expect(game().dirty).toBe(true);
    saved();
    game().setDefenderMount('v1', 'herd_1');
    expect(game().toSave().mounts).toEqual({ v1: 'herd_1' });
    expect(game().dirty).toBe(true);
    saved();
    game().setDefenderMount('v1', null);
    expect(game().toSave().mounts).toEqual({});
    expect(game().dirty).toBe(true);
  });

  it("a crop's countdown does not, like the clock; a crop coming ready does", () => {
    saved();
    useGameStore.setState({ plots: { p1: 1 } });
    game().tickPlots(0.5);
    expect(game().plots.p1).toBeGreaterThan(0);
    expect(game().dirty).toBe(false);
    game().tickPlots(5);
    expect(game().plots.p1).toBe(0);
    expect(game().dirty).toBe(true);
  });

  it('a change made while a save is on its way stays to be written', () => {
    saved();
    game().setTrackedQuest('side');
    const mark = game().saveMark();
    const save = game().toSave();
    game().setTrackedQuest('main'); // while the PUT is in flight
    game().markSaved(mark);
    expect(save.trackedQuest).toBe('side');
    expect(game().dirty).toBe(true);
    game().markSaved(game().saveMark());
    expect(game().dirty).toBe(false);
  });

  it('every save is stamped with when it was taken', () => {
    saved();
    const before = Date.now();
    const { savedAt } = game().toSave();
    expect(savedAt).toBeGreaterThanOrEqual(before);
    expect(savedAt).toBeLessThanOrEqual(Date.now());
  });
});
