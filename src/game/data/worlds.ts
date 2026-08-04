// The nine original 2000-game template dioramas (`extracted/pak/warehouse/
// worlds/templates`), re-purposed as visitable travel destinations. Each is
// a merged bake of the template's real placed geometry — the game's own
// pre-built scenes, not custom levels — reachable from the homestead
// signpost. `origin` parks each one far outside the home world (which spans
// only ±WORLD_HALF) so travel is a plain teleport with no scene-swap, and
// `radius` bounds how far the player can wander from its center (see
// PlayerController's third collision branch). The base scale (see
// TEMPLATE_WORLD_SCALE in TemplateWorld.tsx) enlarges the raw physical
// LEGO-brick-scale bakes (a minifig is ~54mm in the exported units) up to
// this game's human-scale minifigs — a single constant, not per-scene
// height targets, so a flat scene (template-09's empty field) doesn't get
// distorted the way matching individual props to a target height would.
//
// templates 01-08 (see DEST_WORLD_SCALE below) run at 1.25x that base:
// even at human-scale calibration they read as "far too small" next to how
// grand these castles/camps are meant to feel (requested 2026-08-03) —
// template-09 is the one exception, since it's also the literal homestead
// terrain (Terrain.tsx's HomeMeadow) with a large amount of hardcoded
// world geometry calibrated against its current, unchanged scale.
//
// Revised 2026-08-04: the initial 2x bump (below) overshot — user feedback
// after living with it live was that it read as too large, not "far too
// small" anymore. Settled on 1.25x instead; radius values are scaled down
// from their 2x-era numbers by 1.25/2 = 0.625 to keep the same walkable
// fraction of each diorama this bump has always preserved (see the 2x
// comment this replaces, and TEMPLATE_WORLD_SCALE's own 0.06->0.32 jump for
// the same precedent).
import type { ItemId } from '../types';
import { DUNGEON_ORIGIN, REACH_LIMIT } from '../dungeon';

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
  /** requested 2026-08-03 (challenge maps) — overrides TEMPLATE_WORLD_SCALE
   *  (TemplateWorld.tsx) for this one destination's bake. Absent = the
   *  shared template scale, unchanged behavior for all 9 existing templates. */
  worldScale?: number;
  /** requested 2026-08-04 — which `SKY_VARIANTS` entry (Terrain.tsx's
   *  `GameSky`) renders behind this destination. Absent = 'grass', the
   *  original single hardcoded skybox every destination used to render
   *  through regardless of theme (an icy mountain pass under a summer-grass
   *  sky was the reported mismatch this fixes). */
  sky?: 'grass' | 'mountains';
}

// Requested 2026-08-03: templates 01-08 (the actual travel destinations —
// template-09 never appears in the travel grid, it IS the homestead) felt
// "far too small" even at the 0.32 human-scale calibration above — doubled
// to DEST_WORLD_SCALE below, with radius doubled to match (same precedent
// TEMPLATE_WORLD_SCALE's own header comment already set: the earlier
// 0.06->0.32 jump bumped radius ~5.33x alongside it, to keep the walkable
// fraction of each diorama consistent rather than leaving the player stuck
// in a relatively tinier slice of a visually bigger scene). template-09
// deliberately excluded: it's rendered a second way too (Terrain.tsx's
// HomeMeadow, mounted directly, not through this destinations list), and a
// large amount of hardcoded homestead geometry (SPAWN, POND, the road,
// BUILD_REGION, the resource grounds) is calibrated against its CURRENT
// scale — rescaling it would need re-deriving all of that, a much bigger
// and riskier change than what was actually asked for here.
// Not imported from TemplateWorld.tsx's own TEMPLATE_WORLD_SCALE — that
// file already imports WORLD_DESTINATION_BY_ID from THIS one, so importing
// the constant back would be circular. Keep the 0.32 base in sync by hand
// if TEMPLATE_WORLD_SCALE itself ever changes.
const DEST_WORLD_SCALE = 0.32 * 1.25;

