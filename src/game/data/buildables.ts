import type { Buildable, BuildRect, ClaimedPlot, PlacedBuilding } from '../types';
import GENERATED from './bricks.generated.json';
import LAND_TIERS_DATA from './landTiers.generated.json';
import { shapeFor } from '../collisionShapes';

// Grid pitches in meters: big structures snap to GRID, brick-scale pieces to STUD.
export const GRID = 2;
export const STUD = 0.35;
// ---------------------------------------------------------------------------
// F19/F20 · The homestead's buildable ground, sized so a castle actually TILES.
//
// A straight wall is 8m and a corner is 4m, so one finished side is
// `corner + N×wall + corner` = 8N + 8 metres. The old region was a flat 60m
// across, which is not one of those numbers — a four-wall run plus corners
// came to 40 and left a ragged 20m of grid with no piece that fitted it.
// Every tier below is a real 8N+8, so a run always closes on a corner.
//
// The tiers are also the land you buy (F20): you start on a small holding and
// push the fence out, and each expansion brings whatever was standing on that
// ground — trees, ore — inside the fold.
// Wave 6 · entries edited live at /secret/worldeditor, source in
// landTiers.generated.json — see grounds.generated.json's own note in
// grounds.ts for why this moved off a hand-written literal.
//
// Wave 17 #4 · the fence stopped being a square. `half` is still the shared
// half-extent for THREE of the four sides (north/east/west — every one of
// them still equal to each other, so every existing `landHalf()` call site
// keeps meaning exactly what it always meant), but the south side no longer
// grows with the rest: the real east road's westmost plate sits with its own
// near edge only 19.2m off the homestead's own centre (Road.tsx's 12.8m
// plates, `[0, SZ-1]` — see road.ts's own LEGS comment), and a fence that
// kept growing at the old uniform `half` reached and then swallowed that
// plate outright at Freehold and up (Barony fully enclosed three tiles of
// real road — the "overlaps the east road" bug this pass closes). `southHalf`
// is a SEPARATE, constant field for exactly that one side: 12 at every tier
// (8m past the project's own HOMESTEAD_CLEARANCE precedent past the 19.2m
// road edge, rounded to the same multiple-of-4 grid every other tier number
// already uses), so the south fence can never again grow to meet the road no
// matter how the other three sides scale. See `landSouthHalf()` below.
export const LAND_TIERS = LAND_TIERS_DATA as unknown as
  { walls: number; half: number; southHalf: number; cost: number; name: string }[];
export const MAX_LAND_TIER = LAND_TIERS.length - 1;

/** half-extent of the homestead at a given tier, on the north/east/west
 *  sides — the three that still share one number. */
export function landHalf(tier: number): number {
  return LAND_TIERS[Math.max(0, Math.min(MAX_LAND_TIER, tier))].half;
}

/** half-extent on the SOUTH side alone — constant across every tier (see the
 *  module note above): the one side that stays clear of the real road for
 *  good, rather than eventually growing to meet it again. */
export function landSouthHalf(tier: number): number {
  return LAND_TIERS[Math.max(0, Math.min(MAX_LAND_TIER, tier))].southHalf;
}

// The widest the homestead ever gets. Anything that needs a fixed outer bound
// (the nav grid, the "is this prop inside the build area" guard) uses this,
// and it is deliberately LARGER than the old flat 60m so no existing save can
// have a building stranded outside its own region by this change.
//
// Asymmetric on Z since Wave 17 #4: `maxZ` is the (small, fixed) south bound,
// not a mirror of `minZ` — see the LAND_TIERS note above.
export const BUILD_REGION = {
  minX: -LAND_TIERS[MAX_LAND_TIER].half, maxX: LAND_TIERS[MAX_LAND_TIER].half,
  minZ: -LAND_TIERS[MAX_LAND_TIER].half, maxZ: LAND_TIERS[MAX_LAND_TIER].southHalf,
};
export const MAX_STACK_HEIGHT = 14;

// A claimed template-world plot (Phase 13): smaller than the home region — a
// modest outpost, not a second full homestead — centered wherever the player
// stood when they claimed it, leveled to that one sampled ground height
// rather than following the bake's real slope (a deliberate simplification;
// see ROADMAP.md's Phase 13 notes).
export const CLAIM_RADIUS = 14;

/** the active build region + ground level: the home plot, or a claimed
 *  template-world plot while visiting one (falls back to the home region if
 *  the current destination hasn't been claimed, so evalPlacement always has
 *  *some* bounds to check even before build mode becomes reachable there) */
export function activeBuildRegion(claim: ClaimedPlot | undefined | null, landTier = MAX_LAND_TIER) {
  if (!claim) {
    const h = landHalf(landTier);
    const s = landSouthHalf(landTier);
    return { minX: -h, maxX: h, minZ: -h, maxZ: s, groundY: 0 };
  }
  return {
    minX: claim.x - CLAIM_RADIUS, maxX: claim.x + CLAIM_RADIUS,
    minZ: claim.z - CLAIM_RADIUS, maxZ: claim.z + CLAIM_RADIUS,
    groundY: claim.groundY,
  };
}

const P = '/assets/props';

