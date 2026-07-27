'use client';
// King Leo's real shield model, with a fallback (procedural) while it
// streams in or if extraction fails — same pattern as RealWeapon.tsx.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { loadShield } from '@/lib/weaponParts';

export default function RealShield({
  fallback = null,
  scale = 1,
}: {
  fallback?: React.ReactNode;
  scale?: number;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadShield().then((g) => { if (alive) setModel(g); });
    return () => { alive = false; };
  }, []);
  const instance = useMemo(() => (model ? model.clone(true) : null), [model]);
  if (!instance) return <>{fallback}</>;
  return <primitive object={instance} scale={scale} />;
}
