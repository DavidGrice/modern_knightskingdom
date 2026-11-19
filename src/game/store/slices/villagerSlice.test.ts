import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../gameStore';
import { defenderStrike } from '../../defenders';
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

// G-08 · the forge's tiers on a defender (OPEN-050): spent from the Armory's own stock of the tier, and handed back
describe("a defender's weapon tier", () => {
  let notes: string[] = [];
  beforeEach(() => {
    notes = [];
    useGameStore.setState({
      notify: (text: string) => { notes.push(text); },
      villagers: [{ id: 'd1', name: 'Ada', job: 'defender', level: 1 }],
      armory: { sword: 1, shield: 1, sword_forged: 1, sword_crested: 1, halberd_legendary: 1 },
    } as never);
  });
  const ada = () => game().villagers.find((v) => v.id === 'd1')!;

  it("spends the tier's own item, and refunds it on the way to another tier, another loadout or bare hands", () => {
    game().setDefenderLoadout('d1', 'sword_shield', 'forged');
    expect(ada()).toMatchObject({ loadout: 'sword_shield', loadoutTier: 'forged' });
    expect(game().armory).toMatchObject({ sword: 1, shield: 0, sword_forged: 0, sword_crested: 1 });
    expect(notes.at(-1)).toBe('Ada is armed with Forged Sword from the Armory.');
    // up a tier: the Forged Sword back, the Crested out — and her own shield taken back up, with none spare
    game().setDefenderLoadout('d1', 'sword_shield', 'crested');
    expect(ada().loadoutTier).toBe('crested');
    expect(game().armory).toMatchObject({ sword: 1, shield: 0, sword_forged: 1, sword_crested: 0 });
    // another loadout: the sword and shield back
    game().setDefenderLoadout('d1', 'halberd', 'legendary');
    expect(ada()).toMatchObject({ loadout: 'halberd', loadoutTier: 'legendary' });
    expect(game().armory).toMatchObject({ shield: 1, sword_crested: 1, halberd_legendary: 0 });
    game().unequipDefenderLoadout('d1');
    expect(ada().loadout).toBeUndefined();
    expect(ada().loadoutTier).toBeUndefined();
    expect(game().armory).toMatchObject({ sword: 1, shield: 1, sword_forged: 1, sword_crested: 1, halberd_legendary: 1 });
  });

  it('the base tier is the plain item, and a tier with none in the Armory is refused with nothing spent', () => {
    game().setDefenderLoadout('d1', 'sword_shield');
    expect(ada().loadout).toBe('sword_shield');
    expect(ada().loadoutTier).toBeUndefined();
    expect(game().armory).toMatchObject({ sword: 0, shield: 0 });
    const before = { ...game().armory };
    game().setDefenderLoadout('d1', 'sword_shield', 'legendary');
    expect(notes.at(-1)).toBe('Not enough in the Armory to arm Ada that way.');
    expect(game().armory).toEqual(before);
    expect(ada().loadoutTier).toBeUndefined();
  });

  it("strikes for the tier: the player's own ladder over the base blow", () => {
    game().setDefenderLoadout('d1', 'sword_shield');
    const base = defenderStrike(ada());
    game().setDefenderLoadout('d1', 'sword_shield', 'forged');
    expect(defenderStrike(ada())).toBe(base + 0.5);
    game().setDefenderLoadout('d1', 'sword_shield', 'crested');
    expect(defenderStrike(ada())).toBe(base + 1);
    game().setDefenderLoadout('d1', 'halberd', 'legendary');
    expect(defenderStrike(ada())).toBe(base + 2.25);
  });

  it("the Roster's chip for the loadout she holds, picked again with no tier, leaves her tier as it is", () => {
    game().setDefenderLoadout('d1', 'sword_shield', 'forged');
    const before = { ...game().armory };
    const said = notes.length;
    // with a base Sword spare in the Armory, and with none
    game().setDefenderLoadout('d1', 'sword_shield');
    useGameStore.setState({ armory: { ...before, sword: 0 } });
    game().setDefenderLoadout('d1', 'sword_shield');
    expect(ada()).toMatchObject({ loadout: 'sword_shield', loadoutTier: 'forged' });
    expect(game().armory).toEqual({ ...before, sword: 0 });
    expect(notes.length).toBe(said);
    // a tier named is still a choice, and another loadout with none is its base tier
    useGameStore.setState({ armory: before });
    game().setDefenderLoadout('d1', 'sword_shield', 'base');
    expect(ada().loadoutTier).toBeUndefined();
    game().setDefenderLoadout('d1', 'sword_shield', 'crested');
    useGameStore.setState({ armory: { ...game().armory, halberd: 1 } });
    game().setDefenderLoadout('d1', 'halberd');
    expect(ada()).toMatchObject({ loadout: 'halberd', loadoutTier: undefined });
    expect(game().armory).toMatchObject({ halberd: 0, sword_crested: 1 });
  });

  it("an old save's defender, with no tier, loads and strikes at the base tier", () => {
    game().setDefenderLoadout('d1', 'sword_shield');
    const base = defenderStrike(ada());
    const save = JSON.parse(JSON.stringify(game().toSave()));
    expect(save.villagers[0].loadoutTier).toBeUndefined();
    game().loadFromSave(save);
    expect(ada()).toMatchObject({ loadout: 'sword_shield' });
    expect(defenderStrike(ada())).toBe(base);
    // and back out of it: what a base loadout spends comes back
    game().unequipDefenderLoadout('d1');
    expect(game().armory).toMatchObject({ sword: 1, shield: 1 });
  });

  it("a settlement's resident made a defender is given no tier: nothing spent, nobody new at home (G-24a's entry)", () => {
    useGameStore.setState({ villagers: [{ id: 'd1', name: 'Ada', job: 'defender', level: 1, world: 'kings_approach' }] } as never);
    const before = { ...game().armory };
    game().setDefenderLoadout('d1', 'sword_shield', 'forged');
    expect(game().armory).toEqual(before);
    expect(ada().loadoutTier).toBeUndefined();
    expect(ada().world).toBe('kings_approach');
    expect(notes.at(-1)).toBe("Ada keeps a settlement — the forge's tiers arm the homestead's own garrison.");
  });

  it('the bow has no tiers: one asked for is the base Crossbow, and a bow already held is not re-armed for it', () => {
    useGameStore.setState({ armory: { ...game().armory, crossbow: 1 } });
    game().setDefenderLoadout('d1', 'bow', 'forged');
    expect(ada().loadout).toBe('bow');
    expect(ada().loadoutTier).toBeUndefined();
    expect(game().armory.crossbow).toBe(0);
    const said = notes.length;
    game().setDefenderLoadout('d1', 'bow', 'legendary');
    expect(ada().loadoutTier).toBeUndefined();
    expect(notes.length).toBe(said);
  });

  it('a defender saved carrying a tier loads carrying it, and hands that tier back', () => {
    game().setDefenderLoadout('d1', 'sword_shield', 'crested');
    const save = JSON.parse(JSON.stringify(game().toSave()));
    game().loadFromSave(save);
    expect(ada()).toMatchObject({ loadout: 'sword_shield', loadoutTier: 'crested' });
    game().unequipDefenderLoadout('d1');
    expect(game().armory).toMatchObject({ sword: 1, shield: 1, sword_crested: 1 });
  });
});
