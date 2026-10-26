// CLN-07 · the store's progression slice: experience and ranks, the knighting ceremony, perks, talents and attribute
// points, deeds and challenges, and lifetime stats. (A rank crossed is announced by a shared action: slices/shared.ts.)
import type { SkillId } from '../../types';
import { CALLING_FX, PERK_FX, TALENT_FX } from '../../data/effects';
import { DEEDS } from '../../data/achievements';
import { CHALLENGES, challengeProgress, CHALLENGE_TIER_REWARD, GOLDEN_FORTUNE_GOLD } from '../../data/challenges';
import { CREST_UNLOCKS, unlockCrest, crestLabel } from '../../data/crestUnlocks';
import { CLASS_BY_ID } from '../../data/classes';
import { type AttrId } from '../../data/attributes';
import { PLAYER_ATTRS, attrPointsEarned, attrPointsSpent, respecCost } from '../../data/playerAttributes';
import { TALENT_BY_ID, talentBuyable, talentPointsSpent, talentRespecCost } from '../../data/skillTree';
import { PERKS } from '../../data/perks';
import { levelFromXp, perkSlotsEarned, rankFromTotalLevel, RANKS, totalSkillLevel } from '../../data/ranks';
import { audio } from '@/lib/audio';
import { playerState } from '../../playerState';
import { NPC_KING } from '../../data/world';
import { standDown } from '../../standDown';
import { resetDungeon } from '../../dungeon';
import { endArenaRun } from '../../arena';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

export interface ProgressionSlice {
  ceremony: { rank: string } | null; // Knight/Paladin promotion cutscene in progress

  beginCeremony: (rank: 'Knight' | 'Paladin' | 'Marshal') => void;

  checkDeeds: () => void;
  checkChallenges: () => void;

  buyTalent: (talentId: string) => void;
  /** Wave 32 · hand every learned talent back for gold (cost from
   *  data/skillTree's talentRespecCost). No-op when nothing is learned. */
  respecTalents: () => void;
  spendAttrPoint: (id: AttrId) => void;
  /** Wave 9 · hand every invested attribute point back for gold (cost from
   *  data/playerAttributes' respecCost). No-op when nothing is invested. */
  respecAttributes: () => void;

  choosePerk: (id: string) => void;

  flushStats: (delta: { distanceMeters: number; playtimeSec: number }) => void;
  recordDungeonClear: () => void;

  addXp: (skill: SkillId, amount: number) => void;
}

