# Phase 2 — Navigation, and the resource-gathering loop

**rev 3 — consolidated. Replaces rev 1, rev 2 and Addendum A entirely.**
`PHASE_2_NAVIGATION_AND_GATHERING_rev2.md` and `ADDENDUM_A.md` are deleted;
this file occupies the plain filename every prompt already names.
Supersedes `NPC_AI_SPEC.md` §7 in full — ignore §7. Four small corrections
against current code folded in 2026-07-27 — see the "Correction:" callouts
in §2.0 and §2.3, and `PHASE_STATUS.md`'s Phase 2 section for the summary.

**Section phases.**

| Section | Phase | Verifiable when |
|---|---|---|
| §2 Navigation | **2** | now |
| §3.1 Target model, §3.2 anchors | **2** (registry, resolution) / 4 (rules) | registry testable now |
| §3.3–3.6 Actions, activities, animation | **4–5** | after the reasoner lands |
| §3.7 Verification | **5** | after the reasoner lands |
| §4 Economy authority | **5** | after the reasoner lands |

---

## 0. Decision: extend `navgrid`, do not adopt navcat

The world is player-mutable at runtime. A navmesh means either full
regeneration on every change (multi-second stall) or a tile cache with a second
obstacle representation maintained alongside `collisionBoxesFor()`. The grid's
derived-from-real-collision property — one source of truth, shared with player
collision — is worth more than anything navcat offers here.

Verified in code: `WALK_LOW = 0.55` / `WALK_HIGH = 1.7` are real, and
`collisionBoxesFor` genuinely is the sole obstacle source.

**The decisive argument is stronger than "player-mutable."** Buildings are
destroyed *during combat*: cannon rounds do splash damage to any structure in
the blast and collapse it to rubble, raiders arrive with battering rams that
splinter gates, and the player's own pushable ram damages structures. So
`rebuildNav` runs **mid-raid**, at exactly the moment frame budget is tightest
and a dozen agents are actively pathing. Re-voxelising a 12.5k-cell bitfield is
microseconds. A navmesh tile rebuild at that moment is a hitch during the most
demanding scene in the game. This is not a hypothetical future requirement; it
is shipped behaviour.

A third context reinforces it: **the Sealed Crypt** is a procedural dungeon
regenerated fresh on every visit. Nothing can be baked for it, ever. A grid
rebuilt at generation time handles it for free.

### 0.1 The flip trigger is closer than it looks — index cells by layer now

Rev 2 listed "walkable multi-level interiors" as the one thing that would flip
this decision and deferred it. **It is already shipped for the player:** you can
build brick staircases up your walls, stand on the battlements, and duck under
raised pieces, and firing a bow from on top of a wall is a real combat bonus.
That is two walkable surfaces at the same (x, z), today.

NPCs don't use it yet. But "put defenders on the battlements during a raid" is
one design decision away in a castle game whose raids are a headline feature,
and retrofitting a layer dimension into a shipped grid is a rewrite.

**So: index cells as `(i, j, layer)` from the start.** Phase 2 populates layer 0
only — ground — and every query defaults to it. The cost now is an index
function and a stride; the cost later, if it isn't done, is redoing navigation.

This does *not* change the navcat verdict. When layers become real, build them
as stacked grids joined by stair links, which stays cheaper than a navmesh and
keeps the derived-from-collision property. Revisit only if that proves false.

