# Project context for `NPC_AI_SPEC.md`

**Who this is for:** an assistant with no access to this repository — paste or
upload this file alongside `NPC_AI_SPEC.md` before asking for phase 2+ work.
It is written to be self-contained. Everything below was read out of the code,
not remembered.

**Companion files:** `PHASE_STATUS.md` (what is built, what is next — update it
every phase), `README.md` (in-repo file map).

---

## 1. The game, in one paragraph

A remake of *LEGO Creator: Knights' Kingdom* (2000), built on assets extracted
from the original. First/third-person, open homestead: you gather, craft,
build structures on a grid, recruit villagers who work jobs, fight raids, take
quests from a royal court, and travel to nine other "instance" worlds. It is a
large, mature codebase — roughly 30 world components, 60 game modules, a save
system, and 130 browser smoke tests. The NPC AI spec is being adopted to
replace behaviour that currently works but does not scale.

## 2. Stack — and why the spec has to bend

| Spec assumes | Reality | Consequence |
|---|---|---|
| vanilla JS ES modules | **TypeScript, `strict: true`** | all AI code is `.ts`/`.tsx`; a `.js` island loses the only type checking the repo has |
| bare Three.js, you own the loop | **React Three Fiber 9 + React 19 + Next 15** | there is no `requestAnimationFrame` to own. R3F owns the frame; AI is stepped from a single `useFrame` |
| `config/` at repo root | **`src/ai/config/*.json`**, imported via `resolveJsonModule` | still plain JSON text edits, which is what §12 actually asks for |
| `npm i navcat` | **see §5 below — read it before planning phase 2** | there is already a working navigation system |

Three.js is `0.176`. State is **zustand** (`src/game/store/gameStore.ts`).

### The rule that catches everyone

Per-frame data in this codebase does **not** live in zustand. It lives in
plain mutable module objects that components read and write directly
(`playerState`, `combatState`, `villagerMobs`, `npcMobs`, `worldEnv`,
`stabledHorses`). Putting a 60 Hz value in the store re-renders the React tree
60 times a second. The AI system follows this convention: `agentManager` is a
module singleton, the blackboard is a plain object, and the debug overlay
polls it at 10 Hz instead of subscribing.

**Circular-import trap:** if the store must also read a value, that value goes
in a third dependency-free leaf module both sides import (`carts.ts` exists
purely for this). `import type` breaks a cycle for free, since types erase.

---

## 3. What is already alive, and how it behaves

Every actor below currently runs its own per-frame `if/else` cascade inside a
`useFrame`. This is exactly the "collapse at behavior #5" the spec is meant to
prevent — but it works today, and nothing has migrated yet.

| Actor | File | Count | Behaviour today |
|---|---|---|---|
| Villagers | `components/world/Villagers.tsx` | player-recruited roster | ~7 branches: arriving-by-road → flee-raid → night bed-seek → job worksite trip → builder → market/campfire ritual → wander |
| Court NPCs | `components/world/Npc.tsx` | 7 named (king, queen, richard, john, storm, farmer_alric, miller_beda) | stand still, wave when spoken to, drift to a night gathering spot |
| Defenders | `components/world/Defenders.tsx` | villagers with `job: 'defender'` | own combat AI + a player-issued order radial |
| Enemies | `components/combat/Enemies.tsx` | spawned in raids/dungeon | chase / attack / wander; kinds: `skeleton, bandit, gilbert, cedric, storm, royal` |
| Merchant, wildlife, horses | various | a handful | scripted loops |

**Live position registries** (read by the minimap, targeting, combat):
`villagerMobs[id] = {x, z}`, `npcMobs[id]`, `useEnemyStore.getState().enemies`.
Anything the AI system eventually drives has to keep writing these, or the
minimap and the crosshair stop seeing it.

Realistic concurrent scale: **10–25 actors**, which matches the spec's 6–20.

---

