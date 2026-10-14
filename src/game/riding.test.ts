import { afterEach, describe, expect, it } from 'vitest';
import { canStable, dismountHorse, horseIsHere, horseOnOffer, horses, mountHorse, registerHorse, resetRiding, stableHorse, stabledHorses } from './riding';

afterEach(() => {
  resetRiding();
  for (const id of Object.keys(horses)) delete horses[id];
  stabledHorses.ids = [];
  stabledHorses.assigned = {};
});

describe('a horse and the scene it lives in', () => {
  it('is recorded when the horse is first registered: a destination, or the homestead when none is named', () => {
    expect(registerHorse('herd', 'a.glb', -50, 8).world).toBeNull();
    expect(registerHorse('steed', 'b.glb', 1322.5, 994.25, 'template-02').world).toBe('template-02');
  });

  it('is kept: registering the horse again neither moves it nor rehouses it', () => {
    const first = registerHorse('steed', 'b.glb', 1, 2, 'template-02');
    const again = registerHorse('steed', 'b.glb', 30, 40);
    expect(again).toBe(first);
    expect([again.x, again.z, again.homeX, again.homeZ, again.world]).toEqual([1, 2, 1, 2, 'template-02']);
  });

  it('decides where the horse is: there, and in no other scene', () => {
    const herd = registerHorse('herd', 'a.glb', -50, 8);
    const steed = registerHorse('steed', 'b.glb', 1322.5, 994.25, 'template-02');
    // the store's `destination` is null at home; a caller with none to hand passes undefined
    for (const home of [null, undefined]) {
      expect(horseIsHere(herd, home)).toBe(true);
      expect(horseIsHere(steed, home)).toBe(false);
    }
    expect(horseIsHere(steed, 'template-02')).toBe(true);
    expect(horseIsHere(herd, 'template-02')).toBe(false);
    // a scene whose ground lies over the steed's field, in the same coordinates, is still another scene
    for (const elsewhere of ['template-01', 'template-03', 'dungeon', 'arena']) {
      expect(horseIsHere(steed, elsewhere)).toBe(false);
      expect(horseIsHere(herd, elsewhere)).toBe(false);
    }
  });

  it('is not changed by a ride: getting off moves the horse and its home, not its scene', () => {
    const steed = registerHorse('steed', 'b.glb', 1322.5, 994.25, 'template-02');
    mountHorse('steed');
    expect(steed.mounted).toBe(true);
    dismountHorse(1310, 980, 0);
    expect([steed.x, steed.z, steed.homeX, steed.homeZ, steed.mounted]).toEqual([1310, 980, 1310, 980, false]);
    expect(steed.world).toBe('template-02');
  });
});

describe('the horse E offers', () => {
  it('is one that lives in the scene the player is in', () => {
    const herd = registerHorse('herd', 'a.glb', -50, 8);
    const steed = registerHorse('steed', 'b.glb', 1322.5, 994.25, 'template-02');
    expect(horseOnOffer(herd, null)).toBe(true);
    expect(horseOnOffer(steed, 'template-02')).toBe(true);
    // Richard's steed is not on offer next door, though its place is ground a player can walk on there...
    expect(horseOnOffer(steed, 'template-01')).toBe(false);
    expect(horseOnOffer(steed, null)).toBe(false);
    // ...and neither is a horse of the herd whose record has been left at a destination
    herd.x = 1000;
    herd.z = 977.4;
    expect(horseOnOffer(herd, 'template-01')).toBe(false);
    expect(horseOnOffer(herd, 'template-02')).toBe(false);
  });

  it('is never the one being ridden', () => {
    const herd = registerHorse('herd', 'a.glb', -50, 8);
    mountHorse('herd');
    expect(horseOnOffer(herd, null)).toBe(false);
    dismountHorse(-40, 10, 0);
    expect(horseOnOffer(herd, null)).toBe(true);
  });
});

describe("the homestead's stable", () => {
  it('takes a horse of its own herd, once', () => {
    registerHorse('herd', 'a.glb', -50, 8);
    expect(canStable('herd')).toBe(true);
    stableHorse('herd');
    expect(stabledHorses.ids).toEqual(['herd']);
    expect(canStable('herd')).toBe(false);
  });

  it("does not take a horse that lives at a destination: Richard's steed stays his", () => {
    registerHorse('steed', 'b.glb', 1322.5, 994.25, 'template-02');
    expect(canStable('steed')).toBe(false);
  });

  it('does not take a horse there is no record of', () => {
    expect(canStable('nobody')).toBe(false);
  });
});
