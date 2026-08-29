'use client';
// Wave 23 · a brief "+2 wood" style rise-and-fade whenever a hauling
// villager deposits goods (see game/depositFloaties.ts's own header and
// ai/actions/haul.ts's spawn call site). Reuses the same Billboard+Text
// in-world label primitive Grounds.tsx already uses — no new projection
// system. Deliberately narrow: primary resource only, rise with no fade,
// proportionate to "small, cosmetic".
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { depositFloaties, type DepositFloaty } from '@/game/depositFloaties';
import { ITEMS } from '@/game/data/items';

const LIFESPAN_MS = 1400;
const RISE = 1.3;

function Floaty({ f }: { f: DepositFloaty }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = Math.min(1, (Date.now() - f.bornAt) / LIFESPAN_MS);
    group.current?.position.set(f.x, f.y + t * RISE, f.z);
  });
  return (
    <group ref={group} position={[f.x, f.y, f.z]}>
      <Billboard>
        <Text fontSize={0.3} color="#ffe9a8" outlineWidth={0.02} outlineColor="#2a1c0a">
          +{f.amount} {ITEMS[f.itemId]?.name ?? f.itemId}
        </Text>
      </Billboard>
    </group>
  );
}

export default function DepositFloaties() {
  // depositFloaties is a mutable array leaf module — nudge a repaint
  // whenever an entry is spawned or has aged out, same convention as every
  // other leaf-module-backed panel in this codebase.
  const [, setTick] = useState(0);
  const lastLen = useRef(0);
  useFrame(() => {
    const now = Date.now();
    while (depositFloaties.length && now - depositFloaties[0].bornAt > LIFESPAN_MS) depositFloaties.shift();
    if (depositFloaties.length !== lastLen.current) {
      lastLen.current = depositFloaties.length;
      setTick((n) => n + 1);
    }
  });
  return <>{depositFloaties.map((f) => <Floaty key={f.id} f={f} />)}</>;
}
