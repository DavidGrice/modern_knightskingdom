import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { normalizeTemplateBake } from './templateBake';

/** a stand-in bake the shape GLTFLoader makes of one: a group of `n` meshes, one per primitive (mesh_0_<i>), each with
 *  its own material on a white 2×2 card with one green pixel */
function bake(n: number): THREE.Group {
  const root = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const px = new Uint8Array(16).fill(255);
    px.set([20, 120, 30, 255], 4);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: new THREE.DataTexture(px, 2, 2) }));
    mesh.name = `mesh_0_${i}`;
    root.add(mesh);
  }
  return root;
}
const cutOut = (scene: THREE.Object3D) => {
  const names: string[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && ((o as THREE.Mesh).material as THREE.Material).alphaTest > 0) names.push(o.name); });
  return names;
};

describe('normalizeTemplateBake: card trees', () => {
  it("cuts out the Tourney Grounds' two card-tree materials and nothing else", () => {
    const scene = bake(46);
    const { group } = normalizeTemplateBake(scene, 0.32, 'bboxMin', true, 'template-02');
    expect(cutOut(group)).toEqual(['mesh_0_40', 'mesh_0_41']);
    // the clone shares its materials with the loaded scene, so the cached original is cut too
    expect(cutOut(scene)).toEqual(['mesh_0_40', 'mesh_0_41']);
  });

  it('cuts the rows at every destination that has them, by its own indices', () => {
    expect(cutOut(normalizeTemplateBake(bake(64), 0.32, 'bboxMin', true, 'template-01').group))
      .toEqual(['mesh_0_58', 'mesh_0_59', 'mesh_0_60', 'mesh_0_61', 'mesh_0_62', 'mesh_0_63']);
    expect(cutOut(normalizeTemplateBake(bake(35), 0.32, 'bboxMin', true, 'template-07').group)).toEqual(['mesh_0_31']);
  });

  it('leaves a challenge ground, and the home meadow (no destination), as they are', () => {
    expect(cutOut(normalizeTemplateBake(bake(57), 0.32, 'bboxMin', true, 'challenge-1').group)).toEqual([]);
    expect(cutOut(normalizeTemplateBake(bake(46), 0.32, 'origin').group)).toEqual([]);
  });
});
