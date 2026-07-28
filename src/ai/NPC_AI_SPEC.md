# NPC AI System — Architecture Spec

**Target stack:** vanilla JavaScript (ES modules) + Three.js. No framework, no engine idioms.
**Scale:** 6–20 active NPCs.
**Roles:** domestic routines (needs + furniture use), combat / threat response, player companion, ambient background life.
**LLM dialogue:** out of scope for v1, but the memory layer is designed so it can be bolted on later without a rewrite.

This document is the contract. Implement against it. Do not invent alternative structures.

---

## 0. Non-negotiable rules

These exist because violating them is what makes NPC AI collapse at behavior #5.

1. **The decision layer never touches a transform, a mesh, or an AnimationMixer.** It emits `Intent` objects. A separate actuator consumes them. If you find yourself writing `npc.position.copy(...)` inside a decision function, stop.
2. **One arbiter.** There is exactly one thing that decides what an NPC does: the `UtilityReasoner`. Combat does not get its own parallel brain that "takes over."
3. **Never run decision logic in the render loop.** Decisions run on a scheduler at 1–10 Hz depending on LOD tier. Steering and animation run at frame rate.
4. **Zero allocation in per-frame code.** Reuse scratch `Vector3`s. No object literals, no `.map()`, no array spreads inside `update(dt)`.
5. **Every layer ships with a debug visualization in the same session it's built.** If the scores aren't visible on screen, the layer isn't done.
6. **No Unity/Unreal idioms.** No `MonoBehaviour`-shaped classes, no `Start()`/`Awake()`, no coroutines, no `GetComponent`. Plain classes and explicit `update(dt)` calls.

---

## 1. Layer map

```
src/ai/
  core/
    Blackboard.js        per-agent belief store
    Agent.js             owns blackboard, senses, reasoner, actuator
    AgentManager.js      registry + scheduler + LOD tiering
    Scheduler.js         round-robin think budget
    curves.js            response curve math
  perception/
    Senses.js            aggregates sensors, writes beliefs
    VisionSensor.js      cone + LOS raycast, throttled
    HearingSensor.js     radius-based event subscription
    Belief.js            decaying knowledge record
  decision/
    UtilityReasoner.js   scores actions, picks one, handles commitment
    Action.js            action definition + scoring
    Consideration.js     single scored input
    activities/          per-action behavior trees
      Activity.js        base: start/update/abort -> RUNNING|SUCCESS|FAILURE
      GotoAndUse.js
      EngageThreat.js
      FollowLeader.js
      Wander.js
      Idle.js
  navigation/
    NavService.js        wraps navcat; path queries + off-mesh links
    PathFollower.js      corner-following + arrival + repath
    Avoidance.js         local separation for 6-20 agents
  world/
    SmartObject.js       affordance container
    SmartObjectRegistry.js  spatial + tag query, reservations
    Affordance.js
  actuation/
    Actuator.js          consumes Intent, drives locomotion + anim
    Locomotion.js        velocity -> position, turn rate, root motion
    AnimationController.js  clip blending, one-shots, anchored anims
  debug/
    AIDebugOverlay.js    DOM panel: scored actions per agent
    AIDebugGizmos.js     vision cones, paths, navmesh, anchors
```

---

## 2. Data flow (one think tick)

```
Senses.update()
  -> writes/decays Beliefs in Blackboard

UtilityReasoner.think()
  -> gathers candidate Actions:
       intrinsic actions registered on the agent
       + affordance-derived actions from SmartObjectRegistry.query(nearby, tags)
  -> scores each (see §5)
  -> applies commitment bonus / cooldowns / min-duration
  -> if winner != current action: abort current Activity, start new one
  -> stores full scored list on blackboard for the debug overlay

Activity.update(dt)
  -> emits Intent objects onto the agent's intent slot
  -> returns RUNNING | SUCCESS | FAILURE

Actuator.update(dt)   // every frame, not on the think tick
  -> reads current Intent, drives PathFollower / AnimationController
```

---

## 3. Core types

### 3.1 Intent

The only thing that crosses the decision → actuation boundary.

```js
// Exactly one of these shapes. Discriminated by `type`.
{ type: 'MOVE_TO',    position: Vector3, speed: 'walk'|'run', stopDistance: number }
{ type: 'MOVE_TO_ANCHOR', objectId: string, anchorName: string, speed: 'walk'|'run' }
{ type: 'PLAY_ANIM',  clip: string, loop: boolean, anchored: boolean }
{ type: 'FACE',       target: Vector3 | entityId }
{ type: 'IDLE' }
{ type: 'ATTACK',     targetId: string }
```

