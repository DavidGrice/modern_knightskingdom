# Knights' Kingdom — Roadmap

The living plan for the LEGO Creator: Knights' Kingdom (2000) remake. Everything is grounded in
assets that actually exist in the extraction (`resources/model_files/extracted/…`).

> **Full implementation history**: the original phase-by-phase roadmap, with per-item implementation
> notes, file references and honest scope corrections, is preserved verbatim in
> [`ROADMAP_ARCHIVE.md`](./ROADMAP_ARCHIVE.md). Asset-identification ground truth lives in
> [`BRICK_CATALOG.md`](./BRICK_CATALOG.md). This file is the *clean* view: what's done, what's next.

**Status tags:** `[COMPLETE]` = shipped and verified · `[TODO]` = not yet built · `[TODO — VERIFY]` = signals conflict, needs a human check.

---

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

## 📋 Remaining backlog (carried forward, grouped by theme) [TODO]

**World & locations**
- [TODO] Streams/rivers/waterfalls using the already-copied `spr203` cascade strip (natural fit for Phase 20 step 1).
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
- [TODO] Windows as a separate interactable (shutters/arrow slits) — the door covers the "a doorway is
  a thing that opens" half of the original line; a window that opens wants a mechanical reason to
  (shooting through it, light, ventilation for a future warmth system) rather than a toggle for its
  own sake, and that is a design call, not a build task.
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
  **Follow-ups:** guild vendors, guild-exclusive errand pools, guild reputation/ranks within each order.
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

Thirteen items off a play session. Several are my own regressions; one (L71)
is a conclusion I reached wrongly and shipped.

[TODO] **L62 · Riding is broken, and mounted combat does not exist.** You cannot see
the horse until you dismount — the mounted view puts the camera somewhere the
model is not. It needs a real mounted first-person: camera set behind the
horse's mane, your own hands still in frame, and the ability to FIGHT from the
saddle — crossbow, bow, halberd, lance.

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
- **The road itself** still runs where a southward expansion would want to go.
  Moving it is a small change — seven named cells in `Road.tsx` — but it wants
  one pass over the whole layout (road, signpost, merchant, guard posts)
  rather than nudging a number.

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

## Blocked on the Grok mapping [TODO]
- [TODO] **Anything that depends on what a template world CONTAINS.** The remaining
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

  **Orientation ground-truth wiring investigated 2026-08-03, deliberately
  NOT wired in — a real, deeper risk than "convert degrees to radians"
  found along the way.** `PAK_ORIENTATION_CATALOG.json`'s per-model
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

## Blocked on a decision or a pointer [TODO]
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
  - Known gap, deliberately left at parity rather than widened into Wave 8's system: **homestead
    defenders can stand in it.** `Defenders.tsx` moves them by direct straight-line steps toward a post
    or target with no nav grid and no water check of any kind — they can already walk into the natural
    `POND` today. Giving dug water a push-back they do not give the pond would have meant reworking six
    separate position writes and their `postY` post-standing logic, which is a defender-movement change,
    not a water one. Worth doing once, for both bodies of water, if it ever reads badly in play.
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
