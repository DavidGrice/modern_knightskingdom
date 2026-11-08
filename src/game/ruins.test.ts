import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import * as THREE from 'three';
import { detonate, explodeBall, ramCheck } from './siege';
import { raiderRamGate } from './raiderRam';
import { findTarget } from './interaction/findTarget';
import { batterKeep, fireEngine } from './enemyAi/blows';
import { useGameStore } from './store/gameStore';
import { villagerMobs } from './villagerMobs';
import { worldEnv } from './env';
import { repairCost } from './repair';
import type { EnemyData } from './combat';
import type { CharacterConfig, PlacedBuilding, SaveGame } from './types';
import RUINS_SAVE from './ruins.main-save.json';

// Wave 68 (G-05) · ruins and repair. A piece a raid batters to 0 HP is left a ruin to rebuild (a building) or lies in
// ruins on its socket (a site's piece); a damaged piece still standing is repaired for its cost times the share of HP
// it has lost; a building keeps the type it was placed as (`baseType`) through the damage phases that overwrite its
// type. And two logged bugs in the loops this rewrote: a blast or a ram reached the buildings of every world at its
// coordinates, and a ram resting against an open gate landed a blow every 0.9 s.
//
// The straight-wall chain comes from public/assets/rigs/capabilities.json at run time, which CI has not got, so it is
// given here as the lab charts it (mc006-8 intact, mc009 phase 2 of 3, mc010 phase 3, ruined); keepGolden.main-save
// and ruins.main-save.json were written the same way. ruins.main-save.json is a save main's own toSave() wrote: a
// Castle Wall rammed once (mc009, 18 HP), another rammed twice (mc010, 6 HP), a Breached Wall placed as it is and a
// stable a dragon left in ruins — none with a baseType.
const PHASE: Record<string, number> = { mc006: 1, mc007: 1, mc008: 1, mc009: 2, mc010: 3 };
vi.mock('./data/labCapabilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data/labCapabilities')>()),
  capOf: (id: string | undefined) => (id && id in PHASE ? { traits: { wall: { structureKind: 'wall_straight', isRuined: id === 'mc010' } } } : null),
  labDamagedForm: (id: string | undefined, frac: number) => {
    if (!id || !(id in PHASE)) return null;
    const target = frac < 1 / 3 ? 3 : frac < 2 / 3 ? 2 : 1;
    return target <= PHASE[id] ? null : target === 2 ? 'mc009' : 'mc010';
  },
  labIntactForm: (id: string | undefined) => (id === 'mc009' || id === 'mc010' ? 'mc006' : null),
  labCanFire: (id: string | undefined) => id === 'oc6096-4', // the siege crew's engine
}));

const HERO: CharacterConfig = { name: 'Ruins', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let sounds: string[] = [];
let notes: string[] = [];
let now = 900_000;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation(((name: string) => { sounds.push(name); return null; }) as never);
  vi.spyOn(audio, 'playAt').mockImplementation((() => null) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: (m: string) => { notes.push(m); }, nodes: [] } as never);
  game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
  useGameStore.setState({ unlocks: [...game().unlocks, 'keep', 'mining'] });
  sounds = [];
  notes = [];
  now += 10_000;
});
afterEach(() => { vi.restoreAllMocks(); });

/** a finished piece written straight into the store */
const put = (id: string, type: string, x: number, z: number, world: string | null = null): PlacedBuilding =>
  ({ id, type, x, z, y: 0, rot: 0, built: 1, world });
const add = (...bs: PlacedBuilding[]) => useGameStore.setState({ buildings: [...game().buildings, ...bs] });
const bld = (id: string) => game().buildings.find((b) => b.id === id);
/** [type, built, ruin, baseType, hp] — what a building is now */
const state = (id: string) => {
  const b = bld(id);
  return b ? [b.type, b.built ?? 1, b.ruin ?? false, b.baseType ?? null, game().buildingHp[id] ?? null] : 'gone';
};
const stone = () => game().inventory.stone ?? 0;
/** one raiders' ram blow at (x, z) — the raiders' ram is no PlacedBuilding — and its cooldown waited out */
const raiderRam = (x: number, z: number) => { ramCheck('raider_ram', x, z); now += 1000; };

