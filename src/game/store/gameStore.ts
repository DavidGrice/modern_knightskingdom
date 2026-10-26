'use client';
// CLN-07 · the game store's composition root. It is still the one zustand store it always was; what each part of it
// holds and does lives in a slice under store/slices/, one per domain — the session, the UI, progression, side errands,
// the story, goods, the world, gathering, building and the build view's tools, the keep, villagers, the companion and
// the empire — each written against the whole store's own set and get, so that an action in one reads, writes and
// calls the rest exactly as it did when they were all one closure here. The persisted fields' values on a fresh store
// come from store/persistence.ts (CLN-03); the helpers more than one slice calls are slices/shared.ts's.
import { create } from 'zustand';
import { freshPersisted, type PersistedState } from './persistence';
import { playerState } from '../playerState';
import { stationsInReach } from '../stations';
import { exposeDebug } from '@/lib/debugHooks';
import { createSessionSlice, type SessionSlice } from './slices/sessionSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createProgressionSlice, type ProgressionSlice } from './slices/progressionSlice';
import { createQuestSlice, type QuestSlice } from './slices/questSlice';
import { createStorySlice, type StorySlice } from './slices/storySlice';
import { createInventorySlice, type InventorySlice } from './slices/inventorySlice';
import { createWorldSlice, type WorldSlice } from './slices/worldSlice';
import { createGatheringSlice, type GatheringSlice } from './slices/gatheringSlice';
import { createBuildSlice, type BuildSlice } from './slices/buildSlice';
import { createBuildToolsSlice, type BuildToolsSlice } from './slices/buildToolsSlice';
import { createKeepSlice, type KeepSlice } from './slices/keepSlice';
import { createVillagerSlice, type VillagerSlice } from './slices/villagerSlice';
import { createCompanionSlice, type CompanionSlice } from './slices/companionSlice';
import { createEmpireSlice, type EmpireSlice } from './slices/empireSlice';
export type { PanelId } from './slices/uiSlice';
export { activeQuestOf, atGuildMaxRank } from './storeHelpers';
export { GROW_TIME, TAX_COOLDOWN_MS } from './constants';

/** The whole store. CLN-03 · every field the game SAVES is `PersistedState` (store/persistence.ts — the single table
 *  that also drives the initial state, newGame/new-game-plus, loadFromSave and toSave); the transient, runtime-only
 *  fields and the actions are the slices'. */
export type GameState = PersistedState
  & SessionSlice & UiSlice & ProgressionSlice & QuestSlice & StorySlice & InventorySlice & WorldSlice & GatheringSlice
  & BuildSlice & BuildToolsSlice & KeepSlice & VillagerSlice & CompanionSlice & EmpireSlice;

export const useGameStore = createGameStore();

// While a crafting panel is up, the list of stations in reach follows the buildings. Nothing else renews it then —
// the player controller's sweep stops for a panel — but the world does not stop: a dragon can leave the campfire in
// ruins, and a siege crew can knock the forge down, while the book lies open; and a ruin is no place to craft.
useGameStore.subscribe((s, prev) => {
  if (s.buildings !== prev.buildings && (s.panel === 'crafting' || s.panel === 'stationMenu')) {
    s.setNearStations(stationsInReach(s.buildings, playerState.x, playerState.z));
  }
});

// debug/testing handle
exposeDebug('__kk', useGameStore);

function createGameStore() {
  return create<GameState>((set, get) => ({
    ...freshPersisted(null, 'normal'),
    ...createSessionSlice(set, get),
    ...createUiSlice(set, get),
    ...createProgressionSlice(set, get),
    ...createQuestSlice(set, get),
    ...createStorySlice(set, get),
    ...createInventorySlice(set, get),
    ...createWorldSlice(set, get),
    ...createGatheringSlice(set, get),
    ...createBuildSlice(set, get),
    ...createBuildToolsSlice(set, get),
    ...createKeepSlice(set, get),
    ...createVillagerSlice(set, get),
    ...createCompanionSlice(set, get),
    ...createEmpireSlice(set, get),
  }));
}
