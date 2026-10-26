// CLN-07 · the store's side-errand slice: taking up, turning in and dropping an errand, the quest tracker, kills,
// and the bestiary. (The main quest's counters and a quest's completion are shared actions: slices/shared.ts.)
import type { ItemId } from '../../types';
import { GUILD_ARC_REP, sideQuestBlocker, sideQuestGiverName, sideQuestsOf } from '../../data/npcs';
import { SETTLEMENT_GROWTH_QUEST_DEST } from '../../data/settlements';
import { GUILD_BY_ID } from '../../data/guilds';
import { audio } from '@/lib/audio';
import { aimState } from '../../targeting';
import { WORLD_DESTINATION_BY_ID } from '../../data/worlds';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

export interface QuestSlice {
  acceptSideQuest: (npcId: string, questId: string) => void;
  turnInSideQuest: () => void;
  abandonSideQuest: () => void;
  setTrackedQuest: (which: 'main' | 'side') => void;
  recordKill: (kind: string) => void;
  scanTarget: () => void;
  /** external systems (combat.ts's duel resolution) credit errand progress
   *  through this rather than importing the module-private counter */
  bumpErrand: (kind: 'joust' | 'duel', target: string, amount: number) => void;
}

export const createQuestSlice: SliceCreator<QuestSlice> = (set, get) => {
  const { bumpSideQuest } = sharedActions(set, get);

  return {
    acceptSideQuest: (npcId, questId) => {
      const st = get();
      const def = sideQuestsOf(npcId).find((q) => q.id === questId);
      if (!def || st.sideQuest) return;
      // Wave 22 · a guild's own errand pool is for members only — re-checked
      // here (not just threaded through sideQuestBlocker's signature, which
      // every other caller besides GuildPanel would then have to pass a
      // guild id into for no reason) so a stale panel can never hand one out
      // to someone who switched banners since it was drawn.
      if (GUILD_BY_ID[npcId] && st.guild !== npcId) {
        st.notify('Only members of this guild are given its work.');
        return;
      }
      // Wave 26 bugfix: `sideQuestBlocker` only checks precursor/allegiance/
      // alliance gates, never "already done" (that's QuestLogPanel's own
      // separate `done` flag — see DialoguePanel.tsx's `offer` useMemo for
      // the full story on why it isn't folded into the shared blocker
      // itself). Re-accepting an already-completed errand isn't just
      // cosmetic: it would let `turnInSideQuest` grant its XP/gold a second
      // time for the same requirement. Checked here even though the fixed
      // `offer` rotation should no longer serve one up, matching this
      // store's own "the store, not just the panel, enforces it" discipline.
      if (st.completedSideQuests.includes(questId)) return;
      // precursor chains and allegiance/alliance gates are enforced HERE as
      // well as in the UI, so a stale panel can never hand out work you have
      // not earned
      const blocked = sideQuestBlocker(
        def, st.completedSideQuests, st.completedQuests, st.allegiance, st.alliance, st.reputation[npcId] ?? 0,
      );
      if (blocked) { st.notify(blocked); return; }
      set({ sideQuest: { npcId, questId, have: 0 }, dirty: true });
      st.notify(`Errand accepted: ${def.label}`);
    },

    turnInSideQuest: () => {
      const st = get();
      const sq = st.sideQuest;
      if (!sq) return;
      const def = sideQuestsOf(sq.npcId).find((q) => q.id === sq.questId);
      if (!def || sq.have < def.need) return;
      // Wave 13 · a delivery errand is only "done" once you're standing
      // where the goods were asked for — not back with whoever handed it to
      // you (see npcs.ts's own doc comment on `deliverTo`)
      if (def.kind === 'deliver' && st.destination !== def.deliverTo) {
        const distName = WORLD_DESTINATION_BY_ID[def.deliverTo ?? '']?.name ?? 'its destination';
        st.notify(`Not delivered yet — carry it to ${distName} first.`);
        return;
      }
      // gather AND deliver errands hand the physical goods over
      if (def.kind === 'gather' || def.kind === 'deliver') {
        const inv = { ...st.inventory };
        const held = inv[def.target as ItemId] ?? 0;
        if (held < def.need) {
          st.notify(`You no longer carry ${def.need} of those…`);
          return;
        }
        inv[def.target as ItemId] = held - def.need;
        set({ inventory: inv });
      }
      set({ sideQuest: null, dirty: true });
      st.addXp(def.xpSkill, def.xp);
      if (def.rewardItems) st.addItems(def.rewardItems, 'grant');
      audio.play('treasure', 0.8);
      // Wave 25 · this specific errand's turn-in is also Tam's recruitment
      // beat — a one-off special case, not a new general "quest ->
      // companion" system, same shape as the rest of this function's own
      // narrow, hand-named side effects.
      if (def.id === 'r_squire') st.recruitCompanion();
      // Wave 47 (B7) · closing a settlement's own defend->expand quest link
      // is a real, permanent yield-tier milestone — same narrow, hand-named
      // side-effect precedent as r_squire's recruitCompanion() just above.
      const growthDest = SETTLEMENT_GROWTH_QUEST_DEST[def.id];
      if (growthDest && st.settlements[growthDest]) {
        const s = st.settlements[growthDest];
        set({ settlements: { ...st.settlements, [growthDest]: { ...s, growthTier: (s.growthTier ?? 0) + 1 } }, dirty: true });
        st.notify(`${WORLD_DESTINATION_BY_ID[growthDest]?.name ?? 'The settlement'} grows — yield rises.`, true);
      }
      // a delivery hands off to whoever's actually standing here, not the
      // (physically absent) giver back home
      st.notify(def.kind === 'deliver'
        ? 'The load is handed over — word of it will get back to ' + sideQuestGiverName(sq.npcId) + '.'
        : `${sideQuestGiverName(sq.npcId)} thanks you for your service!`, true);
      // Wave 22 · a guild errand builds rank within the guild, never the
      // per-NPC reputation record — same +15 constant either way, except
      // Wave 55 (F2)'s 5 new per-guild arc quests (GUILD_ARC_REP), sized to
      // finally make rank 2/3 — and Wave 52/D4's max-rank vendor rows —
      // reachable at all; every pre-existing guild quest id is absent from
      // that table and keeps its exact live +15 via the `?? 15` fallback.
      if (GUILD_BY_ID[sq.npcId]) st.addGuildRep(sq.npcId, GUILD_ARC_REP[def.id] ?? 15); else st.addReputation(sq.npcId, 15);
      // remember it, so chains can require it and it never re-offers as new
      if (!st.completedSideQuests.includes(def.id)) {
        set({ completedSideQuests: [...st.completedSideQuests, def.id] });
      }
      // and let it move where you stand — neutral village work has no delta,
      // which is what keeps 'unsworn' a real stance rather than a gap
      if (def.allegiance) {
        st.shiftAllegiance(def.allegiance, `You served ${sideQuestGiverName(sq.npcId)}`);
      }
    },

    abandonSideQuest: () => set({ sideQuest: null, dirty: true }),

    setTrackedQuest: (which) => set({ trackedQuest: which, dirty: true }),

    bumpErrand: (kind, target, amount) => bumpSideQuest(kind, target, amount),

    scanTarget: () => {
      const t = aimState.target;
      const st = get();
      if (!t || t.standing !== 'hostile') return;
      if (st.bestiary.includes(t.kind)) return;
      set({ bestiary: [...st.bestiary, t.kind], dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${t.name} recorded in your collection book.`, true);
      st.addXp('combat', 10);
    },

    recordKill: (kind) => {
      // errands can name a specific enemy kind (Cedric's "cull the King's
      // hounds" targets 'royal'); 'any'-target errands still match wildcard
      bumpSideQuest('kill', kind, 1);
      const st = get();
      set({
        stats: {
          ...st.stats,
          kills: st.stats.kills + 1,
          killsByKind: { ...st.stats.killsByKind, [kind]: (st.stats.killsByKind[kind] ?? 0) + 1 },
        },
      });
    },
  };
};
