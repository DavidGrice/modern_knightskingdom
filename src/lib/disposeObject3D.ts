// CLN-24 · release every GPU resource under an object graph.
//
// Dropping the last reference to a mesh does not free what three.js uploaded for it. The renderer keeps an undisposed
// geometry's attributes reachable through its vertex-array cache (WebGLBindingStates, keyed by geometry id), so its
// vertex buffers are pinned for good — measured at about 1.7 MB per visit for one destination bake. Textures fare
// better only by luck: an un-referenced one is freed when the garbage collector gets to it, unless its material was
// alpha-tested and drawn into a shadow map, in which case the shadow pass's own cached depth material still holds it
// (WebGLShadowMap's material cache) until that material is disposed.
//
// react-three-fiber disposes what it created from JSX. Anything handed to it ready-made — a `<primitive>`, a
// `geometry={...}`/`material={...}`/`map={...}` prop — is the caller's to release, and this is the helper for a whole
// loaded scene.
import * as THREE from 'three';

/** Every texture a material references, found by duck-typing its own properties rather than a hand-kept list of slot
 *  names (map, normalMap, emissiveMap, ... differ per material type and grow with three releases). */
function texturesOf(material: THREE.Material): THREE.Texture[] {
  const out: THREE.Texture[] = [];
  for (const value of Object.values(material)) {
    if (value && (value as THREE.Texture).isTexture) out.push(value as THREE.Texture);
  }
  return out;
}

/**
 * Dispose the geometry, materials and textures of everything under `root`.
 *
 * Only for a graph nothing else shares: disposing a texture or geometry another live object still draws with makes
 * three re-upload it on that object's next frame — wasted work, not a crash, but not what a release is for. A cached
 * GLTF scene qualifies once its cache entry is dropped; a clone made with `Object3D.clone()` shares all three kinds of
 * resource with its source by reference, so disposing through either covers both.
 *
 * dispose() only frees the GPU side — the objects stay usable and are uploaded again if drawn — so calling this more
 * than once, or on a graph that turns out to be reused, is safe.
 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (!mesh.material) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const texture of texturesOf(material)) texture.dispose();
      material.dispose();
    }
  });
}
