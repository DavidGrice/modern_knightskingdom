# Codebase Cleanup Plan

**Status: IN PROGRESS — see the Progress log directly below for what has shipped.** Generated 2026-09-23 from a full-codebase audit (27 independent area readers over every file under `src/`, cross-checked against a mechanical import-graph analysis, then merged and a completeness critic pass run against the merge). Companion to [`ROADMAP.md`](./ROADMAP.md)'s Reconciled status section, which covers *feature* backlog; this file covers *codebase* health — making the ~65k-line `src/` tree clear, clean, concise, and easier to keep scaling.

**How to use this file:** each numbered initiative (CLN-01..35) is independently scoped and dependency-ordered (see *Suggested execution order* below). Work through them like the project already works through ROADMAP waves — one (or a tightly related handful) at a time, each gated by `tsc --noEmit` + `next build` + the relevant Playwright smoke script(s) before moving on. Every initiative is written to be behavior-preserving unless it explicitly flags a deliberate behavior change (search for "explicit"/"deliberate"/"behavior change" in its own text) — those are called out for a human decision, not silently bundled in.

---

## Progress log

Kept current per PR so a fresh session never has to reverse-engineer state from `git log`. Newest last.

- **#220 — plan + ROADMAP reconciliation merged** (docs only).
- **#221 — Quick wins: 15 of 16 done.** Deliberately *not* done: the `StatsStack.tsx` theming item — the screen still uses the entire pre-4-theme legacy CSS system (`.panel`/`.creator-section`/`.menu-btn`), so swapping only the outer wrapper class would nest unthemed markup inside a themed shell (a likely visual regression, not a one-liner); it needs a real page migration (see CLN-31/32). The "delete the orphaned `.claude/worktrees/` tree" item is **obsolete and must not be acted on**: real, live git worktrees are kept there now.
- **#222 — CLN-08 done** (`game/types.ts` split into `game/types/{core,world,villagers,save}.ts`, re-exported through the original `types.ts` barrel).
- **CLN-06 done — #223** (two commits, both verified independently of the audit's own lists):
  - *Part 1* — 20 fully dead exports deleted (192 lines, deletions only). Each was re-grepped across `src/` and the local `scripts/` tree; `registerSenses` (the audit's known false positive) was left alone.
  - *Part 2* — the needless `export` keyword stripped from 235 declarations in 86 files by a scripted, TypeScript-module-resolution-based codemod (the audit estimated ~245). The diff is purely the removal of a leading `export ` — checked mechanically, 0 exceptions — with `tsc` and `next build` clean and **no** symbol needing to be restored. Left exported on purpose: everything under `src/app/**`, `export default`, list/barrel forms, `ai/core/curves.ts` (imported at runtime by `scripts/test5-1-curves.ts`), and 5 exports in `game/data/npcs.ts` (`COURT_START`, `COURT_END`, `InteriorResident`, `GUILD_QUESTS`, `questLabelById`) held back only because `scripts/_impl_check_live_data.mjs` dynamic-imports that module — that script reads just `NPCS`, so these 5 are safe to strip in a later pass. Three more (`QuestObjective`, `isHome`, `inWorld`, in `types/core.ts`/`types/world.ts`) stay exported because they sit behind the `export *` barrel and the codemod conservatively treats every export of a barrel-re-exported module as used.
- **CLN-01 done — #224** — `src/lib/{math,rng,geometry}.ts` (29/43/22 lines, zero imports, verbatim ports). Converted: the 23-site `wrapAngle` idiom (kept as the same two `while` loops, deliberately not a modulo form, so results stay bit-identical), both `mulberry32` copies, the two byte-identical `hashId` copies, the two named clamp copies, 23 random-array picks (`pick` for `Math.random`, `pickWith(rnd, …)` for the 3 seeded ones in `dungeon.ts`), 3 `randInt` sites, and 4 forked AABB-overlap implementations (a 5th, in `terrainRegions.ts`, turned up and was converted too). Verified against the audit's claims rather than trusting them, with old-vs-new golden masters (millions of `Object.is` comparisons, 16 seeds × 2000 `mulberry32` draws, 60 dungeon layouts + `seedNodes` + plot scatter hashed on main vs. branch with a mutation control proving the harness can detect a change) and a headless-Chrome smoke against a baseline server. **Audit corrections:** the "5 divergent hashIds" are really 2 byte-identical copies plus 3 unrelated algorithms (`attributes.hash` salt-mixing, `sectionSeed`, navgrid's FNV-1a) that were correctly left alone; no `dist2D`/`withinRadius` was created because no duplicated helper exists (170 inline `Math.hypot` calls, none copied). **Deliberately left, with the exact reason:** ~34 inline `Math.max(lo, Math.min(hi, x))` clamps (the `Math` form turns `-0` into `+0` and differs for inverted bounds, so they are not true duplicates — converting them is a one-line-each follow-up if `-0`→`+0` is acceptable); `dungeon.ts`'s own `overlaps()` (same test on `x0/x1/z0/z1` fields of an exported layout type); same-shape overlap loops that synthesize a road-tile operand per iteration; `overlapsXZ` in `gameStore.ts` (bakes in a `-0.02` epsilon). One edit lands under `src/app/`: `WorldEditorClient.tsx` (a plain client component, not a route file) — its local overlap helper was replaced, and the built `/secret/worldeditor` page text hash is identical to baseline.
- **CLN-03 done** — `game/store/persistence.ts` (245 lines): one `PERSISTED_FIELDS` table (one row per persisted key, `satisfies`-checked so `tsc` rejects a missing row, an unknown row, or a wrongly typed default), a derived `PERSISTED_KEYS`, an explicit `LEGACY_LOAD_OVERRIDES` (exactly `landTier`, `cedricCaptures`, `cedricCapturedAtDay` — deliberately *not* folded into the fresh defaults), and `freshPersisted`/`applySave`/`buildSave`. `GameState` now `extends PersistedState`, so a field can no longer exist in the save but not in the store; adding a persisted field is two edits (`SaveGame` + one table row) instead of six. `gameStore.ts` 5064 → 4713 lines. **No `saveMigrations.ts` was created, on purpose**: `LEGACY_LOAD_OVERRIDES` *is* the migration, and a separate pre-pass would evaluate `cedricCapturedAtDay` against already-migrated values. **Audit correction:** there was no key-set drift to fix — all 66 persisted keys were present in all six places (the "drift" the audit cited was historical); the real duplication was the six hand-maintained lists themselves. Proven behavior-identical, not just type-safe: differential runs of a baseline server built from `main` versus the branch, in lockstep with `Date.now`/`Math.random` stubbed — initial state, `newGame` ×5, new-game-plus, a rich scripted session, ~480 load fixtures (each field dropped/nulled, legacy variants, a minimal save, unknown keys, non-null `destination`), 0 mismatches over 501 steps / ~1000 records, and a real guest save → reload → continue flow identical on both; the harness was itself shown able to fail (8 deliberate mutations, all caught); `toSave()`'s wire key order is unchanged (re-checked independently from `main`'s AST). **Left exactly as they were, for an owner decision (none changed):** `movingBuilding`/`carriedKeepExtra` still unsaved; `dirty`/autosave cadence untouched; dead `stabled`/`mounts` store fields and `SaveGame.playerPos` kept; session reset untouched (CLN-04). **Real issues surfaced, not fixed here:** (1) `MainMenu.describe` reads `cedricCaptures ?? 0` and ignores the Wave-38 inference `loadFromSave` applies, so a pre-Wave-38 save's slot card can show a lower rank than the loaded game; (2) a save missing `buildings` or `inventory` throws *after* `set()` has already applied (`seedNodes` reads `inventory`) — same as before; (3) `version` is written but never checked on load; (4) `ZERO_STATS`' nested objects are shared across fresh states (safe today only because every writer spreads them); (5) after a load the leaf and store `waterworks` alias one array, after `newGame` they are two separate ones.

---

## Cross-cutting themes

**God-file monoliths recur at every layer with the same shape and the same fix.** gameStore.ts (5073L, 100+ importers, verified), combat.ts (1657L), navgrid.ts (1228L), PlayerController.tsx (2227L), Enemies.tsx (1637L), Panels.tsx (1360L), npcs.ts (1396L), buildables.ts (1106L), BuildController.tsx (938L), minifigRig.ts (748L), types.ts (752L) are each one closure/component/file mixing 4-10 unrelated concerns. Every area auditor independently proposed the same playbook: extract along already-visible section boundaries into a directory, keep a barrel/facade re-export so the 30-100 existing import sites don't change, gate each extraction with tsc+build+smoke.

**The save/persisted-state truth is hand-duplicated 6 ways.** Every persisted field is listed separately in GameState interface, the initial-state literal, freshSaveFields, loadFromSave, toSave, and SaveGame (types.ts) — 3 independent gameStore auditors found this exact same drift risk, with a code comment admitting it happened before.

**Session/lifecycle reset is incomplete almost everywhere.** resetSessionModules misses placeHistory, carriedKeepExtra, lastJoustAt, buildSeq family (only reset on load, not newGame/NG+), defenderState/ridingState/fishingState/statsAccum, and AgentManager.clear() skips despawnHooks so Locomotion/perception per-agent caches survive a reload while villager ids are reused. Found independently by 3 gameStore audits, the types/leaf-module audit, and the AI perception audit.

**Small math/geometry/RNG/hash utilities are reinvented dozens of times.** Angle-wrap-to-(-pi,pi] copy-pasted 23x/10 files; mulberry32 PRNG byte-identical in 2 files; clamp/clamp01 reimplemented 15+ times; AABB-overlap predicate forked 4 ways; 2D distance via Math.hypot appears 171x/50 files; array-random-pick idiom 25x/15 files; string hash (hashId) has 5 divergent implementations.

**Per-population gameplay state machines are forked instead of parameterized.** Nearly identical logic exists once per 'population': villager/defender/companion combat engage (3 copies), villager/npc/companion agent-driven movement intent (3 copies), green/black dragon siege (2 near-total copies), gather/haul/farm work loop (3 copies), ram/ladder siege props (2 copies) — each self-documented with comments admitting the copy.

**Import cycles are managed via a documented registration-seam pattern, not eliminated.** The 70-file src/ai cycle and gameStore's AI-module imports are broken at runtime via registerActions/registerSenses/despawnHooks/onSessionReset seams and leaf-module singletons, each citing a real historical TDZ crash. This is good practice worth extending, not a design flaw to reverse.

**Comment volume is high but mostly substantive; the problem is organization, not content.** ~1462 Wave/Phase comments across 166 files; multiple files are 30-50% comments (gameStore 46%, combat.ts 43%, RiggedFigure 45%). A cross-cutting hygiene audit sampled 70+ and found ~90%+ carry genuine WHY-rationale, not changelog spam — trim narration/history to docs, keep invariants inline.

**Zero automated behavioral test coverage; verification is entirely manual.** No unit-test framework; CI runs only tsc+next build. All gameplay verification happens via 349 gitignored Playwright scripts driving ~56 window.__kk* hooks — and @playwright/test isn't a declared dependency (verified: absent from package.json and lockfile root deps), so the harness only works by accident of a stale local node_modules.