describe('a raid leaves ruins', () => {
  it('the raiders\' ram breaches a Castle Wall, then leaves it a ruin in its ruined form, keeping what it was', () => {
    add(put('w1', 'stonewall', 0, 0)); // 10 stone: 30 HP
    raiderRam(0, 1.5);
    expect(state('w1')).toEqual(['mc009', 1, false, 'stonewall', 18]);
    raiderRam(0, 1.5);
    expect(state('w1')).toEqual(['mc010', 1, false, 'stonewall', 6]);
    const before = stone();
    raiderRam(0, 1.5);
    expect(state('w1')).toEqual(['mc010', 0, true, 'stonewall', null]);
    expect(stone()).toBe(before);
    expect(notes.at(-1)).toBe('Castle Wall (Crenellated) was rammed to a smoking ruin! Rebuild it to restore it.');
  });

  it('prices a breached wall\'s HP by the Castle Wall\'s 30 all the way down, not the breach\'s own 21', () => {
    add(put('w1', 'stonewall', 0, 0));
    explodeBall({ id: 1, pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: false });
    expect(state('w1')).toEqual(['mc009', 1, false, 'stonewall', 12]);
    // 9/30 is below a third: ruined. Priced by the breach (9/21), it would still stand breached
    game().damageBuilding('w1', 3, 'was rammed', true);
    expect(state('w1')).toEqual(['mc010', 1, false, 'stonewall', 9]);
  });

  it('one blow that takes a whole wall to 0 leaves the ruin in its ruined form', () => {
    add(put('w1', 'stonewall', 0, 0));
    game().damageBuilding('w1', 45, 'was battered', true);
    expect(state('w1')).toEqual(['mc010', 0, true, 'stonewall', null]);
  });

  it('the player\'s own ram still knocks a wall down for half of what it was placed as', () => {
    add(put('w1', 'stonewall', 0, 0), put('ram', 'warcart', 0, 3));
    for (let i = 0; i < 3; i++) { ramCheck('ram', 0, 1.5); now += 1000; }
    expect(state('w1')).toBe('gone');
    // the Castle Wall's 10 stone halved — main gave back half of the ruined mold's 5, the type it had been turned into
    expect(stone()).toBe(400 + 5);
  });

  it('a siege crew\'s engine leaves the building it batters down a ruin', () => {
    add(put('h1', 'stable', 5, 5)); // 14 wood, 8 plank: 66 HP
    useGameStore.setState({ buildingHp: { h1: 20 } });
    const crew = { id: 'e1', kind: 'siege', siegeAsset: 'oc6096-4', mob: { x: 0, z: 0, yaw: 0, attackCd: 0 } } as unknown as EnemyData;
    fireEngine(crew, game());
    expect(state('h1')).toEqual(['stable', 0, true, 'stable', null]);
  });

  it('a raider\'s blow on the keep leaves the piece in ruins on its socket', () => {
    expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
    game().raiseKeepPart('s', 'wall_low'); // 8 stone: 24 HP
    game().workKeepPart('s', 1);
    const raider = { kind: 'bandit', mob: { attackCd: 0 } } as unknown as EnemyData;
    for (let i = 0; i < 3; i++) batterKeep(raider, game(), { socketId: 's' } as never);
    expect(game().keep).toMatchObject({ parts: { s: 'wall_low' }, built: { s: 0 }, ruined: { s: true }, hp: {} });
  });
});

describe('repair', () => {
  it('costs each material times the share of HP lost, rounded up, and nothing for a whole piece', () => {
    expect(repairCost({ stone: 10 }, 15, 30)).toEqual({ stone: 5 });
    expect(repairCost({ stone: 10 }, 1, 30)).toEqual({ stone: 1 });
    expect(repairCost({ stone: 10, iron_bar: 2 }, 18, 36)).toEqual({ stone: 5, iron_bar: 1 });
    expect(repairCost({ stone: 10 }, 30, 30)).toEqual({ stone: 10 });
    expect(repairCost({ stone: 10 }, 0, 30)).toEqual({});
  });

  it('makes a breached Castle Wall whole: its own type back, its HP full, for 4 of its 10 stone', () => {
    add(put('w1', 'stonewall', 0, 0));
    raiderRam(0, 1.5);
    expect(state('w1')).toEqual(['mc009', 1, false, 'stonewall', 18]);
    game().repairBuilding('w1');
    expect(state('w1')).toEqual(['stonewall', 1, false, 'stonewall', null]);
    expect(stone()).toBe(400 - 4); // 12 of 30 HP lost: 10 x 0.4
    expect(notes.at(-1)).toBe('Castle Wall (Crenellated) repaired.');
    game().repairBuilding('w1'); // whole: nothing to do, nothing paid
    expect(stone()).toBe(396);
  });

  it('will not repair on a short purse, nor a ruin (that is rebuilt)', () => {
    add(put('w1', 'stonewall', 0, 0), put('w2', 'stonewall', 20, 0));
    raiderRam(0, 1.5);
    for (let i = 0; i < 3; i++) raiderRam(20, 1.5);
    useGameStore.setState({ inventory: { ...game().inventory, stone: 3 } });
    game().repairBuilding('w1');
    expect(state('w1')).toEqual(['mc009', 1, false, 'stonewall', 18]);
    expect(notes.at(-1)).toBe('Not enough materials to repair the Castle Wall (Crenellated).');
    useGameStore.setState({ inventory: { ...game().inventory, stone: 400 } });
    game().repairBuilding('w2');
    expect(state('w2')).toEqual(['mc010', 0, true, 'stonewall', null]);
    expect(stone()).toBe(400);
  });

  it('makes a battered gatehouse on the keep whole for its share of stone and iron', () => {
    expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
    game().raiseKeepPart('e', 'gatehouse'); // 10 stone, 2 iron bar: 36 HP
    game().workKeepPart('e', 1);
    game().damageKeepPart('e', 10);
    const before = { ...game().inventory };
    game().repairSitePart('keep', 'e');
    expect(game().keep!.hp).toEqual({});
    expect([stone(), game().inventory.iron_bar]).toEqual([before.stone! - 3, before.iron_bar! - 1]);
    expect(notes.at(-1)).toBe('Gatehouse repaired.');
  });
});

