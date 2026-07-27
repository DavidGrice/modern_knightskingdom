'use client';
// J46 · The boundary of each resource ground, on the ground itself.
//
// A ground you cannot work yet has to be VISIBLE, or the deed you are saving
// for is an abstraction. Each one draws a marker ring in its own colour —
// warm where the deed already covers it, cold and faint where it does not —
// and a boundary stone at the near edge carrying its name.
import { useMemo } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { GROUNDS, groundOpen } from '@/game/data/grounds';
import { ROAD_TILE, routeCells } from '@/game/data/road';
import { useGameStore } from '@/game/store/gameStore';
import { deedName } from '@/game/data/grounds';

const OPEN_COLOR = '#e8c141';

// A ground must never lie across the road. Trees growing through the highway
// was the first thing play showed, and both layouts move independently, so
// this is checked rather than remembered.
if (process.env.NODE_ENV !== 'production') {
  const half = ROAD_TILE / 2;
  for (const g of GROUNDS) {
    for (const [cx, cz] of routeCells()) {
      const rx = cx * ROAD_TILE;
      const rz = cz * ROAD_TILE;
      if (Math.abs(g.x - rx) < g.halfX + half && Math.abs(g.z - rz) < g.halfZ + half) {
        // eslint-disable-next-line no-console
        console.warn(`[grounds] ${g.id} lies across the road at tile ${cx},${cz}`);
      }
    }
  }
}
const LOCKED_COLOR = '#7e8ba0';

export default function Grounds() {
  const landTier = useGameStore((s) => s.landTier);
  const destination = useGameStore((s) => s.destination);
  // grounds belong to the homestead map; a template world has its own country
  const rings = useMemo(() => GROUNDS.map((g) => ({ g, open: groundOpen(g, landTier) })), [landTier]);
  if (destination) return null;

  return (
    <group>
      {rings.map(({ g, open }) => (
        <group key={g.id} position={[g.x, 0, g.z]}>
          {/* the boundary: a flat ring laid on the grass, bright once the
              deed covers it */}
          {/* a rectangular boundary, laid on the same grid the homestead
              builds on — four edge strips rather than a ring, so the section
              lines up with build squares instead of cutting across them */}
          {([[0, -g.halfZ, g.halfX * 2, 0.4], [0, g.halfZ, g.halfX * 2, 0.4],
             [-g.halfX, 0, 0.4, g.halfZ * 2], [g.halfX, 0, 0.4, g.halfZ * 2]] as const).map(([ex, ez, sx, sz], i) => (
            <mesh key={i} rotation-x={-Math.PI / 2} position={[ex, 0.03, ez]}>
              <planeGeometry args={[sx, sz]} />
              <meshBasicMaterial
                color={open ? OPEN_COLOR : LOCKED_COLOR}
                transparent
                opacity={open ? 0.4 : 0.22}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          ))}
          {/* a boundary stone on the homestead-facing edge, with the ground's
              name and — while it is beyond your deed — what buys it */}
          <group position={[0, 0, g.z > 0 ? -g.halfZ : g.halfZ]}>
            <mesh position-y={0.6} castShadow>
              <boxGeometry args={[0.55, 1.2, 0.4]} />
              <meshStandardMaterial color={open ? '#9a9287' : '#6f747c'} roughness={0.95} />
            </mesh>
            <Billboard position={[0, 1.85, 0]}>
              <Text fontSize={0.34} color={open ? '#f4e6c0' : '#b9c2d0'} anchorX="center" outlineWidth={0.02} outlineColor="#1a1a1f">
                {g.name}
              </Text>
              {!open && (
                <Text position={[0, -0.38, 0]} fontSize={0.22} color="#8f9aab" anchorX="center" outlineWidth={0.015} outlineColor="#1a1a1f">
                  {`${deedName(g.tier)} deed`}
                </Text>
              )}
            </Billboard>
          </group>
        </group>
      ))}
    </group>
  );
}
