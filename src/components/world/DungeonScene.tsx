'use client';
// Renders the currently-generated dungeon layout (Phase 17, see game/dungeon.ts):
// stone walls (the same real stonewall model the build menu uses, just placed
// directly rather than through the player's build economy — this is
// environment generation, not a player-owned structure) plus a floor tile
// and a torch or two per room. Enemies aren't rendered here at all — they're
// just ordinary entries in useEnemyStore, already rendered by Enemies.tsx
// regardless of where in the world they are, exactly like every other
// location-agnostic list (buildings, blueprints) this project already relies on.
import { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { dungeonState } from '@/game/dungeon';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import PropModel from './PropModel';
import { Torch } from './Buildings';

const STONEWALL = BUILDABLE_BY_ID.stonewall;

function FloorTile({ x, z, w, d, color }: { x: number; z: number; w: number; d: number; color: string }) {
  return (
    <mesh position={[x, 0, z]} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

export default function DungeonScene() {
  const layout = useMemo(() => dungeonState.layout, []);
  if (!layout) return null;
  const ox = layout.origin.x;
  const oz = layout.origin.z;

  return (
    <group>
      {/* dim, torch-lit mood — deliberately not the bright outdoor fill
          light every real template-world bake needs */}
      <ambientLight intensity={0.35} color="#4a5568" />
      <hemisphereLight args={['#38424f', '#0a0a0a', 0.4]} />

      {layout.rooms.map((room) => {
        const color = room.isBoss ? '#5a2e2e' : room.isEntry ? '#6b5a3a' : '#3f3f45';
        return (
          <group key={room.index}>
            <FloorTile x={room.cx - ox} z={room.cz - oz} w={room.halfX * 2} d={room.halfZ * 2} color={color} />
            <Suspense fallback={null}>
              <group position={[room.cx - ox - room.halfX + 1.4, 0, room.cz - oz - room.halfZ + 1.4]}>
                <Torch />
              </group>
              <group position={[room.cx - ox + room.halfX - 1.4, 0, room.cz - oz + room.halfZ - 1.4]}>
                <Torch />
              </group>
            </Suspense>
          </group>
        );
      })}

      {/* corridor floor strips — explicit connection data (Phase 2's
          iteration 2.6 nav-grid work is what caught the branching topology
          needing this: array adjacency stopped meaning "connected" the
          moment rooms could have more than one child) rather than inferred
          from array position */}
      {layout.corridors.map((c, i) => (
        <FloorTile
          key={`c${i}`}
          x={(c.x0 + c.x1) / 2 - ox}
          z={(c.z0 + c.z1) / 2 - oz}
          w={c.x1 - c.x0}
          d={c.z1 - c.z0}
          color="#3f3f45"
        />
      ))}

      <Suspense fallback={null}>
        {layout.walls.map((w, i) => (
          <PropModel
            key={i}
            url={STONEWALL.model!}
            height={STONEWALL.size[1]}
            position={[w.x - ox, 0, w.z - oz]}
            yaw={w.rot === 1 ? Math.PI / 2 : 0}
          />
        ))}
      </Suspense>
    </group>
  );
}
