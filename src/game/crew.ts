'use client';
// Manning a siege engine (2026-07-25, rig-lab integration).
//
// The lab's `traits.vehicle` block on every siege piece says the same three
// things: `canDrive: false`, `canPush: false`, `isStationary: true` — these
// engines are emplacements, not vehicles. What it DOES give us is
// `canOccupy` + `occupyMode` ('standing' on a catapult's platform,
// 'seated' behind the wheeled crossbow), so the feature the data actually
// asks for is CREWING one: step onto the engine, aim it by looking, and
// shoot from where the crew would really stand.
//
// This is a mutable leaf module for the same reason ridingState is: the
// R3F frame loop writes it every frame and both the HUD tree and the world
// tree read it, so routing it through Zustand would churn the store 60×/s.
import type { PlacedBuilding } from './types';

export type OccupyMode = 'standing' | 'seated';

export const crewState = {
  /** id of the building being crewed, or null when on foot */
  engineId: null as string | null,
  mode: 'standing' as OccupyMode,
  /** where the engine sits — the player is pinned here while crewing */
  x: 0,
  z: 0,
  /** live aim, driven by the player's look; the engine mesh tracks this */
  yaw: 0,
  /** how far behind the engine's centre the crew stands — the lab charted no
   *  crew coordinates, only that there IS one, so this comes from the piece's
   *  own footprint: far enough back to be behind the arm, not inside it */
  back: 1.2,
  /** the engine's own height, for working out where its crew platform sits */
  tall: 2,
};

/** eye offset above the engine's ground position. Seated crew sit low on the
 *  frame; standing crew work from a platform level with the engine, high
 *  enough to sight over their own machine. */
export function crewEyeHeight(mode: OccupyMode) {
  return mode === 'seated' ? 1.3 : Math.min(2.8, Math.max(1.75, crewState.tall * 0.6));
}

export function manEngine(b: PlacedBuilding, mode: OccupyMode, aimYaw: number, depth: number, tall: number) {
  crewState.engineId = b.id;
  crewState.mode = mode;
  crewState.x = b.x;
  crewState.z = b.z;
  crewState.yaw = aimYaw;
  crewState.tall = tall;
  // seated crew ride the frame itself; standing crew work clear of the rear
  // face (depth/2) with enough standoff to sight past their own machine
  crewState.back = mode === 'seated' ? Math.max(0.8, depth * 0.22) : depth / 2 + 1.0;
}

export function leaveEngine() {
  crewState.engineId = null;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkcrew = crewState;
}
