// CLN-21 · the assembled roster. NPCS is the same 11 entries in the same order data/npcs.ts always declared
// them in — court, then village, then settlements — now authored in one file per group.
import { COURT_NPCS } from './court';
import { VILLAGE_NPCS } from './village';
import { SETTLEMENT_NPCS } from './settlements';
import { INTERIOR_RESIDENTS } from './interiorResidents';
import type { NpcDef } from './types';

export const NPCS: NpcDef[] = [...COURT_NPCS, ...VILLAGE_NPCS, ...SETTLEMENT_NPCS];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(
  // Wave 45 (B3): interior residents (./interiorResidents) are deliberately NOT in NPCS
  // itself — see INTERIOR_RESIDENTS' own header comment for why — but they
  // still need to resolve by id everywhere a quest-giver normally would
  // (DialoguePanel, sideQuestsOf, sideQuestGiverName, QuestLogPanel), so
  // they're merged into this lookup table alone.
  [...NPCS, ...Object.values(INTERIOR_RESIDENTS).map((r) => r.npc)].map((n) => [n.id, n]),
);
