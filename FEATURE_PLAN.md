# Feature Plan — Waves 62 onward

**Status: IN PROGRESS — see the Progress log below for what has shipped.** Written 2026-10-31, the day
[`CLEANUP_PLAN.md`](./CLEANUP_PLAN.md) closed, on `main` at 74a9dd3. The owner's brief: **"Grow + fix", large** — an
ambitious plan of about fifty heavy-hitting items, whose first wave clears every bug still logged open in
[`ROADMAP.md`](./ROADMAP.md). ROADMAP's *Reconciled status* section stays the one list of open items; this file says
which of them are being built, in what order, and why.

**How it was made.** Four read-only readers re-checked all 120 open items against the code (ROADMAP's 103-item backlog,
the bugs and decisions logged since, CLEANUP_PLAN's open questions and unscoped gaps), surveyed the depth of every
system, and audited the assets against the original game's extraction. Three planners then drafted complete plans from
different angles — the player's journey, engineering leverage, ambition — and a judge scored them and merged the
strongest. Three skeptical verifiers checked every item's premise against the code and caught real errors (see *Facts
this plan rests on*, at the end); a completeness critic checked coverage, order and sizes; an editor applied all of it;
and the owner answered the decisions that shape the design.

**How to use this file.** One wave is one PR. A pushed branch opens a PR that auto-merges once CI passes, so push only
what is verified. For each wave, the method the cleanup proved:

1. *Research first.* Re-read the item against the code as it is now — the file:line references here are from 74a9dd3.
   If a premise no longer holds, rescope in the PR and say so.
2. *Implement* on the seams the cleanup left: the store slices, the directors, `combat/kill.ts`, `interaction/`,
   `playerPhysics/`, the settlements registry, the effect tables.
3. *One evidence pass:* `tsc`, the unit tests (`npm run test:unit`, a CI gate from wave 63.1), `next build`, and a live
   headless probe on production builds of `main` and of the change side by side (CLAUDE.md's launch flags are
   mandatory). Measure a bug on `main` before fixing it.
4. *One read-only review round* (three reviewers at most). Anything new and minor that turns up late is logged in
   ROADMAP.md as its own item, not fixed in place.
5. *In the same PR:* add the wave to this file's Progress log and retag the ROADMAP entries it closes.

## Progress log

Kept current per PR, newest last, so a fresh session never has to reverse-engineer state from `git log`.

- **#286 — plan merged** (docs only): this file; in ROADMAP, a pointer here, OPEN-053, OPEN-071 and OPEN-080 retagged closed
  (they closed during the cleanup), OPEN-004 unblocked and OPEN-013's premise corrected; CLEANUP_PLAN.md marked complete.
- **#287 — Wave 62.1** (F-01, F-17): the directors' state is module state (`game/directors/state.ts`), reset at a session
  start, not at a remount — a raid outlives Options/Stats, and a load ends one unpaid (BUG-8726); a knock-out with raiders
  standing marks the raid lost, and it resolves with no reward ("The raiders had the field"). Premises held, two adapted:
  the cooldown already starts with the raid, so a lost raid keeps it running rather than starting one; and an away
  knock-out marks the raid lost too, since its clear takes the home raid as well. ROADMAP: BUG-8726 retagged fixed, F-17
  logged fixed. Measured on main: Options after dusk left 3 raiders unresolved and the ram and ladder active; Stats within
  dusk started a second raid (6 raiders); a knock-out paid plank/stone/iron ore 4/4/2 and 60 XP.

## Owner decisions

(A) = asked and answered by the owner on 2026-10-31. (R) = settled by the plan's recommendation; the owner may override it at any time, and the items it touches name it.

| Id | Decision | Answer | Items |
|---|---|---|---|
| OD-01 | (A) Should finished keep walls stop raiders, the player and line of sight? | Solid to everyone. Raiders enter by gate, ram or ladder, or batter a wall or gate piece; a destroyed piece is a breach until repaired. | G-02, G-03, G-05, G-15b, G-16b, G-32a |
| OD-02 | (A) Can raiders take goods, and what may a lost raid cost? | HARSH: uncapped theft (what a raider carries drops when he is killed before escaping); battered pieces become repairable ruins; a lost raid (player knocked out and garrison beaten, or raiders holding the field) destroys buildings outright, scaled by raid strength. | F-17, G-05, G-06, G-07, G-17a |
| OD-03 | (A) Should Richard's voiced campaign replace the challenge grounds' minigames? | Campaign first: the voiced campaign is the grounds' main mode, ending in Knighthood; the minigames stay replayable from 'Trials'. | G-12a, G-12b, G-13, G-14a, G-14b |
| OD-04 | (A) What should a cannonball or charge kill pay? | Split by who fired: crewed shots and player-placed charges pay full XP, the purse and final-stand credit; automatic emplacements (including villager- and mercenary-crewed ones) pay the purse with the right name at today's lower XP. | F-11, G-13, G-16b, G-32a |
| OD-05 | (A) What may an unattended settlement lose to an off-screen raid? | Besieged, then lost: yield paused, garrison wounded, a raven warns; if not relieved within about 2 in-game days it changes hands and must be retaken with the hideout-storm encounter. | G-24a, G-24b, G-33b |
| OD-06 | (R) How often, and at what hours, may home raids come? | Any hour by a per-hour chance weighted to dusk and night, averaging at most about one raid per in-game day, always after a 30-60 s horn; hideout pressure scales the same curve. | G-04, G-15a |
| OD-07 | (R) How are buy-then-sell haggle loops stopped? | A same-market floor: a buy price is never below the sell price of the same item at the same market for the player's current haggle; Wit stays uncapped; cross-market profit is intentional; ships in Ground Truth (F-16). | F-16, G-31 |
| OD-08 | (A) Should world ticks run in build mode and behind panels? | Run in build mode and behind panels; freeze only when paused or during a ceremony. | F-14, G-04, G-20 |
| OD-09 | (R) Enforce 'the homestead is uniquely free-build' at settlements? | Settlements stay free-build (empire decision 4 formally reversed); town plans are additive. | G-23, G-26 |
| OD-10 | (R) How is the workshop introduced, and what does the campaign grant? | The campaign's jail is the workshop's starter set; the campaign grants a Knighthood deed and a non-rank ceremony variant without changing rank formulas. | G-14a, G-14b |
| OD-11 | (R) Make the unit tests gate merges? | A step inside the existing required job, so tests gate auto-merge at once with no settings change. | F-07 |
| OD-12 | (R) Should the clock mirror stop marking the save dirty? | The clock mirror stops marking the save dirty; time is still written with any other change, at Save & Quit and in F-08b's tab-close flush. | F-08b |
| OD-13 | (R) Music: ratify ambience-only, or source tracks? | Ambience-only is ratified (no music exists in the extraction); the slider is renamed 'Ambience'. | F-10b |
| OD-14 | (R) Keep the window.__kk* debug hooks in production builds? | Keep them; every evidence pass probes production builds through them. | F-06 |
| OD-15 | (R) Who can besiege the Rival Castle, and for whom? | Any allegiance: crown-sworn players take it for King Leo, others for their own house. | G-32a, G-32b, G-33a, G-33b |
| OD-16 | (R) What does reaching an Act III ending mean for the save? | An ending plays a ceremony and epilogue that change the realm, then free play continues with NG+ offered. | G-34b |
| OD-17 | (R) Housekeeping: dead stabled/mounts store copies, scheduledCourtNpcs/CourtNpc.schedule, the 'commands' PanelId, SaveGame.playerPos? | Delete the dead stabled/mounts store copies (with F-09), scheduledCourtNpcs/CourtNpc.schedule (with G-12a) and the 'commands' PanelId (OPEN-079, with F-06); keep SaveGame.playerPos optional and documented. | F-06, F-09, G-12a |
| OD-18 | (A) What do the siege engines attack first, and how is the climax built? | Strongholds, then the castle: bandit strongholds built from castle-set catalog pieces (fully breakable and solid) are the first siege target; the Rival Castle capture is the climax, with breakable sections overlaid where a geometry probe of template-05 allows and ladders over the baked walls. One multi-site socket model (G-36) serves both and the town plans. | G-36, G-15b, G-16a, G-16b, G-32a, G-32b, G-33a, G-33b |
| OD-19 | (A) How does the plan run? | Run all waves, one PR each, without stopping except for real design questions. | — |
| OD-20 | (R) Whose men hold the hideouts, and whom do they raid? | Outlaw bands hostile to every allegiance. Their pressure adds an outlaw raid source at settlements even at neutral standing (a deliberate change to settlementRaid.ts:69-75), and Cedric-sworn players face them too. No hideout sits at CEDRIC_WORLD. | G-15a, G-24a |
| OD-21 | (R) Should the graphics-quality tier cap population? | A uniform population cap; the graphics tier limits only how many villagers are simulated as agents, so yields and caravans never depend on a rendering setting. | G-23 |

## Arcs

- **Ground Truth.** Clear every logged bug and every defect that loses progress, money or trust (saves, carry, raid payouts, hotkeys, blast credit, haggle loops, the global roster cap) before the game grows. Unit tests gate every merge from Wave 63 on.
- **Walls That Hold.** Make castle design decide raids: one multi-site socket model, repairable ruins before anything batters a wall, solid keep walls with a real gatehouse, road-borne raids from chosen sides at any hour after a horn, uncapped plunder with pursuit, a garrison armed from the forge, and lost raids that cost buildings.
- **Voices and Steel.** Use the original extraction the remake left on the shelf (77 clips, the missing sounds, 196 voiced challenge lines): recorded voices with subtitles, weapon-true fighting, knockdowns, and Richard's voiced campaign to Knighthood and the workshop's first set.
- **Bandit Country.** Give raids a source: outlaw hideouts that grow into castle-set strongholds, the first siege target (storm, burn, siege train, mercenary crews, breach), named captains who remember you, and prisoners whose fates feed gold, intelligence, allegiance and population.
- **A Living Realm.** Turn the village and the settlements into an economy that consumes and grows: hunger, warmth and morale, a tavern and infirmary, population growth, a realm overview with raven dispatches, garrisons that hold settlements off-screen, settlements that can be besieged, lost and retaken, and town plans.
- **The War of Two Houses.** Give the allegiance axis a story and an ending: richer errands, Chronicle Act II, a realm control map with regional markets, the siege and capture of the Rival Castle, and Act III's decisive battle and endings, after which free play continues.

## Waves at a glance

Every row is one PR. A sub-wave label (63.4) is its own PR; a lettered id (G-12a) is one part of a split item.