// Hand-crafted gameplay structures. size = [width, height, depth] meters at rotation 0.
const CRAFTED: Buildable[] = [
  {
    id: 'campfire', name: 'Campfire', icon: '🔥', category: 'essentials',
    size: [2, 0.9, 2], snap: GRID, stackable: false,
    cost: { wood: 4 }, station: 'campfire', buildXp: 10,
  },
  {
    // real model (l301500) is a wooden storage crate, not a bench, but reads
    // fine as a rustic crafting-station stand-in; the declared 2x2 square
    // footprint didn't match its real 24x19.2x32 (roughly 1.1x1.5) box
    // proportions though (Phase 18's wall/brick scale audit) -- tightened to
    // match what's actually rendered.
    id: 'workbench', name: 'Workbench', thumb: `${P}/scenery/l301500.png`, model: `${P}/scenery/l301500.glb`,
    category: 'essentials', size: [1.1, 0.9, 1.5], snap: GRID, stackable: false,
    cost: { plank: 6 }, station: 'workbench', buildXp: 15,
  },
  {
    id: 'forge', name: 'Forge', icon: '🏭', category: 'essentials',
    size: [4, 1.8, 4], snap: GRID, stackable: false,
    cost: { stone: 8, wood: 2 }, station: 'forge', buildXp: 30,
    requiresUnlock: 'mining',
  },
  {
    id: 'torch', name: 'Torch', icon: '🕯️', category: 'essentials',
    size: [0.7, 1.5, 0.7], snap: 1, stackable: false,
    cost: { wood: 2 }, buildXp: 4,
  },
  {
    id: 'bed', name: 'Bed', icon: '🛏️', category: 'essentials',
    size: [1.6, 0.7, 3.2], snap: 1, stackable: false,
    cost: { plank: 4, flowers: 1 }, buildXp: 12,
  },
  {
    id: 'barrel', name: 'Barrel', thumb: `${P}/scenery/l248900.png`, model: `${P}/scenery/l248900.glb`,
    category: 'essentials', size: [1, 1, 1], snap: 1, stackable: true,
    cost: { plank: 2 }, buildXp: 5,
  },
  {
    // Phase 24B: the labor deposit point — villagers haul their goods here
    // (or to the homestead center when none is built). Same real crate mold
    // as the workbench, placed bigger so it reads as stores, not a station.
    id: 'stockpile', name: 'Stockpile', thumb: `${P}/scenery/l301500.png`, model: `${P}/scenery/l301500.glb`,
    category: 'essentials', size: [1.4, 1.1, 1.9], snap: GRID, stackable: false,
    cost: { wood: 6 }, buildXp: 10,
  },
  {
    // Wave 9 · the Stockpile's grown-up sibling, and the first building in the
    // game that passively buffs villagers just by standing (ROADMAP's
    // "Building-conferred villager attribute bonuses" — see
    // attributes.ts's externalCapacityBonus for the shape of that bonus and
    // why it is ownership-scoped rather than proximity-scoped). It does two
    // things and nothing else: it holds far more of every good than a
    // Stockpile (game/storage.ts's STORAGE_PER_BUILDING) and every villager
    // in the same settlement carries more per trip because of it.
    //
    // No storehouse mold exists in the extraction, so it reuses the same real
    // crate (l301500) the Stockpile and Workbench already share, placed
    // markedly larger — the established "same mold, different scale reads as
    // a different thing" rule the Stockpile itself was introduced under. Real
    // cost, deliberately steeper than the Stockpile's 6 wood: this is the
    // piece you save toward, not the one you scatter.
    id: 'storehouse', name: 'Storehouse', thumb: `${P}/scenery/l301500.png`, model: `${P}/scenery/l301500.glb`,
    category: 'essentials', size: [3, 2.4, 4], snap: GRID, stackable: false,
    cost: { plank: 10, stone: 6 }, buildXp: 35,
    requiresUnlock: 'building2',
  },
  {
    id: 'flowerbed', name: 'Flower Bed', thumb: `${P}/scenery/l374100.png`, model: `${P}/scenery/l374100.glb`,
    category: 'essentials', size: [1.4, 0.5, 1.4], snap: 1, stackable: false,
    cost: { flowers: 1 }, buildXp: 4,
  },
  {
    id: 'tree', name: 'Garden Tree', thumb: `${P}/scenery/l243500.png`, model: `${P}/scenery/l243500.glb`,
    category: 'essentials', size: [2, 3.2, 2], snap: 1, stackable: false,
    cost: { wood: 6 }, buildXp: 8,
  },
  {
    id: 'fence', name: 'Wooden Fence', icon: '🚧', model: `${P}/scenery/l607900.glb`,
    category: 'essentials', size: [2.4, 1.1, 0.4], snap: 1, stackable: false,
    cost: { plank: 2 }, buildXp: 5,
  },
  {
    // real proportions (34.2 wide x 13.2 tall x 39.2 deep) are a low,
    // sprawling cluster of fronds, not an upright potted plant -- the old
    // 1.6m declared height stretched it into a tall stubby pot with two
    // giant flat blades splayed out to ~4m (Phase 18's wall/brick scale
    // audit, extended to scenery). The only other unused Scenery-category
    // model turned out to be a checkered barrel/cone, not a plant either
    // (l606400 is already Cedric's camp scenery, l347100 is already a tree
    // variant in gameStore's treeModels) -- so this stays the least-wrong
    // option available; sized to its own real (short, wide) proportions
    // instead of forcing potted-plant height onto it.
    id: 'plant', name: 'Palm Plant', icon: '🌴', model: `${P}/scenery/l625500.glb`,
    category: 'essentials', size: [1.3, 0.5, 1.5], snap: 1, stackable: false,
    cost: { wood: 2 }, buildXp: 5,
  },
  {
    // was `00_l407000` — real LDraw part 4070 ("Brick 1 x 1 with Headlight"),
    // a tiny near-cubic utility brick with a round headlight socket on one
    // face, stretched to a 4×2×2 wall footprint. It rendered as an isolated
    // roughly-square block per segment (the round socket reading as an odd
    // bullseye/target face) with visible gaps between placed segments —
    // Phase 18's wall-piece scale audit, extended past the stonewall/tower
    // fix already shipped. `l607900` is the same real wooden lattice fence
    // panel already used for the `fence` decor item (confirmed correctly
    // proportioned there); reused here at wall height for the early wood
    // defensive tier, with size re-derived from its real bbox aspect ratio
    // (64 × 25.6 × 8 raw) at this piece's 4m width so the footprint matches
    // what's actually rendered.
    id: 'palisade', name: 'Palisade Wall', thumb: `${P}/scenery/l607900.png`, model: `${P}/scenery/l607900.glb`,
    category: 'walls', size: [4, 1.6, 0.5], snap: GRID, stackable: true,
    cost: { plank: 4, stone: 1 }, buildXp: 12,
    requiresUnlock: 'building2',
  },
  {
    // was `02_l3013600` (catalog category "Brick", raw bbox depth *2×* its
    // width — a deep block, not a wall panel; using it as one is exactly
    // the "backwards" wall-rotation bug reported in Phase 18). `mc007` is a
    // real wide, thin crenellated wall panel from the actual
    // main_interface/buildings catalog (raw bbox 160×105.6×56, correctly
    // wide-and-thin), scaled to an 8m-wide segment.
    id: 'stonewall', name: 'Castle Wall (Crenellated)', thumb: `${P}/buildings/mc007.png`, model: `${P}/buildings/mc007.glb`,
    category: 'walls', size: [8, 5.28, 2.8], snap: GRID, stackable: true,
    // priced with the rest of the 8m wall family below (2026-07-20): this
    // used to cost 6 while the identically-sized mc006 wall cost 12
    cost: { stone: 10 }, buildXp: 20,
    requiresUnlock: 'mining',
  },
  {
    // was `04_l609100` (also catalog category "Brick", not remotely
    // tower-shaped). `mc003` is a real square-footprint turret with a
    // conical roof from main_interface/buildings (raw bbox 80×163×80).
    id: 'tower', name: 'Watch Tower', thumb: `${P}/buildings/mc003.png`, model: `${P}/buildings/mc003.glb`,
    category: 'defense', size: [4, 8.16, 4], snap: GRID, stackable: true,
    cost: { stone: 10, plank: 2 }, buildXp: 35,
    requiresUnlock: 'smithing',
  },
  {
    id: 'gate', name: 'Castle Gate', thumb: `${P}/windows_doors/06_l318500.png`, model: `${P}/windows_doors/06_l318500.glb`,
    category: 'defense', size: [4, 3.2, 2], snap: GRID, stackable: true,
    cost: { stone: 4, iron_bar: 1 }, buildXp: 25,
    requiresUnlock: 'smithing',
  },
  {
    // Wave 8 · the windows_doors folder held eight real frames and every one
    // of them was placed as a decorative brick you could walk straight
    // through — E did nothing at a door. This is the same mold (l407100, the
    // one big enough to be a doorway rather than a 1×2 window pane) promoted
    // into a piece that BEHAVES: shut it blocks, open it lets you and your
    // villagers through, and it seals a wall run for the fort check the same
    // way a gate does (see isDoorLike in game/types.ts — the two share one
    // state record and one set of rules rather than growing a parallel one).
    //
    // Named for what the mold actually is, corrected 2026-08-06: l407100 is a
    // barred lattice filling its whole opening, not a plain hollow frame — it
    // reads as a portcullis, not an oak door, and Buildings.tsx's DoorFixture
    // now raises/lowers the real mesh instead of hinging a procedural leaf
    // that never matched what was drawn behind it.
    //
    // Cheaper and earlier than the Castle Gate on purpose: a gate is 4m of
    // ironbound castle front, this is the way into your own yard.
    // Proportions are the mold's own (2.1 × 2.94 × 0.84 at brick scale) held
    // exactly, at a 2m-wide opening so it plugs a gap in a wall run.
    id: 'door', name: 'Portcullis', thumb: `${P}/windows_doors/12_l407100.png`, model: `${P}/windows_doors/12_l407100.glb`,
    category: 'walls', size: [2, 2.8, 0.8], snap: GRID, stackable: true,
    cost: { plank: 5, iron_bar: 1 }, buildXp: 18,
    requiresUnlock: 'building2',
  },
  {
    // Wave 24 · ROADMAP.md deliberately deferred a window/shutter
    // interactable "pending a mechanical reason to open one" — Wave 20's
    // hasLineOfSight (navgrid.ts) is that reason. The windows_doors folder
    // held a matched OPEN/CLOSED pair the whole time (14_l453201 "closed" /
    // 16_l453202 "open" — identical declared size, identical "Window/Door
    // 2×3" catalog name, sitting as two separate decorative bricks —
    // gen_14_l453201/gen_16_l453202 in bricks.generated.json — that were
    // each walkable through and did nothing). Promoted the exact way `door`
    // above was: same predicate (isDoorLike, types.ts), same shared
    // `gateOpen` record and `toggleGate` action, so a shut window blocks a
    // ranged shot through hasLineOfSight/forEachObstacleBox exactly the way
    // a wall does, and an open one lets a shot (and a body) straight
    // through — Buildings.tsx's WindowFixture swaps between the two real
    // meshes rather than animating one, which shows that state directly.
    //
    // Size held exactly at the mold's own real bbox (bricks.generated.json's
    // gen_14/16 entries), not a rounded number — PropModel scales uniformly
    // to declared height, so the three axes have to keep the real
    // proportions or the collision box stops matching what's drawn. Declared
    // height (0.84) is deliberately left under isRampart's 1.2m
    // RAMPART_MIN_HEIGHT (walls.ts): a window furnishing shouldn't
    // independently seal or breach your defense ring the way a real
    // door/gate does, only affect sightlines and passage.
    id: 'window', name: 'Window Shutters', thumb: `${P}/windows_doors/14_l453201.png`, model: `${P}/windows_doors/14_l453201.glb`,
    category: 'walls', size: [0.77, 0.84, 1.05], snap: 1, stackable: true,
    cost: { plank: 3 }, buildXp: 10,
    requiresUnlock: 'building2',
  },
  {
    // J51 · this is the FOUNDATION, not the castle. Placing it marks out a
    // 16m courtyard with nine named sockets; the corners, wall runs and
    // bailey are then chosen and raised one at a time (game/data/keep.ts),
    // so the castle that ends up standing there is the one you laid out.
    // The bill here is the groundwork only — each piece is paid for as it
    // is raised, which is why it is a fraction of the old all-in cost.
    id: 'keep', name: 'Castle Foundation', thumb: `${P}/buildings/mc001.png`, model: `${P}/buildings/mc001.glb`,
    category: 'defense', size: [16, 0.3, 16], snap: GRID, stackable: false,
    cost: { stone: 12, plank: 6 }, buildXp: 60,
    requiresUnlock: 'keep',
  },
  {
    id: 'farmplot', name: 'Farm Plot', icon: '🌾', category: 'essentials',
    size: [2, 0.5, 2], snap: 1, stackable: false,
    cost: { wood: 2, stone: 1 }, buildXp: 8,
  },
  {
    id: 'quintain', name: 'Quintain', icon: '🎯', category: 'defense',
    size: [1.2, 2.3, 1.2], snap: 1, stackable: false,
    cost: { plank: 3, stone: 1 }, buildXp: 10,
    requiresUnlock: 'building2',
  },
  {
    id: 'cannon', name: 'Cannon', icon: '💣', model: `${P}/cannon.glb`, category: 'defense',
    size: [1.6, 1.5, 2.4], snap: GRID, stackable: false,
    cost: { stone: 6, iron_bar: 2 }, buildXp: 30,
    requiresUnlock: 'smithing',
  },
  {
    id: 'warcart', name: 'Battering Cart', icon: '🛞', model: `${P}/oc4806.glb`, category: 'defense',
    size: [2.4, 2.4, 3.2], snap: GRID, stackable: false,
    cost: { plank: 6, iron_bar: 1 }, buildXp: 25,
    requiresUnlock: 'smithing',
  },
  {
    id: 'bladecart', name: 'Blade Cart', icon: '⚙️', model: `${P}/oc4807.glb`, category: 'defense',
    size: [2.4, 2.2, 3.2], snap: GRID, stackable: false,
    cost: { plank: 5, iron_bar: 1 }, buildXp: 25,
    requiresUnlock: 'smithing',
  },
  {
    id: 'market_stall', name: 'Market Stall', icon: '🪙', category: 'essentials',
    size: [2.6, 2.4, 1.8], snap: GRID, stackable: false,
    cost: { plank: 8, stone: 4 }, buildXp: 30,
    requiresUnlock: 'smithing',
  },
];