## 4. Content inventory — this constrains §4 and §5 hard

### There are exactly 15 animation clips. All of them:

```
anim_c_walk        anim_c_run          anim_c_angry       anim_c_attention
anim_c_confused    anim_c_pleased      anim_c_think       anim_c_surprisejump
anim_g_swordswish  anim_g_fallbackward anim_r_restpose    anim_r_greet1
anim_r_regalwave   anim_r_congratulate anim_r_gesturepullsword
```

**There is no sit, no sleep, no eat, no bathe, no work-at-object clip.** The
spec's worked example (`"anim": "bathe_loop"`, duration 40 s) has no
counterpart here and cannot be authored without new animation work. Existing
code fakes "working" with `anim_g_swordswish` (a sword swish standing in for
a hammer/axe swing) and "resting" with `anim_r_restpose`.

Any affordance content proposed for phase 4/5 must either (a) name one of
those 15 clips, (b) be a pose held on `anim_r_restpose` with the body
positioned at an anchor, or (c) come with an explicit note that it needs a new
clip. Do not silently invent clip names — that is the single easiest way to
produce a spec that looks complete and builds nothing.

Clips are JSON keyframe data (`public/assets/anims/*.json`), 11 tracks, applied
to a procedurally assembled minifig rig (`lib/minifigRig.ts`), not glTF
animations.

### Furniture does not exist as smart objects yet

There are ~40 placeable building types, player-positioned on a grid:

```
campfire workbench forge torch bed barrel stockpile flowerbed tree fence
plant palisade stonewall tower gate keep farmplot quintain cannon warcart
bladecart market_stall stable banner  (+ ~18 raw castle/brick pieces)
```

Shape: `{ id, type, x, z, y?, rot: 0|1|2|3, built?: 0..1, world?: string|null }`.

These are the natural §4 smart objects — `bed` genuinely is a bed — but:
- they are **player-placed at runtime**, not authored scene props, so anchors
  cannot be baked in Blender per instance. An anchor has to be derived from
  the building's type + position + `rot` (a table lookup), not read from a
  glTF node. **This is a real divergence from §4.1 and needs a decision.**
- `rot` is quarter-turns only, so anchor facings are 90°-quantised for free.
- a building with `built < 1` is a construction site, not usable.
- `world` must be respected — see §6.

---

## 5. Navigation already exists — read this before planning phase 2

`src/game/navgrid.ts`. Not a stub; it is what every villager, enemy and court
NPC steers with today.

- **1 m grid, A\* with octile heuristic**, covering ±56 m centred on the
  homestead. String-pulled to corners. Diagonal corner-cutting blocked.
- **Obstacles are derived from `collisionBoxesFor()` — the same volumes that
  stop the player.** Real per-piece geometry, voxelised offline from the source
  OBJs by `scripts/gen-collision.mjs` and merged into a few AABBs.
- Boxes are ignored if they sit entirely below 0.55 m (a kerb you step over)
  or entirely above 1.7 m (an overhang you walk under). **This is why an
  archway, a gateway and a breached wall are automatically walkable with no
  extra bookkeeping** — nobody maintains a second obstacle list, so nobody can
  forget to update it.
- Obstacles are inflated by a 0.55 m agent radius.
- API: `navSteer(agent, tx, tz, dt) → { nx, nz, dist }` — a unit step direction
  plus the true straight-line distance, so a caller's existing "am I there
  yet?" check keeps working and only the step direction changes. Per-agent
  path state is stashed on the agent object as `agent.nav`. Repaths are
  staggered (1.1–1.9 s, randomised) so a village never solves on one frame.
- `findPath(sx, sz, tx, tz)` is public. `rebuildNav(buildings)` is a no-op
  unless the building array's identity changed.

### Known limits

1. Covers the homestead **only** — ±56 m, and only buildings where
   `isHomeBuilding(b)`. The nine destination worlds have **no navigation at
   all**; actors there steer straight.