**Migration safety, verified:** only `Villagers.tsx` and `Npc.tsx` call
`navSteer`; both are home-only (`Npc`'s call is gated on `!def.world`), and
`Enemies.tsx` steers straight. No existing caller can be silently repointed at
the wrong grid once `agent.region` is read. **Re-run this audit if a third
caller appears.**

---

## 1. Known-wrong assumptions, resolved

| Assumed | Reality | Handled in |
|---|---|---|
| harvestables are buildings | `st.nodes: ResourceNodeState[]`, kinds `tree \| rock \| fishing \| herb`, `hitsLeft` / `respawnAt` | §3.1 |
| `collisionBoxesFor` needs a region arg | takes `(type, rot)`, local-frame, region-independent; hardcoding is `rebuildNav`'s `isHomeBuilding` filter + module-level `Uint8Array` from `HALF = 56` | §2.2 |
| nodes deplete permanently | temporarily — `respawnAt !== null` is dead-for-now | §3.5 |
| water is non-walkable | **walkable** — pond is terrain, not a building, so it never enters the obstacle set | §2.1 |
| nodes carry a region | **they don't** — home-only by construction | §1.1 |
| content-bounding can size destination grids | fails for unclaimed destinations (empty AABB) | §2.0 |
| `built >= 1` tests completeness | `built?: number`, absent = complete; use `isBuilt(b)` = `(b.built ?? 1) >= 1` | §3.1 |
| `st.resources` | it is `st.inventory`, written via `addItems()` | §4 |
| an offline height bake is viable | must replicate `normalizeTemplateBake` (×0.32 + bbox recentre), **and `scripts/` is not in the repo at all** | §2.3 |
| multi-level is hypothetical | already shipped for the player | §0.1 |

### 1.1 Nodes are home-only — state this, don't discover it

`ResourceNodeState` has no `world` field, while `PlacedBuilding` has
`world?: string | null`. Consequences:

- `Target.region` is hardcoded `null` for every node (§3.1).
- **There are zero harvestables at any destination.** Gathering there is
  impossible until nodes gain a region field. That is a product decision, not a
  bug — but phase 5 must not be planned as though destination gathering works.

Still open, not mine to decide: whether `farmplot` yields a carryable resource
or is maintenance-only, and what `merchant → market_stall` does. Both are in the
job map; neither is a `ResourceNodeState`. `farmplot` stays behind a config flag
in §3.4 until settled.

---

## 2. Phase 2 work items

### 2.0 Grid extent — three modes, not one

Rev 2 proposed bounding destination grids to their content AABB. That fails
exactly where it is needed: an unclaimed destination has no nodes (§1.1) and no
player buildings (a plot only exists after planting a claim flag), so the AABB
is empty and it falls back to `radius`.

**Correction, checked against the full list (rev 3 cited only the first two
entries):** the nine templates' declared radii actually range **213–352**, not
224–245 — `template-04` (Siege Camp) is 293, `template-09` (Far Meadow) is 352.
template-09 is excluded from this concern; it is the home terrain now, not a
travel destination (see `PROJECT_CONTEXT.md`'s instance-separation note). So
the real worst case among the eight real destinations is 293 → 586×586 =
343,396 cells, not 200,704 — the content-bounding rejection above is *more*
correct than the original number made it look, not less.

| Context | Mode | Extent | Cells |
|---|---|---|---|
| home | **fixed** (existing) | `DIM = 112`, origin-centred | 12,544 |
| destination | **window** | 96 m, follows the player | 9,216 |
| Sealed Crypt | **fixed** | dungeon bounds at generation time | varies, modest |

Keep `cellSize: 1.0` everywhere — at these counts there is no reason to
coarsen, which retires rev 2's `cellSize: 2.0` proposal and its fidelity caveat.

**Window mode.** Recentre with hysteresis: rebuild when the player moves more
than a quarter window (24 m) from centre.

**Correction: the stated justification for 96 m does not hold.** Rev 3 claimed
it "exceeds the LOD tier-A/B radius." Checked against the actual
`src/ai/config/lod.json`: tier B has **no outer radius at all** — it is
frustum-only (`nearDistance: 15` is the A/B split; anything farther but still
in frustum is B, unbounded). So in an open destination, a tier-B agent (wants
full steering) can legitimately be 90 m away and still past a 48 m half-window
edge. Two ways to actually close this, pick one before implementing:

1. Add an explicit outer radius to tier B in `lod.json` (e.g. 48 m, matching
   the window), so an agent beyond it demotes to tier C (simplified steering,
   which path-chaining already degrades to gracefully) — the two configs then
   agree by construction instead of by two people remembering to keep them in
   sync.
2. Keep tier B unbounded and accept that a distant-but-visible agent
   occasionally steers off stale path-chain data until the next recentre —
   bounded by `recentreAt`, so the staleness window is small, but real.

(1) is recommended: it is a one-line config change, and it is the same
"derive the number, don't duplicate it" principle §2.3 already applies to
ground height.

**Paths beyond the window** use path-chaining: target the window-edge cell
minimising `travelled + straightLineRemainder`, re-request after recentre.

**Do not use window mode for home or the Crypt.** Path-chaining fails against
concavity larger than the window, and both are concave — home from dense
building placement, the Crypt explicitly so, being a chain of stone chambers
joined by real corridors. Destination dioramas are open terrain, which is the
only place chaining is safe.

**Correction: "the Crypt's bounds are known at generation time" is true, but
not from where this implied.** `WORLD_DESTINATIONS` carries a static
`radius: 140` entry for `id: 'dungeon'` — the same field every other
destination has, used for the player's wander clamp. That is **not** the
navigable shape. The real layout comes from `game/dungeon.ts`: 4–6 combat
rooms plus a boss room, procedurally placed and corridor-joined per
`generateDungeonLayout`'s seed, a different footprint every descent. Size the fixed
grid from the *actual generated layout* — an AABB over `layout.rooms[]` after
generation, padded by a few metres — not from the static 140, which would
either waste cells around a small layout or clip a large one. Rebuild on each
descent either way, since the seed (and therefore the shape) changes every
time.

```json
// src/ai/config/navgrid.json
{
  "home":        { "mode": "fixed",  "halfExtent": 56, "cellSize": 1.0 },
  "destination": { "mode": "window", "windowHalf": 48, "cellSize": 1.0,
                   "recentreAt": 24, "maxStep": 0.6 },
  "crypt":       { "mode": "fixed",  "boundsFrom": "generator", "cellSize": 1.0 }
}
```

Surface `cellCount` and grid origin in the debug overlay.

### 2.1 Water and terrain traversal — new, and blocking

`navgrid` derives obstacles solely from `collisionBoxesFor(b.type, b.rot)` over
buildings. The pond is terrain (`Terrain.tsx` / `POND`), never a building, so
water cells are open. **Any path may route straight across water.** This is a
pre-existing hole that phase 2 exposes the moment an agent crosses the map, and
it must close before §3.2's fishing anchors mean anything — `nearestWalkable`
will otherwise confidently return a cell mid-pond.

**On the tension with §0.** This is a second obstacle source, and §0 rejected
navcat partly to avoid one. The difference is real and worth stating rather than
glossing: navcat's second source would have been the entire continuously-mutating
building set. This is a handful of static declarative entries covering a category
collision genuinely does not model — traversal *permission* versus physical
collision. The player wades in and fishes the pond by design; villagers should
not path through it. Different questions, correctly different answers.

Keep it disciplined: one leaf file, enumerable, tested.

```ts
// src/game/navTerrain.ts   — leaf module, imports nothing from store or ai
export interface TerrainExclusion {
  id: string;
  region: string | null;
  shape: { kind: 'circle'; x: number; z: number; r: number }
       | { kind: 'aabb';   x: number; z: number; hx: number; hz: number };
  traversal: 'blocked' | 'costly';
  costMultiplier?: number;
}
export const terrainExclusions: TerrainExclusion[];
```

Phase 2 implements `blocked` only; `costly` exists so shallows can be added
later without a schema change. `POND` registers one circle. Grid construction
stamps exclusions in after building obstacles.

**Test for drift:** assert the list is non-empty and that every terrain feature
with a traversal implication has an entry. A hand-maintained list is only safe
if something complains when it falls behind.

**Sizing note for §3.2:** `fishing`'s `fallbackRadius` must exceed the pond
radius, or a centrally-placed fishing node finds no bank. Derive it from the
POND entry rather than hardcoding 6.0.

### 2.2 Region support

Make `navgrid` instantiable. The surgery is `rebuildNav()` and the module-level
`Uint8Array`, not `collisionBoxesFor`.

```ts
export class NavGrid {
  constructor(opts: {
    region: string | null;
    mode: 'fixed' | 'window';
    originX: number; originZ: number;
    halfExtent: number; cellSize: number; maxStep: number;
    layers?: number;                  // default 1 — see §0.1
  });
  rebuild(buildings: PlacedBuilding[]): void;   // no-op unless identity changed
  recentre(x: number, z: number): void;          // window mode only
  findPath(sx, sz, tx, tz, layer?): PathResult;
  isWalkable(x, z, layer?): boolean;
  nearestWalkable(x, z, maxRadius, layer?): { x, z, layer } | null;
  addLink(a, b, opts): LinkId;                   // a/b carry layer
  removeLink(id: LinkId): void;
  readonly cellCount: number;
  readonly originX: number; readonly originZ: number;
}

export function getNavGrid(region: string | null): NavGrid;   // lazy, cached
export function navSteer(agent, tx, tz, dt): { nx, nz, dist };  // UNCHANGED
```

`layer` defaults to 0 everywhere in phase 2. Index cells as
`(layer * DIM * DIM) + (j * DIM) + i` from the start — see §0.1.

`nearestWalkable` is **not new work** — `navgrid` already has `nearestOpen(i, j)`
privately (outward search to r=6). Expose and rename, adding a `maxRadius`
parameter rather than relying on the constant happening to match §3.2's needs.

`navSteer` keeps its exact signature and selects the grid from `agent.region`.
Every existing caller compiles untouched — see §0.

`isHomeBuilding(b)` becomes a per-region predicate.

### 2.3 Ground height — runtime rasterization, one pass

**Do not raycast per cell.** `destinationGroundY` → `sampleTemplateGroundY` →
`raycaster.intersectObject(root, true)` is a recursive raycast against the whole
mounted GLB. Even at the windowed 9,216 cells that is thousands of scene-graph
traversals per recentre.

**Do not bake offline either.** Two independent reasons: a bake would have to
replicate `normalizeTemplateBake`'s ×0.32 scale plus its bbox-derived
recentre/ground, and a duplicated constant drifts silently — and `scripts/` is
excluded from the repository entirely, so the generator would live outside
version control alongside `prepare-assets` and `gen-collision`. Both problems
disappear if the height field derives from already-normalized geometry at
runtime.

**Do this:** on grid build or recentre, traverse the mounted terrain mesh's
index buffer once and rasterize triangles into the height field. O(triangles),
single pass, milliseconds — and because it reads `mountedRoot` *after*
normalization, there is no constant to keep in sync.

**Two things this plan needs that were not called out as required changes:**

1. **`mountedRoot` is not exported.** It is a private module-level ref inside
   `TemplateWorld.tsx`; only `sampleTemplateGroundY`/`destinationGroundY`
   (which close over it) are exported. Add an accessor —
   `export function getMountedRoot(): THREE.Object3D | null` is enough — the
   nav-grid module cannot reach it otherwise.
2. **There is no isolated "terrain mesh."** The mounted bake is one normalized
   scene graph containing terrain *and* whatever buildings/props are baked
   into that template, with no naming convention distinguishing them (checked
   — nothing in the extraction marks a mesh as terrain-specific). "Traverse
   the terrain mesh's index buffer" has to mean "traverse every mesh in the
   bake" in practice. This is not actually a problem: max-Y-per-cell over the
   whole scene gives the same "topmost surface" result the existing raycast
   already relies on (`sampleTemplateGroundY`'s raycast hits whatever is on
   top today, terrain or not) — so this is a **deliberate, existing-precedent
   choice**, not a shortcut: a building's rooftop baked into a template
   becomes walkable ground for ambient agents, same as it already is for the
   ground-height *sample* the player's own footing already uses. State it as
   accepted rather than let it surprise someone later.

- Cells with no triangle coverage **hold the last sampled value**, matching
  `sampleTemplateGroundY`'s existing behaviour. Addendum A said mark them
  non-walkable; that diverged from the game and is withdrawn.
- No terrain mesh found → flat, skip step checks entirely.
- Home is flat: no height field, no buffer, no step checks.

`maxStep` (0.6 m) then unlinks neighbour pairs whose `|Δy|` exceeds it, on exact
per-cell heights. Note this is deliberately just above the player's ~0.55 m step
height, so agent traversal matches what the player can climb.

**Explicitly rejected: coarse sampling with bilinear interpolation.** Smoothing
across a sample span erases the discontinuities `maxStep` exists to detect — a
3 m cliff becomes a ramp, the unlink never fires, and agents path up vertical
faces. That is the exact failure §2.5's cliff test catches, and it would be
traded away knowingly.

### 2.4 Search internals and links

**Binary heap** on `f` with an index map for decrease-key. ~40 lines.

**Generation-stamped search arrays.** Do not allocate or clear
`g`/`f`/`parent`/`closed` per search. Allocate once per grid; keep
`stamp: Uint32Array` and a monotonic `searchId`; a cell is unvisited iff
`stamp[i] !== searchId`. Clearing is `searchId++`. This matters more than the
heap does, because `rebuildNav` and repathing both spike during raids (§0).

**Resumable searches** are now optional rather than load-bearing — 9k-cell grids
complete well inside a frame budget. Keep the per-frame expansion cap (4000) as
a guard; if it trips at this grid size, something else is wrong.

**Links:**

```ts
addLink(a: Cell, b: Cell, {
  cost: number; bidirectional: boolean; tag: string;
  clip?: string; duration?: number;
})
```

A `Map<cellIndex, Link[]>` consulted during neighbour expansion; paths carry
`{ kind: 'link', linkId, clip, duration }` markers. Not needed for gathering —
build the API, leave it unused. It is what stair links between layers (§0.1)
and gate traversal will both use.

### 2.5 Verification (phase 2, runnable now)

Smoke tests via `window.__kkai` / `__kk`. Assert **direction of change**, not
arrival — headless runs ~8 fps with clamped `dt`, so real time is ~2.4× game
time.

**Note: the smoke-test harness lives in `scripts/`, which is excluded from the
repository.** These tests will not be version-controlled or run in CI. Treat
them as local development instruments, and keep any invariant that genuinely
must not regress as a type-level constraint or an in-source assertion instead.

- `findPath` across a `gate` returns a path; with `stonewall` instead it is
  longer or fails.
- Block the only route with a building → `rebuild()` → path length increases.
  Confirms derived-from-collision still holds.
- **Mid-raid rebuild:** destroy a building that forms part of an in-use path
  (cannon splash or ram), rebuild, and assert affected agents repath rather than
  walking through rubble geometry or stalling. This is the §0 scenario and it is
  the one most likely to surface a real bug.
- **Water:** path between two points on opposite sides of the pond routes
  around, not through. `isWalkable` false at pond centre.
  `nearestWalkable(pondCentre, fallbackRadius)` returns a bank cell.
- **Exclusion drift:** the list is non-empty and covers every terrain feature
  with traversal implications.
- **Window sizing:** every destination grid reports `cellCount` at the expected
  ~9,216. Log actuals.
- **Recentre:** move the player 30 m; the window recentres once, not per frame;
  an in-flight path survives or is cleanly re-requested.
- **Crypt:** generate a dungeon, build its grid, path between two chambers
  through a corridor. Confirms fixed mode and that corridors are traversable.
- Destination traversal: **integrate `navSteer` output in the harness**
  (`pos += {nx,nz} * speed * dt`) rather than reading `Agent.position` — nothing
  writes it until the Actuator lands in phase 3. Distance to target decreases
  monotonically over 20 game seconds.
- `maxStep`: a target atop a 3 m cliff with no ramp returns **no path**.
- Search hygiene: 200 consecutive `findPath` calls; heap allocation delta flat.
- `nearestWalkable(x, z, r)` returns a walkable cell for a point inside a
  building footprint, `null` beyond `r`.

---

## 3. The resource-gathering loop

**§3.1–3.2 have phase-2 deliverables. §3.3 onward is phase 4/5 design.**

### 3.1 Unified target model — phase 2 (registry), phase 5 (use)

Harvestables live in `st.nodes`, deposits in the building array. Do not fork
`gather_resource` by source: `tree` exists in **both** id spaces, so
reservations keyed on a bare id collide silently; and `farmer → farmplot` is a
building while `lumberjack → tree` is a node, so one job's work target is a
building and another's is a node.

```ts
export type TargetId = string;   // 'node:17' | 'bldg:42' — composite

export interface Target {
  id: TargetId;
  source: 'node' | 'building';
  kind: string;
  x: number; z: number;
  region: string | null;      // ALWAYS null for nodes — see §1.1
  available: boolean;         // node:     respawnAt === null && hitsLeft > 0
                              // building: isBuilt(b) === (b.built ?? 1) >= 1
  anchorRule: AnchorRule;
}

queryNearby(pos, radius, kinds: string[], region): Target[]   // capped at 12
reserve(id: TargetId, slotKind: string, agentId): boolean
release(id: TargetId, slotKind: string, agentId): void
get(id: TargetId): Target | null
```

**Use `isBuilt(b)`, not `built >= 1`.** `built` is optional and absent means
complete, so `undefined >= 1` is `false` and every finished building without an
explicit value would read as unavailable.

**Phase-2 deliverable:** the registry and its queries, testable without a
reasoner. Assert `queryNearby` returns the right kinds; that a `tree` node and a
`tree` building are distinct entries; that reserving one leaves the other free;
and that every node reports `region === null`.

### 3.2 Anchor rules — phase 2 (`nearestWalkable`), phase 4 (table)

Blender-baked `ANCHOR_` empties don't fit runtime-placed content. Use a kind →
rule table resolved at query time.

```json
{
  "nodes": {
    "tree":    { "mode": "radial", "radius": 1.3, "slots": 2 },
    "rock":    { "mode": "radial", "radius": 1.2, "slots": 2 },
    "herb":    { "mode": "radial", "radius": 0.8, "slots": 1 },
    "fishing": { "mode": "radial", "radius": 1.6, "slots": 1,
                 "fallbackRadius": "derive:POND.r + 4" }
  },
  "buildings": {
    "stockpile": { "mode": "radial", "radius": 1.2, "slots": 3 },
    "barrel":    { "mode": "radial", "radius": 0.9, "slots": 1 },
    "farmplot":  { "mode": "radial", "radius": 1.1, "slots": 4 },
    "campfire":  { "mode": "radial", "radius": 1.6, "slots": 5 },
    "workbench": { "mode": "fixed",  "offset": [0, 1.1], "facing": 0, "slots": 1 },
    "forge":     { "mode": "fixed",  "offset": [0, 1.2], "facing": 0, "slots": 1 },
    "bed":       { "mode": "fixed",  "offset": [0, 0.9], "facing": 2, "slots": 1 }
  }
}
```

**`fixed`** — offset in the building's local frame, rotated by `rot * 90°`.
`rot` is quantised, so no interpolation is ever needed.

**`radial`** — sample 8 points on a circle of `radius`; discard non-walkable;
pick nearest to the agent; face centre. If none walkable, fall back to
`nearestWalkable(x, z, fallbackRadius)`. **This only works once §2.1 lands** —
until water is excluded, the fallback returns pond cells.

**Yaw.** The AI emits `agent.yaw` in world convention,
`Math.atan2(-(tx-x), -(tz-z))`. **Rig offsets stay in the renderers** —
`Villagers.tsx` keeps its `+ Math.PI`, `Npc.tsx` keeps none. Do not push the
offset into the AI layer; it is per-renderer, not universal.

### 3.3 Blackboard additions — phase 4

```ts
carrying: { resource: string; amount: number } | null;   // survives aborts
carryCapacity: number;
job: string | null;
```

### 3.4 Actions — phase 5

Category `work`, weight `1.2`, between `companion` (2.0) and `needs` (1.0).

`gather_resource` — `targetKinds: ["tree","rock","herb","fishing","farmplot"]`,
one action across both sources. `job_match` reuses the existing job→resource map
(`lumberjack→tree`, `miner→rock`, `farmer→farmplot`). `farmplot` gated behind a
config flag pending §1.1.

Considerations: `has_capacity` (linear on `carry.freeFraction`), `job_match`
(bool), `target_usable` (bool), `is_work_hours` (**bool on
`world.isWorkingHours`** — see §4), `not_threatened` (quadratic k=2),
`proximity` (linear m=-1 b=1 over 40 m), `energy` (quadratic k=0.5).

`haul_to_deposit` — `targetKinds: ["stockpile","barrel"]`, weight `1.4`.
Considerations: `is_carrying` (bool), `load_fraction` (quadratic k=2),
`target_usable` (bool), `not_threatened` (quadratic k=2), `proximity`
(linear m=-0.6 — a full villager should cross the map to deposit rather than
idle beside an unusable tree).

The 1.4/1.2 weight gap is load-bearing. Verify the crossover in the overlay
**first**, in phase 5. If it doesn't cross cleanly it is a weight bug, and every
downstream symptom will look like a curve bug.

**Existing behaviours the reasoner must subsume, not duplicate:** villagers
already drop everything and run home when a raid begins, and head for the
nearest bed at night. Those become `flee_to_safety` and `sleep` actions with
high `interruptPriority`, and the old code paths come out. Do not leave both
running.

### 3.5 Activities — phase 5

`GatherAtNode`: reserve → resolve anchor → `MOVE_TO_ANCHOR` → `FACE` →
`PLAY_ANIM('anim_g_swordswish', loop)`; every `swingInterval`,
`carrying.amount += yieldPerSwing` and `node.hitsLeft -= 1`.
SUCCESS at capacity, **or SUCCESS with a partial load when `hitsLeft <= 0` or
`respawnAt !== null`.** Abort releases the reservation and **does not** clear
`carrying`.

That partial-load SUCCESS is worth understanding rather than just implementing.
A villager who exhausts a tree at 30% load re-scores; `gather_resource` still
wins because `has_capacity` is high, so it walks to the next tree. At 90%,
`haul_to_deposit` wins instead. Neither branch is written anywhere. If you want
one demonstration that the reasoner earns its complexity over the current
`if/else` cascade, this is it.

`HaulToDeposit`: nearest deposit with space → reserve → `MOVE_TO_ANCHOR` →
`FACE` → `PLAY_ANIM('anim_c_pleased')` → transfer and clear `carrying`.
**Transfer via `addItems()`, never a direct write — see §4.**

Both must keep writing `villagerMobs[id] = {x, z}` every frame or the minimap
and crosshair stop seeing the actor.

### 3.6 Animation — real clips, gaps named

`anim_c_walk`, `anim_c_run`, `anim_g_swordswish` (harvest, stand-in),
`anim_c_pleased` (deposit), `anim_r_restpose` (idle). All five verified.

**Gaps, stated rather than papered over:**

1. **No carry clip.** Hauling looks identical to walking empty. The cheap fix is
   not a new clip — parent a small resource prop to the rig's hand node while
   `carrying != null`. The game already does contextual tool-in-hand for the
   player's viewmodel (axe/pickaxe/rod/sword), so the mechanism exists in
   `lib/minifigRig.ts`; this is reusing it, not inventing it.
2. **No tool-swing clip.** `anim_g_swordswish` reads acceptably for an axe on
   `tree`, poorly for a pickaxe on `rock`, badly for `herb` and `fishing`. One
   `anim_g_toolswing` covers `tree` and `rock`; `fishing` wants its own
   idle-with-rod pose. Highest-value animation addition on the list.

### 3.7 Verification — phase 5

Transitions in order for a `lumberjack` with a `tree` at 8 m and a `stockpile`
at 25 m: `gather_resource` → `carrying` non-null → `haul_to_deposit` →
`carrying === null` and inventory increased. Plus: slot sharing (`tree` slots 2
vs `herb` slots 1); **id collision** (a `tree` node and `tree` building
co-located — reserving one leaves the other free); depletion (partial load, next
target is a different node, not a haul); abort safety (raid mid-gather —
reservation released, `carrying` preserved, next action is `haul_to_deposit`);
anchor walkability (`tree` fenced on three sides; `fishing` node over water
anchors on land); and no flip-flop (60 game seconds, zero changes below
`minDuration`).

---

## 4. Resource economy authority — phase 5

`tickVillagers` is the tuned source of truth today and §3 must not become a
second pathway to the same resources. Neither "replace it" nor "make `carrying`
cosmetic" is acceptable — the first migrates a tuned economy into a system with
no business owning it, the second builds hauling that means nothing.

**Split along the seam `tickVillagers` already conflates:**

| Concern | Today | Owner after |
|---|---|---|
| Is this villager working, and where? | `isWorkingHours()` + `villagerAtWork()` + `WORK_RANGE` | **the AI system** |
| What does that work yield? | `tripSeconds` × Diligence × trade mastery × companion traits | **`tickVillagers`, untouched** |

`villagerAtWork()` is a hand-rolled presence check added to stop villagers
filling sacks hundreds of metres from a tree. The reasoner supersedes it with a
fact rather than an inference: the villager is in `GatherAtNode`, `perform`
phase, reserved on `node:17`.

```ts
// src/game/workSignal.ts   — leaf, per the carts.ts pattern
export interface WorkSignal {
  active: boolean; targetId: string | null; kind: string | null;
}
export const workSignals: Record<string, WorkSignal>;
```

`tickVillagers` reads it **only for villagers that have an AI agent running a
work activity**; everything else falls through to existing logic unchanged. That
makes the change strictly additive.

**Three constraints that are easy to miss:**

1. **Write through `addItems(gains, 'gather')`, not `st.inventory` directly.**
   `st.resources` does not exist. `addItems` also feeds lifetime stats, mastery
   and deeds — bypassing it silently stops all three, and the game has a Stats
   page and a 12-deed gallery that would quietly go stale.
2. **Builders don't fit the split yet.** `isWorkingHours` gates the whole
   `tickVillagers` function, and builders use `WORK_RANGE`, not
   `villagerAtWork`. Leave builders on their existing path in 5a; the
   function-level work-hours gate stays until they migrate.
3. **`is_work_hours` must be a bool on the existing `isWorkingHours()`**, not a
   logistic on daylight. The rule is a hard 5 AM–8 PM boundary; a logistic
   disagrees at dawn and dusk, and once the AI owns the gate that disagreement
   *is* an income change. Reuse the function; do not reimplement the boundary.
   Soft edges are a later design choice, not a default to drift into.

**Ship in two steps.**

- **5a — presence refactor, economically neutral.** AI writes `workSignal`;
  `tickVillagers` reads it; `carrying` disabled, yield still lands directly.
  **Verification: simulate a full game day before and after; total per-resource
  income must match within rounding.** A mismatch means the presence semantics
  diverged — a bug, not a design change.
- **5b — hauling, a deliberate economy change.** Enable `carrying`; yield
  accrues to the villager and lands on deposit.

**The cost, stated plainly:** net daily income drops by haul travel time. That
is a gameplay change and gets its own decision — accept it as a real cost that
makes stockpile placement matter, or scale `tripSeconds` to compensate. It
should not arrive as a side effect of an implementation.

---

## 5. Prompt for the coding agent

> Read `NPC_AI_SPEC.md` and `PHASE_2_NAVIGATION_AND_GATHERING.md` (rev 3).
> Rev 3 supersedes spec §7 entirely — ignore §7, add no navmesh library.
> Rev 1, rev 2 and Addendum A are deleted; do not look for them. Read the
> "Correction:" callouts in §2.0 and §2.3 as part of the spec, not as
> commentary on it — they are corrections found by checking rev 3 against the
> code as it stands now, not a hypothetical.
>
> Implement the phase-2 sections only: §0.1 layer-indexed cells (layer 0 only),
> §2.0 three-mode extent config **including the `lod.json` tier-B outer-radius
> fix** (the correction's option 1 — do this before window mode, or the two
> configs disagree by construction), §2.1 terrain exclusions (`blocked` only),
> §2.2 region support, §2.3 runtime height-field rasterization **including
> exporting `mountedRoot` from `TemplateWorld.tsx`** (it is currently private;
> add an accessor), §2.4 heap + generation stamps + link API (unused), §3.1
> TargetRegistry, §3.2 anchor resolution via `nearestOpen` exposed as
> `nearestWalkable`. Plus §2.5 tests and the §3.1 registry tests.
>
> The Sealed Crypt's fixed grid sizes from an AABB over the actual generated
> `layout.rooms[]` (`game/dungeon.ts`'s `generateDungeonLayout`), padded a few
> metres — **not** from `WORLD_DESTINATIONS`'s static `radius: 140` for
> `id: 'dungeon'`, which is the player's wander clamp and an unrelated number.
>
> Do not implement §3.3–3.7 or §4. Do not touch `tickVillagers`.
>
> `navSteer(agent, tx, tz, dt)` keeps its exact signature.
> TypeScript strict, no `.js`, no new zustand state, all AI timestamps against
> `agentManager.now`, `isBuilt(b)` not `built >= 1`. The AI emits yaw in world
> convention; renderer rig offsets stay in the renderers.
>
> Report actual `cellCount` per grid, and confirm the §2.5 mid-raid rebuild test
> passes before anything else.
