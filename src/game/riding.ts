'use client';
// Horse riding state: which wild horse is mounted and shared horse mobs.
// Horse positions are mutated in place (no store churn); the Wildlife horses
// and the PlayerController both read/write these objects.

export interface HorseMob {
  id: string;
  url: string; // which catalog model/color this instance renders — carried
  // into ridingState on mount so the mounted view matches (see MountedHorse.tsx)
  x: number; z: number; yaw: number;
  tx: number; tz: number;
  pause: number;
  soundIn: number;
  homeX: number; homeZ: number;
  mounted: boolean;
}

export const horses: Record<string, HorseMob> = {};

export function registerHorse(id: string, url: string, x: number, z: number): HorseMob {
  if (!horses[id]) {
    horses[id] = {
      id, url, x, z, yaw: Math.random() * Math.PI * 2,
      tx: x, tz: z, pause: 3 + Math.random() * 5,
      soundIn: 10 + Math.random() * 20,
      homeX: x, homeZ: z, mounted: false,
    };
  }
  return horses[id];
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

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkr = ridingState;
  (window as unknown as Record<string, unknown>).__kkhorses = horses;
  (window as unknown as Record<string, unknown>).__kkstable = stabledHorses;
  // debug handle so a smoke test can get into the saddle without pointer lock
  (window as unknown as Record<string, unknown>).__kkmount = mountHorse;
}
