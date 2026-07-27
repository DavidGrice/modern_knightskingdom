'use client';
// Cedric the Bull's real horned-helm model, with a fallback while it streams
// in — same pattern as RealShield.tsx/RealWeapon.tsx.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { loadHelmet } from '@/lib/weaponParts';

export default function RealHelmet({
  fallback = null,
  scale = 1,
}: {
  fallback?: React.ReactNode;
  scale?: number;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadHelmet().then((g) => { if (alive) setModel(g); });
    return () => { alive = false; };
  }, []);
  const instance = useMemo(() => (model ? model.clone(true) : null), [model]);
  if (!instance) return <>{fallback}</>;
  return <primitive object={instance} scale={scale} />;
}
