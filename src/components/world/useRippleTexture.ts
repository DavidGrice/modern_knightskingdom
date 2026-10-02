'use client';
// CLN-24 · the tiling water sprite, one copy per caller, released when that caller unmounts.
//
// The pond (Terrain.tsx), the brook and the dug waterways (HomeMeadowWater.tsx) each carried their own copy of this
// loader block, and none of them released what it loaded. Terrain is home-only — GameWorld unmounts it on every trip
// — so each return home left another set of textures behind for the garbage collector to find.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useAppStore } from '@/game/store/appStore';

/** the original game's greyscale caustic ripple; the blue comes from the material's own color */
const RIPPLE_URL = '/assets/textures/water/spr199_256x256.png';

/**
 * A repeat-wrapped sRGB water texture owned by the calling component.
 *
 * Loaded with a plain TextureLoader rather than a suspending hook, as before: the surface simply draws untextured for
 * the moment the image takes, instead of suspending whatever boundary Terrain happens to sit under. Anisotropy is
 * read once at mount, like every other anisotropy site (it applies at next load, not live).
 *
 * Each caller gets its OWN texture on purpose — `repeat` and `offset` live on the texture, and the pond, the brook
 * and every cut tile and drift differently.
 */
export function useRippleTexture(url: string = RIPPLE_URL): THREE.Texture {
  const { gl } = useThree();
  const anisotropy = Math.min(useAppStore((s) => s.settings.anisotropy), gl.capabilities.getMaxAnisotropy());
  const texture = useMemo(() => {
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropy;
    return t;
  }, [url]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
