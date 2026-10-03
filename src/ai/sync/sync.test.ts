import { beforeEach, describe, expect, it, vi } from 'vitest';

// The walker population is always empty with today's content (courtSync.ts says why), so the last group of tests
// makes it live: while `live.walkers` lists an NPC's id, scheduledCourtNpcs returns that NPC wherever the court
// sync would otherwise have it as a courtier. With the list empty the real function answers.
const live = vi.hoisted(() => ({ walkers: [] as string[] }));
vi.mock('@/game/data/cast/presence', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/game/data/cast/presence')>();
  const { NPCS } = await import('@/game/data/cast/roster');
  return {
    ...real,
    scheduledCourtNpcs: (completedQuests: string[], destination: string | null, villagers: { id: string }[]) => (
      live.walkers.length === 0
        ? real.scheduledCourtNpcs(completedQuests, destination, villagers)
        : NPCS.filter((n) => live.walkers.includes(n.id) && real.isNpcRevealed(n, completedQuests)
          && (n.world ?? null) === (destination ?? null) && !villagers.some((v) => v.id === n.id))),
  };
});

import { agentManager } from '../core/AgentManager';
import { mirrorCourtPositions, resetCourtAgentSync, syncCourtAgents } from './courtSync';
import { mirrorVillagerPositions, resetVillagerAgentSync, syncVillagerAgents } from './rosterSync';
import { resetWildlifeAgentSync, syncWildlifeAgents, WILDLIFE_POPULATION } from './wildlifeSync';
import { NPC_BY_ID } from '@/game/data/npcs';
import { defenderState } from '@/game/defenders';
import { npcMobs } from '@/game/npcMobs';
import { villagerMobs } from '@/game/villagerMobs';
import type { Villager } from '@/game/types';

const ids = () => agentManager.agents.map((a) => `${a.id}:${a.archetype}`);
const at = (id: string) => { const p = agentManager.get(id)!.position; return [p.x, p.z]; };
/** what gameStore's newGame/loadFromSave do to this layer (store/sessionReset.ts) */
const newSession = () => {
  agentManager.clear();
  resetVillagerAgentSync();
  resetCourtAgentSync();
  resetWildlifeAgentSync();
};

const WAT: Villager = { id: 'v1', name: 'Wat', job: 'lumberjack' };
const ALRIC: Villager = { id: 'farmer_alric', name: 'Alric', job: 'idle' };

beforeEach(() => {
  newSession();
  live.walkers = [];
  for (const registry of [villagerMobs, npcMobs, defenderState] as Record<string, unknown>[]) {
    for (const id of Object.keys(registry)) delete registry[id];
  }
});

