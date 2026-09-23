// World-scoped types: buildings, resource/cultivated ground, water features,
// settlements/caravans, blueprints, and the traveling merchant's market
// state. Split out of the former monolithic game/types.ts (CLN-08).
//
// `RectSection` and `MarketEntry` are DEFINED here rather than in
// data/grounds.ts / data/trade.ts, which is a real move, not just a file
// split: those two data modules previously owned the canonical shape and
// game/types.ts imported it back — the actual edge in the reported 6-file
// cycle (data/grounds.ts -> data/buildables.ts -> game/types.ts, closed by
// game/types.ts -> data/grounds.ts). Every existing consumer of either type
// keeps importing it from '@/game/data/grounds' / '@/game/data/trade' —
// those files now `import type` from here and re-export, so zero call sites
// outside this split had to change.
import type { ItemId } from './core';

/**
 * Empire arc, Wave 5 · the rectangle a resource cluster seeds inside, split
 * out of `Ground` so a cultivated plot (`CultivatedPlot` below) is the same
 * shape without inheriting the deed ladder — a plot is worked because you
 * planted it, not because a tier bought it. Everything that reasons about the
 * rectangle (the scatter in gameStore's scatterNodesInRect, data/grounds.ts's
 * overlap assertions, Grounds.tsx's fence run) takes one of these, so grounds
 * and plots can never drift apart on geometry.
 */
export interface RectSection {
  /** what seeds here */
  kind: 'tree' | 'rock' | 'herb';
  /** rock sections can be plain stone or the iron variant */
  variant?: 'iron';
  /** centre, and half-extents — sections are RECTANGULAR pieces on the same
   *  grid the homestead builds on, not circles. A circle cannot be checked
   *  against a square build region without leaving slivers, and its edge cuts
   *  across build tiles so a node could seed on half a square. */
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  /** how many nodes seed inside it */
  count: number;
  /** may seed inside the pond's shore ring. Only the Home Grove sets this:
   *  it is deliberately pond-adjacent (its own flavour text is written around
   *  that walk) and some of its candidates genuinely fall in the ring the
   *  scatter otherwise keeps clear. Was a literal `g.id !== 'grove'` test
   *  inside seedNodes before the scatter became section-driven. */
  pondShore?: boolean;
}

export interface Buildable {
  id: string;
  name: string;
  icon?: string;      // emoji fallback
  thumb?: string;     // asset thumbnail url
  model?: string;     // glb url; procedural if absent
  category: 'essentials' | 'defense' | 'bricks' | 'decor' | 'castle' | 'walls' | 'prefab' | 'siege';
  size: [number, number, number]; // world meters (width, height, depth) at rotation 0
  snap: number;       // placement grid pitch in meters
  stackable: boolean; // may rest on top of other pieces / support pieces above
  cost: Partial<Record<ItemId, number>>;
  requiresUnlock?: string;
  station?: 'workbench' | 'forge' | 'campfire'; // marks placed object as a crafting station
  buildXp: number;
  /** Wave 29 · a hand-picked bill of real bricks.generated.json catalogue
   *  SKUs (each `qty` at that piece's own real cost) whose costs SUM EXACTLY
   *  to this buildable's own `cost` above — "2× Wall Section 2×5, 2× Tower
   *  Piece 2×2" instead of one generic family total. Display-only: `cost` is
   *  still the sole economy truth (canAfford/addItems/refunds/maxHpFor all
   *  read it unchanged), and only a handful of buildables have one so far —
   *  every ItemId a piece could ever cost by resource FAMILY has a real
   *  catalogue SKU (see brickResources.ts's BRICK_RESOURCES), but the
   *  catalogue itself never authored a SKU costed in `iron_bar`/`iron_ore`/
   *  `flowers`/`gold`, so a buildable priced in any of those has no exact
   *  bill and correctly falls back to the old one-canonical-brick-per-family
   *  display (see buildables.ts's `costBill`) rather than a guessed one. */
  pieces?: { id: string; qty: number }[];
}

/** Wave 9 · which tool the aerial build view's left button is holding.
 *  Wave 12 added 'dig' — the same drag-a-rectangle gesture as 'demolish', but
 *  it cuts a waterway instead of taking pieces down (see WaterFeature). */
export type BuildTool = 'build' | 'demolish' | 'dig';

/** Wave 9 · an axis-aligned patch of ground in world metres, dragged out in
 *  build mode. Used by the area-demolish marquee; deliberately plain data so
 *  the drag (BuildController) and the confirmation (BuildBar) can be in two
 *  different components without either owning the other. */
