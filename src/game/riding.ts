'use client';

// Horse riding state: which wild horse is mounted and shared horse mobs.
// Horse positions are mutated in place (no store churn); the Wildlife horses
// and the PlayerController both read/write these objects.

import { exposeDebug } from '@/lib/debugHooks';

interface HorseMob {
  id: string;
  url: string; // which catalog model/color this instance renders — carried
  // into ridingState on mount so the mounted view matches (see MountedHorse.tsx)
  /** the scene it lives in: a destination's id, or null for the homestead.
   *  Set once, when the record is made — see horseIsHere below */
  world: string | null;
  x: number; z: number; yaw: number;
  tx: number; tz: number;
  pause: number;
  soundIn: number;
  homeX: number; homeZ: number;
  mounted: boolean;
}

export const horses: Record<string, HorseMob> = {};

export function registerHorse(id: string, url: string, x: number, z: number, world: string | null = null): HorseMob {
  if (!horses[id]) {
    horses[id] = {
      id, url, world, x, z, yaw: Math.random() * Math.PI * 2,
      tx: x, tz: z, pause: 3 + Math.random() * 5,
      soundIn: 10 + Math.random() * 20,
      homeX: x, homeZ: z, mounted: false,
    };
  }
  return horses[id];
}

/** Is this horse in the scene the player is in? Its x/z cannot say: a record
 *  is made once and kept for every scene, and the scenes lie over one another
 *  in the same world coordinates — the destinations' origins are 300 m apart
 *  and the ground of one reaches well past the next (Richard's steed on its
 *  tilt field stands on ground The King's Approach lets a player walk on
 *  too). So what draws a grazing horse and what offers one both ask this:
 *  Wildlife.tsx draws it only here, and PlayerController's two "Ride Horse"
 *  loops offer it only here (horseOnOffer, below). The same residency test
 *  joust.ts makes for Richard himself. */
export function horseIsHere(h: { world: string | null }, destination: string | null | undefined): boolean {
  return h.world === (destination ?? null);
}

/** Can the player, in `destination`, get on this horse — leaving aside how
 *  near it is? One that nobody is riding and that lives here. Both of
 *  PlayerController's "Ride Horse" loops ask this and then measure. */
export function horseOnOffer(h: { mounted: boolean; world: string | null }, destination: string | null | undefined): boolean {
  return !h.mounted && horseIsHere(h, destination);
}

/** G27 · horses the player has caught and stabled. A stabled horse stops
 *  wandering the meadow and becomes homestead property: it can be assigned to
 *  a defender, who then patrols mounted. Persisted with the save. */
export const stabledHorses = {
  /** horse mob ids that now belong to the homestead */
  ids: [] as string[],
  /** villagerId -> horseId, for defenders riding out on patrol */
  assigned: {} as Record<string, string>,
};

/** Can this horse be taken into the homestead's stable (PlayerController's
 *  dismount beside a built Stable)? One of the homestead's own herd, and only
 *  once. A horse that lives at a destination is somebody's: Richard's steed
 *  stays his, whatever is built beside his lists — stabled, it would be
 *  saved as the homestead's and could be handed to a defender. (No ordinary
 *  play finishes a Stable at the Tourney Grounds today: no builders live
 *  there, and the hammer is not offered away from home. This keeps the steed
 *  his if that ever changes.) */
export function canStable(id: string): boolean {
  const h = horses[id];
  return !!h && h.world === null && !stabledHorses.ids.includes(id);
}

export function stableHorse(id: string) {
  if (!stabledHorses.ids.includes(id)) stabledHorses.ids.push(id);
}

/** which horse, if any, this defender rides */
export function mountOf(villagerId: string): string | null {
  return stabledHorses.assigned[villagerId] ?? null;
}

/** K54 · is this horse out with a defender? It is then drawn beneath them by
 *  Defenders.tsx, so the meadow instance must not also be standing about. */
export function riddenByAlly(horseId: string): boolean {
  for (const id in stabledHorses.assigned) {
    if (stabledHorses.assigned[id] === horseId) return true;
  }
  return false;
}

export const ridingState = {
  active: false,
  horseId: null as string | null,
  horseUrl: null as string | null,
};

export function mountHorse(id: string) {
  const h = horses[id];
  if (!h || h.mounted) return;
  h.mounted = true;
  ridingState.active = true;
  ridingState.horseId = id;
  ridingState.horseUrl = h.url;
}

export function dismountHorse(px: number, pz: number, yaw: number) {
  const id = ridingState.horseId;
  ridingState.active = false;
  ridingState.horseId = null;
  const h = id ? horses[id] : null;
  if (h) {
    h.mounted = false;
    h.x = px;
    h.z = pz;
    h.yaw = yaw;
    h.homeX = px;
    h.homeZ = pz;
    h.tx = px;
    h.tz = pz;
    h.pause = 4;
  }
}

/** CLN-04 · session start. The saddle is not part of a save, so a loaded or new
 *  game must not begin mounted on the last session's horse. In place (no key is
 *  deleted): Wildlife.tsx holds each horse's `horses[id]` object from a useMemo,
 *  and MountedHorse/PlayerController only read `ridingState` fields. */
export function resetRiding(): void {
  ridingState.active = false;
  ridingState.horseId = null;
  ridingState.horseUrl = null;
  for (const id in horses) horses[id].mounted = false;
}

exposeDebug('__kkr', ridingState);
exposeDebug('__kkhorses', horses);
exposeDebug('__kkstable', stabledHorses);
// debug handle so a smoke test can get into the saddle without pointer lock
exposeDebug('__kkmount', mountHorse);
