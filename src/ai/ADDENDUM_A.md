# Addendum A to `PHASE_2_NAVIGATION_AND_GATHERING` (rev 2)

Patches rev 2 in response to a second code review. Rev 2 stands except where
this document overrides it. Two substantive changes and a correction list.

---

## A1. Ground height — replaces rev 2 §2.1 "Ground height"

**Rev 2 was wrong.** It specced one `destinationGroundY(x, z)` call per cell at
build time. That resolves to a recursive raycast against the whole mounted
template GLB. At a 224 m radius and 1 m cells that is 200,704 rays — roughly
10 seconds on first entry to a region at an optimistic 0.05 ms/ray, and worse
against a real bake. It converts lazy construction into exactly the stall lazy
construction existed to prevent.

Note this partly self-corrects if §2.0 sizing lands: content-bounded grids at
2 m cells could be 10–15k cells, and 15k rays is under a second. But the design
must not depend on §2.0 succeeding, and a sub-second hitch on every region
entry is still bad.

### Rejected: coarse sampling + bilinear interpolation

Sampling every 4th cell and interpolating is the obvious fix and it is unsafe
here. Bilinear interpolation smooths across the sample span, which erases
precisely the discontinuities `maxStep` exists to detect. A 3 m cliff sampled
every 4 cells becomes a gradual ramp; no neighbour pair exceeds `maxStep`; the
unlink never fires; agents path up vertical faces. That is the exact failure
§2.4's cliff test is written to catch, and it would be traded in knowingly for
a startup win. Do not take this option.

### Chosen: bake the height field offline

`scripts/gen-collision.mjs` already voxelises source geometry ahead of time.
Follow it.

```
scripts/gen-heightfield.mjs
  for each destination template GLB:
    load, find terrain mesh(es)
    rasterize triangles into a height field at the region's grid resolution
      (per cell: max Y of any triangle covering the cell centre; sentinel for
       cells with no coverage)
    write public/assets/nav/heightfield-<region>.bin  (Uint16, quantised)
      + a small JSON header: origin, cellSize, dims, yMin, yScale
```

Runtime: `NavGrid` loads the header + buffer for its region and reads
`groundY` by index. Cost is one fetch and a typed-array view. Zero raycasts.

Quantisation: `Uint16` over the region's Y range gives ~0.4 mm resolution at a
25 m span, far below `maxStep`'s 0.6 m. `Uint8` is not enough — 12 m of relief
quantises to 5 cm steps, which is fine for rendering and marginal for step
detection. Use `Uint16`.

Sentinel cells (no terrain coverage) are marked non-walkable outright.

### Fallback if the bake pipeline is deferred

Rasterize at runtime, once, in a single traversal of the terrain mesh's index
buffer — the same algorithm, done on first region entry instead of at build
time. O(triangles) rather than O(cells × scene depth), which is the whole point.
For a destination terrain mesh this is milliseconds, not seconds.

**Do not** implement per-cell lazy population (populate `groundY` on first
touch). It looks cheap, but A\* needs `maxStep` edge validity *during*
expansion, so it would raycast inside the path budget — converting a bounded
one-time stall into unbounded recurring per-frame jitter. That is strictly
worse than what rev 2 specced.

### Home world

Flat, `y = 0`. Skip the height field entirely: no file, no buffer, no step
checks. Only destination grids carry one.

---

## A2. Resource economy authority — settles the §3 blocker

The review is right that rev 2 §3 creates a second pathway to the same
resources alongside `tickVillagers`, and that this must be settled before any
of §3 is written. It framed the choice as binary. Both of its options are bad:

- *§3 replaces `tickVillagers`* — the AI layer inherits `tripSeconds`,
  Diligence, trade mastery and companion-trait multipliers. That is a tuned
  economy migrating into a system that has no business owning it.
- *§3 is cosmetic, the timer stays authoritative* — you build a hauling loop
  that does not mean anything, and `carrying` is set dressing.

### The seam

`tickVillagers` currently conflates two separable concerns:

| Concern | Currently | Belongs to |
|---|---|---|
| Is this villager working, and where? | `isWorkingHours(worldEnv.time)` + `villagerAtWork(v, st, homeBuildings)` + `WORK_RANGE` for builders | **the AI system** |
| What does that work yield? | per-job `tripSeconds` × Diligence × trade mastery × companion traits | **`tickVillagers`, unchanged** |

`villagerAtWork()` is a hand-rolled presence check — added, per the review, to
fix villagers filling sacks hundreds of metres from a tree. The reasoner
supersedes it with something strictly better: it knows the villager is in
`GatherAtNode`, in the `perform` phase, reserved on `node:17`. Presence stops
being inferred from distance and becomes a fact.

### The contract

A dependency-free leaf module, following the `carts.ts` pattern the codebase
already uses for exactly this (context doc §2, circular-import trap):

```ts
// src/game/workSignal.ts   — leaf, imports nothing from store or ai
export interface WorkSignal {
  active: boolean;          // reasoner is running a work activity, perform phase
  targetId: string | null;  // 'node:17' | 'bldg:42'
  kind: string | null;      // 'tree' | 'rock' | 'farmplot' | ...
}
export const workSignals: Record<string, WorkSignal>;   // by villager id
```