**Data that should be declared once is restated per consumer, causing real drift.** Haggle/pricing math copied in 5 files (already diverged: Wanderer bonus missing from UI); enemy stats split across 9 tables in 3 files; world anchor coordinates hand-typed in 4-5 files (already caused 2 real position bugs — Storm's tourney fence, a settlement hall offset); ~72 perk/skill/calling effect magnitudes scattered as inline literals with prose-only descriptions that can silently disagree with behavior.

**HUD/CSS duplication mirrors the gameplay-logic duplication.** Panel close-button+header chrome hand-copied 10+ times across hud/*.tsx despite an unexported PanelFrame already existing; rAF-polling boilerplate copied 6x; 207 inline style={{}} objects across 4 files despite an existing CSS modifier-class convention; the same gradient literal is hand-typed 3-9x across kk-tokens.css/kk-lanes.css/kk-screens.css/globals.css.

**Static analysis (mech.json) is directionally reliable but not authoritative.** Spot-checks in this synthesis confirmed exact line counts (gameStore.ts 5073, combat.ts 1657, types.ts 752, PlayerController.tsx 2227, navgrid.ts 1228) and the mech.json file's existence, but individual auditors caught real false positives: registerSenses flagged 'unused' despite being called via a side-effect import chain, and a reported Reasoner.ts→actions/index.ts cycle edge that doesn't exist in the real import statements (only in a JSDoc comment).

**Perf is generally healthy with a few concrete, fixable regressions.** Zustand selector discipline is excellent (417 calls, verified zero whole-store or object-returning selectors outside 1 file); per-frame scratch-object reuse is consistent. But: 2 confirmed GPU leaks (InstancedProps clone-without-dispose, LabFlame texture clone leak), 149KB of generated JSON (setPlans+bricks) reachable from every gameStore import, and only one next/dynamic() call in the entire app.

---

## Corrections to the audit's own numbers

A completeness-critic pass re-checked several of the audit's own headline counts against fresh greps. Use these, not the ones quoted inside individual initiatives below, where they differ:

- hygiene's "'as any' (18 sites)" is wrong: `grep -rn "as any" src --include=*.ts --include=*.tsx` does return exactly 18 hits, but all 18 are English prose inside comments (e.g. 'same as any other,' 'has any business changing,' 'not just as anyone else') — zero are actual TypeScript `as any` type-cast expressions. The real unsafe-any usage in the codebase takes the `: any` parameter-annotation form instead: 5 genuine sites at src/components/world/Buildings.tsx:554,566,599,606 and src/components/world/KeepAssembly.tsx:62, all `(e: any) =>` JSX event handlers. hygiene's grep pattern needs to be retargeted from `as any` to `: any\b`.
- CLN-05's "~56 hand-rolled window.__kk* blocks" undercounts: a precise grep for actual assignment sites (pattern `\.__kk[A-Za-z]+\s*=`) finds 74 across src/, not ~56 — e.g. src/game/combat.ts alone contributes 9 separate __kk* exposures (lines 129,131,522,707,1250,1251,1655,1656,1657), and src/game/riding.ts, src/game/carts.ts, src/game/data/road.ts each expose 2+. The naive `grep window.__kk` (which misses the common `(window as unknown as Record<string,unknown>).__kkX =` cast idiom used almost everywhere) only turns up 4.
- hygiene's "~1250" estimate for 'Wave N'/'Block X'/'Phase N' history-narration comments is materially low: a direct case-insensitive grep across all src/**/*.{ts,tsx} for that pattern returns 1597 matches, and a 12-item spot sample across the range was 12/12 genuine build-history narration (no false positives from unrelated uses of the words 'wave'/'phase'/'block'). The area's own planned 'sample 60' step should calibrate against ~1600, not ~1250.
- repo-tooling's "scripts (383 files, 331MB...)" — the size figure is exactly right (`du -sh scripts` → 331M) but the file count is off by ~2.7x: `find scripts -type f | wc -l` returns 1050, not 383 (no nested node_modules inflating this; scripts/shots and scripts/shots2 screenshot dumps are the likely source of the gap).
- hygiene's item on 'eslint-disables' presumes an ESLint setup exists to give those comments meaning, but there is no .eslintrc/eslint.config file and no eslint devDependency anywhere in the repo, and .github/workflows/ci.yml explicitly states 'The repo is strict TypeScript with no lint config, so tsc IS the linter.' The 37 eslint-disable comments found in src/ are therefore currently inert (nothing runs ESLint to read them) — the initiative should say so rather than just counting them.

---

## What this pass could not scope in (worth a follow-up)

The completeness critic checked coverage of the 27 area audits against the full `src/` tree and against categories of concern the initiatives below don't touch:

- **No React/Next crash recovery (error boundaries).** Zero hits both ways: no ErrorBoundary component anywhere in src/, and src/app has no error.tsx / global-error.tsx / not-found.tsx. An uncaught exception anywhere in the R3F scene graph or any HUD panel would white-screen the whole app with no recovery UI. None of the 27 areas or 35 initiatives touch this. → Add a root src/app/error.tsx plus a client ErrorBoundary wrapping <Canvas> and the HUD stack; fold into hud-rest/CLN-31 or a new initiative.
- **No systematic accessibility (a11y) pass.** Only 17 of 117 component .tsx files reference aria-/role=/alt= at all. The only shared a11y primitive is src/components/ui/a11yClick.ts, one keyboard-activation helper for onClick-bearing divs (per its own header, added for skill-tree/perk/equip/emote tiles). No area or initiative plans a focus-management/contrast/screen-reader audit of the 37 hud/*.tsx panel files. → Add an explicit a11y checklist item under hud-panels/hud-rest scope or CLN-30/31.
- **Save schema has no version field or migration mechanism.** save.ts JSON-round-trips the whole SaveGame object as-is (localStorage for guests, PUT /api/save for signed-in users) with no saveVersion field, migration table, or schema-compat check anywhere. CLN-03 (single source of truth for persisted state) and CLN-09 (transport hardening) don't mention versioning, so once CLN-07's slice refactor changes gameStore's persisted shape, existing players' saves have no migration path. → Add an explicit saveVersion + migration table, sequenced before or alongside CLN-07.
- **107MB public/ static-asset payload has no owning initiative.** public/ is 107MB across assets/{anims,creator,minifigs,props,rigs,sky,sounds,textures,ui,worlds}, basis/, help/, icons/. perf-bundle/CLN-33 cover JS code-splitting; game-misc covers the KTX2 transcode logic (gltfKtx2.ts); repo-tooling covers the scripts/ build tooling that produces these assets — but no area assesses the shipped runtime asset budget itself (texture/mesh compression coverage, cache-control headers, eager vs lazy fetch). → Add an asset-budget/caching-headers line item, most naturally under perf-bundle.
- **next.config.mjs: reactStrictMode disabled, no security headers/CSP.** reactStrictMode: false is explicitly set (comment explains it was to hide a dev-badge overlap, but the side effect is masking double-invoke effect/render bugs), and there is no headers()/images()/CSP config at all. repo-tooling's scope names next.config.mjs but its stated focus is scripts/deps/predev, not these specific flags. → Call out reactStrictMode re-enablement (especially useful right before/after CLN-13/CLN-26 refactors) and missing security headers explicitly under repo-tooling or build-app.
- **Session-secret persistence is entangled with the predev data/ wipe.** The HMAC session secret is generated once and persisted to data/session-secret (session.ts:13-19), inside the same DATA_DIR db.ts uses for users.json and saves/. package.json's predev script runs `node -e "require('fs').rmSync('data',{recursive:true,force:true})"` before every `npm run dev`, deleting the secret plus every local account and save each dev boot. repo-tooling already flags 'predev deletes data/' but no initiative addresses hardening the secret itself for production (e.g. env-var override; a per-process crypto.randomBytes fallback would desync across multiple server instances/serverless). → Fold an explicit session-secret/env-var recommendation into CLN-09.
- **ESLint tooling absent despite 37 eslint-disable comments; no lint step in CI.** No .eslintrc/eslint.config file exists and package.json has no eslint devDependency. ci.yml explicitly documents: 'The repo is strict TypeScript with no lint config, so tsc IS the linter.' Yet 37 eslint-disable comments exist in src/, presently inert since nothing runs ESLint to consume them. hygiene's scope lists 'eslint-disables' to inventory but doesn't note they're dead weight from a removed/never-adopted lint setup. → hygiene should recommend either deleting the 37 dead eslint-disable comments or adopting a real ESLint config that makes them meaningful.
- **Silent-failure handling in save transport has no telemetry/user feedback (and no crash telemetry generally).** persistSave/fetchSave collapse every failure mode (network error, non-OK response, JSON parse error) to a bare false/null via .catch(()=>null) with no logging, retry, or user-facing distinction between 'no save yet' and 'save failed.' No telemetry/error-reporting service (Sentry, PostHog, etc.) is wired anywhere in src/ or package.json — console.* (16 sites, confirmed) is the only diagnostic channel, and it's dev-console-only. → Pair with the error-boundary item: add minimal production error/telemetry reporting and surface save-failure state to the player, likely under CLN-09.

Files/areas no area audit explicitly read: src/ai/config/*.json — 9 files (ambient.json 71L, anchors.json 46L, archetypes.json 158L, combat.json 278L, companion.json 37L, lod.json 76L, navgrid.json 81L, needs.json 43L, perception.json 204L; 994 lines total). ai-core's explicit file list names only src/ai/config/index.ts, which imports 8 of these 9 directly (confirmed via `grep '.json' src/ai/config/index.ts`); navgrid.json is NOT imported by index.ts at all — it's imported exclusively by src/game/navgrid.ts, navTerrain.ts, waterworks.ts, data/road.ts, data/terrainRegions.ts (confirmed via `grep -rln navgrid.json src`), none of which are in ai-core's or any other area's scope, and none of the game-world-logic/data-world file lists mention any src/ai/ path.; src/app/icon.svg — not named in build-app's src/app/** list or any other area.; src/app/secret/worldeditor/page.tsx (14 lines) — build-app explicitly names only WorldEditorClient.tsx for this route; the page.tsx wrapper itself is unlisted (low-impact: it's a thin 14-line shell, verified by `wc -l`)..

---

## Quick wins (do these first — each under an hour, near-zero risk)

- [ ] session.ts: add `secure: process.env.NODE_ENV==='production'` to the session cookie options (one line, currently missing entirely).
- [ ] worldeditor save.ts: add the same `<=0` rejection already used for grounds/plots fields to landTiers' walls/half/southHalf/cost (one line, currently unguarded).
- [ ] PlayerController.tsx pollTouch: change `pad[k] = touchVal` to `pad[k] = pad[k] || touchVal` so touch input stops overwriting live gamepad input (one-line fix for a real input bug).
- [ ] RaiderRam.tsx and RaiderLadder.tsx: add a missing `if (st.paused) return` at the top of each useFrame — both currently keep dealing damage while the game is paused.
- [ ] MainMenu.tsx: split the single bare `useAppStore()` call into per-field selectors matching every sibling stack screen.
- [ ] StatsStack.tsx: change the outer shell to `kk-screen kk-screen-${settings.uiTheme}` to match every other stack screen's lane theming.
- [ ] gameStore.ts deleteBlueprint (line ~2137): add the missing `dirty: true` so blueprint deletion is actually persisted like every other mutation.
- [ ] PostProcessing.tsx: move the `(window as ...).__kkgl = gl` assignment into a `useEffect(() => {...}, [gl])` instead of running it on every render.
- [ ] DragonOmen.tsx: delete the dead `export { dragonAir, dragonAirBlack }` re-export line — every real importer already imports from '@/game/dragonAir' directly.
- [ ] preload.ts: fix ENEMY_DONORS to match Enemies.tsx's current CONFIGS (it warms a donor id nothing uses and omits 4 donors that are actually needed).
- [ ] Buildings.tsx: drop the `export` keyword from `BuildingMesh` (used only inside its own file) and fix the 4 R3F click handlers' `(e: any)` to `(e: ThreeEvent<MouseEvent>)`.
- [ ] WorkshopBench.tsx: delete the fully-dead `unlockedBy` export (zero importers anywhere).
- [ ] Delete the orphaned `.claude/worktrees/` directory tree (confirmed not a real git worktree via `git worktree list`).
- [ ] Delete `src/game/data/minifig-rest.generated.json` (29KB, zero importers in src/ or scripts/) after confirming with the asset pipeline it's superseded.
- [ ] README.md: fix the stale '153 pieces' and '8 quests' counts (actual: ~249 pieces, 11 quests) and add a one-line warning that `npm run dev` wipes local `data/` (accounts/saves) on every restart.
- [ ] Add `secure`-flag-adjacent fix aside — also delete the 37 inert `eslint-disable` comments repo-wide (no ESLint installed; mechanical grep+delete).

---

## Do not touch

These patterns were independently flagged as *good* by the auditors — extend them, don't replace them:

- window.__kk* debug hooks (~56 files, exact names and object identities) — the sole live-verification contract for 349 gitignored Playwright smoke scripts; consolidate the boilerplate (CLN-05) but never rename or remove a hook without confirming zero script references it.
- Single flat zustand store with per-field selectors (417 useGameStore(selector) calls, zero object-returning or whole-store selectors outside one file) — verified zustand-v5-safe; do not introduce nested stores or object-returning selectors during the slice refactor (CLN-07).
- Leaf-module mutable singleton pattern for hot per-frame state (playerState, combatState, arenaState, difficultyState, riding, workSignal, fishingState, defenderState, villagerMobs/npcMobs) — deliberately kept out of zustand to avoid 60Hz store churn; this is the correct pattern to extend, not replace.
- addItems() as the single inventory-mutation entry point, with its documented commit-before-bump ordering (set() before bumpQuestCounters) that fixed a real nested-grant clobber bug — preserve verbatim.
- Deterministic world/dungeon generation seeds: mulberry32(20260713) shared stream, per-plot sectionSeed, scatterNodesInRect. Golden-master any refactor against current output before changing.
- The registration-seam pattern (registerActions/registerSenses/despawnHooks/onSessionReset/tierChangeHooks) that breaks the AI<->gameStore import cycle at runtime instead of via static imports — cites a real historical TDZ crash; extend this pattern for new decompositions rather than reverting to direct imports.
- Preview/commit action pairs so the UI ticket always equals the actual charge: demolishPreview/demolishArea, digPreview/digArea, evalPlacement/placeBuilding/finishMove.
- Data-driven rule tables instead of hardcoded per-item branches (BUILDABLE_BY_ID category checks, JOB_BY_ID, guild/skill/challenge tables) — the right shape; extend it (CLN-08/21/23), don't replace it with more branching.
- resolveDestPoint's durable local-point-to-world-point convention (worldPos = origin + scale*local) — already ended three rounds of broken hand-typed coordinates; any anchor consolidation (CLN-22) must keep using it.
- Constant-time comparisons in server auth code (crypto.timingSafeEqual for password verification and session-token signature checks) — correct as-is.
- The project's deliberate tsc-strict + next-build-only CI gate (no ESLint) — a reasoned, documented choice for this team size; CLN-02's vitest addition is opt-in/non-blocking and must not silently become a required gate without owner sign-off.
- 'Wave N' comments are ~90%+ genuine WHY-rationale on inspection (not changelog spam) — trim narration and move history to docs/ROADMAP_ARCHIVE.md, but do not strip the inline invariants/rationale they carry.

---

## Open questions (need an owner/product decision before the related initiative proceeds)

- Should world-simulation ticks (crop growth, villager arrival, node respawn, fishing, build-challenge timers) continue running while the player is in build mode, or is today's apparent stall (PlayerController, which owns these ticks, unmounts during build mode) intentional? CLN-20 preserves current behavior; changing it is a product decision.
- Should the haggle/economy formula be capped? As currently implemented (additive, uncapped bonuses), a repeatable buy-then-sell arbitrage loop exists on at least 2 items (plank, iron_bar) per hand-computed arithmetic — a balance call, not a cleanup.
- Should `dirty` (autosave trigger) stop being set by clock-mirror updates? Today the world clock ticks `dirty:true` roughly every 20s at default settings, so the full save JSON rewrites almost continuously — fixing this changes autosave cadence/frequency, a deliberate behavior change some players may notice as reduced save-scumming granularity.
- Should window.__kk* debug hooks be stripped from production builds via NODE_ENV gating (CLN-05's natural follow-up)? Trade-off: smaller/safer prod bundle vs. the smoke-test harness needing a dev or staging build to run against going forward.
- Should the store fields `stabled`/`mounts` (dead reads, true state lives in the riding.ts leaf module) and `SaveGame.playerPos` (never written) be deleted now, or is there a hidden consumer not caught by static analysis? Old-save compatibility requires keeping the SaveGame fields optional either way.
- Should the keybind default collision (bestiary and emotes both default to 'KeyG', so the Collection Book is currently unreachable by its intended hotkey) be resolved by picking a new default, and should HUD interact-prompts (currently hardcoded 'E'/'X') become rebind-aware? Needs UX/owner sign-off on which key to reassign.
- Should movingBuilding/carriedKeepExtra be folded into toSave so a save mid-carry doesn't silently drop the piece or keep, or is that considered an acceptable edge case not worth the added save-shape complexity? Auditors flagged this as a real bug but explicitly outside strict behavior-preservation.
- Is `scheduledCourtNpcs` (and the npcSync.ts machinery built on it) genuinely dead — its only gate can never be true given current NPC data — meaning the 'scheduled court gathering' feature was quietly shelved, or was it meant to be finished? Needs a decision before CLN-17/21 touch that code path.
- Should the project adopt vitest as a second, non-blocking verification layer (CLN-02) given the deliberate current tsc+build-only policy, and if so, should any of the resulting pure-logic tests eventually become a required CI gate?
- Should siege.ts's blast-kill path (currently skipping loot/arena-credit/Cedric final-stand credit and mislabeling every non-skeleton kind) be brought in line with melee/ranged kill rewards (CLN-12's deferred behavior change), or is under-rewarding blast kills an intentional balance choice?

---

## Suggested execution order

Batches reflect dependency order only (an initiative never precedes one it depends on) — not urgency. Within a batch, pick by what a session has appetite for; effort/risk are noted per item.

**Batch 1 — foundations (no dependencies; safe to start any of these in parallel)**
- CLN-01 — Shared math/geometry/RNG/hash utility library *(effort M, risk low)*
- CLN-05 — Central debug-hook helper (exposeDebug) replacing ~56 hand-rolled window.__kk* blocks *(effort M, risk low)*
- CLN-06 — Mechanical dead-export and inert-comment sweep *(effort M, risk low)*
- CLN-08 — types.ts split + world-scope helper consolidation *(effort M, risk low)*
- CLN-10 — Buildables/land data-catalog split + lazy-load generated JSON *(effort L, risk med)*
- CLN-14 — navgrid.ts decomposition + break TemplateWorld<->navgrid cycle *(effort L, risk med)*
- CLN-16 — AI core decision-layer split (Reasoner scoring/commitment) + config type split *(effort M, risk low)*
- CLN-27 — BuildController.tsx decomposition *(effort L, risk med)*
- CLN-28 — Viewmodel.tsx + character/Equipment.tsx decomposition *(effort M, risk low)*
- CLN-29 — lib/ rig & OBJ-loading pipeline consolidation *(effort L, risk med)*
- CLN-30 — Panels.tsx one-file-per-panel + shared panel primitives *(effort L, risk low)*
- CLN-32 — Stylesheet consolidation (kk-tokens/kk-lanes/kk-screens/globals) *(effort M, risk med)*
- CLN-34 — Docs & ROADMAP hygiene *(effort M, risk low)*
- CLN-35 — Repo/git/scripts housekeeping *(effort S, risk low)*

**Batch 2 — first-order consumers**
- CLN-02 — Introduce vitest as an additive, non-blocking test runner for pure logic *(effort S, risk low)*
- CLN-03 — Single source of truth for gameStore's persisted save state *(effort L, risk med)*
- CLN-04 — Complete session/lifecycle reset (sessionReset.ts) *(effort M, risk med)*
- CLN-11 — combat.ts decomposition into combat/ + data/enemies+weapons+melee *(effort L, risk med)*
- CLN-15 — Unify melee-engage, work-loop, and wander/roam AI state-machine trios *(effort M, risk med)*
- CLN-21 — npcs.ts decomposition (cast + quests) + quest-data integrity validator *(effort M, risk low)*
- CLN-24 — Terrain/ground-render decomposition + GPU-leak fixes *(effort M, risk low)*
- CLN-31 — Remaining HUD/stacks duplication cleanup *(effort M, risk low)*

**Batch 3 — second-order consumers**
- CLN-07 — gameStore.ts slice decomposition (Zustand slice pattern) *(effort XL, risk med)*
- CLN-09 — Save/persistence transport hardening (lib/save.ts, worldeditor, /api/save) *(effort M, risk low)*
- CLN-12 — Unify enemy-kill resolution across 8 duplicated sites *(effort M, risk med)*
- CLN-17 — AI sync-adapter consolidation + AgentManager despawn-hook fix *(effort M, risk low)*
- CLN-18 — Population-actor duplication cleanup (Villagers/Defenders/Npc/Companion/dragon sieges) *(effort L, risk med)*
- CLN-19 — Siege-prop and scene-shell duplication cleanup (ram/ladder, arena/dome rings, cannon/quintain) *(effort M, risk low)*
- CLN-20 — World-simulation tick extraction into pure tick() functions + always-mounted runner *(effort M, risk med)*
- CLN-22 — Settlement/caravan/road data consolidation + shared world-anchor table *(effort M, risk med)*
- CLN-23 — Economy/progression data consolidation (pricing, melee ladder, effect tables) *(effort L, risk med)*

**Batch 4 — the big, high-value, higher-risk extractions**
- CLN-13 — Enemies.tsx AI decomposition + director extraction *(effort XL, risk high)*
- CLN-25 — Static building/prop-dressing duplication cleanup *(effort S, risk low)*
- CLN-26 — PlayerController.tsx decomposition *(effort L, risk med)*

**Batch 5 — final polish (bundle splitting, once the components it wraps have stabilized)**
- CLN-33 — Bundle/code-splitting for stacks, late-game systems, and debug overlays *(effort M, risk med)*

---

## Initiatives

| ID | Title | Effort | Risk | Depends on |
|---|---|---|---|---|
| CLN-01 | Shared math/geometry/RNG/hash utility library | M | low | — |
| CLN-02 | Introduce vitest as an additive, non-blocking test runner for pure logic | S | low | CLN-01 |
| CLN-03 | Single source of truth for gameStore's persisted save state | L | med | CLN-01 |
| CLN-04 | Complete session/lifecycle reset (sessionReset.ts) | M | med | CLN-01 |
| CLN-05 | Central debug-hook helper (exposeDebug) replacing ~56 hand-rolled window.__kk* blocks | M | low | — |
| CLN-06 | Mechanical dead-export and inert-comment sweep | M | low | — |
| CLN-07 | gameStore.ts slice decomposition (Zustand slice pattern) | XL | med | CLN-01, CLN-03, CLN-04 |
| CLN-08 | types.ts split + world-scope helper consolidation | M | low | — |
| CLN-09 | Save/persistence transport hardening (lib/save.ts, worldeditor, /api/save) | M | low | CLN-03 |
| CLN-10 | Buildables/land data-catalog split + lazy-load generated JSON | L | med | — |
| CLN-11 | combat.ts decomposition into combat/ + data/enemies+weapons+melee | L | med | CLN-01 |
| CLN-12 | Unify enemy-kill resolution across 8 duplicated sites | M | med | CLN-11 |
| CLN-13 | Enemies.tsx AI decomposition + director extraction | XL | high | CLN-11, CLN-12 |
| CLN-14 | navgrid.ts decomposition + break TemplateWorld<->navgrid cycle | L | med | — |
| CLN-15 | Unify melee-engage, work-loop, and wander/roam AI state-machine trios | M | med | CLN-01, CLN-14 |
| CLN-16 | AI core decision-layer split (Reasoner scoring/commitment) + config type split | M | low | — |
| CLN-17 | AI sync-adapter consolidation + AgentManager despawn-hook fix | M | low | CLN-04 |
| CLN-18 | Population-actor duplication cleanup (Villagers/Defenders/Npc/Companion/dragon sieges) | L | med | CLN-01, CLN-15 |
| CLN-19 | Siege-prop and scene-shell duplication cleanup (ram/ladder, arena/dome rings, cannon/quintain) | M | low | CLN-01, CLN-11 |
| CLN-20 | World-simulation tick extraction into pure tick() functions + always-mounted runner | M | med | CLN-04 |
| CLN-21 | npcs.ts decomposition (cast + quests) + quest-data integrity validator | M | low | CLN-08 |
| CLN-22 | Settlement/caravan/road data consolidation + shared world-anchor table | M | med | CLN-21 |
| CLN-23 | Economy/progression data consolidation (pricing, melee ladder, effect tables) | L | med | CLN-11, CLN-08 |
| CLN-24 | Terrain/ground-render decomposition + GPU-leak fixes | M | low | CLN-14 |
| CLN-25 | Static building/prop-dressing duplication cleanup | S | low | CLN-22 |
| CLN-26 | PlayerController.tsx decomposition | L | med | CLN-01, CLN-11, CLN-14, CLN-20 |
| CLN-27 | BuildController.tsx decomposition | L | med | — |
| CLN-28 | Viewmodel.tsx + character/Equipment.tsx decomposition | M | low | — |
| CLN-29 | lib/ rig & OBJ-loading pipeline consolidation | L | med | — |
| CLN-30 | Panels.tsx one-file-per-panel + shared panel primitives | L | low | — |
| CLN-31 | Remaining HUD/stacks duplication cleanup | M | low | CLN-30 |
| CLN-32 | Stylesheet consolidation (kk-tokens/kk-lanes/kk-screens/globals) | M | med | — |
| CLN-33 | Bundle/code-splitting for stacks, late-game systems, and debug overlays | M | med | CLN-11, CLN-13, CLN-18, CLN-10 |
| CLN-34 | Docs & ROADMAP hygiene | M | low | — |
| CLN-35 | Repo/git/scripts housekeeping | S | low | — |

### CLN-01 — Shared math/geometry/RNG/hash utility library

**Effort:** M · **Risk:** low

**Why:** wrapAngle copy-pasted verbatim 23x across 10 files (Villagers.tsx, Defenders.tsx, Locomotion.ts, BattleDome.tsx, Compass.tsx, Wildlife.tsx, DungeonScene.tsx, RiggedProp.tsx, Npc.tsx, Merchant.tsx); mulberry32 is byte-identical in gameStore.ts:844-850 and dungeon.ts:214-221; clamp/clamp01 reimplemented in ai/core/curves.ts and ai/actions/wander.ts plus 13 inline unrolled sites; AABB-overlap forked 4 ways (grounds.ts, WorldEditorClient.tsx byte-identical copy, waterworks.ts, dungeon.ts); array random-pick idiom repeated 25x/15 files; hashId has 5 divergent implementations for the same id-to-number need.

**Scope:** src/game/store/gameStore.ts, src/game/dungeon.ts, src/ai/core/curves.ts, src/ai/actions/wander.ts, src/game/data/grounds.ts, src/app/secret/worldeditor/WorldEditorClient.tsx, src/game/waterworks.ts, src/game/data/villagerLooks.ts, src/game/data/interiors.ts, src/game/data/attributes.ts, src/game/navgrid.ts, src/components/world/{Villagers,Defenders,BattleDome,Wildlife,DungeonScene,RiggedProp,Npc,Merchant}.tsx, src/components/hud/Compass.tsx, src/ai/core/Locomotion.ts

**Approach:** Create src/lib/math.ts (clamp, clamp01, wrapAngle), src/lib/rng.ts (mulberry32, hashId, pick, randInt), src/lib/geometry.ts (dist2D, withinRadius, aabbOverlapCenterHalf, aabbOverlapMinMax). Port each existing implementation verbatim (same algorithm/constants), then replace call sites file-by-file with imports. Delete interiors.ts's local hashId (keep villagerLooks.ts's as canonical). Do NOT merge the 3 divergent hash algorithms (navgrid avoidPriority's FNV-1a, gameStore's sectionSeed) into one — only dedupe true duplicates.

**Target structure:** src/lib/math.ts, src/lib/rng.ts, src/lib/geometry.ts — each <50 lines, zero internal deps, importable by any layer including the ai/ and data/ cycles.

**Verification:** tsc --noEmit passes; diff each extracted function's output against the old inline code for 20 hand-picked inputs (angle wrap near +-pi, mulberry32 first 5 outputs at seed 20260713, aabbOverlap edge-touching rects) via a throwaway node script; existing Playwright smoke scripts for world-gen (seedNodes hash) and dungeon layout must produce identical output.

---

### CLN-02 — Introduce vitest as an additive, non-blocking test runner for pure logic

**Effort:** S · **Risk:** low · **Depends on:** CLN-01

**Why:** ~20 area audits proposed 'testable' pure modules (curves, geometry, dungeon gen, navgrid A*, pricing, xp, achievements, save round-trip) that are cheap to pin today but have zero regression coverage; the project's only gate is tsc+next build (CLAUDE.md/CI comment explicitly documents this as a deliberate choice, not an oversight).

**Scope:** package.json, vitest.config.ts (new), .github/workflows/ci.yml

**Approach:** Add vitest as a devDependency (not a CI-blocking gate initially — a separate optional `npm run test:unit` script). Write the first 5 tests against already-pure, zero-import functions identified across audits: evalCurve (ai/core/curves.ts), mulberry32/wrapAngle (post CLN-01), sectionsOverlap (grounds.ts), isBuilt/isDoorLike (types.ts), storageCapacity (storage.ts). This seeds the pattern other initiatives' 'testable' modules can plug into without deciding CI policy up front.

**Target structure:** vitest.config.ts at repo root; test files colocated as *.test.ts next to the pure module they cover (e.g. src/lib/math.test.ts).

**Verification:** `npx vitest run` passes locally; does not modify ci.yml's required checks in this initiative, so existing CI behavior is unchanged (tsc+build still the only required gate) until the open question on making it a CI gate is decided.

---

### CLN-03 — Single source of truth for gameStore's persisted save state

**Effort:** L · **Risk:** med · **Depends on:** CLN-01

**Why:** Every persisted field is hand-listed 6 times: the (unexported) GameState interface (gameStore.ts:140-733), the initial-state literal (1166-1264), freshSaveFields (1019-1047), loadFromSave (1310-1378), toSave (1388-1457), and SaveGame (types.ts:319-504). Three independent gameStore area audits flagged this exact duplication as their #1 high-severity finding, one citing a code comment (1012-1018) that admits past drift; legacy-load defaults deliberately differ from fresh-game defaults (landTier, cedricCaptures) and must stay explicit, not be silently unified.

**Scope:** src/game/store/gameStore.ts, src/game/types.ts

**Approach:** Add src/game/store/persistence.ts exporting PERSISTED_DEFAULTS (one record), PERSISTED_KEYS (checked with `satisfies keyof SaveGame`), LEGACY_LOAD_OVERRIDES (the intentionally-different load-time defaults, kept explicit), and buildSave(state, leaves)/applySave(save) derived from the single table. Add src/game/saveMigrations.ts for migrateSave(raw: unknown): SaveGame covering the Wave 38 cedricCaptures inference and landTier default. gameStore's initial state, freshSaveFields, loadFromSave and toSave all call into these instead of restating fields.

**Target structure:** src/game/store/persistence.ts (~220 lines: defaults/keys/build/apply), src/game/saveMigrations.ts (~80 lines), gameStore.ts's newGame/loadFromSave/toSave shrink to thin callers.

**Verification:** Golden-master test: script scripted actions then toSave(); loadFromSave(toSave()) must deep-equal the original for every PERSISTED_KEYS entry; run against at least one pre-refactor save fixture and one freshly-generated save. Key-coverage check: every SaveGame key appears in PERSISTED_KEYS or is explicitly documented as intentionally excluded (destination, which is always saved null).

---

### CLN-04 — Complete session/lifecycle reset (sessionReset.ts)

**Effort:** M · **Risk:** med · **Depends on:** CLN-01

**Why:** placeHistory, carriedKeepExtra, lastJoustAt are never reset by any of newGame/loadFromSave/NG+ (grep-confirmed by 2 auditors); buildSeq/villagerSeq/blueprintSeq/waterSeq reset only on load, not newGame/NG+; ~20 transient UI fields (movingBuilding, demolishRect, keepSocket, ceremony) are reset by neither path; defenderState/ridingState/fishingState/statsAccum are never reset at all; AgentManager.clear() (AgentManager.ts:127-131) skips despawnHooks entirely, so Locomotion's steerState/anchorCache and perception/state.ts's belief maps survive a same-tab reload while villager ids ('v1'..) are commonly reused across saves — a real correctness bug, not just a stale-comment issue.

**Scope:** src/game/store/gameStore.ts, src/ai/core/AgentManager.ts, src/ai/core/Locomotion.ts, src/ai/perception/state.ts, src/game/defenders.ts, src/game/riding.ts, src/game/fishing.ts, src/game/statsAccum.ts, src/game/companion.ts

**Approach:** Add src/game/store/sessionReset.ts with EPHEMERAL_DEFAULTS and a resetSessionState() that folds the 3 near-identical lifecycle prologues into one beginSession(patch); it resets placeHistory/carriedKeepExtra/lastJoustAt and all buildSeq-family counters uniformly across newGame/loadFromSave/NG+. Add a clearHooks array to AgentManager mirroring despawnHooks, fired from clear(); Locomotion.ts and perception/state.ts each push a clearHooks entry (same pattern already used for despawnHooks). Add resetDefenders/resetRiding/resetFishing/resetStatsAccum and call from resetSessionModules.

**Target structure:** src/game/store/sessionReset.ts (~60 lines) replacing the inline resetSessionModules prologue; AgentManager.ts gains `clearHooks: (()=>void)[]`.

**Verification:** Smoke script: place a building (creates placeHistory entry), mount a horse, take defender damage, then loadFromSave a different save in the same tab; assert __kkbuild's placeHistory is empty, __kkr (riding) is unmounted, __kkdefenders has no stale hp entries, and a spawned agent with a reused villager id has no leftover Locomotion steerState.

---

### CLN-05 — Central debug-hook helper (exposeDebug) replacing ~56 hand-rolled window.__kk* blocks

**Effort:** M · **Risk:** low

**Why:** ~56 files independently write `(window as unknown as Record<string,unknown>).__kkX = ...` (grep-verified count) with no shared helper, no registry, and no NODE_ENV gate — every hook ships in the production bundle. These hooks are the sole live-verification contract for 349 gitignored Playwright scripts, so names and object identities must not change.

**Scope:** ~56 files across src/game, src/ai, src/components (see grep for `.__kk[A-Za-z]* =`)

**Approach:** Add src/lib/debugHooks.ts exporting exposeDebug(name: string, value: unknown) with the SSR-safe `typeof window !== 'undefined'` guard, called identically everywhere. Migrate call sites mechanically, one file per commit, preserving every existing hook name exactly. Do NOT add NODE_ENV gating in this initiative — that's a behavior change requiring its own decision (see openQuestions).

**Target structure:** src/lib/debugHooks.ts (~25 lines) + a one-page comment/index listing every registered hook name, replacing 56 duplicated boilerplate blocks.

**Verification:** After migration, grep confirms zero remaining hand-rolled `(window as unknown as Record<string, unknown>).__kkX` assignments outside debugHooks.ts; run 5-10 existing smoke scripts unmodified and confirm they still find every hook they reference (name-for-name diff of window.__kk* keys before/after).

---

### CLN-06 — Mechanical dead-export and inert-comment sweep

**Effort:** M · **Risk:** low

**Why:** mech.json flags 20 fully-dead exports and 245 'export keyword needless' entries; a 21-entry spot-check of the second bucket found zero false positives, but the first bucket had one confirmed false positive (registerSenses, reached via a side-effect import chain mech.json's scanner missed). 37 eslint-disable comments are inert (repo has no ESLint installed, verified: no config file, no dependency, no npm script). Also: minifig-rest.generated.json (29KB) has zero importers anywhere in src/ or scripts/.

**Scope:** src/ai/config/index.ts, src/game/data/{minifigs,labCapabilities,quests,worlds,env,navgrid,types,aaModes,brickResources,keep}.ts, src/lib/minifig.ts, src/components/world/WorkshopBench.tsx, src/game/data/allegianceQuests.ts, src/game/data/minifig-rest.generated.json, ~14 files with eslint-disable comments

**Approach:** Delete the 19 confirmed-dead exports individually (grep-verify each against src/ AND scripts/ before deleting — do not trust mech.json alone, per the confirmed registerSenses false positive). Do NOT delete registerSenses. Bulk-strip the `export` keyword (not the declaration) from the 245 flagged entries via scripted codemod, then let tsc catch any missed cross-file use. Delete all 37 eslint-disable comment lines. Delete minifig-rest.generated.json after confirming with the asset pipeline it's superseded by the anim_r_restpose clip approach (lib/minifigRig.ts:39-43).

**Target structure:** No new files; net line reduction across ~35 files.

**Verification:** tsc --noEmit and next build pass after each batch (dead-export deletion and export-keyword-stripping are both compile-time-checkable); grep confirms zero remaining references to each deleted symbol in src/ and scripts/ before commit.

---

### CLN-07 — gameStore.ts slice decomposition (Zustand slice pattern)

**Effort:** XL · **Risk:** med · **Depends on:** CLN-01, CLN-03, CLN-04

**Why:** 5073 lines (verified exact line count), 100+ importers, one create() closure holding ~100 state fields and 164 actions across ~12 domains (session, progression, inventory, quests, faction/story, world/farming, build/keep, villagers, companion, empire economy, trade, UI). Every action can touch every field; three independent gameStore audits converged on nearly identical slice boundaries. This is the single highest-value structural move in the codebase per auditor consensus.

**Scope:** src/game/store/gameStore.ts

**Approach:** Introduce src/game/store/slices/types.ts (GameState = intersection of slice interfaces via SliceCreator<T> = StateCreator<GameState,[],[],T>). Extract one slice per domain per PR: sessionSlice, uiSlice, inventorySlice, progressionSlice, questSlice, storySlice, worldSlice, buildSlice, keepSlice, villagerSlice, companionSlice, empireSlice/tradeSlice. gameStore.ts becomes a ~100-line composition root: createGameStore() spreads all slices, exports useGameStore/window.__kk unchanged, and re-exports the small set of names (PanelId, GROW_TIME, TAX_COOLDOWN_MS, activeQuestOf, atGuildMaxRank) the ~100 importers rely on. One slice extracted and merged per PR, gated by tsc+build+smoke before the next.

**Target structure:** src/game/store/slices/{types,sessionSlice,uiSlice,inventorySlice,progressionSlice,questSlice,storySlice,worldSlice,buildSlice,keepSlice,villagerSlice,companionSlice,empireSlice,tradeSlice}.ts (~150-800 lines each per auditor estimates) + src/game/store/{constants,storeHelpers}.ts for pure leaf helpers (atGuildMaxRank, activeQuestOf, partCost, topOf) + src/game/{nodeScatter,villagerWork}.ts for the pure world-gen/work helpers currently embedded in the closure. gameStore.ts itself shrinks to the composition root.

**Verification:** After each slice PR: `Object.keys(useGameStore.getState())` is identical before/after; tsc --noEmit; next build; run the full existing Playwright smoke suite (quest-complete + rank-up + ceremony chain, build/undo/load, villager equip). Golden-master save round-trip from CLN-03 must still pass after every slice merges.

---

### CLN-08 — types.ts split + world-scope helper consolidation

**Effort:** M · **Risk:** low

**Why:** types.ts is 752 lines (verified), 56% comments, 92 importers, mixing item ids/build/villager/save-schema types in one file; it also `import type`s RectSection (grounds.ts) and MarketEntry (trade.ts), closing a reported 6-file data cycle (confirmed type-only, hence runtime-harmless, but still a real layering smell). Separately, `world?: string|null` plus the identical isHomeBuilding/isHomeVillager predicate is duplicated across PlacedBuilding/ResourceNodeState/CultivatedPlot/Villager, with ~62 inline `(x.world ?? null) === (destination ?? null)` comparisons scattered across combat/world/AI code.

**Scope:** src/game/types.ts, src/game/data/grounds.ts, src/game/data/trade.ts, ~62 call sites of the world-scope comparison across src/components/world, src/game/combat.ts, src/ai

**Approach:** Split into game/types/{core,world,villagers,save}.ts; types.ts remains as an `export *` barrel so all 92 importers are unaffected. Move RectSection and MarketEntry into types/world.ts, have grounds.ts/trade.ts `import type` and re-export them, eliminating the cycle. Add a WorldScoped interface plus isHome(x)/inWorld(x,w) helpers (new game/worldScope.ts or inside types/world.ts); delete the dead isHomeVillager; migrate the ~62 inline comparisons incrementally.

**Target structure:** src/game/types/{core,world,villagers,save}.ts (~110/300/120/270 lines) + types.ts as a 10-line barrel; src/game/worldScope.ts (~25 lines).

**Verification:** tsc --noEmit; re-run the mechanical import-graph tool and confirm the reported 6-file cycle's type-only edges are gone; grep confirms every migrated call site now uses isHome/inWorld with identical boolean results (spot-check 10 sites by hand before/after).

---

### CLN-09 — Save/persistence transport hardening (lib/save.ts, worldeditor, /api/save)

**Effort:** M · **Risk:** low · **Depends on:** CLN-03

**Why:** fetchSave collapses no-save, network error, and corrupt JSON into a single null (save.ts:24-37); MainMenu's play(true) then falls through to character creation, skipping the overwrite-confirm and risking autosave-over-real-save (GameScreen.tsx:176-186) — reproduced by static trace, not live. writeSave uses non-atomic fs.writeFileSync with no backup (db.ts:88-91). worldeditor's validateRow rejects <=0 for grounds/plots fields but not for landTiers' walls/half/southHalf/cost. session.ts's cookie never sets `secure`. WorldEditorClient.tsx hand-rolls the same CRUD splice pattern in 4 near-identical table forms.

**Scope:** src/lib/save.ts, src/lib/server/db.ts, src/lib/server/session.ts, src/app/api/save/route.ts, src/app/api/worldeditor/{data,save}/route.ts, src/app/secret/worldeditor/WorldEditorClient.tsx, src/components/stacks/MainMenu.tsx

**Approach:** Change fetchSave to return a discriminated SaveResult {status:'ok'|'none'|'error'|'corrupt', save?}; MainMenu shows retry/error UI on error/corrupt and never routes Continue to character creation; keep the overwrite confirm whenever hasSave is true. Make writeSave atomic (temp file + rename) with a rotating .bak; add src/lib/saveSchema.ts for shared version/shape/size validation used by both /api/save and fetchSave, built on CLN-03's migrateSave. Add the missing <=0 check to worldeditor's landTiers validation. Add `secure: process.env.NODE_ENV==='production'` to the session cookie. Extract src/app/secret/worldeditor/{formPrimitives.tsx,liveChecks.ts} to dedupe the 4 table forms' CRUD/geometry-check logic.

**Target structure:** src/lib/save.ts (~70 lines, discriminated result), src/lib/server/db.ts (+atomic write/backup), src/lib/saveSchema.ts (~60 lines), src/app/secret/worldeditor/formPrimitives.tsx + liveChecks.ts.

**Verification:** Smoke test: corrupt a save file on disk, confirm MainMenu shows an error state (not silent fallthrough to character creation); kill the process mid-write (or simulate) and confirm the prior save is recoverable via .bak; POST a landTiers row with a negative cost and confirm the route now rejects it (currently accepts).

---

### CLN-10 — Buildables/land data-catalog split + lazy-load generated JSON

**Effort:** L · **Risk:** med

**Why:** buildables.ts is 1106 lines mixing 4 concerns (catalog data, collision-geometry engine, cost-bill rendering, a debug hook), fanIn 30. gameStore.ts imports only LAND_TIERS/MAX_LAND_TIER from it yet buildables.ts eagerly imports bricks.generated.json (40KB); gameStore also imports SET_PLANS/locateStep/setStepCount from lib/setBuild.ts, which eagerly imports setPlans.generated.json (109KB) — so 149KB of generated JSON ships to every one of gameStore's 100+ importers even though only the Workshop/BuildBar UI needs it.

**Scope:** src/game/data/buildables.ts, src/lib/setBuild.ts, src/game/store/gameStore.ts

**Approach:** Split buildables.ts into buildables/{catalog,collision,land}.ts with buildables.ts kept as a barrel (30 import sites unaffected). Extract landTiers.ts (LAND_TIERS/MAX_LAND_TIER, sourced only from landTiers.generated.json) as its own dependency-free module; repoint gameStore.ts at it instead of buildables.ts. Turn lib/setBuild.ts's SET_PLANS access into an async ensureSetPlans()/getSetPlans() backed by a lazy fetch/dynamic import, matching the existing lazy-load pattern already used for OBJ/MTL props (loadModuleParts).

**Target structure:** src/game/data/buildables/{catalog,collision}.ts (~720/~170 lines) + buildables.ts slimmed to ~220 lines (land constants + barrel); src/game/data/landTiers.ts (~40 lines); src/lib/setPlansLoader.ts (~40 lines, async).

**Verification:** tsc + next build; confirm via a bundle-analyzer run (or manual dev-tools network tab) that setPlans.generated.json is no longer in the initial JS payload and only loads when the Workshop/BuildBar UI is opened; existing build-placement and workshop-set smoke scripts pass unchanged.

---

### CLN-11 — combat.ts decomposition into combat/ + data/enemies+weapons+melee

**Effort:** L · **Risk:** med · **Depends on:** CLN-01

**Why:** combat.ts is 1657 lines (verified), 52 exports, 43% comments, fusing player vitals, 9 enemy-stat tables, loot, the enemy zustand store, damagePlayer, weapons/melee ladder, dodge/parry, projectiles, and 9 window debug hooks. It also runs a gameStore.subscribe at import time (vitals cap derivation), contributing to the documented TDZ-crash history.

**Scope:** src/game/combat.ts

**Approach:** Extract pure data first (lowest risk): data/enemies.ts (EnemyKind, ENEMY_DEFS, derived KIND_*/ATTACK_*/LOOT_TABLES) and data/weapons.ts (MELEE ladder, tiers, enchant, meleeStatsFor). Then split runtime behind a combat/index.ts barrel: state.ts, vitals.ts (with initVitalsSync() replacing the import-time subscribe), enemyStore.ts, loot.ts, kill.ts, playerDamage.ts, melee.ts, projectiles.ts, geometry.ts (shared segment-math), structures.ts, debugHooks.ts. combat.ts's 39 importers see no change (barrel re-export).

