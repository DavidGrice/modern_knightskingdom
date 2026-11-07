import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { detonate, explodeBall, ramCheck } from './siege';
import { fortState, insideWalls, refreshFort } from './fort';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig, PlacedBuilding, SaveGame } from './types';
import MAIN_SAVE from './keepGolden.main-save.json';

// Wave 67 (G-36) · golden tests of the Grand Keep as it behaved while it was the game's one socket model: placing it,
// filling and building its sockets, siege damage (a piece at 0 HP deleted with half its materials back), the fort seal's
// footprints, the cannonball's and the charge's splash, the ram, and a save round trip. Written and passing on main
// before the keep became one socket site among many, and kept unchanged after it. keepGolden.main-save.json is a save
// main's own toSave() wrote (a keep with a damaged turret, a half-built wall, a knocked-down bastion's refund, a gate).

const HERO: CharacterConfig = { name: 'Golden', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let sounds: string[] = [];
let notes: string[] = [];
let now = 100_000;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation(((name: string) => { sounds.push(name); return null; }) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: (m: string) => { notes.push(m); }, nodes: [] } as never);
  game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
  useGameStore.setState({ unlocks: [...game().unlocks, 'keep', 'mining'] });
  sounds = [];
  notes = [];
  now += 10_000; // past any ram cooldown an earlier test left
});
afterEach(() => { vi.restoreAllMocks(); });

const lay = (x = 0, z = 0) => {
  expect(game().placeBuilding('keep', x, z, 0)).toBe(true);
  sounds = [];
  notes = [];
};
/** raise and finish a piece on a socket */
const stand = (socketId: string, partId: string) => {
  game().raiseKeepPart(socketId, partId);
  game().workKeepPart(socketId, 1);
};
const inv = () => ({ ...game().inventory });
/** cells of the fort lattice within 9 m of (x0, z0) each way that the flood from outside never reached: the ring's own
 *  stamped cells and the ground it seals */
const notOutside = (x0: number, z0: number) => {
  let n = 0;
  for (let z = z0 - 9; z <= z0 + 9; z++) for (let x = x0 - 9; x <= x0 + 9; x++) if (insideWalls(x, z)) n++;
  return n;
};

