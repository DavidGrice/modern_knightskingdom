# Phase 2 — Navigation, and the resource-gathering loop (rev 2)

Supersedes `NPC_AI_SPEC.md` §7 in full, and supersedes rev 1 of this document.
Revised against a code review of rev 1's assumptions.

**Section phases — read this first.**

| Section | Phase | Verifiable when |
|---|---|---|
| §2 Navigation | **2** | now |
| §3.1 Target model | **2** (registry) / 5 (use) | registry queries testable in phase 2 |
| §3.2 Anchors | **2** (`nearestWalkable`) / 4 (rules) | resolution testable in phase 2 |
| §3.3–3.6 Actions, activities, animation | **4–5** | not until the reasoner lands |
| §3.7 Gathering verification | **5** | not until the reasoner lands |

Rev 1 told you to verify the gather/haul weight crossover before tuning. That
was wrong — `bb.lastScores` is empty until phase 5 and the overlay renders a
placeholder. Ignore that instruction; it reappears correctly in §3.7 as a
phase-5 check.

---

## 0. Decision: extend `navgrid`, do not adopt navcat

Unchanged from rev 1, and the review strengthens it. Summary:

The world is player-mutable at runtime. A navmesh means either full
regeneration (multi-second stall) or a tile cache with a second obstacle
representation maintained alongside `collisionBoxesFor()`. The grid's
derived-from-real-collision property — one source of truth, shared with player
collision — is worth more than anything navcat offers here. Supporting
reasons: the world is natively a 1 m grid with quarter-turn rotation; off-mesh
links are ~40 lines on a grid (§2.3); and the 0.55/1.7 m height-band filter
already makes archways and breached walls walkable with zero bookkeeping.

**Flip trigger:** walkable multi-level interiors (a `keep` you can climb, two
walkable surfaces at one x/z). Evaluate a *layered* grid — one per floor,
joined by stair links — before evaluating a navmesh.

---

## 1. Assumption corrections from review

| # | Rev 1 assumed | Reality | Effect |
|---|---|---|---|
| 1 | harvestables are buildings | **wrong** — `st.nodes: ResourceNodeState[]`, kinds `tree \| rock \| fishing \| herb`, with `hitsLeft` / `respawnAt` | §3.1 rewritten; drives the target model |
| 2 | villagers have `job` | correct — `idle, lumberjack, miner, farmer, merchant, defender, builder, sword_shield, halberd, bow` | reuse existing job→resource map |
| 3 | destination bounds queryable | correct — `WorldDestination.origin` + `radius`, **radii 224–245** | §2.1 sizing, §2.2 priority |
| 4 | `collisionBoxesFor()` needs a region arg | **wrong** — it takes `(type, rot)` and returns local-frame geometry; region-independent by construction. Hardcoding is in `rebuildNav()`'s `isHomeBuilding(b)` filter and its module-level `Uint8Array` sized from `HALF = 56` | §2.1 targets `rebuildNav` + the singleton, not that signature |
| 5 | nodes deplete | correct, **temporarily** — `respawnAt !== null` means dead-for-now, not exhausted | §3.5 releases on depletion, returns SUCCESS not FAILURE |

**Still unknown, do not guess:** whether `farmplot` yields a carryable
resource or is a maintenance-only action, and what `merchant → market_stall`
does. Both are named in the job map but neither is a `ResourceNodeState`.
Treat `farmplot` as a gather target in §3.4 but gate it behind a config flag
until confirmed; leave `market_stall` out of scope.

---

## 2. Phase 2 work items

Order changed from rev 1: sizing and heap now precede region support, because
a 224 m-radius grid at 1 m cells is ~449×449 ≈ 201k cells against the
homestead's 113×113 ≈ 12.7k. Building one of those on a linear-scan open set
is not a future problem, it is a first-destination problem.

### 2.0 Grid sizing — do this before building any destination grid

The heap (§2.2) makes a 201k-cell grid *survivable*. This makes it
*unnecessary*. Do both; do this one first.

`radius` is a destination's **declared extent**, not its walkable-content
extent. Buildings, NPCs and quest objects almost certainly occupy a fraction
of it. Two levers, both per-region config:

1. **Bound to content, not to `radius`.** Compute the AABB of that region's
   buildings, nodes, and spawn points; pad by 20 m; use that as the grid
   extent. Fall back to `radius` only if a region has no content to bound.
2. **Per-region `cellSize`.** The homestead uses 1 m because buildings are
   placed on a 1 m grid — the cell size matches the content. Destination
   terrain is open and has no such constraint. 2 m quarters the cell count.