// Generated brick-scale pieces (real proportions from the extraction metadata).
interface GeneratedPiece {
  id: string; name: string; cat: string; model: string; thumb: string;
  size: [number, number, number];
  cost: Record<string, number>;
}

const GENERATED_BUILDABLES: Buildable[] = (GENERATED as unknown as GeneratedPiece[]).map((g) => ({
  id: g.id,
  name: g.name,
  thumb: g.thumb,
  model: g.model,
  category: g.cat as Buildable['category'],
  size: g.size,
  snap: STUD,
  stackable: true,
  cost: g.cost as Buildable['cost'],
  buildXp: 3,
  requiresUnlock: g.cat === 'castle' || g.cat === 'walls' ? 'mining' : 'building2',
}));

// Phase 25 — Prefab structures, promoted straight from the user's own Grok
// capability-labeling pass (grok/blender/movie/07082026/reports/
// PAK_CAPABILITY_OVERRIDES.json): the mc-series bespoke castle meshes with
// HUMAN-VERIFIED roles (wall_straight / wall_corner / wall_tower, plus the
// damaged and ruined phases labeled there as destruction stages — placeable
// here as battle-scarred flavor), and two verified prop stands.
//
// SCALE UNIFICATION (2026-07-20): the wall family used to be authored at TWO
// different scale factors — the `walls`/`defense` entries above at k=0.05
// world-metres per raw GLB unit, these prefabs at k=0.04375 — which is why
// nothing tiled. k=0.04375 produces 7 / 2.8 / 3.5-wide pieces, none of them a
// multiple of GRID (2), so the grid snap could never line two of them up
// flush and every run of wall left gaps. Everything in the family now uses
// **k = 0.05**, straight off the real GLB accessor bounds, which lands every
// piece exactly on the grid:
//   straights mc005/6/8/9/10  160 × …  × 48  ->  8   wide (4 cells), 2.4 deep
//   crenellated mc007         160 × 105.6 × 56 ->  8   wide,           2.8 deep
//   corner      mc004          80 × 86.4  × 80 ->  4   square (2 cells)
//   corner      mc001          64 × 76.8  × 64 ->  3.2 square — the one piece
//     that ISN'T a grid multiple at true scale, so it keeps a 4×4 footprint
//     (its mesh simply sits a little loose inside the cell) and mc004 is the
//     corner to reach for when you want a flush run.
//   tower       mc003          80 × 163.2 × 80 ->  4   square, matching mc004
//     so a corner and a turret are interchangeable at any wall junction.
// Costs are normalised by size/role in the same pass — an 8m wall is 10 stone
// whichever mesh it uses, instead of 6 for one and 12 for another.
const B = '/assets/props/buildings';
const PREFABS: Buildable[] = [
  // G27 · somewhere to keep a captured horse. Built from the same barn mold
  // the starter village uses, so it reads as a working outbuilding rather
  // than a new invented shape.
  // K55 · this pointed at mc008, which is a straight WALL SECTION — a stable
  // that looked like a fence. There is no barn mold anywhere in the
  // extraction (checked the lab's 86 verified assets), so it uses the same
  // piece the starter village's huts already use to read as an outbuilding,
  // at a barn's proportions.
  { id: 'stable', name: 'Stable', thumb: `${B}/mc001.png`, model: `${B}/mc001.glb`,
    category: 'essentials', size: [6, 3.4, 6], snap: GRID, stackable: false,
    cost: { wood: 14, plank: 8 }, buildXp: 45 },
  { id: 'mc005', name: 'Castle Wall (Low)', thumb: `${B}/mc005.png`, model: `${B}/mc005.glb`,
    category: 'walls', size: [8, 3.84, 2.4], snap: GRID, stackable: true,
    cost: { stone: 7 }, buildXp: 28, requiresUnlock: 'mining' },
  { id: 'mc006', name: 'Castle Wall (Plain)', thumb: `${B}/mc006.png`, model: `${B}/mc006.glb`,
    category: 'walls', size: [8, 5.28, 2.4], snap: GRID, stackable: true,
    cost: { stone: 10 }, buildXp: 40, requiresUnlock: 'mining' },
  { id: 'mc004', name: 'Wall Corner', thumb: `${B}/mc004.png`, model: `${B}/mc004.glb`,
    category: 'walls', size: [4, 4.32, 4], snap: GRID, stackable: true,
    cost: { stone: 8 }, buildXp: 30, requiresUnlock: 'mining' },
  { id: 'mc001', name: 'Wall Corner (Small)', thumb: `${B}/mc001.png`, model: `${B}/mc001.glb`,
    // true scale is 3.2 square; declared 4×4 so it still snaps flush against
    // the 8m walls and the 4m corner/turret rather than half-straddling a cell
    category: 'walls', size: [4, 3.84, 4], snap: GRID, stackable: true,
    cost: { stone: 6 }, buildXp: 26, requiresUnlock: 'mining' },
  { id: 'mc003', name: 'Wall Turret', thumb: `${B}/mc003.png`, model: `${B}/mc003.glb`,
    // same mesh and footprint as the Watch Tower in Defense — that one is the
    // stationable version (a defender can be posted on it); this one is the
    // plain decorative run-of-wall turret, priced to match so the two never
    // read as an arbitrary price difference for the same thing
    category: 'walls', size: [4, 8.16, 4], snap: GRID, stackable: true,
    cost: { stone: 10, plank: 2 }, buildXp: 35, requiresUnlock: 'mining' },
  { id: 'mc009', name: 'Breached Wall', thumb: `${B}/mc009.png`, model: `${B}/mc009.glb`,
    category: 'walls', size: [8, 5.28, 2.4], snap: GRID, stackable: true,
    cost: { stone: 7 }, buildXp: 25, requiresUnlock: 'mining' },
  { id: 'mc010', name: 'Ruined Wall', thumb: `${B}/mc010.png`, model: `${B}/mc010.glb`,
    category: 'walls', size: [8, 5.28, 2.4], snap: GRID, stackable: true,
    cost: { stone: 5 }, buildXp: 15, requiresUnlock: 'mining' },
  { id: 'oc6094-1', name: 'Weapons Rack', thumb: `${B}/oc6094-1.png`, model: `${B}/oc6094-1.glb`,
    category: 'prefab', size: [0.9, 2.4, 1], snap: GRID, stackable: false,
    cost: { wood: 3, iron_bar: 1 }, buildXp: 15 },
  // Wave 8 · four more of the lab's VERIFIED oc-series set pieces, which have
  // been in the extraction (and in capabilities.json, `seedSource: verified`,
  // with real structureKinds) the whole time and were only ever placeable as
  // anonymous "Castle Piece 8×9" generic bricks. Same promotion oc6094-1 and
  // oc6032b4 already had; the generic duplicates are deliberately left alone,
  // exactly as those two left theirs (an old save may hold a `gen_` id).
  //
  // Sizes are the generic entries' own measurements rescaled from the brick
  // pipeline's k = 0.04375 to the castle family's k = 0.05 (×8/7), so these
  // stand at the same scale as the mc-series walls rather than 12% short.
  // PropModel scales a mesh UNIFORMLY to its declared height, so the three
  // axes have to keep the model's real proportions or the collision box stops
  // matching what is drawn.
  { id: 'oc6094-2', name: 'Jail Cell', thumb: `${B}/oc6094-2.png`, model: `${B}/oc6094-2.glb`,
    category: 'prefab', size: [3.2, 6.4, 3.6], snap: GRID, stackable: false,
    cost: { stone: 12, iron_bar: 2 }, buildXp: 40, requiresUnlock: 'smithing' },
  { id: 'oc6094b5', name: 'Jail Tower', thumb: `${B}/oc6094b5.png`, model: `${B}/oc6094b5.glb`,
    category: 'prefab', size: [4.8, 12.64, 3.6], snap: GRID, stackable: false,
    cost: { stone: 20, wood: 6, iron_bar: 3 }, buildXp: 70, requiresUnlock: 'smithing' },
  // true k=0.05 height is 15.84, which no placement could ever accept:
  // evalPlacement rejects anything taller than MAX_STACK_HEIGHT (14). Scaled
  // down as a WHOLE piece (all three axes ×12/15.84) rather than by squashing
  // the declared height alone, which would have left the footprint 30% wider
  // than the mesh PropModel actually draws.
  { id: 'oc6098b3', name: 'Jewel Tower', thumb: `${B}/oc6098b3.png`, model: `${B}/oc6098b3.glb`,
    category: 'prefab', size: [2.42, 12, 3.03], snap: GRID, stackable: false,
    cost: { stone: 18, iron_bar: 2, gold: 40 }, buildXp: 65, requiresUnlock: 'keep' },
  // the lab's one `wallRole: 'gate'` piece — a whole castle front with its own
  // drawbridge, not a wall segment. Priced and gated like the Siege Tower
  // because it is that kind of undertaking.
  { id: 'oc6098-1', name: 'Drawbridge Front', thumb: `${B}/oc6098-1.png`, model: `${B}/oc6098-1.glb`,
    category: 'prefab', size: [19.2, 5.58, 14], snap: GRID, stackable: false,
    cost: { stone: 40, plank: 16, iron_bar: 6 }, buildXp: 120, requiresUnlock: 'keep' },
  { id: 'oc6032b4', name: 'Armory Stand', thumb: `${B}/oc6032b4.png`, model: `${B}/oc6032b4.glb`,
    category: 'prefab', size: [1.4, 2.2, 0.9], snap: GRID, stackable: false,
    cost: { wood: 4, iron_bar: 2 }, buildXp: 18 },
  { id: 'banner', name: 'War Banner', thumb: `${P}/castle_accessories/18_l7196300.png`, model: `${P}/castle_accessories/18_l7196300.glb`,
    category: 'decor', size: [1.2, 2.4, 0.4], snap: 1, stackable: false,
    cost: { wood: 2, flowers: 1 }, buildXp: 8 },
];

