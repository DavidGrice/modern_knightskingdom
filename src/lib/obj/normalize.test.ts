import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { normalizeUpright } from './normalize';

// what PropModel, InstancedProps, propParts and propRig each wrote out before CLN-29, line for line
function writtenOut(inner: THREE.Object3D, targetHeight: number): THREE.Group {
  inner.rotation.x = Math.PI;
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
  return holder;
}

function rnd(seed: number) {
  return () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
}
/** a model as an extraction hands one over: a few meshes of odd sizes, offset and turned inside a group */
function model(r: () => number): THREE.Group {
  const g = new THREE.Group();
  const n = 1 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1 + r() * 40, 0.1 + r() * 30, 0.1 + r() * 20));
    m.position.set(r() * 50 - 25, r() * 50 - 25, r() * 50 - 25);
    m.rotation.set(r() * 6, r() * 6, r() * 6);
    g.add(m);
  }
  g.position.set(r() * 10, r() * 10, r() * 10);
  return g;
}

describe('normalizeUpright', () => {
  it('lands every model where the four call sites put it, to the last bit', () => {
    const r = rnd(7);
    for (let k = 0; k < 400; k++) {
      const seedModel = model(r);
      const height = [0.5, 1.6, 3, 7.25, 18][k % 5];
      const a = seedModel.clone(true), b = seedModel.clone(true);
      const ha = writtenOut(a, height), hb = normalizeUpright(b, height);
      ha.updateMatrixWorld(true); hb.updateMatrixWorld(true);
      expect(hb.matrix.elements).toEqual(ha.matrix.elements);
      expect(b.matrixWorld.elements).toEqual(a.matrixWorld.elements);
      expect(b.rotation.x).toBe(Math.PI);
    }
  });

  it('keeps the degenerate case: a model with no height is scaled by 1, as before', () => {
    const flat = new THREE.Mesh(new THREE.PlaneGeometry(4, 2));
    flat.rotation.x = -Math.PI / 2; // lies flat: no height once upright
    const ha = writtenOut(flat.clone(), 2), hb = normalizeUpright(flat.clone(), 2);
    expect(hb.scale.x).toBe(ha.scale.x);
    expect(hb.position.toArray()).toEqual(ha.position.toArray());
  });
});