The actuator is a pure switch over `type`. It knows nothing about needs, threats, or utility.

### 3.2 Blackboard

Per-agent. Plain object, no getters/setters, no reactivity.

```js
{
  id: string,

  // Drives — 0..1, decay per second, tuned in config
  needs: { energy, safety, purpose, hunger, morale, social, comfort },

  // Perception output
  beliefs: Map<entityId, Belief>,
  threatLevel: number,        // 0..1, derived, smoothed
  lastDamageAt: number,

  // Social / role
  leaderId: string | null,    // set for companion NPCs
  homeRegion: string | null,

  // Execution state
  currentActionId: string | null,
  currentActionStartedAt: number,
  cooldowns: Map<actionId, expiresAt>,
  reservation: { objectId, affordanceId } | null,

  // Debug (written every think, read by overlay)
  lastScores: Array<{ actionId, score, considerations: Array<{name, input, output}> }>
}
```

### 3.3 Belief

NPCs are **not** omniscient. This is what makes them feel human.

```js
{
  entityId: string,
  lastKnownPosition: Vector3,
  lastSeenAt: number,
  confidence: number,   // 1.0 on sight, decays exponentially when unseen
  isVisibleNow: boolean,
  firstSeenAt: number
}
```

Confidence decay: `confidence *= Math.exp(-decayRate * dt)`. Prune below 0.05.
Combat and search behavior must read `lastKnownPosition`, never the live transform of the target.

**Reaction delay:** when a belief first crosses the "noticed" threshold, do not act for `reactionTime` (200–600 ms, randomized per agent). Instant reaction reads as robotic.

---

## 4. Smart objects (the content pipeline)

This is where the Blender library becomes AI content. Adding a behavior means adding a prop, not editing the brain.

### 4.1 Blender-side convention

Each asset already sits under a named root empty. Extend that:

```
FORGE_01                    (root empty — becomes SmartObject.id)
  ├── mesh_anvil
  ├── mesh_bellows
  └── ANCHOR_use            (empty; +Z = facing direction the NPC should adopt)

BED_ADULT_01
  ├── mesh_bed
  ├── ANCHOR_sleep_L
  └── ANCHOR_sleep_R        (two slots)

CAMPFIRE_01
  ├── mesh_fire
  └── ANCHOR_gather
```

On glTF import, walk the scene graph, find nodes matching `/^ANCHOR_/`, and resolve them with `getObjectByName`. Store world position + quaternion at registration time; re-resolve only if the object moves.

Also add a `NAV_` prefixed collision-only mesh per room for navmesh generation (see §7).

### 4.2 Affordance schema

Authored as JSON, one file per object type, loaded at startup.

```js
{
  "type": "forge",
  "rootPrefix": "FORGE",
  "affordances": [
    {
      "id": "smith",
      "anchor": "ANCHOR_use",
      "anim": "smith_loop",
      "duration": 40,
      "slots": 1,
      "tags": ["purpose", "work", "outdoor"],
      "preconditions": ["!reserved", "!threatNearby"],
      "effects": { "purpose": +0.6, "energy": -0.1 },
      "baseWeight": 1.0
    }
  ]
}
```

`effects` are **advertised, not guaranteed** — the registry publishes them, the reasoner weights them against the agent's current needs (§5.4). This is the Sims/SimAnt advertising model (see Mark Brown's breakdown of it, §11) and it's the whole reason the system scales without code changes — the model, not the game content, is what's borrowed.

### 4.3 Reservations

Two NPCs must not share the same forge slot.

```js
registry.reserve(objectId, affordanceId, agentId) -> boolean
registry.release(objectId, affordanceId, agentId)
```

- Reserve **on activity start**, not on selection.
- Release on activity end, abort, agent death, or timeout (`duration * 3`).
- `slots > 1` allows N concurrent holders.
- An affordance whose slots are full scores **zero** — not "low." Use a boolean consideration so it multiplies out.

---

## 5. The utility reasoner

### 5.1 Candidate assembly

Every think tick, build the candidate list from two sources:

1. **Intrinsic actions** — registered per agent archetype. `engage_threat`, `take_cover`, `flee`, `follow_leader`, `assist_leader`, `wander`, `socialize`, `idle`.
2. **Affordance actions** — `registry.queryNearby(agent.position, radius, allowedTags)` returns affordances; each becomes a candidate action with its target object bound.

Cap the affordance query at ~12 nearest results. Do not score the whole house.

### 5.2 Consideration

A consideration is one normalized input passed through a response curve.

