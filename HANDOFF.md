# Knights' Kingdom — UI/UX handoff pack

**For:** Claude Opus working in VS Code on `D:\CODING\THREEJS\modern_knightskingdom` (and `…\knightskingdom` for extracted assets).
**From:** design work done in Omelette, project *Lego Knights Kingdom RPG Mockup*.
**Date:** 2026-07-25.

---

## 0 · Read this first

The mockups are the spec. They are two HTML files in the design project:

| File | What it holds |
|---|---|
| `Knights Kingdom UI — Brief.dc.html` | The system: color roles, houses, type scale, metrics, the 62-icon set, the 14-screen inventory, waves |
| `Knights Kingdom UI.dc.html` | The screens themselves, grouped in turns (newest at top) |

Turns inside the mockup file, each option addressable by id:

* **turn 1** — `1a` Metalheart Forge · `1b` Millennium Chrome · `1c` Aero Glass Realm · `1d` Guild Leather. Same HUD, four surface treatments. **All four approved.**
* **turn 2** — `2a` Equipment & Satchel · `2b` Crafting · `2c` Quest Log · `2d` Abilities · `2e` Homestead Roster · `2f` The Chronicle · `2g` Aerial Build View. Rebuilt from real screenshots.
* **turn 3** — front door + the screens that did not exist yet.
* **turn 4** — theme/palette directions to bind to the extracted textures.

Two support files ship with this doc:

* `handoff/kk-tokens.css` — every color, size, radius, shadow and the **four lane recipes** as real CSS classes. Import it once, globally. Never hard-code a hex in a component.
* `handoff/kk-icons.svg` — the whole icon set as one `<symbol>` sprite, 62 marks. This is the direct replacement for every emoji in the build.

---

## 1 · What the game is (established from screenshots + Credits)

* **Stack:** Next.js + React + Three.js + Node.js. So the UI is a **React DOM overlay above a WebGL canvas**, not canvas-drawn. Everything below assumes that.
* Original: *LEGO Creator: Knights' Kingdom* (LEGO Media, 2000), Superscape VRT 5.10. Models, palette, animations and sounds extracted from an owned copy; formats LCA/VCA, DPAK, XVR, SPRT, SOUN.
* **The world renders BRIGHT** — saturated green terrain, pale sky. This is the single most important visual fact. Opaque near-black panels read as holes punched in the game. Use **Aero Glass** (`.kk-c-panel`) for anything that floats over the world.
* Player identity string is `{rank} {name}` — e.g. *Peasant Wanderer* — plus `a humble villager · total level N` and an XP bar. Rank ladder runs Peasant → … → Squire → … → Paladin.

### Screens that exist
sign-in · main menu (Continue Journey / New Journey / Options / How to Play / Credits / Sign Out) · Forge Your Hero · Options · How to Play · Credits · first-person field HUD · Aerial Build View · six-tab panel.

### The six-tab panel — canonical order and keys
`Satchel (I)` · `Crafting (C)` · `Quests (J)` · `Abilities (K)` · `Roster (N)` · `Lore (L)`, with a close X at the right end. `H` opens How to Play. Keep this order and these keys everywhere; the mockups all use them.

