import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RALLY_HOLD, RALLY_REACH, holdWithin, lookPoint, rallyFoe, rallySpot } from './rally';
import { DEFENDER_ORDERS, giveDefenderOrder } from './data/defenderOrders';
import { defenderOrders, defenderState, registerDefender, resetDefenders } from './defenders';
import { navReachable, rebuildNav } from './navgrid';
import { playerState } from './playerState';
import { useGameStore } from './store/gameStore';
import { audio } from '@/lib/audio';
import type { CharacterConfig } from './types';

// G-08 · the rally order: where the player's look plants it, which raider a defender holding it fights, and how far
// he may go after one.

const flat = () => 0;
const near = (a: { x: number; z: number }, x: number, z: number) => {
  expect(a.x).toBeCloseTo(x, 1);
  expect(a.z).toBeCloseTo(z, 1);
};

describe('the look point', () => {
  it('is where the look meets the ground, -Z at yaw 0', () => {
    // the eye 1.6 m up, looking down at 1 in 10: the ground 16 m off
    near(lookPoint({ x: 0, y: 1.6, z: 0 }, 0, -Math.atan(0.1), flat), 0, -16);
    // turned a quarter to the left (yaw +π/2 faces -X)
    near(lookPoint({ x: 5, y: 1.6, z: 5 }, Math.PI / 2, -Math.atan(0.2), flat), -3, 5);
  });

  it('meets a hill sooner, and a look at the sky plants at its far end', () => {
    // (a cliff 3 m high at z -8: the look meets its face, within a step of it)
    expect(lookPoint({ x: 0, y: 1.6, z: 0 }, 0, -Math.atan(0.1), (_x, z) => (z < -8 ? 3 : 0)).z).toBeGreaterThan(-8.3);
    const sky = lookPoint({ x: 0, y: 1.6, z: 0 }, Math.PI, 0.4, flat);
    expect(Math.hypot(sky.x, sky.z)).toBeCloseTo(RALLY_REACH * Math.cos(0.4), 0);
    expect(sky.z).toBeGreaterThan(0);
  });
});

describe('holding the rally', () => {
  const P = { x: 10, z: 10 };
  const at = (f: { x: number; z: number }) => f;

  it('fights the raider nearest the point within his reach of it, not the one nearest himself', () => {
    const a = { x: 13, z: 10 }, b = { x: 10, z: 12.5 }, far = { x: 10, z: 14.5 };
    expect(rallyFoe(P, [a, b, far], at, 1.8)).toBe(b);
    expect(rallyFoe(P, [a, far], at, 1.8)).toBe(a);
    // 3.8 m off is in reach (2 m of the hold and 1.8 of a blade); 4.5 m is not — whoever stands nearer it
    expect(rallyFoe(P, [far], at, 1.8)).toBeNull();
    expect(rallyFoe(P, [far], at, 16)).toBe(far); // a bow reaches it
    expect(rallyFoe(P, [], at, 16)).toBeNull();
  });

  it('never steps out of RALLY_HOLD of the point after one', () => {
    expect(holdWithin(P, 11, 10.5)).toEqual({ x: 11, z: 10.5 });
    const held = holdWithin(P, 15, 10);
    expect(held.x).toBeCloseTo(10 + RALLY_HOLD, 6);
    expect(held.z).toBe(10);
    const diag = holdWithin(P, 4, 4);
    expect(Math.hypot(diag.x - P.x, diag.z - P.z)).toBeCloseTo(RALLY_HOLD, 6);
  });

  it('a step stopped at its edge is within it, at every bearing and from any point (no rounding past it)', () => {
    let out = 0;
    for (let i = 0; i < 2000; i++) {
      const at = { x: -40 + (i % 37) * 2.17, z: 15 - (i % 23) * 1.31 };
      const a = i * 0.7853, r = 2.01 + (i % 11) * 0.37;
      const held = holdWithin(at, at.x + Math.cos(a) * r, at.z + Math.sin(a) * r);
      if (Math.hypot(held.x - at.x, held.z - at.z) > RALLY_HOLD) out++;
      expect(Math.hypot(held.x - at.x, held.z - at.z)).toBeGreaterThan(RALLY_HOLD - 1e-6);
    }
    expect(out).toBe(0);
  });

  it("with nothing in reach, each to his own place a metre off it — or the point, where that place is blocked", () => {
    const spot = rallySpot(P, 0, () => false);
    expect(spot).toEqual({ x: 11, z: 10 });
    expect(Math.hypot(spot.x - P.x, spot.z - P.z)).toBeLessThanOrEqual(RALLY_HOLD);
    expect(rallySpot(P, 0, () => true)).toEqual(P);
  });
});