// Siege engines and explosives (2026-07-20), promoted straight from the rig
// lab's verified capability pass. These meshes were sitting unused in the
// extraction the whole time: `traits.vehicle` marks nine of them as real siege
// engines (`isSiegeEngine`, `canFire`, `siegeRole`), and `traits.explosive`
// marks four as charges that damage walls and vehicles. The game had exactly
// one hand-built `cannon` standing in for all of it.
//
// Sizes are the real GLB accessor bounds at the same k = 0.05 the wall family
// uses, so a catapult sits at a believable scale next to a castle wall.
// Whether a piece can be fired is NOT hardcoded here — it's read back from the
// lab data at runtime (see labCanFire in data/labCapabilities.ts consumers),
// so the trait file stays the single source of truth.
const L = '/assets/props/lab';
const SIEGE: Buildable[] = [
  { id: 'oc6096-4', name: 'Catapult', thumb: `${L}/oc6096-4.png`, model: `${L}/oc6096-4.glb`,
    category: 'siege', size: [2.8, 3.96, 5.49], snap: GRID, stackable: false,
    cost: { wood: 12, plank: 8, iron_bar: 2 }, buildXp: 55, requiresUnlock: 'smithing' },
  { id: 'oc6096-3', name: 'Stone Thrower', thumb: `${L}/oc6096-3.png`, model: `${L}/oc6096-3.glb`,
    category: 'siege', size: [6.8, 7.2, 2.56], snap: GRID, stackable: false,
    cost: { wood: 16, plank: 10, iron_bar: 3 }, buildXp: 70, requiresUnlock: 'smithing' },
  { id: 'oc1289', name: 'Stone Thrower (Small)', thumb: `${L}/oc1289.png`, model: `${L}/oc1289.glb`,
    category: 'siege', size: [1.6, 2.14, 2.72], snap: GRID, stackable: false,
    cost: { wood: 8, plank: 4, iron_bar: 1 }, buildXp: 35, requiresUnlock: 'smithing' },
  { id: 'oc4806b2', name: 'Crossbow Station', thumb: `${L}/oc4806b2.png`, model: `${L}/oc4806b2.glb`,
    category: 'siege', size: [5.24, 3.92, 2.24], snap: GRID, stackable: false,
    cost: { wood: 10, plank: 6, iron_bar: 2 }, buildXp: 45, requiresUnlock: 'smithing' },
  { id: 'oc4806b3', name: 'Crossbow Turret', thumb: `${L}/oc4806b3.png`, model: `${L}/oc4806b3.glb`,
    category: 'siege', size: [4, 4, 2.22], snap: GRID, stackable: false,
    cost: { wood: 8, plank: 5, iron_bar: 2 }, buildXp: 40, requiresUnlock: 'smithing' },
  { id: 'oc4801', name: 'Turntable Turret', thumb: `${L}/oc4801.png`, model: `${L}/oc4801.glb`,
    category: 'siege', size: [3.2, 2.2, 2.22], snap: GRID, stackable: false,
    cost: { wood: 6, plank: 4, iron_bar: 1 }, buildXp: 32, requiresUnlock: 'smithing' },
  { id: 'oc6032b2', name: 'Defense Catapult', thumb: `${L}/oc6032b2.png`, model: `${L}/oc6032b2.glb`,
    category: 'siege', size: [3.4, 4.1, 5.08], snap: GRID, stackable: false,
    cost: { wood: 12, plank: 6, iron_bar: 2 }, buildXp: 50, requiresUnlock: 'smithing' },
  { id: 'oc6096b4', name: 'Wall Cannon', thumb: `${L}/oc6096b4.png`, model: `${L}/oc6096b4.glb`,
    category: 'siege', size: [3.2, 3.84, 4.8], snap: GRID, stackable: false,
    cost: { stone: 8, iron_bar: 3 }, buildXp: 48, requiresUnlock: 'smithing' },
  { id: 'oc6096b3', name: 'Siege Tower', thumb: `${L}/oc6096b3.png`, model: `${L}/oc6096b3.glb`,
    category: 'siege', size: [7.84, 10.56, 7.78], snap: GRID, stackable: false,
    cost: { wood: 30, plank: 20, iron_bar: 6 }, buildXp: 110, requiresUnlock: 'keep' },
  // Wave 8 · the climbing piece. The lab charted this one as
  // `structureKind: 'ladder'`, `isLadder`, `isMovableLadder`, `canStandOn` —
  // everything a climbing piece needs — and it was placeable only as a
  // nameless "Castle Piece 6×5" you walked past. It lives with the engines
  // because that is what it is for: the way UP a wall you cannot knock down.
  //
  // Named for what the mold actually shows, corrected 2026-08-06: its own
  // thumbnail is a small stone gate-arch with a wooden ladder built into it,
  // not a bare portable ladder — no other `isLadder` mold exists in the
  // extraction to swap in for it (grepped `capabilities.json`; this is the
  // only one), so the fix is honest naming/pricing rather than pretending it
  // is something it isn't. A stub of masonry with a stair in it, raised
  // against your own wall, is a real siege-camp structure — a Siege Stair —
  // just not a thing you casually lean and re-lean, so the cost picked up a
  // little stone to match what's actually drawn.
  //
  // Deliberately `stackable`, unlike every engine here: at its true k=0.05
  // scale one is 3.2m, which clears a keep's wall walk (3.6 / 4.2 with a
  // pull-up) but not a placed 5.28m castle wall. Two lashed together do —
  // and the climb reads the whole stacked column's top, so stacking is a real
  // answer rather than decoration (see climbTargetFor in PlayerController).
  { id: 'oc6096-5', name: 'Siege Stair', thumb: `${B}/oc6096-5.png`, model: `${B}/oc6096-5.glb`,
    category: 'siege', size: [2.4, 3.2, 2], snap: 1, stackable: true,
    cost: { stone: 3, wood: 8, plank: 4 }, buildXp: 20, requiresUnlock: 'building2' },
  // explosives: `traits.explosive.damagesWalls` — set one down, strike it,
  // and it takes out what's around it
  { id: 'l248901', name: 'Powder Barrel', thumb: `${L}/l248901.png`, model: `${L}/l248901.glb`,
    category: 'siege', size: [0.8, 0.96, 0.8], snap: 1, stackable: false,
    cost: { wood: 4, stone: 2 }, buildXp: 18, requiresUnlock: 'smithing' },
  { id: 'l473801', name: 'Powder Chest', thumb: `${L}/l473801.png`, model: `${L}/l473801.glb`,
    category: 'siege', size: [0.8, 0.96, 2], snap: 1, stackable: false,
    cost: { wood: 6, stone: 3 }, buildXp: 22, requiresUnlock: 'smithing' },
  { id: 'l394101', name: 'Powder Charge', thumb: `${L}/l394101.png`, model: `${L}/l394101.glb`,
    category: 'siege', size: [0.8, 0.48, 0.8], snap: 1, stackable: false,
    cost: { wood: 2, stone: 2 }, buildXp: 12, requiresUnlock: 'smithing' },
];