```json
// src/ai/config/navgrid.json
{
  "default":      { "cellSize": 1.0, "boundToContent": true, "padding": 20, "maxHalfExtent": 128 },
  "home":         { "cellSize": 1.0, "boundToContent": false, "halfExtent": 56 },
  "template-01":  { "cellSize": 2.0 },
  "cedric-camp":  { "cellSize": 2.0 }
}
```

`maxHalfExtent` is a guard rail: if content bounds exceed it, log loudly rather
than silently allocating 200k cells.

**Caveat on `cellSize: 2.0`.** Obstacle inflation is 0.55 m. At 2 m cells a
narrow gap may be open or closed depending on alignment. Acceptable in open
terrain, sloppy near destination architecture. If a destination turns out to
have tight built areas, drop it to 1 m for that region — that is why this is
per-region and not global.

Report actual cell counts per region in the debug overlay after building. If
any destination still lands above ~40k cells after bounding, revisit before
shipping.

### 2.1 Region support

Make `navgrid` instantiable. Per review #4, the surgery is in `rebuildNav()`
and the module-level `Uint8Array`, not in `collisionBoxesFor()`.

```ts
export class NavGrid {
  constructor(opts: {
    region: string | null;
    originX: number; originZ: number;
    halfExtent: number;
    cellSize: number;
    maxStep: number;            // ground-Y delta that unlinks neighbours
  });
  rebuild(buildings: Building[]): void;   // no-op unless identity changed
  findPath(sx, sz, tx, tz): PathResult;
  isWalkable(x, z): boolean;
  nearestWalkable(x, z, maxRadius): { x, z } | null;   // NEW — §3.2 needs it
  addLink(ax, az, bx, bz, opts): LinkId;               // NEW — §2.3
  removeLink(id: LinkId): void;
  readonly cellCount: number;   // surface in the overlay
}

export function getNavGrid(region: string | null): NavGrid;   // lazy, cached
export function navSteer(agent, tx, tz, dt): { nx, nz, dist };  // UNCHANGED
```

`navSteer` keeps its exact signature and selects the grid from `agent.region`.
**Every existing caller compiles untouched.** That is the migration safety
property; do not break it.

The `isHomeBuilding(b)` filter becomes a per-region predicate: a grid takes the
buildings belonging to its own region.

**Ground height.** Grid stays 2D in x/z. Each cell caches `groundY` from
`destinationGroundY(x, z)` at build time; neighbour pairs whose `|Δy|` exceeds
`maxStep` (start 0.6 m) are unlinked. Steep faces get no edges across them.
Home is flat, so home skips the ground pass entirely.

**Lazy construction.** Build on first entry to a region, not at load. Clear
alongside `agentManager.clear()` on `newGame`/`loadFromSave`.

### 2.2 Binary heap + non-allocating search state

Two changes, both required once grids are large.

**Heap.** Min-heap on `f` with an index map for decrease-key. ~40 lines.

**Persistent search arrays with a generation stamp.** Do not allocate or clear
`g`/`f`/`parent`/`closed` per search — at 200k cells that is megabytes of churn
per path, and it will show up as GC sawtooth exactly where the spec forbids it.
Allocate once per grid; keep a `stamp: Uint32Array` and a monotonically
increasing `searchId`; a cell is unvisited iff `stamp[i] !== searchId`. Clearing
becomes `searchId++`.

**Resumable searches.** Rev 1 specced a per-frame expansion budget (4000 nodes)
and said over-budget requests are deferred. That is only correct for searches
that have not started. A long path across a wide grid can exceed the budget
mid-search, and restarting next frame makes no progress. Persist the open set
and stamp state per in-flight search and resume. `navSteer` returns the
previous step direction while a search is in flight — which is already what
stale path state does today, so callers see nothing new.

### 2.3 Link support

```ts
addLink(ax, az, bx, bz, {
  cost: number,            // added to g, in cell units
  bidirectional: boolean,
  tag: string,             // 'stairs' | 'ladder' | 'gate'
  clip?: string,           // one of the 15
  duration?: number,       // game seconds
})
```

A `Map<cellIndex, Link[]>` consulted during neighbour expansion. Returned paths
carry `{ kind: 'link', linkId, clip, duration }` markers so the follower can
hand off to the AnimationController and resume.

Not needed for gathering. Build the API in phase 2, leave it unused, so phase 7
does not require a nav change.

### 2.4 Verification (phase 2, runnable now)

Browser smoke tests via `window.__kkai` / `__kk`. Assert **direction of
change**, not arrival — headless runs ~8 fps with clamped `dt`, so real time is
roughly 2.4× game time.

