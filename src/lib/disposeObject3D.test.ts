import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { disposeObject3D } from './disposeObject3D';

/** how many times `target` has been disposed (three announces it with a 'dispose' event) */
function disposals(target: { addEventListener(type: 'dispose', listener: () => void): void }): () => number {
  let n = 0;
  target.addEventListener('dispose', () => { n++; });
  return () => n;
}

describe('disposeObject3D', () => {
  it('releases the geometry, material and every texture of a mesh nested in groups', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const map = new THREE.Texture();
    const normalMap = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map, normalMap });
    const root = new THREE.Group().add(new THREE.Group().add(new THREE.Mesh(geometry, material)));
    const counts = [geometry, material, map, normalMap].map(disposals);
    disposeObject3D(root);
    expect(counts.map((c) => c())).toEqual([1, 1, 1, 1]);
  });

  it('handles a mesh with an array of materials', () => {
    const maps = [new THREE.Texture(), new THREE.Texture()];
    const materials = maps.map((map) => new THREE.MeshBasicMaterial({ map }));
    const root = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
    const counts = [...materials, ...maps].map(disposals);
    disposeObject3D(root);
    expect(counts.map((c) => c())).toEqual([1, 1, 1, 1]);
  });

  it('covers a clone too, because Object3D.clone() shares resources by reference', () => {
    const original = new THREE.Group().add(
      new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ map: new THREE.Texture() })),
    );
    const clone = original.clone(true);
    const mesh = clone.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    const counts = [mesh.geometry, mesh.material, mesh.material.map!].map(disposals);
    disposeObject3D(original);
    expect(counts.map((c) => c())).toEqual([1, 1, 1]);
  });

  it('skips objects with nothing to release and still reaches lines and points', () => {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    const pointsMaterial = new THREE.PointsMaterial();
    const root = new THREE.Group().add(
      new THREE.PointLight(),
      new THREE.Object3D(),
      new THREE.Line(lineGeometry, new THREE.LineBasicMaterial()),
      new THREE.Points(new THREE.BufferGeometry(), pointsMaterial),
    );
    const counts = [lineGeometry, pointsMaterial].map(disposals);
    expect(() => disposeObject3D(root)).not.toThrow();
    expect(counts.map((c) => c())).toEqual([1, 1]);
  });

  it('leaves the objects usable: only the GPU side is freed', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: '#336699' });
    const vertices = geometry.attributes.position.count;
    disposeObject3D(new THREE.Mesh(geometry, material));
    expect(geometry.attributes.position.count).toBe(vertices);
    expect(material.color.getHexString()).toBe('336699');
  });
});
