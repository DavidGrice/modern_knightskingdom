// CLN-07 · the store's internal helpers that act through set/get and that more than one slice calls: the quest
// counters (the main quest's objectives and a side errand's), a quest's completion, and the announcement of a rank
// crossed. They were functions inside createGameStore's closure; each slice that calls one takes it from here under
// the same name, so every action reads as it did.
import type { Quest, SkillId } from '../../types';
import { NPCS, sideQuestGiverName, sideQuestsOf } from '../../data/npcs';
import { RECIPES } from '../../data/recipes';
import { BUILDABLE_BY_ID } from '../../data/buildables';
import { perkSlotsEarned, SKILLS, type RankDef } from '../../data/ranks';
import { audio } from '@/lib/audio';
import { WORLD_DESTINATION_BY_ID } from '../../data/worlds';
import { activeQuestOf } from '../storeHelpers';
import type { StoreGet, StoreSet } from './types';

export function sharedActions(set: StoreSet, get: StoreGet) {
  function bumpSideQuest(kind: 'gather' | 'craft' | 'build' | 'kill' | 'joust' | 'duel' | 'caravan' | 'defend', target: string, amount: number) {
    const sq = get().sideQuest;
    if (!sq) return;
    const def = sideQuestsOf(sq.npcId).find((q) => q.id === sq.questId);
    if (!def) return;
    // Wave 13 · a 'deliver' errand is gathered exactly like a 'gather' one —
    // the only thing that makes it a delivery is WHERE it gets turned in
    // (see turnInSideQuest's deliverTo check, questSlice.ts) — so a gather-kind
    // action bump also advances a deliver-kind errand's progress.
    // Bugfix (CLN-21, found by data/validate.ts): a delivery of CRAFTED goods
    // (Beda's "cart 8 planks out to Fenwick") is loaded up by crafting them —
    // planks are never harvested, so with only the gather bump above that
    // errand's counter could not move and it could never be turned in. A
    // craft bump carries the RECIPE id, so it is matched on what the recipe
    // makes rather than on its id.
    const craftedForDelivery = def.kind === 'deliver' && kind === 'craft';
    const matchesKind = def.kind === kind || (def.kind === 'deliver' && kind === 'gather') || craftedForDelivery;
    if (!matchesKind) return;
    const bumped = craftedForDelivery ? RECIPES.find((r) => r.id === target)?.output ?? target : target;
    if (def.target !== 'any' && def.target !== bumped) return;
    if (sq.have >= def.need) return;
    const have = Math.min(def.need, sq.have + amount);
    set({ sideQuest: { ...sq, have }, dirty: true });
    if (have >= def.need) {
      const msg = def.kind === 'deliver'
        ? `Loaded up — now carry it to ${WORLD_DESTINATION_BY_ID[def.deliverTo ?? '']?.name ?? 'its destination'}.`
        : `Errand ready to turn in: see ${sideQuestGiverName(sq.npcId)}!`;
      get().notify(msg, true);
    }
  }

  function bumpQuestCounters(kind: 'gather' | 'craft' | 'build' | 'visit' | 'talk', target: string, amount: number) {
    // 'visit'/'talk' are main-quest travel beats (Phase 20) — side-quest
    // errands have no such kinds, so only the shared trio forwards there
    if (kind === 'gather' || kind === 'craft' || kind === 'build') bumpSideQuest(kind, target, amount);
    const { completedQuests, questProgress } = get();
    const quest = activeQuestOf(completedQuests);
    if (!quest) return;
    let changed = false;
    const qp = { ...(questProgress[quest.id] ?? {}) };
    for (const obj of quest.objectives) {
      if (obj.kind !== kind) continue;
      // L64 · "any wall" used to mean the two pieces that existed when the
      // quest was written, so building a plain mc006 wall section — which is
      // filed under `walls`, sits on the wall grid and looks like a wall —
      // advanced nothing. It now asks the CATALOGUE what a wall is, so every
      // piece in the family counts and any wall added later counts too.
      const matches =
        obj.target === target ||
        (obj.target === 'anywall' && BUILDABLE_BY_ID[target]?.category === 'walls');
      if (!matches) continue;
      const cur = qp[obj.id] ?? 0;
      if (cur >= obj.count) continue;
      qp[obj.id] = Math.min(obj.count, cur + amount);
      changed = true;
    }
    if (!changed) return;
    set({ questProgress: { ...get().questProgress, [quest.id]: qp }, dirty: true });
    // completed?
    const done = quest.objectives.every((o) => (qp[o.id] ?? 0) >= o.count);
    if (done) completeQuest(quest);
  }

  function completeQuest(quest: Quest) {
    const st = get();
    const notify = st.notify;
    set({ completedQuests: [...st.completedQuests, quest.id], dirty: true });
    if (quest.xp) {
      for (const [skill, amt] of Object.entries(quest.xp)) {
        st.addXp(skill as SkillId, amt as number);
      }
    }
    if (quest.grantItems) st.addItems(quest.grantItems, 'grant');
    if (quest.unlocks?.length) {
      set({ unlocks: [...new Set([...get().unlocks, ...quest.unlocks])] });
      for (const u of quest.unlocks) {
        const skill = SKILLS.find((s) => s.unlockFlag === u);
        if (skill) notify(`New ability unlocked: ${skill.name}!`, true);
      }
    }
    audio.play('horn', 0.7);
    notify(`Quest complete: ${quest.name}`, true);
    // Phase 20 step 4: the court lives across the realm's instances now — a
    // quest that reveals someone must say WHERE they hold court, or the
    // player has no idea a new face is waiting a Travel-Map ride away
    for (const n of NPCS) {
      if (n.revealAfterQuest !== quest.id) continue;
      if (n.world) {
        const w = WORLD_DESTINATION_BY_ID[n.world];
        notify(`📜 Word arrives: ${n.name} will receive you at ${w?.name ?? n.world}. Consult the Travel Map.`, true);
      } else {
        notify(`📜 ${n.name} has arrived at the homestead.`, true);
      }
    }
    const next = activeQuestOf(get().completedQuests);
    if (next) notify(`New quest: ${next.name}`);
  }

  // Wave 52 (D1): the ceremony/notify/perk-nudge sequence that used to live
  // only inline inside addXp, extracted so a rank crossed WITHOUT any XP
  // changing (Marshal's gate is cedricCaptures, not a skill level) still
  // gets announced. markCedricDefeated's first-capture branch calls this
  // directly since it never calls addXp itself.
  function announceRankChange(rBefore: RankDef, rAfter: RankDef) {
    if (rAfter.name === rBefore.name) return;
    const offerPerk = () => {
      if (get().perks.length < perkSlotsEarned(get().xp, get().completedQuests, get().cedricCaptures)) {
        get().notify('A new strength awaits — check your Abilities (K).', true);
      }
    };
    if (rAfter.name === 'Knight' || rAfter.name === 'Paladin' || rAfter.name === 'Marshal') {
      get().beginCeremony(rAfter.name as 'Knight' | 'Paladin' | 'Marshal');
      setTimeout(offerPerk, 5300); // after the ceremony's own sequence finishes
    } else {
      audio.play('horn', 0.8);
      get().notify(`You are now a ${rAfter.name} — ${rAfter.title}!`, true);
      offerPerk();
    }
  }

  return { bumpSideQuest, bumpQuestCounters, completeQuest, announceRankChange };
}