- `findPath` across a `gate` returns a path; with the gate replaced by
  `stonewall`, it is longer or fails.
- Place a building blocking the only route → `rebuild()` → path length
  increases. Confirms derived-from-collision still holds.
- **Sizing:** build every destination grid; assert each reports `cellCount`
  under the configured guard rail, and log the actual numbers. This is the test
  that tells you whether §2.0 worked.
- Destination traversal: agent 30 m from target across a slope; distance
  decreases monotonically over 20 game seconds.
- `maxStep`: target atop a 3 m cliff with no ramp returns **no path**, not a
  path up the wall.
- **Search-state hygiene:** 200 consecutive `findPath` calls on the largest
  grid; heap allocation delta stays flat. This is the test for the generation
  stamp.
- Budget + resumption: request a corner-to-corner path on the largest grid;
  assert it completes across multiple frames and that no frame exceeds the
  expansion cap.
- `nearestWalkable(x, z, r)` returns a walkable cell for a point inside a
  building footprint, and `null` beyond `r`.

---

## 3. The resource-gathering loop

**§3.1–3.2 have phase-2 deliverables. §3.3 onward is phase 4/5 design.**

### 3.1 Unified target model — phase 2 (registry), phase 5 (use)

Review #1 found harvestables live in `st.nodes`, separate from buildings. The
minimal fix is a second candidate source in assembly. Do the slightly larger
thing instead, for three reasons the review itself surfaced:

- **`tree` exists in both id spaces** — as a node kind and as a placeable
  building. Reservations keyed on a bare id will collide and silently let two
  actors share a slot that isn't shared.
- **`farmer → farmplot` is a building; `lumberjack → tree` is a node.** One
  job's work target is a building and another's is a node, so a source-forked
  `gather_resource` forks the whole action for no gain.
- Reservations, anchors and `job_match` would otherwise each need two paths.

Project both arrays into one shape. The reasoner never learns the difference.

```ts
// src/ai/world/Target.ts
export type TargetId = string;   // 'node:17' | 'bldg:42' — composite, no collisions

export interface Target {
  id: TargetId;
  source: 'node' | 'building';
  kind: string;                  // 'tree' | 'rock' | 'stockpile' | 'farmplot'
  x: number; z: number;
  region: string | null;
  available: boolean;            // nodes: respawnAt === null && hitsLeft > 0
                                 // buildings: built >= 1
  anchorRule: AnchorRule;        // §3.2
}

// src/ai/world/TargetRegistry.ts
queryNearby(pos, radius, kinds: string[], region): Target[]   // capped at 12
reserve(id: TargetId, slotKind: string, agentId): boolean
release(id: TargetId, slotKind: string, agentId): void
get(id: TargetId): Target | null
```

The registry reads `st.nodes` and the building array and normalises. Adding a
third source later (carts, wildlife) touches only the registry.

**Phase-2 deliverable:** the registry and its queries, testable without a
reasoner. Assert `queryNearby` returns the right kinds, that `node:` and
`bldg:` trees are distinct entries, and that reserving one does not affect the
other.

### 3.2 Anchor rules — phase 2 (`nearestWalkable`), phase 4 (table)

Spec §4.1's Blender-baked `ANCHOR_` empties do not fit runtime-placed content.
Replace with a kind → rule table, resolved at query time. Two modes:

