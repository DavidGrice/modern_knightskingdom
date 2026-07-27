'use client';
// Loads the extracted minifig OBJ+MTL models, classifies their named body-part
// objects, and assembles a custom character: head/face from one donor, torso decal
// from another, limbs recolored with the game's global runtime palette.
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { classifyPart, type PartClass } from '@/game/data/minifigs';
import type { CharacterConfig } from '@/game/types';

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

function collectParts(group: THREE.Group): Map<PartClass, THREE.Mesh[]> {
  const map = new Map<PartClass, THREE.Mesh[]>();
  let sawHead = false;
  group.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    let cls = classifyPart(mesh.name || '');
    if (cls === 'head') sawHead = true;
    // items appearing right after the head (crowns, helmets) classify as accessory
    if (cls === 'other' && sawHead && /_l_?\d|^l\d/.test((mesh.name || '').toLowerCase())) {
      cls = 'accessory';
    }
    const arr = map.get(cls) ?? [];
    arr.push(mesh);
    map.set(cls, arr);
  });
  return map;
}

function cloneMeshInto(mesh: THREE.Mesh, parent: THREE.Group, recolor?: THREE.Color) {
  const clone = mesh.clone();
  // The source models ship with open terminal facets and no explicit normals
  // (FORMAT_SPEC §10); single-sided rendering makes them look hollow.
  if (!clone.geometry.getAttribute('normal')) clone.geometry.computeVertexNormals();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const cloned = mats.map((m) => {
    const c = (m as THREE.Material).clone() as THREE.MeshPhongMaterial;
    if (recolor && c.color && !c.map) c.color = recolor.clone();
    c.side = THREE.DoubleSide;
    return c;
  });
  clone.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  clone.castShadow = true;
  parent.add(clone);
}

export interface AssembledMinifig {
  group: THREE.Group;
  height: number;
}

/**
 * Build a minifig from a character config. The result stands upright at
 * `targetHeight` with its feet on y=0, facing -Z.
 */
export async function assembleMinifig(
  config: CharacterConfig,
  targetHeight = 1.75,
): Promise<AssembledMinifig> {
  const [headDonor, bodyDonor, colors] = await Promise.all([
    loadDonor(config.headDonor),
    loadDonor(config.bodyDonor),
    loadPalette(),
  ]);

  const headParts = collectParts(headDonor);
  const bodyParts = collectParts(bodyDonor);

  const raw = new THREE.Group();
  for (const m of headParts.get('head') ?? []) cloneMeshInto(m, raw);
  for (const m of headParts.get('accessory') ?? []) cloneMeshInto(m, raw);
  for (const m of bodyParts.get('body') ?? []) cloneMeshInto(m, raw);
  for (const m of bodyParts.get('arm') ?? []) cloneMeshInto(m, raw, paletteColor(colors, config.armColor));
  for (const m of bodyParts.get('hand') ?? []) cloneMeshInto(m, raw, paletteColor(colors, config.handColor));
  for (const m of bodyParts.get('leg') ?? []) cloneMeshInto(m, raw, paletteColor(colors, config.legColor));
  for (const m of bodyParts.get('hip') ?? []) cloneMeshInto(m, raw, paletteColor(colors, config.hipColor));
  for (const m of bodyParts.get('other') ?? []) cloneMeshInto(m, raw);
  // fallback: donor without named parts (shouldn't happen with curated donors)
  if (raw.children.length === 0) {
    bodyDonor.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) cloneMeshInto(c as THREE.Mesh, raw);
    });
  }

  // Extracted OBJs are millimetres with model-up at -Y; rotating X by PI stands
  // them upright without mirroring (see resources README "Three.js game" note).
  raw.rotation.x = Math.PI;
  raw.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(raw);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / (size.y || 1);

  const group = new THREE.Group();
  raw.scale.setScalar(scale);
  raw.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(raw);
  const center = box2.getCenter(new THREE.Vector3());
  raw.position.set(-center.x, -box2.min.y, -center.z);
  group.add(raw);
  return { group, height: targetHeight };
}
