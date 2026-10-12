import { beforeEach, describe, expect, it } from 'vitest';
import {
  SETTLEMENTS, SETTLEMENT_FOUNDING, SETTLEMENT_GROWTH_QUEST_DEST, SETTLEMENT_NODES, SETTLEMENT_QUESTS,
} from './settlements';
import { hasSettlementRoad, onSettlementRoad } from './settlementRoads';
import { caravanPartnersOf } from './caravan';
import { GUILD_BY_WORLD } from './guilds';
import { NPC_BY_ID } from './npcs';
import { ROAD_HALF_WIDTH } from './road';
import { resolveDestPoint, TEMPLATE_ARRIVAL_SPAWN, WORLD_DESTINATIONS, WORLD_DESTINATION_BY_ID } from './worlds';
import { useGameStore } from '../store/gameStore';
import type { CharacterConfig } from '../types';

const SITES = Object.entries(SETTLEMENTS);

describe('the settlement tables are views of the one registry', () => {
  it('hands each giver the very list his settlement holds', () => {
    expect(Object.keys(SETTLEMENT_QUESTS)).toEqual(SITES.map(([, site]) => site.giver));
    for (const [, site] of SITES) {
      expect(SETTLEMENT_QUESTS[site.giver]).toBe(site.quests);
      // and that list is what he actually offers
      expect(NPC_BY_ID[site.giver].sideQuests).toBe(site.quests);
    }
  });

  it('files each deed under its destination', () => {
    expect(Object.keys(SETTLEMENT_FOUNDING)).toEqual(SITES.map(([destId]) => destId));
    for (const [destId, site] of SITES) expect(SETTLEMENT_FOUNDING[destId]).toBe(site.founding);
  });

  it('grows a settlement on its own growth errand and on no other', () => {
    expect(SETTLEMENT_GROWTH_QUEST_DEST).toEqual({ ruins_expand: 'template-08', frostpass_expand: 'template-07', camp_expand: 'template-04' });
    for (const [destId, site] of SITES) {
      for (const q of site.quests) expect(SETTLEMENT_GROWTH_QUEST_DEST[q.id]).toBe(q.id === site.growthQuestId ? destId : undefined);
    }
  });

  it('lists resource nodes only for a settlement that has some', () => {
    const withNodes = SITES.filter(([, site]) => site.nodes);
    expect(withNodes.map(([destId]) => destId)).toEqual(['template-07']);
    expect(Object.keys(SETTLEMENT_NODES)).toEqual(['template-07']);
    expect(SETTLEMENT_NODES['template-07']).toBe(SETTLEMENTS['template-07'].nodes);
    // no key at all for the others — not an empty list
    expect('template-08' in SETTLEMENT_NODES).toBe(false);
    expect('template-04' in SETTLEMENT_NODES).toBe(false);
  });

  it('keeps every table a plain object with its own keys', () => {
    for (const table of [SETTLEMENT_QUESTS, SETTLEMENT_FOUNDING, SETTLEMENT_GROWTH_QUEST_DEST, SETTLEMENT_NODES]) {
      expect(Object.getPrototypeOf(table)).toBe(Object.prototype);
    }
    expect(Object.prototype.hasOwnProperty.call(SETTLEMENT_FOUNDING, 'template-08')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(SETTLEMENT_FOUNDING, 'template-01')).toBe(false);
  });
});

describe('the settlement roads are laid from the registry', () => {
  const hall = (destId: string) => ({ x: GUILD_BY_WORLD[destId].hallX, z: GUILD_BY_WORLD[destId].hallZ });
  const mid = (a: { x: number; z: number }, b: { x: number; z: number }) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
  /** a point `d` metres off the middle of the leg a-b, square to it */
  const beside = (a: { x: number; z: number }, b: { x: number; z: number }, d: number) => {
    const m = mid(a, b), len = Math.hypot(b.x - a.x, b.z - a.z);
    return { x: m.x - ((b.z - a.z) / len) * d, z: m.z + ((b.x - a.x) / len) * d };
  };

  it('gives a road to the three settlements and to no other destination', () => {
    for (const d of WORLD_DESTINATIONS) expect(hasSettlementRoad(d.id)).toBe(d.id in SETTLEMENTS);
    expect(hasSettlementRoad('dungeon')).toBe(false);
    expect(onSettlementRoad('template-01', TEMPLATE_ARRIVAL_SPAWN['template-01'].x, TEMPLATE_ARRIVAL_SPAWN['template-01'].z)).toBe(false);
  });

  it('runs each one from where a traveller arrives out to the giver', () => {
    for (const [destId, site] of SITES) {
      const from = TEMPLATE_ARRIVAL_SPAWN[destId], to = NPC_BY_ID[site.giver];
      expect(Math.hypot(to.x - from.x, to.z - from.z)).toBeGreaterThan(3); // a leg, not a dot
      for (const p of [from, to, mid(from, to), beside(from, to, ROAD_HALF_WIDTH - 0.01)]) expect(onSettlementRoad(destId, p.x, p.z)).toBe(true);
      // and no wider than the carriageway, where this leg is the settlement's only one
      if (site.roadsTo.length > 1) continue;
      for (const side of [1, -1]) {
        const off = beside(from, to, side * (ROAD_HALF_WIDTH + 0.01));
        expect(onSettlementRoad(destId, off.x, off.z)).toBe(false);
      }
    }
  });

  it("runs a second leg to the Miners' hall at the Old Ruins, the one settlement whose hall stands apart", () => {
    expect(SITES.filter(([, site]) => site.roadsTo.includes('guildHall')).map(([destId]) => destId)).toEqual(['template-08']);
    const from = TEMPLATE_ARRIVAL_SPAWN['template-08'], to = hall('template-08'), giver = NPC_BY_ID.fenwick;
    /** how far `p` is from the leg a-b */
    const offLeg = (p: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) => {
      const t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / ((b.x - a.x) ** 2 + (b.z - a.z) ** 2);
      const c = Math.max(0, Math.min(1, t));
      return Math.hypot(p.x - (a.x + c * (b.x - a.x)), p.z - (a.z + c * (b.z - a.z)));
    };
    // the hall is off the leg out to Fenwick, so it is the second leg that puts it on the road
    expect(offLeg(to, from, giver)).toBeGreaterThan(ROAD_HALF_WIDTH);
    expect(onSettlementRoad('template-08', to.x, to.z)).toBe(true);
    // ...and the road stops at the hall: past it, on the same line, there is none
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    const past = { x: to.x + ((to.x - from.x) / len) * (ROAD_HALF_WIDTH + 0.01), z: to.z + ((to.z - from.z) / len) * (ROAD_HALF_WIDTH + 0.01) };
    expect(onSettlementRoad('template-08', past.x, past.z)).toBe(false);
  });
});

