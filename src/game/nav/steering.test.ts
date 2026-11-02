import { beforeEach, describe, expect, it } from 'vitest';
import { navSteer, rebuildNav, steerRound } from '../navgrid';
import { makePathStep } from '../enemyAi/movement';
import { useGameStore } from '../store/gameStore';
import type { NavAgent } from './steering';
import type { Mob, Route } from '../enemyAi/frame';
import type { ResourceNodeState } from '../types';

const tree = (id: string, x: number, z: number, extra: Partial<ResourceNodeState> = {}): ResourceNodeState =>
  ({ id, kind: 'tree', x, z, scale: 1, yaw: 0, hitsLeft: 3, respawnAt: null, ...extra });
function stand(nodes: ResourceNodeState[]) {
  useGameStore.setState({ buildings: [], nodes });
  rebuildNav([]);
}
/** how far (cx, cz) is off the line through (x, z) along the unit (nx, nz) */
const offLine = (x: number, z: number, nx: number, nz: number, cx: number, cz: number) =>
  Math.abs(nx * (cz - z) - nz * (cx - x));

beforeEach(() => stand([]));

describe('a walker steering round the trees and rocks (steerRound)', () => {
  it('turns from a tree ahead to the line that grazes its room — its circle and a walker\'s radius — on the side it leans to', () => {
    stand([tree('t', 0, 0)]); // r 0.55: room 1.1
    const a = { ...steerRound(null, 0, -2, 0, 1, 0, 10) };
    expect(offLine(0, -2, a.nx, a.nz, 0, 0)).toBeCloseTo(1.1, 9);
    expect(Math.hypot(a.nx, a.nz)).toBeCloseTo(1, 9);
    expect(a.nz).toBeGreaterThan(0);
    // leaning a little to -x, it goes round by -x
    const lean = { ...steerRound(null, 0, -2, -0.1, Math.sqrt(0.99), 0, 10) };
    expect(lean.nx).toBeLessThan(-0.5);
    expect(offLine(0, -2, lean.nx, lean.nz, 0, 0)).toBeCloseTo(1.1, 9);
    // a rock's room is its own, bigger, circle and the same radius
    stand([tree('r', 0, 0, { kind: 'rock', scale: 1.2 })]); // r 1.32: room 1.87
    const rock = steerRound(null, 0, -3, 0, 1, 0, 10);
    expect(offLine(0, -3, rock.nx, rock.nz, 0, 0)).toBeCloseTo(1.87, 9);
  });

  it('changes nothing for a tree it is walking up to, one behind it, one it passes clear of, one felled or of another place', () => {
    stand([tree('t', 0, 0)]);
    // making for a gatherer's anchor, 1.3 m from the trunk
    expect({ ...steerRound(null, 0, -2.4, 0, 1, 0, -1.3) }).toEqual({ nx: 0, nz: 1 });
    expect({ ...steerRound(null, 0, 2, 0, 1, 0, 10) }).toEqual({ nx: 0, nz: 1 });
    expect({ ...steerRound(null, 1.2, -2, 0, 1, 1.2, 10) }).toEqual({ nx: 0, nz: 1 });
    // and one further off than its room and STEER_AHEAD
    expect({ ...steerRound(null, 0, -2.7, 0, 1, 0, 10) }).toEqual({ nx: 0, nz: 1 });
    stand([tree('t', 0, 0, { respawnAt: 5 }), tree('a', 0, 0, { world: 'template-01' })]);
    expect({ ...steerRound(null, 0, -2, 0, 1, 0, 10) }).toEqual({ nx: 0, nz: 1 });
    expect({ ...steerRound('template-01', 0, -2, 0, 1, 0, 10) }).toEqual({ nx: 0, nz: 1 });
  });

  it('keeps a villager, a defender or a raider out of a trunk or a boulder it walks past', () => {
    stand([tree('t', 0.3, 0), tree('r', 20.2, 0, { kind: 'rock' })]);
    const walk = (move: (x: number, z: number) => { nx: number; nz: number }, from: number, to: number) => {
      let x = from, z = -5, least = Infinity;
      for (let k = 0; k < 400 && Math.hypot(x - to, z - 5) > 0.4; k++) {
        const { nx, nz } = move(x, z);
        x += (nx * 2.4) / 30;
        z += (nz * 2.4) / 30;
        least = Math.min(least, Math.hypot(x - (from === 0 ? 0.3 : 20.2), z));
      }
      return { least, arrived: Math.hypot(x - to, z - 5) <= 0.4 };
    };
    // navSteer (everyone the AI drives); a raider's path step (game/enemyAi/movement.ts)
    const agent: NavAgent = { x: 0, z: -5 };
    const viaNav = (x: number, z: number) => { agent.x = x; agent.z = z; return navSteer(agent, 0, 5, 1 / 30); };
    expect(walk(viaNav, 0, 0)).toEqual({ least: expect.any(Number), arrived: true });
    expect(walk(viaNav, 0, 0).least).toBeGreaterThan(0.55 + 0.4);
    const route: Route = { pts: [], i: 0, t: 0, tx: 0, tz: 0 };
    const m = { x: 20, z: -5 } as Mob;
    const raider = (x: number, z: number) => { m.x = x; m.z = z; return makePathStep(route, m, 1 / 30)(20, 5); };
    const past = walk(raider, 20, 20);
    expect(past.arrived).toBe(true);
    expect(past.least).toBeGreaterThan(1.1 + 0.4);
  });
});
