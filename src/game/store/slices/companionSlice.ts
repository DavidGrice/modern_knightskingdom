// CLN-07 · the store's companion slice: Tam the squire (recruiting and greeting him, his gear, loadout and
// experience) and the falcon.
import type { ChestplateTier, DefenderLoadout, ItemId } from '../../types';
import { COMPANION_LINES, TAM_TITLE } from '../../data/companion';
import { DEFENDER_LOADOUTS, LOADOUT_REQUIRES } from '../../data/villagers';
import { CHESTPLATE_BY_TIER, CHESTPLATE_ITEM, chestplateTierOf } from '../../data/armor';
import { levelFromXp } from '../../data/ranks';
import { audio } from '@/lib/audio';
import { pick } from '@/lib/rng';
import type { SliceCreator } from './types';

export interface CompanionSlice {
  /** Wave 13 · tame the falcon companion — a no-op once already tamed,
   *  mirroring markDragonSeen/openTreasureChest's own one-way guard. */
  tameFalcon: () => void;
  /** Wave 25 · recruit Tam, the companion squire — a no-op once already
   *  recruited, byte-for-byte mirroring tameFalcon's own one-way guard.
   *  Called from turnInSideQuest() when Richard's 'r_squire' errand is
   *  turned in. */
  recruitCompanion: () => void;
  /** Wave 25 · Tam's own flavor-greet interact (PlayerController's
   *  'talk_companion' kind) — a random line from COMPANION_LINES, the
   *  content-level equivalent of an NpcDef's own `lines` array without
   *  dragging in DialoguePanel's stationary-NPC machinery (see
   *  PlayerController's own interact comment for why). */
  greetCompanion: () => void;

  /** Wave 54 (E2) · Tam's own combat-XP gain, mirroring `gainDefenderXp`
   *  exactly (same `levelFromXp` curve, same level-up notify) but targeting
   *  `st.companion` instead of indexing into `st.villagers`. Called once,
   *  from `assistLeader.ts`'s `strike()`, on every kill Tam lands. */
  gainCompanionXp: (amount: number) => void;
  /** Wave 54 (E2) · near-verbatim `equipVillagerGear`/`unequipVillagerGear`
   *  adaptations for Tam's helmet slot, drawing from the same shared
   *  Armory pool. */
  equipCompanionHelmet: () => void;
  unequipCompanionHelmet: () => void;
  /** Wave 54 (E2) · near-verbatim `equipVillagerChestplate`/
   *  `unequipVillagerChestplate` adaptations for Tam's chestplate slot. */
  equipCompanionChestplate: (tier: ChestplateTier) => void;
  unequipCompanionChestplate: () => void;
  /** Wave 54 (E2) · near-verbatim `setDefenderLoadout` adaptation for Tam's
   *  own weapon choice — same Armory spend/refund logic, `'bow'` excluded
   *  (see `CompanionState.loadout`'s own doc comment in types.ts for why). */
  setCompanionLoadout: (loadout: Exclude<DefenderLoadout, 'bow'>) => void;
  unequipCompanionLoadout: () => void;
}