The AI writes it. `tickVillagers` reads it and drops its own
`isWorkingHours` / `villagerAtWork` checks. **Every multiplier stays where it
is.**

Then `carrying` becomes real without duplicating anything: `tickVillagers`
accrues its computed rate into `bb.carrying.amount` instead of straight into
`st.resources`, and the transfer to `st.resources` happens on deposit, in
`HaulToDeposit`. One rate calculation. One source of truth. Hauling has
consequences.

### The cost, stated plainly

Net daily income drops by haul travel time. That is a gameplay change, not a
refactor, and it deserves its own decision — accept it as a real cost that
makes stockpile placement matter, or scale `tripSeconds` to compensate. Do not
let it arrive as a side effect.

### Ship it in two steps

**5a — presence refactor, economically neutral.** AI writes `workSignal`;
`tickVillagers` reads it; `carrying` stays disabled and yield still lands
directly in `st.resources`. **Verification: simulate a full game day before and
after; total income per resource must match within rounding.** If it does not,
the presence semantics diverged and that is a bug, not a design change.

**5b — hauling, a deliberate economy change.** Enable `carrying`; yield accrues
to the villager and lands on deposit. Re-measure daily income, then decide on
the compensation question above.

Splitting this way means you can prove the refactor is neutral before changing
anything a player would notice.

### Consequential fix to rev 2 §3.4

`is_work_hours` used a logistic curve on `world.daylight`. The game's rule is a
hard 5 AM–8 PM boundary via `isWorkingHours(worldEnv.time)`. Those disagree at
dawn and dusk, and once the AI owns the work-hours gate that disagreement *is*
an income change. Replace with a bool gate on the existing function:

```json
{ "name": "is_work_hours", "input": "world.isWorkingHours", "curve": { "type": "bool" } }
```

Reuse the function; do not reimplement the boundary. Soft dawn/dusk edges are a
design choice available later, not a default to drift into.

---

## A3. Corrections to rev 2

**Accepted:**

- `DIM` is **112**, not 113. Homestead is 112×112 = 12,544 cells; a 224 m-radius
  destination at 1 m is 448×448 = 200,704. The review's arithmetic is right and
  A1 is sized against it.
- `rebuild(buildings: PlacedBuilding[])`, not `Building[]`.
- `nearestWalkable` is **not new** — `navgrid` has `nearestOpen(i, j)` privately,
  outward search to r=6. Expose and rename; add a `maxRadius` parameter, since
  §3.2's `fishing` fallback wants 6.0 and shouldn't rely on the constant
  happening to match.
- **Yaw offset is per-renderer, and rev 2 stated it as universal.** `Villagers.tsx`
  applies `rotation.y = yaw + Math.PI`; `Npc.tsx` sets `g.rotation.y = yaw.current`
  with no offset. The correct rule: **the AI emits `agent.yaw` in world
  convention** (`Math.atan2(-dx, -dz)`) and **each renderer keeps whatever rig
  offset it already has.** No existing component changes. Do not push the
  `+ Math.PI` into the AI layer.
- §2.4's destination-traversal test cannot run in phase 2 — nothing writes
  `Agent.position` until the Actuator lands. **Do not defer it to phase 3.**
  Rewrite it to integrate `navSteer`'s output in the harness itself (accumulate
  `{nx, nz} * speed * dt` into a local position), which is ~10 lines and keeps
  destination pathing verifiable in the phase that builds it.

**Already fixed in rev 2:** `node.remaining` → `hitsLeft`. That was a rev 1
error; rev 2 §3.5 already reads `node.hitsLeft -= 1`. Noting it in case the
review was reading rev 1.

**Noted, no change:** the §0 decision and the §2.1 migration-safety claim were
both verified against the code. The `navSteer` caller audit (only `Villagers.tsx`
and `Npc.tsx`, both home-only, `Enemies.tsx` steers straight) is worth keeping
in the doc — it is the evidence that region support cannot silently repoint an
existing caller, and it should be re-run if a third caller ever appears.

---

## A4. Revised prompt for the coding agent

> Read `NPC_AI_SPEC.md`, `PHASE_2_NAVIGATION_AND_GATHERING.md` (rev 2), and
> `ADDENDUM_A.md`. Addendum A overrides rev 2 where they conflict.
>
> Implement the phase-2 sections only: §2.0 sizing config, §2.1 region support
> with **A1's baked height field** (not per-cell raycasts), §2.2 heap +
> generation-stamped search state + resumable searches, §2.3 link API (unused),
> §3.1 TargetRegistry, §3.2 anchor resolution using the existing `nearestOpen`
> exposed as `nearestWalkable(x, z, maxRadius)`.
>
> Write `scripts/gen-heightfield.mjs` following the existing
> `scripts/gen-collision.mjs` pattern. Home world has no height field.
>
> Tests: §2.4 as written, with the destination-traversal test integrating
> `navSteer` output in the harness rather than reading `Agent.position`.
> Report actual `cellCount` per destination grid.
>
> Do not implement §3.3–3.7. Do not touch `tickVillagers` — the A2 economy
> split is phase 5.
>
> Constraints: TypeScript strict, no `.js`, no new zustand state, all AI
> timestamps against `agentManager.now`. The AI emits yaw in world convention;
> renderer rig offsets stay in the renderers.
