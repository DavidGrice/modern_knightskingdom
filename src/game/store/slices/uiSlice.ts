// CLN-07 · the store's UI slice: which panel is up and the pause, the camera, notifications and prompts, what the
// player is looking at and handling, emotes and greetings, and the dialogue and station a panel is open on.
import type { InputDevice } from '../../inputMode';
import { audio } from '@/lib/audio';
import { playerState } from '../../playerState';
import { stationsInReach } from '../../stations';
import { seq } from '../storeCounters';
import { sharedActions } from './shared';
import type { SliceCreator } from './types';

interface Notification { id: number; text: string; gold?: boolean }

export type PanelId = 'none' | 'inventory' | 'crafting' | 'quests' | 'skills' | 'emotes' | 'dialogue' | 'shop' | 'villagers' | 'travel' | 'chronicle' | 'parley' | 'guild' | 'commands' | 'npcEquip' | 'stationMenu' | 'appearance' | 'bestiary' | 'keepSocket' | 'buildingMenu' | 'workshop';

type CameraMode = 'fps' | 'third';

export interface UiSlice {
  // runtime ui
  panel: PanelId;
  paused: boolean;

  photoMode: boolean;
  notifications: Notification[];
  prompt: string | null;
  /** Wave 15: live "what did the player's hands touch most recently" fact —
   *  NOT persisted (game/inputMode.ts owns the split vs Settings.inputMode,
   *  which IS persisted). Read by HUD.tsx/Panels.tsx via resolveInputDevice()
   *  whenever that setting is 'auto'. */
  activeInputDevice: InputDevice;
  actionProgress: number | null; // 0..1 while gathering
  nearStations: string[];

  cameraMode: CameraMode;
  targetKind: string | null;     // what the interact ray is aimed at (drives viewmodel tool)
  emote: { clip: string; seq: number } | null;
  npcGreetSeq: number;           // bumps when the player talks to an NPC
  npcGreetId: string | null;     // which NPC waved last
  npcGreetClip: string | null;   // override clip for the greet (defaults per-character if unset)

  dialogueNpc: string | null;    // NPC shown in the dialogue panel

  activeStation: 'workbench' | 'forge' | 'campfire' | null; // station shown in the focused station quick-menu (transient, never saved)

  // ui
  setPanel: (p: PanelId) => void;

  setPaused: (v: boolean) => void;

  setPhotoMode: (v: boolean) => void;
  setPrompt: (p: string | null) => void;
  setActiveInputDevice: (d: InputDevice) => void;
  setActionProgress: (v: number | null) => void;
  setNearStations: (s: string[]) => void;

  setCameraMode: (m: CameraMode) => void;
  setTargetKind: (k: string | null) => void;
  playEmote: (clip: string) => void;
  pokeNpc: (id: string, clip?: string) => void;

  openDialogue: (npcId: string) => void;

  openStationMenu: (station: 'workbench' | 'forge' | 'campfire') => void;

  notify: (text: string, gold?: boolean) => void;
}

export const createUiSlice: SliceCreator<UiSlice> = (set, get) => {
  const { bumpQuestCounters } = sharedActions(set, get);

  return {
    panel: 'none',
    paused: false,

    photoMode: false,
    notifications: [],
    prompt: null,
    activeInputDevice: 'keyboard',
    actionProgress: null,
    nearStations: [],

    cameraMode: 'fps',
    targetKind: null,
    emote: null,
    npcGreetSeq: 0,
    npcGreetId: null,
    npcGreetClip: null,

    dialogueNpc: null,

    activeStation: null,

    // The Crafting book shows what is in reach AS IT OPENS (so does a station's own menu, openStationMenu below).
    // Both used to go by whatever the player controller's half-second sweep had last found — and the sweep stops
    // while a panel is up, so a list that was stale at that moment stayed stale until the panel was shut: walk up
    // to a forge with the key held and its menu opened, as often as not, to "You've stepped away". (While either
    // is open the list goes on following the buildings: the subscription under the store's creation.)
    setPanel: (panel) => {
      if (panel === 'crafting') get().setNearStations(stationsInReach(get().buildings, playerState.x, playerState.z));
      set({ panel });
    },

    setPaused: (paused) => set({ paused }),

    setPhotoMode: (photoMode) => set({ photoMode }),
    setCameraMode: (cameraMode) => set({ cameraMode }),
    setTargetKind: (k) => {
      if (get().targetKind !== k) set({ targetKind: k });
    },
    playEmote: (clip) => {
      // emotes show in third person; switch so the player sees themselves
      set({
        emote: { clip, seq: (get().emote?.seq ?? 0) + 1 },
        cameraMode: 'third',
        panel: 'none',
      });
      audio.play('villager', 0.6);
    },
    pokeNpc: (id, clip) => set({ npcGreetSeq: get().npcGreetSeq + 1, npcGreetId: id, npcGreetClip: clip ?? null }),

    openDialogue: (npcId) => {
      set({ dialogueNpc: npcId, panel: 'dialogue' });
      get().pokeNpc(npcId);
      // main-quest audience beats complete on actually meeting the person
      bumpQuestCounters('talk', npcId, 1);
    },

    // walking up to a specific station and pressing E should offer only
    // THAT station's own recipes, not the whole tabbed Crafting book — see
    // StationMenuPanel.tsx, which links back to the full book if the player
    // wants to browse everything anyway
    openStationMenu: (station) => {
      // …and it says whether the player is AT that station from where he stands now, not from the sweep's last
      // look (see setPanel): a station he came up to, or finished, less than half a second ago is one he is at.
      get().setNearStations(stationsInReach(get().buildings, playerState.x, playerState.z));
      set({ activeStation: station, panel: 'stationMenu' });
    },

    setPrompt: (prompt) => {
      if (get().prompt !== prompt) set({ prompt });
    },
    setActiveInputDevice: (activeInputDevice) => {
      if (get().activeInputDevice !== activeInputDevice) set({ activeInputDevice });
    },
    setActionProgress: (actionProgress) => set({ actionProgress }),
    setNearStations: (s) => {
      const cur = get().nearStations;
      if (cur.length !== s.length || cur.some((v, i) => v !== s[i])) set({ nearStations: s });
    },

    notify: (text, gold) => {
      const id = seq.notif++;
      set({ notifications: [...get().notifications, { id, text, gold }].slice(-5) });
      setTimeout(() => {
        set({ notifications: get().notifications.filter((n) => n.id !== id) });
      }, 4200);
    },
  };
};
