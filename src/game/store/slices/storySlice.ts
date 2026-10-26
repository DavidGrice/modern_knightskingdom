// CLN-07 · the store's story slice: allegiance and reputation, the guilds, Cedric's and Leo's arcs, Richard's joust,
// lore, and the dragons' and Cedric's sieges.
import type { Alliance, ItemId } from '../../types';
import { NPC_BY_ID, sideQuestBlocker, sideQuestsOf } from '../../data/npcs';
import { GUILD_BY_ID, guildEligible, guildRankIndex, SWITCH_TITHE } from '../../data/guilds';
import { ITEMS } from '../../data/items';
import { rankFromTotalLevel, totalSkillLevel } from '../../data/ranks';
import { audio } from '@/lib/audio';
import { playerState } from '../../playerState';
import { ALLEGIANCE_MAX, ALLEGIANCE_MIN, allegianceTier } from '../../data/allegiance';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

// CLN-04 · a 3 s performance.now throttle on Richard's joust (joustRichard) — nothing to reset on a session start.
// (The id counters and the undo stack this sat among are in storeCounters.ts.)
let lastJoustAt = 0;

export interface StorySlice {
  /** shift the axis and tell the player why it moved */
  shiftAllegiance: (delta: number, reason: string) => void;
  /** Wave 22: an errand turn-in for a guild id adds here instead of to
   *  `reputation` (see turnInSideQuest's branch); notifies + a small gold
   *  cheer on a genuine rank-up, mirroring addReputation's own tier guard. */
  addGuildRep: (guildId: string, amount: number) => void;
  /** Wave 22: guild vendor purchase — re-checks real membership and looks up
   *  the offer's own rank gate straight off data/guilds.ts (never trusting a
   *  stale panel's own idea of what's unlocked, same defense-in-depth
   *  convention acceptSideQuest documents), then delegates to buyOffer for
   *  the actual gold math (Silver Tongue discount included for free). */
  buyGuildOffer: (guildId: string, item: ItemId, qty: number, price: number) => void;

  joustRichard: () => void;

  markDragonSeen: () => void;
  recordDragonSiege: (routed: boolean) => void;
  /** Wave 36 (A8): the black dragon's own siege resolution. Mirrors
   *  recordDragonSiege exactly. */
  recordBlackDragonSiege: (routed: boolean) => void;
  /** Cedric's Siege: a homestead siege ended — routed before the timer, or
   *  endured to its end. Mirrors recordDragonSiege exactly. */
  recordCedricSiege: (routed: boolean) => void;

  addReputation: (npcId: string, amount: number) => void;

  markLoreSeen: (npcId: string) => void;
  /** Wave 50 (C2) · `legendaryDrop` is a value combat.ts already rolled
   *  (bossEncounter.ts's rollBossLegendaryDrop, only on the one-shot capstone
   *  win) and merely hands in here — see this action's own body comment for
   *  why the roll can't be computed in THIS file. null/undefined = no drop
   *  (every rematch, and a capstone that simply missed the roll). */
  markCedricDefeated: (legendaryDrop?: ItemId | null) => void;
  /** Wave 38 (A1): a jailed Cedric breaks free — see cedricSiege.ts's
   *  cedricJailbreakAllowed for the gate that decides when this may fire. */
  freeCedric: () => void;
  pledgeAlliance: (side: Alliance) => void;
  /** Wave 13 · the one turncoat move that wave shipped: a knight already
   *  sworn to Cedric can turn on his own camp and return to unsworn ground,
   *  free to pledge Leo properly afterwards. One-directional and permanent.
   *  Wave 56 (F4) built the mirror — see `betrayLeo` below — once the
   *  interact branch that used to greet a Leo-sworn knight at Cedric's camp
   *  with an instant duel was redesigned into a real parley. Unlike this
   *  action (which returns you to UNSWORN, a separate later step to pledge
   *  Leo), `betrayLeo` completes the join to Cedric in one step — see its
   *  own doc comment for why. */
  betrayCedric: () => void;
  /** Wave 56 (F4) · the mirror of betrayCedric: a Leo-sworn knight defects
   *  to Cedric at his own camp — the parley branch challenge_cedric never
   *  had for a Leo-sworn approach. Unlike betrayCedric (which returns you
   *  to UNSWORN), this completes the join in one step, matching the exact
   *  "Clasp arms with Cedric" call-to-action the unsworn branch already
   *  commits immediately via pledgeAlliance('cedric'). */
  betrayLeo: () => void;
  joinGuild: (guildId: string) => void;
}

