import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';
import type { CharacterConfig } from '../types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();

describe('delivery errands', () => {
  beforeEach(() => {
    game().newGame(HERO);
    // both of the errands below sit behind Fenwick's founding errand
    useGameStore.setState({ completedSideQuests: ['settle_clear'] });
  });

  it('a harvested-goods delivery is loaded up by harvesting', () => {
    game().acceptSideQuest('farmer_alric', 'al_haul_grain');
    expect(game().sideQuest).toEqual({ npcId: 'farmer_alric', questId: 'al_haul_grain', have: 0 });
    game().addItems({ wheat: 3 }, 'gather');
    expect(game().sideQuest?.have).toBe(3);
  });

  // Beda's "cart 8 planks out to Fenwick": planks are crafted, never harvested, so before CLN-21 this errand's
  // counter could not move at all and it could never be turned in.
  it('a crafted-goods delivery is loaded up by crafting the goods', () => {
    game().acceptSideQuest('miller_beda', 'bd_haul_timber');
    expect(game().sideQuest).toEqual({ npcId: 'miller_beda', questId: 'bd_haul_timber', have: 0 });
    game().addItems({ wood: 10 });
    for (let i = 0; i < 4; i++) expect(game().craft('plank')).toBe(true); // 2 planks per craft
    expect(game().sideQuest?.have).toBe(8);

    // ...and is then handed over where it was asked for, goods and all
    const planksBefore = game().inventory.plank ?? 0;
    useGameStore.setState({ destination: 'template-08' });
    game().turnInSideQuest();
    expect(game().completedSideQuests).toContain('bd_haul_timber');
    expect(game().sideQuest).toBeNull();
    expect(game().inventory.plank ?? 0).toBe(planksBefore - 8);
  });

  it('crafting does not advance a delivery of something else, nor a plain gather errand', () => {
    game().acceptSideQuest('farmer_alric', 'al_haul_grain');
    game().addItems({ wood: 10 });
    game().craft('plank');
    expect(game().sideQuest?.have).toBe(0);
  });
});
