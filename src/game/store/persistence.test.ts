import { describe, expect, it, vi } from 'vitest';
import { useGameStore } from './gameStore';
import { stabledHorses } from '../riding';
import type { CharacterConfig, PlacedBuilding } from '../types';

// a version no save has had, so a save stamped with the literal 1 shows
vi.mock('@/lib/saveSchema', async (actual) => ({ ...(await actual<typeof import('@/lib/saveSchema')>()), SAVE_VERSION: 7 }));

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const WALL: PlacedBuilding = { id: 'b900', type: 'stonewall', x: 12, z: -6, y: 0, rot: 1, built: 1, world: null };
const PARTS = { nw: 'corner_turret', n: 'wall_crenel' };
const BUILT = { nw: 1, n: 0.4 };
const HP = { nw: 31 };

/** a game with a damaged stone wall, and the keep founded at (0, 4) with two parts on it */
function holdfast() {
  game().newGame(HERO);
  useGameStore.setState({ buildings: [WALL], buildingHp: { b900: 37 } });
  game().foundKeep(0, 4, 0);
  useGameStore.setState({ keep: { ...game().keep!, parts: PARTS, built: BUILT, hp: HP } });
  return game().buildings.find((b) => b.type === 'keep')!;
}
const count = (bs: PlacedBuilding[], id: string) => bs.filter((b) => b.id === id).length;

describe('a save taken while a piece is carried (F-09)', () => {
  it('holds a carried building where it was picked up, and the live carry goes on, set down once', () => {
    holdfast();
    game().pickupBuilding('b900');
    const save = game().toSave();
    expect(save.buildings.find((b) => b.id === 'b900')).toEqual(WALL);
    expect(save.buildingHp?.b900).toBe(37);
    // only the save was patched
    expect(count(game().buildings, 'b900')).toBe(0);
    expect(game().movingBuilding).toEqual(WALL);
    expect(game().finishMove(12, 10, 0)).toBe(true);
    expect(count(game().buildings, 'b900')).toBe(1);
    expect(count(game().toSave().buildings, 'b900')).toBe(1);
  });

  it('holds the carried keep whole on its foundation, sockets and HP alike, while the live game still carries it', () => {
    const foundation = holdfast();
    game().pickupKeep();
    const save = game().toSave();
    expect(save.keep).toEqual({ x: 0, z: 4, parts: PARTS, built: BUILT, hp: HP });
    expect(save.buildings.filter((b) => b.type === 'keep')).toEqual([foundation]);
    expect(count(save.buildings, 'b900')).toBe(1);
    expect(game().keep).toBeNull();
    expect(game().buildings.some((b) => b.type === 'keep')).toBe(false);
    expect(game().movingBuilding).toEqual(foundation);
    game().cancelMove();
    expect(game().keep).toMatchObject({ x: 0, z: 4, parts: PARTS, built: BUILT, hp: HP });
    expect(game().toSave().buildings.filter((b) => b.type === 'keep')).toEqual([foundation]);
  });

  it('loads back as it was picked up', () => {
    const foundation = holdfast();
    game().pickupKeep();
    const save = JSON.parse(JSON.stringify(game().toSave()));
    game().loadFromSave(save);
    expect(game().movingBuilding).toBeNull();
    expect(game().keep).toMatchObject({ x: 0, z: 4, parts: PARTS, built: BUILT, hp: HP });
    expect(game().buildings.filter((b) => b.type === 'keep')).toEqual([foundation]);
  });
});

describe('what a save is stamped and filled with', () => {
  it('carries SAVE_VERSION, not a literal', () => {
    holdfast();
    expect(game().toSave().version).toBe(7);
  });

  it("saves the stable from riding.ts's leaf module, and loads it back there, with no copy in the store (OD-17)", () => {
    holdfast();
    const save = { ...game().toSave(), stabled: ['herd_2'], mounts: { v1: 'herd_2' } };
    game().loadFromSave(save);
    expect(stabledHorses.ids).toEqual(['herd_2']);
    expect(stabledHorses.assigned).toEqual({ v1: 'herd_2' });
    expect('stabled' in game()).toBe(false);
    expect('mounts' in game()).toBe(false);
    game().stableHorse('herd_3');
    expect(game().toSave()).toMatchObject({ stabled: ['herd_2', 'herd_3'], mounts: { v1: 'herd_2' } });
    // a save from before the stable existed loads with it empty
    const { stabled: _s, mounts: _m, ...old } = save;
    game().loadFromSave(old);
    expect(stabledHorses.ids).toEqual([]);
    expect(game().toSave()).toMatchObject({ stabled: [], mounts: {} });
  });
});
