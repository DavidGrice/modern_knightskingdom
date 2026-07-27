# Phase 2 — Navigation, and the resource-gathering loop

Supersedes `NPC_AI_SPEC.md` §7 in full. Read this instead of §7.
Written against `PROJECT_CONTEXT.md` §5 / §8.1.

---

## 0. Decision: extend `navgrid`, do not adopt navcat

**Rejected: navcat / recast + `NAV_` Blender authoring.**

Spec §7.2 said "build the navmesh offline, never at runtime." That assumed
authored static interiors. This game's world is **player-mutable during play** —
~40 building types placed on a grid mid-session. Every placement invalidates
navigation. With a navmesh that means either full regeneration (multi-second
stall) or a tile cache with dynamic obstacles — and the tile cache requires a
second obstacle representation maintained alongside `collisionBoxesFor()`.
That desync risk is precisely what §5's derived-from-real-collision property
buys you today, and it was described as hard-won. It is not worth trading.

Three supporting reasons:

1. **Content shape matches the representation.** Buildings are grid-placed with
   quarter-turn rotation. A navmesh is a polygon abstraction over arbitrary
   continuous geometry; that abstraction has nothing to abstract here.
2. **Off-mesh links are not a navcat exclusive.** On a grid a link is one extra
   neighbour in the A\* expansion, with a cost and a tag. ~40 lines (§2.3).
3. **The height-band filter beats hand-authored door links.** Ignoring boxes
   entirely below 0.55 m or entirely above 1.7 m makes archways, gates and
   breached walls walkable with zero bookkeeping. Reproducing that on a navmesh
   means re-deriving it from a second geometry source.

**The one trigger that flips this decision:** walkable multi-level interiors
(a `keep` or `tower` you can climb inside, with two walkable surfaces at the
same x/z). A 2D grid cannot represent that. If it becomes real, evaluate a
*layered* grid — one grid per floor joined by stair links — before evaluating a
navmesh. Layered grid is still substantially cheaper than a rewrite.

**What the grid actually lacks, ranked by what the game needs now:**

| Limit | Needed now? | Fix |
|---|---|---|
| Homestead only, ±56 m; 9 destinations unnavigated | **Yes — this is the real gap** | §2.1 region support |
| Linear-scan open set | Not yet; will bite at 10 grids | §2.2 binary heap |
| No off-mesh links | Not for gathering; yes for ladders/stairs later | §2.3 |
| No multi-level | No | deferred, see above |
| No funnel smoothing over arbitrary polys | No — string-pulling already approximates it | none |

---

## 1. Assumptions I had to make

State these back to me if any are wrong; they change the content below.

1. Harvestable node types are drawn from the existing building list:
   `tree`, `plant`, `flowerbed`, `farmplot`. Deposit targets: `stockpile`,
   `barrel`. I do **not** know this repo's resource ids or yield values, so
   every yield/capacity number below is a placeholder in JSON, not a claim.
2. Villagers already carry a `job` field (`PROJECT_CONTEXT.md` §3 references
   `job: 'defender'`), and job ids for gathering exist or can be added.
3. Destination worlds have a known origin and content bounds per region id.
   If bounds are not queryable, §2.1 needs a per-region extent in JSON instead.
4. `collisionBoxesFor()` accepts or can accept a region argument. If it is
   homestead-hardcoded, that is the first thing to change in §2.1.
5. Nodes deplete (a tree can be exhausted). If they are infinite, drop
   `depleted` from the reservation logic and the `node_available` gate.

---

## 2. Phase 2 work items

### 2.1 Region support — the main work

Make `navgrid` instantiable rather than a module-level singleton grid.

```ts
// src/game/navgrid.ts
export class NavGrid {
  constructor(opts: {
    region: string | null;      // null = homestead
    originX: number; originZ: number;
    halfExtent: number;         // 56 for home
    cellSize: number;           // 1
  });
  rebuild(buildings: Building[]): void;   // no-op unless identity changed
  findPath(sx, sz, tx, tz): PathResult;
  isWalkable(x, z): boolean;
  nearestWalkable(x, z, maxRadius): {x, z} | null;   // NEW — needed by §3.2
  addLink(ax, az, bx, bz, opts): LinkId;             // NEW — §2.3
  removeLink(id: LinkId): void;
}

export function getNavGrid(region: string | null): NavGrid;  // lazy, cached
export function navSteer(agent, tx, tz, dt): { nx, nz, dist };  // UNCHANGED
```

