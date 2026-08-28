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
| 4 | Smart objects | **done — 3/3 iterations** — 2026-07-28, see below | anchor axes |
| 5 | Utility reasoner | **done — 10/10 iterations** — 2026-07-28, see below | ✅ renderer already built |
| 6 | Perception | **done** — 2026-08-11 (Wave 11), see below | ✅ belief rows + cone/marker gizmos (Alt+`` ` ``) |
| 7 | Combat + companion | **done (combat) / scoped down (companion)** — 2026-08-11 (Wave 11), see below | ✅ COMBAT row + cover/threat gizmo legs |
| 8 | LOD tiers + ambient | **done** — 2026-08-11 (Wave 11), see below | ✅ tier + why · COARSE sweep · `wander` scored |
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
| 4.1 | ~~`feature/phase4-1-blackboard-fields`~~ | **Merged 2026-07-28 (#53).** `carrying` was already live (3.5, inert). `Blackboard` gains `job: VillagerJob \| null` and `carryCapacity: number`, both **live reads** — recomputed every think tick in `Agent.think()` from the actual roster record via a new `useGameStore.getState().villagers.find(...)` lookup, never a stored copy (§4.2's rule, extended to `carryCapacity` too since it has the exact same staleness risk). `carryCapacityOf()` (`game/data/attributes.ts`): base 4 + 1/trade-level (capped at level 10, matching `tradeLevelOf`'s already-slow sqrt curve) + a carrier item bonus (new `Villager.gear.carrier?: 'basket' \| 'cart'`, +4/+10) + a stubbed `externalCapacityBonus()` hook (always 0). **§4.3's "flag the default" instruction resolved through direct back-and-forth with the user, not picked silently**: the level-scaling numbers and carrier bonuses were confirmed explicit before implementation; a "carrier" gear item was floated, initially misread as unclear feedback, then correctly re-added once clarified. The carrier bonus and the building-conferred-bonus stub are **deliberately separate mechanisms** — a worn item vs. a not-yet-designed RTS-style "buildings passively buff villagers just by existing on the grid" system, both logged to `ROADMAP.md`'s "Build system" section (with the actual carrier acquisition — crafting recipe, Armory stock, roster equip UI, visual mesh — also deferred there, since none of that is AI-actuation scope). New `Agent<->gameStore` import cycle (a 4-hop chain through `AgentManager.ts`/`rosterSync.ts`), resolved the same verified-safe way as this module graph's other cycles — confined to `think()`'s function body, checked with a real production build. Verified live (`smoke150.mjs`): the formula matches by hand at several levels/carriers (base 4, level-2 6, level-cap 14, +basket 18, +cart 24); a level-up or carrier equip updates `bb.carryCapacity` within one think tick (frame-synchronized polling, not a fixed wait — a fixed-timeout version of this test read stale data once, a test bug not a product one); a job reassignment updates `bb.job` live and correctly reads the *new* job's own separately-tracked trade level, not the old job's; an agent with no matching villager record (the phase-1 probe) reports `job: null, carryCapacity: 0` rather than stale data. smoke131/132/144–149 unchanged, no regressions | phase 3 merged |
| 4.2 | ~~`feature/phase4-2-anchor-rules`~~ | **Merged 2026-07-28 (#55).** Verified against the real code before writing anything — most of this row's own description was already shipped: the anchor rule JSON and `Target.anchorRule` wiring landed in 2.8, `resolveAnchor()` in 2.9, both confirmed by reading `TargetRegistry.ts`/`AnchorResolution.ts` directly. The one real gap left by §4.4: `anchorRuleFor()` recomputed `POND.radius + 4` and allocated a fresh merged object on **every single call** instead of resolving it once at startup. Fixed with a `WeakMap<AnchorRule, AnchorRule>` cache keyed by the base rule object (not just the fishing kind), so it stays correct even if a future second "fishing" entry appeared under `buildings` (checked `anchors.json` directly — there isn't one today, only under `nodes`). Verified live (`smoke151.mjs`, closing a real coverage gap `smoke142.mjs` left — that test only ever exercised `resolveAnchor()` against a *synthetic* fishing target with `fallbackRadius` hardcoded directly, never actually calling `anchorRuleFor()`): querying the real always-present `fishspot` node twice through `TargetRegistry` produces a `fallbackRadius` of 12 (matching `POND.radius(8) + 4` by hand) and, critically, the **same object reference** both times — direct proof it's cached, not recomputed. smoke131/142/150 unchanged, no regressions | 4.1 |
| 4.3 | ~~`feature/phase4-3-verification`~~ | **Merged 2026-07-28. Phase 4 complete.** A confirmation-only iteration, no new production code — checking this row's own checklist against the real code first (same discipline 4.2 just demonstrated) found all three items already covered by existing tests: fixed-rotation anchors across all 4 `rot` values and the fishing radial-to-bank-cell fallback were verified in 2.9's `smoke142.mjs`; a live roster reassignment updating `bb.job` within one think tick was verified in 4.1's `smoke150.mjs`. Re-ran both fresh on the fully-merged phase-4 state (not just trusting the earlier per-iteration runs) rather than writing redundant new tests for already-proven behavior — the same "most items already had a dedicated smoke test" rollup 2.10 already established as a legitimate pattern for a phase's closing verification iteration. smoke131/142/149/150/151 all confirmed clean | 4.1, 4.2 |

### Phase 5 — Reasoner core, then gathering (10 iterations)

**5.1–5.5 first, verified on synthetic actions, before 5.6 touches anything
real — this is a hard gate, not a suggestion (§5.0/§5.5).**

| # | Branch | What | Depends on |
|---|---|---|---|
| 5.1 | ~~`feature/phase5-1-curves`~~ | **Merged 2026-07-28 (#58).** `src/ai/core/curves.ts`: `Curve`/`CurveType`/`evalCurve` — linear/quadratic/logistic/logit/bool, faithful port of `NPC_AI_SPEC.md` §5.3 with the `logit` NaN guard (`t <= 0 \|\| t >= 1` returns 0 before the log, never lets a non-positive or ≥1 ratio reach `Math.log`). Preceded by a full validation pass confirming nothing built in phases 2–4 works against Phase 5: found real, precisely-located gaps to close as Phase 5 proceeds (`Blackboard.reservation`'s field names don't match `TargetRegistry.reserve()`'s real model; `archetypes.json`'s intrinsic lists are missing `gather_resource`/`haul_to_deposit`/`flee_to_safety`/`sleep` entirely; `TargetRegistry.queryNearby`'s real 6-argument signature differs from both spec docs' pseudocode; `Context`/`Agent.currentActivity` are never actually defined anywhere; the `tradeXp` +10/trip award is hardcoded inside `tickVillagers`, not a reusable function 5.8a can call) — none blocking, all now tracked for the iterations that touch them. Also confirmed the actuation layer built in phase 3 is exactly what `GotoAndUse`/`flee_to_safety`/`sleep` need: the raid-flee and night-bed-seek cascade branches in `Villagers.tsx`/`Npc.tsx` only run when no Agent intent is active, so 5.6's reasoner-driven versions will take over automatically via the already-built `MOVE_TO` splice, zero renderer changes required. Verified with a standalone `npx tsx` script (no browser needed — pure math): every curve type checked against hand-derived values, the NaN guard confirmed at both `t<=0` and `t>=1`, plus an exhaustive sweep across curve types/params/inputs confirming nothing ever escapes `[0,1]` as `NaN`/`Infinity`. Also logged a real gap found along the way — stockpiles have zero storage-capacity mechanic today (confirmed by reading `gameStore.ts`: `addItems()` writes into one global uncapped inventory, stockpile only affects work-presence and flavor text) — to `ROADMAP.md`, deferred until after 5.8b ships | phase 4 merged |
| 5.2 | ~~`feature/phase5-2-scoring`~~ | **Merged 2026-07-28 (#60).** `src/ai/core/Reasoner.ts`: `Context` (`{target, now}` — never actually typed in either spec doc, resolved here since 5.4's per-target expansion needs a candidate to know which target it's scoring against), `Consideration`, `Category`, `Action`, and `scoreAction` — the IAUS compensation factor, verbatim from `NPC_AI_SPEC.md` §5.4, with one defensive addition beyond the literal pseudocode: a zero-consideration action would divide by zero computing `modFactor` there (`1 - 1/0`), guarded here since an always-on candidate with no considerations is legitimate, not an error. Also fixed the `Blackboard.Reservation` gap found during the phase-5 validation pass: was `{objectId, affordanceId}` (a phase-1 guess predating `TargetRegistry`), now `{targetId: TargetId, slotKind: string}` matching `TargetRegistry.reserve()`'s real signature exactly — confirmed via grep that nothing else in the codebase referenced the old field names, a clean, isolated rename. `Reasoner.ts` needed a side-effect import into `AiRuntime.tsx` to land in the client bundle, same reason `AnchorResolution.ts` needed one in 2.9. Verified live (`smoke152.mjs`, via a new `window.__kkreason` debug hook, real Playwright since `Agent` construction touches enough of the game store's own module graph that a standalone Node script wasn't worth the risk `curves.ts`'s pure-math 5.1 test didn't have): the compensation factor beats a naive uncompensated multiply and matches a hand-derived value exactly (0.390625 for two 0.5-scoring considerations); a zero-yielding consideration hard-gates the action to score 0 AND stops evaluating anything after it — proven via a side-effect counter, not just the final score, so `ScoredAction.considerations` only ever contains what actually ran; the zero-consideration edge case returns a finite weight-only score, never `NaN`; weight scales the final score linearly. smoke131/142/150 unchanged, no regressions | 5.1 |
| 5.3 | ~~`feature/phase5-3-commitment`~~ | **Merged 2026-07-28 (#62).** `Reasoner.ts` gains `CATEGORY_WEIGHT`/`CATEGORY_INTERRUPT_PRIORITY` (reference tables for content authors — `Action.weight`/`interruptPriority` stay real per-action fields since a real action can deliberately deviate, e.g. `haul_to_deposit`'s 1.4 vs `work`'s 1.2), `pickAction` (the full commitment decision — cooldowns force a candidate to score 0; under `minDuration` only a strictly-higher-`interruptPriority` challenger can interrupt, compared only against other interrupt-eligible challengers, never against the running action's own score; past `minDuration`, momentum ×1.25 + the 15% switch threshold apply), and `startCooldown`. Also updates `archetypes.json`'s content (found missing during validation): `villager` gains `flee_to_safety`/`sleep`/`gather_resource`/`haul_to_deposit`; `guard`'s `"flee"` renamed to `"flee_to_safety"` (confirmed unused by any live code first); `guard` deliberately did NOT gain `sleep` — defenders keep opposite hours and are still driven by `Defenders.tsx`, not this reasoner, so their rest behavior stays an open question rather than a silent assumption. **A real bug caught by this iteration's own smoke test, not a test bug:** the first `pickAction` draft still compared an interrupt-priority challenger's raw score against the running action's momentum-boosted score before letting it win — directly contradicting "combat interrupts smithing" as an unconditional override (the code's own doc comment already said this shouldn't happen, the implementation just didn't match it yet). Fixed to compare interrupt-eligible challengers only against each other. Verified live (`smoke153.mjs`): no-running-action picks the outright highest score; a challenger under the 15% threshold doesn't replace the running action, one clearing it does; a same-priority challenger cannot interrupt under `minDuration` no matter how high its score; a higher-priority challenger interrupts even at a low nonzero score; a cooldown-gated candidate never wins until it expires; `startCooldown` writes correctly and no-ops at `<=0` seconds; both reference tables match the spec's own numbers exactly. smoke131/149/150/152 unchanged, no regressions | 5.2 |
| 5.4 | ~~`feature/phase5-4-candidate-assembly`~~ | **Merged 2026-07-28 (#64).** `Reasoner.ts` gains `Activity`/`ActivityStatus` (a real home for the winning action's behavior — distinct from `bb.currentActionId`'s debug-visible mirror and from `Agent.intent`, which is what an Activity *emits*, not the Activity itself; nothing implements one yet, 5.6 is the first real constructor) and `assembleCandidates`: intrinsic actions gated by the agent's own archetype `intrinsic` list (an action not offered is skipped entirely — no `TargetRegistry` query even fires for it), plus per-target expansion using `TargetRegistry.queryNearby`'s real 6-argument signature (found during validation: separate `x`/`z`, `kinds` before `region`, an undocumented `limit`), one independently-scored candidate per target. `Agent` gains `currentActivity: Activity | null`, the field the validation pass flagged as missing. Verified live (`smoke154.mjs`): an action outside the archetype's intrinsic list produces zero candidates; an intrinsic action with no `targetKinds` appears exactly once with `ctx.target = null`; a real `gather_resource`-shaped action against real tree nodes near the probe produced 12 candidates (queryNearby's own cap) each bound to a genuinely distinct target — confirmed via a consideration recording every `ctx.target.id` it saw, proving the named §5.4 failure mode (scoring once against an arbitrarily-chosen target) doesn't happen; zero matching targets produces zero candidates, not a crash. smoke131/142/150/153 unchanged, no regressions | 5.3 |
| 5.5 | ~~`feature/phase5-5-reasoner-core-verification`~~ | **Merged 2026-07-28 (#66). Gate passed.** `runReasoner(agent, actions, now)` (`Reasoner.ts`) is the real per-tick entry point — assembles, scores, picks a winner, writes `bb.lastScores`/`currentActionId` — wired into `Agent.think()` for real, not just tested in isolation. Reads from a new `src/ai/actions/ACTIONS` registry, deliberately empty until 5.6/5.7 populate it: an empty registry means every agent's candidate list is always empty, so this is fully inert for every real agent today, the same "wire the hook, defer the content" pattern used throughout phases 3–5. Deliberately does NOT touch `Agent.currentActivity` or call `start`/`abort` on anything — no real Activity exists yet, that lifecycle is out of scope until 5.6. Verified live (`smoke155.mjs`) with two synthetic actions (`idle`, and `wander` — reusing `villager`'s own real intrinsic ids rather than inventing new ones, since `assembleCandidates` correctly gates on archetype membership) through five hand-derived ticks, checked against exact expected scores AND the live-rendered debug overlay text, not just internal state: cold start picks the only real contender; a near-miss input (just below the 15% switch threshold) does *not* flip the winner; a clear win *does*; `minDuration` protects the incumbent even after its own live score craters; protection correctly expires and the winner reclaims. Used a hand-chosen deterministic input sequence rather than real `Math.random()` — a flaky pass/fail on true randomness is exactly the failure mode this project has learned to avoid, and the same "resists a fluctuating input" property is fully provable without it. **One real methodology fix mid-iteration:** the first test version drove the sequence against a live agent while the game kept running, and `Agent.think()`'s own real (empty-registry) `runReasoner` call kept resetting `bb.currentActionId` to `null` between the test's own controlled ticks — fixed by pausing the game first (`Agent.think()` doesn't fire at all while paused, already established behavior). smoke131/149/150/153/154 unchanged, no regressions | 5.1–5.4 |
| 5.6 | ~~`feature/phase5-6-flee-sleep`~~ | **Merged 2026-07-28 (#68).** `flee_to_safety`/`sleep` — the reasoner's first real content — as `src/ai/actions/flee.ts`/`sleep.ts`: real `Action`s + `Activity`s wrapping the exact target-selection `Villagers.tsx` already had (`HOME_X`/`HOME_Z`, and `assignedSleepSpot`'s rank-based bed assignment — both extracted into `game/data/villagers.ts` as the one remaining source). The old raid-flee/night-bed-seek cascade branches are **deleted** from `Villagers.tsx` entirely, per §5.6's explicit instruction. **Three real bugs found wiring up actual content, none exercised by 5.1–5.5's synthetic verification:** (1) `pickAction`'s `minDuration` protection didn't check whether the running action's own fresh candidate was gated — `flee_to_safety` kept "running" for its whole `minDuration` even after a raid had already ended; fixed by only protecting an ungated incumbent. (2) `pickAction` could return a zero-scoring "winner" (a cold-start tie at zero, or a gated incumbent with nothing positive to replace it) — fixed to reject any non-positive result outright, so an Activity never starts/keeps running without a real reason. (3) A genuine circular-import break, not just a risk this time: `Agent.ts` importing `ACTIONS` directly added a second edge into the `gameStore.ts` cycle it already sits inside, and the app failed to load with `Cannot access 'useGameStore' before initialization` — `next build` succeeded regardless, confirming a build pass alone does NOT prove a cycle is runtime-safe; only an actual live page load caught it. Fixed by moving registration out of `Agent.ts`'s own import graph via `registerActions()`/`tickReasoner()`, reached through a side-effect import from `AiRuntime.tsx` instead (the same pattern already proven for `AnchorResolution.ts`). Verified live (`smoke156.mjs`, against a real rendered villager, real elapsed time, no synthetic direct calls): a real raid engages `flee_to_safety` with genuine movement toward home, releases cleanly the instant the raid ends; night engages `sleep` targeting the correct fallback spot, releases at dawn; a raid during the night correctly wins `flee_to_safety` over `sleep` (interruptPriority 10 vs 3). Also fixed the same smoke test's own enemy-object bug along the way — a hand-rolled `{id, raid}` object crashed `Enemies.tsx`'s unrelated renderer, which also reads the shared enemy store; fixed by spawning a real enemy via the store's own `spawn()`. smoke131/142/149/150/152/153/154/155 unchanged (155's own "inert by default" assertion updated to match a no-longer-empty registry, same behavioral guarantee) | 5.5 passed |
| 5.7 | ~~`feature/phase5-7-gather-haul`~~ | **Merged 2026-07-28 (#70).** `gather_resource`/`haul_to_deposit` actions + `GatherAtNode`/`HaulToDeposit` activities (`src/ai/actions/gather.ts`, `haul.ts`), matching `PHASE_2_NAVIGATION_AND_GATHERING.md` §3.4–§3.5 exactly: reserve → resolve anchor → `MOVE_TO_ANCHOR` → `FACE` → `PLAY_ANIM`; gather swings every 1.2s (`yieldPerSwing: 1`, confirmed with the user during validation), haul is a one-shot deposit after a 0.6s hold so `anim_c_pleased` gets real screen time. New `gameStore.gatherSwing(nodeId)` store action — a per-swing, single-resource, no-player-bonus harvest distinct from `harvestNode` (the player's own action, confirmed by reading it fresh this iteration to now empty a whole node in one click with skill/guild bonus rolls that make no sense applied to a background villager). `farmplot` stays out of `targetKinds` behind a literal `FARMPLOT_GATHER_ENABLED` flag per §1.1's own explicit deferral; `job_match` only maps `lumberjack→tree`/`miner→rock` (farmer's own case *is* farmplot, herb/fishing have no claiming job in `JOBS` today — present in `targetKinds` so real candidates generate, permanently gated to 0, the same "content gap found, not invented" shape this project keeps hitting). **Deliberately NOT added to the live `ACTIONS` registry** — confirmed by reading `Villagers.tsx`'s still-active "Phase 24B" worksite cascade and `tickVillagers`/`villagerAtWork()` fresh this iteration: registering now, before 5.8a's `workSignal` reconciliation, would let a job-holding villager's real movement fight that cascade and let `HaulToDeposit`'s `addItems()` double-grant on top of `tickVillagers`' own still-running per-trip yield. Exposed on `window.__kkactions` for direct, isolated testing instead (same approach 5.1–5.5 used before real content existed to register) — full live end-to-end verification against a real job-holding villager is 5.9's job, once 5.8a/5.8b land. **Two real bugs found and fixed, both only surfaced by driving the Activities through actual multi-tick simulation, not by reading the code:** (1) `update()`'s 'travel' phase trusted `bb.movement.status` on the very same tick `start()` issued a fresh `MOVE_TO_ANCHOR` intent — before any `stepLocomotion` call had run against that intent, the field still held stale leftover state (typically `'arrived'`, the resting default), so the travel phase was skipped entirely the instant any Activity began from a stationary agent; fixed with a one-tick `travelStepped` guard that doesn't trust the field until one real `stepLocomotion` call has had a chance to run. (2) Neither Activity released its `TargetRegistry` reservation on a natural `SUCCESS`/`FAILURE` — only `abort()` did, and `runReasoner`'s own cleanup on a clean terminal status never calls `abort()` (confirmed by reading `Reasoner.ts` — it just nulls `currentActivity`/`currentActionId`), so every completed gather/haul would have leaked its reservation slot permanently; a tree only has 2 slots, so the second completion on any given tree would have silently blocked every future reservation on it forever. Fixed with a shared private `finish(agent, status)` helper both Activities route every terminal return through. Verified live (`smoke157.mjs`) via direct `runReasoner()`/`stepLocomotion()` calls against a real lumberjack villager and a real tree/stockpile: full travel→align→perform→swing-loop sequence with `carrying` growing swing-by-swing and the real node's `hitsLeft` depleting in lockstep; abort mid-gather preserves `carrying` and releases the reservation; haul's full sequence transfers via real `addItems()` (inventory increases) and clears `carrying`; reservation count reaches exactly 0 after every natural completion (the direct regression test for bug 2); and a real, unpaused villager's own live `tickReasoner` never picks either action up (confirming the deliberate non-registration). smoke149/150/153/154/155/156 unchanged, no regressions | 5.6 |
| 5.8a | ~~`feature/phase5-8a-worksignal-neutral`~~ | **Merged 2026-07-28 (#72).** New `src/game/workSignal.ts` (leaf module, `carts.ts`'s pattern): `GatherAtNode`/`HaulToDeposit` publish `{active,targetId,kind}` once arrived (align/perform phase, never during travel — matching the old heuristic's own "arrived = at work" semantics, not a weaker substitute for it). `villagerAtWork()` (`gameStore.ts`) checks it first, trusting the AI's real presence over its own proximity heuristic for AI-driven lumberjack/miner villagers; absent or inactive falls straight through to the unchanged heuristic — confirmed strictly additive by re-reading `Villagers.tsx`'s "Phase 24B" cascade fresh (still the only path for farmer/merchant, since `job_match` only claims lumberjack/miner) and confirming the existing intent-branch precedence at the top of the render loop already makes it inert whenever the AI has a real intent active. `gather_resource`/`haul_to_deposit` now join the live `ACTIONS` registry for the first time. `HaulToDeposit`'s `addItems()` transfer stays gated off via a new `CARRYING_ENABLED = false` flag in `haul.ts` — the full mechanic (travel, swings, node depletion, workSignal) runs for real, only the economic transfer is a deliberate no-op this iteration, exactly matching this row's own "carrying disabled" requirement. **"Income matches within rounding" verified as a stronger, deterministic property instead of a literal randomized A/B replay** (no seeded RNG in this codebase to make that reproducible): proved that whenever `workSignal.active` is true for a real gathering agent, the old heuristic's own proximity condition independently holds too (distance to the real target ≤ `WORK_RANGE`) — substituting one presence signal for the other provably never changes `tickVillagers`' own outcome, only the mechanism deciding it; income equivalence follows as a corollary. **A real bug found and fixed, re-reading 5.7's own merged code for this iteration:** neither Activity checked `targetRegistry.reserve()`'s boolean return value — a failed reservation (slots full) silently proceeded as if it had succeeded. Invisible with 5.7's own single-agent testing; a real, silent cap bypass the moment a second agent can reach the same node. Fixed with a `reserved` flag checked on the very next `update()`, failing cleanly instead. Verified live (`smoke158.mjs`): `villagerAtWork()` trusts/releases the signal correctly in both directions; a real `GatherAtNode`'s workSignal timing coincides with genuine ≤6m proximity to whichever real tree the reasoner actually picked (not a staged one — the villager spawns at its own home position and finds its own target, exactly like real gameplay); a live, unpaused villager runs the full gather→deplete→haul→deposit sequence through the real registry end to end, with wood staying at 0 throughout (confirming `CARRYING_ENABLED`'s gate holds even through a fully-completed real haul); 3 lumberjacks contending for one 2-slot tree leave exactly 1 correctly unable to reserve, never exceeding the cap (the direct regression test for the bugfix). Also fixed a pre-existing flaky wait in `smoke150.mjs` (unrelated to this iteration, found re-running the full regression suite): its first `bb.job`/`carryCapacity` poll could resolve before `Agent.think()` had run even once. smoke149/153/154/155/156/157 all re-run clean — 157's own "never registered live" and "haul grants real inventory" assertions were retired/updated to match this iteration's own deliberate, documented changes, the same "assertion legitimately stale, not a regression" shape 5.6/smoke155 already established | 5.7 |
| 5.8b | ~~`feature/phase5-8b-hauling-live`~~ | **Merged 2026-07-28 (#74).** `haul.ts`'s `CARRYING_ENABLED` flag flips permanently true — a completed AI haul now transfers via real `addItems()` and grants trade-mastery xp via a new `awardTradeXp(villagerId, amount)` store action, extracted out of `tickVillagers`' own previously-hardcoded inline block (the exact continuity risk flagged during phase-5 validation: `tradeXp += 10` lived only inside `tickVillagers`, with no reusable path for an AI-migrated villager to keep leveling) so both the old timer and the new AI path share one implementation and one mastery-level-up notification, instead of two independently-maintained copies. `tickVillagers` gains one new, earlier check — `if (workSignals[v.id]?.active) continue;` — so its own per-trip grant never runs at all for a villager the AI is actively driving, preventing the double-count that would otherwise land the instant a haul completes. This is a real, deliberate reversal of 5.8a's own semantics for the SAME signal: in 5.8a (carrying still disabled) `workSignal` active made the old timer's progress *advance* (still the sole yield source); in 5.8b it makes that same timer's progress *freeze* instead (the AI now owns yield), resuming exactly where it left off once the AI stops driving that villager — confirmed deliberate, not a regression, and documented as such in `smoke158.mjs`'s own updated trust test. Might/Craft/Wit's trip-bonus rolls (double-load chance, side-goods, merchant wit bonus) are deliberately NOT ported to the AI-driven path — they're keyed to `jobDef.perTrip`, a fixed quantity with no clean mapping to a physically-carried, capacity-bound haul — logged to `ROADMAP.md` as a future enhancement rather than silently dropped. Verified live (`smoke159.mjs`): a non-AI-driven farmer still gains tradeXp through the unchanged `tickVillagers` path (confirms the extraction didn't touch anyone else); a real, unpaused, live-registered lumberjack's full gather→haul→deposit cycle lands real inventory AND exactly +10 tradeXp (not +20 — the direct regression test proving no double-grant); `villagerProgress` for that same villager is provably frozen (sampled at workSignal-active, resampled 2s later mid-perform, byte-identical) rather than merely absent, since it can legitimately already hold a real value from proximity to a different nearby tree during the earlier travel phase (a genuine test-design correction made mid-iteration, not a product bug — see this iteration's own memory note). smoke149/150/153/154/155/156/157 all re-run clean; smoke157/158 both had assertions flip back to their original 5.7-era expectations now that `CARRYING_ENABLED` is permanently true again, the same "update the stale assertion, don't silently leave it wrong" discipline 5.6/5.8a already established | 5.8a verified neutral |
| 5.9 | ~~`feature/phase5-9-verification`~~ | **Merged 2026-07-28 (#76). Phase 5 complete — 10/10, and the full 30-iteration phases 2–5 plan is now done.** Ran the whole gather→haul→deposit loop through §3.7's full checklist for the first time: slot sharing (a real positive 2-agent case on a 2-slot tree, plus a 1-slot herb node); the real `'tree'` id-space collision (a node AND a buildable id, confirmed back in 2.8) between a resource node and a co-located decorative building; depletion partial-load re-targeting (gather_resource correctly keeps winning on a fresh node, not haul, while the load is still low); anchor walkability under real obstruction (a tree fenced on 3 sides with real `stonewall` buildings and a real nav-grid rebuild — the agent paths around; a real fishing node's anchor resolves on land, confirmed via a direct Activity drive that bypasses `job_match`, which no job claims for `fishing` today); a real raid interrupting a real gather then correctly resuming into a real haul once carrying is high enough to legitimately cross the 1.4/1.2 weight gap (§3.4's own load-bearing crossover, independently confirmed via a direct `scoreAction` sweep: haul decisively outscores gather from roughly 62% capacity up); and 60 real simulated seconds with no illegitimate flip-flopping. **Three genuine, previously-invisible reasoner bugs found and fixed, none reachable by any prior single-agent or synthetic test:** (1) `pickRaw` (`Reasoner.ts`) matched "the running candidate" by `action.id` alone — `gather_resource`/`haul_to_deposit` expand into one candidate per nearby target sharing that id, so the match could grab an arbitrary same-action candidate instead of the one actually reserved, occasionally gating a perfectly valid, still-held gather to a spurious zero score; now matches by the specific bound target (`bb.reservation.targetId`) when one exists, and the exclusion loops that used to skip every same-action candidate now correctly exclude only that one specific candidate, letting a genuinely better target compete. (2) `job_match` (`gather.ts`) didn't check `target.source`, so a decorative `'tree'` building co-located with a real tree node could win scoring only to fail every tick against `GatherAtNodeActivity`'s own source-check, with nothing stopping the same building winning again — fixed at the scoring source, the Activity's own guard now defense-in-depth. (3) `assembleCandidates`' proximity scoring is straight-line, with no path-reachability concept at all — a target that scores well but turns out genuinely unreachable (`resolveAnchor`/`navSteer` reports `'blocked'`) could keep winning and failing forever; new `bb.blockedTargets` (`Blackboard.ts`) records a 15-second exclusion on a `'blocked'` failure, checked by `target_usable` in both actions. Getting bug 3 right also required threading `Activity.update()`'s own `now` parameter through for real (a new, required 3rd parameter on the `Activity` interface, `flee.ts`/`sleep.ts` updated to match) — `agentManager.now` freezes while the game is paused, but every direct-call test in this whole suite (the established pattern for fast, accelerated-time tests) drives `runReasoner` with its own still-advancing local clock while paused, so only `runReasoner`'s real `now` parameter is correct under both callers. **A fourth, separate real bug found along the way:** `AgentManager.despawn()` never called `abort()` on a departing agent's `currentActivity`, so its held `TargetRegistry` reservation leaked permanently — reachable in real gameplay via `rosterSync.ts`'s own job-based exclusion (reassigning a lumberjack to `'defender'` mid-gather despawns their Agent), and a real, permanent, silent capacity loss on a tree with only 2 slots. Also fixed two pre-existing flaky waits (`smoke150.mjs`, `smoke157.mjs`, both a fixed-timeout race against `Agent.think()`'s first real tick) found running the regression suite repeatedly during this iteration's own debugging — unrelated to 5.9's own logic, but real flakiness worth closing while found. smoke149/150/153/154/155/156/157/158/159 all re-run clean across multiple full regression passes | 5.8b |

### Final comprehensive validation pass — merged 2026-07-28 (#78)

Explicitly requested after 5.9 landed: a thorough, final validation of every change across 5.8a/5.8b/5.9,
not another numbered iteration. New `smoke161.mjs` — a realistic homestead with 6 villagers across every
job type (lumberjack/miner/farmer/merchant/builder/idle), live and unpaused for real wall-clock time — the
first test in the whole arc to exercise the full system together instead of one or two controlled agents.
It surfaced two real, previously-invisible bugs neither single-agent nor synthetic testing had reached:

1. **A permanently frozen villager once carrying is full and no stockpile is reachable** — a realistic
   scenario, not a contrived one: real trees/rocks can legitimately sit 45–50m from a villager's own home
   spawn. Root cause, traced through three rounds of targeted diagnostics: `runReasoner`'s "no winner"
   branch (`Reasoner.ts`) cleared `agent.bb.currentActionId` but never `agent.intent` — only `abort()` did
   that, and a natural `SUCCESS` never reaches `abort()` (the branch's own `currentActivity` guard is
   already false by the time SUCCESS's own handling runs). Every renderer (`Villagers.tsx`, `Npc.tsx`)
   treats any non-null intent as authoritative with no way to tell "still running" from "reasoner moved
   on", so a villager with nothing left to do (sack full, no reachable stockpile, daytime, no raid) would
   visibly freeze on its last `PLAY_ANIM` intent forever instead of falling back to the legacy cascade.
   Fixed with an unconditional `agent.intent = null` in that branch. This is exactly the residual
   "stranded carrying" gap logged to `ROADMAP.md` this same pass: the fix stops the visible freeze, but
   the carried resources themselves still never reach a stockpile until one comes into range.
2. **A React duplicate-key warning in `AIDebugOverlay.tsx`** — `bb.lastScores.map((s) => <div
   key={s.actionId}>)` collides now that `gather_resource`/`haul_to_deposit` legitimately produce several
   scored candidates sharing one action id (one per nearby target, 5.4's own per-target expansion), first
   visible once several AI-driven villagers ran together. Fixed with `key={`${s.actionId}-${i}`}`.

Both fixes verified end-to-end by re-running `smoke161.mjs` itself (the original discovery scenario, not
just the isolated diagnostics) after landing: a real lumberjack's full gather→haul→deposit cycle lands
real wood, a real miner completes the same cycle for stone, and the old `tickVillagers` path stays alive
for farmer/merchant throughout — confirmed on the actual PR branch, not just on `main` ahead of a proper
commit.

**A second, unrelated finding from the same pass, product-correct but test-relevant:** `smoke161.mjs`'s
own original 75-second wait budget assumed near-node distances that don't hold in this world — a live
trace showed a single AI-driven gather→haul round trip can genuinely take 150–200+ real seconds end to
end once real travel distance and multi-node capacity-filling are accounted for (`carryCapacity` is 4, a
single node's `hitsLeft` can be as low as 3, so gather often has to visit a second node before haul even
starts). Not a bug — the trip provably finishes — but real enough to log to `ROADMAP.md` as a balance
question for later. `smoke161.mjs` now polls for real inventory growth up to a 300s ceiling instead of a
fixed 75s wait, re-pinning `worldEnv.time` every poll (the same day/night-drift fix already applied to
smoke158–160 for the same reason: a long live window can otherwise drift past working hours and engage
`sleep` instead of the action under test).

**A third finding, this time in the test suite itself:** re-running the full regression suite multiple
times during this pass surfaced intermittent failures in `smoke158.mjs`'s 3-agent reservation-cap check
and several of `smoke160.mjs`'s 8 sub-tests (a different specific assertion failing each time — target
misselection, an empty 60-second stability window, a spuriously gated candidate) that a single run would
have missed. Root cause: both tests spawn a fresh villager, wait ~600ms unpaused so `rosterSync`/
`AiRuntime.tsx` can actually create the real `Agent` (spawning is gated behind the same `st.paused` check
that stops thinking, so this wait is unavoidable — confirmed by reading `AiRuntime.tsx`'s own `useFrame`),
then pause and take manual control. During that unavoidable live window, the real scheduler can already
run `Agent.think()` for the new villager against its own default spawn position, occasionally leaving it
mid-activity or holding a stale `bb.reservation`/`bb.blockedTargets` entry before the test ever
repositions it — a race that predates this pass but had gone unnoticed until 5.9's own `blockedTargets`
gave it a way to manifest as a spurious zero score. Fixed by resetting each freshly-spawned agent's
`currentActivity`/`intent`/`bb.currentActionId`/`bb.reservation`/`bb.blockedTargets` to a clean slate
immediately after grabbing it and before repositioning, in every sub-test that follows this pattern in
both files — confirmed to hold across several repeated back-to-back runs afterward. Test-only, not
committed (`scripts/` is gitignored).

Future-enhancement ideas surfaced this pass (Might/Craft/Wit trip bonuses not ported to the AI-driven haul
path, stranded carrying, herb/fishing job types, farmplot gathering, realistic AI trip-time expectations)
are logged in `ROADMAP.md`'s "NPC AI — phases 2-5 complete" entry, matching the project's established
pattern of logging deferred ideas rather than dropping them silently.

### After each iteration merges

1. Update this table's row for that iteration (done/date).
2. Save a short project-memory note: what merged, what's next, anything
   discovered that changes a *later* iteration's plan (the way phase 2's
   verification changed phase 3's scope here). Memory is what lets a future
   session pick this back up correctly without re-deriving it.
3. Move to the next iteration in sequence — don't skip ahead across a
   dependency, even if it looks safe.

---

## Phase 6 — Perception, done 2026-08-11 (Wave 11)

**The gap this closed.** `bb.threatLevel` and `bb.beliefs` were authored in
phase 1 straight from §3.2/§3.3 and then never written by anything: grepping
the tree before this phase, `bb.beliefs.set(...)` had *zero* call sites and
the only write to `threatLevel` was its `0` in `createBlackboard`. Six shipped
actions (`gather` / `haul` / `farm` / `seek_deposit` / `notice` / `ambient`)
each carry an identical `not_threatened` consideration reading `1 -
bb.threatLevel`, so every one of them had been evaluating `1 - 0 = 1` forever
— every villager permanently, structurally, perfectly safe. That plumbing is
now live.

**Built:**

- `config/perception.json` + typed accessors in `config/index.ts`
  (`PERCEPTION`, `VISION_HALF_COS`). Every §6 number is authored here; the
  file's `_doc` carries the reference range each one was chosen against.
- `perception/VisionSensor.ts` — §6.1's three phases: squared-distance broad
  phase, dot-product cone, and a budgeted narrow phase (4 checks/agent/tick,
  round-robin cursor). Confidence ramps (0.4 s at the agent's feet → the
  spec's 1.5 s at the edge of range), never snaps.
- `perception/HearingSensor.ts` + `perception/sounds.ts` — §6.2, event-driven.
  A small ring of recent world sounds each agent drains past its own
  watermark; `game/combat.ts` pushes three real events beside the `audio.play`
  calls it already made (player struck / melee landed / bolt landed), and the
  player's own sprint is pumped as the one continuous source. Heard beliefs
  get §6.2's fuzzed position and a low confidence ceiling.
- `perception/Belief.ts` — the entity-id scheme (`enemy:<id>` / `noise:<what>`
  / `player`), upsert, and §3.3's exponential decay + 0.05 prune.
- `perception/Senses.ts` — §6.3 threat derivation from all three spec inputs,
  plus the two-cadence tick (decay + derivation every think, sensors at
  `perceiveHz`).
- `core/Perception.ts` — the registration seam `Agent.think()` calls through,
  for the same real circular-import reason `registerActions` exists.
- `debug/AIPerceptionGizmos.tsx` (§9's "vision cone, belief markers at
  `lastKnownPosition` with confidence-scaled opacity") and new belief /
  sensor rows in `AIDebugOverlay`. **Alt+`` ` ``** toggles the gizmos, works
  with the panel shut.

**First real consumer of `agent.perceiveHz`.** That field has been assigned
per tier since phase 1 and, until now, read by nothing but the overlay's own
text. Perception runs at it directly rather than carrying an `updateHz` of its
own — §2's tier-B window-radius gap is this project's own worked example of
what two numbers that must agree by hand eventually do.

**Documented divergences from the spec, both deliberate:**

1. **§6.1's narrow phase is a nav-grid march, not a raycast.** There is no
   `losCollider` layer in this project and building one means authoring a
   second collision set for every building. `NavGrid.isWalkable`'s blocked
   cells are already exactly "solid between 0.55 m and 1.7 m", i.e. solid at
   torso height, which is the better predicate anyway. Same trade phase 2
   made choosing to extend `navgrid.ts` over adopting navcat.
2. **§6.3's "lerp toward the target by 0.3" is re-expressed as a 0.28 s time
   constant.** Per *tick* it would make an identical situation escalate 20×
   faster on a tier-A agent than a tier-D one, purely from LOD. Same
   correction phase 1 already made for needs decay.

**Deliberately not built (and why):**

- **`notice_player` was left exactly as it is.** Its header names full §6
  Perception as the thing it is standing in for, but it is a shipped, tested
  action and its plain 5 m distance check is *correct* for "the player walked
  up to me". Rewiring it onto a belief would be a behaviour change to phase
  5's content dressed as phase 6's work.
- **No fellow-agent beliefs.** §6.1's broad phase says "against agent list",
  but nothing reads a belief about a neighbouring villager: threat counts only
  hostiles, and `follow_leader` / `assist_leader` are phase 7's, unbuilt.
  Phase 7 adds the population here when it adds the reader.
- **No new outlet for threat.** Threat now suppresses work correctly through
  the six existing `not_threatened` considerations, but nothing *new* fires on
  it — `flee_to_safety` still gates on `raid_active` alone, untouched. A
  threat-driven flee/cower is real behaviour design and belongs to phase 7,
  not to a sensor phase that would have had to edit a tuned survival action to
  claim it.
- **`bb.lastDamageAt` still has no producer**, and that is a fact about the
  game rather than a gap: `Enemies.tsx` only ever targets the player, sworn
  defenders, or keep pieces, and `rosterSync.ts` excludes defenders from
  having an `Agent` at all — no agent in this system is reachable by any
  damage path that exists. §6.3's damage term is implemented and inert, with
  `reportAgentDamaged()` as the one line phase 7 needs.

**Nothing is persisted.** No `SaveGame` field was added or changed: beliefs
and perception state are transient exactly like the rest of the Blackboard,
rebuilt within a second of loading.

---

## Phase 7 — Combat + companion, 2026-08-11 (Wave 11)

Build-order item 7 is *"Intrinsic actions, category weights, interrupt
priorities, `EngageThreat` / `FollowLeader` activities."* Three of those four
shipped in full. The fourth (`FollowLeader`) is scoped down deliberately and
the reason is below — it is not an oversight and not a stub.

**The gap this closed.** `CATEGORY_WEIGHT.combat` (3.0) and
`CATEGORY_INTERRUPT_PRIORITY.combat` (8) have been defined in `Reasoner.ts`
since phase 5 and had **never been used by a single Action**. Phase 6 made
`bb.threatLevel` real but deliberately gave it no new outlet — its own closing
note says so — so threat could only ever *suppress* work through six
`not_threatened` considerations. This phase is that outlet.

**Built:**

- `actions/takeCover.ts` — **`take_cover`** (combat, 3.0 / interruptPriority 8,
  minDuration 2, no cooldown). The live deliverable, on the real `villager`
  archetype. A villager who *perceives* a hostile (§6's beliefs, not the raid
  flag) runs to a point that puts a real standing building between them and
  that hostile's `lastKnownPosition`, then turns and watches it. Cover is
  chosen by the buildable's own authored height (`heightOf`) rather than a
  hand-listed set of "cover-ish" types, and the stand point is offset from the
  piece's real footprint edge (`sizeFor`, projected onto the retreat direction
  — the box's own support function), so one `standoff` number works for an 8 m
  castle wall and a 2 m barrel alike. Falls back to a fanned open-ground
  retreat, then to `flee_to_safety`'s own HOME point.
- **The alarm.** Breaking for cover emits a real §6.2 world sound carrying the
  *sighted* hostile's own belief id, so a neighbour who hears it gains a
  low-confidence belief about that same raider at a fuzzed position — the first
  thing in this project to emit into the hearing sensor from the AI side rather
  than from `game/combat.ts`, and it makes one villager's panic spread as
  information. Plus one throttled player-facing notice, the same "call each
  hostile out once" shape `scoutReported` already uses for a scouting defender.
- `actions/engageThreat.ts` — **`engage_threat`** (combat, 3.0 / 8,
  minDuration 1.5). A complete Activity: closes on the believed position,
  faces, swings `anim_g_swordswish`, and deals real damage through the same
  `EnemyData.hp` path `Defenders.tsx` uses, with the same kill bookkeeping
  (`recordKill` / `gainDefenderXp` / `lootFor` / `notify`). Registered, and the
  dead `engage_threat` id in `archetypes.json`'s `guard` list finally has an
  Action behind it. **It cannot fire for anyone today, on purpose** — see
  "population" below.
- `game/defenders.ts` gains **`defenderStrike(v)`**, the damage expression
  lifted verbatim out of `Defenders.tsx`'s attack branch (which now calls it).
  §0.2's "one arbiter" argument applies to a damage formula too: two copies
  would drift the first time Courage or the Riposte trait was retuned, and
  "defenders hit differently depending on which system is driving them" is
  close to unfindable.
- `perception/Belief.ts` gains **`nearestNoticedHostile(bb, x, z)`** — the
  sanctioned §3.3 reader ("combat and search behavior must read
  `lastKnownPosition`, never the live transform"), shared by both combat
  actions so neither invents its own subtly different "which one am I
  answering".
- `config/combat.json` + typed accessors (`COMBAT`) — every phase-7 tunable,
  each with the existing game range it was chosen against, same convention
  `perception.json` established.
- `actions/combatState.ts` — per-agent combat decision state for §9, module map
  + `despawnHooks` cleanup, exactly `perception/state.ts`'s shape and for the
  same reason (an `Activity` instance is private to the agent running it, so
  a debug view has nowhere to look).

**The population question, which is the whole design decision.** Read against
the live code, not assumed:

- `setDefenderLoadout` refuses any villager whose job is not `'defender'`, so
  "can fight" and "is a sworn defender" are the same predicate — there is no
  armed farmer and no way to make one.
- `Enemies.tsx` only ever targets the player, a sworn defender (via
  `defenderState`) or a keep piece, so an ordinary villager cannot be damaged.
- `rosterSync.ts` structurally excludes `job === 'defender'` from having an
  `Agent` at all, because `Defenders.tsx` already owns a complete, tuned combat
  AI for them.

So an ordinary villager who "fought back" would be **an invincible farmer
killing raiders for free** — a real balance regression dressed as an AI
feature. Getting behind something solid while shouting about what they saw is
the honest combat behaviour this population has, and it is genuinely new:
nothing in the game reacted to a lone night skeleton before, because the only
existing reaction (`flee_to_safety`) gates on the global raid flag.
`engage_threat`'s own gate is `bb.job === 'defender'` — the exact mirror of
rosterSync's exclusion, so it lights up the moment that decision is reversed
and cannot fire before. **Reversing it is a migration off a shipped, tuned
combat AI and needs its own sign-off and its own live verification**, not a
side effect of the phase that happened to write the action.

**Wave 21 (2026-08-28) gave this its sign-off — but as a NEW action, not a
reversal of the one above.** `engage_threat` itself is untouched and still
permanently inert exactly as this section describes (`rosterSync.ts`'s
defender exclusion never moved). Instead, a distinct, deliberately WEAKER
action — `engage_threat_villager` (`actions/engageThreatVillager.ts`) — was
built for the ordinary roster, with its own flat HP/damage pool
(`game/villagerCombat.ts`, well below a defender's tuned floor), its own
courage/proximity/difficulty-tier capability gates, and `interruptPriority`
tied with (not above) `take_cover`, so `flee_to_safety` still wins outright
during a real raid — the "invincible farmer" risk this section named is
what every one of those design choices was built to avoid. See that file's
own header for the full reasoning and `ROADMAP.md`'s Wave 21 entry for live
balance-verification evidence.

**`FollowLeader` / `assist_leader` — scoped down, honestly.** There is exactly
one follower behaviour in this game: `defenderOrders.order === 'follow'`
(`Defenders.tsx`), a defender forming up 2.6 m behind the player. It belongs to
the population this reasoner structurally excludes, it already works, and
duplicating it is the same forbidden migration as above. There is no pet, no
escort, no companion entity anywhere else in the codebase — `companionTraits.ts`
is a per-villager perk tree, not a follower. Building `follow_leader` for
ordinary villagers would therefore be **new game content nobody asked for**, not
a migration of existing behaviour, so it was not built. `bb.leaderId` (a phase-1
field, still unwritten) and the `companion` category weights stay as they are,
ready for a real companion feature to land on. The `companion` archetype's own
`intrinsic` list is left untouched.

**Deliberately not done, and why:**

- **`flee_to_safety` is untouched.** Adding a threat consideration would change
  its `n` and therefore rescore a tuned, shipped survival action. `take_cover`
  sits *under* it (3.0 vs 4.0, priority 8 vs 10) and answers the case flee
  never could: a perceived hostile with no raid on.
- **`notice_player`, `idle_fidget` and the six `not_threatened` considerations
  are untouched.**
- **`reportAgentDamaged()` still has no caller.** `Enemies.tsx`'s existing
  `defTarget.hp -= …` site is the one line that makes §6.3's damage term live,
  and it resolves to nothing today (`agentManager.get(defenderId)` is always
  `undefined`). Writing into a shipped combat file for a provably-inert call —
  and adding an import edge there that cannot be verified without running the
  game — buys nothing. It belongs to the same sign-off as the exclusion.
- **ROADMAP.md untouched**, matching phase 6's own call: the wave-level entry
  belongs to phase 8's closing pass.

**Nothing is persisted.** No `SaveGame` field added or changed — combat state
is transient exactly like beliefs, needs and cooldowns.

**Debug view (§0.5).** The `` ` `` panel gains a `COMBAT cover · vs enemy:7 @
x,z · behind stonewall @ x,z · 4.2m to go` row (and `swing 0.6s · hits 3` in
engage mode), and both new actions appear in the existing SCORED ACTIONS list
with their considerations. **Alt+`` ` ``** gizmos gain two legs per engaged
agent: amber agent→cover, red cover→believed threat — a good cover choice reads
as a bent elbow with the agent and the raider at opposite ends, which is the one
question ("is the barn actually *between* them") the DOM panel cannot answer.

**Verification:** `npx tsc --noEmit` clean. Not run live this session (`npm run
dev`/`build` were out of scope per the task) — the behaviours above are reasoned
from the real code paths, not observed, and `take_cover` in particular wants a
live pass with a night skeleton before it is called finished.

---

## Phase 8 — done, 2026-08-11 (Wave 11)

**LOD tiers + ambient.** Two genuinely separate halves of one build-order item.

### What was already true, and needed nothing

Tier *assignment* (`AgentManager.refreshTiers`), the round-robin `Scheduler`
with its hard 3-thinks-per-frame cap, the per-tier `thinkHz`, the random spawn
phase offset and the whole overlay tier readout have existed since phase 1
(§8 was pulled forward because the Scheduler could not exist without it). §8's
"tier D advances needs statistically" is also already satisfied by
construction, not by a separate path: needs decay by the time elapsed since
*that agent's own* last think, so a 0.5 Hz tier-D agent ends up exactly as
hungry as a 10 Hz tier-A one. **Nothing was rebuilt.**

### The real gap: `agent.steering` cost nothing

`steering` was computed per tier from phase 1 and read by **nothing but the
debug overlay's own text**. Every agent ran the same full `navSteer` (plus, on
a `MOVE_TO_ANCHOR`, an anchor resolve) on *every render frame* regardless of
tier — so LOD throttled *thinking* and not *moving*, which is the more
expensive half for an agent actually walking somewhere. Phase 8 makes the
column real, in `core/Locomotion.ts`:

- **full** (A/B) — every frame, byte-identical to every phase before this.
- **simplified** (C) — the steering branch runs every `simplifiedInterval`
  (0.15 s) and integrates the *whole banked dt*, so average speed is unchanged:
  ~6.7 Hz against 60, a 9× cut, for agents that are out of frustum or 60 m+ away
  by definition. The residual is a ~13 cm hop in a shadow.
- **teleport** (D) — §8's "jump along their path in coarse steps", every 2 s
  (deliberately tier D's own 0.5 Hz think period, so there is not a second
  cadence to reason about), capped at 4 m per jump and clamped to the
  straight-line distance remaining.

`jumpAlongPath` walks the cached **polyline**, not the steering vector. That
distinction only matters at this cadence: a 2 s jump is 1.8–3.2 m and
`navSteer` advances its waypoint index within 1.1 m of a corner, so integrating
a direction for that long would sail past the corner the path existed to route
around and cut through the wall. At tier A/B the same integration covers 1.5–2.7
*centimetres* per frame and the question never arises.

### The freeze nobody had noticed

`stepLocomotion` is called from `Villagers.tsx`/`Npc.tsx` — renderers, which
only mount a figure for the region the player is standing in, i.e. precisely the
set tier D excludes. So an off-region villager did not merely think slowly, it
**held whatever Intent it had, motionless, until the player came back**: a
villager caught mid-`haul_to_deposit` resumed the trip as if no time had passed.
`stepUnrenderedAgents(dt)`, called once from `AiRuntime`'s existing `useFrame`
after `agentManager.update`, is the caller that isn't a renderer. It sweeps only
`steering === 'teleport'` agents, with an `actuatedAt` timestamp guard so it can
never double-step one a renderer *is* driving (see below for why that case is
not hypothetical).

`tierChangeHooks` (a new hook list on `AgentManager`, registered from
`Locomotion` — the same dependency direction `despawnHooks` already uses to
avoid a confirmed-live circular-import crash) fires only when a tier actually
*changes*. Its one listener implements §8's re-entry rule: on D→anything, drop
the stale nav path (it was solved for a 0.5 Hz walker; handing it to 60 Hz
steering makes the agent sprint the stale leg) and snap to the nearest walkable
cell if the ground was built over while the agent was away.

`rosterSync.mirrorVillagerPositions` had to stop fighting all of this: it
copied the (frozen) mob position into `agent.position` every frame, which would
have pinned a coarse-stepping agent in place. While unrendered the agent owns
its position; a single write back to the mob happens on the frame it returns.
The mob is deliberately left stale meanwhile rather than tracked live —
`gameStore.villagerAtWork()` reads `villagerMobs` positions to decide whether a
production timer keeps ticking, and a live mirror would change a shipped Wave
9/10 economy path as a side effect of an LOD change.

### `farDistance` — the threshold the spec's own table omits

§8's B row reads "15 m to region's nav-window edge", which silently assumes
every region *has* a window. The two fixed regions (home ±56 m, the Sealed
Crypt) don't, so an agent 90 m down the meadow sat on B — 5 Hz thinks, full
per-frame steering — purely for being inside a long third-person frustum.
`farDistance` is 60, and that is **not a new opinion**: it is exactly
`GRAPHICS_PROFILES.performance.characterLodDistance`, the distance this project
already decided a rigged character stops being worth *drawing*, measured the
same way against the same camera. One number, two systems, no second copy to
drift. A new `distanceCapped` flag (kept separate from `boundCapped`, whose
meaning is load-bearing for the window-bound smoke test) makes the overlay able
to say *which* of C's three causes applied.

### The ambient half: `wander`

`idle_fidget` was already a real ambient action, but its Activity emits
`PLAY_ANIM` and **only** `PLAY_ANIM` — standing-still fidgeting, never
locomotion. So "background NPCs move around" was still 100% `Villagers.tsx`'s
pre-AI cascade, and `wander` remained what `archetypes.json`'s own `_doc` called
aspirational: an intrinsic id, first in the villager list since phase 1, with no
Action behind it. `actions/wander.ts` + `config/ambient.json` give it one — the
only registry addition in this whole wave that needed **no** `archetypes.json`
edit to go live.

**The scope decision, which is the one worth arguing.** `wander` is gated to
tier-D roster villagers, and that is deliberate rather than timid:

- An intent it emits is only ever *actuated* for a `steering === 'teleport'`
  agent — `stepUnrenderedAgents` sweeps exactly that set, and every other tier
  is by definition in the player's own region where a renderer is mounted.
- Emitting one for anybody else would win the `MOVE_TO` splice at the **top** of
  `Villagers.tsx`'s cascade (its first branch, iteration 3.3) and starve the
  four branches below it of the frames they run in: the newcomer walking the
  road in (`mob.arriving`, a flag that never clears if its branch never runs),
  the Wave 9/10 worksite performance, the builder's construction site, and the
  midday-market/evening-campfire rituals. At `ambient` 0.3 it wins whenever
  nothing else scores — which for a `builder`, who has no work Action in this
  reasoner at all, is essentially always.

So the set of agents `wander` can safely move **is** the set nothing else is
moving. A second gate (`bb.job !== null`) excludes court NPCs, which `npcSync`
spawns under the same `'villager'` archetype and whose positions
`mirrorNpcPositions` pins to their mob unconditionally — a quest giver who has
left their post is a bug even when nobody is looking. A third check consults
`VillagerFigure`'s own mount predicate directly, because `rosterSync` spawns
every villager Agent with `region: null` regardless of its `world`, so "tier D"
would stop implying "unrendered" the day Wave 4 residents become real.

Geometry is lifted from the cascade rather than re-guessed (`WANDER_RADIUS` 14,
its `2 + rand*(14-2)` ring), centred on `villagerHomeSpot` — load-bearing here
in a way it isn't there, since a ring re-centred on each new position is a
random walk and an unrendered agent can wander for a whole dungeon visit with
nobody to notice it drifting. The pause between strolls is the Action's own
`cooldown` (6 s), during which `idle_fidget` (cooldown 8) is the only thing left
that can win: the cascade's own "walk somewhere, stand and look around, walk
somewhere else" beat falls out of **composing the two existing ambient actions**
rather than out of a third timer.

### Open decisions the research flagged, and what was decided

- **What "simplified" steering means with no local-avoidance layer to strip**
  (§7.5's `Avoidance.js` still does not exist). Answered as *cadence*, not
  *fidelity*: tier C runs the same steering less often and integrates the banked
  dt, so nothing about the result changes, only how often it is recomputed.
  Honest consequence: **C and A/B differ in cost, not behaviour.** A real
  fidelity distinction stays blocked on avoidance not existing, and is left to
  whoever builds it.
- **Tier-D coarse step size/interval** — 2 s / 4 m cap, reasoned above.
- **Re-entry snap** — reuses `NavGrid.nearestWalkable` at its own default
  radius, which `findPath` has used since before this system existed, rather
  than a new primitive.
- **Which archetype `wander` attaches to** — the already-real `villager`, which
  already listed it, not the never-spawned `ambient` one.

**Deliberately not done:** no local avoidance (§7.5); no migration of
`Villagers.tsx`'s cascade (`wander` is scoped precisely so it does not compete
with it); no change to any Wave 3–10 system beyond `rosterSync`'s mirror, which
phase 8's own coarse stepping made mandatory.

**Nothing is persisted.** No `SaveGame` field added or changed — tier, steering
mode, banked dt and wander targets are all transient, rebuilt within a frame.

**Debug view (§0.5).** The `` ` `` panel header now reads `phase 8 · LOD +
ambient`; the scheduler row gains **`COARSE n`** (agents coarse-stepped last
frame — zero at home, and it should climb the instant the player steps through a
portal; still zero there means the sweep is not reaching them and §8's whole
tier-D path is silently inert), and the agent row now names *why* a tier was
assigned — `(window edge)` or `(past 60m)` — since C's three causes are
diagnosed completely differently. `wander` appears in SCORED ACTIONS with its
three considerations, so a gate that is declining an agent says so on screen.

**Verification:** `npx tsc --noEmit` clean. Not run live this session (`npm run
dev`/`build` were out of scope per the task), so the behaviours above are
reasoned from the real code paths, not observed. The one worth watching first is
a portal round trip: `COARSE` should go non-zero, an idle villager's `wander`
should start winning, and they should be somewhere else — on walkable ground —
when the player comes home.

---

## Wave 11 — what the live verification pass found, and the fixes

Phases 6/7/8 all shipped with the same honest caveat: typecheck-clean, reasoned
from real code paths, **not observed running**. A live pass then drove the real
`think()` → `tickSenses` → `tickReasoner` loop in the browser. Most of it held
up (measured think rates per tier, real damage and a real kill through
`engage_threat`, `wander`'s gates, mirror freeze/hand-back, decay and prune
rates matching the config to three decimals). Four things did not, and all four
were the kind of defect only running it can show.

### 1. `take_cover` never once reached the cover it picked

Observed in **4 of 4** independent scenarios. The villager noticed the raider,
shouted, started running — and then the action gated out mid-flight and handed
them back to `idle_fidget`, standing in the open. The "arrived, turn and watch"
branch of `TakeCoverActivity` was never reached in any run.

The cause is structural, not scenario-specific, and it is the action punishing
itself for working: retreating turns the agent's yaw — and with it the 114.6°
vision cone — away from the raider, so the belief stops being refreshed and
decays at 0.25/s, while proximity falls at the same time for the same reason.
Threat is the product of the two, so it was back under `minThreat` 0.4 within
~3 s of losing sight, which is shorter than most cover runs. `minDuration` (2 s)
could not help either: `pickAction` only protects a running action that is *not
gated* (Reasoner.ts), and this one was gated.

Fixed by giving `take_cover` three gate regimes instead of one threshold
(`coverThreatInput`, takeCover.ts). `minThreat` 0.4 is now an **entry** number
only; while travelling the gate reads a flat `cover.commitThreat` for up to
`cover.commitSec` (12 s, a backstop — the phase normally ends by arriving, or by
`bb.movement` reporting `blocked`, which counts); once stood down behind the
piece it releases at `cover.sustainThreat` 0.15, renormalised onto the same
curve so the score still decays smoothly rather than stepping. The Activity
matches: a belief that fades mid-sprint no longer ends the run, only a fade
*after* arrival does.

`commitThreat` is 0.8 and not 1.0 for a reason worth keeping: at 1.0 the action
sits on its 3.0 weight ceiling, which puts the reasoner's switch threshold
(×1.25 momentum, ×1.15 to switch) at 4.31 — *above* `flee_to_safety`'s flat 4.0.
Committing hard enough to finish a cover run would have quietly stopped a raid
from ever pulling that villager home, trading one live bug for a worse one. At
0.8 the bar is 3.35: over everything below survival (the best work action can
reach 1.4), under flee. Phase 7's "during a raid nothing changes, flee still
wins" is now arithmetic rather than an assumption.

### 2. …and it flickered against `idle_fidget` around the 0.4 line

Same root cause, second symptom: threat oscillating around a single threshold
re-entered and re-exited the action four times in ~1.5 s, and each re-entry ran
`chooseCover()` afresh from the new position and committed to a **different**
destination. The hysteresis above is the fix — entry 0.4, release 0.15 — and the
commitment window means a run in progress is never abandoned to be re-decided.
No cooldown was added: a cooldown damps re-entry by making the correct behaviour
impossible for N seconds, which is not the same thing.

### 3. `chooseCover` silently discarded valid cover

`sizeFor` and the nav grid do not agree about how big a building is: navgrid.ts
inflates every collision box by `AGENT_RADIUS` 0.55 and then stamps whole 1.0 m
cells, and a piece's collision volume is not always its authored display size.
Measured first-walkable distances past the edge `sizeFor` reports: market_stall
1.2 m, tower 1.5 m, storehouse 2.0 m — against a flat `standoff` of 1.2. So
`market_stall`/`tower`/`forge`/`stable` worked and `storehouse` failed
`isWalkable`, was dropped with no trace, and the villager ran 8 m into the open
instead. "Get behind that building" worked or didn't depending on how the
geometry happened to round.

The stand point is now **probed outward along the same retreat ray** in
`standoffStep` 0.5 increments up to `standoffProbe` 2.8 m past the ideal offset.
Along that ray only, so every property the single offset had is preserved: the
piece stays between villager and threat, and `minRetreatGain` only becomes
easier to clear further out.

### 4. A one-shot sound raised threat about half the time

`hearing.confidence` 0.35 against `belief.noticedAt` 0.3 left a heard-only
belief just `ln(0.35/0.3)/0.25` = **0.62 s** above the noticed threshold, and
§3.3's per-agent reaction delay (0.2–0.6 s, rolled at spawn) is spent inside
that window. Two identical runs of the same test — one combat sound at 5 m —
gave threat 0.23 and threat 0.00, decided by nothing but which reaction time
that agent happened to roll.

`noticedAt` is now **0.2**, which widens the window to 2.24 s: more than three
times the worst-case delay, so the "sound raises an eyebrow" behaviour lands on
every agent instead of half of them. The ceiling a heard belief can reach is
unchanged at 0.35, so it still cannot cross `cover.minThreat` 0.4 — the alarm's
loop-freedom margin (combat.json's `cover._doc`) is untouched.

### Still open

- **`engage_threat` remains unreachable in the shipped game** and
  `reportAgentDamaged()` still has no caller — both by design, both needing the
  `rosterSync` defender-exclusion decision reversed first, which is its own
  sign-off (see phase 7 above). Neither is a verification failure; the live pass
  could only exercise the kill path by hand-building a defender-job agent.
- **`take_cover`'s new numbers are reasoned, not yet re-observed live.**
  `commitSec` 12 and `sustainThreat` 0.15 want a night-skeleton pass on a real
  homestead: the villager should now finish the run, turn, watch for ~7–8 s, and
  then go back to work — with the panel's new `COMBAT … committed 1.4/12s` /
  `watching · release <0.15` marker saying which gate is holding them there.

---

## Not yet touched, and the honest reason

Nothing has migrated off the existing per-frame `if/else` cascades in
`Villagers.tsx`, `Npc.tsx`, `Defenders.tsx` or `Enemies.tsx`, and nothing
should until the system can move a body — phase 3 at the earliest. Villagers
are the obvious first migration (7 branches, all needs-shaped). Enemies are
the riskiest (combat is tuned and players notice).
