import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { fireCannon, ramCheck } from './siege';
import { KEEP_SOCKETS } from './data/keep';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig, PlacedBuilding } from './types';

// Wave 66 (G-01) · what an engine's loosing and a ram's blow sound like. The lab's siege roles come from
// public/assets/rigs/capabilities.json at run time, which CI has not got, so they are given here as the lab gives them.
const ROLES: Record<string, string> = {
  'oc6096-4': 'catapult', oc6032b2: 'catapult', oc1289: 'catapult', 'oc6096-3': 'stone_thrower',
  oc6096b3: 'siege_tower', oc4806b2: 'crossbow_emplacement', oc4801: 'turret',
};
vi.mock('./data/labCapabilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data/labCapabilities')>()),
  labSiegeRole: (id: string | undefined) => ROLES[id ?? ''] ?? null,
}));

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let sounds: string[] = [];
let now = 100_000;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation(((name: string) => { sounds.push(name); return null; }) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: () => {} } as never);
  sounds = [];
});
afterEach(() => { vi.restoreAllMocks(); });

const engine = (type: string) => ({ id: `e_${type}`, type, x: 0, z: 0, rot: 0, built: 1 }) as PlacedBuilding;

describe('the sound of a siege blow', () => {
  it('looses the throwing arms with the trebuchet, and keeps every other engine its own', () => {
    const heard = (type: string) => {
      sounds = [];
      game().addItems({ stone: 1 });
      fireCannon(engine(type), true, 0);
      return sounds;
    };
    for (const type of ['oc6096-4', 'oc6032b2', 'oc1289', 'oc6096-3']) expect(heard(type), type).toEqual(['trebuchet']);
    expect(heard('oc6096b3')).toEqual(['sword_swish', 'thud']); // Cedric's bomb tower is not a trebuchet
    expect(heard('oc4806b2')).toEqual(['crossbow']);
    expect(heard('oc4801')).toEqual(['crossbow']);
    expect(heard('cannon')).toEqual(['cannon']);
  });

  it('lands each ram blow with the battering ram, on a gate and on a wall', () => {
    const gate = { id: 'g1', type: 'gate', x: 10, z: 10, rot: 0, built: 1 } as PlacedBuilding;
    const wall = { id: 'w1', type: 'wall', x: -10, z: -10, rot: 0, built: 1 } as PlacedBuilding;
    const rammed: string[] = [];
    useGameStore.setState({ buildings: [gate, wall], gateOpen: { g1: false }, damageBuilding: (id: string) => rammed.push(id) } as never);
    ramCheck('ram1', 10, 11);
    expect(sounds).toEqual(['ram', 'drawbridge']); // the blow, then the gate swinging open (toggleGate's own)
    expect(game().gateOpen.g1).toBe(true);
    now += 1000;
    ramCheck('ram1', -10, -11);
    expect(sounds.slice(2)).toEqual(['ram']);
    expect(rammed).toEqual(['w1']);
  });

  it('lands a ram blow on the keep with the battering ram too', () => {
    const north = KEEP_SOCKETS.find((s) => s.id === 'n')!;
    const hit: string[] = [];
    useGameStore.setState({
      keep: { x: 50, z: 50, y: 0, parts: {}, built: {} }, buildings: [],
      damageSitePart: (site: string, id: string) => hit.push(`${site}:${id}`), // wave 67: the keep is socket site 'keep'
    } as never);
    now += 1000;
    ramCheck('ram1', 50 + north.x, 50 + north.z + 0.5);
    expect(sounds).toEqual(['ram']);
    expect(hit).toEqual(['keep:n']);
  });
});
