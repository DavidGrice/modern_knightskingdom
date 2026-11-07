import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { parseSave } from '@/lib/saveSchema';
import { detonate, explodeBall, fireCannon, ramCheck, useSiegeStore } from '../siege';
import { fortState, refreshFort } from '../fort';
import { KEEP_SOCKETS } from '../data/keep';
import { useGameStore } from '../store/gameStore';
import { knockdownRefund, siteSocketWorld, type SocketSite } from './sites';
import type { CharacterConfig, PlacedBuilding } from '../types';
import MAIN_SAVE from '../keepGolden.main-save.json';

// Wave 67 (G-36) · the socket-site model the keep became one of. keepGolden.test.ts holds the keep to what it did
// before; these hold what is new: where a turned site's sockets stand, a second site in another world going through
// fill, build, damage and a save of its own without the keep, and damage reaching only the sites in its own world.

const HERO: CharacterConfig = { name: 'Sites', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
let now = 500_000;

beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  game().newGame(HERO);
  useGameStore.setState({ notify: () => {}, nodes: [] } as never);
  game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
  useGameStore.setState({ unlocks: [...game().unlocks, 'keep', 'mining'] });
  now += 10_000;
});
afterEach(() => { vi.restoreAllMocks(); });

/** fort.ts's own footprint for a keep socket, as it stamped it before sites (keep x/z + the socket's, and halves by
 *  kind and facing) */
function oldFortFootprint(kx: number, kz: number, s: (typeof KEEP_SOCKETS)[number]) {
  const alongX = s.kind !== 'wall' || Math.abs(Math.sin(s.yaw)) < 0.5;
  const hx = s.kind === 'wall' ? (alongX ? 4 : 1.2) : 2;
  const hz = s.kind === 'wall' ? (alongX ? 1.2 : 4) : 2;
  return { x: kx + s.x, z: kz + s.z, hx, hz };
}

const at = (x: number, z: number, rot?: number) => ({ x, z, rot, layout: 'grandKeep' as const });
const foot = (site: ReturnType<typeof at>, id: string) => {
  const w = siteSocketWorld(site, id)!;
  return { x: w.x, z: w.z, hx: w.hx, hz: w.hz };
};

describe('siteSocketWorld', () => {
  it('stands every socket where fort.ts\'s footprints had it, to the bit, at rot 0', () => {
    for (const [kx, kz] of [[0, 0], [3.7, -12.25], [-41.3, 7.1]]) {
      for (const s of KEEP_SOCKETS) {
        expect(foot(at(kx, kz), s.id), s.id).toEqual(oldFortFootprint(kx, kz, s));
        expect(foot(at(kx, kz, 0), s.id), s.id).toEqual(oldFortFootprint(kx, kz, s));
        expect(siteSocketWorld(at(kx, kz), s.id)!.yaw).toBe(s.yaw);
      }
    }
    expect(siteSocketWorld(at(0, 0), 'nowhere')).toBeNull();
  });

  it('turns a quarter the way three turns a group: each socket stands where its neighbour stood, on its exact footprint', () => {
    // rotation-y by +π/2 takes local (x, z) to (z, -x): the north run comes round to the west, the north-west corner to
    // the south-west — so the turned ring covers the very ground the unturned one did
    const turned = at(10, -4, Math.PI / 2);
    const moves: Record<string, string> = { nw: 'sw', ne: 'nw', se: 'ne', sw: 'se', n: 'w', e: 'n', s: 'e', w: 's', hall: 'hall' };
    for (const [from, to] of Object.entries(moves)) {
      const a = foot(turned, from);
      const b = foot(at(10, -4), to);
      expect(a.x, from).toBeCloseTo(b.x, 12);
      expect(a.z, from).toBeCloseTo(b.z, 12);
      expect([a.hx, a.hz], from).toEqual([b.hx, b.hz]); // exact: a quarter turn's 6e-17 is no width
    }
    expect(siteSocketWorld(turned, 'n')!.yaw).toBeCloseTo(Math.PI / 2, 12);
  });

  it('turns an odd angle about the site\'s origin, and bounds the turned footprint', () => {
    const rot = Math.PI / 6; // 30°
    const site = at(5, 5, rot);
    for (const s of KEEP_SOCKETS) {
      const w = siteSocketWorld(site, s.id)!;
      // the socket's layout position turned by `rot` (three's rotation-y), then laid at the origin
      expect(w.x, s.id).toBeCloseTo(5 + s.x * Math.cos(rot) + s.z * Math.sin(rot), 12);
      expect(w.z, s.id).toBeCloseTo(5 - s.x * Math.sin(rot) + s.z * Math.cos(rot), 12);
      expect(Math.hypot(w.x - 5, w.z - 5), s.id).toBeCloseTo(Math.hypot(s.x, s.z), 12);
      expect(w.yaw, s.id).toBeCloseTo(s.yaw + rot, 12);
      // the four corners of the piece's own rectangle, turned to its facing, lie on the bounds
      const [along, across] = s.kind === 'wall' ? [4, 1.2] : [2, 2];
      let mx = 0;
      let mz = 0;
      for (const [u, v] of [[along, across], [along, -across], [-along, across], [-along, -across]]) {
        mx = Math.max(mx, Math.abs(u * Math.cos(w.yaw) + v * Math.sin(w.yaw)));
        mz = Math.max(mz, Math.abs(-u * Math.sin(w.yaw) + v * Math.cos(w.yaw)));
      }
      expect(w.hx, s.id).toBeCloseTo(mx, 12);
      expect(w.hz, s.id).toBeCloseTo(mz, 12);
    }
    // the north run at 30°: 4 cos 30° + 1.2 sin 30° across X
    expect(siteSocketWorld(site, 'n')!.hx).toBeCloseTo(4 * Math.cos(rot) + 1.2 * Math.sin(rot), 12);
  });
});

