// CLN-21 · who is revealed / in session / a waypoint right now, moved verbatim out of data/npcs.ts.
import { activeWindow } from '../schedule';
import { WORK_START, WORK_END } from '../villagers';
import { NPCS } from './roster';
import type { NpcDef } from './types';

/** whether an NPC has appeared yet — see NpcDef.revealAfterQuest (./types). */
export function isNpcRevealed(npc: NpcDef, completedQuests: string[]): boolean {
  return !npc.revealAfterQuest || completedQuests.includes(npc.revealAfterQuest);
}

/** Wave 53 (E5) · the court's own hours — named independently of
 *  isWorkingHours (data/villagers.ts) rather than a re-export, even though
 *  it shares that function's exact WORK_START/WORK_END bounds today: a
 *  villager's working day and the crown's own court hours are two different
 *  concepts that just happen to agree right now, and coupling them by
 *  sharing one function would make a future change to either silently drag
 *  the other along with it. */
export const COURT_START = WORK_START;
export const COURT_END = WORK_END;
export function isCourtHours(time: number): boolean {
  return activeWindow(time, COURT_START, COURT_END);
}

/** whether an NPC is both revealed AND, for one with its own `courtHours`
 *  gate, actually in session right now. Used wherever a check needs to know
 *  if this NPC is really there to talk to this instant, not just whether
 *  they've ever appeared — PlayerController's destination interact loop and
 *  Minimap's own NPC-dot loop (both already run every frame off a live
 *  `worldEnv.time` read, so the gate is genuinely reactive there — see each
 *  file's own call site). */
export function isNpcPresent(npc: NpcDef, completedQuests: string[], time: number): boolean {
  return isNpcRevealed(npc, completedQuests) && (!npc.courtHours || isCourtHours(time));
}

/** Court NPCs that actually move under `navSteer` — `Npc.tsx`'s own
 *  "schedule" concept (`revealAfterQuest && !world`): a real day/night
 *  walk, not the static starter farmers or instance residents, who render
 *  (`Npc.tsx`'s own broader reveal filter, unchanged) but never reach a
 *  navSteer call site. Phase 3, iteration 3.4 — the population
 *  `src/ai/npcSync.ts` spawns an Agent per; an Agent for a static NPC
 *  would just sit unused. Mirrors the `revealed` filter `Npc.tsx`'s own
 *  default export already computes inline, plus the schedule condition —
 *  kept here, not duplicated, so the two can't drift apart. */
export function scheduledCourtNpcs(
  completedQuests: string[], destination: string | null, villagers: { id: string }[],
): NpcDef[] {
  return NPCS.filter((n) =>
    !!n.revealAfterQuest && !n.world
    && isNpcRevealed(n, completedQuests)
    && (n.world ?? null) === (destination ?? null)
    && !villagers.some((v) => v.id === n.id));
}

/** Wave 14 · a Point of Interest a traveler can waypoint straight to inside
 *  a destination, instead of only ever landing at that destination's generic
 *  `origin` (see gameStore's `travelTo`). v1 POI data is deliberately NOT a
 *  new hand-authored table — it's derived live from the resident court NPCs
 *  already defined in the roster (./roster), each of which already has a real name/title/
 *  portrait and a world-absolute x/z/yaw, so a POI and its resident can
 *  never drift out of sync with each other. `mapPopulation.generated.json`
 *  (the Grok lab's set-dressing prop placement) was considered and rejected
 *  as a POI source for this wave: it's sparse (rows for only 7 of 9
 *  templates), and the `set`-kind rows that make up most of it carry only an
 *  opaque catalogue `assetRef` (e.g. "oc6095b3") with no human-readable name
 *  anywhere in the data — turning that into POIs would mean hand-authoring
 *  landmark labels destination by destination, well past this wave's
 *  "waypoint to something real" scope. A destination with no resident NPC
 *  (04/05/07/09, all 6 challenge grounds, the dungeon, the arena) simply has
 *  no POI in v1 — `travelTo(id)` alone still lands at `dest.origin` exactly
 *  as it always has. */
export interface Poi {
  /** the resident NPC's own id — also the `discoveredPois` save key */
  id: string;
  name: string;
  title: string;
  portrait: string;
  world: string;
  x: number;
  z: number;
  yaw: number;
}

/** Every POI inside one destination, in roster order. Gated by the SAME
 *  `isNpcRevealed` quest gate the resident already uses everywhere else (the
 *  Travel Map must not spoil a character before their reveal quest) — a
 *  stricter gate than a save's `discoveredPois`, which only tracks whether an
 *  already-revealed POI has actually been waypointed to yet. */
export function poisForDestination(destId: string, completedQuests: string[]): Poi[] {
  return NPCS
    .filter((n) => n.world === destId && isNpcRevealed(n, completedQuests))
    .map((n) => ({ id: n.id, name: n.name, title: n.title, portrait: n.portrait, world: n.world!, x: n.x, z: n.z, yaw: n.yaw }));
}