2. Grid, not navmesh: no off-mesh links, no doors-as-links, no multi-level.
3. Linear-scan open set (fine at this size, would not survive a bigger grid).

### The question phase 2 must answer honestly

§7.1 says navcat + `NAV_` collision meshes authored in Blender + offline
navmesh JSON. That buys off-mesh links (doors, stairs), destination coverage,
and proper funnel smoothing. It costs the derived-from-real-collision property
above, which is genuinely valuable and was hard-won.

**Do not assume the spec wins.** The useful output here is a comparison that
takes the existing system seriously: what specifically does the grid fail at
that the game needs *now*, can off-mesh links be added to a grid, and is the
right answer "extend navgrid to destinations + add link support" rather than a
rewrite. If navcat does win, the `NAV_` Blender authoring pass over existing
rooms should happen before phase 2 starts, not during.

---

## 6. Conventions that will silently break generated code

- **Yaw sign.** `yaw = 0` faces **−Z**. Recovering a yaw from a direction is
  `Math.atan2(-dx, -dz)`. The un-negated version has been copy-pasted into
  three separate files over this project's life and makes actors walk
  backwards every time. Figures rendered through the minifig rig additionally
  need `rotation.y = yaw + Math.PI`.
- **`dt` is clamped to 0.05 s per frame** everywhere. Wall-clock time and
  simulated time genuinely diverge under a slow renderer. The AI system
  therefore keeps its own clock (`agentManager.now`) advanced by `dt`, and
  every AI timestamp — needs, cooldowns, action durations, belief decay —
  must be measured against it, never `performance.now()` or `Date.now()`.
- **Ground height has two paths.** Home world: flat, `y = 0`. Destinations:
  `destinationGroundY(x, z)` (a raycast against the mounted bake) — hillsides
  vary 12 m+. Never hardcode `y = 0` for anything that can travel.
