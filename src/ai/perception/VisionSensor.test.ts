import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { useEnemyStore, type EnemyKind } from '@/game/combat';
import { playerState } from '@/game/playerState';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig } from '@/game/types';
import type { Agent } from '../core/Agent';
import { createBlackboard } from '../core/Blackboard';
import { enemyBeliefId, nearestNoticedHostile } from './Belief';
import { perceptionStateFor } from './state';
import { updateVision } from './VisionSensor';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };

/** an agent standing at (x, z); everything within the 6 m peripheral range is seen whichever way it faces */
function agentAt(id: string, x: number, z: number): Agent {
  return { id, archetype: 'companion', position: { x, y: 0, z }, yaw: 0, region: null, bb: createBlackboard(id, 'companion', null) } as unknown as Agent;
}
function spawn(kind: EnemyKind, x: number, z: number) {
  useEnemyStore.getState().spawn(kind, x, z);
  const all = useEnemyStore.getState().enemies;
  return all[all.length - 1];
}
/** five seconds of looking — far longer than the slowest confidence ramp */
function look(agent: Agent): void {
  updateVision(agent, perceptionStateFor(agent.id), 10, 5);
}

beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  useGameStore.getState().newGame(HERO);
  Object.assign(playerState, { x: 300, y: 0, z: 300 });
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the vision sensor', () => {
  it('notices a raider standing beside the agent', () => {
    const tam = agentAt('vision-test-1', 60, 60);
    const bandit = spawn('bandit', 62, 60);
    look(tam);
    expect(tam.bb.beliefs.get(enemyBeliefId(bandit.id))?.confidence).toBe(1);
    expect(nearestNoticedHostile(tam.bb, 60, 60)?.entityId).toBe(enemyBeliefId(bandit.id));
  });

  it('does not see a falling enemy as a threat', () => {
    const tam = agentAt('vision-test-2', 60, 60);
    const bandit = spawn('bandit', 62, 60);
    bandit.mob.state = 'dying';
    look(tam);
    expect(tam.bb.beliefs.size).toBe(0);
  });

  // Her duel is between her and the player. Seen as a hostile, she was charged by Tam the moment it began.
  it('does not see Princess Storm as a hostile at all', () => {
    const tam = agentAt('vision-test-3', 60, 60);
    const storm = spawn('storm', 62, 60);
    look(tam);
    expect(tam.bb.beliefs.has(enemyBeliefId(storm.id))).toBe(false);
    expect(nearestNoticedHostile(tam.bb, 60, 60)).toBeNull();

    // and she does not hide the raider next to her
    const bandit = spawn('bandit', 61, 62);
    look(tam);
    expect(nearestNoticedHostile(tam.bb, 60, 60)?.entityId).toBe(enemyBeliefId(bandit.id));
  });
});
