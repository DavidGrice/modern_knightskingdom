'use client';
// CLN-24 · the homestead's raised ground (game/data/terrainRegions.ts), moved out of Terrain.tsx unchanged.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { worldEnv, seasonOf } from '@/game/env';
import { TERRAIN_REGIONS, regionSurfaceY, type TerrainRegion } from '@/game/data/terrainRegions';
import { registerHomeGroundRoot } from '@/game/homeGround';
import { SEASON_GRASS } from './seasonGrass';

// 1.42m cells (4608 triangles per region). Measured, not guessed: the
// triangulated surface never strays more than 2.3cm from the field it was
// built from, and the error is quadratic in the cell size — doubling the
// segments would buy a centimetre nobody can see and double what every
// per-frame probe has to walk. Two regions at this density is 9,216
// triangles total — a 2x increase over the original single-Downs prototype,
// nowhere near the ~34x a whole-map heightfield at the same density would
// cost (see terrainRegions.ts's own header for why that stayed out of scope).
const DOWNS_SEGMENTS = 48;

/**
 * Wave 12 · The North Downs. Wave 31 · generalized to every entry in
 * TERRAIN_REGIONS, West Fell included (game/data/terrainRegions.ts owns the
 * field, the boxes and the reasoning behind both).
 *
 * A displaced plane rather than another bake, and that is the decision the rest
 * of the pass hangs off: because the field is authored, the mesh can be
 * generated from it exactly, and then this geometry is the ONE surface anyone
 * reads. The player's floor, the third-person camera and a raider chasing you
 * up the slope all raycast these triangles through the shared probe
 * (game/templateGround.ts) — the same mechanism every destination bake already uses for actor Y.
 * Nothing consults the authoring function at runtime, so the ground you stand
 * on cannot drift from the ground you can see, which is precisely the failure
 * a parallel "and here is the height, cheaply" query would invite.
 *
 * Each mesh sits DOWNS_SINK below the meadow, so its flat outer margin is
 * buried and the hill's visible foot is the line where it climbs out — see that
 * constant for why a hill cannot simply be laid on top of the bake instead.
 */
function TerrainKnollSurface({ region }: { region: TerrainRegion }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(region.half * 2, region.half * 2, DOWNS_SEGMENTS, DOWNS_SEGMENTS);
    // lay it flat FIRST: a PlaneGeometry is authored in XY, and rotating the
    // geometry (not the mesh) means the displacement below is a plain world-Y
    // write and the raycast hits real world-space triangles with no transform
    // between them and the height they are supposed to represent
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, regionSurfaceY(region, region.x + pos.getX(i), region.z + pos.getZ(i)));
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    // explicitly, not left to Mesh.raycast's lazy path: the bounds are what
    // every ray tests before it touches a triangle, and a sphere computed
    // while the plane was still flat would be a quietly wrong one
    g.computeBoundingSphere();
    return g;
  }, [region]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // the same seasonal lerp the meadow's own materials get, off the same table —
  // a hill that stayed high summer while the field around it went to frost
  // would read as a hole in the season rather than as ground
  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    const target = SEASON_GRASS[seasonOf(worldEnv.dayCount)];
    const k = Math.min(1, dt * 0.15);
    m.color.r += (target[0] - m.color.r) * k;
    m.color.g += (target[1] - m.color.g) * k;
    m.color.b += (target[2] - m.color.b) * k;
  });
  return (
    <mesh position={[region.x, 0, region.z]} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial ref={mat} color="#4d8138" roughness={1} />
    </mesh>
  );
}

/** A weathered cairn on the crown — the same procedural dodecahedron rocks the
 *  brook's spring is dressed with, so it costs no asset and reads as the same
 *  world. Reused verbatim per region (Wave 31): zero new asset cost, and it
 *  gives West Fell the same "something to walk to" the original Downs prototype
 *  already wanted.
 *
 *  It earns its place twice. It gives the walk north somewhere to be walking
 *  TO, which a bare hill in an empty quadrant does not; and each stone sits on
 *  `regionSurfaceY` rather than on y=0, which is the whole thing a raised
 *  region has to be able to do for anything to ever stand on it. Static
 *  scenery placed once may read the authoring field directly — the mesh is
 *  generated from that same field and never differs from it by more than 2.3cm,
 *  which is less than one of these pebbles. Anything that MOVES must go through
 *  the raycast instead; see homeGroundY. */
function Cairn({ region }: { region: TerrainRegion }) {
  const stones: [number, number, number][] = [
    [0, 0, 1.5], [1.3, 0.5, 1.0], [-1.1, -0.7, 1.15], [0.4, -1.4, 0.85], [-0.5, 1.2, 0.7],
  ];
  return (
    <group position={[region.x, 0, region.z]}>
      {stones.map(([lx, lz, s], i) => (
        <mesh
          key={i}
          position={[lx, regionSurfaceY(region, region.x + lx, region.z + lz) + s * 0.34, lz]}
          rotation={[i * 0.7, i * 1.3, i * 0.4]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[s * 0.6, 0]} />
          <meshStandardMaterial color="#8b8b90" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Wave 31 · the wrapper that used to be one hand-typed `HomesteadDowns()` —
 * now a data-driven loop over TERRAIN_REGIONS, so a third region is a
 * one-line append in terrainRegions.ts and zero further code here.
 *
 * Owns the registered group, and it matters WHICH group: `surfaceGroup`
 * holds every region's real walkable mesh and nothing else. Everything a
 * probe hits under this root is treated as the ground you are standing on,
 * so a region's Cairn is rendered as a sibling, deliberately OUTSIDE it —
 * walking into a rock heap would otherwise lift the player silently onto its
 * top with no slope to have climbed. One shared registration (not one per
 * region) because `homeGroundY`/`raycastGroundY` are a single probe over a
 * single root — see game/homeGround.ts on why the homestead's elevated ground
 * lives in that one slot rather than growing a second query.
 */
export function TerrainRegions() {
  const surfaceGroup = useRef<THREE.Group>(null);
  useEffect(() => {
    registerHomeGroundRoot(surfaceGroup.current);
    return () => registerHomeGroundRoot(null);
  }, []);
  return (
    <>
      <group ref={surfaceGroup}>
        {TERRAIN_REGIONS.map((region) => <TerrainKnollSurface key={region.id} region={region} />)}
      </group>
      {TERRAIN_REGIONS.map((region) => <Cairn key={region.id} region={region} />)}
    </>
  );
}
