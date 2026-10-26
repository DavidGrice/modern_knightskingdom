// CLN-07 · the store's villager slice: recruiting and arrival, jobs and beds, gear, looks and traits, defenders, and
// the villagers' work tick and trade experience. (A dye row is opened for the whole save: the goods slice's unlockDye.)
import type {
  CarrierTier, ChestplateTier, DefenderLoadout, ItemId, PlacedBuilding, ResourceNodeState, Villager, VillagerJob,
} from '../../types';
import { isBuilt, isHomeBuilding } from '../../types';
import { roadEntry } from '../../data/road';
import { arriveByRoad, villagerMobs } from '../../villagerMobs';
import { npcMobs } from '../../npcMobs';
import { workSignals } from '../../workSignal';
import { PERK_FX } from '../../data/effects';
import { attrsOf, tradeLevelOf, tradeXpOf, tripSpeedMult, SIDE_GOODS } from '../../data/attributes';
import { bestStore } from '../../storage';
import {
  COMPANION_TRAIT_BY_ID, HAUL_TRAIT, SIDE_TRAIT, hasTrait, traitSlots, traitsOwnedInJob, tripTraitMult,
} from '../../data/companionTraits';
import {
  CARRIER_ITEM, CARRIERS, DEFENDER_LOADOUTS, isWorkingHours, JOB_BY_ID, JOB_NODE_KIND, LOADOUT_REQUIRES,
  MAX_VILLAGERS, settlementAnchor, VILLAGER_NAMES, villagerHomeSpot, villagerRequirement,
} from '../../data/villagers';
import { ITEMS } from '../../data/items';
import { CHESTPLATE_BY_TIER, CHESTPLATE_ITEM, chestplateTierOf } from '../../data/armor';
import { BUILDABLE_BY_ID } from '../../data/buildables';
import { levelFromXp } from '../../data/ranks';
import { audio } from '@/lib/audio';
import { worldEnv } from '../../env';
import { seq } from '../storeCounters';
import type { GameState } from '../gameStore';
import type { SliceCreator } from './types';

/** L66 · how close a worker has to be for the work to count */
const WORK_RANGE = 6;

/**
 * Is this villager actually somewhere their trade can be plied? Their walk
 * (Villagers.tsx) already sends them out to a worksite and back to the
 * stores; this asks whether they have arrived at either end. A worker with no
 * worksite at all (every tree felled) counts as working so the economy does
 * not silently stall on a respawn window.
 */
function villagerAtWork(
  v: Villager,
  st: GameState,
  worldBuildings: PlacedBuilding[],
): boolean {
  // §4 (phase 5, 5.8a): a real GatherAtNode/HaulToDeposit activity in its
  // align/perform phase is a FACT ("reserved on node:17, actively working
  // it"), not an inference from proximity — trust it ahead of the heuristic
  // below rather than running both. Wave 10 widened who can set it: the two
  // new node trades (herbalist/fisherman) via gather_resource's job_match, and
  // the farmer via the new tend_farmplot Activity (ai/actions/farm.ts), on top
  // of the original lumberjack/miner. Merchant and builder still fall straight
  // through to the unchanged heuristic below, exactly as before 5.8a — as does
  // anyone whose signal is absent or inactive (outside work hours, no
  // reachable node, threatened, mid-travel, or walking a stranded load home
  // under seek_deposit, which is travel and deliberately publishes nothing).
  if (workSignals[v.id]?.active) return true;
  const m = villagerMobs[v.id];
  if (!m) return true; // not spawned in the world yet — nothing to be far from
  const near = (x: number, z: number) => Math.hypot(m.x - x, m.z - z) <= WORK_RANGE;
  // the stores end of the round trip counts for every trade (Wave 9: a
  // Storehouse is the stores too, and outranks a Stockpile — see bestStore)
  const store = bestStore(worldBuildings);
  if (store && near(store.x, store.z)) return true;
  // Empire arc, Wave 3: was a hardcoded HOME_X/HOME_Z check — now the
  // villager's own settlement anchor (still HOME_X/HOME_Z for every
  // villager today, since none carries a `world` yet; see settlementAnchor's
  // own doc comment).
  const anchor = settlementAnchor(v.world, st.claimedWorlds);
  if (near(anchor.x, anchor.z)) return true;
  // Wave 10 · was an inline lumberjack/miner ternary; now the shared
  // JOB_NODE_KIND table (data/villagers.ts), so the two new node-working
  // trades are held to the SAME standing-at-a-node requirement rather than
  // falling through to the blanket `return true` at the bottom of this
  // function — which would have granted an herbalist or fisherman their whole
  // per-trip yield on the timer alone, from anywhere on the map. That is the
  // exact "felling a hundred metres from the nearest tree" bug L66 fixed for
  // the original two trades, and adding a job without adding its case here is
  // how it would have come straight back.
  const nodeKind = JOB_NODE_KIND[v.job];
  if (nodeKind) {
    // Wave 26 · explicit `world` filter, added as cheap hygiene now that a
    // second real per-world node consumer exists (The Frozen Pass). This was
    // ALREADY correct by geometry alone — `near()` tests the mob's own real
    // rendered position, and a destination's nodes sit thousands of units
    // from the homestead's, so a home villager could never actually pass
    // this check against a remote node or vice versa — but an implicit
    // guarantee from distance alone is not the same as a real scoping rule,
    // and this costs nothing to make explicit.
    const sameWorld = (n: ResourceNodeState) => (n.world ?? null) === (v.world ?? null);
    const any = st.nodes.some((n) => n.kind === nodeKind && !n.respawnAt && sameWorld(n));
    if (!any) return true; // nothing to work — do not stall the economy
    return st.nodes.some((n) => n.kind === nodeKind && !n.respawnAt && sameWorld(n) && near(n.x, n.z));
  }
  if (v.job === 'farmer') {
    const plot = worldBuildings.find((b) => b.type === 'farmplot' && isBuilt(b));
    return !plot || near(plot.x, plot.z);
  }
  if (v.job === 'merchant') {
    const stall = worldBuildings.find((b) => b.type === 'market_stall' && isBuilt(b));
    return !stall || near(stall.x, stall.z);
  }
  return true;
}

