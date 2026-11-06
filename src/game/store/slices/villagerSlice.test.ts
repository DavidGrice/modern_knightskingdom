import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../gameStore';
import { SETTLEMENTS } from '../../data/settlements';
import { homeVillagers, villagerRequirement } from '../../data/villagers';
import type { CharacterConfig, PlacedBuilding, Villager } from '../../types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();

/** the three settlements founded through the store's own deed: nine residents, none of them at home */
function foundAll() {
  const sites = Object.entries(SETTLEMENTS);
  useGameStore.setState({
    completedSideQuests: sites.map(([, s]) => s.founding.requiredQuestId),
    inventory: { ...game().inventory, gold: 500 },
  });
  for (const [destId] of sites) game().foundSettlement(destId, 1, 2, 3);
}

/** `n` folk already at home */
function homeFolk(n: number) {
  const folk: Villager[] = Array.from({ length: n }, (_, i) => ({ id: `home${i}`, name: `Home ${i}`, job: 'idle' }));
  useGameStore.setState({ villagers: [...game().villagers, ...folk] });
}

/** finished home structures: `beds` beds and torches up to `total` */
function homeBuildings(beds: number, total: number) {
  const buildings: PlacedBuilding[] = Array.from({ length: total }, (_, i) => ({
    id: `b${i}`, type: i < beds ? 'bed' : 'torch', x: i * 3, z: 0, rot: 0,
  }));
  useGameStore.setState({ buildings });
}

beforeEach(() => game().newGame(HERO));

// F-18 · a settlement's residents live there: they do not fill the homestead's roster
describe('the homestead roster counts the homestead', () => {
  it('takes the folk whose world is home, and no settlement resident', () => {
    foundAll();
    homeFolk(2);
    useGameStore.setState({ villagers: [...game().villagers, { id: 'nulled', name: 'Nulled', job: 'idle', world: null }] });
    expect(game().villagers).toHaveLength(12);
    expect(homeVillagers(game().villagers).map((v) => v.id)).toEqual(['home0', 'home1', 'nulled']);
  });

  it('lets a newcomer arrive beside nine residents, judged as the fourth at home', () => {
    foundAll();
    homeFolk(3);
    const need = villagerRequirement(4);
    // one bed short of the fourth's needs: nobody comes
    homeBuildings(need.beds - 1, need.buildings);
    game().checkVillagerArrival();
    expect(homeVillagers(game().villagers)).toHaveLength(3);
    // what the fourth needs, and no more: they come
    homeBuildings(need.beds, need.buildings);
    game().checkVillagerArrival();
    expect(homeVillagers(game().villagers)).toHaveLength(4);
    expect(game().villagers).toHaveLength(13);
    expect(game().villagers[12].world).toBeUndefined();
  });

  it('lets Alric be recruited beside nine residents', () => {
    foundAll();
    homeFolk(3);
    useGameStore.setState({ inventory: { ...game().inventory, wood: 6 } });
    game().recruitVillageFolk('farmer_alric');
    expect(game().villagers.some((v) => v.id === 'farmer_alric')).toBe(true);
    expect(game().inventory.wood).toBe(0);
  });

  it('still stops at six at home', () => {
    foundAll();
    homeFolk(6); // the cap is not raised here (settlement caps are G-23's)
    homeBuildings(20, 40);
    useGameStore.setState({ inventory: { ...game().inventory, wood: 6 } });
    game().checkVillagerArrival();
    game().recruitVillageFolk('farmer_alric');
    expect(homeVillagers(game().villagers)).toHaveLength(6);
    expect(game().inventory.wood).toBe(6);
  });
});