```js
{
  name: 'purpose_need',
  input: (agent, ctx) => 1 - agent.needs.purpose,   // MUST return 0..1
  curve: { type: 'quadratic', m: 1, k: 2, b: 0, c: 0 }
}
```

Inputs **must** be clamped to `[0,1]` before the curve. Unclamped inputs are the #1 source of "the NPC does something insane once every few minutes."

### 5.3 Response curves

Four parameters, following Dave Mark's IAUS formulation: `m` slope, `k` exponent, `b` vertical shift, `c` horizontal shift. Implement in `curves.js`:

```js
// x is clamped 0..1; all return clamped 0..1
linear:    y = m * (x - c) + b
quadratic: y = m * Math.pow(x - c, k) + b
logistic:  y = m / (1 + Math.exp(-10 * k * (x - 0.5 - c))) + b
logit:     y = m * Math.log((x - c) / (1 - (x - c))) / 5 + 0.5 + b
bool:      y = x > 0.5 ? 1 : 0
```

Curve authoring guidance to bake into the config comments:
- **Needs → quadratic with k=2, m=1**: mild need barely registers, urgent need dominates. This is what makes an empty safety need override idle wandering once a threat closes in.
- **Distance → linear with m=-1, b=1** over a normalized max range: closer is better, linearly.
- **Threat → logistic**: a sharp switch, so combat cleanly overrides domestic behavior instead of fading in.
- **Availability / preconditions → bool**: hard gate, multiplies to zero.

### 5.4 Scoring — with compensation

Multiply considerations. This is correct (a single zero kills the action) but has a known flaw: multiplying many sub-1.0 values collapses the score, so actions with more considerations are unfairly penalized. Apply the IAUS compensation factor:

```js
function scoreAction(action, agent, ctx) {
  const n = action.considerations.length;
  const modFactor = 1 - (1 / n);

  let score = 1;
  for (let i = 0; i < n; i++) {
    const c = action.considerations[i];
    const x = clamp01(c.input(agent, ctx));
    const y = clamp01(evalCurve(c.curve, x));
    if (y === 0) return 0;                 // early out: hard gate failed
    const makeUp = (1 - y) * modFactor;
    score *= (y + makeUp * y);
  }
  return score * action.weight;             // category weight, see 5.5
}
```

### 5.5 Category weights

Coarse tiering so combat can't be out-voted by a full stack of domestic considerations:

| Category    | weight |
|-------------|--------|
| survival    | 4.0    |
| combat      | 3.0    |
| companion   | 2.0    |
| needs       | 1.0    |
| social      | 0.8    |
| ambient     | 0.3    |

Weights multiply the final score. Tune these last, after curves are right.

### 5.6 Commitment — do not skip this

An uncommitted utility system flip-flops every tick and the NPC vibrates between two actions. Three mechanisms, all required:

1. **Momentum bonus** — the currently-running action gets `score *= 1.25` while it's running.
2. **Minimum duration** — an action declares `minDuration`; below that it cannot be replaced except by a higher-`interruptPriority` category. Combat interrupts smithing. Wandering does not.
3. **Cooldowns** — on completion, write `cooldowns.set(actionId, now + cooldown)`. A cooling-down action scores zero.

Also: **switch threshold.** Only replace the current action if `newScore > currentScore * 1.15`.

### 5.7 Activities

The winning action starts an `Activity` — a small behavior tree or, more simply for this scale, a state object with three statuses.

```js
class Activity {
  start(agent, ctx) {}
  update(agent, dt) { return RUNNING | SUCCESS | FAILURE; }
  abort(agent) {}          // MUST release reservations
}
```

`GotoAndUse` (covers every affordance action):

```
start:    reserve affordance; resolve anchor world transform
update:   phase 'travel'  -> emit MOVE_TO_ANCHOR; on arrival -> 'align'
          phase 'align'   -> emit FACE(anchor forward); on aligned -> 'perform'
          phase 'perform' -> emit PLAY_ANIM(affordance.anim, anchored: true)
                             apply effects to needs, prorated over duration
                             timer >= duration -> SUCCESS
abort:    release reservation, clear intent
```

Prorating effects over the duration (rather than applying them in a lump at the end) matters: it means an interrupted bath still gets you partway clean, which reads as correct to the player.

---

## 6. Perception

### 6.1 VisionSensor

- Params: `fov` (radians), `range`, `peripheralRange` (shorter, wider), `updateHz` (4–6, **not** frame rate).
- Broad phase: squared-distance check against agent list. No raycasts yet.
- Mid phase: dot product against forward vector for the cone test.
- Narrow phase: **one** raycast per candidate per tick, against a dedicated `losCollider` layer only — never the full scene graph. Budget: max 4 raycasts per agent per tick, round-robin the rest.
- Deliberate degradation: certainty ramps with time-in-view and target size, not instantly. A target at the edge of the cone at max range should take ~1.5 s to reach full confidence.

