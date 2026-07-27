'use client';
// J47/J48 · What a building site looks like while it is being built.
//
// It used to be a translucent gold BOX with a solid grey BOX rising inside
// it: the same two cuboids whatever you were putting up, so a watchtower and
// a flower bed staked out identically and you could not tell what you had
// committed to until the last swing landed.
//
// Now the site shows the piece ITSELF, twice over:
//   · a wireframe of the real model — the full silhouette and facing of the
//     thing you are about to own, drawn faint so it reads as a plan;
//   · the real solid model underneath it, CLIPPED at a plane that rises with
//     the work, so the stone comes up out of the ground course by course
//     rather than a grey block inflating.
//
// The clip is a world-space plane the material honours (`localClippingEnabled`
// is switched on by the scene), which means the model is never scaled or
// distorted — at 40% built you are looking at the bottom 40% of the finished
// piece, exactly as it will stand.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useNormalizedProp } from './PropModel';

/** how far under the top of the finished piece the plan's wireframe reads */
const GHOST_COLOR = '#e8c141';

/**
 * The real model, cut off at `topY` (world space) so it appears to rise.
 * Materials are cloned per site — `useNormalizedProp` shares them between
 * every instance of a model, and a clip plane set on a shared material would
 * slice every finished building of the same type as well.
 */
function RisingModel({
  url, height, topY, wire,
}: { url: string; height: number; topY: number; wire: boolean }) {
  const model = useNormalizedProp(url, height);
  const gl = useThree((s) => s.gl);
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));

  // world-space clipping has to be enabled once on the renderer; harmless to
  // re-assert, and doing it here keeps the requirement next to its only user
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  const instance = useMemo(() => {
    const g = model.clone(true);
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const src = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const mats = src.map((m) => {
        const c = (m as THREE.Material).clone();
        if (wire) {
          const w = c as THREE.MeshStandardMaterial;
          w.wireframe = true;
          w.transparent = true;
          w.opacity = 0.34;
          w.depthWrite = false;
          w.color = new THREE.Color(GHOST_COLOR);
          w.emissive = new THREE.Color(GHOST_COLOR);
          w.emissiveIntensity = 0.5;
          w.map = null;
        } else {
          c.clippingPlanes = [plane.current];
          c.clipShadows = true;
        }
        return c;
      });
      mesh.material = mats.length === 1 ? mats[0] : mats;
      mesh.castShadow = !wire;
      mesh.receiveShadow = !wire;
    });
    return g;
  }, [model, wire]);

  // the plane keeps everything BELOW topY: with normal (0,-1,0) a point is
  // kept where -y + constant >= 0, i.e. y <= constant
  plane.current.constant = topY;

  return <primitive object={instance} />;
}

export default function ConstructionSiteModel({
  url, size, progress, worldY,
}: {
  url: string;
  size: [number, number, number];
  /** 0..1 */
  progress: number;
  /** the site's own base height in world space, which the clip plane is measured from */
  worldY: number;
}) {
  const [w, h, d] = size;
  const stakes: [number, number][] = [
    [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2],
  ];
  return (
    <group>
      {/* the plan: the real shape, in outline */}
      <RisingModel url={url} height={h} topY={0} wire />
      {/* the work: the real piece, rising out of the ground */}
      {progress > 0.005 && (
        <RisingModel url={url} height={h} topY={worldY + h * progress} wire={false} />
      )}
      {/* surveyor's stakes, so an unstarted site still reads as claimed ground */}
      {stakes.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.3, pz]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 0.6, 5]} />
          <meshStandardMaterial color="#8a6234" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