describe('the roster sync', () => {
  it('spawns a villager where its figure stands and in its own world, a defender at his post and at home', () => {
    villagerMobs.v1 = { x: 10, z: 11 };
    defenderState.v2 = { x: 7, z: 9 } as never;
    syncVillagerAgents([
      WAT,
      { id: 'v2', name: 'Osric', job: 'defender', world: 'template-08' },
      { id: 'v3', name: 'Fen', job: 'farmer', world: 'template-08' },
    ]);
    expect(agentManager.agents.map((a) => [a.id, a.archetype, a.region, a.position.x, a.position.z])).toEqual([
      ['v1', 'villager', null, 10, 11],
      ['v2', 'defenderObserver', null, 7, 9],
      ['v3', 'villager', 'template-08', 0, 0],
    ]);
  });

  it('a villager whose job crosses the defender line is respawned under the new archetype', () => {
    syncVillagerAgents([WAT]);
    const asLumberjack = agentManager.get('v1');
    syncVillagerAgents([{ ...WAT, job: 'defender' }]);
    expect(agentManager.get('v1')?.archetype).toBe('defenderObserver');
    syncVillagerAgents([{ ...WAT, job: 'miner' }]);
    expect(agentManager.get('v1')?.archetype).toBe('villager');
    expect(agentManager.get('v1')).not.toBe(asLumberjack);
    // a job change that stays on one side of the line keeps the Agent
    const asMiner = agentManager.get('v1');
    syncVillagerAgents([{ ...WAT, job: 'farmer' }]);
    expect(agentManager.get('v1')).toBe(asMiner);
  });

  it('settles a roster that lists an id twice on its last entry, one villager at a time', () => {
    // the store cannot produce this (ids are unique); it pins the order the roster is walked in — each villager's
    // stale Agent let go and its new one spawned before the next villager is looked at
    const twice: Villager[] = [{ ...WAT, job: 'farmer' }, { ...WAT, job: 'defender' }];
    syncVillagerAgents(twice);
    expect(ids()).toEqual(['v1:defenderObserver']);
    syncVillagerAgents([...twice]);
    expect(ids()).toEqual(['v1:defenderObserver']);
  });

  it('a villager follows its rendered figure, a defender his post, and an unrendered one hands its position back', () => {
    syncVillagerAgents([WAT, { id: 'v2', name: 'Osric', job: 'defender' }]);
    const wat = agentManager.get('v1')!;

    // nothing rendered yet: both stay where they were spawned
    mirrorVillagerPositions();
    expect([at('v1'), at('v2')]).toEqual([[0, 0], [0, 0]]);
    villagerMobs.v1 = { x: 10, z: 11 };
    defenderState.v2 = { x: 7, z: 9 } as never;
    mirrorVillagerPositions();
    expect([at('v1'), at('v2')]).toEqual([[10, 11], [7, 9]]);

    // off-screen (tier D) the Agent owns its position and the figure's stays frozen...
    wat.steering = 'teleport';
    wat.position.set(30, 0, 31);
    mirrorVillagerPositions();
    expect([at('v1'), villagerMobs.v1]).toEqual([[30, 31], { x: 10, z: 11 }]);
    // ...is written from the Agent the one frame it comes back...
    wat.steering = 'full';
    mirrorVillagerPositions();
    expect(villagerMobs.v1).toEqual({ x: 30, z: 31 });
    // ...and leads again from the next
    villagerMobs.v1.x = 33;
    mirrorVillagerPositions();
    expect(at('v1')).toEqual([33, 31]);
  });

  it('reads the roster again only when it is replaced, and starts over with a new session', () => {
    const villagers = [WAT];
    syncVillagerAgents(villagers);
    const first = agentManager.get('v1');
    villagers.push({ id: 'v2', name: 'Hob', job: 'farmer' }); // the store never does this: a roster change is a new array
    syncVillagerAgents(villagers);
    expect(ids()).toEqual(['v1:villager']);
    const replaced = [...villagers];
    syncVillagerAgents(replaced);
    expect([ids(), agentManager.get('v1')]).toEqual([['v1:villager', 'v2:villager'], first]);

    newSession();
    syncVillagerAgents(replaced); // the very array it saw last
    expect(ids()).toEqual(['v1:villager', 'v2:villager']);
    expect(agentManager.get('v1')).not.toBe(first);
  });

  it('a fresh Agent never inherits the off-screen state of the one before it', () => {
    // Off-screen, then replaced three ways: across the defender line, off the roster and back, and by a new
    // session. Each time the figure registers only after the new Agent exists, and must lead it — not be
    // overwritten by the Agent's spawn position as if it were coming back from off-screen.
    const goOffScreen = () => {
      villagerMobs.v1 = { x: 10, z: 11 };
      mirrorVillagerPositions();
      agentManager.get('v1')!.steering = 'teleport';
      mirrorVillagerPositions();
      delete villagerMobs.v1;
    };
    const figureThenAgent = () => {
      mirrorVillagerPositions(); // no figure yet
      villagerMobs.v1 = { x: 5, z: 6 };
      mirrorVillagerPositions();
      return [villagerMobs.v1, at('v1')];
    };
    syncVillagerAgents([WAT]);
    goOffScreen();
    syncVillagerAgents([{ ...WAT, job: 'defender' }]);
    syncVillagerAgents([{ ...WAT, job: 'miner' }]);
    expect(figureThenAgent()).toEqual([{ x: 5, z: 6 }, [5, 6]]);

    goOffScreen();
    syncVillagerAgents([]);
    syncVillagerAgents([WAT]);
    expect(figureThenAgent()).toEqual([{ x: 5, z: 6 }, [5, 6]]);

    goOffScreen();
    newSession();
    syncVillagerAgents([WAT]);
    expect(figureThenAgent()).toEqual([{ x: 5, z: 6 }, [5, 6]]);
  });
});

describe('the court sync', () => {
  it('gives a court Agent to each revealed NPC of the place the player is in, on any change of its three inputs', () => {
    const nothingDone: string[] = [];
    const nobody: Villager[] = [];
    syncCourtAgents(nothingDone, null, nobody);
    expect(ids()).toEqual(['farmer_alric:court', 'miller_beda:court']);
    // only the destination changes: the King's court, where nobody is revealed yet
    syncCourtAgents(nothingDone, 'template-01', nobody);
    expect(ids()).toEqual([]);
    // only the quests change
    const quests = ['knights_arms', 'squires_errand', 'cozy_beginnings'];
    syncCourtAgents(quests, 'template-01', nobody);
    expect(ids()).toEqual(['king:court', 'queen:court', 'john:court']);
    syncCourtAgents(quests, null, nobody);
    expect(ids()).toEqual(['farmer_alric:court', 'miller_beda:court']);
    // only the roster changes: Alric has joined it, and is the roster sync's from here
    syncCourtAgents(quests, null, [ALRIC]);
    expect(ids()).toEqual(['miller_beda:court']);
  });

  it('spawns an NPC where its figure stands, or failing that where it is authored, and follows the figure after', () => {
    npcMobs.farmer_alric = { x: -41, z: 39 };
    syncCourtAgents([], null, []);
    const beda = NPC_BY_ID.miller_beda;
    expect([at('farmer_alric'), at('miller_beda')]).toEqual([[-41, 39], [beda.x, beda.z]]);
    npcMobs.miller_beda = { x: 1, z: 2 };
    mirrorCourtPositions();
    expect([at('farmer_alric'), at('miller_beda')]).toEqual([[-41, 39], [1, 2]]);
  });

  it('starts over with a new session, from the very same inputs', () => {
    const quests: string[] = [];
    const villagers: Villager[] = [];
    syncCourtAgents(quests, null, villagers);
    const first = agentManager.get('farmer_alric');
    syncCourtAgents(quests, null, villagers);
    expect(agentManager.get('farmer_alric')).toBe(first);

    newSession();
    syncCourtAgents(quests, null, villagers);
    expect(ids()).toEqual(['farmer_alric:court', 'miller_beda:court']);
    expect(agentManager.get('farmer_alric')).not.toBe(first);
  });
});

