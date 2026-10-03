import { beforeEach, describe, expect, it } from 'vitest';
// FIRST, on purpose, ahead of anything in the import cycle the syncs live in (population.ts's header): if
// population.ts ever joins that cycle again, this file stops loading — "AgentPopulation is not a constructor",
// thrown from a sync's module scope.
import { AgentPopulation } from './population';
import { agentManager } from '../core/AgentManager';

const ids = () => agentManager.agents.map((a) => `${a.id}:${a.archetype}`);
const population = () => new AgentPopulation(() => agentManager);
const own = (p: AgentPopulation) => [...p.agents()].map((a) => a.id);
const spawnAs = (archetype: string) => (item: { id: string }) => agentManager.spawn(item.id, archetype, 0, 0, null);

beforeEach(() => {
  agentManager.clear();
});

describe('AgentPopulation', () => {
  it('spawns newcomers in their own order and despawns whoever left', () => {
    const p = population();
    p.reconcile([{ id: 'a' }, { id: 'b' }], spawnAs('villager'));
    p.reconcile([{ id: 'b' }, { id: 'c' }, { id: 'a' }], spawnAs('villager'));
    expect(ids()).toEqual(['a:villager', 'b:villager', 'c:villager']);
    // newcomers first, departures second
    const order: string[] = [];
    p.reconcile([{ id: 'e' }, { id: 'c' }, { id: 'd' }],
      (item) => { order.push(`+${item.id}`); return spawnAs('villager')(item); },
      (id) => order.push(`-${id}`));
    expect([ids(), order, own(p)]).toEqual([
      ['c:villager', 'e:villager', 'd:villager'], ['+e', '+d', '-a', '-b'], ['c', 'e', 'd'],
    ]);
  });

  it('never despawns an Agent another population has since taken the id over with', () => {
    const court = population();
    const roster = population();
    court.reconcile([{ id: 'farmer_alric' }], spawnAs('court'));
    // he joins the roster: the roster takes the id over...
    roster.reconcile([{ id: 'farmer_alric' }], spawnAs('villager'));
    expect([own(court), own(roster)]).toEqual([[], ['farmer_alric']]);
    // ...and neither the court's mirror, while the court still lists him...
    court.mirror({ farmer_alric: { x: 9, z: 9 } });
    expect(agentManager.get('farmer_alric')!.position.x).toBe(0);
    // ...nor the court letting him go touches the roster's Agent
    const gone: string[] = [];
    court.reconcile([], spawnAs('court'), (id) => gone.push(id));
    expect([ids(), gone]).toEqual([['farmer_alric:villager'], ['farmer_alric']]);
    roster.mirror({ farmer_alric: { x: 9, z: 9 } });
    expect(agentManager.get('farmer_alric')!.position.x).toBe(9);
  });

  it('takes an id over with a fresh Agent of its own, never the one already there', () => {
    const walkers = population();
    const roster = population();
    walkers.reconcile([{ id: 'x' }], spawnAs('villager'));
    const theirs = agentManager.get('x');
    // the same archetype on both sides: agentManager.spawn alone would hand the roster the walkers' own Agent,
    // and the walkers, letting it go, would then despawn it for both
    roster.reconcile([{ id: 'x' }], spawnAs('villager'));
    const ours = agentManager.get('x');
    expect(ours).not.toBe(theirs);
    walkers.reconcile([], spawnAs('villager'));
    expect(agentManager.get('x')).toBe(ours);
    expect(ids()).toEqual(['x:villager']);
  });

  it('a mirror never moves an Agent it did not spawn, even under an id it still holds', () => {
    const p = population();
    p.reconcile([{ id: 'x' }], spawnAs('court'));
    p.mirror({ x: { x: 3, z: 4 } });
    expect(agentManager.get('x')!.position.toArray()).toEqual([3, 0, 4]);
    // someone else takes the id over before this population has caught up
    agentManager.despawn('x');
    agentManager.spawn('x', 'villager', 1, 1, null);
    p.mirror({ x: { x: 7, z: 7 } });
    expect(agentManager.get('x')!.position.toArray()).toEqual([1, 0, 1]);
    expect(own(p)).toEqual([]);
  });

  it('forget lets go of its own Agent and leaves anyone else\'s alone', () => {
    const p = population();
    const q = population();
    p.admit({ id: 'a' }, spawnAs('villager'));
    p.admit({ id: 'b' }, spawnAs('villager'));
    q.forget('a'); // never q's
    expect(ids()).toEqual(['a:villager', 'b:villager']);
    p.forget('a');
    expect([ids(), own(p)]).toEqual([['b:villager'], ['b']]);
    // forgotten, so the next admit spawns it again — and one it still has is left as it is
    p.admit({ id: 'a' }, spawnAs('defenderObserver'));
    p.admit({ id: 'b' }, spawnAs('defenderObserver'));
    expect(ids()).toEqual(['b:villager', 'a:defenderObserver']);
  });

  it('admit never retires, and clear forgets without despawning', () => {
    const p = population();
    p.admit({ id: 'a' }, spawnAs('ambient'));
    p.admit({ id: 'b' }, spawnAs('ambient'));
    expect(ids()).toEqual(['a:ambient', 'b:ambient']);
    p.retire(new Set(['b']));
    expect(ids()).toEqual(['b:ambient']);
    p.clear();
    expect([ids(), own(p)]).toEqual([['b:ambient'], []]);
  });

  it('lets go of an id whose Agent is already gone without a fuss, and does not bring it back by itself', () => {
    const p = population();
    p.reconcile([{ id: 'a' }], spawnAs('court'));
    agentManager.clear(); // a new session the population was not told about
    p.reconcile([{ id: 'a' }], spawnAs('court'));
    expect([ids(), own(p)]).toEqual([[], []]);
    const gone: string[] = [];
    p.reconcile([], spawnAs('court'), (id) => gone.push(id));
    expect([ids(), gone]).toEqual([[], ['a']]);
  });
});