describe('planting it from the order wheel', () => {
  const HERO: CharacterConfig = { name: 'Rally', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
  const game = () => useGameStore.getState();
  const RALLY = DEFENDER_ORDERS.findIndex((o) => o.id === 'rally');
  let notes: string[] = [];
  /** the player at (x, z), looking north (-Z) at the ground `d` m ahead */
  const lookFrom = (x: number, z: number, d: number) => Object.assign(playerState, { x, y: 0, z, yaw: 0, pitch: -Math.atan(1.6 / d) });
  /** the keep at (0, 0), its ring whole, the gatehouse on the north (keepWalls.test.ts's ring) */
  const ring = () => {
    expect(game().placeBuilding('keep', 0, 0, 0)).toBe(true);
    for (const [s, p] of [['nw', 'corner_block'], ['ne', 'corner_block'], ['sw', 'corner_block'], ['se', 'corner_turret'],
      ['e', 'wall_crenel'], ['s', 'wall_crenel'], ['w', 'wall_low'], ['n', 'gatehouse']]) {
      game().raiseKeepPart(s, p);
      game().workKeepPart(s, 1);
    }
    notes = [];
  };

  beforeEach(() => {
    vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
    game().newGame(HERO);
    notes = [];
    useGameStore.setState({
      notify: (m: string) => { notes.push(m); }, nodes: [],
      villagers: [{ id: 'd1', name: 'Ada', job: 'defender', level: 1 }],
    } as never);
    game().addItems({ stone: 400, plank: 100, wood: 100, iron_bar: 10 });
    useGameStore.setState({ unlocks: [...game().unlocks, 'keep', 'mining'] });
    resetDefenders(new Set());
    registerDefender('d1', 0, 0, 30);
    rebuildNav(game().buildings);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('plants at the look point and gives the order', () => {
    lookFrom(5, 30, 10);
    giveDefenderOrder(RALLY);
    expect(defenderOrders.order).toBe('rally');
    near(defenderOrders.rally!, 5, 20);
    expect(notes).toEqual(['Order given: Rally Here']);
  });

  it("beyond a shut wall: a way round is theirs, and with the ring shut it is refused, the last order standing", () => {
    ring();
    rebuildNav(game().buildings);
    // the bailey, looked at from the south over the south run; the gatehouse open, there is a way round to it
    lookFrom(2, 22, 20);
    giveDefenderOrder(RALLY);
    expect(defenderOrders.order).toBe('rally');
    near(defenderOrders.rally!, 2, 2);
    expect(navReachable(defenderState.d1.x, defenderState.d1.z, 2, 2)).toBe(true);
    // shut: none
    defenderOrders.order = 'patrol';
    defenderOrders.rally = null;
    game().toggleSiteGate('keep', 'n');
    rebuildNav(game().buildings);
    notes = [];
    giveDefenderOrder(RALLY);
    expect(notes).toEqual(['Your defenders have no way to there.']);
    expect(defenderOrders).toMatchObject({ order: 'patrol', rally: null });
  });

  it('only those who will rally count toward a way there: one the Roster keeps on his own order does not', () => {
    ring();
    game().toggleSiteGate('keep', 'n');
    useGameStore.setState({ villagers: [...game().villagers, { id: 'd2', name: 'Bran', job: 'defender', level: 1 }] } as never);
    registerDefender('d2', 2, 0, 2); // in the bailey, the ring shut about him
    rebuildNav(game().buildings);
    defenderOrders.overrides.d2 = 'patrol';
    lookFrom(2, 22, 20);
    giveDefenderOrder(RALLY);
    expect(notes.at(-1)).toBe('Your defenders have no way to there.');
    expect(defenderOrders).toMatchObject({ order: 'patrol', rally: null });
    // given the rally on his own card, he is one who will — and he has a way
    defenderOrders.overrides.d2 = 'rally';
    giveDefenderOrder(RALLY);
    expect(defenderOrders.order).toBe('rally');
    near(defenderOrders.rally!, 2, 2);
  });

  it("a guard posted on the ring's own wall has a way down into the bailey, shut — not from the far side of it", () => {
    ring();
    game().toggleSiteGate('keep', 'n');
    rebuildNav(game().buildings);
    // on the south run, a solid the grid measures from its nearest open cell, which lies outside the ring
    Object.assign(defenderState.d1, { x: 0, z: 8, postX: 0, postZ: 8, elevated: true });
    lookFrom(2, 22, 20);
    giveDefenderOrder(RALLY);
    expect(defenderOrders.order).toBe('rally');
    near(defenderOrders.rally!, 2, 2);
  });

  it('with none who will rally, every defender counts toward a way there, as before the Roster kept any', () => {
    ring();
    game().toggleSiteGate('keep', 'n');
    rebuildNav(game().buildings);
    defenderOrders.overrides.d1 = 'patrol'; // outside the shut ring, on his own order: the only defender
    lookFrom(2, 22, 20);
    giveDefenderOrder(RALLY);
    expect(notes.at(-1)).toBe('Your defenders have no way to there.');
    expect(defenderOrders).toMatchObject({ order: 'patrol', rally: null });
    // in the bailey, his way counts though he keeps his own order: the point stands for whoever is sent to it
    Object.assign(defenderState.d1, { x: 2, z: 0 });
    giveDefenderOrder(RALLY);
    expect(defenderOrders.order).toBe('rally');
    near(defenderOrders.rally!, 2, 2);
  });

  it('refused on a wall itself, and away from home', () => {
    ring();
    rebuildNav(game().buildings);
    lookFrom(0, 20, 12); // the south run's own footprint, (0, 8)
    giveDefenderOrder(RALLY);
    expect(notes).toEqual(['Nothing to hold there — look at open ground to rally the defenders.']);
    useGameStore.setState({ destination: 'kings_approach' } as never);
    lookFrom(5, 30, 10);
    giveDefenderOrder(RALLY);
    expect(notes.at(-1)).toBe('Your defenders hold the homestead — rally them there.');
    expect(defenderOrders).toMatchObject({ order: 'patrol', rally: null });
  });

  it('a new session forgets it', () => {
    lookFrom(5, 30, 10);
    giveDefenderOrder(RALLY);
    resetDefenders(new Set(['d1']));
    expect(defenderOrders).toMatchObject({ order: 'patrol', rally: null });
  });
});
