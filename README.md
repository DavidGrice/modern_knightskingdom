# Knights' Kingdom — Modern

A full 3D first-person progression game built with **Next.js, React, Three.js (React Three Fiber), Zustand and Node.js**, using assets extracted from *LEGO Creator: Knights' Kingdom* (LEGO Media, 2000) by the Knights' Kingdom decompilation project.

You start as a humble peasant and work your way up to Knight and Paladin: chop wood, craft, mine, smith, fish — and build your homestead from a campfire into a Grand Keep.

## Running

```bash
npm install
npm run prepare-assets   # copies models/sounds/palette from the extraction (path in scripts/prepare-assets.mjs)
npm run dev              # http://localhost:3000
```

`data/` (created at runtime) holds user accounts, sessions and server-side save games.

### This repository is source only

No game assets are committed. `public/assets/` — models, textures, sounds,
animations and rigs, all derived from the original 2000 title — is generated
by `npm run prepare-assets` from a local copy of the extraction, and is not
redistributable. A fresh clone compiles, but will not render anything
recognisable until that step has run against the source files. `data/`
(accounts, sessions, saves) and the UI design-pack deliverables are excluded
for the same kinds of reason. See `.gitignore`.

## Features

- **Auth stack** — register / sign in (scrypt-hashed passwords, HMAC-signed httpOnly session cookies, JSON-file store via Next API routes), or play as guest (localStorage saves).
- **Options stack** — volumes, mouse sensitivity, invert-Y, FOV, shadows (persisted).
- **Credits stack** — original game + preservation project acknowledgements.
- **Character creation** — assemble a minifig from the extracted OBJ models: choose Male or Female first, then pick your face and body type from labeled thumbnail grids (extracted head/torso textures per donor), and recolor arms/hands/legs/hips with the game's **global runtime palette** (extracted from `creator2000.pal`; the `glit0NN` materials index it — see FORMAT_SPEC §7). Any look is fair game, including royal faces — appearance never affects rank, which is earned purely through skills and quests. A Standing/Running toggle and drag-to-orbit preview let you actually look them over before committing.
- **Equipment paperdoll** — the Satchel (I) opens onto a rotatable, drag-to-orbit preview of your own equipped character with real weapon/shield slots: click Sword, Crossbow or Longbow to make it your active weapon (the same swap Q cycles through in the field, now a direct choice), see it update on the model immediately.
- **FPS world** — pointer-lock mouse look (plus arrow-key turning), WASD + sprint + jump, collision, footsteps, ambient bird/wind sounds from the original SOUN bank, original skybox.
- **Original animations** — the game's SMO animation tracks (walk, run, rest, greets, emotes, sword swings) drive a LEGO-faithful rig assembled from the extracted body parts (`src/lib/minifigRig.ts`); used by the creator preview, the third-person player avatar, and NPCs.
- **Third person & viewmodel** — V toggles a follow camera showing your own animated minifig; in first person a minifig arm holds the contextual tool (axe/pickaxe/rod/sword) with walk bob and swing.
- **Emotes** — G opens an emote wheel (wave, regal wave, cheer, ponder…) playing the original clips.
- **Day/night cycle** — a sun arc with dawn/dusk color grading, moonlight, stars, a tinted original skybox, and an HUD clock; day length is configurable in Options. Ambience switches from birds to owls at night.
- **Seasons** — a four-season cycle tints the grass and trees, slows winter crop growth, and lengthens winter nights.
- **Weather** — rain spells with particles, the original rain loop and lightning cracks; fish bite faster in the rain. Winter reskins the same spell as falling snow, and an independent misty-fog spell pulls visibility in close.
- **A living homestead** — court NPCs retire near the Keep at night and villagers head for the nearest bed, instead of standing frozen after dark.
- **Textured water** — the pond ripples with the original game's real caustic texture, tinted and gently animated, instead of a flat colored circle.
- **Torch & bed** — torches light the homestead at night; sleep in a bed after dusk to skip to dawn.
- **Wildlife** — horses wander and graze the west meadow, a falcon circles by day, bats swarm at night (all original models and sounds).
- **Farming & food** — build farm plots, plant wheat, watch it sprout and ripen gold, harvest for Farming XP, and bake bread at the campfire. Click green-edged food in your satchel (I) to eat it and restore hearts — crucial the night the raiders come.
- **Economy** — a traveling merchant parks his cart east of the homestead by day (green diamond on the minimap): sell your surplus wood, stone, fish and iron for gold, and buy planks, bolts, iron bars — or a whole crossbow. He's gone after dusk.
- **Market Stall** — build a permanent stall and assign a recruited villager as your Merchant: it opens the same buy/sell ledger as the traveling merchant, any hour of the day, and quietly turns a small passive gold trickle while staffed.
- **Blueprints** — pan the aerial build camera over a structure you've built and capture it as a named, re-stampable template (Build menu's Blueprints tab); stamp it elsewhere with a live per-piece placement ghost. Two starter blueprints (a gatehouse, a watch corner) ship built in.
- **Claim a template world** — while visiting one of the nine original dioramas, plant a claim flag to unlock a small building plot right there, leveled to the ground and usable with the full aerial build menu.
- **Keep taxation** — once you've raised the Grand Keep and have villagers, collect a periodic gold tax at the throne — a small ongoing income loop for the late game.
- **The Sealed Crypt** — a procedural dungeon, gated behind Knight rank (open the Travel Map for "Descend"): a fresh chain of stone chambers every visit, real corridors with real wall collision, skeletons/bandits to clear and Gilbert the Bad waiting in the boss room, paying out gold and materials on a full clear.
- **Deeds** — 12 achievements from "Timber!" to "Paladin of the Realm", awarded live with notifications and collected in a gallery inside the Abilities panel (K).
- **A village first, a royal court later** — the game opens as a small farm: two generic villagers (a farmer and a miller) are the only folk around at the start. King Leo, Queen Leonora, Richard the Strong and John of Mayne arrive in person one at a time as you complete their gating quest, so the realm's cast grows with your progress instead of greeting you all on day one. Once revealed, talk to them (E) for a dialogue panel with their original voice greeting and portrait; the queen, quartermaster and master-at-arms offer repeatable errands (gather, build, slay) for XP and supplies. The first time you meet Leo, Leonora or Richard, they open with a short voiced introduction — genuine lines of theirs pulled from the original game's 371-line challenge/tutorial voice-over bank, advanced with Continue or skipped outright — before settling into their regular flavor lines and errands for every visit after.
- **The Chronicle (L)** — every one-time voiced introduction you unlock (Leo, Leonora, Richard) is preserved verbatim in an in-game record, each line replayable on demand. A small archive of the original game's real voice-over bank, growing as you meet more of the realm's cast.
- **Villager recruitment** — grow your homestead (beds + total structures) and villagers wander in on their own to settle. Open the roster (N) to assign each one a job — Lumberjack, Miner or Farmer — and they'll periodically deliver wood, stone or wheat to your stores while they wander the grounds.
- **Castle interior** — once you've raised the Grand Keep, walk up to it and press E to step inside its furnished great hall: a real LEGO throne, crest banners, a banquet table with goblets, and a treasure chest (extracted from the original jousting-set model) that pays out a one-time gold reward and its own Deed. The hall is a permanent, sealed room — no walk-in door, so it can't be stumbled into except through the keep you built.
- **Walkable structures** — climb onto anything within a step (~0.55m): build brick staircases up your walls, stand on the battlements, and duck under raised pieces. Walk off the edge and you fall.
- **Horses & siege** — walk up to a wild horse and press E to ride it (Shift to gallop while stamina lasts, with the original canter sound). Build a quintain to train Combat (double XP from horseback) and a cannon that lobs stone rounds with splash damage at raiders (1 stone per shot) — and doesn't discriminate: any building caught in the blast takes real structural damage and collapses to a partial-materials rubble refund once its HP runs out.
- **Jousting duel** — gallop up to Richard the Strong on horseback and hold E to couch your lance: land it near his ideal ~2.2m reach for a glancing, solid or perfect hit, each worth more gold, Combat XP and standing with him. He staggers convincingly on a hit; a few seconds' recovery between passes.
- **Carts & battering ram** — the Battering Cart buildable becomes a pushable ram: press E to grab it, walk it into a shut gate to splinter it open (or into any other structure for real damage). The Blade Cart can instead be hitched to trail behind you wherever you walk, for easily relocating it.
- **Reputation** — Queen Leonora, Richard the Strong and John of Mayne each track standing with you, raised by completing their errands (and, for Richard, jousting). Climbing through personal titles — shown right in their dialogue panel — pays a small gold bonus each tier.
- **Gatehouse** — build a gate and press E to toggle it: the original portcullis lattice model slides up into its housing while a ground-hinged wooden drawbridge swings flat to form a ramp; shut it and both the lattice and drawbridge seal the opening, blocking you and raiders alike.
- **Travel to the original worlds** — a signpost near spawn opens a map of the nine original 2000-game template dioramas (village dock, tourney grounds, a rival castle, a snowy pass and more), each a merged bake of the real placed geometry. Travel teleports you there for a one-time thematic reward (a mining bonus in the ruins, coin along a procession road…) and back home again.
- **Combat** — hearts and stamina, melee swings (craft the sword for real damage), shield blocking, skeletons rising at night that crumble at dawn, bandit raids at dusk once your homestead is established, and defeated minifigs popping apart into their bricks. Combat is its own XP skill. Gilbert the Bad leads most raids himself (halberd in hand, his own voice), with Weezil among the ranks — and once Cedric's forest camp is known, there's a real chance he leads the raid in person instead, a boss-strength fight right at your gate.
- **Raiders bring a ram** — some raids arrive with their own battering ram, trundling straight for your nearest shut gate (or the heart of your homestead if you haven't built one) and smashing through whatever it reaches, the same way your own pushable cart can.
- **Battlements matter** — fire a crossbow or longbow from on top of a wall or tower and it hits harder, with a HUD readout confirming the bonus. Height is a real combat choice during a raid, not just a better view of one.
- **Villagers duck for cover** — the moment a raid begins, every recruited villager drops what they're doing and runs for home instead of wandering through the fight obliviously.
- **Cedric the Bull's Forest Camp** — a discoverable, gated location deep in the woods once you've earned your knighthood: Gilbert and Weezil stand guard, and Cedric himself is the game's capstone boss fight (grounded in the original game's own lore — "we'll soon have Cedric safely behind bars"). Beat him — whether at his camp or leading a raid on your homestead — and he's left jailed for good, plus a one-time reward and Deed.
- **Princess Storm's Battle Dome** — a dedicated small arena where you can challenge the Queen's daughter to a duel-to-first-hit (her mother's own line: "few can match her skills with a sword"). Land the first blow or take one — no lasting harm either way — and build standing with her over repeat matches, which get tougher to win rather than just costing more health.
- **Original models first** — the torch is the game's real standard-pole model, the quintain is the original rotating-axes training machine, and the build menu includes the extracted wooden fence, palm plant and two war carts. Your sword and shield are both King Leo's actual molds (the shield carries his real lion crest), the crossbow viewmodel is the original crossbow piece, and bandits raid with the real halberd — all pulled from the armed minifig models at runtime. Procedural geometry survives only where the 2000 extraction has no equivalent (boulders, campfire, forge, bed, axe/pickaxe/rod).
- **Visible equipment** — once you own them, the sword hangs at your knight's hand and the shield rides the left arm in third person; blocking (RMB) raises the shield across your view in first person. Every recipe in the game is always listed in the crafting panel — locked ones show 🔒 and what unlocks them.
- **Armor** — an Iron Helm (Cedric the Bull's own horned helm mold) and an Iron Chestplate, forged once you know Smithing, each passively reduce incoming damage — stacking on top of a shield block, not replacing it.
- **Alchemy** — forage wild herb patches through the forest and brew them at the campfire into a Healing Draught, a Stamina Draught, or a Night-Vision Brew that brightens the world after dark — all drunk straight from the satchel (I) like food.
- **Fishing, for real** — cast your line (hold E), wait for a bite (faster in the rain), then react to the "Bite!" prompt before the timer runs out — miss it and the fish gets away.
- **Tool wear & repair** — the axe, pickaxe, fishing rod and sword wear slowly with use; once worn they just work slower or hit softer, never breaking outright, and the Crafting panel (C) shows a Repair option at the workbench for a fraction of the original cost.
- **Rank-up perks** — becoming a Laborer, Squire, Knight or Paladin offers a real choice among five permanent passives (extra stamina, faster crops, slower tool wear, bonus XP, or more damage reduction) — only four rank-ups exist, so no single playthrough can take them all.
- **Crossbow & longbow** — craft either at the workbench once you know Smithing. Q cycles melee → crossbow → longbow. The crossbow (+ bolts) looses instantly on LMB with RMB zoom; the longbow (+ arrows, wood alone — no forge needed) is a hold-and-release draw, weak or rejected if released too early, full power and damage at a ~1.1s full draw. The HUD tracks whichever quiver is loaded and shows a draw meter for the bow.
- **Minimap** — top-right HUD map with player arrow, resources (iron veins in rust), buildings, enemies in red, King Leo, pond and the build region; M enlarges it.
- **Iron veins** — dark rust-flecked boulders east of the stone field guarantee iron ore once Mining is learned.
- **Build menu 2.0** — category tabs (Essentials / Defense / Walls / Bricks / Windows & Decor / Towers & Roofs) with search across 153 pieces, including 133 original workshop pieces (bricks, wall sections, arches, towers, roof slopes, tiles, trim) at true LEGO proportions with their original thumbnails. Pieces stack vertically with support rules and 3D collision; bricks snap to a stud-pitch sub-grid; the placement ghost rotates (R) exactly like the real piece will. Click a placed piece to move it, U to undo.
- **Skills & ranks** — Woodcutting, Building, Mining, Smithing, Fishing with XP levels; total level drives rank: Peasant → Laborer → Squire → Knight → Paladin. Crossing into Knight or Paladin triggers a short scripted ceremony: movement freezes, you're teleported before King Leo in third person, he draws his sword and congratulates you (`anim_r_gesturepullsword` / `anim_r_congratulate`) while you answer with a regal wave, under a gold ceremony banner — then control returns and the rank sticks for good.
- **Quest chain** — 8 quests from "First Steps" to "Paladin's Keep"; quests unlock abilities (mining, smithing, fishing) and buildables.
- **Gathering & crafting** — chop trees / mine boulders / fish the pond (hold **E**); craft by hand or at stations you build (workbench, forge, campfire).
- **Aerial build mode** (**B**) — top-down orthographic camera, grid-snapped placement with green/red validity ghost (region bounds + AABB collision + material costs), rotate with **R**, right-click to demolish (half refund). Structures use the original castle wall / tower / gate / keep models.
- **Persistence** — autosave every 20s to the server (or localStorage for guests); continue from the main menu.
- **How to Play** — a screenshotted new-player guide (Main Menu, or press H mid-game) covering character creation, controls, gathering, crafting, quests, building and combat readiness.
- **Keybind remapping** — every gameplay key is rebindable in Options (press-to-set), with a one-click reset to defaults.
- **Stats page** — lifetime playtime, distance traveled, resources gathered, enemies defeated and buildings placed, from the pause menu.
- **Photo mode** — P frees the camera to fly anywhere, collision-free, with the HUD tucked away for a clean shot.
- **Accessibility & graphics settings** — Low/Medium/High quality presets and a colorblind-friendly minimap palette, alongside the existing volume/sensitivity/FOV/shadow options.
- **Gamepad support** — a standard-mapping controller's sticks and face buttons drive movement, look, jump, interact and sprint alongside the keyboard.

## Controls

| Key | Action |
|---|---|
| WASD / Shift / Space | move / sprint / jump |
| Mouse (click to lock) or ← → ↑ ↓ | look |
| E (hold) | chop / mine / fish / talk / use station |
| V | toggle first / third person camera |
| LMB / RMB | attack / block with shield (melee) · fire / aim (crossbow) |
| Q | swap melee ↔ crossbow |
| M | toggle minimap size |
| N | homestead roster (assign villager jobs) |
| L | the Chronicle (collected NPC lore) |
| G | emote wheel (original minifig animations) |
| I / C / J / K | inventory / crafting / quests / skills |
| B | aerial build mode |
| H | How to Play guide |
| P | photo mode (free-fly camera, HUD hidden) |
| Esc | close panel · leave build mode · pause menu |

All bindings above are rebindable in Options → Keybinds.

## Architecture

```
src/
├── app/               Next.js app router + API routes (auth, save)
│   └── api/           Node backend: scrypt auth, HMAC sessions, JSON saves
├── components/
│   ├── stacks/        screen stacks: Auth, MainMenu, Options, Credits, CharacterCreator, GameScreen
│   ├── world/         GameWorld, Terrain/Sky, ResourceNodes, Buildings, Npc, PropModel
│   ├── fps/           PlayerController (pointer lock, movement, collision, interactions)
│   ├── build/         BuildController (aerial camera, grid ghost placement)
│   └── hud/           HUD, Panels (inventory/crafting/quests/skills), BuildBar
├── game/
│   ├── data/          items, recipes, quests, buildables, ranks, minifigs, world layout
│   ├── store/         zustand stores (app/navigation/settings + game state & systems)
│   └── types.ts
└── lib/               minifig assembly (OBJ part classification + palette recolor),
                       audio manager, save persistence, server db/session helpers
```

Content is data-driven: new items, recipes, quests and buildables are added in `src/game/data/` without touching systems code. All extracted models are normalized at load (the exporter keeps model-up along −Y; props are flipped upright, scaled to a target height and grounded).

## Legal

Superscape VRT © Superscape VR plc. LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize, or endorse this project. Non-commercial fan preservation effort.
