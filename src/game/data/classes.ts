// Character callings (Phase 22, reworked 2026-07-20): creation was never meant
// to hand out a head start — every calling begins completely bare-handed, no
// starting kit at all (see newGame in gameStore.ts, which no longer merges
// `kit` into starting inventory, and no longer grants a starting axe either —
// harvestNode/useTool never actually gate on owning a tool, only on its
// condition, so gathering bare-handed already works mechanically). The ONLY
// differentiator a calling grants is its signature skill's +10% XP, forever
// (stacking with Quick Study and tier-1 talents) — everyone still earns their
// way up the SAME rank ladder from Peasant (see data/ranks.ts), starting
// exactly even. `kit` is kept on the type (harmless if ever repopulated) but
// every entry below is deliberately empty.
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
}

export const CLASSES: ClassDef[] = [
  { id: 'wanderer', name: 'Wanderer', icon: '🥾', signature: null,
    desc: 'No trade, no ties — just an open road and whatever you can make of it.', kit: {} },
  { id: 'woodsman', name: 'Woodsman', icon: '🪓', signature: 'woodcutting',
    desc: 'Raised among the pines; the axe will sing for you once you find one.', kit: {} },
  { id: 'quarryman', name: 'Quarryman', icon: '⛏️', signature: 'mining',
    desc: 'Stone answers your hammer arm, once you have a hammer.', kit: {} },
  { id: 'angler', name: 'Angler', icon: '🎣', signature: 'fishing',
    desc: 'Patient as still water — you know a good fishing spot when you find one.', kit: {} },
  { id: 'farmhand', name: 'Farmhand', icon: '🌾', signature: 'farming',
    desc: 'Soil under the nails since childhood; the land will answer for you.', kit: {} },
  { id: 'artisan', name: 'Artisan', icon: '🧱', signature: 'building',
    desc: 'A builder’s eye — walls will rise truer under your hand.', kit: {} },
  { id: 'prentice', name: 'Smith’s Prentice', icon: '🔥', signature: 'smithing',
    desc: 'Forge-scarred already, even without tools of your own yet.', kit: {} },
  // id kept as 'squire' (invisible to the player, and changing it would drop
  // the signature bonus for any existing save's classId) — only the
  // DISPLAYED name collided with the earned rank, so only that changes
  { id: 'squire', name: 'Page', icon: '🛡️', signature: 'combat',
    desc: 'Sworn to service, dreaming of the sword you don’t have yet — combat will come easier to you.', kit: {} },
];

export const CLASS_BY_ID: Record<string, ClassDef> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
