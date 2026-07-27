'use client';
// Extracts a single named sub-object out of a composite OBJ+MTL model (the
// extraction sometimes bundles unrelated pieces into one LCA/OBJ — e.g. the
// treasure chest inside the oc6095b3 jousting-set model, alongside a lance
// rack and horse gear that aren't wanted). Normalized the same way as
// PropModel's GLB props: stood upright, scaled to a target height, grounded.
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export type PropPartId = 'chest';

interface PropPartDef {
  base: string;   // folder containing the .obj/.mtl (and its textures/ subfolder)
  file: string;    // OBJ/MTL basename, no extension
  object: string;  // OBJ object name to keep
}

const PARTS: Record<PropPartId, PropPartDef> = {
  chest: { base: '/assets/props/parts/', file: 'oc6095b3', object: '004_OC_6095B3_Chest' },
};

const donorCache = new Map<string, Promise<THREE.Group>>();

function loadObjDonor(base: string, file: string): Promise<THREE.Group> {
  const key = base + file;
  let p = donorCache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.setPath(base);
      mtlLoader.setResourcePath(base);
      mtlLoader.load(
        `${file}.mtl`,
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath(base);
          objLoader.load(`${file}.obj`, resolve, undefined, reject);
        },
        undefined,
        reject,
      );
    });
    donorCache.set(key, p);
  }
  return p;
}

const partCache = new Map<PropPartId, Promise<THREE.Group | null>>();

/** Load one named part, normalized upright with feet/base at y=0, centered on x/z. */
export function loadPropPart(id: PropPartId, targetHeight: number): Promise<THREE.Group | null> {
  let p = partCache.get(id);
  if (!p) {
    const def = PARTS[id];
    p = loadObjDonor(def.base, def.file).then((donor) => {
      let src: THREE.Mesh | null = null;
      donor.traverse((c) => {
        if ((c as THREE.Mesh).isMesh && c.name === def.object) src = c as THREE.Mesh;
      });
      if (!src) return null;
      const mesh = src as THREE.Mesh;
      const geo = mesh.geometry.clone();
      if (!geo.getAttribute('normal')) geo.computeVertexNormals();
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.Material).clone();
        (c as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
        return c;
      });
      const inner = new THREE.Mesh(geo, Array.isArray(mesh.material) ? mats : mats[0]);
      inner.castShadow = true;
      inner.receiveShadow = true;
      inner.rotation.x = Math.PI; // stand upright (extraction convention)

      const holder = new THREE.Group();
      holder.add(inner);
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(holder);
      const size = box.getSize(new THREE.Vector3());
      holder.scale.setScalar(targetHeight / (size.y || 1));
      holder.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(holder);
      const center = box2.getCenter(new THREE.Vector3());
      holder.position.set(-center.x, -box2.min.y, -center.z);

      const wrapper = new THREE.Group();
      wrapper.add(holder);
      return wrapper;
    });
    partCache.set(id, p);
  }
  return p;
}
