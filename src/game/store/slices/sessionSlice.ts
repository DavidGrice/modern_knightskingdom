// CLN-07 · the store's session slice: a new game, a new game plus, loading a save and writing one, the dirty flag,
// the hero's own look (setCharacter), and the session prologue the three starts share (beginSession, ephemeralState).
import type { CharacterConfig, DifficultyId, SaveGame, WaterFeature } from '../../types';
import type { NgPlusCarry } from '../../ngPlus';
import { stabledHorses } from '../../riding';
import { resetSessionModules } from '../sessionReset';
import { ZERO_XP, applySave, buildSave, freshPersisted } from '../persistence';
import { worldEnv, seasonOf } from '../../env';
import { setWaterworks, waterworks } from '../../waterworks';
import { buildUndo, seq } from '../storeCounters';
import type { GameState } from '../gameStore';
import type { SliceCreator } from './types';

/** CLN-04 · the TRANSIENT half of a session start: every runtime-only field a new
 *  session (newGame / new-game-plus / loadFromSave) must not inherit. The
 *  PERSISTED half is `freshPersisted`/`applySave` (store/persistence.ts); the leaf
 *  modules are `resetSessionModules` (store/sessionReset.ts). A factory, so every
 *  call hands out fresh containers.
 *
 *  Deliberately NOT here: `activeInputDevice` (a live fact about the player's
 *  hands), `cameraMode`, `targetKind` (rewritten every frame), `nearStations`
 *  (renewed by the half-second sweep, whenever a crafting panel opens, and as
 *  the buildings change under one),
 *  `emote`/`npcGreet*` (one-shot triggers), `keepSocket`/`menuBuilding`
 *  (read only while their panel is open, and `panel` resets to 'none'),
 *  `ceremony` (its own timer ends it). */
function ephemeralState(): Partial<GameState> {
  return {
    panel: 'none', paused: false, buildMode: false,
    notifications: [], prompt: null, actionProgress: null,
    dialogueNpc: null, equippingVillagerId: null, activeStation: null,
    villagerProgress: {}, interior: null, enteredInteriorPos: null,
    // the build view: setBuildMode(false) already clears most of it, but not
    // blueprintSelection, and nothing at all clears it on a session switch
    photoMode: false,
    buildSelection: null, blueprintSelection: null, movingBuilding: null,
    buildTool: 'build', freeformBuild: false, demolishRect: null, digRect: null,
  };
}

export interface SessionSlice {
  dirty: boolean; // needs saving

  // lifecycle
  newGame: (c: CharacterConfig, difficulty?: DifficultyId) => void;
  /** Wave 39 (A4) · a distinct fresh-run path, not a relabeled newGame: it
   *  resets everything newGame's own freshPersisted() resets (day count,
   *  the whole build/kingdom side of the save), but overlays `carry`'s skill
   *  XP and talent tree on top rather than zeroing them — see this file's
   *  beginSession() for why sharing one prologue (instead of a second
   *  hand-picked reset list) is the load-bearing decision here. */
  startNewGamePlus: (c: CharacterConfig, carry: NgPlusCarry, difficulty?: DifficultyId) => void;
  loadFromSave: (s: SaveGame) => void;
  toSave: () => SaveGame;

