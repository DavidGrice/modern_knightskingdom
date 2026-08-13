# `src/ai` — NPC AI system

Implements [`NPC_AI_SPEC.md`](NPC_AI_SPEC.md).

> **This file's own status sections below are stale** — they still describe the
> phase-1 tree, and were not updated as phases 2–8 shipped (noticed during Wave
> 11's phase 7, flagged rather than silently half-fixed: bringing them current
> means rewriting seven phases of file map and acceptance checks, which is its
> own pass). **[`PHASE_STATUS.md`](PHASE_STATUS.md) is authoritative for what is
> built**; the "Adaptations from the spec" table below is still accurate and is
> the reason to keep reading this file.

## Which file do you want?

| File | For | Changes |
|---|---|---|
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | **an assistant with no repo access** — pair it with `NPC_AI_SPEC.md` when asking for phase 2+ design work. Self-contained: stack, existing systems the spec overlaps, content inventory, conventions that break generated code, phase-1 API surface | rarely |
| [`PHASE_STATUS.md`](PHASE_STATUS.md) | where the build order actually stands, per phase, and what is blocked | **every phase** |
| [`NPC_AI_SPEC.md`](NPC_AI_SPEC.md) | the architecture contract, §0–§12 | never |
| `PHASE_N_*.md` | a per-phase spec that supersedes part of the contract. [`PHASE_2_NAVIGATION_AND_GATHERING.md`](PHASE_2_NAVIGATION_AND_GATHERING.md) replaces §7 in full — **not yet implemented** | as written |
| this file | the in-repo file map and TS/Next adaptations | per phase |

## Adaptations from the spec

The spec assumes vanilla JS ES modules + bare Three.js. This project is
Next 15 + React Three Fiber + strict TypeScript, so:

| Spec says | Here | Why |
|---|---|---|
| `src/ai/**/*.js` | `.ts` / `.tsx` | the project is `strict: true` TS; a `.js` island would opt the AI out of the only type checking the repo has |
| `config/*.json` at repo root | `src/ai/config/*.json` | Next bundles them via `resolveJsonModule`, matching `game/data/bricks.generated.json`. Still a plain JSON text edit, which is what §12 asks for |
| an `update(dt)` someone calls | one `useFrame` in `AiRuntime.tsx` | R3F owns the frame loop; §0.3 is honoured because that `useFrame` only advances the clock and lets the Scheduler dispatch — it never decides anything |

Everything else follows the spec's structure and names.

## What exists (phase 1)

```
config/           §12 — needs.json, archetypes.json, lod.json + typed loader
core/Blackboard   §3.2/§3.3 — plain per-agent belief store, incl. Belief/ScoredAction types
core/Agent        §1 — blackboard owner; think() decays needs, nothing else yet
core/Scheduler    §8 — round-robin, per-frame think budget
core/AgentManager §1/§8 — registry, game clock, LOD tiering, window.__kkai
AiRuntime.tsx     §2 — the single useFrame; spawns the phase-1 probe agent
debug/AIDebugOverlay.tsx  §9 — DOM panel, toggled with `
```

The probe agent (`probe_01`, at world 4, 22 near SPAWN) has no mesh and no
behaviour. That is the point of phase 1: it ticks and prints.

## Acceptance check

1. Start a game, press `` ` ``.
2. `THINKS/FRAME` stays at or below 3 (`lod.json` `thinkBudgetPerFrame`).
3. `think 10.0/10 Hz` while looking at the probe's spot; walk >15 m away and
   the tier drops to `B` (5 Hz), turn your back and it drops to `C` (2 Hz).
4. Needs tick downward at the rates in `needs.json`; pausing stops them.

## Not built, and where it goes

- `core/curves.ts`, `decision/*` — phase 5. `Blackboard.lastScores` is already
  the shape the overlay renders, so the reasoner only has to fill it.
- `perception/*` — phase 6. `Blackboard.beliefs` / `threatLevel` are in place.
- `navigation/*`, `world/*`, `actuation/*` — phases 2–4. Note this project
  already has `game/navgrid.ts` (a grid steerer over the same collision
  volumes that stop the player); phase 2 should decide between adopting navcat
  per §7.1 and extending what is here, rather than assuming.
- `debug/AIDebugGizmos.ts` — nothing to draw until there are paths, vision
  cones or anchors (phase 2+).
- §11's `memoryStream` / `recall()` — explicitly "not built now".

The existing NPC behaviour (`components/world/Villagers.tsx`, `Npc.tsx`,
`combat/Enemies.tsx`) is untouched and still runs its own per-frame if/else
cascades. Nothing migrates onto this system until it can actually move a body,
which is phase 3 at the earliest.