export const BUILDABLES: Buildable[] = [...CRAFTED, ...PREFABS, ...SIEGE, ...GENERATED_BUILDABLES];
export const BUILDABLE_BY_ID: Record<string, Buildable> = Object.fromEntries(
  BUILDABLES.map((b) => [b.id, b]),
);

/**
 * Buildable id -> the rig lab's ASSET id, which are not the same thing: the
 * Castle Wall's buildable id is `stonewall` while the lab knows that mesh as
 * `mc007`, the Watch Tower is `tower` vs `mc003`, and so on. Derived from the
 * model filename so it stays right automatically as pieces are added, rather
 * than being a second table to keep in sync. Pieces with no model (procedural
 * campfire, torch…) just answer with their own id and find no lab entry,
 * which is correct — the lab never charted them.
 */
export function labAssetId(type: string): string {
  const b = BUILDABLE_BY_ID[type];
  if (!b?.model) return type;
  const base = b.model.split('/').pop() ?? '';
  return base.replace(/\.glb$/i, '') || type;
}

/** the reverse: which buildable renders a given lab asset (used to turn a
 *  destruction-phase answer back into something placeable) */
export function buildableForLabAsset(labId: string): string | null {
  if (BUILDABLE_BY_ID[labId]) return labId;
  for (const b of BUILDABLES) if (b.model && labAssetId(b.id) === labId) return b.id;
  return null;
}