export interface VillagerSlice {
  equippingVillagerId: string | null; // villager shown in the NPC equip paperdoll (transient, never saved)
  villagerProgress: Record<string, number>; // villagerId -> seconds until next delivery

  chooseTrait: (villagerId: string, traitId: string) => void;
  tickVillagers: (dt: number) => void;
  checkVillagerArrival: () => void;
  recruitVillageFolk: (npcId: 'farmer_alric' | 'miller_beda') => void;
  openVillagerEquip: (villagerId: string) => void;
  grantArmory: (item: ItemId, qty: number) => void;
  donateToArmory: (item: ItemId, qty: number) => void;
  equipVillagerGear: (villagerId: string, slot: 'helmet' | 'chestplate') => void;
  unequipVillagerGear: (villagerId: string, slot: 'helmet' | 'chestplate') => void;
  /** Wave 9 armor tiers — the tiered half of the chestplate slot. The pair
   *  above still works and still means the plain iron plate (they delegate
   *  here), so the Armory's drag-and-drop and every older caller are
   *  unchanged; this is what a tier button in the Roster calls. */
  equipVillagerChestplate: (villagerId: string, tier: ChestplateTier) => void;
  unequipVillagerChestplate: (villagerId: string) => void;
  setVillagerLook: (villagerId: string, look: Partial<NonNullable<Villager['look']>>) => void;
  resetVillagerLook: (villagerId: string) => void;
  assignJob: (villagerId: string, job: VillagerJob) => void;
  /** the villager's owned bed if they have one, else claims the first free
   *  one (persisted on the building itself, see `PlacedBuilding.owner`),
   *  else their own fixed home spot if no bed is available at all */
  claimBed: (villagerId: string) => { x: number; z: number };
  setDefenderLoadout: (villagerId: string, loadout: DefenderLoadout) => void;
  unequipDefenderLoadout: (villagerId: string) => void;
  /** Wave 9 carriers — tiered, not boolean, so these mirror the loadout pair
   *  directly above (auto-refund on a swap) rather than equipVillagerGear. */
  equipVillagerCarrier: (villagerId: string, tier: CarrierTier) => void;
  unequipVillagerCarrier: (villagerId: string) => void;
  stationDefender: (villagerId: string, buildingId: string | null) => void;
  setDefenderShift: (villagerId: string, shift: 'day' | 'night') => void;
  gainDefenderXp: (villagerId: string, amount: number) => void;

  /** Phase 5, iteration 5.8b — the trade-mastery half of a completed trip,
   *  extracted out of tickVillagers' own inline block (it was hardcoded
   *  there, flagged during phase-5 validation as a real continuity risk)
   *  so `HaulToDeposit`'s real deposit (haul.ts) can grant the same +10
   *  per completed haul that tickVillagers grants per completed timer-trip
   *  — an AI-migrated villager must not silently stop leveling just
   *  because their yield now comes from a real haul instead of the old
   *  timer. No-ops for a villager with no matching record or job 'idle'. */
  awardTradeXp: (villagerId: string, amount: number) => void;
}