### 6.2 HearingSensor

Event-driven, not polled. The world emits `{ position, loudness, type, sourceId }`; the manager dispatches to agents within `loudness * falloff`. Sounds create low-confidence beliefs with a *fuzzed* position (offset by a few metres) so NPCs investigate an area rather than walking to the exact source.

### 6.3 Threat derivation

`threatLevel` is derived once per think tick from beliefs, then smoothed (`lerp` toward the target by 0.3) so it doesn't spike and cause an action flip. Inputs: hostile belief count, nearest hostile distance, time since last damage.

---

## 7. Navigation

### 7.1 Library

Use **navcat** (`npm i navcat`, `navcat/three` entrypoint). Pure JS, tree-shakeable, and its off-mesh connections can be added and removed dynamically without regenerating tiles — which is what you need for doors. Its crowd API also exposes animation hooks for off-mesh traversal, which is how a stair or door link plays the right clip.

(Alternative if you hit a wall: `recast-navigation-js` + `@recast-navigation/three`. Mature, WASM, bigger bundle, no tree-shaking. Its `NavMeshHelper` / `CrowdHelper` visualizers are excellent for debugging either way.)

### 7.2 Build offline, never at runtime

1. Author `NAV_` prefixed collision geometry in Blender alongside the visual meshes.
2. Generate the navmesh in a build script; serialize to JSON.
3. Ship the JSON. Load and deserialize at startup. Runtime generation in a browser is a multi-second stall.

### 7.3 Off-mesh links

Register for: the arched doors, stairs, and any anchor that requires a specific approach. Each link carries `{ animClip, duration, requiresOpen }`. The `PathFollower` hands control to the `AnimationController` for the link's duration, then resumes.

### 7.4 PathFollower

- Request path → get corner list (funnel-smoothed straight path).
- Steer toward the next corner; advance when within `cornerRadius` (0.4 m indoors).
- **Repath triggers:** target moved > 2 m, path invalidated by a door state change, or stuck (velocity < 0.05 for > 0.7 s).
- Hard cap: 2 path queries per frame across all agents. Queue the rest.

### 7.5 Local avoidance

At 6–20 agents in a house, full RVO is overkill. Use separation steering: for neighbours within 1.2 m, apply a repulsion force weighted by inverse distance, clamped to 30% of max speed so it perturbs the path rather than replacing it. Add a small per-agent priority so two NPCs in a doorway resolve instead of deadlocking — lower priority yields and sidesteps.

---

## 8. Scheduler and LOD

With 6–20 agents this is about smoothness, not raw throughput. Never think all agents on one frame.

| Tier | Condition                                             | Think Hz | Perceive Hz | Steering  |
|------|--------------------------------------------------------|----------|-------------|-----------|
| A    | in frustum, < 15 m                                    | 10       | 6           | full      |
| B    | in frustum, 15 m to region's nav-window edge*          | 5        | 4           | full      |
| C    | out of frustum, same region, or past the window edge*  | 2        | 2           | simplified|
| D    | different region                                      | 0.5      | off         | teleport along path |

**Correction, added once destination navigation shipped (see
`PHASE_2_NAVIGATION_AND_GATHERING.md` §2.0):** *"window edge" only applies to
**windowed** regions — destinations, where the nav grid covers only a
~48 m-radius bubble around the player, not the whole region. **Fixed** regions
(home, the Sealed Crypt) always have a grid covering the whole region, so
Tier B stays unbounded there, exactly as first specified above. Without this
bound, a destination agent could sit in frustum at, say, 90 m — legitimately
Tier B by the original rule — while standing entirely outside the very grid
its own "full steering" depends on. The bound must read the **same config
value** as that region's `windowHalf`, not a second number a person has to
remember to keep in sync.

Tier D agents skip perception entirely, advance needs statistically, and jump along their path in coarse steps. When a tier-D agent re-enters view, snap it to the nearest valid navmesh point and resume normally.

Implementation: a round-robin queue with a per-frame budget of **3 thinks max**. Assign each agent a random phase offset at spawn so tiers don't align.

---

## 9. Debug overlay — build this in phase 1, not last

**DOM panel** (top-right, toggled with `~`), for the selected agent:

