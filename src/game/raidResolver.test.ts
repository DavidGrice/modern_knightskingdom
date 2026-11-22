import { describe, expect, it } from 'vitest';
import { RAZE_SHARE, resolveRaid, type RaidDefender, type RaidField, type RaidPiece, type RaidRaider } from './raidResolver';
import { balanceDefender, defenderFighter, raidFighters, type Fighter } from './garrisonBalance';
import { RUN_HAUL } from './plunder';

// G-07 · the lost-raid resolver, pure: the garrison's fight (G-08's model, with defenders posted up and thieves), the
// theft, the ruins and the razing, each from the same inputs to the same settlement.

const guard = (id: string, level = 1, up = false): RaidDefender => ({ id, fighter: defenderFighter(balanceDefender('base', level)), up });
const fighter = (f: Fighter, breaksAt = -Infinity): RaidRaider => ({ fighter: f, breaksAt, thief: false, carried: {}, atStores: 0 });
const thief = (f: Fighter, carried = {}, atStores = 0): RaidRaider => ({ fighter: f, breaksAt: -Infinity, thief: true, carried, atStores });
/** Gilbert and `followers` bandits at threat tier `tier`, every other follower from the first a thief (thiefSlot) */
const raid = (followers: number, tier = 0): RaidRaider[] => {
  const all = raidFighters(followers, { tier, difficultyMult: 1 });
  return all.map((f, i) => (i < followers && i % 2 === 0 ? thief(f) : fighter(f)));
};
/** eight huts on a ring round home, one each 45 degrees from east (bearing 0) round by south (z+), and four walls */
const huts: RaidPiece[] = Array.from({ length: 8 }, (_, i) => ({
  ref: 'h' + i, name: 'Hut ' + i, x: Math.cos((i * Math.PI) / 4) * 20, z: Math.sin((i * Math.PI) / 4) * 20, batters: false, ruin: false,
}));
const walls: RaidPiece[] = [0, 1, 2, 3].map((i) => ({ ref: 'w' + i, name: 'Wall ' + i, x: 30, z: -6 + i * 4, batters: true, ruin: false }));
const field = (o: Partial<RaidField>): RaidField => ({
  garrison: [], raiders: raid(2), strength: 1, sides: [0], seed: 7, stores: { wood: 100, stone: 60 }, pieces: [...huts, ...walls], ...o,
});