/** a home keep with a finished north run, at the origin */
function homeKeep() {
  expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
  game().raiseKeepPart('n', 'wall_crenel');
  game().workKeepPart('n', 1);
  return game().keep!;
}
/** a second site, at a destination, laid on the same coordinates as the home keep and turned an odd angle */
const CAMP: SocketSite = { id: 'camp', world: 'template-02', x: 0, z: 0, rot: Math.PI / 6, layout: 'grandKeep', parts: {}, built: {} };
const camp = () => game().sites.find((s) => s.id === 'camp')!;

describe('a second socket site', () => {
  it('fills, builds, takes damage and is knocked down with its refund, and never touches the keep', () => {
    const keep = homeKeep();
    useGameStore.setState({ sites: [CAMP] });
    const before = { ...game().inventory };
    game().raiseSitePart('camp', 'n', 'wall_low');
    game().raiseSitePart('camp', 'n', 'wall_crenel'); // taken
    game().raiseSitePart('camp', 'nw', 'wall_low');   // will not stand on a corner
    expect(camp()).toEqual({ ...CAMP, parts: { n: 'wall_low' }, built: { n: 0 } });
    expect(game().inventory.stone).toBe(before.stone! - 8);
    game().workSitePart('camp', 'n', 0.5);
    game().workSitePart('camp', 'n', 0.5);
    expect(camp().built).toEqual({ n: 1 });
    game().damageSitePart('camp', 'n', 10);
    expect(camp().hp).toEqual({ n: 14 }); // a low wall: 8 stone x 3
    game().damageSitePart('camp', 'n', 14, 'was battered down');
    expect(camp()).toEqual({ ...CAMP, parts: {}, built: {}, hp: {} });
    expect(game().inventory.stone).toBe(before.stone! - 8 + 4);
    expect(game().keep).toBe(keep);
  });

  it('saves and loads with the game, beside the keep, and a save from before sites loads with none', () => {
    homeKeep();
    useGameStore.setState({ sites: [CAMP] });
    game().raiseSitePart('camp', 'e', 'gatehouse');
    game().workSitePart('camp', 'e', 1);
    game().damageSitePart('camp', 'e', 6);
    const keep = game().keep;
    const sites = game().sites;
    const text = JSON.stringify(game().toSave());
    const check = parseSave(text);
    expect(check.ok).toBe(true);
    game().newGame(HERO);
    game().loadFromSave(JSON.parse(text));
    expect(game().sites).toEqual(sites);
    expect(game().sites[0]).toEqual({ ...CAMP, parts: { e: 'gatehouse' }, built: { e: 1 }, hp: { e: 30 } });
    expect(game().keep).toEqual(keep);
    // main's own save has no `sites`: it loads with none, and is written back with an empty list beside its keep
    game().loadFromSave(JSON.parse(JSON.stringify(MAIN_SAVE)));
    expect(game().sites).toEqual([]);
    expect(game().toSave().sites).toEqual([]);
    expect(game().toSave().keep).toEqual(MAIN_SAVE.keep);
  });

  it('carries the keep\'s ruins and gates with its foundation when it is moved', () => {
    homeKeep();
    useGameStore.setState({ keep: { ...game().keep!, ruined: { n: true }, gateOpen: { e: false } } });
    game().pickupKeep();
    game().cancelMove();
    expect(game().keep).toMatchObject({ parts: { n: 'wall_crenel' }, ruined: { n: true }, gateOpen: { e: false } });
  });
});