```json
// src/ai/config/anchors.json
{
  "nodes": {
    "tree":      { "mode": "radial", "radius": 1.3, "slots": 2 },
    "rock":      { "mode": "radial", "radius": 1.2, "slots": 2 },
    "herb":      { "mode": "radial", "radius": 0.8, "slots": 1 },
    "fishing":   { "mode": "radial", "radius": 1.6, "slots": 1, "fallbackRadius": 6.0 }
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

**`fixed`** — `offset` is in the building's local frame; rotate by `rot * 90°`,
add to `(x, z)`. `facing` is quarter-turns relative to the building. `rot` is
quantised, so no interpolation is ever needed.

**`radial`** — sample 8 points on a circle of `radius`; discard any where
`navGrid.isWalkable()` is false; pick the nearest to the agent. Facing = toward
centre. If none are walkable, fall back to
`navGrid.nearestWalkable(x, z, fallbackRadius ?? radius * 2)`.

Radial exists because a tree has no front. **`fishing` is the case that proves
the fallback matters**: if the node sits in water, every point on its circle is
non-walkable, and `nearestWalkable` is what puts the villager on the bank. That
falls out for free provided water is non-walkable in the grid — confirm that it
is, because if water is merely un-obstructed, villagers will fish from the
middle of the pond.

**Yaw, since it is the documented footgun:** facing `(tx,tz)` from `(x,z)` is
`Math.atan2(-(tx-x), -(tz-z))`, and the minifig rig then needs
`rotation.y = yaw + Math.PI`.

### 3.3 Blackboard additions — phase 4

```ts
carrying: { resource: string; amount: number } | null;
carryCapacity: number;
job: string | null;              // mirrors the villager's existing job
```

`carrying` survives action aborts. That is the point — see §3.7.

### 3.4 Actions — phase 5

New category `work`, weight `1.2`, between `companion` (2.0) and `needs` (1.0)
in spec §5.5.

`gather_resource` — `targetKinds: ["tree", "rock", "herb", "fishing", "farmplot"]`.
One action, both sources, because §3.1 unified them. `job_match` uses the
existing job→resource map (`lumberjack→tree`, `miner→rock`, `farmer→farmplot`).
Gate `farmplot` behind a config flag until §1's open question is settled.

```json
{
  "id": "gather_resource",
  "category": "work",
  "weight": 1.2,
  "cooldown": 0,
  "minDuration": 6,
  "interruptPriority": 1,
  "targetKinds": ["tree", "rock", "herb", "fishing", "farmplot"],
  "activity": "GatherAtNode",
  "considerations": [
    { "name": "has_capacity",   "input": "carry.freeFraction",
      "curve": { "type": "linear", "m": 1, "k": 1, "b": 0, "c": 0 } },
    { "name": "job_match",      "input": "target.matchesJob",   "curve": { "type": "bool" } },
    { "name": "target_usable",  "input": "target.available",    "curve": { "type": "bool" } },
    { "name": "is_work_hours",  "input": "world.daylight",
      "curve": { "type": "logistic", "m": 1, "k": 1, "b": 0, "c": 0 } },
    { "name": "not_threatened", "input": "threat.inverse",
      "curve": { "type": "quadratic", "m": 1, "k": 2, "b": 0, "c": 0 } },
    { "name": "proximity",      "input": "target.distanceNorm40",
      "curve": { "type": "linear", "m": -1, "k": 1, "b": 1, "c": 0 } },
    { "name": "energy",         "input": "needs.energy",
      "curve": { "type": "quadratic", "m": 1, "k": 0.5, "b": 0, "c": 0 } }
  ]
}
```

`haul_to_deposit` — `targetKinds: ["stockpile", "barrel"]`, weight `1.4`.

```json
{
  "id": "haul_to_deposit",
  "category": "work",
  "weight": 1.4,
  "cooldown": 0,
  "minDuration": 4,
  "interruptPriority": 1,
  "targetKinds": ["stockpile", "barrel"],
  "activity": "HaulToDeposit",
  "considerations": [
    { "name": "is_carrying",     "input": "carry.hasAny",     "curve": { "type": "bool" } },
    { "name": "load_fraction",   "input": "carry.loadFraction",
      "curve": { "type": "quadratic", "m": 1, "k": 2, "b": 0, "c": 0 } },
    { "name": "target_usable",   "input": "target.available", "curve": { "type": "bool" } },
    { "name": "not_threatened",  "input": "threat.inverse",
      "curve": { "type": "quadratic", "m": 1, "k": 2, "b": 0, "c": 0 } },
    { "name": "proximity",       "input": "target.distanceNorm40",
      "curve": { "type": "linear", "m": -0.6, "k": 1, "b": 1, "c": 0 } }
  ]
}
```

`haul` weights proximity more weakly on purpose: a full villager should cross
the homestead to deposit rather than idle beside a tree it cannot use.

The 1.4-vs-1.2 weight gap is doing real work — with a full load,
`load_fraction` at 1.0 plus the higher weight must beat `gather`, whose
`has_capacity` has collapsed toward 0. Verify that crossover in the overlay
**first**, in phase 5. If it doesn't cross cleanly, it is a weight bug, and
every downstream symptom will look like a curve bug.

### 3.5 Activities — phase 5

`GatherAtNode`

```
start:   registry.reserve(targetId, 'harvest', agentId)  -> fail => FAILURE
         anchor = resolveAnchor(target, agent)            (radial + fallback)
travel:  emit MOVE_TO_ANCHOR
align:   emit FACE(target centre)
perform: emit PLAY_ANIM('anim_g_swordswish', loop: true)
         every `swingInterval` game seconds:
           carrying.amount += yieldPerSwing
           node.hitsLeft   -= 1
         SUCCESS when carrying.amount >= carryCapacity
         SUCCESS (partial load) when hitsLeft <= 0 or respawnAt !== null