**Target structure:** src/game/data/{enemies,weapons,melee}.ts (~130/~150/~200 lines); src/game/combat/{state,vitals,enemyStore,loot,kill,playerDamage,melee,projectiles,geometry,structures,debugHooks,index}.ts (~25-230 lines each).

**Verification:** tsc+build; existing combat/enemy smoke scripts (spawn, damagePlayer, melee kill, loot roll with fixed seed) produce identical output; window.__kkc/__kke/__kkAttack/__kkBolt hook identities unchanged (verify via a script diffing window.__kk* keys).

---

### CLN-12 — Unify enemy-kill resolution across 8 duplicated sites

**Effort:** M · **Risk:** med · **Depends on:** CLN-11

**Why:** Kill bookkeeping (dying state, recordKill, XP, loot, notify) is copy-pasted at combat.ts:1105-1136 and 1554-1573, siege.ts:135-141 and 180-185, and 4 ally-AI action files (assistLeader.ts, engageThreat.ts, engageThreatVillager.ts, Defenders.tsx) — already drifted: siege.ts's blast kills skip loot, arena credit, and Cedric final-stand credit, and mislabel every non-skeleton kind as 'Bandit blasted!'.

**Scope:** src/game/combat.ts, src/game/siege.ts, src/ai/actions/{assistLeader,engageThreat,engageThreatVillager}.ts, src/components/world/Defenders.tsx