describe('damage by world', () => {
  // here the camp lies unturned, every socket on the very coordinates of the home keep's
  const FLAT: SocketSite = { ...CAMP, rot: 0 };

  it('a blast reaches the sites of the world it bursts in, and only those', () => {
    homeKeep();
    useGameStore.setState({ sites: [FLAT] });
    game().raiseSitePart('camp', 'n', 'wall_crenel');
    game().workSitePart('camp', 'n', 1);
    const keep = game().keep;
    const n = siteSocketWorld(camp(), 'n')!;
    expect([n.x, n.z]).toEqual([0, -6.8]);
    // a ball on the camp's north run, at its destination
    explodeBall({ id: 1, pos: { x: n.x, y: 0, z: n.z }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true, world: 'template-02' });
    expect(camp().hp).toEqual({ n: 42 - 18 });
    expect(game().keep).toBe(keep);
    // one on the home keep's north run, at home: the camp's piece on the same spot is in another world
    explodeBall({ id: 2, pos: { x: 0, y: 0, z: -6.8 }, vel: { x: 0, y: 0, z: 0 }, byPlayer: true });
    expect(game().keep!.hp).toEqual({ n: 42 - 18 });
    expect(camp().hp).toEqual({ n: 24 });
  });

  it('a charge blasts the sites of its own world: one set off at the camp leaves the home keep\'s piece alone', () => {
    homeKeep();
    useGameStore.setState({ sites: [FLAT] });
    game().raiseSitePart('camp', 'n', 'wall_crenel');
    game().workSitePart('camp', 'n', 1);
    const n = siteSocketWorld(camp(), 'n')!;
    // 3 m along the camp's north run, at its destination: the home keep's north run lies on the same coordinates
    const charge = { id: 'c9', type: 'charge', x: n.x + 3, z: n.z, rot: 0, built: 1, world: 'template-02' } as PlacedBuilding;
    useGameStore.setState({ buildings: [...game().buildings, charge], destination: 'template-02' });
    detonate(charge);
    expect(camp().parts.n).toBeUndefined(); // 45 on a 42 HP run: knocked down
    expect(game().keep!.parts.n).toBe('wall_crenel');
    expect(game().keep!.hp).toBeUndefined();
  });

  it('a ball keeps the world of the engine that loosed it, wherever the player is', () => {
    homeKeep();
    useGameStore.setState({ sites: [CAMP] });
    game().raiseSitePart('camp', 'n', 'wall_crenel');
    game().workSitePart('camp', 'n', 1);
    useSiegeStore.setState({ balls: [] });
    const engine = (world: string | null) => ({ id: `c_${world}`, type: 'cannon', x: 0, z: -10, rot: 0, built: 1, world }) as PlacedBuilding;
    // the player away at the camp's world while a home cannon fires: its ball is a home ball
    useGameStore.setState({ destination: 'template-02' });
    fireCannon(engine(null), false, 0);
    fireCannon(engine('template-02'), true, 0);
    expect(useSiegeStore.getState().balls.map((b) => b.world)).toEqual([null, 'template-02']);
  });

  it('a ram rams the sites of its own world: a placed ram\'s, and home for the raiders\'', () => {
    homeKeep();
    useGameStore.setState({ sites: [FLAT] });
    game().raiseSitePart('camp', 'n', 'wall_crenel');
    game().workSitePart('camp', 'n', 1);
    const n = siteSocketWorld(camp(), 'n')!;
    const ram = { id: 'ram9', type: 'oc4806', x: n.x, z: n.z, rot: 0, built: 1, world: 'template-02' } as PlacedBuilding;
    useGameStore.setState({ buildings: [...game().buildings, ram], destination: 'template-02' });
    ramCheck('ram9', n.x, n.z - 0.7);
    expect(camp().hp).toEqual({ n: 30 });
    expect(game().keep!.hp).toBeUndefined();
    now += 1000;
    // the raiders' ram (no PlacedBuilding) at the home keep's north run, the player still away
    ramCheck('raiderRam', 0, -7.5);
    expect(game().keep!.hp).toEqual({ n: 30 });
    expect(camp().hp).toEqual({ n: 30 });
  });

  it('the seal counts the sites at home, turned, and none elsewhere', () => {
    useGameStore.setState({ buildings: [{ id: 'w9', type: 'stonewall', x: 12, z: -12, rot: 0, built: 1, world: null }] });
    const ring = { parts: {} as Record<string, string>, built: {} as Record<string, number> };
    for (const s of ['nw', 'ne', 'se', 'sw']) { ring.parts[s] = 'corner_block'; ring.built[s] = 1; }
    for (const s of ['n', 'e', 's', 'w']) { ring.parts[s] = 'wall_low'; ring.built[s] = 1; }
    useGameStore.setState({ sites: [{ ...CAMP, ...ring }] });
    refreshFort(true);
    expect(fortState.enclosed).toBe(false); // a ring at a destination seals nothing at home
    useGameStore.setState({ sites: [{ ...CAMP, ...ring, id: 'tower', world: null, rot: Math.PI / 2 }] });
    refreshFort(true);
    // a quarter-turned ring at home seals what the keep's own ring did (keepGolden.test.ts: 77 m²)
    expect({ enclosed: fortState.enclosed, area: fortState.area }).toEqual({ enclosed: true, area: 77 });
  });
});

describe('knockdownRefund', () => {
  it('gives back half of each material, rounded down, and nothing of one worth less than two', () => {
    expect(knockdownRefund({ stone: 7, plank: 4, iron_bar: 1 })).toEqual({ stone: 3, plank: 2 });
  });
});