describe('the lost-raid resolver', () => {
  it('over a table of garrisons and raids: a strong garrison holds, none loses, and a raid held costs nothing', () => {
    const rows: string[] = [];
    for (const n of [0, 1, 2, 4]) {
      for (const [followers, tier] of [[2, 0], [3, 0], [5, 2]]) {
        const s = resolveRaid(field({ garrison: Array.from({ length: n }, (_, i) => guard('d' + i, 3)), raiders: raid(followers, tier), strength: 1 + 0.35 * tier }));
        rows.push(`${n} vs ${followers} @${tier}: ${s.outcome} down ${s.downed.length} ruined ${s.ruined.length} razed ${s.razed.length}`);
      }
    }
    expect(rows).toMatchInlineSnapshot(`
      [
        "0 vs 2 @0: lost down 0 ruined 3 razed 2",
        "0 vs 3 @0: lost down 0 ruined 3 razed 2",
        "0 vs 5 @2: lost down 0 ruined 1 razed 5",
        "1 vs 2 @0: held down 0 ruined 0 razed 0",
        "1 vs 3 @0: held down 0 ruined 0 razed 0",
        "1 vs 5 @2: lost down 1 ruined 2 razed 3",
        "2 vs 2 @0: held down 0 ruined 0 razed 0",
        "2 vs 3 @0: held down 0 ruined 0 razed 0",
        "2 vs 5 @2: held down 0 ruined 0 razed 0",
        "4 vs 2 @0: held down 0 ruined 0 razed 0",
        "4 vs 3 @0: held down 0 ruined 0 razed 0",
        "4 vs 5 @2: held down 0 ruined 0 razed 0",
      ]
    `);
    const held = resolveRaid(field({ garrison: [guard('a', 3), guard('b', 3), guard('c', 3), guard('d', 3)] }));
    // (its thief took a few goods before the garrison came to him, and dropped them all)
    expect([held.outcome, held.stolen, held.recovered, held.ruined, held.razed]).toEqual(['held', {}, held.taken, [], []]);
  });

  it('razes more for a stronger raid and for more raiders standing, one at the least — and never what was not offered', () => {
    const razed = (followers: number, strength: number) =>
      resolveRaid(field({ raiders: raid(followers).map((r) => ({ ...r, thief: false })), strength })).razed.length;
    expect([1, 2, 2.75].map((s) => razed(2, s))).toEqual([2, 3, 4]); // 3 standing x strength x RAZE_SHARE, rounded
    expect([2, 3, 5].map((n) => razed(n, 1))).toEqual([2, 2, 3]);
    expect(RAZE_SHARE).toBe(0.5);
    expect(resolveRaid(field({ raiders: [fighter({ hp: 1, dmg: 1, cd: 1 })], strength: 0.5 })).razed).toHaveLength(1); // 0.25, and one at the least
    expect(resolveRaid(field({ pieces: huts.slice(0, 1), strength: 5 })).razed.map((p) => p.ref)).toEqual(['h0']);
  });

  it('is the same for the same raid, seed and homestead; another seed strays the order', () => {
    const a = resolveRaid(field({ strength: 2, seed: 11 })), b = resolveRaid(field({ strength: 2, seed: 11 }));
    expect(b).toEqual(a);
    const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => resolveRaid(field({ strength: 2, sides: [], seed })).razed.map((p) => p.ref).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('wrecks nearest the raid\'s sides first', () => {
    // the raid from the east (bearing 0): the huts east and either side of it go, the west's stand
    const east = resolveRaid(field({ raiders: raid(5).map((r) => ({ ...r, thief: false })), strength: 1, sides: [0], pieces: huts }));
    expect(east.razed.map((p) => p.ref).sort()).toEqual(['h0', 'h1', 'h7']);
    const west = resolveRaid(field({ raiders: raid(5).map((r) => ({ ...r, thief: false })), strength: 1, sides: [Math.PI], pieces: huts }));
    expect(west.razed.map((p) => p.ref).sort()).toEqual(['h3', 'h4', 'h5']);
  });

  it('a guard posted up is struck by no raider on the ground: alone he holds what he loses on the ground', () => {
    const vs = [...Array.from({ length: 4 }, () => fighter({ hp: 8, dmg: 1.5, cd: 1.6 })), fighter({ hp: 14, dmg: 2, cd: 1.5 })];
    expect(resolveRaid(field({ garrison: [guard('d', 1, false)], raiders: vs })).outcome).toBe('lost');
    const up = resolveRaid(field({ garrison: [guard('d', 1, true)], raiders: vs }));
    expect([up.outcome, up.downed]).toEqual(['held', []]);
    // with one on the ground beside him, the raiders strike him alone, and the guard up keeps the field
    const both = resolveRaid(field({ garrison: [guard('d', 1, true), { id: 'e', fighter: { hp: 5, dmg: 1, cd: 1.1 }, up: false }], raiders: vs }));
    expect([both.outcome, both.downed]).toEqual(['pressed', ['e']]);
  });

  it('a thief takes the biggest pile first, a good each GRAB_EVERY from when he is at the stores, until struck or full', () => {
    const bandit = { hp: 8, dmg: 1.5, cd: 1.6 };
    // no garrison: he tops his haul up to RUN_HAUL and is gone with it — the biggest pile first, then the next
    const lost = resolveRaid(field({ raiders: [fighter(bandit), thief(bandit, { plank: 4 })], stores: { wood: 10, stone: 9, plank: 1 } }));
    expect([lost.taken, lost.stolen, lost.recovered]).toEqual([{ wood: 9, stone: 7 }, { plank: 4, wood: 9, stone: 7 }, {}]);
    // two thieves out of one store: never more than it holds
    const two = resolveRaid(field({ raiders: [thief(bandit), thief(bandit)], stores: { wood: 25 } }));
    expect([two.taken, two.stolen]).toEqual([{ wood: 25 }, { wood: 25 }]);
    // a garrison that cuts the fighter down at once: the thief, struck as soon as he is all that is left, drops it all
    const held = resolveRaid(field({ garrison: [guard('a', 5), guard('b', 5)], raiders: [fighter(bandit), thief(bandit, { wood: 3 }, 0)] }));
    expect(held.outcome).toBe('held');
    expect([haul(held.stolen), held.recovered.wood! >= 3, held.taken.wood]).toEqual([0, true, held.recovered.wood! - 3]);
    // one still walking in, a long way off, has taken nothing by then
    const far = resolveRaid(field({ garrison: [guard('a', 5), guard('b', 5)], raiders: [fighter(bandit), thief(bandit, {}, 60)] }));
    expect([far.taken, far.recovered]).toEqual([{}, {}]);
    // held up long enough, he fills his sack and is gone before the garrison comes to him
    const slow = resolveRaid(field({ garrison: [guard('a', 1)], raiders: [fighter({ hp: 40, dmg: 0.1, cd: 2 }), thief(bandit)] }));
    expect([slow.outcome, haul(slow.stolen)]).toEqual(['held', RUN_HAUL]);
  });

  it('pressed ruins the pieces raiders batter, as many as the share of the garrison\'s health lost; held ruins none', () => {
    const vs = [fighter({ hp: 30, dmg: 10, cd: 1 }), fighter({ hp: 30, dmg: 10, cd: 1 })];
    const s = resolveRaid(field({ garrison: [guard('a', 5), guard('b', 5)], raiders: vs }));
    expect(s.outcome).toBe('pressed');
    expect(s.ruined.every((p) => p.batters)).toBe(true);
    expect(s.ruined.length).toBeGreaterThan(0);
    expect(s.ruined.length).toBeLessThanOrEqual(vs.length);
    expect(s.razed).toEqual([]);
    // a piece already a ruin is never ruined again (it can be razed)
    const ruins = walls.map((w) => ({ ...w, ruin: true }));
    expect(resolveRaid(field({ pieces: ruins, strength: 1 })).ruined).toEqual([]);
  });

  it('a raider who loses heart runs, out of the fight: a lone guard holds what he would lose against men who fight on', () => {
    const bandits = (breaksAt: number) => [0, 1, 2].map(() => fighter({ hp: 8, dmg: 1.5, cd: 1.6 }, breaksAt));
    const lone = { id: 'd', fighter: { hp: 14, dmg: 3, cd: 1.1 }, up: false };
    expect(resolveRaid(field({ garrison: [lone], raiders: bandits(-Infinity) })).outcome).toBe('lost');
    expect(resolveRaid(field({ garrison: [lone], raiders: bandits(2) })).outcome).not.toBe('lost');
    // one running already strikes no one, and is gone with what he carries; razing counts only those who stay
    const running = { ...thief({ hp: 8, dmg: 1.5, cd: 1.6 }, { stone: 5 }), breaksAt: Infinity };
    const s = resolveRaid(field({ raiders: [fighter({ hp: 8, dmg: 1.5, cd: 1.6 }), running], strength: 2 }));
    expect([s.outcome, s.stolen, s.taken, s.razed.length]).toEqual(['lost', { stone: 5 }, {}, 1]);
    // beaten off all the same, he is still gone with it
    const off = resolveRaid(field({ garrison: [guard('a', 5)], raiders: [fighter({ hp: 8, dmg: 1.5, cd: 1.6 }), running] }));
    expect([off.outcome, off.stolen, off.recovered]).toEqual(['held', { stone: 5 }, {}]);
  });

  it('with every raider who came to fight down or run, the thieves strip the stores and go: nothing is torn down', () => {
    const bandit = { hp: 8, dmg: 1.5, cd: 1.6 };
    // no garrison and no fighter standing, two thieves at the stores: lost, and they fill their sacks — that is all
    const thieves = resolveRaid(field({ raiders: [thief(bandit), thief(bandit)], strength: 2 }));
    expect([thieves.outcome, haul(thieves.stolen), thieves.ruined, thieves.razed]).toEqual(['lost', 2 * RUN_HAUL, [], []]);
    // every raider running for the road already: none stays to tear anything down (it razed one, at the least)
    const gone = resolveRaid(field({ raiders: [fighter(bandit, Infinity), fighter(bandit, Infinity)], strength: 2 }));
    expect([gone.outcome, gone.ruined, gone.razed]).toEqual(['lost', [], []]);
    // one who fights beside a thief, and the raid wrecks as before: 2 standing x strength 2 x RAZE_SHARE
    const both = resolveRaid(field({ raiders: [fighter(bandit), thief(bandit)], strength: 2 }));
    expect([both.razed.length, both.ruined.length]).toEqual([2, 2]);
  });
});

function haul(g: Record<string, number | undefined>): number {
  return Object.values(g).reduce<number>((a, n) => a + (n ?? 0), 0);
}