export interface BuildRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** something that lives in a specific instance (the homestead, or a
 *  settlement/claimed destination) via an optional `world` id — every
 *  per-instance system (villager recruitment, taxes, raid triggers, the
 *  builder/merchant/bed-seek passes, per-world labour) should filter through
 *  `isHome`/`inWorld` below rather than re-deriving the `?? null` comparison
 *  by hand at each call site. New in CLN-08 — existing call sites keep their
 *  own inline `(x.world ?? null) === ...` checks for now and can migrate to
 *  these incrementally; both read identically. */
export interface WorldScoped {
  world?: string | null;
}

/** true for a homestead-scoped entity (world absent/null) */
export function isHome(x: WorldScoped): boolean {
  return (x.world ?? null) === null;
}

/** true when `x` belongs to the given world/destination id (null/undefined
 *  both mean "the homestead", matching every existing `world?: string|null`
 *  field's own convention) */
export function inWorld(x: WorldScoped, world: string | null | undefined): boolean {
  return (x.world ?? null) === (world ?? null);
}

export interface PlacedBuilding extends WorldScoped {
  id: string;
  type: string;      // buildable id
  x: number;         // world position (grid-snapped)
  z: number;
  y?: number;        // base elevation (stacking); 0 / undefined = on the ground
  rot: 0 | 1 | 2 | 3; // quarter turns
  /** Wave 9 freeform mode: the piece's TRUE facing in radians, when it was set
   *  down off the quarter-turn lattice. Absent (every snapped piece, and every
   *  save written before Wave 9) means `rot * PI/2` exactly, so nothing older
   *  changes.
   *
   *  Deliberately a SECOND field rather than widening `rot` to a plain number:
   *  every footprint/overlap test in the game (evalPlacement's AABB check,
   *  sizeFor's width/depth swap, walls.ts's attach points, collisionShapes'
   *  boxes) is axis-aligned and only stays correct because rotation is a
   *  multiple of 90°. So `rot` remains the piece's collision truth — rounded to
   *  the nearest quarter turn — and `yaw` is what it LOOKS like. A piece turned
   *  35° therefore stops you along its nearest square footprint; that is the
   *  honest cost of freeform placement without an oriented-box collision
   *  system, and it is why freeform is off by default and aimed at decor. */
  yaw?: number;
  /** Wave 51 (C6) freeform mode: a purely-visual per-instance size multiplier,
   *  set alongside `yaw` by the same mode. Absent (every non-freeform
   *  placement, and every save written before Wave 51) means 1 — the piece's
   *  catalogue size exactly — so nothing older changes.
   *
   *  Deliberately the SAME shape `yaw` already is, for the SAME reason: every
   *  footprint/overlap/collision test in the game (evalPlacement, sizeFor,
   *  collisionBoxesFor, buildingsInRect) reads the catalogue's fixed `size`
   *  and stays that way — `scale` never reaches any of them. A piece scaled
   *  up therefore looks bigger than what actually blocks movement/placement
   *  around it, and a piece scaled down still occupies its full catalogue
   *  footprint; that is the honest cost of freeform resizing without a
   *  second, scaled collision system, and it is why this — like `yaw` — is
   *  visual-only and lives in the same off-by-default freeform mode. */
  scale?: number;
  /** Phase 19 build-then-construct: 0..1 construction progress. Absent = 1
   *  (fully built), so every building from an older save just works. */
  built?: number;
  /** Wave 57 (F5): true while this entry is a dragon-fire ruin rather than a
   *  fresh construction site — both reuse the exact same `built<1` state
   *  (see damageBuilding's own leaveRuin branch), so this is the ONE extra
   *  bit that distinguishes "burned back down, rebuild for free" from
   *  "never finished yet". Cleared the moment constructBuilding brings
   *  `built` back to 1; absent/false for every ordinary construction site
   *  and every older save. */
  ruin?: boolean;
  /** which instance this stands in — a claimed template-world plot's own
   *  destination id, or absent/null for the homestead. Every destination's
   *  real coordinates sit far apart in one shared space (see the
   *  instance-separation doctrine), so anything placed at a remote plot
   *  MUST carry this or it renders everywhere at once, including the sky
   *  above the homestead (buildings have no terrain to sit "inside" from a
   *  distant viewer's angle). Older saves (pre-field) implicitly mean home. */
  world?: string | null;
  /** Requested 2026-07-30: "beds... should be exclusively owned by one
   *  villager, no other npc can take their place." Meaningful only for
   *  `type: 'bed'` — the villager id who has claimed it (see
   *  `gameStore.claimBed`). Absent/null = unclaimed. Freed only by
   *  demolishing the bed; villagers are never removed from the roster once
   *  recruited, so that is the only real release path. */
  owner?: string | null;
}