export const BUILD_CATEGORIES: { id: Buildable['category']; label: string; icon: string }[] = [
  { id: 'essentials', label: 'Essentials', icon: '🏕️' },
  { id: 'prefab', label: 'Prefabs', icon: '🏯' },
  { id: 'defense', label: 'Defense', icon: '🗡️' },
  { id: 'siege', label: 'Siege', icon: '💥' },
  { id: 'walls', label: 'Walls', icon: '🧱' },
  { id: 'bricks', label: 'Bricks', icon: '🟫' },
  { id: 'decor', label: 'Windows & Decor', icon: '🪟' },
  { id: 'castle', label: 'Towers & Roofs', icon: '🏰' },
];

/** footprint (x, z) in meters after rotation */
export function sizeFor(type: string, rot: number): [number, number] {
  const b = BUILDABLE_BY_ID[type];
  if (!b) return [1, 1];
  return rot % 2 === 1 ? [b.size[2], b.size[0]] : [b.size[0], b.size[2]];
}

export function heightOf(type: string): number {
  return BUILDABLE_BY_ID[type]?.size[1] ?? 1;
}

/**
 * Wave 9 · which standing pieces a dragged-out patch of ground actually takes.
 * Footprint OVERLAP, not centre-inside: a marquee that clips the end of an 8m
 * wall obviously means that wall, and asking the player to lasso an exact
 * centre point is a precision game nobody wants to play.
 *
 * Lives here, next to `sizeFor`, because it is pure footprint geometry — and
 * because the area-demolish tool has to ask it twice from two places (the
 * live marquee in BuildController, the armed confirmation in the store) and
 * those two must never disagree about what is inside the box.
 *
 * The Grand Keep's foundation is always excluded: its parts/progress/HP live
 * outside PlacedBuilding and only `pickupKeep` knows how to carry them, so a
 * castle is taken down deliberately or not at all.
 */
