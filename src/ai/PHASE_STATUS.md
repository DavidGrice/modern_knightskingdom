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
| 2 | Navigation | not started — **spec written, decision made** | navmesh/path gizmos |
| 3 | Actuation | not started | — |
| 4 | Smart objects | not started — **open design question** | anchor axes |
| 5 | Utility reasoner | not started | ✅ renderer already built |
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

## Phase 2 — decided, spec written, not implemented

**`PHASE_2_NAVIGATION_AND_GATHERING.md` now supersedes `NPC_AI_SPEC.md` §7 in
full and is the thing to build against.** It resolves the adopt-vs-extend
question below in favour of **extending `navgrid`**, on the grounds that this
world is player-mutable mid-session — every building placement would invalidate
a baked navmesh, and a tile cache would need a second obstacle representation
maintained alongside `collisionBoxesFor()`, which is the exact desync the
current design avoids.

No phase 2 code exists yet. The original framing is kept below for the record.

### The question, as it stood

`src/game/navgrid.ts` already exists and every actor in the game steers with
it: a 1 m A\* grid whose obstacles are derived from the *same* collision
volumes that stop the player, which is why an archway or a breached wall is
automatically walkable with nobody maintaining a second obstacle list.

§7.1 says navcat + Blender-authored `NAV_` meshes + offline navmesh JSON.
That buys off-mesh links (doors, stairs), coverage of the nine destination
worlds, and funnel smoothing. It costs the derived-from-real-collision
property above.

**Decide adopt-vs-extend before writing any phase 2 code.** Do not assume the
spec wins. If navcat does win, the `NAV_` Blender authoring pass over the
existing rooms happens *first* — regenerating per-room navmesh JSON later is
worse than authoring it alongside. Full detail in `PROJECT_CONTEXT.md` §5.

---

## Phase 4 — open design question

§4.1 wants `ANCHOR_` empties baked into each prop in Blender. This game's
furniture is **placed by the player at runtime** on a build grid, so there is
no per-instance scene node to read an anchor from. An anchor has to be derived
from `type + x + z + rot` via a lookup table instead — which changes the shape
of the affordance JSON. Also note there are only 15 animation clips and none
of them is a sit, sleep, eat or use-object clip (`PROJECT_CONTEXT.md` §4).

---

## Not yet touched, and the honest reason

Nothing has migrated off the existing per-frame `if/else` cascades in
`Villagers.tsx`, `Npc.tsx`, `Defenders.tsx` or `Enemies.tsx`, and nothing
should until the system can move a body — phase 3 at the earliest. Villagers
are the obvious first migration (7 branches, all needs-shaped). Enemies are
the riskiest (combat is tuned and players notice).
