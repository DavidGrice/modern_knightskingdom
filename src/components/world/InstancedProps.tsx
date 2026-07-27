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
import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF, Instances, Instance } from '@react-three/drei';

interface SubMesh {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

function useInstancedSubMeshes(url: string, targetHeight: number): SubMesh[] {
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
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      material.side = THREE.DoubleSide;
      subMeshes.push({ geometry, material });
    });
    return subMeshes;
  }, [scene, targetHeight]);
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
  url, height, nodes,
}: {
  url: string;
  height: number;
  nodes: InstancedNode[];
}) {
  const subMeshes = useInstancedSubMeshes(url, height);
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
          limit={nodes.length}
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
