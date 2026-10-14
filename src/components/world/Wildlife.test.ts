import { describe, expect, it, vi } from 'vitest';

// The horses called as plain functions (as CourtDressing.test.ts calls the dressing): a hook is a plain value, the
// frame loop is not subscribed, the store is one object the test sets, and what a horse is drawn through is a name —
// so which horses there are, what each record is told, and whether one is drawn in a scene, is plain data to read.
const game = vi.hoisted(() => ({ state: { destination: null as string | null, falconTamed: false } }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, () => undefined],
  useMemo: (make: () => unknown) => make(),
}));
vi.mock('@react-three/fiber', () => ({ useFrame: () => undefined }));
vi.mock('@/game/store/gameStore', () => ({ useGameStore: (pick: (state: typeof game.state) => unknown) => pick(game.state) }));
vi.mock('../fps/PlayerController', () => ({ playerState: { x: 0, y: 0, z: 0 } }));
vi.mock('./PropModel', () => ({ default: 'PropModel', useNormalizedProp: () => null }));
vi.mock('./RiggedProp', () => ({ default: 'RiggedProp' }));
vi.mock('./TemplateWorld', () => ({ destinationGroundY: () => 0, homeGroundY: () => 0 }));
vi.mock('@/lib/audio', () => ({ audio: { play: () => undefined } }));

import Wildlife from './Wildlife';
import { horses } from '@/game/riding';
import { TOURNEY_STEED_HOME } from '@/game/data/tourney';

interface El { type: unknown; key: string | null; props: Record<string, unknown> & { children?: unknown } }
const isEl = (v: unknown): v is El => !!v && typeof v === 'object' && 'props' in v && 'type' in v;
/** the horses Wildlife mounts, in order: its children that are given an id and a home */
const stabled = (): El[] => ((Wildlife() as unknown as El).props.children as unknown[]).filter(isEl).filter((el) => typeof el.props.id === 'string' && Array.isArray(el.props.home));
/** one horse rendered while the player is in `destination` (null: at home) */
const drawn = (el: El, destination: string | null) => {
  game.state.destination = destination;
  return (el.type as (props: unknown) => El | null)(el.props);
};

describe('the horses', () => {
  it("are the meadow's herd of four, and Richard's steed stabled at the foot of his lists", () => {
    const all = stabled();
    expect(all.map((el) => [el.props.id, el.props.world ?? null])).toEqual([['horse0', null], ['horse1', null], ['horse3', null], ['horse4', null], ['horse2', 'template-02']]);
    // the very array data/tourney.ts lays out from his post — not a point typed here
    expect(all[4].props.home).toBe(TOURNEY_STEED_HOME);
  });

  it('each have a record that is told its home and the scene it lives in', () => {
    for (const el of stabled()) drawn(el, null);
    expect(Object.keys(horses).sort()).toEqual(['horse0', 'horse1', 'horse2', 'horse3', 'horse4']);
    expect(horses.horse2.world).toBe('template-02');
    expect([horses.horse2.x, horses.horse2.z, horses.horse2.homeX, horses.horse2.homeZ]).toEqual([...TOURNEY_STEED_HOME, ...TOURNEY_STEED_HOME]);
    for (const id of ['horse0', 'horse1', 'horse3', 'horse4']) expect(horses[id].world).toBeNull();
    expect([horses.horse0.homeX, horses.horse0.homeZ]).toEqual([-50, 8]);
  });

  it('are each drawn in the scene they live in and in no other', () => {
    const drawnAt = (destination: string | null) => stabled().filter((el) => drawn(el, destination) !== null).map((el) => el.props.id);
    expect(drawnAt(null)).toEqual(['horse0', 'horse1', 'horse3', 'horse4']);
    expect(drawnAt('template-02')).toEqual(['horse2']);
    // The King's Approach lets a player walk where the steed's field is, in the same coordinates: still not there
    expect(drawnAt('template-01')).toEqual([]);
    expect(drawnAt('dungeon')).toEqual([]);
  });

  it('are drawn from the rigged model of their own mold', () => {
    const el = drawn(stabled()[4], 'template-02')!;
    expect(el.type).toBe('group');
    const model = ((el.props.children as El).props.children as El);
    expect(model.type).toBe('RiggedProp');
    expect(model.props).toEqual({ assetId: 'l7339200', height: 1.7, gaitSpeed: 0 });
  });
});
