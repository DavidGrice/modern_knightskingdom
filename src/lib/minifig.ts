'use client';
// Loads the extracted minifig OBJ+MTL models, classifies their named body-part
// objects, and assembles a custom character: head/face from one donor, torso decal
// from another, limbs recolored with the game's global runtime palette.
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const BASE = '/assets/minifigs/';

const donorCache = new Map<string, Promise<THREE.Group>>();
let paletteCache: Promise<[number, number, number][]> | null = null;

export function loadPalette(): Promise<[number, number, number][]> {
  if (!paletteCache) {
    paletteCache = fetch('/assets/palette.json')
      .then((r) => r.json())
      .then((d) => d.colors as [number, number, number][]);
  }
  return paletteCache;
}

export function paletteColor(colors: [number, number, number][], index: number): THREE.Color {
  const [r, g, b] = colors[index] ?? [200, 200, 200];
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

export function loadDonor(id: string): Promise<THREE.Group> {
  let p = donorCache.get(id);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.setPath(BASE);
      mtlLoader.setResourcePath(BASE);
      mtlLoader.load(
        `${id}.mtl`,
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath(BASE);
          objLoader.load(
            `${id}.obj`,
            (g) => {
              // stamp the donor id so part classification can look up this
              // donor's verified shape->role map (lib/rigParts.ts) without
              // every call site having to thread the id through
              g.userData.donorId = id;
              resolve(g);
            },
            undefined,
            reject,
          );
        },
        undefined,
        reject,
      );
    });
    donorCache.set(id, p);
  }
  return p;
}

