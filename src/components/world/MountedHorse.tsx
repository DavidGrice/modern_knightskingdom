'use client';
// L62 · The horse you are actually sitting on.
//
// Riding used to be a speed buff with a raised camera: the horse was hidden
// the moment you mounted (Wildlife.tsx drops the meadow instance) and nothing
// drew it again, so you could not see the animal until you got off it.
//
// This draws the mount under the rider, at the player's own position and
// facing, so a first-person view looks out over its neck and mane the way a
// rider does. The legs run off the player's real ground speed, so a walk
// looks like a walk and a gallop looks like a gallop.
import { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/game/store/gameStore';
import { ridingState } from '@/game/riding';
import { playerState } from '../fps/PlayerController';
import RiggedProp from './RiggedProp';
import RiggedFigure from '../character/RiggedFigure';

/**
 * How far forward of the rider the horse's body sits. A rider sits over the
 * animal's middle, so the neck and head run out AHEAD of the saddle — with
 * the model centred on the camera you look straight down at a pair of ears
 * and see nothing else of it.
 */
const BODY_FORWARD = 1.05;
/** `playerState.y` is the rider's FEET/ground level (PlayerController adds
 *  EYE_HEIGHT, plus 0.85 more while mounted), so the horse simply stands on
 *  it — the saddle lands where the raised camera already is. */
const DROP = 0;

export default function MountedHorse() {
  const [asset, setAsset] = useState<string | null>(null);
  const group = useRef<THREE.Group>(null);
  const last = useRef({ x: 0, z: 0, v: 0 });
  const [gait, setGait] = useState(0);
  // O6/L62 follow-up (2026-07-30): the rider used to live on a SECOND,
  // unrigged horse mesh (RideHorse.tsx) drawn on top of this one — a plain
  // cloned static model with a whole-group sine bob for "movement," while
  // THIS component's real per-bone gait (RiggedProp's gaitSpeed, driven off
  // actual ground speed below) sat underneath it, never actually seen. That
  // duplicate mesh is gone; the seated rider now rides the one real animated
  // horse instead. Same local seat offset RideHorse.tsx used.
  const character = useGameStore((s) => s.character);

  // the mount is a mutable leaf module, so poll it rather than trying to make
  // the input path re-render React
  useEffect(() => {
    const t = setInterval(() => {
      const url = ridingState.active ? ridingState.horseUrl : null;
      const id = url ? url.split('/').pop()!.replace(/\.glb$/i, '') : null;
      setAsset((prev) => (prev === id ? prev : id));
    }, 120);
    return () => clearInterval(t);
  }, []);

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g || !ridingState.active) return;
    const dt = Math.min(rawDt, 0.05);
    // yaw 0 faces -Z, so forward is (-sin, -cos)
    const fx = -Math.sin(playerState.yaw);
    const fz = -Math.cos(playerState.yaw);
    g.position.set(
      playerState.x + fx * BODY_FORWARD,
      playerState.y - DROP,
      playerState.z + fz * BODY_FORWARD,
    );
    g.rotation.y = playerState.yaw + Math.PI;

    // gait from real displacement, so it never disagrees with how fast the
    // ground is actually going by
    const l = last.current;
    const moved = Math.hypot(playerState.x - l.x, playerState.z - l.z) / Math.max(dt, 1 / 240);
    l.x = playerState.x; l.z = playerState.z;
    const want = moved > 0.5 ? Math.min(moved, 12) : 0;
    if (Math.abs(want - l.v) > 1) { l.v = want; setGait(want); }
  });

  if (!asset) return null;
  return (
    <group ref={group}>
      <RiggedProp assetId={asset} height={1.7} gaitSpeed={gait} />
      {/* rider, seated astride behind the horse's neck — sunk down from a
          standing rest-pose height so the hips land at saddle height instead
          of the whole figure standing above it (no dedicated seated clip
          exists in the extraction to pose the legs bent around the barrel).
          Local offset, so it rides correctly regardless of BODY_FORWARD. */}
      {character && (
        <Suspense fallback={null}>
          <group position={[0, 0.55, -0.15]} scale={0.96}>
            <RiggedFigure config={character} height={1.75} clip="anim_r_restpose" />
          </group>
        </Suspense>
      )}
    </group>
  );
}
