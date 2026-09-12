'use client';
// Princess Storm's Battle Dome: a small, dedicated duel arena, distinct from
// Richard's open jousting field. Storm herself is a regular NpcDef (see
// data/npcs.ts) and renders via Npc.tsx — this is just the static ring of
// walls that makes the spot read as its own arena rather than open field.
import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BATTLE_DOME, STORM_WORLD } from '@/game/data/world';
import { useGameStore } from '@/game/store/gameStore';
import { useEnemyStore } from '@/game/combat';
import { playerState } from '@/game/playerState';
import { defaultLookOf } from '@/game/data/villagerLooks';
import RiggedFigure from '../character/RiggedFigure';
import type { CharacterConfig } from '@/game/types';
import { sampleTemplateGroundY } from './TemplateWorld';
import PropModel from './PropModel';

const CYL = '/assets/props/cylindrical';
const B = '/assets/props/buildings';

const SEG_COUNT = 22;
const GAP_HALF = 0.35; // radians left open on the north side as the entrance

function useRingAngles() {
  return useMemo(() => {
    const angles: number[] = [];
    for (let i = 0; i < SEG_COUNT; i++) {
      const angle = (i / SEG_COUNT) * Math.PI * 2;
      const distFromNorth = Math.min(angle, Math.PI * 2 - angle);
      if (distFromNorth < GAP_HALF) continue;
      angles.push(angle);
    }
    return angles;
  }, []);
}

/** Wave 57 (F6) · a small, non-interactive figure standing at the honor
 *  stand (oc6095b4, placed just below) — no NpcDef/roster entry, no
 *  dialogue, no quests. Every named court NPC (King Leo, Queen Leonora,
 *  Richard, John, Storm herself) is confirmed live nowhere near this venue
 *  (see this wave's own research) and Storm is the duelist here, not a
 *  spectator, so watching her duels needed a genuinely new, minimal figure
 *  rather than relocating an established NPC and disrupting their own
 *  dialogue/quest content. Reuses an already-loaded generic look from
 *  VILLAGER_LOOKS (via defaultLookOf) — no new asset weight.
 *
 *  `x`/`z` are LOCAL to this file's own dome group (translated by
 *  BATTLE_DOME.x/z, never rotated — see the default export below), so the
 *  facing math below adds that offset back in before comparing against
 *  playerState, which is always world-space.
 *
 *  Turns to face the player while a duel is live (any 'storm' EnemyState —
 *  the same check DialoguePanel.tsx uses to know a duel is already running),
 *  using this codebase's own atan2(-dx,-dz) + `rotation.y = yaw + Math.PI`
 *  facing convention and lerp rate (Defenders.tsx, Villagers.tsx, etc.);
 *  otherwise holds a neutral yaw facing the bridge at the ring's center.
 *  anim_r_restpose throughout — no new clip exists to animate a "watching"
 *  pose with. */
function DuelSpectator({ x, z }: { x: number; z: number }) {
  const config = useMemo<CharacterConfig>(() => ({ name: 'A courtier', ...defaultLookOf('battledome_spectator') }), []);
  const group = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const dueling = useEnemyStore.getState().enemies.some((e) => e.kind === 'storm');
    const wx = x + BATTLE_DOME.x;
    const wz = z + BATTLE_DOME.z;
    // neutral: face the bridge at the ring's local center (0,0) — the delta
    // to a fixed local point is the same whether computed in local or world
    // space, since this group only translates, never rotates
    const desired = dueling
      ? Math.atan2(-(playerState.x - wx), -(playerState.z - wz))
      : Math.atan2(-(0 - x), -(0 - z));
    let diff = desired - yaw.current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    yaw.current += diff * Math.min(1, dt * 3);
    g.rotation.y = yaw.current + Math.PI;
  });
  return (
    <group ref={group} position={[x, 0, z]}>
      <RiggedFigure config={config} height={1.75} clip="anim_r_restpose" />
    </group>
  );
}

export default function BattleDome() {
  const angles = useRingAngles();
  const R = BATTLE_DOME.radius;
  // Phase 20: the dome lives at The Sister Keep — mounted only while
  // visiting, riding the bake's real terrain height (sampled per frame via
  // a ref rather than once at mount, since the bake streams in async and
  // an early single sample would land before mountedRoot exists)
  const destination = useGameStore((s) => s.destination);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) {
      group.current.position.y = sampleTemplateGroundY(BATTLE_DOME.x, BATTLE_DOME.z);
    }
  });
  if (destination !== STORM_WORLD) return null;

  return (
    <group ref={group} position={[BATTLE_DOME.x, 0, BATTLE_DOME.z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.015}>
        <circleGeometry args={[R + 0.4, 40]} />
        <meshStandardMaterial color="#c9b878" roughness={1} />
      </mesh>
      {/* stone ring wall — the extraction's "wall section" models are all
          crenellation toppers, not flat panels (see prepare-assets.mjs's
          castle folder), so a plain stone-colored box reads far better here
          than a real mismatched piece; same technique KeepInteriorRoom.tsx
          already uses for its own enclosed walls */}
      {angles.map((angle, i) => (
        <mesh
          key={i}
          position={[Math.sin(angle) * R, 0.9, Math.cos(angle) * R]}
          rotation-y={angle}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.3, 1.8, 0.4]} />
          <meshStandardMaterial color="#6b6b72" roughness={1} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        {[0.35, Math.PI / 2, Math.PI, Math.PI * 1.5 - 0.35].map((angle, i) => (
          <PropModel
            key={`tower${i}`}
            url={`${CYL}/00_l306200.glb`}
            height={2.4}
            position={[Math.sin(angle) * R, 0, Math.cos(angle) * R]}
          />
        ))}
      </Suspense>
      {/* Wave 56 (F3): a real staged duel bridge at the ring's center — the
          challenger crosses it from the entrance (north gap, +Z) to reach
          Storm at the far end. oc6095b4 (the dual stand) flanks it to one
          side as a flag/shield/halberd honor stand. Heights match each
          piece's own real bbox Y-extent 1:1 (bricks.generated.json's
          gen_oc6095b4/gen_oc6095b5 "size"), so useNormalizedProp's uniform
          scale-to-height comes out to ~1 — these render at their true
          modeled size, not stretched/shrunk to fit.
          oc6095b5's own unrotated bbox is WIDER in X (6.3) than deep in Z
          (4.2) — live-measured in the running app (a THREE.Box3 over the
          mounted instance), not assumed from the plan's own "long axis
          along Z" framing, which turned out to describe the INTENDED
          geometry, not the yaw=0 code it shipped with. yaw=Math.PI/2 is
          what actually swings the 6.3 side to run along Z here — confirmed
          by re-measuring the world-space box after the rotation. */}
      <Suspense fallback={null}>
        <PropModel url={`${B}/oc6095b5.glb`} height={4.27} position={[0, 0, 0]} yaw={Math.PI / 2} />
        <PropModel url={`${B}/oc6095b4.glb`} height={7.35} position={[4.5, 0, 0]} yaw={-Math.PI / 2} />
      </Suspense>
      {/* Wave 57 (F6): one minimal spectator standing at the honor stand's
          foot, facing the bridge until a duel starts. Offset off the
          stand's own x=4.5 center so it doesn't stand inside that prop's
          geometry. */}
      <DuelSpectator x={3.3} z={0.9} />
    </group>
  );
}
