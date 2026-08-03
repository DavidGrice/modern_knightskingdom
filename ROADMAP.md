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
  `HORSE_MOUNT` anywhere in `src/`) — riding stays hand-tuned.
- [TODO] **`ORIENTATION_REGISTRY.json` / `PAK_ORIENTATION_CATALOG.json`** — per-asset correct eulers; use as
  ground truth whenever a new prop imports facing the wrong way.
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
   below); [TODO] the remaining oc-series set pieces (jail cells, drawbridge base, jewel tower — labels
   already verified, but confirmed not yet in `buildables.ts`'s catalog); Destructor/second Cannon/Animal
   audit; and wall-CONNECTION logic using `canConnectAsWall` + `wallRole` so prefab walls snap end-to-end
   (confirmed: `labCanConnectAsWall` is defined in `labCapabilities.ts` but has no caller anywhere else —
   only generic per-piece grid-snap exists today, not true wall-to-wall connection).

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
   treatment there) and actual walkable-parapet access (climbing onto the walkway a wall's `canStandOn`
   label implies — no stairs mechanic exists yet).
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
- [TODO] Sealed Crypt follow-ups: branching layouts, new objective types (escort/retrieve/survive), visual reskins
  via other piece categories. ✅ *Cosmetic-unlock loot shipped 2026-07-19* — full clears #1/#2 award the
  Broken Axe / Horned Sigil crests (see the crest-unlock entry under Homestead & economy).
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
- [TODO] Halberd sweep / spear thrust as *player* weapons (molds already extracted and loaded).
- [TODO] Armor tiers (iron → forged → castle-crested via torso decal variants).
- [TODO] Catapult/trebuchet (only the cannon exists; firing sound `snd060` is waiting).
- [TODO] Timed build challenges recreating the original game's six challenges (their full voiced texts survive in
  the extraction).
- [TODO] Delivery quests — haul goods by cart between instances (perfect fit after Phase 20).
- [TODO] Alliance follow-ups: reputation fallout with the court, alliance-exclusive quests/rewards, a turncoat path.
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
- [TODO] **A real ladder — climb the walls, look out over the world** (requested 2026-07-29): checked
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
- [TODO] Taming: falcon companion (`snd054`).
- [TODO] Cooking depth beyond bread/cooked fish.
- [COMPLETE] ✅ **Unlockable crests** *(shipped 2026-07-19)* — went **account-level** instead of in-save:
  `data/crestUnlocks.ts` keeps unlocks in localStorage (`kk_crests`, like `kk_settings`), so jailing
  Cedric once on any save gives the Bull Sigil to every future hero. Five earned crests: Rampant Lion ←
  Paladin deed, Bull Sigil ← Cedric jailed, Storm Sigil ← duel win vs Storm, Broken Axe / Horned Sigil ←
  1st / 2nd full Sealed Crypt clear (the dungeon cosmetic loot). `checkDeeds` runs a derived sweep
  (deeds + lifetime `dungeonsCleared`), so pre-existing saves back-fill automatically; the creator greys
  locked tiles with 🔒 + unlock hint and skips them for default selection.
- [TODO] Dye recipes for new palette rows.

