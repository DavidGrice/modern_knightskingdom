'use client';
// Normalized rendering for the extracted GLB props: the exporter kept the OBJ
// convention (model-up along -Y, arbitrary units), so every prop is flipped
// upright, scaled to a target height and grounded at y=0.
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

/**
 * Assets the rig lab flagged under `material_followups.alpha_mask_tex_as_basecolor`:
 * their texture is an ALPHA SILHOUETTE (spr264 and friends) but the OBJ→GLB
 * conversion wired it to Base Color, so the mesh renders as a black-and-white
 * card instead of a cut-out shape. Verified by sampling the embedded PNGs:
 * l606400's is 100% greyscale / 81% pure white, and the bat swarm's is 100%
 * greyscale / 73% black — textbook cutout masks.
 * The fix the lab prescribes: use the map as ALPHA, and tint from the glit
 * colour the model already carries on its untextured material.
 */
const ALPHA_MASK_ASSETS = new Set(['l606400', 'l606500', 'l3010301']);

function fixAlphaMasks(root: THREE.Object3D) {
  // the tint is whatever real glit colour this model uses on a material that
  // ISN'T the mask — for the plant that's its green, for the bat swarm its
  // near-black. Falls back to leaving the colour alone if there's no such hint.
  let tint: THREE.Color | null = null;
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!m || Array.isArray(m) || m.map || !m.color) return;
    const { r, g, b } = m.color;
    if (r > 0.95 && g > 0.95 && b > 0.95) return; // white carries no hint
    if (!tint) tint = m.color.clone();
  });
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mm of list) {
      const m = mm as THREE.MeshStandardMaterial;
      if (!m.map) continue;
      m.alphaMap = m.map;
      m.map = null;
      m.transparent = true;
      m.alphaTest = 0.5;
      m.depthWrite = true;
      if (tint) m.color.copy(tint);
      m.needsUpdate = true;
    }
  });
}

// O5 · this used to be nothing but a per-instance `useMemo`, which only
// memoizes across RE-RENDERS of the SAME component instance — it does not
// share across different mount sites. So placing a second copy of a wall
// already standing elsewhere redid the full clone + two bbox passes +
// shadow/normal traversal + alpha-mask check from scratch, synchronously,
// on every single placement forever, not just the first. That is the
// "significant pause when building" — preloadCommonAssets() already warms
// the raw GLTF fetch+parse, but nothing warmed THIS.
//
// Two existing call sites (ConstructionSite.tsx, Wildlife.tsx) already carry
// comments asserting this function "shares" / "hands out a cached model" —
// that was the intent, not what the code actually did. A module-level cache,
// keyed the same way React's own memo key already was, makes it true: the
// first placement of a given (url, height) pair pays the normalization cost
// once, and every other instance — a different building, a different
// component, a save reload with 40 of the same piece — gets a cache hit.
const normalizedPropCache = new Map<string, THREE.Group>();

export function useNormalizedProp(url: string, targetHeight: number): THREE.Group {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const cacheKey = `${url}::${targetHeight}`;
    const cached = normalizedPropCache.get(cacheKey);
    if (cached) return cached;
    const inner = scene.clone(true);
    inner.rotation.x = Math.PI; // stand upright (see resources README)
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
    wrapper.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // source models have open facets; render both sides so they don't look hollow
        if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) (m as THREE.Material).side = THREE.DoubleSide;
      }
    });
    // lab-flagged alpha-silhouette textures wired to Base Color by the OBJ→GLB
    // conversion — re-route them to alpha so the shape cuts out instead of
    // rendering as a black-and-white card
    const assetId = url.split('/').pop()?.replace(/\.glb$/i, '') ?? '';
    if (ALPHA_MASK_ASSETS.has(assetId)) fixAlphaMasks(wrapper);
    normalizedPropCache.set(cacheKey, wrapper);
    return wrapper;
  }, [scene, targetHeight, url]);
}

export default function PropModel({
  url, height, position = [0, 0, 0], yaw = 0, scale = 1,
}: {
  url: string;
  height: number;
  position?: [number, number, number];
  yaw?: number;
  scale?: number;
}) {
  const model = useNormalizedProp(url, height);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation-y={yaw} scale={scale} />;
}