`navSteer` keeps its exact signature and reads `agent.region` internally to
select the grid. **Every existing caller compiles untouched.** That is the
migration safety property — do not break it.

**Ground height on destinations.** Keep the grid 2D in x/z. Each cell caches
`groundY` from `destinationGroundY(x, z)` at build time. During neighbour
expansion, unlink a pair whose `|Δy|` exceeds `maxStep` (start at 0.6 m). That
handles 12 m hillsides without going 3D — steep faces simply have no edges
across them.

**Lazy construction.** Build a destination grid on first entry to that region,
not at load. Nine grids at load is a stall for worlds the player may never
visit. Cache and reuse; clear on `newGame`/`loadFromSave` alongside
`agentManager.clear()`.

### 2.2 Binary heap open set

Replace the linear scan. Straightforward min-heap keyed on `f`, with an
index map for decrease-key. ~40 lines. Not urgent at one 113×113 grid; it is
urgent once ten grids exist and destination extents may exceed the homestead's.

Add a per-frame budget: cap total A\* node expansions across all agents
(start at 4000/frame). Over budget, defer the request — `navSteer` returns the
previous step direction, which is already what stale path state does.

### 2.3 Link support

```ts
addLink(ax, az, bx, bz, {
  cost: number,          // added to g, in cell units
  bidirectional: boolean,
  tag: string,           // 'stairs' | 'ladder' | 'gate' | ...
  clip?: string,         // one of the 15; played during traversal
  duration?: number,     // game seconds; PathFollower yields to anim for this long
})
```

Implementation: a `Map<cellIndex, Link[]>` consulted during neighbour
expansion. The returned path carries `{ kind: 'link', linkId, clip, duration }`
markers between waypoints so the follower can hand off to the
AnimationController and resume.

Not required for gathering. Build the API in phase 2, leave it unused, so
phase 7 (raids over palisades) does not need a nav change.

### 2.4 Verification

Per §9, browser smoke tests via `window.__kkai` / `__kk`. Assert **direction of
change**, not arrival — headless runs ~8 fps with clamped `dt`, so real time is
roughly 2.4× game time.

- `findPath` across a `gate` returns a path; the same path with the gate
  replaced by `stonewall` is longer or fails.
- Place a building blocking the only route → `rebuild()` → path length
  increases. Confirms the derived-from-collision property still holds.
- Spawn an agent in a destination region, target 30 m away across a slope:
  distance-to-target decreases monotonically over 20 game seconds.
- `maxStep` check: a target atop a 3 m cliff face with no ramp returns no path,
  rather than a path that walks up the wall.
- Budget: 20 agents all repathing on the same tick never exceeds the expansion
  cap; no agent goes more than 3 s without a fresh path.

---

## 3. The resource-gathering loop

This is what phase 2 exists to enable. Design it now so phase 3/4 work lands
in the right shape; the *content* below is phase 4/5, the *anchors* are phase 4.

### 3.1 Shape of the loop

Not a state machine. Two competing utility actions plus persistent carry state:

```
gather_resource   scores high when: hands not full, node reachable, work hours
haul_to_deposit   scores high when: carrying something, load fraction high
```

The oscillation between them is emergent. The payoff: a villager interrupted
mid-haul by a raid flees, and afterwards `haul_to_deposit` still scores high
because `bb.carrying` persisted — it resumes with no resume logic written.
That is the whole argument for utility over the current `if/else` cascade, and
it is worth demonstrating on this loop first.

### 3.2 Anchors on runtime-placed buildings — resolves open question §8.2

Spec §4.1's Blender-baked `ANCHOR_` empties do not fit player-placed
buildings. Replace with a **type → anchor rule table**, resolved at query time.
Two modes:

```json
{
  "tree":       { "mode": "radial", "radius": 1.3, "slots": 2 },
  "plant":      { "mode": "radial", "radius": 0.9, "slots": 1 },
  "flowerbed":  { "mode": "radial", "radius": 1.0, "slots": 2 },
  "farmplot":   { "mode": "radial", "radius": 1.1, "slots": 4 },
  "stockpile":  { "mode": "radial", "radius": 1.2, "slots": 3 },
  "barrel":     { "mode": "radial", "radius": 0.9, "slots": 1 },
  "workbench":  { "mode": "fixed", "offset": [0, 1.1], "facing": 0, "slots": 1 },
  "forge":      { "mode": "fixed", "offset": [0, 1.2], "facing": 0, "slots": 1 },
  "bed":        { "mode": "fixed", "offset": [0, 0.9], "facing": 2, "slots": 1 },
  "campfire":   { "mode": "radial", "radius": 1.6, "slots": 5 }
}
```