**Approach:** Add game/enemyKill.ts exporting resolveEnemyKill(e, cause) owning the state flip, recordKill, arena-counter increment, XP, loot, notify text, and Cedric final-stand hook. Migrate the melee/ranged sites first (behavior-identical), then the 4 ally-AI sites, then siege.ts's blast kills last as an explicit, separately-flagged behavior change (loot/arena/label policy for blast kills is a product decision, not a pure refactor).

**Target structure:** src/game/enemyKill.ts (~60 lines); 7 call sites reduced to one-line calls.

**Verification:** Smoke script kills one enemy via melee, one via ranged, one via each ally type, and one via siege blast; assert XP/loot/notify text match pre-refactor for the first 6 (behavior-preserving) and are deliberately changed only for the blast-kill case, which is called out in the PR description.

---

### CLN-13 — Enemies.tsx AI decomposition + director extraction

**Effort:** XL · **Risk:** high · **Depends on:** CLN-11, CLN-12

**Why:** Enemies.tsx is 1637 lines with one 829-line per-mob useFrame closure covering death FX, climb, target-scan, 5 near-identical approach-or-attack bodies (wall-defender/defender/companion/villager/player, ~200 duplicate lines), chase, and pack separation, plus a 413-line Enemies() 1Hz 'director' that also owns the whole game's nav-grid rebuild (Enemies.tsx is the sole caller path gameStore relies on for gate-toggle nav invalidation) and dungeon/raid/night-skeleton spawning — none of which is enemy-specific.

