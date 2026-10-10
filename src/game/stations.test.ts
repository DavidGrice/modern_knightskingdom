import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/lib/audio';
import { BUILDABLE_BY_ID } from './data/buildables';
import { STATION_RANGE } from './data/world';
import { playerState } from './playerState';
import { stationsInReach } from './stations';
import { useGameStore } from './store/gameStore';
import type { CharacterConfig, PlacedBuilding } from './types';

const KINDS = ['workbench', 'forge', 'campfire'] as const;
/** a piece of the catalogue that is a crafting station of the given kind */
const stationPiece = (station: string) => Object.values(BUILDABLE_BY_ID).find((b) => b.station === station)!.id;
let seq = 0;
const piece = (type: string, x: number, z: number, state: Partial<PlacedBuilding> = {}): PlacedBuilding => ({ id: 'p' + seq++, type, x, z, rot: 0, ...state });
/** the player stands here in every test */
const AT = { x: 10, z: 20 };
const reach = (...buildings: PlacedBuilding[]) => stationsInReach(buildings, AT.x, AT.z);

describe('the stations in reach of a point', () => {
  it('are the kinds with a piece closer than 4.5 m — each once, in order — and nothing else that stands there', () => {
    expect(STATION_RANGE).toBe(4.5);
    const fire = stationPiece('campfire'), bench = stationPiece('workbench'), forge = stationPiece('forge');
    const wall = Object.values(BUILDABLE_BY_ID).find((b) => !b.station)!.id;
    expect(reach(
      piece(bench, AT.x + 4.4, AT.z), piece(fire, AT.x, AT.z - 4.4), piece(fire, AT.x + 1, AT.z + 1),
      piece(forge, AT.x + 4.6, AT.z), piece(wall, AT.x, AT.z), piece('no such piece', AT.x, AT.z),
    )).toEqual(['campfire', 'workbench']);
    expect(reach()).toEqual([]);
  });

  it('do not include a station that is not built — a site, a ruin, a piece all but raised — whatever its kind', () => {
    for (const kind of KINDS) {
      const type = stationPiece(kind);
      for (const state of [{ built: 0 }, { built: 0, ruin: true }, { built: 0.99 }]) {
        expect(reach(piece(type, AT.x + 1, AT.z, state))).toEqual([]);
      }
      // finished — and a piece saved before sites were kept, which says nothing of how far it is built
      for (const state of [{ built: 1 }, {}]) {
        expect(reach(piece(type, AT.x + 1, AT.z, state))).toEqual([kind]);
      }
    }
  });

  it('are not hidden by a site of their own kind, whichever the scan meets first, nor by a site of another', () => {
    const forge = stationPiece('forge'), fire = stationPiece('campfire');
    const site = piece(forge, AT.x + 1, AT.z, { built: 0 }), built = piece(forge, AT.x + 3, AT.z, { built: 1 });
    expect(reach(site, built)).toEqual(['forge']);
    expect(reach(built, site)).toEqual(['forge']);
    expect(reach(piece(fire, AT.x, AT.z + 1), site, piece(fire, AT.x, AT.z + 2, { built: 0 }))).toEqual(['campfire']);
  });
});

