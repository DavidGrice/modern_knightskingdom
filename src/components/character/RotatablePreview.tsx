'use client';
// A rotatable minifig preview: auto-spins gently until the player drags with
// the mouse, at which point manual control takes over for good (so a face
// profile or a crest can actually be inspected instead of spinning past it).
// Shared by the character creator and the equipment paperdoll.
import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import RiggedFigure from './RiggedFigure';
import type { RiggedMinifig } from '@/lib/minifigRig';
import type { CharacterConfig } from '@/game/types';

function Spinner({
  config, height, clip, yawRef, interactedRef, held,
}: {
  config: CharacterConfig;
  height: number;
  clip: string;
  yawRef: React.MutableRefObject<number>;
  interactedRef: React.MutableRefObject<boolean>;
  held?: (rig: RiggedMinifig) => React.ReactNode;
}) {
  const holder = useRef<THREE.Group>(null);
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  useFrame((_, dt) => {
    if (!interactedRef.current) yawRef.current += dt * 0.5;
    if (holder.current) holder.current.rotation.y = yawRef.current;
  });
  return (
    <group ref={holder} position={[0, -height / 2 + 0.05, 0]}>
      <RiggedFigure config={config} height={height} clip={clip} onReady={setRig} />
      {rig && held?.(rig)}
    </group>
  );
}

export default function RotatablePreview({
  config, height = 2.2, clip = 'anim_c_walk', className, cameraY = 0.4, cameraZ = 4.2, held,
}: {
  config: CharacterConfig;
  height?: number;
  clip?: string;
  className?: string;
  cameraY?: number;
  cameraZ?: number;
  held?: (rig: RiggedMinifig) => React.ReactNode;
}) {
  const yaw = useRef(0.4);
  const dragging = useRef(false);
  const interacted = useRef(false);
  const lastX = useRef(0);

  return (
    <div
      className={className}
      style={{ cursor: 'grab', touchAction: 'none' }}
      onPointerDown={(e) => {
        dragging.current = true;
        interacted.current = true;
        lastX.current = e.clientX;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        yaw.current += (e.clientX - lastX.current) * 0.012;
        lastX.current = e.clientX;
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <Canvas camera={{ position: [0, cameraY, cameraZ], fov: 42 }}>
        <ambientLight intensity={1.25} />
        <directionalLight position={[3, 5, 4]} intensity={2.4} />
        <directionalLight position={[-3, 2, -3]} intensity={0.65} color="#ffd9a0" />
        <directionalLight position={[0, 3, -5]} intensity={1.0} color="#cfd8ff" />
        <Spinner config={config} height={height} clip={clip} yawRef={yaw} interactedRef={interacted} held={held} />
      </Canvas>
    </div>
  );
}