**Scope:** src/components/combat/Enemies.tsx

**Approach:** Extract src/game/enemyAi/{targeting,engage,movement,climb,step}.ts (pure functions taking a HostileTarget/ctx, replacing the 5 duplicated approach-attack bodies with one engage()); src/game/enemyKinds.ts consolidating the 9 scattered Record<EnemyKind,...> tables (combat.ts + Enemies.tsx CONFIGS + bestiary.ts) into one ENEMY_KINDS registry using `satisfies` for exhaustiveness; src/game/directors/{navMaintenance,dungeonDirector,nightSkeletons,raidDirector}.ts for the 1Hz director logic, each with a __kkdirectors debug hook. Enemy component becomes a thin view over data.mob.

**Target structure:** src/game/enemyAi/{targeting,engage,movement,climb,step}.ts (~120-150 lines each); src/game/enemyKinds.ts (~220 lines); src/game/directors/{navMaintenance,dungeonDirector,nightSkeletons,raidDirector}.ts (~30-170 lines); src/components/combat/EnemyFigure.tsx for the render/portal split.

**Verification:** Position-trace regression: seeded-RNG script records enemy positions/states over N frames before refactor, replays after each extraction step and diffs; preserve the exact if/else priority order byte-for-byte. Gate: nav-grid still rebuilds on gate toggle (existing gate smoke script), dungeon room clear/reward, night-skeleton spawn, and dusk-raid trigger all still fire.

---

### CLN-14 — navgrid.ts decomposition + break TemplateWorld<->navgrid cycle

**Effort:** L · **Risk:** med

**Why:** navgrid.ts is 1228 lines (verified) mixing obstacle-source, height-field, A*, grid registry, line-of-sight, and local-avoidance/steering in one file. It imports getMountedRoot/getMountedRegion directly from components/world/TemplateWorld.tsx (a React component), which transitively imports DungeonScene->Buildings->siege->...->gameStore->...->navgrid — TemplateWorld.tsx is itself one of the 70 files in the documented ai/Perception import cycle. This exact edge is independently flagged by the navgrid, world-terrain, AI-core, and AI-perception audits.

**Scope:** src/game/navgrid.ts, src/components/world/TemplateWorld.tsx, src/game/homeGround.ts

**Approach:** Extract src/game/templateGround.ts (or groundProbe.ts) mirroring the already-shipped homeGround.ts precedent: sampleTemplateGroundY, destinationGroundY, raycastGroundY, getMountedRoot/Region, normalizeTemplateBake, TEMPLATE_WORLD_SCALE — pure, no React/three-fiber imports at the class level. TemplateWorld.tsx sets it and re-exports for backward compat; navgrid.ts imports the leaf instead of the component. Then split navgrid.ts itself into nav/{astar,heightField,obstacles,steering,registry}.ts behind a navgrid.ts barrel, and export a single getNavGridOrNull(region) replacing 5 duplicated try/catch wrappers found across AnchorResolution.ts, Locomotion.ts, and 3 ai/actions files.

**Target structure:** src/game/templateGround.ts (~230 lines); src/game/nav/{astar,heightField,obstacles,steering,registry}.ts (~110-200 lines each) behind navgrid.ts barrel.

