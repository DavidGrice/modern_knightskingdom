'use client';
// Instanced rendering for repeated GLB props (forest trees, herb patches):
// PropModel.tsx's per-node useGLTF+clone(true)+traverse path is fine for a
// one-off prop, but a few dozen trees each paying that cost (plus a separate
// draw call per sub-mesh) adds up. Here the same normalize-upright-and-ground
// step runs once per (url, targetHeight) pair, each sub-mesh's local
// transform is baked into its own geometry, and every node becomes one cheap
// drei <Instance> sharing that geometry/material — same visual result as
// PropModel, one real InstancedMesh draw call per sub-mesh instead of one
// draw call per node.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Instances, Instance } from '@react-three/drei';
import { worldEnv } from '@/game/env';

/** O6's self-illumination baseline — see its own comment below for why it
 *  exists at all. */
const SELF_LIT_INTENSITY = 0.18;

interface SubMesh {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

function useInstancedSubMeshes(url: string, targetHeight: number, selfLit: boolean): SubMesh[] {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const inner = scene.clone(true);
    inner.rotation.x = Math.PI; // stand upright (see PropModel.tsx)
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
    holder.updateMatrixWorld(true);

    const subMeshes: SubMesh[] = [];
    holder.traverse((c) => {
      if (!(c as THREE.Mesh).isMesh) return;
      const mesh = c as THREE.Mesh;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      // Clone rather than mutate the shared GLTF-cached material: useGLTF's
      // cache is keyed by url, so the original object can be reused anywhere
      // else this same GLB is loaded (e.g. a decorative PropModel elsewhere).
      // `.clone()` on a mesh does not deep-clone its material, so writing
      // `.side`/`.emissive` on the original silently leaked into every other
      // consumer of the same asset.
      const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const material = source.clone() as THREE.MeshStandardMaterial;
      material.side = THREE.DoubleSide;
      // O6 · small ground-level props (herb patches) read as "gone" at night
      // — ambient drops from 0.75 to 0.28 (env.ts) and there is nothing about
      // a 0.35m prop that reads clearly at that light level. A resource that
      // exists on the map must stay visibly findable regardless of the
      // clock, so it self-illuminates a little rather than depending purely
      // on scene lighting — subtle in daylight (its own baked color, at 18%),
      // the difference that actually matters at night.
      if (selfLit && material.emissive) {
        material.emissive.copy(material.color);
        material.emissiveIntensity = SELF_LIT_INTENSITY;
      }
      subMeshes.push({ geometry, material });
    });
    return subMeshes;
  }, [scene, targetHeight, selfLit]);
}

export interface InstancedNode {
  key: string;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  /** multiplied against the sub-mesh's own baked material color — used for
   *  the seasonal tree tint (see ResourceNodes.tsx's TreeGroup); omit for no
   *  tint (white multiply, i.e. the model's original baked color) */
  color?: string;
}

/** Renders every `node` as an instance of the same normalized GLB prop —
 *  drop-in replacement for mapping many <PropModel url={url} .../> when the
 *  nodes share one url and only their transform (and a per-node scale, e.g.
 *  a tree shrinking as it's chopped) differ. */
export function InstancedProp({
  url, height, nodes, selfLit = false,
}: {
  url: string;
  height: number;
  nodes: InstancedNode[];
  /** O6 · give the instances a low, always-on emissive so they stay visibly
   *  findable at night instead of depending entirely on scene lighting. */
  selfLit?: boolean;
}) {
  const subMeshes = useInstancedSubMeshes(url, height, selfLit);
  // `limit` sizes drei's underlying InstancedBufferAttribute — it is NOT
  // meant to track the live count. Passing nodes.length directly means the
  // buffer shrinks every time a node harvests/depletes (fewer live nodes)
  // and has to grow back on respawn; reported 2026-07-28 (real Firefox
  // console output): "drawArraysInstanced: Instance fetch requires 2, but
  // attribs only supply 1" — a genuine buffer/attribute size mismatch after
  // a shrink-then-regrow. Chrome's WebGL validation is permissive enough to
  // silently tolerate this (nothing draws wrong there); Firefox's is
  // stricter and the draw call is rejected outright, so the prop just never
  // renders — reproducible on herbs specifically because they're the one
  // node kind actually cycling through harvest+respawn during normal play
  // in the areas this was checked, not because anything about them differs
  // in code. Fixed at the source instead of guessing per-consumer: track
  // the highest count this instance has ever needed and never shrink the
  // limit back down, so a full grove/meadow's worth of capacity, once
  // reserved, stays reserved.
  const maxSeen = useRef(0);
  maxSeen.current = Math.max(maxSeen.current, nodes.length);
  // Reported 2026-07-30: self-lit props (herb patches) stayed at full
  // brightness through dark, rainy weather — the fixed intensity above was
  // tuned to be subtle against FULL daylight ambient, but never dims back
  // down when rain knocks that ambient down too (DayNight.tsx's own
  // `rainDim` only ever touches light sources, never this emissive term).
  // Scaled by the same rainDim formula here so it fades with the weather
  // instead of sitting on top of it — night alone is untouched, since
  // staying findable after dark is the one thing this was built for.
  useFrame(() => {
    if (!selfLit) return;
    const rainDim = 1 - worldEnv.rain * 0.45;
    for (const sm of subMeshes) {
      const mat = sm.material as THREE.MeshStandardMaterial;
      if (mat.emissive) mat.emissiveIntensity = SELF_LIT_INTENSITY * rainDim;
    }
  });
  if (nodes.length === 0) return null;
  return (
    <>
      {subMeshes.map((sm, i) => (
        <Instances
          key={i}
          geometry={sm.geometry}
          material={sm.material}
          castShadow
          receiveShadow
          limit={maxSeen.current}
        >
          {nodes.map((n) => (
            <Instance
              key={n.key}
              position={[n.x, 0, n.z]}
              rotation={[0, n.yaw, 0]}
              scale={n.scale}
              color={n.color ?? '#ffffff'}
            />
          ))}
        </Instances>
      ))}
    </>
  );
}
