'use client';
// Upfront cache-warming (2026-07-20): the first time a given building GLB or
// enemy minifig donor was actually needed mid-play, its parse cost was paid
// right then — a visible hitch right as a just-finished building's model
// should pop in, or the moment the session's first skeleton (or the rare
// dragon) rises. Warming every commonly-spawned model's cache once, right
// after the game screen mounts, moves that cost off those exact moments.
import { useGLTF } from '@react-three/drei';
import { BUILDABLES } from './data/buildables';
import { loadDonor } from '@/lib/minifig';
import { loadDragonRig } from '@/components/world/DragonOmen';

// every enemy kind's minifig donor (Enemies.tsx's own CONFIGS) — these are
// OBJ+MTL, not GLTF, so they warm through the same `loadDonor` cache the
// live spawn code itself calls, not `useGLTF.preload`
const ENEMY_DONORS = [
  'minifigskeleton00', 'minifigweezil00', 'minifiggilbertbad01',
  'minifigcedricbull00', 'minifigprincessstorm00', 'minifigrichardstrong01',
];

let warmed = false;

export function preloadCommonAssets() {
  if (warmed) return;
  warmed = true;
  const urls = new Set(BUILDABLES.map((b) => b.model).filter((u): u is string => !!u));
  for (const url of urls) useGLTF.preload(url);
  for (const id of ENEMY_DONORS) loadDonor(id).catch(() => {});
  loadDragonRig().catch(() => {});
}