describe('the roster and the court together', () => {
  it('Alric joining the roster keeps the villager Agent he is given', () => {
    let villagers: Villager[] = [WAT];
    const frame = () => { syncVillagerAgents(villagers); syncCourtAgents([], null, villagers); };
    frame();
    expect(agentManager.get('farmer_alric')?.archetype).toBe('court');

    villagers = [WAT, ALRIC];
    frame();
    expect(agentManager.get('farmer_alric')?.archetype).toBe('villager');

    // still there after the roster changes again (before, he had no Agent from here on, for good)
    villagers = [{ ...WAT }, { ...ALRIC, job: 'farmer' }];
    frame();
    expect(agentManager.get('farmer_alric')?.archetype).toBe('villager');

    // and back to the court if he leaves
    villagers = [WAT];
    frame();
    expect(agentManager.get('farmer_alric')?.archetype).toBe('court');
  });
});

describe('the wildlife sync', () => {
  it('spawns its flock once, and again for a new session', () => {
    syncWildlifeAgents();
    const first = agentManager.get(WILDLIFE_POPULATION[0].id);
    syncWildlifeAgents();
    expect(ids()).toEqual(WILDLIFE_POPULATION.map((w) => `${w.id}:ambient`));
    expect(agentManager.get(WILDLIFE_POPULATION[0].id)).toBe(first);

    newSession();
    syncWildlifeAgents();
    expect(ids()).toEqual(WILDLIFE_POPULATION.map((w) => `${w.id}:ambient`));
  });
});

describe('the scheduled walkers, made live', () => {
  it('a scheduled NPC gets a villager Agent, is mirrored, and starts over with a new session', () => {
    live.walkers = ['farmer_alric'];
    const quests: string[] = [];
    const villagers: Villager[] = [];
    syncCourtAgents(quests, null, villagers);
    expect(ids()).toEqual(['farmer_alric:villager', 'miller_beda:court']);
    npcMobs.farmer_alric = { x: 3, z: 4 };
    mirrorCourtPositions();
    expect(at('farmer_alric')).toEqual([3, 4]);

    newSession();
    syncCourtAgents(quests, null, villagers);
    expect(ids()).toEqual(['farmer_alric:villager', 'miller_beda:court']);
  });

  it('an NPC who starts or stops walking is given a fresh Agent of the right kind', () => {
    syncCourtAgents([], null, []);
    const asCourtier = agentManager.get('farmer_alric');
    live.walkers = ['farmer_alric'];
    syncCourtAgents([], null, []);
    expect(ids()).toEqual(['miller_beda:court', 'farmer_alric:villager']);
    live.walkers = [];
    syncCourtAgents([], null, []);
    expect(ids()).toEqual(['miller_beda:court', 'farmer_alric:court']);
    expect(agentManager.get('farmer_alric')).not.toBe(asCourtier);
  });

  it('a walker who joins the roster keeps the villager Agent the roster gives him', () => {
    // walker and roster villager are the SAME archetype: nothing but the roster taking the id over outright keeps
    // the two syncs from sharing one Agent, which the court sync would then despawn for both
    live.walkers = ['farmer_alric'];
    let villagers: Villager[] = [];
    const frame = () => { syncVillagerAgents(villagers); syncCourtAgents([], null, villagers); };
    frame();
    const asWalker = agentManager.get('farmer_alric');
    expect(asWalker?.archetype).toBe('villager');

    villagers = [ALRIC];
    frame();
    expect(agentManager.get('farmer_alric')?.archetype).toBe('villager');
    expect(agentManager.get('farmer_alric')).not.toBe(asWalker);
    villagers = [{ ...ALRIC, job: 'farmer' }];
    frame();
    expect(agentManager.get('farmer_alric')?.archetype).toBe('villager');
  });
});