export const createStorySlice: SliceCreator<StorySlice> = (set, get) => {
  const { bumpSideQuest, announceRankChange } = sharedActions(set, get);

  return {
    shiftAllegiance: (delta, reason) => {
      if (!delta) return;
      const st = get();
      const before = st.allegiance;
      const after = Math.max(ALLEGIANCE_MIN, Math.min(ALLEGIANCE_MAX, before + delta));
      if (after === before) return;
      set({ allegiance: after, dirty: true });
      const toward = delta > 0 ? 'the crown' : 'the Bull';
      st.notify(`${reason} — your name carries further with ${toward}.`);
      // crossing into a new band is worth saying out loud; it changes what
      // people will offer you
      const wasTier = allegianceTier(before);
      const nowTier = allegianceTier(after);
      if (wasTier.title !== nowTier.title) {
        st.notify(`You are now known as: ${nowTier.title}.`, true);
      }
    },

    joustRichard: () => {
      const st = get();
      const now = performance.now();
      if (now - lastJoustAt < 3000) return; // a beat to recover the lance between passes
      lastJoustAt = now;
      const richard = NPC_BY_ID['richard'];
      const d = Math.hypot(richard.x - playerState.x, richard.z - playerState.z);
      // a real lance has a sweet-spot reach (~2.2m) — too close or too far
      // scuffs the hit, same "timing" skill as a real pass down the list
      const precision = Math.max(0, 1 - Math.abs(d - 2.2) / 1.4) * (0.75 + Math.random() * 0.25);
      audio.play('thud', 0.8);
      if (precision < 0.25) {
        st.notify('Your lance goes wide — no hit!');
        st.addXp('combat', 8);
        return;
      }
      st.pokeNpc('richard', 'anim_g_fallbackward');
      if (precision < 0.55) {
        st.notify('A glancing blow!', true);
        st.addItems({ gold: 5 }, 'grant');
        st.addXp('combat', 25);
        st.addReputation('richard', 4);
      } else if (precision < 0.85) {
        st.notify('A solid hit! Richard salutes the pass.', true);
        st.addItems({ gold: 15 }, 'grant');
        st.addXp('combat', 55);
        st.addReputation('richard', 8);
        bumpSideQuest('joust', 'any', 1); // his lists errand counts solid+ passes
      } else {
        audio.play('horn', 0.7);
        st.notify('A perfect strike! Richard yields the pass.', true);
        st.addItems({ gold: 30 }, 'grant');
        st.addXp('combat', 90);
        st.addReputation('richard', 14);
        bumpSideQuest('joust', 'any', 1);
      }
    },

    markLoreSeen: (npcId) => {
      const st = get();
      if (st.loreSeen.includes(npcId)) return;
      set({ loreSeen: [...st.loreSeen, npcId], dirty: true });
    },

    // called from combat.ts alongside the generic kill notify/XP (see
    // KIND_XP.cedric there) — this adds the capstone (first time) or
    // rematch (thereafter) material reward, flags him jailed, and gives the
    // "safely behind bars" story beat its own line. Wave 38 (A1): no longer
    // a one-time-only guard — `defeatedCedric` now means "currently jailed",
    // not "permanently done" (see freeCedric below), so this can fire again
    // after every jailbreak. Reward numbers are inline literals, not
    // bossEncounter.ts's BOSS_VICTORY_REWARD.cedric, deliberately: that
    // module reads difficulty.ts which reads THIS store, so importing it
    // from here would be a real cycle (gameStore -> bossEncounter ->
    // difficulty -> gameStore) — combat.ts/the siege components are the
    // correct, cycle-safe place to read that table instead.
    markCedricDefeated: (legendaryDrop) => {
      const st = get();
      if (st.defeatedCedric) return;
      const first = st.cedricCaptures === 0;
      set({
        defeatedCedric: true,
        cedricCaptures: st.cedricCaptures + 1,
        cedricCapturedAtDay: st.dayCount,
        dirty: true,
      });
      audio.play('treasure', 0.9);
      audio.play('horn', 1);
      if (first) {
        // Wave 52 (D1): this is the ONLY moment cedricCaptures can cross
        // 0 -> 1, which is Marshal's own real gate (ranks.ts) — and this
        // action never calls addXp, so without this explicit check a rank
        // crossed purely by this capture (level floor already met) would
        // grant no ceremony/notify/perk-nudge until some unrelated later XP
        // tick. announceRankChange is the same helper addXp itself uses.
        const totalLv = totalSkillLevel(st.xp);
        announceRankChange(
          rankFromTotalLevel(totalLv, st.completedQuests, st.cedricCaptures),
          rankFromTotalLevel(totalLv, st.completedQuests, st.cedricCaptures + 1),
        );
        // the capstone payout for finishing the whole arc (a weathered
        // homestead siege first, then this) — bigger than any rematch
        st.addItems({ gold: 250, iron_bar: 10, stone: 20 }, 'grant');
        st.grantArmory('halberd', 1);
        st.grantArmory('chestplate', 1);
        st.shiftAllegiance(35, "You ended Cedric's rebellion at his own camp");
        st.notify("🔒 Cedric's rebellion ends here — the Bull is dragged in chains at last!", true);
        // Wave 50 (C2): a real chance at his own halberd, now legendary — the
        // roll itself lives in combat.ts (which safely imports
        // bossEncounter.ts) and is passed in as a plain value, since THIS
        // file cannot import bossEncounter.ts without a real cycle
        // (gameStore -> bossEncounter -> difficulty -> gameStore, see this
        // action's own long-standing comment above). Capstone-only — never
        // rolled on a rematch, matching this whole branch's own one-shot gate.
        if (legendaryDrop) {
          st.addItems({ [legendaryDrop]: 1 }, 'grant');
          st.notify(`✨ Among his chained effects: a ${ITEMS[legendaryDrop].name}!`, true);
        }
      } else {
        // a real but smaller stake each time he's recaptured — mirrors
        // bossEncounter.ts's BOSS_VICTORY_REWARD.cedric verbatim
        st.addItems({ gold: 70, iron_bar: 4, plank: 6, stone: 6 }, 'grant');
        st.addXp('combat', 90);
        st.notify('🔒 Cedric the Bull is dragged back to his cell — recaptured, for now.', true);
      }
    },

    // Wave 38 (A1): the other half of the jailbreak loop — CedricSiege.tsx
    // rolls this nightly once cedricSiege.ts's cedricJailbreakAllowed says
    // his cooldown has elapsed. Every Cedric-arc gate already reads
    // `defeatedCedric` reactively, so flipping it back to false alone is
    // enough to re-show the idle boss, camp guards and the "Challenge
    // Cedric" interact prompt with no further changes.
    freeCedric: () => {
      set({ defeatedCedric: false, dirty: true });
      get().notify("Word reaches you: Cedric the Bull has broken free of his chains and returned to his camp!", true);
      audio.play('warcry', 0.7);
    },

    // Phase 21 guilds: join free the first time (if the matching Challenge
    // tier is earned — the hall panel gates the button, this re-checks),
    // change banners later for a gold tithe. One primary guild at a time.
    joinGuild: (guildId) => {
      const st = get();
      if (st.guild === guildId) return;
      const def = GUILD_BY_ID[guildId];
      if (!def) return;
      if (!guildEligible(def, st.stats)) {
        st.notify('The guild door stays shut — prove yourself on their challenge first.');
        return;
      }
      if (st.guild) {
        if ((st.inventory.gold ?? 0) < SWITCH_TITHE) {
          st.notify(`Changing banners costs a ${SWITCH_TITHE} gold tithe.`);
          return;
        }
        st.addItems({ gold: -SWITCH_TITHE });
      }
      set({ guild: guildId, dirty: true });
      audio.play('horn', 0.8);
      st.notify(`🏛 You now carry the banner of the ${def.name}!`, true);
    },

    // Wave 22 · rank within a guild. Mirrors addReputation's own shape
    // exactly (tier lookup, "only a step UP is a cheer" guard, a small gold
    // reward) but writes the parallel `guildRanks` record instead — see that
    // field's own doc comment for why this is not just addReputation keyed
    // by a guild id.
    addGuildRep: (guildId, amount) => {
      const st = get();
      const guild = GUILD_BY_ID[guildId];
      if (!guild) return;
      const before = st.guildRanks[guildId] ?? 0;
      const after = before + amount;
      set({ guildRanks: { ...st.guildRanks, [guildId]: after }, dirty: true });
      const tierBefore = guildRankIndex(guild, before);
      const tierAfter = guildRankIndex(guild, after);
      if (tierAfter > tierBefore) {
        audio.play('villager', 0.7);
        st.notify(`${guild.name} now sees you as: ${guild.rankTitles[tierAfter].title}!`, true);
        st.addItems({ gold: 10 }, 'grant');
      }
    },

    // Wave 22 · guild vendor purchase. Re-checks membership AND looks the
    // offer's own rank gate up fresh off data/guilds.ts rather than trusting
    // whatever a (possibly stale) panel passed in, then hands off to the
    // existing buyOffer for the actual gold math — one source of truth for
    // that, Silver Tongue discount included for free.
    buyGuildOffer: (guildId, item, qty, price) => {
      const st = get();
      const guild = GUILD_BY_ID[guildId];
      if (!guild || st.guild !== guildId) {
        st.notify('Only members of this guild may buy here.');
        return;
      }
      const offer = guild.vendor.find((o) => o.item === item && o.qty === qty && o.price === price);
      if (!offer) return;
      const rank = guildRankIndex(guild, st.guildRanks[guildId] ?? 0);
      if ((offer.minRank ?? 0) > rank) {
        st.notify('Not trusted with that yet — rise in rank first.');
        return;
      }
      st.buyOffer(item, qty, price);
    },

    // Phase 19 alliance branch: a one-way pledge — no CASUAL re-swearing
    // (Wave 13 adds exactly one deliberate exception: betrayCedric below).
    // The raid system reads this to decide WHO attacks the homestead:
    // pledge to Cedric and the crown's knights come for you; pledge to Leo
    // (or stay unsworn) and the bandit/Cedric raids continue as before.
    pledgeAlliance: (side) => {
      const st = get();
      if (st.alliance) return;
      // Wave 13 · a knight who already turned on Cedric once (betrayCedric)
      // can never clasp arms with him again — otherwise defecting would be
      // a free way to ping-pong between both pledges' exclusive rewards.
      if (side === 'cedric' && st.betrayedCedric) {
        st.notify("Cedric's camp wants nothing to do with a known turncoat.");
        return;
      }
      // Wave 56 (F4) · the mirror check: a knight who already turned on the
      // crown once (betrayLeo) can never kneel to Leo again — same
      // ping-pong protection as betrayedCedric above, in the other direction.
      if (side === 'leo' && st.betrayedLeo) {
        st.notify('The crown does not forgive a knight who turned his blade against it.');
        return;
      }
      set({ alliance: side, panel: 'none', dirty: true });
      audio.play('horn', 0.9);
      if (side === 'leo') {
        st.notify('👑 You kneel before King Leo. Your sword belongs to the crown!', true);
      } else {
        audio.playVoice('greeting_cedric', 0.85);
        st.notify('🐂 You clasp arms with Cedric the Bull. The crown will name you traitor!', true);
        // Wave 13 alliance follow-up: pledging Cedric used to cost nothing
        // against the OTHER side — the raid AI flips (a strict benefit) but
        // Richard and the Queen's opinion of you never moved, even though
        // you just swore to the man raiding their kingdom. A real dip, not
        // a cosmetic one — see addReputation's own tier-crossing guard for
        // why a negative amount is safe to pass here.
        st.addReputation('richard', -20);
        st.addReputation('queen', -20);
        st.notify("Word reaches Richard and the Queen — your standing with the crown's household has soured.");
      }
    },

    // Wave 13 · the one turncoat move this wave ships — see this action's
    // own interface doc comment for why it is one-directional. Only ever
    // reachable from ParleyPanel's War Council branch, which only renders
    // at Cedric's own camp with alliance === 'cedric' already true, so no
    // extra location/state guard is needed here beyond the alliance check.
    betrayCedric: () => {
      const st = get();
      if (st.alliance !== 'cedric') return;
      set({
        alliance: null, betrayedCedric: true, panel: 'none', dirty: true,
        // burn the rebellion errand you were carrying too, if any — you
        // don't get to finish a job for a war council you just turned on
        sideQuest: st.sideQuest?.npcId === 'cedric' ? null : st.sideQuest,
      });
      audio.play('horn', 0.9);
      st.notify("🗡 You turn on Cedric's rebellion — the Bull will never trust you again, but the crown might.", true);
      st.shiftAllegiance(20, "You turned your blade on the Bull's own camp");
    },

    // Wave 56 (F4) · the mirror of betrayCedric above — see this action's
    // own interface doc comment for why it completes the join in one step
    // rather than returning to unsworn first. Only ever reachable from
    // ParleyPanel's new Leo-sworn branch, which only renders at Cedric's own
    // camp with alliance === 'leo' already true, so no extra location guard
    // is needed here beyond the alliance check.
    betrayLeo: () => {
      const st = get();
      if (st.alliance !== 'leo') return;
      // ends in the exact same alliance:'cedric' state pledgeAlliance('cedric')
      // already guards against for a known turncoat — refuse the same way.
      if (st.betrayedCedric) {
        st.notify("Cedric's camp wants nothing to do with a known turncoat.");
        return;
      }
      // burn the errand you were carrying too, if it no longer qualifies now
      // that you're Cedric's — unlike betrayCedric (whose whole War Council
      // pool is npcId==='cedric' by construction, so a plain id check is
      // exact), Leo's side hands out plenty of ordinary errands that have
      // nothing to do with the pledge itself (only the crown's own capstone,
      // needsAlliance:'leo', actually requires it) — so this checks the real
      // gate under the NEW alliance rather than guessing a fixed npcId list.
      const activeDef = st.sideQuest
        ? sideQuestsOf(st.sideQuest.npcId).find((q) => q.id === st.sideQuest!.questId) : null;
      const stillValid = !!activeDef
        && !sideQuestBlocker(
          activeDef, st.completedSideQuests, st.completedQuests, st.allegiance, 'cedric',
          st.reputation[st.sideQuest!.npcId] ?? 0,
        );
      set({
        alliance: 'cedric', betrayedLeo: true, panel: 'none', dirty: true,
        sideQuest: stillValid ? st.sideQuest : null,
      });
      audio.play('horn', 0.9);
      audio.playVoice('greeting_cedric', 0.85);
      st.notify('🗡 You turn your blade against the crown you swore it to — Cedric grins: "Welcome home."', true);
      st.addReputation('richard', -30);
      st.addReputation('queen', -30);
      st.notify('Word of your betrayal reaches Richard and the Queen — the crown will not forget this.');
      st.shiftAllegiance(-25, 'You turned your blade against the crown you were sworn to');
    },

    addReputation: (npcId, amount) => {
      const st = get();
      const npc = NPC_BY_ID[npcId];
      if (!npc?.repTitles) return;
      const before = st.reputation[npcId] ?? 0;
      const after = before + amount;
      set({ reputation: { ...st.reputation, [npcId]: after }, dirty: true });
      const tierAt = (rep: number) => [...npc.repTitles!].reverse().find((t) => rep >= t.min);
      const tierBefore = tierAt(before);
      const tierAfter = tierAt(after);
      // Wave 13 · only a genuine step UP is an "achievement" worth a cheer
      // and a purse. Every call site before this wave only ever passed a
      // positive amount, so this guard was never exercised — but the
      // alliance reputation fallout (pledgeAlliance) is the first caller to
      // pass a negative one, and without the `.min` comparison a downward
      // dip that still lands on a real (lower) tier boundary would fire the
      // same "now sees you as" toast and hand out gold for LOSING standing.
      if (tierAfter && (!tierBefore || tierAfter.min > tierBefore.min)) {
        audio.play('villager', 0.7);
        st.notify(`${npc.name} now sees you as: ${tierAfter.title}!`, true);
        st.addItems({ gold: 10 }, 'grant');
      }
    },

    markDragonSeen: () => {
      if (get().dragonSeen) return;
      set({ dragonSeen: true, dirty: true });
    },

    recordDragonSiege: (routed) => {
      const st = get();
      set({
        dragonSieges: st.dragonSieges + 1,
        dragonRouted: st.dragonRouted || routed,
        dirty: true,
      });
      get().checkDeeds();
    },

    recordBlackDragonSiege: (routed) => {
      const st = get();
      set({
        blackDragonSieges: st.blackDragonSieges + 1,
        blackDragonRouted: st.blackDragonRouted || routed,
        dirty: true,
      });
      get().checkDeeds();
    },

    recordCedricSiege: (routed) => {
      const st = get();
      set({
        cedricSieges: st.cedricSieges + 1,
        cedricRouted: st.cedricRouted || routed,
        dirty: true,
      });
      get().checkDeeds();
    },
  };
};
