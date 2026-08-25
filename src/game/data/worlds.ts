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
//
// Wave 17 #5 (2026-08-18): still read as oversized after more live time —
// scaled down again, this time by 0.75x on top of the 1.25x above (net
// 0.9375x of the original 0.32 human-scale base). Radius values scaled down
// by the same 0.75 for the same "keep the walkable fraction constant"
// reason as every prior bump. This edit targets DEST_WORLD_SCALE below, NOT
// TEMPLATE_WORLD_SCALE itself (TemplateWorld.tsx) — that constant also
// backs template-09's homestead terrain and all 6 challenge maps, neither
// of which were reported as wrong; rescaling the homestead in particular is
// the "much bigger and riskier change" the comment below already warns off.
//
// 2026-08-19: crossing a destination on foot still took too long even after
// Wave 17 #5 above — that pass only retuned DEST_WORLD_SCALE, how big the
// diorama LOOKS, and never touched `radius`, the walkable-circle bound
// PlayerController's wander clamp actually enforces (third collision
// branch). At 4 units/sec walk speed, template-01's old radius 210 meant
// 105 seconds to cross the full diameter. Cut every template-01..08 radius
// by the same 0.5x this file's own prior passes use to keep a change this
// size deliberate rather than accidental — EXCEPT where a real, hand-placed
// NPC/guild-hall/boss-camp coordinate (data/npcs.ts NpcDefs, data/guilds.ts
// GUILDS' hallX/hallZ, data/world.ts's CEDRIC_CAMP/BATTLE_DOME) would land
// past a flat halving, computed as real straight-line distance from each
// destination's own `origin` — not guessed. Five destinations (02/03/04/07/
// 08, every one guild-hall-bound) hit that floor; those instead get
// `hallDistance * 1.15`, the same "+~15% margin" convention
// CHALLENGE_DESTINATIONS below already uses for its own radius derivation,
// rounded UP to this file's existing .5 precision so the real floor is
// never undershot by the rounding:
//   template-01  210    -> 105     (0.5x; floor 38.0  king/queen NpcDefs)
//   template-02  229.5  -> 134.5   (floor 116.6 Knights' Order hall (1312,884); *1.15 = 134.1; Richard NpcDef at 112 clears it)
//   template-03  214.5  -> 128     (floor 110.9 Anglers' Circle hall (1586,890); *1.15 = 127.5; John NpcDef at 104 clears it)
//   template-04  274.5  -> 159.5   (floor 138.5 Builders' Guild hall (1912,862); *1.15 = 159.3; no NpcDef here)
//   template-05  235.5  -> 117.75  (0.5x; floor 57.0  CEDRIC_CAMP (2185,945))
//   template-06  210    -> 105     (0.5x; floor 54.0  BATTLE_DOME far edge (center dist 45 + radius 9); Storm NpcDef at 38 clears it)
//   template-07  235.5  -> 134.5   (floor 116.6 Woodsmen's Lodge hall (2812,884); *1.15 = 134.1; no NpcDef here)
//   template-08  199.5  -> 114     (floor 98.7  Miners' Brotherhood hall (3112,902); *1.15 = 113.5; Fenwick NpcDef at 30 clears it)
// Every NPC/hall/camp distance above is real straight-line distance to that
// destination's `origin`, hand-computed from the coordinates actually
// stored in npcs.ts/guilds.ts/world.ts, not estimated. Claimed-plot flags
// (ClaimedPlot, data/buildables.ts) are NOT in this floor: claimWorld/
// foundSettlement center a plot on wherever the player was STANDING when
// they claimed it (gameStore.ts), so a claim can only ever exist somewhere
// already inside whatever radius was current at the time — it can never be
// the thing a smaller radius walls off. DEST_WORLD_SCALE (below) is
// untouched — this pass is radius only, the walkable bound, not the visual
// size Wave 17 #5 already tuned.
//
// 2026-08-21: the coordinates this floor table cites (Knights' Order/
// Builders'/Woodsmen's/Miners' halls, CEDRIC_CAMP) moved when
// DEST_WORLD_SCALE was halved below — see guilds.ts's and world.ts's own
// 2026-08-21 comments. The table above is left as-written, a historical
// record of that 2026-08-19 derivation; it's not re-checked against the new
// positions because `radius` is (per this file's own 2026-08-19 comment
// elsewhere) no longer the real wander bound for templates 01-08 — that's
// PlayerController's clamp against the real walkable-rect union
// (templateWalkableFootprint.ts) — so a stale floor number here is inert,
// not a live bug.
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
// 2026-08-21: halved per explicit, confirmed user request (player is meant
// to loom ~2x over these dioramas now). The research spike that landed this
// line left everything downstream — TEMPLATE_ARRIVAL_SPAWN below, and the
// NPC/guild-hall/camp fixed coordinates in npcs.ts, guilds.ts, world.ts —
// re-derived at the OLD scale, tracked as a follow-up. That follow-up is
// this same 2026-08-21 pass: TEMPLATE_ARRIVAL_SPAWN below is recomputed
// against the new scale, and every entity the research found landing
// outside the real walkable-rect union (Richard/Knights'/Miners'/Builders'/
// Woodsmen's/CEDRIC_CAMP) was repositioned in npcs.ts/guilds.ts/world.ts —
// see each file's own comment at the changed coordinate.
// 2026-08-24 RESEARCH SPIKE: halved again per explicit user request (third
// such cut in a row) to test live consequences ahead of a durable-storage
// redesign for the fixed entities below (npcs.ts/guilds.ts/world.ts) — see
// that investigation's own findings. Left in place for implement to build
// on; NOT yet accompanied by a fix pass for TEMPLATE_ARRIVAL_SPAWN or any
// fixed NPC/hall/camp coordinate at this new scale.
const DEST_WORLD_SCALE = 0.32 * 1.25 * 0.75 * 0.5 * 0.5;

