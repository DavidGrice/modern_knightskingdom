'use client';
// Cannonball flight: simple ballistic arcs that explode on landing.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSiegeStore, explodeBall, type Cannonball } from '@/game/siege';
import { useGameStore } from '@/game/store/gameStore';

function Ball({ ball }: { ball: Cannonball }) {
  const mesh = useRef<THREE.Mesh>(null);
  const age = useRef(0);

  useFrame((_, rawDt) => {
    if (useGameStore.getState().paused) return;
    const dt = Math.min(rawDt, 0.05);
    age.current += dt;
    ball.vel.y -= 12 * dt;
    ball.pos.x += ball.vel.x * dt;
    ball.pos.y += ball.vel.y * dt;
    ball.pos.z += ball.vel.z * dt;
    mesh.current?.position.set(ball.pos.x, ball.pos.y, ball.pos.z);
    if (ball.pos.y <= 0.18 || age.current > 6) explodeBall(ball);
  });

  return (
    <mesh ref={mesh} position={[ball.pos.x, ball.pos.y, ball.pos.z]} castShadow>
      <sphereGeometry args={[0.18, 10, 10]} />
      <meshStandardMaterial color="#2c2c32" roughness={0.6} metalness={0.4} />
    </mesh>
  );
}

export default function Cannonballs() {
  const balls = useSiegeStore((s) => s.balls);
  return (
    <>
      {balls.map((b) => <Ball key={b.id} ball={b} />)}
    </>
  );
}