describe('the Grand Keep, as main had it (G-36 golden)', () => {
  it('lays the foundation: one keep PlacedBuilding and an empty KeepState, at the foundation\'s cost', () => {
    const before = inv();
    lay(0, 4);
    expect(game().keep).toEqual({ x: 0, z: 4, y: 0, parts: {}, built: {} });
    expect(game().buildings).toEqual([{ id: game().buildings[0].id, type: 'keep', x: 0, z: 4, y: 0, rot: 0, built: 1, world: null }]);
    expect(inv()).toEqual({ ...before, stone: before.stone! - 12, plank: before.plank! - 6 });
    expect(game().placeBuilding('keep', 0, 4, 0)).toBe(false);
    expect(game().buildings.filter((b) => b.type === 'keep')).toHaveLength(1);
  });

  it('fills a socket: pays the bill and stakes it at 0, and refuses a wrong kind, a taken socket and a short purse', () => {
    lay();
    const before = inv();
    game().raiseKeepPart('nw', 'wall_low');
    expect(game().keep!.parts).toEqual({});
    expect(notes.at(-1)).toBe('A low wall will not stand on north-west corner.');
    game().raiseKeepPart('nw', 'corner_turret');
    expect(game().keep).toEqual({ x: 0, z: 0, y: 0, parts: { nw: 'corner_turret' }, built: { nw: 0 } });
    expect(inv()).toEqual({ ...before, stone: before.stone! - 16, wood: before.wood! - 4 });
    expect(notes.at(-1)).toBe('Corner Turret staked out on North-West Corner — now build it.');
    expect(sounds).toEqual(['brick_link']);
    game().raiseKeepPart('nw', 'corner_block');
    expect(notes.at(-1)).toBe('North-West Corner is already taken.');
    useGameStore.setState({ inventory: { ...inv(), iron_bar: 1 } });
    game().raiseKeepPart('e', 'gatehouse');
    expect(game().keep!.parts.e).toBeUndefined();
    expect(notes.at(-1)).toBe('Not enough Iron Bar for a Gatehouse.');
    expect(game().keep!.parts).toEqual({ nw: 'corner_turret' });
  });

  it('builds it up: hammer work to 1, the XP once, the count of what is left, then nothing more', () => {
    lay();
    game().raiseKeepPart('nw', 'corner_turret');
    const xp = game().xp.building;
    game().workKeepPart('nw', 0.5);
    expect(game().keep!.built.nw).toBe(0.5);
    expect(game().xp.building).toBe(xp);
    game().workKeepPart('nw', 0.7);
    expect(game().keep!.built.nw).toBe(1);
    expect(game().xp.building).toBe(xp + 55);
    expect(notes.at(-1)).toBe('Corner Turret raised. 8 to go.');
    game().workKeepPart('nw', 0.5);
    game().workKeepPart('ne', 0.5); // a bare socket takes no work
    expect(game().keep).toEqual({ x: 0, z: 0, y: 0, parts: { nw: 'corner_turret' }, built: { nw: 1 } });
    expect(game().xp.building).toBe(xp + 55);
  });

  it('announces the castle complete when the ninth piece is raised', () => {
    lay();
    for (const s of ['nw', 'ne', 'se', 'sw']) stand(s, 'corner_block');
    for (const s of ['n', 'e', 's']) stand(s, 'wall_low');
    stand('w', 'gatehouse');
    expect(notes).not.toContain('Your castle stands complete.');
    game().raiseKeepPart('hall', 'great_hall');
    game().workKeepPart('hall', 1);
    expect(notes.slice(-2)).toEqual(['Great Hall raised. 0 to go.', 'Your castle stands complete.']);
    expect(sounds.slice(-2)).toEqual(['brick_link', 'treasure']);
  });

  it('takes siege damage on a finished piece only, and knocks it down at 0 HP with half its materials back', () => {
    lay();
    game().raiseKeepPart('nw', 'corner_turret');
    game().damageKeepPart('nw', 10); // a construction ghost has nothing standing to knock down
    expect(game().keep!.hp).toBeUndefined();
    game().workKeepPart('nw', 1);
    game().damageKeepPart('nw', 25);
    expect(game().keep!.hp).toEqual({ nw: 35 }); // maxHpForPart: (16 stone + 4 wood) x 3 = 60
    expect(sounds.at(-1)).toBe('brick_collide');
    game().damageKeepPart('nw', 34);
    expect(game().keep!.hp).toEqual({ nw: 1 });
    const before = inv();
    game().damageKeepPart('nw', 1, 'was rammed');
    expect(game().keep).toEqual({ x: 0, z: 0, y: 0, parts: {}, built: {}, hp: {} });
    expect(inv()).toEqual({ ...before, stone: before.stone! + 8, wood: before.wood! + 2 });
    expect(notes.at(-1)).toBe('Corner Turret was rammed! Half materials recovered.');
    game().damageKeepPart('nw', 5); // a bare socket again
    expect(game().keep).toEqual({ x: 0, z: 0, y: 0, parts: {}, built: {}, hp: {} });
  });

  it('refunds half of each material, rounded down, and words the default cause', () => {
    lay();
    stand('hall', 'great_hall'); // 20 stone, 12 wood, 8 plank: 120 HP
    stand('e', 'gatehouse');     // 10 stone, 2 iron bar: 36 HP
    const before = inv();
    game().damageKeepPart('hall', 120);
    game().damageKeepPart('e', 36);
    expect(inv()).toEqual({
      ...before, stone: before.stone! + 10 + 5, wood: before.wood! + 6, plank: before.plank! + 4, iron_bar: before.iron_bar! + 1,
    });
    expect(notes.slice(-2)).toEqual([
      'Great Hall was battered down! Half materials recovered.', 'Gatehouse was battered down! Half materials recovered.',
    ]);
    expect(game().keep!.parts).toEqual({});
  });

  it('seals ground with the old footprints: a ring of eight finished pieces walls in the bailey', () => {
    lay();
    // a wall standing elsewhere: the seal counts only once some barrier stands (fort.ts)
    useGameStore.setState({ buildings: [...game().buildings, { id: 'w9', type: 'stonewall', x: 12, z: -12, rot: 0, built: 1, world: null }] });
    for (const s of ['nw', 'ne', 'se', 'sw']) stand(s, 'corner_block');
    for (const s of ['n', 'e', 's']) stand(s, 'wall_low');
    game().raiseKeepPart('w', 'wall_crenel'); // staked out, not finished: a hole in the ring
    refreshFort(true);
    expect(fortState.enclosed).toBe(false);
    game().workKeepPart('w', 1);
    refreshFort(true);
    expect({ ...fortState }).toEqual({ enclosed: true, ring: 0, doors: 0, area: 77, longestRun: 1 });
    // the ring's outer edge: every cell from -8 to 8 each way is sealed or stamped, and none beyond
    expect(notOutside(0, 0)).toBe(289);
    // a finished great hall fills the bailey's middle: the homestead's centre is under it, not walled in
    stand('hall', 'great_hall');
    refreshFort(true);
    expect(fortState.enclosed).toBe(false);
  });

  it('seals with each socket\'s own footprint, off the origin too, whatever stands in it', () => {
    lay(2, -2);
    useGameStore.setState({ buildings: [...game().buildings, { id: 'w9', type: 'stonewall', x: -13, z: 12, rot: 0, built: 1, world: null }] });
    for (const s of ['nw', 'ne', 'se', 'sw']) stand(s, 'corner_turret');
    for (const s of ['n', 's']) stand(s, 'wall_crenel');
    for (const s of ['e', 'w']) stand(s, 'wall_low');
    refreshFort(true);
    // the homestead's centre (0, 0) is inside this ring too
    expect({ ...fortState }).toEqual({ enclosed: true, ring: 0, doors: 0, area: 77, longestRun: 1 });
    expect(notOutside(2, -2)).toBe(289);
  });

  it('takes a cannonball\'s splash: 18 to every finished piece whose socket is within 3.2 m, and leaves the foundation be', () => {
    lay();
    stand('nw', 'corner_turret'); // (-6, -6)
    stand('n', 'wall_crenel');    // (0, -6.8)
    stand('w', 'wall_low');       // (-6.8, 0)
    game().raiseKeepPart('ne', 'corner_block'); // (6, -6), staked only
    const foundation = game().buildings.find((b) => b.type === 'keep')!;
    explodeBall({ id: 1, pos: { x: -3, y: 0, z: -6.4 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true });
    // nw at 3.03 m and n at 3.0 m are in; w at 7.0 m is not
    expect(game().keep!.hp).toEqual({ nw: 60 - 18, n: 42 - 18 });
    explodeBall({ id: 2, pos: { x: 6, y: 0, z: -6 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: false });
    expect(game().keep!.hp).toEqual({ nw: 42, n: 24 });
    expect(game().buildings).toContainEqual(foundation);
    // a ball on the foundation's centre reaches no socket but the hall's, which is bare
    explodeBall({ id: 3, pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true });
    expect(game().keep!.hp).toEqual({ nw: 42, n: 24 });
    expect(game().buildings).toContainEqual(foundation);
  });

  it('takes a charge\'s blast: 45 within 5 m, enough to bring a low wall down with its refund', () => {
    lay();
    stand('n', 'wall_low');      // 8 stone: 24 HP
    stand('ne', 'corner_turret'); // 60 HP
    stand('s', 'wall_crenel');   // far side
    const charge: PlacedBuilding = { id: 'c1', type: 'charge', x: 3, z: -6.8, rot: 0, built: 1, world: null };
    useGameStore.setState({ buildings: [...game().buildings, charge] });
    const before = inv();
    detonate(charge);
    expect(game().keep!.parts).toEqual({ ne: 'corner_turret', s: 'wall_crenel' });
    expect(game().keep!.hp).toEqual({ ne: 15 });
    expect(inv()).toEqual({ ...before, stone: before.stone! + 4 });
    expect(notes).toContain('Low Wall was blown apart! Half materials recovered.');
    expect(game().buildings.some((b) => b.id === 'c1')).toBe(false);
    expect(game().buildings.some((b) => b.type === 'keep')).toBe(true);
  });

  it('takes a ram blow of 12 on the first socket within 2.1 m, once per 900 ms, with the ram\'s own sound', () => {
    lay();
    stand('n', 'wall_crenel');
    stand('nw', 'corner_block');
    sounds = [];
    ramCheck('ram1', 0, -7.5);
    expect(game().keep!.hp).toEqual({ n: 42 - 12 });
    expect(sounds).toEqual(['ram', 'brick_collide']);
    now += 500;
    ramCheck('ram1', 0, -7.5); // still cooling down
    expect(game().keep!.hp).toEqual({ n: 30 });
    now += 500;
    ramCheck('ram1', -6, -7.9); // nw at 1.9 m
    expect(game().keep!.hp).toEqual({ n: 30, nw: 30 - 12 });
    now += 1000;
    ramCheck('ram1', 0, -9.5); // 2.7 m off the north run: nothing
    expect(game().keep!.hp).toEqual({ n: 30, nw: 18 });
    // a socket the ram reaches with nothing finished on it still takes the blow, and nothing comes of it
    sounds = [];
    ramCheck('ram1', 6.8, 0.5);
    expect(sounds).toEqual(['ram']);
    expect(game().keep!.hp).toEqual({ n: 30, nw: 18 });
    now += 500;
    ramCheck('ram1', 0, -7.5);
    expect(game().keep!.hp).toEqual({ n: 30, nw: 18 }); // that empty blow started the cooldown
  });

  it('round-trips a save: the keep and its foundation come back exactly as they went', () => {
    lay(0, 4);
    stand('nw', 'corner_turret');
    game().raiseKeepPart('n', 'wall_crenel');
    game().workKeepPart('n', 0.4);
    stand('e', 'gatehouse');
    game().damageKeepPart('nw', 25);
    const save = JSON.parse(JSON.stringify(game().toSave())) as SaveGame;
    expect(save.keep).toEqual({
      x: 0, z: 4, y: 0, parts: { nw: 'corner_turret', n: 'wall_crenel', e: 'gatehouse' }, built: { nw: 1, n: 0.4, e: 1 }, hp: { nw: 35 },
    });
    game().newGame(HERO);
    game().loadFromSave(save);
    expect(game().keep).toEqual(save.keep);
    expect(game().buildings).toEqual(save.buildings);
    expect(game().toSave().keep).toEqual(save.keep);
  });

  it('loads a save main\'s own toSave wrote, and writes its keep and buildings back unchanged', () => {
    const fixture = MAIN_SAVE as unknown as SaveGame;
    game().loadFromSave(JSON.parse(JSON.stringify(fixture)));
    expect(game().keep).toEqual(fixture.keep);
    expect(game().keep).toEqual({
      x: 0, z: 4, y: 0,
      parts: { nw: 'corner_turret', n: 'wall_crenel', e: 'gatehouse', hall: 'great_hall' },
      built: { nw: 1, n: 0.4, e: 1, hall: 1 },
      hp: { nw: 35, e: 29 },
    });
    const again = JSON.parse(JSON.stringify(game().toSave()));
    expect(again.keep).toEqual(fixture.keep);
    expect(again.buildings).toEqual(fixture.buildings);
    expect(again.inventory).toEqual(fixture.inventory);
    const { savedAt: _a, ...rest } = again;
    const { savedAt: _b, ...orig } = fixture;
    expect(rest).toMatchObject(orig);
    // and the castle on it goes on taking damage as it did
    useGameStore.setState({ notify: () => {} } as never);
    game().damageKeepPart('e', 29);
    expect(game().keep!.parts.e).toBeUndefined();
    expect(game().inventory.stone).toBe(fixture.inventory.stone! + 5);
  });
});
