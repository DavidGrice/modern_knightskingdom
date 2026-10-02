// CLN-21 · moved verbatim out of data/npcs.ts.
import type { NpcDef } from './types';

// Wave 45 (B3): resident quest-givers for the 4 zero-occupant generalized
// interiors (data/interiors.ts — Storehouse, Jail Cell, Watch Tower, Jewel
// Tower). These are player-BUILT buildable types, not fixed destinations —
// materially different from every NpcDef in NPCS (./roster), so they get their own small
// table instead of NPCS entries:
//
// - Type-scoped, not instance-scoped: one Corwin no matter how many
//   Storehouses exist, keyed here off `PlacedBuilding.type` the same way
//   `INTERIORS` itself already is. Traced `removeBuilding()` (gameStore.ts)
//   end to end: it only ever touches `st.buildings`/`st.inventory`, never
//   `completedSideQuests`/`sideQuest`/`reputation` — all of which are keyed
//   on a fixed npc id already, with zero dependency on any buildingId. So
//   demolishing every instance of a type just makes that resident
//   temporarily unreachable (no room to enter), exactly like any other
//   quest-giver the player hasn't gone to visit — never an orphaned errand,
//   and zero new demolish-time bookkeeping needed. None of these 4 buildable
//   types has a `unique` field, so a player really can have several at once
//   (or none) — an instance-keyed resident would have had to pick one, or
//   invent a reassignment mechanism, for no real benefit.
//
// - NOT added to NPCS itself: `Npc.tsx`'s render filter, `scheduledCourtNpcs`,
//   `poisForDestination`, and PlayerController's own home-only NPC interact
//   loop all iterate NPCS unconditionally. A resident's only meaningful
//   position is `pocketFor(type, buildingId)` — coordinates in the same
//   shared "empty corner of the map" space interiors.ts's own pocketFor
//   comment describes — so an NPCS entry there would let a player who wanders
//   out to that empty field see a floating "Talk to X" prompt with no NPC
//   actually rendered (Npc.tsx would still correctly refuse to render them
//   without a `world` match). Merged into NPC_BY_ID only (./roster), so
//   DialoguePanel/sideQuestsOf/sideQuestGiverName/QuestLogPanel can still
//   resolve them by id exactly like every other quest-giver.
//
// - x/z/yaw on each npc below are unused sentinels (0) — see `localX`/
//   `localZ`/`yaw` instead, resolved against whichever building instance's
//   own pocket is currently entered (PlayerController.tsx's `findTarget`,
//   BuildingInteriorRoom.tsx's render).
export interface InteriorResident {
  npc: NpcDef;
  /** local offset from the room's own pocket center (data/interiors.ts's
   *  pocketFor) — the SAME point drives both the rendered figure's stand
   *  spot (BuildingInteriorRoom.tsx) and the interact-distance check
   *  (PlayerController.tsx), so they can never drift apart. */
  localX: number;
  localZ: number;
  yaw: number;
}

