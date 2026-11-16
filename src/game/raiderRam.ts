'use client';

import { exposeDebug } from '@/lib/debugHooks';
import type { KeepState } from './data/keep';
import { sizeFor } from './data/buildables';
import { roadEntry, roadEntryOut } from './data/road';
import { HOME_X, HOME_Z } from './data/villagers';
import { findPath, getNavGrid, navReachable, HOME_NAV_CELLS } from './navgrid';
import { KEEP_SITE_ID, siteById, siteGate, siteSocketOutside, siteSocketWorld, siteSockets } from './sites/sites';
import { isBuilt, isDoorLike, isHomeBuilding, type PlacedBuilding } from './types';

// A raider-pushed battering ram: the AI-driven counterpart to the player's
// own pushable cart (see game/carts.ts's cartState, siege.ts's ramCheck).
// Spawned occasionally at the start of a raid, it trundles toward the
// nearest shut gate (or the homestead's center if there isn't one) and
// rams whatever it reaches — realizing Phase 4's raid description
// ("gates, walls and towers become functional defense") for the attacking
// side too, not just the player's own siege tools.
//
// It can be STOPPED: the ram carries its own HP and takes melee and ranged
// damage like anything else, so a defended homestead can break the thing
// before it reaches the gate instead of only watching it arrive. Taking a
// blow and lying wrecked are what it shares with the siege ladder
// (game/raiderProps.ts; what it is worth broken is combat/structures.ts).
//
// G-03 · it comes by the road (ramSpawn), as the raiders do, and rolls a way
// round what stands (rollRaiderRam) — it used to start on a 34 m ring round
// home and drive straight at its gate, through the village, the trees and the
// keep's own walls.
const RAM_MAX_HP = 30;
/** roughly a slow determined trudge, matching the player's own push pace */
const RAM_SPEED = 1.3;
/** G-03 · how far back along the road beyond roadEntry() the ram comes rolling up from */
const RAM_ROAD_BACK = 8;
/** G-03 · how far from a gate's face the ram's way ends: from there it rolls on straight into the gate, and ramCheck
 *  bursts it within 2.1 m of its middle */
const RAM_STAND = 1.2;
/** G-03 · how often (seconds) the ram works its way out again */
const RAM_REPLAN = 1;
/** how close a swing or a shaft has to come to count as a hit */
export const RAM_RADIUS = 1.1;

export const raiderRamState = {
  active: false,
  x: 0,
  z: 0,
  hp: RAM_MAX_HP,
  /** metres rolled, so the wheels the rig lab labelled actually turn */
  travel: 0,
  /** set when HP runs out — the wreck sits a moment before despawning */
  wrecked: false,
  wreckT: 0,
  /** G-03 · its way (a wide walker's, nav/grid.ts), the corner it rolls for, when to work it out again, and what it was
   *  worked out to — the gate's id, or '' for home's middle */
  route: [] as { x: number; z: number }[],
  routeI: 0,
  routeT: 0,
  routeFor: '',
};

export function resetRaiderRam(x: number, z: number) {
  raiderRamState.active = true;
  raiderRamState.x = x;
  raiderRamState.z = z;
  raiderRamState.hp = RAM_MAX_HP;
  raiderRamState.travel = 0;
  raiderRamState.wrecked = false;
  raiderRamState.wreckT = 0;
  raiderRamState.route = [];
  raiderRamState.routeI = 0;
  raiderRamState.routeT = 0;
}

/** G-03 · where a raid's ram comes from: back along the road past roadEntry(), on the open cell nearest it — the way
 *  the raiders themselves come (it rolled in from a 34 m ring round home, wherever the dice put it) */
export function ramSpawn(): { x: number; z: number } {
  const entry = roadEntry();
  const out = roadEntryOut();
  const x = entry.x + out.x * RAM_ROAD_BACK, z = entry.z + out.z * RAM_ROAD_BACK;
  return getNavGrid(null).nearestWalkable(x, z) ?? { x, z };
}

/** whatever is barred against the raiders: the first shut door or gate (Wave 8 — isDoorLike; a ram against a garden
 *  door is still a ram), else none and the ram makes for the homestead's centre. Wave 68 · one standing at home: ramCheck
 *  strikes only in the ram's own world and only what stands, so a door shut at a destination, or a shut gate the dragon
 *  left a ruin, would park the ram on it for the rest of the raid. Wave 69 (G-02) · else the home keep's gatehouse,
 *  standing shut (its id the socket's, `keep:<socket>`), which ramCheck bursts open as it does a gate. */
