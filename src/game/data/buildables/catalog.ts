// CLN-10 · split out of buildables.ts unchanged: the catalogue itself — every piece the player can place, hand-
// authored (crafted structures, prefabs, siege engines) or generated from the brick catalogue — and the lookups
// that are pure functions of it.
import type { Buildable } from '../../types';
import GENERATED from '../bricks.generated.json';
import { GRID, STUD } from './region';

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
    // Wave 29 · 2× Brick 1×4 + 1× Brick 8×8 = 6 plank exactly.
    pieces: [{ id: 'gen_12_l301000', qty: 2 }, { id: 'gen_48_l420100', qty: 1 }],
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
    // Wave 29 · 2× Brick 8×8 + 2× Brick 1×4 = 10 plank, 1× Wall Section 7×7
    // = 6 stone.
    pieces: [{ id: 'gen_48_l420100', qty: 2 }, { id: 'gen_12_l301000', qty: 2 }, { id: 'gen_24_l607200', qty: 1 }],
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
    // Wave 29 · 4× Roof Slope 2×1 (the rails) = 4 plank, 1× Wall Section
    // 2×2 (the post footing) = 1 stone.
    pieces: [{ id: 'gen_00_l304000', qty: 4 }, { id: 'gen_10_l235700', qty: 1 }],
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
    // Wave 29 · 2× Wall Section 2×5 + 2× Wall Section 2×2 = 10 stone.
    pieces: [{ id: 'gen_14_l444400', qty: 2 }, { id: 'gen_10_l235700', qty: 2 }],
  },
  {
    // was `04_l609100` (also catalog category "Brick", not remotely
    // tower-shaped). `mc003` is a real square-footprint turret with a
    // conical roof from main_interface/buildings (raw bbox 80×163×80).
    id: 'tower', name: 'Watch Tower', thumb: `${P}/buildings/mc003.png`, model: `${P}/buildings/mc003.glb`,
    category: 'defense', size: [4, 8.16, 4], snap: GRID, stackable: true,
    cost: { stone: 10, plank: 2 }, buildXp: 35,
    requiresUnlock: 'smithing',
    // Wave 29 · the first hand-picked bill (item 1 of the content-authoring
    // pass): 2× Wall Section 2×5 + 2× Tower Piece 2×2 = 10 stone exactly,
    // 2× Roof Slope 2×1 = 2 plank exactly — real bricks.generated.json SKUs
    // whose own costs sum to this buildable's `cost` above. See
    // Buildable.pieces (types.ts) and costBill() (costBill.ts) for how this reads.
    pieces: [{ id: 'gen_14_l444400', qty: 2 }, { id: 'gen_06_l394100', qty: 2 }, { id: 'gen_00_l304000', qty: 2 }],
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
    // Wave 29 · 3× its own real mold (gen_14_l453201, "Window/Door 2×3",
    // 1 plank each) = 3 plank exactly — this piece IS the catalogue SKU.
    pieces: [{ id: 'gen_14_l453201', qty: 3 }],
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
    // Wave 29 · 2× Wall Section 7×7 = 12 stone, 2× Roof Slope 8×6 = 6
    // plank — the biggest single SKUs in the catalogue, matching the scale
    // of a whole courtyard's groundwork.
    pieces: [{ id: 'gen_24_l607200', qty: 2 }, { id: 'gen_54_l451500', qty: 2 }],
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
    // Wave 29 · 1× Roof Slope 8×6 (the crossarm) = 3 plank, 1× Tower Piece
    // 1×1 (the post footing) = 1 stone.
    pieces: [{ id: 'gen_54_l451500', qty: 1 }, { id: 'gen_00_l306200', qty: 1 }],
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
    // Wave 29 · 2× Brick 8×8 (the counter/awning) = 8 plank, 4× Tower
    // Piece 2×2 (the corner posts) = 4 stone.
    pieces: [{ id: 'gen_48_l420100', qty: 2 }, { id: 'gen_06_l394100', qty: 4 }],
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
  // Wave 34 (G6.1) · mc002/mc008 sat verified in capabilities.json
  // (rigStatus:"verified", real wallRole/canConnectAsWall traits) the whole
  // time as static decoration only (mapPopulation.generated.json), never a
  // placeable Buildable. Real GLB geometry confirms both are same-footprint
  // siblings of an already-promoted piece: mc002 is byte-for-byte mc001's
  // raw size (a banded-corner variant), mc008 is byte-for-byte mc006/mc009's
  // raw size (a windowed straight, no hasHole/isRuined — an intact piece,
  // not a damage phase), so both are priced/sized identically to that twin.
  { id: 'mc002', name: 'Wall Corner (Banded)', thumb: `${B}/mc002.png`, model: `${B}/mc002.glb`,
    category: 'walls', size: [4, 3.84, 4], snap: GRID, stackable: true,
    cost: { stone: 6 }, buildXp: 26, requiresUnlock: 'mining' },
  { id: 'mc008', name: 'Castle Wall (Windowed)', thumb: `${B}/mc008.png`, model: `${B}/mc008.glb`,
    category: 'walls', size: [8, 5.28, 2.4], snap: GRID, stackable: true,
    cost: { stone: 10 }, buildXp: 40, requiresUnlock: 'mining' },
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
  // Wave 35 (G4) · four matched corner towers, confirmed live as one real
  // coherent set — not just a shared `oc6098` prefix: capabilities.json
  // gives all four the same `castleSet:'oc6098'`, `placement:
  // 'corner_on_base_plate'`, `sitsOnBasePlate:'oc6098-1'` (the Drawbridge
  // Front prefab above IS that base plate). Two carry a real fire
  // capability (oc6098-3's catapult, oc6098-5's crossbows — wired via
  // labCapabilities.ts's WALL_FIRE_OVERRIDES, Wave 35 G3/G4); the other two
  // are plain/ornate corners with no weapon. None has a part_roles.json rig
  // of its own, so oc6098-3's catapult fires (sound + stone) without a
  // visible arm swing — honest, not broken; its sibling oc6098b1 (G3) DOES
  // have a rig and will swing. Kept together in Walls, mc002's own real
  // precedent ("Wall Corner (Banded)") for a named wall-family corner piece,
  // rather than splitting the two firing ones into Siege and stranding the
  // other two elsewhere — that keeps the matched family visible as one
  // group in the catalog. Sizes are bricks.generated.json's own real bbox
  // for each (gen_oc6098-3/4/5/6), held verbatim.
  { id: 'oc6098-3', name: 'Corner Tower (Catapult)', thumb: `${B}/oc6098-3.png`, model: `${B}/oc6098-3.glb`,
    category: 'walls', size: [2.8, 6.93, 4.63], snap: GRID, stackable: true,
    cost: { wood: 10, plank: 6, stone: 4, iron_bar: 2 }, buildXp: 45, requiresUnlock: 'smithing' },
  { id: 'oc6098-4', name: 'Corner Tower (Plain)', thumb: `${B}/oc6098-4.png`, model: `${B}/oc6098-4.glb`,
    category: 'walls', size: [2.8, 4.34, 3.85], snap: GRID, stackable: true,
    cost: { stone: 8 }, buildXp: 30, requiresUnlock: 'mining' },
  // real collision.json only voxelizes THIS corner (`gen_oc6098-5`) — see
  // COLLISION_ALIAS (collision.ts).
  { id: 'oc6098-5', name: 'Corner Tower (Crossbow)', thumb: `${B}/oc6098-5.png`, model: `${B}/oc6098-5.glb`,
    category: 'walls', size: [4.677, 2.726, 3.739], snap: GRID, stackable: true,
    cost: { wood: 8, plank: 5, stone: 4, iron_bar: 2 }, buildXp: 42, requiresUnlock: 'smithing' },
  { id: 'oc6098-6', name: 'Corner Tower (Ornate)', thumb: `${B}/oc6098-6.png`, model: `${B}/oc6098-6.glb`,
    category: 'walls', size: [2.8, 10.22, 3.22], snap: GRID, stackable: true,
    cost: { stone: 8, plank: 2 }, buildXp: 32, requiresUnlock: 'mining' },
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
  // Wave 34 (G6.2) · oc6095-1 (hasSkeleton/hasStandSpot) and oc6096b5
  // (hasSpringboard/canLaunch) each exist today as exactly ONE static
  // decoration instance (mapPopulation.generated.json), sitting deep in
  // unreachable background diorama scenery — the same "distant procession
  // figure" placement TemplateWorld.tsx/prepare-assets.mjs already document
  // for the King Leo marker. That instance can never actually be walked up
  // to, so promoting it in place isn't possible; the real fix (same move as
  // oc6094-1/oc6032b4 above) is a placeable copy the player can put
  // somewhere reachable and actually interact with. The unreachable
  // decoration and its `gen_` generic-brick duplicate are left untouched.
  { id: 'oc6095-1', name: 'Skeleton Display', thumb: `${B}/oc6095-1.png`, model: `${B}/oc6095-1.glb`,
    category: 'prefab', size: [4.8, 7.12, 3.63], snap: GRID, stackable: false,
    cost: { stone: 6, wood: 2 }, buildXp: 25, requiresUnlock: 'building2' },
  { id: 'oc6096b5', name: 'Springboard', thumb: `${B}/oc6096b5.png`, model: `${B}/oc6096b5.glb`,
    category: 'prefab', size: [5.22, 4.44, 9.2], snap: GRID, stackable: false,
    cost: { wood: 10, plank: 4 }, buildXp: 35, requiresUnlock: 'building2' },
  // Wave 29 · arches/rounded-piece audit (item 2). Nine real "Arch" catalog
  // pieces sat generically in the decor bricks tab the whole time; the rig
  // lab (part_roles.json) charts `16_l302721` (the tallest, 4.34m) as
  // carrying a genuine second sub-mesh — `005_L_604600: 'portcullis'` — a
  // real lattice gate built into the arch, not just an open archway. That
  // makes it a gatehouse, not garden decor, and its walkable-hole collision
  // is already real (scripts/gen-collision.mjs voxelized it: 25 boxes,
  // confirmed live in public/assets/collision.json) — see COLLISION_ALIAS
  // (collision.ts) for why THIS id still resolves to that same voxel data even
  // though it isn't the generic `gen_16_l302721` id the voxelizer keyed it
  // under. Priced/gated alongside the Drawbridge Front above, its natural
  // sibling (both are "a whole castle front", not a wall segment).
  { id: 'gatehouse_arch', name: 'Gatehouse Arch', thumb: `${P}/arches/16_l302721.png`, model: `${P}/arches/16_l302721.glb`,
    category: 'prefab', size: [1.4, 4.34, 4.2], snap: GRID, stackable: false,
    cost: { stone: 18, iron_bar: 2 }, buildXp: 55, requiresUnlock: 'keep' },
  // its shorter sibling (2.52m, arch only — the lab charts no portcullis
  // sub-mesh on this one, `part_roles.json`'s `14_l302720` is a single plain
  // "body" part) — a cheaper, ungated decor promotion rather than a second
  // gatehouse.
  { id: 'garden_arch', name: 'Garden Arch', thumb: `${P}/arches/14_l302720.png`, model: `${P}/arches/14_l302720.glb`,
    category: 'decor', size: [1.4, 2.52, 4.2], snap: GRID, stackable: false,
    cost: { stone: 6 }, buildXp: 15 },
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
  // Wave 29 · unused-asset audit (item 3). The catalog's raw "Destructor"
  // tag names exactly 4 explosive-charge models; the first 3 were already
  // wired above as l248901/l473801/l394101. `l4105278` is the 4th — fully
  // lab-verified (capabilities.json: kind:'explosive', isExplosive,
  // damagesWalls, damagesVehicles — the same trait shape as its 3 wired
  // siblings) and already appears once as static set-dressing at
  // template-05 (mapPopulation.generated.json), but was never offered to
  // the player. Its real bbox reads flat and low (16.007×3.2×8.0 raw at the
  // family's own k=0.05 -> 0.8×0.16×0.4m), distinct from the barrel/chest/
  // upright-charge shapes already used — a buried mine, not a standing keg.
  { id: 'l4105278', name: 'Powder Mine', thumb: `${L}/l4105278.png`, model: `${L}/l4105278.glb`,
    category: 'siege', size: [0.8, 0.16, 0.4], snap: 1, stackable: false,
    cost: { wood: 1, stone: 1 }, buildXp: 8, requiresUnlock: 'smithing' },
  // Wave 29 · the genuinely distinct, unused second cannon (NOT the "Cannon"/
  // "Wall Cannon" pair — those two are byte-identical files used twice, see
  // this wave's own research). `gen_12_l3207401` sat generically catalogued
  // as "Ornament 4×9" the whole time; the rig lab (part_roles.json) charts a
  // real cannon rig on it — base/barrel/plunger parts, `rigClass: 'cannon'`,
  // status 'verified' — but capabilities.json's own entry for it never got
  // updated to match (still generic `kind:'workshop'`), so nothing in the
  // game recognized it. `labCapabilities.ts`'s LOCAL_OVERRIDES (this wave)
  // fixes that AND gives it a `traits.vehicle`-shaped capability (kind
  // 'vehicle', not 'wall') — verified live that the existing 'wall'-kind
  // shape c3_cannon/oc6096b4 both use is NEVER actually read by labCanFire
  // (it checks `traits.vehicle.canFire`/`interaction.canFire` only; neither
  // cannon capability entry sets either), so mirroring THAT shape here would
  // have promoted a second cannon that silently never fires, same as its
  // 50KB-smaller original — see that module's own comment for the full
  // finding and the (also fixed, as a bonus) oc6096b4/c3_cannon patch.
  // A smaller mesh than Wall Cannon (50KB vs 194KB, confirmed by file size)
  // reads as a compact alternative, priced and sized to match — its own
  // real bricks.generated.json bbox, not the wall-family's k=0.05 (this is
  // a 'siege'-category promotion, not a wall piece needing GRID alignment).
  { id: 'signal_cannon', name: 'Signal Cannon', thumb: `${P}/castle_accessories/12_l3207401.png`, model: `${P}/castle_accessories/12_l3207401.glb`,
    category: 'siege', size: [1.4, 2.03, 2.975], snap: GRID, stackable: false,
    cost: { stone: 4, iron_bar: 1 }, buildXp: 24, requiresUnlock: 'smithing' },
  // Wave 35 (G3) · three dormant manual-turret structures, zero-referenced
  // anywhere in src/ before this — the exact `labCanFire`/`labCanOccupy`
  // Signal Cannon mechanism above, wired for three more real pieces via
  // labCapabilities.ts's WALL_FIRE_OVERRIDES (they're `kind:'wall'`, so the
  // fire capability needed the same additive `traits.vehicle` fix). Sizes
  // are bricks.generated.json's own real bbox for each, held verbatim —
  // same precedent as Signal Cannon's own note just above.
  //
  // oc6098b1 fires as an ordinary catapult (its rig's `catapult_arm`/
  // `catapult_stone` roles ARE recognized by RiggedProp) — its second,
  // distinct `hasChestLauncher`/`canLaunchChest` payload mechanism is real
  // data but genuinely unbuilt this wave: no `chest_arm`/`chest_basket`
  // role exists in RiggedProp's THROW_ROLES/THROW_FOLLOWERS, and
  // siege.ts's fireCannon() only ever spawns a stone Cannonball — wiring a
  // second projectile type and a chest-throw animation is new renderer/
  // projectile code, out of scope for a capability-wiring wave.
  { id: 'oc6098b1', name: 'Catapult Turret', thumb: `${B}/oc6098b1.png`, model: `${B}/oc6098b1.glb`,
    category: 'siege', size: [7.871, 6.16, 4.625], snap: GRID, stackable: false,
    cost: { wood: 14, plank: 8, iron_bar: 2 }, buildXp: 58, requiresUnlock: 'smithing' },
  // oc6098b2 is data-confirmed the CENTERPIECE of the same `oc6098`
  // castle set as the four G4 corner towers above (`castleSet:'oc6098'`,
  // `placement:'center_on_base_plate'`) — a real, distinct fire-capable
  // turret in its own right, kept in Siege rather than folded into the
  // Walls-category corner family since it isn't a corner.
  { id: 'oc6098b2', name: 'Castle Centerpiece', thumb: `${B}/oc6098b2.png`, model: `${B}/oc6098b2.glb`,
    category: 'siege', size: [8.4, 11.62, 7.35], snap: GRID, stackable: false,
    cost: { stone: 14, plank: 8, iron_bar: 3 }, buildXp: 70, requiresUnlock: 'smithing' },
  // oc6032b1 has no part_roles.json rig at all (no arm/bolt animation), and
  // its "hasCrossbows" is inferred from `sockets.weapon_A/weapon_B:
  // 'crossbow'` rather than a named lab flag — the model visibly carries
  // two crossbows, which is the real evidence this promotion rests on. Its
  // `hasThroneSeat`/`canUseAsTurret` shape becomes the SECOND
  // `occupyMode:'seated'` piece in the game (labCapabilities.ts).
  { id: 'oc6032b1', name: 'Throne Turret', thumb: `${B}/oc6032b1.png`, model: `${B}/oc6032b1.glb`,
    category: 'siege', size: [4.55, 4.681, 2.339], snap: GRID, stackable: false,
    cost: { stone: 6, wood: 6, iron_bar: 2 }, buildXp: 38, requiresUnlock: 'smithing' },
  // Wave 35 (G5) · two dormant siege VEHICLES (kind:'vehicle', not 'wall'),
  // zero-referenced anywhere in src/ — but pushable/hitchable rather than
  // fire-and-forget. Their `traits.vehicle.canDrive`/`canPush` is the
  // generic AUTO-SEEDED shape every `kind:'vehicle'` asset gets (verified
  // live: byte-identical to warcart/bladecart's own capability entries),
  // not a real per-asset signal, and "driving" has zero functional
  // consumers anywhere in this codebase (game/crew.ts's own comment: the
  // real siege engines are all `canDrive:false`). So these wire into the
  // exact same hardcoded push_cart/hitch_cart mechanism warcart/bladecart
  // already use (PlayerController.tsx) rather than a new "driving"
  // mechanic — oc6096-1 has a literal battering_head/ram_horns rig, so it
  // pushes; oc6032b3 is a mobile catapult/crossbow rig, not a ram, so it
  // hitches (fireable-while-stationary is a real, separate future item, not
  // built here). Both sit in `category:'defense'` alongside warcart/
  // bladecart — the actual push/hitch precedent — rather than 'siege',
  // where no other pushable piece lives.
  //
  // No bricks.generated.json entry exists for either (never ran through
  // that pipeline) — sizes computed directly from real OBJ vertex bounds at
  // this family's own k=0.05 (objrig/oc6096-1.obj raw 197.08×237.08×86.40;
  // oc6032b3 raw 92.80×69.33×124.00), the same scale convention validated
  // against oc6096-3/oc6096-4/oc1289's own declared sizes above.
  { id: 'oc6096-1', name: 'Siege Ram Tower', thumb: `${L}/oc6096-1.png`, model: `${L}/oc6096-1.glb`,
    category: 'defense', size: [9.85, 11.85, 4.32], snap: GRID, stackable: false,
    cost: { wood: 26, plank: 16, iron_bar: 5 }, buildXp: 95, requiresUnlock: 'keep' },
  { id: 'oc6032b3', name: 'Mobile Mangonel', thumb: `${L}/oc6032b3.png`, model: `${L}/oc6032b3.glb`,
    category: 'defense', size: [4.64, 3.47, 6.2], snap: GRID, stackable: false,
    cost: { wood: 14, plank: 8, iron_bar: 3 }, buildXp: 55, requiresUnlock: 'smithing' },
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

/** structural HP, derived from a piece's own resource cost — pricier
 *  structures (the keep, stone walls) shrug off far more than a cheap
 *  torch or a single brick before siege damage reduces them to rubble. */
export function maxHpFor(type: string): number {
  const b = BUILDABLE_BY_ID[type];
  if (!b) return 20;
  const totalCost = Object.values(b.cost).reduce((s: number, n) => s + (n ?? 0), 0);
  return Math.max(15, Math.round(totalCost * 3));
}
