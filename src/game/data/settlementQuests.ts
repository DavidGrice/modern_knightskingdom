// Empire arc, Wave 4 — the settlement prototype at template-08 ("The Old
// Ruins", chosen per the design pass behind this wave: the only one of the
// 8 real away-destinations with no resident named NPC or guild-hall NPC
// already living there, so a new settlement doesn't compete with existing
// content). Two real errands, offered/tracked/turned in through the exact
// same DialoguePanel flow every other NPC's `sideQuests` already uses —
// spread directly into Fenwick's own `NpcDef.sideQuests` (npcs.ts), not
// merged in via `sideQuestsOf()` the way `allegianceQuests.ts`'s pool is.
// That merge path is real but DialoguePanel.tsx's own offer/accept logic
// reads `npc.sideQuests` directly, never `sideQuestsOf(npc.id)` — confirmed
// by reading it, not assumed — so an EXTRA_SIDE_QUESTS-style pool would
// never actually be offerable through the normal "talk to them" flow (the
// same reason `farmer_alric`/`miller_beda`'s own allegiance-file errands
// are dead code today, a separate pre-existing gap logged in ROADMAP.md,
// not fixed here). Keeping this pool as its own file for the same
// organizational reason `allegianceQuests.ts` is separate from `npcs.ts` —
// the settlement-earning story reads in one place — while still being
// spread into the real `sideQuests` array so it actually works.
import type { SideQuestDef } from './npcs';

export const SETTLEMENT_QUESTS: Record<string, SideQuestDef[]> = {
  fenwick: [
    {
      id: 'settle_scout', kind: 'gather', target: 'stone', need: 20,
      label: 'Shore up the old foundations — bring 20 stone',
      xpSkill: 'building', xp: 60, rewardItems: { gold: 15 },
    },
    {
      id: 'settle_clear', kind: 'kill', target: 'any', need: 6,
      label: "Clear out whatever's been nesting in these ruins — defeat 6 hostiles",
      xpSkill: 'combat', xp: 80, rewardItems: { gold: 20 },
      requires: ['settle_scout'],
    },
  ],
};