export function raiderRamGate(
  buildings: PlacedBuilding[], gateOpen: Record<string, boolean>, keep: KeepState | null = null,
): { id: string; x: number; z: number } | undefined {
  const gate = buildings.find((b) => isDoorLike(b.type) && isHomeBuilding(b) && isBuilt(b) && !(gateOpen[b.id] ?? true));
  if (gate) return gate;
  const site = keep && siteById({ keep, sites: [] }, KEEP_SITE_ID);
  const sock = site && siteSockets(site).find((s) => siteGate(site, s.id) === 'shut');
  if (!site || !sock) return undefined;
  const at = siteSocketWorld(site, sock.id)!;
  return { id: `keep:${sock.id}`, x: at.x, z: at.z };
}

/** G-03 · the ground the ram makes for to ram `gate` (raiderRamGate's): RAM_STAND out from the keep's gatehouse, on its
 *  outer side; from a gate of the player's, on the face of it nearest the ram that it has a way to (else the nearest) */
export function ramStand(keep: KeepState | null, buildings: PlacedBuilding[], gate: { id: string; x: number; z: number }): { x: number; z: number } {
  const r = raiderRamState;
  if (gate.id.startsWith('keep:')) {
    const site = keep && siteById({ keep, sites: [] }, KEEP_SITE_ID);
    return (site && siteSocketOutside(site, gate.id.slice(5), RAM_STAND)) || gate;
  }
  const b = buildings.find((x) => x.id === gate.id);
  if (!b) return gate;
  const [sx, sz] = sizeFor(b.type, b.rot);
  const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([ux, uz]) => ({ x: b.x + ux * (sx / 2 + RAM_STAND), z: b.z + uz * (sz / 2 + RAM_STAND) }))
    .sort((p, q) => Math.hypot(p.x - r.x, p.z - r.z) - Math.hypot(q.x - r.x, q.z - r.z));
  return faces.find((p) => navReachable(r.x, r.z, p.x, p.z)) ?? faces[0];
}

/** G-03 · the ram's roll for this frame: along its way — worked out every RAM_REPLAN seconds, and as soon as what it
 *  makes for changes — to the ground before the shut gate it makes for (raiderRamGate, ramStand), then straight on
 *  into the gate; with none shut, to home's middle. Its way is a wide walker's (findPath's `wide`: two metres and more
 *  clear of a wall, round the trees and rocks), so it neither grinds along the village's huts and the keep's walls nor
 *  rams a wall it passes; searched to the end when the grid has one (navReachable), and with none, straight on, as it
 *  always rolled. Returns the way it faces (a yaw), or null when it has arrived and stands. */
export function rollRaiderRam(
  st: { buildings: PlacedBuilding[]; gateOpen: Record<string, boolean>; keep: KeepState | null }, dt: number,
): number | null {
  const r = raiderRamState;
  const gate = raiderRamGate(st.buildings, st.gateOpen, st.keep);
  r.routeT -= dt;
  if (r.routeT <= 0 || r.routeFor !== (gate?.id ?? '')) {
    r.routeT = RAM_REPLAN;
    r.routeFor = gate?.id ?? '';
    const to = gate ? ramStand(st.keep, st.buildings, gate) : { x: HOME_X, z: HOME_Z };
    r.route = (navReachable(r.x, r.z, to.x, to.z) && findPath(r.x, r.z, to.x, to.z, HOME_NAV_CELLS, true)) || [];
    r.routeI = 0;
  }
  while (r.routeI < r.route.length && Math.hypot(r.route[r.routeI].x - r.x, r.route[r.routeI].z - r.z) < 1.1) r.routeI++;
  const at = r.route[r.routeI] ?? (gate ?? { x: HOME_X, z: HOME_Z });
  const dx = at.x - r.x, dz = at.z - r.z, d = Math.hypot(dx, dz);
  if (d <= 0.3) return null;
  const step = RAM_SPEED * dt;
  r.x += (dx / d) * step;
  r.z += (dz / d) * step;
  r.travel += step;
  return Math.atan2(-dx, -dz);
}

exposeDebug('__kkRam', raiderRamState);