describe('rebuilding a ruin', () => {
  it('a building\'s ruin is raised again as what it was placed as, earning nothing a first raising does', () => {
    add(put('w1', 'stonewall', 0, 0));
    for (let i = 0; i < 3; i++) raiderRam(0, 1.5);
    const xp = game().xp.building;
    for (let i = 0; i < 4; i++) game().constructBuilding('w1', 0.25);
    expect(state('w1')).toEqual(['stonewall', 1, false, 'stonewall', null]);
    expect(game().xp.building).toBe(xp);
  });

  it('the builders raise a keep piece lying in ruins, at their own rate, once no building site waits', () => {
    expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
    game().raiseKeepPart('n', 'wall_crenel');
    game().workKeepPart('n', 1);
    game().damageKeepPart('n', 42);
    add({ ...put('hut', 'stonewall', 30, 30), built: 0 }); // a building site, first in the builders' queue
    useGameStore.setState({ villagers: [{ id: 'b1', name: 'Bo', job: 'builder' }] });
    worldEnv.time = 0.4;
    villagerMobs.b1 = { x: 0, z: -9 }; // by the north run, 2.2 m out
    game().tickVillagers(1);
    expect(game().keep!.built.n).toBe(0); // the site comes first, and he is not standing at it
    useGameStore.setState({ buildings: game().buildings.filter((b) => b.id !== 'hut') });
    game().tickVillagers(10);
    expect(game().keep!.built.n).toBeCloseTo(0.4, 9);
    const xp = game().xp.building;
    game().tickVillagers(15);
    expect(game().keep).toMatchObject({ parts: { n: 'wall_crenel' }, built: { n: 1 }, ruined: {} });
    expect(game().xp.building).toBe(xp);
    expect(notes.at(-1)).toBe('Crenellated Wall rebuilt.');
    delete villagerMobs.b1;
  });
});

describe('a save from before baseType', () => {
  it('repairs a wall the damage had turned into a broken phase to the chain\'s intact wall, and leaves a placed one be', () => {
    game().loadFromSave(JSON.parse(JSON.stringify(RUINS_SAVE)) as SaveGame);
    expect(state('w1')).toEqual(['mc009', 1, false, null, 18]);
    const before = stone();
    game().repairBuilding('w1');
    // phase 1 of the chain, mc006 (10 stone, 30 HP): 12 HP lost is 4 stone
    expect(state('w1')).toEqual(['mc006', 1, false, null, null]);
    expect(stone()).toBe(before - 4);
    // the one rammed twice takes its next blow as an mc006 and goes to ruin as one
    useGameStore.setState({ notify: () => {} } as never);
    game().damageBuilding('w2', 12, 'was rammed', true);
    expect(state('w2')).toEqual(['mc010', 0, true, 'mc006', null]);
    // a Breached Wall placed as it is, never damaged, is itself
    game().damageBuilding('d1', 6, 'was rammed');
    expect(state('d1')).toEqual(['mc009', 1, false, 'mc009', 15]);
    // the dragon's ruin is rebuilt as the stable it was
    game().constructBuilding('h1', 1);
    expect(state('h1')).toEqual(['stable', 1, false, null, null]);
  });
});

describe('the blow\'s own world (ROADMAP: a blast or a ram landed on the buildings of every world)', () => {
  it('a ball bursting at a destination leaves the home building on its coordinates alone', () => {
    add(put('home', 'stonewall', 0, 0), put('away', 'stonewall', 0, 0, 'template-02'));
    explodeBall({ id: 1, pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: false, world: 'template-02' });
    expect([state('home'), state('away')]).toEqual([['stonewall', 1, false, null, null], ['mc009', 1, false, 'stonewall', 12]]);
    explodeBall({ id: 2, pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: false });
    expect(state('home')).toEqual(['mc009', 1, false, 'stonewall', 12]);
  });

  it('a charge set off at a destination leaves the home building on its coordinates alone', () => {
    add(put('home', 'stonewall', 0, 0));
    const charge = put('c1', 'l394101', 3, 0, 'template-02');
    add(charge);
    detonate(charge);
    expect(state('home')).toEqual(['stonewall', 1, false, null, null]);
    expect(bld('c1')).toBeUndefined();
  });

  it('a ram rolling at a destination leaves the home building on its coordinates alone', () => {
    add(put('home', 'stonewall', 0, 0), put('ram', 'warcart', 0, 2, 'template-02'));
    ramCheck('ram', 0, 1.5);
    expect(state('home')).toEqual(['stonewall', 1, false, null, null]);
    expect(sounds).toEqual([]);
  });
});