- **Instance separation.** The nine destination worlds are not separate
  scenes; they sit far apart in one shared coordinate space (template-01 is
  around x≈1000, cedric's camp x≈2185). Anything with a position must also
  carry which world it belongs to, or it renders in the sky above the
  homestead. The AI system models this as `agent.region` (`null` = home) and
  drops off-region agents to LOD tier D.
- **The player transform is a write-only mirror.** `playerState.x/z/yaw` is
  republished from the controller's own refs every frame; writing to it does
  nothing. Relocation goes through `playerState.pendingTeleport`.
- **Nothing AI-related is persisted.** `SaveGame` has no AI fields, and
  `destination` is force-reset to `null` on load. Agents are session-only and
  `agentManager.clear()` runs on `newGame`/`loadFromSave`. If a phase wants
  persistence, that is new work in `lib/save.ts` and must be stated.

---

## 7. Phase 1, as actually built

Full API surface, so code can be written against it without seeing the repo.

```ts
// src/ai/core/AgentManager.ts
export const agentManager: AgentManager;         // module singleton, window.__kkai
  agents: Agent[]                                 // registry
  now: number                                     // GAME seconds, dt-driven, pauses
  activeRegion: string | null
  spawn(id, archetype, x, z, region = null): Agent   // idempotent by id
  despawn(id); get(id); clear()
  update(dt, camera, activeRegion)                // called once per frame
  thinksPerSec, peakThinksPerFrame, thinkBudget   // debug readouts

// src/ai/core/Agent.ts
class Agent {
  id; archetype; def: ArchetypeDef; bb: Blackboard
  position: THREE.Vector3; yaw: number; region: string | null
  tier: 'A'|'B'|'C'|'D'; thinkHz; perceiveHz; steering
  thinkCount; measuredHz
  think(now)                 // decays needs. Nothing else yet.
  addNeed(id, delta)         // clamped 0..1
}

// src/ai/core/Blackboard.ts  — plain object, spec §3.2 verbatim
{ id, needs, beliefs: Map, threatLevel, lastDamageAt, leaderId, homeRegion,
  currentActionId, currentActionStartedAt, cooldowns: Map, reservation,
  lastScores: ScoredAction[] }

// src/ai/config/index.ts
NEED_IDS  // energy hygiene bladder hunger fun social comfort
needProfile(profileId) → Record<NeedId, {decayPerSec, start}>
archetypeDef(id) → {label, needProfile, intrinsic: string[]}
LOD, tierDef(tier)
```

**Needs are satisfaction, 0..1, all decaying downward.** `1` = fully satisfied.
`bladder: 1` = empty, `0` = bursting. So a consideration reads urgency as
`1 - needs.x`. Decay is per **game** second; a full day is 720 s.

**Scheduler:** round-robin, hard cap of 3 thinks per frame across all agents,
cursor persists across frames so a deferred agent gets first refusal next
frame. Verified: 20 agents, budget never exceeded, 5 thinks each over 5 s,
zero starvation.

**Needs decay by time elapsed since that agent's *last think*,** not by a fixed
step — which is what makes a 0.5 Hz tier-D agent end up exactly as hungry as a
10 Hz tier-A one, with no separate statistical path (§8 asked for one; it is
not needed).

**Debug overlay:** `` ` `` toggles, `Shift+`` ` `` cycles agents. Renders the
§9 layout including the full scored-action row with `input→output` per
consideration — that renderer is already written, so phase 5 only has to fill
`bb.lastScores`.

**The phase-1 agent (`probe_01`) has no mesh and no behaviour.** That is
deliberate per §10.1.

---

## 8. What is genuinely open, per phase

Ranked by how much a wrong assumption costs.

1. **Phase 2 — navcat vs. extending navgrid.** See §5. Highest-stakes
   decision in the whole plan.
2. **Phase 4 — anchors on runtime-placed buildings.** §4.1's Blender-baked
   `ANCHOR_` empties do not fit player-placed furniture. Likely answer: a
   type→anchor-offset table in JSON, rotated by the building's `rot`. Needs
   designing, and it changes what the affordance JSON looks like.
3. **Phase 4/5 — affordance content against 15 clips.** See §4. Either the
   content is built from what exists, or new animation work gets scoped
   explicitly. Both are fine; silently assuming `bathe_loop` is not.
4. **Phase 3 — actuation vs. the existing renderers.** Each actor type has its
   own component driving a rig. Does the Actuator drive those components, or
   replace them? Migration order matters: villagers are the obvious first
   candidate (7 branches, all needs-shaped); enemies are the riskiest
   (combat is tuned and players notice).
5. **Phase 5 — the tuning pass.** The spec says this is where the time goes
   and it is right. The overlay is ready for it.
6. **Phase 7 — combat has an existing owner.** `game/combat.ts` (~630 lines)
   holds stamina, weapons, damage, loot, duel special-cases. §0.2's "one
   arbiter" means the reasoner *selects* combat actions while `combat.ts`
   stays the mechanics layer — the boundary needs stating before code.

---

## 9. How to make output that lands

- **Prefer concrete artifacts over prose.** Complete JSON config files, exact
  curve parameters, a named-function signature list. This project's phases
  land fastest when the spec-side output is drop-in content.
- **Name real clips, real building types, real ids** from §4. Made-up content
  is the main failure mode.
- **State assumptions you had to make**, especially about anything not in this
  file. It is better to be told "I assumed X" than to find X wrong at
  integration.
- **Every phase needs a verification story**, because this repo tests in a real
  browser: `scripts/smoke*.mjs` drives headless Chrome via playwright-core
  against `next dev`, reaching into `window.__kk` (store), `__kkp` (player),
  `__kke` (enemies), `__kkai` (agents). Note that headless renders at ~8 fps
  with `dt` clamped, so real elapsed time is roughly 2.4× game time — timing
  assertions must account for it or assert on direction of change, not
  arrival.