### Data the UI already reads
* **Resources:** Wood Log, Plank, Stone, Brick, Coal, Iron, herbs, fish, gold.
* **Skills:** Woodcutting, Building, Combat, Farming (open) · Mining, Smithing, Fishing (quest-locked).
* **Attributes:** Might, Diligence, Craft, Courage, Wit — `+` spend, 1 point per total level.
* **Talents:** Timber / Brick / Battle / Field / Stone / Forge / Water Sense.
* **Callings:** Wanderer, Woodsman, Quarryman, Angler, Farmhand, Artisan, Smith's Prentice, Page.
* **Equipment:** weapon = Sword | Crossbow | Longbow · armor = Shield | Helm | Chestplate.
* **Armory/garrison:** Helmet, Chestplate, Sword, Shield, Crossbow, Halberd (Halberd is Sealed Crypt salvage only — no recipe).
* **Build categories:** Essentials 13 · Prefabs 2 · Defense 7 · Walls 19 · Bricks 26 · Windows & Decor · Towers & Roofs 37 · Blueprints. Sorts: Default / A–Z / Affordable, plus *Hide unavailable*.
* **Crafting stations:** By Hand, Workbench, Forge (locked), Campfire.
* **Quest chain (The Main Chronicle):** First Steps → Cozy Beginnings → Word from the River → Stone Age → Forge Ahead → An Audience at the Lists → Gone Fishing → Squire's Errand → Knight's Arms → The Royal Summons → Paladin's Keep. Region tags seen: The River Landing, The Tourney Grounds, The King's Approach.
* **Chronicle NPCs:** King Leo, Queen Leonora, Richard the Strong (11 lines total).
* **Controls:** WASD move · Shift sprint (costs stamina) · Space jump · click to lock mouse-look (arrows work) · hold **E** to gather · **B/Esc** exit build view · in build view: click place, click piece to move, **R** rotate, **U** undo, RMB remove, WASD pan, scroll zoom.

---

## 2 · What was wrong, and the rule that fixes each

| Problem | Rule |
|---|---|
| Emoji as iconography | One drawn set, `handoff/kk-icons.svg`. Every mark is 24×24, 1.7px stroke, `currentColor`, no internal gradients — so it recolors per rarity/faction/state for free. |
| Opaque black panels over a bright world | `.kk-c-panel` (Aero Glass) for anything over the render. Opaque only for full-screen modals (menu, hero forge, credits). |
| No secondary type scale under the gold serif | One family, six roles (§4). Period feel comes from letterspaced small-caps labels, not from a novelty face. |
| Equal-weight buttons everywhere | Exactly one primary per surface. Lane B primary = lime; lane C = green-outlined glass; lane D = brass; lane A = accent-outlined steel. |
| Dead ends (greyed *Missing* button) | Never disable without naming the blocker. Show *Need coal* + the exact have/need chip, and a detail rail that says what the recipe yields. |
| Empty states carrying copy but no structure | Show the grid/rows empty rather than replacing them with a sentence. Keep the sentence as a caption. |
| Bottom-of-screen collisions | The HUD bottom band is **one flow row**: `left:22px; right:22px; bottom:22px; display:flex; justify-content:space-between; align-items:flex-end`. Never position three clusters independently in the same 22px band. |

---

## 3 · Overlay architecture (React + Three.js)

```
<div id="game-root" style="position:fixed; inset:0">
  <canvas id="three" />                     <!-- z 0  -->
  <div class="kk-hud"      data-layer="hud"      />  <!-- z 10  pointer-events:none -->
  <div class="kk-world-ui" data-layer="world"    />  <!-- z 20  prompts, damage, toasts -->
  <div class="kk-panels"   data-layer="panels"   />  <!-- z 30  the six-tab panel -->
  <div class="kk-modal"    data-layer="modal"    />  <!-- z 40  menu, options, raid muster -->
  <div class="kk-toast"    data-layer="toast"    />  <!-- z 50  -->
</div>
```

Rules:

1. **`pointer-events: none` on every overlay layer**, re-enabled only on the individual interactive element (`.kk-interactive { pointer-events:auto }`). Otherwise the HUD eats mouse-look.
2. Mouse-look pointer lock must **release** when a panel opens and **re-acquire** on close. Drive that off one `uiMode` value: `'field' | 'panel' | 'build' | 'modal'`.
3. Keys are registered once, in a single `useKeyBindings` hook, and are **suppressed while a text input has focus** (the name field in Forge Your Hero, the two search fields).
4. Every HUD cluster is absolutely positioned from a **viewport edge**, never from another cluster. Safe inset `var(--kk-hud-inset)` = 22px.
5. `backdrop-filter` is the only expensive thing here. Budget: **at most 4 blurred surfaces on screen at once**. The Options *Quality Preset* should set `data-kk-quality="low"` on `#game-root`, which the token sheet already uses to swap blur for a flat tint.

### Suggested component tree

