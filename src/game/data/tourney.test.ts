import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORLD_ANCHOR } from './anchors';
import { NPC_BY_ID } from './npcs';
import { TOURNEY_LISTS, TOURNEY_STEED_HOME } from './tourney';
import { resolveWorldAnchor, WORLD_DESTINATION_BY_ID } from './worlds';

const richard = NPC_BY_ID.richard;
const south = (p: { z: number }) => p.z - richard.z; // +z is south by the HUD's compass
const east = (p: { x: number }) => p.x - richard.x;

/** the longest walk a horse takes from its home (Wildlife.tsx: r = 4 + random * 9) */
const GRAZE = 13;
/** how near Richard the joust's prompt is offered (game/joust.ts: INTERACT_RANGE + 2.5) */
const JOUST_PROMPT = 5.9;

describe("Richard's lists", () => {
  const { rails, pennants } = TOURNEY_LISTS;
  const [byHisPost, byTheField] = pennants;
  const line = [byHisPost, ...rails, byTheField];

  it('run in one line to the south of his post, a pennant beyond each end of the rails', () => {
    expect(rails).toHaveLength(3);
    expect(pennants).toHaveLength(2);
    // one north-south line
    expect(new Set(line.map((p) => p.x)).size).toBe(1);
    // ...going away from him, each piece further than the one before
    const out = line.map(south);
    expect(out[0]).toBeGreaterThan(0);
    for (let i = 1; i < out.length; i++) expect(out[i]).toBeGreaterThan(out[i - 1]);
    // the rails evenly spaced, a pennant the same step beyond each end
    const steps = out.slice(1).map((d, i) => d - out[i]);
    expect(steps[1]).toBeCloseTo(steps[2], 6);
    expect(steps[0]).toBeCloseTo(steps[3], 6);
  });

  it('begin beside him and end where a charge at him would begin', () => {
    // near enough to be his lists: the first pennant a few paces from his post, the last within a short gallop
    expect(south(byHisPost)).toBeGreaterThan(3);
    expect(south(byHisPost)).toBeLessThan(8);
    expect(south(byTheField)).toBeGreaterThan(20);
    expect(south(byTheField)).toBeLessThan(30);
    // to his east — the side the tilt field is on; the ground to his west and south-west is not ground a player can
    // walk on (measured live: nothing here can know where a bake's walkable ground lies) — and clear of the spot
    // the pass is ridden through (2.2 m off his post is a perfect strike)
    expect(east(byHisPost)).toBeGreaterThan(JOUST_PROMPT);
    expect(east(byHisPost)).toBeLessThan(15);
  });

  it('fly the red pennant by his post and the blue one by the field', () => {
    expect(byHisPost.color).toBe('#b03a2e');
    expect(byTheField.color).toBe('#2e5fb0');
  });

  it('are at his own destination', () => {
    expect(richard.world).toBe(WORLD_ANCHOR.richard.dest);
    expect({ x: richard.x, z: richard.z }).toEqual(resolveWorldAnchor(WORLD_ANCHOR.richard));
    // on Richard's side of the map, not round some other origin
    const origin = WORLD_DESTINATION_BY_ID[WORLD_ANCHOR.richard.dest].origin;
    for (const p of line) expect(Math.hypot(p.x - origin.x, p.z - origin.z)).toBeLessThan(60);
  });
});

describe("Richard's steed", () => {
  const home = { x: TOURNEY_STEED_HOME[0], z: TOURNEY_STEED_HOME[1] };
  const far = TOURNEY_LISTS.pennants[1];

  it('is stabled past the far end of the lists, further out into the field', () => {
    expect(south(home)).toBeGreaterThan(south(far));
    expect(east(home)).toBeGreaterThan(east(far));
    // near enough to the lists that it grazes up to their end
    expect(Math.hypot(home.x - far.x, home.z - far.z)).toBeLessThan(GRAZE + 2);
  });

  it('never grazes into the way of a pass, or back across the line of the barrier', () => {
    // the whole grazing circle stays clear of where the joust is offered
    expect(Math.hypot(east(home), south(home)) - GRAZE).toBeGreaterThan(JOUST_PROMPT + 5);
    // ...south of the barrier's first rail
    expect(south(home) - GRAZE).toBeGreaterThan(south(TOURNEY_LISTS.rails[0]));
    // ...and on the field's side of the barrier's line. The field a player can walk on ends three metres west of
    // that line (measured live), so a steed that grazed far across it could not be walked up to
    expect(east(home) - GRAZE).toBeGreaterThan(east(far));
  });
});