/** a piece counts as real (interactable, standable, functional) only once
 *  its construction finished — absent `built` means a pre-Phase-19 save */
export function isBuilt(b: PlacedBuilding): boolean {
  return (b.built ?? 1) >= 1;
}

/** Wave 8 · a piece that SEALS when shut and lets you through when open.
 *  The Castle Gate was the only one for a long time, so half a dozen systems
 *  (player collision, the nav grid, raider targeting, the battering ram, the
 *  fort ring check) each hardcoded `type === 'gate'`. The Portcullis
 *  (buildables.ts's `door` entry — named for what its mold actually is, a
 *  barred lattice, not a plain hollow doorway) is mechanically the same thing
 *  at a smaller size, and shares `gateOpen` rather than growing a parallel
 *  `doorOpen` record — one predicate here means a future piece of this same
 *  shape reaches all of them by being added once.
 *
 *  Wave 24 · that future piece arrived: `window` (buildables.ts, the
 *  windows_doors 14/16_l4532xx open/closed shutter pair). A closed window is
 *  now a solid obstacle box the same way a wall is — the shared
 *  `forEachObstacleBox` (navgrid.ts) skips it exactly like an open door/gate
 *  when it's open, so `hasLineOfSight` inherits the block-when-shut,
 *  see-through-when-open rule for free, and so does every other consumer
 *  listed above. Kept out of `isRampart` (walls.ts) on purpose by its own
 *  declared height, not by anything here — a window furnishing doesn't need
 *  to independently seal/breach the defense ring. */
export function isDoorLike(type: string): boolean {
  return type === 'gate' || type === 'door' || type === 'window';
}

/** true for a homestead building (world absent/null) — every homestead-only
 *  system (villager recruitment, taxes, raid triggers, the builder/merchant/
 *  bed-seek passes) should filter through this so a remote claimed-plot
 *  structure never counts toward or interferes with home-only mechanics. */
export function isHomeBuilding(b: PlacedBuilding): boolean {
  return (b.world ?? null) === null;
}

export interface ResourceNodeState extends WorldScoped {
  id: string;
  kind: 'tree' | 'rock' | 'fishing' | 'herb';
  variant?: 'iron'; // iron-vein boulders guarantee ore
  model?: string;
  x: number;
  z: number;
  scale: number;
  yaw: number;
  hitsLeft: number;
  respawnAt: number | null; // epoch ms when it comes back, null = alive
  /** J46 · the named ground this node seeded in (game/data/grounds.ts), or
   *  Wave 5's cultivated-plot id. Absent on saves from before grounds existed
   *  and on the open-water fishing spot, both of which are worked without a
   *  deed. A plot id is deliberately NOT in GROUND_BY_ID, so the deed lock in
   *  findTarget() never fires on something you planted yourself. */
  ground?: string;
  /** Empire arc, Wave 5: which instance this node stands in — a settlement's
   *  own destination id, or absent/null for the homestead. Mirrors
   *  `PlacedBuilding.world`/`Villager.world`'s instance-separation doctrine
   *  exactly; without it ResourceNodes.tsx drew (and instanced) every node in
   *  the world no matter where the player stood. */
  world?: string | null;
}

/** Empire arc, Wave 5 · a piece of ground you cleared and planted yourself.
 *  Same rectangle as a resource ground (RectSection), but earned by work
 *  rather than by a deed: it starts nearly bare and thickens a stage at a
 *  time as it is watered, seeding ordinary ResourceNodeState entries that
 *  chop/mine/forage through the existing harvest path unchanged.
 *  `stage`/`plantedAt`/`lastWateredAt` are LIVE state and only mean anything
 *  on a record inside `cultivatedPlots` — the hand-authored table in
 *  data/cultivatedPlots.ts carries placeholders for them. */
export interface CultivatedPlot extends RectSection, WorldScoped {
  id: string;
  /** absent/null = the homestead, same convention as PlacedBuilding.world */
  world?: string | null;
  /** 0 = just cleared and planted, climbing toward MAX_PLOT_STAGE */
  stage: number;
  plantedAt: number;      // epoch ms
  lastWateredAt: number | null;
}