export function buildingsInRect(
  buildings: PlacedBuilding[],
  world: string | null,
  rect: BuildRect,
): PlacedBuilding[] {
  return buildings.filter((b) => {
    if ((b.world ?? null) !== (world ?? null)) return false;
    if (b.type === 'keep') return false;
    const [bsx, bsz] = sizeFor(b.type, b.rot);
    return b.x + bsx / 2 > rect.minX && b.x - bsx / 2 < rect.maxX
      && b.z + bsz / 2 > rect.minZ && b.z - bsz / 2 < rect.maxZ;
  });
}

// Real wall collision (2026-07-20): the mc-series prefab walls/towers were
// colliding as one solid box spanning their full declared footprint at every
// height, so a player could never get closer than the WIDEST point anywhere
// on the piece — usually a corbelled ledge or a tower's projecting upper
// gallery — even though the actual wall/tower SHAFT a player walks up to is
// much narrower. Verified against the real GLBs (Y-sliced vertex sampling,
// scripts/yslice one-off): mc006's core shaft is roughly half its declared
// depth; mc003 (Wall Tower)'s base shaft is ~80% of its declared width/depth,
// with a genuine projecting gallery starting around 2 world units up — right
// where a standing player's own overhead-pass threshold already kicks in
// below. So each entry here is just a NARROWER "core" box for the lower
// portion (where a walking player's body actually is); above `coreHeight`,
// collision falls back to the existing single-box passesOverhead escape
// hatch, which already lets you walk under anything whose base clears you —
// no second box needed up there. Pieces absent from this table keep the
// original single full-footprint box exactly as before (zero risk elsewhere).
export interface WallCoreBox {
  coreHeight: number; // world units — collision uses the narrow core up to here
  depthFrac: number;  // fraction of the piece's own declared depth (sz), centered
  widthFrac: number;  // fraction of the piece's own declared width (sx), centered
}
const WALL_CORE: Record<string, WallCoreBox> = {
  mc006: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc007: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc008: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc009: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc010: { coreHeight: 2.0, depthFrac: 0.5, widthFrac: 0.95 },
  mc001: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  mc004: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  mc005: { coreHeight: 2.0, depthFrac: 0.7, widthFrac: 0.7 },
  mc003: { coreHeight: 2.0, depthFrac: 0.8, widthFrac: 0.8 },
};

/** Wall pieces the rig lab flags `traits.wall.hasHole` — a breach you can see
 *  straight through, so you should be able to walk through it too. mc009 is
 *  destruction phase 2/3 (holed), mc010 phase 3/3 (ruined). Their lower core
 *  becomes two side pillars with an opening between, instead of one solid
 *  slab that stops you at an invisible edge in the middle of a visible gap. */
const WALL_HOLE = new Set(['mc009', 'mc010']);
/** fraction of the piece's length left open at the breach */
const HOLE_FRAC = 0.44;

export interface CollisionBox {
  hx: number; hz: number; yBase: number; yTop: number;
  /** centre offset from the building origin, in already-rotated world axes */
  ox?: number; oz?: number;
}

/** the stack of collision sub-boxes for a building type at a given base Y
 *  (relative, i.e. yBase/yTop are offsets ABOVE the building's own `b.y`) —
 *  one box spanning the full height for anything not in WALL_CORE (identical
 *  to the old single-box behavior), or two stacked boxes (narrow core below,
 *  full declared footprint above) for a piece with an override. */
/**
 * L65 · Where a piece's SOLID mass sits inside its declared footprint.
 *
 * A crenellated wall is a 0.86m slab of stone at the back of a 2.8m footprint
 * with the battlement overhanging forward. Both the mesh and the footprint are
 * centred on the cell, so the stone itself sits at the back of the cell at one
 * facing and at the front when you turn the piece around — the wall face
 * jumped a metre and a half and no longer met its neighbour on the grid line.
 *
 * This is the offset that re-centres the STONE on the cell, letting the
 * decorative overhang hang outside the footprint where it belongs. It is
 * measured from the piece's own collision volumes, so it costs no new data and
 * cannot drift from the geometry.
 */
