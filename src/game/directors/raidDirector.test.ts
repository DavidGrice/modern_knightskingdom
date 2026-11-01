import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { combatState, damagePlayer, useEnemyStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { raiderLadderState } from '@/game/raiderLadder';
import { raiderRamState } from '@/game/raiderRam';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig, PlacedBuilding } from '@/game/types';
import { raidDirector } from './raidDirector';
import { raidActive, raidCooldown, raidLost } from './state';

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const raiders = () => useEnemyStore.getState().enemies.filter((e) => e.raid);
let notes: string[] = [];

/** one tick of the raid director, as Enemies.tsx's 1 Hz frame runs it: on the module cells */
function tick(): void {
  const st = game();
  raidDirector(st, useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
}
/** the homestead established (four pieces, mining unlocked), dusk, and the tick that starts the raid */
function startRaid(): void {
  const walls: PlacedBuilding[] = [0, 1, 2, 3].map((i) => ({ id: 'w' + i, type: 'wall', x: 30 + i * 4, z: 30, rot: 0, built: 1 }));
  useGameStore.setState({ buildings: walls, unlocks: [...game().unlocks, 'mining'] });
  worldEnv.time = 0.71;
  tick();
  raiderRamState.active = true; // as though the raid had brought its ram and its ladder
  raiderLadderState.active = true;
}
const spoils = () => [game().inventory.plank ?? 0, game().inventory.stone ?? 0, game().inventory.iron_ore ?? 0, game().xp.combat];

beforeEach(() => {
  // 0.999: no ram, no ladder, no Armory drop of the dice's own — the test says which it has
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999);
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  notes = [];
  useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
  combatState.iframeUntil = 0;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the raid director', () => {
  it('a raid whose raiders are gone is beaten back once, with its spoils, and the cooldown keeps a second off', () => {
    startRaid();
    expect([raidActive.current, raiders().length]).toEqual([true, 3]);
    useEnemyStore.getState().clear();
    tick();
    tick();
    expect(notes.filter((n) => n.startsWith('The raid is beaten back!'))).toHaveLength(1);
    expect(spoils()).toEqual([4, 4, 2, 60]);
    expect([raidActive.current, raiderRamState.active, raiderLadderState.active, raiders().length]).toEqual([false, false, false, 0]);
    expect(raidCooldown.current).toBeGreaterThan(0);
  });

  it('a session start ends a raid under way without paying for it (a new game here; a load runs the same reset hook)', () => {
    startRaid();
    raidLost.current = true;
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    expect([raidActive.current, raidCooldown.current, raidLost.current]).toEqual([false, 0, false]);
    worldEnv.time = 0.3;
    tick();
    expect(spoils()).toEqual([0, 0, 0, 0]);
    expect(notes.filter((n) => /raid is beaten back|had the field/.test(n))).toEqual([]);
  });

  it('a knock-out mid-raid is a raid lost: no spoils, and it ends as a raid does, its cooldown running on', () => {
    startRaid();
    vi.mocked(Math.random).mockImplementation(() => 0.2); // a raid beaten back now would leave gear in the Armory
    const cooldown = raidCooldown.current, armory = { ...game().armory };
    damagePlayer(999);
    expect(raidLost.current).toBe(true);
    tick();
    expect(spoils()).toEqual([0, 0, 0, 0]);
    expect(game().armory).toEqual(armory);
    expect(notes.filter((n) => n.startsWith('The raiders had the field.'))).toHaveLength(1);
    expect(notes.filter((n) => n.startsWith('The raid is beaten back!'))).toEqual([]);
    expect([raidActive.current, raidLost.current, raiderRamState.active, raiderLadderState.active]).toEqual([false, false, false, false]);
    expect(raidCooldown.current).toBe(cooldown - 1);
  });

  it('a knock-out once every raider is already falling leaves a raid beaten back', () => {
    startRaid();
    for (const e of raiders()) e.mob.state = 'dying';
    damagePlayer(999);
    tick();
    expect(raidLost.current).toBe(false);
    expect(spoils()).toEqual([4, 4, 2, 60]);
  });
});