**`fixed`** — `offset` is in the building's local frame; rotate by `rot * 90°`,
add to `(x, z)`. `facing` is quarter-turns relative to the building. Because
`rot` is quantised, no interpolation is ever needed.

**`radial`** — sample K points (K=8) on a circle of `radius` around the
building centre, discard any where `navGrid.isWalkable()` is false, pick the
one nearest the agent. Facing = toward the centre.

Radial is what makes trees work: a tree has no front. Fixed is for anything
with a usable side. This distinction is the reason a single `ANCHOR_` empty
model could not have covered both.

**Yaw, since this is the documented footgun:** facing a target at `(tx,tz)`
from `(x,z)` is `yaw = Math.atan2(-(tx-x), -(tz-z))`, and the minifig rig then
needs `rotation.y = yaw + Math.PI`. Do not let generated code emit the
un-negated form.

### 3.3 Blackboard additions

```ts
// appended to Blackboard, spec §3.2
carrying: { resource: string; amount: number } | null;
carryCapacity: number;         // from archetype
job: string | null;            // mirrors the villager's existing job field
```

`carrying` survives action aborts. That is deliberate — see §3.1.

### 3.4 Action definitions

New category `work`, weight `1.2`. Add to spec §5.5 between `companion` (2.0)
and `needs` (1.0).

`src/ai/config/actions/gather_resource.json`

```json
{
  "id": "gather_resource",
  "category": "work",
  "weight": 1.2,
  "cooldown": 0,
  "minDuration": 6,
  "interruptPriority": 1,
  "targetSource": "building",
  "targetTypes": ["tree", "plant", "flowerbed", "farmplot"],
  "activity": "GatherAtNode",
  "considerations": [
    { "name": "has_capacity",  "input": "carry.freeFraction",
      "curve": { "type": "linear", "m": 1, "k": 1, "b": 0, "c": 0 } },
    { "name": "job_match",     "input": "target.matchesJob",
      "curve": { "type": "bool" } },
    { "name": "node_usable",   "input": "target.available",
      "curve": { "type": "bool" } },
    { "name": "is_work_hours", "input": "world.daylight",
      "curve": { "type": "logistic", "m": 1, "k": 1, "b": 0, "c": 0 } },
    { "name": "not_threatened","input": "threat.inverse",
      "curve": { "type": "quadratic", "m": 1, "k": 2, "b": 0, "c": 0 } },
    { "name": "proximity",     "input": "target.distanceNorm40",
      "curve": { "type": "linear", "m": -1, "k": 1, "b": 1, "c": 0 } },
    { "name": "energy",        "input": "needs.energy",
      "curve": { "type": "quadratic", "m": 1, "k": 0.5, "b": 0, "c": 0 } }
  ]
}
```

`src/ai/config/actions/haul_to_deposit.json`

```json
{
  "id": "haul_to_deposit",
  "category": "work",
  "weight": 1.4,
  "cooldown": 0,
  "minDuration": 4,
  "interruptPriority": 1,
  "targetSource": "building",
  "targetTypes": ["stockpile", "barrel"],
  "activity": "HaulToDeposit",
  "considerations": [
    { "name": "is_carrying",     "input": "carry.hasAny",
      "curve": { "type": "bool" } },
    { "name": "load_fraction",   "input": "carry.loadFraction",
      "curve": { "type": "quadratic", "m": 1, "k": 2, "b": 0, "c": 0 } },
    { "name": "deposit_usable",  "input": "target.available",
      "curve": { "type": "bool" } },
    { "name": "not_threatened",  "input": "threat.inverse",
      "curve": { "type": "quadratic", "m": 1, "k": 2, "b": 0, "c": 0 } },
    { "name": "proximity",       "input": "target.distanceNorm40",
      "curve": { "type": "linear", "m": -0.6, "k": 1, "b": 1, "c": 0 } }
  ]
}
```

`haul` weights proximity more weakly (`m: -0.6`) than `gather` on purpose: a
full villager should cross the homestead to deposit rather than idle next to a
tree it cannot use.

