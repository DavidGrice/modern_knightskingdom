import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORDER = vi.hoisted(() => [] as string[]);
vi.mock('./fort', () => ({ refreshFort: () => { ORDER.push('refreshFort'); } }));

import {
  beginWorldFrame, claimWorldTicks, sweepDue, sweepWorld, tickWorldFrame, tickWorldHeld, WORLD_SWEEP_S, worldTickOwner,
} from './worldTick';
import { runSessionResetHooks } from './store/sessionHooks';
import { fishingState } from './fishing';
import { BUILD_CHALLENGE_ID, buildChallengeState, startBuildChallenge } from './buildChallenge';
import { BUILDABLE_BY_ID } from './data/buildables';
import { STATION_RANGE } from './data/world';

type FrameStore = Parameters<typeof tickWorldFrame>[0];
type SweepStore = Parameters<typeof sweepWorld>[0];
const said: string[] = [];
const frameStore = (over: Partial<FrameStore> = {}) => ({ nodes: [], destination: null, notify: (text: string) => { said.push(text); }, ...over }) as unknown as FrameStore;
/** a piece of the catalogue that is a crafting station of the given kind */
const stationPiece = (station: string) => Object.values(BUILDABLE_BY_ID).find((b) => b.station === station)!.id;

beforeEach(() => {
  ORDER.length = 0;
  said.length = 0;
  Object.assign(fishingState, { nodeId: null, phase: 'idle', nextEventAt: 0, biteDeadline: 0 });
  Object.assign(buildChallengeState, { active: false, deadline: 0, built: 0 });
  vi.spyOn(performance, 'now').mockReturnValue(100_000);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the world\'s ticks of every frame', () => {
  it('with no line cast, do not so much as look for the fishing spot — and tick the build challenge', () => {
    startBuildChallenge();
    const nodes = { find: () => { throw new Error('the nodes were searched'); } };
    tickWorldFrame(frameStore({ nodes: nodes as never, destination: 'template-04' }), 0, 0);
    expect(buildChallengeState.active).toBe(false); // off its ground: the challenge ends, without a word
    expect(said).toEqual([]);
  });

  it('with a line cast, measure to the spot from where the player stands: past 6 m the line is reeled in', () => {
    const nodes = [{ id: 'pond', x: 10, z: 0, respawnAt: null }, { id: 'other', x: 0, z: 0, respawnAt: null }];
    Object.assign(fishingState, { nodeId: 'pond', phase: 'waiting', nextEventAt: 900_000 });
    tickWorldFrame(frameStore({ nodes: nodes as never }), 4.1, 0);
    expect(fishingState.nodeId).toBe('pond');
    tickWorldFrame(frameStore({ nodes: nodes as never }), 10, 6.1);
    expect(fishingState.nodeId).toBeNull();
    Object.assign(fishingState, { nodeId: 'gone', phase: 'waiting', nextEventAt: 900_000 });
    tickWorldFrame(frameStore({ nodes: nodes as never }), 0, 0); // a spot that is no longer there
    expect(fishingState.nodeId).toBeNull();
  });

  it('tick the line first and the build challenge after it, each with the frame\'s own words', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    Object.assign(fishingState, { nodeId: 'pond', phase: 'biting', biteDeadline: 99_999 });
    startBuildChallenge();
    buildChallengeState.deadline = 100_000;
    tickWorldFrame(frameStore({ nodes: [{ id: 'pond', x: 0, z: 0, respawnAt: null }] as never, destination: BUILD_CHALLENGE_ID }), 1, 1);
    expect(fishingState.phase).toBe('waiting');
    expect(buildChallengeState.active).toBe(false);
    expect(said).toEqual(['The fish got away!', expect.stringMatching(/^Time's up! You raised 0\//)]);
  });
});

const sweepStore = (buildings: { type: string; x: number; z: number }[]) => ({
  buildings,
  setNearStations: (near: string[]) => { ORDER.push('setNearStations ' + JSON.stringify(near)); },
  tickRespawns: () => { ORDER.push('tickRespawns'); },
  tickPlots: (dt: number) => { ORDER.push('tickPlots ' + dt); },
  tickVillagers: (dt: number) => { ORDER.push('tickVillagers ' + dt); },
  checkVillagerArrival: () => { ORDER.push('checkVillagerArrival'); },
}) as unknown as SweepStore;

describe('the world\'s half-second sweep', () => {
  it('is half a second long', () => {
    expect(WORLD_SWEEP_S).toBe(0.5);
  });

  it('names the stations within reach of the player — each once, in order — from the buildings it is handed', () => {
    expect(STATION_RANGE).toBe(4.5);
    const fire = stationPiece('campfire'), bench = stationPiece('workbench'), forge = stationPiece('forge');
    const wall = Object.values(BUILDABLE_BY_ID).find((b) => !b.station)!.id;
    sweepWorld(sweepStore([
      { type: bench, x: 10 + 4.4, z: 20 }, { type: fire, x: 10, z: 20 - 4.4 }, { type: fire, x: 11, z: 21 },
      { type: forge, x: 10 + 4.6, z: 20 }, { type: wall, x: 10, z: 20 }, { type: 'no such piece', x: 10, z: 20 },
    ]), 10, 20);
    expect(ORDER[0]).toBe('setNearStations ["campfire","workbench"]');
    ORDER.length = 0;
    sweepWorld(sweepStore([]), 10, 20);
    expect(ORDER[0]).toBe('setNearStations []');
  });

  it('then looks to the wall ring, the respawns, the plots and the villagers by half a second each, and who has arrived — in that order', () => {
    sweepWorld(sweepStore([]), 0, 0);
    expect(ORDER).toEqual(['setNearStations []', 'refreshFort', 'tickRespawns', 'tickPlots 0.5', 'tickVillagers 0.5', 'checkVillagerArrival']);
  });
});

describe('who runs the world\'s ticks (wave 65.1, the owner\'s OD-08)', () => {
  type Flags = Parameters<typeof worldTickOwner>[0];
  const FLAGS: Flags[] = [];
  for (const paused of [false, true]) for (const ceremony of [null, { rank: 'Knight' }]) for (const buildMode of [false, true]) {
    for (const panel of ['none', 'inventory'] as const) FLAGS.push({ paused, ceremony, buildMode, panel });
  }
  const label = (f: Flags) => `paused ${f.paused}, ceremony ${!!f.ceremony}, build mode ${f.buildMode}, panel ${f.panel}`;
  /** the controller's own test of a frozen frame (PlayerController.tsx): it runs the ticks only when it is not */
  const controllerFrozen = (f: Flags) => f.paused || f.buildMode || f.panel !== 'none' || !!f.ceremony;

  it('runs the world in build mode and behind a panel, and stops it only when paused or in a ceremony', () => {
    expect(worldTickOwner({ paused: false, ceremony: null, buildMode: false, panel: 'none' })).toBe('player');
    expect(worldTickOwner({ paused: false, ceremony: null, buildMode: true, panel: 'none' })).toBe('ticker');
    expect(worldTickOwner({ paused: false, ceremony: null, buildMode: false, panel: 'inventory' })).toBe('ticker');
    expect(worldTickOwner({ paused: true, ceremony: null, buildMode: true, panel: 'none' })).toBeNull();
    expect(worldTickOwner({ paused: false, ceremony: { rank: 'Knight' }, buildMode: false, panel: 'inventory' })).toBeNull();
    for (const f of FLAGS) {
      expect(worldTickOwner(f) !== null, label(f)).toBe(!f.paused && !f.ceremony);
      // the controller's frames are exactly the frames the gate gives it
      expect(worldTickOwner(f) === 'player', label(f)).toBe(!controllerFrozen(f));
    }
  });

  it('gives every frame exactly one owner while the world runs, and none while it stands still', () => {
    for (const f of FLAGS) {
      let runs = 0;
      beginWorldFrame();
      // WorldTicker first (its frame callback has priority -1), then the controller
      if (worldTickOwner(f) === 'ticker' && claimWorldTicks()) runs++;
      if (!controllerFrozen(f) && claimWorldTicks()) runs++;
      expect(runs, label(f)).toBe(worldTickOwner(f) ? 1 : 0);
    }
  });

  it('never runs the ticks twice in a frame, even when the store changes hands between the two owners', () => {
    beginWorldFrame();
    expect(claimWorldTicks()).toBe(true);
    expect(claimWorldTicks()).toBe(false);
    beginWorldFrame();
    expect(claimWorldTicks()).toBe(true);
    // a frame that opens behind a panel which shuts before the controller's turn: WorldTicker has run the ticks
    beginWorldFrame();
    let runs = 0;
    if (worldTickOwner({ paused: false, ceremony: null, buildMode: false, panel: 'inventory' }) === 'ticker' && claimWorldTicks()) runs++;
    if (!controllerFrozen({ paused: false, ceremony: null, buildMode: false, panel: 'none' }) && claimWorldTicks()) runs++;
    expect(runs).toBe(1);
  });

  it('keeps one sweep countdown across owners and remounts: no free half second on the way back from build mode', () => {
    runSessionResetHooks();
    expect(sweepDue(1 / 64)).toBe(true); // a session start sweeps at once
    expect(sweepDue(0.25)).toBe(false);
    expect(sweepDue(0.125)).toBe(false); // an eighth of a second left: build mode opens, and the controller unmounts
    expect(sweepDue(0.125)).toBe(true); // WorldTicker's frame
    expect(sweepDue(0.25)).toBe(false); // build mode shuts: the controller's first frame back does not sweep
    expect(sweepDue(0.25)).toBe(true);
  });

  it('in a held frame, runs the build challenge\'s countdown and the sweep from where the player stands, but not the fishing bite', () => {
    runSessionResetHooks();
    Object.assign(fishingState, { nodeId: 'pond', phase: 'biting', biteDeadline: 99_999 });
    startBuildChallenge();
    buildChallengeState.deadline = 100_000;
    const fire = stationPiece('campfire');
    const st = {
      ...frameStore({ nodes: [{ id: 'pond', x: 0, z: 0, respawnAt: null }] as never, destination: BUILD_CHALLENGE_ID }),
      ...sweepStore([{ type: fire, x: 30, z: 40 }]),
    } as Parameters<typeof tickWorldHeld>[0];
    tickWorldHeld(st, 30, 41, 1 / 64);
    expect(buildChallengeState.active).toBe(false);
    expect(said).toEqual([expect.stringMatching(/^Time's up! You raised 0\//)]);
    expect(fishingState.phase).toBe('biting'); // the line waits for the player's return
    expect(ORDER).toEqual(['setNearStations ["campfire"]', 'refreshFort', 'tickRespawns', 'tickPlots 0.5', 'tickVillagers 0.5', 'checkVillagerArrival']);
    ORDER.length = 0;
    tickWorldHeld(st, 30, 41, 1 / 64);
    expect(ORDER).toEqual([]); // the next sweep is half a second off
  });
});
