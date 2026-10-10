'use client';
// Wave 43 (B6) — ticks the 3 new challenge-ground mechanics (game/
// challengeModes.ts) and renders their few decorative primitives. Renders
// (almost) nothing but logic — a sibling to ArenaSpawner.tsx's own "steps a
// system, mounts a couple of meshes" shape — mounted unconditionally in
// GameWorld.tsx next to it, cheap: each mechanic's rules do nothing the
// instant it isn't the active one.
//
// Visuals are driven imperatively via refs inside useFrame (position/
// visible/color writes), the same convention Enemies.tsx already uses for
// every mob it renders, rather than routing collection/hit state through
// React re-renders — these leaf-module states aren't Zustand, so nothing
// upstream re-renders on their own mutation anyway.
//
// CLN-20 · the RULES of the three mechanics are game/challengeModes.ts's own
// tickGather / tickDefend / tickJoust now. This component keeps what has to be
// a component's: the frame subscription at this mount site, the frame's one
// store snapshot and one clock read, the two Defend values that must die with
// the component (a ref), and the meshes — whose two passes stay in the same
// callback, each straight after the rules whose state it draws.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshBasicMaterial } from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import { playerState } from '@/game/playerState';
import { audio } from '@/lib/audio';
import { destinationGroundY } from '../world/TemplateWorld';
import {
  gatherChallengeState, GATHER_TARGET_COUNT,
  DEFEND_SPAWN_INTERVAL_S,
  joustChallengeState, joustRingOffsets, JOUST_RING_COUNT, JOUST_RING_RADIUS,
  tickGather, tickDefend, tickJoust, type ChallengeDeps, type DefendRun,
} from '@/game/challengeModes';

/** CLN-20 · what the ticks need from outside game/challengeModes.ts (which
 *  imports neither store, like its sibling rule modules). Built once; each
 *  enemy-store member reads `useEnemyStore.getState()` when it is called, and
 *  `play` is `audio.play` with the default detune, as the calls always were. */
const DEPS: ChallengeDeps = {
  enemies: () => useEnemyStore.getState().enemies,
  spawn: (...args) => useEnemyStore.getState().spawn(...args),
  removeByWorld: (world) => useEnemyStore.getState().removeByWorld(world),
  player: playerState,
  play: (name, volume) => audio.play(name, volume),
};

export default function ChallengeRunner() {
  const gatherRefs = useRef<(Mesh | null)[]>([]);
  const joustRefs = useRef<(Mesh | null)[]>([]);
  // the Defend wave countdown and its "was active last frame" edge detector:
  // here, not in challengeModes.ts, so that a remount starts them afresh
  const defendRun = useRef<DefendRun>({ spawnTimer: DEFEND_SPAWN_INTERVAL_S, wasActive: false });

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    if (st.paused) return;
    const now = performance.now();

    // -------------------------------------------------------------------
    // Gather Race
    const g = gatherChallengeState;
    tickGather(st, now, DEPS);
    for (let i = 0; i < GATHER_TARGET_COUNT; i++) {
      const mesh = gatherRefs.current[i];
      if (!mesh) continue;
      const p = g.points[i];
      const visible = g.active && !!p && !p.collected;
      mesh.visible = visible;
      if (visible && p) mesh.position.set(p.x, destinationGroundY(p.x, p.z) + 0.6, p.z);
    }

    // -------------------------------------------------------------------
    // Defend the Plot (raw dt: no clamp)
    tickDefend(defendRun.current, st, dt, now, DEPS);

    // -------------------------------------------------------------------
    // Joust Gauntlet
    const j = joustChallengeState;
    tickJoust(st, now, DEPS);
    const jRings = j.destId ? joustRingOffsets(j.destId) : [];
    for (let i = 0; i < JOUST_RING_COUNT; i++) {
      const mesh = joustRefs.current[i];
      if (!mesh) continue;
      const ring = jRings[i];
      const visible = j.active && !!ring;
      mesh.visible = visible;
      if (visible && ring) {
        mesh.position.set(ring.x, destinationGroundY(ring.x, ring.z) + 1.2, ring.z);
        const mat = mesh.material as MeshBasicMaterial;
        mat.color.set(i === j.ringIndex ? '#ffcf4d' : i < j.ringIndex ? '#5fae52' : '#8a5a2c');
      }
    }
  });

  return (
    <group>
      {Array.from({ length: GATHER_TARGET_COUNT }).map((_, i) => (
        <mesh key={`gather${i}`} ref={(el) => { gatherRefs.current[i] = el; }} visible={false}>
          <torusGeometry args={[0.6, 0.18, 8, 20]} />
          <meshBasicMaterial color="#5fd6ff" toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: JOUST_RING_COUNT }).map((_, i) => (
        <mesh key={`joust${i}`} ref={(el) => { joustRefs.current[i] = el; }} visible={false} rotation-x={Math.PI / 2}>
          <torusGeometry args={[JOUST_RING_RADIUS, 0.2, 8, 24]} />
          <meshBasicMaterial color="#8a5a2c" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
