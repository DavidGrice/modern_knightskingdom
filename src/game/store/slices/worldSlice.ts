// CLN-07 · the store's world slice: the land deed, travel between the homestead, the destinations, the crypt and
// the arena, interiors and their chest, and the clock and the seasons.
import { LAND_TIERS, MAX_LAND_TIER } from '../../data/landTiers';
import { poisForDestination } from '../../data/npcs';
import { audio } from '@/lib/audio';
import { worldEnv } from '../../env';
import { playerState } from '../../playerState';
import { SIGNPOST } from '../../data/world';
import { WORLD_DESTINATION_BY_ID, ARENA_ORIGIN, TEMPLATE_ARRIVAL_SPAWN } from '../../data/worlds';
import { INTERIORS, enterSpawnFor, pocketFor } from '../../data/interiors';
import { dungeonState, generateDungeonLayout, resetDungeon, DUNGEON_UNLOCK_QUEST } from '../../dungeon';
import { resetArenaRun, endArenaRun, type ArenaEnvId } from '../../arena';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

export interface WorldSlice {
  buyLand: () => void;

  /** the id of the PlacedBuilding whose interior the player is currently
   *  inside, null while outdoors — generalised 2026-07-30 from a plain
   *  boolean that only ever meant "in the Grand Keep" (see data/interiors.ts) */
  interior: string | null;
  enteredInteriorPos: [number, number] | null; // outdoor position to return to on exit
  season: number;                 // low-frequency mirror of seasonOf(dayCount) (HUD/saves)

  /** Wave 14 · `poiId` optionally waypoints straight to a resident POI's own
   *  x/z/yaw (data/npcs.ts's poisForDestination) instead of the
   *  destination's generic `origin`. Absent = unchanged pre-Wave-14
   *  behavior. An unrecognized/unrevealed poiId is silently ignored and
   *  falls back to a plain destination-level travel. */
  travelTo: (id: string, poiId?: string) => void;
  returnHome: () => void;
  enterDungeon: () => void;
  enterArena: (envId: ArenaEnvId) => void;
  leaveArena: () => void;

  enterInterior: (buildingId: string) => void;
  exitInterior: () => void;
  openTreasureChest: () => void;
  setTimeOfDay: (t: number) => void;
  setDayCount: (n: number) => void;
  setSeason: (n: number) => void;
  sleep: () => void;
}

