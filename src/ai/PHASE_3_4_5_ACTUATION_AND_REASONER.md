# Phases 3–5 — Actuation, the Reasoner Core, and Gathering

**Status: verified against code, 2026-07-27.** §3.0's core claim (checked
first, as flagged) is directionally right but needed real refinement — see
the "Correction:" callouts. Everything else checked out or needed only a
small fix. See `PHASE_STATUS.md` for the iteration-by-iteration build plan
this spec now feeds.

Where this document can reason from facts already verified this thread (the
`navSteer` caller audit from phase 2), it does, and that changes phase 3's
scope for the better — see §3.2. Everywhere else it's marked as an assumption.

| Section | Phase | Depends on |
|---|---|---|
| §3 Actuation | **3** | phase 2 (navgrid, `navSteer`) |
| §4 Blackboard & anchors | **4** | phase 3 (Actuator exists to consume the new fields) |
| §5 Reasoner core + gathering | **5** | phase 4; §5.7–5.8 point at `PHASE_2_NAVIGATION_AND_GATHERING.md`, not duplicated here |

---

## 3. Phase 3 — Actuation

### 3.0 What phase 1 actually built, and the one real unknown

Per `NPC_AI_SPEC.md`'s original build order, phase 1 was deliberately a
skeleton: "one NPC that does nothing but tick and print." It did not wire
anything to rendering. So phase 3 isn't extending an existing bridge between
AI and the visible game — **it's building that bridge for the first time.**

That sounds bigger than it likely is. One fact already survives from phase
2's verification: **only `Villagers.tsx` and `Npc.tsx` call `navSteer`, and
they must already be calling it today** — for whatever ad hoc movement drives
villagers and NPCs right now, pre-AI. `navSteer`'s signature
(`agent, tx, tz, dt) => {nx, nz, dist}`) is a pure steering function; it
doesn't touch position itself, so *something* in those two components already
holds a target, calls `navSteer`, and applies the result to a transform and
(presumably) to `villagerMobs`.

**Confirmed, with a correction to the mechanism.** Checked both files
directly.

**`Villagers.tsx` has SEVEN separate `navSteer` call sites in one `useFrame`**
— one per behavioural branch (arriving, raid-flee, night-bed-seek,
job-worksite-trip, builder, idle-ritual, wander), each ending in its own early
`return` right after its own `mob.x = s.x; mob.z = s.z;` write. There is no
single point that "supplies the target" to swap — "swap only the source"
undersold the real shape. **The correct splice is a new branch inserted
FIRST, checked before all seven existing ones:** if this villager has an
`Agent` with an active `MOVE_TO`/`MOVE_TO_ANCHOR` Intent, resolve the target
from that Intent, call `navSteer` once, write `mob.x/z`, and `return` — same
shape as every existing branch, just new and first. Villagers with no
Agent (or an Agent with no active movement Intent) fall through to the
existing cascade completely unchanged. This is what makes migration
incremental: gather/haul/flee/sleep can each take over one behaviour at a
time (§5.6), and the old branch for that behaviour comes out only once its
replacement is live — nothing needs a flag day.

**`Npc.tsx` has exactly one `navSteer` call site** (the day/night schedule
branch) — genuinely simpler than Villagers.tsx, confirming these two need
separate implementation passes (§3.0's shape differs enough between them that
one splice pattern does not describe both).

**A real prerequisite this section didn't name as its own step: no villager
has an `Agent` yet.** Checked `AiRuntime.tsx` — it only ever spawns the
phase-1 probe (`probe_01`). "For any villager with an assigned Agent" (below)
has nothing to check against until something spawns one per roster villager
(and despawns on removal), the same lifecycle `registerVillagerMob`/
`registerNpcMob` already give the mob registries. This is real, sequenced
work, not an implementation detail — see `PHASE_STATUS.md`'s iteration 3.1.

### 3.1 Intent

Unchanged from `NPC_AI_SPEC.md` §3.1, with `ATTACK` explicitly deferred —
combat is out of scope through phase 5 (see §5.9).

