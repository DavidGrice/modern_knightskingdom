// CLN-21 · the NPC and side-quest shapes, moved verbatim out of data/npcs.ts (which re-exports them).
import type { Alliance, CharacterConfig, ItemId, SkillId } from '../../types';
import type { SoundName } from '@/lib/audio';
import type { EnemyKind } from '../../combat';

/** Everything about an errand except what it asks for — see `SideQuestGoal`. */
interface SideQuestBase {
  id: string;
  /** Which way finishing this errand moves your standing between the houses
   *  (data/allegiance.ts). Positive is toward the crown, negative toward the
   *  Bull, absent means it is honest work that neither house cares about —
   *  which is what makes a NEUTRAL path a real option rather than a gap. */
  allegiance?: number;
  /** errand ids that must already be done before this one is offered. Names
   *  its blocker in the UI rather than sitting greyed and silent. */
  requires?: string[];
  /** standing this errand demands before anyone will trust you with it.
   *  Positive = at least this far toward Leo, negative = toward Cedric. */
  needsAllegiance?: number;
  /** Wave 13 · unlike `needsAllegiance` (the continuous -100..100 score),
   *  this checks the one-way PLEDGE (gameStore's `alliance`) — a real
   *  "you must actually be sworn" gate, not just "you've been leaning this
   *  way." True alliance-exclusive content (a capstone errand/reward each
   *  house holds back for its own sworn knight) uses this instead. */
  needsAlliance?: Alliance;
  /** Wave 56 (F3) · standing with this errand's own giver required before
   *  it's offered — reuses needsAllegiance/needsAlliance's exact shape,
   *  but reads gameStore's per-NPC `reputation` record (data/npcs repTitles)
   *  instead of either the crown/Bull axis or the one-way pledge. Storm's
   *  two new bridge duels are the first content to use this: rep tiers she
   *  already tracked were real but purely cosmetic before this wave. */
  needsRep?: number;
  /** Wave 25 · a MAIN-quest id (data/quests.ts) that must already be
   *  completed — distinct from `requires` above, which only checks other
   *  SIDE-quest ids against `completedSideQuests`. Introduced for Richard's
   *  own 'r_squire' recruitment errand, gated on 'knights_arms' (the actual
   *  knighting moment) — general enough for any future errand that needs to
   *  wait on a real story beat rather than another side quest. */
  needsQuest?: string;
  need: number;
  label: string;
  xpSkill: SkillId;
  xp: number;
  rewardItems?: Partial<Record<ItemId, number>>;
  /** 'deliver' errands only: the destination id (data/worlds.ts) you must
   *  be physically standing in — not the giver's own location — before
   *  `turnInSideQuest` will accept it. The whole point is hauling goods
   *  across a `travelTo()`, so the giver and the turn-in place are
   *  deliberately different; DialoguePanel recognizes an active errand as
   *  "yours to turn in" at whichever NPC lives at `deliverTo`, even if that
   *  NPC didn't hand it to you (see its `mySideQuest` derivation). */
  deliverTo?: string;
}

/** What an errand asks for: its `kind`, and the `target` that kind is matched against at runtime (gameStore's
 *  bumpSideQuest). CLN-21 · typed per kind, so a pair that can never match fails to compile instead of shipping
 *  as an errand whose counter cannot move; data/validate.ts checks what a type cannot (that a craft/build target is
 *  a real recipe/buildable id, that a gather target is something harvested rather than crafted).
 *
 *  'joust' and 'duel' (Phase 20 step 4b) are location-bound by nature —
 *  jousting only happens at Richard's Tourney Grounds, first-blood duels
 *  only at Storm's Battle Dome — so errands using them can only be
 *  advanced in their giver's own world. 'deliver' (Wave 13) is
 *  location-bound the other way: it behaves exactly like 'gather' while
 *  you carry it (see gameStore's bumpSideQuest, which treats a gather-kind
 *  action bump as advancing a deliver-kind errand too) but can only be
 *  turned in at `deliverTo`, not back with whoever handed it to you — see
 *  that field's own doc comment. 'caravan' (Wave 27) is advanced by a real
 *  caravan collection (gameStore's collectCaravan), not by carrying
 *  anything yourself — see data/caravan.ts for the mechanic itself.
 *  'defend' (Wave 47, B7) is advanced the same opportunistic way: a real
 *  settlement raid resolving in the player's favor (gameStore's
 *  resolveSettlementRaid) bumps it, whether or not it's the errand you set
 *  out that night meaning to finish — see game/settlementRaid.ts.
 */