describe('a crafting panel', () => {
  const HERO: CharacterConfig = { name: 'Test', headDonor: 'x', bodyDonor: 'x', armColor: 0, handColor: 0, legColor: 0, hipColor: 0 };
  const game = () => useGameStore.getState();
  const forge = stationPiece('forge');
  /** what the half-second sweep last found, left in the store as the panel is about to open */
  const sweptAs = (...near: string[]) => { useGameStore.setState({ nearStations: near }); return game().nearStations; };
  const stand = (x: number, z: number) => Object.assign(playerState, { x, z });
  const place = (...buildings: PlacedBuilding[]) => useGameStore.setState({ buildings: [...game().buildings, ...buildings] });

  beforeEach(() => {
    vi.spyOn(audio, 'play').mockImplementation((() => null) as never);
    vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
    game().newGame(HERO);
    useGameStore.setState({ notify: () => {} } as never);
    stand(AT.x, AT.z);
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('as it opens — a station\'s own menu: the station just walked up to is one the player is at, though no sweep has found it yet', () => {
    place(piece(forge, AT.x + 2, AT.z, { built: 1 }));
    sweptAs(); // the last sweep ran when he was still out of reach
    game().openStationMenu('forge');
    expect(game().nearStations).toEqual(['forge']);
    expect([game().panel, game().activeStation]).toEqual(['stationMenu', 'forge']);
  });

  it('as it opens — the Crafting book: the same, from where the player stands now', () => {
    place(piece(forge, AT.x + 2, AT.z, { built: 1 }), piece(stationPiece('campfire'), AT.x - 30, AT.z));
    sweptAs('campfire'); // …by a fire he has since walked away from
    game().setPanel('crafting');
    expect(game().nearStations).toEqual(['forge']);
    expect(game().panel).toBe('crafting');
  });

  it('a station finished a moment ago counts, and one that is still a site — or in ruins — does not', () => {
    place(piece(forge, AT.x + 2, AT.z, { id: 'site', built: 0.5 }));
    sweptAs();
    game().openStationMenu('forge');
    expect(game().nearStations).toEqual([]);
    game().setPanel('none');
    game().constructBuilding('site', 1); // the last blow of the hammer
    expect(game().buildings.find((b) => b.id === 'site')!.built).toBe(1);
    game().openStationMenu('forge'); // …and the key pressed at once
    expect(game().nearStations).toEqual(['forge']);
    game().setPanel('none');
    useGameStore.setState({ buildings: game().buildings.map((b) => (b.id === 'site' ? { ...b, built: 0, ruin: true } : b)) });
    game().setPanel('crafting');
    expect(game().nearStations).toEqual([]);
  });

  it('while it is open the list follows the buildings: a station left in ruins, or knocked down, stops counting at once', () => {
    const fire = stationPiece('campfire');
    place(piece(fire, AT.x + 2, AT.z, { id: 'fire', built: 1 }));
    game().setPanel('crafting');
    expect(game().nearStations).toEqual(['campfire']);
    const held = game().nearStations;
    place(piece(forge, AT.x + 40, AT.z, { built: 1 })); // the buildings change, what is in reach does not
    expect(game().nearStations).toBe(held); // the same array: nothing that reads it is told of a change
    sweptAs('forge'); // …and whatever else is written under the open book is no reason to look again:
    game().setPrompt(null);
    expect(game().nearStations).toEqual(['forge']); // the list is as it was left
    sweptAs('campfire');
    game().damageBuilding('fire', 1e6, undefined, true); // a dragon's breath: the piece is left as a ruin
    expect(game().buildings.find((b) => b.id === 'fire')).toMatchObject({ built: 0, ruin: true });
    expect(game().nearStations).toEqual([]);
    // (nothing in play raises a piece under an open panel — but the list is the buildings', whatever they do)
    useGameStore.setState({ buildings: game().buildings.map((b) => (b.id === 'fire' ? { ...b, built: 1, ruin: false } : b)) });
    expect(game().nearStations).toEqual(['campfire']);
    game().setPanel('none');
    game().openStationMenu('campfire');
    game().removeBuilding('fire', true, true); // knocked down altogether, under its own menu
    expect(game().nearStations).toEqual([]);
  });

  it('…and under no other panel, nor with none open: there it is the sweep that keeps the list', () => {
    place(piece(forge, AT.x + 2, AT.z, { id: 'f', built: 1 }));
    for (const panel of ['none', 'inventory'] as const) {
      game().setPanel(panel);
      const swept = sweptAs('forge');
      useGameStore.setState({ buildings: game().buildings.map((b) => (b.id === 'f' ? { ...b, built: 0, ruin: true } : b)) });
      expect(game().nearStations).toBe(swept);
      useGameStore.setState({ buildings: game().buildings.map((b) => (b.id === 'f' ? { ...b, built: 1, ruin: false } : b)) });
    }
  });

  it('no other panel looks: what the sweep left stays as it is, and so does the list itself when nothing has changed', () => {
    place(piece(forge, AT.x + 2, AT.z, { built: 1 }));
    const stale = sweptAs();
    for (const panel of ['inventory', 'quests', 'none'] as const) {
      game().setPanel(panel);
      expect(game().nearStations).toBe(stale);
      expect(game().panel).toBe(panel);
    }
    game().setPanel('crafting');
    const fresh = game().nearStations;
    expect(fresh).toEqual(['forge']);
    game().setPanel('none');
    game().setPanel('crafting');
    expect(game().nearStations).toBe(fresh); // the same array: nothing that reads it is told of a change
  });
});
