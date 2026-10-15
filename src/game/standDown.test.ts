import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { cartLivePos, cartState, resetCarts } from './carts';
import { crewState, leaveEngine } from './crew';
import { NPC_KING } from './data/world';
import { playerState, resetPlayerState } from './playerState';
import { horses, mountHorse, registerHorse, resetRiding, ridingState } from './riding';
import { standDown } from './standDown';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig, PlacedBuilding } from './types';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();

afterEach(() => {
  resetRiding();
  for (const id of Object.keys(horses)) delete horses[id];
  leaveEngine();
  resetCarts();
  resetPlayerState();
});

describe('standing the player down', () => {
  it('gets a rider off where he is: the horse stays there, in its own scene, its home with it', () => {
    const steed = registerHorse('steed', 'b.glb', 1322.5, 994.25, 'template-02');
    mountHorse('steed');
    Object.assign(playerState, { x: 1301, z: 968, yaw: 0.5 });
    expect(standDown()).toEqual([]);
    expect(ridingState.active).toBe(false);
    expect([steed.x, steed.z, steed.homeX, steed.homeZ, steed.mounted, steed.world]).toEqual([1301, 968, 1301, 968, false, 'template-02']);
  });

  it('steps a crew down from the engine', () => {
    crewState.engineId = 'b7';
    expect(standDown()).toEqual([]);
    expect(crewState.engineId).toBeNull();
  });

  it('lets go of a ram and of a cart, and names each for settling', () => {
    cartState.pushingId = 'ram';
    expect(standDown()).toEqual(['ram']);
    expect(cartState.pushingId).toBeNull();
    cartState.hitchedId = 'cart';
    expect(standDown()).toEqual(['cart']);
    expect(cartState.hitchedId).toBeNull();
  });

  it('leaves a player on foot, and every horse, as they are', () => {
    const herd = registerHorse('herd', 'a.glb', -50, 8);
    Object.assign(playerState, { x: 5, z: 5, yaw: 0 });
    expect(standDown()).toEqual([]);
    expect([herd.x, herd.z, herd.homeX, herd.homeZ, herd.mounted]).toEqual([-50, 8, -50, 8, false]);
  });
});

describe('the knighting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
    vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
    game().newGame(HERO);
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("takes a rider to The King's Approach on foot, his horse left at home where he was", () => {
    const herd = registerHorse('herd', 'a.glb', -50, 8);
    mountHorse('herd');
    Object.assign(playerState, { x: 12, z: 30, yaw: 1 });
    game().beginCeremony('Knight');
    expect(game().destination).toBe('template-01');
    expect(ridingState.active).toBe(false);
    expect([herd.x, herd.z, herd.homeX, herd.homeZ, herd.world]).toEqual([12, 30, 12, 30, null]);
    // ...and he is set before the King, on foot
    expect(playerState.pendingTeleport).toEqual({ x: NPC_KING.x, z: NPC_KING.z - 2.4, yaw: Math.PI });
  });

  it('steps a crew down, and sets a ram down at home where it was', () => {
    const ram: PlacedBuilding = { id: 'ram1', type: 'warcart', x: 0, z: 10, y: 0, rot: 0, built: 1, world: null };
    useGameStore.setState({ buildings: [...game().buildings, ram] });
    cartState.pushingId = 'ram1';
    cartLivePos.ram1 = { x: 3, z: 14 };
    crewState.engineId = 'engine1';
    game().beginCeremony('Paladin');
    expect(game().destination).toBe('template-01');
    expect(crewState.engineId).toBeNull();
    expect(cartState.pushingId).toBeNull();
    expect(game().buildings.find((b) => b.id === 'ram1')).toMatchObject({ x: 3, z: 14, world: null });
    expect(cartLivePos.ram1).toBeUndefined();
  });

  it("stands him down at The King's Approach too, where there is no travel to make", () => {
    game().travelTo('template-01');
    crewState.engineId = 'engine1';
    cartState.hitchedId = 'cart1';
    game().beginCeremony('Marshal');
    expect(crewState.engineId).toBeNull();
    expect(cartState.hitchedId).toBeNull();
  });

  it('runs once: a ceremony already under way is not begun again', () => {
    game().beginCeremony('Knight');
    crewState.engineId = 'engine1';
    game().beginCeremony('Knight');
    expect(crewState.engineId).toBe('engine1');
  });
});
