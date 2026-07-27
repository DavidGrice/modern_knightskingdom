'use client';
// Renders an original extracted weapon model, with a fallback (procedural)
// while it streams in or if extraction fails.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { loadWeapon, type WeaponId } from '@/lib/weaponParts';

export default function RealWeapon({
  id,
  fallback = null,
  scale = 1,
}: {
  id: WeaponId;
  fallback?: React.ReactNode;
  scale?: number;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadWeapon(id).then((g) => { if (alive) setModel(g); });
    return () => { alive = false; };
  }, [id]);
  const instance = useMemo(() => (model ? model.clone(true) : null), [model]);
  if (!instance) return <>{fallback}</>;
  return <primitive object={instance} scale={scale} />;
}