  /** change how the character LOOKS mid-game (see AppearancePanel) — not
   *  their name or calling, which are identity and stay fixed */
  setCharacter: (c: CharacterConfig) => void;
  markSaved: () => void;
}

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => {

  /** CLN-04 · the ONE session prologue newGame / startNewGamePlus / loadFromSave
   *  share. ORDER IS LOAD-BEARING and unchanged from the three inline copies:
   *  module resets first (nothing reads the store yet); the leaf lists
   *  (stabledHorses, waterworks) BEFORE set(), because set() notifies
   *  subscribers/renders that read them; worldEnv AFTER set() (its subscribers
   *  were always notified against the old clock); nodes are re-seeded last, off
   *  the state that just landed. `ids` (load only) recomputes the id counters
   *  from the save — a NEW game deliberately keeps counting past the last one, so
   *  a fresh character's villagers never reuse an id the previous game left keyed
   *  in a leaf registry. */
  function beginSession(o: {
    state: Partial<GameState>; dirty: boolean;
    stabled: readonly string[]; mounts: Readonly<Record<string, string>>;
    waterworks: WaterFeature[]; time: number; dayCount: number;
    ids?: SaveGame;
  }) {
    resetSessionModules({ villagers: o.state.villagers ?? [] });
    buildUndo.placeHistory = [];
    buildUndo.carriedKeepExtra = null;
    stabledHorses.ids = [...o.stabled];
    stabledHorses.assigned = { ...o.mounts };
    // Wave 12 · module state, same class of thing as the stable above: nav,
    // collision and the water mesh read the leaf module, so a session with no
    // waterways must CLEAR it. Bumping the revision is also what makes the next
    // nav rebuild forget the old water.
    setWaterworks(o.waterworks);
    // season is the low-frequency mirror of seasonOf(dayCount); seasonOf(0) === 0, so a
    // fresh game's literal `season: 0` and a load's derived value are the same rule
    set({ ...o.state, ...ephemeralState(), dirty: o.dirty, season: seasonOf(o.dayCount) });
    worldEnv.time = o.time;
    worldEnv.dayCount = o.dayCount;
    if (o.ids) {
      const s = o.ids;
      seq.build = s.buildings.reduce((m, b) => Math.max(m, parseInt(b.id.slice(1)) + 1 || m), 1);
      seq.villager = (s.villagers ?? []).reduce((m, v) => Math.max(m, parseInt(v.id.slice(1)) + 1 || m), 1);
      seq.blueprint = (s.customBlueprints ?? []).reduce((m, b) => Math.max(m, parseInt(b.id.slice(2)) + 1 || m), 1);
      seq.water = o.waterworks.reduce((m, w) => Math.max(m, parseInt(w.id.slice(1)) + 1 || m), 1);
    }
    get().seedNodes();
  }

  return {
    dirty: false,

    newGame: (character, difficulty = 'normal') => {
      beginSession({
        state: freshPersisted(character, difficulty), dirty: true,
        stabled: [], mounts: {}, waterworks: [], time: 0.3, dayCount: 0,
      });
    },

    startNewGamePlus: (character, carry, difficulty = 'normal') => {
      beginSession({
        state: {
          ...freshPersisted(character, difficulty),
          // the entire point of NG+: skill XP and the talent tree it gates
          // survive the reset above — see types.ts's SaveGame doc comment for
          // why exactly this pair (and not perks/attrSpent) is safe to carry.
          xp: { ...ZERO_XP, ...carry.xp },
          skillTree: [...carry.skillTree],
        },
        dirty: true,
        stabled: [], mounts: {}, waterworks: [], time: 0.3, dayCount: 0,
      });
    },

    loadFromSave: (s) => {
      // CLN-03 · every persisted field (its defaults, the legacy-save defaults
      // and the xp/stats merge) comes from the table in ./persistence.ts
      const persisted = applySave(s);
      // the SAME array becomes the store's `waterworks` too, so the leaf list
      // and the store copy start out identical
      beginSession({
        state: persisted, dirty: false,
        // the mounted-patrol AI reads these every frame from the leaf module
        stabled: s.stabled ?? [], mounts: s.mounts ?? {},
        waterworks: persisted.waterworks, time: persisted.timeOfDay, dayCount: persisted.dayCount,
        ids: s,
      });
    },

    toSave: () => buildSave(get(), {
      // worldEnv/riding/waterworks are the live truth for these (see persistence.ts)
      timeOfDay: worldEnv.time, dayCount: worldEnv.dayCount,
      stabledIds: stabledHorses.ids, stabledAssigned: stabledHorses.assigned,
      waterworks: waterworks.list,
    }),

    setCharacter: (character) => set({ character, dirty: true }),

    markSaved: () => set({ dirty: false }),
  };
};
