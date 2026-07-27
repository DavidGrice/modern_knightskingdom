'use client';
// Renders one named sub-object extracted from a composite OBJ+MTL model
// (see lib/propParts.ts) — e.g. the treasure chest bundled inside a
// jousting-set model. Falls back to nothing while it streams in.
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { loadPropPart, type PropPartId } from '@/lib/propParts';

export default function RealPropPart({
  id,
  height,
  fallback = null,
}: {
  id: PropPartId;
  height: number;
  fallback?: React.ReactNode;
}) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  useEffect(() => {
    let alive = true;
    loadPropPart(id, height).then((g) => { if (alive) setModel(g); });
    return () => { alive = false; };
  }, [id, height]);
  const instance = useMemo(() => (model ? model.clone(true) : null), [model]);
  if (!instance) return <>{fallback}</>;
  return <primitive object={instance} />;
}
