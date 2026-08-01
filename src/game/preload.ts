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

/** Requested 2026-07-31: the enemy-donor + dragon-rig half of this warm-up is
 *  a real upfront memory/VRAM spend a player may never need (skeletons/the
 *  dragon are not guaranteed to appear soon, if ever, in a given session) —
 *  skipped at the Performance quality tier, falling back to the pre-existing
 *  LAZY path this warm-up was only ever an optimization layer over
 *  (`loadDonor`/`loadDragonRig` are already called by the live spawn code
 *  regardless, so skipping here is zero-risk, not new logic). Buildable
 *  GLTFs stay unconditionally eager at every tier — cheap, and a build-menu
 *  hitch would be a more visible regression than today's one-time cost. */
export function preloadCommonAssets(preloadEnemyDonors: boolean) {
  if (warmed) return;
  warmed = true;
  const urls = new Set(BUILDABLES.map((b) => b.model).filter((u): u is string => !!u));
  for (const url of urls) useGLTF.preload(url);
  if (!preloadEnemyDonors) return;
  for (const id of ENEMY_DONORS) loadDonor(id).catch(() => {});
  loadDragonRig().catch(() => {});
}