abort:   release reservation. DO NOT clear carrying.
```

**Depletion returns SUCCESS with a partial load, not FAILURE** (review #5).
This is worth understanding rather than just implementing: a villager who
exhausts a tree at 30% load re-scores, `gather_resource` still wins because
`has_capacity` is high, and it walks to the *next* tree. At 90% load,
`haul_to_deposit` wins instead. Neither branch is written anywhere. If you want
one demonstration that the reasoner is earning its complexity over the current
`if/else` cascade, this is it.

`HaulToDeposit`

```
start:   nearest target of targetKinds with space, same region
         registry.reserve(targetId, 'deposit', agentId)
travel:  emit MOVE_TO_ANCHOR
align:   emit FACE(centre)
perform: emit PLAY_ANIM('anim_c_pleased', loop: false)     // ~0.8 s beat
         on clip end: transfer carrying -> stockpile; carrying = null; SUCCESS
abort:   release reservation. DO NOT clear carrying.
```

Both must keep writing `villagerMobs[id] = {x, z}` every frame, or the minimap
and crosshair stop seeing the actor.

### 3.6 Animation — real clips only, gaps named

| Beat | Clip | Status |
|---|---|---|
| walking | `anim_c_walk` | exists |
| running (fleeing) | `anim_c_run` | exists |
| harvesting | `anim_g_swordswish` (looped) | **stand-in**, already the repo convention |
| deposit | `anim_c_pleased` | least-wrong of the 15 |
| idle at target | `anim_r_restpose` | exists |

**Two gaps, stated rather than papered over:**

1. **No carry clip.** A hauling villager looks identical to an empty one. The
   cheap fix is not a new clip — parent a small resource prop to the rig's hand
   node while `carrying != null`. For a LEGO-styled game a visible brick reads
   better than a new animation, and it costs one attach point in
   `lib/minifigRig.ts`.
2. **No tool-swing clip.** `anim_g_swordswish` reads acceptably for an axe on a
   `tree`, poorly for a pickaxe on `rock` and badly for `herb` and `fishing` —
   and rev 1 underestimated this, because the node kinds are more varied than
   the building types it assumed. One `anim_g_toolswing` covers `tree` and
   `rock`; `fishing` really wants its own idle-with-rod pose. This is the
   highest-value animation addition on the list.

### 3.7 Gathering verification — phase 5

- Villager with `job: 'lumberjack'`, one `tree` node at 8 m, one `stockpile` at
  25 m. Assert transitions in order: `currentActionId === 'gather_resource'` →
  `bb.carrying` non-null → `'haul_to_deposit'` → `bb.carrying === null` and the
  stockpile count increased. Generous game-second budgets; assert on
  transitions, not timings.
- Two villagers, one `tree` node (`slots: 2`): both gather. One `herb`
  (`slots: 1`): the second picks a different target, never shares the anchor.
- **Id collision:** a `tree` node and a `tree` building at the same spot.
  Reserving the node leaves the building unreserved. This is the §3.1 test.
- Depletion: set `hitsLeft: 2` with capacity 10. Assert the villager finishes
  with a partial load, releases the reservation, and its next action targets a
  *different* node rather than hauling.
- Abort safety: trigger a raid mid-gather. Reservation released, `bb.carrying`
  preserved, and after the raid the next action is `haul_to_deposit`.
- Anchor walkability: `fence` a `tree` on three sides; the chosen anchor is on
  the open side and is reachable. Repeat for a `fishing` node over water and
  assert the anchor is on land.
- No flip-flop: full villager standing between a tree and a stockpile, 60 game
  seconds, zero action changes below `minDuration`. This is the §5.6 commitment
  check and the one most likely to fail first.

---

## 4. Suggested prompt for the coding agent

> Read `NPC_AI_SPEC.md` and `PHASE_2_NAVIGATION_AND_GATHERING.md` (rev 2).
> Rev 2 supersedes spec §7 entirely — ignore §7, do not add navcat or any
> navmesh library.
>
> Implement the phase-2 sections only: §2.0 sizing config, §2.1 region support,
> §2.2 heap + generation-stamped search state + resumable searches, §2.3 link
> API (unused), §3.1 TargetRegistry, §3.2 `nearestWalkable` and anchor
> resolution, and the §2.4 smoke tests plus the §3.1 registry tests.
> Do not implement §3.3–3.7 — that is phase 4/5.
>
> `navSteer(agent, tx, tz, dt)` must keep its exact current signature.
> Constraints: TypeScript strict, no `.js`, no new zustand state, all AI
> timestamps against `agentManager.now`, `yaw = Math.atan2(-dx, -dz)`.
>
> Report actual `cellCount` per destination grid when the sizing tests run.