type SideQuestGoal =
  | { kind: 'gather' | 'deliver'; target: ItemId }          // the goods themselves
  | { kind: 'craft'; target: string }                       // a recipe id
  | { kind: 'build'; target: string }                       // a buildable id
  | { kind: 'kill'; target: EnemyKind | 'any' }
  | { kind: 'defend'; target: string }                      // a settlement's destination id
  | { kind: 'joust' | 'duel' | 'caravan'; target: 'any' };  // only ever bumped with 'any'

export type SideQuestDef = SideQuestBase & SideQuestGoal;

export interface NpcDef {
  /** Keep the weapons/regalia molded into this donor?
   *
   *  True for the court — the crown, the goblet, Richard's spear are part of
   *  who those characters are. FALSE for the village folk: Alric and Beda
   *  share the generic donors, which carry a molded halberd and crossbow, and
   *  keeping those both mis-characterised a farmer and a miller AND fed a
   *  large held mesh into the arm cluster, which is what threw their heads
   *  and arms out of place while they stood at their posts. Defaults to true
   *  so every existing court entry is unchanged.
   */
  keepProps?: boolean;
  id: string;
  name: string;
  title: string;
  config: CharacterConfig;
  x: number;
  z: number;
  yaw: number;
  greetSound: SoundName;
  portrait: string;
  /** flavor lines, one picked at random per conversation */
  lines: string[];
  sideQuests: SideQuestDef[];
  /** one-time voiced introduction, played in order the first time you talk to
   *  them (see game/store gameStore's loreSeen) — genuine lines of theirs
   *  from the original game's 371-line challenge/tutorial voice-over bank */
  loreLines?: { text: string; sound: SoundName }[];
  /** standing with this NPC specifically (see gameStore's reputation/
   *  addReputation), ascending thresholds — only NPCs with repeatable
   *  errands (or, for Richard, jousting) build a personal standing; King
   *  Leo's relationship with the player is already the main quest/rank */
  repTitles?: { min: number; title: string }[];
  /** quest id that must be completed before this NPC appears in the world —
   *  absent means always present. The game starts as a small farm/village
   *  of ordinary folk; the royal court arrives in person as you prove
   *  yourself (see isNpcRevealed). */
  revealAfterQuest?: string;
  /** Phase 20 (Kingdom of Instances): destination id this NPC resides in —
   *  absent = the homestead. A resident NPC renders (and is interactable)
   *  only while the player is visiting their instance; their x/z are
   *  world-absolute coordinates near that destination's travel landing
   *  point, and their feet follow the bake's real terrain height. */
  world?: string;
  /** Wave 53 (E5) · true only for King Leo and Queen Leonora — the court
   *  holds session by day and is not in session at night (isCourtHours,
   *  below). Distinct from `revealAfterQuest`'s one-time-forever gate: this
   *  one flips back and forth every in-game day. The dead `Npc.tsx`
   *  `CourtNpc.schedule` day/night LERP (its own `revealAfterQuest &&
   *  !world` condition) can't cover this — neither King nor Queen satisfy
   *  `!world` (both live at `template-01`), and that mechanism's own
   *  NIGHT_GATHER_SPOT is homestead-coordinate geometry anyway — so this is
   *  a genuinely new, narrower presence gate: HIDE outside court hours
   *  rather than walk somewhere else. See Npc.tsx's own CourtNpc for where
   *  it's actually applied (a per-frame visibility check, not a list
   *  filter — worldEnv.time is a plain mutable value with no store
   *  subscription to re-trigger a render off of, so this can't live in the
   *  render-time `revealed` array the way `isNpcRevealed` does; see that
   *  file's own comment for the full reasoning). */
  courtHours?: boolean;
}
