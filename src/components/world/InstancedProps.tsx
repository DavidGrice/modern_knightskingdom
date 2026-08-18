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

export interface SubMesh {
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

/** Smallest buffer any instanced prop reserves. Every real group in the game
 *  (a ground's trees, a meadow's herbs) sits well under this, so ordinary play
 *  — including planting and watering a whole cultivated plot — never crosses a
 *  bucket boundary at all. 32 instances is ~2.4KB of matrix+color data. */
const MIN_CAPACITY = 32;

/** Round a required instance count up to a coarse power-of-two bucket. The
 *  point is that the number changes as rarely as possible: see the capacity
 *  comment in InstancedProp for why every change costs a remount. */
function capacityFor(needed: number): number {
  let cap = MIN_CAPACITY;
  while (cap < needed) cap *= 2;
  return cap;
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

/** Renders `nodes` as instances of an already-computed `subMeshes` list —
 *  the shared plumbing behind InstancedProp (GLB-sourced sub-meshes) and any
 *  procedurally-built prop that wants the same instancing treatment (see
 *  ResourceNodes.tsx's rock groups: dodecahedron primitives baked into
 *  SubMesh geometries the same way a GLB's are, then handed here). Callers
 *  only need geometry+material pairs and instance transforms — the
 *  capacity-bucket dance is identical either way. `frustumCulled` is NOT
 *  defaulted (see its own doc below): every caller has a genuinely different
 *  right answer depending on how its `nodes` are spatially shaped. */
export function InstancedSubMeshes({ subMeshes, nodes, frustumCulled }: { subMeshes: SubMesh[]; nodes: InstancedNode[]; frustumCulled: boolean }) {
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
  // in code.
  //
  // The first fix here was a high-water mark (`maxSeen`) fed straight into
  // `limit`. That is only half right, and the missing half became a real,
  // user-visible bug the moment Wave 5 shipped the first code that GROWS the
  // node list at runtime (cultivatePlot/waterPlot in gameStore.ts): drei
  // allocates its instanceMatrix/instanceColor Float32Arrays exactly once,
  // in a `useState` initialiser, from the `limit` it was MOUNTED with. A
  // later `limit` prop only feeds the per-frame `count = Math.min(limit,
  // instances.length)` it writes into the mesh and into the attribute's
  // updateRange — so raising it past the mount-time size asks the GPU upload
  // for more data than the buffer holds. Measured: planting the Orchard took
  // the tree meshes to count 24 with capacity 19, every frame emitting
  // "WebGL: INVALID_VALUE: bufferSubData: srcOffset + length too large", and
  // the plot's nine trees simply never drew until something forced a
  // remount. (Per the Firefox note above, expect that browser to reject the
  // draw outright rather than tolerate it.)
  //
  // So capacity is now quantised into coarse buckets and carried in the
  // <Instances> key: within a bucket the limit is constant, which is all
  // drei's mount-once allocation actually requires; crossing one remounts
  // the mesh so the arrays are re-allocated at the new size. Buckets are
  // deliberately generous (see MIN_CAPACITY) so the remount is the rare
  // escape hatch and not something normal play ever triggers — planting and
  // watering a plot to full moves trees 19 -> 24 and herbs 7 -> 13, both
  // inside the same first bucket, so nothing remounts. Monotonic, so the
  // never-shrink property the Firefox fix depended on still holds.
  const capacityRef = useRef(0);
  if (nodes.length > capacityRef.current) capacityRef.current = capacityFor(nodes.length);
  const capacity = capacityRef.current;
  if (nodes.length === 0) return null;
  return (
    <>
      {subMeshes.map((sm, i) => (
        <Instances
          // `capacity` is part of the key on purpose — see the capacity
          // comment above. Growing it has to remount, because drei sizes its
          // buffers from the mount-time `limit` and never again.
          key={`${i}:${capacity}`}
          geometry={sm.geometry}
          material={sm.material}
          castShadow
          receiveShadow
          limit={capacity}
          // Whether to let three's real per-batch frustum test run. Every
          // node in one <Instances> is ONE InstancedMesh with ONE bounding
          // volume — three.js (this project's version, r176) computes that
          // volume as the real union of every live instance's transformed
          // geometry (THREE.InstancedMesh#computeBoundingSphere, called
          // lazily the first time culling needs it), not just the single
          // sub-mesh's own local-origin bounding sphere, so a correctly
          // positioned instance does not vanish just because the un-instanced
          // geometry's own tiny sphere crossed the frustum edge. That makes
          // real culling safe and worthwhile for a batch that is actually far
          // from the camera sometimes (a quarry's rocks while standing at the
          // homestead, a whole dungeon descent's walls while standing outside
          // it) — false was a Wave 16 regression here for exactly those two
          // batches: dungeon walls and resource rocks used to be one real
          // per-mesh draw each, individually culled, before this wave's
          // instancing pass folded them into this component and copied the
          // opt-out below without re-checking whether it still applied.
          //
          // Only pass false for a batch that's BOTH spatially tiny (so
          // there's no meaningful "off-screen" case to skip) AND known-good
          // against the historical bug this opt-out exists for (see
          // InstancedProp's own callers) — tree/herb patches, not a whole
          // dungeon or a distant quarry.
          frustumCulled={frustumCulled}
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

/** Renders every `node` as an instance of the same normalized GLB prop —
 *  drop-in replacement for mapping many <PropModel url={url} .../> when the
 *  nodes share one url and only their transform (and a per-node scale, e.g.
 *  a tree shrinking as it's chopped) differ. */
export function InstancedProp({
  url, height, nodes, selfLit = false, frustumCulled = true,
}: {
  url: string;
  height: number;
  nodes: InstancedNode[];
  /** O6 · give the instances a low, always-on emissive so they stay visibly
   *  findable at night instead of depending entirely on scene lighting. */
  selfLit?: boolean;
  /** See InstancedSubMeshes' own doc. Defaults to real culling (three's own
   *  default, and the right answer for anything spread further than one
   *  small, always-close-enough-to-matter patch) — a caller opts OUT only
   *  for a batch it has specifically confirmed is small and compact, the
   *  same case the historical opt-out was written for (tree/herb patches). */
  frustumCulled?: boolean;
}) {
  const subMeshes = useInstancedSubMeshes(url, height, selfLit);
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
  return <InstancedSubMeshes subMeshes={subMeshes} nodes={nodes} frustumCulled={frustumCulled} />;
}
