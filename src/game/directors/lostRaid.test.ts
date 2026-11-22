import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { combatState, damagePlayer, useEnemyStore } from '@/game/combat';
import { worldEnv } from '@/game/env';
import { defenderMaxHp, defenderState, registerDefender } from '@/game/defenders';
import { balanceDefender } from '@/game/garrisonBalance';
import { gotAway, raidHaul } from '@/game/plunder';
import { useGameStore } from '@/game/store/gameStore';
import type { CharacterConfig, PlacedBuilding, Villager } from '@/game/types';
import { MERCHANT_CAMP_STATION } from '@/game/data/trade';
import { blowAtGuard } from '@/game/enemyAi/blows';
import { raidDirector } from './raidDirector';
import { raidField } from './raidSettle';
import { reportSaying } from '@/components/hud/RaidReportPanel';
import type { RaidReport } from '@/game/raidResolver';
import { raidActive, raidCooldown, raidForce, raidLost, raidPlan } from './state';

// G-07 · the knock-out and the raid's two endings. The golden block was written and run on the unchanged base (wave
// 72's merge) before the lost-raid resolver went in; what G-07 changed in it on purpose is said where it changed.

const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
const game = () => useGameStore.getState();
const raiders = () => useEnemyStore.getState().enemies.filter((e) => e.raid);
let notes: string[] = [];

const tick = () => raidDirector(game(), useEnemyStore.getState().enemies, useEnemyStore.getState().spawn, raidCooldown, raidActive, raidLost);
const piece = (id: string, type: string, x: number, z: number): PlacedBuilding => ({ id, type, x, z, y: 0, rot: 0, built: 1, world: null });
/** the homestead established (four huts north of home and a stockpile), the roll forced, and on through the warning */
function startRaid(): void {
  useGameStore.setState({
    buildings: [...[0, 1, 2, 3].map((i) => piece('h' + i, 'hut', -12 + i * 8, -30)), piece('s1', 'stockpile', 10, 10)],
    unlocks: [...game().unlocks, 'mining'],
  });
  worldEnv.time = 0.71;
  raidForce.current = true;
  do tick(); while (raidPlan.incoming > 0);
}
/** `n` sworn defenders of level `level`, sword and shield, standing at full health beside home */
function garrison(n: number, level = 3): Villager[] {
  const vs = Array.from({ length: n }, (_, i) => ({ ...balanceDefender('base', level), id: 'd' + i, name: 'Guard ' + i }));
  useGameStore.setState({ villagers: vs });
  vs.forEach((v, i) => {
    const ds = registerDefender(v.id, i * 2, 0, 20);
    ds.maxHp = ds.hp = defenderMaxHp(v);
  });
  return vs;
}
const spoils = () => [game().inventory.plank ?? 0, game().inventory.stone ?? 0, game().inventory.iron_ore ?? 0, game().xp.combat];

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(() => 0.999); // no ram, no ladder, no caster, no Armory drop
  vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  game().newGame(HERO);
  notes = [];
  useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
  combatState.iframeUntil = 0;
});
afterEach(() => { vi.restoreAllMocks(); });

