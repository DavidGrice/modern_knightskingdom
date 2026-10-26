'use client';
// CLN-29 · loading an extracted model as its OBJ + MTL pair — written out five times before (minifig donors, prop
// parts, rigged props, the dragon, the workshop's set modules).
import type * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

/** `${file}.mtl`, then `${file}.obj` with its materials, both from `base` (the MTL's textures too). `onLoaded` runs
 *  inside the OBJ's own load callback, where each caller's code ran before — so an error it throws still takes the
 *  loader's own error path — and the promise resolves with what it returns (the group itself without it). A missing
 *  or broken file rejects. */
export function loadObjMtl(base: string, file: string): Promise<THREE.Group>;
export function loadObjMtl<T>(base: string, file: string, onLoaded: (group: THREE.Group) => T): Promise<T>;
export function loadObjMtl<T>(base: string, file: string, onLoaded?: (group: THREE.Group) => T): Promise<T | THREE.Group> {
  return new Promise((resolve, reject) => {
    const mtl = new MTLLoader();
    mtl.setPath(base);
    mtl.setResourcePath(base);
    mtl.load(
      `${file}.mtl`,
      (materials) => {
        materials.preload();
        const obj = new OBJLoader();
        obj.setMaterials(materials);
        obj.setPath(base);
        obj.load(`${file}.obj`, (group) => resolve(onLoaded ? onLoaded(group) : group), undefined, reject);
      },
      undefined,
      reject,
    );
  });
}

/** The workshop's lenient form (lib/setBuild.ts): a missing or broken MTL loads the OBJ without materials, and a
 *  missing or broken OBJ is null, not a rejection. (Its MTL takes no resource path, as setBuild's never did.) */
export async function loadObjOptionalMtl(base: string, file: string): Promise<THREE.Group | null> {
  const mtl = await new MTLLoader().setPath(base).loadAsync(`${file}.mtl`).catch(() => null);
  if (mtl) { mtl.preload(); }
  const loader = new OBJLoader();
  if (mtl) loader.setMaterials(mtl);
  return loader.setPath(base).loadAsync(`${file}.obj`).catch(() => null);
}
