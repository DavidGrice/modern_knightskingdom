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
