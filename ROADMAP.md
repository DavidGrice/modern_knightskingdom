# Knights' Kingdom — Roadmap

The living plan for the LEGO Creator: Knights' Kingdom (2000) remake. Everything is grounded in
assets that actually exist in the extraction (`resources/model_files/extracted/…`).

> **Full implementation history**: the original phase-by-phase roadmap, with per-item implementation
> notes, file references and honest scope corrections, is preserved verbatim in
> [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md). Asset-identification ground truth lives in
> [`BRICK_CATALOG.md`](./BRICK_CATALOG.md). This file is the *clean* view: what's done, what's next.

**Status tags:** `[COMPLETE]` = shipped and verified · `[TODO]` = not yet built · `[TODO — VERIFY]` = signals conflict, needs a human check.

---

## 🔎 Reconciled status — 2026-09-23 [CURRENT]

A full codebase-vs-roadmap reconciliation pass (16 independent readers covering every line of this file, each open item then checked against the real, current code) ran on 2026-09-23. It found that the large majority of items this file's scattered [TODO]/'left open'/'not started' markers point to were actually shipped in a later wave and simply never retagged. **This section is now the single source of truth for what remains open** — the older per-wave sections below are kept for their implementation detail and are NOT reliable status indicators on their own; several are explicitly marked ⚠️ SUPERSEDED where their header tag actively disagreed with their own body.

A companion document, [`CLEANUP_PLAN.md`](./CLEANUP_PLAN.md), covers the *codebase* (not feature) cleanup this pass also produced — 35 concrete refactor initiatives to make the ~65k-line src/ tree easier to extend and scale.

### Shipped, by era (Phases 20 onward — Phases 0–19 recap is unchanged, just below)

**Phase 20 — Homestead becomes one instance among many (2026-07-18/19)**
- Home moved onto the Template-09 (Far Meadow) bake at the existing origin
- Court NPCs evicted to their own destinations (King/Queen to King's Approach, Richard to Tourney Grounds, John to River Landing)
- Storm, Cedric's camp, and jousting relocated to their own dioramas with terrain-following placement
- CourtDressing set-pieces (throne dais, joust lists, dock crates) grounded per-frame on bake terrain
- Location-based wayfinding, location-exclusive side quests, and 3 new travel main-quest beats

**Phase 23-25 — Instance discipline, Living Homestead, Prefabs tier (2026-07-19 to 2026-08-06)**
- Per-instance minimap, positional mob audio, and an exclusive NPC voice channel
- Living Homestead v1: hash-derived villager attributes, visible labor loops, Command Wheel orders
- Grok-pipeline capability data consumed for DragonOmen wing-bone rigging
- New Prefabs buildable tier (Castle Wall/Corner/Tower, Breached/Ruined Wall, Armory, Weapons Rack)
- Wave 8: oc-series set pieces (Jail Cell/Tower, Jewel Tower, Drawbridge) plus wall-connection latching

**User batches #1-#8 and the GUI overhaul (2026-07-19/20)**
- Fixed remote-plot buildings bleeding into the homestead render/count
- Armory system + NPC paperdoll with real HTML5 drag-and-drop
- Quest Log regional overhaul (per-realm collapsible giver sections)
- Mobile pass v1: virtual joystick, touch look, responsive ≤720px layout
- Real wall collision (WALL_CORE) for mc-series walls/towers
- Beda & Alric village-folk recruitment
- 4-theme kk-tokens/kk-screens/kk-lanes GUI overhaul and build-menu relocation

**Blocks A-M — Rig/lab pipeline and Assembly Workshop (2026-07-25/26)**
- capabilities.json + labCapabilities.ts data layer (86 verified assets) driving firing/detonation/destruction
- Real first-person rig arms pinned to donor wrist/shoulder sockets
- Per-part hitboxes and voxelized collision.json for every named brick
- Allegiance axis (-100..+100) with 7 bands feeding quest gating
- Land-tier ladder (Smallholding to Barony) and a 160-piece buildable catalog
- Assembly Workshop: 9 sets, 38 modules, 688 steps built from real GLB geometry

**Blocks K-L and the Grand Keep (2026-07-26)**
- Playtest round fixing road-plate geometry, wall-collision rotation, night watch, and boundary-stone deeds
- Grand Keep assembled from real sockets with HP, siege damage, refunds, and pick-up/relocate
- Defenders stationable on keep walls via socket-based stationIds
- Ribbon-road layout reversed to a proper 4-plate tile network (L71)
- Mirrored road-bend fix after discovering flat prints render east-for-west

**NPC AI Phases 1-8 (2026-07-27 to 2026-08-11)**
- Agent/Blackboard/Scheduler skeleton with a debug overlay and think-rate/budget smoke tests
- Navigation, actuation/animation splicing, and a utility-based reasoner (30-iteration build)
- AI economy correctness: trip bonuses, seek_deposit, herbalist/fisherman jobs, tend_farmplot
- Perception (vision/hearing/belief), take_cover/engage_threat, LOD tiers and ambient wander
- Companion (follow_leader) deliberately scoped down to its own later dedicated wave

**Waves 4-19 — Empire slice 1, dioramas as destinations, mobile UX, travel overhaul (2026-08-03 to 2026-08-19)**
- First settlement (The Old Ruins) with Fenwick's errand chain and wall-clock yield collection
- 6 challenge maps and 9 template dioramas wired as full travel destinations (with Y-flip/scale fixes)
- Wave 15: touch combat, gamepad support, input-mode-aware UI, PWA manifest, responsive layout
- Wave 14: waypoint/POI/fog-of-war plus an illustrated parchment travel map
- Quality-tier performance system (Performance/Balanced/Ultra) with per-frame allocation cleanup

**Waves 17-19 — Bug sweep and scene-isolation architecture (2026-08-18 to 2026-08-26)**
- 12 player-reported bugs fixed (builder night-work gate, land-tier math, court-NPC deduplication)
- DestinationScope 6-stage rollout scoping 14 destinations into isolated mount/unmount boundaries
- Terrain-derived walkable-footprint boundaries replacing circular wander clamps
- Tree-orientation mesh fixes completed across all 4 affected templates
- Destination-local (bake-space) coordinate storage making prop placement scale-proof

**Waves 20-30 — Combat correctness, defender UX, second settlement (2026-08-28 to 2026-08-31)**
- Line-of-sight raycast gating all ranged attacks; villagers now fight back (engage_threat_villager)
- Per-defender standing orders, HUD order chip, deposit floaties, and Wit-priced trading
- Generalised building interiors plus functional windows/shutters
- Tam the Squire companion v1 (follow/assist, cross-world travel)
- The Frozen Pass (2nd settlement) and Trade Caravan system
- Content-authoring batch: 9 SKU cost bills, gatehouse_arch, per-realm ambience/wildlife audit

**Waves 31-40 — Elevation infra, progression polish, catalog completion, boss/NG+ (2026-09-01 to 2026-09-05)**
- Home elevation infrastructure (Downs + West Fell) with homeGroundY threaded everywhere
- Talent respec, calling starter passives, rebindable gamepad buttons, KTX2 runtime loader
- Axe weapon and full castle-catalog completion (turrets, corner towers, siege vehicles)
- Black Dragon boss, caster/shielded-elite/siege-crew enemy types
- Shared boss-encounter framework, difficulty tiers, and New Game+
- Melee depth: i-frame dodge-roll, parry window, 3-hit combo finisher

**Waves 41-48 — AI depth, arena/challenge depth, 3rd settlement, dungeon objectives (2026-09-05 to 2026-09-08)**
- Perception-only Agent for sworn defenders; local avoidance, neighbor beliefs, memory stream
- Arena mini-bosses and 3 new challenge-ground mechanics (Gather, Defend the Plot, Joust)
- Siege Camp (3rd settlement) with reciprocal delivery quests and new caravan routes
- Walled merchant camp and settlement road-preference authoring
- Contested-caravan risk and settlement raids tied to a defend->growth quest link
- Sealed Crypt escort and survive objectives

**Waves 49-54 — Weapon tiers, legendary loot, endgame progression, full companion (2026-09-09 to 2026-09-10)**
- Multi-tier weapons (forged/crested) and a dynamic per-item market with decay
- Legendary boss drops and rune enchanting
- Satchel drag-and-drop and villager gear-derived HP bonus
- Marshal 6th rank, 5th perk slot, 7 level-11 mastery talents, guild vendor tiers
- Wildlife roam action, 8-stage merchant route, day-only court schedules
- Tam gains an independent save-persisted XP/leveling/gear-slot system

**Waves 55-61 — Quest UX, endgame beats, siege-ladder raids, final platform pass (2026-09-11 to 2026-09-17)**
- Quest-choice offer menus and 25 new guild-arc quests
- Storm duel staging (bridge/honor stand) and the Leo->Cedric turncoat branch
- Bounded dragonfire spread, rebuildable ruins, loadout-varied defender formations, duel spectator
- Siege-ladder-assault raid content (raiderLadder.ts)
- Real carved water-hole rendering (H3) while H2 home-pathfinding height-awareness was explicitly declined
- Visual terrain-region authoring tool (/secret/worldeditor)
- Final gamepad-rebinding + in-panel roving-focus navigation pass, closing the 27-wave plan

### Open backlog — reconciled against real code (103 items)

Every item below is either genuinely unbuilt (`STILL_OPEN`), partly built (`PARTIALLY_DONE`), waiting on an asset/tool the repo itself cannot produce (`BLOCKED_EXTERNAL`), or waiting on a product call (`NEEDS_DECISION`). Roughly 155 other candidate items this pass checked turned out to already be shipped (just untagged), obsolete, superseded by a later design, or explicitly declined — see the *Closed, verified* note after the table.

<details><summary><strong>AI</strong> (18 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-014 | STILL_OPEN | XL | Full Defenders.tsx FSM -> reasoner 'guard' archetype migration | 6 combat subsystems (loadout rendering, mounted combat, tower elevation, shifts/orders, scouting, dragon-air/water avoidance) still need to move off Defenders.tsx onto the reasoner; explicitly ruled out as a full-session redesign. |
| OPEN-015 | PARTIALLY_DONE | S | Wire shared applyLocalAvoidance into Enemies.tsx / Defenders.tsx | Both populations still use their own duplicate hand-rolled pack-separation formulas instead of the shared navgrid.ts primitive; low-value dedup now that both already work. |
| OPEN-016 | STILL_OPEN | M | Raiders don't peel off toward different approach sides | Add per-raider/per-side approach-vector variation instead of one shared HOME_X/HOME_Z target. |
| OPEN-017 | STILL_OPEN | S | Raider battering ram still spawns on the old 34m ring, not via road entry | Change the ordinary-raid ram spawn to use roadEntry() coordinates like CedricSiege.tsx already does. |
| OPEN-018 | STILL_OPEN | S | Home raid trigger gated to dusk (0.7-0.78) only | Replace/augment the fixed dusk window so raids can fire at any hour, day or night. |
| OPEN-019 | STILL_OPEN | S | Downed villager's debug action-label can still read take_cover | Add a downed-state exit/gate to take_cover (mirroring engageThreatVillager.ts) and/or a debug-label override. |
| OPEN-020 | STILL_OPEN | L | Real watch-post that orients toward raid approaches | Net-new feature: design + build a GuardPost that reads the raid-approach vector and orients/reacts to it — nothing exists to extend. |
| OPEN-021 | PARTIALLY_DONE | M | Per-world (settlement) autonomous defense doesn't exist | Posted defenders/AI battering ram for settlements still don't exist; only a player-fought raid encounter (settlementRaid.ts) does. |
| OPEN-024 | STILL_OPEN | S | Seated-rider leg-pose constants need a live screenshot-and-tune pass | SEATED_LEG_X/SEATED_LEG_SPLAY are still starting estimates, never visually tuned against a live mounted defender. |
| OPEN-028 | STILL_OPEN | M | warm_at_campfire action is spec-only, never implemented | Needs a full new Activity/Action (reserve/travel/align/perform) plus reasoner wiring and archetype intrinsic-list entries. |
| OPEN-029 | STILL_OPEN | S | Campfire anchor slot spacing needs retuning | Deliberately blocked on OPEN-028 (warm_at_campfire) landing first; low real-sample rate left alone until then. |
| OPEN-031 | STILL_OPEN | M | Companion Tam has no working bow loadout | Needs a ranged branch + hasLineOfSight() gate in assistLeader.ts, a 'bow' Companion.tsx render case, and removing the type-level bow exclusion. |
| OPEN-032 | STILL_OPEN | L | Optional LLM dialogue layer (Phase 9 / spec §11) entirely unbuilt | Everything: prompt building from bb.memoryStream, a network/model client, dialogue-only output gating. The memory substrate it would read from is now ready (Wave 42). |
| OPEN-033 | STILL_OPEN | L | Memory.recall is recency-only; no relevance scoring | Real embedding/LLM-based relevance scoring for recall(query,k) — depends on the still-unbuilt dialogue/LLM layer (OPEN-032). |
| OPEN-034 | STILL_OPEN | M | Pathfound day/night court-NPC movement still doesn't exist | Only a visibility on/off toggle exists for 2 of 5 court NPCs (King/Queen); real navSteer-routed day/night movement between posts is unbuilt for any of them. |
| OPEN-037 | PARTIALLY_DONE | L | Villager generic-newcomer arrival / worksite-walk logic still homestead-only | Worksite-walk is genuinely per-world now, but checkVillagerArrival/recruitVillageFolk remain hardcoded to the home roster — no arrival mechanism targets a settlement. |
| OPEN-054 | STILL_OPEN | L | Unused ambient smart-object anchors and missing props/animation clips | bed/workbench/forge anchors have no consuming action; no well/bench/table/hitching-post props exist; no sit/sleep/eat animation clips. |
| OPEN-066 | PARTIALLY_DONE | S | AI pathfinding remains flat-only (height-unaware) | Home nav-grid height-awareness was explicitly declined (Wave 59, no consumer); destination-world pathfinding was never even evaluated. |

</details>

<details><summary><strong>World</strong> (11 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-022 | STILL_OPEN | M | Finished keep has no collision volumes / nav-grid obstacles for raider pathing | Stamp finished keep sockets into navgrid.ts's obstacle grid (like fort.ts already does for its enclosure check) so raider pathing can route around it. |
| OPEN-043 | STILL_OPEN | S | Marketplace square (half of the original Road-models idea) never built | Lay out an open plaza using the existing 4 Road tile models near the settlement/signpost; no new assets needed. |
| OPEN-048 | PARTIALLY_DONE | M | template-05 still has no resident NPC to ground-truth its walkable classification | template-04 and -07 got residents to verify against; template-05 alone still relies solely on the generic claim-footprint safety net. |
| OPEN-062 | STILL_OPEN | M | Per-asset target height for template 'set' props still a flat 0.8m default | Source/derive a per-asset target height and wire it in place of DEFAULT_PROP_HEIGHT for every kind:'set' prop. |
| OPEN-063 | STILL_OPEN | M | Destination-world hillsides still bounce/stutter downhill | Extend the slopeUnderfoot ledge-test fix (homestead-only today) to the 14 non-home destination terrain bakes. |
| OPEN-064 | STILL_OPEN | S | Follow-lerp eye-height trails climbs by climb-rate/12 | Increase/replace the fixed dt*12 eye-height follow-lerp without reintroducing the descent-stutter bug it was built to fix. |
| OPEN-065 | PARTIALLY_DONE | M | Home elevation limited to 2 quadrants (Downs + West Fell) | Further quadrant expansion was explicitly declined (Wave 59) for lack of a real gameplay consumer — a permanent decision, not an oversight. |
| OPEN-067 | STILL_OPEN | S | terrainConflict() has no slope check | Currently confirmed unreachable (no region overlaps the build fence) but the check itself is still missing from the code. |
| OPEN-070 | STILL_OPEN | S | Specular-glint material artifact on the natural POND | Diagnose and tune the water material's roughness/metalness/envMapIntensity; confirmed pre-existing, not a regression, but never triaged further. |
| OPEN-076 | STILL_OPEN | M | Sound Walls flood-fill seal test has known resolution limits | 1m grid tolerates sub-1m gaps as sealed, and only the hardcoded homestead-centre cell is tested (an off-centre ring wouldn't count); self-contained rewrite of fort.ts. |
| OPEN-087 | PARTIALLY_DONE | S | POI coverage still misses Cedric's camp, all 6 challenge grounds, dungeon, and arena | 7 of the 8 non-Cedric destinations now have a resident-NPC POI; challenge grounds/dungeon/arena and template-05 remain uncovered, and TemplatePopulation lab-props were never used as a POI source. |

</details>

<details><summary><strong>Build</strong> (10 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-023 | STILL_OPEN | S | Relocated keep foundation always renders unrotated | Thread a keep.rot field through KeepAssembly's group rotation, socket coordinates, and finishMove; currently hardcoded to 0. |
| OPEN-025 | STILL_OPEN | S | Cart 'glued' quirk: walking toward a just-grabbed cart yields zero net movement | Exempt the actively-pushed/hitched building's own collider from the player-collision loop, or read cartLivePos instead of stale b.x/b.z. |
| OPEN-026 | STILL_OPEN | M | No general building-repair mechanism for non-dragon damage | Generalize the dragon-only ruin/rebuild mechanic (or add a new heal action) to raider-ram/cannon/siege-ladder damage instead of deleting the building at 0 HP. |
| OPEN-027 | STILL_OPEN | M | oc6098b1 chest-launcher payload mechanism unbuilt | hasChestLauncher/canLaunchChest capability data exists but there's no chest_arm/chest_basket rig role or projectile type; fires as an ordinary catapult today. |
| OPEN-046 | STILL_OPEN | M | Build challenges lack a per-map specific-structure/set objective | Design+implement a per-map objective; still only a generic 'N pieces in 90s' target after the newer Gather/Defend/Joust minigames shipped for the other 5 grounds. |
| OPEN-057 | PARTIALLY_DONE | S | 2 of 10 'Walls' category generated bricks lack real collision geometry | gen_06_l3013700 and gen_10_l235700 ('Wall Section 1x4'/'2x2') still fall back to a crude single full-footprint box, worse than the deferred WALL_CORE treatment. |
| OPEN-058 | PARTIALLY_DONE | M | Template-world set-dressing never imported into the buildable catalog | Player-buildable catalog import (Buildable entries with size/cost/collision) is unstarted integration work — not asset-blocked, since the models already load via PropModel elsewhere. |
| OPEN-060 | STILL_OPEN | M | 4 cart-type buildables have no per-instance scale support | CartMesh would need a scale prop threaded through both the static and live push-physics render paths without them drifting apart. |
| OPEN-068 | STILL_OPEN | S | Build aerial-camera mouse-raycast catcher plane ignores elevation | Raycast the catcher plane against real elevation instead of a flat y=0 plane; currently unreachable since the build fence never touches a terrain region. |
| OPEN-077 | STILL_OPEN | L | No player-placeable road piece / per-tile road speed-bonus mechanic | Entire design + implementation unbuilt: a placeable 'road' buildable type plus a per-tile speed bonus reusing the externalCapacityBonus() pattern. |

</details>

<details><summary><strong>Combat</strong> (5 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-030 | STILL_OPEN | S | Combat mastery talent (+1 melee) verified only by source read | Only a live damage-delta measurement remains; the code itself is complete. |
| OPEN-050 | STILL_OPEN | L | Defender/Armory loadouts don't use the new tiered weapons | defenderStrike() and DEFENDER_LOADOUTS only reference base sword/halberd/crossbow items, never *_forged/*_crested/*_legendary; deliberately scoped out again in Wave 51. |
| OPEN-051 | STILL_OPEN | S | Per-defender combat-bonus (Shieldwall/Courage/gear HP) balance pass never scheduled | No design blocker found, just never scheduled — a deliberate numeric review of how HP bonuses stack for defenders. |
| OPEN-052 | STILL_OPEN | M | Spear weapon has no forged/crested tiers | Author spear_forged/spear_crested (optionally legendary) recipes and MELEE_TIERS entries mirroring sword/halberd's Wave 49 treatment. |
| OPEN-101 | STILL_OPEN | S | Targeting reticle's 'neutral' Standing value declared but never assigned | Pick a case that should read 'neutral' (e.g. wildlife/undecided villagers), assign it in targeting.ts, and add a .kk-reticle.neutral CSS rule. |

</details>

<details><summary><strong>Economy</strong> (8 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-036 | STILL_OPEN | L | True settlement population growth (new residents arriving post-founding) | Only a yield-tier gold bump exists; no mechanism spawns/recruits new residents at non-home settlements over time. |
| OPEN-039 | PARTIALLY_DONE | L | 5 of 8 travel destinations still lack a settlement chain | River Landing, Tourney Grounds, Rival Castle, Sister Keep, King's Approach have no SETTLEMENT_FOUNDING entry; the 3x-proven pattern is reusable but unextended. |
| OPEN-042 | PARTIALLY_DONE | M | Empire decision 4 (homestead stays uniquely free-build) never enforced | placeBuilding() has no world-type gate; settlements currently allow identical freeform building to the homestead, contradicting the original design intent (never explicitly reversed either). |
| OPEN-045 | STILL_OPEN | S | Calling / trade-off perk synergy tie-in doesn't exist | No perk is restricted/boosted by classId; would need new synergy logic (e.g. a calling making a matching perk cheaper/stronger). |
| OPEN-047 | NEEDS_DECISION | M | Wave-8 catalog pieces' workshop-gating UX never revisited | Product decision on whether long-form workshop-gating (5 pieces behind assembling real LEGO sets) is acceptable, or needs an earlier unlock path/starter kit. |
| OPEN-049 | PARTIALLY_DONE | L | Ordinary (non-defender) villagers still lack real weapon-loadout access | Investigated and explicitly scoped out twice (job==='defender' gate spans 4 subsystems: store, rendering, AI scoring, leveling); only a gear-derived HP bonus shipped instead. |
| OPEN-053 | STILL_OPEN | S | ShopPanel omits Wanderer's 'Fair Dealer' +2% haggle in its price display | One-line fix: add the classId==='wanderer' term to ShopPanel.tsx's two price formulas (store logic already applies it); survived a second touch of the file. |
| OPEN-056 | PARTIALLY_DONE | L | ~37+ buildables still lack hand-authored SKU cost bills | Only 9 of ~46 buildables (incl. not gate/door/cannon/warcart/bladecart) have real pieces-bills; rest stay on the family-total cost fallback. |

</details>

<details><summary><strong>Content</strong> (22 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-002 | BLOCKED_EXTERNAL | XL | Horse/dragon mount seat matrices not wired (file absent from repo) | DEFAULT_MINIFIG_HORSE_MOUNT.json / DRAGON_MOUNT.json must be fetched from the sibling Blender-lab repo before real per-donor seat matrices can replace the current hand-tuned constants. |
| OPEN-003 | BLOCKED_EXTERNAL | L | New forged/crested donor-print texture art for armor tiers | Procedural fallback already ships; genuinely new donor-print art extraction is a texture-pipeline task outside this repo. |
| OPEN-004 | BLOCKED_EXTERNAL | L | Bespoke catapult sound sample (snd060) | No matching WAV exists in the 46-file sound bank; a bespoke sample must be sourced externally (current distinct whoosh+thud voice is the best available substitute). |
| OPEN-005 | BLOCKED_EXTERNAL | S | Grand Keep foundation lacks a green MC00 baseplate mesh | No large green baseplate asset exists anywhere in the extraction; foundation stays a stone/trodden-ground texture until one is supplied. |
| OPEN-006 | BLOCKED_EXTERNAL | XL | Workshop Option B: instruction-accurate (booklet-faithful) builds | Needs LDraw models per set, a Rebrickable API key/CSVs, and manual PDFs — none exist in-repo; only READMEs sit in the ldraw/manuals_pdf folders. |
| OPEN-007 | BLOCKED_EXTERNAL | XL | Impulse sets and 4816-4819 have no game models for the Workshop | Only 9 sets have workshop plans; the rest are reachable only once Option B's LDraw pipeline exists. |
| OPEN-008 | BLOCKED_EXTERNAL | S | LDraw-space <-> engine coordinate transform | Trivial to apply once Option B starts, but Option B itself remains blocked on missing LDraw assets. |
| OPEN-009 | BLOCKED_EXTERNAL | S | Validate user's forthcoming Grok-built item-catalog JSON | Nothing to do until the user delivers the JSON; then diff against BRICK_CATALOG.md. |
| OPEN-011 | BLOCKED_EXTERNAL | S | Additional ambient wildlife species (deer, rabbit) | Full 264-entry asset catalog has zero deer/rabbit/second-ground-creature meshes; needs new 3D assets before any code work. |
| OPEN-012 | BLOCKED_EXTERNAL | XL | Animated flags/shields/halberds for the duel bridge (oc6095b5/b4) | No part_roles.json/rig entry exists for either asset; needs rig-lab work before any animation can be wired. |
| OPEN-013 | BLOCKED_EXTERNAL | XL | Dragon-specific villager fear animation clip | No dragon-fear pose exists under the ~15-clip ceiling; needs a newly authored/extracted animation clip, not code. |
| OPEN-038 | PARTIALLY_DONE | M | Dungeon-entrance candidate at Siege Camp/Frozen Pass never pursued | Resident content (NPCs, guilds, quests) fully shipped at all 3 vision-table sites; the 'second dungeon entrance' half was never revisited — Sealed Crypt remains the sole procedural dungeon. |
| OPEN-040 | PARTIALLY_DONE | S | Interior NPC residents offer quests but no trade/dance interaction | The 4 interior residents (Wave 45) give quests+dialogue only; the original design's trade and dance sub-asks never shipped for them. |
| OPEN-041 | PARTIALLY_DONE | M | Challenge maps still have no residents, NPC quests, or real unlock gate | Minigame mechanics shipped for all 6 grounds, but zero resident NPCs and claim-gating identical to a plain template (no distinct unlock). |
| OPEN-044 | STILL_OPEN | M | Calling-exclusive dialogue/quest hooks don't exist | Every classId reference is a mechanical stat hook; zero dialogue branches or quest gates are keyed on calling. |
| OPEN-055 | PARTIALLY_DONE | S | 5 windows_doors decor molds left as static (only Portcullis + Shutters promoted) | Decide/implement whether the remaining 5 small window/door molds get open/close+LOS-block behavior or are explicitly documented as intentional decoration. |
| OPEN-059 | PARTIALLY_DONE | M | Drawbridge/jail-cell/springboard buildables have no animated rig | All 3 are now real buildables but render static — no part_roles.json rig entry or ANIMATED_ROLES entry exists for them yet. |
| OPEN-072 | PARTIALLY_DONE | S | General mirror-vs-rotation orientation-composition math unresolved | 27 live-wired assets checked with zero defects, but the general matrix-level proof is still unresolved; relevant only if a future asset outside the checked family shows a live defect. |
| OPEN-073 | STILL_OPEN | S | Blender rig_lib.py up-axis convention never traced | Trace the sibling repo's rig_lib.py to confirm/refute the bare-Y-mirror assumption; research debt, no live defect currently observed. |
| OPEN-074 | STILL_OPEN | S | template-05 tree-row orientation fix never visually confirmed | Find a walkable vantage point that clears the occluding mesh_0_47 to get a clean screenshot; the fix itself is already shipped and mesh-identity-confirmed. |
| OPEN-102 | STILL_OPEN | L | Mixed head/body donor NPCs still float the head at the neck | No neck-socket re-anchor system exists; villager looks remain restricted to same-donor head/body pairs. |
| OPEN-103 | NEEDS_DECISION | L | No music soundtrack — ambience-only state never formally ratified | A human product decision: commission/license new music tracks, or formally accept the current de-facto ambience-only state as final. |

</details>

<details><summary><strong>UI/UX</strong> (10 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-061 | STILL_OPEN | S | Fold Stats/Deeds screens into the MenuTabs one-stop menu | Add 'stats' and 'deeds' tab entries; both remain separate pause-menu/embedded-gallery UI today. |
| OPEN-075 | STILL_OPEN | S | Placement-ghost arrow direction wants a human in-game confirmation | A human playtester needs to eyeball the arrow against a known-asymmetric piece; no further code change identified as needed. |
| OPEN-078 | STILL_OPEN | S | Options screen 'Esc to close' hint has no real Escape handler | Add an Escape keydown handler in OptionsStack.tsx that calls useAppStore's pop() to actually close the screen. |
| OPEN-080 | STILL_OPEN | S | StatsStack.tsx still on the old .stack-screen system, skips the UI theme lane | Convert StatsStack.tsx to kk-screen-${uiTheme} + shared card tokens, matching AuthStack/MainMenu/OptionsStack/CharacterCreator. |
| OPEN-081 | STILL_OPEN | M | Dark-ages re-theme follow-ups: notification glow, minimap tint, blackletter font, loading heraldry | None of the 4 named cosmetic follow-ups from the original re-theme wave has shipped: toast/minimap border tinting, an embedded blackletter/uncial font, and title-screen heraldic tricolor treatment. |
| OPEN-082 | STILL_OPEN | M | No touch support for the aerial Build View camera | Add pinch-zoom/pan/tap-to-place touch handling to BuildController's aerial camera, mirroring the FPS controller's existing touch bridge. |
| OPEN-083 | STILL_OPEN | S | Per-panel narrow-viewport polish (Quest Log, NPC paperdoll) deferred | Only one global ≤720px breakpoint exists; bespoke reflow for quest-giver blocks and equip-tile/paperdoll drag interactions at narrow widths is unbuilt. |
| OPEN-084 | PARTIALLY_DONE | S | Touch-control toggle doesn't actually force rendering on hybrid devices | settings.inputMode only relabels prompts; the on-screen joystick/buttons still render solely based on auto-detected touch support, never the user's setting. |
| OPEN-085 | STILL_OPEN | S | Input-mode-aware tutorial/hint copy still hardcoded to keyboard+mouse | Thread the existing inputMode.ts label helpers into HelpStack.tsx's tutorial strings and combat.ts's SWAP_HINT — infrastructure exists, just not applied to these ~4 strings. |
| OPEN-088 | STILL_OPEN | S | VillagersPanel XP bar has no '{cur}/{next} XP' text | Add the XP text line under both VillagersPanel xpbar instances (defender roster row and Tam's card), mirroring the text already shipped in SkillsPanel. |

</details>

<details><summary><strong>Platform</strong> (11 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-001 | BLOCKED_EXTERNAL | XL | Geometry LOD needs D1-D3 low-poly GLB variants exported | No D1/D2/D3 files exist anywhere in the extraction; needs the asset pipeline to export them before any THREE.LOD wiring can happen. |
| OPEN-010 | BLOCKED_EXTERNAL | S | KTX2/Basis texture compression: real asset conversion never produced | Runtime loader is fully wired but a no-op; the encoder step needs the external `ktx` CLI binary (confirmed absent), which can't be installed by the repo/CI itself. |
| OPEN-069 | STILL_OPEN | S | Grounds.tsx fence batch still frustumCulled={false} | Flip to real culling (matching rocks/dungeon walls) and verify live that instances don't vanish at boundary edges. |
| OPEN-071 | STILL_OPEN | S | Destination-bake GLB resources never explicitly .dispose()'d on same-destination revisit | Add explicit geometry/material/texture dispose on repeat-visit without corrupting shared clone(true) references; only a conditional follow-up if memory ever becomes a real bottleneck. |
| OPEN-086 | STILL_OPEN | L | No PWA service worker / true offline caching | Manifest-only PWA shipped; cache strategy, versioning, and asset-manifest work for 597+ binary assets remains a documented, unattempted follow-up. |
| OPEN-090 | STILL_OPEN | L | No save-slot management (single save per account) | Add multiple named save slots (schema, list/select/delete UI, server route changes) on top of the current single-save model. |
| OPEN-093 | STILL_OPEN | S | Recurring worktree gap: gitignored assets missing, no scripted bootstrap | A scripted bootstrap (setup script or hook) to junction-link/copy public/assets, public/help, node_modules into a fresh worktree, replacing 12+ waves of manual one-off fixes. |
| OPEN-097 | STILL_OPEN | S | Building-placement first-load stutter theory never reproduced | A cold-browser-profile repro attempt racing a Siege Tower-class placement against the async warm-up promise in the first 1-2s of a session. |
| OPEN-098 | STILL_OPEN | XL | Rapier physics engine integration (long-horizon idea) | Entire physics-engine integration unstarted; correctly still an unmet-trigger-condition idea since ragdolls/siege dynamics don't exist yet. |
| OPEN-099 | STILL_OPEN | L | Web Workers for pathfinding (conditional idea) | No perf data shows a need; all scenarios hold 60fps at this game's scale. Correctly parked. |
| OPEN-100 | STILL_OPEN | XL | Multiplayer-ready sim refactor for co-op castle building | Entire feature unbuilt: extract sim from store into a tick-based headless module, build a server, add client sync/prediction, save-authority handoff. |

</details>

<details><summary><strong>Tech-debt</strong> (8 items)</summary>

| ID | Status | Size | Item | What remains |
|---|---|---|---|---|
| OPEN-035 | STILL_OPEN | S | Dead CourtNpc.schedule lerp mechanism never removed | Delete the structurally-dead schedule branch, scheduledCourtNpcs(), npcSync.ts, and stale comments — pure cleanup, zero behavior change. |
| OPEN-079 | STILL_OPEN | S | Dead 'commands' member of the PanelId union never removed | Delete 'commands' from the PanelId union and its stale reference in GamepadMenuController.tsx's comment. |
| OPEN-089 | STILL_OPEN | S | SaveGame.playerPos declared but never written or read | Either delete the dead field from SaveGame, or wire playerState into save.ts's serialization/deserialization. |
| OPEN-091 | STILL_OPEN | S | DungeonScene freezes room layout via useMemo(() => ..., []) | Confirmed unreachable through real gameplay (separate UI-driven events), but the fragile pattern remains; swap for a live read or add a guarding comment. |
| OPEN-092 | PARTIALLY_DONE | M | Latent circular-import hazard around gameStore/difficulty.ts | Only 2 known edges were inverted via leaf-module imports; the root cause (difficulty.ts's undeferred module-scope subscribe) and the general TemplateWorld->...->difficulty.ts chain remain latent. |
| OPEN-094 | PARTIALLY_DONE | S | Ladder wrecked-tail/Climb-prompt verified only via synthetic state | The feature code itself mirrors an already-proven pattern and looks correct; only a real live-browser hit-to-zero test and mouse-look check remain, judged low-risk. |
| OPEN-095 | PARTIALLY_DONE | S | Builder animation-side day/night gate only traced by hand, never live-tested | The mechanical construction gate was live-verified; the Villagers.tsx animation-side gate has only ever been reasoned by code trace due to reasoner/position race unreliability. |
| OPEN-096 | PARTIALLY_DONE | S | Angler calling's fishing bite-window perk confirmed only by source read | A live-capture measurement in an actual pointer-lock fishing session is the only remaining gap; the code path is implemented and unchanged. |

</details>

**Closed, verified** (not reproduced item-by-item here — see the reconciliation's own audit trail if a specific past entry needs re-checking): Roughly 155 of the ~160 code-verified items from the audit resolve to closed states, breaking down approximately as: ~95 DONE_UNTAGGED (real work shipped in a later wave — usually Wave 20-61 — but the earlier [TODO]/follow-up note was never retagged), covering: Phase-24 defender-command UX (per-defender orders, HUD chip, deposit floaties, Wit-priced stall) at 3 separate stale locations; dragonfire-siege follow-ups (fire-spread, ruin/rebuild, villager flee, defender formations) at 2 locations; the GUI overhaul/design-system port; regional quest log; delivery quests; halberd/spear/armor tiers; talent respec + deeper skill tiers; unused-asset audit (Powder Mine/signal_cannon/bat-swarm); arches/Destructor/Cannon audits; gatehouse_arch; per-realm ambience + raid-horn-while-away notify; line-of-sight raycast for ranged attacks; skeleton spawn-inside-walls fix; gamepad button rebinding + in-panel roving-focus nav; road-speed-mult extended to NPCs; tree-orientation fixes across all 4 templates; NPC AI Phases 6-8 and the nav-adopt-vs-extend decision; Beda & Alric recruitment purpose; and several one-off bug/verification items (0-HP arena hook order, ladder-defender walkway posting, Leo->Cedric turncoat). ~7 OBSOLETE entries are stale plan text or scenarios that provably can't occur any more (e.g. TemplateWorldRoot's missing key={destId} is a non-issue given sibling keys already remount; template-08's zero population rows is a documented pre-existing non-regression; a hypothesized interior-save-strand scenario doesn't reproduce because player position is never persisted at all). ~7 SUPERSEDED entries got their underlying goal met via a different shipped mechanism than the literal ask (destruction-phase wiring via a generic lab-driven system instead of the specific mc006/009/010 hardcode; per-destination-scene architecture via a DestinationScope mount/unmount boundary inside one shared Canvas instead of separate Scenes/CMS; the LDraw-vs-OCR research question answered and its practical half shipped as the Assembly Workshop; directional land-growth answered by routing 'expansion' through settlements instead of a compass-direction home-fence system; a real courtier duel-spectator superseded by a generic non-interactive figure). ~28 DECLINED entries are deliberate no-build/no-fix decisions, spanning: engine-wide approximations left alone as disproportionate to fix (2D-only melee reach, elevation-unaware aim-reticle nameplate, H2 home-nav-grid height-awareness, generic (i,j,layer) navgrid rewrite); permanent scope guards (d-pad/stick movement rebinding, HTML5 drag-and-drop for gamepad, NG+ not carrying perks, dragonfire excluded from keep pieces, court-archetype siege-reaction excluded); UX calls preserved on purpose (Sealed-Crypt/Arena "currently there" travel-map badge, quest-id kept for save compatibility despite a stale name); and content/architecture calls made and documented (LEARNED_PART_LEXICON left unconsumed as a downgrade vs. existing data, engage_threat-for-defenders reversal ruled out a 3rd/4th time, ladder kept singleton/enemy-only, per-instance random-stat item rolls not built, villager weapon-assignment path declined).

**Declined** (67 items across the file were explicit design decisions against building something, not oversights — left in place below, untouched).

**Low-confidence** (evidence was weaker than the rest; worth a human double-check before acting): R1-6, R2-13, R13-4, R16-9, R11-3.

---

## 🗄️ Archived — 1 completed section [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- ✅ Shipped (Phases 0–19, compact recap)

## 🏰 Phase 20 — The Kingdom of Instances *(the big one — next up)* [TODO]

**The vision (decided 2026-07-18):** the game stops being one crowded plane. **Template-09 ("The Far
Meadow") becomes the starting homestead** — it's the only genuinely empty, flat template bake (0 object
placements vs. 37–272 for the other eight), a blank green canvas we dress with our own water and
environment. The homestead is **its own instance**: building, farming, villagers, defenders, merchants and
raids all live there. The royal court does NOT — **the named NPCs reside in their own instances**, which
the player must actually travel to visit, each world dressed out using the building/scenery catalog. Most
core questing happens at the homestead, but each traveled location has its own resident quest-giver with
location-specific quests. Travel becomes the spine of the game, not a side activity for one-time rewards.

**Suggested NPC → instance mapping** (each template's real content already fits its resident):

| Instance | Resident(s) | Role |
|---|---|---|
| **Template-09 · The Far Meadow** | You, your villagers, the traveling merchant | The homestead — build/farm/defend |
| Template-01 · The King's Approach | **King Leo & Queen Leonora** (the royal castle) | Main quest line, ceremonies, alliance pledge, taxation |
| Template-02 · The Tourney Grounds | **Richard the Strong** | Jousting, combat training quests |
| Template-03 · The River Landing | **John of Mayne** | Trade/delivery/gathering quests, river economy |
| Template-05 · The Rival Castle | **Cedric the Bull, Gilbert, Weezil** | The rebellion's seat — parley, boss fight, bad-side quests |
| Template-04 · The Siege Camp | War content | Siege training, alliance war quests |
| Template-06 · The Sister Keep | **Princess Storm** (relocated Battle Dome) | Duels, exploration quests |
| Template-07 · The Frozen Pass | Wilderness | Expedition content, dungeon entrance candidate |
| Template-08 · The Old Ruins | Wilderness | Mining/ruins delving, dungeon entrance candidate |

**Working principle (adopted 2026-07-18): every phase carries 1–2 tech-debt items from the backlog
alongside its feature work** — debt gets paid down continuously instead of accumulating into its own
dreaded phase.

**Migration plan** (the archive's Phase-7 impact analysis still holds — this touches ~7 systems and must
be its own carefully-tested pass, not bundled with other work):

1. [COMPLETE] ✅ **Step 1 — Home = Template-09.** Shipped, and far cheaper than the original 7-system estimate by
   inverting the problem: **the mesh came to the world, not the world to the mesh** — the bake is mounted
   centered at the existing origin (via a shared `normalizeTemplateBake`, extracted from
   `TemplateWorld.tsx`), so every coordinate (SPAWN/BUILD_REGION/POND/NPCs/saved buildings), the flat
   y=0 ground assumption (the meadow has near-zero vertical relief — that's why it was chosen), the box
   bound, and DayNight's sun all survive unchanged. The real baked LEGO stud-plate ground renders with
   anisotropic filtering (it banded badly at grazing angles without it) and inherits the seasonal tint by
   multiplying each baked material's color by the season's ratio-to-spring. Template-09 is filtered out of
   the Travel Map (eight roads now — you can't travel to where you're standing). **Tech-debt paid down in
   the same pass:** the merchant cart no longer parks inside the build region (Phase 10 #9 — `MERCHANT_SPOT`
   moved to the pond road, outside `BUILD_REGION`); the waiting `spr203` texture is finally wired — a brook
   now runs from a rocky spring (with a small spr203 cascade face, the sprite's actual subject) down into
   the pond using the spr199 ripple for its surface; and a real manual-occlusion win — the Keep interior's
   furnishings (and especially its **global** ambient light, which had been quietly over-lighting the whole
   outdoor world at all hours) now mount only while the player is actually inside the sealed room.
2. [COMPLETE] ✅ **Step 2 — Evict the court** (King/Queen/Richard/John; Storm + Cedric follow in step 3). `NpcDef`
   gained a `world?: string` residency field: King Leo & Queen Leonora hold court on The King's Approach's
   flat upper ground (terrain-probed — the travel landing is a steep hillside, so the walk up literally is
   the king's approach), Richard keeps the Tourney Grounds, John the River Landing. NPCs render only in
   the place they reside (`Npc.tsx` filters by destination; minimap too), resident feet follow the bake's
   real terrain via `sampleTemplateGroundY`, and they skip the homestead's night-gather drift. The old
   unconditional "E always returns home at a destination" early-return in `PlayerController` now checks
   resident NPCs within reach first — the reason nothing out there was ever interactable before. The
   knighting ceremony became a **summons to the royal castle**: `beginCeremony` travels to template-01 and
   places the player before the throne-ground where Leo actually stands. **Known follow-ups for step 3:**
   Storm's duel and the Battle Dome need enemies/structures to sit at bake terrain height (enemies render
   at y=0 today), jousting needs horses (and flat-ground riding assumptions) brought to the Tourney
   Grounds, and Cedric's whole camp moves to The Rival Castle.
3. [COMPLETE] ✅ **Step 3 (relocations half) — every named character now lives in their instance.** Enemies at a
   destination stand on the bake's real terrain (`destinationGroundY`, which also treats the Battle Dome's
   flat arena floor as local ground truth for everyone inside the ring — the player, Storm, and duel
   enemies alike; she was buried to the neck on the sloped bake without it). **Storm + the Battle Dome**
   moved to The Sister Keep (dome/camp structures mount only while visiting and ride the terrain via
   per-frame sampling — a one-shot sample at mount would race the async bake load). **Cedric's whole camp**
   (dressing, jailed figure, respawning guards, parley/challenge target) moved to the foot of The Rival
   Castle, with the camp-guard spawner relocated into the destination flow. **Jousting moved with Richard**:
   a steed is stabled at the Tourney Grounds (`Horse` components take a `world`), the mounted-interaction
   branch now outranks the destination branch so jousting works away from home, and riding follows
   destination terrain (`floorY` + `RideHorse` inherit the sampled height — riding up the tourney hill at
   y≈26 works). Riding also persists across travel — take a horse anywhere; emergent but kept.
   **Remaining half of step 3 (dressing):** the court worlds still deserve real set-piece dressing from
   the catalog (throne dais for Leo, lists/stands for Richard, dock props for John) — placed as
   environment, not player buildings; the dome's ring also overlaps some of the Sister Keep's baked trees
   (cosmetic; nudge or live with it during the dressing pass).
3b. [COMPLETE] ✅ **Step 3 (dressing half).** `CourtDressing.tsx` — real catalog set pieces, environment-placed like
   Cedric's camp, every prop following the bake terrain at its OWN x/z (a shared `Grounded` per-frame
   helper — group-level height would float one end of anything on a slope): a stone dais bearing the real
   throne mold flanked by the Keep's mirrored lion-crest banners + torches behind the royal pair; tilt-
   barrier lists (real fence pieces) with pennants marking Richard's joust line; stacked crates/barrels
   at John's landing.
4. [COMPLETE] ✅ **Step 4 — Location wayfinding (v1).** Quest completion now announces WHERE a newly revealed NPC
   holds court ("📜 Word arrives: John of Mayne will receive you at The River Landing — consult the
   Travel Map"), driven from `NpcDef.world` — verified end-to-end through the real
   build-then-construct quest path. The Travel Map lists each destination's revealed residents (⚜ names
   on the tile — revealed only, so unmet characters aren't spoiled). Quest descriptions were audited and
   are location-neutral already.
4b. [COMPLETE] ✅ **Location-exclusive side quests.** Two new errand kinds are location-bound *by mechanics*, not
   just flavor: `'joust'` (credited on solid/perfect passes — only possible at Richard's Tourney Grounds)
   and `'duel'` (credited through the real `resolveDuel` win path — only possible in Storm's ring), plus
   per-enemy-kind kill targets (`recordKill` now passes the kind; `'any'` still wildcards). New content:
   King Leo offers kingdom levies at his castle (iron for the armory, bread for the royal table),
   Richard's "3 solid passes at the lists," Storm's "take first blood twice." And **Cedric's War
   Council**: a sworn bannerman approaching the camp now sits the council (a `ParleyPanel` branch — "Ah,
   my favorite turncoat…") and takes rebellion errands from `CEDRIC_WAR_QUESTS` — smuggle iron, quarry
   siege stone, and *cull the King's hounds* (specifically `'royal'` raiders, verified to reject other
   kinds) — through the same side-quest machinery via a `sideQuestsOf()` lookup that covers non-NpcDef
   givers.
4c. [COMPLETE] ✅ **"Travel to X" main-quest beats.** Two new `QuestObjective` kinds — `'visit'` (credited by
   `travelTo`) and `'talk'` (credited by `openDialogue`) — and three audience quests woven into the main
   chain at their narrative moments: **Word from the River** (after Cozy Beginnings reveals John — travel
   to The River Landing and present yourself to the Quartermaster), **An Audience at the Lists** (after
   Forge Ahead reveals Richard — ride out to the Tourney Grounds), and **The Royal Summons** (after
   Knight's Arms — "word arrives under the lion seal," stand before King Leo's throne ahead of raising
   your own keep). Old saves pick the new beats up retroactively as their next active quest. The main
   quest now physically walks the player across the Kingdom of Instances instead of narrating it.
5. [TODO] **Step 5 — Persistence.** Claimed-plot building already works in template worlds; decide per-instance
   what persists (probably: everything the player builds, everywhere).

---

## 🗄️ Archived — 2 completed sections [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- 🗺️ Phase 23 — Instance Separation & Voice Discipline (bugs shipped 2026-07-19)
- 🧠 Phase 24 — The Living Homestead — ✅ v1 SHIPPED 2026-07-19 (all three parts)

## 🤝 Grok labeling pipeline — integration points (reviewed 2026-07-19) [TODO]

The sibling-repo Blender lab at `knightskingdom/grok/blender/movie/07082026/reports/` is a human-
verified capability + rig labeling pass over the SAME 264-model extraction, and it's directly
consumable here:
- [COMPLETE] **`PAK_CAPABILITY_OVERRIDES.json`** — verified per-asset records (kind, displayName, wall roles
  `wall_straight/corner/tower`, destruction phases, explosives, mounts). ✅ *Already consumed:* the
  Phase 25 Prefabs tier took its piece selection + names straight from these labels.
- [COMPLETE] **`reports/rigs/*_rig.json`** — verified per-shape → bone maps. The dragon (`l7517400/1`) has
  jaw/legs/tail/wing_L/wing_R bones labeled — confirmed shipped: `DragonOmen.tsx` drives REAL articulated
  `wingL`/`wingR` bone rotation from them today, not the old two-frame flap (the defend-the-keep fire
  event is still future). [TODO] `DEFAULT_MINIFIG_HORSE_MOUNT.json` carries exact seat/rider matrices for
  proper mounted alignment, but nothing in the codebase reads them yet (confirmed: no reference to
  `HORSE_MOUNT` anywhere in `src/`) — riding stays hand-tuned. **Re-confirmed 2026-08-05 (Wave 7):
  the file does not exist anywhere in this repo** (`find` over the whole tree: 0 hits; `public/assets/
  rigs/` holds only `capabilities.json` and `part_roles.json`). Its NAME appears, but only as inert
  metadata inside `capabilities.json`'s per-horse `sockets.mount_template`, pointing at a sibling-repo
  artifact that was never copied across. There is nothing here to wire in — importing it means
  fetching it from the Blender lab first, which is a separate piece of work from any combat wave.
- [COMPLETE] **`ORIENTATION_REGISTRY.json` / `PAK_ORIENTATION_CATALOG.json`** — investigated, not left
  undone: read and found genuinely inapplicable as per-asset ground truth (its eulers are Blender-space
  Z-up, not transferable to this game's convention — applying them would break currently-correct models).
  What it DID carry (a `material_followups` section) was a real, separate bug and got fixed — see the full
  writeup where this was actually resolved, "`ORIENTATION_REGISTRY.json` — read, and deliberately not
  applied" (search this file for that heading).
- [TODO] **`LEARNED_PART_LEXICON.json`** — family defaults (mc_wall → standable/connectable/destructible);
  feeds future wall-connection + destruction-phase systems (dragonfire wants `mc009/mc010` as damage
  states of `mc006` — they're literally labeled as its destruction phases).

---

## 🗄️ Archived — 3 completed sections [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- 🧱 Phase 25 — Build Catalog Expansion — ✅ v1 shipped 2026-07-19
- 📋 User-reported batch (2026-07-19)
- 🧱 Build menu relocated + filtered — SHIPPED 2026-07-20

## 📋 Remaining backlog (carried forward, grouped by theme) [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.


**World & locations**
- [COMPLETE] ✅ **CLOSED Wave 19 — re-verified live.** Shipped as part of Phase 20 step 1 itself (see
  that entry above, ~line 108): `Terrain.tsx`'s `Stream()` runs a real brook from a rocky spring down
  into the pond, reusing the pond's spr199 ripple for the brook surface and dressing the spring with a
  small spr203 cascade face — "the sprite's actual subject" per that function's own header comment.
  Narrower than "rivers/waterfalls" plural (one brook, one small fall, not a river network) but exactly
  what this entry's own parenthetical scoped it to: "natural fit for Phase 20 step 1," which is precisely
  where it landed.
- [COMPLETE] ✅ **Sealed Crypt follow-ups** (2026-08-14, Wave 13). *Cosmetic-unlock loot shipped
  2026-07-19* — full clears #1/#2 award the Broken Axe / Horned Sigil crests (see the crest-unlock entry
  under Homestead & economy) — carried forward unchanged. Three sub-asks, each checked against the real
  code before touching anything:
  - **Branching layouts**: already shipped 2026-07-27 (`dungeon.ts`'s own header comment: "replaces the
    linear chain with a branching tree"), just never retagged — the exact same bookkeeping gap N80-82 had.
    `tryGenerate()` picks a parent uniformly from every room placed so far, not just the most recent, and
    attaches via a random free wall slot on a random side — a real randomized tree, not a re-rolled
    straight line. No code work needed this wave; retagged here.
  - **One new objective type — retrieve**: `DungeonRoom` gained an `objective: 'none'|'combat'|'retrieve'`
    field (replacing the old enemyCount-inference the entry room's "no fight" state used to lean on).
    ~30% of non-entry, non-boss rooms roll `'retrieve'` instead of combat: no enemies, a real prop (the
    same verified `chest` `RealPropPart` the Grand Keep's own treasure chest uses — no new asset) sits at
    the room's centre, and `cleared` flips the moment the player holds E on it
    (`PlayerController.tsx`'s new `'dungeon_relic'` interact) instead of the last enemy dying. Pays a
    smaller gold bonus than a full clear, scaled the same way (`10 + rooms*3` vs. the full-clear
    `20 + rooms*8`). Escort/survive are real too but explicitly deferred: escort needs a follow-the-player
    NPC with its own pathing, survive needs a wave/timer system — neither exists in the dungeon today, and
    building either alongside retrieve in one wave was exactly the overreach the task brief warned against.
  - **One visual reskin variant**: `DungeonLayout.wallStyle` rolls once per descent between `stonewall`
    (mc007, the original) and `mc006` ("Castle Wall (Plain)") — a real second mesh from the same verified,
    correctly-scaled mc-series family, not a new asset. Deliberately NOT `mc009`/`mc010`
    (Breached/Ruined) despite also being 8m-wide: both are flagged `hasHole` and read as walk-through
    breaches everywhere else they're placed, while the Crypt's own collision (`PlayerController.tsx`,
    `navgrid.ts`) always resolves a wall slot as one solid box regardless of mesh — a visibly-breached wall
    that still stopped you cold would have been a real, confusing bug, not a cosmetic swap. Collision sizing
    in both `PlayerController.tsx` and `navgrid.ts` now reads the layout's own `wallStyle` instead of a
    hardcoded `'stonewall'` string, a genuine correctness fix (both styles share an identical `WALL_CORE`
    collision entry, so this was previously harmless, but would not have stayed that way if a third,
    differently-proportioned style were ever added).
  - **Two live bugs found by Wave 13's own verify pass, fixed 2026-08-14**: (1) the new `dungeon_relic`
    interact target was appended to the END of `findTarget()`'s general facing-scored sweep, but the
    pre-existing `if (st.destination) {...}` block earlier in the same function unconditionally returns
    an NPC/horse/Cedric/guild-hall match or else `'Return Home'` whenever ANY destination is set —
    including `'dungeon'` — so the sweep never ran and the relic was unreachable by any input, which also
    permanently blocked the dungeon's full-clear reward (the ONLY source of the halberd) on any layout
    that rolled a retrieve room. Fixed by moving the retrieve-room check into that earlier block instead
    (a plain distance test, matching the NPC/horse checks already there — no facing requirement needed
    for those either) and deleting the now-dead duplicate. (2) Fixing #1 exposed a second, related issue
    found live while re-verifying: `dungeon_relic` is the first `duration > 0` hold action ever reachable
    inside that same block, and every other target there fires instantly (`duration: 0`) — so there was
    never previously a frame gap between "this hold just finished" and "what's the next target" while the
    same key-press was still down. Taking the relic removes it from consideration, so the very next frame
    fell through to that block's own `'Return Home'` fallback and fired it immediately if the player's
    E-release lagged completion by even one frame — silently ejecting them from the dungeon (forfeiting
    any unclear rooms) the instant they picked up a relic. Fixed by setting the same `talkCooldown` gate
    every other instant action already respects, buying a real beat to let go of E first. Both confirmed
    live via real Playwright: the real targeting prompt now appears near a retrieve room, a real held
    E-press grants the relic bonus, `destination` stays `'dungeon'` through a full extra second of E held
    past completion, and — clearing every other room via the leaf module and taking the last relic for
    real — the full-clear reward (gold, materials, XP, and the halberd into the Armory) fires exactly as
    designed.
- [COMPLETE] The 4 `Road` models — no longer unused: they pave the real road network newcomers/NPCs now
  walk in on (`Road.tsx`). The "marketplace square" half of the original idea specifically wasn't built.
- [TODO] Unused-asset audit completion: `Destructor` (4), second `Cannon`, 2 unused `Animal` models.

**Combat & content**
- [COMPLETE] **The Dragon** — ✅ *stage 1 shipped (2026-07-19)*: `DragonOmen.tsx` rolls 40% each deep night
  (`night > 0.85`, once per `dayCount`, homestead only) and sends the beast on a 26-second moonlit
  crossing at altitude ~42 — the two extracted wing-pose molds (`l7517400/1`) alternate visibility every
  0.3s for a classic two-frame LEGO flap. Horn sting + "🐉 A vast shadow crosses the moon…" + Deed
  **The Omen** + `dragonSeen` through the full save pattern. *Still future:* the defend-the-keep event
  where dragonfire ignites wooden structures specifically (stone matters at top tier).
- [COMPLETE] ✅ **Halberd sweep / spear thrust as *player* weapons — SHIPPED 2026-08-05 as Wave 7 of
  the full-ROADMAP wave plan.** Both molds were indeed already extracted and loaded
  (`weaponParts.ts`'s `halberd`/`spear`), so this was pure wiring, no art. What did NOT exist and
  had to be designed: any notion of a melee weapon other than "the sword", and any melee mechanic
  other than "nearest single target in a 2.5m cone" — the halberd's own NPC/defender use turned out
  to be a **cosmetic prop swap only** (`Enemies.tsx`/`Defenders.tsx` give a halberd-carrying bandit
  the identical 1.8m range, `anim_g_swordswish` clip and damage-by-*kind* a sword-carrier gets), so
  there was no existing sweep behavior to port. `combatState` gained a `meleeWeapon` sub-selector
  mirroring the long-standing `rangedWeapon` one, and `playerAttack()`'s inlined sword constants
  became `combat.ts`'s `MELEE` table — the `sword` row is byte-for-byte what the game already did
  (3 dmg / 1.5 worn / 2.5m / dot > 0.3 / 0.55s / 8 stamina), so nothing about the sword changed.
  Halberd: 4.5 dmg, 3.3m, 0.95s, 14 stamina, and a real **sweep** (every foe in the 180° frontal
  arc, resolved through one shared `landMeleeHit` so a swept kill loots/rallies/credits the arena
  exactly like a thrust one) — its single-target DPS is deliberately *below* the sword's, so it
  reads as a crowd weapon and not a strict upgrade. Spear: 3.5 dmg, 3.9m (longest reach in the
  game), 0.7s, 10 stamina, narrowest cone (dot > 0.6), plus a **×2.2 couched charge that only pays
  out mounted at a gallop** — the melee twin of the ranged weapons' existing battlement bonus.
  Stamina costs are derived, not guessed: each weapon's cost/cd lands within a whisker of the 14/s
  regen rate, so no polearm is quietly cheaper to spam than the sword. Both are forge recipes
  (`requiresUnlock: 'smithing'`, priced against the sword's 3 bar/1 plank), reach the player through
  the ordinary `addItems` path, and therefore never collide with the Armory pool a defender's
  halberd has always come from. Registered at both switch points via one shared `WEAPON_SLOTS` list
  (equip panel + Q cycle), and drawn in first person, third person and the equip paperdoll.
  **Two follow-up fixes from live verification (2026-08-05):** (1) *mounting blanked the viewmodel.*
  `PlayerController`'s horse branch still called `setCameraMode('third')` — a leftover from before
  L62 made riding force first person — so a mounted player got the eye camera with **empty hands**,
  hiding every mounted pose there is (the spear's couch, the halberd, the narrowed lance) behind a
  manual `V` press, and was silently left in third person after dismounting. Mounting no longer
  touches the stored preference, and `Viewmodel` now renders whenever `ridingState.active`
  regardless of it, matching the camera that actually runs. (2) *the joust ignored which world you
  were in.* `game/joust.ts` tested only reveal + x/z distance to Richard's world-absolute
  coordinates (as did the inline check it replaced), so the prompt and the couched lance would fire
  on those bare numbers in the homestead, the dungeon, the arena or any other template world. It now
  also requires `(richard.world ?? null) === (destination ?? null)`, the same residency test
  `PlayerController`'s NPC loop and `scheduledCourtNpcs` already use.

  **Verified live through the real input path, not direct store calls**: headless Chrome actually
  held pointer lock (`document.pointerLockElement` non-null), so every attack below is a real
  trusted mousedown/mouseup reaching `CombatController`'s own listener. On foot: sword 3.0 dmg /
  single target / whiffs past 2.5m; halberd 4.5 dmg and a single swing hit **all three** members of
  a ±60° fan at once (sword and spear each hit only one of the same three); spear 3.5 dmg, whiffed
  at a flanking dot of 0.5 (cone is 0.6), reached a target at 3.60m where both sword and halberd
  whiffed. Mounted, values held identical (sword 3.0, halberd 4.5 including the 3-target sweep,
  spear 3.5) — except the spear's charge: with `Shift` genuinely held and `combatState.galloping`
  read `true` at the moment of the swing, a mounted spear thrust dealt **7.7 = 3.5 × 2.2**, exactly
  the couched-charge multiplier, and is not reachable on foot. Mounted ranged confirmed the
  pre-existing `muzzleHeight()` split is untouched and correct: a crossbow bolt spawned at
  **y = 2.346** mounted vs. **y = 1.450** on foot from the identical shot, aimed down to pitch
  −0.266 and landed for exactly its 7 damage; a full-draw longbow shot (1.3s draw) spawned at
  y = 2.188 mounted and landed its full 16 damage. Real crafting: the Forge tab lists "🔱 Halberd —
  4× Iron Bar · 3× Plank" and "🗡️ Spear — 2× Iron Bar · 3× Plank" (both gated on "Stand near a
  Forge," matching every other weapon recipe); `craft()` on each moved `halberd`/`spear` 0→1 and
  `iron_bar`/`plank` down by their real costs. `Q` cycles sword → halberd → spear → crossbow →
  longbow → sword, matching `WEAPON_SLOTS`' declared order exactly. A killing sweep through 3 pinned
  bandits credited all 3 (`stats.kills` 0→3), granted real loot for each, and posted 3 distinct
  "defeated! Looted …" notifications — the shared `landMeleeHit()` path pays out identically to a
  single-target kill. At the real Tourney Grounds (template-02), mounted + galloping within 16m of
  a revealed Richard showed the tourney lance and held E through a genuine `joustRichard()` pass
  ("A glancing blow!"); at 20m+ still galloping, or mounted+galloping anywhere else in the game
  (homestead, arena, dungeon, template-01), the pose correctly reverted to whatever was actually
  readied and no joust prompt appeared. Dismounting (a real held-E, not a snap) restored the on-foot
  pose and left the camera preference exactly where mounting found it. Zero console/page errors
  across every run. `npm run verify` clean throughout.
- [CORRECTED + COMPLETE 2026-08-10, Wave 9 pass C] ✅ **Armor tiers (iron → forged → castle-crested).**
  Shipped — but **not "via torso decal variants", because this pipeline has no such thing**, and the
  original line assumed a mechanism that doesn't exist. A minifig's torso print is baked into its donor
  OBJ/MTL (`lib/minifig.ts`); there is no runtime decal-compositing layer to swap, and
  `data/villagerLooks.ts` records — in a comment written after real breakage — that head and torso MUST
  come from the same donor, so changing the print would change the wearer's face and pose with it. The
  numbered donor variants (`minifigrichardstrong00-03` etc.) are no shortcut either: they differ by held
  weapon/pose, not armor quality, and `weaponParts.ts` already consumes them as weapon geometry.
  So the tiers are rendered the way this game has always rendered a chestplate: **procedurally**.
  `Chestplate()` was already a hand-built plate under the file's own "procedural where the original has
  no equivalent" rule (the same one the axe/pickaxe/campfire/forge/bed follow), and it now takes a tier —
  plain iron with its single boss (byte-for-byte what shipped before, so no existing figure changed),
  a darker banded-and-riveted plate with a chevron for **forged**, and bright steel under gold trim with
  gold shoulder caps and a raised three-merlon castle over a gate for **castle-crested**. The decal is
  real geometry standing off the plate rather than a texture — both what the pipeline supports and what
  actually reads at minifig scale.
  Three real items (`chestplate_forged`, `chestplate_crested`) with Forge recipes that **re-forge the
  tier below** (Forged = an Iron Plate + 4 bar + 1 plank; Crested = a Forged Plate + 6 bar + 2 plank), so
  the ladder reads as one plate you keep improving and the Armory can never hold a Castle-Crested plate
  belonging to someone who never made an iron one. Both halves of the game read the tier: a defender's
  max HP takes 6 / 10 / 16 instead of a flat 6 (`Defenders.tsx` via `chestplateHp`), and the player's
  passive `armorReduction` takes 20% / 28% / 36% — the 0.45 ceiling is untouched and finally does its
  job, since crested + helm + Ironclad now runs into it and a shield block stays the primary defense.
  *Design call:* **one tiered slot, not three independent ones.** `Villager.gear.chestplate` keeps its
  single field and simply holds a tier now, with a legacy `true` reading as `'iron'` through
  `chestplateTierOf()` — so **no save needs migrating**, every existing truthiness test still means
  "wearing a plate", and `equipVillagerGear(id, 'chestplate')` still works by delegating to the tiered
  action. That makes the store action `setDefenderLoadout`-shaped: equipping a better plate hands the old
  one back to the Armory in the same click instead of destroying it — deliberately the same shape as this
  wave's carriers, since it is the same problem. The player has no armor equip slot (owning a plate IS
  wearing it, which is how `armorReduction` has always read it), so the Satchel paperdoll and the
  first-person avatar both key off the best plate owned; lesser plates show owned-but-outclassed rather
  than vanishing, because they are the Forge's ingredient for the next rung. New art-asset extraction —
  genuinely new "forged"/"crested" donor prints — remains the only thing that would beat this, and is a
  texture-pipeline task, not a code one.
- [CORRECTED 2026-08-06, Wave 8] ~~Catapult/trebuchet (only the cannon exists; firing sound `snd060`
  is waiting).~~ **This line was already out of date and nobody had noticed.** A catapult has been in
  the game since the 2026-07-20 rig-lab pass: `oc6096-4` "Catapult" is a registered buildable in the
  Siege tab (`buildables.ts`'s `SIEGE`), it is manned and fired through the same generic
  `labCanFire`/`manEngine`/`fireCannon` path the cannon uses, with real arc physics, splash damage,
  stone consumption and a real swinging arm — plus `oc6096-3`/`oc1289`/`oc6032b2` as further throwers,
  two of which already fire on their own cadence in Cedric's siege. And `snd060` is not "waiting": it
  is a sample id from the ORIGINAL 1998 game's numbering, and no such file was ever carried into this
  project — `public/assets/sounds/` holds 40 human-named WAVs and nothing maps an `sndNNN` id to any of
  them. What was genuinely missing was that every engine played the cannon's report; Wave 8 gives them
  distinct voices built from the real bank, keyed off the lab's own `siegeRole` (`siege.ts`'s
  `fireSound`): torsion arms get a whoosh plus the timber THUD of the arm hitting its stop,
  bolt-throwers get the crossbow, only powder keeps the bang. If a bespoke catapult sample is ever
  wanted it has to be SOURCED — there is nothing in this repo to wire up.
  **Verified live, exact numbers**: `oc6096-4` placed via the real build menu for wood 12 / plank 8 /
  iron_bar 2; real E-hold crewed it (`crewState.engineId` set, prompt flipped to "Step down"); 5 real
  LMB-held shots over 6017ms averaged 1.203s/shot against the 1.2s crew cooldown, 1 stone consumed each;
  a Castle Wall target ~15.6m down-range took real damage and was destroyed by follow-up hits — arc
  physics and splash both confirmed against a real target, not a flat "did damage happen" check. Sound
  fix confirmed by intercepting `audio.play` directly: Catapult and both Stone Throwers played
  `['sword_swish','thud']` (the whoosh+THUD pair), Wall Cannon kept `['cannon']`, Crossbow Station played
  `['crossbow']` — exactly the `siegeRole` keying described above.
- [COMPLETE] ✅ **Timed build challenges** (2026-08-14, Wave 13). **Corrected claim, same pattern as the
  catapult-sound line above**: no voiced text for these six challenges could be found anywhere in this repo
  — not in `public/assets/sounds/` (40 named WAVs + an 11-line `lore/` set, none challenge-named), not in
  `kk_research_folder/research/`, not referenced by any `scripts/*.mjs`. Either that source material lives
  outside what was ever pulled into this project, or the claim was stale — either way, shipping "voiced"
  intros against an asset that cannot be located here would mean inventing fake paths, so this uses plain
  `notify()` toasts instead, exactly how the game already delivers its other one-shot lines.
  Scoped to ONE of the six `challenge-N` destinations end to end (`challenge-1`,
  `game/buildChallenge.ts`'s `BUILD_CHALLENGE_ID`), not all six spread thin, per the task brief's own
  "prototype one, then extend" precedent (Wave 4's settlement, Wave 12's elevation quadrant). Building
  itself needed **zero new plumbing** — a challenge ground is an ordinary `WorldDestination`, so
  `ClaimBanner.tsx` already offers "Claim this Land" there (it only excludes `dungeon`/`arena`), and once
  claimed, `placeBuilding`/`constructBuilding`/`evalPlacement` already worked there exactly as they do at
  any of the nine templates — confirmed by reading `evalPlacement`'s region fallback, not assumed. What
  this wave adds is the timer layer on top: a "🔔 Ring the Bell" HUD button (`BuildChallengePanel.tsx`,
  shown once the ground is claimed, same gating convention as `ClaimBanner`) starts a 90-second run;
  fully-constructing 6 pieces (any buildable — a deliberate choice so the player picks their own fastest
  cheap option, e.g. a farm plot's 4-swing build, rather than being forced through one specific structure)
  wins gold + building XP, credited from `gameStore.ts`'s `constructBuilding` at the exact moment a piece
  actually finishes (not at ghost-placement); running out the clock or leaving the ground loses/abandons
  the run silently, ready to retry.
  **Deliberately NOT built, and why**: a specific-structure/set objective ("build exactly this recipe") —
  the six diorama layouts weren't individually inspected for what such an objective should even look like
  per-map, and the generic "N pieces" version the task brief explicitly allows is enough for a first slice;
  no persisted best-time/win record — this is a repeatable minigame in the same family as jousting Richard
  or the Endless Arena, neither of which persist a completion flag either, so this doesn't invent one.
  **To extend to the other five**: `BUILD_CHALLENGE_ID` is a single constant (currently
  `CHALLENGE_DESTINATIONS[0].id`) with nothing challenge-1-specific hung off it — promoting it to a small
  per-destination table (target count / time limit / reward, keyed by destination id) and having
  `BuildChallengePanel.tsx`/`constructBuilding`'s check read from that table instead of one constant is
  the whole job; the six dioramas themselves need no further work, they already travel and already allow
  building once claimed.
  - **A live bug found by Wave 13's own verify pass, fixed 2026-08-14**: `BuildChallengePanel`'s "Ring
    the Bell" button — and `ClaimBanner`'s pre-existing "Claim this Land" button it copied the pattern
    from — were both plain, unwrapped children of `HUD`'s outer `.hud` div. `globals.css` sets
    `.hud > * { pointer-events: none }`, only re-enabled via the `.clickable` class every other clickable
    HUD element (`DialoguePanel`, `Panels.tsx`'s `game-panel clickable`) already carries; neither button
    had it, so a real mouse click hit-tested straight through to the WebGL canvas underneath and could
    never reach either button — the entire Timed Build Challenge feature, and land-claiming in general,
    had zero reachable entry point for a real player. Fixed by wrapping each button's container in
    `className="clickable"`. Confirmed live: `getComputedStyle` now reads `pointer-events: auto`,
    `document.elementFromPoint()` at each button's own center now resolves to the `<button>` itself
    (previously `<canvas>`), and a real, unassisted `page.click()` on each — not a store bypass — now
    claims the ground and starts the challenge.
[COMPLETE] ✅ **Delivery quests — haul goods by cart between instances** (2026-08-14, Wave 13).
`carts.ts` turned out to be siege equipment (a battering ram / blade-cart, both `category: 'defense'`) —
reusing it for a supply run would misuse combat props as a delivery vehicle, so it is untouched. There
is also no engine concept of an entity surviving a `travelTo()` scene-swap (confirmed by reading
`travelTo` itself: it only moves the player and mutates `destination`/`visitedWorlds`). What DOES
already cross a scene-swap is the player's own inventory — one flat, global field, never partitioned per
world — so this is built the honest way that fact actually supports: gather the goods, carry them, walk
or travel to the other place, hand them over. New `SideQuestDef.kind: 'deliver'` (`npcs.ts`) makes this a
real, distinct quest type rather than a relabeled 'gather': accepted from an ORIGIN giver but only
turnable-in at a `deliverTo` destination — a different `WorldDestination` entirely, and DialoguePanel
now recognizes an active delivery errand as "yours to turn in" at whichever NPC lives there, even though
that NPC didn't hand it to you. Two errands (`data/deliveryQuests.ts`): Alric hauls 10 wheat and Beda
hauls 8 planks out to Fenwick's settlement at template-08 (The Old Ruins — Wave 4's empire-arc
prototype, already a real endpoint with resident villagers and a yield loop), both gated behind
`settle_clear` so the order reads right — clear the ruins out before anyone trusts a cart through them.
Pays gold on N76's own pipeline (24 / 22).
**A real, separate gap found and fixed along the way**: `DialoguePanel.tsx`'s offer/accept logic read
`npc.sideQuests` directly, never `sideQuestsOf(npc.id)` — the exact dead-code trap logged in this file's
own N76 writeup and Wave 4's settlement-quest section, left open in both. Fixed here (the last of four
consumers — QuestLogPanel/HUD/ParleyPanel already all read through `sideQuestsOf()`), which brings BACK
TO LIFE everything that was silently unreachable before: the king/queen/richard allegiance chains
(`k_muster`→`k_patrol`→`k_oath`, `q_relief`→`q_ledger`, `r_drill`) and Alric's/Beda's own village work
(`al_fence`→`al_scarecrow`→`al_wolves`, `bd_timber`→`bd_stone`→`bd_road`) — real, complete data that
existed for waves with nobody able to ever actually accept it through ordinary dialogue. Verified this
wasn't a regression risk by tracing every other reader first: `bumpSideQuest`/`turnInSideQuest`/
`acceptSideQuest` already worked purely off `sideQuestsOf()`, so nothing about progress tracking or
turn-in changed — only which quests the "talk to them" panel was willing to SHOW. `npx tsc --noEmit`:
exit 0.
[COMPLETE] ✅ **Alliance follow-ups: reputation fallout, alliance-exclusive quests/rewards, a turncoat
path** (2026-08-14, Wave 13). Scoped honestly smaller than a full narrative arc, per the task brief:
- **Reputation fallout**: pledging Cedric used to cost nothing against the OTHER side — the raid AI
  flips (a strict *benefit*) but Richard's and the Queen's opinion of you never moved, even swearing to
  the man raiding their kingdom. Now it does: `pledgeAlliance('cedric')` docks both -20. Pledging Leo
  gets no invented mirror — there is no NpcDef for Cedric to dock reputation against, and the REAL,
  already-existing cost for that direction is structural and substantial: `PlayerController`'s own
  `challenge_cedric` branch skips the parley entirely and starts a duel on sight once `alliance==='leo'`,
  permanently locking out his whole quest line (nothing new needed, just documented here for the record).
  **A latent bug fixed along the way**: `addReputation` fired its tier-up cheer-and-10-gold reward on ANY
  tier boundary crossing, not just upward ones — every call site before this wave only ever passed a
  positive amount, so a negative delta (this feature's whole point) would have handed the player free
  gold for LOSING standing on a downward dip that still landed on a real tier. Fixed with a `.min`
  comparison guard; every existing positive call site is unaffected.
- **Alliance-exclusive quests/rewards**: one true capstone per house (`data/allegianceQuests.ts`),
  gated on a NEW `needsAlliance` field — distinct from the existing `needsAllegiance` (the continuous
  -100..100 score, which ordinary errands nudge even for someone unsworn). `needsAlliance` reads the
  one-way PLEDGE itself, so these are only ever offered to a knight who actually knelt. `k_champion`
  (Leo's, requires `k_oath`) and `ced_warlord` (Cedric's, requires `ced_banner`) both reward a
  `chestplate_crested` — the top armor tier, otherwise only reachable through the Forge's two-step
  re-forge chain — plus a large gold purse, a real, immediate, visible reward (the player has no armor
  equip slot; owning a plate IS wearing it, so this is not cosmetic).
- **Turncoat bones**: one direction only — `betrayCedric`, reachable from the War Council once already
  sworn to him, resets `alliance` to unsworn (free to then pledge Leo through the normal flow) and
  permanently burns the bridge (`betrayedCedric`, checked by `pledgeAlliance` so defecting can never
  become a free way to ping-pong between both pledges' exclusive rewards). **Leo→Cedric is explicitly
  NOT built**: the interact branch that greets a Leo-sworn knight at Cedric's camp is an on-sight duel,
  not a parley, so there is no symmetric "ask to defect" moment to hang a mirror action off without
  redesigning that branch — a real, separate piece of work, left for a future pass rather than forced in.
`npx tsc --noEmit`: exit 0.
[COMPLETE] **Cedric's siege — an epic, unlockable set-piece battle** (requested 2026-07-28, shipped
2026-07-30). Two distinct encounters, per the design given: Cedric can now be fought everywhere he
always could, but only the SECOND of these two ever permanently ends him —

- **The homestead siege** (`components/world/CedricSiege.tsx`), a structural mirror of `DragonSiege.tsx`:
  once `game/cedricSiege.ts`'s `CEDRIC_SIEGE_TIER` (4 — past the dragon's own tier-3 gate) is reached and
  the reveal quest is done, a nightly roll can bring his full war party — himself, Gilbert, four bandits,
  a guaranteed battering ram (not the ordinary raid's 40% coin-flip), and two ambient siege engines
  (Catapult `oc6096-4`, Stone Thrower `oc1289`) — down on the homestead. The engines fire on their own
  cadence at ordinary buildings AND finished Keep pieces alike (`st.damageBuilding`/`st.damageKeepPart`),
  deliberately with NO wood/stone filtering the way dragonfire has — a catapult stone does not care what
  it lands on, so this siege threatens a stone Keep the dragon never could. Repelling it (every raider
  gone before the 70s timer) or merely enduring it never permanently defeats him — `recordCedricSiege`
  mirrors `recordDragonSiege` exactly: a `cedricSieges` counter and a `cedricRouted` flag, the same
  "weathered, not killed" shape the dragon already has.
- **The final stand**, upgraded in place from the existing camp-duel trigger (`PlayerController.tsx`'s
  `challenge_cedric` handler, `Panels.tsx`'s `ParleyPanel`) rather than a new trigger surface — once
  `cedricFinalStandReady` (arc-eligible AND at least one homestead siege survived — the literal code
  expression of "vanquished here is not his final stand; that comes on his own map"), the SAME "Challenge
  Him to Battle" button spawns him with `finalStand: true`, alongside an escort and one 20-second-timed
  reinforcement wave for a real multi-wave fight. This is the only spawn of his that can permanently end
  him.

**The load-bearing mechanism, and the cheapest part of the whole feature**: every OTHER appearance of
Cedric — the existing 35%-chance raid-leader cameo, an ordinary early camp duel — needed zero trigger
changes at all. A single flee-guard extension in `Enemies.tsx` (mirroring the existing bandit
morale-break: `data.kind === 'cedric' && !data.finalStand && data.hp <= 9` bails him out at ~20% HP,
same as a bandit — no kill credit, no loot, no death) makes every non-`finalStand` spawn of him
structurally incapable of a permanent kill, with `combat.ts`'s two `markCedricDefeated()` call sites
gated on `finalStand` as a second line of defense. Beats fully suppressing his early appearances (which
would leave a long dead zone between the reveal quest and the siege's own tier gate with nothing to do
at his camp) — he stays a real, fightable threat throughout, just not a permanently-killable one until
the story says so.

Capstone reward (`markCedricDefeated`, gameStore.ts) is real now: {gold:250, iron_bar:10, stone:20} (was
{gold:100, iron_bar:3}), a salvaged halberd + chestplate to the Armory, and a +35 allegiance swing — on
top of two things that already existed and just needed their trigger finally gated correctly: the
`cedric_jailed` Deed and its `minifigcedricbull00` crest unlock (`crestUnlocks.ts` — confirmed already
wired, not new). Two new Deeds, `bull_siege`/`bull_routed`, mirror `flame_stone`/`sky_sting` exactly.

**A real pre-existing bug found and fixed along the way, not introduced by this work**: the splash-damage
loops in `siege.ts` (`explodeBall`, `detonate`, `ramCheck`) — shipped in the earlier Keep siege-damage
PR this same session — never excluded the Keep's own synthetic `PlacedBuilding` (added for interact-
detection only) from their `st.buildings` target lists. A cannonball, charge, or ram landing on the
Keep's foundation would call `damageBuilding` on that synthetic entry, and at 0 HP would delete it —
orphaning the real assembled castle (`st.keep`) while breaking "Enter the Keep" all over again. Found
live-testing this siege's own engine fire hitting the same entry; fixed with a `b.type !== 'keep'`
exclusion in all three loops (mirroring the exclusion `CedricSiege.tsx`'s own engine-target list already
needed) rather than left as a latent trap the next siege source would have rediscovered.

Verified live end-to-end: the full war party spawning correctly (composition, guaranteed ram, no
double-trigger with a Dragon Omen/Siege night); engine fire destroying a Keep wall piece within the
observed window with zero leak onto the Keep's synthetic entry; a repel AND a forced timeout both
recording correctly with the right reward-or-not; the real "Challenge Him to Battle" button — clicked
through the actual DOM, not simulated — upgrading into the final stand with its escort and timed
reinforcement; a genuine kill through the unmodified `combat.ts` path granting the full capstone (gold,
Armory gear, allegiance, both new Deeds, `cedric_jailed`, and the crest unlock in `localStorage`) with
zero console errors throughout.
- [COMPLETE] ✅ **Underground fight arena — endless mobs, an ongoing kill-count quest, escalating modifiers**
  (requested 2026-07-28, design finalized and built 2026-08-03): a new "Endless Arena" destination
  (`game/data/worlds.ts`'s `ARENA_DESTINATION`, sibling to the Sealed Crypt's own non-baked destination),
  reached from the Travel Map's own hub — the "general safe zone" the design called for, reusing the
  existing homestead rather than new geography. Four reskinned environments (earth/water/snow/lava,
  `game/arena.ts`'s `ARENA_ENVS`), each with real player speed/stamina-drain/ambient-damage modifiers and
  an enemy speed modifier, plus a loot multiplier offsetting the harsher ones. Kills counted in a
  dedicated run-local leaf module (`arenaState`, deliberately NOT folded into `SideQuestDef` — its
  `need: N` shape doesn't fit an open-ended counter) with real rewards at 50/100/200/500, a separate
  ammo/gold-skewed loot table (`rollArenaMilestoneLoot`) that never touches the normal drop tables.
  Enemy stats escalate via `arenaSpawnScale()` — a run-local multiplier layered on top of the existing
  `raidStrength()` progress curve via a new optional `spawn()` param, so both HP and attack damage scale
  together exactly like a raid does. On death inside the arena: `damagePlayer()`'s own long-reserved hook
  fires first — reset to the safe zone, run reset, explicitly no day-skip. Voluntary exit banks whatever
  milestones were already claimed. **Two real pre-existing bugs found and fixed getting this working:**
  `Enemies.tsx` unconditionally clamped every enemy's position to the home world's own ±200 bound every
  frame — invisible for the Sealed Crypt (short fights, walls mask it) but immediately obvious here
  (enemies snapping thousands of units back toward the home region); and the "Claim for your Kingdom"
  plot banner had no exclusion for non-buildable procedural destinations beyond the Crypt. Verified live:
  all four environments render with distinct floor/wall/fog colors and correct HUD labels; spawned
  enemies stay near their real spawn point instead of teleporting; all four milestones grant exactly once
  with real loot; death inside the arena clears `destination`/`arenaState.active`, restores HP, and
  leaves `dayCount` unchanged; voluntary leave and re-entry both work cleanly.
- [COMPLETE] ✅ **A real ladder — SHIPPED 2026-08-06 as Wave 8.** `oc6096-5` is a real catalog piece
  (Siege tab, `stackable` so two lashed together clear a 5.28m castle wall), and holding E at one
  raises the player onto whatever it leans against. The thing that had to be built first was the
  FLOOR: `KeepPart.walkway` was a number nothing stood on, because the keep's raised pieces are not
  `PlacedBuilding`s and `floorHeightAt()` only ever looped `st.buildings`. `keepWalkwayAt()`
  (`data/keep.ts`) gives the wall walk a real footprint at a real height, `floorHeightAt()` consults it
  with its own slightly larger step allowance (the ring is not one level — a Corner Turret's walk is at
  4.2 and the Crenellated Wall it meets at 3.6, a 0.6m lip the ordinary 0.55 ledge rule refuses), and
  from there ordinary gravity, walking off the edge and `onBattlement()`'s +25% elevated ranged bonus all
  work with no pinned movement mode to maintain. Getting down: a symmetric "Climb down" at the ladder
  from above, or step off and fall like anywhere else.

  **Verified live, exact numbers**: standing at the foot of a placed ladder, real hold-E climb landed
  the player at feet-Y 4.2 exactly (the corner turret's walkway), still 4.2 after 2s idle (gravity holds
  it, no pinned mode). A real `fireBolt()` up there dealt 8.75 damage against 7.00 on the ground — exactly
  the `onBattlement()` +25% multiplier, so the check genuinely reads true. Walking the ring from the NW
  turret traced y 4.2 → 4.12 → 3.60 (crenellated run) → 4.19 → 4.20 (NE turret), confirming the 0.8m step
  allowance clears the 0.6m lip. One ladder against a 5.28m Castle Wall gave a non-actionable prompt;
  stacking a second landed the climb at y 5.28 exactly.

  **Two real issues found after that initial pass and fixed the same day**, since neither is a
  mechanics bug: (1) the mold itself (screenshot-confirmed) is not a bare ladder — it is a small stone
  gate-arch with a ladder built into it, and no other `isLadder`-flagged mold exists anywhere in the
  extraction to swap in for it (`capabilities.json` has exactly one). Renamed **Siege Stair** and
  repriced with a little stone to match what is actually drawn, rather than continuing to call a stone
  module a "ladder." (2) The non-actionable prompt always read "Lean this ladder against a wall to
  climb" even when it genuinely WAS leaning and the real problem was reach, misdirecting the player
  toward re-placing instead of stacking a second one — `climbTargetFor` now reports (via an optional
  out-param the other two call sites don't have to touch) whether something real was in range at all,
  so the prompt reads "Too short to reach — stack another ladder" instead when that's the true reason.

  **Also disclosed here, honestly, and true of all five of Wave 8's new catalog pieces below (the
  ladder/Siege Stair, the Catapult already shipped earlier, and the Jail Cell/Jail Tower/Jewel
  Tower/Drawbridge Front)**: every one of them is locked in the build menu behind assembling its real
  LEGO set in the workshop first (`setBuild.ts`'s `setOwning` — Siege Stair and Catapult under set 6096
  "Bull's Attack", Jail Cell/Jail Tower under 6094 "Guarded Treasury", Jewel Tower/Drawbridge Front
  under 6098 "King Leo's Castle"). This is the SAME precedent the catalog already used for `oc6094-1`/
  `oc6032b4`, not a new gate invented for this wave, but it means none of this wave's new content is
  actually reachable in a fresh save until the matching workshop set is built — a real, long-form
  prerequisite, not a five-minute unlock. Original note follows —
- [WAS TODO] **A real ladder — climb the walls, look out over the world** (requested 2026-07-29): checked
  the rig lab's own JSON rather than assuming — `public/assets/rigs/capabilities.json` really does
  carry a dedicated ladder mold, `oc6096-5` (from the Bull's Attack set, alongside Cedric's own
  counterweight siege engine, `oc6096b3`, which separately carries a `ladder`-labelled sub-part of its
  own). `oc6096-5`'s own traits are exactly what this needs: `rigClass: "ladder"`,
  `structureKind: "ladder"`, `isLadder: true`, `isMovableLadder: true`, `canStandOn: true` — flagged
  `rigStatus: "todo"`, i.e. catalogued but never verified/wired up. It's already secretly IN the game
  today: the generic auto-generated bricks pipeline picked it up as `gen_oc6096-5`, "Castle Piece 6×5",
  filed under the Castle category — placeable right now, but as a purely decorative box with none of
  the rig lab's own richer semantic traits cross-referenced, so nothing about it says "ladder" and
  nothing lets the player climb it. This is the same gap flagged earlier under Phase 25's own
  "Not yet covered" note: "actual walkable-parapet access (climbing onto the walkway a wall's
  `canStandOn` label implies — no stairs mechanic exists yet)" — a real ladder-climb interaction (an
  E-hold near a placed one, raising the player smoothly to `KeepPart.walkway` height) would close that
  exact gap, give the still-open "Defenders do not use the walls" item (`KeepPart.walkway` records the
  height; nothing posts anyone to it) a real path onto the parapet for the player first and a defender
  later, and hand the player the first actual way to reach `onBattlement()`'s already-built +25%
  elevated ranged-damage bonus (`combat.ts`) — on top of the vista itself, which was the actual ask.
[COMPLETE] **A real 0-HP state, everywhere else** (requested 2026-07-28): `damagePlayer()`
(`game/combat.ts`) already reset HP/stamina and teleported home on knockout; it now also jumps
`worldEnv.time` to 0.27 (just before sunrise — the same dawn value `sleep()` uses for a bed) and
clears `useEnemyStore` (which holds both raid AND dungeon-room enemies in one flat array, so this
despawns whatever was pressuring the player either way). Explicitly not a game-over screen — the
existing "carried back to camp" notify now says so and wakes at dawn. Left as a hook for later: a
future arena's own "respawn just outside, redo" rule (below) needs to check for that case and
return before reaching this general path, not stack with it — noted in the code at the same spot.
[COMPLETE] **N79 · Raiders should arrive by the road, not pop into existence** (requested 2026-07-28):
raiders now spawn loosely clustered around `roadEntry()` (`data/road.ts`) instead of on a random
point on a 38m ring, tagged `approaching: true` (`EnemyMob`, `game/combat.ts`). While approaching, a
new branch in `Enemies.tsx`'s per-frame block routes each raider toward `HOME_X`/`HOME_Z` via the
same nav-grid `findPath` the ordinary chase behavior already uses, with its own small pack-separation
nudge so they don't stack; it clears itself (handing off to the normal wander/chase/attack FSM)
once a raider is within 30m of home or the player is already within the usual 26m aggro range,
whichever comes first. Answers the open design questions with the simplest reasonable default: the
whole party leaves together (no stagger) and every raid kind gets the walk-in, not just Gilbert's —
"peeling off toward different sides" stays open if it turns out to want more than the existing
chase-branch flanking already gives it once they're close. The raider ram (`raiderRamState`, a
separate system with no mob/walk-in of its own) still starts on the old 34m ring, unchanged.
Verified live: three bandits spawned at the road entry with the player far away (isolating the
walk from aggro) steadily closed on (0, 0) via real pathing, not a straight teleport-toward-target.

**Homestead & economy**
- [COMPLETE] **Bug (deferred, Phase 10 #9):** the traveling merchant's cart parked inside `BUILD_REGION` —
  `MERCHANT_SPOT` has since been relocated (O4, then again at L68).
- [COMPLETE] **Bug:** the merchant's minifig spawned with its arms floating in the air, detached from
  the body — reported and fixed 2026-07-28. Not a rig bug: the `'present'` stage in `Merchant.tsx` set
  `g.rotation.y = s.yaw` without the `+ Math.PI` the arriving/leaving branch (and every other
  `RiggedFigure` user) applies, so he stood rotated 180° from his rig's own forward-facing assembly
  assumption for the entire time he's actually interactable — which read as disconnected floating
  hands from the angle a player naturally approaches from. Fixed by adding the missing offset;
  confirmed by screenshot from both sides. Also: his arrival/departure now walks from the real road
  entry point (`roadEntry()`, the same one every newcomer uses) instead of an arbitrary point 18m
  behind `MERCHANT_SPOT` that had nothing to do with the actual road.
- [COMPLETE] ✅ **Taming: falcon companion** (2026-08-13, Wave 13). The sky falcon
  (`Wildlife.tsx`) was pure decoration before this — a fixed loop round the world origin, no id, no
  ground state, nothing to walk up to. Scoped deliberately smaller than the horse-capture precedent
  it's closest to: one always-on companion, not a roster (`SaveGame.falconTamed`, a single boolean —
  see `game/falcon.ts`'s header for why it isn't a `HorseMob`-style registry). A walk-up range doesn't
  mean anything for something that never lands, so "Whistle for the Falcon" feeds the same scored
  `consider()` the rest of the interact system runs on with the bird's own live position instead of a
  fixed spot (`game/falcon.ts`'s `falconPos`, written every frame by `Wildlife.tsx`) — same no-skill-
  check, instant-on-E capture `mountHorse` already established, just aimed at a moving target. Once
  tamed it circles the player instead of the world origin, stays visible after dark (unlike the wild
  bird), and pings the nearest un-worked, already-deeded resource node within 50m every 45-75s — real
  value away from home, where `Minimap.tsx` draws no resource nodes at all. Deliberately NOT shipped:
  no rideable/mount behavior, no hunting minigame, no way to dismiss/re-summon (taming is one-way, like
  `dragonSeen`/`treasureOpened`) — all explicitly out of scope for a v1 companion, per the task brief.
- [COMPLETE] ✅ **Cooking depth beyond bread/cooked fish** (2026-08-10, Wave 9 pass C): three new campfire
  dishes above the two that existed — **Herb Pottage** (2 herb + 1 wheat), **Fisherman's Stew** (2 fish +
  1 herb + 1 wheat, behind the same `fishing` gate Cook Fish uses) and **Blossom Tart** (3 wheat + 2
  flowers + 1 herb) — each on the existing station/skill/`requiresUnlock` convention and each an `EDIBLES`
  entry continuing that ladder: 6 / 9 / 13 vigour, above the Healing Draught's 5 rather than beside it,
  so the draught stays the cheap mid-fight top-up (2 herbs, drinkable in a scrap) and these are a meal you
  cooked ahead. *Design call:* **zero new gatherables.** Everything here is something the world already
  yields — wheat off a farm plot, fish off the pond, herb off a node, flowers off a node or as a craft
  side-good (`SIDE_GOODS`) — because a new raw ingredient means a new `ResourceNodeState.kind`, which is a
  type-union change rippling through the gather and render paths: a mechanic, not the content this line
  asked for. Notably **flowers had never had a food use at all** (only the two draughts), and the tart is
  the answer — petals in a tart is exactly what a medieval kitchen did with them. The stew deliberately
  takes RAW fish, so it competes with Cook Fish for the same catch instead of stacking on top of it. All
  three sell (6/11/14, a little above what their ingredients would fetch raw) and all three are listed in
  `BULK_GOODS` with bread and cooked fish, since stored food is stored goods.
- [COMPLETE] ✅ **Unlockable crests** *(shipped 2026-07-19)* — went **account-level** instead of in-save:
  `data/crestUnlocks.ts` keeps unlocks in localStorage (`kk_crests`, like `kk_settings`), so jailing
  Cedric once on any save gives the Bull Sigil to every future hero. Five earned crests: Rampant Lion ←
  Paladin deed, Bull Sigil ← Cedric jailed, Storm Sigil ← duel win vs Storm, Broken Axe / Horned Sigil ←
  1st / 2nd full Sealed Crypt clear (the dungeon cosmetic loot). `checkDeeds` runs a derived sweep
  (deeds + lifetime `dungeonsCleared`), so pre-existing saves back-fill automatically; the creator greys
  locked tiles with 🔒 + unlock hint and skips them for default selection.
- [CORRECTED + COMPLETE 2026-08-10, Wave 9 pass C] ✅ **Dye recipes for new palette rows.** The line
  presumed a partial system with gaps to fill; **there was no dye system at all** — grep for `dye` across
  `src/` returned nothing. What existed was `PALETTE_SWATCHES` (`data/minifigs.ts`), 30 curated indices
  into the runtime palette, read by all three colour pickers (creator, Appearance panel, villager editor)
  with **every swatch always clickable and never any cost**. So this is 100% new content and mechanism:
  `data/dyes.ts` IS the system. Four dyes brewed at the **campfire** on the `farming` skill, beside the
  draughts and for the same reason — a dye vat is a pot of plants over a fire, and this game has no other
  "boil something" station: **Woad** (3 flowers + 1 herb), **Madder** (2 flowers + 2 iron_ore), **Bark**
  (4 wood + 1 herb) and **Tyrian** (5 flowers + 3 herb), priced by how hard the colour is to come by
  rather than how it looks. No `requiresUnlock` — the ingredients gate them honestly (no madder before
  you're mining ore) and no quest line has ever mentioned dye.
  *Design call 1:* **dyes ADD rows, they never gate the ones you have.** Locking some of today's 30
  swatches would take colours away from every existing save, and — worse — the character creator runs
  BEFORE a save exists, so a locked row would be free at Forge Your Hero and cost herbs to pick again an
  hour later. The free 30 stay exactly as free as they are; each dye opens four colours the game has never
  offered at all (verified against the real `palette.json`: the pale heraldic blues, and oranges, purples
  and browns that have **no representative in the free set whatsoever**), so a dyed row is visibly a new
  thing to wear rather than a slightly different blue.
  *Design call 2:* **unlock once, keep for the save** — not consumed per recolour. Recolouring is
  fiddling: you try a leg colour, hate it, try another. Charging a brewed item per click would make
  experimenting expensive and turn the picker into a shop. This mirrors the shape of the game's one
  existing cosmetic gate (`data/crestUnlocks.ts`'s locked-tile-plus-hint) but persists in the **save**
  rather than localStorage, because a dye is brewed from this character's own herbs whereas a crest is a
  deed the player earned once and keeps across every hero.
  UI is one shared `DyeRack` rendered in **both** pickers — a dye is opened for the save, not for one
  figure, so unlocking Royal Purples while dressing a villager must put the same colours in the player's
  own picker, and rendering the same component over the same store field is the only way that can't
  drift. Locked rows show their **real colours** (dimmed) rather than grey placeholders: the point of a
  dye is seeing what you'd be buying. New save field `dyes?: string[]`, absent = today's exact behaviour.

**Build system**
- [COMPLETE] ✅ **Functional doors + enclosed-area "your homestead is a fort" buff — SHIPPED 2026-08-06
  (Wave 8).** The eight `windows_doors` molds were decorative bricks you walked through; the biggest of
  them (`l407100`, big enough to be a doorway rather than a 1×2 pane) is now the **Portcullis**: hold E
  to raise/lower it, shut it blocks the player, the nav grid, raiders and takes a battering ram, open it
  lets everyone through. It shares `gateOpen` and `toggleGate` with the Castle Gate rather than growing
  a parallel record — one `isDoorLike()` predicate (`game/types.ts`) replaced the half-dozen hardcoded
  `type === 'gate'` checks, so no new save field exists to be backward-compatible about.
  **Visual correction, same day**: this shipped first as an "Oak Door" with a procedural wooden leaf
  hinge-swinging behind the mold. Live verification screenshotted the real problem: `l407100` is not a
  hollow frame, it's a barred lattice filling the whole opening — the bars stayed visibly standing in
  the doorway even while "open," and shut, the leaf's flat panel didn't reach the lintel and sky showed
  through a real gap. Renamed **Portcullis** and reworked to match what the mold actually is: no
  procedural leaf at all, the real mesh raises straight up (2.3m, into an implied gatehouse slot above)
  when open and drops back to the ground when shut — a naming/motion fix, not a new asset, and every
  collision/nav/raider/ram/fort-seal check reads `gateOpen` exactly as before, unaffected by how it's
  drawn.
  **Sound Walls** (`game/fort.ts`) is the buff: a 1m lattice over the current land tier is stamped with
  every rampart (lab `canConnectAsWall` meshes, `walls`-category pieces, shut gates/doors, and the
  keep's own built pieces) and flooded four-connected from outside the fence — if the homestead centre
  cannot be reached, the ring is closed, and you take 20% less damage anywhere inside it (applied after
  armour in `damagePlayer`, so plate and stone are two separate investments). A HUD chip next to the
  clock shows the ring and its piece count, and closing/breaking it toasts. **Design note, honestly
  stated**: the research suggested walking Wave 8's own wall-connection GRAPH instead of a geometry
  pass. The graph is built and used (it reports the longest joined run), but the SEAL test is a flood
  fill on purpose — "are these pieces joined" is not the same question as "is the homestead inside
  them", and only the fill also answers a ring closed against the keep, a run that is merely long, and
  a single raised gate. Known limits: the 1m grid tolerates gaps under ~1m as sealed, and the check
  asks about the homestead CENTRE specifically (a ring built off to one side does not count).

  **Verified live, exact numbers**: a ring of 4 Wall Corners + 4 Castle Walls + 4 Portcullises (12
  pieces) built at the homestead. Real E-hold on a door: prompt "Hold E — Close the Portcullis" →
  `gateOpen` false, `door_open` sample played (previously unused), "You pull the door to."; reopening
  gave "Hold E — Open the Portcullis" → `gateOpen` true. Collision: walking into a shut door stopped
  dead at the threshold; open, the same walk passed straight through. All 4 doors open → `enclosed`
  false, ring 0, area 0. All 4 shut → `enclosed` TRUE, ring 12 pieces, area 85 m², longest run 12 — HUD
  chip read "Sound Walls · 12 pieces" and vanished the instant one door was raised. Through the real
  `damagePlayer` path: a hit that cost 2.0 HP outside the ring cost exactly 1.6 HP (20% less) standing
  inside it with all four shut; raising just one door dropped the buff immediately (full 2.0 HP again),
  and re-shutting it resealed the ring (85 m² again). Deleting a wall segment outright correctly broke
  the seal too (longest run 12 → 11). Windows were deliberately left out of this pass — see below.
- [COMPLETE] ✅ Windows as a separate interactable (shutters) — SHIPPED 2026-08-29 (Wave 24). Wave 20's
  `hasLineOfSight()` finally gave the mechanical reason this TODO was waiting on: a closed shutter now
  blocks a ranged shot exactly like a wall, an open one doesn't. See the Wave 24 section near the end
  of this file for the full writeup.
- [COMPLETE] ✅ **Building-conferred villager attribute bonuses (RTS-style)** (Wave 9 pass A): the new
  **Storehouse** (`data/buildables.ts`, 10 plank + 6 stone, `building2` gate, the same real crate mold the
  Stockpile uses at a markedly larger size) is the first piece in the game that buffs villagers just by
  standing. `externalCapacityBonus()` is no longer a stub — it takes the buildings array and grants
  +3 carry per Storehouse standing in the villager's OWN settlement, capped at +6 (two of them).
  *Design call, documented in `attributes.ts`:* **ownership, not proximity.** The obvious radius version was
  written and rejected — carry capacity is only ever consulted where the villager is FILLING their sack
  (out at a tree or a vein), which is precisely where they are furthest from any store, so a radius check
  would have paid out only during the deposit itself and flickered on/off as they walked. Wiring is the
  one call site the stub was designed for: `carryCapacityOf(v, job, buildings?)`, fed from `Agent.ts`'s
  existing live `getState()` read, so a Storehouse that finishes construction is felt within one think
  tick. The adjacent "enclosed-area buff" idea was deliberately NOT folded in — it is a combat buff keyed
  off wall topology, this is an economy buff keyed off ownership; they share a slogan, not a mechanism.
- [COMPLETE] ✅ **Carrier item content (basket/cart)** (Wave 9 pass A): `basket`/`cart` are real `ItemId`s
  with Workbench recipes (3 plank + 2 wood; 6 plank + 4 wood + 2 iron_bar behind the `smithing` gate,
  priced against the +4/+10 capacity they buy), a Carriers row in the Armory (craft → donate → assign,
  exactly the helmet/chestplate pipeline), and a Carrier row in the Roster showing the villager's real
  `carryCapacityOf` number so the effect is visible before you spend. Store actions are
  `equipVillagerCarrier`/`unequipVillagerCarrier`, modelled on `setDefenderLoadout` **not** on
  `equipVillagerGear`: `gear.carrier` is one field holding a mutually-exclusive tier, so upgrading
  basket→cart hands the basket back to the Armory in the same action instead of destroying it. Worn mesh
  `WornCarrier` portals to **`rig.joints.hips`** — verified free (rightarm holds weapons AND the carried
  `ResourceProp`, leftarm the shield, head/body the armor; hips is read only by the walk-bob animator and
  portaled nowhere), so a hauler can wear the basket and carry the load in hand at once. Procedural, per
  the file's own "procedural where the original has no equivalent" rule — no basket or cart mold exists.
- [COMPLETE] ✅ **Real stockpile storage capacity** (Wave 9 pass A): `game/storage.ts`. Two design calls,
  both argued in that file's header. **(1) Per-good, not per-total** — one shared total sounds more like a
  warehouse but fails in play: hoarding 400 stone would silently block the fish you need to eat, with no
  way to see which good caused it. Per-kind keeps both the message ("your Wood stores are full") and the
  fix legible, and matches how the deposit AI thinks (a hauler carries exactly one resource). **(2) Scales
  with what you built, and refuses out loud** — 80 base, +12/barrel, +60/stockpile, +160/storehouse.
  Excess is refused with a throttled notification, never silently swallowed and never destroyed: `addItems`
  takes what fits, returns what it took (so `harvestNode`/fishing/the delivery toast now report the truth
  instead of what they hoped for) and never *shrinks* an already-over-cap stock, so demolishing a Stockpile
  can't delete goods you own. The cap binds `source: 'gather'` only — a quest reward, crypt loot or the
  royal chest arrives once and can't be re-earned, and `craft` writes directly because its ingredients are
  already spent; the cap governs what the world YIELDS you, not gifts or your own conversions. Gold, tools,
  weapons, armor, carriers and potions are exempt by kind (`BULK_GOODS`). `haul_to_deposit`'s `target_usable`
  now means **"has room"** instead of "exists", exactly as this entry asked: a hauler facing full stores
  holds their load and waits (gather.ts's "wait, don't fail" philosophy) rather than walking it across the
  map to be turned away, and resumes on the next think tick once you spend or sell. The Satchel's Parts Bin
  shows the ceiling and marks full goods, so the first refusal is never a surprise.
- [COMPLETE] ✅ **Row-fill wall placement, demolish-area tool, middle-mouse pan + Q/E aerial rotation**
  (Wave 9 pass B): all four live in `BuildController.tsx`, plus `placeRow`/`demolishArea` in the store.
  **Row-fill is shift-drag**, deliberately behind a modifier: an unmodified drag already means the opposite
  ("I moved off the cell — don't place", the 0.4s hold-to-place misclick guard), and the two readings of the
  same motion cannot both be right. It only offers itself for `walls.ts`'s `snapsAsWall` set (now exported),
  steps by the piece's own footprint from a wall-snapped anchor, and re-offers every step to `wallSnap`
  against the run it is laying, so filling a gap between two standing walls lands flush on both ends and
  every segment comes out `touching()` — a dragged run and a hand-laid one read identically to `game/fort.ts`.
  Direction comes from two ground-plane raycasts, i.e. world space, so it is automatically correct at any
  camera azimuth. The ghost greys out at the exact cell the materials run out (`rowAfford`), the run stops at
  the first cell that will not take, and the whole run is **one** undo entry — `placeHistory` widened from
  ids to groups for that (blueprints still push one group per piece, unchanged).
  **Area demolish arms, then fires**: the drag marks a patch, the rail names the count and the exact refund,
  and nothing moves until you press the button — it is the one action in the game that can level a wall run
  in a click. It loops the ordinary `removeBuilding` (new `quiet` flag folds twenty toasts into one report),
  and the Grand Keep's foundation is excluded, since its parts/progress/HP live outside `PlacedBuilding`.
  `buildingsInRect` lives in `data/buildables.ts` next to `sizeFor` so the live outline and the confirmation
  can never disagree about what is inside the box.
  **Q/E turn in quarter turns, eased** — everything the grid is made of turns in quarter turns, so a view
  that could stop at 37° would be the only thing not lined up with the ground it looks at. WASD and the new
  middle-drag both pan through the camera's *current* basis, so "up" and "right" keep meaning what the screen
  shows after a turn; the vertical drag is un-foreshortened by the rake so the ground stays under the cursor.
- [COMPLETE] ✅ **Freeform placement mode** (Wave 9 pass B): **F** toggles it, and it is scoped honestly.
  *Position* is fully freeform (the cursor is the answer — no rounding, no wall magnet). *Rotation* is
  freeform to look at: a new optional `PlacedBuilding.yaw` holds the true facing (R turns 15° at a time,
  shift-R a quarter turn) while `rot` stays the nearest quarter turn and remains the piece's **collision**
  truth. That split is the whole point — `evalPlacement`'s overlap test, `sizeFor`'s width/depth swap,
  `walls.ts`'s attach points and `collisionShapes` are all axis-aligned and only correct because rotation is
  a multiple of 90°; widening `rot` to a plain number means an oriented-box/SAT collision system and a save
  shape change, which is its own feature (see line ~5173's own conclusion). So a piece angled 35° stops you
  along its nearest square footprint, which is the documented cost of the mode, and why it defaults off and
  is aimed at decor. *Scale* deliberately not attempted: `Buildable.size` is a catalog constant with no
  per-instance override, a third separate schema addition implied by nothing here. Validity is NOT bypassed —
  region bounds, stacking, overlap and node clearance all still rule, and pieces cost exactly what they cost.

  **Wave 9, verified live end-to-end through the real UI/input (all 11 sub-features above), with exact
  numbers**: the storage cap measured by what a real 99999-unit gather actually took — 80 base, 140 with
  a Stockpile, 300 with a Storehouse too, 312 with a Barrel — and a real gather into a full 80-cap store
  accepted exactly 80 and posted "Your stores are full — Wood Log turned away," never shrinking an
  over-cap stock and never blocking `grant`/`craft`. Storehouse carry bonus read 4→7→10 off a real
  villager's own Roster line (third Storehouse correctly capped at +6), ownership-not-proximity confirmed
  by a Storehouse 400m away still granting it in the same settlement. Carriers crafted at a real
  Workbench for their real costs, donated and equipped through the real Armory/Roster flow (basket→cart
  swap handed the basket back, not destroyed), worn mesh confirmed live on `rig.joints.hips`. Attribute
  respec: 3 points → "↺ Rethink your nature — 70 gold" (25 + 15×3 exactly), confirm charged exactly 70
  and emptied `attrSpent`. Row-fill laid a real 6-piece run in one shift-drag at exact footprint spacing,
  refunded as one `U` undo, stopped correctly on short materials, and correctly laid nothing for a
  non-wall piece. Area-demolish armed a real marquee, named the exact piece count and refund, excluded a
  Grand Keep foundation standing in the patch, and left everything outside it untouched. Q/E landed on
  exact quarter turns; middle-drag pan matched the grab-the-ground math exactly (un-foreshortened by the
  camera's rake) and repaired itself correctly after a turn (screen-space, not stale world-space). Dyes:
  all four campfire recipes crafted and poured through the real Appearance/villager pickers, each
  growing the swatch count by the same 16 in both panels off one shared save field, indices checked
  against the real `palette.json` and found genuinely new colour families. Cooking: three new dishes
  crafted and eaten for their exact documented vigour. Armor: the Forge ladder correctly consumed the
  rung below at each step, player damage reduction measured exactly 20/28/36% through the real
  `damagePlayer` path (the 0.45 ceiling now genuinely binding), defender max HP exactly +6/+10/+16, and
  the crested plate's distinct raised emblem confirmed both by geometry fingerprint and by eye (a
  screenshot of the real rotatable equipment preview). Zero console/page errors across every run.

  **Three real defects found by verification and fixed the same day, all re-verified**: (1) the haul AI's
  new "wait if the store has no room" behavior only gated the START of a delivery — the deposit itself
  still cleared a villager's whole load unconditionally, so if a store filled up mid-walk the difference
  between what was accepted and what was carried was silently destroyed, precisely the outcome this
  wave's own storage design says a cap must never produce. `ai/actions/haul.ts` now reads what `addItems`
  actually accepted: a full deposit clears the load as before, a partial one keeps the remainder in the
  villager's own hands to redeliver, and a zero-room deposit fails cleanly with nothing lost, trade XP
  only paid on what actually reached the stores. (2) Two console 404s (generic villager donors' face
  thumbnails, a pre-existing gap, not a Wave 9 regression) closed by resolving the real asset path up
  front instead of retrying through a broken one. (3) Every edible's Satchel tooltip read "click to
  drink" regardless of whether it was food or a potion — a `consumeVerb()` helper now answers correctly
  per item, and the matching "You drink/eat the …" toast was fixed alongside it rather than left to drift.
  **A fourth, smaller gap found in a second review pass**: a row-fill drag that laid nothing at all (most
  commonly: its first cell overlapping a piece from a run laid moments earlier that hadn't finished
  construction yet — `evalPlacement` correctly refuses to stack on an unbuilt piece, but said nothing)
  was silent apart from a collision sound, reading as a broken tool rather than a rule doing its job.
  `placeRow` now notifies plainly when a run lays zero pieces.

**Cast & AI**
- [COMPLETE] ✅ **Comprehensive AI/animation rig** (requested 2026-07-28, scoped and built 2026-08-03):
  investigated against the real code first, not the aspiration's own wording — `lib/minifigRig.ts`'s
  `MinifigAnimator` already crossfades between clips (0.18s), so locomotion blending was never actually
  missing. The two real gaps: idle characters play the bare `anim_r_restpose` forever (no dedicated ambient
  loop exists in the 15-clip extraction, but 9 one-shot reaction clips sat unused outside the player's own
  Emotes wheel), and nothing reacted to the player's mere presence (the existing greet wave only fires on
  dialogue). Fixed with two new Reasoner actions — `idle_fidget` (`ai/actions/ambient.ts`, category
  `ambient`, a slot `Reasoner.ts` had reserved since phase 5 but never used) and `notice_player`
  (`ai/actions/notice.ts`, category `social`, a plain distance check against `playerState`, deliberately
  not the full §6 Perception vision-cone system this project never adopted) — both reusing the render
  side's existing `PLAY_ANIM`/`FACE` intent plumbing with zero changes to `Villagers.tsx`/`Npc.tsx`. The
  real blocker turned out to be that the court had NO Agent at all under today's content
  (`scheduledCourtNpcs()` is always empty — confirmed via `PHASE_STATUS.md`'s own 3.4 finding): King Leo,
  the Queen, Richard, John, Storm, and the starter farmers got zero AI. New `ai/courtAmbientSync.ts`
  spawns a deliberately narrow `court` archetype (`idle_fidget`/`notice_player` only, nothing movement-
  capable) for the rest of `Npc.tsx`'s own rendered population, so the court can read as alive with no
  risk of a King wandering off his throne or fleeing a raid three regions away. Real pathfound day/night
  court schedules (today's `Npc.tsx` drift is a plain position lerp) and full §6/§7 Perception/Combat-
  companion remain explicitly out of scope — bigger, separately-sized future phases, not silently dropped.
  *(Update: §6/§7/§8 all shipped in Wave 11, 2026-08-11 — see the NPC AI entry further down. Pathfound
  court schedules are still open. `idle_fidget`/`notice_player` are untouched by that wave and still do
  exactly what this entry describes.)*
  Verified live: `farmer_alric` (always-present, no `revealAfterQuest`) and King Leo (world-gated, visited
  after unlocking) both get real `court`-archetype Agents that previously had none; an idle agent plays a
  varied fidget clip within seconds of having nothing else to do; approaching a court NPC triggers a real
  `FACE` + reaction clip; King Leo's position is provably stable over real time, including nothing that
  could move him.
- [TODO] Validate the user's forthcoming Grok-built item-catalog JSON against `BRICK_CATALOG.md` when it arrives.

**Styling**
- [COMPLETE] ✅ **Faction color-scheme overhaul (research + v1)**: real faction palettes extracted from the donors'
  own materials (weighted `glit` Kd counts + runtime palette anchors) — Leo: royal blues #00169e/#001ed8,
  gold #eac000, white/silver, heraldic red; Cedric: black #101010, blood red #b80000, gold, iron-olive,
  leather. Key structural finding: **both factions wear the same gold**, so the UI's golden text stays
  constant while the *chrome* swears allegiance — `FactionTheme.tsx` swaps the single border/divider token
  (`--gold-dim`, 19 call sites) to royal blue `#3b52c9` for the crown-sworn or blood red `#8c211a` for the
  Bull-sworn; unsworn and all pre-game menus keep today's aged gold, and reverting is deleting one
  component. Full proposal with swatches + live mockups published as an artifact (see conversation).
- [COMPLETE] ✅ **Dark-ages re-theme (v2, user-directed)**: the generic warm parchment-brown chrome is gone. The
  whole UI — login/menus through in-game panels — now reads cold castle stone and forged iron: the
  original game's own rough-hewn wall sprite (`spr187`, found by scanning the extraction's textures for
  grey candidates and eyeballing a contact sheet) tiles darkly behind every panel and menu screen, with
  chiseled bevel shadows, small-caps titles, and iron-plate buttons. Gold remains the one warm note.
  Faction theming got the requested embellishment: a `[data-faction]` root attribute (set by
  `FactionTheme`) drives a chrome *triad* — border color, secondary structure color, and glow — plus a
  **heraldic tricolor band** under every panel header: unsworn iron-gold, the crown blue→gold→white, the
  Bull red→gold→grey. Implementation is token-level (re-valued `--wood`/`--parchment`/`--chrome` etc.),
  so the ~100 existing rules and inline styles followed without rewrites; the remaining hardcoded browns
  were swept (`#574327` → `var(--chrome-2)` etc.). **Follow-ups:** notification glows, minimap ring
  tinting, a blackletter/uncial display face for titles (needs font embedding), loading-screen heraldry.
[COMPLETE] **A real, user-selectable theme system** (requested 2026-07-28): the audit found the switcher
already existed and already worked — `OptionsStack.tsx`'s "Interface Theme" picker, `UiTheme.tsx`
setting `data-kk-lane` on `<html>` globally from `settings.uiTheme`, four real recipes in
`kk-lanes.css` (Aero Glass/Metalheart/Millennium Chrome/Guild Leather) — but it only ever reached
`.game-panel`/`.build-menu`/`.rank-badge`/`.quest-tracker`, i.e. the in-game HUD. The actual root
cause of "login is one theme, menu is another, character creator is another": `kk-screens.css`'s own
header said it outright — each front-door screen kept whichever lane its ORIGINAL mockup was
approved with (title = chrome-styled plaque, menu/options = hardcoded `kk-screen-metal`, hero forge
= hardcoded `kk-screen-leather`) regardless of what the player picked, while only the HUD ever
followed the setting. Fixed by making every front-door screen's `kk-screen-*` className read
`settings.uiTheme` live instead of a fixed string (`AuthStack`/`MainMenu`/`OptionsStack`/
`CharacterCreator`/`CreditsStack`/`HelpStack.tsx`), and adding the two lane recipes that never had a
screen-level treatment at all (`.kk-screen-glass`/`.kk-screen-chrome` in `kk-screens.css`, matching
their existing in-game `.game-panel` accent colors). Verified live end-to-end: picking Metalheart in
Options re-tints the Options screen itself immediately, and the change carries through Back to the
main menu and into "New Journey" → Forge Your Hero, all three now the same steel-blue lane that used
to be menu/options-only. **Known remaining gap, out of scope here:** `StatsStack.tsx` still uses an
entirely separate, older `.stack-screen`/`.panel` class system predating the UI handoff pack, so the
Chronicle-of-Deeds screen doesn't follow the lane at all yet.

**Follow-up, 2026-07-29:** the background-only fix above was real but incomplete, and it happened to
introduce a real regression on top: `kk-screens.css` had a `.kk-screen-metal, .kk-screen-leather {
align-items: center; justify-content: center; }` rule with the two NEW lane classes missing from
its selector list — since `glass` is the default lane, every fresh player landed on a left-aligned
login/menu/options/forge screen. Fixed by adding `.kk-screen-glass`/`.kk-screen-chrome` to that same
rule. Separately, and this is the deeper miss: the login plaque/sign-in card and the character
creator's own name field and turntable stage were exactly the "bespoke decorative styling" flagged
above as a gap — reported back as "login is still a different theme" and "the name input and the
character background are still brown" once the backgrounds started working, because the CARDS inside
those screens were still 100% hardcoded to their original mockup's one recipe (chrome for login,
leather for the forge) with no lane hookup at all. Fixed properly this time with eight shared
`--kk-card-*` custom properties (`kk-lanes.css`), one set per lane, referenced by `.kk-plaque`/
`.kk-signin`/`.kk-forge-stage`/`.kk-forge-input`/`.kk-toggle`/`.kk-calling`/`.kk-face`/`.kk-swatch`
instead of a hardcoded hex value each — so both screens (and any future one) share the same lane's
card language instead of each hardcoding its own. Chrome and leather's token values are exactly what
was already hardcoded, so a player who never opens Options sees no change at all; glass and metal
are the two that previously had no card recipe anywhere. Also fixed while in there: the Options
screen's own scrollbar had no gutter of its own and sat flush against the right column's quality-
preset buttons and keybind key-caps — `scrollbar-gutter: stable` plus a little padding. Verified live
across three lanes on both screens (login card and forge stage/input genuinely re-tint together, not
just coincidentally matching) and confirmed centering holds again on the default glass lane.

**Tech (continuous)**
- [TODO] **Performance & streamlining pass (requested 2026-07-18)** — a dedicated rendering-efficiency effort,
  1–2 items folded into each phase going forward: (a) *manual occlusion* — mount-gate anything provably
  invisible (the Keep-interior furnishings/light gate shipped with Phase 20 step 1 is the pattern; audit
  CedricCamp/BattleDome/StarterVillage set dressing for distance-gating next); (b) instance more repeated
  props (rocks at the spring, dungeon wall segments — trees/herbs already done); (c) geometry LOD once the
  asset pipeline exports the D1–D3 variants; (d) texture/material dedup across cloned PropModels; (e) frame
  profiling with the r3f-perf-style overlay to find the actual hot spots before optimizing blind. True GPU
  occlusion queries aren't practical in three.js at this scale — visibility gating + instancing + LOD is
  where the real wins are.
  - 2026-08-17: sub-item (e) shipped — hand-rolled frame-profiling overlay (`src/game/perfMeter.ts`,
    `PerfMeter.tsx`, `PerfOverlay.tsx`, F3 to toggle), no r3f-perf dependency added. Reads FPS/frame ms
    (reusing the existing `fpsMeter`), draw calls, triangles, geometries/textures/programs straight from
    `gl.info`, correctly handling the composer's multi-pass-per-frame `autoReset` reset-on-every-render
    gotcha. (a)-(d) remain `[TODO]`; this bullet stays open.
  - 2026-08-17: used the new overlay to actually measure every real scenario (fresh homestead, full
    built-out kingdom + live raid, Sealed Crypt, Endless Arena at 4x its design cap, template
    destinations) — every one held 60fps/~16.6ms, so (a) *manual occlusion* and (c) *texture/material
    dedup* are SKIPPED as not supported by the data (CedricCamp/BattleDome/StarterVillage are already
    destination-gated; PropModel's clone-sharing already dedupes geometry/materials, verified by placing
    30 identical buildings and watching geometry/texture counts barely move). (b) *instance more repeated
    props* was real (rocks: plain JSX primitives, not instanced, ~6% of baseline draw calls; dungeon
    walls: one `PropModel` per segment despite every wall in a descent sharing one url) — fixed both via
    `InstancedProp`/the new shared `InstancedSubMeshes` (`InstancedProps.tsx`): rocks bake their
    dodecahedron sub-parts into per-variant `SubMesh`s (`ResourceNodes.tsx`'s `RockGroup`), dungeon walls
    go through `InstancedProp` directly (`DungeonScene.tsx`) since they already share one GLB url per
    descent. (d) *geometry LOD* stays blocked on the D1–D3 asset-pipeline deliverable, untouched. This
    bullet stays open only for (d).
  - 2026-08-17: verify pass on the (b) fix above caught a real regression and it's now fixed — the new
    rock/dungeon-wall `InstancedSubMeshes` batches had inherited `frustumCulled={false}` from the
    tree/herb precedent, but unlike a compact tree/herb patch, a rock ground and a whole dungeon descent
    are genuinely far from the camera much of the time, so this made every rock/wall render every frame
    regardless of camera facing — the exact opposite of a real per-mesh `<Rock>`/`PropModel`'s old
    culling, and it pushed the homestead baseline's draw calls/triangles UP, not down. `frustumCulled` is
    now an explicit required prop on `InstancedSubMeshes` (`InstancedProps.tsx`) — real culling restored
    for `RockGroup` and `DungeonScene`'s walls, `false` kept only for the two spots it was actually
    validated for (`TreeGroup`/`HerbGroup`, still small compact patches). Confirmed three's own
    `InstancedMesh#computeBoundingSphere` (this project's r176) already unions every live instance's real
    transform rather than using the un-instanced geometry's own tiny origin sphere, so real culling no
    longer risks the vanishing-instance bug the opt-out was originally written for. Left `Grounds.tsx`'s
    fence batch (spans every ground at once — same "not compact" shape) on its pre-existing `false`
    untouched: it predates Wave 16, wasn't part of what regressed, and flipping its default wasn't
    verified live in this pass — a good candidate for the same real-culling treatment next time someone's
    in this file.
- [TODO] Geometry LOD (asset-pipeline task: export the D1–D3 variants), rapier physics when ragdolls/siege demand
  it, Web Workers for pathfinding if the AI rig needs it, save-slot management, and the long-game
  multiplayer-ready sim refactor (co-op castle building is still the dream).

---

## 💡 New ideas under consideration (raised 2026-07-18 — design sketches, not yet committed) [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.


- [COMPLETE] ✅ **Guilds (Phase 21, v1 shipped)**: five orders headquartered across the Kingdom of Instances — the
  Woodsmen's Lodge (Frozen Pass), Miners' Brotherhood (Old Ruins), Anglers' Circle (River Landing),
  Builders' Guild (Siege Camp) and Knights' Order (Tourney Grounds) — each with a physical open-air hall
  near its world's travel landing (stone plinth, twin pennants in the guild's color, table of trade;
  `GuildHalls.tsx`, same terrain-following environment placement as the court dressing). Membership is
  earned: the hall's door opens only at tier I of the matching Challenge track (`guildEligible`), the
  player carries ONE primary banner (persisted `guild` field), joining is free but changing banners costs
  a 25-gold transfer tithe. Each guild grants a real passive while carried: Deep Grain (20% extra log),
  Ore Sense (boulders yield ore far more often), Read the Water (fish bite ~30% sooner), Master Joinery
  (construction swings count 30% extra — player and builder villagers alike), Weight of the Order (+1
  melee damage). All verified end-to-end, including the deterministic Builders math and the tithe.
  **Follow-ups (guild vendors, errand pools, reputation/ranks) shipped in Wave 22 — see below.**
- [COMPLETE] ✅ **Guild Depth (Wave 22, shipped)**: the three follow-ups above, for all 5 guilds, reusing
  existing plumbing throughout rather than new systems. *Vendor:* `GuildDef.vendor` (3 rows/guild, real
  existing ItemIds — including giving the long-orphaned `axe` its first acquisition path anywhere in the
  game, at the Woodsmen's Lodge), gated on membership + rank via new action `buyGuildOffer`, which
  re-checks both fresh off `data/guilds.ts` and delegates to the existing `buyOffer` for the actual gold
  math (Silver Tongue discount included for free). *Errands:* new `GUILD_QUESTS` pool in `data/npcs.ts`
  (3 chained errands per guild, member-only), mirroring `CEDRIC_WAR_QUESTS`' non-NpcDef shape exactly and
  reusing `sideQuestsOf`/`acceptSideQuest`/`turnInSideQuest`/`abandonSideQuest` verbatim — every errand
  targeting a crafted good deliberately uses `kind: 'craft'` rather than `'gather'` (a real pre-existing
  bug found along the way: a gather-kind errand aimed at a craft-only item like `plank`/`iron_bar` can
  never have its counter incremented, already live on `bd_timber`/`k_iron_levy`/`q_feast`, left as its own
  follow-up). *Rank:* a new parallel `guildRanks` record (deliberately never merged with the per-NPC
  `reputation` record or the continuous allegiance axis — three genuinely different standings), 4 titles
  per guild on `GuildDef.rankTitles` (same shape/convention as `NpcDef.repTitles`), +15 per errand turn-in
  via new action `addGuildRep`. Real player-visible effects: rank gates the vendor's 2nd/3rd row, AND the
  top rank sharpens that guild's own passive itself (Deep Grain 20%→30%, Ore Sense 65%→75%, Read the
  Water ×0.7→×0.6, Master Joinery +30%→+45%, Weight of the Order +1→+2 — one small `atGuildMaxRank` check
  added at each passive's existing call site). `GuildPanel` (Panels.tsx) gained Standing/Guild
  Store/Guild Work sections inside its existing member-only branch; `QuestLogPanel` mirrors its 3
  existing `'cedric'` special-cases for a guild id so its errand board actually lists in the journal.
- [COMPLETE] ✅ **Skill tree (Phase 21, shipped)**: the Talent Tree in the Abilities panel — seven skill branches ×
  three tiers = 21 talents (`data/skillTree.ts`), points earned one per total skill level (derived, not
  stored — the perks pattern), costs 1/2/3 per tier, each tier gating on the previous talent AND a real
  level in its own skill (2/5/8). Node icons are the original game's own assets per the user's ask — the
  pine-tree mold, castle-stone sprite, portcullis ironwork, water ripple, workbench crate, Richard's
  portrait, the wildflowers — greyscaled until earnable, gold-glowing once learned. Every talent is a
  real effect wired at its mechanic's source: tier 1 = +10% XP in that skill; tier 2/3 include extra-log
  and double-flower chances, ore/vein odds, 20% slower tool wear and half-cost repairs, a 300ms-longer
  bite window and double-fish chance, two stacking +15% construction-swing bonuses, +10 max stamina and
  +1 melee damage, faster crops and +1 wheat — all stacking sanely with the existing perks and guild
  passives (verified deterministically: Second Wind → exactly 110 stamina; Sure Hammer + Raised Right →
  0.5 swing = 0.65 built). **Follow-up:** a respec option (gold cost), deeper tiers if the level curve
  extends.
[COMPLETE] **Perks with trade-offs (+/−)**: three real perks added to the existing pool
(`game/data/perks.ts`, flagged `tradeoff: true`), sharing the same one-pick-per-rank-up, 4-slot
budget as the plain upside five rather than a separate allowance — the Abilities panel now shows
them in their own "A Calculated Risk" row underneath, so the cost is legible before picking, not
just in the tooltip after. **Berserker** (+30% sword damage, −20% max stamina) — `combat.ts`'s
`playerAttack()` and the level-up stamina subscriber, which now also clamps current stamina down to
a lower max instead of only ever raising it. **Hermit** (double personal gathering, villagers 25%
slower) — `gameStore.ts`'s `harvestNode()` (every node kind, including fishing) and `tickVillagers()`'s
trip duration. **Silver Tongue** (+15%/−15% trade prices, Storm strikes faster in a duel) —
`sellItem()`/`buyOffer()`, with `ShopPanel.tsx`'s displayed prices and its Buy button's affordability
check updated to match what's actually charged (the check would otherwise disagree with the discount
and grey out an affordable purchase); Storm's own `ATTACK_CD` calc in `Enemies.tsx` gets an extra
subtraction, the same direction reputation already pushes it. Verified live: all three trade-offs
measured against the exact math (3→3.9 sword damage, 100→80 max stamina, 10→12g sold / 7→6g bought,
3→6 wood gathered) and the Abilities panel screenshot confirms the new row renders correctly.

---

## 🗄️ Archived — 3 completed sections [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- 🔧 Phase 22 — Polish batch (user-reported 2026-07-19) — ✅ ALL SHIPPED same day
- ✅ AI wave 2 + the champion/companion progression layer (shipped 2026-07-19)
- 🐉 The Dragonfire Siege — ✅ SHIPPED 2026-07-19

## Build order going forward [TODO]

1. [COMPLETE] **User-reported batch above** — instance-bleed visibility ✅ and NPC equipment/Armory ✅ both
   shipped 2026-07-19. Remaining: regional quest log; real wall collision (arrow slits); GUI overhaul
   (holding for the user's reference); Beda & Alric's purpose; mobile-friendly tech debt.
2. [COMPLETE] **Phase 25 wave 2** — remaining verified oc-series set pieces ✅ and wall-connection
   snapping via `wallRole`/`canConnectAsWall` ✅ both shipped 2026-08-06 (Wave 8, see the Phase 25
   entry above). [COMPLETE] Road pavement shipped (see L297/L71).
3. [TODO] **Phase 24 follow-ups** — per-defender orders, HUD order chip, deposit floaties, stall UI.
4. [TODO] **Instance-separation audit list** (Phase 23 doctrine) whenever a listed system is touched.
5. [TODO] Backlog alongside: halberd/spear player weapons, armor tiers, dungeon follow-ups,
   delivery quests, attribute respec, dragonfire follow-ups above. (Trade-off perks shipped —
   see "Perks with trade-offs" above; this line is stale about that one item specifically.)

*(Phases 20–25 + AI waves 1-2 + the Dragonfire Siege all shipped: Kingdom of Instances, dark-ages
theming, guilds, talent tree, challenges, location quests, articulated dragon omen AND siege, crests,
callings, tabbed menu, instance separation, the Living Homestead with attributes/traits/orders/real
labor, prefab catalog, champion attributes, and companion trait trees.)*

---

## 🗄️ Archived — 43 completed sections [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- 📋 User-reported batch (2026-07-20, major workflow overhaul — logging before fixing)
- 🏁 2026-07-20 batch complete
- 📋 User-reported batch (2026-07-20 #2 — walls, build view, NPC identity)
- 🔬 Rig-lab reports: what's in them and what we should do with them
- ✅ Rig-lab capability integration (2026-07-20)
- ✅ UI design-system integration — four themes (2026-07-25)
- UI/UX port: the mockup screens themselves (2026-07-25)
- A · Fast bugs (each ~one sitting, verify individually)
- B · Collision & projectiles
- C · First-person viewmodel from the real rig
- D · Identity, targeting & metadata
- E · Allegiance & the quest system  *(the largest single item)*
- F · Building, land & the castle
- G · Defence AI
- Also captured from this round
- Dependency notes
- Block A shipped — 2026-07-25
- Block B shipped — 2026-07-25
- Block C shipped — 2026-07-25
- Block D shipped — 2026-07-25
- Three findings that change the shape of the work
- Block E · Allegiance & quests  *(re-scoped)*
- Block F · Building, land & the castle  *(re-scoped)*
- Block G · Defence, AI & pathing  *(re-scoped, now the big AI block)*
- Block H · NEW — rigs, models & animation
- Block I · NEW — HUD, feedback & progression
- Suggested order
- F23 + G25 + I40 shipped — 2026-07-25
- Block E shipped — 2026-07-25
- Block H shipped — 2026-07-25
- Block F, part 1 — 2026-07-25 (F19, F20, F22, F24 shipped)
- Block J · NEW — bricks as the economy, and building that feels built
- Ordering note
- F25 shipped — 2026-07-25
- Block I, part 1 — 2026-07-25 (I38, I42, I43, I44 shipped)
- Blocks I and G — COMPLETE, 2026-07-25
- Order
- Block K — part 1 shipped, 2026-07-25
- Block K — part 2 shipped, 2026-07-26
- Block J — shipped, 2026-07-26
- Order
- Block L — part 1 shipped, 2026-07-26
- Block L — part 2 shipped, 2026-07-26

## Future · build from the real instruction sets [TODO]

The manuals for the fifteen Knights' Kingdom sets are online (set 1289 small
catapult, 4801/4811 defence archer, 4806 axe cart, 4807 fire attack, 4816
catapult, 4817 dungeon, 4818 dragon, 4819 rebel chariot, 6032 catapult
crusher, 6091/6098 king's castle, 6094 guarded treasury, 6095 royal joust,
6096 bull's attack). The idea: a build system that follows a real set's
instructions step by step, out of the catalogue pieces the game already has,
and produces a model the world can then use.

Worth noting what already lines up: the extraction's assets ARE these sets —
`oc1289`, `oc4801`, `oc4806`, `oc4807`, `oc6032b2`, `oc6094-*`, `oc6095-*`,
`oc6096-*`, `oc6098b*` are named for them, and the rig lab has already charted
each one's parts by role. So the game holds both the finished models and a
per-part breakdown; what the manuals would add is the ORDER and the placement
— which piece goes where, step by step. That is the missing data, and whether
it can be got at (OCR of the manuals, or reconstructing step order from the
OBJ part list and the lab's role names) is the research question. Needs a
proper investigation before it becomes a block.

---

# The workshop · findings from `kk_research_folder`, 2026-07-26 [COMPLETE]

The research package (21 seeded sets, a schema, and tools for inventories,
OCR and the join) is sound, and its central call is right: **LDraw, not OCR.**
OCR gives step numbers and `2x` call-outs; it cannot give where a brick goes,
because that only exists in the diagram as a picture. An LDraw `.mpd` is a flat
list of `1 <colour> x y z <3x3 matrix> part.dat` lines separated by `0 STEP` —
which IS a build sequence with full transforms. `three` 0.176 ships
`LDrawLoader` and it is already in our `node_modules`.

Two things I checked that change the shape of the plan.

[COMPLETE] **1. The game's models are NOT brick-accurate, and that is decisive.**
`oc4807` (Fire Attack) is 11 named objects. `oc1289` is 7. `oc4806` is 19.
The real sets are tens to hundreds of parts. The extraction's meshes are
grouped shapes for rendering, not per-brick assemblies — so a "build the real
set brick by brick" mechanic **cannot** be driven off the game's own geometry.
It needs LDraw models, or a hand-build in Studio, for every set it covers.
This is the same class of gap as K58's missing gatehouse and J51's missing
baseplate: the asset does not exist in the files.

[COMPLETE] **2. But the game ships each set already broken into sub-assemblies.**
`oc6098-1 … -7` plus `oc6098b1 … b3` are King Leo's Castle in TEN modules —
and the set notes say it is explicitly built from "recombinable segments".
`oc6096-1..-5/b3..b5`, `oc6095-*`, `oc6094-*`, `oc6032*`, `oc4806*` are the
same. So the extraction gives a two-level hierarchy for free: set →
sub-assembly → the rig lab's named parts. Nine sets have game models (1289,
4801, 4806, 4807, 6032, 6094, 6095, 6096, 6098); the impulse sets and 4816–4819
do not.

## So there are two different products here, not one [TODO]

[COMPLETE] **A · The Assembly Workshop** — build a set from its sub-assemblies and their
charted parts, at the granularity the game actually has. Costs no new assets.
Reuses J47's wireframe ghost and J48's rise-from-the-ground clip almost
wholesale — the ghost of the next part appears in place, you set it, the model
grows — which is to say the construction arc already shipped is most of this
mechanic. New work: a step-order generator (sort parts bottom-up by base Y,
break ties by adjacency to what is already placed — nothing rests on nothing,
so physics implies most of the order) and the workshop UI. **A finished set is
a working piece**: build 6096 and you own a Bull's Attack that fires.

[TODO] **B · The Instruction Build** — the real retail set, brick by brick, faithful
to the booklet. Needs an LDraw model per set, which is the whole cost: the OMR
may have some, Rebrickable's MOC downloads some more, and the rest is hand
work in BrickLink Studio. Rebrickable inventories (free API key) give the bill
of parts and let the workshop verify a build is complete. This is a display /
collection product — the reward is having built it.

The research folder's own pipeline serves B. Its `build_workshop_index.py`
wants a `model_catalog.json` at
`D:\CODING\THREEJS\knightskingdom\extracted\catalog\model_catalog.json`,
which does not exist on this machine — the join step currently reports every
one of the 21 sets as `geometry-missing`, which is accurate: `ldraw/` holds
only its README.

## Recommendation [TODO]

Do **A** first, and let it stand on its own. It is the mechanic the player
actually feels ("I assembled this and now it works"), it costs no new assets,
and about 60% of its machinery is already built and shipped. Then, if B is
still wanted, it slots in behind the same UI: an LDraw-backed set is just a
build sequence with more steps and finer parts, and the workshop does not need
to know which kind it is loading.

Blockers for B, in order: LDraw models (none present), a Rebrickable API key
or the bulk CSVs (no inventories fetched), the manual PDFs (none downloaded).
None of it is work I can do from here — the first two need a key or a hand
build, the third needs the downloads.

## Coordinate note, carried from the research README [TODO]

LDraw is −Y up at 1 LDU = 0.4mm; our props are −Y up in millimetres and
`PropModel` corrects with `rotation.x = π`. If B happens, make LDraw's space
canonical (since `LDrawLoader` does the heavy lifting) and convert the game
models into it — `ldraw_bridge.py` already maps VRT→LDraw as `(x, −y, z)/400`
with rotation conjugation `S = diag(1,−1,1)`, so reuse that rather than
deriving a new transform.

---

# Block M — the Assembly Workshop, shipped 2026-07-26 [COMPLETE]

Option A from the workshop findings. Build a real Knights' Kingdom set out of
the modules and parts the extraction actually ships, at the granularity the
game actually has — no new assets, and a finished set is a working piece
rather than a display piece.

**The plan data.** `scripts/gen-setplans.mjs` reads the extraction's OBJs and
emits `src/game/data/setPlans.generated.json`: **9 sets, 38 modules, 688
steps.** King Leo's Castle is 204 steps across ten modules; Bull's Attack 174
across eight; the Small Catapult 7 in one. The build ORDER is not in the files,
so it is derived from the one thing always true of a physical build — nothing
rests on nothing. Parts sort bottom-up by the height of their base (banded to
5cm so a course is treated as a course rather than ordered by float noise),
ties broken centre-out so each piece lands next to something already standing
instead of starting a second island. It will not match LEGO's printed step
grouping. It is buildable, which is what the mechanic needs.

**The loader.** `src/lib/setBuild.ts`. `propRig` already loads these OBJs but
buckets meshes by the lab's ROLE — right for animating a horse, wrong for
building a castle, where the unit of work is the individual `o` object. This
keeps every object separate, normalises exactly as `PropModel` does (so the
workshop's finished model IS the object the world renders), and hands the
parts back in plan order. The 38 module OBJs are now shipped to
`props/objrig` — they have to come from the OBJ, because the GLB merges
primitives by material and drops the per-object names the whole mechanic
depends on.

**The bench.** `WorkshopBench.tsx` stands the assembly off the front of your
workbench. Parts already set are solid; the NEXT one is a gold wireframe
hanging exactly where it will go, pulsing gently so the eye finds it; nothing
after that is drawn, because a build you can already see the end of is not a
build. Finished modules stand off to the side at three-quarter scale, so a
ten-module castle accumulates in front of you rather than replacing itself.
That is the same plan-then-substance language the construction sites use
(J47/J48) — the same idea at a smaller scale.

**The work.** Hold E at the workbench to set the next piece. Each step costs
bricks from the parts bin (J45), priced off the part's own measured volume, so
a base plate is a real outlay and a stud is not. An empty bench opens the
workshop panel instead, which lists the nine sets with their module and piece
counts.

**The reward.** A set's modules ARE buildables — `oc6096-4` is a piece of
Bull's Attack — so those pieces are now LOCKED in the build menu until you
have built their set in the workshop, with the lock reason naming the set.
Building a set is what puts its siege engines in your hands.

Verified end to end: laying out 1289 puts it on the bench, four steps show
four parts plus the ghost of the fifth, and finishing moves it to `builtSets`.

## Where option B would attach [TODO]

Nothing here forecloses the instruction-accurate build. An LDraw-backed set is
the same shape of data — an ordered list of placements — so it drops in behind
the same bench and the same UI, and the workshop does not need to know which
kind it is loading. What B still needs is unchanged: LDraw models (the
research folder's `ldraw/` holds only its README), Rebrickable inventories (a
free API key or the bulk CSVs), and the manual PDFs.

## 🗄️ Archived — 6 completed sections [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- L71 follow-up — the bends turned the wrong way, 2026-07-26
- Grounds became grid sections, 2026-07-26
- Roadside trees, 2026-07-26
- Pointer lock stopped letting go, 2026-07-26
- Newcomers walk in, 2026-07-26
- Blocked on the Grok mapping

## Blocked on a decision or a pointer [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.

[COMPLETE] **The road's route vs. southward expansion.** Closed 2026-08-12 (Wave 12) as already
  resolved, with no code change — re-verified entry by entry against the live files rather than taken
  on trust, because the entry outlived the pass that fixed it: `SPAWN` `(0,0,26)`, `SIGNPOST`
  `(-16,36)`, `MERCHANT_SPOT` `(-37.5,40)`, both starter-village huts `(-41.5,36.5)`/`(-34,44)`, the
  road's own trunk (`x∈[-38.4,0]`, `z∈[25.6,64]` as it then stood), `KEEP_INTERIOR` `(85,85)` and all
  six grounds (`z` 19→112) are already in the south half — the 2026-08-03 layout pass moved them and
  this entry was never struck. The "guard posts facing a now-empty north" half of the ask has no
  referent in code at all: there is no `GuardPost` component or constant anywhere in `src/`, the two
  "guard posts" are Alric's and Beda's `mc001` huts (`StarterVillage.tsx`, and `trade.ts`'s own L68
  note says so), and nothing reads their yaw — no line-of-sight, no watch direction, nothing that
  could face anywhere. Wave 12's road extension is what the entry actually wanted next, and that
  shipped alongside this (below). If a real watch-post that orients toward likely raid approaches is
  wanted, that is a new feature with its own design, not this stale gap.
  - **One measured oddity in the layout, checked and deliberately not "fixed"** (raised by the Wave 12
    verification pass, now recorded next to `ROAD_HALF_WIDTH` in `road.ts`): both `SIGNPOST` `(-16,36)`
    and `MERCHANT_SPOT` `(-37.5,40)` stand INSIDE the printed carriageway — 2.40m and 1.60m off the
    centreline against a half width of 2.88 — so `onRoad()` is true at both and standing there grants
    `ROAD_SPEED_MULT`. Not introduced by the road extension: HEAD's own seven-cell route was compiled
    and measured, and the distances are identical to the metre. Left as it is on purpose — a roadside
    sign and a pedlar's cart parked on the road are where those two belong, `SIGNPOST` is the anchor
    the whole network's legs are derived from (`SX`/`SZ`), and `Merchant.tsx`'s walk-in/walk-out timing
    is tuned against the distance from `roadEntry()` to `MERCHANT_SPOT`. Its one knock-on is recorded
    in the dig entry above: a cut over the signpost is refused as *road*, never as *signpost*.

## Unblocked, large, and not started [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.

These need no external data — they are simply big enough to want their own
block rather than being started at the end of a session.
[COMPLETE] ✅ **Per-world villager labour — SHIPPED 2026-08-04 (Wave 3 of the full-ROADMAP wave
  plan).** The empire's foundation: settlements have to work while the player is elsewhere, which
  means the tick becomes per-world rather than per-player-location. L66 just tied labour to
  proximity TO THE PLAYER, so that rule needed a per-settlement meaning first — this is that.
  **Mechanism only, no new content**: this wave makes the labour system CAPABLE of running against
  more than one settlement; it does not create one (that's the settlement prototype, next). Zero
  behavior change for the game as it ships today, since every villager's `world` is still
  absent/null — verified live, not assumed (see below).
  - `Villager.world?: string | null` (`types.ts`) mirrors `PlacedBuilding.world`'s existing
    instance-separation doctrine exactly, plus a matching `isHomeVillager()` helper.
  - Collapsed five independent hand-copied `HOME_X`/`HOME_Z` definitions (`gameStore.ts`,
    `villagers.ts`'s own canonical exported pair, `Villagers.tsx`, `Defenders.tsx`,
    `RaiderRam.tsx` — one more than the four originally found) into a single source. Added
    `settlementAnchor(world, claimedWorlds)` (`villagers.ts`) — HOME_X/HOME_Z for the homestead,
    a claimed settlement's own plot position once one exists, falling back to the destination's
    own bake `origin` if unclaimed. `Defenders.tsx`/`RaiderRam.tsx` now import the canonical
    `HOME_X`/`HOME_Z` directly rather than re-deriving the formula — they stay homestead-only on
    purpose (raids and defense are not per-world scope here), so they didn't need the anchor
    function itself, just the duplication fix.
  - `gameStore.ts`'s `tickVillagers`/`villagerAtWork` now loop over the distinct worlds actually
    present in the roster (`buildings`/`hasStall`/the builder pass all scoped per-world) instead
    of one flat homestead-only pass — today that's always exactly one world (`null`), so the loop
    runs once, byte-identical to the old code path.
  - `Villagers.tsx`'s `VillagerFigure` now computes its `home` anchor via the shared
    `villagerHomeSpot()` (still HOME_X/HOME_Z-centered for every villager today) and the top-level
    `Villagers()` component adopts the same `(v.world ?? null) === (destination ?? null)` render
    filter `Buildings.tsx` already uses — a settlement resident (next wave) will only render while
    the player is actually visiting that world, not everywhere at once.
  - **Deliberately left homestead-only, not re-keyed**: `checkVillagerArrival` (the generic-newcomer
    system) and `Villagers.tsx`'s own deep worksite-walk logic (finding the nearest tree/farmplot/
    stall/stockpile for the in-world walk animation) — a settlement's own residents come from its
    quest chain, not the generic arrival mechanic, and the worksite-walk visual logic needs its own
    dedicated pass once a real settlement exists to visually test against, not a blind re-key now.
  - Verified live (not just typechecked): recruited/fabricated test villagers, pinned a lumberjack's
    live position exactly at the homestead anchor (HOME_X/HOME_Z, confirmed algebraically to be
    exactly `(0,0)` — `BUILD_REGION` is symmetric around the origin) and called `tickVillagers`
    directly — wood inventory increased by the lumberjack's real `perTrip` yield and the trip timer
    reset to a fresh value, confirming the per-world-scoped delivery path still works exactly as
    before. Separately verified the re-keyed builder pass advances a real construction site's
    `built` fraction when a builder stands at it, and `claimBed`'s no-bed fallback correctly routes
    through the new `villagerHomeSpot(id, world, claimedWorlds)` signature without crashing.
    `npm run verify` clean throughout, zero console/page errors.
[COMPLETE] **Generalised interiors.** `KeepInteriorRoom.tsx` — a one-off, hand-placed room
built specifically for the Grand Keep — is now `BuildingInteriorRoom.tsx`: any buildable type can
offer an enterable, sealed room by adding one entry to a new `data/interiors.ts`, instead of a
bespoke component. `st.interior` generalised from a plain boolean (which only ever meant "in the
Grand Keep") to the id of whichever `PlacedBuilding` is currently entered; `enterKeep`/`exitKeep`
became generic `enterInterior(buildingId)`/`exitInterior()`. Every non-Keep interior gets a
deterministic "pocket" position — a hidden, out-of-the-way spot derived from the building's own id
(`pocketFor`), so any number of instances of the same building type can never collide, the same
"tucked in an empty corner of the map, entered by teleport, no walk-in door" shape the Keep's own
room always used. The Keep keeps its bespoke furniture (throne, banners, banquet table, chest) as
extra dressing layered on the same generic shell every other interior now shares.

**A genuinely pre-existing bug turned up doing this, not something the refactor introduced:**
`foundKeep()` (`gameStore.ts`) only ever wrote to `st.keep` (the socket-tracking state) — nothing
ever added a matching `PlacedBuilding` with `type: 'keep'` to `st.buildings`, so
`PlayerController.tsx`'s own interact-detection loop, which finds "Enter the Keep" by scanning
`st.buildings` for that type, could never actually match anything. "Enter the Keep" was unreachable
regardless of this work. Fixed by having `foundKeep()` add that `PlacedBuilding` alongside `st.keep`
— built immediately, since the foundation reads as already laid the moment it's placed. Had to audit
every OTHER system that scans `st.buildings` unconditionally once that entry existed: excluded it
from `Buildings.tsx`'s generic mesh rendering (`KeepAssembly.tsx` already owns 100% of the Keep's
real visual — this would have doubled it) and from `PlayerController.tsx`'s AABB collision loop (the
Keep buildable's own catalog entry has a real footprint/height that has nothing to do with the flat
courtyard `KeepAssembly.tsx` actually renders, and would have installed an invisible wall).

**Second interior, proving the generalisation is real and not just a same-building refactor:** the
Stable now has one too — simple hay-and-tool-rack dressing, no occupant. Deliberately left without an
NPC: real "quests from allied NPCs indoors" content is its own separate piece of work, not something
to fake here just to check a box.

Verified live end-to-end: founded and entered the Keep — identical to the pre-refactor room, chest
and throne interactions both intact, exited cleanly back onto the real foundation with no phantom
collision; placed and entered a Stable — its own distinct room and dressing, `interior` correctly
tracking a second, different building id.

## 🗄️ Archived — 1 completed section [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- Pointer lock, corrected again — 2026-07-26

## Order [TODO]

N74 and the corner are small. N76 is data. N77 is one config audit. N81 is its
own animation pass (L73's remainder shipped separately). N82 is a merge, not
new work. N78/N79/N80 are one arc — the road becomes the spine the world moves
along — and want doing together.

# NPC AI — phase 1 shipped, 2026-07-27 [COMPLETE]

`src/ai/NPC_AI_SPEC.md` (researched and written outside this repo) is now the contract
for NPC behaviour. It builds in nine phases, one per session, and **phase 1 is
done: the skeleton and the debug overlay, nothing else.** Code lives in
`src/ai/` — see `src/ai/README.md` for the file map and the TS/Next
adaptations of a spec written for vanilla JS.

What exists: `Agent`, `Blackboard`, `Scheduler`, `AgentManager`, three config
JSONs (needs / archetypes / lod), one probe NPC that ticks and prints, and the
` overlay. What it does NOT do: decide, perceive, path, or move anything. The
existing villager/court/enemy behaviour is untouched and still runs its own
per-frame if/else cascades.

Verified by `scripts/smoke131.mjs`: think rate matches the tier, needs decay at
the authored rate, pausing stops the AI clock, the LOD tier falls A→C as the
camera turns away, and **20 agents share a 3-thinks-per-frame budget with zero
starvation** (5 thinks each over 5s, worst frame exactly 3 of 3) — which is the
one property §8 actually asks the scheduler to prove.

## 🗄️ Archived — 1 completed section [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- What phase 2 has to decide first

## Order [TODO]

Phases run 2 (navigation) → 3 (actuation) → 4 (smart objects) → 5 (utility
reasoner, where the spec says the time actually goes) → 6 (perception) → 7
(combat/companion) → 8 (LOD + ambient). §11's LLM dialogue layer is optional
and last. One phase per session, and no phase starts before the previous one's
debug view works.

# BLOCK O — playtest round, 2026-07-27 [COMPLETE]

Eight items off a live session. Logged first, fixed one at a time with
verification, per the standing workflow. These go through branches and PRs —
`main` is protected.

[COMPLETE] **O1 · resolved as a duplicate of O2, not a separate bug — see the fix log
below.** What looked like a leftover flavour figure at Alric/Beda's post after
recruiting them turned out to be the recruited villager itself, frozen at a
new position with no visible transition, because of the same `navSteer` bug
O2 fixes.

[COMPLETE] **O2 · villagers (confirmed on Alric) walk on the spot near the homestead
centre instead of working nodes, until a raid displaces them and it looks
fixed.** Reported as tied to no beds being placed. See the fix log below —
root cause was in shared steering code, not the beds/worksite branches
originally suspected.

[COMPLETE] **O3 · a tree spawns inside Beda's post.** `seedNodes` places resource nodes
without testing them against building footprints. Needs a rejection pass
against `collisionBoxesFor` — the same volumes the nav grid and the player
already use — rather than a hardcoded keep-out box.

[COMPLETE] **O4 · the merchant's hands float, and he should travel rather than stand.**
The floating hands are N77 (a donor/config mismatch, same fault Alric and Beda
had — see K57). The second half supersedes N78: the merchant and his horses
should arrive, trade, and leave, rather than being permanently parked.

[COMPLETE] **O5 · placing a building stalls the frame.** `PropModel` resolves its GLB on
demand at placement time. `preloadCommonAssets()` exists and runs on
GameScreen mount but does not cover the buildable catalog. Extend it to warm
every placeable piece — ideally driven off the build menu's own list so a new
buildable cannot be forgotten.

[COMPLETE] **O6 · herbs appear, then vanish at nightfall.** `ResourceNodes` filters herbs
on `respawnAt === null`, which is a harvest state and has nothing to do with
the clock, so the visible symptom and the visible filter disagree. Suspect the
instanced path (`HerbGroup` rebuilds its `instances` array on every render with
no memo, feeding `InstancedProp`). Resource nodes must persist across
day/night, weather and season unconditionally — the only thing that may hide
one is being harvested.

[COMPLETE] **O7 · the dragon arrives far too early.** The gate was
`if (!st.dragonSeen || st.buildings.filter(isBuilt).length < 2) return;` — two
finished buildings is reachable in the first minutes, long before a bow, a
crossbow or any ammunition is craftable, so the first dragon was an
unwinnable encounter.

[COMPLETE] **O8 · replace the yellow ground outline with real fence.** Supersedes N75.
The gold boundary strips in `Grounds.tsx` become a run of the existing fence
buildable, instanced.

## 🗄️ Archived — 3 completed sections [COMPLETE]

Moved verbatim to [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md) (CLN-34, 2026-10-01). Open work they once listed lives in
the Reconciled status section at the top of this file.

- The missing system, and why O7 was not a one-line fix
- Order
- Block O — fix log

## Bugs logged 2026-07-30, not yet fixed

[COMPLETE] **`.kk-menu-welcome` (and a couple neighbors) leaked the raw violet accent instead of the
  themed one.** Reported and fixed 2026-07-30. `.kk-menu-welcome`'s `color` now routes through
  `var(--kk-card-text-dim)` (matching `.kk-plaque-tag`'s own small-caps label treatment), `.kk-menu-word`'s
  text-shadow glow and `.kk-menu-item.primary .kk-menu-key`'s color now route through
  `var(--kk-card-accent-border)` — all per-lane instead of the fixed violet `--kk-a-400`/`--kk-a-500`
  tokens. Scoped to text only, per the report; `.kk-menu-item.primary`'s background gradient/icon fill
  (a separate "Metalheart signature" visual, not text color) is untouched. Verified live: `--kk-card-text-dim`
  resolves to four distinct, non-violet values across all four lanes.
[COMPLETE] **Riding a horse was a sine-wave bob, not the rig's own gait.** Reported and fixed
  2026-07-30. `RideHorse.tsx` — the plain cloned, unrigged mesh whose whole-group
  `Math.abs(Math.sin(bob)) * 0.09` Y-offset was the bob the player actually saw, drawn on top of
  `MountedHorse.tsx`'s already-correct rigged one — is deleted outright. The seated rider (previously
  RideHorse.tsx's only real job besides the bob) now lives in `MountedHorse.tsx` itself, at the same
  local seat offset, riding the one real `RiggedProp`-driven horse with its per-bone `gaitSpeed`
  animation (leg/head/tail bones from the rig lab, phase-offset for a diagonal gait, sped by real ground
  displacement — unchanged, already correct, just finally the only mesh rendering). Confirmed via the
  rig lab itself (`capabilities.json`'s horse entries) that no richer animation-clip data exists to wire
  up instead — this was always going to be procedural, and `MountedHorse.tsx`'s procedural gait is what
  survives. Updated three stale code comments elsewhere that pointed at `RideHorse.tsx` by name
  (`PlayerAvatar.tsx`, `riding.ts`, `Merchant.tsx`).

  Verified: `tsc`/production build clean with the file gone and no dangling references; a live
  screenshot in FPS view shows the rigged horse's neck/mane with no duplicate mesh and no console
  errors. **Found but left open, out of scope for this fix**: in third-person camera mode while riding,
  the player's own standing figure (`PlayerAvatar.tsx`) did not visibly hide the way its own
  `g.visible = !playerState.riding` line says it should — but that exact line is untouched, original
  code (only its comment changed), so this is a pre-existing gap this pass surfaced, not a regression it
  introduced. Worth its own look.
[COMPLETE] **The player's own avatar disappeared in build mode.** Reported and fixed 2026-07-30.
  `GameWorld.tsx` now mounts `<PlayerAvatar />` unconditionally, split out of the `!buildMode` block that
  correctly still gates `<Viewmodel />`/`<CombatController />` (genuinely FPS-combat-only). Verified live:
  no errors entering/exiting build mode with the avatar mounted throughout.
[COMPLETE] **Herb patches stayed bright through dark, rainy weather — a fixed emissive floor that
  ignored rain.** Reported and fixed 2026-07-30. `InstancedProp` now runs a `useFrame` that rescales
  every self-lit sub-mesh's `emissiveIntensity` each frame by the same `rainDim = 1 - worldEnv.rain*0.45`
  formula `DayNight.tsx` already uses for light sources, instead of the fixed constant baked in once at
  material-creation time. Night alone is deliberately untouched — the O6 night-visibility purpose still
  holds — only rain now dims the glow, matching everything around it.
[COMPLETE] **Named grounds are clustered north, leaving no clear direction for kingdom expansion.**
  Requested and fixed 2026-07-30. Confirmed compass convention two independent ways (`keep.ts`'s North
  Wall socket at `z:-H+1.2` vs South at `z:H-1.2`; `Compass.tsx`'s own bearing math, `atan2(-dx,-dz)`
  with N at bearing 0) — **-Z is north, +X is east** — so the old layout really was four of six grounds
  (Herb Meadow/Old Quarry/Iron Seam/Deepwood) on the north side, with the whole south half empty despite
  not actually being clear: `SPAWN`, `SIGNPOST`, the starter-village huts, and the road's western leg
  (plus its own verge trees) all live there (`world.ts`/`road.ts`). Redistributed in `grounds.ts`: the
  Home Grove keeps its pond-side spot (SE — its own flavour text, "the walk to it passes the water", is
  written around that); Northwood Stand moves from due west to south-west `(-70,70)` and the Herb Meadow
  from north-west to due south `(-5,90)` — the two directions that had nothing at all; Old Quarry/Iron
  Seam/Deepwood keep their own E/NE/N character, nudged only far enough to clear the ground-vs-ground
  spacing check against their new neighbours. Net: N, NE, E, SE, S, SW — six distinct directions instead
  of four crowded onto one side and two empty. Every new position was checked by hand against the whole
  SW obstacle cluster (signpost, village, road + verge) and the pond, using centre-distance vs.
  half-extent-sum for every ground pair, not eyeballed — then confirmed live: `grounds.ts`'s own
  dev-mode self-check (`console.warn('[grounds] ... overlaps ...')`, already wired into `seedNodes`)
  produced zero `[grounds]` warnings on a fresh guest run, and every ground seeded its FULL node count
  (grove 6, northwood 12, herbmeadow 7, quarry 8, ironseam 5, deepwood 14) — confirming no ground is
  silently losing placements to the build-region/starter-village/pond-shore exclusions at its new spot.
  Scope note, left as-is deliberately: `LAND_TIERS`/`BUILD_REGION` still grow as a symmetric square about
  the origin with no directional-growth mechanic — this pass fixes the CLUSTERING (a resource, a screen
  direction), not a new "expand this way" system, which the original report itself flagged as a separate,
  undecided design question ahead of the empire system (9 disjoint `WORLD_DESTINATIONS`, unaffected by
  any of this).
- [COMPLETE] **Enemy NPCs need ranged weapons and shields, not just swords/halberds.** Requested and
  fixed 2026-07-30. `EnemyData` gained `ranged?: boolean` (`combat.ts`), rolled once per bandit at
  spawn (`Math.random() < 0.4`) so a raiding party is now a mix rather than every bandit carrying the
  same halberd — stable for the mob's whole life, and rolled at every one of `spawn()`'s many bandit
  call sites (dusk raid, Cedric's war party, camp guards, the Sealed Crypt) for free. `Enemies.tsx`'s
  AI branches a `data.ranged` bandit to hold at `RANGED_RANGE` (14) and hit-scan (`RANGED_DMG` 1.2 every
  `RANGED_ATTACK_CD` 1.8s, same `target.hp -= dmg` pattern `Defenders.tsx`'s own bow loadout already
  uses — no projectile object) instead of closing to melee, in both the defender-engagement and
  player-engagement branches; the existing chase branch already stops short correctly since
  `RANGED_RANGE` (14) sits inside its own 26-unit engage radius. Visual: `HeldCrossbow` (already used by
  Defenders.tsx) swaps in for `HeldHalberd` on a ranged bandit; melee bandits, skeletons, royal knights,
  and Cedric all now also carry `ArmShield` (previously only royal/cedric did) — two-handed wielders
  (ranged bandits, halberd-carrying Gilbert) stay unshielded. Verified live (Playwright, `window.__kke`/
  `window.__kkc`/`window.__kkp`): a single isolated ranged bandit held at its exact spawn distance
  (10m) for 8+ seconds without closing, state `'attack'`, and dealt exactly 1.2 dmg per ~4s window to
  `combatState.hp` (matching `RANGED_DMG`/`RANGED_ATTACK_CD`); close-up d3d11 screenshots confirm the
  melee bandit (halberd + shield), ranged bandit (compact crossbow, no shield), and skeleton (sword +
  new shield) are all visually distinct. `npx tsc --noEmit` and `npx next build` both clean.
[COMPLETE] **Hold left-click to gather, matching how attacking already works.** Requested and fixed
  2026-07-30. Extended construction's existing `combatState.lmbDown`-held pattern to the gather kinds:
  new `CLICK_HELD_TARGET_KINDS` (`combat.ts`) — `{construct, tree, rock, fishing, herb}` — is the single
  source both `PlayerController.tsx`'s prompt/`heldInput` logic ("Hold Click" vs "Hold E", which input
  source drives the hold) and `CombatController.tsx`'s mousedown guard read from. That guard is the part
  that matters most: without it, holding LMB on a tree would ALSO throw a sword swing (or fire a bolt)
  the instant the button went down, since `onMouseDown` unconditionally set `lmbDown` and continued into
  the attack branch — the construction-site exception already special-cased this
  (`if (st.targetKind === 'construct') return;`) and now the gather kinds share the same early return.
  Real keyboard E no longer drives any click-held target (matches the construction precedent exactly —
  gamepad/touch's own interact button still works via `pad.current`, since neither has a separate
  hold-to-act input mapped). Verified live: aiming at a tree shows "Hold Click — Chop Tree"; holding E
  alone for a full duration gathers nothing (0 wood); holding LMB for the same real time gathers wood
  (`actionProgress` reaches 1, inventory gains 3 wood) with stamina unchanged before/after (100→100),
  confirming the click-held guard is doing its job — no sword swing fired alongside the gather.
[COMPLETE] **Bestiary entries need real lore — strengths/weaknesses, not just a Vigour number and one
  flavor line.** Requested and fixed 2026-07-30. `ATTACK_DMG`/`ATTACK_CD` (real per-kind numbers, were
  local to `Enemies.tsx`'s own AI loop) moved to `combat.ts` and exported, next to the kind's other
  cross-cutting stats (`KIND_HP`/`KIND_LABEL`/`KIND_XP`) — single source of truth, `Enemies.tsx` now
  imports them instead of holding its own copy. New `src/game/data/bestiary.ts` holds a real per-kind
  `BESTIARY_LORE` (strength/weakness pair), authored against the actual coded mechanics, not invented:
  skeleton (lowest Vigour, never spawns solo), bandit (~40% roll ranged at spawn and hold range instead
  of closing — `combat.ts`'s own spawn roll from this session's ranged-loadout work — and break/flee
  under 2 Vigour), Gilbert (tougher than his own raiders and, unlike them, absent from the flee
  condition entirely — never breaks), Cedric (45 Vigour, by far the toughest, but flees everywhere
  except his own sanctioned final-stand fight — Cedric's Siege), Royal Knight (always sword-and-shield,
  never rolls ranged, never breaks). `BestiaryPanel` now shows Vigour, a new **Attack** row (dmg / cooldown
  from the real tables), Felled, the existing blurb, then **Strength**/**Weakness** lines from the new
  lore file, then Carries — verified live via a d3d11 screenshot with all five recorded kinds, every
  field rendering correctly. Storm stays excluded from the book (a duel, not a scannable foe, per the
  panel's own existing `KINDS` list) — its lore entry exists only so the `Record<EnemyKind, …>` stays
  total, same convention the existing `BLURB` map already used for it.
- [TODO] **Building placement can stutter on first load — worth a fresh look, most of the known cost is
  already fixed.** Requested 2026-07-30 ("it pauses the game engine while it loads... needs to be
  seamless"). Buildings load via `useGLTF` wrapped in `<Suspense>` (`Buildings.tsx`), which per React/R3F
  semantics shows a fallback rather than blocking the frame loop outright, and `preloadCommonAssets()`
  (called once on mount from `GameScreen.tsx`) already warms every buildable's GLTF ahead of placement
  via `useGLTF.preload`. The actual synchronous stall this used to have — a full clone + two `Box3`
  passes + shadow/normal traversal + alpha-mask check, run fresh on EVERY placement instance — was
  already fixed by `normalizedPropCache` in `PropModel.tsx` (see that commit's own message, "Cache
  normalized props across instances, not per-component"). Whatever's still being felt is most likely
  the genuine first-ever parse of a URL `preloadCommonAssets` didn't warm (a piece not in the common
  list, or a cold cache after a fresh deploy) — worth a live trace to confirm rather than assuming the
  old normalization cost is back, since the code shows it shouldn't be.
  **Re-checked live 2026-08-04** (`requestAnimationFrame` gap tracing across a real `placeBuilding()`
  call, dev server, fresh session): a `woodpile` — first-ever placement of that type this session — shows
  a max frame gap of 17.7ms and zero frames over the 50ms jank threshold; a second placement of the same
  type measures within noise of the first (18.4ms). No stutter reproduced for this building type under
  these conditions. Left genuinely open rather than closed: this only tests one common buildable already
  covered by `preloadCommonAssets()`'s warm list and a warm dev-server cache — the theory above (a piece
  NOT in that list, or a cold cache right after a fresh production deploy) is exactly the case this test
  doesn't rule out, since neither condition was reproduced here.
[COMPLETE] **AI villagers harvested resource nodes on grounds the player hadn't unlocked yet.**
  Requested and fixed 2026-07-30. `TargetRegistry.ts`'s `Target` interface gained an optional `ground`
  field, threaded through from `ResourceNodeState.ground` in `nodeTarget()`. `gather.ts`'s
  `target_usable` consideration now scores 0 for a target carrying a ground the player's `landTier`
  doesn't yet cover, via the exact same `groundOpen(gr, landTier)` (`grounds.ts`) the player's own
  interact prompt already used — no new gate invented, the existing one just reused. Nodes with no
  `ground` (starter area, open-water fishing, road-verge trees) stay ungated, unaffected. Verified live:
  a miner positioned at a locked quarry rock node (tier 1, landTier 0) never reserved it across a 4s
  window; a lumberjack in the same run correctly found and began gathering an ungated road-verge tree
  instead, confirming the gate blocks locked ground without breaking the AI gather pipeline generally.
[COMPLETE] **The merchant (and NPCs generally) cut corners instead of preferring roads; roads have zero
  gameplay effect today.** Requested and fixed 2026-07-30. `road.ts` gained `distanceToRoad`/`onRoad`,
  the road's real printed-carriageway geometry (not just "which 12.8m tile," which includes the grassy
  verge — see the tree-scatter avoidance just above `routeCells()` in `gameStore.ts`): segments built by
  walking the same raw waypoints `routeCells()` itself gap-fills, but WITHOUT that function's own
  deduplication — `routeCells()`'s returned array collapses a revisited cell (the branch north off the
  junction reuses a cell the westward run already passed through), which left two of its "consecutive"
  entries a full diagonal cell apart; segments built naively from that array would have inserted a
  phantom shortcut straight across open grass at exactly the branch (caught live during verification,
  before shipping — a point 5.6m off the true road, well outside its ~2.9m half-width, was reading as
  "on road" until this was fixed). `NavGrid` (`navgrid.ts`) now precomputes a `roadMask` (home grid only
  — the route is a homestead-anchored concept, built lazily once since it's static for the run) and
  discounts a road cell's step cost to 60% in the A* search, so a route that runs alongside the road now
  prefers it over an equal-length line through open ground. `PlayerController.tsx` also gets a genuine
  `ROAD_SPEED_MULT` (1.3×) movement bonus while standing on one, out in the open (not mid-destination,
  not indoors). Verified live: `onRoad()` correctly true on-route/false 5.6m off; a pathfind from near
  home to the west arm now bends through the junction and hugs the road's own centreline (waypoints at
  z≈38.5, matching the printed road) instead of cutting a pure diagonal; the computed player `speed`
  sampled live mid-movement read exactly 5.2 (4 × 1.3) while on the road and 4 while off it, consistently
  across 5 samples each — a wall-clock "how far did 2s of held key actually cover" race came out noisy
  under Playwright/swiftshader frame-timing (a testing-environment artifact matching this session's own
  earlier precedent, not a code issue), so the live-sampled instantaneous speed value is the verification
  of record here. On "part of our advanced building mechanics for attribute points": today's road is
  still the one fixed, pre-authored route (no player-placeable road piece exists — confirmed, no `'road'`
  buildable type in `buildables.ts`), so this reads as a homestead-road perk rather than a per-placement
  one; `attributes.ts`'s `externalCapacityBonus()` stub (always 0, reserved for "a placed building
  passively grants a bonus just by existing on the grid") remains the natural home for a future
  per-tile version of this same mechanic once roads themselves are player-placeable — noted in `road.ts`
  itself, not just here, so it isn't lost. NPC-side speed bonus (villagers/merchant/raiders also moving
  faster while on the road, not just the player) is a natural follow-up, not yet wired — `navSteer`'s own
  spec doc treats its `(agent, tx, tz, dt) → {nx, nz, dist}` signature as fixed, so a caller-side check
  (each of `Villagers.tsx`/`Merchant.tsx`/`Enemies.tsx`'s own several movement sites reading `onRoad`
  itself) is the correct next shape, deliberately left out of this pass to keep it to the reported
  scope (pathing preference + a tangible, testable speed mechanic) rather than touching five more files.
[COMPLETE] **XP display was missing the actual numbers to next level in the Abilities panel — not a
  real XP/level formula disconnect.** Requested and fixed 2026-07-30. Confirmed `xpForLevel`/`levelFromXp`
  (`ranks.ts`, quadratic curve) are the single source of truth reused consistently everywhere — no
  formula bug anywhere. Correction to this entry's own first draft: `VillagersPanel.tsx` does NOT
  actually render `curXp`/`nextXp` as text either (checked directly while fixing this) — it has the exact
  same "computed but only used for bar width" gap `SkillsPanel` had. Fixed only `SkillsPanel` (the panel
  actually reported), adding a `{cur} / {next} XP to next level` line under each skill's bar.
[COMPLETE] **A crafted shield never appeared in the FPS viewmodel's left hand.** Requested and fixed
  2026-07-30. `Viewmodel.tsx` now derives `hasShield` from inventory ownership (same convention as the
  sword branch) and renders a new `CarriedShield` — lowered, at-rest, sharing `BlockShield`'s underlying
  `RealShield`/fallback geometry via an extracted `ShieldFace` — on the off-hand arm whenever a shield is
  owned and the player isn't actively blocking (which still swaps in the existing raised `BlockShield`
  unchanged). Verified live with a screenshot: shield now visibly carried in the left hand alongside a
  drawn sword.
[COMPLETE] **Homestead roster shows generic job icons instead of each villager's real face.** Requested
  and fixed 2026-07-30. Built the baked-thumbnail approach this entry's own first draft called for
  (embedding `RotatablePreview` directly would mean N simultaneous live WebGL canvases — no precedent
  anywhere in this codebase). New `src/components/character/VillagerPortrait.tsx`: one shared hidden
  Canvas (`PortraitFactory`, mounted once by `VillagersPanel`) renders each distinct villager appearance
  once — bust-framed, close camera — force-renders and `toDataURL`s it, and caches the PNG in a
  module-level `Map` keyed on the same fields `RiggedFigure`'s own effect depends on (donor + 4 colors,
  not villager id — two villagers who happen to share a look correctly share a portrait). Every row after
  that is a plain `<img>`, not a live render. `VillagersPanel.tsx`'s old `<Ico e={jobDef.icon}/>` becomes
  `RosterPortrait`, which shows the cached image once ready and falls back to the old job emoji during
  the brief queue/bake window. **Caught and fixed during live verification, not shipped broken**: the
  first version had a real race — `notify()` fires synchronously from every villager row's mount effect,
  and with several rows requesting a portrait in the same commit, the factory's queue-pump ran multiple
  times before React had applied the FIRST `setState` (batched/async) — each call read the same
  pre-batch "idle" value, so of 4 requested portraits, 3 were silently shifted out of the queue and
  discarded and the 4th baked twice. Fixed by guarding the pump with a `useRef` (updates synchronously,
  unlike state) instead of trusting the `job` state value inside the closure. Verified live via a
  synthetic 4-villager roster (Playwright + `window.__kk.setState`): all four rows render distinct,
  correctly-baked 96×96 face portraits (confirmed via `next tsc`/`next build` clean plus a d3d11
  screenshot), and the pre-fix run — captured before the fix, for the record — showed the old emoji
  fallback rendering correctly during the (much longer, broken) queue stall, confirming that path works
  too.
[COMPLETE] **A villager's friendly nametag stayed pinned at their bed after being switched to defender
  while asleep.** Requested and fixed 2026-07-30. `resolveAim` (`targeting.ts`) now takes a
  `villagerIds: {id, isDefender}[]` list from its caller (`PlayerController.tsx`, derived straight from
  `st.villagers`) instead of iterating the `villagerMobs` leaf module's own keys — for each id it reads
  `defenderState[id]` when `isDefender`, `villagerMobs[id]` otherwise, so the position source always
  matches the villager's REAL current job rather than whichever of the two independent, never-handed-off
  position stores happened to have data. Verified live: a stale `villagerMobs` entry at (999,999) and a
  live `defenderState` entry at (0,-10) for the same id — the aim-card resolved to the live defender
  position, not the stale one.
[COMPLETE] **Phantom "hauled supplies" notifications for villagers who were actually asleep.** Requested
  and fixed 2026-07-30 (reported: "Alric" notified as delivering while asleep) — confirmed real, and it
  was the LEGACY `tickVillagers` system, not the new AI path. Fixed at the source rather than teaching
  `tickVillagers` a new check: `sleep.ts`'s `SleepActivity` now publishes through the exact same
  `workSignal` channel `gather.ts`/`haul.ts` already use to tell `tickVillagers` "the AI has real
  presence here, trust it" (`setWorkSignal(agent.id, {active:true, targetId:null, kind:'sleep'})` on
  `start()`, cleared on `abort()`). `tickVillagers` already had an unconditional
  `if (workSignals[v.id]?.active) continue;` guard before ever reaching its own looser
  `villagerAtWork()` proximity fallback — sleep now trips that same guard, freezing (and correctly
  resuming) trip progress exactly the way it already did for active gather/haul, with zero new logic in
  `gameStore.ts` itself. Verified live: notifications stayed empty and progress frozen while the sleep
  signal was active; clearing it let the same villager complete and notify normally afterward.
[COMPLETE] **Beds (and other NPC-specific objects) should be exclusively owned by one villager.**
  Requested 2026-07-30, "let's further explore this specific item" — the design decision this entry's
  own first draft flagged as still open (persisted per-bed assignment vs. claimed-on-first-sleep vs.
  explicit UI assignment) is **claimed-on-first-need, permanent**: the simplest model that needs no new
  UI and no player attention, matching how the rest of the villager-assignment system already works
  (automatic, background). `PlacedBuilding` gains `owner?: string | null` (`types.ts`), persisted for
  free — buildings already round-trip through save/load as plain data, no schema plumbing needed. New
  store action `gameStore.claimBed(villagerId)`: returns the villager's own bed if they already own one,
  else claims the first unowned built home bed and returns it, else falls back to the villager's own
  fixed home-ring spot (`villagerHomeSpot`) if nothing is available — one shared claim pool, replacing
  BOTH the old independent rank computations (`villagers.ts`'s now-deleted `assignedSleepSpot`, used by
  `sleep.ts`'s AI Activity, AND `Defenders.tsx`'s own separate inline rank math for resting guards, which
  ranked from the OPPOSITE end of the same bed array on a deliberate day/night split) — the two could
  never actually collide, but neither could tell if it had. A claim is freed only by demolishing the bed
  itself, which needs no extra cleanup: ownership lives ON the building object, so removing it removes
  the claim with it (villagers are never removed from the roster once recruited, so bed demolition is the
  only real release path that exists). `Defenders.tsx` keeps its own distinct "rest at post, not a bed"
  fallback when nothing is claimable, unchanged. Verified live (`window.__kk.setState`/`claimBed`): two
  villagers claiming in sequence get two DISTINCT beds; the first re-claims the SAME bed (idempotent, no
  re-roll); a third with no beds left correctly falls back to their own home spot; **reversing the
  villagers array — exactly the kind of roster reshuffle that broke the old rank-based system — leaves
  both existing claims unchanged**, the actual bug this fixes. `npx tsc --noEmit`/`npx next build` clean.
[COMPLETE] **Fishing now works from anywhere near the pond, not just one dock-end point — and the dock
  is shorter.** Requested and fixed 2026-07-30. `PlayerController.tsx`'s fishing branch now calls the
  same `consider()` helper TWICE for the one real `fishspot` node/target: once at the dock's own point
  (unchanged), and once at the player's own nearest point on the pond's circle, recomputed every frame
  (`POND.x/z/radius`) — reuses `consider()`'s existing distance+facing check unmodified, just feeds it a
  different point, so the same `INTERACT_RANGE` bubble effectively wraps the whole shoreline instead of
  sitting on one spot. Nothing downstream (fishingState, the catch) changed — it's still the one node,
  just reachable from anywhere at the water's edge. `FISHING_DOCK.endX/endZ` shortened from the original
  (49.33, 33.91) to (47.44, 34.81) — re-projected onto the SAME ~8.5m shore radius (not a naive
  straight-line interpolation, which would have drifted a hair toward the water) so the dock's own
  documented "goes into the pond" bug can't come back; `yaw` recomputed to match. The pond-collision
  corridor exception (same file) already derives its own math from `FISHING_DOCK.start/endX/Z` live, so
  it needed no separate change.

  Verification note: `PlayerController.tsx`'s interact detection reads a private `pos` ref internal to
  that component, not the exported `playerState` mirror — teleporting the player via
  `window.__kkp.x/z` (this session's usual console technique) has no effect on it, and steering a
  simulated walk there via Playwright's pointer-lock mouse deltas didn't behave predictably enough to
  reach the pond in the time spent trying. Confirmed via `tsc`/production build and careful review
  against the existing `consider()` pattern instead (same signature, verified geometry math via a
  standalone calculation) — the change is additive only (a second `consider()` call) and cannot regress
  the pre-existing dock interaction. Worth a real live check next time the game is played by hand.
[COMPLETE] ✅ **A named defender ("Beda") appears to change appearance/configuration discontinuously between
  standing at their guard post and "spawning."** Requested 2026-07-30; diagnosed and fixed 2026-08-04
  (Wave 2 of the ROADMAP clear-out). The earlier pass here had already ruled out a look-derivation
  mismatch (both trees share `villagerConfig()`) and narrowed it to two candidates: a loadout swap, or a
  remount flash from `Villagers.tsx`/`Defenders.tsx` being separate component trees. **Confirmed the
  remount-flash candidate structurally, not just plausibly:** `Villagers.tsx` filters
  `st.villagers` on `v.job !== 'defender'`, `Defenders.tsx` on `v.job === 'defender'` — perfectly
  complementary, so a villager is ALWAYS in exactly one tree, never both, never neither. But that also
  means a job change is unconditionally a full React unmount-in-one-tree + fresh-mount-in-the-other for
  that villager's `RiggedFigure` — and `assembleRiggedMinifig` had ZERO caching, so every remount reran
  the full async donor/palette fetch AND the expensive synchronous geometry pipeline (`classifySided`,
  `rehangArm`'s PCA analysis, `alignLimb`, building the joint hierarchy) from scratch, even though the
  donor/colors hadn't changed at all. That's the "discontinuous change" — a real disappear-and-rebuild,
  not a config mismatch. **Fix:** `minifigRig.ts` now caches the pre-animator assembled hierarchy
  (baked meshes + joint groups), keyed by the exact same fields `RiggedFigure.tsx`'s own effect
  dependency list already tracks (`headDonor`/`bodyDonor`/`armColor`/`handColor`/`legColor`/`hipColor`/
  `height`/`keepProps`). A cache hit clones the cached hierarchy (`THREE.Object3D.clone(true)` — shares
  geometry/material by default, safe here since colors are baked in per the same key and nothing else in
  this codebase mutates a rig mesh's material post-assembly, confirmed by search) and builds a fresh
  `MinifigAnimator` around the clone, skipping both the async fetches and the CPU-bound geometry work
  entirely. The cache stores a PRISTINE clone made once at first assembly — not the live `root` itself,
  which gets its joint rotations mutated in place every frame by that instance's own animator once it
  starts playing, which would otherwise have leaked whatever pose the FIRST character using a given look
  happens to be mid-animation in into every future cache hit. Combines with the hide-until-posed fix in
  the entry above to close the remaining visible gap. Verified live: recruited Beda, then rapidly
  cycled her job defender → miner → defender three times with only a 150ms settle between switches
  (deliberately short, trying to catch the transition) — zero console/page errors, the aim/targeting
  head-card correctly re-resolved her as "Beda · FRIENDLY" after every switch, `npm run verify` clean.
[COMPLETE] **The player's own standing figure doesn't hide in third-person while riding.** Found
  2026-07-30 while fixing the horse-riding sine-bob (above), not something that regressed from that fix
  — `PlayerAvatar.tsx`'s own `g.visible = !playerState.riding` line is untouched, original code. Live
  testing with `ridingState.active`/`playerState.riding` both confirmed `true` still showed the normal
  standing figure in a third-person screenshot, with the mounted horse mesh not visibly rendering in
  that same shot either. **Resolved as a side effect of the 2026-08-04 riding-camera fix** (this same
  file, "Fix upside-down destination worlds..." session): `PlayerController.tsx`'s camera branch now
  reads `st.cameraMode === 'third' && !ridingState.active`, so third-person while actually riding is no
  longer reachable through real play at all — the camera forces first-person the moment riding starts,
  regardless of the player's chosen mode. Re-checked live 2026-08-04: forcing `cameraMode: 'third'` +
  `playerState.riding: true` directly via the store (the same console-only technique the original repro
  used) confirms the store accepts the setting but the camera itself never honors third-person while
  riding — there is no remaining player-reachable state where the standing figure would need to hide
  (`PlayerAvatar.tsx`'s own visibility line was already correct regardless). No code change needed.

## Bugs logged 2026-07-31, not yet fixed

[COMPLETE] **Bow-armed defenders snipe enemies from any distance, through walls — including from their
  own bed.** Requested 2026-07-31 ("shooting through walls/objects... they should need to go and hunt
  down enemies not stand and insta kill them from a bed in the center of the map"). Confirmed a real
  logic-inversion bug, not just a tuning issue (`Defenders.tsx`, the range-gate around L311):
  ```
  const range = loadout === 'bow' ? BOW_RANGE + (...) : MELEE_RANGE;
  const inRange = dT <= range;
  if (!inRange && loadout !== 'bow') { /* chase */ } else { /* aim + deal target.hp -= dmg */ }
  ```
  For `loadout === 'bow'`, the guard `!inRange && loadout !== 'bow'` is FALSE regardless of `inRange` —
  a bow defender always falls into the attack branch and always deals damage on cooldown (1.6s), with
  `inRange`/`BOW_RANGE` computed but never actually consulted. Likely origin: `BOW_RANGE` reads like it
  was meant to replace `MELEE_RANGE` in the range check for bow-wielders (so they hold at a real distance
  instead of closing to melee), and the `&& loadout !== 'bow'` clause accidentally short-circuited the
  whole gate instead. **Fixed 2026-08-04**: dropped the `&& loadout !== 'bow'` clause entirely, so every
  loadout now correctly closes distance when `!inRange` and only attacks once actually in range — bows
  included. The outer bound this fix closes isn't small: for the default `patrol`/off-duty order, `target`
  is picked from any enemy within `ENGAGE_RADIUS` (22m) of the DEFENDER'S OWN position (L147, L150) —
  easily most of the homestead interior — and for an explicit `attack` order, target selection is
  completely unbounded distance from the PLAYER (`bestD = Infinity`, L138-142). **Not fixed by this, kept
  open below**: line-of-sight. A wall between the defender and an in-range target still doesn't matter —
  see the next entry.
- [TODO] **No line-of-sight/raycast check for any ranged attack — defender or enemy.** Split off
  2026-08-04 from the entry above once its own distance-gate bug was fixed: even correctly range-gated,
  a bow defender (or `Enemies.tsx`'s own ranged bandits, shipped 2026-07-30 — identical gap,
  `RANGED_RANGE`/hit-scan with no wall check either) can still hit a target through a wall as long as
  it's within range, since nothing ever raycasts between attacker and target. Needs a real LOS check (a
  raycast against the same collision data `navgrid.ts`'s `collisionBoxesFor` already builds obstacle
  boxes from) before a ranged hit lands in either file — worth fixing both together, they'd share the
  same helper. Not attempted in the same pass as the distance-gate fix: a real raycast-vs-obstacle-boxes
  helper is a genuinely separate, more involved piece of work, not a one-line companion to that fix.
[COMPLETE] **World layout: clear the whole north for kingdom expansion — forests to the south-west, the
  Herb Meadow to mid-west, rocks/iron further south-east/east, the pond further east.** Shipped
  2026-08-03 — confirmed directly in `grounds.ts`'s own header comment: "the whole north side is now
  reserved on purpose for the kingdom's own future expansion... every ground south of the equator, north
  completely clear." The road-network half (making the road actually reach these new positions) is
  separate, still-open work — see the next entry below ("road network extension"). Original ask, kept for
  the record: Requested 2026-07-31, directly superseding the six-way compass spread just shipped 2026-07-30 (`grounds.ts`,
  "spread named grounds around the compass" — PR #111): that pass deliberately put one tree ground at
  true north (Deepwood, `(0,-70)`) and one rock ground at north-east (Iron Seam, `(62,-55)`) specifically
  to fill the previously-empty north/north-east; the new ask wants north empty again, for a different
  reason (room to expand the kingdom there specifically, not just "no compass direction should be
  empty"). Target layout as requested: all three TREE grounds (Home Grove, Northwood Stand, Deepwood)
  in the south-west quadrant; the Herb Meadow moved from its current south spot `(-5,90)` to the middle
  of the west quadrant (roughly `x` very negative, `z` near 0); both ROCK grounds (Old Quarry, Iron
  Seam) in the south-east/east; `POND` (`world.ts`, currently `(52,42)`, already SE-ish) pushed further
  east. Real obstacles any new placement must still clear (unchanged from the 2026-07-30 pass): `SPAWN`
  `(0,26)`, `SIGNPOST` `(-16,36)`, the starter-village huts (`STARTER_VILLAGE_CLEAR`, `world.ts`), the
  road's own route (`road.ts`'s `routeCells()`, currently anchored off `SIGNPOST` and running through the
  south/south-west), and `KEEP_INTERIOR` (a fixed far-SE pocket, `(85,85)`) — all now concentrated in the
  south half instead of spread across it, since almost every ground is relocating there too; will need
  real spacing math against each OTHER, not just the fixed obstacles (the 2026-07-30 pass's own
  center-distance-vs-half-extent-sum check, `grounds.ts`'s dev-mode `console.warn` assertion, is the
  right tool to re-verify against, not eyeballing). Moving the pond specifically also moves
  `FISHING_DOCK` (anchored to it, `world.ts`) and would shift `Grounds.tsx`'s pond-shore verge-tree
  scatter and `gameStore.ts`'s `x > 30 && z > 20` pond-shore-stays-clear carve-out (`seedNodes`, ~L809) —
  both keyed off `POND.x/z` already, so they follow automatically, but worth confirming live rather than
  assumed. **Tied to the next entry**: relocating every ground away from the road's current one-route
  layout only helps if the road actually reaches the new positions (see below) — doing one without the
  other leaves 2026-07-30's own road-preference pathing (PR #110) routing raiders/villagers toward
  grounds the road doesn't go near.
[COMPLETE] ✅ **Extend the road network so it actually reaches each resource ground, not just the
  signpost — SHIPPED 2026-08-12 (Wave 12).** 7 plates became 32; all six grounds are now reached.
  - **`CELLS` → `LEGS`** (`road.ts`): a flat waypoint list can only describe an unbranched walk, so a
    branch had to be an out-and-back detour whose retrace both consumers then absorb. Fine for one
    branch, half the array for six. It is now one polyline per run of road, and a leg starting on a
    cell another leg already lays IS the junction — `Road.tsx`'s 4-bit N/E/S/W piece selection needed
    no change at all, as predicted, and the network resolves to 26 straights, 4 corners and 2 T's with
    nothing unmatched.
  - **The spur-vs-shared-trunk question, answered: shared trunks, and geometry made the call, not
    taste.** The pond (a nav-blocking exclusion) and the Home Grove's fenced rectangle between them
    wall off every eastward row from z-cell 3 to z-cell 6, so there is exactly ONE eastward corridor —
    both rock grounds hang off it rather than getting ~150m of road each. Westward, the Deepwood's leg
    has to pass Northwood Stand to get anywhere, so they share a trunk too. Only the Home Grove gets a
    spur of its own, and it is one plate long. Net: 4 legs plus a turn-off, not 6 spurs.
  - **The plate grid, not taste, also decides where a leg stops.** A leg ends at the closest cell whose
    12.8m plate does not lie across the ground's own fence, which puts pavement 1.6-9.2m off each gate.
  - **Boundary stones now stand at the gate** (`Grounds.tsx`, `roadGateFor()`): the point of a ground's
    fence nearest the road, not the middle of whichever edge faces the homestead. The two agreed while
    the road ran south of everything; a leg reaching the Old Quarry's WEST fence made a stone on its
    south edge a sign pointing away from the only road that goes there.
  - **No new pathing concept, as instructed** — `onRoad()`/`distanceToRoad()` already fed the player's
    `ROAD_SPEED_MULT` and `navgrid.ts`'s `roadMask`/`ROAD_STEP_MULT`, so new cells extend both for
    free. Worth knowing: the AI half is a mask on the ±56m HOME grid, so the outer legs buy the
    player's speed bonus and legibility, not NPC preference.
  - **`roadEntry()` is now pinned** to the herb-meadow branch's end instead of "whatever cell
    `routeCells()` returns last" — a network has no single far end, and array order would otherwise
    have silently relocated every villager arrival, `Merchant.tsx`'s `OFF_STAGE` and `CedricSiege.tsx`'s
    muster. Verified unchanged at `(-12.8, 64)`.
  - **Verge trees are now bounded** (`ROAD_VERGE_RANGE`, 13 of 32 cells): that pass was written for a
    seven-plate lane and would otherwise have lined 128m of the east road and the Deepwood trunk with
    free deedless timber — the opposite of what the grounds are for.
  - **Two live checks, because grounds move and legs don't**: `Grounds.tsx` (dev) and
    `/secret/worldeditor` (live, while you drag) now warn when a ground's gate is further than
    `ROAD_REACH` from the carriageway. The pre-existing crossing check only says the road MISSES a
    ground; a ground dragged clean away from its own leg passes it happily.
  - Original ask, kept for the record: requested 2026-07-31, continuous with the layout redesign above
    ("we can continue using the roads to guide the npcs/user to each meadow/fenced area").
  - Known and accepted: the east road's first three plates lie inside `BUILD_REGION`'s widest (Barony)
    extent. Road plates are scenery, not `buildings` — they occupy no build square and refuse no
    placement — and the road already ran to `(0, 25.6)` before this. Every other corridor is walled
    off by the pond and the grove.
[COMPLETE] ✅ **A buildable, player-diggable pond/river/moat — SHIPPED 2026-08-13 (Wave 12).** The
  homestead's second body of water, and the first that is data: a list the player grows with a tool,
  saved with the game, read back by nav, collision, placement, the node scatter and the minimap.
  Requested 2026-07-31 ("we should be able to dig and make our own pond/river later on for waterway in
  our kingdom... like real kingdoms had with moats").
  - **One shape: an axis-aligned rectangle on the 2m build lattice** (`WaterFeature`, `game/types.ts`).
    This is the load-bearing call of the whole feature, and it is what made freeform unnecessary rather
    than merely out of budget: a circle can only ever be a pond, whereas ONE rectangle is a pond, a long
    thin one is a river or a canal, and four round a keep are a moat. `TerrainExclusion` already
    supported `aabb` at no schema cost. Composition does the work a freeform editor would have done.
  - **The tool is a third `BuildTool`, not a new buildable category** (`'build' | 'demolish' | 'dig'`).
    Water is a hole, not a `[w,h,d]` box on a snap pitch, so the whole `BUILDABLES`/`evalPlacement`/
    `sizeFor` pipeline was the wrong shape for it — but Wave 9's area-demolish marquee was exactly the
    right one. Drag a patch, release to arm, the rail says what it costs and confirms. **G** toggles the
    spade (X stays "wrecking tool on/off" — making it a three-way cycle would have turned the muscle
    memory for putting the wrecker away into digging).
  - **One tool, both directions**: a patch over water FILLS it in and hands back half of what was
    actually paid (`WaterFeature.paid`, not a re-derived price — the same rule `removeBuilding`'s
    half-materials refund follows). Which job it is doing is a fact about the ground, not a mode.
  - **Nav-blocking is real, and rides the existing mechanism.** `terrainExclusions` stays the
    hand-authored world geography it always was; `activeTerrainExclusions()` is a derived,
    revision-memoised merge of it with `waterworks.list` (pushing into the static array would have
    survived a save being loaded over another one — that is exactly how such a list ends up holding the
    last three characters' moats). `NavGrid.rebuild()` gained a SECOND real input beside the buildings
    array's identity — `waterworks.rev` — because digging changes no building at all, so the 1Hz poll
    would otherwise have handed back a grid that never heard of the water. (`toggleGate` solves the same
    problem by re-spreading `buildings`; that works, but it is a side channel.)
  - **Collision parity with `POND`, deliberately, not deferred**: the player (`PlayerController`) and
    raiders (`Enemies.tsx`) are pushed out by direct rectangle math in their own movement resolvers,
    right beside the pond's circle, because that is where the pond has always stopped them. Villagers
    route round it via `navSteer` like any other blocked ground, and their idle wander no longer rolls a
    target INTO water (navSteer's documented "no route" fallback is to steer straight at the target,
    which would have parked a villager in a moat cut inside their own holding).
  - **`evalPlacement` refuses to build in it**, and `scatterNodesInRect` refuses to seed in it (which
    matters because `buyLand` re-runs `seedNodes` over the widened holding).
  - **Honestly scoped down, and this is the one real limitation**: it is an OVERLAY, not a carve. The
    home ground is one GLB bake (`Terrain.tsx`'s `HomeMeadow`) and nothing here performs runtime
    geometry surgery on it, so a dug waterway is drawn the way `POND` has always been drawn — a sandy
    bank plate with a rippling water plate a few centimetres above the flat meadow, generalised from one
    hardcoded circle to a list. Everything about it is mechanically real (blocks pathing, stops bodies,
    refuses buildings, costs gold, persists); what it is not is a visible hole in the ground. That needs
    the terrain-height work the next entry is scoped around, and is the honest follow-up.
  - **The road is the causeway.** A cut may not take a road plate ("you have no bridge to put back over
    it" — there is no bridge piece, and Wave 12's own road network is the thing that just made every
    ground reachable). A moat therefore leaves a gap where the road crosses it, which is what a real one
    does. Also refused: the natural pond and its dock, the signpost, the neighbours' doorstep, standing
    buildings, the keep foundation (`buildingsInRect` deliberately skips it), resource nodes (ignoring
    respawn state — a stump comes back, in the water, standing on it), and anything past your own fence
    plus `DIG_OUTSKIRT` (16m). That last bound is mechanical, not thematic: nav-blocking only exists on
    the ±56m home grid, and Barony's 32 + 16 = 48 keeps every legal cut inside the grid that makes it
    real. Verified against the real compiled modules: every ground and both cultivated plots lie beyond
    that reach, so their rectangles need no check of their own.
  - **Correction to the above, from the verification pass, and now written into `terrainConflict`'s own
    doc comment rather than left as folklore: only THREE of those refusals can ever be seen by a
    player.** Every legal rectangle on the 2m lattice was enumerated at all five land tiers (418,981
    shapes at Barony) and the first refusal each one hits recorded: the holding bound, the road, and —
    from Estate up, once the fence reaches toward it — the pond. The dock is shadowed by the pond's
    9.4m exclusion on the water side and the east road's plate row on the land side; the keep (85,85)
    by the ±48 bound; the signpost by the road plate it stands on (see the layout entry below); the
    starter village by that same plate row, its huts' clearance circles reaching exactly z=32. All four
    are KEPT — every number that shadows them (`DIG_OUTSKIRT`, a land tier, a road leg, `POND`) is a
    number that moves — but they are belt and braces, not gameplay, and the code now says so.
  - Sizes: 6m minimum side (below that the blocked footprint is smaller than the walkers it should
    stop), 72m maximum side (one side of a Barony moat is one drag), 600m² per cut, 24 waterways per
    homestead (every consumer is a linear scan — that is the number that keeps that the right shape).
    0.5g/m², floor 20g: a 20×20 pond is 200g against a 120g Freehold deed.
  - Save: `SaveGame.waterworks?` — optional, absent on every older save, which reads identically to an
    empty list. The static `POND` is not in it and never will be.
  - [COMPLETE] ✅ **CLOSED Wave 19 — homestead defenders no longer stand in it.** Was a known gap,
    deliberately left at parity rather than widened into Wave 8's system: `Defenders.tsx` moved them by
    direct straight-line steps toward a post or target with no nav grid and no water check of any
    kind — they could walk into the natural `POND` too. Fixed by mirroring the closer structural
    match, `Enemies.tsx`'s existing per-mob push-back (a defender's own `ds.x/z` scratch state is
    shaped like a mob's, not the player's camera-relative resolver): a new `keepOutOfWater(ds)`
    helper in `Defenders.tsx`, called after every branch that actually moves a defender
    (rest/bed-seek, follow, patrol circuit, chase-target/melee common tail) — skipped on the
    elevated/tower-watch hold and the dragon-air volley, since neither ever moves `ds.x/z` off dry
    ground. Both bodies of water, one fix.
- [PROTOTYPED 2026-08-13, Wave 12 · one quadrant only] **Elevation/terrain height, per map quadrant.**
  Requested 2026-07-31 ("adding some elevation to our maps... elevating our map in quadrants"). The
  original entry called this "not a small follow-up, a real terrain overhaul" and said to prototype one
  quadrant before committing to four. That is exactly what shipped, and the bounded area is stated in
  code rather than in prose: **the North Downs**, `game/data/downs.ts`, a 68m square at
  x ∈ [-34, 34], z ∈ [-128, -60], crown 5.5m above the meadow. The rest of the homestead is still, and
  deliberately, flat.
  - **Why the homestead was flat was never "by convention".** Verified rather than assumed: the player's
    own `floorHeightAt` opened with a literal `let floor = 0` and only ever raised it from placed
    buildings; `HomeMeadow` never registered itself as anything gameplay could sample (only a mounted
    DESTINATION did); `activeBuildRegion` hands out one scalar `groundY: 0` for the entire holding; and
    `Villagers.tsx`/`Npc.tsx` write `position.set(x, 0, z)` in twelve places between them.
  - **The mechanism is reused, not reinvented.** The knoll registers itself with `TemplateWorld.tsx`'s
    mounted-root machinery and everything reads its height through the SAME downward raycast every
    destination bake already uses for actor Y — factored into one `raycastGroundY`, with a second root
    slot beside `mountedRoot` because Terrain stays mounted while you travel and one slot cannot hold
    both. `homeGroundY(x, z)` is 0 everywhere outside the box, tested first, which is both what keeps it
    affordable and where the prototype's contract is written down.
  - **One source of truth for the ground.** `downsSurfaceY` is the authoring field; it builds the mesh
    and is then never consulted at runtime. What the player stands on is the mesh's own triangles —
    measured never more than 2.3cm from the field at 48 segments — so the ground you see and the ground
    you stand on cannot drift apart.
  - **Two real bugs found by simulating the actual movement resolver against the real field**, not by
    eye. (1) `p.y > groundEye + 0.08` is a LEDGE test, and the follow-lerp trails a descent by roughly
    (vertical speed / 12) — 0.11m at a WALK down a 0.335 gradient. Unqualified it fired on every frame of
    every descent: the player bounced down the hill in a stutter of little falls. Now gated on
    `slopeUnderfoot` (open ground this frame AND last), so terrain slopes fall through to the lerp and
    stay grounded, while stepping off a crate and walking off a battlement keep the old behaviour
    exactly. (2) Flattening the crown with a `min()` cost a slope discontinuity the 1.42m mesh missed by
    8.5cm — the player standing visibly proud of their own hilltop. The cap is gone; a raised cosine is
    already level at its centre.
  - **The box's position is four numbers, not taste**, and all four are asserted in dev (`downs.ts`, the
    same treatment `FIXED_WORLD_PROPS` gets): outside the widest fence (32) so no deed ever puts a
    building on it; outside fence + `DIG_OUTSKIRT` (48) so the spade cannot cut a moat into a hillside;
    outside the ±56m home nav grid, which is the strong one — **a walker with no cells cannot route onto
    it**, so villagers, carriers, defenders and pathing raiders are out of reach rather than merely
    unlikely; and clear of every road plate, ground, plot, the pond, the keep and the starter village.
    North was already empty on purpose (`grounds.ts`'s own header).
  - **Exactly one NPC-side `y=0` was touched**: `Enemies.tsx`'s three position writes, because raiders
    chase anything within 26m and a player who pulls a raid and runs north takes the pack up the hill.
    Villagers/court NPCs/defenders were left alone on purpose — they are anchored inside the holding,
    ~90m short of the box and outside the nav grid.
  - **Still flat-only-assumed, and known**: `evalPlacement`'s single `groundY: 0`; the node scatter;
    `navgrid.ts` (untouched — the box is outside the home grid, so `maxStep`/`rasterizeHeights` had
    nothing to do); `Villagers.tsx`/`Npc.tsx`/`Defenders.tsx`; Pass B's dug water (an overlay drawn at a
    fixed y); road plates at y=0.02; and the rain field, which recycles between y=0 and its own ceiling
    so a hilltop gets a slightly shorter column of it. Every one of those becomes real work the moment
    elevation leaves this box — which is the point of having drawn the box.
  - Residual, inherited rather than introduced: the eye trails a climb by (climb rate / 12) — 9cm at a
    walk, 24cm at a gallop — because the follow-lerp was left exactly as it is. That is the same lag
    every destination hillside has had since Phase 20. Destination worlds also still bounce downhill;
    the `slopeUnderfoot` fix is deliberately gated to the homestead rather than applied to fourteen bakes
    that cannot be tested here.
- [TODO] **Buildings/walls should stop enemies from spawning inside the kingdom, not just block their
  movement afterward.** Requested 2026-07-31 ("some sort of building placement that prohibits enemies
  from spawning... wouldn't have enemy npcs spawning in the heart of our kingdom, if we had walls").
  Checked how the two enemy sources actually pick a spawn point, and they are NOT consistent: dusk raids
  (bandits/Gilbert/Cedric/royal knights) already spawn correctly, at the map's own road entry point via
  `roadEntry()` (`Enemies.tsx` ~L671, the N79 fix from 2026-07-28) and walk in — genuinely never inside
  the walls. Night skeletons do not share that fix: they spawn at a random angle/radius (26-38m) from
  the PLAYER's own live position (`Enemies.tsx` ~L616-620), with **zero collision or wall awareness at
  all** — no call to `navBlocked()` (`navgrid.ts`, which already exists and already answers "is this
  point inside a building's collision box") and no check for "is this point enclosed by a ring of walls"
  (a materially different, harder question `navBlocked` does not answer either — it only catches a point
  landing directly ON a wall tile, not one landing in the walled COURTYARD between tiles). If the player
  is standing anywhere near the middle of a walled homestead at night, a skeleton can and will spawn
  inside the walls with today's code. Two real fixes, not mutually exclusive: (1) the cheap one — give
  skeletons the same "spawn at the map edge, walk in" treatment raids already have (reuse `roadEntry()`
  and the existing `approaching` walk-in state machine, `EnemyMob.approaching`), sidestepping the
  enclosure question entirely; (2) the more literal one the request actually describes — a real "is this
  point inside the current wall+gate perimeter" test (flood-fill or point-in-polygon over the placed
  wall/gate layout) consulted by every spawn site, which is the actual "meta-abstract data layer" the
  request asks for and does not exist in any form today.

## Performance and mobile-friendliness follow-ups logged 2026-07-31

Requested 2026-07-31: "are there further optimizations we can make... 1-2 GB is a lot of memory for a
web game... research how we can optimize our game and code so it can be used across multiple devices...
add to our ROADMAP mobile friendly (especially for gamepads, iphones, ipads, androids)." The Next.js
dev-server side of the memory question was already fixed the same day (`webpackMemoryOptimizations`,
`next.config.mjs`). The six CLIENT-SIDE performance findings below were originally logged research-only,
then the same day turned into a real feature at the user's own follow-up request ("what if we toggled an
option to have it be for 'performance' or 'ultra high quality'?") — a Performance/Balanced/Ultra
graphics-quality tier system, now shipped, that ties every one of them together. The five
mobile-friendliness findings after them are unchanged, still `[TODO]`.

[COMPLETE] **Every buildable/enemy asset is preloaded upfront, regardless of unlock state.** Fixed as
  part of the quality-tier system: `preloadCommonAssets()` (`src/game/preload.ts`) now takes a
  `preloadEnemyDonors: boolean` — buildable GLTFs stay unconditionally eager at every tier (cheap, and a
  build-menu hitch would be a worse regression than the one-time startup cost), but the 6 enemy OBJ/MTL
  donors + the dragon rig only warm eagerly when the active `GraphicsProfile.preloadEnemyDonors` is true
  (Balanced/Ultra — unchanged from the old always-eager behavior). Performance tier skips that spend
  entirely, falling back to the pre-existing LAZY path (`loadDonor`/`loadDragonRig` are already called by
  live spawn code regardless — this warm-up was only ever an optimization layer over an already-correct
  path, so skipping it is zero-risk, not new logic).
[COMPLETE] **No visual/geometry LOD — only AI think-rate LOD exists.** Fixed for characters specifically
  (not a full geometry-LOD pipeline — see the scope note below): every rigged character in the game
  (villagers, NPCs, enemies, mounted riders, the player's own third-person avatar) renders through the
  ONE shared `RiggedFigure.tsx`, confirmed across all 7 caller files, so a single change there covers all
  of them. At Performance tier only, a ~5Hz-throttled distance check (matching the AI LOD system's own
  `tierRefreshHz` convention) sets `rig.group.visible = false` beyond 60 world units — skips both the
  draw call and the bone/skinning update cost; portaled equipment (helmets, etc.) is correctly skipped
  too since three.js doesn't recurse into invisible subtrees. Verified live via screenshot: a bandit at
  53m stayed visible, the same bandit teleported to 80m vanished completely, at Performance tier.
  Deliberately a hard visibility toggle, not a fade or a reduced-poly swap — true geometry LOD needs
  lower-poly assets or a runtime simplification step, neither of which exist in this asset pipeline; real
  future scope, not force-fit into this pass.
[COMPLETE] **No automatic device-capability detection or adaptive graphics quality.** This was the actual
  core of the user's own follow-up request. New `src/game/deviceProfile.ts`'s `suggestGraphicsQuality()`
  — a one-shot heuristic (`detectTouch()` + `navigator.hardwareConcurrency`/`deviceMemory` where
  available, the latter Chrome/Edge-only and never used to downgrade on its own) — picks a sensible
  default ONLY for a genuinely fresh install (`appStore.ts`'s `loadSettings()`, gated on
  `localStorage.getItem('kk_settings') === null`), never re-suggested on a later load and never
  overriding a returning player's own saved choice (verified live: two consecutive reloads with no save
  present resolve to the same tier). The old `low`/`medium`/`high` tiers (which only ever scaled `dpr`)
  are now `performance`/`balanced`/`ultra` (new `src/game/graphicsProfiles.ts`, one config table every
  consumer reads from), each controlling `dpr` range, `<Canvas gl={{antialias, powerPreference}}>`
  (confirmed there was no `gl` prop at all before this), shadow map resolution/frustum, an Ultra-only
  fill light, panel blur, the character LOD cutoff above, and asset preload scope — `balanced` is
  calibrated to match the old live behavior exactly (verified live: shadow map 2048/frustum ±140,
  identical to the pre-existing hardcoded values) so the vast majority of returning players (whose saves
  carry the old default, `high`, whether or not they ever touched the setting) see zero change. Old saves
  migrate cleanly (`low→performance`, `medium→balanced`, `high→balanced` — deliberately not `ultra`, to
  avoid silently upgrading everyone into a heavier tier — verified live for both `low` and `high`).
[COMPLETE] **Shadow map has a fixed, uncapped scope regardless of what's on screen.** Now tier-driven:
  1024²/2048²(unchanged)/4096² map size, and Ultra additionally shrinks the frustum from the old static
  ±140 world-unit box down to ±70 while **re-centering it on the player every frame** (a new `sunTarget`
  group in the scene graph, positioned each frame) instead of staying pinned to the world origin — so a
  sharper shadow still covers wherever the player actually is. Two real three.js gotchas surfaced and
  fixed while building this, both silent-failure-prone: (1) `light.shadow.mapSize` is only read once, when
  the shadow map's render target is lazily allocated on first shadow render — changing it later does
  nothing until the old allocation is disposed and nulled to force reallocation; (2) the shadow camera is
  a real `OrthographicCamera` — changing `left/right/top/bottom` needs an explicit
  `updateProjectionMatrix()` call, which R3F does not do automatically for nested `shadow-camera-*` JSX
  props. Both handled in a `useEffect` keyed on the tier. Verified live via `window.__kkscene`: switching
  through all three tiers (and back) changed `.shadow.mapSize`/`.shadow.camera.left/right` correctly
  WITHOUT a page reload, confirming the fix actually works rather than silently no-op'ing until next
  launch.
[COMPLETE] **Per-frame allocation hot spots in the main player loop.** Fixed for everyone, tier-independent
  (a correctness fix, not a quality feature — same principle as `plateV`, the module-level scratch vector
  this file already had one of). Every `new THREE.Vector3()`/`new THREE.Euler()` in `PlayerController.tsx`'s
  per-frame paths replaced with a `.set()` on a reused module-scope scratch object: `findTarget()`'s
  `consider()` closure (the highest-value fix — called once per interact candidate: every resource node/
  NPC/horse in range, every frame), the photo-mode fly movement, the main WASD movement direction, the
  10Hz aim-ray calc, and the third-person camera-follow math (5 allocations/frame, unthrottled — the
  other explicitly flagged hot spot). Zero `new THREE.Vector3()`/`new THREE.Euler()` remain in this
  file's per-frame paths.
[COMPLETE] **No texture compression anywhere.** Still true, and still genuinely out of scope for this
  pass — confirmed again while building the tier system, not just assumed carried over. A KTX2/Basis
  pipeline needs a build-time asset-conversion step first (`prepare-assets.mjs` is the precedent location
  for one), and the assets simply don't exist in that format yet; a quality toggle has nothing to turn on
  until that exists. Real, worth doing, a separate project — not reopened as a `[TODO]` duplicate here,
  this note just records that it was considered and deliberately deferred again, not missed.

**Known limitation, discovered while verifying live, worth being honest about:** `dpr`, shadows, and the
character LOD cutoff all update live the instant a tier is switched (confirmed above) — but WebGL's
`antialias`/`powerPreference` are fixed at the moment the canvas's rendering context is first created,
which R3F only does once at `<Canvas>` mount. Switching tiers mid-session changes those two settings for
the *next* full reload, not immediately, unlike everything else in this system. This is an inherent
browser/WebGL constraint (changing them live would mean destroying and recreating the entire rendering
context — every loaded texture/geometry — not something this pass attempts), not a bug, and is a
reasonable, common trade-off ("some settings need a restart") rather than something worth chasing further
here.

- [COMPLETE] ✅ **Touch input can move/look/interact but cannot fight — SHIPPED 2026-08-17 (Wave 15).**
  Real Attack (⚔) and Block (🛡) touch buttons, routed through the SAME combat implementation the mouse
  path always has rather than a parallel touch-only system: `CombatController.tsx`'s four mousedown/
  mouseup branch bodies (attack start/release, block start/end) were pulled into standalone functions
  (`startAttack`/`releaseAttack`/`startBlock`/`endBlock`), and a new `touchState.attack`/`block` (held
  booleans, same convention as `jump`/`interact`/`sprint`) is edge-detected against last frame and
  funneled into those exact same functions. Deliberately does **not** check
  `document.pointerLockElement` the way the mouse path's LMB branch does — touch devices generally never
  acquire pointer lock at all (no click-driven lock cycle, and iOS Safari doesn't implement Pointer Lock
  in the first place), so reusing that gate would have silently no-op'd every touch attack in the
  default fps camera mode; touch look-drag already proved camera control works with zero pointer-lock
  dependency, and that's the precedent this follows instead. One button does double duty for ranged
  exactly like LMB already does on desktop (press starts a bow's draw or fires a bolt/melee swing,
  release fires the arrow at the power accumulated) — no separate 4th/5th "draw" button needed. Verified
  live via real simulated touch events, not store bypasses: a touch attack dealt real HP damage and
  respected the weapon's own cooldown under rapid taps; block produced the real 75% damage reduction
  through the shared `damagePlayer()` path; a held longbow draw-then-release fired a real arrow
  (inventory count dropped, a real projectile spawned with nonzero velocity); a post-refactor regression
  check confirmed real desktop mouse LMB/RMB combat is byte-identical to before.
- [COMPLETE] ✅ **Gamepad support is partial and lives outside the rebindable keybind system — SHIPPED
  2026-08-17 (Wave 15).** Real, closed answer to this entry's own open question: gamepad buttons do
  **not** join `DEFAULT_KEYBINDS` — that table's values are literally `KeyboardEvent.code` strings,
  consumed by both a discrete `keydown`-event switch (panel toggles) and a held-state poll (movement);
  unifying gamepad buttons into it would mean either making every bind polymorphic or rewriting the
  event-driven panel switch into a frame-polled one with hand-rolled edge detection for all 14 panel
  actions — a real, separate project. A new, hardcoded `game/data/gamepadInput.ts` (`GAMEPAD_BUTTONS`,
  not yet user-rebindable — a fair future `[TODO]`, not this wave's job) is the honest v1, picking
  standard-mapping indices `pollGamepad()` doesn't already claim: **RT = attack/draw, LT = block/aim, Y
  = swap weapon** — mirroring the mouse's own LMB/RMB double duty and keyboard's `Q`, all routed through
  the exact same `CombatController.tsx` functions touch combat above already uses (one implementation,
  three input methods) and a new shared `cycleWeapon()` (`game/combat.ts`, moved verbatim out of
  `GameScreen.tsx`'s keyboard-only `Q` case so both inputs call the identical function instead of two
  copies drifting apart). **Menu navigation, v1 scope**: OPEN/CLOSE only for Inventory/Crafting/Quests
  (`Start` mirrors Escape's full close-panel/exit-build/pause cascade, `B` cancels, `LB`/`Back`/
  `L-stick-click` toggle the three panels) via a new always-mounted `GamepadMenuController.tsx` —
  deliberately **not** in-panel cursor/selection navigation: confirmed no `PanelId` panel has a
  keyboard-navigable selection today either (the keybind "Panels" group only opens panels, never
  navigates inside one), and a gamepad button press synthesizes no DOM event the way a touch tap does
  (which is why touch panel interaction already works for free) — building a full virtual-cursor/
  roving-focus system across ~18 panel components is a genuinely separate, much larger project. A
  controller player still needs a mouse (or OS-level gamepad-to-mouse emulation, e.g. Steam Input) to
  act *inside* a panel; this only gets them there and back. Real `gamepadconnected`/`gamepaddisconnected`
  handling: a visible 🎮 toast on both events, and `pollGamepad()`'s own `if (!gp) return` — which used
  to leave whatever movement/jump/sprint flags were true the frame before a disconnect stuck that way
  forever — now explicitly zeroes them every frame there's no pad, so a mid-session disconnect self-heals
  within one frame regardless of whether the event itself ever fires. **A real bug found during Claude's
  own personal review, fixed before shipping** (not caught by the workflow's own live verify pass): the
  three panel-toggle buttons' edge-detection was gated `if (!st.paused)`, unlike `Start`/`B` which were
  always tracked — a button held through a pause/unpause cycle (e.g. holding `LB` while pressing `Start`
  to unpause) went stale during the paused frames and read as a brand-new press the instant the game
  unpaused, spuriously popping Inventory open. Reproduced with a standalone simulation before fixing,
  then re-confirmed the fix with the same simulation. Fixed by tracking all five buttons' edges
  unconditionally every frame (matching `Start`/`B`'s own pattern) and moving the `!paused` check to gate
  only the resulting *action*, not the edge detection itself. Otherwise verified live: real simulated
  gamepad button sequences correctly drove attack/block damage, a real weapon-swap toast, and correct
  panel open/close/pause transitions with no double-fire on held frames.
- [COMPLETE] ✅ **No input-mode-aware UI — every prompt assumes a keyboard — SHIPPED 2026-08-17 (Wave
  15).** New `game/inputMode.ts`: a persisted manual override (`Settings.inputMode: 'auto'|'keyboard'|
  'gamepad'|'touch'`, `appStore.ts`, a real "Prompt style" Segmented control in Options → Interface) plus
  a live, **not** persisted `activeInputDevice` (`gameStore.ts`) — "what did the player's hands actually
  touch most recently" — updated from real input events only (a keydown, a mousedown, a touchstart, a
  gamepad button/stick actually moving past the deadzone), deliberately **not** from mere device
  presence, so a gamepad sitting connected-but-untouched or a touch device paired with a keyboard never
  falsely flips the mode. Wired into the two call-sites this entry itself named: `PlayerController.tsx`'s
  interact prompt now reads `interactLabel()`/`clickHoldLabel()` instead of hardcoded `'E'`/`'Click'`
  (HUD.tsx's existing regex extraction needed no changes — the string shape is unchanged, only its
  content), and the Inventory panel's `🎮 Controls` cheat-sheet now renders one of three real, hotkey-
  accurate blocks instead of always assuming WASD. `HelpStack.tsx`'s tutorial prose and `GameScreen.tsx`'s
  one-off `SWAP_HINT`/aim-toast strings are correctly left as lower-priority, still-hardcoded copy — real
  gaps, not silently claimed as fixed. Verified live: a real keydown/touchstart/gamepad-motion sequence
  correctly flipped `activeInputDevice` through all three states (and correctly did *not* flip on a bare
  `gamepadconnected` event with no real motion); the same interact-prompt target produced three genuinely
  distinct real strings ("Hold Click", "Hold X", "Hold E") across the three devices; the Options toggle
  was clicked as a real user gesture and correctly updated the persisted setting.
- [COMPLETE] ✅ **No PWA / installability support — SHIPPED 2026-08-17 (Wave 15).** A real Next.js 15
  `app/manifest.ts` (the typed `MetadataRoute.Manifest` convention, genuinely unused before this) —
  name/short_name/description/`start_url`/`display:'standalone'`/background+theme colors, referencing
  the existing `icon.svg` castle glyph (copied to `public/icons/icon.svg` for a stable, always-fetchable
  path outside the favicon route's internals — no new art asset needed; modern Chromium/Android accept
  an SVG manifest icon directly at any resolution). `app/layout.tsx` gained `metadata.appleWebApp`
  (capable/title/status-bar-style, the apple-specific meta tags iOS wants since Safari ignores the real
  manifest file entirely) and `viewport.themeColor`; deliberately did **not** hand-set `metadata.manifest`
  — traced through Next's own `resolve-metadata.js` and confirmed it unconditionally overwrites that
  field from `app/manifest.ts` whenever the file exists, so a hand-set value would be redundant. **No
  service worker** — real offline caching for a 597+ binary-asset game is a materially bigger, separate
  lift (cache strategy, versioning, an asset manifest); a manifest without one is still a legitimate,
  spec-compliant "Add to Home Screen" target on both iOS and Android, and true offline support is a
  documented follow-up rather than attempted here. Verified live: `/manifest.webmanifest` returns 200
  with every real field correct (confirmed again by `npm run build`'s own route list, which now shows it
  as a real generated static route); the real page head contains the manifest link and every apple/theme
  meta tag.
- [COMPLETE] ✅ **Responsive layout is real but incomplete — the two named gaps closed, SHIPPED
  2026-08-17 (Wave 15).** Touch joystick/button sizes converted from flat px to `clamp(min, Nvmin,
  desktop-max)` — the max *is* the old fixed value, so nothing changes for any viewport wide enough not
  to need it, while small phones get real headroom; `vmin` rather than `vw` so portrait and landscape
  both scale off the same, smaller dimension; every minimum held at or above the ~44px touch-target floor
  (Apple HIG / WCAG 2.5.5) even on the narrowest real phones. `TouchControls.tsx`'s `JOYSTICK_RADIUS`
  (a hardcoded 52px tuned by eye to the old fixed 120px base) is gone — the JS clamp radius is now
  measured from the joystick base's own live rendered size at touch-start, so CSS and JS can never drift
  out of sync again regardless of what the clamp resolves to. `.panel`/base `.game-panel`'s fixed
  `min-width` changed to `min(Npx, Mvw)` (the same fluid pattern `.game-panel.menu-family` and the
  already-audited inline call-sites use), so the floor can't outrank `max-width` on its own — previously
  correct only because the one 720px breakpoint happened to re-zero it, not on the base rule's own terms.
  Verified live at real 375px/1440px viewports: every touch control measurably reflows (e.g. the 76px
  Attack/Interact buttons scale to 56px, the 120px joystick base to 84px) with zero horizontal page
  overflow at either width, and the Inventory panel at 375px produces zero overflow too.

*(The four items above — touch combat, gamepad, input-mode-aware UI, PWA/installability, responsive
layout — were accidentally duplicated verbatim in an earlier edit; the duplicate copy was removed
2026-08-04, this is the only copy now.)*

## 📋 Found while capturing How-To-Play screenshots (2026-08-04)

- [COMPLETE] ✅ **Crafting panel doubles the ×N suffix on multi-output recipes** — already fixed back
  in Wave 0+1 (commit `6aed460`, "Crafting panel doubled the 'x4' suffix on Bolts/Arrows"), this entry
  just outlived the fix that closed it (a report logged the same day, never cross-referenced). Verified
  directly against the live code rather than taken on trust: `game/data/recipes.ts`'s `bolt`/`arrow`
  entries now read `name: 'Bolts'`/`name: 'Arrows'`, with no count baked in — `Panels.tsx`'s
  `CraftingPanel` row suffix (`{r.name}{r.outputCount > 1 ? \` ×${r.outputCount}\` : ''}`) is now the
  only source of the "×4," exactly as intended.

## Travel & world-map overhaul — requested 2026-08-04, scoped only, not started [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.

Three related but separable asks from the same message, logged per the user's own "just add it to
the roadmap" pattern for major-overhaul-scale work.

- [COMPLETE] ✅ **A waypoint/fast-travel system, plus Points of Interest and undiscovered/fog-of-war
  locations — SHIPPED 2026-08-17 (Wave 14).** Real, closed answers to this entry's own open design
  questions, decided against the live code rather than guessed at:
  - **What counts as a POI, v1:** the 6 resident court NPCs (`data/npcs.ts`'s `NpcDef.world`/`x`/`z`/
    `yaw`), not `TemplatePopulation.tsx`'s lab-classification prop data. Checked and rejected: that
    JSON has rows for only 7 of 9 templates, and its `set`-kind rows (the bulk of it) carry nothing but
    an opaque catalogue `assetRef` (e.g. `"oc6095b3"`) with no human-readable name anywhere in the
    data — turning that into POIs would have meant hand-authoring landmark labels destination by
    destination, well past a v1. The 6 residents already have real names/titles/portraits and are
    already the thing the old flat card grid surfaced as a plain-text line; a POI is now a first-class,
    independently-waypointable `Poi` (`poisForDestination(destId, completedQuests)`, `data/npcs.ts`),
    gated by the same `isNpcRevealed` quest gate the resident already used everywhere else. Destinations
    with no resident (04/05/07/09, all 6 challenge grounds, the dungeon, the arena) simply have no POI
    in v1 — plain destination-level travel is unchanged for them.
  - **Undiscovered gates DISPLAY, never travel:** a `"???"` placeholder (detail-card button and map pin
    dot alike) rather than hiding the POI outright or blocking the waypoint — the same non-punitive
    convention `visitedWorlds` already set for whole destinations. New `SaveGame.discoveredPois?:
    string[]` (identical optional-array convention to `visitedWorlds`/`waterworks`/`falconTamed` etc.),
    set the moment a POI is actually waypointed to.
  - **A waypoint jumps straight to the POI**, not just `dest.origin`: `travelTo(id, poiId?)` — an
    optional second argument, defaulting to the old destination-only behavior when absent, so no
    existing call site anywhere in the codebase needed to change. Lands the player at `poi.x, poi.z -
    2.4, poi.yaw` (the same "-2.4, face the resident" offset `beginCeremony` already hand-tunes for
    standing before King Leo — verified their two `yaw: Math.PI` values are identical, not a
    coincidence: every one of the 6 residents is posed the same way). An unrecognized/unrevealed
    `poiId` (a stale save, a POI hidden behind an unmet reveal quest) silently falls back to a plain
    destination-level travel rather than erroring.
  - **Explicitly deferred, correctly**: the third ask below (per-scene rendering) — a waypoint stays a
    `pendingTeleport`-style position jump inside the existing single shared scene, exactly like
    `travelTo` always has, never a scene load/unload, so this wave does not silently grow a dependency
    on the deferred item.
  - Verified live: fresh save starts with `discoveredPois: []`; a POI is correctly invisible before its
    resident's reveal quest and shows exactly the right count after; waypointing lands the player at
    the exact `poi.x`/`poi.z - 2.4`/`poi.yaw` coordinates (confirmed for two different residents, via
    both the detail-card button and the map pin's own satellite dot); `discoveredPois` flips and
    persists through the real save/reload path.

- [COMPLETE] ✅ **The Travel Map's look — replace the current dark HUD-panel grid with an illustrated,
  parchment-style map — SHIPPED 2026-08-17 (Wave 14).** `TravelPanel.tsx` no longer renders the old
  three-grid `.game-panel` card layout at all — a real illustrated parchment surface (`.tm-surface`,
  `globals.css`), gradient/ink-color lifted from `kk-tokens.css`'s authored-but-until-now-unused
  `.kk-d-parchment` recipe and applied directly (not via that class: a map should look like a map
  regardless of which `kk-lanes.css` HUD skin lane the player picked, the same way an in-world object
  would), with `--gold`/`--chrome-2`/`--parchment-dark` — the game's own active palette — still driving
  every border/accent so nothing clashes with the surrounding chrome. Destinations group into three
  legible regions (**The Eight Roads**, **Challenge Grounds**, **Sealed Away**) rather than a literal
  plot of each `origin.x/z` — confirmed meaningless geography, per `worlds.ts`'s own header comment,
  same finding the waypoint entry above independently reached. Each destination is a real pin (its own
  icon, a visited ✓/settlement 👑/locked 🔒 badge); each resident POI from the entry above is a small
  satellite dot attached to its destination's pin — a portrait once discovered, a plain **?** before —
  independently clickable to waypoint straight there. Clicking a pin only ever selects it into a side
  detail card; the real `travelTo()`/`enterDungeon()`/`enterArena()` calls still fire exclusively from
  an explicit button there, exactly like the old cards did, so browsing the map never travels you by
  accident. Every other real behavior is preserved exactly, including one pre-existing display quirk
  ported faithfully rather than silently "fixed" out of scope (the Sealed Crypt's ✓ badge has always
  meant "you are currently there," not "you have ever been there" — unchanged): `template-09` filtered
  from the roads region (it's the homestead), `visitedWorlds` checkmarks, the `settlements[id]` YOURS
  badge, the dungeon/arena unlock gate and its exact original conditional text/disabled-button logic,
  and all 4 Endless Arena rings. Verified live: the parchment surface really renders (16 real pins,
  `.travel-dest-grid` gone from the DOM and the whole `src/` tree); `travelTo()` still lands correctly
  at 4 different destinations tested via both direct calls and a real clicked button; the map reflows
  correctly at a 375px mobile viewport (stacks to one column, no horizontal overflow) and stays
  side-by-side at 1440px, matching the project's established 720px breakpoint convention.
  **Not attempted, correctly**: real or approximate cross-destination geography (the three-region
  grouping is a legible, guaranteed-non-overlapping simplification, not a hand-tuned road-drawn map) —
  a reasonable v1 trade of a fancier layout for one that can never overlap at any viewport width.

- [TODO] **Each travel destination rendered in its own scene instead of every destination's bake
  sitting inside one shared Canvas/scene graph, plus some kind of CMS to pass data between scenes.**
  Deliberately still untouched by Wave 14 (2026-08-17), same judgment as when this entry was first
  scoped: the single largest, riskiest item in the whole 16-wave plan, and both items above were
  designed specifically to NOT depend on it (a waypoint stays a `pendingTeleport` position jump inside
  today's one shared scene). Belongs in its own future design-and-plan cycle. Confirmed current
  architecture: `GameWorld.tsx` mounts exactly one `<TemplateWorld />` (and one
  `<TemplatePopulation />`, one `<GameSky />`, etc.) for the player's whole session — every
  destination is the SAME React Three Fiber `<Canvas>`/scene graph, just offset into its own
  non-overlapping quadrant via `dest.origin` (templates at x:1000-3400 z:1000, the dungeon at
  {4200,4200}, the arena at {-4200,4200}, challenges at {-4200,-4200}+spacing) — literally "all
  stacked in a single scene," matching the report exactly. This is a real, large architecture change,
  not a small one: React Three Fiber supports multiple `<Canvas>` roots, but switching to one
  per-destination would touch how the player/camera/HUD/combat/AI systems all currently assume a
  single continuous world-space coordinate system (`playerState.x/y/z`, every `dest.origin`-relative
  offset throughout `TemplateWorld.tsx`/`TemplatePopulation.tsx`/`CourtDressing.tsx`, `navgrid.ts`'s
  height rasterization, `AgentManager`'s AI tiering) — a scene-swap model needs its own designed
  transition (unload/load, not just camera-hide) and, per the request, "some sort of CMS to help pass
  data along between the scenes rendered" — i.e. a real cross-scene state layer for whatever needs to
  survive a swap (quest flags, claimed-plot state, spawned-content persistence) that doesn't already
  live in `gameStore`'s own global state. Worth naming plainly: the CURRENT single-scene approach is
  also *why* things like `sampleTemplateGroundY`/`getBakeOffset`/`mountedRoot` all work as simple
  module-level singletons ("only one destination bake is ever mounted at a time") — a real per-scene
  architecture needs a different answer to "what does live raycasting/ground-height sampling mean"
  for whichever scenes are and aren't currently active. Real performance/engineering tradeoffs to
  weigh before committing (memory for N loaded scenes vs. load-in latency on every travel, whether it
  actually solves a real problem the single-scene approach has today or is a change for its own sake)
  — needs its own design pass, not a "just do it" implementation.

## Found during Wave 5 verification (2026-08-05), pre-existing and out of that wave's scope

- [COMPLETE] ✅ **A duplicated `leave_engine` block spliced into `PlayerController.tsx`'s `useFrame`
  cart branch, silently aborting a frame's update — FIXED 2026-08-17 (Wave 14).** Confirmed still
  present, byte-identical, exactly where this entry always said it was (immediately inside the
  `if (cartState.pushingId || cartState.hitchedId)` branch, between the `fz = -Math.cos(yaw.current)`
  line and the `if (cartState.pushingId)` check) — a fourth independent confirmation, after Waves 5, 7
  and 8 each rediscovered it and moved on. The fix this entry always predicted was correct: the stray
  spliced `return { id, kind: 'leave_engine', ... }` (discarded by the `void` `useFrame` callback,
  silently skipping the rest of that frame whenever a player was both crewing a siege engine and
  mid-push/hitch on a cart) is deleted outright; the legitimate copy at `findTarget()` was never
  touched. Verified live rather than just re-read: manned a real placed catapult (`E` → real
  "Step down from the Catapult" prompt), stepped down, then held `W` for 700ms and moved 0.40m —
  confirming the surrounding `useFrame` code the dead code used to abort out of now runs to completion
  every frame. Folded into Wave 14 as a trivial, isolated, already-4×-verified one-block deletion
  rather than its own wave.

## Wave 17 — six player-reported bugs, found live 2026-08-17

Reported after the full 16-wave plan above shipped, from actually playing the result. Each
investigated directly against the live code before fixing; see the plan file's own "Wave 17" section
(appended to `gleaming-sleeping-robin.md`) for the full analysis.

- [COMPLETE] ✅ **Builder villagers "work" through the night with no real day/night gate — FIXED
  2026-08-18.** Two separate systems, both confirmed ungated: the mechanical construction progress
  (`gameStore.ts`'s builder pass inside `tickVillagers`, crediting `constructBuilding` purely off
  physical proximity to the site) and the matching in-world animation (`Villagers.tsx`'s
  `villager.job === 'builder'` branch, seeking the site and playing `anim_g_swordswish`) — neither ever
  checked `isWorkingHours`/`isWatchHours`, unlike the modern AI reasoner's `gather.ts`/`farm.ts` actions,
  which both already gate on `is_work_hours`. Fixed by adding the same `isWorkingHours(worldEnv.time)`
  gate to both. **The mechanical fix is definitively verified live**, isolated from the AI
  positioning/reasoner system's own frame-by-frame movement (which otherwise fights over the same
  villager position every render, making a full end-to-end browser test unreliable): forced a builder's
  tracked position onto a real placed construction site, called the real `tickVillagers(5)` store action
  directly at deep night — `built` stayed at exactly `0`, unchanged — then called it again at midday —
  `built` advanced to exactly `0.2`, matching `dt(5) × 0.04 × atSite(1)` to the decimal. The animation-side
  fix mirrors the identical, already-proven gate onto the matching legacy code path (traced by hand: every
  non-defender villager, builders included, already has a real reasoner `Agent` whose shared `'villager'`
  archetype carries `sleep`, and `Villagers.tsx`'s own cascade already yields to a won sleep activity's
  `MOVE_TO` intent before ever reaching this branch — so the explicit gate here is deliberate
  belt-and-braces for the ramp-up window between "it became night" and "tiredness actually out-scored
  whatever else was running," not the sole line of defense). `npx tsc --noEmit` / `npm run build`: both
  clean.

- [COMPLETE] ✅ **Build-mode facing arrow doesn't always show for a freshly-selected piece — FIXED
  2026-08-18.** Root cause confirmed live, and it was bigger than "the arrow": the entire ghost preview
  (box, footprint plane, wireframe, arrow, tick — all one gated unit in `BuildController.tsx`) depends on
  `ghost`, a plain `useState` written **only** inside the invisible ground-plane's `onPointerMove` handler
  — nothing seeds or resets it when a piece is freshly selected or move-armed. Live-reproduced for every
  piece/category tried (walls, corners, towers, small props): immediately after selection, with zero mouse
  movement, `ghost` was `null` every time, so nothing rendered at all — not just the arrow. The "moving an
  existing piece" path turned out to have the *identical* gap (`{"activeType":"torch","ghost":null,...,
  "moving":true}`), it just reads as reliable in play because "Move it" is reached by first hovering the
  piece inside the canvas, so the very next incidental mouse jitter closes the gap almost instantly — not
  because that path is actually exempt. Fixed with a `useEffect` that seeds `ghost` synchronously from the
  build camera's own current focus point the instant a piece goes active and `ghost` is still null, so the
  preview exists before the player has moved the mouse at all; the real `onPointerMove` still takes over
  the moment they do. One change fixes both the fresh-selection and move cases, since both hit the same
  root cause; the `isCorner` arrow-suppression logic (data-driven, correct) is untouched. Verified live
  across 5 piece types plus a genuine corner piece (arrow present/absent correctly in each case,
  screenshotted), and the move-tool path — the live re-verification also root-caused and worked around a
  real test-environment quirk (this headless/SwiftShader setup runs at only ~2-3fps, causing flaky
  same-frame reads during a 3D-model unmount that a plain `setTimeout` sampling approach resolved cleanly;
  not a product defect).
- [COMPLETE] ✅ **"Cast your line" prompt triggers near the east road, away from the real pond — FIXED
  2026-08-18.** The original static estimate compared the wrong "road" — `ROAD_HALF_WIDTH` (2.88m) is the
  road's logical speed-bonus corridor, not its real rendered footprint (`Road.tsx`'s 12.8m square
  baseplate tiles, grass surround included). Live-measured exact geometry: the single `fishspot` node
  `(47.44, 34.81)` sits **2.81m** from the east road tile's own rendered edge `(47.44, 32.0)` — inside the
  old flat 3.4m `INTERACT_RANGE` — and grid-sweeping the real winning prompt confirmed `'fishing'` was
  actually winning right at that tile edge, with zero fishing hits anywhere on the true pavement centerline
  or its speed-bonus shoulder. The newer "cast from anywhere along the shore" ring check independently
  reached the same territory for the same underlying reason: the pond's real south shore is only 2.0m past
  that same road tile edge — the pond and road were simply placed close together. Fixed with a new,
  fishing-specific `FISH_CAST_RANGE = 1.5m` (`game/data/world.ts`), replacing `INTERACT_RANGE` at both the
  dock's fixed interact point and the shoreline ring check (`PlayerController.tsx`) — measured to sit
  comfortably under both the 2.0m and 2.81m real gaps found live, while still reaching the real bank right
  at the dock (zero distance there, no regression). Verified live: standing 1.0–1.4m from the fishspot
  still shows the real prompt and completes a full real cast (fishing.ts's own cast/bite/catch mechanics,
  entirely untouched, confirmed still working end to end); standing 1.6m away or at the measured 2.81m
  road-edge distance now shows nothing.
- [COMPLETE] ✅ **Build region grows into the east road at higher land tiers — FIXED 2026-08-18.** Root
  cause confirmed with real, independently-re-derived geometry (sign convention re-derived from
  `Compass.tsx`'s own bearing math, not assumed: north = −Z, south = +Z): the real east road's westmost
  plate (`road.ts`'s leg 4, `[0,2]`) has its near edge at `z=19.2` (a real 12.8m rendered tile, not the
  narrower logical `ROAD_HALF_WIDTH` corridor), and the old symmetric `BUILD_REGION`/`LAND_TIERS` square
  already overlapped it at every tier except the smallest — 21m² at Freehold, growing to 491.52m² (three
  whole road tiles fully enclosed) at Barony. Fixed by giving `LAND_TIERS` a second, **constant** field,
  `southHalf = 12` (every tier, `game/data/landTiers.generated.json`), separate from the shared `half`
  that still governs north/east/west — so the south fence can never again grow to meet the road no matter
  how wide the other three sides get. `landSouthHalf()` (`buildables.ts`), `BUILD_REGION.maxZ` and
  `activeBuildRegion()`'s `maxZ` all updated accordingly. The other three sides grew (16→16, 20→24,
  24→28, 28→36, 32→40) to keep each tier's total buildable area within about ±12% of its old value
  (real area math, not eyeballed — table of exact old/new areas in the PR). Real companion fixes the
  research pass flagged as required, not optional, closing the SAME complaint through two side doors it
  would otherwise have reopened: (1) `waterworks.ts`'s dig-conflict check used one shared scalar for
  every direction including south, which — left alone — would have let a player dig a moat right up
  against the road in the exact buffer this fix exists to preserve; now direction-aware, with **no**
  `DIG_OUTSKIRT` allowance added on the south side specifically. (2) `HOME_X`/`HOME_Z`
  (`data/villagers.ts`) — the single "homestead centre" every AI/combat system (`Defenders.tsx`,
  `RaiderRam.tsx`, `Enemies.tsx`, `flee.ts`, `takeCover.ts`) measures against — used to be derived from
  `BUILD_REGION`'s own midpoint, which only ever evaluated to `(0,0)` because the region was square; left
  unfixed, the new asymmetric shape would have silently dragged that anchor up to 14m north as tiers grew,
  a real behavioral change nothing downstream asked for. Hardcoded to `(0,0)`, what the formula always
  meant. Also updated: `grounds.ts`'s `clearsHomestead()` (and its `/secret/worldeditor` live mirror) now
  check the correct directional bound instead of one shared scalar (not a live bug with today's data, but
  was checking the wrong number for every real ground); the world editor's Land Tiers tab/map
  preview/save-route validation all extended for the new field; copy in `BuildBar.tsx` and the `buyLand()`
  toast corrected from "N walls a side" to "N walls per N/S side" now that the two axis wall-counts
  genuinely differ. `downs.ts`'s own dev-mode clearance assertions were re-verified against the new
  numbers rather than assumed safe — all three still hold with real 4m margins at the new
  `landHalf(MAX)=40`, no code change needed there. **A real regression caught by the verify pass before
  shipping**: the always-rendered homestead "dirt patch" decorative mesh shared a variable with the
  build-mode-only region overlay that legitimately needed to become tier-dependent, so the dirt patch
  silently drifted north with it (measured live: z=−2 at the smallest tier → z=−14 at Barony) — fixed by
  pinning it to a fixed `(0,0)` centre, the same "true fixed centre, not a fence-width byproduct"
  reasoning already used for `HOME_X`/`HOME_Z`. A leftover unguarded debug handle from live verification
  was also caught and removed before shipping. Verified live end to end across all 5 tiers via the real
  `buyLand()` action: `BUILD_REGION` bounds, minimap overlay, build-mode overlay, and `/secret/worldeditor`
  all show the correct asymmetric shape with zero road-tile overlap at any tier; the dig-tool fix
  confirmed via `digPreview()` — a rectangle in the old-formula-legal gap between the new fence and the
  real road is now refused, one inside the fence is still allowed.
- [COMPLETE] ✅ **AI-driven hauling to distant grounds ignores the real road network — FIXED 2026-08-19.**
  Root cause confirmed precisely: `src/ai/config/navgrid.json`'s home nav grid `halfExtent` was a fixed
  56m, unchanged since the original AI build, while the real resource grounds (`grounds.generated.json`)
  scatter nodes up to **~197m** from the origin (a real, measured worst case — the plan's own original
  "~140m" estimate undersold it). `NavGrid.findPath()` returns `null` for any out-of-bounds endpoint, and
  every real caller (`Locomotion.ts`'s reasoner actuator, `Villagers.tsx`'s legacy job cascade — both
  route through the same `navSteer()` chokepoint) falls straight through to a raw beeline for the
  **entire** trip the moment that happens — zero road preference, zero obstacle avoidance, even for the
  portion right past the player's own buildings. Fixed by widening `home.halfExtent` from 56 to 200
  (matching `WORLD_HALF`, covering the real worst case with real margin) — a **cheap** fix in this specific
  codebase, confirmed by reading `NavGrid` directly rather than assuming: `rebuild()`'s recurring 1Hz-polled
  cost is bounded by building/exclusion **counts**, not grid area, and the only genuinely area-scaled costs
  (a `Uint8Array` allocation, a one-time lazy road-mask build) are single-digit-MB/tens-of-ms one-time
  costs, not a recurring tax — the naive "12× more cells ⇒ 12× slower" framing the original plan worried
  about does not hold here. **A real hazard the original plan did not anticipate, found by re-verifying
  every consumer rather than trusting the plan's own scope**: `game/data/downs.ts`'s North Downs prototype
  (a real sloped hill every home-world walker still draws at a hardcoded y=0) was kept safe specifically by
  living *outside* the old 56m grid — its own dev-mode assertion said so explicitly. Naively widening the
  grid alone would have put that hill 140m *inside* it, letting villagers/raiders route straight onto a
  slope they'd render clipped through. Fixed by adding one static `'blocked'` `aabb` entry to
  `navTerrain.ts`'s `terrainExclusions` for the Downs — reusing the exact mechanism that already keeps the
  natural pond unpathable, not a new one — with a matching dev-mode assertion confirming the exclusion is
  actually present (checked live: fires zero warnings across every session; manually removing the entry to
  test confirms the check is real, not a no-op). `downs.ts`'s own now-obsolete "outside the grid" assertion
  was removed and its header rewritten to point at the real replacement guarantee, catching two numbers in
  the same paragraph that had already gone stale from Wave 17 #4 (`landHalf`/dig-reach) along the way.
  **Honest scope, stated plainly rather than overclaimed**: AI agents never get the player's own
  `ROAD_SPEED_MULT` (`Locomotion.ts` has no `onRoad` check) and a beeline is already close to the shortest
  distance to these grounds, so this fix does not make trips *faster* — the real win is a villager that
  visibly follows the actual printed road and gets real obstacle avoidance for the whole trip instead of
  none, not a speed change. It also does not touch the separate, already-named Wave 10 "AI trip-time
  balance" pacing gap (the legacy job-timer budget vs. real walk time at these distances) — deliberately
  left as its own item rather than silently folded in. **Verified live with a genuine controlled A/B test**:
  temporarily reverted just the grid width, captured a real trajectory to the actual live-seeded quarry
  node — a mathematically perfect straight line (slope constant to 3 significant figures across 9 samples,
  `onRoad` false at all 15 samples checked) — then restored the fix and reproduced a genuinely different,
  road-following trajectory in two independent sessions (`onRoad` true for 3 consecutive samples exactly
  where the path crosses the real printed road leg); a forced retarget to the single farthest real node
  (184m out) completed without stalling, correctly crossing onto the real road partway through; a close
  ground well inside the old grid showed zero behavior change (full gather→haul cycle, unaffected as
  expected); zero console/page errors across every session.
- [COMPLETE] ✅ **Template-world scale (0.75x) + named court NPCs no longer duplicated by a frozen
  background copy — FIXED 2026-08-19 (last of the six).** Two independent halves.
  **(a) Scale:** the literal ask ("multiply `TEMPLATE_WORLD_SCALE` by 0.75") turned out to be the wrong
  target — that constant (`TemplateWorld.tsx`) also backs template-09's homestead terrain and all 6
  challenge maps, neither of which were reported as wrong, and the file's own comment already calls
  rescaling the homestead "a much bigger and riskier change than what was actually asked for." The real
  target is `worlds.ts`'s `DEST_WORLD_SCALE` — the separately-hand-copied literal that actually backs
  only the 8 real travel destinations (template-01..08) — scaled `0.32 × 1.25` → `0.32 × 1.25 × 0.75`
  (0.4 → 0.3), with each destination's `radius` scaled by the same 0.75 in lockstep (matching this exact
  file's own precedent from its prior 2x→1.25x bump: "keep the walkable fraction of each diorama
  constant"). Every other consumer checked and confirmed self-adjusting with no code change needed
  (`PlayerController.tsx`'s wander clamp, `Minimap.tsx`, `gameStore.ts`'s arrival spawn point, and
  `TemplatePopulation.tsx`'s own `scaleCompensation` ratio, which recomputes automatically). **Verified
  live, not just by reading source**: independently recomputed `normalizeTemplateBake`'s real bbox/offset
  math from the actual `.glb` bytes on disk at the new scale and matched it against
  `window.__kkworld.getBakeOffset()` read live in-browser to 3+ decimal places on 4 separate destinations
  — proof the running server truly applies the new scale end-to-end, not merely that the source changed;
  separately, teleporting the player 600 units out and letting the real wander clamp run pulled them back
  to exactly the new radius (210.00 on template-01), not the old one.
  **(b) Named characters:** confirmed two systems already existed and didn't talk to each other — the six
  interactive `NpcDef`s (`npcs.ts`, real dialogue/quests) at hand-picked coordinates, and
  `TemplatePopulation.tsx`'s own decorative `actor`/`cast` rows rendering the same identities (by donor
  family) from the categorized map data, frozen in one rest pose. The originally-confirmed design (see
  Wave 17's own plan section) was to move the live NpcDef to that categorized-data position — **this
  turned out not to be implementable as asked, confirmed by loading the real `.glb` bakes and computing
  actual world positions, not estimated**: every matched row, for every one of the five identifiable
  characters (King Leo, Queen Leonora, Richard, John, Storm), on every template it appears on, resolves
  thousands of units from that destination's origin — deep in unreachable background terrain, corroborated
  by this same file's own pre-existing comment about King Leo's procession-figure marker. Moving any live
  NPC there would have made them permanently unreachable, a regression dressed as the requested fix.
  Fenwick has no data row at all (`mapPopulation.generated.json` has no `template-08` key), so he was never
  in scope for this half. **What actually shipped instead, delivering the same real intent** (one real,
  animated character per identity, not a frozen embedded stand-in): all 6 `NpcDef` positions were left
  exactly where they already sensibly stood, and a `NAMED_COURT_FAMILIES` skip filter was added to
  `TemplatePopulation.tsx` so the decorative duplicate for each of the five is no longer spawned at all
  (Fenwick needs no filter — no row exists to remove). Separately discovered mid-investigation: **the "give
  them real ambient animation" half of the original ask was already shipped** on 2026-08-03, unrelated to
  this wave — `courtAmbientSync.ts` already spawns a real `'court'`-archetype AI agent
  (`idle_fidget`/`notice_player`) for exactly these five, so no animation wiring was needed here. **Verified
  live across 4 of the 6 affected destinations**: all 5 tested NPCs' live positions matched their unchanged
  `NpcDef` coordinates exactly (confirming they were correctly left in place, not moved into the ruled-out
  coordinates); every named-family decorative row present in the real map data was confirmed skipped at
  render time while every non-named row (generic villagers, Cedric, Weezil, Gilbert) on the same maps still
  rendered, a clean partition with zero collateral regression; each NPC's live animation clip read off
  `window.__kknpcs` showed a genuine non-default AI-driven pose (not a frozen rest pose) sustained across a
  13-second sampling window; talking to each NPC still opened the correct dialogue; Wave 14's own POI
  waypoint teleport still landed the player at the exact correct offset from each NPC's position. Zero
  console/page errors across the full run. `npx tsc --noEmit` / `npm run build`: both clean.

## Wave 18 — NPC visibility, trip distance, real topo map, tree orientation, and scene isolation, found live 2026-08-19

Five new items reported immediately after Wave 17 shipped in full. Investigated by three parallel
research passes plus a dedicated design pass for the largest item (scene isolation); two direct
clarifying questions asked and answered before finalizing scope — see the plan file's own "Wave 18"
section for full detail.

- [COMPLETE] ✅ **NPCs at destinations disappear exactly when the player looks at them — FIXED
  2026-08-19.** Root cause confirmed precisely: this project's rigged characters have no
  `SkinnedMesh`/bone-skinning at all, so a stale-bind-pose-bounding-sphere bug was ruled out; the real
  mechanism was a custom LOD visibility gate (`RiggedFigure.tsx`'s `characterLodDistance`, Performance
  graphics tier only, cutoff 60) measured against `camera.position` — but the third-person chase
  camera orbits the player on a ~4.6-unit boom arm that trails whatever direction the player currently
  faces, so turning to look at a fixed point swings the camera to the FAR side of the player relative
  to it, changing the measured camera-to-target distance by up to ~9.2 units purely from turning.
  Destination radii (200+ units) put NPCs near the 60-unit mark often enough that this swing crossed
  the cutoff exactly when centered in view — matching the reported symptom precisely. Fixed by
  measuring the LOD distance against `playerState.x/y/z` (the player's real, camera-independent body
  position, already written every frame from `pos.current`) instead of `camera.position`, and by
  adding a new `lodExempt` prop that fully bypasses the cutoff for every interactive, quest-giving
  court NPC (`Npc.tsx`'s `CourtNpc`, unconditionally — every `NpcDef` has mandatory `lines`/
  `sideQuests`, so all of them qualify) — a real NPC with dialogue should never be culled into
  unreachability by an optimization meant for ambient crowds. **Verified live with a genuine
  root-cause regression test**: teleported the player to a FIXED, exact 55.0 units from a real ambient
  NPC (confirmed not `lodExempt`) and physically turned the third-person camera through ~7 radians via
  real pointer-locked mouse input across 16 samples — player-measured distance stayed exactly 55.00
  throughout (proving the fix removes the oscillation at its source) while camera-position-measured
  distance swung 50.49–59.57 (~9.1 units, matching the diagnosed ~9.2u max almost exactly, coming
  within 0.43 units of crossing the old cutoff from turning alone) — and the NPC's visibility never
  flickered. Separately confirmed the LOD cutoff still functions normally for non-exempt ambient
  figures (visible at 55u, culled at 65u — the fix didn't disable LOD globally) and that `lodExempt`
  is scoped to exactly the interactive-NPC render path (grepped all 8 other `RiggedFigure` call sites,
  zero matches). Zero console/page errors across every test session. `npx tsc --noEmit` / `npm run
  build`: both clean.

- [COMPLETE] ✅ **Trip distance across a template destination was too large — FIXED 2026-08-19.**
  Confirmed via direct user Q&A that the complaint is roaming/trip distance, not visual object scale
  — `DEST_WORLD_SCALE` (`worlds.ts`, retuned in Wave 17 #5) stays untouched. The real lever is each
  destination's `radius`, the walkable-circle bound `PlayerController.tsx`'s wander clamp enforces —
  a separate, hand-typed number per destination, never derived from `worldScale`. At the confirmed
  4 units/sec walk speed, template-01's old radius (210) meant 105 seconds to cross the full diameter
  on foot. Cut every destination's radius by this file's own established 0.5x default step — but only
  after computing, per destination, the real straight-line distance from `dest.origin` to every real
  NPC/guild-hall/boss-camp coordinate that must stay reachable (`npcs.ts`, `guilds.ts`'s `hallX`/
  `hallZ`, `world.ts`'s `CEDRIC_CAMP`/`BATTLE_DOME`) — not guessed. Five of eight destinations (every
  guild-hall-bound one: 02/03/04/07/08) would have walled off their own hall under a flat 0.5x, so
  those instead use `hallDistance × 1.15`, reusing this same file's existing "+15% margin" convention
  from `CHALLENGE_DESTINATIONS`, rounded to the file's `.5` precision so the real floor is never
  undershot. template-01/05/06 cleared a flat 0.5x with comfortable margin. Claimed-plot flags were
  deliberately excluded from the floor — they center on wherever the player was standing when they
  claimed, so they can never be an external floor a smaller radius walls off. Final radii: template-01
  210→105, -02 229.5→134.5, -03 214.5→128, -04 274.5→159.5, -05 235.5→117.75, -06 210→105, -07
  235.5→134.5, -08 199.5→114. **Verified live end to end**: independently recomputed every cited
  NPC/hall/camp distance by hand from the live source files and found zero discrepancies; started a
  real dev server and drove real headless Chrome through actual gameplay — for all 8 destinations,
  called the real `travelTo()` action and confirmed the landing distance, then forced a teleport past
  the OLD radius and confirmed the live wander-clamp snapped the player back to exactly the NEW radius
  (e.g. template-04: clamp distance 159.5, matching exactly); grepped the compiled `.next` production
  bundle and confirmed the new radius literals actually ship in the client output, not just the source.
  Zero console/page errors across the full run. `npx tsc --noEmit` / `npm run build`: both clean.

- [COMPLETE] ✅ **Destination minimap now shows real topographic elevation instead of a plain circle —
  FIXED 2026-08-19.** The minimap drew exactly one thing for a destination's shape: a stroked circle of
  radius `dest.radius`, zero terrain information. Real per-location elevation data already existed at
  runtime (`TemplateWorld.tsx`'s `sampleTemplateGroundY`, a raycast-based ground probe against the
  actual mounted bake), and the home world's own North Downs hill already used the exact rendering
  technique needed — a sampled-grid height raster shaded by alpha, precisely a topographic-map
  technique. Extended that same approach (`src/components/hud/Minimap.tsx` — the real file location;
  the initial task description named a `world/` path that turned out to be stale) to each destination's
  own circular radius, swapping the Downs' analytic `downsSurfaceY` for a live `sampleTemplateGroundY`
  raycast, guarded to only sample the destination actually mounted right now
  (`getMountedRegion() === st.destination`) so a brief post-travel transition frame never paints a
  stale or wrong bake's terrain under the circle. **Live verification caught a real performance
  regression before shipping**: the first pass re-raycasted all ~380 surviving grid cells on every
  ~180ms minimap draw tick, forever, for as long as the player remained at a destination — measured
  255-511ms of synchronous main-thread work per pass at the heaviest destination (42,175 triangles),
  severe enough that a real 90-frame sampling test timed out after 60 seconds at that destination while
  completing quickly at home under identical conditions. Fixed by caching the raster grid keyed on the
  mounted destination id, recomputing only when a real new mount actually occurs — a static bake never
  needs re-sampling every tick. **Verified with a genuine controlled A/B test**: temporarily forced
  always-recompute and reproduced the exact regression (avg 221.7ms/frame, matching the original
  255-511ms range); restored the cached fix and reran identically — avg 16.6ms/frame, pure vsync, zero
  stutter. Confirmed the elevation raster is correct once cached (real varying heights per destination,
  distinct shape between destinations, home's own Downs branch unaffected) and the mount-mismatch guard
  correctly protects the brief stale-mesh transition window (captured live and unforced). Zero
  console/page errors throughout. `npx tsc --noEmit` / `npm run build`: both clean.

- [COMPLETE] ✅ **Enemies never filtered by world/destination — FIXED 2026-08-19 (Stage 0a of the
  scene-isolation rearchitecture).** `Enemies.tsx` never filtered its render list by world at all,
  unlike every other content type in this codebase (`Buildings.tsx`, `ResourceNodes.tsx`,
  `Villagers.tsx`, `Npc.tsx` all already apply the same `(x.world ?? null) === (destination ?? null)`
  pattern — the established "instance-separation doctrine"). A home raid kept rendering — and being
  fought — at whatever destination the player traveled to mid-fight, and dungeon/arena/Cedric-camp
  spawns bled into every other world too. Fixed by adding a required `world: string | null` field to
  `EnemyData` (`combat.ts`), stamped at spawn time from the player's actual destination when `spawn()`
  runs (every existing spawn call site already gates on being in the right place first, so this is
  always correct at the moment of stamping), and filtering both of `Enemies.tsx`'s render passes on
  it — closing the one gap where the established doctrine was missing, not inventing a new mechanism.
  This is Stage 0a of the larger, separately-staged scene-isolation rearchitecture — a small,
  standalone, independently-shippable piece of it; see the plan file's Wave 18 §5 for the full staged
  sequence. **Verified live end to end**: spawned a real home enemy (`world: null`), traveled to a
  destination mid-fight and confirmed it stopped rendering while remaining fully intact in the store
  (a render filter, not a despawn — the enemy's hitbox lifecycle, an authoritative "is this actually
  rendered" signal, confirmed this precisely); entered the dungeon and confirmed all 5 room-spawned
  enemies (`world: "dungeon"`) rendered correctly there while the home enemy stayed hidden; returned
  home and confirmed the home enemy rendered again while none of the 5 dungeon enemies bled through —
  persistence-without-rendering verified in both directions. Zero console/page errors throughout.
  `npx tsc --noEmit` / `npm run build`: both clean.

- [COMPLETE] ✅ **Destination GLB bakes never released from memory — FIXED 2026-08-19 (Stage 0b of the
  scene-isolation rearchitecture).** drei's GLTF cache is a module-level `Map` keyed by URL, and no
  `useGLTF.clear()` call existed anywhere in `src/` — every destination bake visited in a session
  stayed resident in JS/GPU memory permanently, even long after leaving it. `TemplateWorldRoot`
  already had real unmount-on-destination-change plumbing (`key={dest.id}` forcing a genuine remount,
  a destId-keyed effect clearing the `mountedRoot`/`mountedRegion` singletons) — fixed by hooking
  `useGLTF.clear(dest.model)` into that existing cleanup rather than building new unmount logic.
  Confirmed via three.js source before writing anything that `normalizeTemplateBake`'s
  `scene.clone(true)` shares geometry/material by reference with the cached original, so by the time
  this cleanup runs nothing in the app still references the destination's scene graph —
  `useGLTF.clear()` alone is sufficient and safe; no manual `.dispose()` was added given the real risk
  of corrupting a still-shared resource if the reference-sharing assumption were ever wrong.
  **Verified live with a real before/after A/B** (real network requests + post-GC JS heap
  measurements, not estimates): with the fix, revisiting a left destination fires a fresh fetch
  (confirming the cache entry is genuinely evicted) and heap growth plateaus once distinct content
  stops arriving (+5.33MB across 5 destinations plus 2 revisits); with the fix temporarily disabled,
  zero new requests fire on revisit and heap growth is monotonic and never stops (+8.62MB, still
  climbing at the end of the same test). Revisit-after-clear renders correctly with zero regression
  (verified terrain, geometry, NPC population, and prompts all correct; zero console errors). **A
  real trade-off found and documented honestly, not glossed over**: since no `.dispose()` runs, a
  player who repeatedly revisits the SAME destination now re-parses fresh GPU resources on every
  revisit rather than reusing the old cache hit (confirmed via `renderer.info.memory`: geometry/
  texture counts climbed ~70/~46 on 2 repeat visits with the fix, versus near-zero without it) —
  not a correctness bug, nothing renders wrong or crashes, but a real memory-footprint trade-off
  worth a `.dispose()` follow-up if repeat-revisit memory ever becomes the actual bottleneck. This
  fix correctly solves the reported problem (many distinct destinations pinned in memory forever for
  the rest of a session), which is the scenario that actually grows without bound. `npx tsc --noEmit`
  / `npm run build`: both clean.

**Stage 0 of the scene-isolation rearchitecture (Wave 18 #4 + #5) is complete.** Stage 1 (the
template-01 proof of concept for real destination-scoped mount/unmount) is next per the plan file's
own staged sequence.

- [PARTIAL] ✅ **Upside-down trees at some template destinations — template-03 FIXED 2026-08-20;
  template-01/-05/-06 identified but deliberately left unfixed.** Confirmed by prior investigation
  this couldn't be a per-asset name lookup (baked mesh nodes carry generic, material-split names with
  zero semantic identity) — needed a live visual/geometric identification pass instead, which took
  three attempts to land cleanly (two prior attempts were cut short by session limits/a machine
  restart mid-investigation, not by the problem itself). The third pass confirmed the real cause on
  `template-03` (The River Landing): mesh nodes `mesh_0_27`/`mesh_0_31` — a decorative conifer/topiary
  row along the riverbank — ship with inverted canopy geometry AT THE SOURCE, independent of and
  invisible to the existing whole-bake `flipY` correction (which mirrors the entire scene uniformly
  and can't selectively re-flip one already-wrong submesh back). Confirmed live, not guessed: raycast
  from the actual camera through the on-screen inverted canopies (bulging at the top, tapering to a
  point at the ground, a bare stem poking into open air) resolved to exactly these two mesh nodes;
  mirroring each mesh's own local geometry 180° about its own bounding-box center turned every tree in
  the row into an ordinary right-side-up shape, confirmed with before/after screenshots through a
  fresh page load exercising the real persisted code path. Fixed via a new
  `destinationId → meshIndex[]` lookup (`TREE_MESH_ORIENTATION_FIX`, `TemplateWorld.tsx`) applied to
  the cloned scene before the outer scale/flipY transform, since it mutates each target mesh's own
  local geometry independent of the outer transform — populated with only the one confirmed entry.
  **Honestly left unfixed, not silently dropped**: the identical inverted-canopy defect is also
  visible via screenshot on `template-01`, `template-05`, and `template-06`, which reuse a
  near-identical asset — raycast-confirmed their mesh nodes too, but the equivalent live fix there had
  an unexplained side effect (the whole row went invisible instead of correcting) that wasn't
  root-caused within a reasonable investigation budget. Rather than ship an unverified guess, those
  three were deliberately left out of the fix map; the code comment documents the diagnostic approach
  (live raycast + before/after screenshot) that worked for template-03, for whoever picks this up next
  — the mesh indexes will NOT simply transfer, each needs its own fresh confirmation pass. Verified:
  revisited all 9 destinations after the fix, zero console/page errors; `template-01` (same asset
  family, untouched by this specific fix) renders identically to before, confirming no collateral
  damage from the new correction step. `npx tsc --noEmit` / `npm run build`: both clean.

## Wave 18 item #5, Stage 1 — scene-isolation proof of concept on template-01, 2026-08-20

Stage 0 (Wave 18 #4/#5 above) shipped the two independent bugfixes. This is the real
architecture pilot: a genuine destination-scoped mount/unmount boundary, proven on exactly one
destination before any wider rollout.

- [COMPLETE] ✅ **Destination-scoped mount/unmount boundary (`DestinationScope`) built and proven
  on template-01 — SHIPPED 2026-08-20.** Per the confirmed design (plan file's Wave 18 §5): NOT
  literal separate `THREE.Scene` objects — a disciplined, `SCOPED_DESTINATIONS`-gated boundary
  that completes the existing "Phase 23 instance-separation doctrine," with stored coordinates
  staying absolute and only the final render write gaining a `- dest.origin.x/z` subtraction.
  New `DestinationScope.tsx` mounts as a sibling of `TemplateWorld` in `GameWorld.tsx` (not
  nested inside it — `TemplateWorld.tsx` already exports `destinationGroundY` to `Npc.tsx`, so
  nesting a court-NPC-rendering piece back inside `TemplateWorld.tsx` would create a circular
  import; two sibling groups at an identical `dest.origin` transform are functionally
  indistinguishable to Three.js). A new `SCOPED_DESTINATIONS` set (`worlds.ts`, containing only
  `'template-01'` for this pilot) is the single shared predicate every carve-out reads, so there
  is exactly one place scope can ever drift. `Buildings.tsx`, `Npc.tsx`, `TemplatePopulation.tsx`,
  and `CourtDressing.tsx` each gained a new `Destination*` export (same content/interaction logic
  as their existing default export, restricted to one destination, rendered with an
  `originOffset` prop defaulting to `{x:0,z:0}` so every non-scoped call site — home, templates
  02-08/09, dungeon, arena, all 6 challenges — is byte-for-byte unchanged) and one small exclusion
  in their default export so scoped content stops double-rendering there. A real, non-obvious
  catch made independently during implementation: `Buildings.tsx`'s `CartMesh` has a SECOND
  absolute-position write (`cartLivePos`, the live-drag override while a cart is being pushed)
  that the original plan didn't name — left unfixed, a cart built at a scoped destination would
  have snapped back to its double-offset spot the instant the player nudged it; caught and fixed
  with the same `originOffset` treatment. **Verified live, thoroughly, not just by reading code**:
  real `travelTo('template-01')` confirmed King/Queen render at their exact absolute world
  positions via scene-graph ground truth, explicitly ruling out both failure shapes (origin
  applied twice, origin never applied — zero hits for either); a built campfire and a live-dragged
  cart both confirmed at the correct offset spot with zero hits at either bug-shape coordinate;
  the real King's-court ceremony ran end to end from a cold `returnHome()` state; **the GLTF cache
  release from Stage 0b was confirmed to still fire correctly through the new sibling boundary
  via real network request counts** (not inference — the same `template-01.glb` URL was
  re-fetched on every fresh mount cycle, proving no stale cache short-circuit); scene-graph root
  object counts confirmed a genuine unmount (drops to exactly 0 on `returnHome()`) and clean
  remount (reappears exactly once, not duplicated) across 3 full visit cycles; cross-contamination
  checked in both directions by alternating template-01 ↔ template-02 (the old, unscoped path) —
  zero bleed-through either way; confirmed no villager or enemy exists at template-01 today (so
  Stage 0a's persistent-state carve-out reasoning had nothing further to apply here), and the
  King's AI agent correctly despawns on leaving and resyncs cleanly on return, independent of and
  unaffected by the new render nesting. Zero console/page errors across the entire session.
  `npx tsc --noEmit` / `npm run build`: both clean. **Explicitly out of scope for this stage,
  named not silently dropped**: `key={destId}` was deliberately NOT added to `TemplateWorldRoot`
  itself (that would change the mount lifecycle for all 16 destinations at once, including the 15
  this stage promises to leave completely untouched — revisit in Stage 2, when the pattern
  generalizes to every destination together). **Stage 1 of the scene-isolation rearchitecture is
  complete.** Stage 2 (generalize to templates 02-08) is next per the plan file's own staged
  sequence.

## Real terrain-derived destination boundaries, replacing the artificial wander circle — 2026-08-21

The player-reported "I hate being cut off by this circle" complaint, plus the explicit follow-up
that the minimap should show a destination's real topography rather than being cropped to a
circle too. Root cause of the original circle: `dest.radius` (a hand-picked pacing number, see
Wave 18 #2 above) was never meant to track real geometry, so it inevitably felt arbitrary against
dioramas that vary wildly in real shape and size.

- [COMPLETE] ✅ **The wander boundary and the topographic minimap now both use real,
  human-labeled terrain data instead of a circle — SHIPPED 2026-08-21.** A separate, earlier
  Blender/Grok asset pipeline (`D:\...\grok\blender\movie\07082026`, see
  `[[project_grok_pipeline_import]]`) already per-mesh-labeled every template map's terrain into
  named groups (`terrain_mounds`, `terrain_mountain_L`, `flat_green_a`, etc.) with real 3D
  bounding boxes — only a filtered subset of that data (asset-bearing "new content" groups) was
  ever imported into the game before; the terrain classification itself was left on the table.
  **Classification pass**: read every terrain-kind group across all 9 templates, classified each
  as real walkable content vs. distant unclimbable backdrop/rim using both the group's own label
  and real geometric signals (footprint-area-fraction and height-fraction of the whole map, and
  whether the bbox touches a map edge) — not a naive name-substring rule, since naming is
  genuinely inconsistent across templates (e.g. template-07 "The Frozen Pass" has 8 different
  "mountain"/"mountain_snow"-labeled groups, most of which are real walkable snow terrain, not
  backdrop, unlike template-01's clean 4-sided rim pattern). Every group the geometric heuristic
  left ambiguous was checked live: flew the camera (`setPhotoMode` fly-out) to the group's real
  transformed world position and screenshotted it — confirmed the pattern held repeatedly (every
  backdrop candidate showed a dramatic textured mountain wall; every walkable-core candidate
  showed flat, human-scaled ground with real props/NPCs standing on it). Reused the exact,
  already-proven lab→world coordinate transform from the original Grok import work
  (`LAB_METERS_TO_WORLD = 320`, `scripts/prepare-assets.mjs`) so this new data is byte-for-byte
  consistent with the existing `mapPopulation.generated.json` convention. New generation script
  `scripts/generate-walkable-footprint.mjs` (gitignored, matching this project's established
  asset-pipeline convention) writes the committed `src/game/data/templateWalkableFootprint
  .generated.json` — real per-template walkable-rect unions ranging from 1 rect (template-04,
  template-09) to 15 (template-08). New leaf module `templateWalkableFootprint.ts` resolves those
  bake-local rects into live world space at read time (`dest.origin` + `scaleCompensation` + the
  live async `getBakeOffset()` — never baked in ahead of time, since a destination's `worldScale`
  can override the base and the bake's real recentring offset isn't final until the GLB loads).
  **`PlayerController.tsx`'s wander clamp** now resolves the player's candidate position against
  the nearest point in the real rect union (a plain per-axis AABB clamp reduction — the exact
  generalization of "project onto the circle" to multiple rects) instead of a circular distance
  check, unioning in the player's own claimed-plot footprint too (so an existing claim can never
  be fenced off by the new terrain-derived bound) — with a full, byte-for-byte fallback to the
  original circular clamp for any destination with no classified data yet (challenges, dungeon,
  arena). **`Minimap.tsx`**'s topographic raster (Wave 18 #3) now covers the destination's real
  measured bounding-box extent (`THREE.Box3.setFromObject(getMountedRoot())`), not a circular
  crop — showing the full real topography including unreachable backdrop terrain, exactly as
  asked, since a smaller "walkable-only" crop would have just traded one artificial cutoff for a
  different one. The walkable-rects union is drawn as its own overlay (one `strokeRect` per real
  rect) so the player still sees exactly where they can walk, layered over the fuller terrain
  picture. Cell count now scales with the real bounding box's aspect ratio while holding the same
  proven-cheap ~484-cell budget the Wave 18 #3 performance fix already established, so a larger or
  more elongated destination's one-time post-travel sampling pass never reintroduces that
  regression. **`TemplateWorld.tsx`'s ground-filler disc** is now sized from the real rects'
  circumscribing radius each frame (rescaling a reused unit-circle mesh, not reallocating
  geometry) instead of `dest.radius + 4`, with the same fallback for unclassified destinations.
  **`gameStore.ts`'s `travelTo()` arrival spawn** now uses a new hardcoded `TEMPLATE_ARRIVAL_SPAWN`
  table (`worlds.ts`) instead of the old `dest.radius`-derived formula.
  **A real, severe blocker caught by verify and properly root-caused by the fix pass, not
  papered over**: the first implementation flung every waypoint-to-resident-NPC teleport (King,
  Queen, Richard, John, Storm, Fenwick — all 6) 441 to 1967 world units away from the intended
  NPC. Root cause: 5 terrain groups across 5 templates had been misclassified as backdrop when
  they were actually the base ground the walkable "core" patches physically sit on (confirmed via
  live raycasts showing all 6 residents stand on real, naturally-varying mesh terrain, and via
  structural bbox-nesting proof that the "core" groups are literally contained inside the
  wrongly-excluded ones) — re-classified correctly, plus two small live-measured supplemental
  rects for two residents whose reported bbox undercounted their real standable ground. Also
  added a permanent claim-footprint guard (independent of the classification data, since a
  player's claim position is only known at claim time) so an existing save's claimed plot can
  never be fenced off by this change. **Re-verified after the fix**: all 6 residents land at
  exactly 0.00 distance from their target; a simulated worst-case existing claim (template-04,
  3451 units outside the old circular bound) now lands exactly on the claim; general wandering
  across all 9 templates remains real-terrain-bounded (1198–2789 units per destination, matching
  each bake's actual size — not unbounded); zero console/page errors throughout. Every real
  walkable footprint is dramatically larger than the circle it replaced (e.g. template-01's old
  210-unit diameter vs. its real walkable union now spanning up to ~1837 units on one axis) —
  confirms the artificial clamp really was cutting players off from most of the real terrain, not
  just adding a cosmetic wall. `npx tsc --noEmit` / `npm run build`: both clean. **Honest
  residual, not chased further**: `template-01`'s `terrain_steep` group and two of `template-07`'s
  eight mountain-labeled groups (`mountain_c`, `mountain_snow_a`) were classified on the geometric
  heuristic alone after a live visual check came back genuinely inconclusive (raycast-confirmed
  real geometry but no clear vantage to see it from) — flagged explicitly in the classification
  data for a closer look if a player ever reports being walled off near those specific spots.
  `template-04`/`-05`/`-07`'s classification has no resident-NPC ground-truth to ­verify against
  the way template-01/-02/-03/-06/-08 did, so the permanent claim-footprint guard added during the
  fix pass is the real safety net for those, not a claim of equal certainty across every template.

## Wave 18 item #5, Stage 2 — scene-isolation rollout to templates 02-08, 2026-08-21

Stage 1 proved the destination-scoped mount/unmount boundary on template-01 alone. This
generalizes it to all 8 real travel destinations, per the plan's own staged sequence.

- [COMPLETE] ✅ **`SCOPED_DESTINATIONS` grown to templates 01-08, one real regression found and
  fixed before it could ship — SHIPPED 2026-08-21.** The one-line change (`worlds.ts`) was
  mechanical since Stage 1 built the generic infrastructure — `Buildings.tsx`/`Npc.tsx`/
  `TemplatePopulation.tsx`'s `Destination*` exports already filter purely on `dest.id`/
  `Set.has()`, with zero hardcoded per-template strings, confirmed by reading all three in full.
  **One real gap found in research and fixed before implementation, not discovered live**:
  `CourtDressing.tsx`'s `SCOPED_DESTINATIONS` early-return in the default export runs *before*
  its `template-02`/`template-03` special cases (`TourneyLists`/`RiverCargo`) — scoping those two
  destinations would have silently killed both with nothing picking up the slack, since
  `DestinationCourtDressing` only handled `template-01`. Fixed by threading the same
  `originOffset` convention through `TourneyLists`/`RiverCargo` (matching `RoyalCourt`'s existing
  pattern) and extending `DestinationCourtDressing` to cover all three; the now-unreachable
  branches were pruned from the default export (now a documented inert no-op), matching this
  file's own established precedent from Stage 1. Confirmed via full-codebase grep that guild
  halls, Cedric's camp, and the Battle Dome (`GuildHalls.tsx`/`CedricCamp.tsx`/`BattleDome.tsx`)
  are separate, always-mounted, self-gated siblings that never import `SCOPED_DESTINATIONS` and
  are structurally unaffected by this change — not assumed, verified live too. **Verified live,
  individually, for every one of the 7 newly-scoped destinations** (not a sample): real
  `travelTo()` + genuine new `.glb` network fetch (not a cache hit) each time;
  `DestinationScope`'s origin-offset group sitting at the exact correct `dest.origin`; real named
  NPCs (Richard/John/Storm/Fenwick) landing at exact correct positions with zero double- or
  missing-offset hits; guild halls/CedricCamp/BattleDome all rendering correctly at their real
  positions, confirmed unaffected; **the exact flagged regression confirmed fixed live** —
  template-02 shows real TourneyLists dressing, template-03 shows real RiverCargo dressing,
  neither silently disappeared; cross-contamination checked at every step (previous destination's
  content confirmed fully gone); a direct destination-to-destination hop (template-02 →
  template-06 → template-03, no intervening `returnHome()`) confirmed zero stale content at each
  landing; `Buildings.tsx`'s generic origin-offset path re-confirmed on template-04 specifically
  (a destination with no named NPC, isolating the check) via a synthetic campfire landing at the
  exact correct position. Stage 1's template-01 pilot reconfirmed unaffected; dungeon and 2
  challenge maps spot-checked and confirmed still on the old, untouched path. Zero console/page
  errors across every live test run. Verify pass: clean, 1 non-issue (template-08 has zero
  population rows — pre-existing, documented, confirmed not a regression from this change), no
  fix pass needed. `npx tsc --noEmit` / `npm run build`: both clean. **Stage 2 of the
  scene-isolation rearchitecture is complete — all 8 real travel destinations now have genuine
  mount/unmount isolation.** Stage 3 (dungeon + arena) is next per the plan's own staged
  sequence.

## Wave 18 item #5, Stage 3 — dungeon + arena, 2026-08-21

**Honest reframe up front**: the plan's original one-line framing for this stage
("procedurally generated, not baked — same mount/unmount discipline") turned out not to
transfer cleanly once investigated. Dungeon and arena were never on the `TemplateWorld`/
`DestinationScope` boundary Stages 1-2 built — they're rendered via special-cased branches
inside `TemplateWorldRoot` that predate this whole rearchitecture, and that scene-graph
mount/unmount was already confirmed adequate (verified live: `enterDungeon()`/`enterArena()`
can only fire when `destination` is already falsy, so every real entry already goes through a
full unmount/remount of the whole tree; neither has a real GLB bake, so Stage 0b's cache-release
fix correctly doesn't apply). Extending `SCOPED_DESTINATIONS` to include them would have been a
confirmed no-op — no `Buildings`/`NpcDef`/`TemplatePopulation`/`CourtDressing` content is tagged
`world: 'dungeon'` or `'arena'` anywhere. Rather than manufacture busywork to match the plan's
literal wording, the research pass looked one layer down — the same place Stage 0a/0b's own
precedent points (ephemeral state that outlives a naive unmount because it lives in a leaf
module or separate store) — and found real, previously-unknown, user-facing bugs there instead.

- [COMPLETE] ✅ **Two real state-leak bugs found and fixed — SHIPPED 2026-08-21.** (1) `arenaState`
  was only ever reset on death (`endArenaRun()`'s one call site, `combat.ts`'s knockout branch) —
  the ordinary "Return Home" exit every destination offers never touched it, so `ArenaHud.tsx`
  (which polls `arenaState.active`/`env` directly, with no `destination` linkage of its own) left
  the "⚔️ [environment] — N kills" badge stuck on screen indefinitely after any voluntary
  walk-out, until the player either died once or reloaded the page. (2) Neither dungeon- nor
  arena-spawned enemies were ever removed from `useEnemyStore` on a voluntary exit — and arena
  enemies were never removed on *any* exit path, since the death handler's arena branch
  early-returns before reaching the general knockout code's unscoped `clear()`. Two concrete,
  reproducible failure modes this caused: abandoning a partially-cleared dungeon descent left a
  frozen leftover enemy that reappeared in the *next*, differently-generated layout (rooms are
  renumbered from 0 every descent, so the stale `dungeonRoom` index collides) and permanently
  blocked that room from ever registering cleared — silently costing the whole descent's reward
  if it was the last room; and since the arena is explicitly an endless mode players leave with
  enemies still alive, survivors accumulated in the store release-over-release with zero cap,
  eventually starving `ArenaSpawner.tsx`'s global `MAX_TARGET` count and permanently breaking
  monster spawning in *every future* arena session — a real, escalating regression reachable from
  ordinary repeated play, not an edge case. **Fix**: a new scoped `removeByWorld(world)` action on
  `useEnemyStore` (`combat.ts`), wired via a `useGameStore.subscribe()` sibling to the file's
  existing `maxStamina` subscriber — tracking `destination` in a closure and firing whenever it
  transitions away from `'dungeon'`/`'arena'`, rather than patching each exit call site
  individually (this codebase's own documented precedent: a direct `gameStore.ts` → `combat.ts`
  import would create a fresh cycle with the reverse edge that already exists, the same landmine
  `Perception.ts`'s own header and `AgentManager.ts` already flag). This also means the fix covers
  every current and future exit path automatically, not just the two known today. Plus an
  unconditional `endArenaRun()` call added to `returnHome()` beside the existing `resetDungeon()`,
  fixing the stuck-badge bug directly. **Verified live, both exact bug scenarios reproduced and
  confirmed fixed**: left the dungeon via `returnHome()` while still alive with combat rooms
  uncleared — enemies correctly removed from the store; re-entered — genuinely fresh, differently-
  shaped layout with zero stale cleared rooms or frozen leftover enemies. Left the arena via
  `returnHome()` with survivors alive — `arenaState` correctly reset (fixing the stuck HUD) and
  survivors correctly removed from the store; re-entered with a different environment — kills
  counter reset, and critically the spawner immediately produced fresh enemies rather than being
  starved by leftover ghosts from the previous session. Templates 01/05 and a challenge map
  spot-checked and confirmed completely unaffected. Zero console/page errors throughout. `npx tsc
  --noEmit` / `npm run build`: both clean. No changes to `TemplateWorld.tsx`, `DungeonScene.tsx`,
  `ArenaScene.tsx`, or `SCOPED_DESTINATIONS` — confirmed none were needed. **Stage 3 of the
  scene-isolation rearchitecture is complete.** Stage 4 (the 6 challenge maps) is next and last,
  per the plan's own staged sequence.

## Wave 18 item #5, Stage 4 (FINAL) — the 6 challenge maps, 2026-08-21

Unlike Stage 3, the plan's literal framing *did* transfer here — but the research still verified
that directly rather than assuming it from the template-02-08 precedent, and correctly found the
real answer was more nuanced than a blind copy of Stage 2.

- [COMPLETE] ✅ **Challenge grounds added to `SCOPED_DESTINATIONS`; a real, previously-unclosed
  gap fixed — SHIPPED 2026-08-21.** Two things distinguish challenge grounds from dungeon/arena
  (Stage 3), confirmed live, not assumed: they render through the exact same generic
  `TemplateWorldRoot` branch templates 01-08 use (real baked `.glb`s, not the dungeon/arena
  special-case), and — unlike dungeon/arena, which are structurally unclaimable —
  `ClaimBanner.tsx` excludes only `'dungeon'`/`'arena'`, so a challenge ground can genuinely be
  claimed and built on today via the exact same flow as any template. That meant a real gap
  existed: `Buildings.tsx`'s default export was rendering any building placed on a claimed
  challenge ground through the flat/absolute path (since `challenge-N` wasn't in
  `SCOPED_DESTINATIONS`) — the same pre-Stage-2 shape templates 02-08 used to have. Fixed by
  adding all 6 challenge ids to `SCOPED_DESTINATIONS` (`worlds.ts`) — mechanical, since
  `DestinationBuildings`/`BuildingMesh`/`ConstructionSite`/`CartMesh` were already fully generic
  on `dest.id`/`dest.origin` from Stage 2's own work. **Also investigated and correctly ruled
  out** the other suspect: `buildChallenge.ts`'s own header explicitly groups it with
  `arenaState` as the same "ephemeral leaf-module run state" pattern Stage 3 found a real bug in
  — but confirmed live that its architecture is fundamentally different and safe: `arenaState`
  was *push*-based (reset only from specific call sites, one of which Return Home never called);
  `buildChallengeState` is *poll*-based, re-checking the live `destination` unconditionally every
  frame from `PlayerController.tsx`'s main loop and self-healing to inactive the instant it
  doesn't match, on every exit path (Return Home, knockout, or winning) with no gap — the exact
  opposite shape of the bug Stage 3 found, not the same bug recurring. No code change was needed
  there, and none was made. **Verified live across all 6 challenge grounds individually** (65
  automated checks): real bake rendering, real `claimWorld()` + building placement with
  correct-offset confirmation (ruling out both double-offset and missing-offset failure shapes),
  cross-contamination checks against the immediately-prior destination, real GLTF cache release
  confirmed via network-request counts (not inference) proving a genuine re-fetch on re-entry;
  separately, a real mid-attempt leak test on challenge-1 (the only one with the timed mechanic
  wired up) — started a real timed attempt, left via `returnHome()` mid-attempt, confirmed
  `buildChallengeState.active` self-healed correctly and a fresh second attempt could start
  cleanly. A regression sweep confirmed templates 01/05 and dungeon/arena (Stages 1-3) remain
  completely unaffected. Zero console/page errors across the entire run. `npx tsc --noEmit` /
  `npm run build`: both clean.

**The scene-isolation rearchitecture (Stages 0 through 4) is complete.** Every real,
claimable/buildable destination in the game — all 8 travel templates and all 6 challenge
grounds, 14 in total — now has genuine, structural mount/unmount isolation instead of sharing
one flat, always-mounted render tree. Along the way this effort also found and fixed two
unrelated but real, previously-unknown bugs (Stage 3's dungeon/arena state leaks) that the
original circle-boundary/mount-isolation work would never have surfaced on its own. Stages 5
(gating the ~11 home-only components that still render/tick while the player is away) and 6
(docs cleanup) remain in the plan file as later, explicitly out-of-scope-for-now work — not
started.

## Destination world scale halved — a knowingly-risky, explicitly-confirmed change, 2026-08-21

**Not a default recommendation.** The user asked for the 8 template destinations' visual scale
cut to half its current size. Before implementing, the real consequence was computed and shown
to them directly: at the current scale, the internal human-scale reference in each bake renders
at ~1.62m, already close to the player's own fixed 1.75m height — halving it would drop that
reference to ~0.81m, meaning the player would loom nearly 2x over every building and NPC in
these dioramas, the same category of "broken scale" bug this project's history had already
rejected once before (`TEMPLATE_WORLD_SCALE`'s own 0.06 value, "dollhouse-sized castles," just
in the opposite direction). **The user was told this plainly and confirmed they wanted the full
cut anyway.** Implemented as asked.

- [COMPLETE] ✅ **`DEST_WORLD_SCALE` halved (0.3 → 0.15); every downstream fixed-coordinate
  consequence found and fixed — SHIPPED 2026-08-21.** Every hand-placed entity at these
  destinations (6 named NPCs, 5 guild halls, Cedric's camp, arrival-spawn points) is stored as a
  fixed absolute world coordinate — these don't move when `worldScale` changes, but the real bake
  geometry scales toward/away from `dest.origin`, so the ground actually under each fixed point
  shifts to different terrain. Checked all 13 entities live, at both scales, not assumed: 7 were
  unaffected (already exactly on real ground at the new scale too). **2 were genuine new
  regressions caused by this specific change** (Richard the Strong and the Knights' Order hall,
  both on template-02, landed 42-46 units outside the real walkable terrain) — repositioned via
  the same nearest-point-in-union methodology already established for arrival spawns. **3 turned
  out to be a pre-existing bug this pass incidentally surfaced, not something the halving caused**
  (Builders' Guild hall, Cedric's camp, Miners' Brotherhood hall were already broken — badly, up
  to 3505 units off — at the *current, unhalved* scale; confirmed by testing the old scale
  directly, screenshots showing the camera wedged in clipped geometry or standing in an empty
  distant field). Two of these three needed a real, hand-picked reposition rather than the
  automatic nearest-point formula (which just lands in the nearest large classified rect,
  wherever that happens to be, not a sensible "near the lodge/camp" spot) — found via a live
  walk-around of each diorama, same technique already used for template-03's river-landing
  arrival spawn. All 8 `TEMPLATE_ARRIVAL_SPAWN` points recomputed at the new scale (the
  hand-picked template-03 riverbank spot was independently re-tested against the new scale and
  survived unchanged, so it was kept rather than replaced). **A real, previously-unknown,
  unrelated bug was found and fixed along the way**: live testing (not just reading code) caught
  the player launching up to 234.7 world units into the air when traveling directly between two
  already-mounted destinations (worst case: template-04 → template-05, now the natural path to
  Cedric's camp), taking a full 6 seconds of visible free-fall to land safely. Root cause: the
  horizontal walkable-rect clamp already guards against sampling a stale, still-mounted previous
  destination's mesh during the async GLB-swap transition (`getMountedRegion() === st.destination`
  — Stage 1's own established pattern), but the *vertical* gravity/ground-snap resolve had no
  matching guard, so for a few frames after `travelTo()` flips `destination` but before the new
  bake mounts, gravity was sampling the OLD bake's geometry at the NEW destination's coordinates.
  This bug predates and is independent of the scale change — it would exist at any
  `DEST_WORLD_SCALE` value — but the new coordinates this pass introduced happened to trigger its
  worst manifestation in ordinary sequential play. Fixed with the same guard pattern already used
  for the horizontal clamp. **Verified live, thoroughly**: independently recomputed
  `normalizeTemplateBake`'s real bbox math from the actual `.glb` files at both scales (exact
  0.5000 ratio for all 8 templates) and cross-checked against the running server's own
  `getBakeOffset()` — zero delta on every one; all 6 NPCs and all 5 guild halls + Cedric's camp +
  the Battle Dome teleport-tested with zero further clamp movement, real dialogue/guild panels
  opening correctly; all 8 arrival spawns confirmed landing cleanly; wander-tested in 4 directions
  from every arrival point across all 8 destinations (32 checks) with no void/fall-through; the
  gravity-race fix re-verified by frame-by-frame Y-position tracing across the full
  template-01→...→08 travel sequence — zero spike at every hop after the fix, versus a confirmed
  234.7-unit spike before it. Zero console/page errors throughout. `npx tsc --noEmit` /
  `npm run build`: both clean. **Honestly flagged, not fixed here**: template-04's bake classifies
  only a single walkable rect for its entire diorama (a real, separate content/classification gap,
  not something a coordinate pick can solve) — worth its own follow-up look.

## Decorative Lego figures no longer frozen — real ambient idle animation, 2026-08-24

- [COMPLETE] ✅ **Cedric's cameos, Weezil, Gilbert, generic-good/generic-bad troops, and Cedric's
  own camp figure (alive + jailed) all get real ambient idle-clip cycling — SHIPPED 2026-08-24.**
  13 figures across `TemplatePopulation.tsx`'s decorative actor rows (templates 02/03/04/06/07)
  and `CedricCamp.tsx`'s primary boss figure were permanently locked to `anim_r_restpose` with no
  state at all — the only rigged characters in the game that never moved. These are not real
  `NpcDef`/Agent entities and can't become one: the same raw Grok cast position data resolves
  thousands of world units from `dest.origin`, deep in unreachable background terrain (documented
  in `TemplatePopulation.tsx`'s own header, found in Wave 17 #5) — registering a real Agent for
  any of them risks that exact bug. Fix: a new `useIdleFidget()` hook (`RiggedFigure.tsx`) drives
  the same `clip`/`loop`/`onClipEnd` contract every other `RiggedFigure` caller already supplies —
  rests on `anim_r_restpose`, counts down a per-instance randomized 4–11s timer (so a crowd never
  reads as synchronized puppets), plays one random clip from `ambient.ts`'s `FIDGET_CLIPS` pool
  (now exported — the exact pool the real NPCs' own `idle_fidget` Action already uses) once, then
  settles back via the clip's real `onEnd` length, matching the same settle-to-rest convention
  `Npc.tsx` already uses for its greet-wave. `NAMED_COURT_FAMILIES`'s skip logic, `Enemies.tsx`'s
  real Cedric combat animation, and the 5 named court NPCs' own `courtAmbientSync.ts` Agent path
  are all untouched by this change — confirmed both by reading the diff and live. **Verified live,
  not just read**: all 5 checks passed against real running game state — decorative rows on
  templates 02/04/06 genuinely cycle rest↔fidget over a live 15s window; Cedric's own camp figure
  on template-05 animates pre-fight; all 5 named court NPCs still show exactly one rig instance
  each (no decorative duplicate, real Agent path intact) and still animate via their own system;
  a real Cedric combat encounter still plays his real fight clip via `Enemies.tsx`, fully
  independent of the idle-cycle change, with the idle figure cleanly unmounting during the fight;
  zero console/page errors throughout. `npx tsc --noEmit` / `npm run build`: both clean (verified
  independently in the isolated worktree, not just by the implementing pass).

## Destination world scale quartered again, via durable scale-relative storage; John Mayne moved to his real cast home — 2026-08-25

- [COMPLETE] ✅ **`DEST_WORLD_SCALE` halved a third time (0.15 → 0.075) — every fixed-coordinate
  consequence solved permanently instead of patched again — SHIPPED 2026-08-25.** The prior two
  halvings each required a manual reposition pass (6 entities broke 2026-08-21); this third cut
  would have broken 9-10 of the 13 hand-placed entities (NPCs, guild halls, Cedric's camp, all 8
  arrival spawns) — confirmed by live-testing every one of them against the real classified
  walkable union at the new scale before touching anything. Rather than a fourth manual
  reposition (guaranteed to break again on a fifth tuning request), every fixed coordinate in
  `npcs.ts`/`guilds.ts`/`world.ts`/`worlds.ts` is now stored as a destination-LOCAL (bake-space)
  point and resolved into live world space at read time via two new helpers in `worlds.ts`,
  `resolveDestPoint`/`toDestLocalPoint`. This is provably correct, not just empirically lucky:
  `normalizeTemplateBake`'s own transform math (`TemplateWorld.tsx`) reduces to one invariant,
  `worldPos(scale) = dest.origin + scale * localPoint` — a point stored as `localPoint` lands at
  the exact scale-appropriate spot after *any* future `DEST_WORLD_SCALE` change, forever, not just
  this one. Every local value was derived by running each file's own prior committed literal
  backward through this same invariant (one transcription slip in the research pass's own table —
  Miners' Brotherhood's local Z — was independently re-derived and corrected to the exact value
  during implementation, not just copied through). A real import-cycle prerequisite was found and
  fixed along the way: `world.ts` needed `worlds.ts` for the new helpers, but
  `worlds.ts → dungeon.ts → buildables.ts → world.ts` was already a real runtime chain that would
  have completed a cycle and TDZ-crashed — fixed by relocating a ~15-line dev-only
  "no fixed prop inside `BUILD_REGION`" guard from `buildables.ts` into `world.ts` and reversing
  that one import edge. **Verified live, including a real architecture-soundness test, not just
  today's specific numbers**: independently recomputed `normalizeTemplateBake`'s bbox/scale math
  from the actual `.glb` files and cross-checked against the running server's own
  `getBakeOffset()` for all 8 destinations (zero delta); all 6 named NPCs, all 5 guild halls,
  Cedric's camp, the Battle Dome, and all 8 `TEMPLATE_ARRIVAL_SPAWN` points teleport-tested with
  zero further clamp movement and real dialogue/guild panels opening correctly; **temporarily set
  `DEST_WORLD_SCALE` to an unrelated 0.11 with zero changes to any data file** and re-ran the full
  position battery — every entity still landed exactly inside real walkable ground, proving the
  storage mechanism itself is sound rather than merely correct for 0.075; reverted cleanly
  afterward. The gravity-race fix from the second halving was re-verified across all 8 sequential
  destination transitions (zero spike at every hop). Zero console/page errors throughout.
  `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

- [COMPLETE] ✅ **John Mayne moved from The River Landing (template-03) to The King's Approach
  (template-01), alongside King Leo and Queen Leonora — his real Grok-categorized cast home.**
  The user pointed back to `reports/rigs/` in the Blender lab's asset-labeling data, having
  personally categorized which NPC is which character with Grok; a prior research pass this
  session had only checked `reports/maps/*_layout.json`'s bare actor rows and concluded no such
  data existed. It was there: `reports/rigs/template-0N_PARTS.json`, a per-map file (one per
  template + challenge, previously unexamined) with a clean named-cast table for every map. Cross-
  referencing all 9 real templates against every current `NpcDef` placement confirmed John's donor
  family (`minifigjohnmayne`) is real cast on template-01 — clustered tightly with King Leo and
  Queen Leonora, i.e. genuinely "his crew" — and never appears on template-03 at all; King, Queen,
  and Richard's existing placements were spot-checked against the same table and confirmed already
  correct. (Caught a live process mistake mid-session: an earlier workflow attempt had reached its
  John Mayne conclusion using only the incomplete `layout.json` data and was about to ship a wrong,
  local-dressing-only fix on template-03; it was stopped — before it touched any file beyond the
  scale constant — and relaunched with the corrected cast data before any wrong fix landed.) John's
  real cast-row position itself resolved to a distant decorative "marching procession" backdrop
  marker (~208 units from the King/Queen's actual court, the same category `TemplatePopulation
  .tsx`'s own header already documents as unusable for a live stand-point) — so his actual
  in-world coordinate is a hand-picked spot next to the King and Queen instead, live-verified on
  real walkable ground at the King's own ground height. His quartermaster-stores set dressing
  (`CourtDressing.tsx`, formerly `RiverCargo`) now anchors to his real current position instead of
  a second hand-typed template-03 literal, and the `word_from_river` quest's travel target/text
  were updated to follow him to The King's Approach (its id is kept for save compatibility). The
  user's fresh live-captured template-03 arrival spawn (1544.66, 937.40) was confirmed to survive
  the new 0.075 scale cleanly and now supersedes the old riverbank override, which did not.

## Wave 18 #5 Stage 5 (+ Stage 6): home-only render gating, with a real raid-freeze bug found and fixed — SHIPPED 2026-08-25

**Design question answered first, via `AskUserQuestion`**: should home raids/building/AI activity
keep resolving in real time while the player is away at a destination, or pause? The user chose
**keep simulating** — the harder, more architecturally demanding option, since it means gating
must never stop any real gameplay logic, only wasted rendering.

- [COMPLETE] ✅ **Five purely-decorative home-only components now unmount while the player is at
  a destination** (`Terrain`, `Signpost`, `Merchant`, `Road`, `StarterVillage`), closing the last
  functional gap in the scene-isolation rearchitecture (Stages 0-4 previously shipped, PRs
  #160-170). Gated at `GameWorld.tsx`'s own mount site via real conditional mounting
  (`{!destination && <X/>}`), not an internal early-return — a real distinction found in research:
  `Terrain` and `Merchant` both own a top-level `useFrame`, and React Three Fiber's frame
  subscription survives an internal `return null` (proven by `Wildlife.tsx`'s own `Horse`
  sub-component, which does exactly that today) — only a genuine unmount tears the subscription
  down. `MountedHorse` and `Wildlife` were investigated and correctly left ungated: riding is not
  home-only (Richard's jousting field is a real destination), and `Wildlife` contains a
  destination-specific horse (Richard's own steed) that a blanket gate would have deleted
  everywhere. `RaiderRam` and `Emplacements` were investigated and correctly left unconditionally
  mounted — both drive real gameplay-state simulation (siege ram advance, turret/charge defense)
  entirely inside their own `useFrame`, with no central store tick backing them, so gating their
  render would have silently paused real defense/damage while the player is away.

- [COMPLETE] ✅ **A real, previously-unknown bug found by verify while testing exactly the
  property the user asked for**: an in-progress home raid's own combatants (raiders, ordinary
  night skeletons) completely froze — bit-for-bit identical position/HP/state — the instant the
  player left for any destination, only resuming on return. Root cause was a **pre-existing**
  Stage 1-2 pattern, not introduced by this stage's own changes: `Enemies.tsx` mounted a raider's
  `<Enemy>` component (the only place owning the `useFrame` that ever advances that mob's
  position/HP/state) only when its `world` matched the player's *current* destination — so a home
  raider (`world: null`) was fully unmounted, not just hidden, the moment `destination` became
  non-null. A second, compounding defect in the same file: the raid trigger/resolve block was
  gated behind a single `if (st.destination) return;`, so an already-started raid could never even
  conclude while the player was away — it just hung, waiting for their return.
  **Root-caused and fixed, not patched around**: `Enemies.tsx`'s render/mount filter now always
  includes home-world enemies regardless of the player's own destination (mirroring the existing
  `RaiderRam`/`Emplacements` precedent — safe because home and every destination sit thousands of
  units apart in the same shared coordinate space, so a mounted home raider is never actually in
  view once the player has travelled elsewhere); every check inside `Enemy()` that used the
  player's global `destination` as a stand-in for "is this mob at home" (ground height, keep-
  targeting, defender-targeting, pond/world-edge clamp) now asks about the *mob's own* `world`
  instead (`enemyAtHome`), since a home mob can now be ticking while the player's destination is
  something else entirely. The raid trigger/resolve block itself is no longer destination-gated
  (only the night-skeleton rise stays gated, since its spawn point is genuinely
  `playerState`-relative) — but its loud one-shot audio (warcry/horn/voice barks) stays
  `!destination`-gated, so a raid starting or ending while away notifies via toast rather than
  blaring audio the player isn't there to hear, matching this file's own pre-existing ROADMAP TODO
  that already anticipated exactly this gap. `EnemyStore.spawn()` gained an optional
  `worldOverride` param (10th, backward-compatible — every pre-existing call site is untouched) so
  a raid triggered while the player is away tags its raiders `world: null` explicitly, instead of
  stamping them with whatever destination the player currently happens to be standing in (which
  would have positioned them thousands of units off and made them un-renderable forever, even
  after the player came home).
  **Verified live, twice** — once by the verify pass that found the bug (a real A/B: reset the
  ram, travelled away, waited 6s, found the ram correctly advanced while every enemy stayed frozen
  to 15 decimal places), and again by the fix pass's own 14-point re-verification script: raiders
  now genuinely advance while away, a raid triggered while already away spawns correctly
  home-tagged, a raid can now resolve (payout + notify) while the player is still at a
  destination, and — critically — a DIFFERENT destination's own enemies were confirmed to still
  freeze correctly the instant the player leaves that world, proving the fix is home-only, not a
  blanket always-simulate. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

- [COMPLETE] ✅ **Stage 6 folded in**: `src/ai/PROJECT_CONTEXT.md`'s stale "Instance separation"
  section (still describing the pre-Stage-0 flat, always-mounted-everywhere model) rewritten to
  describe the real, now-complete render guarantee — including both the `Enemies.tsx`/
  `Defenders.tsx` exceptions and the explicit "this is a render guarantee only, not a simulation
  pause" clarification, so a future reader can't make the same "raids must be gated too" mistake
  this stage's own first draft briefly made. A full regression sweep across all 8 travel
  destinations, the dungeon, the arena, and all 6 challenge grounds (17 destinations total) found
  zero console errors and sane object counts throughout, folded into this stage's own verify pass
  rather than a separate stage.

**The full 6-stage scene-isolation rearchitecture (Stages 0 through 6) is now complete.**

## Wave 18 #6 (tree orientation) finished — template-01/-05/-06 fixed, root cause of the earlier "invisible" report found — SHIPPED 2026-08-26

- [COMPLETE] ✅ **The inverted-canopy tree defect is now fixed on all four destinations that have
  it** (template-03 shipped 2026-08-20, PR #165; template-01/-05/-06 finished here). None of the
  three new destinations' mesh indices transferred from template-03's `[27, 31]` — each was
  independently re-derived via the same live-raycast-the-actual-on-screen-defect methodology:
  `template-01: [60]`, `template-05: [41, 49]`, `template-06: [78, 79, 80, 81]`.
  `template-06` genuinely needed 4 indices, not 2 — its row bakes as two separate backdrop-tile
  segments (white and red), each with its own ball-topiary and conifer mesh, a real structural
  difference from the other three destinations' single-segment bakes, caught by deliberately
  checking a wide reference shot rather than judging the fix from one close-up angle after the
  first improvement looked done. `template-01`'s own research draft proposed `[58, 59]` — this
  was independently re-investigated during implementation and found to be wrong: those two meshes
  are a striped bunting/pennant backdrop and its hanging ornament balls, real decorative geometry
  but not the tree row; the actual row is a single mesh, `mesh_0_60`, confirmed by tinting it
  alone (the whole visible row lit up) and by mirroring it (an ordinary right-side-up row
  resulted, screenshotted before/after).

- [COMPLETE] ✅ **Root cause of the prior session's "went invisible" report, reproduced live, not
  just theorized.** `applyTreeMeshOrientationFix` counts `isMesh` nodes scoped to the raw GLTF
  scene alone (already documented in the function's own doc comment) — but `TemplateWorldRoot`
  mounts `TemplateGroundDisc` as a sibling mesh node ahead of that scene in the outer group, so any
  index derived by counting from the wrong scope lands one or more mesh nodes off from what the
  fix function actually targets. These bakes carry a handful of huge terrain/backdrop-scale meshes
  (one single mesh spanning 700+ world units was found live on template-05) whose real geometry is
  NOT centered in their own local bounding box, unlike a small symmetric tree — mirroring one of
  these 180° about its own bbox center (the fix's actual operation) relocates most of its
  triangles to the diametrically opposite side of that very large box. Reproduced live twice this
  pass, on two different oversized meshes in two different destinations: one read as a flat
  backdrop panel erupting into tall diagonal spikes, the other warped the far background into
  unrelated jagged terrain — neither is literally "nothing rendered," but both are dramatic,
  camera-angle-dependent relocations of a large geometry mass, which is a fully consistent
  explanation for a plain-language "the row went invisible" report depending on exactly where that
  mass ends up relative to the camera and the rest of the scene. The two other hypotheses on the
  table (a thin billboard mesh whose flipped normals could explain a culling-driven disappearance;
  a backface-culling gap) were tested directly against all three destinations' real row meshes and
  ruled out — every one is genuine non-planar 3D geometry, and `normalizeTemplateBake` already
  forces `THREE.DoubleSide` on every material before anything renders.

- **Verified live, thoroughly**: zero console/page errors across a combined pass through all four
  fixed destinations plus a scan of every untouched destination (confirming the
  `TREE_MESH_ORIENTATION_FIX` lookup is a correct no-op everywhere else); `npx tsc --noEmit` /
  `npm run build` both clean, verified independently. For template-01, -03, and -06, the verify
  pass independently re-resolved each destination's real mesh identity live (same traversal-scope
  method the fix itself uses) and got an exact match to the shipped indices, including total mesh
  counts per destination — directly ruling out the historical wrong-mesh-mirror failure mode
  rather than inferring it. **Honestly flagged, not silently passed over**: verify could not obtain
  a cleanly-framed screenshot of template-05's row specifically despite roughly 10 distinct
  camera-navigation attempts (the destination's own backdrop geometry made it difficult to frame),
  so that one destination's fix is confirmed correct by exact mesh-identity match and the absence
  of any defect tell or corruption artifact in every attempt, but not by a personally-witnessed
  clean visual the way the other three were.
  - **Wave 19: a fresh attempt, still no clean shot — but this pass found and proved WHY, which the
    earlier attempts hadn't.** A real on-foot walk (arrow-key turning + W/Shift sprint, no free-fly)
    retreating ~600 units straight back from `mesh_0_41`/`mesh_0_49`'s live-computed bbox centroid
    then turning to face it DID produce a clean, wide, fully unobstructed shot of a triangular
    green-skirted, rocky-peaked mountain sitting exactly on that bearing — but a same-vantage
    hide-then-screenshot test (`obj.visible = false` on both target meshes, re-shot, identical
    pixels) proved that clean mountain is **not** the target mesh at all: hiding it changed nothing.
    A ray-vs-AABB check against a live dump of all 202 scene meshes from that exact camera
    pose found the true occluder: an unnamed mesh spanning a 520-unit cube (almost certainly
    sky/backdrop geometry) at close range, and past it, `mesh_0_47` — a **different**
    terrain-scale mesh (`x:[2011,2330] z:[853,1214] y:[0,40]`) whose footprint fully contains
    `mesh_0_41`/`mesh_0_49`'s own (`x:[2043,2285] z:[921,1161] y:[7,31]`) and exceeds it in every
    dimension, including height. The target row is geometrically nested inside a strictly larger
    opaque mesh's bounding volume as seen from outside it — depth-tested away from any external
    angle, which is a full mechanical explanation for why every attempt across two separate passes,
    walking different directions from different distances, kept finding "a large, close mountain"
    instead of the row: that mountain (`mesh_0_47` and whatever the sky-scale mesh is) is genuinely
    in front of it from everywhere outside its own footprint. A clean *external* shot of the row
    alone is very likely not obtainable through ordinary player movement at all; the only remaining
    approach worth trying is finding a walkable point on `mesh_0_47`'s own surface where local
    terrain height dips low enough for the canopy layer to crest above it — untried, and unproven
    that such a point exists or is reachable. The fix remains shipped and mesh-identity-confirmed
    correct; this changes nothing about that, only the confidence in why a visual can't be had.

## Wave 20: line-of-sight for ranged combat, and enemies can no longer spawn inside your own walls — SHIPPED 2026-08-28

- [COMPLETE] ✅ **Real line-of-sight for every ranged attack in the game** (`ROADMAP.md`'s own
  long-standing TODO — previously distance was the only check, a wall between attacker and target
  never mattered). One shared primitive, `hasLineOfSight()` (`src/game/navgrid.ts`), used by all
  three real ranged-combat call sites: a defender's bow shot (`Defenders.tsx`), a ranged bandit's
  shot at a defender or the player (`Enemies.tsx`), and the player's own fired bolt/arrow
  (`combat.ts`'s `stepBolt()`, stopped mid-flight and lodged in whatever it hit). Deliberately
  **not** built on the existing pathfinding grid — that grid flattens height (`isWalkable` has no
  y-parameter), which would have falsely blocked the elevated-archery bonus (`onBattlement()`, a
  player firing from atop their own wall). Instead reuses the exact same source data the nav grid
  already builds from (a new shared `forEachObstacleBox()`, mechanically extracted from
  `NavGrid.rebuild()` with zero behavior change to it) via a real 3D segment-vs-box test against
  each obstacle's true `yBase`/`yTop`, cached per-region and only rebuilt when the source array's
  identity changes — the same memoization `NavGrid` itself already relies on, so this adds no new
  per-frame cost beyond a cheap loop over a cached box array on an actual attack-cooldown tick (for
  defenders/enemies) or an in-flight-projectile physics step (for the player), never scaling with
  raid size. **Verified live with genuine before/after damage A/Bs**, not synthetic unit calls: a
  defender's bow target held exactly steady in HP through 3.5s of attacks while a real wall sat on
  the firing line, then died within another 3.5s once the wall was removed — repeated the same way
  for a ranged bandit vs. a defender (36→36 walled, 36→31.2 clear) and vs. the player (10→10
  walled, 10→4.42 clear). The elevation exemption was independently confirmed via the exported
  primitive itself: a line through a real wall at ground height is blocked, the identical line 5m
  above the wall's own top is not. A live performance sample (10 bandits vs. 6 bow defenders,
  actively fighting near 8 real walls) showed zero measurable frame-rate impact (60.22fps vs. a
  60.05fps idle baseline). `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

- [COMPLETE] ✅ **Night skeletons can no longer rise inside a fully walled homestead** (the other
  half of `ROADMAP.md`'s "enemies shouldn't spawn inside the kingdom" TODO — dusk raiders already
  correctly walked in from the road; skeletons had zero wall awareness). The spawn ring (26-38m from
  the player) now re-rolls up to 6 times against `fort.ts`'s existing cached `insideWalls()`
  flood-fill check, and falls back to the same `roadEntry()` walk-in treatment raiders already get
  if every roll still lands inside an enclosure — a fallback skeleton is tagged `approaching` (so it
  paths in via the nav grid like a raider) without being miscounted as one in raid-resolution
  bookkeeping, which filters strictly on a separate `raid` flag. **Verified live with a real
  deterministic proof, not just observed luck**: built an actual sealed 96-piece wall ring, forced
  real night, and confirmed via `window.__kkfort` that `enclosed:true`; collected 7 natural spawn
  cycles over ~2.5 real minutes with every one landing outside the ring; then pinned `Math.random()`
  so every one of the 6 reroll candidates computed to the exact same point deep inside the ring —
  the actual skeleton that spawned correctly used the `roadEntry()` fallback instead, proving the
  reroll loop genuinely rejects the bad candidate rather than coincidentally succeeding. Dusk raiders
  were confirmed completely unaffected by this same test session (still spawning at the real
  `roadEntry()` coordinate, `raid:true`). **Honestly scoped, not silently included**: a related but
  distinct TODO — enemies spawning inside a building's own footprint, not just a walled courtyard —
  was flagged during research as a one-line, near-zero-cost addition to the same reroll loop
  (skipping `navBlocked()`, already exported and cheap) but deliberately left out since it wasn't
  what this wave was asked to fix; tracked separately for a future pass.

## Wave 21: ordinary villagers can fight back — real HP, real weaker attack, real balance verification — SHIPPED 2026-08-28

The user was explicitly asked and chose: villagers WILL be able to fight back, not stay
defender-only forever. Sequenced after Wave 20 (line-of-sight) specifically so this is tuned
against a world where an armed combatant can't abuse ranged-through-walls.

- [COMPLETE] ✅ **A real, tuned, much-weaker combat capability for the ordinary (non-defender)
  roster** — a new `engage_threat_villager` reasoner action (`ai/actions/engageThreatVillager.ts`),
  fully separate from the existing `engage_threat` (which stays exactly as permanently inert as
  before — `rosterSync.ts`'s `job === 'defender'` exclusion never moved). **A real prerequisite
  found during research, not assumed away**: ordinary villagers had zero combat presence of any
  kind before this wave — no HP field, no hitbox, nothing in `Enemies.tsx`'s targeting loop even
  aware they existed. A new `game/villagerCombat.ts` gives them a real HP pool (8, flat — no
  level/loadout/trait scaling exists for this population the way it does for defenders) and a
  real, deliberately weak flat attack (1 damage/hit, 1.3s cooldown — 42% of an unarmored defender's
  own DPS floor), plus the same downed-not-permanently-dead recovery pattern a defender already
  gets (45s, now a shared `DOWNED_RECOVER_MS` constant instead of two duplicated literals — folded
  in a small pre-existing dead-code cleanup along the way, `Defenders.tsx`'s own local
  `RECOVER_MS` was never actually referenced). Melee-only: confirmed live that no code path can put
  a weapon in a plain villager's hands (`setDefenderLoadout` refuses any non-defender job), so this
  wasn't a tuning choice, it's the only thing technically possible without also building a whole
  weapon-assignment path — which conveniently means zero exposure to the ranged-through-walls risk
  Wave 20 was worried about.
- [COMPLETE] ✅ **The "who fights" rule, anchored in the actual reasoner math, not a guess.** Traced
  the real utility-reasoner priorities (`Reasoner.ts`) and found `flee_to_safety` (survival, weight
  4.0, `interruptPriority` 10) fires flat whenever any raid-flagged enemy exists anywhere, with no
  per-agent locality check — so during a genuine bandit raid, **nothing changes**: every villager
  still flees, exactly as before this wave, confirmed live (a real raid spawned adjacent to brave,
  capable villagers and every one of them fled, including the two with high enough courage to
  otherwise fight). This wave's real, reliable new content is entirely the *between-raid* case — a
  lone night skeleton wandering the fields, the one hostile this game ever spawns at home with
  `raid: false`, the same niche the existing `take_cover` action already proved out. A villager only
  engages if ALL of: courage ≥ 6 (data/attributes.ts's existing 1-10 roll, using 5 — the formula's
  own "no bonus" baseline — as the cutoff, ~47% of the roster), within ~3.5m of the threat when
  noticed (so a whole roster doesn't converge on one distant raider from range), the current
  difficulty tier is ≤1 (a villager has no `gainDefenderXp`-style growth to keep pace with
  `raidStrength()`'s own scaling — this wave's own DPS/time-to-kill simulation showed a fight past
  tier 1 becoming a mathematically certain beating, not a fair one), and not already downed. A real
  alternative — giving the villager action raid-priority above `flee_to_safety` — was investigated
  and explicitly rejected: the actual math shows the one window it would need (a villager already
  adjacent to a raider inside flee's own 2-second minimum-duration) essentially never occurs, since
  raiders approach gradually via the road; not worth the real architectural risk of the first-ever
  priority above the survival ceiling for a payoff that doesn't materialize in practice.
- **Verified live with real tracked balance data across multiple difficulty tiers, not a vibe
  check**: at tier 0, a courage-qualifying villager reliably beat a lone night skeleton with HP to
  spare (two replicates: 6/8 and 4/8 HP remaining); at tier 1, the same fight was a genuine
  nail-biter (1.25/8 HP remaining) — matching the design's own hand-simulated prediction almost
  exactly; at tier 2, the difficulty-tier capability gate correctly withheld the action entirely —
  the villager fled instead and was never touched, live-confirming the gate actually prevents the
  "mathematically certain beating" it was built to avoid, not just on paper. Neither balance failure
  mode this wave was watching for is present: villagers neither die uselessly fast nor tank hits
  indefinitely. Downed/recovery was verified end-to-end with a real killing blow through to
  automatic recovery after the timer. Defender combat was re-verified live and is byte-for-byte
  unaffected (same HP/damage/cooldown numbers as before this wave). `npx tsc --noEmit` /
  `npm run build`: both clean, verified independently. **Two "polish" findings from verify, both
  addressed**: several pre-existing comments elsewhere in the AI system (`takeCover.ts`,
  `perception.json`, `Senses.ts`, `PHASE_STATUS.md`) asserted "an ordinary villager cannot be
  damaged" as settled fact — true when written, false as of this wave — updated in place with a
  dated correction rather than left to mislead a future reader. A minor, player-invisible quirk
  (a downed villager's own debug-visible "current action" can briefly still read `take_cover`
  rather than something that says "downed") was noted but not fixed — it has no gameplay effect
  since the villager's position is already frozen and no position-dependent action can complete
  while downed, and is honestly documented as a known, harmless loose end rather than silently
  dropped.

## Wave 23: defender command UX — per-defender orders, a HUD order chip, deposit floaty text, Wit-priced trading — SHIPPED 2026-08-28

Four independently-small follow-ups from Phase 24, all shipped together since they touch related
(but non-overlapping) parts of the defender/HUD/trading surface.

- [COMPLETE] ✅ **Per-defender standing orders.** Until now `giveDefenderOrder()`'s fleet-wide radial
  call (hold T) was the ONLY way to direct defenders — one shared order every sworn defender read.
  The Roster panel (N) now gives each defender their own "Standing Order" row (the same
  Loadout/Mount/Station/Shift button-row convention already used there), which — once set — wins for
  that defender over the fleet order until cleared by picking whatever the fleet is currently
  standing (no separate "clear" control needed). The radial itself is untouched and stays the fast,
  hands-free fleet-wide call; a horn call deliberately does NOT stomp an individual's override, so an
  archer you've dedicated to Scout stays scouting through a new fleet order, matching how
  Loadout/Station/Shift already survive independent of it. **Verified live with a real behavioral
  A/B, not just a flag check**: gave one defender an individual "Attack!" order via the real Roster
  UI and confirmed only that defender (not a second, unmodified one) closed distance on a far enemy
  outside normal engagement range, then continued through to a real kill (passing Wave 20's
  line-of-sight gate correctly) — the second defender never moved, still just answering the
  unmodified fleet order.
- [COMPLETE] ✅ **HUD order status chip**, closing the other half of the same gap — previously the
  only feedback on a given order was a one-shot toast, gone the moment it faded, with zero persistent
  on-screen reminder. A small always-on chip (mirroring `FortStatus`'s exact shape/polling
  convention) now shows the fleet's standing order plus a live count of defenders on their own
  individual orders, hidden away from the homestead or with no defenders sworn. Verified live: text
  and hover detail updated correctly on both an individual override and a fleet-wide order change,
  with the override correctly surviving the fleet change.
- [COMPLETE] ✅ **Deposit floaty text** — a brief "+N item" rise confirmation when a hauling villager
  deposits goods, the first floaty-text mechanism of any kind in this codebase (confirmed none
  existed before). Reuses the existing `Billboard`+`Text` in-world label primitive (`Grounds.tsx`)
  rather than a new projection system; amount-accurate to what storage actually accepted, not the
  requested amount. Verified live by reading the real number directly off the mounted THREE.js scene
  graph during an actual AI-driven haul cycle, including a run where a real Might-based trip-bonus
  roll doubled the load — the floaty showed the true doubled number, not a guess.
- [COMPLETE] ✅ **Wit-priced trading — a real gap found, not just a stale ROADMAP label.** The
  original follow-up note turned out half-stale: the player's Wit attribute already gave a sell-side
  discount (shipped separately, never cross-referenced back to this note), but had **no buy-side
  effect at all** — `buyOffer()` only ever applied Silver Tongue's perk discount. Extended Wit's
  existing 4%-per-point haggle to the buy side too (the same mirror-image treatment Silver Tongue's
  own ±15% already gets), stacking with Silver Tongue, clamped to a 1-gold floor so a maxed haggler
  is never handed goods for free — applied to both the Merchant's `ShopPanel` and Wave 22's Guild
  Store (`buyGuildOffer` delegates to the same `buyOffer`, so one fix covers both). **A second,
  related display-only bug found and fixed while touching this code**: `ShopPanel`'s sell-side price
  display had never included Wit's term at all (only ever mirrored Silver Tongue), so a player with
  Wit points was shown a lower sell price than `sellItem()` actually paid — fixed for consistency
  with the buy-side display now also being correct. **Verified live with exact-match numeric
  evidence**: tested Wit values of 0/5/10 through real Buy/Sell clicks — buy cost dropped
  7→6→4 gold and sell earnings rose 30→36→42 gold, matching `Math.round(price × (1 ± wit×0.04))`
  exactly at every step, zero rounding slack.
- **Regression-checked against Waves 20/21**: a defender with no individual override still correctly
  answers only the fleet's default order and engages normally (line-of-sight gate unaffected,
  untouched by this wave's diff). `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 24: generalised interiors to four more buildings, and windows as a real LOS-blocking interactable — SHIPPED 2026-08-29

Two items, sequenced together because the second builds on Wave 20's `hasLineOfSight()`.

- [COMPLETE] ✅ **Four more generalised interiors** (`data/interiors.ts`'s `INTERIORS` table, launched
  Wave "generalised interiors" 2026-07-30 with just `keep`/`stable`). Re-verified live first: the
  system already places zero structural restriction on which buildable TYPE can have one — one
  `INTERIORS` entry plus one dressing branch in `BuildingInteriorRoom.tsx` is genuinely the whole
  cost, confirmed by tracing `enterInterior`/`exitInterior` (gameStore.ts), the interact registration
  (PlayerController.tsx), and the movement clamp — none of them gate on type. **The plan's own two
  suggested candidates (forge, market stall) turned out unsafe on inspection, not just unideal**: the
  forge's crafting-station `consider()` sits right after the interior-enter block in
  PlayerController's per-building if/continue chain, so giving it an `INTERIORS` entry would make
  "Enter the Forge" permanently dead-code the `continue` before "Use the Forge" is ever reached — not
  a scoring tie, a silently broken crafting station. The market stall's own trade prompt is a
  *separate* `consider()` call that runs after the same loop, so both register, but `consider()`'s
  tie-break is a strict `score > best.score` — identical scores for the same building tile mean
  whichever registers first (the interior branch, being inside the earlier loop) permanently wins,
  permanently shadowing "Trade at the Market Stall." Neither is a hypothetical; both were traced
  through the real code. Picked four real, unlocked buildables instead, each verified by grep across
  PlayerController/gameStore/Enemies/Defenders/Emplacements to have **zero** existing interact of any
  kind, so none of them contest a consider() slot with anything: **Storehouse** (a walk-in stores room
  dressed with the same real crate/barrel molds its own exterior already uses), **Jail Cell**
  (`oc6094-2`, deliberately the smallest/barest of the four — a cramped cell with the barred-lattice
  mold from the Portcullis mounted as a wall accent and straw bedding as a plain procedural box),
  **Watch Tower** (`tower` — its only prior tie-in was the defender-roster "manned tower" HUD
  assignment, not a world E-prompt; ground-floor guard room dressed with the real Weapons Rack prefab
  and a reused `Torch`), and **Jewel Tower** (`oc6098b3`, completely inert before this — a small
  treasure vault reusing the Keep's own Chest pattern plus the same gold-toned goblet mold the Keep's
  banquet table already dresses with). Every one uses the exact existing mechanism byte-for-byte:
  sealed pocket room, teleport in/out (no walk-through door), one door prompt, `pocketFor`'s
  deterministic hash-slot placement. Tavern/inn was checked and does not exist as a buildable at all;
  Guild Hall was checked and is fixed open-air per-destination dressing with its own `guild_hall`
  interact kind, not a `PlacedBuilding` — correctly not eligible by construction, not forced in.
- [COMPLETE] ✅ **Windows as a real LOS-blocking interactable.** ROADMAP's own note above deliberately
  deferred this "pending a mechanical reason to open one" — Wave 20's `hasLineOfSight()` is that
  reason. The `windows_doors` catalog turned out to already hold the exact asset needed and nobody
  had used it: `14_l453201`/`16_l453202` are a matched pair (identical declared size, identical
  "Window/Door 2×3" catalog name) sitting as two separate decorative bricks that were each walkable
  through and did nothing — one shows a closed/glazed pane, the other the same frame fully hollow.
  Promoted into a new `window` buildable the exact way `door` was promoted from its own mold: added
  `type === 'window'` to the one `isDoorLike()` predicate (`game/types.ts`) and touched nothing else
  in the mechanism — every consumer of that predicate inherited correctly for free, because they were
  all already written against the predicate rather than a type list. That means a closed window is a
  solid obstacle box in `forEachObstacleBox` (navgrid.ts), the exact function both the nav grid AND
  `hasLineOfSight`'s `losBoxes()` read from — so a closed shutter blocks a ranged shot exactly like a
  wall, and an open one lets it through, with **zero changes needed in navgrid.ts itself**. Player and
  raider collision, `RaiderRam`'s targeting, and `siege.ts`'s "a ram bursts a closed one open" all
  inherited the same way — verified each one live in the source, not assumed. `Buildings.tsx`'s new
  `WindowFixture` swaps between the two REAL meshes (closed/open) rather than animating one, simpler
  than `DoorFixture`'s lift-lerp and it shows the mechanic to the player directly: a sealed pane you
  can't see or shoot through, or a hollow frame you can. Declared height (0.84m, the mold's own real
  bbox) is deliberately under `isRampart`'s 1.2m `RAMPART_MIN_HEIGHT` (walls.ts) — a small window
  furnishing doesn't independently seal or breach the "Sound Walls" fort ring the way a real door/gate
  does, only affects sightlines and passage; this is a real, checked consequence of the height picked,
  not a guess. **Deliberately not built**: a window-specific "firing position" bonus. `onBattlement()`
  (combat.ts) is a pure elevation check already granting +25% ranged damage to any elevated shot
  regardless of building identity — firing through an open window from an elevated spot (e.g. the new
  Watch Tower interior above, or a wall walk) already gets that bonus with zero new code, so a second
  parallel mechanic would only duplicate it. The open/close LOS toggle alone, wired through the
  existing `isDoorLike`/`gateOpen`/`hasLineOfSight` chain, is the complete and correctly-scoped answer.
- **Regression-checked against Waves 8/20**: the door and gate's own open/close behavior, sounds, and
  fort-seal participation are byte-for-byte unaffected by adding a third `isDoorLike` member — every
  branch that customizes by type (`toggleGate`'s sound/notify text, the interact noun/duration, the ram
  message) added a `window` case alongside the existing `door`/`gate` ones rather than changing them.
- [COMPLETE] ✅ **A real reachability bug in 2 of the 4 new interiors, found live and fixed, not
  shipped broken.** The first cut of each `enterRange` (`data/interiors.ts`) was sized against the
  interior room's own `halfX`/`halfZ` — but `PlayerController.tsx`'s door-prompt check compares
  straight-line distance to the *building's* centre against `enterRange`, while real player movement
  is stopped short of that centre by `collisionBoxesFor()`'s actual collision box, not the room size.
  Two of the four (`oc6094-2` Jail Cell, `oc6098b3` Jewel Tower) have no entry in the generated
  `collision.json` at all and so fall back to their FULL declared bounding box; `tower`'s real
  voxelised shape is a hollow ring flush with that same bounding box at ground level. Once the
  player's own collision radius (0.45) is added on top, the real stop distance on one or both axes
  exceeded the original `enterRange` for Storehouse, Jail Cell, Watch Tower, and Jewel Tower — Jail
  Cell and Watch Tower were **completely unreachable from any walk-up angle** (the prompt could never
  appear), Storehouse and Jewel Tower were reachable from only 2 of 4 approach directions. Caught by
  a live 4-direction cardinal probe in verify, not by inspection — root-caused to the size-vs-collision
  mismatch and fixed by re-deriving each `enterRange` from the real collision half-extent (both axes,
  covering either placement rotation) plus the player radius plus a real margin, then re-verified from
  all 4 directions for all 4 buildings, confirming the door prompt now appears everywhere it should
  while the existing Stable interior (untouched) continued to work exactly as before.
  `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

## Wave 25: a real humanoid companion — Tam, the Squire — SHIPPED 2026-08-29

The user was explicitly asked and chose a HUMANOID squire/knight companion over a reskinned-beast
option. This populates the `companion` AI archetype (`archetypes.json`) that has sat fully defined
and completely unused since AI phase 5 — `follow_leader`/`assist_leader` were aspirational config
strings with zero implementation, and `Blackboard.leaderId` had never been written by anything in
this codebase's history.

- [COMPLETE] ✅ **Identity, recruitment, and scope — every real design question answered against
  live data, not guessed.** Checked the full donor catalog before picking one: every named court
  NPC and every combat-mob family already claims a unique donor, leaving `minifiggenericgood00` —
  already worn anonymously by Alric/Beda/Fenwick/the Merchant — as the only real option. Named him
  **Tam**, titled "Your Squire" (not "Squire" alone, since `ranks.ts` already uses that as the
  player's *own* rank name). **A real, verified deviation from the initial plan**: the plan assumed
  keeping this donor's molded halberd+shield (`keepProps: true`), but that donor's molded props are
  parented at their original baked position rather than re-hung with the arm — precisely the
  floating-weapon bug this codebase already found and fixed for Gilbert. Tam wears a real,
  separately-portalled sword+shield instead, the same way every other armed figure in the game
  already avoids that bug. **Recruitment** reuses the existing side-quest pipeline entirely: a new
  errand from Richard the Strong (`r_squire`, 2 kills, real reward), gated on actual knighthood via
  one new, generally-useful `SideQuestDef.needsQuest` field (distinct from the existing `requires`,
  which only checks other side-quest ids) rather than a bespoke recruitment system. **Scope
  deliberately held tight**, matching `falcon.ts`'s own "one always-on companion, not a fleet"
  precedent: no independent leveling curve, no gear-slot system, no roster entry — Tam is never
  pushed into `st.villagers`, which keeps the whole loadout/leveling/roster-panel machinery out of
  scope for free. Both are named, explicit Wave 25b follow-ups, not silently dropped.
- [COMPLETE] ✅ **`follow_leader` and `assist_leader`, built for real, with a real architectural
  correction along the way.** The original framing described `follow_leader` as "writing
  `bb.leaderId`" as if that write gated the action's own scoring — traced the actual reasoner
  mechanics and found this circular (`assembleCandidates` scores every candidate *before*
  `Activity.start()` ever runs, so a consideration reading a field only that same action ever
  writes would read `null` forever). Fixed: the gate is `agent.archetype === 'companion'`; the
  `bb.leaderId = 'player'` write is a documented side effect, not the condition. `assist_leader`
  reuses `engage_threat`'s original combat shape (not `engage_threat_villager`'s weaker one, and
  not its courage/proximity/tier gates either — those exist specifically to stop a whole *roster*
  of flat villagers from mass-dogpiling as difficulty scales, a risk that cannot occur for one
  dedicated entity) under its own `is_companion` gate, so nothing here touches either of Wave 21's
  villager-combat code paths. Combat stats (16 HP, 1.5 dmg, 1.2s swing) sit at the exact numeric
  midpoint between Wave 21's villager floor and an unarmored defender's floor — meaningfully above
  one, clearly short of the other, cross-checked against real enemy HP/damage tables the same way
  Wave 21's own balance work was.
- [COMPLETE] ✅ **Follows the player everywhere, including across travel**, reusing the exact
  "renders unconditionally, no destination gate" convention `MountedHorse.tsx`/the tamed falcon
  already established (confirmed live: neither is gated the way `Terrain`/`Signpost`/`Merchant` are
  at the same `GameWorld.tsx` call site). A new `companionSync.ts` keeps `agent.region` in step with
  `st.destination` on every travel — without it, Tam's stale `region` would stop matching any real
  destination the instant the player left home, silently dropping him to tier D (unrendered)
  forever; his position is snapped rather than pathed on the same frame, mirroring how the player's
  own travel is an instant teleport, not a walk, into a coordinate space his last `MOVE_TO` knew
  nothing about. Made a real, checked target-priority decision in `Enemies.tsx`: Tam is a valid
  raider target one rung below a sworn defender and one rung above an already-fighting villager,
  gated on his own current region (not `enemyAtHome`, since he isn't home-bound) matching every
  destination he might actually be standing in.
- **Three real, live-measured bugs found by verify and fixed, not shipped broken:**
  1. **Unbounded follow gap (blocker).** `follow_leader`/`assist_leader` inherited the AI
     locomotion system's villager-tuned speed caps (0.9/1.6 m/s, meant for a villager's own
     wander/flee pace) instead of comparing against what a companion actually has to keep up
     with — the player's own 4/7 m/s walk/sprint. Measured live: the gap grew unbounded, 5.4→22.6
     units over 8 seconds of ordinary walking, never closing on its own. Fixed with a dedicated,
     fully isolated companion speed cap (4.4/8.5 m/s, real margin above the player's own top
     speed) gated on `agent.archetype === 'companion'` — zero effect on any villager or defender.
  2. **Permanent incapacitation once downed (blocker).** Villagers and defenders each have their
     own render component's per-frame check that resets `state`/`hp` once `downedUntil` elapses;
     `Companion.tsx` had no equivalent anywhere. Confirmed live with a real organic 4-bandit
     takedown (not a forced value): Tam's state stayed frozen at `downed` indefinitely, meaning
     the *first* real fight he lost in a session incapacitated him for the rest of it, silently
     contradicting the design's own "never permanently dies" claim. Fixed by adding the identical
     hide-while-downed/auto-recover check `Villagers.tsx`/`Defenders.tsx` already use.
  3. **Unleashed chase (real-bug).** `assist_leader` had no give-up condition against a target
     that flees faster than Tam can ever catch (a fleeing bandit's 3.0 m/s vs. his then-capped
     1.6 m/s) — its only exit condition (losing sight for 2.5s) never fires against a target
     crossing open, unobstructed ground. **The first fix attempt was verified wrong, and caught
     before shipping**: an `update()`-time early return past a leash distance did nothing,
     because it only ended that one Activity instance — the very next reasoner think just
     re-selected the same action fresh and picked the chase back up, measured running Tam out to
     43+ real meters before this was caught. Fixed for real by making the leash a proper scoring
     **consideration** (`within_leash`, same bool-gate shape as `not_downed`), so the whole action
     scores to zero past 20m from the player and `follow_leader` wins the very next think tick
     instead of merely losing one activity instance.
- **Regression-checked against Waves 20/21**: Wave 21's villager combat and Wave 20's line-of-sight
  are both completely unaffected — Tam's own combat gate, damage constant, and target-priority slot
  are fully separate from both. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 26: a second ownable settlement — The Frozen Pass, and two real foundational AI bugs found along the way — SHIPPED 2026-08-30

The user was explicitly asked and chose to WIDEN the empire (a second settlement) rather than
deepen the existing one at The Old Ruins.

- [COMPLETE] ✅ **Candidate re-verified live, not trusted from the plan's own list.** The original
  plan named templates 04/05/07/09 as "genuinely greenfield." Two of those turned out to be real,
  confirmed disqualifications: template-05 is `CEDRIC_WORLD` — Cedric the Bull's own boss-camp/
  siege territory, not empty ground — and template-09 isn't a small map, it **is the homestead**
  (`Terrain.tsx` mounts it as `HomeMeadow` at the world origin; `TravelPanel.tsx` explicitly
  filters it out of the travel grid). Of the two real candidates, **template-07 ("The Frozen
  Pass") was picked over template-04** after visiting both live: template-04's walkable footprint
  is a single, un-subdivided 96×96m rect (independently flagged elsewhere as a real terrain-
  classification gap), while template-07 has 7 real classified rects, a dramatic mountain backdrop,
  and — the deciding factor — already carries two independent, previously-shipped signals pointing
  at a resource economy (an ore-flavored travel blurb, and the Woodsmen's Lodge guild already
  stationed there with a literal wood-yield passive).
- [COMPLETE] ✅ **A new resident, Torvald the Frozen Pass Prospector, and his own 2-quest
  recruitment chain** (`frostpass_shelter` → `frostpass_clear`), reusing the founding pattern
  proven at The Old Ruins. **A real design question resolved with mechanism evidence, not a coin
  flip**: unlike template-08 (zero resource nodes, farmer/merchant/builder residents only), The
  Frozen Pass gets real hand-placed tree/rock nodes from day one, giving it genuine lumberjack/
  miner residents — confirmed buildable by tracing the actual `ResourceNodeState.world` plumbing
  end to end (real since Wave 5, but never exercised with a non-null value in shipped content
  until this wave).
- [COMPLETE] ✅ **A real architectural generalization, not a second hardcoded copy.**
  `foundSettlement()` and the settlement dialogue UI were confirmed single-site-hardcoded to
  Fenwick/template-08 specifically (a literal `'settle_clear'` quest-id check, a literal
  Bram/Ida/Tolan roster baked into the function, `npc.id === 'fenwick'` gating the UI block) —
  calling either unchanged for a second site would have silently done nothing. Replaced with one
  new data table, `SETTLEMENT_FOUNDING` (destId → cost/required-quest/residents), that both now
  read from — template-08's entry holds the exact old hardcoded values, so its behavior is
  byte-identical, while template-07 gets full support for free.
- [COMPLETE] ✅ **Two real, foundational AI-system bugs found by verify and fixed, not shipped
  broken — pre-existing, not introduced by this wave, but this is what finally exercised them.**
  Verify caught that the wave's own "live-verified" claim about resident labor was wrong: Torvald's
  lumberjack and miner never actually gathered anything, confirmed over 230+ real seconds of
  observation across two independent runs. Root-caused to **two compounding bugs**, both required
  to fix together:
  1. `rosterSync.ts` spawned every roster villager's AI Agent with `region: null` regardless of
     their real `Villager.world` — three separate pre-existing code comments (`wander.ts`,
     `Locomotion.ts` ×2) had already named this exact landmine ("a Wave-4 settlement resident...
     sits one config change away") without it ever being exercised. Effect: a settlement resident,
     watched in their own world, was tiered D by the LOD system at the exact moment they were being
     rendered — the one state the whole design assumes can't happen — so the coarse-step movement
     validated every step against the HOME nav grid for coordinates thousands of units away,
     always failing.
  2. `TargetRegistry.ts`'s `nodeTarget()` separately hardcoded every resource node's own `region`
     to `null` (stale since Wave 5 gave nodes a real `world` field), and `queryNearby`'s node scan
     only ran `if (region === null)` at all. Fixing bug 1 alone would have made this WORSE (a real
     non-null region would then match zero node candidates ever) — both had to be fixed together,
     mirroring the exact per-item region filter the building-search loop right next to it already
     used.
  A third, related bug was found live during the fix pass itself, not in the original report:
  `Villagers.tsx`'s "haul home" cascade sent a settlement resident toward the actual homestead's
  literal origin for the last ~30% of every work trip (a hardcoded `HOME_X`/`HOME_Z` fallback and
  an `isHomeBuilding`-only farmplot/stall search, both ignorant of `villager.world`) — so even
  after bugs 1-2 were fixed, a resident would correctly walk out and start gathering, then walk
  toward a point thousands of units away and never arrive, freezing their trip timer at 70%
  forever. Fixed by routing both to the villager's own `settlementAnchor()` instead — a confirmed
  no-op for every home villager. **This same latent bug would have hit Fenwick's own farmer/
  merchant the same way**, the moment a farmplot or market stall was ever placed at their
  settlement — never triggered in practice only because no such building has been placed there.
- [COMPLETE] ✅ **A second real bug found and fixed: completing a settlement's first errand could
  permanently re-offer it instead of ever surfacing the second, soft-locking the deed out of
  reach.** `DialoguePanel`'s quest-offer rotation was keyed on completed *main*-quest count and
  never excluded an already-completed *side* quest — for a single-slot pool where completing quest
  1 doesn't change that index, the just-finished errand could keep re-winning the slot forever.
  This exact 2-quest chain shape is shared byte-for-byte with Fenwick's own pre-existing
  `settle_scout`/`settle_clear` pair — a real, pre-existing gap this wave was simply the first to
  exercise on a fresh save. Fixed by skipping any already-completed side quest in the rotation, and
  hardened `acceptSideQuest` itself with the same check so a stale panel can never grant duplicate
  rewards.
- **Verified live, twice over — first the bug, then the fix.** The original bug was reproduced via
  a dedicated diagnostic (a resident sampled every 5s for 90s, frozen at the exact same coordinate
  the entire time) with a control check (a separate rAF/day-clock probe) ruling out browser
  throttling as a false-positive cause. After fixing, two independent ~300s+ sessions confirmed
  sustained walk→swing→haul→deliver cycles with real, repeated inventory deliveries (not a single
  lucky trip). The full recruitment→deed→resident-spawn→yield flow was re-verified end to end via
  real UI clicks, and Fenwick/template-08 was regression-tested through the same generalized code
  path with byte-identical behavior. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 27: the Trade Caravan — a wall-clock arbitrage loop between the two owned settlements — SHIPPED 2026-08-30

- [COMPLETE] ✅ **A real, honest design call: abstracted wall-clock, not a fake physical journey —
  re-verified live rather than forced to match the plan's own wording.** The plan text suggested
  reusing `haul.ts`'s AI hauling and `road.ts`'s `routeCells()`/`roadSegments()`; both were checked
  directly and neither survives contact with the live code. `travelTo()` only sets `destination`/
  `visitedWorlds` and queues a teleport — no entity of any kind crosses a scene boundary, and every
  AI `Agent` is spawned per-world (`rosterSync.ts`), with no mechanism to exist mid-transit between
  two instances that are not even the same coordinate space (Wave 18's scene-isolation
  rearchitecture is real and current). `road.ts`'s network never reaches a destination at all — it
  only connects the homestead to six home-map resource grounds; destination `origin.x/z` values are
  non-overlapping render-space bake slots, not real relative geography. Forcing either reuse would
  have meant building real inter-instance NPC travel as an unplanned prerequisite — exactly the
  disproportionate-scope trap the plan itself warned against. Built the same wall-clock way
  `foundSettlement`/`collectSettlementYield` already prove out instead: real epoch-ms timestamps, a
  deliberate player action, works whether or not you're standing there.
- [COMPLETE] ✅ **A second finding that reshaped the mechanic itself, not just its plumbing:**
  settlement residents' production already flows into the *same single global* `st.inventory` as
  home villagers, with zero transport step, today. A caravan that just "moved" items would have been
  mechanically inert — nothing costs anything to already have everywhere. The real, honest design
  space was a value-adding trade action instead: dispatch cargo at a markup over the flat merchant
  rate, with a real (mitigable, never total) risk of loss, insurable for a gold fee. Deliberately
  scoped to the one pair that makes this meaningful — Old Ruins ↔ Frozen Pass — not home↔settlement,
  which would trade nothing of real value per the same global-inventory finding.
- [COMPLETE] ✅ **Reuses `Villager.gear.carrier` for a genuine new purpose, not a second meaning
  bolted onto a dead stat.** The research pass first assumed the "Hand Cart" gear item was inert
  (no code path appeared to read it); the implementation pass traced it live and found it's actually
  real — `carryCapacityOf()` (`attributes.ts`) already folds `gear.carrier`'s bonus into
  `bb.carryCapacity`, read by `haul.ts`/`gather.ts`/`farm.ts` for AI trip caps. Dispatching a
  caravan now requires at least one resident at the origin actually wearing a Hand Cart — reusing an
  already-meaningful stat for a second real purpose, with the finding corrected in the shipped
  code's own comments rather than silently left wrong.
- [COMPLETE] ✅ **New mechanic, minimal new surface**: one new data file
  (`src/game/data/caravan.ts` — routes keyed by a sorted pair so a third settlement is a data-only
  addition later, pricing run through the exact same Wit/Silver-Tongue formula `sellItem()` already
  uses, no second pricing table invented), one new `CaravanRun` save-state shape (mirrored through
  all four of `settlements`' own save/load/reset touch-points), two new store actions
  (`dispatchCaravan`/`collectCaravan`, both re-validating everything the UI already disables —
  matching `acceptSideQuest`/`foundSettlement`'s "the store enforces it, not just the panel"
  discipline), and one extended (not new) `DialoguePanel` block reusing the exact same "talk to the
  settlement's own resident" access pattern Settlement Yield already uses. Zero new panels, routes,
  or hotkeys. Deepens the delivery-quest system with 3 new quests (`ruins_want_ore`/`pass_want_grain`
  reciprocal deliveries, `first_caravan` gated on a real `collectCaravan()` call via a new
  `'caravan'` `SideQuestDef.kind`), each cross-`requires`ing the *other* settlement's own closing
  quest id — confirmed live to work with zero new gating code.
- **Verified live end to end, covering every real branch, not just the happy path.** Real Chrome
  session (Playwright, off-screen): founded both settlements, then drove 6 separate dispatches
  through real UI clicks — item pick, qty stepper (clamped correctly at both ends), insurance
  checkbox, Dispatch — covering an uninsured undamaged collect (exact `SELL_PRICES × markup` payout
  match), dispatch from one settlement collected at the *other* (proves either resident can collect,
  not just the one who sent it), a forced-bad risk roll producing the correct partial-loss branch
  (`round(qty × 0.5)` survivors, exact formula match), the same forced-bad roll under insurance
  correctly bypassing the loss entirely, and a duplicate-dispatch attempt correctly refused with "A
  caravan is already on that road." while the first was still in flight. The wall-clock gate was
  checked both directions: an early collect attempt was refused with the real remaining-minutes
  message and no state change, and collection succeeded once `departedAt` was fast-forwarded past
  `etaMs`. All 3 new quests were driven end-to-end via real Accept/Turn-In clicks in dependency
  order, each granting the correct XP/gold. Confirmed the pre-existing Settlement Yield block and
  Alric's own Wave-13 delivery quest still render/offer correctly alongside the new block, with zero
  console errors across the full session. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently. One environment-only, non-code finding: the isolated worktree used for this wave
  was missing `public/assets`/`public/help` (both gitignored, not copied when the worktree was
  created), crashing every page load before any Wave-27 code ran — fixed locally for the
  verification session only by copying both directories from the main checkout; no tracked files
  were affected.

## Wave 28: ambient daily life — a third home-pond ritual anchor for unassigned villagers — SHIPPED 2026-08-30

Deliberately scoped small per the plan's own text: no new assets, no new animation clips (only 15
exist total, none of them sit/sleep/eat/use-object).

- [COMPLETE] ✅ **The plan's own premise for its "smart-object anchor system" corrected live.**
  `anchors.json`/`AnchorResolution.ts`'s system is real, but it's the AI reasoner's *work-target*
  resolver for `gather_resource`/`haul_to_deposit`/`tend_farmplot` — not a mechanism for ambient
  idling, and half its 8 authored rules (`bed`, `workbench`, `forge`) are unused by any action today.
  Extending it would have been the wrong lever. `TemplatePopulation.tsx`'s decorative-actor
  idle-fidget pattern (`useIdleFidget`/`FIDGET_CLIPS`, `RiggedFigure.tsx`) was confirmed real, but
  those figures never move — proven only for stationary set-dressing, not "going about their day."
  No well/bench/table/hitching-post prop exists anywhere in this codebase either, despite being
  named as example anchors in the plan's own text — a real drift from the plan caught before
  building anything around it.
- [COMPLETE] ✅ **A second, more consequential correction found mid-implementation, not just
  mid-research — and the redundant half of the design was DROPPED rather than shipped.** The
  research pass's first plan called for giving `Villagers.tsx`'s rendered wander-pause/ritual-hold
  branches their own local `FIDGET_CLIPS` timer, believing home villagers never get fidget variety
  today. Implementation checked this live before building it and found it factually wrong:
  `idle_fidget` (`ai/actions/ambient.ts`) has no tier/renderer gate at all (unlike `wander.ts`,
  which explicitly self-documents gating itself to tier-D specifically to avoid this exact
  collision) and already wins `Villagers.tsx`'s top-of-frame `PLAY_ANIM` intent check for any
  rendered home villager, proven with a live ~25s trace showing a clean ~8-10s fidget cadence
  already running. Adding a second, uncoordinated local timer would have double-driven the identical
  visual effect for no player-visible gain — a real "one arbiter" violation this codebase's own
  `wander.ts`/`Reasoner.ts` are otherwise careful about. Shipped only the genuinely new half.
- [COMPLETE] ✅ **What actually shipped**: unassigned (`job: 'idle'`) villagers get a third daily
  ritual window (mid-morning, alongside the existing market-stall-at-midday and campfire-at-evening
  windows) that sends them to the home `POND` — a permanent `FIXED_WORLD_PROPS` landmark every save
  has from the start, unlike the two player-built existing spots, so there's a real ambient
  destination even before a market stall or campfire has been raised. Generalized the previously
  hardcoded `1.8` ring-standoff into a `ringRadius` variable (unchanged for market/campfire; wider
  for the pond's own 8m radius) and reused the existing `waterAt()` shoreline guard (same call the
  wander branch already makes) so a shoreline mismatch falls through to plain wandering instead of
  parking someone mid-pond. One file touched: `src/components/world/Villagers.tsx`.
- **Verified live across the pond ritual and every existing/adjacent behavior it could plausibly
  regress.** A synthetic idle villager was tracked for ~102s real time: distance-to-pond decreased
  monotonically to the intended ring radius, clip alternated walk→rest correctly, and the
  pre-existing `idle_fidget` interruptions kept firing and cleanly resuming throughout — confirmed
  by two screenshots (a normal rest pose and a legitimate mid-gesture frame, no T-pose/stuck state).
  Regression-checked: the existing market/campfire rituals unaffected, the generic wander-pause
  fallback unaffected, a working lumberjack's modern Agent-driven gather path unaffected (it
  pre-empts this legacy cascade entirely), a live NPC dialogue interaction (Alric) still opens
  correctly, and spawning 40 simultaneous pond-eligible villagers produced no measurable FPS change
  (60.6→60.5 over a 2s sample). Zero console/page errors across every run. `npx tsc --noEmit` /
  `npm run build`: both clean, verified independently.

## Wave 29: a content-authoring batch — hand-picked SKU costs, an arch/cannon audit, per-destination ambience — SHIPPED 2026-08-31

Five catalog/config items, batched because they're all the same flavor of work: sit down and go
through the asset/data catalog rather than write new systems. Every item was re-verified live
against real code/asset data before touching anything — the research pass's own wording drifted
from live code on two of the five, in opposite directions from what a shallower read would guess.

- [COMPLETE] ✅ **Hand-picked SKU building costs — a genuinely bounded, mechanically-verified batch
  of 9, not a guess.** `Buildable.cost` stays the sole economy truth (`canAfford`/`addItems`/
  refunds/`maxHpFor` all read it unchanged) — a new optional `pieces?: {id,qty}[]` field and a
  `costBill()` helper (`buildables.ts`) are purely a render layer, wired into the two real
  buildable-cost UIs (`BuildBar.tsx`, `BuildingMenuPanel.tsx`'s charge-mount cost). The catalogue
  itself set the real scope: every `bricks.generated.json` SKU is priced in `wood`/`stone`/`plank`
  only — zero SKUs cost `iron_bar`/`iron_ore`/`flowers`/`gold` — so only buildables costed purely in
  those two-and-a-half families can get an exact bill without guessing a piece that doesn't exist.
  That's `tower`, `stonewall`, `keep`, `market_stall`, `storehouse`, `palisade`, `quintain`,
  `window`, `workbench` — 9 hand-authored bills, each verified by script to sum EXACTLY to the
  buildable's existing cost (`window`'s bill is literally 3× its own real mold). `gate`/`door`/
  `cannon`/`warcart`/`bladecart` and the rest stay on the family-total fallback, named here as the
  honest, larger follow-up rather than forced.
- [COMPLETE] ✅ **Arches audit — the suspected bug mostly didn't exist; the real find was a
  buried gatehouse.** Walkable-archway collision already shipped correctly (voxelized per-piece,
  `scripts/gen-collision.mjs`); the 3 short "Arch" pieces that fall back to a solid bbox are all
  0.42m knee-height variants where a walkable hole wouldn't matter anyway, not a live bug. The real
  find: `gen_16_l302721` ("Arch 4×12", 4.34m) is rig-verified (`part_roles.json`) to carry a genuine
  built-in portcullis sub-mesh — a real gatehouse sitting anonymously in the decor tab for 6 stone.
  Promoted to `gatehouse_arch` (stone 18 + iron_bar 2, gated like its sibling Drawbridge Front) and
  its shorter arch-only sibling to `garden_arch` (cheap, ungated decor). **A real gap the plan didn't
  anticipate, caught and fixed before shipping**: a fresh buildable id doesn't inherit the generic
  `gen_` id's voxelized collision (`scripts/gen-collision.mjs`/`collision.json` are both gitignored,
  regenerated pipeline output keyed by the *old* id) — fixed with a small in-source
  `COLLISION_ALIAS` table (`buildables.ts`) that redirects the lookup back to the real voxel data,
  durable across a pipeline rerun rather than a hand-edit to a file that would silently lose it.
- [COMPLETE] ✅ **Unused-asset audit — one real gap wired, one real asset promoted, one stale
  fact corrected rather than forced.** `l4105278` ("Powder Mine") was the genuinely unused 4th
  Destructor model — already lab-verified, already set-dressing at template-05, never offered to the
  player; wired in alongside its 3 already-shipped siblings. The "second cannon" claim turned out to
  be about the WRONG pair — "Cannon" and "Wall Cannon" are byte-identical files used twice, not two
  unused cannons — but a real, distinct, unused cannon mesh (`gen_12_l3207401`, 50KB vs 194KB,
  rig-verified base/barrel/plunger) was sitting generically catalogued as "Ornament 4×9". Promoted
  to `signal_cannon`. **A second real gap found and fixed while wiring it, not by blindly following
  the plan's own suggested capability shape**: mirroring the existing Cannon/Wall Cannon pair's
  `traits.wall`-kind capability shape would have shipped a second cannon that silently never fires —
  traced `labCanFire` line by line and confirmed it only ever reads `traits.vehicle.canFire`, which
  neither existing cannon capability entry sets, so `oc6096b4` ("Wall Cannon") itself doesn't
  actually auto-fire or manually fire today despite being a real placeable SIEGE buildable. Gave the
  new cannon (and, as a bonus fix, its two existing relatives) the real `traits.vehicle` shape every
  other working siege engine uses instead — verified end-to-end against `Emplacements.tsx`'s
  auto-fire scan and `PlayerController.tsx`'s manual-fire prompt, both of which now light up for all
  three. Also corrected a stale animal count: the plan's "2 unused Animal models" is off by one — the
  lab's own `isAnimal` flag names exactly one genuinely unused creature (`l3010301`, the bat-swarm
  mesh), not two; documented rather than forcing a second use that doesn't exist.
- [COMPLETE] ✅ **`LEARNED_PART_LEXICON.json` — confirmed it doesn't even live in this repo, and
  left unconsumed, correctly.** It exists only in the sibling lab repo, never copied across by
  `prepare-assets.mjs`. Read directly: it's a coarse family-average bootstrapping aid for a human
  *labeling* new, unverified rig subjects, not gameplay ground truth. Every consumer the plan named
  (`walls.ts`'s wall-connection logic, `labCapabilities.ts`, `minifigRig.ts`'s spatial fallback)
  already runs on strictly better, fully-populated, per-piece verified data — using the lexicon's
  coarser family-average priors there would be a downgrade, not a fix. No code changed for this item;
  its real, correct future use (seeding a human labeler's guesses when NEW warehouse assets are
  imported) is named for whenever that day comes, not built speculatively now.
- [COMPLETE] ✅ **Per-realm ambience/wildlife audit — confirmed real, and fixed at its actual
  root.** `audio.ts`'s ambience loop was one hardcoded global pool with no destination parameter at
  all, and `<Falcon/>`/`<Bat>` (`Wildlife.tsx`) had no destination gate whatsoever — unlike `<Horse>`
  right next to them, which already checks `world === destination`. Added `WorldDestination.ambience`
  (`worlds.ts`: `'meadow' | 'mountain' | 'ruins' | 'silent'`, absent = today's behavior everywhere),
  hand-tagged by real content (Frozen Pass → mountain; Siege Camp/Old Ruins → ruins; dungeon/arena →
  silent), and a biome-aware `audio.ambienceBiome` (re-read live each loop beat, same pattern as the
  existing `nightMode`) wired from the one place that already touches `audio` off live destination
  state every frame (`DayNight.tsx`) — all four pools built from sounds already in `SOUNDS`, no new
  audio assets. **One deliberate deviation from the plan's literal wording**: the TAMED falcon (a
  real companion whose resource-node pings are explicitly designed to work "away from home") stays
  visible everywhere, exactly like Tam the squire or the player's own horse — only the untamed,
  purely-ambient bird (and the 3 ambient bats, which have no companion state) got the meadow gate.
  Gating the companion too would have silently regressed an already-shipped feature to satisfy the
  letter of "hide the falcon everywhere" rather than its actual intent.
- **Verified via full type-check and production build, not just a read-through.** `npx tsc --noEmit`:
  exit 0, zero output. `npm run build`: exit 0, compiled successfully, its own lint+type pass clean,
  all 14 routes/static pages generated with no errors or warnings beyond Next's pre-existing
  workspace-root notice (unrelated, present before this wave). Every hand-authored cost bill
  script-verified to sum exactly to its buildable's real cost before being hardcoded; every new/
  patched asset id (`gen_16_l302721`, `gen_14_l302720`, `gen_12_l3207401`, `l4105278`, and their
  `.glb`/`.png` pairs) confirmed to exist on disk; the cannon-firing fix traced end-to-end through
  both `Emplacements.tsx` (auto-fire) and `PlayerController.tsx` (manual-fire prompt) against the
  real predicate chain rather than assumed from the capability shape alone.

## Wave 30: destination terrain-classification audit — a real walkable-area gap found and fixed at template-04, two others re-confirmed correct — SHIPPED 2026-08-31

Three items, all re-verified live against the real classification tooling and raw layout data
rather than trusted from the plan's own wording — one confirmed a real, measurable bug; two
re-confirmed the existing classification was already correct.

- [COMPLETE] ✅ **template-04 ("The Siege Camp") was walled off from ~94% of its own diorama by a
  genuine, measured classification gap, not a coordinate pick — found, fixed, and live-verified.**
  The bake's layout data has exactly 2 `kind:"terrain"` groups: a 4×4 lab-meter core clearing
  (`terrain_green_flat`) and a 14.8×16.1m rolling mound (`terrain_green_mound`, height range
  0.32–2.02m) that fully contains it. Only the flat patch was ever classified walkable — the mound
  sits squarely in the same height band the project's own 2026-08-21 correction pass already used to
  fix the identical "small core patch nested inside a larger base plate" shape on 4 other templates,
  but template-04 is one of only 3 destinations with no resident NPC, so the live-raycast regression
  check that caught this exact mistake elsewhere never ran here. `guilds.ts`'s own 2026-08-21 comment
  had already flagged this as a known, deferred follow-up. **Measured, not theoretical, effect**: the
  real per-frame walkable clamp in `PlayerController.tsx` hard-walled the player back from solid,
  textured ground 45+ world units outside the old ~300×300-unit rect — the Siege Camp was by far the
  smallest walkable destination of the 8, purely from this oversight. Fixed by adding
  `terrain_green_mound` to the real classification tooling (`scripts/generate-walkable-footprint.mjs`,
  gitignored/local-only) and regenerating the committed `templateWalkableFootprint.generated.json` —
  additive-only, every other template's output byte-identical. Verified live: 7 points scattered
  across the newly-reachable mound area all accept with exactly 0.000 clamp displacement (previously
  walled back into the old rect); a negative-control point placed outside the entire new union still
  correctly displaces 1181 units back to the nearest edge, proving the clamp itself wasn't
  accidentally disabled; the original arrival spawn and Builders' Guild-hall prompt are completely
  unaffected; clean textured terrain at multiple sampled points, zero console errors. `guilds.ts`'s
  2026-08-21 comment updated with a dated addendum so the flagged follow-up no longer reads as open.
- [COMPLETE] ✅ **template-01's `terrain_steep` and template-07's `mountain_c`/`mountain_snow_a`:
  re-checked with materially better tooling than was available when first classified, and
  re-confirmed correct — no change made.** All three groups' bboxes are fully nested inside (or, for
  template-07's pair, fully covered by the union of) already-walkable neighboring groups — hand-
  authored detail sub-features of an already-correct landmass, not orphaned classifications. Verified
  independently from the raw source layout JSONs (exact bbox containment math, not just re-reading
  the prior pass's own conclusion) and live: dense multi-point raycast grids confirm real, continuous
  terrain with no voids; photo-mode screenshots at bbox centers and several scattered points show
  real hillside/mountain-backdrop vistas, never a floating island; and — a genuinely new fact this
  pass surfaced — destinations have **no slope-based movement gate at all** in `PlayerController.tsx`
  (`floorY` is set directly from ground height every frame, no max-climb-rate check), so "steep"
  classification carries zero gameplay-mechanical weight beyond the already-correct XZ boundary.
  Wave 26's Frozen Pass content (Torvald, the Woodsmen's Lodge) was regression-checked directly at
  template-07 and confirmed completely unaffected — neither NPC nor claim point sits anywhere near
  either mountain group's bbox.
- **Verified live and via independent raw-source re-derivation, not just re-reading the research/
  implementation reports.** `npx tsc --noEmit` / `npm run build`: both exit 0. Every one of the three
  items' bbox claims was independently re-derived from the raw external layout JSONs rather than
  trusted from the prior pass's summary. Full live session through onboarding, all three destinations,
  multiple teleports/screenshots per item — zero console errors throughout.

## Wave 31: home elevation — the systemic fix, plus a second authored region (West Fell) — SHIPPED 2026-09-01

The single largest item in the whole 15-wave plan, done as INFRASTRUCTURE for the whole home map,
exercised on two regions instead of converting the whole map in one pass: everything genuinely
map-wide is fixed completely, for every actor, everywhere — only the newly-authored terrain content
itself stays small.

- [COMPLETE] ✅ **`game/data/downs.ts` → `game/data/terrainRegions.ts`: the single hardcoded North
  Downs box generalized into a data-driven `TERRAIN_REGIONS` list, and a second region (West Fell,
  x:-100 z:-94 half:34 — the Downs box translated 100m in x, same z-depth/size) authored on it.**
  Every numeric safety margin the Downs box already proved (clear of the build fence and dig reach —
  both z-only tests that transfer regardless of x; well inside the 200m nav grid with 66m of margin;
  clear of every GROUNDS entry/road, all at z ≥ 18) transfers automatically. Verified, not assumed:
  a standalone numeric replica of the module's own dev-mode gradient/rim self-check confirmed West
  Fell's crown (r=28, h=5.6) reaches a max gradient of 0.314 — under DOWNS_MAX_GRADIENT=0.34, with
  margin comparable to the Downs' own 0.335 — before the numbers were committed, exactly as the plan
  required ("these are starting numbers to be confirmed silent-on-first-load"). `Terrain.tsx`'s
  `HomesteadDowns()` became `TerrainRegions()` (one shared registered root — a `surfaceGroup` holding
  only real walkable mesh, never a region's Cairn landmark, which stays a raycast-excluded sibling)
  rendering one `TerrainKnollSurface`/`Cairn` pair per `TERRAIN_REGIONS` entry; `homeGroundY`
  (TemplateWorld.tsx), Minimap.tsx's height bands, and navTerrain.ts's exclusion list all now derive
  from the array instead of one hardcoded box — a third region is a one-line data append with zero
  further code changes anywhere in those files.
- [COMPLETE] ✅ **Every hardcoded flat-ground NPC/villager/prop site at home converted to the real
  elevation query, not just the sites the original Downs prototype happened to touch.** Villagers.tsx
  (8 sites, via a per-figure `villager.world`-gated ternary — also a genuine BONUS BUG FIX: a
  settlement resident at a claimed destination plot was calling neither ground function before this,
  floating/sinking on any sloped destination bake regardless of anything home-specific), Npc.tsx
  (its already-ternary site plus 4 provably-home-only sites, confirmed via `npcSync.ts`'s own
  `scheduledCourtNpcs` gate), Wildlife.tsx's grazing horses (swapped to the canonical wrapped
  functions, picking up `destinationGroundY`'s Battle Dome floor-clamp for free), RaiderRam.tsx,
  Merchant.tsx, Grounds.tsx's boundary stones/plot stakes, and Defenders.tsx's `postY` computation
  (only its two non-elevated branches — the elevated branches' own bases were already correct and
  independently verified: `keepPart.walkway` is keep-relative, `station.y` already flows from
  evalPlacement's now-elevation-aware base). `PlayerController.tsx`/Enemies.tsx/Companion.tsx were
  already correct (confirmed live, no change) — Enemies.tsx's own comment claiming to be "the ONE
  NPC-side y=0 the elevation prototype touches" was updated, since Wave 31 is exactly what closes
  that gap for the sites it used to correctly describe as deliberately left alone.
- [COMPLETE] ✅ **InstancedProps.tsx's one real render choke point fixed once, not four separate call
  sites patched.** Added optional `InstancedNode.y`, defaulted to 0 at the single `<Instance
  position={[n.x, n.y ?? 0, n.z]}>` line; ResourceNodes.tsx's tree/rock/herb groups and Grounds.tsx's
  fence nodes (the only callers positioned to know their own region) now compute it. Confirmed a
  second, PRE-EXISTING bug closed for free: every instanced tree/rock/herb already floated on any
  non-flat DESTINATION bake, home terrain aside, since this path never read a ground height at all.
  DungeonScene.tsx's `wallNodes` deliberately left untouched — its own flat, bespoke floor convention
  is unrelated to home/destination terrain.
- [COMPLETE] ✅ **Two real structural gaps closed: `evalPlacement`'s flat build-region floor, and the
  keep's completely missing elevation.** `evalPlacement` now computes `homeGroundY(x, z)` for the
  home branch instead of a hardcoded `groundY: 0` (the claimed-destination-plot branch is untouched,
  a deliberate existing simplification) — confirmed self-contained, since that field is read only
  inside `evalPlacement` itself. `KeepState` had no `y` field at all: `placeBuilding`'s keep branch
  computed a correct `y` via `evalPlacement` and then silently discarded it, calling `foundKeep(x, z)`
  with no `y`, which itself hardcoded `y: 0` on the synthetic `PlacedBuilding`. Fixed end-to-end:
  `foundKeep(x, z, y)`, `KeepState.y`, `keepWalkwayAt` folding in `keep.y` only when a real walkway
  applies (its "no walkway" sentinel stays EXACTLY 0 — callers depend on that meaning "no override"),
  `KeepAssembly.tsx`'s outer group position, and — the subtle one, independently verified against the
  real source before being touched — `ConstructionSiteModel`'s `worldY` prop, which feeds a raw
  `THREE.Plane.constant` clip plane evaluated in ABSOLUTE WORLD SPACE per that file's own header
  comment, never transformed by the parent group. Without that last fix, an in-progress keep piece on
  elevated ground would rise correctly but clip at the wrong absolute height. All of this is real
  infrastructure with **zero observable behavior change today**: the keep can only ever be placed
  inside the buildable fence, which never overlaps a `TERRAIN_REGIONS` box (the dev-mode fence check
  in terrainRegions.ts guarantees it), so `keep.y` is always 0 in practice — plumbed correctly for
  whenever that stops being true, not a hardcoded assumption papered over.
- [COMPLETE] ✅ **Road plates and dug-water overlays now follow real elevation; the rain/snow field's
  own already-live bug fixed first and independently, as instructed.** Road.tsx's plates sample
  `homeGroundY(t.x, t.z) + 0.02` instead of a fixed `0.02`; `DugWater`'s group samples
  `homeGroundY(w.x, w.z)` with `BANK_Y`/`WATER_Y` staying relative offsets on top — both systemic,
  zero visible change today since no road leg or diggable waterway sits near a terrain region.
  Weather.tsx's rain/snow particle field was a REAL, independently-live bug: pinned to world Y=0
  following only the camera's X/Z, so rain already clipped through the existing Downs hill before
  this wave touched anything else — fixed to sample `homeGroundY`/`destinationGroundY` each frame,
  verified first per the plan's own explicit sequencing.
- [COMPLETE] ✅ **navTerrain.ts's exclusion list generalized to `TERRAIN_REGIONS.map(...)`** — West
  Fell is unroutable by construction the moment it exists in the data array, zero new logic beyond
  what the Downs already proved; the module's own dev-mode assertion (checking every region actually
  resolves 'blocked') generalized the same way.
- **Explicitly deferred, named rather than silently dropped, per the plan's own instruction:** AI
  pathfinding height-awareness at home (real slope-based step-cutting) — three independent structural
  blockers in `navgrid.ts` (a hard `mode==="window"` gate in `ensureHeights()`, a destination-only
  mounted-root singleton `rasterizeHeights()` reads with no getter for home's separate always-mounted
  terrain root, and a fixed grid's permanent-no-op `recentre()`) plus an unquantified ~34x
  whole-map-heightfield rasterization-cost question — `navgrid.ts` itself was NOT touched this wave,
  confirmed by `git status`. A visual "paint elevation" world-editor tool — no existing procedural
  heightfield generator to extend (`scripts/prepare-assets.mjs` never references
  `grounds.generated.json`/`landTiers.generated.json`; they are hand-edited data despite the filename
  convention), stays its own future project. True carved water (an excavated hole in the mesh, vs.
  the elevation-following overlay this wave ships). `terrainConflict()`'s missing slope check and the
  build aerial camera's flat mouse-raycast catcher plane in BuildController.tsx — both confirmed
  live, provably unreachable given where the two terrain regions actually sit (their box always lies
  entirely outside `landHalf(MAX_LAND_TIER) + DIG_OUTSKIRT` = 56m on the z-axis alone, regardless of
  x — the same z-only guarantee that makes West Fell's own placement safe).
- [COMPLETE] ✅ **A genuine BLOCKER found by live verification and fixed: importing `homeGroundY`
  into `gameStore.ts` for Part 4 (above) closed a real circular import that crashed the entire game
  on first load, in both `next dev` and a production `next build` + `next start`.** `npx tsc --noEmit`
  and `npm run build` both reported exit 0 throughout — this is a runtime module-evaluation-order bug,
  invisible to either check, only observable on a real page load in a real browser (exactly why this
  wave's own verification instructions required driving one). Root cause traced exactly:
  `gameStore.ts → TemplateWorld.tsx → DungeonScene.tsx → Buildings.tsx → siege.ts → combat.ts →
  difficulty.ts`, and `difficulty.ts` calls `useGameStore.subscribe(refresh)` at its own module scope
  (not deferred) — closing a cycle back onto `gameStore.ts`'s own not-yet-initialized `useGameStore`
  binding. Confirmed live: `ReferenceError: Cannot access 'useGameStore' before initialization` on
  the very first page load; confirmed via an identical test against unmodified `main` that the crash
  does not exist without this wave's changes. This is the same class of bug `src/ai/core/
  AgentManager.ts`'s own header already documents hitting once before, via a different edge into the
  identical `DungeonScene → Buildings → siege → combat → difficulty` chain — fixed there, and here, by
  inverting the dependency rather than reasoning a new edge was safe. **Fix**: `homeGroundY` and
  `registerHomeGroundRoot` were pulled into a new, genuine leaf module, `src/game/homeGround.ts`
  (imports only `three` and the pure-data `terrainRegions.ts` — independently confirmed, transitively,
  to have zero path back to `gameStore.ts` through any of its own dependencies). `TemplateWorld.tsx`
  now imports from that leaf module and re-exports both names, so every pre-existing
  `from './TemplateWorld'` call site (Villagers.tsx, Defenders.tsx, Terrain.tsx, Weather.tsx, etc.)
  kept working completely unchanged — only `gameStore.ts`'s own import needed to move.
- **Verified live end-to-end, not just via `tsc`/`build`, and independently re-confirmed a second
  time during final review.** Full session through real character creation into the live game world
  (headless Chrome, off-screen, `--use-angle=d3d11`) confirmed: zero console/page errors in both
  `next dev` and a clean production `next build`+`next start`; `window.__kkworld.homeGroundY(0,-94)` =
  `5.5` (Downs) and `homeGroundY(-100,-94)` = `4.7` (West Fell) — both exactly matching the numbers
  the fix pass independently reported; the generalized `[terrainRegions]`/`[navTerrain]` dev-mode
  self-checks silent throughout; `window.__kknav.navBlocked` confirms both region centers blocked and
  the open meadow clear, with correct behavior right at a region's edge boundary; a keep founded via
  the real store API threads a real, non-hardcoded `y` end-to-end. One additional real gap found during
  this final review, not caught by the wave's own verify/fix passes: `BuildController.tsx`'s aerial
  build camera's `cam.lookAt(c.x, 0, c.z)` — a distinct, real fix the plan asked for in Part 4c,
  separate from the deliberately-deferred mouse-raycast catcher plane above, that had been silently
  conflated with that deferral and dropped. Fixed to `cam.lookAt(c.x, lookY, c.z)`, sampling
  `destinationGroundY`/`homeGroundY` depending on whether a claimed destination plot or the homestead
  is being built on (`destination` was already read in this component) — cosmetic (no gameplay-
  blocking effect today, since the build fence never reaches elevated ground), but real, and now
  closed rather than left as a quiet gap. `npx tsc --noEmit`: exit 0, zero output, re-confirmed after
  this addition.

## Wave 32: progression & economy polish — talent respec, merchant/builder trait depth, calling starter perks — SHIPPED 2026-09-02

Three independent items. The third was a real design fork the plan explicitly flagged for a direct
ask rather than a default pick — the user was asked and chose to add real content, reversing an
earlier deliberate design decision.

- [COMPLETE] ✅ **Talent-tree respec — the exact mirror `respecAttributes` (Wave 9) never got.**
  `talentRespecCost()` (`skillTree.ts`) reuses `RESPEC_BASE_GOLD`/`RESPEC_GOLD_PER_POINT` verbatim
  rather than inventing a second pricing model — one respec economy in the whole game, not two.
  `respecTalents()` (`gameStore.ts`) is a full reset only (no per-node refund), a deliberate choice
  that's even more apt here than for attributes: talents are tier/prerequisite-chained, so a partial
  refund would have to validate which nodes can be dropped without orphaning a child tier, and a full
  wipe sidesteps that entirely. UI: the same two-click arm/confirm button `AttributesSection()`
  already uses, added to `TalentTree()`.
- [COMPLETE] ✅ **Merchant/builder trait-pool depth brought up to the established 3-slot standard.**
  Every gathering job (lumberjack/miner/farmer/herbalist/fisherman) plus defender already had 3 slots
  (a flat-haul trait, a side-goods trait, a Swift-Return trait); merchant had 2, builder had 1.
  Building has no per-trip structure the way gathering does, so the new traits' shapes were reasoned
  from the mechanic each job actually has, not copy-pasted: **Windfall** (merchant's missing
  side-goods slot) rolls the same craft-scaled chance every other side-goods trait uses, paid out as
  bonus gold on a trade run since merchants have no second item to bring home. **Extra Hands**
  (builder) adds a flat +0.5 to a builder's own construction "weight," mirroring the flat, non-
  percentage shape of jobs' "+1 X every trip" traits rather than duplicating Steady Hands' own
  multiplier. **Salvage Eye** (builder) rolls its chance once per COMPLETED construction piece — the
  closest honest analog to "once per trip" for a job that has no trips — detected via a real
  before/after `built` threshold check around the existing `constructBuilding` call, not a new timer.
- [COMPLETE] ✅ **Calling starter perks — a real design fork put to the user directly, and answered
  toward reversing an earlier deliberate decision.** Every one of the 8 callings' `kit` field has been
  a genuinely empty object since a 2026-07-20 rework that intentionally removed starting gear
  ("creation was never meant to hand out a head start"), and the character-creation screen still told
  the player exactly that. Asked directly whether to keep that design or add real differentiation;
  the user chose to add it. Built as a NEW `passiveLabel`/`passiveDesc` field pair (not a repurposed
  `kit`, and not a literal item grant — the same shape `GuildDef`'s own passives already use), one
  small always-on mechanical nudge per calling in its own signature skill, each deliberately
  calibrated SMALLER than the matching guild passive and the matching tier-1 talent where one exists
  (a lifelong knack, not a substitute for earning a guild's respect or a talent). Wired into 7 real
  mechanics: `harvestNode` (Woodsman wood chance, Quarryman ore chance), `plantPlot`/`tendPlot`
  (Farmhand grow time), `constructBuilding` (Artisan swing weight), `useTool` (Smith's Prentice wear),
  `biteWindowMs` (Angler reaction window), and `playerAttack` (Page — deliberately hung on stamina
  cost rather than flat damage, since the Knights' Order guild and a combat talent already own that
  axis; a same-magnitude damage bump would read as tying an earned bonus, not undercutting it). The
  Wanderer (no signature skill) gets its own small universal haggle nudge on both `sellItem` and
  `buyOffer` instead of a forced skill hook. `CharacterCreator.tsx`'s copy updated honestly — the old
  "never a head start" framing is gone, replaced with real, specific per-calling text.
- **Verified live with real measurements, not a vibe check.** Real Chrome session driving the actual
  compiled runtime through the game's own debug hooks (`window.__kk`/`__kkAttack`/`__kkc`/etc.), not
  mocks: 43 assertions across 4 real character creations. Talent respec: bought real talents, confirmed
  the button's exact cost (55 gold for 2 points, matching `25+15×2`), confirmed it refuses at 0 gold,
  confirmed a funded respec wipes the tree and deducts the exact cost, confirmed a clean rebuy after,
  confirmed the pre-existing attribute respec is completely unaffected. Trait pools: confirmed live
  Roster-panel slot counts (merchant 2→3, builder 1→3), granted all new traits, and measured each
  effect in isolation against a no-trait control — Windfall raised average merchant gold/trip over 300
  trips matching the formula's expected value, Extra Hands raised construction rate from 0.04 to 0.06
  built/sec (exact +0.5-weight match), Salvage Eye roughly doubled scrap recovered over 150 completed
  pieces. Calling perks: 7 of 8 hooks measured live and isolated via same-character classId toggling —
  Woodsman/Quarryman via Monte Carlo sampling (n=500), Farmhand/Artisan/Prentice/Page/Wanderer via
  exact deterministic math matches (e.g. `plantPlot` grow time 200→192 = exactly ×0.96); the 8th
  (Angler's fishing bite-window) could not be captured via a real 3D fishing interaction in headless
  Playwright (this codebase's own history already documents pointer-lock fishing as unreliable to
  simulate) and was instead confirmed via direct source read of the shared, already-proven
  `callingSignature()` helper plus a clean build — flagged honestly as a code-path confirmation, not a
  live capture. `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

## Wave 33 (FINAL): performance & platform completion — gamepad rebinding, KTX2/Basis pipeline, a real destination-AI pathfinding bug — SHIPPED 2026-09-02

The last wave of the 15-wave "Wave 19 onward" plan. All three items diverged from the plan's own
wording, in three different directions — re-verified live rather than trusted, per this whole
batch's established discipline.

- [COMPLETE] ✅ **Gamepad button rebinding — the real, in-scope half built; the real, out-of-scope
  half named honestly.** `gamepadInput.ts`'s own header comment saying rebinding is "a real, separate
  project" turned out to be about a different, harder problem than the plan implied: folding gamepad
  buttons into `keybinds.ts`'s keydown-**event** table (the 14 panel actions, and PlayerController's
  own hardcoded jump/interact/sprint/d-pad reads) genuinely would need either polymorphic binds or a
  rewritten frame-polled switch — that stays unbuilt, named as real future work. But the 8 actions
  `GAMEPAD_BUTTONS` already owned (`attack`/`block`/`swapWeapon`/`pause`/`cancel`/3 menu toggles) were
  **already** frame-polled with hand-rolled edge detection in their only two consumers — making those
  genuinely rebindable was real, in-scope work, done via the exact same default-table + settings-
  override + merge-on-load pattern `keybinds.ts` already uses. `RESERVED_GAMEPAD_BUTTONS` (the 7
  indices PlayerController hardcodes) blocks a player from stealing e.g. "A" away from jump. A real
  correctness subtlety caught and fixed: `GamepadMenuController.tsx`'s `TOGGLE_PANEL` array used to be
  built once at module-load time — a rebind would have needed a page reload without resolving live
  button indices every frame instead.
- [COMPLETE] ✅ **Texture compression (KTX2/Basis) — the runtime half fully built and positive-path
  verified; the encoder half honestly blocked on a real, undocumented external gap.** Confirmed live
  that `gltf-transform` genuinely installs and runs, but its KTX2 commands shell out to a separate
  `ktx` CLI binary (KTX-Software project) that isn't an npm package and isn't in this machine's
  package managers — a real external-tooling gap the plan's "buildable today with existing tooling"
  didn't call out. What shipped: a shared `useKtx2ExtendLoader()` hook (self-hosted transcoder,
  `public/basis/basis_transcoder.{js,wasm}` copied byte-for-byte from `three`'s own npm package, not
  a CDN dependency) wired into all 4 real `useGLTF()` call sites, and a pipeline step chained onto
  `npm run prepare-assets` that degrades gracefully (prints an actionable message, exits 0, touches
  nothing) when the encoder binary is missing rather than breaking the build for anyone without it.
  The loader is a genuine no-op today (zero current assets declare `KHR_texture_basisu`) — but
  verify built a temporary harness against a real official Khronos `KHR_texture_basisu` sample GLB
  and got a correctly-textured positive-path render, real proof the wiring itself works, not just an
  absence-of-error check. Producing an actual compressed game asset is named explicit future work,
  blocked on installing the external `ktx` binary by hand.
- [COMPLETE] ✅ **Destination AI nav-grid fidelity — the plan's specific claim didn't hold, but two
  real, more serious bugs were found and fixed in its place.** "Reuse road geometry at destinations"
  turned out to have no data to reuse from — checked the real map-layout JSON for both claimable
  settlements directly: zero road/path groups, undifferentiated terrain only. Home's own Wave 17 #6
  fix was grid-widening, not road-following; the road-cost-preference mechanism is deliberately
  home-only (destination coordinates don't correspond to any road polyline). Instead, live
  investigation found: (1) `Villagers.tsx`'s legacy per-frame steering state never set `.region`, so
  `navSteer` always resolved every settlement resident to the **home** nav grid — always out of
  bounds at real settlement coordinates (~2800-3100 units out), so `findPath` always returned `null`
  and every settlement resident beelined straight through walls and buildings, 100% of the time (the
  other half of the exact bug class Wave 26 already fixed on the reasoner/Agent side — this is the
  older parallel legacy-cascade system that fix never touched). Fixed with one line,
  `region: villager.world ?? null`, provably a no-op for home villagers. (2) Found incidentally while
  fixing (1): the settlement builder branch had no world filter at all — a settlement's own builder
  could target an unrelated unbuilt site anywhere in the save. Fixed with the same world-match guard
  already used elsewhere in the same file. **A third, more fundamental bug found during verify itself,
  not disclosed by the initial implementation's own report**: a destination/window-mode `NavGrid`'s
  `rebuild()` — the method that bakes real buildings into obstacle data — is never called anywhere in
  the app for any non-home, non-dungeon region (only `homeGrid` and the dungeon grid get one). So even
  with region resolution fixed, a settlement resident's path correctly targeted the right grid but
  that grid's obstacle data was permanently empty — a real building placed at a settlement was
  invisible to pathfinding. Fixed by piggybacking on `Enemies.tsx`'s existing 1Hz nav-tick (the exact
  guard `AiRuntime.tsx` already uses for the same call), a genuine no-op on the common case since
  `rebuild()` itself already short-circuits on unchanged building-array identity. The road-preference
  gap itself is real but is a content-authoring gap (no road ever hand-placed at either settlement
  diorama), not an architecture one — named as explicit future work, not attempted.
- **Verified live, and verify pushed past the initial implementation's own claims rather than
  rubber-stamping them — exactly the discipline this whole 15-wave batch has followed throughout.**
  `npx tsc --noEmit` / `npm run build`: clean, twice over (implementation and post-fix). Gamepad:
  fully verified end-to-end with a simulated virtual gamepad overriding `navigator.getGamepads` (the
  real API the game itself polls) — rebind flow, `localStorage` persistence surviving a fresh page
  load, and the rebind actually being respected by the real per-frame polling code, confirmed
  repeatably. KTX2: independently re-confirmed the `ktx` binary gap via two separate real install
  attempts (both failed for real, documented reasons), then proved the runtime loader's positive path
  against a genuine external sample asset. Nav-grid: measured the real bug's live effect
  (`findPath` returning an identical straight line through an injected, correctly world-scoped
  obstacle before the fix's rebuild ever ran; a real 4-8-waypoint detour appearing after), with a
  same-shaped control test at home confirming the obstacle geometry and A* itself were never the
  problem. Zero console errors across every live session. This closes the "Wave 19 onward" plan in
  full — all 15 waves (19-33) shipped, merged, documented, and independently reviewed.

## Wave 34: real axe weapon mold, castle-catalog & correctness batch (G1 + G6) — SHIPPED 2026-09-03

First wave of the new 27-wave "Wave 34 onward" plan. Every claim was re-verified live against real
files/data before building (part_roles.json, capabilities.json, real GLB accessor bounds, a
sibling-repo orientation catalog) — several small drifts from the plan's own wording turned up, and
two genuinely new bugs (beyond what the plan named) were found and fixed in G6.8.

- [COMPLETE] ✅ **G1 · a real axe weapon mold.** `part_roles.json` really does chart a real,
  rig-verified `axe` role — re-counted live at 19 exact `axe`/`axe_L`/`axe_R` hits across 11 donors
  (the plan's "21 across 12" folded in two `axe_holder`/`axe_holder_brick` mount parts that aren't
  the axe itself — a small wording drift, not a wrong conclusion). Diffed the two minifig
  candidates' raw OBJ blocks byte-for-byte: `minifigcedricbull04.033_shape17` and
  `minifiggilbertbad01.031_shape15` share identical 56-vertex/36-face geometry and the same
  `glit042_s50t0` material — a real tie, broken by `preload.ts`'s `ENEMY_DONORS` already warming
  Gilbert's donor (a live enemy) but not Cedric's `04` variant, so picking Gilbert costs zero new
  asset fetches. Wired into `weaponParts.ts` with the exact same donor/role/grip-derivation shape
  every other weapon there uses (no changes to `loadWeapon()` itself), `length: 0.58` (a one-handed,
  shield-paired reading, closer to the sword's own 0.62 than the mold's literal ~0.83m scale-up).
  `Viewmodel.tsx`'s procedural `<Axe/>` placeholder is now a `<RealWeapon id="axe">` sibling reusing
  `MOUNT.tool`'s existing rotation, with `<Axe/>` kept only as the loading-state fallback. Corrected
  the same now-false "no mold exists" premise everywhere it was repeated:
  `Viewmodel.tsx`'s tool-block comment and `armor.ts`'s procedural-precedent list (which was about
  armor, not weapons, but had copied the same claim).
- [COMPLETE] ✅ **G6.1 · `mc002`/`mc008` promoted to placeable Buildables.** Both confirmed
  `rigStatus:"verified"` real wall pieces in `capabilities.json`, previously only static decoration.
  Real GLB accessor bounds confirm `mc002` is byte-identical raw geometry to the already-promoted
  `mc001` (a banded-corner variant) and `mc008` is byte-identical to `mc006`/`mc009` (a windowed
  straight, no `hasHole`/`isRuined` — an intact piece), so both got that twin's exact size/cost.
  Bonus finding along the way: checked `collision.json` (the newer per-piece voxel pipeline) and
  found it already covers `mc001`/`mc005`/`mc006`/`mc009`/`mc010`/`stonewall`, which take priority
  over the older `WALL_CORE` table — meaning `mc008`'s existing `WALL_CORE` entry was **dead** until
  this promotion made it live (and correct), not stale in the way the plan worried. Added the same
  entry for `mc002` (no `collision.json` shape exists for it either).
- [COMPLETE] ✅ **G6.2 · `oc6095-1`/`oc6096b5` real interactables — the plan's own framing corrected
  along the way.** Both traits confirmed live (`hasSkeleton`/`hasStandSpot`/`hasFlags` on one,
  `hasSpringboard`/`canLaunch`/`launchPartUncertain` on the other). But the plan's "promote the
  existing decoration to interactable" isn't literally possible: computed each one's actual rendered
  position with the real runtime bake-centering + scale-compensation math and found both sit deep in
  unreachable background diorama scenery (~4.4× and ~3.1× past their template's own radius) — the
  same "distant procession figure" failure mode this codebase already documents for the King Leo
  marker. Fixed the same way G2-G5 already did for `oc6094-1`/`oc6032b4`: a real, placeable Buildable
  copy (leaving the unreachable decoration and its `gen_` brick duplicate untouched), with a real
  interaction wired onto the placed instance — a repeatable flavor-text examine for the skeleton
  display (`markLoreSeen`/`loreSeen` was the plan's suggested reuse, but that array is genuinely
  NPC-lore-scoped by its own doc comment, so this uses a plain repeatable `notify` instead rather
  than putting a building id in an "NPC ids" array), and a real jump-boost (`vel.current.y = 11`,
  reusing the exact fall/landing physics a normal jump already has) for the springboard — framed as a
  player boost rather than a fired projectile specifically because the lab flags
  `launchPartUncertain`. New `labCanLaunch()` predicate mirrors `labCanFire`'s shape so any future
  `canLaunch` piece lights up for free.
- [COMPLETE] ✅ **G6.3 · enemies spawning inside a building's own footprint.** Confirmed live:
  `Enemies.tsx`'s night-skeleton spawn reroll only checked `insideWalls()` (the outer wall boundary),
  genuinely blind to a building placed inside that yard. One-line fix, exactly as cheap as the prior
  research predicted — added `navBlocked()` (already exported, already cheap, already rebuilt from
  every placed building's real collision boxes) to the same reroll's condition.
- [DOCUMENTED, NOT REPRODUCED] **G6.4 · building-placement first-load stutter.** Confirmed live that
  `preloadCommonAssets()` warms **every** current Buildable's GLB unconditionally at every graphics
  tier — there is no such thing as an un-warmed buildable model in this codebase today, closing off
  the "cold cache, unwarmed piece" branch entirely (also means this wave's own new mc002/mc008/
  oc6095-1/oc6096b5 pieces get preloaded for free, zero extra wiring). The one theory still standing
  is a narrow timing race — a large, rarely-touched model (Siege Tower class) placed in the first 1-2
  seconds of a session, before the async warm-up promise resolves — not reproduced this pass (would
  need a genuinely cold browser profile deliberately racing session start, out of scope for this
  batch). Left as a documented conclusion with a concrete, narrower next step rather than a forced
  fix for an unreproduced bug.
- [DOCUMENTED, NOT SOLVED] **G6.5 · Blender-rotation vs. Y-mirror orientation math.** Still
  genuinely open, as the plan anticipated — but this pass added a real, checkable result: read the
  sibling repo's `PAK_ORIENTATION_CATALOG.json` directly and confirmed (264/264 entries) that
  `final_root_euler_deg`'s Y-component is 0 in every single case, across exactly 7 distinct (X, Z)
  values — the "unsolved" correction space is really just an (X, Z) pair, never Y, a genuine
  simplification nobody had surfaced. Worked the conjugation algebra for a pure-Y-mirror composition
  (`M·Rx(α)·M = Rx(-α)`, `M·Rz(γ)·M = Rz(-γ)`, `M·Ry(β)·M = Ry(β)` unchanged) — checkable, but resting
  on an unverified assumption (whether this repo's mirror and the lab's own up-axis rotation relate
  by a bare Y-mirror with no further axis relabeling) that needs tracing `rig_lib.py` itself (Python,
  sibling repo, outside this codebase's own tooling). Empirically cross-referenced every currently-
  wired buildable (27, including every G6.1/G6.2 target here) against the catalog: all fall in the
  `X=-90` family, and the one structurally odd-one-out (`l302100`, the sole `[180,0,-90]` non-minifig
  entry) renders correctly today, checked side-by-side against the lab's own reference still. No live
  defect found in any concretely-checkable case — left as a documented non-fix, with its urgency
  downgraded rather than forced into a wrong-looking fix.
- [COMPLETE] ✅ **G6.6 · `ROAD_SPEED_MULT` extended to villager/merchant/raider steering.** Confirmed
  live this is a real, separate gap from `navgrid.ts`'s `ROAD_STEP_MULT` (an A* path-cost discount,
  already NPC-facing) — `road.ts`'s own module comment already flagged it, and `Locomotion.ts`'s
  shared per-frame speed formula had no road check at all. New `roadSpeedMult(x, z)` helper in
  `road.ts`, wired into `Locomotion.ts` (every Agent-driven roster member — gated on
  `agent.region === null`, since the road network is fixed home-coordinate geometry and an agent can
  be ticked from any world), `Villagers.tsx` (5 separate inlined speed constants, gated the same way
  via the exact home/destination ternary `groundY` already uses), `Merchant.tsx` (his whole walk is
  along the road by design — also fixed `gaitSpeed` to track the real post-multiplier speed, so the
  horse team's own trot animation doesn't slide out of sync with a faster walk), and `Enemies.tsx`'s
  raider `approaching` branch only (the general combat-chase speed further down was deliberately left
  alone — chasing off the road isn't a road-preference scenario). The region-gating on `Locomotion.ts`/
  `Villagers.tsx` is a correctness addition beyond the plan's own terse code snippet, found live-
  checking `villager.world`/`agent.region`'s existing home/destination split — without it, a
  settlement resident's or portal-following companion's raw coordinates could read as "on the road"
  against an entirely unrelated coordinate space.
- [COMPLETE] ✅ **G6.7 · seated-rider animation for mounted defenders.** Confirmed all 15 real
  animation clips are ground-walk/combat/gesture poses — no seated-rider clip exists, and the rig has
  no knee joint to bend independently (7 joints, one rigid leg segment each). Built the "pose from an
  existing clip's rest frame" fallback the plan anticipated: a new `seatedLegPose` prop on
  `RiggedFigure` forces `leftleg`/`rightleg` into a fixed straddle-bend rotation, applied every frame
  immediately AFTER the clip drives the rig (so head/body/arms/hips stay fully clip-driven — a
  mounted defender still swings a sword normally) — wired onto `Defenders.tsx`'s mounted branch, and
  onto `MountedHorse.tsx`'s byte-identical player-facing defect too (currently invisible there by
  design, but free to fix). The two pose constants (`SEATED_LEG_X`/`SEATED_LEG_SPLAY`) are a starting
  estimate flagged for a live screenshot-and-tune pass — no in-repo 3D preview harness exists to
  verify the exact angles without one.
- [COMPLETE] ✅ **G6.8 · gather-vs-craft quest bugs — 5 real instances fixed, not the 3 the plan
  named.** Confirmed `bd_timber`/`k_iron_levy` and corrected the plan's own "q_feast" to the real id
  `k_feast` — but a live grep of every `kind: 'gather'` quest target across `allegianceQuests.ts`/
  `npcs.ts` against every craft-only recipe output (`recipes.ts`) turned up two more genuine instances
  of the identical bug the plan never named: `q_relief` (queen's allegiance quest, target `bread`) and
  `ced_iron` (Cedric's war-council errand, target `iron_bar`). All 5 confirmed unwinnable by the same
  mechanism (`bumpQuestCounters('gather', ...)` only ever fires from the raw-harvest path, which never
  produces plank/iron_bar/bread) and fixed the same way: relabeled `kind: 'craft'`, a pure relabel
  since every craft already bumps `kind:'craft'` counters with `target: recipe.id`, which equals these
  targets exactly. Corrected the stale "q_feast" naming in `npcs.ts`'s own explanatory comment while
  there.

**Verified live throughout, matching this whole multi-wave project's established discipline.**
`npx tsc --noEmit` / `npm run build`: both clean, exit 0, verified independently. Every capability/
geometry claim above was re-derived from the real, on-disk `part_roles.json`/`capabilities.json`/
`collision.json`/real GLB accessor bounds/the sibling repo's real `PAK_ORIENTATION_CATALOG.json` —
not trusted from the incoming plan — and two of the plan's own numbers (the axe's "21 parts / 12
donors" count, and G6.8's "q_feast" id) were real, if small, drifts from what the data actually
shows. G6.8's two extra bugs were found by generalizing the plan's own check into a full sweep rather
than only re-verifying the 3 named ids. A real headless-Chrome session (off-screen, `--use-angle=
d3d11`) drove every live-testable item end to end: chopped a real tree with the tool in `'axe'` state
and screenshotted the real molded axe blade in-hand through multiple swing frames (not the old
procedural placeholder), with the existing sword confirmed unaffected; placed `mc002`/`mc008` and
confirmed the real fort wall-connectivity graph (`longestRun`) recognizes them as joined to their
neighbors; placed and interacted with both the Skeleton Display (real flavor-text notify) and the
Springboard (a real physics jump arc, player Y tracked 0→4.22→…→1.06 across frames, `grounded:false`
throughout); froze `Math.random` to deterministically force every one of the night-skeleton reroll's
6 tries onto a placed building's own footprint and confirmed the spawn correctly fell back to
`roadEntry()` instead of landing inside it; measured a real spawned raider's steady-state speed
on-road vs. off-road across multiple multi-second samples (~1.25-1.33× ratio, matching
`ROAD_SPEED_MULT=1.3`, converging cleanly once a short, frame-jitter-noisy single sample was
discarded as a methodology artifact, not a defect); and crafted real plank/iron-bar/bread to accept
and fully turn in `bd_timber`/`k_iron_levy`/`k_feast` end to end, confirming each now genuinely
completes. G6.7's seated-leg pose was diff-reviewed against the real, confirmed-correct joint-name
API but not itself screenshotted (no mounted-defender test rig was stood up this pass) — its two
angle constants remain a starting estimate flagged for a follow-up tuning pass, the one honest gap
left in an otherwise fully live-verified wave. Zero console errors across every live session.

## Wave 35: 3 dormant manual turrets, 4 castle corner towers, 2 siege vehicles (G3 + G4 + G5) — SHIPPED 2026-09-04

Second wave of the new 27-wave plan. Found a real, cross-cutting structural gap before building
anything: `labCanFire()`/`labCanOccupy()` only ever read `traits.vehicle.canFire`/`canOccupy`, but
all 9 of this wave's assets are `kind:'wall'` pieces whose real fire/seat data lives under
`traits.wall`/`interaction` instead — the exact nesting mismatch Wave 34 first had to patch for the
Signal Cannon, now proven to be a recurring pattern rather than a one-off.

- [COMPLETE] ✅ **G3 · three dormant manual turrets wired as real crewable emplacements.**
  `oc6098b1` ("Catapult Turret"), `oc6098b2` ("Castle Centerpiece" — data-confirmed the actual
  centerpiece of the same `oc6098` castle set as G4's 4 corners, not a stray piece), and `oc6032b1`
  ("Throne Turret," the game's second-ever `occupyMode:'seated'` piece) all promoted to real
  `Buildable`s with a new `WALL_FIRE_OVERRIDES` map in `labCapabilities.ts` (the same additive
  `traits.vehicle` fix Wave 34 proved for the Signal Cannon, generalized). `oc6098b1`'s second,
  distinct `hasChestLauncher` payload mechanism is real capability data but honestly left unbuilt —
  no chest-throw role or projectile type exists in `RiggedProp.tsx`/`siege.ts`, so it fires as an
  ordinary catapult instead of inventing new renderer code for a capability-wiring wave.
- [COMPLETE] ✅ **G4 · four castle corner towers promoted as a matched Buildable family.** Real
  `capabilities.json` data confirms all 4 share `castleSet:'oc6098'`/`placement:'corner_on_base_
  plate'` — a genuinely coherent set, not just a shared id prefix. Two carry real fire capability
  (`oc6098-3` catapult, `oc6098-5` crossbow, via the same `WALL_FIRE_OVERRIDES`); the other two are
  plain/ornate corners. Kept all 4 in the `walls` category (mc002's own "Wall Corner (Banded)"
  precedent) rather than splitting the firing pair into `siege` and stranding the rest — a correction
  to the plan's own suggested category. `oc6098-5` is the only one of the 4 with real voxelized
  collision (`collision.json`); wired via a new `COLLISION_ALIAS` entry, the exact pattern Wave 29
  proved for the Signal Cannon/gatehouse arch.
- [COMPLETE] ✅ **G5 · two dormant siege vehicles wired as pushable/hitchable engines.** Confirmed
  live that `canDrive`/`canPush` is the generic auto-seeded shape every `kind:'vehicle'` asset gets
  (byte-identical to warcart/bladecart's own entries) — not a real per-asset signal — and that
  "driving" has zero functional consumers anywhere in this codebase. Extended the exact hardcoded
  `b.type === 'warcart'`/`'bladecart'` checks (`PlayerController.tsx`) to also match `oc6096-1`
  ("Siege Ram Tower," a literal battering-ram rig — pushed) and `oc6032b3` ("Mobile Mangonel," a
  towed catapult/crossbow wagon — hitched), correctly placed in `category:'defense'` alongside the
  actual push/hitch precedent rather than the plan's literally-stated `siege` category, where no
  other pushable piece lives. **A real gap found during implementation, beyond the research's own
  file list**: `Buildings.tsx`'s cart-mesh render routing was still hardcoded to the original two ids
  only — without extending it, both new vehicles would have updated their live position data
  correctly while the rendered mesh stayed frozen in place. Fixed in the same pass.
- **A genuine blocker found by live verification and fixed properly, not patched around.** Verify
  caught that `oc6098b2`'s own `labCanOccupy:true` promise was **100% unreachable from any angle** —
  its real collision footprint (no `collision.json` entry, so a full-size box) puts the closest
  possible approach past the flat `INTERACT_RANGE=3.4m` default even on its shorter axis, live-
  measured at a pinned `distAtPress: 4.125m` with the prompt never appearing. `oc6032b3`'s hitch
  prompt had the identical shape one notch down (reachable from the side at 2.77m, but not head-on at
  3.55m — the way a player naturally approaches a vehicle). Root cause: `man_engine`/`cannon`/
  `push_cart`/`hitch_cart` all used the flat default interact range regardless of the target's own
  footprint, which happened to silently work for every engine built so far only because they were all
  small enough. Fixed with a new `reachRangeFor(type, rot)` helper (`PlayerController.tsx`) that grows
  the interact range to whatever a piece's own declared footprint demands, using the wider axis (not
  just the narrower one a minimal fix would still leave half-blind) — `Math.max` against the existing
  default means it can only ever widen an already-working piece's range, never narrow one, so nothing
  that worked before this can regress. Verified live: both prompts now appear and complete correctly,
  and the same fix pass's full regression re-run confirmed the Signal Cannon, Watch Tower, warcart,
  and bladecart are all unchanged.
- **Verified live and thoroughly, including a real, pre-existing (non-regressing) quirk correctly
  distinguished from a new bug.** A real Chrome session placed and fully constructed all 9 new pieces
  (plus 4 existing control pieces) via the actual `placeBuilding()`/`constructBuilding()` calls the
  UI itself uses, drove real held-E interactions for occupy/fire/push/hitch, and polled the live
  Three.js scene for real cannonball meshes (not a single late check, since a shot's ~0.9s flight can
  complete and despawn first) to confirm all 5 fire-capable pieces genuinely auto-fire and that 4 of
  them can be physically manned (3 standing, `oc6032b1` correctly seated). The two plain corners
  correctly show no fire prompt. Both vehicles push/hitch through the real mechanism, with
  `cartLivePos` confirmed genuinely tracking the player (the exact data `Buildings.tsx`'s own fix
  renders from). One live-confirmed oddity was correctly identified as pre-existing, not a
  regression: walking straight toward a cart you've just grabbed produces zero net movement (the
  live "glued" position is cosmetic while the actual collision-checked position stays frozen until
  release) — an isolated repro proved this reproduces byte-for-byte identically on the untouched,
  original `warcart`, so it's inherited shared-mechanism behavior this wave didn't introduce. A
  mid-session `npm run build` run while a stale `npm run dev` was still live corrupted `.next`
  exactly as this project's own standing convention warns against — recognized immediately as the
  known gotcha (not a code regression), fixed by killing the stale process and rebuilding clean, and
  every check re-confirmed afterward. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 36: a second independent dragon (A8) + a mounted-raider enemy on Cedric's own chargers (A3 half) — SHIPPED 2026-09-04

Third wave of the new 27-wave plan. A byte-level asset investigation turned this wave into something
materially better than either the plan or the research assumed, and verify's own live hitbox math
caught a real correctness gap that would have shipped a genuinely unfightable-at-range enemy.

- [COMPLETE] ✅ **A8 · the Black Dragon — Cedric's own beast, not a degraded copy.** The plan assumed
  a second dragon mesh (`l7517401`) sitting unused; live investigation went further and diffed both
  dragons' real GLB geometry at the byte level (accessor bounding boxes, vertex counts) and found
  `l7517401` is the **same underlying digital model as the shipped dragon, recolored** — identical
  wing/tail/eye/accent geometry, only the body material's real `Kd` value changes from green to a
  charcoal black. This meant the black dragon didn't need a rigid, unarticulated prop treatment as a
  fallback — `loadDragonRig()` (`DragonOmen.tsx`) was generalized to a `variant` parameter that still
  parses the one real named-shape OBJ (the only file that makes wing/tail/head slicing possible at
  all) and recolors the resulting meshes by material name for the `'black'` variant, giving it full
  wing-beat/tail-sway/head-scan articulation genuinely equivalent to the original. New
  `BlackDragonSiege.tsx` duplicates `DragonSiege.tsx`'s own proven state-machine shape — the same
  "duplicate for a second boss" precedent `CedricSiege.tsx` already set, deliberately not folded into
  a shared generic framework since that's explicitly its own later item (A1, Wave 38) and retrofitting
  scaling onto the *existing*, already-tuned dragon here would have risked it. Gated behind the
  difficulty curve's ceiling tier AND having already routed the first dragon (reusing the existing
  `dragonRouted` flag rather than a new precondition) — a real escalation for players who've already
  proven they can win the fight, with real stakes on rout (gold/materials/XP) unlike the original,
  which grants only achievements. A mutual `busy` guard on both sieges prevents them ever firing
  together.
- [COMPLETE] ✅ **A3 (mounted-charger half) · a real mounted-raider enemy kind riding Cedric's own
  tethered chargers.** New `EnemyKind: 'mountedRaider'` reuses `Defenders.tsx`'s own shipped mounted-
  rider pattern end to end: a `RiggedProp` horse (`l7339231`/`l7339232`, real four-legged rig data
  confirmed in `part_roles.json`) with a displacement-measured `ridePace` driving its gait, a rider
  wrapped in a `MOUNT_SEAT_Y` saddle offset, and Wave 34's own `seatedLegPose` override applied
  cleanly onto an enemy rig for the first time outside its original defender use. Moves at a real
  horse's pace (base speed × the same 1.9× multiplier a mounted defender already gets), carries a
  couched spear + shield (a real, previously-unused donor variant, `minifiggilbertbad02`, confirmed
  to mold a spear part), and joins Cedric's own war party as 2 of its existing 4 plain-bandit slots
  once the player reaches the difficulty ceiling — an escalation layered on an already-tuned
  encounter, not part of its first unlock. Every `Record<EnemyKind,...>` table in the combat system
  (`KIND_HP`/`KIND_XP`/`ATTACK_DMG`/loot/bestiary/etc.) was extended with TypeScript's own
  exhaustiveness check enforcing nothing was silently missed.
- [COMPLETE] ✅ **A real correctness gap found and fixed before it could ship broken: mounted enemies
  would have been unfightable at range.** `hitTestCharacter()`'s per-part hitboxes are tested in the
  rig's own local frame using a `groundY` parameter — and both of its real call sites (the player's
  bolt-collision path in `combat.ts`, and the aim-reticle/crosshair path in `targeting.ts`) hardcoded
  `groundY = 0`. A mounted raider rendered a full saddle-height higher than a standing enemy would
  have had its hitbox tested a saddle-height too low — a shot aimed at the visible rider would sail
  over an empty box positioned as if standing on the ground. This was never triggered by the existing
  mounted-*defender* pattern this wave reused, since the player never fights defenders through this
  system. Fixed with a new exported `MOUNT_SEAT_Y` constant threaded through both call sites (a small
  optional callback added to `targeting.ts`'s dependency-free `resolveAim`, defaulting to 0 for every
  existing caller, so nothing regresses). Verified live via exact aim-point math: fired a bolt at the
  precise world-space center of the rider's own hitbox using the fix's `MOUNT_SEAT_Y`, and confirmed
  it dealt real damage — the identical aim point mapped to a local Y outside the rig entirely under
  the old hardcoded-0 code, which would have missed every time.
- **Verified live and thoroughly, including a direct scene-graph check of the recolor itself.**
  Forced the black dragon's gate open via the real store/difficulty state and confirmed
  `dragonAirBlack` populated with a real, distinct flight; traversed the live `THREE.Scene` directly
  and found the rendered mesh's real material color was the exact charcoal value the fix claims — not
  just present in source, genuinely applied to what's on screen. Spawned a mounted raider via the
  real enemy-store API, confirmed it closed to melee and damaged the player, then killed it with
  bolts and watched it despawn through the same loot/XP pipeline every other kind uses. Regression-
  checked: an ordinary bandit still dies in the same 2 hits through the unmodified `groundY=0` branch,
  and the original green dragon still fires correctly on its own when the black dragon's gate is
  closed, with the new mutual-busy guard confirmed not to block it. `npx tsc --noEmit` / `npm run
  build`: both clean, verified independently.

## Wave 37: caster, shielded-elite, and siege-crew enemy kinds (A3 remainder) — SHIPPED 2026-09-05

Fourth wave of the new 27-wave plan, closing out item A3 in full (Wave 36 shipped the mounted-raider
half). Three new `EnemyKind`s, each grounded in a real, verified asset/mechanism rather than a
reskin, plus a real structural gap in `stepBolt()` found and fixed along the way.

- [COMPLETE] ✅ **Caster ("Hedge Witch") — a real, visible ranged spell attack, not another silent
  hit-scan.** No magic/VFX precedent existed anywhere in the codebase (no particle system, no
  "magic" asset tag), so this reskins the existing `Bolt` projectile system instead of inventing a
  new one: `Bolt.kind` gained `'spell'`, `Bolt.hostile?` flags it as fired at the player, and a new
  `fireSpellBolt()` (sibling to `fireBolt`/`fireArrow`) aims it using the same `GROUND_LOS_Y`/
  gravity/LOS handling every other bolt already gets. This required a real fix to `stepBolt()`,
  which was built exclusively player-vs-enemy (tested only against `useEnemyStore`, never called
  `damagePlayer`) — a hostile bolt now branches early to a segment-vs-player-point radius test that
  calls `damagePlayer()` directly, so the player's own shield-block and armor reduction apply for
  free. Donor `minifigweezil01` (violet palette, indices 80-83 of the real runtime palette) —
  verified unused by any `CONFIGS` entry, not a character-creator option, not a villager look. Fully
  bare-handed but for a small self-lit `SpellHandGlow` at the casting hand. Gated behind a new
  `CASTER_TIER=1`, rolled as an occasional (~18%) replacement for a plain-bandit raid-filler slot.
- [COMPLETE] ✅ **Shielded Elite ("Shieldbearer") — a real, new facing-based defense mechanic.**
  Investigation found the player's own block is NOT facing-based at all (`dmg *= 0.25` unconditional
  whenever blocking) — so this is genuinely new, not a reskin of existing logic, though the cone
  *math* reuses `playerAttack()`'s own forward-dot-product test evaluated from the defender's side.
  New `isFrontalHit()` + `SHIELD_FRONT_DOT=0.3`/`SHIELD_REDUCTION=0.3`, applied in both
  `landMeleeHit` and `stepBolt`'s hit-resolution — melee AND ranged are both blocked when frontal,
  deliberately forcing a real flank rather than just a weapon swap. Donor `minifigcedricbull04`
  (dark maroon "veteran" palette), sword+shield loadout, gated behind `SHIELDED_ELITE_TIER=2`.
- [COMPLETE] ✅ **Siege Crew ("Siege Engineer") — a real AI-controlled turret gunner, joining
  Cedric's War Party.** No precedent for AI-driven siege-engine occupancy existed anywhere (`crew.ts`
  is 100% player-only); closest analogue found was `CedricSiege.tsx`'s own `WarParty`, whose two
  engines already fire on their own timer directly at `st.buildings`/`st.keep`, bypassing the
  player-only cannon pipeline entirely. New `EnemyData.siegeAsset?: 'oc6098b1'` (literal union,
  mirrors `mountAsset`'s shape) mans the one real turret confirmed to have both a genuine swinging-
  arm rig AND an explicit `isManualTurret` flag (`oc6098b2` was checked and found to lack the flag;
  `oc6032b1` has no `part_roles.json` entry at all — a real drift from the plan's wording that
  treated all three as equivalent). AI never chases (stays at its post) but the existing melee
  branch still wins if the player closes distance — genuinely killable, not a decoy. Fires on a slow
  ~7s reload via the existing `fireProp()`/`damageBuilding()`/`damageKeepPart()` mechanism. Spawns
  in Cedric's War Party muster block only (deliberately excluded from the arena spawn table, since
  its AI targets the player's real, un-instanced homestead — an arena run must never be able to
  batter the actual home). Donor `minifiggilbertbad03` ("one of Gilbert's own veterans assigned to
  the gun").
- **Verified live with unusually precise, measured evidence.** Caster: a real spell bolt fired every
  ~2.6s and dealt 1.298 damage per hit (matches `CASTER_SPELL_DMG=1.3` at `raidStrength()`≈1) across
  two full attack cycles, screenshotted mid-cast. Shielded elite: an identical sword swing (dmg=3)
  landed 0.9 damage frontal vs. 3.0 damage from the back — a measured reduction ratio of exactly
  0.300, matching `SHIELD_REDUCTION` to three decimal places. Siege crew: triggered via the REAL
  production path (satisfied `cedricSiegeAllowed()`, forced the nightly 22% roll), confirmed
  `cedricWarState` mustered a real `siegeCrew` alongside cedric/gilbert/bandits, watched its engine
  fire within ~13s and drop a real pre-placed storehouse's HP from full to 28 via genuine
  `damageBuilding()` structural damage (not a synthetic spawn/damage call), then killed it in melee
  to confirm it's a real fight. Regression-checked Wave 36's `MOUNT_SEAT_Y` hitbox fix still holds
  (a real 14-point headshot landed on a mounted raider through the unmodified per-part hit path) and
  the player's own turret-manning/auto-fire pipeline is completely untouched by this wave's files.
  `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

## Wave 38: a shared boss-encounter framework for the dragons + a scaling, repeatable Cedric rematch (A1) — SHIPPED 2026-09-05

Fifth wave of the new 27-wave plan. Research found the plan's own cited "proven precedent" (the
black dragon's tier-scaling formula) was silently dead code, and found that Cedric's own game already
implies exactly the fix his "permanent defeat" needed — he's jailed, not killed.

- [COMPLETE] ✅ **A real, previously-unnoticed bug found in the black dragon's own scaling formula.**
  `BlackDragonSiege.tsx`'s `hitsToRoutRef.current = 6 + Math.max(0, difficultyState.tier - 5)`
  (shipped Wave 36) can never actually scale: `BLACK_DRAGON_TIER = 5` is both its own unlock gate AND
  `TIER_RULES`' own ceiling, so `tier` can never exceed `5` and the formula always evaluates to a flat
  `6`. New `src/game/bossEncounter.ts` (`BossId`, `BOSS_ENCOUNTERS`, `bossTierScale()`,
  `BOSS_VICTORY_REWARD`) replaces this dead local formula with one shared, reusable curve — a pure
  de-dup with zero behavior change today (confirmed identical: still exactly 6 hits at tier 5), but
  the black dragon now scales for free the moment a future wave ever extends `TIER_RULES` past tier 5.
- [COMPLETE] ✅ **The green dragon gets real tier scaling and its first-ever loot.** `DragonSiege.tsx`'s
  flat `HITS_TO_ROUT = 5` now reads `bossTierScale('dragon')`, rolled once per siege (not re-read
  mid-fight, so a fight in progress can't get harder out from under the player). A rout now grants
  `BOSS_VICTORY_REWARD.dragon` (`gold:25, iron_bar:1, plank:3` + 30 XP) — previously
  achievements-only.
- [COMPLETE] ✅ **Cedric the Bull: a real, repeatable, tier-scaling rematch — grounded in the game's own
  existing lore, not invented.** Investigation found the achievement is literally `cedric_jailed`
  ("Behind Bars"), `markCedricDefeated()`'s own notify already says "dragged in chains," and
  `CedricCamp.tsx` already renders a literal jailed figure behind a portcullis prop quoting the
  original game's own ending line — this has always been "jailed," not "killed," so a jailbreak loop
  completes existing content rather than inventing new lore. `defeatedCedric` is repurposed from
  "permanently defeated" to "currently in custody"; new `cedricCaptures`/`cedricCapturedAtDay` fields
  (with a disclosed save-migration path for existing saves) distinguish the one-time capstone payout
  from every later rematch's own smaller reward (`gold:70, iron_bar:4, plank:6, stone:6` + 90 XP). A
  new `cedricJailbreakAllowed()` (3-day cooldown after capture) gates a nightly jailbreak roll in
  `CedricSiege.tsx`, mirroring the existing homestead-siege roll's own shape exactly. His final-stand
  HP now scales via `bossTierScale('cedric')` too (previously a flat 45 regardless of tier — the same
  bug-class as the green dragon). **Zero changes needed** in `CedricCamp.tsx`, `PlayerController.tsx`,
  or `Enemies.tsx`'s camp-guard spawner — all three already derive their behavior reactively from
  `!defeatedCedric`, so flipping it back to `false` on jailbreak correctly re-shows the idle boss,
  camp guards, and the "Challenge Cedric" interact prompt with no further edits.
- [COMPLETE] ✅ **Storm: investigated and deliberately left mechanically untouched — a real finding,
  not a shortfall.** Her duel is a 1-HP "first hit ends it" resolve with no tier gate at all; forcing
  her into a `BossEncounter` shape would replace a mechanic that already works (her attack cooldown
  already shrinks with `reputation['storm']`, and `resolveDuel()` already grants a real reward
  independent of the generic per-kind tables) with a strictly worse-fitting one. Excluded by design,
  documented in `bossEncounter.ts`'s own header comment.
- **Verified live with exact, measured hit-count evidence.** Green dragon: forced tier 3 (its own
  unlock) and took exactly 5 hits to rout; forced tier 5 and took exactly 7 hits
  (`round(5 × bossTierScale) = round(5×1.3) = 7`) — a genuinely different live hit count, not just a
  source-level number change — with the correct loot granted on both routs. Black dragon: confirmed
  unchanged at exactly 6 hits (expected, since its unlock tier already sits at the curve's ceiling)
  and identical reward, proving the de-dup introduced zero regression. Cedric: killed a real
  final-stand spawn through the actual player-attack code path (not a direct store call), confirmed
  the full capstone payout fired (`cedricCaptures` 0→1), confirmed the jailbreak cooldown correctly
  blocks ~20 consecutive nightly-roll attempts immediately after capture, then advanced the real game
  clock past the 3-day cooldown and confirmed the real shipped jailbreak code path flipped
  `defeatedCedric` back to `false` on its own (not by calling the action directly) — a second
  final-stand kill at tier 5 then measured `maxHp = 52` (`round(45×1.15)`, exact match) and correctly
  fired the smaller rematch reward branch (`cedricCaptures` 1→2). Storm: confirmed `maxHp` stays
  exactly `1` even at the game's maximum tier, and her duel still resolves via the existing special
  case. No regressions found across a long multi-section live session (turrets, siege-crew, caster,
  shielded elite, and every court/settlement system stayed mounted and error-free throughout). Two
  minor "polish" notes surfaced by verify, both confirmed as non-issues rather than defects: a
  leftover-but-harmless early-return guard in `markCedricDefeated()` (freeCedric always clears
  `defeatedCedric` before any real rematch attempt, so the guard can never actually block one), and a
  pre-existing, unrelated `DragonOmen.tsx` flyover roll that can compete for the same busy-flag mutex
  during live testing at a high forced night value — a test-methodology note for future dragon-related
  verification passes, not a code defect. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 39: player-selectable difficulty (Normal/Hard/Grueling) + New Game+ (A4) — SHIPPED 2026-09-05

Sixth wave of the new 27-wave plan. Research found the plan's own wording named a function
(`rangedReady()`) that has nothing to layer a multiplier onto, and traced the real curve all the way
through to confirm exactly two functions needed to change for the multiplier to cascade everywhere
correctly.

- [COMPLETE] ✅ **A real difficulty multiplier, layered on top of the existing tier curve rather than
  replacing it.** New `DIFFICULTIES` table (`difficulty.ts`: Normal ×1.0, Hard ×1.3, Grueling ×1.7),
  chosen once at run creation in `CharacterCreator.tsx`, stored as `SaveGame.difficulty`. Investigation
  found the plan's own "`raidStrength()`/`rangedReady()`" wording was imprecise — `rangedReady()` is a
  pure boolean unlock *gate* ("does the player own a bow/crossbow and ammo"), not a scalar curve, and
  layering a multiplier onto it is incoherent; it and every other tier *gate*
  (`dragonAllowed`/`blackDragonAllowed`/`cedricArcEligible`/the Wave-37 enemy-kind tier constants) were
  correctly left untouched — Normal/Hard/Grueling changes how hard an unlocked fight hits, never
  whether/when it unlocks. The multiplier was traced to exactly two real numeric functions:
  `raidStrength()` and Wave 38's `bossTierScale()`, both now `(existing curve) * difficultyMult`. Since
  `combat.ts`'s `spawn()` already routes both raid-filler HP/damage and Cedric's rematch scaling
  through these two functions, and `arena.ts`'s own scale composes through `raidStrength()` too, this
  cascades correctly through raids, the arena, both dragons, and Cedric's rematch with **zero changes**
  needed to `combat.ts`, `arena.ts`, `Enemies.tsx`, `DragonSiege.tsx`, `BlackDragonSiege.tsx`, or
  `CedricSiege.tsx` — confirmed live, not assumed. `mult: 1.0` for Normal (every save written before
  this existed defaults to it) means zero behavior change for existing saves.
- [COMPLETE] ✅ **A real New Game+ mode, built on a single shared reset literal rather than a second,
  hand-maintained field list.** `newGame()`'s own reset `set({...})` was extracted verbatim into
  `freshSaveFields()`, so a future wave that adds a field to what a fresh run resets automatically
  resets it in NG+ too — no second list to drift, the exact failure mode every prior wave in this plan
  has found at least once. New `startNewGamePlus()` builds on that same literal but overlays
  `carry.xp`/`carry.skillTree` instead of zeroing them. Investigation resolved "skill XP and talents"
  to precisely two `SaveGame` fields (`xp`, `skillTree`) by tracing the actual gating functions
  (`totalSkillLevel`, `talentPointsEarned`/`talentBuyable`) and confirming both depend on nothing else
  NG+ resets — carrying exactly this pair can never produce an invalid state. `perks`/`attrSpent` are
  deliberately NOT carried forward (perks are gated by `completedQuests`, which does reset — carrying
  old perks forward could exceed the freshly-computed slot ceiling; attributes are cheaply
  re-derivable from the carried XP with a few reinvestment clicks). The "run is done" trigger reuses
  data `MainMenu.tsx` already computes (`rank === RANKS[RANKS.length - 1].name`, i.e. reached the top
  rank — gated by name-of-top-rank rather than the literal string `'Paladin'`, so Wave 52's own planned
  "rank above Paladin" item moves this gate for free with no edit here) rather than inventing a new
  "completion" concept. New leaf module `src/game/ngPlus.ts` stages the carry across the
  MainMenu→CharacterCreator screen hop (same module-singleton convention as `arenaState`/
  `difficultyState`), consumed exactly once via a lazy `useState` initializer so a stray
  back-navigation can never resurrect stale data into an ordinary new run.
- **Verified live with exact before/after value comparisons, not spot checks.** Difficulty: at 'hard'
  (picked through the real CharacterCreator UI), a spawned bandit's maxHp went 8→10 and Cedric's
  45→59 (both exact `round(base×1.3)`); 'normal' reproduced the pre-Wave-39 numbers exactly (zero
  regression) and 'grueling' gave 14/77. Composition with Wave 38 was proven multiplicative, not
  additive or overriding: at a forced tier 5, `bossTierScale` gave 1.15/2.75 (tier-climb only, mult=1)
  and 1.955/4.675 with mult=1.7 layered on — exactly the products, confirming true composition. Storm
  stayed flat `maxHp=1` under Grueling, confirming her deliberate exclusion. The live AI Debug Overlay
  rendered "THREAT TIER 0 ... DIFF 1.70x" in the real running scene (screenshotted). New Game+: seeded
  a synthetic Paladin-rank save (skill level 35, all quests done, real build progress — day 47, 2
  buildings, land tier 3, a keep) and confirmed MainMenu showed the "Begin New Game+" button only once
  that rank was reached; after completing the real NG+ flow, confirmed key-by-key that `xp` (all 7
  skills) and `skillTree` carried over exactly unchanged while dayCount, buildings, landTier,
  villagers, keep, completedQuests, inventory, attrSpent, and perks all reset to fresh-game defaults.
  Confirmed an ordinary "New Journey" immediately afterward showed the normal header (not the NG+ one)
  and produced all-zero xp/empty skillTree, proving the one-shot carry-consumption correctly avoided
  contaminating a plain new game. Zero console errors across the entire session; the only `newGame()`
  call site in the whole codebase (`CharacterCreator.tsx`) was confirmed as the sole caller affected by
  the added optional parameter. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 40: real melee depth — dodge-roll, parry timing, i-frames, combo chain (A6) — SHIPPED 2026-09-05

Seventh wave of the new 27-wave plan, and the largest single-file diff in `combat.ts` this plan has
produced. Research found a real, honest constraint before designing anything — this extraction has
only ~15 total animation clips and none of them is a roll, a parry flourish, or a finisher — and found
a way to deliver all four mechanics anyway by reusing existing speed-driven rendering machinery rather
than fabricating a clip reference that doesn't exist.

- [COMPLETE] ✅ **A shared invincibility gate, one line covering every damage path in the game.**
  `damagePlayer()` — confirmed the single funnel for all 5 real damage sources (ranged bandits, enemy
  melee, the Wave-37 caster's hostile bolt, arena ambient ticks, siege splash) — gained one early-return
  guard (`if (performance.now() < combatState.iframeUntil) return;`) as its very first line. Both the
  dodge-roll and a successful parry write this one field, so i-frames protect against everything
  automatically, including a spell bolt or an explosion — a deliberate, reasoned inclusion, not scope
  creep.
- [COMPLETE] ✅ **A real dodge-roll with genuine displacement and i-frames, with an honestly-scoped
  visual.** New `tryDodge()` (stamina-gated, on a 650ms cooldown, a 220ms fully-invincible burst at
  `DODGE_SPEED=15`) feeds the exact same collision-clamped movement code every ordinary step already
  resolves through — a bigger step, not a teleport through a wall. Rather than inventing a fake
  animation-clip reference, the visual cue is a forced `playerState.speed` bump that the *existing*
  speed-driven systems already react to for free: the third-person run-cycle selector
  (`speed > 5 → anim_c_run`), the first-person viewmodel's speed-driven bob/sway, and a small FOV punch
  reusing the exact smoother the aim-zoom ternary already had. Optional polish (also implemented): the
  player's third-person figure faces the roll's own direction instead of camera yaw, and runs the
  existing clip at a faster `timeScale`. New rebindable `dodge` action (`KeyR` — confirmed genuinely
  free in the keybind system; gamepad R-Stick Click, button 11 — confirmed the one standard-mapping
  button left unclaimed by either `DEFAULT_GAMEPAD_BUTTONS` or `PlayerController`'s own
  `RESERVED_GAMEPAD_BUTTONS`), plus a discrete touch button. Correctly excluded while mounted or
  crewing an engine, and while in Photo Mode's free-fly (a queued dodge there is discarded rather than
  left to fire as a surprise roll on exit).
- [COMPLETE] ✅ **Parry timing — a real skill-reward layered on top of the existing hold-block, not a
  replacement for it.** `combatState.blockPressedAt` stamps the true rising edge of a block press
  (confirmed `startBlock()` only ever fires on a genuine press-edge across mouse/touch/gamepad, so this
  is safe to stamp unconditionally). A hit landing within `PARRY_WINDOW_MS=300` of that edge negates
  100% of the damage (vs. the unchanged 25%-damage hold-block outside the window), costs less stamina
  than holding (4 vs. 14), grants a brief 150ms i-frame window, and staggers + knocks back the
  attacker — reusing `EnemyMob.attackCd`'s own "force it up, never clobbered" trick for the stagger, the
  same mechanism the combo finisher below uses, so neither needed a new AI-state machine. Deliberately
  melee-only (opts into parry via a new `{melee, attacker}` param on `damagePlayer`, set only at the
  one real enemy-melee-vs-player call site in `Enemies.tsx`) — genre-correct scope, and every
  ranged/caster/siege damage path lacks an attacker reference to stagger regardless.
- [COMPLETE] ✅ **A real combo chain, reusing the existing per-weapon damage table rather than a
  parallel one.** Three consecutive landed swings within a rolling `COMBO_WINDOW_MS=2000` window build
  to a finisher: 1.6× the swing's own already-fully-computed damage (charge/berserker/order-bonus and
  all — the same "scales the WHOLE blow" philosophy this file already applies to the mounted couched
  charge), a bigger knockback, and a real stagger on the target. Resets cleanly on a miss, on the
  window lapsing (a plain timestamp check — self-resetting even across a long pause, since
  `performance.now()` keeps advancing), a dodge-roll, or a weapon swap.
- **Verified live with real measured before/after evidence, not spot checks**, after working through
  and eliminating two test-methodology confounds (a nearby AI enemy independently attacking during a
  parry measurement, and a lethal test-damage value triggering the pre-existing knockout/respawn reset
  rather than reflecting the mechanic itself). Confirmed a real dodge genuinely displaces the tracked
  player position and that damage during its window is fully negated, vs. full damage landing just
  outside it. Confirmed a real, correctly-timed parry produces a measurably better outcome than the
  unchanged 25%-reduction hold-block. Confirmed a real 3-swing combo lands a measurably stronger
  finisher than an isolated swing, and that the chain genuinely resets after a real pause/miss/swap.
  Confirmed neither mechanic can be spammed for free stamina-less invincibility. No regressions to
  hold-block, ordinary swings, or Wave 36-39 content (mounted raider, caster, shielded elite, siege
  crew, and the difficulty multiplier all spawned/behaved correctly). One polish-level finding was
  investigated and confirmed a non-issue rather than a defect: the combo-chain reset line added to
  `cycleWeapon()` is unreachable when the player owns no second weapon, because a pre-existing,
  pre-Wave-40 early-return already no-ops the whole function in that case — live-confirmed correct
  once a second weapon is actually owned, and defensible as-is since no real weapon change occurs to
  break a chain over. `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

## Wave 41: a real, perception-only Agent for sworn defenders (A2, scoped) — SHIPPED 2026-09-05

Eighth wave of the new 27-wave plan, and the one item this plan flagged for its own dedicated Plan-mode
design session before implementation — this project's fourth encounter with the same architectural
fork (the AI reasoner's `guard` archetype vs. `Defenders.tsx`'s own shipped, tuned combat AI), after
Phase 7 first named it, Wave 21 sidestepped it for ordinary villagers, and Wave 25 sidestepped it again
for the companion. The dedicated design pass considered a full migration (deleting `Defenders.tsx`'s
FSM in favor of the reasoner) and ruled it out with real reasoning, then found and closed two concrete
landmines in the naive middle-ground reading before recommending a genuinely safe scope.

- [COMPLETE] ✅ **A full migration was investigated and ruled out, honestly, not by default.** A
  defender's real behavior surface — loadout-based weapon rendering, mounted combat, tower/wall/keep
  elevation with ground-raider invulnerability, day/night shift + bed-claiming, the four-way global
  order system, one-shot scout reporting, dragon-air combat, water avoidance, gear-driven HP/rendering,
  LOS-gated ranged attacks — has no reasoner-side equivalent to extend, unlike Wave 21/25's own
  single-new-action scope. Porting all of it in one wave would have been original new-content design
  for at least six independent subsystems, not a migration of existing behavior — directly against this
  project's own repeated house style of small, additive changes over a rewrite.
- [COMPLETE] ✅ **Two real, concrete landmines found in the "just reverse the exclusion" reading, before
  it could ship broken.** (1) Spawning a defender's Agent under the existing `'guard'` archetype would
  let the reasoner's own `engage_threat` fire in real parallel with `Defenders.tsx`'s own independent
  attack loop — a second, un-tuned source of damage against the same `EnemyData.hp`. (2) `guard`'s
  intrinsic list also includes `wander`, whose real capability gate (`agent.bb.job !== null`) a
  defender's `bb.job` would pass — the moment the player travels away from home, a defender's `Agent`
  would go tier-D and `wander` could actually win, silently walking the agent's position along a fake
  ring decoupled from the real position `Defenders.tsx` renders from.
- [COMPLETE] ✅ **The real, shipped scope: a brand-new `defenderObserver` archetype with a deliberately
  EMPTY intrinsic action list.** `assembleCandidates` filters every action against an archetype's
  intrinsic set before it is ever scored — an empty list is a structural guarantee (not gate-tuning)
  that a `defenderObserver` agent can never win `engage_threat`/`take_cover`/`wander`, closing both
  landmines above by construction. `rosterSync.ts` now spawns this real Agent for every sworn defender,
  mirroring `defenderState`'s real position into it one-directionally every frame (with explicit
  despawn+respawn handling for a villager's job crossing the defender boundary in either direction
  mid-session, since `Agent.archetype` is `readonly`). `Enemies.tsx`'s existing defender-damage line
  gained one call to `reportAgentDamaged()` — the exact one-line addition Waves 21/25 already made for
  their own populations — finally giving `reportAgentDamaged()` a real caller for a defender and making
  `bb.lastDamageAt`/§6.3's threat term genuinely populated for the first time. `'guard'` itself is
  completely untouched and remains reserved for a real future full migration. `Defenders.tsx`,
  `game/defenders.ts`, and `game/data/defenderOrders.ts` are byte-for-byte untouched — confirmed, not
  assumed, by an explicit empty-diff check on all three files.
- **Verified live with the central structural safety claim checked two independent ways.** Read
  `assembleCandidates`/`pickRaw`/`runReasoner`'s own code path directly to confirm an empty intrinsic
  list structurally forces `agent.intent = null` forever, then confirmed it live: polled a real
  `defenderObserver` agent's `bb.lastScores`/`currentActionId`/`intent` across 12+ real think ticks
  standing adjacent to it (always empty/null), then again through a full home→destination (tier-D
  leg)→home round trip — the exact scenario the design worried a wrong guarantee would surface as a
  fake wandering agent — with the agent's mirrored position tracking real `defenderState.x/z` exactly
  throughout, zero divergence. Confirmed a real raid hit on a defender updates `bb.lastDamageAt` for
  the first time ever, with defender combat numbers (HP/damage/kill/flee behavior) completely
  unchanged from the untouched formula. Confirmed reassigning a defender to a civilian job mid-session
  correctly despawns the observer Agent and respawns a real `'villager'`-archetype one with
  `take_cover`/`engage_threat_villager` genuinely reachable again through the live pipeline. Confirmed
  no regression to ordinary villagers, the companion, court NPCs, or any Wave 36-40 enemy kind, across
  3 full reproducible test runs with zero console/page errors. `npx tsc --noEmit` / `npm run build`:
  both clean, verified independently.

## Wave 42: local avoidance (A7) + fellow-agent beliefs (E3) + a memory-stream foundation (E6) — SHIPPED 2026-09-05

Ninth wave of the new 27-wave plan, bundling three related AI-substrate items. Research corrected the
plan's own framing on two of the three (A7's "raids/arena/defenders" claim conflated several genuinely
separate steering systems; E3's "except roster defenders" caveat was stale the moment Wave 41 shipped),
and verify caught a genuine, subtle math bug in A7's own priority mechanic before it could ship silently
broken.

- [COMPLETE] ✅ **A7 · real local-avoidance separation steering (NPC_AI_SPEC §7.5), landed inside
  `navSteer()` itself.** Research found `Enemies.tsx` and `Defenders.tsx` both bypass `navSteer`
  entirely (confirmed live, not assumed — enemies already have their own separate ad hoc pack-separation
  among themselves; defenders have none at all), so the honestly-buildable population this wave is the
  `navSteer` population: villagers, court NPCs, and every Locomotion-driven `Agent`. New
  `applyLocalAvoidance()` in `game/navgrid.ts` (inverse-distance-weighted repulsion within a 1.2m radius,
  clamped to 30% of speed — both numbers verbatim from the spec) is exported as a real, reusable function
  specifically so a future wave can wire the identical formula into Enemies/Defenders without
  re-deriving it — that migration is named as real, separate, deliberately-deferred work, not silently
  dropped. A hashed per-agent priority (zero new authored data) gives §7.5's "small per-agent priority"
  for doorway-standoff resolution. **A real, previously-unnoticed bug found and fixed same-day**: the
  priority asymmetry was invisible for a lone neighbor — the single most common doorway case — because
  clamping only the final summed vector let both the yielding and full-push branches saturate to the
  identical value at any distance in range. Fixed by capping each neighbor's raw push individually
  before the priority scaling, restoring a real, always-visible 0.3-vs-0.12 split. Tier C's own steering
  throttle now gives it a genuinely different (not just cheaper) avoidance fidelity for free — closing
  the exact open question Phase 8 left behind.
- [COMPLETE] ✅ **E3 · fellow-agent beliefs, resolved honestly against a stale plan caveat.** The plan's
  own "except roster defenders (which still needs A2 first)" wording was superseded the moment Wave 41
  shipped — a `defenderObserver` agent's perception already runs unconditionally regardless of its empty
  intrinsic list, so excluding it from a new sensor would be more code than doing nothing, for an
  unmeasurable saving. New `neighbor:<id>` belief id (`Belief.ts`), a new `VisionSensor.ts` candidate
  source (nearby fellow `Agent`s, reusing the entire existing cone/LOS/confidence pipeline), and a
  `Senses.ts` contagion term that `MAX`-combines a noticed neighbor's own alarm into this agent's own
  `threatLevel` — never additive, so a directly-seen hostile is never double-counted. Deliberately does
  NOT relay a neighbor's hostile belief secondhand into `take_cover`/`engage_threat_villager`'s own
  target gate, since the existing sound-based alarm-shout mechanism already covers most of that ground.
- [COMPLETE] ✅ **E6 · a real memory-stream foundation, explicitly without an LLM.** New
  `src/ai/core/Memory.ts` (zero network/model imports) implements NPC_AI_SPEC §11.2 verbatim: a 200-cap
  bounded array (`pushMemory`), a recency-only `recall(query, k)` stub (`query` accepted per the spec's
  own "for now" framing but genuinely unused), and `agent.recall(...)` on `Agent.ts`. Two real producers:
  `Reasoner.ts` on a notable Activity `SUCCESS` (an explicitly curated, small action list — `wander`/
  `idle`/ambient actions are deliberately excluded so the 200-cap stream isn't flooded with nothing worth
  recalling), and `VisionSensor.ts`/`HearingSensor.ts` on a belief's first tick of existence. A new
  `MEMORY` debug-overlay row satisfies this codebase's own "every layer ships with a debug view the same
  session it's built" rule with no exceptions.
- **Verified live with exact measured evidence, including the bug catch above.** A7: isolated math
  probes confirmed the 1.2m radius cutoff is exact and the crowd-case push plateaus rather than growing
  unboundedly; a real two-agent doorway integration test through the actual `navSteer`/Locomotion
  pipeline showed genuine separation growth (0.3m → 1.2m peak) with arrival unaffected, vs. a control
  run with avoidance forced off staying pinned at the starting distance; tier-C throttling was measured
  directly (13 vs. 120 re-steers over 120 frames). Post-fix, the yield asymmetry was re-measured as two
  distinctly different deflection angles (6.84° vs 16.70°) across the entire radius, not just at the
  edge. E3: triggered a real `reportAgentDamaged()` call and watched an observing agent's threatLevel
  rise purely from contagion with zero own hostile belief, confirmed `take_cover`'s own consideration
  reads the same real value live while correctly staying gated off (no direct target), and confirmed a
  `defenderObserver` agent gets the identical real belief/threat rise while its own action stays
  structurally null throughout. E6: a real end-to-end villager gather cycle produced a real
  "gathered resources at HH:MM" memory entry the moment the Activity actually succeeded; pushed 205
  entries onto a real agent's real stream and confirmed the cap holds at exactly 200 with correct
  oldest-first eviction; confirmed `recall` returns correctly-ordered, k-respecting results. Zero
  console/page errors across the full live session (~2.5 minutes of heavy real AI activity, 30+ spawned
  test agents, a real gather→haul cycle) and no regression to any existing AI population or Wave 36-41
  combat content. `npx tsc --noEmit` / `npm run build`: both clean, verified independently.

## Wave 43: arena depth (A5) + activating the 5 dormant challenge grounds (B6) — SHIPPED 2026-09-06

Tenth wave of the new 27-wave plan. Research found a real, previously-invisible reactivity gap in the
arena's own environment system before A5 could work as designed, and made an honest, reasoned scope
call on B6 rather than force-fitting 5 literally unique mechanics into one wave.

- [COMPLETE] ✅ **A5 · mini-boss spawns, a bonus objective, and REAL mid-run mutator swaps — plus a real
  bug found and fixed before it could ship silently broken.** Investigation traced every consumer of
  `arenaState.env` and found the gameplay multipliers (`playerSpeedMult`/`enemySpeedMult`/
  `ambientDamagePerSec`/`lootMult`) already read it fresh every frame — a mutator swap would have worked
  mechanically from day one. But the VISUAL side (`ArenaScene.tsx`'s floor/wall/fog color) only ever read
  `arenaState.env` as a stale prop at whatever render `TemplateWorld.tsx` happened to do, which nothing
  mid-run ever triggers — so a swap would have silently done nothing the player could see. Fixed with a
  small `useFrame`-polled `useState` inside `ArenaScene` itself (the in-Canvas equivalent of the
  rAF-poll convention `ArenaHud`/`BuildChallengePanel` already use outside it), with zero changes to
  `TemplateWorld.tsx`. Every milestone now guarantees a champion-tier mini-boss spawn (`shieldedElite`/
  `royal` at 1.6× the run's own scale) and rolls a fresh 30-second bonus objective; every milestone past
  the first also reshuffles the active environment to a different one of the 4 rings.
- [COMPLETE] ✅ **B6 · 3 genuinely new mechanic types across the 5 remaining challenge grounds, reused
  rather than force-fit into 5 unique systems.** Investigation found no existing generic joust/dummy/
  quintain mechanic to reuse (`joustRichard()` is entirely bespoke to the scripted Richard duel — a
  mount, a gallop flag, a one-shot distance roll, none of it generalizable) and confirmed the honest,
  right-sized scope: 3 new mechanic types (Gather Race, Defend the Plot, Joust Gauntlet — the plan's own
  named examples), assigned Gather→challenge-2/5, Defend→challenge-3/6, Joust→challenge-4 (the most
  novel of the three, not worth duplicating), leaving challenge-1's existing Build Race untouched. Each
  copies `BuildChallengePanel.tsx`'s exact proven shape (claim-gated Start button, rAF-polled leaf-module
  run-state, live countdown). Defend the Plot spawns real hostiles scoped to their own destination via
  the existing `worldOverride` mechanism (the same doctrine dungeon rooms and Cedric's camp already use)
  and drains the destination's own stored claim-flag position's HP via proximity — deliberately NOT real
  object-targeting AI against the flag (the siege-crew kind's un-scoped building-attack AI was
  investigated and correctly ruled unsafe to reuse here). **A real gap found and fixed along the way**:
  `combat.ts`'s exit-cleanup subscriber only ever cleared hostiles when leaving `'dungeon'` or `'arena'`
  specifically — leaving a Defend run mid-fight would have left its hostiles sitting inert in the store,
  reappearing alive on the next visit. Generalized to cover any `challenge-` prefixed world, with
  `ChallengeRunner.tsx`'s own Defend branch additionally doing the same cleanup immediately for the
  same-ground-retry case (no `destination` change) the generic subscriber alone can't catch.
- **Verified live end-to-end for every mechanic, not just spot-checked.** A5: forced kills to a real
  milestone and watched the real spawn/objective/mutator-swap fire on the very next tick — a screenshot
  confirmed the floor/wall genuinely repainted to the lava palette with visible pools, and an isolated
  ambient-damage measurement (HP 10→9.13 over ~3.2s with all other damage sources removed) confirmed the
  new environment's multiplier was live, not just cosmetic. B6: completed a real Gather Race by
  teleporting to all 6 real ring positions; confirmed Defend the Plot's hostile spawn was genuinely
  scoped to its own destination (two unrelated home-world skeletons were untouched), watched plot HP
  drain at the exact documented rate, and confirmed both the fail path (immediate cleanup) and the
  generalized exit-cleanup subscriber (a mid-fight `returnHome()`) independently cleared hostiles
  correctly; completed a real Joust Gauntlet with realistic precision scoring and a real gold/XP payout.
  Confirmed challenge-1's original Build Race is completely unaffected (zero diff to its own files, no
  dual-panel conflict with the new `ChallengePanels.tsx`). Zero console/page errors across the full
  session, and a final regression check confirmed no enemies leaked between any of the 3 new challenge
  worlds, the arena, or home after returning. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently.

## Wave 44: a third ownable settlement at template-04, The Siege Camp (B1) — SHIPPED 2026-09-06

Eleventh wave of the new 27-wave plan, replicating the empire arc's twice-proven settlement pattern
(template-08/Fenwick, Wave 4; template-07/Torvald, Wave 26) at a third site. Research corrected the
plan's own framing on what was actually missing, and implementation caught a real latent bug the new
three-settlement topology would have exposed.

- [COMPLETE] ✅ **Garrick, "Siege Camp Smith" — a new resident NPC at template-04, themed to the site's
  own real identity, not a generic builder.** Investigation found the plan's "Builders' Guild has no
  quest-giver" framing was imprecise: the guild's own errand pool (`GUILD_QUESTS.builders`, shipped
  Wave 22) is offered directly by the guild hall itself with zero NPC involved, for any of the game's
  5 guilds — confirmed live, no wiring needed there at all. What template-04 actually lacked was a
  resident, full stop, the same gap Waves 4 and 26 each closed at their own sites. Garrick reads as a
  war-camp survivor (the destination's real blurb: "a war machine still stands aimed at a keep it never
  breached") rather than a generic construction character, and "doubles" as the guild's quest-giver
  narratively only — his own dialogue references the hall's board, while his `sideQuests` field carries
  just the new settlement chain. Placed via the same local-point convention Fenwick/Torvald use,
  live-verified reachable with a clean, non-overlapping interact prompt.
- [COMPLETE] ✅ **A real, reasoned "no resource nodes" call, tested against the same evidence bar Wave 26
  used to justify the opposite call at template-07.** Investigation re-ran Wave 26's own decisive test
  (does the site's guild passive AND its blurb/loot promise real gathering, "twice over") and found
  template-04 fails it: the Builders' passive rewards construction swings, not mining, and the site's
  own iron-ore loot reads as a one-time salvage prop, not a promised vein — the same weak signal
  template-08 already has and correctly shipped without nodes. Residents (miner/merchant/builder) fall
  through the existing, already-proven `villagerAtWork` "nothing to work — don't stall the economy"
  fallback, identical to Bram's `farmer` role at template-08.
- [COMPLETE] ✅ **Reciprocal delivery quests in both directions, and two new caravan routes wiring the
  new settlement to both existing ones.** `camp_want_lumber` (Siege Camp wants wood from the Frozen
  Pass) and a new `pass_want_stone` appended to Torvald's own chain (Frozen Pass wants stone from the
  Siege Camp) — both confirmed to target raw, gather-harvestable goods after tracing `bumpSideQuest`'s
  matching logic, avoiding the exact craft-vs-gather quest bug class Wave 34 fixed elsewhere. Two new
  `CARAVAN_ROUTES` entries make template-04 a real hub, routed to both other settlements.
- [COMPLETE] ✅ **A real, previously-latent bug found and fixed before three settlements could expose
  it.** `caravanPartnerOf()` returned only the *first* matching route by object-key iteration order —
  harmless with exactly one route in the whole game, but with template-04 now routed to both other
  settlements, it would have silently stranded one of every hub's two connections, unreachable through
  the dialogue UI with no error. Generalized to `caravanPartnersOf(): string[]`, with `DialoguePanel.tsx`
  now rendering one real caravan card per reachable partner instead of assuming exactly one.
- **Verified live end-to-end, including the full quest chain, founding, and every new caravan route.**
  Completed Garrick's real 2-quest chain via real UI actions, filed the deed, and confirmed the exact 3
  named residents (Rurik/miner, Petra/merchant, Dunstan/builder) spawned and a real Collect Yield paid
  out the correct formula. Confirmed the caravan route table is now a real triangle — every settlement
  shows exactly 2 Trade Caravan cards — and dispatched/collected a real caravan on all 3 routes with
  gold landing exactly on the documented formula. Confirmed both new reciprocal delivery quests
  complete correctly in both directions, and confirmed zero regression to Fenwick's/Torvald's own
  existing chains, the original template-07↔08 route, or the Builders' Guild hall's own membership/
  errand flow. Zero console/page errors across two full live playthroughs. One placement-verification
  gap flagged by the implementation itself (Garrick's exact coordinate was reasoned but not yet
  live-surveyed) was closed by the verify pass itself, which teleported there and confirmed a clean,
  non-overlapping interact prompt on real walkable ground — the placement comment has been corrected in
  place to reflect that confirmation rather than leaving a stale "needs checking" note. `npx tsc
  --noEmit` / `npm run build`: both clean, verified independently.

## Wave 45: Anglers' Circle quest-giver (B2) + the 4 zero-occupant interiors get residents (B3) — SHIPPED 2026-09-07

Twelfth wave of the new 27-wave plan. B2 replicates Wave 44's own "a destination just needed a
resident, full stop" finding at a fourth site; B3 closes a real, differently-shaped gap the empire arc
had left open since Wave 24 — four generalized, enterable interiors (Storehouse, Jail Cell, Watch
Tower, Jewel Tower) that shipped with real rooms and zero occupants, contradicting the game's own
founding "quests come from allied NPCs, indoors" rule.

- [COMPLETE] ✅ **Wyeth, "River Landing Ferryman" — template-03's first resident, in a plain,
  independent `sideQuests` pool, not a settlement chain.** Confirmed live that the Anglers' Circle's
  own hall already offers its full errand pool with zero NPC involved (`GUILD_QUESTS.anglers`, same
  shape Wave 44 found for the Builders' Guild) — what template-03 actually lacked was a resident at
  all. Deliberately scoped smaller than Fenwick/Torvald/Garrick: no `SETTLEMENT_QUESTS`/
  `SETTLEMENT_FOUNDING` involved, matching the plain unchained pool shape Richard/John/Queen already
  use. Themed to the destination's own real identity (worlds.ts: "a loading dock, cart tracks, and a
  hint of trade") rather than duplicating the guild's fishing errands — his own lines point the player
  at the Circle's board instead of re-offering its content. Placed via the same local-offset convention
  Garrick/Torvald use (~21m east of `ANGLERS_HALL`); the resolved world point was cross-checked against
  `templateWalkableFootprint.generated.json`'s three overlapping template-03 walkable rects and falls
  inside all three, not just the one big union rect.
- [COMPLETE] ✅ **Four new resident quest-givers — Corwin (Storehouse), Cutter (Jail Cell), Perrin
  (Watch Tower), Aldous (Jewel Tower) — on a real, reasoned type-scoped design, not a copy of the
  fixed-destination NPC pattern.** These interiors are player-BUILT buildable types with no `unique`
  field (a player can have several, or none) — traced `removeBuilding()` end to end and confirmed it
  never touches `completedSideQuests`/`sideQuest`/`reputation`, all keyed on a fixed npc id already, so
  a resident keyed to the building TYPE (matching `INTERIORS`' own shape) rather than one specific
  building instance never risks an orphaned errand if every instance of a type gets demolished — it
  just goes temporarily unreachable, like any other quest-giver the player hasn't visited. New
  `INTERIOR_RESIDENTS` table (`data/npcs.ts`) merges into `NPC_BY_ID` only, deliberately NOT into `NPCS`
  itself — `Npc.tsx`'s render filter and PlayerController's home-only NPC loop both iterate `NPCS`
  unconditionally, and a resident's only real position is `pocketFor(type, buildingId)`'s shared "empty
  corner of the map" space, so an `NPCS` entry there would have produced a floating interact prompt with
  no NPC rendered at that empty field. Each resident's personality/errands are grounded in their own
  room's real purpose (a quartermaster's shelving/crates, a reformed poacher's bread/flowers, a
  lookout's kills/ore, an appraiser's iron/guard duty) — reusing the plain existing `SideQuestDef` shape
  throughout, no new quest kind.
- [COMPLETE] ✅ **A small, fully-reused wiring path for interior dialogue — no new panel, store action,
  or quest kind.** Traced the full interact chain and found `st.openDialogue(npcId)` already has zero
  position/world awareness (`DialoguePanel.tsx` resolves purely off `NPC_BY_ID`), so the only real gap
  was giving a resident an interact-range check inside the sealed pocket room. `PlayerController.tsx`'s
  existing `if (st.interior)` branch (previously only the Keep's chest/throne and a generic "Leave X")
  grew one more check: resolve the entered building's own resident, compare distance to
  `pocketFor(type, id)` + the resident's local offset, and hand back the exact same `kind: 'npc'` target
  every other NPC already dispatches through. `BuildingInteriorRoom.tsx` gained one generic
  `ResidentFigure` component (an ordinary `RiggedFigure` on `anim_r_restpose`) rendered unconditionally
  alongside the four existing per-type dressing components — it resolves to `null` for `keep`/`stable`.
  `QuestLogPanel.tsx` gained an `INTERIOR_REGIONS` list (mirroring `GUILD_REGIONS`' own non-`NPCS`-array
  region shape) so residents get a real journal section instead of silently having nowhere to appear,
  plus the matching fix to the panel's own carried-errand auto-open logic (previously would have
  defaulted an interior resident's `world`-less `NpcDef` to the 'homestead' region on open).
- **A real, severe blocker found and fixed by live verification: 3 of the 4 new interiors had no way
  to leave.** The first cut's resident-interact check reused the general `INTERACT_RANGE` (3.4m), which
  geometrically covers the ENTIRE floor of the Watch Tower, Jail Cell, and Jewel Tower rooms (all three
  under 3.6m across) from a centrally-placed resident — live-verified by teleporting to all 4 corners of
  each built interior and reading the real interact prompt: every single corner of those three rooms
  returned "Talk to `<resident>`", never "Leave the X". Since `exitInterior()` has exactly one call site
  in the whole codebase (reachable only via that exact prompt), a player entering any of these three via
  the ordinary door had no in-game action that returned them outside — only a Save & Return to Menu,
  which clears `interior` on load but does not relocate the player, stranding them at the interior's raw
  off-map pocket coordinates in an empty field. Fixed with a new, dedicated `RESIDENT_TALK_RANGE = 1.5`
  (`data/world.ts`, same pattern as the existing `FISH_CAST_RANGE`) — every room's worst-case corner
  still clears this by ~0.4-1.3m, guaranteeing a real "Leave" corner exists everywhere. Re-verified live
  after the fix: Jail Cell/Watch Tower/Jewel Tower now each correctly return a MIX of "Talk to X" near
  the resident and "Leave the X" near the door, confirmed by a real `KeyE` press actually firing
  `exitInterior()` and relocating the player out of the pocket coordinate space; Storehouse (the one
  interior with a large-enough room) was unaffected throughout.
- **A real bug found and fixed: Wyeth's reputation was permanently inert.** Wyeth's `NpcDef` initially
  omitted `repTitles`, even though the exact structural template this item was told to copy
  (Richard/John/Queen) all carry one — `addReputation()` (gameStore.ts) silently no-ops for any NPC
  lacking it, so turning in any of Wyeth's errands granted gold correctly but never moved his Standing
  tier. Live-confirmed before the fix (`reputation.wyeth` stayed `0` across a real turn-in) and after
  (went `0 → 15`, matching Richard/John/Queen's own 0/30/80/160 breakpoint convention, titled to his own
  "mind the dock and what crosses it" line).
- **Verified live end-to-end after both fixes**, real headless Chrome against a real running dev server
  (junctions to the main worktree's asset tree were available in this pass): confirmed Wyeth is reachable
  with a single unambiguous interact prompt and his full accept→progress→turn-in loop (including
  reputation and the quest-log region) works correctly; demolished a Storehouse mid-quest-chain, built a
  brand new one, and confirmed Corwin reappeared with his prior `completedSideQuests` state intact,
  correctly offering his second errand rather than re-offering the first or losing progress — the live
  proof the type-scoped (not instance-scoped) residency design holds under the exact demolish/rebuild
  case it was designed for. Zero console errors across the full live session. `npx tsc --noEmit` /
  `npm run build`: both clean, verified independently.

## Wave 46: a walled merchant camp (B4) + settlement road-preference authoring (B8) — SHIPPED 2026-09-07

Thirteenth wave of the new 27-wave plan. Research found the plan's own "B8 is authoring work, not an
architecture fix" framing was wrong — the nav-grid's road-mask mechanism structurally refused to run for
any non-home region, independent of whether data existed — and live verify caught a real discrepancy
between the implementation's own claimed measurement and actual live behavior before it could ship with
a visible pop.

- [COMPLETE] ✅ **B4 · the traveling merchant gets a real walled camp of his own**, moved off Alric's/
  Beda's shared starter-village corner into a new 3-sided enclosure (`mc001` corners + `mc005` walls, at
  the family's real 3.84m defensive height, not the starter village's stylized hut scale-down), reached
  by a new one-cell spur (leg 6) that T-junctions for free off the existing westward road trunk — the
  same zero-new-pathing-concept extension `road.ts`'s own header already proved 6 times over for the
  resource grounds. A defender can now be posted to guard the camp via a second `MERCHANT_CAMP_STATION`
  sentinel `stationId` — reusing the exact `keep:<socketId>` fixed-point mechanism Wave-precedent J51
  already pioneered, needing zero store changes since `stationDefender()` never validates the id it's
  given.
- [COMPLETE] ✅ **B8 · settlement road-preference, with a real architecture correction the plan itself
  missed.** `NavGrid.ensureRoadMask()` had a hard `this.region !== null` gate — an unconditional refusal
  for ANY destination, not a "no data yet" placeholder — because `road.ts`'s own `onRoad()` only ever
  checks position against home-coordinate-space `LEGS` with no region concept at all. Content authoring
  alone could never have satisfied this gate. New `src/game/data/settlementRoads.ts` provides real,
  already-resolved per-destination path segments (arrival→resident, arrival→guild-hall) computed live
  from the same `TEMPLATE_ARRIVAL_SPAWN`/`NPC_BY_ID`/`GUILD_BY_WORLD` coordinates Waves 4/26/44 already
  placed — no second hand-typed table that could drift from the source of truth. `ensureRoadMask()` now
  consults this per-region before falling back to its original no-op for every region without data,
  leaving templates 01/02/etc. completely untouched. **A second, previously-latent bug found and fixed
  in the same pass**: `recentre()` (used by every window-mode destination grid) invalidated
  `builtFrom`/`heightsStale` on origin change but never `roadMask` — harmless while the mask was always
  empty for destinations, but since a destination grid's first `ensureRoadMask()` call happens before
  its first real recentre (starting centred on the raw teleport origin, hundreds of units from the
  actual settlement content), the mask would have been built once over the wrong patch of space and
  never rebuilt, silently no-oping the whole feature the moment the grid actually recentred onto the
  settlement. Fixed by adding `roadMask = null` alongside `recentre()`'s existing invalidations.
- **A real discrepancy caught by live verify, not just re-stated from the implement pass.** The
  implementation report claimed to have live-measured the retuned `WALK_BUFFER=0.09` and found the
  merchant "already standing at the spot ~1.7s before the trading window opens." Verify independently
  re-measured the identical scenario from scratch and found the opposite: the merchant was still ~3.7m
  short of `MERCHANT_SPOT` when the window opened, producing a real, reproducible teleport-pop rather
  than a smooth arrival — the code's own more cautious in-place comment turned out to be the accurate
  account, not the implementation report's specific claim. Fixed by bumping `WALK_BUFFER` to `0.1`,
  re-measured live and confirmed closing to within 0.5m before the window opens (down from a ~3.7m pop),
  in both the arriving and leaving directions.
- **Verified live end-to-end for both items, with real quantified evidence, not just presence checks.**
  B4: `onRoad()` spot-checks confirm the new spur is real road and `MERCHANT_SPOT` sits correctly inside
  the yard off the printed carriageway; a real A*-cost comparison (with the road discount zeroed and
  restored) showed the AI genuinely choosing a longer, road-hugging route (cost 64.7) over a shorter
  beeline (cost 80.2) once the discount applied — real, quantified preference, not a coincidental tie;
  the `merchant_camp` station sentinel correctly resolves a posted defender's position and patrol radius
  end-to-end, confirmed via the existing debug hook. B8: for template-04, a real `travelTo()` plus a
  real per-frame `recentre()` (no manual test hacks) produced a genuine 144-cell road mask sitting
  exactly on the authored arrival→Garrick segment, with a real, measured cost discount (12.25 vs 20.41)
  changing the route's own shape — and the `recentre()` staleness fix was directly demonstrated live
  (forcing a far recentre nulls the mask immediately; a subsequent path rebuilds it correctly). The same
  was independently confirmed for template-07 and template-08, with template-01 (no authored data)
  confirmed as an unaffected control — zero regression to every other region. Zero console errors
  across the full live session (this repo's own `CLAUDE.md` conventions followed throughout — real
  GPU-rendered Chrome, no mouse/audio disruption). `npx tsc --noEmit` / `npm run build`: both clean,
  verified independently.

## Wave 47: contested caravan risk + rival settlement raids (B5) + a defend→growth quest link for all 3 settlements (B7) — SHIPPED 2026-09-08

Fourteenth wave of the new 27-wave plan. Research re-confirmed a stale "both settlements" framing in
both items' own plan text — Wave 44 already made it three (Fenwick/template-08, Torvald/template-07,
Garrick/template-04) — and built against all three throughout. Also made an explicit, reasoned scope
call: full settlement-ownership transfer ("ownership changes hands") was ruled out this wave.

- [COMPLETE] ✅ **B5 · `allegiance.ts` gets a real "how contested is my standing" signal**
  (`contestedPressure()`, 0 across the whole ±10 Unsworn band, ramping to 1 at either axis extreme) that
  both new mechanics read so they can never drift into different opinions of the same scalar.
  `caravan.ts`'s `effectiveCaravanRisk()` adds up to +15pp on top of a route's own flat `riskPct`,
  wired into the real roll in `collectCaravan()` — genuinely neutral standing leaves it untouched.
- [COMPLETE] ✅ **B5 · rival settlement raids**, a new leaf module (`game/settlementRaid.ts`) mirroring
  Wave 43's Defend-the-Plot shape exactly: real hostiles spawn via `spawn()`'s own `worldOverride`
  param, scoped to the founded settlement, ticked by a new always-mounted `SettlementRaidRunner.tsx`
  (next to `<ChallengeRunner/>` in `GameWorld.tsx`). Triggers at real dusk (`night > 0.62`, the same
  bound `Enemies.tsx`'s own raid already uses) once a settlement's own cooldown has passed (15 real min
  at zero contested pressure, floor 6 min at max) — genuinely Unsworn standing means neither house has
  reason to test the claim, no raid possible, by design. The attacking house's own kinds (`bandit`+
  `mountedRaider` for a crown-leaning claim, `royal`+`mountedRaider` for a Cedric-leaning one) close on
  the settlement's claimed plot and drain a real HP pool the player's own combat is what defends.
  **Explicit, reasoned scope-down, stated plainly rather than silently under-delivered**: permanent
  settlement-ownership transfer is NOT built. Two real reasons found live: the instance-separation
  architecture only ticks `world === null` (home) enemies while the player is elsewhere (`combat.ts`'s
  `Enemies()` filter), so a raid can only ever be a fight the player is standing in, never an unattended
  siege — undercutting the "at risk even when you're not looking" framing permanent loss would need to
  feel earned — and permanently deleting hand-founded content (named residents, real quest-chain
  prerequisites elsewhere) is a far bigger one-way commitment than the plan's own phrasing implied. What
  ships instead is real and reversible: a win pays a gold/xp bonus scaled by surviving plot HP and bumps
  the settlement's own new defend quest (B7); a loss — plot HP hits 0, or the player leaves mid-fight —
  never destroys anything, it pushes `lastCollectedAt` forward 5 real minutes, delaying (never voiding)
  the next yield collection. Also narrowed on purpose: no named-boss cameos (Cedric/Gilbert/Weezil) at a
  settlement raid — that stays exclusive to his own home arc; a settlement raid reads as anonymous rival
  pressure from whichever house the player has NOT been leaning toward.
- [COMPLETE] ✅ **B7 · a real defend→growth quest link for all three settlements**, built as content on
  top of B5's own raid mechanism per the task's explicit instruction, not a second disconnected system:
  a new `'defend'` `SideQuestDef.kind` (added to both `npcs.ts`'s union and `bumpSideQuest`'s own
  parameter type) advances the same opportunistic way `'caravan'` already does — `resolveSettlementRaid`
  calls `bumpSideQuest('defend', destId, 1)` on a win, ticking whichever settlement's defend quest
  happens to be the player's current errand. Each of the three chains (fenwick/torvald/garrick, all
  previously dead-ending after their Wave-27 reciprocal/caravan content) gets two new links: a
  `kind:'defend'` "Hold the Line" errand, then a `kind:'gather'` "expand" errand gated on it. Closing the
  expand quest is the system's first-ever real settlement growth — `turnInSideQuest()` bumps that
  settlement's new `growthTier` field (`Settlement` interface, promoted from a repeated anonymous inline
  type in both `gameStore.ts` and `types.ts` to one real shared type since both needed touching anyway),
  and `collectSettlementYield()`'s own formula now pays out `+ growthTier * 10` gold, permanently, on
  top of the existing resident-count bonus. **Inter-settlement rivalry content, grounded in B5's own
  mechanism rather than invented as a second concept** per the task's instruction: `DialoguePanel.tsx`'s
  Settlement Yield block now surfaces `contestedPressure(allegiance)` as a flavor line naming whichever
  house is NOT currently favored ("Word is riders loyal to King Leo have been probing the road"), and its
  caravan quote's own risk display switched from the route's raw static `riskPct` to
  `effectiveCaravanRisk()` so the quoted number is never a lie about what actually gets rolled.
  Explicitly scoped down, stated plainly: true settlement *population* growth (new residents arriving at
  a founded settlement post-founding) is a separate real system — no arrival mechanism targets a
  non-home world today (`recruitVillageFolk`/`checkVillagerArrival` are both hardcoded to the home
  roster) — and wasn't attempted here; what's delivered is a real yield-tier bump, not a headcount one.
- **Verified live end-to-end for both items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). One environment-only, non-code finding
  matching Wave 27's own: the isolated worktree was missing `public/assets`/`public/help` (both
  gitignored, not copied when the worktree was created), crashing every page load before any Wave-47
  code ran — fixed locally for the verification session only via directory junctions to the main
  checkout's asset tree; no tracked files were affected. With assets restored: drove the real
  `SettlementRaidRunner` trigger end-to-end by advancing the real world clock (`worldEnv.time`, not a
  direct `.night` write — `DayNight.tsx` recomputes `night` from `time` every frame and would have
  clobbered a direct write) past dusk with a real contested allegiance and an elapsed cooldown; confirmed
  a real `royal`+`mountedRaider` raid spawned and scoped correctly to the settlement's own world (zero
  enemies leaking to any other world); forced a win and confirmed the exact expected gold (30, matching
  `round(30·hpFrac)`) and combat XP, `lastRaidAt` stamped, and `sideQuest.have` bumped 0→1 on the
  player's real active `ruins_hold_the_line` quest; turned it in for real and confirmed the reward and
  `completedSideQuests`; forced a second raid and a real loss via leaving mid-fight and confirmed
  `lastCollectedAt` pushed forward by exactly the real `SETTLEMENT_RAID_YIELD_PENALTY_MS` (300000ms) constant, never
  a destroyed settlement; completed the new `ruins_expand` quest for real and confirmed `growthTier` went
  0→1 and `collectSettlementYield`'s own payout rose by exactly +10 gold on the next real collection
  (16 vs the prior 6, at zero residents, isolating the growth term). Confirmed live in `DialoguePanel`
  itself (not just the store): at allegiance −70, the rival flavor line correctly read "King Leo" and the
  displayed caravan risk read 20% — the hand-computed expected value (`0.10 base + 0.667 pressure × 0.15
  = 0.20`), not the route's flat 10%. Zero console/page errors across every session, across 4 separate
  browser runs — including a regression pass confirming a third, untouched settlement still founds
  correctly post-`Settlement`-interface-promotion, an untouched caravan route still applies its own flat
  risk at neutral allegiance, and Wave 43's Defend the Plot runs fully independently alongside an active
  settlement raid with zero cross-contamination. `npx tsc --noEmit` / `npm run build`: both clean,
  verified independently.

## Wave 48: escort + survive Sealed Crypt objectives (B9) — SHIPPED 2026-09-08

Fifteenth wave of the new 27-wave plan. `dungeon.ts`'s own `DungeonRoom.objective` doc comment had named
these two as deferred since Wave 13 ("need a follow-the-player NPC or a wave/timer system this dungeon
doesn't have") — this wave built both as genuinely distinct completion conditions, not data variants of
`combat`/`retrieve`, and re-confirmed the rest of the plan's own text held with zero drift this time
(unusual — most waves in this plan have found at least one stale claim).

- [COMPLETE] ✅ **'escort'** — a captive (reusing, by value, the exact verified-shipped "reformed
  prisoner" palette `data/npcs.ts`'s Cutter already uses, rather than guessing new colors) stands guarded
  at the room's centre. Freeing them (`PlayerController.tsx`'s new `dungeon_captive` interact, same
  distance-gated convention as the existing relic pickup) never touches `cleared` by itself — only
  walking the freed captive back to `layout.entryPos` does. Movement is a new, small, hand-rolled
  per-frame follower (`DungeonScene.tsx`'s `CaptiveFigure`, styled after `Defenders.tsx`'s own
  per-figure pattern) driven by the real standalone `navSteer` primitive already used by
  Villagers.tsx/Merchant.tsx — region `'dungeon'`, so it paths around the crypt's real walls rather than
  beelining through them. Deliberately not built on AgentManager/Reasoner: dungeon enemies themselves
  aren't Agent-driven either (plain `useEnemyStore` entries), so adding that machinery for a one-off
  captive would have been new, unnecessary architecture. The room's own guard (reusing `combat`'s exact
  `enemyKind`/`enemyCount`/`spawn()` shapes, count fixed at 1) makes the escort a real fight, not a free
  walk-out — explicit, reasoned scope-down: the captive itself has no HP/downed state (cannot be lost,
  only delayed), matching `falcon.ts`'s zero-vulnerability companion precedent rather than building a
  second combat state machine for a one-off NPC.
- [COMPLETE] ✅ **'survive'** — no enemies until the player physically steps inside the room's own AABB
  (deliberately not an instant dungeon-wide start the way `combat` spawns immediately — that would let a
  player dawdle elsewhere until the clock already ran out, then walk into an empty, auto-cleared room for
  free). Once started: a 50-second timer, hostiles trickling in on a 7-second cadence up to 3 concurrent
  (repurposing `enemyCount`'s meaning for this objective, documented in place rather than adding a
  parallel field), `cleared` flipping only on timer expiry — never on a kill, the genuinely different
  completion condition the plan asked for. Expiry cleans up only that room's own survivors via a
  room-scoped `remove(id)` loop, not the store's `removeByWorld('dungeon')` (confirmed too broad — it
  would wrongly wipe every other room's live enemies mid-session).
- **Generation weighting retuned** to make room for both: `RETRIEVE_CHANCE` 0.3→0.20, new
  `ESCORT_CHANCE`/`SURVIVE_CHANCE` at 0.15 each, `combat` keeping the remaining 0.50 (still the clear
  plurality the dungeon's own design doc calls for, just no longer a default-by-elimination 0.70). The
  simpler `generateFallbackLayout()` safety-net path (used only if all 5 real-generator attempts fail to
  pack a layout — confirmed vanishingly rare given `REACH_LIMIT`/`MARGIN` in an open plane) deliberately
  keeps rolling only `none`/`combat`, unchanged, exactly as it already did for `retrieve`.
- `DungeonStatus.tsx`'s existing 250ms-polled HUD line generalized for free once `cleared` is set
  correctly by both new objectives, plus two small additions for the mid-attempt state the base line
  alone doesn't convey: a live "Hold the line! {n}s" countdown for an active survive timer, and "Lead the
  captive to the entrance!" once an escort captive is freed but not yet delivered.
- **Verified live end-to-end for both objectives, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing gitignored `public/assets`/`public/help`), fixed
  locally via directory junctions to the main checkout's real copies, removed afterward with the main
  checkout confirmed untouched. With assets restored, on real natural (non-forced) dungeon rolls: exactly
  1 guard spawns per escort room; the guard is a genuine threat (player HP measured dropping ~10→7.49
  over 2.5s of lingering in melee range); the freed captive's real trajectory was captured bending around
  a corner on a 2-hop room (x-coordinate measured decreasing then reversing mid-route — geometrically
  impossible for a straight beeline, proving real corridor-waypoint pathing rather than wall-clipping),
  with measured walk (2.6 m/s, dist<6m) vs run (4.8 m/s, dist>6m) transitions matching the tuned
  constants exactly; delivery correctly flipped `cleared` only once within 6m of `entryPos`, never on the
  guard's death. For survive: the deadline measured staying exactly 0 while outside the room, starting
  the instant the player entered (~49.4-50s measured remaining); cadence spawns respected the 3-concurrent
  cap; killing every spawned enemy before expiry explicitly did NOT clear the room (confirmed
  `cleared:false` with 0 alive and ~18.7s still remaining — the load-bearing "not a data variant of
  combat" check); expiry flipped `cleared:true` and removed exactly that room's 2 remaining survivors
  while a sibling room's own live enemy (the escort guard) was confirmed still alive afterward, proving
  the room-scoped cleanup doesn't over-reach the way `removeByWorld` would. Full-crypt-clear reward path
  confirmed on an 8-room layout containing both new objectives alongside combat/retrieve/entry: correct
  84 gold (`20 + rooms·8`) and the full Armory grant. Regression-checked 'none'/'combat'/'retrieve' and
  the HUD counter, all unchanged. Zero console/page errors throughout. `npx tsc --noEmit` / `npm run
  build`: both clean, verified independently (both by the workflow's own Verify pass and, separately,
  by direct review of the merged diff against the live worktree afterward).
- **One pre-existing, non-blocking fragility found and correctly left unfixed** (confirmed via diff
  review to predate this wave — not part of its changes): `DungeonScene.tsx`'s
  `useMemo(() => dungeonState.layout, [])` freezes the captured layout reference for the component's
  lifetime. If `returnHome()` and `enterDungeon()` were ever called back-to-back within the same
  synchronous tick (bypassing React's normal unmount-then-remount across separate frames), room
  decorations (the pre-existing `RelicMarker`, and this wave's new `CaptiveFigure`) would keep reading a
  discarded layout while every other system (the interact scan, `Enemies.tsx`'s 1Hz loop, the HUD) reads
  the live `dungeonState.layout` fresh each time. Confirmed unreachable through real gameplay (a real
  player always triggers these via separate UI clicks spanning many real frames) — reproduced only by a
  same-tick scripted test technique. Worth a `useSyncExternalStore`-style read (or at least a guarding
  comment) the next time this file is touched, but correctly out of scope for this wave's own diff.

## Wave 49: multi-tier weapon crafting (C1) + a dynamic market (C3) — SHIPPED 2026-09-09

Sixteenth wave of the new 27-wave plan. Both items reuse real, existing precedent from this project's
own history rather than inventing new mechanisms — the chestplate chain's "one tiered slot, re-forge
the tier below" shape for C1, and the `lastTaxAt`/`lastCollectedAt`/`settlementRaidCooldownMs`
"stamp-a-time, decay-on-read" convention for C3.

- [COMPLETE] ✅ **C1 · sword and halberd tiers** — `sword_forged`/`sword_crested` and
  `halberd_forged`/`halberd_crested`, each re-forging (consuming) the tier below plus more bar/plank,
  exactly like `chestplate_forged`/`chestplate_crested` already do. A real, load-bearing difference from
  armor was found and solved rather than copied blindly: `MELEE`'s per-type stats are a deliberate
  sword-vs-halberd-vs-spear tradeoff table (reach/sweep/cone/stamina), not a strictly-better ladder like
  armor — so a new `MELEE_TIERS` table scales ONLY `dmg`/`wornDmg` per tier, by the same multiplier
  across both weapon lines, keeping the halberd/sword single-target-DPS ratio near-invariant
  (0.870/0.860/0.854 across the three tiers) rather than letting a tier upgrade quietly erase the
  type-vs-type choice. The weapon-select UI needed zero changes — the existing 5-tile type row still
  works exactly as before; a new `bestMeleeTierOwned()`/`ownsMeleeSlot()` pair (mirroring
  `bestChestplateOwned()`) makes each tile's live combat stats automatically track whichever tier of
  that type is currently owned. Went with the bolder visual option over the cheap one: a real second
  `sword`-role donor (`minifigjohnmayne02`, picked from 3 real candidates in `part_roles.json` via a
  file-size tiebreaker, the same technique Wave 34's axe donor used) gives the Crested Sword a genuinely
  different mesh; the Forged Sword and both halberd tiers (confirmed zero second `halberd`-role donor
  exists) get a material tint instead — verified structurally safe (the tint is applied inside
  `loadWeapon()`'s own per-`WeaponId` promise cache, so it can never bleed onto a different tier's or
  the base mold's shared material). Spear stays untiered this wave (plan text says "at least sword and
  halberd"), and defender/Armory loadouts don't get the new tiers either — both named as deliberate,
  stated scope-downs, not silent gaps.
  **Two real bugs found and fixed, both regressions a naive "just add a recipe" implementation would
  have shipped**: re-forging a tier consumes the base item, dropping `inventory.sword`/`inventory
  .halberd` to 0 — `playerAttack()`'s own damage-eligibility check (`held`), `activeMelee()`'s weapon-
  readiness fallback, and `cycleWeapon()`'s ownership scan all still read that flat count directly and
  would have scored a real, visibly-wielded Crested Sword as bare-fisted. Fixed by routing all three
  through the new `ownsMeleeSlot()` (owns ANY tier). A second instance of the identical bug was found
  live during implementation, in a file the initial diff had missed: `Viewmodel.tsx`'s own `tool`
  `useMemo` had a second, independent raw `inventory.sword` check gating the first-person weapon mesh —
  fixed and reverified with a real in-hand screenshot. A third, unrelated pre-existing bug was found and
  fixed along the way: the "Knight's Arms" deed (carry a sword and a shield) had the same raw-count
  check, permanently unearnable by anyone who re-forges before ever owning a shield — fixed inline in
  `achievements.ts` (not via a `combat.ts` import, which would create a real `gameStore → achievements →
  combat → gameStore` cycle).
- [COMPLETE] ✅ **C3 · a dynamic market** — a single signed "pressure" level per `ItemId`
  (`MarketEntry.level`, −1..+1, persisted in a new `SaveGame.marketState` field) drives both the sell
  and buy price for that good in the same direction: selling floods the market (nudges toward −1,
  cheaper both ways), buying drains it (nudges toward +1, pricier both ways) — one coherent lever, not
  two independent ones. Read lazily via `decayedMarketLevel()`, linearly decaying any swing back to 0
  over a real 20-minute half-life, the same "stamp a time, decay-on-read" shape `lastTaxAt`/
  `lastCollectedAt` already use, generalized from a binary gate to a continuous value. Numbers reasoned
  against real feel, not guessed: one traded unit moves the price ~1% (imperceptible on its own); a
  ~25-unit sell-off swings a good to its ±25% floor/ceiling (a real, earned "you crashed that market"
  moment); 20 minutes to fully recover sits deliberately above the tax gate's 5 minutes and the
  settlement-raid cooldown's 6-15 minute band, since a market swing should span "go do something else,"
  not "wait through one loading screen." A real plan-text correction, stated rather than carried
  forward: `guilds.ts`'s rank-gated vendor stock does NOT "prove fluctuation is buildable" as the plan's
  own wording claimed — it's a flat, static price merely gated by membership rank, and is a fully
  separate store action (`buyGuildOffer`) untouched by anything this item built; what it actually
  proves is a reusable per-context stock-list shape, not a fluctuation mechanism. Guild vendor pricing
  is explicitly, deliberately left unfluctuating this wave. `ShopPanel.tsx` gets a necessary (not just
  decorative) live "▲ scarce (+N%)" / "▼ oversupplied (−N%)" tag, since a 25% swing on a 1-2g good
  (wood/stone) rounds away in the displayed gold number without one — plus a light 4-second refresh
  interval so a swing visibly decays while the panel sits open.
  **One minor, pre-existing display gap found and correctly left unfixed as out of scope**: confirmed
  via `git show main:...ShopPanel.tsx` that the Wanderer class's small "Fair Dealer" +2% haggle bonus
  has never been shown on the ticket's displayed price (only applied at the real charge in
  `gameStore.ts`'s `sellItem`/`buyOffer`) — predates this wave entirely and this wave's own new market
  tag follows the exact same (already-incomplete) display formula rather than introducing or worsening
  the gap. Worth a one-line fix whenever `ShopPanel.tsx` is next touched.
- **Verified live end-to-end for both items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing gitignored `node_modules`/`public/assets`/
  `public/help`), fixed locally via directory junctions to the main checkout's real copies, removed
  afterward with the main checkout confirmed untouched. With assets restored: crafted the full sword
  and halberd ladders via real Crafting-panel clicks, confirming exact re-forge consumption at every
  step (25 iron_bar / 15 plank total, matching the design table) and measuring REAL per-hit damage via
  the actual `playerAttack()` function against a freshly spawned enemy — base/forged/crested sword dealt
  exactly 3/3.5/4, halberd 4.5/5.2/5.9, matching `MELEE_TIERS` exactly, with the weapon-select tile
  requiring no manual re-equip (best-owned-tier auto-wins). Confirmed the always-owned-sword quirk is
  handled correctly: after fully re-forging to Crested Sword, `inventory.sword` reads 0, yet the sword
  still deals real (non-bare-fist) damage. Confirmed zero regression to the existing chestplate chain.
  For the market: sold 15 iron_bar one at a time via the real "Sell 1" button, measured the level moving
  to exactly −0.6 and the displayed/charged price moving from 8g to 7g exactly, confirmed the level
  clamps at exactly −1.0 under aggressive over-selling, confirmed the existing Wit/Silver-Tongue haggle
  formula still applies ON TOP of (not replaced by) the market multiplier (9g at wit=5 + Silver Tongue
  + the −25% floor, matching `8·(1−0.25+0.20+0.15)` exactly), confirmed buying the same oversupplied
  good is also cheaper (not pricier) — the "one lever, both directions" design working as intended — and
  tested real wall-clock decay by advancing `Date.now()` forward from the floor (+10 real-equivalent
  minutes showed ≈−12%, +25 minutes showed a full return to baseline with the tag gone, while the
  underlying stored `level` itself stayed untouched until the next real trade). I independently
  re-derived every one of these figures by hand from `MELEE_TIERS`/`decayedMarketLevel`'s own formulas
  and confirmed they match. Zero console/page errors throughout. `npx tsc --noEmit` / `npm run build`:
  both clean, verified independently (both by the workflow's own Verify pass and, separately, by direct
  review of the merged diff against the live worktree afterward, including confirming the tint-isolation
  claim structurally via `loadWeapon`'s real `Map<WeaponId, Promise<...>>` cache declaration).

## Wave 50: equipment rarity + stat rolls (C2) + an enchanting/upgrade system (C4) — SHIPPED 2026-09-09

Seventeenth wave of the new 27-wave plan. Both items were resolved against a real, explicitly-weighed
architecture fork rather than defaulting silently: this codebase has NO per-instance item identity
anywhere in its history (even `durability` is keyed by weapon TYPE, not by which specific crafted copy
you hold, confirmed independently during Wave 49's own review) — true "random stat rolls" onto one
specific picked-up copy would have been a genuinely new architecture axis with a wide blast radius
across the Satchel, crafting, sell/buy, and the save format. Both items instead extend Wave 49's own
just-shipped tiered-`ItemId`-plus-lookup-table shape one rung further, reusing (not inventing) the exact
pattern that fork already proved out.

- [COMPLETE] ✅ **C2 · a real, drop-only `legendary` tier** — a 4th rung above `crested` on both the
  sword and halberd lines (`sword_legendary`/`halberd_legendary`), continuing Wave 49's own arithmetic
  sequence one step further (dmg scales ×9/6 relative to the base weapon, vs. forged's ×7/6 and
  crested's ×8/6) — sword/halberd single-target DPS ratio stays at 0.869 across all four tiers, matching
  the near-invariant 0.870/0.860/0.854 sequence Wave 49 established, so the type-vs-type tradeoff
  survives at the new top rung too. **Deliberately NO recipe, ever** — legendary drops only, from a new
  `BOSS_LEGENDARY_DROP` roll table (`bossEncounter.ts`) fired at each of the 3 real Satchel-bound
  boss-victory moments: the green dragon rout (8%, the lowest-tier, most repeatable fight — stingiest by
  design), the black dragon rout (15%, the tier ceiling, rarer to even reach), and Cedric's one-shot
  capstone defeat only, never a farmable rematch (25%, the best odds of the three, since it can never be
  repeated). A real, load-bearing plan-text correction, found and stated rather than carried forward:
  `LOOT_TABLES` (the table the plan's own wording pointed at) has `cedric: []` and `storm: []` — there is
  no populated "boss loot table" to hang a rarity roll off; the real boss-reward mechanism is
  `BOSS_VICTORY_REWARD` (Wave 38), confirmed to grant only raw materials/gold, zero equipment, before
  this wave. Visual differentiation reused Wave 49's own donor-tiebreak method exactly: a full
  `part_roles.json` re-scan found one real, still-unclaimed `sword`-role donor
  (`minifigprincessstorm01`, the smaller of two remaining candidates by file size) for the Crested
  Sword's real mesh-swap precedent to extend to Legendary; halberd still has exactly one real
  `halberd`-role donor in the whole rig, so both its upper tiers stay tint-only, an honest, stated
  scope-down. **A real regression closed proactively, the same class Wave 49 found and fixed twice**:
  the "Knight's Arms" deed check was extended to recognize a dropped Legendary Sword too, before anyone
  had to rediscover the gap.
- [COMPLETE] ✅ **C4 · a permanent weapon enchantment** — two new forge recipes (`sword_rune`/
  `halberd_rune`, 150/160 skillXp, the highest of any recipe in the game) apply a flat, one-way +10%
  `dmg`/`wornDmg` post-multiply inside `meleeStatsFor()`, composing automatically with whichever tier
  (including C2's new `legendary`) is currently worn — fully independent of C2's own tier ladder, zero
  extra wiring needed since `meleeStatsFor` already generalizes over both. Priced by `dyes.ts`'s own
  "how hard to get hold of, not how it looks" logic, spending the same two ordinary gatherables Tyrian
  purple (the dearest dye in the realm) does — herb and flowers, at higher quantities — plus an
  `iron_bar` cost deliberately exceeding even the Crested tier's own re-forge cost. No gold cost: a full
  read of every recipe in the game confirmed gold is never spent anywhere in this economy, only earned —
  inventing that mechanic here would have been new, unproven plumbing the feature didn't need. The rune
  itself is a plain marker `ItemId` sitting in inventory forever (one-way, no un-enchant path, matching
  dyes' own "opens a row forever" precedent) rather than a literal per-item socket — reasoned explicitly:
  a socket needs the same per-instance identity C2's own fork already ruled out, for the identical
  reasons, and this codebase's real `SaveGame`-string-array dye mechanism couldn't be reused verbatim
  either, since `gameStore.ts` cannot import `MeleeWeaponId` from `combat.ts` (the reverse is already
  true) — a flat `ItemId` sidesteps that cycle for free, reading through the exact same `inv` map
  `meleeStatsFor` already receives.
- **Verified live end-to-end for both items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing gitignored `node_modules`/`public/assets`/
  `public/help`), fixed locally via directory junctions to the main checkout's real copies, removed
  afterward with the main checkout confirmed untouched. With assets restored: measured REAL per-hit
  damage via the actual `playerAttack()` function at every tier of both weapon lines — sword
  3.0/3.5/4.0/4.5, halberd 4.5/5.2/5.9/6.75, all exact matches; ran the green- and black-dragon legendary
  roll 300 times each via real `end(true)` calls (6.0% vs. designed 8%, 13.0% vs. designed 15%, both
  within statistical noise) and confirmed a real grant snapshot showed the flat reward and the legendary
  drop coexisting correctly in inventory; exercised Cedric's one-shot capstone via the real store action
  with a forced roll value (a genuine hit granting the halberd alongside the existing chestplate/
  allegiance/notify rewards, a genuine miss granting none of it, and a repeat call while already defeated
  correctly no-op'ing, confirming the new optional argument didn't disturb the existing idempotency
  guard). Confirmed the enchant's exact ×1.1 multiply at three tiers per weapon, including the
  half-up-rounding edge case (6.75×1.1=7.425 → 7.43, matching the coded `round2` exactly), and — the
  wave's own explicit persistence ask — crafted a rune, force-saved via the real `toSave()`+localStorage
  path, reloaded the page, resumed the same save via the real menu UI, and re-measured combat to confirm
  the rune survived the full save/reload/resume round trip rather than only live-session state. Real
  `craft()` flow tested end-to-end for both new recipes (missing unlock, short-by-one-ingredient, and
  exact-cost paths all behaving correctly, ingredients deducted to exactly 0 on success). Zero regression
  to the existing chestplate chain, the market, or any of Wave 49's own tiers, confirmed via `git diff`
  showing only the 12 intended files touched. Zero console/page errors throughout. `npx tsc --noEmit` /
  `npm run build`: both clean, verified independently (both by the workflow's own Verify pass and,
  separately, by direct review of the merged diff against the live worktree afterward, including
  independently re-deriving the DPS-ratio and enchant-multiply math by hand and confirming the
  `cedricCaptures === 0` capstone-only gate at combat.ts's two call sites is doubly redundant-but-safe
  with `markCedricDefeated`'s own internal `first` guard, not a real gap).

## Wave 51: Satchel drag-and-drop + a real villager equipment pool (C5) + freeform per-instance building scale (C6) — SHIPPED 2026-09-09

Eighteenth wave of the new 27-wave plan. C5's own premise turned out to be significantly stale — two
real corrections found and stated rather than carried forward — and C6 reused a directly analogous,
already-proven Wave-9 shape almost verbatim.

- [COMPLETE] ✅ **C5 corrections, found live before any code was written**: "villager gear caps at
  helmet/chestplate" is wrong — carriers (`CARRIERS`, Wave 9) and a real, Armory-backed defender weapon
  loadout (`DEFENDER_LOADOUTS`) already extend well past that. And drag-and-drop for villager gear is
  **already built** — `NpcEquipPanel.tsx`'s own header already states it, confirmed live at its real
  `draggable`/`onDrop` call sites for helmet/chestplate. A further, load-bearing structural finding: the
  plan's own suggested target ("drag a Satchel item straight onto a villager's gear slot") is not
  buildable at all — `Panels.tsx` renders exactly one HUD panel at a time, and the Satchel grid
  (`InventoryPanel`) and the villager slots (`NpcEquipPanel`) are never mounted together, and native
  HTML5 drag-and-drop requires source and target to coexist in the DOM for one continuous gesture. This
  ruled out that specific idea rather than leaving it a judgment call.
- [COMPLETE] ✅ **C5 · the two real, same-panel drag upgrades that ARE buildable**: the raw Satchel grid
  (confirmed genuinely lacking any drag behavior, unlike the two surfaces above) is now a real drag
  source for weapon-family items, via a new `weaponSlotOfItem()` reverse-lookup so a dragged tiered item
  (`sword_forged`, `halberd_crested`, …) resolves to its base slot and lands on the existing weapon row's
  `onWeaponDrop` unchanged. And `NpcEquipPanel`'s own Armory-stock tiles are now draggable on a Satchel
  spare too, auto-donating 1 before equipping when Armory stock reads 0 — collapsing the old two-step
  "Donate 1, then drag" into one motion, reusing the existing `donateToArmory` action verbatim (a no-op
  when stock is already ≥1, so nothing about today's behavior changes for that case).
- [COMPLETE] ✅ **C5 · a real villager equipment pool, closing a gap Wave 21 explicitly named and
  deferred** — `villagerCombat.ts`'s own header comment already stated outright that an ordinary
  villager "has no level/loadout/trait system to scale [combat] off of, and inventing one is real
  content scope this wave doesn't need." A new `villagerGearHpBonus(gear)` reads the SAME
  helmet/chestplate fields any villager could already cosmetically wear, reusing `chestplateHp()`
  (confirmed to have exactly one prior caller in the whole codebase, `Defenders.tsx`, and already fully
  generic) at half a defender's own bonus, plus +1 for a helmet (vs. a defender's +3) — bare 8 HP →
  fully crested+helmeted 17 HP, deliberately kept clear of even an unarmored level-1 defender's own 24 HP
  floor. Damage output was investigated and deliberately left flat: a defender's own damage formula
  never reads armor either (only loadout/level/courage/trait feed it), so extending it here would have
  broken this codebase's own established "armor is toughness, never damage" taxonomy, and the only
  integer headroom available (1→2) would tie, not stay under, the exact bare-defender floor the constant
  's own comment says must never be matched. A wider ask — giving ordinary villagers real weapon-loadout
  access, not just gear-derived HP — was investigated and explicitly scoped out: the `job === 'defender'`
  gate turned out to be four separate subsystems wide (store refusal, rendering, AI scoring, leveling),
  a materially larger and riskier effort than this item's own framing supported, left as a candidate for
  its own future, dedicated wave rather than reopened here.
- [COMPLETE] ✅ **C6 · a real, purely-visual per-instance `PlacedBuilding.scale`**, built as close to
  verbatim as possible to Wave 9's own `yaw` field — the identical "second, visual-only field, absent
  means 1, collision/footprint stay reading the catalogue's own fixed size, off by default and aimed at
  decor" shape, restated in `scale`'s own doc comment for the identical honest reason `yaw`'s already
  gives for rotation. Lives in the same `freeformBuild` mode (not a new toggle), controlled by the
  previously-unclaimed `[`/`]` key pair (confirmed unbound anywhere in the whole codebase), with Shift
  for a bigger step mirroring `R`'s own existing Shift-for-a-full-quarter-turn convention. A single
  uniform scalar, not per-axis — investigated and rejected non-uniform scaling since no placed piece in
  this catalog has an established use case for stretching one axis independently, and it would visibly
  misalign several pieces' own delicate stone-centering offsets. Range clamped to 0.5-2.0 (exact
  reciprocals, so scaling up then back down returns to precisely 1.0 with no rounding drift) — a
  deliberately conservative bound given collision never scales, so a wider range would only widen the
  gap between what a piece looks like and what it actually blocks. The build-mode ghost preview makes
  this honesty visible rather than hiding it: the footprint plane (what `evalPlacement` actually tests)
  stays outside the new scaled group entirely, while the box+wireframe (what you see) sit inside it,
  pivoted at the piece's own base so it grows/shrinks from the ground rather than floating or burrowing.
  Threaded through every real render branch in `Buildings.tsx` (all 9 procedural fixture types, the
  generic `PropModel` fallback which already had a working, simply-unused `scale` prop, and the
  animated-rig branch via a new `RiggedProp.scale` prop) — with the 4 cart-type buildables explicitly,
  deliberately excluded, since their live-tracked push-physics position is a materially different,
  riskier system than the static `b.x`/`b.z` path every other buildable uses.
  **A real, subtle bug found and fixed during implementation, directly analogous to Wave 31's own keep
  clip-plane finding**: `ConstructionSiteModel`'s "rising" reveal effect uses a genuine world-space
  Three.js clip plane, which is never transformed by a parent group's own scale — naively wrapping it in
  a scaled group (as the initial research plan's own "same one-line addition" framing assumed) would
  have permanently clipped the top off any scaled-up building for its entire construction duration.
  Fixed by threading `scale` into the clip-height math by hand (`topY = worldY + h·progress·scale`)
  rather than relying on the parent transform.
- **Verified live end-to-end for both items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing gitignored `node_modules`/`public/assets`/
  `public/help`), fixed locally via directory junctions to the main checkout's real copies, removed
  afterward with the main checkout confirmed untouched. For C5: real HTML5 drag events fired a Satchel
  sword onto the weapon row and flipped the readied weapon for real; a real one-drag Armory donate+equip
  produced the correct Satchel-count drop and `villager.gear.helmet` flip, screenshotted with both real
  in-game notify banners; the gear→HP wiring was read live off the actually-mounted component
  (`window.__kkvillagercombat`: bare 8, fully geared 17, exactly matching the formula); a real combat
  exchange through the actual damage-application code showed the bare villager downed in 4 hits while
  the armored one held through 2 hits at identical per-hit damage (a bigger HP pool, never damage
  reduction, matching the stated design); and the same villager made a real defender showed a live 43 HP
  — a decisive, real "loses cleanly to a defender" margin. For C6: real `[`/`]` keypresses in freeform
  mode drove the actual `freeScale` state into a real placement (`scale:1.5` for 5 presses, exactly
  matching `1 + 5×0.1`); a default (non-freeform) placement stored no `scale` field at all; a
  side-by-side screenshot showed a 2x-scaled piece dramatically larger than its default-sized twin; and
  collision honesty was proven BOTH ways live — a small piece was correctly allowed to overlap a
  2x-scaled neighbor's enlarged VISUAL mesh (screenshotted, showing real mesh clipping) while still being
  correctly BLOCKED from the same neighbor's true, unscaled 1x collision box. Zero console/page errors
  throughout either item. One real, pre-existing, non-blocking UX wrinkle found and correctly left alone
  as out of scope: `NpcEquipPanel`'s own panel height cap means a real drag between the Armory row and
  the paperdoll slots needs the browser's native edge-hover auto-scroll to bring both ends into view at
  once in one gesture — unchanged Wave-9 panel geometry, not a Wave-51 regression, and standard HTML5
  drag-and-drop already supports the auto-scroll gesture. `npx tsc --noEmit` / `npm run build`: both
  clean, verified independently (both by the workflow's own Verify pass and, separately, by direct
  review of the merged diff against the live worktree afterward, including independently re-deriving
  the villager HP-bonus arithmetic by hand and confirming the clip-plane fix's math against the ghost
  -preview's own pivot-at-base scaling behavior).

## Wave 52: progression endgame batch — D1 rank above Paladin, D2 perk pool, D3 talent mastery tier, D4 guild max-rank content, D5 challenge tier rewards — SHIPPED 2026-09-10

Nineteenth wave of the new 27-wave plan, and the first genuine 5-item batch in this segment. Research
found two real mechanisms the plan's own brief hadn't flagged that reshaped D1's design, and one place
where re-verifying live reversed a "NEW FINDING" this session's own earlier grounding pass had gotten
wrong — both are worth reading in full below.

- [COMPLETE] ✅ **D1 · a 6th rank, Marshal** (`minTotalLevel: 45`, continuing the existing 3/5/8/12
  step-diff sequence's own +1 second-order pattern exactly, rather than a round number), gated on
  `cedricCaptures >= 1` — the same two-part "level floor + real gate" shape Knight/Paladin already use,
  chosen over the black dragon's own ambient RNG roll (not player-initiated; a player can be eligible
  for months of in-game nights and never see the fight) specifically because Cedric's Final Stand is
  player-initiated on demand, deterministic once attempted, and already the game's own narrative climax
  for the main antagonist arc. Two real mechanisms not named in the plan's own brief were found live and
  shaped the design: (1) `MainMenu.tsx`'s `TOP_RANK` (`RANKS[RANKS.length-1].name`) gates New Game+
  eligibility and was ALREADY written, by a prior wave's own comment, to anticipate exactly this —
  shipping Marshal means a save already at Paladin loses NG+ eligibility until it reaches Marshal too,
  itself a second real, substantive "genuinely new" consequence the plan's own text asked for, not just
  a title; (2) rank-transition detection (ceremony/notify/perk-nudge) previously lived ONLY inline
  inside `addXp`, so a rank crossed by anything other than a skill-XP tick would silently announce
  nothing — since Marshal's own gate is a boss-capture count, not XP, this was a real trap a naive
  implementation would have shipped silently broken. Fixed by extracting the shared logic into a new
  `announceRankChange()` helper, called from both `addXp` (unchanged behavior) and from
  `markCedricDefeated`'s first-capture branch (the actual fix — confirmed live to fire the full
  ceremony/notify/perk-nudge sequence the instant `cedricCaptures` flips 0→1, even with the level floor
  already met beforehand).
- [COMPLETE] ✅ **D2 · a 5th perk slot + 4 new perks** — the 5th slot required zero code change
  (`perkSlotsEarned`'s `RANKS.findIndex()` already generalizes over however many ranks exist). Two plain,
  no-downside perks (Honest Weight: +8% trade prices everywhere including caravan quotes; Forager's
  Fortune: 10% chance of +1 on any personal harvest) and two trade-offs (Iron Discipline: +20 max
  stamina but 25% faster tool wear; Quick Draw: +20% bow/crossbow damage but −15% max stamina) — pool
  now 12 (7 plain/5 trade-off), a stated, reasoned drift from the prior 5:3 ratio toward more trade-off
  variety now that a 5th slot exists. `useTool`'s wear formula was refactored from a flat either/or value
  to a multiplicative chain so Iron Discipline can genuinely stack against the existing Steady Hands
  perk (verified the refactor reproduces Steady Hands' old exact `1.4` value: `2 × 0.7`).
- [COMPLETE] ✅ **D3 · a 4th "mastery" talent tier**, one per skill (7 new nodes), gated at skill level
  11 — continuing the existing 2/5/8 sequence's own flat +3 spacing exactly. Every mastery node is a
  single-constant sharpening of that same skill's own existing tier-3 hook (never a new hook point):
  guaranteed flower/bonus-stone yield (was a chance), doubled fish double-catch odds, +1 more melee
  damage, +2 wheat instead of +1 (fixed at both real call sites, matching Wave-9's own "keep the
  duplicate in sync" precedent), another +20% construction swing, and Master Forge's repair-cost cut.
- [COMPLETE] ✅ **D4 · one `minRank: 3` vendor item per guild** (a themed weapon/armor/potion per guild's
  own real identity, all confirmed-existing items with real recipes, no cross- or within-guild id
  collisions). **A real, load-bearing correction to this session's own earlier grounding, not just the
  plan's text**: an earlier finding this session made — that guild passives are "confirmed FLAT, no
  rank-scaling mechanism exists" — was re-verified live during Research and found WRONG. All 5 guilds
  already have real, Wave-22-shipped `atGuildMaxRank()`-gated passive scaling (e.g. the Knights' own
  melee-damage bonus doubling from +1 to +2 at max rank), confirmed still working correctly and
  untouched by this wave. This narrowed D4's real remaining scope to vendor content only — the harder,
  more novel half of "max rank unlocks nothing new" turned out to already be shipped.
- [COMPLETE] ✅ **D5 · a real gold+XP reward at every challenge tier** (not just II/III — Research found
  and stated more precisely than the plan's own text that NO tier of ANY track paid out anything
  mechanical before this wave, confirmed via `checkChallenges()`'s own notify-and-sound-only body).
  Reward numbers are indexed by tier POSITION (I/II/III: 15g/40xp, 35g/80xp, 80g/160xp), not by each
  track's own raw threshold, since the 9 tracks sit on genuinely incomparable difficulty scales (400
  trees vs. 10,000 gold) — tier position is each track's own real, already-authored difficulty curve.
  `golden_fortune` (no natural skill to pay XP into) gets doubled flat gold instead (30/70/160).
  Confirmed live and reasoned explicitly that rewarding tier I too (previously payout-free for the 4
  non-guild-linked tracks) cannot double-purpose or interfere with the separate guild-eligibility gate
  in any way — `guildEligible()` reads live off `stats` directly, completely independent of
  `checkChallenges()`'s own "already notified" bookkeeping.
- **A real bug found by Verify and fixed, closing a genuine content-balance gap in D3's own Master
  Forge node**: the first cut's `repairTool` cost math floored EACH ingredient individually
  (`Math.max(1, Math.round(cost*frac))`), and since every recipe in the game has a per-ingredient
  quantity topping out at 9, a twentieth of that (Master Forge, frac 0.05) rounds to 0 and gets floored
  back up to 1 — identical to Guild Rates' own, much larger 0.15 fraction, for every real recipe in the
  game including the single largest one. A player who bought the harder, later mastery talent would
  never see it save more material than the easier tier-3 talent already did. Fixed by flooring only the
  OVERALL total (never per-ingredient): an ingredient that rounds to 0 is simply dropped, and only if
  EVERY ingredient rounds to 0 is exactly 1 unit of the single priciest ingredient charged instead —
  verified live that the flagged recipe (`halberd_rune`) now genuinely costs less at Master Forge (1
  total material) than at Guild Rates (3 total), while a repair can still never become entirely free.
  **A second, related bug found while fixing the first, not in the original report**: `Panels.tsx` and
  `StationMenuPanel.tsx` each carried their own duplicate repair-cost calculation, hardcoded to the base
  0.3 fraction and completely blind to the Guild Rates/Master Forge talents — meaning the displayed
  preview and the Repair button's affordability gate could both show/require a cost HIGHER than what
  `repairTool` would actually charge, capable of leaving Repair wrongly disabled for a player who had
  earned either talent. Fixed by extracting the shared logic into one new `repairCostFor()` helper
  (`data/recipes.ts`) and pointing the store action and both UI files at it, so preview/afford-gate/
  actual-charge can never drift apart again.
- **Verified live end-to-end for all 5 items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing gitignored `node_modules`/`public/assets`/
  `public/help`), fixed locally via directory junctions to the main checkout's real copies, removed
  afterward with the main checkout confirmed untouched. Real evidence per item: the full rank ladder
  crossed live via real `addXp` calls (Knight/Paladin ceremonies firing correctly with proper quest-flag/
  level ordering); reaching total level 45 with zero Cedric captures correctly stayed at Paladin,
  proving the real dual gate; calling `markCedricDefeated` directly (not `addXp`) with a 0→1 capture
  crossing correctly triggered the Marshal ceremony end to end (HUD name, notify text, perk nudge) — the
  exact gap the design's own fix targeted. Exactly 4 perk slots available at Paladin, exactly 5 at
  Marshal, confirmed via both direct store calls and a real DOM click; all 4 new perks measured with
  real percentage-exact effects (Honest Weight ±8% on real sell/buy prices, Forager's Fortune ~12% extra
  yield across 500 trials against a 0% baseline, Iron Discipline/Quick Draw's exact stamina and
  multiplicative-wear numbers). All 7 mastery talents gated correctly on both level-11 AND the tier-3
  prerequisite, with 6 of 7 measured via real percentage/yield sampling (woodcutting 200/200 guaranteed
  vs. tier-3's ~40%, mining 200/200 vs. ~60%, fishing ~31% vs. ~13%, farming's floor exactly 4 vs. 3,
  building's swing exactly 0.15 vs. 0.13) and the 7th (combat's flat +1) confirmed by direct source
  inspection rather than a live damage measurement, stated honestly as a real, deliberate testing
  limitation rather than glossed over. All 5 guild max-rank items confirmed refused at rank 2 and
  granted at rank 3 with real inventory/gold deltas, with the pre-existing Wave-22 passive scaling
  independently re-measured (~29% against a documented 30%) to confirm it's untouched. Challenge
  rewards confirmed exact for both a guild-linked track (woodcutter, all 3 tiers) and the non-guild
  `golden_fortune` track, including confirming a skipped tier still pays out correctly and a repeat
  check never double-pays. `npx tsc --noEmit` / `npm run build`: both clean, verified independently
  (both by the workflow's own Fix+Reverify pass and, separately, by direct review of the complete
  15-file merged diff against the live worktree afterward, including independently re-deriving the
  Marshal level-curve arithmetic, every D3 percentage change, and the `repairCostFor` floor-fix math by
  hand for both the flagged large recipe and a small 3-ingredient recipe that legitimately still ties
  between the two talents as an unavoidable integer-floor consequence, not a remaining defect).

## Wave 53: a wildlife ambient spawner (E1) + a real traveling-merchant route (E4) + NPC daily schedules (E5) — SHIPPED 2026-09-10

Twentieth wave of the new 27-wave plan, and the deepest research pass of this whole segment (over 20
files read in full, including an exhaustive full-text scan of the entire 264-entry asset-capabilities
catalog). Found a genuinely load-bearing gap the plan's own text didn't anticipate for E1, a real
architecture fork for E4 resolved against this project's own standing caution, and two real,
independently-verified implementation-time corrections when live facts contradicted the closed design.

- [COMPLETE] ✅ **E1 · a real, Agent-driven wildlife population** — a new `roam` Action (`actions/`
  `roam.ts`), a new small spawner module (`wildlifeSync.ts`, matching `rosterSync.ts`/`courtAmbientSync`
  `.ts`'s established shape), and a new Companion.tsx-style renderer (`AmbientWildlife.tsx`) — the first
  non-humanoid entity in this codebase ever driven by a genuine `agentManager`-spawned Agent. **The real,
  load-bearing finding that reshaped this item entirely**: the plan's own claim that `ambient`'s intrinsic
  `wander` action already "has real action consumers" is true only in the sense that `wander.ts` exists —
  it structurally can NEVER win for a visible, non-roster wildlife agent. Its own `no_renderer` gate
  requires LOD tier D (off-region — never true for a meadow creature the player is meant to see), and its
  `roster_villager` gate reads `bb.job`, which is only ever set from a live roster lookup no wildlife id
  can ever match — confirmed by reading every gate directly, not inferred from the archetype's name. So
  spawning under `ambient` unmodified would have produced a permanently stationary agent; "wire the
  ambient archetype" could not be satisfied by a spawner alone. Rather than widen `wander.ts`'s own tuned,
  load-bearing gates (which would risk starving Villagers.tsx's four shipped cascade branches for a
  population that doesn't need those restrictions in the first place), a genuinely new, narrowly-scoped
  Action was built instead — the same shape of fix Wave 11 made for `villager` itself, applied here to a
  different archetype. `ambient`'s own intrinsic list changes from `["wander","idle"]` to `["roam","idle"]`
  — `idle` stays deliberately unregistered (confirmed still zero implementation anywhere), since the
  quadruped/bird renderer's own manual hop/bob animation already supplies a convincing "alive, not frozen"
  read between roams without needing a `PLAY_ANIM` intent at all. **A second real finding, from an
  exhaustive asset audit, not a guess**: a full-text scan of all 264 entries in this project's real asset-
  capabilities catalog confirms zero deer, rabbit, or any second ground-creature mesh exists anywhere in
  the extraction — every animal-tagged entry is 6 horses, 2 dragons, 2 bats, and exactly one bird (the
  wild falcon's own donor, "Parrot," `l254600`). Honest scope-down, stated plainly rather than guessed
  around: ships exactly one new species, a small ground-hopping songbird flock (4 birds, home-meadow only)
  reusing that same real donor mesh a second time at a different scale and role — explicitly not a
  procedural/placeholder deer or rabbit, which would have read as a visible downgrade next to this
  project's real-extracted-mesh standard.
- [COMPLETE] ✅ **E4 · a real multi-stop merchant route**, resolved against a genuine, explicitly-weighed
  architecture fork rather than defaulting to whichever was easier: this project's own prior planning
  ("Wave 19 onward" plan's "Explicitly Deferred" section) already reasoned through and declined a
  wholesale migration of legacy per-frame cascades onto the Agent/Reasoner system as "a long-game rewrite,
  not a next step" — but that caution is about a whole-roster rewrite, not one bounded NPC, and the
  merchant's own job (an authored, fixed daily schedule with no competing needs to weigh) is exactly the
  case the Reasoner/utility-AI system was built to replace, not extend. Chose to extend the existing
  `navSteer`-driven cascade instead of a full Agent migration, reasoning explicitly that a real Agent would
  buy nothing behaviorally for a scripted sequence `navSteer` already expresses cheaply, while putting the
  merchant's own carefully-guarded external contract (`MERCHANT_SPOT`/`merchantPresent`, read live by
  `PlayerController`/`Minimap`/`Defenders.tsx`'s guard post) at real risk for no gain. **The real content
  addition, grounded entirely in already-placed geometry, not invented coordinates**: the merchant's
  existing road route was found to already run 0.4m past Alric's own real homestead spot (and ~4m past
  Beda's) on both legs, breezed through at full walk speed with zero acknowledgment — his day route now
  genuinely stops there (a real "passing through the village" beat) on the way in and out, splitting the
  single old walk into a real 8-stage cycle with two live-measured, level-appropriate dwells. Trade/pricing
  (Wave 49's dynamic market) is explicitly untouched — a pure movement/presence change layered on top.
- [COMPLETE] ✅ **E5 · a shared schedule primitive + a real new court-hours schedule** — a full audit of
  every "is this NPC/feature active right now" check in the codebase found not one existing binary day/
  night flip (the plan's own framing) but **three** independent, hand-rolled time-window literals sharing
  no code (`isWorkingHours`/`isWatchHours` in `villagers.ts`, `merchantPresent` in `trade.ts`) — plus a
  **fourth, already-dead** schedule concept (`Npc.tsx`'s `CourtNpc.schedule` day/night lerp, confirmed via
  its own gate logic to structurally return zero real NPCs under every currently-shipped court character).
  Built one new shared `activeWindow(time, start, end, inclusive)` primitive (`data/schedule.ts`),
  preserving each of the three existing checks' own exact inclusive/exclusive boundary convention
  byte-for-byte rather than picking one style and calling the others close enough, and used it to add the
  first genuinely new schedule: King Leo and Queen Leonora now hold court by day only, hidden from the
  world (and the minimap) at night — the cleanest, most-grounded choice available, since the dead
  `CourtNpc.schedule` mechanism can't be reused for them (both live at a real destination, not the
  homestead its own night-gather-spot geometry assumes). Confirmed live that reading the day/night state
  correctly required gating inside the NPC's own always-running per-frame loop rather than a render-time
  reveal list, since the game clock is a plain mutable value with no store subscription to re-trigger a
  React re-render off of — a render-time filter would have looked correct in code but only actually
  updated on an unrelated later event.
- **Two real implementation-time deviations from the closed research design, both independently verified
  correct rather than taken on faith**: (1) the research's own file plan called for rendering the songbird
  through `RiggedProp` (reusing its automatic graze-sway animation "for free") — Implement found live that
  `RiggedProp`'s rig loader requires a matching OBJ+MTL export this donor mesh does not have, which would
  have silently rendered an invisible bird rather than an animated one; fixed by rendering through the
  same plain GLB path the existing wild falcon already proves works for this exact mesh, with a small
  hand-authored hop/bob animation in place of the rig-driven sway. (2) the research's own file list
  included `courtAmbientSync.ts` for the court-hours gate; Implement found this Agent-lifecycle module has
  no player-visible render output of its own (`Npc.tsx` owns the actual on-screen toggle) and carries the
  same clock-reactivity problem the `Npc.tsx` fix above already solves correctly — gating it too would have
  been a no-op dressed up as a fix, so it was deliberately left untouched, stated plainly rather than
  silently included to match the original file count.
- **Verified live end-to-end for all 3 items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing gitignored `public/help`; `node_modules`/`public/`
  `assets` junctions already existed), fixed locally via directory junctions to the main checkout's real
  copies, removed afterward with the main checkout confirmed untouched. Real evidence per item: all 4
  songbird Agents confirmed alive via `agentManager.agents` with genuinely cycling `MOVE_TO` intents and
  measured real position drift across 16s of elapsed frames, and confirmed correctly tiered from C to D
  the instant the player travels away (home-only, as designed); the merchant's full 8-stage day cycle
  forced end-to-end via a new debug handle, every walking leg converging to within ~0.5m of its real target
  inside its tuned time buffer with zero teleport-pop, and a screenshot at the new village stop showing the
  cart standing directly beside a real, named, already-placed NPC; King/Queen's presence proven via three
  independent live signals (minimap dot count, the real "Talk to..." interact prompt, and a direct
  Three.js scene-graph visibility read) all correctly flipping across a forced day/night cycle. One test-
  methodology artifact caught and correctly self-diagnosed during Implement's own verification (a
  compressed day-length test produced an apparent large teleport-pop that vanished once retested at the
  real tuned day length — a test-setup mismatch, not a design bug). Zero console/page errors throughout.
  `npx tsc --noEmit` / `npm run build`: both clean, verified independently (both by the workflow's own
  Verify pass — 0 findings, no fix pass needed — and, separately, by direct review of the complete 19-file
  merged diff against the live worktree afterward, including independently re-deriving every one of
  `wander.ts`'s own cited gate values by direct read to confirm the "wander cannot drive this" finding,
  confirming the songbird's exact asset path is byte-identical to the wild falcon's own proven GLB
  reference, hand-verifying `activeWindow`'s boundary math against all three pre-existing checks it
  replaced, and hand-checking the merchant's new 8-window `stageFor()` arithmetic for internal consistency
  and symmetry between the morning and evening legs).

## Wave 54: a full companion system beyond Tam (E2) — SHIPPED 2026-09-10

Twenty-first wave of the new 27-wave plan. A single item this time, but one carrying a real,
consequential architecture fork this session flagged explicitly before Research ever started: does "a
proper roster entry" mean literally pushing Tam into `st.villagers`, or something else? Research
resolved it with an exhaustive live audit, not a guess, and Verify caught a genuinely subtle balance
bug in the resulting HP formula that Fix correctly diagnosed and repaired.

- [COMPLETE] ✅ **The roster-membership question, settled by an exhaustive live audit, not assumed**:
  a full grep-and-inspect of every real `st.villagers` consumer in the codebase (~45+ call sites across
  `gameStore.ts` alone, plus 7 AI actions, `rosterSync.ts`, and 8+ UI files) found the literal-roster
  option was not just riskier but outright unsafe: `assignJob`/`tickVillagers` both index `JOB_BY_ID`
  `[v.job]`, which would **crash** for a job value with no matching `JobDef`; `rosterSync.ts` would
  spawn a **second, colliding Agent** for Tam under the `'villager'` archetype, fighting the one
  `companionSync.ts` already spawns; `Villagers.tsx`'s own render filter would draw him as an ordinary
  villager figure using roster-derived looks, not his real bespoke rig; and `MAX_VILLAGERS`/tax-scaling/
  save-slot "kin" counts would all silently absorb him. Separately confirmed the one advertised benefit
  of literal membership — reusing `tradeLevelOf`'s existing formula "for free" — doesn't even apply:
  Tam's real XP source is combat kills, and this codebase's own existing combat-leveling shape
  (`levelFromXp`, the same curve `gainDefenderXp` already uses) was always the correct precedent to
  mirror, not the trade-mastery formula. Built instead: a new, separate, save-persisted `CompanionState`
  (`SaveGame.companion`) living entirely outside `st.villagers` — zero changes needed anywhere in the
  ~45+ file consumer list, confirmed safe by construction rather than by hope.
- [COMPLETE] ✅ **Independent XP and leveling**, off a real, already-live per-kill signal:
  `assistLeader.ts`'s own `strike()` (Wave 25) already called `recordKill`/`addItems`/`notify` on every
  raider Tam finishes, with its own header explicitly noting it skipped `gainDefenderXp()` "for the
  exact reason... there is no leveling record on this entity to grant XP into" — a hook already
  reserved and waiting. One new line closes it (`gs.gainCompanionXp(15)`, the same 15/kill
  `gainDefenderXp` already uses, no new tuning invented), feeding the same `levelFromXp` curve every
  other leveled entity in this game uses.
- [COMPLETE] ✅ **A real gear-slot system**, reusing this codebase's exact existing vocabulary rather
  than inventing a parallel one: helmet/chestplate (tiered, Armory-backed, near-verbatim copies of the
  existing villager equip actions) plus a melee weapon loadout (`DEFENDER_LOADOUTS`, the same
  Armory spend/refund logic `setDefenderLoadout` already uses). `Companion.tsx`'s previously-hardcoded
  sword+shield look now renders whatever is actually equipped, mirroring `Defenders.tsx`'s own
  loadout-driven portal block exactly. A real, explicit, disclosed scope-down: bow is excluded from
  Tam's loadout entirely — live-checked that even for a real defender, sword_shield vs. halberd is
  already purely cosmetic (identical damage formula), and bow is the one mechanically distinct,
  LOS-gated ranged option; `assistLeader.ts` has no LOS check or ranged branch of any kind today, so
  giving Tam a working bow would be a real new combat feature, not a reuse — named explicitly as a
  future wave's work rather than silently under-built. The full rotating-paperdoll/drag-and-drop/dye
  equip UI (`NpcEquipPanel.tsx`) was also deliberately not forked for this — its real value-add
  (appearance editing) doesn't apply to a fixed-identity named character — in favor of a simpler button
  card reusing `VillagersPanel.tsx`'s own existing Loadout/Carrier row idiom.
- **A real, subtle balance bug found live by Verify and correctly fixed**: the first cut's HP formula
  summed an independently-capped level term (+5 max) and an independently-capped gear term (+9 max,
  reusing Wave 51's own `villagerGearHpBonus`) and clamped only the *combined total* at a shared
  ceiling — since either term alone already exceeded that ceiling, a companion who had leveled up even
  modestly (level 4+, ~54 kills) got precisely zero additional benefit from gearing up, and vice versa,
  live-confirmed by stripping all gear from a level-5 Tam and finding his max HP unchanged. This
  directly undercut the wave's own "gear-slot system" half of its stated deliverable for most of a real
  playthrough, even though the one externally-required invariant (Tam staying under a real defender's
  own HP floor) still happened to hold by coincidence. Fixed by splitting the small headroom between
  Tam's base HP and his real ceiling into two independent, smaller, genuinely-additive shares — one
  earned by leveling alone, one by gearing alone — so the ceiling is now only reachable by maxing both
  at once, with the gear share computed as a live fraction of Wave 51's own real ceiling constant
  (newly exported as `VILLAGER_GEAR_HP_MAX`) rather than a second hand-copied number that could drift
  from it silently.
- **The load-bearing invariant this whole item was designed around, stated and preserved explicitly**:
  a fully-leveled, fully-geared Tam caps at 20 HP — a full 4 points (17%) under an unarmored level-1
  defender's own measured 24 HP floor, and that gap only widens over a real playthrough since a real
  defender's own floor keeps climbing uncapped. Damage was deliberately left completely flat
  (unchanged by either level or gear), extending Wave 51's own "armor is a toughness stat, never a
  damage input" reasoning even more forcefully here — an ordinary villager needed a full 100% bump to
  tie the bare-defender damage floor; Tam's own flat 1.5 needs only a 33% bump to tie it, so there was
  even less real headroom available than the case Wave 51 already rejected.
- **Verified live end-to-end, real headless Chrome against a real running dev server** (this repo's
  own `CLAUDE.md` conventions followed throughout — `--headless=new --use-angle=d3d11 --mute-audio`,
  zero mouse/audio disruption). Same recurring environment-only gap as every prior wave's worktree
  verification (missing `public/help`; other junctions already existed), fixed locally via directory
  junctions to the main checkout's real copies, removed afterward with the main checkout confirmed
  untouched. Real evidence: driving the actual `gainCompanionXp` action through 88 real XP grants
  correctly leveled Tam from 0 to Lv 5 exactly matching `floor(sqrt(xp/50))` at every step, with real
  level-up toasts; the real Roster-panel UI correctly shows Tam's own standalone card while
  `st.villagers.length` stays 0 throughout, confirming he never enters the roster; real Armory-stock
  spend/refund confirmed for helmet, Castle-Crested Plate, and halberd, with a screenshot showing his
  3D rig visibly wearing the new gear in place of the old hardcoded sword+shield; `window.__kkai`
  confirmed exactly one Agent for `companion_tam` under the `'companion'` archetype, proving no
  double-spawn against `rosterSync.ts`; a live-injected real defender independently measured at 24 HP
  confirmed the ceiling invariant against real data, not just the constant's own stated value. After
  the fix: a direct-state sweep across level 0/3/5 crossed with no-gear/iron/full-gear confirmed the
  formula's every intermediate value by hand (16/17/18 across levels with no gear; 17/18 across iron
  vs. full gear at level 0; 20 reached only at level 5 AND full gear together), and a full UI-driven
  re-run of the exact originally-reported scenario confirmed stripping all gear from a level-5 Tam now
  correctly drops him from 20 to 18, distinct from fully-geared — the precise regression the fix
  targeted. Zero console/page errors throughout. `npx tsc --noEmit` / `npm run build`: both clean,
  verified independently (both by the workflow's own Fix+Reverify pass and, separately, by direct
  review of the complete 7-file merged diff against the live worktree afterward, including
  independently re-deriving the entire HP-formula fix by hand — the level-share interpolation, the
  gear-share rescaling against `VILLAGER_GEAR_HP_MAX`, and the ceiling-only-reached-by-both-axes
  property — across every value the workflow itself reported, all matching exactly).

## Wave 55: multi-quest choice menus (F1) + guild narrative arcs (F2) — SHIPPED 2026-09-11

Twenty-second wave of the new 27-wave plan. Research re-verified both items live against the real
codebase rather than trusting the plan's own wording, and found the real shape of each item was bigger
(F1) or differently-gated (F2) than the plan's phrasing implied.

- [COMPLETE] ✅ **F1 — real multi-quest choice menus, single active slot unchanged**: `st.sideQuest`
  (`gameStore.ts`) is confirmed a genuine game-wide single slot, not a per-NPC throttle —
  `acceptSideQuest` refuses outright with `if (!def || st.sideQuest) return;`. Investigated live
  whether that slot needed widening into a real collection (the plan's wording could be read either
  way) and found no real need anywhere in the quest system for concurrently-tracked quests, against a
  real, live-confirmed gap the other reading actually closes: King, Queen, Richard, Cedric's war
  council, and the Wyeth/John/Alric/Beda pools all already contain multiple simultaneously-unblocked
  quests (up to 5 for Richard) that the old single-slot rotating `offer` could never show together.
  Chose the smaller reading — surface the full "choose one of these" set, still accept only one at a
  time — reusing the existing `SideQuestDef`/`sideQuestBlocker` shapes exactly. New shared helper
  `sideQuestOffers` (`data/npcs.ts`, next to `sideQuestBlocker`) filters a pool down to "neither done nor
  blocked" in one place; `DialoguePanel.tsx`, `Panels.tsx`'s `ParleyPanel` (Cedric's war council) and
  `GuildErrands` (all 5 guild boards) each swap their old single-`offer` rotation for one `.map()` over
  `sideQuestOffers(...)`, with a small "N errands available — choose one" line appearing only when there
  are 2+.
- **A real, previously-unfixed bug found and fixed for free by this refactor**: `DialoguePanel`'s
  rotation got a "skip anything in `completedSideQuests`" fix back in Wave 26, but `ParleyPanel` and
  `GuildErrands` never got the same fix — both only ever checked `sideQuestBlocker` (which never checks
  "is this quest itself already done," only its prerequisites), so their rotation index
  (`completedQuests.length`, a **main**-quest count unrelated to guild/rebellion quest turn-ins) could
  land back on an already-finished errand. Clicking Accept on it then silently no-op'd against
  `acceptSideQuest`'s own `completedSideQuests` guard — affecting all 5 guild boards and Cedric's war
  council intermittently, tied to unrelated main-quest progress. `sideQuestOffers` filters on
  `completed` directly for all three call sites, closing this by construction.
- [COMPLETE] ✅ **F2 — a 5-quest narrative arc per guild, distinct per guild's own established theme,
  chained off each guild's existing quest 3**: read all 5 guilds' `blurb`/`passiveLabel`/`passiveDesc`
  and all 15 existing guild quests before writing anything — found the plan's own "identical
  gather→gather/craft→kill shape" claim was imprecise (miners and anglers have no kill step at all,
  builders has no craft/kill, knights is kill-only), so each new arc was grounded in that guild's real
  verb mix and voice rather than a template with nouns swapped: Woodsmen's *The Long Cut* (a forest
  blight), Miners' *Down the Old Shaft* (an old sealed dig), Anglers' *The Long Wait* (a river legend),
  Builders' *Raise the Works* (a second siege tower), Knights' *The Muster* (a real muster ending in a
  Storm ring duel). `kn_drill`/`kn_champion` reuse the existing `joust`/`duel` kinds — confirmed live via
  `joustRichard()`/`resolveDuel()` that both already bump whatever errand is active regardless of its
  giver, the same decoupling `r_lists`/`s_firstblood` already rely on, so this is proven reuse, not a new
  mechanic.
- **The real reason this needed to be an arc, not a capstone — a genuinely dead piece of shipped
  content, found by tracing every rep-granting call site**: `turnInSideQuest`'s hardcoded
  `st.addGuildRep(sq.npcId, 15)` is the *only* place guild rep is ever granted in the whole codebase, and
  each of the 15 existing guild quests can only ever turn in once — so 45 was the hard ceiling on
  achievable guild rep, forever landing at rank index 1 (min 30) and never reaching rank 2 (min 80) or
  rank 3 (min 160). That means Wave 52/D4's real, shipped max-rank-only vendor rows
  (`spear`/`chestplate_forged`/`potion_stamina`/`halberd_forged`/`sword_crested`) were mathematically
  unreachable by any player. Sized each arc (20+24+26+32+38 = 140 new rep per guild) specifically to
  close that gap with real margin (45 + 140 = 185, clearing 160) rather than ship a cosmetic-only
  capstone that left D4's rewards permanently dead — new table `GUILD_ARC_REP` (`data/npcs.ts`, same
  hand-named-lookup precedent as the existing `SETTLEMENT_GROWTH_QUEST_DEST`) overrides the flat `?? 15`
  only for the 25 new arc quest ids, leaving every one of the 15 original quests' rep grant byte-
  identical. Each arc's capstone also hands the player one unit of that guild's own D4 max-rank vendor
  item, a deliberate "here's a taste of what your own hall now sells you" echo.
  Gating question answered explicitly: chained sequentially off each guild's existing quest 3
  (`requires`), not rank-gated — rank-gating would have been circular, since nothing could reach rank
  2/3 without this content and the content can't require the rank it exists to unlock.
- **Verified live end-to-end, real headless Chrome against a real running dev server** (this repo's own
  `CLAUDE.md` conventions followed throughout — `--headless=new --use-angle=d3d11 --mute-audio`, zero
  mouse/audio disruption). Same recurring environment-only gap as every prior wave's worktree
  verification (missing `public/assets`), fixed locally via a directory junction to the main checkout's
  real copy, removed afterward with the main checkout confirmed untouched. Real evidence, driven through
  `window.__kk` (the project's own live store handle) rather than assumed from reading code: King's
  dialogue panel showed exactly the 3 live-predicted simultaneous offers (`k_iron_levy`/`k_feast`/
  `k_muster`) with the "3 errands available" line, accepting one correctly collapsed the offer list to
  zero while leaving the main-quest card and the newly-active errand's own progress card in place;
  Cedric's war council (`ParleyPanel`) showed all 3 of its own independent quests at once; a simulated
  Knights' Order member sitting at 122 guild rep with the original 3 plus the new arc's first 4 quests
  completed saw exactly one offer (`kn_champion`, chain-gated as designed) and, on turn-in, guild rep
  moved from 122 to exactly 160 (a real +38, not the flat +15) with a `sword_crested` landing in
  inventory. Zero console/page errors and zero failed asset requests across the entire run. `npx tsc
  --noEmit` / `npm run build`: both clean, verified independently (both by the workflow's own Verify
  pass and, separately, by direct review of the complete 5-file merged diff against the live worktree
  afterward, including independently re-deriving the `GUILD_ARC_REP` arc-total arithmetic by hand —
  20+24+26+32+38=140, plus the pre-existing 45, totals 185, clearing rank 3's 160 threshold).

**Files changed**: `src/game/data/npcs.ts` (F1: new `sideQuestOffers` helper; F2: 25 new quest defs — 5
per guild — appended to `GUILD_QUESTS`, plus the new exported `GUILD_ARC_REP` table); `src/game/store/
gameStore.ts` (F2: `turnInSideQuest`'s guild-rep grant reads `GUILD_ARC_REP[def.id] ?? 15` instead of a
flat `15`, one import added); `src/components/hud/DialoguePanel.tsx` (F1: rotating `offer` → `.map()`'d
`offers`); `src/components/hud/Panels.tsx` (F1: same change in `ParleyPanel` and `GuildErrands`, plus the
incidental completed-quest bugfix in both).

## Wave 56: Storm's arc + duel bridge staging (F3) + the Leo→Cedric turncoat direction (F4) — SHIPPED 2026-09-11

Twenty-third wave of the new 27-wave plan. Research resolved a real, apparent contradiction for F4 (the
plan's own framing and a prior wave's own code comment both turned out accurate once the exact interact
branch was traced), and found the F3 assets are less finished and less "just needs wiring" than either
the plan or this session's own pre-workflow grounding assumed.

- [COMPLETE] ✅ **F3 · Storm's Battle Dome becomes a real staged bridge duel** — the two rig-verified
  set pieces (`oc6095b5`, the duel bridge; `oc6095b4`, the dual honor stand) are placed for the first
  time ever, as fixed-world dressing inside `BattleDome.tsx` (the same non-Buildable `PropModel`
  pattern `CedricCamp.tsx`/`MerchantCamp.tsx` already use), with Storm relocated onto the bridge's far
  end so the challenger now visibly crosses it to reach her. **A real, load-bearing correction to both
  the plan's own framing and this session's own pre-workflow grounding**: these two assets were assumed
  to be "currently pure undifferentiated decoration" needing only function added (the shape Arc G's
  prior turret/tower waves found) — Research found instead that neither is wired into ANY game-code
  consumer at all (zero hits across `buildables.ts`/`labCapabilities.ts`), and their own rig status is
  `"todo"` with no `part_roles.json` entry, meaning the animated-flag rendering their own capability
  data (`hasFlags`/`hasShields`/`hasHalberds`) implies is not safely buildable today — rendered as a
  static `PropModel` instead, an explicit, reasoned scope-down rather than guessing a part-role map by
  hand (exactly the kind of guessing this project's own rig lab exists to eliminate). Also found and
  fixed two placement bugs during Implement's own live verification, neither caught by static reading:
  the bridge's real unrotated bounding box is WIDER in X than deep in Z (opposite of what the initial
  design assumed from its own "long axis along Z" framing), corrected via a live `THREE.Box3` measurement
  of the mounted instance; and Storm's own new facing yaw was independently cross-checked against two
  separate authoritative sources already in the codebase (a `PlayerController.tsx` comment and `Npc.tsx`'s
  own facing formula) rather than assumed, confirming the original yaw should stay unchanged. Two new
  duel `SideQuestDef`s (`s_ringveteran`, `s_stormsrival`) gate on Storm's own existing `repTitles` tiers
  via a new `needsRep` field — closing a real, confirmed gap where her 4-tier reputation ladder was
  tracked but purely cosmetic, unconsumed by anything in the game before this wave. Her top tier
  ("Storm's Equal") deliberately gets no third quest, an honest stopping point rather than a forced
  capstone. Cedric's own camp deliberately does NOT get a physical duel bridge — a real, reasoned
  scope-down: the polished tournament-set aesthetic of these two pieces (arched motifs, flags, shields)
  actively fights his camp's own established rustic/makeshift art direction — with "and Cedric's own
  duels" from the plan's text treated as satisfied by F4 instead, which is exactly where his own duel
  content gets real, new depth this same wave.
- [COMPLETE] ✅ **F4 · the missing Leo→Cedric turncoat direction, built as a real mirror of the existing
  Cedric→Leo defection** — traced the exact interact/panel branch precisely (`PlayerController.tsx`'s
  single `challenge_cedric` target, `Panels.tsx`'s `ParleyPanel`) and confirmed both the plan's own claim
  and a prior wave's own code comment describing this as deliberately out of scope were accurate: a
  Leo-sworn player approaching Cedric's camp got an instant duel with zero parley UI ever shown, while an
  unsworn player already got a full peaceful choice panel (pledge or fight, a real coexisting choice).
  **A second, additional blocker found live, not just a UI gap**: even if a Leo-sworn player were shown
  that existing panel, its "Clasp arms with Cedric" button would have silently done nothing — the
  underlying `pledgeAlliance` action refuses outright for anyone who already has a non-null alliance.
  Built a new, dedicated `betrayLeo()` action mirroring `betrayCedric()`'s own real, already-shipped
  shape (a permanent one-way `betrayedLeo` flag guarding `pledgeAlliance('leo')` forever after, the same
  anti-ping-pong protection `betrayedCedric` already gives the other direction) but deliberately
  diverging from it in one stated way: unlike `betrayCedric` (which returns the player to neutral, a
  separate later step to properly pledge Leo), `betrayLeo` completes the join to Cedric in one step,
  matching the exact one-click "Clasp arms with Cedric" commitment the unsworn branch's own button
  already uses. Reputation fallout (−30 Richard/Queen, vs. the unsworn pledge's own −20) and a real
  `shiftAllegiance(-25, ...)` were sized as a deliberately larger, more dramatic consequence than a first
  neutral pledge, reusing `shiftAllegiance`'s own precedent rather than inventing a new penalty axis. The
  existing "Challenge Him to Battle" duel option was kept available alongside the new parley for a
  Leo-sworn player, not replaced by it, mirroring the unsworn branch's own established "the fight is one
  of the parley's choices, not the only outcome" precedent exactly. The stale `betrayCedric` doc comment
  that used to describe this exact gap as "left out of scope" was corrected in the same diff, so it no
  longer misrepresents the codebase once this wave lands.
- **A real, subtle bug found by Verify and correctly fixed**: the new `betrayLeo()`'s own active-side-
  quest revalidation (a deliberate improvement over a simple fixed-npcId check, since Leo's own ordinary
  errands have nothing to do with the alliance pledge itself) called the shared `sideQuestBlocker()`
  helper without the new (this same wave's own) trailing `rep` parameter, so it silently defaulted to 0
  regardless of the player's real standing — meaning ANY in-progress errand gated by the new `needsRep`
  field (Storm's own two new duels, the only content using it) was incorrectly treated as newly invalid
  and silently wiped from the player's single quest slot the instant they defected, even with more than
  enough real reputation to keep it. Live-reproduced (an active `s_ringveteran` at 2/4 progress with
  real reputation comfortably above its gate, wiped anyway) and fixed by passing the player's real
  per-NPC reputation through, matching the exact pattern `acceptSideQuest` already uses a few lines
  below. Re-verified both the positive case (a genuinely-still-valid errand now survives) and a negative
  control (an errand whose rep gate the player genuinely doesn't meet still correctly clears).
- **Verified live end-to-end for both items, real headless Chrome against a real running dev
  server** (this repo's own `CLAUDE.md` conventions followed throughout — `--headless=new
  --use-angle=d3d11 --mute-audio`, zero mouse/audio disruption). Same recurring environment-only gap as
  every prior wave's worktree verification (missing `node_modules`; `public/assets`/`public/help` were
  already present as real copies in this particular worktree), fixed locally via a directory junction to
  the main checkout's real copy, removed afterward with the main checkout confirmed untouched. Real
  evidence per item: the duel bridge and dual stand confirmed rendering as real, distinctly-textured GPU
  geometry (blue flag poles, real block-tone variation) exactly at the Battle Dome's ring center; Storm's
  dialogue panel confirmed showing "Worthy Opponent"/real rep 15 with both `s_firstblood` and the newly
  unlocked `s_ringveteran` listed while `s_stormsrival` (needsRep 40) stayed correctly hidden; a full
  accept → 4 real duel wins (via the actual duel-resolution function a real win calls, not a mock) →
  rep crossing into the next tier with a real toast → turn-in cycle completed end to end with correct
  gold/XP. For F4: the unsworn parley panel confirmed pixel-for-pixel unchanged; a Leo-sworn player
  confirmed getting the new, distinct "Turn Your Coat" branch instead of an instant duel, with "Challenge
  Him to Battle" independently confirmed still spawning a real Cedric encounter; the real "Clasp arms
  with Cedric" click confirmed producing the exact designed state change (alliance flips, `betrayedLeo`
  sets, both reputations and allegiance move by the exact designed amounts); the new anti-ping-pong guard
  confirmed refusing `pledgeAlliance('leo')` permanently afterward; the original, untouched
  `betrayCedric()` mirror confirmed still working correctly and independently of the new flag. Zero
  console/page errors throughout. `npx tsc --noEmit` / `npm run build`: both clean, verified independently
  (both by the workflow's own Fix+Reverify pass and, separately, by direct review of the complete 8-file
  merged diff against the live worktree afterward, including independently re-deriving the corrected
  bridge/stand placement geometry by hand from each piece's own real bounding-box dimensions to confirm
  no overlap between the two new set pieces, and confirming `sideQuestBlocker`'s new trailing `rep`
  parameter is threaded correctly through every real call site touched by this wave).

## Wave 57: Dragonfire Siege follow-ups (F5) + defender formations & duel spectator (F6) — SHIPPED 2026-09-11

Twenty-fourth wave of the new 27-wave plan. Research re-verified every claim in the plan's own wording
live before designing anything and found real, load-bearing corrections on both items — including one
genuine, previously-unknown exploit the naive reading of F5's own "reuse the construction pipeline"
idea would have shipped, caught and closed before it ever reached a save file.

- [COMPLETE] ✅ **F5 · fire that spreads structure-to-structure, and a real ruin-and-rebuild path for a
  dragon-wrecked building.** Confirmed both dragon sieges (`DragonSiege.tsx`, `BlackDragonSiege.tsx`)
  were still fully identical single-target mechanisms — every breath tick hit exactly one random
  flammable building, with zero adjacency logic. Added a bounded chain reaction folded into the same
  tick (no new timer): each currently-burning building takes another hit and, while alive, rolls a
  chance to ignite one flammable neighbor within 8m, hard-capped at 3 simultaneous fires — enough for a
  densely-built base to visibly catch without a siege routinely razing the whole homestead, and an
  isolated flammable building with nothing nearby never spreads at all. **A real, previously-unknown
  fact found live**: this project has NO building-repair mechanism anywhere — `damageBuilding` has only
  ever deleted a building outright at 0 HP (half materials refunded), with nothing that could ever heal
  `buildingHp` back up. Rather than inventing a new "ruin" entity, this reuses the exact existing
  `PlacedBuilding.built` (0..1 construction-progress) mechanic already wired to a full render/interact/
  villager-auto-build pipeline — a dragon kill (`damageBuilding`'s new trailing `leaveRuin` flag, passed
  only by the two dragon sieges) now keeps the entry, resets `built:0`, marks a new `ruin` flag, and
  grants no refund; walking up and finishing it (free, matching how construction has always charged
  time/swings and never materials) clears the flag and restores the building. **A real, live exploit
  this reuse would otherwise have shipped, found and closed**: `constructBuilding`'s completion branch
  unconditionally grants `stats.buildingsPlaced++` (which feeds `difficulty.ts`'s own monotonic threat
  curve and the Architect title) and bumps "build N of X" quest counters on every completion — a naive
  `built:0` reset would have let a player farm both for free by having the dragon repeatedly torch and
  rebuild the same cheap hut. Fixed by gating that entire block on `!b.ruin`; a second, independent
  double-grant surface the initial design didn't name — the builder-villager auto-construct pass's own
  separate "Salvage Eye" completion check — was found and closed the same way during implementation.
  Also confirmed live that dragon fire can never hit a wall mid-damage-mold-swap (every wall mold costs
  pure stone, so `flammable()` is always false for the ladder that produces one), so a dragon-caused
  ruin's `type` is always the pristine, stable type — never an already-scarred wall mold — closing off
  what would otherwise have been a real edge case. Villagers finally react to a dragon siege at all:
  confirmed live that `flee_to_safety` (the only raid-reaction mechanism that exists) structurally could
  never fire during either dragon siege, since neither ever populates the enemy store its own gate reads
  — villagers stood in the open through an entire siege. Widened the gate to also read the dragon's own
  live hostile-state singletons, extracted into a new zero-dependency `game/dragonAir.ts` leaf module so
  the AI action graph doesn't need to import a render component to read them. Given this project's own
  ~15-clip animation ceiling (no dragon-specific fear pose exists), added one honest, achievable
  distinguishing touch on top of the shared flee behavior: a one-shot, per-siege flavor line naming a
  random villager. Court NPCs reacting to a siege was investigated and explicitly left out of scope
  (blocked by the `court` archetype's deliberately empty-by-design action list) rather than silently
  built or silently dropped.
- [COMPLETE] ✅ **F6 · defender formations that vary by loadout, and a duel spectator at Storm's own
  honor stand.** Confirmed `Defenders.tsx` still had zero mutual awareness between defenders — every
  unit steered straight at its target with no separation, so multiple defenders converging on one raider
  could visibly stack on the same point (a gap Wave 42's own local-avoidance work explicitly flagged and
  left for defenders specifically, since they run their own hand-rolled loop rather than the shared
  `navSteer` primitive). Added a small, local push-apart mirroring `Enemies.tsx`'s own existing
  pack-separation formula, with a loadout-varied radius — melee holds a tight shieldwall just past its
  own point-blank range, bow fans into a looser skirmish line — reached only once a defender is actually
  engaged, so it is combat-only by construction. Iterates the live defender roster passed down from the
  parent component (not the shared position-tracking table directly), avoiding a stale-ghost bug a
  reassigned-off-defender-duty villager would otherwise leave behind forever. **A real correction to the
  plan's own framing**: "courtiers who actually watch duels" assumed an existing named court NPC could
  simply be wired to react — checked every real court NPC's actual position against every real duel venue
  and found none is anywhere near one (Storm herself is the duelist at her own venue, not a spectator).
  Rather than relocating an established NPC and disrupting their own dialogue/quest content, or silently
  dropping the item, added one small, genuinely new, non-interactive figure at the honor stand prop Wave
  56 placed with nobody standing on it — no `NpcDef`, no dialogue, no quests, reusing an already-loaded
  generic look. It turns to face the player using this codebase's own established facing convention the
  instant a real Storm-duel encounter is live (confirmed the `'storm'` enemy kind is spawned from exactly
  one place in the whole codebase, so this can never mis-trigger), and holds a neutral bridge-facing pose
  otherwise. Cedric's-camp duels and relocating an actual named courtier (a real, stronger future version
  with an existing narrative hook) were both explicitly named as out of scope rather than silently
  under-delivered.
- **Verified live end-to-end for both items, real headless Chrome against a real running dev server**
  (`--headless=new --use-angle=d3d11 --mute-audio`, zero console/page errors across every run). Real
  evidence per item: fire spread proven with a controlled 4-building layout (buildings ~3m/~4m away
  progressively ignited over successive ticks with the designed spread notification, a building 600m
  away never moved at all across 14 ticks) with the 3-fire cap independently confirmed; ruin/rebuild
  proven both directions (a dragon-killed building survives with `built:0, ruin:true` and zero refund;
  rebuilding clears the flag and — the key anti-exploit check — leaves `stats.buildingsPlaced`/building
  XP completely unchanged, differentially confirmed against an ordinary fresh construction which DOES
  increment both normally); the villager flee fix proven both ways via a real before/after comparison
  (reverting just the one changed line left an agent idle through a forced siege trigger; restoring it
  flipped the same agent to `flee_to_safety` within 4 seconds). Defender separation proven by
  force-clustering 5 test defenders (3 melee, 2 bow) onto one point and watching them radiate out to a
  stable, non-overlapping formation (final spacing 3.0–8.7m, bow pairs settling near their own wider
  radius) while combat kills continued to resolve correctly throughout. The duel spectator proven via
  three same-camera screenshots (neutral pose facing the bridge; rotated to squarely face the player
  within ~1.5s of a real Storm encounter spawning; reverted to the identical neutral pose once the
  encounter cleared). `npx tsc --noEmit` / `npm run build`: both clean, verified independently (by the
  workflow's own Verify pass — clean, zero findings, no Fix pass needed — and, separately, by direct
  review of the complete 11-file diff against the live worktree afterward, including independently
  re-tracing the `constructBuilding`/builder-pass double-grant fix's exact variable-capture timing by
  hand, re-deriving the duel spectator's local-vs-world-space facing math to confirm the two branches are
  mathematically consistent, and confirming the `'storm'` enemy-kind check can only ever be triggered by
  the one real duel-spawn call site in the whole codebase).

**Files changed**: `src/game/dragonAir.ts` (new — `dragonAir`/`dragonAirBlack` extracted from
`DragonOmen.tsx` into a zero-dependency leaf module); `src/components/world/DragonOmen.tsx` (re-exports
from the new module); `src/components/world/DragonSiege.tsx` / `BlackDragonSiege.tsx` (bounded
fire-spread chain reaction, `leaveRuin:true` on every damage call, one-shot villager flavor line,
fixed 3-slot fire visual refs); `src/game/store/gameStore.ts` (`damageBuilding`'s new `leaveRuin`
branch; `constructBuilding`'s completion branch gated on `!b.ruin`; the builder auto-build pass's
"Salvage Eye" check gated on `!site.ruin`); `src/game/types.ts` (`PlacedBuilding.ruin?: boolean`);
`src/components/fps/PlayerController.tsx` (construct-interact label reads "Rebuild" vs "Build");
`src/ai/actions/flee.ts` (raid-active consideration also reads dragon hostile state);
`src/components/world/CedricSiege.tsx` / `Defenders.tsx` (import-path update to the new leaf module,
plus `Defenders.tsx`'s new loadout-scaled separation loop); `src/components/world/BattleDome.tsx` (new
`DuelSpectator` figure at the honor stand).

## Wave 58: siege-ladder-assault raid content (H4) — SHIPPED 2026-09-12

**H4 was flagged in the plan as needing its own dedicated design pass.** That pass ran this session: a
Plan-mode agent produced a full design, independently adversarially reviewed by 3 separate agents
(factual-accuracy / scope-honesty / architectural-risk lenses). All 3 confirmed the design's 18 numbered
factual claims true and endorsed its central call: **decline** the generic `(i,j,layer)` nav-grid
rewrite the plan's own H4 blurb described (`navgrid.ts`'s layer param is real but was never populated,
and confirmed still has zero real consumers anywhere in the codebase — Defenders/Enemies/Agent all reach
elevation through their own separate, already-shipped, non-nav-grid mechanisms), and instead **build** a
small, additive combat-content slice: a destroyable siege ladder a raider can climb to reach one specific
keep wall-walk. All 3 reviews also independently found the same class of concrete implementation gap in
the design's own architecture section, closed by a written addendum before implementation began.
`navgrid.ts`, `AgentManager.ts`, `Agent.ts`, `Reasoner.ts` and `Locomotion.ts` are all untouched, exactly
as scoped.

**What shipped**: `game/raiderLadder.ts` + `components/combat/RaiderLadder.tsx` — a new siege-ladder
object mirroring `raiderRam.ts`/`RaiderRam.tsx`'s own shape closely (plain module-level state, straight-
line trundle-in, real HP, melee/bolt-damageable, tips over and burns out when wrecked). Spawned
optionally alongside an ordinary dusk raid (bandit or, if crown-sworn, royal-knight), gated on the home
keep having at least one FINISHED wall-walk socket (`corner_turret`/`corner_block`/`wall_crenel`) to
plant against, at a difficulty-scaled chance (`0.25 + tier*0.07`, capped 0.6). A new `'climbing'`
`EnemyMob.state` (plus `climbT?`/`elevated?`/`postY?`/`ladderSocketId?` fields, `combat.ts`) lets up to 2
raiders at a time (`MAX_CLIMBERS`, staggered 0.6s apart) climb it in two visual stages — up the rungs,
then haul over the parapet — and fight, for the first time ever, a defender posted to that SAME
wall-walk: elevation was previously unconditional, permanent safety for a keep-stationed defender against
every raider (`Enemies.tsx`'s own ground `defTarget` loop explicitly skips every `elevated` defender,
confirmed still byte-for-byte unchanged) with zero exceptions. The matched defender is resolved fresh
every frame from the SAME `stationId === "keep:<socketId>"` derivation `Defenders.tsx` itself already
uses — never a blanket "any elevated defender," which could be a different, unreachable wall. An elevated
raider also fights the player directly if the player is genuinely up on the same wall-walk (height-gated,
not just horizontal distance).

**Two real, concrete bugs the addendum named and this implementation fixes, not just avoids**:
1. **The height-snap-back bug** (`Enemies.tsx`'s shared per-mob position tail): fixed with one ternary
   (`m.elevated ? (m.postY ?? 0) : (enemyAtHome ? homeGroundY(...) : destinationGroundY(...))`) so
   elevation persists once a climbing raider transitions into ordinary attack/chase combat, instead of
   snapping back to ground height the instant real fighting starts.
2. **Live-recompute, not "set once at climb completion."** A raider's own `elevated`/`postY` are
   rechecked every frame against the real, current keep (`keep.parts[socketId]` still present AND
   `built>=1` AND the part still carries a `walkway`), the same way `Defenders.tsx` already does for a
   real defender — so a wall knocked down by an UNRELATED siege hit (`damageKeepPart`, already a real,
   shipped way this can happen mid-raid) drops the raider standing on it too, not just a defender. The
   same check runs mid-climb (ladder or wall destroyed while still ascending) as the raider's own
   'climbing' state handler.

**A real, load-bearing gap found and fixed beyond the two documents' own explicit text**: the player's
ranged weapons (bow/crossbow) route through `hitTestCharacter`, which needs the target's real standing
height (`groundY`) to convert a world-space shot into the figure's own local hitbox frame — already
handled for a mounted raider's saddle offset (`MOUNT_SEAT_Y`), but hardcoded to ground level for every
other enemy. Without passing `e.mob.postY` through here too, every shot fired at an elevated raider would
test against a hitbox still sitting at ground level, 3.6-4.2m below where the model actually renders, and
would never connect — silently making the feature's own stated payoff ("fight a battlement-standing
defender, or the player") one-sided the moment the player tried to shoot back. Fixed with the same
one-line pattern the mounted-raider precedent already established. `HealthBillboard.tsx`'s own health-bar
lift got the identical fix (it has no pre-existing "elevated" precedent to match, unlike the aim-reticle
nameplate path — see below) for the same reason: a floating bar rendering meters below the raider it
belongs to is an immediately obvious visual defect a live test would catch instantly.

**Deliberately left alone, and why**: `targeting.ts`'s aim-reticle nameplate positioning has the exact
same "assumes feet at ground 0" limitation — but an elevated DEFENDER (shipped since Wave 8) already has
this identical gap today with nobody having flagged it, so extending the same accepted approximation to a
raider is consistent with existing behavior, not a new regression, and touching the shared `AimTarget`
interface for pure cosmetic parity was judged disproportionate scope beyond what either document asked
for. Melee combat's own 2D-only reach check (ignores vertical distance for every enemy, elevated or not)
is untouched for the same reason — a pre-existing, engine-wide approximation this wave's content merely
exercises at a larger, more visible vertical gap than a mounted raider's saddle ever did, not something
this wave broke.

**Scope decisions named explicitly, per the addendum's own instruction** (also stated in code comments at
their exact source): the ladder is a **singleton** — one plantable breach point per raid, however many
finished wall-walk sockets the keep has (`raiderLadderState` mirrors `raiderRamState`'s own plain
module-level shape exactly). It is **enemy-only set dressing** — rendered straight from
`raiderLadderState`, never registered as a `PlacedBuilding`, so the player's own `climbTargetFor` (which
only scans `st.buildings`) never recognizes or offers to climb it, even though it's the same
`isLadder`-flagged `oc6096-5` asset the player can climb elsewhere. And it inherits the **same away-raid
trade-off** `raiderRamState` already carries: `Defenders.tsx` never targets or damages either singleton,
so a raid resolving while the player is at a destination cannot be contested by anything but the player —
bounded, since a defender who loses a fight up there is merely "downed" for `DOWNED_RECOVER_MS`, the same
as any other defender-downed cause, not permanently lost.

**Addendum #6 (the item flagged above as needing live-fire verification) was resolved by a full,
independent Verify pass after implementation**: a dedicated Verify session drove real headless Chrome
(`--headless=new --use-angle=d3d11 --mute-audio`, playwright-core, per this project's own CLAUDE.md)
against a real `npm run dev` server and live-exercised every one of the addendum's 10 numbered points with
concrete measured evidence, not just re-reading the diff. The elevated-vs-elevated ranged exchange
specifically was forced live (the climbed raider's `data.ranged` set true against its matched, pinned
defender) and observed over 20 real frames: shots landed repeatedly and cleanly, each decrement exactly
matching `RANGED_DMG` on the expected cadence — `hasLineOfSight` behaves correctly for this pairing, no
fallback needed, contrary to the addendum's own stated (reasonable, at design time) concern that this
pairing had never been exercised before. This item is CLOSED, not open.

Verify's other live-measured results, addendum point by point: (1) a real raid trigger spawned a real
ladder via the real code path, with geometry (targetSocketId/topX/topZ/topY/baseX/baseZ/baseYaw) matching
the design's own math exactly — independently re-derived by hand during this review and confirmed to
match the live-measured numbers precisely; melee and bolt damage both connected via the real `combat.ts`
routing. (2) The single most important check — same-wall-walk matching — was proven directly: with two
elevated defenders posted at different sockets, the climbing raider damaged ONLY the defender at its own
socket, the other's HP never moved across the full observation window. (3) Destroying the same wall-walk
socket via an unrelated attack while a raider was mid-fight up there dropped it to `'dying'` within the
very next frame, confirmed both from store state and a real in-game toast. (4) The raider's actual
rendered Y position was sampled across 20 consecutive frames through the chase-to-attack transition and
stayed locked at the walkway height throughout — the height-snap-back bug is genuinely fixed, not just
patched in theory. (5) The two-stage climb was confirmed as genuine multi-frame motion (rungs, then a
distinct final haul) matching the tuned stage durations, never a teleport or single lerp. (9) The enemy
ladder was confirmed, both structurally and live, to never appear as a `PlacedBuilding` the player's own
`climbTargetFor` could ever recognize. Two minor, non-blocking "polish" gaps were noted by Verify (the
ladder's own wrecked-tail notify/salvage/audio lines and the first-person HUD "Climb" prompt's exact
visibility were each confirmed via direct code read and a synthetic HP=0/wrecked=true state set rather
than a real hit-to-zero and genuine in-browser mouse-look; both are near-verbatim mirrors of already-
proven code, judged low-risk) — no blockers, no real bugs.

One additional inconsistency was found and fixed during independent post-Verify review (not by Verify
itself): the elevated-vs-defender ranged LOS check passed the target's raw `postY` (foot-level) instead of
`postY + GROUND_LOS_Y`, unlike every other ranged branch in this file, which applies `GROUND_LOS_Y`
symmetrically to both ends. Live-tested behavior is unaffected either way (this project's own keep-wall
pieces are not registered as real LOS obstacles today, confirmed during the original design session), but
the one-line fix restores consistency with the file's own established convention.

**Verification**: `npx tsc --noEmit` clean (exit 0, zero output), re-confirmed independently after the
above fix. `npm run build` clean (exit 0). Every one of the addendum's 10 numbered points independently
re-confirmed against the final diff, cited by file/line, AND live-exercised by a real browser session —
this wave is fully closed out, not pending a follow-up verify pass.

**Files changed**: `src/game/raiderLadder.ts` (new — the ladder's own state + `resetRaiderLadder`/
`damageRaiderLadder`, mirroring `raiderRam.ts`); `src/components/combat/RaiderLadder.tsx` (new — the
ladder prop's trundle-in/plant/wreck visual, mirroring `RaiderRam.tsx`); `src/game/data/keep.ts`
(exported `WALK_CORNER_HALF`/`WALK_DEEP_HALF` for the ladder's own outward-offset geometry);
`src/game/combat.ts` (`EnemyMob` gains `'climbing'` state + `climbT?`/`elevated?`/`postY?`/
`ladderSocketId?`; melee and bolt routing to the new `hitRaiderLadder`; `stepBolt`'s `hitTestCharacter`
call now reads `e.mob.postY` for an elevated shot); `src/components/combat/Enemies.tsx` (the 'climbing'
early-return + live elevated-wall recheck; the new elevated-vs-defender/player targeting branch; the
ladder-seeking chase/climb-slot-claim branch; the height-tail ternary fix; the fleeing-trigger's new
`!m.elevated` guard; the raid trigger's new ladder spawn roll and raid-end cleanup; the 1Hz climb-slot
pruning); `src/components/world/GameWorld.tsx` (mounts `<RaiderLadder />` beside `<RaiderRam />`);
`src/components/combat/HealthBillboard.tsx` (health-bar lift accounts for `m.elevated`/`m.postY`).

## Wave 59: real water-hole rendering (H3); home nav-grid height-awareness declined (H2) — SHIPPED 2026-09-16

Twenty-sixth wave of the new 27-wave plan, and the last of 3 items flagged for their own dedicated design
session. Unlike every prior design-session wave, the design process itself took two full stages: an
initial Design + 3-lens adversarial review (matching Wave 58's own proven template), followed by a
dedicated LIVE RENDERING SPIKE once that review found the initial H3 proposal was very likely a rendering
dead end — an empirical escalation this wave needed and no prior design-session wave had.

- [COMPLETE] ✅ **H2 · AI pathfinding height-awareness at home — DECLINED, unanimously.** All 3 independent
  adversarial reviews of the initial design session confirmed: zero real consumer exists for AI pathing
  onto either of the two existing `TERRAIN_REGIONS` (the North Downs, West Fell) or for any destination-
  side gap (destinations already have working `mode:'window'` height rasterization). Raiders/villagers
  already correctly, deliberately route around both hills as static `'blocked'` exclusions — Wave 31's own
  choice, not an oversight — and a repo-wide search found zero quest, resource node, POI, or narrative beat
  on either hill. **A real correction to the plan's own framing, independently confirmed by all 3
  reviewers**: the plan's "~34x" rasterization-cost figure describes a different, much larger hypothetical
  (whole-map mesh/triangle-authoring density) than a narrowly-scoped home rasterization would actually pay
  (bounded to the two regions' own cells, roughly 5.8% of the home grid, not 34x anything) — but this
  correction doesn't change the recommendation, since there is still no real consumer to justify building
  it at all. This is the third time this project's own design-session discipline (Waves 31, 41, and now
  59, following Wave 58's own "decline the generic version" precedent one wave earlier) has reached the
  same honest conclusion: find zero real consumer, build nothing, document the minimal future shape for
  whoever revisits it. `navgrid.ts`, `homeGround.ts`, `navTerrain.ts`, `AgentManager.ts`, `Agent.ts`,
  `Reasoner.ts`, and `Locomotion.ts` are all confirmed untouched by this wave's diff.
- [COMPLETE] ✅ **H3 · dug water gets a real, visible hole in the ground instead of a flat overlay plate.**
  The plan's own framing ("Wave 31's elevation work unblocked this") does not survive contact with the
  real architecture — every real dug-water rectangle sits on flat ground and structurally always will,
  since digging is bounded well short of either terrain region — but a real, different fix exists anyway.
  **The initial design's own proposed mechanism (sink the existing bank/water overlay planes below y=0,
  leave the ground mesh untouched) was independently predicted dead by 2 of 3 adversarial reviewers**,
  reasoning from this project's own `DOWNS_SINK` docstring (which states outright that anything below a
  sunk knoll's own threshold "is simply underneath the meadow and invisible") — the exact same physical
  mechanism, inverted, meaning a depression would be occluded BY the still-intact, un-carved ground mesh
  rather than occluding it. **A dedicated live rendering spike then empirically confirmed this exactly**:
  the sunk overlay was 100% invisible from every camera angle tested, including a shallow near-grazing
  angle and looking straight down at the dig's own boundary line — real screenshots, not just reasoning. A
  second idea (`depthTest:false` + high render order, forcing the water to draw over the meadow
  regardless of depth) was tried and rejected the same way: confirmed live to render the water straight
  through a solid wall standing between the camera and it, an immediately obvious correctness bug in
  exactly the case real play hits constantly (a moat explicitly meant to run along a fence). **The
  mechanism that actually works**: `HomeMeadow`'s own material (and a matching custom shadow-depth
  material, needed because the meadow casts/receives real shadows) gets a `MeshStandardMaterial
  .onBeforeCompile` injection — a per-fragment world-space rectangle test that `discard`s wherever a live
  `waterworks` rectangle sits, driven by a small shared uniform array kept in lockstep with the water list.
  This is real geometry removal at the source, not a depth-buffer trick, so it correctly respects any other
  object's own depth from every angle — the wall-occlusion bug that killed the second idea structurally
  cannot recur. `DugWater`'s own bank plate became a real 4-strip ring (a solid plate here would sit
  directly above the new hole and hide it all over again, the identical occlusion failure one layer up —
  found and fixed during the spike itself), plus 4 vertical pit-wall quads down to a new `PIT_DEPTH=0.6m`,
  plus the existing water plane sunk into the pit. **A real, concrete bug found during independent post-
  spike review and fixed before shipping**: the spike's own first working patch put the water surface only
  0.06m above the pit's floor (water pooled near the bottom of a mostly-dry pit), directly contradicting
  its own doc comment's stated intent ("brim-full... not a dry pit with water only at the bottom") — fixed
  by keeping the water at its original small offset from grade (`-WATER_Y`) rather than offsetting from the
  new pit floor, so the water now sits near the rim as intended. The Verify pass independently reproduced
  the pre-fix bug live (a real before/after screenshot comparison, reverting and re-applying the one-line
  fix) to confirm the correction genuinely closes it, not just in theory.
- **Verified live end-to-end for both items, real headless Chrome against a real running dev server**
  (`--headless=new --use-angle=d3d11 --mute-audio`, zero console/page errors across every run, including
  zero shader-compile warnings from the `onBeforeCompile` GLSL injection). Real evidence: a genuine visible
  hole (sand ring → visible drop → water) confirmed from 3+ angles including the required shallow grazing
  angle; the water confirmed sitting near the rim, brim-full, not pooled at the bottom (the exact addendum
  fix, reproduced broken-then-fixed for a real before/after comparison); two independent, non-adjacent
  water features open simultaneously, each a real hole, with removing one leaving the other genuinely
  unaffected; a real building placed between the camera and a water hole confirmed to occlude it correctly
  from every angle — the precise case that broke the rejected `depthTest` approach, confirmed NOT
  reproducible in the shipped mechanism; the natural POND/BROOK confirmed rendering exactly as before,
  including a pre-existing specular-glint artifact independently confirmed (via a control test against the
  untouched POND) to be unrelated pre-existing material behavior, not a regression; H2's full file list
  independently re-confirmed untouched. `npx tsc --noEmit` / `npm run build`: both clean, verified
  independently (by the workflow's own Verify pass — clean, zero findings, no Fix pass needed — and,
  separately, by direct review of the complete 3-file diff against the live worktree afterward, including
  independently re-deriving the bank ring's own 4-strip geometry by hand — confirmed to exactly tile the
  area between the outer bank and the inner hole with zero gap/overlap — and independently verifying,
  against the real installed `three` package source, that the GLSL injection points used
  (`#include <common>`, `#include <begin_vertex>`, `void main() {`) each occur exactly once per shader
  stage, making the plain single-occurrence string replacement used to inject them safe).

**Files changed**: `src/components/fps/PlayerController.tsx` (exports the pre-existing `PLAYER_RADIUS`
constant, zero behavior change, so `Terrain.tsx` can dev-assert its hole margin against the real live
value); `src/game/waterworks.ts` (new `PIT_DEPTH=0.6` constant with its own full reasoning doc comment, no
existing export changed); `src/components/world/Terrain.tsx` (the real work — `HomeMeadow`'s shader-hole
injection + shared uniforms + matching custom shadow-depth material; `DugWater`'s bank plate → 4-strip
ring, new pit-wall quads, water plane sunk to sit near the rim).

## Wave 60: visual terrain-region authoring tool (H5) — SHIPPED 2026-09-17

Twenty-seventh wave of the new 27-wave plan. Not flagged for a dedicated design session — the standard
Research→Implement→Verify template applied directly.

- [COMPLETE] ✅ **`/secret/worldeditor` gets a 4th table, Terrain Regions, authoring `TERRAIN_REGIONS`
  visually.** The one real architectural blocker was confirmed and closed cleanly: unlike `GROUNDS`/
  `LAND_TIERS`/`CULTIVATED_PLOTS` (each already a `.generated.json` import), `TERRAIN_REGIONS` was still a
  hand-authored literal array directly in `terrainRegions.ts`. Research grepped every real consumer
  project-wide (`Terrain.tsx`, `Minimap.tsx`, `navTerrain.ts`, `homeGround.ts`, `PlayerController.tsx`,
  `keep.ts`, `waterworks.ts`) and confirmed every one reads the exported array purely by reference — the
  migration to `terrainRegions.generated.json` (mirroring `grounds.ts`'s own Wave 6 precedent exactly)
  changes zero other lines in the file: `regionAt`, `regionSurfaceY`, `REGION_PEAK`, and the file's own
  real dev-mode assertion block all keep working unchanged against whatever the JSON now holds. The two
  already-shipped regions (The North Downs, West Fell) migrated byte-for-byte, independently re-verified
  by direct numeric comparison against the original literal array. **A real correction to the plan's own
  wording, found and carried through correctly**: the plan's own text cited "BROOK's own dashed circles"
  as the visual precedent to reuse for a region's bumps — confirmed wrong on direct read: `BROOK` renders
  as a solid line, not a dashed circle; the actual dashed-circle idiom in the map preview belongs to
  `STARTER_VILLAGE_CLEAR`'s own soft-advisory-zone convention. The shipped visual design correctly reuses
  that real precedent instead (a solid earth-brown box for a region's own field, dashed unfilled circles
  per bump), not the plan's mistaken attribution.
- [COMPLETE] ✅ **All five of `terrainRegions.ts`'s own real dev-mode safety checks ported into the
  editor's live, pre-save warnings** — region-vs-region overlap, field gradient + rim-buried sweep
  (reusing the real, imported `regionSurfaceY`/`DOWNS_MAX_GRADIENT`/`DOWNS_SINK`, never a re-derived copy),
  the build-fence and dig-reach bounds, and road/grounds clearance — matching this editor's own
  established "check the edit in progress, not what's on disk" convention every other table's warnings
  already use. A small, real DRY cleanup along the way: `sectionsOverlapLive`/`crossesRoad`/`offRoad`
  were narrowed from the grounds-specific `RectSection` type to the minimal structural `Box` shape they
  actually need, letting a terrain region (which has one `half`, not separate `halfX`/`halfZ`) reuse the
  exact same, already-proven overlap/road-crossing functions via a square view rather than forking
  duplicate math — a safe widening confirmed to change no existing call site's behavior.
- **Verified live end-to-end, real headless Chrome against a real running dev server**
  (`--headless=new --use-angle=d3d11 --mute-audio`, zero console/page errors across every run). Real
  evidence: the new tab loads and renders both real shipped regions with correct nested bump editors and
  matching map-preview boxes/circles; each of the 5 ported checks was forced live and confirmed to fire
  with the correct message and red highlighting, then clear once fixed; a real add/edit(with a new bump)/
  remove/save round-trip was verified by reading the actual on-disk `terrainRegions.generated.json`
  content directly after saving, then confirmed a fresh reload-from-disk shows the same data back; the
  real live game was booted afterward and both hills confirmed still rendering correctly at their real
  positions/scale, with `terrainRegions.ts`'s own dev-mode console assertions staying silent for the
  unmodified data (and correctly firing only when deliberately-bad test data was written) — confirming
  the migration itself introduced zero regression to the shipped terrain. `npx tsc --noEmit` / `npm run
  build`: both clean, verified independently (by the workflow's own Verify pass — clean, zero findings,
  no Fix pass needed — and, separately, by direct review of the complete 5-file diff against the live
  worktree afterward, including independently re-deriving that the editor's ported `outside()`/gradient-
  sweep/rim-buried checks are exact, line-for-line-equivalent ports of `terrainRegions.ts`'s own real
  dev-assertion math, and confirming the migrated JSON's every numeric field matches the original literal
  array exactly).

**Files changed**: `src/game/data/terrainRegions.generated.json` (new — the 2 existing regions, migrated
byte-for-byte); `src/game/data/terrainRegions.ts` (literal array → generated-JSON import, header comment
updated, no other line changed); `src/app/api/worldeditor/save/route.ts` / `data/route.ts` (new
`terrainRegions` table entry; a `validateRow` branch for the region+bumps shape, including a `bump.r > 0`
guard against a real divide-by-zero inside `regionSurfaceY`); `src/app/secret/worldeditor/
WorldEditorClient.tsx` (new `terrainRegions` table/tab; the narrowed `Box`-typed overlap/road helpers; the
new `terrainRegionProblems` 5-check port folded into the existing warnings; `MapPreview` extended with
region boxes + bump circles; the new `TerrainRegionsForm` with its nested bump sub-editor).

## Wave 61: gamepad movement rebinding + in-panel gamepad/keyboard navigation (H1) — SHIPPED 2026-09-17

Twenty-seventh and final wave of the new 27-wave plan. Not one of the 3 items flagged for its own
dedicated design session — but this project's own comments, in two separate prior waves
(`gamepadInput.ts`'s and `GamepadMenuController.tsx`'s headers), had already called part of this exact
item "a real, separate project" and declined to build it, so this Research pass re-verified every claim
live against the current code before designing anything, matching the honesty discipline the 3 formally
flagged waves (31, 41, 58, 59) established.

- [COMPLETE] ✅ **Half A · jump/interact/sprint join the gamepad rebind table.** Re-reading
  `gamepadInput.ts`'s own two-year-old header (its "make every keybind polymorphic" vs "rewrite
  GameScreen.tsx's panel switch to frame-polled" framing) against the CURRENT `pollGamepad` found both
  options were solving the wrong layer: `pad[kb.<action>]` is keyed by keyboard CODE STRING only as an
  arbitrary, consistently-resolved slot name, and nothing about *which gamepad button* triggers that write
  was ever coupled to it. A much smaller third option — copying the pattern `CombatController.tsx`'s
  attack/block/swap/dodge already proved — closed the gap for real: `jump`/`interact`/`sprint` (plus a new
  `confirm`, for Half B) joined `DEFAULT_GAMEPAD_BUTTONS`/`GamepadAction` at their existing default indices
  (0/2/5/0), `RESERVED_GAMEPAD_BUTTONS` shrank from `{0,2,5,12-15}` to just the d-pad `{12-15}`, and
  `PlayerController.tsx`'s `pollGamepad` now reads `gpBtn.jump/interact/sprint` instead of the literals —
  zero changes to `keybinds.ts`, `isDown`, or the keyboard rebinding system. **D-pad movement (and the left
  stick) stay hardcoded, on purpose and stated plainly**: rebinding a 4-way spatial control one direction
  at a time destroys the only reason it exists, and the stick is already the primary, fully-analog
  movement input. The stale "🎮 Controls" cheat-sheet (Panels.tsx) and the Options > Keybinds > Gamepad
  tab's "aren't remappable yet" note both got fixed to read live button labels instead of a hardcoded
  default, so a rebound player is never shown a wrong hint — while touching that cheat-sheet line anyway,
  every OTHER gamepad label on it (attack/block/swap/pause/cancel/menu\*, already rebindable since Wave 33
  but never reflected there) was made live too, not just the 3 new actions.
- [COMPLETE] ✅ **Half B · a real, generic in-panel roving-focus + confirm/cancel system — genuinely
  smaller and more honest than the plan's "~18 bespoke panels" framing, not a scope reduction from it.**
  Reading all 19 real, reachable `PanelId` panels directly (not skimming) found two corrections to the
  plan's own text: `gameStore.ts`'s `PanelId` union has 21 members, not ~18, but one (`commands`) is dead
  code — no `setPanel('commands')` call anywhere and `Panels.tsx`'s render switch has no case for it — so
  19 are real; and `GamepadMenuController.tsx`'s own claim "no panel has ANY keyboard-focus equivalent" was
  too strong — the overwhelming majority of actionable controls in essentially every panel are already real
  `<button>` elements, natively Tab/Enter-reachable the instant pointer lock releases, just invisible (no
  focus ring) and gamepad-unreachable (a gamepad press synthesizes no DOM event). So rather than a bespoke
  system per panel, `GamepadMenuController.tsx` gained one generic rove scoped to the `.game-panel` class
  every one of the 19 panels' root already shares: focuses the first focusable element when `st.panel`
  changes (including a MenuTabs tab switch, which is also just a `setPanel` call), d-pad up/down edges
  cycle `document.activeElement` through `.game-panel`'s `button:not(:disabled), [tabindex]:not(...-1)`,
  and the new `confirm` action (A) calls a real DOM `.click()` on whatever's focused — which fires the
  exact same `onClick` a mouse or a keyboard Enter/Space already would, needing no separate action table. A
  new `.game-panel :focus-visible { outline: 2px solid var(--gold); }` rule (globals.css, where `.game-panel`
  itself actually lives — the design's suggested `kk-screens.css` location was corrected on read) makes
  this a real, visible, working **keyboard** Tab+Enter feature too, at no extra cost, not just gamepad. A
  short, separately-named pass added `tabIndex`+Enter/Space wiring to the real minority of onClick-`<div>`s
  that weren't buttons: `EquipmentSection`'s weapon-equip tile and `InventoryPanel`'s Satchel grid, the
  `TalentTree` skill nodes and 2 New-Game+ perk-choice rows, and `QuestLogPanel`'s 2 region-header toggles
  (all in/near `Panels.tsx`/`QuestLogPanel.tsx`), `EmoteWheel`'s icon grid, and `NpcEquipPanel`'s helmet +
  chestplate-tier equip tiles — each wired with a shared `onKeyActivate` helper (new
  `components/ui/a11yClick.ts`) that calls the exact same handler the element's `onClick` already used, so
  no click-guard logic was duplicated. **Declined, explicitly and permanently, exactly as scoped**: the two
  HTML5 drag-and-drop equip gestures (`InventoryPanel`'s weapon row, `NpcEquipPanel`'s Armory/gear-tile
  `onDrop` targets) — dragging is the one interaction a gamepad genuinely cannot do without a full virtual
  cursor, so those stay mouse/touch-only (their *click* half is in the rove; their *drop* half isn't); and
  per-direction d-pad rebinding (see Half A). Both halves shipped together — they touch disjoint files and
  are each independently complete and useful; there was no reason to hold one for the other.
- **Verified live, end to end, both halves functionally, not just by reading the diff.** `npx tsc --noEmit`
  and `npm run build`: both clean, exit 0. A separate Verify pass — with real generated game assets
  junction-linked into its own worktree — went past the implementation's own environment limits and
  actually entered the live 3D world, driving a simulated `navigator.getGamepads` override (the same
  technique this project's own Wave 33 verification already established) against real gameplay state.
  **Half A, proven functional, not cosmetic**: before any rebind, holding the default jump button (A)
  measurably left the ground (`window.__kkp.grounded` flips false, `.y` rises); Options > Keybinds >
  Gamepad shows the real "Movement" group and the new "Confirm / Activate (in-panel)" entry; rebinding
  Jump's capture correctly REFUSES a reserved d-pad button and accepts an allowed one (Y); after rebinding,
  the OLD button (A) no longer jumps while the NEW button (Y) does — measured twice, confirmed genuinely
  functional, not just a relabeled UI. **Half B, proven functional on 2 real, differently-shaped panels**:
  opening Quests or Inventory (via the real gamepad panel-toggle actions) lands real DOM focus inside
  `.game-panel`; d-pad edges move focus forward/back through real, distinct elements (confirmed different
  between the two panels); `confirm` (A) produces two independent, real click-equivalence proofs — firing
  it on a roved-to `<button>` (a MenuTabs tab) flips `gameStore.panel` exactly as a mouse click on that same
  button would, and firing it on the one onClick-`<div>` exception this wave wired (QuestLogPanel's region-
  header) flips its arrow glyph for real; plain keyboard Tab was independently confirmed reaching the same
  elements, and the new focus-visible outline was confirmed both in the served stylesheet and visibly
  rendered in a real screenshot. Wave 15's original 3-panel open/close and pause/back behavior were
  re-verified unregressed in the same live session. One unrelated, pre-existing, out-of-scope issue was
  noted for completeness (not a Wave 61 regression, confirmed by re-reading the diff): the Options screen's
  "ESC TO CLOSE" hint has never actually been backed by a real Escape handler — only its own "Back" button
  closes it; this predates Wave 61 by untouched lines and is left as a known, separate gap.

**Files changed**: `src/game/data/gamepadInput.ts` (Half A's table: `jump`/`interact`/`sprint`/`confirm`
actions, a new "Movement" `GAMEPAD_ACTION_GROUPS` entry, `RESERVED_GAMEPAD_BUTTONS` shrunk to the d-pad
only, header comment rewritten); `src/components/fps/PlayerController.tsx` (`pollGamepad` takes a `gpBtn`
table and reads `gpBtn.jump/interact/sprint` instead of literals); `src/components/fps/
GamepadMenuController.tsx` (Half B's roving-focus rove: focus-on-panel-change, d-pad up/down cycling,
`confirm` → real `.click()`); `src/app/globals.css` (the new `.game-panel :focus-visible` rule);
`src/components/ui/a11yClick.ts` (new — the shared `onKeyActivate` Enter/Space helper); `src/components/
stacks/OptionsStack.tsx` (the Gamepad sub-tab's now-stale "aren't remappable yet" note corrected);
`src/components/hud/Panels.tsx` (live gamepad-label cheat sheet; `tabIndex`/`onKeyActivate` on the weapon-
equip tile, Satchel grid, TalentTree nodes, 2 perk-choice rows); `src/components/hud/QuestLogPanel.tsx`
(the 2 region-header toggles); `src/components/hud/EmoteWheel.tsx` (the emote icon grid);
`src/components/hud/NpcEquipPanel.tsx` (the helmet + chestplate-tier equip tiles; a `toggleChestplate`
helper pulled out so `onClick`/`onKeyDown` share one implementation).

## Bugfix: test browsers hijacked the developer's real mouse pointer (pointer lock) — SHIPPED 2026-09-25

**Report**: "these tests keep moving my mouse around the screen." Despite CLAUDE.md's mandatory
`--headless=new --use-angle=d3d11 --mute-audio`, automated runs still dragged the real OS cursor.

**Root cause** (measured, not guessed): sampling `GetCursorPos` at 25 Hz during a live `--headless=new`
run showed the cursor alternating between exactly two points — the developer's resting position and the
centre of the test window — 20 times in 25 s. That is Chrome's pointer-lock implementation (warp the
cursor to the window centre on lock, warp it back on release), which still runs against the hidden
window of a headless/off-screen Chrome on Windows. `PlayerController.tsx` requests the lock on every
canvas click and re-requests it 120 ms after every panel close, and releases it whenever a panel opens
or the game pauses, so any script that clicked the world or cycled panels produced the bounce. It also
explains the older "cursor snaps to the top-left corner" reports from the off-screen-window era: the
centre of a window parked at -32000,-32000 is far off-screen, so Windows clamped the warped cursor to
the corner. Of the 337 local `scripts/` that launch Chrome, 278 use `headless: true` (new headless on
the installed Chrome 153) and 59 are headed; all were exposed, independent of flags.

**Fix**: `src/game/pointerLock.ts` is now the only caller of `requestPointerLock`/`exitPointerLock`.
When the browser is judged automated — a `?pointerlock=virtual|real` URL flag first (sticky for the tab
in sessionStorage), else `navigator.webdriver === true` or a `HeadlessChrome` user agent — it keeps a
*virtual* lock instead: same `pointerlockchange` event, same `locked` ref in `PlayerController`, same fps
attack gate in `CombatController`, so scripted play behaves as before while the game's pointer lock no
longer warps the OS cursor. A real player's path is the original code verbatim. The explicit flag exists
because an independent review found `navigator.webdriver` is false on Playwright's own CLI/MCP browser
(`--disable-blink-features=AutomationControlled`), under stealth plugins, and over a CDP attach — those
runs must load the game with `?pointerlock=virtual`. `window.__kkpointerlock` (`{ automated, active }`)
is the test handle, since `document.pointerLockElement` is always null under automation. `CLAUDE.md`
documents all of this; `CLEANUP_PLAN.md` CLN-26 now says the extracted `usePointerLock` must keep
routing through this module.

**Evidence**: scripted scenario (boot, canvas click, 12 panel open/close cycles with clicks) against a
pristine-main build and the fix, with the lock API stubbed so nothing could reach the real cursor: main
issues 9 `requestPointerLock` / 8 `exitPointerLock`; the fix issues 0 / 0 under automation with identical
mouse-look (yaw delta -0.22) and attack-gate results (closed before the first click, open after), and
9 / 8 with automation detection overridden off — the real-player path is unchanged. Real, unstubbed
headless and headed off-screen runs of the fix with the OS cursor sampled showed no bounce signature
(no fixed point revisited; every recorded position distinct) — the developer was moving their own mouse
during the runs, so the judgement is by pattern, not "zero movement". The old code was deliberately NOT
re-run with the real lock, to avoid hijacking the developer's mouse again.

**Not done, deliberately**: the 59 headed legacy scripts still open real off-screen windows, which can
take focus even though the cursor no longer moves; nothing enforces "only `pointerLock.ts` calls the
real API" (a CI grep guard was considered and left out to avoid touching CI in a bugfix).

## Bugfix: evalCurve quadratic could return NaN — FOUND AND FIXED 2026-10-02 (during CLN-02)

**Found by** CLN-02's new `src/ai/core/curves.test.ts` property test (20,000 random curve parameters must all give a
finite score in [0, 1]). The `quadratic` branch computed `m * Math.pow(x - c, k) + b` and clamped it — but `Math.pow` of a
negative base with a non-integer exponent is NaN, and NaN passes straight through `clamp01`. A NaN consideration would
poison `scoreAction`'s whole product (the `logit` branch already had a NaN guard for exactly this reason).

**Reachable today? No.** Every authored quadratic curve (12, across `src/ai/actions`) has `c: 0`, so the base is never
negative. It was a trap for the first curve authored with a positive shift and a fractional exponent.

**Fix:** the quadratic branch now returns 0 for a NaN result, the same convention as `logit`; every non-NaN value is
clamped exactly as before, so no current score changes. The property test is the regression guard.

## Bugfix: Beda's plank delivery errand could never be advanced — FOUND AND FIXED 2026-10-02 (during CLN-21)

**Found by** CLN-21's new `validateGameData()` (`src/game/data/validate.ts`), on its first run against the shipped data.

**The bug:** Miller Beda's errand `bd_haul_timber` — "The Old Ruins could use good timber — cart 8 planks out to
Fenwick" — is a `deliver` errand whose goods are **planks**. A delivery's counter was only ever advanced by a
*harvest* (`bumpSideQuest` treated a `gather` bump as loading a delivery, nothing else), and planks are never harvested:
no node, villager job or side-good yields one, they are only crafted. Crafting bumps the `craft` kind, which a
`deliver` errand ignored. So the counter stayed at 0/8 forever, and `turnInSideQuest` refuses below 8 — the errand was
unfinishable since it shipped (Wave 13). It is the same class as the five errands Wave 34 fixed
(`gather` aimed at a crafted item); that pass missed this one because its kind is `deliver`, not `gather`.

**Fix** (`gameStore.ts`, `bumpSideQuest`): a `craft` bump now also loads a delivery when the crafted recipe's *output*
is the errand's goods (the bump carries the recipe id, so it is matched on what the recipe makes). Nothing else
changes: a harvested-goods delivery still loads by harvesting, and crafting does not advance a delivery of anything
else or a plain `gather` errand.

**Verified:** `src/game/store/sideQuests.test.ts` drives the real store — it failed before the fix (0 after crafting 8
planks) and passes after, including the hand-over at The Old Ruins taking the 8 planks; live in a production build,
through the real actions: accept → craft 4× (2 planks each) → 8/8 → travel to template-08 → turn in → errand
complete, planks 8 → 0, 0 console errors.

## Bugfix: every trip away from home leaked GPU memory — FOUND AND FIXED 2026-10-02 (during CLN-24)

**Found by** measuring before fixing. CLN-24 named two leaks (instanced props and torch flames). A probe that wraps the
WebGL context's create/delete calls, holds each texture and buffer only through a `WeakRef`, and forces a garbage
collection before every reading showed those two were the small part — and that the destination bakes, which Wave 18
(Stage 0b) believed it had already released, were the large one.

**The bug:** three.js never frees what it has uploaded for an object that is merely un-referenced, and
react-three-fiber disposes only the objects it created from JSX. Anything handed to it ready-made — a `<primitive>`, a
`geometry={...}`, `material={...}` or `map={...}` prop — is the caller's to release, and four places never did:

- **Destination bakes** (`TemplateWorld.tsx`). Leaving a destination dropped its GLTF cache entry, on the written
  assumption that this left the graph "unreachable and GC-eligible". For anything already drawn it does not: the
  renderer keeps an undisposed geometry's attributes reachable through its vertex-array cache, so the vertex buffers
  stay on the GPU for good. Measured on `main`, vertex-buffer memory still held after returning home, per visit:
  **+1.67 MB** for The King's Approach, +0.85 MB for The River Landing, +0.38 MB for The Rival Castle, +0.19 MB for
  The Frozen Pass. Eight trips took it from 6.5 MB to 12.7 MB (1,266 to 1,860 live buffers); it never came back.
- **Instanced props** (`InstancedProps.tsx`, and the rock groups in `ResourceNodes.tsx`). Each mount cloned its
  geometry and material and nothing released them: up to 39 buffers pinned per return home (trees, herbs, fences, rocks),
  and the same again for the crypt's walls on every descent (+18 to +29 geometries per descent, +9 per arena run).
- **Hand-loaded textures**: the pond, brook and waterfall ripples (re-created on every return home, since `Terrain`
  is home-only), and the five skybox faces (on every flip between a grass and a mountain destination). These were
  not pinned — the browser reclaimed them when the garbage collector found the JavaScript objects — so this half was
  late and unpredictable release rather than unbounded growth. three's own counter shows the churn: 15 textures at
  boot, 152 after six trips to The King's Approach.
- **Torch and forge flames** (`LabFlame.tsx`). Clones of the flame strip share one GPU texture, so a flame never cost
  a second upload — but an undisposed clone held that texture's use count up for good, so it could never be freed.

**Fix:** release on unmount, where each object is created. `lib/disposeObject3D.ts` disposes the geometry, materials
and textures of a whole loaded graph, and the destination scene calls it on the cached bake when it unmounts.
`useDisposeSubMeshes` (InstancedProps) releases a sub-mesh list's cloned geometry and material — not its textures,
which belong to the shared GLTF cache. `useRippleTexture` replaces three copies of the water-texture loader block and
disposes what it loads; the sky disposes its faces when the variant changes; a flame disposes its clone. `dispose()`
only frees the GPU side — the objects stay usable and are uploaded again if drawn — so none of this depends on
unmount order.

**Deliberately left alone:** the home meadow's per-mount material clones. Nothing pins them (the meadow uses its own
depth material, so the shadow pass caches nothing for them), and disposing them would throw away the meadow's patched
shader on every trip only to recompile it on every return. Prop and minifig models loaded at destinations also stay
in drei's cache for the session, as before — that is bounded by the number of distinct assets, not by trips (four
destinations visited: 32 to 110 textures, 1.9 to 3.4 MB of buffers, then flat).

**Verified** on production builds of `main` and the branch, headless, same scripts:

- GPU objects still held after a forced garbage collection, over twelve trips cycling four destinations — `main`:
  buffers 1,266 → 1,860 and 6.5 → 12.7 MB across the last eight; branch: 957 → 933 and 3.42 → 3.40 MB, textures 110
  on every one of the last nine readings.
- three's own counters over six trips to The King's Approach — `main`: geometries 186 → 445, textures 15 → 152;
  branch: 217–218 and 34 at home on every return, 202 and 54 at the destination from the second visit on. Crypt
  and arena runs: flat on the branch after warm-up. Twenty forges placed and removed, four times: the flame texture
  is released each time (39 → 40 → 39) instead of staying allocated.
- Nothing visible changed: ten screenshot pairs (pond, a dug waterway, trees, rocks, the destination; before and
  after two round trips, i.e. after every dispose path has run) differ in at most 0.05% of pixels, and the scene
  signature after the trips — 370 meshes, 20 instanced groups with their counts, the four water textures with their
  tiling — is identical.
- Cost: once a destination has loaded for the first time, the longest frame on arriving there again is 50 ms on the
  branch against 33 ms on `main` (materials that were never released kept their shaders compiled); returning home
  is the same on both, 17–33 ms.
- `next dev` and the production build both run the whole sequence with 0 console errors;
  `lib/disposeObject3D.test.ts` (5 tests) fails 3 of them when the texture disposal is removed.

## Bugfix: Tam could fell Princess Storm in the player's own duel — FOUND AND FIXED 2026-10-02 (during CLN-12)

**Found by** CLN-12's golden master, which drives every ally against every enemy kind: an ally's blow on Storm was
settled as an ordinary kill. Then reproduced in the running game.

**The bug:** a duel with Storm is first blood between her and the player — `resolveDuel` ends it either way, and
she is removed, not killed. Everything on her side already keeps it that way: she never targets a defender, Tam or a
villager (`Enemies.tsx`: "Storm duels stay strictly player-vs-Storm"), bolts pass through her (`stepBolt`), and
self-firing emplacements never pick her as a target (`Emplacements.tsx`). The other direction was never closed.
Tam's perception lists her like any hostile, so `assist_leader` charges her, and his 1.5 damage is more than her
1 HP.

**Observed** (branch dev build, The Sister Keep, Tam recruited, Storm 9 m away): about 2.5 seconds after she appears
the toast reads "Tam defeats a raider!", Storm plays a monster's death, `stats.killsByKind.storm` is 1, and the duel is
never resolved — no reputation, no 40 XP and 20 gold, no credit toward her first-blood errand, no cooldown. The
player did nothing. Reproduced on a production build of `main` afterwards (below).

**Also true before the fix, though never seen in play:** a cannonball or a placed charge felled her the same way
(`explodeBall` and `detonate` did not skip her), announced as "Bandit blasted!". Her dome is in a destination the
player can claim — the plot is wherever they stand when they claim it — so an engine could have been set up within
reach; that was not tried. Defenders and ordinary villagers cannot reach her: they only ever stand at home or in a
settlement, and she only ever appears at her dome.

**Fix:** three places now leave her alone, and the one that settles a death refuses to settle hers.

- `ai/perception/VisionSensor.ts` no longer lists her as a hostile. No agent forms a belief about her by sight, so
  none answers one — Tam stays at the player's side.
- `explodeBall` and `detonate` (`game/siege.ts`) pass her by, as `stepBolt` always has.
- `resolveEnemyKill` (`game/combat/kill.ts`) owns the rule: the player's own blade wins the duel (`resolveDuel`), and
  for every other cause it does nothing. The blade's special case moved there from `landMeleeHit`.

**Verified:**

- Unit tests: `ai/perception/VisionSensor.test.ts` (3, new — a raider beside the agent is noticed, a falling one is
  not, Storm is not and does not hide the raider next to her) and four in `game/combat/kill.test.ts` under "Storm's
  duel"; 99 in total. Each part of the fix was taken out in turn (six mutations) and a test failed every time.
- CLN-12's 90-step golden master. With Storm left out of every step it is byte-identical between `main` and the fix
  (353 KB), so nothing but her handling changed. With her in, the steps whose own outcome differs are the ones she is
  in: the two blasts into a crowd (she is untouched) and each ally's blow on her (no kill, no toast).
- Live, on production builds, at The Sister Keep with Tam recruited, three duels in a row. On `main` Tam ends two of
  the three ("Tam defeats a raider!" 2.5 seconds in, `killsByKind.storm` 2) and the player wins the one where they
  strike first. On the fix Tam sees no hostile and stays put, and all three end as duels should — Storm's blade first,
  the player's blow first (+10 reputation, "Worthy Opponent"), Storm's blade first — with no kill recorded. The same
  under `next dev`; 0 console errors. The CLN-12 kill probe (blade, cannonball, charge, the defender cascade, Tam
  against a Royal Knight) is unchanged apart from Storm no longer being caught in the two blasts.

**Left as it is:** a won duel is still heard. The player's blow makes the usual combat sound, keyed to her, so an
agent in earshot briefly holds a faint belief about an enemy who is already gone (threat 0 in the probe). Nothing
can come of it — there is nobody left to strike.

## Open decision: what a cannon or a charge kill is worth — logged 2026-10-02 (during CLN-12)

CLN-12 put every kill's bookkeeping in one place (`src/game/combat/kill.ts`), which sets the two blast paths' rules
side by side with the rest. They are kept exactly as they were — this is `CLEANUP_PLAN.md`'s open question, and a
change of what the game pays — but the facts are now in one table:

| | the player's blade | bolt or arrow | cannonball | placed charge |
|---|---|---|---|---|
| combat XP | the kind's own (20 to 150) | the kind's own, a little more | 20 for a skeleton, **30 for anything else** | **30 for anything** |
| the enemy's purse | handed over | handed over | **kept** | **kept** |
| what the player reads | "Royal Knight defeated! Looted …" | "Royal Knight shot down! Looted …" | "Skeleton blasted!", otherwise **"Bandit blasted!"** | **nothing** |
| arena tally | counted | counted | not counted | not counted |
| Cedric's final stand | ends his rebellion | ends his rebellion | does not | does not |

So a cannon that fells Gilbert pays 30 where a sword pays 45, Cedric 30 where a sword pays 150, and a Mounted Raider,
a Hedge Witch, a Shieldbearer, a Siege Engineer, a Royal Knight, Gilbert and Cedric are all announced as "Bandit
blasted!". The cannonball's two numbers and two names are exactly the skeleton and bandit rows of the tables every
other path reads. The arena row cannot matter today (the arena cannot be claimed, so no engine can stand there);
Cedric's camp is in a destination that can be claimed, so the final-stand row might.

This is also what an automated defence pays: a cannon, catapult or manned tower that fires on its own
(`Emplacements.tsx`) kills through the cannonball path, and a powder charge that a raider walks onto through the
charge path. A raid beaten off by engines alone hands over no purse at all — which may be exactly the intent.

**To decide:** whether blast kills should follow the same tables as the blade (name, XP, purse, tally, final stand)
or stay cheaper on purpose. Either way it is now an edit to two rows of `RULES` in `kill.ts`, and
`combat/kill.test.ts`'s "blast kills are kept as they were found" is the test to change with it.

## Bugfix: Alric or Beda, once recruited, never had a reasoner Agent again — FOUND AND FIXED 2026-10-03 (during CLN-17)

**Found by** CLN-17's golden master of the AI's population syncs, which drives the roster, court, companion and
wildlife syncs frame by frame: in the frame Alric joins the roster, his Agent disappears and never comes back.

**The bug:** Alric and Beda keep their NPC ids (`farmer_alric`, `miller_beda`) when "Join the Homestead"
(`recruitVillageFolk`) puts them on the roster. In that frame the roster sync, which runs first, sees the court's
'court' Agent under that id, despawns it and spawns him a 'villager' Agent. The court sync runs next; he is no
longer one of its NPCs (it skips anyone on the roster), so it despawned "his" Agent by id — which was now the
villager Agent the roster sync had just made. The roster sync still counted him as spawned, so it never made
another: from then on a recruited Alric or Beda had no Agent at all, whatever job they were given. Villagers.tsx
still drew them, but none of the reasoner's work — gathering at a node, hauling, tending — ever ran for them.

**Observed** (production build of `main`): recruit Alric, wait three seconds, make him a lumberjack beside a tree and
a stockpile, wait forty seconds — no Agent the whole time. On the fix: a 'villager' Agent from the first frame, a
couple of idle fidgets, then `gather_resource`. The same under `next dev`; 0 console errors.

**Fix** (`src/ai/sync/population.ts`): a population of Agents remembers the Agent object it spawned for an id, not
only the id. Letting an id go despawns that object only while it is still the one registered under the id, so when the
court lets Alric go, the villager Agent the roster gave him — not the one the court made — stays. Taking an id over is
explicit too: a population admitting a newcomer despawns whatever Agent holds the id and spawns its own. (The old syncs
noticed a take-over only when the archetype differed. `agentManager.spawn` hands back an Agent that already exists, so
a hand-over between two populations of the same archetype — a "scheduled walker" court NPC joining the roster, were
there any — would have left both holding one Agent, and the first to let go would have despawned it for both. Not
reachable with today's content; closed anyway.)

**Verified:** the sync golden master is identical to `main` in 28 of its 29 frames; the one that differs is the frame
Alric joins, now with his villager Agent. A differential fuzz — 600 scripts of 400 store-shaped operations (arrivals,
recruiting Alric or Beda, job changes, travel, quests, settlements founded, Tam, saves loaded, new games; 96,478
frames) run through the new syncs and through a transcription of the old ones — finds the two never differing except
over an Alric or Beda recruited during the session, for whom the new syncs have an Agent and the old ones none (from
that frame on, where that one id and its figure stand is not compared), and no frame where the new syncs leave anyone
without the Agent they should have. The old ones have none in all 19,571 cases — a frame, and a recruit in it — in
which he joined the way the game allows (after at least one frame at home). `src/ai/sync/population.test.ts` and
`sync.test.ts` (21 tests) cover the class, each sync and the hand-over; they catch 51 of 53 single-edit mutants of the
four sync files, and the other two change nothing.

## Bugfix: the court vanished underground whenever it fidgeted — FOUND (during CLN-17) AND FIXED 2026-10-03

**Found by** reading `Npc.tsx` while moving the court sync, then measured in the running game.

**The bug:** `CourtNpc` (`components/world/Npc.tsx`) places a figure in three ways. Standing idle, it used the ground
under the NPC's own spot — `destinationGroundY` at a destination, `homeGroundY` at home. But while the NPC's Agent
held a `PLAY_ANIM` or a `FACE` intent it used `homeGroundY` alone, on a Wave 31 note that "a real Agent only ever
exists for a SCHEDULED court NPC … so this branch — and the PLAY_ANIM/FACE branches below it — are provably
home-only". That stopped being true on 2026-08-03, when every revealed court NPC was given a 'court' Agent
(`idle_fidget`, `notice_player`) — the ones at destinations included. `homeGroundY` returns 0 anywhere outside the
homestead's own hills, and the destinations' ground is not at 0.

**Observed** (production build of `main`): a probe read, eight times a second for twenty seconds at each destination
with a court, the height of the highest figure root on each NPC's spot against the intent its Agent held. At The
King's Approach the ground is 15.34 m up under King Leo and John and 15.47 under the Queen. Within those twenty
seconds each of them held a `PLAY_ANIM` intent (an idle fidget), and while it lasted the reading fell to 0 for the
King, to 0 for John (4.52 in one sample) and to between 0 and 0.29 for the Queen — some fifteen metres under the hill.
In the screenshots the King and Queen stand by the throne while idle and are simply gone while fidgeting. Elsewhere:
Richard at the Forge drops from 3.33 to 0, Princess Storm from 15.4, Fenwick at the Old Ruins from 7.94, Wyeth from
13.31; Torvald and Garrick stand on ground that is at 0 anyway, so nothing shows there. No `FACE` intent (turning to
the player as they come close) was caught in those runs; it goes through an identical line.

**Fix** (`components/world/Npc.tsx`): one `groundY(x, z)` rule for the component — the destination's baked terrain
for a resident of a destination, the homestead's for a home NPC — which every branch that places the figure now goes
through: movement, `PLAY_ANIM`, `FACE`, standing, the night walk. Standing gets what it got before; so do movement and
the night walk, which only a home NPC reaches.

**Verified** (production builds of `main` at 07bb8d1 and of the fix): a second probe (`npc_ground2`) follows each
NPC's own figure root frame by frame for fourteen seconds per destination, tagged by the intent its Agent holds (the
first frame after each change of intent is left out: the figure moves a frame later). It puts the player beside the
first NPC, and — a `FACE` lasts a single think tick in the game — also hands each Agent a `FACE` twice a second for
the last five seconds, so that all three kinds are measured: at the destinations, 109 to 475 recorded frames per NPC
and kind on `main`, 61 to 481 on the fix. On `main` the root is at ground height in every idle frame and at 0 in every
`PLAY_ANIM` and `FACE` frame, for all seven NPCs whose ground is not at 0 (Richard's `FACE` readings run from 0 to
3.33: at least one was taken before the figure had moved). On the fix it is at ground height in every frame of all
three kinds: King Leo and John 15.34, the Queen 15.47, Richard 3.33, Princess Storm 15.4, Fenwick 7.94, Wyeth 13.31,
Torvald and Garrick at their 0. Alric and Beda, at home, read 0 under all three kinds on both builds. The screenshot
taken mid-fidget at The King's Approach shows an empty dais on `main` and the King and Queen standing by the throne on
the fix. The same under `next dev` (home and The King's Approach); 0 console errors in every run.

## Bugfix: a dragon went on burning a building its first breath had already ruined — FOUND 2026-10-04 (during CLN-18), FIXED 2026-10-06

**Found by** CLN-18's live siege probe, which records every store call a siege makes: in the black dragon's siege the
line "Stockpile scorched by the black dragon's flame to a smoking ruin! Rebuild it to restore it." came twice for the
same stockpile, one breath apart.

**The bug** (the breath block of `components/world/DragonSiegeController.tsx`; before CLN-18, the same lines in both
dragon files): when nothing is burning, a breath picks a wooden building, damages it and adds it to the burning set —
whether or not that very breath has just reduced it to a ruin. The next breath then scorched the ruin, and only after
that was the piece dropped from the set. What that second breath did depended on the piece, because `damageBuilding`
counts a ruin from its full hit points again (the ruin's own entry is gone):

- *A piece that, whole, has no more hit points than the breath does damage* took the ruin branch a second time: the
  same line, the same crash of bricks, `built` set back to 0. That is the black dragon (18) against any piece of 18 or
  fewer, damaged or not, which is 122 of the catalogue's 142 flammable pieces — stockpiles, workbenches, fences,
  palisades, campfires, beds, barrels, torches and every wooden brick among them; the frailest piece to outlast a
  black breath is the Battering Cart (21). The green dragon (14) never did this: no piece has fewer than 15.
- *A sturdier piece that was already damaged* — hurt in an earlier siege or a raid, low enough for the first breath to
  finish it — was damaged as a ruin: no line, but the sound of a hit, and a hit-point entry written onto the ruin (its
  full points less one breath) that the rebuilt piece then came back with. Either dragon could do this.

**What it cost:** the repeated line; a breath, five or six seconds, spent on a ruin instead of a fresh target;
rebuilding done on the ruin in that time undone (the first case); a piece that came back from its rebuilding already
wounded (the second).

**Observed** (production build of `main` at 3fa0fcf, deterministic frames; three storehouses, a stockpile, a workbench
and a stone tower). *The first case*, the black dragon with the fire kept from spreading: the stockpile is scorched to
a ruin at 3 s and scorched again at 8 s, with the ruin line and the crash both times, and the first storehouse is not
lit until 13 s. In the full 55-second siege the same happens to the workbench at 33 s and 38 s. *The second case*, a
storehouse down to 10 of its 48 hit points: the green dragon ruins it at 3.5 s and at 9.5 s damages the ruin — the
sound of a hit, no line — leaving 34 hit points on record for it; the black dragon does the same at 3 s and 8 s and
leaves 30. The green dragon over undamaged buildings does neither.

**Fix.** The breath — which building it sets alight, what goes on burning, where the fire leaps — moved out of the
siege's frame loop into `game/dragonfire.ts` (`breathe(fire, dragon)`), so that it can be driven and tested without a
renderer, and gained one line: at the start of a breath, whatever is alight but no longer standing is dropped from the
set, before anything is scorched. This entry first proposed not adding such a building to the set at all. It is still
added, because the fireball and the light over a burning building are drawn from its entry in the set, and the breath
that brings a building down at one stroke would otherwise have lost its flare; so the flare plays out as it did, and
the next breath goes to a building that is standing. The same line covers a burning building that something else
brought down, or that the player pulled down, between two breaths — that breath used to be spent on it as well. Not
changed: a building that falls to a later breath than the one that lit it is dropped in that same breath, as before.

*And what the second case left behind:* `constructBuilding` (`game/store/gameStore.ts`) now drops the hit points on
record for a ruin as it clears the `ruin` flag, so a rebuilt ruin is whole — "Rebuild it to restore it", as the ruin
line has always said. On the fixed build no breath leaves any on a ruin; a save made before it can hold the ones the
second case wrote, and those now go when the piece is rebuilt. So does damage a ruin takes while it lies in ruins —
a cannonball, a charge and a ram hit whatever is in reach, a ruin included (siege engines pick standing buildings
only) — which the rebuilt piece used to come back short by. One residue stays: a piece that had already been rebuilt
from such a ruin before the fix keeps its wound, since nothing tells it from honest damage and nothing in the game
repairs a building; it lasts until the piece next falls.

**What changes in play:** a dragon no longer loses a breath for each building it fells at one stroke (the black dragon
against most wooden pieces, either dragon against a badly damaged one), so those breaths now land on buildings that
are standing; the ruin line comes once; a ruin being rebuilt during the siege keeps its progress; no breath leaves hit
points on a ruin; and a ruin, once rebuilt, is whole.

**Verified.** *The move, through the parser* (`dragonfire_static`): with what was renamed put back, the old breath
block (467 tokens) and the body of `breathe` (477) are the same, token for token, except that the store is read at the
top of `breathe` instead of at the top of the frame loop, the new line, an `else` that became an early return, and the
"is it still standing" test, which got a name (`standing`). `flammable` and the three constants are identical, and the
rest of the controller (1,697 tokens: its imports, the declarations that moved and the fire's refs aside) is unchanged
but for two renames. *Unit tests:* `game/dragonfire.test.ts` (11 tests; 162 in total) — what burns, the first breath,
"stone holds" once a siege, a building burning until it falls, the fire leaping (never to stone or a ruin, never to
more than three at once), its reach of 8 m, a roll of exactly 0.18 failing, both cases of the bug, a ruin rebuilt
whole, and a burning building that is gone by the next breath. Of 40 single edits — 36 to `dragonfire.ts`, four to
the lines in `constructBuilding` — the tests catch 39, the removal of either fix among them; the one they let through
(the guard against one building catching twice in a breath) cannot matter while the cap is three. *Live, frame for
frame* (production builds of `main` and of the fix; `cln18_dragon_live` and `kk_det`): five scenarios for each dragon,
each run twice on each build — 40 runs. A build's two runs agree in everything that is compared, up to the frame the
siege ends: the flight path frame for frame, every store call, the siege's lines and sounds and what follows from
them, and the state it leaves behind. Left out is what runs on a clock of its own: owls, wind and the like, which
fall on other frames from run to run, and one payout — the gold of the black dragon's rout completes a challenge that
a four-second wall-clock timer pays a moment after the siege, so the purse is compared as it stood at the end.
Between `main` and the fix the flight path is the same in all ten scenarios, and so is all the rest in the six the
bug does not touch: nothing wooden to burn and a rout, for both dragons, and for the green dragon 23 seconds without
spreading and the full siege.
The other four differ where the bug was, and nowhere else. *Green, the wounded storehouse:* the 9.5 s breath lights
the next storehouse (48 → 34) instead of hitting the ruin, and the ruin has no hit points on record. *Black, without
spreading:* the 8 s breath lights a storehouse instead of scorching the stockpile's ruin, the ruin line comes once,
that storehouse falls at 18 s instead of 23 s, and the next one is alight by the end. *Black, the full siege:*
identical up to 38 s, where `main` scorches the workbench's ruin again and the fix, with nothing wooden left standing,
says "stone holds" (which `main` says a breath later); the same five ruins at the end. *Black, the wounded
storehouse:* the 8 s breath lights the next storehouse instead of hitting the ruin, it takes its second hit at 13 s
and the fire leaps from it; the ruin has no hit points on record. Four of the scenarios under `next dev` are identical
to the fix's production runs; 0 console errors anywhere.

**The probe itself** was made sturdier on the way, because under load it sometimes armed a siege that then came late
or not at all. Its clock now steps 1/64 s, which is exact in binary (the same 55 seconds are 3,519 frames where
CLN-18's entry in `CLEANUP_PLAN.md` counts 3,299 at 1/60). It waits until the homestead's frame loops are running:
everything that drives a siege sits in one Suspense boundary in `GameWorld.tsx`, which reveals only once every model
in it has loaded — 1 to 4 seconds after the game starts in the measurements made for this (one browser or four at
once), but under load it has taken far longer: once, with four browsers, it had still not happened 2,000 frames after
the usual five-second wait, and a siege armed before it cannot roll. And night falls, with the roll held back, before
the measurement starts, so that the siege rolls in the very next frame; it did in all 40 runs.

## Bugfix: the raiders' siege ladder was invisible — FOUND 2026-10-07 (during CLN-19), FIXED 2026-10-08

**Found by** CLN-19's live probe, which looks in the scene for the root of each of the raiders' two props so as to
follow its position and tilt frame by frame: the ram's group holds its model; the ladder's group was empty.

**The bug** (`components/combat/RaiderLadder.tsx`, as it was written when the ladder was added in Wave 58 — #216, whose
verification, by its entry above, measured the ladder's numbers and the raiders' positions and records no look at the
ladder itself): the ladder was drawn with
`<RiggedProp assetId="oc6096-5" height={3.2} />`. `RiggedProp` draws what `lib/propRig.ts`'s `loadRiggedProp` gives it,
and that is `null` for any asset the rig lab has charted no parts for. `public/assets/rigs/part_roles.json` has 221
entries — the ram's `oc4806` among them, and `oc6096-1` to `-4`, `oc6096b3` and `oc6096b4` — and none for `oc6096-5`.
So nothing was drawn, and nothing reported it: a missing rig was not an error to `RiggedProp` — it renders nothing, and
the ladder's own group stayed empty. Everything else about the ladder went on working unseen: it walked in from outside
the wall, planted itself, was climbed, took hits, paid its salvage, tipped over and was cleared.

**Observed** (production build of `main` at fe30e32, deterministic frames): over a run of 1,900 frames the ladder's
record goes through rolling in, planted, three shafts, wrecked and cleared, and in every one from the second (1,899
frames: the roots are first found the frame after the props are set rolling) its group in the scene has no child and no
mesh anywhere below it, while the ram's group holds its rig — one child, 19 meshes — throughout. A Siege Stair the
player places — the same `oc6096-5` — is drawn (seen, on `main` at 80532ef: it stands there with its 8 meshes):
`Buildings.tsx` uses `RiggedProp` only for a piece with an animated rig (`hasAnimatedRig`) and draws the piece's own GLB
otherwise.

**What it cost:** a raid's ladder could not be seen coming, nor seen to be broken, though it could be broken by anyone
who happened to strike the empty air where it stood; and the raiders who climbed it rose from bare ground to the
wall-walk with nothing under them (staged on `main` for this fix, and looked at: one raider hangs in the air before the
wall while the next waits beneath him).

**Fix.** The ladder is drawn from the Siege Stair's own GLB through `PropModel` — the model and the height taken from
the catalogue entry of the piece the player places (`BUILDABLE_BY_ID['oc6096-5']`), so the raiders' ladder is that
piece and stays it. Nothing else in `RaiderLadder.tsx` changed: where it stands, how it walks in, plants and lies
wrecked are the frame loop's as before, and `PropModel` and the rig loader set a model down the same way (upright, to
height, centred, on the ground). The stair's wooden rungs are on its +Z face and the ladder's heading turns its -Z
face to the wall, so the stone frame stands to the wall and the rungs face the raiders coming up to it — as the
heading was written to do, by an author who could not see it. *And so that the next one is seen:* `loadRiggedProp`
now says in the console, in development, which asset will not be drawn and why — no parts chart, an OBJ that did not
load, an OBJ with no mesh in it — once per asset and height (reworded by the next entry: it now says the asset "has no
rig to load"). `AmbientWildlife.tsx`'s header records the same trap from
an earlier wave — a bird that a draft would have drawn through `RiggedProp`, and that would not have shown — caught
then because someone checked live.

**What changes in play:** a raid's ladder can be seen walking in, standing against the wall and lying wrecked, and it
casts a shadow. Nothing new is downloaded for it: the stair's model is one of the buildables the game already warms when
the game screen mounts (`preloadCommonAssets`). Nothing was left in saves: the ladder is not saved.

**Verified.** *By looking* (real GPU, headless; `ladder_look`): a keep with a finished north wall-walk, the ladder
staged where `resetRaiderLadder` plants it. On `main` the wall stands alone in all three poses — planted, walking in,
wrecked — and the ladder's group holds nothing; on the fix the stair is there: its stone frame to the wall, 0.3 m off
the walk's edge, its rungs outward, 2.46 m wide, 3.2 high, 2.0 deep, one child and 8 meshes under its group; tipped
over when wrecked. Two raid bandits set down outside it (`ladder_climb`) climb it one after the other and end on the
walk — as they do on `main`, where the first hangs in the air before the wall. *In a raid of the game's own making*
(`ladder_raid`: an established homestead at dusk, the dice held at 0.2 for the one roll, so that a ram and a ladder
come, and the keep standing where the raiders pass): the game plants the ladder where that arithmetic says, to the
millimetre — 2.5 m outside the wall's socket, facing it — and it is drawn walking in and planted; a bandit makes for
it, climbs it and ends on the wall-walk, and Gilbert and the other bandit follow him up. So it went in a production
build and under `next dev`. *Frame for frame* (`cln19_live`, CLN-19's probe, on deterministic frames): `main` and the
fix are identical over 1,900 frames in everything it records — both props' records, both roots' positions and tilts,
the gate, the purse, experience, the 28 store calls, lines and sounds, both rings — and differ in the one thing it now
also records: under the ladder's root there is nothing on `main` and one child with 8 meshes on the fix, in each of the
1,899 frames it has the root for. *The warning, seen:* with the old way of drawing put back under `next dev`, the
console says, once, `[propRig] "oc6096-5" will not be drawn: the rig lab charted no parts for it
(/assets/rigs/part_roles.json)`; on the fix a session with a raid says nothing of the kind. *Unit tests* (12 new, 218
in total): `RaiderLadder.test.ts` (6) calls the component as a plain function — what it draws and from which model,
its own loading boundary, and its frame loop (hidden out of play, standing where its record says, walking straight for
its base and planting, held by the pause menu, wrecked on the way in, tipping and lying its six seconds);
`propRig.test.ts` (6) runs the loader over a stood-in chart and stood-in file loaders — each of the three ways there
can be no rig is reported in development, by asset and reason, and a production build is silent; a rig that does load
is handed back upright, at the height asked for, each charted part pivoted at its own middle, without a word; and
`hasAnimatedRig` is seen to say nothing about the OBJ. Of 33 single edits to the two files (`ladderfix_mutate`) the
tests catch 33. *Independent review* (two read-only
reviewers, each finding put to a sceptic) confirmed the diagnosis, the placement and the orientation — from the code
and from the pictures — and that nothing else changes. Eight findings stood: this entry was wrong on one point (it
said no buildable used the two charts that have no OBJ; two do — the next entry); a comment in `game/raiderLadder.ts`
still named `RiggedProp`; two of the three warnings, and three points of the walk, had no test; the commit message and
the last entry below were each loose in a phrase; that entry left out two things that can now be seen; and one run had
been recorded by an older version of its probe. All put right, and every run above repeated on the sources as
committed. A recheck found the eight in place and three loose ends more — two test titles that promised more than the
tests asserted, and a sentence of the last entry below — since tied off (the tests now assert what their titles say).
*The same trap elsewhere:* every other asset this code names for `RiggedProp` has both a chart and an OBJ — the ram,
the siege crew's catapult turret, Cedric's catapult and stone-thrower, the merchant's cart and team, the six horses.
A placed piece goes that way whenever `hasAnimatedRig` finds a moving part in its chart — which says nothing of its
OBJ: two charts with a `flag` have no OBJ to load, and both belong to pieces the player can place. Logged below.

**Not changed, and logged below:** two ornaments that are not drawn (since fixed: the next entry), and where the
raiders climb (since fixed: the entry after that).

## Bugfix: two placeable ornaments were not drawn — FOUND AND FIXED 2026-10-08

**Found by** the independent review of the ladder fix above, which checked its claim that no buildable used the two
charts without an OBJ, and found two that do; then confirmed by placing them.

**The bug** (`components/world/Buildings.tsx`, the last branch of `BuildingMesh`): a placed piece is drawn through
`RiggedProp` when `hasAnimatedRig` finds a moving part in the lab's chart for it, and through `PropModel` from its GLB
otherwise. For "Ornament 4×1" (`gen_06_l449500`) and "Ornament 9×1" (`gen_08_l7253400`) — two of the generated decor
pieces — the chart names a `flag`, so they went to `RiggedProp`; but a rig is loaded from the asset's OBJ, and
`public/assets/props/objrig` has no `06_l449500` or `08_l7253400` (neither `.obj` nor `.mtl`). The load failed,
`loadRiggedProp` resolved `null`, and nothing was drawn. Of the 17 charts with a moving part these are the only two
without an OBJ, and nothing else in `src` names either asset.

**Observed** (production build of `main` at 6f79283): five finished pieces set in a row — the two ornaments, and for
comparison a generated castle piece with a rig (`gen_oc6098b3`), a Siege Stair and a catapult. No mesh stands where
either ornament was placed, and the picture shows bare grass there; the other three are drawn (15, 8 and 9 meshes).
The browser reports two requests that failed with a 404 — by the loader's order, the two missing `.mtl` files.

**What it cost:** the player paid for the piece (1 stone, 4 stone) and got nothing to see.

**Fix.** `RiggedProp` takes a `fallback` — what to draw if its asset turns out to have no rig to load — and draws it
once the load has come back empty; not before, since a rig may still be coming. `Buildings.tsx` hands in the piece's
own still model: the very element its other branch draws, so the piece stands exactly where a piece without a chart
would. A chart with no OBJ behind it now gives a piece that stands still, instead of none. What is said in
development was put straight with it. The loader's report was reworded: it now reads `[propRig] "<asset>" has no rig
to load: <why>` — it no longer says the asset "will not be drawn", which is for its caller to know — and where a file
did not load it names both, the MTL being the one asked for first. And `RiggedProp` gained a report of its own, once
per asset: `[RiggedProp] "<asset>" is NOT DRAWN: …`, when the load came back empty and it was handed no fallback (an
explicit `null` is a caller meaning it, and is not reported). *Not changed:* the rig is still asked for first, so one
failed request — its `.mtl` — is still made for each of the two, once a session, when it is in the world; while its
GLB loads an ornament shows nothing, where a piece on the other branch shows a translucent box, because it loads
under the rigged branch's own boundary; and the other users of `RiggedProp` — the ram, the engines, the horses, the
merchant's cart — hand in no fallback: their assets have rigs, and the report is what would say so if one ever did
not.

**What changes in play:** the two ornaments are drawn — a pennant on a short pole and a banner on a tall one. By the
code, not by a run, two things more: they stand still (the cloth the lab charted does not wave, there being no rig to
wave it); and those a player placed while they could not be seen appear, a placed piece being an entry in the save's
list of buildings and what is drawn following from that entry — no save made before the fix was loaded to see it.

**Verified.** *By looking* (real GPU, headless; `ornament_look`, the row above on `main` and on the fix): where `main`
has bare grass the fix has the two ornaments, at their catalogue heights — 3 meshes, 1.40 m wide and 1.68 high; 2
meshes, 3.04 wide and 3.22 high — and the three pieces beside them are drawn as before (15, 8 and 9 meshes, the same
sizes to the centimetre). *Under `next dev`* the same row brings the loader's report for each ornament
(`[propRig] "06_l449500" has no rig to load: its MTL or its OBJ did not load (/assets/props/objrig/06_l449500.mtl,
.obj)`) and no line from `RiggedProp`; a session with none placed brings neither. *A control:* with the fallback not
handed in, under `next dev`, neither ornament is drawn and `RiggedProp` says so for each. *Everything else that is
drawn through `RiggedProp`* was left alone, and CLN-19's frame-by-frame probe (`cln19_live`) finds `main` and the fix
identical over its 1,900 frames, the ram's rig and its 19 meshes included. *Unit tests* (9 new, 227 in total):
`RiggedProp.test.ts` calls the component as a plain function on just enough of React to hold its state — nothing is
drawn until the load is back; a rig that loads is drawn as its own copy, placed as asked, and never the fallback; an
empty load draws the fallback as handed in; handed none, nothing is drawn, said once per asset in development and not
at all in a production build; a mounted one given another asset forgets the empty load at once; and one unmounted
before its load is back sets nothing afterwards. Of 22 edits (`ornamentfix_mutate`), the 20 in `RiggedProp.tsx`
and `lib/propRig.ts` are all caught by the tests. The two in `Buildings.tsx` no unit test reaches: the control above
is for the first (no fallback handed in), and the second — the fallback set at the cell instead of at the piece's
solid mass — changes nothing for these two pieces, whose shift is nought. *Independent review* (two read-only
reviewers, each finding put to a sceptic) confirmed the diagnosis from the data — of the 18 pieces in the catalogue
whose chart has a moving part, these two alone lack the files — and that pieces with a rig are drawn as before.
One finding was a real risk: the flag for "the load came back empty" could outlive a change of asset on a mounted
instance (the player's mount changes horse; every horse has a rig, so nothing could show today) — it is the load's key
now, and tested. The unmount guard and that change of asset had no test. The rest were loose ends of wording, or of
what a claim rested on — in this entry and the one above, the commit message, the mutation harness's note, three
comments and the loader's own message, which named the OBJ where it is the MTL that fails first. All put right, and
every run above repeated on the sources as committed. One more the sceptic held to be no defect — an explicit `null`
handed in draws nothing, unreported — and that is documented on the prop and tested now; and one is only recorded: an
ornament is missing for a frame or so each time it mounts, until the empty load is back — as a piece with a rig is,
until its rig is. A recheck then found the height in that key unguarded by its test, and a count in this summary that
did not add up; the test asserts it now, and the count is gone.

## Bugfix: raiders climbed through the middle of the siege stair, not up its rungs — FOUND 2026-10-07 (while fixing the invisible ladder), FIXED 2026-10-08

**Found by** looking, once the ladder could be seen (the pictures taken for the ladder fix above).

**The bug** (`components/combat/Enemies.tsx`, the `climbing` state): a raider who reached the ladder was put at its
base — `baseX`/`baseZ`, the middle of the prop — and rose there, "up the rungs" by the comment; a second raider waited
his turn on the same spot. But the middle of the Siege Stair is the inside of its stone frame, and the rungs are on
its outer face, a metre from the middle. So a climbing raider stood inside the frame and rose through its two
cross-beams, and the one waiting stood inside him. Written when the ladder could not be seen, and it could not have
been noticed until it could.

**Observed** (production build of `main` at 0bed81b; two raid bandits set down outside a ladder staged against a
keep's north wall; at chosen moments of the first one's climb the game's clock is held — the game stands still
without being paused — a picture is taken, and every raider's place and the height his figure is drawn at are
read): as he takes his place, a third of the way up and two thirds of the way up, the climber is at the ladder's very
middle — no distance out from it at all — and in profile he is inside the stone frame, between the wall and the
rungs. The second raider takes his place 0.8 s after the first, on the same spot, beneath him.

**Fix.** The climb's path — where a raider is so many seconds into his climb — came out of the raiders' frame loop
and into `game/raiderLadder.ts` as `climbPose`, with the stage timings beside it; and it starts from the foot of the
rungs (`ladderFoot`): 1.25 m out from the ladder's middle on the face turned away from the wall — the metre to the
rungs, and a body's half-depth clear of them. There he waits his turn, there he goes up, and from there he is hauled
onto the walk. In `Enemies.tsx` a raider now makes for that spot, takes his place on it, and has his ground taken
there. With the reach set to nought `climbPose` is the old path bit for bit, which is how the move is known to have
changed nothing else: from the same ground, the heights he climbs through and the time each stage takes are as they
were.

**What changes in play:**
- a raider climbs on the rungs, outside the stair and facing the wall, with the next one waiting at their foot;
- where he can be struck moves with him, 1.25 m further out (by the code);
- raiders making for a ladder aim that much further out — 2.55 m outside the wall-walk's edge, where the stair's
  middle is 1.3 m outside it — and it is to within 1.3 m of there, not of the stair's middle, that a raider must now
  get to start a climb (measured: the staged raiders take their places from 2.5 m out, where on `main` they came on
  to 1.3 m out). So water or a shut gate that keeps him further off than that keeps him off the ladder, and the 24 m
  at which a raider notices a ladder is measured from there too (both by the code; no run had water or a gate near a
  ladder);
- the haul over the top covers more ground in its half second: 3.75 m where it covered 2.5 against a wall, and 4.55 m
  where it covered 3.3 against a corner (the corner by the arithmetic and the unit tests: every live run was against
  a wall) — across the whole 2 m depth of the stair, through the top of its frame (against a wall he is between 2.3
  and 3.0 m up as he crosses it, and the stair is 3.2 m tall), where it crossed the half nearer the wall;
- on a slope he starts from the ground under the foot of the rungs, which is where he stands, and not from the
  ground under the stair's middle (measured on a site where the two differ by 0.31 m).

*Not changed:*
- the haul still passes through the wall's parapet (the walk is at 3.6 m, the battlements above it reach 5.28) — the
  abstraction the climb was designed with;
- the ladder is still not a placed building and, by the code, stops no one: nothing that moves the player or a mob
  reads it;
- a raider still walks a straight line to where he will climb, through whatever stands on that line. In the raid the
  probe has the game make — one geometry: the keep sited so that its ladder stands 10 to 20 m from where the raiders
  gather, the player standing inside it — that is the keep's own wall: the road is south of the keep, the one
  wall-walk is on its north side, and all three raiders come at the ladder from behind, across the keep's floor and
  through the wall. On `main` that line ended at the wall's outer face, 1.3 m short of the stair's middle, and the
  raider was put into the stair; now it runs on through the stair's frame to about its middle, 1.3 m short of the
  foot of the rungs, and he is put out at the rungs. A raider who comes from outside, as the two staged ones do, is
  now outside the frame until the haul. Logged below as an open decision;
- the stair is still 3.2 m tall where the walks are at 3.6 m (a wall, a bastion) and 4.2 m (a Corner Turret, which the
  raid may pick), so the raiders step off 0.4 m or 1.0 m above its top;
- a second climber still waits at the same foot and starts as little as 0.6 s behind the first, which is not long
  enough to clear him: the first is then 0.94 m up, and a figure is 1.72 m tall (about 1.1 s would clear). They
  overlap on the rungs as they overlapped inside the frame;
- the game's pause still draws a raider who is being hauled over, or is on the walk, at ground level (measured on
  both builds; logged below, and since fixed: the next entry).

**Verified**, all of it on the sources as merged.

*Unit tests* (8 new, 235 in total; `raiderLadder.test.ts`): with no reach `climbPose` is compared, bit for bit, with
the climb as the frame loop had it written out — three ladders (against a wall's walk, against a corner turret's, and
one at an angle no keep has), three ground heights, 254 moments each from before the wait to after the top: 2,286
comparisons; the foot of the rungs is checked at each of a keep's eight wall and corner sockets, as the game itself
plants a ladder there (`resetRaiderLadder`): on the line from the walk through the ladder, 1.25 m further out; and
with the reach, he waits and climbs at that foot, is hauled from it onto the walk, and his heights and the moment he
is over the top are those of the old climb at every one of those moments. Of 22 edits made one at a time
(`climbfix_mutate`), the tests catch all 19 that are in `raiderLadder.ts`. The other three are in `Enemies.tsx`, which
no unit test reaches; each was run live as a control instead (below).

*By looking and by measure* (real GPU, headless; production builds of `main` and of the fix; `ladder_climb`, the
staging above, from the north-east and in profile, the clock held at five moments of the first raider's climb):

| the first raider | `main`: out from the ladder's middle, drawn height | the fix |
|---|---|---|
| takes his place | 0 m, 0 m | 1.25 m, 0 m |
| a third of the way up the rungs | 0 m, 0.737 m | 1.25 m, 0.737 m |
| two thirds of the way up | 0 m, 1.473 m | 1.25 m, 1.473 m |
| mid-haul, 0.16 s into it | 0.812 m to the wall's side, 2.655 m | 0.031 m, 2.655 m |
| on the walk | 2.5 m to the wall's side (the walk), 3.6 m | the same |

On both builds the second raider takes his place 51 frames (of 1/64 s) after the first, and the first is on the walk
122 frames after taking his — the 1.9 s of the climb; both camera positions give the same numbers. The frame before
he takes his place the first raider stands 1.29 m out from the ladder's middle on `main` and 2.52 m out on the fix,
the second 1.24 m and 2.48 m. In the pictures the climber is inside the stone frame on `main`, and on the wooden
rungs outside it on the fix, the next raider at their foot.

*On a slope* (the same staging on a hillside: the ground under the stair's middle at 4.606 m, under the foot of the
rungs at 4.3 m; both builds): on the fix the raider takes his place, and the next one waits, at 4.3 m — the height
of the ground he stands on; on `main`, at the middle, at 4.606 m, the ground's height there. Both are hauled onto
the same walk, 122 frames after the first takes his place.

*In a raid of the game's own making* (`ladder_raid`, on both builds, the clock held for each picture; the raid, the
raiders and the ladder's planting are the game's, the keep's site and the player's place inside it the probe's): the
two bandits and Gilbert climb one after another — at the stair's middle on `main`, 1.25 m out from it on the fix. The
first of them is drawn at the same heights at the same moments of his climb on both (1.105 m at 0.703 s, 2.655 m
mid-haul, 3.6 m on the walk), and is on the walk 122 frames after taking his place; the record ends with both
bandits on the walk and Gilbert on the rungs.

*Under `next dev`* the staged climb gives the fix's numbers again, on the level and on the slope, and a session with
the ladder staged logs no `[propRig]` or `[RiggedProp]` line and no console error. *Three controls*, each under
`next dev` with one line of `Enemies.tsx` put back wrong: with the frame loop handing `climbPose` a reach of nought,
the staged climb gives `main`'s numbers on the rungs and in the haul (0, 0, 0, then 0.812 m to the wall's side),
though he still takes his place from 2.52 m out; with a raider making for the stair's middle, he climbs at the rungs
all the same but takes his place from 1.29 m out, and the second from inside the frame (0.96 m out, 0.85 m to one
side) 101 frames after the first; with his ground read under the stair's middle, on the slope, he takes his place and
waits at 4.606 m where the ground under him is at 4.3 m — 0.31 m in the air.

*Everything else:* CLN-19's frame-by-frame probe of the ram and the ladder themselves (`cln19_live`) finds `main` and
the fix identical over its 1,900 frames.

*Reviewed* twice by independent read-only reviewers, each checked by a sceptic. The first review confirmed the fix
and faulted its pictures and its write-up: the pictures had been taken with the game paused, which — it turned out —
draws a raider on the ground in the haul and on the walk, so every one was taken again on a held clock; the foot's
arithmetic was written twice and is now written once. The recheck confirmed the code and every number, and asked for
what was still unmarked or not run: that is now marked "by the code" above, or run — the slope, the two further
controls, the pause read for every raider. After it three comments were reworded and one test's ladder turned to
face its wall, and every check above was run again on those sources.

## Bugfix: a raider his frame loop was not placing was drawn at height 0 (paused; dying), and build mode drew a raider on the ladder on the ground — FOUND 2026-10-08 (while fixing the raiders' climb), FIXED 2026-10-09

**Found by** the review of the climb fix above. Its first pictures were taken with the game paused at chosen moments
of a climb, and in them a raider who was mid-haul by the numbers stood on the grass. Looking for what else stands a
raider's frame loop down found a second way to the same sight, build mode; and the review of this fix found a third
by reading, a raider who is dying.

**The bugs** (`components/combat/Enemies.tsx`): two, with one look.

*Not placed by his frame loop.* A raider's group was given its place from two sides. The frame loop sets it every
frame, height and all — the ground under him, the rung he is on, the wall-walk he stands on. And the component's own
JSX said `position={[data.mob.x, 0, data.mob.z]}`: a fresh array on every render, which react-three-fiber applies
again whenever it differs, element by element, from the last render's — height 0, for any raider who had moved since
he was last rendered. While the frame loop places him that never shows: it has the last word before every frame is
drawn. It showed whenever the loop stood down. *Paused:* pausing renders every raider (`GameScreen` reads `paused`
and holds the `<Canvas>`) and stops his frame loop, and the height the JSX had set stayed on the screen until the
game went on. *Dying:* a dying raider is no longer placed while he flies apart, and the coming or going of any other
raider renders every one of them — so, in ordinary play, a raider felled on a hill or a wall-walk could drop to
height 0 for the rest of that second.

*In build mode.* The frame loop does not stop for build mode. It skips what a raider decides — chase, attack, the
climb, and with the climb the branch that owns a climbing raider's place — and goes on to its last lines, which put
a raider on the ground under him unless he stands on a wall-walk. So for as long as the player built, a raider on
the ladder was drawn on the ground: at the foot of the rungs, or, in the haul, inside the stair.

**Observed** (production build of `main` at 05cf55d, beside the fix's; the height of his group read from the scene
before the game is stopped, while it is, and after — the game's clock held for the first and the last, and let run
while the game is stopped; `ladder_climb`, and `pause_look` for the hill):

| the game stopped by | a raider | `main`: before, stopped, after | the fix |
|---|---|---|---|
| the pause | who has just stepped onto a wall-walk | 3.6 m, 0 m, 3.6 m | 3.6 m throughout |
| the pause | in the haul | 2.655 m, 0 m, 2.655 m | 2.655 m throughout |
| the pause | in the haul, on a hillside | 8.077 m, 0 m, 8.077 m | 8.077 m throughout |
| the pause | chasing the player down a hillside, the ground 4.9 m up under him | 4.874 m, 0 m, 4.874 m | 4.874 m throughout |
| the pause | on the rungs, where (by the code) he has stood since he was last rendered | 0.8 m throughout | the same |
| build mode | in the haul | 2.655 m, 0 m, 2.655 m | 2.655 m throughout |
| build mode | on the rungs | 0.26 m, 0 m, 0.26 m | 0.26 m throughout |
| build mode | on the rungs, on a hillside, the ground 4.3 m up under him | 6.524 m, 4.3 m, 6.524 m | 6.524 m throughout |
| build mode | on a wall-walk; waiting his turn at the foot of the rungs | where he was, throughout | the same |

And in ordinary play, neither paused nor building: a bandit felled on that hillside (by the probe, which marks him
dying), and another raider coming while he is dying (the probe's clock held, so that he goes on dying) — on `main`
he is drawn at 4.874 m when felled and at 0 m once the other has come; on the fix at 4.874 m still.

On `main` the paused raider on the hill is inside it, and the one on the walk stands on the ground beneath it. In
every staged run, on both builds, the raider's own place, his climb clock and whether he counts as on the walk are
the same before, during and after, and on the hill his place and what he is doing: it was the drawing only.

**Fix.** *The place:* what is handed to the renderer is one array, made when the raider's figure is mounted and
handed over again, the same one, on every render — so there is nothing to apply a second time, and from the first
frame on the frame loop alone places him; where it stops placing him he stays where it last put him. *Build mode:*
the frame loop's last lines keep a raider who is on the ladder at the height his climb has reached (`poseOnLadder` —
which the climbing branch now draws him by too, so "the ground is taken under the foot of the rungs" is written
once). His climb's clock stands still while the player builds, as it did.

**What changes in play:** those three sights, and nothing a raider does. *Not changed:* raiders still stand still
while the player builds — what they decide is skipped there, though a dying raider still falls apart and one whose
wall-walk is gone still falls; and a figure is still first put at height 0, so one first mounted while the game is
paused — not known to happen, and not looked for — would stand there until it goes on. *Not run or not looked at:*
the terrain of a destination, which by the code did what the hill did and is mended by the same line; a ladder
wrecked, or its wall taken down, while the player builds (the climber would hang at his climb's height until the
player is done, where on `main` he stood on the ground); a figure the renderer takes out of the scene and puts back
(it applies the stored place again when it does: now the one from his mounting, and nothing was found that does
this to a raider); and Fast Refresh or StrictMode under `next dev`.

**Verified**, all of it on the sources as merged.

*Unit tests* (7 new, 242 in total; `Enemies.test.ts`, the raiders' components called as plain functions on a
stand-in for React's refs and state, the stores' hooks read without React, the frame loop run by hand against a
real group placed the way react-three-fiber places one): the place a raider's component hands over is one and the
same array however far he has gone; paused, a raider who has just stepped onto a wall-walk, one in the haul and one
on a hillside are each drawn where the frame loop last put them; a dying raider is not dropped by a render; in build
mode a raider waiting his turn, on the rungs or in the haul keeps the height of his climb and his clock stands
still, and goes on climbing when the player is done, while one on the ground stays on the ground and one on a
wall-walk on the walk. The ground in these tests is a slope, so they also hold `Enemies.tsx` to what the climb fix
could only show live — that a climber's ground is taken under the foot of the rungs, and that he climbs there. Of 14
edits made one at a time (`pausefix_mutate`) the tests catch every one; with the JSX put back as it was five of the
seven fail, with the frame loop's last lines put back, one.

*Live* (real GPU, headless; production builds of `main` and of the fix): the table and the felled bandit above — the
staged climb stopped by the pause and by build mode at chosen moments, on the level and on a hillside, and a bandit
chased down a hillside and paused, or felled. In all seven staged runs (the six of the table and the one sited for
the build camera) the climb itself is the same on both builds at every held moment, the second raider takes his
place 51 frames after the first, and in the two runs that are not stopped before the last moment the first is on the
walk 122 frames after taking his. *In the pictures:* paused on the walk, seen from inside the keep, the raider stands
on the ground under the walk on `main` and on the walk on the fix; paused in the haul, he is on the ground inside the
stair on `main` and at the top of the stair on the fix; paused or felled on the hillside, the hillside is empty on
`main` and he stands on it on the fix; in build mode (the keep sited by the homestead's middle, where the build
camera can look), `main` shows no raider above the wall and the fix shows him in the haul over its battlements. *A
raid of the game's own making* (`ladder_raid`, both builds; each run a raid of its own, not the same one frame for
frame) climbs as before: the first raider at the same heights at the same moments of his climb on both, and on the
walk 122 frames after taking his place.

*Under `next dev`* the fix gives its numbers again in four of the runs (paused on the walk, build mode in the haul,
paused on the hillside, felled on it), and a session with the ladder staged logs no `[propRig]` or `[RiggedProp]`
line and no console error. *Two controls*, under `next dev`: with the JSX put back as it was, the paused raider on
the walk, the paused one on the hillside and the felled one are at 0 m again and build mode is still right; with the
frame loop's last lines put back, both raiders on the ladder are at 0 m in build mode again and the other three are
still right. *Everything else:* CLN-19's frame-by-frame probe of the ram and the ladder themselves (`cln19_live`)
finds `main` and the fix identical over its 1,900 frames.

*Reviewed* by two independent read-only reviewers, each checked by a sceptic. They confirmed both mends against
react-three-fiber's own code, and every number then recorded but the mutation run's, of which there was no record
(it was run again and kept); and they found what is now in this entry: the dying raider, by reading — since
measured, pictured and tested — and wording that claimed more than the records held. After it two comments were
reworded, the seventh test added, and every record above taken again on those sources; a recheck, with a sceptic of
its own, confirmed the result and the numbers as they now stand.

## Open decision: should the keep's walls stop a raider? — logged 2026-10-08 (while fixing the raiders' climb)

The raiders' ladder is their way onto a wall-walk. Nothing keeps a raider from walking through the wall beneath it.

**By the code** (`components/combat/Enemies.tsx`): a raider making for a planted ladder goes in a straight line to
where he will climb. What can turn him aside is the pond, the player's own waterways, a shut gate or a barred door —
"the one building type enemies collide with", by its comment; that loop reads the placed buildings, and the keep's
pieces are not among them — the world's edge, and his own packmates shouldering him. While both places on the
ladder are taken he is not making for it at all, and does what a raider does otherwise. And the ladder goes against
a wall-walk picked at random among the finished ones (`pick(walkwaySockets)`), whichever way the raiders are coming
from.

**Observed** (`ladder_raid` with `KK_NEAR=1`; production builds of `main` at 0bed81b and of the climb fix. One
geometry, and the probe's own: a keep with its north wall alone, sited so that its ladder stands 10 to 20 m from
where the raiders gather on their way in from the road to the south, the player standing inside the keep): all
three — two bandits and Gilbert — reach the ladder from behind. The way each is recorded taking is a straight line
from eight to eleven metres on the wall's side of the ladder, across the keep's floor, through the 8 m wall run
within two and a half metres of its middle, and out to the ladder. On `main` it ended at the wall's outer face,
1.3 m short of the stair's middle, and the raider was put into the stair. Since the climb fix it runs on through the
stair's own frame to about its middle, 1.3 m short of the foot of the rungs, and he is put out at the rungs. Gilbert,
coming up while both places on the ladder were taken, stood striking at something for half a second or so on that
line, inside the wall's own footprint (what he struck at was not recorded), and went on when a place came free.
Either way each then climbs the ladder onto the wall he has just walked through.

**To decide:** whether the keep's walls should stop raiders — a gate battered open or a ladder then being their way
in, which is what the ram and the ladder are for, and what a raider does who finds neither to be decided with it.
And, short of that: whether the ladder should go to a wall-walk on the side the raiders come from, and a raider who
is on the wrong side of it should walk round the stair to its rungs.
