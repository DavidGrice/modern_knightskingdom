import { describe, expect, it, vi } from 'vitest';

// The dressing called as plain functions: a ref is a plain object, the frame loop is not subscribed, the terrain is
// level, and what it draws through are names — so what it returns is plain data to read.
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), useRef: (value: unknown) => ({ current: value }) }));
vi.mock('@react-three/fiber', () => ({ useFrame: () => undefined }));
vi.mock('./TemplateWorld', () => ({ sampleTemplateGroundY: () => 0 }));
vi.mock('./PropModel', () => ({ default: 'PropModel' }));
vi.mock('./Buildings', () => ({ Torch: 'Torch' }));

import { Suspense } from 'react';
import { DestinationCourtDressing, Grounded, Pennant } from './CourtDressing';
import { TOURNEY_LISTS } from '@/game/data/tourney';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';

interface El { type: unknown; key: string | null; props: Record<string, unknown> & { children?: unknown } }
const isEl = (v: unknown): v is El => !!v && typeof v === 'object' && 'props' in v && 'type' in v;
/** every element under `node` whose type is `type`, in order, not looking inside the ones it finds */
const all = (node: unknown, type: unknown): El[] => (Array.isArray(node) ? node.flatMap((n) => all(n, type))
  : isEl(node) ? (node.type === type ? [node] : all(node.props.children, type)) : []);
/** a function component's element, rendered one level */
const render = (el: El): El => (el.type as (props: unknown) => El)(el.props);

describe("the Tourney Grounds' dressing", () => {
  const dest = WORLD_DESTINATION_BY_ID['template-02'];
  const lists = render(DestinationCourtDressing({ dest }) as unknown as El);
  const pieces = all(lists, Grounded);

  it('grounds one piece at each point of the lists, handing each the destination it is drawn inside', () => {
    expect(lists.type).toBe(Suspense);
    const points = [...TOURNEY_LISTS.rails, ...TOURNEY_LISTS.pennants];
    expect(pieces).toHaveLength(points.length);
    expect(pieces.length).toBe(5);
    pieces.forEach((el, i) => {
      expect([el.props.x, el.props.z]).toEqual([points[i].x, points[i].z]);
      // the scope it hangs in is already moved to the destination's origin; Grounded takes that off again
      expect(el.props.originOffset).toBe(dest.origin);
      expect(el.props.lift).toBeUndefined();
    });
    expect(new Set(pieces.map((el) => el.key)).size).toBe(pieces.length);
  });

  it('draws a rail at each rail point, turned a quarter to run along the line', () => {
    const rails = pieces.slice(0, TOURNEY_LISTS.rails.length);
    for (const el of rails) {
      const turned = el.props.children as El;
      expect(turned.type).toBe('group');
      expect(turned.props['rotation-y']).toBe(Math.PI / 2);
      const model = turned.props.children as El;
      expect(model.type).toBe('PropModel');
      expect(model.props).toEqual({ url: '/assets/props/scenery/l607900.glb', height: 1.1 });
    }
  });

  it('flies each pennant in its own colour', () => {
    const flown = pieces.slice(TOURNEY_LISTS.rails.length).map((el) => el.props.children as El);
    expect(flown.map((el) => el.type)).toEqual([Pennant, Pennant]);
    expect(flown.map((el) => el.props.color)).toEqual(TOURNEY_LISTS.pennants.map((p) => p.color));
  });

  it('dresses no destination but the two courts', () => {
    expect(DestinationCourtDressing({ dest: WORLD_DESTINATION_BY_ID['template-01'] })).not.toBeNull();
    for (const id of ['template-03', 'template-04', 'template-05', 'template-06', 'template-07', 'template-08']) {
      expect(DestinationCourtDressing({ dest: WORLD_DESTINATION_BY_ID[id] })).toBeNull();
    }
  });
});

describe('Grounded', () => {
  it("sets a piece at its own x and z, less the origin of the scope it hangs in", () => {
    const el = (Grounded as unknown as (props: unknown) => El)({ x: 1309, z: 975.5, originOffset: { x: 1300, z: 1000 }, children: null });
    expect(el.type).toBe('group');
    expect(el.props.position).toEqual([9, 0, -24.5]);
    // ...and where it is given no scope, at the point itself (the guild halls hang outside one)
    const bare = (Grounded as unknown as (props: unknown) => El)({ x: 1309, z: 975.5, children: null });
    expect(bare.props.position).toEqual([1309, 0, 975.5]);
  });
});