describe('the ground that was looked at', () => {
  // Whether a player can stand at a point is not in the data: it is known only in the running game, once the
  // destination's model has loaded. These points WERE measured there (2026-10-13): a player can stand at each of the
  // five pieces, at the steed's home and all round the circle it grazes in. If this fails because Richard, the
  // destination's scale or an offset has moved, do not retype the numbers to suit — measure the new places first: at
  // the Tourney Grounds set `window.__kkp.pendingTeleport = { x, z, yaw: 0 }` and read where the player is put; at
  // a point he can stand on, he stays.
  const at = (p: { x: number; z: number }) => [Math.round(p.x * 1000) / 1000, Math.round(p.z * 1000) / 1000];

  it('is where the lists and the steed still stand, and Richard beside them', () => {
    expect(at(richard)).toEqual([1300, 966.5]);
    expect(at(TOURNEY_LISTS.pennants[0])).toEqual([1309, 971.75]);
    expect(TOURNEY_LISTS.rails.map(at)).toEqual([[1309, 975.5], [1309, 981.125], [1309, 986.75]]);
    expect(at(TOURNEY_LISTS.pennants[1])).toEqual([1309, 990.5]);
    expect(at({ x: TOURNEY_STEED_HOME[0], z: TOURNEY_STEED_HOME[1] })).toEqual([1322.5, 994.25]);
  });
});

describe('the lists and the steed follow Richard', () => {
  afterEach(() => { vi.doUnmock('./anchors'); vi.resetModules(); });

  it('move with his post, by exactly as much as he does', async () => {
    const MOVED = { east: 800, south: -1200 }; // local units
    vi.resetModules();
    vi.doMock('./anchors', async (original) => {
      const real = await original<typeof import('./anchors')>();
      const post = real.WORLD_ANCHOR.richard;
      return { ...real, WORLD_ANCHOR: { ...real.WORLD_ANCHOR, richard: { ...post, x: post.x + MOVED.east, z: post.z + MOVED.south } } };
    });
    const moved = await import('./tourney');
    const { NPC_BY_ID: cast } = await import('./npcs');
    const dx = cast.richard.x - richard.x, dz = cast.richard.z - richard.z;
    expect(Math.hypot(dx, dz)).toBeGreaterThan(100); // he really moved: 60 m east and 90 m north
    const was = [...TOURNEY_LISTS.rails, ...TOURNEY_LISTS.pennants, { x: TOURNEY_STEED_HOME[0], z: TOURNEY_STEED_HOME[1] }];
    const now = [...moved.TOURNEY_LISTS.rails, ...moved.TOURNEY_LISTS.pennants, { x: moved.TOURNEY_STEED_HOME[0], z: moved.TOURNEY_STEED_HOME[1] }];
    now.forEach((p, i) => {
      expect(p.x - was[i].x).toBeCloseTo(dx, 6);
      expect(p.z - was[i].z).toBeCloseTo(dz, 6);
    });
  });
});

describe("the lists and the steed are laid out in the destination's own units", () => {
  afterEach(() => { vi.doUnmock('./worlds'); vi.resetModules(); });

  // what went wrong the first time: world metres, which stayed the same when the destination was drawn smaller
  it('stand twice as far from him in a destination drawn twice as large', async () => {
    const dest = WORLD_ANCHOR.richard.dest;
    vi.resetModules();
    vi.doMock('./worlds', async (original) => {
      const real = await original<typeof import('./worlds')>();
      const grown = real.WORLD_DESTINATIONS.find((d) => d.id === dest)!;
      grown.worldScale = (grown.worldScale ?? 0.32) * 2;
      return { ...real };
    });
    const grown = await import('./tourney');
    const { NPC_BY_ID: cast } = await import('./npcs');
    const origin = WORLD_DESTINATION_BY_ID[dest].origin;
    // he himself stands twice as far from the destination's origin: the destination really was drawn larger
    expect(cast.richard.x - origin.x).toBeCloseTo(2 * (richard.x - origin.x), 6);
    expect(cast.richard.z - origin.z).toBeCloseTo(2 * (richard.z - origin.z), 6);
    expect(Math.abs(cast.richard.z - richard.z)).toBeGreaterThan(30);
    const was = [...TOURNEY_LISTS.rails, ...TOURNEY_LISTS.pennants, { x: TOURNEY_STEED_HOME[0], z: TOURNEY_STEED_HOME[1] }];
    const now = [...grown.TOURNEY_LISTS.rails, ...grown.TOURNEY_LISTS.pennants, { x: grown.TOURNEY_STEED_HOME[0], z: grown.TOURNEY_STEED_HOME[1] }];
    now.forEach((p, i) => {
      expect(p.x - cast.richard.x).toBeCloseTo(2 * (was[i].x - richard.x), 6);
      expect(p.z - cast.richard.z).toBeCloseTo(2 * (was[i].z - richard.z), 6);
    });
  });
});
