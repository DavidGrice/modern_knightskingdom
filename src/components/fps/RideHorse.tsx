'use client';
// The mounted horse + seated rider, rendered at the player transform while riding.
import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { ridingState } from '@/game/riding';
import { useNormalizedProp } from '../world/PropModel';
import RiggedFigure from '../character/RiggedFigure';

// The wandering horses in Wildlife.tsx come in a small fixed set of models/
// colors — preload one instance per url (hooks can't be called conditionally)
// and show only whichever one the player actually mounted (ridingState.horseUrl),
// so riding a white horse doesn't render as the other, hardcoded brown one.
const HORSE_URLS = ['/assets/props/creatures/l7339200.glb', '/assets/props/creatures/l7339211.glb'];

function MountedHorseVariant({ url }: { url: string }) {
  const model = useNormalizedProp(url, 1.7);
  const instance = useMemo(() => model.clone(true), [model]);
  const group = useRef<THREE.Group>(null);
  const bob = useRef(0);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.visible = playerState.riding && ridingState.horseUrl === url;
    if (!g.visible) return;
    bob.current += dt * (playerState.speed > 5 ? 13 : 8);
    const bobY = playerState.speed > 0 ? Math.abs(Math.sin(bob.current)) * 0.09 : 0;
    g.position.set(playerState.x, playerState.y + bobY, playerState.z);
    g.rotation.y = playerState.yaw + Math.PI;
  });

  const character = useGameStore((s) => s.character);

  return (
    <group ref={group} visible={false}>
      <primitive object={instance} />
      {/* rider, seated astride behind the horse's neck — sunk down from a
          standing rest-pose height so the hips land at saddle height instead
          of the whole figure standing above it (no dedicated seated clip
          exists in the extraction to pose the legs bent around the barrel) */}
      {character && (
        <group position={[0, 0.55, -0.15]} scale={0.96}>
          <RiggedFigure config={character} height={1.75} clip="anim_r_restpose" />
        </group>
      )}
    </group>
  );
}

export default function RideHorse() {
  return (
    <Suspense fallback={null}>
      {HORSE_URLS.map((url) => (
        <MountedHorseVariant key={url} url={url} />
      ))}
    </Suspense>
  );
}