export const createCompanionSlice: SliceCreator<CompanionSlice> = (set, get) => {
  return {
    // Wave 54 (E2) — Tam's own independent progression. Near-verbatim
    // adaptations of the villager/defender actions (villagerSlice.ts), targeting
    // `st.companion` instead of `st.villagers.map(...)` — see types.ts's
    // `CompanionState` doc comment for why this is a separate top-level
    // record rather than literal roster membership.
    gainCompanionXp: (amount) => {
      const st = get();
      const xp = (st.companion.xp ?? 0) + amount;
      const levelBefore = levelFromXp(st.companion.xp ?? 0);
      const levelAfter = levelFromXp(xp);
      set({ companion: { ...st.companion, xp, level: levelAfter }, dirty: true });
      if (levelAfter > levelBefore) st.notify(`Tam has grown stronger! (Lv ${levelAfter})`, true);
    },

    equipCompanionHelmet: () => {
      const st = get();
      const item: ItemId = 'helmet';
      const stock = st.armory[item] ?? 0;
      if (st.companion.gear?.helmet) return; // already wearing one
      if (stock <= 0) {
        st.notify('The Armory has no spare helmets.');
        return;
      }
      set({
        companion: { ...st.companion, gear: { ...st.companion.gear, helmet: true } },
        armory: { ...st.armory, [item]: stock - 1 },
        dirty: true,
      });
      audio.play('brick_connect', 0.6);
      st.notify('Tam dons a helmet from the Armory.');
    },

    unequipCompanionHelmet: () => {
      const st = get();
      if (!st.companion.gear?.helmet) return;
      const item: ItemId = 'helmet';
      set({
        companion: { ...st.companion, gear: { ...st.companion.gear, helmet: false } },
        armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 },
        dirty: true,
      });
      audio.play('brick_collide', 0.5);
      st.notify('Tam returns the helmet to the Armory.');
    },

    equipCompanionChestplate: (tier) => {
      const st = get();
      const worn = chestplateTierOf(st.companion.gear);
      if (worn === tier) return;
      const def = CHESTPLATE_BY_TIER[tier];
      if ((st.armory[def.item] ?? 0) <= 0) {
        st.notify(`The Armory has no spare ${def.label.toLowerCase()}.`);
        return;
      }
      const armory = { ...st.armory };
      if (worn) {
        const old = CHESTPLATE_ITEM[worn];
        armory[old] = (armory[old] ?? 0) + 1;
      }
      armory[def.item] = (armory[def.item] ?? 0) - 1;
      set({ companion: { ...st.companion, gear: { ...st.companion.gear, chestplate: tier } }, armory, dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`Tam buckles on the ${def.label} — ${def.blurb}`);
    },

    unequipCompanionChestplate: () => {
      const st = get();
      const worn = chestplateTierOf(st.companion.gear);
      if (!worn) return;
      const item = CHESTPLATE_ITEM[worn];
      set({
        companion: { ...st.companion, gear: { ...st.companion.gear, chestplate: false } },
        armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 },
        dirty: true,
      });
      audio.play('brick_collide', 0.5);
      st.notify(`Tam returns the ${CHESTPLATE_BY_TIER[worn].label.toLowerCase()} to the Armory.`);
    },

    setCompanionLoadout: (loadout) => {
      const st = get();
      if (st.companion.loadout === loadout) return;
      const need = LOADOUT_REQUIRES[loadout];
      for (const [id, n] of Object.entries(need)) {
        if ((st.armory[id as ItemId] ?? 0) < (n as number)) {
          st.notify('Not enough in the Armory to arm Tam that way.');
          return;
        }
      }
      const armory = { ...st.armory };
      if (st.companion.loadout) {
        for (const [id, n] of Object.entries(LOADOUT_REQUIRES[st.companion.loadout])) {
          armory[id as ItemId] = (armory[id as ItemId] ?? 0) + (n as number);
        }
      }
      for (const [id, n] of Object.entries(need)) {
        armory[id as ItemId] = (armory[id as ItemId] ?? 0) - (n as number);
      }
      set({ companion: { ...st.companion, loadout }, armory, dirty: true });
      const label = DEFENDER_LOADOUTS.find((d) => d.id === loadout)?.label ?? loadout;
      st.notify(`Tam is armed with ${label} from the Armory.`);
    },

    unequipCompanionLoadout: () => {
      const st = get();
      if (!st.companion.loadout) return;
      const armory = { ...st.armory };
      for (const [id, n] of Object.entries(LOADOUT_REQUIRES[st.companion.loadout])) {
        armory[id as ItemId] = (armory[id as ItemId] ?? 0) + (n as number);
      }
      set({ companion: { ...st.companion, loadout: undefined }, armory, dirty: true });
      st.notify('Tam returns his weapon to the Armory — bare-handed for now.');
    },

    tameFalcon: () => {
      const st = get();
      if (st.falconTamed) return;
      set({ falconTamed: true, dirty: true });
      audio.play('falcon', 0.8);
      st.notify('The falcon lands and stays — it will watch the land for you now.', true);
    },

    recruitCompanion: () => {
      const st = get();
      if (st.companionRecruited) return;
      set({ companionRecruited: true, dirty: true });
      audio.play('villager', 0.7);
      st.notify(`Tam kneels, then rises at your side — ${TAM_TITLE}, from this day.`, true);
    },

    greetCompanion: () => {
      const line = pick(COMPANION_LINES);
      audio.play('villager', 0.7, false);
      get().notify(line, true);
    },
  };
};
