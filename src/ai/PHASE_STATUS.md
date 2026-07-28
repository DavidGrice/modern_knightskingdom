# NPC AI — phase status

Living checklist for `NPC_AI_SPEC.md`'s §10 build order. **Update this file at
the end of every phase**, before starting the next one. It is the first thing
to hand an assistant that needs to know where the work actually stands.

Read with `PROJECT_CONTEXT.md` — that one explains the codebase this is
landing in and does not change per phase.

Rule from §10: *one phase per session, and no phase starts before the previous
one's debug view works.*

| # | Phase | Status | Debug view |
|---|---|---|---|
| 1 | Skeleton + debug overlay | **done** — 2026-07-27 | ✅ DOM panel, `` ` `` |
| 2 | Navigation | **done — 10/10 iterations** — 2026-07-28, see below | navmesh/path gizmos |
| 3 | Actuation | **done — 7/7 iterations** — 2026-07-28, see below | current-intent readout |
| 4 | Smart objects | not started — **spec verified, plan set** | anchor axes |
| 5 | Utility reasoner | not started — **spec verified, plan set** | ✅ renderer already built |
| 6 | Perception | not started | belief markers, vision cones |
| 7 | Combat + companion | not started | — |
| 8 | LOD tiers + ambient | partially pre-built (see below) | ✅ tier in overlay |
| 9 | LLM dialogue (optional) | not started | — |

---

## Phase 1 — done, 2026-07-27

**Built:** `Agent`, `Blackboard`, `Scheduler`, `AgentManager`, three config
JSONs (`needs` / `archetypes` / `lod`), `AiRuntime` (the single `useFrame`),
`AIDebugOverlay`. One probe agent, `probe_01`, which ticks and prints and has
no mesh and no behaviour — per §10.1.

**Deliberately not built:** `curves.ts` (phase 5), anything under
`decision/`, `perception/`, `navigation/`, `world/`, `actuation/`,
`AIDebugGizmos` (nothing to draw until there are paths or vision cones), and
§11's `memoryStream` / `recall()` — the spec says "not built now".

**Verified** by `scripts/smoke131.mjs`, all passing:
- think rate matches the LOD tier (10.0 / 10 Hz measured)
- needs decay at the authored rate (0.0048 measured vs 0.0049 expected)
- pausing freezes the AI clock (+0.000 s over 1.5 s)
- LOD tier falls A → C as the camera turns away
- **20 agents on a 3-thinks-per-frame budget: worst frame 3 of 3, 5 thinks
  each over 5 s, zero starvation** — the one property §8 really asks for
- overlay renders; `tsc --noEmit` and `next build` both clean

**Carried forward from §8 early:** LOD tier assignment is in `AgentManager`
already, because the Scheduler needs per-tier think rates to exist at all
(§1's file map lists tiering as an `AgentManager` responsibility). Phase 8
still owns the tier-D *behaviours* — statistical simulation, teleport-along-
path, snap-to-navmesh on re-entry — none of which exist and all of which
depend on navigation.

**Design note worth keeping:** needs decay by time elapsed since that agent's
own last think, not by a fixed step. A 0.5 Hz tier-D agent therefore ends up
exactly as hungry as a 10 Hz tier-A one with no separate statistical path.

---

## Phase 2 — spec complete (rev 3), not implemented

**`PHASE_2_NAVIGATION_AND_GATHERING.md` supersedes `NPC_AI_SPEC.md` §7 in full
and is the thing to build against.** It resolves adopt-vs-extend in favour of
**extending `navgrid`**, on the grounds that this world is player-mutable
mid-session — every building placement would invalidate a baked navmesh, and a
tile cache would need a second obstacle representation maintained alongside
`collisionBoxesFor()`, which is the exact desync the current design avoids.
Strengthened further in rev 3: buildings are destroyed *mid-combat* (cannon
splash, rams), so `rebuildNav` runs during the most demanding scene in the
game — a navmesh tile rebuild there is a real hitch, not a hypothetical one.

No phase 2 code exists yet.

### Four gaps found verifying rev 3 against current code, resolved 2026-07-27

Checked against the codebase as it stands today, not as it stood when rev 3
was written — `navgrid.ts` itself changed under it (the O2 divide-guard fix).
All four are now corrected in place in the spec doc:

1. **Destination radii are 213–352, not 224–245** — rev 3's own number came
   from reading only the first two of nine templates. Doesn't change the
   window-mode decision; if anything the real worst case (293, excluding
   home-repurposed template-09) makes the case against content-bounding
   stronger, not weaker.
2. **The 96 m window's justification didn't match `lod.json`** — tier B has
   no outer radius at all (frustum-only), so "exceeds the LOD tier-A/B
   radius" wasn't actually true of anything in config. Resolution: give tier
   B an explicit outer radius matching the window, so the two configs agree
   by construction. One-line config change; do it before §2.0 ships.
3. **The Sealed Crypt has two different "bounds"** — a static `radius: 140`
   in `WORLD_DESTINATIONS` (the wander clamp, same field every destination
   has) versus the real procedurally-generated room layout in
   `game/dungeon.ts`. The fixed grid must size from the actual generated
   layout's AABB, not the static 140.
4. **`TemplateWorld.tsx`'s `mountedRoot` isn't exported** — §2.3's
   rasterization pass needs it and it's currently a private ref. Needs a
   small accessor. Also: there's no isolated "terrain mesh" in a bake to
   traverse — rasterizing the whole scene is the right call anyway (matches
   what the existing raycast already does), but it means baked building
   rooftops become walkable ground for ambient agents. Stated as accepted
   behaviour, not a surprise to find later.

None of these are fundamental — each is a small, now-resolved decision, not a
redesign. The "extend navgrid" call stays right.

### Phase 2 must be implemented before phase 3 resumes — sequencing note, 2026-07-27

Phase 3's iteration plan (below) was written and iteration 3.1 was built
before Phase 2's actual code existed — spec verification is not
implementation, and this file's own dependency ordering said phase 3 needs
phase 2 *merged*, not just planned. Caught mid-session; iteration 3.1 (Agent
lifecycle) is kept because it genuinely never touches navigation — pure
`agentManager.spawn`/`despawn` bookkeeping — so it created no coupling to
undo. **Phase 3 iterations 3.2 onward do not resume until the phase-2
iterations below are merged.** Do not repeat the sequencing mistake in a
future session: check this file's table, not just whether a spec exists.

### Phase 2 — 10-iteration build plan

Ordered by real dependency, not by the spec doc's own section numbers —
terrain exclusions and search internals need nothing else and go first;
`TargetRegistry` doesn't depend on `NavGrid` at all and could run in
parallel with 2.3–2.7 if you want to split effort, but is sequenced last
before verification here for a single linear path.

| # | Branch | What | Depends on |
|---|---|---|---|
| 2.1 | ~~`feature/phase2-1-water-exclusion`~~ | **Merged 2026-07-27 (#20).** `game/navTerrain.ts` leaf module (`TerrainExclusion[]`, `blocked` only); `POND` registered; `rebuildNav`/`findPath` consult it. Fixed a real, previously-shipped bug (villagers/NPCs could path straight through water) — verified live: pond centre blocked, a south-to-north route goes around it | phase 1 merged |
| 2.2 | ~~`feature/phase2-2-search-internals`~~ | **Merged 2026-07-27 (#22).** Binary heap with an index map for O(log n) decrease-key, replacing the O(n) linear open-set scan; generation-stamped `gScore`/`fScore`/`cameFrom` arrays instead of allocating per search. Pure perf, zero API change — verified live: water routing still correct post-refactor, a 141m path finds a real 8-corner route, identical start/goal returns byte-identical results across repeated calls, 200 consecutive calls with varying endpoints all succeed | phase 1 merged (independent of 2.1) |
| 2.3 | ~~`feature/phase2-3-navgrid-class`~~ | **Merged 2026-07-27 (#24).** Module-level singleton extracted into an instantiable `NavGrid` class; `getNavGrid(null)` returns the home grid. Found and handled a real gap the original spec's caller audit missed — `Enemies.tsx` calls `findPath`/`rebuildNav` *directly*, bypassing `navSteer` entirely — by keeping every top-level function as a thin delegating wrapper, so no caller needed to change. Verified live: smoke133/134 re-run **unchanged** produce byte-identical `pathLen`/`longPathLen`/corner counts to before the refactor; `getNavGrid` singleton behavior and its non-home-region error boundary both confirmed | 2.1, 2.2 |
| 2.4 | ~~`feature/phase2-4-destination-window`~~ | **Merged 2026-07-27 (#26).** Window-mode grids for destinations, config in `src/ai/config/navgrid.json` (halfExtent 48, recentreAt 24) so 2.7's LOD fix reads the same number. `getNavGrid(region)` creates/caches a real grid for any `WORLD_DESTINATION_BY_ID` entry; `'dungeon'` still throws (2.6). Path-chaining approximated as a one-search boundary clamp rather than the spec's literal per-edge-cell evaluation — same practical outcome, no multiplied search cost. **Caught and fixed a real crash risk before shipping:** `'dungeon'` is a live, reachable `st.destination` value (verified by grep, not assumed), so the naive AiRuntime wiring would have thrown every frame in the Crypt. Verified live: smoke133/134/135 unchanged still pass; new window-mode checks (creation, hysteresis, recentre, path-chaining, Crypt safety) all confirmed — one real test bug found along the way, direct writes to `playerState.x/z` silently do nothing (it's a write-only mirror, already documented in `PROJECT_CONTEXT.md`), fixed by using `pendingTeleport` | 2.3 |
| 2.5 | ~~`feature/phase2-5-height-rasterization`~~ | **Merged 2026-07-27 (#29).** `getMountedRoot`/`getMountedRegion` exported from `TemplateWorld.tsx`; window-mode `NavGrid`s get a per-cell height field, rasterized at runtime from the mounted bake's real triangles (max-Y-per-cell via barycentric interpolation, one pass) rather than an offline bake or a per-cell raycast. Rasterization is lazy (first `findPath`/`heightAt` after build or recentre) and guards against painting the wrong region's geometry, since `mountedRoot` is one global ref shared by whichever destination happens to be mounted. `findPath`'s neighbour loop unlinks a cell pair whose rasterized `\|Δy\|` exceeds `maxStep` (0.6 m), same treatment as a blocked cell; home stays flat, no height field, check never fires there. Verified live: rasterized `heightAt` agrees with the existing `sampleTemplateGroundY` raycast within a metre; template-05 and template-07 both turned out to have genuine 17–21 m cliffs, and `maxStep` correctly rejected a direct path across them while ordinary short-range pathing on the same grid was unaffected — the literal "3 m cliff, no path" scenario from §2.5's master checklist, confirmed for real rather than left for 2.10 to discover. smoke134/135/136 re-run unchanged, no regressions | 2.4 |
| 2.6 | ~~`feature/phase2-6-crypt-grid`~~ | **Merged 2026-07-27 (#31).** Fixed-mode grid for the Sealed Crypt, sized from an AABB over `game/dungeon.ts`'s actual generated layout — **not** `WORLD_DESTINATIONS`'s static bound, which now itself derives from `dungeon.ts`'s own `REACH_LIMIT`/`DUNGEON_ORIGIN` rather than a second hand-copied pair. **Building this caught a real, pre-existing Phase 17 bug and required fixing it first:** `findPath` from entry to boss returned null on every attempt — the dungeon's wall segments were spaced 4m apart on a comment claiming that matched the `stonewall` piece's real width, but the piece is genuinely 8m wide, so three overlapping segments spilled several metres past each room's boundary, deep into the interior. Rather than patch the spacing constant, the generator was redesigned into a branching tree of variously-sized rooms (every wall side now tiles in whole 8m segments flush with the room's true edge, by construction — the overlap class of bug can't recur), with an explicit `DungeonCorridor[]` replacing the old array-adjacency corridors `DungeonScene.tsx` depended on. `PlayerController.tsx`/`Enemies.tsx` needed zero changes — verified, not assumed, both already depend only on `{x,z,rot}`/room-agnostic fields. **Process note:** a plan-mode lapse happened mid-task — jumped into implementing the redesign before presenting the plan for approval; the user caught it, work was rolled back into plan mode properly before continuing. Verified live across 6 fresh descents (`smoke139.mjs`, replacing the now-invalid `smoke138.mjs`): every room reachable from entry (not just the boss), wall positions matching an independent geometric re-derivation exactly, no spillover into any room interior, PlayerController/navgrid collision agreement, meaningful boss placement (farthest leaf by hop count), world-bound containment. smoke134/135/136 unchanged, no regressions | 2.3 |
| 2.7 | ~~`feature/phase2-7-lod-tier-b-fix`~~ | **Merged 2026-07-28 (#33).** `AgentManager.refreshTiers` now forces Tier C for a windowed-region agent outside the nav grid's own window bound, regardless of frustum — fixed regions (home, Crypt) stay unbounded, exactly `NPC_AI_SPEC.md` §8's corrected table. The bound is read from the *same* `NavGrid` instance iteration 2.4's `recentre()` already uses each frame (`AiRuntime.tsx`), not a second copy of the number. `getNavGrid` is deliberately **not** imported into `AgentManager.ts` — doing so would create a real import cycle (`AgentManager → navgrid → TemplateWorld → gameStore → AgentManager`, confirmed via the actual import edges) — so `AiRuntime.tsx` computes the bound and passes it through as a plain `{originX,originZ,halfExtent}` parameter instead. Added `Agent.boundCapped`, a small permanent debug flag (shown in the phase-1 overlay) distinguishing "forced to C by the window bound" from "out of frustum" — turned out to be what made this verifiable at all, since a frustum-based smoke test kept reading as flaky until it was traced to an **unrelated pre-existing issue**: this destination's camera Y drifts upward tens of metres over a few seconds with zero input (confirmed via a temporary diagnostic, not yet investigated — flagged for a future session, not fixed here). `boundCapped` sidesteps it entirely since it's set before the frustum check runs. Verified live: a fixed-region agent 200m out never boundCapped; a windowed agent inside the window never boundCapped; one 20m past the edge always boundCapped and forced to C. smoke131/132/134/135/136 unchanged, no regressions — also fixed a leftover `dBladder`/`dPurpose` rename bug in `smoke131.mjs` from the earlier needs-schema rework | 2.4 |
| 2.8 | ~~`feature/phase2-8-target-registry`~~ | **Merged 2026-07-28 (#35).** `TargetRegistry` (`src/ai/core/TargetRegistry.ts`): composite `TargetId` (`'node:17' \| 'bldg:42'`) unifying `st.nodes` and the building array; `queryNearby`/`reserve`/`release`/`get`, capped at 12, computed fresh from live store state every call (only reservations persist). `reserve()` enforces the target's `anchorRule.slots` capacity. New `src/ai/config/anchors.json` + `AnchorRule`/`anchorRuleFor()` in `config/index.ts` supply that capacity now, even though turning a rule into an actual walkable point is 2.9's job — fishing's `fallbackRadius` derives from the real `POND.radius + 4` (`game/data/world.ts`), not a second hardcoded number. **Confirmed for real, not just per the spec's own claim:** `'tree'` genuinely exists as both a resource-node kind and a real buildable id ("Garden Tree", `buildables.ts:122`) — the exact id-space collision §3.1 warns about. `targetRegistry.clear()` wired into `newGame`/`loadFromSave` alongside `agentManager.clear()`. The resulting `gameStore <-> TargetRegistry` import cycle (both sides only touch the other's exports inside function bodies, never at module top-level) was verified safe via a real production build, not just typecheck. Verified live: a real tree node and a synthetic tree building at the same point produce distinct ids with independent reservations; slot-capacity enforced and released correctly; `get()` on an unknown/malformed id returns null; every node reports `region: null`. smoke131/132 unchanged, no regressions | phase 1 merged (independent of 2.1–2.7) |
| 2.9 | ~~`feature/phase2-9-anchor-resolution`~~ | **Merged 2026-07-28 (#37).** `src/ai/core/AnchorResolution.ts`'s `resolveAnchor(target, fromX, fromZ)`: radial mode samples 8 points on the rule's own circle, discards non-walkable, picks the one nearest the *agent* (not the target, so two agents approaching the same stockpile from different sides don't aim for the same slot), faces the target's centre; falls back to `nearestWalkable` (2.1/2.3, `fallbackRadius` converted from world units to cells via the grid's own `cellSize`) when every sample is blocked. Fixed mode rotates the rule's local offset by `target.rot*90°` using the *exact same* rotation formula `collisionBoxesFor` already uses for building geometry, not re-derived — that code's own comment documents a real bug this codebase already shipped once from getting the rotation direction backwards. `getNavGrid` throwing (unknown region, or `'dungeon'` with no layout) is caught and returns `null`. **Caught the hard way, via a real runtime error, not assumed:** a brand-new standalone module isn't in the client bundle at all unless something actually imports it — needed a side-effect `import './core/AnchorResolution'` from `AiRuntime.tsx` purely so its own `window.__kkanchor` debug exposure could exist. Verified live: fixed-mode rotation matches hand-derived expected offsets exactly at all 4 quarter-turns; a real tree node resolves to a walkable point at exactly its rule's radius; a synthetic fishing target at the pond's own centre (guaranteeing every sample is blocked) correctly falls back to a walkable bank point; an unresolvable region returns null, never throws. smoke131/132/141 unchanged, no regressions | 2.1, 2.3, 2.8 |
| 2.10 | ~~`feature/phase2-10-verification`~~ | **Merged 2026-07-28 (#39). Phase 2 complete.** Full §2.5 suite rolled into one pass — most items already had a dedicated smoke test from an earlier iteration (water 2.1, search-hygiene 2.2, window sizing/recentre 2.4, `maxStep` cliff rejection 2.5, Crypt chamber-to-chamber pathing 2.6); re-ran that whole suite unchanged as this iteration's own regression pass. The remaining items (gate-vs-wall, mid-raid rebuild, `nearestWalkable` inside a footprint, `navSteer` monotonic approach) needed real new coverage, and the first one found a genuine, previously-shipped bug: `NavGrid.rebuild()` never checked `gateOpen` at all, so every gate — open or closed — was permanently solid to `findPath`/`navSteer`, while `PlayerController.tsx`'s own player-collision loop already correctly treated an open gate as passable. Fixed to match, plus a second related gap: `toggleGate()` never gave `buildings` a new array reference, so even after the collision fix the existing 1Hz `rebuildNav` poll in `Enemies.tsx` — which only re-stamps on a reference change — would never notice a gate being opened or closed. Added `navSteer` to `window.__kknav`'s debug exposure to test the checklist's own "integrate navSteer output in the harness" item directly. Verified live: a gate is walkable and a same-shaped stonewall isn't; a mid-path wall is genuinely blocked while it stands and walkable immediately after removal+rebuild; `nearestWalkable` escapes a building's own footprint; a simulated 20-game-second `navSteer` walk closes distance monotonically until arrival. Two test-authoring bugs caught and fixed along the way (checking "blocked during" after the wall was already removed; treating ordinary post-arrival jitter as a monotonicity violation) — neither was a product bug. Full smoke131–142 suite re-run clean: phase 2 holds together end to end | 2.1–2.9 |

---

## Phase 4 — design note carried from before verification

§4.1 wants `ANCHOR_` empties baked into each prop in Blender. This game's
furniture is **placed by the player at runtime** on a build grid, so there is
no per-instance scene node to read an anchor from. An anchor has to be derived
from `type + x + z + rot` via a lookup table instead — which changes the shape
of the affordance JSON. Also note there are only 15 animation clips and none
of them is a sit, sleep, eat or use-object clip (`PROJECT_CONTEXT.md` §4).
`PHASE_3_4_5_ACTUATION_AND_REASONER.md` §4.4 now specifies this table for
real; it's superseded as an open question and folded into the iteration plan
below.

---

## Phase 3/4/5 — verified 2026-07-27, iteration build plan

`PHASE_3_4_5_ACTUATION_AND_REASONER.md` is checked against the current
codebase (not just the phase-1 shape it was drafted against) and corrected in
place — see its own "Correction:" callouts for the four findings: §3.0's real
splice mechanism (seven `navSteer` sites in `Villagers.tsx`, one in
`Npc.tsx`, and no villager has an `Agent` yet at all), §3.1's Intent storage
location, §3.3's actual attach point (`rig.joints.rightarm`, not a
nonexistent `righthand`), and §5.1's `logit` `NaN` guard.

This section is the execution plan those findings feed: phases 3–5 broken
into 20 independently-shippable iterations, each its own branch and PR,
following the same one-thing-at-a-time discipline the rest of this project's
history already runs on. **Do not batch iterations into one PR** — the point
of the split is that each is small enough to verify on its own, and a bug
found against two trivial synthetic actions (5.5) is a five-minute fix; the
same bug found entangled with node reservations and depletion state is not.

**Verify `merged: true` before deleting a branch, not just "0 open PRs."**
Found the hard way on iteration 2.2: `ci.yml` fires TWICE per push (once on
`push`, once on the PR's own `pull_request` event — see `CONTRIBUTING.md`'s
explanation of why the `push` trigger has to exist at all). The `push`-
triggered run can succeed while the `pull_request`-triggered one is still
queued, and "0 open PRs" in a list query is also true for a PR that just
CLOSED WITHOUT MERGING — which is exactly what happened when the still-open
PR's branch got deleted while its `pull_request`-triggered check was stuck
`in_progress`: GitHub auto-closes a PR whose source branch disappears. The
commit was recoverable (still referenced by the closed PR, `git fetch origin
<sha>` pulled it right back), so nothing was lost, but it cost a detour.
**Always check the single-PR endpoint's `merged` field (`gh pr view` or
`GET /pulls/{number}`) explicitly before deleting a branch — a list query
answers "is it still open," not "did it merge."**

**Branch naming.** `<type>/<slug>`, matching what CI already enforces
(`^(feature|enhancement|bugfix|chore|docs)/[a-z0-9._-]+$` — no nested paths,
a branch like `feature/phase3/foo` fails the `Branch name` check on every
push and can never auto-merge). Each iteration below names its branch in that
flat form, encoding the phase and iteration number in the slug itself
(`feature/phase3-1-agent-lifecycle`), which sorts and reads the same way a
nested path would without breaking CI.

**Sequencing.** Iterations within a phase are numbered in dependency order —
3.2 needs 3.1 merged, not just written. Phase 4 needs phase 3 merged in full
(the Actuator has to exist to consume the new Blackboard fields). Phase 5
needs phase 4 merged in full, and *within* phase 5, 5.1–5.5 (the reasoner
core) must merge and pass 5.5's synthetic-action verification before 5.6
starts — that gate is §5.0/§5.5's own explicit instruction, not something
this plan added.

### Phase 3 — Actuation (7 iterations)

| # | Branch | What | Depends on |
|---|---|---|---|
| 3.1 | `feature/phase3-1-agent-lifecycle` | Spawn/despawn an `Agent` per roster villager (mirrors `registerVillagerMob`'s lifecycle) — the prerequisite §3.0 assumed already existed and doesn't | phase 2 merged |
| 3.2 | ~~`feature/phase3-2-intent-type`~~ | **Merged 2026-07-28 (#41).** `Intent` union type (`MOVE_TO`/`MOVE_TO_ANCHOR`/`PLAY_ANIM`/`FACE`/`IDLE`, `ATTACK` deferred per §5.9) and `Agent.intent: Intent \| null`, a plain mutable field alongside `position`/`yaw` — not on `Blackboard`, which is belief/need state the reasoner scores against, not what it produces. `MOVE_TO_ANCHOR` carries a real `TargetId` from phase 2's `TargetRegistry` (2.8), not a bare string. Small and deliberately additive — no locomotion wiring (3.3/3.4) or debug readout (3.6) yet. Verified live: starts null, every variant round-trips as a plain field, doesn't disturb unrelated agent state. smoke131/132 unchanged, no regressions | 3.1 |
| 3.3 | ~~`feature/phase3-3-locomotion-villagers`~~ | **Merged 2026-07-28 (#43).** `src/ai/core/Locomotion.ts`'s `stepLocomotion(agent, dt)`: `MOVE_TO`/`MOVE_TO_ANCHOR` call `navSteer` and advance `agent.position`; `FACE` lerps yaw without moving; `IDLE`/no intent holds. Writes `agent.bb.movement`. `MOVE_TO_ANCHOR` resolves through phase 2's `TargetRegistry.get()` + iteration 2.9's `resolveAnchor()`; an unresolvable target reports `blocked`, never throws. The per-agent `navSteer` path cache lives in Locomotion's own private `Map`, not on `Agent` — actuation-internal, not decision state. Spliced into `Villagers.tsx` as a new branch inserted first, checked before all seven existing `navSteer` call sites (re-confirmed by reading the file directly, still seven, unchanged since §3.0's original verification); only diverts when the Agent has an active `MOVE_TO`/`MOVE_TO_ANCHOR` intent, resyncing the legacy steering state on handoff so control can pass either direction without a visible teleport. Verified live against a real rendered villager: `MOVE_TO` and `MOVE_TO_ANCHOR` both drive real movement and arrive correctly (the anchor case within its rule's radius, not at the target's exact centre); an unresolvable anchor target holds position and reports `blocked` across every sampled frame; `FACE` (tested directly against `stepLocomotion`, since `Villagers.tsx` correctly doesn't route to it this iteration) rotates yaw and holds position exactly; clearing intent falls back to the old cascade cleanly. smoke131/132/144 unchanged, no regressions | 3.2 |
| 3.4 | ~~`feature/phase3-4-locomotion-npc`~~ | **Merged 2026-07-28 (#45).** Same splice into `Npc.tsx` (`CourtNpc`'s `useFrame`), checked first and unconditionally — deliberately *not* gated behind the existing `schedule` flag, since an agent+active-intent check should be the only gate (mirrors `Villagers.tsx`'s own philosophy of not coupling to unrelated business logic like `job`). **Found the same missing-prerequisite gap 3.1 found for roster villagers, this time for court NPCs:** nothing spawned an `Agent` for any court NPC at all before this iteration — fixed by adding `src/ai/npcSync.ts` (mirrors `rosterSync.ts`, but compares its 3 raw inputs directly since `scheduledCourtNpcs()` returns a fresh array every call) and its `scheduledCourtNpcs()` helper in `game/data/npcs.ts`, wired into `AiRuntime.tsx`/`gameStore.ts` alongside the existing villager sync. **Real content finding, verified not assumed:** with today's `NPCS` roster, `scheduledCourtNpcs()` always returns `[]` — king/queen/richard/john/storm all have `world` set (destination residents, excluded), and the two always-present starter farmers (Alric/Beda) have no `revealAfterQuest` at all (excluded the other way). So the splice mechanism is real and tested, but presently inert against live content until a future NPC satisfies both conditions. **Bug caught in this iteration's own new code, via its own smoke test:** the first version placed the splice *after* the `if (!schedule) return` early-return: reasoned (wrongly) that since unscheduled NPCs never naturally have an Agent, placement didn't matter — true for the sync path, false for testability and for any future one-off intent assignment to a static NPC. Fixed by moving the check unconditionally first, matching `Villagers.tsx`'s pattern. Verified live (`smoke146.mjs`): confirms zero gated NPCs have an Agent under today's content even with every gating quest forced complete; splice mechanism itself verified by manually spawning an Agent on the always-rendered `farmer_alric` and issuing a real `MOVE_TO` — progresses, arrives, mob mirror stays in sync, no page errors. smoke131/132/144/145 unchanged, no regressions | 3.2 (not 3.3 — independent) |
| 3.5 | ~~`feature/phase3-5-animation-controller`~~ | **Merged 2026-07-28 (#47).** `PLAY_ANIM` wired into both `Villagers.tsx` and `Npc.tsx`: a new branch checked right after the MOVE_TO/MOVE_TO_ANCHOR splice (same unconditional agent+intent gate, 3.3/3.4's rule), holds position (Locomotion never touches it for this intent) and drives the render's clip to `intent.clip`. `loop` is resynced in one place, before either early-return branch — covers entering AND leaving PLAY_ANIM in a single check, since the legacy cascade always wants `loop=true` (every hand-written clip there is a continuous cycle, never a one-shot) while PLAY_ANIM needs `intent.loop` to actually control it (Npc.tsx's `loop` had been an inline JSX expression derived from `clip` alone — moved into a synced field so intent can override it, same computed rule otherwise). **`ResourceProp`** (`components/character/Equipment.tsx`): one procedural mesh per real resource kind (`ItemId`, matching `JobDef.produces` — wood/stone/wheat/gold, generic sack fallback), portaled onto `rig.joints.rightarm` using the same hand-local offset family `HeldHalberd`/`HeldCrossbow` already use, not re-derived. Gated on a new `Blackboard.carrying: {resource, amount} | null` field, defaulting to `null` — the same "field lands now, behaviour comes later" precedent `reservation`/`currentActionId` already set in phase 1 for phases 4/5; the *semantics* (capacity default, live gather/haul wiring) stay phase 4.1/5.7's job untouched, this iteration only builds the render-side attach point per §3.3's own "phase 5 will need this, build the attach point now." Added `VillagerMob.clip`/`NpcMob.clip` (debug-only, mirrors each renderer's own `clip` state every frame) since nothing else was exposed to confirm which animation actually ended up playing — the actual thing this iteration needed to verify. **One real test bug caught, not a product bug:** the first version of `smoke147.mjs` force-set `agent.position` to a hardcoded point immediately before checking PLAY_ANIM holds position, racing `rosterSync.ts`'s existing `mirrorVillagerPositions()` (3.1, mirrors mob→agent.position every frame) — the override got silently clobbered back to wherever the pre-3.5 wander cascade had already left the villager before the intent took effect. Fixed by reading the natural starting position immediately before engaging PLAY_ANIM and checking it holds *there*, the same first-vs-last comparison shape already used for 3.3's MOVE_TO check. Verified live: a one-shot clip (`loop:false`) holds position and renders the intent's exact clip; switching to a second `loop:true` clip updates correctly, not stuck on the first; the same check against `Npc.tsx`'s splice on `farmer_alric`; `ResourceProp` mounts/unmounts across several real resource kinds plus an unrecognized id (fallback path) with zero page errors; clearing the intent falls back cleanly. smoke131/132/144/145/146 unchanged, no regressions | 3.3, 3.4 |
| 3.6 | ~~`feature/phase3-6-debug-intent-readout`~~ | **Merged 2026-07-28 (#49).** `AIDebugOverlay` gains an `INTENT` row: type + params (a plain switch per `Intent` variant, `describeIntent()`), elapsed time, and `bb.movement.status`, right after the existing `ACTION` row. Elapsed needed a timestamp nothing tracked before this — `Agent.intent` became a private-backed accessor (`_intent` + `get`/`set intent`) so `intentSetAt` stamps itself against `AgentManager.now` on every assignment, transparent to every existing call site (`agent.intent = {...}` reads identically whether it's a plain field or an accessor). That setter needs `agentManager.now`, and `AgentManager.ts` already imports `Agent` at its own top level to construct instances — a real cycle, resolved the same way this module graph's other cycles already are (`gameStore`↔`TargetRegistry`, `navgrid`→`gameStore`): the import sits at `Agent.ts`'s top level but `agentManager` is only ever dereferenced inside the setter's function body, never at module-evaluation time, verified safe via a real production build. Verified live (`smoke148.mjs`): no intent renders as `—`; a real `MOVE_TO`'s type/params/`MOVEMENT` all appear in the rendered text; elapsed increases over real time and resets to ~0 the moment a new intent replaces the old one; elapsed freezes while the game is paused, matching phase 1's already-established "pausing stops the AI clock" property since it derives from the same `AgentManager.now`. One test-calibration issue caught, not a product bug: the first version asserted elapsed should grow by close to the real wall-clock wait duration — `AgentManager.update()`'s own documented 0.05s-per-frame dt clamp means the AI clock genuinely runs slower than wall time under this headless SwiftShader renderer (the same divergence `smoke131.mjs` already works around by measuring its own "clock advanced" value rather than assuming 1:1), so the check was loosened to "monotonically increasing," not a specific rate. smoke131/132/144/145/146/147 unchanged, no regressions | 3.2 |
| 3.7 | ~~`feature/phase3-7-verification`~~ | **Merged 2026-07-28 (#51). Phase 3 complete.** Chained a real intent queue (`MOVE_TO` → `FACE` → `IDLE`) against one real rendered villager and checked every §3.5 bullet in one continuous run, not four separate synthetic setups. **Found and fixed a real, load-bearing gap along the way:** `FACE` was never wired into either renderer's splice — `MOVE_TO`/`MOVE_TO_ANCHOR` (3.3/3.4) and `PLAY_ANIM` (3.5) each got their own branch, `FACE` silently fell through to the legacy cascade instead. Not cosmetic: `NPC_AI_SPEC.md` §3's own `GotoAndUse` activity chains `MOVE_TO_ANCHOR` → `FACE` → `PLAY_ANIM` (phase 5's gather/haul, and every future affordance action) — without this fix, a villager would visibly wander off mid-interaction during the align phase, only picked back up once `PLAY_ANIM` engaged. Fixed identically in `Villagers.tsx`/`Npc.tsx`: `stepLocomotion` already implemented the yaw-lerp-without-moving behavior (§3.2), it just needed a branch calling it. **`IDLE` deliberately did NOT get the same fix** — confirmed by design, not an oversight: §5.4 lists `idle` as one of the reasoner's own intrinsic candidate actions, `Agent.intent` already defaults to `null` (not `IDLE`) at spawn, and every splice condition since 3.2 has only ever named `MOVE_TO`/`MOVE_TO_ANCHOR`/`PLAY_ANIM`/`FACE` — so today, `IDLE` correctly means "no active override," letting the legacy wander/job cascade keep running underneath it, same as no intent at all. `stepLocomotion`'s own "IDLE holds" behavior is still real (verified directly), it's just never renderer-invoked for `IDLE` by design. Verified live (`smoke149.mjs`): the minifig visibly walks 14m and stops; `villagerMobs` (the exact object `Minimap.tsx` reads) mirrors the agent's position every sampled frame, confirming §3.0's "no additional code" claim for the minimap by reading the actual consumer, not assuming; `bb.movement` transitions `moving` → `arrived`; yaw tracks travel heading mid-leg and snaps to face a point on `FACE`; `IDLE` produces no incident through the renderer and holds cleanly when `stepLocomotion` is called on it directly. smoke131/132/144/145/146/147/148 unchanged, no regressions | 3.3–3.6 |

### Phase 4 — Blackboard & Anchors (3 iterations)

| # | Branch | What | Depends on |
|---|---|---|---|
| 4.1 | `feature/phase4-1-blackboard-fields` | `carrying`, `carryCapacity` (flag the default — §4.3 calls this a gameplay-feel decision, not silently pick one), `job` as a **live read**, never a stored copy (§4.2 — this project has hit the two-sources-of-truth bug enough times already) | phase 3 merged |
| 4.2 | `feature/phase4-2-anchor-rules` | Anchor rule JSON (fixed/radial), resolution wired to `Target.anchorRule`; resolve `fallbackRadius`'s `POND.r + 4` once at startup, not per query | 4.1 |
| 4.3 | `feature/phase4-3-verification` | Fixed anchors correct across all 4 `rot` values; `fishing` radial anchor resolves to a bank cell (needs phase 2 §2.1's water exclusion, already live); a live roster reassignment updates `bb.job` within one think tick | 4.1, 4.2 |

### Phase 5 — Reasoner core, then gathering (10 iterations)

**5.1–5.5 first, verified on synthetic actions, before 5.6 touches anything
real — this is a hard gate, not a suggestion (§5.0/§5.5).**

| # | Branch | What | Depends on |
|---|---|---|---|
| 5.1 | `feature/phase5-1-curves` | `evalCurve` — five curve types, **with the `logit` NaN guard** | phase 4 merged |
| 5.2 | `feature/phase5-2-scoring` | `Consideration` + compensated `scoreAction` | 5.1 |
| 5.3 | `feature/phase5-3-commitment` | Category weights + `interruptPriority` table; momentum (×1.25), 15% switch threshold, cooldowns | 5.2 |
| 5.4 | `feature/phase5-4-candidate-assembly` | Intrinsic actions + per-target expansion via `TargetRegistry.queryNearby` — one candidate **per target**, not per action | 5.3 |
| 5.5 | `feature/phase5-5-reasoner-core-verification` | **Gate.** Two synthetic trivial actions (`idle` vs. a fake `wander` on a random threshold) in the debug overlay — confirm scoring, compensation, momentum and switch threshold all behave *before* anything real sits on top | 5.1–5.4 |
| 5.6 | `feature/phase5-6-flee-sleep` | `flee_to_safety`/`sleep` as utility-gated wrappers around the *existing* raid-flee/bed-seek functions (don't reinvent target selection); delete the old direct-trigger paths once both route through the reasoner | 5.5 passed |
| 5.7 | `feature/phase5-7-gather-haul` | `gather_resource`/`haul_to_deposit` actions + `GatherAtNode`/`HaulToDeposit` activities, fully specified in `PHASE_2_NAVIGATION_AND_GATHERING.md` §3.4–§3.7 | 5.6 |
| 5.8a | `feature/phase5-8a-worksignal-neutral` | `workSignal` leaf module; `tickVillagers` reads it for AI-driven villagers only, falls through unchanged otherwise; `carrying` **disabled**, yield still lands directly. **Verify: simulate a full game day before/after, income matches within rounding** — a mismatch means presence semantics diverged, a bug not a design change | 5.7 |
| 5.8b | `feature/phase5-8b-hauling-live` | Enable `carrying` for real — yield accrues to the villager, lands on deposit. This is a deliberate economy change (net income drops by haul travel time) — decide compensation or accept the cost explicitly, don't let it arrive as a side effect | 5.8a verified neutral |
| 5.9 | `feature/phase5-9-verification` | Full transition sequence (`gather_resource` → `carrying` → `haul_to_deposit` → inventory increased); slot sharing; id collision (co-located `tree` node + `tree` building); depletion partial-load; abort safety mid-raid; anchor walkability; 60s no-flip-flop | 5.8b |

### After each iteration merges

1. Update this table's row for that iteration (done/date).
2. Save a short project-memory note: what merged, what's next, anything
   discovered that changes a *later* iteration's plan (the way phase 2's
   verification changed phase 3's scope here). Memory is what lets a future
   session pick this back up correctly without re-deriving it.
3. Move to the next iteration in sequence — don't skip ahead across a
   dependency, even if it looks safe.

---

## Not yet touched, and the honest reason

Nothing has migrated off the existing per-frame `if/else` cascades in
`Villagers.tsx`, `Npc.tsx`, `Defenders.tsx` or `Enemies.tsx`, and nothing
should until the system can move a body — phase 3 at the earliest. Villagers
are the obvious first migration (7 branches, all needs-shaped). Enemies are
the riskiest (combat is tuned and players notice).