// 2026-08-25 IMPLEMENT PASS: closes the research spike above. Every
// hand-placed NPC/guild-hall/boss-camp coordinate in npcs.ts/guilds.ts/
// world.ts, plus TEMPLATE_ARRIVAL_SPAWN below, is now stored as a LOCAL
// (bake-space) point and resolved through `resolveDestPoint` below instead
// of a hand-typed world x/z — durable storage, not a fourth one-off
// reposition round. Provable from normalizeTemplateBake's own math
// (TemplateWorld.tsx): for any raw local point P, the final world position
// is `dest.origin + scale*(P - rawCenter)`. Since `dest.origin` never moves
// and `rawCenter` is a pure geometry constant, this collapses to one
// invariant — `worldPos(scale) = dest.origin + scale*localPoint` — so a
// point stored as `localPoint` lands at the exact scale-appropriate spot
// after ANY future DEST_WORLD_SCALE change, not just this one. This is the
// third cut in a row to break hand-typed world coordinates (6 entities broke
// 2026-08-21, 9-10 more broke ahead of this pass per the research spike
// above) — this ends that recurrence rather than deferring it to a fourth.
//
// Every local value below (and in npcs.ts/guilds.ts/world.ts) was derived
// from this file's own PRIOR committed literal — the one at the old 0.15
// scale — via the same invariant run backward:
// `localPoint = (worldPos_observed - dest.origin) / scale_observed`. Two
// exceptions were captured live directly at the CURRENT 0.075 scale instead,
// having no prior literal to invert: template-03's new arrival spawn below,
// and John Mayne's hand-picked castle spot (see npcs.ts's own comment on
// his NpcDef for why the distant cast-row marker wasn't usable as-is).
//
// One transcription error from the research spike's own migration table was
// caught and corrected while implementing this: Miners' Brotherhood hall's
// local Z came out to -249.667 in that writeup, but re-deriving it directly
// via the invariant above ((962.65 - 1000) / 0.15) gives exactly -249 —
// used here instead (see guilds.ts).
export function resolveDestPoint(dest: WorldDestination, localX: number, localZ: number): { x: number; z: number } {
  // TEMPLATE_WORLD_SCALE's own base (TemplateWorld.tsx) — the constant
  // itself can't be imported here, see DEST_WORLD_SCALE's own comment above
  // for why (that file already imports WORLD_DESTINATION_BY_ID from here).
  const scale = dest.worldScale ?? 0.32;
  return { x: dest.origin.x + localX * scale, z: dest.origin.z + localZ * scale };
}