export const INTERIOR_RESIDENTS: Record<string, InteriorResident> = {
  storehouse: {
    npc: {
      id: 'corwin', name: 'Corwin', title: 'Storehouse Quartermaster',
      config: {
        name: 'Corwin', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
        armColor: 25, handColor: 18, legColor: 25, hipColor: 26,
      },
      x: 0, z: 0, yaw: 0, keepProps: false,
      greetSound: 'villager', portrait: '/assets/minifigs/minifiggenericgood00.png',
      lines: [
        'Every crate in here is spoken for, one way or another. Mind the count when you take from it.',
        'A storehouse this size wants proper shelving, not just stacked barrels.',
      ],
      sideQuests: [
        {
          id: 'cw_shelves', kind: 'gather', target: 'stone', need: 6,
          label: 'Bring 6 stone to shore up the shelving',
          xpSkill: 'mining', xp: 30, rewardItems: { gold: 12 },
        },
        {
          id: 'cw_crates', kind: 'craft', target: 'plank', need: 5,
          label: 'Mill 5 planks for new storage crates',
          xpSkill: 'woodcutting', xp: 35, rewardItems: { gold: 14 },
        },
      ],
    },
    localX: 0, localZ: 1.5, yaw: 0,
  },
  'oc6094-2': {
    npc: {
      id: 'cutter', name: 'Cutter', title: 'Reformed Prisoner',
      config: {
        name: 'Cutter', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
        armColor: 34, handColor: 18, legColor: 34, hipColor: 34,
      },
      x: 0, z: 0, yaw: 0, keepProps: false,
      greetSound: 'villager', portrait: '/assets/minifigs/minifiggenericgood00.png',
      lines: [
        'Poaching, they called it. I call it not starving. Either way, here I sit.',
        "You've a kinder look than the last one who locked this door. I can work with that.",
      ],
      sideQuests: [
        {
          id: 'ct_bread', kind: 'craft', target: 'bread', need: 2,
          label: 'Slip him 2 loaves of bread',
          xpSkill: 'farming', xp: 25, rewardItems: { gold: 10 },
        },
        {
          id: 'ct_flowers', kind: 'gather', target: 'flowers', need: 3,
          label: 'Bring 3 bundles of wildflowers to brighten the cell',
          xpSkill: 'woodcutting', xp: 20, rewardItems: { gold: 12 },
        },
      ],
    },
    localX: -0.2, localZ: 0.3, yaw: 0,
  },
  tower: {
    npc: {
      id: 'perrin', name: 'Perrin', title: 'Watch Tower Lookout',
      config: {
        name: 'Perrin', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
        armColor: 70, handColor: 18, legColor: 46, hipColor: 47,
      },
      x: 0, z: 0, yaw: 0, keepProps: false,
      greetSound: 'villager', portrait: '/assets/minifigs/minifiggenericgood00.png',
      lines: [
        "Best view of the tree line for a mile. Doesn't mean I like everything I see from up here.",
        "Rack's got room for a real weapon, if you ever find one worth mounting.",
      ],
      sideQuests: [
        {
          id: 'pr_watch', kind: 'kill', target: 'any', need: 3,
          label: 'Clear 3 threats spotted from the tower',
          xpSkill: 'combat', xp: 50, rewardItems: { gold: 18 },
        },
        {
          id: 'pr_repair', kind: 'gather', target: 'iron_ore', need: 5,
          label: "Bring 5 iron ore to fix the tower's fittings",
          xpSkill: 'mining', xp: 35, rewardItems: { gold: 14 },
        },
      ],
    },
    localX: -0.3, localZ: -0.5, yaw: 0,
  },
  oc6098b3: {
    npc: {
      id: 'aldous', name: 'Aldous', title: 'Jewel Tower Appraiser',
      config: {
        name: 'Aldous', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
        armColor: 150, handColor: 18, legColor: 150, hipColor: 24,
      },
      x: 0, z: 0, yaw: 0, keepProps: false,
      greetSound: 'villager', portrait: '/assets/minifigs/minifiggenericgood00.png',
      lines: [
        "Every piece in this vault has a story. Most of them are lies, but the gold's real enough.",
        "Bring me good iron and I'll set it properly, not just piled loose like a magpie's nest.",
      ],
      sideQuests: [
        {
          id: 'al_settings', kind: 'craft', target: 'iron_bar', need: 3,
          label: 'Smelt 3 iron bars for new settings',
          xpSkill: 'smithing', xp: 40, rewardItems: { gold: 20 },
        },
        {
          id: 'al_guard', kind: 'kill', target: 'any', need: 4,
          label: 'See off 4 would-be vault raiders',
          xpSkill: 'combat', xp: 70, rewardItems: { gold: 30 },
        },
      ],
    },
    localX: -0.5, localZ: 0.2, yaw: 0,
  },
};