export const WORLD_DESTINATIONS: WorldDestination[] = [
  {
    id: 'template-01', name: "The King's Approach",
    blurb: 'A grand castle crowns the hill above a road still lined with a marching procession.',
    thumb: '/assets/worlds/thumbs/template-01.png', model: '/assets/worlds/template-01.glb',
    origin: { x: 1000, z: 1000 }, radius: 280, worldScale: DEST_WORLD_SCALE,
    loot: { gold: 12 }, lootText: 'You gather coins dropped along the procession road (+12 gold).',
  },
  {
    id: 'template-02', name: 'The Tourney Grounds',
    blurb: 'An old tournament field where mounted knights once ran at each other in earnest.',
    thumb: '/assets/worlds/thumbs/template-02.png', model: '/assets/worlds/template-02.glb',
    origin: { x: 1300, z: 1000 }, radius: 306, worldScale: DEST_WORLD_SCALE,
    loot: { plank: 4 }, lootText: 'You salvage sound timber from a broken lance rack (+4 planks).',
  },
  {
    id: 'template-03', name: 'The River Landing',
    blurb: 'A quiet river crossing with a loading dock, cart tracks, and a hint of trade.',
    thumb: '/assets/worlds/thumbs/template-03.png', model: '/assets/worlds/template-03.glb',
    origin: { x: 1600, z: 1000 }, radius: 286, worldScale: DEST_WORLD_SCALE,
    loot: { wood: 6, stone: 4 }, lootText: 'Goods left on the dock are yours for the taking (+6 wood, +4 stone).',
  },
  {
    id: 'template-04', name: 'The Siege Camp',
    blurb: "A war machine still stands aimed at a keep it never breached.",
    thumb: '/assets/worlds/thumbs/template-04.png', model: '/assets/worlds/template-04.glb',
    origin: { x: 1900, z: 1000 }, radius: 366, worldScale: DEST_WORLD_SCALE,
    loot: { iron_ore: 5 }, lootText: 'You pry loose iron fittings from the old siege engine (+5 iron ore).',
  },
  {
    id: 'template-05', name: 'The Rival Castle',
    blurb: "A neighboring lord's keep — banners raised, gates shut tight. Not one to besiege lightly. Yet.",
    thumb: '/assets/worlds/thumbs/template-05.png', model: '/assets/worlds/template-05.glb',
    origin: { x: 2200, z: 1000 }, radius: 314, worldScale: DEST_WORLD_SCALE,
    loot: { gold: 8 }, lootText: 'A merchant passing the gatehouse trades you a few coins for news (+8 gold).',
  },
  {
    id: 'template-06', name: 'The Sister Keep',
    blurb: 'A second stronghold watches over a green valley from a respectful distance.',
    thumb: '/assets/worlds/thumbs/template-06.png', model: '/assets/worlds/template-06.glb',
    origin: { x: 2500, z: 1000 }, radius: 280, worldScale: DEST_WORLD_SCALE,
    loot: { stone: 8 }, lootText: 'Loose quarried stone litters the roadside (+8 stone).',
  },
  {
    id: 'template-07', name: 'The Frozen Pass',
    blurb: 'Knights once held this icy mountain pass — the exposed rock looks promising for ore.',
    thumb: '/assets/worlds/thumbs/template-07.png', model: '/assets/worlds/template-07.glb',
    origin: { x: 2800, z: 1000 }, radius: 314, worldScale: DEST_WORLD_SCALE, sky: 'mountains',
    loot: { iron_ore: 8 }, lootText: 'The mountain pass is rich with ore (+8 iron ore — a mining bonus!).',
  },
  {
    id: 'template-08', name: 'The Old Ruins',
    blurb: 'Weathered hills hide old foundations — good ground for scavenging.',
    thumb: '/assets/worlds/thumbs/template-08.png', model: '/assets/worlds/template-08.glb',
    origin: { x: 3100, z: 1000 }, radius: 266, worldScale: DEST_WORLD_SCALE,
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
  // origin/radius derive from dungeon.ts's own constants rather than a
  // second hand-copied pair — a duplicated number was exactly how the
  // wall-tiling bug the branching-generator redesign fixed got in (see
  // dungeon.ts's module doc). +30 gives real margin over REACH_LIMIT, the
  // generator's own hard cap on any room's farthest corner from the origin.
  origin: DUNGEON_ORIGIN, radius: REACH_LIMIT + 30,
};

// The endless mob arena (requested 2026-08-03) piggybacks on this same
// destination system exactly like the dungeon above — a real place to
// travel/collide/sample-ground-height against, but with its own renderer
// (ArenaScene.tsx) instead of a baked model, and no thumb since it's never
// shown in TravelPanel's normal grid (it gets its own dedicated section).
// origin is a fresh quadrant, clear of every template (1000-3400, z:1000)
// and the dungeon (4200, 4200).
export const ARENA_ORIGIN = { x: -4200, z: 4200 };
export const ARENA_RADIUS = 40;

export const ARENA_DESTINATION: WorldDestination = {
  id: 'arena', name: 'The Endless Arena',
  blurb: 'A sealed pit. They keep coming until you leave, or you don’t.',
  thumb: '', model: '',
  origin: ARENA_ORIGIN, radius: ARENA_RADIUS,
};

// The six bonus "challenge" maps (requested 2026-08-03) — smaller warehouse
// play dioramas the Grok lab classified alongside the 9 templates
// (reports/maps/challenge_N_layout.json, same kk.map_layout.v1 schema,
// verified 2026-08-01) but that never had a WORLD_DESTINATIONS entry. Their
// .glb/.mtl/.obj already existed in the extraction (no new Blender export —
// scripts/prepare-assets.mjs's own worlds-copy step now pulls them into
// public/assets/worlds/ alongside the 9 templates, normalizing the source's
// literal-space filename "challenge N.glb" to "challenge-N.glb"). A fresh
// quadrant, clear of the templates (x:1000-3400, z:1000), the dungeon
// ({x:4200,z:4200}), and the arena ({x:-4200,z:4200}).
//
// worldScale: NOT overridden, confirmed correct by direct live measurement
// (2026-08-03) — loaded challenge-1.glb live and read normalizeTemplateBake's
// real computed THREE.Box3: size [122.88, 129.48, 284.24] world units,
// matching bbox_size×320 exactly (0.384×320=122.9, 0.40464×320=129.5,
// 0.88826×320=284.2) — the same net scale convention as the 9 templates
// (export_textured.py's own "prefer_template" flag applies identically to
// challenge and template category='User' assets, confirmed by reading that
// script directly). No separate calibration constant needed after all.
//
// radius: computed per-map from each layout's own space.bbox_size
// (half-diagonal in the ground plane, ×320, +~15% margin), not guessed —
// same derivation the live challenge-1 measurement above validated.
export const CHALLENGE_ORIGIN = { x: -4200, z: -4200 };
const CHALLENGE_SPACING = 650; // clear of every radius below, no wander-circle overlap

export const CHALLENGE_DESTINATIONS: WorldDestination[] = [
  {
    id: 'challenge-1', name: 'Challenge Ground I',
    blurb: 'A small warehouse play diorama — the first of six practice grounds.',
    thumb: '', model: '/assets/worlds/challenge-1.glb',
    origin: { x: CHALLENGE_ORIGIN.x, z: CHALLENGE_ORIGIN.z }, radius: 175,
  },
  {
    id: 'challenge-2', name: 'Challenge Ground II',
    blurb: 'A small warehouse play diorama.',
    thumb: '', model: '/assets/worlds/challenge-2.glb',
    origin: { x: CHALLENGE_ORIGIN.x + CHALLENGE_SPACING, z: CHALLENGE_ORIGIN.z }, radius: 190,
  },
  {
    id: 'challenge-3', name: 'Challenge Ground III',
    blurb: 'A small warehouse play diorama.',
    thumb: '', model: '/assets/worlds/challenge-3.glb',
    origin: { x: CHALLENGE_ORIGIN.x + CHALLENGE_SPACING * 2, z: CHALLENGE_ORIGIN.z }, radius: 185,
  },
  {
    id: 'challenge-4', name: 'Challenge Ground IV',
    blurb: 'A small warehouse play diorama.',
    thumb: '', model: '/assets/worlds/challenge-4.glb',
    origin: { x: CHALLENGE_ORIGIN.x + CHALLENGE_SPACING * 3, z: CHALLENGE_ORIGIN.z }, radius: 235,
  },
  {
    id: 'challenge-5', name: 'Challenge Ground V',
    blurb: 'A small warehouse play diorama.',
    thumb: '', model: '/assets/worlds/challenge-5.glb',
    origin: { x: CHALLENGE_ORIGIN.x + CHALLENGE_SPACING * 4, z: CHALLENGE_ORIGIN.z }, radius: 260,
  },
  {
    id: 'challenge-6', name: 'Challenge Ground VI',
    blurb: 'A small warehouse play diorama — the last of six practice grounds.',
    thumb: '', model: '/assets/worlds/challenge-6.glb',
    origin: { x: CHALLENGE_ORIGIN.x + CHALLENGE_SPACING * 5, z: CHALLENGE_ORIGIN.z }, radius: 235,
  },
];

export const WORLD_DESTINATION_BY_ID: Record<string, WorldDestination> =
  Object.fromEntries([...WORLD_DESTINATIONS, DUNGEON_DESTINATION, ARENA_DESTINATION, ...CHALLENGE_DESTINATIONS].map((d) => [d.id, d]));
