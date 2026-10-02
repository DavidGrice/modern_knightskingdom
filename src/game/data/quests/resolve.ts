// CLN-21 · side-quest lookup and gating, moved verbatim out of data/npcs.ts.
import type { Alliance } from '../../types';
import { EXISTING_QUEST_ALLEGIANCE, EXTRA_SIDE_QUESTS } from '../allegianceQuests';
import { allegianceGateHint, meetsAllegiance } from '../allegiance';
import { GUILD_BY_ID } from '../guilds';
import { QUESTS } from '../quests';
import { INTERIOR_RESIDENTS } from '../cast/interiorResidents';
import { NPCS, NPC_BY_ID } from '../cast/roster';
import type { SideQuestDef } from '../cast/types';
import { CEDRIC_WAR_QUESTS, GUILD_QUESTS } from './pools';

export function sideQuestsOf(npcId: string): SideQuestDef[] {
  const base = npcId === 'cedric' ? CEDRIC_WAR_QUESTS
    : GUILD_QUESTS[npcId] ?? (NPC_BY_ID[npcId]?.sideQuests ?? []);
  // errands that take a side live in their own module (data/allegianceQuests)
  // so the whole "which way does this pull me?" picture reads in one place;
  // the pre-existing ones get their delta stamped on here for the same reason
  const extra = EXTRA_SIDE_QUESTS[npcId] ?? [];
  return [...base, ...extra].map((q) => (
    q.allegiance === undefined && EXISTING_QUEST_ALLEGIANCE[q.id] !== undefined
      ? { ...q, allegiance: EXISTING_QUEST_ALLEGIANCE[q.id] }
      : q
  ));
}

/** Why this errand is not on offer yet, or null when it is available.
 *  Never disable without naming the blocker (UI handoff pack §2).
 *  `alliance` is optional only so call sites written before Wave 13's
 *  `needsAlliance` gate keep compiling untouched — every real caller now
 *  passes it (see gameStore's acceptSideQuest, QuestLogPanel, DialoguePanel,
 *  ParleyPanel). `completedQuests` (Wave 25) is NOT similarly optional: it
 *  backs `needsQuest`, a gate real enough to need every real caller passing
 *  it from day one, same as `completed` (completedSideQuests) itself. `rep`
 *  (Wave 56, F3) is optional/defaulted the same way `alliance` was in Wave
 *  13 — it only backs `needsRep`, which nothing used before this wave. */
export function sideQuestBlocker(
  q: SideQuestDef, completed: string[], completedQuests: string[], allegiance: number,
  alliance?: Alliance | null, rep: number = 0,
): string | null {
  if (q.needsQuest && !completedQuests.includes(q.needsQuest)) {
    const name = QUESTS.find((mq) => mq.id === q.needsQuest)?.name ?? q.needsQuest;
    return `First: ${name}`;
  }
  if (q.requires?.length) {
    const missing = q.requires.filter((r) => !completed.includes(r));
    if (missing.length) {
      const names = missing.map((id) => questLabelById(id) ?? id);
      return `First: ${names.join(', ')}`;
    }
  }
  if (q.needsAllegiance !== undefined && !meetsAllegiance(allegiance, q.needsAllegiance)) {
    return allegianceGateHint(q.needsAllegiance);
  }
  if (q.needsAlliance && alliance !== q.needsAlliance) {
    return q.needsAlliance === 'leo'
      ? 'Only for a knight sworn to the crown'
      : "Only for one sworn to Cedric's rebellion";
  }
  if (q.needsRep !== undefined && rep < q.needsRep) {
    return `Needs ${q.needsRep}+ standing (have ${rep})`;
  }
  return null;
}

/** Wave 55 (F1) · every quest in npcId's pool that is neither already done
 *  nor currently blocked — the full "choose one of these" set, in pool
 *  order. Replaces three near-identical single-item rotating-offer loops
 *  (DialoguePanel/ParleyPanel/GuildErrands) with one correct filter — two of
 *  the three never checked `completed` themselves (only DialoguePanel got
 *  Wave 26's fix), so a rotation could re-offer an already-finished errand
 *  forever; Accept then silently no-op'd against acceptSideQuest's own
 *  completedSideQuests guard. The player still only ever ACCEPTS one at a
 *  time (`st.sideQuest` stays a single global slot, gameStore.ts) — this
 *  only widens what gets shown, never what can be active at once. */
export function sideQuestOffers(
  npcId: string, completed: string[], completedQuests: string[], allegiance: number,
  alliance?: Alliance | null, rep: number = 0,
): SideQuestDef[] {
  return sideQuestsOf(npcId).filter((q) =>
    !completed.includes(q.id) && !sideQuestBlocker(q, completed, completedQuests, allegiance, alliance, rep));
}

/** an errand's own label, wherever it lives */
export function questLabelById(id: string): string | null {
  for (const n of NPCS) {
    const hit = n.sideQuests.find((q) => q.id === id);
    if (hit) return hit.label;
  }
  const ced = CEDRIC_WAR_QUESTS.find((q) => q.id === id);
  if (ced) return ced.label;
  // Wave 22 · so a guild errand chain's `requires` names its precursor
  // ("First: Mill 6 planks...") instead of falling back to the raw id, the
  // same reason CEDRIC_WAR_QUESTS gets its own check just above.
  for (const list of Object.values(GUILD_QUESTS)) {
    const hit = list.find((q) => q.id === id);
    if (hit) return hit.label;
  }
  for (const list of Object.values(EXTRA_SIDE_QUESTS)) {
    const hit = list.find((q) => q.id === id);
    if (hit) return hit.label;
  }
  // Wave 45 (B3): interior residents aren't in NPCS (see INTERIOR_RESIDENTS'
  // own header comment), so the first loop above never sees their errands.
  for (const r of Object.values(INTERIOR_RESIDENTS)) {
    const hit = r.npc.sideQuests.find((q) => q.id === id);
    if (hit) return hit.label;
  }
  return null;
}

export function sideQuestGiverName(npcId: string): string {
  if (npcId === 'cedric') return 'Cedric the Bull';
  if (GUILD_BY_ID[npcId]) return GUILD_BY_ID[npcId].name;
  return NPC_BY_ID[npcId]?.name ?? 'someone';
}