```
AGENT: npc_02          TIER: A     ACTION: smith_forge (12.4s / 40s)
NEEDS  energy .72  safety .18  purpose .61  morale .44  social .30
THREAT 0.02

SCORED ACTIONS
  0.812  smith_forge        [purpose .82→.67] [dist .91→.91] [avail 1→1]
  0.544  warm_at_campfire   [morale .61→.37] [dist .88→.88] [avail 1→1]
  0.310  chat_at_market     [social .56→.31] [dist .74→.74] [avail 1→1]
  0.000  engage_threat      [threat .02→.00] ← GATED
```

Show input **and** post-curve output per consideration. Without that you cannot tell a bad curve from a bad input, and neither can a coding agent.

**Scene gizmos** (toggle individually): navmesh wireframe, current path + corners, vision cone, belief markers at `lastKnownPosition` with confidence-scaled opacity, anchor axes, reservation lines.

---

## 10. Build order

**One phase per session.** Do not start a phase before the previous one's debug view works.

1. **Skeleton + debug.** `Agent`, `Blackboard`, `AgentManager`, `Scheduler`, DOM overlay. One NPC that does nothing but tick and print. Ship the overlay here.
2. **Navigation.** navmesh JSON pipeline, `NavService`, `PathFollower`, gizmos. NPC walks to a clicked point, avoids walls, handles one door link.
3. **Actuation.** `Intent` types, `Actuator`, `Locomotion`, `AnimationController`. Walk/idle blend, one anchored animation. Still no decisions — drive it from a hardcoded intent queue.
4. **Smart objects.** Blender anchor convention, affordance JSON, registry, reservations, `GotoAndUse`. NPC uses a hardcoded affordance end-to-end.
5. **Utility reasoner.** Curves, considerations, compensated scoring, commitment. Needs-driven domestic loop with 5–6 affordances. **Tune here — this is where the time goes.**
6. **Perception.** Vision, hearing, beliefs, decay, reaction delay. Debug markers.
7. **Combat + companion.** Intrinsic actions, category weights, interrupt priorities, `EngageThreat` / `FollowLeader` activities.
8. **LOD tiers + ambient.** Tier logic, statistical simulation, wander for background NPCs.
9. **Optional: LLM layer.** See §11.

---

## 11. Forward compatibility for LLM dialogue

Not built now. Two cheap design choices keep the door open:

1. **Beliefs and completed activities append to a `memoryStream`** — timestamped records with a natural-language `summary` string generated by a template (`"smithed at 14:20"`, `"saw player in the hallway"`). Ring buffer, cap 200 per agent.
2. **Retrieval interface stub.** `agent.recall(query, k)` returning top-k. For now, score by recency alone. Later, swap to the Generative Agents formulation — normalized recency (exponential decay) + importance + embedding relevance, summed. Keep k in the 3–5 range; more than 10 doesn't help.

The LLM must only ever produce **dialogue and flavor**, never movement or action selection. The utility reasoner stays authoritative.

---

## 12. Config files (author these, don't hardcode)

```
config/
  needs.json          decay rates per need, per archetype
  archetypes.json     which intrinsic actions + which need profile
  actions/*.json      considerations, curves, weights, cooldowns
  affordances/*.json  per object type
  perception.json     fov, ranges, reaction times, decay rates
  lod.json            tier thresholds and rates
```

Every tunable number lives in JSON. If a designer-facing value is in a `.js` file, it's a bug.

---

## Reference material

- **Game AI Pro vols 1–3** — free chapters at gameaipro.com. Especially: "Choosing Effective Utility-Based Considerations" (Mike Lewis), "A Reusable, Light-Weight Finite-State Machine" (Rez Graham), "Vision Zones and Object Identification Certainty" and "Agent Reaction Time" (Steve Rabin).
- **Dave Mark, Infinite Axis Utility System** — GDC AI Summit 2013 ("Architecture Tricks: Managing Behaviors in Time, Space, and Depth") and GDC 2015 with Mike Lewis ("Building a Better Centaur: AI at Massive Scale").
- **Damian Isla, "Handling Complexity in the Halo 2 AI"** (GDC 2005) — behavior tree origins.
- **Jeff Orkin, "Three States and a Plan: The A.I. of F.E.A.R."** (GDC 2006) — free PDF at gamedevs.org. Note the `UseSmartObject` state; same idea as §4 here.
- **Anguelov / Vehkala / Weber, "AI Arborist"** (GDC 2017) — behavior tree pitfalls.
- **Mark Brown (GMTK), "The Genius AI Behind The Sims"** — clearest explanation of advertised utility anywhere.
- **navcat docs** — navcat.dev/docs
- **Yuka** — mugen87.github.io/yuka — worth reading its steering and vision source even if you don't take the dependency.
