'use client';
// Crossbow bolt + longbow arrow flight and rendering (oriented darts).
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBoltStore, stepBolt, useEnemyStore, type Bolt } from '@/game/combat';
import { useGameStore } from '@/game/store/gameStore';

// module-level scratch: a stuck bolt recomputes its transform every frame,
// and this file can have many in flight at once
const UP = new THREE.Vector3(0, 1, 0);
const tmpDir = new THREE.Vector3();

function BoltMesh({ bolt }: { bolt: Bolt }) {
  const group = useRef<THREE.Group>(null);
  const remove = useBoltStore((s) => s.remove);
  const arrow = bolt.kind === 'arrow';

  useFrame((_, rawDt) => {
    if (useGameStore.getState().paused) return;
    const dt = Math.min(rawDt, 0.05);
    if (stepBolt(bolt, dt)) {
      remove(bolt.id);
      return;
    }
    const g = group.current;
    if (!g) return;
    if (bolt.stuck) {
      // Lodged: rebuild the world transform from the mob's live position and
      // facing each frame, so the shaft travels with the body instead of
      // hanging in the air where the hit happened. Local -> world is the
      // inverse of the hit test's world -> local (yaw 0 faces -Z).
      const owner = useEnemyStore.getState().enemies.find((e) => e.id === bolt.stuck!.mobId);
      if (!owner) return;
      const { local, dir } = bolt.stuck;
      const c = Math.cos(owner.mob.yaw);
      const sn = Math.sin(owner.mob.yaw);
      g.position.set(
        owner.mob.x + local.x * c - local.z * sn,
        local.y,
        owner.mob.z + local.x * sn + local.z * c,
      );
      // the shaft keeps its flight direction, turned with the body
      tmpDir.set(dir.x * c - dir.z * sn, dir.y, dir.x * sn + dir.z * c).normalize();
      g.quaternion.setFromUnitVectors(UP, tmpDir);
      return;
    }
    g.position.set(bolt.pos.x, bolt.pos.y, bolt.pos.z);
    const dir = new THREE.Vector3(bolt.vel.x, bolt.vel.y, bolt.vel.z).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  });

  return (
    <group ref={group} position={[bolt.pos.x, bolt.pos.y, bolt.pos.z]}>
      <mesh>
        <cylinderGeometry args={[arrow ? 0.014 : 0.02, arrow ? 0.014 : 0.02, arrow ? 0.6 : 0.42, 5]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.8} />
      </mesh>
      <mesh position-y={arrow ? 0.32 : 0.22}>
        <coneGeometry args={[arrow ? 0.022 : 0.035, arrow ? 0.07 : 0.1, 5]} />
        <meshStandardMaterial color="#9a9aa0" metalness={0.5} roughness={0.4} />
      </mesh>
      {arrow && [0, 1, 2].map((i) => (
        <mesh key={i} position-y={-0.24} rotation-y={(i / 3) * Math.PI * 2}>
          <boxGeometry args={[0.002, 0.09, 0.05]} />
          <meshStandardMaterial color="#e8d9b0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function Bolts() {
  const bolts = useBoltStore((s) => s.bolts);
  return (
    <>
      {bolts.map((b) => <BoltMesh key={b.id} bolt={b} />)}
    </>
  );
}