/**
 * Wave 12 · a body of water the PLAYER cut into the homestead — a pond, a
 * stretch of river, or one side of a moat. Persisted; the static POND is not
 * one of these (it is world geography, declared in data/world.ts).
 *
 * An axis-aligned rectangle, not a circle, and that is the load-bearing
 * decision of the whole feature. `TerrainExclusion` already supports both
 * shapes at no schema cost, and the one water body in the game before this was
 * a circle — but a circle can only ever be a pond. A rectangle is all three
 * things the request asked for: one is a pond, a long thin one is a river or a
 * canal, and four round a keep are a moat. One drag gesture, one shape, and
 * the shape composes, which is what makes freeform unnecessary here rather
 * than merely out of budget.
 *
 * Home only today (there is no `world` field on purpose): the homestead is the
 * one region whose ground is genuinely flat at y=0, and a flat basin cut into
 * a template bake's real slope would hang in the air at one end. The refusal
 * lives in the store's `digPreview`, alongside the rest of the checks that need
 * to know which world you are standing in; `terrainConflict`
 * (game/waterworks.ts) holds the ones that are pure geometry.
 */
export interface WaterFeature {
  id: string;
  /** centre, world metres — always on the build grid (GRID = 2) */
  x: number;
  z: number;
  /** half-extents, world metres — always a whole number of grid cells */
  halfX: number;
  halfZ: number;
  /** gold paid to cut it, kept so filling it in can hand half of that back
   *  without re-deriving a price that may since have been rebalanced */
  paid: number;
}

/** Empire arc, Wave 4 · a founded settlement's own record, keyed by
 *  destination id in `SaveGame.settlements`/GameState.settlements.
 *  `since`/`lastCollectedAt` are both epoch ms; `lastCollectedAt` starts
 *  equal to `since` (no backlog owed on day one). Promoted from a repeated
 *  anonymous inline type (gameStore.ts and this file used to each spell out
 *  the same shape by hand) to one real interface when Wave 47 (B5/B7) had
 *  to touch both anyway. */
export interface Settlement {
  since: number;
  lastCollectedAt: number;
  /** Wave 47 (B5) · epoch ms this settlement last had a rival raid resolve
   *  (win OR loss) — absent means never raided. settlementRaidCooldownMs's
   *  own trigger falls back to `since` when this is absent, so a freshly
   *  founded settlement isn't instantly raidable the moment it's filed. */
  lastRaidAt?: number;
  /** Wave 47 (B7) · real, permanent yield-tier milestones earned by closing
   *  a settlement's own defend->expand quest link (see
   *  data/settlementQuests.ts's SETTLEMENT_GROWTH_QUEST_DEST) — absent = 0.
   *  Read by collectSettlementYield's own amount formula (gameStore.ts). */
  growthTier?: number;
}

/**
 * Wave 27 · one in-flight Trade Caravan run between two owned settlements
 * (see data/caravan.ts's own header for why this is a wall-clock
 * abstraction, not a physically-simulated journey — no entity survives a
 * travelTo() scene-swap). `from`/`to` are destination ids (data/worlds.ts);
 * the caravan runs `from` -> `to`, but can be collected from either
 * settlement's own resident once `etaMs` has elapsed since `departedAt`.
 * Keyed in `SaveGame.caravans` by `caravanRouteKey(from, to)` (a sorted
 * pair), so only one run can ever be in flight per route at a time,
 * regardless of which direction it was dispatched.
 */
export interface CaravanRun {
  from: string;
  to: string;
  item: ItemId;
  amount: number;
  /** escort fee paid up front (CARAVAN_INSURANCE_RATE) — guarantees no loss
   *  from the risk roll on collection. */
  insured: boolean;
  departedAt: number;
  etaMs: number;
}

/** a claimed template-world building plot: centered wherever the player
 *  stood when they claimed it, leveled to that one sampled ground height */
export interface ClaimedPlot {
  x: number;
  z: number;
  groundY: number;
}

export interface BlueprintPiece {
  type: string;
  dx: number;
  dz: number;
  rot: 0 | 1 | 2 | 3;
}

export interface Blueprint {
  id: string;
  name: string;
  pieces: BlueprintPiece[];
  starter?: boolean;
}

/**
 * Traveling merchant / market-stall pricing pressure for one item — moved
 * here from data/trade.ts (CLN-08) for the same reason RectSection moved out
 * of data/grounds.ts: this is the shape SaveGame.marketState persists, and
 * data/trade.ts now `import type`s it back rather than owning it, closing
 * the game/types.ts <-> data/trade.ts edge in the reported import cycle.
 */
export interface MarketEntry {
  /** signed supply/demand pressure, clamped to [-1, 1]; 0 = baseline */
  level: number;
  /** epoch ms of the last trade that moved this item's level */
  lastTradeAt: number;
}
