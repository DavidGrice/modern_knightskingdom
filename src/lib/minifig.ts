'use client';
// Loads the extracted minifig OBJ+MTL models — the donors a rigged figure is built from (lib/rig/assemble.ts: head and
// face from one donor, torso decal from another, limbs recoloured) — and the game's global runtime palette.
import * as THREE from 'three';
import { loadObjMtl } from './obj/load';

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
    p = loadObjMtl(BASE, id, (g) => {
      // stamp the donor id so part classification can look up this
      // donor's verified shape->role map (lib/rigParts.ts) without
      // every call site having to thread the id through
      g.userData.donorId = id;
      return g;
    });
    donorCache.set(id, p);
  }
  return p;
}