export const createVillagerSlice: SliceCreator<VillagerSlice> = (set, get) => {
  return {
    equippingVillagerId: null,

    villagerProgress: {},

    // companion traits (AI-wave-2 batch): a villager's own mini skill tree —
    // one slot per 2 mastery levels in their current trade, chosen here
    chooseTrait: (villagerId, traitId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      const def = COMPANION_TRAIT_BY_ID[traitId];
      if (!v || !def) return;
      if (def.job !== v.job) return;
      if (hasTrait(v, traitId)) return;
      if (traitsOwnedInJob(v) >= traitSlots(v)) {
        st.notify(`${v.name} must master their trade further before learning another trait.`);
        return;
      }
      const villagers = st.villagers.map((x) =>
        x.id === villagerId ? { ...x, traits: [...(x.traits ?? []), traitId] } : x);
      set({ villagers, dirty: true });
      audio.play('treasure', 0.7);
      st.notify(`${def.icon} ${v.name} learns ${def.name} — ${def.desc}!`, true);
    },

    // Alric & Beda (2026-07-20): the two always-present starter villagers
    // used to be pure decoration — a greeting and nothing else. They now have
    // a real path onto the roster, bypassing the usual bed/building gate
    // entirely (they already live in their own huts, see StarterVillage.tsx)
    // — a quest-flavored, one-time recruitment instead. Once joined they
    // stop rendering as a standalone NpcDef (see Npc.tsx's filter) and
    // become an ordinary roster villager, managed from the Roster panel like
    // any other recruit.
    //
    // Used to pre-assign job:'farmer'/'miner' with a tradeXp head start
    // ("an already-established trade rather than a green newcomer's") — a
    // real bug in practice, not just a design choice worth revisiting: a
    // brand-new homestead usually has no farmplot built yet, and job:
    // 'farmer' has no fallback worksite (`Villagers.tsx`'s own cascade), so
    // Alric fell straight through to the generic wander loop and looked
    // permanently broken — pre-employed on paper, aimlessly pacing in
    // practice. They now join `idle`/unassigned with no tradeXp, exactly
    // like every other newcomer from `checkVillagerArrival` — the player
    // assigns a real job (with real infrastructure already in place) from
    // the Roster panel same as anyone else.
    recruitVillageFolk: (npcId) => {
      const st = get();
      if (st.villagers.some((v) => v.id === npcId)) return; // already joined
      if (st.villagers.length >= MAX_VILLAGERS) {
        st.notify('Your homestead roster is full — no room to take them on.');
        return;
      }
      const isAlric = npcId === 'farmer_alric';
      const cost: Partial<Record<ItemId, number>> = isAlric ? { wood: 6 } : { stone: 6 };
      if (!st.canAfford(cost)) {
        const need = Object.entries(cost).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(', ');
        st.notify(`Not enough materials — ${need} needed.`);
        return;
      }
      const inv = { ...st.inventory };
      for (const [id, n] of Object.entries(cost)) inv[id as ItemId] = (inv[id as ItemId] ?? 0) - (n as number);
      const name = isAlric ? 'Alric' : 'Beda';
      const villager: Villager = { id: npcId, name, job: 'idle' };
      // They walk the road in like every other newcomer. This used to read
      // `const m = villagerMobs[npcId]; if (m) m.arriving = true;` on the
      // theory that they should set off from wherever they already stood —
      // but `villagerMobs[npcId]` does not exist yet at this point
      // (registerVillagerMob runs in VillagerFigure's useMemo, which only
      // mounts once they ARE a villager), so `m` was always undefined and the
      // whole thing was a silent no-op. They spawned on the doorstep instead.
      // arriveByRoad creates the entry as well as setting the flag.
      const entry = roadEntry();
      arriveByRoad(npcId, entry.x, entry.z);
      // Npc.tsx's CourtNpc registers into `npcMobs` on mount but never
      // cleans up on unmount (same gap villagerMobs's own comment above
      // already found and fixed for arrival) — once `villagers` excludes
      // this id, Npc.tsx stops rendering him and PlayerController's own
      // interact check already skips him too, but `npcMobs[npcId]` was left
      // behind at his static post forever. targeting.ts's `resolveAim` has
      // no concept of "already recruited" (it's a leaf module fed raw
      // `npcMobs` entries) and kept raycasting a friendly cylinder there,
      // so the crosshair nameplate ("Alric · FRIENDLY · 1m") kept appearing
      // at his old spot with no figure behind it. Deleting the stale entry
      // here — the one place that knows for certain this id just stopped
      // being a static NPC — fixes it at the source instead of teaching
      // every consumer to filter it out independently.
      delete npcMobs[npcId];
      set({
        inventory: inv,
        villagers: [...st.villagers, villager],
        dirty: true,
      });
      audio.play('treasure', 0.7);
      st.notify(`${name} joins your homestead! Assign them a job from the Roster panel.`, true);
    },

    checkVillagerArrival: () => {
      const st = get();
      if (st.villagers.length >= MAX_VILLAGERS) return;
      const req = villagerRequirement(st.villagers.length + 1);
      // newcomers judge the HOMESTEAD, not a remote outpost — a claimed
      // template-world plot's structures shouldn't hasten arrivals at home
      // …and they judge FINISHED structures. Both counts used to include
      // construction sites, so placing a bed ghost was enough to summon its
      // occupant — a villager turning up before there was anything to sleep
      // on. `Villagers.tsx`'s night routine already claims only built beds
      // (`isBuilt`), so an early arrival had nowhere to go and slept on the
      // spot. Arrival now uses the same standard the bed claim does.
      const homeBuildings = st.buildings.filter((b) => isHomeBuilding(b) && isBuilt(b));
      const beds = homeBuildings.filter((b) => b.type === 'bed').length;
      if (beds < req.beds || homeBuildings.length < req.buildings) return;
      const taken = new Set(st.villagers.map((v) => v.name));
      const name = VILLAGER_NAMES.find((n) => !taken.has(n)) ?? `Villager ${st.villagers.length + 1}`;
      const villager: Villager = { id: `v${seq.villager++}`, name, job: 'idle' };
      // they walk in along the road rather than appearing at the hearth
      const entry = roadEntry();
      arriveByRoad(villager.id, entry.x, entry.z);
      set({ villagers: [...st.villagers, villager], dirty: true });
      audio.playVoice('greeting_king', 0.5);
      st.notify(`${name} has come to join your homestead!`, true);
    },

    // the Armory (equipment system): a shared homestead pool of spare gear,
    // separate from the player's own Satchel. Stocked by raid/dungeon loot
    // (see Enemies.tsx) or donated here from the Satchel; drawn down when a
    // villager equips a piece, refunded on unequip — so the same 3 helmets
    // just move between "in the armory" and "on someone's head".
    openVillagerEquip: (villagerId) => {
      set({ equippingVillagerId: villagerId, panel: 'npcEquip' });
    },

    // raid/dungeon loot lands directly in the Armory (never the player's own
    // Satchel) — it's garrison plunder, not personal treasure
    grantArmory: (item, qty) => {
      const st = get();
      set({ armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + qty }, dirty: true });
    },

    donateToArmory: (item, qty) => {
      const st = get();
      const held = st.inventory[item] ?? 0;
      const n = Math.min(qty, held);
      if (n <= 0) return;
      set({
        inventory: { ...st.inventory, [item]: held - n },
        armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + n },
        dirty: true,
      });
      audio.play('brick_link', 0.5);
      st.notify(`${n}× ${ITEMS[item]?.name ?? item} sent to the Armory.`);
    },

    // Wave 9 · the chestplate half of this pair now DELEGATES to the tiered
    // actions below, so there is exactly one code path putting a plate on a
    // villager. Nothing about the boolean callers changed: dropping the plain
    // `chestplate` item on the paperdoll still equips the iron tier, and
    // taking it off still returns whichever tier they were actually wearing.
    equipVillagerGear: (villagerId, slot) => {
      const st = get();
      if (slot === 'chestplate') { st.equipVillagerChestplate(villagerId, 'iron'); return; }
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v) return;
      const item: ItemId = 'helmet';
      const stock = st.armory[item] ?? 0;
      if (v.gear?.[slot]) return; // already wearing one
      if (stock <= 0) {
        st.notify('The Armory has no spare helmets.');
        return;
      }
      const villagers = st.villagers.map((x) =>
        x.id === villagerId ? { ...x, gear: { ...x.gear, [slot]: true } } : x);
      set({ villagers, armory: { ...st.armory, [item]: stock - 1 }, dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${v.name} dons a helmet from the Armory.`);
    },

    unequipVillagerGear: (villagerId, slot) => {
      const st = get();
      if (slot === 'chestplate') { st.unequipVillagerChestplate(villagerId); return; }
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v?.gear?.[slot]) return;
      const item: ItemId = 'helmet';
      const villagers = st.villagers.map((x) =>
        x.id === villagerId ? { ...x, gear: { ...x.gear, [slot]: false } } : x);
      set({ villagers, armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 }, dirty: true });
      audio.play('brick_collide', 0.5);
      st.notify(`${v.name} returns the helmet to the Armory.`);
    },

    // Wave 9 armor tiers — the carrier/loadout shape, for the same reason:
    // `gear.chestplate` is ONE field holding a tier, so upgrading iron to
    // forged must hand the iron plate back to the Armory in the same action
    // or the swap would quietly destroy it. Note the tier a villager wears is
    // read through `chestplateTierOf` rather than off the field, so a legacy
    // `true` (the old single tier) unequips as an Iron Plate rather than
    // falling through and returning nothing.
    equipVillagerChestplate: (villagerId, tier) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v) return;
      const worn = chestplateTierOf(v.gear);
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
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, chestplate: tier } } : x));
      set({ villagers, armory, dirty: true });
      audio.play('brick_connect', 0.6);
      st.notify(`${v.name} buckles on the ${def.label} — ${def.blurb}`);
    },

    unequipVillagerChestplate: (villagerId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      const worn = chestplateTierOf(v?.gear);
      if (!v || !worn) return;
      const item = CHESTPLATE_ITEM[worn];
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, chestplate: false } } : x));
      set({ villagers, armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 }, dirty: true });
      audio.play('brick_collide', 0.5);
      st.notify(`${v.name} returns the ${CHESTPLATE_BY_TIER[worn].label.toLowerCase()} to the Armory.`);
    },

    // appearance editing (2026-07-20): only the fields the player actually
    // changed are stored, so anything untouched keeps tracking the id-derived
    // default in data/villagerLooks.ts
    setVillagerLook: (villagerId, look) => {
      const st = get();
      const villagers = st.villagers.map((v) =>
        (v.id === villagerId ? { ...v, look: { ...(v.look ?? {}), ...look } } : v));
      set({ villagers, dirty: true });
    },

    resetVillagerLook: (villagerId) => {
      const st = get();
      const villagers = st.villagers.map((v) => {
        if (v.id !== villagerId) return v;
        const { look: _drop, ...rest } = v;
        return rest;
      });
      set({ villagers, dirty: true });
    },

    assignJob: (villagerId, job) => {
      const st = get();
      const villagers = st.villagers.map((v) => (v.id === villagerId ? { ...v, job } : v));
      const jobDef = JOB_BY_ID[job];
      const villagerProgress = { ...st.villagerProgress, [villagerId]: jobDef.tripSeconds };
      set({ villagers, villagerProgress, dirty: true });
      const name = st.villagers.find((v) => v.id === villagerId)?.name ?? 'Villager';
      st.notify(job === 'idle' ? `${name} is now unassigned.` : `${name} is now your ${jobDef.label.toLowerCase()}.`);
    },

    // Requested 2026-07-30: "beds... should be exclusively owned by one
    // villager, no other npc can take their place." The old assignment
    // (both `villagers.ts`'s own `assignedSleepSpot` helper, now removed,
    // AND Defenders.tsx's own separate rank math for resting guards) was
    // recomputed fresh from ROSTER RANK on every call — not a stored
    // relationship, so a job
    // switch, a new recruit, or a demolished bed could silently reshuffle
    // who slept where, and the two independent rank computations had no way
    // to notice if they picked the same bed. A bed is now claimed ONCE,
    // permanently, the first time a villager needs one — freed only by
    // demolishing the bed itself (villagers are never removed from the
    // roster once recruited, so that is the only real release path). One
    // shared claim pool for both day-sleepers and resting defenders, so the
    // two can no longer double-book the same bed.
    claimBed: (villagerId) => {
      const st = get();
      const beds = st.buildings.filter((b) => b.type === 'bed' && isBuilt(b) && isHomeBuilding(b));
      const mine = beds.find((b) => b.owner === villagerId);
      if (mine) return { x: mine.x, z: mine.z };
      const free = beds.find((b) => !b.owner);
      if (free) {
        set({
          buildings: st.buildings.map((b) => (b.id === free.id ? { ...b, owner: villagerId } : b)),
          dirty: true,
        });
        return { x: free.x, z: free.z };
      }
      const v = st.villagers.find((x) => x.id === villagerId);
      return villagerHomeSpot(villagerId, v?.world ?? null, st.claimedWorlds);
    },

    // weapons are drawn from the shared Armory (2026-07-20 rework), same as
    // helmet/chestplate — a defender starts bare-handed and stays that way
    // until real stock is spent arming them. Switching loadouts refunds
    // whatever they were carrying back to the Armory before spending the new
    // requirement, so the same pieces just move between "in the Armory" and
    // "on a defender."
    setDefenderLoadout: (villagerId, loadout) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || v.job !== 'defender' || v.loadout === loadout) return;
      const need = LOADOUT_REQUIRES[loadout];
      for (const [id, n] of Object.entries(need)) {
        if ((st.armory[id as ItemId] ?? 0) < (n as number)) {
          st.notify(`Not enough in the Armory to arm ${v.name} that way.`);
          return;
        }
      }
      const armory = { ...st.armory };
      if (v.loadout) {
        for (const [id, n] of Object.entries(LOADOUT_REQUIRES[v.loadout])) {
          armory[id as ItemId] = (armory[id as ItemId] ?? 0) + (n as number);
        }
      }
      for (const [id, n] of Object.entries(need)) {
        armory[id as ItemId] = (armory[id as ItemId] ?? 0) - (n as number);
      }
      const villagers = st.villagers.map((x) => (x.id === villagerId ? { ...x, loadout } : x));
      set({ villagers, armory, dirty: true });
      const label = DEFENDER_LOADOUTS.find((d) => d.id === loadout)?.label ?? loadout;
      st.notify(`${v.name} is armed with ${label} from the Armory.`);
    },

    unequipDefenderLoadout: (villagerId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || !v.loadout) return;
      const armory = { ...st.armory };
      for (const [id, n] of Object.entries(LOADOUT_REQUIRES[v.loadout])) {
        armory[id as ItemId] = (armory[id as ItemId] ?? 0) + (n as number);
      }
      const villagers = st.villagers.map((x) => (x.id === villagerId ? { ...x, loadout: undefined } : x));
      set({ villagers, armory, dirty: true });
      st.notify(`${v.name} returns their weapon to the Armory — bare-handed for now.`);
    },

    // Wave 9 carriers — deliberately the loadout pair's shape, not
    // equipVillagerGear's: `gear.carrier` is ONE field holding a tier, so
    // going basket -> cart must hand the basket back to the Armory in the
    // same breath it takes the cart, or the upgrade would quietly destroy it.
    // Any job may wear one (carry capacity is a working stat, and a defender
    // who also hauls is perfectly reasonable).
    equipVillagerCarrier: (villagerId, tier) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || v.gear?.carrier === tier) return;
      const item = CARRIER_ITEM[tier];
      if ((st.armory[item] ?? 0) <= 0) {
        st.notify(`The Armory has no spare ${ITEMS[item]?.name.toLowerCase() ?? tier}.`);
        return;
      }
      const armory = { ...st.armory };
      if (v.gear?.carrier) {
        const old = CARRIER_ITEM[v.gear.carrier];
        armory[old] = (armory[old] ?? 0) + 1;
      }
      armory[item] = (armory[item] ?? 0) - 1;
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, carrier: tier } } : x));
      set({ villagers, armory, dirty: true });
      audio.play('brick_connect', 0.6);
      const def = CARRIERS.find((c) => c.id === tier);
      st.notify(`${v.name} takes up a ${def?.label ?? tier} — ${def?.blurb ?? 'they carry more'}.`);
    },

    unequipVillagerCarrier: (villagerId) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v?.gear?.carrier) return;
      const item = CARRIER_ITEM[v.gear.carrier];
      const villagers = st.villagers.map((x) =>
        (x.id === villagerId ? { ...x, gear: { ...x.gear, carrier: undefined } } : x));
      set({ villagers, armory: { ...st.armory, [item]: (st.armory[item] ?? 0) + 1 }, dirty: true });
      audio.play('brick_collide', 0.5);
      st.notify(`${v.name} returns the ${ITEMS[item]?.name.toLowerCase() ?? 'carrier'} to the Armory.`);
    },

    stationDefender: (villagerId, buildingId) => {
      const st = get();
      const villagers = st.villagers.map((v) => (v.id === villagerId ? { ...v, stationId: buildingId } : v));
      set({ villagers, dirty: true });
      const name = st.villagers.find((v) => v.id === villagerId)?.name ?? 'Villager';
      st.notify(buildingId ? `${name} takes up their post.` : `${name} patrols near the homestead.`);
    },

    // N80 · a per-defender day/night watch — see Villager.shift's own doc
    // comment for why absent means 'night' (the original blanket shift).
    setDefenderShift: (villagerId, shift) => {
      const st = get();
      const villagers = st.villagers.map((v) => (v.id === villagerId ? { ...v, shift } : v));
      set({ villagers, dirty: true });
      const name = st.villagers.find((v) => v.id === villagerId)?.name ?? 'Villager';
      st.notify(`${name} now stands the ${shift === 'day' ? 'day' : 'night'} watch.`);
    },

    gainDefenderXp: (villagerId, amount) => {
      const st = get();
      let leveledUp = false;
      let name = 'Villager';
      const villagers = st.villagers.map((v) => {
        if (v.id !== villagerId) return v;
        name = v.name;
        const xp = (v.xp ?? 0) + amount;
        const levelBefore = levelFromXp(v.xp ?? 0);
        const levelAfter = levelFromXp(xp);
        if (levelAfter > levelBefore) leveledUp = true;
        return { ...v, xp, level: levelAfter };
      });
      set({ villagers, dirty: true });
      if (leveledUp) st.notify(`${name} the Defender has grown stronger! (Lv ${levelFromXp(villagers.find((v) => v.id === villagerId)!.xp!)})`, true);
    },

    tickVillagers: (dt) => {
      const st = get();
      if (st.villagers.length === 0) return;
      // folk keep workaday hours (5 AM - 8 PM), not a 24/7 shift — labor and
      // construction simply pause overnight and resume at dawn from wherever
      // progress was left off. Defenders are unaffected (see the per-job
      // `continue` below; the night watch IS their job).
      if (!isWorkingHours(worldEnv.time)) return;
      const progress = { ...st.villagerProgress };
      const gains: Partial<Record<ItemId, number>> = {};
      let changed = false;
      const delivered: string[] = [];
      // Empire arc, Wave 3 (per-world labour): each distinct world present
      // in the roster gets its own buildings/stall/builder pass, scoped to
      // that world's own structures and residents — homestead-only in
      // effect today (every villager's `world` is still absent/null, so
      // this loop runs exactly once over `[null]`, byte-identical to the
      // old single flat pass), but the mechanism no longer assumes one
      // settlement. `checkVillagerArrival`'s generic-newcomer system stays
      // homestead-only on purpose — a settlement's own residents come from
      // its quest chain (Wave 4), not this arrival mechanic.
      const worlds = new Set(st.villagers.map((v) => v.world ?? null));
      for (const world of worlds) {
        const worldBuildings = st.buildings.filter((b) => (b.world ?? null) === world);
        const roster = st.villagers.filter((v) => (v.world ?? null) === world);
        const hasStall = worldBuildings.some((b) => b.type === 'market_stall' && isBuilt(b));
        // builder pass (Phase 19 build-then-construct): every assigned builder
        // chips away at the oldest construction site, ~25s per piece per builder
        // Steady Hands companion trait: that builder counts for 1.25
        //
        // Bugfix (2026-08-18, Wave 17 #3): gated on isWorkingHours, matching
        // the AI reasoner's own gather.ts/farm.ts actions (both already check
        // is_work_hours before running) — this legacy pre-reasoner pass never
        // did. Real progress used to land at any hour as long as a builder
        // happened to be standing at the site, which is exactly backwards
        // from what the night bed-seek behavior (Villagers.tsx) implies is
        // happening: a villager "asleep" in bed was still, mechanically,
        // finishing your keep.
        // Wave 32 · a builder's weight is base 1, +0.25 for Steady Hands'
        // speed multiplier, +0.5 flat for the new Extra Hands trait — kept as
        // one small helper so the "who's assigned" total right below and the
        // "who's actually standing there" total (atSite, further down) can't
        // drift out of step the way two hand-copied ternaries did pre-Wave-32.
        const builderWeightOf = (v: Villager) => 1
          + (hasTrait(v, 'bui_steady') ? 0.25 : 0)
          + (hasTrait(v, 'bui_hands') ? 0.5 : 0);
        const builderWeight = !isWorkingHours(worldEnv.time) ? 0 : roster.reduce(
          (t, v) => (v.job === 'builder' ? t + builderWeightOf(v) : t), 0);
        if (builderWeight > 0) {
          const site = worldBuildings.find((b) => !isBuilt(b));
          // L66 · only builders STANDING AT the site do any building. The pass
          // used to credit every assigned builder wherever they happened to be,
          // so a villager still walking across the map — or parked at a
          // worksite a hundred metres off — raised the walls all the same.
          if (site) {
            const atSiteBuilders = roster.filter((v) => {
              if (v.job !== 'builder') return false;
              const m = villagerMobs[v.id];
              return !!m && Math.hypot(m.x - site.x, m.z - site.z) <= WORK_RANGE;
            });
            const atSite = atSiteBuilders.reduce((t, v) => t + builderWeightOf(v), 0);
            if (atSite > 0) {
              const before = site.built ?? 0;
              st.constructBuilding(site.id, dt * 0.04 * atSite);
              // Salvage Eye (Wave 32): the builder side-goods analog. Building
              // has no discrete "trip" to roll this once-per like gathering
              // does, so it fires once per completed PIECE instead — the
              // closest honest equivalent to "once per finished unit of work".
              // Every builder present rolls it (matching the generic
              // side-goods shape: it's a baseline craft-scaled chance the
              // trait doubles, not something the trait switches on from zero).
              // Wave 57 (F5): also gated on `!site.ruin` — a second,
              // independent double-grant surface this wave's own research
              // didn't name (it traced constructBuilding's own completion
              // branch, not this separate before/after check in the builder
              // pass), found while confirming nothing else double-counts a
              // ruin rebuild the way stats/XP/quest-counters did. `site` is
              // the PRE-construct snapshot from just above, so `site.ruin`
              // still reads the ruin flag construct Building is about to
              // clear on this same call.
              if (before < 1 && !site.ruin && (get().buildings.find((b) => b.id === site.id)?.built ?? 0) >= 1) {
                for (const v of atSiteBuilders) {
                  const attrs = attrsOf(v.id);
                  const sideChance = attrs.craft * (hasTrait(v, 'bui_salvage') ? 2 : 1);
                  if (Math.random() * 25 < sideChance) {
                    const mat: ItemId = Math.random() < 0.5 ? 'wood' : 'stone';
                    st.addItems({ [mat]: 1 }, 'gather');
                    st.notify(`♻️ ${v.name} salvages scrap from the build — +1 ${mat}.`);
                  }
                }
              }
            }
          }
        }
        for (const v of roster) {
          if (v.job === 'idle') continue;
          if (v.job === 'defender') continue; // no passive delivery — Defenders.tsx drives them instead
          if (v.job === 'builder') continue;  // no delivery either — see the builder pass above
          if (v.job === 'merchant' && !hasStall) continue; // no stall, nothing to sell
          // §4/5.8b — once carrying is enabled (haul.ts's CARRYING_ENABLED),
          // an AI-driven villager's real yield comes from HaulToDeposit's own
          // addItems()+awardTradeXp() call instead; granting it again here on
          // the old per-trip timer would double-count. The old timer's own
          // progress simply freezes while workSignal is active, resuming
          // exactly where it left off once the AI stops driving this villager
          // (dusk, no reachable node, reassigned) — Phase 24B's own fallback
          // then picks the same villager back up seamlessly, unaffected.
          if (workSignals[v.id]?.active) continue;
          const jobDef = JOB_BY_ID[v.job];
          // Phase 24A: Diligence + trade mastery shorten the trip; Swift-family
          // companion traits shave another 12%. Hermit trade-off perk: +25% on
          // top — its own upside is the player's own gathering, doubled, in
          // harvestNode() (gatheringSlice.ts).
          const trip = jobDef.tripSeconds * tripSpeedMult(v) * tripTraitMult(v)
            * (st.perks.includes('hermit') ? PERK_FX.hermit.villagerTripTimes : 1);
          // L66 · the trip only runs down while they are actually somewhere
          // that counts: at their worksite, or back at the stores hauling. A
          // villager stuck on the far side of the map used to fill their sack
          // on the timer alone, which is why felling went on hundreds of metres
          // from the nearest tree.
          if (!villagerAtWork(v, st, worldBuildings)) continue;
          const left = (progress[v.id] ?? trip) - dt;
          if (left > 0) {
            progress[v.id] = left;
            changed = true;
            continue;
          }
          progress[v.id] = trip;
          // Phase 24A: Might rolls a double load, Wit pads a merchant's take,
          // Craft brings home side-goods (mirrors the player's own talents);
          // companion traits stack on top of all of it
          const attrs = attrsOf(v.id);
          let haul = jobDef.perTrip;
          if (Math.random() * 20 < attrs.might) haul *= 2;
          if (v.job === 'merchant') {
            haul += Math.round(attrs.wit / 3) + (hasTrait(v, 'mer_silver') ? 2 : 0);
            // Windfall (Wave 32): the merchant's side-goods analog — same
            // craft-scaled roll shape as the generic side-goods chance below,
            // just paid out as bonus gold on this trip's haul, since a
            // merchant has no second item to bring home (SIDE_GOODS has no
            // 'gold' entry, by design — see attributes.ts).
            const windfallChance = attrs.craft * (hasTrait(v, 'mer_windfall') ? 2 : 1);
            if (Math.random() * 25 < windfallChance) haul += 3;
          }
          const haulTrait = HAUL_TRAIT[v.job];
          if (haulTrait && hasTrait(v, haulTrait)) haul += 1;
          gains[jobDef.produces] = (gains[jobDef.produces] ?? 0) + haul;
          const side = SIDE_GOODS[jobDef.produces];
          const sideTrait = SIDE_TRAIT[v.job];
          const sideChance = attrs.craft * (sideTrait && hasTrait(v, sideTrait) ? 2 : 1);
          if (side && Math.random() * 25 < sideChance) gains[side] = (gains[side] ?? 0) + 1;
          // trade mastery: +10 xp per completed trip, kept per job — via the
          // same awardTradeXp() HaulToDeposit's own real completion calls
          // (5.8b), not a second, separately-maintained copy of this logic
          st.awardTradeXp(v.id, 10);
          delivered.push(v.name);
          changed = true;
        }
      }
      if (changed) set({ villagerProgress: progress, dirty: true });
      if (delivered.length) {
        const took = st.addItems(gains, 'gather');
        // cosmetic phrasing only, still homestead-specific by design (every
        // delivery is a home delivery today) — see this pass's own note on
        // `checkVillagerArrival` staying homestead-only for why a mixed
        // multi-world delivery batch isn't a real case yet.
        // Wave 9: stay quiet when a full store took none of it — addItems
        // has already said why, and "hauled supplies" over a refused load
        // would flatly contradict it.
        if (Object.keys(took).length) {
          const store = bestStore(st.buildings, isHomeBuilding);
          st.notify(`${delivered.join(', ')} hauled supplies to the ${store ? (BUILDABLE_BY_ID[store.type]?.name ?? 'stores').toLowerCase() : 'stores'}.`);
        }
      }
    },

    awardTradeXp: (villagerId, amount) => {
      const st = get();
      const v = st.villagers.find((x) => x.id === villagerId);
      if (!v || v.job === 'idle') return;
      const lvlBefore = tradeLevelOf(v, v.job);
      const nv: Villager = { ...v, tradeXp: { ...(v.tradeXp ?? {}), [v.job]: tradeXpOf(v, v.job) + amount } };
      set({ villagers: st.villagers.map((x) => (x.id === villagerId ? nv : x)), dirty: true });
      if (tradeLevelOf(nv, v.job) > lvlBefore) {
        const jobDef = JOB_BY_ID[v.job];
        st.notify(`⭐ ${v.name} the ${jobDef.label} (Lv ${tradeLevelOf(nv, v.job)}) has mastered more of their trade!`, true);
      }
    },
  };
};