/** the inverse of resolveDestPoint — recovers a destination-LOCAL (bake-
 *  space) point from a live world position. Used to convert a freshly
 *  hand-picked/live-captured spot into the same durable storage every other
 *  entry uses, rather than hand-typing a world x/z that only holds at the
 *  scale it was picked at. */
export function toDestLocalPoint(dest: WorldDestination, worldX: number, worldZ: number): { x: number; z: number } {
  const scale = dest.worldScale ?? 0.32;
  return { x: (worldX - dest.origin.x) / scale, z: (worldZ - dest.origin.z) / scale };
}

export const WORLD_DESTINATIONS: WorldDestination[] = [
  {
    id: 'template-01', name: "The King's Approach",
    blurb: 'A grand castle crowns the hill above a road still lined with a marching procession.',
    thumb: '/assets/worlds/thumbs/template-01.png', model: '/assets/worlds/template-01.glb',
    origin: { x: 1000, z: 1000 }, radius: 105, worldScale: DEST_WORLD_SCALE,
    loot: { gold: 12 }, lootText: 'You gather coins dropped along the procession road (+12 gold).',
  },
  {
    id: 'template-02', name: 'The Tourney Grounds',
    blurb: 'An old tournament field where mounted knights once ran at each other in earnest.',
    thumb: '/assets/worlds/thumbs/template-02.png', model: '/assets/worlds/template-02.glb',
    origin: { x: 1300, z: 1000 }, radius: 134.5, worldScale: DEST_WORLD_SCALE,
    loot: { plank: 4 }, lootText: 'You salvage sound timber from a broken lance rack (+4 planks).',
  },
  {
    id: 'template-03', name: 'The River Landing',
    blurb: 'A quiet river crossing with a loading dock, cart tracks, and a hint of trade.',
    thumb: '/assets/worlds/thumbs/template-03.png', model: '/assets/worlds/template-03.glb',
    origin: { x: 1600, z: 1000 }, radius: 128, worldScale: DEST_WORLD_SCALE,
    loot: { wood: 6, stone: 4 }, lootText: 'Goods left on the dock are yours for the taking (+6 wood, +4 stone).',
  },
  {
    id: 'template-04', name: 'The Siege Camp',
    blurb: "A war machine still stands aimed at a keep it never breached.",
    thumb: '/assets/worlds/thumbs/template-04.png', model: '/assets/worlds/template-04.glb',
    origin: { x: 1900, z: 1000 }, radius: 159.5, worldScale: DEST_WORLD_SCALE,
    loot: { iron_ore: 5 }, lootText: 'You pry loose iron fittings from the old siege engine (+5 iron ore).',
  },
  {
    id: 'template-05', name: 'The Rival Castle',
    blurb: "A neighboring lord's keep — banners raised, gates shut tight. Not one to besiege lightly. Yet.",
    thumb: '/assets/worlds/thumbs/template-05.png', model: '/assets/worlds/template-05.glb',
    origin: { x: 2200, z: 1000 }, radius: 117.75, worldScale: DEST_WORLD_SCALE,
    loot: { gold: 8 }, lootText: 'A merchant passing the gatehouse trades you a few coins for news (+8 gold).',
  },
  {
    id: 'template-06', name: 'The Sister Keep',
    blurb: 'A second stronghold watches over a green valley from a respectful distance.',
    thumb: '/assets/worlds/thumbs/template-06.png', model: '/assets/worlds/template-06.glb',
    origin: { x: 2500, z: 1000 }, radius: 105, worldScale: DEST_WORLD_SCALE,
    loot: { stone: 8 }, lootText: 'Loose quarried stone litters the roadside (+8 stone).',
  },
  {
    id: 'template-07', name: 'The Frozen Pass',
    blurb: 'Knights once held this icy mountain pass — the exposed rock looks promising for ore.',
    thumb: '/assets/worlds/thumbs/template-07.png', model: '/assets/worlds/template-07.glb',
    origin: { x: 2800, z: 1000 }, radius: 134.5, worldScale: DEST_WORLD_SCALE, sky: 'mountains',
    loot: { iron_ore: 8 }, lootText: 'The mountain pass is rich with ore (+8 iron ore — a mining bonus!).',
  },
  {
    id: 'template-08', name: 'The Old Ruins',
    blurb: 'Weathered hills hide old foundations — good ground for scavenging.',
    thumb: '/assets/worlds/thumbs/template-08.png', model: '/assets/worlds/template-08.glb',
    origin: { x: 3100, z: 1000 }, radius: 114, worldScale: DEST_WORLD_SCALE,
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

// Real terrain boundaries (2026-08-21): travelTo()'s own arrival spawn used
// to be derived live from `dest.origin.z - dest.radius * 0.5` — a formula
// that only ever made sense while `radius` was a real circular wander bound
// AND `dest.origin` itself sat on real, walkable ground. PlayerController's
// clamp now resolves against real classified walkable rects instead
// (templateWalkableFootprint.ts), so both assumptions needed checking
// against the actual live data before hardcoding anything.
//
// THIS TABLE WAS ORIGINALLY GOING TO BE that formula's literal frozen
// output (the obvious "known-good snapshot" move) — but a live spot-check
// (travel to each destination, sample the real classified rects with the
// destination's own live getBakeOffset(), test whether the formula's own
// target point actually falls inside the union) found `dest.origin` is
// NOT close to the real walkable terrain for ANY of the 8 templates: the
// old target sat 426 to 3451 world units outside every classified rect
// (template-04 worst, template-03 best). This isn't a classification bug —
// normalizeTemplateBake (TemplateWorld.tsx) recenters a destination's WHOLE
// bake (backdrop mountains included) so ITS bbox center lands at
// `dest.origin`, not the walkable core specifically, and these dioramas are
// visibly lopsided (a mountain rim dominates far more volume on one side
// than the flat ground does) — the exact same asymmetry already on record
// for why King Leo's own procession-figure marker sits ~1740 units from
// `dest.origin` (TemplatePopulation.tsx's header comment). Before this
// pass, `dest.origin` had no real mesh under it at all — a player standing
// there was always resting on TemplateWorldRoot's flat filler disc, never
// on the actual bake. Hardcoding the old formula's raw output here would
// have reproduced that: the player's very first frame would immediately
// clamp hundreds-to-thousands of units away to the nearest real ground,
// which is a worse arrival than just computing that real point up front.
//
// So instead: for each of the 8 templates, this is the OLD formula's own
// target point, projected to the nearest point in the real rect union
// (the exact nearest-point-in-union reduction PlayerController's clamp
// itself uses), then nudged ~3 world units off that boundary toward the
// containing rect's own center (capped at 40% of that rect's own
// half-extent, so a slender rect can't be overshot) — landing just inside
// real ground rather than exactly on its edge line. A frozen snapshot either
// way — bakeOffset is deterministic per bake (same .glb, same
// normalizeTemplateBake math every load), so these numbers stay correct
// across sessions without a live recompute; any destination NOT in this
// table (challenges, dungeon, arena, a future template) falls back to the
// live radius formula unchanged (gameStore.ts's own travelTo).
//
// 2026-08-21 RECOMPUTE: DEST_WORLD_SCALE (above) was halved after this table
// was first derived — halving it doubles every fixed point's position
// within the bake's own local geometry (normalizeTemplateBake scales then
// recenters, so a smaller worldScale pushes any given world-space point
// proportionally farther from the bake's local center), so the table needed
// re-deriving against the new scale rather than just re-scaling the old
// numbers. Same methodology as above, re-run live against the halved scale;
// live-verified (2026-08-21): teleporting straight to each of these 8
// points lands EXACTLY there with zero further clamp movement, and
// `destinationGroundY` returns a real, sane height at every one.
//
// 2026-08-25: switched every entry from a frozen world-space literal (only
// ever correct at the scale it was captured) to a LOCAL point resolved
// through `resolveDestPoint` (this file's own 2026-08-25 comment above has
// the proof) — same values as the 2026-08-21 recompute above, just stored
// the durable way so a FOURTH DEST_WORLD_SCALE cut won't break this table
// again. `TEMPLATE_DEST_BY_ID` below is a small local lookup because
// `WORLD_DESTINATION_BY_ID` itself isn't assembled until after
// DUNGEON_DESTINATION/ARENA_DESTINATION/CHALLENGE_DESTINATIONS are declared
// further down this file — this table only ever needed the 8 real templates
// anyway. template-03 is the one real content change here, not just a
// storage change: the old hand-picked riverbank spot (1711.06, 856.54) is
// superseded by a fresh point captured live directly on the new, smaller
// landing area — (1544.66, 937.40) at the current 0.075 scale, confirmed
// inside the real walkable union with zero clamp movement — because the
// prior spot itself no longer survived this cut (50.2 units outside), so
// this isn't a preference call.
const TEMPLATE_DEST_BY_ID: Record<string, WorldDestination> =
  Object.fromEntries(WORLD_DESTINATIONS.map((d) => [d.id, d]));

export const TEMPLATE_ARRIVAL_SPAWN: Record<string, { x: number; z: number; yaw: number }> = {
  'template-01': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-01'], 17.68, -340.647), yaw: Math.PI },
  'template-02': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-02'], 0, -428.333), yaw: Math.PI },
  // captured live directly at the current 0.075 scale (see this table's own
  // 2026-08-25 comment above) — supersedes the old riverbank override, which
  // did not survive this cut.
  'template-03': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-03'], -737.867, -834.667), yaw: Math.PI },
  // nearest-in-union derived, unchanged in substance since 2026-08-21
  'template-04': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-04'], 2663.753, 10942.807), yaw: Math.PI },
  // same point as CEDRIC_CAMP (world.ts) — see that constant's own comment
  'template-05': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-05'], 3760, 5793.333), yaw: Math.PI },
  'template-06': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-06'], 12.84, -334.667), yaw: Math.PI },
  // same point as the Woodsmen's Lodge hall (guilds.ts) — see its own comment
  'template-07': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-07'], 3666.667, 7053.333), yaw: Math.PI },
  'template-08': { ...resolveDestPoint(TEMPLATE_DEST_BY_ID['template-08'], 0, -246.653), yaw: Math.PI },
};

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

// Scene-isolation rearchitecture (2026-08-20) — the destinations whose
// content renders through DestinationScope.tsx's own origin-offset <group>
// instead of the flat/absolute top-level components (Buildings, Npc,
// TemplatePopulation, CourtDressing) every other destination still uses
// unchanged. Stage 1 (2026-08-20) proved this on template-01 alone; Stage 2
// (2026-08-21) grew it to templates 02-08. Stage 3 (2026-08-21) looked at
// dungeon/arena and found neither belongs here — both are unclaimable
// (see TemplateWorld.tsx's dungeon/arena special-cases), so there is no
// buildings/NPC/population content of theirs to scope in the first place;
// their state-leak bug fixed that stage was unrelated to this set. Stage 4
// (2026-08-21) adds the 6 challenge grounds — unlike dungeon/arena they ARE
// claimable (ClaimBanner.tsx only excludes 'dungeon'/'arena') and go through
// TemplateWorldRoot's same generic branch templates 01-08 use, so claimed
// buildings there need the same origin-offset treatment. template-09 (the
// homestead) stays out permanently. One shared Set rather than hand-typed
// per-template string checks, so there is exactly one place this can ever
// drift.
export const SCOPED_DESTINATIONS = new Set<string>([
  'template-01', 'template-02', 'template-03', 'template-04',
  'template-05', 'template-06', 'template-07', 'template-08',
  'challenge-1', 'challenge-2', 'challenge-3',
  'challenge-4', 'challenge-5', 'challenge-6',
]);
