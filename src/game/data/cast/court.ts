// CLN-21 · the royal court, moved verbatim out of data/npcs.ts's NPCS array (roster.ts reassembles it in order).
import { resolveDestPoint, WORLD_DESTINATION_BY_ID } from '../worlds';
import type { NpcDef } from './types';

export const COURT_NPCS: NpcDef[] = [
  {
    id: 'king',
    name: 'King Leo',
    title: 'Sovereign of the Realm',
    config: {
      name: 'King Leo', headDonor: 'minifigkingleo00', bodyDonor: 'minifigkingleo00',
      armColor: 26, handColor: 18, legColor: 38, hipColor: 38,
    },
    // Phase 20: the King holds court at his own castle — The King's Approach
    // (template-01). The travel landing (~1000, 888) is a steep hillside;
    // the court stands on the flat ground past it (terrain-probed y≈5), so
    // the walk up really is the king's approach.
    // 2026-08-25: x/z converted to a durable LOCAL point via resolveDestPoint
    // (worlds.ts) — local (0, -253.333), derived from the pre-halving world
    // position (1000, 962) via that function's own invariant. Must stay in
    // sync with world.ts's NPC_KING, which uses this exact same call.
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-01'], 0, -253.333), yaw: Math.PI,
    world: 'template-01',
    // Wave 53 (E5) · the court holds by day; see NpcDef.courtHours' own doc.
    courtHours: true,
    greetSound: 'greeting_king',
    portrait: '/assets/minifigs/minifigkingleo00.png',
    lines: [
      'Serve the realm well and you shall be knighted! Your quest log (J) marks the path.',
      'A kingdom is built one brick at a time. Yours is coming along nicely.',
      'The night grows dangerous of late. Walls, torches and a strong arm will see you through.',
    ],
    loreLines: [
      { text: 'I am King Leo. Do you like my castle? Richard tells me you want to become a knight.', sound: 'lore_leo_castle' },
      { text: "My land is a wonderful place, but for Cedric and his gang. He's always trying to get his hands on my Kingdom... and his bottom on my throne!", sound: 'lore_leo_cedric1' },
      { text: 'For now though, Cedric still lives in the woods!', sound: 'lore_leo_cedric2' },
      { text: 'Did you keep up alright? Good! Right! I want to introduce you to the evil Cedric the Bull.', sound: 'lore_richard_cedric' },
    ],
    revealAfterQuest: 'knights_arms',
    // kingdom-scale levies, befitting the crown's own seat (Phase 20 4b)
    sideQuests: [
      // Wave 34 (G6.8) · both used to be `kind: 'gather'`, but iron_bar/
      // bread are craft-only recipe outputs (recipes.ts) — the raw-harvest
      // path that feeds a `gather`-kind counter (gameStore.ts) never
      // produces either, so neither objective could ever actually complete.
      // Every craft already bumps `kind: 'craft'` counters with
      // `target: recipe.id`, which equals these targets exactly — a pure
      // relabel, no new wiring.
      {
        id: 'k_iron_levy', kind: 'craft', target: 'iron_bar', need: 3,
        label: 'The crown levies 3 iron bars for the armory',
        xpSkill: 'smithing', xp: 40, rewardItems: { gold: 22 },
      },
      {
        id: 'k_feast', kind: 'craft', target: 'bread', need: 3,
        label: 'Provision the royal table with 3 loaves',
        xpSkill: 'farming', xp: 30, rewardItems: { gold: 16 },
      },
    ],
  },
  {
    id: 'queen',
    name: 'Queen Leonora',
    title: 'Patron of the Homestead',
    config: {
      name: 'Queen Leonora', headDonor: 'minifigqueenleonora00', bodyDonor: 'minifigqueenleonora00',
      armColor: 24, handColor: 18, legColor: 150, hipColor: 24,
    },
    // beside the King at the royal castle (Phase 20)
    // 2026-08-25: converted to a durable LOCAL point via resolveDestPoint —
    // local (33.333, -246.667), derived from the pre-halving (1005, 963).
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-01'], 33.333, -246.667), yaw: Math.PI,
    world: 'template-01',
    // Wave 53 (E5) · the court holds by day; see NpcDef.courtHours' own doc.
    courtHours: true,
    greetSound: 'greeting_queen',
    portrait: '/assets/minifigs/minifigqueenleonora00.png',
    lines: [
      'A homestead should be beautiful as well as strong, don’t you agree?',
      'Fresh flowers brighten even the darkest keep.',
    ],
    loreLines: [
      { text: "You've met my husband. He can be a bit pompous you know! A fine king though!", sound: 'lore_queen_husband' },
      { text: 'I am Queen Leonora and I advise Leo on tactics.', sound: 'lore_queen_self' },
      { text: 'Have you met my daughter Princess Storm? Maybe later. Few can match her skills with a sword.', sound: 'lore_queen_daughter' },
    ],
    repTitles: [
      { min: 0, title: 'Patron of the Homestead' },
      { min: 30, title: 'Friend of the Court' },
      { min: 80, title: 'Trusted of the Queen' },
      { min: 160, title: 'Confidante of the Crown' },
    ],
    revealAfterQuest: 'squires_errand',
    sideQuests: [
      {
        id: 'q_flowers', kind: 'gather', target: 'flowers', need: 2,
        label: 'Gather 2 bundles of wildflowers for the court',
        xpSkill: 'woodcutting', xp: 30, rewardItems: { plank: 4, gold: 8 },
      },
      {
        id: 'q_decor', kind: 'build', target: 'flowerbed', need: 2,
        label: 'Plant 2 flower beds around the homestead',
        xpSkill: 'building', xp: 45, rewardItems: { stone: 4, gold: 16 },
      },
      {
        id: 'q_barrels', kind: 'build', target: 'barrel', need: 2,
        label: 'Set out 2 storage barrels for the pantry',
        xpSkill: 'building', xp: 40, rewardItems: { flowers: 2, gold: 14 },
      },
    ],
  },
  {
    id: 'richard',
    name: 'Richard the Strong',
    title: 'Master-at-Arms',
    config: {
      name: 'Richard', headDonor: 'minifigrichardstrong00', bodyDonor: 'minifigrichardstrong00',
      armColor: 34, handColor: 18, legColor: 38, hipColor: 34,
    },
    // Phase 20: Richard keeps the lists at The Tourney Grounds (template-02,
    // lands at ~(1300, 877.5)) — jousting happens on his own field now
    // 2026-08-21: repositioned from (1300, 888) after DEST_WORLD_SCALE's
    // research-spike halving (worlds.ts) — the old spot now sits 42 units
    // outside the real walkable rect union (templateWalkableFootprint.ts).
    // Nearest-point-in-union + 3-unit inward nudge, live-verified (teleport
    // lands exactly here, real ground height, still the tourney field near
    // the jousting props/castle).
    // 2026-08-25: converted to a durable LOCAL point via resolveDestPoint —
    // local (0, -446.667), derived from the 2026-08-21 world position above.
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-02'], 0, -446.667), yaw: Math.PI,
    world: 'template-02',
    greetSound: 'greeting_richard',
    portrait: '/assets/minifigs/minifigrichardstrong00.png',
    lines: [
      'A knight trains every day. The quintain never complains!',
      'Skeletons fear a ready blade. Be that blade.',
    ],
    loreLines: [
      { text: "Greetings! I am Richard the Strong, and I welcome you to LEGO Creator Knights' Kingdom.", sound: 'lore_richard_greet' },
      { text: "Don't worry. I'll be here to help you throughout.", sound: 'lore_richard_reassure' },
      { text: "I'll introduce you to some friends and foes along the way!", sound: 'lore_richard_friendsfoes' },
      // I42 · the line that used to sit here — "Did you keep up alright? …
      // the evil Cedric the Bull" — is KING LEO's voice, not Richard's. It
      // was playing in Richard's run with his portrait over it. Moved to Leo,
      // where the recording actually belongs.
      { text: 'Farewell, my good Knight!', sound: 'lore_richard_farewell' },
    ],
    repTitles: [
      { min: 0, title: 'Master-at-Arms' },
      { min: 30, title: 'Sparring Partner' },
      { min: 80, title: 'Richard’s Trusted Blade' },
      { min: 160, title: 'Champion of the Yard' },
    ],
    revealAfterQuest: 'forge_ahead',
    sideQuests: [
      {
        id: 'r_slay2', kind: 'kill', target: 'any', need: 2,
        label: 'Defeat 2 of the creatures that stalk the night',
        xpSkill: 'combat', xp: 60, rewardItems: { iron_bar: 1, gold: 14 },
      },
      {
        id: 'r_slay4', kind: 'kill', target: 'any', need: 4,
        label: 'Drive back 4 raiders or skeletons',
        xpSkill: 'combat', xp: 120, rewardItems: { iron_bar: 2, gold: 24 },
      },
      // location-bound (Phase 20 4b): landing a joust pass is only possible
      // here at his own Tourney Grounds
      {
        id: 'r_lists', kind: 'joust', target: 'any', need: 3,
        label: 'Land 3 solid passes at the lists',
        xpSkill: 'combat', xp: 90, rewardItems: { gold: 18 },
      },
      // Wave 25 · Tam's recruitment errand — gated on actual knighthood
      // ('knights_arms', the real knighting moment: see data/quests.ts),
      // not merely on Richard being revealed. `need: 2` matches r_slay2's
      // own precedent, the smallest kill count already offered here — a
      // recruitment quest should read as a real, short proving errand, not
      // a multi-stage saga.
      {
        id: 'r_squire', kind: 'kill', target: 'any', need: 2,
        needsQuest: 'knights_arms',
        label: 'Prove you can lead as well as fight — put down 2 more foes',
        xpSkill: 'combat', xp: 70, rewardItems: { gold: 20 },
      },
    ],
  },
  {
    id: 'john',
    name: 'John of Mayne',
    title: 'Quartermaster',
    config: {
      name: 'John', headDonor: 'minifigjohnmayne00', bodyDonor: 'minifigjohnmayne00',
      armColor: 30, handColor: 18, legColor: 38, hipColor: 38,
    },
    // 2026-08-25: moved from The River Landing (template-03) to The King's
    // Approach (template-01), alongside King Leo and Queen Leonora. Found
    // during this pass's DEST_WORLD_SCALE research spike by checking the
    // real Grok cast data directly (reports/rigs/template-01_PARTS.json's
    // own "cast" list, and template_01_layout.json's groups): John's donor
    // family (minifigjohnmayne) is real cast on template-01, clustered
    // tightly with King Leo and Queen Leonora — it never appears on
    // template-03 at all. His river-landing posting was never grounded in
    // the source game's own data.
    //
    // x/z: John's real cast-row position (mapPopulation.generated.json,
    // resolved through the live bake pipeline) lands ~208 world units from
    // the King/Queen's actual court — the same "distant marching-procession
    // backdrop marker" category TemplatePopulation.tsx's own header comment
    // already documents for King Leo's own procession figure, not a usable
    // interactive stand-point. So per that same file's convention, this is a
    // hand-picked spot instead: (997, 968) at the live 0.075 scale — same
    // walkable rect as King/Queen, same ground height as King's own spot,
    // ~5-7 units from each of them (matching their own ~5-unit spacing).
    // Converted to the durable LOCAL form every other entry in this file
    // uses — local (-40, -426.667) — via worlds.ts's toDestLocalPoint, since
    // this point was captured fresh at the current scale rather than
    // inverted from an older literal (see worlds.ts's own 2026-08-25
    // comment for why that's the one other exception besides template-03's
    // new arrival spawn).
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-01'], -40, -426.667), yaw: Math.PI,
    world: 'template-01',
    greetSound: 'greeting_john',
    portrait: '/assets/minifigs/minifigjohnmayne00.png',
    lines: [
      'The stores always want for more. Wood, stone, fish — bring what you can.',
      'An army marches on its stomach, and a kingdom builds on its warehouse.',
    ],
    repTitles: [
      { min: 0, title: 'Quartermaster' },
      { min: 30, title: 'Reliable Supplier' },
      { min: 80, title: "John's Right Hand" },
      { min: 160, title: 'Warden of the Stores' },
    ],
    revealAfterQuest: 'cozy_beginnings',
    sideQuests: [
      {
        id: 'j_wood', kind: 'gather', target: 'wood', need: 6,
        label: 'Deliver 6 wood logs to the stores',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { stone: 3, gold: 10 },
      },
      {
        id: 'j_fish', kind: 'gather', target: 'fish', need: 3,
        label: 'Catch 3 fish for the kitchens',
        xpSkill: 'fishing', xp: 50, rewardItems: { plank: 5, gold: 14 },
      },
      {
        id: 'j_planks', kind: 'craft', target: 'plank', need: 6,
        label: 'Mill 6 planks for the carpenters',
        xpSkill: 'woodcutting', xp: 40, rewardItems: { flowers: 1, gold: 12 },
      },
    ],
  },
  {
    id: 'storm',
    name: 'Princess Storm',
    title: 'Blade of the Battle Dome',
    config: {
      name: 'Princess Storm', headDonor: 'minifigprincessstorm00', bodyDonor: 'minifigprincessstorm00',
      armColor: 24, handColor: 18, legColor: 150, hipColor: 24,
    },
    // stationed at her own small arena — grounded in Queen Leonora's own
    // line: "Have you met my daughter Princess Storm? ... Few can match her
    // skills with a sword." (c1s04t4c.txt) — see BattleDome.tsx. Phase 20:
    // the dome (and she) reside at The Sister Keep now.
    // 2026-08-25: used to be computed relative to BATTLE_DOME (world.ts) —
    // `BATTLE_DOME.x, BATTLE_DOME.z + BATTLE_DOME.radius - 2`, standing just
    // inside its edge (7 of the ring's 9-unit radius out from center).
    // Converted instead to her own durable LOCAL point — local
    // (0, -253.333), derived from her pre-halving world position (2500,
    // 962) — matching how every other fixed NPC in this file is now stored.
    // Live-verified: she still lands inside the ring (real ground, distance
    // to the walkable union is 0), but only 3.5 units out from BATTLE_DOME's
    // center now, not 7 — a real, checked side effect of switching from a
    // dome-relative FORMULA (whose `+ radius - 2` term is a fixed WORLD-unit
    // offset, unaffected by scale) to a LOCAL point (whose distance from any
    // other local point in the same destination shrinks along with
    // DEST_WORLD_SCALE, same as everything else stored this way — see
    // worlds.ts's own 2026-08-25 comment on why that's still exactly
    // correct for staying inside real walkable ground, just not for staying
    // a fixed WORLD-unit distance from a fixed-size prop like the dome).
    // Reads as "posed near the middle of her own small ring" rather than
    // "leaning against its wall" — a real visual change, not a bug — kept as
    // the research's own recommended value rather than re-tuned by hand,
    // since nothing here actually requires the edge-hugging blocking.
    //
    // Wave 56 (F3): relocated again, onto the far end of the new duel bridge
    // (BattleDome.tsx's oc6095b5/oc6095b4) — local (0, -324.667), so the
    // challenger now visibly crosses the bridge to reach her instead of
    // finding her a step inside the gap. `yaw` stays Math.PI (NOT flipped to
    // 0): confirmed live against both PlayerController's own "yaw 0 looks
    // -Z" comment and Npc.tsx's own desired-facing formula
    // (`atan2(-dx,-dz)`, which gives yaw=Math.PI for a +Z-facing target) that
    // yaw=Math.PI is what makes her face +Z — i.e. still toward the entrance
    // gap/bridge, same direction as before the move, just from the opposite
    // end of it now. Distance-to-walkable-union re-confirmed live at this
    // exact new point (0.000 drift on teleport) rather than left as the
    // prior pass's own open residual check.
    ...resolveDestPoint(WORLD_DESTINATION_BY_ID['template-06'], 0, -324.667), yaw: Math.PI,
    world: 'template-06',
    greetSound: 'greeting_storm',
    portrait: '/assets/minifigs/minifigprincessstorm00.png',
    lines: [
      "My mother talks up my swordplay to every traveler who'll listen. Care to see for yourself?",
      'First blood wins here — no grudges, win or lose.',
      'Richard trains knights for the battlefield. I train them for the single, decisive moment.',
    ],
    repTitles: [
      { min: 0, title: 'Blade of the Battle Dome' },
      { min: 10, title: 'Worthy Opponent' },
      { min: 40, title: "Storm's Rival" },
      { min: 100, title: "Storm's Equal" },
    ],
    // no first-person lines survive for her in the 371-line challenge bank
    // (unlike Leo/Leonora/Richard) — only her mother's line above exists —
    // so she keeps flavor-line-only dialogue, same as John of Mayne.
    revealAfterQuest: 'squires_errand',
    // location-bound (Phase 20 4b): first-blood duels only happen in her
    // own ring at The Sister Keep
    sideQuests: [
      {
        id: 's_firstblood', kind: 'duel', target: 'any', need: 2,
        label: 'Take first blood off her twice in the ring',
        xpSkill: 'combat', xp: 110, rewardItems: { gold: 20 },
      },
      // Wave 56 (F3): her repTitles tiers were real, tracked standing with
      // nothing gating on them before this wave (confirmed live: only
      // DialoguePanel's cosmetic title display read `rep` for her). These
      // two reuse the one mechanic her content model supports (kind:'duel',
      // target:'any') at higher `need` counts and richer rewards, gated on
      // the tiers she already has — no new gate shape invented, same
      // SideQuestDef/needsRep plumbing GuildErrands-style errands already
      // use for their own rank gates. Her top tier (100, "Storm's Equal")
      // deliberately gets no third quest — an honest stopping point.
      {
        id: 's_ringveteran', kind: 'duel', target: 'any', need: 4, needsRep: 10,
        label: 'Best her four times on the bridge',
        xpSkill: 'combat', xp: 180, rewardItems: { gold: 40, iron_bar: 1 },
      },
      {
        id: 's_stormsrival', kind: 'duel', target: 'any', need: 6, needsRep: 40,
        label: "Prove you're her equal — six more duels won",
        xpSkill: 'combat', xp: 280, rewardItems: { gold: 70, iron_bar: 2 },
      },
    ],
  },
];