```ts
export type Intent =
  | { type: 'MOVE_TO';        position: { x: number; z: number }; speed: 'walk' | 'run'; stopDistance: number }
  | { type: 'MOVE_TO_ANCHOR'; targetId: string; anchorName: string; speed: 'walk' | 'run' }
  | { type: 'PLAY_ANIM';      clip: string; loop: boolean; anchored: boolean }
  | { type: 'FACE';           target: { x: number; z: number } }
  | { type: 'IDLE' };
  // ATTACK deferred — see §5.9
```

`MOVE_TO_ANCHOR` carries a `TargetId` (§3.1 of the phase-2 doc,
`'node:17' | 'bldg:42'`) plus the anchor name the rule resolved (§3.2 there),
not a bare position — resolving *which* anchor point is the reasoner's job
(phase 5), not the Actuator's.

**Where it lives: checked, needs a new field.** Neither `Agent` nor
`Blackboard` (phase 1) has anything Intent-shaped today. Add
`Agent.intent: Intent | null` — a plain mutable field, matching how
`Agent.position`/`Agent.yaw` already work: the reasoner (phase 5) writes it,
Locomotion/AnimationController (this phase) read it. It does not belong on
`Blackboard` — Blackboard is belief/need state the reasoner *scores against*;
Intent is the *output* crossing the decision→actuation boundary
(`NPC_AI_SPEC.md` §3.1), a different thing.

### 3.2 Locomotion

For `MOVE_TO` / `MOVE_TO_ANCHOR`: resolve the intent to a world `(tx, tz)` —
for `MOVE_TO_ANCHOR`, look up the target via `TargetRegistry.get(targetId)`
and resolve its anchor (phase 2's `nearestWalkable` / phase 4's rule table) —
and hand that to whatever the existing `navSteer` call site expects, per §3.0.

**Arrival is a status flag, not something Activities poll for by reading
position.** `NPC_AI_SPEC.md`'s non-negotiable rule #1 says decision code never
touches a transform; that cuts both ways — an Activity checking "am I there
yet" by reading the agent's live position is reading through the same wall the
rule exists to keep closed. Instead:

```ts
// written by Locomotion every frame, read by Activities — never the reverse
bb.movement: { status: 'moving' | 'arrived' | 'blocked'; distRemaining: number };
```

`FACE` and `IDLE` don't touch `navSteer` — `FACE` sets a target yaw and lets
rotation lerp toward it over a few frames (instant snaps read as robotic);
`IDLE` clears any active target and holds position.

### 3.3 AnimationController