export const createWorldSlice: SliceCreator<WorldSlice> = (set, get) => {
  const { bumpQuestCounters } = sharedActions(set, get);

  return {
    interior: null,
    enteredInteriorPos: null,
    season: 0,

    buyLand: () => {
      const st = get();
      if (st.landTier >= MAX_LAND_TIER) {
        st.notify('Your holding already runs to the horizon.');
        return;
      }
      const next = LAND_TIERS[st.landTier + 1];
      if ((st.inventory.gold ?? 0) < next.cost) {
        st.notify(`The deed to a ${next.name} costs ${next.cost} gold.`);
        return;
      }
      st.addItems({ gold: -next.cost });
      set({ landTier: st.landTier + 1, dirty: true });
      audio.play('treasure', 0.8);
      st.notify(`Land bought — your holding is now a ${next.name}, ${next.walls} walls per N/S side.`, true);
      // whatever was standing on the new ground is now yours to work
      st.seedNodes();
    },

    travelTo: (id, poiId) => {
      const st = get();
      const dest = WORLD_DESTINATION_BY_ID[id];
      if (!dest) return;
      // Wave 14 · an unrecognized/unrevealed poiId (stale save, a POI hidden
      // behind a reveal quest not yet done) just falls back to a plain
      // destination-level travel rather than silently no-op'ing the whole
      // call — see poisForDestination's own isNpcRevealed gate.
      const poi = poiId ? poisForDestination(id, st.completedQuests).find((p) => p.id === poiId) : undefined;
      // Re-clicking the same destination with no waypoint target stays a
      // no-op, unchanged from before poiId existed. A waypoint always
      // re-teleports even to a destination you're already standing in —
      // "jump straight to this resident" is the whole point of a waypoint.
      if (st.destination === id && !poi) return;
      const firstVisit = !st.visitedWorlds.includes(id);
      const firstPoiVisit = !!poi && !st.discoveredPois.includes(poi.id);
      set({
        destination: id,
        visitedWorlds: firstVisit ? [...st.visitedWorlds, id] : st.visitedWorlds,
        discoveredPois: firstPoiVisit ? [...st.discoveredPois, poi!.id] : st.discoveredPois,
        panel: 'none',
        dirty: true,
      });
      // a waypoint lands right in front of its resident (same -2.4 offset
      // beginCeremony already uses to stand the player before the King).
      // Otherwise: a frozen, known-good spawn point (TEMPLATE_ARRIVAL_SPAWN,
      // worlds.ts — see its own comment) for the 8 destinations real
      // walkable-rect data now covers, so day-one arrival never lands
      // somewhere the new rect-union clamp (game/playerPhysics/collide.ts) would
      // immediately snap away from; any destination without an entry there
      // (challenges, dungeon/arena bypass this formula entirely) keeps the
      // original radius-derived landing spot unchanged.
      playerState.pendingTeleport = poi
        ? { x: poi.x, z: poi.z - 2.4, yaw: poi.yaw }
        : TEMPLATE_ARRIVAL_SPAWN[id] ?? { x: dest.origin.x, z: dest.origin.z - dest.radius * 0.5, yaw: Math.PI };
      audio.play('canter', 0.8);
      if (firstVisit && dest.loot) {
        st.addItems(dest.loot, 'grant');
        st.notify(dest.lootText ?? 'You find something of value.', true);
      }
      st.notify(poi ? `You travel to ${poi.name} at ${dest.name}.` : `You travel to ${dest.name}.`);
      // main-quest travel beats credit the journey itself
      bumpQuestCounters('visit', id, 1);
    },

    returnHome: () => {
      const st = get();
      if (!st.destination) return;
      set({ destination: null, dirty: true });
      resetDungeon();
      // Stage 3 (Wave 18 #5): this is the generic exit offered at every
      // destination including the arena (leaveArena() below is the OTHER,
      // dedicated way out, reached only from combat.ts's on-death branch —
      // there's no "Leave Arena" button). Without this, ArenaHud.tsx (which
      // polls arenaState.active/env directly, with no destination linkage of
      // its own) kept the "⚔️ … — N kills" badge on screen indefinitely
      // after an ordinary walk-out. Harmless to call unconditionally, same
      // as resetDungeon() just above.
      endArenaRun();
      playerState.pendingTeleport = { x: SIGNPOST.x, z: SIGNPOST.z + 3, yaw: 0 };
      audio.play('horn', 0.7);
      st.notify('You return home.');
    },

    enterDungeon: () => {
      const st = get();
      if (st.destination) return;
      if (!st.completedQuests.includes(DUNGEON_UNLOCK_QUEST)) {
        st.notify('The Sealed Crypt only opens to a proven Knight.');
        return;
      }
      const layout = generateDungeonLayout();
      dungeonState.layout = layout;
      set({ destination: 'dungeon', panel: 'none', dirty: true });
      playerState.pendingTeleport = { x: layout.entryPos.x, z: layout.entryPos.z, yaw: 0 };
      audio.play('canter', 0.8);
      st.notify('You descend into the Sealed Crypt…', true);
    },

    // requested 2026-08-03: the endless mob arena, entered from the Travel
    // Map exactly like the Sealed Crypt above — same unlock gate for a
    // first cut (no new quest content needed), same pendingTeleport
    // mechanism. See game/arena.ts for the run-local kill counter/scaling
    // this resets.
    enterArena: (envId) => {
      const st = get();
      if (st.destination) return;
      if (!st.completedQuests.includes(DUNGEON_UNLOCK_QUEST)) {
        st.notify('The Arena only opens to a proven Knight.');
        return;
      }
      resetArenaRun(envId);
      set({ destination: 'arena', panel: 'none', dirty: true });
      playerState.pendingTeleport = { x: ARENA_ORIGIN.x, z: ARENA_ORIGIN.z, yaw: 0 };
      audio.play('canter', 0.8);
      st.notify('You enter the arena…', true);
    },

    // the voluntary-exit path — banks whatever milestone rewards were
    // already granted mid-run (those were handed out the moment each
    // threshold was crossed, not held back for a "complete" state that
    // this open-ended mode never reaches). damagePlayer()'s own arena
    // branch (combat.ts) is the other, involuntary way out.
    leaveArena: () => {
      const st = get();
      if (st.destination !== 'arena') return;
      endArenaRun();
      set({ destination: null, dirty: true });
      playerState.pendingTeleport = { x: SIGNPOST.x, z: SIGNPOST.z + 3, yaw: 0 };
      audio.play('horn', 0.7);
      st.notify('You leave the arena.');
    },

    enterInterior: (buildingId) => {
      const st = get();
      if (st.interior) return;
      const b = st.buildings.find((bb) => bb.id === buildingId);
      const def = b ? INTERIORS[b.type] : null;
      if (!b || !def) return;
      set({ interior: buildingId, enteredInteriorPos: [b.x, b.z], panel: 'none' });
      playerState.pendingTeleport = enterSpawnFor(def, pocketFor(b.type, b.id));
      audio.play('door_open', 0.7);
      st.notify(`You step into ${def.name}.`, true);
    },

    exitInterior: () => {
      const st = get();
      if (!st.interior) return;
      const pos = st.enteredInteriorPos ?? [0, 20];
      set({ interior: null, enteredInteriorPos: null });
      playerState.pendingTeleport = { x: pos[0], z: pos[1] + 6, yaw: 0 };
      audio.play('door_open', 0.7);
    },

    openTreasureChest: () => {
      const st = get();
      if (st.treasureOpened) {
        audio.play('treasure', 0.6);
        st.notify('The chest sits empty — you already claimed its prize.');
        return;
      }
      set({ treasureOpened: true, dirty: true });
      st.addItems({ gold: 30 }, 'grant');
      audio.play('treasure', 0.9);
      st.notify('You found 30 gold in the royal treasure chest!', true);
    },

    setTimeOfDay: (timeOfDay) => set({ timeOfDay, dirty: true }),
    setDayCount: (dayCount) => set({ dayCount, dirty: true }),
    setSeason: (season) => set({ season }),
    sleep: () => {
      worldEnv.time = 0.27; // just before sunrise
      set({ timeOfDay: 0.27, dirty: true });
      audio.play('bird1', 0.5);
      get().notify('You sleep soundly and wake at dawn.', true);
    },
  };
};