describe('the ram and an open gate (ROADMAP: it landed a blow every 0.9 s)', () => {
  it('passes an open gate by — no blow, no sound, no cooldown — and bursts a shut one', () => {
    add(put('g1', 'gate', 0, 0), put('w1', 'stonewall', 0, 3.4));
    ramCheck('raider_ram', 0, 1.6); // the open gate at 1.6 m, the wall at 1.8 m
    // the blow goes to the wall behind it, at once: the gate did not start the cooldown
    expect(sounds).toEqual(['ram', 'brick_collide']);
    expect(state('w1')).toEqual(['mc009', 1, false, 'stonewall', 18]);
    sounds = [];
    useGameStore.setState({ buildings: [put('g1', 'gate', 0, 0)] });
    for (let i = 0; i < 4; i++) { ramCheck('raider_ram', 0, 0.5); now += 1000; }
    expect(sounds).toEqual([]);
    useGameStore.setState({ gateOpen: { g1: false } });
    ramCheck('raider_ram', 0, 0.5);
    expect(sounds).toEqual(['ram', 'drawbridge']);
    expect(game().gateOpen.g1).toBe(true);
  });

  it('passes a ruin by too', () => {
    add({ ...put('w1', 'mc010', 0, 0), built: 0, ruin: true, baseType: 'stonewall' });
    ramCheck('raider_ram', 0, 1.5);
    expect(sounds).toEqual([]);
    expect(state('w1')).toEqual(['mc010', 0, true, 'stonewall', null]);
  });

  it('and a building site not yet finished: it is not left a ruin, so its first raising still earns its credit', () => {
    add({ ...put('w1', 'stonewall', 0, 0), built: 0.5 });
    for (let i = 0; i < 4; i++) raiderRam(0, 1.5);
    expect(sounds).toEqual([]);
    expect(state('w1')).toEqual(['stonewall', 0.5, false, null, null]);
    const xp = game().xp.building;
    game().constructBuilding('w1', 1);
    expect(game().xp.building).toBeGreaterThan(xp);
  });
});

describe('what the raiders\' ram makes for', () => {
  it('a shut gate standing at home — not a door shut at a destination, nor a shut gate lying in ruins', () => {
    const away = put('d1', 'door', 5, 5, 'template-02');
    const ruin = { ...put('g0', 'gate', 8, 8), built: 0, ruin: true };
    const home = put('g1', 'gate', 10, 10);
    const shut = { d1: false, g0: false, g1: false };
    expect(raiderRamGate([away, ruin, home], shut)?.id).toBe('g1');
    expect(raiderRamGate([away, ruin, home], { ...shut, g1: true })).toBeUndefined();
  });
});

describe('the repair prompt (beside what a building does, never in its place)', () => {
  const camera = new THREE.PerspectiveCamera();
  /** what the player is offered standing at (x, z), his eye 1.6 up, looking at (lx, ly, lz) */
  const offered = (x: number, z: number, lx: number, ly: number, lz: number) => {
    camera.position.set(x, 1.6, z);
    camera.lookAt(lx, ly, lz);
    camera.updateMatrixWorld(true);
    const t = findTarget({ camera, pos: { current: camera.position.clone() } }, game());
    return t && [t.kind, t.actionable, t.label];
  };

  it('a shut, battered gate still opens on a short purse; its repair is offered at its foot', () => {
    add(put('g1', 'gate', 150, 150));
    useGameStore.setState({ gateOpen: { g1: false }, buildingHp: { g1: 4 }, inventory: { ...game().inventory, iron_bar: 0 } });
    expect(offered(150, 152.5, 150, 1.6, 150)).toEqual(['gate', true, 'Open the Gate']);
    expect(offered(150, 152.5, 150, 0, 150)).toEqual(['repair', false, expect.stringMatching(/^Repair Castle Gate \(4\/\d+\)/)]);
  });

  it('a battered wall, with nothing else to offer, shows its repair looked at straight on', () => {
    add(put('w1', 'stonewall', 150, 150));
    useGameStore.setState({ buildingHp: { w1: 18 } });
    expect(offered(150, 152.5, 150, 1.6, 150)).toEqual(['repair', true, 'Repair Castle Wall (Crenellated) (18/30) — 4 Stone']);
  });
});