describe('what the registry feeds', () => {
  const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
  const game = () => useGameStore.getState();
  beforeEach(() => game().newGame(HERO));

  // the order of a site's node list is behaviour: it names the nodes and deals out the two tree models
  it("seeds the Frozen Pass's nodes in the order the record lists them", () => {
    const away = game().nodes.filter((n) => n.world);
    const defs = SETTLEMENTS['template-07'].nodes!;
    expect(away.map((n) => n.id)).toEqual([
      'template-07_tree0', 'template-07_tree1', 'template-07_tree2', 'template-07_tree3',
      'template-07_rock4', 'template-07_rock5', 'template-07_rock6',
    ]);
    expect(away.every((n) => n.world === 'template-07')).toBe(true);
    const trees = away.filter((n) => n.kind === 'tree');
    expect(trees[0].model).toBe(trees[2].model);
    expect(trees[1].model).toBe(trees[3].model);
    expect(trees[0].model).not.toBe(trees[1].model);
    expect(away.filter((n) => n.variant === 'iron').map((n) => n.id)).toEqual(['template-07_rock4']);
    away.forEach((n, i) => {
      const p = resolveDestPoint(WORLD_DESTINATION_BY_ID['template-07'], defs[i].x, defs[i].z);
      expect([n.x, n.z, n.scale, n.yaw, n.hitsLeft]).toEqual([p.x, p.z, defs[i].scale, defs[i].yaw, defs[i].hitsLeft]);
    });
  });

  it('files a deed only once its own errand is done and paid for, and moves in exactly the three named residents', () => {
    for (const [destId, site] of SITES) {
      const others = SITES.filter(([d]) => d !== destId).map(([, s]) => s.founding.requiredQuestId);
      const price = site.founding.cost.gold!;
      expect(Object.keys(site.founding.cost)).toEqual(['gold']);
      useGameStore.setState({ completedSideQuests: others, inventory: { ...game().inventory, gold: 500 } });
      game().foundSettlement(destId, 1, 2, 3);
      expect(game().settlements[destId]).toBeUndefined(); // the other sites' errands do not open this deed

      useGameStore.setState({ completedSideQuests: [site.founding.requiredQuestId], inventory: { ...game().inventory, gold: price - 1 } });
      game().foundSettlement(destId, 1, 2, 3);
      expect(game().settlements[destId]).toBeUndefined(); // one gold short

      useGameStore.setState({ inventory: { ...game().inventory, gold: price } });
      game().foundSettlement(destId, 1, 2, 3);
      expect(game().settlements[destId]).toBeDefined();
      expect(game().inventory.gold).toBe(0);
      // each resident record is the registry's three fields and the settlement's world, nothing more
      expect(game().villagers.filter((v) => v.world === destId)).toEqual(site.founding.residents.map((r) => ({ ...r, world: destId })));
    }
    expect(game().villagers).toHaveLength(9);
  });

  it('raises the growth tier of the settlement whose growth errand is turned in, and of no other', () => {
    useGameStore.setState({ completedSideQuests: SITES.map(([, s]) => s.founding.requiredQuestId), inventory: { ...game().inventory, gold: 500 } });
    for (const [destId] of SITES) game().foundSettlement(destId, 1, 2, 3);
    for (const [destId, site] of SITES) {
      const def = site.quests.find((q) => q.id === site.growthQuestId)!;
      useGameStore.setState({
        completedSideQuests: [...game().completedSideQuests, ...(def.requires ?? [])],
        inventory: { ...game().inventory, [def.target]: def.need },
      });
      game().acceptSideQuest(site.giver, def.id);
      expect(game().sideQuest?.questId).toBe(def.id);
      useGameStore.setState({ sideQuest: { ...game().sideQuest!, have: def.need } });
      game().turnInSideQuest();
      expect(game().settlements[destId].growthTier).toBe(1);
    }
    expect(SITES.map(([destId]) => game().settlements[destId].growthTier)).toEqual([1, 1, 1]);
  });
});

// the caravan desk draws one block per partner, in this order (DialoguePanel)
describe('the caravan roads between settlements', () => {
  it('lists the partners of each settlement in the order the roads were written', () => {
    expect(caravanPartnersOf('template-08')).toEqual(['template-07', 'template-04']);
    expect(caravanPartnersOf('template-07')).toEqual(['template-08', 'template-04']);
    expect(caravanPartnersOf('template-04')).toEqual(['template-07', 'template-08']);
    expect(caravanPartnersOf('template-01')).toEqual([]);
  });
});
