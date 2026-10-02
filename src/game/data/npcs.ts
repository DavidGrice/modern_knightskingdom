// The royal court, stationed around the realm. Each NPC greets with their
// original voice line and offers repeatable side quests from a themed pool.
//
// CLN-21 · this file is now a barrel. The roster lives in ./cast (types, court, village, settlements,
// interiorResidents, roster, presence) and the errand pools and their lookup in ./quests (pools, resolve). The
// names below are exactly the ones this module always exported, so no importer changed.
export type { SideQuestDef, NpcDef } from './cast/types';
export type { Poi } from './cast/presence';
export type { InteriorResident } from './cast/interiorResidents';
export {
  isNpcRevealed, COURT_START, COURT_END, isCourtHours, isNpcPresent, scheduledCourtNpcs, poisForDestination,
} from './cast/presence';
export { NPCS, NPC_BY_ID } from './cast/roster';
export { INTERIOR_RESIDENTS } from './cast/interiorResidents';
export { CEDRIC_WAR_QUESTS, GUILD_QUESTS, GUILD_ARC_REP } from './quests/pools';
export { sideQuestsOf, sideQuestBlocker, sideQuestOffers, questLabelById, sideQuestGiverName } from './quests/resolve';
