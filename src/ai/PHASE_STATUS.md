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
| 2 | Navigation | not started — **spec complete, 4 gaps resolved** | navmesh/path gizmos |
| 3 | Actuation | not started — **spec verified, 20-iteration plan set** | current-intent readout |
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
| 3.2 | `feature/phase3-2-intent-type` | `Intent` union type; `Agent.intent: Intent \| null` field | 3.1 |
| 3.3 | `feature/phase3-3-locomotion-villagers` | `Locomotion` module (resolve Intent → target, `navSteer`, `bb.movement` status write); splice as a new first-checked branch in `Villagers.tsx`'s cascade | 3.2 |
| 3.4 | `feature/phase3-4-locomotion-npc` | Same splice into `Npc.tsx` — separate iteration because its shape is genuinely simpler (one call site, not seven) | 3.2 (not 3.3 — independent) |
| 3.5 | `feature/phase3-5-animation-controller` | `PLAY_ANIM` intent wired into each component's existing clip-selection; `ResourceProp` carried-item component portaled to `rig.joints.rightarm` | 3.3, 3.4 |
| 3.6 | `feature/phase3-6-debug-intent-readout` | Extend `AIDebugOverlay` with current-intent (type, params, elapsed, `bb.movement.status`) | 3.2 |
| 3.7 | `feature/phase3-7-verification` | Hardcoded intent queue (`MOVE_TO` a clicked point → `IDLE`) on one villager; confirm minifig walks and stops, minimap dot tracks, `bb.movement` transitions, rotation matches travel and snaps on `FACE` | 3.3–3.6 |

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
