// The nine original 2000-game template dioramas (`extracted/pak/warehouse/
// worlds/templates`), re-purposed as visitable travel destinations. Each is
// a merged bake of the template's real placed geometry — the game's own
// pre-built scenes, not custom levels — reachable from the homestead
// signpost. `origin` parks each one far outside the home world (which spans
// only ±WORLD_HALF) so travel is a plain teleport with no scene-swap, and
// `radius` bounds how far the player can wander from its center (see
// PlayerController's third collision branch). Every scene shares one scale
// (see TEMPLATE_WORLD_SCALE in TemplateWorld.tsx): the raw bakes are real
// physical LEGO-brick scale (a minifig is ~54mm in the exported units), far
// too small next to this game's human-scale minifigs, so they're uniformly
// enlarged — a single constant, not per-scene height targets, so a flat
// scene (template-09's empty field) doesn't get distorted the way matching
// individual props to a target height would.
import type { ItemId } from '../types';

export interface WorldDestination {
  id: string;
  name: string;
  blurb: string;
  thumb: string;
  model: string;
  origin: { x: number; z: number };
  radius: number;
  loot?: Partial<Record<ItemId, number>>;
  lootText?: string;
}

export const WORLD_DESTINATIONS: WorldDestination[] = [
  {
    id: 'template-01', name: "The King's Approach",
    blurb: 'A grand castle crowns the hill above a road still lined with a marching procession.',
    thumb: '/assets/worlds/thumbs/template-01.png', model: '/assets/worlds/template-01.glb',
    origin: { x: 1000, z: 1000 }, radius: 224,
    loot: { gold: 12 }, lootText: 'You gather coins dropped along the procession road (+12 gold).',
  },
  {
    id: 'template-02', name: 'The Tourney Grounds',
    blurb: 'An old tournament field where mounted knights once ran at each other in earnest.',
    thumb: '/assets/worlds/thumbs/template-02.png', model: '/assets/worlds/template-02.glb',
    origin: { x: 1300, z: 1000 }, radius: 245,
    loot: { plank: 4 }, lootText: 'You salvage sound timber from a broken lance rack (+4 planks).',
  },
  {
    id: 'template-03', name: 'The River Landing',
    blurb: 'A quiet river crossing with a loading dock, cart tracks, and a hint of trade.',
    thumb: '/assets/worlds/thumbs/template-03.png', model: '/assets/worlds/template-03.glb',
    origin: { x: 1600, z: 1000 }, radius: 229,
    loot: { wood: 6, stone: 4 }, lootText: 'Goods left on the dock are yours for the taking (+6 wood, +4 stone).',
  },
  {
    id: 'template-04', name: 'The Siege Camp',
    blurb: "A war machine still stands aimed at a keep it never breached.",
    thumb: '/assets/worlds/thumbs/template-04.png', model: '/assets/worlds/template-04.glb',
    origin: { x: 1900, z: 1000 }, radius: 293,
    loot: { iron_ore: 5 }, lootText: 'You pry loose iron fittings from the old siege engine (+5 iron ore).',
  },
  {
    id: 'template-05', name: 'The Rival Castle',
    blurb: "A neighboring lord's keep — banners raised, gates shut tight. Not one to besiege lightly. Yet.",
    thumb: '/assets/worlds/thumbs/template-05.png', model: '/assets/worlds/template-05.glb',
    origin: { x: 2200, z: 1000 }, radius: 251,
    loot: { gold: 8 }, lootText: 'A merchant passing the gatehouse trades you a few coins for news (+8 gold).',
  },
  {
    id: 'template-06', name: 'The Sister Keep',
    blurb: 'A second stronghold watches over a green valley from a respectful distance.',
    thumb: '/assets/worlds/thumbs/template-06.png', model: '/assets/worlds/template-06.glb',
    origin: { x: 2500, z: 1000 }, radius: 224,
    loot: { stone: 8 }, lootText: 'Loose quarried stone litters the roadside (+8 stone).',
  },
  {
    id: 'template-07', name: 'The Frozen Pass',
    blurb: 'Knights once held this icy mountain pass — the exposed rock looks promising for ore.',
    thumb: '/assets/worlds/thumbs/template-07.png', model: '/assets/worlds/template-07.glb',
    origin: { x: 2800, z: 1000 }, radius: 251,
    loot: { iron_ore: 8 }, lootText: 'The mountain pass is rich with ore (+8 iron ore — a mining bonus!).',
  },
  {
    id: 'template-08', name: 'The Old Ruins',
    blurb: 'Weathered hills hide old foundations — good ground for scavenging.',
    thumb: '/assets/worlds/thumbs/template-08.png', model: '/assets/worlds/template-08.glb',
    origin: { x: 3100, z: 1000 }, radius: 213,
    loot: { stone: 6, iron_ore: 4 }, lootText: 'You dig a little loot out of the ruins (+6 stone, +4 iron ore).',
  },
  {
    id: 'template-09', name: 'The Far Meadow',
    blurb: 'An empty, peaceful meadow at the edge of the map. Nothing built here — yet.',
    thumb: '/assets/worlds/thumbs/template-09.png', model: '/assets/worlds/template-09.glb',
    origin: { x: 3400, z: 1000 }, radius: 352,
    loot: { flowers: 5 }, lootText: 'Wildflowers grow thick and untouched (+5 flowers).',
  },
];

// The procedural dungeon (Phase 17) piggybacks on this same destination
// system (travel/collision/ground-height all reuse it) but is regenerated
// fresh each entry via `enterDungeon()`, not visited via `travelTo()` — so
// it deliberately has no thumb/model (its own DungeonScene.tsx renders
// generated geometry instead) and isn't shown in TravelPanel's normal grid.
export const DUNGEON_DESTINATION: WorldDestination = {
  id: 'dungeon', name: 'The Sealed Crypt',
  blurb: 'A shifting underground ruin — no two descents are the same.',
  thumb: '', model: '',
  origin: { x: 4200, z: 4200 }, radius: 140,
};

export const WORLD_DESTINATION_BY_ID: Record<string, WorldDestination> =
  Object.fromEntries([...WORLD_DESTINATIONS, DUNGEON_DESTINATION].map((d) => [d.id, d]));
