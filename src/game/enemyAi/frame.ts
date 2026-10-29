// CLN-13 · what the Enemy component hands its frame (step.ts): the enemy, and the component's own refs, state and
// setters — and what the frame does with them wherever it is done deciding: the figure stood where the enemy is (on
// the ground under it, as a rule) and turned the way it faces, and a clip asked for.
import type { Group, Vector3 } from 'three';
import type { EnemyData } from '@/game/combat';
import type { RiggedMinifig } from '@/lib/minifigRig';
import { destinationGroundY, homeGroundY } from '@/components/world/TemplateWorld';

/** an enemy's own state, moved in place by its frame */
export type Mob = EnemyData['mob'];

/** an enemy's current route: waypoints, which one it is heading for, when to work it out again, and where its mark
 *  stood when it last did */
export interface Route { pts: { x: number; z: number }[]; i: number; t: number; tx: number; tz: number }

/** What the Enemy component hands its frame: the enemy, and the component's own refs, state and setters. */
export interface EnemyFrame {
  data: EnemyData;
  group: { current: Group | null };
  rigRef: { current: RiggedMinifig | null };
  scatter: { current: Map<string, Vector3> | null };
  path: { current: Route };
  clip: string;
  setClip: (clip: string) => void;
  pace: { current: { x: number; z: number; v: number } };
  setRidePace: (pace: number) => void;
  remove: (id: number) => void;
  /** this enemy's own home-ness (its world is home), not the player's — see its note in Enemies.tsx's Enemy */
  enemyAtHome: boolean;
  speed: number;
}

/** the ground under the enemy: home's own height field, or the destination's real terrain (see the frame's last lines
 *  in step.ts for both) */
export function groundUnder(f: EnemyFrame): number {
  const m = f.data.mob;
  return f.enemyAtHome ? homeGroundY(m.x, m.z) : destinationGroundY(m.x, m.z);
}

/** the figure stood where the enemy is, at height `y`, and turned the way it faces */
export function stand(g: Group, m: Mob, y: number): void {
  g.position.set(m.x, y, m.z);
  g.rotation.y = m.yaw + Math.PI;
}

/** a clip, asked for only when it is not the one already playing */
export function play(f: EnemyFrame, clip: string): void {
  if (f.clip !== clip) f.setClip(clip);
}