**Note the `weight` gap (1.4 vs 1.2) is doing real work.** With a full load,
`load_fraction` at 1.0 plus the higher weight reliably beats `gather`, whose
`has_capacity` has collapsed toward 0. Verify this crossover in the overlay
before tuning anything else — if it doesn't cross cleanly, everything
downstream will look like a curve bug when it is a weight bug.

### 3.5 Activities

`GatherAtNode`

```
start:   registry.reserve(nodeId, 'harvest', agentId)   -> fail => FAILURE
         anchor = resolveAnchor(building, agent)         (radial)
travel:  emit MOVE_TO_ANCHOR
align:   emit FACE(building centre)
perform: emit PLAY_ANIM('anim_g_swordswish', loop: true)
         every `swingInterval` game seconds:
           carrying.amount += yieldPerSwing
           node.remaining   -= yieldPerSwing
         SUCCESS when carrying.amount >= carryCapacity || node.remaining <= 0
abort:   release reservation. DO NOT clear carrying.
```

`HaulToDeposit`

```
start:   pick nearest target of targetTypes with space, same region
         registry.reserve(depositId, 'deposit', agentId)
travel:  emit MOVE_TO_ANCHOR
align:   emit FACE(centre)
perform: emit PLAY_ANIM('anim_c_pleased', loop: false)   // ~0.8 s beat
         on clip end: transfer carrying -> stockpile; carrying = null; SUCCESS
abort:   release reservation. DO NOT clear carrying.
```

Both must keep writing `villagerMobs[id] = {x, z}` every frame or the minimap
and targeting stop seeing the actor (§3 of the context doc).

### 3.6 Animation — real clips only, gaps named

Working against the 15 that exist:

| Beat | Clip | Status |
|---|---|---|
| walking to/from node | `anim_c_walk` | exists |
| running (fleeing raid) | `anim_c_run` | exists |
| chopping / harvesting | `anim_g_swordswish` (looped) | **stand-in** — already the existing convention for "working" |
| deposit | `anim_c_pleased` | least-wrong of the 15 |
| idle at node | `anim_r_restpose` | exists |

**Two explicit gaps — do not paper over these:**

1. **No carry clip.** A villager hauling looks identical to one walking empty.
   The cheap fix is *not* a new clip: parent a small resource prop to the rig's
   hand/arm node while `carrying != null`. For a LEGO-styled game a visible
   brick in the hand reads better than a new animation anyway, and it costs one
   attach point in `lib/minifigRig.ts`.
2. **No chop/mine clip.** `anim_g_swordswish` is a sword swish. It reads
   acceptably for an axe, poorly for harvesting a `flowerbed`. If gathering
   becomes a headline feature, one `anim_g_toolswing` clip covers every node
   type and is the single highest-value animation addition on the list.

### 3.7 Verification

- Villager with a gathering job, one `tree` at 8 m, one `stockpile` at 25 m.
  Assert in order: `bb.currentActionId === 'gather_resource'` → `bb.carrying`
  non-null → `currentActionId === 'haul_to_deposit'` → `bb.carrying === null`
  and the stockpile's count increased. Assert on **transitions**, with generous
  game-second budgets.
- Two villagers, one `tree` with `slots: 2`: both gather. Same with `plant`
  (`slots: 1`): the second picks a different node or a different action, and
  never shares the anchor.
- Abort safety: trigger a raid mid-gather. Assert the node slot is released,
  `bb.carrying` is preserved, and after the raid resolves the villager's next
  action is `haul_to_deposit`, not `gather_resource`.
- Anchor walkability: surround a `tree` with `fence` on three sides; assert the
  chosen radial anchor is on the open side and is reachable.
- No flip-flop: log `currentActionId` for 60 game seconds with a full villager
  standing between a tree and a stockpile. Zero action changes below
  `minDuration`. This is the §5.6 commitment check and it is the one most
  likely to fail first.

---

## 4. Suggested prompt for the coding agent

> Read `NPC_AI_SPEC.md` and `PHASE_2_NAVIGATION_AND_GATHERING.md`.
> `PHASE_2...` supersedes spec §7 entirely — ignore §7 and do not add navcat
> or any navmesh library.
>
> Implement §2 only: region support, binary heap, link API, and the §2.4 smoke
> tests. `navSteer(agent, tx, tz, dt)` must keep its exact current signature so
> existing callers are untouched. Do not implement §3 — that is phase 4/5.
>
> Constraints: TypeScript strict, no `.js` files, no new zustand state, all AI
> timestamps against `agentManager.now`, `yaw = Math.atan2(-dx, -dz)`.
