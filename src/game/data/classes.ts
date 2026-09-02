// Character callings (Phase 22, reworked 2026-07-20): creation was never meant
// to hand out a head start — every calling begins completely bare-handed, no
// starting kit at all (see newGame in gameStore.ts, which no longer merges
// `kit` into starting inventory, and no longer grants a starting axe either —
// harvestNode/useTool never actually gate on owning a tool, only on its
// condition, so gathering bare-handed already works mechanically). `kit` is
// kept on the type (harmless if ever repopulated) but every entry below is
// deliberately empty — that part of the design stands.
//
// Wave 32 REVERSES the "everyone starts exactly even" half of that design,
// on direct user instruction: each calling now also carries a small, always-
// on PASSIVE in its own signature skill — the same shape guilds.ts already
// uses (passiveLabel/passiveDesc + a real hook wired into the matching
// mechanic), not a literal item handout. Deliberately a NEW field pair
// alongside `kit` rather than repurposing `kit`'s own ItemId-map type: a
// passive is a label+description, categorically different data from a
// quantity map, and "kit" as a name would misleadingly imply an item grant
// to any future reader. Every passive here is calibrated SMALLER than the
// matching guild's own passive (and smaller than the matching tier-1 talent,
// where one exists) — this is a small head start on your own trade, not a
// substitute for earning the guild's respect or the talent tree. See each
// passive's own real wiring for the exact numbers: fishing.ts's
// biteWindowMs, and gameStore.ts's harvestNode (wood/ore), plantPlot/
// tendPlot (crops), useTool (tool wear), constructBuilding (swing weight),
// playerAttack (combat.ts, stamina cost) and sellItem/buyOffer (haggle).
//
// The Wanderer (signature: null) has no matching trade to hang a passive on
// — rather than force one, it gets its own small UNIVERSAL nudge (a shade
// better at haggling than anyone else starts, buying or selling, matching
// its "adaptable, no ties" flavor) instead of a signature-skill hook.
//
// The old "Squire" calling collided head-on with the EARNED rank of the same
// name (Peasant -> Laborer -> Squire at total level 8 -> Knight -> Paladin) —
// you shouldn't be able to just pick "Squire" at character creation. Renamed
// to "Page" (the real historical rung BEFORE squire), which if anything reads
// better: you start as a page dreaming of the sword, and EARN Squire later.
import type { ItemId, SkillId } from '../types';

export interface ClassDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  kit: Partial<Record<ItemId, number>>;
  /** +10% XP in this skill, forever. null = no signature (the Wanderer). */
  signature: SkillId | null;
  /** Wave 32 · small always-on mechanical nudge, same shape as GuildDef's
   *  passiveLabel/passiveDesc — shown in character creation, wired at the
   *  real mechanic it names (see this file's own header for where). */
  passiveLabel: string;
  passiveDesc: string;
}

export const CLASSES: ClassDef[] = [
  { id: 'wanderer', name: 'Wanderer', icon: '🥾', signature: null,
    desc: 'No trade, no ties — just an open road and whatever you can make of it.', kit: {},
    passiveLabel: 'Fair Dealer',
    passiveDesc: 'A shade sharper at haggling than most, buying or selling, wherever the road takes you.' },
  { id: 'woodsman', name: 'Woodsman', icon: '🪓', signature: 'woodcutting',
    desc: 'Raised among the pines; the axe will sing for you once you find one.', kit: {},
    passiveLabel: 'Forest-Raised',
    passiveDesc: 'Trees give up an extra log a little more often, even bare-handed.' },
  { id: 'quarryman', name: 'Quarryman', icon: '⛏️', signature: 'mining',
    desc: 'Stone answers your hammer arm, once you have a hammer.', kit: {},
    passiveLabel: 'Stone-Bred',
    passiveDesc: 'An eye for ore — ordinary boulders give up a little more of it to you.' },
  { id: 'angler', name: 'Angler', icon: '🎣', signature: 'fishing',
    desc: 'Patient as still water — you know a good fishing spot when you find one.', kit: {},
    passiveLabel: 'River Instinct',
    passiveDesc: 'A touch more time to strike once a fish takes the line.' },
  { id: 'farmhand', name: 'Farmhand', icon: '🌾', signature: 'farming',
    desc: 'Soil under the nails since childhood; the land will answer for you.', kit: {},
    passiveLabel: 'Green-Fingered',
    passiveDesc: 'Crops you tend come in a little sooner.' },
  { id: 'artisan', name: 'Artisan', icon: '🧱', signature: 'building',
    desc: 'A builder’s eye — walls will rise truer under your hand.', kit: {},
    passiveLabel: "Builder's Eye",
    passiveDesc: 'Every hammer swing at a construction site counts for a little extra.' },
  { id: 'prentice', name: 'Smith’s Prentice', icon: '🔥', signature: 'smithing',
    desc: 'Forge-scarred already, even without tools of your own yet.', kit: {},
    passiveLabel: 'Forge-Scarred',
    passiveDesc: 'Tools wear a little slower in your hands, workbench or no.' },
  // id kept as 'squire' (invisible to the player, and changing it would drop
  // the signature bonus for any existing save's classId) — only the
  // DISPLAYED name collided with the earned rank, so only that changes
  { id: 'squire', name: 'Page', icon: '🛡️', signature: 'combat',
    desc: 'Sworn to service, dreaming of the sword you don’t have yet — combat will come easier to you.', kit: {},
    passiveLabel: 'Battle-Ready',
    passiveDesc: 'Your swings cost a touch less stamina, armed or not.' },
];

export const CLASS_BY_ID: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

/** Wave 32 · true when `classId`'s signature skill is `skill` — the one
 *  check every calling-passive site shares, so "which calling gets this
 *  nudge" is answered in a single place if a signature ever changes. */
export function callingSignature(classId: string | undefined, skill: SkillId): boolean {
  return CLASS_BY_ID[classId ?? '']?.signature === skill;
}
