# Knights' Kingdom — Feature Roadmap

A phased plan for growing the game from its current vertical slice (auth → creator → FPS gathering/crafting/quests → aerial building) into a full LEGO castle life-and-combat sandbox. Every feature is grounded in assets that already exist in the extraction (`resources/model_files/extracted/…`) — file references are given inline.

**Current foundation recap:** screen-stack navigation, Node auth + server saves, data-driven items/recipes/quests/buildables, minifig assembly with palette recoloring, FPS controller with interaction system, aerial grid build mode with collision.

---

> **Progress:** Phase 0 animation player ✅ (`lib/minifigRig.ts` — bbox-derived pivots, rest-pose deltas, crossfades) and positional audio ✅ (campfire/forge). Phase 1 third-person view ✅ (V), walk/run/idle clips ✅, FPS viewmodel with contextual tools ✅, emote wheel ✅ (G), animated NPC greet ✅. Phase 2 ✅: day/night cycle (sun arc, moon, stars, sky tint, HUD clock, day-length option), rain + lightning weather with rain-boosted fishing, torch & bed buildables (sleep to dawn), wildlife (wandering horses, day falcon, night bats), night-aware ambience. Phase 8 core ✅: gold currency, a traveling merchant with cart who keeps daylight hours (sell surplus / buy stock through a two-column shop panel, minimap diamond), and 12 achievements ("Deeds") with notifications and a gallery in the Abilities panel, persisted in the save. Farming ✅: farm-plot buildable with tilled/growing/ripe visual stages, plant → timed growth → harvest loop (Farming skill + deed), bread baked from wheat at the campfire, and edible food (fish, cooked fish, bread) eaten from the satchel to restore hearts; wheat and bread trade at the merchant. Equipment visuals ✅: owned sword and shield render on the third-person avatar's rig (portaled onto the arm joints), and blocking raises a full shield in first person. Taming remains open. Phase 6 core ✅: four NPC quest-givers (King Leo, Queen Leonora, Richard the Strong, John of Mayne) with original voice greetings, portraits, a parchment dialogue panel, and repeatable side errands (gather/craft/build/kill) with XP + item rewards, tracked in the save. Villager recruitment ✅: villagers wander in once the homestead has enough beds and total structures (scaling requirement per arrival, up to 6), each assignable to a job (Lumberjack/Miner/Farmer) from a roster panel (N) that delivers resources on a timer while they wander the grounds — all state persisted in the save. Knight/Paladin ceremonies ✅: crossing into either rank (skill-level threshold + its milestone quest, as before) now triggers a scripted moment instead of just a notification — movement freezes, the player is teleported before King Leo and the camera swings to third person, he plays his sword-drawing and congratulate gestures (`anim_r_gesturepullsword` / `anim_r_congratulate`) while the player answers with the regal wave emote, under a gold-lettered ceremony banner; ends with the same capstone rank notification as any other promotion. Reputation & titles ✅: Queen Leonora, Richard the Strong and John of Mayne (the three NPCs with repeatable errands) each track a standing score, raised by turning in their errands (and, for Richard, jousting); crossing a threshold pays a small gold bonus and swaps their dialogue-panel subtitle to a personal title (with a "N / M to become …" progress line), independent of the global Peasant→Paladin rank. King Leo's relationship with the player is already the main quest line and rank, so he doesn't get a separate standing track. Phase 7 partial ✅: walkable structures — step-up climbing (≤0.55m), standing on wall/brick tops, falling off edges, walking under overhead pieces (brick staircases onto battlements work). Castle interiors ✅: the Grand Keep's great hall is a permanent sealed room (teleport in/out, no walk-in door) furnished with original models — throne, mirrored crest banners, a banquet table with goblets, and the treasure chest extracted from the oc6095b3 jousting-set model, which pays a one-time gold reward and its own Deed. Gatehouse ✅: a toggleable gate buildable combining the original portcullis lattice model (`06_l318500`, sliding into its housing on a winch sound) with a ground-hinged wooden drawbridge (the one deliberately procedural piece — no standalone drawbridge model exists in the extraction) that swings between sealed-vertical and flat-on-the-ground, blocking both the player and raiders while shut. Template worlds ✅: a signpost near spawn opens a map of all nine original 2000-game template dioramas (merged bakes of their real placed geometry, not recreations), each with a name and blurb grounded in what the scene actually depicts (a river dock, a tourney field, a rival castle, a snowy pass…); traveling teleports you there — an independent circular collision bound, its own terrain-following (a raycast against the bake, since these hillside scenes vary far more in height than the home world), and a fill light standing in for a matching sun/shadow setup — for a one-time thematic reward (mining bonus in the exposed-rock scenes, coin and salvage elsewhere), with a standing "Return Home" prompt back. Dialogue trees ✅: King Leo, Queen Leonora and Richard the Strong each open on first meeting with a short one-time voiced sequence — genuine lines of theirs drawn from the original game's 371-line challenge/tutorial voice-over bank (not paraphrased — text matches the audio verbatim), stepped through with Continue or bypassed with Skip, after which they settle into their regular random flavor line and errand offer for every visit after (tracked per save). John of Mayne has no first-person lines in that bank, so he keeps his existing flavor-line-only dialogue rather than borrowing someone else's voice. Phase 5 core ✅: mountable wild horses (E to ride, Shift gallop with stamina drain, canter loop from the original sound bank, seated rider in third person, dismount anywhere), quintain training dummy (spins on hit, double Combat XP while mounted), working cannon buildable (fires ballistic stone rounds with splash damage vs raiders, 1 stone per shot). Jousting ✅: gallop up to Richard and hold E to couch the lance — a distance-based "timing" skill check (a real lance's reach is a narrow sweet spot, ~2.2m) scores a miss/glancing/solid/perfect hit, each paying more gold, Combat XP and reputation with him, Richard staggering realistically on a landed hit (`anim_g_fallbackward`), gated by a short recovery between passes. Carts & pushable ram ✅: the existing Battering Cart buildable is now a pushable physics prop (stand near it, E to grab, walk it around glued in front of you) that splinters open shut gates or damages any other structure it's shoved into; the Blade Cart can instead be hitched to trail behind the player for easy relocation. Both commit their final position back into the save only once let go, so dragging one around doesn't spam the store every frame. Phase 4 core ✅: hearts/stamina vitals with hurt vignette, LMB melee (sword ×3 damage) with viewmodel swing + knockback, RMB shield block (75% reduction, stamina cost), night skeletons that crumble at dawn, dusk bandit raids with loot rewards, LEGO pop-apart deaths (rig joints scatter), Combat skill + XP, knock-out respawn at camp. Ranged ✅: craftable crossbow + bolt ammo (workbench, Smithing), Q swaps weapons, LMB fires real projectiles with drop and per-segment hit tests, RMB aims with FOV zoom, HUD ammo readout, original crossbow fire sound. Longbow ✅: a second ranged weapon (workbench, wood only, no forge) with its own hold-to-draw mechanic — release too early and it doesn't loose at all, full draw (~1.1s) doubles its damage and range over a snap shot; Q now cycles melee → crossbow → longbow. Building damage ✅: cannon splash no longer spares your own structures — anything caught in the blast takes real HP damage (scaled off its own resource cost) and collapses to a partial-materials rubble refund at 0, the same groundwork the battering ram (Phase 5) now uses too. Phase 3 core ✅: tabbed build menu with search over 67 pieces (54 generated brick/decor/castle pieces at true LEGO proportions from the extraction metadata, original thumbnails), vertical stacking with 3D collision + support resolution, per-piece snap (2m structures / 0.35m stud pitch), move tool (click to pick up), undo (U). Blueprints, row-fill walls and functional doors remain open. Entity registry, collider y-extents and the asset manifest remain open. Character creator rework ✅: face and torso-crest textures are extracted per named donor (`scripts/prepare-assets.mjs`'s `texForObject`) and presented as a gender-first picker — pick Male/Female, then a labeled thumbnail grid for face and body type (`CharacterCreator.tsx`, `data/minifigs.ts`) — replacing the old flat named-character list; royal donors (King Leo, Queen Leonora) stay available as cosmetic options like any other since looks never grant rank (unlockable crests are a separate, tracked idea — see Phase 8). World start rework ✅: the royal court no longer greets you on day one — King Leo, Queen Leonora, Richard the Strong and John of Mayne each stay hidden until their existing gating quest completes (`data/npcs.ts`'s `revealAfterQuest` / `isNpcRevealed`, checked at both render and interaction-targeting layers), and the opening world instead has two always-present generic villagers (a farmer and a miller), relocated to a quiet corner with their own hut props (`StarterVillage.tsx`) well outside the homestead build region, so it reads as a small farm/village first, not an empty stage waiting for royalty. World-scale pass ✅: template worlds were undershooting their own documented scale target by ~5.4× (`TEMPLATE_WORLD_SCALE` 0.06→0.32, destination `radius`es scaled to match) — visiting one no longer feels like walking a dollhouse with a toy-sized castle; the home world itself also doubled (`WORLD_HALF` 100→200, with `DayNight`'s fog/shadow-frustum widened to match) for more room to build and explore. Build-menu expansion ✅: five previously-uncopied workshop folders (arches, cylindrical, slim, tiles, wedge — 79 real pieces) are now wired into the generated catalog, castle_components got its own real "Walls" category instead of being dumped in the generic castle-pieces bucket alongside towers/roofs, and the aerial build ghost preview now actually rotates with the real piece (R previously only swapped which of its two bounding-box dimensions the ghost used, so a rotated-but-square-footprint piece's ghost never visibly turned even though the placed piece did). Misc fixes ✅: the mounted-horse viewmodel used to always render one hardcoded model regardless of which wandering horse (white or brown) was actually mounted — `HorseMob` now carries its own model url through to `RideHorse.tsx`. NPC dialogue no longer plays two barks at once (the generic `greetSound` and a first-meeting voiced lore line) — `DialoguePanel.tsx` now picks exactly one. The Keep's lion crest banners were upside down (one asset's baked artwork didn't share the rest of the catalog's up-axis convention) and two of the banquet table's three goblets sat off the tabletop's actual bounds — both fixed. Fishing got a real dock (`FISHING_DOCK` in `data/world.ts`, rendered in `ResourceNodes.tsx`) extending from the old shore-side sign out over the water, with a matching pond-collision corridor exception so the player can actually walk out onto it. Combat/rig fixes ✅: enemies and recruited villagers were walking backwards — both `Enemies.tsx` and `Villagers.tsx` recovered facing from a movement vector with the wrong sign (`atan2(dx,dz)` instead of this codebase's `atan2(-dx,-dz)` convention). The third-person avatar never played the melee swing clip at all (it only checked the gathering-swing flag, never `combatState.attackAt`) — fixed in `PlayerAvatar.tsx`. The FPS sword rendered at a visibly wrong angle because `weaponParts.ts` picked a weapon's "long axis" by comparing raw bounding-box extents per X/Y/Z axis — King Leo's sword is baked ~45° off any single axis in its donor pose, so this could never align it; replaced with a true PCA long-axis (same power-iteration approach `minifigRig.ts`'s `rehangArm` already uses). King Leo's own shield mold (`022_shape10` — a real two-material lion-crest panel, previously undiscovered) now renders in place of the procedural placeholder shield, in both `Equipment.tsx` (third person) and `Viewmodel.tsx` (first person blocking). Villager NPCs built from unnamed-donor bodies (Alric, Beda) had their weapon prop's oversized geometry dominating `classifyBySpace`'s PCA arm-rehang fit, swinging the whole limb to a nonsensical pose — outsized limb-band shapes now route to the body joint instead. World-scale pass ✅ (see above) doubled `WORLD_HALF` and corrected `TEMPLATE_WORLD_SCALE`. Build-menu piece catalog ✅ (see above) added five new piece folders and a real Walls category. Misc ✅ (see above): horse-color-on-mount, NPC dialogue double-audio, Keep banner/goblet fixes, the fishing dock. Asset pipeline ✅: every extracted piece/prop/portrait thumbnail is rendered against a pure-green screen with no alpha channel — `scripts/prepare-assets.mjs` now chroma-keys all of them (green→transparent, with a despill pass so keyed edges don't keep a green fringe) as part of the regular asset copy, fixing a green box behind every build-menu icon and NPC portrait. Phase 11 content wave ✅: Gilbert the Bad and Weezil now have their own real voice barks (`greeting_gilbert`/`random_gilbert`, `greeting_weezil`/`random_weezil`) and Gilbert leads every dusk raid as a distinct, halberd-carrying `EnemyKind` instead of the raiding party being three anonymous Weezil clones. Cedric the Bull's Forest Camp (`CedricCamp.tsx`) is a discoverable, quest-gated location with Gilbert and Weezil as respawning camp guards and Cedric himself as a real capstone boss fight (45 HP, his own "Challenge Cedric the Bull" interact prompt) — defeating him grants a one-time reward, the "Behind Bars" Deed, and swaps his idle camp figure for a jailed one behind the same portcullis-lattice prop used for gates. Princess Storm's Battle Dome (`BattleDome.tsx`) is a dedicated small arena, distinct from Richard's jousting field, where talking to her (a real NpcDef with her own reputation track) offers a duel-to-first-hit minigame — resolved the instant either side lands a blow (`combat.ts`'s `resolveDuel`, no pop-apart death since she's recurring), with rematch difficulty scaling from her reputation rather than added HP. The Chronicle ✅ (Phase 16): a new panel (L) collects every one-time voiced NPC introduction unlocked so far, shown verbatim and replayable on demand — reuses the existing `loreSeen` save field entirely, no new save schema. Equipment paperdoll ✅ (Phase 8): the Satchel (I) is now "Equipment & Satchel" — a rotatable, drag-to-orbit preview of the player's own equipped character (`RotatablePreview.tsx`) with a real Weapon slot (Sword/Crossbow/Longbow, click to equip — writes straight into `combatState`, live immediately) and a Shield status slot, the existing food-eating grid unchanged below it. The character creator's preview now shares the same rotatable component, with a Standing/Running pose toggle replacing the old auto-rotate-only spin. Phase 12 — Deeper systems ✅: fishing is now a genuine cast → wait → react bite minigame (`game/fishing.ts`, `FishingMeter.tsx`) instead of a rain-boosted hold shortcut. Armor slots — Iron Helm (Cedric the Bull's own horned helm mold, previously undiscovered) and an Iron Chestplate — reduce damage passively and show as real paperdoll slots. Wild herb patches (a new resource-node kind, the real wildflowers prop) feed a small alchemy branch at the campfire: a Healing Draught, a Stamina Draught and a Night-Vision Brew (temporarily brightens night ambient light). The axe/pickaxe/fishing-rod/sword wear slowly with use and, once worn, work slower or softer rather than breaking — repairable at the workbench for a fraction of their cost. And each rank-up now offers a real choice among five permanent perks (Iron Grip/Green Thumb/Steady Hands/Quick Study/Ironclad) — only 4 rank-ups exist against 5 perks, so no playthrough takes them all. Phase 14 — Raids & sieges 2.0 ✅: raids now spawn with a 40% chance of their own AI-driven battering ram (`game/raiderRam.ts`, reusing `siege.ts`'s `ramCheck`) aimed at your gate, and a 35% chance Cedric himself leads the raid in person (a real boss-strength `EnemyKind`, not another anonymous bandit) until he's defeated for good. Standing on a wall/tower top now measurably boosts ranged damage (crossbow +1, longbow +25%, with a HUD readout), and every recruited villager flees toward the homestead's center the instant a raid begins instead of wandering obliviously through it. Playtesting fixes ✅: fixed a real fall-through-the-map bug — `sampleTemplateGroundY`'s raycast-miss fallback (`TemplateWorld.tsx`) hardcoded a drop to world-origin sea level (`y=0`) whenever its downward raycast missed the mesh (easy to trigger by sprinting past the edge of a template bake's actual geometry, since the circular wander-radius clamp doesn't perfectly match each irregular hillside's real footprint) — it now holds the last known good ground height instead, reset whenever a fresh destination mounts. On-foot sprinting now spends stamina the same way a sword swing or mounted gallop already does (`combatState.sprinting`, gated the same way `galloping` already is), instead of being a free speed boost. The mounted rider's seat was sunk down from a standing rest-pose height so the hips land nearer saddle height instead of the whole figure standing above it (`RideHorse.tsx`) — no dedicated seated animation clip exists in the extraction to properly bend the legs around the horse's barrel, so this is a best-effort visual adjustment, not a perfect one. Phase 16 — QoL, accessibility & polish ✅: keybind remapping (`data/keybinds.ts`'s named-action table + `DEFAULT_KEYBINDS`, a press-to-set rebind UI in Options with per-action Reset to Default, persisted in Settings) — every gameplay key check in `PlayerController.tsx`/`GameScreen.tsx` now reads through the current bindings instead of a hardcoded `KeyboardEvent.code`. A dedicated Stats page (`StatsStack.tsx`, reachable from the pause menu) tracks lifetime playtime, distance traveled, resources gathered, enemies defeated and buildings placed — event-driven counters (`addItems`/`recordKill`/`placeBuilding`) plus a lightweight `statsAccum` module that batches the two continuous ones (distance, playtime) into the store every ~4s instead of every frame. Photo mode (P): a free-fly, collision-free camera mode with the entire HUD hidden bar a small "P to exit" hint. Settings expansion: three graphics-quality presets (mapped to renderer `dpr` + a shadows toggle) and a colorblind-friendly minimap palette (swaps the tree/herb green pair and gives raid enemies a distinct vermillion square marker instead of a red dot). Gamepad support: a standard-mapping controller's left stick/D-pad and right stick drive the same movement/look the keyboard does, with A/X/RB mapped to jump/interact/sprint — merged with keyboard input via a small `isDown()` OR-check (a separate `pad` record avoids the classic "stick returns to neutral and stomps a still-held keyboard key" bug). A new-player How to Play guide (`HelpStack.tsx`, real in-game screenshots in `public/help/`, reachable from the Main Menu and via H in-game) walks through character creation, controls, gathering, crafting, quests, building and combat readiness. Phase 9 partial ✅: forest trees and herb patches now render as instanced copies of one normalized GLB per model (`InstancedProps.tsx`, drei `<Instances>`) instead of each node paying its own `useGLTF`+`clone(true)` cost — verified pixel-identical to the old per-node rendering, including live shrink-as-chopped scaling. Real geometry LOD turned out to be blocked on the asset pipeline, not the renderer — the D1/D2/D3 low-poly shape variants the roadmap assumed were "already shipped" only exist in the raw extraction metadata, not in any exported `.glb` — so it stays open, correctly scoped to a future pipeline task rather than a three.js task. Rocks/iron veins (plain procedural geometry, never actually load/clone-costly) were deliberately left un-instanced. Phase 13 — Kingdom & economy ✅: a Market Stall buildable + a new Merchant villager job turn the traveling-merchant-only economy into an always-open (once staffed) second trade point, still reusing the exact same `ShopPanel` ledger. A real blueprint system (`data/blueprints.ts`, a new Blueprints tab in the aerial Build Bar) lets you capture a cluster of your own placed buildings as a named, re-stampable template with a live per-piece validity ghost — the roadmap's original idea of shipping starter blueprints *ported from the nine template worlds' actual placement data* turned out not to be feasible (cross-checked every one of their ~1,300 placements against this game's buildable catalog and found zero id overlap at all), so the two shipped starter blueprints are hand-authored from this game's own pieces instead, clearly documented as such. Claiming a template world (a HUD banner, not folded into the existing hold-E "return home" flow to avoid regressing it) unlocks a small leveled building plot there — the aerial build region, ground height and camera all generalize to work at a claimed destination exactly as they do at home. A Collect Taxes action at the Keep's throne (gated on the Keep + villagers, a 5-minute cooldown) gives the Paladin endgame a small ongoing income loop. Phase 15 — World life & atmosphere ✅: court NPCs and recruited villagers now keep a simple day/night schedule — a plain position lerp/seek toward a shared night-gathering spot outside the Keep (NPCs) or the nearest bed (villagers) at dusk, back at dawn, reusing the exact seek-and-idle technique the raid-flee behavior already established rather than needing real pathfinding. A four-season cycle (`worldEnv.dayCount`/`seasonOf()`, ~3 in-game days each) tints grass and trees, slows winter crop growth, and widens the night window in winter; a new independent mist weather state joins the existing rain (which itself reskins as snow in winter) for a proper low-visibility weather option, both sharing one spell-timer state machine in `Weather.tsx`. Phase 17 — Procedural dungeons ✅ v1: The Sealed Crypt (`game/dungeon.ts`, `DungeonScene.tsx`), gated behind Knight's Arms via a new section in the Travel Map, generates a fresh 5-7 room chain every descent — real stonewall corridors with actual AABB wall collision (not just template-worlds' simple circular bound), a defeat-all objective per chamber, and a gold/materials payout scaled by room count on a full clear. Piggybacks on the existing destination/travel system rather than a parallel one; enemies are just ordinary `useEnemyStore` entries, rendered automatically regardless of location exactly like Phase 13's buildings were. Branching layouts, more objective types, and reusing Cedric/Storm/cosmetic-unlock loot are explicitly deferred, not silently dropped. Caught and fixed a real pre-existing latent bug along the way: a knockout only ever moved the player's position home, never cleared `st.destination` — harmless until the Crypt became the first destination with enemies actually capable of knocking the player out away from home. Textured water ✅: the pond (`Terrain.tsx`) now renders the real `spr199` caustic-ripple sprite (tinted, UV-animated, copied in via `scripts/prepare-assets.mjs`) instead of a flat solid-color circle — the matching waterfall strip (`spr203`) is copied alongside it for a future streams/rivers pass, not yet wired to anything.

## Phase 0 — Engine foundations (unblocks everything below)

Small infrastructure investments that later phases depend on.

| Item | Approach |
|---|---|
| **Animation player for the original SMO tracks** | The extraction has 100+ animation files (`extracted/animations/anim_*.json`) with per-part keyframes (`head`, `arm lt/rt`, `leg`, `hips` tracks, pos in mm + rot in degrees). Build `lib/minifigAnimator.ts`: map track names → the part groups the assembler already classifies, sample keyframes at a framerate, lerp between frames. This single system powers walking NPCs, combat swings, horse gaits and emotes. |
| **Entity registry** | Generalize resource nodes/NPCs/buildings into one `WorldEntity` list (id, kind, transform, collider, interactions[]). The interaction scan, collision loop and save format all read from it. New content becomes data + a renderer component. |
| **Collider unification** | One `physics.ts` with circle/AABB/heightmap queries used by player, NPCs, mounts and build validation (today player and build validation each own a copy). Add vertical dimension (colliders get `y0/y1`) — prerequisite for climbing and standing on buildings. |
| **Asset manifest loader** | Generate `public/assets/manifest.json` from the extraction (`model_catalog.json` already has ids/categories/bboxes). Components request models by id + category instead of hardcoded paths. Lets the build menu and world spawner enumerate everything. |
| **Positional audio** | Swap the flat `AudioManager` to `THREE.PositionalAudio` wrappers: campfire crackle, forge, pond, portcullis get 3D falloff. All sounds exist (`snd059` flame, `snd020` drawbridge, `snd066` portcullis…). |

---

## Phase 1 — Character presence: third person, tools in hand, animation

- **Third-person view (V to toggle).** Render the player's own assembled minifig (the creator config is already in the store), orbit-follow camera with shoulder offset and collision-aware zoom. FPS stays default; third person shines for riding and building.
- **Walk/run animation** driven by Phase 0 animator: `anim_c_walk.json` / `anim_c_run.json` on the player + NPCs; blend by speed.
- **FPS viewmodel arms.** Right-hand minifig arm + current tool rendered in a camera-attached group (classic FPS viewmodel): axe when chopping, pickaxe, fishing rod, sword. Tool models: build simple LEGO-style tools from brick prims, or extract the accessory parts (King Leo's sword is a named object in his OBJ; halberd/spear/crossbow appear in guard minifig variants `minifiggilbertbad01-03`, `minifigrichardstrong02-03`).
- **Tool-specific interaction animations**: swing arc on chop (`anim_g_swordswish` timing), cast + bobber splash on fishing with a wait-then-react minigame (press E on the bite — adds skill).
- **Emote wheel** (G): wave, think, pleased, angry — direct plays of `anim_c_*` / `anim_r_*` (regal wave!) with the original minifig chatter sounds (`snd0xx Greeting/Random` per character).

## Phase 2 — Dynamic world: day/night, weather, life

- **Day/night cycle** (~20 min real time, configurable in Options). Sun directional light follows an arc; ambient color/intensity lerp through dawn/noon/dusk/night keyframes; fog color follows. Night swaps the ambience set (birds → owl `snd090`, wind); stars via point sprites; moon light at low intensity.
- **Light sources matter at night**: campfires, forge, torches (new cheap buildable: `castle_accessories` torch models) get bigger relative presence; building at night without torches is dim — a natural reason to craft them.
- **Sleep to skip night** at a bed buildable (advance clock, autosave — "cozy" fantasy).
- **Weather**: rain system (particle streaks + `snd006` rain loop + darker ambient), occasional storms with `snd089` lightning. Fishing bite rate up in rain (nice systemic touch).
- **Wildlife**: falcon circling (`snd054`), bats at night from `l3010301` bat-flock model (`snd055/056`), grazing horses in a meadow (`anim_horsegraze`, `snd077`) — pettable, and Phase 5's mount source.
- **Seasons (stretch)**: tint grass/trees, longer nights in "winter".

## Phase 3 — Build system 2.0: the robust build menu

- **Categorized build menu** replacing the single bar: tabbed drawer (Foundations / Walls / Towers & Gates / Windows & Doors / Furniture & Decor / Workshop Bricks / Siege), fed by the asset manifest. The extraction has **141 workshop bricks** + arches, tiles, slim, wedge, cylindrical categories — expose them all as free-form decorative pieces with per-category pricing. Original thumbnail PNGs already exist for every piece.
- **Search + favorites + recently used** row; costs and lock state shown as today.
- **Vertical building**: pieces stack — placement raycasts against existing structure tops, ghost shows target elevation, support rule (must rest on ground or ≥60% supported area). This turns walls + floors into multi-storey castles.
- **Stud snapping**: within a placement, snap to a 0.8m sub-grid (LEGO stud pitch at our scale) for bricks, while big structures keep the 2m grid. Rotate in 90° steps (R), fine-rotate decor in 15° (Shift+R).
- **Blueprint mode**: save a selection of placed pieces as a named blueprint (JSON in the save), stamp it elsewhere if you can afford the total cost. Ship starter blueprints of the original models — `template_placements.generated.json` in the model_pipeline already encodes the six original world templates.
- **Move & undo**: pick-up tool (grab a placed piece and re-ghost it), 20-step undo stack of place/remove ops.
- **Structural gameplay hooks**: doors/gates are interactable (open/close with `snd026/027`, portcullis `snd066` + winding sound), windows see-through, walls define an enclosed-area detector → "Your homestead is now a fort!" buffs (rest bonus, raid defense in Phase 6).
- **Aerial QoL**: middle-mouse drag pan, Q/E rotate the aerial camera 90°, hold-Shift row-fill placement for walls (drag a line of wall segments), demolish-area tool.
- **Custom-build menu (freeform placement, in-theme)**: a second placement mode alongside the grid-snapped build system that lets the player position, rotate and scale pieces freely (not locked to the 2m/stud grid) for expressive builds — explicitly **using the existing extracted LEGO piece library only** (the same catalog the regular build menu already draws from), not an arbitrary user-uploaded-model importer, so everything placed still reads as Knights' Kingdom LEGO rather than breaking the game's visual identity.

## Phase 4 — Combat core: LEGO knight fighting

- **Health & stamina** (hearts UI, LEGO-friendly: no blood — minifigs pop apart). Stamina gates sprint/swings/blocks.
- **Melee**: sword swing combo on LMB using `anim_g_swordswish(withshield)` timings, block/parry on RMB with shield (crafted in the existing Knight's Arms quest — now it matters!). Halberd sweep (`anim_g_halberdswipe`) and spear thrust/throw (`anim_g_spearstrike/spearthrow`) as later weapons.
- **Ranged**: crossbow and longbow (`anim_g_crossbowshot`, `anim_g_longbowshot`, fire sounds `snd018/008`) with simple projectile arcs; bolts/arrows crafted at workbench (wood + iron). Aim-down-sights narrows FOV.
- **Enemies**: skeleton scouts at night (`minifigskeleton00`, rattle `snd049`), Weezil's bandits (`minifigweezil00/01`, `minifiggilbertbad0x` variants carry visible weapons), later Cedric the Bull's raiders (war cry `snd053`). Simple AI: patrol → aggro radius → approach → telegraphed attack; flee at low health.
- **LEGO death/knockdown**: on defeat, minifig breaks into its parts which pop and scatter (we already have per-part meshes — apply impulses), reassemble on respawn. Player knockdown uses `anim_g_fallbackward` + respawn at bed/campfire.
- **Raid events**: at intervals (and scaling with your castle value), a bandit party attacks the homestead at dusk — gates, walls and towers become functional defense. Repel them for loot + Building XP. Horn `snd091` announces it.
- **Combat skill** added to the skill/rank system; sword/shield/armor tiers (iron → forged → castle-crested using torso decal variants).

## Phase 5 — Mounts, carts & siege machinery

- **Horse riding**: mount a horse (E), third-person auto-switches. The extraction has an entire horse family: bare/armored/jousting variants (`l7339200…l7339232`), riders (`minifigcedricbull02`, `minifigrichardstrong01` are mounted models), gait animations (`anim_horsewalk/trot/gallop`) and sounds (`snd052` canter, `snd076` whinny, `snd081` walk). Speed tiers walk/trot/gallop on Shift, stamina-limited gallop.
- **Jousting minigame** at a built tiltyard (`anim_horseriderjoust`, thud `snd051`): timing-based lance hit vs. Richard the Strong for rank prestige and prizes.
- **Carts & haulage**: hitch a cart (`oc4806/oc4807` + wheel sounds `snd058/061/083`) to move bulk resources — carrying capacity becomes a real constraint that carts solve.
- **Siege equipment (pushable physics objects)**: battering ram (`snd084`), catapult/trebuchet (`snd060` firing), cannon (`c3_cannon`, `oc6096b4`, fire `snd022`, explosion `snd021`). Push-to-move (stand behind + hold E, slow heavy movement), aim + fire with projectile physics that can *break placed structures into parts* (they refund as rubble to rebuild). Used in raids (enemies bring a ram) and in Phase 6 story sieges.
- **The dragon**: late-game set piece — `l7517400/1` dragon models with `anim_dragonflight/breathfire/run/walk`. First a scripted flyover omen, later a defend-the-keep event with fire that ignites wooden structures (palisades burn — stone matters, `anim_g_burnt` for singed minifigs).

## Phase 6 — NPCs, dialogue & a living quest economy

- **Quest-giver NPCs with schedules**: King Leo (main line), Queen Leonora (homestead/decor quests — "furnish the great hall"), Richard the Strong (combat/jousting trainer), John of Mayne (gathering/economy), Princess Storm (exploration), Gilbert the Bad & Weezil (antagonists), generic villagers (`minifiggenericgood00`). All models + per-character greeting/random voice lines already extracted (`snd030-048`); the original **371 challenge voice-over WAVs** (`extracted/pak/system/challenges/sounds/`) provide narrative barks.
- **Dialogue UI**: parchment dialogue box, choices, voice bark on open (per-character `Greeting`), quest accept/turn-in. Written as data (`data/dialogues.ts`).
- **Quest system v2**: side quests alongside the main chain — repeatable dailies ("the kitchen needs 5 fish"), delivery quests (haul goods by cart to a village across the map), kill/defend quests, timed build challenges recreating the original game's six challenges (their texts survive in `extracted/pak/system/challenges/texts/`!).
- **Villager recruitment**: completed homestead milestones attract villagers; assign them to auto-gather at low rates (idle-game layer), house them (beds required), defend them in raids.
- **Reputation & titles** per NPC faction feeding the rank system; Knight/Paladin ceremonies become actual scripted scenes at the keep (regal animations `anim_r_*` exist for exactly this).

## Phase 7 — Castle life & verticality

- **Walkable structures**: extend the collider system with walkable tops — stand on walls, towers and the keep. Stairs/ladder buildables provide legit ascent; battlements give archery bonuses during raids. (Collider `y0/y1` from Phase 0 + a "ground height at (x,z)" query.)
- **Castle interiors**: door → interior cell for the keep (furniture buildables: throne, tables, banners from `castle_accessories`), light shafts, treasure room (`snd068/069` chest open/close) for valuables storage.
- **Gatehouse mechanics**: working drawbridge (`snd020`) and portcullis (`snd066` + `snd082` winding) — open/close from a wheel, matters in raids.
- **The original worlds as destinations**: the nine template worlds (`extracted/pak/warehouse/worlds/templates` + `template_playareas.generated.json`) become visitable locations — travel by horse/cart to a village, ruins to loot (mining bonus), a rival castle to (eventually) besiege.
- **Template-09 ("The Far Meadow") as the actual starting/base map (major migration, deferred deliberately)**: it's a genuinely empty, flat bake (0 object placements vs. 37–272 for the other eight templates) and reads well at human scale once `TEMPLATE_WORLD_SCALE` is corrected (see this session's fix) — a natural candidate to replace the procedural home `Terrain` outright. This is **not a small scale tweak** — it touches at least 7 separate systems: (1) coordinate reconciliation (`SPAWN`/`BUILD_REGION`/`POND`/`KEEP_INTERIOR`/`SIGNPOST`/every NPC position all assume the current origin), (2) ground collision (`floorHeightAt`'s flat-`y=0` assumption would need `sampleTemplateGroundY`'s raycast instead, to walk the meadow's actual relief), (3) object collision (the per-building/resource/pond/keep AABB logic only exists in the home branch today — the destination branch has none), (4) bound model (box `±WORLD_HALF` vs. circular `dest.radius`), (5) lighting (the template's flat non-time-reactive fill light vs. `DayNight`'s sun cycle + its `±140` shadow frustum, tuned for the current flat plane), (6) reparenting every world-siblings component (`Buildings`, `ResourceNodes`, `Npc`, `Merchant`, `Villagers`, `StarterVillage`, `Signpost`, `KeepInteriorRoom`) into whatever coordinate space template-09 ends up in, and (7) scale reconciliation between `TEMPLATE_WORLD_SCALE` and the brick/minifig `MM_TO_WORLD` convention. Do this as its own dedicated, carefully-tested pass — not bundled into an unrelated batch of fixes.

## Phase 8 — Progression, economy & cosmetics

- **Gold + merchants**: sell surplus, buy rare materials; traveling merchant cart arrives on a schedule.
- **More skills**: Farming (till plots, grow wheat → bake at campfire), Cooking depth, Taming (falcon companion — `snd054`).
- **Equipment slots & visuals**: helmet/armor/cape actually swap the minifig's parts/decals (the assembler already supports it — armor = torso decal variants, helmets = accessory parts from other donors).
- **A real equipment/inventory screen (paperdoll), not a flat item list ✅**: the Satchel (I) now opens onto "Equipment & Satchel" — a rotatable full-body preview of the player's own character (`RotatablePreview.tsx`, shared with the creator below) with a real held-weapon/shield visual (portaled via the same `HeldSword`/`ArmShield` components `PlayerAvatar.tsx` uses), plus a Weapon slot (Sword / Crossbow / Longbow tiles, click an owned one to equip) and a Shield status slot. Clicking a weapon writes straight into `combatState` — the same field `Viewmodel.tsx`/`CombatController.tsx` already read — so it's live in the world immediately, no separate "apply" step; it's the same swap Q already cycles through, just exposed as direct clicks. Helmet/armor slots are a natural extension once those items exist (see Phase 12), not built ahead of the items themselves. The existing food-eating satchel grid stays put below it.
- **Character creator: manual pose + rotation control ✅**: `CharacterCreator.tsx` now uses the same `RotatablePreview.tsx` as the paperdoll above — drag with the mouse to orbit (auto-spin only until first touched, then stays put), with a Standing/Running toggle swapping the preview's clip (`anim_r_restpose` / `anim_c_walk`) so a face profile or a crest on the back can actually be inspected before committing.
- **Creator expansion — unlockable crests**: the gender-first face/body-type picker (`CharacterCreator.tsx`, `data/minifigs.ts`'s `FACE_OPTIONS`/`CREST_OPTIONS`) intentionally leaves faces and body types free to pick at creation — any look is fine, since cosmetics never touch the rank/title system (`data/ranks.ts` reads only skill XP + completed quests). Crests specifically should instead be earned: start with one plain/commoner crest, unlock the rest (including the fancier heraldry already in `CREST_OPTIONS`) via quest completion or achievements, the same way the rank system itself is already gated. Needs a small persisted `unlockedCrests: string[]` in the save and a locked/greyed tile state in the face-grid component (reuse the crafting panel's existing 🔒 treatment for locked recipes). Dye recipes for new palette rows remain a separate, later idea.
- **Achievements & stats page**, save-slot management, cloud saves already work via the Node backend.

## Phase 9 — Tech & scale (continuous)

- **Instancing for forests/herbs ✅**: `InstancedProps.tsx`'s `InstancedProp` normalizes a GLB prop once (same upright-flip/rescale/reground `PropModel.tsx` already does) and bakes each of its sub-meshes' local transform into its own geometry, then every tree/herb sharing that model url renders as one shared drei `<Instances>` per sub-mesh instead of its own `PropModel` clone — same look (verified pixel-for-pixel against the old per-node rendering, including the "shrinks as it's chopped" scale-by-health behavior surviving the switch), a fraction of the draw calls (2 tree models × 3 sub-meshes + 1 herb model × 4 sub-meshes = 10 `Instances` blocks total, replacing what had been a `useGLTF`+`clone(true)` call per node). **Rocks/iron veins deliberately left un-instanced**: they're already plain procedural `dodecahedronGeometry` with no load/clone cost, so they were never the bottleneck the roadmap's own rationale ("once counts grow") is about — instancing them would additionally need baking each asymmetric, differently-colored sub-part (main body / chunk / ore flecks) into a merged, vertex-colored geometry for real fidelity, real effort for a component that isn't slow. Chopped-tree stumps stay individual meshes too (rare, transient, ~35s respawn).
- **LOD — investigated, blocked on the asset pipeline, not the renderer.** The roadmap's original claim ("the source data ships D1/D2/D3 distance variants, mirror with three.js LOD") is only true at the *raw extraction metadata* layer (`asset_manifest.json`/`model_catalog.json` do list `Body`/`Body D1`/`Body D2`/`Body D3` shape entries per tree) — the actual exported `.glb` files under `public/assets/props/scenery/` only ever contain the highest-detail shape; the D1-D3 alternates were dropped during OBJ/GLB export and were never copied. Wiring real geometry LOD needs `scripts/prepare-assets.mjs` (or the upstream export pipeline in the sibling extraction repo) extended to actually emit the lower-poly shapes as selectable objects first — a pipeline task, not a three.js `THREE.LOD` wiring task. Left open, correctly scoped this time.
- **Physics upgrade** to `@react-three/rapier` when siege/ragdoll parts need real dynamics (Phases 4-5).
- **Web Workers** for pathfinding (NPC schedules) and save serialization.
- **Multiplayer-ready refactor (stretch)**: the store already separates simulation actions from rendering; extract them into a tick-based sim module so a future co-op server (Node + WebSocket, authoritative saves already server-side) can run it headless. Co-op castle building is the dream feature.

---

## Phase 10 — Reported issues & QA backlog (from playtesting)

Bugs and gaps reported in play sessions — schedule fixes alongside whichever phase touches the same system.

> **Status:** items 1-8 shipped (skeleton heads classify spatially, iron veins live, minimap live, arms fixed). Item 9 (merchant cart placement) reported and deliberately deferred — not yet fixed.

9. **Merchant cart sits inside the buildable area.** `MERCHANT_SPOT` (`data/trade.ts`) is `{x: 14, z: 20}` — well inside `BUILD_REGION` (`±30` on both axes) — so the traveling merchant's cart parks in the middle of the player's own build plot instead of off to the side, the same problem the royal court NPCs had before `StarterVillage.tsx`/`revealAfterQuest` moved them out of the way. Needs a `MERCHANT_SPOT` relocated outside `BUILD_REGION` (a quiet corner near the homestead, similar treatment to Alric/Beda's), checked against the existing merchant-interaction range and any signpost/other fixed-point overlap. Deliberately deferred, not fixed in this pass — scheduled for a future phase.

5. **Arms out of place — FIXED.** Investigation (`scripts/extract-restpose.py` walks the LCA WLD trees) showed the warehouse minifigs carry **no per-part rotations or pivots** — gesture poses are molded straight into the shape vertex data, so no data-driven un-baking is possible. The shipped fix is mold-aware geometry analysis in `lib/minifigRig.ts` (`rehangArm`): PCA finds each arm's long axis, the end nearer the torso is the shoulder, the piece is re-hung from the torso's shoulder socket along a natural hang direction, rolled so the elbow bows forward, and the hand snaps to the sleeve end. Verified with a 9-donor screenshot suite (`scripts/smoke10.mjs` → `scripts/shots/donors/`). **Follow-up (Skeleton donor) — FIXED:** hands still floated when the Skeleton was picked as both head and torso in the creator. Root cause was the classifier's other half — `classifyBySpace`'s unnamed-mesh fallback called anything in the model's top 22% "head" by height alone, so the Skeleton's raised claw (baked into its idle pose) got fixed rigidly under the skull instead of riding along with its arm's PCA rehang. Fixed by also requiring horizontal centering for the head classification; verified via `scripts/smoke28.mjs`.
7. **Forge had no smelt option (progression deadlock) — FIXED.** The Smelt Iron Bar recipe required the `smithing` unlock, but `smithing` is only *rewarded by completing* Forge Ahead — the quest that asks you to smelt 3 bars. Players reached the forge with ore and hit a wall. Smelting now unlocks with **Mining** (the moment you can gather ore and build a forge); `smithing` still gates the weapon tier. The full quest chain 1→4 is verified passable by `scripts/smoke15.mjs`, which plays it through the real game functions and smelts at the forge through the crafting UI.
8. **Use only original LEGO assets (directive) — first pass shipped.** The game should be 100% original extracted LEGO models/textures/sounds; custom geometry only where no original exists. **Shipped:** torch → original standard-pole `l395700` (flame/light kept as effects), quintain → the rotating-axes device `oc6095-2` (whole machine spins when struck), new buildables from identified models: Wooden Fence `l607900`, Palm Plant `l625500`, Battering Cart `oc4806`, Blade Cart `oc4807`; throne/flags/crests were already placeable via the generated decor tab. **Identified but not applicable:** `l606400`/`l606500` are white conical pieces (fountains/dead trees), not rocks. **No original exists (procedural stays, documented):** boulders/iron veins, campfire, forge, bed, the fishing jetty. **Merchant cart — since shipped:** re-examined `oc6095b3` (the same jousting-set model the Keep's treasure chest is pulled from) and found it isn't a single prop but a yoked two-horse team + shared tow-bar carrying a chest and a pair of axes (its bbox is exactly double a lone horse model's width); the merchant's procedural box cart now renders this real asset whole (`Merchant.tsx`'s `Cart()`, via `PropModel`) instead of staying procedural. **Weapons shipped:** the original molds were located inside the armed donors and are pulled at runtime (`lib/weaponParts.ts` — long-axis normalization, grip at origin): King Leo's **sword** (`minifigkingleo01/037_shape18`) now renders in the FPS viewmodel and on the avatar's hand, the **crossbow** (`minifiggilbertbad03/033_shape17`) is the ranged viewmodel, and raiding bandits carry the **halberd** (`minifiggilbertbad01/031_shape15`); the **spear** (`minifigrichardstrong02/032_shape16`) is loaded and ready for future guards. Remaining procedural tools (axe/pickaxe/rod) have no molds in the extraction. Stars, rain and placement ghosts are effects and may stay.

6. **Crafting recipes invisible before unlock (report: "didn't see iron") — FIXED.** The crafting panel filtered out any recipe whose `requiresUnlock` flag wasn't earned yet, so the whole iron chain (smelt bar, sword, shield, crossbow, bolts) was invisible to new players. Locked recipes now render greyed with a 🔒 and the requirement that unlocks them, so every craftable in the game is always visible.

1. **Character creator: arms float in space.** The limb re-alignment heuristic in `lib/minifigRig.ts` (`alignLimb`/`snapHand`) mis-places arms for some donors — arms detach from the shoulders and sit where the hands should be (as if holding drinks). Fix: derive shoulder pivots from the torso bbox (attach point at torso top corners) rather than the arm's own bbox top, and translate arm geometry so its top lands on the shoulder point before rotating; hands then snap to the corrected sleeve end. Verify across all 9 donors, both in the creator and third-person view.
2. **Skeleton head invisible.** Selecting the Skeleton as head donor renders no head (body donor works). Likely the skeleton OBJ names its head object differently (or unnamed `shapeN`), so `classifySided` finds no `head` part. Fix: log part names for `minifigskeleton00`, extend the classifier (fallback: topmost mesh cluster = head), and add a creator smoke test that cycles every donor and asserts a nonempty head group.
3. **Iron is hard to find / invisible.** Iron ore currently drops randomly (40%) from ordinary boulders after Mining unlocks, and nothing in the world or build menu shows it — players can't tell it exists. Fix: add distinct **iron-vein boulders** (darker rock with rust-colored flecks) east of the stone field, give ordinary rocks a small ore chance and veins a guaranteed drop, mention veins in the Stone Age / Forge Ahead quest text, and show ore in the rock's interact label ("Mine Iron Vein").
4. **Minimap.** Add a HUD minimap (canvas, top-right): player arrow, trees/rocks/pond/NPC/buildings as dots, build-region outline, north-up with the compass; M toggles a larger overlay map. Reuse the aerial build-mode palette for consistency.

---

## Phase 11 — Antagonists & a living cast

The extraction has real models and greeting/random voice lines for four named characters the game never uses as actual NPCs — right now Cedric only exists as a name in Richard's and Leo's lore lines. All four assets are already extraction-native; this phase is almost entirely new *content*, not new *systems*.

- **Cedric the Bull's Forest Camp — his home, and the game's capstone boss battle ✅**: grounded in the original game's own dialogue, not invented — the real challenge transcripts have Leo saying "Cedric still lives in the woods" and the campaign's own ending line is "we'll soon have Cedric safely behind bars." Shipped as `CedricCamp.tsx`: a discoverable location deep in the forest (`data/world.ts`'s `CEDRIC_CAMP`), gated behind Knight's Arms the same way the royal court is gated (`CEDRIC_REVEAL_QUEST`), dressed with a part-built tower and camp props, with Gilbert and Weezil stationed as respawning camp guards (`Enemies.tsx`'s camp-guard spawner) until Cedric himself is defeated. Cedric is a real boss kind (`EnemyKind: 'cedric'`, 45 HP vs. a raid bandit's 8) triggered by a dedicated "Challenge Cedric the Bull" interact prompt (`PlayerController.tsx`) rather than just wandering the world; winning pays off the story beat literally — `gameStore`'s `markCedricDefeated` flags the camp cleared, grants a one-time reward + the "Behind Bars" Deed, and the camp swaps Cedric's idle figure for a jailed one behind the same portcullis-lattice model used for gates.
- **Gilbert the Bad, bandit lieutenant ✅**: already the source of the halberd/crossbow molds and voiced with his own real greeting/random (`greeting_gilbert`/`random_gilbert`, snd040/041). He's now a distinct `EnemyKind` who leads every dusk raid (visibly carrying the halberd, 14 HP, his own attack timing) instead of the raiding party being three anonymous Weezil-skinned bandits, and stands as a respawning guard at Cedric's camp.
- **Weezil ✅**: wired into raid start/kill barks (`greeting_weezil`/`random_weezil`, snd038/039) instead of playing no distinct voice of his own, and stationed at Cedric's camp as the second guard.
- **Princess Storm's Battle Dome ✅**: also grounded directly in the original dialogue — Queen Leonora's own line is "Have you met my daughter Princess Storm? ... Few can match her skills with a sword." Shipped as a real NpcDef (`data/npcs.ts`'s `'storm'`, revealed alongside the Queen) stationed in a dedicated small arena (`BattleDome.tsx`, a stone ring distinct from Richard's open jousting field) with her own `repTitles` reputation track. Talking to her offers "Challenge to a Duel" (`DialoguePanel.tsx`); the duel itself is a real `EnemyKind: 'storm'` fight resolved the instant either side lands a blow (`combat.ts`'s `resolveDuel` — no pop-apart death, since she's a recurring character, not a monster), with escalating rematch difficulty (her approach speed and attack cadence scale with reputation, not extra HP) rather than a generic duel.
- **The Dragon**: `l7517400/401` + `anim_dragonflight/breathfire/run/walk` (per Phase 5's original notes, still unbuilt). Start small: a scripted flyover omen at night (no interaction, pure atmosphere + a Deed for spotting it), then later a defend-the-keep event where fire ignites *wooden* structures specifically (palisades burn, stone doesn't — a real reason to build in stone at the top tier).
- **Unused-asset audit (2026 pass)**: a full recount of `model_catalog.json` by category shows a few notable pockets still untouched beyond the Dragon (2 models) — `Destructor` (4), `Cannon` (2, only one — `c3_cannon` — is wired in), `Road` (4, unused — could pave the signpost's travel routes or a marketplace square), and `Animal` (2, beyond the wildlife horses/bats/falcon already used). Worth a dedicated pass once the bigger content phases above land, so nothing genuinely unique in the extraction goes completely unseen.

## Phase 12 — Deeper systems

Ideas that add a genuine new decision layer to existing loops, not new content on top of them.

- **Real fishing bite minigame ✅**: the old rain-boosted hold-duration shortcut is gone — `game/fishing.ts` now drives a genuine cast → wait (random delay, shorter in rain) → react cycle. The "Cast your line" prompt starts it; once the wait elapses the target flips to a near-instant "Bite!" prompt with its own shrinking countdown bar (`FishingMeter.tsx`, distinct from the generic hold-progress bar — this one ticks down whether or not E is held), and missing the 900ms window sends it back to waiting with "the fish got away." Walking more than a few meters from the cast spot resets the line.
- **Armor slots with real visuals ✅**: Iron Helm and Iron Chestplate, forged at the forge (Smithing), each reducing incoming damage (`combat.ts`'s `armorReduction`, stacking additively with a shield block on top, not replacing it). The helm is a real extracted mold — Cedric the Bull's own horned helm (`minifigcedricbull00/022_L_602900_D2`, previously undiscovered; normalized by width rather than height since the horns sweep sideways) — rendered on the head joint; no separate chestplate model exists in the extraction, so it's a plain steel-colored plate, the same "procedural only where the original has none" rule the axe/pickaxe/campfire/forge already follow. Both show as real slots in the equipment paperdoll.
- **Potions & alchemy ✅**: wild herb patches (`kind: 'herb'` resource nodes, the real wildflowers prop `l374100.glb`) scattered through the forest, brewed at the campfire into a Healing Draught (eaten like food), a Stamina Draught (full stamina restore) and a Night-Vision Brew (temporarily brightens night ambient lighting via `worldEnv.nightVisionUntil`). No new systems — potions reuse the existing satchel eat-to-use interaction (`EDIBLES`/`UTILITY_POTIONS` in `data/items.ts`).
- **Weapon/tool durability ✅ (optional-feel, not punishing)**: the axe, pickaxe, fishing rod and sword wear slowly (0-100, ~50 uses to bottom out) and, once worn out, just work *slower* (gathering) or *softer* (sword damage halved) rather than breaking outright. A Repair section appears in the Crafting panel at the workbench, costing 30% of the tool's original materials (a flat fallback for the axe, which — as a starting tool — has no craft recipe of its own to take a fraction of).
- **Skill perks ✅**: each rank-up (Laborer/Squire/Knight/Paladin — reusing `addXp`'s existing rank-transition check, queued until after the Knight/Paladin ceremony finishes) opens a real choice among whichever of five permanent passives aren't already taken — Iron Grip (+15 max stamina), Green Thumb (crops grow 15% faster), Steady Hands (30% slower tool wear), Quick Study (+10% XP from every skill) and Ironclad (+5% passive damage reduction). Only 4 rank-ups exist against 5 perks, so no playthrough can take them all — a real tradeoff, not just a bigger number. Picked perks show in the Abilities panel alongside Deeds.

## Phase 13 — Kingdom & economy ✅

- **Permanent village marketplace ✅**: a new `market_stall` buildable (`Buildings.tsx`'s procedural `MarketStall` — no dedicated model exists in the extraction, dressed with the real barrel and a previously-unused wooden crate prop, `l473800`) plus a new `'merchant'` `VillagerJob` (`data/villagers.ts`). Assign a villager to it and the stall's interact prompt switches from "needs a Merchant assigned" to "Trade at the Market Stall," opening the exact same sell/buy `ShopPanel` the traveling merchant uses — but reachable any hour, not just daylight. The assigned villager also passively delivers a small gold trickle through the existing `tickVillagers` job-delivery system (gated on the stall actually existing, so there's no free income before you've built one).
- **Blueprints/schematics ✅ — with an honest scope correction**: a real save-name-restamp system shipped (`data/blueprints.ts`, `captureBlueprint`/`placeBlueprintAt`/`evalBlueprintPlacement` in the store, a new Blueprints tab in the aerial Build Bar) — pan the build camera near a structure, name it, capture every building within ~9m as a reusable multi-piece template with a live per-piece validity ghost when re-stamping elsewhere. The "starter blueprints ported from the nine template worlds' actual placement data" idea, though, turned out not to be feasible: cross-checking `template_placements.generated.json`'s ~1,300 placements against every id in this game's buildable catalog (hand-crafted and the 133-piece generated one) found **zero overlap** — the template scenes are dressed from separate asset pools never wired into the build menu. The two shipped starter blueprints (a gatehouse, a watch corner) are hand-authored from this game's own existing pieces instead, grounded in "what these scenes' architecture looks like" rather than a literal data port.
- **Claiming a template world ✅**: a HUD prompt ("🚩 Claim [name] for your Kingdom," `ClaimBanner.tsx`) while visiting an unclaimed destination — deliberately *not* folded into the existing hold-E interaction system, which already has an unconditional "E always returns home" early-return there that real risk to regress. Claiming samples the real ground height once at the player's spot (reusing `sampleTemplateGroundY`) and unlocks the aerial build menu for a `CLAIM_RADIUS`-sized plot (smaller than the home region — an outpost, not a second homestead) leveled to that one height rather than following the bake's actual slope — a deliberate simplification that sidesteps needing slope-aware footing throughout the placement system. A small procedural flag marks the claimed spot.
- **Taxation / stewardship ✅**: a "Collect Taxes" interaction at the Keep's throne (gated on the Keep existing + at least one villager, a 5-minute real-time cooldown persisted in the save) pays gold scaled by villager count and building count — a small, repeatable Paladin-rank management loop.

## Phase 14 — Raids & sieges 2.0

Directly extends this session's cannon-splash-damages-buildings and pushable-ram work — the *player's* siege tools are done; this phase gives the *enemy* side the same depth.

- **Raiders bring a ram ✅**: raids now spawn with a 40% chance of their own pushable ram (`game/raiderRam.ts` + `RaiderRam.tsx` — an AI-driven counterpart to the player's own pushable cart, reusing the exact `ramCheck` from `siege.ts`) that trundles toward the nearest shut gate (or the homestead's center if there isn't one) and rams whatever it reaches — realizing the Phase 4 raid description's "gates, walls and towers become functional defense" for the *attacking* side, not just the defending one.
- **Cedric-led raids ✅**: once his camp is revealed and he's still at large, Cedric has a 35% chance of leading the raid himself instead of Gilbert — a real `EnemyKind: 'cedric'` (45 HP) with his own voice bark, rather than another anonymous bandit; beating him during a raid triggers the exact same one-time "safely behind bars" payoff as the dedicated camp fight (`markCedricDefeated` doesn't care which encounter he died in).
- **Battlement archery bonus ✅**: standing on a wall/tower top (checked via `playerState.y` vs. `EYE_HEIGHT`, no new collider plumbing needed) now measurably boosts ranged damage — crossbow bolts +1, longbow arrows +25% — with a small HUD readout ("⬆ Battlement — bonus damage") so the height actually reads as a combat choice, not just a viewpoint.
- **Villagers defend themselves ✅**: the moment any raid enemy is on the field (`useEnemyStore`'s `raid` flag), every recruited villager drops whatever they were doing and runs for the homestead's center at a faster "fleeing" pace instead of continuing to wander obliviously — a small reaction, but it sells the stakes of an undefended homestead.

## Phase 15 — World life & atmosphere ✅

- **NPC daily schedules ✅**: court NPCs (anyone gated behind `revealAfterQuest` — king/queen/richard/john/storm, not the two always-present starter farmers) now drift from their usual daytime spot to a small shared gathering point outside the Keep at night and back at dawn (`Npc.tsx`'s `CourtNpc`, a plain position lerp toward `data/world.ts`'s new `NIGHT_GATHER_SPOT`, not real pathfinding). Recruited villagers do the same toward the nearest built bed once night falls (`Villagers.tsx`, reusing the exact seek-and-idle technique the existing raid-flee branch already established) — no Web Workers/navmesh needed after all, since the existing simple point-seeking movement (already used for wandering and raid-fleeing) generalizes to this just fine at this game's scale.
- **Seasons ✅**: a `worldEnv.dayCount` (incremented on each day-wrap in `DayNight.tsx`) drives a 4-season cycle (`seasonOf()` in `game/env.ts`, ~3 in-game days each), mirrored into the store (`season`) the same low-frequency way `timeOfDay` already is, for persistence and for React components that need to react to it. Grass tints per season (a slow color lerp on the terrain material, `Terrain.tsx`) and so do trees (a per-instance multiply tint via drei's `<Instance color>`, `InstancedProps.tsx`/`ResourceNodes.tsx` — subtle since a multiply can only darken/shift hue, never add true white "snow," confirmed still real via direct pixel sampling, not just eyeballed screenshots). Winter nights run longer (a bias term added to `nightFactor`, widening the night window rather than reworking the whole day-length clock) and winter crop growth is slower (a rate multiplier in `tickPlots`).
- **More weather ✅**: winter reskins the existing rain particle system as snow in-place (paler, bigger, slower-falling, silent, no lightning — `Weather.tsx`) rather than a separate system. A new, independent **mist** weather state (`worldEnv.mist`/`misting`, same spell-timer state machine as rain) pulls `scene.fog`'s near/far distance in much closer than rain's light haze does (`DayNight.tsx`) — genuine low-visibility weather with zero new particles, exactly as scoped.
- **No original music tracks exist in the extraction** (checked — only the SFX/voice bank), so a music system would mean either commissioning/licensing new tracks or staying ambience-only; noted here so it isn't quietly assumed available later.

## Phase 16 — QoL, accessibility & polish ✅

- **The Chronicle ✅**: a growing in-game record (`ChroniclePanel.tsx`, L) of every one-time voiced NPC introduction unlocked so far (`data/npcs.ts`'s `loreLines`, gated on the existing `loreSeen` save field — no new save schema needed), each line replayable on demand and shown verbatim rather than paraphrased. NPCs not yet met show a 🔒 placeholder by name rather than being hidden outright (same convention the Quest Log already uses for upcoming quests). Doubles as a small showcase of the original game's real voice-over bank, in keeping with the project's preservation angle.
- **A dedicated Stats page ✅**: `StatsStack.tsx`, reachable from the pause menu, shows lifetime playtime, distance traveled, resources gathered, enemies defeated and buildings placed. The three event-driven counters hook directly into `addItems`/`recordKill`/`placeBuilding`; the two continuous ones (distance, playtime) accumulate in a small `statsAccum` module and flush into the store every ~4s rather than every frame.
- **Keybind remapping, with a Reset to Default ✅**: bindings live in a named-action table (`data/keybinds.ts`'s `DEFAULT_KEYBINDS`), persisted in Settings; Options has a press-to-set rebind row per action plus a single Reset to Default button. Every key check in `PlayerController.tsx`/`GameScreen.tsx` now reads through the current bindings instead of a hardcoded `KeyboardEvent.code`.
- **A new-player how-to-guide (screenshots included) ✅**: `HelpStack.tsx` — seven real in-game screenshots (`public/help/`, generated via the project's own Playwright screenshot pattern) covering character creation, core controls, gathering, crafting, quests/NPCs, building and combat readiness. Reachable from the Main Menu before a save exists, and via H mid-game (paired with the HUD hint box already listing every key).
- **Settings expansion ✅**: three graphics-quality presets (Low/Medium/High, mapped to the Canvas's `dpr` plus a shadows toggle) and a colorblind-friendly minimap palette toggle (swaps the tree/herb green pair for a green/yellow pair that stays distinct, and gives raid enemies a vermillion square marker instead of a red dot).
- **Photo mode ✅**: P toggles a free-fly, collision-free camera mode with the HUD hidden down to a small "P to exit" hint, built on the existing camera rig and movement-block structure.
- **Gamepad support ✅**: a standard-mapping controller's left stick/D-pad drive movement and the right stick drives look, merged with keyboard input at read time via a small `isDown()` OR-check against a separate `pad` record (avoids a stick-returns-to-neutral clobbering a still-held keyboard key). A/X/RB map to jump/interact/sprint.

## Phase 17 — Procedural dungeons (major feature) ✅ v1

Shipped as a real, scoped v1 — a linear chain of generated rooms rather than the full branching/multi-objective ambition below, which is now clearly split into what's done vs. explicitly deferred.

- **Dynamic map assembly ✅ (scoped)**: "The Sealed Crypt" (`game/dungeon.ts`'s `generateDungeonLayout`) assembles a fresh 5-7 room chain each descent — entry room (safe) → 4-6 combat rooms → a boss room, laid out along a single corridor rather than a branching graph (a deliberate simplification: precisely aligning wall openings across a branching layout is real geometric work, and a linear chain already delivers "a fresh layout every run" without it). Rooms are real stonewall segments (`DungeonScene.tsx`, positioned directly — not through the player's build economy, since this is environment generation, not a placed structure) with a gap left in the wall on whichever side(s) face a corridor. It piggybacks on the *existing* template-world destination system (`data/worlds.ts`'s `DUNGEON_DESTINATION`, `st.destination`, `travelTo`-adjacent collision/ground-height code) rather than inventing a parallel one — the one addition needed was real per-wall AABB collision in `PlayerController.tsx` (template worlds only ever needed a simple circular bound; a dungeon needs to actually feel like a maze).
- **Permutations of characters & enemies ✅ (scoped)**: each combat room rolls skeleton or bandit (1-2 of them); the boss room always fields Gilbert the Bad. **Objective types, beyond "defeat all," and reusing Cedric/Weezil/Storm as dungeon content are explicitly deferred** — Cedric and Storm are one-time story arcs (`markCedricDefeated`, her reputation-scaled duels) and reusing them repeatably here would undercut that; Weezil has no combat identity separate from being "a bandit," so there was nothing distinct to reuse yet.
- **Loot & rewards on completion ✅ (scoped)**: clearing every chamber pays gold + iron ore + stone scaled by room count. **Rare dye colors and cosmetic unlocks are deferred** — no cosmetic-unlock system exists yet to pay into (see Phase 8's still-open "unlockable crests" idea; this is a real, cheap follow-up once that lands).
- **Entry gating ✅**: sealed until Knight's Arms (Knight rank) is complete, via a new dedicated "Descend" section in the existing Travel Map panel (not mixed into the nine-diorama grid, which assumes a real thumbnail image per entry).
- **Technical footing (adjusted)**: Phase 0's "entity registry" and Phase 9's instancing don't literally exist as originally envisioned, so this reuses what *does* exist instead — the enemy system's existing global `useEnemyStore` (enemies render correctly regardless of location with zero changes, exactly like Phase 13's buildings/blueprints did), and a plain mutable leaf module (`dungeonState`, matching `raiderRamState`/`cartState`) for the generated layout itself, ephemeral and explicitly not persisted across a save reload (matching how a mid-visit template-world position was never persisted either).
- **A real bug caught and fixed along the way**: a knockout used to only teleport the player's *position* home, never clearing `st.destination` — harmless when no destination ever had killable enemies, but the Sealed Crypt is the first one that does. Fixed in `combat.ts`'s `damagePlayer`: a knockout away from home now also clears `destination` (and the dungeon layout), confirmed via a real hostile hit landing in an automated test, not just the position math.
- **Deferred for a future pass**: branching layouts, additional objective types (escort/retrieve/survive-waves), Cedric/Storm dungeon appearances, cosmetic-unlock loot, and reusing this same generator for something visually distinct from "castle stonewall corridor" (the extraction's other piece categories — arches, cylindrical, wedge — could reskin the same algorithm without new generation logic).

## Phase 18 — Playtesting fixes & asset accuracy (reported 2026-07-18)

A batch of real bugs and asset-accuracy corrections found in play, being worked one at a time.

- ✅ **Wall placement ghost rotation doesn't match the actual placed piece** — fixed: the ghost/placed mismatch and the underlying wrong-piece bug were the same root cause (see the wall/brick scale item below); swapping in real `mc007`/`mc003` wall/tower models resolved both.
- ✅ **Running drops the player (and enemy NPCs) below the ground** — root-caused as a purely visual animation defect, not a physics/collision bug (both player and enemy ground-height logic were already solid): `anim_c_run`'s hip-bob track in `minifigRig.ts`'s `MinifigAnimator` was anchored to the clip's frame 0, which happens to sit at the stride's *peak* — so for nearly the whole loop the hips (and everything below) were pulled down by up to ~30cm relative to normal stance. Looping clips now anchor to the cycle's midpoint instead (one-shot clips like jumps/emotes keep the old frame-0 behavior, which is correct for them); fixes it for the player's third-person avatar and every enemy's chase animation at once, since they share the same rig/clip code.
- ✅ **The fishing pier extends out into the pond** — fixed: `FISHING_DOCK`'s far end sat only ~4m from the pond's center (radius 8, i.e. into the water's middle); repositioned to run tangentially along the bank instead (both ends at the pond's actual edge radius), confirmed via screenshot.
- ✅ **"Talk to [NPC]" prompts stay active at an NPC's old daytime spot after they've moved** — fixed with a new `npcMobs.ts` live-position registry (mirroring the existing `villagerMobs.ts` pattern); `PlayerController`'s interact-target check now reads it instead of the static `data/npcs.ts` coordinates.
- ✅ **NPCs glide with no walk animation while returning to their spot** — fixed: `CourtNpc` now switches walk/idle clips and faces its movement direction during the night-schedule drift, matching what `Villagers.tsx` already did correctly. (A much more comprehensive AI/animation rig is its own future item below.)
- ✅ **The sword renders backwards in the first-person viewmodel** — fixed at the source: `weaponParts.ts`'s `flip` field (already built for exactly this PCA sign-ambiguity case) was `false` for the sword; setting it `true` corrects both the FPS viewmodel and the third-person held pose (`Equipment.tsx`'s `HeldSword` shares the same loader).
- ✅ **The "shield" currently rendered is actually one of King Leo's body-part meshes** — fixed: mapped every named shape in Leo's donor OBJ by real-world altitude and left/right offset, found `022_shape10` sits dead-center at torso height/width (his chest block) while `044_shape22` is a bulky shape on the off-hand side with no arm of its own — confirmed visually (a textured heraldic lion crest) in both FPS and third-person views.
- ✅ **Wall/brick piece scale audit vs. the real sets** — done; see `BRICK_CATALOG.md` for full methodology and findings. The extraction's `ldraw/*.mpd` files are ground truth (real LDraw part numbers for individual bricks, or "custom baked geometry" for the bespoke Castle/Building assets) — cross-referencing every hand-authored buildable against it found and fixed three more mismatches beyond the wall/tower: `palisade` (was a "Brick, Modified 1x1 with Headlight" stretched into a gap-riddled wall — now reuses the real fence piece), `plant` (right piece, 2.5x too tall, rendered as giant splayed blades — rescaled to its own proportions), and `workbench` (footprint tightened to match its real box shape). `gate`/`barrel`/`tree`/`fence`/`keep` were reviewed and confirmed already correct. The bulk auto-generated brick catalog (`bricks.generated.json`, ~140 pieces) was never at risk — it derives `size` mechanically from the same real bbox data.
- The improved item-catalog JSON the user is preparing via Grok is still forthcoming — when it arrives, validate it against `BRICK_CATALOG.md`'s findings and use it to correct any remaining item/model mappings.

## Phase 19 — Deeper RPG systems & living homestead (in progress)

- ✅ **Perks chosen from a menu, not forced at level-up**: a rank-up no longer opens any panel — `addXp`'s rank transition now just posts a "check your Abilities (K)" notification. The Abilities panel (`SkillsPanel` in `Panels.tsx`) shows a clickable "choose a permanent gift" list (identical perk cards to the old forced modal) whenever earned perk slots outrun perks taken, and it stays open/dismissible like every other panel — no more silent loss of a pick via Escape. Slots earned is derived (`perkSlotsEarned` in `data/ranks.ts`, a rank's own index in `RANKS` — Laborer=1 … Paladin=4) rather than stored, and `choosePerk` now gates on it directly so the cap holds even with the panel open indefinitely. The standalone `PerkPanel.tsx` and the `'perk'` `PanelId` variant are gone, folded into `SkillsPanel`.
- ✅ **A much more comprehensive, persisted lifetime-stats layer**: `LifetimeStats` (`game/types.ts`) now tracks per-kind breakdowns — `nodesHarvested` (tree/rock/fishing/herb, incremented in `harvestNode`), `killsByKind` (`recordKill` now takes the `EnemyKind`, wired from all 3 kill sites — melee/ranged/cannon), `buildingsByType` (`placeBuilding`), `itemsCrafted` (`craft`), `goldEarnedLifetime` (`addItems` + `sellItem`, every source), and `dungeonsCleared` (a new `recordDungeonClear()`, called from `Enemies.tsx`'s Sealed-Crypt full-clear reward block). `StatsStack.tsx` (the pause-menu Stats page) shows all of it plus two hand-rolled SVG bar charts (Resources Harvested, Foes Defeated) — no charting dependency added, matching the project's existing "plain inline-styled panels + a hand-rolled canvas minimap" style. Also added a **Challenges** system (`data/challenges.ts`): 9 tiered milestone tracks (Woodcutter/Quarrier/Angler/Herbalist/Architect/Monster Hunter/Dungeon Delver/Golden Fortune/Artisan, 3 tiers each) whose current tier is derived live from the stats layer (no separate "earned" flag needed, since every metric only ever increases) — `checkChallenges()` runs on the same 4s interval as `checkDeeds()`, notifying the first time a tier is crossed and persisting only the highest tier already announced (`challengeTiers`) so it doesn't re-fire.
- ✅ **RPG alliance branch: side with King Leo or Cedric the Bull** (v1): a persisted `alliance: 'leo' | 'cedric' | null` with a one-way `pledgeAlliance` action. Once knighted (`knights_arms`), King Leo's dialogue offers "Pledge your sword to the crown", and approaching Cedric's camp unsworn now opens a **parley panel** (his own recruitment pitch) with three real choices — join his rebellion, challenge him to the boss fight as before, or walk away; a crown-sworn knight skips the parley and goes straight to steel, and a Cedric-sworn player can't attack their own warlord (the camp guards also stand down for an ally). The raid system reads the alliance: pledge to Cedric and dusk raids become waves of **Royal Knights** — a new `'royal'` `EnemyKind` (Richard's unused `01` donor variant in Leo's royal blue/white/yellow, sword-and-shield loadout, its own hp/damage/speed/XP/loot tables) — while Cedric's own bandit raids stop entirely; unsworn or crown-sworn keeps the existing Gilbert/Cedric raid behavior unchanged. Deferred to follow-ups: reputation fallout with the court, alliance-specific quests/rewards, and a turncoat path (re-swearing sides).
- **The homestead as its own persistent map/instance**, whose state (who raids it, how) is a function of the alliance choice above — needs real design thought once the alliance branch itself exists.
- **A comprehensive AI/animation rig for lively NPCs** (beyond the immediate walk-animation glide fix above): proper locomotion blending, idle variety, and reactive behaviors so recruited villagers and court NPCs read as truly alive, not just position-lerping props with an occasional clip.
- ✅ **Homestead defense patrols**: a new `'defender'` villager job (`assignJob`, alongside the existing Lumberjack/Miner/Farmer/Merchant — skipped entirely by `tickVillagers`'s passive-delivery system, since their "production" is combat) with a real management layer in the Homestead Roster panel: a loadout picker (Sword & Shield / Halberd / Bow, `setDefenderLoadout`) and a station picker (`stationDefender`, patrol home or a placed Watch Tower). A new `Defenders.tsx` gives each one a real combat AI during a raid — melee loadouts close to melee range and swing, bow loadouts fire from their post without needing to move; a defender stationed on a tower is elevated out of a ground raider's melee reach (the actual mechanical reason to station an archer up there), while anyone else in melee range takes retaliation damage and can be knocked down (a temporary "downed" state, not permanent loss — they recover and rejoin the fight). Kills grant the defender their own XP (`gainDefenderXp`, reusing `ranks.ts`'s existing level curve rather than a new one) as well as the usual stats/loot/notify. Confirmed end-to-end via a live raid: a bow defender stationed atop a tower engaged, damaged, and killed a raider entirely on its own.
- ✅ **Build-then-construct, not instant-on-placement** (v1): `PlacedBuilding` gained a persisted `built: 0..1` progress field (absent = 1, so every pre-existing save's buildings just work). Placing a piece (single or blueprint) now deducts materials and stakes out a **construction site** — a translucent gold silhouette of the finished piece with surveyor's stakes at the corners, intangible (walk through it, can't stand on it, can't stack on it) and inert (no station/bed/gate/tower function, no torch light, no campfire crackle) until finished. Walking up offers "Build X (NN%)" — each hold-E hammer swing (a new procedural mallet viewmodel, `targetKind: 'construct'`) advances `constructBuilding(id, 1/swings)`, with swings scaled to the piece's `buildXp` (2–8); a solid work-in-progress block **rises out of the ground** inside the outline as progress climbs. Build XP, quest counters, and the buildings-placed stats all moved from placement to the completion moment — the thing counts when it stands.
- ✅ **Dedicated builder villagers** (v1): a new `'builder'` villager job — no passive deliveries; instead every assigned builder chips away at the oldest construction site (~25s per piece per builder) via a builder pass in `tickVillagers`, stacking with the player's own hammer swings. In-world, builder villagers actually walk to the active site and play a hammering gesture while it rises (same seek-and-act pattern as the raid-flee/bed-seek branches), so the assist reads on screen, not just in the numbers.
- **UI/styling color-scheme overhaul, grounded in the real faction palettes**: research the actual LEGO Knights' Kingdom color schemes — Cedric the Bull and his men (Gilbert the Bad, Weezil) vs. King Leo and his men (Richard, John of Mayne, the royal court) — blues/yellows/whites for Leo's side, reds/blacks/browns for Cedric's, per the extraction's `glit0NN` palette materials and minifig textures already in the project. The current HUD/panel theme (parchment + gold throughout, `globals.css`) doesn't reflect this at all; needs a real pass identifying each faction's actual palette values, then reworking the game's chrome (and possibly world/building material choices) to match, rather than the current one-size-fits-all fantasy-parchment look.

---

## Suggested build order (each ships something playable)

1. **0 + 1** — animator, entity registry, third person, viewmodel tools, walk anims *(the game instantly feels alive)*
2. **2** — day/night + weather + wildlife *(atmosphere, torch demand feeds building)*
3. **3** — build menu 2.0 with categories, verticality, all 141 bricks *(the sandbox half deepens)*
4. **4** — combat + night raids *(the knight half arrives; existing sword/shield quest pays off)*
5. **5** — horses, carts, siege *(traversal + spectacle)*
6. **6 + 7** — NPC quest economy, walkable castles, template worlds *(it becomes a world)*
7. **8 + 9** (9 partial ✅ — forest/herb instancing shipped; LOD blocked on the asset pipeline, physics/workers/multiplayer still open) — economy, cosmetics, perf, co-op groundwork
8. **11** ✅ — Cedric, Storm, Gilbert and Weezil as real voiced characters *(shipped — Cedric's Forest Camp boss fight, Storm's Battle Dome duel, Gilbert/Weezil raid barks; the Dragon and the unused-asset audit remain open)*
9. **14** ✅ — raiders bring a ram, Cedric-led raids, battlement archery bonus, villagers flee *(all shipped — extends the siege/ram work to the enemy side)*
10. **12 + 13** ✅ — deeper systems (fishing minigame, armor, alchemy, durability, perks) and kingdom/economy (market stall + Merchant job, blueprints, claiming a template world, keep taxation) — all shipped *(makes the mid-game loop richer)*
11. **16** ✅ — keybind remapping, Stats page, photo mode, gamepad support, graphics/colorblind settings, a screenshotted new-player guide *(all shipped — the QoL/accessibility pass)*
12. **17** ✅ v1 — procedural dungeons: The Sealed Crypt, a fresh room chain every descent, real wall collision, gated behind Knight rank *(branching layouts/more objective types/cosmetic loot deferred — see Phase 17's own notes)*
13. **15** ✅ — world life, atmosphere (NPC/villager day-night schedules, seasons, snow + mist weather) — shipped *(the long tail, sprinkle anytime)*
14. **18** ✅ — playtesting fixes & asset accuracy: wall rotation/scale, sword flip, shield mold, palisade/plant/workbench asset swaps, fishing dock, NPC stale-prompt + glide, and the run-animation ground-sink bug — all shipped *(see Phase 18)*
15. **19** — deeper RPG systems & living homestead *(in progress, one item at a time — see Phase 19)*

Quick wins to sprinkle anytime: emote wheel ✅, positional audio ✅, torch buildable ✅, real fishing bite minigame ✅, a Stats page ✅, demolish-area tool, **textured water ✅**: the pond (`Terrain.tsx`) now renders the real extracted `spr199_256x256.png` caustic-ripple sprite — tinted blue (`0x7fd0dd`, matching the sibling extraction project's own `MapLoader.jsx` reference implementation), `RepeatWrapping` + anisotropy 8 so it doesn't mip-blur to a flat color, and UV-drifted every frame for gentle animated ripples — replacing the old flat solid-color circle. Wired into `scripts/prepare-assets.mjs` so a future asset re-sync doesn't silently drop it. `spr203_64x128.png` (a waterfall cascade strip) was copied alongside it but is **not yet wired to anything** — streams/rivers/waterfalls remain a real, still-open follow-up using an asset that's now already sitting in `public/assets/textures/water/`.

---

# Archived from ROADMAP.md — 2026-10-01 (CLN-34)

Every section the 2026-09-23 reconciliation pass tagged `[COMPLETE]`, moved here verbatim and in their original
order. ROADMAP.md keeps an index line for each one where it used to sit.

## ✅ Shipped (Phases 0–19, compact recap) [COMPLETE]

Everything below is implemented, tested, and in the game today. Details in the archive.

- **Foundation & character** — screen-stack navigation, auth + server saves; the original SMO animation
  format decoded and playing (100+ clips); minifig assembly with palette recoloring, PCA limb re-hang for
  gesture-baked donors; gender-first character creator with real extracted face/crest textures and a
  rotatable pose preview; third-person avatar, FPS viewmodels with contextual tools (axe/pickaxe/rod/
  hammer/sword/crossbow/longbow), emote wheel, equipment paperdoll.
- **World & atmosphere** — day/night cycle with sleep-to-dawn; rain/lightning, winter snow reskin, mist;
  a four-season cycle tinting grass/trees, slowing winter crops, lengthening winter nights; wildlife
  (horses, falcon, bats); NPC/villager day-night schedules; textured animated pond water (`spr199`).
- **Gathering, crafting & economy** — trees/rocks/iron veins/herbs/fishing with a real bite minigame;
  farming plots → wheat → bread; campfire alchemy (healing/stamina/night-vision); tool durability + repair;
  traveling merchant + buildable market stall with a Merchant villager job; Keep taxation; gold economy.
- **Building** — tabbed, searchable build menu over 141+ real extracted pieces at true LEGO proportions;
  vertical stacking with 3D collision; move/undo; blueprint capture-and-restamp; claimed plots in template
  worlds; **build-then-construct** (ghost sites hammered up out of the ground) with Builder villagers
  assisting; walkable structure tops.
- **Combat & defense** — melee/block, crossbow + hold-to-draw longbow, armor (real extracted horned helm),
  stamina; night skeletons, dusk raids led by Gilbert or Cedric with AI battering rams; battlement ranged
  bonus; LEGO pop-apart deaths; cannon/pushable ram/hitchable cart siege tools with real structure damage;
  **Defender villagers** with loadouts, tower stationing, leveling, and their own combat AI.
- **Cast & story** — King Leo, Queen Leonora, Richard, John of Mayne, Princess Storm, Gilbert, Weezil and
  Cedric all present with their real extracted voice lines; one-time voiced lore intros (replayable in the
  Chronicle); side-quest errands + per-NPC reputation/titles; Knight/Paladin throne ceremonies; jousting
  vs Richard; first-blood duels vs Storm; Cedric's Forest Camp capstone boss fight; **the alliance branch**
  (pledge to Leo at court or to Cedric at a camp parley — the opposing faction raids your homestead,
  including a new Royal Knight enemy kind for traitors to the crown).
- **Locations** — the nine original template-world dioramas visitable via the travel signpost; the Sealed
  Crypt procedural dungeon (fresh room chain per descent, real wall collision, full-clear rewards); the
  Grand Keep's furnished great hall; the Battle Dome; Cedric's camp.
- **Progression & records** — seven skills, Peasant→Paladin ranks, perks chosen freely from the Abilities
  panel (capped by rank-ups earned); 16 Deeds; **9 tiered Challenges** derived live from the expanded
  lifetime-stats layer (per-type harvests/kills/buildings, lifetime gold, crafts, dungeon clears) with
  SVG bar charts on the Stats page.
- **QoL & accessibility** — keybind remapping, gamepad support, photo mode, graphics presets, colorblind
  minimap palette, a screenshotted How-to-Play guide, minimap + compass.
- **Asset fidelity** — 100%-original-assets directive enforced (procedural only where no mold exists, each
  case documented); original weapon/shield/helm molds located inside armed donors and extracted at runtime;
  the full wall/brick catalog audited against real LDraw part numbers (`BRICK_CATALOG.md`); green-screen
  thumbnails chroma-keyed in the asset pipeline.

**Still-relevant scope notes from the archive:** geometry LOD is blocked on the asset pipeline (the D1–D3
low-poly variants were never exported to GLB), not the renderer. No music tracks exist in the extraction
(SFX/voice only) — a soundtrack means new material, or staying ambience-only. The template worlds'
placement data shares zero model ids with the buildable catalog, so "porting" their structures means
importing new catalog entries first, not reading coordinates.

---

## 🗺️ Phase 23 — Instance Separation & Voice Discipline (bugs shipped 2026-07-19) [COMPLETE]

**The doctrine (user-set, non-negotiable): every destination is its OWN map.** The engine keeps
instances as far-apart coordinate spaces in one scene, but *nothing* perceivable may bleed between
them — no sounds, no UI frames, no weather (Phase 22), no lighting. Every new feature must pass this
filter before shipping.

1. [COMPLETE] ✅ **Per-instance minimap** — the map was hardcoded to the homestead frame (origin-centered at
   `WORLD_HALF` scale), so at any destination it showed home with the player smeared off-canvas.
   Now: each destination renders its own map, centered on its own origin at its own radius, with its
   own landmarks (realm boundary ring, Battle Dome at The Contested Fields, Cedric's camp diamond at
   The Rival Castle, guild-hall rings) — and homestead dressing (pond/build region/nodes/merchant/keep)
   draws only on the homestead's map. Buildings placed on claimed plots appear on their own realm's map.
2. [COMPLETE] ✅ **Positional mob audio** — `audio.playAt(name, x, z, vol)`: full volume ≤14 units from the player,
   silent ≥70, which doubles as the cross-instance mute (instances sit thousands of units apart). Root
   cause of "skeletons make noise on another map": death pops + spawn rattles played globally, and the
   Phase 22 defender patrol made defenders cull night skeletons while the player was away. Swept: enemy
   death pop, death barks, skeleton spawn rattle.
3. [COMPLETE] ✅ **Exclusive voice channel** — `audio.playVoice()/stopVoice()`: all 16 NPC voice-line call sites
   (dialogue lore/greetings, Chronicle replays, parley, Storm duel barks, camp-guard hails) share one
   channel, so pressing Next stops the current line before the next plays; closing the parchment (✕,
   Continue, Esc) or Skip silences mid-line.

[TODO] **Standing audit list (apply the doctrine when touched):** ambience birdsong is identical in every
realm (could take per-realm pools); raid horns only trigger at home but a raid resolving while away
should notify, not blare; Wildlife falcon/bat one-shots are near-global at home.

---

## 🧠 Phase 24 — The Living Homestead — ✅ v1 SHIPPED 2026-07-19 (all three parts) [COMPLETE]

*Shipped as planned below, all verified headless. Deltas from plan: attributes are fully derived from
the villager id (never stored — zero migration); labor performance is trip-timer-synced cosmetics with
the timer staying the economic source of truth; orders are global v1 (`defenderOrders` leaf module,
session-only). **Follow-ups:** per-defender orders via the roster card, a HUD chip for the active
order, floaty "+2 wood" at the stockpile deposit, Wit-priced merchant stall UI.*

### 24A — Villager attribute system (customize each NPC's skill set) [COMPLETE]
- **Attributes** rolled at recruitment, hash-seeded per villager so they're stable: **Might** (carry),
  **Diligence** (work speed), **Craft** (bonus-goods chance), **Courage** (defender damage / flee
  threshold), **Wit** (merchant prices, scout radius). Range 1–10 with rare "gifted" outliers.
- **Per-trade proficiency**: generalize the defender-only `level`/`xp` fields to every job — working a
  trade earns trade XP; each level = bigger hauls / faster trips. Switching jobs keeps each trade's
  level (a veteran lumberjack re-assigned to mining starts that trade fresh).
- **Effects wired through existing systems**: Diligence scales `tripSeconds`, Might adds a double-haul
  chance to `perTrip`, Craft adds side-goods (flowers on lumber runs, ore on stone runs — mirroring the
  player's own talent bonuses), Courage feeds the Defender damage formula, Wit boosts merchant-job gold.
- **UI**: Roster rows expand into an attribute card (five stat bars + trade levels + traits), replacing
  the flat job-dropdown-only row. This is where later traits/gear slots land.
- **Data**: `Villager` gains `attrs: Record<AttrId, number>` + `tradeXp: Partial<Record<VillagerJob,
  number>>`; villagers array already persists whole, so no new save plumbing. Old saves: roll attrs
  lazily on first read (hash of id → deterministic, no migration).
- **Verify**: deterministic — same villager id always rolls the same attrs; tripSeconds math asserted
  directly; roster card screenshot.

### 24B — Real labor: villagers physically work and haul (no more auto-collect) [COMPLETE]
- **Principle** (the labor version of "the mesh comes to the world"): the trip TIMER stays the economic
  source of truth (cheap, deterministic, keeps producing while the player is away) — what we add is the
  visible **performance**: walk to the worksite, work animation, walk back carrying, and the goods only
  hit the inventory at the physical **deposit moment** when the player is home to see it. Away = trips
  complete abstractly as today, so the economy never stalls.
- **Work loops** per job, all reusing the established seek-and-act movement (raid-flee/bed-seek/builder
  pattern — no navmesh): lumberjack → nearest live tree node (chop anim, axe held prop); miner → boulder
  field (pickaxe swings); farmer → tends the plot props; fisher → the dock (rod idle); merchant stays
  abstract (rides off-map, returns with gold).
- **Stockpile**: new buildable (crate cluster, real crate mold `l301500`) as the deposit point with a
  floaty "+2 wood" on delivery; without one, deliveries land at homestead center as now. Building a
  stockpile near worksites visibly shortens the return leg = real throughput gain (Diligence × layout).
- **Verify**: movement-direction checks toward worksite/stockpile (the established "did they leave"
  pattern), deposit event fires only on arrival when home, abstract completion asserted while away.

### 24C — Defender command system (a captain's orders) [COMPLETE]
- **New key T ("tactics")** opens a Command Wheel (EmoteWheel pattern): **Follow me** · **Attack my
  target** · **Scout the area** · **Resume patrol**. v1 commands ALL defenders at once; per-defender
  orders later via the Roster attribute card.
- `defenderState` gains `order: 'patrol' | 'follow' | 'attack' | 'scout'` (+ `orderTargetId`). The
  Defenders AI branches on order before its patrol/engage logic:
  - **Follow**: formation offsets behind the player (hash-spread), engage hostiles near the player.
    Homestead staff only — ordering while away gets a refusal bark ("Our place is the homestead, my lord").
  - **Attack**: converge on the enemy under the player's reticle (existing `targetKind` plumbing),
    ignoring engage radius; falls back to nearest hostile to the player.
  - **Scout**: double-radius sweep of the whole homestead, notify on each hostile spotted ("Warden sights
    a skeleton by the boulder field!") — Wit widens the spot radius (ties into 24A).
  - **Resume patrol**: the Phase 22 circuit.
- HUD chip near the hearts showing the active order; H help + keybinds screen updated.
- **Verify**: order state via `__kkdefenders`, follow = distance-to-player shrinks; attack = converge on
  spawned target; scout = circuit radius doubles; patrol = today's behavior.

---

## 🧱 Phase 25 — Build Catalog Expansion — ✅ v1 shipped 2026-07-19 [COMPLETE]

1. [COMPLETE] ✅ **Shipped v1 (2026-07-19)** — new **Prefabs** category (menu already had category tabs + search,
   so no UX work needed): 7 whole structures promoted with piece selection, roles and display names
   taken straight from the user's own verified Grok labels (`PAK_CAPABILITY_OVERRIDES.json`), with
   footprints from real GLB accessor bounds — Castle Wall `mc006` (7×4.6×2.1), Wall Corner `mc001`,
   Wall Tower `mc003`, Breached Wall `mc009` + Ruined Wall `mc010` (labeled destruction phases, placed
   as battle-scarred flavor for now), Weapons Rack `oc6094-1`, Armory Stand `oc6032b4` — plus the
   **War Banner** (`18_l7196300`) in Windows & Decor, and Phase 24B's **Stockpile** in Essentials.
2. [TODO] **Still to come**: arches/rounded generated pieces audit; [COMPLETE] the 4 Road models as pavement
   (confirmed shipped — they're the actual road network newcomers/NPCs walk in on, `Road.tsx`, see L71
   below); [COMPLETE 2026-08-06, Wave 8] the remaining oc-series set pieces — Jail Cell `oc6094-2`,
   Jail Tower `oc6094b5`, Jewel Tower `oc6098b3` and Drawbridge Front `oc6098-1` are named Prefabs now,
   measured at the castle family's own k=0.05 (the generic pipeline's k=0.04375 sizes ×8/7) with the
   jewel tower scaled as a WHOLE piece to clear `MAX_STACK_HEIGHT`, which its true 15.84m would have
   failed forever; their generic `gen_` duplicates are deliberately left in place, exactly as
   `oc6094-1`/`oc6032b4` left theirs. **Verified live**: all four placed cleanly through the real build
   menu (search + tile + hold-click) for their real declared costs — Jail Cell stone 12/iron_bar 2,
   Jail Tower stone 20/wood 6/iron_bar 3, Jewel Tower stone 18/iron_bar 2/gold 40 (confirming the 12m
   rescale really is accepted by `evalPlacement`), Drawbridge Front stone 40/plank 16/iron_bar 6 (its
   19.2m width genuinely doesn't fit a tier-0 ±16m region — inherent to the piece, not a bug). Destructor/second Cannon/Animal audit;
   and [COMPLETE 2026-08-06, Wave 8] wall-CONNECTION logic — `game/walls.ts` reads the lab's
   `canConnectAsWall` (11 meshes) and the catalog's own `walls` category (the Palisade, which the lab
   never charted) and latches a wall-family ghost onto a standing piece's open END in
   `BuildController`'s `snapPoint`, with a gold seam drawn on the joint. The magnet reaches 1.5m,
   deliberately shorter than the shallowest wall's side-face attach point, so stacking a second course
   on top of a wall still works. The same module derives the connection GRAPH the trait data was
   collected for, which is what the Wave 8 fort check reports its longest run from.
   **Verified live, exact numbers, with a control**: a Castle Wall placed via the real build UI, then a
   Wall Corner ghost hovered ~0.8m off the true joint — plain per-piece grid snap would have landed it
   0.6m short of flush; it landed exactly at the wall's own attach point instead (`differsFromGrid` and
   `snappedFlush` both true), with a real gold-colored (`#e8c141`) mesh visible at the joint's exact
   midpoint. The same tile placed far from any wall landed on the untouched grid snap instead (the
   magnet only fires near an open end) — confirming the snap is a real latch, not the grid coincidentally
   agreeing. The two constructed pieces reported `longestRun = 2` from the connection graph, i.e. read as
   one joined run.

---

## 📋 User-reported batch (2026-07-19) [COMPLETE]

1. [COMPLETE] ✅ **Other maps visible above the homestead — FIXED 2026-07-19.** Root cause was NOT the instance
   dressing (CourtDressing/GuildHalls/BattleDome/CedricCamp/TemplateWorld were all already correctly
   gated on `destination`) — it was `PlacedBuilding` carrying no notion of which world it belonged to
   at all. Any structure built on a claimed remote plot stored only raw world-absolute x/z/y, and
   `Buildings.tsx` rendered every entry in `st.buildings` unconditionally — so a remote outpost's
   structures rendered from the homestead too, floating wherever that destination's real (often
   elevated) coordinates happened to place them relative to the camera. Fixed with a new
   `PlacedBuilding.world` field (absent/null = home), stamped at every creation site
   (`placeBuilding`/`placeBlueprintAt`/`finishMove`), and a `isHomeBuilding()` helper now applied
   everywhere a homestead-only system counted or searched buildings: `Buildings.tsx`'s render filter,
   `Minimap.tsx`'s building dots + Grand Keep icon, `checkVillagerArrival` + the Roster's "you have N
   structures" text, `collectTaxes`, the raid trigger, `tickVillagers`'s builder/stall/stockpile
   passes, and Villagers.tsx's bed-seek/farmplot/stall/campfire searches (some of these were bare
   `.find()` calls with no distance check at all — a remote farmplot built before the home one would
   have silently become a farmer's worksite). Verified: a torch built at home stamps `world: null`, one
   built on a claimed template-02 plot stamps `world: "template-02"`, and every home-only count/search/
   render correctly excludes the remote one (roster text, minimap, raid-trigger count all confirmed).
2. [COMPLETE] ✅ **NPC equipment paperdoll + Armory (v1) — SHIPPED 2026-07-19.** A new homestead **Armory**
   (`GameState.armory`, full save persistence) holds spare gear separate from the player's own
   Satchel — stocked by raid-beaten-back rewards (40% chance of a helmet or chestplate), guaranteed
   gear from a Sealed Crypt full clear, or donated straight from the Satchel (`donateToArmory`). Every
   villager (not just defenders) can wear a **Helmet** and **Chestplate** from the Armory — pure flavor
   for laborers, a small HP bonus (+3/+6) for defenders on top of Shieldwall/Courage — rendered via the
   same `HeldHelmet`/`Chestplate` portal components the player already uses, now wired into both
   `VillagerFigure` and `DefenderFigure`. New paperdoll (`NpcEquipPanel.tsx`, opened via a 🎽 Equip
   button on each Roster row): the same `RotatablePreview` + portal pattern as the player's own
   Equipment section, showing the villager actually wearing their current loadout AND armor, with
   click-to-equip/unequip slots backed by `equipVillagerGear`/`unequipVillagerGear` (decrements/
   refunds the Armory pool, refuses cleanly when stock is empty, no double-equip). **Real HTML5
   drag-and-drop**, not just click: drag an Armory tile onto a villager's slot to equip; the player's
   own weapon tiles (Panels.tsx `EquipmentSection`) are now `draggable` too — drag a Satchel weapon
   onto the Weapon row to switch, same effect as clicking. Roster rows show 🪖/🦺 badges for what's
   currently worn. Verified end-to-end (economy math, empty-armory refusal, double-equip no-op,
   simulated native drag events for both the villager slot and the player weapon row, paperdoll UI,
   worn gear rendering) with zero page errors.
   **Deferred to a later pass** (full "vastly redesign inventory menu" scope): drag-and-drop for the
   generic Satchel grid itself (food/potions — no slot concept applies, lower value), a weapon/armor
   pool for villagers beyond helmet/chestplate (sword/shield/bow are still the free, itemless loadout
   choice — intentionally unchanged, see Phase 19 notes), and per-defender combat-bonus tuning pass.
3. [COMPLETE] ✅ **Quest Log overhaul — SHIPPED 2026-07-20.** Replaced the old flat 11-entry list with
   `QuestLogPanel.tsx`: **The Main Chronicle** (the linear story quest, unchanged progression logic)
   sits at top, followed by one **collapsible region** per realm that actually has a side-quest giver
   — derived live from `NPCS` (grouped by `.world`), so it never drifts out of sync with the NPC
   roster. Each region auto-expands on first open if it holds your currently active errand. Within a
   region, each giver shows their reputation title, their active errand (with live progress) if it's
   yours, and their other pool quests as **informational availability** rows — no Accept/Turn-In
   buttons anywhere in the log. This was a deliberate call: accepting/turning in a side quest still
   requires physically standing in front of the giver (DialoguePanel/ParleyPanel unchanged) — the log
   is a reference tool, not a shortcut around the Kingdom of Instances' whole "go there in person"
   design. Locked givers (not yet revealed) show a "revealed after completing '‹quest›'" hint instead
   of their pool. An **Active / All-incl.-completed** toggle filters the Main Chronicle's done steps;
   each of the three travel-beat quests now shows a **"→ Destination"** tag inline, reinforcing the
   regional framing even in the chronicle itself. Cedric's War Council only appears as a region once
   `alliance === 'cedric'` (no spoiler clutter otherwise).
   **Parchment styling, on request**: the panel FRAME stays the same stone-and-chrome shell as every
   other panel (tab bar, heraldic h2, close button) for navigational consistency, but the journal
   CONTENT is a deliberate exception — a warm mottled-vellum page (layered radial gradients + a subtle
   repeating-gradient paper grain), ink-brown serif text, small-caps ledger-style region headers with
   dashed dividers, dotted rules under giver names. A tasteful, contained "open journal inside a stone
   castle" flourish rather than reverting the whole dark-ages chrome pass.
   Verified headless: region count, locked→revealed transition (John of Mayne appears with his
   "Quartermaster" title after `cozy_beginnings`), the done/undone filter toggling exactly the right
   entry count, zero Accept/Turn-In buttons anywhere, and Cedric's region correctly gated on alliance.
4. [COMPLETE] ✅ **Mobile-friendly pass v1 — SHIPPED 2026-07-20** (tech debt). Real, working touch controls, not a
   stub: a virtual joystick (bottom-left) drives movement, a full-screen drag surface drives camera
   look, three thumb-sized buttons (Interact/Jump/Sprint) cover the rest — all bridged through a new
   `game/touchInput.ts` leaf module (same convention as `playerState`/`combatState`) that
   `TouchControls.tsx` (a 2D HUD overlay) writes into and `PlayerController.tsx` (a separate React tree
   under the Canvas) reads every frame via a new `pollTouch()`, structured as an exact mirror of the
   existing `pollGamepad()` — same `pad` record, same yaw/pitch refs, so every downstream
   `isDown()`/movement/look check already worked with zero further changes. Feature-detected
   (`'ontouchstart' in window || navigator.maxTouchPoints > 0`) so it's purely additive — renders
   nothing and touches nothing on a desktop without touch support. Added the missing Next 15
   `viewport` export (`layout.tsx`) pinning scale and blocking pinch-zoom, which would otherwise fight
   the joystick/look-drag. Responsive CSS pass: panels/build-menu/HUD corners reflow at a ≤720px
   breakpoint (94vw panels, a bottom-sheet build menu instead of the right rail, scaled-down HUD
   corners, the keyboard-hint box hidden since it's meaningless on touch) — desktop sizing untouched
   above the breakpoint. Verified on a real touch-emulated context (390×844, `hasTouch: true`): the
   joystick actually moved the player (11.94 units while held), the look surface actually rotated the
   camera, the interact button toggled cleanly across touchstart/touchend, panel width matched the
   94vw rule pixel-for-pixel, and — the regression guard — a parallel desktop (no-touch) context
   rendered zero touch UI and left `touchState.active` false.
   **Deliberately NOT attempted in this pass** (flagged rather than rushed): touch support for the
   aerial Build View's point-and-click/pan/zoom camera (a separate, more complex mouse-driven system);
   per-panel responsive fine-tuning beyond the one global breakpoint (some panels — the Quest Log's
   parchment journal, the NPC equip paperdoll — could still use bespoke narrow-viewport polish); and a
   Settings toggle to force touch controls on a hybrid touchscreen-laptop (auto-detect only, for now).
5. [COMPLETE] ✅ **Real wall collision — SHIPPED 2026-07-20.** The mc-series prefab walls/towers were colliding
   as one box spanning their FULL declared footprint at every height, so a player could never approach
   closer than the WIDEST point anywhere on the piece — usually a corbelled ledge or (for the Wall
   Tower) a genuinely projecting upper gallery, confirmed by Y-sliced vertex sampling of the real
   GLBs (a one-off profiler, same accessor-parsing technique as the earlier bbox tool): mc003's base
   shaft is ~80% of its declared width/depth with a real overhang starting right around head height;
   mc006's core shaft is ~50% of its declared depth, offset well inside the full footprint. Added
   `WALL_CORE`/`collisionBoxesFor()` (`data/buildables.ts`): pieces in the table split into a narrow
   "core" box (spanning 0 to a tuned `coreHeight`, ≥1.8 world units so the existing `passesOverhead`
   escape hatch cleanly takes over above it) plus the original full-footprint box for whatever's
   above — reusing the EXACT same canStepOnto/passesOverhead logic per sub-box, just applied to each
   independently. Pieces absent from the table get exactly one box spanning the full height, bit-for-
   bit identical to the old behavior (zero risk elsewhere). Verified headless by walking the player
   into a placed Wall Tower, Castle Wall, and a plain Torch (control, no override): the tower and wall
   let the player approach 0.35–0.5 world units closer than the old math would allow (matching the
   tuned fractions exactly — 1.85 vs 2.2, 0.98 vs 1.5), while the control torch's stopping distance
   matched the ORIGINAL single-box formula bit-for-bit (0.80), confirming no regression for any
   buildable without an override. A screenshot standing at the new resting distance shows the
   player right up against the tower's real narrower base, with its projecting overhang visible above.
   **Not yet covered**: the 12 unverified "Walls" category generated bricks (memory already flags
   these as crenellation toppers, not flat panels — needs its own geometry pass before extending this
   treatment there). ~~and actual walkable-parapet access~~ — **closed 2026-08-06 (Wave 8)**: the keep's
   wall walk is real floor (`keepWalkwayAt`) and the Siege Stair is the way onto it. Placed wall
   pieces have always been standable via `floorHeightAt`'s `canStandOn` check; what was missing was
   ever getting up there, and a ladder leaning on one now does it.
6. [COMPLETE] **GUI overhaul** ("boxy and square") — user will supply a reference GUI to learn from; hold for
   that, then a full visual pass.
7. [COMPLETE] ✅ **Beda & Alric now have a purpose — SHIPPED 2026-07-20.** They were pure flavor (a greeting,
   empty `sideQuests: []`) — now each offers a one-time **recruitment** in their existing dialogue:
   Alric asks for 6 wood ("I've farmed longer than you've been alive"), Beda for 6 stone, and either
   joins the roster outright as a real Villager — Alric as a Farmer, Beda as a Miner — bypassing the
   usual bed/building gate entirely, since they already live in their own huts (`StarterVillage.tsx`).
   They start with `tradeXp: 120` (mastery **Level 2**, not a green recruit — reflecting an established
   trade) and are immediately eligible for their first companion trait slot. Once recruited they stop
   rendering as a standalone flavor NPC (`Npc.tsx`'s filter now excludes any NpcDef whose id already
   matches a roster Villager) AND stop being interactable at their old post (the same filter applied to
   `PlayerController`'s home NPC interaction scan — without this, "Talk to Alric" kept offering at his
   empty post after he'd joined, a real gap caught in testing) — from then on they're managed purely
   through the Roster panel like any other recruit, exactly as intended. New store action
   `recruitVillageFolk()`, still counts toward `MAX_VILLAGERS` like any other villager (a real trade-
   off: taking them early spends 2 of your 6 roster slots). Verified headless: refuses cleanly with no
   materials, joins correctly with the right job/mastery once affordable, Alric's old post no longer
   offers any prompt, Beda (not yet recruited) is completely unaffected with her own offer intact, and
   the Roster panel shows him as "Farmer — Lv 2" with a trait slot already open.
8. [COMPLETE] ✅ **Station-specific crafting menus — SHIPPED 2026-07-20.** `CraftingPanel` now opens on a
   **station tab bar** (By Hand / Workbench / Forge / Campfire) instead of one flat 18-recipe list —
   each tab shows only that station's own recipes, and the tab you land on defaults to wherever you're
   actually standing (`nearStations[0]`, falling back to By Hand), with a small green proximity dot on
   any tab you're currently near. Tabs stay browsable even from a distance (a "stand near a Forge to
   craft these" hint replaces the button-disable-only treatment), so you can still plan ahead. Added a
   **text search** (matches recipe or output item name), a **sort control** (Default / A–Z / Craftable
   First), and a **Hide unavailable** toggle for cutting through a busy station (the Workbench alone
   still has 7 recipes). The Repair section moved from always-visible to living inside the Workbench
   tab specifically, matching where repairs actually happen. Verified headless: default tab is By Hand
   with exactly 1 row fresh; each tab's row count matches its station's real recipe count (7/5/5/1);
   Repair is absent under Forge, present under Workbench; the craftable-first sort and hide-unavailable
   filter both work; and standing near a placed campfire correctly flips the default tab to Campfire.

## 🧱 Build menu relocated + filtered — SHIPPED 2026-07-20 [COMPLETE]

User-requested: move the build piece picker off the bottom bar onto the right rail (the minimap
already hides during build mode, leaving that whole side empty) and add real tabs/filtering — the
same "way too convoluted" complaint as crafting, same fix shape. `BuildBar.tsx`/`.build-menu` now:
- **Right-side vertical panel** (`top:118px; right:14px; bottom:16px; width:300px`) instead of a
  bottom-center horizontal bar.
- **2-column category tab grid** (Essentials/Prefabs/Defense/Walls/Bricks/Windows & Decor/Towers &
  Roofs/Blueprints) with a **live piece count per category** instead of one long single-row strip.
- **3-column vertical-scrolling item grid** replacing the old horizontal-scroll row (much more
  browsable — Towers & Roofs alone has 37 pieces).
- **Sort** (Default / A–Z / Affordable First) and **Hide unavailable** toggle, mirroring the crafting-
  panel toolbar exactly for UI consistency across both "convoluted list" fixes.
- Search still searches the full catalog across all categories, unchanged.
Verified headless: panel sits flush against the right edge, tab counts render, search/sort/hide-
unavailable all filter correctly. One instructive non-bug found in testing: a brand-new character
hiding unavailable pieces on the Bricks tab sees "No pieces match" — correct, since Bricks requires
the `building2` unlock granted by completing Cozy Beginnings, not a fresh-game default; confirmed by
granting the unlock + materials and seeing all 26 pieces appear.

---

## 🔧 Phase 22 — Polish batch (user-reported 2026-07-19) — ✅ ALL SHIPPED same day [COMPLETE]

**Bugs (each verified in a headless smoke run):**
1. [COMPLETE] ✅ **Creator hands detached** — root cause was NOT parenting (hands correctly ride the arm joints):
   `rehangArm` rotated the arm mold to the neutral hang but only *translated* the hand to a computed
   wrist point, leaving it at the donor's baked-gesture angle with a visible gap. Fix: the hand is now a
   rigid `riders` passenger through the arm's full rehang transform (same rotation + translation), so it
   stays seated in the sleeve exactly as the donor baked it. Verified in both creator poses.
2. [COMPLETE] ✅ **Spring cascade flowed UP** — visible pattern motion is opposite the UV offset drift; the cascade's
   `offset.y -= dt` scrolled the water upward. Sign flipped (brook was already correct).
3. [COMPLETE] ✅ **Villagers piled onto one bed / napped before beds existed** — night bed-seek now assigns one
   sleeper per *finished* bed by stable rank; anyone without a bed of their own (including zero beds
   built) turns in at their own home spot. Verified: 2 sleepers + 1 bed → exactly one walks to it.
4. [COMPLETE] ✅ **Defender patrol was static** — free-roaming defenders now walk a real circuit (radius 15 around
   the homestead, radius 6 around their station; tower watch stays put — that's the point of the tower),
   phase-seeded per defender so they spread out, and they engage ANY hostile spotted within 22 units of
   *themselves* (night skeletons/wolves included), not just raid enemies near the fixed post.
5. [COMPLETE] ✅ **Flower/herb nodes overlapped** — min-separation lock (≥8 units apart, ≥3 from trees, pond shore
   clear) plus an RNG yield of 1–10 picks per patch (`hitsLeft`, respawns re-roll); richer patches render
   slightly bigger. Verified: min pairwise distance 12.5, varied yields.
6. [COMPLETE] ✅ **Weather bled across travel** — `Weather.tsx` resets the spell state machine on every destination
   change (rain/mist snap to clear + fresh roll), so each instance is its own weather entity. Verified:
   forced storm at home → template-02 arrival is clear.

**Features:**
7. [COMPLETE] ✅ **One-stop tabbed menu** — `MenuTabs.tsx`: the six menu-family panels (Satchel I / Crafting C /
   Quests J / Abilities K / Roster N / Lore L) share a tab bar with hotkey chips; press I and hop between
   all of them without closing. Hotkeys still deep-link. Contextual panels (dialogue/shop/travel/parley/
   guild/emotes) stay standalone. *Follow-up idea:* fold Stats/Deeds screens in as tabs too.
8. [COMPLETE] ✅ **Character callings (class system v1)** — `data/classes.ts`: 8 callings picked at creation
   (Wanderer/Woodsman/Quarryman/Angler/Farmhand/Artisan/Smith's Prentice/Squire), each with a starting
   kit on top of the classic axe and a signature skill earning +10% XP forever (stacks with Quick Study +
   tier-1 talents). `CharacterConfig.classId`, persisted with the character; older saves = no calling.
   Verified: Squire starts armed, combat XP 10→11, other skills unboosted. *Future:* calling-exclusive
   dialogue/quest hooks, trade-off perks tie-in.

---

## ✅ AI wave 2 + the champion/companion progression layer (shipped 2026-07-19) [COMPLETE]

**Advanced AI wave 2 (all verified headless):**
- **Enemy-vs-defender combat is real** — any home hostile (raider, skeleton, wolf) that finds a sworn
  defender closer than the player fights THEM: chases, strikes (`defenderState.hp` damage, knockdown +
  notify), and the defender fights back through the existing order AI. The old passive "retaliation
  tax" in Defenders.tsx is gone; tower elevation now protects by enemies skipping elevated defenders
  entirely. Verified end-to-end: spawned bandit pressured the warden (24→22.5 hp) and was cut down.
- **The camp rallies** — striking one hostile sets a 12s `alertT` on every fellow within 40 units,
  pulling them into the fight beyond the normal 26m leash (Cedric's camp guards now come as a pair).
- **Pack separation** — enemies shoulder apart from packmates (repulsion inside 1.1u), so with wave 1's
  flanking a group closes as a surrounding line, never a stacked column.
- **Villager daily rituals** — unassigned villagers browse the Market Stall at midday and gather round
  the campfire in the evening, each at their own hash-offset spot.
- **The dragon is ARTICULATED** — the omen now loads the OBJ (kept per-part `o` names) and slices it by
  the verified Grok rig map (`l7517400_rig.json`): wings hinge at their body-side roots and beat, the
  tail trails the beat, the head scans. Two-frame visibility swap retired.

**Champion attributes (the player's own attribute layer):**
- `data/playerAttributes.ts` — the same five attributes as villagers, but INVESTED: one point per 4
  total skill levels, spent in the Abilities panel (`attrSpent` through full save persistence).
  Might +1 melee dmg/2pts · Diligence +4%/pt bonus tree/vein yield · Craft +4%/pt double craft batch ·
  Courage +5 max stamina/pt · Wit +4%/pt sale prices. Verified: Courage spend = exactly 105 stamina.
- [COMPLETE] ✅ **Attribute respec** (the follow-up below, built Wave 9 pass A): `respecAttributes()` +
  a two-click arm/confirm button in the Abilities panel's Attributes section. **Full reset, scaling gold
  cost** (`respecCost` in `data/playerAttributes.ts`, 25 base + 15/point), both argued in that file.
  Full-reset because investing is already one point at a time — a per-point refund is just the `+` button
  with a minus sign, and would let a player shave a point off Might before a fight and put it back after
  for almost nothing. Scaling because this economy's other gates (guild tithe, land tiers, talents) are all
  flat, and a flat fee here would be trivial for a champion undoing twenty points and punishing for one
  undoing two — so this is deliberately the codebase's first scaling cost, flagged as a judgment call. No
  migration needed: `attrSpent` was always an ordinary save field and every consumer reads it live with
  `?? 0`, so combat/yield/price/craft all correct themselves on the next read.

**Companion trait trees (every villager's own mini skill tree):**
- `data/companionTraits.ts` — per-job pools (defender Shieldwall/Riposte/Longshot; gatherers
  +1-haul / double-side-goods / Swift Return; merchant Silver Tongue/Quick Deals; builder Steady
  Hands). One slot per 2 mastery levels in the current trade (defenders use combat level), chosen in
  the Roster, persisted on `Villager.traits`, stacking with innate attributes + mastery. Verified:
  Deep Cut lumberjack hauled exactly 3 wood.

*Follow-ups: ~~attribute respec (gold)~~ (done, Wave 9 — see above), defender formations by loadout,
courtiers watching duels.*

---

## 🐉 The Dragonfire Siege — ✅ SHIPPED 2026-07-19 [COMPLETE]

The deferred stage-2 dragon event, now real: once the omen (`dragonSeen`) has been witnessed and the
homestead has ≥2 built structures, deep nights can bring the beast DOWN instead of just crossing the
sky (`DragonSiege.tsx`, one dragon in the air at a time — shares the `dragonAir` busy flag with the
ambient omen flyover). For up to 55 seconds it wheels low over the homestead on its now-articulated
wings, breathing fire on a random **wooden** structure every ~6 seconds — `flammable(type)` compares a
buildable's wood vs. stone cost, so straw-and-timber burns while stone shrugs it off, the mechanical
payoff for building in stone at the top tier. A caught structure takes real damage through the
existing `damageBuilding`, and can be destroyed outright (verified: a wooden campfire burned to
nothing after two breath cycles).

**The Castle Wall prefab degrades through its own labeled damage states** — `mc006` (intact) →
`mc009` (breached) → `mc010` (ruined) at 50%/30% HP thresholds, exactly the destruction-phase molds
the Grok rig lab identified for this piece, so a besieged wall visibly crumbles in the right shape
instead of just losing an invisible HP bar.

**Real counterplay**: any crossbow/longbow bolt passing within 4.5 units of the beast stings it; five
hits force an early rout (`hits.current >= HITS_TO_ROUT`). Two outcomes, both survivable, both tracked:
- Weather the full 55 seconds → **"Flame and Stone"** Deed, `dragonSieges` incremented.
- Sting it down early → **"Sting the Sky"** Deed, `dragonRouted` flag set (both stack across repeats).

Verified end-to-end via the `window.__kkSiege` test hook: pre-omen the siege never fires; post-omen
with 2 buildings it fires within budget; dragonfire destroyed the wooden test structure while leaving
the stone Castle Wall untouched; both the survive-it and rout-it endings recorded their Deeds and
counters correctly. Also fixed in passing: the dragon MTL's one texture (`spr001_128x128.png`, its eye
sprite) was never copied by `prepare-assets.mjs`, spamming a 404 every siege/omen — copied + wired.

*Follow-ups: fire visibly spreading structure-to-structure, a repair/rebuild prompt after a ruin,
villagers reacting (fleeing, defenders rallying) to the siege specifically rather than generic combat.*

---

## 📋 User-reported batch (2026-07-20, major workflow overhaul — logging before fixing) [COMPLETE]

1. [COMPLETE] **Character Callings start too equipped.** "Squire" as a starting Calling collides with the EXISTING
   earned rank ladder (`ranks.ts`: Peasant → Laborer → **Squire** (Lv8) → Knight → Paladin) — you
   shouldn't be able to just pick "Squire" at creation. Every Calling should start completely
   bare-handed/kit-less (a true farmhand/everyday-person start) and the signature-skill XP bonus should
   be the ONLY differentiator; the player earns their way up the existing rank ladder from Peasant.
2. [COMPLETE] **Start bare-handed entirely** — no starting axe, no calling kit items at all. (Verified this is safe:
   `harvestNode`/`useTool` never actually gate on OWNING a tool, only on its condition — durability
   defaults to 100 whether you own zero or one, so gathering already works tool-less mechanically.)
3. [COMPLETE] **Panels visibly jump/resize** ("moving all over the place... especially quests") — `.game-panel`/
   `.panel` center via `top:50%;left:50%;transform:translate(-50%,-50%)` with only a `max-height`, so
   any content-height change (switching crafting tabs, expanding/collapsing quest regions) re-centers
   the whole panel at its new size. Needs a fixed height with internal scroll instead.
4. [COMPLETE] **Building has a visible hitch before the model appears**, and the SAME hitch happens on day→night
   skeleton spawns — almost certainly synchronous GLTF parse cost on first use of a given model this
   session (Suspense fallback covers it visually but the parse itself can still stall the main thread).
   Needs upfront preloading (`useGLTF.preload`) for commonly-spawned models (buildings, skeletons, the
   dragon) rather than paying the cost mid-play.
5. [COMPLETE] **"Press E to use" auto-opens the item immediately after building it** — likely the same interact
   prompt firing the instant construction completes, right where the player is already standing/aiming.
6. [COMPLETE] **Building placement should be hold-left-click** (like mining/chopping), not an instant single click,
   for better game feel and to avoid the jarring instant-pop building noted above.
7. [COMPLETE] **Need a "set active" for quests AND errands** — right now the HUD tracker auto-shows whatever the
   store computes as "the" active quest with no player choice, and side-quests/errands have no
   pinned/tracked state at all.
8. [COMPLETE] **Resource nodes "spam" multiple small pickups** — chopping/mining currently take several swings,
   each its own small notification. Should be ONE harvest action yielding a single random predefined
   amount ("you got 4 wood!"), not a drip of +1s across several hits.
9. [COMPLETE] **Alric auto-spawn collision (real bug)** — `VILLAGER_NAMES` still lists `'Alric'` and `'Beda'` as
   candidate names for the AUTOMATIC villager-arrival system (`checkVillagerArrival`), so building your
   first bed can spawn a GENERIC auto-arrival coincidentally also named "Alric" — a confusing duplicate
   of the real recruitable farmer. Remove both names from the auto-arrival pool.
10. [COMPLETE] **Station interaction should open a FOCUSED quick-menu**, not the full tabbed Crafting book — walking
    up to a Campfire and pressing E should show only the Campfire's own recipes, not an invitation to
    browse Forge/Workbench/Bricks too.
11. [COMPLETE] **Shield viewmodel is backwards** — right-click block in first person shows the lion face; should
    show the shield's BACK (the arm strap/hook), since that's what the wielder's own eyes would see.
12. [COMPLETE] **Dragon flies too far out** — the omen's flight path (±230 on X) exceeds `WORLD_HALF` (200), so it
    can read as flying "outside the map" into unpopulated distance. Bring the path in tight around the
    homestead's actual footprint.
13. [COMPLETE] **Villagers should only work set hours (5 AM – 8 PM)**, not 24/7 — `tickVillagers` currently has no
    time-of-day gating at all.
14. [COMPLETE] **HUD keyhint clutter** — the permanent top-right control reminder should move into the Satchel/
    inventory panel (or similar reference spot) instead of sitting on screen at all times.
15. [COMPLETE] **Defenders/villagers start fully armed for free** — contradicts the whole point of the new Armory:
    a defender should start BARE-HANDED with only basic armor, and the player should have to supply
    real weapons (sword/shield/halberd/crossbow) through the Armory over time, same as helmet/chestplate
    already work. This is the big one — extends the existing Armory system to cover weapons too.

Fixing one at a time below, verifying each, in roughly this order: quick/contained bugs first (9, 12,
11, 3, 14), then medium systems (8, 13, 7, 10, 4/5), then the two big reworks (1/2 Calling, 6 hold-to-
build, 15 Armory weapons) — whichever this session has room to reach will be marked ✅ individually.

### ✅ Quick/contained bugs shipped (9, 12, 11, 3, 14) [COMPLETE]

- [COMPLETE] **#9 Alric/Beda auto-spawn collision** — `VILLAGER_NAMES` (`src/game/data/villagers.ts`) no longer
  lists `'Alric'`/`'Beda'`; those names are reserved for the recruitable `farmer_alric`/`miller_beda`
  NPCs. The generic auto-arrival pool is now `['Cuthbert','Edda','Godwin','Hilda','Osric','Wynn']`.
- [COMPLETE] **#12 Dragon flight bounds** — `DragonOmen.tsx`'s flight `from`/`to` tightened from ±230/±140 down to
  ±160/±110–120, comfortably inside `WORLD_HALF` (200) so the omen no longer reads as leaving the map.
- [COMPLETE] **#11 Shield viewmodel orientation** — `Viewmodel.tsx`'s `BlockShield` rotation gained `+ Math.PI`
  around Y (was showing the same face the third-person `ArmShield` shows an onlooker — the painted lion
  — instead of the inside/strap the wielder's own eyes would actually see when raising it to block).
- [COMPLETE] **#3 Panel jump/resize** — added a `.game-panel.menu-family` CSS modifier (fixed `width`/`height`,
  `overflow:hidden`) plus a `.panel-scroll` inner region (`flex:1 1 auto; overflow-y:auto`) so the six
  MenuTabs-family panels (Satchel/Crafting/Quests/Abilities/Roster/Lore, plus the Equip-villager
  sub-panel) hold one fixed footprint regardless of which tab/filter/collapsible region is open inside
  them. Applied to `PanelFrame` (Panels.tsx), `QuestLogPanel`, `VillagersPanel`, `ChroniclePanel`, and
  `NpcEquipPanel`. Contextual standalone panels (Dialogue/Shop/Travel/Parley/Guild/emote wheels) were
  left alone — they don't resize post-mount, so a fixed box would just waste space on them.
  Verified: a Playwright DOM `getBoundingClientRect()` comparison confirmed the `.game-panel` box's
  x/y/width/height are byte-identical when switching Crafting tabs (Workbench ↔ By Hand, wildly
  different recipe counts) and when expanding every Quest Log region at once.
- [COMPLETE] **#14 HUD keyhint relocated** — the permanent top-right keybind box is gone from `HUD.tsx`; the same
  reference list now lives behind a collapsed "🎮 Controls ▸" toggle at the bottom of the Satchel panel
  (`InventoryPanel` in `Panels.tsx`), off by default. `HelpStack.tsx`'s step 2 text updated to point at
  it instead of "the top-right box." `.controls-ref`/`.controls-toggle` are hidden on the mobile
  breakpoint (meaningless on touch, same as the old `.keyhint` rule it replaces).

Verification: production build clean, dev server restarted, and a Playwright smoke pass covering all
five confirmed no regressions (screenshots reviewed: HUD topright now shows only rank/clock/quest
tracker/minimap; the block-shield viewmodel shows a plain unadorned back panel, not the lion face; the
crafting and quest-log panels hold their exact box across tab/filter/region changes; the Satchel's
Controls toggle reveals the key list on click). Temp test script deleted after use per the usual
workflow.

### ✅ Medium-system bugs shipped (8, 13, 7) [COMPLETE]

- [COMPLETE] **#8 Resource-node harvest consolidated** — `harvestNode` (gameStore.ts) no longer decrements a
  node's `hitsLeft` by one per call; a single call now loops the node's full remaining `hitsLeft`
  internally (same per-hit odds/bonuses as before — guild passives, talents, Diligence — completely
  unchanged), batches the total into one `addItems`/`addXp` call, and posts one `"You got 3× Wood Log,
  1× Wildflowers!"`-style notification. The node always fully depletes and starts its 35s respawn timer
  in that same single action — no more partial-hit state to carry between separate E-holds. Fishing was
  already a single bite-to-catch action and is unchanged. Bonus side-effect: `stats.nodesHarvested`
  (labeled "trees chopped"/"rocks mined" in Stats and the Woodcutter/Quarrier challenge tiers) was
  actually counting individual swings before this fix, not whole nodes — it now finally counts what its
  own label says, so challenge tiers (25/100/400) take the number of REAL trees/rocks they were always
  meant to.
- [COMPLETE] **#13 Villager work hours** — added `WORK_START`/`WORK_END`/`isWorkingHours()` (`data/villagers.ts`,
  5 AM–8 PM) and gated `tickVillagers`' entire body on it: outside those hours the whole function is a
  no-op (progress timers simply freeze, resuming exactly where they left off at dawn — no lost partial
  progress). Defenders are untouched by this gate entirely (they already `continue` out of this same
  loop; the night watch IS their job). Added a one-line explainer in the Roster panel so the pause isn't
  mysterious to the player.
- [COMPLETE] **#7 Set-active tracking for quests and errands** — new persisted `trackedQuest: 'main' | 'side'`
  field (full save-pattern: GameState/SaveGame/initial-state/newGame/loadFromSave/toSave) plus a
  `setTrackedQuest()` action. The HUD's `QuestTracker` now shows the Main Chronicle by default but
  switches to the player's active errand when `trackedQuest === 'side'` (a small ⚔/📜 swap button sits
  right in the tracker itself), and auto-falls-back to whichever exists if the other one doesn't (no
  active errand → always show Chronicle regardless of preference; Chronicle fully told → always show
  the errand, no toggle needed since there's nothing to switch to). The Quest Log panel also grew a
  "📌 Track" pin button next to both the active Main Chronicle entry and the active errand entry, so the
  same choice is available from the full journal, not just the HUD's swap icon.

Verification: production build clean, dev server restarted. Smoke-tested #8 by calling `harvestNode`
directly on a live tree/rock/herb node and confirming a single chunky gain + notification + full
depletion in one call (no more multi-hit drip). Smoke-tested #13 by forcing `worldEnv.time` to a night
value and confirming `tickVillagers` left progress/inventory byte-identical, then forcing a day value
and confirming progress ticked down normally. Smoke-tested #7 by accepting a real side errand, toggling
`trackedQuest` via both the HUD swap button and the Quest Log's pin buttons, and confirming the store
state + rendered tracker content flip correctly each time. All temp test scripts deleted after use.

### ✅ Station quick-menu + preload/auto-open fixes shipped (10, 4, 5) [COMPLETE]

- [COMPLETE] **#10 Focused station quick-menu** — new `StationMenuPanel.tsx`: a small standalone contextual panel
  (no MenuTabs, no station-tab bar — same "contextual, no tab bar" family as Dialogue/Shop/Parley)
  showing only the ONE station's own recipes (plus its Repair section, for the Workbench), with a
  single "🔨 Open full Crafting book" button at the bottom for anyone who does want to browse every
  station. Wired via a new transient `activeStation` field + `openStationMenu(station)` action (same
  `dialogueNpc`-style pattern as `equippingVillagerId` — session-only, never persisted) and a new
  `'stationMenu'` `PanelId`. `PlayerController.tsx`'s station interact branch now calls
  `openStationMenu(t.station)` instead of `setPanel('crafting')`. `STATION_TABS`/`UNLOCK_HINTS` moved
  from Panels.tsx into `data/recipes.ts` as shared canonical constants (both the full book and the new
  quick-menu need them).
- [COMPLETE] **#4 Upfront asset preloading** — new `game/preload.ts`: `preloadCommonAssets()` (called once from
  `GameScreen`'s mount effect) warms every buildable's GLB via `useGLTF.preload()` and every enemy
  kind's minifig donor (skeleton/bandit/gilbert/cedric/storm/royal) via `loadDonor()`, plus the dragon's
  OBJ rig via `loadDragonRig()` — all of these already cache internally (a `Map`/promise keyed by
  url/id), so warming them once at game start means the SAME cached result serves the real first
  in-play use, instead of paying that parse cost right when a just-finished building should pop in or
  the session's first skeleton rises.
- [COMPLETE] **#5 "Press E to use" no longer auto-opens the just-built item** — traced to a real bug: finishing
  the LAST hammer swing on a construction site (a hold-to-act, duration>0) could reveal a brand-new
  INSTANT (duration 0) "Use X" target at the exact same spot, on the exact same still-held key, since
  the interact system re-evaluates its target fresh every frame with no cooldown between a completed
  hold action and a freshly-revealed different one. Fixed with a narrow, precise guard in
  `PlayerController.tsx`: remember the `(id, kind)` of whatever hold-action just completed
  (`holdJustCompletedId`/`holdJustCompletedKind`), and block firing a NEW target that shares the same id
  but a DIFFERENT kind until E is released and pressed again — same id + same kind (continuing to hold
  through a multi-swing build, or repeated quintain training) is untouched and still fires every
  `duration` seconds exactly as before, since that's a legitimate continuous-hold rhythm, not the bug.

Verification: production build clean, dev server restarted. Smoke-tested #10 by placing a built campfire,
pressing E, and confirming `panel:'stationMenu'`/`activeStation:'campfire'` with no `.station-tabs` or
`.menu-tabs` in the DOM (only that station's 5 recipes + the "open full book" button), then confirming
that button correctly switches to `panel:'crafting'`. Smoke-tested #4 by confirming zero page errors
right after game start (preload running clean). Smoke-tested #5 by placing an UNBUILT campfire, holding
E continuously through both hammer swings, and polling the live store every 150ms across the whole
hold: confirmed the panel stays `'none'` indefinitely past the build-completion moment while E remains
held (`targetKind` correctly flips to `'station'`, `blockedTransition` correctly reads `true`), and only
opens once E is released and pressed again. (First test pass gave a false alarm from the test's own
early-break polling logic catching a single transitional frame — refined the poll loop to run its full
course before concluding anything, a good reminder that a "stale-looking" read can be the test's own
timing artifact rather than a real bug; confirmed clean after removing the early break.) All temp debug
hooks and test scripts removed after use.

### ✅ Calling rework shipped (1, 2) [COMPLETE]

- [COMPLETE] **#1 "Squire" no longer collides with the earned rank** — the Calling's internal `id` stays `'squire'`
  (invisible to the player, and changing it would silently drop the signature bonus for any existing
  save's `classId`), but the DISPLAYED name is now **"Page"** — the real historical rung before squire,
  which reads better than just avoiding the collision: you start as a page dreaming of the sword, and
  EARN Squire later through the existing rank ladder (`ranks.ts`: Peasant → Laborer → Squire Lv8 →
  Knight → Paladin).
- [COMPLETE] **#2 Every Calling starts completely bare-handed** — `data/classes.ts`'s 8 `ClassDef.kit` objects are
  now all empty; `newGame` (gameStore.ts) no longer merges a kit OR grants the old starting axe
  (`inventory: {}` outright). The signature skill's +10% XP is the only thing a Calling grants now,
  confirmed mechanically safe beforehand (`harvestNode`/`useTool` never gated on tool OWNERSHIP, only
  condition/durability, which defaults to 100 whether you own zero of a tool or one).
- [COMPLETE] Two real UI bugs this surfaced, both fixed: `CharacterCreator.tsx`'s "Begins with: {kit list}" line
  would have rendered as a dangling empty list for every single Calling now — replaced with a single
  explanatory line ("Everyone starts bare-handed... a calling only grants a lasting +N% skill XP").
  `Viewmodel.tsx`'s FPS tool-selection `useMemo` defaulted to `'axe'` UNCONDITIONALLY whenever nothing
  more specific applied — harmless before (everyone genuinely owned an axe), but with bare-handed start
  it would show a floating axe in the player's fist despite owning none. Fixed by checking real
  ownership (`inventory.axe/hammer > 0`) before returning each tool kind, falling back to `'fist'` (no
  matching render branch — just the bare arm+hand mesh already drawn) otherwise. The third-person avatar
  and the Satchel's paperdoll were already correctly ownership-gated and needed no changes.

Verification: production build clean, dev server restarted. Smoke-tested by walking through the REAL
character creator (not just injecting store state): confirmed the calling grid shows "Page" not
"Squire", confirmed a fresh game's `inventory` is genuinely `{}` with `classId:'squire'` preserved
internally, confirmed the FPS viewmodel shows bare hands (no floating axe) on a fresh spawn, and
confirmed chopping a real tree bare-handed via an actual held-E interaction still yields wood normally
(3 wood from one chop) with zero errors. Temp test script deleted after use.

### ✅ Hold-to-place building shipped (6) [COMPLETE]

- [COMPLETE] **Building placement now requires a deliberate hold (0.4s), mirroring mining/chopping's feel**, instead
  of an instant single click "popping" a piece into being. `BuildController.tsx`: a `mouseDown` ref
  (set on `onPointerDown`/cleared on `onPointerUp`/`onPointerLeave` on the pointer-catcher mesh, plus a
  window-level `pointerup` safety net so a release over UI doesn't leave it stuck) drives a `useFrame`
  accumulator (`holdTime`/`holdCellKey`) that commits the placement once `PLACE_HOLD_SECONDS` (0.4) is
  reached — moving the cursor to a DIFFERENT snapped cell mid-hold restarts the hold on the new cell
  instead of carrying progress over, the same "target changed → reset" rule the FPS hold-to-act system
  already uses for gathering. The ghost ITSELF is the progress indicator: its 3D box rises from a small
  fraction toward full height as the hold advances (footprint outline plane stays full-size throughout,
  so the landing spot is always clear) — no separate progress-bar UI needed. Applies to both single-piece
  and blueprint-stamp placement.
- [COMPLETE] **The move tool (relocating an already-built piece) deliberately stays an instant click** — it has no
  "popping into being" moment to soften, so adding a hold there would just be friction with no payoff.
  Distinguishing the two: `onPointerDown` checks `moving` first and calls `finishMove` immediately if so,
  only arming `mouseDown` for the hold-driven path otherwise (and only when something is actually
  selected to place — a bare pickup-tool click on an existing building, handled by `Buildings.tsx`'s own
  `onClick`, is explicitly left alone rather than pointlessly arming dead hold state).
  `HelpStack.tsx`/`BuildBar.tsx`'s in-game help text updated from "click to place" to "hold to place"
  (the BuildBar banner text was ALSO still stale from the earlier build-menu-relocation fix, which had
  moved the category tabs to the right rail without updating this line — fixed both in the same pass).

Verification: production build clean, dev server restarted. Smoke-tested by selecting a piece, doing a
genuine quick click (mouse down+up within ~80ms) and confirming zero buildings were placed, then holding
past the threshold and confirming exactly one building appears — checked at the midpoint of the hold too
(still zero, proving it isn't front-loaded or racing). Screenshots confirm the ghost box visibly rising
mid-hold. Temp test script and screenshots removed after use.

### ✅ Armory weapons shipped (15) — the big one, batch complete [COMPLETE]

Defenders/villagers no longer start fully armed for free — the whole point of the Armory (helmet/
chestplate, shipped 2026-07-19) now extends to real weapons too, matching how gear already worked.

- [COMPLETE] **A defender starts completely bare-handed** — `Defenders.tsx` no longer defaults `villager.loadout`
  to `'sword_shield'`; `undefined` means fists only (no weapon portal rendered at all, matching the
  bare-handed player viewmodel fix from item #2), at a distinctly weaker melee damage tier (`meleeBase`
  1 instead of 3 — real incentive to arm them, not just flavor).
- [COMPLETE] **`setDefenderLoadout` now spends real Armory stock** instead of being a free toggle: a new
  `LOADOUT_REQUIRES` table (`data/villagers.ts`) maps each loadout to what it costs — `sword_shield`
  needs 1 sword + 1 shield, `halberd` needs 1 halberd, `bow` needs 1 crossbow. The action checks stock
  first (refuses with a notify if short), refunds whatever the villager was PREVIOUSLY carrying back to
  the Armory, then spends the new requirement — the same pieces just move between "in the Armory" and
  "on a defender," exactly like helmet/chestplate already did. A new `unequipDefenderLoadout` action
  sends the current loadout back to the Armory and returns the villager to bare-handed.
- [COMPLETE] **`'halberd'` is now a real, trackable `ItemId`** (it never was one before — purely an NPC-exclusive
  visual mold with no crafting recipe) so it can be tracked as Armory stock, but it deliberately still
  has NO recipe of its own: it only ever enters play as guaranteed Sealed Crypt clear salvage (added
  alongside the existing helmet+chestplate guarantee). Raid-beaten-back loot (previously a 40% chance at
  helmet OR chestplate) now rolls from a 5-item pool (helmet/chestplate/sword/shield/crossbow) instead,
  so real weapons flow into the Armory from ordinary defense too, not just the dungeon.
- [COMPLETE] **VillagersPanel's Loadout row** now shows a "✋ Bare-handed" option (highlighted when actually
  unequipped) alongside the three armed loadouts, each showing a 🔒 and disabled state when the Armory
  can't afford it (tooltip spells out the exact cost and current stock either way). **NpcEquipPanel's
  Armory section** grew a parallel read-only weapon-stock display (sword/shield/crossbow/halberd counts
  + Donate-from-Satchel, mirroring the existing helmet/chestplate tiles) — deliberately NOT drag-to-slot
  like armor, since a loadout is a mutually-exclusive combo choice, not a simple per-slot toggle; the
  real equip action stays in the Roster's Loadout buttons, which already show cost/stock. Also fixed a
  second, easy-to-miss `loadout ?? 'sword_shield'` fallback inside NpcEquipPanel's own paperdoll render
  (would have shown a phantom sword+shield on a bare-handed defender in the equip-preview specifically,
  even after the main Defenders.tsx fix landed) — a reminder to grep for every occurrence of a pattern
  being removed, not just the first one found.

Verification: production build clean, dev server restarted. Smoke-tested the full state-machine
end-to-end via direct store calls: a fresh defender starts with `loadout: undefined`; attempting to
equip against an EMPTY Armory is refused (loadout stays unarmed); stocking the Armory and equipping
succeeds and deducts exactly the right items; switching to a different loadout refunds the first and
spends the second; unequipping refunds fully back to a clean starting Armory. Screenshots of the Roster
panel confirm the visual lock/unlock states render correctly (all three armed options 🔒'd against an
empty Armory, all unlocked once stocked, "Bare-handed" correctly highlighted as the active choice by
default). Temp test script and screenshots removed after use.

---

## 🏁 2026-07-20 batch complete [COMPLETE]

All 15 user-reported items from this session's batch are shipped: quick/contained bugs (9, 12, 11, 3,
14), medium systems (8, 13, 7, 10, 4/5), and the two big reworks (1/2 Calling, 6 hold-to-build, 15 Armory
weapons). Each item was fixed individually or in small disjoint-risk groups, verified with a targeted
Playwright smoke pass, checked against a clean production build, and shipped with a dev-server restart —
per the standing workflow (log first, fix one at a time, verify each, update ROADMAP + memory as you go).

### ✅ Follow-up: item #6 actually meant the CONSTRUCTION step, not just placement [COMPLETE]

User clarification after the fact: "hold-left-click" was meant for the post-placement hammer-swing
CONSTRUCTION step (walking up to a just-placed site in first person and building it), not only the
aerial build-mode ghost placement — that part still silently used "Hold E," which the user flagged as
the leftover E trigger that shouldn't still exist. Fixed:

- [COMPLETE] **Construction is now driven by holding the ATTACK button (LMB)**, not E — matching the user's
  explicit fallback suggestion ("or even just regular attacking"). `combatState.lmbDown` (new field) is
  set by `CombatController.tsx`'s existing mousedown/mouseup listeners (the same ones that already
  handle melee swings/blocking); `PlayerController.tsx`'s hold-to-act loop reads `lmbDown` instead of
  `isDown(kb.interact)` specifically when the target kind is `'construct'`, leaving every other
  interaction (gathering, NPCs, stations, beds, etc.) untouched on E as before.
- [COMPLETE] **`CombatController.tsx`'s mousedown handler skips the normal attack/ranged-fire logic** whenever
  `st.targetKind === 'construct'` (a click aimed at a construction site now ONLY drives building, never
  also throws a pointless melee swing into thin air).
- [COMPLETE] **Gamepad/touch are deliberately NOT cut off** — they have no separate "click and hold" input mapped
  the way KBM does, so their existing interact-button binding (`pad.current[kb.interact]`, which is
  written by gamepad/touch polling, NOT real keyboard events) still works for construction; only the
  literal keyboard E key stops working for this one target kind. The prompt text also now reads "Hold
  Click" instead of "Hold E" specifically for construction sites.

Verification: production build clean, dev server restarted. Smoke-tested by placing an unbuilt campfire,
holding the real E key for 4 seconds (confirmed `built` stays exactly 0, unchanged), then holding LMB and
confirming `built` reaches 1. Also confirmed normal combat (a melee swing away from any construction
site) still fires with zero regressions. Temp test script deleted after use.

---

## 📋 User-reported batch (2026-07-20 #2 — walls, build view, NPC identity) [COMPLETE]

Logged before fixing, per the standing workflow. Grounding notes are from real source/asset
inspection, not assumption.

1. [COMPLETE] **Black geometry pokes through the skybox when looking up**, and the broader ask: *"make separate
   maps not just have all maps load on top of each other."* Today every destination shares ONE
   coordinate space at far-apart offsets (the documented "Kingdom of Instances"), and `GameSky`'s box
   is `WORLD_HALF * 2.6` (520) wide, re-centered on the camera's x/z each frame but with a FIXED
   y (`size/2 - 40`). Needs the actual intruding object identified empirically (screenshot straight
   up) before deciding between a local fix and real per-map scene separation.
2. [COMPLETE] **Castle Wall cost imbalance** — `stonewall` (mc007) costs **6 stone** for an 8m segment while the
   `mc006` prefab Castle Wall costs **12 stone** for a *smaller* 7m segment. Same asset family, same
   role, double the price.
3. [COMPLETE] **Only one Castle Wall lives in the Walls category** (`stonewall`/mc007); every other wall-family
   piece (mc006 straight, mc001 corner, mc003 tower, mc009 breached, mc010 ruined) sits under
   **Prefabs**. Wall pieces should be findable under Walls.
4. [COMPLETE] **Wall corner is far too small, leaving a grid gap** — ROOT CAUSE FOUND: the wall family is authored
   at **two different scale factors**. Reading the real GLB accessor bounds (raw units):
   mc005–mc010 straights are `160 × 105.6 × 48`, corner mc001 is `64 × 76.8 × 64`, corner mc004 is
   `80 × 86.4 × 80`, tower mc003 is `80 × 163.2 × 80`. The `walls`/`defense` entries use scale
   **k = 0.05** (mc007 → 8 × 5.28 × 2.8 ✓, mc003 → 4 × 8.16 × 4 ✓ — both exact multiples of `GRID`=2,
   so they tile). The `prefab` entries use **k = 0.04375** (mc006 → 7, mc001 → 2.8, mc003 → 3.5) —
   NONE of which are multiples of GRID, so they can never tile flush. Fix: unify the whole wall family
   on k = 0.05 and give every piece a grid-aligned footprint.
5. [COMPLETE] **Trees/herbs spawn inside the build grid** — `seedNodes` claims "trees scattered outside the build
   region" but has NO build-region test: the forest ring uses `dist = 36 + rnd()*42` (the ±30
   `BUILD_REGION` box reaches 42.4 at its diagonal corners, so diagonal trees land inside it) and the
   herb patches use `dist = 20 + rnd()*30`, which is squarely inside. Nothing but placed pieces should
   occupy the build region.
6. [COMPLETE] **Still can't run underneath walls — caught by the bbox edge.** The Phase-25 `WALL_CORE` split gave
   each wall a narrow lower "core" box plus the full box above it, gated on
   `passesOverhead = boxBase >= feetY + 1.8`. Needs re-checking against the corrected (k=0.05) sizes
   and against what the player actually collides with at a gate/archway.
7. [COMPLETE] **Opening the build menu moves the view off the player.** `BuildController`'s camera center is
   initialised to the *region* centre (`center = useRef(new THREE.Vector3(regionCX, 0, regionCZ))`),
   never the player's actual position — so entering build mode always jumps to the homestead centre
   regardless of where you were standing.
8. [COMPLETE] **Defenders should keep the opposite schedule to workers** — sleep/stand down by day, patrol at
   night, since that's when skeletons rise. Workers already stop at 8 PM (`isWorkingHours`); defenders
   currently patrol 24/7.
9. [COMPLETE] **Killing an enemy should drop real random loot into the inventory**, and each NPC/enemy should
   carry some kind of lootable inventory rather than the current fixed `lootFor()` switch (skeleton →
   always 1 stone, etc.).
10. [COMPLETE] **The aerial build view should be angled with depth, not a flat 2D bird's-eye.** The user wants a
    low, orthographic-but-tilted view so the grid AND the piece's sides are both visible — sketched as
    a raked view, not a top-down plan.
11. [COMPLETE] **The placement ghost needs a direction indicator** (arrow and/or wireframe) — right now the ghost
    is an untextured translucent box, so which way a piece faces is guesswork, which has caused real
    rotation mistakes.
12. [COMPLETE] **Allied-NPC appearance panel should match the player's own creator** — pick the villager's look
    (face/crest) and recolor arms/legs/hips, the same way `CharacterCreator` does for the hero.
13. [COMPLETE] **Homestead folk need diverse body types, including female.** `Villagers.tsx`, `Defenders.tsx` and
    `NpcEquipPanel.tsx` all hardcode `minifiggenericgood00` for BOTH head and body donor. Female donors
    already exist and are already offered in the player creator (`minifigqueenleonora00`,
    `minifigprincessstorm00` in `FACE_OPTIONS`/`CREST_OPTIONS`) — the villager systems just never used
    any of them.

Fix order: grounded quick wins first (2, 3, 4, 5, 13), then the build-view work (7, 10, 11), then
systems (8, 9, 12), then the two that need empirical investigation first (1, 6).

### ✅ Shipped from batch #2: walls, build grid, build view, villager identity (2, 3, 4, 5, 7, 10, 11, 13) [COMPLETE]

- [COMPLETE] **#4 + #2 + #3 — wall family unified.** Root cause was two scale factors: `walls`/`defense` entries
  used k = 0.05 world-metres per raw GLB unit, the `prefab` entries k = 0.04375. Only k = 0.05 lands
  wall pieces on multiples of `GRID` (2), so the prefab copies (7 / 2.8 / 3.5 wide) could never tile.
  Everything is now k = 0.05, straight off the real accessor bounds: straights 8 × 5.28 × 2.4
  (mc007 2.8 deep), corners and the turret 4 × 4. mc001's true 3.2 square keeps a declared 4 × 4
  footprint so it still snaps flush. Added `mc004` (the lab's "Wall corner/connect", exactly 4 × 4 —
  this is the piece that actually closes the corner gap) and `mc005` (a genuine low wall). Every
  wall-family piece moved from **Prefabs → Walls** (that tab went from 1 piece to 19). Costs
  normalised by size: an 8m wall is 10 stone whichever mesh it uses, instead of 6 for one and 12 for
  another; the decorative `mc003` turret is now priced identically to the stationable Watch Tower it
  shares a mesh with.
  Verified: placed a real 2-segment run plus a corner and confirmed the spans meet flush
  (8-wide pieces at centres 4/12 → [0,8]+[8,16], 4-wide corner at 18 → [16,20]) with a screenshot
  showing continuous crenellation and a correctly-proportioned corner.
- [COMPLETE] **#5 — nothing but placed pieces inside the build grid.** `seedNodes` claimed the forest ring was
  "outside the build region" but never tested it; the ring's radial 36..78 range still reaches inside
  the ±30 BOX diagonally (corners are 42.4 out) and the herb sampler rolled 20..50, squarely inside.
  Added an `inBuildRegion()` guard (with a 3-unit margin so foliage doesn't overhang the edge tiles)
  applied to the procedural tree ring and herb patches; the hand-placed starter grove, boulder field
  and fishing spot are all already outside and untouched.
  Verified: 0 nodes inside the grid, and the herb rejection-sampler still fills all 7 patches.
- [COMPLETE] **#7 — the build view opens where you're standing.** The camera centre was initialised to the region
  centre, so entering build mode always yanked the view across the homestead. It now starts at the
  player's live position, clamped into the buildable area.
- [COMPLETE] **#10 — the build view is raked, not a flat plan.** Still orthographic (that's what keeps a grid
  readable) but tilted to 52° and pulled back along +Z, with world-up restored — pieces now show a
  front and a flank, so height and shape are visible while placing. Camera far-plane raised 300 → 400
  to cover the longer view ray.
- [COMPLETE] **#11 — the ghost shows which way it faces.** Added a full-size wireframe of the finished volume
  (the translucent box animates its height during a hold, so alone it never showed the final
  silhouette) plus a ground arrow off the piece's local +Z edge. Both turn with R.
  Verified: screenshots before/after an R press show the ghost and the arrow rotating together.
- [COMPLETE] **#13 — the homestead is no longer one hardcoded male face.** `Villagers.tsx`, `Defenders.tsx` and
  `NpcEquipPanel.tsx` all built their own config with `minifiggenericgood00` for head AND body. New
  `data/villagerLooks.ts` derives a look from the villager id (pure function, no migration) and merges
  an optional persisted `Villager.look` override — which is also the foundation for the appearance
  editor (#12). Pool is 5 donors, 2 of them female.
  **Two rules came out of validating this, both learned the hard way:** head and torso must come from
  the SAME donor (every mixed pair tested assembled wrong — floating shields, detached limb shards),
  and several donors have weapons molded into the mesh. Both "generic villager" donors are
  disqualified by the second rule: `minifiggenericbad00` carries a crossbow, and
  `minifiggenericgood00` — what every villager looked like until now — carries a halberd and shield
  that the rig scatters across the figure.
  Verified: screenshot-tested every candidate head/body pair, then cross-checked against the rig lab's
  own `equipKind` field (see the new findings section below), which independently agrees.

## 🔬 Rig-lab reports: what's in them and what we should do with them [COMPLETE]

Read on request (2026-07-20) from
`D:\CODING\THREEJS\knightskingdom\knightskingdom\grok\blender\movie\07082026\reports`.
This is human-verified ground truth over the same 264-model extraction and is **more authoritative
than anything this codebase currently infers at runtime**.

**What's there (the load-bearing files):**
- `PAK_CAPABILITY_SCHEMA.md` — the trait schema: core fields (`kind`, `rigClass`, `isRiggable`,
  `isInteractable`, `isPaintable`, `rigStatus`, `sockets`) plus one kind-specific branch:
  `traits.minifig` (equipKind, equipmentSummary, shieldHand/swordHand, laterality, isMountable,
  canGrab/canWear), `traits.wall` (structureKind, wallRole, canStandOn, canConnectAsWall,
  isDestructible, hasHole, isRuined, **destructionPhase / destructionPhaseCount**),
  `traits.mount`, `traits.vehicle`, `traits.explosive`, `traits.workshop`, `traits.scenery`.
- `PAK_CAPABILITY_OVERRIDES.json` — 87 hand-curated, `rigStatus: "verified"` entries keyed by bare
  asset id. **27 minifig donors carry a full `equipKind` + `equipmentSummary`.**
- `rigs/<id>_rig.json` — per-asset verified part lists: every mesh's `orig` shape name (e.g.
  `034_shape17`) mapped to a `role` (`torso`, `arm_L`, `halberd`, `shield`, `crown`, `visor`…) and a
  `bone`. 27 minifig rigs, plus horse/dragon mounts and prop/castle rigs.
- `LEARNED_PART_LEXICON.json` — 33 verified rigs distilled into family defaults + token→role priors.
- `ORIENTATION_REGISTRY.json` / `PAK_ORIENTATION_CATALOG.json` — per-asset correct eulers.
- `RIG_LAB_QUEUE.json` / `RIG_CAPABILITY_BOARD.md` — what's verified vs still `todo`.

[COMPLETE] **Immediately useful, already applied:** `equipKind` cleanly separates donors with a weapon molded
into the mesh from clean ones, which is exactly the villager-look problem above. Every donor in the
new pool is `equipKind: "none"`; the two obvious "generic villager" donors are `halberd` and
`crossbow` respectively, which is why they look broken. This is now the documented pre-screen for
adding any future villager look.

[COMPLETE] **The big opportunity** *(written when this was still just a proposal — shipped since, see
"Rig-lab part maps integrated" just below)*:
`src/lib/minifigRig.ts` currently identifies body parts by **spatially guessing**
(`classifyBySpace`: topmost cluster = head, horizontal offset = which arm, bbox-diagonal outlier =
prop). That guessing is the direct cause of two known problems: mixed head/body donors assembling
wrong, and props riding along as limbs. The lab files make the guessing unnecessary — every shape's
role is already named per donor. Replacing the spatial classifier with a lookup against a copied-in
`rigs/*.json` would:
  1. fix mixed-donor assembly (so villager looks aren't restricted to same-donor pairs),
  2. let us **deliberately strip or keep** a molded weapon by role (`halberd`, `shield`, `crossbow`,
     `sword`, `spear`, `axe`, `bow`, `quiver`, `arrow`) — so `genericgood00` becomes usable as an
     unarmed villager AND as an armed defender, from one mesh,
  3. give us verified `sockets`/`bone` data for attaching Armory weapons at the right hand,
  4. retire a whole class of "the rig looks wrong" bugs.
  Requires: a copy step in `scripts/prepare-assets.mjs` pulling `reports/rigs/*.json` into
  `public/assets/rigs/`, then a loader in `minifigRig.ts` that prefers the map and falls back to
  today's spatial classifier for any donor without one.

[COMPLETE] `traits.wall.destructionPhase`/`destructionPhaseCount` — shipped: `damageBuilding` (`gameStore.ts`)
calls `labDamagedForm`, a real ordered damage chain per wall piece, replacing the old hardcoded
mc006→mc009→mc010 ladder. `traits.minifig.isMountable` + `DEFAULT_MINIFIG_HORSE_MOUNT.json` seat matrices
for riding — still open, tracked once at L279 above (this was a duplicate restatement, not separate work).

### ✅ Rig-lab part maps integrated (allied + enemy NPC rigging) [COMPLETE]

The lab's verified shape→role maps are now the game's primary part classifier.

- **`scripts/prepare-assets.mjs`** gained a step that consolidates
  `reports/rigs/*_rig.json` into `public/assets/rigs/part_roles.json` —
  **179 rigs, 1042 labelled parts, 40 KB**, one fetch instead of ~30.
- **`src/lib/rigParts.ts`** (new) loads/caches it and maps each role to a body
  kind, with explicit sets for props (`sword`, `shield`, `halberd`, `spear`,
  `lance`, `axe`, `crossbow`, `crossbow_bolt`, `bow`, `arrow`, `quiver`,
  `goblet`), headgear (`helmet`, `horn`, `crown`, `visor`, `hood`) and
  mount halves (`horse_*`, `rider_*`, which must never assemble into a
  standing figure).
- **`src/lib/minifigRig.ts`** now tries `classifyByRigMap` first and only falls
  back to the old `classifyBySpace` heuristics for donors with no verified map
  (or a map covering < 60% of the donor's meshes).
- **`loadDonor` stamps `group.userData.donorId`** so classification can find
  the right map without threading ids through every call site.
- **`keepProps`** threads from `RiggedFigure` down into assembly: **off** for
  the player, villagers and defenders (their gear comes from the
  inventory/Armory and is attached separately), **on** for enemies, court NPCs,
  Cedric and the merchant, where the molded weapon IS the character.

**Deliberately NOT taken from the map: left/right.** The map distinguishes
`arm_L` from `arm_R`, but mapping that onto this game's own 'leftarm'/
'rightarm' depends on a frame convention that would have to be re-derived, and
getting it backwards would silently move every held weapon to the wrong hand.
Side is still decided from the mesh's own X position exactly as before — the
map changes *what* a mesh is, never *which side* it's on.

Results (screenshot-verified): `minifiggenericgood00` assembles with **no
halberd and no shield** for unarmed roles (it previously always carried both,
scattered across the figure), `minifiggenericbad00` likewise loses its crossbow
+ bolt + shield and reads as a clean hooded villager, while a spawned bandit
built from the same meshes still holds its polearm correctly gripped. Both
generic donors are therefore back in the villager pool, which is now **7 looks,
2 female**.

**One bug found and fixed during verification:** the initial sanity check
required a literal `head` role before trusting a map, which silently rejected
`minifiggenericbad00` — a *hooded* donor with no separate head mesh at all —
and bounced it back to the heuristics along with its crossbow. Headgear now
satisfies that check.

**Honest limitation:** this does NOT fix mixed head/body donors. A
Leonora-head-on-generic-body build still shows the head floating above the
neck, because part POSITIONS are baked per donor pose — a different problem
from classification, needing a neck-socket re-anchor. Villager looks therefore
still use same-donor pairs only.

### ✅ Batch #2 complete — remaining items (8, 9, 12, 1, 6) [COMPLETE]

- [COMPLETE] **#8 — defenders keep the opposite shift.** New `isWatchHours()` (`data/villagers.ts`) — a window
  that WRAPS midnight (20:00–05:00), which is why it can't just be the inverse of `isWorkingHours`.
  With nothing to fight and no explicit order, a defender walks to a bed and rests through the day,
  then goes back on circuit at dusk. Guards claim beds counting back from the end of the list while
  the day shift claims from the front, so the two shifts never contest a mattress. Explicit orders
  (attack/follow/scout) and any spotted hostile still override at any hour — a daylight raid is
  answered.
  Verified behaviourally, not by restating the formula: with a bed at (14,14), the guard closes to
  3.9 units of it at 13:00 and is 12.7 away on circuit at 23:00.
- [COMPLETE] **#9 — enemies carry real, rolled inventories.** New `LOOT_TABLES` + `rollLoot()` (`combat.ts`):
  per-kind entries with an independent chance and a min/max quantity, rolled **when the enemy spawns**
  and stored on `EnemyData.inventory`, so the thing you're fighting genuinely carries what you'll get.
  Drops now name the haul in the notification. **Found and fixed while doing it: ranged kills granted
  no loot at all** — only the melee path ever called `lootFor`, so bow/crossbow play had been quietly
  paying less than melee.
  Verified: 6 spawns of each kind produce distinct inventories; a kill transfers exactly the carried
  set (`{plank:2, gold:6}` carried → `{plank:2, gold:6}` gained, "Looted 2× Plank, 6× Gold Coin").
- [COMPLETE] **#12 — villager appearance editor.** The roster's Equip panel gained an Appearance section with the
  same face/crest tiles and limb-recolour swatches the player's own creator uses, writing a SPARSE
  override (`Villager.look`) over the id-derived default, plus a Reset that drops the override.
  Face and dress move together as a matched pair, deliberately — see the honest limitation noted in the
  rig-integration section: part positions are baked per donor pose, so a mixed pair floats the head off
  the neck.
  Verified: 7 look tiles, picking one writes `{headDonor, bodyDonor}`, a swatch adds `armColor`, Reset
  returns `look` to null; live paperdoll updates.
- [COMPLETE] **#1 — the black shape in the sky was the FALCON, not map bleed.** Enumerating scene geometry above
  y=12 near the player turned up only the skybox, the stars, and one small object orbiting at
  y≈24 on a radius-34 circle — exactly the falcon's flight equation. Its GLB carries **two** materials:
  a brown body and a **pure black, untextured** one (`baseColorFactor [0,0,0]`), and against a bright
  sky that second material reads as a hole punched through the skybox. Same defect in the bat. Added
  `liftBlackMaterials()` (`Wildlife.tsx`) which lifts only near-black, map-less materials to a
  plausible plumage tone, cloning first because `Object3D.clone()` SHARES materials and the model comes
  from a cache. Falcon's black mesh now reads `#5a4a38`.
  **This means the "all maps load on top of each other" theory was not the cause of that symptom** —
  destinations are far outside the skybox's 260-unit half-extent and are correctly hidden by it.
- [COMPLETE] **#6 — wall collision measured correct, and breaches are now walk-through.** Measured the actual
  stop distance against a wall: 1.05, exactly `depthFrac(0.5) × depth(2.4) / 2 + PLAYER_RADIUS(0.45)`,
  so the narrow-core system is doing its job. The genuine remaining case came from the lab data:
  `traits.wall.hasHole` is true for **mc009 (destruction phase 2/3) and mc010 (3/3)** — walls with a
  breach you can see straight through but were still stopped by. `CollisionBox` gained an `ox`/`oz`
  centre offset, and a holed wall's lower core is now **two pillars flanking an opening** instead of one
  slab.
  Verified: walking at the breach passes clean through (z 8 → −16); walking at a pillar on the same
  wall still stops at 1.05.

## ✅ Rig-lab capability integration (2026-07-20) [COMPLETE]

The lab's verified answer sheet is now a first-class data layer in the game,
not just a reference document.

**Pipeline** — `scripts/prepare-assets.mjs` gained two steps:
- emits `public/assets/rigs/capabilities.json` from `PAK_CAPABILITY_OVERRIDES.json`
  — **86 verified assets** (27 minifig, 33 wall, 10 mount, 9 vehicle, 4
  explosive, 3 scenery), 64 KB, one fetch.
- copies every GLB the lab describes that the game never shipped — **20
  models**, mostly siege engines and explosives that had been sitting unused in
  the extraction the whole time. Minifig GLBs are deliberately skipped (that
  export drops the per-part `o` names the rig depends on, which is why
  minifigs load from OBJ+MTL).

**`src/game/data/labCapabilities.ts`** (new) types the whole schema — core
fields, the six kind-specific trait branches, `interaction`, `sockets` — and
exposes predicates that each fall back to the pre-lab default so nothing
regresses while the fetch is in flight.

**`labAssetId()` / `buildableForLabAsset()`** (`data/buildables.ts`) bridge the
two id spaces, which are NOT the same: the Castle Wall's buildable id is
`stonewall` while the lab knows that mesh as `mc007`, the Watch Tower is
`tower` vs `mc003`. Derived from the model filename so it stays correct as
pieces are added. **This was a real bug caught in verification** — without it
`stonewall` silently never matched any lab entry.

**What's wired:**
- **Nine siege engines + three explosives are now buildable** under a new
  **Siege** category — catapults, stone throwers, crossbow turrets, a siege
  tower, powder barrels/chests/charges. Sized from real GLB bounds at the same
  k = 0.05 as the wall family. All twelve screenshot-verified upright and at a
  believable scale.
- **Firing is data-driven**: anything the lab marks `traits.vehicle.canFire`
  becomes usable exactly like the hand-built cannon, with no per-piece branch.
- **Explosives detonate** (`detonate()` in `siege.ts`): hold to light the fuse,
  damage enemies and — gated on `traits.explosive.damagesWalls` rather than
  assumed — nearby structures, hurt the player if they're too close, and
  consume the charge. `removeBuilding` gained a `consumed` flag so a charge
  that blew itself up doesn't claim a refund it never gave.
- **The wall destruction ladder is data-driven** from `destructionPhase` /
  `destructionPhaseCount` instead of a hardcoded `mc006→mc009→mc010`. **This
  fixed a real gap**: the old hardcode only covered mc006, so `stonewall`
  (mc007 — the main Castle Wall in the Walls tab) and mc008 could be sieged
  forever without ever showing a scratch. Verified: stonewall now degrades
  `stonewall → mc009 → mc010 → destroyed`.
- **`canStandOn` is data-driven** in `floorHeightAt` — a catapult arm or a
  powder barrel is no longer a floor.
- `damageBuilding` hardened: a placed piece whose catalog entry has since
  changed no longer throws on refund.

Verified end-to-end: capabilities load with all six kinds present; a placed
catapult prompts "Fire Catapult (1 stone)" and consumes stone; a powder barrel
detonates, is consumed without a false refund, and blows an adjacent Castle
Wall to rubble; the stonewall damage ladder walks its real phases.

[TODO] **Not yet integrated (the remaining lab surface)** — corrected on a 2026-07-28 re-audit; several of
these shipped later under other sections and had been mistagged:
- [COMPLETE] `traits.minifig.swordHand` / `shieldHand` — verified, not left undone: `Equipment.tsx`'s own
  2026-07-25 header comment records checking all 15 donors against the lab's data (every one is
  `swordHand: hand_R`, `shieldHand: hand_L`, no variation to drive) and deliberately keeping the fixed
  side rather than adding a no-op data dependency.
- Mount seat matrices (`DEFAULT_MINIFIG_HORSE_MOUNT.json` / `..._DRAGON_MOUNT.json`) and the four extra
  horse variants now copied in — still open, tracked once at L279 (third restatement of the same gap,
  consolidated here rather than left as a separate line).
- [COMPLETE] Non-minifig prop rigs, catapult arm — shipped: `lib/propRig.ts` + `ANIMATED_ROLES` loads the
  OBJ-preserved per-part rig and drives real catapult-arm/counterweight/flag/wheel rotation, wired into
  `Buildings.tsx` via `RiggedProp`/`hasAnimatedRig`. [TODO] Drawbridge, jail cell, ladder, and springboard
  are NOT in `ANIMATED_ROLES` and don't even exist as buildable catalog pieces yet — still render static
  (in effect: still to come, since they're not built at all).
- [COMPLETE] `ORIENTATION_REGISTRY.json` per-asset eulers — resolved, not left open; see "read, and
  deliberately not applied" further down this file for the actual finding (Blender-space eulers don't
  transfer; its one real bug got fixed separately).
- [COMPLETE] `traits.vehicle.canSeat` / `canDrive` / `canPush` — correctly false for every siege piece
  (they're emplacements, not vehicles) and stay that way, but the capability the data was pointing at
  shipped anyway via a different trait: `game/crew.ts` implements real crewing (`canOccupy`/`occupyMode`)
  — step onto an engine, aim by looking, fire from the crew position. Siege pieces are no longer
  fire-only from outside.

## ✅ UI design-system integration — four themes (2026-07-25) [COMPLETE]

Five files landed in the project root (`HANDOFF.md`, `kk-tokens.css`,
`kk-icons.svg`, and the two `.dc.html` mockups). The handoff pack is the spec;
the two HTML files stay at root as reference and are not built.

**Installed:**
- `src/styles/kk-tokens.css` — the whole token sheet (colour ramps, OKLCH game
  roles, type, spacing, radii, elevation, the four lane recipes), imported
  first from `globals.css`. Verified live: `--kk-accent` = `#968ae0`,
  `--kk-slot` = `52px`.
- `public/assets/ui/kk-icons.svg` — the 62-mark sprite. `KkIconSprite`
  (mounted at the app root) fetches it once and injects it into the document,
  because `<use href="#id">` cannot resolve against an `<img src>`.
  Verified: 62 `<symbol>` elements present. `KkIcon` + the handoff's
  `ICON_FOR_EMOJI` map ship alongside for the emoji→mark pass.
- `src/components/ui/UiTheme.tsx` — sets `data-kk-lane` from the new setting
  and `data-kk-quality` from the existing graphics-quality setting (the token
  sheet's own perf hatch: it swaps blur for a flat tint at `low`).

**The four themes** are a new `uiTheme` setting (`glass` | `metal` | `chrome` |
`leather`), persisted with the rest of settings, picked in
**Options → Interface Theme** as four preview cards.
**`glass` (Aero Glass Realm) is the core theme**, per the handoff's reasoning
and confirmed on screen: the world renders bright saturated green, so an
opaque near-black panel reads as a hole punched in it.

`src/styles/kk-lanes.css` maps the lane recipes onto the game's OWN existing
classes (`.game-panel`, `.build-menu`, `.rank-badge`, `.quest-tracker`, the
three tab bars) rather than making every component lane-aware. Every rule is
`:root[data-kk-lane=…] .thing`, which outranks the bare `.thing` on
specificity — so no `!important` and no import-order dependency.

**One real problem found and fixed during verification:** Millennium Chrome is
the only lane that inverts text polarity, and the rest of the UI is built
light-on-dark. The first pass left every inactive tab label and equipment-slot
name invisible (white on pale blue). Patching classes one at a time was a
losing game, so the lane instead **re-points the game's own colour tokens**
(`--parchment`, `--gold`, `--chrome-2`, `--wood`…) inside a chrome surface —
every descendant flips automatically, while hardcoded SEMANTIC colours
(affordable green, missing red) are deliberately left alone because they still
need to mean the same thing on a light panel.

Verified: all four lanes resolve to distinct computed backgrounds/radii/clip
paths, screenshot-checked for legibility, zero page errors.

### Lab items closed out alongside [COMPLETE]

- [COMPLETE] **Handedness — verified, deliberately NOT wired.** `traits.minifig.swordHand`
  / `shieldHand` is recorded for 15 donors and is **unanimous**: every one is
  `swordHand: hand_R`, `shieldHand: hand_L`, `laterality: character_local`.
  The existing hardcode (weapons → `rightarm`, shields → `leftarm`) already
  matches, so routing it through `labHands()` would add a data dependency and
  change nothing. Recorded the verification in `Equipment.tsx` instead.
- [COMPLETE] **Mount variants placed.** The lab charted six rideable horses where the game
  shipped two. The saddled/barded pair (`l7339212`, `l7339221`) now graze the
  west meadow. Cedric's two chargers (`l7339231`, `l7339232`) are tagged
  `traits.mount.faction: 'cedric'` by the lab, so they're tethered at his camp
  instead — faction data driving placement, not decoration.

### Lab backlog closed out (2026-07-25) [COMPLETE]

Everything listed above as "still open from the lab" is now done.

**Non-minifig prop rigs — the moving parts move.** `lib/propRig.ts` loads the
engines from **OBJ+MTL**, not GLB: the GLB export drops every node/mesh name
AND merges primitives by material, so the rig maps (which key off the source
`o` names) cannot survive it — `oc6096-4` has 9 rig parts against 11 merged
primitives. The OBJ keeps them. Each lab role is bucketed, pivoted at its own
bbox centre, then run through PropModel's exact normalization so a rigged prop
lands identically to the static one it replaces. `RiggedProp.tsx` drives it all
from one `useFrame`: throwing arm (0.18s launch, 1.42s wind-back), payload
visibility, counterweight counter-swing, two-axis flag wave, flame flicker.
- MTL materials are rebuilt as `MeshStandardMaterial`. The MTL loader produces
  Phong; the scene's lighting is tuned for PBR, so an OBJ prop next to a GLB
  one read visibly darker despite byte-identical colours.
- The MTLs reference `textures/spr*.png` relative to themselves and those were
  never copied — nine textures 404ing, props rendering flat. `prepare-assets`
  now parses the `map_*` lines out of the copied MTLs and brings the textures
  along.

**Crewing a siege engine (`traits.vehicle`).** The lab's answer here was the
opposite of the assumption: every engine is `canDrive: false`, `canPush:
false`, `isStationary: true` — these are emplacements, not vehicles. What it
*does* record is `canOccupy` + `occupyMode` on eight of the nine. So the
feature the data actually asks for is **manning** one: `game/crew.ts` +
`labCanOccupy`/`labOccupyMode`.
- E mans it, E steps down, the attack button looses a shot (CombatController
  suppresses the sword swing while crewed, the same way it does over a
  construction site).
- A manned engine **shoots where you look** instead of along the quarter-turn
  it was placed at, and the mesh eases round to follow your aim.
- The lab charted no crew *coordinates*, only that a crew position exists, so
  the standoff comes from the piece's own footprint: standing crew work from
  `depth/2 + 1m` behind at platform height, seated crew (`oc4806b2`, the one
  piece with `canSeat: true`) ride the frame low and close.
- `oc1289` has no crew position in the data and correctly stays fire-in-place.
  Verified both branches on screen.

**`ORIENTATION_REGISTRY.json` — read, and deliberately not applied.** Its
eulers are **Blender-space** (Z-up), which is not transferable to the game's
−Y-up convention; applying them would break models that currently render
correctly. What it *did* carry was a `material_followups` section flagging
`alpha_mask_tex_as_basecolor`, and that was a genuine live bug: three assets
have a silhouette mask wired to Base Color by the OBJ→GLB conversion, so they
rendered as black-and-white cards instead of cut-out shapes. Confirmed by
sampling the embedded PNGs (`l606400`'s is 100% greyscale / 81% pure white).
`PropModel` now re-routes those maps to `alphaMap` with `alphaTest` and tints
from the model's own glit colour — Cedric's camp scenery reads as reed clumps
with individual blades now, not cards.

**Emoji → icon sweep.** 30 call sites across 10 files now render sprite marks
through `<Ico>`, which falls back to the original glyph when a mark is missing.
Sites inside template literals were rewritten as elements rather than left as
broken interpolation.

---

## UI/UX port: the mockup screens themselves (2026-07-25) [COMPLETE]

The earlier pass built the design system's *foundation* — tokens, the four
lane recipes, the 62-mark sprite, the theme setting — and stopped there. The
screens still had their old layouts. This pass ports the mockups
(`Knights Kingdom UI.dc.html`, turns 3a–3d and 1a–1d) per HANDOFF §5.

`src/styles/kk-screens.css` holds the structure; every colour still comes
from `kk-tokens.css` and every lane treatment from `kk-lanes.css`. Each
screen keeps the lane the mockup assigned it, because those pairings are
what was approved.

[COMPLETE] **3a · Title & Sign In** (Millennium Chrome) — moulded chrome plaque for the
wordmark, tabbed Sign In / Create Account card, one lime primary
("Enter the Kingdom"), and the guest path demoted to a quiet secondary
instead of a second equal-weight button.

[COMPLETE] **3b · Main Menu & Saves** (Metalheart) — two columns. The left rail keeps
the six established items in their established order as sheared steel plates
with *Continue Journey* as the single primary showing the day. The right
column is new: YOUR HOLDFASTS, reading what the save actually contains —
rank badge, chapter name, DAY / STRUCT / KIN / gold — instead of a bare
"Continue". The game stores **one** save per account plus one guest save, so
it shows that save as a card with an empty slot beneath it: the mockup's
multi-slot shape told truthfully, not faked with slots the backend hasn't
got.

[COMPLETE] **3c · Forge Your Hero** (Guild Leather) — all eight callings visible at
once as a 4×2 grid, never a carousel, each stating what it gives you, with
the selected one's blurb on parchment. The mockup's kit hints ("+ axe",
"+ coal") describe a game that hands out starting gear; this one
deliberately doesn't, so the hints read `+10% woodcutting` etc. — what a
calling *actually* grants. Locked crests name their blocker rather than
sitting greyed and silent.

[COMPLETE] **3d · Options** (Metalheart) — two columns instead of one long scroll.
Sound / Controls / World / Interface Theme on the left, Graphics / Keybinds
on the right. Every slider reads its own value; switches replace checkboxes;
Quality Preset is a segmented control.

[COMPLETE] **How to Play / Credits** — re-shelled onto the same screen chrome, copy
verbatim (the Credits attributions and the owned-original note are not
optional). Steps get display-size numbers and a consistent 16:10 shot frame,
and the guide screenshots were regenerated — they were still showing the old
UI, and step 2's copy still described hearts bottom-left and a top-right
minimap.

[COMPLETE] **1a–1d · Field HUD** — nine clusters, each anchored to a viewport edge and
never to another cluster.
- Hearts are gone. A row of 8 heart glyphs cannot show 178/240 and does not
  scale past 10, so vigour is **one bar with a numeric readout**, with
  stamina and the rank XP bar sharing the line beneath it.
- New **compass strip**: cardinal ticks scrolling under a fixed bearing
  line, with real pips — renown for your holdfast, taint for the nearest
  hostile within 60m. 270° of span, so the flanking cardinals sit inside the
  strip instead of hard against its clipped edges.
- The interact prompt is now a **conic-gradient hold ring** around the verb:
  one element with a CSS custom property for the stop, no DOM churn per
  frame.
- The bottom band is **one flow row** (`justify-content: space-between`,
  `align-items: flex-end`) carrying the resource ledger, readied gear and
  the minimap. Three clusters independently positioned in the same 22px band
  is exactly what used to collide.
- The readied row is deliberately **not** the mockup's eight numbered hotbar
  slots. This game has no hotbar bindings, and drawing eight digits that do
  nothing would be a lie; it shows the slots that do reflect state — the
  weapon Q swaps between with its live ammo count, and the tools you carry.
- The build-view control hint moved from centred to **left-aligned under the
  vitals**. While the palette is open the top band has fixed clusters pinned
  at both edges, leaving a corridor too narrow for a key list, so a centred
  hint slides under one or the other. The palette gained its pinned budget
  footer (structures built · next kin at N), last in flow rather than
  absolutely positioned.

**The four lanes now reach the HUD.** The clusters wear `.kk-glass`, which
is the Aero Glass recipe hardcoded; each lane re-skins it in `kk-lanes.css`,
leaving every metric alone so switching never reflows a cluster. Chrome — the
one lane that inverts text polarity — re-points the cluster's colours rather
than patching them one at a time, the same fix the panels needed.

**One real bug found in the port:** `.kk-glass` sits later in the stylesheet
than the cluster rules and carried `position: relative`. On a single-class
specificity tie the later rule wins, so the vitals and objective card never
went absolute — the vitals stretched the full viewport width and the
objective card landed on the left. Measuring `getBoundingClientRect` plus
computed `position` found it in one pass; guessing from screenshots would
not have.

---

# MASTER PLAN — 2026-07-25 backlog (30 items) [COMPLETE]

Logged first per the standing workflow. Nothing below is implemented yet.
Items are grouped so each block is independently shippable and verifiable;
the ordering inside a block matters, the blocks themselves mostly don't
except where a dependency is called out.

Diagnoses marked **[found]** were confirmed by reading the code/assets while
writing this plan — those are not guesses.

## A · Fast bugs (each ~one sitting, verify individually) [COMPLETE]

1. [COMPLETE] **Build-exit spawn drift.** Leaving build mode drops the player south of
   where they were. `setBuildMode(false)` (gameStore) never restores a
   position, so whatever the aerial camera left in `playerState` wins. Fix:
   capture the player's transform on entering build mode, restore it via
   `pendingTeleport` on exit.
2. [COMPLETE] **Signpost sits inside the build grid.** **[found]** `SIGNPOST = {x:-14,
   z:18}` is inside `BUILD_REGION` `x/z in [-30,30]`. Move it outside the
   region, and add a dev assertion that no fixed world prop lands inside the
   active build region so this cannot regress when the region grows in F.
3. [COMPLETE] **12 missing thumbnails -> 404s.** **[found]** Every `/assets/props/lab/*.png`
   is absent: the 9 siege engines and 3 explosives. Sources exist at
   `extracted/pak_models/warehouse/main_interface/explosives/*.png`.
   `prepare-assets.mjs` copies the lab GLBs but was never taught to copy
   their thumbnails through the existing chroma-key pass.
4. [COMPLETE] **Placement arrow points the wrong way.** **[found]** `BuildController`
   draws the facing cone at local **+Z**, but `PropModel` normalises every
   model with `rotation.x = Math.PI`, which mirrors Z — so the model's front
   renders at **-Z**. A consistent 180-degree disagreement, exactly matching
   "arrows point left, walls face right". Fix at the arrow (not the model),
   and add a second smaller tick on the piece's own front face.
5. [COMPLETE] **Crossbow renders backwards in first person.** Viewmodel transform;
   likely the same Z-mirror as (4) applied to a weapon whose PCA long axis
   converged backwards (`WeaponDef.flip` exists for exactly this).
6. [COMPLETE] **Bolt/arrow damage too low.** Raise both, and make the longbow's draw
   fraction actually scale damage rather than only range.
7. [COMPLETE] **Villagers appear before their beds exist.** Arrival is gated on bed
   *count*; it must be gated on beds that are **built** (`isBuilt`) and
   unoccupied, with an explicit per-bed occupancy record so night routines
   claim a real bed instead of the nearest coordinate.

## B · Collision & projectiles [COMPLETE]

8. [COMPLETE] **Character hitboxes.** Per-part capsules driven by the rig lab's own
   `part_roles.json` role map (head / body / arm_L|R / leg_L|R) rather than
   one body-wide sphere. Unlocks headshot multipliers, limb hits, and gives
   (9) and (14) something real to attach to.
9. [COMPLETE] **Projectiles stick instead of passing through.** Sweep the bolt/arrow
   segment against the capsules from (8); on hit, park the projectile as a
   child of the struck part with its local transform frozen, and let it ride
   the mob's animation until the corpse despawns.
10. [COMPLETE] **Walk under archways — answering "can we ignore the bbox and use the
    raw OBJ?"** Yes, three ways, and the middle one is right here:
    - *(a) True trimesh collision.* Accurate, but a per-frame raycast against
      every wall's geometry is far more than this movement code needs.
    - *(b) Per-part AABB sets emitted at asset-prep time.* **Recommended.**
      The OBJ keeps named sub-objects and the lab already labels which part
      is the archway/embrasure (`hasArchway`, `hasArrowSlit`, and the
      existing `WALL_HOLE` set). Emit a small `collision.json` of several
      boxes per piece instead of one bbox; runtime stays cheap AABB tests but
      the *shape* becomes real, so an arch has a genuine hole.
      The current `collisionBoxesFor` two-pillar hack becomes data-driven.
    - *(c) Hand-authored volumes per `structureKind`.* Fewer files, but it
      re-derives by hand what the OBJ already knows.
11. [COMPLETE] **Raider cart destroyable + turning wheels.** **[found]** `oc4806`/`oc4807`
    rigs already expose `wheel_0`/`wheel_1` and both OBJs are already copied
    to `props/objrig`, so the wheels only need a rotation driven by distance
    travelled in `RiggedProp`. Separately give the cart HP, a hit reaction
    and a wreck state so it can be stopped before it reaches a gate.

## C · First-person viewmodel from the real rig [COMPLETE]

12. [COMPLETE] **Rebuild the FPS view from the labelled minifig arms/hands.** Replace
    the current hand-built viewmodel with the player's *own* assembled
    minifig arms — the lab labels `arm_L/R` and `hand_L/R` per donor, and
    `labHands()` already reports which hand holds a weapon. The viewmodel
    then inherits the player's chosen arm/hand colours automatically, which
    is the thing that currently looks wrong.

## D · Identity, targeting & metadata [COMPLETE]

13. [COMPLETE] **Live 3D character head in the vitals crest** (top-left HUD), from the
    player's chosen head donor, re-rendered when appearance changes; editable
    from the menu, not only at creation.
14. [COMPLETE] **Target readout while aiming** — name, allegiance, health bar and known
    stats above the NPC, plus a **scan** that records them into a collection
    book (bestiary). This is the meta-data store the rest of D reads from.
15. [COMPLETE] **Crosshair reads allegiance** — green on an ally, red on a hostile,
    neutral otherwise. Depends on E's allegiance model.
16. [COMPLETE] **Collection book panel** — everything scanned, with what is still
    unknown shown as gaps rather than hidden.

## E · Allegiance & the quest system  *(the largest single item)* [COMPLETE]

17. [COMPLETE] **Allegiance axis on the character.** Today there is only a one-way
    `alliance` pledge (Leo / Cedric) and every quest is "good". Add a real
    tracked standing — good <-> neutral <-> evil — persisted in the save and
    surfaced in the Satchel stats block.
18. [COMPLETE] **Comprehensive quest content across all three alignments**, with:
    - per-quest allegiance deltas,
    - prerequisite chains (precursor quests),
    - paths that **lock** when standing is too low or a precursor is unmet,
      and that say *why* they are locked (never a silent grey row),
    - faction standing changes that cascade to who will still talk to you.
    Sequenced after (17) because every quest definition needs the field.

## F · Building, land & the castle [COMPLETE]

19. [COMPLETE] **Build grid rebuilt around real wall runs.** `GRID = 2` with
    `BUILD_REGION` +/-30. Size the cell and the region so a full 4-piece wall
    run plus corners tiles end-to-end with no gap, then re-derive every
    piece's `snap` from its true footprint rather than a shared constant.
20. [COMPLETE] **Land purchase / homestead expansion.** Start on a small plot and buy
    outward; each expansion unlocks the resources standing in the newly
    claimed ground (trees, ore) *outside* the buildable zone.
21. [COMPLETE] **Grand Keep rebuilt from real parts** — the green MC00 base plate, four
    corners and two middle pieces, assembled and customisable, replacing
    today's single stand-in mesh. Depends on (19) for the footprint.
22. [COMPLETE] **Import the remaining OBJ brick library.** `bricks.generated.json` has
    133 pieces; the warehouse holds ~137 in `workshop/` alone (arches, basic,
    castle_accessories, castle_components, cylindrical, slim, tiles, wedge,
    windows_doors_fences) plus `main_interface/buildings` (30) and
    `scenery` (14). Audit the overlap, import the remainder with real
    footprints, and let (21)'s castle customiser draw on all of it.

## G · Defence AI [COMPLETE]

23. [COMPLETE] **Towers and explosives auto-engage.** A deployed tower acquires the
    nearest hostile in range and fires on its own cadence; charges arm and
    detonate on proximity.
24. [COMPLETE] **Assign kin to emplacements.** Extend the existing defender-station
    system so a villager can be posted to a tower or siege engine, man it
    (the crewing system from the last pass already exists), and otherwise
    patrol seeking hostiles.

## Also captured from this round [COMPLETE]

25. [COMPLETE] **Alric and Beda are mis-rigged** — heads and arms float or trail behind
    the body. Both use the generic donors, and both ARE covered by
    `part_roles.json`, so the rig map is available; the fault is in how
    `classifyByRigMap` / `rehangArm` handle these two donors (they are the
    ones with a held prop baked into a limb band). Diagnose against the
    9-donor screenshot suite.

## Dependency notes [COMPLETE]
- 8 -> 9, 14
- 17 -> 15, 18
- 19 -> 21, 20
- 13 and 12 share a head/limb render path; build 13 first, it is smaller.

---

## Block A shipped — 2026-07-25 [COMPLETE]

All seven fast bugs done, each verified independently.

[COMPLETE] **A1 · Build-exit spawn drift — fixed.** Root cause was not the build camera:
`GameWorld.tsx` renders `{buildMode ? <BuildController/> : <PlayerController/>}`,
so every trip into the build menu **unmounts** PlayerController and re-creates
its refs, which were seeded from `SPAWN`. Measured drift was exactly
`SPAWN` (0, 26) with yaw 0, not a wander. PlayerController now resumes from
`playerState` (the live mirror its own loop writes each frame), and
`newGame`/`loadFromSave` call a new `resetPlayerState()` so a fresh start
still begins at spawn — `SaveGame.playerPos` is declared but has never
actually been written, so nothing else was doing it. Verified: 0.00 / 0.00
drift, yaw preserved.

[COMPLETE] **A2 · Signpost moved out of the build grid.** It stood at (-14, 18), inside
`BUILD_REGION` (±30), permanently eating a build square. Moved to (-16, 36),
still a short walk from spawn. Added `FIXED_WORLD_PROPS` plus a dev-only
import-time check in `buildables.ts` that warns if any fixed prop lands
inside the region — the region is due to grow in block F, and this should
fail loudly rather than be re-found by eye.

[COMPLETE] **A3 · 12 missing thumbnails — fixed.** All nine siege engines and three
explosives 404'd. Two causes: the lab-copy loop `continue`s as soon as a
model already exists under `props/` (true for all twelve), and the
thumbnails do not live beside the models — they are under
`pak_models/warehouse/<section>/<category>/`. `prepare-assets` now indexes
that tree and pulls a thumbnail for every lab id, chroma-keying each one
inline because the global green-screen pass has already run by that point.
86 thumbnails copied from 342 indexed; catalog now resolves 0 missing.

[COMPLETE] **A4 · Placement arrow rotation — fixed, verification partial.** The ghost
drew its facing cone at local **+Z** while `PropModel` normalises every model
with `rotation.x = Math.PI`, which mirrors Z — a systematic 180°
disagreement matching the report exactly. The arrow moved to −Z and gained a
matching tick on the piece's own front face.
*Honest limit:* I could not photograph a decisive before/after, because this
asset family is very nearly symmetric front-to-back — the breached wall is a
hole through both sides and the workbench is an open crate. The fix follows
from the code (the Z-mirror is not in question) and matches the reported
symptom, but it wants a human eye in-game to confirm the arrow now points at
the face you expect.

[COMPLETE] **A5 · Crossbow backwards in first person — fixed.** Same sign-ambiguity the
sword already carries: `loadWeapon`'s PCA long axis is an undirected line, and
for this donor's bake it converged with the prod at the grip end, rendering
the crossbow stock-forward. Set `flip: true` on the crossbow `WeaponDef` —
the mechanism that exists for exactly this. Screenshot confirms prod
downrange, stock in hand.

[COMPLETE] **A6 · Projectile damage raised.** Bolt 4 → **7** (battlement bonus now
proportional, ×1.25, instead of a flat +1): one shot drops a skeleton, two a
bandit. Longbow 4–10 → **6–16** across the draw, so a snap shot is worse than
a bolt and a full draw is the strongest single hit in the game — which is the
point of a weapon that makes you stand still. Note the arrow already scaled
with draw; the ceiling was just too low to reward it. Verified against a live
bandit: 8 HP → 1 (bolt, 7) → 0 (weak arrow, 8).

[COMPLETE] **A7 · Villagers arriving before their beds — fixed.** `checkVillagerArrival`
counted *placed* beds and structures, including construction sites, so
setting down a bed ghost summoned its occupant. Both counts now require
`isBuilt`, matching the standard `Villagers.tsx`'s night routine already
used when claiming a bed (that side was already correct — one sleeper per
finished bed by stable rank). Verified all three cases: sites only → 0,
everything built → 1, finished bed but too few structures → 0.

---

## Block B shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **B8 · Per-part hitboxes, measured from the rig itself.** Ranged combat used
to test one 0.55m sphere parked at a fixed chest height, so a bolt through
the skull and a bolt through the shin were the same event and a shot that
visibly missed still connected. `lib/minifigRig.ts`'s new `measureHitBoxes`
measures each joint group (head / body / hips / arms / legs) in the figure's
own local frame the moment it loads, and `game/hitbox.ts` holds the result
per character with a slab test in local space. Volumes come from whatever
donor the character actually uses — no invented proportions.
- **One real bug found while measuring:** the joints are a PARENT CHAIN
  (hips → body → head/arms), so a plain `traverse` of `hips` walks the whole
  figure. Every parent joint measured as the entire character — hips came out
  1.74m tall and swallowed every limb hit, which is why a leg shot registered
  as `body`. The walk now stops at any other joint group.
- Damage multipliers: head ×2.0, chest ×1.0, hips ×0.9, arms ×0.65, legs
  ×0.6. Verified against a live bandit: head 14, leg 4.2, shot overhead 0 —
  a genuine miss is now possible, which it was not before.

[COMPLETE] **B9 · Projectiles stick instead of passing through.** On impact a bolt
stores the struck mob's id, the part, and the hit point in that figure's own
local frame, then stops simulating. `Bolts.tsx` rebuilds its world transform
from the mob's live position and facing every frame, so the shaft rides the
body it hit and keeps the direction it was travelling. Bolts expire with the
corpse, not on contact. Screenshot confirms a shaft lodged in a bandit's
helmet.

[COMPLETE] **B10 · Collision follows real geometry, not the bounding box.** Answering
"can we ignore the bbox and use the raw OBJ?" — yes, via the middle road:
`scripts/gen-collision.mjs` voxelises every source OBJ at asset-prep time
(applying PropModel's exact normalisation) and greedy-merges the result into
a handful of axis-aligned boxes, emitted to `public/assets/collision.json`.
Runtime stays cheap AABB tests; the shape becomes real. 40 pieces carry real
volumes, 115 stay bbox (genuinely solid, or too fragmented to be worth it),
37 KB total. Wired into `npm run prepare-assets`.
- **What this actually fixed:** L-shaped corner walls (mc005, mc006). One
  bounding box covers the whole L *including the empty inner corner*, so the
  game blocked a void you can see straight through. Both now walk through.
- **Honest finding on "walk under the wall":** there is no piece in the
  current catalog that is a walk-through gateway at standing height. The
  decorative arches crown at about 1.35m — mapping their cross-section shows
  the curve closing well below head height — so blocking them is correct, not
  a bug. The breached walls (mc009/mc010) already let you through and still
  do. If a real gatehouse piece is imported in block F, this system will
  handle it with no further work.

[COMPLETE] **B11 · The raiders' ram can be broken, and its wheels turn.** The rig lab
had already charted `wheel_0`/`wheel_1` on oc4806/oc4807, so the component
now renders through `RiggedProp` instead of `PropModel` and rotates any
`wheel_*` role by **distance travelled** (`travel / radius`) rather than a
spin rate picked by eye. The ram carries 30 HP, takes melee swings and bolts
through one shared damage path, tips onto its axle when broken and lies there
six seconds before clearing, and drops salvage (4 wood, 2 plank, 1 iron bar)
plus 60 combat XP. `resetRaiderRam` on spawn, so a ram broken last raid does
not roll back in already wrecked. Verified: rolls (1.7m in 4s), six bolts at
7 each take it from 30 to 0, salvage lands, wreck renders tipped.

---

## Block C shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **C12 · The first-person view now uses the player's OWN minifig arms.**

What was there before was two procedural cylinders — a tapered tube for the
sleeve and a stub for the fist — wearing the player's palette colours. That
is why it never looked like the character you built: it was not a LEGO arm at
all. `lib/fpsArms.ts` assembles the player's rig (`keepProps: false`, so a
donor's molded weapon does not tag along), lifts the `rightarm`/`leftarm`
joint groups — which `assembleRiggedMinifig` has already re-hung from the
torso's shoulder sockets — and measures each one's wrist point.

**The placement is solved, not hand-tuned.** A fixed pitch only ever looks
right for one donor's proportions. Instead the arm is **pinned by its hand**:
the inner group translates so the measured wrist lands on the group origin —
the same point the held tool already mounts at — and the outer rotation is a
`setFromUnitVectors` from the arm's own hang direction to the desired
camera-space direction. Any donor's arm therefore arrives with its hand
exactly where the sword is, whatever the mold looks like. The procedural
cylinders survive as a fallback for a donor whose arms cannot be classified,
so the hand is never empty.

- The shield hand comes from the rig lab's own per-donor `shieldHand`
  (`labHands`), not a hardcoded left, and blocking now raises a **real** arm
  holding the shield rather than a floating shield.
- Colours are inherited rather than applied: the arms come out of the rig,
  which already recolours by `armColor`/`handColor`, so changing the palette
  changes the view. Verified — yellow arm/hand became blue on a palette
  change with no other work.
- Verified across every state: fist, sword, crossbow, longbow, axe at a tree,
  pickaxe at a rock, and blocking.

**Two test-harness notes worth keeping.** `targetKind` is recomputed by
PlayerController every frame, so `setState({ targetKind })` is stomped within
~16ms — the tool states have to be reached by actually standing in front of
the node, the same lesson `playerState` already taught. And the first attempt
at this planted the shoulder mid-frame, which rendered as a huge slab filling
the view; measuring the extracted arm (0.34 × 0.54 × 0.49 at a 1.75m figure)
showed the geometry was fine and the mounting was wrong.

---

## Block D shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **Shared rig extraction first.** `lib/rigExtract.ts` replaces `lib/fpsArms.ts`
and caches assembly **keyed by appearance** — so the viewmodel's arms and the
HUD portrait, which want two different parts of the same character, cost one
figure rather than two. The cache key being the appearance is also what makes
both of them follow the character editor with no explicit invalidation:
change a sleeve colour and the entry is simply a different key.

[COMPLETE] **D13 · The vitals crest is your actual head.** It was a generic helm glyph,
which told you nothing about the character you built. It is now the real
`head` joint — headgear included, because a helm or a crown is most of how a
character reads at a glance — in its own 58px `<Canvas>` with
`frameloop="demand"`, since the HUD is a DOM overlay with no scene to portal
into. A slow left-right sway, not a spin. The helm glyph survives as the
fallback for a donor whose head cannot be classified.

[COMPLETE] **D13b · Appearance is editable mid-game.** `AppearancePanel`, reachable from
the Satchel, offers the same face / crest / four-colour choices the creator
does and writes straight back to `character`. It deliberately does **not**
offer name, gender or calling: those are identity, and switching calling
would retroactively change an earned XP bonus. Verified — clicking a swatch
changed `armColor` 26 → 18 and the portrait, the paperdoll and the
first-person sleeves all followed.

[COMPLETE] **D14/D15/D16 share one resolve.** `game/targeting.ts` answers "what is the
crosshair on?" once per 100ms in PlayerController's loop, and the readout,
the reticle colour and the scan all read that same answer — so they can
never disagree about what you are looking at. Foes are tested against the
**real per-part hitboxes from block B**, so the readout appears only when the
crosshair is genuinely on them; friendlies get a simple upright cylinder,
which is all they need.
- **D14** — a floating card above the crosshair: name, standing, a health bar
  with numbers, distance, and whether they are already in your book.
- **D15** — the reticle turns red on a foe, green on an ally. Colour is not
  the only cue: the card names the standing in words directly beneath it.
- **D16** — the collection book (`G`), filled in by **scanning** (`F`), not
  by killing: you have to stop and look at something to learn about it. Every
  foe gets a card whether or not you have recorded it, greyed with its
  details withheld, so the book reads as a set with gaps rather than hiding
  how much is left. Persisted across all five save spots.
- Verified end to end: aiming at a bandit gave `Bandit / hostile / 8/8 / 7m`
  with `kk-reticle hostile`; `F` moved the bestiary from `[]` to
  `["bandit"]`; aiming at Alric gave `friendly` and a green reticle.

**Note on D15's scope.** The plan had this waiting on Block E's allegiance
axis. It does not need to: hostile-vs-friendly is real information the game
already has, and it is the distinction that matters when you are deciding
whether to loose. When E lands, `Standing` gains the finer shades ('neutral'
is already in the type and unused) without any change at the call sites.

---

# PLAN REVISION 2 — 2026-07-25 feedback folded in [COMPLETE]

22 new items from playtesting. Blocks A–D are shipped; E/F/G are re-scoped
below and two new blocks (H, I) are added for the rig/model work and the
HUD/progression work, which are big enough that burying them inside F or G
would hide them.

Diagnoses marked **[found]** were confirmed against the code or the asset
data while writing this — they are not guesses.

## Three findings that change the shape of the work [COMPLETE]

[COMPLETE] **1 · The walls never reached the geometry-based collision. [found]**
Block B's `gen-collision.mjs` voxelises source OBJs into real volumes, and
`mc007.obj` (the castle wall) exists in the extraction. But the catalog
parser captures a *subdirectory-qualified* path for hand-authored entries
(`buildings/mc007`) while the OBJ index is keyed by **basename**, so
`objIndex.get('buildings/mc007')` missed. **13 of the 37 hand-authored
pieces fell through to their bounding box — including stonewall, tower,
gate and keep**, i.e. exactly the pieces you notice. So: yes, we can read
the model rather than the bbox, the machinery is already there, and **no
Blender work is needed**. One-line fix, then re-run and re-measure.

[COMPLETE] **2 · The lab already names held weapons on 35 donors. [found]**
`part_roles.json` carries verified role maps including
`minifigjohnmayne01: bow`, `minifiggilbertbad03 / minifiggenericbad00 /
minifigweezil01: crossbow`, and `sword`/`spear`/`axe`/`halberd`/`shield`
across the Cedric, Gilbert, Richard, Storm and John donors — exactly the
"find it on a good/bad model" you described. `lib/weaponParts.ts` currently
uses **hand-picked shape ids plus a PCA long-axis guess**, which is the root
of every flip bug we have chased (the sword, then the crossbow). Replacing
that with the lab's role map removes the guesswork *and* gives correct grip
orientation for free, because the donor's own hand is holding the thing.
**Caveat, stated plainly:** there is **no pickaxe and no hammer** among the
held gear — the only `pickaxe` in the data is a trait on a defence tower,
not a mold. Those two stay procedural and instead get re-aligned to the real
hand.

[COMPLETE] **3 · The horse rigs are fully verified. [found]**
All six horses (`l7339200/11/12/21/31/32`) carry `rigClass: "horse"`,
`status: "verified"`, with `body` plus `leg_upper`/`leg_lower` for all four
legs. A grazing/walking cycle is a wiring job, not a research job.

---

## Block E · Allegiance & quests  *(re-scoped)* [COMPLETE]

- [COMPLETE] **E17 · Allegiance axis** on the character, persisted, surfaced in the
  Satchel stats. Unchanged from the original plan.
- [COMPLETE] **E18 · Quest content across good / neutral / evil**, with per-quest
  allegiance deltas, precursor chains, and locks that name their blocker.
  Unchanged.
- [COMPLETE] **E19 · NEW — the allegiance component itself.** Leo's banner at one end,
  Cedric's at the other, with a bar between them whose fill and colour move
  with your standing: Leo's blue / yellow / white as it swings his way,
  Cedric's red / black / brown as it swings his. Both flags always visible so
  the axis reads as a choice between two houses rather than a score. Uses the
  real banner assets rather than flat swatches where they exist.

## Block F · Building, land & the castle  *(re-scoped)* [COMPLETE]

- [COMPLETE] **F19 · Build grid sized for real wall runs** (4-piece runs + corners tile
  end to end). Unchanged.
- [COMPLETE] **F20 · Land purchase / homestead expansion.** Unchanged.
- [COMPLETE] **F21 · Grand Keep from the MC00 green base + 4 corners + 2 middles.**
  Unchanged.
- [COMPLETE] **F22 · Import the remaining OBJ brick library.** Unchanged.
- [COMPLETE] **F23 · NEW — collision generator subdirectory fix. [found]** See finding
  1. Key the OBJ index lookup on the basename. Then re-run and verify the
  wall/tower/gate/keep get real volumes, and re-test walking through the
  keep's gate. Small, and it unblocks how solid the castle *feels*.
- [COMPLETE] **F24 · NEW — corner walls get no facing arrow.** They are bi-directional,
  so the placement arrow is noise at best and misleading at worst. The lab
  already labels these (`traits.wall.wallRole: 'corner'` on mc001/002/004/
  005), so this is data-driven rather than a hardcoded id list.
- [COMPLETE] **F25 · NEW — a real road to the signpost.** Lay road pieces from the
  scenery OBJ set into a path leading to the signpost and on to a marked
  exit point, so travelling out of the homestead reads as leaving by a road
  instead of walking to an invisible trigger.

## Block G · Defence, AI & pathing  *(re-scoped, now the big AI block)* [COMPLETE]

- [COMPLETE] **G23 · Towers and explosives auto-engage.** Unchanged.
- [COMPLETE] **G24 · Assign kin to emplacements.** Unchanged.
- [COMPLETE] **G25 · NEW — real pathfinding for everyone.** Enemies currently walk
  through walls; so do allies. Both need to route around solid structures
  and *through* genuine openings (breached walls, gates, arches). Plan: build
  a coarse navigation grid over the build region from the same per-piece
  collision volumes F23 fixes — so a hole in the geometry is automatically a
  hole in the navmesh, with no second source of truth — and run A* over it.
  This is the single largest item in G and should be built before G26/G27
  lean on it.
- [COMPLETE] **G26 · NEW — defenders engage the dragon.** They currently ignore a
  flying target entirely. Needs an air-target branch in the defender AI plus
  an arc that actually reaches altitude.
- [COMPLETE] **G27 · NEW — mounted patrols, captured horses and a stable.** Capture a
  wild horse, stable it, and assign it to a defender so patrols ride. The lab
  distinguishes six horse variants with bridles, barding and flags
  (`traits.mount.faction` already drives Cedric's chargers), so customisation
  is picking among real variants rather than inventing options.
- [COMPLETE] **G28 · NEW — defender schedule bug.** Scouts/defenders are not sleeping
  during the day; their schedule is supposed to be the inverse of the
  workers' (patrol at night, rest by day).

## Block H · NEW — rigs, models & animation [COMPLETE]

The biggest block, and mostly unblocked by finding 2.

- [COMPLETE] **H29 · Weapons from the lab's named held gear.** Retire `weaponParts.ts`'s
  hand-picked shape ids + PCA long-axis guess in favour of the verified role
  map: bow from `minifigjohnmayne01`, crossbow from a bad-guy donor,
  sword/spear/axe/halberd/shield from the donors that hold them. Removes the
  sign-ambiguity class of bug permanently.
- [COMPLETE] **H30 · Realign every first-person weapon.** With H29 landed, each weapon
  can be seated using the donor's own hand-to-weapon relation as the
  reference pose, instead of per-weapon offsets tuned by eye. The shield is
  already right; sword, bow, crossbow, axe are not.
- [COMPLETE] **H31 · Two hands in first person, raised.** The current single arm sits
  too low and the off hand does not exist. Both arms come from the same rig
  extraction the portrait uses.
- [COMPLETE] **H32 · Running arm animation.** Alternating arm swing while moving —
  one up as the other goes down — driven off `playerState.speed`, matching
  the third-person walk cycle rather than a separate invented motion.
- [COMPLETE] **H33 · Bow draw-back animation**, and the crossbow's equivalent (span and
  load). The longbow already tracks a draw fraction for damage; it has no
  visual.
- [COMPLETE] **H34 · Pickaxe and hammer re-alignment.** No lab mold exists for either
  (finding 2), so these stay procedural — but they are currently oriented
  as if held by nothing in particular. Re-seat them against the real hand.
- [COMPLETE] **H35 · Alric and Beda's rigs.** Their heads and arms scatter while they
  stand at their posts but are correct once welcomed — which means there are
  two render paths and only one is using the good classification. Both use
  the generic donors, which ARE in the lab's role map, so the fix is making
  the failing path take the same route. Prime suspects: the `keepProps` flag
  and the rig-map confidence threshold.
- [COMPLETE] **H36 · Horse animation.** Grazing horses are frozen despite verified rigs
  (finding 3). Wire `leg_upper`/`leg_lower` into a walk/graze cycle. Feeds
  G27's mounted patrols.
- [COMPLETE] **H37 · Raider cart wheel wobble.** The wheels turn on the wrong axis or
  about the wrong pivot — block B rotated them about their group's local X
  without re-pivoting each wheel on its own hub.

## Block I · NEW — HUD, feedback & progression [COMPLETE]

- [COMPLETE] **I38 · Replace the loading screen.** Still the old brick art and
  "Raising the drawbridge…". Should match the front-door design language the
  UI pack established.
- [COMPLETE] **I39 · Enemy health above the model, in the world.** Not a modal, and not
  a CSS-layer overlay — an actual in-scene object that sits above the figure
  and faces the camera (a billboarded sprite/plane), so it moves with them
  and scales with distance. The D14 card stays for the detailed aim readout;
  this is the at-a-glance one.
- [COMPLETE] **I40 · No readout for friendly NPCs at their posts.** Alric and Beda
  should not be popping a panel while they stand guard. *Needs one
  clarification from you:* whether this is the dialogue panel opening on its
  own, or the new aim card from block D showing on friendlies — I will check
  both, but knowing which you saw would save a pass.
- [COMPLETE] **I41 · Command panel: text overflow and pointer-lock churn.** Text runs
  outside its boxes, and opening/closing it locks and unlocks the pointer
  every time. Wants both a layout fix and a better interaction model — likely
  hold-to-open radial rather than a modal that seizes the cursor.
- [COMPLETE] **I42 · Richard's fourth line is King Leo. [found]** `lore_richard_cedric`
  ("Did you keep up alright? … the evil Cedric the Bull") is in Richard's
  queue but is Leo's voice. Move it to Leo, or drop it from Richard's run.
- [COMPLETE] **I43 · XP scaling rework.** Current awards do not scale sensibly across
  the level range.
- [COMPLETE] **I44 · Level-ups raise vitals.** Each general level grants a small
  percentage to max health and max stamina, so levelling has a felt effect
  beyond unlocks.

## Suggested order [COMPLETE]

F23 first — it is one line, it is the thing you keep hitting, and G25's
navmesh should be built on top of the corrected volumes rather than rebuilt
after. Then H29/H30 together (they are one change to how weapons are
sourced), then the rest of H, then G25 and the AI that depends on it, then E.
I's items are small and can ride along with whichever block is in flight.

---

## F23 + G25 + I40 shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **F23 · The walls read their real geometry now — no Blender needed.**
`gen-collision.mjs` keys its OBJ index by BASENAME, but the catalog parser
was capturing a folder-qualified path for hand-authored entries
(`buildings/mc007`). **13 of 37 pieces silently fell back to a bounding box,
including stonewall, tower, gate and keep** — precisely the ones you notice.
One-line fix (`model.split('/').pop()`).

**Then a second, bigger improvement fell out of it.** Surface voxelisation
leaves a solid wall hollow inside, which is harmless for blocking but
fragments the merge badly — a plain wall came out as 44 boxes, and the tower
(63) and keep (60) blew past the box cap and fell back to bbox anyway. Added
a flood fill from the grid boundary: empty space the flood never reaches is
enclosed, so it is filled; a genuine opening connects to the outside and
stays empty. Results:

| piece | before | after |
|---|---|---|
| keep | 60 (rejected) | **11** |
| stonewall | 44 | **16** |
| tower | 63 (rejected) | **44** |
| arch 4×12 | 44 | **13** |

Coverage went 40 → **51** pieces with real volumes, only 1 still missing an
OBJ, and the file got *smaller* (47.6 → 43.7 KB).

**What this actually changed in play:** the castle wall's real stone is a
**0.86m slab sitting at the back of its 2.8m declared footprint**, with the
battlement walkway overhanging forward. So you now walk *under* the
battlement and are stopped by the actual masonry — the player's stop distance
went from 1.85m short of the wall to 0.09m. That is the "walls are still
doing a bounding box limit" complaint, resolved.

[COMPLETE] **G25 · A\* pathing, built on those volumes.** `game/navgrid.ts` rasterises
the SAME `collisionBoxesFor` volumes the player is stopped by into a 1m grid
(112×112, agent-inflated), and runs octile A* over it. Deriving the navmesh
from the collision data rather than a second obstacle list is the whole
point: **a hole in the geometry is automatically a hole in the navmesh**, so
a breached wall, an arch or an open gate is walkable without anyone
remembering to say so. Boxes that only exist above head height (a walkway, an
arch crown) are skipped, which is what lets a walker use a gateway.
- Enemies path while chasing, recomputed on a stagger timer and whenever the
  player has moved more than 3m.
- Villagers route through `navSteer` at all six of their seek sites (flee
  home, night bed claim, job trips, gathering spot).
- Court NPCs route to the night gathering spot the same way.
- Falls back to steering straight when there is no route — which is exactly
  what every caller did before, so nothing can get stuck.
- Verified: a 24m solid wall is **routed around** (8 waypoints, widest point
  13.5m, zero waypoints on the wall line); the same wall **with a gap** is
  crossed **straight through** (1 waypoint, widest 0.5m); and a bandit
  chasing the player across a wall spent **zero frames inside the stone**.

[COMPLETE] **I40 · The aim card is an aiming readout again.** Confirmed from your
description it was block D's card, not the dialogue panel. It now appears
only with a ranged weapon readied, or for a hostile within 14m — so walking
up to Alric no longer parks a "Friendly · 2 m away" panel mid-screen.
- **Caught a regression from my own fix:** gating the card also killed the
  reticle's colour, because the standing was being lifted out of the card
  component. The reticle colours for *every* target, always — that is the
  at-a-glance cue and it must not depend on what is drawn below it. Now
  verified separately: hostile → red reticle **and** card; friendly → green
  reticle, **no** card.

---

## Block E shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **E17 · The allegiance axis.** The game had `alliance` — a one-way pledge to
Leo or Cedric, made once and never revisited. That is a switch, not a
standing: nothing you did afterwards moved it. `data/allegiance.ts` adds the
continuous axis underneath it, **-100 (the Bull) … 0 (unsworn) … +100 (the
crown)**, with seven named bands from "Cedric's Right Hand" to "Paladin of
the Crown". Persisted across all five save spots, alongside a new
`completedSideQuests` list.

The pledge and the standing are deliberately kept separate and are **allowed
to disagree** — swearing to Leo and then doing the Bull's work should look
like exactly what it is, and the meter says so in as many words.

[COMPLETE] **E19 · The house-banner meter.** Cedric's banner at one end, Leo's at the
other, always both drawn, with the one you lean toward brightened and the
other dimmed. The bar fills from the neutral centre outward in that house's
own colours — Leo's blue/gold/white, the Bull's red/black/brown — with the
centre mark left visible so "unsworn" reads as a real place rather than an
empty middle. Sits in the Satchel's stats beside your gear, and heads the
Quest Log, where it is the frame every errand below is tagged against.
- **One legibility bug caught in verification:** the Quest Log is an aged
  parchment surface, so the meter's default light-on-dark caption vanished
  into it — the same light-on-light trap the Millennium Chrome lane hit
  earlier. Fixed by re-pointing the ink for the parchment context rather than
  patching each element at the call site.

[COMPLETE] **E18 · Errands that take a side.** `data/allegianceQuests.ts` adds three
pools and, more importantly, the shape that makes a direction mean something:
- an `allegiance` delta, so finishing an errand moves where you stand;
- `requires`, so a chain has to be walked in order;
- `needsAllegiance`, so the deepest work on either side is only offered to
  someone who has already committed.

**The neutral pool matters as much as the other two.** Alric and Beda had no
errands at all; they now ask for honest village work — fencing a field,
re-dressing a millstone, lighting the mill road — that neither house has an
opinion about. That is what keeps *unsworn* a playable stance instead of a
gap you pass through on the way to picking a side. John of Mayne's river work
is deliberately left out of the delta table for the same reason.

Gates are enforced in the **store**, not only in the UI, so a stale panel can
never hand out work you have not earned. Locked errands **name their
blocker** — "First: Smuggle 2 iron bars to the rebellion's forges", or the
allegiance band required — rather than sitting greyed and silent.

Verified end to end: a gated errand refuses while unsworn; a chained errand
refuses before its precursor; the opener accepts; turning it in moved the axis
0 → −8 and recorded the completion; and **neutral village work left the axis
untouched**, which is the case most likely to be got wrong.

---

## Block H shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **H29 · Weapons come from the lab's verified role maps now.**
`weaponParts.ts` used to name a hand-picked OBJ shape id per weapon and then
guess its direction with a PCA long axis. An eigenvector is an **undirected
line** — its sign is arbitrary — which is why the sword needed a `flip` flag,
then the crossbow needed one too, and every new weapon was a coin toss.

Both halves of that are gone. The mesh comes from the lab's own role name
(`sword`, `bow`, `crossbow`, `spear`, `halberd`), and the POSE comes from the
donor **actually holding it**: take whichever hand mesh is nearer the weapon
as the grip, point the weapon from that grip to its own far end. Direction and
grip both fall out of the pose, so there is no sign left to get wrong.
- The longbow finally has a real mold — John of Mayne carries one — along with
  the `arrow` he carries and the crossbow donor's own `crossbow_bolt`.
- Ammunition is flagged `straight`: an arrow is a shaft nobody grips, so the
  nearest-hand rule would pick a hand nowhere near it. Those use their own
  long axis, which is unambiguous.

[COMPLETE] **H30 · Every weapon re-seated.** With one convention (grip at origin, length
along +Y) each mount is now a statement of where the weapon should POINT —
blade up and forward, crossbow levelled downrange — rather than a per-weapon
offset tuned by eye.

[COMPLETE] **H31/H32 · Two hands, raised, and a real run swing.** The off hand exists
now; a first-person view with one arm reads as a floating prop. Both sit at
-0.34 rather than -0.42, which is what made the old hand look like it was
hanging below the frame. The swing counter-phases off the SAME bob phase that
drives the footfall, so it lands with the step instead of drifting against
it — one arm forward as the other goes back, easing to rest when you stop.

[COMPLETE] **H33 · The bow draws.** Real mold, real nocked arrow riding the string back,
and a two-segment string that forms a proper V as it is drawn. The string
stays procedural and honestly so — it is a LEGO mold and there is no string in
the plastic. The crossbow shows its bolt in the groove while loaded.

[COMPLETE] **H34 · Pickaxe and hammer.** Stated plainly: **there is no mold for either
anywhere in the extraction** — the lab's only `pickaxe` is a trait on a
defence tower, not a held part. They stay procedural. What was actually wrong
was the pose: the hafts sat nearly upright while the hand angles in toward
the camera, so the head pointed up and away instead of out in front where a
swing starts. Pitched forward to lie along the forearm.

[COMPLETE] **H35 · Alric and Beda.** `Npc.tsx` passed `keepProps` for every court NPC,
and those two share the GENERIC donors — which carry a molded halberd and a
crossbow. That both mis-characterised a farmer and a miller and fed a large
held mesh into the arm cluster, which is what threw their limbs about while
they stood at their posts. `keepProps` is now per-NPC and false for the
village folk. Alric verified visually.
*Honest limit:* I could not get an unobstructed camera on Beda — her post
sits behind a hut and headless Playwright cannot steer a look. She is on the
identical code path with the identical flag.

[COMPLETE] **H36 · The horses move.** The lab verified a full four-leg rig on all six
(`body` + `leg_upper`/`leg_lower` ×4 + `head` + `tail`), but they rendered
from GLB, which merges by material and drops the names — so they were frozen.
Now on the OBJ path.
- **A real obstacle, solved generally:** a rig can name the SAME role on
  several disjoint parts — all four upper legs are `leg_upper`. Bucketing them
  together swings the set as one lump. Repeated roles are now split into
  spatially separated clusters keyed `role#0..n`, ordered front-to-back then
  left-to-right, so limb 0 is the same limb on every donor of a rig class.
- The gait walks on **diagonal pairs** (0+3 against 1+2), which is what stops
  it looking like a pantomime horse. Standing reads as grazing — head down,
  tail swishing — rather than frozen.

[COMPLETE] **H37 · The cart wheels roll instead of wobbling.** A wheel is a thin disc and
must turn about its **axle**, which is whichever axis it is thinnest along —
not a fixed X. Spinning a Z-axled wheel about X is exactly the reported
wobble. `propRig` now measures each wheel's axle from its own bounds and
`RiggedProp` rotates about it.

---

## Block F, part 1 — 2026-07-25 (F19, F20, F22, F24 shipped) [COMPLETE]

[COMPLETE] **F19 · The grid is sized so a castle actually tiles.** A straight wall is 8m
and a corner is 4m, so one finished side is `corner + N×wall + corner` =
**8N + 8** metres. The old region was a flat 60m across, which is not one of
those numbers: a four-wall run plus corners came to 40 and left a ragged 20m
of grid that no piece fitted. Every size is now a real 8N+8, so a run always
closes on a corner. Verified all five: 32/40/48/56/64m = 3/4/5/6/7 walls a
side, exact in every case.

[COMPLETE] **F20 · Those sizes ARE the land you buy.** Rather than a separate mechanic
bolted on, the tiers are the expansion: Smallholding (3 walls a side, free) →
Freehold 120g → Manor 320g → Estate 700g → Barony 1400g. Buying re-seeds
resource nodes, so whatever was standing on the new ground — trees, ore —
comes inside the fold. The control sits in the build palette footer beside the
structure count, and names its price when you cannot afford it.
- **Old saves are safe.** The maximum tier (±32) is deliberately *larger* than
  the old flat ±30, and a save without a `landTier` loads at the maximum — so
  no existing building can be stranded outside its own fence by this change.
  New games start on the Smallholding.

[COMPLETE] **F22 · The last two folders reached the catalog.** `buildings` (the rest of
the castle set) and `scenery` (crates, barrels, plants) were being copied for
props but never offered as pieces you could place. Catalog went **133 → 160**
buildables; collision coverage went 51 → 58 pieces with real volumes. The
hand-authored ids are excluded so no mesh is ever listed twice.

[COMPLETE] **F24 · Corners no longer claim a facing.** A corner turns a run either way,
so a direction arrow on one is noise at best. Driven off the lab's own
`traits.wall.wallRole` (`corner` / `corner_connectable`) rather than a
hardcoded id list. Verified: the straight wall keeps its arrow and front tick;
the corner shows neither.

### Still open in F [COMPLETE]
- [COMPLETE] **F21 · The Grand Keep from the MC00 green base + 4 corners + 2 middles.**
  Not started. It is a composition problem rather than a wiring one — a single
  buildable that places and renders as several real parts — and deserves its
  own pass rather than being rushed in behind four other changes.
- [COMPLETE] **F25 · The road to the signpost.** Not started.

---

# PLAN REVISION 3 — the brick economy and build feel [COMPLETE]

A new block J, plus F21 restated with the design you described. These change
what the game IS more than anything left in G or I, so they are grouped
together rather than sprinkled across existing blocks.

## Block J · NEW — bricks as the economy, and building that feels built [COMPLETE]

[COMPLETE] **J45 · Bricks become the resources.** Right now you mine a rock and receive
an abstract "stone", then spend abstract stone on a building. The catalogue
already holds 160 real LEGO pieces — those should BE the currency. Gathering
yields actual bricks; a building's cost is a bill of specific pieces. Stone,
iron and timber stop being invisible numbers and become the plates and bricks
you can see in your satchel.
- Needs a mapping from the existing resource ids onto brick families so old
  saves convert rather than losing their inventory.
- The satchel becomes a parts bin, which is a real UI change, not a relabel.

[COMPLETE] **J46 · Resource grounds, unlocked by the deed.** Gathering should happen in
DESIGNATED areas rather than wherever a node happened to seed, and those
areas open as you buy land (F20's tiers). Buying the Freehold should hand you
a quarry or a stand of timber you could see but not work before. This makes
the land ladder mean something beyond a wider fence.

[COMPLETE] **J47 · A real ghost, not a blanket square.** The placement preview is a
translucent box today. It should be the ACTUAL model as an outline/wireframe,
so you can see the shape and facing of the thing you are about to commit to
before you commit. The collision work already loads each piece's real
geometry, so the shape is available.

[COMPLETE] **J48 · Buildings rise out of the ground.** When construction completes the
solid model should grow up from the earth rather than popping into being —
the wireframe fills in from the base as the work proceeds.

[COMPLETE] **J49 · Building takes real work.** A couple of hammer swings is not a
building. Construction wants a longer, more deliberate arc, with the rise in
J48 tracking progress so the time reads as visible growth rather than a
progress bar.

[COMPLETE] **J50 · Flames, animated from the lab's own parts.** The lab names
`flame`/`flame_0..3` on `oc4807`, `oc6096-3`, `oc6098b1` and `oc6098b2`.
`RiggedProp` already flickers a single `flame` role; these should be extracted
as a reusable fire that torches, campfires, braziers and the burning siege
pieces all draw on, instead of the procedural flame used today.

[COMPLETE] **J51 · The Grand Keep, composed** *(was F21, restated to your design)*.
Not one mesh but a real assembly: start from the MC00 green base plate, then
**select a corner on that base and be offered what can go there** — a corner
tower, a wall run, a gatehouse — building the keep up piece by piece into a
finished castle you designed. That is a different mechanic from placing a
single buildable, which is why it is here rather than left in F: it needs its
own selection model (pick a socket, not a grid cell), its own storage (a keep
is a set of parts plus their sockets), and its own damage/move behaviour.

## Ordering note [COMPLETE]

J47 → J48 → J49 are one arc and should be built together; the ghost, the
rise and the duration are three views of the same construction moment. J45
and J46 are the economy pair. J51 is the largest single item in the plan now
that E is done, and depends on nothing else — it can go whenever it is wanted.

---

## F25 shipped — 2026-07-25 [COMPLETE]

[COMPLETE] **A real road out of the homestead.** The signpost stood in open grass: you
walked to an invisible trigger and the world changed. The extraction's own
32×32 baseplates (`l4109610–13`, 11.2m square and 7cm thick — surfaced by
F22's catalogue import) now lay a path from the edge of the buildable ground,
past the signpost, out to a way-point flanked by marker stones.

Deliberately world dressing rather than buildings: the plates are props, so
they never occupy a build square, and at 7cm they sit below the step-up
height so you walk over them rather than onto them. The road starts clear of
`LAND_TIERS`' widest half-extent, so buying land can never swallow it.

**F21 has moved to J51** and been restated to the design you described —
select a corner on the base component and be offered what can go there. See
Plan revision 3.

---

## Block I, part 1 — 2026-07-25 (I38, I42, I43, I44 shipped) [COMPLETE]

[COMPLETE] **I38 · The loading screen.** It was a line of italic text on the old panel
chrome — "Raising the drawbridge…" — with nothing to do with the front door
the UI pack established. Now the same chrome plaque and sky as the title
screen, so the load reads as the game starting rather than a placeholder.

[COMPLETE] **I42 · Richard's fourth line was King Leo's.** "Did you keep up alright? …
the evil Cedric the Bull" (`lore_richard_cedric`) was playing in Richard's run
with his portrait over it. Moved into Leo's block, where the recording
belongs. Richard keeps his own four.

[COMPLETE] **I43 · XP scaling — the actual problem, and a fix that does not re-rank
anyone.** Awards were FLAT: a skeleton paid 20 combat XP at level 1 and at
level 20. The curve is quadratic (50·L²), so the gap between levels grows by
50(2L+1) each time. Constant awards against a widening gap is exactly why
early levels flew past and later ones stalled.

Scaling the award linearly with the skill's own level matches the curve's
shape, so a level costs roughly the same *number of actions* all the way up.
Measured, in 20-XP chops to gain one level:

| from level | before | after |
|---|---|---|
| 0 → 1 | 3 | 3 |
| 5 → 6 | 28 | **18** |
| 10 → 11 | 53 | **24** |
| 15 → 16 | 78 | **28** |

Deliberately does **not** touch `xpForLevel`/`levelFromXp`. Changing the curve
itself would silently re-rank every existing save — a player who was a Squire
would log in as something else.

[COMPLETE] **I44 · Levelling is felt.** Every general level now adds to both vitals: a
heart every three total levels, and a steady stamina trickle, on top of the
perk/talent/attribute bonuses already there. A new heart arrives **full** —
earning one and finding it empty reads as a dilution of the health you had,
which is the opposite of a reward. Measured: 10 HP / 100 stamina at zero,
31 HP / 195 stamina with nine levels in all seven skills.

### Still open in I [COMPLETE]
- [COMPLETE] **I39 · Enemy health as an in-world billboard** above the model rather than
  the aim card. Not started.
- [COMPLETE] **I41 · Command panel** text overflow and the pointer-lock churn. Not
  started — the interaction model wants rethinking, not just a layout fix.

---

## Blocks I and G — COMPLETE, 2026-07-25 [COMPLETE]

[COMPLETE] **Vitals are a bar, not hearts.** The HUD work replaced the heart glyphs with
one vigour bar, but the language never followed — food said "+3 ❤", the
satchel said "restoring hearts". All of it now says vigour.

[COMPLETE] **I39 · Enemy health, in the world.** A billboarded plate above each wounded
foe: two planes on a group that yaw-faces the camera, drawn with the scene
rather than as an HTML overlay (a DOM layer needs its own renderer, is never
occluded, and jitters against the canvas). Constant on-screen size, drains
left-to-right, green→amber→red, and only appears once something is hurt.

[COMPLETE] **I41 · The order panel is a hold-to-open radial.** Two problems, one cause:
text overflowed its fixed tiles, and every open/close released and
re-acquired pointer lock. The fix is not to release the pointer at all —
`game/commandWheel.ts` takes the mouse deltas that would steer the camera and
resolves a sector instead. Old modal deleted. Verified: `panel` stays `'none'`
throughout.

[COMPLETE] **G23/G24 · Emplacements fight, and posted kin matter.** Anything the lab
marks `canFire` acquires the nearest hostile and looses on its own cadence,
aimed at the target rather than its placement rotation. A defender posted via
`stationId` (which existed but did nothing) fires it nearly twice as fast and
spots 8m further; a watch tower shoots only when manned. Charges arm on
proximity. Verified: an unmanned cannon engaged a bandit unprompted.

[COMPLETE] **G26 · Defenders engage the dragon.** Nothing on the ground had an air
branch. `dragonAir` now publishes the live position and a `hit()` the siege
owns; bow defenders within 34m slant range volley on a slower cadence.

[COMPLETE] **G28 · Scouts sleep.** The rest branch only ran for `patrol`. Scout is a
standing sweep like patrol — attack and follow are the immediate commands
worth breaking the watch for — so a scouting defender never stood down.

---

# BLOCK K — defects in what was just shipped [COMPLETE]

Eight items from playtesting H/G/F. Most are regressions or half-finished
work of mine, so they are logged together and taken as one block rather than
drip-fed. Diagnoses marked **[found]** were confirmed against the data.

[COMPLETE] **K52 · Horse textures and colours are wrong.** Moving the horses from the
GLB to the OBJ path (H36) also changed their material source: `propRig`
rebuilds every MTL material as a flat `MeshStandardMaterial` from `Kd` alone
and **drops `map_Kd` entirely**, so any horse with a printed hide/barding
renders as a solid block of colour. The siege engines got away with this
because their MTLs are pure palette colours; the horses are not.

[COMPLETE] **K53 · The grazing animation is broken. [found]** Only the upper legs move.
`propRig`'s `splitDisjoint` merges meshes whose centres are within 8 units,
and a horse's `leg_upper`/`leg_lower` pair sits well inside that — so the
four `leg_lower` parts are almost certainly collapsing into fewer clusters
than the four `leg_upper` ones, leaving `leg_lower#2`/`#3` unmatched. The
threshold needs to come from the model's own scale, not a constant.

[COMPLETE] **K54 · Ally NPCs still do not RIDE.** G27 gave a mounted defender speed and
an assignment, but no horse appears under them — the visual half was never
built. A mounted defender needs the horse mesh beneath them and the horse
removed from the wandering herd while assigned.

[COMPLETE] **K55 · The Stable is a wall. [found]** I pointed it at `mc008`, which is a
straight wall section, because it was to hand. It needs a real outbuilding —
`main_interface/buildings` now ships 30 pieces (F22), one of which is an
actual barn.

[COMPLETE] **K56 · FPS weapons still sit wrong, and the bow is reversed.** The arrow
points back at the player and the bow faces outward — the two are swapped.
H29's grip derivation fixed the SIGN problem for weapons the donor holds by
one hand, but a bow is held across the body and its "far end" is a limb tip,
not the direction of fire. Bow and arrow both need their own convention.

[COMPLETE] **K57 · Beda's arms come from a different body. [found]** Her config is
`headDonor: 'minifiggenericgood00'`, `bodyDonor: 'minifiggenericbad00'` — two
different donors with different body types, so the arms fit the wrong torso.
Whatever base model supplies the body must also supply the arms and hands.
Worth auditing every NPC config for the same mismatch, not just hers.

[COMPLETE] **K58 · Crenellated walls still cannot be walked under. [found]** F23 gave
`stonewall` real volumes (16 boxes) and the player now stops at the true
stone face — but the battlement walkway still blocks, because the overhang
sits at y≈3.6 while `passesOverhead` requires a box base ≥ feet + 1.8 AND the
merged boxes span from the ground up. The walkway and the wall are ending up
in the same box.

**K59 · The road plates are the wrong pieces. [found]** `l4109610`–`13` are
green LEGO baseplates (`glit030`, RGB 0/0.42/0.07) that differ only in their
printed texture (`tex162`–`tex165`), and **none of them is in the lab's
capability data at all** — I chose them on size (32×32) without checking what
they are. The right piece has to be identified from the metadata's textures,
and only the road print used.

## Order [COMPLETE]

K57 and K55 are one-line data fixes. K53 and K52 are both `propRig`. K58 is
collision. K56 is `weaponParts`. K54 is the largest — it needs the mounted
render path that G27 never built. K59 needs the texture identified first.

---

## Block K — part 1 shipped, 2026-07-25 [COMPLETE]

[COMPLETE] **K57 · Beda's arms.** Her config had `headDonor: minifiggenericgood00` with
`bodyDonor: minifiggenericbad00` — two donors with different body types, so
the arms the rig re-hangs belonged to a torso she was not wearing. Both now
come from one donor. **Audited the whole roster: she was the only mismatch.**

[COMPLETE] **K55 · The Stable was a wall.** It pointed at `mc008`, a straight wall
section. There is no barn mold anywhere in the extraction (checked all 86
lab-verified assets), so it now uses the same piece the starter village's
huts use, at a barn's proportions.

[COMPLETE] **K52 · Horse textures.** Moving the horses to the OBJ path also moved their
materials through `propRig`'s Phong→Standard rebuild, which read `Kd` alone
and **dropped `map_Kd` on the floor**. Fine for the siege engines (pure
palette colours), badly wrong for the horses, whose hide is printed — they
came out as flat blocks. The rebuild now carries the map, transparency and
alpha test across.

[COMPLETE] **K53 · All four legs move.** `splitDisjoint` merged parts within a flat 8
units, which is wider than the gap between a horse's own legs. Measured
against the real geometry: at 0.6 and 0.45 the legs collapse to two clusters,
at 0.35 the lowers split but the uppers do not, and **0.25 is the first value
that resolves all four of both** — which is what the diagonal gait needs. The
threshold is now relative to the parts' own bounding spheres, not a constant.

[COMPLETE] **K56 · The bow and arrow were swapped.** Both sat inside one rotated group,
so the arrow inherited the bow's cross-body turn and aimed back at the
archer. They are siblings now: the bow keeps its presentation, the arrow is
aimed downrange in the mount's own frame and rides back as the draw deepens.

### K58 · Investigated, and the answer is not a code fix [COMPLETE]

The crenellated wall's overhang is **already clear**. Every blocking box on
`stonewall` is confined to `z −1.40..−0.54` (the stone slab); nothing blocks
beyond it, and the walk test has the player reaching z = −0.09, i.e. under
the walkway. The collision matches the geometry.

**mc007 simply has no archway** — it is a solid slab with a walkway ledge on
top, so there is nothing to walk *under* except that shallow ledge. I swept
all 58 pieces with real volumes for a person-sized passage in a piece over
2.5m tall: the only hits are the wall family (clear along their LENGTH, i.e.
walking beside them) and `oc6095b4`, which the lab identifies as a "dual
stand platform" — a spectator stand, not a gatehouse.

**Walking under a wall needs a gatehouse piece that does not currently
exist in the catalogue.** That is an asset question and belongs with J51's
castle composition, not a collision tweak.

## Block K — part 2 shipped, 2026-07-26 [COMPLETE]

[COMPLETE] **K59 · The road is a road now.** The four plates were confirmed wrong by
sampling their prints: `spr162`–`165` are 35–67% green with no stone in them
at all, and none appears in the lab's capability data. The surface that IS the
game's own trodden ground is `spr177_128x128`, which `template-02.mtl` uses for
the Tourney Grounds arena floor (100% stone and earth tones). `prepare-assets`
now copies it to `textures/ground/`, and `Road.tsx` is no longer four square
baseplates but ONE mitred ribbon: each waypoint's edge pair is offset along the
mitre of its two segments, so the width holds round a bend and the corners
close — which square tiles could never do. The texture tiles every 5 m along
the path length. `DoubleSide`, because whether a flat horizontal strip's
winding sends its normals up or down depends on which way the path bends.

[COMPLETE] **K54 · Allies ride, visibly.** A defender with a stabled horse assigned now
has that horse drawn under them and sits `SADDLE_Y` above it, and the horse's
walk cycle runs off the rider's own pace — measured from displacement rather
than read off any one behaviour branch, because patrol, charge, scout and
retreat each move a defender by their own rules and all of them should make
the horse walk. The meadow instance of an assigned horse stops rendering
(`riddenByAlly`), so the same animal is never in two places.

[COMPLETE] **K60 · The sky sat 80 m too high.** The skybox was pinned at a fixed
`y = size/2 - 40`, which put the bake's painted horizon about 80 m above the
player's eye: the mountains reared over the whole sky instead of standing off
at the world's edge. Measuring the four side textures puts their land/sky
boundary at v 0.221–0.246 (`HORIZON_V = 0.235`), so the box now tracks the
camera's HEIGHT as well as its x/z, offset to land that line on the eye.

> **Harness note.** Chasing K60 wasted a long stretch on a bug that did not
> exist: under headless SwiftShader the sky faces collapse to a near-1×1 mip
> at oblique angles and render as one flat green wall. Every probe of the
> box's position, UVs, texture transform, fog and far plane came back correct
> because it WAS correct. The same frame through `--use-angle=d3d11` on the
> real GPU shows the range sitting neatly on the horizon. Look-and-feel shots
> use d3d11 from here on; behaviour tests keep SwiftShader.

[COMPLETE] **K61 · The target plate hangs over their head.** It was a 210px panel parked
mid-screen, and only while a bow was drawn. `AimTarget` now carries the
figure's x/z and height, `PlayerController` projects that head to CSS pixels
every frame (not on the 10 Hz aim throttle, so it tracks smoothly while you
turn), and the plate is a compact chip pinned there by transform — no layout
touched as it moves. It shows for whatever is in your hands, bow or axe or
nothing, because "who is that" is not a question about your weapon.

[COMPLETE] **The Next.js dev badge is gone** (`devIndicators: false`) — it sat over the
HUD's bottom-left resource bar.

---

## Block J — shipped, 2026-07-26 [COMPLETE]

[COMPLETE] **J47 · A real ghost.** A site used to be a translucent gold BOX with a solid
grey BOX rising inside it — the same two cuboids whatever you were putting up,
so a watchtower and a flower bed staked out identically. A site now shows the
piece ITSELF: a wireframe of the real model, full silhouette and facing, drawn
faint so it reads as a plan. (`ConstructionSite.tsx`)

[COMPLETE] **J48 · It rises out of the ground.** Under the plan sits the real solid model,
clipped at a world-space plane that rises with the work — so at 40% built you
are looking at the bottom 40% of the finished piece, exactly as it will stand,
not a grey block inflating. Materials are cloned per site: `useNormalizedProp`
shares them between every instance of a model, and a clip plane on a shared
material would have sliced every finished building of that type too.

[COMPLETE] **J49 · Building takes real work.** The swing count topped out at 8, so a keep
went up in about seven seconds. That ceiling existed because the only feedback
was a box inflating and nobody wants to watch that for long; now the stone
rises course by course, so the work can take the time it should. A barrel is
still a handful of swings, a keep is a job (`CONSTRUCT_MAX_SWINGS = 26`).

[COMPLETE] **J50 · Fire, and it is the game's own.** Following the lab's `flame` roles
into the models shows what those parts actually are: not solid pieces but flat
billboards, zero thickness, whose material is `tex010` → `spr010_1024x64.png`
— a strip of **32 hand-drawn flame frames on black**. The models hold ONE
frame (their UVs span 0.02922, an inset thirty-second) because a static export
cannot animate. `LabFlame` plays the whole strip at 15fps on a billboard that
turns to face you, additively blended so the black composites away. Torches,
campfires and the forge hearth all draw on it; the two-cone flame is gone.

[COMPLETE] **J45 · Bricks ARE the resources.** Gathering yields a specific catalogue
piece, and the game says so: "3× Stone Brick 2×2", not "3 stone". The satchel
opens with a **Parts Bin** showing each material as its own rendered piece,
and a building's cost is a **bill of pieces** — each line the actual brick,
with its thumbnail. The mapping is laid over the existing item ids rather than
replacing them, which is what lets an old save convert instead of losing its
inventory: the save still holds `stone: 12`, and twelve grey 2×2 bricks is
what that always meant — the game simply never showed it.

[COMPLETE] **J46 · Resource grounds, held by deed.** Every node now seeds inside a NAMED
ground (`game/data/grounds.ts`) instead of wherever a scatter loop dropped it:
the Home Grove, Northwood Stand, the Herb Meadow, the Old Quarry, the Iron
Seam, the Deepwood. Each carries the deed that opens it. You can walk into a
ground above your tier and see what is in it — that is the point — but the
prompt reads "The Old Quarry — needs the Freehold deed" and will not yield.
Boundary rings and named boundary stones make the ladder visible from outside.

[COMPLETE] **J51 · The Grand Keep, composed.** The keep is no longer a mesh you drop.
Placing it lays a 16m FOUNDATION with nine named sockets — four corners, four
wall runs, a bailey. Walk to a corner, press E, and you are offered only what
can stand on a corner (turret or bastion), each with its bill of pieces; a
wall run offers walls and a gatehouse. Every piece is then raised with its own
hammer work through the same J47/J48 path. Sockets rather than grid cells is
the mechanic: a corner is a named place with its own facing, so a piece
dropped into it always lines up with its neighbours.

### Carried forward out of J [TODO]
- [TODO] **No baseplate mesh exists.** The extraction has no large green base plate
  (the lab's only `base_plate` roles are sub-parts of `oc4806`/`oc6098b1/b2`),
  so the foundation is a stone courtyard textured with the game's own trodden
  ground rather than the MC00 plate as described. Same class of gap as K58's
  missing gatehouse — it needs an asset that is not in the files.
- [TODO] **J45 stops at the resource families.** Five materials map to five real
  pieces and the UI is a genuine parts bin, but each BUILDING's cost is still
  authored in those families rather than as a hand-picked bill of distinct
  SKUs ("2× Tower Piece 2×2, 4× Wall Section 1×4"). Doing that means authoring
  46 bills by hand and is a content pass, not a code one.
[COMPLETE] **J51 has damage and move behaviour.** A raised keep piece now has real
structural HP (`maxHpForPart` in `data/keep.ts` — the same cost-derived formula
`maxHpFor` already used for every ordinary building), tracked per socket in a new
`KeepState.hp`. `damageKeepPart` (gameStore.ts) is the keep's own `damageBuilding`:
chip away at a piece and, past 0 HP, the socket clears — half its materials
refunded — back to the bare marker course `KeepAssembly.tsx` already draws for an
empty socket. Every existing siege source that already damages ordinary buildings
now also reaches the keep: cannon splash, a detonated charge, and the pushable
battering ram all check the keep's sockets alongside `st.buildings` (`siege.ts`'s
new `damageKeepNear` helper, and a keep-first branch in `ramCheck`). Dragonfire is
deliberately left out — its whole point is "wood burns, stone holds," and keep
pieces are built almost entirely from stone, so torching them would undercut the
mechanic it's there to teach, not extend it.

**Raiders no longer ignore the castle.** A raid mob (bandit, Gilbert, Cedric,
royal knight — never an ambient night skeleton) that ends up within striking
range of a finished keep piece batters it instead of walking through as if it
were not there, at the same priority tier the existing defender-vs-mob skirmish
lines already use (closer target wins). This is proximity-only, not a chase: the
keep has no collision volumes or nav-grid obstacles of its own yet, so a raider
only ever notices a piece it has already wandered or chased right up against —
teaching the nav grid to route (and raiders to detour) around a real castle wall
is real scope of its own, left for later rather than folded in here.

**The foundation can be picked up and re-laid.** `pickupKeep`/`finishMove`/
`cancelMove` (gameStore.ts) carry every socket's part, build progress and HP
with it, lossless, through the exact same `movingBuilding` ghost-placement flow
an ordinary building already uses — reusing `evalPlacement`'s region/overlap
checks for free rather than inventing a second validation path. The keep has no
rotation of its own (`KeepAssembly.tsx` renders it unrotated regardless of
`PlacedBuilding.rot`), so a relocation always lands unrotated no matter how the
ghost looked mid-placement. `BuildingMenuPanel.tsx` gives the keep's synthetic
foundation entry its own narrower menu — "Move the foundation" only, never a
plain "take it down" that would orphan an assembled castle in one click — and
`KeepAssembly.tsx` gets the click-to-open-menu handler `Buildings.tsx` already
uses for every other building (the keep's own entry is deliberately excluded
from that component's render loop, so it needed its own).

Verified live: partial damage and knockdown-with-refund on a raised wall; pickup
→ evalPlacement → finishMove round-trip preserving every socket exactly;
cancel-move restoring the original foundation unchanged; the real "Move the
foundation" button clicked through the actual DOM with no console errors; and,
in the unpaused live frame loop (not a scripted call), a spawned raid bandit
independently discovering and battering down a finished wall on its own.
[COMPLETE] **Defenders do not use the walls.** `KeepPart.walkway` records how high each
piece's wall walk is; a defender can now actually be posted to it. Stationing already had exactly
this shape for a homestead Watch Tower — `stationId` pointing at a `PlacedBuilding`, `elevated`
gating "hold the battlement, no ground circuit" (`Defenders.tsx`) and ground-enemy targeting
skipping any elevated defender outright (`Enemies.tsx`) — but a Keep wall piece isn't a
`PlacedBuilding` at all; it lives in `st.keep.parts`/`st.keep.built`, keyed by socket id, not in
`st.buildings`. Rather than force it into that shape, `stationId` now also accepts
`"keep:<socketId>"` as a real second station format: `Defenders.tsx` detects the prefix, reads the
socket's world position (`keep.x/z` + the socket's own local offset) and its raised part's
`walkway` value instead of `heightOf('tower')`, and everything downstream — the "hold the
battlement" movement branch, the ground-enemy skip — already worked generically off the resulting
`elevated`/`postY` and needed no changes at all. `VillagersPanel.tsx`'s station picker grows a
🏰 button per finished walled/turreted socket, alongside the existing 🗼 Tower buttons. Verified
live: founded a keep, raised and finished a Crenellated Wall on its north socket, stationed a
defender there — they walk to the wall and hold position exactly on the battlement, screenshot-
confirmed standing at the correct walkway height, not floating or sunk into the stone.

---

# BLOCK L — playtest round, 2026-07-26 [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.


Thirteen items off a play session. Several are my own regressions; one (L71)
is a conclusion I reached wrongly and shipped.

[COMPLETE] ✅ **CLOSED Wave 19 — L62 · Riding is broken, and mounted combat does not
exist.** Fully superseded; re-confirmed live rather than taken on the later entries' word.
"You cannot see the horse until you dismount" — closed below (L62, "You can see the horse you
are riding"). Mounted combat — the harder half of this ask — is real: `PlayerController.tsx`
forces first-person unconditionally while `ridingState.active` (camera set behind the horse's
mane, per that code's own comment); `Viewmodel.tsx` guarantees the viewmodel renders while
mounted (`(cameraMode !== 'fps' && !mounted)` in its early-return guard, so hands are never
empty in the saddle); `CombatController.tsx` has zero riding/mounted references anywhere in
it, meaning the actual fight mechanics were never gated on being mounted in the first place;
and the halberd/spear/sword/crossbow/longbow all render and function from the saddle, with the
halberd branch's own comment explicit about it: "Deliberately NOT gated on riding — the whole
point of the defender reference implementation is that weapon choice and saddle are
independent." Nothing in this ask remains open.

[COMPLETE] **L63 · Wall collision is on the wrong side. [likely rotation]** Standing
under the overhang gives a solid block; walking at the wall from the other
side lets you through until you reach the overhang. That is the collision
volume rotated relative to the mesh — the same class of bug the models had.
**And:** the construction ghost (J47) proves the real geometry is available at
runtime, so collision should be derived from that outline rather than from a
separately-generated box set that can fall out of step with it.

[COMPLETE] **L64 · Not every wall piece counts as a wall.** Building plain wall sections
does not advance the wall-sections quest. Every piece in the wall family has
to classify as one.

[COMPLETE] **L65 · Walls snap to opposite edges depending on facing.** A wall placed on
the left sits against the grid line; rotated for the right it sits on the BACK
of the grid block instead of the front. The piece's origin is not centred in
its footprint, so rotation moves it off the line.

[COMPLETE] **L66 · Allied NPCs work from impossible distances.** A villager will mine,
build or attack a target hundreds of metres away. They must be adjacent before
the action starts.

[COMPLETE] **L67 · Guards patrol through the day.** A defender on patrol keeps patrolling
in daylight. Patrol is a NIGHT order: by day they should sleep.

[COMPLETE] **L68 · The south furniture is in the way.** The merchant should stand at the
two south guard posts, not off to the right where it fouls homestead building,
and the guard posts themselves overlap the land-purchase sections. Resolved
2026-07-29: the two guard posts are the `mc001` ("Wall Corner (Small)") huts
in `StarterVillage.tsx` — the same props carrying Alric's and Beda's houses,
at (-41.5, 36.5) and (-34, 44). `MERCHANT_SPOT` (`game/data/trade.ts`) now
stands between them, on the road's own westward run, clear of `BUILD_REGION`
and every `GROUNDS` section (no overlap — checked against `grounds.ts`'s own
dev-time assertions, which fire on any real overlap and did not).

[COMPLETE] **L69 · Buying land has no handle in the world.** You should be able to walk
to a plot and buy it there, or at least see an indicator saying how a plot is
bought. Right now the deed ladder lives entirely in a menu.

[COMPLETE] **L70 · The resource grounds sit too close.** J46's circles overlap the
homestead. They need spreading out.

[COMPLETE] **L71 · The road pieces — I was wrong. [found]** K59 rejected `l4109610–13` as
"grass baseplates" on the strength of a green-percentage sample. That sample
counted the GRASS SURROUND of each tile: they are road prints on a green
baseplate, exactly as they should be. Confirmed against the grok manifest and
the textures themselves —
`l4109610`/spr162 = **T-junction**, `l4109611`/spr163 = **corner**,
`l4109612`/spr164 = **straight**, `l4109613`/spr165 = **crossroad**;
all four 256x256x1.6mm, i.e. 12.8m square at the family's k=0.05. The road
must be laid from these four pieces with the right piece and rotation at every
tile, not the invented ribbon K59 shipped.

[COMPLETE] **L72 · Buildings need a menu, and walls need an upgrade slot.** Clicking a
placed building currently picks it up to move it. It should open a menu of
actions on that building instead — and one of those actions is mounting an
explosive charge on top of a wall piece.

[COMPLETE] **L73 · The FPS weapons are still misaligned.** H29/K56 improved the grip
derivation but they still do not sit right in the hands. Finished 2026-07-29 — see
L73 (rest) below for the final measurement pass.

## Order [COMPLETE]

L71 and L64 are data. L65 and L63 are the same family (wall geometry vs its
declared footprint) and should go together. L68/L69/L70 are one world-layout
pass. L66 and L67 are both villager AI. L62 and L72 are the two new mechanics;
L73 is a measurement job.

## Block L — part 1 shipped, 2026-07-26 [COMPLETE]

[COMPLETE] **L71 · The road, from the real plates.** K59's rejection of these four pieces
was wrong and is reversed. The grok manifest and the prints themselves settle
it: `l4109610`/spr162 = T-junction, `l4109611`/spr163 = corner,
`l4109612`/spr164 = straight, `l4109613`/spr165 = crossroad — four 256x256x1.6mm
plates, 12.8m square at k=0.05, a road printed on a green baseplate. `Road.tsx`
is now a TILE LAYOUT: name the cells the road runs through and each cell works
out which of the four pieces it is and which way it faces from its neighbours,
which is how the set works. The invented ribbon is gone.

[COMPLETE] **L64 · Every wall is a wall.** "anywall" was hardcoded to the two pieces that
existed when the quest was written, so building a plain `mc006` section
advanced nothing. It asks the catalogue now — all eight `category: 'walls'`
pieces count, and anything added later counts automatically.

[COMPLETE] **L63 · Collision turned the wrong way. [found]** `collisionBoxesFor` rotated
its volumes by (x,z) → (-z,x). A three.js yaw of +90° sends a local (x,z) to
world (z,-x). At 180° the two agree, which is why it hid; at a quarter turn a
wall's solid stone ended up on the far side from where it was drawn — stopped
under the overhang, walked through the stone. Verified by comparing the union
of the volumes against the rendered mesh's own world bounding box at all four
facings: they now agree to within a millimetre, which is the "collision from
the outline" check in a form that can be run every time.

[COMPLETE] **L65 · Rotation no longer moves the wall face.** A crenellated wall is a
0.86m slab at the BACK of a 2.8m footprint. Mesh and footprint were both
centred on the cell, so turning the piece around moved the stone a metre and a
half and a rotated run no longer met its neighbour. `solidOffset` measures the
piece's solid centroid from its own collision volumes and re-centres THAT on
the cell; the render and the volumes take the same shift, so what stops you is
still exactly what is drawn.

[COMPLETE] **L66 · Work happens where the worker is.** The trip timer ran on the clock
alone, so a villager on the far side of the map filled their sack anyway and
every assigned builder raised the walls from wherever they stood. Both now
require the villager to be within 6m of their worksite (or back at the
stores). A trade with no worksite at all still counts, so a respawn window
does not silently stall the economy.

[COMPLETE] **L67 · The watch keeps the night shift.** Standing down by day was written
for `patrol` and `scout` only, so `attack` — with nothing left to attack —
fell through to the day circuit and walked rounds until dusk. Every standing
order keeps the shift now; `follow` is the one exception, because escorting
the player is something the player asked for and can see.

[COMPLETE] **L70 · The grounds are clear of the homestead.** Pushed out, and the layout
is now ASSERTED in dev rather than eyeballed — BUILD_REGION grows with the
land tiers and would have swallowed a ground again silently.

[COMPLETE] **L68 (part) · The merchant is off the build edge.** It stood at (36, 16),
four metres off the east edge of a fully-bought holding, right where the last
deed's squares land. Moved south to the road at (8, 44), outside every tier.

[COMPLETE] **L69 · Deeds are bought on the ground they buy.** Every ground's boundary
stone is an interaction now: walk up and it either says what the next deed
costs and how much gold you are short, or takes the gold. The ladder used to
exist only as a button in the build menu.

## Block L — part 2 shipped, 2026-07-26 [COMPLETE]

[COMPLETE] **L62 · You can see the horse you are riding.** Mounting hid the meadow
instance and nothing drew it again, so the animal was invisible until you got
off it. `MountedHorse.tsx` draws the mount at the rider's own position and
facing, pushed 1.05m forward so the neck and mane run out ahead of the hands
rather than a pair of ears directly under the camera; the legs run off the
player's real displacement, so a walk looks like a walk and a gallop like a
gallop. **Shooting from the saddle** was silently broken too: `fireBolt` and
`fireArrow` spawned at `y + 1.45`, a standing man's shoulder, while you aimed
from a metre higher — a level shot went into the ground. Both now use
`muzzleHeight()`, which knows whether you are mounted.

[COMPLETE] **L72 · Buildings have a menu.** A click used to pick the piece up, unasked —
the only action it had was "move me". It opens an action panel now: move it,
take it down, and on a wall, **mount a charge**. The charge is placed as a
real building standing on top of the wall, which means the proximity-armed
Emplacements pass already knows what to do with it. Verified: the menu offers
Move / Take down / Powder Charge / Powder Barrel / Powder Chest, and a mounted
charge lands at y = 5.28 — the top of the wall it sits on.

[COMPLETE] **L73 (part) · The bow is in the right hand now — the left one.** It was
mounted in the same group as the sword and the crossbow, i.e. the DRAWING
hand, so it sat at the right edge of the view half off-screen with the string
hand nowhere near it. It hangs off the off-hand side now, pulled inboard the
way a drawn bow actually is: limbs vertical, belly to the target, gripped at
the riser.

[COMPLETE] **L73 (rest) · the arrow on the string, and the crossbow's roll.**
Re-measured live rather than nudged blind: screenshotting the drawn bow at
scale showed the arrow's quarter-turn onto the CAMERA's own forward axis
(what K56 shipped, and which reads correctly as math) foreshortens it to a
near-invisible sliver on screen — pointing an object straight down the same
line the camera is already looking along makes it disappear regardless of
whether the rotation is "right." Turned onto the mount's local X axis
instead (`Viewmodel.tsx`'s `Longbow`), so the shaft runs visibly across the
view from the string to the reticle, and slides back toward the archer as
the draw deepens rather than away from them. The crossbow's own `MOUNT.crossbow`
had the opposite problem: the pitch (pointed downrange) was already right,
but with zero roll the bow-arms sat canted 25-30° off level — only obvious
once screenshotted at scale, invisible at the viewmodel's actual small size.
A +0.5 roll squares them up without touching the pitch. The sword's own pose
was checked the same way and found to already read correctly — no change
needed there.
[COMPLETE] **L62 (rest) · a couched lance from the saddle.** `joustRichard()`
(`gameStore.ts`) was always a pure numeric outcome — hit chance, gold, XP —
with nothing rendered for it, and `weaponParts.ts`'s own `spear` mold (grip
normalized, ready to use) had zero consumers anywhere in the codebase. The
"Couch your lance!" prompt implied a posture that never actually existed.
Viewmodel.tsx now polls `ridingState.active && combatState.galloping` (the
same condition that prompt already gates on) into real React state — reading
those plain mutable objects directly in a `useMemo` wouldn't have re-rendered
when they changed — and couches the real `spear` mold, levelled toward a
target ahead of the horse, ahead of whatever else would otherwise be held.
Verified live: forcing a mounted gallop renders a real couched lance angled
toward the reticle, where nothing rendered before.

**[COMPLETE] Corrected 2026-08-05 (Wave 7).** That gate was too wide, and it
was the ONE place the player's viewmodel let mount state override weapon
selection. `ridingState.active && combatState.galloping` is true for any
mounted player holding Shift anywhere in the world, so a rider who had
equipped a sword, crossbow or longbow saw a couched tourney lance while the
click underneath still ran `playerAttack()`/`fireBolt()`/`fireArrow()` on
their real weapon — the pose lied about what the button did. The mechanics
were never broken (nothing in `combat.ts` or `CombatController.tsx` gates on
riding at all, and `muzzleHeight()` already raises a mounted shot's spawn
point) — only the model was wrong. The range/reveal test now lives in
`game/joust.ts` and is shared by BOTH the E prompt and the pose, so the lance
appears only while actually charging Richard (within 16m of him, a run-up's
distance ahead of E's own `INTERACT_RANGE + 2.5`) and a mounted player keeps
their real weapon everywhere else. This is the same *decoupling* principle
`Defenders.tsx` already demonstrates below — weapon choice reads loadout,
never mount state — adapted to the fact that a mounted player is rendered by
the first-person viewmodel and nothing else (`PlayerController.tsx` forces
first person while riding; `PlayerAvatar`/`MountedHorse`'s seated body is
deliberately `visible={false}`), so there is no third-person mounted path to
bring to parity.

**The halberd's own "no mounted pose" turned out not to be a distinct bug**,
on inspection of how a mounted defender actually renders (`Defenders.tsx`):
every loadout — sword_shield, bow, halberd alike — gets the exact same
treatment, the whole standing rig plus whichever weapon is portalled onto its
arm joint, lifted uniformly by `SADDLE_Y`. The weapon's pose relative to the
rider's own hand is unchanged and already correct; nothing singles halberd
out for worse treatment than sword or bow get. What's actually missing is
bigger than any one weapon: there is no real seated-rider animation at all
for ANY loadout, so a mounted defender's legs still play their standing/walk
clip while floating above the saddle rather than sitting in it. That's a real
seated-rider animation gap of its own — not a halberd-specific fix, and not
part of what the "Comprehensive AI/animation rig" item above ended up
covering (idle variety, reactive behaviors, giving the court real Agents) —
logged here as still open.

## L71 follow-up — the bends turned the wrong way, 2026-07-26 [COMPLETE]

Reported from play: the road's corner curved left where it should curve right.

**[found]** The plate's UVs put `u` along +x and `v` along +z, so image-left
would be world west and image-top world north — which is how I read the prints
when I declared the masks. But `PropModel` stands every extraction model up
with `rotation.x = π`, and that turns the printed face away from the viewer:
what you look down on from above is its BACK, so the print arrives **mirrored
east-for-west**. The corner joins SOUTH and EAST, not south and west, and the
T branches EAST.

The straight and the crossroad are mirror-symmetric, which is exactly why only
the turns showed it — and why the first aerial looked right at a glance.

Worth remembering beyond the road: any flat, printed, top-down plate that goes
through `PropModel` is seen from behind, so its print is mirrored. Nothing with
a distinguishable left and right can have its orientation read off the texture
alone.

## Grounds became grid sections, 2026-07-26 [COMPLETE]

Reported from play: the resource circles would foul a southward expansion, and
the tree sections had trees growing through the road.

**Rectangles, not circles.** A circle cannot be checked against a square build
region without leaving slivers, and its edge cuts across build tiles so a
boulder could seed on half a square. Every ground is now an axis-aligned
section (`halfX`/`halfZ`) on the same grid the homestead builds on, and nodes
roll uniformly inside it held one node-radius clear of its own edge.

**Two assertions, because three layouts move independently.** Dev-only warnings
now fire if a ground overlaps the FULLY-BOUGHT homestead (BUILD_REGION grows
with the deed ladder, so this would otherwise regress silently), if two grounds
overlap each other, or — the one play found first — if a ground lies across a
road tile. The second of those immediately caught an overlap I had just
introduced between the Iron Seam and the Deepwood, which is the argument for
having written it.

**The layout now.** Quarry and Iron Seam east (x≈62); Northwood west (x≈−72);
Herb Meadow south-west; Deepwood due south (0, −64); the Home Grove east at
(30, 62), by the pond, so the first wood you meet is a walk past the water.
Nothing sits south of the homestead in the road's path.

### Still open [TODO]

> ⚠️ **SUPERSEDED by the Reconciled status section near the top of this file (2026-09-23).** Most items below already shipped in a later wave without this section being retagged; treat this heading's own [TODO] as historical, not current. Check the reconciled Open Backlog table before treating anything here as live work.

- [COMPLETE] ✅ **The road itself vs. southward expansion — already closed elsewhere in this file
  (the "Blocked on a decision or a pointer" section, ~line 4666) but never struck at THIS, its
  original location.** Re-confirmed live myself for Wave 19, not taken on trust from that other
  entry's own text: `SPAWN` `[0,0,26]`, `SIGNPOST` `(-16,36)`, `KEEP_INTERIOR` `(85,85)`, every
  `grounds.generated.json` entry (`z` 35→100), and every `road.ts` `LEGS` cell (`SZ`=3, and every
  waypoint is `SZ-1` or higher) all sit in the positive/south half — nothing left to move. The
  2026-08-03 layout pass (grounds became grid sections, this same section above) already put
  everything south; this stale "still open" note is the one thing that never got struck.

## Roadside trees, 2026-07-26 [COMPLETE]

Timber now lines the road's VERGES — the green margin of each plate, never the
printed carriageway. A road through open grass reads as a scar; lined with
trees it reads as a road. They are ordinary tree nodes (fellable like any
other) but belong to no ground, so they need no deed. Junction cells are
skipped entirely, since every side of a T or a crossroad is carriageway, and
each candidate is rejected if it lands on another plate's road, inside the
build region, in a ground, or in the pond.

The road's route moved out of `Road.tsx` into `game/data/road.ts` to make this
possible — the seeder and the ground layout both need to know where the road
runs, and neither can import a component that pulls in three.js.

---

# Proposed · From a homestead to an empire [TODO]

The idea: stop treating "your land" as one expanding fence, and let the player
BUY SETTLEMENTS — villages, holdings, outposts — that join a growing realm.
Folk either come to live in your homestead, or come with a village you take on.
Side-quests then hang off the places rather than off a quest list.

**This is far less new machinery than it sounds, because the separation
already exists.** Three systems are already built and already generalise:

- [COMPLETE] **`PlacedBuilding.world`** — the Phase 23 instance-separation doctrine. A
  building already belongs to a PLACE (`null` = home), and `Buildings.tsx`
  already filters by it. A second settlement is already a legal home for
  buildings; nothing renders in the wrong world.
- [COMPLETE] **`WORLD_DESTINATIONS`** — nine template worlds already exist as travelable
  places with real baked terrain: the King's Approach, the Tourney Grounds,
  the River Landing, the Siege Camp, the Rival Castle, the Sister Keep, the
  Frozen Pass, the Old Ruins, the Far Meadow. They are already reached from
  the travel signpost, and the player can already build on claimed plots there.
- [COMPLETE] **The deed ladder** (F20, and J46's grounds) — buying rights to ground is
  already the shape of the economy, and L69 already put the transaction out in
  the world at the ground it buys.

So "buy a village" is the deed ladder pointed at a destination instead of at a
fence, and the village's residents are villagers whose `world` is that place.

**What is genuinely new, and what to decide first:**

1. **Do settlements run themselves while you are away?** The villager economy
   is a trip timer gated on proximity (L66). Either each settlement ticks its
   own labour and you collect (an empire that produces), or it goes idle when
   you leave (an empire you must visit). The first is the better game and the
   larger job — it needs the tick to run per-world, not per-player-location.
2. **What does a village COST, and what does it yield?** Gold alone makes it a
   menu purchase. Better: a village is EARNED — a quest chain per place, with
   gold as the last step — so taking the River Landing is a story and not a
   transaction.
3. **Where do the side-quests live?** Per-place quest pools keyed by
   settlement, which is how E's allegiance quests are already structured
   (`allegianceQuests.ts` pools by house). Same pattern, keyed differently.
4. **Does the homestead stay special?** It should — it is the one place you
   BUILD freely. A village you take on comes with its own buildings already
   standing, and what you do there is repair, garrison and extend. That also
   keeps the two loops distinct rather than nine identical build grids.

[COMPLETE] ✅ **Suggested first slice — SHIPPED 2026-08-04 as Wave 4 of the full-ROADMAP wave
plan**, with one real correction to this section's own suggestion: **not the Far Meadow** —
that's template-09, already consumed as the literal homestead by Phase 20, eight days before this
section was even written (a design-history inconsistency this section itself carried, caught before
building anything on it). Of the 8 real away-destinations, **The Old Ruins (template-08)** is the
one with no resident named NPC or guild-hall figure already living there — the least entangled
pick that actually exists. Every seam this slice was meant to prove is now real, not just per-world
villagers/labour (Wave 3) — the ownership/quest/residents/collection layer on top:
- **A quest chain to earn it**: a new NPC, Fenwick ("Ruins Scavenger" — reuses the same generic
  villager donor + `greetSound`/`portrait` Alric/Beda already use, zero new asset dependency),
  offers two real errands (`settlementQuests.ts`) through the ordinary talk-to-an-NPC flow: 20 stone
  to shore up the foundations, then 6 kills to clear the ruins.
- **A deed to close it**: once both errands are done, Fenwick's own dialogue offers "File the Deed"
  (60 gold) — a new `foundSettlement(destId, x, z, groundY)` action that calls the EXISTING
  `claimWorld()` unchanged (a harmless no-op if the player already claimed the plot via the ordinary
  `ClaimBanner`), then records the settlement.
- **2-3 residents**: Bram (farmer), Ida (merchant), Tolan (builder) — `lumberjack`/`miner` deliberately
  excluded, a real code-forced cut: template-08 has zero `ResourceNodeState` entries and
  `villagerAtWork`'s tree/rock branch has no per-world node awareness yet, so either job would just
  stall forever with nothing to report.
- **Its own labour**: proven live — pinned Bram's position at the settlement's own claimed-plot
  anchor and called `tickVillagers` directly; wheat delivered correctly (the farmer's real `perTrip`
  yield), Wave 3's per-world re-keying working exactly as designed against a REAL non-null world for
  the first time.
- **A travel-board "YOURS" marker**: `TravelPanel.tsx` now shows 🏰 YOURS for any destination with a
  founded settlement.
- **Wall-clock collection, mirroring `collectTaxes` exactly**: `collectSettlementYield(destId)` —
  same cooldown-then-flat-amount shape (`TAX_COOLDOWN_MS`, `6 + residentCount × 5` gold), triggered
  from Fenwick's own dialogue once founded, verified to correctly withhold on cooldown and pay out
  the right amount once it clears (21 gold with all 3 residents — the arithmetic checked exactly).

**A real, separate gap found along the way, not fixed here**: `DialoguePanel.tsx`'s own offer/accept
logic reads `npc.sideQuests` directly, never `sideQuestsOf(npc.id)` — confirmed by reading it, not
assumed. This means `allegianceQuests.ts`'s `EXTRA_SIDE_QUESTS` pool (Alric's/Beda's own village
errands, keyed by their npc ids) can never actually be OFFERED through the ordinary "talk to them"
flow — those errands are dead code today, unreachable via the UI despite being real, complete data.
Fenwick's own quests deliberately avoid this trap by being spread directly into his `sideQuests`
field rather than merged in the same way, which is why they work. Left open: either fix
`DialoguePanel.tsx` to consult `sideQuestsOf()`, or fold `EXTRA_SIDE_QUESTS` content directly into
each NPC's own `sideQuests` array the way this wave did.

Verified live end-to-end through the real UI (not just direct store calls): the full errand chain
accepted/turned-in via dialogue buttons, "File the Deed" clicked through `getByRole` (a locator-text
ambiguity in one earlier test attempt was the test's own bug, not the feature's — a direct
`foundSettlement()` call and the real button both produced identical, correct state), residents
spawned with exactly the right jobs, gold deducted exactly 60, `claimedWorlds` populated with a real
sampled ground height (26.56 world units — sane, not a placeholder), TravelPanel's YOURS marker
confirmed, and the yield collection's cooldown gate and payout amount both confirmed exact.
`npm run verify` clean, zero console/page errors throughout.

## Pointer lock stopped letting go, 2026-07-26 [COMPLETE]

The immersion break was never the panel — it was the silence afterwards. The
lock was only ever requested from a CLICK, so every panel you closed and every
pause you returned from dropped you into a dead camera until you remembered to
click the world again.

It is intent-based now: whenever the game is in PLAY (not paused, no panel, not
in build view) the controller WANTS the lock and keeps asking until it has it.
Two things make that non-trivial and both are handled rather than hoped about —
a browser refuses `requestPointerLock` for about a second after the user
pressed Esc to leave it and fails SILENTLY through `pointerlockerror` (which is
exactly the case of closing a panel with Esc), and the request needs the
document focused. A failed attempt schedules another; regaining window focus
tries again; losing the lock while the game still wants it tries again.

Verified: zero requests while a panel is open, and the lock is asked for again
on its own the moment it closes.

---

# Empire design — answered, 2026-07-26 [COMPLETE]

The four questions from the proposal, settled:

1. **Settlements run themselves while you are away.** "Just like old kingdoms,
   they didn't stop simply because the kingdom was away." So the villager tick
   has to become per-world rather than per-player-location — the single
   biggest piece of work in the whole idea, and the thing to design first,
   because L66 just tied labour to proximity and that rule now needs a
   per-settlement meaning rather than a per-player one.
2. **Gold AND a quest chain.** You buy the village, but you have to win its
   people over first — the purchase closes a courtship, it does not replace it.
3. **Quests come from allied NPCs, indoors.** Buildings you can enter, with
   NPCs inside who give quests, trade and dance. No quest board, no menu —
   "try to keep continuous immersion". This makes INTERIORS a first-class
   requirement rather than a nicety; the Keep already has one
   (`KeepInteriorRoom.tsx`), so the pattern exists and needs generalising.
4. **The homestead stays mixed.** Alric and Beda already sit at guard posts
   waiting to be won over, so the homestead already blends "folk who join you"
   with "a place you build" — keep both rather than splitting them.

[COMPLETE] **New, and small enough to do on its own:** a villager who joins the homestead
should ARRIVE — walking the road in from the south, up and right, into the
build area — rather than appearing. The road exists and its route is data now
(`game/data/road.ts`), so the path is available to walk.

[TODO] **Blocked meanwhile:** the remaining bricks and the template maps are not fully
mapped in Grok yet, so anything that depends on knowing what a template world
actually contains waits on that.

## Newcomers walk in, 2026-07-26 [COMPLETE]

Someone who joins the homestead now ARRIVES: they step onto the map at the far
end of the road (`roadEntry()`) and walk it in under their own steam, navSteer
taking them round anything in the way, joining the ordinary routine only once
they have actually reached the holding. Nothing else runs for them until then,
because someone still on the road has no worksite and no bed to seek.

Alric and Beda are the exception — they already stand somewhere in the world,
so they walk from where they are rather than being teleported to the road's
end like a stranger off it.

Verified: a newcomer seeded at the road's end covers 11m toward the holding in
nine seconds and keeps coming.

---

# Waiting on unblocking [TODO]

Kept here so it is obvious what is parked and WHY, rather than looking like it
was forgotten.

## Blocked on the Grok mapping [COMPLETE]
- [COMPLETE] ✅ **CLOSED Wave 19 — re-verified live.** `TemplatePopulation.tsx` (the
  "real content spawning" follow-on this entry's own updates below name as the thing still
  actually open) is shipped, live, and still the maintained system rendering every template's
  Grok-classified content (confirmed: rendered via `GameWorld.tsx`/`DestinationScope.tsx`,
  read by `npcs.ts` and `templateWalkableFootprint.ts`, git history shows it touched as
  recently as PR #172). **Anything that depends on what a template world CONTAINS.** The remaining
  bricks and the template maps are not fully mapped yet. Every empire feature
  that needs to know what is standing in a place — which buildings a village
  comes with, where its NPCs live, what its interiors are — waits on this.
  **Update 2026-08-03: the data-side blocker is gone.** The Grok lab finished
  per-mesh `kk.map_layout.v1` classification for all 9 templates + 6 bonus
  "challenge" maps on 2026-08-01 (`reports/maps/*_layout.json`), and the PAK
  capability/orientation catalog grew from 86 hand-verified assets to the
  full 264 (`reports/PAK_ASSET_CAPABILITIES.json`). `scripts/prepare-assets.mjs`
  now merges both layers (264 base + 86 human-verified overrides, overrides
  always winning) — `public/assets/rigs/capabilities.json` is 264 entries
  and `part_roles.json` is 221 (up from 86/179), plus the 9 template + 6
  challenge world bakes are now copied by that same script instead of an
  undocumented manual step. **What's still actually open** is turning the
  per-map classification into rendered content — a data-driven successor to
  `CourtDressing.tsx` that spawns each map's real `asset_ref` groups (only
  ~5-15 real catalog hits per map; the rest of a layout's groups describe
  meshes already baked into the diorama, not new importable content), plus
  a verified coordinate transform from the lab's map-local space into the
  game's own bake-normalized space (in progress next).

  [TODO] **Orientation ground-truth wiring — still genuinely open, carved out
  separately so the parent entry's Wave 19 close-out above does not sweep it
  in.** Investigated 2026-08-03, deliberately NOT wired in — a real, deeper
  risk than "convert degrees to radians" found along the way, and re-confirmed
  still unresolved at Wave 19 (no code has touched this since). Not blocked on
  data — every catalog entry is real and verified — this is a genuine unsolved
  coordinate-math problem, described in full below.
  `PAK_ORIENTATION_CATALOG.json`'s per-model
  `status` field is actually `lab_fixed` (207) or `verified` (57) for
  every one of the 264 real catalog entries (0 genuinely `todo` — the
  file's own top-level `stats.by_status` rollup claiming 92 todo is stale
  and should not be trusted, confirmed by reading the real per-model
  values directly) — so the *data itself* isn't the blocker. The blocker:
  the lab's correction is entirely **rotation-based** (Blender's own OBJ
  importer + a per-model corrective `final_root_euler_deg`), computed
  independent of this game's own toolchain. But this repo's real OBJ→GLB
  conversion (`resources/model_pipeline/obj2gltfHelper.mjs`, confirmed by
  reading it directly) already applies its OWN correction for the same
  "source coordinates are Y-down" problem — a **Y-axis mirror** (negative
  scale), not a rotation, done via `gltf-transform` post-processing
  DURING conversion, before `PropModel.tsx`'s runtime `rotation.x =
  Math.PI` ever runs. Composing a mirror-based correction with a
  rotation-based one is a real coordinate-geometry problem (a mirror
  doesn't commute with rotation the way two rotations would), not a
  constant-offset lookup — reconciling the two needs either a careful
  matrix-level derivation verified against real rendered output, or
  genuine per-asset empirical calibration (render candidate vs. the
  lab's own `qa_still` reference, iterate), not a one-shot trust-the-
  degrees-field wiring pass. Deferred rather than guessed at — no code
  changed for this part.

  **Wave 3 (template population) coordinate transform FIXED, and real
  content spawning SHIPPED — 2026-08-03, no longer inert.**
  `scripts/prepare-assets.mjs` distills each template's
  real `asset_ref` groups (only ~5-15 per map genuinely resolve to a catalog
  id; the rest of a layout's groups describe meshes already baked into the
  diorama) into `src/game/data/mapPopulation.generated.json`.
  `TemplateWorld.tsx`'s `normalizeTemplateBake` exposes its real recentring
  offset (`getBakeOffset()`) so placed content shares the exact same origin
  as the visible mesh. A background research pass (5-agent workflow) traced
  the lab's Blender pipeline (`rig_lib.py::apply_catalog_euler`) and proved
  it applies a real `Rx(-90°)` about the local origin; inverting that
  rotation matrix properly showed only the **up axis** needs a sign flip —
  X and the depth axis need none (matches the structural fact that rotation
  about X can't change X). Proof this was the real bug, not a guess: under
  the old unnegated formula, King Leo's `template-01` marker computed to a
  world Y sitting *above* the live bake's own measured bounding-box max — a
  geometric impossibility. Negating just that term (`prepare-assets.mjs`'s
  map-population section) puts every template-01 actor at a physically
  valid height. Live-verified beyond the numbers too: `DEBUG_MARKERS=true`
  + a photo-mode fly-out (no collision/radius clamp) to King Leo's marker
  showed it sitting right on a rocky hillside surface with real terrain
  behind it, not floating in a void.
  **New finding from that same fly-out, orthogonal to the transform bug:**
  the marker lands ~1740 world units from `dest.origin` — deep in the
  diorama's distant hillside, far outside `dest.radius` (224) and nowhere
  near `NPC_KING`'s hand-placed spawn-adjacent position. Despite sharing the
  exact asset id `minifigkingleo00`, this is almost certainly a **distant
  background procession figure** baked into the scenery, not the same
  entity as the interactive quest NPC. The original plan's assumption that
  `kind: 'actor'` + a name match is safe to use for *correcting* an
  existing `NpcDef`'s position is now known to be wrong, at least for this
  case — doing that blindly would strand the quest-bearing King unreachably
  far from spawn.

  **Real content spawning, same day.** `TemplatePopulation.tsx` no longer
  stubs out — resolved the decorative-vs-interactive question above by NOT
  trying to resolve it per group at all: spawn everything the lab
  classified regardless of distance from origin (the destination's own
  blurb already describes a "marching procession," meant to be seen as
  backdrop even where it's unreachable on foot), and simply never let any
  of it stand in for or auto-correct an existing hand-placed `NpcDef` — no
  current map's data actually collides the two, so no proximity-dedup guard
  was needed yet. `kind: 'set'` rows resolve to a real GLB via a
  `resolvedUrl` `prepare-assets.mjs` now computes by indexing whatever this
  repo's own extraction already copied into `public/assets/` (there's no
  single "id -> folder" rule to hand-derive one). `kind: 'actor'`/`'cast'`
  rows are minifig characters — these ship as raw OBJ+MTL like every other
  minifig in the game, not GLB, so they render through `RiggedFigure`
  instead (the same component the player/NPCs/villagers use), with a fuzzy
  family-prefix match against this game's own hand-tuned `NpcDef` colors
  (npcs.ts) since the lab data has no color info, falling back to a plain
  villager scheme for factions with no NpcDef yet (Cedric, Weezil, Gilbert).
  Also fixed along the way: `worlds.ts`'s templates 01-08 got a 2x
  `worldScale` bump the same day (see below) — the stored population
  positions assumed the base scale, so spawning now applies a live
  `scaleCompensation` ratio per destination rather than drifting off the
  now-bigger bakes. Verified live: renderer geometry/draw-call counts
  measurably increased on arrival at both template-01 (+21 geometries) and
  template-06 (+36, the richer 13-row map), zero console/page errors, and
  a resolved GLB fetch confirmed a real, correctly-sized file (not a 404 or
  an empty stub — an earlier version of the URL-builder was missing the
  `/assets` prefix entirely, caught by this same live check).
  **Known rough edge, not yet tuned:** every `kind: 'set'` prop renders at
  one flat default height (0.8m) — no per-asset target height exists yet,
  so large props may read undersized until someone hand-tunes real values
  the way `CourtDressing.tsx`'s own props were tuned by eye.

  [COMPLETE] ✅ **CRITICAL, found 2026-08-04 via a live player report ("I don't see
  any castle or rocks or terrain or anything else"), and the diagnosis below
  turned out to be WRONG — corrected and fixed same day, see the
  "away-destination bakes were Y-inverted" entry further down.** Original
  finding, kept verbatim for the record: traveled to template-01, looked in
  all 4 cardinal directions from spawn, walked forward for 8 real seconds —
  nothing resembling a castle in any direction, one tiny few-pixel structure
  barely visible at the horizon. Concluded at the time: "not a rendering
  bug... a calibration problem" with `dest.origin` sitting ~1740-3480 units
  from the real content. **That conclusion does not survive the actual root
  cause found later the same day:** the bake .glb itself was Y-inverted at
  the source (confirmed via direct `node -e` bbox dumps — e.g. template-01's
  raw vertex Y ranged `[-1913, +206]`, the geometry overwhelmingly hanging
  BELOW y=0 instead of a hill rising above it), which is exactly consistent
  with "no castle visible from a normal spawn height" — an inverted castle
  is mostly buried underground, not merely far away. Once
  `normalizeTemplateBake`'s new `flipY` corrected this, a live re-check at
  template-01/template-06/template-07 (4-direction screenshots each) showed
  castle walls/towers clearly visible within normal view distance of spawn,
  properly upright. `dest.origin` was never touched. Left as an open
  question: whether any *residual* per-template origin mis-centering still
  exists on top of the flip fix — not re-audited destination-by-destination,
  since the flip alone resolved every case checked live.

  [COMPLETE] ✅ **Investigated 2026-08-04 (Wave 2 of the ROADMAP clear-out): an NPC
  (Beda) shows a visibly wrong model — described as a red claw-like shape
  near the head — when first seen, which resolves to her correct model on
  walking closer.** Original report, kept for the record: two screenshots
  (2m and 1m from her) showed the mismatch; `RiggedFigure`'s LOD cutoff was
  ruled out (a hard visibility toggle, can't produce a wrong shape); K57's
  donor-mismatch fix was re-checked and confirmed still intact
  (`npcs.ts`: `headDonor`/`bodyDonor` both `minifiggenericgood00`); a live
  teleport-and-screenshot repro attempt did not catch the glitch.
  **This pass went the second route the earlier investigation left open — a
  close read of `assembleRiggedMinifig`/`minifigRig.ts` — and found a real,
  independent gap, though not provably the exact "red claw" shape
  described:** `RiggedFigure.tsx` renders `rig.group` the instant its
  assembly resolves, but `MinifigAnimator`'s `clip` stays `null` (and
  `update()` a no-op) until `animator.play()`'s own `await loadClip(name)`
  resolves — a SEPARATE async hop after the rig itself is already visible.
  In that narrow window every joint sits at its construction-time neutral
  rotation (identity), not the character's real pose. Fixed regardless,
  since it's a genuine robustness gap either way: `RiggedFigure.tsx` now
  keeps the group hidden until `animator.current` (the resolved clip name)
  is actually non-empty, computed into one unified `.visible` assignment
  alongside the existing LOD-cull logic (an earlier draft of this fix wrote
  `.visible` from three different places and the LOD branch's own "tier
  switched away from Performance, un-cull immediately" case silently undid
  the pose-readiness hide on every tier except Performance — caught before
  shipping). Fails OPEN on a `play()` rejection (a failed clip fetch shows
  the rig unposed rather than hiding it forever, since that would be a worse
  regression than the glitch being fixed). Verified live: zero console/page
  errors across normal play and rapid job-switch stress testing (see the
  next entry below); `npm run verify` clean. **Honest limit:** still never
  reproduced the specific "red claw" visual live, so this is shipped as a
  well-reasoned, real robustness fix for a confirmed timing gap, not a
  confirmed silver bullet for that exact report — worth closing only if it
  stops recurring.

  [COMPLETE] ✅ **Away-destination bakes were Y-inverted at the source — SHIPPED
  2026-08-04, root cause of "the worlds are flipped upside down" (live report,
  "green textures are underneath where we spawn").** Direct proof, not
  guessed: dumped every template/challenge `.glb`'s raw POSITION accessor
  bbox via a `node -e` script — all 8 templates checked (01/02/03/04/05/06/
  07/08) plus 2 challenge maps showed the same signature, geometry hanging
  overwhelmingly BELOW y=0 (template-01: `y ∈ [-1913, +206]`; template-05:
  `[-2475, +99]`). A right-side-up "castle crowns a hill" diorama should do
  the opposite — rise mostly above a y≈0 ground reference, not hang below
  it. This is also, in hindsight, the real explanation for the "no castle
  visible" finding directly above: an inverted castle is mostly buried, not
  merely far away. Fix: `normalizeTemplateBake` (`TemplateWorld.tsx`) gained
  a `flipY` parameter — mirrors the bake across its own Y axis before
  recentring (X/Z untouched); applied only to the away-destination render
  path (`TemplateWorldRoot`, covers templates 01-08 AND all 6 challenge maps
  through the same shared code path — template-09/HomeMeadow's own separate
  `Terrain.tsx` call site is untouched, already verified working, and its
  bbox is near-flat anyway where a flip would be meaningless). Safe for
  `TemplatePopulation.tsx`'s spawned actors/props: confirmed by reading that
  file that `Grounded` places every instance's height from a LIVE raycast
  against whatever bake actually rendered (`sampleTemplateGroundY`), never
  from the stored population Y — only X/Z matter there, and a pure Y-mirror
  never touches those. Verified live: template-01/template-06/template-07,
  4-direction screenshots each (`--use-angle=d3d11`, not SwiftShader, for a
  real look-and-feel check) — castle walls, towers and a proper mountain
  skybox (see below) all read right-side-up, sitting above the grass line;
  a 13x13 ground-height probe grid around spawn showed a smooth, sensible
  slope (81.8 to 96.0 across 60 units) with zero discontinuities; zero
  console/page errors throughout.

  **Same session, same root finding: destination scale walked back from 2x
  to 1.25x.** The 2026-08-03 2x bump (worlds.ts) overshot — live user
  feedback was that 2x read as too large, not "far too small" anymore.
  `DEST_WORLD_SCALE` is now `0.32 * 1.25`; every template 01-08's `radius`
  scaled down by the matching 1.25/2 = 0.625 ratio to preserve the same
  walkable fraction of each diorama the original 2x bump established.

  **Same session: the skybox was one hardcoded "grass" bake behind every
  destination, including an icy mountain pass — now per-destination.**
  Confirmed directly: `Terrain.tsx`'s `GameSky` loaded a single fixed
  `/assets/sky/grass/*.png` set unconditionally, and `prepare-assets.mjs`
  only ever copied that one variant — even though the extraction ships a
  second `skyboxes/mountains/` set (the "snowy" skybox the user pointed at)
  that had never been copied or referenced anywhere. `GameSky` now takes a
  `variant` prop (`SKY_VARIANTS` table, each with its own measured horizon
  fraction — `mountains`' own measured via a `sharp` row-scan of its 4 raw
  PNGs, since its peaks are far taller/more uneven across faces than
  grass's own); `WorldDestination` gained an optional `sky` field
  (`worlds.ts`); `GameWorld.tsx` reads the current destination's `sky` and
  passes it down, defaulting to `'grass'` everywhere unset. template-07
  ("The Frozen Pass") is tagged `sky: 'mountains'`. `prepare-assets.mjs`
  now copies both variants. Verified live: The Frozen Pass renders a
  dramatic gray/white jagged mountain range distinct from every other
  destination's rolling green hills; home and untagged destinations
  unchanged; zero 404s on the new asset path.

  **Not chased further this pass, flagged for a follow-up look:** one
  live screenshot at template-06 showed what may be an oddly-oriented prop
  or billboard near the camera (a pale rounded shape over a boxy grey
  structure) — inconclusive at screenshot resolution, not clearly a bug,
  and not what the user's report was about (that was specifically the
  ground/terrain). `export_textured.py`'s own comment flags tree billboards
  as a known special-case in its UV handling ("their textures are stored
  pre-flipped") — worth keeping in mind if a future report specifically
  calls out a tree, banner, or other flat billboard prop looking wrong.

  [COMPLETE] ✅ **Hidden homestead/world editor — SHIPPED 2026-08-05 as Wave 6 of the
  full-ROADMAP wave plan.** Answers this entry's own open design questions directly:
  - **What state it edits, and where it's written**: `GROUNDS` (grounds.ts), `LAND_TIERS`
    (buildables.ts), and Wave 5's `CULTIVATED_PLOTS` (cultivatedPlots.ts) all moved off
    hand-written TS array literals onto `grounds.generated.json` / `landTiers.generated.json` /
    `cultivatedPlots.generated.json`, imported with the SAME `import X from './y.generated.json'`
    + `as unknown as T[]` idiom `bricks.generated.json` already used in two other files — a pure,
    behavior-free source swap verified two ways: a standalone script confirmed the new JSON is
    field-for-field identical to the original literals before the swap landed, and every one of
    `grounds.ts`'s own exported helpers (`GROUND_BY_ID`, `groundAt`, `groundOpen`, `deedName`,
    `sectionsOverlap`, `clearsHomestead`) — plus `cultivatedPlots.ts`'s (`PLOT_BY_ID`,
    `plotNodeCount`, `plotStakeAt`) and `buildables.ts`'s (`landHalf`, `BUILD_REGION`,
    `activeBuildRegion`) — is untouched, because none of them ever cared whether the array came
    from a literal or an import. The hand-written siting-rationale comments each entry used to
    carry (why THIS box, checked clear of what) don't survive the move to JSON, which has no
    comment syntax — a real, deliberate tradeoff, preserved in this repo's git history rather than
    silently lost, and replaced by the editor's own LIVE checks below instead of "read the comment
    before moving anything."
  - **The editor itself**: `/secret/worldeditor` (a real page, `src/app/secret/worldeditor/`) —
    tabbed forms for all three tables, plus one shared live top-down SVG preview showing every
    ground and cultivated plot (solid vs. dashed border), the homestead's nested land-tier
    squares, the road, the pond/brook, and the starter-village clear zones. The preview runs the
    exact three checks that used to only fire as a `console.warn` at dev-server-start —
    `sectionsOverlap`/`clearsHomestead` (grounds.ts) and the road-crossing check (Grounds.tsx) —
    LIVE against whatever is currently typed, before Save, plus a new world-edge-proximity check
    (the exact class of bug `scatterNodesInRect` hit twice: a box too close to `WORLD_HALF` that
    silently starves its own node seeding). A "Save `<table>`" button POSTs to a new API route
    that re-validates the payload shape server-side and writes straight to the matching
    `*.generated.json` — Next's dev server picks up the change with no restart needed.
  - **The auth gate — a real, evidence-based deviation from what this entry originally assumed
    it would need.** Before building, checked `src/lib/server/session.ts`/`db.ts` for what a
    hardcoded user-id allow-list would actually be checking against, and found `package.json`'s
    own `predev` script — `node -e "require('fs').rmSync('data',{recursive:true,force:true})"` —
    **deletes every local account on every single `npm run dev` restart.** A hardcoded allow-list
    would invalidate itself the next time anyone restarted the dev server — a real footgun, not a
    hypothetical one. Gated on `process.env.NODE_ENV !== 'production'` alone instead (both the
    page — a server component, so a client-side hide can't ship the bundle to anyone who asks —
    and the save/data API routes independently, each re-checking rather than trusting the page's
    own gate), the same proven dev-only idiom this codebase already uses in five other places
    (grounds.ts, cultivatedPlots.ts, Grounds.tsx, buildables.ts, navTerrain.ts). `getSessionUserId()`
    is still read and shown ("Editing as: …") for a human-readable audit trail, but never
    consulted to decide whether a request is allowed.
  - **Verified live, including the actual production gate, not just inferred from the code**: the
    production `next build` itself statically prerenders `/secret/worldeditor` at build time
    (`NODE_ENV` is `'production'` during a real build), which means `notFound()` fires once at
    BUILD time and the shipped static output IS the 404 page — a stronger guarantee than a
    per-request check. Confirmed directly by actually running `next start` against a real
    production build: `/secret/worldeditor`, `/api/worldeditor/data`, and `/api/worldeditor/save`
    all returned real `404`s while the homepage served `200` normally. In dev mode: loaded the
    editor and confirmed all three tables show the real on-disk counts (6 grounds, 2 plots, 5
    tiers); edited a ground's `x` to collide with another and watched a real warning appear
    (`"The Home Grove overlaps Northwood Stand"`), then reverted it and watched the warning clear;
    nudged Deepwood's `count` 14→15, saved, confirmed `grounds.generated.json` actually changed on
    disk, then reverted and saved again, confirming the file was byte-identical to its pre-test
    state afterward; confirmed the save route rejects a malformed payload with a real `400`; and
    — the actual regression risk of a "move the data source" refactor — booted the game itself
    guest-login through to the homestead post-swap and confirmed the homestead's grounds/plots
    still render with zero console/page errors (59 runtime nodes, matching the pre-Wave-6
    baseline exactly). `npm run verify` clean throughout.

  [COMPLETE] ✅ **Cultivatable resource nodes — SHIPPED 2026-08-05 as Wave 5 of the full-ROADMAP
  wave plan.** Standalone (does not depend on Waves 3/4's settlement work). Two hand-authored,
  homestead-only plots — **The Orchard Rows** (tree, 9-node cap) and **The Physic Garden** (herb,
  6-node cap, sized down from an original 8 after a real replay showed herb's 7m separation
  physically can't fit more in that box) — start nearly bare and thicken a stage at a time
  (0-4, `MAX_PLOT_STAGE`) as the player fills a Pail of Water at the brook and pours it on:
  - `Ground`'s rectangle fields (`kind/variant/x/z/halfX/halfZ/count`) were split into a shared
    `RectSection` (`grounds.ts`); `Ground` and the new `CultivatedPlot` (`types.ts`, +`stage`/
    `plantedAt`/`lastWateredAt`, wall-clock epoch-ms like `settlements`, not `plots`' frame-ticked
    countdown — deliberate, since a plot has to survive a reload) both extend it.
  - `seedNodes()`'s per-ground scatter loop was extracted into standalone `scatterNodesInRect()`
    (`gameStore.ts`), reused by both the original 6 grounds AND the new `cultivatePlot()`/
    `waterPlot()` actions — one scatter implementation, not two. `ResourceNodeState` gained `world`
    and `ResourceNodes.tsx` now applies the exact `(n.world ?? null) === (destination ?? null)`
    filter `Buildings.tsx` already established — closing a real, confirmed-by-reading standing perf
    gap (every node rendered/instanced regardless of where the player stood).
  - New "fill a pail" interaction anywhere along the brook (`world.ts`'s new exported `BROOK`,
    lifted out of `Terrain.tsx`'s local consts so the drawn strip and the interact point can't
    drift), a new `water_bucket` item, and plant/water interactions at each plot's own stake —
    all through the ordinary `Target`/`consider()`/dispatch pattern, no new harvest code needed
    (a grown node is an ordinary `kind`-generic `ResourceNodeState`, chopped/mined/foraged through
    the ordinary path unchanged).
  - `st.nodes` was confirmed (by reading `GameState`/`SaveGame`) to be fully runtime/non-persisted,
    regenerated from scratch on every `seedNodes()` call (new game, load, `buyLand()`) — so plot
    growth genuinely persists as `stage`/`plantedAt`/`lastWateredAt` on `SaveGame.cultivatedPlots`,
    and the live node cluster is *re-derived* from that each time, never itself saved. Verified this
    round-trips exactly: watering a plot live to stage 4 produces node-for-node identical output
    (id/x/z/scale/yaw/model/world, 6 decimal places) to what `seedNodes()` re-derives from a real
    page reload.

  **A real, latent rendering bug was found and fixed along the way, not just this feature's own
  bug.** First live verification pass found planting/watering a plot silently drew nothing: 257
  `WebGL: INVALID_VALUE: bufferSubData: srcOffset + length too large` console warnings fired the
  instant `cultivatePlot()` ran, and the plot's new trees/herbs never appeared on screen at all
  (confirmed via matched-camera screenshots and raw `instanceMatrix` decode — 0/9 and 0/6 drawn).
  Root cause, read directly out of the installed `@react-three/drei` source: `<Instances limit={…}>`
  allocates its `instanceMatrix`/`instanceColor` buffers exactly once, in a `useState` initializer,
  from whatever `limit` it was MOUNTED with — a later `limit` prop only feeds the per-frame
  `updateRange`, so raising it past the mount-time size uploads more data than the buffer holds.
  `InstancedProps.tsx`'s existing high-water-mark ref (added 2026-07-28 for a *different*, Firefox
  shrink-then-regrow bug) fed that growing number straight into `limit` — correct for never
  shrinking, silently wrong for ever growing past the mount size. Wave 5 is the first code in the
  project that grows `st.nodes` at runtime, which is why this had never fired before. **Fixed at the
  root** in `InstancedProps.tsx`: capacity is now quantized into coarse power-of-two buckets
  (`MIN_CAPACITY = 32`) carried in the `<Instances>` React key — constant within a bucket (all
  drei's mount-once allocation needs), and a bucket crossing forces a clean remount that
  re-allocates at the new size (verified the shared sub-mesh geometry/material survive that remount
  by reading R3F's own `removeChild`). Buckets are sized so ordinary play — planting and watering
  both plots to full moves trees 19→24 and herbs 7→13 — never remounts at all. Verified with a real
  negative control: temporarily reverting the fix reproduced the exact original failure
  (`glErrs: [1281 INVALID_VALUE, 1282 INVALID_OPERATION]`, 0/9 and 0/6 drawn) against the identical
  script; restoring the fix cleared it (`glErrs: []`, 9/9 and 6/6 drawn) — so the fix is causally
  responsible, not coincidental.

  Verified live end-to-end through the real interact path (real prompts, real held-E, no direct
  action calls except for setup): brook fill → pail granted; plant → stage-0 cluster (2 orchard
  trees) appears at the exact authored rect; four waterings → stages 1-4, node counts 2→4→5→7→9,
  each stage a strict superset of the last (surviving nodes keep their `x/z`, never move); refused
  cleanly with no pail and refused again cleanly at stage 4 ("come in full") without spending a pail
  either time; a harvested node's `hitsLeft`/`respawnAt` survives a later watering (no free respawn).
  Destination filter confirmed genuinely filtering and reversible (retagging all nodes to a fake
  world and back dropped and restored the exact right instance/mesh counts). A real page reload
  round-trip (not just `toSave()`/`loadFromSave()` in-memory) confirmed both plots restore at their
  planted stage with zero overflow and zero console/page errors. `npm run verify` clean throughout
  (typecheck + production build), zero `[grounds]`/`[plots]` dev-assertion warnings.

  **Wave 4 (challenge maps as new destinations) shipped 2026-08-03.** The 6
  bonus "challenge" maps the lab classified alongside the 9 templates
  (`reports/maps/challenge_N_layout.json`) are now real `WORLD_DESTINATIONS`
  entries (`challenge-1`..`challenge-6`, `game/data/worlds.ts`), reachable
  from the Travel Map's new "Challenge Grounds" section — no unlock gate,
  data-only for now (no resident cast/quests, matching how the 9 templates
  themselves shipped before Phase 20 added residents). `TemplateWorld.tsx`'s
  `TEMPLATE_WORLD_SCALE` is now overridable per destination
  (`WorldDestination.worldScale`) in case a future map needs its own
  calibration, but it turned out **not to be needed here** — a live
  measurement (loading challenge-1.glb and reading `normalizeTemplateBake`'s
  real computed bounding box) confirmed challenge maps use the exact same
  net scale convention as templates (`export_textured.py`'s own
  `prefer_template` flag applies identically to both, confirmed by reading
  that script), contradicting an earlier assumption in this same effort that
  a separate `CHALLENGE_WORLD_SCALE` constant would be needed. Radii were
  computed per-map from each layout's own `space.bbox_size`, not guessed.
  Verified live: all 6 destinations travel cleanly with no console/asset
  errors and real ground-height sampling; two screenshots (smallest and
  largest) confirm human-scaled, correctly-proportioned dioramas.
- [TODO] **Option B of the workshop** (instruction-accurate builds): still needs
  LDraw models, Rebrickable inventories, and the manual PDFs. `ldraw/` holds
  only its README. Send one `.mpd` and the seam can be proved against it.

## Pointer lock, corrected again — 2026-07-26 [COMPLETE]

**It would not let go.** The first cut retried on a timer, on
`pointerlockerror` AND on window focus, so clicking into another window — a
browser tab, a chat — handed the pointer straight back to the game and trapped
it there. Reported from Firefox, and it is the worse bug of the two: a game
that will not release the mouse is worse than one that needs a click.

Wanting the lock is not the same as being entitled to it. The retries are gone
and so is the focus handler. What remains: a click on the world takes the lock
(the gesture players already know), and closing a panel asks ONCE — that being
the only transition the game itself drives — and only while the window still
has focus. If the browser refuses during its post-Esc cooldown, a click takes
it back. Losing the lock now does nothing, because losing it is usually the
player LEAVING.

[COMPLETE] **Corner plate turned 180°** — it ran south-to-east and wanted west-to-north.

---

# BLOCK N — playtest round, 2026-07-26 [TODO]

[COMPLETE] **N74 · Herbs never come back.** A foraged herb patch does not re-render after
its respawn, where trees do. Probably the model/instancing path rather than the
respawn timer — `ResourceNodes.tsx` filters herbs by `respawnAt === null` at
build time of the instance list, so check that the list actually rebuilds.

[COMPLETE] **N75 · Fence the grounds instead of drawing lines.** The gold boundary strips
should be the game's own wooden fence pieces run around each section — the
fence buildable already exists, and a run of instanced fence is likely cheaper
than the plane strips as well as looking like something a holding would put up.

[COMPLETE] ✅ **N76 · Quests and errands should pay GOLD as well as resources** (2026-08-13,
Wave 13). This turned out to already be a working, exercised pattern — `Quest.grantItems`/
`SideQuestDef.rewardItems` both already accept a `gold` line and `gameStore.ts` already deposits it via
`addItems` on completion — just inconsistently applied: 8 of 11 main quests and 9 of the reachable
side errands (the ones actually offered through `DialoguePanel`/`ParleyPanel`, not
`allegianceQuests.ts`'s `EXTRA_SIDE_QUESTS` pool, which is separately dead code for every giver except
Cedric — see `settlementQuests.ts`'s own header comment, a pre-existing gap, not fixed here) paid
materials only. Pure data change, no plumbing: added a `gold` line to all 8 no-gold main quests
(`quests.ts`, 8-60 scaled roughly to xp/position in the chain, ~0.2-0.3 gold per xp, matching the
existing travel-quest gold curve) and to the 9 reachable no-gold side errands (`npcs.ts` — Queen's
baked `q_flowers`/`q_decor`/`q_barrels`, Richard's `r_slay2`/`r_slay4`, John's `j_wood`/`j_fish`/
`j_planks`, and Cedric's `ced_stone`), added alongside their existing material rewards rather than
replacing them, sized against `data/trade.ts`'s `SELL_PRICES` (e.g. `q_flowers`'s existing `plank: 4`
already sold for ~8g, so its added gold sits at a comparable 8) and against already-gold-paying peers
of similar `xp`/kind (`ced_stone`'s 20 gold mirrors `miller_beda`'s near-identical `bd_stone` errand —
same target/need/xp, different giver). `allegianceQuests.ts` and `settlementQuests.ts` needed no
changes: both were already fully gold-paying (`settlementQuests.ts`'s Fenwick errands, 15/20 gold, and
every `EXTRA_SIDE_QUESTS` entry except the deliberate `q_ledger` gold-sink quest).

**A live bug found by Wave 13's own verify pass, fixed 2026-08-14**: `gameStore.ts`'s `addItems()`
computed its own local inventory snapshot at function entry, then — only for `source: 'gather'` — called
`bumpQuestCounters()` for each accepted item BEFORE its own trailing `set({inventory: ...})`. Now that
every main quest carries `grantItems` (this wave's own change, directly above), `bumpQuestCounters` can
synchronously complete a quest, whose `completeQuest()` makes its own NESTED `addItems(grantItems,
'grant')` call for the gold reward — that nested call reads a fresh `get().inventory` and commits its
own `set()` immediately. The OUTER call's trailing `set()` then ran anyway, using ITS OWN pre-nested-call
snapshot, silently overwriting the store's inventory right back over what the nested call just committed
— discarding the quest's gold every time a `'gather'` action's last accepted item completed the quest's
final objective. `first_steps`, the game's very first quest (a single gather objective), hit this on
every single playthrough with no error and no visible sign — the "Quest complete" toast and XP still
fired normally, only the promised gold silently vanished. Every other quest-progressing action
(`craft()`, `constructBuilding()`, `travelTo()`, `openDialogue()`) already commits its own inventory
change BEFORE calling `bumpQuestCounters`, so only the `addItems('gather')` path — `harvestNode()`,
farming harvest, villager haul-to-deposit — was affected. Fixed by reordering `addItems()` to commit its
own `set()` first, so a nested grant always layers its own gold on top of what was just written instead
of racing it. Confirmed live via real Playwright: `first_steps` (2 real `harvestNode()` calls) now pays
its full +8 gold, `stone_age` (craft-then-gather-last, the second repro) now pays its full +16, and
`squires_errand` (a build-only quest with no gather objectives at all — the positive control proving
this was never a general "gold grants are broken" bug) continues to pay its +26 exactly as before.

[COMPLETE] **N77 · The merchant's hands float.** Same fault Alric and Beda had when they
first spawned — arms and hands from a donor whose body type does not match
(see K57). Audit the merchant's config the same way.

[TODO] **N78 (rest) · A proper walled merchant camp.** The "arrive, trade, leave"
half is done (O4, superseded below). What's left is content authoring, not a
bugfix: a small walled place with its own guard posts, off to the west,
connected to the homestead by an extension of the road, purpose-built rather
than the merchant sharing Alric's and Beda's own corner — which is where he
stands now (L68, resolved: the "south guard posts" turned out to be their
`mc001` huts). Optional polish, not a blocker on anything.

**N79 · Enemies should come UP THE ROAD.** Split into two halves on a 2026-08-04 re-check:
[COMPLETE] the road-arrival half — shipped 2026-07-28, see the full writeup above ("N79 · Raiders
should arrive by the road, not pop into existence"): raiders spawn at `roadEntry()` and walk in via
the nav-grid, tagged `approaching`. [TODO] the "day or night, not just after dark" half — confirmed
still genuinely open (`Enemies.tsx`'s raid trigger is gated to `worldEnv.time > 0.7 && < 0.78`, dusk
only); this is what N80's guard-shift item below is actually waiting on.

[COMPLETE] ✅ **N80 · Guard shifts** — shipped 2026-08-04 in commit `6aed460` (Wave 0+1), never
retagged until Wave 13's research pass caught the gap while auditing this same section. A per-defender
`Villager.shift?: 'day'|'night'` field (`types.ts:502`) is a real behavioral branch, not dead data:
`Defenders.tsx:203` — `const onWatch = villager.shift === 'day' ? isWorkingHours(worldEnv.time) :
isWatchHours(worldEnv.time);` — and `VillagersPanel.tsx` has the actual toggle UI wired to it.
Supersedes L67's blanket "all defenders keep the night shift".

[COMPLETE] ✅ **N81 · The FPS hands are gesturing backwards** — shipped 2026-08-04 in `6aed460`
(Wave 0+1), same retag gap as N80. `Viewmodel.tsx:491-508`: `if (tool === 'fist' && playerState.acting)`
applies a pivot-compensation shift back toward the elbow along `-ARM_DIR`, scoped only to the bare-fist
case so held-tool/weapon alignment (L73's own remainder) is untouched.

[COMPLETE] ✅ **N82 · One readout for a target, not two** — shipped 2026-08-04 in `6aed460`
(Wave 0+1), same retag gap. `HealthBillboard.tsx:64-65`: `const isAimTarget = aimState.target?.key ===
\`enemy:${data.id}\`; g.visible = fade > 0.02 && hurt && !isAimTarget;` — the world-space bar suppresses
itself exactly for the crosshair's current target, leaving every other hurt enemy's own ambient bar alone.

## What phase 2 has to decide first [COMPLETE]

The spec (§7.1) says use **navcat** and build the navmesh offline from `NAV_`
prefixed collision meshes authored in Blender. This project already has
`game/navgrid.ts` — a grid steerer derived from `collisionBoxesFor`, i.e. the
same volumes that stop the player, which is why a breach or an open gate is
automatically walkable with no extra bookkeeping. That property is worth more
than it looks and a navmesh pipeline would have to earn it back. Decide
adopt-vs-extend before writing any of phase 2; do not assume the spec wins.

The `NAV_` meshes are a Blender-side authoring pass over the existing rooms and
want doing before phase 2 either way if the navmesh route is chosen —
regenerating per-room navmesh JSON later is worse than authoring it alongside.

## The missing system, and why O7 was not a one-line fix [COMPLETE]

O7's real cause was that the game had no difficulty curve — it had one
`dragonSeen` flag and a building count. Raiders, camp guards and the dragon
each gate on their own ad-hoc condition, so nothing scales together and
nothing can be reasoned about. See the fix log below for the threat-tier
system this became.

## Order [COMPLETE]

1. [COMPLETE] `bugfix/dragon-difficulty-gate` — O7 + the threat-tier module. Worst
   player-facing item; everything else is cosmetic beside an unwinnable fight.
2. [COMPLETE] `bugfix/villager-recruitment-ghost` — O1, after a repro.
3. [COMPLETE] `bugfix/villager-work-routine` — O2, same file as O1's likely fix.
4. [COMPLETE] `bugfix/herb-persistence` — O6. Self-contained.
5. [COMPLETE] `bugfix/node-seeding-collision` — O3. Wants the same footprint test
   O8 will use.
6. [COMPLETE] `enhancement/build-asset-preload` — O5. Measure the stall before and
   after; a fix nobody can feel is not a fix.
7. [COMPLETE] `enhancement/merchant-travel` — O4. Largest scope; the rig fault and
   the travel behaviour are separable and may want splitting.
8. [COMPLETE] `enhancement/grounds-fence` — O8. Pure polish, last.

## Block O — fix log [COMPLETE]

[COMPLETE] **O1 · resolved as a duplicate of O2, not a separate bug.** Read `Npc.tsx`'s
unmount filter and `recruitVillageFolk` end to end: the retirement mechanism
is correct (`!villagers.some(v => v.id === n.id)` matches the exact id the
Villager is created with), and `StarterVillage.tsx` renders only huts, no
figures — there was never a second renderer to produce a real duplicate.
What actually happened: before O2's fix, a freshly recruited Alric/Beda
snapped straight to a hashed spot near the homestead centre (not their old
hut) and immediately froze there via the `navSteer` divide-guard bug, with
no visible walk transition (the road-arrival call was also a no-op at the
time — see O2). Standing motionless at a new position, having never visibly
left the old one, reads exactly like "the placeholder is still there." No
separate fix needed.

[COMPLETE] **O2 · fixed, and the real cause was not either logged suspect.**
`navSteer`'s `Math.hypot(gdx, gdz) || 1` put a divide-by-zero guard on the
*reported distance* rather than the divisor. An agent standing exactly on its
target got `dist = 1`, so every caller's arrival check (`d < 0.4` / `0.6` /
`1.2`) failed, they took the keep-walking branch with a zero-length direction
vector, and never re-rolled the target because arrival never fired.
`VillagerFigure` seeds `x/z` **and** `tx/tz` to the same home spot, so anyone
who spawned rather than walked in began life in that state. A raid broke it by
physically displacing them — exactly what was reported.

Second fault in the same area: `recruitVillageFolk`'s road arrival was a silent
no-op. It read `villagerMobs[npcId]`, which does not exist until
`VillagerFigure` mounts, so `if (m)` never ran. Now uses `arriveByRoad()`,
which creates the entry — so Alric and Beda walk the road in like every other
newcomer, as asked.

**Worth keeping:** the `|| 1` bug was latent for every caller, not just these
two. Anything that starts on its own target hits it.

[COMPLETE] **O7 · fixed, with the difficulty system it needed.** New leaf module
`game/difficulty.ts` (carts.ts pattern — reads the store one-directionally,
nothing in the store imports it). One `TIER_RULES` table, tiers 0-5, each
requiring **all** of: lifetime structures, total skill level, lifetime kills,
days elapsed. An AND rather than a score, so a builder is not handed a war and
a fighter is not handed a siege of a homestead that is not there.

Every input is monotonic by construction — `stats.buildingsPlaced` is the
lifetime counter, not the current building list, so razing your own walls (or
a raider doing it) cannot walk difficulty back down. That is what makes the
tier persist through a save with no new field and no high-water hack.

The dragon now needs `tier >= 3` **and** `rangedReady()` — a bow or crossbow
*with ammunition for it*. Both, deliberately: a tier-3 player with no bow is
still a spectator. Tier, its inputs, and what the next tier is waiting on are
all in the `` ` `` debug overlay, so this is tunable rather than guessed at.

[COMPLETE] **Not done in this pass:** only the dragon is migrated. `raidStrength()` is
exported and ready, but `Enemies.tsx`'s raider spawning still uses its own
gate. Migrating it is the next step and must happen before two gating schemes
settle in — that is the failure this system exists to end.
— **Migrated 2026-07-28** (re-confirmed live in code 2026-08-04, this was already shipped, not a
remaining bug): `useEnemyStore.spawn()` (`game/combat.ts:274-288`) now computes
`scale = (kind === 'cedric' || kind === 'storm' ? 1 : raidStrength()) * extraScale` and applies it to
`maxHp` at spawn — every raid-filler enemy (bandits, royal knights, etc.) scales off the same tier curve
the dragon uses; Cedric/Storm stay excluded as tuned set-piece encounters, exactly as originally
intended. `Enemies.tsx` itself needs no direct `raidStrength()` reference since the scaling lives in the
spawn action it calls, not the component — that's why an earlier grep of `Enemies.tsx` alone looked like
this was still unmigrated.

[COMPLETE] **O6 · fixed, and it was never a data bug.** Read `ResourceNodes.tsx`,
`InstancedProps.tsx` and every store path touching `nodes` (`seedNodes`,
`harvestNode`, `tickRespawns`) end to end — nothing hides or removes a herb
based on time, season or weather; `respawnAt`/`hitsLeft` only change on
harvest and respawn. The likelier cause: night ambient drops from 0.75 to
0.28 (`env.ts`), and a herb renders at 0.35m tall, the shortest and most
ground-hugging prop in the game — the sort of thing a Night-Vision Brew (a
real consumable this game already ships) exists to help with. `InstancedProp`
gained an optional `selfLit` flag — a low always-on emissive (18% of its own
baked colour) — wired on for herbs only, so they stay findable without
depending entirely on scene lighting.

Also fixed a real latent hazard found while touching this code:
`useInstancedSubMeshes` mutated the GLTF loader's *cached* material object in
place (`material.side = DoubleSide`), which silently leaked into any other
consumer loading the same GLB. Now clones before mutating.

[COMPLETE] **O3 · fixed, root cause traced through the actual road math rather than
guessed.** `SIGNPOST` is at (-16, 36), which puts the road's westward cell
`[-3,3]` at world (-38.4, 38.4). The verge-tree pass places trunks 4.4-6.0m
off the carriageway, jittered along it — a band that lands almost exactly on
Beda's hut at (-34, 44). Neither of `seedNodes`' two scatter passes had ever
heard of Alric/Beda's corner: it sits outside `BUILD_REGION` and outside every
`GROUNDS` section, so nothing in either pass's rejection list could reject a
placement there. Added `STARTER_VILLAGE_CLEAR` to `data/world.ts` (plain
data, kept out of the `'use client'` `StarterVillage.tsx` component the same
way `road.ts` keeps its own route data out of the road renderer) and wired a
shared `inStarterVillage()` check into both scatter passes.

[COMPLETE] **O4 · fixed — a real rig cause for the floating prop, plus the travel
behaviour asked for.** `minifiggenericgood00` has a *verified* rig map
(`part_roles.json`) that includes a molded halberd, classified as a `prop`.
With `keepProps=true` (the merchant's only setting), that mesh is kept and
parented to the **body** joint, not the hand — but `rehangArm` then re-hangs
the arm from its own torso socket (K57's fix), while the prop stays exactly
where it was baked relative to the torso. The two drift apart: a weapon
floating away from wherever the hand actually landed. Alric and Beda already
set `keepProps: false` for the same donor for exactly this reason; the
merchant now does too.

Also replaces the instant `merchantPresent()` visibility toggle with an
actual arrival/departure walk via `navSteer`. `PlayerController`'s interact
check and `Minimap`'s icon both key off the static `MERCHANT_SPOT` constant
plus `merchantPresent(time)`, unchanged by this — the walk happens entirely
in a buffer just outside that window, and position is pinned exactly to
`MERCHANT_SPOT` for the whole time he is actually interactable. The cart is
parented under the same group as the merchant, so "along with the horses"
needed no extra code. **Not built:** the walled camp / road extension N78
originally proposed — that is content authoring, not a bugfix, and stays open.

[COMPLETE] **O5 · fixed, and the real cost was not where it looked.**
`preloadCommonAssets()` already warmed every buildable's GLB fetch+parse.
The actual cost was `useNormalizedProp`'s expensive step (clone, two bbox
passes, shadow/normal traversal, alpha-mask fix), which lived in a plain
`useMemo` — and React's `useMemo` only memoizes across re-renders of the
*same component instance*, not across different mount sites. Placing a
second copy of a wall already standing elsewhere redid the full
normalization from scratch, synchronously, on every single placement, not
just the first. Two existing call sites (`ConstructionSite.tsx`,
`Wildlife.tsx`) already carried comments asserting this function "shares" /
"hands out a cached model" — that described the intent, not what the code
did. A module-level cache, keyed the same way React's own memo key already
was, makes it true: the first placement of a given `(url, height)` pair pays
the cost once, every other instance gets a cache hit.

[COMPLETE] **O8 · fixed.** Supersedes N75. The gold boundary strips in `Grounds.tsx`
are now a run of the existing fence buildable (`l607900.glb`, the same asset
the player places), walking each ground's four edges in evenly-spaced
segments through one shared `InstancedProp` call across every ground — same
reasoning `ResourceNodes.tsx`'s `TreeGroup` already uses. Open/locked state
keeps the same legibility the strips had, now as a tint on real wood.

# NPC AI — phases 2-5 complete, 2026-07-28 [COMPLETE]

The full 30-iteration build plan (`NPC_AI_SPEC.md`, `PHASE_2_NAVIGATION_AND_GATHERING.md`,
`PHASE_3_4_5_ACTUATION_AND_REASONER.md`) is done — navigation, actuation/animation splice, and the
utility-AI reasoner all shipped, one branch/PR per iteration. `src/ai/PHASE_STATUS.md` carries the full
per-iteration detail (every bug found, every fix, every verifying smoke test); this entry is just the
roadmap-level summary and what's deliberately still open.

Two real product bugs turned up in the final validation pass (a live 6-villager, every-job-type,
75+ second unpaused run — the first test in the whole arc to do that) that no single-agent controlled
test had caught: a React key collision once `gather_resource`/`haul_to_deposit` legitimately produce
several scored candidates sharing one action id (`AIDebugOverlay.tsx`), and a villager that reaches
"nothing left to do" (sack full, no reachable stockpile, no raid, daytime) freezing in place forever —
`runReasoner`'s "no winner" branch cleared `agent.currentActivity` but not `agent.intent`, and every
renderer treats any non-null intent as authoritative with no way to tell "still running" from "reasoner
moved on." Both fixed; confirmed end-to-end by re-running the original discovery scenario, not just in
isolation.

**All five closed by Wave 10 (AI economy correctness), 2026-08-10:**
- [COMPLETE] **Might/Craft trip bonuses now reach the AI-driven haul path.** `haul.ts`'s `rollTripBonus()`
  makes the same rolls `tickVillagers` always did — Might for a double load, Craft for a `SIDE_GOODS`
  bonus, both stacked with the job's `HAUL_TRAIT`/`SIDE_TRAIT` companion traits — off `attrsOf(agent.id)`,
  the villagers' own deterministic attribute roll (`data/attributes.ts`), NOT the player's separate
  spent-point system. **The design call the entry was waiting on:** a trip is ONE COMPLETED DEPOSIT.
  Per-swing would fire the old odds twenty times a trip, per-gather-completion once per node rather than
  once per journey; the deposit is the only moment in the decomposed shape that is 1:1 with the old
  "one trip finished" — which is exactly the equivalence `awardTradeXp`'s +10 already assumed. The
  bonus goes in BEFORE `addItems` so Wave 9's storage cap applies to the real number, and the villager's
  own carried goods come off their back before the bonus does, so a nearly-full store turns the bonus
  away rather than stranding gathered goods. Wit stays out on purpose: the old rule is merchant-only and
  a merchant is structurally outside gather/haul, so a Wit branch here could only be dead code.
- [COMPLETE] **Stranded carrying — fixed, though the entry's premise was half wrong.** The suggested
  "periodic re-query" was already built: `assembleCandidates` re-runs `queryNearby` against the agent's
  live position every think tick. The real gap is that an empty result is no candidate AT ALL, and
  nothing else in the live registry can move a carrying villager (`gather_resource` is capacity-gated,
  `idle_fidget` has no locomotion, and `wander`/`idle` are ids in `archetypes.json` with no Action behind
  them). The rescue that made this look survivable was `Villagers.tsx`'s legacy Phase-24B cascade,
  driven by the unrelated old trip timer, present only for four jobs, and double-crediting the old
  economy meanwhile. New `seek_deposit` Action (`ai/actions/seekDeposit.ts`) closes it inside the AI:
  no `targetKinds`, an unbounded scan for the nearest `DEPOSIT_KINDS` building, a plain `MOVE_TO`
  (flee.ts's pattern), weight 0.6 so it only ever wins when both real work actions have no candidate,
  and it gates ITSELF off inside 40m so `haul_to_deposit` takes over normally. The radius is unchanged.
- [COMPLETE] **herb/fishing node kinds have a `job_match`** — and the gap was bigger than "add two lines":
  no herbalist/fisherman job existed in EITHER system. `VillagerJob` (`types.ts`) gains both, `JOBS`
  (`data/villagers.ts`) defines them, they appear in the Roster with no UI work (that panel is fully
  data-driven), and both get `SIDE_GOODS` rows and a three-trait companion pool for parity with the
  other trades. The one-line part really was one line — the job->kind table moved next to `JOBS` as the
  shared `JOB_NODE_KIND`, now read by `gather.ts`'s job_match, `villagerAtWork()` and `Villagers.tsx`'s
  worksite walk instead of three hand-copied ternaries (without the `villagerAtWork` case, the new jobs
  would have been paid `perTrip` on a timer from anywhere on the map — L66's bug, straight back).
- [COMPLETE] **Farmplots have their own Activity; `FARMPLOT_GATHER_ENABLED` is deleted.** §1.1's open
  question resolves to "they genuinely don't fit, and shouldn't be made to": a farmplot is a
  `PlacedBuilding` whose readiness is a countdown in `st.plots`, worked plant -> wait -> harvest, with a
  state whose correct behaviour is to put something IN. Flipping the flag alone would have hard-failed
  every tick on `GatherAtNodeActivity`'s `target.source !== 'node'` guard. New `tend_farmplot`
  (`ai/actions/farm.ts`) reuses the shared reserve/travel/align/perform skeleton and the farmplot anchor
  rule that already existed, reads the three-state machine in one place, and calls a new AI-only
  `tendPlot()` store action (`gatherSwing`'s counterpart for a timer-based resource) that hands the crop
  back to the caller so it rides in `bb.carrying` and is hauled like every other trade's load — a farmer
  whose wheat appeared in the stores as she cut it would be the one trade paying no travel cost at all.
  A growing bed scores 0 rather than low, so nobody stands over the seedlings.
- [COMPLETE] **Trip-time balance call made, and it was not "accept the numbers".** The real finding on
  reading the code: an existing, already-tuned speed mechanism was silently dropped when the AI path was
  built. `tripSpeedMult()` (Diligence ±2.5%/pt, trade mastery -2%/level, floor 0.55x) and
  `tripTraitMult()` (Swift-family traits, x0.88) scaled the old flat timer and are referenced NOWHERE in
  `gather.ts`/`haul.ts`/`Locomotion.ts` — so a player investing in a villager bought exactly nothing once
  that villager went AI-driven. Ported as `bb.tripSpeedMult`, live-read every think tick alongside
  `bb.job`/`bb.carryCapacity`: Locomotion divides WALK speed by it (run is untouched — it only ever
  carries a flee, and Diligence is a work stat, not a panic one; walk is capped at the run pace so a
  maxed veteran reads brisk rather than skating), and `gather.ts` multiplies its swing interval by it —
  which matters more, since a maxed sack is ~30 swings, i.e. 36 straight seconds, the largest block in
  the 150-200s worst case. A blanket travel-time cap was considered and REJECTED: 5.8b deliberately
  accepted real haul travel as a real cost, and capping it would delete that decision rather than tune
  it. Distance still costs; investment now buys its way out of it, through the same levers the pre-AI
  game already taught players.

  **Verified live, through the real Reasoner/Activity loop (not direct store calls), with exact
  numbers**: a lumberjack with Might 7/Craft 5 hauling 3 wood — `rand≈1` (neither roll fires): stores
  take exactly 3; `rand=0` (both fire): request `{wood:6, flowers:1}`, accepted in full; with a
  `lum_deepcut` HAUL_TRAIT and the double suppressed: 3→4. With the store 2 short of a 140 cap: request
  8 wood, accepted 2, and the villager kept the other 2 of their own load on their back — confirming the
  bonus really does apply before `addItems` and the villager's real goods really do come off first.
  Stranded carrying: a tree 46m from the stockpile (outside haul's 40m query) produced
  `gather_resource → seek_deposit (MOVE_TO, 47.7m) → haul_to_deposit (39.8m, exactly the handoff line)
  → deposited`; with the stores already full, `seek_deposit` correctly never engaged and the villager
  idled instead of marching a load nowhere useful. Herbalist and fisherman both gather→haul for real
  (`{herb:6}`/`{fish:6}` stored, trade XP granted); with the legacy timer path active, mobs pinned away
  from any matching node got **no** `villagerProgress` credit at all — the old "paid per trip from
  anywhere on the map" bug did not come back. `tend_farmplot`: untilled→planted set `st.plots` to exactly
  `GROW_TIME`; a growing bed produced only `idle_fidget`; forcing it ripe harvested `{wheat:2}` into
  `bb.carrying` with the inventory unchanged at that instant and the player's own farming XP untouched,
  then a normal haul deposited it. Trip-speed multiplier measured exact on both legs: at mult 0.925,
  walk 0.973 m/s (formula: 0.9/0.925 = 0.973) and swings averaging 1.11s (formula: 1.2×0.925); at a
  near-maxed 0.484 the walk measured exactly 1.600 m/s — `RUN_SPEED`, the cap holding, not the
  uncapped-formula 1.86; a real live raid (`flee_to_safety`, not a code-read) confirmed the run branch
  measured exactly `RUN_SPEED` regardless of a villager's own trip multiplier, i.e. genuinely unscaled.
  Zero console/page errors across the full run.

**One real bug found by Wave 10's live verification pass, and fixed (2026-08-10):**
- [COMPLETE] **Every Barrel ever placed was an unreachable deposit point.** `resolveAnchor()` returned
  null for `barrel` 100% of the time, so `MOVE_TO_ANCHOR` set `movement: 'blocked'` on the first tick and
  a villager carrying a load to one stood holding it forever, even from 5m away. The cause is a geometry
  mismatch nothing had ever forced into the open: `anchors.json` gave the barrel a radial anchor radius of
  0.9, but the nav grid stamps a piece's footprint inflated by `AGENT_RADIUS` (0.55) and rounded out to
  whole 1.0m cells, so the barrel's own blocked square reaches 3-4 cells across — all 8 radial samples land
  inside it, always — and the `nearestWalkable` fallback budget is `ceil(radius / cellSize)` = **1 cell**,
  which never escapes that square either. Stockpile (1.2 -> 2 cells) and Storehouse (2.6 -> 3) cleared it
  only by accident of being bigger. **Pre-existing, not introduced by Wave 10** — `targetKinds` has listed
  `barrel` since Wave 9 — but Wave 10 made it reachable in a new and worse way: `seek_deposit` shares the
  same `DEPOSIT_KINDS` list for its unbounded nearest-store scan, so a stranded hauler now actively marched
  across the map to a barrel they could never use and then looped `seek_deposit -> null -> idle_fidget`
  indefinitely, where before they would have fallen through to the legacy cascade. Fixed at the root rather
  than by excluding barrels from the scan (which would have left the 5m case broken): the barrel anchor is
  now `radius 1.6, fallbackRadius 2.5`, clearing its own inflated footprint. Verified by simulating the
  real grid rasteriser + `resolveAnchor` over 4000 random placements — old rule 0/4000 resolved, new rule
  4000/4000, 99% of them from a real "stand beside it and face it" sample rather than the fallback.
  `anchors.json` now carries the authoring rule so the next small buildable does not repeat it.
  Hardened alongside: `seek_deposit` now reads the shared `bb.blockedTargets` map (it deliberately does
  NOT write it — a plain MOVE_TO walk can't itself observe a store as unreachable the way
  MOVE_TO_ANCHOR's anchor resolution can; only gather/haul/tend_farmplot record entries), so a store this
  agent has already failed to path to is skipped and the walk aims at the next-nearest one instead of
  re-marching at an unreachable store every time its 4s cooldown lapses.
  Swept every other radial building rule against the same simulated rasteriser afterwards, since the cause
  is an authoring hazard rather than a one-off: `storehouse`, `stockpile` and `farmplot` never return null
  (the farmplot is only 0.5m tall, so `WALK_LOW` skips it entirely and it stamps no footprint at all —
  which is why `tend_farmplot` worked first time), but **`campfire` had the barrel's exact defect at 1% of
  placements** — radius 1.6 against a 1.55m inflated half-extent, fallback budget 2 cells against a blocked
  square that needs 3. It is latent rather than live (no Action carries `campfire` in its `targetKinds`;
  `warm_at_campfire` is still spec-only), so it is fixed with the strictly-additive half only —
  `fallbackRadius: 3.0`, which cannot change any placement that already resolved, and takes campfire to
  0 null. Its low 19% real-sample rate is left alone deliberately: that is slot SPACING, and it is design
  work for `warm_at_campfire` to do when it actually lands, not something to guess at now.

**Phases 6, 7 and 8 closed by Wave 11 (NPC AI: perception, combat, LOD + ambient), 2026-08-11.** The
build order in `NPC_AI_SPEC.md` §10 is now complete except for §9's optional LLM dialogue.
`src/ai/PHASE_STATUS.md` carries the full per-phase detail — every number chosen and what it was set
against, every documented divergence from the spec, and what each phase deliberately did not build.
Roadmap-level summary:
- [COMPLETE] **Phase 6 · Perception.** `bb.threatLevel` and `bb.beliefs` had been authored in phase 1
  straight from §3.2/§3.3 and then written by **nothing** — `beliefs.set(...)` had zero call sites, and
  six shipped actions carry an identical `not_threatened` consideration reading `1 - threatLevel`, so all
  six evaluated `1 - 0 = 1` forever and every villager read as permanently, perfectly safe. Now live:
  §6.1's three-phase vision (squared-distance broad, dot-product cone, budgeted line-of-sight at 4 checks
  per agent per tick with a round-robin cursor) plus a non-instant confidence ramp, §6.2's event-driven
  hearing over real combat sounds with fuzzed positions, §3.3's exponential belief decay and 0.05 prune,
  and §6.3's smoothed threat derivation. Two documented divergences: the narrow phase is a **nav-grid
  march, not a raycast** (no `losCollider` layer exists, and `NavGrid`'s blocked cells are already solid
  at torso height — the same trade phase 2 made extending `navgrid.ts` over adopting a navmesh library),
  and §6.3's "lerp by 0.3 per tick" became a 0.28 s time constant, because per-tick it would escalate 20×
  faster on tier A than tier D purely from LOD. First real consumer of `agent.perceiveHz`, which had
  existed since phase 1 and been read by nothing but the debug overlay's own text.
- [COMPLETE] **Phase 7 · Combat (companion scoped down, honestly).** The `combat` category weights had sat
  in `Reasoner.ts` since phase 5 used by zero actions. `take_cover` is the live deliverable: a villager who
  *perceives* a hostile — never a live mob transform, §3.3 — runs to a point that puts a real standing
  building between them and that hostile's last known position, then turns and watches, and **shouts**,
  emitting a real §6.2 sound carrying that hostile's own belief id so a neighbour gains a low-confidence
  belief about the same raider. One villager's panic becomes information. Genuinely new behaviour:
  nothing in this game reacted to a lone night skeleton before, because the only existing reaction
  (`flee_to_safety`) gates on the global raid flag — and `take_cover` sits *under* flee, so raids behave
  exactly as they do today. **`Defenders.tsx` and `combat.ts`'s mechanics are untouched.** An ordinary
  villager cannot be damaged (`Enemies.tsx` only targets the player, sworn defenders and keep pieces) and
  cannot be armed (`setDefenderLoadout` refuses any non-defender), so a villager who "fought back" would
  have been an invincible farmer killing raiders for free — a balance regression dressed as an AI feature.
  `engage_threat` is built, registered and complete, gated on `job === 'defender'`, which is exactly the
  job `rosterSync` excludes from having an Agent: it cannot fire today and lights up the moment that
  exclusion is reversed. **That reversal is a migration off a shipped, tuned combat AI and needs its own
  sign-off.** `follow_leader`/`assist_leader` were not built: the only follower behaviour in the game is a
  defender's `follow` order, which belongs to that same excluded population, and there is no pet, escort or
  companion entity anywhere — building one would be new game content, not a migration.
- [COMPLETE] **Phase 8 · LOD tiers + ambient.** Tier *assignment* and the 3-thinks-per-frame scheduler have
  existed since phase 1, but `agent.steering` was computed per tier and **consumed by nothing except the
  debug overlay's text**: every agent ran a full `navSteer` on every render frame regardless of tier, so
  LOD throttled thinking and not moving — the more expensive half for an agent actually walking. Now three
  real cadences (full / every 0.15 s / §8's 2 s "coarse step along the path"), each integrating the whole
  banked dt so average speed is unchanged. Fixes a freeze nobody had noticed: `stepLocomotion` is called by
  *renderers*, which only mount figures for the region the player is in — precisely the set tier D excludes
  — so an off-region villager held its Intent motionless until the player came back and resumed as if no
  time had passed. A new sweep in `AiRuntime`'s existing `useFrame` steps exactly those agents, with §8's
  re-entry snap on the way back. Also adds B's missing far bound (60 m, reusing
  `GRAPHICS_PROFILES.performance.characterLodDistance` — the distance this project already decided a rigged
  character stops being worth *drawing* — rather than inventing a second number). The ambient half gives
  `wander` a real Action at last: the id has been first in the villager archetype's intrinsic list since
  phase 1 with nothing behind it. It is deliberately gated to tier-D roster villagers, because a `MOVE_TO`
  for anyone else would win the splice at the top of `Villagers.tsx`'s cascade and starve four shipped
  branches (the newcomer walking the road in, the Wave 9/10 worksite performance, the builder's site, and
  the market/campfire rituals) — the set `wander` can safely move is the set nothing else is moving. Its
  pause between strolls is a cooldown that lets the existing `idle_fidget` win, so "walk somewhere, stand
  and look around, walk somewhere else" falls out of composing two existing ambient actions rather than a
  third timer. **Still open:** §7.5 local avoidance does not exist, so tier C's "simplified" steering is a
  cadence reduction, not a fidelity one — C and A/B differ in cost, not behaviour.

**Verified live afterwards, and it found four real defects — all now fixed.** The three phases were
written typecheck-clean and reasoned from the code, then driven in a browser against the real
`think()` → `tickSenses` → `tickReasoner` loop. Most of it held: measured think rates matched every LOD
tier (10.08 / 5.09 / 2.00 / 0.50 Hz against a declared 10 / 5 / 2 / 0.5), decay and prune rates matched
the config to three decimals, vision correctly failed to see out of range / behind the agent / across a
region boundary, `engage_threat` landed real damage and a real kill, and the tier-D wander loop ran
unobserved and came home on walkable ground. What it caught:
- **`take_cover` never once reached the cover it picked** (4 scenarios out of 4). Running away turns the
  villager's back on the raider, taking the vision cone with it, so the belief decayed and proximity fell
  at the same time — threat was back under the single 0.4 threshold within ~3 s, which is shorter than
  most cover runs, and the action gated out mid-flight leaving them standing in the open. Around that one
  threshold it also flickered against `idle_fidget` four times in 1.5 s, committing to a different
  destination each time. Fixed with three gate regimes instead of one: entry at 0.4, a flat commitment
  value while the run is in progress, hysteresis release at 0.15 once stood down behind the piece. The
  commitment value is 0.8 rather than 1.0 so `flee_to_safety`'s 4.0 still clears the reasoner's switch
  threshold — committing hard enough to finish a cover run must not stop a raid pulling that villager home.
- **`chooseCover` silently discarded valid cover.** The nav grid inflates obstacles by the agent radius
  and quantises to 1 m cells, so blocked ground reaches further past a building than its authored size
  says — a `storehouse` failed the walkability test by 0.8 m, was dropped without trace, and the villager
  ran 8 m into the open while a `market_stall` two metres away worked perfectly. The stand point is now
  probed outward along the same retreat ray until it lands on walkable ground.
- **A one-shot sound raised threat only about half the time.** A heard belief sat just 0.62 s above the
  noticed threshold and the per-agent reaction delay (0.2–0.6 s, rolled at spawn) ate most of it — two
  identical runs gave threat 0.23 and threat 0.00. The threshold moved from 0.3 to 0.2, widening that
  window to 2.24 s; the ceiling a heard belief can reach is unchanged, so hearing still cannot push a
  villager over `take_cover`'s entry gate and the alarm stays provably loop-free.

**All four fixes re-verified live afterwards, with exact numbers.** A real roster villager with a
storehouse standing between it and a real raider now reaches cover in one committed run — a single
`take_cover` entry over the whole 22 s scenario (no flicker), 105 real `FACE` samples once arrived, ending
with the storehouse genuinely between it and the threat and the distance to that threat growing from
4.5 m to 13.85 m. The commitment arithmetic checked out exactly as designed: while travelling the
`threat_high` input pinned flat at 0.800 even as the live number swung 0.798 → 0.283 → 0.875, putting
`take_cover`'s switch bar at 3.3542 — under `flee_to_safety`'s 4.0, so a real mid-cover raid still
preempted to it live. The probed cover point (fix 2) landed on genuinely walkable ground behind the
piece. The alarm was isolated properly this time (a listener turned away from and beyond both the vision
cone and `peripheralRange`, so it could only have learned by ear): it gained a real fuzzed belief at
confidence 0.35 with `isVisibleNow` false. And the one-shot-sound fix (fix 4) went from 10/12 real agents
raising threat to 12/12, then 16/16 on a second, larger run — the coin flip is gone. `engage_threat` also
completed a real kill end to end once given a hand-built defender-archetype Agent (still unreachable in
the shipped game, exactly as designed): hp 8 → 5 → 2 → dying, with the real "defeats a raider!" notice.
Zero console/page errors across the whole re-verification.

One latent robustness gap the re-verification flagged (not a live bug — unreachable today) and fixed the
same day: `Locomotion.stepAgent` called the shared `navSteer()` (game/navgrid.ts) without the fail-open
guard its own sibling grid lookups in this file already use, and `navSteer` calls `getNavGrid` internally
and unguarded, which throws for an unknown region or an unbuilt Crypt layout. Harmless only because every
`agentManager.spawn` site hardcodes `region: null` today — the first Agent spawned with a real region (a
future Wave-4 settlement resident, which `wander.ts`'s own header already anticipates) would have thrown
inside `AiRuntime`'s per-frame loop and taken the whole scheduler down, not just that one agent. Now wrapped
in the same try/catch shape, falling back to `navSteer`'s own documented no-route behavior (steer straight
at the target) rather than a bare early return.
