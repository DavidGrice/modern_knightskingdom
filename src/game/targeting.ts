'use client';
// What the crosshair is actually on.
//
// Feeds three things that were all guessing before: the aim-time readout
// (who is that, how hurt are they), the crosshair's own colour, and the
// scan that records a foe into the collection book. One shared resolve, so
// all three always agree about what you are looking at.
//
// A mutable leaf module: written by PlayerController's frame loop, read by
// DOM HUD components, exactly like playerState and combatState.
import { hitTestCharacter, hitboxes } from './hitbox';
import { npcMobs } from './npcMobs';
import { villagerMobs } from './villagerMobs';
import { defenderState } from './defenders';

export type Standing = 'hostile' | 'friendly' | 'neutral';

export interface AimTarget {
  /** stable key: `enemy:<id>`, `npc:<id>`, `villager:<id>` */
  key: string;
  kind: string;
  name: string;
  standing: Standing;
  /** metres from the player */
  distance: number;
  hp?: number;
  maxHp?: number;
  /** set for a foe the player has already scanned into the book */
  known?: boolean;
  /** where they stand, so the nameplate can be pinned over their head
   *  instead of parked in the middle of the screen */
  x: number;
  z: number;
  /** how tall they are, in metres — the plate hangs just above this */
  height: number;
}

export const aimState = {
  target: null as AimTarget | null,
  /** the target's head, projected to CSS pixels by PlayerController (which is
   *  the only place that holds the camera). `vis` is false when the head is
   *  behind the camera or off-screen. The HUD is plain DOM in a different
   *  React tree, so it reads this rather than doing its own projection. */
  screen: { x: 0, y: 0, vis: false },
};

/** how far the aim ray reaches — beyond this a figure is too far to read */
export const AIM_RANGE = 70;
/** friendlies get a simple upright capsule; only foes need per-part boxes */
const FRIENDLY_RADIUS = 0.55;
const FRIENDLY_HEIGHT = 1.8;

/** ray-vs-vertical-cylinder, returning distance along the ray or null */
function hitCylinder(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  cx: number, cz: number, radius: number, height: number,
): number | null {
  const mx = ox - cx;
  const mz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return null;
  const b = 2 * (mx * dx + mz * dz);
  const c = mx * mx + mz * mz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0 || t > AIM_RANGE) return null;
  const y = oy + dy * t;
  return y >= 0 && y <= height ? t : null;
}

/**
 * Resolve what the camera ray is pointing at. `enemies` and `npcInfo` are
 * passed in rather than imported so this module stays a leaf — combat.ts
 * already imports the store, and importing it back here would cycle.
 */
export function resolveAim(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  enemies: { id: number; kind: string; hp: number; maxHp?: number; mob: { x: number; z: number; yaw: number; state: string } }[],
  nameOfEnemy: (kind: string) => string,
  maxHpOf: (kind: string) => number,
  npcName: (id: string) => string,
  villagerName: (id: string) => string,
  isKnown: (kind: string) => boolean,
  /** every current villager id, tagged with whether they're presently a
   *  defender — Villagers.tsx and Defenders.tsx are two entirely separate
   *  render trees with their own live position store (villagerMobs vs
   *  defenderState), and only ONE of them is actually being written to for
   *  a given villager right now. Reading the wrong one for a villager who
   *  just switched jobs is what pinned a nametag at their bed forever after
   *  becoming a defender — the id alone isn't enough to know which store is
   *  live, so the caller (which has the real Villager.job) says so. */
  villagerIds: { id: string; isDefender: boolean }[] = [],
  /** Wave 36 (A3): a mounted raider's rig sits MOUNT_SEAT_Y off the ground
   *  (Enemies.tsx's own saddle wrap) — this module stays a dependency-free
   *  leaf (importing combat.ts's MOUNT_SEAT_Y here would cycle, the same
   *  reason `enemies`/`maxHpOf` above are passed in rather than imported),
   *  so the caller supplies the answer exactly like it already does for
   *  `maxHpOf`/`nameOfEnemy`. Defaults to 0 (every non-mounted kind) for any
   *  existing caller that hasn't been updated. */
  mountSeatYOf: (kind: string) => number = () => 0,
): AimTarget | null {
  let best: AimTarget | null = null;
  let bestT = Infinity;

  const ex = ox + dx * AIM_RANGE;
  const ey = oy + dy * AIM_RANGE;
  const ez = oz + dz * AIM_RANGE;

  for (const e of enemies) {
    if (e.mob.state === 'dying') continue;
    // foes carry real per-part volumes (game/hitbox.ts), so the readout
    // appears only when the crosshair is genuinely on them
    const hit = hitboxes[String(e.id)]
      ? hitTestCharacter(String(e.id), e.mob.x, e.mob.z, e.mob.yaw, mountSeatYOf(e.kind), ox, oy, oz, ex, ey, ez)
      : null;
    const t = hit
      ? hit.t * AIM_RANGE
      : hitCylinder(ox, oy, oz, dx, dy, dz, e.mob.x, e.mob.z, FRIENDLY_RADIUS, FRIENDLY_HEIGHT);
    if (t === null || t >= bestT) continue;
    bestT = t;
    best = {
      key: `enemy:${e.id}`,
      kind: e.kind,
      name: nameOfEnemy(e.kind),
      standing: 'hostile',
      distance: t,
      hp: Math.max(0, e.hp),
      // this instance's own (possibly raid-scaled) ceiling when the caller
      // has it (combat.ts's EnemyData.maxHp); the flat per-kind fallback
      // stays for any caller that only ever had the bare kind string
      maxHp: e.maxHp ?? maxHpOf(e.kind),
      known: isKnown(e.kind),
      x: e.mob.x, z: e.mob.z, height: FRIENDLY_HEIGHT,
    };
  }

  for (const [id, m] of Object.entries(npcMobs)) {
    const t = hitCylinder(ox, oy, oz, dx, dy, dz, m.x, m.z, FRIENDLY_RADIUS, FRIENDLY_HEIGHT);
    if (t === null || t >= bestT) continue;
    bestT = t;
    best = { key: `npc:${id}`, kind: 'npc', name: npcName(id), standing: 'friendly', distance: t,
      x: m.x, z: m.z, height: FRIENDLY_HEIGHT };
  }

  for (const { id, isDefender } of villagerIds) {
    const pos = isDefender ? defenderState[id] : villagerMobs[id];
    if (!pos) continue;
    const t = hitCylinder(ox, oy, oz, dx, dy, dz, pos.x, pos.z, FRIENDLY_RADIUS, FRIENDLY_HEIGHT);
    if (t === null || t >= bestT) continue;
    bestT = t;
    best = { key: `villager:${id}`, kind: 'villager', name: villagerName(id), standing: 'friendly', distance: t,
      x: pos.x, z: pos.z, height: FRIENDLY_HEIGHT };
  }

  return best;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkaim = aimState;
}