| Wave | Item | Title | Size | Kind | Arc |
|---|---|---|---|---|---|
| 62.1 | F-01 | A raid survives Options/Stats: director counters move out of Enemies refs | S | fix | Ground Truth |
| 62.1 | F-17 | A knock-out mid-raid no longer pays the raid out as a victory | S | fix | Ground Truth |
| 62.2 | F-02 | One world-solids list: huts and signpost stop everyone; trees and rocks steer walkers | M | fix | Ground Truth |
| 62.2 | F-13 | No 'glue' when walking at a cart you just grabbed | S | fix | Ground Truth |
| 62.3 | F-03 | Merchant team: one gait clock per frame, tails no longer charted as legs | S | fix | Ground Truth |
| 62.3 | F-04 | The merchant eases into his stall instead of turning in one frame | S | fix | Ground Truth |
| 62.4 | F-05 | Tourney Grounds card trees cut out instead of drawing white cards | M | fix | Ground Truth |
| 62.5 | F-06 | Crash boundaries and an error log (absorbs React #177) | M | robustness | Ground Truth |
| 63.1 | F-07 | Unit tests run inside the required CI job | S | robustness | Ground Truth |
| 63.2 | F-08a | Saves never fail silently: Save & Quit stays in game on failure; autosave retries | M | robustness | Ground Truth |
| 63.3 | F-08b | Tab-close flush, a shadow copy and a recovery slot; the clock stops dirtying the save | M | robustness | Ground Truth |
| 63.4 | F-09 | buildSave keeps a carried piece or keep, and stamps SAVE_VERSION | S | robustness | Ground Truth |
| 64.1 | F-10a | Input truth: the Collection Book key, rebind conflicts, hints that name your keys, a touch toggle that works | M | fix | Ground Truth |
| 64.2 | F-10b | Escape closes Options, Credits and Help; the music slider becomes 'Ambience' | S | fix | Ground Truth |
| 64.3 | F-11 | Blast kills name the right foe and hand over the purse; who fired decides the XP | S | fix | Ground Truth |
| 64.4 | F-12 | King Leo's 4th lore line shows the words its audio actually speaks | S | fix | Ground Truth |
| 64.5 | F-16 | The same-market haggle floor: buy-then-sell loops stop printing gold | S | fix | Ground Truth |
| 65.1 | F-14 | The world keeps living in build mode and behind panels | M | robustness | Ground Truth |
| 65.2 | F-15 | Destination hillsides walk smoothly; eye height stops trailing climbs | M | fix | Ground Truth |
| 65.3 | F-18 | Settlement residents stop filling the home roster | S | fix | Ground Truth |
| 66 | G-01 | Import the original bank through a tracked manifest, with an on-demand voice loader | M | foundation | Voices and Steel |
| 67 | G-36 | Socket sites: the keep's single socket model becomes a multi-site socket and section state | M | foundation | Walls That Hold |
| 68 | G-05 | Ruins and repair: battered pieces become repairable ruins | M | feature | Walls That Hold |
| 69 | G-02 | Keep walls stop people; the keep gatehouse opens and shuts | M | feature | Walls That Hold |
| 70.1 | G-03 | Raiders peel off to different sides, the ram comes by road, the ladder goes up where they are | M | feature | Walls That Hold |
| 70.2 | G-04 | Raids at any hour, announced by a horn; the day-rollover hook and the major-event arbiter | M | feature | Walls That Hold |
| 71 | G-06 | Plunder and pursuit: raiders strip your stores and run for the road | M | feature | Walls That Hold |
| 72 | G-08 | Arm the garrison: tiered weapons for defenders, a rally order and a pinned balance table | M | feature | Walls That Hold |
| 73 | G-07 | Lost raids: the garrison fights on while you are down, and a lost raid razes buildings | M | feature | Walls That Hold |
| 74 | G-09 | The cast finds its voice: Cedric's taunts, court barks, soldier voices, and subtitles | M | content | Voices and Steel |
| 75.1 | G-10 | Weapon-true fighting animation | M | feature | Voices and Steel |
| 75.2 | G-11 | Knockdowns: finishers, blasts and ram strikes knock enemies flat | M | feature | Voices and Steel |
| 76.1 | G-12a | Richard's Challenge I: the voiced campaign begins, and the minigames become Trials | M | content | Voices and Steel |
| 76.2 | G-12b | Richard's Challenges II-III: raise the wall; haul the cannon onto the platform | M | content | Voices and Steel |
| 76.3 | G-13 | Richard's Challenge IV: man the engines and bring down Cedric's tower | M | content | Voices and Steel |
| 76.4 | G-14a | Richard's Challenge V: build the King's Jail, the workshop's first set | M | content | Voices and Steel |
| 76.5 | G-14b | Richard's Challenge VI and Knighthood | M | content | Voices and Steel |
| 77.1 | G-15a | Outlaw hideouts grow and drive raid pressure | M | feature | Bandit Country |
| 77.2 | G-15b | Camps and castle-set strongholds stand in the world | M | feature | Bandit Country |
| 78.1 | G-16a | Storm a camp and burn it out | M | feature | Bandit Country |
| 78.2 | G-16b | Besiege a stronghold: siege train, mercenary crews, breach | M | feature | Bandit Country |
| 79.1 | G-17a | Nemesis captains | M | feature | Bandit Country |
| 79.2 | G-17b | Captain traits and trophies | M | feature | Bandit Country |
| 80.1 | G-18a | Take prisoners: bind the knocked-down and march them to a jail | M | feature | Bandit Country |
| 80.2 | G-18b | Jails that hold: a clanging door, prisoners in the cells, captured captains | M | feature | Bandit Country |
| 80.3 | G-19 | Prisoner fates: ransom, informants, reform, hand-over and jailbreaks | M | feature | Bandit Country |
| 81.1 | G-20 | Villagers eat from your stores | M | feature | A Living Realm |
| 81.2 | G-21 | Warmth and morale | M | feature | A Living Realm |
| 82 | G-22 | Civic buildings: the tavern and the infirmary | M | feature | A Living Realm |
| 83 | G-23 | Populations grow, at home and in settlements | M | feature | A Living Realm |
| 84 | G-25 | Ravens and the realm overview; Stats joins the menu | M | feature | A Living Realm |
| 85.1 | G-24a | Garrisons hold settlements while you are away; off-screen sieges | M | feature | A Living Realm |
| 85.2 | G-24b | Settlements lost and retaken | M | feature | A Living Realm |
| 86 | G-26 | Settlement town plans | M | feature | A Living Realm |
| 87.1 | G-28a | New errand goal kinds: escort, reach, protect, capture, timed delivery | M | foundation | The War of Two Houses |
| 87.2 | G-28b | Errands from the state of the realm; calling hooks | M | feature | The War of Two Houses |
| 88 | G-29 | Chronicle Act II: the Bull's war | M | content | The War of Two Houses |
| 89 | G-30 | The War of Two Houses: a realm control map | M | feature | The War of Two Houses |
| 90 | G-31 | Regional markets and the settlement charter | M | feature | The War of Two Houses |
| 91.1 | G-32a | The Rival Castle: a geometry probe, a breakable gate, and the siege | M | feature | The War of Two Houses |
| 91.2 | G-32b | Ladders over the baked walls; crossbows on the wall-walk | M | feature | The War of Two Houses |
| 92.1 | G-33a | Storm the courtyard and defeat the castellan | M | feature | The War of Two Houses |
| 92.2 | G-33b | The Rival Castle as a prize settlement | M | feature | The War of Two Houses |
| 93.1 | G-34a | Chronicle Act III: the decisive battle | M | feature | The War of Two Houses |
| 93.2 | G-34b | Three endings, an epilogue, and NG+ | M | content | The War of Two Houses |

65 PRs in all — sizes: 12 S, 53 M.

## The waves, and why each sits where it does

- **Wave 62.1 — A raid survives Options/Stats; a knock-out is not a victory** (F-01, F-17): BUG-8726 is a logged raid-loss bug. The knock-out payout is a closely related bug in the same director bookkeeping (raidActive with zero raiders), so the two share one PR. Module-level director state also makes every later raid wave testable in vitest.
- **Wave 62.2 — One world-solids list; no cart glue** (F-02, F-13): BUG-8614 is logged; OPEN-025 is a logged two-id skip in the same collide.ts building loop. The shared solids module is what keep walls, strongholds and the Rival Castle plug into.
- **Wave 62.3 — Merchant team gait and turn** (F-03, F-04): Two small, closely related logged bugs on the same merchant.
- **Wave 62.4 — Tourney Grounds card trees** (F-05): A logged visual bug whose fix depends on what the probe finds, so it ships alone.
- **Wave 62.5 — Crash boundaries and an error log (absorbs BUG-8746)** (F-06): Closes the last logged bug the way the brief asks; every later probe then captures page errors in context.
- **Wave 63.1 — Unit tests in the required CI job** (F-07): About 535 tests protect nothing while auto-merge ignores them. Placed inside the required job, the step gates the ~55 PRs that follow.
- **Wave 63.2 — Saves never fail silently** (F-08a): A failed Save & Quit discards the session today: the worst data-loss defect.
- **Wave 63.3 — Tab-close flush, shadow copy and recovery slot** (F-08b): Needs F-08a's result type. It also carries the OD-12 clock change, which is only safe once a tab-close flush exists, and the recovery slot F-06's boundaries write to.
- **Wave 63.4 — buildSave correctness** (F-09): Both defects live in buildSave and must be fixed before the plan adds save fields (sites, hideouts, captains, prisoners, control).
- **Wave 64.1 — Input truth: Collection Book key, conflicts, hints, touch toggle** (F-10a): The Collection Book has had no working key since KeyG was double-bound; hints that name the wrong key are the same defect seen from the other side.
- **Wave 64.2 — Escape closes the stack screens; the Ambience slider** (F-10b): 'Esc to close' is a promise the screens do not keep. The slider rename (OD-13) rides along in the same file.
- **Wave 64.3 — Blast kills named and paid by who fired** (F-11): 'Bandit blasted!' for Cedric is a plain bug, and engines matter far more once raids, the campaign and sieges land.
- **Wave 64.4 — King Leo's 4th lore line** (F-12): A confirmed text/audio mismatch; its committed transcript table is what G-01 and G-09 check every pairing against.
- **Wave 64.5 — The same-market haggle floor** (F-16): High Wit prints gold today. Fixing it now (OD-07) instead of at the markets wave closes a 25-PR exploit window and gives G-31 a test to keep green.
- **Wave 65.1 — The world keeps living in build mode** (F-14): Crops freezing in build mode reads as a bug, and village hunger (G-20) must not freeze there either (OD-08).
- **Wave 65.2 — Destination hillsides** (F-15): The live terrain-feel pair, met on every walk at a destination; rescoped to a classifier that works on merged bakes.
- **Wave 65.3 — Settlement residents stop filling the home roster** (F-18): Founding all three settlements already blocks every home arrival and recruitment; population growth (G-23) and reformed prisoners (G-19) stand on a per-world count.
- **Wave 66 — Import the original bank through a tracked manifest** (G-01): Retires the asset risk early and ships the trebuchet and ram sounds at once; voices, combat animation, the campaign, jail and civic buildings all build on it.
- **Wave 67 — Socket sites: one multi-site socket and section model** (G-36): The owner's siege restructure: the singleton keep becomes one site among many, so ruins, solid walls, strongholds, town plans and the Rival Castle all share one state, one helper and one damage path.
- **Wave 68 — Ruins and repair** (G-05): Raiders already batter keep parts today and a knocked-down piece is deleted at a half refund. Under harsh raids (OD-02) recoverable damage must land BEFORE walls become solid and battering becomes the standard raider plan.
- **Wave 69 — Keep walls stop people; the gatehouse opens and shuts** (G-02): The biggest gap in what the castle means (OD-01), built on F-02's solids, G-36's helper and G-05's breach semantics.
- **Wave 70.1 — Raiders choose sides; the ram comes by road; the ladder goes up where they are** (G-03): Once walls block, the approach side, the ram's route and the ladder's placement decide the fight.
- **Wave 70.2 — Raids at any hour, after a horn; the day-rollover hook and event arbiter** (G-04): Same director. Raids outside dusk are fair only once they come legibly by road with a warning; the day hook and arbiter it adds are reused by hideouts, garrisons and sieges.
- **Wave 71 — Plunder and pursuit** (G-06): Uncapped theft (OD-02) lands once walls, sides, warnings and repair exist to answer it.
- **Wave 72 — Arm the garrison and rally it** (G-08): Harsher raids need a forge-to-garrison answer, and its pinned balance table is what G-07's resolver reads, so it comes first.
- **Wave 73 — Lost raids: the knock-out resolver and razed buildings** (G-07): Closes the arc with OD-02's harsh consequence. Its resolver is reused by settlement garrisons (G-24a) and its outcomes promote captains (G-17a).
- **Wave 74 — The cast finds its voice** (G-09): Uses G-01's loader and F-12's transcript table; Cedric's taunts land on the newly varied raids.
- **Wave 75.1 — Weapon-true fighting** (G-10): The first visible use of G-01's clips, across every fight.
- **Wave 75.2 — Knockdowns** (G-11): Adds the knocked state prisoner capture (G-18a) needs.
- **Wave 76.1 — Richard's Challenge I and the Trials entry** (G-12a): The voiced campaign becomes the grounds' main mode (OD-03) once voices and the runner's assets exist.
- **Wave 76.2 — Richard's Challenges II-III: the wall and the cannon platform** (G-12b): Two build-and-place objectives on the same runner.
- **Wave 76.3 — Richard's Challenge IV: shoot down Cedric's tower** (G-13): Proves crewed engines at a scoped destination, which the stronghold siege and the Rival Castle reuse.
- **Wave 76.4 — Richard's Challenge V: the King's Jail, the workshop's first set** (G-14a): OD-10: the campaign's jail is the workshop's starter set.
- **Wave 76.5 — Richard's Challenge VI and Knighthood** (G-14b): Completes the campaign with a non-rank ceremony.
- **Wave 77.1 — Outlaw hideouts grow and drive raid pressure** (G-15a): Raids get a source once the home raid loop is solid; feeds G-04's probability function through its day hook.
- **Wave 77.2 — Camps and castle-set strongholds in the world** (G-15b): The first non-home socket sites: rendered and solid at a destination, the target the siege waves need.
- **Wave 78.1 — Storm a camp and burn it** (G-16a): The player's answer to hideouts, and the attacker-side runner reused by settlement retakes and the Rival Castle courtyard.
- **Wave 78.2 — Besiege a stronghold: siege train, mercenary crews, breach** (G-16b): The first siege (owner's choice): engines finally attack, on G-13's destination crew work and G-15b's breakable sections.
- **Wave 79.1 — Nemesis captains** (G-17a): Raid leaders now come from hideouts, so they can persist; promotion reads G-07's outcomes.
- **Wave 79.2 — Captain traits and trophies** (G-17b): Makes each captain a distinct fight and a remembered kill.
- **Wave 80.1 — Take prisoners** (G-18a): Uses G-11's knocked state; jails already exist as buildables, with Richard's jail as one more.
- **Wave 80.2 — Jails that hold: door, cells, captured captains** (G-18b): Presents prisoners and moves captain capture here from G-17.
- **Wave 80.3 — Prisoner fates and jailbreaks** (G-19): Connects prisoners to gold, scouting, allegiance and population (on F-18's per-world roster).
- **Wave 81.1 — Villagers eat** (G-20): Gives farming, fishing and cooking a consumer; the base morale builds on.
- **Wave 81.2 — Warmth and morale** (G-21): A saved morale that raids, hunger and fires move, re-pinning G-08's table.
- **Wave 82 — Tavern and infirmary** (G-22): Services that restore what G-20/G-21 drain; the tavern's arrival bonus feeds G-23.
- **Wave 83 — Populations grow, at home and in settlements** (G-23): Food, beds, morale and the tavern now exist to drive arrivals.
- **Wave 84 — Ravens and the realm overview; Stats joins the menu** (G-25): Moved before garrisons so G-24's raven warnings write straight into the dispatch log; caravans, hideouts and jailbreaks already produce dispatches.
- **Wave 85.1 — Garrisons hold settlements; off-screen sieges** (G-24a): Growing settlements under hideout pressure need defending; reuses G-07's resolver and G-08's table.
- **Wave 85.2 — Settlements lost and retaken** (G-24b): OD-05's second half, built on G-16a's attacker runner.
- **Wave 86 — Settlement town plans** (G-26): Settlements now have people, garrisons and stakes; plans are G-36 sites at destinations.
- **Wave 87.1 — New errand goal kinds** (G-28a): Acts II and III need escort, reach, protect, capture and timed goals.
- **Wave 87.2 — Errands from the state of the realm; calling hooks** (G-28b): The generator reads hideouts, sieges and unbuilt plots, all shipped by now.
- **Wave 88 — Chronicle Act II** (G-29): Ties the existing climaxes and the new raid, bandit and settlement systems into a story.
- **Wave 89 — The realm control map** (G-30): Fed by hideouts, prisoners, garrisons and errands.
- **Wave 90 — Regional markets and the charter** (G-31): Control now bends local prices; F-16's floor stays green per market.
- **Wave 91.1 — The Rival Castle: geometry probe, breakable gate, siege** (G-32a): The war's climax siege, on G-16b's siege train and G-36 sections, after the probe says where the bake allows them.
- **Wave 91.2 — Ladders over the baked walls; crossbows on the wall-walk** (G-32b): The way in where the bake cannot break.
- **Wave 92.1 — Storm the courtyard; the castellan** (G-33a): Finishes the assault with a bespoke boss fight.
- **Wave 92.2 — The Rival Castle as a prize settlement** (G-33b): Turns victory into a holding on the control map.
- **Wave 93.1 — Act III: the decisive battle** (G-34a): The story's ingredients (control, garrisons abroad, siege) have shipped.
- **Wave 93.2 — Three endings, epilogue, NG+** (G-34b): Closes the chronicle (OD-16); free play continues.

## Items

Grouped by arc, in wave order within each arc (the table above gives the order they ship in). Every file:line below was read on `main` at 74a9dd3 (2026-10-31). Re-check before relying on one: each wave starts by researching its item against the code as it then is.

### Arc: Ground Truth

#### F-01 — A raid survives Options/Stats: director counters move out of Enemies refs

*Wave 62.1 · S · fix*

**What it gives.** Opening Options or Stats mid-raid no longer forgets the raid. Coming back within dusk no longer starts a second one, the raid pays out once, and the ram and ladder stand down. Loading a save while the scene is mounted no longer carries a stale raid flag over.

**Scope.** New src/game/directors/state.ts holds tick, skelTimer, raidCooldown, raidActive, campGuardTimer and a raidLost flag (used by F-17) as module {current} cells. Enemies.tsx passes them to raidDirector/nightSkeletonDirector/campGuardDirector unchanged; they reset in an onSessionReset hook (sessionHooks.ts:16), not on mount. exposeDebug('__kkdirectors') keeps the same shapes. Measure on main first whether the enemy store survives the remount; the resolve step handles 'active with zero raiders' explicitly (raidLost decides lost vs won). Ships in one PR with F-17. Out of scope: the any-hour window (G-04) and Stats in MenuTabs (G-25).

**Builds on.** src/components/combat/Enemies.tsx:118-122 (refs), :125-127 (__kkdirectors), :144; src/components/App.tsx:55-64 (screen swap unmounts the scene); src/game/directors/raidDirector.ts:65-92; src/game/store/sessionHooks.ts:16 onSessionReset

**Depends on.** nothing in this plan

**Risk.** Low. nightSkeletons and campGuards relied on reset-on-mount; check each against the reset hook.

**Verification.** vitest: raidDirector with the module cells across a simulated remount (state kept) and a session reset (state cleared). Live probe on production builds of main and the change: time 0.71, raid starts, pause, open Options, back, resume, kill raiders via hooks. Expect one 'beaten back' notify, rewards once, ram/ladder inactive, no second raid on the change; measure main's failure first.

**Sources.** BUG-8726

#### F-17 — A knock-out mid-raid no longer pays the raid out as a victory

*Wave 62.1 · S · fix*

**What it gives.** Getting knocked out during a home raid no longer earns the 'beaten back' rewards on the next tick. The raid ends as lost, with no payout, until G-07 adds the real consequences.

**Scope.** playerDamage.ts:131-145 clears useEnemyStore and jumps to dawn (time 0.27) but leaves raidActive set, so raidDirector.ts:65-82 pays the win next tick (plank 4, stone 4, iron_ore 2, 60 combat XP, 40% Armory drop). The home knock-out path sets F-01's raidLost cell; the resolve step pays nothing, notifies 'The raiders had the field', clears raidActive and starts the cooldown. Away knock-outs unchanged. Shares 62.1's PR with F-01 (same cells). Out of scope: losses (G-07).

**Builds on.** src/game/combat/playerDamage.ts:131-145; src/game/directors/raidDirector.ts:65-82; src/game/directors/state.ts (F-01)

**Depends on.** F-01 (wave 62.1)

**Risk.** Low.

**Verification.** vitest: a raid with raidLost set resolves with no rewards and starts the cooldown. Live on production builds of main and the change: start a raid, set player HP 0 via hook, read inventory/XP deltas after dawn (win rewards on main, none on the change).

**Owner decision.** OD-02 (raid stakes, HARSH): this interim fix only removes the false reward; harsh losses arrive with G-07.

**Sources.** verifier G-07: knock-out pays the raid win (raidDirector.ts:65-82)

#### F-02 — One world-solids list: huts and signpost stop everyone; trees and rocks steer walkers

*Wave 62.2 · M · fix*

**What it gives.** The village huts and the signpost become solid for the player, villagers and raiders, and block arrows. Walkers steer around trees and rocks. Every reader of 'what stops a walker' starts from one list, keyed by world, which later waves extend to keep walls, strongholds and the Rival Castle.

**Scope.** Extend src/game/fixedSolids.ts with an oriented-box kind (huts at yaw 0.2pi and 1.3pi) and a circle kind, and a per-world key (home only for now). Move wideSolids' drawn boxes in; wideSolids keeps feeding the merchant's wide mask from the shared list. Consumers: collide.ts OBB push-out beside its :170 loop; grid.ts rebuild (:459-510) rasterises each OBB grown by AGENT_RADIUS (:42), keyed by identity like builtFixed; lineOfSight.ts tests the OBBs. Trees and rocks become steering circles; they enter the blocked mask only if a measurement shows nearestWalkable (grid.ts:613) still lands gatherers within reach. Measure Alric's (-40,38) and Beda's (-35,42) cells with huts stamped first. Ships with F-13. Out of scope: keep sockets (G-02).

**Builds on.** src/game/data/world.ts:121-123 (SIGNPOST), :129-134 (VILLAGE_HUTS); src/game/playerPhysics/collide.ts:170, :221; src/game/nav/grid.ts:42, :459-510, :516-545, :613 nearestWalkable; src/game/nav/lineOfSight.ts:54-63; src/game/fixedSolids.ts:37-50; src/game/nav/wideSolids.ts:20-46; data/cast/village.ts:20

**Depends on.** nothing in this plan

**Risk.** Growing boxes by 0.55 m on a 1 m grid could swallow Alric's or Beda's cells or gatherers' approach cells; measure first, fallback is nudging their posts.

**Verification.** vitest (nav.test.ts): isWalkable false at each hut centre and the signpost, true at Alric's and Beda's spots; collide() pushes out of a turned hut; LOS blocked through a hut. Live: cart_road_probe.mjs on production builds of main and the change samples Alric, Beda, villagers and raiders against hut boxes (0 inside on the change); walk the player into a hut and the signpost.

**Sources.** BUG-8614, idea: Defence Engineering 2.0: walls that hold, fronts that matter

#### F-13 — No 'glue' when walking at a cart you just grabbed

*Wave 62.2 · S · fix*

**What it gives.** Walking into a cart you are pushing or have hitched no longer pins you against its stale saved position.

**Scope.** collide.ts's building loop (:167-200) tests collisionBoxesFor at the stored b.x/b.z before locomotion.ts:185-196 writes cartLivePos. Skip b.id === cartState.pushingId || hitchedId, since the player drives that cart. Ships in F-02's PR (same loop). Note honestly: the nav grid and raiders still meet the stale stored box until settleCart, because cartLivePos is read only by Buildings.tsx, carts.ts, locomotion.ts and buildSlice.ts; that stays out of scope, as does per-instance cart scale (OPEN-060).

**Builds on.** src/game/playerPhysics/collide.ts:167-200; src/game/playerPhysics/locomotion.ts:179, :185-196 cartLivePos; src/game/carts.ts:15-19

**Depends on.** F-02 (wave 62.2)

**Risk.** Low.

**Verification.** vitest: collide() with a pushed cart at a stale b.x/b.z does not push the player. Live on production builds of main and the change: grab a cart, walk 2 m, sample displacement (stuck on main, moving on the change).

**Sources.** OPEN-025

#### F-03 — Merchant team: one gait clock per frame, tails no longer charted as legs

*Wave 62.3 · S · fix*

**What it gives.** The merchant's two-horse team walks at the same cadence as a lone horse, and its tails swish instead of kicking like hind legs.

**Scope.** Hoist one gait.current advance above the standalone and team blocks in RiggedProp.tsx as a pure helper. part_roles.json is generated and gitignored, so add a per-asset override table in src/lib/rigParts.ts partRolesFor for oc6095b3: 056_shape23/098_shape40 tails, 041_shape17/083_shape36 BR upper legs, 044_shape19/086_shape38 BR lower legs. Per-side tail swish mirroring :236-240. Out of scope: clip-driven gaits (deferred with G-35).

**Builds on.** src/components/world/RiggedProp.tsx:213-214, :236-240, :254-255; src/lib/rigParts.ts:4, :32 partRolesFor; src/lib/propRig.ts:107-108; src/game/merchantTeam.ts

**Depends on.** nothing in this plan

**Risk.** Low; key the override by asset id and test the lookup, not the JSON.

**Verification.** vitest: partRolesFor('oc6095b3') returns the corrected roles; the gait helper advances once per frame. Live on production builds of main and the change: leg rotation.x over 2 s for the team and a lone horse at equal gaitSpeed (same frequency on the change, double on main); GPU screenshot of the team.

**Sources.** BUG-8640

#### F-04 — The merchant eases into his stall instead of turning in one frame

*Wave 62.3 · S · fix*

**What it gives.** When his trading window opens, the merchant walks the last half metre and turns smoothly instead of snapping 155 degrees in a frame.

**Scope.** In Merchant.tsx's 'present' branch replace the snap with a clamped walk to MERCHANT_SPOT (about 0.5 s) and yaw easing wrapAngle(diff)*min(1, dt*3); pin s.x/s.z within 1 cm so putOnSchedule and save/reload are unchanged. findTarget and the Minimap already use the constant spot. Out of scope: schedule changes.

**Builds on.** src/components/world/Merchant.tsx:305-312, :336, :362-364; src/game/data/merchantDay.ts:77 WALK_STOP; src/game/interaction/findTarget.ts:700; src/components/hud/Minimap.tsx:355

**Depends on.** nothing in this plan

**Risk.** Low; the towed team must follow without a jump.

**Verification.** vitest on the easing helper. Live with cart_road_probe.mjs on production builds of main and the change: yaw delta between last walk sample and first window samples (about 155 degrees in one frame on main, under 10 per frame on the change); no jump over 0.05 m per frame for merchant or team.

**Sources.** BUG-8657

#### F-05 — Tourney Grounds card trees cut out instead of drawing white cards

*Wave 62.4 · M · fix*

**What it gives.** Card trees at the Tourney Grounds show their foliage outline instead of opaque white rectangles, and any other destination with the same fault is fixed in the same pass.

**Scope.** Investigate first: extend cln22_cards_probe.mjs at template-02 to record, per thin textured mesh, its loader (template bake, TemplatePopulation PropModel or setBuild), material, texture source and whether the image has alpha below 1. Fix in that loader's normalisation: alphaTest 0.5 with transparent false if the texture has alpha; if it is a greyscale mask like l606400, lift PropModel's fixAlphaMasks into a shared src/lib helper applied by asset id or material name. Run the probe on all 14 destinations. Out of scope: new textures.

**Builds on.** src/components/world/PropModel.tsx:21 ALPHA_MASK_ASSETS, :23-50 fixAlphaMasks, :97; src/components/world/TemplateWorld.tsx; src/lib/setBuild.ts:93; src/lib/propRig.ts:174; src/game/data/worlds.ts:213-215

**Depends on.** nothing in this plan

**Risk.** Unknown loader until the probe runs; a blanket alphaTest could punch holes in glass or water, so key by asset or material.

**Verification.** vitest on the shared alpha-mask helper. Probe count of opaque thin textured tree meshes drops to 0 on the change across 14 destinations. GPU screenshots (--headless=new --use-angle=d3d11 --mute-audio) of fence_from_richard and main_template-02 on production builds of main and the change.

**Sources.** BUG-8219

#### F-06 — Crash boundaries and an error log (absorbs React #177)

*Wave 62.5 · M · robustness*

**What it gives.** A broken panel closes itself with a notice instead of white-screening the game. A scene crash shows a card saying the world failed and the last autosave is safe, with Reload. Every error is logged with its stack, so the React #177 seen once is caught in context next time.

**Scope.** (1) src/app/error.tsx and global-error.tsx with reload. (2) Class ErrorBoundary around the Canvas subtree (GameScreen.tsx:210) and the panel dispatcher (Panels.tsx:29); the boundary calls a recovery-writer hook that is a no-op until F-08b fills it. (3) window error/unhandledrejection ring buffer (last 20) in localStorage via exposeDebug('__kkerrors'), plus crash-test hooks that throw in a panel and in a useFrame. (4) pageerror listener in the standard smoke probe. (5) BUG-8746: run cln26_probe.mjs a few times on a development build for #177's unminified message; fix a named component here (suspect setState in useFrame, Merchant.tsx:311-312, 371-379), else close as 'captured on recurrence'. (6) OD-17 ride-along: delete the dead 'commands' PanelId member (OPEN-079, uiSlice.ts:13). Out of scope: the recovery slot and restore flow (moved to F-08b), external telemetry.

**Builds on.** src/components/stacks/GameScreen.tsx:210; src/components/hud/Panels.tsx:29; src/lib/debugHooks.ts:9-10 exposeDebug; src/game/store/slices/uiSlice.ts:13 PanelId; src/components/world/Merchant.tsx:311-312, 371-379

**Depends on.** nothing in this plan

**Risk.** Errors inside R3F's reconciler or useFrame may bypass a DOM boundary outside Canvas; the window logger catches those, test both placements.

**Verification.** vitest: the boundary renders its fallback and calls the recovery hook, never the main save key; the ring buffer caps at 20. Live on production builds of main and the change: fire the panel throw (panel closes, game continues on the change; main white-screens) and the useFrame throw (card shows on the change); __kkerrors holds the stack.

**Owner decision.** OD-14 (R, keep debug hooks in production): the crash-test hook must be reachable on the production build the probe runs against. OD-17 (R): the dead 'commands' PanelId is deleted here.

**Sources.** GAP-error-boundaries, BUG-8746, OPEN-079

#### F-07 — Unit tests run inside the required CI job

*Wave 63.1 · S · robustness*

**What it gives.** The roughly 535 vitest cases run on every PR and gate auto-merge at once, so no wave can merge a regression the tests already catch.

**Scope.** Add `npm run test:unit` (package.json:12, vitest run) as a step inside the existing `verify` job named 'Typecheck & build' (.github/workflows/ci.yml:62), after tsc (:81). Ruleset 19820810 already requires that check, so the step gates the moment it merges; no settings change is needed. Update vitest.config.ts's header (it says tests are deliberately not a CI gate). Little quarantine work is expected: no test reads public/assets, the only fs test (src/lib/server/db.test.ts) uses os.tmpdir(), no locale/timezone use; vite ^7.3.6 needs Node ^20.19, which setup-node '20' resolves. Out of scope: ESLint and browser tests in CI.

**Builds on.** .github/workflows/ci.yml:62 (job verify), :75 npm ci, :81 tsc, :88 next build; package.json:12; vitest.config.ts (src/**/*.test.ts, environment node)

**Depends on.** nothing in this plan

**Risk.** Low; a Linux-only failure would surface on the PR's own run.

**Verification.** The PR's own CI run shows the step passing inside 'Typecheck & build'. A throwaway commit breaking one assertion fails the job; revert before merge.

**Owner decision.** OD-11 (R): unit tests run as a step inside the existing required job, so they gate auto-merge at once.

**Sources.** Q-vitest-in-ci

#### F-08a — Saves never fail silently: Save & Quit stays in game on failure; autosave retries

*Wave 63.2 · M · robustness*

**What it gives.** If a save fails (server down, too large, storage full), the player is told and nothing is thrown away. Save & Quit keeps them in game with Retry or Quit without saving, and the autosave shows a 'Not saved, retrying' chip. Part a of the L item F-08.

**Scope.** persistSave returns {ok, problem} mirroring fetchSave's SaveResult (save.ts:28-45) instead of a bare boolean with .catch(() => null) (:21). The 20 s autosave (GameScreen.tsx:178-187) shows a persistent HUD chip on failure and retries with capped backoff from a single timer (no stacked intervals). saveAndQuit (:195-203) calls resetTo('menu') (:202) only on ok; otherwise a Retry / Quit-without-saving dialog. Out of scope: tab-close flush and the clock-dirty change (F-08b), save slots (OPEN-090).

**Builds on.** src/lib/save.ts:8-23, :21, :28-45; src/components/stacks/GameScreen.tsx:178-187, :195-203, :202; src/app/api/save/route.ts (GET :9, PUT :19, 413 via MAX_SAVE_LENGTH saveSchema.ts:15)

**Depends on.** nothing in this plan

**Risk.** Backoff must not hammer a server that is down.

**Verification.** vitest: persistSave reports ok/problem for a stubbed 500, a 413 and QuotaExceeded; the saveAndQuit decision helper does not reset on failure; backoff never stacks timers. Live on production builds of main and the change: route /api/save to 500 and press Save & Quit (main lands on the menu; the change stays with the dialog and chip); fill localStorage as a guest and see the chip.

**Sources.** GAP-save-failure-feedback

#### F-08b — Tab-close flush, a shadow copy and a recovery slot; the clock stops dirtying the save

*Wave 63.3 · M · robustness*

**What it gives.** Closing the tab never loses play: guests are flushed synchronously, signed-in players get a local shadow copy that is reconciled next load. A crashed session leaves a recovery snapshot the menu offers to restore. The clock no longer marks the save dirty every 2 s, so server writes drop sharply. Part b of F-08.

**Scope.** (1) pagehide/visibilitychange flush: guests write localStorage synchronously; signed-in players write a per-account localStorage shadow copy and, when the payload is under about 60 KiB, a same-origin sendBeacon to a new POST handler on /api/save with PUT's auth and MAX_SAVE_LENGTH checks. fetch keepalive is NOT a fallback (it shares the same ~64 KiB in-flight quota). (2) At the next fetchSave, a shadow newer than the server copy that validates through parseSave is adopted and pushed. (3) Recovery slot: F-06's boundaries write a toSave() snapshot to a separate key; the main menu offers 'Restore recovered session' when it is newer, validated through parseSave and never auto-loaded. (4) OD-12: DayNight.tsx:128's setTimeOfDay stops setting dirty (worldSlice.ts:220); time is written with any other change, at Save & Quit and in this flush. Measure a mature save's size during the probe.

**Builds on.** src/lib/save.ts:8-45; src/app/api/save/route.ts; src/lib/saveSchema.ts:15, parseSave; src/components/world/DayNight.tsx:128; src/game/store/slices/worldSlice.ts:220; F-06's recovery hook

**Depends on.** F-08a (wave 63.2), F-06 (wave 62.5)

**Risk.** Shadow reconciliation must never adopt an older or invalid copy; compare savedAt and validate.

**Verification.** vitest: the flush writer picks localStorage vs beacon by size; reconcile adopts only a newer valid shadow; the clock no longer dirties; the recovery snapshot never touches the main key. Live on production builds of main and the change: dispatch pagehide and confirm the write lands; crash via F-06's hook, return to menu and see the restore offer; count /api/save writes over 2 minutes idle (far fewer on the change).

**Owner decision.** OD-12 (R): the clock mirror stops marking the save dirty; time is still written with any other change, at Save & Quit and in this flush.

**Sources.** GAP-save-failure-feedback, Q-autosave-cadence

#### F-09 — buildSave keeps a carried piece or keep, and stamps SAVE_VERSION

*Wave 63.4 · S · robustness*

**What it gives.** An autosave that fires while the player carries a building or the whole Grand Keep no longer loses it if the tab then closes or crashes: it comes back where it was picked up. Saves stamp the real schema version, so the first breaking change can migrate.

**Scope.** In toSave/buildSave, write movingBuilding back into buildings at its original x/z, and rebuild the keep from carriedKeepExtra as cancelMove does ({x: mv.x, z: mv.z, ...extra}, buildSlice.ts:584-597). buildUndo is module state (store/storeCounters.ts), not PersistedState, so pass carriedKeepExtra through SaveLeaves. Only the serialised copy is patched. Replace the literal { version: 1 } (persistence.ts:238-239) with SAVE_VERSION, widen SaveGame.version to number (types/save.ts:41), add an empty migrations table keyed by version in saveSchema.ts with a test, and fix the wrong UNPERSISTED_SAVE_KEYS comment (persistence.ts:35). OD-17 ride-along: delete the dead stabled/mounts store copies (the riding.ts leaf module stays the live truth, persistence.ts:137-141, sessionSlice.ts:76-84) and document SaveGame.playerPos as optional.

**Builds on.** src/game/store/slices/buildSlice.ts:100-101, :570-582, :584-597; src/game/store/slices/keepSlice.ts:168-184, :175; src/game/store/persistence.ts:35, :137-141, :238-239; src/game/types/save.ts:41, :82-87; src/lib/saveSchema.ts:11, :36-39

**Depends on.** nothing in this plan

**Risk.** Low. Restore from the original x/z, never the ghost; the live carry must not duplicate when placed.

**Verification.** Persistence vitest: pick up a building and a composed keep, toSave(), both present at original positions (sockets and HP equal) while live state shows them carried; buildSave stamps SAVE_VERSION; parseSave runs a stub migration in order. Live on production builds of main and the change: pick up the keep, force an autosave via hook, reload; keep present on the change, gone on main.

**Owner decision.** OD-17 (R): the dead stabled/mounts store copies are deleted here; playerPos stays optional and documented.

**Sources.** Q-save-mid-carry, brief: buildSave stamps a literal version 1 (GAP-save-versioning itself is closed)

#### F-10a — Input truth: the Collection Book key, rebind conflicts, hints that name your keys, a touch toggle that works

*Wave 64.1 · M · fix*

**What it gives.** The Collection Book opens from its own key again, a rebind that collides is flagged, and every hint, help line and menu tab names the player's actual binding and device. The touch-control toggle really forces touch controls.

**Scope.** Bestiary defaults to KeyO (keybinds.ts:80; KeyO is free of the build hotkeys R [ ] U Q E F X G in src/components/build/useBuildHotkeys.ts:56-102); stored settings migrate only where bestiary === emotes (appStore.ts:147 merges stored maps, :206 writes the whole map). OptionsStack's rebind row shows a conflict warning naming the other action. interactLabel/clickHoldLabel (inputMode.ts:48, :58) take the keybind map (interactLabel returns a hard-coded 'E' today); SWAP_HINT (melee.ts:66-72), HelpStack strings (:20-59, including :25's wrong 'hold E' to gather) and MenuTabs hints (:10-16) are built from them and codeLabel (keybinds.ts:96). TouchControls honours settings.inputMode (TouchControls.tsx:42-43 uses only detectTouch). Out of scope: an accessibility pass (GAP-a11y, deferred).

**Builds on.** src/game/data/keybinds.ts:76, :80, :91, :96; src/components/stacks/GameScreen.tsx:81; src/game/store/appStore.ts:147, :206; src/components/stacks/OptionsStack.tsx; src/game/inputMode.ts:48, :52-58; src/game/combat/melee.ts:66-72; src/components/stacks/HelpStack.tsx:20-59; src/components/hud/MenuTabs.tsx:10-16; src/components/hud/TouchControls.tsx:42-43, :61

**Depends on.** nothing in this plan

**Risk.** The migration must not overwrite a deliberate rebind; it touches only the exact collision. Static hint tables become functions of the keybind map.

**Verification.** vitest: no two default play-mode bindings share a code; the migration splits a stored collision only; hint strings follow inputMode and rebinds. Live on production builds of main and the change: O opens the bestiary on the change, G opens emotes on both; rebinding interact changes SWAP_HINT and the help text; forcing touch mode shows touch controls on desktop.

**Sources.** Q-keybind-collision, OPEN-085, OPEN-084

#### F-10b — Escape closes Options, Credits and Help; the music slider becomes 'Ambience'

*Wave 64.2 · S · fix*

**What it gives.** 'Esc to close' finally works on the stack screens, and the slider stops promising music the game does not have.

**Scope.** A shared useStackEscape hook pops Options, Credits and Help unless isRebindListening() (keybinds.ts:91); OptionsStack handles Escape only while listening today (:47, :90-93) and HelpStack.tsx:80, CreditsStack.tsx:47 have only Back. Stats is left to G-25, which moves it into MenuTabs. Relabel the 'Music & ambience' slider (OptionsStack.tsx:218) to 'Ambience'. Out of scope: Stats.

**Builds on.** src/components/stacks/OptionsStack.tsx:47, :90-93, :201, :218; src/components/stacks/HelpStack.tsx:80; src/components/stacks/CreditsStack.tsx:47; src/game/data/keybinds.ts:91

**Depends on.** nothing in this plan

**Risk.** Low; Escape must not fire while a rebind listens.

**Verification.** vitest: the hook pops unless listening. Live on production builds of main and the change: Escape pops Options, Credits and Help on the change only; a rebind of Escape still works; the slider reads 'Ambience'.

**Owner decision.** OD-13 (R): ambience-only is ratified; the slider is renamed 'Ambience'.

**Sources.** OPEN-078, OPEN-103

#### F-11 — Blast kills name the right foe and hand over the purse; who fired decides the XP

*Wave 64.3 · S · fix*

**What it gives.** A cannonball that kills Cedric says 'Cedric blasted!', every blast kill drops its purse, and a shot the player fired or a charge the player placed earns full XP and can end Cedric's final stand. Automatic emplacements pay the purse at today's lower XP.

**Scope.** aimYaw does not mean crewed: the automated emplacement passes one (Emplacements.tsx:88-90) and the player's interact passes none (performAction.ts:197-198), so the siege.ts:84-86 docstring is wrong. Add an explicit byPlayer argument to fireCannon (siege.ts:87), stored on the Cannonball and read by explodeBall's resolveEnemyKill (:126): true from locomotion.ts:99 (crewed) and performAction.ts:198, false from Emplacements.tsx:90 (including villager-manned posts, Emplacements.tsx:85, which count as automatic). Every charge is player-placed, so charges always pay full (performAction.ts:199-201 and the proximity trigger Emplacements.tsx:59-61). In kill.ts RULES (cannonball and charge rows, ~:63-70) the line uses KIND_LABEL and the purse always drops; KIND_XP and finalStand credit only when byPlayer or a charge. Arena tally stays false. Update kill.test.ts:158-169. Out of scope: siege ammunition (deferred).

**Builds on.** src/game/combat/kill.ts:16-30 KillCause, ~:63-70 RULES; src/game/siege.ts:84-87, :126, :152, :163; src/game/playerPhysics/locomotion.ts:99; src/game/interaction/performAction.ts:197-201; src/components/world/Emplacements.tsx:59-61, :85-90; src/game/combat/kill.test.ts:158-169

**Depends on.** nothing in this plan

**Risk.** Low; XP shifts only for player shots and charges.

**Verification.** kill.test.ts rows for byPlayer vs automated cannonballs and charges across kinds (Cedric, royal knight, skeleton): line text, purse, XP, finalStand. Live on production builds of main and the change: fire a crewed cannon at a debug-spawned Cedric and read notify text, XP delta and purse; let an emplacement kill a bandit and read its line and purse.

**Owner decision.** OD-04 (A): split by who fired; crewed shots and player-placed charges pay full XP, purse and final-stand credit; automatic emplacements pay the purse with the right name at today's lower XP.

**Sources.** DEC-7147, Q-blast-kill-rewards

#### F-12 — King Leo's 4th lore line shows the words its audio actually speaks

*Wave 64.4 · S · fix*

**What it gives.** King Leo stops showing Richard's 'Did you keep up alright? ... the evil Cedric the Bull' over a recording that says 'Ignore Cedric! Let me see Richard's new recruit!'.

**Scope.** court.ts:39's text is c1s01t4a's transcript, but prepare-assets.mjs:249 copies challenge1/c1s04t1a.wav to lore_richard_cedric.wav. Change the line to c1s04t1a's transcript. Add a committed table (src/game/data) of the source transcript for each lore audio id, generated once from the sibling texts (CI cannot read them), and a vitest that each loreLines text equals its transcript after normalising Windows-1252 apostrophes (0x92), double and trailing spaces, with one explicit exception for c1s04t2a's stutter ('Do do you like my castle?' vs court.ts:36). The other 10 pairs already match. The audio id stays misnamed (renaming touches the gitignored script). The owner confirms by ear once. Out of scope: new lines (G-09).

**Builds on.** src/game/data/cast/court.ts:35-40, :85-87, :144-146, :151; scripts/prepare-assets.mjs:241-253 (gitignored); sibling pak/system/challenges/texts/challenge1/c1s01t4a.txt, c1s04t1a.txt, c1s04t2a.txt

**Depends on.** nothing in this plan

**Risk.** Low; the normaliser must be strict without being brittle.

**Verification.** vitest: every court lore line matches its committed transcript under the normaliser. Dialogue-panel screenshot on the change. The owner listens once (who speaks c1s04t1a is unconfirmed by ear).

**Sources.** idea: Cedric's voice in the world (taunts and lore barks)

#### F-16 — The same-market haggle floor: buy-then-sell loops stop printing gold

*Wave 64.5 · S · fix*

**What it gives.** Haggle still pays, but buying an item and selling it back at the same market can never turn a profit, at any Wit. Cross-market trade stays profitable on purpose.

**Scope.** In pricing.ts, buyQuote's per-unit price is floored at sellQuote(same item, same market, same haggle) + 1 gold, applied after trade.ts:189's marketPriceMultiplier and in inventorySlice buyOffer (:110-125). No haggle cap is needed: sellQuote adds wit*0.04 + 0.15 + 0.08 + 0.02 uncapped (pricing.ts:33-49) and Wit grows with total skill level (playerAttributes.ts:15-19), so the floor is relative, not a maximum. A property test over haggle 0..very large and every BUY_OFFERS item that SELL_PRICES also buys. G-31 must keep it green per regional market. Out of scope: regional prices (G-31).

**Builds on.** src/game/data/pricing.ts:21-49; src/game/data/trade.ts:~111 BUY_OFFERS, :189 marketPriceMultiplier; src/game/store/slices/inventorySlice.ts:110-125; src/game/playerAttributes.ts:15-19

**Depends on.** nothing in this plan

**Risk.** A few high-haggle buy prices rise; shop panel totals must match (ShopPanel.tsx:76, :94).

**Verification.** pricing.test.ts property test: buyQuote/qty > sellQuote at the same market for every offer and haggle value. Live on production builds of main and the change: set Wit high via hook, buy then sell an item at one market (gold rises on main, falls on the change).

**Owner decision.** OD-07 (R): a same-market floor; Wit stays uncapped; cross-market profit stays intentional; ships in Ground Truth.

**Sources.** Q-haggle-arbitrage

#### F-14 — The world keeps living in build mode and behind panels

*Wave 65.1 · M · robustness*

**What it gives.** Crops grow, villagers arrive, nodes respawn and challenge timers run while the player plans in build mode or reads a panel. Pause and ceremonies still freeze the world, and returning from build mode no longer credits a free half second.

**Scope.** Respect worldTick.ts:6-13's ordering constraint (per-frame ticks after movement and BEFORE targeting/performAction; the sweep after them). Keep tickWorldFrame (PlayerController.tsx:130) and the sweep (:139-144) in PlayerController while it is mounted and unfrozen; add an always-mounted WorldTicker in the Canvas that runs them only while the controller is frozen by build mode or a panel, or unmounted (GameWorld.tsx:131 swaps in BuildController). A gate in worldTick.ts decides per OD-08 (run in build mode and behind panels; freeze when paused or in a ceremony) and guarantees one run per frame. The sweep countdown moves from a component ref to module state. In build mode, sweepWorld's px/pz (stationsInReach, tickFishing distance) come from the published playerState leaf. Audit fishing and challenge 1's 90 s build timer.

**Builds on.** src/components/fps/PlayerController.tsx:98-147 (frozen at :101, :130, :134, :139-144); src/game/worldTick.ts:6-17, :67; src/components/GameWorld.tsx:131

**Depends on.** nothing in this plan

**Risk.** Double-ticking in one frame, or a villager arriving into a placement ghost; the gate test covers the first.

**Verification.** vitest: the gate runs or freezes by build, panel, paused and ceremony flags; exactly one owner per frame; the countdown persists across a remount. Live on production builds of main and the change: plant a crop, sit in build mode 60 s, compare growth (frozen on main, advancing on the change).

**Owner decision.** OD-08 (A): run in build mode and behind panels; freeze only when paused or in a ceremony.

**Sources.** Q-world-ticks-build-mode

#### F-15 — Destination hillsides walk smoothly; eye height stops trailing climbs

*Wave 65.2 · M · fix*

**What it gives.** Walking downhill at the Tourney Grounds, Old Ruins and other destinations no longer bounces and stutters, and climbing no longer leaves the camera lagging below the head.

**Scope.** Rescoped: a destination bake is one glTF mesh (one node; 35-82 primitives, one per material, which three.js loads as one object each, e.g. mesh_0_47), and floorUnder returns the top raycast hit against all of them (templateGround.ts:99). Check one alternative first: where a template draws its ground in materials nothing else uses, a raycast against those objects alone is a terrain-only height; use it where it holds. Elsewhere (and as the default), classify by floor continuity instead: compare this frame's floorY with last frame's against horizontal distance moved (|dy|/dxz under a slope limit is slope; a jump above about STEP_UP over a short move is a ledge), smoothed over a few frames against dt jitter, so locomotion.ts:211's onOpenGround (always false at destinations) can be true there and vertical.ts:15's ledge test stops firing on descents. Unsure cases fall back to today's path. Make vertical.ts:32's eye follow asymmetric (fast up with a max-lag clamp; current rate down). Out of scope: home terrain (declined cluster), an offline terrain heightfield.

**Builds on.** src/game/playerPhysics/locomotion.ts:210-212; src/game/playerPhysics/vertical.ts:6, :15, :32; src/game/playerPhysics/floor.ts:86-121; src/game/templateGround.ts:99

**Depends on.** nothing in this plan

**Risk.** Misreading a stair as slope could let the player glide off a ledge; test template-02 and template-07 stairs and battlements at walk and sprint.

**Verification.** vitest on the extracted classifier (slope vs step vs ledge sequences with jittered dt) and the vertical step (eye lag bounded on a 0.5 m step, monotonic descent). Live on production builds of main and the change: walk a known slope at template-02 and template-07 sampling eye y per frame (far fewer dy sign flips on the change) and the eye-minus-ground lag on a climb.

**Sources.** OPEN-063, OPEN-064

#### F-18 — Settlement residents stop filling the home roster

*Wave 65.3 · S · fix*

**What it gives.** Founding settlements no longer silently stops newcomers and recruits arriving at the homestead. Today the three foundings add nine residents to a global cap of six, and nobody comes home again.

**Scope.** MAX_VILLAGERS = 6 (data/villagers.ts:204) is checked against st.villagers.length (villagerSlice.ts:202 recruitVillageFolk, :252 checkVillagerArrival), which counts settlement residents with world = destId; villagerRequirement(villagers.length+1) (villagers.ts:198-202) inflates the same way. Count only villagers whose world is home in all three, through one homeVillagers() selector; audit other consumers (OrderRadial.tsx:19, OrderStatus.tsx:21, VillagerPortrait.tsx:9's row cap). Settlement caps come with G-23. Out of scope: raising the cap.

**Builds on.** src/game/data/villagers.ts:198-204; src/game/store/slices/villagerSlice.ts:199-226, :250-273; src/game/store/slices/empireSlice.ts:116 (residents get world); src/components/hud/VillagerPortrait.tsx:9

**Depends on.** nothing in this plan

**Risk.** Low; the roster panel may now list more than six rows in total, which the portrait cap must handle.

**Verification.** vitest: with 9 settlement residents and 3 home villagers, arrival and recruitment are allowed and villagerRequirement uses 4. Live on production builds of main and the change: seed three founded settlements via hook, advance time, see a home arrival on the change and none on main.

**Sources.** verifier G-23: global MAX_VILLAGERS counts settlement residents

### Arc: Walls That Hold

#### G-36 — Socket sites: the keep's single socket model becomes a multi-site socket and section state

*Wave 67 · M · foundation*

**What it gives.** No visible change on its own, by design: the Grand Keep becomes one 'socket site' among many, so ruins, solid walls, bandit strongholds, settlement town plans and the Rival Castle all share one state, one world-position helper and one damage path instead of five copies of a singleton.

**Scope.** New src/game/sites/: SocketSite {id, world, x, z, rot, layout, parts, built, hp, ruined, gateOpen} and a layouts table whose 'grandKeep' layout is KEEP_SOCKETS (keep.ts:40-50). siteSocketWorld(site, socketId) applies the origin rotation (site.rot ?? 0, so OPEN-023's hard-coded 0 stops being baked in) and absorbs fort.ts:133-142's footprint math (wall 8x2.4, corner/centre 4x4). The home keep is site 'keep', still backed by st.keep (keepSlice.ts:75-76) so saves keep the `keep` field; ruined and gateOpen become optional fields on it; other sites save in a new optional `sites` field (types/save.ts plus a PERSISTED_FIELDS row, parseSave default []). Generic fill/construct/damageSitePart/refund take a site id; keepSlice.ts:141-162 damageKeepPart and siege.ts:22-31 damageKeepNear/ramCheck become wrappers that read sites by world. KeepAssembly becomes SiteAssembly(siteId) and the keepSocket panel takes a site id. Out of scope: rendering non-home sites at destinations (G-15b), solids (G-02), ruin behaviour (G-05), letting the player rotate the keep (OPEN-023 stays open, unblocked).

**Builds on.** src/game/data/keep.ts:40-50, :56-70, :99; src/game/store/slices/keepSlice.ts:75-76, :141-162, :168-184, :201; src/game/fort.ts:133-142; src/game/siege.ts:22-31, :190-224; src/game/types/save.ts:78; src/game/store/persistence.ts:91; KeepAssembly

**Depends on.** F-09 (wave 63.4)

**Risk.** A broad refactor of a working system; golden tests of today's keep behaviour (fill, build, damage, refund, fort seal) must pass unchanged before and after.

**Verification.** vitest: golden keep tests unchanged; siteSocketWorld matches fort.ts's old footprints at rot 0 and rotates correctly at a quarter and an odd angle; a second test site in another world fills, builds, damages and saves round-trip without touching the keep. Live on production builds of main and the change: build and damage a keep via hooks and compare part HP, refunds and screenshots (identical).

**Owner decision.** Siege target (A): one multi-site socket model serves strongholds, town plans and the Rival Castle.

**Sources.** owner: siege target (strongholds, then the castle), OPEN-023, critic: keep rotation hidden dependency

#### G-05 — Ruins and repair: battered pieces become repairable ruins

*Wave 68 · M · feature*

**What it gives.** A wall smashed by a ram, an engine or a raider's axe leaves a ruin to rebuild instead of vanishing for a half refund, and any damaged building or keep piece can be repaired for a cost that scales with the missing HP. Builders patch things up after a raid. Raids get teeth without wiping out hours of building.

**Scope.** Real non-dragon causes (the merged plan's list was wrong; raider ladders deal no damage and the ram bursts gates open rather than damaging them): ramCheck (siege.ts:221, with a raider-vs-player-ram cause flag), fireEngine (blows.ts:206), the CedricSiege engines (CedricSiege.tsx:105), and raider blows on keep parts (blows.ts:170-180 via G-36's damageSitePart). damageBuilding (buildSlice.ts:152-203) passes leaveRuin for these, as dragonfire.ts:81/92 does; a ruin is built:0, so it already leaves collide and the grid, and the builder pass already rebuilds it (villagerSlice.ts:618-660). Site parts at 0 HP keep their part with ruined[socketId] = true (G-36 field) instead of deleting at a half refund; ruined parts render as their damaged form and join the builder queue. New: a Repair interaction (findTarget prompt) on damaged standing buildings and site parts, costing def cost x missing/max HP. Damage phases overwrite b.type (~:160-166) and labDamagedForm never un-breaks (labCapabilities.ts:326-338), so store a baseType on PlacedBuilding, with a straightChain phase-1 lookup for old saves. Out of scope: outright destruction (G-07), decay.

**Builds on.** src/game/store/slices/buildSlice.ts:152-203, ~:160-166; src/game/dragonfire.ts:81, :92; src/game/siege.ts:190-224; src/game/enemyAi/blows.ts:170-180, :206; src/components/world/CedricSiege.tsx:105; src/game/store/slices/villagerSlice.ts:618-660; src/game/data/labCapabilities.ts:326-338; src/game/interaction/findTarget.ts; G-36 sites

**Depends on.** G-36 (wave 67)

**Risk.** Repair costs need tuning; old saves without baseType must repair to the right type.

**Verification.** vitest: each listed cause leaves a ruin; a site part at 0 HP is ruined not deleted; repair restores type and HP and charges the expected cost; an old-save building repairs via the chain lookup. Live on production builds of main and the change: ram a wall to half and to 0 HP and batter a keep wall via hooks (deleted on main, ruins on the change), then repair and rebuild.

**Owner decision.** OD-02 (A, HARSH): pieces battered during a fight become repairable ruins; outright destruction is reserved for a lost raid (G-07). OD-01 (A): a ruined piece is a breach until repaired.

**Sources.** OPEN-026, critic: ruins before battering (keepSlice.ts:149-158 deletes at a half refund)

#### G-02 — Keep walls stop people; the keep gatehouse opens and shuts

*Wave 69 · M · feature*

**What it gives.** A finished Grand Keep works as a castle. Its walls stop the player, raiders and arrows; the gatehouse opens and shuts on command, and the ram bursts it. Raiders who cannot get in hack at the gatehouse or the nearest wall piece instead of walking through stone, and a ruined piece is a breach.

**Scope.** Finished, non-ruined home-keep sockets join F-02's solids as boxes from G-36's siteSocketWorld, keyed on st.keep identity; skip the hall socket (KEEP_INTERIOR already collides, collide.ts:268-278). Consumers: collide.ts (replace the 'keep' skip, :175-181); grid.ts rebuild (:459-491; the keep's own PlacedBuilding is 0.3 m, below WALK_LOW 0.55, so it never blocked) and forEachObstacleBox (:101-125); lineOfSight.ts's box cache (:57-63); enemy movement (movement.ts:222-226 handles shut gates only). New keep gatehouse state: G-36's gateOpen on the keep site, a findTarget toggle, and ramCheck (siege.ts:194-204) bursting a shut gatehouse open like a door. Wall-walks stay standable (floor.ts:79 keepWalkwayAt). The single raider fallback (owned here, extended by G-03): when findPath to the keep fails, target the shut gatehouse, else the nearest keep piece, with capped retargets, through keepInReach (targeting.ts:32-53) and blows.ts:170-180. OPEN-076's seal test (fort.ts) uses the same helper. Out of scope: approach sides and player-built wall targets (G-03).

**Builds on.** src/game/playerPhysics/collide.ts:175-181, :268-278; src/game/nav/grid.ts:45, :101-125, :459-491; src/game/nav/lineOfSight.ts:57-63; src/game/enemyAi/movement.ts:222-226; src/game/enemyAi/targeting.ts:32-53; src/game/enemyAi/blows.ts:170-180; src/game/siege.ts:194-204; src/game/playerPhysics/floor.ts:79; src/game/fort.ts:133-142; src/game/fixedSolids.ts (F-02); G-36

**Depends on.** F-02 (wave 62.2), F-01 (wave 62.1), G-36 (wave 67), G-05 (wave 68)

**Risk.** A sealed ring could stall raiders or the pathfinder; the fallback test covers it. Players with decorative keep walls will find raids harder.

**Verification.** vitest: cells under a finished wall are blocked, the open gatehouse walkable, a ruined wall walkable; collide() pushes out of a wall; LOS false across a wall; a raider with no path picks the gatehouse, then a wall, within the retarget cap. Live: the ladder_raid probe (KK_NEAR=1) on production builds of main and the change plotting raider tracks (no wall crossings on the change); walk the player into a wall; toggle the gatehouse.

**Owner decision.** OD-01 (A): finished keep walls are solid to everyone; entry by gate, ram or ladder, or by battering a piece.

**Sources.** OPEN-022, DEC-7738, OPEN-076, idea: Defence Engineering 2.0: walls that hold, fronts that matter

#### G-03 — Raiders peel off to different sides, the ram comes by road, the ladder goes up where they are

*Wave 70.1 · M · feature*

**What it gives.** Raids look like an assault. Foot raiders already walk in by the road; now they spread to two or three sides before converging, the ram rolls up the road on a real path, and the siege ladder goes up on the wall nearest the raiders. With no ladder or ram they batter the gatehouse, a player-built gate or the nearest wall. Where you build walls and towers decides the fight.

**Scope.** A per-raid seed in director state (F-01). Each raider gets an approach ring point from hash(raider id, seed), biased to the road side and snapped through getNavGrid().nearestWalkable (grid.ts:613); it paths there, then converges. The ram spawns back along the road from roadEntry() (raidDirector.ts:103-104, replacing the 34 m ring reset at :159-166) and follows a findPath route to its gate instead of RaiderRam.tsx:62-66's straight drive; it targets building gates (isDoorLike) and now the keep gatehouse. The ladder socket is the walkway socket nearest the raid's mean approach vector (replacing the random pick at :172-183). Extend G-02's fallback preference order to player-built walls and gates: a new raider-to-damageBuilding blow path (raiders damage only keep parts today, blows.ts:180), leaving ruins per G-05. Record approach sides in director state for G-04's arrow and G-19's informants. Live-check the player's Climb prompt on the raiders' ladder (OPEN-094). Out of scope: shared avoidance (OPEN-015), formations.

**Builds on.** src/game/directors/raidDirector.ts:97-110, :103-104, :159-166, :172-183; src/game/enemyAi/movement.ts:101-134 walkIn, :187-189; src/components/world/RaiderRam.tsx:62-66; src/game/raiderRam.ts:34-42; src/game/enemyAi/climb.ts:45-47; src/game/enemyAi/blows.ts:180; src/game/nav/grid.ts:613

**Depends on.** G-02 (wave 69), F-01 (wave 62.1)

**Risk.** Approach points must land on walkable cells; more distinct paths raise findPath cost (measure calls per second against main); the ram's path may meet printed-road obstacles.

**Verification.** vitest: offsets spread over at least 2 sides across 20 seeds; the ram spawn is roadEntry-derived and its path reaches the gate; the ladder socket is nearest the approach vector; the fallback order picks gatehouse, then player gate, then wall. Live on production builds of main and the change: ladder_raid probe plotting approach bearings, the ram's first-seen position and track, the ladder socket vs approach side, and the Climb prompt.

**Owner decision.** OD-01 (A): walls are solid, so the approach side and breach point matter.

**Sources.** OPEN-016, OPEN-017, OPEN-094, DEC-7738, idea: Defence Engineering 2.0: walls that hold, fronts that matter

#### G-04 — Raids at any hour, announced by a horn; the day-rollover hook and the major-event arbiter

*Wave 70.2 · M · feature*

**What it gives.** Raids are no longer clockwork at dusk. They can come at any hour, most often after dark, but a horn always sounds first, and a defender posted in a tower spots them earlier and shows the approach side on the minimap. Only one major event (raid, dragon siege, Cedric siege, settlement raid) happens at once.

**Scope.** Replace the 0.70-0.78 gate (raidDirector.ts:86-93) with a per-hour probability curve weighted to dusk and night, averaging at most about one raid per in-game day, behind the cooldown (:92) and the 4-building/mining gates, seeded per day from dayCount. Raids already roll and resolve while the player is away by design (raidDirector.ts:45-58); while away the warning is a notify only. A 30-60 s 'raid incoming' phase: horn (existing alarm or a G-01 import), HUD banner, minimap arrow toward G-03's approach side (Minimap.tsx draws only the player arrow today). warningLeadTime(site) is one function: a built tower (catalog.ts:153) with a posted defender (stationId, Defenders.tsx:96-103) lengthens it; G-26's watchtower and G-25's dispatches read the same function. The probability is a function G-15a feeds. New: onDayRollover hook fired from DayNight.tsx:72 and sleep (no rollover event exists), used by G-15a, G-23, G-24a. A small major-event arbiter generalising CedricSiege.tsx:204-211's checks and dragonAir.busy, reused by G-16a/b, G-24a, G-32a, G-34a. Out of scope: a new post model.

**Builds on.** src/game/directors/raidDirector.ts:45-58, :86-93; src/components/world/CedricSiege.tsx:204-211; dragonAir.busy; src/components/world/DayNight.tsx:72; src/game/data/buildables/catalog.ts:153; src/components/world/Defenders.tsx:96-103; src/components/hud/Minimap.tsx; src/game/directors/state.ts (F-01)

**Depends on.** G-03 (wave 70.1), F-01 (wave 62.1)

**Risk.** Frequency needs owner tuning; the arbiter must not change existing trigger behaviour (golden tests of Cedric siege and dragon gating).

**Verification.** vitest: a 10-day seeded sweep: raids outside dusk, never in the cooldown, never during another major event, always at least 30 s after a warning, a manned tower lengthens it; onDayRollover fires once per day from both sources; arbiter golden tests. Live on production builds of main and the change: force a noon roll via hook and see banner, arrow, then spawn on the change.

**Owner decision.** OD-06 (R): any hour, per-hour chance weighted to dusk and night, at most about one raid per in-game day, always after a 30-60 s horn. OD-08 (A): the warning reaches a player in build mode.

**Sources.** OPEN-018, OPEN-020, idea: Realm Events Director, idea: Raids With Stakes: plunder, pursuit and ransom

#### G-06 — Plunder and pursuit: raiders strip your stores and run for the road

*Wave 71 · M · feature*

**What it gives.** Raiders who get inside head for the storehouses and load up on bulk goods for as long as nobody stops them, then make for the road with sacks on their backs. Every one cut down drops what he carried; the ones who escape take it with them and it shows up later in their hideout. A rich homestead draws a hungrier raid.

**Scope.** A storehouse target in targeting.ts beside keepInReach (:32). A raider at a store takes bulk goods (storage.ts:49) at a steady grab rate with no cap (OD-02), decrementing the global inventory (storage.ts:96-100), until he is hit or the haul passes a run threshold, then flees. New pathed escape to roadEntry with despawn at the map edge, independent of player distance, replacing flee()'s straight line and 44 m-from-player despawn (movement.ts:145-172) for thieves. A carried barrel or crate prop on the enemy rig (new EnemyFigure attachment from existing props). A kill drops exactly the carried goods through combat/loot.ts:8-20. A saved plunder ledger records what escaped (G-16a pays a share back). Raid size grows with stockpile value through G-04's weight function (today fixed 1+2, raidDirector.ts:140-155). The resolve notify itemises goods lost and recovered. Out of scope: knock-out losses (G-07).

**Builds on.** src/game/directors/raidDirector.ts:71, :140-155; src/game/enemyAi/targeting.ts:32; src/game/storage.ts:49, :96-100, :118-131 bestStore; src/game/enemyAi/movement.ts:145-172; src/game/combat/loot.ts:8-20; EnemyFigure; G-04 weight function

**Depends on.** G-03 (wave 70.1), G-04 (wave 70.2), G-05 (wave 68)

**Risk.** Uncapped losses must stay legible and answerable: itemise them, keep thieves visible with props, and despawn only at the map edge so pursuit is always possible.

**Verification.** vitest: the grab rate over time; a kill drops exactly the carried goods; the escape path reaches roadEntry and despawns only at the edge; the ledger records escapes; raid size at stockpile thresholds. Live on production builds of main and the change: stock the store, open the gate, let a raider load up, then kill one and let one escape; inventory deltas match (no change on main).

**Owner decision.** OD-02 (A, HARSH): uncapped theft; what a raider carries drops when he is killed before escaping.

**Sources.** idea: Raids With Stakes: plunder, pursuit and ransom

#### G-08 — Arm the garrison: tiered weapons for defenders, a rally order and a pinned balance table

*Wave 72 · M · feature*

**What it gives.** Forged, crested and legendary weapons from your forge can be issued to defenders, and the tier shows in their hands and their blows. A rally order plants a point the defenders hold mid-fight. A pinned balance table keeps the garrison in step with raid strength, so smithing protects the realm.

**Scope.** The Armory already holds tiered ItemIds (save.ts:127, types/core.ts:67,75); add loadoutTier on the villager and make setDefenderLoadout (villagerSlice.ts:454-475) and LOADOUT_REQUIRES consume tier stock. defenderStrike (defenders.ts:73-79) reads the tier bonus from an exported MELEE_TIERS helper (melee.ts:208); LoadoutGear (Defenders.tsx:472) renders the tint via weaponParts. A vitest-pinned table of defender HP and damage by level, gear and traits against raid strength, snapshotting difficultyState (raidStrength() takes no argument, difficulty.ts:220-222), with one courage/morale multiplier fixed at a neutral 1.0 that only G-21 drives; G-07 and G-24a read the table. A 'rally' order in Defenders.tsx's order branches (:173-371): the command wheel (commandWheel.ts:16-45, sector only) plants the point at the player's look point; hold scoring is a pure extracted helper. A combat4 melee test closes OPEN-030. Out of scope: squads (deferred), the reasoner migration (OPEN-014).

**Builds on.** src/game/defenders.ts:51, :73-79; src/game/store/slices/villagerSlice.ts:454-475; src/game/types/villagers.ts:21; src/game/data/melee.ts:208; src/game/combat/melee.ts:183; src/game/difficulty.ts:220-222; src/game/data/defenderOrders.ts:17-22; src/game/commandWheel.ts:16-45; src/components/world/Defenders.tsx:173-371, :472; src/lib/weaponParts.ts

**Depends on.** G-06 (wave 71)

**Risk.** Balance drift, made visible by the pinned table; the rally state must slot into the large FSM.

**Verification.** vitest: defenderStrike by tier; tier stock consumed and refunded; the table snapshot; rally hold helper; combat4 +1 melee. Live on production builds of main and the change: issue a forged sword via hooks and read damage on a debug bandit; set a rally point and confirm a defender holds within 2 m; GPU screenshot of the tinted weapon.

**Sources.** OPEN-050, OPEN-051, OPEN-030, idea: Field Command: squads, formations and rally points

#### G-07 — Lost raids: the garrison fights on while you are down, and a lost raid razes buildings

*Wave 73 · M · feature*

**What it gives.** If raiders knock the player out, the defenders keep fighting, and the player wakes at dawn to an itemised account: what was held, stolen, wounded and burned. A raid that is truly lost (player down and garrison beaten, or raiders holding the field) razes buildings outright, more for a stronger raid. Walls, gear and garrisons now decide whether the homestead survives.

**Scope.** A pure, seeded resolver: defender strength from G-08's table (defenderStrike, live defenderState HP) against the remaining raiders, returning held / pressed / lost. At home during a raid it replaces F-17's interim 'lost, no losses' and playerDamage.ts:131-145's clear-all: pressed applies G-06 theft and G-05 ruins in proportion; lost also destroys buildings outright, the count scaled by raidStrength and surviving raiders, weighted to the approach side, removed with no refund (keep pieces razed to bare sockets, the foundation never), each named in the report. Wounded defenders are marked downed. Then clear and jump to dawn as today, with a raid-report panel (no event chronicle exists; ChroniclePanel is a lore-line gallery, so G-25 later archives the report as a dispatch). Measure on main how a raid resolves while the player is away (raidDirector.ts:45-58); if raiders are not stepped off-scene, the same resolver settles it on return, with the same lost-raid consequence. G-24a and G-17a reuse the resolver and its outcome. Out of scope: OPEN-014.

**Builds on.** src/game/combat/playerDamage.ts:131-145; src/game/directors/raidDirector.ts:45-58, :65-82; src/game/defenders.ts:73-79; G-08 balance table; G-05 ruins; G-06 theft; src/game/difficulty.ts:220

**Depends on.** G-06 (wave 71), G-08 (wave 72), G-05 (wave 68), F-17 (wave 62.1)

**Risk.** Harsh by design: tune so a walled, garrisoned keep usually holds, never harsher than fighting on; check against live probe fights.

**Verification.** vitest: resolver over a table of garrison vs raid strengths (strong garrison holds; none loses; destruction count scales with strength; deterministic per seed); the foundation is never razed. Live on production builds of main and the change: during a raid set player HP 0 via hook with a strong and an empty garrison; read the report, losses and razed buildings on the change (no losses on main after F-17).

**Owner decision.** OD-02 (A, HARSH): a lost raid (player knocked out and garrison beaten, or raiders holding the field) destroys buildings outright, scaled by raid strength; battered pieces stay repairable ruins.

**Sources.** idea: Raids With Stakes: plunder, pursuit and ransom, OPEN-021

### Arc: Voices and Steel

#### G-01 — Import the original bank through a tracked manifest, with an on-demand voice loader

*Wave 66 · M · foundation*

**What it gives.** Catapults fire with the real trebuchet sample and rams boom with their own. Behind that, all 92 original clips, the missing sounds and the 196 voiced challenge lines become available without bloating start-up, and later asset changes show up in PRs instead of a gitignored script.

**Scope.** (1) Move the copy lists (soundMap prepare-assets.mjs:186-233, loreMap :241-253, anims :258-267) into a tracked src/game/data/assetManifest.json the local script reads; add a manifest-vs-disk checker; fold in F-12's transcript table and an ownership column (bark vs campaign) for each voice line. (2) Import the 77 missing clips (~7.5 MB JSON), the missing SFX (~1 MB) and the challenge 1-6 voice bank (196 WAVs, ~50 MB) with transcripts, plus the c5 OBJ/MTL for G-14a. (3) audio.ts:31-45 preloads every SOUNDS entry, so voice ids and rare SFX stay out of SOUNDS and go through a new on-demand loader with a small LRU; graceful absence everywhere (CI and fresh worktrees have no assets; loadClip's fetch().json() 404 is caught at the play site). (4) An audio play log on __kkaudio (audio.ts:159) for probes. (5) Wire snd060 to catapult fire and snd084 to the ram blow (siege.ts:54-82 substitutes). (6) Tests only for already-built behaviour: MinifigAnimator.ts:108-111 skips non-JOINTS tracks (anim_g_fallbackward ships a 'Null' track today); one clip per family (g_, r_, c_, horse, dragon) parses. (7) Correct ambient.ts:8, RiggedFigure.tsx:34-37 and siege.ts:54-82 comments and the ROADMAP rows: OPEN-004 unblocked and shipped, OPEN-013 arguably covered by anim_c_surprisestartle, OPEN-054 stays open (no sit/sleep/eat clip). Out of scope: the remaining mechanism sounds (deferred), using the new clips (G-10 on).

**Builds on.** scripts/prepare-assets.mjs:186-267 (gitignored, .gitignore:52); src/lib/audio.ts:31-45, :87, :119, :159; src/lib/audioCatalog.ts:3-17; src/lib/rig/clips.ts:11-18; src/lib/rig/MinifigAnimator.ts:108-111; src/game/siege.ts:54-82; src/ai/actions/ambient.ts:8; src/components/character/RiggedFigure.tsx:34-37; sibling extracted/animations (92), extracted/sounds (92), pak/system/challenges/{sounds,texts}

**Depends on.** F-12 (wave 64.4)

**Risk.** Every worktree must re-run prepare-assets; code must never crash on a missing file. Voice must never enter the eager preload.

**Verification.** vitest: manifest ids unique and resolvable; the on-demand loader tolerates a 404; clip family parse; non-JOINTS tracks skipped. Live on production builds of main and the change (muted): fire the catapult and ram a gate via hooks and assert the play log names snd060/snd084 on the change and substitutes on main; network log shows no voice WAV fetched at start.

**Sources.** OPEN-004, OPEN-013, idea: Import the full original animation bank (92 clips), idea: Missing mechanism sounds (snd060 and 30 more)

#### G-09 — The cast finds its voice: Cedric's taunts, court barks, soldier voices, and subtitles

*Wave 74 · M · content*

**What it gives.** Cedric's recorded voice gives the villain a personality from the first raid ('Nobody can defy Cedric the Bull. Your defences are useless!'), a jeer near his camp, and 'Build all you want to!' when you build under siege. Bump into Richard and he protests; court figures mutter their own lines; Bull raiders stop borrowing Cedric's voice. Every voiced line gets a subtitle.

**Scope.** (1) A new subtitle overlay driven by voice plays (no subtitle system exists; lore text pairs only inside DialoguePanel loreLines, types.ts:113), with a mute-barks option. (2) A bark table {event, line, speaker, cooldown} through audio.playVoice (audio.ts:87) and G-01's loader: c2s01t2a at a Cedric-led raid start (raidDirector.ts:128-138, already plays greeting_cedric), c2s02t4a on build-while-raiding, c1s03t1a-c at Cedric's camp via a new proximity trigger in CedricCamp.tsx, and the jailed beat (storySlice.ts:144-148) only with lines the manifest's ownership column gives to barks; c5s04t3b/t4b belong to G-14b, and the campaign runner suppresses a line already barked. (3) Court randomSound/collisionSound fields beside greetSound (types.ts:105; court.ts:28/78/137/227/305) using snd007-017, snd031-043 and snd050; collide.ts has no actor collision, so the collision bark uses a new player-to-NPC proximity check in the player frame, with cooldown. (4) Per-kind raider voices snd070-072 and defender snd073-074 (DEATH_BARK enemies.ts:240-242). Out of scope: the campaign script (G-12a).

**Builds on.** src/lib/audio.ts:87; src/lib/audioCatalog.ts; src/game/data/cast/types.ts:105, :113; src/game/data/cast/court.ts:28, :78, :137, :227, :305; src/game/directors/raidDirector.ts:94, :128-138; src/components/world/CedricCamp.tsx; src/game/store/slices/storySlice.ts:144-148; src/game/data/enemies.ts:240-242; G-01 manifest

**Depends on.** G-01 (wave 66), F-12 (wave 64.4)

**Risk.** Repetition fatigue: per-speaker and per-line cooldowns, never twice per raid, a mute option.

**Verification.** vitest: each event resolves to a line; each line matches its transcript; cooldowns hold; nothing fires twice in one raid; ownership respected; court sound ids resolve. Live on production builds of main and the change (muted): start a Cedric-led raid via hooks and assert the play log and subtitle; walk into Richard and log the collision line; raiders use snd070-072.

**Sources.** idea: Cedric's voice in the world (taunts and lore barks), idea: Full voice sets for court, soldiers and raiders

#### G-10 — Weapon-true fighting animation

*Wave 75.1 · M · feature*

**What it gives.** Crossbow bandits raise and shoot, defender archers draw, halberdiers sweep, spear-wielding players thrust, and shield-bearers walk with shields up, using the original clips. Today every armed figure, the player's avatar included, plays one sword swish.

**Scope.** A clip table keyed by equipKind/loadout (sword_shield, halberd, bow defenders; villagers.ts:149-153) picks attack and locomotion clips (crossbowshot, longbowshot, halberdswipe, spearstrike, *withshield, walk/run with shield or bow), used at four sites: step.ts:292-295, Defenders.tsx:337/:384/:467, Companion and PlayerAvatar.tsx:82-97. Enemy and defender ranged attacks are hitscan (engage.ts:33-37; Defenders.tsx:355-392), so for them the clip's release time becomes a damage-timing delay; only the player's bolt and arrow and the caster's spell (projectiles.ts:27) align a projectile spawn to the release frame. A per-clip release/impact time table and timeScale clamp 50-160-frame clips to 1.1-1.8 s cooldowns. The rig animates 7 joints (joints.ts:5), so hand and foot tracks drop; screenshots judge whether poses read. spearthrow stays unused (no throw mechanic). Out of scope: hit reactions (G-11), Tam's bow (deferred).

**Builds on.** src/game/enemyAi/step.ts:292-295; src/game/enemyAi/engage.ts:33-37; src/components/world/Defenders.tsx:337, :355-392, :384, :467; src/components/fps/PlayerAvatar.tsx:82-97; src/components/world/Companion.tsx; src/game/combat/projectiles.ts:27; src/lib/rig/joints.ts:5; public/assets/rigs/capabilities.json

**Depends on.** G-01 (wave 66)

**Risk.** Long clips against short cadences look wrong; clamp and verify on screenshots.

**Verification.** vitest: every loadout and kind maps to an imported clip; the timing helper delays hitscan damage to the release time and aligns player projectiles. Live on production builds of main and the change: GPU screenshots mid-attack and clip-name sampling for a ranged bandit, a halberd defender and the player with a spear.

**Sources.** idea: Weapon-true combat animation

#### G-11 — Knockdowns: finishers, blasts and ram strikes knock enemies flat

*Wave 75.2 · M · feature*

**What it gives.** Combo finishers and explosions knock enemies flat or send them flying, and a raider caught by a ram's swing goes down; they scramble back up, and while down they cannot strike.

**Scope.** Rescoped to real hit sources. A 'knocked' enemy sub-state (1-2 s) in step.ts beside m.state, blocking attacks while damage still lands, entered on a finisher (melee.ts:139-149 today only sets knockback and FINISHER_STAGGER_S) and an explosion (siege.ts explodeBall :112-124, detonate :158-163). The ram never touches figures today (ramCheck ~:187 hits sockets and buildings), so add a small ram-head-vs-enemy contact test in ramCheck. The clip follows hit direction (fallforward, fallbackward, flyingbackward, then standfromfall*), with a short post-stand immunity. isKnocked() is exported for G-18a. Raid resolution and the arena tally do not count knocked enemies as defeated. take_cover gains its missing not_downed gate (takeCover.ts:460-470, OPEN-019). Villager, defender and Tam downed stays the existing invisible state (actorDowned.ts:28-35). Out of scope: burns (dragon breath never hits figures; deferred), ragdolls, the player's knockdown.

**Builds on.** src/game/combat/melee.ts:114-150; src/game/siege.ts:112-124, :158-163, ~:187; src/game/enemyAi/step.ts; src/game/store/slices/storySlice.ts:114 (fallbackward precedent); src/ai/actions/takeCover.ts:460-470; src/game/actorDowned.ts:28-35

**Depends on.** G-10 (wave 75.1)

**Risk.** Stun-locks, handled by immunity; every reader of m.state must treat knocked as alive.

**Verification.** vitest: finisher, explosion and ram contact each enter knocked; recovery timing; immunity; raid resolution and arena ignore knocked enemies; takeCover scores 0 when downed. Live on production builds of main and the change: a debug finisher and a blast on bandits, sampling clip names and strike timers over 3 s.

**Sources.** idea: Weapon-true combat animation, OPEN-019

#### G-12a — Richard's Challenge I: the voiced campaign begins, and the minigames become Trials

*Wave 76.1 · M · content*

**What it gives.** The first challenge ground tells the original story in the original voices: Richard presents the player to Leo, the Queen and John while Cedric heckles. The existing minigames stay replayable from a 'Trials' entry at every ground. Part a of the L item G-12.

**Scope.** A data-driven script runner on ChallengeRunner: steps {line id, speaker, subtitle, objective, trigger}, using G-09's voice player and subtitles and DialoguePanel; campaign progress is a new saved field (types/save.ts plus PERSISTED_FIELDS). Challenge I's 'talk to each court member' uses a presence override in data/cast/presence.ts that moves Leo, the Queen and John to the ground while the challenge runs, so each stays one instance and id-keyed dialogue state stays valid. A `requires` field on WorldDestination makes later grounds need earlier ones, with a grandfather rule: any recorded visit or progress at a ground keeps access. The existing minigames (challengeModes.ts:1-14) move to a 'Trials' entry without breaking ChallengeRunner's per-destination dispatch. Lines that teach the 2000 interface are cut. OD-17 ride-along: delete scheduledCourtNpcs/CourtNpc.schedule (presence.ts:8-45). Out of scope: challenges II-VI.

**Builds on.** src/game/challengeModes.ts:1-14; src/components/combat/ChallengeRunner.tsx; src/game/data/worlds.ts:440-478; src/components/hud/TravelPanel.tsx:164; src/game/data/cast/presence.ts:8-45; src/game/data/cast/court.ts; src/components/hud/DialoguePanel.tsx; sibling challenge1 texts and sounds (42 files)

**Depends on.** G-01 (wave 66), G-09 (wave 74)

**Risk.** Cutting interface lines must not break the story; the presence override must restore the court afterwards and on load.

**Verification.** vitest: the runner advances on objective events and persists progress; `requires` with the grandfather rule on a pre-G-12 save; the presence override sets and clears; every step's line id exists in the manifest. Live on production builds of main and the change: play Challenge I via hooks logging line events in order; open Trials and start a minigame.

**Owner decision.** OD-03 (A): the campaign is the grounds' main mode; the minigames stay replayable from 'Trials'. OD-17 (R): scheduledCourtNpcs/CourtNpc.schedule deleted here.

**Sources.** idea: Richard's Six Challenges: the original voiced campaign, OPEN-041, OPEN-046

#### G-12b — Richard's Challenges II-III: raise the wall; haul the cannon onto the platform

*Wave 76.2 · M · content*

**What it gives.** Raise the Challenge 2 wall while Cedric jeers, then push the cannon cart up onto the raised platform, in the original actors' voices. Part b of G-12.

**Scope.** Challenge II: a buildable catalog entry for c2_wall.glb (unreferenced; no collision.json entry, so box fallback) at a marked site, credited as the structure objective through constructBuilding (buildChallenge.ts:10, :62). Challenge III: c3_cannon has only a capability override (labCapabilities.ts:212-220, isStationary); give it a catalog entry and make it pushable by generalising findTarget.ts:646's hard-coded warcart/oc6096-1 push check into a capability flag; a new platform placement objective (carts.ts has none) checks the pushed cart's settled position. Voiced lines from challenges 2-3 with interface lines cut. Out of scope: Challenge IV.

**Builds on.** public/assets/props/lab/c2_wall.glb, c3_cannon.glb; src/game/buildChallenge.ts:10, :31-39, :62; src/game/data/labCapabilities.ts:212-220; src/game/interaction/findTarget.ts:646; src/game/carts.ts:15-34; G-12a runner

**Depends on.** G-12a (wave 76.1)

**Risk.** Generalising the push check must not make other stationary engines pushable.

**Verification.** vitest: c2_wall's entry validates and credits the objective; the push capability applies only to flagged items; the placement objective completes inside the marked area. Live on production builds of main and the change: build the wall and push the cannon onto the platform via hooks; screenshots.

**Owner decision.** OD-03 (A): campaign first.

**Sources.** idea: Richard's Six Challenges: the original voiced campaign, OPEN-041

#### G-13 — Richard's Challenge IV: man the engines and bring down Cedric's tower

*Wave 76.3 · M · content*

**What it gives.** Man the cannon and a catapult to bring down Cedric's rolling attack tower while a column of soldiers marches, as in the original fourth challenge. It teaches the siege engines the war arc relies on.

**Scope.** oc6096b3 (catalog.ts:539) as a new moving-target entity with HP on a short straight path inside the scoped destination's origin offset (worlds.ts ~:496-505), with its own cannonball hit test (explodeBall damages only enemies and st.buildings today). Crewed cannon and catapult at a destination via crew.ts:44-54 (it copies b.x/b.z, so verify it inside DestinationScope), with snd060 (G-01) and byPlayer credit (F-11). Defenders are home-only (Defenders.tsx:116, :173), so the marching column is a set of scripted, non-AI soldier figures walking a path in withshield clips (G-10). snd067 ticking fuse on the tower's bomb. Voiced challenge 4 lines. Out of scope: the tower's animated rig.

**Builds on.** src/game/data/buildables/catalog.ts:539; src/game/crew.ts:44-54; src/game/siege.ts:112-124; src/game/data/worlds.ts ~:496-505; src/components/world/Defenders.tsx:116, :173; G-10 clip table

**Depends on.** G-12b (wave 76.2), F-11 (wave 64.3), G-10 (wave 75.1)

**Risk.** Engines outside home are new; the tower's path must stay on walkable ground.

**Verification.** vitest: tower HP, path stepping, hit test, and objective completion on destruction. Live on production builds of main and the change: run Challenge IV with debug-aimed crewed shots; the tower is destroyed, the step advances and voice ids play in order; GPU screenshot of the column.

**Owner decision.** OD-03 (A): campaign first. OD-04 (A): crewed shots earn full credit.

**Sources.** idea: Richard's Six Challenges: the original voiced campaign, idea: Garrison drill and victory parade

#### G-14a — Richard's Challenge V: build the King's Jail, the workshop's first set

*Wave 76.4 · M · content*

**What it gives.** Assemble Richard's jail in the Assembly Workshop from the original Challenge 5 bricks. The plan becomes the player's first workshop set, which teaches them the workshop exists, and the placed jail is one more place prisoners can go. Part a of the L item G-14.

**Scope.** setBuild needs OBJ/MTL in public/assets/props/objrig (loadModuleParts setBuild.ts:53-127), so the c5 OBJs come in through G-01's manifest from sibling extracted/models. Each c5 piece is one brick (c5_2x4, c5_window, c5_roof one mesh; c5_door two), so a real jail repeats modules: loadModuleParts' cache (:53-56, :115-122) must return clones. A tenth plan 'Richard's Jail' is defined in code beside setPlans.generated.json (SET_PLANS :39), and OWNER (:156-162) maps the c5 assets to it. Challenge V grants and completes it as the starter set. A placed jail registers as a jail for G-18a beside Jail Cell oc6094-2 and Jail Tower. Out of scope: Challenge VI.

**Builds on.** src/lib/setBuild.ts:39, :53-127, :156-162; setPlans.generated.json (9 sets); sibling extracted/models c5_*; src/game/data/buildables/catalog.ts:434, :437; G-01 manifest

**Depends on.** G-13 (wave 76.3), G-01 (wave 66)

**Risk.** Cloned parts must not break setOwning or existing plans' caching.

**Verification.** vitest: the plan validates; repeated modules return distinct clones; existing 9 plans unchanged; the plan unlocks on Challenge V. Live on production builds of main and the change: assemble the jail via hooks and screenshot it (GPU).

**Owner decision.** OD-10 (R): the campaign's jail is the workshop's starter set. OD-03 (A).

**Sources.** idea: Richard's Six Challenges: the original voiced campaign, OPEN-047

#### G-14b — Richard's Challenge VI and Knighthood

*Wave 76.5 · M · content*

**What it gives.** Paint and place the jail, hear 'Cedric safely behind bars', and kneel for a Knighthood ceremony with Leo's sword gesture. Part b of G-14.

**Scope.** Challenge VI: paint (dyes.ts), place (placeSetPart keepSlice.ts:201), and the closing lines c5s04t3b/t4b (owned here per the manifest) with a Cedric figure behind bars using CedricCamp.tsx:65-97's rendering. A 'Knight of Leo's Court' deed and a non-rank variant of beginCeremony (progressionSlice.ts:66-84 is rank-keyed) that plays gesturepullsword; rank formulas unchanged. Out of scope: c6_cedric/c6_storm (PNG only).

**Builds on.** src/game/store/slices/keepSlice.ts:201; src/game/data/dyes.ts; src/components/world/CedricCamp.tsx:65-97; src/game/store/slices/progressionSlice.ts:66-84; src/game/data/achievements.ts

**Depends on.** G-14a (wave 76.4)

**Risk.** The non-rank ceremony must not trigger rank-up side effects.

**Verification.** vitest: the deed is granted once; the ceremony variant runs without a rank change. Live on production builds of main and the change: complete Challenge VI via hooks; ceremony clip, voice ids and the deed appear.

**Owner decision.** OD-10 (R): a Knighthood deed and a non-rank ceremony; rank formulas unchanged.

**Sources.** idea: Richard's Six Challenges: the original voiced campaign, OPEN-041

### Arc: Bandit Country

#### G-15a — Outlaw hideouts grow and drive raid pressure

*Wave 77.1 · M · feature*

**What it gives.** Outlaw bands keep hideouts at away destinations that grow day by day. Their strength sets how often and how hard home and settlement raids hit and how risky the caravan roads are. Once scouted they appear on the travel map. Part a of the L item G-15.

**Scope.** A saved hideouts record (destination, strength 0-5, scouted, burntUntil, lastGrowthDay) via types/save.ts plus PERSISTED_FIELDS (persistence.ts:91). Growth on G-04's onDayRollover (no rollover event existed). Two sites on templateWalkableFootprint ground, never CEDRIC_WORLD. Per OD-20 the bands are outlaws hostile to every allegiance, so pressure feeds G-04's raid probability and size, adds an outlaw raid source to settlementRaid even at neutral standing (a deliberate change to settlementRaid.ts:69-75; cooldown :62, kinds :76, max live :88), and raises effectiveCaravanRisk (caravan.ts:54). Strength 4+ guarantees the ram and, where walkway sockets exist, a ladder on the next home raid (raidDirector.ts ~:162, ~:181). Scouting (a visit, falcon.ts, G-19 informants) adds a POI: widen Poi beyond the NPC shape (presence.ts:89-93; TravelPanel.tsx:124) and merge the static camp, dungeon, arena and challenge POIs (OPEN-087). Out of scope: in-world camps (G-15b).

**Builds on.** src/game/settlementRaid.ts:62, :69-76, :88; src/game/data/caravan.ts:54; src/game/directors/raidDirector.ts ~:162, ~:181; src/game/data/cast/presence.ts:89-93; src/components/hud/TravelPanel.tsx:124; src/game/store/persistence.ts:91; src/game/falcon.ts; templateWalkableFootprint.ts; G-04

**Depends on.** G-04 (wave 70.2)

**Risk.** Pressure that grows without input needs a visible cause; neutral players will now see settlement raids.

**Verification.** vitest: growth per day; pressure into raid chance, settlement cooldown and kinds (including neutral standing) and caravan risk; save round trip; POI merge. Live on production builds of main and the change: advance days via hook and read the director's raid chance; open the travel map to see a scouted POI.

**Owner decision.** OD-06 (R): hideout pressure scales the any-hour curve. OD-20 (R): hideouts are outlaws hostile to every allegiance.

**Sources.** idea: Bandit Country: raids come from somewhere, OPEN-087, OPEN-018

#### G-15b — Camps and castle-set strongholds stand in the world

*Wave 77.2 · M · feature*

**What it gives.** A young hideout is a guarded camp of tents and sentries. Left alone past strength 3, it fortifies into a stronghold built from real castle-set pieces, with solid walls and crossbowmen on the wall-walk: the first target worth besieging. Part b of G-15.

**Scope.** Generalise campGuards (hard-coded to CEDRIC_WORLD/CEDRIC_CAMP and quest gates) to any hideout. Strength 0-2: a camp of existing props with sentries. Strength 3+: a G-36 socket site with a 'stronghold' layout of catalog castle-set wall, tower and gate pieces, rendered by SiteAssembly inside DestinationScope's origin offset. Its finished sections join F-02's solids under the destination's world key, read by collide.ts's destination branch (today it only clamps to walkable rects) and by the movement path destination enemies use (measure first). Ranged bandits (hitscan, engage.ts:33-37) stand on fixed wall-walk posts. Layout placed on templateWalkableFootprint cells, measured live. Out of scope: assaulting (G-16a/b).

**Builds on.** src/game/directors/campGuards.ts; src/components/world/DestinationScope.tsx; src/game/playerPhysics/collide.ts (destination branch); src/game/fixedSolids.ts (F-02); src/game/enemyAi/engage.ts:33-37; src/game/data/buildables/catalog.ts (castle-set pieces); templateWalkableFootprint.ts; G-36

**Depends on.** G-15a (wave 77.1), G-36 (wave 67), F-02 (wave 62.2)

**Risk.** Overlaid pieces on a bake can look pasted on; GPU screenshots judge it. Destination enemy movement may not read a grid, so solids there need their own check.

**Verification.** vitest: layout validates on walkable cells; finished sections are in the destination's solids, ruined ones are not; collide() pushes out at a destination. Live on production builds of main and the change: set a hideout to strength 1 and 4 via hook, travel there, GPU screenshots of camp and stronghold, walk into a wall, read a wall-post bandit's shots.

**Owner decision.** Siege target (A): strongholds from castle-set pieces, fully breakable and solid. OD-01 (A): sections are solid.

**Sources.** idea: Bandit Country: raids come from somewhere, owner: siege target (strongholds, then the castle)

#### G-16a — Storm a camp and burn it out

*Wave 78.1 · M · feature*

**What it gives.** Ride out and assault a hideout: clear its sentries, hold through its band's counter-attacks, then put the stockade to the torch. A burned camp gives days of peace, a bounty and a share of the plunder its men carried off from you.

**Scope.** A new attacker-side runner (src/game/assault.ts): camp-anchored spawn origin, phases (sentries, waves, stockade), win (stockade burned) and loss (player knocked out or leaving the radius); only waveDefense's spawn timer is reused (waveDefense.ts:77 is hold-the-plot). Registered with G-04's arbiter. The runner is reused by G-24b's retakes and G-33a's courtyard. Burning is new code on the camp's stockade site parts, with dragonfire's flame visuals only (breathe() works on home PlacedBuildings, dragonfire.ts:47-80). Strength 0 and burntUntil (raid weight suppressed N days); bounty plus a share of G-06's plunder ledger. Out of scope: strongholds (G-16b), stealth.

**Builds on.** src/game/waveDefense.ts:77; src/game/dragonfire.ts:47-80; src/game/directors/campGuards.ts; src/components/combat/SettlementRaidRunner.tsx (runner pattern); src/game/combat/kill.ts; src/game/combat/loot.ts; G-04 arbiter; G-06 ledger; G-15b

**Depends on.** G-15b (wave 77.2), G-04 (wave 70.2), G-06 (wave 71)

**Risk.** A new encounter at a baked destination; spawns must stay on walkable cells.

**Verification.** vitest: wave composition by strength; win and loss rules; burning resets strength and suppresses raid weight; ledger share paid once. Live on production builds of main and the change: travel to a seeded camp, kill waves via hooks, burn the stockade; assert reset, bounty and lower raid chance.

**Sources.** idea: Bandit Country: raids come from somewhere

#### G-16b — Besiege a stronghold: siege train, mercenary crews, breach

*Wave 78.2 · M · feature*

**What it gives.** For the first time the siege engines attack. Raise a siege camp outside a stronghold, deploy the catapults and cannon you built at home, hire mercenary crews to keep them firing while you fight, and batter its gate and walls. A breached gate opens the storm.

**Scope.** A siege-train abstraction: each engine built at home grants one deployable copy at the target destination (no entity survives travelTo). A siege camp plot outside the stronghold; deployed engines are site-local and crewed via crew.ts inside the origin offset (proven by G-13). Cannonballs and charges damage stronghold sections through damageSitePart (explodeBall currently reads home only), leaving ruins (G-05); a ruined gate section is the breach event, which hands off to G-16a's runner for the storm. Mercenaries (moved here from regional markets): hire crews for gold at the siege camp; they fire deployed engines automatically, paying the purse at automatic-emplacement XP (OD-04). Registered with G-04's arbiter. Out of scope: the Rival Castle (G-32a).

**Builds on.** src/game/crew.ts:44-54; src/game/siege.ts:22-31, :87, :112-124; src/components/world/Emplacements.tsx (automatic fire); G-36 damageSitePart; G-15b stronghold; G-16a runner; G-13 destination crew

**Depends on.** G-16a (wave 78.1), G-13 (wave 76.3), F-11 (wave 64.3), G-05 (wave 68)

**Risk.** Engine code assumes home in places; the breach must be detectable from section state alone.

**Verification.** vitest: siege-train deploy count; section HP and ruin; breach detection; mercenary fire credit. Live on production builds of main and the change: build a catapult at home, travel to a strength-4 stronghold, deploy, hire a crew, fire via hooks until the breach event; d3d11 screenshots.

**Owner decision.** Siege target (A): strongholds are the first siege target and the mercenaries move here. OD-04 (A): mercenary-crewed engines count as automatic.

**Sources.** idea: Take the Rival Castle: offensive siege warfare, idea: Regional markets and gold sinks (mercenaries), owner: siege target (strongholds, then the castle)

#### G-17a — Nemesis captains

*Wave 79.1 · M · feature*

**What it gives.** Raid leaders become named, persistent captains. One who knocks the player out, wins a raid or escapes is promoted, taunts them by name and leads the next raid stronger, carrying the threat past the old tier-5 ceiling. Part a of the L item G-17.

**Scope.** A saved captains list (name from a pool, colour-variant donor, rank, hideout). Per-instance identity on EnemyData and in spawn (enemyStore.ts:160-185 has only a scaled maxHp): name, figure override/tint for the renderer (KIND_FIGURE enemies.ts:158 is per kind), per-instance HP and damage. raidDirector picks a living captain from the raid's source hideout as leader in place of the fixed choice (:118-147). Promotion on escape or on G-07's lost/pressed outcome, with taunts in notify text and G-09's soldier voice set. Death removes him, with -1 hideout strength. Out of scope: traits and trophies (G-17b), capture (G-18b).

**Builds on.** src/game/enemyStore.ts:160-185; src/game/data/enemies.ts:26, :59, :158; src/game/directors/raidDirector.ts:118-147; src/game/difficulty.ts:101-108, :220; G-07 outcome; G-09 voices; G-15a hideouts

**Depends on.** G-15a (wave 77.1), G-07 (wave 73), G-09 (wave 74)

**Risk.** Captains must not outscale G-08's pinned table; check it.

**Verification.** vitest: captain selection; promotion on escape and on G-07 outcomes; per-instance HP/damage; removal on death with the strength change. Live on production builds of main and the change: seeded captain raid, force an escape, raid again and read the higher rank, name and taunt.

**Owner decision.** OD-02 (A): promotion reads G-07's harsh outcomes.

**Sources.** idea: Nemesis lieutenants, idea: Renown and the endgame threat ladder

#### G-17b — Captain traits and trophies

*Wave 79.2 · M · feature*

**What it gives.** Each captain fights differently: a shield-bearer blocks, a firebrand looses fire bolts, a coward runs early. Beating one earns his trophy on the Skeleton Display and a page in a new Captains section of the bestiary. Part b of G-17.

**Scope.** Traits apply per-instance stat overrides and a behaviour flag: shield-bearer (frontal damage reduction), firebrand (reuses the caster's fireSpellBolt, the only enemy projectile), coward (early breaksAndRuns, movement.ts:145). On death: a trophy that becomes an interactable Skeleton Display variant (catalog.ts:467; findTarget.ts:533 examine_skeleton) and a captains section beside the kind-keyed bestiary array (questSlice.ts:134-143). Out of scope: looks beyond palette variants.

**Builds on.** src/game/enemyAi/movement.ts:145; caster fireSpellBolt; src/game/data/buildables/catalog.ts:467; src/game/interaction/findTarget.ts:533; src/game/store/slices/questSlice.ts:134-143; G-17a identity

**Depends on.** G-17a (wave 79.1)

**Risk.** Few donor figures; palette tints carry the variety.

**Verification.** vitest: each trait's effect; trophy and bestiary entry once per captain. Live on production builds of main and the change: kill a seeded firebrand via hooks, see fire bolts first, then the trophy on the display and the bestiary page.

**Sources.** idea: Nemesis lieutenants

#### G-18a — Take prisoners: bind the knocked-down and march them to a jail

*Wave 80.1 · M · feature*

**What it gives.** Instead of finishing a beaten raider or captain, the player can bind him and lead him through the gate to a Jail Cell, the Jail Tower or Richard's jail. Cedric's custody loop now applies to every raid. Part a of the L item G-18.

**Scope.** A 'Bind' hold-interact on a knocked (G-11) enemy below 25% HP; one escort at a time. followLeader is a src/ai companion action and enemies run src/game/enemyAi, so add a bound-follow movement mode in enemyAi that paths after the player through gates inside the now-solid walls. Delivery within range of any registered jail: Jail Cell oc6094-2 (catalog.ts:434), Jail Tower oc6094b5 (:437), or G-14a's jail if built. A saved prisoners list (kind, captain id, day taken). A new kill.ts 'captured' cause: XP and bestiary credit, no purse. Out of scope: presentation and captain trophies (G-18b), fates (G-19).

**Builds on.** src/game/enemyAi/movement.ts; src/game/data/buildables/catalog.ts:434, :437; src/game/combat/kill.ts; G-11 isKnocked; G-02 gates

**Depends on.** G-11 (wave 75.2), G-02 (wave 69)

**Risk.** Escort pathing through gates; the capture cost must stop players trivialising raids.

**Verification.** vitest: bind eligibility; bound-follow keeps range and paths through an open gate; delivery to any registered jail; save round trip; the captured row. Live on production builds of main and the change: knock a bandit down, bind, walk to a Jail Cell via hooks; the prisoner is recorded.

**Sources.** idea: Prisoners, jails and ransom, idea: Prisoners and the King's Jail

#### G-18b — Jails that hold: a clanging door, prisoners in the cells, captured captains

*Wave 80.2 · M · feature*

**What it gives.** The cell door clangs shut with the original prison-door sound, prisoners stand behind the bars when you look inside, and a captured captain earns his trophy and dents his hideout. Part b of G-18.

**Scope.** The cells are single meshes (oc6094-2.glb and oc6094b5.glb are one node each), so the door is a separate overlaid bars piece in the CedricCamp portcullis precedent (06_l318500.glb, CedricCamp.tsx:92-99), swapped open and shut with snd063 (imported via G-01). Prisoners render in the JailCellDressing interior (BuildingInteriorRoom.tsx:207, :316) as new work. Captain capture (moved from G-17): trophy, captains bestiary entry, -1 hideout strength. Out of scope: animated hinges (OPEN-059, deferred).

**Builds on.** src/components/world/CedricCamp.tsx:92-99; src/components/world/BuildingInteriorRoom.tsx:207, :316; src/game/data/interiors.ts:76; G-01 snd063; G-17b trophies

**Depends on.** G-18a (wave 80.1), G-01 (wave 66), G-17b (wave 79.2)

**Risk.** The overlay must line up on both cell models.

**Verification.** vitest: captured captain grants trophy and strength change once. Live on production builds of main and the change: deliver a prisoner, assert the door sound in the play log, enter the cell and screenshot the prisoner (GPU).

**Sources.** idea: Prisoners, jails and ransom, OPEN-059

#### G-19 — Prisoner fates: ransom, informants, reform, hand-over and jailbreaks

*Wave 80.3 · M · feature*

**What it gives.** Every prisoner is a choice: ransom him for gold, turn him informant to reveal a hideout and the next raid's approach side, reform him into a villager, or hand him to the crown or the Bull. Hold too many and one night there is a jailbreak.

**Scope.** A jail panel with four actions. Ransom pays from its own capped table by kind and captain rank. Informant scouts a G-15a hideout and pre-reveals the next raid's approach side through G-03's seed. Reform needs a generalised recruit (any id, name and figure, no fixed cost) because recruitVillageFolk (villagerSlice.ts:199-226) is hard-wired to Alric and Beda; it respects F-18's home cap. Hand-over calls shiftAllegiance (storySlice.ts:80). A jailbreak night when prisoners exceed jail capacity is new logic (only cedricJailbreakAllowed's cooldown idea carries over, cedricSiege.ts:45-47), spawning the freed as home raiders through G-04's arbiter. Out of scope: interrogation.

**Builds on.** src/game/store/slices/villagerSlice.ts:199-226; src/game/data/villagers.ts:204; src/game/store/slices/storySlice.ts:80; src/game/cedricSiege.ts:45-47; G-15a; G-03 seed; G-04 arbiter

**Depends on.** G-18b (wave 80.2), G-15a (wave 77.1), G-03 (wave 70.1), F-18 (wave 65.3)

**Risk.** Ransom as a gold faucet, bounded by its table; the 6-villager home cap.

**Verification.** vitest: each fate's effect (gold within the table, scouted flag and next-raid side, villager added under the cap, allegiance delta); jailbreak at capacity. Live on production builds of main and the change: hold 3 prisoners via hooks and exercise each action; force an over-capacity night.

**Sources.** idea: Prisoners, jails and ransom, idea: Prisoners and the King's Jail

### Arc: A Living Realm

#### G-20 — Villagers eat from your stores

*Wave 81.1 · M · feature*

**What it gives.** Farming, fishing and cooking now feed the village. Villagers fetch meals at midday and dusk; fed villagers work faster, a hungry village slows down, and nobody starves.

**Scope.** Hunger is declared and decays (needs.json:24; Agent.ts:282-290) but nothing reads it. An 'eat' Action reserves a store anchor slot, walks there, decrements the global inventory (stores hold nothing per building, storage.ts:96-131) and idles with drinkgoblet (G-01). The reasoner owns consumption at every tier (tier D already thinks at 0.5 Hz, lod.json:67), so there is no second slice-level eater. The pace effect goes through bb.tripSpeedMult (Agent.ts:245; read by gather.ts:87, farm.ts:84, Locomotion), not only tickVillagers' trip timer, which AI-driven workers skip (villagerSlice.ts:670-677). bb.needs reset on load and respawn, so hunger is persisted per villager in the store. No villagerCombat courage term (villagerStrike is deliberately flat, villagerCombat.ts:62-81); hunger feeds G-21's morale instead. A starting pantry grant; the panel shows food-days and consumption. Out of scope: spoilage.

**Builds on.** src/ai/config/needs.json:24; src/ai/core/Agent.ts:245, :282-290; src/ai/actions/gather.ts:87, farm.ts:84; src/game/store/slices/villagerSlice.ts:569-700, :670-677; src/game/storage.ts:49, :96-131; src/ai/config/lod.json:67

**Depends on.** F-14 (wave 65.1), G-01 (wave 66)

**Risk.** A starvation spiral, floored and buffered; the food sink drains the player's stock, so the rate is shown.

**Verification.** vitest: eat scores when hungry and food exists; one consumer per villager; tripSpeedMult by hunger; hunger survives a save round trip. Live on production builds of main and the change: empty food, advance time and measure deliveries per in-game hour; restock and watch villagers path to the store.

**Owner decision.** OD-08 (A): hunger does not freeze in build mode.

**Sources.** idea: Village Needs and Morale: an economy that consumes, OPEN-054

#### G-21 — Warmth and morale

*Wave 81.2 · M · feature*

**What it gives.** On cold nights villagers gather at your campfires. Lost raids, wounds and hunger lower morale; fires, feasts and victories raise it. Morale decides how hard they work and how bravely the garrison fights.

**Scope.** warm_at_campfire Action (reserve an anchor slot via the unused campfire rule, anchors.json:41; face the fire; idle), gated on night and cold, where cold is seasonOf(dayCount) === winter (env.ts:37-40) or the Frozen Pass; slot spacing retuned in the same probe (OPEN-029). Event deltas use the existing morale need (agent.addNeed('morale', d)), and a saved store-side morale aggregate holds what survives reload and respawn (bb.needs do not), read by G-23. Effects: bb.tripSpeedMult and G-08's courage multiplier in defenderStrike only; G-21 re-pins G-08's table and re-runs G-07's resolver tables. Out of scope: socialize pairing (deferred).

**Builds on.** src/ai/config/anchors.json:41; src/ai/core/TargetRegistry.ts:74; src/ai/config/needs.json (morale, social, comfort); src/game/env.ts:37-40; src/ai/core/Agent.ts:245; src/game/defenders.ts:73-79; G-08 table

**Depends on.** G-20 (wave 81.1), G-08 (wave 72), G-07 (wave 73)

**Risk.** Evening gatherings could stall work; gate by schedule hours.

**Verification.** vitest: warm scoring by time and season; morale deltas on events; aggregate saved; courage multiplier; re-pinned table. Live on production builds of main and the change at a winter night with a campfire: count villagers within 3 m of the fire; GPU screenshot.

**Sources.** OPEN-028, OPEN-029, idea: Village Needs and Morale: an economy that consumes

#### G-22 — Civic buildings: the tavern and the infirmary

*Wave 82 · M · feature*

**What it gives.** The tavern restores morale, draws travelling recruits and sells rumours pointing at hideouts. The infirmary sends downed villagers and defenders back to work in half the time.

**Scope.** Asset check first: nothing in the catalogue is named or shaped as an inn or infirmary, so pick existing models (likely re-labelled storehouse, stable or market stall); if none reads, the item ships the infirmary alone and logs the tavern. Interiors are player-only pocket rooms (interiors.ts:26-98, pocketFor :112), so villager effects live at an exterior anchor; each gets an INTERIORS entry and a resident. Tavern: a morale anchor with drinkgoblet and snd009 (G-01), a rumour purchase that scouts a G-15a hideout, an arrival bonus read by G-23. Infirmary: halves DOWNED_RECOVER_MS (45000, defenders.ts:32) at the single site in blows.ts:75/96/121 within its radius. Out of scope: chapel, tinker idle (deferred).

**Builds on.** src/game/data/interiors.ts:26-98, :112; src/game/data/cast/interiorResidents.ts:54-138; src/game/defenders.ts:32; src/game/enemyAi/blows.ts:75, :96, :121; src/game/data/buildables/catalog.ts; G-01 imports

**Depends on.** G-21 (wave 81.2), G-15a (wave 77.1), G-01 (wave 66)

**Risk.** The asset choice may sink the tavern; decided by the check, not after.

**Verification.** vitest: morale restore, rumour scouting, downed timer halved in radius only. Live on production builds of main and the change: build each via hooks, time a downed villager's recovery, buy a rumour; interior screenshots.

**Sources.** idea: Civic buildings: tavern, chapel, well, granary, infirmary, idea: Feast hall: eat, drink and celebrate, OPEN-040

#### G-23 — Populations grow, at home and in settlements

*Wave 83 · M · feature*

**What it gives.** Newcomers arrive because a place is worth living in: free beds, a food surplus, good morale and a tavern set the rate. They come with generated names and coherent looks, settlements grow past their three founders, and caravan capacity rises with the people who live there.

**Scope.** One arrival rule per world on G-04's onDayRollover (worldTick.ts:67's 0.5 s sweep is not a rollover): beds and buildings with world === destId, food-days (G-20) and the saved morale aggregate (G-21) at home, the tavern bonus (G-22). Per-world caps on F-18's per-world counting. Names from first-name plus byname pools, stable by id hash; same-donor looks from villagerLooks. The population cap is uniform (OD-21); the graphics tier caps only simulated agents: rosterSync.ts:133 stops spawning agents for villagers outside the visited region (today every villager has a live tier-D agent). The settlement yield already reads residentCount (empireSlice.ts:141-145); CARAVAN_MAX_CARTS (caravan.ts:40) now does too. VillagerPortrait's per-row WebGL canvases (VillagerPortrait.tsx:9) become static snapshots past the old cap. Home milestones at 10/15/20. Out of scope: children (OPEN-102).

**Builds on.** src/game/store/slices/villagerSlice.ts:250-273; src/game/data/villagers.ts:13-15, :198-204; src/game/data/villagerLooks.ts; src/game/store/slices/empireSlice.ts:116-120, :141-145; src/game/data/caravan.ts:40; src/ai/sync/rosterSync.ts:133, :158-160; src/components/hud/VillagerPortrait.tsx:9; G-04 rollover

**Depends on.** G-20 (wave 81.1), G-21 (wave 81.2), G-22 (wave 82), F-18 (wave 65.3), G-04 (wave 70.2)

**Risk.** Agent and portrait cost at the cap (measure frame time); garrisons abroad (G-24a) must work without agents.

**Verification.** vitest: arrival rate across bed, food and morale cases per world; uniform cap; name stability; caravan cap by residents; no agents for unvisited worlds. Live on production builds of main and the change: seed beds and food and advance days to count home arrivals; meet a newcomer at Frozen Pass; frame time at the cap.

**Owner decision.** OD-09 (R): settlements stay free-build. OD-21 (R): the population cap is uniform; graphics tier caps only simulated agents.

**Sources.** OPEN-036, OPEN-037, idea: Households and population growth

#### G-25 — Ravens and the realm overview; Stats joins the menu

*Wave 84 · M · feature*

**What it gives.** Raven dispatches collect in an inbox: raids held or lost, caravans arrived, hideouts growing, jailbreaks. A Realm tab shows every settlement, caravan, hideout, prisoner and garrison at a glance with a ride-out button, and Stats moves into the menu so checking it never unmounts the world.

**Scope.** A new saved dispatch log (capped at 30; notifications today keep only the last 5 transiently, uiSlice.ts:152) written by caravans (empireSlice.ts:158-255), G-15a growth thresholds, G-19 jailbreaks and G-07 raid reports, and from the next wave by G-24a. A 'realm' MenuTabs tab with collapsible settlement cards, caravans, hideouts, prisoners and a travel shortcut. StatsStack is a full kk-screen layout (:85-105), so its content is re-hosted in a PanelFrame panel and 'stats' and 'realm' join PanelId (uiSlice.ts:13), removing the scene unmount (GameScreen.tsx:36 push('stats'), App.tsx:55-64) and taking Stats' Escape from F-10b. The VillagersPanel XP text fix (OPEN-088) rides along. Out of scope: an advisor.

**Builds on.** src/components/hud/MenuTabs.tsx:10-17; src/components/stacks/StatsStack.tsx:85-105; src/components/stacks/GameScreen.tsx:36; src/components/App.tsx:55-64; src/game/store/slices/uiSlice.ts:13, :152; src/game/store/slices/empireSlice.ts:158-255

**Depends on.** G-15a (wave 77.1), G-19 (wave 80.3), G-07 (wave 73)

**Risk.** Panel sprawl, kept to one screen with collapsible cards.

**Verification.** vitest: dispatch writer and cap; save round trip; Stats panel renders inside PanelFrame. Live on production builds of main and the change: produce one dispatch of each type via hooks and screenshot the Realm tab; open Stats mid-raid and confirm the scene stays mounted (raid continues).

**Sources.** idea: The Realm Ledger: settlements live while you're away, idea: Realm overview and the Steward advisor, OPEN-061, OPEN-088

#### G-24a — Garrisons hold settlements while you are away; off-screen sieges

*Wave 85.1 · M · feature*

**What it gives.** Post defenders to a settlement, and raids there resolve whether or not the player is present. A garrisoned Frozen Pass holds; a weak one is besieged: yield stops, the garrison is wounded, and a raven warns you. Riding out to relieve it turns the odds. Part a of the L item G-24.

**Scope.** A new 'post to garrison' villager action (only foundSettlement sets world today, empireSlice.ts:116) and world filtering wherever defenders are assumed at home: Defenders.tsx:173 and :479, OrderRadial.tsx:19, OrderStatus.tsx:21, giveDefenderOrder's count (defenderOrders.ts:36). On G-04's day rollover each settlement rolls an off-screen raid from G-15a pressure and allegiance (settlementRaid.ts:62, :76; today raids happen only when present, :44-90); a strength model is defined from scratch (raider count x KIND_HP/ATTACK_DMG by kind, scaled by pressure) and fed to G-07's resolver against the garrison's G-08 strength. Held: a dispatch. Besieged: yield paused (lastCollectedAt frozen; there are no per-settlement stores, so the loss is banked and paused yield), garrison wounded (a saved woundedUntilDay, since downed is runtime only), a raven dispatch (G-25). Relief: travelling there forces the live settlement raid; winning lifts the siege with bonus outcomes. Out of scope: losing the settlement (G-24b).

**Builds on.** src/game/settlementRaid.ts:8-19, :44-90; src/game/store/slices/empireSlice.ts:116, :131-156, :257-281; src/components/world/Defenders.tsx:173, :479; src/components/hud/OrderRadial.tsx:19; src/components/hud/OrderStatus.tsx:21; src/game/data/defenderOrders.ts:36; G-07 resolver; G-08 table; G-25 dispatches

**Depends on.** G-07 (wave 73), G-08 (wave 72), G-15a (wave 77.1), G-23 (wave 83), G-25 (wave 84), G-04 (wave 70.2)

**Risk.** Defenders.tsx assumes every defender is home; missed filters would render a garrison at home.

**Verification.** vitest: resolver outcomes by garrison size and pressure, deterministic per seed; besieged yields 0; relief clears it; filtered defender counts. Live on production builds of main and the change: post 2 defenders to Old Ruins (they leave home), force an off-screen raid via hook, read the dispatch and yield.

**Owner decision.** OD-05 (A): besieged first (yield paused, garrison wounded, raven warning).

**Sources.** OPEN-021, idea: The Realm Ledger: settlements live while you're away

#### G-24b — Settlements lost and retaken

*Wave 85.2 · M · feature*

**What it gives.** A besieged settlement left unrelieved for about two in-game days falls: it changes hands, its yield, caravans and desk stop, and it must be stormed back. Part b of G-24.

**Scope.** A siegeStartedDay on each settlement; on rollover, besieged for 2+ days becomes lost: an owner field flips to the raiding side (outlaw band or rival house), residents stay as the occupier's, caravan routes and the DialoguePanel deed/desk (DialoguePanel.tsx:284, :380) close, the garrison returns home wounded. A lost settlement shows on the travel map and in the Realm tab. Retake reuses G-16a's attacker runner at that destination against an occupier garrison scaled by the raid; victory restores ownership with a dispatch. Out of scope: AI rams at settlements.

**Builds on.** src/game/store/slices/empireSlice.ts:94-156; src/components/hud/DialoguePanel.tsx:284, :380; src/game/data/caravan.ts:72-80; G-16a runner; G-24a besieged state

**Depends on.** G-24a (wave 85.1), G-16a (wave 78.1)

**Risk.** A lost settlement must not break quests that assume it is owned (the founding chains and side quests).

**Verification.** vitest: besieged 2 days becomes lost; lost closes yield, caravans and desk; retake restores. Live on production builds of main and the change: besiege a settlement via hook, advance 2 days, travel there and win the retake via hooks.

**Owner decision.** OD-05 (A): if not relieved within about 2 in-game days the settlement changes hands and the retake reuses the hideout-storm encounter.

**Sources.** OPEN-021

#### G-26 — Settlement town plans

*Wave 86 · M · feature*

**What it gives.** Each settlement gets a town plan with plots for a granary, palisade and watchtower plus one site plot (an ore lift at Frozen Pass, a salvage yard at Old Ruins, a timber yard at Siege Camp). Each changes the site: goods instead of flat gold, a stronger garrison, earlier warnings, more housing.

**Scope.** Each settlement is a G-36 socket site with a 4-socket layout, rendered and solid at its destination as G-15b does. Asset check first: palisade and tower exist in the catalogue, but nothing reads as a granary, ore lift, salvage yard or timber yard; if site-plot models do not exist, the wave ships the three common plots and logs site plots as a follow-up. Yield routed by goods into the global inventory, storage-capped (empireSlice.ts:145-147 is gold-only; storage.ts:98-109). Palisade adds a garrison term in G-24a's resolver; watchtower lengthens warningLeadTime (G-04) and the siege dispatch lead; granary adds housing for G-23. Freeform building stays (OD-09). Plot positions checked against templateWalkableFootprint. Out of scope: per-world stores.

**Builds on.** G-36 sites; src/game/store/slices/empireSlice.ts:145-147; src/game/data/settlements.ts:97-119; src/game/storage.ts:98-109; src/game/data/caravan.ts:40; templateWalkableFootprint.ts; G-04 warningLeadTime

**Depends on.** G-36 (wave 67), G-15b (wave 77.2), G-24a (wave 85.1), G-23 (wave 83), G-25 (wave 84), G-04 (wave 70.2)

**Risk.** Plots must fit each claim's walkable cells and existing free builds.

**Verification.** vitest: layout validation per settlement; yield routing; garrison, lead-time and housing terms; save round trip. Live on production builds of main and the change: fill and build a plot at Frozen Pass via hooks, collect the yield (ore appears); screenshot the plot.

**Owner decision.** OD-09 (R): settlements stay free-build; town plans are additive.

**Sources.** idea: Settlement Town Plans: development and specialisation, OPEN-042

### Arc: The War of Two Houses

#### G-28a — New errand goal kinds: escort, reach, protect, capture, timed delivery

*Wave 87.1 · M · foundation*

**What it gives.** Errands stop being only fetch-and-kill: escort a traveller, reach a place, keep a villager alive through the next raid, bring back a prisoner, deliver before nightfall. Part a of the L item G-28.

**Scope.** Extend SideQuestGoal (cast/types.ts:76-82) with escort, reach, protect, capture (G-18a) and timed delivery, with counters in shared.ts bumpSideQuest. 'defend' already exists (types.ts:81, bumped by settlementRaid; settlements.ts:163, :245) and is not re-added. The dungeon captive (dungeonDirector.ts:22-49, CaptiveFigure in DungeonScene) is dungeon-only, so escort needs a new generic friendly follower component at destinations. One authored errand per new kind. Out of scope: the generator (G-28b).

**Builds on.** src/game/data/cast/types.ts:76-82; src/game/store/slices/shared.ts bumpSideQuest; src/game/directors/dungeonDirector.ts:22-49; src/game/data/quests/resolve.ts:12; G-18a capture

**Depends on.** G-18a (wave 80.1)

**Risk.** Escort nav at destinations.

**Verification.** vitest: each kind's progress events. Live on production builds of main and the change: accept and complete an escort errand via hooks.

**Sources.** idea: Procedural Errand Engine with new goal kinds, OPEN-044

#### G-28b — Errands from the state of the realm; calling hooks

*Wave 87.2 · M · feature*

**What it gives.** A generator reads the realm ('Old Ruins' granary is empty', 'a stronghold rises near the Pass', 'Frozen Pass is besieged') so every giver always has work that matters, and some errands appear only for the player's calling. Part b of G-28.

**Scope.** A seeded generator with save-stable ids (giver, template, day), since completedSideQuests is id-based, reading settlement plots (G-26), hideout strength (G-15a) and besieged or lost settlements (G-24a/b), merged in sideQuestsOf (resolve.ts:12, :36, :75). An optional `calling` field filtered in sideQuestsOf and a `calling` term on perk rows read where CALLING_FX applies (effects.ts:65; OPEN-045). One calling errand for each of 4 givers. Out of scope: stealth goals.

**Builds on.** src/game/data/quests/resolve.ts:12, :36-84; src/game/data/effects.ts:65-76; src/game/data/perks.ts; G-15a; G-24a/b; G-26

**Depends on.** G-28a (wave 87.1), G-15a (wave 77.1), G-24b (wave 85.2), G-26 (wave 86)

**Risk.** Id stability across loads and days.

**Verification.** vitest: generator determinism and id stability; calling filter; perk term in effects.test.ts. Live on production builds of main and the change: besiege a settlement via hook and see a generated relief errand at its giver.

**Sources.** idea: Procedural Errand Engine with new goal kinds, OPEN-045

#### G-29 — Chronicle Act II: the Bull's war

*Wave 88 · M · content*

**What it gives.** The chronicle no longer stops at 'Build the Grand Keep'. Act II ties the dragon omen, Cedric's capture and escape and the black dragon's siege to the new war: hold the keep against a raid on all fronts, breach a stronghold, relieve or retake a settlement, capture a nemesis captain. It branches by allegiance.

**Scope.** About 8 chronicle quests after paladins_keep (quests.ts:146-153; ranks.ts:63 gates Paladin on it). The set pieces are recurring random events (DragonOmen.tsx:208-219 rolls 40% nightly at tier 1+; dragonSieges count up, save.ts:133; Cedric's jailbreak rolls nightly), so Act II schedules scripted occurrences beside them through G-04's arbiter instead of suppressing or double-firing the loops; a save past paladins_keep enters Act II cleanly. Objectives use G-28a/b kinds and the G-16b, G-17a, G-24b milestones; allegiance picks the crown or Bull variant of two quests. Voice-bank lines where they fit, text otherwise. ChroniclePanel gains act headers. Out of scope: endings (G-34b).

**Builds on.** src/game/data/quests.ts:146-153; src/game/data/ranks.ts:63; src/components/world/DragonOmen.tsx:208-219; src/game/types/save.ts:133; src/game/cedricSiege.ts; src/components/world/BlackDragonSiege.tsx; src/components/hud/ChroniclePanel.tsx; G-04 arbiter

**Depends on.** G-28b (wave 87.2), G-17a (wave 79.1), G-16b (wave 78.2), G-24b (wave 85.2)

**Risk.** Scripted set pieces must not stack with a random roll the same night.

**Verification.** vitest: chain resolution for a fresh save and a past-paladins_keep save; branch selection; a scripted omen never coincides with a random one. Live on production builds of main and the change: load a finished-Act-I save and step the chain via hooks; screenshot the chronicle.

**Sources.** idea: The Chronicle, Acts II and III

#### G-30 — The War of Two Houses: a realm control map

*Wave 89 · M · feature*

**What it gives.** Each destination carries a Leo-versus-Cedric control value that drifts daily and moves with the player's deeds: errands, beaten raids, burned camps, breached strongholds, prisoners handed over, settlements held or lost. The travel map shades the front in house colours, and every shift says why.

**Scope.** A saved control table per destination (-100 to 100), mirrored in a 1 Hz snapshot like difficulty.ts. Daily drift from allegiance pressure (allegiance.ts:54-95), biased by the betrayal flags (storySlice.ts:59-68). Event deltas from G-07, G-16a/b, G-19 hand-overs, G-24a/b, caravans and errands, each with a reason written to G-25's dispatches. TravelPanel shades regions with HOUSE_COLORS (allegiance.ts:45-48). settlementRaiderKinds (settlementRaid.ts:76-85) and effectiveCaravanRisk (caravan.ts:54) read local control, falling back to the global scalar so existing saves and tests behave the same. Out of scope: prices (G-31), the battle (G-34a).

**Builds on.** src/game/data/allegiance.ts:45-48, :54-95; src/game/settlementRaid.ts:76-85; src/game/data/caravan.ts:54; src/game/store/slices/storySlice.ts:59-68, :80; src/components/hud/TravelPanel.tsx; src/components/hud/FactionTheme.tsx; src/game/difficulty.ts

**Depends on.** G-16b (wave 78.2), G-19 (wave 80.3), G-24b (wave 85.2), G-25 (wave 84)

**Risk.** Coexisting with the pledge and betrayal flags; drift must stay legible.

**Verification.** vitest: drift and deltas deterministic; scalar fallback unchanged; effect mapping; save round trip. Live on production builds of main and the change: burn a camp via hooks, advance a day, see the shade, the reason dispatch and a changed raider kind.

**Sources.** idea: The War of the Two Houses: a realm control map

#### G-31 — Regional markets and the settlement charter

*Wave 90 · M · feature*

**What it gives.** Each settlement gets a market with its own demand (ore cheap at Frozen Pass, war goods dear near a contested front, prices bent by who holds the region), so caravans become real trade. A settlement charter gives gold a late-game use.

**Scope.** A regional multiplier (base demand table x local control) composed with the existing marketPriceMultiplier (trade.ts:189) in pricing.ts. One resident per settlement runs a market through ShopPanel; guild vendor gates (guilds.ts:100-233) read control. Gold sink: a charter that unlocks an extra G-26 plot (mercenaries moved to G-16b). F-16's same-market floor property test is extended to every regional market; cross-market profit stays. Out of scope: per-item stock simulation.

**Builds on.** src/game/data/pricing.ts:21-49; src/game/data/trade.ts:~111, :189; src/game/store/slices/inventorySlice.ts:110-125; src/components/hud/ShopPanel.tsx:6, :76, :94; src/game/data/guilds.ts:100-233; G-26 plans; F-16 test

**Depends on.** G-30 (wave 89), G-26 (wave 86), F-16 (wave 64.5)

**Risk.** Inflation, bounded by the floor test and the charter's cost.

**Verification.** vitest: regional quotes by control; the floor holds in every market; the charter unlocks a plot. Live on production builds of main and the change: compare a quote at two settlements, flip control via hook, see the price move; buy a charter and see the plot.

**Owner decision.** OD-07 (R): the same-market floor from F-16 holds in every regional market; cross-market profit is intentional.

**Sources.** idea: Regional markets and gold sinks, idea: The War of the Two Houses: a realm control map

#### G-32a — The Rival Castle: a geometry probe, a breakable gate, and the siege

*Wave 91.1 · M · feature*

**What it gives.** The castle that is 'not one to besiege lightly. Yet.' can finally be besieged. Raise a siege camp, deploy your siege train and mercenary crews, and batter the overlaid gate and wall sections until they fall. A breach is a victory in its own right. Part a of the L/XL item G-32.

**Scope.** First a geometry probe of template-05 (a raycast grid over the one-mesh bake plus the walkable footprint) committed as data/rivalCastle.ts: whether the gate passage is open geometry, the wall runs, wall-walk heights, and the siege camp plot clear of Cedric's camp (world.ts:175 CEDRIC_WORLD). Breakable gate and wall sections are a G-36 site ('rivalCastle') of catalog gate/wall models placed only where the probe says the bake allows; while a section stands its footprint is removed from the walkable area, and a breach restores it. The probe also lists the bake objects (one per material) the gate and the wall runs are drawn in: a gate drawn in a material nothing else uses can itself be hidden at the breach, an honest opening. If the bake's gate is closed geometry, the gate section stands as an outer barbican and G-32b's ladders are the way in; the plan says this honestly rather than faking an opening. Siege train, crews and cannonball damage reuse G-16b at template-05. Registered with G-04's arbiter; victory on a breach with rewards and a G-30 control swing; the side follows OD-15. Out of scope: ladders and wall posts (G-32b), the storm (G-33a).

**Builds on.** src/game/data/worlds.ts:235-236; src/game/data/world.ts:175; src/game/templateGround.ts:99 raycastGroundY; templateWalkableFootprint.ts; G-36 sites; G-16b siege train; G-15b destination solids

**Depends on.** G-16b (wave 78.2), G-30 (wave 89), G-36 (wave 67), G-15b (wave 77.2)

**Risk.** Sections can look pasted on over the bake; GPU screenshots judge every placement. The probe may allow fewer sections than hoped.

**Verification.** vitest: probe data validates (sections on walkable cells, clear of Cedric's camp); section HP, ruin and walkable restore on breach. Live on production builds of main and the change: travel to template-05, raise the camp, deploy, fire via hooks until the breach; d3d11 screenshots of every section before and after.

**Owner decision.** Siege target (A): the Rival Castle is the war's climax with overlaid breakable sections where the bake allows, after a geometry probe. OD-15 (R): any allegiance may besiege. OD-01 (A), OD-04 (A).

**Sources.** idea: Take the Rival Castle: offensive siege warfare, owner: siege target (strongholds, then the castle)

#### G-32b — Ladders over the baked walls; crossbows on the wall-walk

*Wave 91.2 · M · feature*

**What it gives.** Where the bake's stone cannot break, you go over it: raise siege ladders against the baked walls and climb to the wall-walk, while the castle's crossbowmen shoot from their posts. Part b of G-32.

**Scope.** Player-side siege ladders placed against wall runs from the probe data: a ladder climb for the player (the existing climb is raider-only and home-only, climb.ts:62 'enemyAtHome') onto a wall-walk floor defined from the probe heights so the player stands on the baked walls. Ranged bandits (hitscan, engage.ts:33-37) on fixed wall posts, as in G-15b. Taking a section of wall-walk opens the courtyard approach for G-33a. Out of scope: enemy wall-walk AI beyond fixed posts.

**Builds on.** src/game/enemyAi/climb.ts:45-47, :62; src/game/playerPhysics/floor.ts; data/rivalCastle.ts (G-32a); src/game/enemyAi/engage.ts:33-37

**Depends on.** G-32a (wave 91.1)

**Risk.** Standing on a baked wall-walk needs a floor source that matches the mesh; the player must not float or fall through.

**Verification.** vitest: ladder placement only on probed wall runs; wall-walk floor heights. Live on production builds of main and the change: raise a ladder and climb via hooks, sample eye height on the wall-walk against the bake; screenshot.

**Owner decision.** Siege target (A): ladders over the baked walls.

**Sources.** idea: Take the Rival Castle: offensive siege warfare, owner: ladders over the baked walls

#### G-33a — Storm the courtyard and defeat the castellan

*Wave 92.1 · M · feature*

**What it gives.** After the breach or the climb, storm the courtyard against sallies that go for your engines, then face the castellan in his own fight. Part a of the L item G-33.

**Scope.** The courtyard phase runs on G-16a's attacker runner; sallies get new targeting that seeks deployed engines (waveDefense hostiles only chip plot HP). The castellan is a bespoke encounter component in the style of CedricSiege.tsx and BlackDragonSiege (bossEncounter.ts:18-31 only scales HP by tier), with phases and a reinforce point from a new bossEncounter row. Out of scope: holding the castle (G-33b).

**Builds on.** src/game/bossEncounter.ts:18-31; src/components/world/CedricSiege.tsx; G-16a runner; G-16b engines

**Depends on.** G-32b (wave 91.2)

**Risk.** Coexists with Cedric's camp and the jailed-Cedric figure at template-05.

**Verification.** vitest: sally target selection; castellan phase transitions. Live on production builds of main and the change: from a breached state, run the courtyard and castellan via hooks to victory.

**Owner decision.** OD-15 (R): crown-sworn take it for Leo, others for their own house.

**Sources.** idea: Take the Rival Castle: offensive siege warfare

#### G-33b — The Rival Castle as a prize settlement

*Wave 92.2 · M · feature*

**What it gives.** Victory makes the Rival Castle a holding: a fortress town that swings the control map and its region's raids. It can be garrisoned, planned, besieged and lost like any settlement. Part b of G-33.

**Scope.** foundSettlement (empireSlice.ts:94-120) requires a founding quest and a cost, so add a deed-sourced founding path. A holding entry for template-05 that can be garrisoned (G-24a), lost and retaken (G-24b), with a G-26 town plan including a garrison plot, and a large control swing. Cedric's camp becomes the outskirts, coexisting with the jailed-Cedric figure (CedricCamp.tsx:65-97). A defeat leaves the sections repairing over days. Out of scope: the castle changing hands outside OD-05's rules.

**Builds on.** src/game/store/slices/empireSlice.ts:94-120; src/game/data/settlements.ts:119, :370-371; src/components/world/CedricCamp.tsx:65-97; G-24a/b; G-26

**Depends on.** G-33a (wave 92.1), G-26 (wave 86), G-24b (wave 85.2)

**Risk.** A holding defined differently from quest-founded settlements must pass validate.ts.

**Verification.** vitest: capture adds the holding and swings control; validate.ts passes; defeat schedules repair. Live on production builds of main and the change: complete the castellan via hooks; the holding appears in the Realm tab with residents next visit.

**Owner decision.** OD-15 (R). OD-05 (A): the castle can be besieged and lost like any settlement.

**Sources.** idea: Take the Rival Castle: offensive siege warfare, idea: Five more settlements, each with a trade

#### G-34a — Chronicle Act III: the decisive battle

*Wave 93.1 · M · feature*

**What it gives.** When one house holds enough of the realm, the war comes to a decisive field battle: your garrisons and mercenaries against the enemy host and its champion. Part a of the XL item G-34.

**Scope.** Act III quests triggered by G-30 control thresholds plus Act II completion. A new field-battle core (waveDefense is plot-centric, waveDefense.ts:77) at King's Approach or the Tourney Grounds: allied fighters drawn from garrison rosters using G-24a's world-capable defenders, enemy waves streamed under a new enemy-count cap (raiders are enemy-store mobs, not lod.json agents), and a bespoke champion encounter (Leo's champion or Cedric's last stand) in G-33a's style. Registered with G-04's arbiter. Ends in a victory/defeat flag. Works for players who skipped the castle siege. Out of scope: endings (G-34b).

**Builds on.** src/game/data/allegiance.ts:54-95; src/game/waveDefense.ts:77; src/components/world/Defenders.tsx:116, :173; G-24a; G-33a encounter pattern; G-30

**Depends on.** G-29 (wave 88), G-30 (wave 89), G-24a (wave 85.1), G-33a (wave 92.1)

**Risk.** Battle scale against frame time; measure at the cap.

**Verification.** vitest: trigger thresholds; wave streaming under the cap; outcome flag. Live on production builds of main and the change: force the trigger and drive the battle via hooks; record frame time.

**Sources.** idea: The Chronicle, Acts II and III, idea: The War of the Two Houses: a realm control map

#### G-34b — Three endings, an epilogue, and NG+

*Wave 93.2 · M · content*

**What it gives.** The chronicle ends with the crown triumphant, the rebellion victorious, or the player's own house rising between them. An epilogue sums up the realm they built, and play continues in the changed realm with New Game+ offered. Part b of G-34.

**Scope.** Branch on allegiance band and control totals. Three ending flags change court presence (presence.ts), raider kinds and taxes without breaking existing court quests. Ending ceremonies use G-14b's non-rank ceremony variant with existing gesture clips and voice lines. An epilogue screen from stats (settlements, population, captains beaten, strongholds burned), a deed per ending, and the NG+ offer (ngPlus.ts:16-19). Out of scope: new voice, cinematics.

**Builds on.** src/game/data/cast/presence.ts; src/game/ngPlus.ts:16-19; src/game/store/slices/storySlice.ts:289-385; G-14b ceremony; src/components/hud/ChroniclePanel.tsx

**Depends on.** G-34a (wave 93.1), G-14b (wave 76.5)

**Risk.** Three branches triple the writing; flags must not break court quests.

**Verification.** vitest: branch selection; ending flag effects; epilogue stats; one deed per ending. Live on production builds of main and the change: force each branch via hooks and screenshot each epilogue; confirm free play resumes.

**Owner decision.** OD-16 (R): an ending plays a ceremony and epilogue that change the realm, then free play continues with NG+ offered.

**Sources.** idea: The Chronicle, Acts II and III

## Deferred, and why

Everything the survey found that this plan does not build. The next plan starts here.

- **G-35 + idea: Real horses: walk, trot, gallop, graze, and a true joust (OPEN-024)** — Visual depth with a procedural fallback, not a heavy hitter; horse clips are untested on the prop pivot code (OBJ via propRig vs the .glb Wildlife entries). Deferred with Festivals, which needs proven horse pivots anyway; F-03 fixes the visible team bug now and G-01 imports the clips.
- **OPEN-039 + idea: Five more settlements (River Landing, Tourney Grounds, Sister Keep, King's Approach)** — G-33b's Rival Castle holding and G-24b's lost and retaken settlements already exercise every realm system. River Landing needs the Wyeth dialogue clash resolved (DialoguePanel.tsx:284, :380 gate on npc.world) and three caravan routes; first settlement in the next plan.
- **OPEN-031 + idea: The War Band: a roster of companions** — COMPANION_ID is a hard-coded singleton across 7+ consumers and needs a save migration (XL). First arc of the next plan, built on G-10's bow and crossbow clips.
- **OPEN-038 + idea: The Deep Crypt: multi-level delving** — Needs a golden master of the crypt generator first; G-07's knock-out rules settle its penalty. Next plan.
- **idea: Field Command (squads and formations) + OPEN-014** — G-08 ships the rally order and tiered gear; squads sit on the Defenders.tsx FSM and need the reasoner-migration decision first, which has little visible gain alone.
- **OPEN-077 + idea: Ride the Road: real journeys and escorted caravans** — Needs a new scene quadrant and terrain strip; G-28a's escort and G-30's caravan risk are steps toward it.
- **OPEN-059 (drawbridge/jail/springboard rigs)** — G-18b uses an overlaid bars piece; animated hinges need GLB node inspection or rig-lab work.
- **OPEN-090 + idea: Save slots and scenario starts** — Follows F-08a/b; a route and schema change with migration into slot 1, less valuable than the gameplay loops.
- **OPEN-103 (licensed or commissioned music)** — No music exists in the extraction and nothing new can be made; OD-13 ratifies ambience-only and F-10b renames the slider.
- **GAP-asset-payload, OPEN-086, OPEN-010** — Load-time platform work; G-01 keeps voice on demand. Cache headers, meshopt and a service worker deserve their own measured plan; KTX2 stays blocked.
- **idea: Lord's Court: petitions and judgments in the great hall** — Value 4 and content-heavy (14+ authored petitions); stronger once G-19, G-24a/b and G-30 give judgments levers. First in line for the next plan.
- **idea: Living Voices + OPEN-032/OPEN-033** — Phase 2 needs an LLM product decision; phase 1 template barks are stronger once G-07 and G-21 produce memorable events.
- **idea: Realm Events Director (event content)** — G-04 builds the arbiter it needs; event content comes after raids, storms and sieges exist.
- **idea: Seasons and weather that bite + weather panel** — Longer seasons shift difficulty gates; better after G-20/G-21 give winter stakes.
- **idea: Festivals and the Royal Calendar** — Needs mounted knights and the 281-frame joust clip; pairs with the deferred horse gaits.
- **idea: Darkness matters: light, stealth and night operations** — Perception gating changes every fight; too risky beside the raid rework.
- **idea: Expeditions: send your people out** — G-24a garrisons and G-25 dispatches already put the roster to work off-screen; expeditions reuse both next plan.
- **idea: Renown and the endgame threat ladder** — Partly delivered by G-17a captains and G-15 strongholds; a formal tier-6+ ladder is tuned after Act III.
- **idea: Rival Lords: asynchronous homestead sieges** — XL; needs the offensive siege kit proven (G-16b, G-32a), an opt-in consent design and a sturdier store than the JSON-file DB.
- **idea: Arena and grounds records, with server leaderboards** — The one feature using the 'async features that read stored saves' allowance; an M item that competes with the owner's chosen arcs for slots. First async item in the next plan.
- **idea: Siege Engineering: ammunition, upgrades and engine crews** — Builds on G-16b's siege train and mercenary crews and G-32a's castle siege; tuned once sieges exist. F-11 leaves ammunition out.
- **idea: The dragon flies for real, and Cedric rides it** — Dragon clips untested on the rig; the rider seat waits on OPEN-002 (blocked).
- **G-11 burns (dragon breath on figures, anim_g_burnt)** — Dragon breath never touches a figure today (dragonfire.ts:68-92 only damages buildings); a breath-vs-figure hit test is a separate change.
- **G-21 socialize pairing** — Mutual reservation and facing between independently reasoning agents is the hard part with little gameplay; warmth and morale ship without it.
- **G-22 chapel and tinker idle; idea: Civic buildings (well, granary as a building)** — G-22 ships the tavern and infirmary; the chapel's dawn buff and the tinker idle are lower value, and a well or granary needs a consumer such as spoilage.
- **G-01 remaining mechanism sounds (cart and team wheel loops snd058/061/083, shutters snd024/025, drawbridge snd062, gusts snd085/088)** — Cheap but polish; G-01 ships snd060 and snd084 and G-18b the jail door. A small follow-up whenever a wave touches those files.
- **OPEN-023 (player-rotated keep)** — G-36's helper takes a rotation from the start, so the rotate-while-moving interaction is now unblocked and small; not a heavy hitter.
- **idea: Households and population growth (pairing and children)** — G-23 ships arrivals; children need a youth look the assets lack, and mixed-donor heads float (OPEN-102).
- **idea: The Guarded Treasury and castle traps; idea: Chrome Relics of the Kingdom** — Axe and tipping parts have no rig roles; chrome needs an environment map and a gem item, best with the Deep Crypt.
- **GAP-a11y** — A full accessibility pass is its own audit; F-10a fixes the hint and input-mode truth it would start from.
- **Value-2 survey items: GAP-session-secret, OPEN-027, OPEN-034, OPEN-043, OPEN-049, OPEN-052, OPEN-058, OPEN-062, OPEN-081, OPEN-082** — Low value or no consumer in this plan; OPEN-076 rides in G-02, OPEN-088 in G-25, OPEN-079 in F-06.
- **Value-3 ideas: Rank privileges, Personal arcs, Guild Masterworks, Horse breeding, Alchemy, Decor prosperity, Heralds, Mounted court and raiders, Pilot mode, Richard's voiced tips, Bat swarms** — Each is a self-contained add-on competing for slots the owner gave to the five arcs; horse and mounted ideas wait for horse gaits, voiced tips for help-system voice.
- **BUG-8779, OPEN-065, OPEN-066, OPEN-067, OPEN-068** — The latent terrain cluster stays parked; nothing stands on raised home ground and OPEN-065 was declined.
- **OPEN-001, OPEN-002, OPEN-003, OPEN-005 to OPEN-009, OPEN-011, OPEN-012** — BLOCKED_EXTERNAL: source files, rig roles or tooling absent from the extraction. OPEN-004 is NOT blocked and ships in G-01.

## Facts this plan rests on (verified 2026-10-31)

Checked in the code or on disk while this plan was made; each one changed what the plan could promise.

- **The original game's extraction holds far more than the remake imports.** The sibling repository
  `d:/CODING/THREEJS/knightskingdom/knightskingdom/resources/model_files/extracted` has 92 animation clips (15 imported:
  the "15-clip ceiling" in the docs and in code comments is wrong), 92 sounds (46 imported; snd060 Trebuchet Firing is
  there, so OPEN-004 is not blocked), 196 voiced challenge lines with transcripts (11 used), 150 voiced help lines, and
  `sound_map.csv`, which ties each sample to its object. The copy lists live in the gitignored
  `scripts/prepare-assets.mjs`, so G-01 moves them into a tracked manifest. No music exists anywhere in the extraction,
  and nothing new — models, textures, clips, voice — can be made.
- **A destination is one baked glTF mesh.** Every world file is one node and one mesh, with one primitive per material
  (35 to 82 per template; three.js loads each primitive as its own object, hence names like `mesh_0_47`). A part of a
  bake can be hidden, raycast or replaced on its own only if nothing else shares its material; nothing in a bake can
  break or move. Hence the siege breaches catalog-built strongholds first and overlays breakable sections on the Rival
  Castle (whose geometry is probed before that wave), and the hillside fix judges slopes from floor continuity unless a
  ground-only material can be raycast.
- **The keep is a singleton.** `KEEP_SOCKETS`, `damageKeepNear`, `ramCheck` and `damageKeepPart` all assume one
  `st.keep`, and a keep piece at 0 HP is deleted with a half refund (`store/slices/keepSlice.ts:149-158`). So ruins and
  repair land before any raider batters a wall, and a multi-site socket state is a foundation item of its own.
- **What stops a walker is decided in four places, from four lists** (player collision, the nav grid, line of sight,
  enemy movement). Only the merchant avoids the village huts and the trees, through `nav/wideSolids.ts`.
- **Defenders exist only at home** (`components/world/Defenders.tsx:116`, `:173`); **a downed villager, defender or Tam
  is made invisible** (`game/actorDowned.ts:28-33`); **dragonfire never damages a figure, and the ram never hits one** —
  knockdowns start from the finisher and from explosions.
- **`MAX_VILLAGERS = 6` is one cap across every world** (`data/villagers.ts:204`, checked against the whole roster at
  `store/slices/villagerSlice.ts:202`): founding all three settlements already blocks home arrivals.
- **The raid directors' state lives in React refs** (`components/combat/Enemies.tsx:118-122`), so leaving the game
  screen forgets a raid (BUG-8726).
- **The rig chart is generated and gitignored** (`public/assets/rigs/part_roles.json`): role fixes go in code
  (`src/lib/rigParts.ts`), never in the JSON.
- **A save sent as the tab closes is capped at 64 KiB** by whichever API sends it (`sendBeacon` and `fetch` keepalive
  share the quota), so a large signed-in save needs a local shadow copy reconciled at the next load.
- **Every world bake, prop and sound is local-only** (`public/assets/` is gitignored and regenerated by
  `npm run prepare-assets`), so CI never sees assets: a wave that needs a new asset ships its manifest change and code
  together, and its evidence pass runs on this machine.


## Appendix: what verification changed

The editor's log of every material change between the judged draft and this plan (verifier verdicts, the completeness critic, the owner's answers).

- **F-01, F-17** — Added F-17 (a knock-out mid-raid is paid as a win) and shipped it in F-01's PR 62.1, using a raidLost cell in F-01's director state. *(The G-07 verifier found that on main a knock-out clears the raid and the next tick pays the win (raidDirector.ts:65-82), which is a live exploit. Both bugs are in the same director bookkeeping, so they qualify as closely related bugs sharing one PR.)*
- **F-02, F-13** — F-13 (cart glue, OPEN-025) moved into F-02's PR 62.2. Removed F-13's false claim that walkers meet the live cart through nav. Swapped nearestOpenCell for nearestWalkable (grid.ts:613) and gave the solids list a per-world key. *(These are two closely related logged bugs in the same collide.ts loop, which frees a PR. Verifiers found the nav claim false and nearestOpenCell nonexistent. The world key is needed later for strongholds and the Rival Castle.)*
- **F-06, F-08b** — F-06 keeps the boundaries, error log, crash hooks, probe listener and the #177 hunt. Its recovery slot and the 'Restore' menu flow moved to F-08b, which shares one localStorage slot mechanism with the tab-close shadow copy. F-06 also deletes the dead 'commands' PanelId (OPEN-079). *(The critic called F-06 borderline L. The recovery snapshot belongs with save robustness. OD-17 and the critic both put OPEN-079 into housekeeping, and F-06 touches the panel dispatcher.)*
- **F-07** — The test step goes inside the existing required 'verify' job ('Typecheck & build', ci.yml:62). Removed the 'owner marks the check required' step and most of the quarantine risk. *(The verifier showed ruleset 19820810 already requires that check, and that no test reads assets or depends on Windows. OD-11 (R) settles the placement.)*
- **F-08a, F-08b** — F-08 split into F-08a (result type, Save & Quit dialog, retry chip with single-timer backoff) and F-08b (pagehide flush, a localStorage shadow copy reconciled at fetchSave, a beacon POST for saves under about 60 KiB, the recovery slot, and the OD-12 clock change). The keepalive fallback was dropped. *(The verifier showed fetch keepalive shares the same ~64 KiB cap as sendBeacon. The critic flagged the item as borderline L. The OD-12 change is only safe once a tab-close flush exists, so it moved to the second part.)*
- **F-09** — carriedKeepExtra now reaches buildSave through SaveLeaves (buildUndo is module state). Added a fix for the wrong persistence.ts:35 comment. The source was re-attributed to the brief's literal-version defect, since GAP-save-versioning is closed. The dead stabled/mounts store copies are deleted here per OD-17. *(Verifier corrections, the critic's coverage note, and OD-17 (R) (F-09 touches persistence.ts).)*
- **F-10a, F-10b** — F-10 split into F-10a (KeyG collision with a narrow migration, a conflict warning, hints that follow bindings and device via a new interactLabel signature, the touch toggle honouring inputMode) and F-10b (Escape on Options, Credits and Help only, plus the 'Ambience' relabel). Fixed the hook path to src/components/build/useBuildHotkeys.ts and added HelpStack.tsx:25's wrong 'hold E'. *(The critic said the item bundled about five defects; this keeps bug groups related. Verifier corrections. Stats Escape is left to G-25, which removes the Stats stack, to avoid throwaway work. OD-13 (R).)*
- **F-11** — Credit now comes from an explicit byPlayer argument: true from locomotion.ts:99 and performAction.ts:198, false from Emplacements.tsx:90, with villager-manned posts counting as automatic. Every charge pays full. *(The verifier showed aimYaw does not mean crewed: the automated turret passes it, and the player's interact does not. The owner's OD-04 (A) says player-placed charges pay full, which overrides the verifier's split-by-trigger suggestion for charges.)*
- **F-12** — The transcript check now normalises 0x92 quotes and whitespace, has one stutter exception (c1s04t2a), and uses a committed table as the source of truth. The audio id stays misnamed. *(The verifier showed an exact-match test would fail on day one, and that CI cannot read the sibling repo.)*
- **F-16** — New Ground Truth item: a same-market haggle floor with a property test over uncapped haggle, at wave 64.5. *(OD-07 (R) moves the floor into Ground Truth. The critic flagged a roughly 40-PR exploit window. The G-31 verifier showed there is no 'maximum haggle', so the floor is relative to the same market and the current haggle.)*
- **F-14** — The ticks stay in PlayerController while it is mounted and unfrozen. WorldTicker runs them only when the controller is frozen or unmounted, behind a one-owner-per-frame gate. px/pz come from the playerState leaf in build mode. *(The verifier cited worldTick.ts:6-13's before/after-targeting ordering constraint and the controller unmounting in build mode.)*
- **F-15** — Rescoped from a terrain-height classifier to floor continuity (dy against horizontal distance over recent frames). *(The verdict was wrong_premise: destination bakes are one merged mesh, so no terrain-only height exists to compare against.)*
- **F-18** — New Ground Truth item: count home villagers only against MAX_VILLAGERS and villagerRequirement. *(The G-23 verifier found that founding three settlements (9 residents) already blocks every home arrival and recruit, a live bug that G-19 and G-23 stand on.)*
- **G-01** — Kept as one PR, limited to the manifest, the imports, a new on-demand voice/SFX loader outside the eager preload, an audio play log, and the snd060/snd084 wiring. The extra-tracks work became a test only. Payload figures corrected (about 7.5 MB clips, about 1 MB SFX, about 50 MB voice loaded on demand). OPEN-054 stays open. The other mechanism sounds are deferred, and the jail door moved to G-18b. *(Verifier corrections: audio.ts preloads every SOUNDS entry, loadClip already ignores extra tracks, and there is no play log yet. The critic said G-01 read as L, and the PR budget needed trimming.)*
- **G-36** — New foundation item at wave 67: a SocketSite state with layouts, siteSocketWorld with rotation (absorbing fort.ts:133-142), the keep as site 'keep' with its save shape unchanged, an optional `sites` save field, generic damage and fill paths, and SiteAssembly. *(The owner's siege restructure (OD-18) asks for one multi-site socket model shared by strongholds, town plans and the Rival Castle. It also resolves the critic's keep-rotation hidden dependency (OPEN-023) and gives G-05 the keep-ruin save field.)*
- **G-05, G-02** — G-05 moved before G-02 (68 then 69). Its causes were corrected to ramCheck siege.ts:221, fireEngine blows.ts:206, the CedricSiege engines, and raider blows on keep parts. It adds a keep-part ruined state (on G-36), a baseType for repair, and the OD-01 breach semantics in owner_decision. *(The owner requires ruins and repair before any raider batters a wall. The critic confirmed the regression window (damageKeepPart deletes at a half refund) and the missing keep ruin field. The verifier found the listed causes wrong and that b.type gets overwritten.)*
- **G-02** — Reuses G-36's helper. Adds a new keep gatehouse open/shut state with a toggle, and ramCheck bursts it. Skips the hall socket. Owns the single raider fallback (gatehouse preferred, capped retargets). Folds in OPEN-076. Cited lines corrected. *(The verifier found no gatehouse state, the existing fort.ts footprints, and duplicated KEEP_INTERIOR collision. The critic flagged the duplicate fallback between G-02 and G-03, and OPEN-076 had no home.)*
- **G-03** — Now states that foot raiders already come by road. The ram gets a real path, and a raider-to-damageBuilding blow path covers player-built walls. Uses nearestWalkable, and the fallback is an extension of G-02's single function. *(Verifier corrections and the critic's duplicate issue.)*
- **G-04** — Away raids are notify-only, since raids already resolve while away. The arbiter generalises CedricSiege.tsx:204-211 and dragonAir.busy. Added one warningLeadTime(site) function and a new onDayRollover hook from DayNight.tsx:72 and sleep. *(Verifier corrections. The critic's duplicate warning mechanics are resolved by one function. G-15a, G-23 and G-24a needed the missing day-rollover hook.)*
- **G-06** — Theft is now uncapped and time-based. A new pathed escape to roadEntry despawns only at the map edge, a carry prop sits on the raider's rig, and a saved plunder ledger feeds G-16a. Added the G-04 dependency. *(OD-02 (A) HARSH supersedes the capped design. The verifier showed flee() is player-relative and despawns 44 m from the player. The critic listed the missing G-04 dependency.)*
- **G-08, G-07** — G-08 now ships before G-07 (72 then 73). It adds loadoutTier with tier stock, an exported MELEE_TIERS helper, a difficultyState snapshot, the rally point at the player's look point via a pure helper, and a neutral 1.0 courage multiplier that only G-21 drives. *(G-07's resolver reads G-08's pinned table, so G-08 must come first. Verifier corrections. The critic's three-courage-terms issue is resolved by a single multiplier.)*
- **G-07** — The resolver returns held, pressed or lost. A lost raid razes buildings with no refund, scaled by raid strength (never the foundation). Away raids are measured and then settled by the same resolver. The chronicle entry was replaced by a report panel that G-25 archives. It replaces F-17's interim fix. *(OD-02 (A) HARSH. The verifier found the win-payout bug and that no event chronicle exists.)*
- **G-09** — Kept as one PR. Adds a new subtitle overlay and a new player-to-NPC proximity check for collision barks, plus a new CedricCamp proximity trigger. Line ownership comes from the manifest, so c5s04 lines belong to G-14b. OPEN-101 dropped from sources. *(The verifier found collide.ts has no actor collision, that no subtitle system exists, and that OPEN-101 is unrelated. The critic flagged the G-09/G-14 duplicate line use.)*
- **G-10** — Hitscan release becomes a damage-timing delay for enemies and defenders, with projectile alignment for the player and caster only. spearthrow stays unused, the 7-joint limit is noted, loadouts are matched to sword_shield/halberd/bow, and OPEN-050 was dropped from sources. Kept as one PR. *(Verifier corrections. Size is ok per the verifier, and the PR budget needed it.)*
- **G-11** — Rescoped to finisher and explosion triggers, plus a new small ram-head contact test. The knocked state applies to enemies only, and villager/defender downed stays invisible. Burns deferred. *(Verdict needs_rescope: dragonfire never hits figures, the ram never hits figures, and downed actors are invisible by design.)*
- **G-12a, G-12b, G-13** — G-12 split into G-12a (runner, Challenge I via a presence override, saved progress, `requires` with a grandfather rule, Trials, deleting scheduledCourtNpcs per OD-17) and G-12b (Challenges II-III, with c2_wall and c3_cannon catalog entries and a generalised push check). G-13 is now Challenge IV only: a moving tower entity with its own hit test, crew at a scoped destination, and a scripted non-AI column. *(The critic said G-12 read as L and needed a grandfather rule. The verifiers found the court NPC single-instance issue, that c3_cannon is not buildable or pushable, that defenders are home-only, and that the tower needs its own hit test. Merging Challenge III into G-12b saved one PR.)*
- **G-14a, G-14b** — G-14 split. G-14a imports the c5 OBJs via the manifest, makes setBuild's cache return clones, and defines the plan in code with OWNER mapping. G-14b covers Challenge VI and a non-rank ceremony. The jail is one registered jail among Jail Cell and Jail Tower. *(Verdict needs_rescope: setBuild needs OBJ, the pieces are single bricks, the cache returns the same instances, and the ceremony is rank-keyed. OD-10 (R).)*
- **G-15a, G-15b** — G-15 split into G-15a (record, lazy growth on the day hook, pressure, POIs with a widened Poi type) and G-15b (camps, and strongholds built from castle-set pieces as G-36 sites, solid at destinations, with wall-post crossbowmen). Hideouts are outlaws hostile to every allegiance (new OD-20). *(The verifier rated G-15 undersized (no rollover hook, Cedric-only campGuards, NPC-shaped Poi, allegiance conflict). The owner's siege choice (OD-18) makes strongholds the first siege target.)*
- **G-16a, G-16b** — G-16 split into G-16a (a new attacker-side runner reused for retakes and the castle courtyard, new burn code, a plunder-ledger share) and G-16b (siege train, engines at the destination, sections breached through damageSitePart, mercenary crews moved here from G-31). *(Verdict needs_rescope: waveDefense is hold-the-plot, dragonfire works only on home buildings, and no plunder ledger existed. OD-18 places mercenaries and the first siege here. Mercenaries as engine crews give the gold sink an immediate use without allied melee AI.)*
- **G-17a, G-17b** — G-17 split. G-17a adds captains, per-instance identity (name, figure override, HP and damage), leader selection, and promotion on escape or G-07 outcomes. G-17b adds traits (firebrand via fireSpellBolt), trophies and a captains bestiary section. Capture moved to G-18b. *(The verifier rated it undersized (per-kind data, kind-keyed bestiary, no enemy archers). The critic noted capture does not exist until G-18.)*
- **G-18a, G-18b** — G-18 split. G-18a adds a new enemyAi bound-follow mode and delivery to any registered jail. G-18b adds an overlaid bars piece with snd063, prisoners in the cell interior, and captain capture. The hard G-14 dependency was dropped. *(Verdict needs_rescope: single-mesh cells, snd063 not imported, followLeader is not enemy AI, and Cedric's rendering is not reusable. The critic said G-18 should not hang on the optional campaign.)*
- **G-19** — Reform now uses a generalised recruit under F-18's home cap. The jailbreak is new logic. Ransom has its own capped table, and the OD-07 link was dropped. Added the G-03 and F-18 dependencies. *(Verifier corrections and the critic's note that the price floor is the wrong control for ransom.)*
- **G-20** — The pace effect goes through bb.tripSpeedMult. The courage term is dropped in favour of feeding morale. Hunger is persisted per villager, and the reasoner is the only consumer. *(The verifier showed the trip timer is skipped by AI workers, villagerStrike is flat by documented design, needs reset on load, and tier D already thinks.)*
- **G-21** — Uses the existing morale need plus a saved store aggregate. Cold means winter or the Frozen Pass. Courage applies only through G-08's multiplier, with a re-pin. Socialize pairing deferred to keep it one PR. *(Verifier corrections and the critic's courage and size issues.)*
- **G-22** — Trimmed to the tavern and infirmary, behind an asset check first. Villager effects sit at exterior anchors, and the infirmary halves DOWNED_RECOVER_MS at blows.ts. Chapel and tinker deferred. Added the G-01 dependency. *(The verifier rated it undersized with a weak asset premise and player-only pocket interiors. The critic listed the missing G-01 dependency.)*
- **G-23** — Builds on F-18's per-world fix and G-04's day hook. Yield already reads residents, so only the caravan cap is new. rosterSync stops spawning agents for unvisited worlds, portraits become snapshots, and the cap is uniform (new OD-21). Added the G-22 dependency. *(The verifier rated it undersized (global cap bug, no rollover hook, every villager has an agent). The critic flagged the graphics-tier gameplay coupling and the missing G-22 dependency.)*
- **G-25** — Moved before G-24 (wave 84). Stats is re-hosted in a PanelFrame with new PanelIds, and the dispatch log is new saved state. Takes Stats' Escape. OPEN-088 folded in. *(The verifier noted StatsStack is a full-screen layout and no event log exists. The ordering lets G-24's ravens write dispatches directly. The critic found OPEN-088 unassigned.)*
- **G-24a, G-24b** — G-24 split into G-24a (a post-to-garrison action, world filtering in Defenders/OrderRadial/OrderStatus/giveDefenderOrder, an off-screen strength model, a besieged state with saved wounds, relief) and G-24b (loss after about 2 in-game days, changing hands, retake via G-16a's runner). *(OD-05 (A) 'besieged, then lost' supersedes 'ownership never changes'. The verifier rated it undersized: no per-settlement stores, no strength number, home-only defenders, runtime-only downed state.)*
- **G-26** — Rebuilt on G-36 sites and G-15b's destination rendering, behind an asset check first (site plots may slip to a follow-up). Reads G-04's warningLeadTime. Added the G-25 and G-04 dependencies. *(The verifier rated it undersized for generalising the singleton keep, which G-36 now does. The critic flagged the duplicate warning mechanics and the missing dependency.)*
- **G-28a, G-28b** — G-28 split into goal kinds (no second 'defend', a new destination follower) and the realm-reading generator plus calling hooks. G-28b depends on G-26 and G-24b. *(The verifier found 'defend' already exists and the captive follower is dungeon-only. The critic said G-28 read as L and was missing the G-26 dependency.)*
- **G-29** — Act II schedules scripted set-piece occurrences through the arbiter beside the recurring random rolls instead of 'never firing twice'. The River Landing milestone was replaced by stronghold-breach and relief/retake milestones. *(The verifier showed the set pieces are recurring random events. G-27 is deferred.)*
- **G-30** — Kept as one PR, with a scalar fallback for settlementRaiderKinds and effectiveCaravanRisk. *(The verdict was holds (size ok); the fallback answers the verifier's hardest-part note on existing saves and tests.)*
- **G-31** — Rescoped to a regional multiplier composed with marketPriceMultiplier, settlement markets, and the charter sink. The haggle floor moved to F-16 and is extended per market. Mercenaries moved to G-16b. *(Verdict needs_rescope: no maximum haggle exists and a cross-market floor contradicts regional trade. OD-07 (R). The critic noted mercenaries had no consumer at wave 85.)*
- **G-32a, G-32b** — G-32 is now a geometry probe of template-05 followed by overlaid breakable sections only where the bake allows (honest barbican fallback), with the siege reusing G-16b (G-32a). G-32b adds player ladders over the baked walls with a probed wall-walk floor, plus wall posts. *(OD-18 (A) siege structure. Verdict needs_rescope: singleton keep model, immutable bake, hitscan rangers, home-only solids and climb.)*
- **G-33a, G-33b** — G-33 split into a bespoke castellan encounter with engine-targeting sallies on G-16a's runner, and a deed-sourced founding path for the prize settlement, which can be besieged and lost per OD-05. *(Verdict needs_rescope: bossEncounter is only a scaling table, waveDefense targets plots, and foundSettlement requires a quest and a cost.)*
- **G-34a, G-34b** — G-34 split into a new field-battle core with an enemy-count cap (not lod.json) and garrison allies via G-24a, then endings, epilogue, deeds and NG+. owner_decision fixed to 'OD-16 (R)'. *(The critic rated it XL and found the owner_decision text garbled. The verifier found waveDefense plot-centric, defenders home-only, and the wrong budget named.)*
- **G-35** — Deferred, paired with Festivals. *(The critic said it is polish with a fallback, and the honest splits needed the PR budget. The owner's brief asks for heavy hitters.)*
- **G-27** — Deferred (River Landing). *(It made room for the honest splits within about 60 PRs. G-33b and G-24b already exercise the realm systems, and the Wyeth dialogue clash (DialoguePanel.tsx:284, :380) and three caravan routes the verifier found make it bigger than planned.)*
- **OD-01, OD-02, OD-03, OD-04, OD-05, OD-06, OD-07, OD-08, OD-09, OD-10, OD-11, OD-12, OD-13, OD-14, OD-15, OD-16, OD-17, OD-18, OD-19, OD-20, OD-21** — Every decision is now listed with (A) or (R) and its answer as the recommendation. Added OD-18 (siege target), OD-19 (run mode), OD-20 (outlaw hideouts, R) and OD-21 (uniform population cap, R). OD-17 now also covers OPEN-079, and each item's owner_decision names the resolved answer. *(The task requires owner decisions to be stated as answered. Two new design calls surfaced by the verifier (G-15 allegiance conflict) and the critic (G-23 graphics-tier cap) are settled by recommendation so the owner can override them.)*
- **G-06, G-23, G-26, G-28b, G-22, G-19** — Filled the missing depends_on entries: G-04 to G-06, G-22 to G-23, G-25 and G-04 to G-26, G-26 to G-28b, G-01 to G-22, G-03 and F-18 to G-19. *(Critic issue on hidden dependencies, plus verifier notes.)*
- **deferred** — Added deferred rows for G-35, G-27, G-11 burns, G-21 socialize, G-22 chapel and tinker, G-01's remaining mechanism sounds, OPEN-023 player rotation, GAP-a11y, arena and grounds leaderboards, Siege Engineering, and grouped rows for the value-2 items and value-3 ideas. Removed rows now covered by items. *(Critic coverage issues: every unplanned survey item or idea now has a reason.)*
