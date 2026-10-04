import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './store/gameStore';
import { BLACK_DRAGON_TIER, DRAGON_TIER, difficultyState } from './difficulty';
import { dragonAir, dragonAirBlack } from './dragonAir';
import { BLACK_DRAGON, GREEN_DRAGON } from './dragonSiegeConfig';
import { audio } from '@/lib/audio';

const HERO = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();

/** a kingdom at the threat curve's ceiling, with or without a bow and arrows to answer a dragon with */
function kingdom(armed: boolean) {
  const st = game();
  useGameStore.setState({
    dayCount: 12,
    stats: { ...st.stats, buildingsPlaced: 20, kills: 100 },
    xp: Object.fromEntries(Object.keys(st.xp).map((k) => [k, 500000])) as typeof st.xp,
    inventory: { ...st.inventory, longbow: armed ? 1 : 0, arrow: armed ? 50 : 0 },
  });
}

beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  game().newGame(HERO as never);
});

describe('the two dragons', () => {
  it('the green dragon comes only once the omen has been seen, to a kingdom that can shoot back', () => {
    expect([difficultyState.tier, GREEN_DRAGON.allowed(game())]).toEqual([0, false]);
    kingdom(true);
    expect(difficultyState.tier).toBeGreaterThanOrEqual(DRAGON_TIER);
    expect(GREEN_DRAGON.allowed(game())).toBe(false); // no omen yet
    game().markDragonSeen();
    expect(GREEN_DRAGON.allowed(game())).toBe(true);
    kingdom(false);
    expect(GREEN_DRAGON.allowed(game())).toBe(false); // a spectator, not a fight
  });

  it('the black dragon comes only after the green one has been routed', () => {
    kingdom(true);
    game().markDragonSeen();
    expect(difficultyState.tier).toBeGreaterThanOrEqual(BLACK_DRAGON_TIER);
    expect(BLACK_DRAGON.allowed(game())).toBe(false);
    GREEN_DRAGON.record(game(), false); // endured, not routed
    expect(BLACK_DRAGON.allowed(game())).toBe(false);
    GREEN_DRAGON.record(game(), true);
    expect(BLACK_DRAGON.allowed(game())).toBe(true);
    kingdom(false);
    expect(BLACK_DRAGON.allowed(game())).toBe(false);
  });

  it('each keeps its own record', () => {
    const tally = () => {
      const s = game();
      return [s.dragonSieges, !!s.dragonRouted, s.blackDragonSieges, !!s.blackDragonRouted];
    };
    expect(tally()).toEqual([0, false, 0, false]);
    GREEN_DRAGON.record(game(), true);
    expect(tally()).toEqual([1, true, 0, false]);
    BLACK_DRAGON.record(game(), false);
    expect(tally()).toEqual([1, true, 1, false]);
    BLACK_DRAGON.record(game(), true);
    expect(tally()).toEqual([1, true, 2, true]);
  });

  it('each flies on its own channel, under its own names', () => {
    // toBe, not toEqual: at rest the two channels are equal field for field
    expect(GREEN_DRAGON.air).toBe(dragonAir);
    expect(BLACK_DRAGON.air).toBe(dragonAirBlack);
    expect(dragonAir).not.toBe(dragonAirBlack);
    expect([GREEN_DRAGON.boss, GREEN_DRAGON.rig, GREEN_DRAGON.debugKey]).toEqual(['dragon', 'green', '__kkSiege']);
    expect([BLACK_DRAGON.boss, BLACK_DRAGON.rig, BLACK_DRAGON.debugKey]).toEqual(['blackDragon', 'black', '__kkBlackSiege']);
    expect(GREEN_DRAGON.lines.struck('A defender', 2, 5)).toBe('A defender strikes the beast! (2/5)');
    expect(BLACK_DRAGON.lines.boltStruck(5, 6)).toBe('🏹 A bolt strikes the black beast! (5/6)');
    expect(BLACK_DRAGON.lines.scream('Wat')).toContain('Wat points at the black shape overhead');
  });

  it('the black dragon is the hotter, tougher, faster and rarer of the two', () => {
    const harder = (k: 'breathDamage' | 'hitsToRoutBase' | 'orbitRate' | 'wingRate') => BLACK_DRAGON[k] > GREEN_DRAGON[k];
    expect([harder('breathDamage'), harder('hitsToRoutBase'), harder('orbitRate'), harder('wingRate')]).toEqual([true, true, true, true]);
    // quicker with its fire, tighter in its circle, rarer to come
    expect(BLACK_DRAGON.breathEvery).toBeLessThan(GREEN_DRAGON.breathEvery);
    expect(BLACK_DRAGON.firstBreath).toBeLessThan(GREEN_DRAGON.firstBreath);
    expect(BLACK_DRAGON.circleR).toBeLessThan(GREEN_DRAGON.circleR);
    expect(BLACK_DRAGON.rollChance).toBeLessThan(GREEN_DRAGON.rollChance);
  });
});