const solidOffsetCache: Record<string, [number, number]> = {};

export function solidOffset(type: string): [number, number] {
  const cached = solidOffsetCache[type];
  if (cached) return cached;
  const shape = shapeFor(type);
  let out: [number, number] = [0, 0];
  if (shape && shape.length) {
    let vol = 0; let cx = 0; let cz = 0;
    for (const b of shape) {
      const v = b.hx * b.hy * b.hz;
      vol += v; cx += b.cx * v; cz += b.cz * v;
    }
    if (vol > 0) out = [cx / vol, cz / vol];
  }
  solidOffsetCache[type] = out;
  return out;
}

/** the same offset, turned to face the way the piece is placed */
export function solidOffsetRotated(type: string, rot: number): [number, number] {
  const [ox, oz] = solidOffset(type);
  let x = ox; let z = oz;
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) {
    const nx = z; const nz = -x;
    x = nx; z = nz;
  }
  return [x, z];
}

export function collisionBoxesFor(type: string, rot: number): CollisionBox[] {
  const [sx, sz] = sizeFor(type, rot);
  const fullTop = heightOf(type);

  // Real geometry first: scripts/gen-collision.mjs emits per-piece boxes
  // voxelised from the source OBJ, which is the only way an arch gets an
  // actual hole instead of being a solid slab you cannot walk under. The
  // boxes are authored in the piece's UNROTATED local frame, so a quarter
  // turn swaps the axes exactly the way sizeFor already swaps the footprint.
  const shape = shapeFor(type);
  if (shape && shape.length) {
    const quarter = ((rot % 4) + 4) % 4;
    // re-centre on the solid (L65) before turning, so the volumes move with
    // the mesh — Buildings.tsx applies the same shift when it draws
    const [sox, soz] = solidOffset(type);
    return shape.map((b) => {
      // L63 · rotate the centre offset and the half-extents together, THE
      // SAME WAY THE MESH TURNS. This turned the other way: a three.js yaw of
      // +90° sends a local (x, z) to world (z, -x) — its Y-rotation matrix is
      // [cos 0 sin / 0 1 0 / -sin 0 cos] — while this loop was computing
      // (-z, x), which is -90°. At 180° the two agree, which is why the error
      // hid; at a quarter turn the solid stone of a wall ended up on the far
      // side from where it was drawn, so you were stopped under the overhang
      // and walked through the stone.
      let ox = b.cx - sox; let oz = b.cz - soz; let hx = b.hx; let hz = b.hz;
      for (let i = 0; i < quarter; i++) {
        const nx = oz; const nz = -ox;
        ox = nx; oz = nz;
        const th = hx; hx = hz; hz = th;
      }
      return { hx, hz, ox, oz, yBase: b.cy - b.hy, yTop: b.cy + b.hy };
    });
  }

  const core = WALL_CORE[type];
  if (!core) return [{ hx: sx / 2, hz: sz / 2, yBase: 0, yTop: fullTop }];
  // widthFrac/depthFrac are authored against the UNROTATED size; sizeFor
  // already swapped sx/sz for a 90°/270° rotation, so swap the fractions too
  const [wFrac, dFrac] = rot % 2 === 1 ? [core.depthFrac, core.widthFrac] : [core.widthFrac, core.depthFrac];
  const coreTop = Math.min(core.coreHeight, fullTop);
  const coreHx = (sx * wFrac) / 2;
  const coreHz = (sz * dFrac) / 2;
  const boxes: CollisionBox[] = [];

  if (WALL_HOLE.has(type)) {
    // breached: two pillars flanking an opening. The length axis is X for an
    // unrotated piece and Z once turned 90°, matching sizeFor's own swap.
    const alongX = rot % 2 === 0;
    const halfLen = alongX ? coreHx : coreHz;
    const gapHalf = (alongX ? sx : sz) * HOLE_FRAC / 2;
    const pillar = (halfLen - gapHalf) / 2;
    if (pillar > 0.05) {
      const centre = gapHalf + pillar;
      for (const sign of [-1, 1]) {
        boxes.push(alongX
          ? { hx: pillar, hz: coreHz, yBase: 0, yTop: coreTop, ox: sign * centre }
          : { hx: coreHx, hz: pillar, yBase: 0, yTop: coreTop, oz: sign * centre });
      }
    }
    // no `else`: a breach wider than the core leaves the base fully open
  } else {
    boxes.push({ hx: coreHx, hz: coreHz, yBase: 0, yTop: coreTop });
  }

  if (coreTop < fullTop) boxes.push({ hx: sx / 2, hz: sz / 2, yBase: coreTop, yTop: fullTop });
  return boxes;
}

/** structural HP, derived from a piece's own resource cost — pricier
 *  structures (the keep, stone walls) shrug off far more than a cheap
 *  torch or a single brick before siege damage reduces them to rubble. */
export function maxHpFor(type: string): number {
  const b = BUILDABLE_BY_ID[type];
  if (!b) return 20;
  const totalCost = Object.values(b.cost).reduce((s: number, n) => s + (n ?? 0), 0);
  return Math.max(15, Math.round(totalCost * 3));
}

// The dev-only "no fixed world prop inside BUILD_REGION" guard that used to
// live here moved to world.ts (2026-08-25) — it needs FIXED_WORLD_PROPS
// (world.ts) AND BUILD_REGION (here), and world.ts needing worlds.ts (for
// the new durable-storage resolveDestPoint calls) would otherwise complete a
// real import cycle: worlds.ts -> dungeon.ts -> buildables.ts -> world.ts ->
// worlds.ts. Keeping the check here and having world.ts import BUILD_REGION
// FROM here (below, unchanged) breaks that cycle instead of completing it —
// see world.ts's own comment at the relocated check for the assertion
// itself.

// debug handle: lets a smoke test compare the collision volumes against the
// mesh that is actually drawn (see scripts/smoke123.mjs)
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkcollideFor = (type: string, rot: number) =>
    collisionBoxesFor(type, rot);
}