**Verification:** Cold-load smoke test in dev AND a prod build (the TDZ crash this fixes was build-order-dependent, per gameStore's own Wave 31 header); pathfinding golden-master (path through a gap, road preference, maxStep) unchanged; re-run the mechanical import-graph tool and confirm the TemplateWorld->navgrid edge is gone (whether the full 70-file cycle shrinks is not guaranteed and should be re-measured, not assumed).

---

### CLN-15 — Unify melee-engage, work-loop, and wander/roam AI state-machine trios

**Effort:** M · **Risk:** med · **Depends on:** CLN-01, CLN-14

**Why:** EngageThreatActivity/EngageThreatVillagerActivity/AssistLeaderActivity share ~90% identical approach/face/swing logic (~210 duplicate lines, each file's header admits the copy); gather.ts/haul.ts/farm.ts share near-verbatim reserve->travel->align->finish/abort skeletons (~135 duplicate lines); wander.ts/roam.ts share an identical walk-to-point loop; 14 files re-declare the identical boolCurve literal and 8 re-declare notThreatenedCurve instead of importing from core/curves.ts.

**Scope:** src/ai/actions/{engageThreat,engageThreatVillager,assistLeader}.ts, src/ai/actions/{gather,haul,farm}.ts, src/ai/actions/{wander,roam}.ts, src/ai/core/curves.ts

**Approach:** Extract ai/actions/meleeEngage.ts (shared approach/face/swing factory parameterized by damage fn + optional downed-check/leash/onKill hooks; keep each file's own Action/considerations/config type separate — auditors explicitly warn against merging the type shapes). Extract ai/actions/workActivity.ts (shared reserve/travel/align/finish/abort skeleton with a perform()-phase hook). Extract ai/actions/walkLoop.ts (shared MOVE_TO-and-wait loop with an injected point-picker). Add BOOL_CURVE/NOT_THREATENED_CURVE to core/curves.ts, replacing the 22 local declarations.

**Target structure:** src/ai/actions/{meleeEngage,workActivity,walkLoop}.ts (~40-120 lines each); core/curves.ts +2 exported constants.

**Verification:** Existing gather/haul/farm and combat-engage smoke scripts must produce identical trip timing, damage, and XP; each Activity's own gates/config/considerations remain untouched so behavior differences between defender/villager/companion engagement are preserved exactly.

---

### CLN-16 — AI core decision-layer split (Reasoner scoring/commitment) + config type split

**Effort:** M · **Risk:** low

**Why:** Reasoner.ts is 498 lines mixing pure IAUS scoring (scoreAction/evalCurve, zero store dependency) with candidate assembly that needs TargetRegistry->gameStore. mech.json reports a Reasoner.ts->actions/index.ts cycle edge that this synthesis's spot-check found to be a false positive (the only match is inside a JSDoc comment, not a real import) — worth correcting before anyone acts on it. Separately, ai/config/index.ts (438 lines) mixes 8 JSON imports/casts with ~20 exported type interfaces across 7 unrelated tuning domains, and 7 of its JSON casts use `as unknown as X` with zero runtime validation.

**Scope:** src/ai/core/Reasoner.ts, src/ai/config/index.ts

**Approach:** Split Reasoner.ts into core/scoring.ts (pure: Consideration/Category/Action/Candidate types, scoreAction, category weights — zero TargetRegistry import) and core/commitment.ts (pickAction/pickRaw/startCooldown state machine, pure given a Blackboard+Candidate[]); Reasoner.ts keeps only assembleCandidates/runReasoner/registerActions, the parts that genuinely need TargetRegistry/Agent/Memory. Split config/index.ts into config/types.ts (interfaces only) and config/index.ts (JSON imports/loaders); add a dev-only assertion per `as unknown as X` cast listing required top-level keys, so a renamed JSON key fails loudly per the file's own stated philosophy.

**Target structure:** src/ai/core/{scoring,commitment}.ts (~140 lines each) + Reasoner.ts trimmed to ~200 lines; src/ai/config/{types,index}.ts (~230/~210 lines).

**Verification:** tsc+build; scoring.ts/commitment.ts import with zero gameStore/TargetRegistry dependency (verify via `node -e require` or CLN-02's vitest, confirming they're now importable standalone); dev-mode boot with a deliberately-corrupted JSON key throws a clear error instead of producing NaN downstream.

---

### CLN-17 — AI sync-adapter consolidation + AgentManager despawn-hook fix

**Effort:** M · **Risk:** low · **Depends on:** CLN-04

**Why:** npcSync.ts and courtAmbientSync.ts share byte-identical mirrorPositions/resetX bodies; all 3 population syncs (rosterSync/npcSync/courtAmbientSync) share the same liveIds spawn/despawn diff shape; the 5 sync files (plus companionSync/wildlifeSync) sit flat under src/ai/ while every sibling concern has its own subdirectory. The AgentManager.clear() despawn-hook gap (see CLN-04) is the same root cause documented independently by this area's audit.

**Scope:** src/ai/{rosterSync,npcSync,courtAmbientSync,companionSync,wildlifeSync}.ts, src/ai/AiRuntime.tsx

**Approach:** Extract src/ai/sync/reconcile.ts (generic liveIds-diff spawn/despawn + mob-registry position mirroring); move all 5 sync files plus reconcile.ts into src/ai/sync/ for directory consistency with core/perception/actions/config/debug. Compute scheduledCourtNpcs(...) once per frame in AiRuntime.tsx and pass the result into both syncNpcAgents and syncCourtAmbientAgents instead of each recomputing and re-filtering it.

**Target structure:** src/ai/sync/{reconcile,rosterSync,npcSync,courtAmbientSync,companionSync,wildlifeSync}.ts.

**Verification:** tsc+build; existing villager/NPC/court-ambient population smoke scripts show identical spawn/despawn counts and positions after the move; import paths updated in gameStore.ts and AiRuntime.tsx (the ~10 sites), tsc catches any miss.

---

### CLN-18 — Population-actor duplication cleanup (Villagers/Defenders/Npc/Companion/dragon sieges)

**Effort:** L · **Risk:** med · **Depends on:** CLN-01, CLN-15

**Why:** DragonSiege.tsx and BlackDragonSiege.tsx are near-total copies of one state machine (only ~10 constants and the dragonAir channel differ); Villagers.tsx/Npc.tsx/Companion.tsx each re-implement the same MOVE_TO/PLAY_ANIM/FACE agent-intent cascade (Companion.tsx's own header calls itself 'Npc.tsx's CourtNpc, trimmed'); the downed-state gate (`if state==='downed'...`) is copy-pasted verbatim in 3 files; Defenders.tsx/Companion.tsx share an identical loadout-gear portal block; villagerMobs.ts/npcMobs.ts are near-identical 20-line registries.

**Scope:** src/components/world/{DragonSiege,BlackDragonSiege,Villagers,Npc,Companion,Defenders}.tsx, src/game/{villagerMobs,npcMobs}.ts

**Approach:** Extract DragonSiegeController.tsx (shared SiegeFlight state machine) + dragonSiegeConfig.ts (per-variant constants/strings); both dragon files become ~20-line configs. Extract ai/core/useAgentDrivenActor.ts (shared MOVE_TO/MOVE_TO_ANCHOR/PLAY_ANIM/FACE intent hook); Villagers/Npc/Companion call it first, keeping each file's own legacy fallback cascade unchanged. Extract game/actorDowned.ts (applyDownedGate) and character/LoadoutGear.tsx (shared gear-portal renderer with the Companion-vs-Defender fallback as an explicit prop, keeping the documented divergence visible). Factor createMobRegistry<T>(debugKey) replacing villagerMobs.ts/npcMobs.ts.

**Target structure:** src/components/world/DragonSiegeController.tsx (~260 lines) + src/game/dragonSiegeConfig.ts (~50 lines); src/ai/core/useAgentDrivenActor.ts (~120 lines); src/game/actorDowned.ts (~20 lines); src/components/character/LoadoutGear.tsx (~30 lines); src/game/mobRegistry.ts (generic factory).

**Verification:** Screenshot/behavior diff for both dragon fights (breath timing, hit/rout counts, reward payout) before/after; villager/NPC/companion movement smoke scripts show identical position traces; downed-state visibility toggling unchanged for all 3 populations.

---

### CLN-19 — Siege-prop and scene-shell duplication cleanup (ram/ladder, arena/dome rings, cannon/quintain)

**Effort:** M · **Risk:** low · **Depends on:** CLN-01, CLN-11

**Why:** raiderRam.ts/raiderLadder.ts and their RaiderRam.tsx/RaiderLadder.tsx components are parallel copies (reset/damage/wreck-animation logic duplicated); RaiderRam.tsx and RaiderLadder.tsx never check `st.paused`, so both keep dealing real damage under the pause menu (a real bug, cheap fix); ArenaScene.tsx and BattleDome.tsx duplicate an identical gapped-ring wall generator differing only in 2 constants; siege.ts mixes cannon/explosives/quintain in one file, and Buildings.tsx imports siege.ts (a component importing another component's logic module) solely for quintainSpins.

**Scope:** src/game/{raiderRam,raiderLadder,siege}.ts, src/components/combat/{RaiderRam,RaiderLadder,ArenaScene,BattleDome}.tsx, src/components/world/Buildings.tsx

**Approach:** Model both raider props as RaiderSiegeProp records {state, radius, midY, salvage, xp, message} in game/raiderProps.ts with one hit/step/wreck routine and one shell component, preserving raiderRamState/raiderLadderState exports and __kkRam/__kkLadder hook names. Add the missing `if (st.paused) return` early-return to both useFrame loops. Extract src/components/combat/ringGeometry.ts's useRingAngles(segCount, gapHalf) shared by ArenaScene/BattleDome. Split siege.ts into siege/{cannon,explosives,quintain}.ts; move quintainSpins to a leaf so Buildings.tsx no longer imports siege.ts.

**Target structure:** src/game/raiderProps.ts (~150 lines) + one shell component; src/components/combat/ringGeometry.ts (~20 lines); src/game/siege/{cannon,explosives,quintain}.ts (~100/70/20 lines).

**Verification:** Sample __kkRam.x/z and __kkLadder state across a pause-menu toggle and confirm no further advancement (currently advances); screenshot diff of the arena/dome ring gap alignment before/after; ram/ladder wreck-salvage XP unchanged for both siege types.

---

### CLN-20 — World-simulation tick extraction into pure tick() functions + always-mounted runner

**Effort:** M · **Risk:** med · **Depends on:** CLN-04

**Why:** PlayerController.tsx's 0.5s tick block (tickRespawns/tickPlots/tickVillagers/checkVillagerArrival/refreshFort/setNearStations) and tickFishing/tickBuildChallenge have zero other call sites and only run while !frozen inside a component GameWorld.tsx unmounts during build mode — so world simulation appears to stall while the player is in build mode, an effect nobody has confirmed is intentional. Separately, ChallengeRunner.tsx/SettlementRaidRunner.tsx/ArenaSpawner.tsx keep game rules (hold-the-plot logic, spawn cadence) inside useFrame closures instead of the game/*.ts modules that already hold their state, and duplicate ring-spawn math 6x.

**Scope:** src/components/fps/PlayerController.tsx, src/components/combat/{ChallengeRunner,SettlementRaidRunner,ArenaSpawner}.tsx, src/game/{challengeModes,settlementRaid,arena}.ts

**Approach:** Extract src/components/world/WorldTickRunner.tsx (always-mounted, same !frozen gating, same conditional mount as today — a pure move, not a behavior change) owning the 0.5s tick block plus tickFishing/tickBuildChallenge. Extract pure tickArena(st,dt,deps)/tickChallenges(st,dt,deps) into arena.ts/challengeModes.ts; add game/waveDefense.ts (shared hold-the-plot tick) and game/spawnUtil.ts (spawnOnRing helper) used by all 3 runner components, which shrink to thin useFrame shells.

**Target structure:** src/components/world/WorldTickRunner.tsx (~50 lines); src/game/waveDefense.ts (~70 lines); src/game/spawnUtil.ts (~25 lines); arena.ts/challengeModes.ts gain exported tick functions (~190 lines added, existing state kept).

**Verification:** Confirm via a smoke script that plot growth/villager arrival/respawns/fishing/build-challenge timers advance identically whether or not build mode is ever entered during the run (this pins today's actual behavior, whatever it is, before anyone decides to change it — see openQuestions). Arena/challenge/settlement-raid smoke scripts show identical spawn counts/timing.

---

### CLN-21 — npcs.ts decomposition (cast + quests) + quest-data integrity validator

**Effort:** M · **Risk:** low · **Depends on:** CLN-08

**Why:** npcs.ts is 1396 lines, 19 importers, mixing NPC roster types, court/village/settlement NpcDefs, interior residents, and guild-quest pools (keyed by guild, not by NPC) with quest-resolution logic; ~105 side-quest definitions assemble from 7 different source tables with no validation that requires-chains resolve or that gather/deliver targets are raw-harvestable — a real bug of this class already shipped once (Wave 34's unfinishable gather-vs-craft quests).

**Scope:** src/game/data/npcs.ts, src/game/data/{allegianceQuests,settlementQuests,deliveryQuests}.ts

**Approach:** Split into data/cast/{types,court,village,settlements,interiorResidents,presence,index}.ts and data/quests/{guildQuests,resolve}.ts; npcs.ts remains a re-export barrel so the 19 importers are untouched. Make SideQuestDef a discriminated union on kind (gather: RawItemId, craft: recipe id, kill: EnemyKind|'any', defend: TemplateId) instead of a plain string target. Add a pure validateGameData() checking: unique quest ids, requires-chains resolve and are acyclic, gather/deliver targets exist and are the right kind, EXTRA_SIDE_QUESTS keys are real givers — exposed via a window.__kkdata hook for the existing smoke scripts to assert against.

**Target structure:** src/game/data/cast/{types,court,village,settlements,interiorResidents,presence,index}.ts (~30-330 lines each); src/game/data/quests/{guildQuests,resolve}.ts (~260/~110 lines); a new validateGameData() in one of these, or src/game/data/validate.ts.

**Verification:** validateGameData() runs clean against current data (0 violations) before merging; tsc+build; existing dialogue/quest smoke scripts unaffected since npcs.ts's public surface is unchanged.

---

### CLN-22 — Settlement/caravan/road data consolidation + shared world-anchor table

**Effort:** M · **Risk:** med · **Depends on:** CLN-21

**Why:** One 'settlement site' concept is spread across 6 differently-keyed tables (SETTLEMENT_QUESTS by npc id, SETTLEMENT_FOUNDING/NODES by dest id, SETTLEMENT_GROWTH_QUEST_DEST by quest id, CARAVAN_ROUTES by 'a|b' pair, settlementRoads.ts hardcoding npc ids). Separately, world-anchor coordinates are hand-typed independently in npcs.ts/guilds.ts/world.ts/worlds.ts with 'must stay in sync' comments — and have already drifted twice (Storm's tourney-fence position in CourtDressing.tsx references a coordinate moved twice since without the dependent file being updated; a builders-hall/spawn offset mismatch of 0.02).

**Scope:** src/game/data/{settlementQuests,caravan,settlementRoads,npcs,guilds,world,worlds}.ts, src/components/world/{CourtDressing,MerchantCamp}.tsx

**Approach:** Add data/settlements.ts: one SETTLEMENTS registry keyed by dest id {giverNpcId, quests, founding, nodes, growthQuestId, roadLegs}, with derived views so gameStore/DialoguePanel call sites are unchanged. Add data/anchors.ts with named local points (king, woodsmenHall, cedricCamp, torvald, garrick, merchantCampWalls, arrival spawns) resolved once via the existing resolveDestPoint; repoint npcs.ts/guilds.ts/world.ts/settlementRoads.ts at it. Fix CourtDressing.tsx's TourneyLists to derive its fence position from NPC_BY_ID['richard']'s live position instead of a frozen literal; move MerchantCamp's 5 inline wall placements into a MERCHANT_CAMP_WALLS data array.

**Target structure:** src/game/data/settlements.ts (~170 lines); src/game/data/anchors.ts (~80 lines).

**Verification:** Deep-equal check of every derived settlement view against today's hand-written tables; snapshot every resolved anchor's x/z before and after migration and assert exact equality (the audit found two prior drift bugs this exact check would have caught); screenshot the tourney fence and merchant camp walls before/after.

---

### CLN-23 — Economy/progression data consolidation (pricing, melee ladder, effect tables)

**Effort:** L · **Risk:** med · **Depends on:** CLN-11, CLN-08

**Why:** Haggle math (wit*0.04 + Silver Tongue 0.15 + Honest Weight 0.08) is hand-copied in gameStore.ts (sellItem/buyOffer), ShopPanel.tsx, Panels.tsx's guild vendor, and caravan.ts — already diverged (the UI omits sellItem's Wanderer +0.02 bonus, and the guild ticket omits the market multiplier buyOffer applies). Pure melee data (MELEE/MELEE_TIERS/bestMeleeTierOwned) sits inside combat.ts, forcing achievements.ts to hardcode a second copy of the 4 sword tiers to avoid an import cycle. ~72 perk/skill/calling/attribute effect magnitudes are scattered as inline `perks.includes('id')`-style literals across gameStore.ts/combat.ts/fishing.ts, with only prose descriptions in perks.ts/skillTree.ts that can silently disagree with actual behavior.

**Scope:** src/game/store/gameStore.ts, src/game/combat.ts, src/game/fishing.ts, src/components/hud/{ShopPanel,Panels}.tsx, src/game/data/{caravan,trade,achievements,ranks,skillTree,playerAttributes}.ts

**Approach:** Add data/pricing.ts (haggleMult, sellQuote, buyQuote) as the single source; all 5 call sites use it (the Wanderer/market-multiplier gaps become visible in previews — call this out explicitly in the PR as an intentional, separately-reviewed fix, not silent). Add data/melee.ts (pure, extracted from combat.ts per CLN-11) that achievements.ts imports instead of hardcoding tiers. Add data/effects.ts (typed PERK_FX/TALENT_FX/CALLING_FX/ATTR_FX tables) and data/derivedStats.ts (pure derivers: maxStamina, meleeBonus, growTimeMult, wearMult, harvestBonus) migrated one stat at a time, each pinned by a fixture test.

**Target structure:** src/game/data/pricing.ts (~70 lines); src/game/data/effects.ts (~180 lines) + derivedStats.ts (~90 lines).

**Verification:** Fixture test comparing old vs new haggle/sell/buy quotes across a matrix of perk/attribute/class combinations — flag any site where output changes (expected only for the two documented drift fixes); derivedStats functions cross-checked against the existing inline formulas for 10+ perk/skill combinations before replacing call sites.

---

### CLN-24 — Terrain/ground-render decomposition + GPU-leak fixes

**Effort:** M · **Risk:** low · **Depends on:** CLN-14

**Why:** Terrain.tsx (800L) and TemplateWorld.tsx (591L) mix ground-truth rendering, water features, and bake-normalization in one file each; the same ripple texture is loaded via 3 separate TextureLoader calls. Two confirmed GPU leaks: InstancedProps.tsx's useInstancedSubMeshes clones geometry+material per mount with no cleanup (contrasted with sibling code in the same file that does dispose correctly), and LabFlame.tsx clones a texture per torch/campfire instance with no disposal on unmount — every building placement/removal leaks GPU memory.

**Scope:** src/components/world/{Terrain,TemplateWorld,InstancedProps,LabFlame}.tsx

**Approach:** Split Terrain.tsx into HomeMeadowWater.tsx, TerrainRegions.tsx, Sky.tsx. Extract src/lib or src/game/templateGround.ts per CLN-14 (same extraction, do together). Add a shared useRippleTexture() hook replacing the 3 duplicated TextureLoader blocks. Add the missing `useEffect(() => () => { geometry.dispose(); material.dispose(); }, [...])` cleanup to InstancedProps' useInstancedSubMeshes and LabFlame's cloned texture.

**Target structure:** src/components/world/{HomeMeadowWater,TerrainRegions,Sky}.tsx (~330/110/125 lines); src/components/world/useRippleTexture.ts (~25 lines).

**Verification:** Mount/unmount 50 torches and 50 instanced-prop groups in a loop via a Playwright script reading renderer.info.memory (or a new debug hook exposing it); confirm geometry/texture counts return to baseline after unmount, unlike today. Visual smoke-check of home terrain/water rendering unchanged after the file split.

---

### CLN-25 — Static building/prop-dressing duplication cleanup

**Effort:** S · **Risk:** low · **Depends on:** CLN-22

**Why:** The identical 4-corner surveyor-stake marker block is copy-pasted between Buildings.tsx and ConstructionSite.tsx; GuildHalls.tsx imports Grounded/Pennant from CourtDressing.tsx solely to reuse them even though CourtDressing's own default export is documented dead code still mounted in GameWorld.tsx; MerchantCamp.tsx hardcodes 5 wall placements as inline literals unlike every sibling anchor (which live in game/data/world.ts).

**Scope:** src/components/world/{Buildings,ConstructionSite,GuildHalls,CourtDressing,MerchantCamp}.tsx

**Approach:** Export SurveyorStakes({w,d}) from ConstructionSite.tsx; have Buildings.tsx's local duplicate call it. Extract src/components/world/SceneDressing.tsx (Grounded/Pennant/ZERO_OFFSET) so GuildHalls/CedricCamp/BattleDome/Buildings depend on a neutral module instead of CourtDressing.tsx; delete CourtDressing's confirmed-dead default export and its GameWorld.tsx mount. Move MerchantCamp's 5 wall placements into data/world.ts as MERCHANT_CAMP_WALLS (covered jointly with CLN-22's anchors.ts work).

**Target structure:** src/components/world/SceneDressing.tsx (~45 lines).

**Verification:** Screenshot diff of an unfinished building's stake markers, a guild hall's pennants, and the merchant camp walls before/after — all three should be pixel-identical.

---

### CLN-26 — PlayerController.tsx decomposition

**Effort:** L · **Risk:** med · **Depends on:** CLN-01, CLN-11, CLN-14, CLN-20

**Why:** 2227 lines (verified exact count), 21 refs, 43 imports; findTarget is a 636-line closure (594-1229), performAction a 272-line 42-branch else-if, and one 721-line useFrame spans input polling, camera, on-foot collision/gravity, and world-simulation ticks. This is the most detailed, most-cross-corroborated extraction plan across the audits (11 target modules proposed with line estimates).

**Scope:** src/components/fps/PlayerController.tsx

**Approach:** Extract in this order (each independently mergeable, tsc+smoke-gated): (1) game/interaction/{types,climb,findTarget,candidates/*,performAction,holdToAct}.ts — the interaction system, typed via an InteractKind union replacing the private 55-member string union; (2) game/playerPhysics/{floor,collide,vertical,locomotion,modes}.ts — movement/collision core over an explicit PlayerBody interface; (3) components/fps/input/{pads,usePointerLock,usePlayerInput,look}.ts — input polling, fixing the touch-overwrites-gamepad bug (OR-merge instead of overwrite) as a separately-flagged behavior fix; (4) components/fps/{useCameraRig,useAimReadout,publishPlayerState}.ts; (5) move the orphaned world-simulation ticks per CLN-20.

**Target structure:** ~15 new files per the audit's detailed extraction table (game/interaction/*, game/playerPhysics/*, components/fps/input/*, components/fps/use*.ts); PlayerController.tsx shrinks to a ~350-line orchestrator over one PlayerBody object.

**Verification:** Golden-master position/prompt trace via window.__kkp across a scripted movement+interaction sequence, diffed before/after each extraction step; pointer-lock and gamepad/touch smoke scripts pass; the touch/gamepad OR-merge fix is verified via a dedicated Playwright test (mock touch active + gamepad stick forward, assert movement) since it's a deliberate behavior change from today's overwrite bug.

---

### CLN-27 — BuildController.tsx decomposition

**Effort:** L · **Risk:** med

**Why:** 938 lines, one function combining an orthographic camera rig, keyboard-shortcut handling, hold-to-place timers, row-fill/marquee/dig drag gestures, and ~200 lines of ghost/preview JSX, sharing ~20 gameStore selectors.

**Scope:** src/components/build/BuildController.tsx

**Approach:** Extract useBuildCamera.ts (zoom/pan/quarter-turn rig state), useBuildHotkeys.ts (the single keydown/keyup effect), and BuildGhost.tsx (presentational ghost/marquee/blueprint render given computed props) — each concern already touches disjoint refs/state per the auditor's read, making the split mechanical.

**Target structure:** src/components/build/{useBuildCamera,useBuildHotkeys,BuildGhost}.tsx (~180/70/200 lines).

**Verification:** Build-mode smoke script: pan/zoom/rotate camera, place a row of walls, demolish/dig marquee, undo — all produce identical building/inventory state before and after the split.

---

### CLN-28 — Viewmodel.tsx + character/Equipment.tsx decomposition

**Effort:** M · **Risk:** low

**Why:** Viewmodel.tsx is 696 lines (23% comments, 17 Wave tags) mixing procedural tool meshes, a MOUNT tuning table, a 50ms poll driving 9 useStates, and per-frame bob/swing math. Equipment.tsx repeats a hand-mount offset literal 5x and holds ~80 lines of chestplate-tier JSX alongside unrelated carrier/glow components. Both duplicate a HAND_MOUNT-style offset and a SWORD/HALBERD weapon-id table already present in the other file.

**Scope:** src/components/fps/Viewmodel.tsx, src/components/character/Equipment.tsx

**Approach:** Split Viewmodel.tsx into viewmodel/{ProceduralTools,Longbow,RigArm}.tsx, mounts.ts, pickTool.ts (pure tool-decision function), useViewmodelPoll.ts. Split Equipment.tsx into equipment/{Held,Armor,Carried}.tsx behind an index barrel (8 importers unaffected); extract a shared HAND_MOUNT constant and per-weapon tilt table used by both Viewmodel and Equipment instead of two independent copies.

**Target structure:** src/components/fps/viewmodel/{ProceduralTools,Longbow,RigArm,mounts,pickTool,useViewmodelPoll}.tsx (~40-170 lines each); src/components/character/equipment/{Held,Armor,Carried}.tsx (~70-150 lines each).

**Verification:** Screenshot each tool/weapon in first-person and each equip slot in third-person before/after; pickTool's priority chain (lance>ranged>pickaxe/rod/axe/hammer>halberd/spear>sword>fist) covered by a CLN-02 vitest unit test.

---

### CLN-29 — lib/ rig & OBJ-loading pipeline consolidation

**Effort:** L · **Risk:** med

**Why:** The OBJ+MTL loader is copied 5x (minifig.ts, propParts.ts, propRig.ts, setBuild.ts, DragonOmen.tsx); the upright-flip+scale+ground-normalize transform is copied ~9x; minifigRig.ts (748 lines) mixes 6 concerns (clip loaders, 3 mesh classifiers, PCA arm-rehang math, rig assembly, animator, hitbox measurement); minifig.ts has 92 lines of dead assembler code (assembleMinifig/collectParts/cloneMeshInto, zero callers) that also keeps classifyPart/PartClass alive as dead code in a data file.

**Scope:** src/lib/{minifig,minifigRig,rigParts,rigExtract,propRig,propParts,setBuild,weaponParts,audio}.ts, src/components/world/{PropModel,DragonOmen}.tsx

**Approach:** Add lib/obj/{load,normalize,materials}.ts (loadObjMtl, normalizeUpright, toStandardMaterials) and port the 5 loader + 9 normalize call sites onto them. Split minifigRig.ts into lib/rig/{classify,rehang,assemble,MinifigAnimator,hitboxes}.ts behind a minifigRig.ts barrel; move EMOTES to game/data/emotes.ts. Delete minifig.ts's dead assembler code and classifyPart/PartClass. Split audio.ts into audioCatalog.ts (SOUNDS list) and ambience.ts (pure ambiencePool + scheduler).

**Target structure:** src/lib/obj/{load,normalize,materials}.ts (~40/45/40 lines); src/lib/rig/{classify,rehang,assemble,MinifigAnimator,hitboxes}.ts (~70-200 lines each); src/lib/{audioCatalog,ambience}.ts (~35/45 lines).

**Verification:** Box3/bounds comparison per asset type before/after normalizeUpright extraction via a node script (three's geometry math runs headless); screenshot every prop/weapon/rig category; rig classifier unit-tested per CLN-02 against synthetic BufferGeometry fixtures.

---

### CLN-30 — Panels.tsx one-file-per-panel + shared panel primitives

**Effort:** L · **Risk:** low

**Why:** Panels.tsx is 1360 lines holding 7 unrelated panel components (Equipment/Inventory, Crafting, Parley, Guild, Skills) plus a 19-case dispatcher behind one default export (fanIn=1, so the split is fully mechanical and low-risk). PanelFrame (the shared close-button+header+scroll shell) exists inside Panels.tsx but isn't exported, so VillagersPanel.tsx and NpcEquipPanel.tsx each hand-copy the identical markup (twice, in NpcEquipPanel's case). The 'active errand / offers / blocked' side-quest board is duplicated near-verbatim in ParleyPanel, GuildErrands, and DialoguePanel (~180 combined lines); the two-click respec button is duplicated between TalentTree and AttributesSection.

**Scope:** src/components/hud/{Panels,VillagersPanel,DialoguePanel,NpcEquipPanel}.tsx

**Approach:** Split Panels.tsx into PanelFrame.tsx (exported), InventoryPanel.tsx, CraftingPanel.tsx, ParleyPanel.tsx, GuildPanel.tsx, SkillsPanel.tsx, with Panels.tsx keeping only the dispatcher switch. Extract shared hud/shared/{SideQuestBoard,RespecButton,ChoiceChip,BadgeTile,GearLoadoutControls}.tsx; migrate VillagersPanel/NpcEquipPanel/DialoguePanel to use PanelFrame and SideQuestBoard instead of their hand-copied markup. Move ArmorySection (currently defined in NpcEquipPanel.tsx and imported backwards by VillagersPanel.tsx) into its own ArmorySection.tsx.

**Target structure:** src/components/hud/{PanelFrame,InventoryPanel,CraftingPanel,ParleyPanel,GuildPanel,SkillsPanel}.tsx (~20-380 lines each); src/components/hud/shared/{SideQuestBoard,RespecButton,ChoiceChip,BadgeTile,GearLoadoutControls,ArmorySection}.tsx.

**Verification:** Screenshot every panel (inventory, crafting, parley, guild, skills, villagers roster, dialogue, npc equip) before/after; the panel dispatcher's default export signature is unchanged so HUD.tsx needs zero edits.

---

### CLN-31 — Remaining HUD/stacks duplication cleanup

**Effort:** M · **Risk:** low · **Depends on:** CLN-30

**Why:** 6 HUD status components (ArenaHud, DungeonStatus, BuildChallengePanel, ChallengePanels, FortStatus, OrderStatus) each hand-roll an identical useRef+useState+rAF-throttle-poll pattern for reading a mutable leaf module. 10 contextual panels retype the same close-button+h2 shell Panels.tsx already has (dup of CLN-30's PanelFrame — apply it here too). 4 stack screens (Credits/Help/Options/CharacterCreator) retype the same kk-screen-head/kk-screen-actions block. MainMenu.tsx is the only stack using a bare whole-store `useAppStore()` subscription instead of per-field selectors. StatsStack.tsx is the only screen not using the kk-screen-${uiTheme} lane-theming shell.

**Scope:** src/components/hud/{ArenaHud,DungeonStatus,BuildChallengePanel,ChallengePanels,FortStatus,OrderStatus,AppearancePanel,BestiaryPanel,ChroniclePanel,QuestLogPanel,BuildingMenuPanel,EmoteWheel,KeepSocketPanel,ShopPanel,StationMenuPanel,WorkshopPanel}.tsx, src/components/stacks/{CreditsStack,HelpStack,OptionsStack,CharacterCreator,MainMenu,StatsStack}.tsx

**Approach:** Add hud/useRafPoll.ts (throttled rAF hook) and migrate the 6 status components. Apply CLN-30's PanelFrame to the 10 remaining contextual panels. Add stacks/ScreenShell.tsx (ScreenHead/ScreenActions) and migrate the 4 stack screens. Split MainMenu.tsx's bare useAppStore() call into per-field selectors matching every sibling screen. Migrate StatsStack's outer shell to kk-screen kk-screen-${settings.uiTheme}. Widen game/data/buildables.ts's costBill() to accept a structural {cost, pieces?} param so KeepSocketPanel can call it instead of re-deriving its own fallback branch.

**Target structure:** src/components/hud/useRafPoll.ts (~25 lines); src/components/stacks/ScreenShell.tsx (~30 lines).

**Verification:** Screenshot each migrated panel/screen before/after; MainMenu re-render count drops (verify via CLN-05's debug-hook pattern extended with a render counter, or manual React DevTools profiler check) when an unrelated appStore field changes.

---

### CLN-32 — Stylesheet consolidation (kk-tokens/kk-lanes/kk-screens/globals)

**Effort:** M · **Risk:** med

**Why:** kk-tokens.css's 'LANE RECIPES' block (lines ~68-179, .kk-a/-b/-c/-d-*) has zero component usages anywhere (grep-confirmed by the audit) — kk-lanes.css is the real, independently-implemented lane engine. The same metal/leather/chrome gradient literal is hand-copied 3-9x across kk-tokens.css/kk-lanes.css/kk-screens.css/globals.css, with the 'worn parchment' recipe drifted across 3 of those copies. OptionsStack's theme-picker cards never adopt the selected lane's palette because kk-lanes.css only re-points variables inside .game-panel/.build-menu/.rank-badge/.quest-tracker, not .kk-screen-pad. 6 HUD components repeat an identical inline style object for the `.rank-badge` compact variant.

**Scope:** src/styles/{kk-tokens,kk-lanes,kk-screens}.css, src/app/globals.css, src/components/stacks/OptionsStack.tsx, src/components/hud/{ArenaHud,BuildChallengePanel,ChallengePanels,DungeonStatus}.tsx

**Approach:** Delete kk-tokens.css's dead LANE RECIPES block after re-confirming zero usages. Hoist each lane's gradient into one --kk-lane-<name>-bg custom property in kk-tokens.css; replace every literal copy with var(). Add the missing --kk-card-* override to .kk-screen-pad (or scope .theme-card to read --kk-card-* directly) so the theme picker previews correctly. Add .rank-badge.compact and .menu-btn.compact modifier classes; replace the 6+10 inline style-object call sites. Split globals.css (951L) into kk-legacy-panels.css/kk-touch-controls.css/kk-dev-overlays.css and kk-screens.css (1749L) into kk-screen-frontdoor.css/kk-hud-field.css/kk-hud-widgets.css, all still imported via the existing globals.css @import chain so no component changes.

**Target structure:** src/styles/{kk-legacy-panels,kk-touch-controls,kk-dev-overlays,kk-screen-frontdoor,kk-hud-field,kk-hud-widgets}.css.

**Verification:** Visual diff of all 4 lane themes across the main menu, a game panel, and the options theme picker before/after (theme picker cards should now visibly change per lane, a deliberate visible fix — call out in the PR); grep confirms zero remaining references to deleted dead classes.

---

### CLN-33 — Bundle/code-splitting for stacks, late-game systems, and debug overlays

**Effort:** M · **Risk:** med · **Depends on:** CLN-11, CLN-13, CLN-18, CLN-10

**Why:** Only one next/dynamic() call exists in the entire app (page.tsx). App.tsx statically imports every screen stack; GameWorld.tsx statically imports ~50 components including DragonSiege/BlackDragonSiege/CedricSiege/BattleDome/DungeonScene regardless of unlock state; GameScreen.tsx unconditionally mounts AIDebugOverlay (388 lines) and PerfOverlay for every player even though both already render null until a keypress.

**Scope:** src/app/page.tsx, src/components/App.tsx, src/components/world/GameWorld.tsx, src/components/stacks/GameScreen.tsx, src/ai/debug/AIDebugOverlay.tsx, src/components/hud/PerfOverlay.tsx

**Approach:** Wrap CharacterCreator/StatsStack/HelpStack/CreditsStack and a new LateGameSystems.tsx bundle (DragonSiege/BlackDragonSiege/CedricSiege/BattleDome/DungeonScene) in next/dynamic({ssr:false}) at their existing import sites — a pure import-statement change, JSX unchanged. Wrap AIDebugOverlay and PerfOverlay the same way (no behavior change since they already null-render). Add @next/bundle-analyzer behind an ANALYZE env flag and experimental.optimizePackageImports for three/@react-three/drei/three-stdlib to next.config.mjs to measure the effect.

**Target structure:** src/components/world/LateGameSystems.tsx (~60 lines, dynamic-wrapped bundle).

**Verification:** Bundle-analyzer diff before/after showing the dynamic-wrapped chunks split out of the main bundle; smoke-check that each late-game system still mounts correctly once its unlock condition is met (existing DragonSiege.tsx __kk hook confirms post-mount state; add a network-request assertion in the Playwright script to confirm lazy loading actually occurred).

---

### CLN-34 — Docs & ROADMAP hygiene

**Effort:** M · **Risk:** low

**Why:** README.md claims '153 pieces' but BUILDABLES.length today is 249 (44+25+20+160, verified against buildables.ts + bricks.generated.json structure described across audits); README claims '8 quests' but quests.ts defines 11 (matching HANDOFF.md's correct count); README's architecture diagram omits src/ai/ entirely (60 files, the largest cyclic subsystem) and 3 of the 8 components/ subfolders; package.json's predev script wipes all local accounts/saves on every `npm run dev` restart with no warning in the README's Running section; ROADMAP.md has grown to 10,509 lines/894KB with the same archive-worthy shape the project already solved once for Phases 0-19 (ROADMAP_ARCHIVE.md); src/ai/PHASE_STATUS.md is missing Waves 43/53/54/57/61; src/ai/PROJECT_CONTEXT.md's §7-8 describe a phase-1 API surface and a 'genuinely open' list that are now stale and resolved.

**Scope:** README.md, package.json, ROADMAP.md, ROADMAP_ARCHIVE.md, src/ai/{README,PROJECT_CONTEXT,PHASE_STATUS}.md, .gitignore

**Approach:** Regenerate README's piece/quest counts from source (or drop exact numbers in favor of 'a searchable catalog'); add the missing src/ai/ and components/ subfolders to the architecture diagram; add a one-line predev data-wipe warning. Apply the existing archive-and-compact pattern to ROADMAP.md: fold shipped waves' full verification prose into ROADMAP_ARCHIVE.md, leaving one-line recaps. Append the missing waves to PHASE_STATUS.md; trim PROJECT_CONTEXT.md to its still-accurate §1-6, replacing §7-8 with a pointer to PHASE_STATUS.md. Refresh .gitignore's stale size-estimate comments (extracted-assets comment says ~48MB, measured 101MB; scripts/shots comment says 222MB, measured 324MB) or remove the specific numbers.

**Target structure:** No new files; ROADMAP.md shrinks substantially, ROADMAP_ARCHIVE.md grows.

**Verification:** Doc-only changes; verify README's piece/quest counts against a script that counts BUILDABLES.length and QUESTS.length at review time (and re-run at each future doc review instead of hand-typing); no code/behavior change to verify.

---

### CLN-35 — Repo/git/scripts housekeeping

**Effort:** S · **Risk:** low

**Why:** @playwright/test is not a declared dependency in package.json (verified: absent from both package.json and the lockfile's root dependencies/devDependencies) even though it appears deep in package-lock.json and node_modules/playwright-core exists — the entire smoke-test harness works only by accident of a stale local install, and scripts hardcode `C:/Program Files/Google/Chrome/Application/chrome.exe`. scripts/ (gitignored, 331MB) is 98% disposable screenshot output (scripts/shots+shots2, 324MB) plus 152 underscore-prefixed one-off diagnostics alongside 7 real tooling scripts. .claude/worktrees/ holds 25 orphaned skeleton directories from past parallel-agent runs that `git worktree list` no longer recognizes as real worktrees.

**Scope:** package.json, scripts/ (gitignored, local-only), .claude/worktrees/, git branches

**Approach:** Add @playwright/test as a real devDependency and replace the hardcoded chrome.exe path with Playwright's managed browser download, so `npm ci` reproduces the smoke-test harness on any machine/CI. Reorganize scripts/ into scripts/tools/ (the 7 real pipeline scripts) and scripts/smoke/ (kept harness scripts), deleting the one-off diagnostics and purging scripts/shots*/. Delete the confirmed-orphaned .claude/worktrees/ tree. Spot-check and delete the 18 already-merged local worktree-wf_* branches (`git branch -d`, safe per `git branch --merged main`); leave the 98 ambiguous remote squash-merge branches for manual review rather than bulk deletion.

**Target structure:** No src/ changes; scripts/{tools,smoke}/ reorganization is local-only (gitignored).

**Verification:** `npm ci && npx playwright install` reproduces a working smoke-test environment on a clean checkout; `git worktree list` and `git branch --merged main` re-run after cleanup to confirm nothing live was removed.

---