The clip set is fixed (`anim_c_walk`, `anim_c_run`, `anim_g_swordswish`,
`anim_c_pleased`, `anim_r_restpose`) and whatever selects among them for
existing (non-AI) movement almost certainly already exists — walking villagers
already animate today. The new work is narrower: wire `PLAY_ANIM` intents
(used by phase 5's `perform` activity phases) into that existing selection
mechanism, so an anchored animation can play independent of movement state.

**Rig offsets stay exactly where phase 2 already put them.** The Actuator
emits yaw in world convention; `Villagers.tsx` keeps its `+ Math.PI`,
`Npc.tsx` keeps none. Nothing here changes that.

**Carried-resource prop (phase 5 will need this, build the attach point now.)**
**Correction: use the simpler existing pattern, not the viewmodel's.** The
viewmodel's tool-in-hand is a procedural-IK arm-pointing system built for
first-person aiming — real overkill for this. The actually-reusable pattern
is already sitting in `Villagers.tsx` itself, for gear:
`{rig && villager.gear?.helmet && createPortal(<HeldHelmet />, rig.joints.head)}`.
`RiggedMinifig.joints: Record<RigJoint, THREE.Group>` (`lib/minifigRig.ts`)
exposes one joint per body part — **checked the actual union: it is
`'head' | 'body' | 'hips' | 'leftarm' | 'rightarm' | 'leftleg' | 'rightleg'`,
there is no separate hand joint.** The hand mesh rides inside the arm joint's
own group (`JOINT_PARTS.rightarm = ['rightarm', 'righthand']`), so
`rig.joints.rightarm` is the real attach point — it swings correctly with the
walk-cycle animation for free, since a portaled child inherits the joint
group's transform. The new `ResourceProp` component needs its own internal
position offset to actually land in the hand rather than at the joint's
pivot origin, the same way `HeldHelmet`/`Chestplate` (the existing
`rig.joints.head`/`rig.joints.body` gear portals in this same file) already
carry their own offset rather than relying on the joint for one. Toggle by
`bb.carrying != null`. This is the fix for "hauling looks identical to
walking empty," and it costs one new small component, not a new clip or a new
attach mechanism.

### 3.4 Debug additions for this phase

Extend the overlay (already built in phase 1) with a current-intent readout:
type, params, elapsed time, and `bb.movement.status`. Cheap, and it's the only
way to tell whether a hardcoded intent queue is actually doing what you think.

### 3.5 Verification

No reasoner exists yet — drive one villager from a hardcoded intent queue
(`MOVE_TO` a clicked point, then `IDLE`) and confirm: the on-screen minifig
walks there and stops; the minimap dot moves with it; `bb.movement.status`
transitions `moving → arrived`; rotation matches direction of travel and
snaps correctly on `FACE`. If `villagerMobs` and the minimap already work with
no additional code, §3.0's splice-not-rewrite assumption held.

---

## 4. Phase 4 — Blackboard & Anchors

### 4.1 Blackboard additions

Per the phase-2 doc §3.3, unchanged:

```ts
carrying: { resource: string; amount: number } | null;   // survives aborts
carryCapacity: number;
job: string | null;
```

### 4.2 `job` — read live, don't duplicate

Villagers already carry a `job` field, assigned via the roster panel (N).
**`bb.job` should not be a stored copy.** This project has hit the
two-sources-of-truth problem enough times already (node ids, ground height,
work-hours gating) that a duplicated `job` field is a foreseeable repeat: a
villager reassigned mid-session via the roster would have a Blackboard that
silently disagrees with the actual record. Read it live from the villager's
existing record each think tick, or push an update on reassignment — don't
snapshot it once.

### 4.3 `carryCapacity` — a new concept, needs a default

Nothing in the shipped economy has a notion of "capacity" — `tickVillagers`
ticks resources on a timer, not a carried amount. This is genuinely new, and
it's a product decision as much as an implementation one: a flat default
(e.g., 20 units) is a reasonable placeholder, with per-job or per-rank
multipliers as an easy later addition. Flag it rather than picking silently —
this number directly sets how often a villager interrupts gathering to haul,
which is a real gameplay feel decision.

### 4.4 Anchor rule table — lands for real

The kind → rule JSON from the phase-2 doc §3.2 gets authored and wired to
`Target.anchorRule`. One piece that document introduced but didn't finish:
`"fallbackRadius": "derive:POND.r + 4"` is a notation, not a runtime
mechanism. Resolve it **once, at startup**, not per query: look up the `POND`
entry in `terrainExclusions` (phase 2 §2.1), read its `r`, and store the
computed number in the loaded config. Don't leave a string to parse in the hot
path.

### 4.5 Verification

Fixed-mode anchors rotate correctly across all four `rot` values. Radial
anchors on a `fishing` node resolve to a bank cell, not a pond cell (depends on
phase 2 §2.1 being live — it is). `bb.job` tracks a live roster reassignment
within one think tick, with no stale read.

---

## 5. Phase 5 — Reasoner core, then gathering

### 5.0 Two things bundled under one phase number — build the first before the second

`PHASE_2_NAVIGATION_AND_GATHERING.md` §3.4–§3.7 and §4 already fully specify
the *gather/haul actions themselves* — considerations, weights, activities,
the economy split. That content isn't duplicated here. What's missing, and
what this section covers, is the **reasoner infrastructure those actions run
on** — `NPC_AI_SPEC.md` §5's design, never yet built against this repo's
actual TypeScript/scheduler code. Build §5.1–§5.5 first, verify on something
trivial, then wire up the already-specified gather/haul content on top.

### 5.1 Response curves

Pure math, engine-agnostic, safe to carry over from `NPC_AI_SPEC.md` §5.3 —
checked term by term against the original, a faithful port with input/output
clamping correctly encoding what §5.2 there states only as prose.

**One correction: `logit` has a real `NaN` hazard the others don't.**
`Math.log((xc - c.c) / (1 - (xc - c.c)))` is `Math.log` of a **negative**
number whenever `xc < c.c` (e.g. `c.c = 0.5, xc = 0.1` → `log(-0.4/1.4)`),
which is `NaN`, not `±Infinity`. `±Infinity` self-heals through `clamp01`;
`NaN` does not — `Math.max`/`Math.min` both propagate `NaN`, so one `logit`
consideration with a nonzero `c` and an input below it poisons `score *= …`
for that action permanently (§5.2). Guard it explicitly rather than trust the
clamp:

```ts
export function evalCurve(c: Curve, x: number): number {
  const xc = clamp01(x);
  switch (c.type) {
    case 'linear':    return clamp01(c.m * (xc - c.c) + c.b);
    case 'quadratic': return clamp01(c.m * Math.pow(xc - c.c, c.k) + c.b);
    case 'logistic':  return clamp01(c.m / (1 + Math.exp(-10 * c.k * (xc - 0.5 - c.c))) + c.b);
    case 'logit': {
      const t = xc - c.c;
      if (t <= 0 || t >= 1) return 0; // NaN guard — see correction above
      return clamp01(c.m * Math.log(t / (1 - t)) / 5 + 0.5 + c.b);
    }
    case 'bool':      return xc > 0.5 ? 1 : 0;
  }
}
```

Nothing authored in either phase-2 or this doc's action content actually uses
`logit` yet — this is a latent-infrastructure fix, not a live bug — but
`evalCurve` is general-purpose, and a `NaN` here is silent and permanent, not
a one-tick glitch.

### 5.2 Consideration + compensated scoring

Also verbatim from `NPC_AI_SPEC.md` §5.4 — the compensation factor matters as
much here as it did there: without it, `gather_resource`'s seven
considerations get unfairly buried against simpler actions with two or three.

```ts
function scoreAction(action: Action, agent: Agent, ctx: Context): number {
  const n = action.considerations.length;
  const modFactor = 1 - (1 / n);
  let score = 1;
  for (const c of action.considerations) {
    const y = evalCurve(c.curve, c.input(agent, ctx));
    if (y === 0) return 0;                          // hard gate — early out
    score *= y + (1 - y) * modFactor * y;
  }
  return score * action.weight;
}
```

### 5.3 Category weights and commitment

**Full weight table** — the phase-2 doc introduced `work` at 1.2 but the rest
lives only in `NPC_AI_SPEC.md`; this is the one place both should be read
together:

| Category | weight |
|---|---|
| survival | 4.0 |
| combat | 3.0 |
| companion | 2.0 |
| work | 1.2 |
| needs | 1.0 |
| social | 0.8 |
| ambient | 0.3 |

**`interruptPriority`** is a separate axis from weight — it gates *whether* a
challenger can replace the current action before `minDuration` elapses,
independent of score. The phase-2 doc set `gather_resource`/`haul_to_deposit`
to `1` but nothing assigns the rest. Proposed starting values:

| Category | interruptPriority |
|---|---|
| survival (`flee_to_safety`) | 10 |
| combat | 8 |
| companion (actively assisting) | 5 |
| sleep | 3 |
| work, needs, social | 1 |
| ambient | 0 |

`flee_to_safety` at 10 is what lets it cut into a gather action's `minDuration`
— nothing else in this table should be able to.

**Momentum, switch threshold, cooldowns** — unchanged from `NPC_AI_SPEC.md`
§5.6: running action scores ×1.25 while active; a challenger must beat the
current score by 15% to replace it; completed actions write a cooldown that
scores zero until it expires.

### 5.4 Candidate assembly

Two sources, gathered fresh each think tick:

1. **Intrinsic actions** registered per archetype/job — `idle`, `wander`,
   `flee_to_safety`, `sleep`, and (once a villager has a job) `gather_resource`
   / `haul_to_deposit`.
2. **Per-target expansion.** For any action with `targetKinds` (both gather and
   haul have them), call `TargetRegistry.queryNearby(pos, radius, targetKinds,
   region)` and create **one candidate per returned target**, not one
   candidate for the action as a whole — `gather_resource@node:17` and
   `gather_resource@node:22` score independently, each with its own
   `proximity`/`target_usable` inputs. Scoring the action once against an
   arbitrarily-chosen target is the common bug here; don't do that.

The winner across the full candidate set (intrinsic + expanded) is whatever
scores highest after §5.2/§5.3.

### 5.5 Verify the core before adding gather/haul

Two synthetic actions with one or two trivial considerations each (e.g.
`idle` vs. a fake `wander` gated on a random threshold) — confirm scoring,
compensation, momentum, and the switch threshold all behave before any real
content sits on top. If the reasoner has a bug, you want to find it against
two trivial actions, not entangled with node reservations and depletion
states. This is the same "verify the crossover before tuning" discipline the
phase-2 doc already applies to gather/haul's own weight gap — apply it one
level down first.

### 5.6 `flee_to_safety` / `sleep` — wrap the existing behavior, don't reinvent it

The phase-2 doc already named these as behaviors the reasoner must subsume
(§3.4 there). The concrete plan: **don't redesign target selection for either.**
Villagers already run home during a raid and already seek the nearest bed at
night — find whatever function already does that and call it as the
Activity's implementation. The new part is only the utility gate:

- `flee_to_safety` — a near-boolean consideration on the existing raid-active
  signal, `interruptPriority: 10`.
- `sleep` — a consideration on time-of-day (night) and `needs.energy`,
  `interruptPriority: 3` — high enough to override casual work, well below
  `flee_to_safety`.

Once both route through the reasoner, delete the old direct-trigger code
paths. Leaving both running is the failure mode explicitly called out in the
phase-2 doc.

### 5.7 `gather_resource` / `haul_to_deposit`

Fully specified already — `PHASE_2_NAVIGATION_AND_GATHERING.md` §3.4–§3.7.
Not repeated here; implement from that document once §5.1–§5.5 exist.

### 5.8 Economy authority split

Fully specified already — `PHASE_2_NAVIGATION_AND_GATHERING.md` §4 (the
`workSignal` leaf module, the `tickVillagers` split, the two-step 5a/5b
rollout with the neutrality check). Not repeated here.

### 5.9 What's still out of scope after phase 5

Matching `NPC_AI_SPEC.md`'s original nine-step build order, this project's
phases 1–5 land roughly at that order's step 5 (utility reasoner). Still
ahead, deliberately not designed here:

- **Perception** (vision/hearing/beliefs) — original step 6. Combat and
  companion actions can be stubbed with simple gates until this exists, but
  won't feel right without it.
- **Combat + companion actions** — original step 7. `ATTACK` intent, threat-
  derived considerations, `EngageThreat`/`FollowLeader` activities. This game
  already has a full combat system (hearts, stamina, blocking, cannons,
  jousting) that villager/companion AI needs to key off of, not duplicate —
  expect this phase to look a lot like §5.6's "wrap, don't reinvent" pattern,
  at larger scale.
- **LOD tiers for ambient background villagers** and the ambient category's
  ownweight/considerations — original step 8.

---

## Before implementing

Send this to VSCode Claude with something like:

> Read `PHASES_3_4_5_ACTUATION_AND_REASONER.md`. It's an unverified draft —
> check §3.0's claim about how `Villagers.tsx`/`Npc.tsx` currently drive
> movement against the actual code before treating §3's scope as settled;
> correct anything here that doesn't match what phase 1 actually built.
> Implement phase 3 only once §3 is confirmed. Do not start phase 4 or 5
> content yet.

That's the same rev-1-to-rev-3 loop that made phase 2 solid — worth running
it before any of this gets implemented rather than after.