export const createProgressionSlice: SliceCreator<ProgressionSlice> = (set, get) => {
  const { announceRankChange } = sharedActions(set, get);

  return {
    ceremony: null,

    beginCeremony: (rank) => {
      const st = get();
      if (st.ceremony) return;
      // whatever he was doing — in the saddle, crewing an engine, pushing a
      // ram, towing a cart — ends here, in the scene he is leaving (see
      // game/standDown.ts for what it used to cost); a ram or cart is set
      // down where it was
      for (const id of standDown()) st.settleCart(id);
      // ...and so does where he is, where it is a place left only by its own way out: build mode is left (as Escape
      // leaves it), and the Sealed Crypt and an arena run are put by as "Return Home" puts them by — the travel below
      // does neither, and he used to arrive before the King still in build mode, or with the arena's run still on
      // (ROADMAP.md, "the knighting kept build mode, the crypt or an arena run")
      if (st.buildMode) st.setBuildMode(false);
      resetDungeon();
      endArenaRun();
      // Phase 20: the court resides at the royal castle — a knighting is a
      // summons TO The King's Approach, not a house call. travelTo no-ops if
      // the player is somehow already standing there; our teleport below
      // overrides its default landing spot to put them before the throne.
      if (st.destination !== 'template-01') st.travelTo('template-01');
      set({ ceremony: { rank }, panel: 'none', cameraMode: 'third' });
      playerState.pendingTeleport = { x: NPC_KING.x, z: NPC_KING.z - 2.4, yaw: Math.PI };
      audio.play('horn', 0.9);
      setTimeout(() => get().pokeNpc('king', 'anim_r_gesturepullsword'), 600);
      setTimeout(() => get().pokeNpc('king', 'anim_r_congratulate'), 2600);
      setTimeout(() => get().playEmote('anim_r_regalwave'), 2700);
      setTimeout(() => {
        const rankDef = RANKS.find((r) => r.name === rank);
        set({ ceremony: null });
        get().notify(`You are now a ${rank}${rankDef ? ` — ${rankDef.title}` : ''}!`, true);
      }, 5200);
    },

    choosePerk: (id) => {
      const st = get();
      if (st.perks.includes(id) || !PERKS.some((p) => p.id === id)) return;
      if (st.perks.length >= perkSlotsEarned(st.xp, st.completedQuests, st.cedricCaptures)) return;
      set({ perks: [...st.perks, id], dirty: true });
      audio.play('treasure', 0.8);
      const def = PERKS.find((p) => p.id === id)!;
      st.notify(`Perk gained: ${def.name} — ${def.desc}`, true);
    },

    // Phase 21 talent tree: spend derived points (one earned per total skill
    // level) down a skill's branch — talentBuyable re-checks prerequisites,
    // the skill-level gate and the unspent balance at purchase time
    buyTalent: (talentId) => {
      const st = get();
      const def = TALENT_BY_ID[talentId];
      if (!def) return;
      const check = talentBuyable(def, st.skillTree, st.xp);
      if (!check.ok) {
        st.notify(check.why);
        return;
      }
      set({ skillTree: [...st.skillTree, talentId], dirty: true });
      audio.play('treasure', 0.7);
      st.notify(`✦ Talent learned: ${def.name} — ${def.desc}`, true);
    },

    // Wave 32 · the talent tree's mirror of respecAttributes (Wave 9) — full
    // reset for a scaling gold fee, same pricing model (see data/skillTree's
    // talentRespecCost for why). `skillTree` is read live everywhere
    // (`st.skillTree.includes(...)`), so wiping it needs no invalidation step.
    respecTalents: () => {
      const st = get();
      const spent = talentPointsSpent(st.skillTree);
      if (spent <= 0) {
        st.notify('You have learned nothing to take back.');
        return;
      }
      const cost = talentRespecCost(spent);
      if ((st.inventory.gold ?? 0) < cost) {
        st.notify(`Rethinking your training costs ${cost} gold.`);
        return;
      }
      st.addItems({ gold: -cost });
      set({ skillTree: [], dirty: true });
      audio.play('unlock', 0.7);
      st.notify(`↺ ${spent} talent point${spent > 1 ? 's' : ''} returned to you for ${cost} gold — learn them anew.`, true);
    },

    // player attributes (AI-wave-2 batch): points earned by total skill
    // level (one per ATTR_POINT_EVERY), invested permanently — the champion's
    // own layer of the same five-attribute system villagers carry
    spendAttrPoint: (id) => {
      const st = get();
      const earned = attrPointsEarned(totalSkillLevel(st.xp));
      if (attrPointsSpent(st.attrSpent) >= earned) {
        st.notify('No attribute points to spend — raise your skills further.');
        return;
      }
      const attrSpent = { ...st.attrSpent, [id]: (st.attrSpent[id] ?? 0) + 1 };
      set({ attrSpent, dirty: true });
      audio.play('unlock', 0.7);
      const def = PLAYER_ATTRS.find((a) => a.id === id)!;
      st.notify(`${def.icon} ${def.label} rises to ${attrSpent[id]} — ${def.blurb}.`, true);
    },

    // Wave 9 · the respec ROADMAP has listed as a follow-up since the
    // attribute layer shipped. Wholesale reset for a scaling gold fee — see
    // data/playerAttributes' respecCost for why full-reset and why scaling.
    // Nothing here needs a migration: `attrSpent` is an ordinary save field
    // already, and emptying it is just another value it could always have
    // held. Every consumer (combat.ts's stamina/melee, sale price, yield and
    // craft rolls) reads it live with a `?? 0`, so they all correct
    // themselves on the next read with no invalidation step.
    respecAttributes: () => {
      const st = get();
      const spent = attrPointsSpent(st.attrSpent);
      if (spent <= 0) {
        st.notify('You have invested nothing to take back.');
        return;
      }
      const cost = respecCost(spent);
      if ((st.inventory.gold ?? 0) < cost) {
        st.notify(`Rethinking your nature costs ${cost} gold.`);
        return;
      }
      st.addItems({ gold: -cost });
      set({ attrSpent: {}, dirty: true });
      audio.play('unlock', 0.7);
      st.notify(`↺ ${spent} attribute point${spent > 1 ? 's' : ''} returned to you for ${cost} gold — spend them anew.`, true);
    },

    checkDeeds: () => {
      const st = get();
      const snapshot = {
        inventory: st.inventory as Partial<Record<string, number>>,
        xp: st.xp,
        completedQuests: st.completedQuests,
        buildings: st.buildings,
        treasureOpened: st.treasureOpened,
        dragonSeen: st.dragonSeen,
        dragonSieges: st.dragonSieges,
        dragonRouted: st.dragonRouted,
        blackDragonSieges: st.blackDragonSieges,
        blackDragonRouted: st.blackDragonRouted,
        cedricSieges: st.cedricSieges,
        cedricRouted: st.cedricRouted,
        defeatedCedric: st.defeatedCedric,
        reputation: st.reputation,
      };
      let earned = st.deeds;
      for (const d of DEEDS) {
        if (earned.includes(d.id)) continue;
        if (!d.check(snapshot)) continue;
        earned = [...earned, d.id];
        st.notify(`${d.icon} Deed accomplished: ${d.name}!`, true);
        audio.play('treasure', 0.7);
      }
      if (earned !== st.deeds) set({ deeds: earned, dirty: true });
      // account-level crest unlocks: derived from earned deeds + lifetime
      // crypt clears, so saves from before this shipped back-fill on the
      // first deed check. unlockCrest() is true only when newly won.
      for (const u of CREST_UNLOCKS) {
        const met = u.deedId
          ? earned.includes(u.deedId)
          : st.stats.dungeonsCleared >= (u.dungeonClears ?? 1);
        if (met && unlockCrest(u.crestId)) {
          st.notify(`🛡️ Crest unlocked: ${crestLabel(u.crestId)} — yours in the creator, for every hero to come!`, true);
          audio.play('treasure', 0.7);
        }
      }
    },

    checkChallenges: () => {
      const st = get();
      let tiers = st.challengeTiers;
      for (const c of CHALLENGES) {
        const { tierIndex } = challengeProgress(c, st.stats);
        const known = tiers[c.id] ?? -1;
        if (tierIndex <= known) continue;
        // notify once per tier crossed in case several were skipped between
        // checks. Wave 52 (D5): every tier now pays a real gold+skill-XP
        // reward too (all three tiers, not just II/III — tier I was
        // previously payout-free for the 4 non-guild-linked tracks, which
        // was the more inconsistent state) — numbers indexed by tier
        // position (I/II/III), not by each track's own raw threshold, since
        // the tracks aren't on one comparable difficulty scale.
        for (let i = known + 1; i <= tierIndex; i++) {
          const r = c.skill ? CHALLENGE_TIER_REWARD[i] : { gold: GOLDEN_FORTUNE_GOLD[i], xp: 0 };
          st.notify(`${c.icon} Challenge: ${c.tiers[i].label}! +${r.gold}g${c.skill ? ` · +${r.xp} ${c.skill} XP` : ''}`, true);
          st.addItems({ gold: r.gold }, 'grant');
          if (c.skill) st.addXp(c.skill, r.xp);
        }
        tiers = { ...tiers, [c.id]: tierIndex };
        audio.play('treasure', 0.7);
      }
      if (tiers !== st.challengeTiers) set({ challengeTiers: tiers, dirty: true });
    },

    flushStats: (delta) => {
      const st = get();
      set({
        stats: {
          ...st.stats,
          distanceMeters: st.stats.distanceMeters + delta.distanceMeters,
          playtimeSec: st.stats.playtimeSec + delta.playtimeSec,
        },
        dirty: true,
      });
    },

    recordDungeonClear: () => {
      const st = get();
      set({ stats: { ...st.stats, dungeonsCleared: st.stats.dungeonsCleared + 1 }, dirty: true });
      get().checkDeeds(); // crest loot rides on lifetime clears
    },

    addXp: (skill, amount) => {
      const st = get();
      let scaled = st.perks.includes('quick_study') ? Math.round(amount * PERK_FX.quick_study.xpTimes) : amount;
      // tier-1 talents (Phase 21): +10% XP in that talent's own skill
      if (st.skillTree.includes(`${skill}1`)) scaled = Math.round(scaled * TALENT_FX.firstTierXpTimes);
      // calling signature skill (Phase 22): the trade you were raised in
      if (CLASS_BY_ID[st.character?.classId ?? '']?.signature === skill) scaled = Math.round(scaled * CALLING_FX.signatureXpTimes);
      const before = st.xp[skill];
      // I43 · XP scaling. Awards were FLAT — a skeleton paid 20 combat XP at
      // level 1 and at level 20 — while the curve is quadratic (50·L²), so
      // the gap between levels grows by 50(2L+1) every level. Constant
      // awards against a widening gap is what made early levels fly past and
      // later ones stall out.
      //
      // Scaling the award linearly with the skill's own level matches the
      // shape of the curve exactly, so a level costs roughly the same NUMBER
      // OF ACTIONS all the way up. This deliberately does not touch
      // xpForLevel/levelFromXp: changing the curve would re-rank every
      // existing save overnight.
      scaled = Math.round(scaled * (1 + levelFromXp(before) * 0.12));
      const xp = { ...st.xp, [skill]: before + scaled };
      const totalBefore = totalSkillLevel(st.xp);
      set({ xp, dirty: true });
      const lvBefore = levelFromXp(before);
      const lvAfter = levelFromXp(before + scaled);
      if (lvAfter > lvBefore) {
        st.notify(`${skill.charAt(0).toUpperCase() + skill.slice(1)} level ${lvAfter}!`, true);
        const totalAfter = totalSkillLevel(xp);
        // cedricCaptures is unchanged by this action — passed through as-is
        // so a level-driven crossing still respects Marshal's own extra gate
        const rBefore = rankFromTotalLevel(totalBefore, st.completedQuests, st.cedricCaptures);
        const rAfter = rankFromTotalLevel(totalAfter, st.completedQuests, st.cedricCaptures);
        announceRankChange(rBefore, rAfter);
      }
    },
  };
};