**Build system**
- [TODO] Functional doors/windows; enclosed-area detection → "your homestead is a fort!" buffs.
- [TODO] **Building-conferred villager attribute bonuses (RTS-style)**: certain placed buildings passively
  grant stat/capacity bonuses to villagers just by existing on the grid (e.g., a future storage/
  warehouse-type building boosting carry capacity), rather than requiring direct interaction. Genuinely
  new content and schema — no existing "kind → passive bonus" table to extend today. Closest precedents:
  guild membership's flat %-bonuses (`data/guilds.ts`, Woodsmen's Lodge/Miners' Brotherhood/Builders'
  Guild) and the affordance `effects` map (`NPC_AI_SPEC.md` §4.2), but that one only fires on active
  interaction, never proximity/existence. Cross-reference the enclosed-area buff line just above — both
  are "your build layout passively affects gameplay" ideas and probably deserve one coherent design pass
  together rather than two separate bolt-on systems. Phase 4's `carryCapacityOf()` (`game/data/
  attributes.ts`) ships with a stubbed `externalCapacityBonus()` hook (always 0 until this exists) ready
  for it once designed.
- [TODO] **Carrier item content (basket/cart)**: Phase 4.1 ships the `Villager.gear.carrier?: 'basket' | 'cart'`
  field and its `carryCapacityOf()` bonus (+4/+10) — real, live, testable by direct assignment. What it
  doesn't ship: how a player actually gets one. Needs two new `ItemId`s, a crafting recipe, Armory stock
  integration, a roster-panel equip/unequip toggle (mirroring the existing helmet/chestplate UI), and a
  worn-item visual mesh — `rig.joints.rightarm` is already `ResourceProp`'s (the carried resource itself)
  and `leftarm` is shields', so the visual needs a joint that doesn't collide with either.
- [TODO] **Real stockpile storage capacity**: today a stockpile is purely cosmetic — confirmed by reading
  `gameStore.ts` directly, it's only (a) a work-presence anchor for the trip timer and (b) flavor text in
  the delivery notification. `addItems()` writes straight into one global, uncapped `st.inventory` with no
  location or capacity check at all; there is no inventory-cap concept anywhere in the codebase. Worth
  building for real once Phase 5's haul-travel-time economy cost (5.8b) has shipped and had time to be
  felt — "unlimited storage + a real travel cost" may already read as correct on its own, or the capacity
  squeeze may be what makes stockpile *placement* (not just existence) matter. Needs its own design pass:
  a flat cap vs. one that scales per stockpile built, and what happens when storage is full (hard reject,
  waste the yield, or block further gathering until the player spends/sells). Would give Phase 5's
  `haul_to_deposit` `target_usable` consideration (currently just `isBuilt`, a placeholder) real teeth —
  "has room" instead of "exists."
- [TODO] Row-fill wall placement (drag a line), demolish-area tool, middle-mouse pan + Q/E aerial rotation.
- [TODO] Freeform placement mode (unsnapped position/rotation/scale — existing catalog pieces only).

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

**Companion trait trees (every villager's own mini skill tree):**
- `data/companionTraits.ts` — per-job pools (defender Shieldwall/Riposte/Longshot; gatherers
  +1-haul / double-side-goods / Swift Return; merchant Silver Tongue/Quick Deals; builder Steady
  Hands). One slot per 2 mastery levels in the current trade (defenders use combat level), chosen in
  the Roster, persisted on `Villager.traits`, stacking with innate attributes + mastery. Verified:
  Deep Cut lumberjack hauled exactly 3 wood.

*Follow-ups: attribute respec (gold), defender formations by loadout, courtiers watching duels.*

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
2. [TODO] **Phase 25 wave 2** — remaining verified oc-series set pieces, wall-connection
   snapping via `wallRole`/`canConnectAsWall`. [COMPLETE] Road pavement shipped (see L297/L71).
3. [TODO] **Phase 24 follow-ups** — per-defender orders, HUD order chip, deposit floaties, stall UI.
4. [TODO] **Instance-separation audit list** (Phase 23 doctrine) whenever a listed system is touched.
5. [TODO] Backlog alongside: trade-off perks, halberd/spear player weapons, armor tiers, dungeon follow-ups,
   delivery quests, attribute respec, dragonfire follow-ups above.

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
mc006→mc009→mc010 ladder. [TODO] `traits.minifig.isMountable` + `DEFAULT_MINIFIG_HORSE_MOUNT.json` seat
matrices for riding — still unread anywhere in the codebase.

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
- [TODO] Mount seat matrices (`DEFAULT_MINIFIG_HORSE_MOUNT.json` /
  `..._DRAGON_MOUNT.json`) and the four extra horse variants now copied in — confirmed still unread
  anywhere in the codebase.
- [COMPLETE] Non-minifig prop rigs, catapult arm — shipped: `lib/propRig.ts` + `ANIMATED_ROLES` loads the
  OBJ-preserved per-part rig and drives real catapult-arm/counterweight/flag/wheel rotation, wired into
  `Buildings.tsx` via `RiggedProp`/`hasAnimatedRig`. [TODO] Drawbridge, jail cell, ladder, and springboard
  are NOT in `ANIMATED_ROLES` and don't even exist as buildable catalog pieces yet — still render static
  (in effect: still to come, since they're not built at all).
- [TODO] `ORIENTATION_REGISTRY.json` per-asset eulers — real, available data, but still just a backstop
  nothing currently calls (nothing looks wrong enough yet to need it).
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

[TODO] **Suggested first slice**, if this is wanted: take ONE destination — the Far
Meadow is the emptiest and least entangled with existing quests — and make it
ownable end to end: a quest chain to earn it, a deed to close it, its own two
or three residents, its own labour, and a travel-board entry that shows it as
YOURS. That proves every seam (per-world villagers, per-world labour, per-world
quests, ownership in the save) against one place, and the other eight are then
data rather than architecture.

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

  **Wave 3 (template population) infrastructure landed 2026-08-03, position
  data still unverified — inert by design, not shipped as real content.**
  `scripts/prepare-assets.mjs` now also distills each template's real
  `asset_ref` groups (only ~5-15 per map genuinely resolve to a catalog id;
  the rest of a layout's groups describe meshes already baked into the
  diorama) into `src/game/data/mapPopulation.generated.json`.
  `TemplateWorld.tsx`'s `normalizeTemplateBake` now exposes its real
  recentring offset (`getBakeOffset()`) so anything placing content against
  this data shares the exact same origin as the visible mesh, not a second
  guess. New `TemplatePopulation.tsx` (mounted, generalizing
  `CourtDressing.tsx`'s pattern) reads both — but its `DEBUG_MARKERS` flag
  is **deliberately `false`**, because the coordinate transform itself is
  NOT verified: a live calibration pass found the lab applies a real
  -90°-about-X rotation to reach its own SW-corner/Z-up frame (confirmed via
  `PAK_ORIENTATION_CATALOG.json`'s `final_root_euler_deg` for the template
  entries), and a hand-derived inverse for the vertical axis produced an
  even WORSE result (a computed marker ~1200 world units up on a diorama
  only ~680 units tall) than the simpler direct-mapping fallback currently
  shipped. Neither is trusted — flip `DEBUG_MARKERS` to `true` locally and
  eyeball the rendered spheres against a known-correct reference (King
  Leo's own hand-placed `NPC_KING`, `game/data/world.ts`) before doing
  anything further here. This needs a real, patient empirical
  calibration pass (render, screenshot, measure, adjust, repeat), not
  another one-shot derivation.
- [TODO] **Option B of the workshop** (instruction-accurate builds): still needs
  LDraw models, Rebrickable inventories, and the manual PDFs. `ldraw/` holds
  only its README. Send one `.mpd` and the seam can be proved against it.

## Blocked on a decision or a pointer [TODO]
- [TODO] **The road's route vs. southward expansion.** Small change, but it wants one
  pass over the whole southern layout rather than a nudge.

## Unblocked, large, and not started [TODO]
These need no external data — they are simply big enough to want their own
block rather than being started at the end of a session.
- [TODO] **Per-world villager labour.** The empire's foundation: settlements have to
  work while the player is elsewhere, which means the tick becomes per-world
  rather than per-player-location. L66 just tied labour to proximity TO THE
  PLAYER, so that rule needs a per-settlement meaning first. Design this
  before anything else in the empire arc.
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

[TODO] **N76 · Quests and errands should pay GOLD as well as resources.** Right now
they pay materials only, which makes the deed ladder (and now village
purchase) hard to feed.

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

[TODO] **N79 · Enemies should come UP THE ROAD.** Bandits and raiders spawning in
their own places and travelling the road to the homestead — day or night, not
just after dark. The dragon stays as it is. This makes the road matter and
gives raids a direction to come from.

[TODO] **N80 · Guard shifts.** If raids can come by day, the watch cannot all sleep
by day. A per-defender shift setting — day watch, night watch — so the
garrison covers the whole clock. Supersedes L67's blanket "all defenders keep
the night shift".

[TODO] **N81 · The FPS hands are gesturing backwards.** Chopping bare-handed moves the
ARMS while the hands stay still; it should be the other way round — arms
relatively constant, hands doing the work. (L73's own remainder — the held
weapon poses — is done; this is the separate bare-handed/tool gesture.)

[TODO] **N82 · One readout for a target, not two.** There is a health bar AND a card
that repeats the health bar plus friend/foe plus distance. It should be a
single thing over the target's head. This is my own doing — K61 moved the card
to the head but left the older bar in place instead of folding them together.

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

[TODO] **Not done in this pass:** only the dragon is migrated. `raidStrength()` is
exported and ready, but `Enemies.tsx`'s raider spawning still uses its own
gate. Migrating it is the next step and must happen before two gating schemes
settle in — that is the failure this system exists to end.

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

[TODO] **Still open, found not invented:**
- [TODO] **Might/Craft/Wit trip bonuses don't reach the AI-driven haul path.** The old `tickVillagers` timer
  rolls a double-load chance off Might, side-goods off Craft, and a Wit-scaled bonus for merchants
  (`gameStore.ts`'s per-trip block) — `haul.ts`'s real `addItems()` call just grants `jobDef.perTrip`
  flat, no attribute rolls at all. Flagged in `haul.ts`'s own header comment and `PHASE_STATUS.md`'s
  5.8b row when it shipped, deliberately deferred rather than ported blind — the old formulas were
  written for a per-trip timer, not a per-node-visit loop, and need their own pass to decide what "a
  trip" even means now that gathering can span several nodes before a single haul.
- [TODO] **Stranded carrying.** If an AI-driven villager's sack is full and genuinely no stockpile is within
  `haul_to_deposit`'s query radius (40m), they're stuck: the intent-clearing fix stops them from visibly
  freezing (they fall back to the old walk-to-worksite cascade), but the resources they're already
  carrying are never deposited — there's no code path that hands carried goods to the legacy system.
  Confirmed real, not hypothetical: a live trace during this validation pass showed target nodes
  legitimately spawning 45-50m from home. A wider query radius or a periodic capacity-triggered
  re-query are the two obvious mitigations; neither is built.
- [TODO] **herb/fishing node kinds have no `job_match`.** `gather.ts`'s job_match only claims `tree`/`rock` for
  lumberjack/miner — an herbalist or fisherman job type would need to exist first (neither does today),
  so these node kinds sit permanently inert for the AI system. Content gap, not a bug.
- [TODO] **Farmplot gathering stays behind `FARMPLOT_GATHER_ENABLED = false`** (`gather.ts`) pending
  `PHASE_2_NAVIGATION_AND_GATHERING.md` §1.1's open design question (farmplots regrow on a timer, not a
  hit-count like trees/rocks — the existing `GatherAtNodeActivity` shape doesn't fit them as-is).
- [TODO] **AI-driven trip times are real-distance-bound, and that can be slow.** The old per-job timer granted
  a trip's yield on a fixed clock regardless of where the villager actually stood; the new reasoner
  walks a real path to a real node and back, so a poorly-placed homestead (nearest tree/rock 45-50m out)
  can make a single lumberjack/miner cycle take 150-200+ real seconds end to end — confirmed by direct
  trace, not assumed. Not a bug (the trip genuinely finishes, verified), but worth a deliberate call
  later: is "distance now has a real, felt cost" the intended balance change, or does target scoring
  want a stronger nearest-node bias than proximity alone gives it today.

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
- [TODO] **A named defender ("Beda") appears to change appearance/configuration discontinuously between
  standing at their guard post and "spawning."** Requested 2026-07-30 — repro/exact meaning still needs
  pinning down, logging what's already ruled out rather than a diagnosis. Checked the one obvious
  suspect first: both `Defenders.tsx` and `Villagers.tsx` derive a figure's look through the SAME shared
  `villagerConfig(villager)` (`villagerLooks.ts`) — so this is not a look-derivation mismatch between the
  two rendering paths (head/body donor, colors are consistent). Most likely candidates left, given
  `Villagers.tsx`/`Defenders.tsx` are two entirely separate component trees (confirmed elsewhere in this
  batch, re: the stale-nametag bug) with their OWN `RiggedFigure` mounts: (a) a loadout/equipment swap
  when a villager's station assignment changes (bare-handed vs armed reads very differently at a
  glance), or (b) a remount flash — switching which tree renders a given villager id can force a fresh
  `RiggedFigure` load from a default pose before its real config settles, reading as "changes complete
  configuration" for a frame or two. Needs a live repro (ideally a screenshot or a description of exactly
  when it happens — job change, day/night watch-shift handoff, recovering from downed) before it can be
  scoped as a real fix rather than a guess.
- [TODO] **The player's own standing figure doesn't hide in third-person while riding.** Found
  2026-07-30 while fixing the horse-riding sine-bob (above), not something that regressed from that fix
  — `PlayerAvatar.tsx`'s own `g.visible = !playerState.riding` line is untouched, original code. Live
  testing with `ridingState.active`/`playerState.riding` both confirmed `true` still showed the normal
  standing figure in a third-person screenshot, with the mounted horse mesh not visibly rendering in
  that same shot either. Not chased further this pass (out of scope, and the console-only test rig used
  to force riding state may not fully match what a real in-game mount does) — worth a real repro by
  hand, riding a real wild horse and swapping to third person, before diagnosing further.

## Bugs logged 2026-07-31, not yet fixed

- [TODO] **Bow-armed defenders snipe enemies from any distance, through walls — including from their
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
  `inRange`/`BOW_RANGE` computed but never actually consulted. There is no line-of-sight/raycast check
  anywhere in this branch either, so a wall between the defender and the target has never mattered. The
  outer bound isn't small: for the default `patrol`/off-duty order, `target` is picked from any enemy
  within `ENGAGE_RADIUS` (22m) of the DEFENDER'S OWN position (L147, L150) — easily most of the
  homestead interior — and for an explicit `attack` order, target selection is completely unbounded
  distance from the PLAYER (`bestD = Infinity`, L138-142), so an attacking bow defender can snipe
  anything anywhere near the player regardless of the defender's own location. Likely origin: `BOW_RANGE`
  reads like it was meant to replace `MELEE_RANGE` in the range check for bow-wielders (so they hold at
  a real distance instead of closing to melee), and the `&& loadout !== 'bow'` clause accidentally
  short-circuited the whole gate instead. A real fix needs the attack branch to re-check `inRange`
  (using `BOW_RANGE` for bow, `MELEE_RANGE` for melee) before dealing damage — currently the `else`
  branch fires unconditionally — plus a real line-of-sight check (a raycast against the same collision
  data `navgrid.ts`'s `collisionBoxesFor` already builds obstacle boxes from) before a ranged hit lands,
  which does not exist for defenders at all today (`Enemies.tsx`'s own ranged bandits, shipped
  2026-07-30, have the identical gap — `RANGED_RANGE`/hit-scan with no wall check either, worth fixing
  together).
- [TODO] **World layout: clear the whole north for kingdom expansion — forests to the south-west, the
  Herb Meadow to mid-west, rocks/iron further south-east/east, the pond further east.** Requested
  2026-07-31, directly superseding the six-way compass spread just shipped 2026-07-30 (`grounds.ts`,
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
- [TODO] **Extend the road network so it actually reaches each resource ground, not just the signpost.**
  Requested 2026-07-31, continuous with the layout redesign above ("we can continue using the roads to
  guide the npcs/user to each meadow/fenced area"). Today's road is ONE fixed, hand-authored route
  (`road.ts`'s `CELLS`, a short run from the homestead to `SIGNPOST` plus one branch) — it has never
  reached any of the six named grounds and wasn't designed to; the nav-cost preference shipped
  2026-07-30 (PR #110, `navgrid.ts`'s `roadMask`/`ROAD_STEP_MULT`) makes AI actors prefer whatever road
  exists, but there is nothing for it to prefer on the way to a ground today. A real fix branches `CELLS`
  (or generalizes it — the T-junction/corner/cross piece selection in `Road.tsx` already reads a 4-bit
  N/E/S/W mask per cell, `PIECES` in `road.ts`, so the piece-choosing logic doesn't need to change, only
  the route data) out to each ground's own entrance, and re-derives `distanceToRoad()`/`onRoad()`
  (`road.ts`, shipped 2026-07-30) from the same connected-segment walk once the route is bigger. Real
  design question raised but not answered by the request: does every ground get its own spur, or do
  spurs share trunk segments (cheaper to build/render, reads more like a real road network)? Worth
  deciding before implementation, not guessing at.
- [TODO] **A buildable, player-diggable pond/river/moat.** Requested 2026-07-31 ("we should be able to
  dig and make our own pond/river later on for waterway in our kingdom... like real kingdoms had with
  moats"). Confirmed there is currently NO terrain-modification mechanic of any kind — the only water
  body in the game is the single hardcoded `POND` (`world.ts`), declared as one static circle in
  `navTerrain.ts`'s `terrainExclusions` (`{id:'pond', shape:{kind:'circle',...}, traversal:'blocked'}`),
  read once by `navgrid.ts`'s obstacle-grid build and by `Terrain.tsx`'s pond mesh — nothing about it is
  data-driven from player action, and no buildable/placeable water piece exists in `buildables.ts`. A
  real fix needs, at minimum: a new placeable "dig water" tool or buildable category, a way to grow
  `terrainExclusions` (or a parallel player-water list navgrid also blocks/costs against) at runtime
  instead of a fixed array evaluated once, and real mesh rendering for an arbitrary player-shaped water
  body (today's pond is one fixed, hand-modeled circle — a general one needs either a flexible shape
  (circle/rect per placement, matching how `Ground`/terrain exclusions already support both shapes) or a
  full freeform system, a much bigger scope). Worth scoping as its own feature, not a quick add.
- [TODO] **Elevation/terrain height, per map quadrant.** Requested 2026-07-31 ("adding some elevation to
  our maps... elevating our map in quadrants"). The home world is flat by design today — confirmed
  (`Terrain.tsx`'s own comment: "Its ground sits at y=0... and the field is flat... so the flat-ground
  movement/collision assumptions hold unchanged") — every player-movement, building-placement, and
  nav-grid calculation on the home grid assumes `y=0` ground. A REAL height-field system already exists
  in the codebase, just not wired to the home grid: `NavGrid`'s `heights`/`rasterizeHeights`/`heightAt`
  (`navgrid.ts`, iteration 2.5) rasterizes real per-cell ground height from a mounted template's own
  geometry — but only for `mode: 'window'` (destination-world) grids; the home grid is `mode: 'fixed'`
  with no height field ever built (`this.heights` stays `null`, `ensureHeights()` no-ops for it). Making
  the home world non-flat is a large, cross-cutting change — collision/step-height logic
  (`PlayerController.tsx`'s `WALK_LOW`/`WALK_HIGH`/`STEP_UP`), every ground-position assumption in
  `gameStore.ts`'s node scatter and building placement, `navgrid.ts`'s own `maxStep` climb-check (already
  built for window grids, would need enabling for home), and NPC movement's own `y=0` assumptions
  (`Villagers.tsx`/`Defenders.tsx`/`Enemies.tsx` all `g.position.set(x, 0, z)` or a small fixed offset)
  would all need auditing — not a small follow-up, a real terrain overhaul. Worth prototyping on one
  quadrant before committing to all four, given the blast radius.
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

- [TODO] **Touch input can move/look/interact but cannot fight.** There's a real, working touch-control
  pass already in the codebase (not absent, as might be assumed) — `TouchControls.tsx` (a virtual
  joystick, a full-screen look-drag surface, Sprint/Jump/Interact buttons) feeding `touchState`
  (`game/touchInput.ts`), consumed by `PlayerController.tsx`'s `pollTouch()`. But
  `CombatController.tsx`'s attack/block/ranged-draw is strictly mouse-only (`mousedown`/`mouseup` on
  `gl.domElement`, checking `document.pointerLockElement`) with zero touch equivalent — a phone/tablet
  player today can walk around and interact with the world but cannot swing a sword, block, or draw a
  bow/crossbow at all. For a "mobile-friendly" push this is probably the single highest-priority gap:
  everything else is polish, this is a player who literally cannot fight.
- [TODO] **Gamepad support is partial and lives outside the rebindable keybind system.** `pollGamepad()`
  (`PlayerController.tsx`) covers move (stick/d-pad), look (right stick, analog), jump, interact (held),
  and sprint — confirmed nothing maps attack, block, ranged aim/draw, weapon-swap, or ANY menu/panel
  navigation (Inventory, Crafting, Quests, Build, Roster, etc. all stay keyboard-only per
  `game/data/keybinds.ts`, which has no gamepad-button concept at all — this is a second, hardcoded input
  path, not part of the same rebindable table keyboard uses). No `gamepadconnected`/`gamepaddisconnected`
  handling anywhere either.
- [TODO] **No input-mode-aware UI — every prompt assumes a keyboard.** Confirmed every on-screen prompt
  is hardcoded keyboard text unconditionally: `PlayerController.tsx`'s interact prompt builds literal
  strings like `"Hold E — {label}"`/`"Hold Click — {label}"`; `hud/Panels.tsx` hardcodes a
  `WASD move · Shift sprint · Space jump · E interact …` cheat-sheet. Nothing tracks which input device
  the player is actually using right now (no `inputMode`/`activeDevice` field anywhere in
  `appStore.ts`'s `Settings`), so there is no gamepad button-glyph prompt and no touch-appropriate prompt
  text — a controller or touch player sees keyboard instructions regardless.
- [TODO] **No PWA / installability support.** Confirmed no `manifest.json`/`manifest.webmanifest`
  anywhere in the repo, no service worker, no `apple-mobile-web-app-capable` meta tag — the game cannot
  be "added to home screen" on iOS/Android for a full-screen, app-like launch, which matters directly for
  the "iPhones, iPads, Androids" half of the request (a bookmarked browser tab reads very differently
  from an installed icon on a phone's home screen).
- [TODO] **Responsive layout is real but incomplete.** A genuine "mobile-friendly pass (2026-07-20)"
  already exists — confirmed, not absent: a viewport meta with `viewportFit: 'cover'`/`userScalable:
  false` (`app/layout.tsx`, explicitly to stop pinch-zoom fighting touch controls), one
  `@media (max-width: 720px)` breakpoint (`globals.css`) that rescales panels to `94vw`, reflows grids,
  and hides the keyboard cheat-sheet, and several panels already fluid outside that breakpoint
  (`.game-panel.menu-family { width: min(760px, 92vw) }`, the shell `VillagersPanel`/most big panels
  use). What's still missing: the touch joystick/button sizes are fixed px (`globals.css`, e.g. a 120px
  joystick base, 76px interact button) rather than viewport-scaled, so they eat a much bigger fraction of
  a small phone screen than a tablet; a couple of panels (`.panel`, base `.game-panel`) still carry a
  fixed `min-width` that's only overridden inside the one 720px breakpoint, not fluid by default.
- [TODO] **Touch input can move/look/interact but cannot fight.** There's a real, working touch-control
  pass already in the codebase (not absent, as might be assumed) — `TouchControls.tsx` (a virtual
  joystick, a full-screen look-drag surface, Sprint/Jump/Interact buttons) feeding `touchState`
  (`game/touchInput.ts`), consumed by `PlayerController.tsx`'s `pollTouch()`. But
  `CombatController.tsx`'s attack/block/ranged-draw is strictly mouse-only (`mousedown`/`mouseup` on
  `gl.domElement`, checking `document.pointerLockElement`) with zero touch equivalent — a phone/tablet
  player today can walk around and interact with the world but cannot swing a sword, block, or draw a
  bow/crossbow at all. For a "mobile-friendly" push this is probably the single highest-priority gap:
  everything else is polish, this is a player who literally cannot fight.
- [TODO] **Gamepad support is partial and lives outside the rebindable keybind system.** `pollGamepad()`
  (`PlayerController.tsx`) covers move (stick/d-pad), look (right stick, analog), jump, interact (held),
  and sprint — confirmed nothing maps attack, block, ranged aim/draw, weapon-swap, or ANY menu/panel
  navigation (Inventory, Crafting, Quests, Build, Roster, etc. all stay keyboard-only per
  `game/data/keybinds.ts`, which has no gamepad-button concept at all — this is a second, hardcoded input
  path, not part of the same rebindable table keyboard uses). No `gamepadconnected`/`gamepaddisconnected`
  handling anywhere either.
- [TODO] **No input-mode-aware UI — every prompt assumes a keyboard.** Confirmed every on-screen prompt
  is hardcoded keyboard text unconditionally: `PlayerController.tsx`'s interact prompt builds literal
  strings like `"Hold E — {label}"`/`"Hold Click — {label}"`; `hud/Panels.tsx` hardcodes a
  `WASD move · Shift sprint · Space jump · E interact …` cheat-sheet. Nothing tracks which input device
  the player is actually using right now (no `inputMode`/`activeDevice` field anywhere in
  `appStore.ts`'s `Settings`), so there is no gamepad button-glyph prompt and no touch-appropriate prompt
  text — a controller or touch player sees keyboard instructions regardless.
- [TODO] **No PWA / installability support.** Confirmed no `manifest.json`/`manifest.webmanifest`
  anywhere in the repo, no service worker, no `apple-mobile-web-app-capable` meta tag — the game cannot
  be "added to home screen" on iOS/Android for a full-screen, app-like launch, which matters directly for
  the "iPhones, iPads, Androids" half of the request (a bookmarked browser tab reads very differently
  from an installed icon on a phone's home screen).
- [TODO] **Responsive layout is real but incomplete.** A genuine "mobile-friendly pass (2026-07-20)"
  already exists — confirmed, not absent: a viewport meta with `viewportFit: 'cover'`/`userScalable:
  false` (`app/layout.tsx`, explicitly to stop pinch-zoom fighting touch controls), one
  `@media (max-width: 720px)` breakpoint (`globals.css`) that rescales panels to `94vw`, reflows grids,
  and hides the keyboard cheat-sheet, and several panels already fluid outside that breakpoint
  (`.game-panel.menu-family { width: min(760px, 92vw) }`, the shell `VillagersPanel`/most big panels
  use). What's still missing: the touch joystick/button sizes are fixed px (`globals.css`, e.g. a 120px
  joystick base, 76px interact button) rather than viewport-scaled, so they eat a much bigger fraction of
  a small phone screen than a tablet; a couple of panels (`.panel`, base `.game-panel`) still carry a
  fixed `min-width` that's only overridden inside the one 720px breakpoint, not fluid by default.