describe('golden: the knock-out and the raid director\'s two endings, as they were before G-07', () => {
  it('won: the raiders gone, the spoils, the experience, the notice with the haul, the Armory\'s drop and the horn', () => {
    startRaid();
    vi.mocked(Math.random).mockImplementation(() => 0.2); // the drop comes (< 0.4), and it is the chestplate (pick: 0.2 x 5)
    useEnemyStore.getState().clear();
    gotAway(game(), { stone: 3 });
    tick();
    // (the 60 experience is the first combat level's: its notice comes between the two)
    expect(notes.slice(-3).filter((n) => !n.startsWith('Combat level'))).toEqual([
      'The raid is beaten back! The bandits dropped their spoils. They got away with 3× Stone.',
      'A fallen raider\'s iron chestplate is added to the Armory.',
    ]);
    expect(spoils()).toEqual([4, 4, 2, 60]);
    expect(game().armory.chestplate).toBe(1);
    expect(vi.mocked(audio.play).mock.calls.at(-1)).toEqual(['horn', 0.8]);
    expect([raidActive.current, raidLost.current, raidPlan.sides, raidHaul.lost]).toEqual([false, false, [], {}]);
    expect(game().plunder).toEqual({ stone: 3 });
  });

  // G-07 changed this one on purpose: a raid lost now razes (2 pieces: 3 raiders standing x strength 1 x RAZE_SHARE),
  // the end no longer says "they left nothing behind", and the report opens on waking
  it('a knock-out at home with no garrison: the raiders cleared, a thief\'s haul into the ledger, dawn — then "had the field"', () => {
    startRaid();
    const thief = raiders().find((e) => e.thief)!;
    thief.carried = { wood: 6 };
    const inventory = { ...game().inventory };
    damagePlayer(999);
    expect(raidLost.current).toBe(true);
    expect(raiders()).toEqual([]);
    expect(worldEnv.time).toBe(0.27);
    expect(notes.at(-1)).toBe('You were knocked out and carried back to camp… you wake at dawn.');
    expect(game().plunder).toEqual({ wood: 6 });
    tick();
    expect(notes.at(-1)).toBe('The raiders had the field. They are gone by dawn, and they took and tore down what they could. They got away with 6× Wood Log.');
    expect(spoils()).toEqual([0, 0, 0, 0]);
    expect(game().buildings.map((b) => b.id)).toEqual(['h0', 'h1', 'h2']); // was: every piece standing
    expect(game().raidReport).toMatchObject({ outcome: 'lost', lost: { wood: 6 }, razed: ['Stockpile', 'hut'], ruined: [], downed: [] });
    expect(game().panel).toBe('raidReport');
    expect(game().inventory).toEqual(inventory);
    expect([raidActive.current, raidLost.current]).toEqual([false, false]);
  });

  // G-07 changed this one on purpose: four level-3 defenders hold against Gilbert and two, so the raid is beaten back
  // and paid as one, the garrison unhurt enough to stay on its feet (it read "had the field", nothing paid)
  it('a knock-out at home with a strong garrison standing: it holds, and the raid is paid as beaten back (was: lost, nothing paid)', () => {
    startRaid();
    garrison(4);
    damagePlayer(999);
    expect(raidLost.current).toBe(false);
    tick();
    expect(notes.filter((n) => n.startsWith('The raid is beaten back!'))).toHaveLength(1);
    expect(spoils()).toEqual([4, 4, 2, 60]);
    expect(Object.values(defenderState).map((d) => d.state)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(game().raidReport).toMatchObject({ outcome: 'held', razed: [], ruined: [], downed: [] });
  });

  // G-07 changed this one on purpose: settled the same way as at home (the end's words, and its razing)
  it('a knock-out away from home while the home raid runs takes the home raid too, as lost', () => {
    startRaid();
    useGameStore.setState({ destination: 'template-01' } as never);
    damagePlayer(999);
    expect([raidLost.current, raiders().length, game().destination]).toEqual([true, 0, null]);
    tick();
    expect(notes.at(-1)).toBe('The raiders had the field. They are gone by dawn, and they took and tore down what they could.');
    expect(spoils()).toEqual([0, 0, 0, 0]);
    expect(game().raidReport?.razed).toHaveLength(2);
  });
});

describe('a raid the player falls out of, settled (G-07)', () => {
  it('a lost raid razes keep pieces to their bare sockets, leaves others ruins, and never touches the foundation', () => {
    startRaid();
    const parts: Record<string, string> = {
      nw: 'corner_block', ne: 'corner_block', se: 'corner_block', sw: 'corner_block',
      n: 'wall_low', e: 'gatehouse', s: 'wall_low', w: 'wall_low', hall: 'great_hall',
    };
    useGameStore.setState({
      keep: { x: 0, z: 40, y: 0, parts, built: Object.fromEntries(Object.keys(parts).map((k) => [k, 1])), gateOpen: { e: false } },
      buildings: [{ ...piece('f', 'keep', 0, 40) }],
    });
    useGameStore.setState({ difficulty: 'grueling' }); // raidStrength 1.7: 3 standing x 1.7 x RAZE_SHARE, rounded, is 3 razed
    damagePlayer(999);
    const keep = game().keep!;
    const bare = Object.keys(parts).filter((k) => !keep.parts[k]);
    const ruined = Object.keys(keep.ruined ?? {});
    expect([bare.length, ruined.length]).toEqual([3, 3]);
    expect(ruined.every((k) => keep.built[k] === 0 && keep.parts[k])).toBe(true);
    expect(bare.every((k) => keep.built[k] === undefined)).toBe(true);
    expect(game().buildings.map((b) => b.id)).toEqual(['f']);
    expect(game().raidReport?.razed).toHaveLength(3);
  });

  it('a garrison beaten marks its defenders downed, as a blow in the world does', () => {
    startRaid();
    garrison(1, 1);
    useGameStore.setState({ villagers: game().villagers.map((v) => ({ ...v, loadout: undefined })) });
    damagePlayer(999);
    expect(game().raidReport).toMatchObject({ outcome: 'lost', downed: ['Guard 0'] });
    expect([defenderState.d0.state, defenderState.d0.hp]).toEqual(['downed', 0]);
    expect(defenderState.d0.downedUntil).toBeGreaterThan(Date.now());
  });

  it('away, with the garrison down and raiders at the homestead, the raid is settled as lost; the report waits for his return', () => {
    startRaid();
    garrison(1);
    useGameStore.setState({ destination: 'template-01' } as never);
    defenderState.d0.state = 'downed';
    tick();
    expect(raiders()).toHaveLength(3); // still walking in from the road
    defenderState.d0.state = 'ok';
    for (const e of raiders()) e.mob.approaching = false;
    tick();
    expect(raiders()).toHaveLength(3); // the garrison stands: the raid goes on, live
    defenderState.d0.state = 'downed';
    tick();
    expect([raiders().length, raidLost.current]).toEqual([0, true]);
    expect(notes.at(-1)).toBe('Word from home: the garrison is down, and the raiders have the homestead.');
    expect(game().raidReport).toMatchObject({ outcome: 'lost', away: true, shown: false });
    expect(game().panel).toBe('none');
    tick();
    // settled at the hour the garrison fell: no "by dawn" (there is no night between, as a knock-out has)
    expect(notes.at(-1)).toMatch(/^The raiders had the field\. They are gone, and they took and tore down what they could\./);
    useGameStore.setState({ destination: null } as never); // home
    expect([game().panel, game().raidReport?.shown]).toEqual(['raidReport', true]);
  });

  it('a report waiting for his return is saved, and a save loaded opens it; one read is not saved', () => {
    startRaid();
    useGameStore.setState({ destination: 'template-01' } as never);
    for (const e of raiders()) e.mob.approaching = false;
    tick();
    const save = JSON.parse(JSON.stringify(game().toSave()));
    expect(save.raidReport).toMatchObject({ outcome: 'lost', away: true, shown: false });
    game().newGame(HERO);
    expect([game().raidReport, game().panel]).toEqual([null, 'none']);
    game().loadFromSave(save);
    expect([game().panel, game().raidReport?.razed]).toEqual(['raidReport', save.raidReport.razed]);
    expect('raidReport' in JSON.parse(JSON.stringify(game().toSave()))).toBe(false);
    // and its reading marks the game to be saved, so the autosave stops holding it unread — as a report set does
    expect(game().dirty).toBe(true);
    useGameStore.setState({ dirty: false });
    game().setRaidReport({ ...game().raidReport!, shown: false });
    expect(game().dirty).toBe(true);
  });

  it('a knock-out with only thieves left standing: lost, and they strip the stores and go — nothing torn down, nor said to be', () => {
    startRaid();
    // the fighters down already (Gilbert and the bandit who fights), the thief at the stores
    for (const e of raiders()) if (!e.thief) e.mob.state = 'dying';
    damagePlayer(999);
    expect(game().raidReport).toMatchObject({ outcome: 'lost', ruined: [], razed: [] });
    expect(game().buildings).toHaveLength(5);
    tick();
    expect(notes.at(-1)).toMatch(/^The raiders had the field\. They are gone by dawn, and they took what they could\./);
    // the panel says the same
    const r = game().raidReport!;
    expect(reportSaying(r)).toBe('no defender stood against the raiders, and they took what they could before they went.');
    const tore: RaidReport = { ...r, razed: ['Hut'], downed: ['Guard 0'] };
    expect(reportSaying(tore)).toBe('every defender went down, and the raiders took and tore down what they could before they went.');
    expect(reportSaying({ ...r, outcome: 'pressed' })).toBe('your defenders beat the raiders off, but it cost them dear.');
  });

  it('away with no garrison at all, the same once a raider is up at the homestead', () => {
    startRaid();
    useGameStore.setState({ destination: 'template-01' } as never);
    tick();
    expect(raiders()).toHaveLength(3);
    raiders()[0].mob.approaching = false;
    tick();
    expect(raiders()).toHaveLength(0);
  });

  it('reads the live fight: each defender at the health he has, and a guard posted up', () => {
    // one level-1 bare-handed guard against Gilbert and two: on the ground at his full health he is beaten...
    const bare = () => { startRaid(); garrison(1, 1); useGameStore.setState({ villagers: game().villagers.map((v) => ({ ...v, loadout: undefined })) }); };
    bare();
    damagePlayer(999);
    expect(game().raidReport?.outcome).toBe('lost');
    // ...posted up on a tower, struck by none of them, he holds
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    bare();
    defenderState.d0.elevated = true;
    damagePlayer(999);
    expect(game().raidReport?.outcome).toBe('held');
    // a level-3 guard holds alone; the same guard left a quarter of a hit point is beaten
    for (const hp of [36, 0.25]) {
      game().newGame(HERO);
      useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
      startRaid();
      garrison(1);
      defenderState.d0.hp = hp;
      damagePlayer(999);
      expect(game().raidReport?.outcome).toBe(hp > 1 ? 'held' : 'lost');
    }
  });

  it('the stores: a thief at them takes from them and, beaten off, gives it back; one far off takes nothing; lost, it is gone', () => {
    startRaid();
    garrison(4);
    useGameStore.setState({ inventory: { wood: 50, stone: 10 } });
    const [, near, fighter] = raiders();
    Object.assign(near.mob, { x: 10, z: 10 }); // at the stockpile
    // a raider no longer a thief who still carries goods is one all the same: he fights no one, and drops them
    Object.assign(fighter, { thief: false, carried: { plank: 2 } });
    Object.assign(fighter.mob, { x: 300, z: 300 });
    damagePlayer(999);
    const r = game().raidReport!;
    expect(r.outcome).toBe('held');
    expect(r.recovered.plank).toBe(2);
    expect(r.recovered.wood).toBeGreaterThan(0); // the thief at the store took some, and dropped it
    expect(game().inventory.wood).toBe(50); // ...back in the stores
    expect(game().inventory.plank).toBe(2);
    // the same thief a long walk off when it is settled: the garrison comes to him before he is at the stores
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    startRaid();
    garrison(4);
    useGameStore.setState({ inventory: { wood: 50, stone: 10 } });
    Object.assign(raiders().find((e) => e.thief)!.mob, { x: 300, z: 300 });
    damagePlayer(999);
    expect([game().raidReport?.outcome, game().raidReport?.recovered]).toEqual(['held', {}]);
    // the same raid with no garrison: the thief tops his haul up to 20 and is gone with it, into the ledger
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    startRaid();
    useGameStore.setState({ inventory: { wood: 50, stone: 10 } });
    damagePlayer(999);
    expect([game().inventory, game().plunder]).toEqual([{ wood: 30, stone: 10 }, { wood: 20 }]);
  });

  it('a bandit who loses heart is out of the fight, as in the world; one running already is gone and razes nothing', () => {
    startRaid();
    // each live raider breaks where he would in the world: a bandit at 2, Gilbert never; one running already, at once
    const [lead, , bandit] = raiders();
    expect(raidField(game(), [lead, bandit]).raiders.map((r) => r.breaksAt)).toEqual([-Infinity, 2]);
    bandit.mob.fleeing = true;
    expect(raidField(game(), [bandit]).raiders[0].breaksAt).toBe(Infinity);
    bandit.mob.fleeing = false;
    // one level-1 guard, a sword and shield, against Gilbert and two bandits who break at 2 health
    garrison(1, 1);
    damagePlayer(999);
    expect(game().raidReport?.outcome).toBe('pressed');
    // two of the three running for the road already: the one who stays razes one piece (it was two for three)
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    startRaid();
    raiders().slice(1).forEach((e) => { e.mob.fleeing = true; });
    damagePlayer(999);
    expect(game().raidReport?.razed).toHaveLength(1);
  });

  it('the report names the defenders the raiders knocked down in the fight, not only those the settling puts down', () => {
    // one level-1 guard knocked down by Gilbert while the player is away: settled then, with no one left to put down
    startRaid();
    garrison(1, 1);
    useGameStore.setState({ destination: 'template-01' } as never);
    for (const e of raiders()) e.mob.approaching = false;
    defenderState.d0.hp = 0.1;
    blowAtGuard(raiders().find((e) => e.kind === 'gilbert')!, game(), defenderState.d0, 'd0', false);
    expect(defenderState.d0.state).toBe('downed');
    tick();
    expect(game().raidReport).toMatchObject({ outcome: 'lost', away: true, downed: ['Guard 0'] }); // was: none
    // the next raid's report starts afresh
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    startRaid();
    damagePlayer(999);
    expect(game().raidReport?.downed).toEqual([]);
  });

  it('the guard posted at the merchant\'s camp is no part of the homestead\'s garrison', () => {
    // away, the home guard down and the camp's standing: the homestead has no defender, and it is settled
    startRaid();
    garrison(2);
    useGameStore.setState({ villagers: game().villagers.map((v) => (v.id === 'd1' ? { ...v, stationId: MERCHANT_CAMP_STATION } : v)) });
    useGameStore.setState({ destination: 'template-01' } as never);
    for (const e of raiders()) e.mob.approaching = false;
    defenderState.d0.hp = 0.1;
    blowAtGuard(raiders().find((e) => e.kind === 'gilbert')!, game(), defenderState.d0, 'd0', false);
    tick();
    expect([raiders().length, game().raidReport?.outcome, game().raidReport?.downed]).toEqual([0, 'lost', ['Guard 0']]);
    expect(defenderState.d1.state).toBe('ok');
    // knocked out at home with only the camp's guard sworn: no one fought for the homestead (a level-3 guard holds alone)
    game().newGame(HERO);
    useGameStore.setState({ notify: (text: string) => { notes.push(text); } } as never);
    startRaid();
    garrison(1);
    useGameStore.setState({ villagers: game().villagers.map((v) => ({ ...v, stationId: MERCHANT_CAMP_STATION })) });
    damagePlayer(999);
    expect(game().raidReport).toMatchObject({ outcome: 'lost', downed: [] });
    tick();
    expect(spoils()).toEqual([0, 0, 0, 0]);
  });

  it('never razes the foundation of the keep, even with nothing else to raze', () => {
    startRaid();
    useGameStore.setState({ keep: { x: 0, z: 40, y: 0, parts: {}, built: {} }, buildings: [piece('f', 'keep', 0, 40)] });
    damagePlayer(999);
    expect([game().buildings.map((b) => b.id), game().raidReport?.razed]).toEqual([['f'], []]);
  });
});
