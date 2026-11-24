import { describe, expect, it } from 'vitest';
import { registerVillagerCombat, villagerCombatState } from '@/game/villagerCombat';
import type { Agent } from '../core/Agent';
import { scoreAction } from '../core/scoring';
import { combatStateFor } from './combatState';
import { TAKE_COVER } from './takeCover';

// G-11 (OPEN-019) · take_cover had no not_downed gate: a villager knocked down in the middle of a run for cover went on
// scoring it — his committed run holds the action at its commit threat — and his action read take_cover while he lay
// invisible. Now gated as engage_threat_villager is.
describe('take_cover and a villager knocked down', () => {
  /** a villager in the middle of a run for cover, the threat behind him */
  const running = (id: string): Agent => {
    Object.assign(combatStateFor(id), { mode: 'cover', coverStartedAt: 100, coverArrived: false });
    return { id, archetype: 'villager', position: { x: 0, y: 0, z: 0 }, bb: { currentActionId: 'take_cover', threatLevel: 0.2, beliefs: new Map() } } as unknown as Agent;
  };

  it('scores his run while he is up, and 0 once he is down', () => {
    const agent = running('vtc1');
    const up = scoreAction(TAKE_COVER, agent, { target: null, now: 101 });
    expect([up.gated, up.score > 0, up.considerations[0]]).toEqual([false, true, { name: 'not_downed', input: 1, output: 1 }]);
    registerVillagerCombat('vtc1').state = 'downed';
    const down = scoreAction(TAKE_COVER, agent, { target: null, now: 101 });
    expect([down.gated, down.score, down.considerations.map((c) => c.name)]).toEqual([true, 0, ['not_downed']]);
  });

  it('keeps no health record for one who is not a villager (everyone with an Agent scores it)', () => {
    scoreAction(TAKE_COVER, running('court_richard'), { target: null, now: 101 });
    expect(villagerCombatState.court_richard).toBeUndefined();
  });
});