```
components/ui/
  KkIcon.tsx            <svg><use href={`#${name}`}/></svg>  — sprite injected once in _app/layout
  KkPanel.tsx           lane prop: 'metal' | 'chrome' | 'glass' | 'leather'
  KkTabBar.tsx          the six tabs + close; owns the key map
  KkBar.tsx             vital bar; props: role, value, max, lane
  KkSlot.tsx            52px slot; props: icon, count, rarity, state, lane
  KkChip.tsx            resource / cost chip; props: icon, value, affordable
  hud/
    VitalsCluster.tsx  CompassStrip.tsx  ObjectiveCard.tsx
    Hotbar.tsx         ResourceLedger.tsx  Minimap.tsx
    InteractPrompt.tsx (hold-E ring)  RaidBanner.tsx
  panels/
    SatchelPanel.tsx CraftingPanel.tsx QuestPanel.tsx
    AbilitiesPanel.tsx RosterPanel.tsx LorePanel.tsx
  screens/
    TitleScreen.tsx MainMenu.tsx ForgeYourHero.tsx
    OptionsScreen.tsx HowToPlay.tsx Credits.tsx
    BuildPalette.tsx RaidMuster.tsx DialogueScene.tsx
```

### Icon usage

Inject the sprite once (Next.js: read it at build time and inline into `app/layout.tsx`, or `dangerouslySetInnerHTML` a fetched string — do **not** `<img src>` it, `<use>` needs it in the document):

```tsx
export function KkIcon({ name, size = 20, className }: {name:string; size?:number; className?:string}) {
  return <svg width={size} height={size} className={className} aria-hidden><use href={`#${name}`} /></svg>;
}
// color it from the outside — the mark inherits currentColor:
<KkIcon name="k-coin" style={{ color: 'var(--kk-renown)' }} />
```

Emoji → icon mapping to do in one pass:

```
🎒→k-cuirass  🔨→k-hammer  📜→k-scroll  ⭐→k-star  👥→k-people  📖→k-book
🪓→k-axe      ⛏→k-pick    ⚔→k-swords  🛡→k-shield  ⛑→k-helm    🏹→k-crossbow
🔥→k-flame    🕯→k-torch   🛏→k-bed     🪵→k-log     🪨→k-stone   ⚒→k-anvil
🌿→k-herb     🐟→k-fish    🌻→k-flower  🌳→k-tree    🏰→k-keep    👑→k-crown
🧱→k-brick    🪟→k-window  🏭→k-forge   🛢→k-barrel  🌾→k-farm    🔒→k-lock
☀→k-sun      🌙→k-moon    ⚙→k-cog     ❓→k-book    ✋→k-hand    🖐→k-gauntlet*
```
\* `k-gauntlet` is in the Brief file's sprite only — copy it across if you need it.

---

## 4 · Type roles

| Role | Spec | Used for |
|---|---|---|
| Display | 44/700/−3% tracking | title plaque, main-menu wordmark |
| Screen title | 22–28 / 500 / +2–6% tracking | *Equipment & Satchel*, *Crafting* |
| Section label | 10–12 / 600 / **+18% tracking, uppercase** | WEAPON, SATCHEL, THE ARMORY |
| Body | 12.5–14 / 400 / 1.55 | quest text, tooltips, Chronicle lines |
| Item / row title | 13.5 / 500 | *Iron Sword*, *Wooden Fence* |
| Readout | 10–20 / 600–700 **tabular / mono** | 178/240, 2/5, 1,240, 0:38 |

Never below **12px** anywhere; never below **24px** in anything meant to be read at 1080p from a couch. Hit targets never below 44px.

If you keep the gold serif, change **only** `--kk-font-display` in `kk-tokens.css`. Everything else stays Inter so the small sizes stay legible.

---

## 5 · Screen-by-screen notes

Each note is *what changed and why*, so you can port intent rather than pixels.

### 5.1 Field HUD — `1a`–`1d`
Nine clusters, fixed positions: vitals TL · raid banner TC · compass+threat TR · objective card R · reticle + hold-E ring C · resource ledger BL (**`bottom:88px`**, above the hotbar line) · hotbar BC · minimap BR · toasts R-mid.
* Hearts → **one vigour bar with a numeric readout**. A row of 8 heart glyphs cannot show 178/240 and does not scale past 10.
* Compass strip is 250×30–34 with degree ticks and colored pips for objective (renown) and threat (taint). Player bearing is a 2px accent line at 50%.
* Hold-E is a `conic-gradient` progress ring around the tool icon + the verb (*Hew ashwood*). One element, no DOM churn per frame — animate the gradient stop via a CSS var.
* Hotbar: 8 slots, key digit top-left, count bottom-right, cooldown = dark overlay from the bottom + remaining seconds centred.
* Density prop: `full` | `combat` | `minimal`. Combat hides the ledger and minimap; minimal also hides the objective card.
* Reticle shows in first-person only.

### 5.2 Equipment & Satchel — `2a`
Paper doll left (drag to rotate, Standing/Running toggle). Weapon row and Armor row are **three named sockets each**, not padlocks: equipped socket gets the accent ring + its stat delta; owned-but-stowed reads *in satchel*; locked names the unlocking quest (*Knight's Arms*, *Forge Ahead*). 8×3 satchel grid, edible/drinkable items get the green edge you already describe in copy. Burden bar. Tooltip shows name, class+rarity, one line of flavour, weight and value.

### 5.3 Crafting — `2b`
Station tabs, search, sort (Default / A–Z / Craftable first), Hide unavailable. Each recipe row: icon, name + yield, **one chip per ingredient colored green/red for have/need**, action. Right rail (222px) = selected recipe: output preview, flavour, XP, time, and `×1 / ×5 / Max`. Footer states how many recipes are hidden by the filter.

### 5.4 Quest Log — `2c`
Keep your parchment, but make it structural: filter seg (Active / All incl. completed), collapsible chapter group with a count, the active quest as an expanded card (steps with progress bars, reward chips, one brass CTA *Show me the way*), then locked entries as quiet rows with region tags. Bottom fade signals scroll.

### 5.5 Abilities — `2d`
Seven skill rows: icon, name, level, XP bar, `143/200`. Locked rows name the quest. Five attribute cards with `+`. Talent tree is an actual **tree**: diamond nodes, connector lines, tier rows, a detail card at the bottom for the hovered node, and `2/3` rank pips.

### 5.6 Homestead Roster — `2e`
Villager cards: portrait, name, calling + join day, **chore selector** (Mine / Chop / Harvest / Fish / Guard), morale %, output/day, three loadout wells. Unarmed defenders get a warning ring and an *Arm me* affordance. Below: The Armory + Weapons wells with counts, wall integrity per segment, beds filled, and a *Sound the horn* muster action. Header carries the raid countdown.

### 5.7 The Chronicle — `2f`
Left rail = NPC list (recorded ones show line counts, locked ones name how to unlock). Right = the recorded lines as quote cards with day + place. Progress bar for `3/11`.

### 5.8 Aerial Build View — `2g`
Right palette 290px: search, 8 category chips **with counts**, sort seg, Hide locked, 3-up piece cards with cost chips colored against stock, and a pinned footer with the structures budget (`11/24`) and *next villager at 12*. The palette panel is `display:flex; flex-direction:column`; the card grid is `flex:1; min-height:0; overflow-y:auto; align-content:start` and the footer is last in flow. **`min-height:0` is mandatory** — a flex item defaults to `min-height:auto` and will refuse to shrink below its content, which pushes the footer past the panel edge (and `clip-path` then silently slices it). Do not absolutely position the footer. The control-hint strip is **left-aligned below the vitals cluster** (`left:22px; top:132px`), not centred in the top band. Do not centre it: the top band already has fixed clusters pinned at both edges (vitals `left:22px` w 214, palette `right:22px` w 290), leaving a ~334px corridor that a 450px key list cannot fit — so `left:50%; translateX(-50%)` slides under the palette, and centring within the world region slides under the vitals plate instead. **Rule: while a side panel is open, nothing in the HUD may be horizontally centred.** Anchor every cluster to an edge and stack downward. On the ground: grid plate + a **ghost piece** with accent ring showing valid placement, plus a floating *placing* readout with footprint and terrain requirement.

### 5.9 Title / Main menu / Forge Your Hero / Options / How to Play / Credits — turn 3
* Title: chrome plaque wordmark, one lime primary (*Enter the Kingdom*), guest path kept as a quiet secondary.
* Main menu: keep your six items in your order; add **save slots** (thumbnail, holdfast name, rank badge, chapter, day, structures, kin, gold). *Continue Journey* is the primary and shows the day.
* Forge Your Hero: all eight callings visible at once as a 4×2 grid, each with a one-word kit hint, and a parchment blurb for the selected one. Name, Gender, Face, body type, pose toggle.
* Options: group into Sound / Controls / Graphics / World / Keybinds; sliders get a value readout on the right; Quality Preset is a segmented control that also drives `data-kk-quality`.
* How to Play: numbered steps with a real screenshot per step — keep that, it is genuinely good; just put the thumbnails in a consistent 16:10 frame and make the step numbers a display size.
* Credits: keep every attribution exactly as written. It is a fan project; the preservation credit and the note about owning an original copy must stay.

### 5.10 New screens
* **Raid Muster** — the 20 seconds before a raid. Countdown, what is coming, garrison list with per-defender loadout and post assignment, wall integrity, *Sound the horn* / *Hide inside*. This is where the homestead loop pays off; without it the raid is just damage.
* **Dialogue & allegiance** — speaker plate, the verbatim line, 3–5 replies tagged by house, **consequence preview before you commit**, and a drift meter that animates on hover. Allegiance is proposed, not built (see Brief §02).

---

## 6 · Update hints — where to change what

| You want to change | Touch only |
|---|---|
| Any color | `kk-tokens.css` `:root`. Nothing else. |
| Health/stamina hue | `--kk-vigour` / `--kk-stamina`. They are OKLCH at a fixed lightness/chroma — change the last number (hue) and the weight stays balanced. |
| Back to the gold serif | `--kk-font-display` only. |
| Whole-UI look | swap the lane class on `KkPanel` (`metal`/`chrome`/`glass`/`leather`). Metrics are shared, so nothing reflows. |
| A new icon | add a `<symbol id="k-…" viewBox="0 0 24 24">` to `kk-icons.svg`: 1.7px stroke, `currentColor`, filled for materials, outlined for actions, no gradients. |
| HUD density | the `density` prop; do not delete clusters. |
| Perf trouble | Options → Quality Preset → `data-kk-quality="low"` (blur off). |
| Add a tab | `KkTabBar` key map + panel registry. Keep the existing six in order; append. |

### Do not
* Do not put two lane treatments on one panel.
* Do not add a second saturated accent. The four house hues are the only extra chroma.
* Do not use pure black or pure white — every value comes from the ramps (shadows excepted).
* Do not disable a control without naming the blocker.
* Do not reintroduce emoji.

---

## 7 · Still open

1. **Nobody has read the source.** Every field name above is inferred from screenshots. Bind the components to real types before building more screens.
2. **Textures not analyzed.** `…\resources\model_files\extracted\textures` and `…\extracted\pak_models\warehouse` were named but are not reachable from the design tool — they need to be uploaded/linked. Turn 4 of the mockups has drop-in texture wells waiting for them, and the theme palettes should be re-derived from the **real extracted global color palette** once available (the Credits screen says one exists — that palette should become the source of truth for `--kk-house-*` and the material tints).
3. **Allegiance/good-evil is a proposal**, not a mechanic yet. Decide whether it is per-faction standing or a single drift axis before wiring UI.
4. **Longbow, Chestplate, Forge, Mining, Smithing, Fishing** are all quest-gated in the screenshots — confirm the gates match the chain in §1.
5. Minimap is currently a plain square; the mockups assume a **shape per lane** (clipped, circular, rounded-glass, parchment-in-leather). Pick one and keep it.
