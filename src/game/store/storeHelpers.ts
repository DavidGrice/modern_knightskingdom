// CLN-07 · pure helpers the store's slices and the rest of the game share, moved out of gameStore.ts so that a slice
// can import them without importing the store (gameStore.ts re-exports both, for the modules that import them there).
import type { Quest } from '../types';
import { GUILD_BY_ID, guildMaxRank, guildRankIndex } from '../data/guilds';
import { QUESTS } from '../data/quests';

/** Wave 22 · true once the player carries guildId's OWN banner and has
 *  climbed to that guild's top rank — the shared check every guild's
 *  max-rank passive bump (the store, combat.ts, fishing.ts) reads. */
export function atGuildMaxRank(guild: string | null, guildRanks: Record<string, number>, guildId: string): boolean {
  if (guild !== guildId) return false;
  const def = GUILD_BY_ID[guildId];
  return !!def && guildRankIndex(def, guildRanks[guildId] ?? 0) >= guildMaxRank(def);
}

export function activeQuestOf(completed: string[]): Quest | null {
  return QUESTS.find((q) => !completed.includes(q.id)) ?? null;
}
