// J51 · The Grand Keep, composed.
//
// The keep used to be a single buildable: one mesh, placed on one grid cell,
// finished. A castle is not a thing you place, it is a thing you assemble —
// so the keep is now a FOUNDATION with SOCKETS, and you fill each socket
// yourself. Pick a corner and you are offered what can stand on a corner;
// pick a wall run and you are offered walls and a gatehouse. What you end up
// with is a castle you laid out, not the castle the game shipped.
//
// Sockets rather than grid cells is the whole point of the mechanic: a corner
// is a NAMED place on the foundation with its own facing, so a piece dropped
// into it always lines up with its neighbours. The wall family was measured
// and unified to k=0.05 in the 2026-07-20 scale pass (see buildables.ts) —
// straights are 8m wide, corners and turrets 4m square — and the foundation
// below is sized off those numbers so a full ring closes exactly.
import type { ItemId } from '../types';

const B = '/assets/props/buildings';
const P = '/assets/props';

/** the foundation is 16m square: two 8m wall runs per side between 4m corners */
export const KEEP_SIZE = 16;
/** half, for laying sockets out around the edge */
const H = KEEP_SIZE / 2;

export type SocketKind = 'corner' | 'wall' | 'centre';

export interface KeepSocket {
  id: string;
  name: string;
  kind: SocketKind;
  /** local position on the foundation, metres from its centre */
  x: number;
  z: number;
  /** which way the piece faces, radians; yaw 0 faces -Z */
  yaw: number;
}

/** 4 corners, 4 wall runs, 1 great hall in the middle. */
export const KEEP_SOCKETS: KeepSocket[] = [
  { id: 'nw', name: 'North-West Corner', kind: 'corner', x: -H + 2, z: -H + 2, yaw: 0 },
  { id: 'ne', name: 'North-East Corner', kind: 'corner', x: H - 2, z: -H + 2, yaw: -Math.PI / 2 },
  { id: 'se', name: 'South-East Corner', kind: 'corner', x: H - 2, z: H - 2, yaw: Math.PI },
  { id: 'sw', name: 'South-West Corner', kind: 'corner', x: -H + 2, z: H - 2, yaw: Math.PI / 2 },
  { id: 'n', name: 'North Wall', kind: 'wall', x: 0, z: -H + 1.2, yaw: 0 },
  { id: 'e', name: 'East Wall', kind: 'wall', x: H - 1.2, z: 0, yaw: -Math.PI / 2 },
  { id: 's', name: 'South Wall', kind: 'wall', x: 0, z: H - 1.2, yaw: Math.PI },
  { id: 'w', name: 'West Wall', kind: 'wall', x: -H + 1.2, z: 0, yaw: Math.PI / 2 },
  { id: 'hall', name: 'The Bailey', kind: 'centre', x: 0, z: 0, yaw: 0 },
];

export const SOCKET_BY_ID: Record<string, KeepSocket> = Object.fromEntries(
  KEEP_SOCKETS.map((s) => [s.id, s]),
);

export interface KeepPart {
  id: string;
  name: string;
  /** what it does for the castle, shown under the name */
  blurb: string;
  /** which socket kinds will take it */
  fits: SocketKind[];
  model: string;
  thumb: string;
  /** rendered height in metres */
  height: number;
  cost: Partial<Record<ItemId, number>>;
  buildXp: number;
  /** a manned wall walk: defenders posted to the keep stand this high */
  walkway?: number;
}

/**
 * What can stand where. Every model here is a piece of the mc00 castle set
 * the game already ships, at the family's unified scale.
 */
export const KEEP_PARTS: KeepPart[] = [
  {
    id: 'corner_turret', name: 'Corner Turret', blurb: 'A tall watch turret — archers see further from it.',
    fits: ['corner'], model: `${B}/mc003.glb`, thumb: `${B}/mc003.png`,
    height: 8.16, cost: { stone: 16, wood: 4 }, buildXp: 55, walkway: 4.2,
  },
  {
    id: 'corner_block', name: 'Corner Bastion', blurb: 'A squat, thick-walled corner. Cheaper, and it still closes the ring.',
    fits: ['corner'], model: `${B}/mc004.glb`, thumb: `${B}/mc004.png`,
    height: 4.32, cost: { stone: 10 }, buildXp: 35, walkway: 3.6,
  },
  {
    id: 'wall_crenel', name: 'Crenellated Wall', blurb: 'A battlemented run with a walk along the top.',
    fits: ['wall'], model: `${B}/mc007.glb`, thumb: `${B}/mc007.png`,
    height: 5.28, cost: { stone: 14 }, buildXp: 45, walkway: 3.6,
  },
  {
    id: 'wall_low', name: 'Low Wall', blurb: 'A plain course of stone. It will do until there is more stone.',
    fits: ['wall'], model: `${B}/mc005.glb`, thumb: `${B}/mc005.png`,
    height: 3.4, cost: { stone: 8 }, buildXp: 25,
  },
  {
    id: 'gatehouse', name: 'Gatehouse', blurb: 'A way in. A castle with no gate is a wall you live behind.',
    fits: ['wall'], model: `${P}/windows_doors/06_l318500.glb`, thumb: `${P}/windows_doors/06_l318500.png`,
    height: 3.2, cost: { stone: 10, iron_bar: 2 }, buildXp: 40,
  },
  {
    id: 'great_hall', name: 'Great Hall', blurb: 'The hall itself. Nothing else on this foundation is a castle without it.',
    fits: ['centre'], model: `${B}/mc001.glb`, thumb: `${B}/mc001.png`,
    height: 3.84, cost: { stone: 20, wood: 12, plank: 8 }, buildXp: 80,
  },
];

export const KEEP_PART_BY_ID: Record<string, KeepPart> = Object.fromEntries(
  KEEP_PARTS.map((p) => [p.id, p]),
);

/** what may be raised on this socket */
export function partsFor(kind: SocketKind): KeepPart[] {
  return KEEP_PARTS.filter((p) => p.fits.includes(kind));
}

/** a keep as it is stored: where its foundation sits, and what is in each
 *  socket. Sockets with no entry are empty ground. */
export interface KeepState {
  x: number;
  z: number;
  /** socket id -> part id */
  parts: Record<string, string>;
  /** socket id -> 0..1 construction progress, same hammer work as any site */
  built: Record<string, number>;
  /** socket id -> current siege HP; absent = full (maxHpForPart). Absent
   *  entirely on saves from before a raised piece could be knocked down. */
  hp?: Record<string, number>;
}

/** the castle is "finished" once every socket carries a completed piece */
export function keepComplete(k: KeepState): boolean {
  return KEEP_SOCKETS.every((s) => k.parts[s.id] && (k.built[s.id] ?? 0) >= 1);
}

export function keepProgress(k: KeepState): number {
  const done = KEEP_SOCKETS.reduce((n, s) => n + Math.min(1, k.built[s.id] ?? 0), 0);
  return done / KEEP_SOCKETS.length;
}

/** structural HP, the same cost-derived formula buildables.ts's maxHpFor
 *  uses for every other structure — pricier pieces shrug off more siege
 *  damage before they come down. */
export function maxHpForPart(part: KeepPart): number {
  const totalCost = Object.values(part.cost).reduce((s: number, n) => s + (n ?? 0), 0);
  return Math.max(15, Math.round(totalCost * 3));
}
